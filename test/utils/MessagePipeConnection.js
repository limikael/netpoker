var EventDispatcher = require("../../src/js/utils/EventDispatcher");
var FunctionUtil = require("../../src/js/utils/FunctionUtil");

/**
 * Message pipe connection.
 */
function MessagePipeConnection() {
	EventDispatcher.call(this);

	this.otherEnd = null;
}

FunctionUtil.extend(MessagePipeConnection, EventDispatcher);

MessagePipeConnection.MESSAGE = "message";
MessagePipeConnection.CLOSE = "close";

/**
 * Set other end.
 */
MessagePipeConnection.prototype.connect = function(otherEnd) {
	if (this.otherEnd == otherEnd)
		return;

	this.otherEnd = otherEnd;
	this.otherEnd.connect(this);
}

/**
 * Send.
 */
MessagePipeConnection.prototype.send = function(message) {
	this.otherEnd.trigger({
		type: MessagePipeConnection.MESSAGE,
		message: message
	});
}

/**
 * Send.
 */
MessagePipeConnection.prototype.close = function() {
	this.otherEnd.trigger(MessagePipeConnection.CLOSE);
	this.otherEnd = null;
}

/**
 * Create connection.
 */
MessagePipeConnection.prototype.createConnection = function() {
	var connection = new MessagePipeConnection();
	this.connect(connection);

	return connection;
}

module.exports = MessagePipeConnection;