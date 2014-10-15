var BaseTable = require("../../../../src/server/table/BaseTable");
var FunctionUtil = require("../../../../src/utils/FunctionUtil");

describe("BaseTable", function() {
	var MyTable;

	beforeEach(function() {
		MyTable = function() {
			this.tableSeats = [];

			for (var i = 0; i < 10; i++) {
				var mockConnection = "connection for " + i;

				var mockTableSeat = {};
				mockTableSeat.seatIndex = i;
				mockTableSeat.protoConnection = mockConnection;

				mockTableSeat.getProtoConnection = function() {
					return this.protoConnection;
				}

				this.tableSeats.push(mockTableSeat);
			}

			BaseTable.call(this);
		}

		FunctionUtil.extend(MyTable, BaseTable);
	});

	it("can get a tableSeat by connection", function() {
		var table = new MyTable();

		expect(table.tableSeats[0].seatIndex).toBe(0);
		expect(table.tableSeats[1].seatIndex).toBe(1);

		var c = table.tableSeats[7].getProtoConnection();

		//console.log(table.tableSeats[5].getProtoConnection());

		expect(table.getTableSeatByProtoConnection(c)).toBe(table.tableSeats[7]);
	});
});