var MessageServer = require("../../utils/MessageServer");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var UserConnection = require("../../server/connection/UserConnection");
var ConnectionManagerConnectionEvent = require("./ConnectionManagerConnectionEvent");

/**
 * Connection manager.
 * @class ConnectionManager
 */
function ConnectionManager(services) {
	this.services = services;

	EventDispatcher.call(this);

	this.messageServer = null;
	this.viewCaseDir = null;
}

FunctionUtil.extend(ConnectionManager, EventDispatcher);

/**
 * Dispatched on new connections.
 * @event ConnectionManager.CONNECTION
 */
ConnectionManager.CONNECTION = "connection";

/**
 * Message server connection.
 * @method onMessageServerConnection
 * @private
 */
ConnectionManager.prototype.onMessageServerConnection = function(e) {
	this.handleNewConnection(e.connection);
}

/**
 * Handle a new connection
 * @private
 */
ConnectionManager.prototype.handleNewConnection = function(connection) {
	var userConnection = new UserConnection(this.services, connection);

	if (this.viewCaseDir)
		userConnection.serveViewCases(this.viewCaseDir);

	userConnection.on(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.on(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);
}

/**
 * User connection initialized.
 * @method onUserConnectionInitialized
 * @private
 */
ConnectionManager.prototype.onUserConnectionInitialized = function(e) {
	var userConnection = e.target;

	userConnection.off(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.off(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);

	var e = new ConnectionManagerConnectionEvent(
		userConnection,
		userConnection.getUser(),
		userConnection.getInitMessage()
	);

	e.type = ConnectionManager.CONNECTION;

	this.trigger(e);
}

/**
 * User connection close.
 * @method onUserConnectionClose
 * @private
 */
ConnectionManager.prototype.onUserConnectionClose = function(e) {
	var userConnection = e.target;

	userConnection.off(UserConnection.CLOSE, this.onUserConnectionClose, this);
	userConnection.off(UserConnection.INITIALIZED, this.onUserConnectionInitialized, this);
}

/**
 * Start listening for connections.
 * @method listen
 */
ConnectionManager.prototype.listen = function(port) {
	this.messageServer = new MessageServer();
	this.messageServer.on(MessageServer.CONNECTION, this.onMessageServerConnection, this);
	this.messageServer.on("request", this.onMessageServerRequest, this);
	this.messageServer.listen(port);
}

/**
 * Regular web request from the server.
 */
ConnectionManager.prototype.onMessageServerRequest = function(ev) {
	this.trigger(ev);
}

/**
 * Close
 * @method close
 */
ConnectionManager.prototype.close = function() {
	if (this.messageServer) {
		this.messageServer.close();
		this.messageServer = null;
	}
}

/**
 * Serve view cases.
 * @method serveViewCases
 */
ConnectionManager.prototype.serveViewCases = function(dir) {
	this.viewCaseDir = dir;
}

module.exports = ConnectionManager;