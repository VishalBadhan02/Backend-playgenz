// utils/teamMemberUtils.js (or inside same file if preferred)

const getUpdateDataByType = (type) => {
    const typeUpdateMap = {
        remove: {
            status: 3,
            commit: "removed",
            isActive: false,
        },
        leave: {
            status: 3,
            commit: "leave",
            isActive: false,
        },
        Coach: {
            commit: "Coach",
        },
        Player: {
            commit: "Player",
        },
        Captain: {
            commit: "Captain",
            isActive: false,
        },
        Manager: {
            commit: "Manager",
        },
    };

    return typeUpdateMap[type] || null;
};

module.exports = { getUpdateDataByType };
