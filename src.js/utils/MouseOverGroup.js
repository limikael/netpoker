/**
 * Utilities.
 * @module utils
 */

const EventEmitter=require("events");
const PixiUtil=require("./PixiUtil.js");

/**
 * MouseOverGroup. This is the class for the MouseOverGroup.
 * @class MouseOverGroup
 */
class MouseOverGroup extends EventEmitter {
	constructor() {
		super();
		this.objects = new Array();
		this.currentlyOver = false;
		this.mouseDown = false;
	}

	/**
	 * Add displayobject to watchlist.
	 * @method addDisplayObject
	 */
	addDisplayObject = function(displayObject) {
		displayObject.interactive = true;
		displayObject.on("mouseover",this.onObjectMouseOver);
		displayObject.on("mouseout",this.onObjectMouseOut);
		displayObject.on("mousedown",this.onObjectMouseDown);
		this.objects.push(displayObject);
	}

	/**
	 * Mouse over object.
	 * @method onObjectMouseOver
	 */
	onObjectMouseOver=(e)=>{
		if(this.currentlyOver)
			return;

		this.currentlyOver = true;
		this.emit("mouseover");
	}

	/**
	 * Mouse out object.
	 * @method onObjectMouseOut
	 */
	onObjectMouseOut=(e)=>{
		if(!this.currentlyOver || this.mouseDown)
			return;

		for(var i = 0; i < this.objects.length; i++)
			if (PixiUtil.globalHitTest(this.objects[i],e.data.global))
				return;

		this.currentlyOver = false;
		this.emit("mouseout");
	}

	/**
	 * Mouse down object.
	 * @method onObjectMouseDown
	 */
	onObjectMouseDown=(e)=>{
		console.log("object mouse down");

		this.mouseDown = true;

		this.stage=PixiUtil.findTopParent(e.target);
		this.stage.interactive=true;
		this.stage.on("mouseup",this.onStageMouseUp);
	}


	/**
	 * Mouse up stage.
	 * @method onStageMouseUp
	 */
	onStageMouseUp=(e)=>{
		console.log("stage mouse up");

		this.stage.off("mouseup",this.onStageMouseUp);
		this.mouseDown = false;

		if(this.currentlyOver) {
			var over = false;

			for(var i = 0; i < this.objects.length; i++)
				if (PixiUtil.globalHitTest(this.objects[i],e.data.global))
					over = true;

			if(!over) {
				this.currentlyOver = false;
				this.emit("mouseout");
			}
		}
	}

	/**
	 * Stage mouse move.
	 */
	/*onStageMouseMove=(e)=>{

	}*/
}

module.exports = MouseOverGroup;

