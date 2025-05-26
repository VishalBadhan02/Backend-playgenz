const kafka = require("./kafka");

const consumer = kafka.consumer({ groupId: "kafka-group" });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "sample-topic", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      console.log("Received message:", message.value.toString());
    },
  });
}

module.exports = startConsumer;
