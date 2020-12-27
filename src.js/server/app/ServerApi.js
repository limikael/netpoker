const fs=require("fs");

class ServerApi {
	constructor(server) {
		this.server=server;
	}

	listViewCases() {
		let files=fs.readdirSync(__dirname+"/../../../res/viewcases");
		let cases=files.map((fn)=>{
			return fn.replace(".json","");
		});

		return cases;
	}
}

module.exports=ServerApi;