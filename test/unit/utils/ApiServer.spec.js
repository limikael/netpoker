var ApiServer = require("../../../src/utils/ApiServer");
var request = require("request");

describe("ApiServer", function() {
	it("can handle a an api request", function(done) {
		var apiServer = new ApiServer();
		apiServer.listen(9999);

		request("http://localhost:9999/testfunc", function(error, response, body) {
			expect(JSON.parse(body)).toEqual({
				"hello": "world"
			});

			apiServer.close();
			done();
		});
	});
});