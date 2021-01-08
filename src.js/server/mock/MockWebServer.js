var fs = require("fs");
var url = require("url");

class MockWebServer {
	constructor(server) {
		this.server=server;
	}

	handleCall=async (req, res)=>{
		var path=url.parse(req.url).pathname;

		if (path=="/") {
			let viewcaseOptions="";
			var dir = fs.readdirSync(__dirname + "/../../../res/viewcases");
			for (var i = 0; i < dir.length; i++) {
				var viewcase = dir[i].replace(".json", "");

				viewcaseOptions += "<option value='" + viewcase + "'>" + viewcase + "</option>";
			}

			let content=fs.readFileSync(__dirname+"/../../../res/mocksite/index.html");
			content=String(content);
			content=content.replace("{viewcaseOptions}",viewcaseOptions);
			res.end(content);
		}

		else if (fs.existsSync(__dirname+"/../../../res/bundle/"+path))
			res.end(fs.readFileSync(__dirname+"/../../../res/bundle/"+path));

		else if (fs.existsSync(__dirname+"/../../../res/mocksite/"+path))
			res.end(fs.readFileSync(__dirname+"/../../../res/mocksite/"+path));

		else
			return this.server.apiProxy.handleCall(req,res);
	}
}

module.exports=MockWebServer;