const fetch=require("node-fetch");
const { URLSearchParams } = require('url');

class Backend {
	constructor(baseUrl) {
		this.baseUrl=baseUrl;
	}

	async call(method, params) {
		console.log("backend call: "+method);

		let postParams=new URLSearchParams();

		for (let key in params)
			postParams.append(key,params[key]);

		postParams.append("method",method);

		let fetchRes=await fetch(this.baseUrl, {
			method: "POST",
			body: postParams
		});

		let res=await fetchRes.json();

		if (fetchRes.status!=200 || !res.ok)
			throw new Error(res.message);

		return res;
	}
}

module.exports=Backend;