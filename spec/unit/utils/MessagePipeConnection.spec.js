var MessagePipeConnection = require("../../utils/MessagePipeConnection");
var TickLoopRunner = require("../../utils/TickLoopRunner");
var AsyncSequence = require("../../../src/utils/AsyncSequence");

describe("MessagePipeConnection", function() {

	it("can be send and recv", function(done) {
		var c1 = new MessagePipeConnection();
		var c2 = c1.createConnection();

		var recv;

		function listener(m) {
			recv = m.message;
		}

		c2.on(MessagePipeConnection.MESSAGE, listener);

		var closeSpy = jasmine.createSpy();

		AsyncSequence.run(
			function(next) {
				c1.send({
					hello: "world"
				});
				TickLoopRunner.runTicks().then(next);
			},

			function(next) {
				expect(recv).toEqual({
					hello: "world"
				});

				c2.on(MessagePipeConnection.CLOSE, closeSpy);

				c1.close();
				expect(closeSpy).toHaveBeenCalled();

				done();
			}
		);
	});

	it("can detect close", function() {
		var c1 = new MessagePipeConnection();
		var c2 = c1.createConnection();

		var closeSpy = jasmine.createSpy();
		c2.on("close",closeSpy);
		c1.close();

		expect(closeSpy).toHaveBeenCalled();
	});
});