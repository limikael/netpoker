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
}

Backend.GET_USER_INFO_BY_TOKEN = "getUserInfoByToken";
Backend.GET_CASHGAME_TABLE_LIST = "getCashGameTableList";
Backend.GET_USER_BALANCE = "getUserBalance";
Backend.SIT_IN = "cashGameUserJoin";
Backend.SIT_OUT = "cahsGameUserLeave";
Backend.START_CASH_GAME = "gameStartForCashGame";

/**
 * Set base url.
 * @method setBaseUrl
 */
Backend.prototype.setBaseUrl = function(baseUrl) {
	this.baseUrl = baseUrl;
}

/**
 * Call a backend method.
 * @method call
 */
Backend.prototype.call = function(method, params) {
	var backendCall = new BackendCall(this.baseUrl + "/" + method, params);

	return backendCall.perform();
}

module.exports = Backend;