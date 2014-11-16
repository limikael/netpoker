/**
 * Server.
 * @module server
 */

var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var TimerMessage = require("../../proto/messages/TimerMessage");
var ButtonData = require("../../proto/data/ButtonData");
var EventDispatcher = require("yaed");
var FunctionUtil = require("../../utils/FunctionUtil");
var BaseTableSeat = require("../table/BaseTableSeat");

/**
 * Game seat prompt.
 *
 * Ask a user about an action in a game, in order to do this the sequence is
 * as follows. First, instanciate this class. Add a number of options using the
 * `addButton` method. Set a default action using the `setDefaultButton` method.
 * After this, call the `ask` mathod, and the corresponding messages will
 * be sent to the user. The instance of this class will then be in a waiting
 * state, and dispatch a `GameSeatPrompt.COMPLETE` message when either the
 * user selects an action, of if the operation times out. After the event
 * that signals completion has been sent, the selected button can be retreived
 * using the `getButton` method, and the value for the action, if any, can
 * be retreived using the `getValue` method.
 *
 * Each `GameSeatPrompt` object is only intended to be used once, i.e. to
 * ask one user about one action.
 *
 * When the `ask` method is called, this instance will be made the current
 * one for the accociated game. Only one GameSeatPrompt can be current
 * at any one time, if there is already a GameSeatPrompt that is current
 * when the `ask` method is called, an exception will be thrown.
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
	this.settingImplication = {};
}

FunctionUtil.extend(GameSeatPrompt, EventDispatcher);

/**
 * Triggered when we receiv an action from the user, or the prompt timed out.
 * @event GameSeatPrompt.COMPLETE
 */
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
 * @param {String} buttonId The button id for the action to add.
 * @param {Number} value The default value for the selected action.
 */
GameSeatPrompt.prototype.addButton = function(buttonId, value) {
	this.buttonsMessage.addButton(new ButtonData(buttonId, value));
}

/**
 * Set default button. It should be a string!
 * @method setDefaultButton
 * @param {String} button The button corresponding to the default action.
 */
GameSeatPrompt.prototype.setDefaultButton = function(button) {
	if (typeof button != "string")
		throw new Error("String expected for setDefaultButton");

	this.defaultButton = button;
}

/**
 * Get last button index.
 * @method getLastButtonIndex
 */
GameSeatPrompt.prototype.getLastButtonIndex = function() {
	return this.buttonsMessage.buttons.length - 1;
}

/**
 * Set slider button index and min and max values.
 * @method setSliderValues
 * @param {Number} buttonIndex The button index that should be affected by the slider.
 * @param {Number} min The minimum value accepted by the action.
 * @param {Number} max The maximum value accepted by the action.
 */
GameSeatPrompt.prototype.setSliderValues = function(buttonIndex, min, max) {
	this.buttonsMessage.sliderButtonIndex = buttonIndex;
	this.buttonsMessage.min = min;
	this.buttonsMessage.max = max;
}

/**
 * Send question and wait for reply.
 * @method ask
 */
GameSeatPrompt.prototype.ask = function() {
	if (!this.defaultButton)
		throw new Error("GameSeatPrompt doesn't have a default button");

	if (this.checkTableSeatSettings()) {
		this.trigger(GameSeatPrompt.COMPLETE);
		return;
	}

	if (this.checkGameSeatPresets()) {
		this.trigger(GameSeatPrompt.COMPLETE);
		return;
	}

	this.gameSeat.getGame().setGameSeatPrompt(this);

	this.started = Math.round(Date.now() / 1000);

	this.gameSeat.getTableSeat().on(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	this.gameSeat.getTableSeat().on(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);
	this.timeoutId = setTimeout(this.onTimeout.bind(this), this.responseTime * 1000);
	this.gameSeat.send(this.buttonsMessage);
	this.gameSeat.getGame().send(this.getCurrentTimerMessage());
}

/**
 * Get currenctly associated proto connection.
 * @method getProtoConnection
 */
GameSeatPrompt.prototype.getProtoConnection = function() {
	return this.gameSeat.getTableSeat().getProtoConnection();
}

/**
 * Button click message.
 * @method onButtonClickMessage
 * @private
 */
GameSeatPrompt.prototype.onButtonClickMessage = function(m) {
	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}

	this.gameSeat.getTableSeat().off(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	this.gameSeat.getTableSeat().off(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);

	this.button = m.getButton();
	this.value = m.getValue();

	this.gameSeat.getGame().send(new TimerMessage());
	this.gameSeat.getGame().setGameSeatPrompt(null);
	this.trigger(GameSeatPrompt.COMPLETE);
}

/**
 * Get the selected button after completion.
 * @method getButton
 */
GameSeatPrompt.prototype.getButton = function() {
	if (!this.button)
		throw new Error("GameSeatPrompt not complete.");

	return this.button;
}

/**
 * Get the selected value after completion.
 * @method getValue
 */
GameSeatPrompt.prototype.getValue = function() {
	return this.value;
}

/**
 * Get associated game seat.
 * @method getGameSeat
 */
GameSeatPrompt.prototype.getGameSeat = function() {
	return this.gameSeat;
}

/**
 * Timeout.
 * @method onTimeout
 * @private
 */
GameSeatPrompt.prototype.onTimeout = function() {
	if (!this.timeoutId) {
		console.log("clearTimeout not working?");
		return;
	}

	this.gameSeat.getTableSeat().off(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
	this.gameSeat.getTableSeat().off(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);

	this.timeoutId = null;

	if (this.defaultButton) {
		this.button = this.defaultButton;

		this.gameSeat.getGame().send(new TimerMessage());
		this.gameSeat.getGame().setGameSeatPrompt(null);
		this.trigger(GameSeatPrompt.COMPLETE);
	}
}

/**
 * Get a TimerMessage to indicate which game seat we are asking,
 * and how long time is left.
 * @method getCurrentTimerMessage
 */
GameSeatPrompt.prototype.getCurrentTimerMessage = function() {
	var t = new TimerMessage();
	var now = Math.round(Date.now() / 1000);

	t.setSeatIndex(this.gameSeat.getSeatIndex());
	t.setTotalTime(this.responseTime);
	t.setTimeLeft(this.responseTime - (now - this.started));

	return t;
}

/**
 * Get buttons message.
 * @method getButtonsMessage
 */
GameSeatPrompt.prototype.getButtonsMessage = function() {
	return this.buttonsMessage;
}

/**
 * Hard close.
 * @method close
 */
GameSeatPrompt.prototype.close = function() {
	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
}

/**
 * Is the selected button either a raise or bet?
 * @method isRaiseBet
 */
GameSeatPrompt.prototype.isRaiseBet = function() {
	if (this.getButton() == ButtonData.RAISE || this.getButton() == ButtonData.BET)
		return true;

	else
		return false;
}

/**
 * Is the selected button either a check or a call?
 * @method isCheckCall
 */
GameSeatPrompt.prototype.isCheckCall = function() {
	if (this.getButton() == ButtonData.CHECK || this.getButton() == ButtonData.CALL)
		return true;

	else
		return false;
}

/**
 * Use a table seat setting to mean a click on the specified button.
 * @method useTableSeatSetting
 */
GameSeatPrompt.prototype.useTableSeatSetting = function(settingId, meansButton) {
	this.settingImplication[settingId] = meansButton;
}

/**
 * Get button data for corresponding button id.
 * @method getButtonDataByButtonId
 */
GameSeatPrompt.prototype.getButtonDataForButtonId = function(buttonId) {
	var buttons = this.buttonsMessage.getButtons();

	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i].getButton() == buttonId)
			return buttons[i];
	}

	return null;
}

/**
 * Check applicable table seat settings and update result
 * accordingly. Returns true if any setting was applied, false otherwise.
 * @method checkTableSeatSettings
 * @private
 */
GameSeatPrompt.prototype.checkTableSeatSettings = function() {
	for (var settingId in this.settingImplication) {
		if (this.gameSeat.getTableSeat().getSetting(settingId)) {
			var buttonId = this.settingImplication[settingId];
			var buttonData = this.getButtonDataForButtonId(buttonId);

			this.button = buttonData.getButton();
			this.value = buttonData.getValue();

			return true;
		}
	}

	return false;
}

/**
 * Settings changed for the table seat. Check if they are interesting to us,
 * in that case signal completion.
 * @method onTableSeatSettingsChanged
 * @private
 */
GameSeatPrompt.prototype.onTableSeatSettingsChanged = function() {
	if (this.checkTableSeatSettings()) {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		this.gameSeat.getTableSeat().off(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
		this.gameSeat.getTableSeat().off(BaseTableSeat.SETTINGS_CHANGED, this.onTableSeatSettingsChanged, this);

		this.gameSeat.getGame().send(new TimerMessage());
		this.gameSeat.getGame().setGameSeatPrompt(null);
		this.gameSeat.send(new ButtonsMessage());
		this.trigger(GameSeatPrompt.COMPLETE);
	}
}

/**
 * Check applicable game seat presets.
 * @method
 */
GameSeatPrompt.prototype.checkGameSeatPresets = function() {
	var presetButton = this.gameSeat.getCurrentPreset();

	if (presetButton == ButtonData.CALL_ANY)
		presetButton = ButtonData.CALL;

	if (presetButton == ButtonData.CHECK_FOLD)
		presetButton = ButtonData.CHECK;

	var buttonData = this.getButtonDataForButtonId(presetButton);

	if (buttonData) {
		this.button = buttonData.getButton();
		this.value = buttonData.getValue();
		return true;
	}

	return false;
}

module.exports = GameSeatPrompt;