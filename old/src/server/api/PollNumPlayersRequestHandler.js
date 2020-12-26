var ObjectUtil = require("../../utils/ObjectUtil");
var CashGameManager = require("../cashgame/CashGameManager");

/**
 * Poll for change in number of users.
 * @method PollNumPlayersRequestHandler
 */
function PollNumPlayersRequestHandler(netPokerServer) {
	this.netPokerServer = netPokerServer;
}

PollNumPlayersRequestHandler.TIMEOUT_DELAY = 10000;

/**
 * Handle request.
 * @method handlerRequest
 */
PollNumPlayersRequestHandler.prototype.handleRequest = function(request, response, parameters) {
	//console.log(request);

	this.request = request;
	this.response = response;
	this.parameters = parameters;

	this.referenceState = null;

	if (parameters && parameters.state) {
		console.log("got state for num players poll: " + parameters.state);
		this.referenceState = JSON.parse(decodeURIComponent(parameters.state));
	} else {
		console.log("got num players poll without state");
	}

	var state = this.getCurrentState();

	if (this.shouldReturn(state)) {
		console.log("PollNumPlayersRequestHandler: returning immediately");
		this.response.write(JSON.stringify(state));
		this.response.end();
		return;
	}

	this.netPokerServer.getCashGameManager().on(CashGameManager.NUM_PLAYERS_CHANGE, this.onNumPlayersChange, this);
	this.request.on("close", this.onRequestClose.bind(this));

	this.timeoutId = setTimeout(this.onTimeout.bind(this), PollNumPlayersRequestHandler.TIMEOUT_DELAY);
}

/**
 * Number of players changed.
 * @method onNumPlayersChange
 * @private
 */
PollNumPlayersRequestHandler.prototype.onNumPlayersChange = function() {
	var state = this.getCurrentState();

	if (this.shouldReturn(state)) {
		console.log("PollNumPlayersRequestHandler: returning now: " + JSON.stringify(state));

		this.netPokerServer.getCashGameManager().off(CashGameManager.NUM_PLAYERS_CHANGE, this.onNumPlayersChange, this);
		this.response.write(JSON.stringify(state));
		this.response.end();

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		console.log("done returning..");
	}
}

/**
 * Timeout, send anyway.
 * @method onTimeout
 * @private
 */
PollNumPlayersRequestHandler.prototype.onTimeout = function() {
	console.log("PollNumPlayersRequestHandler: timeout");

	var state = this.getCurrentState();

	this.netPokerServer.getCashGameManager().off(CashGameManager.NUM_PLAYERS_CHANGE, this.onNumPlayersChange, this);
	this.response.write(JSON.stringify(state));
	this.response.end();

	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
}

/**
 * Request was closed.
 * @method onRequestClose
 * @private
 */
PollNumPlayersRequestHandler.prototype.onRequestClose = function() {
	console.log("PollNumPlayersRequestHandler: request was closed");

	this.netPokerServer.getCashGameManager().off(CashGameManager.NUM_PLAYERS_CHANGE, this.onNumPlayersChange, this);
	this.response.end();

	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
}

/**
 * Get current poll state.
 * @method getCurrentState
 */
PollNumPlayersRequestHandler.prototype.getCurrentState = function() {
	var tables = this.netPokerServer.getCashGameManager().getTables();
	var pollState = {};

	for (var i = 0; i < tables.length; i++) {
		var table = tables[i];

		pollState[table.getId()] = table.getNumInGame();
	}

	return pollState;
}

/**
 * Check if this state is should result in a return.
 * @method shouldReturn
 */
PollNumPlayersRequestHandler.prototype.shouldReturn = function(state) {
	if (!this.referenceState)
		return true;

	for (var key in this.referenceState)
		if (this.referenceState[key] != state[key])
			return true;

	return false;
}

module.exports = PollNumPlayersRequestHandler