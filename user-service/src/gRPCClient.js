const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const grpc = require("@grpc/grpc-js");
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.resolve(__dirname, '../protos/team.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const teamProto = grpc.loadPackageDefinition(packageDefinition).team;


const teamClient = new teamProto.TeamService(
    `0.0.0.0:${process.env.USER_GRPC_PORT || 5006}`,
    grpc.credentials.createInsecure()
);


module.exports = { teamClient }

