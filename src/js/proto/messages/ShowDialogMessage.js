/**
 * @class ShowDialogMessage
 */
function ShowDialogMessage() {
	this.text = "";
	this.buttons = [];
}

ShowDialogMessage.TYPE = "showDialog";

/**
 * Getter.
 */
ShowDialogMessage.prototype.addButton = function(button) {
	this.buttons.push(button);
}

/**
 * Getter.
 */
ShowDialogMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Getter.
 */
ShowDialogMessage.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Setter.
 */
ShowDialogMessage.prototype.setText = function(text) {
	this.text = text;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
ShowDialogMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.buttons = data.buttons;
}

/**
 * Serialize message.
 * @method serialize
 */
ShowDialogMessage.prototype.serialize = function() {
	return {
		text: this.text,
		buttons: this.buttons
	};
}

module.exports = ShowDialogMessage;