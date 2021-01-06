const CashGameBuyChipsPrompt = require("../../../src.js/server/cashgame/CashGameBuyChipsPrompt");
const User = require("../../../src.js/server/connection/User");
const EventEmitter=require("events");
const TickLoopRunner=require("../../support/src/utils/TickLoopRunner");

describe("CashGameBuyChipsPrompt", function() {
	var user;
	var mockConnection;
	var mockTable;
	var mockBackend;
	var mockServer;
	var mockTableSeat;

	beforeEach(function() {
		user = new User({
			id: 123,
			name: "testson"
		});

		mockConnection = {};
		mockConnection.send = jasmine.createSpy();

		mockTable = {};
		mockTable.getCurrency = function() {
			return "PLY";
		}
		mockTable.getName = function() {
			return "Mock Table";
		}
		mockTable.getMinSitInAmount = function() {
			return 10;
		}
		mockTable.getMaxSitInAmount = function() {
			return 100;
		}
		mockTable.getId = function() {
			return 123;
		}

		mockBackend = {};
		mockBackend.call = async (method)=>{
			switch (method) {
				case "getUserBalance":
					return {
						balance: 123,
					};
					break;
			}
		}

		mockServer = {};
		mockServer.getBackend = function() {
			return mockBackend;
		}

		mockTableSeat = new EventEmitter();
		mockTableSeat.getConnection = function() {
			return mockConnection;
		}
		mockTableSeat.getUser = function() {
			return user;
		}
		mockTableSeat.getTable = function() {
			return mockTable;
		}
		mockTableSeat.getServer = function() {
			return mockServer;
		}
		mockTableSeat.send = jasmine.createSpy();
	});

	it("can cancels itself on connection close", async ()=> {
		var cancelSpy = jasmine.createSpy();

		var prompt = new CashGameBuyChipsPrompt(mockTableSeat);
		prompt.on("cancel", cancelSpy);
		prompt.ask();

		await TickLoopRunner.runTicks();

		expect(mockTableSeat.send).toHaveBeenCalled();
		var dialogMessage = mockTableSeat.send.calls.argsFor(0)[1];
		expect(dialogMessage.buttons.length).toBe(2);

		mockTableSeat.emit("close");

		await TickLoopRunner.runTicks();

		expect(mockTableSeat.eventNames()).toEqual([]);
		expect(cancelSpy).toHaveBeenCalled();
	});

	it("can cancels itself on cancel", async ()=> {
		var cancelSpy = jasmine.createSpy();

		var prompt = new CashGameBuyChipsPrompt(mockTableSeat);
		prompt.on("cancel", cancelSpy);
		prompt.ask();

		await TickLoopRunner.runTicks();

		expect(mockTableSeat.send).toHaveBeenCalled();
		var dialogMessage = mockTableSeat.send.calls.argsFor(0)[1];
		expect(dialogMessage.buttons.length).toBe(2);

		mockTableSeat.emit("buttonClick", {
			button: "cancel"
		});

		await TickLoopRunner.runTicks();

		expect(mockTableSeat.eventNames()).toEqual([]);
		expect(cancelSpy).toHaveBeenCalled();
	});

	it("can be completed", async ()=> {
		spyOn(mockBackend, "call").and.callThrough();

		var completeSpy = jasmine.createSpy();
		var cancelSpy = jasmine.createSpy();

		var prompt = new CashGameBuyChipsPrompt(mockTableSeat);
		prompt.on("complete", completeSpy);
		prompt.on("cancel", cancelSpy);
		prompt.ask();

		await TickLoopRunner.runTicks();

		expect(mockBackend.call.calls.count()).toBe(1);

		expect(mockTableSeat.send).toHaveBeenCalled();
		var dialogMessage = mockTableSeat.send.calls.argsFor(0)[1];
		expect(dialogMessage.buttons.length).toBe(2);

		mockTableSeat.emit("buttonClick",{
			button: "sitIn",
			value: 50
		});

		await TickLoopRunner.runTicks();

		expect(mockBackend.call.calls.count()).toBe(2);

		expect(mockTableSeat.eventNames().length).toBe(0);
		expect(cancelSpy).not.toHaveBeenCalled();
	});

	it("cancels itself if sit in call fails", async ()=> {
		spyOn(mockBackend, "call").and.callThrough();

		var completeSpy = jasmine.createSpy();
		var cancelSpy = jasmine.createSpy();

		var prompt = new CashGameBuyChipsPrompt(mockTableSeat);
		prompt.on("complete", completeSpy);
		prompt.on("cancel", cancelSpy);
		prompt.ask();

		await TickLoopRunner.runTicks();

		expect(mockBackend.call.calls.count()).toBe(1);

		mockBackend.call = async (method)=> {
			throw new Error("something wrong");
		};

		spyOn(mockBackend, "call").and.callThrough();

		expect(mockTableSeat.send).toHaveBeenCalled();
		var dialogMessage = mockTableSeat.send.calls.argsFor(0)[1];
		expect(dialogMessage.buttons.length).toBe(2);

		mockTableSeat.emit("buttonClick",{
			button: "sitIn",
			value: 50
		});

		await TickLoopRunner.runTicks();

		expect(mockBackend.call.calls.count()).toBe(1);

		expect(mockTableSeat.eventNames().length).toBe(0);
		expect(cancelSpy).toHaveBeenCalled();
		expect(completeSpy).not.toHaveBeenCalled();
	});

	/*it("fails gracefully", function(done) {
		mockBackend.call = function(method) {
			return Thenable.rejected("something wrong");
		};

		var prompt = new CashGameBuyChipsPrompt(mockTableSeat);

		prompt.on(CashGameBuyChipsPrompt.CANCEL, function() {
			expect(mockTableSeat.send).toHaveBeenCalled();
			done();
		});

		prompt.ask();
	});*/
});