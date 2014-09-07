var BackendCall = require("./BackendCall");

/**
 * Connection to backend.
 * @class Backend
 */
function Backend(baseUrl) {
	this.baseUrl = baseUrl;
}

Backend.GET_USER_INFO_BY_TOKEN = "user/getInfoByToken";
Backend.GET_TABLE_LIST = "table/getList";
Backend.GET_USER_BALANCE = "user/getBalance";
Backend.SIT_IN = "table/sitIn";
Backend.SIT_OUT = "table/sitOut";
Backend.START_CASH_GAME = "game/startForTable";

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