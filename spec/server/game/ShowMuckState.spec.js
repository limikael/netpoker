var BotConnection = require("../../support/src/bot/BotConnection");
var TickLoopRunner = require("../../support/src/utils/TickLoopRunner");
var AskBlindState = require("../../../src.js/server/game/AskBlindState");
var RoundState = require("../../../src.js/server/game/RoundState");
var CardData = require("../../../src.js/data/CardData");
var BotSitInStrategy = require("../../support/src/bot/BotSitInStrategy");
var BotCheckUntilEndStrategy = require("../../support/src/bot/BotCheckUntilEndStrategy");
var ShowMuckState = require("../../../src.js/server/game/ShowMuckState");
var Hand = require("../../../src.js/server/game/Hand");

describe("ShowMuckState", function() {
	let server;

	beforeEach(async()=>{
		server=new NetPokerServer({
			mock: true,
			port: 9999
		});

		await server.run();
	});

	afterEach(function() {
		server.close();
	});

	/*it("first player has to show automatically", function(done) {
		netPokerServer.useFixedDeck(["ah", "3d", "ad", "5d", "8s", "9d", "kh", "10s", "as"]);

		var bot1 = new BotConnection(netPokerServer, "user1");
		var bot2 = new BotConnection(netPokerServer, "user2");

		var table = netPokerServer.cashGameManager.getTableById(123);

		AsyncSequence.run(
			function(next) {
				bot1.connectToTable(123);
				bot1.runStrategy(new BotSitInStrategy(1, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot2.connectToTable(123);
				bot2.runStrategy(new BotSitInStrategy(2, 10)).then(next);
				TickLoopRunner.runTicks();
			},

			function(next) {
				bot1.send(new CheckboxMessage(CheckboxMessage.AUTO_MUCK_LOSING, false));
				bot2.send(new CheckboxMessage(CheckboxMessage.AUTO_MUCK_LOSING, false));
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(table.getCurrentGame().gameState).toEqual(jasmine.any(AskBlindState));
				bot2.act(ButtonData.POST_BB);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1.act(ButtonData.POST_SB);
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				var t1 = bot1.runStrategy(new BotCheckUntilEndStrategy());
				var t2 = bot2.runStrategy(new BotCheckUntilEndStrategy());

				Thenable.race(t1, t2).then(next);
			},

			function(next) {
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				bot1.clearStrategy();
				bot2.clearStrategy();

				expect(table.getCurrentGame().getGameState() instanceof ShowMuckState).toBe(true);

				expect(table.getCurrentGame().getGameSeatForSeatIndex(2).getHand().getCategory()).toBe(Hand.THREE_OF_A_KIND);
				expect(table.getCurrentGame().getGameSeatForSeatIndex(2).isShowing()).toBe(true);
				expect(table.getCurrentGame().getGameSeatForSeatIndex(1).isShowing()).toBe(false);
				expect(bot1.getButtons()).not.toBe(null);
				expect(bot1.isActionAvailable(ButtonData.SHOW)).toBe(true);
				expect(bot1.isActionAvailable(ButtonData.MUCK)).toBe(true);
				next();
			}
		).then(done);
	});*/
});