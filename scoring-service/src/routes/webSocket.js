const { ScoreUpdate, matchSetup } = require("../controllers/WebController");

const handleWebRouting = async (message, userConnections, ws) => {
    try {
        const data = JSON.parse(message);
        if (data.type === "matchsetup") {
            await matchSetup(data, ws);
        }
        if (data.type === "scoreUpdate") {
            await ScoreUpdate(data, userConnections, ws);
        }
    } catch (error) {
        throw error
    }
}

module.exports = handleWebRouting