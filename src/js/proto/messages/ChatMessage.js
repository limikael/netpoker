/**
 * Received when something has occurred in the chat.
 * @class ChatMessage
 */
function ChatMessage(text) {
	this.text = text;
}

ChatMessage.TYPE = "chat";

/**
 * Seat text.
 * @method getText
 */
ChatMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Un-serialize.
 * @method unserialize
 */
ChatMessage.prototype.unserialize = function(data) {
	this.text = data.text;
}

/**
 * Serialize message.
 * @method serialize
 */
ChatMessage.prototype.serialize = function() {
	return {
		text: this.text
	};
}

module.exports = ChatMessage;