/**
 * Abstract class representing the current state of the poker game.
 * @class GameState
 * @constructor
 */
function GameState() {}

/**
 * Set reference to game that this instance is a state for.
 * @method setGame
 */
GameState.prototype.setGame = function(game) {
	this.game = game;
}

/**
 * Run this state. This is an abstract method intended to be implemented by each state.
 * @method run
 */
GameState.prototype.run = function() {
	throw new Error("abstract");
}

/**
 * Hard close.
 * @method close
 */
GameState.prototype.close = function() {}

module.exports = GameState;