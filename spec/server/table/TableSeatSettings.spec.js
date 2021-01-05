var TableSeatSettings = require("../../../src.js/server/table/TableSeatSettings");

describe("TableSeatSettings", function() {

	it("knows which settings are valid", function() {
		var settings = new TableSeatSettings();

		expect(function() {
			settings.get("asdfadsf");
		}).toThrow();

		settings.get("autoPostBlinds");
	});

	it("can manage settings", function() {
		var settings = new TableSeatSettings();

		expect(settings.get("autoMuckLosing")).toBe(true);
		expect(settings.get("sitOutNext")).toBe(false);

		settings.set("autoMuckLosing", false)
		expect(settings.get("autoMuckLosing")).toBe(false);
	});

	it("has an 'always pay blinds' mode", function() {
		var settings = new TableSeatSettings();

		settings.setAlwaysPayBlinds(true);
		expect(settings.get("autoPostBlinds")).toBe(true);

		expect(function() {
			settings.set("autoPostBlinds", false);
		}).toThrow();
	});
});