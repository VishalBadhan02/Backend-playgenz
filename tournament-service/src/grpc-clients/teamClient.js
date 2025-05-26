const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Config = require('../config');
// Define the path to the user.proto file
const USER_PROTO_PATH = path.join(__dirname, '../../protos/team.proto');

// Load the user.proto file
const packageDefinition = protoLoader.loadSync(USER_PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).team;

// Create the gRPC client for the user service
const teamClient = new userProto.TeamService(
    `${Config.TEAM_GRPC_HOST}:${Config.TEAM_GRPC_PORT}`, // Address of the user service
    grpc.credentials.createInsecure(),
    {
        'grpc.max_receive_message_length': 10 * 1024 * 1024,
        'grpc.max_send_message_length': 10 * 1024 * 1024,
    }

);

module.exports = teamClient;
