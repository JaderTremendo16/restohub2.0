const { getChannel } = require("./connection");

const publishMessage = async (queue, message) => {
  try {
    const channel = getChannel();

    if (!channel) {
      throw new Error("No hay canal de RabbitMQ disponible");
    }

    await channel.assertQueue(queue, { durable: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log(`📤 Mensaje enviado a ${queue}:`, message);
  } catch (error) {
    console.error("❌ Error publicando mensaje:", error.message);
  }
};

module.exports = { publishMessage };
