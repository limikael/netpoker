/**
 * Server.
 * @module server
 */

/**
 * Abstract class representing the current state of the poker game.
 * @class GameState
 * @constructor
 */
class GameState {
	/**
	 * Set reference to game that this instance is a state for.
	 * @method setGame
	 */
	setGame(game) {
		this.game=game;
	}

	/**
	 * Run this state. This is an abstract method intended to be implemented by each state.
	 * @method run
	 */
	run() {
		throw new Error("abstract");
	}

	/**
	 * Hard close.
	 * @method close
	 */
	close() {
	}
}

module.exports = GameState;