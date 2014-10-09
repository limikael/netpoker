var Thenable = require("../../../../src/utils/Thenable");
var CashGameManager = require("../../../../src/server/cashgame/CashGameManager");
var Backend = require("../../../../src/server/backend/Backend");

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

		expect(mockBackend.call).toHaveBeenCalledWith("table/getList");
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
});