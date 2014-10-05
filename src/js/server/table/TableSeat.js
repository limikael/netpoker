var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTableSeat = require("./BaseTableSeat");
var TableSeatUser = require("./TableSeatUser");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * A table seat. This class represents a seat in a cash game.
 *
 * The management of the seated user at this TableSeat is handled
 * using the `reserve` and `leaveTable` methods.
 * @class TableSeat
 * @extends BaseTableSeat
 */
function TableSeat(table, seatIndex, active) {
	BaseTableSeat.call(this, table, seatIndex, active);

	this.tableSeatUser = null;
}

FunctionUtil.extend(TableSeat, BaseTableSeat);

/**
 * Dispatched to signal when user, previously registered using the
 * `reserve` function, is ready to join the game.
 * @event TableSeat.READY
 */
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
 * Reserve seat for the specified user, connecting from the specified connection.
 *
 * At this point, the TableSeat will assume responsibility and manage the
 * user as seated at this seat. The TableSeat may only have one seated user,
 * and needs to do a bit of clean up before switching user, therefore this function
 * will fail if there is already a user seated at this TableSeat.
 *
 * The TableSeat will manage the seated user until the associated TableSeatUser object
 * signals that it is complete, at which point a the associated user will be reset.
 *
 * It is possible to request that this class relinquishes the associated user using
 * the `leaveTable` method, but this is an asynchronous operation.
 *
 * The is no mechanism to know when the associated user is reset.
 *
 * The user will not be immediately ready to play at the table, since the user needs
 * to buy chips before doing so. The `TableSeat.READY` event is used to signal when
 * the user is ready to play.
 * @method reserve
 * @param {User} user The user that reserves the seat.
 * @param {ProtoConnection} protoConnection The connection to the user.
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
 * Set proto connection.
 * @method setProtoConnection
 */
TableSeat.prototype.setProtoConnection = function(protoConnection) {
	BaseTableSeat.prototype.setProtoConnection.call(this, protoConnection);

	if (this.protoConnection) {
		if (this.tableSeatUser) {
			if (this.tableSeatUser.isSitout()) {
				var bm = new ButtonsMessage();
				bm.addButton(new ButtonData(ButtonData.LEAVE));
				bm.addButton(new ButtonData(ButtonData.IM_BACK));
				this.send(bm);
			}
		}

		this.protoConnection.send(this.getTableInfoMessage());
	}
}

/**
 * The table seat user is done.
 * @method onTableSeatUserDone
 * @private
 */
TableSeat.prototype.onTableSeatUserDone = function() {
	console.log("*********** table seat user done!");

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

	this.table.sendTableInfoMessages();
}

/**
 * Table seat ready.
 * @method onTableSeatUserReady
 * @private
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
 * @return {Number} The current number of chips for this seat.
 */
TableSeat.prototype.getChips = function() {
	if (!this.tableSeatUser)
		return 0;

	return this.tableSeatUser.getChips();
}

/**
 * Make the user leave the table when possible.
 *
 * This is an asychronous operation, since we need to communicate with
 * the backend before giving the user up.
 * @method leaveTable
 */
TableSeat.prototype.leaveTable = function() {
	if (!this.tableSeatUser)
		return;

	this.tableSeatUser.leave();
}

/**
 * Get SeatInfoMessage. This method is based on the implementation in the base class
 * but adds a sitout label in case the seat is in sitout mode.
 * @method getSeatInfoMessage
 * @return {SeatInfoMessage}
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
 * Add or subtract chips.
 * @method addChips
 */
TableSeat.prototype.addChips = function(value) {
	if (!this.tableSeatUser)
		throw new Error("no table seat user...");

	this.tableSeatUser.setChips(this.tableSeatUser.getChips() + value);
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

/**
 * Sit out the seated user.
 * @method sitout
 */
TableSeat.prototype.sitout = function() {
	if (!this.tableSeatUser)
		throw new Error("trying to sit out a null user");

	this.tableSeatUser.sitout();
}

/**
 * Get table info message.
 * @method getTableInfoMessage
 */
TableSeat.prototype.getTableInfoMessage = function() {
	if (!this.tableSeatUser)
		return new TableInfoMessage();

	return this.tableSeatUser.getTableInfoMessage();
}

module.exports = TableSeat;