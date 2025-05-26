const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "kafka", // Service name as clientId
  brokers: ["localhost:9092"], // Kafka broker address
});

module.exports = kafka;
