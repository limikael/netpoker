var EventDispatcher = require("../../../src/utils/EventDispatcher");

describe("EventDispatcher", function() {
	it("can dispatch events", function() {
		var d = new EventDispatcher();

		var l = jasmine.createSpy("listener");
		d.addEventListener("test", l);

		d.dispatchEvent("test");
		expect(l).toHaveBeenCalled();
	});

	it("can remove listeners", function() {
		var d = new EventDispatcher();

		var l = jasmine.createSpy("listener");
		d.addEventListener("test", l);
		d.dispatchEvent("test");
		d.removeEventListener("test", l);
		d.dispatchEvent("test");

		expect(l.calls.count()).toBe(1);
	});

	it("passes along the event object", function() {
		var d = new EventDispatcher();

		var l = jasmine.createSpy("listener");
		d.addEventListener("test", l);

		var ev = {
			type: "test",
			param: 5
		};

		d.dispatchEvent(ev);

		expect(l).toHaveBeenCalledWith(ev);
	});

	it("has on/off aliases", function() {
		var d = new EventDispatcher();

		var l = jasmine.createSpy("listener");
		d.on("test", l);
		d.trigger("test");
		d.off("test", l);
		d.trigger("test");

		expect(l.calls.count()).toBe(1);
	});

	it("is tolerant if the same listener is added twice", function() {
		var d = new EventDispatcher();
		var spy = jasmine.createSpy();

		d.on("test",spy);
		d.on("test",spy);

		d.trigger("test");

		expect(spy.calls.count()).toBe(1);
	})
});