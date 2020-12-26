/**
 * Server.
 * @module server
 */

var CardData = require("../../proto/data/CardData");
var ArrayUtil = require("../../utils/ArrayUtil");

/**
 * Texas Holdem hand evaluator. It only works for 7 cards at the moment, but can
 * be changed to work with partial hands without too much difficulty.
 *
 * The constructor takes an array of 7 cards that constitutes the hand.
 * @class Hand
 * @constructor
 * @param cards {CardData[]} Array of CardData.
 */
function Hand(cards) {
	if (cards.length != 7)
		throw new Error("Need 7 cards for a hand.");

	this.cards = cards.concat();
	this.cards.sort(CardData.compareCardValue);
	this.cards.reverse();

	var compareValueCards = this.cards.concat();
	compareValueCards.sort(CardData.compareValue);

	for (var i = 1; i < compareValueCards.length; i++)
		if (compareValueCards[i - 1].getValue() == compareValueCards[i].getValue())
			throw new Error("Same cards in hand!!!");

	this.evaluate();
}

Hand.HIGH_CARD = 0;
Hand.ONE_PAIR = 1;
Hand.TWO_PAIRS = 2;
Hand.THREE_OF_A_KIND = 3;
Hand.STRAIGHT = 4;
Hand.FLUSH = 5;
Hand.FULL_HOUSE = 6;
Hand.FOUR_OF_A_KIND = 7;
Hand.STRAIGHT_FLUSH = 8;

Hand.CARD_VALUE_NAMES = [
	"two", "three", "four", "five",
	"six", "seven", "eight", "nine",
	"ten", "jack", "queen", "king", "ace"
];

/**
 * Do the evaluation
 * @method evaluate
 * @private
 */
Hand.prototype.evaluate = function() {
	this.score = [];

	var found = false;

	if (!found)
		found = this.checkStraightFlush();

	if (!found)
		found = this.checkFourOfAKind();

	if (!found)
		found = this.checkFullHouse();

	if (!found)
		found = this.checkFlush();

	if (!found)
		found = this.checkStraight();

	if (!found)
		found = this.checkThreeOfAKind();

	if (!found)
		found = this.checkTwoPairs();

	if (!found)
		found = this.checkOnePair();

	if (!found)
		this.checkHighCard();
};

/**
 * Get score. This is an array of integers that can be used for comparing.
 * @method getScore
 */
Hand.prototype.getScore = function() {
	return this.score;
}

/**
 * Check for straight flush $$$.
 * @method checkStraightFlush
 * @private
 */
Hand.prototype.checkStraightFlush = function() {
	var i;

	var checkCards = this.cards.concat();
	checkCards.sort(CardData.compareValue);
	checkCards.reverse();

	for (i = 0; i < checkCards.length - 5 + 1; i++) {
		var c = checkCards.slice(i, i + 5);

		if (Hand.isStraight(c) && Hand.isFlush(c)) {
			this.score.push(Hand.STRAIGHT_FLUSH);
			this.score.push(checkCards[i].getCardValue());
			return true;
		}
	}

	return false;
}

/**
 * Check for straight.
 * @method checkStraight
 * @private
 */
Hand.prototype.checkStraight = function() {
	var c = [];
	var i;

	for (i = 0; i < this.cards.length; i++) {
		if (i == 0 || this.cards[i].getCardValue() != this.cards[i - 1].getCardValue())
			c.push(this.cards[i]);
	}

	if (c.length < 5)
		return;

	//console.log("checking: "+c);

	for (i = 0; i < c.length - 5 + 1; i++) {
		if (Hand.isStraight(c.slice(i, i + 5))) {
			this.score.push(Hand.STRAIGHT);
			this.score.push(c[i].getCardValue());
			return true;
		}
	}

	return false;
}

/**
 * Check if this is a flush.
 * @method checkFlush
 * @private
 */
Hand.prototype.checkFlush = function() {
	var c = this.cards.concat();
	var i, j;

	c.sort(CardData.compareSuitIndex);

	for (i = 0; i < c.length - 5 + 1; i++) {
		if (Hand.isFlush(c.slice(i, i + 5))) {
			var d=c.slice(i, i + 5);

			this.score.push(Hand.FLUSH);
			d.sort(CardData.compareCardValue);
			d.reverse();

			for (j = 0; j < 5; j++)
				this.score.push(d[j].getCardValue());

			return true;
		}
	}

	return false;
}

/**
 * Check if this is a full house.
 * @method checkFullHouse
 * @private
 */
Hand.prototype.checkFullHouse = function() {
	var p = this.findRun(3);
	var q = this.findRun(2, p);

	if (p >= 0 && q >= 0) {
		this.score.push(Hand.FULL_HOUSE);
		this.score.push(p);
		this.score.push(q);
		return true;
	}

	return false;
}

/**
 * Check four of a kind.
 * @method checkFourOfAKind
 * @private
 */
Hand.prototype.checkFourOfAKind = function() {
	var p = this.findRun(4);

	if (p >= 0) {
		this.score.push(Hand.FOUR_OF_A_KIND);
		this.score.push(p);
		this.findKickers(1, [p]);
		return true;
	}

	return false;
}

/**
 * Check three of a kind.
 * @method checkThreeOfAKind
 * @private
 */
Hand.prototype.checkThreeOfAKind = function() {
	var p = this.findRun(3);

	if (p >= 0) {
		this.score.push(Hand.THREE_OF_A_KIND);
		this.score.push(p);
		this.findKickers(2, [p]);
		return true;
	}

	return false;
}

/**
 * Check two pairs.
 * @method checkTwoPairs
 * @private
 */
Hand.prototype.checkTwoPairs = function() {
	var p = this.findRun(2);
	var q = this.findRun(2, p);

	if (p >= 0 && q >= 0) {
		this.score.push(Hand.TWO_PAIRS);
		this.score.push(p);
		this.score.push(q);
		this.findKickers(1, [p, q]);
		return true;
	}

	return false;
}

/**
 * Check one pair.
 * @method checkOnePair
 * @private
 */
Hand.prototype.checkOnePair = function() {
	var p = this.findRun(2);

	if (p >= 0) {
		this.score.push(Hand.ONE_PAIR);
		this.score.push(p);
		this.findKickers(3, [p]);
		return true;
	}

	return false;
}

/**
 * Check high card.
 * @method checkHighCard
 * @private
 */
Hand.prototype.checkHighCard = function() {
	this.score.push(Hand.HIGH_CARD);

	for (var i = 0; i < 5; i++)
		this.score.push(this.cards[i].getCardValue());

	return true;
}

/**
 * Is this a flush?
 * Checks all the cards in parameter.
 * @method isFlush
 * @private
 * @static
 */
Hand.isFlush = function(a) {
	for (var i = 0; i < a.length - 1; i++)
		if (a[i].getSuitIndex() != a[i + 1].getSuitIndex())
			return false;

	return true;
}

/**
 * Find straight.
 * Should be sorted on card value, high to low.
 * @method isStraight
 * @private
 * @static
 */
Hand.isStraight = function(a) {
	if (a.length != 5)
		throw new Error("isStraight needs 5 cards");

	for (var i = 0; i < a.length - 1; i++) {
		var thisCardValue = a[i].getCardValue();
		var nextCardValue = a[i + 1].getCardValue();

		if (thisCardValue != nextCardValue + 1)
			return false;
	}

	return true;
}

/**
 * Find a run of cards.
 * dontCheckFor is an array of card values to not include in the check.
 * @method findRun
 * @private
 */
Hand.prototype.findRun = function(length, dontCheckFor) {
	if (dontCheckFor === undefined)
		dontCheckFor = -1;

	var checking = -1;
	var similarities = 0;

	for (var i = 1; i < this.cards.length; i++) {
		if (this.cards[i].getCardValue() == this.cards[i - 1].getCardValue() &&
			this.cards[i].getCardValue() != dontCheckFor) {
			if (this.cards[i].getCardValue() != checking) {
				checking = this.cards[i].getCardValue();
				similarities = 0;
			}

			similarities++;
			if (similarities == length - 1)
				return checking;
		}

	}

	return -1;
}

/**
 * Find kickers.
 * dontCheckFor is an array of card values to not include in the check.
 * @method findKickers
 * @private
 */
Hand.prototype.findKickers = function(cnt, dontCheckFor) {
	if (!dontCheckFor)
		dontCheckFor = [];

	var found = 0;

	for (var i = 0; i < this.cards.length; i++) {
		if (dontCheckFor.indexOf(this.cards[i].getCardValue()) < 0) {
			this.score.push(this.cards[i].getCardValue());
			found++;
			if (found == cnt)
				return;
		}
	}

	return;
}

/**
 * Get score scring, such as "one pair, twos" or "straight, jack high".
 * @method getScoreString
 */
Hand.prototype.getScoreString = function() {
	switch (this.score[0]) {
		case Hand.FULL_HOUSE:
			return "full house, " + Hand.CARD_VALUE_NAMES[this.score[1]] +
				"s and " + Hand.CARD_VALUE_NAMES[this.score[2]] + "s";

		case Hand.THREE_OF_A_KIND:
			return "three of a kind, " + Hand.CARD_VALUE_NAMES[this.score[1]] + "s";

		case Hand.TWO_PAIRS:
			return "two pairs, " + Hand.CARD_VALUE_NAMES[this.score[1]] +
				"s and " + Hand.CARD_VALUE_NAMES[this.score[2]] + "s";

		case Hand.ONE_PAIR:
			return "one pair, " + Hand.CARD_VALUE_NAMES[this.score[1]] + "s";

		case Hand.HIGH_CARD:
			return "high card " + Hand.CARD_VALUE_NAMES[this.score[1]];

		case Hand.STRAIGHT:
			return "straight, " + Hand.CARD_VALUE_NAMES[this.score[1]] + " high";

		case Hand.FLUSH:
			return "flush, " + Hand.CARD_VALUE_NAMES[this.score[1]] + " high";

		case Hand.FOUR_OF_A_KIND:
			return "four of a kind, " + Hand.CARD_VALUE_NAMES[this.score[1]] + "s";

		case Hand.STRAIGHT_FLUSH:
			return "straight flush, " + Hand.CARD_VALUE_NAMES[this.score[1]] + " high";
	}

	return "?";
}

/**
 * Get hand category, e.g. Hand.ONE_PAIR, Hand.THREE_OF_A_KIND
 * @method getCategory
 */
Hand.prototype.getCategory = function() {
	return this.score[0];
}

/**
 * Compare two hands.
 * @method compare
 * @static
 * @param {Hand} a
 * @param {Hand} b
 * @return Number -1 if a>b, 1 if a<b, 0 otherwise
 */
Hand.compare = function(a, b) {
	if (!a && !b)
		return 0;

	if (a && !b)
		return 1;

	if (!a && b)
		return -1;

	var aScore = a.getScore();
	var bScore = b.getScore();

	for (var i = 0; i < Math.min(aScore.length, bScore.length); i++) {
		if (aScore[i] > bScore[i])
			return 1;

		if (aScore[i] < bScore[i])
			return -1;
	}

	return 0;
}

module.exports = Hand;