/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * A timer view
 * @class TimerView
 */
class TimerView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources = client.getResources();

		this.timerClip = new PIXI.Sprite(this.resources.getTexture("timerBackground"));
		this.addChild(this.timerClip);

		this.canvas = new PIXI.Graphics();
		this.canvas.x = this.timerClip.width * 0.5;
		this.canvas.y = this.timerClip.height * 0.5;
		this.timerClip.addChild(this.canvas);

		this.timerClip.visible = false;

		this.tween = null;

		//this.showPercent(30);
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.timerClip.visible = false;
		this.stop();
	}

	/**
	 * Show.
	 * @method show
	 */
	show(seatIndex) {

		this.timerClip.visible = true;

		var seatPosition = this.resources.getPoint("seatPosition" + seatIndex);
		var timerOffset = this.resources.getPoint("timerOffset");

		this.timerClip.x = seatPosition.x + timerOffset.x;
		this.timerClip.y = seatPosition.y + timerOffset.y;

		this.stop();

	}

	/**
	 * Stop.
	 * @method stop
	 */
	stop() {
		if (this.tween != null)
			this.tween.stop();

	}

	/**
	 * Countdown.
	 * @method countdown
	 */
	countdown(totalTime, timeLeft) {
		this.stop();

		totalTime *= 1000;
		timeLeft *= 1000;

		var time = Date.now();
		this.startAt = time + timeLeft - totalTime;
		this.stopAt = time + timeLeft;

		this.tween = new TWEEN.Tween({
				time: time
			})
			.to({
				time: this.stopAt
			}, timeLeft)
			.onUpdate(this.onUpdate.bind(this))
			.onComplete(this.onComplete.bind(this))
			.start();

	}

	/**
	 * On tween update.
	 * @method onUpdate
	 */
	onUpdate=()=>{
		var time = Date.now();
		var percent = 100 * (time - this.startAt) / (this.stopAt - this.startAt);

		//	console.log("p = " + percent);

		this.showPercent(percent);
	}

	/**
	 * On tween update.
	 * @method onUpdate
	 */
	onComplete=()=>{
		var time = Date.now();
		var percent = 100;
		this.showPercent(percent);
		this.tween = null;
	}

	/**
	 * Show percent.
	 * @method showPercent
	 */
	showPercent(value) {
		if (value < 0)
			value = 0;

		if (value > 100)
			value = 100;

		this.canvas.clear();

		this.canvas.beginFill(0xc00000);
		this.canvas.drawCircle(0, 0, 10);
		this.canvas.endFill();

		this.canvas.beginFill(0xffffff);
		this.canvas.moveTo(0, 0);
		for (var i = 0; i < 33; i++) {
			this.canvas.lineTo(
				10 * Math.cos(i * value * 2 * Math.PI / (32 * 100) - Math.PI / 2),
				10 * Math.sin(i * value * 2 * Math.PI / (32 * 100) - Math.PI / 2)
			);
		}

		this.canvas.lineTo(0, 0);
		this.canvas.endFill();

	}
}

module.exports = TimerView;