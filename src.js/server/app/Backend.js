class Backend {
	constructor(baseUrl) {
		this.baseUrl=baseUrl;
	}

	async call(method, params) {
		throw new Error("not implemented...");
	}
}

module.exports=Backend;