var GameSeatPrompt = require("../../../../src/server/game/GameSeatPrompt");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var EventDispatcher = require("../../../../src/utils/EventDispatcher");

describe("GameSeatPrompt", function() {
	var mockGameSeat;

	beforeEach(function() {
		mockTableSeat = new EventDispatcher();
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

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("sends a button message", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton(new ButtonData(ButtonData.FOLD));
		gameSeatPrompt.setDefaultButton(ButtonData.FOLD);
		gameSeatPrompt.ask();
		expect(mockGameSeat.send).toHaveBeenCalled();
		expect(mockGame.send).toHaveBeenCalled();
		expect(mockGame.gameSeatPrompt).toBe(gameSeatPrompt);

		var clickSpy = jasmine.createSpy();
		gameSeatPrompt.on(GameSeatPrompt.COMPLETE, clickSpy);
		mockTableSeat.trigger(ButtonClickMessage.TYPE, new ButtonClickMessage(ButtonData.FOLD, 123));
		expect(clickSpy).toHaveBeenCalled();

		expect(gameSeatPrompt.getButton()).toBe(ButtonData.FOLD);
		expect(gameSeatPrompt.getValue()).toBe(123);

		expect(mockTableSeat.listenerMap).toEqual({});
		expect(mockGame.gameSeatPrompt).toBe(null);
	});

	it("selects a default buttons on timeout", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton(new ButtonData(ButtonData.FOLD));
		gameSeatPrompt.addButton(new ButtonData(ButtonData.RAISE));
		gameSeatPrompt.setDefaultButton(ButtonData.FOLD);
		gameSeatPrompt.setResponseTime(10);

		gameSeatPrompt.ask();

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on(GameSeatPrompt.COMPLETE, completeSpy);

		jasmine.clock().tick(11 * 1000);

		expect(completeSpy).toHaveBeenCalled();

		// make sure listeners are removed.
		expect(mockTableSeat.listenerMap).toEqual({});
	});

	it("can create a TimerMessage", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton(new ButtonData(ButtonData.FOLD));
		gameSeatPrompt.addButton(new ButtonData(ButtonData.RAISE));
		gameSeatPrompt.setDefaultButton(ButtonData.FOLD);
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

	// work here!
	it("can use table seat settings", function() {
		mockTableSeat.getSetting = function(settingId) {
			if (settingId != "blaj")
				throw new Error("something is strange");

			return true;
		};

		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton(ButtonData.MUCK);
		gameSeatPrompt.addButton(ButtonData.SHOW);
		gameSeatPrompt.setDefaultButton(ButtonData.MUCK);

		gameSeatPrompt.useTableSeatSetting("blaj", ButtonData.MUCK);

		var completeSpy = jasmine.createSpy();
		gameSeatPrompt.on(GameSeatPrompt.COMPLETE, completeSpy);

		gameSeatPrompt.ask();

		expect(completeSpy).toHaveBeenCalled();
		expect(gameSeatPrompt.getButton()).toBe(ButtonData.MUCK);
	});
});