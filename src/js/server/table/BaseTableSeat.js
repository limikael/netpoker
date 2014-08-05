var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Base table seat.
 * @class BaseTableSeat
 */
function BaseTableSeat(table, seatIndex, active) {
	EventDispatcher.call(this);

	this.table = table;
	this.seatIndex = seatIndex;
	this.active = active;
}

FunctionUtil.extend(BaseTableSeat, EventDispatcher);

/**
 * Is tihs seat active?
 * @method isActive
 */
BaseTableSeat.prototype.isActive = function() {
	return this.active;
}

/**
 * Get seat index for this seat?
 * @method getSeatIndex
 */
BaseTableSeat.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

module.exports = BaseTableSeat;