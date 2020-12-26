var NetPokerServer = require("../../../../src/server/app/NetPokerServer");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("tinp");
var BotConnection = require("../../../utils/BotConnection");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../../src/proto/messages/SeatClickMessage");
var ShowDialogMessage = require("../../../../src/proto/messages/ShowDialogMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/proto/data/ButtonData");

describe("NetPokerServer - connection", function() {
	var mockBackend;
	var mockBackendCalls;

	beforeEach(function() {
		mockBackend = {};
		mockBackendCalls = [];

		mockBackend.call = function(method, params) {
			mockBackendCalls.push(method);
			console.log("backend call: " + method);
			var thenable = new Thenable();

			switch (method) {
				case Backend.GET_CASHGAME_TABLE_LIST:
					thenable.resolve({
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
					thenable.resolve({
						id: 999,
						name: "testson"
					});
					break;

				case Backend.GET_USER_BALANCE:
					thenable.resolve({
						balance: 123
					});
					break;

				case Backend.SIT_IN:
					thenable.resolve();
					break;

				default:
					thenable.reject();
					break;
			}

			return thenable;
		}
	});

	it("routes table connections to the right table", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setClientPort(2004);
		netPokerServer.on(NetPokerServer.STARTED, function() {
			var bot = new BotConnection("http://localhost:2004", "token");
			bot.connectToTable(123);
			bot.waitForMessage(StateCompleteMessage).then(
				function() {
					expect(netPokerServer.cashGameManager.getTableById(123).tableSpectators.length).toBe(1);
					expect(netPokerServer.cashGameManager.getTableById(123).tableSpectators[0].user.getName()).toBe("testson");
					netPokerServer.close();
					bot.close();
					done();
				}
			);
		});
		netPokerServer.run();
	});

	it("lets a user join a table and removes on disconnect", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setClientPort(2004);

		var bot;
		var table;

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},

			function(next) {
				table = netPokerServer.cashGameManager.getTableById(123);
				expect(table.getTableSeatBySeatIndex(0).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(true);
				bot = new BotConnection("http://localhost:2004", "token");
				bot.connectToTable(123);
				bot.waitForMessage(StateCompleteMessage).then(next);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(1);
				bot.send(new SeatClickMessage(3));
				bot.waitForMessage(ShowDialogMessage).then(next);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(0);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).getUser().getName()).toBe("testson");
				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(false);

				bot.send(new ButtonClickMessage(ButtonData.SIT_IN, 100));
				setTimeout(next, 10);
			},

			function(next) {
				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(true);
				expect(table.getTableSeatBySeatIndex(3).getChips()).toBe(100);

				bot.close();
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockBackendCalls.indexOf(Backend.SIT_IN)).not.toBe(-1);
				expect(mockBackendCalls.indexOf(Backend.SIT_OUT)).not.toBe(-1);

				// FIX ME!
				expect(table.getTableSeatBySeatIndex(3).getUser()).toBe(null);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(true);

				netPokerServer.close();
				next();
			}
		).then(done);
	});

	it("doesn't let the user join with too little balance", function(done) {
		var netPokerServer = new NetPokerServer();
		netPokerServer.setBackend(mockBackend);
		netPokerServer.setClientPort(2004);

		var bot;
		var table;

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},

			function(next) {
				table = netPokerServer.cashGameManager.getTableById(123);
				expect(table.getTableSeatBySeatIndex(0).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(true);
				bot = new BotConnection("http://localhost:2004", "token");
				bot.connectToTable(123);
				bot.waitForMessage(StateCompleteMessage).then(next);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(1);
				bot.send(new SeatClickMessage(3));
				bot.waitForMessage(ShowDialogMessage).then(next);
			},

			function(next) {
				expect(table.tableSpectators.length).toBe(0);
				expect(table.getTableSeatBySeatIndex(3).isAvailable()).toBe(false);
				expect(table.getTableSeatBySeatIndex(3).getUser().getName()).toBe("testson");
				expect(table.getTableSeatBySeatIndex(3).isInGame()).toBe(false);

				mockBackend.call = function(method) {
					return Thenable.rejected();
				}

				bot.send(new ButtonClickMessage(ButtonData.SIT_IN, 100));
				setTimeout(next, 10);
			},

			function(next) {
				expect(table.getTableSeatBySeatIndex(3).getUser()).toEqual(null);
				expect(table.tableSpectators.length).toBe(1);

				bot.close();
				netPokerServer.close();
				next();
			}
		).then(done);
	});
});