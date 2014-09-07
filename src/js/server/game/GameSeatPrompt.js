var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var EventDispatcher = require("../../utils/EventDispatcher");
var FunctionUtil = require("../../utils/FunctionUtil");

/**
 * Game seat prompt.
 * @class GameSeatPrompt
 */
function GameSeatPrompt(gameSeat) {
	if (!gameSeat)
		throw new Error("gameSeat is null");

	if (!gameSeat.getTableSeat())
		throw new Error("tableSeat is null");

	this.gameSeat = gameSeat;
	this.buttonsMessage = new ButtonsMessage();
	this.button = null;
	this.value = null;
}

FunctionUtil.extend(GameSeatPrompt, EventDispatcher);

GameSeatPrompt.COMPLETE = "complete";

/**
 * Add button.
 * @method addButton
 */
GameSeatPrompt.prototype.addButton = function(buttonData) {
	this.buttonsMessage.addButton(buttonData);
}

/**
 * Send question and wait for reply.
 * @method ask
 */
GameSeatPrompt.prototype.ask = function() {
	this.gameSeat.getTableSeat().on(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	this.gameSeat.send(this.buttonsMessage);
}

/**
 * Button click message.
 * @method onButtonClickMessage
 */
GameSeatPrompt.prototype.onButtonClickMessage = function(m) {
	//console.log("********** button click in GameSeatPrompt");

	this.gameSeat.getTableSeat().off(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);

	this.button = m.getButton();
	this.value = m.getValue();

	this.trigger(GameSeatPrompt.COMPLETE);
}

/**
 * Get button.
 * @method getButton
 */
GameSeatPrompt.prototype.getButton = function() {
	if (!this.button)
		throw new Error("GameSeatPrompt not complete.");

	return this.button;
}

/**
 * Get value.
 * @method getValue
 */
GameSeatPrompt.prototype.getValue = function() {
	return this.value;
}

/**
 * Get game seat.
 * @method getGameSeat
 */
GameSeatPrompt.prototype.getGameSeat = function() {
	return this.gameSeat;
}

module.exports = GameSeatPrompt;