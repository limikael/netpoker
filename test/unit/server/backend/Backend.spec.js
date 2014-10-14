var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var Backend = require("../../../../src/server/backend/Backend");
var http = require("http");
var url = require("url");

describe("Backend", function() {
	it("works", function(done) {
		var mockBackendServer = new MockBackendServer();
		mockBackendServer.setListenPort(9998);
		mockBackendServer.start();

		var backend = new Backend();
		backend.setBaseUrl("http://localhost:9998/");

		var params = {
			token: "user1"
		};

		backend.call(Backend.GET_USER_INFO_BY_TOKEN, params)
			.then(function(res) {
				expect(res).toEqual({
					"id": "101",
					"name": "olle"
				});
				mockBackendServer.close();
				done();
			});
	});

	it("sends a key", function(done) {
		var server = http.createServer();
		server.listen(2345);

		server.on("request", function(request, response) {
			console.log("*************** REQUEST");

			var urlParts = url.parse(request.url, true);
			var query = urlParts.query;

			expect(query).toEqual({
				param: "hello",
				key: "123"
			});

			response.end();
			server.close();
			done();
		});

		var backend = new Backend();
		backend.setBaseUrl("http://localhost:2345");
		backend.setKey("123");

		backend.call("test", {
			param: "hello"
		});
	});

	it("handles errors gracefully", function(done) {
		var mockBackendServer = new MockBackendServer();
		mockBackendServer.setListenPort(9998);
		mockBackendServer.start();

		var backend = new Backend();
		backend.setBaseUrl("http://localhost:9998/");

		var params = {
			token: "user1"
		};

		backend.call("doesnt_exist", params).then(
			function(res) {},
			function(err) {
				mockBackendServer.close();
				done();
			}
		);
	});
});