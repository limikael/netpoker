var TournamentState = require("./TournamentState");
var RegistrationState = require("./RegistrationState");

/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var inherits = require("inherits");
var User = require("../user/User");

/**
 * Represents a managed tournament.
 * A tournament is considered idle when there is no tournament ongoing,
 * the tournament does not manage any money, etc.
 * There might still be spectators connected to a tournament, however.
 * When there are no spectators the tournament will dispach as CAN_UNLOAD
 * event.
 * @class Tournament
 */
function Tournament(data) {
	EventDispatcher.call(this);

	if (!data.id) throw new Error("id missing");

	this.id = data.id;

	this.users = [];

	if (data.users) {
		for (var i = 0; i < data.users.length; i++) {
			var u = new User(data.users[i]);
			this.addUser(u);
		}
	}

	switch (data.state) {
		case "registration":
			var state = new RegistrationState();
			this.setTournamentState(state);
			break;

		default:
			throw new Error("Can't manage this tournament: state=" + data.state);
			break;
	}
}

inherits(Tournament, EventDispatcher);

/**
 * Dispatched when the tournament becomes idle.
 * @event Tournament.IDLE
 */
Tournament.IDLE = "idle";

/**
 * Dispatched when the tournament can unload itself,
 * i.e. it is idle and there are no spectators.
 * @event Tournament.CAN_UNLOAD
 */
Tournament.CAN_UNLOAD = "canUnload";

/**
 * Get id.
 * @method getId
 */
Tournament.prototype.getId = function() {
	return this.id;
}

/**
 * Is this user registered?
 * @method isUserRegistered
 */
Tournament.prototype.isUserRegistered = function(u) {
	for (var i = 0; i < this.users.length; i++)
		if (this.users[i].getId() == u.getId())
			return true;

	return false;
}

/**
 * Add a user.
 * @method addUser
 */
Tournament.prototype.addUser = function(u) {
	if (this.isUserRegistered(u))
		return;

	this.users.push(u);
}

/**
 * Remove a user.
 * @method addUser
 */
Tournament.prototype.removeUser = function(u) {
	if (!this.isUserRegistered(u))
		return;

	for (var i = 0; i < this.users.length; i++)
		if (this.users[i].getId() == u.getId()) {
			this.users.splice(i, 1);
			return;
		}
}

/**
 * Set and run current tournament state.
 * @method setTournamentState
 * @private
 */
Tournament.prototype.setTournamentState = function(tournamentState) {
	if (this.tournamentState) {
		this.tournamentState.setTournament(null);
		this.tournamentState.off(TournamentState.IDLE, this.onTournamentStateIdle, this);
		this.tournamentState.off(TournamentState.CAN_UNLOAD, this.onTournamentStateCanUnload, this);
	}

	this.tournamentState = tournamentState;
	this.tournamentState.setTournament(this);
	this.tournamentState.on(TournamentState.IDLE, this.onTournamentStateIdle, this);
	this.tournamentState.on(TournamentState.CAN_UNLOAD, this.onTournamentStateCanUnload, this);
	this.tournamentState.run();
}

/**
 * Tournament state idle.
 * @method onTournamentStateIdle
 * @private
 */
Tournament.prototype.onTournamentStateIdle = function() {
	this.trigger(Tournament.IDLE);
}

/**
 * Tournament state can unload.
 * @method onTournamentStateIdle
 * @private
 */
Tournament.prototype.onTournamentStateCanUnload = function() {
	this.trigger(Tournament.CAN_UNLOAD);
}

module.exports = Tournament;