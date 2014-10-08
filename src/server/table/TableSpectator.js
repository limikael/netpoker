var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ProtoConnection = require("../../proto/ProtoConnection");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");

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
	this.connection.addMessageHandler(SeatClickMessage.TYPE, this.onSeatClick, this);
	this.connection.addMessageHandler(ChatMessage.TYPE, this.onChat, this);

	this.send(this.getTableInfoMessage());
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
	this.connection.removeMessageHandler(SeatClickMessage.TYPE, this.onSeatClick, this);
	this.connection.removeMessageHandler(ChatMessage.TYPE, this.onChat, this);

	this.trigger(TableSpectator.DONE);
}

/**
 * Send a message to this table spectator.
 * @method send
 */
TableSpectator.prototype.send = function(m) {
	if (this.connection)
		this.connection.send(m);
}

/**
 * On chat.
 * @method onChat
 */
TableSpectator.prototype.onChat = function(message) {
	if (this.user == null)
		return;
	this.table.chat(this.user, message.text);
}

/**
 * Get TableInfoMessage to be sent to this TableSpectrator.
 * @method getTableInfoMessage
 */
TableSpectator.prototype.getTableInfoMessage = function() {
	if (!this.user) {
		var m = new TableInfoMessage("You need to be logged in to play.");

		/*m.infoLink = "%u/user/login";
		m.infoLinkText = "Log in...";*/

		return m;
	}

	if (this.table.isUserSeated(this.user)) {
		var s = "You are currently logged in from another computer.\n\n" +
			"This connection is passive.";

		return new TableInfoMessage(s);
	} else if (this.table.isFull()) {
		return new TableInfoMessage("This table is full at the moment.");
	} else {
		return new TableInfoMessage("Welcome!\n\nPlease click on an empty seat to join the game!");
	}
}

/**
 * Get connection.
 * @method getProtoConnection
 */
TableSpectator.prototype.getProtoConnection = function() {
	return this.connection;
}

module.exports = TableSpectator;