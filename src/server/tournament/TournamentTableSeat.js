/**
 * Server.
 * @module server
 */

var BaseTableSeat = require("../table/BaseTableSeat");

/**
 * A table seat. This class represents a seat in a tournament.
 * @class TournamentTableSeat
 * @extends BaseTableSeat
 */
function TournamentTableSeat(tournamentTable, seatIndex, active) {
	BaseTableSeat.call(this, tournamentTable, seatIndex, active);
}

module.exports = TournamentTableSeat;