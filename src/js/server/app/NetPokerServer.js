var ConnectionManager = require("../connection/ConnectionManager");

/**
 * Main app class.
 *
 */
function NetPokerServer() {
	this.listenPort = null;
}

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
	
}

/**
 * Run.
 * @method run
 */
NetPokerServer.prototype.run = function() {
	if (!this.listenPort)
		throw new Error("No port to listen to.");

	this.connectionManager = new ConnectionManager();
	this.connectionManager.on(ConnectionManager.CONNECTION, this.onConnectionManagerConnection, this);
	this.connectionManager.listen(this.listenPort);
}