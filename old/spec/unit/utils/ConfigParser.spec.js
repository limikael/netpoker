var ConfigParser = require("../../../src/utils/ConfigParser");

describe("ConfigParser", function() {
	it("can parse yml or json", function() {
		var yml = "data: 1\nis: 2\nyml: 3";
		var json = '{"data": 4, "is": 5, "json": 6}';
		var malformed = ":\nfawef awef aewf awef:::::::{}{}{{}{} aewf";
		var parsed;

		console.log("st");

		parsed = ConfigParser.parse(json);
		expect(parsed.data).toEqual(4);

		parsed = ConfigParser.parse(yml);
		expect(parsed.data).toEqual(1);

		//ConfigParser.parse(malformed);

		expect(function() {
			ConfigParser.parse(malformed);
		}).toThrow();
	});
});