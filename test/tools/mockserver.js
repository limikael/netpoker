#!/usr/bin/env node

var NetPokerServer = require("../../src/js/server/app/NetPokerServer");
var Backend = require("../../src/js/server/backend/Backend");
var MockBackendServer = require("../utils/MockBackendServer");
var minimist = require("minimist");
var fs = require("fs");

function handleWebRequest(e) {
	console.log("web request: " + e.request.url);

	var url = e.request.url;

	if (url == "/")
		url = "/index.html";

	var content = fs.readFileSync(__dirname + "/../view/" + url);

	e.response.write(content);
	e.response.end();
}

var port = 2000;
var mockBackendPort = 9999;

var mockBackendServer = new MockBackendServer();
mockBackendServer.setListenPort(mockBackendPort);
mockBackendServer.start();

var netPokerServer = new NetPokerServer();
netPokerServer.setListenPort(port);
netPokerServer.setBackend(new Backend("http://localhost:" + mockBackendPort));
netPokerServer.on("request", handleWebRequest);
netPokerServer.run();

console.log("Mockserver started on port " + port);