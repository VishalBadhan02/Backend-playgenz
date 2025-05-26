const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Config = require('../config');

// Define the path to the user.proto file
const TEAM_PROTO_PATH = path.join(__dirname, '../../protos/team.proto');

// Load the user.proto file
const packageDefinition = protoLoader.loadSync(TEAM_PROTO_PATH);
const teamProto = grpc.loadPackageDefinition(packageDefinition).team;

// Create the gRPC client for the user service
const teamClient = new teamProto.TeamService(
    `${Config.TEAM_GRPC_HOST}:${Config.TEAM_GRPC_PORT}`, // Address of the user service
    grpc.credentials.createInsecure()
);

module.exports = teamClient;
