var MessageServer = require("../../utils/MessageServer");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var UserConnection = require("../../server/connection/UserConnection");

/**
 * Connection manager.
 * @class ConnectionManager
 */
function ConnectionManager() {
	EventDispatcher.call(this);

	this.messageServer = null;
}

FunctionUtil.extend(ConnectionManager, EventDispatcher);

ConnectionManager.CONNECTION = "connection";

/**
 * Message server connection.
 * @method onMessageServerConnection
 * @private
 */
ConnectionManager.prototype.onMessageServerConnection = function(e) {
	var userConnection = new UserConnection(e.connection);

	userConnection.on(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.on(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);
}

/**
 * User connection initialized.
 */
ConnectionManager.prototype.onUserConnectionInitialized = function(e) {
	var userConnection = e.target;

	userConnection.off(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.off(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);

	this.trigger({
		type: ConnectionManager.CONNECTION,
		connection: userConnection
	});
}

/**
 * User connection close.
 */
ConnectionManager.prototype.onUserConnectionClose = function(e) {
	var userConnection = e.target;

	userConnection.off(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.off(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);
}

/**
 * Start listening for connections.
 * @function listen
 */
ConnectionManager.prototype.listen = function(port) {
	this.messageServer = new MessageServer();
	this.messageServer.on(MessageServer.CONNECTION, this.onMessageServerConnection, this);
	this.messageServer.listen(port);
}

module.exports = ConnectionManager;