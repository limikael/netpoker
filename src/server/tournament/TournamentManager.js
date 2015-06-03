/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var Thenable = require("tinp");
var Tournament = require("./Tournament");
var Backend = require("../../server/backend/Backend");

/**
 * Manage ongoing tournaments.
 * @class TournamentManager
 */
function TournamentManager(services) {
	this.Tournament = Tournament;

	this.services = services;
	this.tournaments = [];
}

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

			var tournament = new scope.Tournament(data);
			scope.tournaments.push(tournament);
			thenable.resolve(tournament);
		},

		function(e) {
			thenable.reject(e);
		}
	);

	return thenable;
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

module.exports = TournamentManager;