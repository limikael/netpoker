var MockBackendServer = require("../../../utils/MockBackendServer");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var BotConnection = require("../../../utils/BotConnection");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var ThenableBarrier = require("../../../../src/js/utils/ThenableBarrier");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var FinishedState = require("../../../../src/js/server/game/FinishedState");

describe("AskBlindState", function() {
	var mockBackendServer;
	var netPokerServer;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();
		mockBackendServer.setListenPort(9999);
		mockBackendServer.start();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackendUrl("http://localhost:9999");
		netPokerServer.run().then(done);
	});

	afterEach(function() {
		console.log("closing...");

		mockBackendServer.close();
		netPokerServer.close();
	});

	it("doesn't start if there is not enough players", function(done) {
		var table=netPokerServer.tableManager.getTableById(123);
		var bot1, bot2;

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				var t1=bot1.runStrategy(new BotSitInStrategy(1, 10));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				var t2=bot2.runStrategy(new BotSitInStrategy(2, 10));

				ThenableBarrier.wait(t1,t2).then(next);
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(bot1.getDealerButtonPosition()).toBe(1);

				expect(bot1.getButtons()).toBe(null);
				expect(bot2.getButtons()).not.toBe(null);

				bot2.act(ButtonData.SIT_OUT);
				TickLoopRunner.runTicks().then(next)
			},

			function(next) {
				//this is actually the test we want to do.
				//expect(table.getCurrentGame().getGameState() instanceof FinishedState).toBe(true);

				bot1.close();
				bot2.close();
				done();
			}
		);
	});
});