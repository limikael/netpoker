var EventDispatcher = require("../utils/EventDispatcher");
var FunctionUtil = require("../utils/FunctionUtil");
var InitMessage = require("./messages/InitMessage");

/**
 * @class ProtoConnection
 * A protocol connection with an underlying connection.
 */
function ProtoConnection(connection) {
	EventDispatcher.call(this);

	this.messageDispatcher = new EventDispatcher();
	this.connection = connection;
	this.connection.addEventListener("message", this.onConnectionMessage, this);
}

FunctionUtil.extend(ProtoConnection, EventDispatcher);

ProtoConnection.MESSAGE_TYPES = {};
ProtoConnection.MESSAGE_TYPES[InitMessage.TYPE] = InitMessage;

/**
 * Add message handler.
 */
ProtoConnection.prototype.addMessageHandler = function(messageType, handler, scope) {
	this.messageDispatcher.on(messageType, handler, scope);
}

/**
 * Connection message.
 * @method onConnectionMessage
 */
ProtoConnection.prototype.onConnectionMessage = function(ev) {
	var message = ev.message;
	var constructor;

	for (type in ProtoConnection.MESSAGE_TYPES) {
		if (message.type == type)
			constructor = ProtoConnection.MESSAGE_TYPES[type]
	}

	if (!constructor) {
		console.warn("unknown message...");
	}

	var o = new constructor();
	o.unserialize(message);
	o.type = message.type;

	this.messageDispatcher.trigger(o);
}

/**
 * Send a message.
 */
ProtoConnection.prototype.send = function(message) {
	var serialized = message.serialize();

	for (type in ProtoConnection.MESSAGE_TYPES) {
		if (message instanceof ProtoConnection.MESSAGE_TYPES[type])
			serialized.type = type;
	}

	if (!serialized.type)
		throw new Error("Unknown message type");

	this.connection.send(serialized);
}

module.exports = ProtoConnection;