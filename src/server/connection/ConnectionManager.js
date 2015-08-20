/**
 * Server.
 * @module server
 */

var MessageServer = require("../../utils/MessageServer");
var EventDispatcher = require("yaed");
var UserConnection = require("../../server/connection/UserConnection");
var ConnectionManagerConnectionEvent = require("./ConnectionManagerConnectionEvent");
var inherits = require("inherits");

/**
 * Connection manager.
 * @class ConnectionManager
 */
function ConnectionManager(services) {
	this.services = services;

	EventDispatcher.call(this);

	this.messageServer = null;
	this.viewCaseDir = null;
	this.sslOptions = null;
}

inherits(ConnectionManager, EventDispatcher);

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
 * @method handleNewConnection
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
 * Are we listening yet?
 * @method isListening
 */
ConnectionManager.prototype.isListening = function() {
	if (this.messageServer)
		return true;

	else
		return false;
}

/**
 * Set ssl options.
 * @method setSslOptions
 */
ConnectionManager.prototype.setSslOptions = function(sslOptions) {
	this.sslOptions = sslOptions;
}

/**
 * Start listening for connections.
 * @method listen
 */
ConnectionManager.prototype.listen = function(port, bindAddr) {
	this.messageServer = new MessageServer();
	this.messageServer.on(MessageServer.CONNECTION, this.onMessageServerConnection, this);
	this.messageServer.on("request", this.onMessageServerRequest, this);

	if (this.sslOptions)
		this.messageServer.setSslOptions(this.sslOptions);

	this.messageServer.listen(port, bindAddr);
}

/**
 * Regular web request from the server.
 * @method onMessageServerRequest
 * @private
 */
ConnectionManager.prototype.onMessageServerRequest = function(ev) {
	console.log("message server request...");
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