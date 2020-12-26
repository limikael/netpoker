/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var EventDispatcher = require("yaed");
var ProtoConnection = require("../../proto/ProtoConnection");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");

/**
 * A spectator in the play state.
 * @class FinishedSpectator
 */
function FinishedSpectator(finishedState, protoConnection, user) {
	EventDispatcher.call(this);

	this.finishedState = finishedState;

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

		if (this.finishedState.isCanceled()) {
			this.protoConnection.send(new TableInfoMessage(this.finishedState.getCancelMessage()));
		}

		if (this.finishedState.getTournamentResultMessage())
			this.protoConnection.send(this.finishedState.getTournamentResultMessage());

		for (var i = 0; i < 10; i++) {
			var m = new SeatInfoMessage(i);
			m.setActive(false);
			this.protoConnection.send(m);
		}

		this.protoConnection.send(new StateCompleteMessage());
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