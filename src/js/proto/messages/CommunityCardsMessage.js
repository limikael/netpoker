var CardData=require("../data/CardData");

/**
 * @class SeatInfoMessage
 */
function CommunityCardsMessage() {
	this.animate = false;
	this.cards = [];
	this.firstIndex = 0;
}

CommunityCardsMessage.TYPE = "communityCards";

/**
 * Get card data.
 */
CommunityCardsMessage.prototype.getCards = function() {
	return this.cards;
}

/**
 * Get first index.
 */
CommunityCardsMessage.prototype.getFirstIndex = function() {
	return this.firstIndex;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
CommunityCardsMessage.prototype.unserialize = function(data) {
	var i;

	this.animate = data.animate;
	this.firstIndex = parseInt(data.firstIndex);
	this.cards=[];

	for (i=0; i<data.cards.length; i++)
		this.cards.push(new CardData(data.cards[i]));
}

/**
 * Serialize message.
 * @method serialize
 */
CommunityCardsMessage.prototype.serialize = function() {
	var cards=[];

	for (i=0; i<this.cards.length; i++)
		cards.push(this.cards[i].getValue());

	return {
		animate: this.seatIndex,
		firstIndex: this.firstIndex,
		cards: cards
	};
}

module.exports = CommunityCardsMessage;