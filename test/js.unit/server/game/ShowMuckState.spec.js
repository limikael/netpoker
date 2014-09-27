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
var BotCheckUntilEndStrategy = require("../../../utils/BotCheckUntilEndStrategy");
var ThenableBarrier = require("../../../../src/js/utils/ThenableBarrier");
var ShowMuckState = require("../../../../src/js/server/game/ShowMuckState");
var Hand = require("../../../../src/js/server/hand/Hand");

describe("ShowMuckState", function() {
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

	it("first player has to show automatically", function(done) {
		netPokerServer.useFixedDeck(["ah", "3d", "ad", "5d", "8s", "9d", "kh", "10s", "as"]);

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
				var t1 = bot1.runStrategy(new BotCheckUntilEndStrategy());
				var t2 = bot2.runStrategy(new BotCheckUntilEndStrategy());

				ThenableBarrier.waitAny(t1, t2).then(next);
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1.clearStrategy();
				bot2.clearStrategy();

				expect(table.getCurrentGame().getGameState() instanceof ShowMuckState).toBe(true);

				expect(table.getCurrentGame().getGameSeatForSeatIndex(2).getHand().getCategory()).toBe(Hand.THREE_OF_A_KIND);
				expect(table.getCurrentGame().getGameSeatForSeatIndex(2).isShowing()).toBe(true);
				expect(table.getCurrentGame().getGameSeatForSeatIndex(1).isShowing()).toBe(false);
				expect(bot1.getButtons()).not.toBe(null);
				expect(bot1.isActionAvailable(ButtonData.SHOW)).toBe(true);
				expect(bot1.isActionAvailable(ButtonData.MUCK)).toBe(true);
				next();
			}
		).then(done);
	});
});