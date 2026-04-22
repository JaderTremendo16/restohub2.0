import amqplib from "amqplib";

let channel = null;

export async function connectRabbitMQ() {
  const maxRetries = 10;
  const retryInterval = 5000; // 5 segundos
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertExchange("inventory.alerts", "fanout", { durable: true });
      console.log("✓ Conectado a RabbitMQ");
      return;
    } catch (error) {
      retries++;
      console.log(`⚠️ RabbitMQ no está listo. Reintento ${retries}/${maxRetries} en 5s...`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error("No se pudo conectar a RabbitMQ después de varios intentos");
}

export async function publishMessage(exchange, message) {
  if (!channel) throw new Error("RabbitMQ no está conectado");
  channel.publish(exchange, "", Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}
