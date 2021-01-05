/**
 * Server.
 * @module server
 */

var BaseTableSeat = require("../table/BaseTableSeat");
var CashGameUser = require("./CashGameUser");

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
	reserve = function(user, connection) {
		if (!this.active)
			throw "This seat is not active";

		if (this.tableSeatUser)
			throw "Someone is sitting here";

		this.setProtoConnection(protoConnection);
		this.tableSeatUser = new CashGameUser(this, user);
		this.tableSeatUser.on(CashGameUser.READY, this.onTableSeatUserReady, this);
		this.tableSeatUser.on(CashGameUser.DONE, this.onTableSeatUserDone, this);
		this.tableSeatUser.sitIn();

		this.send(new CheckboxMessage(CheckboxMessage.AUTO_POST_BLINDS, this.getSetting(CheckboxMessage.AUTO_POST_BLINDS)));
		this.send(new CheckboxMessage(CheckboxMessage.AUTO_MUCK_LOSING, this.getSetting(CheckboxMessage.AUTO_MUCK_LOSING)));
		this.send(new CheckboxMessage(CheckboxMessage.SITOUT_NEXT, this.getSetting(CheckboxMessage.SITOUT_NEXT)));
	}

	/**
	 * Set proto connection.
	 * @method setProtoConnection
	 */
	setConnection(connection) {
		super.setConnection(connection);

		if (this.connection) {
			if (this.tableSeatUser) {
				if (this.tableSeatUser.isSitout()) {
					var bm = new ButtonsMessage();
					bm.addButton(new ButtonData(ButtonData.LEAVE));
					bm.addButton(new ButtonData(ButtonData.IM_BACK));
					this.send(bm);
				}
			}

			this.send(this.getTableInfoMessage());

			var m = new InterfaceStateMessage();
			m.addVisibleButton(CheckboxMessage.AUTO_MUCK_LOSING);
			m.addVisibleButton(CheckboxMessage.SITOUT_NEXT);
			m.addVisibleButton(CheckboxMessage.AUTO_POST_BLINDS);
			this.send(m);
		}
	}

	/**
	 * The table seat user is done.
	 * @method onTableSeatUserDone
	 * @private
	 */
	onTableSeatUserDone=()=>{
		console.log("*********** table seat user done!");

		var protoConnection = this.getProtoConnection();
		var user = this.tableSeatUser.getUser();

		this.tableSeatUser.off(CashGameUser.READY, this.onTableSeatUserReady, this);
		this.tableSeatUser.off(CashGameUser.DONE, this.onTableSeatUserDone, this);
		this.tableSeatUser = null;

		this.table.send(this.getSeatInfoMessage());

		this.setProtoConnection(null);

		if (protoConnection) {
			this.table.notifyNewConnection(protoConnection, user);
		}

		this.table.sendTableInfoMessages();
		this.trigger(CashGameTableSeat.IDLE);
	}

	/**
	 * Table seat ready.
	 * @method onTableSeatUserReady
	 * @private
	 */
	onTableSeatUserReady=()=>{
		this.trigger(CashGameTableSeat.READY);
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
		var m = BaseTableSeat.prototype.getSeatInfoMessage.call(this);

		if (this.tableSeatUser && this.tableSeatUser.isReserved())
			m.setChips("RESERVED");

		if (this.tableSeatUser && this.isSitout())
			m.setChips("SIT OUT");

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
			return new TableInfoMessage();

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