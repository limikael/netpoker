var NetPokerServer = require("../../../../src/server/app/NetPokerServer");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var request = require("request");

describe("ServerApi - integration", function() {
	it("can request status information from the server", function(done) {
		var netPokerServer;

		AsyncSequence.run(
			function(next) {
				netPokerServer = new NetPokerServer();
				netPokerServer.setClientPort(2222);
				netPokerServer.setApiPort(8888);
				netPokerServer.setBackend(new MockBackendServer());
				netPokerServer.run().then(next);
			},

			function(next) {
				request("http://localhost:8888/info", function(error, response, body) {
					expect(response.statusCode).toEqual(200);

					var data=JSON.parse(body);
					expect(data.state).toBe("running");

					netPokerServer.close();
					next();
				});
			}
		).then(done);
	});

	it("can use the client port for the api", function(done) {
		var netPokerServer;

		AsyncSequence.run(
			function(next) {
				netPokerServer = new NetPokerServer();
				netPokerServer.setClientPort(2222);
				netPokerServer.setApiOnClientPort(true);
				netPokerServer.setBackend(new MockBackendServer());
				netPokerServer.run().then(next);
			},

			function(next) {
				request("http://localhost:2222/info", function(error, response, body) {
					expect(response.statusCode).toEqual(200);

					var data=JSON.parse(body);
					expect(data.state).toBe("running");

					netPokerServer.close();
					next();
				});
			}
		).then(done);
	});

	it("can require an api key", function(done) {
		var netPokerServer;

		AsyncSequence.run(
			function(next) {
				netPokerServer = new NetPokerServer();
				netPokerServer.setClientPort(2222);
				netPokerServer.setApiOnClientPort(true);
				netPokerServer.setApiKey("asdfasdf");
				netPokerServer.setBackend(new MockBackendServer());
				netPokerServer.run().then(next);
			},

			function(next) {
				request("http://localhost:2222/info", function(error, response, body) {
					expect(response.statusCode).toEqual(401);
					expect(JSON.parse(body)).toEqual("Unauthorized.");
					next();
				});
			},

			function(next) {
				request("http://localhost:2222/info?key=asdfasdf", function(error, response, body) {
					expect(response.statusCode).toEqual(200);

					var data=JSON.parse(body);
					expect(data.state).toBe("running");

					netPokerServer.close();
					next();
				});
			}
		).then(done);
	});

	it("can poll for active players", function(done) {
		var netPokerServer;

		AsyncSequence.run(
			function(next) {
				netPokerServer = new NetPokerServer();
				netPokerServer.setClientPort(2222);
				netPokerServer.setApiOnClientPort(true);
				netPokerServer.setBackend(new MockBackendServer());
				netPokerServer.run().then(next);
			},

			function(next) {
				request("http://localhost:2222/pollNumPlayers", function(r,e,body) {
					console.log("got: "+body);
					netPokerServer.close();
					next();
				});
			}
		).then(done);
	});
});