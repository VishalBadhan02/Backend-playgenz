const { kafka } = require("./kafka");

const producer = kafka.producer();

async function sendMessage(topic, message) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
}

module.exports = sendMessage;
