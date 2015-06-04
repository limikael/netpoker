/**
 * Server.
 * @module server
 */

var BaseTable = require("../table/BaseTable");
var inherits = require("inherits");
var TableUtil = require("../table/TableUtil");
var TournamentTableSeat = require("./TournamentTableSeat");

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

module.exports = TournamentTable;