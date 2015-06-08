var Tournament = require("../../../../src/server/tournament/Tournament");
var TournamentState = require("../../../../src/server/tournament/TournamentState");
var User = require("../../../../src/server/user/User");
var EventDispatcher = require("yaed");
var RegistrationState = require("../../../../src/server/tournament/RegistrationState");

describe("Tournament", function() {
	var tournamentData;

	beforeEach(function() {
		tournamentData = {
			id: 123,
			state: "registration",
			seatsPerTable: 10,
			startChips: 1000,
			payoutPercent: [70, 20],
			fee: 10,
			blindStructure: [{
				time: 100,
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
	});

	it("validates data on creation, and can get data", function() {
		expect(function() {
			var t = new Tournament(null);
		}).toThrow();

		t = new Tournament(null, tournamentData);
		expect(t.getId()).toBe(123);
	});

	it("can add and remove users", function() {
		var t = new Tournament(null, tournamentData);

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

		var t = new Tournament(null, tournamentData);

		var u = new User({
			name: "test",
			id: 666
		});

		expect(t.isUserRegistered(u)).toBe(true);
	});

	it("has a state that can be set, and will re-dispatch events from the state", function() {
		var t = new Tournament(null, tournamentData);

		var idleSpy = jasmine.createSpy();
		t.on(Tournament.IDLE, idleSpy);

		var state = new EventDispatcher();
		state.setTournament = jasmine.createSpy();
		state.run = jasmine.createSpy();
		t.setTournamentState(state)

		expect(state.setTournament).toHaveBeenCalled();
		expect(state.run).toHaveBeenCalled();

		state.trigger(TournamentState.IDLE);
		expect(idleSpy).toHaveBeenCalled();
	});

	it("sets the right state depending on data", function() {
		tournamentData.state = "registration";

		var t = new Tournament(null, tournamentData);
		expect(t.tournamentState).toEqual(jasmine.any(RegistrationState));

		tournamentData.state = "something_else";
		expect(function() {
			var t = new Tournament(null, tournamentData);
		}).toThrow();
	});

	it("reads blind levels", function() {
		var t = new Tournament(null, tournamentData);

		var b = t.getBlindStructureForLevel(0);
		expect(b.getTime()).toBe(100);
	});

	it("can generate payout amounts", function() {
		var t = new Tournament(null, tournamentData);

		expect(t.getPayouts()).toEqual([]);

		t.addUser(User.fromIdAndName(123,"hello"));
		expect(t.getPayouts()).toEqual([7]);

		t.addUser(User.fromIdAndName(124,"hello2"));
		expect(t.getPayouts()).toEqual([14, 4]);

		t.addUser(User.fromIdAndName(125,"hello3"));
		expect(t.getPayouts()).toEqual([21, 6]);

		t.bonus = 10;
		expect(t.getPayouts()).toEqual([28, 8]);
	});
});