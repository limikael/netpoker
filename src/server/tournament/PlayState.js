/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var TournamentTable = require("./TournamentTable");
var FinishedState = require("./FinishedState");
var ArrayUtil = require("../../utils/ArrayUtil");
var inherits = require("inherits");
var PlaySpectator = require("./PlaySpectator");

/**
 * Play state.
 * @class PlayState
 */
function PlayState() {
	TournamentState.call(this);

	this.playSpectators = [];
	this.finishedUsers = [];

	this.tournamentTables = [];
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

	var backend = this.tournament.getBackend();
	var p = {
		tournamentId: this.tournament.getId()
	};
	backend.call("tournamentStart", p).then(
		this.onStartComplete.bind(this),
		this.onStartFailed.bind(this)
	);
}

/**
 * Start complete.
 * @method onStartComplete
 * @private
 */
PlayState.prototype.onStartComplete = function(c) {
	this.blindLevel = 0;
	this.enterLevel();

	for (var t = 0; t < this.tournamentTables.length; t++)
		this.tournamentTables[t].startGame();
}

/**
 * Enter the current blind level
 * @method enterLevel
 * @private
 */
PlayState.prototype.enterLevel = function() {

}

/**
 * Start failed.
 * @method onStartFailed
 */
PlayState.prototype.onStartFailed = function(errorMessage) {
	var finishedState = new FinishedState();
	finishedState.setCanceled("This tournament was canceled.\n\n" + errorMessage);
	this.tournament.setTournamentState(finishedState);
	this.moveConnectionsToState(finishedState);
}

/**
 * New connection in play state.
 * @method notifyNewConnection
 */
PlayState.prototype.notifyNewConnection = function(protoConnection, user) {
	var tableSeat = null;

	if (user)
		tableSeat = this.getTableSeatByUser(user);

	if (tableSeat) {
		if (tableSeat.getProtoConnection()) {
			throw new Error("multiple connection for same user, handle me");
		}

		tableSeat.setProtoConnection(protoConnection);
		tableSeat.getTable().sendState(protoConnection);
	} else {
		var playSpectator = new PlaySpectator(this, protoConnection, user);
		playSpectator.on(PlaySpectator.DONE, this.onPlaySpectatorDone, this);
		this.playSpectators.push(playSpectator);
	}
}

/**
 * Play spectator done.
 * @method onPlaySpectatorDone
 * @private
 */
PlayState.prototype.onPlaySpectatorDone = function(e) {
	var playSpectator = e.target;

	playSpectator.off(PlaySpectator.DONE, this.onPlaySpectatorDone, this);
	ArrayUtil.remove(this.playSpectators, playSpectator);
}

/**
 * Get table seat by user.
 * @method getTableSeatByUser
 */
PlayState.prototype.getTableSeatByUser = function(user) {
	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];
		tableSeat = tournamentTable.getTableSeatByUser(user);
		if (tableSeat)
			return tableSeat;
	}

	return null;
}

/**
 * Move connections to new state.
 * @method moveConnectionsToState
 */
PlayState.prototype.moveConnectionsToState = function(newState) {
	for (var i = 0; i < this.playSpectators.length; i++) {
		var playSpectator = this.playSpectators[i];
		var protoConnection = playSpectator.getProtoConnection();

		if (protoConnection)
			this.clearForFinish(protoConnection)

		playSpectator.off(PlaySpectator.DONE, this.onPlaySpectatorDone, this);
		playSpectator.setProtoConnection(null);

		if (protoConnection)
			newState.notifyNewConnection(protoConnection, playSpectator.getUser());
	}

	this.playSpectators = [];

	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];

		for (var s = 0; s < tournamentTable.getTableSeats().length; s++) {
			var tournamentTableSeat = tournamentTable.getTableSeatBySeatIndex(s);
			var protoConnection = tournamentTableSeat.getProtoConnection();

			if (protoConnection) {
				this.clearForFinish(protoConnection);
				tournamentTableSeat.setProtoConnection(null);
				newState.notifyNewConnection(protoConnection, tournamentTableSeat.getUser());
			}
		}
	}
}

/**
 * Clear table for finish.
 * @method clearForFinish
 */
PlayState.prototype.clearForFinish = function(protoConnection) {

}

/**
 * Are we idle?
 * @method isIdle
 */
PlayState.prototype.isIdle = function() {
	return false;
}

/**
 * Get current stake.
 * @method getCurrentStake
 */
PlayState.prototype.getCurrentStake = function() {
	return this.tournament.getBlindStructureForLevel(this.blindLevel).getStake();
}

/**
 * Get current ante.
 * @method getCurrentAnte
 */
PlayState.prototype.getCurrentAnte = function() {
	return this.tournament.getBlindStructureForLevel(this.blindLevel).getAnte();
}

/**
 * Close
 * @method close
 */
PlayState.prototype.close = function() {
	for (var t = 0; t < this.tournamentTables.length; t++)
		this.tournamentTables[t].close();
}

module.exports = PlayState;