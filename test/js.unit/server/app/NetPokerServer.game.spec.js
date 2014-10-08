var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("../../../../src/utils/Thenable");
var ThenableBarrier = require("../../../../src/utils/ThenableBarrier");
var BotConnection = require("../../../utils/BotConnection");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
var BotActSequenceStrategy = require("../../../utils/BotActSequenceStrategy");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/proto/messages/SeatClickMessage");
var ShowDialogMessage = require("../../../../src/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ButtonsMessage = require("../../../../src/proto/messages/ButtonsMessage");
var HandInfoMessage = require("../../../../src/proto/messages/HandInfoMessage");
var FinishedState = require("../../../../src/server/game/FinishedState");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var AskBlindState = require("../../../../src/server/game/AskBlindState");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");

describe("NetPokerServer - game", function() {
	var netPokerServer;
	var mockBackendServer;

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
	})

	it("starts a game when two users connect", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");
		var bot3 = new BotConnection(netPokerServer, "user3");
		var table = netPokerServer.tableManager.getTableById(123);

		bot1.connectToTable(123);
		bot2.connectToTable(123);
		bot3.connectToTable(123);

		AsyncSequence.run(
			function(next) {
				bot1.runStrategy(new BotSitInStrategy(3, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot2.runStrategy(new BotSitInStrategy(5, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot3.runStrategy(new BotSitInStrategy(7, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				expect(table.getNumInGame()).toBe(3);

				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(true);
				expect(table.getTableSeatBySeatIndex(5).isInGame()).toBe(true);
				expect(table.getCurrentGame()).not.toBe(null);
				expect(table.getCurrentGame().getGameState()).toEqual(jasmine.any(AskBlindState));

				expect(bot1.getHandInfo()).toBe("Current Hand: #987\n");
				expect(bot1.getLastMessageOfType(HandInfoMessage)).not.toBe(null);
				expect(bot1.getLastMessageOfType(ButtonsMessage)).toBe(null);
				expect(bot2.getLastMessageOfType(ButtonsMessage)).not.toBe(null);
				expect(bot3.getLastMessageOfType(ButtonsMessage)).toBe(null);

				bot1.clearMessages();
				bot2.clearMessages();

				bot2.send(new ButtonClickMessage(ButtonData.POST_SB));
				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getNumInGame()).toBe(1);

				expect(bot1.getLastMessageOfType(ButtonsMessage)).toBe(null);
				expect(bot2.getLastMessageOfType(ButtonsMessage)).toBe(null);
				expect(bot3.getLastMessageOfType(ButtonsMessage)).not.toBe(null);

				bot3.send(new ButtonClickMessage(ButtonData.POST_BB));
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getNumInGame()).toBe(3);
				next();
			}
		).then(done);
	});

	it("restores the state on reconnection", function(done) {
		netPokerServer.useFixedDeck(["2c", "3c", "2h", "3h", "7d", "9d", "kd"]);

		var table = netPokerServer.tableManager.getTableById(123);

		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");
		bot1.connectToTable(123);
		bot2.connectToTable(123);

		var bot1re;

		AsyncSequence.run(
			function(next) {
				bot1.runStrategy(new BotSitInStrategy(1, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot2.runStrategy(new BotSitInStrategy(2, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getNumInGame()).toBe(2);
				expect(table.getCurrentGame()).not.toBe(null);
				expect(bot2.getButtons()).not.toBe(null);

				var s1 = bot1.runStrategy(new BotActSequenceStrategy([
					ButtonData.POST_BB,
					ButtonData.CHECK,
				]));

				var s2 = bot2.runStrategy(new BotActSequenceStrategy([
					ButtonData.POST_SB,
					ButtonData.CALL,
					new ButtonData(ButtonData.BET, 3)
				]));

				ThenableBarrier.wait(s1, s2).then(next);
			},

			function(next) {
				expect(bot1.getCommunityCards().length).toBe(3);
				expect(bot1.getPot()).toBe(4);
				expect(bot1.getSeatAt(2).getBet()).toBe(3);
				expect(bot1.getSeatAt(1).getBet()).toBe(0);
				expect(bot1.getSeatAt(1).getChips()).toBe(8);
				expect(bot1.getSeatAt(2).getChips()).toBe(5);

				expect(bot1.getSeatAt(2).getCardAt(0).toString()).toBe("XX");
				expect(bot1.getSeatAt(1).getCardAt(0).toString()).toBe("3C");
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1re = new BotConnection(netPokerServer, "user1");
				bot1re.connectToTable(123);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(bot1re.getLastMessageOfType(HandInfoMessage)).not.toBe(null);
				expect(bot1re.getSeatAt(1).getName()).toBe("olle");
				expect(bot1re.getSeatAt(1).getChips()).toBe(8);

				expect(bot1re.getSeatAt(2).getName()).toBe("kalle");
				expect(bot1re.getSeatAt(2).getChips()).toBe(5);
				expect(bot1re.getSeatAt(2).getBet()).toBe(3);

				expect(bot1re.getPot()).toBe(4);
				expect(bot1re.getCommunityCards().length).toBe(3);

				expect(bot1re.getSeatAt(2).getCardAt(0).toString()).toBe("XX");
				expect(bot1re.getSeatAt(1).getCardAt(0).toString()).toBe("3C");
				expect(bot1re.getSeatAt(1).getCards().length).toBe(2);
				next();
			}
		).then(done);
	});
});