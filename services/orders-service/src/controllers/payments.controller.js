const db = require("../db/knex");

const createPayment = async (req, res) => {
  const { id } = req.params;
  const { method, amount } = req.body;

  try {
    const invoice = await db("invoices").where({ order_id: id }).first();
    if (!invoice)
      return res.status(404).json({ error: "Factura no encontrada" });

    if (invoice.status === "paid") {
      return res.status(400).json({ error: "Esta factura ya fue pagada" });
    }

    const payment = await db("payments")
      .insert({
        invoice_id: invoice.id,
        amount,
        method,
        status: "completed",
        transaction_id: `TXN-${Date.now()}`,
        gateway: "manual",
      })
      .returning("*");

    await db("invoices").where({ id: invoice.id }).update({ status: "paid" });
    await db("orders").where({ id }).update({ status: "delivered" });

    res.status(201).json({
      payment: payment[0],
      message: "Pago registrado exitosamente",
    });
  } catch (error) {
    res.status(500).json({ error: "Error al procesar el pago" });
  }
};

const getPaymentByOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await db("invoices").where({ order_id: id }).first();
    if (!invoice)
      return res.status(404).json({ error: "Factura no encontrada" });

    const payment = await db("payments")
      .where({ invoice_id: invoice.id })
      .first();
    if (!payment) return res.status(404).json({ error: "Pago no encontrado" });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el pago" });
  }
};

module.exports = { createPayment, getPaymentByOrder };
