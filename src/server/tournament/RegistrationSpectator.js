var EventDispatcher = require("yaed");
var inherits = require("inherits");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");

/**
 * Represents a spectator before the tournament has started.
 * @class RegistrationSpectator
 */
function RegistrationSpectator(registrationState, protoConnection, user) {
	EventDispatcher.call(this);

	this.registrationState = registrationState;
	this.protoConnection = protoConnection;
	this.user = user;

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

module.exports = RegistrationSpectator;