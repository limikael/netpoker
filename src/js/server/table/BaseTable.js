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
}

FunctionUtil.extend(BaseTable, EventDispatcher);

/**
 * Get table seats.
 */
BaseTable.prototype.getTableSeats = function() {
	return this.tableSeats;
}

/**
 * Get table seat by seat index.
 */
BaseTable.prototype.getTableSeatBySeatIndex = function(seatIndex) {
	return this.tableSeats[seatIndex];
}

/**
 * Get number of seats that is in game.
 */
BaseTable.prototype.getNumInGame = function() {
	var cnt = 0;

	for (var i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].isInGame())
			cnt++;

	return cnt;
}

/**
 * Get parent id.
 */
BaseTable.prototype.getStartGameParentId=function() {
	throw "abstract";
}

/**
 * Get start function.
 */
BaseTable.prototype.getStartGameFunctionName=function() {
	throw "abstract";
}

module.exports = BaseTable;