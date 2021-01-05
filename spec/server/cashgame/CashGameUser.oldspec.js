const User = require("../../../src.js/server/connection/User");
const EventEmitter=require("events");
const CashGameUser = require("../../../src.js/server/cashgame/CashGameUser");

describe("CashGameUser", function() {
	var mockTableSeat;
	var mockUser;

	beforeEach(function() {
		mockTableSeat = new EventDispatcher();
		mockUser = {};
	});

	it("removes listeners", function() {
		var cashGameUser = new CashGameUser(mockTableSeat, mockUser);

		cashGameUser.cleanupAndNotifyDone();

		expect(mockTableSeat.listenerMap).toEqual({});
	});
});