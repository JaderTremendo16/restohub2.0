const db = require("../db/knex");

const listenToKitchen = async (channel) => {
  const queue = "kitchen_status_updated";

  try {
    await channel.assertQueue(queue, { durable: true });

    console.log(`✅ Orders-Service escuchando cola: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const rawContent = msg.content.toString();
        console.log("🔔 Mensaje recibido desde Kitchen:", rawContent);

        const content = JSON.parse(rawContent);
        const { order_id, status } = content;

        if (!order_id || !status) {
          console.warn("⚠️ Mensaje inválido:", content);
          channel.ack(msg);
          return;
        }

        const updated = await db("orders").where({ id: order_id }).update({
          status,
          updated_at: new Date(),
        });

        if (updated > 0) {
          console.log(`✅ Orden ${order_id} actualizada a: ${status}`);
        } else {
          console.warn(`⚠️ No se encontró la orden ${order_id} en Orders`);
        }

        channel.ack(msg);
      } catch (error) {
        console.error("❌ Error procesando mensaje de Kitchen:", error.message);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("❌ Error configurando consumer de Kitchen:", error.message);
  }
};

module.exports = { listenToKitchen };
