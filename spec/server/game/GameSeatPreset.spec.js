var GameSeatPreset = require("../../../src.js/server/game/GameSeatPreset");

describe("GameSeatPreset", function() {
	it("can manage a preset", function() {
		var gameSeatPreset = new GameSeatPreset("fold", 1);

		expect(gameSeatPreset.isEnabled()).toBe(false);
		gameSeatPreset.setEnabled(true);
		expect(gameSeatPreset.isEnabled()).toBe(true);

		expect(gameSeatPreset.getButtonIndex()).toBe(1);
		expect(gameSeatPreset.getValue()).toBe(0);

		gameSeatPreset.setValue(10);

		expect(gameSeatPreset.getValue()).toBe(10);

		expect(gameSeatPreset.getButtonId()).toBe("fold");
	});
});