var Thenable = require("../../../../src/js/utils/Thenable");
var TableManager = require("../../../../src/js/server/table/TableManager");
var Backend = require("../../../../src/js/server/backend/Backend");

describe("TableManager", function() {
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

		spyOn(mockBackend, "call").andCallThrough();

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	it("fetches table info on initialization", function(done) {
		var tableManager = new TableManager(mockServices);

		tableManager.on(TableManager.INITIALIZED, function() {
			expect(tableManager.tables.length).toBe(2);

			done();
		});

		backendCallData = {
			"tables": [{
				"numseats": 10
			}, {
				"numseats": 4
			}]
		};

		tableManager.initialize();

		expect(mockBackend.call).toHaveBeenCalledWith("table/getList");
	});

	it("can find a table by id", function(done) {
		var tableManager = new TableManager(mockServices);

		tableManager.on(TableManager.INITIALIZED, function() {
			var table=tableManager.getTableById("table_123");

			expect(table).not.toEqual(null);
			expect(table.getId()).toEqual("table_123");

			done();
		});

		backendCallData = {
			"tables": [{
				"id": "table_123",
				"numseats": 4
			}]
		};

		tableManager.initialize();
	});
});