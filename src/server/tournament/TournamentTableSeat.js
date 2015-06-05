/**
 * Server.
 * @module server
 */

var BaseTableSeat = require("../table/BaseTableSeat");
var TableSeatSettings = require("../table/TableSeatSettings");
var inherits = require("inherits");

/**
 * A table seat. This class represents a seat in a tournament.
 * @class TournamentTableSeat
 * @extends BaseTableSeat
 */
function TournamentTableSeat(tournamentTable, seatIndex, active) {
	BaseTableSeat.call(this, tournamentTable, seatIndex, active);

	this.user = null;
	this.chips = 0;
	this.settings = new TableSeatSettings();
}

inherits(TournamentTableSeat, BaseTableSeat);

/**
 * Is tihs seat available?
 * @method isAvailable
 */
TournamentTableSeat.prototype.isAvailable = function() {
	return this.isActive() && !this.user;
}

/**
 * Sit in user.
 * @method sitInUser
 */
TournamentTableSeat.prototype.sitInUser = function(user, chips) {
	if (this.user)
		throw new Error("seat is already taken");

	this.user = user;
	this.chips = chips;
}

/**
 * Get user.
 * @method getUser
 */
TournamentTableSeat.prototype.getUser = function() {
	return this.user;
}

/**
 * Get settings.
 * @method getSettings
 */
TournamentTableSeat.prototype.getSettings = function() {
	return this.settings;
}

/**
 * In game?
 * @method isInGame
 */
TournamentTableSeat.prototype.isInGame = function() {
	if (this.user)
		return true;

	else
		return false;
}

module.exports = TournamentTableSeat;