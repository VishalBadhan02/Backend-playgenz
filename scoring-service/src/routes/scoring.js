const express = require("express")
const Route = express.Router()
const ScoreControl = require(`../controllers/ScoringController`)

Route.post('/setScoring', ScoreControl.ScoreCard)
Route.post("/startScoring", ScoreControl.handleScore)
Route.post("/handlePlayerSelection", ScoreControl.handlePlayerSelection)
Route.post("/score_update", ScoreControl.ScoreUpdate)

Route.put("/inning_update/:id?", ScoreControl.InningUpdate)

Route.get("/getScore/:id?", ScoreControl.getScore)

module.exports = Route