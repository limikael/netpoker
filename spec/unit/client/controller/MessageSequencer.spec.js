var MessageSequencer = require("../../../../src/client/controller/MessageSequencer");
var StateCompleteMessage = require("../../../../src/proto/messages/StateCompleteMessage");
var SeatInfoMessage = require("../../../../src/proto/messages/SeatInfoMessage");
var EventDispatcher = require("yaed");
var SeatInfoMessage = require("../../../../src/proto/messages/SeatInfoMessage");

describe("MessageSequencer", function() {
	it("sequences messages", function() {
		var spy = jasmine.createSpy();

		var s = new MessageSequencer();
		s.addMessageHandler(StateCompleteMessage.TYPE, spy);

		var message = new StateCompleteMessage();
		message.type = StateCompleteMessage.TYPE;

		s.enqueue(message);
		expect(spy).toHaveBeenCalled();

		s.enqueue(message);
		expect(spy.calls.count()).toBe(2);
	});

	it("can be told to wait until processing next message", function(done) {
		var e = new EventDispatcher();
		var s = new MessageSequencer();

		var spy = jasmine.createSpy();

		function handler() {
			spy();
			s.waitFor(e, "event");
		}

		var spy2 = jasmine.createSpy();

		s.addMessageHandler(StateCompleteMessage.TYPE, handler);
		s.addMessageHandler(SeatInfoMessage.TYPE, spy2);

		var message;

		message = new StateCompleteMessage();
		message.type = StateCompleteMessage.TYPE;
		s.enqueue(message);

		message = new SeatInfoMessage();
		message.type = SeatInfoMessage.TYPE;
		s.enqueue(message);

		expect(spy).toHaveBeenCalled();
		expect(spy2).not.toHaveBeenCalled();

		s.messageDispatcher.off(SeatInfoMessage.TYPE, spy2);

		spy2 = function() {
			console.log("done!!!");
			done();
		}

		s.addMessageHandler(SeatInfoMessage.TYPE, spy2);

		e.trigger("event");

		//		expect(spy2).toHaveBeenCalled();
	});
});