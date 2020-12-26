var ObjectUtil = require("../../../src/utils/ObjectUtil");

describe("ObjectUtil", function() {
	it("can compare objects", function() {
		expect(ObjectUtil.equals(1, 1)).toBe(true);
		expect(ObjectUtil.equals(1, "1")).toBe(false);

		var a = {
			"hello": "world"
		};

		var b = {
			"hello": "world"
		};

		expect(ObjectUtil.equals(a, b)).toBe(true);
		expect(ObjectUtil.equals(a, "b")).toBe(false);

		b.test = 1;

		expect(ObjectUtil.equals(a, b)).toBe(false);
	});

	it("can copy objects", function() {
		var a = {
			"hello": "111",
			"world": "222"
		};

		b = ObjectUtil.copy(a);

		a.hello="999";

		expect(b).toEqual({
			"hello": "111",
			"world": "222"
		});
	});
});