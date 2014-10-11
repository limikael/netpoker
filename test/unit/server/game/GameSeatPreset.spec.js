var GameSeatPreset = require("../../../../src/server/game/GameSeatPreset");
var ButtonData = require("../../../../src/proto/data/ButtonData");

describe("GameSeatPreset", function() {
	it("can manage a preset", function() {
		var gameSeatPreset = new GameSeatPreset(ButtonData.FOLD, 1);

		expect(gameSeatPreset.isEnabled()).toBe(false);
		gameSeatPreset.setEnabled(true);
		expect(gameSeatPreset.isEnabled()).toBe(true);

		expect(gameSeatPreset.getButtonIndex()).toBe(1);
		expect(gameSeatPreset.getValue()).toBe(0);

		gameSeatPreset.setValue(10);

		expect(gameSeatPreset.getValue()).toBe(10);
	});
});