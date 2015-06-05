/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var EventDispatcher = require("yaed");
var ProtoConnection = require("../../proto/ProtoConnection");

/**
 * A spectator in the play state.
 * @class PlaySpectator
 */
function PlaySpectator(playState, protoConnection, user, tournamentTable) {
	EventDispatcher.call(this);

	this.setProtoConnection(protoConnection);
}

inherits(PlaySpectator, EventDispatcher);

/**
 * Dispatched when we are done.
 * @event PlaySpectator.DONE
 */
PlaySpectator.DONE = "done";

/**
 * Set connection
 * @method setProtoConnection
 * @private
 */
PlaySpectator.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}
}

/**
 * Get connection.
 * @method getProtoConnection
 */
PlaySpectator.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Get user.
 * @method getUser
 */
PlaySpectator.prototype.getUser = function() {
	return this.user;
}

/**
 * Connection was closed.
 * @method onProtoConnectionClose
 */
PlaySpectator.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(PlaySpectator.DONE);
}

module.exports = PlaySpectator;