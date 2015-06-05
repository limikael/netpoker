var BotConnection = require("../../../utils/BotConnection");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var PlayState = require("../../../../src/server/tournament/PlayState");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var Thenable = require("tinp");

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

	it("can start a sit and go tournament", function(done) {
		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");
		var bot3 = new BotConnection(netPokerServer, "user3");

		spyOn(mockBackendServer, "tournamentStart").and.callThrough();

		AsyncSequence.run(
			function(next) {
				Thenable.all(
					bot1.connectToTournament(666),
					bot2.connectToTournament(666),
					bot3.connectToTournament(666)
				).then(next);
			},
			function(next) {
				bot1.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
				bot2.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
				bot3.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				var tournament = netPokerServer.getTournamentManager().getLocalTournamentById(666);
				var tournamentState = tournament.getTournamentState();
				expect(tournamentState).toEqual(jasmine.any(PlayState));
				expect(mockBackendServer.tournamentStart).toHaveBeenCalled();
				next();
			}
		).then(done);
	});
});