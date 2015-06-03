var Tournament = require("../../../../src/server/tournament/Tournament");
var User = require("../../../../src/server/user/User");

describe("Tournament", function() {
	var tournamentData = {
		id: 123
	};

	it("validates data on creation, and can get data", function() {
		expect(function() {
			var t = new Tournament();
		}).toThrow();

		t = new Tournament(tournamentData);
		expect(t.getId()).toBe(123);
	});

	it("can add and remove users", function() {
		var t = new Tournament(tournamentData);

		var u = new User({
			name: "test",
			id: 666
		});

		var v = new User({
			name: "test2",
			id: 667
		});

		expect(t.isUserRegistered(u)).toBe(false);
		t.addUser(u);
		t.addUser(u);
		expect(t.isUserRegistered(u)).toBe(true);

		t.addUser(v);
		t.removeUser(u);
		expect(t.isUserRegistered(u)).toBe(false);
		expect(t.isUserRegistered(v)).toBe(true);

		t.removeUser(v);
		expect(t.isUserRegistered(v)).toBe(false);
	});

	it("creates users from initial data", function() {
		tournamentData.users = [{
			name: "test",
			id: 666
		}, {
			name: "test2",
			id: 666
		}];

		var t = new Tournament(tournamentData);

		var u = new User({
			name: "test",
			id: 666
		});

		expect(t.isUserRegistered(u)).toBe(true);
	});
});