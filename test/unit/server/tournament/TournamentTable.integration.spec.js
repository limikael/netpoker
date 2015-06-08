var BotConnection = require("../../../utils/BotConnection");
var BotPriorityActStrategy = require("../../../utils/BotPriorityActStrategy");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var PlayState = require("../../../../src/server/tournament/PlayState");
var FinishedState = require("../../../../src/server/tournament/FinishedState");
var TournamentResultMessage = require("../../../../src/proto/messages/TournamentResultMessage");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var Thenable = require("tinp");

describe("TournamentTable.integration", function() {
	var netPokerServer;
	var mockBackendServer;
	var bots;
	var spectator;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);

		netPokerServer.run().then(done)

		bots = [];
	});

	afterEach(function() {
		netPokerServer.close();
	});

	it("plays a tournament", function(done) {
		var info = mockBackendServer.tournamentInfo();

		info.requiredRegistrations = 4;
		info.seatsPerTable = 2;
		info.handFinishDelay = 0;
		info.startChips = 10;

		mockBackendServer.tournamentInfo = function() {
			return info;
		};

		mockBackendServer.gameStartForCashGame = function() {
			throw new Error("should not be called in tournaments!");
		}

		spyOn(mockBackendServer, "tournamentStart").and.callThrough();
		spyOn(mockBackendServer, "tournamentFinish").and.callThrough();

		bots.push(new BotConnection(netPokerServer, "user1"));
		bots.push(new BotConnection(netPokerServer, "user2"));
		bots.push(new BotConnection(netPokerServer, "user3"));
		bots.push(new BotConnection(netPokerServer, "user4"));

		AsyncSequence.run(
			function(next) {
				bots.forEach(function(bot) {
					bot.connectToTournament(666)
				});
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				bots.forEach(function(bot) {
					bot.send(new ButtonClickMessage(ButtonData.JOIN_TOURNAMENT));
				});
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				var tournament = netPokerServer.getTournamentManager().getLocalTournamentById(666);
				var playState = tournament.getTournamentState();
				expect(playState).toEqual(jasmine.any(PlayState));
				expect(playState.tournamentTables.length).toBe(2);

				var thenables = [];

				for (var i = 0; i < bots.length; i++) {
					var stragety = new BotPriorityActStrategy();
					stragety.setFinishMessage(TournamentResultMessage);

					if (i <= 0)
						stragety.addAction(ButtonData.BET);

					if (i <= 1) {
						stragety.addAction(ButtonData.RAISE);
					}

					if (i <= 2) {
						stragety.addAction(ButtonData.CALL);
						stragety.addAction(ButtonData.CHECK);
					}

					stragety.addAction(ButtonData.FOLD);
					stragety.addAction(ButtonData.MUCK);

					thenables.push(bots[i].runStrategy(stragety));
				}

				Thenable.all(thenables).then(next);
			},
			function(next) {
				var tournament = netPokerServer.getTournamentManager().getLocalTournamentById(666);
				var finishedState = tournament.getTournamentState();
				expect(finishedState).toEqual(jasmine.any(FinishedState));

				expect(mockBackendServer.tournamentStart).toHaveBeenCalled();
				expect(mockBackendServer.tournamentFinish).toHaveBeenCalled();

				for (var i = 0; i < bots.length; i++)
					bots[i].close();

				var args = mockBackendServer.tournamentFinish.calls.argsFor(0)[0];
				console.log("f-order: " + args.finishorder);

				var order = JSON.parse(args.finishorder);
				expect(order.length).toBe(4);

				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				var have = netPokerServer.getTournamentManager().hasLocalTournamentId(666);
				expect(have).toBe(false);

				spectator = new BotConnection(netPokerServer, "user1");
				spectator.connectToTournament(666).then(next);
			},
			function(next) {
				expect(spectator.getLastMessageOfType(StateCompleteMessage)).not.toBeFalsy();
				next();
			}
		).then(done);
	});
});