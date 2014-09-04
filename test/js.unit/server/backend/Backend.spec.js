var MockBackendServer = require("../../../utils/MockBackendServer");
var Backend = require("../../../../src/js/server/backend/Backend");

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
});