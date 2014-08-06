var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ProtoConnection = require("../../proto/ProtoConnection");

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
}

FunctionUtil.extend(TableSpectator, EventDispatcher);

TableSpectator.DONE = "done";

/**
 * Connection close.
 */
TableSpectator.prototype.onConnectionClose = function() {
	console.log("table spectator connection close");
	this.trigger(TableSpectator.DONE);
}

module.exports = TableSpectator;