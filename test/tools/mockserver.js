#!/usr/bin/env node

var NetPokerServer = require("../../src/js/server/app/NetPokerServer");
var Backend = require("../../src/js/server/backend/Backend");
var MockBackendServer = require("../utils/MockBackendServer");
var minimist = require("minimist");
var fs = require("fs");
var url = require("url");

function handleWebRequest(e) {
	console.log("web request: " + e.request.url);

	var urlParts = url.parse(e.request.url);
	var path = urlParts.pathname;

	var fileName = __dirname + "/../view/" + path;

	if (path == "/") {
		var caseListContent = "";
		var dir = fs.readdirSync(__dirname + "/../viewcases");
		for (var i = 0; i < dir.length; i++) {
			var viewCase = dir[i].replace(".json", "");

			caseListContent += "<li>";
			caseListContent += "<a href='table.html?viewcase=" + viewCase + "'>" + viewCase + "</a>";
			caseListContent += "</li>"
		}

		var content = fs.readFileSync(__dirname + "/../view/index.html");
		content = content.toString().replace("{caseListContent}", caseListContent);

		e.response.write(content);
	} else if (fs.existsSync(fileName)) {
		e.response.write(fs.readFileSync(fileName));
	}

	e.response.end();
}

var port = 2222;
var mockBackendPort = 2223;

var mockBackendServer = new MockBackendServer();
mockBackendServer.setListenPort(mockBackendPort);

var netPokerServer = new NetPokerServer();
netPokerServer.setListenPort(port);
netPokerServer.serveViewCases(__dirname+"/../viewcases");
netPokerServer.setBackend(new Backend("http://localhost:" + mockBackendPort));
netPokerServer.on("request", handleWebRequest);
netPokerServer.run();

mockBackendServer.start();

console.log("Mockserver started on port " + port);