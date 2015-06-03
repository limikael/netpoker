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
RegistrationState.prototype.onRegistrationSpectatorDone = function(ev) {
	throw new Error("not impl..");
}

/**
 * Run state.
 * @method run
 */
RegistrationState.prototype.run = function() {}

module.exports = RegistrationState;