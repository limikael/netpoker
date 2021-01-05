var Game = require("../../../src.js/server/game/Game");
var GameSeat = require("../../../src.js/server/game/GameSeat");
var TickLoopRunner = require("../../support/TickLoopRunner");
var EventEmitter = require("events");

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
			var mockTableSeat = new EventEmitter();
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

			mockTableSeat.getChips = function() {
				return 1000;
			}

			mockTableSeats.push(mockTableSeat);
		}

		mockTable = {};
		mockTable.getStartGameParentId = function() {
			return 123;
		};

		mockTable.getAnte = function() {
			return 0;
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
		mockTable.getNumInGame=function() {
			return 3;
		}

		mockTable.send = jasmine.createSpy();

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("can detect errors on start game call", async ()=>{
		mockBackend.call = function(functionName, params) {
			return new Promise((resolve,reject)=>{
				reject();
			});
		}

		spyOn(mockBackend, "call").and.callThrough();

		var finishSpy = jasmine.createSpy("finish");
		var g = new Game(mockTable);
		g.on("finished", finishSpy);

		g.start();
		await TickLoopRunner.runTicks();

		expect(mockBackend.call).toHaveBeenCalledWith("hello", jasmine.any(Object));
		expect(finishSpy).not.toHaveBeenCalled();
		await TickLoopRunner.runTicks();

		expect(finishSpy).not.toHaveBeenCalled();
		jasmine.clock().tick(Game.ERROR_WAIT + 1000);
		expect(finishSpy).toHaveBeenCalled();
	});

	it("can start", async ()=>{
		mockBackend.call=(functionName, params)=>{
			return new Promise((resolve, reject)=>{
				resolve({
					gameId: 789
				})
			});
		}

		spyOn(mockBackend, "call").and.callThrough();

		var finishSpy = jasmine.createSpy();
		var g = new Game(mockTable);

		g.start();

		expect(mockBackend.call).toHaveBeenCalledWith("hello", jasmine.any(Object));

		await TickLoopRunner.runTicks();

		expect(g.getDeck().length).toBe(52);
		expect(g.getId()).toBe(789);

		for (var i = 0; i < 10; i++) {
			var card = g.getNextCard();
			//console.log("card: "+card);
		}

		expect(g.getDeck().length).toBe(42);

		expect(g.getGameState()).not.toBe(null);
		g.close();
	});

	it("can use a fixed deck", async ()=> {
		mockBackend.call = function(functionName, params) {
			return new Promise((resolve, reject)=>{
				resolve({
					gameId: 789
				})
			});
		}

		var g = new Game(mockTable);

		g.useFixedDeck(["2c", "3d", "4c", "5d"]);
		g.start();

		await TickLoopRunner.runTicks();

		expect(g.getNextCard().toString()).toBe("2C");
		expect(g.getNextCard().toString()).toBe("3D");
		g.close();
	});

	it("can get a seat index", function() {
		expect(mockTable.getTableSeatBySeatIndex(0).getSeatIndex()).toBe(0);
		expect(mockTable.getTableSeatBySeatIndex(1).getSeatIndex()).toBe(1);

		var g = new Game(mockTable);
		expect(g.getGameSeatForSeatIndex(5)).toBe(null);

		var gameSeat = new GameSeat(g, 5);
		g.addGameSeat(gameSeat);

		expect(g.getGameSeatForSeatIndex(5)).toBe(gameSeat);
		expect(g.gameSeats.length).toBe(1);

		g.addGameSeat(gameSeat);
		expect(g.gameSeats.length).toBe(1);

		var newGameSeat = new GameSeat(g, 5);

		expect(function() {
			g.addGameSeat(newGameSeat);
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