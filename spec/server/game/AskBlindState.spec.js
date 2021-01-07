const BotConnection = require("../../support/src/bot/BotConnection");
const TickLoopRunner = require("../../support/src/utils/TickLoopRunner");
const BotSitInStrategy = require("../../support/src/bot/BotSitInStrategy");
const FinishedState = require("../../../src.js/server/game/FinishedState");
const NetPokerServer = require("../../../src.js/server/app/NetPokerServer");
const PromiseUtil = require("../../../src.js/utils/PromiseUtil");

describe("AskBlindState", function() {
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

	it("doesn't start if there is not enough players", async()=>{
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

		expect(bot1.getDealerButtonPosition()).toBe(1);
		expect(bot1.getButtons()).toEqual([]);
		expect(bot2.getButtons()).toEqual(["sitOut","postBB"]);

		bot2.act("sitOut");
		await TickLoopRunner.runTicks();
		await PromiseUtil.delay(100);

		expect(table.getCurrentGame().getGameState()).toBeInstanceOf(FinishedState);

		bot1.close();
		bot2.close();
	});

	it("handles heads up", async ()=>{
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

		expect(bot1.getDealerButtonPosition()).toBe(1);
		expect(bot1.getButtons()).toEqual([]);
		expect(bot2.getButtons()).toEqual(["sitOut","postBB"]);

		expect(bot2.isActionAvailable("postBB")).toBe(true);

		bot1.close();
		bot2.close();
	});

	/*it("handles non heads up", async ()=>{
		let table = server.cashGameManager.getTableById(123);
		let bot1, bot2, bot3;

		bot1=new BotConnection();
		await bot1.connect("ws://localhost:9999/?token=user1&tableId=123");

		bot2=new BotConnection();
		await bot2.connect("ws://localhost:9999/?token=user2&tableId=123");

		bot3=new BotConnection();
		await bot3.connect("ws://localhost:9999/?token=user3&tableId=123");

		await Promise.all([
			bot1.runStrategy(new BotSitInStrategy(1,10)),
			bot2.runStrategy(new BotSitInStrategy(2,10)),
			bot3.runStrategy(new BotSitInStrategy(3,10))
		]);

		//await PromiseUtil.delay(100);
		await TickLoopRunner.runTicks(1);

		expect(bot1.getDealerButtonPosition()).toBe(1);
		expect(bot1.getButtons()).toEqual([]);
		expect(bot2.getButtons()).toEqual(["sitOut","postSB"]);
		expect(bot3.getButtons()).toEqual([]);

		expect(bot2.isActionAvailable("postSB")).toBe(true);

		bot1.close();
		bot2.close();
		bot3.close();
	});*/
});