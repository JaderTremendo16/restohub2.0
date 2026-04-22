const express = require("express");
const router = express.Router();
const paypal = require("@paypal/checkout-server-sdk");
const knex = require("../db/knex");

// Configuración de PayPal
let environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
if (process.env.PAYPAL_MODE === "live") {
  environment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
}
const client = new paypal.core.PayPalHttpClient(environment);

// Crear orden de PayPal
router.post("/create-paypal-order", async (req, res) => {
  try {
    const { order_id, total } = req.body;

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order_id,
          amount: {
            currency_code: "USD",
            value: parseFloat(total).toFixed(2),
          },
        },
      ],
    });

    const response = await client.execute(request);
    res.json({ id: response.result.id });
  } catch (error) {
    console.error("PayPal Create Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Capturar pago de PayPal
router.post("/capture-paypal-order", async (req, res) => {
  try {
    const { orderID, pos_order_id } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const response = await client.execute(request);

    if (response.result.status === "COMPLETED") {
      console.log(`✅ Pago de PayPal completado para orden: ${pos_order_id}`);

      // Actualizar estado del pedido en la base de datos
      await knex("pos_orders")
        .where({ id: pos_order_id })
        .update({ status: "delivered", payment_method: "paypal" });

      // Registrar el pago
      await knex("payments").insert({
        order_id: pos_order_id,
        status: "paid",
        method: "paypal",
        amount: parseFloat(response.result.purchase_units[0].payments.captures[0].amount.value),
      }).catch(err => {
          console.warn("⚠️ No se pudo insertar en la tabla 'payments', tal vez no exista aún:", err.message);
      });

      res.json({ status: "success", details: response.result });
    } else {
      res.status(400).json({ status: "failure", details: response.result });
    }
  } catch (error) {
    console.error("PayPal Capture Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
