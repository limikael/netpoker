var BotConnection = require("../../../utils/BotConnection");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");

describe("Tournament.integration", function() {
	var netPokerServer;
	var mockBackendServer;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);
		netPokerServer.run().then(done);
	});

	afterEach(function() {
		netPokerServer.close();
	})

	it("a bot can connect to a torunament", function(done) {
		var bot = new BotConnection(netPokerServer, "user1");

		AsyncSequence.run(
			function(next) {
				bot.connectToTournament(666).then(next);
			},
			function(next) {
				bot.waitForMessage(StateCompleteMessage).then(next);
			},
			function(next) {
				expect(netPokerServer.getTournamentManager().hasLocalTournamentId(666)).toBe(true);
				bot.close();
				next();
			},
			function(next) {
				expect(netPokerServer.getTournamentManager().hasLocalTournamentId(666)).toBe(false);
				next();
			}
		).then(done);
	});

	it("a bot can register for a tournament", function(done) {
		var bot = new BotConnection(netPokerServer, "user1");

		spyOn(mockBackendServer, "tournamentRegister").and.callThrough();

		AsyncSequence.run(
			function(next) {
				bot.connectToTournament(666).then(next);
			},
			function(next) {
				bot.waitForMessage(StateCompleteMessage).then(next);
			},
			function(next) {
				expect(netPokerServer.getTournamentManager().hasLocalTournamentId(666)).toBe(true);
				bot.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				expect(mockBackendServer.tournamentRegister).toHaveBeenCalled();
				next();
			}
		).then(done);
	});
});