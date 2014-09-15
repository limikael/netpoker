var GameState = require("./GameState");
var FunctionUtil = require("../../utils/FunctionUtil");

/**
 * Manage a round of beting.
 * @class RoundState
 */
function RoundState() {
	GameState.call(this);
}

FunctionUtil.extend(RoundState, GameState);

/**
 * Run the state.
 * @method run
 */
RoundState.prototype.run = function() {
	this.dealPocketCards();
}

/**
 * Deal pocket cards.
 * @method dealPocketCards
 */
RoundState.prototype.dealPocketCards=function() {
	console.log("dealing pocket cards......");
}

module.exports = RoundState;