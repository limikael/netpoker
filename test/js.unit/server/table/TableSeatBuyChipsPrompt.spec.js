var Thenable = require("../../../../src/js/utils/Thenable");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");
var TableSeatBuyChipsPrompt = require("../../../../src/js/server/table/TableSeatBuyChipsPrompt");
var User = require("../../../../src/js/server/user/User");
var Backend = require("../../../../src/js/server/backend/Backend");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var ButtonClickMessage = require("../../../../src/js/proto/messages/ButtonClickMessage");
var ButtonData = require("../../../../src/js/proto/data/ButtonData");
var ProtoConnection = require("../../../../src/js/proto/ProtoConnection");

describe("TableSeatBuyChipsPrompt", function() {
	var user;
	var mockConnection;
	var mockTable;
	var mockBackend;
	var mockServices;
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
		mockBackend.call = function(method) {
			var thenable = new Thenable();

			switch (method) {
				case Backend.GET_USER_BALANCE:
					thenable.notifySuccess({
						balance: 123,
					});
					break;
			}

			return thenable;
		}

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}

		mockTableSeat = new EventDispatcher();
		mockTableSeat.getProtoConnection = function() {
			return mockConnection;
		}
		mockTableSeat.getUser = function() {
			return user;
		}
		mockTableSeat.getTable = function() {
			return mockTable;
		}
		mockTableSeat.getServices = function() {
			return mockServices;
		}
		mockTableSeat.send = jasmine.createSpy();
	});

	it("can cancels itself on connection close", function(done) {
		var cancelSpy = jasmine.createSpy();

		var prompt = new TableSeatBuyChipsPrompt(mockTableSeat);
		prompt.on(TableSeatBuyChipsPrompt.CANCEL, cancelSpy);
		prompt.ask();

		AsyncSequence.run(
			function(next) {
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockTableSeat.send).toHaveBeenCalled();
				var dialogMessage = mockTableSeat.send.calls[0].args[0];
				expect(dialogMessage.buttons.length).toBe(2);

				var b = new ButtonClickMessage(ButtonData.CANCEL);

				//mockTableSeat.trigger(ButtonClickMessage.TYPE, b);
				mockTableSeat.trigger(ProtoConnection.CLOSE);
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockTableSeat.listenerMap).toEqual({});
				expect(cancelSpy).toHaveBeenCalled();
				next();
			}
		).then(done);
	});

	it("can cancels itself on cancel", function(done) {
		var cancelSpy = jasmine.createSpy();

		var prompt = new TableSeatBuyChipsPrompt(mockTableSeat);
		prompt.on(TableSeatBuyChipsPrompt.CANCEL, cancelSpy);
		prompt.ask();

		AsyncSequence.run(
			function(next) {
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockTableSeat.send).toHaveBeenCalled();
				var dialogMessage = mockTableSeat.send.calls[0].args[0];
				expect(dialogMessage.buttons.length).toBe(2);

				var b = new ButtonClickMessage(ButtonData.CANCEL);

				mockTableSeat.trigger(ButtonClickMessage.TYPE, b);
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockTableSeat.listenerMap).toEqual({});
				expect(cancelSpy).toHaveBeenCalled();
				next();
			}
		).then(done);
	});

	it("can be completed", function(done) {
		spyOn(mockBackend, "call").andCallThrough();

		var completeSpy = jasmine.createSpy();
		var cancelSpy = jasmine.createSpy();

		var prompt = new TableSeatBuyChipsPrompt(mockTableSeat);
		prompt.on(TableSeatBuyChipsPrompt.COMPLETE, completeSpy);
		prompt.on(TableSeatBuyChipsPrompt.CANCEL, cancelSpy);
		prompt.ask();

		AsyncSequence.run(
			function(next) {
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockBackend.call.calls.length).toBe(1);

				expect(mockTableSeat.send).toHaveBeenCalled();
				var dialogMessage = mockTableSeat.send.calls[0].args[0];
				expect(dialogMessage.buttons.length).toBe(2);

				var b = new ButtonClickMessage(ButtonData.SIT_IN);

				mockTableSeat.trigger(ButtonClickMessage.TYPE, b);
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockBackend.call.calls.length).toBe(2);

				expect(mockTableSeat.listenerMap).toEqual({});
				expect(cancelSpy).not.toHaveBeenCalled();

				next();
			}
		).then(done);
	});

	it("cancels itself if sit in call fails", function(done) {
		spyOn(mockBackend, "call").andCallThrough();

		var completeSpy = jasmine.createSpy();
		var cancelSpy = jasmine.createSpy();

		var prompt = new TableSeatBuyChipsPrompt(mockTableSeat);
		prompt.on(TableSeatBuyChipsPrompt.COMPLETE, completeSpy);
		prompt.on(TableSeatBuyChipsPrompt.CANCEL, cancelSpy);
		prompt.ask();

		AsyncSequence.run(
			function(next) {
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockBackend.call.calls.length).toBe(1);

				mockBackend.call = function(method) {
					var thenable = new Thenable();

					thenable.notifyError("something wrong");

					return thenable;
				};

				spyOn(mockBackend, "call").andCallThrough();

				expect(mockTableSeat.send).toHaveBeenCalled();
				var dialogMessage = mockTableSeat.send.calls[0].args[0];
				expect(dialogMessage.buttons.length).toBe(2);

				var b = new ButtonClickMessage(ButtonData.SIT_IN);

				mockTableSeat.trigger(ButtonClickMessage.TYPE, b);
				setTimeout(next, 10);
			},

			function(next) {
				expect(mockBackend.call.calls.length).toBe(1);

				expect(mockTableSeat.listenerMap).toEqual({});
				expect(cancelSpy).toHaveBeenCalled();
				expect(completeSpy).not.toHaveBeenCalled();

				next();
			}
		).then(done);
	});

	it("fails gracefully", function(done) {
		mockBackend.call = function(method) {
			var thenable = new Thenable();

			thenable.notifyError("something wrong");

			return thenable;
		};

		var cancelSpy = jasmine.createSpy();

		var prompt = new TableSeatBuyChipsPrompt(mockTableSeat);
		prompt.ask();
		prompt.on(TableSeatBuyChipsPrompt.CANCEL, cancelSpy);

		setTimeout(function() {
			expect(mockTableSeat.send).toHaveBeenCalled();
			expect(cancelSpy).toHaveBeenCalled();
			done();
		}, 10);
	})
});