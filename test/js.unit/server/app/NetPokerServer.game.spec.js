var NetPokerServer = require("../../../../src/js/server/app/NetPokerServer");
var Backend = require("../../../../src/js/server/backend/Backend");
var Thenable = require("../../../../src/js/utils/Thenable");
var BotConnection = require("../../../utils/BotConnection");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var StateCompleteMessage = require("../../../../src/js/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/js/proto/messages/SeatClickMessage");
var ShowDialogMessage = require("../../../../src/js/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");

describe("NetPokerServer - game", function() {
	var mockBackend;

	beforeEach(function() {
		mockBackend = {};

		mockBackend.call = function(method, params) {
			console.log("backend call: " + method);
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
							maxSitInAmount: 100
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

				default:
					thenable.notifyError();
					break;
			}

			return thenable;
		}
	});

	it("starts a game when two users connect", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setListenPort(2004);

		var bot1 = new BotConnection("http://localhost:2004", "user1");
		var bot2 = new BotConnection("http://localhost:2004", "user2");

		var table;

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},

			function(next) {
				table = netPokerServer.tableManager.getTableById(123);

				bot1.reply(StateCompleteMessage, new SeatClickMessage(3));
				bot1.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN));
				bot2.reply(StateCompleteMessage, new SeatClickMessage(5));
				bot2.reply(ShowDialogMessage, new ButtonClickMessage(ButtonData.SIT_IN));

				bot1.connectToTable(123);
				bot2.connectToTable(123);

				//bot2.waitForMessage(ShowDialogMessage).then(next);
				setTimeout(next, 100);
			},

			function(next) {
				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(true);
				expect(table.getTableSeatBySeatIndex(5).isInGame()).toBe(true);
				expect(table.getCurrentGame()).not.toBe(null);
				netPokerServer.close();
				next();
			}
		).then(done);
	});
});