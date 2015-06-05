var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Abstract class representing the state of a tournament.
 * @class TournamentState
 */
function TournamentState() {
	EventDispatcher.call(this);

	this.tournament = null;
}

inherits(TournamentState, EventDispatcher);

/**
 * The state can be unloaded.
 * @event TournamentState.CAN_UNLOAD
 */
TournamentState.CAN_UNLOAD = "canUnload";

/**
 * The state is idle.
 * @event TournamentState.IDLE
 */
TournamentState.IDLE = "idle";

/**
 * Set tournament that we are a state for.
 * @method setTournament
 */
TournamentState.prototype.setTournament = function(tournament) {
	this.tournament = tournament;
}

/**
 * Get tournament that we are a state for.
 * @method getTournament
 */
TournamentState.prototype.getTournament = function() {
	if (!this.tournament)
		throw new Error("tournament is not set yet");

	return this.tournament;
}

/**
 * Notify new connection.
 * @method notifyNewConnection
 */
TournamentState.prototype.notifyNewConnection = function(protoConnection, user) {
	throw new Error("abstract");
}

/**
 * Run.
 * @method run
 */
TournamentState.prototype.run = function() {
	throw new Error("abstract");
}

/**
 * Get number of connections.
 * @method getNumConnections
 */
TournamentState.prototype.getNumConnections = function() {
	throw new Error("abstract");
}

/**
 * Idle?
 * @method idIdle
 */
TournamentState.prototype.isIdle = function() {
	throw new Error("abstract");
}

/**
 * Hard close.
 * @method close
 */
TournamentState.prototype.close = function() {

}

module.exports = TournamentState;