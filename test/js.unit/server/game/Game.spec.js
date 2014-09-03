var Game = require("../../../../src/js/server/game/Game");
var Thenable = require("../../../../src/js/utils/Thenable");
var TickLoopRunner = require("../../../utils/TickLoopRunner");

describe("Game", function() {
	var mockTable;

	beforeEach(function() {
		jasmine.clock().install();
		mockBackend = {};

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
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
		mockTable.getNextSeatIndexInGame = function() {};
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
});