var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");



/**
 * A chips view.
 * @class ChipsView
 */
function ChipsView(showToolTip) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.align = Resources.getInstance().Align.Left;

	this.value = 0;

	this.denominations = [500000,100000,25000,5000,1000,500,100,25,5,1];

	this.stackClips = new Array();
	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.toolTip = null;

	if(showToolTip) {
		this.toolTip = new ToolTip();
		this.addChild(this.toolTip);
	}

}

FunctionUtil.extend(ChipsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ChipsView);

/**
 * Set alignment.
 * @method setCardData
 */
ChipsView.prototype.setAlignment = function(align) {
	this.align = align;
}

/**
 * Set target position.
 * @method setTargetPosition
 */
ChipsView.prototype.setTargetPosition = function(position) {
	this.targetPosition = position;
	this.position.x = position.x;
	this.position.y = position.y;
}

/**
 * Set value.
 * @method setValue
 */
ChipsView.prototype.setValue = function(value) {
	this.value = value;

	var sprite;

	for(var i = 0; i < this.stackClips.length; i++)
		this.holder.removeChild(this.stackClips[i]);

	this.stackClips = new Array();

	if (this.toolTip!=null)
		this.toolTip.text = "Bet: "+ this.value.toString();

	var i;
	var stackClip = null;
	var stackPos = 0;
	var chipPos = 0;
	var textures = Resources.getInstance().getTextures("chips");

	for (i = 0; i < this.denominations.length; i++) {
		var denomination = this.denominations[i];

		chipPos=0;
		stackClip=null;
		while(value >= denomination) {
			if (stackClip == null) {
				stackClip = new PIXI.DisplayObjectContainer();
				stackClip.x = stackPos;
				stackPos += 40;
				this.holder.addChild(stackClip);
				this.stackClips.push(stackClip);
			}
		   	var texture = textures[i%textures.length];
			var chip = new PIXI.Sprite(texture);
			chip.position.y = chipPos;
			chipPos -= 5;
			stackClip.addChild(chip);
			value -= denomination;

			var denominationString;

			if(denomination >= 1000)
				denominationString = Math.round(denomination / 1000) + "K";

			else
				denominationString = denomination;

			if((stackClip != null) && (value < denomination)) {

				var textField = new PIXI.Text(denominationString, {
					font: "bold 12px Arial",
					align: "center",
					fill: Resources.getInstance().getValue("chipsColors")[i%Resources.getInstance().getValue("chipsColors").length]
				});
				textField.position.x = (stackClip.width - textField.width)*0.5;
				textField.position.y = chipPos + 11;
				textField.alpha = 0.5;
				/*
				textField.width = stackClip.width - 1;
				textField.height = 20;*/

				stackClip.addChild(textField);
			}
		}
	}

	switch (this.align) {
		case Resources.getInstance().Align.LEFT: {
			this.holder.x = 0;
			break;
		}

		case Resources.getInstance().Align.CENTER: {
			this.holder.x = -this.holder.width / 2;
			break;
		}

		case Resources.getInstance().Align.RIGHT:
			this.holder.x = -this.holder.width;
	}
}

/**
 * Hide.
 * @method hide
 */
ChipsView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
ChipsView.prototype.show = function() {
	this.visible = true;

	var destination = {x: this.targetPosition.x, y: this.targetPosition.y};
	this.position.x = (this.parent.width - this.width)*0.5;
	this.position.y = -this.height;

	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX*diffX + diffY*diffY);

	var tween = new TWEEN.Tween( this.position )
            .to( { x: destination.x, y: destination.y }, 3*diff )
            .easing( TWEEN.Easing.Quadratic.Out )
            .onComplete(this.onShowComplete.bind(this))
            .start();
}

/**
 * Show complete.
 * @method onShowComplete
 */
ChipsView.prototype.onShowComplete = function() {
	
	this.dispatchEvent("animationDone", this);
}

/**
 * Animate in.
 * @method animateIn
 */
ChipsView.prototype.animateIn = function() {
	var o = {
		y: Resources.getInstance().getPoint("potPosition").y
	};

	switch (this.align) {
		case Resources.getInstance().Align.LEFT:
			o.x = Resources.getInstance().getPoint("potPosition").x-width/2;

		case Resources.getInstance().Align.CENTER:
			o.x = Resources.getInstance().getPoint("potPosition").x;

		case Resources.getInstance().Align.RIGHT:
			o.x = Resources.getInstance().getPoint("potPosition").x+width/2;
	}

	var time = 500;
	var tween = new TWEEN.Tween(this)
					.to({ y: Resources.getInstance().getPoint("potPosition").y }, time)
					.onComplete(this.onInAnimationComplete.bind(this))
					.start();
}

/**
 * In animation complete.
 * @method onInAnimationComplete
 */
ChipsView.prototype.onInAnimationComplete = function() {
	this.setValue(0);

	this.position.x = this.targetPosition.x;
	this.position.y = this.targetPosition.y;

	this.dispatchEvent("animationDone", this);
}

/**
 * Animate out.
 * @method animateOut
 */
ChipsView.prototype.animateOut = function() {
	this.position.y = Resources.getInstance().getPoint("potPosition").y;

	switch (this.align) {
		case Resources.getInstance().Align.LEFT:
			this.position.x = Resources.getInstance().getPoint("potPosition").x - width/2;

		case Resources.getInstance().Align.CENTER:
			this.position.x = Resources.getInstance().getPoint("potPosition").x;

		case Resources.getInstance().Align.RIGHT:
			this.position.x = Resources.getInstance().getPoint("potPosition").x + width/2;
	}

	var o = {
		x: this.targetPosition.x,
		y: this.targetPosition.y
	};

	var time = 500;
	var tween = new TWEEN.Tween(this)
					.to(o, time)
					.onComplete(this.onOutAnimationComplete.bind(this))
					.start();
	
}

/**
 * Out animation complete.
 * @method onOutAnimationComplete
 */
ChipsView.prototype.onOutAnimationComplete = function() {

	var time = 500;
	var tween = new TWEEN.Tween({x:0})
					.to({x:10}, time)
					.onComplete(this.onOutWaitAnimationComplete.bind(this))
					.start();

	this.position.x = this.targetPosition.x;
	this.position.y = this.targetPosition.y;

}

/**
 * Out wait animation complete.
 * @method onOutWaitAnimationComplete
 */
ChipsView.prototype.onOutWaitAnimationComplete = function() {

	this.setValue(0);

	this.dispatchEvent("animationDone", this);
}

module.exports = ChipsView;