var FunctionUtil = require("./FunctionUtil");
var Thenable = require("./Thenable");
var WebSocket = require("faye-websocket");

/**
 * Send and receive websocket messages.
 * @class MessageClientConnection
 */
function MessageClientConnection() {
	Thenable.call(this);

	this.webSocket = null;
	this.connectThenable = null;
}

FunctionUtil.extend(MessageClientConnection, Thenable);

MessageClientConnection.MESSAGE = "message";
MessageClientConnection.CLOSE = "close";

/**
 * Connect to a server
 * @method connect
 */
MessageClientConnection.prototype.connect = function(url) {
	this.connectThenable = new Thenable();
	this.webSocket = new WebSocket.Client(url);

	this.webSocket.on("open", this.onWebSocketOpen.bind(this));
	this.webSocket.on("message", this.onWebSocketMessage.bind(this));
	this.webSocket.on("close", this.onWebSocketClose.bind(this));

	return this.connectThenable;
}

/**
 * Opened.
 * @method onWebSocketOpen
 * @private
 */
MessageClientConnection.prototype.onWebSocketOpen = function() {
	this.connectThenable.notifySuccess();
	this.connectThenable = null;
}

/**
 * Message.
 * @method onWebSocketMessage
 * @private
 */
MessageClientConnection.prototype.onWebSocketMessage = function(event) {
	try {
		var message = JSON.parse(event.data);

		this.trigger({
			type: MessageClientConnection.MESSAGE,
			message: message
		});
	} catch (err) {
		console.log("MessageClientConnection received non JSON data");
	}
}

/**
 * Closed.
 * @method onWebSocketClose
 * @private
 */
MessageClientConnection.prototype.onWebSocketClose = function() {
	this.trigger(MessageClientConnection.CLOSE);
	this.webSocket = null;
}

/**
 * Send a message.
 * @method send
 */
MessageClientConnection.prototype.send = function(message) {
	this.webSocket.send(JSON.stringify(message));
}

/**
 * Close the connection.
 * @method close
 */
MessageClientConnection.prototype.close = function(message) {
	this.webSocket.close();
}

module.exports = MessageClientConnection;