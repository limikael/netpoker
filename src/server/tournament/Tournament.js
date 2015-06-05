/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var RegistrationState = require("./RegistrationState");
var EventDispatcher = require("yaed");
var inherits = require("inherits");
var User = require("../user/User");
var BlindStructureData = require("./BlindStructureData");

/**
 * Represents a managed tournament.
 * A tournament is considered idle when there is no tournament ongoing,
 * the tournament does not manage any money, etc.
 * There might still be spectators connected to a tournament, however.
 * When there are no spectators the tournament will dispach as CAN_UNLOAD
 * event.
 * @class Tournament
 */
function Tournament(services, data) {
	EventDispatcher.call(this);

	if (!data.id) throw new Error("id missing");
	if (!data.seatsPerTable) throw new Error("missing seats per table for tournament");
	if (!data.startChips) throw new Error("missing start chips for tournament");
	if (!data.blindStructure || !data.blindStructure.length) throw new Error("no blind structure");

	this.id = data.id;
	this.info = data.info;
	this.requiredRegistrations = data.requiredRegistrations;
	this.seatsPerTable = data.seatsPerTable;
	this.blindStructure = [];
	this.startChips = data.startChips;

	for (var i = 0; i < data.blindStructure.length; i++) {
		this.blindStructure.push(new BlindStructureData(
			data.blindStructure[i].time,
			data.blindStructure[i].stake,
			data.blindStructure[i].ante
		));
	}

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

	this.services = services;
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
 * Get seats per table
 * @method getSeatsPerTable
 */
Tournament.prototype.getSeatsPerTable = function() {
	return this.seatsPerTable;
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
 * Get tournament state.
 * @method getTournamentState
 */
Tournament.prototype.getTournamentState = function() {
	return this.tournamentState;
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
	this.trigger(Tournament.CAN_UNLOAD, this);
}

/**
 * New connection.
 * @method notifyNewConnection
 */
Tournament.prototype.notifyNewConnection = function(protoConnection, user) {
	this.tournamentState.notifyNewConnection(protoConnection, user);
}

/**
 * Get info.
 * @method getInfo
 */
Tournament.prototype.getInfo = function() {
	return this.info;
}

/**
 * Get backend.
 * @method getBackend
 */
Tournament.prototype.getBackend = function() {
	return this.services.getBackend();
}

/**
 * Get services.
 * @method getServices
 */
Tournament.prototype.getServices = function() {
	return this.services;
}

/**
 * Get number of registrations.
 * @method getNumRegistrations
 */
Tournament.prototype.getNumRegistrations = function() {
	return this.users.length;
}

/**
 * Get required registrations to start.
 * @method getRequiredRegistrations
 */
Tournament.prototype.getRequiredRegistrations = function() {
	return this.requiredRegistrations;
}

/**
 * Get users.
 * @method getUsers
 */
Tournament.prototype.getUsers = function() {
	return this.users;
}

/**
 * Get start chips.
 * @method getStartChips
 */
Tournament.prototype.getStartChips = function() {
	return this.startChips;
}

/**
 * Idle?
 * @method isIdle
 */
Tournament.prototype.isIdle = function() {
	return this.tournamentState.isIdle();
}

/**
 * Get blind structure for level
 * @method getBlindStructureForLevel
 */
Tournament.prototype.getBlindStructureForLevel = function(level) {
	if (level >= this.blindStructure.length)
		throw new Error("there are not that many levels");

	return this.blindStructure[level];
}

/**
 * Hard close.
 * @method close
 */
Tournament.prototype.close = function() {
	if (!this.isIdle())
		console.log("warning, closing non idle tournament");

	this.tournamentState.close();
}

module.exports = Tournament;