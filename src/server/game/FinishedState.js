/**
 * Server.
 * @module server
 */

var EventDispatcher = require("yaed");
var GameState = require("./GameState");
var DelayMessage = require("../../proto/messages/DelayMessage");
var ClearMessage = require("../../proto/messages/ClearMessage");
var inherits = require("inherits");

/**
 * The game is finished. We do a wait and then clear the table,
 * and then we notify the game object that the game is finished.
 * @class FinishedState
 */
function FinishedState() {
	GameState.call(this);
}

inherits(FinishedState, GameState);

FinishedState.FINISH_DELAY = 5000;

/**
 * Run the state.
 * @method run
 */
FinishedState.prototype.run = function() {
	console.log("**** finished state");
	//this.game.getTable().send(new DelayMessage(FinishedState.FINISH_DELAY));
	this.timeoutId = setTimeout(this.onTimout.bind(this), FinishedState.FINISH_DELAY);
}

/**
 * The timeout is complete.
 * @method onTimout
 * @private
 */
FinishedState.prototype.onTimout = function() {
	this.timeoutId = null;

	var clear = [
		ClearMessage.BETS,
		ClearMessage.POT,
		ClearMessage.CARDS
	];

	this.game.getTable().send(new ClearMessage(clear));
	this.game.notifyFinished();
}

/**
 * Hard close.
 * @method close
 */
FinishedState.prototype.close = function() {
	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
}

module.exports = FinishedState;