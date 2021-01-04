var GameSeatPrompt = require("../../../src.js/server/game/GameSeatPrompt");
var EventEmitter = require("events");

describe("GameSeatPrompt", function() {
	var mockGameSeat;

	beforeEach(function() {
		mockTableSeat = new EventEmitter();
		mockTableSeat.sitout = jasmine.createSpy();

		mockGame = {
			prompt: null
		};
		mockGame.send = jasmine.createSpy();
		mockGame.setGameSeatPrompt = function(prompt) {
			this.gameSeatPrompt = prompt;
		};

		mockGameSeat = {};
		mockGameSeat.send = jasmine.createSpy();
		mockGameSeat.getTableSeat = function() {
			return mockTableSeat;
		};

		mockGameSeat.getSeatIndex = function() {
			return 5;
		};

		mockGameSeat.getGame = function() {
			return mockGame;
		}

		mockGameSeat.getCurrentPreset = function() {
			return null;
		}

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("sends a button message", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton("fold");
		gameSeatPrompt.setDefaultButton("fold");
		gameSeatPrompt.ask();
		expect(mockGameSeat.send).toHaveBeenCalled();
		expect(mockGame.send).toHaveBeenCalled();
		expect(mockGame.gameSeatPrompt).toBe(gameSeatPrompt);

		var clickSpy = jasmine.createSpy();
		gameSeatPrompt.on("complete", clickSpy);
		mockTableSeat.emit("buttonClick", {button: "fold", value: 123});
		expect(clickSpy).toHaveBeenCalled();

		expect(gameSeatPrompt.getButton()).toBe("fold");
		expect(gameSeatPrompt.getValue()).toBe(123);

		expect(mockTableSeat.eventNames()).toEqual([]);
		expect(mockGame.gameSeatPrompt).toBe(null);
	});

	it("selects a default buttons on timeout", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton("fold");
		gameSeatPrompt.addButton("raise");
		gameSeatPrompt.setDefaultButton("fold");
		gameSeatPrompt.setResponseTime(10);

		gameSeatPrompt.ask();

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on("complete", completeSpy);

		jasmine.clock().tick(11 * 1000);

		expect(completeSpy).toHaveBeenCalled();

		// make sure listeners are removed.
		expect(mockTableSeat.eventNames()).toEqual([]);
	});

	it("can create a TimerMessage", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton("fold");
		gameSeatPrompt.addButton("raise");
		gameSeatPrompt.setDefaultButton("fold");
		gameSeatPrompt.setResponseTime(10);

		gameSeatPrompt.ask();

		var m = gameSeatPrompt.getCurrentTimerMessage();
		m = JSON.parse(JSON.stringify(m));

		expect(m).toEqual({
			seatIndex: 5,
			totalTime: 10,
			timeLeft: 10
		});

		jasmine.clock().tick(5000);
	});

	it("can use table seat settings", function() {
		mockTableSeat.getSetting = function(settingId) {
			if (settingId != "blaj")
				throw new Error("something is strange");

			return true;
		};

		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton("muck");
		gameSeatPrompt.addButton("show");
		gameSeatPrompt.setDefaultButton("muck");

		gameSeatPrompt.useTableSeatSetting("blaj", "muck");

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on("complete", completeSpy);

		gameSeatPrompt.ask();

		expect(completeSpy).toHaveBeenCalled();
		expect(gameSeatPrompt.getButton()).toBe("muck");
	});

	it("can use detect changes to table seat settings", function() {
		var blajSetting = false;

		mockTableSeat.getSetting = function(settingId) {
			if (settingId != "blaj")
				throw new Error("something is strange");

			return blajSetting;
		};

		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton("muck");
		gameSeatPrompt.addButton("show");
		gameSeatPrompt.setDefaultButton("muck");

		gameSeatPrompt.useTableSeatSetting("blaj", "muck");

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on("complete", completeSpy);

		gameSeatPrompt.ask();

		expect(completeSpy).not.toHaveBeenCalled();
		expect(function() {
			gameSeatPrompt.getButton();
		}).toThrow();

		mockTableSeat.emit("settingsChanged");
		expect(completeSpy).not.toHaveBeenCalled();

		blajSetting = true;
		mockTableSeat.emit("settingsChanged");
		expect(completeSpy).toHaveBeenCalled();
		expect(gameSeatPrompt.getButton()).toBe("muck");

		expect(mockTableSeat.eventNames()).toEqual([]);
	});

	it("can use game seat presets", function() {

		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		mockGameSeat.getCurrentPreset = function() {
			return "call";
		}

		mockGameSeat.getCurrentPresetValue = function() {
			return 50;
		}

		gameSeatPrompt.addButton("fold");
		gameSeatPrompt.addButton("call", 50);
		gameSeatPrompt.setDefaultButton("fold");

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on("complete", completeSpy);

		gameSeatPrompt.ask();
		expect(completeSpy).toHaveBeenCalled();

		expect(gameSeatPrompt.getButton()).toBe("call");
	});
});