const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const mongoose = require('mongoose');
const Config = require("../config");
const { GetTournament, ListTournaments,getMatchById } = require("../controllers/GrpcController");

// Load proto file
const PROTO_PATH = path.resolve(__dirname, "../../protos/tournament.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const tournamentProto = grpc.loadPackageDefinition(packageDefinition).tournament;



// MongoDB Connection
mongoose.connect(Config.DATABASE.URL).then(() => console.log('✅ tournament Service connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));


// Start gRPC Server
const server = new grpc.Server(
    {
        'grpc.max_receive_message_length': 10 * 1024 * 1024,  // 10 MB
        'grpc.max_send_message_length': 10 * 1024 * 1024      // 10 MB
    }
);
server.addService(tournamentProto.TournamentService.service, {
    GetTournament: GetTournament,
    ListTournaments: ListTournaments,
    GetMatchById:getMatchById
});

server.bindAsync(`${Config.TOURNAMENT_GRPC_HOST}:${Config.TOURNAMENT_GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log("🚀 Tournament-Service gRPC Server running on port 5006");
});
