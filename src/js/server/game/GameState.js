/**
 * The state of a game.
 * @class GameState
 */
function GameState() {

}

/**
 * Set reference to game.
 * @method setGame
 */
GameState.prototype.setGame = function(game) {
	this.game = game;
}

/**
 * Run this state.
 * @method run
 */
GameState.prototype.run = function() {
	throw new Error("abstract");
}

module.exports = GameState;