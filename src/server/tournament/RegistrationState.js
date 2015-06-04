var TournamentState = require("./TournamentState");
var inherits = require("inherits");
var RegistrationSpectator = require("./RegistrationSpectator");
var PreTournamentInfoMessage = require("../../proto/messages/PreTournamentInfoMessage");

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
	this.registrationSpectators.push(rs);
}

/**
 * Spectator done.
 * @method onRegistrationSpectatorDone
 */
RegistrationState.prototype.onRegistrationSpectatorDone = function(ev) {
	var rs = ev.target;
	rs.off(RegistrationSpectator.DONE, this.onRegistrationSpectatorDone, this);

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

	var text = "Registrations: " + this.tournament.getNumRegistrations() + "\n\nStarting in: ??:??";

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
 * Run state.
 * @method run
 */
RegistrationState.prototype.run = function() {}

module.exports = RegistrationState;