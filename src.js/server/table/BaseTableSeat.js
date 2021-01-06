/**
 * Server.
 * @module server
 */

const TableSeatSettings = require("./TableSeatSettings");
const EventEmitter = require("events");

/**
 * Base table seat. This is an abstract class representing a seat at a table.
 * The extending classes modify the behaivour slightly depending on the type
 * of the game, such as gash games, tournaments, etc.
 *
 * These are long lived objects, in the sense that they are active
 * as long as the table they belong to is active.
 *
 * The table seat may be "active" or "inactive". Inactive seats are just
 * placeholders and will be represented in the client by removing the
 * seatplate for the seat. For example, on a four player table, the remaining
 * six seats that cannot be used are the inactive seats.
 *
 * There may or may not be a user associated with the seat. The seated
 * user can be retreived using the getUser function.
 *
 * This class has an associated connection which is the connection to the user
 * currently controlling this seat. Note that the same user may be connected
 * to the same table from several clients, but each user may only have one
 * connection that controls a seat at a given time.
 * @class BaseTableSeat
 * @extends EventDispatcher
 */
class BaseTableSeat extends EventEmitter {
	constructor(table, seatIndex) {
		super();

		this.table = table;
		this.seatIndex = seatIndex;
		this.active = false;

		this.connection = null;
	}

	setActive(active) {
		this.active=active;
	}

	/**
	 * Is tihs seat active?
	 * @method isActive
	 */
	isActive = function() {
		return this.active;
	}

	/**
	 * Get seat index for this seat?
	 * @method getSeatIndex
	 */
	getSeatIndex = function() {
		return this.seatIndex;
	}

	/**
	 * Set the protoConnection currently associated with this seat.
	 * @method setProtoConnection
	 * @param {ProtoConnection} protoConnection
	 * @protected
	 */
	setConnection = function(connection) {
		if (this.connection) {
			this.connection.off("close", this.onConnectionClose);
			this.connection.off("buttonClick", this.onButtonClickMessage);
			this.connection.off("chat", this.onChat);
			this.connection.off("checkbox", this.onCheckboxMessage);
			this.connection.off("presetButtonClick", this.onPresetButtonClickMessage);
		}

		this.connection = connection;

		if (this.connection) {
			this.connection.on("close", this.onConnectionClose);
			this.connection.on("buttonClick", this.onButtonClickMessage);
			this.connection.on("chat", this.onChat);
			this.connection.on("checkbox", this.onCheckboxMessage);
			this.connection.on("presetButtonClick", this.onPresetButtonClickMessage);

			if (this.getSettings()) {
				for (let setting of TableSeatSettings.AVAILABLE_SETTINGS) {
					this.send("checkbox",{
						id: setting,
						value: this.getSetting(setting)
					});
				}
			}
		}
	}

	/**
	 * Get user currently seated as this BaseTableSeat.
	 *
	 * This is an abstract function, it is up to the concrete class
	 * extending this class to actually implement a mechanism for
	 * managing what user that is seated at this seat.
	 * @method getUser
	 */
	getUser() {
		throw new Error("abstract");
	}

	/**
	 * Get proto connection.
	 * @method getProtoConnection
	 */
	getConnection() {
		return this.connection;
	}

	/**
	 * Chat message.
	 * @method onChat
	 * @private
	 */
	onChat=(message)=>{
		this.table.chat(this.getUser(), message.text);
	}

	/**
	 * Button click message.
	 * @method onButtonClickMessage
	 * @private
	 */
	onButtonClickMessage=(message)=>{
		this.emit("buttonClick", message);
	}

	/**
	 * Preset button message.
	 * @method onPresetButtonsMessage
	 * @private
	 */
	onPresetButtonClickMessage=(message)=>{
		this.emit("presetButtonClick", message);
	}

	/**
	 * Connection was closed.
	 * @method onProtoConnectionClose
	 * @private
	 */
	onConnectionClose=()=> {
		this.setConnection(null);
		this.emit("close",this);
	}

	/**
	 * Get table.
	 * @method getTable
	 */
	getTable() {
		return this.table;
	}

	/**
	 * Get services.
	 * @method getServices
	 */
	getServer() {
		return this.table.getServer();
	}

	/**
	 * Send a message to the connection currently associated with this seat.
	 * @method send
	 * @param {Object} message The message to send.
	 */
	send(message, params) {
		//console.log(message);
		//console.log(params);

		if (this.connection)
			this.connection.send(message, params);
	}

	/**
	 * Get chips.
	 * @method getChips
	 */
	getChips() {
		throw new Error("abstract");
	}

	/**
	 * Is this table seat sitting out?
	 * @method isSitout
	 */
	isSitout() {
		throw new Error("abstract");
	}

	/**
	 * Get SeatInfoMessage representing this seat.
	 *
	 * Implementing classes may want to extend this function to modify
	 * how the seat appears depening on details of the game.
	 * @method getSeatInfoMessage
	 * @return {SeatInfoMessage}
	 */
	getSeatInfoMessage() {
		var m = {};

		m.seatIndex=this.getSeatIndex();
		m.active=this.isActive();

		if (this.getUser()) {
			var user = this.getUser();

			m.name=user.getName();
			m.sitout=this.isSitout();

			if (this.getChips() == 0)
				m.chips = "ALL IN";

			else
				m.chips = this.getChips();
		}

		return m;
	}

	/**
	 * Get TableSeatSettings.
	 * @method getSettings
	 */
	getSettings() {
		throw new Error("abstract");
	}

	/**
	 * Get setting.
	 * @method getSetting
	 */
	getSetting(settingId) {
		if (!this.getSettings())
			return false;

		return this.getSettings().get(settingId);
	}

	/**
	 * Checkbox message.
	 * @method onCheckboxMessage
	 */
	onCheckboxMessage=(m)=>{
		if (!this.getSettings())
			return;

		if (!TableSeatSettings.isSettingIdValid(m.id)) {
			console.log("warn, setting id not valid...");
			return;
		}

		this.getSettings().set(m.id, m.checked);
		this.emit("settingsChanged");
	}

	/**
	 * Is this seat in the game?
	 * @method isInGame
	 */
	isInGame() {
		throw new Error("abstract");
	}

	/**
	 * Add chips.
	 * @method addChips
	 */
	addChips() {
		throw new Error("abstract");
	}
}

module.exports = BaseTableSeat;