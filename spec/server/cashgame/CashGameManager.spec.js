var CashGameManager = require("../../../src.js/server/cashgame/CashGameManager");
var CashGameTable = require("../../../src.js/server/cashgame/CashGameTable");
var TickLoopRunner = require("../../support/src/utils/TickLoopRunner");

describe("CashGameManager", function() {
	var mockBackend, mockServer;
	var backendCallData;

	beforeEach(function() {
		backendCallData = null;

		mockBackend = {};
		mockBackend.call = async()=>{
			if (backendCallData)
				return backendCallData;

			else
				throw new Error("no data");
		};

		spyOn(mockBackend, "call").and.callThrough();

		mockServer = {};
		mockServer.getBackend = function() {
			return mockBackend;
		}
	});

	it("fetches table info on initialization", async()=>{
		var cashGameManager = new CashGameManager(mockServer);

		backendCallData = {
			"tables": [{
				id: 123,
				numSeats: 10,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}, {
				id: 124,
				numSeats: 4,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}]
		};

		await cashGameManager.initialize();

		expect(mockBackend.call).toHaveBeenCalledWith("getCashGameTableList");
		expect(cashGameManager.tables.length).toBe(2);
	});

	it("can find a table by id", async()=>{
		var cashGameManager = new CashGameManager(mockServer);

		backendCallData = {
			"tables": [{
				"id": "table_123",
				numSeats: 10,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}]
		};

		await cashGameManager.initialize();

		var table = cashGameManager.getTableById("table_123");

		expect(table).not.toEqual(null);
		expect(table.getId()).toEqual("table_123");
	});

	function createTableData(tableId) {
		return {
			"id": tableId,
			numSeats: 10,
			currency: "PLY",
			name: "Test Table",
			minSitInAmount: 10,
			maxSitInAmount: 100,
			stake: 2
		};
	};

	it("can reload table info", async()=>{
		var cashGameManager = new CashGameManager(mockServer);
		var initializedSpy = jasmine.createSpy();

		backendCallData = {};
		backendCallData.tables = [];
		backendCallData.tables.push(createTableData("table_123"));
		backendCallData.tables.push(createTableData("table_124"));

		await cashGameManager.initialize();
		await TickLoopRunner.runTicks();

		expect(cashGameManager.tables.length).toBe(2);

		backendCallData = {};
		backendCallData.tables = [];
		backendCallData.tables.push(createTableData("table_999"));
		backendCallData.tables.push(createTableData("table_888"));
		backendCallData.tables.push(createTableData("table_124"));

		await cashGameManager.reloadTables();
		await TickLoopRunner.runTicks();

		expect(cashGameManager.tables.length).toBe(3);

		cashGameManager.getTableById("table_888").currentGame = "a mock game";

		backendCallData = {};
		backendCallData.tables = [];
		backendCallData.tables.push(createTableData("table_999"));
		backendCallData.tables.push(createTableData("table_124"));

		await cashGameManager.reloadTables();
		await TickLoopRunner.runTicks();

		expect(cashGameManager.tables.length).toBe(3);

		var managerIdleSpy = jasmine.createSpy();
		cashGameManager.on("idle", managerIdleSpy);

		cashGameManager.getTableById("table_888").currentGame = null;
		
		let t=cashGameManager.getTableById("table_888");
		t.emit("idle",t);

		expect(cashGameManager.tables.length).toBe(2);
		expect(managerIdleSpy).toHaveBeenCalled();

		cashGameManager.stop();

		expect(cashGameManager.getTableById("table_124").stopped).toBe(true);

		cashGameManager.close();
	});
});