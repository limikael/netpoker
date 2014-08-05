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
BaseTable.prototype.getTableSeats=function() {
	return this.tableSeats;
}

module.exports = BaseTable;