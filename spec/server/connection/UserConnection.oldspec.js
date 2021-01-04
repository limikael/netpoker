var UserConnection = require("../../../../src/server/connection/UserConnection");
var ProtoConnection = require("../../../../src/proto/ProtoConnection");
var EventDispatcher = require("yaed");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("tinp");

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

		backendCall.resolve({
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

		backendCall.reject();

		u.on(UserConnection.CLOSE, function() {
			expect(mockConnection.close).toHaveBeenCalled();
			done();
		});
	});

	it("creates an anonymous connection on bad or no user data", function(done)  {
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

		backendCall.resolve({});

		u.on(UserConnection.INITIALIZED, function() {
			expect(u.getUser()).toBe(null);
			done();
		});
	});
});