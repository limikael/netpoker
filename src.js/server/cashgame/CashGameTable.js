/**
 * Server.
 * @module server
 */

var BaseTable = require("../table/BaseTable");
var TableUtil = require("../table/TableUtil");
var CashGameTableSeat = require("./CashGameTableSeat");
var CashGameSpectator = require("./CashGameSpectator");
var ArrayUtil = require("../../utils/ArrayUtil");
var Game = require("../game/Game");

/**
 * Cash game table.
 * @class CashGameTable
 * @extends BaseTable
 */
class CashGameTable extends BaseTable {
	constructor(server, config) {
		super(CashGameTableSeat);

		this.validateConfig(config);

		this.name = config.name;
		this.id = config.id;
		this.currency = config.currency;
		this.stake = config.stake;
		this.minSitInAmount = config.minSitInAmount;
		this.maxSitInAmount = config.maxSitInAmount;
		this.rakePercent = config.rakePercent;

		this.setupSeats(config.numseats);

		this.tableSpectators = [];
		this.server = server;

		this.currentGame = null;
		this.stopped = false;

		this.previousHandId = null;
		this.reconfigureData = null;

		this.handFinishDelay = config.handFinishDelay;
		if (!this.handFinishDelay)
			this.handFinishDelay = 5000;
	}

	/**
	 * Validate table config.
	 * @method validateConfig
	 */
	validateConfig(config) {
		if (!config)
			throw new Error("That's not a config!");

		var expected = [
			"minSitInAmount", "maxSitInAmount", "stake",
			"numseats", "id", "currency", "name"
		];

		for (var i = 0; i < expected.length; i++)
			if (!config[expected[i]])
				throw new Error("Bad table config: missing: " + expected[i]);

		if (!config.rakePercent)
			config.rakePercent = 0;

		if (!config.numseats ||
			!config.id ||
			!config.currency ||
			!config.name ||
			!config.minSitInAmount ||
			!config.maxSitInAmount ||
			!config.stake)
			throw new Error("Bad table config");

		config.stake = parseFloat(config.stake);
		config.minSitInAmount = parseFloat(config.minSitInAmount);
		config.maxSitInAmount = parseFloat(config.maxSitInAmount);
		config.rakePercent = parseFloat(config.rakePercent);
		config.numseats = parseInt(config.numseats);
	}

	/**
	 * Actually perform reconfiguration.
	 * @method performReconfigure
	 */
	performReconfigure() {
		if (!this.reconfigureData)
			throw new Error("performReconfigure requires data");

		if (this.reconfigureData.id != this.id)
			throw new Error("can't reconfigure with different id");

		var config = this.reconfigureData;

		this.reconfigureData = null;

		this.validateConfig(config);

		this.name = config.name;
		this.id = config.id;
		this.currency = config.currency;
		this.stake = config.stake;
		this.minSitInAmount = config.minSitInAmount;
		this.maxSitInAmount = config.maxSitInAmount;
		this.rakePercent = config.rakePercent;

		var activeSeatIndices = TableUtil.getActiveSeatIndices(config.numseats);

		for (var i = 0; i < this.tableSeats.length; i++)
			this.tableSeats[i].setActive(activeSeatIndices.indexOf(i) >= 0);

		for (var i = 0; i < this.tableSpectators.length; i++) {
			var tableSpectator = this.tableSpectators[i];

			this.sendState(tableSpectator.getProtoConnection());
			tableSpectator.send(tableSpectator.getTableInfoMessage());
		}
	}

	/**
	 * Don't allow sit in if the table is stopped, and there is
	 * no current game. This means that we are just in the state
	 * right after the last game has finished, or the table is
	 * going to be reconfigured, and players are being sat out.
	 * @method isSitInAllowed
	 */
	isSitInAllowed() {
		if (this.currentGame)
			return true;

		if (this.stopped || this.reconfigureData)
			return false;

		return true;
	}

	/**
	 * Full?
	 * @method isFull
	 */
	isFull() {
		for (var i = 0; i < this.tableSeats.length; i++) {
			if (this.tableSeats[i].isAvailable())
				return false;
		}

		return true;
	}

	/**
	 * Setup seats.
	 * @method setupSeats
	 * @private
	 */
	setupSeats(numseats) {
		var activeSeatIndices = TableUtil.getActiveSeatIndices(numseats);

		for (var i = 0; i < 10; i++) {
			var ts = this.tableSeats[i];

			ts.on("close", this.onTableSeatClose, this);
			ts.on("ready", this.onTableSeatReady, this);
			ts.on("idle", this.onTableSeatIdle, this);

			ts.setActive(activeSeatIndices.indexOf(i) >= 0);
		}
	}

	/**
	 * Table seat close.
	 * If there is no game in progress, make the user leave the table.
	 * @method onTableSeatClose
	 */
	onTableSeatClose=(tableSeat)=> {
		if (this.currentGame)
			return;

		tableSeat.leaveTable();
	}

	/**
	 * Table seat ready.
	 * @method onTableSeatReady
	 */
	onTableSeatReady=()=>{
		this.emit("numPlayersChange");

		if (!this.currentGame && this.getNumInGame() >= 2 && !this.stopped)
			this.startGame();
	}

	/**
	 * Reconfigure. If a current game is in progress, it will
	 * be scheduled for after the game. If the new config is the same
	 * as the old one, nothing will happen.
	 * @method reconfigure
	 */
	reconfigure(config) {
		this.validateConfig(config);

		if (!this.reconfigureData &&
			this.name == config.name &&
			this.currency == config.currency &&
			this.stake == config.stake &&
			this.minSitInAmount == config.minSitInAmount &&
			this.maxSitInAmount == config.maxSitInAmount &&
			this.rakePercent == config.rakePercent &&
			this.getNumSeats() == config.numseats)
			return;

		this.reconfigureData = config;

		if (this.isIdle()) {
			this.performReconfigure();
			return;
		}

		if (!this.currentGame)
			for (i = 0; i < this.tableSeats.length; i++)
				this.tableSeats[i].leaveTable();
	}

	/**
	 * Table seat became idle.
	 * @method onTableSeatIdle
	 */
	onTableSeatIdle=()=>{
		if (this.isIdle()) {
			if (this.reconfigureData)
				this.performReconfigure();

			this.emit("idle");
		}

		this.emit("numPlayersChange");
	}

	/**
	 * New connection.
	 * @method notifyNewConnection
	 */
	notifyNewConnection(connection, user) {
		var alreadySeated = false;

		if (user) {
			for (var t = 0; t < this.tableSeats.length; t++) {
				var tableSeat = this.tableSeats[t];

				if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId()) {
					if (tableSeat.getProtoConnection()) {
						console.log("**** re seating...");

						var ts = new CashGameSpectator(this, tableSeat.getProtoConnection(), user);
						ts.on(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
						this.tableSpectators.push(ts);
					}

					tableSeat.setProtoConnection(protoConnection);
					alreadySeated = true;
				}
			}
		}

		if (!alreadySeated) {
			var ts = new CashGameSpectator(this, protoConnection, user);
			ts.on(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
			this.tableSpectators.push(ts);
		}

		this.sendState(connection);
	}

	/**
	 * Table spectator done.
	 * @method  onTableSpectatorDone
	 */
	onTableSpectatorDone=(tableSpectator)=>{
		ArrayUtil.remove(this.tableSpectators, tableSpectator);
		tableSpectator.off("done", this.onTableSpectatorDone);
	}

	/** 
	 * Send state.
	 * @method sendState
	 */
	sendState(connection) {
		for (let i = 0; i < this.tableSeats.length; i++)
			connection.send(this.tableSeats[i].getSeatInfoMessage());

		var b = new DealerButtonMessage(this.dealerButtonIndex);
		protoConnection.send(b);

		/*for (var i = 0; i < this.chatLines.length; i++)
			protoConnection.send(new ChatMessage(this.chatLines[i].user, this.chatLines[i].text));*/

		protoConnection.send(this.getHandInfoMessage());

		if (this.currentGame != null)
			this.currentGame.sendState(protoConnection);

		connection.send("stateComplete");
	}

	/**
	 * Get id.
	 * @method getId
	 */
	getId() {
		return this.id;
	}

	/**
	 * Is user seated?
	 * @method isUserSeated
	 */
	isUserSeated(user) {
		for (i = 0; i < this.tableSeats.length; i++) {
			var tableSeat = this.tableSeats[i];
			if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId())
				return true;
		}

		return false;
	}

	/**
	 * Get currency.
	 * @method getCurrency
	 */
	getCurrency() {
		return this.currency;
	}

	/**
	 * Get server.
	 * @method getServer
	 */
	getServer() {
		return this.server;
	}

	/**
	 * Get table name.
	 * @method getName
	 */
	getName() {
		return this.name;
	}

	/**
	 * Get table name.
	 * @method getMinSitInAmount
	 */
	getMinSitInAmount() {
		return this.minSitInAmount;
	}

	/**
	 * Get table name.
	 * @method getMaxSitInAmount
	 */
	getMaxSitInAmount() {
		return this.maxSitInAmount;
	}

	/**
	 * Start the game.
	 * @method startGame
	 */
	startGame() {
		if (this.currentGame)
			throw "There is already a game started";

		this.currentGame = new Game(this);

		if (this.fixedDeck)
			this.currentGame.useFixedDeck(this.fixedDeck);

		this.currentGame.on("finished", this.onCurrentGameFinished);
		this.currentGame.start();

		this.sendTableInfoMessages();
	}

	/**
	 * Current game finished.
	 * @method onCurrentGameFinished
	 */
	onCurrentGameFinished=()=>{
		if (this.currentGame.getId())
			this.previousHandId = this.currentGame.getId();

		this.currentGame.off(Game.FINISHED, this.onCurrentGameFinished, this);
		this.currentGame = null;

		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			// actualize rebuys here!

			if (tableSeat.isInGame()) {
				if (!tableSeat.getProtoConnection())
					tableSeat.leaveTable();

				else if (!tableSeat.getChips())
					tableSeat.leaveTable();

				else if (tableSeat.getSetting(CheckboxMessage.SITOUT_NEXT))
					tableSeat.sitout();
			}
		}

		this.send(this.getHandInfoMessage());

		if (this.stopped || this.reconfigureData) {
			for (var t = 0; t < this.tableSeats.length; t++) {
				var tableSeat = this.tableSeats[t];

				tableSeat.leaveTable();
			}

			return;
		}

		if (this.getNumInGame() >= 2)
			this.startGame();

		else {
			this.dealerButtonIndex = -1;
			this.send(new DealerButtonMessage(this.dealerButtonIndex));

			this.sendTableInfoMessages();
		}
	}

	/**
	 * Get parent id.
	 * @method getStartGameParentId
	 */
	getStartGameParentId() {
		return this.id;
	}

	/**
	 * Send TableInfoMessages to all seats.
	 * @method sendTableInfoMessages
	 */
	sendTableInfoMessages() {
		console.log("******* sending table info messages");

		var i;

		for (i = 0; i < this.tableSpectators.length; i++) {
			var tableSpectator = this.tableSpectators[i];

			tableSpectator.send(tableSpectator.getTableInfoMessage());
		}

		for (i = 0; i < this.tableSeats.length; i++) {
			var tableSeat = this.tableSeats[i];

			tableSeat.send(tableSeat.getTableInfoMessage());
		}
	}

	/**
	 * Get function to call on game start.
	 * @method getStartGameFunctionName
	 */
	getStartGameFunctionName() {
		return "startCashGame";
	}

	/**
	 * Get stake.
	 * @method getStake
	 */
	getStake() {
		return this.stake;
	}

	/**
	 * Send a message to all connections on the table.
	 * @method send
	 */
	send=function(message, params) {
		var i;

		for (i = 0; i < this.tableSpectators.length; i++)
			this.tableSpectators[i].send(message, params);

		for (i = 0; i < this.tableSeats.length; i++)
			this.tableSeats[i].send(message, params);
	}

	/**
	 * Send message to all connections except specified seat.
	 * @method sendExceptSeat
	 */
	sendExceptSeat=function(except, message, params) {
		var i;

		for (i = 0; i < this.tableSpectators.length; i++)
			this.tableSpectators[i].send(message);

		for (i = 0; i < this.tableSeats.length; i++)
			if (this.tableSeats[i] != except)
				this.tableSeats[i].send(message);
	}

	/**
	 * To string.
	 * @method toString
	 */
	toString() {
		return "[Table id=" + this.id + "]";
	}

	/**
	 * Stop.
	 * @method stop
	 */
	stop() {
		this.stopped = true;

		if (!this.currentGame)
			for (i = 0; i < this.tableSeats.length; i++)
				this.tableSeats[i].leaveTable();
	}

	/**
	 * Hard close.
	 * This should only be used after the table has been cleanly
	 * stopped and has become idle.
	 * @method close
	 */
	close() {
		if (!this.isIdle())
			console.log("warning: closing non idle table");

		//console.log("------------ hard close table, game=" + this.currentGame);
		if (this.currentGame) {
			this.currentGame.close();
			this.currentGame = null;
		}

		for (var i = 0; i < this.tableSpectators.length; i++) {
			var tableSpectator = this.tableSpectators[i];

			tableSpectator.off(CashGameSpectator.DONE, this.onTableSpectatorDone, this);
			tableSpectator.close();
		}

		this.tableSpectators = [];
	}

	/**
	 * Is this table idle? I.e. no game running and no users seated.
	 * @method isIdle
	 */
	isIdle() {
		if (this.currentGame)
			return false;

		for (let i = 0; i < this.tableSeats.length; i++)
			if (this.tableSeats[i].getUser())
				return false;

		return true;
	}

	/**
	 * Get rake percent.
	 * @method getRakePercent
	 */
	getRakePercent() {
		return this.rakePercent;
	}

	/**
	 * Get hand info message.
	 * @method getHandInfoMessage
	 */
	getHandInfoMessage() {
		var s = "";

		if (this.currentGame && this.currentGame.getId())
			s += "Current Hand: #" + this.currentGame.getId() + "\n";

		if (this.previousHandId)
			s += "Previous Hand: #" + this.previousHandId;

		return new HandInfoMessage(s);
	}

	/**
	 * Is this table stopped?
	 * @method isStopped
	 */
	isStopped() {
		return this.stopped;
	}

	/**
	 * Get hand finish delay.
	 * @method getHandFinishDelay
	 */
	getHandFinishDelay() {
		return this.handFinishDelay;
	}
}

module.exports = CashGameTable;