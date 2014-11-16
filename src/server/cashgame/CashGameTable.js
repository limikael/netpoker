/**
 * Server.
 * @module server
 */

var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("yaed");
var BaseTable = require("../table/BaseTable");
var TableUtil = require("../table/TableUtil");
var CashGameTableSeat = require("./CashGameTableSeat");
var CashGameSpectator = require("./CashGameSpectator");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var HandInfoMessage = require("../../proto/messages/HandInfoMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");
var ProtoConnection = require("../../proto/ProtoConnection");
var ArrayUtil = require("../../utils/ArrayUtil");
var Game = require("../game/Game");
var Backend = require("../backend/Backend");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");

/**
 * Cash game table.
 * @class CashGameTable
 * @extends BaseTable
 */
function CashGameTable(services, config) {
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
	this.stake = parseFloat(config.stake);
	this.minSitInAmount = parseFloat(config.minSitInAmount);
	this.maxSitInAmount = parseFloat(config.maxSitInAmount);

	if (config.rakePercent)
		this.rakePercent = parseFloat(config.rakePercent);

	else
		this.rakePercent = 0;

	this.setupSeats(parseInt(config.numseats));

	BaseTable.call(this);

	this.tableSpectators = [];
	this.services = services;

	this.currentGame = null;
	this.stopped = false;

	this.previousHandId = null;
}

FunctionUtil.extend(CashGameTable, BaseTable);

/**
 * Dispatched when stop has been called, and the table has become idle.
 * @event CashGameTable.IDLE
 */
CashGameTable.IDLE = "idle";

/**
 * Dispatched when the number of players have changed.
 * @event CashGameTable.IDLE
 */
CashGameTable.NUM_PLAYERS_CHANGE = "numPlayersChange";

/**
 * Full?
 * @method isFull
 */
CashGameTable.prototype.isFull = function() {
	for (var i = 0; i < this.tableSeats.length; i++) {
		if (this.tableSeats[i].isAvailable())
			return false;
	}

	return true;
}

/**
 * Setup seats.
 * @method setupSeats
 * @private
 */
CashGameTable.prototype.setupSeats = function(numseats) {
	var activeSeatIndices = TableUtil.getActiveSeatIndices(numseats);
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new CashGameTableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);

		ts.on(ProtoConnection.CLOSE, this.onTableSeatClose, this);
		ts.on(CashGameTableSeat.READY, this.onTableSeatReady, this);
		ts.on(CashGameTableSeat.IDLE, this.onTableSeatIdle, this);

		this.tableSeats.push(ts);
	}
}

/**
 * Table seat close.
 * If there is no game in progress, make the user leave the table.
 * @method onTableSeatClose
 */
CashGameTable.prototype.onTableSeatClose = function(e) {
	if (this.currentGame)
		return;

	e.target.leaveTable();
}

/**
 * Table seat ready.
 * @method onTableSeatReady
 */
CashGameTable.prototype.onTableSeatReady = function() {
	this.trigger(CashGameTable.NUM_PLAYERS_CHANGE);

	if (!this.currentGame && this.getNumInGame() >= 2 && !this.stopped)
		this.startGame();
}

/**
 * Table seat became idle.
 * @method onTableSeatIdle
 */
CashGameTable.prototype.onTableSeatIdle = function() {
	if (this.isIdle())
		this.trigger({
			type: CashGameTable.IDLE
		});

	this.trigger(CashGameTable.NUM_PLAYERS_CHANGE);
}

/**
 * New connection.
 * @method notifyNewConnection
 */
CashGameTable.prototype.notifyNewConnection = function(protoConnection, user) {
	var alreadySeated = false;

	if (user) {
		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId()) {
				if (tableSeat.getProtoConnection()) {
					console.log("**** re seating...");

					var ts = new CashGameSpectator(this, tableSeat.getProtoConnection(), user);
					ts.on(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
					this.tableSpectators.push(ts);
				}

				tableSeat.setProtoConnection(protoConnection);
				alreadySeated = true;
			}
		}
	}

	if (!alreadySeated) {
		var ts = new CashGameSpectator(this, protoConnection, user);
		ts.on(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
		this.tableSpectators.push(ts);
	}

	this.sendState(protoConnection);
}

/**
 * Table spectator done.
 * @method  onTableSpectatorDone
 */
CashGameTable.prototype.onTableSpectatorDone = function(e) {
	var tableSpectator = e.target;

	ArrayUtil.remove(this.tableSpectators, tableSpectator);
	tableSpectator.off(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
}

/** 
 * Send state.
 * @method sendState
 */
CashGameTable.prototype.sendState = function(protoConnection) {
	var i;

	for (i = 0; i < this.tableSeats.length; i++)
		protoConnection.send(this.tableSeats[i].getSeatInfoMessage());

	protoConnection.send(new StateCompleteMessage());

	var b = new DealerButtonMessage(this.dealerButtonIndex);
	protoConnection.send(b);

	for (var i = 0; i < this.chatLines.length; i++)
		protoConnection.send(new ChatMessage(this.chatLines[i].user, this.chatLines[i].text));

	protoConnection.send(this.getHandInfoMessage());

	if (this.currentGame != null)
		this.currentGame.sendState(protoConnection);
}

/**
 * Get id.
 * @method getId
 */
CashGameTable.prototype.getId = function() {
	return this.id;
}

/**
 * Is user seated?
 * @method isUserSeated
 */
CashGameTable.prototype.isUserSeated = function(user) {
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
CashGameTable.prototype.getCurrency = function() {
	return this.currency;
}

/**
 * Get services.
 * @method getServices
 */
CashGameTable.prototype.getServices = function() {
	return this.services;
}

/**
 * Get table name.
 * @method getName
 */
CashGameTable.prototype.getName = function() {
	return this.name;
}

/**
 * Get table name.
 * @method getMinSitInAmount
 */
CashGameTable.prototype.getMinSitInAmount = function() {
	return this.minSitInAmount;
}

/**
 * Get table name.
 * @method getMaxSitInAmount
 */
CashGameTable.prototype.getMaxSitInAmount = function() {
	return this.maxSitInAmount;
}

/**
 * Start the game.
 * @method startGame
 */
CashGameTable.prototype.startGame = function() {
	if (this.currentGame)
		throw "There is already a game started";

	this.currentGame = new Game(this);

	if (this.fixedDeck)
		this.currentGame.useFixedDeck(this.fixedDeck);

	this.currentGame.on(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame.start();

	this.sendTableInfoMessages();
}

/**
 * Current game finished.
 * @method onCurrentGameFinished
 */
CashGameTable.prototype.onCurrentGameFinished = function() {
	if (this.currentGame.getId())
		this.previousHandId = this.currentGame.getId();

	this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
	this.currentGame = null;

	for (var t = 0; t < this.tableSeats.length; t++) {
		var tableSeat = this.tableSeats[t];

		// actualize rebuys here!

		if (tableSeat.isInGame()) {
			if (!tableSeat.getProtoConnection())
				tableSeat.leaveTable();

			else if (!tableSeat.getChips())
				tableSeat.leaveTable();

			else if (tableSeat.getSetting(CheckboxMessage.SITOUT_NEXT))
				tableSeat.sitout();
		}
	}

	this.send(this.getHandInfoMessage());

	if (this.stopped) {
		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			tableSeat.leaveTable();
		}

		return;
	}

	if (this.getNumInGame() >= 2)
		this.startGame();

	else {
		this.dealerButtonIndex = -1;
		this.send(new DealerButtonMessage(this.dealerButtonIndex));

		this.sendTableInfoMessages();
	}
}

/**
 * Get current game for this table.
 * @method getCurrentGame
 */
CashGameTable.prototype.getCurrentGame = function() {
	return this.currentGame;
}

/**
 * Get parent id.
 * @method getStartGameParentId
 */
CashGameTable.prototype.getStartGameParentId = function() {
	return this.id;
}

/**
 * Send TableInfoMessages to all seats.
 * @method sendTableInfoMessages
 */
CashGameTable.prototype.sendTableInfoMessages = function() {
	console.log("******* sending table info messages");

	var i;

	for (i = 0; i < this.tableSpectators.length; i++) {
		var tableSpectator = this.tableSpectators[i];

		tableSpectator.send(tableSpectator.getTableInfoMessage());
	}

	for (i = 0; i < this.tableSeats.length; i++) {
		var tableSeat = this.tableSeats[i];

		tableSeat.send(tableSeat.getTableInfoMessage());
	}
}

/**
 * Get function to call on game start.
 * @method getStartGameFunctionName
 */
CashGameTable.prototype.getStartGameFunctionName = function() {
	return Backend.START_CASH_GAME;
}

/**
 * Get stake.
 * @method getStake
 */
CashGameTable.prototype.getStake = function() {
	return this.stake;
}

/**
 * Send a message to all connections on the table.
 * @method send
 */
CashGameTable.prototype.send = function(message) {
	var i;

	for (i = 0; i < this.tableSpectators.length; i++)
		this.tableSpectators[i].send(message);

	for (i = 0; i < this.tableSeats.length; i++)
		this.tableSeats[i].send(message);
}

/**
 * Send message to all connections except specified seat.
 * @method sendExceptSeat
 */
CashGameTable.prototype.sendExceptSeat = function(message, except) {
	var i;

	for (i = 0; i < this.tableSpectators.length; i++)
		this.tableSpectators[i].send(message);

	for (i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i] != except)
			this.tableSeats[i].send(message);
}

/**
 * To string.
 * @method toString
 */
CashGameTable.prototype.toString = function() {
	return "[Table id=" + this.id + "]";
}

/**
 * Stop.
 * @method stop
 */
CashGameTable.prototype.stop = function() {
	this.stopped = true;

	if (!this.currentGame)
		for (i = 0; i < this.tableSeats.length; i++)
			this.tableSeats[i].leaveTable();
}

/**
 * Hard close.
 * This should only be used after the table has been cleanly
 * stopped and has become idle.
 * @method close
 */
CashGameTable.prototype.close = function() {
	if (!this.isIdle())
		console.log("warning: closing non idle table");

	//console.log("------------ hard close table, game=" + this.currentGame);
	if (this.currentGame) {
		this.currentGame.close();
		this.currentGame = null;
	}

	for (var i = 0; i < this.tableSpectators.length; i++) {
		var tableSpectator = this.tableSpectators[i];

		tableSpectator.off(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
		tableSpectator.close();
	}

	this.tableSpectators = [];
}

/**
 * Is this table idle? I.e. no game running and no users seated.
 * @method isIdle
 */
CashGameTable.prototype.isIdle = function() {
	if (this.currentGame)
		return false;

	for (i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].getUser())
			return false;

	return true;
}

/**
 * Get rake percent.
 * @method getRakePercent
 */
CashGameTable.prototype.getRakePercent = function() {
	return this.rakePercent;
}

/**
 * Get hand info message.
 * @method getHandInfoMessage
 */
CashGameTable.prototype.getHandInfoMessage = function() {
	var s = "";

	if (this.currentGame && this.currentGame.getId())
		s += "Current Hand: #" + this.currentGame.getId() + "\n";

	if (this.previousHandId)
		s += "Previous Hand: #" + this.previousHandId;

	return new HandInfoMessage(s);
}

/**
 * Is this table stopped?
 * @method isStopped
 */
CashGameTable.prototype.isStopped = function() {
	return this.stopped;
}

module.exports = CashGameTable;