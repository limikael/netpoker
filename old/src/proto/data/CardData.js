/**
 * Protocol.
 * @module proto
 */

/**
 * Card data.
 * @class CardData
 */
function CardData(value) {
	this.value = value;
}

CardData.CARD_VALUE_STRINGS =
	["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

CardData.SUIT_STRINGS =
	["D", "C", "H", "S"];
CardData.LONG_SUIT_STRINGS =
	["Diamonds", "Clubs", "Hearts", "Spades"];

CardData.HIDDEN = -1;

/**
 * Does this CardData represent a show card?
 * If not it should be rendered with its backside.
 * @method isShown
 */
CardData.prototype.isShown = function() {
	return this.value >= 0;
}

/**
 * Get card value.
 * This value represents the rank of the card, but starts on 0.
 * @method getCardValue
 */
CardData.prototype.getCardValue = function() {
	return this.value % 13;
}

/**
 * Get card value string.
 * @method getCardValueString
 */
CardData.prototype.getCardValueString = function() {
	return CardData.CARD_VALUE_STRINGS[this.value % 13];
}

/**
 * Get suit index.
 * @method getSuitIndex
 */
CardData.prototype.getSuitIndex = function() {
	return Math.floor(this.value / 13);
}

/**
 * Get suit string.
 * @method getSuitString
 */
CardData.prototype.getSuitString = function() {
	return CardData.SUIT_STRINGS[this.getSuitIndex()];
}

/**
 * Get long suit string.
 * @method getLongSuitString
 */
CardData.prototype.getLongSuitString = function() {
	return CardData.LONG_SUIT_STRINGS[this.getSuitIndex()];
}

/**
 * Get color.
 * @method getColor
 */
CardData.prototype.getColor = function() {
	if (this.getSuitIndex() % 2 != 0)
		return "#000000";

	else
		return "#ff0000";
}

/**
 * To string.
 * @method toString
 */
CardData.prototype.toString = function() {
	if (this.value < 0)
		return "XX";

	//	return "<card " + this.getCardValueString() + this.getSuitString() + ">";
	return this.getCardValueString() + this.getSuitString();
}

/**
 * Get value of the card.
 * @method getValue
 */
CardData.prototype.getValue = function() {
	return this.value;
}

/**
 * Compare with respect to value. Not really useful except for debugging!
 * @method compareValue
 * @static
 */
CardData.compareValue = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getValue() > b.getValue())
		return 1;

	if (a.getValue() < b.getValue())
		return -1;

	return 0;
}

/**
 * Compare with respect to card value.
 * @method compareCardValue
 * @static
 */
CardData.compareCardValue = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getCardValue() > b.getCardValue())
		return 1;

	if (a.getCardValue() < b.getCardValue())
		return -1;

	return 0;
}

/**
 * Compare with respect to suit.
 * @method compareSuit
 * @static
 */
CardData.compareSuitIndex = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getSuitIndex() > b.getSuitIndex())
		return 1;

	if (a.getSuitIndex() < b.getSuitIndex())
		return -1;

	return 0;
}

/**
 * Create a card data from a string.
 * @method fromString
 * @static
 */
CardData.fromString = function(s) {
	var i;

	var cardValue = -1;
	for (i = 0; i < CardData.CARD_VALUE_STRINGS.length; i++) {
		var cand = CardData.CARD_VALUE_STRINGS[i];

		if (s.substring(0, cand.length).toUpperCase() == cand)
			cardValue = i;
	}

	if (cardValue < 0)
		throw new Error("Not a valid card string: " + s);

	var suitString = s.substring(CardData.CARD_VALUE_STRINGS[cardValue].length);

	var suitIndex = -1;
	for (i = 0; i < CardData.SUIT_STRINGS.length; i++) {
		var cand = CardData.SUIT_STRINGS[i];

		if (suitString.toUpperCase() == cand)
			suitIndex = i;
	}

	if (suitIndex < 0)
		throw new Error("Not a valid card string: " + s);

	return new CardData(suitIndex * 13 + cardValue);
}

module.exports = CardData;