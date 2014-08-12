var MessageServer = require("../../src/js/utils/MessageServer");
var fs = require("fs");

function onServerConnection(e) {
	var connection = e.connection;
	var viewcase = connection.getConnectionParameters().viewcase;
	var f;

	console.log("**** New client connection: " + viewcase);

	try {
		f=fs.readFileSync(__dirname+"/../viewcases/"+viewcase);
	}

	catch (e) {
		console.log("Can't load viewcase: "+viewcase);
		connection.close();
		return;
	}

	var lines=f.toString().split("\n");

	for (var i=0; i<lines.length; i++) {
		var line=lines[i];

		if (line.length) {
			connection.send(JSON.parse(line));
		}
	}
}

var port=2000;
var server = new MessageServer();

server.on(MessageServer.CONNECTION, onServerConnection);
server.listen(port);

console.log("View test server listening on port "+port);