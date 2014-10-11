var User = require("../../../../src/server/user/User");
var EventDispatcher = require("../../../../src/utils/EventDispatcher");
var CashGameUser = require("../../../../src/server/cashgame/CashGameUser");

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