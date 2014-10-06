#!/usr/bin/env node

var NetPokerServer = require("../../src/js/server/app/NetPokerServer");
var Backend = require("../../src/js/server/backend/Backend");
var MockBackendServer = require("../../src/js/server/mock/MockBackendServer");
var MockWebRequestHandler = require("../../src/js/server/mock/MockWebRequestHandler");
var minimist = require("minimist");
var fs = require("fs");
var url = require("url");

var port = 2222;

var netPokerServer = new NetPokerServer();
netPokerServer.setListenPort(port);
netPokerServer.serveViewCases(__dirname + "/../../res/viewcases");
netPokerServer.setBackend(new MockBackendServer());

var webRequestHandler = new MockWebRequestHandler();
webRequestHandler.attachToServer(netPokerServer);

netPokerServer.listen();
netPokerServer.run().then(
	function() {
		console.log("");
		console.log("Mockserver started on port " + port + ", visit: http://localhost:2222/");
	}
);