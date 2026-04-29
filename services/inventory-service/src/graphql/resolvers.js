import database from "../database/knex.js";

const resolvers = {
  Query: {
    supplyOrders: async (_, { status, location_id }) => {
      const query = database("supply_orders");
      if (status) query.where({ status });
      if (location_id) query.where({ location_id: parseInt(location_id) });
      return await query;
    },

    supplyOrder: async (_, { id }) => {
      return await database("supply_orders").where({ id }).first();
    },

    stocks: async (_, { location_id }) => {
      const query = database("stocks");
      if (location_id) query.where({ location_id: parseInt(location_id) });
      return await query;
    },

    lowStockConfigs: async (_, { location_id }) => {
      const query = database("low_stock_configs");
      if (location_id) query.where({ location_id: parseInt(location_id) });
      return await query;
    },

    batches: async (_, { location_id, status }) => {
      const query = database("batches");
      if (location_id) query.where({ location_id: parseInt(location_id) });
      if (status) query.where({ status });
      return await query;
    },

    batch: async (_, { id }) => {
      return await database("batches")
        .where({ id: parseInt(id) })
        .first();
    },

    expiringBatches: async (_, { days, location_id }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);

      const query = database("batches")
        .where("status", "ACTIVO")
        .where("expiration_date", "<=", cutoff.toISOString());

      if (location_id) query.where({ location_id: parseInt(location_id) });

      return await query;
    },

    inventoryLogs: async (_, { ingredient_id, location_id, type }) => {
      const query = database("inventory_logs");
      if (ingredient_id)
        query.where({ ingredient_id: parseInt(ingredient_id) });
      if (location_id) query.where({ location_id: parseInt(location_id) });
      if (type) query.where({ type });
      return await query;
    },

    // ... (puedes mantener el resto de tus queries como batches o expiringBatches)
  },

  Mutation: {
    createSupplyOrder: async (_, { input }) => {
      const [order] = await database("supply_orders")
        .insert({
          ...input,
          status: "PENDIENTE",
          total_cost: Number(input.total_cost || 0),
        })
        .returning("*");
      return order;
    },

    // --- CORRECCIÓN DE LA MUTACIÓN RECIBIR PEDIDO ---
    receiveSupplyOrder: async (_, { id, received_date }) => {
      const orderId = parseInt(id);

      const order = await database("supply_orders")
        .where({ id: orderId })
        .first();
      if (!order) throw new Error("Orden no encontrada");
      if (order.status === "RECIBIDO")
        throw new Error("La orden ya fue recibida");

      const items = await database("supply_order_items").where({
        supply_order_id: orderId,
      });

      for (const item of items) {
        // Buscamos si ya existe stock para este ingrediente en esta ubicación
        const existing = await database("stocks")
          .where({
            ingredient_id: item.ingredient_id,
            location_id: order.location_id,
          })
          .first();

        // 🛑 CORRECCIÓN CLAVE: Forzamos que sean números para evitar "2.0002.000"
        const currentQty = existing ? Number(existing.total_quantity) : 0;
        const incomingQty = Number(item.quantity); // O item.received_quantity si lo usas
        const newTotal = currentQty + incomingQty;

        if (existing) {
          await database("stocks").where({ id: existing.id }).update({
            total_quantity: newTotal,
            updated_at: new Date(),
          });
        } else {
          await database("stocks").insert({
            ingredient_id: item.ingredient_id,
            location_id: order.location_id,
            total_quantity: newTotal,
            unit: item.unit,
          });
        }

        // Registrar movimiento en el log
        await database("inventory_logs").insert({
          ingredient_id: item.ingredient_id,
          location_id: order.location_id,
          type: "ENTRADA",
          quantity: incomingQty,
          unit: item.unit,
          reason: `Recepción de pedido #${orderId}`,
          reference_id: orderId,
          created_at: new Date(),
        });
      }

      // Actualizamos el estado de la orden
      const [updatedOrder] = await database("supply_orders")
        .where({ id: orderId })
        .update({
          status: "RECIBIDO",
          received_date: received_date || new Date().toISOString(),
          updated_at: new Date(),
        })
        .returning("*");

      return updatedOrder;
    },

    cancelSupplyOrder: async (_, { id }) => {
      const orderId = parseInt(id);

      const order = await database("supply_orders")
        .where({ id: orderId })
        .first();
      if (!order) throw new Error("Orden no encontrada");
      if (order.status === "RECIBIDO")
        throw new Error("No se puede cancelar una orden que ya fue recibida");

      const [updatedOrder] = await database("supply_orders")
        .where({ id: orderId })
        .update({
          status: "CANCELADO",
          updated_at: new Date(),
        })
        .returning("*");

      return updatedOrder;
    },
    updateSupplyOrder: async (_, { id, input }) => {
      const orderId = parseInt(id);

      const order = await database("supply_orders")
        .where({ id: orderId })
        .first();
      if (!order) throw new Error("Orden no encontrada");
      if (order.status === "RECIBIDO")
        throw new Error("No se puede actualizar una orden que ya fue recibida");

      const [updatedOrder] = await database("supply_orders")
        .where({ id: orderId })
        .update({
          ...input,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedOrder;
    },

    // --- CORRECCIÓN EN AJUSTE DE STOCK ---
    adjustStock: async (_, { input }) => {
      const {
        ingredient_id,
        location_id,
        quantity,
        type,
        reason,
        reference_id,
        unit,
      } = input;

      const existing = await database("stocks")
        .where({ ingredient_id, location_id })
        .first();

      // 🛑 CORRECCIÓN CLAVE: Aseguramos operación matemática
      const currentQty = existing ? Number(existing.total_quantity) : 0;
      const adjustQty = Number(quantity);

      let newQty;
      if (type === "ENTRADA" || type === "AJUSTE") {
        newQty = currentQty + adjustQty;
      } else {
        newQty = currentQty - adjustQty;
      }

      let stock;
      if (existing) {
        [stock] = await database("stocks")
          .where({ id: existing.id })
          .update({
            total_quantity: newQty,
            updated_at: new Date(),
          })
          .returning("*");
      } else {
        [stock] = await database("stocks")
          .insert({
            ingredient_id,
            location_id,
            total_quantity: newQty,
            unit,
          })
          .returning("*");
      }

      await database("inventory_logs").insert({
        ingredient_id,
        location_id,
        type,
        quantity: adjustQty,
        unit,
        reason: reason ?? null,
        reference_id: reference_id ?? null,
        created_at: new Date(),
      });

      return stock;
    },

    addSupplyOrderItem: async (_, { input }) => {
      const [item] = await database("supply_order_items")
        .insert(input)
        .returning("*");
      return item;
    },

    updateSupplyOrderItem: async (_, { id, input }) => {
      const [item] = await database("supply_order_items")
        .where({ id: parseInt(id) })
        .update({ ...input })
        .returning("*");
      if (!item) throw new Error("Item no encontrado");
      return item;
    },

    createBatch: async (_, { input }) => {
      const [batch] = await database("batches")
        .insert({
          ...input,
          current_quantity: input.initial_quantity,
          entry_date: new Date().toISOString(),
          status: "ACTIVO",
        })
        .returning("*");
      return batch;
    },

    updateBatch: async (_, { id, current_quantity }) => {
      const status = current_quantity <= 0 ? "AGOTADO" : "ACTIVO";
      const [batch] = await database("batches")
        .where({ id: parseInt(id) })
        .update({ current_quantity, status, updated_at: new Date() })
        .returning("*");
      if (!batch) throw new Error("Lote no encontrado");
      return batch;
    },

    upsertStock: async (_, { input }) => {
      const { ingredient_id, location_id, total_quantity, unit } = input;
      const existing = await database("stocks")
        .where({ ingredient_id, location_id })
        .first();

      if (existing) {
        const [stock] = await database("stocks")
          .where({ id: existing.id })
          .update({ total_quantity, updated_at: new Date() })
          .returning("*");
        return stock;
      } else {
        const [stock] = await database("stocks")
          .insert({ ingredient_id, location_id, total_quantity, unit })
          .returning("*");
        return stock;
      }
    },

    createLowStockConfig: async (_, { input }) => {
      const [config] = await database("low_stock_configs")
        .insert({ ...input, is_active: true })
        .returning("*");
      return config;
    },
    updateLowStockConfig: async (_, { id, input }) => {
      const [config] = await database("low_stock_configs")
        .where({ id: parseInt(id) })
        .update({ ...input, updated_at: new Date() })
        .returning("*");
      if (!config) throw new Error("Configuración no encontrada");
      return config;
    },

    deleteLowStockConfig: async (_, { id }) => {
      const [config] = await database("low_stock_configs")
        .where({ id: parseInt(id) })
        .delete()
        .returning("*");
      if (!config) throw new Error("Configuración no encontrada");
      return config;
    },

    toggleLowStockConfig: async (_, { id }) => {
      const config = await database("low_stock_configs")
        .where({ id: parseInt(id) })
        .first();
      if (!config) throw new Error("Configuración no encontrada");
      const [updated] = await database("low_stock_configs")
        .where({ id: parseInt(id) })
        .update({ is_active: !config.is_active, updated_at: new Date() })
        .returning("*");
      return updated;
    },
  },

  // Resolver para los campos relacionales de SupplyOrder
  SupplyOrder: {
    items: async (parent) => {
      return await database("supply_order_items").where({
        supply_order_id: parent.id,
      });
    },
    order_date: (parent) => {
      if (!parent.order_date) return new Date().toISOString();
      const d = new Date(parent.order_date);
      return isNaN(d) ? String(parent.order_date) : d.toISOString();
    },
    received_date: (parent) => {
      if (!parent.received_date) return null;
      const d = new Date(parent.received_date);
      return isNaN(d) ? String(parent.received_date) : d.toISOString();
    },
  },
};

export default resolvers;
