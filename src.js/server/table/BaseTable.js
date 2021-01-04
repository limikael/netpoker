/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var ChatMessage = require("../../proto/messages/ChatMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");
var inherits = require("inherits");

/**
 * Base class for cash game and tournament tables.
 * @class BaseTable
 * @extends EventDispatcher
 */
function BaseTable() {
	EventDispatcher.call(this);

	if (!this.tableSeats)
		throw new Error("table seats needs to be set up for BaseTable");

	this.chatLines = new Array();

	this.dealerButtonIndex = -1;
	this.fixedDeck = null;
}

inherits(BaseTable, EventDispatcher);

/**
 * Get ante.
 * @method getAnte
 */
BaseTable.prototype.getAnte = function() {
	return 0;
}

/**
 * Use fixed deck for debugging.
 * @method useFixedDeck
 */
BaseTable.prototype.useFixedDeck = function(deck) {
	this.fixedDeck = deck;
}

/**
 * Get table seats.
 * @method getTableSeats
 */
BaseTable.prototype.getTableSeats = function() {
	return this.tableSeats;
}

/**
 * Get table seat by seat index.
 * @method getTableSeatBySeatIndex
 */
BaseTable.prototype.getTableSeatBySeatIndex = function(seatIndex) {
	return this.tableSeats[seatIndex];
}

/**
 * Get the TableSeat that this protoConnection is currently controllig,
 * if any.
 * @method getTableSeatByConnection
 */
BaseTable.prototype.getTableSeatByProtoConnection = function(protoConnection) {
	if (!protoConnection)
		throw new Error("Can't get by null connection");

	for (var i = 0; i < this.tableSeats.length; i++) {
		var tableSeat = this.tableSeats[i];

		if (tableSeat.getProtoConnection() == protoConnection)
			return tableSeat;
	}

	return null;
}

/**
 * Get number of seats that is in game.
 * @method getNumInGame
 */
BaseTable.prototype.getNumInGame = function() {
	var cnt = 0;

	for (var i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].isInGame())
			cnt++;

	return cnt;
}

/**
 * Get number of active seats.
 * @method getNumSeats
 */
BaseTable.prototype.getNumSeats = function() {
	var cnt = 0;

	for (var i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].isActive())
			cnt++;

	return cnt;
}

/**
 * Get number of available seats.
 * @method getNumAvailableSeats
 */
BaseTable.prototype.getNumAvailableSeats = function() {
	var available = 0;

	for (var t = 0; t < this.tableSeats.length; t++) {
		var tableSeat = this.tableSeats[t];

		if (tableSeat.isActive() && !tableSeat.getUser())
			available++;
	}

	return available;
}

/**
 * Get parent id. This id is what should be used for the
 * start game call for backend. For cashgames, this will
 * represent the table id, for tournamets, it will
 * represent the tournament id.
 * @method getStartGameParentId
 */
BaseTable.prototype.getStartGameParentId = function() {
	throw new Error("abstract");
}

/**
 * Get start function.
 * @method getStartGameFunctionName
 */
BaseTable.prototype.getStartGameFunctionName = function() {
	throw new Error("abstract");
}

/**
 * Get the index of the seat that has seated player, that
 * comes after the from index. This function wraps around
 * the table clockwise. If no player is seated at all,
 * -1 will be returned.
 * @method getNextSeatIndexInGame
 */
BaseTable.prototype.getNextSeatIndexInGame = function(from) {
	var cand = from + 1;
	var i = 0;

	if (cand >= 10)
		cand = 0;

	while (!this.tableSeats[cand].isInGame()) {
		cand++;
		if (cand >= 10)
			cand = 0;

		i++;
		if (i > 10)
			return -1;
	}

	return cand;
}

/**
 * Send chat.
 * @method chat
 */
BaseTable.prototype.chat = function(user, message) {
	var nick;
	var string;
	if (user != null)
		nick = user.name;
	else
		nick = "Dealer";
	/*
	if((user == null) || (message == null)) {
		string = "";
	}
	else if((message == null) || (message.trim() == "")) {
		return;
	}
	else {
		if(user != null)
			nick = user.name;
		else
			nick = "Dealer";

		string = "<b>" + nick + "</b> " + message;
	}
*/
	this.rawChat(nick, message);
}

/**
 * Raw chat string.
 * @method rawChat
 */
BaseTable.prototype.rawChat = function(user, string) {
	var message = new ChatMessage(user, string);
	this.send(message);

	//console.log("user = " + user + ", string = " + string);

	this.chatLines.push({
		user: user,
		text: string
	});

	while (this.chatLines.length > 10)
		this.chatLines.shift();
}

/**
 * Advance the dealer position to the next seated player.
 * @method advanceDealer
 */
BaseTable.prototype.advanceDealer = function() {
	this.dealerButtonIndex = this.getNextSeatIndexInGame(this.dealerButtonIndex);

	this.send(new DealerButtonMessage(this.dealerButtonIndex, true));
}

/**
 * Get dealer button index.
 * @method getDealerButtonIndex
 */
BaseTable.prototype.getDealerButtonIndex = function() {
	return this.dealerButtonIndex;
}

/**
 * Get stake.
 * @method getStake
 */
BaseTable.prototype.getStake = function() {
	throw new Error("abstract");
}

/**
 * Send.
 * @method send
 */
BaseTable.prototype.send = function(m) {
	throw new Error("abstract");
}

/**
 * Send except seat.
 * @method sendExceptSeat
 */
BaseTable.prototype.sendExceptSeat = function(m, tableSeat) {
	throw new Error("abstract");
}

/**
 * Get string for logging.
 * @method getLogState
 */
BaseTable.prototype.getLogState = function() {
	var o = {};

	o.seats = [];

	for (var s = 0; s < this.tableSeats.length; s++) {
		var tableSeat = this.tableSeats[s];

		if (tableSeat.getUser()) {
			var d = {
				seatIndex: tableSeat.getSeatIndex(),
				userName: tableSeat.getUser().getName(),
				chips: tableSeat.getChips()
			};
			o.seats.push(d);
		}
	}

	return JSON.stringify(o);
}

/**
 * Get table seat by user.
 * @method getTableSeatByUser
 */
BaseTable.prototype.getTableSeatByUser = function(user) {
	if (!user)
		throw new Error("trying to get table seat for null user");

	for (var t = 0; t < this.tableSeats.length; t++) {
		var tableSeat = this.tableSeats[t];

		if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId())
			return tableSeat;
	}

	return null;
}

/**
 * Get current game for this table.
 * @method getCurrentGame
 */
BaseTable.prototype.getCurrentGame = function() {
	return this.currentGame;
}

/**
 * Start game.
 * @method startGame
 * @protected
 */
BaseTable.prototype.startGame = function() {
	throw new Error("abstract");
}

/**
 * Get services.
 * @method getServices
 */
BaseTable.prototype.getServices = function() {
	throw new Error("abstract");
}

/**
 * Get hand info message.
 * @method getHandInfoMessage
 */
BaseTable.prototype.getHandInfoMessage = function() {
	throw new Error("abstract");
}

/**
 * Send table info messages to all connections.
 * @method sendTableInfoMessages
 */
BaseTable.prototype.sendTableInfoMessages = function() {
	throw new Error("abstract");
}

/**
 * Rake percent.
 * @method getRakePercent
 */
BaseTable.prototype.getRakePercent = function() {
	throw new Error("abstract");
}

module.exports = BaseTable;