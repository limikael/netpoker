/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var EventDispatcher = require("yaed");
var ProtoConnection = require("../../proto/ProtoConnection");

/**
 * A spectator in the play state.
 * @class FinishedSpectator
 */
function FinishedSpectator(finishedState, protoConnection, user) {
	EventDispatcher.call(this);

	this.setProtoConnection(protoConnection);
}

inherits(FinishedSpectator, EventDispatcher);

/**
 * Dispatched when we are done.
 * @event FinishedSpectator.DONE
 */
FinishedSpectator.DONE = "done";

/**
 * Set connection
 * @method setProtoConnection
 * @private
 */
FinishedSpectator.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}
}
/**
 * Connection was closed.
 * @method onProtoConnectionClose
 */
FinishedSpectator.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(FinishedSpectator.DONE);
}

module.exports = FinishedSpectator;