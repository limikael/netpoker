var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Message pipe connection.
 */
function MessagePipeConnection() {
	EventDispatcher.call(this);

	this.otherEnd = null;
}

inherits(MessagePipeConnection, EventDispatcher);

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
	//	setTimeout(function() {
	process.nextTick(function() {
		if (this.otherEnd) {
			this.otherEnd.trigger({
				type: MessagePipeConnection.MESSAGE,
				message: message
			});
		}
	}.bind(this) /*, 0*/ );
}

/**
 * Send.
 */
MessagePipeConnection.prototype.close = function() {
	var other = this.otherEnd;

	this.otherEnd = null;

	if (other)
		other.trigger(MessagePipeConnection.CLOSE);
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