var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * Represents one connection to a MessageServer
 * @class MessageServerConnection
 */
function MessageServerConnection(webSocket) {
	EventDispatcher.call(this);

	this.webSocket = webSocket;

	this.webSocket.on("message", this.onWebSocketMessage.bind(this));
	this.webSocket.on("close", this.onWebSocketClose.bind(this));
}

FunctionUtil.extend(MessageServerConnection, EventDispatcher);

MessageServerConnection.MESSAGE = "message";
MessageServerConnection.CLOSE = "close";

/**
 * On websocket message.
 * @private
 */
MessageServerConnection.prototype.onWebSocketMessage = function(event) {
	try {
		var message = JSON.parse(event.data);

		this.trigger({
			type: MessageServerConnection.MESSAGE,
			message: message
		});
	} catch (err) {
		console.log("MessageServerConnection received non JSON data");
	}
}

/**
 * On websocket message.
 * @private
 */
MessageServerConnection.prototype.onWebSocketClose = function() {
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
 * Close.
 * @method close
 */
MessageServerConnection.prototype.close = function(message) {
	this.webSocket.close();
	this.webSocket = null;
}

module.exports = MessageServerConnection;