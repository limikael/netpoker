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
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var ClearMessage = require("../../proto/messages/ClearMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var HandInfoMessage = require("../../proto/messages/HandInfoMessage");
var InterfaceStateMessage = require("../../proto/messages/InterfaceStateMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");

/**
 * Play state.
 * @class PlayState
 */
function PlayState() {
	TournamentState.call(this);

	this.playSpectators = [];
	this.finishedUsers = [];

	this.tournamentTables = [];
	this.blindLevel = 0;
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
 * @todo FIX ME!!!
 */
PlayState.prototype.enterLevel = function() {
	if (this.blindLevel === undefined)
		throw new Error("blind level is undefined");

	var s =
		"==== Level " + (this.blindLevel + 1) + ": " +
		"Blinds: " + (this.getCurrentStake() / 2) + "/" + this.getCurrentStake() + " " +
		"Ante: " + this.getCurrentAnte() + " " +
		"====";

	for (var t = 0; t < this.tournamentTables.length; t++)
		this.tournamentTables[t].rawChat(null, s);

	if (this.blindLevel < this.tournament.getNumBlindLevels() - 1) {
		//var t = new Date().getTime();
		var t = Date.now();
		var blindStrunctureData = this.tournament.getBlindStructureForLevel(this.blindLevel);
		this.blindChangeTime = t + blindStrunctureData.getTime() * 1000;

		this.blindTimeout = setTimeout(this.onBlindTimeout.bind(this), blindStrunctureData.getTime() * 1000);
	} else {
		this.blindChangeTime = 0;
	}

	this.sendHandInfoText();
}

/**
 * Get time until next level in secs.
 * @method getTimeUntilNextLevel
 */
PlayState.prototype.getTimeUntilNextLevel = function() {
	if (!this.blindChangeTime)
		return -1;

	var t = Date.now();
	var millis = this.blindChangeTime - t;
	var secs = Math.round(millis / 1000);
	if (secs < 0)
		secs = 0;

	return secs;
}

/**
 * Blind timoeut.
 * @method onBlindTimeout
 * @private
 */
PlayState.prototype.onBlindTimeout = function() {
	this.blindTimeout = null;

	this.blindLevel++;
	this.enterLevel();
}

/**
 * Send hand info text on all tables.
 * @method sendHandInfoText
 */
PlayState.prototype.sendHandInfoText = function() {
	for (var t = 0; t < this.tournamentTables.length; t++)
		this.tournamentTables[t].send(this.tournamentTables[t].getHandInfoMessage());
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
			var oldConnection = tableSeat.getProtoConnection()
			tableSeat.setProtoConnection(null);

			var playSpectator = new PlaySpectator(this, oldConnection, user, tableSeat.getTable());
			this.manageSpectator(playSpectator);
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

	var place = -1;

	for (var i = 0; i < this.finishedUsers.length; i++)
		if (this.finishedUsers[i].getId() == user.getId())
			place = i;

	if (place < 0)
		return place;

	place += this.tournament.getNumRegistrations() - this.finishedUsers.length;

	return place + 1;
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
PlayState.prototype.clearForFinish = function(c) {
	for (var i = 0; i < 10; i++) {
		var m = new SeatInfoMessage(i);
		m.setActive(false);
		c.send(m);
	}

	c.send(new ClearMessage([ClearMessage.BETS, ClearMessage.POT, ClearMessage.CARDS, ClearMessage.CHAT]));
	c.send(new TableInfoMessage());
	c.send(new TableButtonsMessage());
	c.send(new HandInfoMessage());
	c.send(new InterfaceStateMessage([]));
	c.send(new DealerButtonMessage(-1));
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

	if (this.blindTimeout) {
		clearTimeout(this.blindTimeout);
		this.blindTimeout = null;
	}
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
	if (this.blindTimeout) {
		clearTimeout(this.blindTimeout);
		this.blindTimeout = null;
	}

	if (this.finishedUsers.length != this.tournament.getNumRegistrations())
		throw new Error("lost a user during tournament");

	var finishedState = new FinishedState();
	finishedState.setFinishOrder(this.finishedUsers);
	this.tournament.setTournamentState(finishedState);
	this.moveConnectionsToState(finishedState);
}

/**
 * Get table buttons message.
 * @method getTableButtonsMessage
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

/**
 * Get tournament table by index.
 * @method getTournamentTableAt
 */
PlayState.prototype.getTournamentTableAt = function(index) {
	return this.tournamentTables[index];
}

/**
 * Send table button messages.
 * @method sendTableButtonsMessages
 */
PlayState.prototype.sendTableButtonsMessages = function() {
	for (var t = 0; t < this.tournamentTables.length; t++) {
		var tournamentTable = this.tournamentTables[t];
		tournamentTable.send(tournamentTable.getTableButtonsMessage());
	}
}

module.exports = PlayState;