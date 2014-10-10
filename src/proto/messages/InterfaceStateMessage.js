/**
 * Received when interface state has changed.
 * @class InterfaceStateMessage
 */
function InterfaceStateMessage(visibleButtons) {
	if (!visibleButtons)
		visibleButtons = [];

	this.visibleButtons = visibleButtons;
}

InterfaceStateMessage.TYPE = "interfaceState";

/**
 * Getter.
 * @method getVisibleButtons
 */
InterfaceStateMessage.prototype.getVisibleButtons = function() {
	return this.visibleButtons;
}

/**
 * Add a button to be shown.
 * @method addVisibleButton
 */
InterfaceStateMessage.prototype.addVisibleButton=function(buttonId) {
	this.visibleButtons.push(buttonId);
}

/**
 * Un-serialize.
 * @method unserialize
 */
InterfaceStateMessage.prototype.unserialize = function(data) {
	this.visibleButtons = data.visibleButtons;
}

/**
 * Serialize message.
 * @method serialize
 */
InterfaceStateMessage.prototype.serialize = function() {
	return {
		visibleButtons: this.visibleButtons
	};
}

module.exports = InterfaceStateMessage;