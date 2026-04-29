const { getChannel } = require("./connection");

const publishMessage = async (queue, message) => {
  try {
    const channel = getChannel();
    if (!channel) return;
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    console.log(`POS publicó en '${queue}':`, message);
  } catch (error) {
    console.error("POS: Error publicando:", error.message);
  }
};

module.exports = { publishMessage };
