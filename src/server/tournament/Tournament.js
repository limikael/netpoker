/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * A tournament is considered idle when there is no tournament ongoing,
 * the tournament does not manage any money, etc.
 * There might still be spectators connected to a tournament, however.
 * When there are no spectators the tournament will dispach as CAN_UNLOAD
 * event.
 * @class Tournament
 */
function Tournament() {
	EventDispatcher.call(this);
	throw new Error("not implemented");
}

inherits(Tournament, EventDispatcher);

/**
 * Dispatched when the tournament becomes idle.
 * @event Tournament.IDLE
 */
Tournament.IDLE = "idle";

/**
 * Dispatched when the tournament can unload itself,
 * i.e. it is idle and there are no spectators.
 * @event Tournament.CAN_UNLOAD
 */
Tournament.CAN_UNLOAD = "canUnload";

module.exports = Tournament;