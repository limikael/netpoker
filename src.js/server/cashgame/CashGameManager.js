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
		this.processTableList(res.tables);
		this.backendCallInProgress=false;
	}

	processTableList(tableDatas) {
		console.log("Processing table list, length="+tableDatas.length);

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

				var table = new CashGameTable(this.server, tableData);
				table.on("idle", this.onTableIdle);
				table.on("numPlayersChange", this.onTableNumPlayersChange);

				if (this.fixedDeck)
					table.useFixedDeck(this.fixedDeck);

				this.tables.push(table);
			}
		}

		var tablesCopy = this.tables.concat();

		for (i = 0; i < tablesCopy.length; i++) {
			var table = tablesCopy[i];

			if (this.currentRequestedIds.indexOf(table.getId()) < 0) {
				//console.log("stopping table: " + table.getId());
				table.stop();

				if (table.isIdle()) {
					//console.log("the table is idle on stop, we can remove it");
					this.closeAndRemoveTable(table);
				}
			}
		}

		for (var i = 0; i < this.tables.length; i++) {
			var cashGameTable = this.tables[i];

			var p = {
				tableId: cashGameTable.getId(),
				numPlayers: cashGameTable.getNumInGame()
			};

			this.server.getBackend().call("notifyCashGameNumPlayers", p);
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

	async reloadTables() {
		if (this.backendCallInProgress)
			return;

		if (this.stopping) {
			//console.log("stopping, won't reload tables now");
			return;
		}

		//console.log("reloading tables");

		this.backendCallInProgress=true;
		let res=await this.server.getBackend().call("getCashGameTableList");
		this.processTableList(res.tables);
		this.backendCallInProgress=false;
	}

	/**
	 * Use fixed deck for debugging.
	 * @method useFixedDeck
	 */
	useFixedDeck(deck) {
		this.fixedDeck = deck;

		for (var i = 0; i < this.tables.length; i++)
			this.tables[i].useFixedDeck(deck);
	}

	/**
	 * Hard close.
	 * @method close
	 */
	close() {
		for (var i = 0; i < this.tables.length; i++)
			this.tables[i].close();
	}

	/**
	 * Stop.
	 * @method stop
	 */
	stop() {
		this.stopping = true;

		for (var i = 0; i < this.tables.length; i++)
			this.tables[i].stop();
	}

	/**
	 * A table became idle, remove it.
	 * @method onTableIdle
	 * @private
	 */
	onTableIdle=(table)=>{
		//console.log("table is idle, id=" + table.getId());

		if (this.currentRequestedIds.indexOf(table.getId()) < 0) {
			this.closeAndRemoveTable(table);
		}

		if (this.isIdle())
			this.emit("idle");
	}

	/**
	 * Close and remove the table.
	 * @method closeAndRemoveTable
	 * @private
	 */
	closeAndRemoveTable(table) {
		table.close();
		table.off("idle", this.onTableIdle);
		table.off("numPlayersChange", this.onTableNumPlayersChange);
		ArrayUtil.remove(this.tables, table);
	}

	/**
	 * Are we idle?
	 * @method isIdle
	 */
	isIdle() {
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
	onTableNumPlayersChange=(cashGameTable)=>{
		this.emit("numPlayersChange");

		console.log("num players change for table: " + cashGameTable);

		var p = {
			tableId: cashGameTable.getId(),
			numPlayers: cashGameTable.getNumInGame()
		};

		this.server.getBackend().call("notifyCashGameNumPlayers", p);
	}

	/**
	 * Get tables.
	 * @method getTables
	 */
	getTables() {
		return this.tables;
	}
}

module.exports = CashGameManager;