var BotStrategy = require("./BotStrategy");
var StateCompleteMessage = require("../../src/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/proto/messages/ShowDialogMessage");
var SeatClickMessage = require("../../src/proto/messages/SeatClickMessage");
var SeatInfoMessage = require("../../src/proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../src/proto/messages/ButtonClickMessage");
var PayOutMessage = require("../../src/proto/messages/PayOutMessage");
var ButtonsMessage = require("../../src/proto/messages/ButtonsMessage");
var ButtonData = require("../../src/proto/data/ButtonData");
var inherits = require("inherits");

/**
 * Acts according to the sequence
 * @class BotSitInStrategy
 */
function BotActSequenceStrategy(buttonSequence) {
	BotStrategy.call(this);

	this.buttonSequence = buttonSequence;
	this.buttonSequenceIndex = 0;
}

inherits(BotActSequenceStrategy, BotStrategy);

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
		throw new Error("action is not available: " + action+ " available: "+this.botConnection.getButtons());

	this.botConnection.act(action);

	this.buttonSequenceIndex++;

	if (this.buttonSequenceIndex >= this.buttonSequence.length) {
		this.botConnection.removeMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
		console.log("act sequence complete");
		this.notifyComplete();
	}
}

module.exports = BotActSequenceStrategy;