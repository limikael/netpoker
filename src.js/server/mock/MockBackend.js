const TickLoopRunner=require("../../../spec/support/src/utils/TickLoopRunner");
const PromiseUtil=require("../../utils/PromiseUtil");

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

	notifyCashGameNumPlayers(params) {
		return {
			ok: 1
		};
	}

	getCashGameTableList(params) {
		return {
			"tables": [{
				id: 123,
				numSeats: 10,
				currency: "PLY",
				name: "Test Table",
				minSitInAmount: 10,
				maxSitInAmount: 100,
				stake: 2
			}]
		};
	}

	getUserBalance(params) {
		return {
			balance: 123
		};
	}

	cashGameUserJoin(params) {
		return {
			ok: 1
		};
	}

	gameFinish(params) {
		return {
			ok: 1
		};
	}

	startCashGame(params) {
		return {
			gameId: 987
		};
	}

	gameStartForTournament(params) {
		return {
			gameId: 988
		};
	}

	tournamentInfo(params) {
		return {
			id: 666,
			state: "registration",
			info: "Welcome to the tournament...",
			requiredRegistrations: this.tournamentRequiredRegistrations,
			seatsPerTable: this.tournamentSeatsPerTable,
			startChips: 1000,
			payoutPercent: [70, 20],
			fee: 10,
			//startTime: Math.round(Date.now() / 1000) + 10,
			blindStructure: [{
				time: 10,
				stake: 2,
				ante: 0,
			}, {
				time: 100,
				stake: 4,
				ante: 1,
			}, {
				time: 100,
				stake: 6,
				ante: 2,
			}]
		};
	}

	tournamentRegister(params) {
		return {
			ok: 1
		};
	}

	tournamentStart(params) {
		return {
			ok: 1
		};
	}

	tournamentCancel(params) {
		return {
			ok: 1
		};
	}

	tournamentFinish(params) {
		return {
			ok: 1,
		}
	}

	joinCashGame(params) {
		return {
			ok: 1,
		}
	}

	leaveCashGame(params) {
		return {
			ok: 1,
		}
	}

	async call(method, params) {
		if (!this[method])
			throw new Error("unknown backend call: "+method);

		//console.log("Mock backend call ticking..: "+method);

		//await PromiseUtil.delay(10);
		//await TickLoopRunner.runTicks();

		return this[method](params);
	}
}

module.exports=MockBackend;