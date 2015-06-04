var TournamentState = require("./TournamentState");
var inherits = require("inherits");
var RegistrationSpectator = require("./RegistrationSpectator");

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
RegistrationState.prototype.onRegistrationSpectatorDone = function(rs) {
	rs.off(RegistrationSpectator.DONE, this.onRegistrationSpectatorDone, this);

	var index = this.registrationSpectators.indexOf(rs);
	if (index >= 0)
		this.registrationSpectators.splice(index, 1);

	if (!this.registrationSpectators.length)
		this.trigger(TournamentState.CAN_UNLOAD);
}

/**
 * Run state.
 * @method run
 */
RegistrationState.prototype.run = function() {}

module.exports = RegistrationState;