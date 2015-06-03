
/**
 * A tournament is considered idle when there is no tournament ongoing,
 * the tournament does not manage any money, etc.
 * There might still be spectators connected to a tournament, however.
 * When there are no spectators the tournament will dispach as CAN_UNLOAD
 * event.
 */
function Tournament() {
	throw new Error("not implemented");
}

module.exports = Tournament;