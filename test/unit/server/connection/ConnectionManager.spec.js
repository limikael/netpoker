var ConnectionManager = require("../../../../src/server/connection/ConnectionManager");
var UserConnection = require("../../../../src/server/connection/UserConnection");
var ProtoConnection = require("../../../../src/proto/ProtoConnection");
var MessageClientConnection = require("../../../../src/utils/MessageClientConnection");
var EventDispatcher = require("yaed");
var Backend = require("../../../../src/server/backend/Backend");
var Thenable = require("tinp");

describe("ConnectionManager", function() {
	var mockBackend, mockServices;
	var backendCallData;

	beforeEach(function() {
		backendCallData=null;

		mockBackend = {};
		mockBackend.call = function() {
			var thenable = new Thenable();

			if (backendCallData)
				thenable.resolve(backendCallData);

			else
				thenable.reject();

			return thenable;
		};

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	it("can accept connections", function(done) {
		backendCallData={
			id: 123,
			name: "hello"
		};

		var connectionManager = new ConnectionManager(mockServices);
		connectionManager.listen(2002);

		var clientConnection = new MessageClientConnection();

		connectionManager.on(ConnectionManager.CONNECTION, function(e) {
			expect(e.getUser().getName()).toEqual("hello");
			connectionManager.close();
			clientConnection.close();
			done();
		});

		clientConnection.connect("http://localhost:2002").then(
			function() {
				console.log("sending some..");
				clientConnection.send({
					"type": "init",
					"token": "hello"
				});
			}
		);
	});

	it("ignores failing connections", function(done) {
		backendCallData=null;

		var connectionManager = new ConnectionManager(mockServices);
		connectionManager.listen(2003);

		var originalFunction = connectionManager.onUserConnectionClose;

		var clientConnection = new MessageClientConnection();

		connectionManager.onUserConnectionClose = function(e) {
			originalFunction.call(this, e);

			expect(e.target.listenerMap).toEqual({});
			connectionManager.close();
			clientConnection.close();
			done();
		}

		clientConnection.connect("http://localhost:2003").then(
			function() {
				console.log("sending some..");
				clientConnection.send({
					"type": "init",
					"token": "hello"
				});
			}
		);
	});
});