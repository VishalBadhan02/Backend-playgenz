const express = require("express");
const Route = express.Router();
const TeamControlller = require("../controllers/TeamController")


Route.get("/getTeam/:team_A?/:team_B?", TeamControlller.getTeam)
Route.get("/getTeamProfile/:_id?", TeamControlller.getTeamProfile)
Route.get("/fetchTeams/:game?", TeamControlller.getTeamsForRequest)
Route.get("/fetchGamesAndFixtures", TeamControlller.gamesAndFixtures)
Route.get("/matches", TeamControlller.getMatches)
Route.get("/scoreCards", TeamControlller.fetchScoreCards)

Route.post("/handleRequest", TeamControlller.handleMatchRequest)
Route.post("/teamRegistration", TeamControlller.registerTeam)
Route.post("/teamRequest", TeamControlller.handleTeamRequest)

Route.put("/handleScore", TeamControlller.manageScore)
Route.put("/updateTeam", TeamControlller.updateTeam)
Route.put("/handleAddPlayer", TeamControlller.handleAddPlayer)

Route.delete("/removePlayer", TeamControlller.handleTeamMember)


module.exports = Route;