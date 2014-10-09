var TableSeatSettings = require("../../../../src/server/table/TableSeatSettings");
var CheckboxMessage = require("../../../../src/proto/messages/CheckboxMessage");

describe("TableSeatSettings", function() {

	it("knows which settings are valid", function() {
		var settings = new TableSeatSettings();

		expect(function() {
			settings.get("asdfadsf");
		}).toThrow();

		settings.get(CheckboxMessage.AUTO_POST_BLINDS);
	});

	it("can manage settings", function() {
		var settings = new TableSeatSettings();

		expect(settings.get(CheckboxMessage.AUTO_MUCK_LOSING)).toBe(true);
		expect(settings.get(CheckboxMessage.SITOUT_NEXT)).toBe(false);

		settings.set(CheckboxMessage.AUTO_MUCK_LOSING, false)
		expect(settings.get(CheckboxMessage.AUTO_MUCK_LOSING)).toBe(false);
	});
});