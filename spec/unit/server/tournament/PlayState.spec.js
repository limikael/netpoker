var User = require("../../../../src/server/user/User");
var PlayState = require("../../../../src/server/tournament/PlayState");
var BlindStructureData = require("../../../../src/server/tournament/BlindStructureData");

describe("PlayState", function() {
	beforeEach(function() {
		jasmine.clock().install();
		jasmine.clock().mockDate();
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	})

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

	it("waits for next blind change", function() {
		console.log("now: "+Date.now());

		var levs = [
			new BlindStructureData(100, 1, 2),
			new BlindStructureData(200, 2, 3),
			new BlindStructureData(1000, 3, 4)
		];

		var mockTournament = {};
		mockTournament.getBlindStructureForLevel = function(level) {
			if (!levs[level])
				throw new Error("level " + level + " doesn't exist");

			return levs[level];
		};

		mockTournament.getNumBlindLevels = function() {
			return levs.length;
		};

		spyOn(mockTournament, "getBlindStructureForLevel").and.callThrough();

		var playState = new PlayState();
		playState.setTournament(mockTournament);

		playState.enterLevel();
		expect(mockTournament.getBlindStructureForLevel).toHaveBeenCalled();

		expect(playState.blindLevel).toBe(0);

		expect(playState.getTimeUntilNextLevel()).toBe(100);
		jasmine.clock().tick(50 * 1000);
		expect(playState.getTimeUntilNextLevel()).toBe(50);
		jasmine.clock().tick(50 * 1000);
		expect(playState.blindLevel).toBe(1);
		expect(playState.getTimeUntilNextLevel()).toBe(200);

		jasmine.clock().tick(200*1000);
		expect(playState.blindLevel).toBe(2);
		expect(playState.getTimeUntilNextLevel()).toBe(-1);

		expect(playState.getCurrentStake()).toBe(3);
	});
});