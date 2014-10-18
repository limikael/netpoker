/**
 * Server.
 * @module server
 */

var ApiServer = require("../../utils/ApiServer");
var PollNumPlayersRequestHandler = require("./PollNumPlayersRequestHandler");

/**
 * A http api so the server can be queried from the outside world.
 * @class ServerApi
 */
function ServerApi(netPokerServer) {
	this.netPokerServer = netPokerServer;
	this.apiServer = new ApiServer();

	this.apiServer.registerHandler("info", this.onInfo.bind(this));
	this.apiServer.registerHandler("reloadTables", this.onReloadTables.bind(this));
	this.apiServer.registerHandler("stop", this.onStop.bind(this));
	this.apiServer.registerRawHandler("pollNumPlayers", this.onPollNumPlayers.bind(this));
}

/**
 * Info request.
 * @method onInfo
 */
ServerApi.prototype.onInfo = function(p) {
	var o = {};

	o.state = this.netPokerServer.getState();
	o.tables = [];

	var tables = this.netPokerServer.getCashGameManager().getTables();

	for (var i = 0; i < tables.length; i++) {
		var table = tables[i];
		var tableInfo = {};

		tableInfo.id = table.getId();
		tableInfo.players = table.getNumInGame();
		tableInfo.game = table.getCurrentGame() ? true : false;

		if (table.isStopped())
			tableInfo.state = "stopped";

		else
			tableInfo.state = "running";

		o.tables.push(tableInfo);
	}

	return o;
}

/**
 * Reload table data..
 * @method onInfo
 */
ServerApi.prototype.onReloadTables = function(p) {
	this.netPokerServer.getCashGameManager().reloadTables();

	return true;
}

/**
 * Stop.
 * @method onStop
 */
ServerApi.prototype.onStop = function(p) {
	this.netPokerServer.stop();

	return true;
}

/**
 * Poll for change in number of active users.
 * @method onPoll
 */
ServerApi.prototype.onPollNumPlayers = function(request, response, p) {
	var handler = new PollNumPlayersRequestHandler(this.netPokerServer)
	handler.handleRequest(request, response, p);
}

/**
 * Listen to specified port.
 * @method listen
 */
ServerApi.prototype.listen = function(port) {
	this.apiServer.listen(port);
}

/**
 * Close.
 * @method close
 */
ServerApi.prototype.close = function() {
	this.apiServer.close();
}

/**
 * Can we handle this request?
 * @method canHandleRequest
 */
ServerApi.prototype.canHandleRequest = function(request) {
	return this.apiServer.canHandleRequest(request);
}

/**
 * Handle request.
 * @method handleRequest
 */
ServerApi.prototype.handleRequest = function(request, response) {
	this.apiServer.handleWebRequest(request, response);
}

/**
 * Handle request on root, show usage.
 * @method handleUsageRequest
 */
ServerApi.prototype.handleUsageRequest = function(request, response) {
	response.setHeader("Content-Type", "text/plain");
	response.write("\n");
	response.write("Available API calls:\n");
	response.write("\n");
	response.write("  /info          - Get server status information.\n");
	response.write("  /stop          - Cleanly stop the server.\n");
	response.write("  /reloadTables  - Reload table information from backend.\n");
	response.write("\n");
	response.end();
}

/**
 * Require key.
 * @method setApiKey
 */
ServerApi.prototype.setApiKey = function(key) {
	this.apiServer.setAuthentication("key", key);
}

module.exports = ServerApi;