var NetPokerServer = require("../../src/server/app/NetPokerServer");
var EventDispatcher = require("yaed");
var MessagePipeConnection = require("./MessagePipeConnection");
var inherits = require("inherits");

/**
 * PipeNetPokerServer
 */
function PipeNetPokerServer() {
	NetPokerServer.call(this);

	this.mockNetwork = true;
}

inherits(PipeNetPokerServer, NetPokerServer);

/**
 * Create a connected message pipe.
 */
PipeNetPokerServer.prototype.createMessagePipeConnection = function() {
	var c = new MessagePipeConnection();

	this.connectionManager.handleNewConnection(c);

	return c.createConnection();
}

module.exports = PipeNetPokerServer;