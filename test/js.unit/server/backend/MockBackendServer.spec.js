var MockBackendServer = require("../../../utils/MockBackendServer");
var Backend = require("../../../../src/js/server/backend/Backend");
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
});