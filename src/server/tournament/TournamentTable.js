/**
 * Server.
 * @module server
 */

var BaseTable = require("../table/BaseTable");
var inherits = require("inherits");
var TableUtil = require("../table/TableUtil");
var TournamentTableSeat = require("./TournamentTableSeat");
var ArrayUtil = require("../../utils/ArrayUtil");

/**
 * Tournament table.
 * @class TournamentTable
 * @extends BaseTable
 */
function TournamentTable(playState, tableIndex) {
	this.playState = playState;
	this.tableIndex = tableIndex;
	this.tournament = playState.getTournament();

	var activeSeatIndices = TableUtil.getActiveSeatIndices(this.tournament.getSeatsPerTable());
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new TournamentTableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);
		this.tableSeats.push(ts);
	}

	BaseTable.call(this);
}

inherits(TournamentTable, BaseTable);

/**
 * Get number of seats used.
 * @method getNumSeatsUsed
 */
TournamentTable.prototype.getNumSeatsUsed = function() {
	var n = 0;

	for (var i = 0; i < this.tableSeats.length; i++) {
		var tournamentTableSeat = this.tableSeats[i];

		if (tournamentTableSeat.getUser())
			n++;
	}

	return n;
}

/**
 * Sit in user.
 * @method sitInUser
 */
TournamentTable.prototype.sitInUser = function(user, chips) {
	var available = [];

	for (var i = 0; i < this.tableSeats.length; i++)
		if (this.tableSeats[i].isAvailable())
			available.push(this.tableSeats[i])

	if (!available.length)
		throw new Error("no available seat for user");

	ArrayUtil.shuffle(available);
	var tableSeat = available[0];

	tableSeat.sitInUser(user, chips);

	return tableSeat;
}

module.exports = TournamentTable;