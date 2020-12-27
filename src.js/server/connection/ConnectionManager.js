const WebSocket=require("ws");
const EventEmiter=require("events");
const querystring=require("querystring");
const url=require("url");
const fs=require("fs");

class ConnectionManager extends EventEmiter {
	constructor(server) {
		super();

		this.server=server;
		this.wsServer=new WebSocket.Server({server: this.server.httpServer});
		this.wsServer.on("connection",this.onWsConnection);
	}

	onWsConnection=async(ws, req)=>{
		let params={...querystring.parse(url.parse(req.url).query)};

		if (params.viewcase) {
			console.log("Sevving viewcase: "+params.viewcase);
			let viewcaseFn=
				__dirname+"/../../../res/viewcases/"+params.viewcase+".json";

			let viewcaseText=String(fs.readFileSync(viewcaseFn));
			let viewcaseLines=viewcaseText.split("\n");

			for (let line of viewcaseLines)
				if (line.trim())
					ws.send(line.trim());
		}

		else {
			console.log("strange connection...");
			ws.close();
		}

/*		let userConnection=new UserConnection(ws,req);

		await userConnection.initialize();
		this.emit("connection",userConnection);*/
	}
}

module.exports=ConnectionManager;
