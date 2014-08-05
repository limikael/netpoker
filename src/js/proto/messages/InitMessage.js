/**
 * @class InitMessage
 */
function InitMessage(token) {
	this.token = token;
}

InitMessage.TYPE="init";

/**
 * get token.
 * @method getToken
 */
InitMessage.prototype.getToken = function() {
	return this.token;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
InitMessage.prototype.unserialize = function(data) {
	this.token = data.token;
}

/**
 * Serialize message.
 * @method serialize
 */
InitMessage.prototype.serialize = function() {
	return {
		token: this.token
	};
}

module.exports = InitMessage;