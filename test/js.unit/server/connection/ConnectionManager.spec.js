var ConnectionManager = require("../../../../src/js/server/connection/ConnectionManager");
var UserConnection = require("../../../../src/js/server/connection/UserConnection");
var ProtoConnection = require("../../../../src/js/proto/ProtoConnection");
var MessageClientConnection = require("../../../../src/js/utils/MessageClientConnection");
var EventDispatcher = require("../../../../src/js/utils/EventDispatcher");
var Backend = require("../../../../src/js/server/backend/Backend");
var Thenable = require("../../../../src/js/utils/Thenable");

describe("ConnectionManager", function() {
	it("can accept connections", function(done) {
		var backendCall = new Thenable();

		Backend.call = function() {
			backendCall.notifySuccess({
				id: 123,
				name: "hello"
			});

			return backendCall;
		}

		var connectionManager = new ConnectionManager();
		connectionManager.listen(2002);

		connectionManager.on(ConnectionManager.CONNECTION, function(e) {
			expect(e.connection.getUser().getName()).toEqual("hello");
			done();
		});

		var clientConnection = new MessageClientConnection();
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
		var backendCall = new Thenable();

		Backend.call = function() {
			backendCall.notifyError();

			return backendCall;
		}

		var connectionManager = new ConnectionManager();
		connectionManager.listen(2003);

		var originalFunction = connectionManager.onUserConnectionClose;
		connectionManager.onUserConnectionClose = function(e) {
			originalFunction.call(this, e);

			expect(e.target.listenerMap).toEqual({});
			done();
		}

		var clientConnection = new MessageClientConnection();
		clientConnection.connect("http://localhost:2003").then(
			function() {
				console.log("sending some..");
				clientConnection.send({
					"type": "init",
					"token": "hello"
				});
			}
		);
	})

});