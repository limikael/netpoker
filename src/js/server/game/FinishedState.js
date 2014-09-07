var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var GameState = require("./GameState");
var DelayMessage = require("../../proto/messages/DelayMessage");
var ClearMessage = require("../../proto/messages/ClearMessage");

/**
 * The game is finished. We do a wait and then clear the table,
 * and then we notify the game object that the game is finished.
 * @class FinishedState
 */
function FinishedState() {
	GameState.call(this);
}

FunctionUtil.extend(FinishedState, GameState);

FinishedState.FINISH_DELAY = 3000;

/**
 * Run the state.
 * @method run
 */
FinishedState.prototype.run = function() {
	console.log("**** finished state");
	this.game.getTable().send(new DelayMessage(FinishedState.FINISH_DELAY));
	setTimeout(this.onTimout.bind(this), FinishedState.FINISH_DELAY);
}

/**
 * The timeout is complete.
 * @method onTimout
 * @private
 */
FinishedState.prototype.onTimout = function() {
	var clear = [
		ClearMessage.BETS,
		ClearMessage.POT,
		ClearMessage.CARDS
	];

	this.game.getTable().send(new ClearMessage(clear));
	this.game.notifyFinished();
}

module.exports = FinishedState;