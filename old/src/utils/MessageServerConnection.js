/**
 * Utilities.
 * @module utils
 */

var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Represents one connection to a MessageServer
 * @class MessageServerConnection
 */
function MessageServerConnection(webSocket, parameters) {
	EventDispatcher.call(this);

	this.webSocket = webSocket;
	this.connectionParameters = parameters;

	this.webSocket.on("message", this.onWebSocketMessage.bind(this));
	this.webSocket.on("close", this.onWebSocketClose.bind(this));
}

inherits(MessageServerConnection, EventDispatcher);

MessageServerConnection.MESSAGE = "message";
MessageServerConnection.CLOSE = "close";

/**
 * On websocket message.
 * @method onWebSocketMessage
 * @private
 */
MessageServerConnection.prototype.onWebSocketMessage = function(event) {
	var message;
	try {
		message = JSON.parse(event.data);
	} catch (err) {
		console.log(err.stack);
		console.log("MessageServerConnection received non JSON data: " + event.data);
		return;
	}

	this.trigger({
		type: MessageServerConnection.MESSAGE,
		message: message
	});
}

/**
 * On websocket message.
 * @method onWebSocketClose
 * @private
 */
MessageServerConnection.prototype.onWebSocketClose = function() {
	if (this.webSocket)
		this.webSocket.close();

	this.webSocket = null;

	this.trigger(MessageServerConnection.CLOSE);
}

/**
 * Send a message.
 * @method send
 */
MessageServerConnection.prototype.send = function(message) {
	this.webSocket.send(JSON.stringify(message));
}

/**
 * Get connection parameters.
 * @method getConnectionParameters
 */
MessageServerConnection.prototype.getConnectionParameters = function() {
	return this.connectionParameters;
}

/**
 * Close.
 * @method close
 */
MessageServerConnection.prototype.close = function(message) {
	if (this.webSocket)
		this.webSocket.close();

	this.webSocket = null;
}

module.exports = MessageServerConnection;