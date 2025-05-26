const { Kafka } = require("kafkajs");
const Config = require("../config");

const kafka = new Kafka({
  clientId: "score-service", // Service name as clientId
 brokers: [ Config.KAFKA_BROKERS + ':' + Config.KAFKA_BROKERS_PORT],
});

const admin = kafka.admin();

const checkConnection = async () => {
  try {
    await admin.connect();
    console.log('✅ Successfully connected to the Kafka broker.');
  } catch (error) {
    console.error('Failed to connect to the Kafka broker:', error);
  } finally {
    await admin.disconnect();
  }
};

checkConnection();

module.exports = { kafka };
