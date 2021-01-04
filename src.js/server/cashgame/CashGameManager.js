/**
 * Server.
 * @module server
 */

const ArrayUtil = require("../../utils/ArrayUtil");
const CashGameTable = require("./CashGameTable");
const EventEmitter = require("events");

/**
 * Manage list of current cash game tables.
 * @class CashGameManager
 */
class CashGameManager extends EventEmitter {
	constructor(server) {
		super();

		this.server = server;
		this.tables = [];
		this.fixedDeck = null;
		this.backendCallInProgress = false;
		this.currentRequestedIds = [];
		this.stopping = false;
	}

	async initialize() {
		this.backendCallInProgress=true;
		let res=await this.server.getBackend().call("getCashGameTableList");
		this.processTableList(res);
		this.backendCallInProgress=false;
		this.processTableList(res.taables);
	}

	processTableList(tableDatas) {
		var i;
		this.currentRequestedIds = [];

		for (i = 0; i < tableDatas.length; i++) {
			var tableData = tableDatas[i];
			this.currentRequestedIds.push(tableData.id);

			var table = this.getTableById(tableData.id);

			if (table) {
				console.log("reconfiguring table: " + tableData.id);
				table.reconfigure(tableData);
			} else {
				console.log("starting table: " + tableData.id);

				var table = new this.CashGameTable(this.server, tableData);
				//table.on("idle", this.onTableIdle);
				//table.on("numPlayersChange", this.onTableNumPlayersChange);

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

		for (var i = 0; i < this.tables.length; i++) {
			var cashGameTable = this.tables[i];

			var p = {
				tableId: cashGameTable.getId(),
				numPlayers: cashGameTable.getNumInGame()
			};

			this.server.getBackend().call(Backend.NOTIFY_CASHGAME_NUM_PLAYERS, p);
		}
	}

	/**
	 * Find a table by id.
	 * @method getTableById
	 */
	getTableById(id) {
		for (var i = 0; i < this.tables.length; i++)
			if (this.tables[i].getId() == id)
				return this.tables[i];

		return null;
	}
}

/**
 * Reload tables.
 * @method reloadTables
 */
/*CashGameManager.prototype.reloadTables = function() {
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
}*/

/**
 * Use fixed deck for debugging.
 * @method useFixedDeck
 */
/*CashGameManager.prototype.useFixedDeck = function(deck) {
	this.fixedDeck = deck;

	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].useFixedDeck(deck);
}*/

/**
 * Hard close.
 * @method close
 */
/*CashGameManager.prototype.close = function() {
	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].close();
}*/

/**
 * Stop.
 * @method stop
 */
/*CashGameManager.prototype.stop = function() {
	this.stopping = true;

	for (var i = 0; i < this.tables.length; i++)
		this.tables[i].stop();
}*/

/**
 * A table became idle, remove it.
 * @method onTableIdle
 * @private
 */
/*CashGameManager.prototype.onTableIdle = function(e) {
	var table = e.target;

	console.log("table is idle, id=" + table.getId());

	if (this.currentRequestedIds.indexOf(table.getId()) < 0) {
		this.closeAndRemoveTable(table);
	}

	if (this.isIdle())
		this.trigger(CashGameManager.IDLE);
}*/

/**
 * Close and remove the table.
 * @method closeAndRemoveTable
 * @private
 */
/*CashGameManager.prototype.closeAndRemoveTable = function(table) {
	table.close();
	table.off(CashGameTable.IDLE, this.onTableIdle, this);
	table.off(CashGameTable.NUM_PLAYERS_CHANGE, this.onTableNumPlayersChange, this);
	ArrayUtil.remove(this.tables, table);
}*/

/**
 * Are we idle?
 * @method isIdle
 */
/*CashGameManager.prototype.isIdle = function() {
	for (var i = 0; i < this.tables.length; i++)
		if (!this.tables[i].isIdle())
			return false;

	return true;
}*/

/**
 * Number of players change.
 * @method onTableNumPlayersChange
 * @private
 */
/*CashGameManager.prototype.onTableNumPlayersChange = function(ev) {
	var cashGameTable = ev.target;

	this.trigger(CashGameManager.NUM_PLAYERS_CHANGE);

	console.log("num players change for table: " + cashGameTable);

	var p = {
		tableId: cashGameTable.getId(),
		numPlayers: cashGameTable.getNumInGame()
	};

	this.services.getBackend().call(Backend.NOTIFY_CASHGAME_NUM_PLAYERS, p);
}*/

/**
 * Get tables.
 * @method getTables
 */
/*CashGameManager.prototype.getTables = function() {
	return this.tables;
}*/

module.exports = CashGameManager;