const kafka = require("./kafkaClient");
const { Partitioners } = require('kafkajs');

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

async function sendMessage(topic, message) {
  await producer.connect();
  console.log("🚀 Producer connected");

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
}

module.exports = sendMessage;
