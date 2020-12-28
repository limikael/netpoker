/**
 * Protocol.
 * @module proto
 */

/**
 * Card data.
 * @class CardData
 */
class CardData {
	static CARD_VALUE_STRINGS =
		["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

	static SUIT_STRINGS =
		["D", "C", "H", "S"];

	static LONG_SUIT_STRINGS =
		["Diamonds", "Clubs", "Hearts", "Spades"];

	static HIDDEN = -1;

	constructor(value) {
		this.value = value;
	}

	/**
	 * Does this CardData represent a show card?
	 * If not it should be rendered with its backside.
	 * @method isShown
	 */
	isShown() {
		return this.value >= 0;
	}

	/**
	 * Get card value.
	 * This value represents the rank of the card, but starts on 0.
	 * @method getCardValue
	 */
	getCardValue() {
		return this.value % 13;
	}

	/**
	 * Get card value string.
	 * @method getCardValueString
	 */
	getCardValueString() {
		return CardData.CARD_VALUE_STRINGS[this.value % 13];
	}

	/**
	 * Get suit index.
	 * @method getSuitIndex
	 */
	getSuitIndex() {
		return Math.floor(this.value / 13);
	}

	/**
	 * Get suit string.
	 * @method getSuitString
	 */
	getSuitString() {
		return CardData.SUIT_STRINGS[this.getSuitIndex()];
	}

	/**
	 * Get long suit string.
	 * @method getLongSuitString
	 */
	getLongSuitString() {
		return CardData.LONG_SUIT_STRINGS[this.getSuitIndex()];
	}

	/**
	 * Get color.
	 * @method getColor
	 */
	getColor() {
		if (this.getSuitIndex() % 2 != 0)
			return "#000000";

		else
			return "#ff0000";
	}

	/**
	 * To string.
	 * @method toString
	 */
	toString() {
		if (this.value < 0)
			return "XX";

		//	return "<card " + this.getCardValueString() + this.getSuitString() + ">";
		return this.getCardValueString() + this.getSuitString();
	}

	/**
	 * Get value of the card.
	 * @method getValue
	 */
	getValue() {
		return this.value;
	}

	/**
	 * Compare with respect to value. Not really useful except for debugging!
	 * @method compareValue
	 * @static
	 */
	static compareValue(a, b) {
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
	static compareCardValue(a, b) {
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
	static compareSuitIndex(a, b) {
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
	static fromString(s) {
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
}

module.exports = CardData;