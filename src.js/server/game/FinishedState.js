/**
 * Server.
 * @module server
 */

var GameState = require("./GameState");

/**
 * The game is finished. We do a wait and then clear the table,
 * and then we notify the game object that the game is finished.
 * @class FinishedState
 */
class FinishedState extends GameState {
	constructor() {
		super();
	}

	/**
	 * Run the state.
	 * @method run
	 */
	run() {
		//console.log("**** finished state");
		this.timeoutId = setTimeout(this.onTimout, this.game.getHandFinishDelay());
	}

	/**
	 * The timeout is complete.
	 * @method onTimout
	 * @private
	 */
	onTimout=()=>{
		//console.log("finished state timeout");
		this.timeoutId = null;

		this.game.getTable().send("clear",{
			components: ["bets","pot","cards"]
		});

		this.game.notifyFinished();
	}

	/**
	 * Hard close.
	 * @method close
	 */
	close() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
}

module.exports = FinishedState;