var NetPokerServer = require("../../../../src/js/server/app/NetPokerServer");
var Thenable = require("../../../../src/js/utils/Thenable");
var Backend = require("../../../../src/js/server/backend/Backend");
var AsyncSequence = require("../../../../src/js/utils/AsyncSequence");
var MessageClientConnection = require("../../../../src/js/utils/MessageClientConnection");
var ProtoConnection = require("../../../../src/js/proto/ProtoConnection");
var InitMessage = require("../../../../src/js/proto/messages/InitMessage")

describe("NetPokerServer - viewcase", function() {
	var mockBackend;

	beforeEach(function() {
		mockBackend = {};

		mockBackend.call = function(method, params) {
			console.log("backend call: " + method);
			var thenable = new Thenable();

			switch (method) {
				case Backend.GET_TABLE_LIST:
					thenable.notifySuccess({
						tables: [{
							id: 123,
							numseats: 4,
							currency: "PLY",
							name: "Test Table",
							minSitInAmount: 10,
							maxSitInAmount: 100,
							stake: 2
						}]
					});
					break;

				default:
					thenable.notifyError();
					break;
			}

			return thenable;
		}
	});

	it("case server up a viewcase", function(done) {
		var netPokerServer = new NetPokerServer();
		var connection;
		var protoConnection;

		AsyncSequence.run(
			function(next) {
				netPokerServer.setBackend(mockBackend);
				netPokerServer.setListenPort(2004);
				netPokerServer.serveViewCases(__dirname + "/../../../viewcases");
				netPokerServer.run().then(next);
			},
			function(next) {
				connection = new MessageClientConnection();
				protoConnection = new ProtoConnection(connection);
				connection.connect("ws://localhost:2004/").then(next);
			},
			function(next) {
				var initMessage = new InitMessage();
				initMessage.setViewCase("cards_players_and_buttons");
				protoConnection.send(initMessage);
				protoConnection.on(ProtoConnection.MESSAGE,function(e) {
					console.log("got message: "+e.message.type);
					netPokerServer.close();
					protoConnection.close();
					next();
				});
			}
		).then(done);
	});
});