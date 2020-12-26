/**
 * Protocol.
 * @module proto
 */

/**
 * Received when Pre tournament info message is dispatched.
 * @class PreTournamentInfoMessage
 */
function PreTournamentInfoMessage(text, countdown) {
	this.text = text;
	this.countdown = countdown;
}

PreTournamentInfoMessage.TYPE = "preTournamentInfo";

/**
 * Getter.
 * @method getText
 */
PreTournamentInfoMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Getter.
 * @method getCountdown
 */
PreTournamentInfoMessage.prototype.getCountdown = function() {
	return this.countdown;
}

/**
 * Setter.
 * @method setText
 */
PreTournamentInfoMessage.prototype.setText = function(text) {
	this.text = text;
}

/**
 * Setter.
 * @method setCountdown
 */
PreTournamentInfoMessage.prototype.setCountdown = function(countdown) {
	this.countdown = countdown;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PreTournamentInfoMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.countdown = data.countdown;
}

/**
 * Serialize message.
 * @method serialize
 */
PreTournamentInfoMessage.prototype.serialize = function() {
	if (this.countdown < 0 || isNaN(parseInt(this.countdown)))
		this.countdown = 0;

	return {
		text: this.text,
		countdown: this.countdown
	};
}

module.exports = PreTournamentInfoMessage;