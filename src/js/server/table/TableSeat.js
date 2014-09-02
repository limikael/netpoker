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

	this.setProtoConnection(protoConnection);
	this.tableSeatUser = new TableSeatUser(this, user);
	this.tableSeatUser.on(TableSeatUser.DONE, this.onTableSeatUserDone, this);
	this.tableSeatUser.sitIn();
}

/**
 * The table seat user is done.
 */
TableSeat.prototype.onTableSeatUserDone = function() {
	var protoConnection = this.getProtoConnection();
	var user = this.tableSeatUser.getUser();

	this.tableSeatUser.off(TableSeatUser.DONE, this.onTableSeatUserDone, this);
	this.tableSeatUser = null;

	this.setProtoConnection(null);

	if (protoConnection) {
		this.table.notifyNewConnection(protoConnection, user);
	}
}

/**
 * Is this table seat in the game.
 */
TableSeat.prototype.isInGame = function() {
	if (!this.tableSeatUser)
		return false;

	return this.tableSeatUser.isInGame();
}

/**
 * Get chips.
 */
TableSeat.prototype.getChips = function() {
	if (!this.tableSeatUser)
		return 0;

	return this.tableSeatUser.getChips();
}

/**
 * Make the user leave the table when possible.
 */
TableSeat.prototype.leaveTable = function() {
	if (!this.tableSeatUser)
		return;

	this.tableSeatUser.leave();
}

module.exports = TableSeat;