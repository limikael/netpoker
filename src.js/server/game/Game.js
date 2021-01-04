/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var CardData = require("../../proto/data/CardData");
var BetMessage = require("../../proto/messages/BetMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var CommunityCardsMessage = require("../../proto/messages/CommunityCardsMessage");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var ArrayUtil = require("../../utils/ArrayUtil");
var AskBlindState = require("./AskBlindState");
var Backend = require("../backend/Backend");
var ArrayUtil = require("../../utils/ArrayUtil");
var inherits = require("inherits");

/**
 * Represents one game of poker.
 * @class Game
 * @module server
 */
function Game(table) {
	EventDispatcher.call(this);

	//console.log("***** creating game...");

	this.table = table;
	this.id = null;
	this.gameState = null;
	this.gameSeats = [];
	this.gameSeatPrompt = null;
	this.communityCards = [];
	this.rake = 0;
	this.fixedDeck = null;
}

inherits(Game, EventDispatcher);

Game.FINISHED = "finished";

Game.ERROR_WAIT = 10000;

/**
 * Start the game.
 * @method start
 */
Game.prototype.start = function() {
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
 * Set fixed deck for debugging.
 * @method setFixedDeck
 */
Game.prototype.useFixedDeck = function(deck) {
	this.fixedDeck = deck;
}

/**
 * Start game call complete.
 * @method onStartCallComplete
 * @private
 */
Game.prototype.onStartCallComplete = function(result) {
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

	console.log("table: " + this.table);
	this.send(this.table.getHandInfoMessage());

	this.setGameState(new AskBlindState());
}

/**
 * Start call error.
 * @method onStartCallError
 * @private
 */
Game.prototype.onStartCallError = function() {
	console.log("error starting game, setting timeout");
	setTimeout(this.onErrorWaitTimer.bind(this), Game.ERROR_WAIT);
}

/**
 * Error wait timer.
 * @method onErrorWaitTimer
 * @private
 */
Game.prototype.onErrorWaitTimer = function() {
	console.log("error wait timer complete..");
	this.trigger(Game.FINISHED);
}

/**
 * Get deck.
 * @method getDeck
 */
Game.prototype.getDeck = function() {
	return this.deck;
}

/**
 * Get id.
 * @method getId
 */
Game.prototype.getId = function() {
	return this.id;
}

/**
 * Get next card.
 * @method getNextCard
 */
Game.prototype.getNextCard = function() {
	if (!this.deck.length)
		throw new Error("no cards left!");

	return this.deck.shift();
}

/**
 * Set and run game state.
 * @method setGameState
 */
Game.prototype.setGameState = function(gameState) {
	this.gameState = gameState;
	this.gameState.setGame(this);
	this.gameState.run();
}

/**
 * The game is finished!
 * @method notifyFinished
 */
Game.prototype.notifyFinished = function() {
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
Game.prototype.onFinishCallComplete = function() {
	//console.log("*********** finish call complete...");
	this.trigger(Game.FINISHED);
}

/**
 * Finish game call complete.
 * @method onFinishCallComplete
 * @private
 */
Game.prototype.onFinishCallError = function() {
	console.log("********* WARNING: finish game call failed");
	this.trigger(Game.FINISHED);
}

/**
 * Get current game state.
 * @method getGameState
 */
Game.prototype.getGameState = function() {
	return this.gameState;
}

/**
 * Get reference to table.
 * @method getTable
 */
Game.prototype.getTable = function() {
	return this.table;
}

/**
 * Get game seat for seat index.
 * @method getGameSeatForSeatIndex
 */
Game.prototype.getGameSeatForSeatIndex = function(seatIndex) {
	for (i = 0; i < this.gameSeats.length; i++) {
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
Game.prototype.getNumInGame = function() {
	return this.gameSeats.length;
}

/**
 * Add a game seat.
 * @method addGameSeat
 */
Game.prototype.addGameSeat = function(gameSeat) {
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
Game.prototype.toString = function() {
	return "[Game]";
}

/**
 * Send message to table.
 * @method send
 */
Game.prototype.send = function(m) {
	this.table.send(m);
}

/**
 * Send message to table except to the seat.
 * @method send
 */
Game.prototype.sendExceptSeat = function(m, gameSeat) {
	this.table.sendExceptSeat(m, gameSeat.getTableSeat());
}

/**
 * Send state to connection.
 * @method sendState
 */
Game.prototype.sendState = function(protoConnection) {
	var connectionGameSeat = this.getGameSeatByProtoConnection(protoConnection);

	if (this.gameSeatPrompt != null) {
		protoConnection.send(this.gameSeatPrompt.getCurrentTimerMessage());

		if (this.gameSeatPrompt.getProtoConnection() == protoConnection) {
			protoConnection.send(this.gameSeatPrompt.getButtonsMessage());
		} else if (connectionGameSeat != null) {
			connectionGameSeat.sendPresets();
		}
	}

	for (var g = 0; g < this.gameSeats.length; g++) {
		var gameSeat = this.gameSeats[g];

		protoConnection.send(new BetMessage(gameSeat.getSeatIndex(), gameSeat.getBet()));

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

			protoConnection.send(m);
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
Game.prototype.setGameSeatPrompt = function(gameSeatPrompt) {
	if (gameSeatPrompt && this.gameSeatPrompt)
		throw new Error("There is already a game seat prompt!");

	this.gameSeatPrompt = gameSeatPrompt;
}

/**
 * Close all connections and timeouts.
 * This is used in exceptional cases, debugging etc.
 * @method close
 */
Game.prototype.close = function() {
	console.log("hard close game, gameSeatPrompt=" + this.gameSeatPrompt);

	if (this.gameState)
		this.gameState.close();

	if (this.gameSeatPrompt)
		this.gameSeatPrompt.close();
}

/**
 * Get game seats.
 * @method getGameSeats
 */
Game.prototype.getGameSeats = function() {
	return this.gameSeats;
}

/**
 * Get community cards.
 * @method getCommunityCards
 */
Game.prototype.getCommunityCards = function() {
	return this.communityCards;
}

/**
 * Number of players in the game.
 * @method getNumPlayersRemaining
 */
Game.prototype.getNumPlayersRemaining = function() {
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
Game.prototype.getTotalBets = function() {
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
Game.prototype.getPots = function() {
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
Game.prototype.getTotalPot = function() {
	var total = 0;

	for (var g = 0; g < this.gameSeats.length; g++) {
		var gameSeat = this.gameSeats[g];

		total += gameSeat.getPotContrib();
	}

	return total;
}

/**
 * Get unique unfolded pot contribs.Sorted from lowest to highest.
 * @method getUnfoldedPotContribs
 */
Game.prototype.getUnfoldedPotContribs = function() {
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
Game.prototype.getSplitPot = function(from, to) {
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
Game.prototype.setRake = function(rake) {
	this.rake = rake;
}

/**
 * Is this table seat in the game?
 * @method isTableSeatInGame
 */
Game.prototype.isTableSeatInGame = function(tableSeat) {
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
Game.prototype.isJoinComplete = function() {
	if (!this.gameState || this.gameState instanceof AskBlindState)
		return false;

	return true;
}

/**
 * Get the game seat that is controlled by this proto connection.
 * @method getGameSeatByProtoConnection
 */
Game.prototype.getGameSeatByProtoConnection = function(protoConnection) {
	var tableSeat = this.table.getTableSeatByProtoConnection(protoConnection);

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
Game.prototype.getHandFinishDelay = function() {
	return this.table.getHandFinishDelay();
}

module.exports = Game;