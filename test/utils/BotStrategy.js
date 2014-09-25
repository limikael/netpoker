var EventDispatcher=require("../../src/js/utils/EventDispatcher");
var FunctionUtil=require("../../src/js/utils/FunctionUtil");

/**
 * Abstract class for something that the bot can do.
 * Apply it using botConnection.runStragety(strategy)
 * @class BotStrategy
 */
function BotStrategy() {
	this.botConnection=null;
	this.stopped=false;
}

FunctionUtil.extend(BotStrategy,EventDispatcher);

/**
 * Set reference to BotConnection
 * @method setBotConnection
 */
BotStrategy.prototype.setBotConnection=function(botConnection) {
	this.botConnection=botConnection;
}

/**
 * The strategy is complete.
 * @method notifyComplete
 */
BotStrategy.prototype.notifyComplete=function() {
	if (this.stopped)
		return;

	setTimeout(function() {
		this.trigger("complete");
	}.bind(this),0);
}

/**
 * Stop the strategy.
 * @method stop
 */
BotStrategy.prototype.stop=function() {
	this.stopped=true;
}

module.exports=BotStrategy;