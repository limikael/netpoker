/**
 * Server.
 * @module server
 */

var ConnectionManager = require("../connection/ConnectionManager");
var CashGameManager = require("../cashgame/CashGameManager");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Thenable = require("../../utils/Thenable");
var Backend = require("../backend/Backend");
var ServerApi = require("../api/ServerApi");

/**
 * This is the main class for the server. The 'netpokerserver' command is pretty much a wrapper
 * around this class. This class does pretty much everything that the app is responsible for,
 * such as managing the CashGameManager with active tables, it is responsible for creating
 * the ConnectionManager to listen for incoming connections, etc. It does not concern itself
 * with reading command line options or parsing configuration files, these things are left
 * to the entity implementing this class.
 * @class NetPokerServer
 */
function NetPokerServer() {
	EventDispatcher.call(this);

	this.clientPort = null;
	this.connectionManager = new ConnectionManager(this);
	this.cashGameManager = null;
	this.backend = null;

	this.mockNetwork = false;
	this.fixedDeck = null;
	this.webRequestHandler = null;

	this.serverApi = new ServerApi(this);

	this.apiPort = null;
	this.apiOnClientPort = false;
}

FunctionUtil.extend(NetPokerServer, EventDispatcher);

NetPokerServer.STARTED = "started";

/**
 * Set port to tisten to.
 * @method setClientPort
 */
NetPokerServer.prototype.setClientPort = function(port) {
	this.clientPort = port;
}

/**
 * Use fixed deck for debugging.
 * @method useFixedDeck
 */
NetPokerServer.prototype.useFixedDeck = function(deck) {
	console.log("NetPokerServer: using fixed deck");

	this.fixedDeck = deck;

	if (this.cashGameManager)
		this.cashGameManager.useFixedDeck(this.fixedDeck);
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

	if (initMessage.getTableId() && this.cashGameManager) {
		var table = this.cashGameManager.getTableById(initMessage.getTableId());

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
NetPokerServer.prototype.onConnectionManagerRequest = function(e) {
	if (this.apiOnClientPort && this.serverApi.canHandleRequest(e.request)) {
		this.serverApi.handleRequest(e.request, e.response);
	} else if (this.webRequestHandler) {
		this.webRequestHandler.handleWebRequest(e);
	}
}

/**
 * Set backend to use.
 * @method setBackend
 */
NetPokerServer.prototype.setBackend = function(backend) {
	if (typeof backend == "string")
		this.backend = new Backend(backend);

	else if (backend && typeof backend == "object")
		this.backend = backend;

	else
		throw new Error("expected backend url or backend instance");
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
	console.log("Serving view cases from: " + dir);
	this.connectionManager.serveViewCases(dir);
}

/**
 * The table manager is initialized.
 * @method onCashGameManagerInitialized
 * @private
 */
NetPokerServer.prototype.onCashGameManagerInitialized = function() {
	this.connectionManager.on(ConnectionManager.CONNECTION, this.onConnectionManagerConnection, this);
	this.connectionManager.on("request", this.onConnectionManagerRequest, this);

	this.trigger(NetPokerServer.STARTED);
	this.runThenable.notifySuccess();
}

/**
 * Listen.
 * @method listen.
 */
NetPokerServer.prototype.listen = function() {
	this.connectionManager.listen(this.clientPort);
}

/**
 * Set api port.
 * @method setApiPort
 */
NetPokerServer.prototype.setApiPort = function(apiPort) {
	this.apiPort = apiPort;
}

/**
 * Api on client port.
 * @method setApiOnClientPort
 */
NetPokerServer.prototype.setApiOnClientPort = function(value) {
	this.apiOnClientPort = value;
}

/**
 * Set api key.
 * @method setApiKey
 */
NetPokerServer.prototype.setApiKey = function(key) {
	this.serverApi.setApiKey(key);
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

	if (!this.clientPort && !this.mockNetwork)
		throw new Error("No port to listen to.");

	if (this.clientPort && !this.connectionManager.isListening())
		this.connectionManager.listen(this.clientPort);

	if (this.apiPort)
		this.serverApi.listen(this.apiPort);

	this.runThenable = new Thenable();

	this.cashGameManager = new CashGameManager(this);

	if (this.fixedDeck)
		this.cashGameManager.useFixedDeck(this.fixedDeck);

	this.cashGameManager.on(CashGameManager.INITIALIZED, this.onCashGameManagerInitialized, this);
	this.cashGameManager.initialize();

	return this.runThenable;
}

/**
 * Hard close.
 * @method close
 */
NetPokerServer.prototype.close = function() {
	this.connectionManager.close();
	this.cashGameManager.close();
	this.serverApi.close();
}

/**
 * Set handler for regular web requests coming on on the web socket port
 * @method setWebRequestHandler
 */
NetPokerServer.prototype.setWebRequestHandler = function(webRequestHandler) {
	this.webRequestHandler = webRequestHandler;
}

module.exports = NetPokerServer;