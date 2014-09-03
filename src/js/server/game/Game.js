var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Game.
 */
function Game(table) {
	EventDispatcher.call(this);

	this.table = table;
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
 *
 */
Game.prototype.onStartCallComplete = function() {

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

module.exports = Game;