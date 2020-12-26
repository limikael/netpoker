/**
 * Server.
 * @module server
 */

var ConnectionManager = require("../connection/ConnectionManager");
var CashGameManager = require("../cashgame/CashGameManager");
var TournamentManager = require("../tournament/TournamentManager");
var EventDispatcher = require("yaed");
var Thenable = require("tinp");
var Backend = require("../backend/Backend");
var ServerApi = require("../api/ServerApi");
var NetPokerServerConfigurator = require("./NetPokerServerConfigurator");
var MockBackendServer = require("../mock/MockBackendServer");
var MockWebRequestHandler = require("../mock/MockWebRequestHandler");
var inherits = require("inherits");
var fs = require("fs");

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
	this.clientBindAddr = null;
	this.connectionManager = new ConnectionManager(this);
	this.cashGameManager = null;
	this.backend = null;
	this.backendKey = null;

	this.mockNetwork = false;
	this.fixedDeck = null;
	this.webRequestHandler = null;

	this.serverApi = new ServerApi(this);

	this.apiPort = null;
	this.apiOnClientPort = false;
	this.stopped = false;

	this.cashGameManager = new CashGameManager(this);
	this.cashGameManager.on(CashGameManager.IDLE, this.onCashGameManagerIdle, this);

	this.tournamentManager = new TournamentManager(this);

	this.sslCertFile = null;
	this.sslKeyFile = null;
	this.sslCaFiles = [];
}

inherits(NetPokerServer, EventDispatcher);

NetPokerServer.STARTED = "started";

NetPokerServer.INITIALIZING = "initializing";
NetPokerServer.RUNNING = "running";
NetPokerServer.STOPPED = "stopped";

/**
 * Set ssl certificate file.
 * @method setSslCertFile
 */
NetPokerServer.prototype.setSslCertFile = function(value) {
	this.sslCertFile = value;
}

/**
 * Set ssl key file.
 * @method sslKeyFile
 */
NetPokerServer.prototype.setSslKeyFile = function(value) {
	this.sslKeyFile = value;
}

/**
 * Add ssl certificate authority file.
 * @method addSslCaFile
 */
NetPokerServer.prototype.addSslCaFile = function(value) {
	this.sslCaFiles.push(value);
}

/**
 * Set port to tisten to.
 * @method setClientPort
 */
NetPokerServer.prototype.setClientPort = function(port) {
	this.clientPort = port;
}

/**
 * Set address to bind to for client connections.
 * @method setClientBindAddr
 */
NetPokerServer.prototype.setClientBindAddr = function(addr) {
	this.clientBindAddr = addr;
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

	//console.log("tournament id: " + initMessage.getTournamentId());

	if (initMessage.getTableId() && this.cashGameManager) {
		var table = this.cashGameManager.getTableById(initMessage.getTableId());

		if (!table) {
			console.log("table not found, refusing...")
			e.getProtoConnection().close();
			return;
		}

		if (e.getUser())
			console.log("user " + e.getUser().getName() + " connecting to table " + table.getId());

		else
			console.log("anonymous connection to table " + table.getId());

		table.notifyNewConnection(e.getProtoConnection(), e.getUser());
	} else if (initMessage.getTournamentId() && this.tournamentManager) {
		this.tournamentManager.findTournamentById(initMessage.getTournamentId()).then(
			function(tournament) {
				tournament.notifyNewConnection(e.getProtoConnection(), e.getUser());
			},

			function(err) {
				console.log("tournament not found, refusing...");
				e.getProtoConnection().close();
				return;
			}
		);
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
		this.webRequestHandler.handleWebRequest(e.request, e.response);
	} else if (this.apiOnClientPort) {
		this.serverApi.handleUsageRequest(e.request, e.response);
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

	if (this.backendKey)
		this.backend.setKey(this.backendKey);
}

/**
 * Set backend key.
 * @method setBackendKey
 */
NetPokerServer.prototype.setBackendKey = function(key) {
	this.backendKey = key;

	if (this.backend)
		this.backend.setKey(this.backendKey);
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
	this.runThenable.resolve();
}

/**
 * Listen.
 * @method listen.
 */
NetPokerServer.prototype.listen = function() {
	if (this.sslCertFile) {
		var sslOptions = {};
		sslOptions.ca = [];

		if (!this.sslKeyFile)
			throw new Error("Certificate specified, but no key.");

		var sslCert = fs.readFileSync(this.sslCertFile);
		if (!sslCert)
			throw new Error("Unable to read ssl cert file: " + this.sslCertFile);
		sslOptions.cert = sslCert;

		var sslKey = fs.readFileSync(this.sslKeyFile);
		if (!sslKey)
			throw new Error("Unable to read ssl key file: " + this.sslKeyFile);
		sslOptions.key = sslKey;

		for (var i = 0; i < this.sslCaFiles; i++) {
			var ca = fs.readFileSync(this.sslCaFiles[i]);
			if (!ca)
				throw new Error("Unable to read ssl ca file: " + this.sslCaFiles[i]);
			sslOptions.ca.push(ca);
		}

		this.connectionManager.setSslOptions(sslOptions);
	}

	this.connectionManager.listen(this.clientPort, this.clientBindAddr);
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
 * Set api and backend key.
 * @method setKey
 */
NetPokerServer.prototype.setKey = function(key) {
	this.setApiKey(key);
	this.setBackendKey(key);
}

/**
 * Do we have all settings required to start?
 * @method canStart
 */
NetPokerServer.prototype.canStart = function() {
	if (!this.clientPort && !this.mockNetwork)
		return false;

	if (!this.backend)
		return false;

	return true;
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
		this.listen();

	if (this.apiPort)
		this.serverApi.listen(this.apiPort);

	this.runThenable = new Thenable();

	if (this.fixedDeck)
		this.cashGameManager.useFixedDeck(this.fixedDeck);

	this.cashGameManager.on(CashGameManager.INITIALIZED, this.onCashGameManagerInitialized, this);
	this.cashGameManager.initialize();

	return this.runThenable;
}

/**
 * Get cashgame manager.
 * @method getCashGameManager
 */
NetPokerServer.prototype.getCashGameManager = function() {
	return this.cashGameManager;
}

/**
 * Get tournament manager.
 * @method getTournamentManager
 */
NetPokerServer.prototype.getTournamentManager = function() {
	return this.tournamentManager;
}

/**
 * Stop.
 * @method stop
 */
NetPokerServer.prototype.stop = function() {
	console.log("stop requested...");

	this.stopped = true;

	this.cashGameManager.stop();

	if (this.cashGameManager.isIdle()) {
		console.log("things are idle, we can close...");
		this.closeAndExit();
	}
}

/**
 * Cash game manager idle.
 * @method onCashGameManagerIdle
 */
NetPokerServer.prototype.onCashGameManagerIdle = function() {
	if (this.stopped) {
		console.log("stop requested, and things are idle... really stopping!")
		this.closeAndExit();
	}
}

/**
 * This should actually not be needed, but for some reason some
 * connections somewhere lingers or something.
 * Investigate!
 * @method closeAndExit
 */
NetPokerServer.prototype.closeAndExit = function() {
	this.close();
	setTimeout(function() {
		process.exit(0);
	}, 10);
}

/**
 * Hard close.
 * @method close
 */
NetPokerServer.prototype.close = function() {
	this.connectionManager.close();
	this.cashGameManager.close();
	this.tournamentManager.close();
	this.serverApi.close();
}

/**
 * Set handler for regular web requests coming on on the web socket port
 * @method setWebRequestHandler
 */
NetPokerServer.prototype.setWebRequestHandler = function(webRequestHandler) {
	this.webRequestHandler = webRequestHandler;
}

/**
 * Get client port.
 * @method getClientPort
 */
NetPokerServer.prototype.getClientPort = function() {
	return this.clientPort;
}

/**
 * Load config file or url.
 * @method loadConfig
 * @return Thenable
 */
NetPokerServer.prototype.loadConfig = function(fileName) {
	var configurator = new NetPokerServerConfigurator(this);
	return configurator.loadConfigSource(fileName);
}

/**
 * Alias for loadConfig
 * @method loadConfigFile
 * @return Thenable
 */
NetPokerServer.prototype.loadConfigFile = function(fileName) {
	return this.loadConfig(fileName);
}

/**
 * Use mock.
 * @method useMock
 */
NetPokerServer.prototype.useMock = function() {
	this.serveViewCases(__dirname + "/../../../res/viewcases");

	var mockBackend = new MockBackendServer();
	mockBackend.tournamentSeatsPerTable = 2;
	mockBackend.tournamentRequiredRegistrations = 4;
	this.setBackend(mockBackend);


	//	this.setBackend(new MockBackendServer());
	this.setWebRequestHandler(new MockWebRequestHandler());
}

/**
 * Get run state.
 * @method getState
 */
NetPokerServer.prototype.getState = function() {
	if (this.stopped)
		return NetPokerServer.STOPPED;

	return NetPokerServer.RUNNING;
}

module.exports = NetPokerServer;