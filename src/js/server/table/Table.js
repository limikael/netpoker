var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var BaseTable = require("./BaseTable");
var TableUtil = require("./TableUtil");
var TableSeat = require("./TableSeat");
var TableSpectator = require("./TableSpectator");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var ArrayUtil = require("../../utils/ArrayUtil");

/**
 * Cash game table.
 * @class Table
 */
function Table(config) {
	if (!config.numseats)
		throw new Error("Table config doesn't have number of seats");

	this.id = config.id;

	this.setupSeats(config.numseats);

	BaseTable.call(this);

	this.tableSpectators = [];
}

FunctionUtil.extend(Table, BaseTable);

/**
 * Setup seats.
 * @method setupSeats
 * @private
 */
Table.prototype.setupSeats = function(numseats) {
	var activeSeatIndices = TableUtil.getActiveSeatIndices(numseats);
	this.tableSeats = [];

	for (var i = 0; i < 10; i++) {
		var ts = new TableSeat(this, i, activeSeatIndices.indexOf(i) >= 0);
		this.tableSeats.push(ts);
	}
}

/**
 * New connection.
 * @method notifyNewConnection
 */
Table.prototype.notifyNewConnection = function(protoConnection, user) {
	var ts = new TableSpectator(this, protoConnection, user);
	ts.on(TableSpectator.DONE, this.onTableSpectatorDone, this);

	this.tableSpectators.push(ts);

	this.sendState(protoConnection);
}

/**
 * Table spectator done.
 */
Table.prototype.onTableSpectatorDone = function(e) {
	var tableSpectator = e.target;

	ArrayUtil.remove(this.tableSpectators, tableSpectator);
	tableSpectator.off(TableSpectator.DONE, this.onTableSpectatorDone, this);
}

/** 
 * Send state.
 * @method sendState
 */
Table.prototype.sendState = function(protoConnection) {
	protoConnection.send(new StateCompleteMessage());
}

/**
 * Get id.
 * @method getId
 */
Table.prototype.getId = function() {
	return this.id;
}

module.exports = Table;