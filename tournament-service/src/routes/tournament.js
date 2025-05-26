const express = require("express");
const Route = express.Router();
const TournamentControlller = require("../controllers/TournamentController");
const { checkTournamentAdmin } = require("../middleware/tournamentAdmin");

Route.post('/tournamentRegister', TournamentControlller.handleRegister)
Route.post('/setEntry', TournamentControlller.setEntry)
Route.post('/setFixtures', TournamentControlller.setFixtures)
Route.post('/login', checkTournamentAdmin, TournamentControlller.login)

Route.put('/updateWinner', checkTournamentAdmin, TournamentControlller.UpdateWinner)
Route.put('/deleteTeam', checkTournamentAdmin, TournamentControlller.deleteTeam)
Route.put('/updateTournamentTeam', checkTournamentAdmin, TournamentControlller.updatePayment)
Route.put('/updateTournament', checkTournamentAdmin, TournamentControlller.handleTournamentUpdate)

Route.get('/setTeams/:id?', TournamentControlller.setTeam)
Route.get('/setFixtureData/:id?/:round?', TournamentControlller.getSelectedRound);
Route.get("/getTournamnets/:id", TournamentControlller.getTournaments)
Route.get("/gettournament", TournamentControlller.fetchtournament)
Route.get("/getUserRegisteredTournament", TournamentControlller.getUserRegisteredTournament)


module.exports = Route;