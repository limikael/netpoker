var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var CardData = require("../../proto/data/CardData");
var ArrayUtil = require("../../utils/ArrayUtil");
var AskBlindState = require("./AskBlindState");

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
 * Start game call complete.
 * @method onStartCallComplete
 * @private
 */
Game.prototype.onStartCallComplete = function(result) {
	this.id = result.gameId;

	this.table.advanceDealer();
	this.deck = [];
	for (var i = 0; i < 52; i++)
		this.deck.push(new CardData(i));

	ArrayUtil.shuffle(this.deck);
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

		/*if (gameSeatPrompt.gameSeat.tableSeat.connection == protoConnection)
			c.send(gameSeatPrompt.buttonsMessage);

		else
		if (connectionGameSeat != null)
			connectionGameSeat.sendPresets();*/
	}
}

/**
 * Set current game seat prompt
 * @method setGameSeatPrompt
 */
Game.prototype.setGameSeatPrompt = function(gameSeatPrompt) {
	this.gameSeatPrompt = gameSeatPrompt;
}

/**
 * Hard close.
 */
Game.prototype.close = function() {
	if (this.gameState)
		this.gameState.close();
}

/**
 * Get game seats.
 * @method getGameSeats
 */
Game.prototype.getGameSeats = function() {
	return this.gameSeats;
}

module.exports = Game;