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
var TableButtonsMessage = require("../../proto/messages/TableButtonsMessage");

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

	/*console.log("******* numTables: " + numTables);
	console.log("******* pertable: " + this.tournament.getSeatsPerTable());*/

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
 * A user finished.
 * @method notifyUserFinished
 */
PlayState.prototype.notifyUserFinished = function(user) {
	console.log("********* user finished: " + user.getName());
	this.finishedUsers.unshift(user);
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
		this.manageSpectator(playSpectator);
	}
}

/**
 * Get finish place for user.
 * @method getUserFinishPlace
 */
PlayState.prototype.getUserFinishPlace = function(user) {
	if (!user)
		return -1;

	for (var i = 0; i < this.finishedUsers.length; i++)
		if (this.finishedUsers[i].getId() == user.getId())
			return i;

	return -1;
}

/**
 * Manage a spectator.
 * @method manageSpectator
 */
PlayState.prototype.manageSpectator = function(playSpectator) {
	if (this.playSpectators.indexOf(playSpectator) >= 0)
		throw new Error("this spectator is already managed");

	playSpectator.on(PlaySpectator.DONE, this.onPlaySpectatorDone, this);
	this.playSpectators.push(playSpectator);
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

/**
 * Number of seats available on other tables.
 * @method getNumAvailableSeatsOnOther
 */
PlayState.prototype.getNumAvailableSeatsOnOther = function(thisTable) {
	var available = 0;

	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];

		if (tournamentTable.isActive() && tournamentTable != thisTable)
			available += tournamentTable.getNumAvailableSeats();
	}

	return available;
}

/**
 * Get table that has most seats available.
 * @method getTableWithMostAvailableSeats
 */
PlayState.prototype.getTableWithMostAvailableSeats = function() {
	var cand = null;

	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];

		if (tournamentTable.isActive() &&
			(!cand || tournamentTable.getNumAvailableSeats() > cand.getNumAvailableSeats()))
			cand = tournamentTable;
	}

	return cand;
}

/**
 * Get table that has the most players.
 * @method getTableWithMostPlayers
 */
PlayState.prototype.getTableWithMostPlayers = function() {
	var cand = null;

	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];

		if (tournamentTable.isActive() &&
			(!cand || tournamentTable.getNumInGame() > cand.getNumInGame()))
			cand = tournamentTable;
	}

	return cand;
}

/**
 * Get total number of players still in the game.
 * @method getTotalNumberOfPlayers
 */
PlayState.prototype.getTotalNumberOfPlayers = function() {
	var used = 0;

	for (var t = 0; t < this.tournamentTables.length; t++)
		used += this.tournamentTables[t].getNumInGame();

	return used;
}

/**
 * Tournament complete.
 * @method notifyComplete
 */
PlayState.prototype.notifyComplete = function() {
	// handle blind timer!!!

	if (this.finishedUsers.length != this.tournament.getNumRegistrations())
		throw new Error("lost a user during tournament");

	var finishedState = new FinishedState();
	finishedState.setFinishOrder(this.finishedUsers);
	this.tournament.setTournamentState(finishedState);
	this.moveConnectionsToState(finishedState);
}

/**
 * Get table buttons message.
 */
PlayState.prototype.getTableButtonsMessage = function() {
	var m = new TableButtonsMessage();
	var enabled = [];

	for (var t = 0; t < this.tournamentTables.length; t++)
		enabled.push(this.tournamentTables[t].isActive());

	m.setEnabled(enabled);

	console.log(m);

	//m.infoLink = "%u/tournament/info/" + tournament.id;

	return m;
}


module.exports = PlayState;