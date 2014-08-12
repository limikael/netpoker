/**
 * @class SeatInfoMessage
 */
function SeatInfoMessage() {
	this.active = true;
}

SeatInfoMessage.TYPE = "seatInfo";

/**
 * Getter.
 */
SeatInfoMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 */
SeatInfoMessage.prototype.getName = function() {
	return this.name;
}

/**
 * Getter.
 */
SeatInfoMessage.prototype.getChips = function() {
	return this.chips;
}

/**
 * Getter.
 */
SeatInfoMessage.prototype.isSitout = function() {
	return this.sitout;
}

/**
 * Getter.
 */
SeatInfoMessage.prototype.isActive = function() {
	return this.active;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
SeatInfoMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
	this.name = data.name;
	this.chips = data.chips;
	this.sitout = data.sitout;
	this.active = data.active;
}

/**
 * Serialize message.
 * @method serialize
 */
SeatInfoMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
		name: this.name,
		chips: this.chips,
		sitout: this.sitout,
		active: this.active
	};
}

module.exports = SeatInfoMessage;