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

		AsyncSequence.run(
			function(next) {
				netPokerServer.run().then(next);
			},
			function(next) {
				bot1 = new BotConnection(netPokerServer, "user1");
				bot2 = new BotConnection(netPokerServer, "user2");
				bot3 = new BotConnection(netPokerServer, "user3");
				botSpectator = new BotConnection(netPokerServer, "anon");
				Thenable.all(
					bot1.connectToTournament(666),
					bot2.connectToTournament(666),
					bot3.connectToTournament(666),
					botSpectator.connectToTournament(666)
				).then(next);
			},
			function(next) {
				Thenable.all(
					bot1.waitForMessage(StateCompleteMessage),
					bot2.waitForMessage(StateCompleteMessage),
					bot3.waitForMessage(StateCompleteMessage),
					botSpectator.waitForMessage(StateCompleteMessage)
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
			console.log("******** returning false");
			return false;
		};

		spyOn(mockBackendServer, "tournamentStart").and.callThrough();

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
				next();
			}
		).then(done);
	});
});