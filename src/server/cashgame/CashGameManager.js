/**
 * Server.
 * @module server
 */

var Backend = require("../../server/backend/Backend");
var EventDispatcher = require("yaed");
var ArrayUtil = require("../../utils/ArrayUtil");
var CashGameTable = require("./CashGameTable");
var inherits = require("inherits");

/**
 * Manage list of current cash game tables.
 * @class CashGameManager
 */
function CashGameManager(services) {
	EventDispatcher.call(this);

	this.services = services;
	this.tables = [];
	this.fixedDeck = null;
	this.initializedTriggered = false;
	this.backendCallInProgress = false;
	this.currentRequestedIds = [];
	this.stopping = false;

	// Override for testing.
	this.CashGameTable = CashGameTable;
}

inherits(CashGameManager, EventDispatcher);

CashGameManager.INITIALIZED = "initialized";
CashGameManager.IDLE = "idle";
CashGameManager.NUM_PLAYERS_CHANGE = "numPlayersChange";

/**
 * Initialize.
 * @method initialize
 */
CashGameManager.prototype.initialize = function() {
	this.backendCallInProgress = true;
	this.services.getBackend().call(Backend.GET_CASHGAME_TABLE_LIST).then(
		this.onTableListCallSuccess.bind(this),
		this.onTableListCallError.bind(this)
	);
}

/**
 * Reload tables.
 * @method reloadTables
 */
CashGameManager.prototype.reloadTables = function() {
	if (this.backendCallInProgress)
		return;

	if (this.stopping) {
		console.log("stopping, won't reload tables now");
		return;
	}

	console.log("reloading tables");

	this.services.getBackend().call(Backend.GET_CASHGAME_TABLE_LIST).then(
		this.onTableListCallSuccess.bind(this),
		this.onTableListCallError.bind(this)
	);
}

/**
 * Use fixed deck for debugging.
 * @method useFixedDeck
 */
CashGameManager.prototype.useFixedDeck = function(deck) {
	this.fixedDeck = deck;

	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].useFixedDeck(deck);
}

/**
 * Table fetch success.
 * @method onTableListCallSuccess
 * @private
 */
CashGameManager.prototype.onTableListCallSuccess = function(result) {
	console.log("got table info from backend");

	this.backendCallInProgress = false;

	var i;
	this.currentRequestedIds = [];

	for (i = 0; i < result.tables.length; i++) {
		var tableData = result.tables[i];
		this.currentRequestedIds.push(tableData.id);

		var table = this.getTableById(tableData.id);

		if (table) {
			console.log("reconfiguring table: " + tableData.id);
			table.reconfigure(tableData);
		} else {
			console.log("starting table: " + tableData.id);

			var table = new this.CashGameTable(this.services, tableData);
			table.on(CashGameTable.IDLE, this.onTableIdle, this);
			table.on(CashGameTable.NUM_PLAYERS_CHANGE, this.onTableNumPlayersChange, this);

			if (this.fixedDeck)
				table.useFixedDeck(this.fixedDeck);

			this.tables.push(table);
		}
	}

	var tablesCopy = this.tables.concat();

	for (i = 0; i < tablesCopy.length; i++) {
		var table = tablesCopy[i];

		if (this.currentRequestedIds.indexOf(table.getId()) < 0) {
			console.log("stopping table: " + table.getId());
			table.stop();

			if (table.isIdle()) {
				console.log("the table is idle on stop, we can remove it");
				this.closeAndRemoveTable(table);
			}
		}
	}

	if (!this.initializedTriggered) {
		this.initializedTriggered = true;
		this.trigger(CashGameManager.INITIALIZED);
	}
}

/**
 * Table fetch error.
 * @method onTableListCallError
 * @private
 */
CashGameManager.prototype.onTableListCallError = function(errorMessage) {
	this.backendCallInProgress = false;

	if (!this.initializedTriggered)
		throw new Error("Error fetching table list: " + errorMessage);

	console.log("warning, table reload failed: " + errorMessage);
}

/**
 * Find a table by id.
 * @method getTableById
 */
CashGameManager.prototype.getTableById = function(id) {
	for (var i = 0; i < this.tables.length; i++)
		if (this.tables[i].getId() == id)
			return this.tables[i];

	return null;
}

/**
 * Hard close.
 * @method close
 */
CashGameManager.prototype.close = function() {
	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].close();
}

/**
 * Stop.
 * @method stop
 */
CashGameManager.prototype.stop = function() {
	this.stopping = true;

	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].stop();
}

/**
 * A table became idle, remove it.
 * @method onTableIdle
 * @private
 */
CashGameManager.prototype.onTableIdle = function(e) {
	var table = e.target;

	console.log("table is idle, id=" + table.getId());

	if (this.currentRequestedIds.indexOf(table.getId()) < 0) {
		this.closeAndRemoveTable(table);
	}

	if (this.isIdle())
		this.trigger(CashGameManager.IDLE);
}

/**
 * Close and remove the table.
 * @method closeAndRemoveTable
 * @private
 */
CashGameManager.prototype.closeAndRemoveTable = function(table) {
	table.close();
	table.off(CashGameTable.IDLE, this.onTableIdle, this);
	table.off(CashGameTable.NUM_PLAYERS_CHANGE, this.onTableNumPlayersChange, this);
	ArrayUtil.remove(this.tables, table);
}

/**
 * Are we idle?
 * @method isIdle
 */
CashGameManager.prototype.isIdle = function() {
	for (var i = 0; i < this.tables.length; i++)
		if (!this.tables[i].isIdle())
			return false;

	return true;
}

/**
 * Number of players change.
 * @method onTableNumPlayersChange
 * @private
 */
CashGameManager.prototype.onTableNumPlayersChange = function() {
	this.trigger(CashGameManager.NUM_PLAYERS_CHANGE)
}

/**
 * Get tables.
 * @method getTables
 */
CashGameManager.prototype.getTables = function() {
	return this.tables;
}

module.exports = CashGameManager;