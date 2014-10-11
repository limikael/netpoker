var GameSeat = require("../../../../src/server/game/GameSeat");
var ButtonData = require("../../../../src/proto/data/ButtonData");

describe("GameSeat", function() {
	var mockTable;
	var mockGame;
	var mockTableSeat;

	beforeEach(function() {
		mockTableSeat = {};
		mockTableSeat.chips = 100;
		mockTableSeat.addChips = function(chips) {
			this.chips += chips;
		};
		mockTableSeat.getSeatIndex = function() {
			return 1;
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

	it("manages current preset", function() {
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
});