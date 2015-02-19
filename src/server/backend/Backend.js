/**
 * Server.
 * @module server
 */

var BackendCall = require("./BackendCall");

/**
 * Manage the connection backend.
 * @class Backend
 */
function Backend(baseUrl) {
	this.baseUrl = baseUrl;
	this.key = null;
}

Backend.GET_USER_INFO_BY_TOKEN = "getUserInfoByToken";
Backend.GET_CASHGAME_TABLE_LIST = "getCashGameTableList";
Backend.GET_USER_BALANCE = "getUserBalance";
Backend.SIT_IN = "cashGameUserJoin";
Backend.SIT_OUT = "cashGameUserLeave";
Backend.START_CASH_GAME = "gameStartForCashGame";
Backend.FINISH_GAME = "gameFinish";

/**
 * Set base url.
 * @method setBaseUrl
 */
Backend.prototype.setBaseUrl = function(baseUrl) {
	this.baseUrl = baseUrl;
}

/**
 * Set key to send along with every request.
 * @method setKey
 */
Backend.prototype.setKey = function(key) {
	this.key = key;
}

/**
 * Call a backend method.
 * @method call
 */
Backend.prototype.call = function(method, params) {
	if (!method)
		throw new Error("method missing for backend call!");

	if (!params)
		params = {};

	if (this.key)
		params.key = this.key;

	var url = this.baseUrl;

	if (url.charAt(url.length - 1) != "/")
		url += "/";

	var backendCall = new BackendCall(url + method, params);

	return backendCall.perform();
}

module.exports = Backend;