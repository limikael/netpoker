/**
 * Server.
 * @module server
 */

var fs = require("fs");
var url = require("url");

/**
 * Handle a web request when in mock mode.
 * @class MockWebRequestHandler
 */
function MockWebRequestHandler() {}

/**
 * Handle a web request.
 * @method handleWebRequest
 */
MockWebRequestHandler.prototype.handleWebRequest = function(e) {
	console.log("web request: " + e.request.url);

	var urlParts = url.parse(e.request.url);
	var path = urlParts.pathname;

	var fileName = __dirname + "/../../../res/mocksite/" + path;

	e.response.setHeader("Content-Type", "text/html");

	if (path == "/") {
		var caseListContent = "";
		var dir = fs.readdirSync(__dirname + "/../../../res/viewcases");
		for (var i = 0; i < dir.length; i++) {
			var viewCase = dir[i].replace(".json", "");

			caseListContent += "<li>";
			caseListContent += "<a href='table.html?viewcase=" + viewCase + "'>" + viewCase + "</a>";
			caseListContent += "</li>"
		}

		var content = fs.readFileSync(__dirname + "/../../../res/mocksite/index.html");
		content = content.toString().replace("{caseListContent}", caseListContent);

		e.response.write(content);
	} else if (fs.existsSync(fileName)) {
		e.response.write(fs.readFileSync(fileName));
	}

	e.response.end();
}

/**
 * Attach this MockWebRequestHandler to a NetPokerServer
 * @method attachToServer
 */
MockWebRequestHandler.prototype.attachToServer = function(server) {
	server.on("request", this.handleWebRequest, this);
}

module.exports = MockWebRequestHandler;