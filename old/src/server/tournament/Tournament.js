/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var RegistrationState = require("./RegistrationState");
var FinishedState = require("./FinishedState");
var EventDispatcher = require("yaed");
var inherits = require("inherits");
var User = require("../user/User");
var BlindStructureData = require("./BlindStructureData");
var ArrayUtil = require("../../utils/ArrayUtil");

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

	this.services = services;

	if (!data.id) throw new Error("id missing");
	if (!data.seatsPerTable) throw new Error("missing seats per table for tournament");
	if (!data.startChips) throw new Error("missing start chips for tournament");
	if (!data.blindStructure || !data.blindStructure.length) throw new Error("no blind structure");
	if (!data.payoutPercent) throw new Error("missing payoutPercent for tournament");
	if (isNaN(data.fee)) throw new Error("missing fee");

	this.id = data.id;
	this.info = data.info;
	this.seatsPerTable = data.seatsPerTable;
	this.blindStructure = [];
	this.startChips = data.startChips;
	this.payoutPercent = ArrayUtil.copy(data.payoutPercent);
	this.fee = data.fee;

	this.requiredRegistrations = parseInt(data.requiredRegistrations);
	if (isNaN(this.requiredRegistrations) || this.requiredRegistrations < 2)
		this.requiredRegistrations = 2;

	if (data.hasOwnProperty("bonus"))
		this.bonus = data.bonus;

	else
		this.bonus = 0;

	if (data.hasOwnProperty("startTime") && data.startTime)
		this.startTime = data.startTime;

	else
		this.startTime = null;

	if (data.hasOwnProperty("handFinishDelay"))
		this.handFinishDelay = data.handFinishDelay;

	else
		this.handFinishDelay = 5000;

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

		case "finished":
			var state = new FinishedState();
			state.setDoFinishCall(false);

			var finishOrder = [];
			for (var i = 0; i < data.finishorder.length; i++)
				finishOrder.push(this.getRegisteredUserById(data.finishorder[i]));

			state.setFinishOrder(finishOrder);
			this.setTournamentState(state);
			break;

		case "canceled":
			var state = new FinishedState();
			state.setCanceled("The tournament was canceled");
			state.setDoFinishCall(false);
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
 * Get registered user.
 * @method getRegisteredUserById
 */
Tournament.prototype.getRegisteredUserById = function(id) {
	for (var i = 0; i < this.users.length; i++)
		if (this.users[i].getId() == id)
			return this.users[i];

	throw new Error("The user isn't registered: " + id);
}

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
 * Get start time.
 * @method getStartTime
 */
Tournament.prototype.getStartTime = function() {
	return this.startTime;
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
	//console.log("********* retiurning seats per table: " + this.seatsPerTable);

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
 * Get number of blind levels.
 * @method getNumBlindLevels
 */
Tournament.prototype.getNumBlindLevels = function() {
	return this.blindStructure.length;
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

/**
 * Get hand finish delay.
 * @method getHandFinishDelay
 */
Tournament.prototype.getHandFinishDelay = function() {
	return this.handFinishDelay;
}

/**
 * Get payouts.
 * @method getPayouts
 */
Tournament.prototype.getPayouts = function() {
	var total = this.users.length * this.fee + this.bonus;

	if (isNaN(total))
		throw new Error("total is nan");

	console.log("total: " + total);

	var res = [];

	for (i = 0; i < this.users.length; i++)
		if (i < this.payoutPercent.length)
			res.push(this.payoutPercent[i] * total / 100);

	return res;
}

module.exports = Tournament;