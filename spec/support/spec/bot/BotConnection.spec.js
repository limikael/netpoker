const BotConnection = require("../../src/bot/BotConnection");
const NetPokerServer=require("../../../../src.js/server/app/NetPokerServer");

describe("BotConnection", function() {
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

	it("can connect to a server", async()=> {
		let b=new BotConnection();
		b.connect("ws://localhost:9999/?token=user1&tableId=123");
		await b.waitForMessage("stateComplete");
	});

	/*it("can run a strategy",async()=>{
		let b=new BotConnection();
		await b.connect("ws://localhost:9999/?token=user1&tableId=123");
		await b.runStrategy(new BotSitInStrategy(1,10));

		expect(b.getLastMessageOfType("seatInfo").chips).toBe(10);

		expect(b.getSeatAt(1).getChips()).toBe(10);
		expect(b.getSeatAt(1).getName()).toBe("olle");
	});*/

		/*AsyncSequence.run(
			function(next) {
				b.connectToTable(123);
				b.runStrategy(new BotSitInStrategy(1,10)).then(next);
			},

			function(next) {
				expect(b.getLastMessageOfType(SeatInfoMessage).getChips()).toBe(10);

				expect(b.getSeatAt(1).getChips()).toBe(10);
				expect(b.getSeatAt(1).getName()).toBe("olle");

				b.close();
				next();
			}
		).then(done);*/
});