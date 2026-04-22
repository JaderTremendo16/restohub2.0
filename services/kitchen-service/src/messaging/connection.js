const amqp = require("amqplib");

let channel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost",
    );

    channel = await connection.createChannel();

    await channel.assertExchange("orders_exchange", "topic", {
      durable: true,
    });

    console.log("Conectado a RabbitMQ");
    return channel;
  } catch (error) {
    console.error("❌ Error conectando a RabbitMQ:", error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const getChannel = () => channel;

const publishMessage = async (routingKey, message) => {
  if (!channel) throw new Error("RabbitMQ channel no inicializado");

  channel.publish(
    "orders_exchange",
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );

  console.log(`📤 Evento enviado: ${routingKey}`, message);
};

module.exports = { connectRabbitMQ, getChannel, publishMessage };
