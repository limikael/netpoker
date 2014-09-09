var ConnectionManager = require("../connection/ConnectionManager");
var TableManager = require("../table/TableManager");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Thenable = require("../../utils/Thenable");

/**
 * This is the main class for the server. The 'netpokerserver' command is pretty much a wrapper
 * around this class. This class does pretty much everything that the app is responsible for,
 * such as managing the TableManager with active tables, it is responsible for creating
 * the ConnectionManager to listen for incoming connections, etc. It does not concern itself
 * with reading command line options or parsing configuration files, these things are left
 * to the entity implementing this class.
 * @class NetPokerServer
 */
function NetPokerServer() {
	EventDispatcher.call(this);

	this.listenPort = null;
	this.connectionManager = new ConnectionManager(this);
	this.tableManager = null;
	this.backend = null;

	this.mockNetwork = false;
}

FunctionUtil.extend(NetPokerServer, EventDispatcher);

NetPokerServer.STARTED = "started";

/**
 * Set port to tisten to.
 * @method setListenPort
 */
NetPokerServer.prototype.setListenPort = function(port) {
	this.listenPort = port;
}

/**
 * We got a new connection from the ConnectionManager.
 * Find out what the connection is for, i.e. table, tournament etc., and route
 * the connection to the right peer.
 * @method onConnectionManagerConnection
 * @private
 */
NetPokerServer.prototype.onConnectionManagerConnection = function(e) {
	var initMessage = e.getInitMessage();

	if (initMessage.getTableId()) {
		var table = this.tableManager.getTableById(initMessage.getTableId());

		if (!table) {
			console.log("table not found, refusing...")
			e.getProtoConnection().close();
			return;
		}

		console.log("user " + e.getUser().getName() + " connecting to table " + table.getId());
		table.notifyNewConnection(e.getProtoConnection(), e.getUser());
	} else {
		console.log("no entity to connect to, refusing...")
		e.getProtoConnection().close();
	}
}

/**
 * We got a regular web request on one of the connections. By regular is ment
 * such a request that browsers usually send, such as GET or POST, i.e. not
 * a web socket request. These requests are normally not handled by this server
 * in production mode, but can be handled for debugging purposes by the 
 * mocked server.
 * @method onConnectionManagerRequest
 * @private
 */
NetPokerServer.prototype.onConnectionManagerRequest=function(e) {
	this.trigger(e);
}

/**
 * Set backend to use.
 * @method setBackend
 */
NetPokerServer.prototype.setBackend = function(backend) {
	this.backend = backend;
}

/**
 * Get backend.
 * @method getBackend
 */
NetPokerServer.prototype.getBackend = function() {
	return this.backend;
}

/**
 * Serve view cases from directory.
 * @method serveViewCases
 */
NetPokerServer.prototype.serveViewCases = function(dir) {
	console.log("Serving view cases from: "+dir);
	this.connectionManager.serveViewCases(dir);
}

/**
 * The table manager is initialized.
 * @method onTableManagerInitialized
 * @private
 */
NetPokerServer.prototype.onTableManagerInitialized = function() {
	this.connectionManager.on(ConnectionManager.CONNECTION, this.onConnectionManagerConnection, this);
	this.connectionManager.on("request", this.onConnectionManagerRequest, this);

	this.trigger(NetPokerServer.STARTED);
	this.runThenable.notifySuccess();
}

/**
 * Start up the server. The server will not be usable immideatly when this function returns,
 * since it needs to ask the backend for the current list of tables. This function returns
 * a promise that will fulfill as the startup sequence is complete.
 * @method run
 * @return {Thenable} A promise that fulfills as the server has started.
 */
NetPokerServer.prototype.run = function() {
	if (!this.backend)
		throw new Error("No backend");

	if (!this.listenPort && !this.mockNetwork)
		throw new Error("No port to listen to.");

	if (this.listenPort)
		this.connectionManager.listen(this.listenPort);

	this.runThenable = new Thenable();

	this.tableManager = new TableManager(this);
	this.tableManager.on(TableManager.INITIALIZED, this.onTableManagerInitialized, this);
	this.tableManager.initialize();

	return this.runThenable;
}

/**
 * Close.
 * @method close
 */
NetPokerServer.prototype.close = function() {
	this.connectionManager.close();
}

module.exports = NetPokerServer;