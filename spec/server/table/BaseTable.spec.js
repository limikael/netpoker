var BaseTable = require("../../../src.js/server/table/BaseTable");

describe("BaseTable", function() {
	var MyTable;

	beforeEach(function() {
		class MySeat {
			constructor(table, seatIndex) {
				this.seatIndex=seatIndex;
				this.connection="connection for " + seatIndex;
			}

			getConnection() {
				return this.connection;
			}
		}

		class MyTableClass extends BaseTable {
			constructor() {
				super(MySeat);
			}
		}

		MyTable=MyTableClass;
	});

	it("can get a tableSeat by connection", function() {
		var table = new MyTable();

		expect(table.tableSeats[0].seatIndex).toBe(0);
		expect(table.tableSeats[1].seatIndex).toBe(1);

		var c = table.tableSeats[7].getConnection();

		//console.log(table.tableSeats[5].getProtoConnection());

		expect(table.getTableSeatByConnection(c)).toBe(table.tableSeats[7]);
	});
});