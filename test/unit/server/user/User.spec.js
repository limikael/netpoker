var User = require("../../../../src/server/user/User");

describe("User", function() {
	it("has id and name", function() {
		var u = new User({
			"id": 123,
			"name": "hello"
		});

		expect(u.getId()).toEqual(123);
		expect(u.getName()).toEqual("hello");
	});
})