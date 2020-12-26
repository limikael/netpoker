var ProtoConnection = require("../../../src/proto/ProtoConnection");
var InitMessage = require("../../../src/proto/messages/InitMessage");
var MessagePipeConnection = require("../../utils/MessagePipeConnection");
var EventDispatcher = require("yaed");

describe("ProtoConnection", function() {

	it("can be created", function() {
		var mockConnection = new EventDispatcher();
		var protoConnection = new ProtoConnection(mockConnection);
	});

	it("can send a message", function() {
		var mockConnection = new EventDispatcher();
		mockConnection.send = jasmine.createSpy();
		mockConnection.close = function() {};

		var protoConnection = new ProtoConnection(mockConnection);
		protoConnection.send(new InitMessage("initToken"));

		expect(mockConnection.send).toHaveBeenCalledWith({
			"token": "initToken",
			"type": "init",
			"tableId": null,
			"viewCase": null,
			"tournamentId": null
		});
	});

	it("can receive a message", function(done) {
		var mockConnection = new EventDispatcher();
		mockConnection.close = function() {};

		var protoConnection = new ProtoConnection(mockConnection);

		protoConnection.addMessageHandler(InitMessage.TYPE, function(m) {
			expect(m.getToken()).toEqual("hello");
			done();
		});

		mockConnection.dispatchEvent({
			"type": "message",
			"message": {
				"type": "init",
				"token": "hello"
			}
		});
	});

	it("can be closed", function() {
		var mockConnection = new EventDispatcher();
		mockConnection.close = jasmine.createSpy();
		var protoConnection = new ProtoConnection(mockConnection);

		protoConnection.close();
		expect(mockConnection.close).toHaveBeenCalled();
	});

	it("detects close", function(done) {
		var mockConnection = new EventDispatcher();
		mockConnection.close = function() {};

		var protoConnection = new ProtoConnection(mockConnection);
		protoConnection.on(ProtoConnection.CLOSE, function() {
			done();
		});

		mockConnection.trigger(ProtoConnection.CLOSE);
	});

	it("works with a pipe connection", function() {
		var m = new MessagePipeConnection();
		var n = m.createConnection();
		var p = new ProtoConnection(m);

		var spy1 = jasmine.createSpy();
		m.on("close", spy1)
		var spy2 = jasmine.createSpy();
		p.on("close", spy2);
		n.close();

		expect(spy1).toHaveBeenCalled();
		expect(spy2).toHaveBeenCalled();
	});
});