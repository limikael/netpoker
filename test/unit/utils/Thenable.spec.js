Thenable = require("../../../src/utils/Thenable");

describe("Thenable", function() {
	it("can be used for asynchronous operations", function(done) {
		var successSpy = jasmine.createSpy("success");

		var t = new Thenable();
		t.then(successSpy);
		t.notifySuccess();

		expect(successSpy).not.toHaveBeenCalled();

		setTimeout(function() {
			expect(successSpy).toHaveBeenCalled();
			done();
		}, 1);
	});

	it("then can be called after notify", function(done) {
		var successSpy = jasmine.createSpy("success");

		var t = new Thenable();
		t.notifySuccess();
		t.then(successSpy);

		expect(successSpy).not.toHaveBeenCalled();

		setTimeout(function() {
			expect(successSpy).toHaveBeenCalled();
			done();
		}, 1);
	});

	it("can be notified with a parameter", function(done) {
		var successSpy = jasmine.createSpy("success");

		var t = new Thenable();
		t.then(successSpy);
		t.notifySuccess("hello");

		expect(successSpy).not.toHaveBeenCalled();

		setTimeout(function() {
			expect(successSpy).toHaveBeenCalledWith("hello");
			done();
		}, 1);
	});

	it("can be notified of an error", function(done) {
		var errorSpy = jasmine.createSpy("error");

		var t = new Thenable();
		t.then(null, errorSpy);
		t.notifyError("hello");

		expect(errorSpy).not.toHaveBeenCalled();

		setTimeout(function() {
			expect(errorSpy).toHaveBeenCalledWith("hello");
			done();
		}, 1);
	});

	it("can be chained", function(done) {
		var spy1 = jasmine.createSpy("spy one");
		var spy2 = jasmine.createSpy("spy two");

		var t = new Thenable();
		t.then(spy1).then(spy2);
		t.notifySuccess("hello");

		expect(spy1).not.toHaveBeenCalled();
		expect(spy2).not.toHaveBeenCalled();

		setTimeout(function() {
			expect(spy1).toHaveBeenCalledWith("hello");
			expect(spy2).toHaveBeenCalledWith("hello");
			done();
		}, 1);
	});

	it("can also act as an event dispatcher", function() {
		var spy = jasmine.createSpy("listener");
		var t = new Thenable();

		t.on("test", spy);
		t.trigger("test");

		expect(spy).toHaveBeenCalled();
	});
});