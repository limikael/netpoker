var GameState = require("./GameState");
var FunctionUtil = require("../../utils/FunctionUtil");

/**
 * Show or muck cards.
 * @class ShowMuckState
 */
function ShowMuckState() {
	GameState.call(this);
}

FunctionUtil.extend(ShowMuckState, GameState);

/**
 * Run.
 */
ShowMuckState.prototype.run = function() {
	console.log("not yet implemented...");
}

module.exports = ShowMuckState;