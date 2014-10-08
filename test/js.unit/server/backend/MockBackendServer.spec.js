var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var Backend = require("../../../../src/server/backend/Backend");
var request = require("request");

describe("MockBackendServer", function() {
	it("works", function(done) {
		var mockBackendServer = new MockBackendServer();

		mockBackendServer.setListenPort(9999);
		mockBackendServer.start();

		r = request("http://localhost:9999/" + Backend.GET_USER_INFO_BY_TOKEN + "/?token=user1", function(e, r, body) {
			expect(JSON.parse(body)).toEqual({
				id: "101",
				name: "olle"
			});
			mockBackendServer.close();
			done();
		});
	});

	it("can be used as a backend", function(done) {
		var mockBackendServer=new MockBackendServer();

		var params = {
			token: "user1"
		};

		mockBackendServer.call(Backend.GET_USER_INFO_BY_TOKEN, params)
			.then(function(res) {
				expect(res).toEqual({
					"id": "101",
					"name": "olle"
				});
				done();
			});
	});
});