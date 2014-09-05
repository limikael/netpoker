var GameSeatPrompt = require("../../../../src/js/server/game/GameSeatPrompt");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");

describe("GameSeatPrompt", function() {
	var mockGameSeat;

	beforeEach(function() {
		mockTableSeat = new EventDispatcher();

		mockGameSeat = {};
		mockGameSeat.send = jasmine.createSpy();
		mockGameSeat.getTableSeat = function() {
			return mockTableSeat;
		}
	});

	it("sends a button message", function() {
		var gameSeatPrompt = new GameSeatPrompt(mockGameSeat);

		gameSeatPrompt.addButton(new ButtonData(ButtonData.FOLD));
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
});