var ProtoConnection = require("../../proto/ProtoConnection");
var FunctionUtil = require("../../utils/FunctionUtil");
var Backend = require("../backend/Backend");
var InitMessage = require("../../proto/messages/InitMessage");
var User = require("../user/User");
var fs = require("fs");

/**
 * Represents a connection waiting for a user to be authenticated.
 * Users and connections are generally handles seperatly in the server,
 * since browsers can disconnect and reconnect. This class is used
 * by the connection manager, just to find out which user we should
 * report to be using this connection.
 * @class UserConnection
 */
function UserConnection(services, connection) {
	ProtoConnection.call(this, connection);

	this.setLogMessages(true);

	this.connection = connection;
	this.services = services;
	this.viewCaseDir = null;

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
	this.initMessage = initMessage;

	if (initMessage.getViewCase() && this.viewCaseDir) {
		this.handleViewCase(initMessage.getViewCase());
		return;
	}

	var params = {
		token: initMessage.getToken()
	};

	this.fetchUserCall = this.services.getBackend().call(Backend.GET_USER_INFO_BY_TOKEN, params);
	this.fetchUserCall.then(
		this.onFetchUserCallSuccess.bind(this),
		this.onFetchUserCallError.bind(this)
	);
}

/**
 * Handle view case.
 * This serves up a view case, used by the mock server.
 * @method handleViewCase
 * @private
 */
UserConnection.prototype.handleViewCase = function(viewCase) {
	var caseFileName = this.viewCaseDir + "/" + viewCase + ".json";
	console.log("serving view case: " + caseFileName);

	if (!fs.existsSync(caseFileName)) {
		console.log("got request for non existing view case");
		this.close();
		this.trigger(UserConnection.CLOSE);
		return;
	}

	f = fs.readFileSync(caseFileName);
	var lines = f.toString().split("\n");

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();

		if (line.length && line[0] != "/") {
			this.connection.send(JSON.parse(line));
		}
	}

	this.connection.on("message", function(e) {
		console.log(JSON.stringify(e.message));
	});
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

/**
 * Get the init message.
 * @method getInitMessage
 */
UserConnection.prototype.getInitMessage = function() {
	return this.initMessage;
}

/**
 * Serve view cases.
 * @method serveViewCases
 */
UserConnection.prototype.serveViewCases = function(dir) {
	this.viewCaseDir = dir;
}

module.exports = UserConnection;