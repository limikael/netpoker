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

/**
 * Shown?
 */
CardData.prototype.isShown = function() {
	return this.value >= 0;
}

/**
 * Get card value string.
 */
CardData.prototype.getCardValueString = function() {
	return CardData.CARD_VALUE_STRINGS[this.value % 13];
}

/**
 * Get suit index.
 */
CardData.prototype.getSuitIndex = function() {
	return Math.floor(this.value / 13);
}

/**
 * Get suit string.
 */
CardData.prototype.getSuitString = function() {
	return CardData.SUIT_STRINGS[this.getSuitIndex()];
}

/**
 * Get color.
 */
CardData.prototype.getColor = function() {
	if (this.getSuitIndex() % 2 != 0)
		return "#000000";

	else
		return "#ff0000";
}

/**
 * To string.
 */
CardData.prototype.toString = function() {
	return this.getCardValueString() + this.getSuitString();
}

module.exports = CardData;