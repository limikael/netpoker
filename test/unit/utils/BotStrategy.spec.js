var BotConnection = require("../../utils/BotConnection");
var MockBackendServer = require("../../../src/server/mock/MockBackendServer");
var PipeNetPokerServer = require("../../utils/PipeNetPokerServer");
var StateCompleteMessage = require("../../../src/proto/messages/StateCompleteMessage");
var SeatClickMessage = require("../../../src/proto/messages/SeatClickMessage");
var ButtonClickMessage = require("../../../src/proto/messages/ButtonClickMessage");
var ShowDialogMessage = require("../../../src/proto/messages/ShowDialogMessage");
var SeatInfoMessage = require("../../../src/proto/messages/SeatInfoMessage");
var ButtonData = require("../../../src/proto/data/ButtonData");
var AsyncSequence = require("../../../src/utils/AsyncSequence");
var TickLoopRunner = require("../../utils/TickLoopRunner");
var BotSitInStrategy = require("../../utils/BotSitInStrategy");

describe("BotStrategy", function() {
	var mockBackendServer;
	var netPokerServer;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();
		mockBackendServer.setListenPort(9999);
		mockBackendServer.start();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend("http://localhost:9999");
		netPokerServer.run().then(done);
	});

	afterEach(function() {
		mockBackendServer.close();
	});

	it("can run a sit in strategy", function(done) {
		var b = new BotConnection(netPokerServer, "user1");
		b.connectToTable(123);
		b.runStrategy(new BotSitInStrategy(1, 10)).then(
			function() {
				expect(b.getSeatAt(1).getChips()).toBe(10);
				expect(b.getSeatAt(1).getName()).toBe("olle");
				done();
			}
		);
	});
});