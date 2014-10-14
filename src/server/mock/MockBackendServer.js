/**
 * Server.
 * @module server
 */

var Backend = require("../../server/backend/Backend");
var Thenable = require("../../utils/Thenable");
var http = require("http");
var url = require("url");

/**
 * Backend with static data.
 * @class MockBackendServer
 */
function MockBackendServer() {}

/**
 * Set listen port.
 * @method setListenPort
 */
MockBackendServer.prototype.setListenPort = function(port) {
	this.listenPort = port;
}

/**
 * Handle method.
 * @method handleMethod
 */
MockBackendServer.prototype.handleMethod = function(method, params) {
	switch (method) {
		case Backend.GET_USER_INFO_BY_TOKEN:
			switch (params.token) {
				case "user1":
					return {
						id: "101",
						name: "olle"
					};

				case "user2":
					return {
						id: "102",
						name: "kalle"
					};

				case "user3":
					return {
						id: "103",
						name: "pelle"
					};

				case "user4":
					return {
						id: "104",
						name: "lisa"
					};
			}

		case Backend.GET_CASHGAME_TABLE_LIST:
			return {
				"tables": [{
					id: 123,
					numseats: 10,
					currency: "PLY",
					name: "Test Table",
					minSitInAmount: 10,
					maxSitInAmount: 100,
					stake: 2
				}]
			};

		case Backend.GET_USER_BALANCE:
			return {
				"balance": 10000
			};

		case Backend.SIT_IN:
			return true;

		case Backend.START_CASH_GAME:
			return {
				gameId: 987
			};
	}
}

/**
 * Handle get.
 * @method onRequest
 */
MockBackendServer.prototype.onRequest = function(request, response) {
	console.log("MockBackend request: " + request.url);
	var urlParts = url.parse(request.url, true);

	//console.log(urlParts);

	var method = urlParts.pathname;
	method = method.replace(/^\/*/, "");
	method = method.replace(/\/*$/, "");

	var result = this.handleMethod(method, urlParts.query);

	if (result)
		response.write(JSON.stringify(result));

	response.end();
}

/**
 * Start.
 * @method start
 */
MockBackendServer.prototype.start = function() {
	console.log("start mock backend...");
	this.server = http.createServer();
	this.server.listen(this.listenPort, "127.0.0.1");
	this.server.on("request", this.onRequest.bind(this));
}

/**
 * Close.
 * @method close
 */
MockBackendServer.prototype.close = function() {
	this.server.close();
}

/**
 * Make a call.
 * @method call
 */
MockBackendServer.prototype.call = function(method, params) {
	var thenable = new Thenable();
	var result = this.handleMethod(method, params);

	if (result)
		thenable.resolve(result);

	else
		thenable.reject();

	return thenable;
};

/**
 * So that it quacks the same as Backend.
 * @method setKey
 */
MockBackendServer.prototype.setKey = function(key) {};

module.exports = MockBackendServer;