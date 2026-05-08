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

        // Obtener orden ANTES de actualizar para tener todos los datos
        const order = await db("orders").where({ id: order_id }).first();
        const items = await db("order_items").where({ order_id });

        // ✅ ACTUALIZACIÓN: En lugar de 'delivered', va a 'validated' para que pase por cocina
        await db("orders").where({ id: order_id }).update({
          status: "validated",
          validated_at: new Date(),
          updated_at: new Date(),
        });

        // ✅ Notificar cambio de estado a 'validated'
        const { publishMessage, publishOrderCompleted } = require("../messaging/publisher");
        await publishMessage("order_status_updated", {
          order_id,
          status: "validated",
          restaurant_id: order.restaurant_id,
          customer_id: order.customer_id,
        });

        // ✅ ENVIAR A COCINA (Evento order_created)
        await publishMessage("order_created", {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
          customer_id: order.customer_id,
          channel: order.channel,
          status: "validated",
          priority: order.priority,
          area: order.area,
          origin: "orders",
          items: items.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            notes: i.notes || null,
          })),
        });

            // ✅ Publicar evento de lealtad
            if (order && order.customer_id) {
              try {
                // Para PayPal (USD): 1 punto por cada 1 USD
                const points_to_earn = Math.floor(paidAmountUSD);
                
                await publishOrderCompleted(
                  order.customer_id, 
                  paidAmountUSD, // Enviamos el monto real en USD
                  order_id,
                  "paypal",
                  points_to_earn
                );
                console.log(
                  `🎯 Loyalty event (PayPal): customer=${order.customer_id} +${points_to_earn} pts`
                );
              } catch (loyaltyErr) {
                console.error("⚠️  No se pudo publicar loyalty event:", loyaltyErr.message);
              }
            }

        // ✅ Publicar descuento de inventario (opcional aquí, o esperar a 'delivered')
        // Generalmente el inventario se descuenta al entregar, pero algunos prefieren al validar.
        // Lo dejaremos para 'delivered' para ser consistentes con resolvers.js
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
