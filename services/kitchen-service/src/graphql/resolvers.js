const db = require("../db/knex");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { publishMessage } = require("../messaging/producer");

const resolvers = {
  Query: {
    cooks: async () => {
      return await db("cooks").select(
        "id",
        "name",
        "email",
        "restaurant_id",
        "role",
        "active",
      );
    },

    kitchenOrders: async () => {
      return await db("kitchen_orders")
        .select("*")
        .orderBy("created_at", "desc");
    },

    kitchenOrder: async (_, { id }) => {
      return await db("kitchen_orders").where({ id }).first();
    },
  },

  Mutation: {
    registerCook: async (_, { name, email, password, restaurant_id, role }) => {
      const existingCook = await db("cooks").where({ email }).first();

      if (existingCook) {
        throw new Error("Ya existe un cocinero con ese correo");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newCook = await db("cooks")
        .insert({
          name,
          email,
          password: hashedPassword,
          restaurant_id,
          role: role || "cook",
          active: true,
        })
        .returning(["id", "name", "email", "restaurant_id", "role", "active"]);

      return newCook[0];
    },

    loginCook: async (_, { email, password }) => {
      const cook = await db("cooks").where({ email }).first();

      if (!cook) {
        throw new Error("Correo o contraseña incorrectos");
      }

      const isValidPassword = await bcrypt.compare(password, cook.password);

      if (!isValidPassword) {
        throw new Error("Correo o contraseña incorrectos");
      }

      const token = jwt.sign(
        {
          id: cook.id,
          email: cook.email,
          role: cook.role,
        },
        process.env.JWT_SECRET || "restohub_kitchen_secret_2024",
        { expiresIn: "1d" },
      );

      return {
        token,
        cook: {
          id: cook.id,
          name: cook.name,
          email: cook.email,
          restaurant_id: cook.restaurant_id,
          role: cook.role,
          active: cook.active,
        },
      };
    },

    assignCook: async (_, { order_id, cook_id }) => {
      const cook = await db("cooks").where({ id: cook_id }).first();
      if (!cook) throw new Error("Cocinero no encontrado");

      const kitchenOrder = await db("kitchen_orders")
        .where({ order_id })
        .first();
      if (!kitchenOrder) throw new Error("Orden de cocina no encontrada");

      const updated = await db("kitchen_orders")
        .where({ order_id })
        .update({
          assigned_cook_id: cook_id,
          updated_at: new Date(),
        })
        .returning("*");

      return updated[0];
    },

    updateKitchenOrderStatus: async (_, { id, status }) => {
      const kitchenOrder = await db("kitchen_orders").where({ id }).first();
      if (!kitchenOrder) throw new Error("Orden de cocina no encontrada");

      const validTransitions = {
        pending: ["in_preparation", "cancelled"],
        in_preparation: ["packing", "ready"],
        packing: ["ready"],
        ready: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      const allowed = validTransitions[kitchenOrder.status] || [];
      if (!allowed.includes(status)) {
        throw new Error(
          `No se puede cambiar de estado "${kitchenOrder.status}" a "${status}"`,
        );
      }

      const updateData = {
        status,
        updated_at: new Date(),
      };

      if (status === "in_preparation") {
        updateData.preparation_started_at = new Date();
      }

      if (status === "ready") {
        updateData.ready_at = new Date();
      }

      if (status === "delivered") {
        updateData.delivered_at = new Date();
      }

      const updated = await db("kitchen_orders")
        .where({ id })
        .update(updateData)
        .returning("*");

      const updatedOrder = updated[0];

      try {
        const statusMap = {
          pending: "validated",
          in_preparation: "in_preparation",
          packing: "packing",
          ready: "ready",
          delivered: "delivered",
          cancelled: "cancelled",
        };

        const orderStatus = statusMap[status];

        if (orderStatus) {
          const payload = {
            order_id: kitchenOrder.order_id,
            status: orderStatus,
            updated_at: new Date(),
          };

          // Cola para orders-service
          await publishMessage("kitchen_status_updated", payload);
          // Cola exclusiva para pos-service
          await publishMessage("kitchen_status_updated_pos", payload);

          console.log(`✅ Evento enviado a ambos servicios: ${orderStatus}`);
        }
      } catch (error) {
        console.error("❌ Error notificando a RabbitMQ:", error.message);
      }

      return updatedOrder;
    },
  },

  KitchenOrder: {
    created_at: (p) =>
      p.created_at ? new Date(p.created_at).toISOString() : null,
    updated_at: (p) =>
      p.updated_at ? new Date(p.updated_at).toISOString() : null,
    items: async (parent) => {
      return await db("kitchen_order_items").where({
        kitchen_order_id: parent.id,
      });
    },
  },

  Cook: {
    created_at: (p) =>
      p.created_at ? new Date(p.created_at).toISOString() : null,
    updated_at: (p) =>
      p.updated_at ? new Date(p.updated_at).toISOString() : null,
  },
};

module.exports = resolvers;
