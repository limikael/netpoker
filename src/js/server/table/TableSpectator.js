var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ProtoConnection = require("../../proto/ProtoConnection");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");

/**
 * Someone watching a table.
 * @class TableSpectator
 */
function TableSpectator(table, connection, user) {
	EventDispatcher.call(this);

	this.table = table;
	this.connection = connection;
	this.user = user;

	this.connection.on(ProtoConnection.CLOSE, this.onConnectionClose, this);
	this.connection.addMessageHandler(SeatClickMessage, this.onSeatClick, this);
}

FunctionUtil.extend(TableSpectator, EventDispatcher);

TableSpectator.DONE = "done";

/**
 * Connection close.
 * @method onConnectionClose
 */
TableSpectator.prototype.onConnectionClose = function() {
	console.log("table spectator connection close");
	this.trigger(TableSpectator.DONE);
}

/**
 * Seat click.
 * @method onSeatClick
 */
TableSpectator.prototype.onSeatClick = function(m) {
	var tableSeat = this.table.getTableSeatBySeatIndex(m.getSeatIndex());

	if (!tableSeat || !tableSeat.isAvailable())
		return;

	if (this.table.isUserSeated(this.user))
		return;

	tableSeat.reserve(this.user, this.connection);

	console.log("seat click!!!");

	this.connection.off(ProtoConnection.CLOSE, this.onConnectionClose, this);
	this.connection.removeMessageHandler(SeatClickMessage, this.onSeatClick, this);

	this.trigger(TableSpectator.DONE);
}

module.exports = TableSpectator;