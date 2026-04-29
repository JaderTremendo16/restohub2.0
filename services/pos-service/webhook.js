router.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Webhook recibido:", req.body);

    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      return res.sendStatus(200);
    }

    const fetch = require("node-fetch");

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      },
    );

    const payment = await mpResponse.json();

    console.log("💰 Estado del pago:", payment.status);

    if (payment.status === "approved") {
      const order_id = payment.external_reference;

      console.log("✅ Pago aprobado para orden:", order_id);

      // 👉 ACTUALIZA TU BD
      await knex("payments").insert({
        order_id,
        status: "paid",
        method: "mercadopago",
      });

      // 👉 Opcional: actualizar orden
      await knex("pos_orders")
        .where({ id: order_id })
        .update({ status: "paid" });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error webhook:", error);
    res.sendStatus(500);
  }
});
