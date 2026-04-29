const { getChannel } = require("./connection");
const db = require("../db/knex");

const consumeMessages = async () => {
  let channel = getChannel();
  if (!channel) {
    console.log("Canal no disponible, reintentando en 5 segundos...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return consumeMessages();
  }

  await channel.assertQueue("order_created", { durable: true });
  await channel.assertQueue("order_status_updated", { durable: true });

  channel.consume("order_created", async (msg) => {
    if (msg) {
      try {
        const order = JSON.parse(msg.content.toString());
        console.log("Nueva orden recibida:", order);

        const existing = await db("kitchen_orders")
          .where({ order_id: order.order_id })
          .first();

        // Limpiar prioridad "urgent" que puede venir de frontends desactualizados
        let cleanPriority = order.priority || "normal";
        if (cleanPriority === "urgent") cleanPriority = "high";
        
        // A pesar de la limpieza, validar contra db constraints
        const validPriorities = ["low", "normal", "high"];
        if (!validPriorities.includes(cleanPriority)) cleanPriority = "normal";

        if (!existing) {
          const inserted = await db("kitchen_orders")
            .insert({
              order_id: order.order_id,
              restaurant_id: order.restaurant_id,
              customer_id: order.customer_id,
              channel: order.channel,
              priority: cleanPriority,
              origin: order.origin || "orders",
              status: "pending",
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning("*");

          // Guardar ítems si vienen en el mensaje
          if (order.items && order.items.length > 0) {
            const itemRows = order.items.map((i) => ({
              kitchen_order_id: inserted[0].id,
              product_name: i.product_name,
              quantity: i.quantity,
              notes: i.notes || null,
            }));
            await db("kitchen_order_items").insert(itemRows);
          }

          console.log("Orden guardada en cocina:", order.order_id);
        }
      } catch (err) {
        console.error("Error al persistir order_created:", err.message);
      } finally {
        channel.ack(msg);
      }
    }
  });

  channel.consume("order_status_updated", async (msg) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        const kitchenStatusMap = {
          pending: "in_preparation",
          in_preparation: "ready",
          ready: "ready",
          delivered: "ready",
          cancelled: "cancelled",
        };
        const kitchenStatus = kitchenStatusMap[data.status] || data.status;
        
        // Verifica que no estemos intentando insertar algo prohibido
        const validStatuses = ["pending", "received", "in_preparation", "packing", "ready", "cancelled"];
        if (validStatuses.includes(kitchenStatus)) {
          await db("kitchen_orders")
            .where({ order_id: data.order_id })
            .update({ status: kitchenStatus });
        } else {
          console.error("Estado inválido para cocina omitido:", kitchenStatus);
        }
      } catch (err) {
        console.error("Error procesando actualización de estado:", err.message);
      } finally {
        channel.ack(msg);
      }
    }
  });

  console.log("Escuchando colas de RabbitMQ...");
};

module.exports = { consumeMessages };