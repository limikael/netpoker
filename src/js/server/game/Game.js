var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var CardData = require("../../proto/data/CardData");
var ArrayUtil = require("../../utils/ArrayUtil");
var AskBlindState = require("./AskBlindState");
var ArrayUtil = require("../../utils/ArrayUtil");

/**
 * Represents one game of poker.
 * @class Game
 */
function Game(table) {
	EventDispatcher.call(this);

	console.log("***** creating game...");

	this.table = table;
	this.id = null;
	this.gameState = null;
	this.gameSeats = [];
	this.gameSeatPrompt = null;
	this.communityCards = [];
	this.rake = 0;
	this.fixedDeck = null;
}

FunctionUtil.extend(Game, EventDispatcher);

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

	this.setGameState(new AskBlindState());
}

/**
 * Start call error.
 * @method onStartCallError
 * @private
 */
Game.prototype.onStartCallError = function() {
	console.log("error starting game");
	setTimeout(this.onErrorWaitTimer.bind(this), Game.ERROR_WAIT);
}

/**
 * Error wait timer.
 * @method onErrorWaitTimer
 * @private
 */
Game.prototype.onErrorWaitTimer = function() {
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
	this.gameState = null;
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
	if (this.getGameSeatForSeatIndex(gameSeat.getSeatIndex()))
		throw new Error("A game seat is already added for that index");

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
	if (this.gameSeatPrompt != null) {
		protoConnection.send(this.gameSeatPrompt.getCurrentTimerMessage());

		if (this.gameSeatPrompt.getProtoConnection() == protoConnection) {
			protoConnection.send(this.gameSeatPrompt.getButtonsMessage());
		}

		/*else
			if (connectionGameSeat != null)
				connectionGameSeat.sendPresets();*/
	}
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
 * Get unique unfolded pot contribs.Sorted from lowest to highest.
 * @method getUnfoldedPotContribs
 */
Game.prototype.getUnfoldedPotContribs = function() {
	var contribs = [];

	for (var g = 0; g < this.gameSeats.length; g++) {
		var gameSeat = this.gameSeats[g];

		if (!gameSeat.isFolded())
			if (contribs.indexOf(gameSeat.getPotContrib()) < 0)
				contribs.push(gameSeat.getPotContrib());
	}

	//
	console.log("contribs are: " + contribs);

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
}

module.exports = Game;