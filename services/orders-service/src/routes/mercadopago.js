const express = require("express");
const router = express.Router();
const { MercadoPagoConfig, Preference } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

router.post("/create-preference", async (req, res) => {
  try {
    const { order_id, items, total, invoice_number } = req.body;

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: items.map((item) => ({
          id: item.id || "item-001",
          title: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          currency_id: "COP",
        })),
        back_urls: {
          success: `${process.env.FRONTEND_URL}/orders?payment=success&order_id=${order_id}`,
          failure: `${process.env.FRONTEND_URL}/orders?payment=failure&order_id=${order_id}`,
          pending: `${process.env.FRONTEND_URL}/orders?payment=pending&order_id=${order_id}`,
        },
        auto_return: "approved",
        external_reference: order_id,
        statement_descriptor: "RestoHub Orders",
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
