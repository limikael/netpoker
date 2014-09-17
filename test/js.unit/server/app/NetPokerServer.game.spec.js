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

describe("NetPokerServer - ask blinds", function() {
	var mockBackend;

	beforeEach(function() {
		jasmine.clock().install();
		mockBackend = {};

		mockBackend.call = function(method, params) {
			console.log("#### backend call: " + method);
			var thenable = new Thenable();

			switch (method) {
				case Backend.GET_TABLE_LIST:
					thenable.notifySuccess({
						tables: [{
							id: 123,
							numseats: 4,
							currency: "PLY",
							name: "Test Table",
							minSitInAmount: 10,
							maxSitInAmount: 100,
							stake: 2
						}]
					});
					break;

				case Backend.GET_USER_INFO_BY_TOKEN:
					switch (params.token) {
						case "user1":
							thenable.notifySuccess({
								id: 999,
								name: "testson_one"
							});
							break;

						case "user2":
							thenable.notifySuccess({
								id: 888,
								name: "testson_two"
							});
							break;

						case "user3":
							thenable.notifySuccess({
								id: 777,
								name: "testson_three"
							});
							break;

						default:
							thenable.notifyError();
							break;
					}
					break;

				case Backend.GET_USER_BALANCE:
					thenable.notifySuccess({
						balance: 123
					});
					break;

				case Backend.SIT_IN:
					thenable.notifySuccess();
					break;

				case Backend.START_CASH_GAME:
					thenable.notifySuccess({
						gameId: 111
					});
					break;

				default:
					thenable.notifyError();
					break;
			}

			return thenable;
		}
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	})

	it("starts a game when two users connect", function(done) {
		var netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackend);

		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");
		var bot3 = new BotConnection(netPokerServer, "user3");

		var table;

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
				jasmine.clock().tick(10);
			},

			function(next) {
				table = netPokerServer.tableManager.getTableById(123);

				bot1.reply(StateCompleteMessage, new SeatClickMessage(3));
				bot1.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));
				bot2.reply(StateCompleteMessage, new SeatClickMessage(5));
				bot2.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));
				bot3.reply(StateCompleteMessage, new SeatClickMessage(7));
				bot3.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN, 10));

				bot1.connectToTable(123);
				bot2.connectToTable(123);
				bot3.connectToTable(123);

				TickLoopRunner.runTicks().then(next);
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

				expect(table.getCurrentGame().getNumInGame()).toBe(3);

				table.stop();
				jasmine.clock().tick(FinishedState.FINISH_DELAY + 1);
				next();
			},

			function() {
				//expect(table.getCurrentGame()).toBe(null);
				netPokerServer.close();
				done();
			}
		);
	});
});