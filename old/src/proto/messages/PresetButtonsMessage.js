/**
 * Protocol.
 * @module proto
 */

var ButtonData = require("../data/ButtonData");

/**
 * Received when ?.
 * @class PresetButtonsMessage
 */
function PresetButtonsMessage() {
	this.buttons = new Array(7);
	this.current = null;
}

PresetButtonsMessage.TYPE = "presetButtons";

/**
 * Getter.
 * @method getButtons
 */
PresetButtonsMessage.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Getter.
 * @method getCurrent
 */
PresetButtonsMessage.prototype.getCurrent = function() {
	return this.current;
}

/**
 * Set buton data.
 * @method
 */
PresetButtonsMessage.prototype.setButtonDataAt = function(index, buttonData) {
	this.buttons[index] = buttonData;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PresetButtonsMessage.prototype.unserialize = function(data) {
	this.current = data.current;

	this.buttons = new Array();

	for (var i = 0; i < data.buttons.length; i++) {
		var button = data.buttons[i];
		var buttonData = null;

		if (button != null) {
			buttonData = new ButtonData(button.button, button.value);
		}

		this.buttons.push(buttonData);
	}
}

/**
 * Serialize message.
 * @method serialize
 */
PresetButtonsMessage.prototype.serialize = function() {
	var object = {
		buttons: [],
		current: this.current
	};

	for (var i = 0; i < this.buttons.length; i++) {
		var buttonData = this.buttons[i];
		if (buttonData != null)
			object.buttons.push({
				button: buttonData.button,
				value: buttonData.value
			});

		else
			object.buttons.push(null);
	}

	return object;
}

module.exports = PresetButtonsMessage;