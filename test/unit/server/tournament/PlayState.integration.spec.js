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

describe("PlayState.integration", function() {
	var netPokerServer;
	var mockBackendServer;
	var bot1, bot2, bot3;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot2 = new BotConnection(netPokerServer, "user2");
				bot3 = new BotConnection(netPokerServer, "user3");
				Thenable.all(
					bot1.connectToTournament(666),
					bot2.connectToTournament(666),
					bot3.connectToTournament(666)
				).then(next);
			},
			function(next) {
				Thenable.all(
					bot1.waitForMessage(StateCompleteMessage),
					bot2.waitForMessage(StateCompleteMessage),
					bot3.waitForMessage(StateCompleteMessage)
				).then(next);
			}
		).then(done);
	});

	afterEach(function() {
		netPokerServer.close();
	});

	it("enters the state", function(done) {
		AsyncSequence.run(
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

				var playState = tournamentState;
				expect(playState.tournamentTables.length).toBe(1);
				expect(playState.tournamentTables[0].getNumSeatsUsed()).toBe(3);
				next();
			}
		).then(done);
	});
});