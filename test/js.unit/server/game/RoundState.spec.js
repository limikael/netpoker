var BotConnection = require("../../../utils/BotConnection");
var MockBackendServer = require("../../../utils/MockBackendServer");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var StateCompleteMessage = require("../../../../src/js/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/js/proto/messages/SeatClickMessage");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var ShowDialogMessage = require("../../../../src/js/proto/messages/ShowDialogMessage");
var ButtonsMessage = require("../../../../src/js/proto/messages/ButtonsMessage");
var SeatInfoMessage = require("../../../../src/js/proto/messages/SeatInfoMessage");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var AskBlindState = require("../../../../src/js/server/game/AskBlindState");
var RoundState = require("../../../../src/js/server/game/RoundState");
var CardData = require("../../../../src/js/proto/data/CardData");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var ThenableBarrier = require("../../../../src/js/utils/ThenableBarrier");

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

	it("can raise", function(done) {
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
				expect(bot1.getSeatAt(2).getBet()).toBe(5);
				expect(bot1.getSeatAt(2).getChips()).toBe(5);

				expect(bot1.isActionAvailable(ButtonData.CALL)).toBe(true);

				expect(bot1.getButtons()).not.toBe(null);

				bot1.close();
				bot2.close();
				next();
			}
		).then(done);
	});
});