const teamServices = require("../services/teamServices");

const scheduleMatches = async (data) => {
    try {
        const newMatch = teamServices.bulkMatchScheduling(data);
        if (!newMatch) {
            console.log("Failed to create new match", newMatch);
            // throw new Error("Failed to create new match");
        }
        return true;
    } catch (error) {
        console.error("Error scheduling match:", error);
        throw new Error("Failed to schedule match");
    }
}

module.exports = {
    scheduleMatches,
};