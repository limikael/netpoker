var BotConnection = require("../../utils/BotConnection");
var MockBackendServer = require("../../utils/MockBackendServer");
var PipeNetPokerServer = require("../../utils/PipeNetPokerServer");
var StateCompleteMessage = require("../../../src/js/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../src/js/proto/messages/SeatClickMessage");
var ButtonClickMessage = require("../../../src/js/proto/messages/ButtonClickMessage");
var ShowDialogMessage = require("../../../src/js/proto/messages/ShowDialogMessage");
var SeatInfoMessage = require("../../../src/js/proto/messages/SeatInfoMessage");
var ButtonData = require("../../../src/js/proto/data/ButtonData");
var AsyncSequence = require("../../../src/js/utils/AsyncSequence");
var TickLoopRunner = require("../../utils/TickLoopRunner");
var BotSitInStrategy = require("../../utils/BotSitInStrategy");

describe("BotConnection", function() {
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

	it("can connect to a server", function(done) {
		var b = new BotConnection(netPokerServer, "user1");

		AsyncSequence.run(
			function(next) {
				b.connectToTable(123);
				b.runStrategy(new BotSitInStrategy(1,10)).then(next);
			},

			function(next) {
				expect(b.getLastMessageOfType(SeatInfoMessage).getChips()).toBe(10);

				expect(b.getSeatAt(1).getChips()).toBe(10);
				expect(b.getSeatAt(1).getName()).toBe("olle");
				next();
			}
		).then(done);
	});
});