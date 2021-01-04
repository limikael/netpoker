class MockBackend {
	getUserInfoByToken(params) {
		switch (params.token) {
			case "user1":
				return {
					id: "101",
					name: "olle"
				};

			case "user2":
				return {
					id: "102",
					name: "kalle"
				};

			case "user3":
				return {
					id: "103",
					name: "pelle"
				};

			case "user4":
				return {
					id: "104",
					name: "lisa"
				};

			default:
				return {
					not: "logged in"
				};
		}
	}

	async call(method, params) {
		return this[method](params)
	}
}

module.exports=MockBackend;