const BotConnection = require("../../src/bot/BotConnection");
const BotSitInStrategy = require("../../src/bot/BotSitInStrategy");
const TickLoopRunner = require("../../src/utils/TickLoopRunner");
const NetPokerServer=require("../../../../src.js/server/app/NetPokerServer");

describe("BotStrategy", function() {
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

	it("can run a sit in strategy", async()=>{
		let b=new BotConnection();
		await b.connect("ws://localhost:9999/?token=user1&tableId=123");
		await b.runStrategy(new BotSitInStrategy(1, 10));

		expect(b.getSeatAt(1).getChips()).toBe(10);
		expect(b.getSeatAt(1).getName()).toBe("olle");
	});
});