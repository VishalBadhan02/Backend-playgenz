const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const Config = require('../config');

const PROTO_PATH = path.join(__dirname, '../../protos/tournament.proto');

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const tournamentProto = grpc.loadPackageDefinition(packageDefinition).tournament;

// Create client
const tournamentlient = new tournamentProto.TournamentService(
    `${Config.TOURNAMENT_GRPC_HOST}:${Config.TOURNAMENT_GRPC_PORT}`,
    grpc.credentials.createInsecure()
);

module.exports = tournamentlient;




