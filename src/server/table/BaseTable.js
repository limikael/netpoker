/**
 * Server.
 * @module server
 */

var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ChatMessage = require("../../proto/messages/ChatMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");

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

FunctionUtil.extend(BaseTable, EventDispatcher);

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
 * Get parent id. This id is what should be used for the
 * start game call for backend. For cashgames, this will
 * represent the table id, for tournamets, it will
 * represent the tournament id.
 * @method getStartGameParentId
 */
BaseTable.prototype.getStartGameParentId = function() {
	throw "abstract";
}

/**
 * Get start function.
 * @method getStartGameFunctionName
 */
BaseTable.prototype.getStartGameFunctionName = function() {
	throw "abstract";
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

	console.log("user = " + user + ", string = " + string);

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
	throw "abstract";
}

/**
 * Send.
 * @method send
 */
BaseTable.prototype.send = function(m) {
	throw "abstract";
}

/**
 * Get string for logging.
 * @method getLogState
 */
BaseTable.prototype.getLogState = function() {
	var o = {};

	o.seats=[];

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

module.exports = BaseTable;