var CardData = require("../../../../src/js/proto/data/CardData");

describe("CardData", function() {

	it("can create a CardData from a string", function() {
		var cd=CardData.fromString("10C");
		expect(cd.toString()).toBe("10C");

		var cd=CardData.fromString("AD");
		expect(cd.toString()).toBe("AD");

		expect(function() {
			CardData.fromString("11C")
		}).toThrow();
	});
});