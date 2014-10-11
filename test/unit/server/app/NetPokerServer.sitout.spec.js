var BotConnection = require("../../../utils/BotConnection");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var AskBlindState = require("../../../../src/server/game/AskBlindState");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var CheckboxMessage = require("../../../../src/proto/messages/CheckboxMessage");

describe("NetPokerServer - sitout", function() {
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
		mockBackendServer.close();
		netPokerServer.close();
	});

	it("can sit out, and back in by big button", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.cashGameManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123);
				bot1.runStrategy(new BotSitInStrategy(1, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot2.connectToTable(123);
				bot2.runStrategy(new BotSitInStrategy(2, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(AskBlindState));

				bot2.act(ButtonData.SIT_OUT);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(bot2.isActionAvailable(ButtonData.IM_BACK)).toBe(true);
				expect(bot2.getSetting(CheckboxMessage.SITOUT_NEXT)).toBe(true);

				bot2.act(ButtonData.IM_BACK);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				//expect(bot2.isActionAvailable(ButtonData.POST_BB)).toBe(true);
				next();
			}
		).then(done);
	});
});