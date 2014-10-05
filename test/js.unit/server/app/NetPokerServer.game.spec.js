var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var Backend = require("../../../../src/js/server/backend/Backend");
var Thenable = require("../../../../src/js/utils/Thenable");
var BotConnection = require("../../../utils/BotConnection");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var StateCompleteMessage = require("../../../../src/js/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/js/proto/messages/SeatClickMessage");
var ShowDialogMessage = require("../../../../src/js/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var ButtonsMessage = require("../../../../src/js/proto/messages/ButtonsMessage");
var FinishedState = require("../../../../src/js/server/game/FinishedState");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var AskBlindState = require("../../../../src/js/server/game/AskBlindState");
var MockBackendServer = require("../../../utils/MockBackendServer");

describe("NetPokerServer - ask blinds", function() {
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
		var table;

		AsyncSequence.run(
			function(next) {
				table = netPokerServer.tableManager.getTableById(123);
				console.log("got table: " + table);

				bot1.reply(StateCompleteMessage, new SeatClickMessage(3));
				bot1.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));
				bot2.reply(StateCompleteMessage, new SeatClickMessage(5));
				bot2.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));
				bot3.reply(StateCompleteMessage, new SeatClickMessage(7));
				bot3.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));

				bot1.connectToTable(123);
				bot2.connectToTable(123);
				bot3.connectToTable(123);

				TickLoopRunner.runTicks(20).then(next);
			},

			function(next) {
				expect(table.getNumInGame()).toBe(3);

				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(true);
				expect(table.getTableSeatBySeatIndex(5).isInGame()).toBe(true);
				expect(table.getCurrentGame()).not.toBe(null);
				expect(table.getCurrentGame().getGameState()).toEqual(jasmine.any(AskBlindState));

				expect(bot1.getLastMessageOfType(ButtonsMessage)).toBe(null);
				expect(bot2.getLastMessageOfType(ButtonsMessage)).not.toBe(null);
				expect(bot3.getLastMessageOfType(ButtonsMessage)).toBe(null);

				bot1.clearMessages();
				bot2.clearMessages();

				bot2.send(new ButtonClickMessage(ButtonData.POST_SB));
				TickLoopRunner.runTicks().then(next);
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
});