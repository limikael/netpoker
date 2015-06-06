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

/**
 * Tournament table.
 * @class TournamentTable
 * @extends BaseTable
 */
function TournamentTable(playState, tableIndex) {
	this.playState = playState;
	this.tableIndex = tableIndex;
	this.tournament = playState.getTournament();

	var activeSeatIndices = TableUtil.getActiveSeatIndices(this.tournament.getSeatsPerTable());
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new TournamentTableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);
		this.tableSeats.push(ts);
	}

	BaseTable.call(this);
}

inherits(TournamentTable, BaseTable);

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

	for (i = 0; i < this.tableSeats.length; i++)
		protoConnection.send(this.tableSeats[i].getSeatInfoMessage());

	var b = new DealerButtonMessage(this.dealerButtonIndex);
	protoConnection.send(b);

	for (var i = 0; i < this.chatLines.length; i++)
		protoConnection.send(new ChatMessage(this.chatLines[i].user, this.chatLines[i].text));

	protoConnection.send(this.getHandInfoMessage());

	if (this.currentGame)
		this.currentGame.sendState(protoConnection);

	/*var m=playState.getTableButtonsMessage();
	m.setCurrentIndex(this.tableIndex);
	protoConnection.send(m);*/

	protoConnection.send(new StateCompleteMessage());
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
 * Game finished.
 * @method onGameFinished
 * @private
 */
TournamentTable.prototype.onCurrentGameFinished = function() {
	console.log("tournament game finished...");
	this.previousHandId = this.currentGame.getId();

	this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame = null;

	this.startGame();
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
	return Backend.START_CASH_GAME;
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

	/*for (i = 0; i < this.tableSpectators.length; i++)
		this.tableSpectators[i].send(message);*/

	for (i = 0; i < this.tableSeats.length; i++)
		this.tableSeats[i].send(message);
}

/**
 * Send a message to all connections.
 * @method send
 */
TournamentTable.prototype.sendExceptSeat = function(message, exceptTableSeat) {
	var i;

	/*for (i = 0; i < this.tableSpectators.length; i++)
		this.tableSpectators[i].send(message);*/

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

module.exports = TournamentTable;