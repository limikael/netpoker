var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
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
	this.stake = config.stake;
	this.minSitInAmount = config.minSitInAmount;
	this.maxSitInAmount = config.maxSitInAmount;

	if (config.rakePercent)
		this.rakePercent = config.rakePercent;

	else
		this.rakePercent = 0;

	this.setupSeats(config.numseats);

	BaseTable.call(this);

	this.tableSpectators = [];
	this.services = services;

	this.currentGame = null;
	this.stopped = false;

	this.previousHandId = null;
}

FunctionUtil.extend(CashGameTable, BaseTable);

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

		this.tableSeats.push(ts);
	}
}

/**
 * Table seat close.
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
	if (!this.currentGame && this.getNumInGame() >= 2 && !this.stopped)
		this.startGame();
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

	if (this.stopped)
		return;

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
 * Stop.
 * @method stop
 */
CashGameTable.prototype.stop = function() {
	this.stopped = true;
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
 * Hard close.
 * @method stop
 */
CashGameTable.prototype.close = function() {
	console.log("------------ hard close table, game=" + this.currentGame);
	if (this.currentGame) {
		this.currentGame.close();
		this.currentGame = null;
	}
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

module.exports = CashGameTable;