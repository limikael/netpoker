var EventDispatcher = require("yaed");
var inherits = require("inherits");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var ProtoConnection = require("../../proto/ProtoConnection");

/**
 * Represents a spectator before the tournament has started.
 * @class RegistrationSpectator
 */
function RegistrationSpectator(registrationState, protoConnection, user) {
	EventDispatcher.call(this);

	this.registrationState = registrationState;
	this.user = user;

	this.setProtoConnection(protoConnection);

	for (var i = 0; i < 10; i++) {
		var message = new SeatInfoMessage(i);
		message.setActive(false);
		this.send(message);
	}

	this.send(new StateCompleteMessage());
}

inherits(RegistrationSpectator, EventDispatcher);

/**
 * Dispatched when the user disconnects.
 * @event RegistrationSpectator.DONE
 */
RegistrationSpectator.DONE = "done";

/**
 * Send.
 * @method send
 */
RegistrationSpectator.prototype.send = function(m) {
	if (this.protoConnection)
		this.protoConnection.send(m);
}

/**
 * Set proto connection.
 * @method setProtoConnection
 * @private
 */
RegistrationSpectator.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
		this.protoConnection.removeMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
		this.protoConnection.addMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	}
}

/**
 * The connection was closed.
 * @method onProtoConnectionClose
 * @private
 */
RegistrationSpectator.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(RegistrationSpectator.DONE, this);
}

/**
 * A button was clicked.
 * @method onButtonClickMessage
 * @private
 */
RegistrationSpectator.prototype.onButtonClickMessage = function(m) {
	console.log("got registration...")
}

module.exports = RegistrationSpectator;