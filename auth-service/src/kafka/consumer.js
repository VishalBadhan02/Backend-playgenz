
const { kafka } = require("./kafka");

const consumer = kafka.consumer({ groupId: "auth-group" });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['friend-request'], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const messageValue = message.value.toString();

        const data = JSON.parse(messageValue);

        switch (topic) {
          case 'friend-request':
            await console.log(data);
            break;
          default:
            console.warn(`No handler for topic ${topic}`);
        }

        // Manually commit the offset after processing
        await consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      } catch (error) {
        console.error(`Error processing message from topic ${topic}:`, error);
        // Handle processing errors appropriately
      }
    },
  });

}

// Handle graceful shutdown
const shutdown = async () => {
  console.log("Disconnecting consumer...");
  try {
    // Synchronously commit offsets before shutting down
    await consumer.commitOffsets();
  } catch (error) {
    console.error("Error during synchronous commit:", error);
  } finally {
    await consumer.disconnect();
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = startConsumer
