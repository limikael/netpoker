const url=require("url");
const querystring=require("querystring");

class ApiProxy {
	constructor(api) {
		this.api=api;
	}

	handleCall=async (req, res)=>{
		//console.log(req);

		let u=url.parse(req.url);
		let path=u.pathname.split("/").filter(x=>x);
		let params={...querystring.parse(u.query)};
		let funcName=path[0];
		params._=path.slice(1);

		if (!funcName) {
			res.end("Missing function.\n");
		}

		try {
			let result=await this.api[funcName](params);
			res.end(JSON.stringify(result,null,2)+"\n");
		}

		catch (e) {
			res.end("Error: "+String(e)+"\n");
		}
	}
}

module.exports=ApiProxy;