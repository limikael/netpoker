var PollNumPlayersRequestHandler = require("../../../../src/server/api/PollNumPlayersRequestHandler");
var CashGameManager = require("../../../../src/server/cashgame/CashGameManager");
var EventDispatcher = require("yaed");

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

		mockCashGameManager = new EventDispatcher();
		mockCashGameManager.getTables = function() {
			return mockTables;
		}

		mockNetPokerServer = {};
		mockNetPokerServer.getCashGameManager = function() {
			return mockCashGameManager;
		};

		mockRequest = new EventDispatcher();
		mockResponse = {};
		mockResponse.written = "";
		mockResponse.write = function(s) {
			this.written += s;
		}
		spyOn(mockResponse, "write").and.callThrough();
		mockResponse.end = jasmine.createSpy();

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("returns the number of users if queried without parameters", function() {
		var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);
		handler.handleRequest(mockRequest, mockResponse);

		console.log("written: " + mockResponse.written);

		expect(mockResponse.written).toEqual('{"table_0":1,"table_1":1}');
		expect(mockResponse.end).toHaveBeenCalled();
	});

	it("times out if no change", function() {
		var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);

		var parameters = {};
		parameters.state = '{"table_0":1,"table_1":1}';
		handler.handleRequest(mockRequest, mockResponse, parameters);

		expect(mockResponse.end).not.toHaveBeenCalled();

		jasmine.clock().tick(PollNumPlayersRequestHandler.TIMEOUT_DELAY);

		expect(mockResponse.end).toHaveBeenCalled();
		expect(mockResponse.write).toHaveBeenCalled();

		expect(mockCashGameManager.listenerMap).toEqual({});
	});

	it("sends new data if a change is detected", function() {
		var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);

		var parameters = {};
		parameters.state = '{"table_0":1,"table_1":1}';
		handler.handleRequest(mockRequest, mockResponse, parameters);
		expect(mockResponse.end).not.toHaveBeenCalled();
		mockCashGameManager.trigger(CashGameManager.NUM_PLAYERS_CHANGE);
		expect(mockResponse.end).not.toHaveBeenCalled();

		mockTables[0].numInGame = 5;
		mockCashGameManager.trigger(CashGameManager.NUM_PLAYERS_CHANGE);

		expect(mockResponse.write).toHaveBeenCalled();
		expect(mockResponse.end).toHaveBeenCalled();

		expect(mockResponse.written).toEqual('{"table_0":5,"table_1":1}');
	});

	it("can check only those tables that are interesting", function() {
		var handler = new PollNumPlayersRequestHandler(mockNetPokerServer);

		handler.referenceState = null;
		expect(handler.shouldReturn()).toBe(true);

		handler.referenceState = {};
		expect(handler.shouldReturn()).toBe(false);

		handler.referenceState = {
			a: 5
		};

		expect(handler.shouldReturn({})).toBe(true);

		expect(handler.shouldReturn({
			a: 5
		})).toBe(false);

		expect(handler.shouldReturn({
			a: 4,
			b: 5
		})).toBe(true);
	});
});