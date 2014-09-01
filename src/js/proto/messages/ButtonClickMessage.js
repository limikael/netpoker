/**
 * @class ShowDialogMessage
 */
function ButtonClickMessage(button, value) {
	this.button=button;
	this.value=value;
}

ButtonClickMessage.TYPE = "buttonClick";

/**
 * Getter.
 */
ButtonClickMessage.prototype.getButton = function() {
	return this.button;
}

/**
 * Setter.
 */
ButtonClickMessage.prototype.getValue = function() {
	return this.value;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
ButtonClickMessage.prototype.unserialize = function(data) {
	this.button=data.button;
	this.value=data.value;
}

/**
 * Serialize message.
 * @method serialize
 */
ButtonClickMessage.prototype.serialize = function() {
	return {
		button: this.button,
		value: this.value
	};
}

module.exports = ButtonClickMessage;