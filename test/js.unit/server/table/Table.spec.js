var Table = require("../../../../src/js/server/table/Table");
var User = require("../../../../src/js/server/user/User");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");
var ProtoConnection = require("../../../../src/js/proto/ProtoConnection");

describe("Table", function() {
	var mockServices;
	var config;

	beforeEach(function() {
		mockServices = {};

		config = {
			id: 123,
			numseats: 4,
			currency: "PLY",
			name: "Test Table",
			minSitInAmount: 10,
			maxSitInAmount: 100,
			stake: 2
		};
	});

	it("can be created", function() {
		var t = new Table(mockServices, config);
	});

	it("has a parent id that is the same as the id", function() {
		var t = new Table(mockServices, config);
		expect(t.getStartGameParentId()).toBe(123);
		expect(t.getStartGameFunctionName()).toBe("game/startForTable");

		expect(t.getServices()).not.toBe(null);
	});

	it("has some seats", function() {
		var t = new Table(mockServices, config);

		expect(t.getTableSeats().length).toEqual(10);

		var seats = t.getTableSeats();

		expect(seats[0].isActive()).toBe(false);
		expect(seats[3].isActive()).toBe(true);

		expect(seats[5].getSeatIndex()).toBe(5);
		expect(seats[0].table).toBe(t);
	});

	it("creates and removes spectators for new connections", function() {
		var t = new Table(mockServices, config);

		var mockConnection = new EventDispatcher();
		mockConnection.send = jasmine.createSpy();

		var protoConnection = new ProtoConnection(mockConnection);
		var user = new User({
			id: 123,
			name: "hello"
		});

		t.notifyNewConnection(protoConnection, user);
		expect(mockConnection.send).toHaveBeenCalled();
		expect(t.tableSpectators.length).toBe(1);

		var tableSpectator = t.tableSpectators[0];
		expect(tableSpectator.listenerMap).not.toEqual({});

		mockConnection.trigger(ProtoConnection.CLOSE);
		expect(t.tableSpectators.length).toBe(0);
		expect(mockConnection.listenerMap).toEqual({});
		expect(tableSpectator.listenerMap).toEqual({});
	});

	it("can get next seated user in sequence", function() {
		var t = new Table(mockServices, config);

		var mockTableSeatUser = {};
		mockTableSeatUser.isInGame = function() {
			return true;
		}

		expect(t.getNumInGame()).toBe(0);
		expect(t.getNextSeatIndexInGame(3)).toBe(-1);

		t.getTableSeatBySeatIndex(3).tableSeatUser = mockTableSeatUser;
		t.getTableSeatBySeatIndex(5).tableSeatUser = mockTableSeatUser;
		t.getTableSeatBySeatIndex(9).tableSeatUser = mockTableSeatUser;

		expect(t.getNumInGame()).toBe(3);

		expect(t.getNextSeatIndexInGame(3)).toBe(5);
		expect(t.getNextSeatIndexInGame(4)).toBe(5);
		expect(t.getNextSeatIndexInGame(5)).toBe(9);
		expect(t.getNextSeatIndexInGame(9)).toBe(3);

		expect(t.getDealerButtonIndex()).toBe(-1);
		t.advanceDealer();
		expect(t.getDealerButtonIndex()).toBe(3);
		t.advanceDealer();
		expect(t.getDealerButtonIndex()).toBe(5);
		t.advanceDealer();
		expect(t.getDealerButtonIndex()).toBe(9);
		t.advanceDealer();
		expect(t.getDealerButtonIndex()).toBe(3);
	});

	it("reestablishes user connections", function() {
		var t = new Table(mockServices, config);

		var mockConnection = new EventDispatcher();
		mockConnection.send = jasmine.createSpy();

		var protoConnection = new ProtoConnection(mockConnection);
		var user = new User({
			id: 123,
			name: "hello"
		});

		var mockTableSeatUser = {};
		mockTableSeatUser.isInGame = function() {
			return true;
		}

		t.getTableSeatBySeatIndex(3).tableSeatUser = mockTableSeatUser;

		// work on this!!!
		//t.notifyNewConnection(mockConnection, user);
	});
})