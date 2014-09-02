 var MessagePipeConnection = require("../../utils/MessagePipeConnection");

 describe("MessagePipeConnection", function() {

 	it("can be send and recv", function() {
 		c1 = new MessagePipeConnection();
 		c2 = c1.createConnection();

 		var recv;

 		function listener(m) {
 			recv = m.message;
 		}

 		c2.on(MessagePipeConnection.MESSAGE, listener);
 		c1.send({
 			hello: "world"
 		});

 		expect(recv).toEqual({
 			hello: "world"
 		});

 		var closeSpy = createSpy();
 		c2.on(MessagePipeConnection.CLOSE, closeSpy);

 		c1.close();
 		expect(closeSpy).toHaveBeenCalled();
 	});
 });