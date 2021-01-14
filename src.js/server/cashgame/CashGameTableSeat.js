/**
 * Server.
 * @module server
 */

const BaseTableSeat=require("../table/BaseTableSeat");
const CashGameUser=require("./CashGameUser");
const TableSeatSettings=require("../table/TableSeatSettings");

/**
 * A table seat. This class represents a seat in a cash game.
 *
 * The management of the seated user at this TableSeat is handled
 * using the `reserve` and `leaveTable` methods.
 * @class TableSeat
 * @extends BaseTableSeat
 */
class CashGameTableSeat extends BaseTableSeat {
	constructor(table, seatIndex) {
		super(table,seatIndex);

		this.tableSeatUser = null;
	}

	/**
	 * Is thie seat available?
	 * @method isAvailable
	 */
	isAvailable() {
		if (this.active && !this.tableSeatUser && this.table.isSitInAllowed())
			return true;

		else
			return false;
	}

	/**
	 * Set active. This is only done when reconfiguring the table.
	 * Not while someone is sitting there!
	 * @method setActive
	 */
	setActive=function(active) {
		if (this.tableSeatUser)
			throw new Error("Can't change active state if someone is sitting on the seat!");

		this.active = active;
	}

	/**
	 * Get currently seated user.
	 * @method getUser
	 */
	getUser() {
		if (!this.tableSeatUser)
			return null;

		return this.tableSeatUser.getUser();
	}

	/**
	 * Reserve seat for the specified user, connecting from the specified connection.
	 *
	 * At this point, the TableSeat will assume responsibility and manage the
	 * user as seated at this seat. The TableSeat may only have one seated user,
	 * and needs to do a bit of clean up before switching user, therefore this function
	 * will fail if there is already a user seated at this TableSeat.
	 *
	 * The TableSeat will manage the seated user until the associated CashGameUser object
	 * signals that it is complete, at which point a the associated user will be reset.
	 *
	 * It is possible to request that this class relinquishes the associated user using
	 * the `leaveTable` method, but this is an asynchronous operation.
	 *
	 * The is no mechanism to know when the associated user is reset.
	 *
	 * The user will not be immediately ready to play at the table, since the user needs
	 * to buy chips before doing so. The `TableSeat.READY` event is used to signal when
	 * the user is ready to play.
	 * @method reserve
	 * @param {User} user The user that reserves the seat.
	 * @param {ProtoConnection} protoConnection The connection to the user.
	 */
	reserve(connection) {
		if (!this.active)
			throw "This seat is not active";

		if (this.tableSeatUser)
			throw "Someone is sitting here";

		this.setConnection(connection);
		this.tableSeatUser = new CashGameUser(this, connection.getUser());
		this.tableSeatUser.on("ready", this.onTableSeatUserReady);
		this.tableSeatUser.on("done", this.onTableSeatUserDone);
		this.tableSeatUser.sitIn();

		this.send("checkbox",{
			id: "autoPostBlinds"
		})

		let settings=this.getSettings();
		for (let id of TableSeatSettings.AVAILABLE_SETTINGS) {
			this.send("checkbox",{
				id: id,
				checked: this.getSetting(id)
			});
		}
	}

	/**
	 * Set connection.
	 * @method setConnection
	 */
	setConnection(connection) {
		super.setConnection(connection);

		if (this.connection) {
			if (this.tableSeatUser) {
				if (this.tableSeatUser.isSitout()) {
					this.send("buttons",{
						buttons: ["leave","imBack"]
					});
				}
			}

			this.send("tableInfo",this.getTableInfoMessage());

			this.send("interfaceState",{
				visibleButtons: [
					"autoMuckLosing",
					"sitOutNext",
					"autoPostBlinds"
				]
			});
		}
	}

	/**
	 * The table seat user is done.
	 * @method onTableSeatUserDone
	 * @private
	 */
	onTableSeatUserDone=()=>{
		console.log("*********** table seat user done!");

		let connection = this.getConnection();
		let user = this.tableSeatUser.getUser();

		this.tableSeatUser.off("ready", this.onTableSeatUserReady);
		this.tableSeatUser.off("done", this.onTableSeatUserDone);
		this.tableSeatUser = null;

		this.table.send("seatInfo",this.getSeatInfoMessage());

		this.setConnection(null);

		if (connection) {
			this.table.notifyNewConnection(connection);
		}

		this.table.sendTableInfoMessages();
		this.emit("idle");
	}

	/**
	 * Table seat ready.
	 * @method onTableSeatUserReady
	 * @private
	 */
	onTableSeatUserReady=()=>{
		this.emit("ready");
	}

	/**
	 * Is this table seat in the game.
	 * @method isInGame
	 */
	isInGame() {
		if (!this.tableSeatUser)
			return false;

		return this.tableSeatUser.isInGame();
	}

	/**
	 * Get chips.
	 * @method getChips
	 * @return {Number} The current number of chips for this seat.
	 */
	getChips() {
		if (!this.tableSeatUser)
			return 0;

		return this.tableSeatUser.getChips();
	}

	/**
	 * Make the user leave the table when possible.
	 *
	 * This is an asychronous operation, since we need to communicate with
	 * the backend before giving the user up.
	 * @method leaveTable
	 */
	leaveTable() {
		if (!this.tableSeatUser)
			return;

		this.tableSeatUser.leave();
	}

	/**
	 * Get SeatInfoMessage. This method is based on the implementation in the base class
	 * but adds a sitout label in case the seat is in sitout mode.
	 * @method getSeatInfoMessage
	 * @return {SeatInfoMessage}
	 */
	getSeatInfoMessage() {
		var m = super.getSeatInfoMessage();

		if (this.tableSeatUser && this.tableSeatUser.isReserved())
			m.chips="RESERVED";

		if (this.tableSeatUser && this.isSitout())
			m.chips="SIT OUT";

		return m;
	}

	/**
	 * Add or subtract chips.
	 * @method addChips
	 */
	addChips(value) {
		if (!this.tableSeatUser)
			throw new Error("no table seat user...");

		this.tableSeatUser.setChips(this.tableSeatUser.getChips() + value);
	}

	/**
	 * Is this seat sitting out?
	 * @method isSitout
	 */
	isSitout() {
		if (!this.tableSeatUser)
			return false;

		return this.tableSeatUser.isSitout();
	}

	/**
	 * Sit out the seated user.
	 * @method sitout
	 */
	sitout() {
		if (!this.tableSeatUser)
			throw new Error("trying to sit out a null user");

		this.tableSeatUser.sitout();
	}

	/**
	 * Get table info message.
	 * @method getTableInfoMessage
	 */
	getTableInfoMessage() {
		if (!this.tableSeatUser)
			return {};

		return this.tableSeatUser.getTableInfoMessage();
	}

	/**
	 * Get settings.
	 * @method getSettings
	 */
	getSettings() {
		if (!this.tableSeatUser)
			return null;

		return this.tableSeatUser.getSettings();
	}
}

module.exports = CashGameTableSeat;