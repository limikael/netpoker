/**
 * @class InitMessage
 */
function InitMessage(token) {
	this.token = token;
	this.tableId = null;
}

InitMessage.TYPE = "init";

/**
 * get token.
 * @method getToken
 */
InitMessage.prototype.getToken = function() {
	return this.token;
}

/**
 * Set table id.
 * @method setTableId
 */
InitMessage.prototype.setTableId = function(id) {
	this.tableId = id;
}

/**
 * Get table id.
 * @method getTableId
 */
InitMessage.prototype.getTableId = function() {
	return this.tableId;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
InitMessage.prototype.unserialize = function(data) {
	this.token = data.token;
	this.tableId = data.tableId;
}

/**
 * Serialize message.
 * @method serialize
 */
InitMessage.prototype.serialize = function() {
	return {
		token: this.token,
		tableId: this.tableId
	};
}

module.exports = InitMessage;