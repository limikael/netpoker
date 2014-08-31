/**
 * Button data.
 * @class ButtonData
 */
function PresetButtonData(button, value) {
	this.button = button;
	this.value = value;
}

/**
 * Get button.
 */
PresetButtonData.prototype.getButton = function() {
	return this.button;
}

/**
 * Get value.
 */
PresetButtonData.prototype.getValue = function() {
	return this.value;
}

module.exports = PresetButtonData;