var MessageServer = require("../../../src/js/utils/MessageServer");
var MessageClientConnection = require("../../../src/js/utils/MessageClientConnection");
var MessageServerConnection = require("../../../src/js/utils/MessageServerConnection");
var Thenable = require("../../../src/js/utils/Thenable");
var ThenableBarrier = require("../../../src/js/utils/ThenableBarrier");

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
			serverThenable.notifySuccess();

			serverConnection.on(MessageServerConnection.MESSAGE, function(ev) {
				serverReceivedMessage = ev.message;
				serverGotMessage.notifySuccess();
			});

			serverConnection.on(MessageServerConnection.CLOSE, function(ev) {
				serverConnectionClosed.notifySuccess();
			});
		});

		var client = new MessageClientConnection();

		client.on(MessageClientConnection.MESSAGE, function(ev) {
			clientGotMessage.notifySuccess();
			clientReceivedMessage = ev.message;
		});

		var clientThenable = client.connect("http://localhost:2004");

		ThenableBarrier.wait(clientThenable, serverThenable).then(
			function() {
				client.send({
					"hello": "from client"
				});
				serverConnection.send({
					"hello": "from server"
				});

				ThenableBarrier.wait(serverGotMessage, clientGotMessage).then(
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
		var serverThenable=new Thenable();

		server.listen(2001);
		server.on(MessageServer.CONNECTION, function(ev) {
			serverConnection = ev.connection;
			serverThenable.notifySuccess();
		});

		var client=new MessageClientConnection();
		var clientThenable=client.connect("http://localhost:2001")

		client.on(MessageClientConnection.CLOSE,function() {
			done();
		});

		ThenableBarrier.wait(clientThenable, serverThenable).then(
			function() {
				server.close();
				serverConnection.close();
			}
		);
	});
});