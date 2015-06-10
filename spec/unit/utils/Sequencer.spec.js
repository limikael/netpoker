var Sequencer = require("../../../src/utils/Sequencer");
var EventDispatcher = require("yaed");

describe("Sequencer", function() {
	it("sequences stuff", function() {
		var s = new Sequencer();
		var item1=new EventDispatcher();
		var item2=new EventDispatcher();

		var item1start=jasmine.createSpy();
		var item2start=jasmine.createSpy();
		var complete=jasmine.createSpy();

		item1.on(Sequencer.START,item1start);
		item2.on(Sequencer.START,item2start);
		s.on(Sequencer.COMPLETE,complete);

		s.enqueue(item1);
		s.enqueue(item2);

		expect(item1start).toHaveBeenCalled();
		expect(item2start).not.toHaveBeenCalled();

		item1.trigger(Sequencer.COMPLETE);

		expect(item2start).toHaveBeenCalled();
		expect(complete).not.toHaveBeenCalled();

		item2.trigger(Sequencer.COMPLETE);

		expect(complete).toHaveBeenCalled();
	});
});