/**
 * Server.
 * @module server
 */

const EventEmitter=require("events");

/**
 * Base class for cash game and tournament tables.
 * @class BaseTable
 * @extends EventDispatcher
 */
class BaseTable extends EventEmitter {
	constructor(SeatClass) {
		super();

		this.tableSeats=[];
		for (var i = 0; i < 10; i++)
			this.tableSeats.push(new SeatClass(this,i));

		this.chatLines = new Array();

		this.dealerButtonIndex = -1;
		this.fixedDeck = null;
	}

	/**
	 * Get ante.
	 * @method getAnte
	 */
	getAnte() {
		return 0;
	}

	/**
	 * Use fixed deck for debugging.
	 * @method useFixedDeck
	 */
	useFixedDeck(deck) {
		this.fixedDeck = deck;
	}

	/**
	 * Get table seats.
	 * @method getTableSeats
	 */
	getTableSeats() {
		return this.tableSeats;
	}

	/**
	 * Get table seat by seat index.
	 * @method getTableSeatBySeatIndex
	 */
	getTableSeatBySeatIndex(seatIndex) {
		return this.tableSeats[seatIndex];
	}

	/**
	 * Get the TableSeat that this protoConnection is currently controllig,
	 * if any.
	 * @method getTableSeatByConnection
	 */
	getTableSeatByConnection(connection) {
		if (!connection)
			throw new Error("Can't get by null connection");

		for (var i = 0; i < this.tableSeats.length; i++) {
			var tableSeat = this.tableSeats[i];

			if (tableSeat.getConnection() == connection)
				return tableSeat;
		}

		return null;
	}

	/**
	 * Get number of seats that is in game.
	 * @method getNumInGame
	 */
	getNumInGame() {
		var cnt = 0;

		for (var i = 0; i < this.tableSeats.length; i++)
			if (this.tableSeats[i].isInGame())
				cnt++;

		return cnt;
	}

	/**
	 * Get number of active seats.
	 * @method getNumSeats
	 */
	getNumSeats() {
		var cnt = 0;

		for (var i = 0; i < this.tableSeats.length; i++)
			if (this.tableSeats[i].isActive())
				cnt++;

		return cnt;
	}

	/**
	 * Get number of available seats.
	 * @method getNumAvailableSeats
	 */
	getNumAvailableSeats() {
		var available = 0;

		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			if (tableSeat.isActive() && !tableSeat.getUser())
				available++;
		}

		return available;
	}

	/**
	 * Get parent id. This id is what should be used for the
	 * start game call for backend. For cashgames, this will
	 * represent the table id, for tournamets, it will
	 * represent the tournament id.
	 * @method getStartGameParentId
	 */
	getStartGameParentId() {
		throw new Error("abstract");
	}

	/**
	 * Get start function.
	 * @method getStartGameFunctionName
	 */
	getStartGameFunctionName() {
		throw new Error("abstract");
	}

	/**
	 * Get the index of the seat that has seated player, that
	 * comes after the from index. This function wraps around
	 * the table clockwise. If no player is seated at all,
	 * -1 will be returned.
	 * @method getNextSeatIndexInGame
	 */
	getNextSeatIndexInGame(from) {
		var cand = from + 1;
		var i = 0;

		if (cand >= 10)
			cand = 0;

		while (!this.tableSeats[cand].isInGame()) {
			cand++;
			if (cand >= 10)
				cand = 0;

			i++;
			if (i > 10)
				return -1;
		}

		return cand;
	}

	/**
	 * Send chat.
	 * @method chat
	 */
	chat(user, message) {
		var nick;
		var string;
		if (user != null)
			nick = user.name;
		else
			nick = "Dealer";

		this.rawChat(nick, message);
	}

	/**
	 * Raw chat string.
	 * @method rawChat
	 */
	rawChat(user, string) {
		var message = new ChatMessage(user, string);
		this.send(message);

		//console.log("user = " + user + ", string = " + string);

		this.chatLines.push({
			user: user,
			text: string
		});

		while (this.chatLines.length > 10)
			this.chatLines.shift();
	}

	/**
	 * Advance the dealer position to the next seated player.
	 * @method advanceDealer
	 */
	advanceDealer() {
		this.dealerButtonIndex = this.getNextSeatIndexInGame(this.dealerButtonIndex);

		this.send(new DealerButtonMessage(this.dealerButtonIndex, true));
	}

	/**
	 * Get dealer button index.
	 * @method getDealerButtonIndex
	 */
	getDealerButtonIndex() {
		return this.dealerButtonIndex;
	}

	/**
	 * Get stake.
	 * @method getStake
	 */
	getStake() {
		throw new Error("abstract");
	}

	/**
	 * Send.
	 * @method send
	 */
	send(m) {
		throw new Error("abstract");
	}

	/**
	 * Send except seat.
	 * @method sendExceptSeat
	 */
	sendExceptSeat(m, tableSeat) {
		throw new Error("abstract");
	}

	/**
	 * Get string for logging.
	 * @method getLogState
	 */
	getLogState() {
		var o = {};

		o.seats = [];

		for (var s = 0; s < this.tableSeats.length; s++) {
			var tableSeat = this.tableSeats[s];

			if (tableSeat.getUser()) {
				var d = {
					seatIndex: tableSeat.getSeatIndex(),
					userName: tableSeat.getUser().getName(),
					chips: tableSeat.getChips()
				};
				o.seats.push(d);
			}
		}

		return JSON.stringify(o);
	}

	/**
	 * Get table seat by user.
	 * @method getTableSeatByUser
	 */
	getTableSeatByUser(user) {
		if (!user)
			throw new Error("trying to get table seat for null user");

		for (var t = 0; t < this.tableSeats.length; t++) {
			var tableSeat = this.tableSeats[t];

			if (tableSeat.getUser() && tableSeat.getUser().getId() == user.getId())
				return tableSeat;
		}

		return null;
	}

	/**
	 * Get current game for this table.
	 * @method getCurrentGame
	 */
	getCurrentGame() {
		return this.currentGame;
	}

	/**
	 * Start game.
	 * @method startGame
	 * @protected
	 */
	startGame() {
		throw new Error("abstract");
	}

	/**
	 * Get services.
	 * @method getServices
	 */
	getServer() {
		throw new Error("abstract");
	}

	/**
	 * Get hand info message.
	 * @method getHandInfoMessage
	 */
	getHandInfoMessage() {
		throw new Error("abstract");
	}

	/**
	 * Send table info messages to all connections.
	 * @method sendTableInfoMessages
	 */
	sendTableInfoMessages() {
		throw new Error("abstract");
	}

	/**
	 * Rake percent.
	 * @method getRakePercent
	 */
	getRakePercent() {
		throw new Error("abstract");
	}
}

module.exports = BaseTable;