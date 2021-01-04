var Tournament = require("../../../../src/server/tournament/Tournament");
var TournamentState = require("../../../../src/server/tournament/TournamentState");
var User = require("../../../../src/server/user/User");
var EventDispatcher = require("yaed");
var RegistrationState = require("../../../../src/server/tournament/RegistrationState");
var PlayState = require("../../../../src/server/tournament/PlayState");
var FinishedState = require("../../../../src/server/tournament/FinishedState");
var MockBackendServer = require("../../../../src/server/mock/MockBackendServer");
var User = require("../../../../src/server/user/User");

describe("RegistrationState", function() {
	var tournamentData;
	var mockServices;
	var mockBackend;

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

		jasmine.clock().install();
		jasmine.clock().mockDate();

		mockBackend = new MockBackendServer();

		mockServices = {};
		mockServices.getBackend = function() {
			return mockBackend;
		}
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("cancels a tournament if there are too few registrations", function() {
		spyOn(mockBackend, "tournamentCancel").and.callThrough();

		tournamentData.startTime = Math.round(Date.now() / 1000) + 10;

		var tournament = new Tournament(mockServices, tournamentData);

		jasmine.clock().tick(20000);
		expect(tournament.getTournamentState()).toEqual(jasmine.any(FinishedState));

		expect(mockBackend.tournamentCancel).toHaveBeenCalled();
	});

	it("starts a tournament if there are enough registrations", function() {
		spyOn(mockBackend, "tournamentStart").and.callThrough();

		tournamentData.startTime = Math.round(Date.now() / 1000) + 10;

		var tournament = new Tournament(mockServices, tournamentData);

		tournament.addUser(User.fromIdAndName(101,"Test1"));
		tournament.addUser(User.fromIdAndName(102,"Test2"));

		jasmine.clock().tick(20000);
		expect(tournament.getTournamentState()).toEqual(jasmine.any(PlayState));

		expect(mockBackend.tournamentStart).toHaveBeenCalled();
	});
});