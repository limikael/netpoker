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
			maxSitInAmount: 100
		};
	});

	it("can be created", function() {
		var t = new Table(mockServices, config);
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
})