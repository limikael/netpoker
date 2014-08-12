var EventDispatcher = require("./EventDispatcher");
var FunctionUtil = require("./FunctionUtil");
var Thenable = require("./Thenable");

/**
 * Message connection in a browser.
 * @class MessageWebSocketConnection
 */
function MessageWebSocketConnection() {
	EventDispatcher.call(this);
}

FunctionUtil.extend(MessageWebSocketConnection, EventDispatcher);

MessageWebSocketConnection.CONNECT = "connect";
MessageWebSocketConnection.MESSAGE = "message";
MessageWebSocketConnection.CLOSE = "close";

/**
 * Connect.
 * @method connect
 */
MessageWebSocketConnection.prototype.connect = function(url) {
	this.webSocket = new WebSocket(url);
	this.webSocket.onopen = this.onWebSocketOpen.bind(this);
	this.webSocket.onmessage = this.onWebSocketMessage.bind(this);
	this.webSocket.onclose = this.onWebSocketClose.bind(this);
	this.webSocket.onerror = this.onWebSocketError.bind(this);
}

/**
 * Web socket open.
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketOpen = function() {
	this.trigger(MessageWebSocketConnection.CONNECT);
}

/**
 * Web socket message.
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketMessage = function(e) {
	var message = JSON.parse(e.data);

	this.trigger({
		type: MessageWebSocketConnection.MESSAGE,
		message: message
	});
}

/**
 * Web socket close.
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketClose = function() {
	console.log("web socket close...");
	this.webSocket.close();
	this.webSocket = null;

	this.trigger(MessageWebSocketConnection.CLOSE);
}

/**
 * Web socket error.
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketError = function() {
	this.webSocket.close();
	this.webSocket = null;

	this.trigger(MessageWebSocketConnection.CLOSE);
}

module.exports = MessageWebSocketConnection;