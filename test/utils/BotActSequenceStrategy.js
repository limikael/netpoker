var BotStrategy = require("./BotStrategy");
var FunctionUtil = require("../../src/js/utils/FunctionUtil");
var StateCompleteMessage = require("../../src/js/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/js/proto/messages/ShowDialogMessage");
var SeatClickMessage = require("../../src/js/proto/messages/SeatClickMessage");
var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../src/js/proto/messages/ButtonClickMessage");
var PayOutMessage = require("../../src/js/proto/messages/PayOutMessage");
var ButtonsMessage = require("../../src/js/proto/messages/ButtonsMessage");
var ButtonData = require("../../src/js/proto/data/ButtonData");

/**
 * Acts according to the sequence
 * @class BotSitInStrategy
 */
function BotActSequenceStrategy(buttonSequence) {
	BotStrategy.call(this);

	this.buttonSequence = buttonSequence;
	this.buttonSequenceIndex = 0;
}

FunctionUtil.extend(BotActSequenceStrategy, BotStrategy);

/**
 * Run the strategy.
 * @method run
 */
BotActSequenceStrategy.prototype.run = function() {
	this.botConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);

	if (this.botConnection.getButtons()) {
		this.act();
	}
}

/**
 * Buttons.
 * @method onButtonsMessage
 * @private
 */
BotActSequenceStrategy.prototype.onButtonsMessage = function() {
	this.act();
}

/**
 * Act on the current action.
 * @method act
 */
BotActSequenceStrategy.prototype.act = function() {
	if (this.buttonSequenceIndex >= this.buttonSequence.length)
		throw new Error("we are already done, len="+this.buttonSequence.length);

	var action = this.buttonSequence[this.buttonSequenceIndex];

	console.log("will act with: "+action);

	if (!this.botConnection.isActionAvailable(action))
		throw new Error("action is not available: " + action);

	this.botConnection.act(action);

	this.buttonSequenceIndex++;

	if (this.buttonSequenceIndex >= this.buttonSequence.length) {
		this.botConnection.removeMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
		console.log("act sequence complete");
		this.notifyComplete();
	}
}

module.exports = BotActSequenceStrategy;