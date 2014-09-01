var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTableSeat = require("./BaseTableSeat");
var TableSeatUser = require("./TableSeatUser");

/**
 * A table seat.
 * @class TableSeat
 */
function TableSeat(table, seatIndex, active) {
	BaseTableSeat.call(this, table, seatIndex, active);

	this.tableSeatUser = null;
}

FunctionUtil.extend(TableSeat, BaseTableSeat);

/**
 * Is thie seat available?
 * @method isAvailable
 */
TableSeat.prototype.isAvailable = function() {
	if (this.active && !this.tableSeatUser)
		return true;

	else
		return false;
}

/**
 * Get currently seated user.
 */
TableSeat.prototype.getUser = function() {
	if (!this.tableSeatUser)
		return null;

	return this.tableSeatUser.getUser();
}

/**
 * Reserve seat.
 */
TableSeat.prototype.reserve = function(user, protoConnection) {
	if (!this.active)
		throw "This seat is not active";

	if (this.tableSeatUser)
		throw "Someone is sitting here";

	this.protoConnection = protoConnection;
	this.tableSeatUser = new TableSeatUser(this, user);
}

module.exports = TableSeat;