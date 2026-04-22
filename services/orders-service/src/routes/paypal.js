const express = require("express");
const router = express.Router();
const paypal = require("@paypal/checkout-server-sdk");
const db = require("../db/knex");

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
    const { orderID, order_id } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const response = await client.execute(request);

    if (response.result.status === "COMPLETED") {
      // Monto real capturado por PayPal (en USD)
      const paidAmountUSD = parseFloat(
        response.result.purchase_units[0].payments.captures[0].amount.value
      );

      console.log(`✅ Pago PayPal completado — Pedido: ${order_id} — USD $${paidAmountUSD}`);

      const invoice = await db("invoices").where({ order_id }).first();

      if (invoice) {
        // Registrar el pago
        await db("payments").insert({
          invoice_id: invoice.id,
          amount: paidAmountUSD,
          method: "paypal",
          status: "completed",
          transaction_id: response.result.id,
          gateway: "paypal",
          paid_at: new Date(),
        });

        // Actualizar factura
        await db("invoices").where({ id: invoice.id }).update({
          status: "paid",
          payment_method: "paypal",
          updated_at: new Date(),
        });

        // Obtener orden ANTES de actualizar para tener el customer_id
        const order = await db("orders").where({ id: order_id }).first();

        // Actualizar pedido a entregado
        await db("orders").where({ id: order_id }).update({
          status: "delivered",
          delivered_at: new Date(),
          updated_at: new Date(),
        });

        // ✅ Publicar evento de lealtad: 1 punto = $1 USD
        if (order && order.customer_id) {
          try {
            const { publishMessage } = require("../messaging/publisher");
            const points = Math.floor(paidAmountUSD); // 1 pt por dólar
            await publishMessage("order.completed", {
              customer_id: order.customer_id,
              total_amount: paidAmountUSD, // USD — loyalty lo usa directamente
              points,
              payment_method: "paypal",
              order_id,
            });
            console.log(
              `🎯 Loyalty event: customer=${order.customer_id} +${points} pts (USD $${paidAmountUSD})`
            );
          } catch (loyaltyErr) {
            console.error("⚠️  No se pudo publicar loyalty event:", loyaltyErr.message);
          }
        }

        // ✅ Publicar descuento de inventario
        try {
          const { publishMessage } = require("../messaging/publisher");
          const items = await db("order_items").where({ order_id });
          await publishMessage("inventory_deduction_requested", {
            order_id,
            restaurant_id: order.restaurant_id,
            items: items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
          });
          console.log(`📦 Inventario: Solicitado descuento para orden ${order_id}`);
        } catch (invErr) {
          console.error("⚠️  No se pudo publicar descuento de inventario:", invErr.message);
        }
      }

      res.json({ status: "success" });
    } else {
      res.status(400).json({ status: "failure", details: response.result });
    }
  } catch (error) {
    console.error("PayPal Capture Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
