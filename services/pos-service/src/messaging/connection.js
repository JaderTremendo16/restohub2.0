const amqp = require("amqplib");
const { listenToKitchen } = require("./consumer");

let channel = null;

const connectRabbitMQ = async () => {
  while (true) {
    try {
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost",
      );
      channel = await connection.createChannel();
      console.log("POS: Conectado a RabbitMQ");

      // ✅ Arrancar consumer AQUÍ, cuando el canal ya existe
      await listenToKitchen(channel);

      return channel;
    } catch (error) {
      console.error("POS: Error conectando a RabbitMQ:", error.message);
      console.log("POS: Reintentando conexión en 5 segundos...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

const getChannel = () => channel;
module.exports = { connectRabbitMQ, getChannel };
