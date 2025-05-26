async function resolveEntity(entityId, entityType) {
    switch (entityType) {
        case 'User':
            return await userService.getUserById(entityId); // API call or DB query
        case 'Team':
            return await teamService.getTeamById(entityId);
        case 'Organizer':
            return await tournamentService.getOrganizerById(entityId);
        case 'VenueAdmin':
            return await venueService.getVenueAdminById(entityId);
        default:
            return null;
    }
}

module.exports = {
    resolveEntity
}
