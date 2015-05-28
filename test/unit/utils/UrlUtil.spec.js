var UrlUtil = require("../../../src/utils/UrlUtil");

describe("UrlUtil", function() {
	it("can create absolute urls", function() {
		window = {};
		window.location = {};

		window.location.href = "http://example.com/path/to/a/file.html";

		expect(UrlUtil.makeAbsolute("hello.php")).toBe("http://example.com/path/to/a/hello.php");
		expect(UrlUtil.makeAbsolute("/hello.php")).toBe("http://example.com/hello.php");

		delete window;
	});
});