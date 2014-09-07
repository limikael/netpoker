var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Base class for cash game and tournament tables.
 * @class BaseTable
 */
function BaseTable() {
	EventDispatcher.call(this);

	if (!this.tableSeats)
		throw new Error("table seats needs to be set up for BaseTable");

	this.dealerButtonIndex = -1;
}

FunctionUtil.extend(BaseTable, EventDispatcher);

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
 * Advance the dealer position to the next seated player.
 * @method advanceDealer
 */
BaseTable.prototype.advanceDealer = function() {
	this.dealerButtonIndex = this.getNextSeatIndexInGame(this.dealerButtonIndex);

	// send
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

module.exports = BaseTable;