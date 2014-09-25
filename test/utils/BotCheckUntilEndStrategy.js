var BotStrategy = require("./BotStrategy");
var FunctionUtil = require("../../src/js/utils/FunctionUtil");
var StateCompleteMessage = require("../../src/js/proto/messages/StateCompleteMessage");
var ShowDialogMessage = require("../../src/js/proto/messages/ShowDialogMessage");
var SeatClickMessage = require("../../src/js/proto/messages/SeatClickMessage");
var SeatInfoMessage = require("../../src/js/proto/messages/SeatInfoMessage");
var ButtonClickMessage = require("../../src/js/proto/messages/ButtonClickMessage");
var ButtonsMessage = require("../../src/js/proto/messages/ButtonsMessage");
var ButtonData = require("../../src/js/proto/data/ButtonData");

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

	if (this.botConnection.getButtons()) {
		if (!this.botConnection.isActionAvailable(ButtonData.CHECK) &&
			!this.botConnection.isActionAvailable(ButtonData.CALL)) {
			throw new Error("buttons but no check or call");
		}
		this.act();
	}
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