var ArrayUtil = require("../../../src/utils/ArrayUtil");

describe("ArrayUtil", function() {
	it("can shallow copy an array", function() {
		var a = ["hello", "world", "bla", "ble"];

		copy = ArrayUtil.copy(a);

		a[0] = "awef";
		a.splice(2, 1);

		expect(copy).toEqual(["hello", "world", "bla", "ble"]);
	});
})