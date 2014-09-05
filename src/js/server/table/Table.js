var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTable = require("./BaseTable");
var TableUtil = require("./TableUtil");
var TableSeat = require("./TableSeat");
var TableSpectator = require("./TableSpectator");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
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
 */
Table.prototype.onTableSeatClose = function(e) {
	if (this.currentGame)
		return;

	e.target.leaveTable();
}

/**
 * Table seat ready.
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
	protoConnection.send(new StateCompleteMessage());
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
 */
Table.prototype.getCurrency = function() {
	return this.currency;
}

/**
 * Get services.
 */
Table.prototype.getServices = function() {
	return this.services;
}

/**
 * Get table name.
 */
Table.prototype.getName = function() {
	return this.name;
}

/**
 * Get table name.
 */
Table.prototype.getMinSitInAmount = function() {
	return this.minSitInAmount;
}

/**
 * Get table name.
 */
Table.prototype.getMaxSitInAmount = function() {
	return this.maxSitInAmount;
}

/**
 * Start the game.
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
 */
Table.prototype.onCurrentGameFinished = function() {
	this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame=null;

	if (this.stopped)
		return;

	if (this.getNumInGame())
		this.startGame();
}

/**
 * Get current game for this table.
 */
Table.prototype.getCurrentGame = function() {
	return this.currentGame;
}

/**
 * Get parent id.
 */
Table.prototype.getStartGameParentId = function() {
	return this.id;
}

/**
 * Get function to call on game start.
 */
Table.prototype.getStartGameFunctionName = function() {
	return Backend.START_CASH_GAME;
}

/**
 * Get stake.
 */
Table.prototype.getStake = function() {
	return this.stake;
}

/**
 * Stop.
 */
Table.prototype.stop=function() {
	this.stopped=true;
}

/**
 * Send.
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
 */
Table.prototype.toString=function() {
	return "[Table id="+this.id+"]";
}

module.exports = Table;