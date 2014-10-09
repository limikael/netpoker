var UserConnection = require("../../../../src/server/connection/UserConnection");
var ProtoConnection = require("../../../../src/proto/ProtoConnection");
var EventDispatcher = require("../../../../src/utils/EventDispatcher");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("../../../../src/utils/Thenable");

describe("UserConnection", function() {
	var mockBackend, mockServices;
	var backendCall;

	beforeEach(function() {
		backendCall = new Thenable();
		mockBackend = {};
		mockBackend.call = function() {
			return backendCall;
		};

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	it("can be created", function() {
		var mockProtoConnection = new EventDispatcher();

		var u = new UserConnection(mockServices, mockProtoConnection);
	});

	it("fetches user info", function(done) {
		var mockConnection = new EventDispatcher();
		var u = new UserConnection(mockServices, mockConnection);

		mockConnection.trigger({
			"type": "message",
			"message": {
				"type": "init",
				"token": "hello"
			}
		});

		backendCall.notifySuccess({
			id: 123,
			name: "hello"
		});

		u.on(UserConnection.INITIALIZED, function() {
			expect(u.getUser().getName()).toEqual("hello");
			done();
		});
	});

	it("closes the connection on failing get user call", function(done)  {
		var mockConnection = new EventDispatcher();
		mockConnection.close = jasmine.createSpy();
		var u = new UserConnection(mockServices, mockConnection);

		mockConnection.trigger({
			"type": "message",
			"message": {
				"type": "init",
				"token": "hello"
			}
		});

		backendCall.notifyError();

		u.on(UserConnection.CLOSE, function() {
			expect(mockConnection.close).toHaveBeenCalled();
			done();
		});
	});

	it("closes the connection on bad user data", function(done)  {
		var mockConnection = new EventDispatcher();
		mockConnection.close = jasmine.createSpy();
		var u = new UserConnection(mockServices, mockConnection);

		mockConnection.trigger({
			"type": "message",
			"message": {
				"type": "init",
				"token": "hello"
			}
		});

		backendCall.notifySuccess({});

		u.on(UserConnection.CLOSE, function() {
			expect(mockConnection.close).toHaveBeenCalled();
			done();
		});
	});
});