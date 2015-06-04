/**
 * Server.
 * @module server
 */

var Backend = require("../../server/backend/Backend");
var Thenable = require("tinp");
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

MockBackendServer.prototype.getUserInfoByToken = function(params) {
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

		case "anon":
			return {
				not: "logged in"
			};
	}
}

MockBackendServer.prototype.getCashGameTableList = function(params) {
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
}

MockBackendServer.prototype.getUserBalance = function(params) {
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
}

MockBackendServer.prototype.cashGameUserJoin = function(params) {
	return {
		ok: 1
	};
}

MockBackendServer.prototype.gameStartForCashGame = function(params) {
	return {
		gameId: 987
	};
}

MockBackendServer.prototype.tournamentInfo = function(params) {
	return {
		id: 666,
		state: "registration",
		info: "Welcome to the tournament...",
	};
}

MockBackendServer.prototype.tournamentRegister = function(params) {
	return {
		ok: 1
	};
}

/**
 * Handle method.
 * @method handleMethod
 */
MockBackendServer.prototype.handleMethod = function(method, params) {
	console.log("MockBackend: " + method);

	if (this[method])
		return this[method](params);
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

	if (result) {
		result.ok = 1;
		response.write(JSON.stringify(result));
	}

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
}

/**
 * So that it quacks the same as Backend.
 * @method setKey
 */
MockBackendServer.prototype.setKey = function(key) {};

module.exports = MockBackendServer;