var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("tinp");
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
var CheckboxMessage = require("../../../../src/proto/messages/CheckboxMessage");
var FinishedState = require("../../../../src/server/game/FinishedState");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var AskBlindState = require("../../../../src/server/game/AskBlindState");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");

describe("Game.integration", function() {
	var netPokerServer;
	var mockBackendServer;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);
		netPokerServer.run().then(done);

		jasmine.clock().install();
	});

	afterEach(function() {
		jasmine.clock().uninstall();

		netPokerServer.close();
	});

	it("logs finished hands", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.cashGameManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123).then(next);
			},

			function(next) {
				bot2.connectToTable(123).then(next);
			},

			function(next) {
				bot1.runStrategy(new BotSitInStrategy(1, 10)).then(next);
			},

			function(next) {
				bot2.runStrategy(new BotSitInStrategy(2, 10)).then(next);
			},

			function(next) {
				expect(table.getCurrentGame()).not.toBe(null);

				var s1 = bot1.runStrategy(new BotActSequenceStrategy([
					ButtonData.POST_BB,
					ButtonData.FOLD
				]));

				var s2 = bot2.runStrategy(new BotActSequenceStrategy([
					ButtonData.POST_SB,
					ButtonData.CALL,
					ButtonData.MUCK
				]));

				Thenable.all(s1, s2).then(next);
			},

			function(next) {
				expect(table.getCurrentGame().getGameState()).toEqual(jasmine.any(FinishedState));

				mockBackendServer.call = function(method, param) {
					expect(method).toBe("gameFinish");

					expect(param.gameId).toBe(987);
					expect(param.rake).toBe(0);
					expect(param.state).toBe('{"seats":[{"seatIndex":1,"userName":"olle","chips":8},{"seatIndex":2,"userName":"kalle","chips":12}]}');

					next();

					return new Thenable();
				};

				jasmine.clock().tick(5000);
			}
		).then(done);
	});
});