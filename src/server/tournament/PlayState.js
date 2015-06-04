var TournamentState = require("./TournamentState");
var TournamentTable = require("./TournamentTable");
var ArrayUtil = require("../../utils/ArrayUtil");
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

	var users = this.tournament.getUsers();
	ArrayUtil.shuffle(users);

	var startChips = this.tournament.getStartChips();

	for (var i = 0; i < users.length; i++)
		this.tournamentTables[i % this.tournamentTables.length].sitInUser(users[i], startChips);
}

/**
 * New connection in play state.
 * @method notifyNewConnection
 */
PlayState.prototype.notifyNewConnection = function(protoConnection, user) {

}

module.exports = PlayState;