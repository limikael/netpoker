var PollNumPlayersRequestHandler = require("../../../../src/server/api/PollNumPlayersRequestHandler");

describe("PollNumPlayersRequestHandler", function() {
	var mockNetPokerServer;
	var mockRequest;
	var mockResponse;
	var mockCashGameManager;

	beforeEach(function() {
		mockCashGameManager = {};

		mockNetPokerServer = {};
		mockNetPokerServer.getCashGameManager=function() {
			return mockCashGameManager;
		};

		mockRequest = {};

		mockResponse = {};
	});

	it("returns the number of users if queried without parameters", function() {
		/*var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);
		handler.handleRequest(mockRequest, mockResponse);*/
	});
});