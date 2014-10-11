var BotConnection = require("../../../utils/BotConnection");
var BotSitInStrategy = require("../../../utils/BotSitInStrategy");
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

describe("NetPokerServer - round", function() {
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

	it("can play a round", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.cashGameManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123);
				bot1.runStrategy(new BotSitInStrategy(1,10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot2.connectToTable(123);
				bot2.runStrategy(new BotSitInStrategy(2,10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(AskBlindState));
				bot2.act(ButtonData.POST_SB);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1.act(ButtonData.POST_BB);
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
				console.log("***** user2 buttons: "+bot2.getButtons());

				expect(bot2.getButtons()).not.toBe(null);
				bot2.act(ButtonData.CALL);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(bot1.getButtons()).not.toBe(null);

				bot1.act(ButtonData.CHECK);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(bot1.getCommunityCards().length).toBeGreaterThan(0);

				bot1.close();
				bot2.close();
				table.close();
				next();
			}
		).then(done);
	});
});