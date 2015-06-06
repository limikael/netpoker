/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");

/**
 * A text that counts down.
 * @class CountdownText
 */
function CountdownText(text, style) {
	PIXI.Text.call(this, text, style);

	this.timeLeft = 0;
	this.timerInterval = null;
	this.setText(text);
}

inherits(CountdownText, PIXI.Text);

/**
 * Override the setText function.
 * @method setText
 */
CountdownText.prototype.setText = function(text) {
	this.format = text;

	this.updateFormattedText();
}

/**
 * Update the actual text.
 * @method updateFormattedText
 */
CountdownText.prototype.updateFormattedText = function() {
	var s = (this.timeLeft % 60).toString();
	var m = (Math.floor(this.timeLeft / 60) % 60).toString();
	var h = (Math.floor(this.timeLeft / (60 * 60))).toString();

	if (s.length < 2)
		s = "0" + s;

	if (m.length < 2)
		m = "0" + m;

	if (h == "0")
		h = "";

	else {
		if (h.length < 2)
			h = "0" + h;

		h += ":";
	}

	var text = this.format.toString().replace("%t", h + m + ":" + s);

	//console.log("update text: " + text);

	PIXI.Text.prototype.setText.call(this, text);
}

/**
 * Set time left.
 * @method setTimeLeft
 */
CountdownText.prototype.setTimeLeft = function(timeLeft) {
	if (timeLeft < 0)
		timeLeft = 0;

	if (this.timerInterval) {
		clearInterval(this.timerInterval);
		this.timerInterval = null;
	}

	this.timeLeft = timeLeft;

	if (this.timeLeft > 0) {
		this.timerInterval = setInterval(this.onTimerInterval.bind(this), 1000);
	}

	this.updateFormattedText();
}

/**
 * Timer interval.
 * @method onTimerInterval
 */
CountdownText.prototype.onTimerInterval = function() {
	this.timeLeft--;

	if (this.timeLeft <= 0) {
		clearInterval(this.timerInterval);
		this.timerInterval = null;
	}

	this.updateFormattedText();
}

module.exports = CountdownText;