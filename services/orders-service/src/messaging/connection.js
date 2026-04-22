const amqp = require("amqplib");

let channel = null;

const connectRabbitMQ = async () => {
  while (!channel) {
    try {
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://rabbitmq",
      );

      channel = await connection.createChannel();
      console.log("Conectado a RabbitMQ");

      return channel;
    } catch (error) {
      console.error("Error conectando a RabbitMQ:", error.message);
      console.log("Reintentando conexión en 5 segundos...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
