var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var GameState = require("./GameState");

/**
 * Ask blind state.
 * @class AskBlindState
 */
function AskBlindState() {
	GameState.call(this);
}

FunctionUtil.extend(AskBlindState, GameState);

/**
 * Run the state.
 * @method run
 */
AskBlindState.prototype.run=function() {
	
}

module.exports = AskBlindState;