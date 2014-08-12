/**
 * Card data.
 * @class CardData
 */
function CardData(value) {
	this.value=value;
}

/**
 * Shown?
 */
CardData.prototype.isShown=function() {
	return this.value>=0;
}

module.exports=CardData;