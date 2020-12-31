/**
 * Utilities.
 * @module utils
 */

/**
 * A text that counts down.
 * @class CountdownText
 */
class CountDownText extends PIXI.Text {
	constructor(text, style) {
		super(text,style)

		this.timeLeft = 0;
		this.timerInterval = null;
		this.setText(text);
	}

	/**
	 * Override the setText function.
	 * @method setText
	 */
	setText(text) {
		this.format = text;

		this.updateFormattedText();
	}

	/**
	 * Update the actual text.
	 * @method updateFormattedText
	 */
	updateFormattedText() {
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

		this.text=text;
	}

	/**
	 * Set time left.
	 * @method setTimeLeft
	 */
	setTimeLeft(timeLeft) {
		if (timeLeft < 0 || isNaN(timeLeft) || timeLeft === null)
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
	onTimerInterval=()=> {
		this.timeLeft--;

		if (this.timeLeft <= 0) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		this.updateFormattedText();
	}
}

module.exports = CountDownText;