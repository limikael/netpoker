/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var PlayState = require("./PlayState");
var inherits = require("inherits");
var RegistrationSpectator = require("./RegistrationSpectator");
var PreTournamentInfoMessage = require("../../proto/messages/PreTournamentInfoMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");

/**
 * Before the game has started.
 * @class RegistrationState
 */
function RegistrationState() {
	TournamentState.call(this);

	this.registrationSpectators = [];
}

inherits(RegistrationState, TournamentState);

/**
 * New connection
 * @method notifyNewConnection
 */
RegistrationState.prototype.notifyNewConnection = function(protoConnection, user) {
	var rs = new RegistrationSpectator(this, protoConnection, user);
	rs.on(RegistrationSpectator.DONE, this.onRegistrationSpectatorDone, this);
	rs.on(RegistrationSpectator.BACKEND_CALL_COMPLETE, this.onSpectatorBackendCallComplete, this);
	this.registrationSpectators.push(rs);
}

/**
 * Spectator done.
 * @method onRegistrationSpectatorDone
 */
RegistrationState.prototype.onRegistrationSpectatorDone = function(ev) {
	var rs = ev.target;
	rs.off(RegistrationSpectator.DONE, this.onRegistrationSpectatorDone, this);
	rs.off(RegistrationSpectator.BACKEND_CALL_COMPLETE, this.onSpectatorBackendCallComplete, this);

	var index = this.registrationSpectators.indexOf(rs);
	if (index >= 0)
		this.registrationSpectators.splice(index, 1);

	if (!this.registrationSpectators.length)
		this.trigger(TournamentState.CAN_UNLOAD);
}

/**
 * Get pre tournament message.
 * @method getPreTournamentInfoMessage
 */
RegistrationState.prototype.getPreTournamentInfoMessage = function() {
	/*	var now: Int = Math.round(Date.now().getTime() / 1000);
		var startingIn: Int = Math.round(tournament.startTime - now);
		var m: PreTournamentInfoMessage = new PreTournamentInfoMessage();

		m.countdown = startingIn;*/

	var text;

	if (this.tournament.getRequiredRegistrations())
		text = "Registrations: " +
		this.tournament.getNumRegistrations() + " / " +
		this.tournament.getRequiredRegistrations();

	else
		text = "Registrations: " + this.tournament.getNumRegistrations() + "\n\nStarting in: ??:??";

	var m = new PreTournamentInfoMessage(text);

	return m;
}

/**
 * Sent to all connected users.
 * @method send
 */
RegistrationState.prototype.send = function(m) {
	for (var i = 0; i < this.registrationSpectators.length; i++)
		this.registrationSpectators[i].send(m);
}

/**
 * Backend call complete.
 * @method onRegistrationSpectatorBackendCallComplete
 */
RegistrationState.prototype.onSpectatorBackendCallComplete = function() {
	this.checkStart();
}

/**
 * Run state.
 * @method run
 */
RegistrationState.prototype.run = function() {
	this.checkStart();
}

/**
 * Check if we are ready to start.
 * @method checkStart
 */
RegistrationState.prototype.checkStart = function() {
	for (var i = 0; i < this.registrationSpectators.length; i++) {
		if (this.registrationSpectators[i].isBackendCallInProgress())
			return;
	}

	if (this.tournament.getRequiredRegistrations() &&
		this.tournament.getNumRegistrations() >= this.tournament.getRequiredRegistrations())
		this.start();
}

/**
 * Actually start.
 * @method start
 * @private
 */
RegistrationState.prototype.start = function() {
	console.log("staring now...");

	var p = new PlayState();
	this.tournament.setTournamentState(p);
	this.moveConnectionsToState(p);
}

/**
 * Move all connections to a new state.
 * @method moveConnectionsToState
 * @private
 */
RegistrationState.prototype.moveConnectionsToState = function(newState) {
	for (var i = 0; i < this.registrationSpectators.length; i++) {
		var rs = this.registrationSpectators[i];

		rs.send(new PreTournamentInfoMessage());
		rs.send(new TableInfoMessage());

		rs.off(RegistrationSpectator.DONE, this.onRegistrationSpectatorDone, this);
		rs.off(RegistrationSpectator.BACKEND_CALL_COMPLETE, this.onSpectatorBackendCallComplete, this);

		var protoConnection = rs.getProtoConnection();
		var user = rs.getUser();

		if (protoConnection)
			newState.notifyNewConnection(protoConnection, user);
	}

	this.registrationSpectators = [];
}

module.exports = RegistrationState;