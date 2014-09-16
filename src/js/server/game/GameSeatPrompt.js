var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var TimerMessage = require("../../proto/messages/TimerMessage");
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
	this.responseTime = 30;
	this.timeoutId = null;
	this.defaultButton = null;
	this.started = -1;
}

FunctionUtil.extend(GameSeatPrompt, EventDispatcher);

GameSeatPrompt.COMPLETE = "complete";

/**
 * Set response time in seconds.
 * If not set, default response time is 30 secs.
 * @method setResponseTime
 */
GameSeatPrompt.prototype.setResponseTime = function(secs) {
	this.responseTime = secs;
}

/**
 * Add button.
 * @method addButton
 */
GameSeatPrompt.prototype.addButton = function(buttonData) {
	this.buttonsMessage.addButton(buttonData);
}

/**
 * Set default button
 * @method setDefaultButton
 */
GameSeatPrompt.prototype.setDefaultButton = function(button) {
	this.defaultButton = button;
}

/**
 * Send question and wait for reply.
 * @method ask
 */
GameSeatPrompt.prototype.ask = function() {
	if (!this.defaultButton)
		throw new Error("GameSeatPrompt doesn't have a default button");

	this.gameSeat.getGame().setGameSeatPrompt(this);

	this.started = Math.round(Date.now() / 1000);

	this.gameSeat.getTableSeat().on(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	this.timeoutId = setTimeout(this.onTimeout.bind(this), this.responseTime * 1000);
	this.gameSeat.send(this.buttonsMessage);
	this.gameSeat.getGame().send(this.getCurrentTimerMessage());
}

/**
 * Button click message.
 * @method onButtonClickMessage
 */
GameSeatPrompt.prototype.onButtonClickMessage = function(m) {
	console.log("********** button click in GameSeatPrompt");

	if (this.timeoutId) {
		console.log("------- clearing timeout");
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}

	this.gameSeat.getTableSeat().off(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);

	this.button = m.getButton();
	this.value = m.getValue();

	this.gameSeat.getGame().setGameSeatPrompt(null);
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

/**
 * Timeout.
 * @method onTimeout
 */
GameSeatPrompt.prototype.onTimeout = function() {
	if (!this.timeoutId) {
		console.log("clearTimeout not working?");
		return;
	}

	this.timeoutId = null;

	if (this.defaultButton) {
		console.log("chosing default button: " + this.defaultButton);
		this.button = this.defaultButton;
		this.gameSeat.getGame().setGameSeatPrompt(null);
		this.trigger(GameSeatPrompt.COMPLETE);
	}
}

/**
 * Get current timer message.
 * @method getCurrentTimerMessage
 */
GameSeatPrompt.prototype.getCurrentTimerMessage = function() {
	var t = new TimerMessage();
	var now = Math.round(Date.now() / 1000);

	console.log("now: " + now);

	t.setSeatIndex(this.gameSeat.getSeatIndex());
	t.setTotalTime(this.responseTime);
	t.setTimeLeft(this.responseTime - (now - this.started));

	return t;
}

/**
 * Hard close.
 * @method close
 */
GameSeatPrompt.prototype.close = function() {
	console.log("---- hard close GameSeatPrompt");
	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
}

module.exports = GameSeatPrompt;