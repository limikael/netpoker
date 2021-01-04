var GameSeat = require("../../../src.js/server/game/GameSeat");
var EventEmitter = require("events");

describe("GameSeat", function() {
	var mockTable;
	var mockGame;
	var mockTableSeat;

	beforeEach(function() {
		mockTableSeat = new EventEmitter();
		mockTableSeat.chips = 100;
		mockTableSeat.addChips = function(chips) {
			this.chips += chips;
		};
		mockTableSeat.getSeatIndex = function() {
			return 1;
		}
		mockTableSeat.getChips = function() {
			return this.chips;
		}

		mockTableSeat.getSeatInfoMessage = function() {};
		mockTableSeat.send = jasmine.createSpy();

		mockGame = {};
		mockGame.getTable = function() {
			return mockTable;
		};
		mockGame.send = function(m) {
			mockTable.send(m);
		};

		mockTable = {};
		mockTable.getTableSeatBySeatIndex = function() {
			return mockTableSeat;
		};
		mockTable.send = jasmine.createSpy();
	});

	afterEach(function() {});

	it("can make a bet", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.makeBet(10);

		expect(mockTableSeat.chips).toBe(90);
		expect(gameSeat.bet).toBe(10);
		expect(mockTable.send).toHaveBeenCalled();
	});

	it("can return a bet", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.makeBet(10);

		expect(mockTableSeat.chips).toBe(90);
		expect(gameSeat.bet).toBe(10);

		gameSeat.returnBet();
	});

	it("has presets", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset("fold");
		expect(gameSeat.presets[0].isEnabled()).toBe(true);

		gameSeat.disableAllPresets();
		expect(gameSeat.presets[0].isEnabled()).toBe(false);
	});

	it("can enable/disable presets", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset("call", 50);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);

		gameSeat.currentPreset = "call";
		gameSeat.currentPresetValue = 50;

		gameSeat.enablePreset("call", 50);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);
		expect(gameSeat.currentPreset).toBe("call");
		expect(gameSeat.currentPresetValue).toBe(50);

		gameSeat.enablePreset("call", 70);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);
		expect(gameSeat.currentPreset).toBe(null);
		expect(gameSeat.currentPresetValue).toBe(0);
	});

	it("updates presets", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset("fold");
		gameSeat.enablePreset("call", 50);

		var m = {button: "fold"}
		mockTableSeat.emit("presetButtonClick", m);
		expect(gameSeat.getCurrentPreset()).toBe("fold");

		m = {button: "call", value: 50};
		mockTableSeat.emit("presetButtonClick", m);
		expect(gameSeat.getCurrentPreset()).toBe("call");
		expect(gameSeat.getCurrentPresetValue()).toBe(50);
	});

	it("can disable presets and enable them again", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset("fold");
		gameSeat.enablePreset("call", 50);

		mockTableSeat.emit("presetButtonClick",{
			button: "fold"
		});

		expect(gameSeat.getCurrentPreset()).toBe("fold");
		gameSeat.disableAllPresets();

		gameSeat.enablePreset("fold");
		expect(gameSeat.getCurrentPreset()).toBe(null);
	});
});