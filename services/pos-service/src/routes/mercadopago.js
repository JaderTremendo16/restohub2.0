const express = require("express");
const router = express.Router();
const { MercadoPagoConfig, Preference } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

router.post("/create-preference", async (req, res) => {
  try {
    const { order_id, items } = req.body;

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: items.map((item) => ({
          id: item.id || "item-001",
          title: item.product_name || "Producto",
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 1,
          currency_id: "ARS",
        })),
        payer: {
          email: "test_user_123@testuser.com",
        },

        notification_url:
          "https://carwash-detective-cobalt.ngrok-free.dev/webhook",

        back_urls: {
          success: `https://carwash-detective-cobalt.ngrok-free.dev/pos?payment=success&order_id=${order_id}`,
          failure: `https://carwash-detective-cobalt.ngrok-free.dev/pos?payment=failure&order_id=${order_id}`,
          pending: `https://carwash-detective-cobalt.ngrok-free.dev/pos?payment=pending&order_id=${order_id}`,
        },
        auto_return: "approved",
        external_reference: order_id,
        statement_descriptor: "RestoHub POS",
      },
    });

    res.json({
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    });
  } catch (error) {
    console.error("MP Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
