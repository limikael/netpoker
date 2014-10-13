var ApiServer = require("../../../src/utils/ApiServer");
var request = require("request");

describe("ApiServer", function() {
	it("can handle a an api request", function(done) {
		var apiServer = new ApiServer();
		apiServer.listen(9999);

		apiServer.registerHandler("testf", function(p) {
			return {
				"hello": "world" + p.val
			}
		});

		request("http://localhost:9999/testf?val=2", function(error, response, body) {
			expect(response.statusCode).toEqual(200);

			expect(JSON.parse(body)).toEqual({
				"hello": "world2"
			});

			apiServer.close();
			done();
		});
	});

	it("handles missing methods gracefully", function(done) {
		var apiServer = new ApiServer();
		apiServer.listen(9999);

		request("http://localhost:9999/testfsds", function(error, response, body) {
			expect(response.statusCode).toEqual(404);
			expect(JSON.parse(body)).toEqual("No such method.");
			apiServer.close();
			done();
		});
	});

	it("handles method error gracefully", function(done) {
		var apiServer = new ApiServer();
		apiServer.listen(9999);

		apiServer.registerHandler("testf", function() {
			throw new Error("hello world");
			//throw "hello world";
		});

		request("http://localhost:9999/testf", function(error, response, body) {
			expect(response.statusCode).toEqual(500);
			expect(JSON.parse(body)).toEqual("hello world");
			apiServer.close();
			done();
		});
	});

	it("can require a key", function(done) {
		var apiServer = new ApiServer();
		apiServer.listen(9999);

		apiServer.registerHandler("testf", function() {
			return "hello";
		});

		apiServer.setAuthentication("key", "test");

		request("http://localhost:9999/testf", function(error, response, body) {
			expect(response.statusCode).toEqual(401);
			expect(JSON.parse(body)).toEqual("Unauthorized.");
			apiServer.close();
			done();
		});
	});
});
