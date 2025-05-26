const { handleFriendRequest, handleDeleteRequest, handleApproveRequest } = require("../controllers/KafkaController");
const { kafka } = require("./kafka");

const consumer = kafka.consumer({ groupId: "notification-group" });

let hasRunStarted = false;

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['friend-request', 'delete-request', 'approve-request'], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      hasRunStarted = true; // ✅ set flag

      try {
        const messageValue = message.value.toString();
        const data = JSON.parse(messageValue);

        switch (topic) {
          case 'friend-request':
            await handleFriendRequest(data);
            break;
          case 'delete-request':
            await handleDeleteRequest(data);
            break;
          case 'approve-request':
            await handleApproveRequest(data);
            break;
          default:
            console.warn(`No handler for topic ${topic}`);
        }

        await consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      } catch (error) {
        console.error(`Error processing message from topic ${topic}:`, error);
      }
    },
  });
}


// Handle graceful shutdown
const shutdown = async () => {
  console.log("Disconnecting consumer...");
  try {
    if (hasRunStarted) {
      // Optional: commit known offsets if you've tracked them
      // Or skip and just disconnect
    }
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
