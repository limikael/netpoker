var TournamentState = require("./TournamentState");
var inherits = require("inherits");

/**
 * Before the game has started.
 * @class RegistrationState
 */
function RegistrationState() {
	TournamentState.call(this);
}

inherits(RegistrationState, TournamentState);

/**
 * Run state.
 * @method run
 */
RegistrationState.prototype.run = function() {}

module.exports = RegistrationState;