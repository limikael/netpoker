var BotConnection = require("../../../utils/BotConnection");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/proto/messages/SeatClickMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ShowDialogMessage = require("../../../../src/proto/messages/ShowDialogMessage");
var ButtonsMessage = require("../../../../src/proto/messages/ButtonsMessage");
var SeatInfoMessage = require("../../../../src/proto/messages/SeatInfoMessage");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var AskBlindState = require("../../../../src/server/game/AskBlindState");
var RoundState = require("../../../../src/server/game/RoundState");
var CardData = require("../../../../src/proto/data/CardData");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var ThenableBarrier = require("../../../../src/utils/ThenableBarrier");

describe("RoundState", function() {
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

	/*it("can raise", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.tableManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				bot1.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_SB));
				var t1 = bot1.runStrategy(new BotSitInStrategy(1, 10));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				bot2.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_BB));
				var t2 = bot2.runStrategy(new BotSitInStrategy(2, 10));

				ThenableBarrier.wait(t1, t2).then(next);
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(bot1.getSeatAt(1).getBet()).toBe(2);
				expect(bot1.getSeatAt(1).getChips()).toBe(8);
				expect(bot1.getSeatAt(2).getBet()).toBe(1);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(RoundState));
				expect(bot1.getSeatAt(1).getCardAt(0)).not.toBe(null);

				//console.log("user1 buttons: "+bot1.getButtons());
				console.log("***** user2 buttons: " + bot2.getButtons());

				expect(bot2.getButtons()).not.toBe(null);

				console.log("acting in spec...");
				bot2.act(ButtonData.RAISE, 5);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getCommunityCards().length).toBe(0);

				expect(bot1.getSeatAt(2).getBet()).toBe(5);
				expect(bot1.getSeatAt(2).getChips()).toBe(5);

				expect(bot1.isActionAvailable(ButtonData.CALL)).toBe(true);
				bot1.act(ButtonData.CALL);

				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getCommunityCards().length).toBe(3);

				bot1.close();
				bot2.close();
				next();
			}
		).then(done);
	});*/

	it("can handle all in", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.tableManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot1.connectToTable(123);
				bot1.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_SB));
				var t1 = bot1.runStrategy(new BotSitInStrategy(1, 100));

				bot2 = new BotConnection(netPokerServer, "user2");
				bot2.connectToTable(123);
				bot2.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_BB));
				var t2 = bot2.runStrategy(new BotSitInStrategy(2, 10));

				ThenableBarrier.wait(t1, t2).then(next);
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(bot1.getSeatAt(1).getBet()).toBe(2);
				expect(bot1.getSeatAt(1).getChips()).toBe(98);
				expect(bot1.getSeatAt(2).getBet()).toBe(1);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				bot2.act(ButtonData.RAISE,10);

				/*expect(table.getCurrentGame().gameState).toEqual(jasmine.any(RoundState));
				expect(bot1.getSeatAt(1).getCardAt(0)).not.toBe(null);

				//console.log("user1 buttons: "+bot1.getButtons());
				console.log("***** user2 buttons: " + bot2.getButtons());

				expect(bot2.getButtons()).not.toBe(null);

				console.log("acting in spec...");
				bot2.act(ButtonData.RAISE, 5);*/

				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1.act(ButtonData.CALL);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getGameState() instanceof RoundState).toBe(false);

				next();
			}
		).then(done);
	});
});