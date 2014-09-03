/**
 * Connection to backend.
 * @class Backend
 */
function Backend() {

}

Backend.GET_USER_INFO_BY_TOKEN = "user/getInfoByToken";
Backend.GET_TABLE_LIST = "table/getList";
Backend.GET_USER_BALANCE = "user/getBalance";
Backend.SIT_IN = "table/sitIn";
Backend.SIT_OUT = "table/sitOut";
Backend.START_CASH_GAME = "game/startForTable";

/**
 * Call a backend method.
 * @method call
 */
Backend.prototype.call = function(method, params) {
	throw new Error("not implemented");
}

module.exports = Backend;