var Game = require("../../../../src/js/server/game/Game");
var Thenable = require("../../../../src/js/utils/Thenable");

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
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("can be started", function() {
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
		jasmine.clock().tick(Game.ERROR_WAIT+1);
		expect(finishSpy).toHaveBeenCalled();
	});
});