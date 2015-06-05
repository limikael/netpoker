var BotConnection = require("../../../utils/BotConnection");
var BotPriorityActStrategy = require("../../../utils/BotPriorityActStrategy");
var PipeNetPokerServer = require("../../../utils/PipeNetPokerServer");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var ButtonData = require("../../../../src/proto/data/ButtonData");
var TickLoopRunner = require("../../../utils/TickLoopRunner");
var ButtonClickMessage = require("../../../../src/proto/messages/ButtonClickMessage");
var PlayState = require("../../../../src/server/tournament/PlayState");
var TournamentResultMessage = require("../../../../src/proto/messages/TournamentResultMessage");
var Thenable = require("tinp");

describe("TournamentTable.integration", function() {
	var netPokerServer;
	var mockBackendServer;
	var bots;

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

	/*it("plays a tournament", function(done) {
		mockBackendServer.tournamentInfo = function() {
			return {
				id: 666,
				state: "registration",
				info: "Welcome to the tournament...",
				requiredRegistrations: 4,
				seatsPerTable: 2,
				startChips: 1000,
				blindStructure: [{
					time: 100,
					stake: 2,
					ante: 0,
				}, {
					time: 100,
					stake: 4,
					ante: 1,
				}, {
					time: 100,
					stake: 6,
					ante: 2,
				}]
			};
		};

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
					if (!i) {
						stragety.addAction(ButtonData.CALL);
						stragety.addAction(ButtonData.CHECK);
					}

					stragety.addAction(ButtonData.FOLD);
					stragety.addAction(ButtonData.MUCK);

					thenables.push(bots[i].runStrategy(stragety));
				}

				Thenable.all(thenables).then(next);
			}
		).then(done);
	});*/
});