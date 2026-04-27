const db = require("../db/knex");
const { publishMessage } = require("../messaging/publisher");

const MONTH_NAMES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const assignArea = (channel, notes) => {
  if (channel === "rappi") return "delivery";
  if (notes && notes.toLowerCase().includes("barra")) return "bar";
  if (notes && notes.toLowerCase().includes("frio")) return "cold_kitchen";
  return "hot_kitchen";
};

const VALID_TRANSITIONS = {
  pending: ["validated", "cancelled"],
  validated: ["cancelled"],
  in_preparation: [],
  packing: [],
  ready: [],
  delivered: [],
  cancelled: [],
};

const resolvers = {
  Query: {
    orders: async (_, { customer_id }) => {
      let q = db("orders").select("*");
      if (customer_id) q = q.where({ customer_id });
      return await q
        .orderByRaw(
          `CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END`,
        )
        .orderBy("created_at", "asc");
    },

    order: async (_, { id }) => {
      return await db("orders").where({ id }).first();
    },

    orderItems: async (_, { order_id }) => {
      return await db("order_items").where({ order_id });
    },

    orderInvoice: async (_, { order_id }) => {
      return await db("invoices").where({ order_id }).first();
    },

    orderPayment: async (_, { order_id }) => {
      const invoice = await db("invoices").where({ order_id }).first();
      if (!invoice) return null;
      return await db("payments").where({ invoice_id: invoice.id }).first();
    },

    orderTiming: async (_, { id }) => {
      const order = await db("orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      const now = new Date();

      return {
        order_id: order.id,
        status: order.status,
        area: order.area,
        estimated_preparation_time: order.estimated_preparation_time,
        waiting_minutes: order.validated_at
          ? Math.round(
              (new Date(order.validated_at) - new Date(order.created_at)) /
                60000,
            )
          : Math.round((now - new Date(order.created_at)) / 60000),
        preparation_minutes: order.preparation_started_at
          ? Math.round(
              ((order.packing_at ? new Date(order.packing_at) : now) -
                new Date(order.preparation_started_at)) /
                60000,
            )
          : null,
        total_minutes: order.delivered_at
          ? Math.round(
              (new Date(order.delivered_at) - new Date(order.created_at)) /
                60000,
            )
          : Math.round((now - new Date(order.created_at)) / 60000),
      };
    },

    paidInvoices: async () => {
      const rows = await db("invoices")
        .select(
          "order_id",
          "invoice_number",
          "total",
          "status",
          "payment_method",
          "customer_name",
          "created_at",
        )
        .orderBy("created_at", "desc");
      return rows.map((r) => ({
        ...r,
        total: parseFloat(r.total),
        created_at: new Date(r.created_at).toISOString(),
      }));
    },

    monthlyReport: async (_, { fromYear, toYear, restaurant_id }) => {
      const currentYear = new Date().getFullYear();
      const from = fromYear || currentYear - 1;
      const to = toYear || currentYear;

      let query = `
        SELECT
          EXTRACT(YEAR  FROM o.created_at)::int AS year,
          EXTRACT(MONTH FROM o.created_at)::int AS month,
          COUNT(DISTINCT o.id)                  AS total_orders,
          COALESCE(SUM(i.total), 0)            AS total_revenue
        FROM orders o
        LEFT JOIN invoices i ON i.order_id = o.id
        WHERE o.status = 'delivered'
          AND EXTRACT(YEAR FROM o.created_at) BETWEEN ? AND ?
      `;
      const params = [from, to];

      if (restaurant_id) {
        const ids = restaurant_id.split(',').map(id => id.trim());
        query += ` AND o.restaurant_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }

      query += `
        GROUP BY year, month
        ORDER BY year, month
      `;

      const result = await db.raw(query, params);

      return result.rows.map((r) => ({
        year: r.year,
        month: r.month,
        monthName: MONTH_NAMES[r.month],
        totalOrders: parseInt(r.total_orders),
        totalRevenue: parseFloat(r.total_revenue),
        averageTicket:
          parseInt(r.total_orders) > 0
            ? parseFloat(r.total_revenue) / parseInt(r.total_orders)
            : 0,
      }));
    },
  },

  Mutation: {
    createOrder: async (
      _,
      { restaurant_id, customer_id, channel, notes, priority },
    ) => {
      const area = assignArea(channel, notes);
      const finalPriority =
        priority || (channel === "rappi" ? "high" : "normal");

      const order = await db("orders")
        .insert({
          restaurant_id,
          customer_id,
          channel,
          notes,
          area,
          status: "pending",
          priority: finalPriority,
        })
        .returning("*");

      return order[0];
    },

    addOrderItems: async (_, { order_id, items }) => {
      const order = await db("orders").where({ id: order_id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      if (["delivered", "cancelled", "ready"].includes(order.status)) {
        throw new Error(
          `No se pueden agregar ítems a un pedido en estado ${order.status}`,
        );
      }

      const existingItems = await db("order_items").where({ order_id });

      const orderItems = items.map((item) => ({
        order_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        notes: item.notes || null,
      }));

      const inserted = await db("order_items")
        .insert(orderItems)
        .returning("*");

      return inserted;
    },

    updateOrderStatus: async (_, { id, status }) => {
      const order = await db("orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      const kitchenOnlyStates = ["in_preparation", "packing", "ready"];
      if (kitchenOnlyStates.includes(status)) {
        throw new Error(
          `El estado "${status}" solo puede ser gestionado desde Kitchen Service`,
        );
      }

      if (status === "delivered") {
        const items = await db("order_items").where({ order_id: id });
        if (items.length === 0) {
          throw new Error("No se puede entregar un pedido sin ítems");
        }

        if (order.status !== "ready") {
          throw new Error(
            'Solo se puede entregar un pedido cuando esté en estado "ready"',
          );
        }
      }

      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status) && status !== "delivered") {
        throw new Error(
          `Transición inválida: no se puede pasar de "${order.status}" a "${status}"`,
        );
      }

      const updates = { status };

      if (status === "validated") updates.validated_at = new Date();
      if (status === "delivered") updates.delivered_at = new Date();

      const updated = await db("orders")
        .where({ id })
        .update(updates)
        .returning("*");

      await publishMessage("order_status_updated", {
        order_id: updated[0].id,
        status: updated[0].status,
        restaurant_id: updated[0].restaurant_id,
        customer_id: updated[0].customer_id,
      });

      // NOTIFICAR A COCINA SOLO CUANDO SE VALIDA (Confirmar Pedido)
      if (status === "validated") {
        const items = await db("order_items").where({ order_id: id });
        await publishMessage("order_created", {
          order_id: updated[0].id,
          restaurant_id: updated[0].restaurant_id,
          customer_id: updated[0].customer_id,
          channel: updated[0].channel,
          status: updated[0].status,
          priority: updated[0].priority,
          area: updated[0].area,
          origin: "orders",
          items: items.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        });
      }

      if (status === "delivered" && order.origin !== "pos") {
        const items = await db("order_items").where({ order_id: id });
        await publishMessage("inventory_deduction_requested", {
          order_id: id,
          restaurant_id: updated[0].restaurant_id,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        });
      }

      return updated[0];
    },

    updateOrderPriority: async (_, { id, priority }) => {
      const valid = ["low", "normal", "high"];
      if (!valid.includes(priority)) throw new Error("Prioridad inválida");

      const order = await db("orders")
        .where({ id })
        .update({ priority })
        .returning("*");

      return order[0];
    },

    generateInvoice: async (
      _,
      { order_id, customer_name, customer_email, customer_document },
    ) => {
      const order = await db("orders").where({ id: order_id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      if (order.status !== 'ready' && order.status !== 'delivered' && order.status !== 'pending' && order.status !== 'validated') {
        throw new Error('El estado del pedido no permite facturación en este momento');
      }

      const existing = await db("invoices").where({ order_id }).first();
      if (existing) return existing;

      const items = await db("order_items").where({ order_id });
      if (items.length === 0) {
        throw new Error("No se puede generar factura sin ítems");
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.subtotal),
        0,
      );
      const tax = 0;
      const total = totalAmount;

      const invoice = await db("invoices")
        .insert({
          order_id,
          invoice_number: `FAC-${Date.now()}`,
          subtotal: totalAmount.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          customer_name,
          customer_email: customer_email || null,
          customer_document: customer_document || null,
          status: "pending",
        })
        .returning("*");

      return invoice[0];
    },

    createPayment: async (_, { order_id, method, amount }) => {
      const order = await db("orders").where({ id: order_id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      const items = await db("order_items").where({ order_id });
      if (items.length === 0) {
        throw new Error("No se puede registrar pago sin ítems");
      }

      if (order.status !== "ready" && order.status !== "pending") {
        throw new Error(
          'Solo se puede registrar el pago cuando el pedido esté en estado "ready" o sea un pedido web "pending"',
        );
      }

      const invoice = await db("invoices").where({ order_id }).first();
      if (!invoice) {
        throw new Error("Genera primero la factura del pedido");
      }

      if (invoice.status === "paid") {
        throw new Error("Esta factura ya fue pagada");
      }

      const totalInvoice = parseFloat(invoice.total);
      const totalPaid = parseFloat(amount);

      if (totalPaid < totalInvoice) {
        throw new Error(
          `El pago es insuficiente. Total esperado: ${totalInvoice.toFixed(2)}`,
        );
      }

      const payment = await db("payments")
        .insert({
          invoice_id: invoice.id,
          amount,
          method,
          status: "completed",
          transaction_id: `TXN-${Date.now()}`,
          gateway: "manual",
          paid_at: new Date(),
        })
        .returning("*");

      await db("invoices").where({ id: invoice.id }).update({
        status: "paid",
        payment_method: method,
        updated_at: new Date(),
      });

      if (order.status === "ready") {
        await db("orders").where({ id: order_id }).update({
          status: "delivered",
          delivered_at: new Date(),
          updated_at: new Date(),
        });

        await publishMessage("order_status_updated", {
          order_id,
          status: "delivered",
          restaurant_id: order.restaurant_id,
          customer_id: order.customer_id,
        });
      }

      if (order.customer_id) {
        const points_to_earn = Math.floor(totalPaid);
        await publishMessage("order.completed", {
          customer_id: order.customer_id,
          points: points_to_earn,
          total_amount: totalPaid,
        }).catch((err) =>
          console.error("Error publishing loyalty points:", err),
        );
      }

      return payment[0];
    },
  },

  Order: {
    created_at: (p) => new Date(p.created_at).toISOString(),
    updated_at: (p) => new Date(p.updated_at).toISOString(),
    validated_at: (p) =>
      p.validated_at ? new Date(p.validated_at).toISOString() : null,
    preparation_started_at: (p) =>
      p.preparation_started_at
        ? new Date(p.preparation_started_at).toISOString()
        : null,
    packing_at: (p) =>
      p.packing_at ? new Date(p.packing_at).toISOString() : null,
    ready_at: (p) => (p.ready_at ? new Date(p.ready_at).toISOString() : null),
    delivered_at: (p) =>
      p.delivered_at ? new Date(p.delivered_at).toISOString() : null,
  },
};

module.exports = resolvers;
