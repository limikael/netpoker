var CashGameTable = require("../../../src.js/server/cashgame/CashGameTable");
var User = require("../../../src.js/server/connection/User");
var EventEmitter = require("events");

describe("CashGameTable", function() {
	var mockServices;
	var config;

	beforeEach(function() {
		mockServer = {};

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
		var t = new CashGameTable(mockServer, config);
	});

	it("can validate a config", function() {
		var t = new CashGameTable(mockServer, config);

		var newConfig = {
			minSitInAmount: "10",
			maxSitInAmount: 100,
			stake: 2,
			numseats: 4,
			id: 1,
			currency: "PLY",
			name: "hello"
		};

		t.validateConfig(newConfig);

		expect(newConfig.minSitInAmount).toBe(10);
	});

	it("can be reconfigured", function() {
		var t = new CashGameTable(mockServices, config);

		expect(t.tableSeats[1].isActive()).toBe(false);

		spyOn(t, "performReconfigure").and.callThrough();

		t.reconfigure({
			id: 123,
			numseats: 6,
			currency: "PLY",
			name: "Test Table",
			minSitInAmount: 10,
			maxSitInAmount: 100,
			stake: 2
		});

		expect(t.performReconfigure).toHaveBeenCalled();
		expect(t.tableSeats[1].isActive()).toBe(true);
	});

	it("skips reconfig if it is the same", function() {
		var t = new CashGameTable(mockServices, config);

		spyOn(t, "performReconfigure").and.callThrough();

		t.reconfigure({
			id: 123,
			numseats: 4,
			currency: "PLY",
			name: "Test Table",
			minSitInAmount: 10,
			maxSitInAmount: 100,
			stake: 2
		});

		expect(t.performReconfigure).not.toHaveBeenCalled();
	});

	it("has a parent id that is the same as the id", function() {
		var t = new CashGameTable(mockServer, config);
		expect(t.getStartGameParentId()).toBe(123);
		expect(t.getStartGameFunctionName()).toBe("startCashGame");

		expect(t.getServer()).not.toBe(null);
	});

	it("has some seats", function() {
		var t = new CashGameTable(mockServer, config);

		expect(t.getTableSeats().length).toEqual(10);

		var seats = t.getTableSeats();

		expect(seats[0].isActive()).toBe(false);
		expect(seats[3].isActive()).toBe(true);

		expect(seats[5].getSeatIndex()).toBe(5);
		expect(seats[0].table).toBe(t);
	});

	it("creates and removes spectators for new connections", function() {
		var t = new CashGameTable(mockServer, config);

		var mockConnection = new EventEmitter();
		mockConnection.send = jasmine.createSpy();
		mockConnection.close = jasmine.createSpy();

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

	/*it("can get next seated user in sequence", function() {
		var t = new CashGameTable(mockServices, config);

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
		var t = new CashGameTable(mockServices, config);

		var oldMockConnection = new EventDispatcher();
		oldMockConnection.send = jasmine.createSpy();

		var oldProtoConnection = new ProtoConnection(oldMockConnection);
		var oldUser = new User({
			id: 123,
			name: "hello"
		});

		var mockTableSeatUser = {};
		mockTableSeatUser.isInGame = function() {
			return true;
		};
		mockTableSeatUser.getUser = function() {
			return oldUser;
		};
		mockTableSeatUser.isSitout = function() {
			return false;
		}
		mockTableSeatUser.getChips = function() {
			return 10;
		}
		mockTableSeatUser.isReserved = function() {
			return false;
		}
		mockTableSeatUser.getTableInfoMessage = function() {
			return new TableInfoMessage("hello world");
		}
		mockTableSeatUser.getSettings = function() {
			return null;
		}

		t.getTableSeatBySeatIndex(3).tableSeatUser = mockTableSeatUser;
		t.getTableSeatBySeatIndex(3).setProtoConnection(oldProtoConnection);

		// Now, connect again with an equal user.
		var newMockConnection = new EventDispatcher();
		newMockConnection.send = jasmine.createSpy();

		var newProtoConnection = new ProtoConnection(newMockConnection);
		var newUser = new User({
			id: 123,
			name: "hello"
		});

		t.notifyNewConnection(newProtoConnection, newUser);


		expect(t.getTableSeatBySeatIndex(3).getProtoConnection()).toBe(newProtoConnection);
		expect(t.tableSpectators.length).toBe(1);
		expect(t.tableSpectators[0].getProtoConnection()).toBe(oldProtoConnection);
	});

	it("can create a hand info message", function() {
		var t = new CashGameTable(mockServices, config);

		var mockGame = {};
		mockGame.getId = function() {
			return 123;
		};

		t.currentGame = mockGame;

		var handInfoMessage = t.getHandInfoMessage();
		expect(handInfoMessage).toEqual(jasmine.any(HandInfoMessage));
		expect(handInfoMessage.getText()).toBe("Current Hand: #123\n");

		t.previousHandId = 999;

		handInfoMessage = t.getHandInfoMessage();
		expect(handInfoMessage).toEqual(jasmine.any(HandInfoMessage));
		expect(handInfoMessage.getText()).toBe("Current Hand: #123\nPrevious Hand: #999");
	});*/
})