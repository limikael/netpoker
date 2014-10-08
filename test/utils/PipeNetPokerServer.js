var NetPokerServer = require("../../src/server/app/NetPokerServer");
var FunctionUtil = require("../../src/utils/FunctionUtil");
var EventDispatcher = require("../../src/utils/EventDispatcher");
var MessagePipeConnection = require("./MessagePipeConnection");

/**
 * PipeNetPokerServer
 */
function PipeNetPokerServer() {
	NetPokerServer.call(this);

	this.mockNetwork = true;
}

FunctionUtil.extend(PipeNetPokerServer, NetPokerServer);

/**
 * Create a connected message pipe.
 */
PipeNetPokerServer.prototype.createMessagePipeConnection = function() {
	var c = new MessagePipeConnection();

	this.connectionManager.handleNewConnection(c);

	return c.createConnection();
}

module.exports = PipeNetPokerServer;