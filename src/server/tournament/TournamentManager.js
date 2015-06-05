/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var Thenable = require("tinp");
var Tournament = require("./Tournament");
var Backend = require("../../server/backend/Backend");
var EventDispather = require("yaed");

/**
 * Manage ongoing tournaments.
 * @class TournamentManager
 */
function TournamentManager(services) {
	EventDispather.call(this);

	this.Tournament = Tournament;

	this.services = services;
	this.tournaments = [];
}

inherits(TournamentManager, EventDispather);

/**
 * Dispatched when all managed tournaments become idle.
 * @event TournamentManager.IDLE
 */
TournamentManager.IDLE = "idle";

/**
 * Get a managed tournament by id. If it is not currently managed, a
 * request will be made to backend to get information, and the tournament
 * will be created.
 * @method getTournamentById
 * @param id {Object} The id of the tournament
 */
TournamentManager.prototype.findTournamentById = function(id) {
	if (this.hasLocalTournamentId(id)) {
		var thenable = new Thenable();
		thenable.resolve(this.getLocalTournamentById(id));
		return thenable;
	}

	var backend = this.services.getBackend();
	var params = {
		tournamentId: id
	};

	var thenable = new Thenable();
	var scope = this;

	backend.call(Backend.TOURNAMENT_INFO, params).then(
		function(data) {
			if (scope.hasLocalTournamentId(id)) {
				thenable.resolve(scope.getLocalTournamentById(id));
				return thenable;
			}

			if (data) {
				var tournament = new scope.Tournament(scope.services, data);
				scope.manageTournament(tournament);
				thenable.resolve(tournament);
			} else {
				thenable.reject("tournament not found");
			}
		},

		function(e) {
			thenable.reject(e);
		}
	);

	return thenable;
}

/**
 * Set up management for this tournament.
 * @method manageTournament
 * @private
 */
TournamentManager.prototype.manageTournament = function(tournament) {
	if (this.hasLocalTournamentId(tournament.getId()))
		throw new Error("tournament already managed");

	tournament.on(Tournament.IDLE, this.onTournamentIdle, this);
	tournament.on(Tournament.CAN_UNLOAD, this.onTournamentCanUnload, this);

	this.tournaments.push(tournament);
}

/**
 * A tournament becase idle.
 * @method onTournamentIdle
 * @private
 */
TournamentManager.prototype.onTournamentIdle = function() {
	if (this.isIdle())
		this.trigger(TournamentManager.IDLE);
}

/**
 * A tournament can be unloaded.
 * @method onTournamentCanUnload
 * @private
 */
TournamentManager.prototype.onTournamentCanUnload = function(tournament) {
	var index = this.tournaments.indexOf(tournament);

	if (index < 0) {
		console.log("strange!!! tournament can unload for non managed tournament");
		return;
	}

	tournament.off(Tournament.IDLE, this.onTournamentIdle, this);
	tournament.off(Tournament.CAN_UNLOAD, this.onTournamentCanUnload, this);

	this.tournaments.splice(index, 1);

	console.log("tournament unloaded, managed tournaments=" + this.tournaments.length);
}

/**
 * Is this tournament locally managed currently?
 * @method hasLocalTournamentId
 * @private
 */
TournamentManager.prototype.hasLocalTournamentId = function(id) {
	for (var i = 0; i < this.tournaments.length; i++)
		if (this.tournaments[i].getId() == id)
			return true;

	return false;
}

/**
 * Get local tournament by id.
 * @method getLocalTournamentById
 * @private
 */
TournamentManager.prototype.getLocalTournamentById = function(id) {
	for (var i = 0; i < this.tournaments.length; i++)
		if (this.tournaments[i].getId() == id)
			return this.tournaments[i];

	throw new Error("Tournament with id " + id + " is not locally managed");
}

/**
 * Is the tournament manager idle?
 * @method isIdle
 */
TournamentManager.prototype.isIdle = function() {
	for (var i = 0; i < this.tournaments.length; i++)
		if (!this.tournaments[i].isIdle())
			return false;

	return true;
}

/**
 * Close.
 * @method close
 */
TournamentManager.prototype.close = function() {
	for (var i = 0; i < this.tournaments.length; i++)
		this.tournaments[i].close();
}

module.exports = TournamentManager;