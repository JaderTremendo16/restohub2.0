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

const recalcTotals = async (pos_order_id) => {
  const items = await db("pos_order_items").where({ pos_order_id });
  const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
  const tax = subtotal * 0.19;
  const total = subtotal + tax;
  await db("pos_orders")
    .where({ id: pos_order_id })
    .update({
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    });
  return { subtotal, tax, total };
};

const resolvers = {
  Query: {
    posOrders: async (_, { restaurant_id }) => {
      const q = db("pos_orders").orderBy("created_at", "desc");
      if (restaurant_id) q.where({ restaurant_id });
      return await q;
    },

    posOrder: async (_, { id }) => {
      return await db("pos_orders").where({ id }).first();
    },

    calculateChange: (_, { total, amount_received }) => ({
      total,
      amount_received,
      change_amount: parseFloat((amount_received - total).toFixed(2)),
      is_sufficient: amount_received >= total,
    }),

    posInvoice: async (_, { id }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");
      const items = await db("pos_order_items").where({ pos_order_id: id });
      return { ...order, items };
    },

    posMonthlyReport: async (_, { fromYear, toYear }) => {
      const currentYear = new Date().getFullYear();
      const from = fromYear || currentYear - 1;
      const to = toYear || currentYear;

      const result = await db.raw(
        `
        SELECT
          EXTRACT(YEAR  FROM created_at)::int AS year,
          EXTRACT(MONTH FROM created_at)::int AS month,
          COUNT(*)                            AS total_orders,
          COALESCE(SUM(total), 0)             AS total_revenue
        FROM pos_orders
        WHERE status = 'delivered'
          AND EXTRACT(YEAR FROM created_at) BETWEEN ? AND ?
        GROUP BY year, month
        ORDER BY year, month
      `,
        [from, to],
      );

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
    createPosOrder: async (
      _,
      { restaurant_id, cashier_name, table_ref, notes, items },
    ) => {
      const order = await db("pos_orders")
        .insert({
          restaurant_id,
          cashier_name,
          table_ref: table_ref || null,
          notes: notes || null,
          status: "open",
          subtotal: 0,
          tax: 0,
          total: 0,
        })
        .returning("*");

      const orderId = order[0].id;

      if (items && items.length > 0) {
        const rows = items.map((i) => ({
          pos_order_id: orderId,
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
          notes: i.notes || null,
        }));
        await db("pos_orders")
          .where({ id: orderId })
          .update({ orders_service_id: orderId });
        await recalcTotals(orderId);
      }

      await db("pos_orders")
        .where({ id: orderId })
        .update({ orders_service_id: orderId });

      return await db("pos_orders").where({ id: orderId }).first();
    },

    addPosItem: async (_, { pos_order_id, item }) => {
      const order = await db("pos_orders").where({ id: pos_order_id }).first();
      if (!order) throw new Error("Pedido POS no encontrado");
      if (order.status !== "open")
        throw new Error("Solo se pueden agregar ítems a pedidos abiertos");

      const row = await db("pos_order_items")
        .insert({
          pos_order_id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          notes: item.notes || null,
        })
        .returning("*");

      await recalcTotals(pos_order_id);
      return row[0];
    },

    removePosItem: async (_, { item_id }) => {
      const item = await db("pos_order_items").where({ id: item_id }).first();
      if (!item) throw new Error("Ítem no encontrado");
      await db("pos_order_items").where({ id: item_id }).delete();
      await recalcTotals(item.pos_order_id);
      return true;
    },

    billPosOrder: async (_, { id, customer_name, customer_document }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");
      if (!["open", "ready_to_deliver", "delivered"].includes(order.status))
        throw new Error("El pedido ya fue facturado o cancelado");

      const items = await db("pos_order_items").where({ pos_order_id: id });
      if (items.length === 0) throw new Error("No hay ítems en el pedido");

      const invoice_number = `POS-${Date.now()}`;

      const updated = await db("pos_orders")
        .where({ id })
        .update({
          status: "billed",
          invoice_number,
          customer_name: customer_name || null,
          customer_document: customer_document || null,
        })
        .returning("*");

      return updated[0];
    },

    payPosOrder: async (_, { id, payment_method, amount_received }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");
      if (order.status === "delivered")
        throw new Error("Este pedido ya fue pagado");
      if (order.status === "cancelled") throw new Error("Pedido cancelado");
      if (["open", "ready_to_deliver"].includes(order.status))
        throw new Error("Primero debes facturar el pedido");

      // Si es mercadopago, el monto lo valida MP externamente
      const total = parseFloat(order.total);
      const received =
        payment_method === "mercadopago" ? total : parseFloat(amount_received);

      if (payment_method !== "mercadopago" && received < total) {
        throw new Error(
          `Monto insuficiente. Total: $${total.toFixed(2)}, recibido: $${received.toFixed(2)}`,
        );
      }

      const change_amount =
        payment_method === "mercadopago"
          ? 0
          : parseFloat((received - total).toFixed(2));

      const updated = await db("pos_orders")
        .where({ id })
        .update({
          status: "delivered",
          payment_method,
          amount_received: received,
          change_amount,
        })
        .returning("*");

      await publishMessage("order_status_updated", {
        order_id: id,
        status: "delivered",
        restaurant_id: order.restaurant_id,
        customer_id: `pos-cashier`,
      });

      const items = await db("pos_order_items").where({ pos_order_id: id });
      await publishMessage("inventory_deduction_requested", {
        order_id: id,
        restaurant_id: order.restaurant_id,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity
        }))
      });

      return updated[0];
    },

    cancelPosOrder: async (_, { id }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");
      if (["paid", "cancelled"].includes(order.status))
        throw new Error("No se puede cancelar");
      const updated = await db("pos_orders")
        .where({ id })
        .update({ status: "cancelled" })
        .returning("*");
      return updated[0];
    },

    deliverPosOrder: async (_, { id }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");

      if (order.status !== "ready_to_deliver") {
        throw new Error(
          `El pedido no está listo. Estado actual: ${order.status}`,
        );
      }

      const updated = await db("pos_orders")
        .where({ id })
        .update({ status: "delivered", updated_at: new Date() })
        .returning("*");

      return updated[0];
    },

    confirmPosOrder: async (_, { id }) => {
      const order = await db("pos_orders").where({ id }).first();
      if (!order) throw new Error("Pedido no encontrado");
      if (order.sent_to_kitchen) throw new Error("El pedido ya fue enviado a cocina");

      const items = await db("pos_order_items").where({ pos_order_id: id });
      if (items.length === 0) throw new Error("No hay ítems para enviar a cocina");

      await publishMessage("order_created", {
        order_id: id,
        restaurant_id: order.restaurant_id,
        customer_id: `pos-${order.cashier_name}`,
        channel: "tpv",
        status: "pending",
        priority: "normal",
        area: "hot_kitchen",
        origin: "pos",
        items: items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      });

      const updated = await db("pos_orders")
        .where({ id })
        .update({ sent_to_kitchen: true })
        .returning("*");

      return updated[0];
    },
  },

  PosOrder: {
    items: async (parent) => {
      return await db("pos_order_items").where({ pos_order_id: parent.id });
    },
    created_at: (p) => new Date(p.created_at).toISOString(),
  },
};

module.exports = resolvers;
