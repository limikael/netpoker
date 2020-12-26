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
var TableButtonsMessage = require("../../../../src/proto/messages/TableButtonsMessage");
var TableButtonClickMessage = require("../../../../src/proto/messages/TableButtonClickMessage");
var FadeTableMessage = require("../../../../src/proto/messages/FadeTableMessage");
var BotJoinTournamentStrategy = require("../../../utils/BotJoinTournamentStrategy");
var Thenable = require("tinp");

describe("PlaySpectator.integration", function() {
	var netPokerServer;
	var mockBackendServer;
	var bots;
	var spectatorBot;

	beforeEach(function(done) {
		mockBackendServer = new MockBackendServer();
		mockBackendServer.tournamentSeatsPerTable = 2;
		mockBackendServer.tournamentRequiredRegistrations = 4;

		netPokerServer = new PipeNetPokerServer();
		netPokerServer.setBackend(mockBackendServer);

		netPokerServer.run().then(done)

		bots = [];
	});

	afterEach(function() {
		netPokerServer.close();
	});

	it("can switch table", function(done) {
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
					bot.runStrategy(new BotJoinTournamentStrategy())
				});
				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				var tournament = netPokerServer.getTournamentManager().getLocalTournamentById(666);
				var playState = tournament.getTournamentState();
				expect(playState).toEqual(jasmine.any(PlayState));
				expect(playState.tournamentTables.length).toBe(2);

				spectatorBot = new BotConnection(netPokerServer, "anon");
				spectatorBot.connectToTournament(666).then(next);
			},
			function(next) {
				var m = spectatorBot.getLastMessageOfType(TableButtonsMessage);
				expect(m.getCurrentIndex()).toBe(0);
				spectatorBot.send(new TableButtonClickMessage(1));

				TickLoopRunner.runTicks().then(next);
			},
			function(next) {
				expect(spectatorBot.getMessagesOfType(FadeTableMessage).length).toBe(2);
				next();
			}
		).then(done);
	});
});