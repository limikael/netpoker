var BotStrategy = require("./BotStrategy");
var FunctionUtil = require("../../src/utils/FunctionUtil");
var StateCompleteMessage = require("../../src/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/proto/messages/ShowDialogMessage");
var SeatClickMessage = require("../../src/proto/messages/SeatClickMessage");
var SeatInfoMessage = require("../../src/proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../src/proto/messages/ButtonClickMessage");
var PayOutMessage = require("../../src/proto/messages/PayOutMessage");
var ButtonsMessage = require("../../src/proto/messages/ButtonsMessage");
var ButtonData = require("../../src/proto/data/ButtonData");

/**
 * Checks until show/muck state.
 * @class BotSitInStrategy
 */
function BotCheckUntilEndStrategy() {
	BotStrategy.call(this);
}

FunctionUtil.extend(BotCheckUntilEndStrategy, BotStrategy);

/**
 * Run the strategy.
 * @method run
 */
BotCheckUntilEndStrategy.prototype.run = function() {
	this.botConnection.addMessageHandler(ButtonsMessage, this.onButtonsMessage, this);
	this.botConnection.addMessageHandler(PayOutMessage, this.onPayOutMessage, this);

	if (this.botConnection.getButtons()) {
		if (!this.botConnection.isActionAvailable(ButtonData.CHECK) &&
			!this.botConnection.isActionAvailable(ButtonData.CALL)) {
			throw new Error("buttons but no check or call");
		}
		this.act();
	}
}

/**
 * Pay out message.
 * @method onPayOutMessage
 * @private
 */
BotCheckUntilEndStrategy.prototype.onPayOutMessage = function() {
	console.log("********** check strategy complete, pay out");
	this.notifyComplete();
}

/**
 * Buttons.
 * @method onButtonsMessage
 * @private
 */
BotCheckUntilEndStrategy.prototype.onButtonsMessage = function() {
	this.act();
}

/**
 * Check until end.
 * @method act
 */
BotCheckUntilEndStrategy.prototype.act = function() {
	if (this.botConnection.isActionAvailable(ButtonData.CHECK))
		this.botConnection.act(ButtonData.CHECK);

	else if (this.botConnection.isActionAvailable(ButtonData.CALL))
		this.botConnection.act(ButtonData.CALL);

	else {
		console.log("********** check strategy complete");
		this.notifyComplete();
	}
}

module.exports = BotCheckUntilEndStrategy;