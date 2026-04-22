const db = require("../db/knex");

const listenToKitchen = async (channel) => {
  const queue = "kitchen_status_updated_pos"; // cola exclusiva para POS
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const { order_id, status } = JSON.parse(msg.content.toString());
      console.log(`POS recibió de kitchen: orden ${order_id} → ${status}`);

      if (status === "ready") {
        // Buscar por id directo O por orders_service_id
        const posOrder = await db("pos_orders")
          .where({ id: order_id })
          .orWhere({ orders_service_id: order_id })
          .first();

        if (posOrder) {
          await db("pos_orders").where({ id: posOrder.id }).update({
            status: "ready_to_deliver",
          });
          console.log(`✅ POS: orden ${posOrder.id} → ready_to_deliver`);
        } else {
          console.log(`⚠ POS: no se encontró orden con id ${order_id}`);
        }
      }

      channel.ack(msg);
    } catch (e) {
      console.error("POS consumer error:", e);
      channel.ack(msg);
    }
  });

  console.log("✅ POS escuchando kitchen_status_updated...");
};

module.exports = { listenToKitchen };
