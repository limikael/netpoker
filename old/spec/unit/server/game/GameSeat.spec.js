var GameSeat = require("../../../../src/server/game/GameSeat");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var PresetButtonClickMessage = require("../../../../src/proto/messages/PresetButtonClickMessage");
var EventDispatcher = require("yaed");

describe("GameSeat", function() {
	var mockTable;
	var mockGame;
	var mockTableSeat;

	beforeEach(function() {
		mockTableSeat = new EventDispatcher();
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

		gameSeat.enablePreset(ButtonData.FOLD);
		expect(gameSeat.presets[0].isEnabled()).toBe(true);

		gameSeat.disableAllPresets();
		expect(gameSeat.presets[0].isEnabled()).toBe(false);
	});

	it("can enable/disable presets", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset(ButtonData.CALL, 50);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);

		gameSeat.currentPreset = ButtonData.CALL;
		gameSeat.currentPresetValue = 50;

		gameSeat.enablePreset(ButtonData.CALL, 50);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);
		expect(gameSeat.currentPreset).toBe(ButtonData.CALL);
		expect(gameSeat.currentPresetValue).toBe(50);

		gameSeat.enablePreset(ButtonData.CALL, 70);
		expect(gameSeat.presets[3].isEnabled()).toBe(true);
		expect(gameSeat.currentPreset).toBe(null);
		expect(gameSeat.currentPresetValue).toBe(0);
	});

	it("updates presets", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset(ButtonData.FOLD);
		gameSeat.enablePreset(ButtonData.CALL, 50);

		var m = new PresetButtonClickMessage(ButtonData.FOLD);
		mockTableSeat.trigger(PresetButtonClickMessage.TYPE, m);
		expect(gameSeat.getCurrentPreset()).toBe(ButtonData.FOLD);

		m = new PresetButtonClickMessage(ButtonData.CALL, 50);
		mockTableSeat.trigger(PresetButtonClickMessage.TYPE, m);
		expect(gameSeat.getCurrentPreset()).toBe(ButtonData.CALL);
		expect(gameSeat.getCurrentPresetValue()).toBe(50);
	});

	it("can disable presets and enable them again", function() {
		var gameSeat = new GameSeat(mockGame, 1);

		gameSeat.enablePreset(ButtonData.FOLD);
		gameSeat.enablePreset(ButtonData.CALL, 50);

		var m = new PresetButtonClickMessage(ButtonData.FOLD);
		mockTableSeat.trigger(PresetButtonClickMessage.TYPE, m);

		expect(gameSeat.getCurrentPreset()).toBe(ButtonData.FOLD);
		gameSeat.disableAllPresets();

		gameSeat.enablePreset(ButtonData.FOLD);
		expect(gameSeat.getCurrentPreset()).toBe(null);
	});
});