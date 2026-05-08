const db = require("../db/knex");
const { publishMessage, publishOrderCompleted } = require("./publisher");

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

          if (status === "delivered") {
            const items = await db("order_items").where({ order_id });
            const order = await db("orders").where({ id: order_id }).first();
            
            await publishMessage("inventory_deduction_requested", {
              order_id,
              restaurant_id: order.restaurant_id,
              items: items.map((i) => ({
                product_id: i.product_id,
                quantity: i.quantity,
              })),
            });

            if (order.customer_id) {
              const invoice = await db("invoices").where({ order_id }).first();
              if (invoice && invoice.status === "paid" && invoice.payment_method === "cash") {
                const totalPaid = parseFloat(invoice.total);
                
                // Usamos el helper unificado que ya maneja la lógica de moneda y publicación dual
                await publishOrderCompleted(
                  order.customer_id,
                  totalPaid,
                  order_id,
                  "cash"
                );
                console.log(`🎁 Puntos por efectivo otorgados desde Kitchen para orden ${order_id}`);
              }
            }
          }
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
