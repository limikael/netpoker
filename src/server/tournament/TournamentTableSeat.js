/**
 * Server.
 * @module server
 */

var BaseTableSeat = require("../table/BaseTableSeat");
var TableSeatSettings = require("../table/TableSeatSettings");
var inherits = require("inherits");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");

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
	this.settings.setAlwaysPayBlinds(true);
	this.sitout = false;
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

	if (!user)
		throw new Error("can't sit in a null user");

	if (!chips)
		throw new Error("can't sit in a user without chips");

	this.user = user;
	this.chips = chips;
}

/**
 * Remove user.
 * @method removeUser
 */
TournamentTableSeat.prototype.removeUser = function() {
	if (!this.user)
		throw new Error("can't remove, no user");

	this.user = null;
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

/**
 * Add chips.
 * @method addChips
 */
TournamentTableSeat.prototype.addChips = function(value) {
	this.chips += value;
	if (this.chips < 0)
		throw new Error("Negative chips amount!");
}

/**
 * Get current chips amount.
 * @method getChips
 */
TournamentTableSeat.prototype.getChips = function() {
	return this.chips;
}

/**
 * Sitout?
 * @method isSitout
 */
TournamentTableSeat.prototype.isSitout = function() {
	return this.sitout;
}

/**
 * Get table info message.
 * @method getTableInfoMessage
 */
TournamentTableSeat.prototype.getTableInfoMessage = function() {
	return new TableInfoMessage();
}

module.exports = TournamentTableSeat;