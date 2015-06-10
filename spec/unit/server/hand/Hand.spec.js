var Hand = require("../../../../src/server/hand/Hand");
var CardData = require("../../../../src/proto/data/CardData");

describe("Hand", function() {

	var createCardDataArray = function(s) {
		var a = [];

		for (var i = 0; i < s.length; i++)
			a.push(CardData.fromString(s[i]));

		return a;
	};

	it("doesn't like same cards in hand", function() {
		var cards = createCardDataArray(["2C", "3C", "3D", "2S", "AD", "8S", "2C"]);

		expect(function() {
			var hand = new Hand(cards);
		}).toThrow();
	});

	it("can check for a straight", function() {
		var cards = createCardDataArray(["2C", "4C", "3C", "5C", "6C"]);
		cards.sort(CardData.compareCardValue);
		cards.reverse();
		expect(Hand.isStraight(cards)).toBe(true);

		var cards = createCardDataArray(["2C", "7C", "5C", "3C", "6C"]);
		cards.sort(CardData.compareCardValue);
		cards.reverse();
		expect(Hand.isStraight(cards)).toBe(false);
	});

	it("can check for two pairs", function() {
		var cards = createCardDataArray(["2C", "3C", "3D", "2S", "AD", "8S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());

		expect(hand.getScoreString()).toEqual("two pairs, threes and twos");
		expect(hand.getScore()).toEqual([Hand.TWO_PAIRS, 1, 0, 12]);
		expect(hand.getCategory()).toBe(Hand.TWO_PAIRS);
	});

	it("can check for one pair", function() {
		var cards = createCardDataArray(["2C", "3C", "6D", "2S", "AD", "8S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("one pair, twos");
		expect(hand.getCategory()).toBe(Hand.ONE_PAIR);
	});

	it("can check for flush", function() {
		var cards = createCardDataArray(["2C", "3C", "6C", "9C", "AD", "8C", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("flush, ace high");
		expect(hand.getCategory()).toBe(Hand.FLUSH);
		expect(hand.getScore()).toEqual([Hand.FLUSH, 12, 7, 6, 5, 4]);
	});

	it("can check for full house", function() {
		var cards = createCardDataArray(["2C", "3C", "3D", "2S", "AD", "3S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("full house, threes and twos");
		expect(hand.getCategory()).toBe(Hand.FULL_HOUSE);
		expect(hand.getScore()).toEqual([Hand.FULL_HOUSE, 1, 0]);
	});

	it("can check for three of a kind", function() {
		var cards = createCardDataArray(["2C", "3C", "3D", "10S", "AD", "3S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("three of a kind, threes");
		expect(hand.getCategory()).toBe(Hand.THREE_OF_A_KIND);
		expect(hand.getScore()).toEqual([Hand.THREE_OF_A_KIND, 1, 12, 8]);
	});

	it("can check for four of a kind", function() {
		var cards = createCardDataArray(["3H", "3C", "3D", "10S", "AD", "3S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("four of a kind, threes");
		expect(hand.getCategory()).toBe(Hand.FOUR_OF_A_KIND);
		expect(hand.getScore()).toEqual([Hand.FOUR_OF_A_KIND, 1, 12]);
	});

	it("can check for a straight", function() {
		var cards = createCardDataArray(["2H", "3H", "7C", "4H", "4S", "5S", "6H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getCategory()).toBe(Hand.STRAIGHT);
		expect(hand.getScoreString()).toBe("straight, seven high");
		expect(hand.getScore()).toEqual([Hand.STRAIGHT, 5]);
	});

	it("can check for straight flush", function() {
		var cards = createCardDataArray(["2H", "3H", "4H", "5H", "6H", "3S", "7H"]);
		var hand = new Hand(cards);
		console.log("score: " + hand.getScoreString());
		expect(hand.getScoreString()).toBe("straight flush, seven high");
		expect(hand.getCategory()).toBe(Hand.STRAIGHT_FLUSH);
		expect(hand.getScore()).toEqual([Hand.STRAIGHT_FLUSH, 5]);
	});

	it("can compare two hands", function() {
		// three of a kind
		var a = new Hand(createCardDataArray(["2C", "3C", "3D", "10S", "AD", "3S", "7H"]));

		// straight
		var b = new Hand(createCardDataArray(["2H", "3H", "7C", "4H", "4S", "5S", "6H"]));

		expect(Hand.compare(a, b)).toEqual(-1);
		expect(Hand.compare(b, a)).toEqual(1);
	});

	it("can check for high card", function() {
		// three of a kind
		var hand = new Hand(createCardDataArray(["2C", "3C", "5D", "10S", "AD", "8S", "7H"]));

		expect(hand.getCategory()).toBe(Hand.HIGH_CARD);
		expect(hand.getScoreString()).toBe("high card ace");
		expect(hand.getScore()).toEqual([Hand.HIGH_CARD, 12, 8, 6, 5, 3]);
	});
});