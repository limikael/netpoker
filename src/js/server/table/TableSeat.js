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

TableSeat.READY = "ready";

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
 * @method getUser
 */
TableSeat.prototype.getUser = function() {
	if (!this.tableSeatUser)
		return null;

	return this.tableSeatUser.getUser();
}

/**
 * Reserve seat.
 * @method reserve
 */
TableSeat.prototype.reserve = function(user, protoConnection) {
	if (!this.active)
		throw "This seat is not active";

	if (this.tableSeatUser)
		throw "Someone is sitting here";

	this.setProtoConnection(protoConnection);
	this.tableSeatUser = new TableSeatUser(this, user);
	this.tableSeatUser.on(TableSeatUser.READY, this.onTableSeatUserReady, this);
	this.tableSeatUser.on(TableSeatUser.DONE, this.onTableSeatUserDone, this);
	this.tableSeatUser.sitIn();
}

/**
 * The table seat user is done.
 * @method onTableSeatUserDone
 */
TableSeat.prototype.onTableSeatUserDone = function() {
	var protoConnection = this.getProtoConnection();
	var user = this.tableSeatUser.getUser();

	this.tableSeatUser.off(TableSeatUser.READY, this.onTableSeatUserReady, this);
	this.tableSeatUser.off(TableSeatUser.DONE, this.onTableSeatUserDone, this);
	this.tableSeatUser = null;

	this.table.send(this.getSeatInfoMessage());

	this.setProtoConnection(null);

	if (protoConnection) {
		this.table.notifyNewConnection(protoConnection, user);
	}
}

/**
 * Table seat ready.
 * @method onTableSeatUserReady
 */
TableSeat.prototype.onTableSeatUserReady = function() {
	this.trigger(TableSeat.READY);
}

/**
 * Is this table seat in the game.
 * @method isInGame
 */
TableSeat.prototype.isInGame = function() {
	if (!this.tableSeatUser)
		return false;

	return this.tableSeatUser.isInGame();
}

/**
 * Get chips.
 * @method getChips
 */
TableSeat.prototype.getChips = function() {
	if (!this.tableSeatUser)
		return 0;

	return this.tableSeatUser.getChips();
}

/**
 * Make the user leave the table when possible.
 * @method leaveTable
 */
TableSeat.prototype.leaveTable = function() {
	if (!this.tableSeatUser)
		return;

	this.tableSeatUser.leave();
}

/**
 * Get SeatInfoMessage
 * @method getSeatInfoMessage
 */
TableSeat.prototype.getSeatInfoMessage = function() {
	var m = BaseTableSeat.prototype.getSeatInfoMessage.call(this);

	if (this.tableSeatUser && this.tableSeatUser.isReserved())
		m.setChips("RESERVED");

	if (this.tableSeatUser && this.isSitout())
		m.setChips("SIT OUT");

	return m;
}

/**
 * Is this seat sitting out?
 * @method isSitout
 */
TableSeat.prototype.isSitout = function() {
	if (!this.tableSeatUser)
		return false;

	return this.tableSeatUser.isSitout();
}

module.exports = TableSeat;