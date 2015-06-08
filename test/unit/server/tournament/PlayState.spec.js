var User = require("../../../../src/server/user/User");
var PlayState = require("../../../../src/server/tournament/PlayState");

describe("PlayState", function() {
	it("can check the finish order", function() {
		var mockTournament = {};
		mockTournament.getNumRegistrations = function() {
			return this.numRegistrations
		};

		var playState = new PlayState();
		playState.setTournament(mockTournament);

		var u1 = new User({
			id: 101,
			name: "User 101"
		});

		var u2 = new User({
			id: 102,
			name: "USer 102"
		});

		var u3 = new User({
			id: 103,
			name: "USer 103"
		});

		mockTournament.numRegistrations = 3;

		playState.notifyUserFinished(u1);
		expect(playState.getUserFinishPlace(u1)).toBe(3);

		playState.notifyUserFinished(u2);
		expect(playState.getUserFinishPlace(u1)).toBe(3);
		expect(playState.getUserFinishPlace(u2)).toBe(2);

		playState.notifyUserFinished(u3);
		expect(playState.getUserFinishPlace(u1)).toBe(3);
		expect(playState.getUserFinishPlace(u2)).toBe(2);
		expect(playState.getUserFinishPlace(u3)).toBe(1);
	});
});