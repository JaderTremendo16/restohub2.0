import amqplib from "amqplib";
import { processInventoryDeduction } from "../services/deduct_inventory.js";

export async function startConsumer() {
  try {
    const queue = "inventory_deduction_requested";

    // Reutilizar la URL global
    const connection = await amqplib.connect(
      process.env.RABBITMQ_URL || "amqp://admin:admin123@rabbitmq:5672",
    );
    const channel = await connection.createChannel();

    // Crear cola propia para inventario
    await channel.assertQueue(queue, { durable: true });

    channel.consume(
      queue,
      async (msg) => {
        if (msg !== null) {
          try {
            const eventData = JSON.parse(msg.content.toString());
            console.log(`[Inventory] Evento recibido en cola ${queue}`, eventData);

            await processInventoryDeduction(eventData);

            channel.ack(msg);
          } catch (error) {
            console.error(
              `[Inventory] Error procesando evento de ${queue}:`,
              error.message,
            );
            // Hacer nack para reintentar si es necesario, pero evitar loop infinito
            // channel.nack(msg, false, false); 
            channel.ack(msg); // Ignorar el fallo en pruebas por ahora.
          }
        }
      },
      { noAck: false },
    );

    console.log(`[Inventory] ✅ Consumer conectado a la cola ${queue}`);
  } catch (error) {
    console.error("[Inventory] Error conectando Consumer:", error.message);
  }
}
