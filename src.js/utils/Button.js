/**
 * Utilities.
 * @module utils
 */

/**
 * Button.
 * @class Button
 */
class Button extends PIXI.Container {
	LIGHT_MATRIX = [1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1];
	DARK_MATRIX = [.75, 0, 0, 0, 0, .75, 0, 0, 0, 0, .75, 0, 0, 0, 0, 1];
	DEFAULT_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

	constructor(content) {
		super();

		if (content)
			this.addChild(content);

		this.interactive = true;
		this.buttonMode = true;

		this.mouseover = this.onMouseover.bind(this);
		this.mouseout = this.touchend = this.touchendoutside = this.onMouseout.bind(this);
		this.mousedown = this.touchstart = this.onMousedown.bind(this);
		this.mouseup = this.onMouseup.bind(this);
		//this.click = this.tap = this.onClick.bind(this);

		this.colorMatrixFilter = new PIXI.filters.ColorMatrixFilter();
		this.colorMatrixFilter.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

		//this.filters = [this.colorMatrixFilter];
	}

	/**
	 * Mouse over.
	 * @method onMouseover
	 * @private
	 */
	onMouseover() {
		this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
	}

	/**
	 * Mouse out.
	 * @method onMouseout
	 * @private
	 */
	onMouseout() {
		this.colorMatrixFilter.matrix = Button.DEFAULT_MATRIX;
	}

	/**
	 * Mouse down.
	 * @method onMousedown
	 * @private
	 */
	onMousedown() {
		this.colorMatrixFilter.matrix = Button.DARK_MATRIX;
	}

	/**
	 * Mouse up.
	 * @method onMouseup
	 * @private
	 */
	onMouseup() {
		this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
	}

	/**
	 * Click.
	 * @method onClick
	 * @private
	 */
	/*onClick(e) {
		e.stopPropagation();

		this.emit("click",e);
	}*/

	/**
	 * Enabled.
	 * @method setEnabled
	 */
	setEnabled(value) {
		if (value) {
			this.interactive = true;
			this.buttonMode = true;
		} else {
			this.interactive = false;
			this.buttonMode = false;
		}
	}
}

module.exports = Button;