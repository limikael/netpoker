/**
 * Server.
 * @module server
 */

/**
 * Connection event for connection manager.
 * @class ConnectionManagerConnectionEvent
 */
function ConnectionManagerConnectionEvent(protoConnection, user, initMessage) {
	this.type = "connection";

	this.protoConnection = protoConnection;
	this.user = user;
	this.initMessage = initMessage;
}

/**
 * Getter.
 * @method getProtoConnection
 */
ConnectionManagerConnectionEvent.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Getter.
 * @method getUser
 */
ConnectionManagerConnectionEvent.prototype.getUser = function() {
	return this.user;
}

/**
 * Getter.
 * @method getInitMessage
 */
ConnectionManagerConnectionEvent.prototype.getInitMessage = function() {
	return this.initMessage;
}

module.exports = ConnectionManagerConnectionEvent;