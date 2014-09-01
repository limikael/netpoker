var NetPokerServer = require("../../../../src/js/server/app/NetPokerServer");
var Backend = require("../../../../src/js/server/backend/Backend");
var Thenable = require("../../../../src/js/utils/Thenable");
var BotConnection = require("../../../utils/BotConnection");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var StateCompleteMessage = require("../../../../src/js/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/js/proto/messages/SeatClickMessage");

describe("NetPokerServer", function() {
	var mockBackend;

	beforeEach(function() {
		mockBackend = {};

		mockBackend.call = function(method) {
			var thenable = new Thenable();

			switch (method) {
				case Backend.GET_TABLE_LIST:
					thenable.notifySuccess({
						tables: [{
							id: 123,
							numseats: 4
						}]
					});
					break;

				case Backend.GET_USER_INFO_BY_TOKEN:
					thenable.notifySuccess({
						id: 999,
						name: "testson"
					});
					break;

				default:
					thenable.notifyError();
					break;
			}

			return thenable;
		}
	});

	it("routes table connections to the right table", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setListenPort(2004);
		netPokerServer.on(NetPokerServer.STARTED, function() {
			var bot = new BotConnection("http://localhost:2004", "token");
			bot.connectToTable(123);
			bot.waitForMessage(StateCompleteMessage).then(
				function() {
					expect(netPokerServer.tableManager.getTableById(123).tableSpectators.length).toBe(1);
					expect(netPokerServer.tableManager.getTableById(123).tableSpectators[0].user.getName()).toBe("testson");
					netPokerServer.close();
					done();
				}
			);
		});
		netPokerServer.run();
	});

	it("lets a user join a table", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setListenPort(2004);

		var bot;
		var table;

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},

			function(next) {
				table = netPokerServer.tableManager.getTableById(123);
				expect(table.getTableSeatBySeatIndex(0).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(true);
				bot = new BotConnection("http://localhost:2004", "token");
				bot.connectToTable(123);
				bot.waitForMessage(StateCompleteMessage).then(next);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(1);
				bot.send(new SeatClickMessage(3));
				setTimeout(next, 10);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(0);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).getUser().getName()).toBe("testson");
				next();
			}
		).then(done);
	});
});