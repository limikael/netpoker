var Thenable = require("../../../../src/utils/Thenable");
var CashGameManager = require("../../../../src/server/cashgame/CashGameManager");
var CashGameTable = require("../../../../src/server/cashgame/CashGameTable");
var Backend = require("../../../../src/server/backend/Backend");
var AsyncSequence = require("../../../../src/utils/AsyncSequence");
var TickLoopRunner = require("../../../utils/TickLoopRunner");

describe("CashGameManager", function() {
	var mockBackend, mockServices;
	var backendCallData;

	beforeEach(function() {
		backendCallData = null;

		mockBackend = {};
		mockBackend.call = function() {
			var thenable = new Thenable();

			if (backendCallData)
				thenable.notifySuccess(backendCallData);

			else
				thenable.notifyError();

			return thenable;
		};

		spyOn(mockBackend, "call").and.callThrough();

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	it("fetches table info on initialization", function(done) {
		var cashGameManager = new CashGameManager(mockServices);

		cashGameManager.on(CashGameManager.INITIALIZED, function() {
			expect(cashGameManager.tables.length).toBe(2);

			done();
		});

		backendCallData = {
			"tables": [{
				id: 123,
				numseats: 10,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}, {
				id: 124,
				numseats: 4,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}]
		};

		cashGameManager.initialize();

		expect(mockBackend.call).toHaveBeenCalledWith("getCashGameTableList");
	});

	it("can find a table by id", function(done) {
		var cashGameManager = new CashGameManager(mockServices);

		cashGameManager.on(CashGameManager.INITIALIZED, function() {
			var table = cashGameManager.getTableById("table_123");

			expect(table).not.toEqual(null);
			expect(table.getId()).toEqual("table_123");

			done();
		});

		backendCallData = {
			"tables": [{
				"id": "table_123",
				numseats: 10,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}]
		};

		cashGameManager.initialize();
	});

	function createTableData(tableId) {
		return {
			"id": tableId,
			numseats: 10,
			currency: "PLY",
			name: "Test Table",
			minSitInAmount: 10,
			maxSitInAmount: 100,
			stake: 2
		};
	};

	it("can reload table info", function(done) {
		var cashGameManager = new CashGameManager(mockServices);
		var initializedSpy = jasmine.createSpy();

		AsyncSequence.run(
			function(next) {
				backendCallData = {};
				backendCallData.tables = [];
				backendCallData.tables.push(createTableData("table_123"));
				backendCallData.tables.push(createTableData("table_124"));

				cashGameManager.on(CashGameManager.INITIALIZED, initializedSpy);
				cashGameManager.initialize();

				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(initializedSpy).toHaveBeenCalled();
				expect(cashGameManager.tables.length).toBe(2);

				backendCallData = {};
				backendCallData.tables = [];
				backendCallData.tables.push(createTableData("table_999"));
				backendCallData.tables.push(createTableData("table_888"));
				backendCallData.tables.push(createTableData("table_124"));

				cashGameManager.reloadTables();
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(cashGameManager.tables.length).toBe(3);

				cashGameManager.getTableById("table_888").currentGame = "a mock game";

				backendCallData = {};
				backendCallData.tables = [];
				backendCallData.tables.push(createTableData("table_999"));
				backendCallData.tables.push(createTableData("table_124"));

				cashGameManager.reloadTables();
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(cashGameManager.tables.length).toBe(3);

				var managerIdleSpy = jasmine.createSpy();
				cashGameManager.on(CashGameManager.IDLE, managerIdleSpy);

				cashGameManager.getTableById("table_888").currentGame = null;
				cashGameManager.getTableById("table_888").trigger(CashGameTable.IDLE);

				expect(cashGameManager.tables.length).toBe(2);
				expect(managerIdleSpy).toHaveBeenCalled();

				cashGameManager.stop();

				expect(cashGameManager.getTableById("table_124").stopped).toBe(true);

				cashGameManager.close();
				next();
			}
		).then(done);
	});
});