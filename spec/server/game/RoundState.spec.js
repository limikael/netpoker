const BotConnection = require("../../support/src/bot/BotConnection");
const TickLoopRunner = require("../../support/src/utils/TickLoopRunner");
const BotSitInStrategy = require("../../support/src/bot/BotSitInStrategy");
const NetPokerServer = require("../../../src.js/server/app/NetPokerServer");
const PromiseUtil = require("../../../src.js/utils/PromiseUtil");
const FinishedState = require("../../../src.js/server/game/FinishedState");
const AskBlindState = require("../../../src.js/server/game/AskBlindState");
const RoundState = require("../../../src.js/server/game/RoundState");
const CardData = require("../../../src.js/data/CardData");

describe("RoundState", function() {
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

	it("can raise",async()=>{
		let table = server.cashGameManager.getTableById(123);
		let bot1, bot2;

		bot1=new BotConnection();
		await bot1.connect("ws://localhost:9999/?token=user1&tableId=123");

		bot2=new BotConnection();
		await bot2.connect("ws://localhost:9999/?token=user2&tableId=123");

		await Promise.all([
			bot1.runStrategy(new BotSitInStrategy(1,10)),
			bot2.runStrategy(new BotSitInStrategy(2,10))
		]);

		await TickLoopRunner.runTicks();
		expect(table.getCurrentGame().getGameState()).toBeInstanceOf(AskBlindState);

		await bot2.waitForButtons();
		bot2.act("postBB");
		await bot1.waitForButtons();
		bot1.act("postSB");

		await bot1.waitForMessage("tableInfo");
		expect(bot1.getSeatAt(1).getBet()).toBe(1);
		expect(bot1.getSeatAt(1).getChips()).toBe(9);
		expect(bot1.getSeatAt(2).getBet()).toBe(2);
		expect(bot1.getSeatAt(2).getChips()).toBe(8);

		expect(table.getCurrentGame().getGameState()).toBeInstanceOf(RoundState);
		expect(bot1.getSeatAt(1).getCardAt(0)).not.toBe(null);

		expect(bot1.getButtons()).toEqual(["fold","call","raise"]);

		console.log("acting in spec...");
		bot1.act("raise", 5);
		console.log("done acting in spec...");

		await bot2.waitForButtons();

		expect(table.getCurrentGame().getCommunityCards().length).toBe(0);

		expect(bot1.getSeatAt(2).getBet()).toBe(2);
		expect(bot1.getSeatAt(2).getChips()).toBe(8);

		expect(bot2.isActionAvailable("call")).toBe(true);
		bot2.act("call");

		await bot1.waitForMessage("communityCards");

		expect(table.getCurrentGame().getCommunityCards().length).toBe(3);

		bot1.close();
		bot2.close();
	});

	it("can handle all in", async()=>{
/*		let table = server.cashGameManager.getTableById(123);
		let bot1, bot2;

		bot1=new BotConnection();
		await bot1.connect("ws://localhost:9999/?token=user1&tableId=123");

		bot2=new BotConnection();
		await bot2.connect("ws://localhost:9999/?token=user2&tableId=123");

		await Promise.all([
			bot1.runStrategy(new BotSitInStrategy(1,10)),
			bot2.runStrategy(new BotSitInStrategy(2,100))
		]);

		await TickLoopRunner.runTicks();
		expect(table.getCurrentGame().getGameState()).toBeInstanceOf(AskBlindState);

		await bot2.waitForButtons();
		bot2.act("postBB");

		await bot1.waitForButtons();
		bot1.act("postSB");

		await bot1.waitForButtons();
		expect(bot1.getSeatAt(1).getBet()).toBe(1);
		expect(bot1.getSeatAt(1).getChips()).toBe(9);
		expect(bot1.getSeatAt(2).getBet()).toBe(2);
		expect(bot1.getSeatAt(2).getChips()).toBe(98);
		bot1.act("raise",100);

		await bot2.waitForButtons();
		bot2.act("call");

		await TickLoopRunner.runTicks();
		await bot1.waitForMessage("pot");
		let potMessages=bot1.getMessagesOfType("pot");
		expect(potMessages.length).toBe(1);*/
//		expect(potMessages[0].values.length).toBe(1);

/*			function(next) {
				var potMessages=bot1.getMessagesOfType(PotMessage);
				console.log(potMessages);

				expect(potMessages[0].values.length).toBe(1);

				expect(table.getCurrentGame().getGameState()).toEqual(jasmine.any(FinishedState));
				next();
			}
		).then(done);*/
	});
});