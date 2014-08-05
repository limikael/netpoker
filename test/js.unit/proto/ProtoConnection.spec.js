var ProtoConnection = require("../../../src/js/proto/ProtoConnection");
var InitMessage = require("../../../src/js/proto/messages/InitMessage");
var EventDispatcher = require("../../../src/js/utils/EventDispatcher");

describe("ProtoConnection", function() {

	it("can be created", function() {
		var mockConnection = new EventDispatcher();
		var protoConnection = new ProtoConnection(mockConnection);
	});

	it("can send a message", function() {
		var mockConnection = new EventDispatcher();
		mockConnection.send = jasmine.createSpy();

		var protoConnection = new ProtoConnection(mockConnection);
		protoConnection.send(new InitMessage("initToken"));

		expect(mockConnection.send).toHaveBeenCalledWith({
			"token": "initToken",
			"type": "init"
		});
	});

	it("can receive a message", function(done) {
		var mockConnection = new EventDispatcher();

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
});