var BotConnection = require("../../../utils/BotConnection");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var User = require("../../../../src/server/user/User");
var PlayState = require("../../../../src/server/tournament/PlayState");
var FinishedState = require("../../../../src/server/tournament/FinishedState");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var Thenable = require("tinp");

describe("PlayState.integration", function() {
	var netPokerServer;
	var mockBackendServer;
	var bot1, bot2, bot3;
	var botSpectator;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);

		bot1 = new BotConnection(netPokerServer, "user1");
		bot2 = new BotConnection(netPokerServer, "user2");
		bot3 = new BotConnection(netPokerServer, "user3");
		botSpectator = new BotConnection(netPokerServer, "anon");

		Thenable.all(
			netPokerServer.run(),
			bot1.connectToTournament(666),
			bot2.connectToTournament(666),
			bot3.connectToTournament(666),
			botSpectator.connectToTournament(666)
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
				expect(playState.playSpectators.length).toBe(1);

				var user = new User({
					id: "101",
					name: "olle"
				});

				var seat = tournamentState.getTableSeatByUser(user);
				expect(seat).not.toBeFalsy();
				expect(seat.protoConnection).not.toBeFalsy();

				next();
			}
		).then(done);
	});

	it("handles failing start calls", function(done) {
		mockBackendServer.tournamentStart = function() {
			return false;
		};

		spyOn(mockBackendServer, "tournamentStart").and.callThrough();
		spyOn(mockBackendServer, "tournamentCancel").and.callThrough();

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
				expect(tournamentState).toEqual(jasmine.any(FinishedState));
				expect(mockBackendServer.tournamentStart).toHaveBeenCalled();
				expect(tournamentState.finishedSpectators.length).toBe(4);
				expect(tournamentState.canceled).toBe(true);
				expect(mockBackendServer.tournamentCancel).toHaveBeenCalled();

				bot1.close();
				bot2.close();
				bot3.close();
				botSpectator.close();
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				expect(netPokerServer.getTournamentManager().hasLocalTournamentId(666)).toBe(false);
				next();
			}
		).then(done);
	});
});