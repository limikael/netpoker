var PollNumPlayersRequestHandler = require("../../../../src/server/api/PollNumPlayersRequestHandler");

describe("PollNumPlayersRequestHandler", function() {
	var mockNetPokerServer;
	var mockRequest;
	var mockResponse;
	var mockCashGameManager;
	var mockTables;

	beforeEach(function() {
		mockTables = [];

		for (var i = 0; i < 2; i++) {
			var t = {};
			t.id = "table_" + i;
			t.numInGame = 1;

			t.getId = function() {
				return this.id;
			}

			t.getNumInGame = function() {
				return this.numInGame;
			}

			mockTables.push(t);
		}

		mockCashGameManager = {};
		mockCashGameManager.getTables = function() {
			return mockTables;
		}

		mockNetPokerServer = {};
		mockNetPokerServer.getCashGameManager = function() {
			return mockCashGameManager;
		};

		mockRequest = {};
		mockResponse = {};
		mockResponse.written = "";
		mockResponse.write = function(s) {
			this.written += s;
		}
		mockResponse.end = jasmine.createSpy();
	});

	it("returns the number of users if queried without parameters", function() {
		var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);
		handler.handleRequest(mockRequest, mockResponse);

		console.log("written: " + mockResponse.written);

		expect(mockResponse.written).toEqual('{"table_0":1,"table_1":1}');
		expect(mockResponse.end).toHaveBeenCalled();
	});
});