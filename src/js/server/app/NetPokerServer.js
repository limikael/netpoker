var ConnectionManager = require("../connection/ConnectionManager");
var TableManager = require("../table/TableManager");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Main app class.
 *
 */
function NetPokerServer() {
	EventDispatcher.call(this);

	this.listenPort = null;
	this.connectionManager = null;
	this.tableManager = null;
	this.backend = null;
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
 * New connection.
 * @method onConnectionManagerConnection
 */
NetPokerServer.prototype.onConnectionManagerConnection = function(e) {
	var initMessage = e.getInitMessage();

	if (initMessage.getTableId()) {
		var table = this.tableManager.getTableById(initMessage.getTableId());

		if (!table) {
			e.getProtoConnection().close();
			return;
		}

		console.log("user " + e.getUser().getName() + " connecting to table " + table.getId());
		table.notifyNewConnection(e.getProtoConnection(), e.getUser());
	} else {
		e.getProtoConnection().close();
	}
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
 * The table manager is initialized.
 * @method onTableManagerInitialized
 */
NetPokerServer.prototype.onTableManagerInitialized = function() {
	this.connectionManager = new ConnectionManager(this);
	this.connectionManager.on(ConnectionManager.CONNECTION, this.onConnectionManagerConnection, this);
	this.connectionManager.listen(this.listenPort);

	this.trigger(NetPokerServer.STARTED);
}

/**
 * Run.
 * @method run
 */
NetPokerServer.prototype.run = function() {
	if (!this.backend)
		throw "No backend";

	if (!this.listenPort)
		throw new Error("No port to listen to.");

	this.tableManager = new TableManager(this);
	this.tableManager.on(TableManager.INITIALIZED, this.onTableManagerInitialized, this);
	this.tableManager.initialize();
}

module.exports = NetPokerServer;