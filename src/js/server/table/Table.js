var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTable = require("./BaseTable");
var TableUtil = require("./TableUtil");
var TableSeat = require("./TableSeat");
var TableSpectator = require("./TableSpectator");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var ProtoConnection = require("../../proto/ProtoConnection");
var ArrayUtil = require("../../utils/ArrayUtil");
var Game = require("../game/Game");
var Backend = require("../backend/Backend");

/**
 * Cash game table.
 * @class Table
 */
function Table(services, config) {
	if (!config.numseats ||
		!config.id ||
		!config.currency ||
		!config.name ||
		!config.minSitInAmount ||
		!config.maxSitInAmount ||
		!config.stake)
		throw new Error("Bad table config");

	this.name = config.name;
	this.id = config.id;
	this.currency = config.currency;
	this.stake = config.stake;
	this.minSitInAmount = config.minSitInAmount;
	this.maxSitInAmount = config.maxSitInAmount;

	this.setupSeats(config.numseats);

	BaseTable.call(this);

	this.tableSpectators = [];
	this.services = services;

	this.currentGame = null;
	this.stopped = false;
}

FunctionUtil.extend(Table, BaseTable);

/**
 * Setup seats.
 * @method setupSeats
 * @private
 */
Table.prototype.setupSeats = function(numseats) {
	var activeSeatIndices = TableUtil.getActiveSeatIndices(numseats);
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new TableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);

		ts.on(ProtoConnection.CLOSE, this.onTableSeatClose, this);
		ts.on(TableSeat.READY, this.onTableSeatReady, this);

		this.tableSeats.push(ts);
	}
}

/**
 * Table seat close.
 * @method onTableSeatClose
 */
Table.prototype.onTableSeatClose = function(e) {
	if (this.currentGame)
		return;

	e.target.leaveTable();
}

/**
 * Table seat ready.
 * @method onTableSeatReady
 */
Table.prototype.onTableSeatReady = function() {
	if (!this.currentGame && this.getNumInGame() >= 2 && !this.stopped)
		this.startGame();
}

/**
 * New connection.
 * @method notifyNewConnection
 */
Table.prototype.notifyNewConnection = function(protoConnection, user) {
	var ts = new TableSpectator(this, protoConnection, user);
	ts.on(TableSpectator.DONE, this.onTableSpectatorDone, this);

	this.tableSpectators.push(ts);

	this.sendState(protoConnection);
}

/**
 * Table spectator done.
 * @method  onTableSpectatorDone
 */
Table.prototype.onTableSpectatorDone = function(e) {
	var tableSpectator = e.target;

	ArrayUtil.remove(this.tableSpectators, tableSpectator);
	tableSpectator.off(TableSpectator.DONE, this.onTableSpectatorDone, this);
}

/** 
 * Send state.
 * @method sendState
 */
Table.prototype.sendState = function(protoConnection) {
	var i;

	for (i = 0; i < this.tableSeats.length; i++)
		protoConnection.send(this.tableSeats[i].getSeatInfoMessage());

	protoConnection.send(new StateCompleteMessage());

	/*var b: DealerButtonMessage = new DealerButtonMessage(dealerButtonIndex);
	c.send(b);*/

	for (var i = 0; i < this.chatLines.length; i++)
		protoConnection.send(new ChatMessage(this.chatLines[i].user, this.chatLines[i].text));

	//c.send(getHandInfoMessage());

	if (this.currentGame != null)
		this.currentGame.sendState(protoConnection);
}

/**
 * Get id.
 * @method getId
 */
Table.prototype.getId = function() {
	return this.id;
}

/**
 * Is user seated?
 * @method isUserSeated
 */
Table.prototype.isUserSeated = function(user) {
	for (i = 0; i < this.tableSeats.length; i++) {
		var tableSeat = this.tableSeats[i];
		if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId())
			return true;
	}

	return false;
}

/**
 * Get currency.
 * @method getCurrency
 */
Table.prototype.getCurrency = function() {
	return this.currency;
}

/**
 * Get services.
 * @method getServices
 */
Table.prototype.getServices = function() {
	return this.services;
}

/**
 * Get table name.
 * @method getName
 */
Table.prototype.getName = function() {
	return this.name;
}

/**
 * Get table name.
 * @method getMinSitInAmount
 */
Table.prototype.getMinSitInAmount = function() {
	return this.minSitInAmount;
}

/**
 * Get table name.
 * @method getMaxSitInAmount
 */
Table.prototype.getMaxSitInAmount = function() {
	return this.maxSitInAmount;
}

/**
 * Start the game.
 * @method startGame
 */
Table.prototype.startGame = function() {
	if (this.currentGame)
		throw "There is already a game started";

	this.currentGame = new Game(this);
	this.currentGame.on(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame.start();
}

/**
 * Current game finished.
 * @method onCurrentGameFinished
 */
Table.prototype.onCurrentGameFinished = function() {
	this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame = null;

	if (this.stopped)
		return;

	if (this.getNumInGame())
		this.startGame();
}

/**
 * Get current game for this table.
 * @method getCurrentGame
 */
Table.prototype.getCurrentGame = function() {
	return this.currentGame;
}

/**
 * Get parent id.
 * @method getStartGameParentId
 */
Table.prototype.getStartGameParentId = function() {
	return this.id;
}

/**
 * Get function to call on game start.
 * @method getStartGameFunctionName
 */
Table.prototype.getStartGameFunctionName = function() {
	return Backend.START_CASH_GAME;
}

/**
 * Get stake.
 * @method getStake
 */
Table.prototype.getStake = function() {
	return this.stake;
}

/**
 * Stop.
 * @method stop
 */
Table.prototype.stop = function() {
	this.stopped = true;
}

/**
 * Send a message to all connections on the table.
 * @method send
 */
Table.prototype.send = function(m) {
	var i;

	for (i = 0; i < this.tableSpectators.length; i++)
		this.tableSpectators[i].send(m);

	for (i = 0; i < this.tableSeats.length; i++)
		this.tableSeats[i].send(m);
}

/**
 * To string.
 * @method toString
 */
Table.prototype.toString = function() {
	return "[Table id=" + this.id + "]";
}

/**
 * Hard close.
 * @method stop
 */
Table.prototype.close = function() {
	console.log("------------ hard close table, game=" + this.currentGame);
	if (this.currentGame) {
		this.currentGame.close();
		this.currentGame = null;
	}
}

module.exports = Table;