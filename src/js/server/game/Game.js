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

module.exports = Game;