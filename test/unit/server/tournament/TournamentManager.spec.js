var TournamentManager = require("../../../../src/server/tournament/TournamentManager");
var MockBackend = require("../../../utils/MockBackend");

describe("TournamentManager", function() {
	var MockTournament;
	var mockBackend;
	var mockServices;

	beforeEach(function() {
		MockTournament = function(data) {
			this.id = data ? data.id : null;
		};

		MockTournament.prototype.getId = function() {
			return this.id;
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

	it("unloads tournaments when they dispatches an onunload event", function() {

	});

	it("can check if all tournaments are idle", function() {

	});

	it("signals that it becomes idle", function() {

	});
});