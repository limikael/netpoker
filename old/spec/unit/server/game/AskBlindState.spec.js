var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var BotConnection = require("../../../utils/BotConnection");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var Thenable = require("tinp");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var FinishedState = require("../../../../src/server/game/FinishedState");

describe("AskBlindState", function() {
	var mockBackendServer;
	var netPokerServer;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);
		netPokerServer.run().then(done);
	});

	afterEach(function() {
		netPokerServer.close();
	});

	it("doesn't start if there is not enough players", function(done) {
		var table = netPokerServer.cashGameManager.getTableById(123);
		var bot1, bot2;

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				var t1 = bot1.runStrategy(new BotSitInStrategy(1, 10));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				var t2 = bot2.runStrategy(new BotSitInStrategy(2, 10));

				Thenable.all(t1, t2).then(next);
			},

			/*function(next) {
				TickLoopRunner.runTicks().then(next);
			},*/

			function(next) {
				expect(bot1.getDealerButtonPosition()).toBe(1);

				expect(bot1.getButtons()).toBe(null);
				expect(bot2.getButtons()).not.toBe(null);

				bot2.act(ButtonData.SIT_OUT);
				TickLoopRunner.runTicks().then(next)
			},

			function(next) {
				//this is actually the test we want to do.
				expect(table.getCurrentGame().getGameState() instanceof FinishedState).toBe(true);

				bot1.close();
				bot2.close();
				done();
			}
		);
	});

	it("handles heads up", function(done) {
		var table = netPokerServer.cashGameManager.getTableById(123);

		var bot1, bot2;

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				var t1 = bot1.runStrategy(new BotSitInStrategy(1, 10));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				var t2 = bot2.runStrategy(new BotSitInStrategy(2, 10));

				Thenable.all(t1, t2).then(next);
			},

			function(next) {
				expect(bot1.getDealerButtonPosition()).toBe(1);
				expect(bot1.getButtons()).toBe(null);
				expect(bot2.getButtons()).not.toBe(null);

				expect(bot2.isActionAvailable(ButtonData.POST_BB)).toBe(true);

				bot1.close();
				bot2.close();
				done();
			}
		);
	});

	it("handles non heads up", function(done) {
		var table = netPokerServer.cashGameManager.getTableById(123);
		var bot1, bot2, bot3;

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				var t1 = bot1.runStrategy(new BotSitInStrategy(1, 10));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				var t2 = bot2.runStrategy(new BotSitInStrategy(2, 10));

				bot3 = new BotConnection(netPokerServer, "user3");
				bot3.connectToTable(123);
				var t3 = bot3.runStrategy(new BotSitInStrategy(3, 10));

				Thenable.all(t1, t2, t3).then(next);
			},

			function(next) {
				expect(bot1.getDealerButtonPosition()).toBe(1);
				expect(bot1.getButtons()).toBe(null);
				expect(bot2.getButtons()).not.toBe(null);
				expect(bot3.getButtons()).toBe(null);

				expect(bot2.isActionAvailable(ButtonData.POST_SB)).toBe(true);

				bot1.close();
				bot2.close();
				bot3.close();
				done();
			}
		);
	});
});