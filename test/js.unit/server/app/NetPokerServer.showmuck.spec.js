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
var ShowMuckState = require("../../../../src/js/server/game/ShowMuckState");
var FinishedState = require("../../../../src/js/server/game/FinishedState");
var CardData = require("../../../../src/js/proto/data/CardData");

describe("NetPokerServer - show muck", function() {
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

	it("can handle muck", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.tableManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123);
				console.log("calling sit in");
				bot1.sitIn(1, 10);
				bot1.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_SB));

				bot2.connectToTable(123);
				bot2.sitIn(2, 10);
				bot2.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_BB));

				TickLoopRunner.runTicks(50).then(next);
			},

			function(next) {
				expect(bot1.getSeatAt(1).getBet()).toBe(2);
				expect(bot1.getSeatAt(1).getChips()).toBe(8);
				expect(bot1.getSeatAt(2).getBet()).toBe(1);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(RoundState));
				expect(bot1.getSeatAt(1).getCardAt(0)).not.toBe(null);

				expect(bot2.getButtons()).not.toBe(null);
				bot2.act(ButtonData.FOLD);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				var state = table.getCurrentGame().getGameState();
				expect(state instanceof ShowMuckState).toBe(true);

				expect(bot1.getButtons()).not.toBe(null);
				bot1.act(ButtonData.MUCK);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(bot1.getTotalSeatChips()).toBe(20);
				expect(bot1.getSeatAt(1).getChips()).toBe(11);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				expect(bot1.getSeatAt(1).getCardAt(0)).toBe(null);

				var state = table.getCurrentGame().getGameState();
				expect(state instanceof FinishedState).toBe(true);

				bot1.close();
				bot2.close();
				table.close();
				next();
			}
		).then(done);
	});

	it("can handle show", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.tableManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123);
				console.log("calling sit in");
				bot1.sitIn(1, 10);
				bot1.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_SB));

				bot2.connectToTable(123);
				bot2.sitIn(2, 10);
				bot2.replyOnce(ButtonsMessage, new ButtonClickMessage(ButtonData.POST_BB));

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(bot1.getSeatAt(1).getBet()).toBe(2);
				expect(bot1.getSeatAt(1).getChips()).toBe(8);
				expect(bot1.getSeatAt(2).getBet()).toBe(1);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(RoundState));
				expect(bot1.getSeatAt(1).getCardAt(0)).not.toBe(null);

				expect(bot2.getButtons()).not.toBe(null);
				bot2.act(ButtonData.FOLD);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				var state = table.getCurrentGame().getGameState();
				expect(state instanceof ShowMuckState).toBe(true);

				expect(bot1.getSeatAt(1).getCardAt(0).isShown()).toBe(true);
				expect(bot2.getSeatAt(1).getCardAt(0).isShown()).toBe(false);

				expect(bot1.getButtons()).not.toBe(null);
				bot1.act(ButtonData.SHOW);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(bot1.getTotalSeatChips()).toBe(20);
				expect(bot1.getSeatAt(1).getChips()).toBe(11);
				expect(bot1.getSeatAt(2).getChips()).toBe(9);

				expect(bot1.getSeatAt(1).getCardAt(0).isShown()).toBe(true);
				expect(bot2.getSeatAt(1).getCardAt(0).isShown()).toBe(true);

				var state = table.getCurrentGame().getGameState();
				expect(state instanceof FinishedState).toBe(true);

				bot1.close();
				bot2.close();
				table.close();
				next();
			}
		).then(done);
	});
});