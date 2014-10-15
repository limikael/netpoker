#!/usr/bin/env node

var minimist = require("minimist");
var NetPokerServer = require("./app/NetPokerServer");
var NetPokerServerConfigurator = require("./app/NetPokerServerConfigurator");

function usage() {
	console.log("Usage: netpokerserver <options>");
	console.log("");
	console.log("Clientport and either backend or mock needs to be specified.");
	console.log("");
	console.log("Options:");
	console.log("");
	console.log("  --clientPort <port>      Port where to listen for incoming connections.");
	console.log("  --clientBindAddr <port>  Bind to this address when accepting client connectins.");
	console.log("  --backend <url>          Which backend to connect to.");
	console.log("  --backendKey <key>       Send this in the 'key' parameter when doing backend requests.");
	console.log("  --mock                   Start a mocked server without backend.");
	console.log("  --apiPort <port>         Port where to listen to api requests.");
	console.log("  --apiOnClientPort        Allow api requests on the main client port.");
	console.log("  --apiKey <key>           Require this key for api requests.");
	console.log("  --config <file.yml>      Load config from yaml file.");
	console.log("");

	process.exit(1);
}

var args = minimist(process.argv.slice(2));

var netPokerServer = new NetPokerServer();
var configurator = new NetPokerServerConfigurator(netPokerServer);
configurator.applySettings(args);

if (!netPokerServer.canStart())
	usage();

netPokerServer.run().then(
	function() {
		console.log("* SERVER LISTENING TO: " + netPokerServer.getClientPort());
	}
);