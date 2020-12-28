const EventQueue=require("../../src.js/utils/EventQueue");
const EventEmitter=require("events");

describe("EventQueue",()=>{
	it("can emit",()=>{
		let queue=new EventQueue();

		let o={
			onTest: (a,b)=>{
				expect(a).toEqual(1);
				expect(b).toEqual(2);
			}
		};

		spyOn(o,"onTest").and.callThrough();

		queue.on("test",o.onTest);
		queue.enqueue("test",1,2);

		expect(()=>{
			queue.emit("hello");
		}).toThrow();

		expect(o.onTest).toHaveBeenCalled();
	});

	it("can enqueue",()=>{
		let queue=new EventQueue();
		let o=new EventEmitter();

		let listener1=jasmine.createSpy().and.callFake(()=>{
			queue.waitFor(o,"event");
		});
		let listener2=jasmine.createSpy();

		queue.on("test1",listener1);
		queue.on("test2",listener2);

		queue.enqueue("test1");
		queue.enqueue("test1");
		queue.enqueue("test2");

		expect(listener1).toHaveBeenCalled();
		expect(listener2).not.toHaveBeenCalled();

		o.emit("event");
		o.emit("event");
		expect(listener2).toHaveBeenCalled();
	});
});