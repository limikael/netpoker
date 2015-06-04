var EventDispatcher = require("yaed");
var inherits = require("inherits");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonData = require("../../proto/data/ButtonData");
var Backend = require("../backend/Backend");

/**
 * Represents a spectator before the tournament has started.
 * @class RegistrationSpectator
 */
function RegistrationSpectator(registrationState, protoConnection, user) {
	EventDispatcher.call(this);

	this.registrationState = registrationState;
	this.tournament = this.registrationState.getTournament();
	this.user = user;

	this.setProtoConnection(protoConnection);

	for (var i = 0; i < 10; i++) {
		var message = new SeatInfoMessage(i);
		message.setActive(false);
		this.send(message);
	}

	this.send(this.getTableInfoMessage());
	this.send(new StateCompleteMessage());
	this.send(this.registrationState.getPreTournamentInfoMessage());

	this.backendCallInProgress = false;
}

inherits(RegistrationSpectator, EventDispatcher);

/**
 * Dispatched when the user disconnects.
 * @event RegistrationSpectator.DONE
 */
RegistrationSpectator.DONE = "done";

/**
 * Dispatched when a backend call is complete.
 * @event RegistrationSpectator.BACKEND_CALL_COMPLETE
 */
RegistrationSpectator.BACKEND_CALL_COMPLETE = "backendCallComplete";

/**
 * Send.
 * @method send
 */
RegistrationSpectator.prototype.send = function(m) {
	if (this.protoConnection)
		this.protoConnection.send(m);
}

/**
 * Get table info message.
 * @method getTableInfoMessage
 */
RegistrationSpectator.prototype.getTableInfoMessage = function() {
	var m = new TableInfoMessage(this.tournament.getInfo());

	if (this.user) {
		if (this.tournament.isUserRegistered(this.user))
			m.setShowLeaveButton(true);

		else
			m.setShowJoinButton(true);
	}

	return m;
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
 * Get connection.
 * @method getProtoConnection
 */
RegistrationSpectator.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Get user.
 * @method getUser
 */
RegistrationSpectator.prototype.getUser = function() {
	return this.user;
}

/**
 * The connection was closed.
 * @method onProtoConnectionClose
 * @private
 */
RegistrationSpectator.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(RegistrationSpectator.DONE);
}

/**
 * A button was clicked.
 * @method onButtonClickMessage
 * @private
 */
RegistrationSpectator.prototype.onButtonClickMessage = function(m) {
	if (this.backendCallInProgress)
		return;

	if (!this.user) {
		return;
	}

	switch (m.button) {
		case ButtonData.JOIN_TOURNAMENT:
			this.backendCallInProgress = true;
			var p = {
				userId: this.user.getId(),
				tournamentId: this.tournament.getId()
			};
			this.tournament.getBackend().call(Backend.TOURNAMENT_REGISTER).then(
				this.onTournamentRegisterSuccess.bind(this),
				this.onTournamentRegisterError.bind(this)
			);
			break;

		case ButtonData.LEAVE_TOURNAMENT:
			this.backendCallInProgress = true;
			var p = {
				userId: this.user.getId(),
				tournamentId: this.tournament.getId()
			};
			this.tournament.getBackend().call(Backend.TOURNAMENT_REGISTER).then(
				this.onTournamentUnregisterSuccess.bind(this),
				this.onTournamentUnregisterError.bind(this)
			);
			break;
	}
}

/**
 * Backend call result handler.
 * @method onTournamentRegisterSuccess
 * @private
 */
RegistrationSpectator.prototype.onTournamentRegisterSuccess = function(r) {
	this.tournament.addUser(this.user);
	this.send(this.getTableInfoMessage());
	this.registrationState.send(this.registrationState.getPreTournamentInfoMessage());
	this.notifyCallComplete();
}

/**
 * Backend call result handler.
 * @method onTournamentRegisterError
 * @private
 */
RegistrationSpectator.prototype.onTournamentRegisterError = function(r) {
	this.send(this.getTableInfoMessage());
	this.notifyCallComplete();
}

/**
 * Backend call result handler.
 * @method onTournamentUnregisterSuccess
 * @private
 */
RegistrationSpectator.prototype.onTournamentUnregisterSuccess = function(r) {
	this.tournament.removeUser(this.user);
	this.send(this.getTableInfoMessage());
	this.registrationState.send(this.registrationState.getPreTournamentInfoMessage());
	this.notifyCallComplete();
}

/**
 * Backend call result handler.
 * @method onTournamentUnregisterError
 * @private
 */
RegistrationSpectator.prototype.onTournamentUnregisterError = function(r) {
	this.send(this.getTableInfoMessage());
	this.notifyCallComplete();
}

/**
 * The current call is complete.
 * @method notifyCallComplete
 * @private
 */
RegistrationSpectator.prototype.notifyCallComplete = function(r) {
	this.backendCallInProgress = false;

	this.trigger(RegistrationSpectator.BACKEND_CALL_COMPLETE);

	if (!this.protoConnection)
		this.trigger(RegistrationSpectator.DONE);
}

/**
 * Do we have a backend call in progress?
 * @method isBackendCallInProgress
 */
RegistrationSpectator.prototype.isBackendCallInProgress = function() {
	return this.backendCallInProgress;
}

module.exports = RegistrationSpectator;