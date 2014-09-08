var MessageRequestConnection = require("../../../src/js/utils/MessageRequestConnection");
var connect = require("connect");
var serveStatic = require("serve-static");

describe("MessageRequestConnection", function() {
	it("can load messages", function(done) {
		var app = connect();
		app.use(serveStatic(__dirname + "/../../viewcases"));
		var server = app.listen(9876);

		var m = new MessageRequestConnection();
		m.connect("http://localhost:9876/buy_in_dialog.json");

		var connectSpy = jasmine.createSpy();
		m.on(MessageRequestConnection.CONNECT, connectSpy);

		messages = [];

		m.on(MessageRequestConnection.MESSAGE, function(e) {
			messages.push(e.message);

			if (messages.length == 2) {
				expect(messages[0].type).toBe("showDialog");
				expect(messages[1].type).toBe("stateComplete");
				expect(connectSpy).toHaveBeenCalled();
				server.close();
				done();
			}
		});
	});
});