/**
 * Server.
 * @module server
 */

var ButtonData = require("../../proto/data/ButtonData");

/**
 * A preset (such as fold/check) for a GameSeat.
 * @class GameSeatPreset
 */
function GameSeatPreset(buttonId, buttonIndex) {
	if (!buttonId)
		throw new Error("no button id for preset");

	this.buttonId = buttonId;
	this.buttonIndex = buttonIndex;
	this.enabled = false;
	this.value = 0;
}

/**
 * Enabled?
 * @method isEnabled
 */
GameSeatPreset.prototype.isEnabled = function() {
	return this.enabled;
}

/**
 * Set enabled?
 * @method setEnabled
 */
GameSeatPreset.prototype.setEnabled = function(value) {
	this.enabled = value;
}

/**
 * Get button id.
 * @method getButonId
 */
GameSeatPreset.prototype.getButtonId = function() {
	return this.buttonId;
}

/**
 * Get button index.
 * @method getButtonIndex
 */
GameSeatPreset.prototype.getButtonIndex = function() {
	return this.buttonIndex;
}

/**
 * Get value.
 * @method getValue
 */
GameSeatPreset.prototype.getValue = function() {
	return this.value;
}

/**
 * Set value.
 * @method setValue
 */
GameSeatPreset.prototype.setValue = function(value) {
	this.value = value;
}

/**
 * Check if the value matches.
 * @method checkValueMatch
 */
GameSeatPreset.prototype.checkValueMatch = function(cand) {
	if (!this.value && !cand)
		return true;

	if (this.value == cand)
		return true;

	return false;
}

/**
 * Get corresponding button data.
 * @method getButtonData
 */
GameSeatPreset.prototype.getButtonData = function() {
	return new ButtonData(this.buttonId, this.value);
}

module.exports = GameSeatPreset;