#!/usr/bin/env node

var minimist = require("minimist");
var NetPokerServer = require("./app/NetPokerServer");
var MockBackendServer = require("./mock/MockBackendServer");
var MockWebRequestHandler = require("./mock/MockWebRequestHandler");

function usage() {
	console.log("Usage: netpokerserver <options>");
	console.log("");
	console.log("Clientport and either backend or mock needs to be specified.");
	console.log("");
	console.log("Options:");
	console.log("");
	console.log("  --clientPort <port>  Port where to listen for incoming connections.");
	console.log("  --backend <url>      Which backend to connect to.");
	console.log("  --mock               Start a mocked server without backend.");
	console.log("  --apiPort <port>     Port where to listen to api requests.");
	console.log("  --apiOnClientPort    Allow api requests on the main client port.");
	console.log("  --apiKey <key>       Require this key for api requests.")
	console.log("");

	process.exit(1);
}

var args = minimist(process.argv.slice(2));

var netPokerServer = new NetPokerServer();

if (args["backend"]) {
	netPokerServer.setBackend(args["backend"]);
} else if (args["mock"]) {
	netPokerServer.serveViewCases(__dirname + "/../../res/viewcases");
	netPokerServer.setBackend(new MockBackendServer());
	netPokerServer.setWebRequestHandler(new MockWebRequestHandler());
} else {
	usage();
}

if (!args["clientPort"])
	usage();

netPokerServer.setClientPort(args["clientPort"]);

netPokerServer.run().then(
	function() {
		console.log("==== SERVER LISTENING ON PORT: " + args["clientPort"] + " ====");
	}
);