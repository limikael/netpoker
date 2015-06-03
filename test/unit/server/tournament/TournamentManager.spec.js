var TournamentManager = require("../../../../src/server/tournament/TournamentManager");
var MockBackend = require("../../../utils/MockBackend");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

describe("TournamentManager", function() {
	var MockTournament;
	var mockBackend;
	var mockServices;

	beforeEach(function() {
		MockTournament = function(data) {
			EventDispatcher.call(this);
			this.id = data ? data.id : null;
		};

		inherits(MockTournament, EventDispatcher);

		MockTournament.prototype.getId = function() {
			return this.id;
		}

		MockTournament.prototype.isIdle = function() {
			return this.idle;
		}

		mockBackend = new MockBackend();

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	it("returns a tournament directly if it exists", function(done) {
		var tournamentManager = new TournamentManager();
		tournamentManager.Tournament = MockTournament;

		var t = new MockTournament();
		t.id = 123;

		tournamentManager.tournaments.push(t);
		tournamentManager.findTournamentById(123).then(
			function(foundTournament) {
				expect(foundTournament).toBe(t);
				done();
			}
		);
	});

	it("fetches the tournament if it does not exist", function(done) {
		mockBackend.tournamentInfo = function(o) {
			expect(o.tournamentId).toBe(123);
			return {
				id: 123,
				name: "hello"
			}
		};

		var tournamentManager = new TournamentManager(mockServices);
		tournamentManager.Tournament = MockTournament;

		tournamentManager.findTournamentById(123).then(
			function(foundTournament) {
				expect(foundTournament.getId()).toEqual(123);
				expect(foundTournament).toEqual(jasmine.any(MockTournament));
				expect(tournamentManager.hasLocalTournamentId(123)).toBe(true);
				done();
			}
		);
	});

	it("can check if all tournaments are idle", function() {
		var tournamentManager = new TournamentManager(mockServices);
		tournamentManager.Tournament = MockTournament;

		expect(tournamentManager.isIdle()).toBe(true);

		var t = new MockTournament({});
		t.id = 123;
		t.idle = false;
		tournamentManager.tournaments.push(t);
		expect(tournamentManager.isIdle()).toBe(false);

		t.idle = true;
		expect(tournamentManager.isIdle()).toBe(true);
	});

	it("signals that it becomes idle", function() {
		var tournamentManager = new TournamentManager(mockServices);
		tournamentManager.Tournament = MockTournament;

		var t1 = new MockTournament({});
		t1.id = 123;
		t1.idle = false;

		var t2 = new MockTournament({});
		t2.id = 124;
		t2.idle = false;

		tournamentManager.manageTournament(t1);
		tournamentManager.manageTournament(t2);

		expect(tournamentManager.isIdle()).toBe(false);

		var idleSpy = new jasmine.createSpy();
		tournamentManager.on(TournamentManager.IDLE, idleSpy);

		t1.idle = true;
		t1.trigger("idle");
		expect(idleSpy).not.toHaveBeenCalled();

		t2.idle = true;
		t2.trigger("idle");
		expect(idleSpy).toHaveBeenCalled();
	});

	it("unloads a tournament if it dispatches a CAN_UNLOAD event", function() {
		var tournamentManager = new TournamentManager(mockServices);
		tournamentManager.Tournament = MockTournament;

		var t1 = new MockTournament({});
		t1.id = 123;
		t1.idle = true;

		var t2 = new MockTournament({});
		t2.id = 124;
		t2.idle = true;

		tournamentManager.manageTournament(t1);
		tournamentManager.manageTournament(t2);

		expect(tournamentManager.tournaments.length).toBe(2);
		t1.trigger("canUnload", t1);

		expect(tournamentManager.tournaments.length).toBe(1);
		expect(tournamentManager.hasLocalTournamentId(123)).toBe(false);
	});
});