var ProtoConnection = require("../../proto/ProtoConnection");
var FunctionUtil = require("../../utils/FunctionUtil");
var Backend = require("../backend/Backend");
var InitMessage = require("../../proto/messages/InitMessage");
var User = require("../user/User");

/**
 * Represents a connected user.
 * @class UserConnection
 */
function UserConnection(connection) {
	ProtoConnection.call(this, connection);

	this.addMessageHandler(InitMessage.TYPE, this.onInitMessage, this);
}

FunctionUtil.extend(UserConnection, ProtoConnection);

UserConnection.INITIALIZED = "initialized";
UserConnection.CLOSE = ProtoConnection.CLOSE;

/**
 * Init message.
 * @method onInitMessage
 */
UserConnection.prototype.onInitMessage = function(initMessage) {
	var params = {
		token: initMessage.getToken()
	};

	this.fetchUserCall = Backend.call(Backend.GET_USER_INFO_BY_TOKEN, params);
	this.fetchUserCall.then(
		this.onFetchUserCallSuccess.bind(this),
		this.onFetchUserCallError.bind(this)
	);
}

/**
 * User call success.
 * @method onFetchUserCallSuccess
 */
UserConnection.prototype.onFetchUserCallSuccess = function(result) {
	this.fetchUserCall = null;

	if (!result || !result.id || !result.name) {
		console.warn("fetch user call returned bad data");

		this.close();
		this.trigger(UserConnection.CLOSE);
		return;
	}

	this.user = new User(result);
	this.trigger(UserConnection.INITIALIZED);
}

/**
 * User call error.
 * @method onFetchUserCallError
 */
UserConnection.prototype.onFetchUserCallError = function() {
	this.fetchUserCall = null;

	console.warn("fetch user call failed");

	this.close();
	this.trigger(UserConnection.CLOSE);
}

/**
 * Get user.
 * @method getUser
 */
UserConnection.prototype.getUser = function() {
	return this.user;
}

module.exports = UserConnection;