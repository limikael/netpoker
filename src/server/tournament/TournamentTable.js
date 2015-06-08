/**
 * Server.
 * @module server
 */

var BaseTable = require("../table/BaseTable");
var inherits = require("inherits");
var TableUtil = require("../table/TableUtil");
var TournamentTableSeat = require("./TournamentTableSeat");
var ArrayUtil = require("../../utils/ArrayUtil");
var Game = require("../game/Game");
var Backend = require("../backend/Backend");
var HandInfoMessage = require("../../proto/messages/HandInfoMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var FadeTableMessage = require("../../proto/messages/FadeTableMessage");
var PlaySpectator = require("./PlaySpectator");

/**
 * Tournament table.
 * @class TournamentTable
 * @extends BaseTable
 */
function TournamentTable(playState, tableIndex) {
	this.playState = playState;
	this.tableIndex = tableIndex;
	this.tournament = playState.getTournament();
	this.active = true;

	var activeSeatIndices = TableUtil.getActiveSeatIndices(this.tournament.getSeatsPerTable());
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new TournamentTableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);
		this.tableSeats.push(ts);
	}

	BaseTable.call(this);
	this.playSpectators = [];
}

inherits(TournamentTable, BaseTable);

/**
 * Get table index.
 * @method getTableIndex
 */
TournamentTable.prototype.getTableIndex = function() {
	return this.tableIndex;
}

/**
 * Add play spectator.
 * @method addPlaySpectator
 */
TournamentTable.prototype.addPlaySpectator = function(ps) {
	this.playSpectators.push(ps);
}

/**
 * Remove play spectator.
 * @method removePlaySpectator
 */
TournamentTable.prototype.removePlaySpectator = function(ps) {
	console.log("removing...");

	ArrayUtil.remove(this.playSpectators, ps);
}

/**
 * Get number of seats used.
 * @method getNumSeatsUsed
 */
TournamentTable.prototype.getNumSeatsUsed = function() {
	var n = 0;

	for (var i = 0; i < this.tableSeats.length; i++) {
		var tournamentTableSeat = this.tableSeats[i];

		if (tournamentTableSeat.getUser())
			n++;
	}

	return n;
}

/**
 * Sit in user.
 * @method sitInUser
 */
TournamentTable.prototype.sitInUser = function(user, chips) {
	var available = [];

	for (var i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].isAvailable())
			available.push(this.tableSeats[i])

	if (!available.length)
		throw new Error("no available seat for user");

	ArrayUtil.shuffle(available);
	var tableSeat = available[0];

	tableSeat.sitInUser(user, chips);

	return tableSeat;
}

/**
 * Send state to connection.
 * @method sendState
 */
TournamentTable.prototype.sendState = function(protoConnection) {
	if (!protoConnection)
		return;

	console.log("send state for: " + this.tableIndex);

	for (i = 0; i < this.tableSeats.length; i++)
		protoConnection.send(this.tableSeats[i].getSeatInfoMessage());

	var b = new DealerButtonMessage(this.dealerButtonIndex);
	protoConnection.send(b);

	for (var i = 0; i < this.chatLines.length; i++)
		protoConnection.send(new ChatMessage(this.chatLines[i].user, this.chatLines[i].text));

	protoConnection.send(this.getHandInfoMessage());

	if (this.currentGame)
		this.currentGame.sendState(protoConnection);

	protoConnection.send(this.getTableButtonsMessage());
	protoConnection.send(new StateCompleteMessage());
}

/**
 * Get table buttons message.
 * @method getTableButtonsMessage
 */
TournamentTable.prototype.getTableButtonsMessage = function() {
	var m = this.playState.getTableButtonsMessage();
	m.setCurrentIndex(this.tableIndex);

	return m;
}

/**
 * Start game.
 * @method startGame
 */
TournamentTable.prototype.startGame = function() {
	if (this.currentGame)
		throw new Error("the is already a game");

	this.stake = this.playState.getCurrentStake();
	this.ante = this.playState.getCurrentAnte();

	this.currentGame = new Game(this);
	this.currentGame.on(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame.start();
}

/**
 * Clear seat.
 * @method clearSeat
 */
TournamentTable.prototype.clearSeat = function(tableSeat) {
	var connection = tableSeat.getProtoConnection();
	var user = tableSeat.getUser();

	this.playState.notifyUserFinished(user);

	if (connection) {
		var spectator = new PlaySpectator(this.playState, connection, user, this);
		this.playState.manageSpectator(spectator);
	}

	tableSeat.setProtoConnection(null);
	tableSeat.removeUser();

	this.send(tableSeat.getSeatInfoMessage());
}

/**
 * Game finished.
 * @method onGameFinished
 * @private
 */
TournamentTable.prototype.onCurrentGameFinished = function() {
	console.log("tournament game finished...");
	this.previousHandId = this.currentGame.getId();

	this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame = null;

	for (var t = 0; t < this.tableSeats.length; t++) {
		var tableSeat = this.tableSeats[t];

		if (tableSeat.isInGame() && !tableSeat.getChips())
			this.clearSeat(tableSeat);
	}

	if (this.playState.getTotalNumberOfPlayers() == 1) {
		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			if (tableSeat.isInGame())
				this.clearSeat(tableSeat);
		}

		this.playState.notifyComplete();
		return;
	}

	if (this.playState.getNumAvailableSeatsOnOther(this) >= this.getNumSeatsUsed()) {
		this.breakTable();
	} else if (this.getNumSeatsUsed() >= 2) {
		this.startGame();
	} else {
		console.log("********* player will have to wait...");
		this.dealerButtonIndex = -1;
		this.send(new DealerButtonMessage(this.dealerButtonIndex));
	}
}

/**
 * Break table.
 * @method breakTable
 */
TournamentTable.prototype.breakTable = function() {
	this.active = false;

	console.log("breaking table...");

	for (var t = 0; t < this.tableSeats.length; t++) {
		var tableSeat = this.tableSeats[t];

		if (tableSeat.getUser()) {
			var newTable = this.playState.getTableWithMostAvailableSeats();
			var dir;

			if (newTable.getTableIndex() > this.tableIndex)
				dir = FadeTableMessage.LEFT;

			if (newTable.getTableIndex() < this.tableIndex)
				dir = FadeTableMessage.RIGHT;

			tableSeat.send(new FadeTableMessage(false, dir));
			var newSeat = newTable.sitInUser(tableSeat.getUser(), tableSeat.getChips());
			newSeat.setProtoConnection(tableSeat.getProtoConnection());
			tableSeat.setProtoConnection(null);

			newTable.sendState(newSeat.getProtoConnection());
			newSeat.send(new FadeTableMessage(true, dir));
			newSeat.send(newSeat.getTableInfoMessage());
			newTable.send(newSeat.getSeatInfoMessage());

			tableSeat.removeUser();

			//start game on new table
			if (!newTable.getCurrentGame())
				newTable.startGame();
		}
	}

	var newTable = this.playState.getTableWithMostPlayers();
	var psCopy = ArrayUtil.copy(this.playSpectators);

	for (var i = 0; i < psCopy.length; i++)
		psCopy[i].changeToTable(newTable);

	if (this.playSpectators.length)
		throw new Error("the spectators were not removed");

	this.playState.sendTableButtonsMessages();
}

/**
 * Get parent id when reporting start game.
 * @method getStartGameParentId
 */
TournamentTable.prototype.getStartGameParentId = function() {
	return this.tournament.getId();
}

/**
 * Get function to call on game start.
 * @method getStartGameFunctionName
 */
TournamentTable.prototype.getStartGameFunctionName = function() {
	return Backend.START_TOURNAMENT_GAME;
}

/**
 * Get services.
 * @method getServices
 */
TournamentTable.prototype.getServices = function() {
	return this.tournament.getServices();
}

/**
 * Send a message to all connections.
 * @method send
 */
TournamentTable.prototype.send = function(message) {
	var i;

	for (i = 0; i < this.playSpectators.length; i++)
		this.playSpectators[i].send(message);

	for (i = 0; i < this.tableSeats.length; i++)
		this.tableSeats[i].send(message);
}

/**
 * Send a message to all connections.
 * @method send
 */
TournamentTable.prototype.sendExceptSeat = function(message, exceptTableSeat) {
	var i;

	for (i = 0; i < this.playSpectators.length; i++)
		this.playSpectators[i].send(message);

	for (i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i] != exceptTableSeat)
			this.tableSeats[i].send(message);
}

/**
 * Get hand info message.
 * @method getHandInfoMessage
 */
TournamentTable.prototype.getHandInfoMessage = function() {
	var s = "";

	s += "Tournament: #" + this.tournament.getId() + "\n";

	if (this.currentGame && this.currentGame.getId())
		s += "Current Hand: #" + this.currentGame.getId() + "\n";

	if (this.previousHandId != null)
		s += "Previous Hand: #" + this.previousHandId + "\n";

	//trace("ps: "+playState);

	/*s += "\n";
	s += "Blinds: " + playState.getCurrentStake() / 2 + "/" + playState.getCurrentStake() + "\n";

	if (playState.getCurrentAnte() > 0)
		s += "Ante: " + playState.getCurrentAnte() + "\n";

	var t: Int = playState.getTimeUntilNextLevel();
	if (t >= 0) {
		hm.countdown = t;
		s += "Next Level: %t";
	}*/

	return new HandInfoMessage(s);
}

/**
 * Get stake.
 * @method getStake
 */
TournamentTable.prototype.getStake = function() {
	return this.stake;
}

/**
 * Close.
 * @method close
 */
TournamentTable.prototype.close = function() {
	if (this.currentGame) {
		this.currentGame.close();
		this.currentGame = null;
	}
}

/**
 * Table info messages are not used for tournaments.
 * @method sendTableInfoMessages
 */
TournamentTable.prototype.sendTableInfoMessages = function() {

}

/**
 * Rake doesn't apply to tournament tables.
 * @method getRakePercent
 */
TournamentTable.prototype.getRakePercent = function() {
	return 0;
}

/**
 * Get hand finish delay.
 * @method getHandFinishDelay
 */
TournamentTable.prototype.getHandFinishDelay = function() {
	return this.tournament.getHandFinishDelay();
}

/**
 * Is tihs table active in the tournament?
 * @method isActive
 */
TournamentTable.prototype.isActive = function() {
	return this.active;
}

module.exports = TournamentTable;