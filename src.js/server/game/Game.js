/**
 * Server.
 * @module server
 */

const CardData = require("../../data/CardData");
const ArrayUtil = require("../../utils/ArrayUtil");
const AskBlindState = require("./AskBlindState");
const EventEmitter=require("events");

/**
 * Represents one game of poker.
 * @class Game
 * @module server
 */
class Game extends EventEmitter {
	constructor(table) {
		super();

		this.table = table;
		this.id = null;
		this.gameState = null;
		this.gameSeats = [];
		this.gameSeatPrompt = null;
		this.communityCards = [];
		this.rake = 0;
		this.fixedDeck = null;
	}

	/**
	 * Start the game.
	 * @method start
	 */
	start() {
		var params = {
			parentId: this.table.getStartGameParentId()
		};

		var startFunction = this.table.getStartGameFunctionName();
		var backend = this.table.getServices().getBackend();

		backend.call(startFunction, params).then(
			this.onStartCallComplete.bind(this),
			this.onStartCallError.bind(this)
		);
	}

	/**
	 * Start game call complete.
	 * @method onStartCallComplete
	 * @private
	 */
	onStartCallComplete=(result)=>{
		this.id = result.gameId;

		this.table.advanceDealer();
		this.deck = [];

		if (this.fixedDeck) {
			for (var i = 0; i < this.fixedDeck.length; i++)
				this.deck.push(new CardData.fromString(this.fixedDeck[i]));
		} else {
			for (var i = 0; i < 52; i++)
				this.deck.push(new CardData(i));

			ArrayUtil.shuffle(this.deck);
		}

		//console.log("table: " + this.table);
		this.send(this.table.getHandInfoMessage());

		this.setGameState(new AskBlindState());
	}

	/**
	 * Start call error.
	 * @method onStartCallError
	 * @private
	 */
	onStartCallError=()=>{
		console.log("error starting game, setting timeout");
		setTimeout(this.onErrorWaitTimer.bind(this), 10000);
	}

	/**
	 * Set fixed deck for debugging.
	 * @method setFixedDeck
	 */
	useFixedDeck(deck) {
		this.fixedDeck = deck;
	}

	/**
	 * Error wait timer.
	 * @method onErrorWaitTimer
	 * @private
	 */
	onErrorWaitTimer=()=>{
		console.log("error wait timer complete..");
		this.trigger(Game.FINISHED);
	}

	/**
	 * Get deck.
	 * @method getDeck
	 */
	getDeck() {
		return this.deck;
	}

	/**
	 * Get id.
	 * @method getId
	 */
	getId() {
		return this.id;
	}

	/**
	 * Get next card.
	 * @method getNextCard
	 */
	getNextCard() {
		if (!this.deck.length)
			throw new Error("no cards left!");

		return this.deck.shift();
	}

	/**
	 * Set and run game state.
	 * @method setGameState
	 */
	setGameState(gameState) {
		this.gameState = gameState;
		this.gameState.setGame(this);
		this.gameState.run();
	}

	/**
	 * The game is finished!
	 * @method notifyFinished
	 */
	notifyFinished() {
		//console.log("game finished: " + this.id);

		var params = {
			gameId: this.id,
			state: this.table.getLogState(),
			rake: this.rake,
			parentId: this.table.getStartGameParentId()
		};

		this.gameState = null;

		var backend = this.table.getServices().getBackend();

		backend.call(Backend.FINISH_GAME, params).then(
			this.onFinishCallComplete.bind(this),
			this.onFinishCallError.bind(this)
		);
	}

	/**
	 * Finish game call complete.
	 * @method onFinishCallComplete
	 * @private
	 */
	onFinishCallComplete=()=>{
		//console.log("*********** finish call complete...");
		this.trigger(Game.FINISHED);
	}

	/**
	 * Finish game call complete.
	 * @method onFinishCallComplete
	 * @private
	 */
	onFinishCallError=()=>{
		console.log("********* WARNING: finish game call failed");
		this.trigger(Game.FINISHED);
	}

	/**
	 * Get current game state.
	 * @method getGameState
	 */
	getGameState() {
		return this.gameState;
	}

	/**
	 * Get reference to table.
	 * @method getTable
	 */
	getTable() {
		return this.table;
	}

	/**
	 * Get game seat for seat index.
	 * @method getGameSeatForSeatIndex
	 */
	getGameSeatForSeatIndex(seatIndex) {
		for (let i = 0; i < this.gameSeats.length; i++) {
			var gameSeat = this.gameSeats[i];

			if (gameSeat.getSeatIndex() == seatIndex)
				return gameSeat;
		}

		//throw new Error("no one is sitting on: "+seatIndex);

		return null;
	}

	/**
	 * Get number of players in game.
	 * @method getNumInGame
	 */
	getNumInGame() {
		return this.gameSeats.length;
	}

	/**
	 * Add a game seat.
	 * @method addGameSeat
	 */
	addGameSeat(gameSeat) {
		var already = this.getGameSeatForSeatIndex(gameSeat.getSeatIndex());

		if (already && already != gameSeat)
			throw new Error("A game seat is already added for that index");

		else if (already)
			return;

		/*	if (this.getGameSeatForSeatIndex(gameSeat.getSeatIndex()))
				return;*/
		//throw new Error("A game seat is already added for that index");

		this.gameSeats.push(gameSeat);
	}

	/**
	 * To string.
	 * @method toString
	 */
	toString() {
		return "[Game]";
	}

	/**
	 * Send message to table.
	 * @method send
	 */
	send(message, params) {
		this.table.send(message,params);
	}

	/**
	 * Send message to table except to the seat.
	 * @method send
	 */
	sendExceptSeat(gameSeat, message, params) {
		this.table.sendExceptSeat(gameSeat.getTableSeat(),message,params);
	}

	/**
	 * Send state to connection.
	 * @method sendState
	 */
	sendState(connection) {
		var connectionGameSeat = this.getGameSeatByConnection(connection);

		if (this.gameSeatPrompt != null) {
			connection.send("timer",this.gameSeatPrompt.getCurrentTimerMessage());

			if (this.gameSeatPrompt.getConnection() == connection) {
				connection.send("buttons",this.gameSeatPrompt.getButtonsMessage());
			} else if (connectionGameSeat != null) {
				connectionGameSeat.sendPresets();
			}
		}

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			connection.send("bet",{
				seatIndex: gameSeat.getSeatIndex(),
				value: gameSeat.getBet()
			});

			if (gameSeat.hasCards()) {
				var m = new PocketCardsMessage(gameSeat.getSeatIndex());

				for (var c = 0; c < gameSeat.getPocketCards().length; c++) {
					var cardData = gameSeat.getPocketCards()[c];

					if (gameSeat.getProtoConnection() == protoConnection || gameSeat.isShowing())
						m.addCard(cardData);

					else
						m.addCard(new CardData(CardData.HIDDEN));
				}

				//console.log("sending pocket cards: " + JSON.stringify(m.serialize()));

				connection.send(m);
			}
		}

		if (this.getTotalPot())
			protoConnection.send(new PotMessage(this.getPots()));

		protoConnection.send(new CommunityCardsMessage(this.communityCards));
	}

	/**
	 * Set current game seat prompt
	 * @method setGameSeatPrompt
	 */
	setGameSeatPrompt(gameSeatPrompt) {
		if (gameSeatPrompt && this.gameSeatPrompt)
			throw new Error("There is already a game seat prompt!");

		this.gameSeatPrompt = gameSeatPrompt;
	}

	/**
	 * Close all connections and timeouts.
	 * This is used in exceptional cases, debugging etc.
	 * @method close
	 */
	close() {
		//console.log("hard close game, gameSeatPrompt=" + this.gameSeatPrompt);

		if (this.gameState)
			this.gameState.close();

		if (this.gameSeatPrompt)
			this.gameSeatPrompt.close();
	}

	/**
	 * Get game seats.
	 * @method getGameSeats
	 */
	getGameSeats() {
		return this.gameSeats;
	}

	/**
	 * Get community cards.
	 * @method getCommunityCards
	 */
	getCommunityCards() {
		return this.communityCards;
	}

	/**
	 * Number of players in the game.
	 * @method getNumPlayersRemaining
	 */
	getNumPlayersRemaining() {
		var remaining = 0;

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			if (!gameSeat.isFolded())
				remaining++;
		}

		return remaining;
	}

	/**
	 * Get total bets on table.
	 * @method getTotalBets
	 */
	getTotalBets() {
		var total = 0;

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];
			total += gameSeat.getBet();
		}

		return total;
	}

	/**
	 * Get pots.
	 * @method getPots
	 */
	getPots() {
		var last = 0;
		var limits = this.getUnfoldedPotContribs();
		var pots = [];

		for (var l = 0; l < limits.length; l++) {
			var limit = limits[l];

			pots.push(this.getSplitPot(last, limit));
			last = limit;
		}

		return pots;
	}

	/**
	 * Get total pot.
	 * @method getTotalPot
	 */
	getTotalPot() {
		var total = 0;

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			total += gameSeat.getPotContrib();
		}

		return total;
	}

	/**
	 * Get unique unfolded pot contribs.
	 * Sorted from lowest to highest.
	 * @method getUnfoldedPotContribs
	 */
	getUnfoldedPotContribs() {
		var contribs = [];

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			if (!gameSeat.isFolded()) {
				var contrib = gameSeat.getPotContrib();

				if (isNaN(contrib)) {
					console.log(gameSeat.getTableSeat().getUser());
					throw new Error("contrib is nan!");
				}

				if (contribs.indexOf(contrib) < 0)
					contribs.push(gameSeat.getPotContrib());
			}
		}

		//console.log("contribs are: " + contribs);

		contribs.sort(ArrayUtil.compareNumbers);

		return contribs;
	}

	/**
	 * Get the size of a split pot, with pot contributions between
	 * from and to. E. g. if we have three players, and their
	 * pot contributions are 3, 5 and 6. If this function would be
	 * called with 3 and 5 then this function would return 4. The first
	 * player, with pot contribution 3, does not contribute to this number,
	 * the two other players contribute 2 each.
	 * @method getSplitPot
	 */
	getSplitPot(from, to) {
		var pot = 0;

		//console.log("getting split pot "+from+" -> "+to);

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			if (gameSeat.getPotContrib() > from) {
				if (gameSeat.getPotContrib() > to)
					pot += to - from;

				else
					pot += gameSeat.getPotContrib() - from;
			}
		}

		return pot;
	}

	/**
	 * Set rake.
	 * @method setRake
	 */
	setRake(rake) {
		this.rake = rake;
	}

	/**
	 * Is this table seat in the game?
	 * @method isTableSeatInGame
	 */
	isTableSeatInGame(tableSeat) {
		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			if (gameSeat.getTableSeat() == tableSeat)
				return true;
		}

		return false;
	}

	/**
	 * Is join complete for the game?
	 * @method isJoinComplete
	 */
	isJoinComplete() {
		if (!this.gameState || this.gameState instanceof AskBlindState)
			return false;

		return true;
	}

	/**
	 * Get the game seat that is controlled by this proto connection.
	 * @method getGameSeatByProtoConnection
	 */
	getGameSeatByConnection(connection) {
		var tableSeat = this.table.getTableSeatByConnection(connection);

		if (!tableSeat)
			return null;

		for (var g = 0; g < this.gameSeats.length; g++) {
			var gameSeat = this.gameSeats[g];

			if (gameSeat.getTableSeat() == tableSeat)
				return gameSeat;
		}

		return null;
	}

	/**
	 * Get time to wait after games until starting the next one.
	 * @method getFinishDelay
	 */
	getHandFinishDelay() {
		return this.table.getHandFinishDelay();
	}
}

module.exports = Game;