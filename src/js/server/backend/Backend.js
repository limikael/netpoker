/**
 * Connection to backend.
 * @class Backend
 */
function Backend() {

}

Backend.GET_USER_INFO_BY_TOKEN="user/getInfoByToken";

/**
 * Call a backend method.
 * @method call
 */
Backend.call = function(method, params) {
	throw new Error("not implemented");
}

module.exports=Backend;