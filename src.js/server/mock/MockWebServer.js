var fs = require("fs");
var url = require("url");

class MockWebServer {
	constructor(server) {
		this.server=server;
	}

	handleCall=async (req, res)=>{
		var path=url.parse(req.url).pathname;

		if (path=="/")
			path="/index.html";

		if (fs.existsSync(__dirname+"/../../../res/bundle/"+path))
			res.end(fs.readFileSync(__dirname+"/../../../res/bundle/"+path));

		else if (fs.existsSync(__dirname+"/../../../res/mocksite/"+path))
			res.end(fs.readFileSync(__dirname+"/../../../res/mocksite/"+path));

		else
			return this.server.apiProxy.handleCall(req,res);
	}
}

module.exports=MockWebServer;