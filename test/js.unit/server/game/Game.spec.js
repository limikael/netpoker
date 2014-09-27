var Game = require("../../../../src/js/server/game/Game");
var GameSeat = require("../../../../src/js/server/game/GameSeat");
var Thenable = require("../../../../src/js/utils/Thenable");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");

describe("Game", function() {
	var mockTable;

	beforeEach(function() {
		jasmine.clock().install();
		mockBackend = {};

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}

		mockTableSeats = [];
		for (var i = 0; i < 10; i++) {
			var mockTableSeat = new EventDispatcher();
			mockTableSeat.seatIndex = i;

			mockTableSeat.getSeatIndex = function() {
				return this.seatIndex;
			}

			mockTableSeat.send = function() {};

			mockTableSeats.push(mockTableSeat);
		}

		mockTable = {};
		mockTable.getStartGameParentId = function() {
			return 123;
		};

		mockTable.getStartGameFunctionName = function() {
			return "hello";
		};

		mockTable.getServices = function() {
			return mockServices;
		};

		mockTable.advanceDealer = function() {};
		mockTable.getDealerButtonIndex = function() {};
		mockTable.getNextSeatIndexInGame = function() {
			return 2;
		};
		mockTable.getTableSeatBySeatIndex = function(seatIndex) {
			return mockTableSeats[seatIndex];
		};
		mockTable.getStake = function() {
			return 2;
		};
		mockTable.send = jasmine.createSpy();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("can detect errors on start game call", function() {
		mockBackend.call = function(functionName, params) {
			var t = new Thenable();
			t.notifyError();
			return t;
		}

		spyOn(mockBackend, "call").and.callThrough();

		var finishSpy = jasmine.createSpy();
		var g = new Game(mockTable);
		g.on(Game.FINISHED, finishSpy);

		g.start();

		expect(mockBackend.call).toHaveBeenCalledWith("hello", jasmine.any(Object));

		expect(finishSpy).not.toHaveBeenCalled();
		jasmine.clock().tick(Game.ERROR_WAIT + 1);
		expect(finishSpy).toHaveBeenCalled();
	});

	it("can start", function(done) {
		mockBackend.call = function(functionName, params) {
			var t = new Thenable();
			t.notifySuccess({
				gameId: 789
			});
			return t;
		}

		spyOn(mockBackend, "call").and.callThrough();

		var finishSpy = jasmine.createSpy();
		var g = new Game(mockTable);

		g.start();

		expect(mockBackend.call).toHaveBeenCalledWith("hello", jasmine.any(Object));

		TickLoopRunner.runTicks().then(function() {
			expect(g.getDeck().length).toBe(52);
			expect(g.getId()).toBe(789);

			for (var i = 0; i < 10; i++) {
				var card = g.getNextCard();
				//console.log("card: "+card);
			}

			expect(g.getDeck().length).toBe(42);

			expect(g.getGameState()).not.toBe(null);
			done();
		});

		jasmine.clock().tick(10);
	});

	it("can use a fixed deck", function(done) {
		mockBackend.call = function(functionName, params) {
			var t = new Thenable();
			t.notifySuccess({
				gameId: 789
			});
			return t;
		}

		var g = new Game(mockTable);

		g.useFixedDeck(["2c", "3d", "4c", "5d"]);
		g.start();

		TickLoopRunner.runTicks().then(function() {
			expect(g.getNextCard().toString()).toBe("2C");
			expect(g.getNextCard().toString()).toBe("3D");
			done();
		});
	});

	it("can get a seat index", function() {
		expect(mockTable.getTableSeatBySeatIndex(0).getSeatIndex()).toBe(0);
		expect(mockTable.getTableSeatBySeatIndex(1).getSeatIndex()).toBe(1);

		var g = new Game(mockTable);
		expect(g.getGameSeatForSeatIndex(5)).toBe(null);

		var gameSeat = new GameSeat(g, 5);
		g.addGameSeat(gameSeat);

		expect(g.getGameSeatForSeatIndex(5)).toBe(gameSeat);

		expect(function() {
			g.addGameSeat(gameSeat);
		}).toThrow();
	});
});