var Game = require("../../../../src/server/game/Game");
var GameSeat = require("../../../../src/server/game/GameSeat");
var Thenable = require("../../../../src/utils/Thenable");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var EventDispatcher = require("yaed");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");

describe("Game", function() {
	var mockTable;

	beforeEach(function() {
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
			};

			mockTableSeat.addChips = function() {};
			mockTableSeat.getSeatInfoMessage = function() {};
			mockTableSeat.send = function() {};
			mockTableSeat.getSetting = function() {
				return false;
			};

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
		mockTable.getHandInfoMessage = function() {
			return {};
		}

		mockTable.send = jasmine.createSpy();

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("can detect errors on start game call", function(done) {
		console.log("installing mock clock");
		//jasmine.clock().install();
		mockBackend.call = function(functionName, params) {
			var t = new Thenable();
			t.notifyError();
			return t;
		}

		spyOn(mockBackend, "call").and.callThrough();

		var finishSpy = jasmine.createSpy();
		var g = new Game(mockTable);
		g.on(Game.FINISHED, finishSpy);

		AsyncSequence.run(
			function(next) {
				g.start();
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(mockBackend.call).toHaveBeenCalledWith("hello", jasmine.any(Object));
				expect(finishSpy).not.toHaveBeenCalled();
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(finishSpy).not.toHaveBeenCalled();
				jasmine.clock().tick(Game.ERROR_WAIT + 1000);
				expect(finishSpy).toHaveBeenCalled();

				//jasmine.clock().uninstall();
				next();
			}
		).then(done);
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
			g.close();
			done();
		});

		//jasmine.clock().tick(10);
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
			g.close();
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

	it("can get split pots", function() {
		var g = new Game(mockTable);

		g.addGameSeat(new GameSeat(g, 1));
		g.addGameSeat(new GameSeat(g, 2));
		g.addGameSeat(new GameSeat(g, 3));

		g.getGameSeatForSeatIndex(1).makeBet(10);
		g.getGameSeatForSeatIndex(2).makeBet(10);
		g.getGameSeatForSeatIndex(3).makeBet(8);

		g.getGameSeatForSeatIndex(1).betToPot();
		g.getGameSeatForSeatIndex(2).betToPot();
		g.getGameSeatForSeatIndex(3).betToPot();

		console.log("unfolded pot contribs:" + g.getUnfoldedPotContribs());
		console.log("pots:" + g.getPots());

		expect(g.getPots()).toEqual([24, 4]);
	});
});