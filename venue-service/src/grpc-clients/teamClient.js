const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
// Define the path to the user.proto file
const USER_PROTO_PATH = path.join(__dirname, '../../../protos/team.proto');

// Load the user.proto file
const packageDefinition = protoLoader.loadSync(USER_PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).team;

// Create the gRPC client for the user service
const teamClient = new userProto.TeamService(
    'localhost:5006', // Address of the user service
    grpc.credentials.createInsecure(),
    {
        'grpc.max_receive_message_length': 10 * 1024 * 1024,
        'grpc.max_send_message_length': 10 * 1024 * 1024,
    }

);

module.exports = teamClient;
