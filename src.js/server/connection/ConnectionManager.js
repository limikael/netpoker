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
		console.log("Connection: "+JSON.stringify(params));

		if (params.viewcase) {
			console.log("Serving viewcase: "+params.viewcase);
			let viewcaseFn=
				__dirname+"/../../../res/viewcases/"+params.viewcase+".json";

			let viewcaseText=String(fs.readFileSync(viewcaseFn));
			let viewcaseLines=viewcaseText.split("\n");

			for (let line of viewcaseLines)
				if (line.trim())
					ws.send(line.trim());

			ws.on("message",(message)=>{
				console.log("Message: "+message);
			});
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
