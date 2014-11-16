var MessageServer = require("../../../src/utils/MessageServer");
var MessageClientConnection = require("../../../src/utils/MessageClientConnection");
var MessageServerConnection = require("../../../src/utils/MessageServerConnection");
var Thenable = require("tinp");

describe("MessageClientConnection", function() {
	it("can connect to a server", function(done) {
		var server = new MessageServer();
		var serverThenable = new Thenable();
		var serverGotMessage = new Thenable();
		var clientGotMessage = new Thenable();
		var serverConnectionClosed = new Thenable();
		var serverConnection, serverThenable;
		var serverReceivedMessage, clientReceivedMessage;

		server.listen(2004);
		server.on(MessageServer.CONNECTION, function(ev) {
			serverConnection = ev.connection;
			serverThenable.resolve();

			serverConnection.on(MessageServerConnection.MESSAGE, function(ev) {
				serverReceivedMessage = ev.message;
				serverGotMessage.resolve();
			});

			serverConnection.on(MessageServerConnection.CLOSE, function(ev) {
				serverConnectionClosed.resolve();
			});
		});

		var client = new MessageClientConnection();

		client.on(MessageClientConnection.MESSAGE, function(ev) {
			clientGotMessage.resolve();
			clientReceivedMessage = ev.message;
		});

		var clientThenable = client.connect("http://localhost:2004");

		Thenable.all(clientThenable, serverThenable).then(
			function() {
				client.send({
					"hello": "from client"
				});
				serverConnection.send({
					"hello": "from server"
				});

				Thenable.all(serverGotMessage, clientGotMessage).then(
					function() {
						expect(serverReceivedMessage).toEqual({
							"hello": "from client"
						});

						expect(clientReceivedMessage).toEqual({
							"hello": "from server"
						});

						client.close();

						serverConnectionClosed.then(
							function() {
								server.close();
								done();
							}
						);
					}
				);
			}
		);
	});

	it("can detect when it is closed", function(done) {
		var server = new MessageServer();
		var serverThenable = new Thenable();

		server.listen(2001);
		server.on(MessageServer.CONNECTION, function(ev) {
			serverConnection = ev.connection;
			serverThenable.resolve();
		});

		var client = new MessageClientConnection();
		var clientThenable = client.connect("http://localhost:2001")

		client.on(MessageClientConnection.CLOSE, function() {
			done();
		});

		Thenable.all(clientThenable, serverThenable).then(
			function() {
				server.close();
				serverConnection.close();
			}
		);
	});
});