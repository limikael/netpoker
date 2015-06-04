var TournamentState = require("./TournamentState");
var TournamentTable = require("./TournamentTable");
var inherits = require("inherits");

/**
 * Play state.
 * @class PlayState
 */
function PlayState() {
	TournamentState.call(this);

	this.playSpectators = [];
	this.finishedUsers = [];
}

inherits(PlayState, TournamentState);

/**
 * Run.
 * @method run
 */
PlayState.prototype.run = function() {
	this.blindLevel = 0;
	this.tournamentTables = [];

	var numTables = Math.ceil(this.tournament.getNumRegistrations() / this.tournament.getSeatsPerTable());

	for (i = 0; i < numTables; i++) {
		var t = new TournamentTable(this, i);
		this.tournamentTables.push(t);
	}
}

/**
 * New connection in play state.
 * @method notifyNewConnection
 */
PlayState.prototype.notifyNewConnection = function(protoConnection, user) {

}

module.exports = PlayState;