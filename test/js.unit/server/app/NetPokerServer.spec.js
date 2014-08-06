var NetPokerServer = require("../../../../src/js/server/app/NetPokerServer");
var Backend = require("../../../../src/js/server/backend/Backend");
var Thenable = require("../../../../src/js/utils/Thenable");
var BotConnection = require("../../../utils/BotConnection");
var StateCompleteMessage = require("../../../../src/js/proto/messages/StateCompleteMessage");

describe("NetPokerServer", function() {
	var mockBackend;

	beforeEach(function() {
		mockBackend = {};
	})

	it("routes table connections to the right table", function(done) {
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
					done();
				}
			);
		});
		netPokerServer.run();
	});
});