/**
 * Protocol.
 * @module proto
 */

/**
 * Received when ?.
 * @class TableButtonsMessage
 */
function TableButtonsMessage() {
	this.enabled = [];
	this.currentIndex = -1;
	this.playerIndex = -1;
	this.infoLink = "";
}

TableButtonsMessage.TYPE = "tableButtons";

/**
 * Getter.
 * @method getEnabled
 */
TableButtonsMessage.prototype.getEnabled = function() {
	return this.enabled;
}

/**
 * Getter.
 * @method getCurrentIndex
 */
TableButtonsMessage.prototype.getCurrentIndex = function() {
	return this.currentIndex;
}

/**
 * Setter.
 * @method getEnabled
 */
TableButtonsMessage.prototype.setEnabled = function(enabled) {
	this.enabled = enabled;
}

/**
 * Setter.
 * @method setCurrentIndex
 */
TableButtonsMessage.prototype.setCurrentIndex = function(currentIndex) {
	this.currentIndex = currentIndex;
}

/**
 * Getter.
 * @method getPlayerIndex
 */
/*TableButtonsMessage.prototype.getPlayerIndex = function() {
	return this.playerIndex;
}*/

/**
 * Getter.
 * @method getInfoLink
 */
TableButtonsMessage.prototype.getInfoLink = function() {
	return this.infoLink;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TableButtonsMessage.prototype.unserialize = function(data) {
	this.playerIndex = data.playerIndex;
	this.currentIndex = data.currentIndex;
	this.infoLink = data.infoLink;

	this.enabled = new Array();
	for (var i = 0; i < data.enabled.length; i++)
		this.enabled.push(data.enabled[i]);
}

/**
 * Serialize message.
 * @method serialize
 */
TableButtonsMessage.prototype.serialize = function() {
	var object = {
		currentIndex: this.currentIndex,
		playerIndex: this.playerIndex,
		enabled: [],
		infoLink: this.infoLink
	};

	for (var i = 0; i < this.enabled.length; i++)
		object.enabled.push(this.enabled[i]);

	return object;
}

module.exports = TableButtonsMessage;