/**
 * Server.
 * @module server
 */

const EventEmitter=require("events");

/**
 * Someone watching a table.
 * @class CashGameSpectator
 */
class CashGameSpectator extends EventEmitter{
	constructor(table, connection, user) {
		super();

		this.table = table;
		this.connection = connection;
		this.user = user;

		this.connection.on("close", this.onConnectionClose);
		this.connection.on("seatClick", this.onSeatClick);
		this.connection.on("chat", this.onChat);

		this.send("tableInfo",this.getTableInfoMessage());
		this.send("interfaceState");
		this.send("buttons");
	}

	/**
	 * Connection close.
	 * @method onConnectionClose
	 */
	onConnectionClose=()=>{
		console.log("table spectator connection close");
		this.emit("done",this);
	}

	/**
	 * Seat click.
	 * @method onSeatClick
	 */
	onSeatClick=(m)=>{
		if (!this.user)
			return;

		var tableSeat = this.table.getTableSeatBySeatIndex(m.getSeatIndex());

		if (!tableSeat || !tableSeat.isAvailable())
			return;

		if (this.table.isUserSeated(this.user))
			return;

		tableSeat.reserve(this.user, this.connection);

		console.log("seat click!!!");

		this.connection.off("close",this.onConnectionClose);
		this.connection.off("seatClick", this.onSeatClick);
		this.connection.off("chat", this.onChat);

		this.emit("done",this);
	}

	/**
	 * Send a message to this table spectator.
	 * @method send
	 */
	send(m, params) {
		if (this.connection)
			this.connection.send(m,params);
	}

	/**
	 * On chat.
	 * @method onChat
	 */
	onChat=(message)=>{
		if (!this.user)
			return;

		this.table.chat(this.user, message.text);
	}

	/**
	 * Get TableInfoMessage to be sent to this TableSpectrator.
	 * @method getTableInfoMessage
	 */
	getTableInfoMessage() {
		if (!this.user) {
			return {
				text: "You need to be logged in to play."
			};
		}

		if (this.table.isUserSeated(this.user)) {
			var s = "You are currently logged in from another computer.\n\n" +
				"This connection is passive.";

			return {
				text: s
			};
		} else if (this.table.isFull()) {
			return {
				text: "This table is full at the moment."
			}
		} else {
			return {
				text: "Welcome!\n\nPlease click on an empty seat to join the game!"
			}
		}
	}

	/**
	 * Get connection.
	 * @method getProtoConnection
	 */
	getConnection() {
		return this.connection;
	}

	/**
	 * Close.
	 * @method close
	 */
	close() {
		if (this.connection)
			this.connection.close();
	}
}

module.exports = CashGameSpectator;