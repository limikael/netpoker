var GameSeatPrompt = require("../../../../src/js/server/game/GameSeatPrompt");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");

describe("GameSeatPrompt", function() {
	var mockGameSeat;

	beforeEach(function() {
		mockTableSeat = new EventDispatcher();
		mockTableSeat.sitout=jasmine.createSpy();

		mockGameSeat = {};
		mockGameSeat.send = jasmine.createSpy();
		mockGameSeat.getTableSeat = function() {
			return mockTableSeat;
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

		var clickSpy = jasmine.createSpy();
		gameSeatPrompt.on(GameSeatPrompt.COMPLETE, clickSpy);
		mockTableSeat.trigger(ButtonClickMessage.TYPE, new ButtonClickMessage(ButtonData.FOLD, 123));
		expect(clickSpy).toHaveBeenCalled();

		expect(gameSeatPrompt.getButton()).toBe(ButtonData.FOLD);
		expect(gameSeatPrompt.getValue()).toBe(123);

		expect(mockTableSeat.listenerMap).toEqual({});
	});

	it("selects a default buttons", function() {
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
	});
});