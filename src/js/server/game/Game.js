var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var CardData = require("../../proto/data/CardData");
var ArrayUtil = require("../../utils/ArrayUtil");

/**
 * Game.
 */
function Game(table) {
	EventDispatcher.call(this);

	this.table = table;
	this.id = null;
}

FunctionUtil.extend(Game, EventDispatcher);

Game.FINISHED = "finished";

Game.ERROR_WAIT = 10000;

/**
 * Start the game.
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
 */
Game.prototype.onStartCallComplete = function(result) {
	this.id = result.gameId;

	//this.table.advanceDealer();
	this.deck = [];
	for (var i = 0; i < 52; i++)
		this.deck.push(new CardData(i));

	ArrayUtil.shuffle(this.deck);
}

/**
 * Start call error.
 */
Game.prototype.onStartCallError = function() {
	console.log("error starting game");
	setTimeout(this.onErrorWaitTimer.bind(this), Game.ERROR_WAIT);
}

/**
 * Error wait timer.
 */
Game.prototype.onErrorWaitTimer = function() {
	this.trigger(Game.FINISHED);
}

/**
 * Get deck.
 */
Game.prototype.getDeck = function() {
	return this.deck;
}

/**
 * Get id.
 */
Game.prototype.getId = function() {
	return this.id;
}

/**
 * Get next card.
 */
Game.prototype.getNextCard=function() {
	return this.deck.shift();
}

module.exports = Game;