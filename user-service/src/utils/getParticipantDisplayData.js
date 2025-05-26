const userService = require("../services/userService");

const getParticipantDisplayData = async (participants, user_id, recieverId) => {
    try {
        for (const participant of participants) {
            if (participant.entityId === user_id) continue;

            const { entityId, entityType } = participant;

            let name = "Unknown";
            let avatar = "";
            let type = entityType;

            if (entityType === "user") {
                const user = await userService.findUser(entityId);
                if (user) {
                    name = user.userName || "Unknown";
                    avatar = user.profilePicture || "";
                }
            } else if (["team", "tournament", "venue"].includes(entityType)) {
                // Assuming grpcService.getNameByType returns { name, avatar }
                const data = await grpcService.getNameByType(entityType, entityId);
                if (data) {
                    name = data.name || "Unknown";
                    avatar = data.avatar || "";
                }
            }

            return {
                name,
                avatar,
                type,
                id: entityId
            };
        }

        return null;
    } catch (err) {
        console.error("getParticipantDisplayData error:", err);
        return null;
    }
};

module.exports = {
    getParticipantDisplayData
}