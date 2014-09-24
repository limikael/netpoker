(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PixiTextInput = require("./src/PixiTextInput");

module.exports = PixiTextInput;
},{"./src/PixiTextInput":2}],2:[function(require,module,exports){
if (typeof module !== 'undefined') {
	PIXI = require("pixi.js");
}

/**
 * Text input field for pixi.js.
 * A simple example:
 *
 *     // We need a container
 *     var container = new PIXI.DisplayObjectContainer();
 *
 *     // Same style options as PIXI.Text
 *     var style={ ... };
 *
 *     var inputField = new PixiTextInput("hello",style);
 *     container.addChild(inputField);
 *
 * The style definitions accepted by the constructor are the same as those accepted by
 * [PIXI.Text](http://www.goodboydigital.com/pixijs/docs/classes/Text.html).
 * @class PixiTextInput
 * @constructor
 * @param {String} [text] The initial text.
 * @param {Object} [style] Style definition, same as for PIXI.Text
 */
function PixiTextInput(text, style) {
	PIXI.DisplayObjectContainer.call(this);

	if (!text)
		text = "";

	text = text.toString();

	if (style && style.wordWrap)
		throw "wordWrap is not supported for input fields";

	this._text = text;

	this.localWidth = 100;
	this._backgroundColor = 0xffffff;
	this._caretColor = 0x000000;
	this._background = true;

	this.style = style;
	this.textField = new PIXI.Text(this._text, style);

	this.localHeight =
		this.textField.determineFontHeight('font: ' + this.textField.style.font + ';') +
		this.textField.style.strokeThickness;
	this.backgroundGraphics = new PIXI.Graphics();
	this.textFieldMask = new PIXI.Graphics();
	this.caret = new PIXI.Graphics();
	this.drawElements();

	this.addChild(this.backgroundGraphics);
	this.addChild(this.textField);
	this.addChild(this.caret);
	this.addChild(this.textFieldMask);

	this.scrollIndex = 0;
	this._caretIndex = 0;
	this.caretFlashInterval = null;
	this.blur();
	this.updateCaretPosition();

	this.backgroundGraphics.interactive = true;
	this.backgroundGraphics.buttonMode = true;
	this.backgroundGraphics.defaultCursor = "text";

	this.backgroundGraphics.mousedown = this.onBackgroundMouseDown.bind(this);
	this.keyEventClosure = this.onKeyEvent.bind(this);
	this.windowBlurClosure = this.onWindowBlur.bind(this);
	this.documentMouseDownClosure = this.onDocumentMouseDown.bind(this);
	this.isFocusClick = false;

	this.updateText();

	this.textField.mask = this.textFieldMask;

	this.keypress = null;
	this.keydown = null;
	this.change = null;
}

PixiTextInput.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PixiTextInput.prototype.constructor = PixiTextInput;

/**
 * Someone clicked.
 * @method onBackgroundMouseDown
 * @private
 */
PixiTextInput.prototype.onBackgroundMouseDown = function(e) {
	var x = e.getLocalPosition(this).x;
	this._caretIndex = this.getCaretIndexByCoord(x);
	this.updateCaretPosition();

	this.focus();

	this.isFocusClick = true;
	var scope = this;
	setTimeout(function() {
		scope.isFocusClick = false;
	}, 0);
}

/**
 * Focus this input field.
 * @method focus
 */
PixiTextInput.prototype.focus = function() {
	this.blur();

	document.addEventListener("keydown", this.keyEventClosure);
	document.addEventListener("keypress", this.keyEventClosure);
	document.addEventListener("mousedown", this.documentMouseDownClosure);
	window.addEventListener("blur", this.windowBlurClosure);

	this.showCaret();
}

/**
 * Handle key event.
 * @method onKeyEvent
 * @private
 */
PixiTextInput.prototype.onKeyEvent = function(e) {
	/*console.log("key event");
	console.log(e);*/

	if (e.type == "keypress") {
		if (e.charCode < 32)
			return;

		this._text =
			this._text.substring(0, this._caretIndex) +
			String.fromCharCode(e.charCode) +
			this._text.substring(this._caretIndex);

		this._caretIndex++;
		this.ensureCaretInView();
		this.showCaret();
		this.updateText();
		this.trigger(this.keypress, e);
		this.trigger(this.change);
	}

	if (e.type == "keydown") {
		switch (e.keyCode) {
			case 8:
				if (this._caretIndex > 0) {
					this._text =
						this._text.substring(0, this._caretIndex - 1) +
						this._text.substring(this._caretIndex);

					this._caretIndex--;
					this.ensureCaretInView();
					this.showCaret();
					this.updateText();
				}
				e.preventDefault();
				this.trigger(this.change);
				break;

			case 46:
				this._text =
					this._text.substring(0, this._caretIndex) +
					this._text.substring(this._caretIndex + 1);

				this.ensureCaretInView();
				this.updateCaretPosition();
				this.showCaret();
				this.updateText();
				e.preventDefault();
				this.trigger(this.change);
				break;

			case 39:
				this._caretIndex++;
				if (this._caretIndex > this._text.length)
					this._caretIndex = this._text.length;

				this.ensureCaretInView();
				this.updateCaretPosition();
				this.showCaret();
				this.updateText();
				break;

			case 37:
				this._caretIndex--;
				if (this._caretIndex < 0)
					this._caretIndex = 0;

				this.ensureCaretInView();
				this.updateCaretPosition();
				this.showCaret();
				this.updateText();
				break;
		}

		this.trigger(this.keydown, e);
	}
}

/**
 * Ensure the caret is not outside the bounds.
 * @method ensureCaretInView
 * @private
 */
PixiTextInput.prototype.ensureCaretInView = function() {
	this.updateCaretPosition();

	while (this.caret.position.x >= this.localWidth - 1) {
		this.scrollIndex++;
		this.updateCaretPosition();
	}

	while (this.caret.position.x < 0) {
		this.scrollIndex -= 2;
		if (this.scrollIndex < 0)
			this.scrollIndex = 0;
		this.updateCaretPosition();
	}
}

/**
 * Blur ourself.
 * @method blur
 */
PixiTextInput.prototype.blur = function() {
	document.removeEventListener("keydown", this.keyEventClosure);
	document.removeEventListener("keypress", this.keyEventClosure);
	document.removeEventListener("mousedown", this.documentMouseDownClosure);
	window.removeEventListener("blur", this.windowBlurClosure);

	this.hideCaret();
}

/**
 * Window blur.
 * @method onDocumentMouseDown
 * @private
 */
PixiTextInput.prototype.onDocumentMouseDown = function() {
	if (!this.isFocusClick)
		this.blur();
}

/**
 * Window blur.
 * @method onWindowBlur
 * @private
 */
PixiTextInput.prototype.onWindowBlur = function() {
	this.blur();
}

/**
 * Update caret Position.
 * @method updateCaretPosition
 * @private
 */
PixiTextInput.prototype.updateCaretPosition = function() {
	if (this._caretIndex < this.scrollIndex) {
		this.caret.position.x = -1;
		return;
	}

	var sub = this._text.substring(0, this._caretIndex).substring(this.scrollIndex);
	this.caret.position.x = this.textField.context.measureText(sub).width;
}

/**
 * Update text.
 * @method updateText
 * @private
 */
PixiTextInput.prototype.updateText = function() {
	this.textField.setText(this._text.substring(this.scrollIndex));
}

/**
 * Draw the background and caret.
 * @method drawElements
 * @private
 */
PixiTextInput.prototype.drawElements = function() {
	this.backgroundGraphics.clear();
	this.backgroundGraphics.beginFill(this._backgroundColor);

	if (this._background)
		this.backgroundGraphics.drawRect(0, 0, this.localWidth, this.localHeight);

	this.backgroundGraphics.endFill();
	this.backgroundGraphics.hitArea = new PIXI.Rectangle(0, 0, this.localWidth, this.localHeight);

	this.textFieldMask.clear();
	this.textFieldMask.beginFill(this._backgroundColor);
	this.textFieldMask.drawRect(0, 0, this.localWidth, this.localHeight);
	this.textFieldMask.endFill();

	this.caret.clear();
	this.caret.beginFill(this._caretColor);
	this.caret.drawRect(1, 1, 1, this.localHeight - 2);
	this.caret.endFill();
}

/**
 * Show caret.
 * @method showCaret
 * @private
 */
PixiTextInput.prototype.showCaret = function() {
	if (this.caretFlashInterval) {
		clearInterval(this.caretFlashInterval);
		this.caretFlashInterval = null;
	}

	this.caret.visible = true;
	this.caretFlashInterval = setInterval(this.onCaretFlashInterval.bind(this), 500);
}

/**
 * Hide caret.
 * @method hideCaret
 * @private
 */
PixiTextInput.prototype.hideCaret = function() {
	if (this.caretFlashInterval) {
		clearInterval(this.caretFlashInterval);
		this.caretFlashInterval = null;
	}

	this.caret.visible = false;
}

/**
 * Caret flash interval.
 * @method onCaretFlashInterval
 * @private
 */
PixiTextInput.prototype.onCaretFlashInterval = function() {
	this.caret.visible = !this.caret.visible;
}

/**
 * Map position to caret index.
 * @method getCaretIndexByCoord
 * @private
 */
PixiTextInput.prototype.getCaretIndexByCoord = function(x) {
	var smallest = 10000;
	var cand = 0;
	var visible = this._text.substring(this.scrollIndex);

	for (i = 0; i < visible.length + 1; i++) {
		var sub = visible.substring(0, i);
		var w = this.textField.context.measureText(sub).width;

		if (Math.abs(w - x) < smallest) {
			smallest = Math.abs(w - x);
			cand = i;
		}
	}

	return this.scrollIndex + cand;
}

/**
 * The width of the PixiTextInput. This is overridden to have a slightly
 * different behaivour than the other DisplayObjects. Setting the
 * width of the PixiTextInput does not change the scale, but it rather
 * makes the field larger. If you actually want to scale it,
 * use the scale property.
 * @property width
 * @type Number
 */
Object.defineProperty(PixiTextInput.prototype, "width", {
	get: function() {
		return this.scale.x * this.getLocalBounds().width;
	},

	set: function(v) {
		this.localWidth = v;
		this.drawElements();
		this.ensureCaretInView();
		this.updateText();
	}
});

/**
 * The text in the input field. Setting will have the implicit function of resetting the scroll
 * of the input field and removing focus.
 * @property text
 * @type String
 */
Object.defineProperty(PixiTextInput.prototype, "text", {
	get: function() {
		return this._text;
	},

	set: function(v) {
		this._text = v.toString();
		this.scrollIndex = 0;
		this.caretIndex = 0;
		this.blur();
		this.updateText();
	}
});

/**
 * The color of the background for the input field.
 * This needs to be specified as an integer, not using HTML
 * notation, e.g. for red background:
 *
 *     myInputText.backgroundColor = 0xff0000;
 *
 * In order for the background to be drawn, the `background`
 * property needs to be true. If not, this property will have
 * no effect.
 * @property backgroundColor
 * @type Integer
 */
Object.defineProperty(PixiTextInput.prototype, "backgroundColor", {
	get: function() {
		return this._backgroundColor;
	},

	set: function(v) {
		this._backgroundColor = v;
		this.drawElements();
	}
});

/**
 * The color of the caret.
 * @property caretColor
 * @type Integer
 */
Object.defineProperty(PixiTextInput.prototype, "caretColor", {
	get: function() {
		return this._caretColor;
	},

	set: function(v) {
		this._caretColor = v;
		this.drawElements();
	}
});

/**
 * Determines if the background should be drawn behind the text.
 * The color of the background is specified using the backgroundColor
 * property.
 * @property background
 * @type Boolean
 */
Object.defineProperty(PixiTextInput.prototype, "background", {
	get: function() {
		return this._background;
	},

	set: function(v) {
		this._background = v;
		this.drawElements();
	}
});

/**
 * Set text.
 * @method setText
 * @param {String} text The new text.
 */
PixiTextInput.prototype.setText = function(v) {
	this.text = v;
}

/**
 * Trigger an event function if it exists.
 * @method trigger
 * @private
 */
PixiTextInput.prototype.trigger = function(fn, e) {
	if (fn)
		fn(e);
}

if (typeof module !== 'undefined') {
	module.exports = PixiTextInput;
}
},{"pixi.js":3}],3:[function(require,module,exports){
/**
 * @license
 * pixi.js - v1.6.0
 * Copyright (c) 2012-2014, Mat Groves
 * http://goodboydigital.com/
 *
 * Compiled: 2014-07-18
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */
(function(){var a=this,b=b||{};b.WEBGL_RENDERER=0,b.CANVAS_RENDERER=1,b.VERSION="v1.6.1",b.blendModes={NORMAL:0,ADD:1,MULTIPLY:2,SCREEN:3,OVERLAY:4,DARKEN:5,LIGHTEN:6,COLOR_DODGE:7,COLOR_BURN:8,HARD_LIGHT:9,SOFT_LIGHT:10,DIFFERENCE:11,EXCLUSION:12,HUE:13,SATURATION:14,COLOR:15,LUMINOSITY:16},b.scaleModes={DEFAULT:0,LINEAR:0,NEAREST:1},b._UID=0,"undefined"!=typeof Float32Array?(b.Float32Array=Float32Array,b.Uint16Array=Uint16Array):(b.Float32Array=Array,b.Uint16Array=Array),b.INTERACTION_FREQUENCY=30,b.AUTO_PREVENT_DEFAULT=!0,b.RAD_TO_DEG=180/Math.PI,b.DEG_TO_RAD=Math.PI/180,b.dontSayHello=!1,b.sayHello=function(a){if(!b.dontSayHello){if(navigator.userAgent.toLowerCase().indexOf("chrome")>-1){var c=["%c %c %c Pixi.js "+b.VERSION+" - "+a+"  %c  %c  http://www.pixijs.com/  %c %c ♥%c♥%c♥ ","background: #ff66a5","background: #ff66a5","color: #ff66a5; background: #030307;","background: #ff66a5","background: #ffc3dc","background: #ff66a5","color: #ff2424; background: #fff","color: #ff2424; background: #fff","color: #ff2424; background: #fff"];console.log.apply(console,c)}else window.console&&console.log("Pixi.js "+b.VERSION+" - http://www.pixijs.com/");b.dontSayHello=!0}},b.Point=function(a,b){this.x=a||0,this.y=b||0},b.Point.prototype.clone=function(){return new b.Point(this.x,this.y)},b.Point.prototype.set=function(a,b){this.x=a||0,this.y=b||(0!==b?this.x:0)},b.Point.prototype.constructor=b.Point,b.Rectangle=function(a,b,c,d){this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0},b.Rectangle.prototype.clone=function(){return new b.Rectangle(this.x,this.y,this.width,this.height)},b.Rectangle.prototype.contains=function(a,b){if(this.width<=0||this.height<=0)return!1;var c=this.x;if(a>=c&&a<=c+this.width){var d=this.y;if(b>=d&&b<=d+this.height)return!0}return!1},b.Rectangle.prototype.constructor=b.Rectangle,b.EmptyRectangle=new b.Rectangle(0,0,0,0),b.Polygon=function(a){if(a instanceof Array||(a=Array.prototype.slice.call(arguments)),"number"==typeof a[0]){for(var c=[],d=0,e=a.length;e>d;d+=2)c.push(new b.Point(a[d],a[d+1]));a=c}this.points=a},b.Polygon.prototype.clone=function(){for(var a=[],c=0;c<this.points.length;c++)a.push(this.points[c].clone());return new b.Polygon(a)},b.Polygon.prototype.contains=function(a,b){for(var c=!1,d=0,e=this.points.length-1;d<this.points.length;e=d++){var f=this.points[d].x,g=this.points[d].y,h=this.points[e].x,i=this.points[e].y,j=g>b!=i>b&&(h-f)*(b-g)/(i-g)+f>a;j&&(c=!c)}return c},b.Polygon.prototype.constructor=b.Polygon,b.Circle=function(a,b,c){this.x=a||0,this.y=b||0,this.radius=c||0},b.Circle.prototype.clone=function(){return new b.Circle(this.x,this.y,this.radius)},b.Circle.prototype.contains=function(a,b){if(this.radius<=0)return!1;var c=this.x-a,d=this.y-b,e=this.radius*this.radius;return c*=c,d*=d,e>=c+d},b.Circle.prototype.getBounds=function(){return new b.Rectangle(this.x-this.radius,this.y-this.radius,this.width,this.height)},b.Circle.prototype.constructor=b.Circle,b.Ellipse=function(a,b,c,d){this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0},b.Ellipse.prototype.clone=function(){return new b.Ellipse(this.x,this.y,this.width,this.height)},b.Ellipse.prototype.contains=function(a,b){if(this.width<=0||this.height<=0)return!1;var c=(a-this.x)/this.width,d=(b-this.y)/this.height;return c*=c,d*=d,1>=c+d},b.Ellipse.prototype.getBounds=function(){return new b.Rectangle(this.x-this.width,this.y-this.height,this.width,this.height)},b.Ellipse.prototype.constructor=b.Ellipse,b.Matrix=function(){this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0},b.Matrix.prototype.fromArray=function(a){this.a=a[0],this.b=a[1],this.c=a[3],this.d=a[4],this.tx=a[2],this.ty=a[5]},b.Matrix.prototype.toArray=function(a){this.array||(this.array=new Float32Array(9));var b=this.array;return a?(b[0]=this.a,b[1]=this.c,b[2]=0,b[3]=this.b,b[4]=this.d,b[5]=0,b[6]=this.tx,b[7]=this.ty,b[8]=1):(b[0]=this.a,b[1]=this.b,b[2]=this.tx,b[3]=this.c,b[4]=this.d,b[5]=this.ty,b[6]=0,b[7]=0,b[8]=1),b},b.identityMatrix=new b.Matrix,b.determineMatrixArrayType=function(){return"undefined"!=typeof Float32Array?Float32Array:Array},b.Matrix2=b.determineMatrixArrayType(),b.DisplayObject=function(){this.position=new b.Point,this.scale=new b.Point(1,1),this.pivot=new b.Point(0,0),this.rotation=0,this.alpha=1,this.visible=!0,this.hitArea=null,this.buttonMode=!1,this.renderable=!1,this.parent=null,this.stage=null,this.worldAlpha=1,this._interactive=!1,this.defaultCursor="pointer",this.worldTransform=new b.Matrix,this.color=[],this.dynamic=!0,this._sr=0,this._cr=1,this.filterArea=null,this._bounds=new b.Rectangle(0,0,1,1),this._currentBounds=null,this._mask=null,this._cacheAsBitmap=!1,this._cacheIsDirty=!1},b.DisplayObject.prototype.constructor=b.DisplayObject,b.DisplayObject.prototype.setInteractive=function(a){this.interactive=a},Object.defineProperty(b.DisplayObject.prototype,"interactive",{get:function(){return this._interactive},set:function(a){this._interactive=a,this.stage&&(this.stage.dirty=!0)}}),Object.defineProperty(b.DisplayObject.prototype,"worldVisible",{get:function(){var a=this;do{if(!a.visible)return!1;a=a.parent}while(a);return!0}}),Object.defineProperty(b.DisplayObject.prototype,"mask",{get:function(){return this._mask},set:function(a){this._mask&&(this._mask.isMask=!1),this._mask=a,this._mask&&(this._mask.isMask=!0)}}),Object.defineProperty(b.DisplayObject.prototype,"filters",{get:function(){return this._filters},set:function(a){if(a){for(var b=[],c=0;c<a.length;c++)for(var d=a[c].passes,e=0;e<d.length;e++)b.push(d[e]);this._filterBlock={target:this,filterPasses:b}}this._filters=a}}),Object.defineProperty(b.DisplayObject.prototype,"cacheAsBitmap",{get:function(){return this._cacheAsBitmap},set:function(a){this._cacheAsBitmap!==a&&(a?this._generateCachedSprite():this._destroyCachedSprite(),this._cacheAsBitmap=a)}}),b.DisplayObject.prototype.updateTransform=function(){this.rotation!==this.rotationCache&&(this.rotationCache=this.rotation,this._sr=Math.sin(this.rotation),this._cr=Math.cos(this.rotation));var a=this.parent.worldTransform,b=this.worldTransform,c=this.pivot.x,d=this.pivot.y,e=this._cr*this.scale.x,f=-this._sr*this.scale.y,g=this._sr*this.scale.x,h=this._cr*this.scale.y,i=this.position.x-e*c-d*f,j=this.position.y-h*d-c*g,k=a.a,l=a.b,m=a.c,n=a.d;b.a=k*e+l*g,b.b=k*f+l*h,b.tx=k*i+l*j+a.tx,b.c=m*e+n*g,b.d=m*f+n*h,b.ty=m*i+n*j+a.ty,this.worldAlpha=this.alpha*this.parent.worldAlpha},b.DisplayObject.prototype.getBounds=function(a){return a=a,b.EmptyRectangle},b.DisplayObject.prototype.getLocalBounds=function(){return this.getBounds(b.identityMatrix)},b.DisplayObject.prototype.setStageReference=function(a){this.stage=a,this._interactive&&(this.stage.dirty=!0)},b.DisplayObject.prototype.generateTexture=function(a){var c=this.getLocalBounds(),d=new b.RenderTexture(0|c.width,0|c.height,a);return d.render(this,new b.Point(-c.x,-c.y)),d},b.DisplayObject.prototype.updateCache=function(){this._generateCachedSprite()},b.DisplayObject.prototype._renderCachedSprite=function(a){this._cachedSprite.worldAlpha=this.worldAlpha,a.gl?b.Sprite.prototype._renderWebGL.call(this._cachedSprite,a):b.Sprite.prototype._renderCanvas.call(this._cachedSprite,a)},b.DisplayObject.prototype._generateCachedSprite=function(){this._cacheAsBitmap=!1;var a=this.getLocalBounds();if(this._cachedSprite)this._cachedSprite.texture.resize(0|a.width,0|a.height);else{var c=new b.RenderTexture(0|a.width,0|a.height);this._cachedSprite=new b.Sprite(c),this._cachedSprite.worldTransform=this.worldTransform}var d=this._filters;this._filters=null,this._cachedSprite.filters=d,this._cachedSprite.texture.render(this,new b.Point(-a.x,-a.y)),this._cachedSprite.anchor.x=-(a.x/a.width),this._cachedSprite.anchor.y=-(a.y/a.height),this._filters=d,this._cacheAsBitmap=!0},b.DisplayObject.prototype._destroyCachedSprite=function(){this._cachedSprite&&(this._cachedSprite.texture.destroy(!0),this._cachedSprite=null)},b.DisplayObject.prototype._renderWebGL=function(a){a=a},b.DisplayObject.prototype._renderCanvas=function(a){a=a},Object.defineProperty(b.DisplayObject.prototype,"x",{get:function(){return this.position.x},set:function(a){this.position.x=a}}),Object.defineProperty(b.DisplayObject.prototype,"y",{get:function(){return this.position.y},set:function(a){this.position.y=a}}),b.DisplayObjectContainer=function(){b.DisplayObject.call(this),this.children=[]},b.DisplayObjectContainer.prototype=Object.create(b.DisplayObject.prototype),b.DisplayObjectContainer.prototype.constructor=b.DisplayObjectContainer,Object.defineProperty(b.DisplayObjectContainer.prototype,"width",{get:function(){return this.scale.x*this.getLocalBounds().width},set:function(a){var b=this.getLocalBounds().width;this.scale.x=0!==b?a/(b/this.scale.x):1,this._width=a}}),Object.defineProperty(b.DisplayObjectContainer.prototype,"height",{get:function(){return this.scale.y*this.getLocalBounds().height},set:function(a){var b=this.getLocalBounds().height;this.scale.y=0!==b?a/(b/this.scale.y):1,this._height=a}}),b.DisplayObjectContainer.prototype.addChild=function(a){return this.addChildAt(a,this.children.length)},b.DisplayObjectContainer.prototype.addChildAt=function(a,b){if(b>=0&&b<=this.children.length)return a.parent&&a.parent.removeChild(a),a.parent=this,this.children.splice(b,0,a),this.stage&&a.setStageReference(this.stage),a;throw new Error(a+" The index "+b+" supplied is out of bounds "+this.children.length)},b.DisplayObjectContainer.prototype.swapChildren=function(a,b){if(a!==b){var c=this.children.indexOf(a),d=this.children.indexOf(b);if(0>c||0>d)throw new Error("swapChildren: Both the supplied DisplayObjects must be a child of the caller.");this.children[c]=b,this.children[d]=a}},b.DisplayObjectContainer.prototype.getChildAt=function(a){if(a>=0&&a<this.children.length)return this.children[a];throw new Error("Supplied index does not exist in the child list, or the supplied DisplayObject must be a child of the caller")},b.DisplayObjectContainer.prototype.removeChild=function(a){return this.removeChildAt(this.children.indexOf(a))},b.DisplayObjectContainer.prototype.removeChildAt=function(a){var b=this.getChildAt(a);return this.stage&&b.removeStageReference(),b.parent=void 0,this.children.splice(a,1),b},b.DisplayObjectContainer.prototype.removeChildren=function(a,b){var c=a||0,d="number"==typeof b?b:this.children.length,e=d-c;if(e>0&&d>=e){for(var f=this.children.splice(c,e),g=0;g<f.length;g++){var h=f[g];this.stage&&h.removeStageReference(),h.parent=void 0}return f}throw new Error("Range Error, numeric values are outside the acceptable range")},b.DisplayObjectContainer.prototype.updateTransform=function(){if(this.visible&&(b.DisplayObject.prototype.updateTransform.call(this),!this._cacheAsBitmap))for(var a=0,c=this.children.length;c>a;a++)this.children[a].updateTransform()},b.DisplayObjectContainer.prototype.getBounds=function(a){if(0===this.children.length)return b.EmptyRectangle;if(a){var c=this.worldTransform;this.worldTransform=a,this.updateTransform(),this.worldTransform=c}for(var d,e,f,g=1/0,h=1/0,i=-1/0,j=-1/0,k=!1,l=0,m=this.children.length;m>l;l++){var n=this.children[l];n.visible&&(k=!0,d=this.children[l].getBounds(a),g=g<d.x?g:d.x,h=h<d.y?h:d.y,e=d.width+d.x,f=d.height+d.y,i=i>e?i:e,j=j>f?j:f)}if(!k)return b.EmptyRectangle;var o=this._bounds;return o.x=g,o.y=h,o.width=i-g,o.height=j-h,o},b.DisplayObjectContainer.prototype.getLocalBounds=function(){var a=this.worldTransform;this.worldTransform=b.identityMatrix;for(var c=0,d=this.children.length;d>c;c++)this.children[c].updateTransform();var e=this.getBounds();return this.worldTransform=a,e},b.DisplayObjectContainer.prototype.setStageReference=function(a){this.stage=a,this._interactive&&(this.stage.dirty=!0);for(var b=0,c=this.children.length;c>b;b++){var d=this.children[b];d.setStageReference(a)}},b.DisplayObjectContainer.prototype.removeStageReference=function(){for(var a=0,b=this.children.length;b>a;a++){var c=this.children[a];c.removeStageReference()}this._interactive&&(this.stage.dirty=!0),this.stage=null},b.DisplayObjectContainer.prototype._renderWebGL=function(a){if(this.visible&&!(this.alpha<=0)){if(this._cacheAsBitmap)return this._renderCachedSprite(a),void 0;var b,c;if(this._mask||this._filters){for(this._filters&&(a.spriteBatch.flush(),a.filterManager.pushFilter(this._filterBlock)),this._mask&&(a.spriteBatch.stop(),a.maskManager.pushMask(this.mask,a),a.spriteBatch.start()),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a);a.spriteBatch.stop(),this._mask&&a.maskManager.popMask(this._mask,a),this._filters&&a.filterManager.popFilter(),a.spriteBatch.start()}else for(b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a)}},b.DisplayObjectContainer.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha){if(this._cacheAsBitmap)return this._renderCachedSprite(a),void 0;this._mask&&a.maskManager.pushMask(this._mask,a.context);for(var b=0,c=this.children.length;c>b;b++){var d=this.children[b];d._renderCanvas(a)}this._mask&&a.maskManager.popMask(a.context)}},b.Sprite=function(a){b.DisplayObjectContainer.call(this),this.anchor=new b.Point,this.texture=a,this._width=0,this._height=0,this.tint=16777215,this.blendMode=b.blendModes.NORMAL,a.baseTexture.hasLoaded?this.onTextureUpdate():(this.onTextureUpdateBind=this.onTextureUpdate.bind(this),this.texture.addEventListener("update",this.onTextureUpdateBind)),this.renderable=!0},b.Sprite.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Sprite.prototype.constructor=b.Sprite,Object.defineProperty(b.Sprite.prototype,"width",{get:function(){return this.scale.x*this.texture.frame.width},set:function(a){this.scale.x=a/this.texture.frame.width,this._width=a}}),Object.defineProperty(b.Sprite.prototype,"height",{get:function(){return this.scale.y*this.texture.frame.height},set:function(a){this.scale.y=a/this.texture.frame.height,this._height=a}}),b.Sprite.prototype.setTexture=function(a){this.texture=a,this.cachedTint=16777215},b.Sprite.prototype.onTextureUpdate=function(){this._width&&(this.scale.x=this._width/this.texture.frame.width),this._height&&(this.scale.y=this._height/this.texture.frame.height)},b.Sprite.prototype.getBounds=function(a){var b=this.texture.frame.width,c=this.texture.frame.height,d=b*(1-this.anchor.x),e=b*-this.anchor.x,f=c*(1-this.anchor.y),g=c*-this.anchor.y,h=a||this.worldTransform,i=h.a,j=h.c,k=h.b,l=h.d,m=h.tx,n=h.ty,o=i*e+k*g+m,p=l*g+j*e+n,q=i*d+k*g+m,r=l*g+j*d+n,s=i*d+k*f+m,t=l*f+j*d+n,u=i*e+k*f+m,v=l*f+j*e+n,w=-1/0,x=-1/0,y=1/0,z=1/0;y=y>o?o:y,y=y>q?q:y,y=y>s?s:y,y=y>u?u:y,z=z>p?p:z,z=z>r?r:z,z=z>t?t:z,z=z>v?v:z,w=o>w?o:w,w=q>w?q:w,w=s>w?s:w,w=u>w?u:w,x=p>x?p:x,x=r>x?r:x,x=t>x?t:x,x=v>x?v:x;var A=this._bounds;return A.x=y,A.width=w-y,A.y=z,A.height=x-z,this._currentBounds=A,A},b.Sprite.prototype._renderWebGL=function(a){if(this.visible&&!(this.alpha<=0)){var b,c;if(this._mask||this._filters){var d=a.spriteBatch;for(this._filters&&(d.flush(),a.filterManager.pushFilter(this._filterBlock)),this._mask&&(d.stop(),a.maskManager.pushMask(this.mask,a),d.start()),d.render(this),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a);d.stop(),this._mask&&a.maskManager.popMask(this._mask,a),this._filters&&a.filterManager.popFilter(),d.start()}else for(a.spriteBatch.render(this),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a)}},b.Sprite.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha){if(this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,a.context.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]),this._mask&&a.maskManager.pushMask(this._mask,a.context),this.texture.valid){a.context.globalAlpha=this.worldAlpha,a.roundPixels?a.context.setTransform(this.worldTransform.a,this.worldTransform.c,this.worldTransform.b,this.worldTransform.d,0|this.worldTransform.tx,0|this.worldTransform.ty):a.context.setTransform(this.worldTransform.a,this.worldTransform.c,this.worldTransform.b,this.worldTransform.d,this.worldTransform.tx,this.worldTransform.ty),a.smoothProperty&&a.scaleMode!==this.texture.baseTexture.scaleMode&&(a.scaleMode=this.texture.baseTexture.scaleMode,a.context[a.smoothProperty]=a.scaleMode===b.scaleModes.LINEAR);var c=this.texture.trim?this.texture.trim.x-this.anchor.x*this.texture.trim.width:this.anchor.x*-this.texture.frame.width,d=this.texture.trim?this.texture.trim.y-this.anchor.y*this.texture.trim.height:this.anchor.y*-this.texture.frame.height;16777215!==this.tint?(this.cachedTint!==this.tint&&(this.cachedTint=this.tint,this.tintedTexture=b.CanvasTinter.getTintedTexture(this,this.tint)),a.context.drawImage(this.tintedTexture,0,0,this.texture.crop.width,this.texture.crop.height,c,d,this.texture.crop.width,this.texture.crop.height)):a.context.drawImage(this.texture.baseTexture.source,this.texture.crop.x,this.texture.crop.y,this.texture.crop.width,this.texture.crop.height,c,d,this.texture.crop.width,this.texture.crop.height)}for(var e=0,f=this.children.length;f>e;e++)this.children[e]._renderCanvas(a);this._mask&&a.maskManager.popMask(a.context)}},b.Sprite.fromFrame=function(a){var c=b.TextureCache[a];if(!c)throw new Error('The frameId "'+a+'" does not exist in the texture cache'+this);return new b.Sprite(c)},b.Sprite.fromImage=function(a,c,d){var e=b.Texture.fromImage(a,c,d);return new b.Sprite(e)},b.SpriteBatch=function(a){b.DisplayObjectContainer.call(this),this.textureThing=a,this.ready=!1},b.SpriteBatch.prototype=Object.create(b.DisplayObjectContainer.prototype),b.SpriteBatch.constructor=b.SpriteBatch,b.SpriteBatch.prototype.initWebGL=function(a){this.fastSpriteBatch=new b.WebGLFastSpriteBatch(a),this.ready=!0},b.SpriteBatch.prototype.updateTransform=function(){b.DisplayObject.prototype.updateTransform.call(this)},b.SpriteBatch.prototype._renderWebGL=function(a){!this.visible||this.alpha<=0||!this.children.length||(this.ready||this.initWebGL(a.gl),a.spriteBatch.stop(),a.shaderManager.setShader(a.shaderManager.fastShader),this.fastSpriteBatch.begin(this,a),this.fastSpriteBatch.render(this),a.spriteBatch.start())},b.SpriteBatch.prototype._renderCanvas=function(a){var c=a.context;c.globalAlpha=this.worldAlpha,b.DisplayObject.prototype.updateTransform.call(this);for(var d=this.worldTransform,e=!0,f=0;f<this.children.length;f++){var g=this.children[f];if(g.visible){var h=g.texture,i=h.frame;if(c.globalAlpha=this.worldAlpha*g.alpha,g.rotation%(2*Math.PI)===0)e&&(c.setTransform(d.a,d.c,d.b,d.d,d.tx,d.ty),e=!1),c.drawImage(h.baseTexture.source,i.x,i.y,i.width,i.height,g.anchor.x*-i.width*g.scale.x+g.position.x+.5|0,g.anchor.y*-i.height*g.scale.y+g.position.y+.5|0,i.width*g.scale.x,i.height*g.scale.y);else{e||(e=!0),b.DisplayObject.prototype.updateTransform.call(g);var j=g.worldTransform;a.roundPixels?c.setTransform(j.a,j.c,j.b,j.d,0|j.tx,0|j.ty):c.setTransform(j.a,j.c,j.b,j.d,j.tx,j.ty),c.drawImage(h.baseTexture.source,i.x,i.y,i.width,i.height,g.anchor.x*-i.width+.5|0,g.anchor.y*-i.height+.5|0,i.width,i.height)}}}},b.MovieClip=function(a){b.Sprite.call(this,a[0]),this.textures=a,this.animationSpeed=1,this.loop=!0,this.onComplete=null,this.currentFrame=0,this.playing=!1},b.MovieClip.prototype=Object.create(b.Sprite.prototype),b.MovieClip.prototype.constructor=b.MovieClip,Object.defineProperty(b.MovieClip.prototype,"totalFrames",{get:function(){return this.textures.length}}),b.MovieClip.prototype.stop=function(){this.playing=!1},b.MovieClip.prototype.play=function(){this.playing=!0},b.MovieClip.prototype.gotoAndStop=function(a){this.playing=!1,this.currentFrame=a;var b=this.currentFrame+.5|0;this.setTexture(this.textures[b%this.textures.length])},b.MovieClip.prototype.gotoAndPlay=function(a){this.currentFrame=a,this.playing=!0},b.MovieClip.prototype.updateTransform=function(){if(b.Sprite.prototype.updateTransform.call(this),this.playing){this.currentFrame+=this.animationSpeed;var a=this.currentFrame+.5|0;this.currentFrame=this.currentFrame%this.textures.length,this.loop||a<this.textures.length?this.setTexture(this.textures[a%this.textures.length]):a>=this.textures.length&&(this.gotoAndStop(this.textures.length-1),this.onComplete&&this.onComplete())}},b.MovieClip.fromFrames=function(a){for(var c=[],d=0;d<a.length;d++)c.push(new b.Texture.fromFrame(a[d]));return new b.MovieClip(c)},b.MovieClip.fromImages=function(a){for(var c=[],d=0;d<a.length;d++)c.push(new b.Texture.fromImage(a[d]));return new b.MovieClip(c)},b.FilterBlock=function(){this.visible=!0,this.renderable=!0},b.Text=function(a,c){this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),b.Sprite.call(this,b.Texture.fromCanvas(this.canvas)),this.setText(a),this.setStyle(c)},b.Text.prototype=Object.create(b.Sprite.prototype),b.Text.prototype.constructor=b.Text,Object.defineProperty(b.Text.prototype,"width",{get:function(){return this.dirty&&(this.updateText(),this.dirty=!1),this.scale.x*this.texture.frame.width},set:function(a){this.scale.x=a/this.texture.frame.width,this._width=a}}),Object.defineProperty(b.Text.prototype,"height",{get:function(){return this.dirty&&(this.updateText(),this.dirty=!1),this.scale.y*this.texture.frame.height},set:function(a){this.scale.y=a/this.texture.frame.height,this._height=a}}),b.Text.prototype.setStyle=function(a){a=a||{},a.font=a.font||"bold 20pt Arial",a.fill=a.fill||"black",a.align=a.align||"left",a.stroke=a.stroke||"black",a.strokeThickness=a.strokeThickness||0,a.wordWrap=a.wordWrap||!1,a.wordWrapWidth=a.wordWrapWidth||100,a.wordWrapWidth=a.wordWrapWidth||100,a.dropShadow=a.dropShadow||!1,a.dropShadowAngle=a.dropShadowAngle||Math.PI/6,a.dropShadowDistance=a.dropShadowDistance||4,a.dropShadowColor=a.dropShadowColor||"black",this.style=a,this.dirty=!0},b.Text.prototype.setText=function(a){this.text=a.toString()||" ",this.dirty=!0},b.Text.prototype.updateText=function(){this.context.font=this.style.font;var a=this.text;this.style.wordWrap&&(a=this.wordWrap(this.text));for(var b=a.split(/(?:\r\n|\r|\n)/),c=[],d=0,e=0;e<b.length;e++){var f=this.context.measureText(b[e]).width;c[e]=f,d=Math.max(d,f)}var g=d+this.style.strokeThickness;this.style.dropShadow&&(g+=this.style.dropShadowDistance),this.canvas.width=g+this.context.lineWidth;var h=this.determineFontHeight("font: "+this.style.font+";")+this.style.strokeThickness,i=h*b.length;this.style.dropShadow&&(i+=this.style.dropShadowDistance),this.canvas.height=i,navigator.isCocoonJS&&this.context.clearRect(0,0,this.canvas.width,this.canvas.height),this.context.font=this.style.font,this.context.strokeStyle=this.style.stroke,this.context.lineWidth=this.style.strokeThickness,this.context.textBaseline="top";var j,k;if(this.style.dropShadow){this.context.fillStyle=this.style.dropShadowColor;var l=Math.sin(this.style.dropShadowAngle)*this.style.dropShadowDistance,m=Math.cos(this.style.dropShadowAngle)*this.style.dropShadowDistance;for(e=0;e<b.length;e++)j=this.style.strokeThickness/2,k=this.style.strokeThickness/2+e*h,"right"===this.style.align?j+=d-c[e]:"center"===this.style.align&&(j+=(d-c[e])/2),this.style.fill&&this.context.fillText(b[e],j+l,k+m)}for(this.context.fillStyle=this.style.fill,e=0;e<b.length;e++)j=this.style.strokeThickness/2,k=this.style.strokeThickness/2+e*h,"right"===this.style.align?j+=d-c[e]:"center"===this.style.align&&(j+=(d-c[e])/2),this.style.stroke&&this.style.strokeThickness&&this.context.strokeText(b[e],j,k),this.style.fill&&this.context.fillText(b[e],j,k);this.updateTexture()},b.Text.prototype.updateTexture=function(){this.texture.baseTexture.width=this.canvas.width,this.texture.baseTexture.height=this.canvas.height,this.texture.crop.width=this.texture.frame.width=this.canvas.width,this.texture.crop.height=this.texture.frame.height=this.canvas.height,this._width=this.canvas.width,this._height=this.canvas.height,this.requiresUpdate=!0},b.Text.prototype._renderWebGL=function(a){this.requiresUpdate&&(this.requiresUpdate=!1,b.updateWebGLTexture(this.texture.baseTexture,a.gl)),b.Sprite.prototype._renderWebGL.call(this,a)},b.Text.prototype.updateTransform=function(){this.dirty&&(this.updateText(),this.dirty=!1),b.Sprite.prototype.updateTransform.call(this)},b.Text.prototype.determineFontHeight=function(a){var c=b.Text.heightCache[a];if(!c){var d=document.getElementsByTagName("body")[0],e=document.createElement("div"),f=document.createTextNode("M");e.appendChild(f),e.setAttribute("style",a+";position:absolute;top:0;left:0"),d.appendChild(e),c=e.offsetHeight,b.Text.heightCache[a]=c,d.removeChild(e)}return c},b.Text.prototype.wordWrap=function(a){for(var b="",c=a.split("\n"),d=0;d<c.length;d++){for(var e=this.style.wordWrapWidth,f=c[d].split(" "),g=0;g<f.length;g++){var h=this.context.measureText(f[g]).width,i=h+this.context.measureText(" ").width;0===g||i>e?(g>0&&(b+="\n"),b+=f[g],e=this.style.wordWrapWidth-h):(e-=i,b+=" "+f[g])}d<c.length-1&&(b+="\n")}return b},b.Text.prototype.destroy=function(a){this.context=null,this.canvas=null,this.texture.destroy(void 0===a?!0:a)},b.Text.heightCache={},b.BitmapText=function(a,c){b.DisplayObjectContainer.call(this),this._pool=[],this.setText(a),this.setStyle(c),this.updateText(),this.dirty=!1},b.BitmapText.prototype=Object.create(b.DisplayObjectContainer.prototype),b.BitmapText.prototype.constructor=b.BitmapText,b.BitmapText.prototype.setText=function(a){this.text=a||" ",this.dirty=!0},b.BitmapText.prototype.setStyle=function(a){a=a||{},a.align=a.align||"left",this.style=a;var c=a.font.split(" ");this.fontName=c[c.length-1],this.fontSize=c.length>=2?parseInt(c[c.length-2],10):b.BitmapText.fonts[this.fontName].size,this.dirty=!0,this.tint=a.tint},b.BitmapText.prototype.updateText=function(){for(var a=b.BitmapText.fonts[this.fontName],c=new b.Point,d=null,e=[],f=0,g=[],h=0,i=this.fontSize/a.size,j=0;j<this.text.length;j++){var k=this.text.charCodeAt(j);if(/(?:\r\n|\r|\n)/.test(this.text.charAt(j)))g.push(c.x),f=Math.max(f,c.x),h++,c.x=0,c.y+=a.lineHeight,d=null;else{var l=a.chars[k];l&&(d&&l[d]&&(c.x+=l.kerning[d]),e.push({texture:l.texture,line:h,charCode:k,position:new b.Point(c.x+l.xOffset,c.y+l.yOffset)}),c.x+=l.xAdvance,d=k)}}g.push(c.x),f=Math.max(f,c.x);var m=[];for(j=0;h>=j;j++){var n=0;"right"===this.style.align?n=f-g[j]:"center"===this.style.align&&(n=(f-g[j])/2),m.push(n)}var o=this.children.length,p=e.length,q=this.tint||16777215;for(j=0;p>j;j++){var r=o>j?this.children[j]:this._pool.pop();r?r.setTexture(e[j].texture):r=new b.Sprite(e[j].texture),r.position.x=(e[j].position.x+m[e[j].line])*i,r.position.y=e[j].position.y*i,r.scale.x=r.scale.y=i,r.tint=q,r.parent||this.addChild(r)}for(;this.children.length>p;){var s=this.getChildAt(this.children.length-1);this._pool.push(s),this.removeChild(s)}this.textWidth=f*i,this.textHeight=(c.y+a.lineHeight)*i},b.BitmapText.prototype.updateTransform=function(){this.dirty&&(this.updateText(),this.dirty=!1),b.DisplayObjectContainer.prototype.updateTransform.call(this)},b.BitmapText.fonts={},b.InteractionData=function(){this.global=new b.Point,this.target=null,this.originalEvent=null},b.InteractionData.prototype.getLocalPosition=function(a){var c=a.worldTransform,d=this.global,e=c.a,f=c.b,g=c.tx,h=c.c,i=c.d,j=c.ty,k=1/(e*i+f*-h);return new b.Point(i*k*d.x+-f*k*d.y+(j*f-g*i)*k,e*k*d.y+-h*k*d.x+(-j*e+g*h)*k)},b.InteractionData.prototype.constructor=b.InteractionData,b.InteractionManager=function(a){this.stage=a,this.mouse=new b.InteractionData,this.touchs={},this.tempPoint=new b.Point,this.mouseoverEnabled=!0,this.pool=[],this.interactiveItems=[],this.interactionDOMElement=null,this.onMouseMove=this.onMouseMove.bind(this),this.onMouseDown=this.onMouseDown.bind(this),this.onMouseOut=this.onMouseOut.bind(this),this.onMouseUp=this.onMouseUp.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.last=0,this.currentCursorStyle="inherit",this.mouseOut=!1},b.InteractionManager.prototype.constructor=b.InteractionManager,b.InteractionManager.prototype.collectInteractiveSprite=function(a,b){for(var c=a.children,d=c.length,e=d-1;e>=0;e--){var f=c[e];f._interactive?(b.interactiveChildren=!0,this.interactiveItems.push(f),f.children.length>0&&this.collectInteractiveSprite(f,f)):(f.__iParent=null,f.children.length>0&&this.collectInteractiveSprite(f,b))}},b.InteractionManager.prototype.setTarget=function(a){this.target=a,null===this.interactionDOMElement&&this.setTargetDomElement(a.view)},b.InteractionManager.prototype.setTargetDomElement=function(a){this.removeEvents(),window.navigator.msPointerEnabled&&(a.style["-ms-content-zooming"]="none",a.style["-ms-touch-action"]="none"),this.interactionDOMElement=a,a.addEventListener("mousemove",this.onMouseMove,!0),a.addEventListener("mousedown",this.onMouseDown,!0),a.addEventListener("mouseout",this.onMouseOut,!0),a.addEventListener("touchstart",this.onTouchStart,!0),a.addEventListener("touchend",this.onTouchEnd,!0),a.addEventListener("touchmove",this.onTouchMove,!0),window.addEventListener("mouseup",this.onMouseUp,!0)},b.InteractionManager.prototype.removeEvents=function(){this.interactionDOMElement&&(this.interactionDOMElement.style["-ms-content-zooming"]="",this.interactionDOMElement.style["-ms-touch-action"]="",this.interactionDOMElement.removeEventListener("mousemove",this.onMouseMove,!0),this.interactionDOMElement.removeEventListener("mousedown",this.onMouseDown,!0),this.interactionDOMElement.removeEventListener("mouseout",this.onMouseOut,!0),this.interactionDOMElement.removeEventListener("touchstart",this.onTouchStart,!0),this.interactionDOMElement.removeEventListener("touchend",this.onTouchEnd,!0),this.interactionDOMElement.removeEventListener("touchmove",this.onTouchMove,!0),this.interactionDOMElement=null,window.removeEventListener("mouseup",this.onMouseUp,!0))},b.InteractionManager.prototype.update=function(){if(this.target){var a=Date.now(),c=a-this.last;if(c=c*b.INTERACTION_FREQUENCY/1e3,!(1>c)){this.last=a;var d=0;this.dirty&&this.rebuildInteractiveGraph();var e=this.interactiveItems.length,f="inherit",g=!1;for(d=0;e>d;d++){var h=this.interactiveItems[d];h.__hit=this.hitTest(h,this.mouse),this.mouse.target=h,h.__hit&&!g?(h.buttonMode&&(f=h.defaultCursor),h.interactiveChildren||(g=!0),h.__isOver||(h.mouseover&&h.mouseover(this.mouse),h.__isOver=!0)):h.__isOver&&(h.mouseout&&h.mouseout(this.mouse),h.__isOver=!1)}this.currentCursorStyle!==f&&(this.currentCursorStyle=f,this.interactionDOMElement.style.cursor=f)}}},b.InteractionManager.prototype.rebuildInteractiveGraph=function(){this.dirty=!1;for(var a=this.interactiveItems.length,b=0;a>b;b++)this.interactiveItems[b].interactiveChildren=!1;this.interactiveItems=[],this.stage.interactive&&this.interactiveItems.push(this.stage),this.collectInteractiveSprite(this.stage,this.stage)},b.InteractionManager.prototype.onMouseMove=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a||window.event;var b=this.interactionDOMElement.getBoundingClientRect();this.mouse.global.x=(a.clientX-b.left)*(this.target.width/b.width),this.mouse.global.y=(a.clientY-b.top)*(this.target.height/b.height);for(var c=this.interactiveItems.length,d=0;c>d;d++){var e=this.interactiveItems[d];e.mousemove&&e.mousemove(this.mouse)}},b.InteractionManager.prototype.onMouseDown=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a||window.event,b.AUTO_PREVENT_DEFAULT&&this.mouse.originalEvent.preventDefault();for(var c=this.interactiveItems.length,d=0;c>d;d++){var e=this.interactiveItems[d];if((e.mousedown||e.click)&&(e.__mouseIsDown=!0,e.__hit=this.hitTest(e,this.mouse),e.__hit&&(e.mousedown&&e.mousedown(this.mouse),e.__isDown=!0,!e.interactiveChildren)))break}},b.InteractionManager.prototype.onMouseOut=function(){this.dirty&&this.rebuildInteractiveGraph();var a=this.interactiveItems.length;this.interactionDOMElement.style.cursor="inherit";for(var b=0;a>b;b++){var c=this.interactiveItems[b];c.__isOver&&(this.mouse.target=c,c.mouseout&&c.mouseout(this.mouse),c.__isOver=!1)}this.mouseOut=!0,this.mouse.global.x=-1e4,this.mouse.global.y=-1e4},b.InteractionManager.prototype.onMouseUp=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a||window.event;
for(var b=this.interactiveItems.length,c=!1,d=0;b>d;d++){var e=this.interactiveItems[d];e.__hit=this.hitTest(e,this.mouse),e.__hit&&!c?(e.mouseup&&e.mouseup(this.mouse),e.__isDown&&e.click&&e.click(this.mouse),e.interactiveChildren||(c=!0)):e.__isDown&&e.mouseupoutside&&e.mouseupoutside(this.mouse),e.__isDown=!1}},b.InteractionManager.prototype.hitTest=function(a,c){var d=c.global;if(!a.worldVisible)return!1;var e=a instanceof b.Sprite,f=a.worldTransform,g=f.a,h=f.b,i=f.tx,j=f.c,k=f.d,l=f.ty,m=1/(g*k+h*-j),n=k*m*d.x+-h*m*d.y+(l*h-i*k)*m,o=g*m*d.y+-j*m*d.x+(-l*g+i*j)*m;if(c.target=a,a.hitArea&&a.hitArea.contains)return a.hitArea.contains(n,o)?(c.target=a,!0):!1;if(e){var p,q=a.texture.frame.width,r=a.texture.frame.height,s=-q*a.anchor.x;if(n>s&&s+q>n&&(p=-r*a.anchor.y,o>p&&p+r>o))return c.target=a,!0}for(var t=a.children.length,u=0;t>u;u++){var v=a.children[u],w=this.hitTest(v,c);if(w)return c.target=a,!0}return!1},b.InteractionManager.prototype.onTouchMove=function(a){this.dirty&&this.rebuildInteractiveGraph();var b,c=this.interactionDOMElement.getBoundingClientRect(),d=a.changedTouches,e=0;for(e=0;e<d.length;e++){var f=d[e];b=this.touchs[f.identifier],b.originalEvent=a||window.event,b.global.x=(f.clientX-c.left)*(this.target.width/c.width),b.global.y=(f.clientY-c.top)*(this.target.height/c.height),navigator.isCocoonJS&&(b.global.x=f.clientX,b.global.y=f.clientY);for(var g=0;g<this.interactiveItems.length;g++){var h=this.interactiveItems[g];h.touchmove&&h.__touchData&&h.__touchData[f.identifier]&&h.touchmove(b)}}},b.InteractionManager.prototype.onTouchStart=function(a){this.dirty&&this.rebuildInteractiveGraph();var c=this.interactionDOMElement.getBoundingClientRect();b.AUTO_PREVENT_DEFAULT&&a.preventDefault();for(var d=a.changedTouches,e=0;e<d.length;e++){var f=d[e],g=this.pool.pop();g||(g=new b.InteractionData),g.originalEvent=a||window.event,this.touchs[f.identifier]=g,g.global.x=(f.clientX-c.left)*(this.target.width/c.width),g.global.y=(f.clientY-c.top)*(this.target.height/c.height),navigator.isCocoonJS&&(g.global.x=f.clientX,g.global.y=f.clientY);for(var h=this.interactiveItems.length,i=0;h>i;i++){var j=this.interactiveItems[i];if((j.touchstart||j.tap)&&(j.__hit=this.hitTest(j,g),j.__hit&&(j.touchstart&&j.touchstart(g),j.__isDown=!0,j.__touchData=j.__touchData||{},j.__touchData[f.identifier]=g,!j.interactiveChildren)))break}}},b.InteractionManager.prototype.onTouchEnd=function(a){this.dirty&&this.rebuildInteractiveGraph();for(var b=this.interactionDOMElement.getBoundingClientRect(),c=a.changedTouches,d=0;d<c.length;d++){var e=c[d],f=this.touchs[e.identifier],g=!1;f.global.x=(e.clientX-b.left)*(this.target.width/b.width),f.global.y=(e.clientY-b.top)*(this.target.height/b.height),navigator.isCocoonJS&&(f.global.x=e.clientX,f.global.y=e.clientY);for(var h=this.interactiveItems.length,i=0;h>i;i++){var j=this.interactiveItems[i];j.__touchData&&j.__touchData[e.identifier]&&(j.__hit=this.hitTest(j,j.__touchData[e.identifier]),f.originalEvent=a||window.event,(j.touchend||j.tap)&&(j.__hit&&!g?(j.touchend&&j.touchend(f),j.__isDown&&j.tap&&j.tap(f),j.interactiveChildren||(g=!0)):j.__isDown&&j.touchendoutside&&j.touchendoutside(f),j.__isDown=!1),j.__touchData[e.identifier]=null)}this.pool.push(f),this.touchs[e.identifier]=null}},b.Stage=function(a){b.DisplayObjectContainer.call(this),this.worldTransform=new b.Matrix,this.interactive=!0,this.interactionManager=new b.InteractionManager(this),this.dirty=!0,this.stage=this,this.stage.hitArea=new b.Rectangle(0,0,1e5,1e5),this.setBackgroundColor(a)},b.Stage.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Stage.prototype.constructor=b.Stage,b.Stage.prototype.setInteractionDelegate=function(a){this.interactionManager.setTargetDomElement(a)},b.Stage.prototype.updateTransform=function(){this.worldAlpha=1;for(var a=0,b=this.children.length;b>a;a++)this.children[a].updateTransform();this.dirty&&(this.dirty=!1,this.interactionManager.dirty=!0),this.interactive&&this.interactionManager.update()},b.Stage.prototype.setBackgroundColor=function(a){this.backgroundColor=a||0,this.backgroundColorSplit=b.hex2rgb(this.backgroundColor);var c=this.backgroundColor.toString(16);c="000000".substr(0,6-c.length)+c,this.backgroundColorString="#"+c},b.Stage.prototype.getMousePosition=function(){return this.interactionManager.mouse.global};for(var c=0,d=["ms","moz","webkit","o"],e=0;e<d.length&&!window.requestAnimationFrame;++e)window.requestAnimationFrame=window[d[e]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[d[e]+"CancelAnimationFrame"]||window[d[e]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(a){var b=(new Date).getTime(),d=Math.max(0,16-(b-c)),e=window.setTimeout(function(){a(b+d)},d);return c=b+d,e}),window.cancelAnimationFrame||(window.cancelAnimationFrame=function(a){clearTimeout(a)}),window.requestAnimFrame=window.requestAnimationFrame,b.hex2rgb=function(a){return[(a>>16&255)/255,(a>>8&255)/255,(255&a)/255]},b.rgb2hex=function(a){return(255*a[0]<<16)+(255*a[1]<<8)+255*a[2]},"function"!=typeof Function.prototype.bind&&(Function.prototype.bind=function(){var a=Array.prototype.slice;return function(b){function c(){var f=e.concat(a.call(arguments));d.apply(this instanceof c?this:b,f)}var d=this,e=a.call(arguments,1);if("function"!=typeof d)throw new TypeError;return c.prototype=function f(a){return a&&(f.prototype=a),this instanceof f?void 0:new f}(d.prototype),c}}()),b.AjaxRequest=function(){var a=["Msxml2.XMLHTTP.6.0","Msxml2.XMLHTTP.3.0","Microsoft.XMLHTTP"];if(!window.ActiveXObject)return window.XMLHttpRequest?new window.XMLHttpRequest:!1;for(var b=0;b<a.length;b++)try{return new window.ActiveXObject(a[b])}catch(c){}},b.canUseNewCanvasBlendModes=function(){var a=document.createElement("canvas");a.width=1,a.height=1;var b=a.getContext("2d");return b.fillStyle="#000",b.fillRect(0,0,1,1),b.globalCompositeOperation="multiply",b.fillStyle="#fff",b.fillRect(0,0,1,1),0===b.getImageData(0,0,1,1).data[0]},b.getNextPowerOfTwo=function(a){if(a>0&&0===(a&a-1))return a;for(var b=1;a>b;)b<<=1;return b},b.EventTarget=function(){var a={};this.addEventListener=this.on=function(b,c){void 0===a[b]&&(a[b]=[]),-1===a[b].indexOf(c)&&a[b].unshift(c)},this.dispatchEvent=this.emit=function(b){if(a[b.type]&&a[b.type].length)for(var c=a[b.type].length-1;c>=0;c--)a[b.type][c](b)},this.removeEventListener=this.off=function(b,c){if(void 0!==a[b]){var d=a[b].indexOf(c);-1!==d&&a[b].splice(d,1)}},this.removeAllEventListeners=function(b){var c=a[b];c&&(c.length=0)}},b.autoDetectRenderer=function(a,c,d,e,f){a||(a=800),c||(c=600);var g=function(){try{var a=document.createElement("canvas");return!!window.WebGLRenderingContext&&(a.getContext("webgl")||a.getContext("experimental-webgl"))}catch(b){return!1}}();return g?new b.WebGLRenderer(a,c,d,e,f):new b.CanvasRenderer(a,c,d,e)},b.autoDetectRecommendedRenderer=function(a,c,d,e,f){a||(a=800),c||(c=600);var g=function(){try{var a=document.createElement("canvas");return!!window.WebGLRenderingContext&&(a.getContext("webgl")||a.getContext("experimental-webgl"))}catch(b){return!1}}(),h=/Android/i.test(navigator.userAgent);return g&&!h?new b.WebGLRenderer(a,c,d,e,f):new b.CanvasRenderer(a,c,d,e)},b.PolyK={},b.PolyK.Triangulate=function(a){var c=!0,d=a.length>>1;if(3>d)return[];for(var e=[],f=[],g=0;d>g;g++)f.push(g);g=0;for(var h=d;h>3;){var i=f[(g+0)%h],j=f[(g+1)%h],k=f[(g+2)%h],l=a[2*i],m=a[2*i+1],n=a[2*j],o=a[2*j+1],p=a[2*k],q=a[2*k+1],r=!1;if(b.PolyK._convex(l,m,n,o,p,q,c)){r=!0;for(var s=0;h>s;s++){var t=f[s];if(t!==i&&t!==j&&t!==k&&b.PolyK._PointInTriangle(a[2*t],a[2*t+1],l,m,n,o,p,q)){r=!1;break}}}if(r)e.push(i,j,k),f.splice((g+1)%h,1),h--,g=0;else if(g++>3*h){if(!c)return window.console.log("PIXI Warning: shape too complex to fill"),[];for(e=[],f=[],g=0;d>g;g++)f.push(g);g=0,h=d,c=!1}}return e.push(f[0],f[1],f[2]),e},b.PolyK._PointInTriangle=function(a,b,c,d,e,f,g,h){var i=g-c,j=h-d,k=e-c,l=f-d,m=a-c,n=b-d,o=i*i+j*j,p=i*k+j*l,q=i*m+j*n,r=k*k+l*l,s=k*m+l*n,t=1/(o*r-p*p),u=(r*q-p*s)*t,v=(o*s-p*q)*t;return u>=0&&v>=0&&1>u+v},b.PolyK._convex=function(a,b,c,d,e,f,g){return(b-d)*(e-c)+(c-a)*(f-d)>=0===g},b.initDefaultShaders=function(){},b.CompileVertexShader=function(a,c){return b._CompileShader(a,c,a.VERTEX_SHADER)},b.CompileFragmentShader=function(a,c){return b._CompileShader(a,c,a.FRAGMENT_SHADER)},b._CompileShader=function(a,b,c){var d=b.join("\n"),e=a.createShader(c);return a.shaderSource(e,d),a.compileShader(e),a.getShaderParameter(e,a.COMPILE_STATUS)?e:(window.console.log(a.getShaderInfoLog(e)),null)},b.compileProgram=function(a,c,d){var e=b.CompileFragmentShader(a,d),f=b.CompileVertexShader(a,c),g=a.createProgram();return a.attachShader(g,f),a.attachShader(g,e),a.linkProgram(g),a.getProgramParameter(g,a.LINK_STATUS)||window.console.log("Could not initialise shaders"),g},b.PixiShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision lowp float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;","}"],this.textureCount=0,this.attributes=[],this.init()},b.PixiShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc||b.PixiShader.defaultVertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.dimensions=a.getUniformLocation(c,"dimensions"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.colorAttribute=a.getAttribLocation(c,"aColor"),-1===this.colorAttribute&&(this.colorAttribute=2),this.attributes=[this.aVertexPosition,this.aTextureCoord,this.colorAttribute];for(var d in this.uniforms)this.uniforms[d].uniformLocation=a.getUniformLocation(c,d);this.initUniforms(),this.program=c},b.PixiShader.prototype.initUniforms=function(){this.textureCount=1;var a,b=this.gl;for(var c in this.uniforms){a=this.uniforms[c];var d=a.type;"sampler2D"===d?(a._init=!1,null!==a.value&&this.initSampler2D(a)):"mat2"===d||"mat3"===d||"mat4"===d?(a.glMatrix=!0,a.glValueLength=1,"mat2"===d?a.glFunc=b.uniformMatrix2fv:"mat3"===d?a.glFunc=b.uniformMatrix3fv:"mat4"===d&&(a.glFunc=b.uniformMatrix4fv)):(a.glFunc=b["uniform"+d],a.glValueLength="2f"===d||"2i"===d?2:"3f"===d||"3i"===d?3:"4f"===d||"4i"===d?4:1)}},b.PixiShader.prototype.initSampler2D=function(a){if(a.value&&a.value.baseTexture&&a.value.baseTexture.hasLoaded){var b=this.gl;if(b.activeTexture(b["TEXTURE"+this.textureCount]),b.bindTexture(b.TEXTURE_2D,a.value.baseTexture._glTextures[b.id]),a.textureData){var c=a.textureData,d=c.magFilter?c.magFilter:b.LINEAR,e=c.minFilter?c.minFilter:b.LINEAR,f=c.wrapS?c.wrapS:b.CLAMP_TO_EDGE,g=c.wrapT?c.wrapT:b.CLAMP_TO_EDGE,h=c.luminance?b.LUMINANCE:b.RGBA;if(c.repeat&&(f=b.REPEAT,g=b.REPEAT),b.pixelStorei(b.UNPACK_FLIP_Y_WEBGL,!!c.flipY),c.width){var i=c.width?c.width:512,j=c.height?c.height:2,k=c.border?c.border:0;b.texImage2D(b.TEXTURE_2D,0,h,i,j,k,h,b.UNSIGNED_BYTE,null)}else b.texImage2D(b.TEXTURE_2D,0,h,b.RGBA,b.UNSIGNED_BYTE,a.value.baseTexture.source);b.texParameteri(b.TEXTURE_2D,b.TEXTURE_MAG_FILTER,d),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_MIN_FILTER,e),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_WRAP_S,f),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_WRAP_T,g)}b.uniform1i(a.uniformLocation,this.textureCount),a._init=!0,this.textureCount++}},b.PixiShader.prototype.syncUniforms=function(){this.textureCount=1;var a,c=this.gl;for(var d in this.uniforms)a=this.uniforms[d],1===a.glValueLength?a.glMatrix===!0?a.glFunc.call(c,a.uniformLocation,a.transpose,a.value):a.glFunc.call(c,a.uniformLocation,a.value):2===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y):3===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y,a.value.z):4===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y,a.value.z,a.value.w):"sampler2D"===a.type&&(a._init?(c.activeTexture(c["TEXTURE"+this.textureCount]),c.bindTexture(c.TEXTURE_2D,a.value.baseTexture._glTextures[c.id]||b.createWebGLTexture(a.value.baseTexture,c)),c.uniform1i(a.uniformLocation,this.textureCount),this.textureCount++):this.initSampler2D(a))},b.PixiShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attributes=null},b.PixiShader.defaultVertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","attribute vec2 aColor;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","varying vec2 vTextureCoord;","varying vec4 vColor;","const vec2 center = vec2(-1.0, 1.0);","void main(void) {","   gl_Position = vec4( ((aVertexPosition + offsetVector) / projectionVector) + center , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;","   vColor = vec4(color * aColor.x, aColor.x);","}"],b.PixiFastShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision lowp float;","varying vec2 vTextureCoord;","varying float vColor;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aPositionCoord;","attribute vec2 aScale;","attribute float aRotation;","attribute vec2 aTextureCoord;","attribute float aColor;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform mat3 uMatrix;","varying vec2 vTextureCoord;","varying float vColor;","const vec2 center = vec2(-1.0, 1.0);","void main(void) {","   vec2 v;","   vec2 sv = aVertexPosition * aScale;","   v.x = (sv.x) * cos(aRotation) - (sv.y) * sin(aRotation);","   v.y = (sv.x) * sin(aRotation) + (sv.y) * cos(aRotation);","   v = ( uMatrix * vec3(v + aPositionCoord , 1.0) ).xy ;","   gl_Position = vec4( ( v / projectionVector) + center , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vColor = aColor;","}"],this.textureCount=0,this.init()},b.PixiFastShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.dimensions=a.getUniformLocation(c,"dimensions"),this.uMatrix=a.getUniformLocation(c,"uMatrix"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aPositionCoord=a.getAttribLocation(c,"aPositionCoord"),this.aScale=a.getAttribLocation(c,"aScale"),this.aRotation=a.getAttribLocation(c,"aRotation"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.colorAttribute=a.getAttribLocation(c,"aColor"),-1===this.colorAttribute&&(this.colorAttribute=2),this.attributes=[this.aVertexPosition,this.aPositionCoord,this.aScale,this.aRotation,this.aTextureCoord,this.colorAttribute],this.program=c},b.PixiFastShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attributes=null},b.StripShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","uniform float alpha;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","varying vec2 vTextureCoord;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","}"],this.init()},b.StripShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.colorAttribute=a.getAttribLocation(c,"aColor"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.attributes=[this.aVertexPosition,this.aTextureCoord],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.PrimitiveShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec4 vColor;","void main(void) {","   gl_FragColor = vColor;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec4 aColor;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform float alpha;","uniform vec3 tint;","varying vec4 vColor;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vColor = aColor * vec4(tint * alpha, alpha);","}"],this.init()},b.PrimitiveShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.tintColor=a.getUniformLocation(c,"tint"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.colorAttribute=a.getAttribLocation(c,"aColor"),this.attributes=[this.aVertexPosition,this.colorAttribute],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.PrimitiveShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attribute=null},b.ComplexPrimitiveShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec4 vColor;","void main(void) {","   gl_FragColor = vColor;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform vec3 tint;","uniform float alpha;","uniform vec3 color;","varying vec4 vColor;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vColor = vec4(color * alpha * tint, alpha);","}"],this.init()},b.ComplexPrimitiveShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.tintColor=a.getUniformLocation(c,"tint"),this.color=a.getUniformLocation(c,"color"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.attributes=[this.aVertexPosition,this.colorAttribute],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.ComplexPrimitiveShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attribute=null},b.WebGLGraphics=function(){},b.WebGLGraphics.renderGraphics=function(a,c){var d,e=c.gl,f=c.projection,g=c.offset,h=c.shaderManager.primitiveShader;a.dirty&&b.WebGLGraphics.updateGraphics(a,e);for(var i=a._webGL[e.id],j=0;j<i.data.length;j++)1===i.data[j].mode?(d=i.data[j],c.stencilManager.pushStencil(a,d,c),e.drawElements(e.TRIANGLE_FAN,4,e.UNSIGNED_SHORT,2*(d.indices.length-4)),c.stencilManager.popStencil(a,d,c),this.last=d.mode):(d=i.data[j],c.shaderManager.setShader(h),h=c.shaderManager.primitiveShader,e.uniformMatrix3fv(h.translationMatrix,!1,a.worldTransform.toArray(!0)),e.uniform2f(h.projectionVector,f.x,-f.y),e.uniform2f(h.offsetVector,-g.x,-g.y),e.uniform3fv(h.tintColor,b.hex2rgb(a.tint)),e.uniform1f(h.alpha,a.worldAlpha),e.bindBuffer(e.ARRAY_BUFFER,d.buffer),e.vertexAttribPointer(h.aVertexPosition,2,e.FLOAT,!1,24,0),e.vertexAttribPointer(h.colorAttribute,4,e.FLOAT,!1,24,8),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,d.indexBuffer),e.drawElements(e.TRIANGLE_STRIP,d.indices.length,e.UNSIGNED_SHORT,0))},b.WebGLGraphics.updateGraphics=function(a,c){var d=a._webGL[c.id];d||(d=a._webGL[c.id]={lastIndex:0,data:[],gl:c}),a.dirty=!1;var e;if(a.clearDirty){for(a.clearDirty=!1,e=0;e<d.data.length;e++){var f=d.data[e];f.reset(),b.WebGLGraphics.graphicsDataPool.push(f)}d.data=[],d.lastIndex=0}var g;for(e=d.lastIndex;e<a.graphicsData.length;e++){var h=a.graphicsData[e];h.type===b.Graphics.POLY?(h.fill&&h.points.length>6&&(h.points.length>10?(g=b.WebGLGraphics.switchMode(d,1),b.WebGLGraphics.buildComplexPoly(h,g)):(g=b.WebGLGraphics.switchMode(d,0),b.WebGLGraphics.buildPoly(h,g))),h.lineWidth>0&&(g=b.WebGLGraphics.switchMode(d,0),b.WebGLGraphics.buildLine(h,g))):(g=b.WebGLGraphics.switchMode(d,0),h.type===b.Graphics.RECT?b.WebGLGraphics.buildRectangle(h,g):h.type===b.Graphics.CIRC||h.type===b.Graphics.ELIP?b.WebGLGraphics.buildCircle(h,g):h.type===b.Graphics.RREC&&b.WebGLGraphics.buildRoundedRectangle(h,g)),d.lastIndex++}for(e=0;e<d.data.length;e++)g=d.data[e],g.dirty&&g.upload()},b.WebGLGraphics.switchMode=function(a,c){var d;return a.data.length?(d=a.data[a.data.length-1],(d.mode!==c||1===c)&&(d=b.WebGLGraphics.graphicsDataPool.pop()||new b.WebGLGraphicsData(a.gl),d.mode=c,a.data.push(d))):(d=b.WebGLGraphics.graphicsDataPool.pop()||new b.WebGLGraphicsData(a.gl),d.mode=c,a.data.push(d)),d.dirty=!0,d},b.WebGLGraphics.buildRectangle=function(a,c){var d=a.points,e=d[0],f=d[1],g=d[2],h=d[3];if(a.fill){var i=b.hex2rgb(a.fillColor),j=a.fillAlpha,k=i[0]*j,l=i[1]*j,m=i[2]*j,n=c.points,o=c.indices,p=n.length/6;n.push(e,f),n.push(k,l,m,j),n.push(e+g,f),n.push(k,l,m,j),n.push(e,f+h),n.push(k,l,m,j),n.push(e+g,f+h),n.push(k,l,m,j),o.push(p,p,p+1,p+2,p+3,p+3)}if(a.lineWidth){var q=a.points;a.points=[e,f,e+g,f,e+g,f+h,e,f+h,e,f],b.WebGLGraphics.buildLine(a,c),a.points=q}},b.WebGLGraphics.buildRoundedRectangle=function(a,c){var d=a.points,e=d[0],f=d[1],g=d[2],h=d[3],i=d[4],j=[];if(j.push(e,f+i),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e,f+h-i,e,f+h,e+i,f+h)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+g-i,f+h,e+g,f+h,e+g,f+h-i)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+g,f+i,e+g,f,e+g-i,f)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+i,f,e,f,e,f+i)),a.fill){var k=b.hex2rgb(a.fillColor),l=a.fillAlpha,m=k[0]*l,n=k[1]*l,o=k[2]*l,p=c.points,q=c.indices,r=p.length/6,s=b.PolyK.Triangulate(j),t=0;for(t=0;t<s.length;t+=3)q.push(s[t]+r),q.push(s[t]+r),q.push(s[t+1]+r),q.push(s[t+2]+r),q.push(s[t+2]+r);for(t=0;t<j.length;t++)p.push(j[t],j[++t],m,n,o,l)}if(a.lineWidth){var u=a.points;a.points=j,b.WebGLGraphics.buildLine(a,c),a.points=u}},b.WebGLGraphics.quadraticBezierCurve=function(a,b,c,d,e,f){function g(a,b,c){var d=b-a;return a+d*c}for(var h,i,j,k,l,m,n=20,o=[],p=0,q=0;n>=q;q++)p=q/n,h=g(a,c,p),i=g(b,d,p),j=g(c,e,p),k=g(d,f,p),l=g(h,j,p),m=g(i,k,p),o.push(l,m);return o},b.WebGLGraphics.buildCircle=function(a,c){var d=a.points,e=d[0],f=d[1],g=d[2],h=d[3],i=40,j=2*Math.PI/i,k=0;if(a.fill){var l=b.hex2rgb(a.fillColor),m=a.fillAlpha,n=l[0]*m,o=l[1]*m,p=l[2]*m,q=c.points,r=c.indices,s=q.length/6;for(r.push(s),k=0;i+1>k;k++)q.push(e,f,n,o,p,m),q.push(e+Math.sin(j*k)*g,f+Math.cos(j*k)*h,n,o,p,m),r.push(s++,s++);r.push(s-1)}if(a.lineWidth){var t=a.points;for(a.points=[],k=0;i+1>k;k++)a.points.push(e+Math.sin(j*k)*g,f+Math.cos(j*k)*h);b.WebGLGraphics.buildLine(a,c),a.points=t}},b.WebGLGraphics.buildLine=function(a,c){var d=0,e=a.points;if(0!==e.length){if(a.lineWidth%2)for(d=0;d<e.length;d++)e[d]+=.5;var f=new b.Point(e[0],e[1]),g=new b.Point(e[e.length-2],e[e.length-1]);if(f.x===g.x&&f.y===g.y){e=e.slice(),e.pop(),e.pop(),g=new b.Point(e[e.length-2],e[e.length-1]);var h=g.x+.5*(f.x-g.x),i=g.y+.5*(f.y-g.y);e.unshift(h,i),e.push(h,i)}var j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G=c.points,H=c.indices,I=e.length/2,J=e.length,K=G.length/6,L=a.lineWidth/2,M=b.hex2rgb(a.lineColor),N=a.lineAlpha,O=M[0]*N,P=M[1]*N,Q=M[2]*N;for(l=e[0],m=e[1],n=e[2],o=e[3],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,G.push(l-r,m-s,O,P,Q,N),G.push(l+r,m+s,O,P,Q,N),d=1;I-1>d;d++)l=e[2*(d-1)],m=e[2*(d-1)+1],n=e[2*d],o=e[2*d+1],p=e[2*(d+1)],q=e[2*(d+1)+1],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,t=-(o-q),u=n-p,F=Math.sqrt(t*t+u*u),t/=F,u/=F,t*=L,u*=L,x=-s+m-(-s+o),y=-r+n-(-r+l),z=(-r+l)*(-s+o)-(-r+n)*(-s+m),A=-u+q-(-u+o),B=-t+n-(-t+p),C=(-t+p)*(-u+o)-(-t+n)*(-u+q),D=x*B-A*y,Math.abs(D)<.1?(D+=10.1,G.push(n-r,o-s,O,P,Q,N),G.push(n+r,o+s,O,P,Q,N)):(j=(y*C-B*z)/D,k=(A*z-x*C)/D,E=(j-n)*(j-n)+(k-o)+(k-o),E>19600?(v=r-t,w=s-u,F=Math.sqrt(v*v+w*w),v/=F,w/=F,v*=L,w*=L,G.push(n-v,o-w),G.push(O,P,Q,N),G.push(n+v,o+w),G.push(O,P,Q,N),G.push(n-v,o-w),G.push(O,P,Q,N),J++):(G.push(j,k),G.push(O,P,Q,N),G.push(n-(j-n),o-(k-o)),G.push(O,P,Q,N)));for(l=e[2*(I-2)],m=e[2*(I-2)+1],n=e[2*(I-1)],o=e[2*(I-1)+1],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,G.push(n-r,o-s),G.push(O,P,Q,N),G.push(n+r,o+s),G.push(O,P,Q,N),H.push(K),d=0;J>d;d++)H.push(K++);H.push(K-1)}},b.WebGLGraphics.buildComplexPoly=function(a,c){var d=a.points.slice();if(!(d.length<6)){var e=c.indices;c.points=d,c.alpha=a.fillAlpha,c.color=b.hex2rgb(a.fillColor);for(var f,g,h=1/0,i=-1/0,j=1/0,k=-1/0,l=0;l<d.length;l+=2)f=d[l],g=d[l+1],h=h>f?f:h,i=f>i?f:i,j=j>g?g:j,k=g>k?g:k;d.push(h,j,i,j,i,k,h,k);var m=d.length/2;for(l=0;m>l;l++)e.push(l)}},b.WebGLGraphics.buildPoly=function(a,c){var d=a.points;if(!(d.length<6)){var e=c.points,f=c.indices,g=d.length/2,h=b.hex2rgb(a.fillColor),i=a.fillAlpha,j=h[0]*i,k=h[1]*i,l=h[2]*i,m=b.PolyK.Triangulate(d),n=e.length/6,o=0;for(o=0;o<m.length;o+=3)f.push(m[o]+n),f.push(m[o]+n),f.push(m[o+1]+n),f.push(m[o+2]+n),f.push(m[o+2]+n);for(o=0;g>o;o++)e.push(d[2*o],d[2*o+1],j,k,l,i)}},b.WebGLGraphics.graphicsDataPool=[],b.WebGLGraphicsData=function(a){this.gl=a,this.color=[0,0,0],this.points=[],this.indices=[],this.lastIndex=0,this.buffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),this.mode=1,this.alpha=1,this.dirty=!0},b.WebGLGraphicsData.prototype.reset=function(){this.points=[],this.indices=[],this.lastIndex=0},b.WebGLGraphicsData.prototype.upload=function(){var a=this.gl;this.glPoints=new Float32Array(this.points),a.bindBuffer(a.ARRAY_BUFFER,this.buffer),a.bufferData(a.ARRAY_BUFFER,this.glPoints,a.STATIC_DRAW),this.glIndicies=new Uint16Array(this.indices),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.glIndicies,a.STATIC_DRAW),this.dirty=!1},b.glContexts=[],b.WebGLRenderer=function(a,c,d,e,f,g){b.defaultRenderer||(b.sayHello("webGL"),b.defaultRenderer=this),this.type=b.WEBGL_RENDERER,this.transparent=!!e,this.preserveDrawingBuffer=g,this.width=a||800,this.height=c||600,this.view=d||document.createElement("canvas"),this.view.width=this.width,this.view.height=this.height,this.contextLost=this.handleContextLost.bind(this),this.contextRestoredLost=this.handleContextRestored.bind(this),this.view.addEventListener("webglcontextlost",this.contextLost,!1),this.view.addEventListener("webglcontextrestored",this.contextRestoredLost,!1),this.options={alpha:this.transparent,antialias:!!f,premultipliedAlpha:!!e,stencil:!0,preserveDrawingBuffer:g};var h=null;if(["experimental-webgl","webgl"].forEach(function(a){try{h=h||this.view.getContext(a,this.options)}catch(b){}},this),!h)throw new Error("This browser does not support webGL. Try using the canvas renderer"+this);this.gl=h,this.glContextId=h.id=b.WebGLRenderer.glContextId++,b.glContexts[this.glContextId]=h,b.blendModesWebGL||(b.blendModesWebGL=[],b.blendModesWebGL[b.blendModes.NORMAL]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.ADD]=[h.SRC_ALPHA,h.DST_ALPHA],b.blendModesWebGL[b.blendModes.MULTIPLY]=[h.DST_COLOR,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SCREEN]=[h.SRC_ALPHA,h.ONE],b.blendModesWebGL[b.blendModes.OVERLAY]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.DARKEN]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.LIGHTEN]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR_DODGE]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR_BURN]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.HARD_LIGHT]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SOFT_LIGHT]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.DIFFERENCE]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.EXCLUSION]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.HUE]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SATURATION]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR]=[h.ONE,h.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.LUMINOSITY]=[h.ONE,h.ONE_MINUS_SRC_ALPHA]),this.projection=new b.Point,this.projection.x=this.width/2,this.projection.y=-this.height/2,this.offset=new b.Point(0,0),this.resize(this.width,this.height),this.contextLost=!1,this.shaderManager=new b.WebGLShaderManager(h),this.spriteBatch=new b.WebGLSpriteBatch(h),this.maskManager=new b.WebGLMaskManager(h),this.filterManager=new b.WebGLFilterManager(h,this.transparent),this.stencilManager=new b.WebGLStencilManager(h),this.blendModeManager=new b.WebGLBlendModeManager(h),this.renderSession={},this.renderSession.gl=this.gl,this.renderSession.drawCount=0,this.renderSession.shaderManager=this.shaderManager,this.renderSession.maskManager=this.maskManager,this.renderSession.filterManager=this.filterManager,this.renderSession.blendModeManager=this.blendModeManager,this.renderSession.spriteBatch=this.spriteBatch,this.renderSession.stencilManager=this.stencilManager,this.renderSession.renderer=this,h.useProgram(this.shaderManager.defaultShader.program),h.disable(h.DEPTH_TEST),h.disable(h.CULL_FACE),h.enable(h.BLEND),h.colorMask(!0,!0,!0,this.transparent)},b.WebGLRenderer.prototype.constructor=b.WebGLRenderer,b.WebGLRenderer.prototype.render=function(a){if(!this.contextLost){this.__stage!==a&&(a.interactive&&a.interactionManager.removeEvents(),this.__stage=a),b.WebGLRenderer.updateTextures(),a.updateTransform(),a._interactive&&(a._interactiveEventsAdded||(a._interactiveEventsAdded=!0,a.interactionManager.setTarget(this)));var c=this.gl;c.viewport(0,0,this.width,this.height),c.bindFramebuffer(c.FRAMEBUFFER,null),this.transparent?c.clearColor(0,0,0,0):c.clearColor(a.backgroundColorSplit[0],a.backgroundColorSplit[1],a.backgroundColorSplit[2],1),c.clear(c.COLOR_BUFFER_BIT),this.renderDisplayObject(a,this.projection),a.interactive?a._interactiveEventsAdded||(a._interactiveEventsAdded=!0,a.interactionManager.setTarget(this)):a._interactiveEventsAdded&&(a._interactiveEventsAdded=!1,a.interactionManager.setTarget(this))}},b.WebGLRenderer.prototype.renderDisplayObject=function(a,c,d){this.renderSession.blendModeManager.setBlendMode(b.blendModes.NORMAL),this.renderSession.drawCount=0,this.renderSession.currentBlendMode=9999,this.renderSession.projection=c,this.renderSession.offset=this.offset,this.spriteBatch.begin(this.renderSession),this.filterManager.begin(this.renderSession,d),a._renderWebGL(this.renderSession),this.spriteBatch.end()},b.WebGLRenderer.updateTextures=function(){var a=0;for(a=0;a<b.Texture.frameUpdates.length;a++)b.WebGLRenderer.updateTextureFrame(b.Texture.frameUpdates[a]);for(a=0;a<b.texturesToDestroy.length;a++)b.WebGLRenderer.destroyTexture(b.texturesToDestroy[a]);b.texturesToUpdate.length=0,b.texturesToDestroy.length=0,b.Texture.frameUpdates.length=0},b.WebGLRenderer.destroyTexture=function(a){for(var c=a._glTextures.length-1;c>=0;c--){var d=a._glTextures[c],e=b.glContexts[c];
e&&d&&e.deleteTexture(d)}a._glTextures.length=0},b.WebGLRenderer.updateTextureFrame=function(a){a._updateWebGLuvs()},b.WebGLRenderer.prototype.resize=function(a,b){this.width=a,this.height=b,this.view.width=a,this.view.height=b,this.gl.viewport(0,0,this.width,this.height),this.projection.x=this.width/2,this.projection.y=-this.height/2},b.createWebGLTexture=function(a,c){return a.hasLoaded&&(a._glTextures[c.id]=c.createTexture(),c.bindTexture(c.TEXTURE_2D,a._glTextures[c.id]),c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultipliedAlpha),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,c.RGBA,c.UNSIGNED_BYTE,a.source),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),a._powerOf2?(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.REPEAT)):(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)),c.bindTexture(c.TEXTURE_2D,null),a._dirty[c.id]=!1),a._glTextures[c.id]},b.updateWebGLTexture=function(a,c){a._glTextures[c.id]&&(c.bindTexture(c.TEXTURE_2D,a._glTextures[c.id]),c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultipliedAlpha),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,c.RGBA,c.UNSIGNED_BYTE,a.source),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),a._powerOf2?(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.REPEAT)):(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)),a._dirty[c.id]=!1)},b.WebGLRenderer.prototype.handleContextLost=function(a){a.preventDefault(),this.contextLost=!0},b.WebGLRenderer.prototype.handleContextRestored=function(){try{this.gl=this.view.getContext("experimental-webgl",this.options)}catch(a){try{this.gl=this.view.getContext("webgl",this.options)}catch(c){throw new Error(" This browser does not support webGL. Try using the canvas renderer"+this)}}var d=this.gl;d.id=b.WebGLRenderer.glContextId++,this.shaderManager.setContext(d),this.spriteBatch.setContext(d),this.primitiveBatch.setContext(d),this.maskManager.setContext(d),this.filterManager.setContext(d),this.renderSession.gl=this.gl,d.disable(d.DEPTH_TEST),d.disable(d.CULL_FACE),d.enable(d.BLEND),d.colorMask(!0,!0,!0,this.transparent),this.gl.viewport(0,0,this.width,this.height);for(var e in b.TextureCache){var f=b.TextureCache[e].baseTexture;f._glTextures=[]}this.contextLost=!1},b.WebGLRenderer.prototype.destroy=function(){this.view.removeEventListener("webglcontextlost",this.contextLost),this.view.removeEventListener("webglcontextrestored",this.contextRestoredLost),b.glContexts[this.glContextId]=null,this.projection=null,this.offset=null,this.shaderManager.destroy(),this.spriteBatch.destroy(),this.primitiveBatch.destroy(),this.maskManager.destroy(),this.filterManager.destroy(),this.shaderManager=null,this.spriteBatch=null,this.maskManager=null,this.filterManager=null,this.gl=null,this.renderSession=null},b.WebGLRenderer.glContextId=0,b.WebGLBlendModeManager=function(a){this.gl=a,this.currentBlendMode=99999},b.WebGLBlendModeManager.prototype.setBlendMode=function(a){if(this.currentBlendMode===a)return!1;this.currentBlendMode=a;var c=b.blendModesWebGL[this.currentBlendMode];return this.gl.blendFunc(c[0],c[1]),!0},b.WebGLBlendModeManager.prototype.destroy=function(){this.gl=null},b.WebGLMaskManager=function(a){this.maskStack=[],this.maskPosition=0,this.setContext(a),this.reverse=!1,this.count=0},b.WebGLMaskManager.prototype.setContext=function(a){this.gl=a},b.WebGLMaskManager.prototype.pushMask=function(a,c){var d=c.gl;a.dirty&&b.WebGLGraphics.updateGraphics(a,d),a._webGL[d.id].data.length&&c.stencilManager.pushStencil(a,a._webGL[d.id].data[0],c)},b.WebGLMaskManager.prototype.popMask=function(a,b){var c=this.gl;b.stencilManager.popStencil(a,a._webGL[c.id].data[0],b)},b.WebGLMaskManager.prototype.destroy=function(){this.maskStack=null,this.gl=null},b.WebGLStencilManager=function(a){this.stencilStack=[],this.setContext(a),this.reverse=!0,this.count=0},b.WebGLStencilManager.prototype.setContext=function(a){this.gl=a},b.WebGLStencilManager.prototype.pushStencil=function(a,b,c){var d=this.gl;this.bindGraphics(a,b,c),0===this.stencilStack.length&&(d.enable(d.STENCIL_TEST),d.clear(d.STENCIL_BUFFER_BIT),this.reverse=!0,this.count=0),this.stencilStack.push(b);var e=this.count;d.colorMask(!1,!1,!1,!1),d.stencilFunc(d.ALWAYS,0,255),d.stencilOp(d.KEEP,d.KEEP,d.INVERT),1===b.mode?(d.drawElements(d.TRIANGLE_FAN,b.indices.length-4,d.UNSIGNED_SHORT,0),this.reverse?(d.stencilFunc(d.EQUAL,255-e,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)):(d.stencilFunc(d.EQUAL,e,255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)),d.drawElements(d.TRIANGLE_FAN,4,d.UNSIGNED_SHORT,2*(b.indices.length-4)),this.reverse?d.stencilFunc(d.EQUAL,255-(e+1),255):d.stencilFunc(d.EQUAL,e+1,255),this.reverse=!this.reverse):(this.reverse?(d.stencilFunc(d.EQUAL,e,255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)):(d.stencilFunc(d.EQUAL,255-e,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)),d.drawElements(d.TRIANGLE_STRIP,b.indices.length,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e+1,255):d.stencilFunc(d.EQUAL,255-(e+1),255)),d.colorMask(!0,!0,!0,!0),d.stencilOp(d.KEEP,d.KEEP,d.KEEP),this.count++},b.WebGLStencilManager.prototype.bindGraphics=function(a,c,d){this._currentGraphics=a;var e,f=this.gl,g=d.projection,h=d.offset;1===c.mode?(e=d.shaderManager.complexPrimativeShader,d.shaderManager.setShader(e),f.uniformMatrix3fv(e.translationMatrix,!1,a.worldTransform.toArray(!0)),f.uniform2f(e.projectionVector,g.x,-g.y),f.uniform2f(e.offsetVector,-h.x,-h.y),f.uniform3fv(e.tintColor,b.hex2rgb(a.tint)),f.uniform3fv(e.color,c.color),f.uniform1f(e.alpha,a.worldAlpha*c.alpha),f.bindBuffer(f.ARRAY_BUFFER,c.buffer),f.vertexAttribPointer(e.aVertexPosition,2,f.FLOAT,!1,8,0),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,c.indexBuffer)):(e=d.shaderManager.primitiveShader,d.shaderManager.setShader(e),f.uniformMatrix3fv(e.translationMatrix,!1,a.worldTransform.toArray(!0)),f.uniform2f(e.projectionVector,g.x,-g.y),f.uniform2f(e.offsetVector,-h.x,-h.y),f.uniform3fv(e.tintColor,b.hex2rgb(a.tint)),f.uniform1f(e.alpha,a.worldAlpha),f.bindBuffer(f.ARRAY_BUFFER,c.buffer),f.vertexAttribPointer(e.aVertexPosition,2,f.FLOAT,!1,24,0),f.vertexAttribPointer(e.colorAttribute,4,f.FLOAT,!1,24,8),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,c.indexBuffer))},b.WebGLStencilManager.prototype.popStencil=function(a,b,c){var d=this.gl;if(this.stencilStack.pop(),this.count--,0===this.stencilStack.length)d.disable(d.STENCIL_TEST);else{var e=this.count;this.bindGraphics(a,b,c),d.colorMask(!1,!1,!1,!1),1===b.mode?(this.reverse=!this.reverse,this.reverse?(d.stencilFunc(d.EQUAL,255-(e+1),255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)):(d.stencilFunc(d.EQUAL,e+1,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)),d.drawElements(d.TRIANGLE_FAN,4,d.UNSIGNED_SHORT,2*(b.indices.length-4)),d.stencilFunc(d.ALWAYS,0,255),d.stencilOp(d.KEEP,d.KEEP,d.INVERT),d.drawElements(d.TRIANGLE_FAN,b.indices.length-4,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e,255):d.stencilFunc(d.EQUAL,255-e,255)):(this.reverse?(d.stencilFunc(d.EQUAL,e+1,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)):(d.stencilFunc(d.EQUAL,255-(e+1),255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)),d.drawElements(d.TRIANGLE_STRIP,b.indices.length,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e,255):d.stencilFunc(d.EQUAL,255-e,255)),d.colorMask(!0,!0,!0,!0),d.stencilOp(d.KEEP,d.KEEP,d.KEEP)}},b.WebGLStencilManager.prototype.destroy=function(){this.maskStack=null,this.gl=null},b.WebGLShaderManager=function(a){this.maxAttibs=10,this.attribState=[],this.tempAttribState=[],this.shaderMap=[];for(var b=0;b<this.maxAttibs;b++)this.attribState[b]=!1;this.setContext(a)},b.WebGLShaderManager.prototype.setContext=function(a){this.gl=a,this.primitiveShader=new b.PrimitiveShader(a),this.complexPrimativeShader=new b.ComplexPrimitiveShader(a),this.defaultShader=new b.PixiShader(a),this.fastShader=new b.PixiFastShader(a),this.stripShader=new b.StripShader(a),this.setShader(this.defaultShader)},b.WebGLShaderManager.prototype.setAttribs=function(a){var b;for(b=0;b<this.tempAttribState.length;b++)this.tempAttribState[b]=!1;for(b=0;b<a.length;b++){var c=a[b];this.tempAttribState[c]=!0}var d=this.gl;for(b=0;b<this.attribState.length;b++)this.attribState[b]!==this.tempAttribState[b]&&(this.attribState[b]=this.tempAttribState[b],this.tempAttribState[b]?d.enableVertexAttribArray(b):d.disableVertexAttribArray(b))},b.WebGLShaderManager.prototype.setShader=function(a){return this._currentId===a._UID?!1:(this._currentId=a._UID,this.currentShader=a,this.gl.useProgram(a.program),this.setAttribs(a.attributes),!0)},b.WebGLShaderManager.prototype.destroy=function(){this.attribState=null,this.tempAttribState=null,this.primitiveShader.destroy(),this.defaultShader.destroy(),this.fastShader.destroy(),this.stripShader.destroy(),this.gl=null},b.WebGLSpriteBatch=function(a){this.vertSize=6,this.size=2e3;var b=4*this.size*this.vertSize,c=6*this.size;this.vertices=new Float32Array(b),this.indices=new Uint16Array(c),this.lastIndexCount=0;for(var d=0,e=0;c>d;d+=6,e+=4)this.indices[d+0]=e+0,this.indices[d+1]=e+1,this.indices[d+2]=e+2,this.indices[d+3]=e+0,this.indices[d+4]=e+2,this.indices[d+5]=e+3;this.drawing=!1,this.currentBatchSize=0,this.currentBaseTexture=null,this.setContext(a),this.dirty=!0,this.textures=[],this.blendModes=[]},b.WebGLSpriteBatch.prototype.setContext=function(a){this.gl=a,this.vertexBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.indices,a.STATIC_DRAW),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertices,a.DYNAMIC_DRAW),this.currentBlendMode=99999},b.WebGLSpriteBatch.prototype.begin=function(a){this.renderSession=a,this.shader=this.renderSession.shaderManager.defaultShader,this.start()},b.WebGLSpriteBatch.prototype.end=function(){this.flush()},b.WebGLSpriteBatch.prototype.render=function(a){var b=a.texture;this.currentBatchSize>=this.size&&(this.flush(),this.currentBaseTexture=b.baseTexture);var c=b._uvs;if(c){var d,e,f,g,h=a.worldAlpha,i=a.tint,j=this.vertices,k=a.anchor.x,l=a.anchor.y;if(b.trim){var m=b.trim;e=m.x-k*m.width,d=e+b.crop.width,g=m.y-l*m.height,f=g+b.crop.height}else d=b.frame.width*(1-k),e=b.frame.width*-k,f=b.frame.height*(1-l),g=b.frame.height*-l;var n=4*this.currentBatchSize*this.vertSize,o=a.worldTransform,p=o.a,q=o.c,r=o.b,s=o.d,t=o.tx,u=o.ty;j[n++]=p*e+r*g+t,j[n++]=s*g+q*e+u,j[n++]=c.x0,j[n++]=c.y0,j[n++]=h,j[n++]=i,j[n++]=p*d+r*g+t,j[n++]=s*g+q*d+u,j[n++]=c.x1,j[n++]=c.y1,j[n++]=h,j[n++]=i,j[n++]=p*d+r*f+t,j[n++]=s*f+q*d+u,j[n++]=c.x2,j[n++]=c.y2,j[n++]=h,j[n++]=i,j[n++]=p*e+r*f+t,j[n++]=s*f+q*e+u,j[n++]=c.x3,j[n++]=c.y3,j[n++]=h,j[n++]=i,this.textures[this.currentBatchSize]=a.texture.baseTexture,this.blendModes[this.currentBatchSize]=a.blendMode,this.currentBatchSize++}},b.WebGLSpriteBatch.prototype.renderTilingSprite=function(a){var c=a.tilingTexture;this.currentBatchSize>=this.size&&(this.flush(),this.currentBaseTexture=c.baseTexture),a._uvs||(a._uvs=new b.TextureUvs);var d=a._uvs;a.tilePosition.x%=c.baseTexture.width*a.tileScaleOffset.x,a.tilePosition.y%=c.baseTexture.height*a.tileScaleOffset.y;var e=a.tilePosition.x/(c.baseTexture.width*a.tileScaleOffset.x),f=a.tilePosition.y/(c.baseTexture.height*a.tileScaleOffset.y),g=a.width/c.baseTexture.width/(a.tileScale.x*a.tileScaleOffset.x),h=a.height/c.baseTexture.height/(a.tileScale.y*a.tileScaleOffset.y);d.x0=0-e,d.y0=0-f,d.x1=1*g-e,d.y1=0-f,d.x2=1*g-e,d.y2=1*h-f,d.x3=0-e,d.y3=1*h-f;var i=a.worldAlpha,j=a.tint,k=this.vertices,l=a.width,m=a.height,n=a.anchor.x,o=a.anchor.y,p=l*(1-n),q=l*-n,r=m*(1-o),s=m*-o,t=4*this.currentBatchSize*this.vertSize,u=a.worldTransform,v=u.a,w=u.c,x=u.b,y=u.d,z=u.tx,A=u.ty;k[t++]=v*q+x*s+z,k[t++]=y*s+w*q+A,k[t++]=d.x0,k[t++]=d.y0,k[t++]=i,k[t++]=j,k[t++]=v*p+x*s+z,k[t++]=y*s+w*p+A,k[t++]=d.x1,k[t++]=d.y1,k[t++]=i,k[t++]=j,k[t++]=v*p+x*r+z,k[t++]=y*r+w*p+A,k[t++]=d.x2,k[t++]=d.y2,k[t++]=i,k[t++]=j,k[t++]=v*q+x*r+z,k[t++]=y*r+w*q+A,k[t++]=d.x3,k[t++]=d.y3,k[t++]=i,k[t++]=j,this.textures[this.currentBatchSize]=c.baseTexture,this.blendModes[this.currentBatchSize]=a.blendMode,this.currentBatchSize++},b.WebGLSpriteBatch.prototype.flush=function(){if(0!==this.currentBatchSize){var a=this.gl;if(this.renderSession.shaderManager.setShader(this.renderSession.shaderManager.defaultShader),this.dirty){this.dirty=!1,a.activeTexture(a.TEXTURE0),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer);var b=this.renderSession.projection;a.uniform2f(this.shader.projectionVector,b.x,b.y);var c=4*this.vertSize;a.vertexAttribPointer(this.shader.aVertexPosition,2,a.FLOAT,!1,c,0),a.vertexAttribPointer(this.shader.aTextureCoord,2,a.FLOAT,!1,c,8),a.vertexAttribPointer(this.shader.colorAttribute,2,a.FLOAT,!1,c,16)}if(this.currentBatchSize>.5*this.size)a.bufferSubData(a.ARRAY_BUFFER,0,this.vertices);else{var d=this.vertices.subarray(0,4*this.currentBatchSize*this.vertSize);a.bufferSubData(a.ARRAY_BUFFER,0,d)}for(var e,f,g=0,h=0,i=null,j=this.renderSession.blendModeManager.currentBlendMode,k=0,l=this.currentBatchSize;l>k;k++)e=this.textures[k],f=this.blendModes[k],(i!==e||j!==f)&&(this.renderBatch(i,g,h),h=k,g=0,i=e,j=f,this.renderSession.blendModeManager.setBlendMode(j)),g++;this.renderBatch(i,g,h),this.currentBatchSize=0}},b.WebGLSpriteBatch.prototype.renderBatch=function(a,c,d){if(0!==c){var e=this.gl;e.bindTexture(e.TEXTURE_2D,a._glTextures[e.id]||b.createWebGLTexture(a,e)),a._dirty[e.id]&&b.updateWebGLTexture(this.currentBaseTexture,e),e.drawElements(e.TRIANGLES,6*c,e.UNSIGNED_SHORT,6*d*2),this.renderSession.drawCount++}},b.WebGLSpriteBatch.prototype.stop=function(){this.flush()},b.WebGLSpriteBatch.prototype.start=function(){this.dirty=!0},b.WebGLSpriteBatch.prototype.destroy=function(){this.vertices=null,this.indices=null,this.gl.deleteBuffer(this.vertexBuffer),this.gl.deleteBuffer(this.indexBuffer),this.currentBaseTexture=null,this.gl=null},b.WebGLFastSpriteBatch=function(a){this.vertSize=10,this.maxSize=6e3,this.size=this.maxSize;var b=4*this.size*this.vertSize,c=6*this.maxSize;this.vertices=new Float32Array(b),this.indices=new Uint16Array(c),this.vertexBuffer=null,this.indexBuffer=null,this.lastIndexCount=0;for(var d=0,e=0;c>d;d+=6,e+=4)this.indices[d+0]=e+0,this.indices[d+1]=e+1,this.indices[d+2]=e+2,this.indices[d+3]=e+0,this.indices[d+4]=e+2,this.indices[d+5]=e+3;this.drawing=!1,this.currentBatchSize=0,this.currentBaseTexture=null,this.currentBlendMode=0,this.renderSession=null,this.shader=null,this.matrix=null,this.setContext(a)},b.WebGLFastSpriteBatch.prototype.setContext=function(a){this.gl=a,this.vertexBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.indices,a.STATIC_DRAW),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertices,a.DYNAMIC_DRAW)},b.WebGLFastSpriteBatch.prototype.begin=function(a,b){this.renderSession=b,this.shader=this.renderSession.shaderManager.fastShader,this.matrix=a.worldTransform.toArray(!0),this.start()},b.WebGLFastSpriteBatch.prototype.end=function(){this.flush()},b.WebGLFastSpriteBatch.prototype.render=function(a){var b=a.children,c=b[0];if(c.texture._uvs){this.currentBaseTexture=c.texture.baseTexture,c.blendMode!==this.renderSession.blendModeManager.currentBlendMode&&(this.flush(),this.renderSession.blendModeManager.setBlendMode(c.blendMode));for(var d=0,e=b.length;e>d;d++)this.renderSprite(b[d]);this.flush()}},b.WebGLFastSpriteBatch.prototype.renderSprite=function(a){if(a.visible&&(a.texture.baseTexture===this.currentBaseTexture||(this.flush(),this.currentBaseTexture=a.texture.baseTexture,a.texture._uvs))){var b,c,d,e,f,g,h,i,j=this.vertices;if(b=a.texture._uvs,c=a.texture.frame.width,d=a.texture.frame.height,a.texture.trim){var k=a.texture.trim;f=k.x-a.anchor.x*k.width,e=f+a.texture.crop.width,h=k.y-a.anchor.y*k.height,g=h+a.texture.crop.height}else e=a.texture.frame.width*(1-a.anchor.x),f=a.texture.frame.width*-a.anchor.x,g=a.texture.frame.height*(1-a.anchor.y),h=a.texture.frame.height*-a.anchor.y;i=4*this.currentBatchSize*this.vertSize,j[i++]=f,j[i++]=h,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x0,j[i++]=b.y1,j[i++]=a.alpha,j[i++]=e,j[i++]=h,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x1,j[i++]=b.y1,j[i++]=a.alpha,j[i++]=e,j[i++]=g,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x2,j[i++]=b.y2,j[i++]=a.alpha,j[i++]=f,j[i++]=g,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x3,j[i++]=b.y3,j[i++]=a.alpha,this.currentBatchSize++,this.currentBatchSize>=this.size&&this.flush()}},b.WebGLFastSpriteBatch.prototype.flush=function(){if(0!==this.currentBatchSize){var a=this.gl;if(this.currentBaseTexture._glTextures[a.id]||b.createWebGLTexture(this.currentBaseTexture,a),a.bindTexture(a.TEXTURE_2D,this.currentBaseTexture._glTextures[a.id]),this.currentBatchSize>.5*this.size)a.bufferSubData(a.ARRAY_BUFFER,0,this.vertices);else{var c=this.vertices.subarray(0,4*this.currentBatchSize*this.vertSize);a.bufferSubData(a.ARRAY_BUFFER,0,c)}a.drawElements(a.TRIANGLES,6*this.currentBatchSize,a.UNSIGNED_SHORT,0),this.currentBatchSize=0,this.renderSession.drawCount++}},b.WebGLFastSpriteBatch.prototype.stop=function(){this.flush()},b.WebGLFastSpriteBatch.prototype.start=function(){var a=this.gl;a.activeTexture(a.TEXTURE0),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer);var b=this.renderSession.projection;a.uniform2f(this.shader.projectionVector,b.x,b.y),a.uniformMatrix3fv(this.shader.uMatrix,!1,this.matrix);var c=4*this.vertSize;a.vertexAttribPointer(this.shader.aVertexPosition,2,a.FLOAT,!1,c,0),a.vertexAttribPointer(this.shader.aPositionCoord,2,a.FLOAT,!1,c,8),a.vertexAttribPointer(this.shader.aScale,2,a.FLOAT,!1,c,16),a.vertexAttribPointer(this.shader.aRotation,1,a.FLOAT,!1,c,24),a.vertexAttribPointer(this.shader.aTextureCoord,2,a.FLOAT,!1,c,28),a.vertexAttribPointer(this.shader.colorAttribute,1,a.FLOAT,!1,c,36)},b.WebGLFilterManager=function(a,b){this.transparent=b,this.filterStack=[],this.offsetX=0,this.offsetY=0,this.setContext(a)},b.WebGLFilterManager.prototype.setContext=function(a){this.gl=a,this.texturePool=[],this.initShaderBuffers()},b.WebGLFilterManager.prototype.begin=function(a,b){this.renderSession=a,this.defaultShader=a.shaderManager.defaultShader;var c=this.renderSession.projection;this.width=2*c.x,this.height=2*-c.y,this.buffer=b},b.WebGLFilterManager.prototype.pushFilter=function(a){var c=this.gl,d=this.renderSession.projection,e=this.renderSession.offset;a._filterArea=a.target.filterArea||a.target.getBounds(),this.filterStack.push(a);var f=a.filterPasses[0];this.offsetX+=a._filterArea.x,this.offsetY+=a._filterArea.y;var g=this.texturePool.pop();g?g.resize(this.width,this.height):g=new b.FilterTexture(this.gl,this.width,this.height),c.bindTexture(c.TEXTURE_2D,g.texture);var h=a._filterArea,i=f.padding;h.x-=i,h.y-=i,h.width+=2*i,h.height+=2*i,h.x<0&&(h.x=0),h.width>this.width&&(h.width=this.width),h.y<0&&(h.y=0),h.height>this.height&&(h.height=this.height),c.bindFramebuffer(c.FRAMEBUFFER,g.frameBuffer),c.viewport(0,0,h.width,h.height),d.x=h.width/2,d.y=-h.height/2,e.x=-h.x,e.y=-h.y,this.renderSession.shaderManager.setShader(this.defaultShader),c.uniform2f(this.defaultShader.projectionVector,h.width/2,-h.height/2),c.uniform2f(this.defaultShader.offsetVector,-h.x,-h.y),c.colorMask(!0,!0,!0,!0),c.clearColor(0,0,0,0),c.clear(c.COLOR_BUFFER_BIT),a._glFilterTexture=g},b.WebGLFilterManager.prototype.popFilter=function(){var a=this.gl,c=this.filterStack.pop(),d=c._filterArea,e=c._glFilterTexture,f=this.renderSession.projection,g=this.renderSession.offset;if(c.filterPasses.length>1){a.viewport(0,0,d.width,d.height),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),this.vertexArray[0]=0,this.vertexArray[1]=d.height,this.vertexArray[2]=d.width,this.vertexArray[3]=d.height,this.vertexArray[4]=0,this.vertexArray[5]=0,this.vertexArray[6]=d.width,this.vertexArray[7]=0,a.bufferSubData(a.ARRAY_BUFFER,0,this.vertexArray),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),this.uvArray[2]=d.width/this.width,this.uvArray[5]=d.height/this.height,this.uvArray[6]=d.width/this.width,this.uvArray[7]=d.height/this.height,a.bufferSubData(a.ARRAY_BUFFER,0,this.uvArray);var h=e,i=this.texturePool.pop();i||(i=new b.FilterTexture(this.gl,this.width,this.height)),i.resize(this.width,this.height),a.bindFramebuffer(a.FRAMEBUFFER,i.frameBuffer),a.clear(a.COLOR_BUFFER_BIT),a.disable(a.BLEND);for(var j=0;j<c.filterPasses.length-1;j++){var k=c.filterPasses[j];a.bindFramebuffer(a.FRAMEBUFFER,i.frameBuffer),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,h.texture),this.applyFilterPass(k,d,d.width,d.height);var l=h;h=i,i=l}a.enable(a.BLEND),e=h,this.texturePool.push(i)}var m=c.filterPasses[c.filterPasses.length-1];this.offsetX-=d.x,this.offsetY-=d.y;var n=this.width,o=this.height,p=0,q=0,r=this.buffer;if(0===this.filterStack.length)a.colorMask(!0,!0,!0,!0);else{var s=this.filterStack[this.filterStack.length-1];d=s._filterArea,n=d.width,o=d.height,p=d.x,q=d.y,r=s._glFilterTexture.frameBuffer}f.x=n/2,f.y=-o/2,g.x=p,g.y=q,d=c._filterArea;var t=d.x-p,u=d.y-q;a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),this.vertexArray[0]=t,this.vertexArray[1]=u+d.height,this.vertexArray[2]=t+d.width,this.vertexArray[3]=u+d.height,this.vertexArray[4]=t,this.vertexArray[5]=u,this.vertexArray[6]=t+d.width,this.vertexArray[7]=u,a.bufferSubData(a.ARRAY_BUFFER,0,this.vertexArray),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),this.uvArray[2]=d.width/this.width,this.uvArray[5]=d.height/this.height,this.uvArray[6]=d.width/this.width,this.uvArray[7]=d.height/this.height,a.bufferSubData(a.ARRAY_BUFFER,0,this.uvArray),a.viewport(0,0,n,o),a.bindFramebuffer(a.FRAMEBUFFER,r),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,e.texture),this.applyFilterPass(m,d,n,o),this.renderSession.shaderManager.setShader(this.defaultShader),a.uniform2f(this.defaultShader.projectionVector,n/2,-o/2),a.uniform2f(this.defaultShader.offsetVector,-p,-q),this.texturePool.push(e),c._glFilterTexture=null},b.WebGLFilterManager.prototype.applyFilterPass=function(a,c,d,e){var f=this.gl,g=a.shaders[f.id];g||(g=new b.PixiShader(f),g.fragmentSrc=a.fragmentSrc,g.uniforms=a.uniforms,g.init(),a.shaders[f.id]=g),this.renderSession.shaderManager.setShader(g),f.uniform2f(g.projectionVector,d/2,-e/2),f.uniform2f(g.offsetVector,0,0),a.uniforms.dimensions&&(a.uniforms.dimensions.value[0]=this.width,a.uniforms.dimensions.value[1]=this.height,a.uniforms.dimensions.value[2]=this.vertexArray[0],a.uniforms.dimensions.value[3]=this.vertexArray[5]),g.syncUniforms(),f.bindBuffer(f.ARRAY_BUFFER,this.vertexBuffer),f.vertexAttribPointer(g.aVertexPosition,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ARRAY_BUFFER,this.uvBuffer),f.vertexAttribPointer(g.aTextureCoord,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ARRAY_BUFFER,this.colorBuffer),f.vertexAttribPointer(g.colorAttribute,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,this.indexBuffer),f.drawElements(f.TRIANGLES,6,f.UNSIGNED_SHORT,0),this.renderSession.drawCount++},b.WebGLFilterManager.prototype.initShaderBuffers=function(){var a=this.gl;this.vertexBuffer=a.createBuffer(),this.uvBuffer=a.createBuffer(),this.colorBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),this.vertexArray=new Float32Array([0,0,1,0,0,1,1,1]),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertexArray,a.STATIC_DRAW),this.uvArray=new Float32Array([0,0,1,0,0,1,1,1]),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),a.bufferData(a.ARRAY_BUFFER,this.uvArray,a.STATIC_DRAW),this.colorArray=new Float32Array([1,16777215,1,16777215,1,16777215,1,16777215]),a.bindBuffer(a.ARRAY_BUFFER,this.colorBuffer),a.bufferData(a.ARRAY_BUFFER,this.colorArray,a.STATIC_DRAW),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,1,3,2]),a.STATIC_DRAW)},b.WebGLFilterManager.prototype.destroy=function(){var a=this.gl;this.filterStack=null,this.offsetX=0,this.offsetY=0;for(var b=0;b<this.texturePool.length;b++)this.texturePool[b].destroy();this.texturePool=null,a.deleteBuffer(this.vertexBuffer),a.deleteBuffer(this.uvBuffer),a.deleteBuffer(this.colorBuffer),a.deleteBuffer(this.indexBuffer)},b.FilterTexture=function(a,c,d,e){this.gl=a,this.frameBuffer=a.createFramebuffer(),this.texture=a.createTexture(),e=e||b.scaleModes.DEFAULT,a.bindTexture(a.TEXTURE_2D,this.texture),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,e===b.scaleModes.LINEAR?a.LINEAR:a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,e===b.scaleModes.LINEAR?a.LINEAR:a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.bindFramebuffer(a.FRAMEBUFFER,this.framebuffer),a.bindFramebuffer(a.FRAMEBUFFER,this.frameBuffer),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,this.texture,0),this.renderBuffer=a.createRenderbuffer(),a.bindRenderbuffer(a.RENDERBUFFER,this.renderBuffer),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_STENCIL_ATTACHMENT,a.RENDERBUFFER,this.renderBuffer),this.resize(c,d)},b.FilterTexture.prototype.clear=function(){var a=this.gl;a.clearColor(0,0,0,0),a.clear(a.COLOR_BUFFER_BIT)},b.FilterTexture.prototype.resize=function(a,b){if(this.width!==a||this.height!==b){this.width=a,this.height=b;var c=this.gl;c.bindTexture(c.TEXTURE_2D,this.texture),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,a,b,0,c.RGBA,c.UNSIGNED_BYTE,null),c.bindRenderbuffer(c.RENDERBUFFER,this.renderBuffer),c.renderbufferStorage(c.RENDERBUFFER,c.DEPTH_STENCIL,a,b)}},b.FilterTexture.prototype.destroy=function(){var a=this.gl;a.deleteFramebuffer(this.frameBuffer),a.deleteTexture(this.texture),this.frameBuffer=null,this.texture=null},b.CanvasMaskManager=function(){},b.CanvasMaskManager.prototype.pushMask=function(a,c){c.save();var d=a.alpha,e=a.worldTransform;c.setTransform(e.a,e.c,e.b,e.d,e.tx,e.ty),b.CanvasGraphics.renderGraphicsMask(a,c),c.clip(),a.worldAlpha=d},b.CanvasMaskManager.prototype.popMask=function(a){a.restore()},b.CanvasTinter=function(){},b.CanvasTinter.getTintedTexture=function(a,c){var d=a.texture;c=b.CanvasTinter.roundColor(c);var e="#"+("00000"+(0|c).toString(16)).substr(-6);if(d.tintCache=d.tintCache||{},d.tintCache[e])return d.tintCache[e];var f=b.CanvasTinter.canvas||document.createElement("canvas");if(b.CanvasTinter.tintMethod(d,c,f),b.CanvasTinter.convertTintToImage){var g=new Image;g.src=f.toDataURL(),d.tintCache[e]=g}else d.tintCache[e]=f,b.CanvasTinter.canvas=null;return f},b.CanvasTinter.tintWithMultiply=function(a,b,c){var d=c.getContext("2d"),e=a.frame;c.width=e.width,c.height=e.height,d.fillStyle="#"+("00000"+(0|b).toString(16)).substr(-6),d.fillRect(0,0,e.width,e.height),d.globalCompositeOperation="multiply",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height),d.globalCompositeOperation="destination-atop",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height)},b.CanvasTinter.tintWithOverlay=function(a,b,c){var d=c.getContext("2d"),e=a.frame;c.width=e.width,c.height=e.height,d.globalCompositeOperation="copy",d.fillStyle="#"+("00000"+(0|b).toString(16)).substr(-6),d.fillRect(0,0,e.width,e.height),d.globalCompositeOperation="destination-atop",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height)},b.CanvasTinter.tintWithPerPixel=function(a,c,d){var e=d.getContext("2d"),f=a.frame;d.width=f.width,d.height=f.height,e.globalCompositeOperation="copy",e.drawImage(a.baseTexture.source,f.x,f.y,f.width,f.height,0,0,f.width,f.height);for(var g=b.hex2rgb(c),h=g[0],i=g[1],j=g[2],k=e.getImageData(0,0,f.width,f.height),l=k.data,m=0;m<l.length;m+=4)l[m+0]*=h,l[m+1]*=i,l[m+2]*=j;e.putImageData(k,0,0)},b.CanvasTinter.roundColor=function(a){var c=b.CanvasTinter.cacheStepsPerColorChannel,d=b.hex2rgb(a);return d[0]=Math.min(255,d[0]/c*c),d[1]=Math.min(255,d[1]/c*c),d[2]=Math.min(255,d[2]/c*c),b.rgb2hex(d)},b.CanvasTinter.cacheStepsPerColorChannel=8,b.CanvasTinter.convertTintToImage=!1,b.CanvasTinter.canUseMultiply=b.canUseNewCanvasBlendModes(),b.CanvasTinter.tintMethod=b.CanvasTinter.canUseMultiply?b.CanvasTinter.tintWithMultiply:b.CanvasTinter.tintWithPerPixel,b.CanvasRenderer=function(a,c,d,e){b.defaultRenderer||(b.sayHello("Canvas"),b.defaultRenderer=this),this.type=b.CANVAS_RENDERER,this.clearBeforeRender=!0,this.transparent=!!e,b.blendModesCanvas||(b.blendModesCanvas=[],b.canUseNewCanvasBlendModes()?(b.blendModesCanvas[b.blendModes.NORMAL]="source-over",b.blendModesCanvas[b.blendModes.ADD]="lighter",b.blendModesCanvas[b.blendModes.MULTIPLY]="multiply",b.blendModesCanvas[b.blendModes.SCREEN]="screen",b.blendModesCanvas[b.blendModes.OVERLAY]="overlay",b.blendModesCanvas[b.blendModes.DARKEN]="darken",b.blendModesCanvas[b.blendModes.LIGHTEN]="lighten",b.blendModesCanvas[b.blendModes.COLOR_DODGE]="color-dodge",b.blendModesCanvas[b.blendModes.COLOR_BURN]="color-burn",b.blendModesCanvas[b.blendModes.HARD_LIGHT]="hard-light",b.blendModesCanvas[b.blendModes.SOFT_LIGHT]="soft-light",b.blendModesCanvas[b.blendModes.DIFFERENCE]="difference",b.blendModesCanvas[b.blendModes.EXCLUSION]="exclusion",b.blendModesCanvas[b.blendModes.HUE]="hue",b.blendModesCanvas[b.blendModes.SATURATION]="saturation",b.blendModesCanvas[b.blendModes.COLOR]="color",b.blendModesCanvas[b.blendModes.LUMINOSITY]="luminosity"):(b.blendModesCanvas[b.blendModes.NORMAL]="source-over",b.blendModesCanvas[b.blendModes.ADD]="lighter",b.blendModesCanvas[b.blendModes.MULTIPLY]="source-over",b.blendModesCanvas[b.blendModes.SCREEN]="source-over",b.blendModesCanvas[b.blendModes.OVERLAY]="source-over",b.blendModesCanvas[b.blendModes.DARKEN]="source-over",b.blendModesCanvas[b.blendModes.LIGHTEN]="source-over",b.blendModesCanvas[b.blendModes.COLOR_DODGE]="source-over",b.blendModesCanvas[b.blendModes.COLOR_BURN]="source-over",b.blendModesCanvas[b.blendModes.HARD_LIGHT]="source-over",b.blendModesCanvas[b.blendModes.SOFT_LIGHT]="source-over",b.blendModesCanvas[b.blendModes.DIFFERENCE]="source-over",b.blendModesCanvas[b.blendModes.EXCLUSION]="source-over",b.blendModesCanvas[b.blendModes.HUE]="source-over",b.blendModesCanvas[b.blendModes.SATURATION]="source-over",b.blendModesCanvas[b.blendModes.COLOR]="source-over",b.blendModesCanvas[b.blendModes.LUMINOSITY]="source-over")),this.width=a||800,this.height=c||600,this.view=d||document.createElement("canvas"),this.context=this.view.getContext("2d",{alpha:this.transparent}),this.refresh=!0,this.view.width=this.width,this.view.height=this.height,this.count=0,this.maskManager=new b.CanvasMaskManager,this.renderSession={context:this.context,maskManager:this.maskManager,scaleMode:null,smoothProperty:null,roundPixels:!1},"imageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="imageSmoothingEnabled":"webkitImageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="webkitImageSmoothingEnabled":"mozImageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="mozImageSmoothingEnabled":"oImageSmoothingEnabled"in this.context&&(this.renderSession.smoothProperty="oImageSmoothingEnabled")},b.CanvasRenderer.prototype.constructor=b.CanvasRenderer,b.CanvasRenderer.prototype.render=function(a){b.texturesToUpdate.length=0,b.texturesToDestroy.length=0,a.updateTransform(),this.context.setTransform(1,0,0,1,0,0),this.context.globalAlpha=1,navigator.isCocoonJS&&this.view.screencanvas&&(this.context.fillStyle="black",this.context.clear()),!this.transparent&&this.clearBeforeRender?(this.context.fillStyle=a.backgroundColorString,this.context.fillRect(0,0,this.width,this.height)):this.transparent&&this.clearBeforeRender&&this.context.clearRect(0,0,this.width,this.height),this.renderDisplayObject(a),a.interactive&&(a._interactiveEventsAdded||(a._interactiveEventsAdded=!0,a.interactionManager.setTarget(this))),b.Texture.frameUpdates.length>0&&(b.Texture.frameUpdates.length=0)
},b.CanvasRenderer.prototype.resize=function(a,b){this.width=a,this.height=b,this.view.width=a,this.view.height=b},b.CanvasRenderer.prototype.renderDisplayObject=function(a,b){this.renderSession.context=b||this.context,a._renderCanvas(this.renderSession)},b.CanvasRenderer.prototype.renderStripFlat=function(a){var b=this.context,c=a.verticies,d=c.length/2;this.count++,b.beginPath();for(var e=1;d-2>e;e++){var f=2*e,g=c[f],h=c[f+2],i=c[f+4],j=c[f+1],k=c[f+3],l=c[f+5];b.moveTo(g,j),b.lineTo(h,k),b.lineTo(i,l)}b.fillStyle="#FF0000",b.fill(),b.closePath()},b.CanvasRenderer.prototype.renderStrip=function(a){var b=this.context,c=a.verticies,d=a.uvs,e=c.length/2;this.count++;for(var f=1;e-2>f;f++){var g=2*f,h=c[g],i=c[g+2],j=c[g+4],k=c[g+1],l=c[g+3],m=c[g+5],n=d[g]*a.texture.width,o=d[g+2]*a.texture.width,p=d[g+4]*a.texture.width,q=d[g+1]*a.texture.height,r=d[g+3]*a.texture.height,s=d[g+5]*a.texture.height;b.save(),b.beginPath(),b.moveTo(h,k),b.lineTo(i,l),b.lineTo(j,m),b.closePath(),b.clip();var t=n*r+q*p+o*s-r*p-q*o-n*s,u=h*r+q*j+i*s-r*j-q*i-h*s,v=n*i+h*p+o*j-i*p-h*o-n*j,w=n*r*j+q*i*p+h*o*s-h*r*p-q*o*j-n*i*s,x=k*r+q*m+l*s-r*m-q*l-k*s,y=n*l+k*p+o*m-l*p-k*o-n*m,z=n*r*m+q*l*p+k*o*s-k*r*p-q*o*m-n*l*s;b.transform(u/t,x/t,v/t,y/t,w/t,z/t),b.drawImage(a.texture.baseTexture.source,0,0),b.restore()}},b.CanvasBuffer=function(a,b){this.width=a,this.height=b,this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.canvas.width=a,this.canvas.height=b},b.CanvasBuffer.prototype.clear=function(){this.context.clearRect(0,0,this.width,this.height)},b.CanvasBuffer.prototype.resize=function(a,b){this.width=this.canvas.width=a,this.height=this.canvas.height=b},b.CanvasGraphics=function(){},b.CanvasGraphics.renderGraphics=function(a,c){for(var d=a.worldAlpha,e="",f=0;f<a.graphicsData.length;f++){var g=a.graphicsData[f],h=g.points;if(c.strokeStyle=e="#"+("00000"+(0|g.lineColor).toString(16)).substr(-6),c.lineWidth=g.lineWidth,g.type===b.Graphics.POLY){c.beginPath(),c.moveTo(h[0],h[1]);for(var i=1;i<h.length/2;i++)c.lineTo(h[2*i],h[2*i+1]);h[0]===h[h.length-2]&&h[1]===h[h.length-1]&&c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}else if(g.type===b.Graphics.RECT)(g.fillColor||0===g.fillColor)&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fillRect(h[0],h[1],h[2],h[3])),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.strokeRect(h[0],h[1],h[2],h[3]));else if(g.type===b.Graphics.CIRC)c.beginPath(),c.arc(h[0],h[1],h[2],0,2*Math.PI),c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke());else if(g.type===b.Graphics.ELIP){var j=g.points,k=2*j[2],l=2*j[3],m=j[0]-k/2,n=j[1]-l/2;c.beginPath();var o=.5522848,p=k/2*o,q=l/2*o,r=m+k,s=n+l,t=m+k/2,u=n+l/2;c.moveTo(m,u),c.bezierCurveTo(m,u-q,t-p,n,t,n),c.bezierCurveTo(t+p,n,r,u-q,r,u),c.bezierCurveTo(r,u+q,t+p,s,t,s),c.bezierCurveTo(t-p,s,m,u+q,m,u),c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}else if(g.type===b.Graphics.RREC){var v=h[0],w=h[1],x=h[2],y=h[3],z=h[4],A=Math.min(x,y)/2|0;z=z>A?A:z,c.beginPath(),c.moveTo(v,w+z),c.lineTo(v,w+y-z),c.quadraticCurveTo(v,w+y,v+z,w+y),c.lineTo(v+x-z,w+y),c.quadraticCurveTo(v+x,w+y,v+x,w+y-z),c.lineTo(v+x,w+z),c.quadraticCurveTo(v+x,w,v+x-z,w),c.lineTo(v+z,w),c.quadraticCurveTo(v,w,v,w+z),c.closePath(),(g.fillColor||0===g.fillColor)&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}}},b.CanvasGraphics.renderGraphicsMask=function(a,c){var d=a.graphicsData.length;if(0!==d){d>1&&(d=1,window.console.log("Pixi.js warning: masks in canvas can only mask using the first path in the graphics object"));for(var e=0;1>e;e++){var f=a.graphicsData[e],g=f.points;if(f.type===b.Graphics.POLY){c.beginPath(),c.moveTo(g[0],g[1]);for(var h=1;h<g.length/2;h++)c.lineTo(g[2*h],g[2*h+1]);g[0]===g[g.length-2]&&g[1]===g[g.length-1]&&c.closePath()}else if(f.type===b.Graphics.RECT)c.beginPath(),c.rect(g[0],g[1],g[2],g[3]),c.closePath();else if(f.type===b.Graphics.CIRC)c.beginPath(),c.arc(g[0],g[1],g[2],0,2*Math.PI),c.closePath();else if(f.type===b.Graphics.ELIP){var i=f.points,j=2*i[2],k=2*i[3],l=i[0]-j/2,m=i[1]-k/2;c.beginPath();var n=.5522848,o=j/2*n,p=k/2*n,q=l+j,r=m+k,s=l+j/2,t=m+k/2;c.moveTo(l,t),c.bezierCurveTo(l,t-p,s-o,m,s,m),c.bezierCurveTo(s+o,m,q,t-p,q,t),c.bezierCurveTo(q,t+p,s+o,r,s,r),c.bezierCurveTo(s-o,r,l,t+p,l,t),c.closePath()}else if(f.type===b.Graphics.RREC){var u=g[0],v=g[1],w=g[2],x=g[3],y=g[4],z=Math.min(w,x)/2|0;y=y>z?z:y,c.beginPath(),c.moveTo(u,v+y),c.lineTo(u,v+x-y),c.quadraticCurveTo(u,v+x,u+y,v+x),c.lineTo(u+w-y,v+x),c.quadraticCurveTo(u+w,v+x,u+w,v+x-y),c.lineTo(u+w,v+y),c.quadraticCurveTo(u+w,v,u+w-y,v),c.lineTo(u+y,v),c.quadraticCurveTo(u,v,u,v+y),c.closePath()}}}},b.Graphics=function(){b.DisplayObjectContainer.call(this),this.renderable=!0,this.fillAlpha=1,this.lineWidth=0,this.lineColor="black",this.graphicsData=[],this.tint=16777215,this.blendMode=b.blendModes.NORMAL,this.currentPath={points:[]},this._webGL=[],this.isMask=!1,this.bounds=null,this.boundsPadding=10,this.dirty=!0},b.Graphics.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Graphics.prototype.constructor=b.Graphics,Object.defineProperty(b.Graphics.prototype,"cacheAsBitmap",{get:function(){return this._cacheAsBitmap},set:function(a){this._cacheAsBitmap=a,this._cacheAsBitmap?this._generateCachedSprite():(this.destroyCachedSprite(),this.dirty=!0)}}),b.Graphics.prototype.lineStyle=function(a,c,d){return this.currentPath.points.length||this.graphicsData.pop(),this.lineWidth=a||0,this.lineColor=c||0,this.lineAlpha=arguments.length<3?1:d,this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[],type:b.Graphics.POLY},this.graphicsData.push(this.currentPath),this},b.Graphics.prototype.moveTo=function(a,c){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath=this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[],type:b.Graphics.POLY},this.currentPath.points.push(a,c),this.graphicsData.push(this.currentPath),this},b.Graphics.prototype.lineTo=function(a,b){return this.currentPath.points.push(a,b),this.dirty=!0,this},b.Graphics.prototype.quadraticCurveTo=function(a,b,c,d){0===this.currentPath.points.length&&this.moveTo(0,0);var e,f,g=20,h=this.currentPath.points;0===h.length&&this.moveTo(0,0);for(var i=h[h.length-2],j=h[h.length-1],k=0,l=1;g>=l;l++)k=l/g,e=i+(a-i)*k,f=j+(b-j)*k,h.push(e+(a+(c-a)*k-e)*k,f+(b+(d-b)*k-f)*k);return this.dirty=!0,this},b.Graphics.prototype.bezierCurveTo=function(a,b,c,d,e,f){0===this.currentPath.points.length&&this.moveTo(0,0);for(var g,h,i,j,k,l=20,m=this.currentPath.points,n=m[m.length-2],o=m[m.length-1],p=0,q=1;l>q;q++)p=q/l,g=1-p,h=g*g,i=h*g,j=p*p,k=j*p,m.push(i*n+3*h*p*a+3*g*j*c+k*e,i*o+3*h*p*b+3*g*j*d+k*f);return this.dirty=!0,this},b.Graphics.prototype.arcTo=function(a,b,c,d,e){0===this.currentPath.points.length&&this.moveTo(a,b);var f=this.currentPath.points,g=f[f.length-2],h=f[f.length-1],i=h-b,j=g-a,k=d-b,l=c-a,m=Math.abs(i*l-j*k);if(1e-8>m||0===e)f.push(a,b);else{var n=i*i+j*j,o=k*k+l*l,p=i*k+j*l,q=e*Math.sqrt(n)/m,r=e*Math.sqrt(o)/m,s=q*p/n,t=r*p/o,u=q*l+r*j,v=q*k+r*i,w=j*(r+s),x=i*(r+s),y=l*(q+t),z=k*(q+t),A=Math.atan2(x-v,w-u),B=Math.atan2(z-v,y-u);this.arc(u+a,v+b,e,A,B,j*k>l*i)}return this.dirty=!0,this},b.Graphics.prototype.arc=function(a,b,c,d,e,f){var g=a+Math.cos(d)*c,h=b+Math.sin(d)*c,i=this.currentPath.points;if((0!==i.length&&i[i.length-2]!==g||i[i.length-1]!==h)&&(this.moveTo(g,h),i=this.currentPath.points),d===e)return this;!f&&d>=e?e+=2*Math.PI:f&&e>=d&&(d+=2*Math.PI);var j=f?-1*(d-e):e-d,k=Math.abs(j)/(2*Math.PI)*40;if(0===j)return this;for(var l=j/(2*k),m=2*l,n=Math.cos(l),o=Math.sin(l),p=k-1,q=p%1/p,r=0;p>=r;r++){var s=r+q*r,t=l+d+m*s,u=Math.cos(t),v=-Math.sin(t);i.push((n*u+o*v)*c+a,(n*-v+o*u)*c+b)}return this.dirty=!0,this},b.Graphics.prototype.drawPath=function(a){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath=this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[],type:b.Graphics.POLY},this.graphicsData.push(this.currentPath),this.currentPath.points=this.currentPath.points.concat(a),this.dirty=!0,this},b.Graphics.prototype.beginFill=function(a,b){return this.filling=!0,this.fillColor=a||0,this.fillAlpha=arguments.length<2?1:b,this},b.Graphics.prototype.endFill=function(){return this.filling=!1,this.fillColor=null,this.fillAlpha=1,this},b.Graphics.prototype.drawRect=function(a,c,d,e){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[a,c,d,e],type:b.Graphics.RECT},this.graphicsData.push(this.currentPath),this.dirty=!0,this},b.Graphics.prototype.drawRoundedRect=function(a,c,d,e,f){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[a,c,d,e,f],type:b.Graphics.RREC},this.graphicsData.push(this.currentPath),this.dirty=!0,this},b.Graphics.prototype.drawCircle=function(a,c,d){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[a,c,d,d],type:b.Graphics.CIRC},this.graphicsData.push(this.currentPath),this.dirty=!0,this},b.Graphics.prototype.drawEllipse=function(a,c,d,e){return this.currentPath.points.length||this.graphicsData.pop(),this.currentPath={lineWidth:this.lineWidth,lineColor:this.lineColor,lineAlpha:this.lineAlpha,fillColor:this.fillColor,fillAlpha:this.fillAlpha,fill:this.filling,points:[a,c,d,e],type:b.Graphics.ELIP},this.graphicsData.push(this.currentPath),this.dirty=!0,this},b.Graphics.prototype.clear=function(){return this.lineWidth=0,this.filling=!1,this.dirty=!0,this.clearDirty=!0,this.graphicsData=[],this.bounds=null,this},b.Graphics.prototype.generateTexture=function(){var a=this.getBounds(),c=new b.CanvasBuffer(a.width,a.height),d=b.Texture.fromCanvas(c.canvas);return c.context.translate(-a.x,-a.y),b.CanvasGraphics.renderGraphics(this,c.context),d},b.Graphics.prototype._renderWebGL=function(a){if(this.visible!==!1&&0!==this.alpha&&this.isMask!==!0){if(this._cacheAsBitmap)return this.dirty&&(this._generateCachedSprite(),b.updateWebGLTexture(this._cachedSprite.texture.baseTexture,a.gl),this.dirty=!1),this._cachedSprite.alpha=this.alpha,b.Sprite.prototype._renderWebGL.call(this._cachedSprite,a),void 0;if(a.spriteBatch.stop(),a.blendModeManager.setBlendMode(this.blendMode),this._mask&&a.maskManager.pushMask(this._mask,a),this._filters&&a.filterManager.pushFilter(this._filterBlock),this.blendMode!==a.spriteBatch.currentBlendMode){a.spriteBatch.currentBlendMode=this.blendMode;var c=b.blendModesWebGL[a.spriteBatch.currentBlendMode];a.spriteBatch.gl.blendFunc(c[0],c[1])}if(b.WebGLGraphics.renderGraphics(this,a),this.children.length){a.spriteBatch.start();for(var d=0,e=this.children.length;e>d;d++)this.children[d]._renderWebGL(a);a.spriteBatch.stop()}this._filters&&a.filterManager.popFilter(),this._mask&&a.maskManager.popMask(this.mask,a),a.drawCount++,a.spriteBatch.start()}},b.Graphics.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha&&this.isMask!==!0){var c=a.context,d=this.worldTransform;this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,c.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]),this._mask&&a.maskManager.pushMask(this._mask,a.context),c.setTransform(d.a,d.c,d.b,d.d,d.tx,d.ty),b.CanvasGraphics.renderGraphics(this,c);for(var e=0,f=this.children.length;f>e;e++)this.children[e]._renderCanvas(a);this._mask&&a.maskManager.popMask(a.context)}},b.Graphics.prototype.getBounds=function(a){this.bounds||this.updateBounds();var b=this.bounds.x,c=this.bounds.width+this.bounds.x,d=this.bounds.y,e=this.bounds.height+this.bounds.y,f=a||this.worldTransform,g=f.a,h=f.c,i=f.b,j=f.d,k=f.tx,l=f.ty,m=g*c+i*e+k,n=j*e+h*c+l,o=g*b+i*e+k,p=j*e+h*b+l,q=g*b+i*d+k,r=j*d+h*b+l,s=g*c+i*d+k,t=j*d+h*c+l,u=m,v=n,w=m,x=n;w=w>o?o:w,w=w>q?q:w,w=w>s?s:w,x=x>p?p:x,x=x>r?r:x,x=x>t?t:x,u=o>u?o:u,u=q>u?q:u,u=s>u?s:u,v=p>v?p:v,v=r>v?r:v,v=t>v?t:v;var y=this._bounds;return y.x=w,y.width=u-w,y.y=x,y.height=v-x,y},b.Graphics.prototype.updateBounds=function(){for(var a,c,d,e,f,g=1/0,h=-1/0,i=1/0,j=-1/0,k=0;k<this.graphicsData.length;k++){var l=this.graphicsData[k],m=l.type,n=l.lineWidth;if(a=l.points,m===b.Graphics.RECT)c=a[0]-n/2,d=a[1]-n/2,e=a[2]+n,f=a[3]+n,g=g>c?c:g,h=c+e>h?c+e:h,i=i>d?c:i,j=d+f>j?d+f:j;else if(m===b.Graphics.CIRC||m===b.Graphics.ELIP)c=a[0],d=a[1],e=a[2]+n/2,f=a[3]+n/2,g=g>c-e?c-e:g,h=c+e>h?c+e:h,i=i>d-f?d-f:i,j=d+f>j?d+f:j;else for(var o=0;o<a.length;o+=2)c=a[o],d=a[o+1],g=g>c-n?c-n:g,h=c+n>h?c+n:h,i=i>d-n?d-n:i,j=d+n>j?d+n:j}var p=this.boundsPadding;this.bounds=new b.Rectangle(g-p,i-p,h-g+2*p,j-i+2*p)},b.Graphics.prototype._generateCachedSprite=function(){var a=this.getLocalBounds();if(this._cachedSprite)this._cachedSprite.buffer.resize(a.width,a.height);else{var c=new b.CanvasBuffer(a.width,a.height),d=b.Texture.fromCanvas(c.canvas);this._cachedSprite=new b.Sprite(d),this._cachedSprite.buffer=c,this._cachedSprite.worldTransform=this.worldTransform}this._cachedSprite.anchor.x=-(a.x/a.width),this._cachedSprite.anchor.y=-(a.y/a.height),this._cachedSprite.buffer.context.translate(-a.x,-a.y),b.CanvasGraphics.renderGraphics(this,this._cachedSprite.buffer.context),this._cachedSprite.alpha=this.alpha},b.Graphics.prototype.destroyCachedSprite=function(){this._cachedSprite.texture.destroy(!0),this._cachedSprite=null},b.Graphics.POLY=0,b.Graphics.RECT=1,b.Graphics.CIRC=2,b.Graphics.ELIP=3,b.Graphics.RREC=4,b.Strip=function(a){b.DisplayObjectContainer.call(this),this.texture=a,this.uvs=new b.Float32Array([0,1,1,1,1,0,0,1]),this.verticies=new b.Float32Array([0,0,100,0,100,100,0,100]),this.colors=new b.Float32Array([1,1,1,1]),this.indices=new b.Uint16Array([0,1,2,3]),this.dirty=!0},b.Strip.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Strip.prototype.constructor=b.Strip,b.Strip.prototype._renderWebGL=function(a){!this.visible||this.alpha<=0||(a.spriteBatch.stop(),this._vertexBuffer||this._initWebGL(a),a.shaderManager.setShader(a.shaderManager.stripShader),this._renderStrip(a),a.spriteBatch.start())},b.Strip.prototype._initWebGL=function(a){var b=a.gl;this._vertexBuffer=b.createBuffer(),this._indexBuffer=b.createBuffer(),this._uvBuffer=b.createBuffer(),this._colorBuffer=b.createBuffer(),b.bindBuffer(b.ARRAY_BUFFER,this._vertexBuffer),b.bufferData(b.ARRAY_BUFFER,this.verticies,b.DYNAMIC_DRAW),b.bindBuffer(b.ARRAY_BUFFER,this._uvBuffer),b.bufferData(b.ARRAY_BUFFER,this.uvs,b.STATIC_DRAW),b.bindBuffer(b.ARRAY_BUFFER,this._colorBuffer),b.bufferData(b.ARRAY_BUFFER,this.colors,b.STATIC_DRAW),b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,this._indexBuffer),b.bufferData(b.ELEMENT_ARRAY_BUFFER,this.indices,b.STATIC_DRAW)},b.Strip.prototype._renderStrip=function(a){var c=a.gl,d=a.projection,e=a.offset,f=a.shaderManager.stripShader;c.blendFunc(c.ONE,c.ONE_MINUS_SRC_ALPHA),c.uniformMatrix3fv(f.translationMatrix,!1,this.worldTransform.toArray(!0)),c.uniform2f(f.projectionVector,d.x,-d.y),c.uniform2f(f.offsetVector,-e.x,-e.y),c.uniform1f(f.alpha,1),this.dirty?(this.dirty=!1,c.bindBuffer(c.ARRAY_BUFFER,this._vertexBuffer),c.bufferData(c.ARRAY_BUFFER,this.verticies,c.STATIC_DRAW),c.vertexAttribPointer(f.aVertexPosition,2,c.FLOAT,!1,0,0),c.bindBuffer(c.ARRAY_BUFFER,this._uvBuffer),c.bufferData(c.ARRAY_BUFFER,this.uvs,c.STATIC_DRAW),c.vertexAttribPointer(f.aTextureCoord,2,c.FLOAT,!1,0,0),c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,this.texture.baseTexture._glTextures[c.id]||b.createWebGLTexture(this.texture.baseTexture,c)),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,this._indexBuffer),c.bufferData(c.ELEMENT_ARRAY_BUFFER,this.indices,c.STATIC_DRAW)):(c.bindBuffer(c.ARRAY_BUFFER,this._vertexBuffer),c.bufferSubData(c.ARRAY_BUFFER,0,this.verticies),c.vertexAttribPointer(f.aVertexPosition,2,c.FLOAT,!1,0,0),c.bindBuffer(c.ARRAY_BUFFER,this._uvBuffer),c.vertexAttribPointer(f.aTextureCoord,2,c.FLOAT,!1,0,0),c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,this.texture.baseTexture._glTextures[c.id]||b.createWebGLTexture(this.texture.baseTexture,c)),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,this._indexBuffer)),c.drawElements(c.TRIANGLE_STRIP,this.indices.length,c.UNSIGNED_SHORT,0)},b.Strip.prototype._renderCanvas=function(a){var b=a.context,c=this.worldTransform;a.roundPixels?b.setTransform(c.a,c.c,c.b,c.d,0|c.tx,0|c.ty):b.setTransform(c.a,c.c,c.b,c.d,c.tx,c.ty);var d=this,e=d.verticies,f=d.uvs,g=e.length/2;this.count++;for(var h=0;g-2>h;h++){var i=2*h,j=e[i],k=e[i+2],l=e[i+4],m=e[i+1],n=e[i+3],o=e[i+5],p=(j+k+l)/3,q=(m+n+o)/3,r=j-p,s=m-q,t=Math.sqrt(r*r+s*s);j=p+r/t*(t+3),m=q+s/t*(t+3),r=k-p,s=n-q,t=Math.sqrt(r*r+s*s),k=p+r/t*(t+3),n=q+s/t*(t+3),r=l-p,s=o-q,t=Math.sqrt(r*r+s*s),l=p+r/t*(t+3),o=q+s/t*(t+3);var u=f[i]*d.texture.width,v=f[i+2]*d.texture.width,w=f[i+4]*d.texture.width,x=f[i+1]*d.texture.height,y=f[i+3]*d.texture.height,z=f[i+5]*d.texture.height;b.save(),b.beginPath(),b.moveTo(j,m),b.lineTo(k,n),b.lineTo(l,o),b.closePath(),b.clip();var A=u*y+x*w+v*z-y*w-x*v-u*z,B=j*y+x*l+k*z-y*l-x*k-j*z,C=u*k+j*w+v*l-k*w-j*v-u*l,D=u*y*l+x*k*w+j*v*z-j*y*w-x*v*l-u*k*z,E=m*y+x*o+n*z-y*o-x*n-m*z,F=u*n+m*w+v*o-n*w-m*v-u*o,G=u*y*o+x*n*w+m*v*z-m*y*w-x*v*o-u*n*z;b.transform(B/A,E/A,C/A,F/A,D/A,G/A),b.drawImage(d.texture.baseTexture.source,0,0),b.restore()}},b.Strip.prototype.onTextureUpdate=function(){this.updateFrame=!0},b.Rope=function(a,c){b.Strip.call(this,a),this.points=c,this.verticies=new b.Float32Array(4*c.length),this.uvs=new b.Float32Array(4*c.length),this.colors=new b.Float32Array(2*c.length),this.indices=new b.Uint16Array(2*c.length),this.refresh()},b.Rope.prototype=Object.create(b.Strip.prototype),b.Rope.prototype.constructor=b.Rope,b.Rope.prototype.refresh=function(){var a=this.points;if(!(a.length<1)){var b=this.uvs,c=a[0],d=this.indices,e=this.colors;this.count-=.2,b[0]=0,b[1]=0,b[2]=0,b[3]=1,e[0]=1,e[1]=1,d[0]=0,d[1]=1;for(var f,g,h,i=a.length,j=1;i>j;j++)f=a[j],g=4*j,h=j/(i-1),j%2?(b[g]=h,b[g+1]=0,b[g+2]=h,b[g+3]=1):(b[g]=h,b[g+1]=0,b[g+2]=h,b[g+3]=1),g=2*j,e[g]=1,e[g+1]=1,g=2*j,d[g]=g,d[g+1]=g+1,c=f}},b.Rope.prototype.updateTransform=function(){var a=this.points;if(!(a.length<1)){var c,d=a[0],e={x:0,y:0};this.count-=.2;for(var f,g,h,i,j,k=this.verticies,l=a.length,m=0;l>m;m++)f=a[m],g=4*m,c=m<a.length-1?a[m+1]:f,e.y=-(c.x-d.x),e.x=c.y-d.y,h=10*(1-m/(l-1)),h>1&&(h=1),i=Math.sqrt(e.x*e.x+e.y*e.y),j=this.texture.height/2,e.x/=i,e.y/=i,e.x*=j,e.y*=j,k[g]=f.x+e.x,k[g+1]=f.y+e.y,k[g+2]=f.x-e.x,k[g+3]=f.y-e.y,d=f;b.DisplayObjectContainer.prototype.updateTransform.call(this)}},b.Rope.prototype.setTexture=function(a){this.texture=a},b.TilingSprite=function(a,c,d){b.Sprite.call(this,a),this._width=c||100,this._height=d||100,this.tileScale=new b.Point(1,1),this.tileScaleOffset=new b.Point(1,1),this.tilePosition=new b.Point(0,0),this.renderable=!0,this.tint=16777215,this.blendMode=b.blendModes.NORMAL},b.TilingSprite.prototype=Object.create(b.Sprite.prototype),b.TilingSprite.prototype.constructor=b.TilingSprite,Object.defineProperty(b.TilingSprite.prototype,"width",{get:function(){return this._width},set:function(a){this._width=a}}),Object.defineProperty(b.TilingSprite.prototype,"height",{get:function(){return this._height},set:function(a){this._height=a}}),b.TilingSprite.prototype.setTexture=function(a){this.texture!==a&&(this.texture=a,this.refreshTexture=!0,this.cachedTint=16777215)},b.TilingSprite.prototype._renderWebGL=function(a){if(this.visible!==!1&&0!==this.alpha){var c,d;for(this._mask&&(a.spriteBatch.stop(),a.maskManager.pushMask(this.mask,a),a.spriteBatch.start()),this._filters&&(a.spriteBatch.flush(),a.filterManager.pushFilter(this._filterBlock)),!this.tilingTexture||this.refreshTexture?(this.generateTilingTexture(!0),this.tilingTexture&&this.tilingTexture.needsUpdate&&(b.updateWebGLTexture(this.tilingTexture.baseTexture,a.gl),this.tilingTexture.needsUpdate=!1)):a.spriteBatch.renderTilingSprite(this),c=0,d=this.children.length;d>c;c++)this.children[c]._renderWebGL(a);a.spriteBatch.stop(),this._filters&&a.filterManager.popFilter(),this._mask&&a.maskManager.popMask(a),a.spriteBatch.start()}},b.TilingSprite.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha){var c=a.context;this._mask&&a.maskManager.pushMask(this._mask,c),c.globalAlpha=this.worldAlpha;var d,e,f=this.worldTransform;if(c.setTransform(f.a,f.c,f.b,f.d,f.tx,f.ty),!this.__tilePattern||this.refreshTexture){if(this.generateTilingTexture(!1),!this.tilingTexture)return;this.__tilePattern=c.createPattern(this.tilingTexture.baseTexture.source,"repeat")}this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,c.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]);var g=this.tilePosition,h=this.tileScale;for(g.x%=this.tilingTexture.baseTexture.width,g.y%=this.tilingTexture.baseTexture.height,c.scale(h.x,h.y),c.translate(g.x,g.y),c.fillStyle=this.__tilePattern,c.fillRect(-g.x+this.anchor.x*-this._width,-g.y+this.anchor.y*-this._height,this._width/h.x,this._height/h.y),c.scale(1/h.x,1/h.y),c.translate(-g.x,-g.y),this._mask&&a.maskManager.popMask(a.context),d=0,e=this.children.length;e>d;d++)this.children[d]._renderCanvas(a)}},b.TilingSprite.prototype.getBounds=function(){var a=this._width,b=this._height,c=a*(1-this.anchor.x),d=a*-this.anchor.x,e=b*(1-this.anchor.y),f=b*-this.anchor.y,g=this.worldTransform,h=g.a,i=g.c,j=g.b,k=g.d,l=g.tx,m=g.ty,n=h*d+j*f+l,o=k*f+i*d+m,p=h*c+j*f+l,q=k*f+i*c+m,r=h*c+j*e+l,s=k*e+i*c+m,t=h*d+j*e+l,u=k*e+i*d+m,v=-1/0,w=-1/0,x=1/0,y=1/0;x=x>n?n:x,x=x>p?p:x,x=x>r?r:x,x=x>t?t:x,y=y>o?o:y,y=y>q?q:y,y=y>s?s:y,y=y>u?u:y,v=n>v?n:v,v=p>v?p:v,v=r>v?r:v,v=t>v?t:v,w=o>w?o:w,w=q>w?q:w,w=s>w?s:w,w=u>w?u:w;var z=this._bounds;return z.x=x,z.width=v-x,z.y=y,z.height=w-y,this._currentBounds=z,z},b.TilingSprite.prototype.onTextureUpdate=function(){},b.TilingSprite.prototype.generateTilingTexture=function(a){if(this.texture.baseTexture.hasLoaded){var c,d,e=this.texture,f=e.frame,g=f.width!==e.baseTexture.width||f.height!==e.baseTexture.height,h=!1;if(a?(c=b.getNextPowerOfTwo(f.width),d=b.getNextPowerOfTwo(f.height),(f.width!==c||f.height!==d)&&(h=!0)):g&&(c=f.width,d=f.height,h=!0),h){var i;this.tilingTexture&&this.tilingTexture.isTiling?(i=this.tilingTexture.canvasBuffer,i.resize(c,d),this.tilingTexture.baseTexture.width=c,this.tilingTexture.baseTexture.height=d,this.tilingTexture.needsUpdate=!0):(i=new b.CanvasBuffer(c,d),this.tilingTexture=b.Texture.fromCanvas(i.canvas),this.tilingTexture.canvasBuffer=i,this.tilingTexture.isTiling=!0),i.context.drawImage(e.baseTexture.source,e.crop.x,e.crop.y,e.crop.width,e.crop.height,0,0,c,d),this.tileScaleOffset.x=f.width/c,this.tileScaleOffset.y=f.height/d}else this.tilingTexture&&this.tilingTexture.isTiling&&this.tilingTexture.destroy(!0),this.tileScaleOffset.x=1,this.tileScaleOffset.y=1,this.tilingTexture=e;this.refreshTexture=!1,this.tilingTexture.baseTexture._powerOf2=!0}};var f={};f.BoneData=function(a,b){this.name=a,this.parent=b},f.BoneData.prototype={length:0,x:0,y:0,rotation:0,scaleX:1,scaleY:1},f.SlotData=function(a,b){this.name=a,this.boneData=b},f.SlotData.prototype={r:1,g:1,b:1,a:1,attachmentName:null},f.Bone=function(a,b){this.data=a,this.parent=b,this.setToSetupPose()},f.Bone.yDown=!1,f.Bone.prototype={x:0,y:0,rotation:0,scaleX:1,scaleY:1,m00:0,m01:0,worldX:0,m10:0,m11:0,worldY:0,worldRotation:0,worldScaleX:1,worldScaleY:1,updateWorldTransform:function(a,b){var c=this.parent;null!=c?(this.worldX=this.x*c.m00+this.y*c.m01+c.worldX,this.worldY=this.x*c.m10+this.y*c.m11+c.worldY,this.worldScaleX=c.worldScaleX*this.scaleX,this.worldScaleY=c.worldScaleY*this.scaleY,this.worldRotation=c.worldRotation+this.rotation):(this.worldX=this.x,this.worldY=this.y,this.worldScaleX=this.scaleX,this.worldScaleY=this.scaleY,this.worldRotation=this.rotation);var d=this.worldRotation*Math.PI/180,e=Math.cos(d),g=Math.sin(d);this.m00=e*this.worldScaleX,this.m10=g*this.worldScaleX,this.m01=-g*this.worldScaleY,this.m11=e*this.worldScaleY,a&&(this.m00=-this.m00,this.m01=-this.m01),b&&(this.m10=-this.m10,this.m11=-this.m11),f.Bone.yDown&&(this.m10=-this.m10,this.m11=-this.m11)},setToSetupPose:function(){var a=this.data;this.x=a.x,this.y=a.y,this.rotation=a.rotation,this.scaleX=a.scaleX,this.scaleY=a.scaleY}},f.Slot=function(a,b,c){this.data=a,this.skeleton=b,this.bone=c,this.setToSetupPose()},f.Slot.prototype={r:1,g:1,b:1,a:1,_attachmentTime:0,attachment:null,setAttachment:function(a){this.attachment=a,this._attachmentTime=this.skeleton.time},setAttachmentTime:function(a){this._attachmentTime=this.skeleton.time-a},getAttachmentTime:function(){return this.skeleton.time-this._attachmentTime},setToSetupPose:function(){var a=this.data;this.r=a.r,this.g=a.g,this.b=a.b,this.a=a.a;for(var b=this.skeleton.data.slots,c=0,d=b.length;d>c;c++)if(b[c]==a){this.setAttachment(a.attachmentName?this.skeleton.getAttachmentBySlotIndex(c,a.attachmentName):null);break}}},f.Skin=function(a){this.name=a,this.attachments={}},f.Skin.prototype={addAttachment:function(a,b,c){this.attachments[a+":"+b]=c},getAttachment:function(a,b){return this.attachments[a+":"+b]},_attachAll:function(a,b){for(var c in b.attachments){var d=c.indexOf(":"),e=parseInt(c.substring(0,d),10),f=c.substring(d+1),g=a.slots[e];if(g.attachment&&g.attachment.name==f){var h=this.getAttachment(e,f);h&&g.setAttachment(h)}}}},f.Animation=function(a,b,c){this.name=a,this.timelines=b,this.duration=c},f.Animation.prototype={apply:function(a,b,c){c&&this.duration&&(b%=this.duration);for(var d=this.timelines,e=0,f=d.length;f>e;e++)d[e].apply(a,b,1)},mix:function(a,b,c,d){c&&this.duration&&(b%=this.duration);for(var e=this.timelines,f=0,g=e.length;g>f;f++)e[f].apply(a,b,d)}},f.binarySearch=function(a,b,c){var d=0,e=Math.floor(a.length/c)-2;if(!e)return c;for(var f=e>>>1;;){if(a[(f+1)*c]<=b?d=f+1:e=f,d==e)return(d+1)*c;f=d+e>>>1}},f.linearSearch=function(a,b,c){for(var d=0,e=a.length-c;e>=d;d+=c)if(a[d]>b)return d;return-1},f.Curves=function(a){this.curves=[],this.curves.length=6*(a-1)},f.Curves.prototype={setLinear:function(a){this.curves[6*a]=0},setStepped:function(a){this.curves[6*a]=-1},setCurve:function(a,b,c,d,e){var f=.1,g=f*f,h=g*f,i=3*f,j=3*g,k=6*g,l=6*h,m=2*-b+d,n=2*-c+e,o=3*(b-d)+1,p=3*(c-e)+1,q=6*a,r=this.curves;r[q]=b*i+m*j+o*h,r[q+1]=c*i+n*j+p*h,r[q+2]=m*k+o*l,r[q+3]=n*k+p*l,r[q+4]=o*l,r[q+5]=p*l},getCurvePercent:function(a,b){b=0>b?0:b>1?1:b;var c=6*a,d=this.curves,e=d[c];if(!e)return b;if(-1==e)return 0;for(var f=d[c+1],g=d[c+2],h=d[c+3],i=d[c+4],j=d[c+5],k=e,l=f,m=8;;){if(k>=b){var n=k-e,o=l-f;return o+(l-o)*(b-n)/(k-n)}if(!m)break;m--,e+=g,f+=h,g+=i,h+=j,k+=e,l+=f}return l+(1-l)*(b-k)/(1-k)}},f.RotateTimeline=function(a){this.curves=new f.Curves(a),this.frames=[],this.frames.length=2*a},f.RotateTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/2},setFrame:function(a,b,c){a*=2,this.frames[a]=b,this.frames[a+1]=c},apply:function(a,b,c){var d,e=this.frames;if(!(b<e[0])){var g=a.bones[this.boneIndex];if(b>=e[e.length-2]){for(d=g.data.rotation+e[e.length-1]-g.rotation;d>180;)d-=360;for(;-180>d;)d+=360;return g.rotation+=d*c,void 0}var h=f.binarySearch(e,b,2),i=e[h-1],j=e[h],k=1-(b-j)/(e[h-2]-j);for(k=this.curves.getCurvePercent(h/2-1,k),d=e[h+1]-i;d>180;)d-=360;for(;-180>d;)d+=360;for(d=g.data.rotation+(i+d*k)-g.rotation;d>180;)d-=360;for(;-180>d;)d+=360;g.rotation+=d*c}}},f.TranslateTimeline=function(a){this.curves=new f.Curves(a),this.frames=[],this.frames.length=3*a},f.TranslateTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/3},setFrame:function(a,b,c,d){a*=3,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d},apply:function(a,b,c){var d=this.frames;if(!(b<d[0])){var e=a.bones[this.boneIndex];if(b>=d[d.length-3])return e.x+=(e.data.x+d[d.length-2]-e.x)*c,e.y+=(e.data.y+d[d.length-1]-e.y)*c,void 0;var g=f.binarySearch(d,b,3),h=d[g-2],i=d[g-1],j=d[g],k=1-(b-j)/(d[g+-3]-j);k=this.curves.getCurvePercent(g/3-1,k),e.x+=(e.data.x+h+(d[g+1]-h)*k-e.x)*c,e.y+=(e.data.y+i+(d[g+2]-i)*k-e.y)*c}}},f.ScaleTimeline=function(a){this.curves=new f.Curves(a),this.frames=[],this.frames.length=3*a},f.ScaleTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/3},setFrame:function(a,b,c,d){a*=3,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d},apply:function(a,b,c){var d=this.frames;if(!(b<d[0])){var e=a.bones[this.boneIndex];if(b>=d[d.length-3])return e.scaleX+=(e.data.scaleX-1+d[d.length-2]-e.scaleX)*c,e.scaleY+=(e.data.scaleY-1+d[d.length-1]-e.scaleY)*c,void 0;var g=f.binarySearch(d,b,3),h=d[g-2],i=d[g-1],j=d[g],k=1-(b-j)/(d[g+-3]-j);k=this.curves.getCurvePercent(g/3-1,k),e.scaleX+=(e.data.scaleX-1+h+(d[g+1]-h)*k-e.scaleX)*c,e.scaleY+=(e.data.scaleY-1+i+(d[g+2]-i)*k-e.scaleY)*c}}},f.ColorTimeline=function(a){this.curves=new f.Curves(a),this.frames=[],this.frames.length=5*a},f.ColorTimeline.prototype={slotIndex:0,getFrameCount:function(){return this.frames.length/5},setFrame:function(a,b,c,d,e,f){a*=5,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d,this.frames[a+3]=e,this.frames[a+4]=f},apply:function(a,b,c){var d=this.frames;if(!(b<d[0])){var e=a.slots[this.slotIndex];if(b>=d[d.length-5]){var g=d.length-1;return e.r=d[g-3],e.g=d[g-2],e.b=d[g-1],e.a=d[g],void 0}var h=f.binarySearch(d,b,5),i=d[h-4],j=d[h-3],k=d[h-2],l=d[h-1],m=d[h],n=1-(b-m)/(d[h-5]-m);n=this.curves.getCurvePercent(h/5-1,n);var o=i+(d[h+1]-i)*n,p=j+(d[h+2]-j)*n,q=k+(d[h+3]-k)*n,r=l+(d[h+4]-l)*n;1>c?(e.r+=(o-e.r)*c,e.g+=(p-e.g)*c,e.b+=(q-e.b)*c,e.a+=(r-e.a)*c):(e.r=o,e.g=p,e.b=q,e.a=r)}}},f.AttachmentTimeline=function(a){this.curves=new f.Curves(a),this.frames=[],this.frames.length=a,this.attachmentNames=[],this.attachmentNames.length=a},f.AttachmentTimeline.prototype={slotIndex:0,getFrameCount:function(){return this.frames.length},setFrame:function(a,b,c){this.frames[a]=b,this.attachmentNames[a]=c},apply:function(a,b){var c=this.frames;if(!(b<c[0])){var d;d=b>=c[c.length-1]?c.length-1:f.binarySearch(c,b,1)-1;var e=this.attachmentNames[d];a.slots[this.slotIndex].setAttachment(e?a.getAttachmentBySlotIndex(this.slotIndex,e):null)}}},f.SkeletonData=function(){this.bones=[],this.slots=[],this.skins=[],this.animations=[]},f.SkeletonData.prototype={defaultSkin:null,findBone:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},findBoneIndex:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].name==a)return c;return-1},findSlot:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].name==a)return slot[c];return null},findSlotIndex:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].name==a)return c;return-1},findSkin:function(a){for(var b=this.skins,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},findAnimation:function(a){for(var b=this.animations,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null}},f.Skeleton=function(a){this.data=a,this.bones=[];
for(var b=0,c=a.bones.length;c>b;b++){var d=a.bones[b],e=d.parent?this.bones[a.bones.indexOf(d.parent)]:null;this.bones.push(new f.Bone(d,e))}for(this.slots=[],this.drawOrder=[],b=0,c=a.slots.length;c>b;b++){var g=a.slots[b],h=this.bones[a.bones.indexOf(g.boneData)],i=new f.Slot(g,this,h);this.slots.push(i),this.drawOrder.push(i)}},f.Skeleton.prototype={x:0,y:0,skin:null,r:1,g:1,b:1,a:1,time:0,flipX:!1,flipY:!1,updateWorldTransform:function(){for(var a=this.flipX,b=this.flipY,c=this.bones,d=0,e=c.length;e>d;d++)c[d].updateWorldTransform(a,b)},setToSetupPose:function(){this.setBonesToSetupPose(),this.setSlotsToSetupPose()},setBonesToSetupPose:function(){for(var a=this.bones,b=0,c=a.length;c>b;b++)a[b].setToSetupPose()},setSlotsToSetupPose:function(){for(var a=this.slots,b=0,c=a.length;c>b;b++)a[b].setToSetupPose(b)},getRootBone:function(){return this.bones.length?this.bones[0]:null},findBone:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return b[c];return null},findBoneIndex:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return c;return-1},findSlot:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return b[c];return null},findSlotIndex:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return c;return-1},setSkinByName:function(a){var b=this.data.findSkin(a);if(!b)throw"Skin not found: "+a;this.setSkin(b)},setSkin:function(a){this.skin&&a&&a._attachAll(this,this.skin),this.skin=a},getAttachmentBySlotName:function(a,b){return this.getAttachmentBySlotIndex(this.data.findSlotIndex(a),b)},getAttachmentBySlotIndex:function(a,b){if(this.skin){var c=this.skin.getAttachment(a,b);if(c)return c}return this.data.defaultSkin?this.data.defaultSkin.getAttachment(a,b):null},setAttachment:function(a,b){for(var c=this.slots,d=0,e=c.size;e>d;d++){var f=c[d];if(f.data.name==a){var g=null;if(b&&(g=this.getAttachment(d,b),null==g))throw"Attachment not found: "+b+", for slot: "+a;return f.setAttachment(g),void 0}}throw"Slot not found: "+a},update:function(a){time+=a}},f.AttachmentType={region:0},f.RegionAttachment=function(){this.offset=[],this.offset.length=8,this.uvs=[],this.uvs.length=8},f.RegionAttachment.prototype={x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:0,height:0,rendererObject:null,regionOffsetX:0,regionOffsetY:0,regionWidth:0,regionHeight:0,regionOriginalWidth:0,regionOriginalHeight:0,setUVs:function(a,b,c,d,e){var f=this.uvs;e?(f[2]=a,f[3]=d,f[4]=a,f[5]=b,f[6]=c,f[7]=b,f[0]=c,f[1]=d):(f[0]=a,f[1]=d,f[2]=a,f[3]=b,f[4]=c,f[5]=b,f[6]=c,f[7]=d)},updateOffset:function(){var a=this.width/this.regionOriginalWidth*this.scaleX,b=this.height/this.regionOriginalHeight*this.scaleY,c=-this.width/2*this.scaleX+this.regionOffsetX*a,d=-this.height/2*this.scaleY+this.regionOffsetY*b,e=c+this.regionWidth*a,f=d+this.regionHeight*b,g=this.rotation*Math.PI/180,h=Math.cos(g),i=Math.sin(g),j=c*h+this.x,k=c*i,l=d*h+this.y,m=d*i,n=e*h+this.x,o=e*i,p=f*h+this.y,q=f*i,r=this.offset;r[0]=j-m,r[1]=l+k,r[2]=j-q,r[3]=p+k,r[4]=n-q,r[5]=p+o,r[6]=n-m,r[7]=l+o},computeVertices:function(a,b,c,d){a+=c.worldX,b+=c.worldY;var e=c.m00,f=c.m01,g=c.m10,h=c.m11,i=this.offset;d[0]=i[0]*e+i[1]*f+a,d[1]=i[0]*g+i[1]*h+b,d[2]=i[2]*e+i[3]*f+a,d[3]=i[2]*g+i[3]*h+b,d[4]=i[4]*e+i[5]*f+a,d[5]=i[4]*g+i[5]*h+b,d[6]=i[6]*e+i[7]*f+a,d[7]=i[6]*g+i[7]*h+b}},f.AnimationStateData=function(a){this.skeletonData=a,this.animationToMixTime={}},f.AnimationStateData.prototype={defaultMix:0,setMixByName:function(a,b,c){var d=this.skeletonData.findAnimation(a);if(!d)throw"Animation not found: "+a;var e=this.skeletonData.findAnimation(b);if(!e)throw"Animation not found: "+b;this.setMix(d,e,c)},setMix:function(a,b,c){this.animationToMixTime[a.name+":"+b.name]=c},getMix:function(a,b){var c=this.animationToMixTime[a.name+":"+b.name];return c?c:this.defaultMix}},f.AnimationState=function(a){this.data=a,this.queue=[]},f.AnimationState.prototype={animationSpeed:1,current:null,previous:null,currentTime:0,previousTime:0,currentLoop:!1,previousLoop:!1,mixTime:0,mixDuration:0,update:function(a){if(this.currentTime+=a*this.animationSpeed,this.previousTime+=a,this.mixTime+=a,this.queue.length>0){var b=this.queue[0];this.currentTime>=b.delay&&(this._setAnimation(b.animation,b.loop),this.queue.shift())}},apply:function(a){if(this.current)if(this.previous){this.previous.apply(a,this.previousTime,this.previousLoop);var b=this.mixTime/this.mixDuration;b>=1&&(b=1,this.previous=null),this.current.mix(a,this.currentTime,this.currentLoop,b)}else this.current.apply(a,this.currentTime,this.currentLoop)},clearAnimation:function(){this.previous=null,this.current=null,this.queue.length=0},_setAnimation:function(a,b){this.previous=null,a&&this.current&&(this.mixDuration=this.data.getMix(this.current,a),this.mixDuration>0&&(this.mixTime=0,this.previous=this.current,this.previousTime=this.currentTime,this.previousLoop=this.currentLoop)),this.current=a,this.currentLoop=b,this.currentTime=0},setAnimationByName:function(a,b){var c=this.data.skeletonData.findAnimation(a);if(!c)throw"Animation not found: "+a;this.setAnimation(c,b)},setAnimation:function(a,b){this.queue.length=0,this._setAnimation(a,b)},addAnimationByName:function(a,b,c){var d=this.data.skeletonData.findAnimation(a);if(!d)throw"Animation not found: "+a;this.addAnimation(d,b,c)},addAnimation:function(a,b,c){var d={};if(d.animation=a,d.loop=b,!c||0>=c){var e=this.queue.length?this.queue[this.queue.length-1].animation:this.current;c=null!=e?e.duration-this.data.getMix(e,a)+(c||0):0}d.delay=c,this.queue.push(d)},isComplete:function(){return!this.current||this.currentTime>=this.current.duration}},f.SkeletonJson=function(a){this.attachmentLoader=a},f.SkeletonJson.prototype={scale:1,readSkeletonData:function(a){for(var b,c=new f.SkeletonData,d=a.bones,e=0,g=d.length;g>e;e++){var h=d[e],i=null;if(h.parent&&(i=c.findBone(h.parent),!i))throw"Parent bone not found: "+h.parent;b=new f.BoneData(h.name,i),b.length=(h.length||0)*this.scale,b.x=(h.x||0)*this.scale,b.y=(h.y||0)*this.scale,b.rotation=h.rotation||0,b.scaleX=h.scaleX||1,b.scaleY=h.scaleY||1,c.bones.push(b)}var j=a.slots;for(e=0,g=j.length;g>e;e++){var k=j[e];if(b=c.findBone(k.bone),!b)throw"Slot bone not found: "+k.bone;var l=new f.SlotData(k.name,b),m=k.color;m&&(l.r=f.SkeletonJson.toColor(m,0),l.g=f.SkeletonJson.toColor(m,1),l.b=f.SkeletonJson.toColor(m,2),l.a=f.SkeletonJson.toColor(m,3)),l.attachmentName=k.attachment,c.slots.push(l)}var n=a.skins;for(var o in n)if(n.hasOwnProperty(o)){var p=n[o],q=new f.Skin(o);for(var r in p)if(p.hasOwnProperty(r)){var s=c.findSlotIndex(r),t=p[r];for(var u in t)if(t.hasOwnProperty(u)){var v=this.readAttachment(q,u,t[u]);null!=v&&q.addAttachment(s,u,v)}}c.skins.push(q),"default"==q.name&&(c.defaultSkin=q)}var w=a.animations;for(var x in w)w.hasOwnProperty(x)&&this.readAnimation(x,w[x],c);return c},readAttachment:function(a,b,c){b=c.name||b;var d=f.AttachmentType[c.type||"region"];if(d==f.AttachmentType.region){var e=new f.RegionAttachment;return e.x=(c.x||0)*this.scale,e.y=(c.y||0)*this.scale,e.scaleX=c.scaleX||1,e.scaleY=c.scaleY||1,e.rotation=c.rotation||0,e.width=(c.width||32)*this.scale,e.height=(c.height||32)*this.scale,e.updateOffset(),e.rendererObject={},e.rendererObject.name=b,e.rendererObject.scale={},e.rendererObject.scale.x=e.scaleX,e.rendererObject.scale.y=e.scaleY,e.rendererObject.rotation=-e.rotation*Math.PI/180,e}throw"Unknown attachment type: "+d},readAnimation:function(a,b,c){var d,e,g,h,i,j,k,l=[],m=0,n=b.bones;for(var o in n)if(n.hasOwnProperty(o)){var p=c.findBoneIndex(o);if(-1==p)throw"Bone not found: "+o;var q=n[o];for(g in q)if(q.hasOwnProperty(g))if(i=q[g],"rotate"==g){for(e=new f.RotateTimeline(i.length),e.boneIndex=p,d=0,j=0,k=i.length;k>j;j++)h=i[j],e.setFrame(d,h.time,h.angle),f.SkeletonJson.readCurve(e,d,h),d++;l.push(e),m=Math.max(m,e.frames[2*e.getFrameCount()-2])}else{if("translate"!=g&&"scale"!=g)throw"Invalid timeline type for a bone: "+g+" ("+o+")";var r=1;for("scale"==g?e=new f.ScaleTimeline(i.length):(e=new f.TranslateTimeline(i.length),r=this.scale),e.boneIndex=p,d=0,j=0,k=i.length;k>j;j++){h=i[j];var s=(h.x||0)*r,t=(h.y||0)*r;e.setFrame(d,h.time,s,t),f.SkeletonJson.readCurve(e,d,h),d++}l.push(e),m=Math.max(m,e.frames[3*e.getFrameCount()-3])}}var u=b.slots;for(var v in u)if(u.hasOwnProperty(v)){var w=u[v],x=c.findSlotIndex(v);for(g in w)if(w.hasOwnProperty(g))if(i=w[g],"color"==g){for(e=new f.ColorTimeline(i.length),e.slotIndex=x,d=0,j=0,k=i.length;k>j;j++){h=i[j];var y=h.color,z=f.SkeletonJson.toColor(y,0),A=f.SkeletonJson.toColor(y,1),B=f.SkeletonJson.toColor(y,2),C=f.SkeletonJson.toColor(y,3);e.setFrame(d,h.time,z,A,B,C),f.SkeletonJson.readCurve(e,d,h),d++}l.push(e),m=Math.max(m,e.frames[5*e.getFrameCount()-5])}else{if("attachment"!=g)throw"Invalid timeline type for a slot: "+g+" ("+v+")";for(e=new f.AttachmentTimeline(i.length),e.slotIndex=x,d=0,j=0,k=i.length;k>j;j++)h=i[j],e.setFrame(d++,h.time,h.name);l.push(e),m=Math.max(m,e.frames[e.getFrameCount()-1])}}c.animations.push(new f.Animation(a,l,m))}},f.SkeletonJson.readCurve=function(a,b,c){var d=c.curve;d&&("stepped"==d?a.curves.setStepped(b):d instanceof Array&&a.curves.setCurve(b,d[0],d[1],d[2],d[3]))},f.SkeletonJson.toColor=function(a,b){if(8!=a.length)throw"Color hexidecimal length must be 8, recieved: "+a;return parseInt(a.substr(2*b,2),16)/255},f.Atlas=function(a,b){this.textureLoader=b,this.pages=[],this.regions=[];var c=new f.AtlasReader(a),d=[];d.length=4;for(var e=null;;){var g=c.readLine();if(null==g)break;if(g=c.trim(g),g.length)if(e){var h=new f.AtlasRegion;h.name=g,h.page=e,h.rotate="true"==c.readValue(),c.readTuple(d);var i=parseInt(d[0],10),j=parseInt(d[1],10);c.readTuple(d);var k=parseInt(d[0],10),l=parseInt(d[1],10);h.u=i/e.width,h.v=j/e.height,h.rotate?(h.u2=(i+l)/e.width,h.v2=(j+k)/e.height):(h.u2=(i+k)/e.width,h.v2=(j+l)/e.height),h.x=i,h.y=j,h.width=Math.abs(k),h.height=Math.abs(l),4==c.readTuple(d)&&(h.splits=[parseInt(d[0],10),parseInt(d[1],10),parseInt(d[2],10),parseInt(d[3],10)],4==c.readTuple(d)&&(h.pads=[parseInt(d[0],10),parseInt(d[1],10),parseInt(d[2],10),parseInt(d[3],10)],c.readTuple(d))),h.originalWidth=parseInt(d[0],10),h.originalHeight=parseInt(d[1],10),c.readTuple(d),h.offsetX=parseInt(d[0],10),h.offsetY=parseInt(d[1],10),h.index=parseInt(c.readValue(),10),this.regions.push(h)}else{e=new f.AtlasPage,e.name=g,e.format=f.Atlas.Format[c.readValue()],c.readTuple(d),e.minFilter=f.Atlas.TextureFilter[d[0]],e.magFilter=f.Atlas.TextureFilter[d[1]];var m=c.readValue();e.uWrap=f.Atlas.TextureWrap.clampToEdge,e.vWrap=f.Atlas.TextureWrap.clampToEdge,"x"==m?e.uWrap=f.Atlas.TextureWrap.repeat:"y"==m?e.vWrap=f.Atlas.TextureWrap.repeat:"xy"==m&&(e.uWrap=e.vWrap=f.Atlas.TextureWrap.repeat),b.load(e,g),this.pages.push(e)}else e=null}},f.Atlas.prototype={findRegion:function(a){for(var b=this.regions,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},dispose:function(){for(var a=this.pages,b=0,c=a.length;c>b;b++)this.textureLoader.unload(a[b].rendererObject)},updateUVs:function(a){for(var b=this.regions,c=0,d=b.length;d>c;c++){var e=b[c];e.page==a&&(e.u=e.x/a.width,e.v=e.y/a.height,e.rotate?(e.u2=(e.x+e.height)/a.width,e.v2=(e.y+e.width)/a.height):(e.u2=(e.x+e.width)/a.width,e.v2=(e.y+e.height)/a.height))}}},f.Atlas.Format={alpha:0,intensity:1,luminanceAlpha:2,rgb565:3,rgba4444:4,rgb888:5,rgba8888:6},f.Atlas.TextureFilter={nearest:0,linear:1,mipMap:2,mipMapNearestNearest:3,mipMapLinearNearest:4,mipMapNearestLinear:5,mipMapLinearLinear:6},f.Atlas.TextureWrap={mirroredRepeat:0,clampToEdge:1,repeat:2},f.AtlasPage=function(){},f.AtlasPage.prototype={name:null,format:null,minFilter:null,magFilter:null,uWrap:null,vWrap:null,rendererObject:null,width:0,height:0},f.AtlasRegion=function(){},f.AtlasRegion.prototype={page:null,name:null,x:0,y:0,width:0,height:0,u:0,v:0,u2:0,v2:0,offsetX:0,offsetY:0,originalWidth:0,originalHeight:0,index:0,rotate:!1,splits:null,pads:null},f.AtlasReader=function(a){this.lines=a.split(/\r\n|\r|\n/)},f.AtlasReader.prototype={index:0,trim:function(a){return a.replace(/^\s+|\s+$/g,"")},readLine:function(){return this.index>=this.lines.length?null:this.lines[this.index++]},readValue:function(){var a=this.readLine(),b=a.indexOf(":");if(-1==b)throw"Invalid line: "+a;return this.trim(a.substring(b+1))},readTuple:function(a){var b=this.readLine(),c=b.indexOf(":");if(-1==c)throw"Invalid line: "+b;for(var d=0,e=c+1;3>d;d++){var f=b.indexOf(",",e);if(-1==f){if(!d)throw"Invalid line: "+b;break}a[d]=this.trim(b.substr(e,f-e)),e=f+1}return a[d]=this.trim(b.substring(e)),d+1}},f.AtlasAttachmentLoader=function(a){this.atlas=a},f.AtlasAttachmentLoader.prototype={newAttachment:function(a,b,c){switch(b){case f.AttachmentType.region:var d=this.atlas.findRegion(c);if(!d)throw"Region not found in atlas: "+c+" ("+b+")";var e=new f.RegionAttachment(c);return e.rendererObject=d,e.setUVs(d.u,d.v,d.u2,d.v2,d.rotate),e.regionOffsetX=d.offsetX,e.regionOffsetY=d.offsetY,e.regionWidth=d.width,e.regionHeight=d.height,e.regionOriginalWidth=d.originalWidth,e.regionOriginalHeight=d.originalHeight,e}throw"Unknown attachment type: "+b}},f.Bone.yDown=!0,b.AnimCache={},b.Spine=function(a){if(b.DisplayObjectContainer.call(this),this.spineData=b.AnimCache[a],!this.spineData)throw new Error("Spine data must be preloaded using PIXI.SpineLoader or PIXI.AssetLoader: "+a);this.skeleton=new f.Skeleton(this.spineData),this.skeleton.updateWorldTransform(),this.stateData=new f.AnimationStateData(this.spineData),this.state=new f.AnimationState(this.stateData),this.slotContainers=[];for(var c=0,d=this.skeleton.drawOrder.length;d>c;c++){var e=this.skeleton.drawOrder[c],g=e.attachment,h=new b.DisplayObjectContainer;if(this.slotContainers.push(h),this.addChild(h),g instanceof f.RegionAttachment){var i=g.rendererObject.name,j=this.createSprite(e,g.rendererObject);e.currentSprite=j,e.currentSpriteName=i,h.addChild(j)}}},b.Spine.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Spine.prototype.constructor=b.Spine,b.Spine.prototype.updateTransform=function(){this.lastTime=this.lastTime||Date.now();var a=.001*(Date.now()-this.lastTime);this.lastTime=Date.now(),this.state.update(a),this.state.apply(this.skeleton),this.skeleton.updateWorldTransform();for(var c=this.skeleton.drawOrder,d=0,e=c.length;e>d;d++){var g=c[d],h=g.attachment,i=this.slotContainers[d];if(h instanceof f.RegionAttachment){if(h.rendererObject&&(!g.currentSpriteName||g.currentSpriteName!=h.name)){var j=h.rendererObject.name;if(void 0!==g.currentSprite&&(g.currentSprite.visible=!1),g.sprites=g.sprites||{},void 0!==g.sprites[j])g.sprites[j].visible=!0;else{var k=this.createSprite(g,h.rendererObject);i.addChild(k)}g.currentSprite=g.sprites[j],g.currentSpriteName=j}i.visible=!0;var l=g.bone;i.position.x=l.worldX+h.x*l.m00+h.y*l.m01,i.position.y=l.worldY+h.x*l.m10+h.y*l.m11,i.scale.x=l.worldScaleX,i.scale.y=l.worldScaleY,i.rotation=-(g.bone.worldRotation*Math.PI/180),i.alpha=g.a,g.currentSprite.tint=b.rgb2hex([g.r,g.g,g.b])}else i.visible=!1}b.DisplayObjectContainer.prototype.updateTransform.call(this)},b.Spine.prototype.createSprite=function(a,c){var d=b.TextureCache[c.name]?c.name:c.name+".png",e=new b.Sprite(b.Texture.fromFrame(d));return e.scale=c.scale,e.rotation=c.rotation,e.anchor.x=e.anchor.y=.5,a.sprites=a.sprites||{},a.sprites[c.name]=e,e},b.BaseTextureCache={},b.texturesToUpdate=[],b.texturesToDestroy=[],b.BaseTextureCacheIdGenerator=0,b.BaseTexture=function(a,c){if(b.EventTarget.call(this),this.width=100,this.height=100,this.scaleMode=c||b.scaleModes.DEFAULT,this.hasLoaded=!1,this.source=a,this.id=b.BaseTextureCacheIdGenerator++,this.premultipliedAlpha=!0,this._glTextures=[],this._dirty=[],a){if((this.source.complete||this.source.getContext)&&this.source.width&&this.source.height)this.hasLoaded=!0,this.width=this.source.width,this.height=this.source.height,b.texturesToUpdate.push(this);else{var d=this;this.source.onload=function(){d.hasLoaded=!0,d.width=d.source.width,d.height=d.source.height;for(var a=0;a<d._glTextures.length;a++)d._dirty[a]=!0;d.dispatchEvent({type:"loaded",content:d})},this.source.onerror=function(){d.dispatchEvent({type:"error",content:d})}}this.imageUrl=null,this._powerOf2=!1}},b.BaseTexture.prototype.constructor=b.BaseTexture,b.BaseTexture.prototype.destroy=function(){this.imageUrl?(delete b.BaseTextureCache[this.imageUrl],delete b.TextureCache[this.imageUrl],this.imageUrl=null,this.source.src=null):this.source&&this.source._pixiId&&delete b.BaseTextureCache[this.source._pixiId],this.source=null,b.texturesToDestroy.push(this)},b.BaseTexture.prototype.updateSourceImage=function(a){this.hasLoaded=!1,this.source.src=null,this.source.src=a},b.BaseTexture.fromImage=function(a,c,d){var e=b.BaseTextureCache[a];if(void 0===c&&-1===a.indexOf("data:")&&(c=!0),!e){var f=new Image;c&&(f.crossOrigin=""),f.src=a,e=new b.BaseTexture(f,d),e.imageUrl=a,b.BaseTextureCache[a]=e}return e},b.BaseTexture.fromCanvas=function(a,c){a._pixiId||(a._pixiId="canvas_"+b.TextureCacheIdGenerator++);var d=b.BaseTextureCache[a._pixiId];return d||(d=new b.BaseTexture(a,c),b.BaseTextureCache[a._pixiId]=d),d},b.TextureCache={},b.FrameCache={},b.TextureCacheIdGenerator=0,b.Texture=function(a,c){if(b.EventTarget.call(this),this.noFrame=!1,c||(this.noFrame=!0,c=new b.Rectangle(0,0,1,1)),a instanceof b.Texture&&(a=a.baseTexture),this.baseTexture=a,this.frame=c,this.trim=null,this.valid=!1,this.scope=this,this._uvs=null,this.width=0,this.height=0,this.crop=new b.Rectangle(0,0,1,1),a.hasLoaded)this.noFrame&&(c=new b.Rectangle(0,0,a.width,a.height)),this.setFrame(c);else{var d=this;a.addEventListener("loaded",function(){d.onBaseTextureLoaded()})}},b.Texture.prototype.constructor=b.Texture,b.Texture.prototype.onBaseTextureLoaded=function(){var a=this.baseTexture;a.removeEventListener("loaded",this.onLoaded),this.noFrame&&(this.frame=new b.Rectangle(0,0,a.width,a.height)),this.setFrame(this.frame),this.scope.dispatchEvent({type:"update",content:this})},b.Texture.prototype.destroy=function(a){a&&this.baseTexture.destroy(),this.valid=!1},b.Texture.prototype.setFrame=function(a){if(this.noFrame=!1,this.frame=a,this.width=a.width,this.height=a.height,this.crop.x=a.x,this.crop.y=a.y,this.crop.width=a.width,this.crop.height=a.height,!this.trim&&(a.x+a.width>this.baseTexture.width||a.y+a.height>this.baseTexture.height))throw new Error("Texture Error: frame does not fit inside the base Texture dimensions "+this);this.valid=a&&a.width&&a.height&&this.baseTexture.source&&this.baseTexture.hasLoaded,this.trim&&(this.width=this.trim.width,this.height=this.trim.height,this.frame.width=this.trim.width,this.frame.height=this.trim.height),this.valid&&b.Texture.frameUpdates.push(this)},b.Texture.prototype._updateWebGLuvs=function(){this._uvs||(this._uvs=new b.TextureUvs);var a=this.crop,c=this.baseTexture.width,d=this.baseTexture.height;this._uvs.x0=a.x/c,this._uvs.y0=a.y/d,this._uvs.x1=(a.x+a.width)/c,this._uvs.y1=a.y/d,this._uvs.x2=(a.x+a.width)/c,this._uvs.y2=(a.y+a.height)/d,this._uvs.x3=a.x/c,this._uvs.y3=(a.y+a.height)/d},b.Texture.fromImage=function(a,c,d){var e=b.TextureCache[a];return e||(e=new b.Texture(b.BaseTexture.fromImage(a,c,d)),b.TextureCache[a]=e),e},b.Texture.fromFrame=function(a){var c=b.TextureCache[a];if(!c)throw new Error('The frameId "'+a+'" does not exist in the texture cache ');return c},b.Texture.fromCanvas=function(a,c){var d=b.BaseTexture.fromCanvas(a,c);return new b.Texture(d)},b.Texture.addTextureToCache=function(a,c){b.TextureCache[c]=a},b.Texture.removeTextureFromCache=function(a){var c=b.TextureCache[a];return delete b.TextureCache[a],delete b.BaseTextureCache[a],c},b.Texture.frameUpdates=[],b.TextureUvs=function(){this.x0=0,this.y0=0,this.x1=0,this.y1=0,this.x2=0,this.y2=0,this.x3=0,this.y3=0},b.RenderTexture=function(a,c,d,e){if(b.EventTarget.call(this),this.width=a||100,this.height=c||100,this.frame=new b.Rectangle(0,0,this.width,this.height),this.crop=new b.Rectangle(0,0,this.width,this.height),this.baseTexture=new b.BaseTexture,this.baseTexture.width=this.width,this.baseTexture.height=this.height,this.baseTexture._glTextures=[],this.baseTexture.scaleMode=e||b.scaleModes.DEFAULT,this.baseTexture.hasLoaded=!0,this.renderer=d||b.defaultRenderer,this.renderer.type===b.WEBGL_RENDERER){var f=this.renderer.gl;this.textureBuffer=new b.FilterTexture(f,this.width,this.height,this.baseTexture.scaleMode),this.baseTexture._glTextures[f.id]=this.textureBuffer.texture,this.render=this.renderWebGL,this.projection=new b.Point(this.width/2,-this.height/2)}else this.render=this.renderCanvas,this.textureBuffer=new b.CanvasBuffer(this.width,this.height),this.baseTexture.source=this.textureBuffer.canvas;this.valid=!0,b.Texture.frameUpdates.push(this)},b.RenderTexture.prototype=Object.create(b.Texture.prototype),b.RenderTexture.prototype.constructor=b.RenderTexture,b.RenderTexture.prototype.resize=function(a,c,d){(a!==this.width||c!==this.height)&&(this.width=this.frame.width=this.crop.width=a,this.height=this.frame.height=this.crop.height=c,d&&(this.baseTexture.width=this.width,this.baseTexture.height=this.height),this.renderer.type===b.WEBGL_RENDERER&&(this.projection.x=this.width/2,this.projection.y=-this.height/2),this.textureBuffer.resize(this.width,this.height))},b.RenderTexture.prototype.clear=function(){this.renderer.type===b.WEBGL_RENDERER&&this.renderer.gl.bindFramebuffer(this.renderer.gl.FRAMEBUFFER,this.textureBuffer.frameBuffer),this.textureBuffer.clear()},b.RenderTexture.prototype.renderWebGL=function(a,c,d){var e=this.renderer.gl;e.colorMask(!0,!0,!0,!0),e.viewport(0,0,this.width,this.height),e.bindFramebuffer(e.FRAMEBUFFER,this.textureBuffer.frameBuffer),d&&this.textureBuffer.clear();var f=a.children,g=a.worldTransform;a.worldTransform=b.RenderTexture.tempMatrix,a.worldTransform.d=-1,a.worldTransform.ty=-2*this.projection.y,c&&(a.worldTransform.tx=c.x,a.worldTransform.ty-=c.y);for(var h=0,i=f.length;i>h;h++)f[h].updateTransform();b.WebGLRenderer.updateTextures(),this.renderer.spriteBatch.dirty=!0,this.renderer.renderDisplayObject(a,this.projection,this.textureBuffer.frameBuffer),a.worldTransform=g,this.renderer.spriteBatch.dirty=!0},b.RenderTexture.prototype.renderCanvas=function(a,c,d){var e=a.children,f=a.worldTransform;a.worldTransform=b.RenderTexture.tempMatrix,c?(a.worldTransform.tx=c.x,a.worldTransform.ty=c.y):(a.worldTransform.tx=0,a.worldTransform.ty=0);for(var g=0,h=e.length;h>g;g++)e[g].updateTransform();d&&this.textureBuffer.clear();var i=this.textureBuffer.context;this.renderer.renderDisplayObject(a,i),i.setTransform(1,0,0,1,0,0),a.worldTransform=f},b.RenderTexture.tempMatrix=new b.Matrix,b.AssetLoader=function(a,c){b.EventTarget.call(this),this.assetURLs=a,this.crossorigin=c,this.loadersByType={jpg:b.ImageLoader,jpeg:b.ImageLoader,png:b.ImageLoader,gif:b.ImageLoader,webp:b.ImageLoader,json:b.JsonLoader,atlas:b.AtlasLoader,anim:b.SpineLoader,xml:b.BitmapFontLoader,fnt:b.BitmapFontLoader}},b.AssetLoader.prototype.constructor=b.AssetLoader,b.AssetLoader.prototype._getDataType=function(a){var b="data:",c=a.slice(0,b.length).toLowerCase();if(c===b){var d=a.slice(b.length),e=d.indexOf(",");if(-1===e)return null;var f=d.slice(0,e).split(";")[0];return f&&"text/plain"!==f.toLowerCase()?f.split("/").pop().toLowerCase():"txt"}return null},b.AssetLoader.prototype.load=function(){function a(a){b.onAssetLoaded(a.content)}var b=this;this.loadCount=this.assetURLs.length;for(var c=0;c<this.assetURLs.length;c++){var d=this.assetURLs[c],e=this._getDataType(d);e||(e=d.split("?").shift().split(".").pop().toLowerCase());var f=this.loadersByType[e];if(!f)throw new Error(e+" is an unsupported file type");var g=new f(d,this.crossorigin);g.addEventListener("loaded",a),g.load()}},b.AssetLoader.prototype.onAssetLoaded=function(a){this.loadCount--,this.dispatchEvent({type:"onProgress",content:this,loader:a}),this.onProgress&&this.onProgress(a),this.loadCount||(this.dispatchEvent({type:"onComplete",content:this}),this.onComplete&&this.onComplete())},b.JsonLoader=function(a,c){b.EventTarget.call(this),this.url=a,this.crossorigin=c,this.baseUrl=a.replace(/[^\/]*$/,""),this.loaded=!1},b.JsonLoader.prototype.constructor=b.JsonLoader,b.JsonLoader.prototype.load=function(){var a=this;window.XDomainRequest&&a.crossorigin?(this.ajaxRequest=new window.XDomainRequest,this.ajaxRequest.timeout=3e3,this.ajaxRequest.onerror=function(){a.onError()},this.ajaxRequest.ontimeout=function(){a.onError()},this.ajaxRequest.onprogress=function(){}):this.ajaxRequest=window.XMLHttpRequest?new window.XMLHttpRequest:new window.ActiveXObject("Microsoft.XMLHTTP"),this.ajaxRequest.onload=function(){a.onJSONLoaded()},this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.send()},b.JsonLoader.prototype.onJSONLoaded=function(){if(!this.ajaxRequest.responseText)return this.onError(),void 0;if(this.json=JSON.parse(this.ajaxRequest.responseText),this.json.frames){var a=this,c=this.baseUrl+this.json.meta.image,d=new b.ImageLoader(c,this.crossorigin),e=this.json.frames;this.texture=d.texture.baseTexture,d.addEventListener("loaded",function(){a.onLoaded()});for(var g in e){var h=e[g].frame;if(h&&(b.TextureCache[g]=new b.Texture(this.texture,{x:h.x,y:h.y,width:h.w,height:h.h}),b.TextureCache[g].crop=new b.Rectangle(h.x,h.y,h.w,h.h),e[g].trimmed)){var i=e[g].sourceSize,j=e[g].spriteSourceSize;b.TextureCache[g].trim=new b.Rectangle(j.x,j.y,i.w,i.h)}}d.load()}else if(this.json.bones){var k=new f.SkeletonJson,l=k.readSkeletonData(this.json);b.AnimCache[this.url]=l,this.onLoaded()}else this.onLoaded()},b.JsonLoader.prototype.onLoaded=function(){this.loaded=!0,this.dispatchEvent({type:"loaded",content:this})},b.JsonLoader.prototype.onError=function(){this.dispatchEvent({type:"error",content:this})},b.AtlasLoader=function(a,c){b.EventTarget.call(this),this.url=a,this.baseUrl=a.replace(/[^\/]*$/,""),this.crossorigin=c,this.loaded=!1},b.AtlasLoader.constructor=b.AtlasLoader,b.AtlasLoader.prototype.load=function(){this.ajaxRequest=new b.AjaxRequest,this.ajaxRequest.onreadystatechange=this.onAtlasLoaded.bind(this),this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.overrideMimeType&&this.ajaxRequest.overrideMimeType("application/json"),this.ajaxRequest.send(null)},b.AtlasLoader.prototype.onAtlasLoaded=function(){if(4===this.ajaxRequest.readyState)if(200===this.ajaxRequest.status||-1===window.location.href.indexOf("http")){this.atlas={meta:{image:[]},frames:[]};var a=this.ajaxRequest.responseText.split(/\r?\n/),c=-3,d=0,e=null,f=!1,g=0,h=0,i=this.onLoaded.bind(this);for(g=0;g<a.length;g++)if(a[g]=a[g].replace(/^\s+|\s+$/g,""),""===a[g]&&(f=g+1),a[g].length>0){if(f===g)this.atlas.meta.image.push(a[g]),d=this.atlas.meta.image.length-1,this.atlas.frames.push({}),c=-3;else if(c>0)if(c%7===1)null!=e&&(this.atlas.frames[d][e.name]=e),e={name:a[g],frame:{}};else{var j=a[g].split(" ");if(c%7===3)e.frame.x=Number(j[1].replace(",","")),e.frame.y=Number(j[2]);else if(c%7===4)e.frame.w=Number(j[1].replace(",","")),e.frame.h=Number(j[2]);else if(c%7===5){var k={x:0,y:0,w:Number(j[1].replace(",","")),h:Number(j[2])};k.w>e.frame.w||k.h>e.frame.h?(e.trimmed=!0,e.realSize=k):e.trimmed=!1}}c++}if(null!=e&&(this.atlas.frames[d][e.name]=e),this.atlas.meta.image.length>0){for(this.images=[],h=0;h<this.atlas.meta.image.length;h++){var l=this.baseUrl+this.atlas.meta.image[h],m=this.atlas.frames[h];this.images.push(new b.ImageLoader(l,this.crossorigin));for(g in m){var n=m[g].frame;n&&(b.TextureCache[g]=new b.Texture(this.images[h].texture.baseTexture,{x:n.x,y:n.y,width:n.w,height:n.h}),m[g].trimmed&&(b.TextureCache[g].realSize=m[g].realSize,b.TextureCache[g].trim.x=0,b.TextureCache[g].trim.y=0))}}for(this.currentImageId=0,h=0;h<this.images.length;h++)this.images[h].addEventListener("loaded",i);this.images[this.currentImageId].load()}else this.onLoaded()}else this.onError()},b.AtlasLoader.prototype.onLoaded=function(){this.images.length-1>this.currentImageId?(this.currentImageId++,this.images[this.currentImageId].load()):(this.loaded=!0,this.dispatchEvent({type:"loaded",content:this}))},b.AtlasLoader.prototype.onError=function(){this.dispatchEvent({type:"error",content:this})},b.SpriteSheetLoader=function(a,c){b.EventTarget.call(this),this.url=a,this.crossorigin=c,this.baseUrl=a.replace(/[^\/]*$/,""),this.texture=null,this.frames={}},b.SpriteSheetLoader.prototype.constructor=b.SpriteSheetLoader,b.SpriteSheetLoader.prototype.load=function(){var a=this,c=new b.JsonLoader(this.url,this.crossorigin);c.addEventListener("loaded",function(b){a.json=b.content.json,a.onLoaded()}),c.load()},b.SpriteSheetLoader.prototype.onLoaded=function(){this.dispatchEvent({type:"loaded",content:this})},b.ImageLoader=function(a,c){b.EventTarget.call(this),this.texture=b.Texture.fromImage(a,c),this.frames=[]},b.ImageLoader.prototype.constructor=b.ImageLoader,b.ImageLoader.prototype.load=function(){if(this.texture.baseTexture.hasLoaded)this.onLoaded();else{var a=this;this.texture.baseTexture.addEventListener("loaded",function(){a.onLoaded()})}},b.ImageLoader.prototype.onLoaded=function(){this.dispatchEvent({type:"loaded",content:this})},b.ImageLoader.prototype.loadFramedSpriteSheet=function(a,c,d){this.frames=[];for(var e=Math.floor(this.texture.width/a),f=Math.floor(this.texture.height/c),g=0,h=0;f>h;h++)for(var i=0;e>i;i++,g++){var j=new b.Texture(this.texture,{x:i*a,y:h*c,width:a,height:c});this.frames.push(j),d&&(b.TextureCache[d+"-"+g]=j)}if(this.texture.baseTexture.hasLoaded)this.onLoaded();else{var k=this;this.texture.baseTexture.addEventListener("loaded",function(){k.onLoaded()})}},b.BitmapFontLoader=function(a,c){b.EventTarget.call(this),this.url=a,this.crossorigin=c,this.baseUrl=a.replace(/[^\/]*$/,""),this.texture=null},b.BitmapFontLoader.prototype.constructor=b.BitmapFontLoader,b.BitmapFontLoader.prototype.load=function(){this.ajaxRequest=new b.AjaxRequest;var a=this;this.ajaxRequest.onreadystatechange=function(){a.onXMLLoaded()},this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.overrideMimeType&&this.ajaxRequest.overrideMimeType("application/xml"),this.ajaxRequest.send(null)},b.BitmapFontLoader.prototype.onXMLLoaded=function(){if(4===this.ajaxRequest.readyState&&(200===this.ajaxRequest.status||-1===window.location.protocol.indexOf("http"))){var a=this.ajaxRequest.responseXML;if(!a||/MSIE 9/i.test(navigator.userAgent)||navigator.isCocoonJS)if("function"==typeof window.DOMParser){var c=new DOMParser;a=c.parseFromString(this.ajaxRequest.responseText,"text/xml")}else{var d=document.createElement("div");d.innerHTML=this.ajaxRequest.responseText,a=d}var e=this.baseUrl+a.getElementsByTagName("page")[0].getAttribute("file"),f=new b.ImageLoader(e,this.crossorigin);this.texture=f.texture.baseTexture;var g={},h=a.getElementsByTagName("info")[0],i=a.getElementsByTagName("common")[0];g.font=h.getAttribute("face"),g.size=parseInt(h.getAttribute("size"),10),g.lineHeight=parseInt(i.getAttribute("lineHeight"),10),g.chars={};for(var j=a.getElementsByTagName("char"),k=0;k<j.length;k++){var l=parseInt(j[k].getAttribute("id"),10),m=new b.Rectangle(parseInt(j[k].getAttribute("x"),10),parseInt(j[k].getAttribute("y"),10),parseInt(j[k].getAttribute("width"),10),parseInt(j[k].getAttribute("height"),10));g.chars[l]={xOffset:parseInt(j[k].getAttribute("xoffset"),10),yOffset:parseInt(j[k].getAttribute("yoffset"),10),xAdvance:parseInt(j[k].getAttribute("xadvance"),10),kerning:{},texture:b.TextureCache[l]=new b.Texture(this.texture,m)}}var n=a.getElementsByTagName("kerning");for(k=0;k<n.length;k++){var o=parseInt(n[k].getAttribute("first"),10),p=parseInt(n[k].getAttribute("second"),10),q=parseInt(n[k].getAttribute("amount"),10);g.chars[p].kerning[o]=q}b.BitmapText.fonts[g.font]=g;var r=this;f.addEventListener("loaded",function(){r.onLoaded()}),f.load()}},b.BitmapFontLoader.prototype.onLoaded=function(){this.dispatchEvent({type:"loaded",content:this})},b.SpineLoader=function(a,c){b.EventTarget.call(this),this.url=a,this.crossorigin=c,this.loaded=!1},b.SpineLoader.prototype.constructor=b.SpineLoader,b.SpineLoader.prototype.load=function(){var a=this,c=new b.JsonLoader(this.url,this.crossorigin);
c.addEventListener("loaded",function(b){a.json=b.content.json,a.onLoaded()}),c.load()},b.SpineLoader.prototype.onLoaded=function(){this.loaded=!0,this.dispatchEvent({type:"loaded",content:this})},b.AbstractFilter=function(a,b){this.passes=[this],this.shaders=[],this.dirty=!0,this.padding=0,this.uniforms=b||{},this.fragmentSrc=a||[]},b.AlphaMaskFilter=function(a){b.AbstractFilter.call(this),this.passes=[this],a.baseTexture._powerOf2=!0,this.uniforms={mask:{type:"sampler2D",value:a},mapDimensions:{type:"2f",value:{x:1,y:5112}},dimensions:{type:"4fv",value:[0,0,0,0]}},a.baseTexture.hasLoaded?(this.uniforms.mask.value.x=a.width,this.uniforms.mask.value.y=a.height):(this.boundLoadedFunction=this.onTextureLoaded.bind(this),a.baseTexture.on("loaded",this.boundLoadedFunction)),this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D mask;","uniform sampler2D uSampler;","uniform vec2 offset;","uniform vec4 dimensions;","uniform vec2 mapDimensions;","void main(void) {","   vec2 mapCords = vTextureCoord.xy;","   mapCords += (dimensions.zw + offset)/ dimensions.xy ;","   mapCords.y *= -1.0;","   mapCords.y += 1.0;","   mapCords *= dimensions.xy / mapDimensions;","   vec4 original =  texture2D(uSampler, vTextureCoord);","   float maskAlpha =  texture2D(mask, mapCords).r;","   original *= maskAlpha;","   gl_FragColor =  original;","}"]},b.AlphaMaskFilter.prototype=Object.create(b.AbstractFilter.prototype),b.AlphaMaskFilter.prototype.constructor=b.AlphaMaskFilter,b.AlphaMaskFilter.prototype.onTextureLoaded=function(){this.uniforms.mapDimensions.value.x=this.uniforms.mask.value.width,this.uniforms.mapDimensions.value.y=this.uniforms.mask.value.height,this.uniforms.mask.value.baseTexture.off("loaded",this.boundLoadedFunction)},Object.defineProperty(b.AlphaMaskFilter.prototype,"map",{get:function(){return this.uniforms.mask.value},set:function(a){this.uniforms.mask.value=a}}),b.ColorMatrixFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={matrix:{type:"mat4",value:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float invert;","uniform mat4 matrix;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix;","}"]},b.ColorMatrixFilter.prototype=Object.create(b.AbstractFilter.prototype),b.ColorMatrixFilter.prototype.constructor=b.ColorMatrixFilter,Object.defineProperty(b.ColorMatrixFilter.prototype,"matrix",{get:function(){return this.uniforms.matrix.value},set:function(a){this.uniforms.matrix.value=a}}),b.GrayFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={gray:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","uniform float gray;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.2126*gl_FragColor.r + 0.7152*gl_FragColor.g + 0.0722*gl_FragColor.b), gray);","}"]},b.GrayFilter.prototype=Object.create(b.AbstractFilter.prototype),b.GrayFilter.prototype.constructor=b.GrayFilter,Object.defineProperty(b.GrayFilter.prototype,"gray",{get:function(){return this.uniforms.gray.value},set:function(a){this.uniforms.gray.value=a}}),b.DisplacementFilter=function(a){b.AbstractFilter.call(this),this.passes=[this],a.baseTexture._powerOf2=!0,this.uniforms={displacementMap:{type:"sampler2D",value:a},scale:{type:"2f",value:{x:30,y:30}},offset:{type:"2f",value:{x:0,y:0}},mapDimensions:{type:"2f",value:{x:1,y:5112}},dimensions:{type:"4fv",value:[0,0,0,0]}},a.baseTexture.hasLoaded?(this.uniforms.mapDimensions.value.x=a.width,this.uniforms.mapDimensions.value.y=a.height):(this.boundLoadedFunction=this.onTextureLoaded.bind(this),a.baseTexture.on("loaded",this.boundLoadedFunction)),this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D displacementMap;","uniform sampler2D uSampler;","uniform vec2 scale;","uniform vec2 offset;","uniform vec4 dimensions;","uniform vec2 mapDimensions;","void main(void) {","   vec2 mapCords = vTextureCoord.xy;","   mapCords += (dimensions.zw + offset)/ dimensions.xy ;","   mapCords.y *= -1.0;","   mapCords.y += 1.0;","   vec2 matSample = texture2D(displacementMap, mapCords).xy;","   matSample -= 0.5;","   matSample *= scale;","   matSample /= mapDimensions;","   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + matSample.x, vTextureCoord.y + matSample.y));","   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);","   vec2 cord = vTextureCoord;","}"]},b.DisplacementFilter.prototype=Object.create(b.AbstractFilter.prototype),b.DisplacementFilter.prototype.constructor=b.DisplacementFilter,b.DisplacementFilter.prototype.onTextureLoaded=function(){this.uniforms.mapDimensions.value.x=this.uniforms.displacementMap.value.width,this.uniforms.mapDimensions.value.y=this.uniforms.displacementMap.value.height,this.uniforms.displacementMap.value.baseTexture.off("loaded",this.boundLoadedFunction)},Object.defineProperty(b.DisplacementFilter.prototype,"map",{get:function(){return this.uniforms.displacementMap.value},set:function(a){this.uniforms.displacementMap.value=a}}),Object.defineProperty(b.DisplacementFilter.prototype,"scale",{get:function(){return this.uniforms.scale.value},set:function(a){this.uniforms.scale.value=a}}),Object.defineProperty(b.DisplacementFilter.prototype,"offset",{get:function(){return this.uniforms.offset.value},set:function(a){this.uniforms.offset.value=a}}),b.PixelateFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={invert:{type:"1f",value:0},dimensions:{type:"4fv",value:new Float32Array([1e4,100,10,10])},pixelSize:{type:"2f",value:{x:10,y:10}}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec2 testDim;","uniform vec4 dimensions;","uniform vec2 pixelSize;","uniform sampler2D uSampler;","void main(void) {","   vec2 coord = vTextureCoord;","   vec2 size = dimensions.xy/pixelSize;","   vec2 color = floor( ( vTextureCoord * size ) ) / size + pixelSize/dimensions.xy * 0.5;","   gl_FragColor = texture2D(uSampler, color);","}"]},b.PixelateFilter.prototype=Object.create(b.AbstractFilter.prototype),b.PixelateFilter.prototype.constructor=b.PixelateFilter,Object.defineProperty(b.PixelateFilter.prototype,"size",{get:function(){return this.uniforms.pixelSize.value},set:function(a){this.dirty=!0,this.uniforms.pixelSize.value=a}}),b.BlurXFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","   vec4 sum = vec4(0.0);","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 4.0*blur, vTextureCoord.y)) * 0.05;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 3.0*blur, vTextureCoord.y)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 2.0*blur, vTextureCoord.y)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - blur, vTextureCoord.y)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + blur, vTextureCoord.y)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 2.0*blur, vTextureCoord.y)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 3.0*blur, vTextureCoord.y)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 4.0*blur, vTextureCoord.y)) * 0.05;","   gl_FragColor = sum;","}"]},b.BlurXFilter.prototype=Object.create(b.AbstractFilter.prototype),b.BlurXFilter.prototype.constructor=b.BlurXFilter,Object.defineProperty(b.BlurXFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.dirty=!0,this.uniforms.blur.value=1/7e3*a}}),b.BlurYFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","   vec4 sum = vec4(0.0);","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 4.0*blur)) * 0.05;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 3.0*blur)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 2.0*blur)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - blur)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + blur)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 2.0*blur)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 3.0*blur)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 4.0*blur)) * 0.05;","   gl_FragColor = sum;","}"]},b.BlurYFilter.prototype=Object.create(b.AbstractFilter.prototype),b.BlurYFilter.prototype.constructor=b.BlurYFilter,Object.defineProperty(b.BlurYFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.uniforms.blur.value=1/7e3*a}}),b.BlurFilter=function(){this.blurXFilter=new b.BlurXFilter,this.blurYFilter=new b.BlurYFilter,this.passes=[this.blurXFilter,this.blurYFilter]},Object.defineProperty(b.BlurFilter.prototype,"blur",{get:function(){return this.blurXFilter.blur},set:function(a){this.blurXFilter.blur=this.blurYFilter.blur=a}}),Object.defineProperty(b.BlurFilter.prototype,"blurX",{get:function(){return this.blurXFilter.blur},set:function(a){this.blurXFilter.blur=a}}),Object.defineProperty(b.BlurFilter.prototype,"blurY",{get:function(){return this.blurYFilter.blur},set:function(a){this.blurYFilter.blur=a}}),b.InvertFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={invert:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float invert;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix( (vec3(1)-gl_FragColor.rgb) * gl_FragColor.a, gl_FragColor.rgb, 1.0 - invert);","}"]},b.InvertFilter.prototype=Object.create(b.AbstractFilter.prototype),b.InvertFilter.prototype.constructor=b.InvertFilter,Object.defineProperty(b.InvertFilter.prototype,"invert",{get:function(){return this.uniforms.invert.value},set:function(a){this.uniforms.invert.value=a}}),b.SepiaFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={sepia:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float sepia;","uniform sampler2D uSampler;","const mat3 sepiaMatrix = mat3(0.3588, 0.7044, 0.1368, 0.2990, 0.5870, 0.1140, 0.2392, 0.4696, 0.0912);","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * sepiaMatrix, sepia);","}"]},b.SepiaFilter.prototype=Object.create(b.AbstractFilter.prototype),b.SepiaFilter.prototype.constructor=b.SepiaFilter,Object.defineProperty(b.SepiaFilter.prototype,"sepia",{get:function(){return this.uniforms.sepia.value},set:function(a){this.uniforms.sepia.value=a}}),b.TwistFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={radius:{type:"1f",value:.5},angle:{type:"1f",value:5},offset:{type:"2f",value:{x:.5,y:.5}}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec4 dimensions;","uniform sampler2D uSampler;","uniform float radius;","uniform float angle;","uniform vec2 offset;","void main(void) {","   vec2 coord = vTextureCoord - offset;","   float distance = length(coord);","   if (distance < radius) {","       float ratio = (radius - distance) / radius;","       float angleMod = ratio * ratio * angle;","       float s = sin(angleMod);","       float c = cos(angleMod);","       coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);","   }","   gl_FragColor = texture2D(uSampler, coord+offset);","}"]},b.TwistFilter.prototype=Object.create(b.AbstractFilter.prototype),b.TwistFilter.prototype.constructor=b.TwistFilter,Object.defineProperty(b.TwistFilter.prototype,"offset",{get:function(){return this.uniforms.offset.value},set:function(a){this.dirty=!0,this.uniforms.offset.value=a}}),Object.defineProperty(b.TwistFilter.prototype,"radius",{get:function(){return this.uniforms.radius.value},set:function(a){this.dirty=!0,this.uniforms.radius.value=a}}),Object.defineProperty(b.TwistFilter.prototype,"angle",{get:function(){return this.uniforms.angle.value},set:function(a){this.dirty=!0,this.uniforms.angle.value=a}}),b.ColorStepFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={step:{type:"1f",value:5}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","uniform float step;","void main(void) {","   vec4 color = texture2D(uSampler, vTextureCoord);","   color = floor(color * step) / step;","   gl_FragColor = color;","}"]},b.ColorStepFilter.prototype=Object.create(b.AbstractFilter.prototype),b.ColorStepFilter.prototype.constructor=b.ColorStepFilter,Object.defineProperty(b.ColorStepFilter.prototype,"step",{get:function(){return this.uniforms.step.value},set:function(a){this.uniforms.step.value=a}}),b.DotScreenFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={scale:{type:"1f",value:1},angle:{type:"1f",value:5},dimensions:{type:"4fv",value:[0,0,0,0]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec4 dimensions;","uniform sampler2D uSampler;","uniform float angle;","uniform float scale;","float pattern() {","   float s = sin(angle), c = cos(angle);","   vec2 tex = vTextureCoord * dimensions.xy;","   vec2 point = vec2(","       c * tex.x - s * tex.y,","       s * tex.x + c * tex.y","   ) * scale;","   return (sin(point.x) * sin(point.y)) * 4.0;","}","void main() {","   vec4 color = texture2D(uSampler, vTextureCoord);","   float average = (color.r + color.g + color.b) / 3.0;","   gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);","}"]},b.DotScreenFilter.prototype=Object.create(b.AbstractFilter.prototype),b.DotScreenFilter.prototype.constructor=b.DotScreenFilter,Object.defineProperty(b.DotScreenFilter.prototype,"scale",{get:function(){return this.uniforms.scale.value},set:function(a){this.dirty=!0,this.uniforms.scale.value=a}}),Object.defineProperty(b.DotScreenFilter.prototype,"angle",{get:function(){return this.uniforms.angle.value},set:function(a){this.dirty=!0,this.uniforms.angle.value=a}}),b.CrossHatchFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","    float lum = length(texture2D(uSampler, vTextureCoord.xy).rgb);","    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);","    if (lum < 1.00) {","        if (mod(gl_FragCoord.x + gl_FragCoord.y, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.75) {","        if (mod(gl_FragCoord.x - gl_FragCoord.y, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.50) {","        if (mod(gl_FragCoord.x + gl_FragCoord.y - 5.0, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.3) {","        if (mod(gl_FragCoord.x - gl_FragCoord.y - 5.0, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","}"]},b.CrossHatchFilter.prototype=Object.create(b.AbstractFilter.prototype),b.CrossHatchFilter.prototype.constructor=b.BlurYFilter,Object.defineProperty(b.CrossHatchFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.uniforms.blur.value=1/7e3*a}}),b.RGBSplitFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={red:{type:"2f",value:{x:20,y:20}},green:{type:"2f",value:{x:-20,y:20}},blue:{type:"2f",value:{x:20,y:-20}},dimensions:{type:"4fv",value:[0,0,0,0]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec2 red;","uniform vec2 green;","uniform vec2 blue;","uniform vec4 dimensions;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor.r = texture2D(uSampler, vTextureCoord + red/dimensions.xy).r;","   gl_FragColor.g = texture2D(uSampler, vTextureCoord + green/dimensions.xy).g;","   gl_FragColor.b = texture2D(uSampler, vTextureCoord + blue/dimensions.xy).b;","   gl_FragColor.a = texture2D(uSampler, vTextureCoord).a;","}"]},b.RGBSplitFilter.prototype=Object.create(b.AbstractFilter.prototype),b.RGBSplitFilter.prototype.constructor=b.RGBSplitFilter,Object.defineProperty(b.RGBSplitFilter.prototype,"angle",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.uniforms.blur.value=1/7e3*a}}),"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=b),exports.PIXI=b):"undefined"!=typeof define&&define.amd?define(b):a.PIXI=b}).call(this);
},{}],4:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/sole/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/sole/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Date.now shim for (ahem) Internet Explo(d|r)er
if ( Date.now === undefined ) {

	Date.now = function () {

		return new Date().valueOf();

	};

}

var TWEEN = TWEEN || ( function () {

	var _tweens = [];

	return {

		REVISION: '14',

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function ( tween ) {

			_tweens.push( tween );

		},

		remove: function ( tween ) {

			var i = _tweens.indexOf( tween );

			if ( i !== -1 ) {

				_tweens.splice( i, 1 );

			}

		},

		update: function ( time ) {

			if ( _tweens.length === 0 ) return false;

			var i = 0;

			time = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );

			while ( i < _tweens.length ) {

				if ( _tweens[ i ].update( time ) ) {

					i++;

				} else {

					_tweens.splice( i, 1 );

				}

			}

			return true;

		}
	};

} )();

TWEEN.Tween = function ( object ) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for ( var field in object ) {

		_valuesStart[ field ] = parseFloat(object[field], 10);

	}

	this.to = function ( properties, duration ) {

		if ( duration !== undefined ) {

			_duration = duration;

		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function ( time ) {

		TWEEN.add( this );

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );
		_startTime += _delayTime;

		for ( var property in _valuesEnd ) {

			// check if an Array was provided as property value
			if ( _valuesEnd[ property ] instanceof Array ) {

				if ( _valuesEnd[ property ].length === 0 ) {

					continue;

				}

				// create a local copy of the Array with the start value at the front
				_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

			}

			_valuesStart[ property ] = _object[ property ];

			if( ( _valuesStart[ property ] instanceof Array ) === false ) {
				_valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

		}

		return this;

	};

	this.stop = function () {

		if ( !_isPlaying ) {
			return this;
		}

		TWEEN.remove( this );
		_isPlaying = false;

		if ( _onStopCallback !== null ) {

			_onStopCallback.call( _object );

		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

			_chainedTweens[ i ].stop();

		}

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function ( times ) {

		_repeat = times;
		return this;

	};

	this.yoyo = function( yoyo ) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function ( interpolation ) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function ( callback ) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function ( callback ) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function ( callback ) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function ( callback ) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function ( time ) {

		var property;

		if ( time < _startTime ) {

			return true;

		}

		if ( _onStartCallbackFired === false ) {

			if ( _onStartCallback !== null ) {

				_onStartCallback.call( _object );

			}

			_onStartCallbackFired = true;

		}

		var elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		var value = _easingFunction( elapsed );

		for ( property in _valuesEnd ) {

			var start = _valuesStart[ property ] || 0;
			var end = _valuesEnd[ property ];

			if ( end instanceof Array ) {

				_object[ property ] = _interpolationFunction( end, value );

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if ( typeof(end) === "string" ) {
					end = start + parseFloat(end, 10);
				}

				// protect against non numeric properties.
				if ( typeof(end) === "number" ) {
					_object[ property ] = start + ( end - start ) * value;
				}

			}

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _repeat > 0 ) {

				if( isFinite( _repeat ) ) {
					_repeat--;
				}

				// reassign starting values, restart by making startTime = now
				for( property in _valuesStartRepeat ) {

					if ( typeof( _valuesEnd[ property ] ) === "string" ) {
						_valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[ property ];
						_valuesStartRepeat[ property ] = _valuesEnd[ property ];
						_valuesEnd[ property ] = tmp;
					}

					_valuesStart[ property ] = _valuesStartRepeat[ property ];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if ( _onCompleteCallback !== null ) {

					_onCompleteCallback.call( _object );

				}

				for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

					_chainedTweens[ i ].start( time );

				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function ( k ) {

			return k;

		}

	},

	Quadratic: {

		In: function ( k ) {

			return k * k;

		},

		Out: function ( k ) {

			return k * ( 2 - k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
			return - 0.5 * ( --k * ( k - 2 ) - 1 );

		}

	},

	Cubic: {

		In: function ( k ) {

			return k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k + 2 );

		}

	},

	Quartic: {

		In: function ( k ) {

			return k * k * k * k;

		},

		Out: function ( k ) {

			return 1 - ( --k * k * k * k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
			return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

		}

	},

	Quintic: {

		In: function ( k ) {

			return k * k * k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

		}

	},

	Sinusoidal: {

		In: function ( k ) {

			return 1 - Math.cos( k * Math.PI / 2 );

		},

		Out: function ( k ) {

			return Math.sin( k * Math.PI / 2 );

		},

		InOut: function ( k ) {

			return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

		}

	},

	Exponential: {

		In: function ( k ) {

			return k === 0 ? 0 : Math.pow( 1024, k - 1 );

		},

		Out: function ( k ) {

			return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

		},

		InOut: function ( k ) {

			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

		}

	},

	Circular: {

		In: function ( k ) {

			return 1 - Math.sqrt( 1 - k * k );

		},

		Out: function ( k ) {

			return Math.sqrt( 1 - ( --k * k ) );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
			return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

		},

		Out: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		},

		InOut: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
			return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

		}

	},

	Back: {

		In: function ( k ) {

			var s = 1.70158;
			return k * k * ( ( s + 1 ) * k - s );

		},

		Out: function ( k ) {

			var s = 1.70158;
			return --k * k * ( ( s + 1 ) * k + s ) + 1;

		},

		InOut: function ( k ) {

			var s = 1.70158 * 1.525;
			if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
			return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

		}

	},

	Bounce: {

		In: function ( k ) {

			return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

		},

		Out: function ( k ) {

			if ( k < ( 1 / 2.75 ) ) {

				return 7.5625 * k * k;

			} else if ( k < ( 2 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

			} else if ( k < ( 2.5 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

			} else {

				return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

			}

		},

		InOut: function ( k ) {

			if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
			return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

		if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
		if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

		return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

	},

	Bezier: function ( v, k ) {

		var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

		for ( i = 0; i <= n; i++ ) {
			b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
		}

		return b;

	},

	CatmullRom: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

		if ( v[ 0 ] === v[ m ] ) {

			if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

			return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

		} else {

			if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
			if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

			return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

		}

	},

	Utils: {

		Linear: function ( p0, p1, t ) {

			return ( p1 - p0 ) * t + p0;

		},

		Bernstein: function ( n , i ) {

			var fc = TWEEN.Interpolation.Utils.Factorial;
			return fc( n ) / fc( i ) / fc( n - i );

		},

		Factorial: ( function () {

			var a = [ 1 ];

			return function ( n ) {

				var s = 1, i;
				if ( a[ n ] ) return a[ n ];
				for ( i = n; i > 1; i-- ) s *= i;
				return a[ n ] = s;

			};

		} )(),

		CatmullRom: function ( p0, p1, p2, p3, t ) {

			var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
			return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

		}

	}

};

module.exports=TWEEN;
},{}],5:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");
var Resources = require("../resources/Resources");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient(domId) {
	PixiApp.call(this, domId, 960, 720);

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.loadingScreen.show("LOADING");

	this.url = null;

	this.tableId=null;
}

FunctionUtil.extend(NetPokerClient, PixiApp);

/**
 * Set url.
 * @method setUrl
 */
NetPokerClient.prototype.setUrl = function(url) {
	this.url = url;
}

/**
 * Set table id.
 * @method setTableId
 */
NetPokerClient.prototype.setTableId = function(tableId) {
	this.tableId = tableId;
}

/**
 * Set view case.
 * @method setViewCase
 */
NetPokerClient.prototype.setViewCase = function(viewCase) {
	console.log("****** running view case: "+viewCase);
	this.viewCase=viewCase;
}

/**
 * Set token.
 * @method setToken
 */
NetPokerClient.prototype.setToken = function(token) {
	this.token = token;
}

/**
 * Set token.
 * @method setSkin
 */
NetPokerClient.prototype.setSkin = function(skin) {
	Resources.getInstance().skin = skin;
}

/**
 * Run.
 * @method run
 */
NetPokerClient.prototype.run = function() {

	var assets = [
		"table.png",
		"components.png"
	];
	if((Resources.getInstance().skin != null) && (Resources.getInstance().skin.textures != null)) {
		for(var i = 0; i < Resources.getInstance().skin.textures.length; i++) {
			assets.push(Resources.getInstance().skin.textures[i].file);
			console.log("add to load list: " + Resources.getInstance().skin.textures[i].file);
		}
	}

	this.assetLoader = new PIXI.AssetLoader(assets);
	this.assetLoader.addEventListener("onComplete", this.onAssetLoaderComplete.bind(this));
	this.assetLoader.load();
}

/**
 * Assets loaded, connect.
 * @method onAssetLoaderComplete
 * @private
 */
NetPokerClient.prototype.onAssetLoaderComplete = function() {
	console.log("asset loader complete...");

	this.netPokerClientView = new NetPokerClientView();
	this.addChildAt(this.netPokerClientView, 0);

	this.netPokerClientController = new NetPokerClientController(this.netPokerClientView);
	this.connect();
}

/**
 * Connect.
 * @method connect
 * @private
 */
NetPokerClient.prototype.connect = function() {
	if (!this.url) {
		this.loadingScreen.show("NEED URL");
		return;
	}

	this.connection = new MessageWebSocketConnection();
	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);
	this.connection.connect(this.url);
	this.loadingScreen.show("CONNECTING");
}

/**
 * Connection complete.
 * @method onConnectionConnect
 * @private
 */
NetPokerClient.prototype.onConnectionConnect = function() {
	console.log("**** connected");
	this.protoConnection = new ProtoConnection(this.connection);
	this.protoConnection.addMessageHandler(StateCompleteMessage, this.onStateCompleteMessage, this);
	this.netPokerClientController.setProtoConnection(this.protoConnection);
	this.loadingScreen.show("INITIALIZING");

	var initMessage=new InitMessage(this.token);

	if (this.tableId)
		initMessage.setTableId(this.tableId);

	if (this.viewCase)
		initMessage.setViewCase(this.viewCase);

	this.protoConnection.send(initMessage);
}

/**
 * State complete.
 * @method onStateCompleteMessage
 * @private
 */
NetPokerClient.prototype.onStateCompleteMessage=function() {
	this.loadingScreen.hide();
}

/**
 * Connection closed.
 * @method onConnectionClose
 * @private
 */
NetPokerClient.prototype.onConnectionClose = function() {
	console.log("**** connection closed");
	if (this.protoConnection)
		this.protoConnection.removeMessageHandler(StateCompleteMessage, this.onStateCompleteMessage, this);

	this.protoConnection = null;
	this.netPokerClientController.setProtoConnection(null);
	this.loadingScreen.show("CONNECTION ERROR");
	setTimeout(this.connect.bind(this), 3000);
}

module.exports = NetPokerClient;
},{"../../proto/ProtoConnection":31,"../../proto/messages/InitMessage":49,"../../proto/messages/StateCompleteMessage":60,"../../utils/FunctionUtil":72,"../../utils/MessageWebSocketConnection":74,"../../utils/PixiApp":77,"../controller/NetPokerClientController":10,"../resources/Resources":14,"../view/LoadingScreen":23,"../view/NetPokerClientView":24,"pixi.js":3}],6:[function(require,module,exports){


/**
 * Client resources
 * @class Settings.
 */
 function Settings() {
 	this.playAnimations = true;
 }


/**
 * Get singleton instance.
 * @method getInstance
 */
Settings.getInstance = function() {
	if (!Settings.instance)
		Settings.instance = new Settings();

	return Settings.instance;
}

module.exports = Settings;
},{}],7:[function(require,module,exports){
var ShowDialogMessage = require("../../proto/messages/ShowDialogMessage");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");

/**
 * Control user interface.
 * @class InterfaceController
 */
function InterfaceController(messageSequencer, view) {
	this.messageSequencer = messageSequencer;
	this.view = view;

	this.messageSequencer.addMessageHandler(ButtonsMessage.TYPE, this.onButtonsMessage, this);
	this.messageSequencer.addMessageHandler(ShowDialogMessage.TYPE, this.onShowDialogMessage, this);
	this.messageSequencer.addMessageHandler(ChatMessage.TYPE, this.onChat, this);

}

/**
 * Buttons message.
 * @method onButtonsMessage
 */
InterfaceController.prototype.onButtonsMessage = function(m) {
	var buttonsView = this.view.getButtonsView();

	buttonsView.setButtons(m.getButtons(), m.sliderButtonIndex, parseInt(m.min, 10), parseInt(m.max, 10));
}

/**
 * Show dialog.
 * @method onShowDialogMessage
 */
InterfaceController.prototype.onShowDialogMessage = function(m) {
	var dialogView = this.view.getDialogView();

	dialogView.show(m.getText(), m.getButtons(), m.getDefaultValue());
}


/**
 * On chat message.
 * @method onChat
 */
InterfaceController.prototype.onChat = function(m) {
	this.view.chatView.addText(m.user, m.text);
}

module.exports = InterfaceController;
},{"../../proto/messages/ButtonsMessage":39,"../../proto/messages/ChatMessage":40,"../../proto/messages/ShowDialogMessage":59}],8:[function(require,module,exports){
var EventDispatcher = require("../../utils/EventDispatcher");
var FunctionUtil = require("../../utils/FunctionUtil");
var Sequencer = require("../../utils/Sequencer");

/**
 * An item in a message sequence.
 * @class MessageSequenceItem
 */
function MessageSequenceItem(message) {
	EventDispatcher.call(this);
	this.message = message;
	this.waitTarget = null;
	this.waitEvent = null;
	this.waitClosure = null;
}

FunctionUtil.extend(MessageSequenceItem, EventDispatcher);

/**
 * Get message.
 * @method getMessage
 */
MessageSequenceItem.prototype.getMessage = function() {
	//console.log("getting: " + this.message.type);

	return this.message;
}

/**
 * Are we waiting for an event?
 * @method isWaiting
 */
MessageSequenceItem.prototype.isWaiting = function() {
	return this.waitEvent != null;
}

/**
 * Notify complete.
 * @method notifyComplete
 */
MessageSequenceItem.prototype.notifyComplete = function() {
	this.trigger(Sequencer.COMPLETE);
}

/**
 * Wait for event before processing next message.
 * @method waitFor
 */
MessageSequenceItem.prototype.waitFor = function(target, event) {
	this.waitTarget = target;
	this.waitEvent = event;
	this.waitClosure = this.onTargetComplete.bind(this);

	this.waitTarget.addEventListener(this.waitEvent, this.waitClosure);
}

/**
 * Wait target complete.
 * @method onTargetComplete
 * @private
 */
MessageSequenceItem.prototype.onTargetComplete = function() {
	//console.log("target is complete");
	this.waitTarget.removeEventListener(this.waitEvent, this.waitClosure);
	this.notifyComplete();
}

module.exports = MessageSequenceItem;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/Sequencer":79}],9:[function(require,module,exports){
var Sequencer = require("../../utils/Sequencer");
var EventDispatcher = require("../../utils/EventDispatcher");
var MessageSequenceItem = require("./MessageSequenceItem");

/**
 * Sequences messages.
 * @class MessageSequencer
 */
function MessageSequencer() {
	this.sequencer = new Sequencer();
	this.messageDispatcher = new EventDispatcher();
	this.currentItem = null;
}

/**
 * Add a message for procesing.
 * @method enqueue
 */
MessageSequencer.prototype.enqueue = function(message) {
	if (!message.type)
		throw "Message doesn't have a type";

	var sequenceItem = new MessageSequenceItem(message);

	sequenceItem.on(Sequencer.START, this.onSequenceItemStart, this);

	this.sequencer.enqueue(sequenceItem);
}

/**
 * Sequence item start.
 * @method onSequenceItemStart
 * @private
 */
MessageSequencer.prototype.onSequenceItemStart = function(e) {
	//console.log("starting item...");
	var item = e.target;

	item.off(Sequencer.START, this.onSequenceItemStart, this);

	this.currentItem = item;
	this.messageDispatcher.trigger(item.getMessage());
	this.currentItem = null;

	if (!item.isWaiting())
		item.notifyComplete();
}

/**
 * Add message handler.
 * @method addMessageHandler
 */
MessageSequencer.prototype.addMessageHandler = function(messageType, handler, scope) {
	this.messageDispatcher.on(messageType, handler, scope);
}

/**
 * Wait for the target to dispatch an event before continuing to
 * process the messages in the que.
 * @method waitFor
 */
MessageSequencer.prototype.waitFor = function(target, event) {
	if (!this.currentItem)
		throw "Not waiting for event";

	this.currentItem.waitFor(target, event);
}

module.exports = MessageSequencer;
},{"../../utils/EventDispatcher":70,"../../utils/Sequencer":79,"./MessageSequenceItem":8}],10:[function(require,module,exports){
var FunctionUtil = require("../../utils/FunctionUtil");
var MessageSequencer = require("./MessageSequencer");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonsView = require("../view/ButtonsView");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");
var NetPokerClientView = require("../view/NetPokerClientView");
var DialogView = require("../view/DialogView");
var SettingsView = require("../view/SettingsView");
var TableController = require("./TableController");
var InterfaceController = require("./InterfaceController");
var ChatMessage = require("../../proto/messages/ChatMessage");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * Main controller
 * @class NetPokerClientController
 */
function NetPokerClientController(view) {
	this.netPokerClientView = view;
	this.protoConnection = null;
	this.messageSequencer = new MessageSequencer();

	this.tableController = new TableController(this.messageSequencer, this.netPokerClientView);
	this.interfaceController = new InterfaceController(this.messageSequencer, this.netPokerClientView);

	console.log(this.netPokerClientView.getDialogView());

	this.netPokerClientView.getButtonsView().on(ButtonsView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.getDialogView().on(DialogView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.on(NetPokerClientView.SEAT_CLICK, this.onSeatClick, this);

	this.netPokerClientView.chatView.addEventListener("chat", this.onViewChat, this);

	this.netPokerClientView.settingsView.addEventListener(SettingsView.BUY_CHIPS_CLICK, this.onBuyChipsButtonClick, this);
}


/**
 * Set connection.
 * @method setProtoConnection
 */
NetPokerClientController.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	}

	this.protoConnection = protoConnection;
	this.netPokerClientView.clear();

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.MESSAGE, this.onProtoConnectionMessage, this);
	}
}

/**
 * Incoming message.
 * Enqueue for processing.
 * @method onProtoConnectionMessage
 * @private
 */
NetPokerClientController.prototype.onProtoConnectionMessage = function(e) {
	this.messageSequencer.enqueue(e.message);
}

/**
 * Button click.
 * This function handles clicks from both the dialog and game play buttons.
 * @method onButtonClick
 * @private
 */
NetPokerClientController.prototype.onButtonClick = function(e) {
	if (!this.protoConnection)
		return;

	console.log("button click, v=" + e.value);

	var m = new ButtonClickMessage(e.button, e.value);
	this.protoConnection.send(m);
}

/**
 * Seat click.
 * @method onSeatClick
 * @private
 */
NetPokerClientController.prototype.onSeatClick = function(e) {
	var m = new SeatClickMessage(e.seatIndex);
	this.protoConnection.send(m);
}

/**
 * On send chat message.
 * @method onViewChat
 */
NetPokerClientController.prototype.onViewChat = function(text) {
	var message = new ChatMessage();
	message.user = "";
	message.text = text;

	this.protoConnection.send(message);
}

/**
 * On buy chips button click.
 * @method onBuyChipsButtonClick
 */
NetPokerClientController.prototype.onBuyChipsButtonClick = function() {
	console.log("buy chips click");

	this.protoConnection.send(new ButtonClickMessage(ButtonData.BUY_CHIPS));
}

module.exports = NetPokerClientController;
},{"../../proto/ProtoConnection":31,"../../proto/data/ButtonData":32,"../../proto/messages/ButtonClickMessage":38,"../../proto/messages/ChatMessage":40,"../../proto/messages/SeatClickMessage":57,"../../utils/FunctionUtil":72,"../view/ButtonsView":16,"../view/DialogView":22,"../view/NetPokerClientView":24,"../view/SettingsView":29,"./InterfaceController":7,"./MessageSequencer":9,"./TableController":11}],11:[function(require,module,exports){
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");
var CommunityCardsMessage = require("../../proto/messages/CommunityCardsMessage");
var PocketCardsMessage = require("../../proto/messages/PocketCardsMessage");
var DealerButtonMessage = require("../../proto/messages/DealerButtonMessage");
var BetMessage = require("../../proto/messages/BetMessage");
var BetsToPotMessage = require("../../proto/messages/BetsToPotMessage");
var PotMessage = require("../../proto/messages/PotMessage");
var TimerMessage = require("../../proto/messages/TimerMessage");
var ActionMessage = require("../../proto/messages/ActionMessage");
var FoldCardsMessage = require("../../proto/messages/FoldCardsMessage");
var DelayMessage = require("../../proto/messages/DelayMessage");
var EventDispatcher = require("../../utils/EventDispatcher");
var ClearMessage = require("../../proto/messages/ClearMessage");
var PayOutMessage = require("../../proto/messages/PayOutMessage");

/**
 * Control the table
 * @class TableController
 */
function TableController(messageSequencer, view) {
	this.messageSequencer = messageSequencer;
	this.view = view;

	this.messageSequencer.addMessageHandler(SeatInfoMessage.TYPE, this.onSeatInfoMessage, this);
	this.messageSequencer.addMessageHandler(CommunityCardsMessage.TYPE, this.onCommunityCardsMessage, this);
	this.messageSequencer.addMessageHandler(PocketCardsMessage.TYPE, this.onPocketCardsMessage, this);
	this.messageSequencer.addMessageHandler(DealerButtonMessage.TYPE, this.onDealerButtonMessage, this);
	this.messageSequencer.addMessageHandler(BetMessage.TYPE, this.onBetMessage, this);
	this.messageSequencer.addMessageHandler(BetsToPotMessage.TYPE, this.onBetsToPot, this);
	this.messageSequencer.addMessageHandler(PotMessage.TYPE, this.onPot, this);
	this.messageSequencer.addMessageHandler(TimerMessage.TYPE, this.onTimer, this);
	this.messageSequencer.addMessageHandler(ActionMessage.TYPE, this.onAction, this);
	this.messageSequencer.addMessageHandler(FoldCardsMessage.TYPE, this.onFoldCards, this);
	this.messageSequencer.addMessageHandler(DelayMessage.TYPE, this.onDelay, this);
	this.messageSequencer.addMessageHandler(ClearMessage.TYPE, this.onClear, this);
	this.messageSequencer.addMessageHandler(PayOutMessage.TYPE, this.onPayOut, this);
}
EventDispatcher.init(TableController);

/**
 * Seat info message.
 * @method onSeatInfoMessage
 */
TableController.prototype.onSeatInfoMessage = function(m) {
	var seatView = this.view.getSeatViewByIndex(m.getSeatIndex());

	seatView.setName(m.getName());
	seatView.setChips(m.getChips());
	seatView.setActive(m.isActive());
	seatView.setSitout(m.isSitout());
}

/**
 * Seat info message.
 * @method onCommunityCardsMessage
 */
TableController.prototype.onCommunityCardsMessage = function(m) {
	var i;

	for (i = 0; i < m.getCards().length; i++) {
		var cardData = m.getCards()[i];
		var cardView = this.view.getCommunityCards()[m.getFirstIndex() + i];

		cardView.setCardData(cardData);
		cardView.show(m.animate, i * 500);
	}
	if (m.getCards().length > 0) {
		var cardData = m.getCards()[m.getCards().length - 1];
		var cardView = this.view.getCommunityCards()[m.getFirstIndex() + m.getCards().length - 1];
		if(m.animate)
			this.messageSequencer.waitFor(cardView, "animationDone");
	}
}

/**
 * Pocket cards message.
 * @method onPocketCardsMessage
 */
TableController.prototype.onPocketCardsMessage = function(m) {
	var seatView = this.view.getSeatViewByIndex(m.getSeatIndex());
	var i;

	for (i = 0; i < m.getCards().length; i++) {
		var cardData = m.getCards()[i];
		var cardView = seatView.getPocketCards()[m.getFirstIndex() + i];

		if(m.animate)
			this.messageSequencer.waitFor(cardView, "animationDone");
		cardView.setCardData(cardData);
		cardView.show(m.animate, 10);
	}
}

/**
 * Dealer button message.
 * @method onDealerButtonMessage
 */
TableController.prototype.onDealerButtonMessage = function(m) {
	var dealerButtonView = this.view.getDealerButtonView();

	if (m.seatIndex < 0) {
		dealerButtonView.hide();
	} else {
		this.messageSequencer.waitFor(dealerButtonView, "animationDone");
		dealerButtonView.show(m.getSeatIndex(), m.getAnimate());
	}
};

/**
 * Bet message.
 * @method onBetMessage
 */
TableController.prototype.onBetMessage = function(m) {
	this.view.seatViews[m.seatIndex].betChips.setValue(m.value);
};

/**
 * Bets to pot.
 * @method onBetsToPot
 */
TableController.prototype.onBetsToPot = function(m) {
	var haveChips = false;

	for (var i = 0; i < this.view.seatViews.length; i++)
		if (this.view.seatViews[i].betChips.value > 0)
			haveChips = true;

	if (!haveChips)
		return;

	for (var i = 0; i < this.view.seatViews.length; i++)
		this.view.seatViews[i].betChips.animateIn();

	this.messageSequencer.waitFor(this.view.seatViews[0].betChips, "animationDone");
}

/**
 * Pot message.
 * @method onPot
 */
TableController.prototype.onPot = function(m) {
	this.view.potView.setValues(m.values);
};

/**
 * Timer message.
 * @method onTimer
 */
TableController.prototype.onTimer = function(m) {
	if (m.seatIndex < 0)
		this.view.timerView.hide();

	else {
		this.view.timerView.show(m.seatIndex);
		this.view.timerView.countdown(m.totalTime, m.timeLeft);
	}
};

/**
 * Action message.
 * @method onAction
 */
TableController.prototype.onAction = function(m) {
	if (m.seatIndex == null)
		m.seatIndex = 0;

	this.view.seatViews[m.seatIndex].action(m.action);
};

/**
 * Fold cards message.
 * @method onFoldCards
 */
TableController.prototype.onFoldCards = function(m) {
	this.view.seatViews[m.seatIndex].foldCards();

	this.messageSequencer.waitFor(this.view.seatViews[m.seatIndex], "animationDone");
};

/**
 * Delay message.
 * @method onDelay
 */
TableController.prototype.onDelay = function(m) {
	console.log("delay for  = " + m.delay);


	this.messageSequencer.waitFor(this, "timerDone");
	setTimeout(this.dispatchEvent.bind(this, "timerDone"), m.delay);

};

/**
 * Clear message.
 * @method onClear
 */
TableController.prototype.onClear = function(m) {

	var components = m.getComponents();

	for(var i = 0; i < components.length; i++) {
		switch(components[i]) {
			case ClearMessage.POT: {
				this.view.potView.setValues([]);
				break;
			}
			case ClearMessage.BETS: {
				for(var s = 0; s < this.view.seatViews.length; s++) {
					this.view.seatViews[s].betChips.setValue(0);
				}
				break;
			}
			case ClearMessage.CARDS: {
				for(var s = 0; s < this.view.seatViews.length; s++) {
					for(var c = 0; c < this.view.seatViews[s].pocketCards.length; c++) {
						this.view.seatViews[s].pocketCards[c].hide();
					}
				}

				for(var c = 0; c < this.view.communityCards.length; c++) {
					this.view.communityCards[c].hide();
				}
				break;
			}
			case ClearMessage.CHAT: {
				this.view.chatView.clear();
				break;
			}
		}
	}
}

/**
 * Pay out message.
 * @method onPayOut
 */
TableController.prototype.onPayOut = function(m) {
	for (var i = 0; i < m.values.length; i++)
		this.view.seatViews[i].betChips.setValue(m.values[i]);

	for (var i = 0; i < this.view.seatViews.length; i++)
		this.view.seatViews[i].betChips.animateOut();

	this.messageSequencer.waitFor(this.view.seatViews[0].betChips, "animationDone");
};


module.exports = TableController;
},{"../../proto/messages/ActionMessage":35,"../../proto/messages/BetMessage":36,"../../proto/messages/BetsToPotMessage":37,"../../proto/messages/ClearMessage":42,"../../proto/messages/CommunityCardsMessage":43,"../../proto/messages/DealerButtonMessage":44,"../../proto/messages/DelayMessage":45,"../../proto/messages/FoldCardsMessage":47,"../../proto/messages/PayOutMessage":51,"../../proto/messages/PocketCardsMessage":52,"../../proto/messages/PotMessage":53,"../../proto/messages/SeatInfoMessage":58,"../../proto/messages/TimerMessage":65,"../../utils/EventDispatcher":70}],12:[function(require,module,exports){
NetPokerClient = require("./app/NetPokerClient");
//var netPokerClient = new NetPokerClient();

},{"./app/NetPokerClient":5}],13:[function(require,module,exports){
module.exports = {
	textures: [
		{
			id: "componentsTexture",
			file: "components.png"
		},
		{
			id: "tableBackground",
			file: "table.png"
		}
	],
	tableBackground: "tableBackground",
	defaultTexture: "componentsTexture",

	seatPositions: [
		[287, 118], [483, 112], [676, 118],
		[844, 247], [817, 413], [676, 490],
		[483, 495], [287, 490], [140, 413],
		[123, 247]
	],

	timerBackground: [121,200,32,32],

	seatPlate: [40, 116, 160, 70],

	communityCardsPosition: [255, 190],

	cardFrame: [498, 256, 87, 122],
	cardBack: [402, 256, 87, 122],

	dividerLine: [568, 77, 2, 170],

	suitSymbols: [
		[246, 67, 18, 19],
		[269, 67, 18, 19],
		[292, 67, 18, 19],
		[315, 67, 18, 19]
	],

	framePlate: [301, 262, 74, 76],
	bigButton: [33, 298, 95, 94],
	dialogButton: [383, 461, 82, 47],
	dealerButton: [197, 236, 41, 35],

	dealerButtonPositions: [
		[347, 133], [395, 133], [574, 133],
		[762, 267], [715, 358], [574, 434],
		[536, 432], [351, 432], [193, 362],
		[168, 266]
	],

	textScrollbarTrack: [371,50,60,10],
	textScrollbarThumb: [371,32,60,10],


	betAlign: [
		"left", "center", "right",
		"right", "right", 
		"right", "center", "left",
		"left", "left"
	],

	betPositions: [
		[225,150], [478,150], [730,150],
		[778,196], [748,322], [719,360],
		[481,360], [232,360], [199,322],
		[181,200]
	],
	chips: [
		[30, 25, 40, 30],
		[70, 25, 40, 30],
		[110, 25, 40, 30],
		[150, 25, 40, 30],
		[190, 25, 40, 30]
	],
	chipsColors: [0x404040, 0x008000, 0x808000, 0x000080, 0xff0000],
	potPosition: [485,315],
	wrenchIcon: [462,389,21,21],
	chatBackground: [301,262,74,76],
	checkboxBackground: [501,391,18,18],
	checkboxTick: [528,392,21,16],
	buttonBackground: [68,446,64,64],
	sliderBackground: [313,407,120,30],
	sliderKnob: [318,377,28,28],
	bigButtonPosition: [366,575],
	upArrow: [483,64,12,8]
}
},{}],14:[function(require,module,exports){
"use strict";

var PIXI = require("pixi.js");
var Point = require("../../utils/Point");
var DefaultSkin = require("./DefaultSkin");

/**
 * Client resources
 * @class Resources.
 */
function Resources() {
	var i;

	this.defaultSkin = DefaultSkin;
	this.skin = null;


	 this.Align = {
	 	Left: "left",
	 	Right: "right",
	 	Center: "center"
	 };

	 this.textures = {};
/*
	this.componentsTexture = new PIXI.Texture.fromImage("components.png");
	this.tableBackground = PIXI.Texture.fromImage("table.png");

	this.seatPositions = [
		Point(287, 118), Point(483, 112), Point(676, 118),
		Point(844, 247), Point(817, 413), Point(676, 490),
		Point(483, 495), Point(287, 490), Point(140, 413),
		Point(123, 247)
	];

	this.timerBackground = this.getComponentsPart(121,200,32,32); 

	this.seatPlate = this.getComponentsPart(40, 116, 160, 70);

	this.communityCardsPosition = Point(255, 190);

	this.cardFrame = this.getComponentsPart(498, 256, 87, 122);
	this.cardBack = this.getComponentsPart(402, 256, 87, 122);

	this.dividerLine = this.getComponentsPart(568, 77, 2, 170);

	this.suitSymbols = [];
	for (i = 0; i < 4; i++)
		this.suitSymbols.push(this.getComponentsPart(246 + i * 23, 67, 18, 19));

	this.framePlate = this.getComponentsPart(301, 262, 74, 76);
	this.bigButton = this.getComponentsPart(33, 298, 95, 94);
	this.dialogButton = this.getComponentsPart(383, 461, 82, 47);
	this.dealerButton = this.getComponentsPart(197, 236, 41, 35);

	this.dealerButtonPositions = [
		Point(347, 133), Point(395, 133), Point(574, 133),
		Point(762, 267), Point(715, 358), Point(574, 434),
		Point(536, 432), Point(351, 432), Point(193, 362),
		Point(168, 266)
	];

	this.textScrollbarTrack = this.getComponentsPart(371,50,60,10);
	this.textScrollbarThumb = this.getComponentsPart(371,32,60,10);

	 this.Align = {
	 	Left: "left",
	 	Right: "right",
	 	Center: "center",
	 };

	this.betAlign = [
			this.Align.Left, this.Align.Center, this.Align.Right,
			this.Align.Right, this.Align.Right, 
			this.Align.Right, this.Align.Center, this.Align.Left,
			this.Align.Left, this.Align.Left
		];

	this.betPositions = [
			Point(225,150), Point(478,150), Point(730,150),
			Point(778,196), Point(748,322), Point(719,360),
			Point(481,360), Point(232,360), Point(199,322),
			Point(181,200)
		];

	this.chips = new Array();
	for (var i = 0; i < 5; i++) {
		var b = this.getComponentsPart(30 + i*40, 25, 40, 30);
		this.chips.push(b);
	}

	this.chipsColors = [0x404040, 0x008000, 0x808000, 0x000080, 0xff0000];

	this.potPosition = Point(485,315);
	*/
}

/**
 * Get value from either loaded skin or default skin.
 * @method getValue
 */
Resources.prototype.getValue = function(key) {
	var value = null;

	if((this.skin != null) && (this.skin[key] != null))
		value = this.skin[key];
	else
		value = this.defaultSkin[key];

	if(value == null) {
		throw new Error("Invalid skin key: " + key);
	} 

	return value;
}

/**
 * Get point from either loaded skin or default skin.
 * @method getPoint
 */
Resources.prototype.getPoint = function(key) {
	var value = null;

	if((this.skin != null) && (this.skin[key] != null))
		value = Point(this.skin[key][0], this.skin[key][1]);
	else
		value = Point(this.defaultSkin[key][0], this.defaultSkin[key][1]);

	if(value == null) {
		throw new Error("Invalid skin key: " + key);
	} 

	return value;
}

/**
 * Get points from either loaded skin or default skin.
 * @method getPoints
 */
Resources.prototype.getPoints = function(key) {
	var values = null;

	var points = new Array();

	if((this.skin != null) && (this.skin[key] != null))
		values = this.skin[key];
	else
		values = this.defaultSkin[key];

	for(var i = 0; i < values.length; i++) {
		points.push(Point(values[i][0], values[i][1]));
	}

	if(points.length <= 0) {
		throw new Error("Invalid skin key: " + key);
	} 

	return points;
}

/**
 * Get texture from either loaded skin or default skin.
 * @method getTexture
 */
Resources.prototype.getTexture = function(key, index) {
	var value = null;
	var isDefault = false;
	var texture = null;
	var frame = null;


	if((this.skin != null) && (this.skin[key] != null)) {
		value = this.skin[key];
	}
	else {
		value = this.defaultSkin[key];
		isDefault = true;
	}
//	console.log("value = " + value + ", key = " +key);


	if(value.texture != null) {
		texture = value.texture;
	}
	else if(!isDefault && (this.skin.defaultTexture != null)) {
		texture = this.skin.defaultTexture;
	}
	else {
		texture = this.defaultSkin.defaultTexture;
	}

	if(value.coords != null) {
		frame = value.coords;
	}
	else if(typeof value === "string") {
		texture = value;
	}
	else {
		frame = value;
	}

	if(texture != null) {
		if(frame != null)
			return this.getComponentsPart(texture, frame[0], frame[1], frame[2], frame[3]);
		else
			return this.getComponentsPart(texture, frame);
	}


	
	throw new Error("Invalid skin key: " + key);
	
	return null;
}

/**
 * Get textures from either loaded skin or default skin.
 * @method getTextures
 */
Resources.prototype.getTextures = function(key) {
	var values = null;
	var isDefault = false;

	
	

	if((this.skin != null) && (this.skin[key] != null)) {
		values = this.skin[key];
	}
	else {
		values = this.defaultSkin[key];
		isDefault = true;
	}


	var frame = null;
	var texture = null;
	var textures = new Array();
	for(var i = 0; i < values.length; i++) {
		frame = null;
		texture = null;
		
		if(values[i].texture != null) {
			texture = values[i].texture;
		}
		else if(!isDefault && (this.skin.defaultTexture != null)) {
			texture = this.skin.defaultTexture;
		}
		else {
			texture = this.defaultSkin.defaultTexture;
		}

		if(values[i].coords != null) {
			frame = values[i].coords;
		}
		else if(typeof values[i] === "string") {
			texture = values[i];
		}
		else {
			frame = values[i];
		}

		if(texture != null) {
			if(frame != null)
				textures.push(this.getComponentsPart(texture, frame[0], frame[1], frame[2], frame[3]));
			else
				textures.push(this.getComponentsPart(texture, frame));
		}
	}

	
	if(textures.length <= 0)
		throw new Error("Invalid skin key: " + key);
	 

	return textures;
}

/**
 * Get part from components atlas.
 * @method getComponentsPart
 * @private
 */
Resources.prototype.getComponentsPart = function(textureid, x, y, w, h) {

	var frame;
	var texture = this.getTextureFromSkin(textureid);

	if(x === null) {
		frame = {
			x: 0,
			y: 0,
			width: texture.width,
			height: texture.height
		};
	}
	else {
		frame = {
			x: x,
			y: y,
			width: w,
			height: h
		};
	}

	return new PIXI.Texture(texture, frame);
}

/**
 * Get texture object from skin.
 * @method getTextureFromSkin
 * @private
 */
Resources.prototype.getTextureFromSkin = function(textureid) {

	var textureObject = null;

	if((this.skin != null) && (this.skin.textures != null)) {
		for(var i = 0; i < this.skin.textures.length; i++) {
			if(this.skin.textures[i].id == textureid) {
				textureObject = this.skin.textures[i];
			}
		}
	}
	if(textureObject == null) {
		for(var i = 0; i < this.defaultSkin.textures.length; i++) {
			if(this.defaultSkin.textures[i].id == textureid) {
				textureObject = this.defaultSkin.textures[i];
			}
		}
	}

	if(textureObject == null) {
		throw new Error("textureid doesn't exist: " + textureid);
	}

	if(this.textures[textureObject.id] == null)
		this.textures[textureObject.id] = new PIXI.Texture.fromImage(textureObject.file);

	return this.textures[textureObject.id];
}


/**
 * Get singleton instance.
 * @method getInstance
 */
Resources.getInstance = function() {
	if (!Resources.instance)
		Resources.instance = new Resources();

	return Resources.instance;
}

module.exports = Resources;
},{"../../utils/Point":78,"./DefaultSkin":13,"pixi.js":3}],15:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var Resources = require("../resources/Resources");

/**
 * Big button.
 * @class BigButton
 */
function BigButton() {
	Button.call(this);

	this.bigButtonTexture = Resources.getInstance().getTexture("bigButton");

	this.addChild(new PIXI.Sprite(this.bigButtonTexture));

	var style = {
		font: "bold 18px Arial",
		//fill: "#000000"
	};

	this.labelField = new PIXI.Text("[button]", style);
	this.labelField.position.y = 30;
	this.addChild(this.labelField);

	var style = {
		font: "bold 14px Arial"
		//fill: "#000000"
	};

	this.valueField = new PIXI.Text("[value]", style);
	this.valueField.position.y = 50;
	this.addChild(this.valueField);

	this.setLabel("TEST");
	this.setValue(123);
}

FunctionUtil.extend(BigButton, Button);

/**
 * Set label for the button.
 * @method setLabel
 */
BigButton.prototype.setLabel = function(label) {
	this.labelField.setText(label);
	this.labelField.updateTransform();
	this.labelField.x = this.bigButtonTexture.width / 2 - this.labelField.width / 2;
}

/**
 * Set value.
 * @method setValue
 */
BigButton.prototype.setValue = function(value) {
	if (!value) {
		this.valueField.visible = false;
		value = "";
	} else {
		this.valueField.visible = true;
	}

	this.valueField.setText(value);
	this.valueField.updateTransform();
	this.valueField.x = this.bigButtonTexture.width / 2 - this.valueField.width / 2;
}

module.exports = BigButton;
},{"../../utils/Button":67,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3}],16:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Button = require("../../utils/Button");
var Slider = require("../../utils/Slider");
var NineSlice = require("../../utils/NineSlice");
var BigButton = require("./BigButton");
var Resources = require("../resources/Resources");
var RaiseShortcutButton = require("./RaiseShortcutButton");

/**
 * Buttons
 * @class ButtonsView
 */
function ButtonsView() {
	PIXI.DisplayObjectContainer.call(this);

	this.buttonHolder = new PIXI.DisplayObjectContainer();
	this.addChild(this.buttonHolder);

	var sliderBackground = new NineSlice(Resources.getInstance().getTexture("sliderBackground"), 20, 0, 20, 0);
	sliderBackground.width = 300;

	var knob = new PIXI.Sprite(Resources.getInstance().getTexture("sliderKnob"));

	this.slider = new Slider(sliderBackground, knob);
	var pos = Resources.getInstance().getPoint("bigButtonPosition");
	this.slider.position.x = pos.x;
	this.slider.position.y = pos.y - 35;
	this.slider.addEventListener("change", this.onSliderChange, this);
	this.addChild(this.slider);


	this.buttonHolder.position.x = 366;
	this.buttonHolder.position.y = 575;

	this.buttons = [];

	for (var i = 0; i < 3; i++) {
		var button = new BigButton();
		button.on(Button.CLICK, this.onButtonClick, this);
		button.position.x = i * 105;
		this.buttonHolder.addChild(button);
		this.buttons.push(button);
	}

	var raiseSprite = new PIXI.Sprite(Resources.getInstance().getTexture("sliderKnob"));
	var arrowSprite = new PIXI.Sprite(Resources.getInstance().getTexture("upArrow"));
	arrowSprite.position.x = (raiseSprite.width - arrowSprite.width)*0.5 - 0.5;
	arrowSprite.position.y = (raiseSprite.height - arrowSprite.height)*0.5 - 2;
	raiseSprite.addChild(arrowSprite);

	this.raiseMenuButton = new Button(raiseSprite);
	this.raiseMenuButton.addEventListener(Button.CLICK, this.onRaiseMenuButtonClick, this);
	this.raiseMenuButton.position.x = 2*105 + 70;
	this.raiseMenuButton.position.y = -5;
	this.buttonHolder.addChild(this.raiseMenuButton);

	this.raiseMenuButton.visible = false;
	this.createRaiseAmountMenu();

	this.setButtons([], 0, -1, -1);

	this.buttonsDatas = [];
}

FunctionUtil.extend(ButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ButtonsView);

ButtonsView.BUTTON_CLICK = "buttonClick";


/**
 * Create raise amount menu.
 * @method createRaiseAmountMenu
 */
ButtonsView.prototype.createRaiseAmountMenu = function() {
	this.raiseAmountMenu = new PIXI.DisplayObjectContainer();

	this.raiseMenuBackground = new NineSlice(Resources.getInstance().getTexture("chatBackground"), 10, 10, 10, 10);
	this.raiseMenuBackground.position.x = 0;
	this.raiseMenuBackground.position.y = 0;
	this.raiseMenuBackground.width = 125;
	this.raiseMenuBackground.height = 220;
	this.raiseAmountMenu.addChild(this.raiseMenuBackground);

	this.raiseAmountMenu.x = 645;
	this.raiseAmountMenu.y = 570 - this.raiseAmountMenu.height;
	this.addChild(this.raiseAmountMenu);

	var styleObject = {
		font: "bold 18px Arial",
	};

	var t = new PIXI.Text("RAISE TO", styleObject);
	t.position.x = (125 - t.width)*0.5;
	t.position.y = 10;
	this.raiseAmountMenu.addChild(t);

	this.raiseShortcutButtons = new Array();

	for(var i = 0; i < 6; i++) {
		var b = new RaiseShortcutButton();
		b.addEventListener(Button.CLICK, this.onRaiseShortcutClick, this);
		b.position.x = 10;
		b.position.y = 35 + i*30;

		this.raiseAmountMenu.addChild(b);
		this.raiseShortcutButtons.push(b);
	}

/*
	PixiTextinput should be used.
	this.raiseAmountMenuInput=new TextField();
	this.raiseAmountMenuInput.x=10;
	this.raiseAmountMenuInput.y=40+30*5;
	this.raiseAmountMenuInput.width=105;
	this.raiseAmountMenuInput.height=19;
	this.raiseAmountMenuInput.border=true;
	this.raiseAmountMenuInput.borderColor=0x404040;
	this.raiseAmountMenuInput.background=true;
	this.raiseAmountMenuInput.multiline=false;
	this.raiseAmountMenuInput.type=TextFieldType.INPUT;
	this.raiseAmountMenuInput.addEventListener(Event.CHANGE,onRaiseAmountMenuInputChange);
	this.raiseAmountMenuInput.addEventListener(KeyboardEvent.KEY_DOWN,onRaiseAmountMenuInputKeyDown);
	this.raiseAmountMenu.addChild(this.raiseAmountMenuInput);
	*/

	this.raiseAmountMenu.visible = false;
}

/**
 * Raise amount button.
 * @method onRaiseMenuButtonClick
 */
ButtonsView.prototype.onRaiseShortcutClick = function() {
	/*var b = cast e.target;

	_raiseAmountMenu.visible=false;

	buttons[_sliderIndex].value=b.value;
	_slider.value=(buttons[_sliderIndex].value-_sliderMin)/(_sliderMax-_sliderMin);
	_raiseAmountMenuInput.text=Std.string(buttons[_sliderIndex].value);

	trace("value click: "+b.value);*/
}



/**
 * Raise amount button.
 * @method onRaiseMenuButtonClick
 */
ButtonsView.prototype.onRaiseMenuButtonClick = function() {
	this.raiseAmountMenu.visible = !this.raiseAmountMenu.visible;
/*
	if(this.raiseAmountMenu.visible) {
		this.stage.mousedown = this.onStageMouseDown.bind(this);
		// this.raiseAmountMenuInput.focus();
		// this.raiseAmountMenuInput.SelectAll
	}
	else {
		this.stage.mousedown = null;
	}*/
}

/**
 * Slider change.
 * @method onSliderChange
 */
ButtonsView.prototype.onSliderChange = function() {
	var newValue = Math.round(this.sliderMin + this.slider.getValue()*(this.sliderMax - this.sliderMin));
	this.buttons[this.sliderIndex].setValue(newValue);
	this.buttonDatas[this.sliderIndex].value = newValue;
	console.log("newValue = " + newValue);

	//this.raiseAmountMenuInput.setText(buttons[_sliderIndex].value.toString());
}

/**
 * Show slider.
 * @method showSlider
 */
ButtonsView.prototype.showSlider = function(index, min, max) {
	console.log("showSlider");
	this.sliderIndex = index;
	this.sliderMin = min;
	this.sliderMax = max;

	console.log("this.buttonDatas["+index+"] = " + this.buttonDatas[index].getValue() + ", min = " + min + ", max = " + max);
	this.slider.setValue((this.buttonDatas[index].getValue() - min)/(max - min));
	console.log("this.slider.getValue() = " + this.slider.getValue());
	this.slider.visible = true;
	this.slider.show();
}

/**
 * Clear.
 * @method clear
 */
ButtonsView.prototype.clear = function(buttonDatas) {
	this.setButtons([], 0, -1, -1);
}

/**
 * Set button datas.
 * @method setButtons
 */
ButtonsView.prototype.setButtons = function(buttonDatas, sliderButtonIndex, min, max) {
	this.buttonDatas = buttonDatas;

	for (var i = 0; i < this.buttons.length; i++) {
		var button = this.buttons[i];
		if (i >= buttonDatas.length) {
			button.visible = false;
			continue;
		}

		var buttonData = buttonDatas[i];

		button.visible = true;
		button.setLabel(buttonData.getButtonString());
		button.setValue(buttonData.getValue());

	}

	if((min >= 0) && (max >= 0))
		this.showSlider(sliderButtonIndex, min, max);

	this.buttonHolder.position.x = 366;

	if (buttonDatas.length < 3)
		this.buttonHolder.position.x += 45;
}

/**
 * Button click.
 * @method onButtonClick
 * @private
 */
ButtonsView.prototype.onButtonClick = function(e) {
	var buttonIndex = -1;

	for (var i = 0; i < this.buttons.length; i++) {
		this.buttons[i].visible = false;
		if (e.target == this.buttons[i])
			buttonIndex = i;
	}

	//console.log("button click: " + buttonIndex);
	var buttonData = this.buttonDatas[buttonIndex];

	this.trigger({
		type: ButtonsView.BUTTON_CLICK,
		button: buttonData.getButton(),
		value: buttonData.getValue()
	});
}

module.exports = ButtonsView;
},{"../../utils/Button":67,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../../utils/Slider":80,"../resources/Resources":14,"./BigButton":15,"./RaiseShortcutButton":26,"pixi.js":3}],17:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * A card view.
 * @class CardView
 */
function CardView() {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;




	this.frame = new PIXI.Sprite(Resources.getInstance().getTexture("cardFrame"));
	this.addChild(this.frame);

	this.suit = new PIXI.Sprite(Resources.getInstance().getTextures("suitSymbols")[0]);
	this.suit.position.x = 8;
	this.suit.position.y = 25;
	this.addChild(this.suit);

	var style = {
		font: "bold 16px Arial"
	};

	this.valueField = new PIXI.Text("[val]", style);
	this.valueField.position.x = 6;
	this.valueField.position.y = 5;
	this.addChild(this.valueField);

	this.back = new PIXI.Sprite(Resources.getInstance().getTexture("cardBack"));
	this.addChild(this.back);


	this.maskGraphics = new PIXI.Graphics();
	this.maskGraphics.beginFill(0x000000);
	this.maskGraphics.drawRect(0, 0, 87, this.height);
	this.maskGraphics.endFill();
	this.addChild(this.maskGraphics);

	this.mask = this.maskGraphics;
}

FunctionUtil.extend(CardView, PIXI.DisplayObjectContainer);
EventDispatcher.init(CardView);

/**
 * Set card data.
 * @method setCardData
 */
CardView.prototype.setCardData = function(cardData) {
	this.cardData = cardData;


	if (this.cardData.isShown()) {
		/*
		this.back.visible = false;
		this.frame.visible = true;
*/
		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;

		this.suit.setTexture(Resources.getInstance().getTextures("suitSymbols")[this.cardData.getSuitIndex()]);
	}
	this.back.visible = true;
	this.frame.visible = false;
}

/**
 * Set card data.
 * @method setCardData
 */
CardView.prototype.setTargetPosition = function(point) {
	this.targetPosition = point;

	this.position.x = point.x;
	this.position.y = point.y;
}

/**
 * Hide.
 * @method hide
 */
CardView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
CardView.prototype.show = function(animate, delay) {
	/*if(delay == undefined)
		delay = 1;
	*/
	this.maskGraphics.scale.y = 1;
	this.position.x = this.targetPosition.x;
	this.position.y = this.targetPosition.y;
	if(!animate) {
		this.onShowComplete();
		return;
	}
	this.mask.height = this.height;

	var destination = {x: this.position.x, y: this.position.y};
	this.position.x = (this.parent.width - this.width)*0.5;
	this.position.y = -this.height;

	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX*diffX + diffY*diffY);

	var tween = new TWEEN.Tween( this.position )
            .delay(delay)
            .to( { x: destination.x, y: destination.y }, 3*diff )
            .easing( TWEEN.Easing.Quadratic.Out )
            .onStart(this.onShowStart.bind(this))
            .onComplete(this.onShowComplete.bind(this))
            .start();
}

/**
 * Show complete.
 * @method onShowComplete
 */
CardView.prototype.onShowStart = function() {
	this.visible = true;
}

/**
 * Show complete.
 * @method onShowComplete
 */
CardView.prototype.onShowComplete = function() {
	if(this.cardData.isShown()) {
		this.back.visible = false;
		this.frame.visible = true;
	}
	this.dispatchEvent("animationDone", this);
}

/**
 * Fold.
 * @method fold
 */
CardView.prototype.fold = function() {
	var o = {
		x: this.targetPosition.x,
		y: this.targetPosition.y+80
	};

	var time = 500;// Settings.instance.scaleAnimationTime(500);
	this.t0 = new TWEEN.Tween(this.position)
			.to(o, time)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(this.onFoldUpdate.bind(this))
			.onComplete(this.onFoldComplete.bind(this))
			.start();
}

/**
 * Fold animation update.
 * @method onFoldUpdate
 */
CardView.prototype.onFoldUpdate = function(progress) {
	this.maskGraphics.scale.y = 1 - progress;
}

/**
 * Fold animation complete.
 * @method onFoldComplete
 */
CardView.prototype.onFoldComplete = function() {
	this.dispatchEvent("animationDone");
}

module.exports = CardView;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],18:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var NineSlice = require("../../utils/NineSlice");
var Slider = require("../../utils/Slider");
var Resources = require("../resources/Resources");
var PixiTextInput = require("PixiTextInput");
var MouseOverGroup = require("../../utils/MouseOverGroup");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Chat view.
 * @class ChatView
 */
function ChatView() {
	PIXI.DisplayObjectContainer.call(this);

	this.margin = 5;

	
	var chatPlate = new NineSlice(Resources.getInstance().getTexture("framePlate"), 10);
	chatPlate.position.x = 10;
	chatPlate.position.y = 540;
	chatPlate.setLocalSize(330, 130);
	this.addChild(chatPlate);

	var s = new NineSlice(Resources.getInstance().getTexture("framePlate"), 10);
	s.position.x = 10;
	s.position.y = 675;
	s.setLocalSize(330, 35);
	this.addChild(s);

	var styleObject = {
		font: "12px Arial",
		wordWrapWidth: 310,
		height: 114,
		border: true,
		color: 0xFFFFFF,
		borderColor: 0x404040,
		wordWrap: true,
		multiline: true
	};

	this.container = new PIXI.DisplayObjectContainer();
	this.addChild(this.container);
	this.container.position.x = 20;
	this.container.position.y = 548;

	this.chatMask = new PIXI.Graphics();
	this.chatMask.beginFill(123);
	this.chatMask.drawRect(0, 0, 310, 114);
	this.chatMask.endFill();
	this.container.addChild(this.chatMask);

	this.chatText = new PIXI.Text("", styleObject);
	this.container.addChild(this.chatText);
	this.chatText.mask = this.chatMask;



	var styleObject = {
		font: "14px Arial",
		width: 310,
		height: 19,
		border: true,
		borderColor: 0x404040,
		background: true,
		multiline: true
	};
	this.inputField = new PixiTextInput("", styleObject);
	this.inputField.position.x = this.container.position.x;
	this.inputField.position.y = 683;
	this.inputField.width = 310;
	this.inputField.keydown = this.onKeyDown.bind(this);

	var inputShadow = new PIXI.Graphics();
	inputShadow.beginFill(0x000000);
	inputShadow.drawRect(-1, -1, 311, 20);
	inputShadow.position.x = this.inputField.position.x;
	inputShadow.position.y = this.inputField.position.y;
	this.addChild(inputShadow);

	var inputBackground = new PIXI.Graphics();
	inputBackground.beginFill(0xFFFFFF);
	inputBackground.drawRect(0, 0, 310, 19);
	inputBackground.position.x = this.inputField.position.x;
	inputBackground.position.y = this.inputField.position.y;
	this.addChild(inputBackground);

	this.addChild(this.inputField);



	var slideBack = new NineSlice(Resources.getInstance().getTexture("textScrollbarTrack"), 10, 0, 10, 0);
	slideBack.width = 107;
	var slideKnob = new NineSlice(Resources.getInstance().getTexture("textScrollbarThumb"), 10, 0, 10, 0);
	slideKnob.width = 30;


	this.slider = new Slider(slideBack, slideKnob);
	this.slider.rotation = Math.PI*0.5;
	this.slider.position.x = 326;
	this.slider.position.y = 552;
	this.slider.setValue(1);
	this.slider.visible = false;
	this.slider.addEventListener("change", this.onSliderChange.bind(this));
	this.addChild(this.slider);


	this.mouseOverGroup = new MouseOverGroup();
	this.mouseOverGroup.addDisplayObject(this.chatText);
	this.mouseOverGroup.addDisplayObject(this.slider);
	this.mouseOverGroup.addDisplayObject(this.chatMask);
	this.mouseOverGroup.addDisplayObject(chatPlate);
	this.mouseOverGroup.addEventListener("mouseover", this.onChatFieldMouseOver, this);
	this.mouseOverGroup.addEventListener("mouseout", this.onChatFieldMouseOut, this);

	this.clear();
}

FunctionUtil.extend(ChatView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ChatView);



/**
 * Clear messages.
 * @method clear
 */
ChatView.prototype.clear = function() {
	this.chatText.setText("");
 	this.chatText.y = -Math.round(this.slider.getValue()*(this.chatText.height + this.margin - this.chatMask.height ));
	this.slider.setValue(1);
}


/**
 *  Add text.
 * @method clear
 */
ChatView.prototype.addText = function(user, text) {
	this.chatText.setText(this.chatText.text + user + ": " + text + "\n");
 	this.chatText.y = -Math.round(this.slider.getValue()*(this.chatText.height + this.margin - this.chatMask.height ));
	this.slider.setValue(1);
}

/**
 * On slider value change
 * @method onSliderChange
 */
 ChatView.prototype.onSliderChange = function() {
 	this.chatText.y = -Math.round(this.slider.getValue()*(this.chatText.height + this.margin - this.chatMask.height));
 }


/**
 * On mouse over
 * @method onChatFieldMouseOver
 */
 ChatView.prototype.onChatFieldMouseOver = function() {
	this.slider.show();
 }


/**
 * On mouse out
 * @method onChatFieldMouseOut
 */
 ChatView.prototype.onChatFieldMouseOut = function() {
	this.slider.hide();
 }


/**
 * On key down
 * @method onKeyDown
 */
 ChatView.prototype.onKeyDown = function(event) {
	if(event.keyCode == 13) {
		this.dispatchEvent("chat", this.inputField.text);
		
		this.inputField.setText("");
		
	}
 }



module.exports = ChatView;

},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/MouseOverGroup":75,"../../utils/NineSlice":76,"../../utils/Slider":80,"../resources/Resources":14,"PixiTextInput":1,"pixi.js":3}],19:[function(require,module,exports){
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

	var destination = {x: this.position.x, y: this.position.y};
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

	x = this.targetPosition.x;
	y = this.targetPosition.y;

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

	x = this.targetPosition.x;
	y = this.targetPosition.y;

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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],20:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Dialog view.
 * @class DealerButtonView
 */
function DealerButtonView() {
	PIXI.DisplayObjectContainer.call(this);


	var dealerButtonTexture = Resources.getInstance().getTexture("dealerButton");
	this.sprite = new PIXI.Sprite(dealerButtonTexture);
	this.addChild(this.sprite);
	this.hide();
}

FunctionUtil.extend(DealerButtonView, PIXI.DisplayObjectContainer);
EventDispatcher.init(DealerButtonView);

/**
 * Set seat index
 * @method setSeatIndex
 */
DealerButtonView.prototype.setSeatIndex = function(seatIndex) {
	this.position.x = Resources.getInstance().getPoints("dealerButtonPositions")[seatIndex].x;
	this.position.y = Resources.getInstance().getPoints("dealerButtonPositions")[seatIndex].y;
	this.dispatchEvent("animationDone", this);
};

/**
 * Animate to seat index.
 * @method animateToSeatIndex
 */
DealerButtonView.prototype.animateToSeatIndex = function(seatIndex) {
	if (!this.visible) {
		this.setSeatIndex(seatIndex);
		// todo dispatch event that it's complete?
		this.dispatchEvent("animationDone", this);
		return;
	}
	var destination = Resources.getInstance().getPoints("dealerButtonPositions")[seatIndex];
	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX * diffX + diffY * diffY);

	var tween = new TWEEN.Tween(this.position)
		.to({
			x: destination.x,
			y: destination.y
		}, 5 * diff)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onComplete(this.onShowComplete.bind(this))
		.start();
};

/**
 * Show Complete.
 * @method onShowComplete
 */
DealerButtonView.prototype.onShowComplete = function() {
	this.dispatchEvent("animationDone", this);
}

/**
 * Hide.
 * @method hide
 */
DealerButtonView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
DealerButtonView.prototype.show = function(seatIndex, animate) {
	if (this.visible && animate) {
		this.animateToSeatIndex(seatIndex);
	} else {
		this.visible = true;
		this.setSeatIndex(seatIndex);
	}
}

module.exports = DealerButtonView;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],21:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var Resources = require("../resources/Resources");

/**
 * Dialog button.
 * @class DialogButton
 */
function DialogButton() {
	Button.call(this);

	this.buttonTexture = Resources.getInstance().getTexture("dialogButton");
	this.addChild(new PIXI.Sprite(this.buttonTexture));

	var style = {
		font: "normal 14px Arial",
		fill: "#ffffff"
	};

	this.textField = new PIXI.Text("[test]", style);
	this.textField.position.y = 15;
	this.addChild(this.textField);

	this.setText("BTN");
}

FunctionUtil.extend(DialogButton, Button);

/**
 * Set text for the button.
 * @method setText
 */
DialogButton.prototype.setText = function(text) {
	this.textField.setText(text);
	this.textField.updateTransform();
	this.textField.x = this.buttonTexture.width / 2 - this.textField.width / 2;
}

module.exports = DialogButton;
},{"../../utils/Button":67,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3}],22:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var DialogButton = require("./DialogButton");
var ButtonData = require("../../proto/data/ButtonData");
var PixiTextInput = require("PixiTextInput");
var EventDispatcher = require("../../utils/EventDispatcher");
/**
 * Dialog view.
 * @class DialogView
 */
function DialogView() {
	PIXI.DisplayObjectContainer.call(this);

	var cover = new PIXI.Graphics();
	cover.beginFill(0x000000, .5);
	cover.drawRect(0, 0, 960, 720);
	cover.endFill();
	cover.interactive = true;
	//cover.buttonMode = true;
	cover.hitArea = new PIXI.Rectangle(0, 0, 960, 720);
	this.addChild(cover);

	var b = new NineSlice(Resources.getInstance().getTexture("framePlate"), 10);
	b.setLocalSize(480, 270);
	b.position.x = 480 - 480 / 2;
	b.position.y = 360 - 270 / 2;
	this.addChild(b);

	style = {
		font: "normal 14px Arial"
	};

	this.textField = new PIXI.Text("[text]", style);
	this.textField.position.x = b.position.x + 20;
	this.textField.position.y = b.position.y + 20;
	this.addChild(this.textField);

	this.buttonsHolder = new PIXI.DisplayObjectContainer();
	this.buttonsHolder.position.y = 430;
	this.addChild(this.buttonsHolder);
	this.buttons = [];

	for (var i = 0; i < 2; i++) {
		var b = new DialogButton();

		b.position.x = i * 90;
		b.on("click", this.onButtonClick, this);
		this.buttonsHolder.addChild(b);
		this.buttons.push(b);
	}

	style = {
		font: "normal 18px Arial"
	};

	this.inputField = new PixiTextInput("", style);
	this.inputField.position.x = this.textField.position.x;

	this.inputFrame = new PIXI.Graphics();
	this.inputFrame.beginFill(0x000000);
	this.inputFrame.drawRect(-1, -1, 102, 23);
	this.inputFrame.position.x = this.inputField.position.x;
	this.addChild(this.inputFrame);

	this.addChild(this.inputField);

	this.hide();
}

FunctionUtil.extend(DialogView, PIXI.DisplayObjectContainer);
EventDispatcher.init(DialogView);

DialogView.BUTTON_CLICK = "buttonClick";

/**
 * Hide.
 * @method hide
 */
DialogView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
DialogView.prototype.show = function(text, buttonIds, defaultValue) {
	this.visible = true;

	this.buttonIds = buttonIds;

	for (i = 0; i < this.buttons.length; i++) {
		if (i < buttonIds.length) {
			var button = this.buttons[i]
			button.setText(ButtonData.getButtonStringForId(buttonIds[i]));
			button.visible = true;
		} else {
			this.buttons[i].visible = false;
		}
	}

	this.buttonsHolder.x = 480 - buttonIds.length * 90 / 2;
	this.textField.setText(text);

	if (defaultValue) {
		this.inputField.position.y = this.textField.position.y + this.textField.height + 20;
		this.inputFrame.position.y = this.inputField.position.y;
		this.inputField.visible = true;
		this.inputFrame.visible = true;

		this.inputField.text = defaultValue;
		this.inputField.focus();
	} else {
		this.inputField.visible = false;
		this.inputFrame.visible = false;
	}
}

/**
 * Handle button click.
 * @method onButtonClick
 */
DialogView.prototype.onButtonClick = function(e) {
	var buttonIndex = -1;

	for (var i = 0; i < this.buttons.length; i++)
		if (e.target == this.buttons[i])
			buttonIndex = i;

	var value = null;
	if (this.inputField.visible)
		value = this.inputField.text;

	var ev = {
		type: DialogView.BUTTON_CLICK,
		button: this.buttonIds[buttonIndex],
		value: value
	};

	this.trigger(ev);
	this.hide();
}

module.exports = DialogView;
},{"../../proto/data/ButtonData":32,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../resources/Resources":14,"./DialogButton":21,"PixiTextInput":1,"pixi.js":3}],23:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Gradient = require("../../utils/Gradient");

/**
 * Loading screen.
 * @class LoadingScreen
 */
function LoadingScreen() {
	PIXI.DisplayObjectContainer.call(this);

	var gradient = new Gradient();
	gradient.setSize(100, 100);
	gradient.addColorStop(0, "#ffffff");
	gradient.addColorStop(1, "#c0c0c0");

	var s = gradient.createSprite();
	s.width = 960;
	s.height = 720;
	this.addChild(s);

	var style = {
		font: "bold 20px Arial",
		fill: "#808080"
	};

	this.textField = new PIXI.Text("[text]", style);
	this.textField.position.x = 960 / 2;
	this.textField.position.y = 720 / 2 - this.textField.height / 2;
	this.addChild(this.textField);
}

FunctionUtil.extend(LoadingScreen, PIXI.DisplayObjectContainer);

/**
 * Show.
 * @method show
 */
LoadingScreen.prototype.show = function(message) {
	this.textField.setText(message);
	this.textField.updateTransform();
	this.textField.x = 960 / 2 - this.textField.width / 2;
	this.visible = true;
}

/**
 * Hide.
 * @method hide
 */
LoadingScreen.prototype.hide = function() {
	this.visible = false;
}

module.exports = LoadingScreen;
},{"../../utils/FunctionUtil":72,"../../utils/Gradient":73,"pixi.js":3}],24:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var Resources = require("../resources/Resources");
var SeatView = require("./SeatView");
var CardView = require("./CardView");
var ChatView = require("./ChatView");
var Point = require("../../utils/Point");
var Gradient = require("../../utils/Gradient");
var ButtonsView = require("./ButtonsView");
var DialogView = require("./DialogView");
var DealerButtonView = require("./DealerButtonView");
var ChipsView = require("./ChipsView");
var PotView = require("./PotView");
var TimerView = require("./TimerView");
var SettingsView = require("../view/SettingsView");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView() {
	PIXI.DisplayObjectContainer.call(this);

	this.setupBackground();

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableBackground = new PIXI.Sprite(Resources.getInstance().getTexture("tableBackground"));
	this.tableContainer.addChild(this.tableBackground);

	this.setupSeats();
	this.setupCommunityCards();

	this.timerView = new TimerView();
	this.tableContainer.addChild(this.timerView);

	this.chatView = new ChatView();
	this.addChild(this.chatView);

	this.buttonsView = new ButtonsView();
	this.addChild(this.buttonsView);

	this.dialogView = new DialogView();
	this.addChild(this.dialogView);

	this.dealerButtonView = new DealerButtonView();
	this.addChild(this.dealerButtonView);

	this.potView = new PotView();
	this.addChild(this.potView);
	this.potView.position.x = Resources.getInstance().getPoint("potPosition").x;
	this.potView.position.y = Resources.getInstance().getPoint("potPosition").y;

	this.settingsView = new SettingsView();
	this.addChild(this.settingsView);

	this.setupChips();
}

FunctionUtil.extend(NetPokerClientView, PIXI.DisplayObjectContainer);
EventDispatcher.init(NetPokerClientView);

NetPokerClientView.SEAT_CLICK = "seatClick";

/**
 * Setup background.
 * @method setupBackground
 */
NetPokerClientView.prototype.setupBackground = function() {
	var gradient = new Gradient();
	gradient.setSize(100, 100);
	gradient.addColorStop(0, "#606060");
	gradient.addColorStop(.5, "#a0a0a0");
	gradient.addColorStop(1, "#909090");

	var s = gradient.createSprite();
	s.width = 960;
	s.height = 720;
	this.addChild(s);

	var s = new PIXI.Sprite(Resources.getInstance().getTexture("dividerLine"));
	s.x = 345;
	s.y = 540;
	this.addChild(s);

	var s = new PIXI.Sprite(Resources.getInstance().getTexture("dividerLine"));
	s.x = 693;
	s.y = 540;
	this.addChild(s);
}

/**
 * Setup seats.
 * @method serupSeats
 */
NetPokerClientView.prototype.setupSeats = function() {
	var i, j;
	var pocketCards;

	this.seatViews = [];

	for (i = 0; i < Resources.getInstance().getPoints("seatPositions").length; i++) {
		var seatView = new SeatView(i);
		var p = seatView.position;

		for (j = 0; j < 2; j++) {
			var c = new CardView();
			c.hide();
			c.setTargetPosition(Point(p.x + j * 30 - 60, p.y - 100));
			this.tableContainer.addChild(c);
			seatView.addPocketCard(c);
			seatView.on("click", this.onSeatClick, this);
		}

		this.tableContainer.addChild(seatView);
		this.seatViews.push(seatView);
	}
}

/**
 * Setup chips.
 * @method serupSeats
 */
NetPokerClientView.prototype.setupChips = function() {
	var i;
	for (i = 0; i < Resources.getInstance().getPoints("betPositions").length; i++) {
		var chipsView = new ChipsView();
		this.seatViews[i].betChips = chipsView;

		chipsView.setAlignment(Resources.getInstance().getValue("betAlign")[i]);
		chipsView.setTargetPosition(Resources.getInstance().getPoints("betPositions")[i]);
		this.tableContainer.addChild(chipsView);
	}
}

/**
 * Seat click.
 * @method onSeatClick
 * @private
 */
NetPokerClientView.prototype.onSeatClick = function(e) {
	var seatIndex = -1;

	for (var i = 0; i < this.seatViews.length; i++)
		if (e.target == this.seatViews[i])
			seatIndex = i;

	console.log("seat click: " + seatIndex);
	this.trigger({
		type: NetPokerClientView.SEAT_CLICK,
		seatIndex: seatIndex
	});
}

/**
 * Setup community cards.
 * @method setupCommunityCards
 * @private
 */
NetPokerClientView.prototype.setupCommunityCards = function() {
	this.communityCards = [];

	var p = Resources.getInstance().getPoint("communityCardsPosition");

	for (i = 0; i < 5; i++) {
		var cardView = new CardView();
		cardView.hide();
		cardView.setTargetPosition(Point(p.x + i * 90, p.y));

		this.communityCards.push(cardView);
		this.tableContainer.addChild(cardView);
	}
}

/**
 * Get seat view by index.
 * @method getSeatViewByIndex
 */
NetPokerClientView.prototype.getSeatViewByIndex = function(index) {
	return this.seatViews[index];
}

/**
 * Get seat view by index.
 * @method getSeatViewByIndex
 */
NetPokerClientView.prototype.getCommunityCards = function() {
	return this.communityCards;
}

/**
 * Get buttons view.
 * @method getSeatViewByIndex
 */
NetPokerClientView.prototype.getButtonsView = function() {
	return this.buttonsView;
}

/**
 * Get dialog view.
 * @method getDialogView
 */
NetPokerClientView.prototype.getDialogView = function() {
	return this.dialogView;
}

/**
 * Get dialog view.
 * @method getDealerButtonView
 */
NetPokerClientView.prototype.getDealerButtonView = function() {
	return this.dealerButtonView;
}

/**
 * Clear everything to an empty state.
 * @method clear
 */
NetPokerClientView.prototype.clear = function() {
	var i;

	for (i = 0; i < this.communityCards.length; i++)
		this.communityCards[i].hide();

	for (i = 0; i < this.seatViews.length; i++)
		this.seatViews[i].clear();

	this.timerView.hide();
	this.potView.setValues(new Array());
	this.dealerButtonView.hide();
	this.chatView.clear();

	this.dialogView.hide();
	this.buttonsView.clear();
}

module.exports = NetPokerClientView;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/Gradient":73,"../../utils/Point":78,"../resources/Resources":14,"../view/SettingsView":29,"./ButtonsView":16,"./CardView":17,"./ChatView":18,"./ChipsView":19,"./DealerButtonView":20,"./DialogView":22,"./PotView":25,"./SeatView":27,"./TimerView":30,"pixi.js":3}],25:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var ChipsView = require("./ChipsView");



/**
 * A pot view
 * @class PotView
 */
function PotView() {
	PIXI.DisplayObjectContainer.call(this);
	
	this.value = 0;

	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.stacks = new Array();
}

FunctionUtil.extend(PotView, PIXI.DisplayObjectContainer);
EventDispatcher.init(PotView);

/**
 * Set value.
 * @method setValue
 */
PotView.prototype.setValues = function(values) {
	
	for(var i = 0; i < this.stacks.length; i++)
		this.holder.removeChild(this.stacks[i]);

	this.stacks = new Array();

	var pos = 0;

	for(var i = 0; i < values.length; i++) {
		var chips = new ChipsView(false);
		this.stacks.push(chips);
		this.holder.addChild(chips);
		chips.setValue(values[i]);
		chips.x = pos;
		pos += Math.floor(chips.width + 20);

		var textField = new PIXI.Text(values[i], {
			font: "bold 12px Arial",
			align: "center",
			fill: 0xffffff
		});

		textField.position.x = (chips.width - textField.width)*0.5;
		textField.position.y = 30;

		chips.addChild(textField);
	}

	this.holder.x = -this.holder.width*0.5;
}

/**
 * Hide.
 * @method hide
 */
PotView.prototype.hide = function() {
	this.visible = false;
}

/**
 * Show.
 * @method show
 */
PotView.prototype.show = function() {
	this.visible = true;

}

module.exports = PotView;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../resources/Resources":14,"./ChipsView":19,"pixi.js":3,"tween.js":4}],26:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var Settings = require("../app/Settings");
var EventDispatcher = require("../../utils/EventDispatcher");
var Checkbox = require("../../utils/Checkbox");



/**
 * Raise shortcut button
 * @class RaiseShortcutButton
 */
 function RaiseShortcutButton() {
 	var background = new NineSlice(Resources.getInstance().getTexture("buttonBackground"), 10, 5, 10, 5);
 	background.width = 105;
 	background.height = 25;
	Button.call(this, background);

 	var styleObject = {
 		width: 105,
 		height: 20,
 		font: "bold 14px Arial",
 		color: "white"
 	};
	this.label = new PIXI.Text("", styleObject);
	this.label.position.x = 8;
	this.label.position.y = 4;
	this.addChild(this.label);
}

FunctionUtil.extend(RaiseShortcutButton, Button);
EventDispatcher.init(RaiseShortcutButton);

/**
 * Setter.
 * @method setText
 */
RaiseShortcutButton.prototype.setText = function(string) {
	this.label.setText(string);
	return string;
}

/**
 * Set enabled.
 * @method setEnabled
 */
RaiseShortcutButton.prototype.setEnabled = function(value) {
	if(value) {
		this.alpha = 1;
		this.interactive = true;
		this.buttonMode = true;
	}
	else {
		this.alpha = 0.5;
		this.interactive = false;
		this.buttonMode = false;
	}
	return value;
}

module.exports = RaiseShortcutButton;
},{"../../utils/Button":67,"../../utils/Checkbox":68,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],27:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var Button = require("../../utils/Button");

/**
 * A seat view.
 * @class SeatView
 */
function SeatView(seatIndex) {
	Button.call(this);

	this.pocketCards = [];
	this.seatIndex = seatIndex;

	var seatTexture = Resources.getInstance().getTexture("seatPlate");
	var seatSprite = new PIXI.Sprite(seatTexture);

	seatSprite.position.x = -seatTexture.width / 2;
	seatSprite.position.y = -seatTexture.height / 2;

	this.addChild(seatSprite);

	var pos = Resources.getInstance().getPoints("seatPositions")[this.seatIndex];

	this.position.x = pos.x;
	this.position.y = pos.y;

	var style;

	style = {
		font: "bold 20px Arial"
	};

	this.nameField = new PIXI.Text("[name]", style);
	this.nameField.position.y = -20;
	this.addChild(this.nameField);

	style = {
		font: "normal 12px Arial"
	};

	this.chipsField = new PIXI.Text("[name]", style);
	this.chipsField.position.y = 5;
	this.addChild(this.chipsField);

	style = {
		font: "bold 20px Arial"
	};

	this.actionField = new PIXI.Text("action", style);
	this.actionField.position.y = -13;
	this.addChild(this.actionField);
	this.actionField.alpha = 0;

	this.setName("");
	this.setChips("");
}

FunctionUtil.extend(SeatView, Button);

/**
 * Set name.
 * @method setName
 */
SeatView.prototype.setName = function(name) {
	this.nameField.setText(name);
	this.nameField.updateTransform();

	this.nameField.position.x = -this.nameField.canvas.width / 2;
}

/**
 * Set name.
 * @method setChips
 */
SeatView.prototype.setChips = function(chips) {
	this.chipsField.setText(chips);
	this.chipsField.updateTransform();

	this.chipsField.position.x = -this.chipsField.canvas.width / 2;
}

/**
 * Set sitout.
 * @method setSitout
 */
SeatView.prototype.setSitout = function(sitout) {
	if (sitout)
		this.alpha = .5;

	else
		this.alpha = 1;
}

/**
 * Set sitout.
 * @method setActive
 */
SeatView.prototype.setActive = function(active) {
	this.visible = active;
}

/**
 * Add pocket card.
 * @method addPocketCard
 */
SeatView.prototype.addPocketCard = function(cardView) {
	this.pocketCards.push(cardView);
}

/**
 * Get pocket cards.
 * @method getPocketCards
 */
SeatView.prototype.getPocketCards = function() {
	return this.pocketCards;
}

/**
 * Fold cards.
 * @method foldCards
 */
SeatView.prototype.foldCards = function() {
	this.pocketCards[0].addEventListener("animationDone", this.onFoldComplete, this);
	for(var i = 0; i < this.pocketCards.length; i++) {
		this.pocketCards[i].fold();
	}
}

/**
 * Fold complete.
 * @method onFoldComplete
 */
SeatView.prototype.onFoldComplete = function() {
	this.pocketCards[0].removeEventListener("animationDone", this.onFoldComplete, this);
	this.dispatchEvent("animationDone");
}

/**
 * Show user action.
 * @method action
 */
SeatView.prototype.action = function(action) {
	this.actionField.setText(action);
	this.actionField.position.x = -this.actionField.canvas.width / 2;

	this.actionField.alpha = 1;
	this.nameField.alpha = 0;
	this.chipsField.alpha = 0;

	setTimeout(this.onTimer.bind(this), 1000);
}

/**
 * Show user action.
 * @method action
 */
SeatView.prototype.onTimer = function(action) {

	var t1 = new TWEEN.Tween(this.actionField)
							.to({alpha: 0}, 1000)
							.start();
	var t2 = new TWEEN.Tween(this.nameField)
							.to({alpha: 1}, 1000)
							.start();
	var t3 = new TWEEN.Tween(this.chipsField)
							.to({alpha: 1}, 1000)
							.start();

}

/**
 * Clear.
 * @method clear
 */
SeatView.prototype.clear = function() {
	var i;

	this.visible = true;
	this.sitout = false;
	//seat.betChips.setValue(0);
	this.setName("");
	this.setChips("");

	for (i=0; i<this.pocketCards.length; i++)
		this.pocketCards[i].hide();
}

module.exports = SeatView;
},{"../../utils/Button":67,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],28:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var Settings = require("../app/Settings");
var EventDispatcher = require("../../utils/EventDispatcher");
var Checkbox = require("../../utils/Checkbox");



/**
 * Checkboxes view
 * @class SettingsCheckbox
 */
 function SettingsCheckbox(id, string) {
 	PIXI.DisplayObjectContainer.call(this);

 	this.id = id;

 	var y = 0;

 	var styleObject = {
 		width: 200,
 		height: 25,
 		font: "bold 13px Arial",
 		color: "white"
 	};
 	this.label = new PIXI.Text(string, styleObject);
 	this.label.position.x = 25;
 	this.label.position.y = y + 1;
 	this.addChild(this.label);

 	var background = new PIXI.Sprite(Resources.getInstance().getTexture("checkboxBackground"));
 	var tick = new PIXI.Sprite(Resources.getInstance().getTexture("checkboxTick"));
 	tick.x = 1;

 	this.checkbox = new Checkbox(background, tick);
 	this.checkbox.position.y = y;
 	this.addChild(this.checkbox);

 	this.checkbox.addEventListener("change", this.onCheckboxChange, this);
}

FunctionUtil.extend(SettingsCheckbox, PIXI.DisplayObjectContainer);
EventDispatcher.init(SettingsCheckbox);

/**
 * Checkbox change.
 * @method onCheckboxChange
 */
SettingsCheckbox.prototype.onCheckboxChange = function(interaction_object) {
	this.dispatchEvent("change", this);
}

/**
 * Getter.
 * @method getChecked
 */
SettingsCheckbox.prototype.getChecked = function() {
	return this.checkbox.getChecked();
}

/**
 * Setter.
 * @method setChecked
 */
SettingsCheckbox.prototype.setChecked = function(checked) {
	this.checkbox.setChecked(checked);
	return checked;
}

module.exports = SettingsCheckbox;
},{"../../utils/Button":67,"../../utils/Checkbox":68,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],29:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var Settings = require("../app/Settings");
var EventDispatcher = require("../../utils/EventDispatcher");
var SettingsCheckbox = require("./SettingsCheckbox");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");



/**
 * A settings view
 * @class SettingsView
 */
 function SettingsView() {
 	PIXI.DisplayObjectContainer.call(this);

 	var object = new PIXI.DisplayObjectContainer();
 	var bg = new NineSlice(Resources.getInstance().getTexture("chatBackground"), 10, 10, 10, 10);
 	bg.width = 30;
 	bg.height = 30;
 	object.addChild(bg);

 	var sprite = new PIXI.Sprite(Resources.getInstance().getTexture("wrenchIcon"));
 	sprite.x = 5;
 	sprite.y = 5;
 	object.addChild(sprite);

 	this.settingsButton = new Button(object);
 	this.settingsButton.position.x = 960 - 10 - this.settingsButton.width;
 	this.settingsButton.position.y = 543;
 	this.settingsButton.addEventListener(Button.CLICK, this.onSettingsButtonClick, this);
 	this.addChild(this.settingsButton);

 	this.settingsMenu = new PIXI.DisplayObjectContainer();
 	
 	var mbg = new NineSlice(Resources.getInstance().getTexture("chatBackground"), 10, 10, 10, 10);
 	mbg.width = 250;
 	mbg.height = 100;
 	this.settingsMenu.addChild(mbg);

 	var styleObject = {
 		font: "bold 14px Arial",
 		color: "#FFFFFF",
 		width: 200,
 		height: 20
 	};
 	var label = new PIXI.Text("Settings", styleObject);
 	label.position.x = 16;
 	label.position.y = 10;

 	this.settingsMenu.addChild(label);
 	this.settingsMenu.position.x = 960 - 10 - this.settingsMenu.width;
 	this.settingsMenu.position.y = 538 - this.settingsMenu.height;
 	this.addChild(this.settingsMenu);

 	this.settings = {};

 	this.createMenuSetting("playAnimations", "Play animations", 40, Settings.getInstance().playAnimations);
 	this.createMenuSetting(CheckboxMessage.AUTO_MUCK_LOSING, "Muck losing hands", 65);

 	this.createSetting(CheckboxMessage.AUTO_POST_BLINDS, "Post blinds", 0);
 	this.createSetting(CheckboxMessage.SITOUT_NEXT, "Sit out", 25);

 	this.settingsMenu.visible = false;

 	this.buyChipsButton = new RaiseShortcutButton();
 	this.buyChipsButton.addEventListener("click", this.onBuyChipsClick, this);
 	this.buyChipsButton.x = 700;
 	this.buyChipsButton.y = 635;
 	this.buyChipsButton.setText("Buy chips");
 	this.addChild(this.buyChipsButton);
}

FunctionUtil.extend(SettingsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(SettingsView);

SettingsView.BUY_CHIPS_CLICK = "buyChipsClick";

/**
 * On buy chips button clicked.
 * @method onBuyChipsClick
 */
SettingsView.prototype.onBuyChipsClick = function(interaction_object) {
	console.log("buy chips click");
	this.dispatchEvent(SettingsView.BUY_CHIPS_CLICK);
}

/**
 * Create checkbox.
 * @method createMenuSetting
 */
SettingsView.prototype.createMenuSetting = function(id, string, y, def) {
	var setting = new SettingsCheckbox(id, string);

	setting.y = y;
	setting.x = 16;
	this.settingsMenu.addChild(setting);

	setting.addEventListener("change", this.onCheckboxChange, this)

	this.settings[id] = setting;
	setting.setChecked(def);
}

/**
 * Create setting.
 * @method createSetting
 */
SettingsView.prototype.createSetting = function(id, string, y) {
	var setting = new SettingsCheckbox(id, string);

	setting.y = 545+y;
	setting.x = 700;
	this.addChild(setting);

	setting.addEventListener("change", this.onCheckboxChange, this)

	this.settings[id] = setting;
}

/**
 * Checkbox change.
 * @method onCheckboxChange
 */
SettingsView.prototype.onCheckboxChange = function(checkbox) {
	if(checkbox.id == "playAnimations") {
		Settings.getInstance().playAnimations = checkbox.getChecked();
		console.log("anims changed..");
	}

	this.dispatchEvent("change", checkbox.id, checkbox.getChecked());
}

/**
 * Settings button click.
 * @method onSettingsButtonClick
 */
SettingsView.prototype.onSettingsButtonClick = function(interaction_object) {
	console.log("SettingsView.prototype.onSettingsButtonClick");
	this.settingsMenu.visible = !this.settingsMenu.visible;

	if(this.settingsMenu.visible) {
		this.stage.mousedown = this.onStageMouseDown.bind(this);
	}
	else {
		this.stage.mousedown = null;
	}
}

/**
 * Stage mouse down.
 * @method onStageMouseDown
 */
SettingsView.prototype.onStageMouseDown = function(interaction_object) {
	console.log("SettingsView.prototype.onStageMouseDown");
	if((this.hitTest(this.settingsMenu, interaction_object)) || (this.hitTest(this.settingsButton, interaction_object))) {
		return;
	}

	this.stage.mousedown = null;
	this.settingsMenu.visible = false;
}

/**
 * Hit test.
 * @method hitTest
 */
SettingsView.prototype.hitTest = function(object, interaction_object) {
	if((interaction_object.global.x > object.getBounds().x ) && (interaction_object.global.x < (object.getBounds().x + object.getBounds().width)) &&
		(interaction_object.global.y > object.getBounds().y) && (interaction_object.global.y < (object.getBounds().y + object.getBounds().height))) {
		return true;		
	}
	return false;
}

/**
 * Reset.
 * @method reset
 */
SettingsView.prototype.reset = function() {
	this.buyChipsButton.enabled = true;
	this.setVisibleButtons([]);
}

/**
 * Set visible buttons.
 * @method setVisibleButtons
 */
SettingsView.prototype.setVisibleButtons = function(buttons) {
	this.buyChipsButton.visible = buttons.indexOf(ButtonData.BUY_CHIPS) != -1;
	this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible = buttons.indexOf(CheckboxMessage.AUTO_POST_BLINDS);
	this.settings[CheckboxMessage.SITOUT_NEXT].visible = buttons.indexOf(CheckboxMessage.SITOUT_NEXT);

	var yp = 543;

	if(this.buyChipsButton.visible) {
		this.buyChipsButton.y = yp;
		yp += 35;
	}
	else {
		yp += 2;
	}

	if(this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible) {
		this.settings[CheckboxMessage.AUTO_POST_BLINDS].y = yp;
		yp += 25;
	}

	if(this.settings[CheckboxMessage.SITOUT_NEXT].visible) {
		this.settings[CheckboxMessage.SITOUT_NEXT].y = yp;
		yp += 25;
	}
}

/**
 * Get checkbox.
 * @method getCheckboxById
 */
SettingsView.prototype.getCheckboxById = function(id) {
	return this.settings[id];
}

module.exports = SettingsView;
},{"../../proto/messages/CheckboxMessage":41,"../../utils/Button":67,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"./RaiseShortcutButton":26,"./SettingsCheckbox":28,"pixi.js":3,"tween.js":4}],30:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");



/**
 * A timer view
 * @class TimerView
 */
function TimerView() {
	PIXI.DisplayObjectContainer.call(this);
	
	this.timerClip = new PIXI.Sprite(Resources.getInstance().getTexture("timerBackground"));
	this.addChild(this.timerClip);


	this.canvas = new PIXI.Graphics();
	this.canvas.x = this.timerClip.width*0.5;
	this.canvas.y = this.timerClip.height*0.5;
	this.timerClip.addChild(this.canvas);

	this.timerClip.visible = false;

	this.tween = null;

	//this.showPercent(30);
}

FunctionUtil.extend(TimerView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TimerView);

/**
 * Hide.
 * @method hide
 */
TimerView.prototype.hide = function() {
	this.timerClip.visible = false;
	this.stop();
}

/**
 * Show.
 * @method show
 */
TimerView.prototype.show = function(seatIndex) {
	
	this.timerClip.visible = true;
	this.timerClip.x = Resources.getInstance().getPoints("seatPositions")[seatIndex].x + 55;
	this.timerClip.y = Resources.getInstance().getPoints("seatPositions")[seatIndex].y - 30;

	this.stop();

}

/**
 * Stop.
 * @method stop
 */
TimerView.prototype.stop = function(seatIndex) {
	if(this.tween != null)
		this.tween.stop();

}

/**
 * Countdown.
 * @method countdown
 */
TimerView.prototype.countdown = function(totalTime, timeLeft) {
	this.stop();

	totalTime *= 1000;
	timeLeft *= 1000;

	var time = Date.now();
	this.startAt = time + timeLeft - totalTime;
	this.stopAt = time + timeLeft;

	this.tween = new TWEEN.Tween({time: time})
						.to({time: this.stopAt}, timeLeft)
						.onUpdate(this.onUpdate.bind(this))
						.onComplete(this.onComplete.bind(this))
						.start();

}

/**
 * On tween update.
 * @method onUpdate
 */
TimerView.prototype.onUpdate = function() {
	var time = Date.now();
	var percent = 100*(time - this.startAt)/(this.stopAt - this.startAt);

//	console.log("p = " + percent);

	this.showPercent(percent);
}

/**
 * On tween update.
 * @method onUpdate
 */
TimerView.prototype.onComplete = function() {
	var time = Date.now();
	var percent = 100;
	this.showPercent(percent);
	this.tween = null;
}

/**
 * Show percent.
 * @method showPercent
 */
TimerView.prototype.showPercent = function(value) {
	if (value < 0)
		value = 0;

	if (value > 100)
		value = 100;

	this.canvas.clear();

	this.canvas.beginFill(0xc00000);
	this.canvas.drawCircle(0,0,10);
	this.canvas.endFill();

	this.canvas.beginFill(0xffffff);
	this.canvas.moveTo(0,0);
	for(var i = 0; i < 33; i++) {
		this.canvas.lineTo(
							10*Math.cos(i*value*2*Math.PI/(32*100) - Math.PI/2),
							10*Math.sin(i*value*2*Math.PI/(32*100) - Math.PI/2)
						);
	}

	this.canvas.lineTo(0,0);
	this.canvas.endFill();

}

module.exports = TimerView;
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],31:[function(require,module,exports){
var EventDispatcher = require("../utils/EventDispatcher");
var FunctionUtil = require("../utils/FunctionUtil");

var InitMessage = require("./messages/InitMessage");
var StateCompleteMessage = require("./messages/StateCompleteMessage");
var SeatInfoMessage = require("./messages/SeatInfoMessage");
var CommunityCardsMessage = require("./messages/CommunityCardsMessage");
var PocketCardsMessage = require("./messages/PocketCardsMessage");
var SeatClickMessage = require("./messages/SeatClickMessage");
var ShowDialogMessage = require("./messages/ShowDialogMessage");
var ButtonClickMessage = require("./messages/ButtonClickMessage");
var ButtonsMessage = require("./messages/ButtonsMessage");
var DelayMessage = require("./messages/DelayMessage");
var ClearMessage = require("./messages/ClearMessage");
var DealerButtonMessage = require("./messages/DealerButtonMessage");
var BetMessage = require("./messages/BetMessage");
var BetsToPotMessage = require("./messages/BetsToPotMessage");

var ActionMessage = require("./messages/ActionMessage");
var ChatMessage = require("./messages/ChatMessage");
var CheckboxMessage = require("./messages/CheckboxMessage");
var FadeTableMessage = require("./messages/FadeTableMessage");
var HandInfoMessage = require("./messages/HandInfoMessage");
var InterfaceStateMessage = require("./messages/InterfaceStateMessage");
var PayOutMessage = require("./messages/PayOutMessage");
var PotMessage = require("./messages/PotMessage");
var PresetButtonClickMessage = require("./messages/PresetButtonClickMessage");
var PresetButtonsMessage = require("./messages/PresetButtonsMessage");
var PreTournamentInfoMessage = require("./messages/PreTournamentInfoMessage");
var TableButtonClickMessage = require("./messages/TableButtonClickMessage");
var TableButtonsMessage = require("./messages/TableButtonsMessage");
var TableInfoMessage = require("./messages/TableInfoMessage");
var TestCaseRequestMessage = require("./messages/TestCaseRequestMessage");
var TimerMessage = require("./messages/TimerMessage");
var TournamentResultMessage = require("./messages/TournamentResultMessage");
var FoldCardsMessage = require("./messages/FoldCardsMessage");

/**
 * A protocol connection with an underlying connection.
 *
 * There are two ways to liten for connections, the first one and most straight
 * forward is the addMessageHandler, which registers a listener for a
 * particular network message. The first argument should be the message
 * class to listen for:
 *
 *     function onSeatInfoMessage(m) {
 *         // Check if the seat is active.
 *         m.isActive();
 *     }
 *
 *     protoConnection.addMessageHandler(SeatInfoMessage, onSeatInfoMessage);
 *
 * The second method is to listen to the ProtoConnection.MESSAGE dispatched
 * by the instance of the ProtoConnection. In this case, the listener
 * will be called for all messages received on the connection.
 *
 *     function onMessage(e) {
 *         var message=e.message;
 *
 *         // Is it a SeatInfoMessage?
 *         if (message instanceof SeatInfoMessage) {
 *             // ...
 *         }
 *     }
 *
 *     protoConnection.addMessageHandler(SeatInfoMessage, onMessage);
 *
 * The underlying connection should be an object that implements an "interface"
 * of a connection. It is not an interface per se, since JavaScript doesn't support
 * it. Anyway, the signature of this interface, is that the connection object
 * should have a `send` method which receives a object to be send. It should also
 * dispatch "message" events as messages are received, and "close" events if the
 * connection is closed by the remote party.
 *
 * @class ProtoConnection
 * @extends EventDispatcher
 * @constructor
 * @param connection The underlying connection object.
 */
function ProtoConnection(connection) {
	EventDispatcher.call(this);

	this.logMessages = false;
	this.messageDispatcher = new EventDispatcher();
	this.connection = connection;
	this.connection.addEventListener("message", this.onConnectionMessage, this);
	this.connection.addEventListener("close", this.onConnectionClose, this);
}

FunctionUtil.extend(ProtoConnection, EventDispatcher);

/**
 * Triggers if the remote party closes the underlying connection.
 * @event ProtoConnection.CLOSE
 */
ProtoConnection.CLOSE = "close";

/**
 * Triggers when we receive a message from the remote party.
 * @event ProtoConnection.MESSAGE
 * @param {Object} message The message that was received.
 */
ProtoConnection.MESSAGE = "message";

ProtoConnection.MESSAGE_TYPES = {};
ProtoConnection.MESSAGE_TYPES[InitMessage.TYPE] = InitMessage;
ProtoConnection.MESSAGE_TYPES[StateCompleteMessage.TYPE] = StateCompleteMessage;
ProtoConnection.MESSAGE_TYPES[SeatInfoMessage.TYPE] = SeatInfoMessage;
ProtoConnection.MESSAGE_TYPES[CommunityCardsMessage.TYPE] = CommunityCardsMessage;
ProtoConnection.MESSAGE_TYPES[PocketCardsMessage.TYPE] = PocketCardsMessage;
ProtoConnection.MESSAGE_TYPES[SeatClickMessage.TYPE] = SeatClickMessage;
ProtoConnection.MESSAGE_TYPES[ShowDialogMessage.TYPE] = ShowDialogMessage;
ProtoConnection.MESSAGE_TYPES[ButtonClickMessage.TYPE] = ButtonClickMessage;
ProtoConnection.MESSAGE_TYPES[ButtonsMessage.TYPE] = ButtonsMessage;
ProtoConnection.MESSAGE_TYPES[DelayMessage.TYPE] = DelayMessage;
ProtoConnection.MESSAGE_TYPES[ClearMessage.TYPE] = ClearMessage;
ProtoConnection.MESSAGE_TYPES[DealerButtonMessage.TYPE] = DealerButtonMessage;
ProtoConnection.MESSAGE_TYPES[BetMessage.TYPE] = BetMessage;
ProtoConnection.MESSAGE_TYPES[BetsToPotMessage.TYPE] = BetsToPotMessage;

ProtoConnection.MESSAGE_TYPES[ActionMessage.TYPE] = ActionMessage;
ProtoConnection.MESSAGE_TYPES[ChatMessage.TYPE] = ChatMessage;
ProtoConnection.MESSAGE_TYPES[CheckboxMessage.TYPE] = CheckboxMessage;
ProtoConnection.MESSAGE_TYPES[FadeTableMessage.TYPE] = FadeTableMessage;
ProtoConnection.MESSAGE_TYPES[HandInfoMessage.TYPE] = HandInfoMessage;
ProtoConnection.MESSAGE_TYPES[InterfaceStateMessage.TYPE] = InterfaceStateMessage;
ProtoConnection.MESSAGE_TYPES[PayOutMessage.TYPE] = PayOutMessage;
ProtoConnection.MESSAGE_TYPES[PotMessage.TYPE] = PotMessage;
ProtoConnection.MESSAGE_TYPES[PresetButtonClickMessage.TYPE] = PresetButtonClickMessage;
ProtoConnection.MESSAGE_TYPES[PresetButtonsMessage.TYPE] = PresetButtonsMessage;
ProtoConnection.MESSAGE_TYPES[PreTournamentInfoMessage.TYPE] = PreTournamentInfoMessage;
ProtoConnection.MESSAGE_TYPES[TableButtonClickMessage.TYPE] = TableButtonClickMessage;
ProtoConnection.MESSAGE_TYPES[TableButtonsMessage.TYPE] = TableButtonsMessage;
ProtoConnection.MESSAGE_TYPES[TableInfoMessage.TYPE] = TableInfoMessage;
ProtoConnection.MESSAGE_TYPES[TestCaseRequestMessage.TYPE] = TestCaseRequestMessage;
ProtoConnection.MESSAGE_TYPES[TimerMessage.TYPE] = TimerMessage;
ProtoConnection.MESSAGE_TYPES[TournamentResultMessage.TYPE] = TournamentResultMessage;
ProtoConnection.MESSAGE_TYPES[FoldCardsMessage.TYPE] = FoldCardsMessage;

/**
 * Add message handler.
 * @method addMessageHandler
 */
ProtoConnection.prototype.addMessageHandler = function(messageType, handler, scope) {
	if (messageType.hasOwnProperty("TYPE"))
		messageType = messageType.TYPE;

	this.messageDispatcher.on(messageType, handler, scope);
}

/**
 * Remove message handler.
 * @method removeMessageHandler
 */
ProtoConnection.prototype.removeMessageHandler = function(messageType, handler, scope) {
	if (messageType.hasOwnProperty("TYPE"))
		messageType = messageType.TYPE;

	this.messageDispatcher.off(messageType, handler, scope);
}

/**
 * Connection message.
 * @method onConnectionMessage
 * @private
 */
ProtoConnection.prototype.onConnectionMessage = function(ev) {
	var message = ev.message;
	var constructor;

	if (this.logMessages)
		console.log("==> " + JSON.stringify(message));

	for (type in ProtoConnection.MESSAGE_TYPES) {
		if (message.type == type)
			constructor = ProtoConnection.MESSAGE_TYPES[type]
	}

	if (!constructor) {
		console.warn("unknown message: " + message.type);
		return;
	}

	var o = new constructor();
	o.unserialize(message);
	o.type = message.type;

	this.messageDispatcher.trigger(o);

	this.trigger({
		type: ProtoConnection.MESSAGE,
		message: o
	});
}

/**
 * Connection close.
 * @method onConnectionClose
 * @private
 */
ProtoConnection.prototype.onConnectionClose = function(ev) {
	this.connection.off("message", this.onConnectionMessage, this);
	this.connection.off("close", this.onConnectionClose, this);
	this.connection = null;

	this.trigger(ProtoConnection.CLOSE);
}

/**
 * Send a message.
 * @method send
 */
ProtoConnection.prototype.send = function(message) {
	var serialized = message.serialize();

	for (type in ProtoConnection.MESSAGE_TYPES) {
		if (message instanceof ProtoConnection.MESSAGE_TYPES[type])
			serialized.type = type;
	}

	if (!serialized.type)
		throw new Error("Unknown message type for send, message=" + message.constructor.name);

	//	console.log("sending: "+serialized);

	this.connection.send(serialized);
}

/**
 * Should messages be logged to console?
 * @method setLogMessages
 */
ProtoConnection.prototype.setLogMessages = function(value) {
	this.logMessages = value;
}

/**
 * Close the underlying connection.
 * @method close
 */
ProtoConnection.prototype.close = function() {
	this.connection.close();
}

module.exports = ProtoConnection;
},{"../utils/EventDispatcher":70,"../utils/FunctionUtil":72,"./messages/ActionMessage":35,"./messages/BetMessage":36,"./messages/BetsToPotMessage":37,"./messages/ButtonClickMessage":38,"./messages/ButtonsMessage":39,"./messages/ChatMessage":40,"./messages/CheckboxMessage":41,"./messages/ClearMessage":42,"./messages/CommunityCardsMessage":43,"./messages/DealerButtonMessage":44,"./messages/DelayMessage":45,"./messages/FadeTableMessage":46,"./messages/FoldCardsMessage":47,"./messages/HandInfoMessage":48,"./messages/InitMessage":49,"./messages/InterfaceStateMessage":50,"./messages/PayOutMessage":51,"./messages/PocketCardsMessage":52,"./messages/PotMessage":53,"./messages/PreTournamentInfoMessage":54,"./messages/PresetButtonClickMessage":55,"./messages/PresetButtonsMessage":56,"./messages/SeatClickMessage":57,"./messages/SeatInfoMessage":58,"./messages/ShowDialogMessage":59,"./messages/StateCompleteMessage":60,"./messages/TableButtonClickMessage":61,"./messages/TableButtonsMessage":62,"./messages/TableInfoMessage":63,"./messages/TestCaseRequestMessage":64,"./messages/TimerMessage":65,"./messages/TournamentResultMessage":66}],32:[function(require,module,exports){
/**
 * Button data.
 * @class ButtonData
 */
function ButtonData(button, value) {
	this.button = button;
	this.value = value;
	/*	this.min = -1;
	this.max = -1;*/
}

ButtonData.RAISE = "raise";
ButtonData.FOLD = "fold";
ButtonData.BET = "bet";
ButtonData.SIT_OUT = "sitOut";
ButtonData.SIT_IN = "sitIn";
ButtonData.CALL = "call";
ButtonData.POST_BB = "postBB";
ButtonData.POST_SB = "postSB";
ButtonData.CANCEL = "cancel";
ButtonData.CHECK = "check";
ButtonData.SHOW = "show";
ButtonData.MUCK = "muck";
ButtonData.OK = "ok";
ButtonData.IM_BACK = "imBack";
ButtonData.LEAVE = "leave";
ButtonData.CHECK_FOLD = "checkFold";
ButtonData.CALL_ANY = "callAny";
ButtonData.RAISE_ANY = "raiseAny";
ButtonData.BUY_IN = "buyIn";
ButtonData.RE_BUY = "reBuy";
ButtonData.JOIN_TOURNAMENT = "joinTournament";
ButtonData.LEAVE_TOURNAMENT = "leaveTournament";

/**
 * Get button.
 * @method getButton
 */
ButtonData.prototype.getButton = function() {
	return this.button;
}

/**
 * Get button string for this button.
 * @method getButtonString
 */
ButtonData.prototype.getButtonString = function() {
	return ButtonData.getButtonStringForId(this.button);
}

/**
 * Get value.
 * @method getValue
 */
ButtonData.prototype.getValue = function() {
	return this.value;
}

/**
 * Get button string for id.
 * @method getButtonStringForId
 * @static
 */
ButtonData.getButtonStringForId = function(b) {
	switch (b) {
		case ButtonData.FOLD:
			return "FOLD";

		case ButtonData.CALL:
			return "CALL";

		case ButtonData.RAISE:
			return "RAISE TO";

		case ButtonData.BET:
			return "BET";

		case ButtonData.SIT_OUT:
			return "SIT OUT";

		case ButtonData.POST_BB:
			return "POST BB";

		case ButtonData.POST_SB:
			return "POST SB";

		case ButtonData.SIT_IN:
			return "SIT IN";

		case ButtonData.CANCEL:
			return "CANCEL";

		case ButtonData.CHECK:
			return "CHECK";

		case ButtonData.SHOW:
			return "SHOW";

		case ButtonData.MUCK:
			return "MUCK";

		case ButtonData.OK:
			return "OK";

		case ButtonData.IM_BACK:
			return "I'M BACK";

		case ButtonData.LEAVE:
			return "LEAVE";

		case ButtonData.CHECK_FOLD:
			return "CHECK / FOLD";

		case ButtonData.CALL_ANY:
			return "CALL ANY";

		case ButtonData.RAISE_ANY:
			return "RAISE ANY";

		case ButtonData.RE_BUY:
			return "RE-BUY";

		case ButtonData.BUY_IN:
			return "BUY IN";
	}

	return "";
}

/*ButtonData.prototype.getMin = function() {
	return this.min;
}*/

/*ButtonData.prototype.getMax = function() {
	return this.max;
}*/

ButtonData.prototype.toString = function() {
	return "<ButtonData button=" + this.button + ">";
}

module.exports = ButtonData;
},{}],33:[function(require,module,exports){
/**
 * Card data.
 * @class CardData
 */
function CardData(value) {
	this.value = value;
}

CardData.CARD_VALUE_STRINGS =
	["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

CardData.SUIT_STRINGS =
	["D", "C", "H", "S"];

CardData.HIDDEN = -1;

/**
 * Does this CardData represent a show card?
 * If not it should be rendered with its backside.
 * @method isShown
 */
CardData.prototype.isShown = function() {
	return this.value >= 0;
}

/**
 * Get card value.
 * This value represents the rank of the card, but starts on 0.
 * @method getCardValue
 */
CardData.prototype.getCardValue = function() {
	return this.value % 13;
}

/**
 * Get card value string.
 * @method getCardValueString
 */
CardData.prototype.getCardValueString = function() {
	return CardData.CARD_VALUE_STRINGS[this.value % 13];
}

/**
 * Get suit index.
 * @method getSuitIndex
 */
CardData.prototype.getSuitIndex = function() {
	return Math.floor(this.value / 13);
}

/**
 * Get suit string.
 * @method getSuitString
 */
CardData.prototype.getSuitString = function() {
	return CardData.SUIT_STRINGS[this.getSuitIndex()];
}

/**
 * Get color.
 * @method getColor
 */
CardData.prototype.getColor = function() {
	if (this.getSuitIndex() % 2 != 0)
		return "#000000";

	else
		return "#ff0000";
}

/**
 * To string.
 * @method toString
 */
CardData.prototype.toString = function() {
	if (this.value < 0)
		return "XX";

	//	return "<card " + this.getCardValueString() + this.getSuitString() + ">";
	return this.getCardValueString() + this.getSuitString();
}

/**
 * Get value of the card.
 * @method getValue
 */
CardData.prototype.getValue = function() {
	return this.value;
}

/**
 * Compare with respect to value. Not really useful except for debugging!
 * @method compareValue
 * @static
 */
CardData.compareValue = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getValue() > b.getValue())
		return 1;

	if (a.getValue() < b.getValue())
		return -1;

	return 0;
}

/**
 * Compare with respect to card value.
 * @method compareCardValue
 * @static
 */
CardData.compareCardValue = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getCardValue() > b.getCardValue())
		return 1;

	if (a.getCardValue() < b.getCardValue())
		return -1;

	return 0;
}

/**
 * Compare with respect to suit.
 * @method compareSuit
 * @static
 */
CardData.compareSuitIndex = function(a, b) {
	if (!(a instanceof CardData) || !(b instanceof CardData))
		throw new Error("Not comparing card data");

	if (a.getSuitIndex() > b.getSuitIndex())
		return 1;

	if (a.getSuitIndex() < b.getSuitIndex())
		return -1;

	return 0;
}

/**
 * Create a card data from a string.
 * @method fromString
 * @static
 */
CardData.fromString = function(s) {
	var i;

	var cardValue = -1;
	for (i = 0; i < CardData.CARD_VALUE_STRINGS.length; i++) {
		var cand = CardData.CARD_VALUE_STRINGS[i];

		if (s.substring(0, cand.length) == cand)
			cardValue = i;
	}

	if (cardValue < 0)
		throw new Error("Not a valid card string: " + s);

	var suitString = s.substring(CardData.CARD_VALUE_STRINGS[cardValue].length);

	var suitIndex = -1;
	for (i = 0; i < CardData.SUIT_STRINGS.length; i++) {
		var cand = CardData.SUIT_STRINGS[i];

		if (suitString == cand)
			suitIndex = i;
	}

	if (suitIndex < 0)
		throw new Error("Not a valid card string: " + s);

	return new CardData(suitIndex * 13 + cardValue);
}

module.exports = CardData;
},{}],34:[function(require,module,exports){
/**
 * Button data.
 * @class ButtonData
 */
function PresetButtonData(button, value) {
	this.button = button;
	this.value = value;
}

/**
 * Get button.
 * @method getButton
 */
PresetButtonData.prototype.getButton = function() {
	return this.button;
}

/**
 * Get value.
 * @method getValue
 */
PresetButtonData.prototype.getValue = function() {
	return this.value;
}

module.exports = PresetButtonData;
},{}],35:[function(require,module,exports){
/**
 * Received when player made an action.
 * @class ActionMessage
 */
function ActionMessage(seatIndex, action) {
	this.seatIndex = seatIndex;
	this.action = action;
}

ActionMessage.TYPE = "action";

ActionMessage.FOLD = "fold";
ActionMessage.CALL = "call";
ActionMessage.RAISE = "raise";
ActionMessage.CHECK = "check";
ActionMessage.BET = "bet";
ActionMessage.MUCK = "muck";
ActionMessage.ANTE = "ante";

/**
 * Seat index.
 * @method getSeatIndex
 */
ActionMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getAction
 */
ActionMessage.prototype.getAction = function() {
	return this.action;
}

/**
 * Un-serialize.
 * @method unserialize
 */
ActionMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
	this.action = data.action;
}

/**
 * Serialize message.
 * @method serialize
 */
ActionMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
		action: this.action
	};
}

module.exports = ActionMessage;
},{}],36:[function(require,module,exports){
/**
 * Received when player has placed a bet.
 * @class BetMessage
 */
function BetMessage(seatIndex, value) {
	this.seatIndex = seatIndex;
	this.value = value;
}

BetMessage.TYPE = "bet";

/**
 * Getter.
 * @method getSeatIndex
 */
BetMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getValue
 */
BetMessage.prototype.getValue = function() {
	return this.value;
}

/**
 * Un-serialize.
 * @method unserialize
 */
BetMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
	this.value = data.value;
}

/**
 * Serialize message.
 * @method serialize
 */
BetMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
		value: this.value
	};
}

module.exports = BetMessage;
},{}],37:[function(require,module,exports){
/**
 * Received when bets should be placed in pot.
 * @class BetsToPotMessage
 */
function BetsToPotMessage() {
}

BetsToPotMessage.TYPE = "betsToPot";

/**
 * Un-serialize.
 * @method unserialize
 */
BetsToPotMessage.prototype.unserialize = function(data) {
}

/**
 * Serialize message.
 * @method serialize
 */
BetsToPotMessage.prototype.serialize = function() {
	return {};
}

module.exports = BetsToPotMessage;
},{}],38:[function(require,module,exports){
/**
 * Sent when the user clicks a button, either in a dialog or
 * for a game action.
 * @class ButtonClickMessage
 */
function ButtonClickMessage(button, value) {
	this.button = button;
	this.value = value;

//	console.log("Creating button click message, value=" + value);
}

ButtonClickMessage.TYPE = "buttonClick";

/**
 * The the button that was pressed.
 * @method getButton
 */
ButtonClickMessage.prototype.getButton = function() {
	return this.button;
}

/**
 * Setter.
 * @method getValue
 */
ButtonClickMessage.prototype.getValue = function() {
	return this.value;
}

/**
 * Un-serialize.
 * @method unserialize
 */
ButtonClickMessage.prototype.unserialize = function(data) {
	this.button = data.button;
	this.value = data.value;
}

/**
 * Serialize message.
 * @method serialize
 */
ButtonClickMessage.prototype.serialize = function() {
	return {
		button: this.button,
		value: this.value
	};
}

module.exports = ButtonClickMessage;
},{}],39:[function(require,module,exports){
var ButtonData = require("../data/ButtonData");

/**
 * Message sent when the client should show game action buttons,
 * FOLD, RAISE etc.
 * @class ButtonsMessage
 */
function ButtonsMessage() {
	this.buttons = [];
	this.sliderButtonIndex = 0;
	this.min = -1;
	this.max = -1;
}

ButtonsMessage.TYPE = "buttons";

/**
 * Get an array of ButtonData indicating which buttons to show.
 * @method getButtons
 */
ButtonsMessage.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Add a button to be sent.
 * @method addButton
 */
ButtonsMessage.prototype.addButton = function(button) {
	this.buttons.push(button);
}

/**
 * Un-serialize.
 * @method unserialize.
 */
ButtonsMessage.prototype.unserialize = function(data) {
	this.buttons = [];

	for (var i = 0; i < data.buttons.length; i++) {
		var button = data.buttons[i];
		var buttonData = new ButtonData(button.button, button.value);
		this.addButton(buttonData);
	}
	this.sliderButtonIndex = data.sliderButtonIndex;
	this.min = data.min;
	this.max = data.max;
}

/**
 * Serialize message.
 * @method serialize
 */
ButtonsMessage.prototype.serialize = function() {
	var buttons = [];

	for (var i = 0; i < this.buttons.length; i++) {
		var button = {};
		button.button = this.buttons[i].getButton();
		button.value = this.buttons[i].getValue();
		buttons.push(button);
	}

	return {
		buttons: buttons,
		sliderButtonIndex: this.sliderButtonIndex,
		min: this.min,
		max: this.max
	};
}

module.exports = ButtonsMessage;
},{"../data/ButtonData":32}],40:[function(require,module,exports){
/**
 * Received when something has occurred in the chat.
 * @class ChatMessage
 */
function ChatMessage(user, text) {
	this.user = user;
	this.text = text;
}

ChatMessage.TYPE = "chat";

/**
 * Get text.
 * @method getText
 */
ChatMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Get user.
 * @method getUser
 */
ChatMessage.prototype.getUser = function() {
	return this.user;
}

/**
 * Un-serialize.
 * @method unserialize
 */
ChatMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.user = data.user;
}

/**
 * Serialize message.
 * @method serialize
 */
ChatMessage.prototype.serialize = function() {
	return {
		text: this.text,
		user: this.user
	};
}

module.exports = ChatMessage;
},{}],41:[function(require,module,exports){
/**
 * Sent when player has checked a checkbox.
 * @class CheckboxMessage
 */
function CheckboxMessage(id, checked) {
	this.id = id;
	this.checked = checked;
}

CheckboxMessage.TYPE = "checkbox";

CheckboxMessage.AUTO_POST_BLINDS = "autoPostBlinds";
CheckboxMessage.AUTO_MUCK_LOSING = "autoMuckLosing";
CheckboxMessage.SITOUT_NEXT = "sitoutNext";

/**
 * Id of checkbox.
 * @method getId
 */
CheckboxMessage.prototype.getId = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getValue
 */
CheckboxMessage.prototype.getChecked = function() {
	return this.checked;
}

/**
 * Un-serialize.
 * @method unserialize
 */
CheckboxMessage.prototype.unserialize = function(data) {
	this.id = data.id;
	this.checked = data.checked;
}

/**
 * Serialize message.
 * @method serialize
 */
CheckboxMessage.prototype.serialize = function() {
	return {
		id: this.id,
		checked: this.checked
	};
}

module.exports = CheckboxMessage;
},{}],42:[function(require,module,exports){
/**
 * @class ClearMessage
 */
function ClearMessage(components) {
	if (!components)
		components = [];

	this.components = components;
}

ClearMessage.TYPE = "clear";

ClearMessage.CARDS = "cards";
ClearMessage.BETS = "bets";
ClearMessage.POT = "pot";
ClearMessage.CHAT = "chat";

/**
 * Getter.
 * @method getComponents
 */
ClearMessage.prototype.getComponents = function() {
	return this.components;
}

/**
 * Un-serialize.
 * @method unserialize
 */
ClearMessage.prototype.unserialize = function(data) {
	this.components = data.components;
}

/**
 * Serialize message.
 * @method serialize
 */
ClearMessage.prototype.serialize = function() {
	return {
		components: this.components
	};
}

module.exports = ClearMessage;
},{}],43:[function(require,module,exports){
var CardData = require("../data/CardData");

/**
 * Show community cards.
 * @class CommunityCardsMessage
 */
function CommunityCardsMessage() {
	this.animate = false;
	this.cards = [];
	this.firstIndex = 0;
}

CommunityCardsMessage.TYPE = "communityCards";

/**
 * Animation or not?
 * @method setAnimate
 */
CommunityCardsMessage.prototype.setAnimate = function(value) {
	return this.animate = value;
}

/**
 * Set first index.
 * @method setFirstIndex
 */
CommunityCardsMessage.prototype.setFirstIndex = function(value) {
	return this.firstIndex = value;
}

/**
 * Add card.
 * @method addCard
 */
CommunityCardsMessage.prototype.addCard = function(c) {
	this.cards.push(c);
}

/**
 * Get card data.
 * @method getCards
 */
CommunityCardsMessage.prototype.getCards = function() {
	return this.cards;
}

/**
 * Get the index of the first card to be shown in the sequence.
 * @method getFirstIndex
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
	this.cards = [];

	for (i = 0; i < data.cards.length; i++)
		this.cards.push(new CardData(data.cards[i]));
}

/**
 * Serialize message.
 * @method serialize
 */
CommunityCardsMessage.prototype.serialize = function() {
	var cards = [];

	for (i = 0; i < this.cards.length; i++)
		cards.push(this.cards[i].getValue());

	return {
		animate: this.seatIndex,
		firstIndex: this.firstIndex,
		cards: cards
	};
}

module.exports = CommunityCardsMessage;
},{"../data/CardData":33}],44:[function(require,module,exports){
/**
 * @class DealerButtonMessage
 */
function DealerButtonMessage(seatIndex, animate) {
	this.seatIndex = seatIndex;
	this.animate = animate;
}

DealerButtonMessage.TYPE = "dealerButton";

/**
 * Getter.
 * @method getSeatIndex
 */
DealerButtonMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getAnimate
 */
DealerButtonMessage.prototype.getAnimate = function() {
	return this.animate;
}

/**
 * Un-serialize.
 * @method unserialize
 */
DealerButtonMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
	this.animate = data.animate;
}

/**
 * Serialize message.
 * @method serialize
 */
DealerButtonMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
		animate: this.animate
	};
}

module.exports = DealerButtonMessage;
},{}],45:[function(require,module,exports){
/**
 * @class DelayMessage
 */
function DelayMessage(delay) {
	this.delay = delay;
}

DelayMessage.TYPE = "delay";

/**
 * Getter.
 * @method getDelay
 */
DelayMessage.prototype.getDelay = function() {
	return this.delay;
}

/**
 * Un-serialize.
 * @method unserialize
 */
DelayMessage.prototype.unserialize = function(data) {
	this.delay = data.delay;
}

/**
 * Serialize message.
 * @method serialize
 */
DelayMessage.prototype.serialize = function() {
	return {
		delay: this.delay
	};
}

module.exports = DelayMessage;
},{}],46:[function(require,module,exports){
/**
 * Received table should fade.
 * @class FadeTableMessage
 */
function FadeTableMessage(visible, direction) {
	this.visible = visible;
	this.direction = direction;
}

FadeTableMessage.TYPE = "fadeTable";

/**
 * Getter.
 * @method getVisible
 */
FadeTableMessage.prototype.getVisible = function() {
	return this.visible;
}

/**
 * Getter.
 * @method getDirection
 */
FadeTableMessage.prototype.getDirection = function() {
	return this.direction;
}

/**
 * Un-serialize.
 * @method unserialize
 */
FadeTableMessage.prototype.unserialize = function(data) {
	this.visible = data.visible;
	this.direction = data.direction;
}

/**
 * Serialize message.
 * @method serialize
 */
FadeTableMessage.prototype.serialize = function() {
	return {
		visible: this.visible,
		direction: this.direction
	};
}

module.exports = FadeTableMessage;
},{}],47:[function(require,module,exports){
/**
 * Received player has folded.
 * @class FoldCardsMessage
 */
function FoldCardsMessage(seatIndex) {
	this.seatIndex = seatIndex;
}

FoldCardsMessage.TYPE = "foldCards";

/**
 * Getter.
 * @method getSeatIndex
 */
FoldCardsMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Un-serialize.
 * @method unserialize
 */
FoldCardsMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
}

/**
 * Serialize message.
 * @method serialize
 */
FoldCardsMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex
	};
}

module.exports = FoldCardsMessage;
},{}],48:[function(require,module,exports){
/**
 * Received when ?.
 * @class HandInfoMessage
 */
function HandInfoMessage(text, countdown) {
	this.text = text;
	this.countdown = countdown;
}

HandInfoMessage.TYPE = "handInfo";

/**
 * Getter.
 * @method getSeatIndex
 */
HandInfoMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Getter.
 * @method getValue
 */
HandInfoMessage.prototype.getCountdown = function() {
	return this.countdown;
}

/**
 * Un-serialize.
 * @method unserialize
 */
HandInfoMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.countdown = data.countdown;
}

/**
 * Serialize message.
 * @method serialize
 */
HandInfoMessage.prototype.serialize = function() {
	return {
		text: this.text,
		countdown: this.countdown
	};
}

module.exports = HandInfoMessage;
},{}],49:[function(require,module,exports){
/**
 * @class InitMessage
 */
function InitMessage(token) {
	this.token = token;
	this.tableId = null;
	this.viewCase = null;
}

InitMessage.TYPE = "init";

/**
 * get token.
 * @method getToken
 */
InitMessage.prototype.getToken = function() {
	return this.token;
}

/**
 * Set table id.
 * @method setTableId
 */
InitMessage.prototype.setTableId = function(id) {
	this.tableId = id;
}

/**
 * Get table id.
 * @method getTableId
 */
InitMessage.prototype.getTableId = function() {
	return this.tableId;
}

/**
 * Set view case.
 * @method setTableId
 */
InitMessage.prototype.setViewCase = function(viewCase) {
	this.viewCase = viewCase;
}

/**
 * Get view case.
 * @method getTableId
 */
InitMessage.prototype.getViewCase = function() {
	return this.viewCase;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
InitMessage.prototype.unserialize = function(data) {
	this.token = data.token;
	this.tableId = data.tableId;
	this.viewCase = data.viewCase;
}

/**
 * Serialize message.
 * @method serialize
 */
InitMessage.prototype.serialize = function() {
	return {
		token: this.token,
		tableId: this.tableId,
		viewCase: this.viewCase
	};
}

module.exports = InitMessage;
},{}],50:[function(require,module,exports){
/**
 * Received when interface state has changed.
 * @class InterfaceStateMessage
 */
function InterfaceStateMessage(visibleButtons) {
	
	this.visibleButtons = visibleButtons == null ? new Array() : visibleButtons;
}

InterfaceStateMessage.TYPE = "interfaceState";

/**
 * Getter.
 * @method getVisibleButtons
 */
InterfaceStateMessage.prototype.getVisibleButtons = function() {
	return this.seatIndex;
}

/**
 * Un-serialize.
 * @method unserialize
 */
InterfaceStateMessage.prototype.unserialize = function(data) {
	this.visibleButtons = data.visibleButtons;
}

/**
 * Serialize message.
 * @method serialize
 */
InterfaceStateMessage.prototype.serialize = function() {
	return {
		visibleButtons: this.visibleButtons
	};
}

module.exports = InterfaceStateMessage;
},{}],51:[function(require,module,exports){
/**
 * Received when player has placed a bet.
 * @class PayOutMessage
 */
function PayOutMessage() {
	this.values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

PayOutMessage.TYPE = "payOut";

/**
 * Getter.
 * @method getValues
 */
PayOutMessage.prototype.getValues = function() {
	return this.values;
}

/**
 * Set value at.
 * @method setValueAt
 */
PayOutMessage.prototype.setValueAt = function(seatIndex, value) {
	this.values[seatIndex] = value;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PayOutMessage.prototype.unserialize = function(data) {
	for (var i = 0; i < data.values.length; i++) {
		this.values[i] = data.values[i];
	}
}

/**
 * Serialize message.
 * @method serialize
 */
PayOutMessage.prototype.serialize = function() {
	return {
		values: this.values
	};
}

module.exports = PayOutMessage;
},{}],52:[function(require,module,exports){
var CardData = require("../data/CardData");

/**
 * Show pocket cards.
 * @class PocketCardsMessage
 */
function PocketCardsMessage(seatIndex) {
	this.animate = false;
	this.cards = [];
	this.firstIndex = 0;
	this.seatIndex = seatIndex;
}

PocketCardsMessage.TYPE = "pocketCards";

/**
 * Animation?
 * @method setAnimate
 */
PocketCardsMessage.prototype.setAnimate = function(value) {
	this.animate = value;
}

/**
 * Set first index.
 * @method setFirstIndex
 */
PocketCardsMessage.prototype.setFirstIndex = function(index) {
	this.firstIndex = index;
}

/**
 * Get array of CardData.
 * @method getCards
 */
PocketCardsMessage.prototype.getCards = function() {
	return this.cards;
}

/**
 * Add a card.
 * @method addCard
 */
PocketCardsMessage.prototype.addCard = function(c) {
	this.cards.push(c);
}

/**
 * Get first index.
 * @method getFirstIndex
 */
PocketCardsMessage.prototype.getFirstIndex = function() {
	return this.firstIndex;
}

/**
 * Get seat index.
 * @method getSeatIndex
 */
PocketCardsMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
PocketCardsMessage.prototype.unserialize = function(data) {
	var i;

	this.animate = data.animate;
	this.firstIndex = parseInt(data.firstIndex);
	this.cards = [];
	this.seatIndex = data.seatIndex;

	for (i = 0; i < data.cards.length; i++)
		this.cards.push(new CardData(data.cards[i]));
}

/**
 * Serialize message.
 * @method serialize
 */
PocketCardsMessage.prototype.serialize = function() {
	var cards = [];

	for (i = 0; i < this.cards.length; i++)
		cards.push(this.cards[i].getValue());

	return {
		animate: this.animate,
		firstIndex: this.firstIndex,
		cards: cards,
		seatIndex: this.seatIndex
	};
}

module.exports = PocketCardsMessage;
},{"../data/CardData":33}],53:[function(require,module,exports){
/**
 * Received when player pot has changed.
 * @class PotMessage
 */
function PotMessage(values) {
	this.values = values == null ? new Array() : values;
}

PotMessage.TYPE = "pot";

/**
 * Getter.
 * @method getValues
 */
PotMessage.prototype.getValues = function() {
	return this.values;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PotMessage.prototype.unserialize = function(data) {
	this.values = data.values;
}

/**
 * Serialize message.
 * @method serialize
 */
PotMessage.prototype.serialize = function() {
	return {
		values: this.values
	};
}

module.exports = PotMessage;
},{}],54:[function(require,module,exports){
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
	if(this.countdown < 0)
		this.countdown = 0;
	
	return {
		text: this.text,
		countdown: this.countdown
	};
}

module.exports = PreTournamentInfoMessage;
},{}],55:[function(require,module,exports){
/**
 * Received when ?.
 * @class PresetButtonClickMessage
 */
function PresetButtonClickMessage(button) {
	this.button = button;
	this.value = null;
}

PresetButtonClickMessage.TYPE = "presetButtonClick";

/**
 * Getter.
 * @method getButton
 */
PresetButtonClickMessage.prototype.getButton = function() {
	return this.button;
}

/**
 * Getter.
 * @method getValue
 */
PresetButtonClickMessage.prototype.getValue = function() {
	return this.value;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PresetButtonClickMessage.prototype.unserialize = function(data) {
	this.button = data.button;
	this.value = data.value;
}

/**
 * Serialize message.
 * @method serialize
 */
PresetButtonClickMessage.prototype.serialize = function() {
	return {
		button: this.button,
		value: this.value
	};
}

module.exports = PresetButtonClickMessage;
},{}],56:[function(require,module,exports){
var PresetButtonData = require("../data/PresetButtonData");

/**
 * Received when ?.
 * @class PresetButtonsMessage
 */
function PresetButtonsMessage() {
	this.buttons = new Array(7);
	this.current = null;
}

PresetButtonsMessage.TYPE = "presetButtons";

/**
 * Getter.
 * @method getButtons
 */
PresetButtonsMessage.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Getter.
 * @method getCurrent
 */
PresetButtonsMessage.prototype.getCurrent = function() {
	return this.current;
}


/**
 * Un-serialize.
 * @method unserialize
 */
PresetButtonsMessage.prototype.unserialize = function(data) {
	this.current = data.current;

	this.buttons = new Array();

	for(var i = 0; i < data.buttons.length; i++) {
		var button = data.buttons[i];
		var buttonData = null;

		if(button != null) {
			buttonData = new PresetButtonData();

			buttonData.button = button.button;
			buttonData.value = button.value;
		}

		this.buttons.push(buttonData);
	}
}

/**
 * Serialize message.
 * @method serialize
 */
PresetButtonsMessage.prototype.serialize = function() {
	var object = {
		buttons: [],
		current: this.current
	};

	for(var i = 0; i < this.buttons.length; i++) {
		var buttonData = this.buttons[i];
		if(buttonData != null)
			object.buttons.push({
				button: buttonData.button,
				value: buttonData.value
			});

		else
			object.buttons.push(null);
	}

	return object;
}

module.exports = PresetButtonsMessage;
},{"../data/PresetButtonData":34}],57:[function(require,module,exports){
/**
 * Message indicating that the user has clicked a seat.
 * @class SeatClickMessage
 */
function SeatClickMessage(seatIndex) {
	this.seatIndex=seatIndex;
}

SeatClickMessage.TYPE = "seatClick";

/**
 * Getter.
 * @method getSeatIndex
 */
SeatClickMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
SeatClickMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
}

/**
 * Serialize message.
 * @method serialize
 */
SeatClickMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
	};
}

module.exports = SeatClickMessage;
},{}],58:[function(require,module,exports){
/**
 * Show username and chips on seat.
 * @class SeatInfoMessage
 */
function SeatInfoMessage(seatIndex) {
	this.seatIndex = seatIndex;
	this.active = true;
	this.sitout = false;
	this.name = "";
	this.chips = "";
}

SeatInfoMessage.TYPE = "seatInfo";

/**
 * Getter.
 * @method getSeatIndex
 */
SeatInfoMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getName
 */
SeatInfoMessage.prototype.getName = function() {
	return this.name;
}

/**
 * Getter.
 * @method getChips
 */
SeatInfoMessage.prototype.getChips = function() {
	return this.chips;
}

/**
 * Getter.
 * @method isSitout
 */
SeatInfoMessage.prototype.isSitout = function() {
	return this.sitout;
}

/**
 * Getter.
 * @method isActive
 */
SeatInfoMessage.prototype.isActive = function() {
	return this.active;
}

/**
 * Setter.
 * @method setActive
 */
SeatInfoMessage.prototype.setActive = function(v) {
	this.active = v;
}

/**
 * Set sitout.
 * @method setSitout
 */
SeatInfoMessage.prototype.setSitout = function(v) {
	this.sitout = v;
}

/**
 * Setter.
 * @method setName
 */
SeatInfoMessage.prototype.setName = function(v) {
	this.name = v;
}

/**
 * Setter.
 * @method setChips
 */
SeatInfoMessage.prototype.setChips = function(v) {
	this.chips = v;
}

/**
 * Un-serialize.
 * @method unserialize
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
},{}],59:[function(require,module,exports){
/**
 * Show dialog, for e.g. buy in.
 * @class ShowDialogMessage
 */
function ShowDialogMessage() {
	this.text = "";
	this.buttons = [];
	this.defaultValue = null;
}

ShowDialogMessage.TYPE = "showDialog";

/**
 * Add a button to the dialog.
 * @method addButton
 */
ShowDialogMessage.prototype.addButton = function(button) {
	this.buttons.push(button);
}

/**
 * Get text of the dialog.
 * @method getText
 */
ShowDialogMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Get array of ButtonData to be shown in the dialog.
 * @method getButtons
 */
ShowDialogMessage.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Get default value.
 * @method getButtons
 */
ShowDialogMessage.prototype.getDefaultValue = function() {
	return this.defaultValue;
}

/**
 * Set default value.
 * @method setDefaultValue
 */
ShowDialogMessage.prototype.setDefaultValue = function(v) {
	this.defaultValue=v;
}

/**
 * Set text in the dialog.
 * @method setText
 */
ShowDialogMessage.prototype.setText = function(text) {
	this.text = text;
}

/**
 * Un-serialize.
 * @method unserialize.
 */
ShowDialogMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.buttons = data.buttons;
	this.defaultValue = data.defaultValue;
}

/**
 * Serialize message.
 * @method serialize
 */
ShowDialogMessage.prototype.serialize = function() {
	return {
		text: this.text,
		buttons: this.buttons,
		defaultValue: this.defaultValue
	};
}

module.exports = ShowDialogMessage;
},{}],60:[function(require,module,exports){
/**
 * @class StateCompleteMessage
 */
function StateCompleteMessage() {}

StateCompleteMessage.TYPE = "stateComplete";

/**
 * Un-serialize.
 * @method unserialize.
 */
StateCompleteMessage.prototype.unserialize = function(data) {}

/**
 * Serialize message.
 * @method serialize
 */
StateCompleteMessage.prototype.serialize = function() {
	return {};
}

module.exports = StateCompleteMessage;
},{}],61:[function(require,module,exports){
/**
 * Received when table button clicked.
 * @class TableButtonClickMessage
 */
function TableButtonClickMessage(tableIndex) {
	this.tableIndex = tableIndex;
}

TableButtonClickMessage.TYPE = "tableButtonClick";

/**
 * Getter.
 * @method getTableIndex
 */
TableButtonClickMessage.prototype.getTableIndex = function() {
	return this.tableIndex;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TableButtonClickMessage.prototype.unserialize = function(data) {
	this.tableIndex = data.tableIndex;
}

/**
 * Serialize message.
 * @method serialize
 */
TableButtonClickMessage.prototype.serialize = function() {
	return {
		tableIndex: this.tableIndex
	};
}

module.exports = TableButtonClickMessage;
},{}],62:[function(require,module,exports){
/**
 * Received when ?.
 * @class TableButtonsMessage
 */
function TableButtonsMessage() {
	this.enabled = new Array();
	this.currentIndex = -1;
	this.playerIndex = -1;
	this.infoLink = "";
}

TableButtonsMessage.TYPE = "tableButtons";

/**
 * Getter.
 * @method getEnabled
 */
TableButtonsMessage.prototype.getEnabled = function() {
	return this.enabled;
}

/**
 * Getter.
 * @method getCurrentIndex
 */
TableButtonsMessage.prototype.getCurrentIndex = function() {
	return this.currentIndex;
}

/**
 * Getter.
 * @method getPlayerIndex
 */
TableButtonsMessage.prototype.getPlayerIndex = function() {
	return this.playerIndex;
}

/**
 * Getter.
 * @method getInfoLink
 */
TableButtonsMessage.prototype.getInfoLink = function() {
	return this.infoLink;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TableButtonsMessage.prototype.unserialize = function(data) {
	this.playerIndex = data.playerIndex;
	this.currentIndex = data.currentIndex;
	this.infoLink = data.infoLink;

	this.enabled = new Array();
	for(var i = 0; i < data.enabled.length; i++)
		this.enabled.push(data.enabled[i]);
}

/**
 * Serialize message.
 * @method serialize
 */
TableButtonsMessage.prototype.serialize = function() {
	var object = {
		currentIndex: this.currentIndex,
		playerIndex: this.playerIndex,
		enabled: [],
		infoLink: this.infoLink
	};

	for(var i = 0; i < this.enabled.length; i++)
		object.enabled.push(this.enabled[i]);

	return object;
}

module.exports = TableButtonsMessage;
},{}],63:[function(require,module,exports){
/**
 * Received when ?.
 * @class TableInfoMessage
 */
function TableInfoMessage(text, countdown) {
	this.countdown = countdown;
	this.text = text;
	this.showJoinButton = false;
	this.showLeaveButton = false;
	this.infoLink = null;
	this.infoLinkText = null;
}

TableInfoMessage.TYPE = "tableInfo";

/**
 * Getter.
 * @method getCountdown
 */
TableInfoMessage.prototype.getCountdown = function() {
	return this.countdown;
}

/**
 * Getter.
 * @method getText
 */
TableInfoMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Getter.
 * @method getShowJoinButton
 */
TableInfoMessage.prototype.getShowJoinButton = function() {
	return this.showJoinButton;
}

/**
 * Getter.
 * @method getShowLeaveButton
 */
TableInfoMessage.prototype.getShowLeaveButton = function() {
	return this.showLeaveButton;
}

/**
 * Getter.
 * @method getInfoLink
 */
TableInfoMessage.prototype.getInfoLink = function() {
	return this.infoLink;
}

/**
 * Getter.
 * @method getInfoLinkText
 */
TableInfoMessage.prototype.getInfoLinkText = function() {
	return this.infoLinkText;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TableInfoMessage.prototype.unserialize = function(data) {
	if(data.text != null)
		this.text = data.text;

	if(data.countdown != null)
		this.countdown = data.countdown;

	if(data.showJoinButton != null)
		this.showJoinButton = data.showJoinButton;

	if(data.showLeaveButton != null)
		this.showLeaveButton = data.showLeaveButton;

	if(data.infoLink != null)
		this.infoLink = data.infoLink;

	if(data.infoLinkText != null)
		this.infoLinkText = data.infoLinkText;
}

/**
 * Serialize message.
 * @method serialize
 */
TableInfoMessage.prototype.serialize = function() {
	return {
		text: this.text,
		countdown: this.countdown,
		showJoinButton: this.showJoinButton,
		showLeaveButton: this.showLeaveButton,
		infoLink: this.infoLink,
		infoLinkText: this.infoLinkText
	};
}

module.exports = TableInfoMessage;
},{}],64:[function(require,module,exports){
/**
 * Received when ?.
 * @class TestCaseRequestMessage
 */
function TestCaseRequestMessage(testCase) {
	this.testCase = testCase;
}

TestCaseRequestMessage.TYPE = "testCaseRequest";

/**
 * Getter.
 * @method getTestCase
 */
TestCaseRequestMessage.prototype.getTestCase = function() {
	return this.testCase;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TestCaseRequestMessage.prototype.unserialize = function(data) {
	this.testCase = data.testCase;
}

/**
 * Serialize message.
 * @method serialize
 */
TestCaseRequestMessage.prototype.serialize = function() {
	return {
		testCase: this.testCase
	};
}

module.exports = TestCaseRequestMessage;
},{}],65:[function(require,module,exports){
/**
 * Received when ?.
 * @class TimerMessage
 */
function TimerMessage() {
	this.seatIndex = -1;
	this.totalTime = -1;
	this.timeLeft = -1;
}

TimerMessage.TYPE = "timer";

/**
 * Getter.
 * @method getSeatIndex
 */
TimerMessage.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Getter.
 * @method getTotalTime
 */
TimerMessage.prototype.getTotalTime = function() {
	return this.totalTime;
}

/**
 * Getter.
 * @method getTimeLeft
 */
TimerMessage.prototype.getTimeLeft = function() {
	return this.timeLeft;
}

/**
 * Setter.
 * @method setSeatIndex
 */
TimerMessage.prototype.setSeatIndex = function(value) {
	this.seatIndex = value;
}

/**
 * Setter.
 * @method setTotalTime
 */
TimerMessage.prototype.setTotalTime = function(value) {
	this.totalTime = value;
}

/**
 * Setter.
 * @method setTimeLeft
 */
TimerMessage.prototype.setTimeLeft = function(value) {
	this.timeLeft = value;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TimerMessage.prototype.unserialize = function(data) {
	this.seatIndex = data.seatIndex;
	this.totalTime = data.totalTime;
	this.timeLeft = data.timeLeft;
}

/**
 * Serialize message.
 * @method serialize
 */
TimerMessage.prototype.serialize = function() {
	return {
		seatIndex: this.seatIndex,
		totalTime: this.totalTime,
		timeLeft: this.timeLeft
	};
}

module.exports = TimerMessage;
},{}],66:[function(require,module,exports){
/**
 * Received when tournament result message is dispatched.
 * @class TournamentResultMessage
 */
function TournamentResultMessage(text, rightColumnText) {
	this.text = text;
	this.rightColumnText = rightColumnText;
}

TournamentResultMessage.TYPE = "tournamentResult";

/**
 * Getter.
 * @method getText
 */
TournamentResultMessage.prototype.getText = function() {
	return this.text;
}

/**
 * Getter.
 * @method getRightColumnText
 */
TournamentResultMessage.prototype.getRightColumnText = function() {
	return this.rightColumnText;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TournamentResultMessage.prototype.unserialize = function(data) {
	this.text = data.text;
	this.rightColumnText = data.rightColumnText;
}

/**
 * Serialize message.
 * @method serialize
 */
TournamentResultMessage.prototype.serialize = function() {
	return {
		text: this.text,
		rightColumnText: this.rightColumnText
	};
}

module.exports = TournamentResultMessage;
},{}],67:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * Button.
 * @class Button
 */
function Button(content) {
	PIXI.DisplayObjectContainer.call(this);

	if (content)
		this.addChild(content);

	this.interactive = true;
	this.buttonMode = true;

	this.mouseover = this.onMouseover.bind(this);
	this.mouseout = this.onMouseout.bind(this);
	this.mousedown = this.onMousedown.bind(this);
	this.mouseup = this.onMouseup.bind(this);
	this.click = this.onClick.bind(this);

	this.colorMatrixFilter = new PIXI.ColorMatrixFilter();
	this.colorMatrixFilter.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

	this.filters = [this.colorMatrixFilter];
}

FunctionUtil.extend(Button, PIXI.DisplayObjectContainer);
EventDispatcher.init(Button);

Button.LIGHT_MATRIX = [1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1];
Button.DARK_MATRIX = [.75, 0, 0, 0, 0, .75, 0, 0, 0, 0, .75, 0, 0, 0, 0, 1];
Button.DEFAULT_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

Button.CLICK = "click";

/**
 * Mouse over.
 * @method onMouseover
 * @private
 */
Button.prototype.onMouseover = function() {
	this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
}

/**
 * Mouse out.
 * @method onMouseout
 * @private
 */
Button.prototype.onMouseout = function() {
	this.colorMatrixFilter.matrix = Button.DEFAULT_MATRIX;
}

/**
 * Mouse down.
 * @method onMousedown
 * @private
 */
Button.prototype.onMousedown = function() {
	this.colorMatrixFilter.matrix = Button.DARK_MATRIX;
}

/**
 * Mouse up.
 * @method onMouseup
 * @private
 */
Button.prototype.onMouseup = function() {
	this.colorMatrixFilter.matrix = Button.LIGHT_MATRIX;
}

/**
 * Click.
 * @method onClick
 * @private
 */
Button.prototype.onClick = function() {
	this.trigger(Button.CLICK);
}

module.exports = Button;
},{"./EventDispatcher":70,"./FunctionUtil":72,"pixi.js":3}],68:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");
var Button = require("./Button");

/**
 * Checkbox.
 * @class Checkbox
 */
function Checkbox(background, tick) {
	PIXI.DisplayObjectContainer.call(this);

	this.button = new Button(background);
	this.addChild(this.button);

	this.check = tick;
	this.addChild(this.check);

	this.button.addEventListener("click", this.onButtonClick, this);

	this.setChecked(false);
}

FunctionUtil.extend(Checkbox, PIXI.DisplayObjectContainer);
EventDispatcher.init(Checkbox);

/**
 * Button click.
 * @method onButtonClick
 * @private
 */
Checkbox.prototype.onButtonClick = function() {
	this.check.visible = !this.check.visible;

	this.dispatchEvent("change");
}

/**
 * Setter.
 * @method setChecked
 */
Checkbox.prototype.setChecked = function(value) {
	this.check.visible = value;
	return value;
}

/**
 * Getter.
 * @method getChecked
 */
Checkbox.prototype.getChecked = function() {
	return this.check.visible;
}


module.exports = Checkbox;
},{"./Button":67,"./EventDispatcher":70,"./FunctionUtil":72,"pixi.js":3}],69:[function(require,module,exports){
var PIXI=require("pixi.js");
var FunctionUtil=require("../utils/FunctionUtil");

function ContentScaler(content) {
	PIXI.DisplayObjectContainer.call(this);

	this.contentWidth=100;
	this.contentHeight=100;

	this.screenWidth=100;
	this.screenHeight=100;

	this.theMask=null;

	if (content)
		this.setContent(content);
}

FunctionUtil.extend(ContentScaler,PIXI.DisplayObjectContainer);

ContentScaler.prototype.setContent=function(content) {
	this.content=content;

	this.addChild(this.content);

	if (this.theMask) {
		this.removeChild(this.theMask);
		this.theMask=null;
	}

	this.theMask=new PIXI.Graphics();
	//this.addChild(this.theMask);

	this.updateScale();
}

ContentScaler.prototype.setContentSize=function(contentWidth, contentHeight) {
	this.contentWidth=contentWidth;
	this.contentHeight=contentHeight;

	this.updateScale();
}

ContentScaler.prototype.setScreenSize=function(screenWidth, screenHeight) {
	this.screenWidth=screenWidth;
	this.screenHeight=screenHeight;

	this.updateScale();
}

ContentScaler.prototype.updateScale=function() {
	var scale;

	if (this.screenWidth/this.contentWidth<this.screenHeight/this.contentHeight)
		scale=this.screenWidth/this.contentWidth;

	else
		scale=this.screenHeight/this.contentHeight;

	this.content.scale.x=scale;
	this.content.scale.y=scale;

	var scaledWidth=this.contentWidth*scale;
	var scaledHeight=this.contentHeight*scale;

	this.content.position.x=(this.screenWidth-scaledWidth)/2;
	this.content.position.y=(this.screenHeight-scaledHeight)/2;

	var r=new PIXI.Rectangle(this.content.position.x,this.content.position.y,scaledWidth,scaledHeight);
	var right=r.x+r.width;
	var bottom=r.y+r.height;

	this.theMask.clear();
	this.theMask.beginFill();
	this.theMask.drawRect(0,0,this.screenWidth,r.y);
	this.theMask.drawRect(0,0,r.x,this.screenHeight);
	this.theMask.drawRect(right,0,this.screenWidth-right,this.screenHeight);
	this.theMask.drawRect(0,bottom,this.screenWidth,this.screenHeight-bottom);
	this.theMask.endFill();
}

module.exports=ContentScaler;
},{"../utils/FunctionUtil":72,"pixi.js":3}],70:[function(require,module,exports){
"use strict";

/**
 * AS3/jquery style event dispatcher. Slightly modified. The
 * jquery style on/off/trigger style of adding listeners is
 * currently the preferred one.
 * 
 * The on method for adding listeners takes an extra parameter which is the
 * scope in which listeners should be called. So this:
 *
 *     object.on("event", listener, this);
 *
 * Has the same function when adding events as:
 *
 *     object.on("event", listener.bind(this));
 *
 * However, the difference is that if we use the second method it
 * will not be possible to remove the listeners later, unless
 * the closure created by bind is stored somewhere. If the 
 * first method is used, we can remove the listener with:
 *
 *     object.off("event", listener, this);
 *
 * @class EventDispatcher
 */
function EventDispatcher() {
	this.listenerMap = {};
}

/**
 * Add event listener.
 * @method addEventListener
 * @deprecated
 */
EventDispatcher.prototype.addEventListener = function(eventType, listener, scope) {
	if (!this.listenerMap)
		this.listenerMap = {};

	if (!eventType)
		throw new Error("Event type required for event dispatcher");

	if (!listener)
		throw new Error("Listener required for event dispatcher");

	this.removeEventListener(eventType, listener, scope);

	if (!this.listenerMap.hasOwnProperty(eventType))
		this.listenerMap[eventType] = [];

	this.listenerMap[eventType].push({
		listener: listener,
		scope: scope
	});
}

/**
 * Remove event listener.
 * @method removeEventListener
 * @deprecated
 */
EventDispatcher.prototype.removeEventListener = function(eventType, listener, scope) {
	if (!this.listenerMap)
		this.listenerMap = {};

	if (!this.listenerMap.hasOwnProperty(eventType))
		return;

	var listeners = this.listenerMap[eventType];

	for (var i = 0; i < listeners.length; i++) {
		var listenerObj = listeners[i];

		if (listener == listenerObj.listener && scope == listenerObj.scope) {
			listeners.splice(i, 1);
			i--;
		}
	}

	if (!listeners.length)
		delete this.listenerMap[eventType];
}

/**
 * Dispatch event.
 * @method dispatchEvent
 */
EventDispatcher.prototype.dispatchEvent = function(event, data) {
	if (!this.listenerMap)
		this.listenerMap = {};

	if (typeof event == "string") {
		event = {
			type: event
		};
	}

	if (!this.listenerMap.hasOwnProperty(event.type))
		return;

	if (data == undefined)
		data = event;

	data.target = this;

	for (var i in this.listenerMap[event.type]) {
		var listenerObj = this.listenerMap[event.type][i];

		listenerObj.listener.call(listenerObj.scope, data);
	}
}

/**
 * Jquery style alias for addEventListener
 * @method on
 */
EventDispatcher.prototype.on = EventDispatcher.prototype.addEventListener;

/**
 * Jquery style alias for removeEventListener
 * @method off
 */
EventDispatcher.prototype.off = EventDispatcher.prototype.removeEventListener;

/**
 * Jquery style alias for dispatchEvent
 * @method trigger
 */
EventDispatcher.prototype.trigger = EventDispatcher.prototype.dispatchEvent;

/**
 * Make something an event dispatcher. Can be used for multiple inheritance.
 * @method init
 * @static
 */
EventDispatcher.init = function(cls) {
	cls.prototype.addEventListener = EventDispatcher.prototype.addEventListener;
	cls.prototype.removeEventListener = EventDispatcher.prototype.removeEventListener;
	cls.prototype.dispatchEvent = EventDispatcher.prototype.dispatchEvent;
	cls.prototype.on = EventDispatcher.prototype.on;
	cls.prototype.off = EventDispatcher.prototype.off;
	cls.prototype.trigger = EventDispatcher.prototype.trigger;
}

module.exports = EventDispatcher;
},{}],71:[function(require,module,exports){
"use strict";

var EventDispatcher=require("./EventDispatcher");
var FunctionUtil=require("./FunctionUtil");

/**
 * Frame timer.
 * @class FrameTimer
 */
function FrameTimer() {
	EventDispatcher.call(this);

	this.intervalId=setInterval(FunctionUtil.createDelegate(this.onInterval,this),1000/60);
}

FunctionUtil.extend(FrameTimer,EventDispatcher);

FrameTimer.TIMER="timer";
FrameTimer.RENDER="render";

/**
 * On interval.
 * @method onInterval
 * @private
 */
FrameTimer.prototype.onInterval=function() {
	this.dispatchEvent(FrameTimer.TIMER);
	this.dispatchEvent(FrameTimer.RENDER);
}

/**
 * Get singleton instance.
 * @method getInstance
 * @static
 */
FrameTimer.getInstance=function() {
	if (!FrameTimer.instance)
		FrameTimer.instance=new FrameTimer();

	return FrameTimer.instance;
}

module.exports=FrameTimer;
},{"./EventDispatcher":70,"./FunctionUtil":72}],72:[function(require,module,exports){
/**
 * Function utils.
 * @class FunctionUtil
 */
function FunctionUtil() {
}

/**
 * Extend a class.
 * Don't forget to call super.
 * @method extend
 * @static
 */
FunctionUtil.extend=function(target, base) {
	target.prototype=Object.create(base.prototype);
	target.prototype.constructor=target;
}

/**
 * Create delegate function. Deprecated, use bind() instead.
 * @method createDelegate
 * @deprecated
 * @static
 */
FunctionUtil.createDelegate=function(func, scope) {
	return function() {
		func.apply(scope,arguments);
	};
}

module.exports=FunctionUtil;

},{}],73:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");

/**
 * Create a sprite with a gradient.
 * @class Gradient
 */
function Gradient() {
	this.width = 100;
	this.height = 100;
	this.stops = [];
}

/**
 * Set size of the gradient.
 * @method setSize
 */
Gradient.prototype.setSize = function(w, h) {
	this.width = w;
	this.height = h;
}

/**
 * Add color stop.
 * @method addColorStop
 */
Gradient.prototype.addColorStop = function(weight, color) {
	this.stops.push({
		weight: weight,
		color: color
	});
}

/**
 * Render the sprite.
 * @method createSprite
 */
Gradient.prototype.createSprite = function() {
	console.log("rendering gradient...");
	var c = document.createElement("canvas");
	c.width = this.width;
	c.height = this.height;

	var ctx = c.getContext("2d");
	var grd = ctx.createLinearGradient(0, 0, 0, this.height);
	var i;

	for (i = 0; i < this.stops.length; i++)
		grd.addColorStop(this.stops[i].weight, this.stops[i].color);

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, this.width, this.height);

	return new PIXI.Sprite(PIXI.Texture.fromCanvas(c));
}

module.exports = Gradient;
},{"./FunctionUtil":72,"pixi.js":3}],74:[function(require,module,exports){
var EventDispatcher = require("./EventDispatcher");
var FunctionUtil = require("./FunctionUtil");
var Thenable = require("./Thenable");

/**
 * Message connection in a browser.
 * @class MessageWebSocketConnection
 */
function MessageWebSocketConnection() {
	EventDispatcher.call(this);
	this.test = 1;
}

FunctionUtil.extend(MessageWebSocketConnection, EventDispatcher);

MessageWebSocketConnection.CONNECT = "connect";
MessageWebSocketConnection.MESSAGE = "message";
MessageWebSocketConnection.CLOSE = "close";

/**
 * Connect.
 * @method connect
 */
MessageWebSocketConnection.prototype.connect = function(url) {
	this.webSocket = new WebSocket(url);

	this.webSocket.onopen = this.onWebSocketOpen.bind(this);
	this.webSocket.onmessage = this.onWebSocketMessage.bind(this);
	this.webSocket.onclose = this.onWebSocketClose.bind(this);
	this.webSocket.onerror = this.onWebSocketError.bind(this);
}

/**
 * Send.
 * @method send
 */
MessageWebSocketConnection.prototype.send = function(m) {
	this.webSocket.send(JSON.stringify(m));
}

/**
 * Web socket open.
 * @method onWebSocketOpen
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketOpen = function() {
	this.trigger(MessageWebSocketConnection.CONNECT);
}

/**
 * Web socket message.
 * @method onWebSocketMessage
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketMessage = function(e) {
	var message = JSON.parse(e.data);

	this.trigger({
		type: MessageWebSocketConnection.MESSAGE,
		message: message
	});
}

/**
 * Web socket close.
 * @method onWebSocketClose
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketClose = function() {
	console.log("web socket close, ws=" + this.webSocket + " this=" + this.test);
	this.webSocket.close();
	this.clearWebSocket();

	this.trigger(MessageWebSocketConnection.CLOSE);
}

/**
 * Web socket error.
 * @method onWebSocketError
 * @private
 */
MessageWebSocketConnection.prototype.onWebSocketError = function() {
	console.log("web socket error, ws=" + this.webSocket + " this=" + this.test);

	this.webSocket.close();
	this.clearWebSocket();

	this.trigger(MessageWebSocketConnection.CLOSE);
}

/**
 * Clear the current web socket.
 * @method clearWebSocket
 */
MessageWebSocketConnection.prototype.clearWebSocket = function() {
	this.webSocket.onopen = null;
	this.webSocket.onmessage = null;
	this.webSocket.onclose = null;
	this.webSocket.onerror = null;

	this.webSocket = null;
}

module.exports = MessageWebSocketConnection;
},{"./EventDispatcher":70,"./FunctionUtil":72,"./Thenable":81}],75:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * MouseOverGroup. This is the class for the MouseOverGroup.
 * @class MouseOverGroup
 */
function MouseOverGroup() {
	this.objects = new Array();
	this.currentlyOver = false;
	this.mouseDown = false;

}
FunctionUtil.extend(MouseOverGroup, PIXI.DisplayObjectContainer);
EventDispatcher.init(MouseOverGroup);


/**
 * Add displayobject to watchlist.
 * @method addDisplayObject
 */
MouseOverGroup.prototype.addDisplayObject = function(displayObject) {

	displayObject.interactive = true;
	displayObject.mouseoverEnabled = true;
	displayObject.mouseover = this.onObjectMouseOver.bind(this);
	displayObject.mouseout = this.onObjectMouseOut.bind(this);
	displayObject.mousedown = this.onObjectMouseDown.bind(this);
	this.objects.push(displayObject);

}


/**
 * Mouse over object.
 * @method onObjectMouseOver
 */
MouseOverGroup.prototype.onObjectMouseOver = function(interaction_object) {
	if(this.currentlyOver)
		return;

	this.currentlyOver = true;
	this.dispatchEvent("mouseover");
}


/**
 * Mouse out object.
 * @method onObjectMouseOut
 */
MouseOverGroup.prototype.onObjectMouseOut = function(interaction_object) {
	if(!this.currentlyOver || this.mouseDown)
		return;

	for(var i = 0; i < this.objects.length; i++)
		if(this.hitTest(this.objects[i], interaction_object))
			return;

	this.currentlyOver = false;
	this.dispatchEvent("mouseout");
}


/**
 * Hit test.
 * @method hitTest
 */
MouseOverGroup.prototype.hitTest = function(object, interaction_object) {
	if((interaction_object.global.x > object.getBounds().x ) && (interaction_object.global.x < (object.getBounds().x + object.getBounds().width)) &&
		(interaction_object.global.y > object.getBounds().y) && (interaction_object.global.y < (object.getBounds().y + object.getBounds().height))) {
		return true;		
	}
	return false;
}


/**
 * Mouse down object.
 * @method onObjectMouseDown
 */
MouseOverGroup.prototype.onObjectMouseDown = function(interaction_object) {
	this.mouseDown = true;
	interaction_object.target.mouseup = interaction_object.target.mouseupoutside = this.onStageMouseUp.bind(this);
}


/**
 * Mouse up stage.
 * @method onStageMouseUp
 */
MouseOverGroup.prototype.onStageMouseUp = function(interaction_object) {
	interaction_object.target.mouseup = interaction_object.target.mouseupoutside = null;
	this.mouseDown = false;

	if(this.currentlyOver) {
		var over = false;

		for(var i = 0; i < this.objects.length; i++)
			if(this.hitTest(this.objects[i], interaction_object))
				over = true;

		if(!over) {
			this.currentlyOver = false;
			this.dispatchEvent("mouseout");
		}
	}
}


module.exports = MouseOverGroup;


},{"./EventDispatcher":70,"./FunctionUtil":72,"pixi.js":3}],76:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("./FunctionUtil");

/**
 * Nine slice. This is a sprite that is a grid, and only the
 * middle part stretches when scaling.
 * @class NineSlice
 */
function NineSlice(texture, left, top, right, bottom) {
	PIXI.DisplayObjectContainer.call(this);

	this.texture = texture;

	if (!top)
		top = left;

	if (!right)
		right = left;

	if (!bottom)
		bottom = top;

	this.left = left;
	this.top = top;
	this.right = right;
	this.bottom = bottom;

	this.localWidth = texture.width;
	this.localHeight = texture.height;

	this.buildParts();
	this.updateSizes();
}

FunctionUtil.extend(NineSlice, PIXI.DisplayObjectContainer);

/**
 * Build the parts for the slices.
 * @method buildParts
 * @private
 */
NineSlice.prototype.buildParts = function() {
	var xp = [0, this.left, this.texture.width - this.right, this.texture.width];
	var yp = [0, this.top, this.texture.height - this.bottom, this.texture.height];
	var hi, vi;

	this.parts = [];

	for (vi = 0; vi < 3; vi++) {
		for (hi = 0; hi < 3; hi++) {
			var w = xp[hi + 1] - xp[hi];
			var h = yp[vi + 1] - yp[vi];

			if (w != 0 && h != 0) {
				var texturePart = this.createTexturePart(xp[hi], yp[vi], w, h);
				var s = new PIXI.Sprite(texturePart);
				this.addChild(s);

				this.parts.push(s);
			} else {
				this.parts.push(null);
			}
		}
	}
}

/**
 * Update sizes.
 * @method updateSizes
 * @private
 */
NineSlice.prototype.updateSizes = function() {
	var xp = [0, this.left, this.localWidth - this.right, this.localWidth];
	var yp = [0, this.top, this.localHeight - this.bottom, this.localHeight];
	var hi, vi, i = 0;

	for (vi = 0; vi < 3; vi++) {
		for (hi = 0; hi < 3; hi++) {
			if (this.parts[i]) {
				var part = this.parts[i];

				part.position.x = xp[hi];
				part.position.y = yp[vi];
				part.width = xp[hi + 1] - xp[hi];
				part.height = yp[vi + 1] - yp[vi];
			}

			i++;
		}
	}
}

/**
 * Set local size.
 * @method setLocalSize
 */
NineSlice.prototype.setLocalSize = function(w, h) {
	this.localWidth = w;
	this.localHeight = h;
	this.updateSizes();
}

/**
 * Create texture part.
 * @method createTexturePart
 * @private
 */
NineSlice.prototype.createTexturePart = function(x, y, width, height) {
	var frame = {
		x: this.texture.frame.x + x,
		y: this.texture.frame.y + y,
		width: width,
		height: height
	};

	return new PIXI.Texture(this.texture, frame);
}

module.exports = NineSlice;
},{"./FunctionUtil":72,"pixi.js":3}],77:[function(require,module,exports){
"use strict";

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("./FunctionUtil");
var ContentScaler = require("./ContentScaler");
var FrameTimer = require("./FrameTimer");

/**
 * Pixi full window app.
 * Can operate using window coordinates or scaled to specific area.
 * @class PixiApp
 */
function PixiApp(domId, width, height) {
	PIXI.DisplayObjectContainer.call(this);

	var view;

	if (navigator.isCocoonJS)
		view = document.createElement('screencanvas');

	else
		view = document.createElement('canvas');

	if (!domId) {
		if (PixiApp.fullScreenInstance)
			throw new Error("Only one PixiApp per app");

		PixiApp.fullScreenInstance = this;

		console.log("no dom it, attaching to body");
		this.containerEl = document.body;
		document.body.style.margin = 0;
		document.body.style.padding = 0;

		document.body.onresize = FunctionUtil.createDelegate(this.onWindowResize, this);
		window.onresize = FunctionUtil.createDelegate(this.onWindowResize, this);
	} else {
		console.log("attaching to: " + domId);
		this.containerEl = document.getElementById(domId);
	}

	this.renderer = new PIXI.autoDetectRenderer(this.containerEl.clientWidth, this.containerEl.clientHeight, view);
	this.containerEl.appendChild(this.renderer.view);

	this.contentScaler = null;

	this.appStage = new PIXI.Stage(0, true);

	if (!width || !height)
		this.useNoScaling();

	else
		this.useScaling(width, height);

//	FrameTimer.getInstance().addEventListener(FrameTimer.RENDER, this.onAnimationFrame, this);

	window.requestAnimationFrame(this.onAnimationFrame.bind(this));
}

FunctionUtil.extend(PixiApp, PIXI.DisplayObjectContainer);

/**
 * Use scaling mode.
 * @method useScaling
 */
PixiApp.prototype.useScaling = function(w, h) {
	this.removeContent();

	this.contentScaler = new ContentScaler(this);
	this.contentScaler.setContentSize(w, h);
	this.contentScaler.setScreenSize(this.containerEl.clientWidth, this.containerEl.clientHeight);
	this.appStage.addChild(this.contentScaler);
}

/**
 * Use no scaling mode.
 * @method useNoScaling
 */
PixiApp.prototype.useNoScaling = function() {
	this.removeContent();

	this.appStage.addChild(this);
}

/**
 * Remove any content.
 * @method removeContent
 * @private
 */
PixiApp.prototype.removeContent = function() {
	if (this.appStage.children.indexOf(this) >= 0)
		this.appStage.removeChild(this);

	if (this.contentScaler) {
		this.appStage.removeChild(this.contentScaler)
		this.contentScaler = null;
	}
}

/**
 * Window resize.
 * @method onWindowResize
 * @private
 */
PixiApp.prototype.onWindowResize = function() {
	if (this.contentScaler)
		this.contentScaler.setScreenSize(this.containerEl.clientWidth, this.containerEl.clientHeight);

	this.renderer.resize(this.containerEl.clientWidth, this.containerEl.clientHeight);
	this.renderer.render(this.appStage);
}

/**
 * Animation frame.
 * @method onAnimationFrame
 * @private
 */
PixiApp.prototype.onAnimationFrame = function(time) {
	this.renderer.render(this.appStage);
	TWEEN.update(time);

	window.requestAnimationFrame(this.onAnimationFrame.bind(this));
}

/**
 * Get canvas.
 * @method getCanvas
 */
PixiApp.prototype.getCanvas = function() {
	return this.renderer.view;
}

/**
 * Get stage.
 * @method getStage
 */
PixiApp.prototype.getStage = function() {
	return this.appStage;
}

module.exports = PixiApp;
},{"./ContentScaler":69,"./FrameTimer":71,"./FunctionUtil":72,"pixi.js":3,"tween.js":4}],78:[function(require,module,exports){
/**
 * Represents a point.
 * @class Point
 */
function Point(x, y) {
	if (!(this instanceof Point))
		return new Point(x, y);

	this.x = x;
	this.y = y;
}

module.exports = Point;
},{}],79:[function(require,module,exports){
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * Perform tasks in a sequence.
 * Tasks, which should be event dispatchers,
 * are euqueued with the enqueue function,
 * a START event is dispatcher upon task
 * start, and the task is considered complete
 * as it dispatches a COMPLETE event.
 * @class Sequencer
 */
function Sequencer() {
	EventDispatcher.call(this);

	this.queue = [];
	this.currentTask = null;
	this.onTaskCompleteClosure = this.onTaskComplete.bind(this);
}

FunctionUtil.extend(Sequencer, EventDispatcher);

Sequencer.START = "start";
Sequencer.COMPLETE = "complete";

/**
 * Enqueue a task to be performed.
 * @method enqueue
 */
Sequencer.prototype.enqueue = function(task) {
	if (!this.currentTask)
		this.startTask(task)

	else
		this.queue.push(task);
}

/**
 * Start the task.
 * @method startTask
 * @private
 */
Sequencer.prototype.startTask = function(task) {
	this.currentTask = task;

	this.currentTask.addEventListener(Sequencer.COMPLETE, this.onTaskCompleteClosure);
	this.currentTask.dispatchEvent({
		type: Sequencer.START
	});
}

/**
 * The current task is complete.
 * @method onTaskComplete
 * @private
 */
Sequencer.prototype.onTaskComplete = function() {
	this.currentTask.removeEventListener(Sequencer.COMPLETE, this.onTaskCompleteClosure);
	this.currentTask = null;

	if (this.queue.length > 0)
		this.startTask(this.queue.shift());

	else
		this.trigger(Sequencer.COMPLETE);

}

/**
 * Abort the sequence.
 * @method abort
 */
Sequencer.prototype.abort = function() {
	if (this.currentTask) {
		this.currentTask.removeEventListener(Sequencer.COMPLETE, this.onTaskCompleteClosure);
		this.currentTask = null;
	}

	this.queue = [];
}

module.exports = Sequencer;
},{"./EventDispatcher":70,"./FunctionUtil":72}],80:[function(require,module,exports){
var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("./FunctionUtil");
var EventDispatcher = require("./EventDispatcher");

/**
 * Slider. This is the class for the slider.
 * @class Slider
 */
function Slider(background, knob) {
	PIXI.DisplayObjectContainer.call(this);

	this.background = background;
	this.knob = knob;

	this.addChild(this.background);
	this.addChild(this.knob);


	this.knob.buttonMode = true;
	this.knob.interactive = true;
	this.knob.mousedown = this.onKnobMouseDown.bind(this);

	this.background.buttonMode = true;
	this.background.interactive = true;
	this.background.mousedown = this.onBackgroundMouseDown.bind(this);

	this.fadeTween = null;
	this.alpha = 0;
}

FunctionUtil.extend(Slider, PIXI.DisplayObjectContainer);
EventDispatcher.init(Slider);


/**
 * Mouse down on knob.
 * @method onKnobMouseDown
 */
Slider.prototype.onKnobMouseDown = function(interaction_object) {
	this.downPos = this.knob.position.x;
	this.downX = interaction_object.getLocalPosition(this).x;

	this.stage.mouseup = this.onStageMouseUp.bind(this);
	this.stage.mousemove = this.onStageMouseMove.bind(this);
}


/**
 * Mouse down on background.
 * @method onBackgroundMouseDown
 */
Slider.prototype.onBackgroundMouseDown = function(interaction_object) {
	this.downX = interaction_object.getLocalPosition(this).x;
	this.knob.x = interaction_object.getLocalPosition(this).x - this.knob.width*0.5;

	this.validateValue();

	this.downPos = this.knob.position.x;

	this.stage.mouseup = this.onStageMouseUp.bind(this);
	this.stage.mousemove = this.onStageMouseMove.bind(this);

	this.dispatchEvent("change");
}


/**
 * Mouse up.
 * @method onStageMouseUp
 */
Slider.prototype.onStageMouseUp = function(interaction_object) {
	this.stage.mouseup = null;
	this.stage.mousemove = null;
}


/**
 * Mouse move.
 * @method onStageMouseMove
 */
Slider.prototype.onStageMouseMove = function(interaction_object) {
	this.knob.x = this.downPos + (interaction_object.getLocalPosition(this).x - this.downX);

	this.validateValue();

	this.dispatchEvent("change");
}


/**
 * Validate position.
 * @method validateValue
 */
Slider.prototype.validateValue = function() {

	if(this.knob.x < 0)
		this.knob.x = 0;

	if(this.knob.x > (this.background.width - this.knob.width))
		this.knob.x = this.background.width - this.knob.width;
}


/**
 * Get value.
 * @method getValue
 */
Slider.prototype.getValue = function() {
	var fraction = this.knob.position.x/(this.background.width - this.knob.width);

	return fraction;
}


/**
 * Get value.
 * @method getValue
 */
Slider.prototype.setValue = function(value) {
	this.knob.x = this.background.position.x + value*(this.background.width - this.knob.width);

	this.validateValue();
	return this.getValue();
}


/**
 * Show.
 * @method show
 */
Slider.prototype.show = function() {
	this.visible = true;
	if(this.fadeTween != null)
		this.fadeTween.stop();
	this.fadeTween = new TWEEN.Tween(this)
			.to({alpha: 1}, 250)
			.start();
}

/**
 * Hide.
 * @method hide
 */
Slider.prototype.hide = function() {
	if(this.fadeTween != null)
		this.fadeTween.stop();
	this.fadeTween = new TWEEN.Tween(this)
			.to({alpha: 0}, 250)
			.onComplete(this.onHidden.bind(this))
			.start();
}

/**
 * On hidden.
 * @method onHidden
 */
Slider.prototype.onHidden = function() {
	this.visible = false;
}


module.exports = Slider;

},{"./EventDispatcher":70,"./FunctionUtil":72,"pixi.js":3,"tween.js":4}],81:[function(require,module,exports){
var EventDispatcher = require("./EventDispatcher");
var FunctionUtil = require("./FunctionUtil");

/**
 * An implementation of promises as defined here:
 * http://promises-aplus.github.io/promises-spec/
 * @class Thenable
 */
function Thenable() {
	EventDispatcher.call(this)

	this.successHandlers = [];
	this.errorHandlers = [];
	this.notified = false;
	this.handlersCalled = false;
	this.notifyParam = null;
}

FunctionUtil.extend(Thenable, EventDispatcher);

/**
 * Set resolution handlers.
 * @method then
 * @param success The function called to handle success.
 * @param error The function called to handle error.
 * @return This Thenable for chaining.
 */
Thenable.prototype.then = function(success, error) {
	if (this.handlersCalled)
		throw new Error("This thenable is already used.");

	this.successHandlers.push(success);
	this.errorHandlers.push(error);

	return this;
}

/**
 * Notify success of the operation.
 * @method notifySuccess
 */
Thenable.prototype.notifySuccess = function(param) {
	if (this.handlersCalled)
		throw new Error("This thenable is already notified.");

	this.notifyParam = param;
	setTimeout(this.doNotifySuccess.bind(this), 0);
}

/**
 * Notify failure of the operation.
 * @method notifyError
 */
Thenable.prototype.notifyError = function(param) {
	if (this.handlersCalled)
		throw new Error("This thenable is already notified.");

	this.notifyParam = param;
	setTimeout(this.doNotifyError.bind(this), 0);
}

/**
 * Actually notify success.
 * @method doNotifySuccess
 * @private
 */
Thenable.prototype.doNotifySuccess = function(param) {
	if (param)
		this.notifyParam = param;

	this.callHandlers(this.successHandlers);
}

/**
 * Actually notify error.
 * @method doNotifyError
 * @private
 */
Thenable.prototype.doNotifyError = function() {
	this.callHandlers(this.errorHandlers);
}

/**
 * Call handlers.
 * @method callHandlers
 * @private
 */
Thenable.prototype.callHandlers = function(handlers) {
	if (this.handlersCalled)
		throw new Error("Should never happen.");

	this.handlersCalled = true;

	for (var i in handlers) {
		if (handlers[i]) {
			try {
				handlers[i].call(null, this.notifyParam);
			} catch (e) {
				console.error("Exception in Thenable handler: " + e);
				console.log(e.stack);
				throw e;
			}
		}
	}
}

/**
 * Resolve promise.
 * @method resolve
 */
Thenable.prototype.resolve = function(result) {
	this.notifySuccess(result);
}

/**
 * Reject promise.
 * @method reject
 */
Thenable.prototype.reject = function(reason) {
	this.notifyError(reason);
}

module.exports = Thenable;
},{"./EventDispatcher":70,"./FunctionUtil":72}]},{},[12])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbWxpbmRxdmlzdFxccmVwb1xcbmV0cG9rZXJcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L2luZGV4LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L3NyYy9QaXhpVGV4dElucHV0LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9waXhpLmpzL2Jpbi9waXhpLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy90d2Vlbi5qcy9pbmRleC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9OZXRQb2tlckNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9TZXR0aW5ncy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvSW50ZXJmYWNlQ29udHJvbGxlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlSXRlbS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9UYWJsZUNvbnRyb2xsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC9uZXRwb2tlcmNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9EZWZhdWx0U2tpbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9SZXNvdXJjZXMuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0JpZ0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQnV0dG9uc1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0NhcmRWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9DaGF0Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQ2hpcHNWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EZWFsZXJCdXR0b25WaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EaWFsb2dCdXR0b24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0RpYWxvZ1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0xvYWRpbmdTY3JlZW4uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L05ldFBva2VyQ2xpZW50Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUG90Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUmFpc2VTaG9ydGN1dEJ1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvU2VhdFZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzVmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvVGltZXJWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9Qcm90b0Nvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL2RhdGEvQnV0dG9uRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9DYXJkRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9QcmVzZXRCdXR0b25EYXRhLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRzVG9Qb3RNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0J1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DaGF0TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DbGVhck1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0NvbW11bml0eUNhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVsYXlNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9GYWRlVGFibGVNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9IYW5kSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0luaXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BheU91dE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUG90TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9QcmVzZXRCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZXNldEJ1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0SW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TdGF0ZUNvbXBsZXRlTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVGFibGVCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Rlc3RDYXNlUmVxdWVzdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0NvbnRlbnRTY2FsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0V2ZW50RGlzcGF0Y2hlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRnJhbWVUaW1lci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRnVuY3Rpb25VdGlsLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9HcmFkaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL01vdXNlT3Zlckdyb3VwLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9OaW5lU2xpY2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BpeGlBcHAuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BvaW50LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9TZXF1ZW5jZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1NsaWRlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvVGhlbmFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZQQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQaXhpVGV4dElucHV0ID0gcmVxdWlyZShcIi4vc3JjL1BpeGlUZXh0SW5wdXRcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBpeGlUZXh0SW5wdXQ7IiwiaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0UElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogVGV4dCBpbnB1dCBmaWVsZCBmb3IgcGl4aS5qcy5cclxuICogQSBzaW1wbGUgZXhhbXBsZTpcclxuICpcclxuICogICAgIC8vIFdlIG5lZWQgYSBjb250YWluZXJcclxuICogICAgIHZhciBjb250YWluZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcbiAqXHJcbiAqICAgICAvLyBTYW1lIHN0eWxlIG9wdGlvbnMgYXMgUElYSS5UZXh0XHJcbiAqICAgICB2YXIgc3R5bGU9eyAuLi4gfTtcclxuICpcclxuICogICAgIHZhciBpbnB1dEZpZWxkID0gbmV3IFBpeGlUZXh0SW5wdXQoXCJoZWxsb1wiLHN0eWxlKTtcclxuICogICAgIGNvbnRhaW5lci5hZGRDaGlsZChpbnB1dEZpZWxkKTtcclxuICpcclxuICogVGhlIHN0eWxlIGRlZmluaXRpb25zIGFjY2VwdGVkIGJ5IHRoZSBjb25zdHJ1Y3RvciBhcmUgdGhlIHNhbWUgYXMgdGhvc2UgYWNjZXB0ZWQgYnlcclxuICogW1BJWEkuVGV4dF0oaHR0cDovL3d3dy5nb29kYm95ZGlnaXRhbC5jb20vcGl4aWpzL2RvY3MvY2xhc3Nlcy9UZXh0Lmh0bWwpLlxyXG4gKiBAY2xhc3MgUGl4aVRleHRJbnB1dFxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtTdHJpbmd9IFt0ZXh0XSBUaGUgaW5pdGlhbCB0ZXh0LlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3N0eWxlXSBTdHlsZSBkZWZpbml0aW9uLCBzYW1lIGFzIGZvciBQSVhJLlRleHRcclxuICovXHJcbmZ1bmN0aW9uIFBpeGlUZXh0SW5wdXQodGV4dCwgc3R5bGUpIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHJcblx0aWYgKCF0ZXh0KVxyXG5cdFx0dGV4dCA9IFwiXCI7XHJcblxyXG5cdHRleHQgPSB0ZXh0LnRvU3RyaW5nKCk7XHJcblxyXG5cdGlmIChzdHlsZSAmJiBzdHlsZS53b3JkV3JhcClcclxuXHRcdHRocm93IFwid29yZFdyYXAgaXMgbm90IHN1cHBvcnRlZCBmb3IgaW5wdXQgZmllbGRzXCI7XHJcblxyXG5cdHRoaXMuX3RleHQgPSB0ZXh0O1xyXG5cclxuXHR0aGlzLmxvY2FsV2lkdGggPSAxMDA7XHJcblx0dGhpcy5fYmFja2dyb3VuZENvbG9yID0gMHhmZmZmZmY7XHJcblx0dGhpcy5fY2FyZXRDb2xvciA9IDB4MDAwMDAwO1xyXG5cdHRoaXMuX2JhY2tncm91bmQgPSB0cnVlO1xyXG5cclxuXHR0aGlzLnN0eWxlID0gc3R5bGU7XHJcblx0dGhpcy50ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KHRoaXMuX3RleHQsIHN0eWxlKTtcclxuXHJcblx0dGhpcy5sb2NhbEhlaWdodCA9XHJcblx0XHR0aGlzLnRleHRGaWVsZC5kZXRlcm1pbmVGb250SGVpZ2h0KCdmb250OiAnICsgdGhpcy50ZXh0RmllbGQuc3R5bGUuZm9udCArICc7JykgK1xyXG5cdFx0dGhpcy50ZXh0RmllbGQuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzO1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcclxuXHR0aGlzLnRleHRGaWVsZE1hc2sgPSBuZXcgUElYSS5HcmFwaGljcygpO1xyXG5cdHRoaXMuY2FyZXQgPSBuZXcgUElYSS5HcmFwaGljcygpO1xyXG5cdHRoaXMuZHJhd0VsZW1lbnRzKCk7XHJcblxyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5jYXJldCk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZE1hc2spO1xyXG5cclxuXHR0aGlzLnNjcm9sbEluZGV4ID0gMDtcclxuXHR0aGlzLl9jYXJldEluZGV4ID0gMDtcclxuXHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IG51bGw7XHJcblx0dGhpcy5ibHVyKCk7XHJcblx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblxyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmludGVyYWN0aXZlID0gdHJ1ZTtcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5idXR0b25Nb2RlID0gdHJ1ZTtcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5kZWZhdWx0Q3Vyc29yID0gXCJ0ZXh0XCI7XHJcblxyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLm1vdXNlZG93biA9IHRoaXMub25CYWNrZ3JvdW5kTW91c2VEb3duLmJpbmQodGhpcyk7XHJcblx0dGhpcy5rZXlFdmVudENsb3N1cmUgPSB0aGlzLm9uS2V5RXZlbnQuYmluZCh0aGlzKTtcclxuXHR0aGlzLndpbmRvd0JsdXJDbG9zdXJlID0gdGhpcy5vbldpbmRvd0JsdXIuYmluZCh0aGlzKTtcclxuXHR0aGlzLmRvY3VtZW50TW91c2VEb3duQ2xvc3VyZSA9IHRoaXMub25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpO1xyXG5cdHRoaXMuaXNGb2N1c0NsaWNrID0gZmFsc2U7XHJcblxyXG5cdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cclxuXHR0aGlzLnRleHRGaWVsZC5tYXNrID0gdGhpcy50ZXh0RmllbGRNYXNrO1xyXG5cclxuXHR0aGlzLmtleXByZXNzID0gbnVsbDtcclxuXHR0aGlzLmtleWRvd24gPSBudWxsO1xyXG5cdHRoaXMuY2hhbmdlID0gbnVsbDtcclxufVxyXG5cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpO1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBpeGlUZXh0SW5wdXQ7XHJcblxyXG4vKipcclxuICogU29tZW9uZSBjbGlja2VkLlxyXG4gKiBAbWV0aG9kIG9uQmFja2dyb3VuZE1vdXNlRG93blxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25CYWNrZ3JvdW5kTW91c2VEb3duID0gZnVuY3Rpb24oZSkge1xyXG5cdHZhciB4ID0gZS5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLng7XHJcblx0dGhpcy5fY2FyZXRJbmRleCA9IHRoaXMuZ2V0Q2FyZXRJbmRleEJ5Q29vcmQoeCk7XHJcblx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblxyXG5cdHRoaXMuZm9jdXMoKTtcclxuXHJcblx0dGhpcy5pc0ZvY3VzQ2xpY2sgPSB0cnVlO1xyXG5cdHZhciBzY29wZSA9IHRoaXM7XHJcblx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdHNjb3BlLmlzRm9jdXNDbGljayA9IGZhbHNlO1xyXG5cdH0sIDApO1xyXG59XHJcblxyXG4vKipcclxuICogRm9jdXMgdGhpcyBpbnB1dCBmaWVsZC5cclxuICogQG1ldGhvZCBmb2N1c1xyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZm9jdXMgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmJsdXIoKTtcclxuXHJcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlFdmVudENsb3N1cmUpO1xyXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XHJcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCB0aGlzLmRvY3VtZW50TW91c2VEb3duQ2xvc3VyZSk7XHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsIHRoaXMud2luZG93Qmx1ckNsb3N1cmUpO1xyXG5cclxuXHR0aGlzLnNob3dDYXJldCgpO1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIGtleSBldmVudC5cclxuICogQG1ldGhvZCBvbktleUV2ZW50XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbktleUV2ZW50ID0gZnVuY3Rpb24oZSkge1xyXG5cdC8qY29uc29sZS5sb2coXCJrZXkgZXZlbnRcIik7XHJcblx0Y29uc29sZS5sb2coZSk7Ki9cclxuXHJcblx0aWYgKGUudHlwZSA9PSBcImtleXByZXNzXCIpIHtcclxuXHRcdGlmIChlLmNoYXJDb2RlIDwgMzIpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHR0aGlzLl90ZXh0ID1cclxuXHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcoMCwgdGhpcy5fY2FyZXRJbmRleCkgK1xyXG5cdFx0XHRTdHJpbmcuZnJvbUNoYXJDb2RlKGUuY2hhckNvZGUpICtcclxuXHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5fY2FyZXRJbmRleCk7XHJcblxyXG5cdFx0dGhpcy5fY2FyZXRJbmRleCsrO1xyXG5cdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0dGhpcy5zaG93Q2FyZXQoKTtcclxuXHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdFx0dGhpcy50cmlnZ2VyKHRoaXMua2V5cHJlc3MsIGUpO1xyXG5cdFx0dGhpcy50cmlnZ2VyKHRoaXMuY2hhbmdlKTtcclxuXHR9XHJcblxyXG5cdGlmIChlLnR5cGUgPT0gXCJrZXlkb3duXCIpIHtcclxuXHRcdHN3aXRjaCAoZS5rZXlDb2RlKSB7XHJcblx0XHRcdGNhc2UgODpcclxuXHRcdFx0XHRpZiAodGhpcy5fY2FyZXRJbmRleCA+IDApIHtcclxuXHRcdFx0XHRcdHRoaXMuX3RleHQgPVxyXG5cdFx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZygwLCB0aGlzLl9jYXJldEluZGV4IC0gMSkgK1xyXG5cdFx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLl9jYXJldEluZGV4KTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLl9jYXJldEluZGV4LS07XHJcblx0XHRcdFx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHRcdFx0XHR0aGlzLnNob3dDYXJldCgpO1xyXG5cdFx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXIodGhpcy5jaGFuZ2UpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSA0NjpcclxuXHRcdFx0XHR0aGlzLl90ZXh0ID1cclxuXHRcdFx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXgpICtcclxuXHRcdFx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKHRoaXMuX2NhcmV0SW5kZXggKyAxKTtcclxuXHJcblx0XHRcdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdHRoaXMudHJpZ2dlcih0aGlzLmNoYW5nZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIDM5OlxyXG5cdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXgrKztcclxuXHRcdFx0XHRpZiAodGhpcy5fY2FyZXRJbmRleCA+IHRoaXMuX3RleHQubGVuZ3RoKVxyXG5cdFx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleCA9IHRoaXMuX3RleHQubGVuZ3RoO1xyXG5cclxuXHRcdFx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgMzc6XHJcblx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleC0tO1xyXG5cdFx0XHRcdGlmICh0aGlzLl9jYXJldEluZGV4IDwgMClcclxuXHRcdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXggPSAwO1xyXG5cclxuXHRcdFx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnRyaWdnZXIodGhpcy5rZXlkb3duLCBlKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFbnN1cmUgdGhlIGNhcmV0IGlzIG5vdCBvdXRzaWRlIHRoZSBib3VuZHMuXHJcbiAqIEBtZXRob2QgZW5zdXJlQ2FyZXRJblZpZXdcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmVuc3VyZUNhcmV0SW5WaWV3ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblxyXG5cdHdoaWxlICh0aGlzLmNhcmV0LnBvc2l0aW9uLnggPj0gdGhpcy5sb2NhbFdpZHRoIC0gMSkge1xyXG5cdFx0dGhpcy5zY3JvbGxJbmRleCsrO1xyXG5cdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblx0fVxyXG5cclxuXHR3aGlsZSAodGhpcy5jYXJldC5wb3NpdGlvbi54IDwgMCkge1xyXG5cdFx0dGhpcy5zY3JvbGxJbmRleCAtPSAyO1xyXG5cdFx0aWYgKHRoaXMuc2Nyb2xsSW5kZXggPCAwKVxyXG5cdFx0XHR0aGlzLnNjcm9sbEluZGV4ID0gMDtcclxuXHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEJsdXIgb3Vyc2VsZi5cclxuICogQG1ldGhvZCBibHVyXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5ibHVyID0gZnVuY3Rpb24oKSB7XHJcblx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlFdmVudENsb3N1cmUpO1xyXG5cdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XHJcblx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCB0aGlzLmRvY3VtZW50TW91c2VEb3duQ2xvc3VyZSk7XHJcblx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJibHVyXCIsIHRoaXMud2luZG93Qmx1ckNsb3N1cmUpO1xyXG5cclxuXHR0aGlzLmhpZGVDYXJldCgpO1xyXG59XHJcblxyXG4vKipcclxuICogV2luZG93IGJsdXIuXHJcbiAqIEBtZXRob2Qgb25Eb2N1bWVudE1vdXNlRG93blxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25Eb2N1bWVudE1vdXNlRG93biA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmICghdGhpcy5pc0ZvY3VzQ2xpY2spXHJcblx0XHR0aGlzLmJsdXIoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFdpbmRvdyBibHVyLlxyXG4gKiBAbWV0aG9kIG9uV2luZG93Qmx1clxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25XaW5kb3dCbHVyID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5ibHVyKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgY2FyZXQgUG9zaXRpb24uXHJcbiAqIEBtZXRob2QgdXBkYXRlQ2FyZXRQb3NpdGlvblxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUudXBkYXRlQ2FyZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmICh0aGlzLl9jYXJldEluZGV4IDwgdGhpcy5zY3JvbGxJbmRleCkge1xyXG5cdFx0dGhpcy5jYXJldC5wb3NpdGlvbi54ID0gLTE7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHR2YXIgc3ViID0gdGhpcy5fdGV4dC5zdWJzdHJpbmcoMCwgdGhpcy5fY2FyZXRJbmRleCkuc3Vic3RyaW5nKHRoaXMuc2Nyb2xsSW5kZXgpO1xyXG5cdHRoaXMuY2FyZXQucG9zaXRpb24ueCA9IHRoaXMudGV4dEZpZWxkLmNvbnRleHQubWVhc3VyZVRleHQoc3ViKS53aWR0aDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSB0ZXh0LlxyXG4gKiBAbWV0aG9kIHVwZGF0ZVRleHRcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnVwZGF0ZVRleHQgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KHRoaXMuX3RleHQuc3Vic3RyaW5nKHRoaXMuc2Nyb2xsSW5kZXgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERyYXcgdGhlIGJhY2tncm91bmQgYW5kIGNhcmV0LlxyXG4gKiBAbWV0aG9kIGRyYXdFbGVtZW50c1xyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZHJhd0VsZW1lbnRzID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuY2xlYXIoKTtcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5iZWdpbkZpbGwodGhpcy5fYmFja2dyb3VuZENvbG9yKTtcclxuXHJcblx0aWYgKHRoaXMuX2JhY2tncm91bmQpXHJcblx0XHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5kcmF3UmVjdCgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xyXG5cclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5lbmRGaWxsKCk7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuaGl0QXJlYSA9IG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xyXG5cclxuXHR0aGlzLnRleHRGaWVsZE1hc2suY2xlYXIoKTtcclxuXHR0aGlzLnRleHRGaWVsZE1hc2suYmVnaW5GaWxsKHRoaXMuX2JhY2tncm91bmRDb2xvcik7XHJcblx0dGhpcy50ZXh0RmllbGRNYXNrLmRyYXdSZWN0KDAsIDAsIHRoaXMubG9jYWxXaWR0aCwgdGhpcy5sb2NhbEhlaWdodCk7XHJcblx0dGhpcy50ZXh0RmllbGRNYXNrLmVuZEZpbGwoKTtcclxuXHJcblx0dGhpcy5jYXJldC5jbGVhcigpO1xyXG5cdHRoaXMuY2FyZXQuYmVnaW5GaWxsKHRoaXMuX2NhcmV0Q29sb3IpO1xyXG5cdHRoaXMuY2FyZXQuZHJhd1JlY3QoMSwgMSwgMSwgdGhpcy5sb2NhbEhlaWdodCAtIDIpO1xyXG5cdHRoaXMuY2FyZXQuZW5kRmlsbCgpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBjYXJldC5cclxuICogQG1ldGhvZCBzaG93Q2FyZXRcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnNob3dDYXJldCA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmICh0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCkge1xyXG5cdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCk7XHJcblx0XHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHR0aGlzLmNhcmV0LnZpc2libGUgPSB0cnVlO1xyXG5cdHRoaXMuY2FyZXRGbGFzaEludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5vbkNhcmV0Rmxhc2hJbnRlcnZhbC5iaW5kKHRoaXMpLCA1MDApO1xyXG59XHJcblxyXG4vKipcclxuICogSGlkZSBjYXJldC5cclxuICogQG1ldGhvZCBoaWRlQ2FyZXRcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmhpZGVDYXJldCA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmICh0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCkge1xyXG5cdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCk7XHJcblx0XHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHR0aGlzLmNhcmV0LnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhcmV0IGZsYXNoIGludGVydmFsLlxyXG4gKiBAbWV0aG9kIG9uQ2FyZXRGbGFzaEludGVydmFsXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbkNhcmV0Rmxhc2hJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuY2FyZXQudmlzaWJsZSA9ICF0aGlzLmNhcmV0LnZpc2libGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNYXAgcG9zaXRpb24gdG8gY2FyZXQgaW5kZXguXHJcbiAqIEBtZXRob2QgZ2V0Q2FyZXRJbmRleEJ5Q29vcmRcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmdldENhcmV0SW5kZXhCeUNvb3JkID0gZnVuY3Rpb24oeCkge1xyXG5cdHZhciBzbWFsbGVzdCA9IDEwMDAwO1xyXG5cdHZhciBjYW5kID0gMDtcclxuXHR2YXIgdmlzaWJsZSA9IHRoaXMuX3RleHQuc3Vic3RyaW5nKHRoaXMuc2Nyb2xsSW5kZXgpO1xyXG5cclxuXHRmb3IgKGkgPSAwOyBpIDwgdmlzaWJsZS5sZW5ndGggKyAxOyBpKyspIHtcclxuXHRcdHZhciBzdWIgPSB2aXNpYmxlLnN1YnN0cmluZygwLCBpKTtcclxuXHRcdHZhciB3ID0gdGhpcy50ZXh0RmllbGQuY29udGV4dC5tZWFzdXJlVGV4dChzdWIpLndpZHRoO1xyXG5cclxuXHRcdGlmIChNYXRoLmFicyh3IC0geCkgPCBzbWFsbGVzdCkge1xyXG5cdFx0XHRzbWFsbGVzdCA9IE1hdGguYWJzKHcgLSB4KTtcclxuXHRcdFx0Y2FuZCA9IGk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdGhpcy5zY3JvbGxJbmRleCArIGNhbmQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgd2lkdGggb2YgdGhlIFBpeGlUZXh0SW5wdXQuIFRoaXMgaXMgb3ZlcnJpZGRlbiB0byBoYXZlIGEgc2xpZ2h0bHlcclxuICogZGlmZmVyZW50IGJlaGFpdm91ciB0aGFuIHRoZSBvdGhlciBEaXNwbGF5T2JqZWN0cy4gU2V0dGluZyB0aGVcclxuICogd2lkdGggb2YgdGhlIFBpeGlUZXh0SW5wdXQgZG9lcyBub3QgY2hhbmdlIHRoZSBzY2FsZSwgYnV0IGl0IHJhdGhlclxyXG4gKiBtYWtlcyB0aGUgZmllbGQgbGFyZ2VyLiBJZiB5b3UgYWN0dWFsbHkgd2FudCB0byBzY2FsZSBpdCxcclxuICogdXNlIHRoZSBzY2FsZSBwcm9wZXJ0eS5cclxuICogQHByb3BlcnR5IHdpZHRoXHJcbiAqIEB0eXBlIE51bWJlclxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcIndpZHRoXCIsIHtcclxuXHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuc2NhbGUueCAqIHRoaXMuZ2V0TG9jYWxCb3VuZHMoKS53aWR0aDtcclxuXHR9LFxyXG5cclxuXHRzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuXHRcdHRoaXMubG9jYWxXaWR0aCA9IHY7XHJcblx0XHR0aGlzLmRyYXdFbGVtZW50cygpO1xyXG5cdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgdGV4dCBpbiB0aGUgaW5wdXQgZmllbGQuIFNldHRpbmcgd2lsbCBoYXZlIHRoZSBpbXBsaWNpdCBmdW5jdGlvbiBvZiByZXNldHRpbmcgdGhlIHNjcm9sbFxyXG4gKiBvZiB0aGUgaW5wdXQgZmllbGQgYW5kIHJlbW92aW5nIGZvY3VzLlxyXG4gKiBAcHJvcGVydHkgdGV4dFxyXG4gKiBAdHlwZSBTdHJpbmdcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJ0ZXh0XCIsIHtcclxuXHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RleHQ7XHJcblx0fSxcclxuXHJcblx0c2V0OiBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLl90ZXh0ID0gdi50b1N0cmluZygpO1xyXG5cdFx0dGhpcy5zY3JvbGxJbmRleCA9IDA7XHJcblx0XHR0aGlzLmNhcmV0SW5kZXggPSAwO1xyXG5cdFx0dGhpcy5ibHVyKCk7XHJcblx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBjb2xvciBvZiB0aGUgYmFja2dyb3VuZCBmb3IgdGhlIGlucHV0IGZpZWxkLlxyXG4gKiBUaGlzIG5lZWRzIHRvIGJlIHNwZWNpZmllZCBhcyBhbiBpbnRlZ2VyLCBub3QgdXNpbmcgSFRNTFxyXG4gKiBub3RhdGlvbiwgZS5nLiBmb3IgcmVkIGJhY2tncm91bmQ6XHJcbiAqXHJcbiAqICAgICBteUlucHV0VGV4dC5iYWNrZ3JvdW5kQ29sb3IgPSAweGZmMDAwMDtcclxuICpcclxuICogSW4gb3JkZXIgZm9yIHRoZSBiYWNrZ3JvdW5kIHRvIGJlIGRyYXduLCB0aGUgYGJhY2tncm91bmRgXHJcbiAqIHByb3BlcnR5IG5lZWRzIHRvIGJlIHRydWUuIElmIG5vdCwgdGhpcyBwcm9wZXJ0eSB3aWxsIGhhdmVcclxuICogbm8gZWZmZWN0LlxyXG4gKiBAcHJvcGVydHkgYmFja2dyb3VuZENvbG9yXHJcbiAqIEB0eXBlIEludGVnZXJcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJiYWNrZ3JvdW5kQ29sb3JcIiwge1xyXG5cdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fYmFja2dyb3VuZENvbG9yO1xyXG5cdH0sXHJcblxyXG5cdHNldDogZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5fYmFja2dyb3VuZENvbG9yID0gdjtcclxuXHRcdHRoaXMuZHJhd0VsZW1lbnRzKCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgY29sb3Igb2YgdGhlIGNhcmV0LlxyXG4gKiBAcHJvcGVydHkgY2FyZXRDb2xvclxyXG4gKiBAdHlwZSBJbnRlZ2VyXHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwiY2FyZXRDb2xvclwiLCB7XHJcblx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jYXJldENvbG9yO1xyXG5cdH0sXHJcblxyXG5cdHNldDogZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5fY2FyZXRDb2xvciA9IHY7XHJcblx0XHR0aGlzLmRyYXdFbGVtZW50cygpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lcyBpZiB0aGUgYmFja2dyb3VuZCBzaG91bGQgYmUgZHJhd24gYmVoaW5kIHRoZSB0ZXh0LlxyXG4gKiBUaGUgY29sb3Igb2YgdGhlIGJhY2tncm91bmQgaXMgc3BlY2lmaWVkIHVzaW5nIHRoZSBiYWNrZ3JvdW5kQ29sb3JcclxuICogcHJvcGVydHkuXHJcbiAqIEBwcm9wZXJ0eSBiYWNrZ3JvdW5kXHJcbiAqIEB0eXBlIEJvb2xlYW5cclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJiYWNrZ3JvdW5kXCIsIHtcclxuXHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmQ7XHJcblx0fSxcclxuXHJcblx0c2V0OiBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLl9iYWNrZ3JvdW5kID0gdjtcclxuXHRcdHRoaXMuZHJhd0VsZW1lbnRzKCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgdGV4dC5cclxuICogQG1ldGhvZCBzZXRUZXh0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0IFRoZSBuZXcgdGV4dC5cclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbih2KSB7XHJcblx0dGhpcy50ZXh0ID0gdjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRyaWdnZXIgYW4gZXZlbnQgZnVuY3Rpb24gaWYgaXQgZXhpc3RzLlxyXG4gKiBAbWV0aG9kIHRyaWdnZXJcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihmbiwgZSkge1xyXG5cdGlmIChmbilcclxuXHRcdGZuKGUpO1xyXG59XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IFBpeGlUZXh0SW5wdXQ7XHJcbn0iLCIvKipcclxuICogQGxpY2Vuc2VcclxuICogcGl4aS5qcyAtIHYxLjYuMFxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTItMjAxNCwgTWF0IEdyb3Zlc1xyXG4gKiBodHRwOi8vZ29vZGJveWRpZ2l0YWwuY29tL1xyXG4gKlxyXG4gKiBDb21waWxlZDogMjAxNC0wNy0xOFxyXG4gKlxyXG4gKiBwaXhpLmpzIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cclxuICogaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcclxuICovXHJcbihmdW5jdGlvbigpe3ZhciBhPXRoaXMsYj1ifHx7fTtiLldFQkdMX1JFTkRFUkVSPTAsYi5DQU5WQVNfUkVOREVSRVI9MSxiLlZFUlNJT049XCJ2MS42LjFcIixiLmJsZW5kTW9kZXM9e05PUk1BTDowLEFERDoxLE1VTFRJUExZOjIsU0NSRUVOOjMsT1ZFUkxBWTo0LERBUktFTjo1LExJR0hURU46NixDT0xPUl9ET0RHRTo3LENPTE9SX0JVUk46OCxIQVJEX0xJR0hUOjksU09GVF9MSUdIVDoxMCxESUZGRVJFTkNFOjExLEVYQ0xVU0lPTjoxMixIVUU6MTMsU0FUVVJBVElPTjoxNCxDT0xPUjoxNSxMVU1JTk9TSVRZOjE2fSxiLnNjYWxlTW9kZXM9e0RFRkFVTFQ6MCxMSU5FQVI6MCxORUFSRVNUOjF9LGIuX1VJRD0wLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBGbG9hdDMyQXJyYXk/KGIuRmxvYXQzMkFycmF5PUZsb2F0MzJBcnJheSxiLlVpbnQxNkFycmF5PVVpbnQxNkFycmF5KTooYi5GbG9hdDMyQXJyYXk9QXJyYXksYi5VaW50MTZBcnJheT1BcnJheSksYi5JTlRFUkFDVElPTl9GUkVRVUVOQ1k9MzAsYi5BVVRPX1BSRVZFTlRfREVGQVVMVD0hMCxiLlJBRF9UT19ERUc9MTgwL01hdGguUEksYi5ERUdfVE9fUkFEPU1hdGguUEkvMTgwLGIuZG9udFNheUhlbGxvPSExLGIuc2F5SGVsbG89ZnVuY3Rpb24oYSl7aWYoIWIuZG9udFNheUhlbGxvKXtpZihuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5kZXhPZihcImNocm9tZVwiKT4tMSl7dmFyIGM9W1wiJWMgJWMgJWMgUGl4aS5qcyBcIitiLlZFUlNJT04rXCIgLSBcIithK1wiICAlYyAgJWMgIGh0dHA6Ly93d3cucGl4aWpzLmNvbS8gICVjICVjIOKZpSVj4pmlJWPimaUgXCIsXCJiYWNrZ3JvdW5kOiAjZmY2NmE1XCIsXCJiYWNrZ3JvdW5kOiAjZmY2NmE1XCIsXCJjb2xvcjogI2ZmNjZhNTsgYmFja2dyb3VuZDogIzAzMDMwNztcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImJhY2tncm91bmQ6ICNmZmMzZGNcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImNvbG9yOiAjZmYyNDI0OyBiYWNrZ3JvdW5kOiAjZmZmXCIsXCJjb2xvcjogI2ZmMjQyNDsgYmFja2dyb3VuZDogI2ZmZlwiLFwiY29sb3I6ICNmZjI0MjQ7IGJhY2tncm91bmQ6ICNmZmZcIl07Y29uc29sZS5sb2cuYXBwbHkoY29uc29sZSxjKX1lbHNlIHdpbmRvdy5jb25zb2xlJiZjb25zb2xlLmxvZyhcIlBpeGkuanMgXCIrYi5WRVJTSU9OK1wiIC0gaHR0cDovL3d3dy5waXhpanMuY29tL1wiKTtiLmRvbnRTYXlIZWxsbz0hMH19LGIuUG9pbnQ9ZnVuY3Rpb24oYSxiKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8MH0sYi5Qb2ludC5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUG9pbnQodGhpcy54LHRoaXMueSl9LGIuUG9pbnQucHJvdG90eXBlLnNldD1mdW5jdGlvbihhLGIpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwoMCE9PWI/dGhpcy54OjApfSxiLlBvaW50LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlBvaW50LGIuUmVjdGFuZ2xlPWZ1bmN0aW9uKGEsYixjLGQpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwwLHRoaXMud2lkdGg9Y3x8MCx0aGlzLmhlaWdodD1kfHwwfSxiLlJlY3RhbmdsZS5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUmVjdGFuZ2xlKHRoaXMueCx0aGlzLnksdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuUmVjdGFuZ2xlLnByb3RvdHlwZS5jb250YWlucz1mdW5jdGlvbihhLGIpe2lmKHRoaXMud2lkdGg8PTB8fHRoaXMuaGVpZ2h0PD0wKXJldHVybiExO3ZhciBjPXRoaXMueDtpZihhPj1jJiZhPD1jK3RoaXMud2lkdGgpe3ZhciBkPXRoaXMueTtpZihiPj1kJiZiPD1kK3RoaXMuaGVpZ2h0KXJldHVybiEwfXJldHVybiExfSxiLlJlY3RhbmdsZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5SZWN0YW5nbGUsYi5FbXB0eVJlY3RhbmdsZT1uZXcgYi5SZWN0YW5nbGUoMCwwLDAsMCksYi5Qb2x5Z29uPWZ1bmN0aW9uKGEpe2lmKGEgaW5zdGFuY2VvZiBBcnJheXx8KGE9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSksXCJudW1iZXJcIj09dHlwZW9mIGFbMF0pe2Zvcih2YXIgYz1bXSxkPTAsZT1hLmxlbmd0aDtlPmQ7ZCs9MiljLnB1c2gobmV3IGIuUG9pbnQoYVtkXSxhW2QrMV0pKTthPWN9dGhpcy5wb2ludHM9YX0sYi5Qb2x5Z29uLnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe2Zvcih2YXIgYT1bXSxjPTA7Yzx0aGlzLnBvaW50cy5sZW5ndGg7YysrKWEucHVzaCh0aGlzLnBvaW50c1tjXS5jbG9uZSgpKTtyZXR1cm4gbmV3IGIuUG9seWdvbihhKX0sYi5Qb2x5Z29uLnByb3RvdHlwZS5jb250YWlucz1mdW5jdGlvbihhLGIpe2Zvcih2YXIgYz0hMSxkPTAsZT10aGlzLnBvaW50cy5sZW5ndGgtMTtkPHRoaXMucG9pbnRzLmxlbmd0aDtlPWQrKyl7dmFyIGY9dGhpcy5wb2ludHNbZF0ueCxnPXRoaXMucG9pbnRzW2RdLnksaD10aGlzLnBvaW50c1tlXS54LGk9dGhpcy5wb2ludHNbZV0ueSxqPWc+YiE9aT5iJiYoaC1mKSooYi1nKS8oaS1nKStmPmE7aiYmKGM9IWMpfXJldHVybiBjfSxiLlBvbHlnb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUG9seWdvbixiLkNpcmNsZT1mdW5jdGlvbihhLGIsYyl7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDAsdGhpcy5yYWRpdXM9Y3x8MH0sYi5DaXJjbGUucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLkNpcmNsZSh0aGlzLngsdGhpcy55LHRoaXMucmFkaXVzKX0sYi5DaXJjbGUucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7aWYodGhpcy5yYWRpdXM8PTApcmV0dXJuITE7dmFyIGM9dGhpcy54LWEsZD10aGlzLnktYixlPXRoaXMucmFkaXVzKnRoaXMucmFkaXVzO3JldHVybiBjKj1jLGQqPWQsZT49YytkfSxiLkNpcmNsZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLlJlY3RhbmdsZSh0aGlzLngtdGhpcy5yYWRpdXMsdGhpcy55LXRoaXMucmFkaXVzLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLkNpcmNsZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5DaXJjbGUsYi5FbGxpcHNlPWZ1bmN0aW9uKGEsYixjLGQpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwwLHRoaXMud2lkdGg9Y3x8MCx0aGlzLmhlaWdodD1kfHwwfSxiLkVsbGlwc2UucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLkVsbGlwc2UodGhpcy54LHRoaXMueSx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5FbGxpcHNlLnByb3RvdHlwZS5jb250YWlucz1mdW5jdGlvbihhLGIpe2lmKHRoaXMud2lkdGg8PTB8fHRoaXMuaGVpZ2h0PD0wKXJldHVybiExO3ZhciBjPShhLXRoaXMueCkvdGhpcy53aWR0aCxkPShiLXRoaXMueSkvdGhpcy5oZWlnaHQ7cmV0dXJuIGMqPWMsZCo9ZCwxPj1jK2R9LGIuRWxsaXBzZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLlJlY3RhbmdsZSh0aGlzLngtdGhpcy53aWR0aCx0aGlzLnktdGhpcy5oZWlnaHQsdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuRWxsaXBzZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5FbGxpcHNlLGIuTWF0cml4PWZ1bmN0aW9uKCl7dGhpcy5hPTEsdGhpcy5iPTAsdGhpcy5jPTAsdGhpcy5kPTEsdGhpcy50eD0wLHRoaXMudHk9MH0sYi5NYXRyaXgucHJvdG90eXBlLmZyb21BcnJheT1mdW5jdGlvbihhKXt0aGlzLmE9YVswXSx0aGlzLmI9YVsxXSx0aGlzLmM9YVszXSx0aGlzLmQ9YVs0XSx0aGlzLnR4PWFbMl0sdGhpcy50eT1hWzVdfSxiLk1hdHJpeC5wcm90b3R5cGUudG9BcnJheT1mdW5jdGlvbihhKXt0aGlzLmFycmF5fHwodGhpcy5hcnJheT1uZXcgRmxvYXQzMkFycmF5KDkpKTt2YXIgYj10aGlzLmFycmF5O3JldHVybiBhPyhiWzBdPXRoaXMuYSxiWzFdPXRoaXMuYyxiWzJdPTAsYlszXT10aGlzLmIsYls0XT10aGlzLmQsYls1XT0wLGJbNl09dGhpcy50eCxiWzddPXRoaXMudHksYls4XT0xKTooYlswXT10aGlzLmEsYlsxXT10aGlzLmIsYlsyXT10aGlzLnR4LGJbM109dGhpcy5jLGJbNF09dGhpcy5kLGJbNV09dGhpcy50eSxiWzZdPTAsYls3XT0wLGJbOF09MSksYn0sYi5pZGVudGl0eU1hdHJpeD1uZXcgYi5NYXRyaXgsYi5kZXRlcm1pbmVNYXRyaXhBcnJheVR5cGU9ZnVuY3Rpb24oKXtyZXR1cm5cInVuZGVmaW5lZFwiIT10eXBlb2YgRmxvYXQzMkFycmF5P0Zsb2F0MzJBcnJheTpBcnJheX0sYi5NYXRyaXgyPWIuZGV0ZXJtaW5lTWF0cml4QXJyYXlUeXBlKCksYi5EaXNwbGF5T2JqZWN0PWZ1bmN0aW9uKCl7dGhpcy5wb3NpdGlvbj1uZXcgYi5Qb2ludCx0aGlzLnNjYWxlPW5ldyBiLlBvaW50KDEsMSksdGhpcy5waXZvdD1uZXcgYi5Qb2ludCgwLDApLHRoaXMucm90YXRpb249MCx0aGlzLmFscGhhPTEsdGhpcy52aXNpYmxlPSEwLHRoaXMuaGl0QXJlYT1udWxsLHRoaXMuYnV0dG9uTW9kZT0hMSx0aGlzLnJlbmRlcmFibGU9ITEsdGhpcy5wYXJlbnQ9bnVsbCx0aGlzLnN0YWdlPW51bGwsdGhpcy53b3JsZEFscGhhPTEsdGhpcy5faW50ZXJhY3RpdmU9ITEsdGhpcy5kZWZhdWx0Q3Vyc29yPVwicG9pbnRlclwiLHRoaXMud29ybGRUcmFuc2Zvcm09bmV3IGIuTWF0cml4LHRoaXMuY29sb3I9W10sdGhpcy5keW5hbWljPSEwLHRoaXMuX3NyPTAsdGhpcy5fY3I9MSx0aGlzLmZpbHRlckFyZWE9bnVsbCx0aGlzLl9ib3VuZHM9bmV3IGIuUmVjdGFuZ2xlKDAsMCwxLDEpLHRoaXMuX2N1cnJlbnRCb3VuZHM9bnVsbCx0aGlzLl9tYXNrPW51bGwsdGhpcy5fY2FjaGVBc0JpdG1hcD0hMSx0aGlzLl9jYWNoZUlzRGlydHk9ITF9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5EaXNwbGF5T2JqZWN0LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuc2V0SW50ZXJhY3RpdmU9ZnVuY3Rpb24oYSl7dGhpcy5pbnRlcmFjdGl2ZT1hfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcImludGVyYWN0aXZlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9pbnRlcmFjdGl2ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2ludGVyYWN0aXZlPWEsdGhpcy5zdGFnZSYmKHRoaXMuc3RhZ2UuZGlydHk9ITApfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwid29ybGRWaXNpYmxlXCIse2dldDpmdW5jdGlvbigpe3ZhciBhPXRoaXM7ZG97aWYoIWEudmlzaWJsZSlyZXR1cm4hMTthPWEucGFyZW50fXdoaWxlKGEpO3JldHVybiEwfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwibWFza1wiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFza30sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX21hc2smJih0aGlzLl9tYXNrLmlzTWFzaz0hMSksdGhpcy5fbWFzaz1hLHRoaXMuX21hc2smJih0aGlzLl9tYXNrLmlzTWFzaz0hMCl9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJmaWx0ZXJzXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9maWx0ZXJzfSxzZXQ6ZnVuY3Rpb24oYSl7aWYoYSl7Zm9yKHZhciBiPVtdLGM9MDtjPGEubGVuZ3RoO2MrKylmb3IodmFyIGQ9YVtjXS5wYXNzZXMsZT0wO2U8ZC5sZW5ndGg7ZSsrKWIucHVzaChkW2VdKTt0aGlzLl9maWx0ZXJCbG9jaz17dGFyZ2V0OnRoaXMsZmlsdGVyUGFzc2VzOmJ9fXRoaXMuX2ZpbHRlcnM9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcImNhY2hlQXNCaXRtYXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2NhY2hlQXNCaXRtYXB9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9jYWNoZUFzQml0bWFwIT09YSYmKGE/dGhpcy5fZ2VuZXJhdGVDYWNoZWRTcHJpdGUoKTp0aGlzLl9kZXN0cm95Q2FjaGVkU3ByaXRlKCksdGhpcy5fY2FjaGVBc0JpdG1hcD1hKX19KSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3RoaXMucm90YXRpb24hPT10aGlzLnJvdGF0aW9uQ2FjaGUmJih0aGlzLnJvdGF0aW9uQ2FjaGU9dGhpcy5yb3RhdGlvbix0aGlzLl9zcj1NYXRoLnNpbih0aGlzLnJvdGF0aW9uKSx0aGlzLl9jcj1NYXRoLmNvcyh0aGlzLnJvdGF0aW9uKSk7dmFyIGE9dGhpcy5wYXJlbnQud29ybGRUcmFuc2Zvcm0sYj10aGlzLndvcmxkVHJhbnNmb3JtLGM9dGhpcy5waXZvdC54LGQ9dGhpcy5waXZvdC55LGU9dGhpcy5fY3IqdGhpcy5zY2FsZS54LGY9LXRoaXMuX3NyKnRoaXMuc2NhbGUueSxnPXRoaXMuX3NyKnRoaXMuc2NhbGUueCxoPXRoaXMuX2NyKnRoaXMuc2NhbGUueSxpPXRoaXMucG9zaXRpb24ueC1lKmMtZCpmLGo9dGhpcy5wb3NpdGlvbi55LWgqZC1jKmcsaz1hLmEsbD1hLmIsbT1hLmMsbj1hLmQ7Yi5hPWsqZStsKmcsYi5iPWsqZitsKmgsYi50eD1rKmkrbCpqK2EudHgsYi5jPW0qZStuKmcsYi5kPW0qZituKmgsYi50eT1tKmkrbipqK2EudHksdGhpcy53b3JsZEFscGhhPXRoaXMuYWxwaGEqdGhpcy5wYXJlbnQud29ybGRBbHBoYX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oYSl7cmV0dXJuIGE9YSxiLkVtcHR5UmVjdGFuZ2xlfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLmdldExvY2FsQm91bmRzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0Qm91bmRzKGIuaWRlbnRpdHlNYXRyaXgpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnNldFN0YWdlUmVmZXJlbmNlPWZ1bmN0aW9uKGEpe3RoaXMuc3RhZ2U9YSx0aGlzLl9pbnRlcmFjdGl2ZSYmKHRoaXMuc3RhZ2UuZGlydHk9ITApfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLmdlbmVyYXRlVGV4dHVyZT1mdW5jdGlvbihhKXt2YXIgYz10aGlzLmdldExvY2FsQm91bmRzKCksZD1uZXcgYi5SZW5kZXJUZXh0dXJlKDB8Yy53aWR0aCwwfGMuaGVpZ2h0LGEpO3JldHVybiBkLnJlbmRlcih0aGlzLG5ldyBiLlBvaW50KC1jLngsLWMueSkpLGR9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlQ2FjaGU9ZnVuY3Rpb24oKXt0aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9yZW5kZXJDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oYSl7dGhpcy5fY2FjaGVkU3ByaXRlLndvcmxkQWxwaGE9dGhpcy53b3JsZEFscGhhLGEuZ2w/Yi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTC5jYWxsKHRoaXMuX2NhY2hlZFNwcml0ZSxhKTpiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlckNhbnZhcy5jYWxsKHRoaXMuX2NhY2hlZFNwcml0ZSxhKX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5fZ2VuZXJhdGVDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oKXt0aGlzLl9jYWNoZUFzQml0bWFwPSExO3ZhciBhPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKTtpZih0aGlzLl9jYWNoZWRTcHJpdGUpdGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUucmVzaXplKDB8YS53aWR0aCwwfGEuaGVpZ2h0KTtlbHNle3ZhciBjPW5ldyBiLlJlbmRlclRleHR1cmUoMHxhLndpZHRoLDB8YS5oZWlnaHQpO3RoaXMuX2NhY2hlZFNwcml0ZT1uZXcgYi5TcHJpdGUoYyksdGhpcy5fY2FjaGVkU3ByaXRlLndvcmxkVHJhbnNmb3JtPXRoaXMud29ybGRUcmFuc2Zvcm19dmFyIGQ9dGhpcy5fZmlsdGVyczt0aGlzLl9maWx0ZXJzPW51bGwsdGhpcy5fY2FjaGVkU3ByaXRlLmZpbHRlcnM9ZCx0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5yZW5kZXIodGhpcyxuZXcgYi5Qb2ludCgtYS54LC1hLnkpKSx0aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLng9LShhLngvYS53aWR0aCksdGhpcy5fY2FjaGVkU3ByaXRlLmFuY2hvci55PS0oYS55L2EuaGVpZ2h0KSx0aGlzLl9maWx0ZXJzPWQsdGhpcy5fY2FjaGVBc0JpdG1hcD0hMH0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5fZGVzdHJveUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3RoaXMuX2NhY2hlZFNwcml0ZSYmKHRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLmRlc3Ryb3koITApLHRoaXMuX2NhY2hlZFNwcml0ZT1udWxsKX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7YT1hfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7YT1hfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcInhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucG9zaXRpb24ueH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMucG9zaXRpb24ueD1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwieVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wb3NpdGlvbi55fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5wb3NpdGlvbi55PWF9fSksYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyPWZ1bmN0aW9uKCl7Yi5EaXNwbGF5T2JqZWN0LmNhbGwodGhpcyksdGhpcy5jaGlsZHJlbj1bXX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUpLGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbGUueCp0aGlzLmdldExvY2FsQm91bmRzKCkud2lkdGh9LHNldDpmdW5jdGlvbihhKXt2YXIgYj10aGlzLmdldExvY2FsQm91bmRzKCkud2lkdGg7dGhpcy5zY2FsZS54PTAhPT1iP2EvKGIvdGhpcy5zY2FsZS54KToxLHRoaXMuX3dpZHRoPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUsXCJoZWlnaHRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbGUueSp0aGlzLmdldExvY2FsQm91bmRzKCkuaGVpZ2h0fSxzZXQ6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5nZXRMb2NhbEJvdW5kcygpLmhlaWdodDt0aGlzLnNjYWxlLnk9MCE9PWI/YS8oYi90aGlzLnNjYWxlLnkpOjEsdGhpcy5faGVpZ2h0PWF9fSksYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5hZGRDaGlsZD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5hZGRDaGlsZEF0KGEsdGhpcy5jaGlsZHJlbi5sZW5ndGgpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmFkZENoaWxkQXQ9ZnVuY3Rpb24oYSxiKXtpZihiPj0wJiZiPD10aGlzLmNoaWxkcmVuLmxlbmd0aClyZXR1cm4gYS5wYXJlbnQmJmEucGFyZW50LnJlbW92ZUNoaWxkKGEpLGEucGFyZW50PXRoaXMsdGhpcy5jaGlsZHJlbi5zcGxpY2UoYiwwLGEpLHRoaXMuc3RhZ2UmJmEuc2V0U3RhZ2VSZWZlcmVuY2UodGhpcy5zdGFnZSksYTt0aHJvdyBuZXcgRXJyb3IoYStcIiBUaGUgaW5kZXggXCIrYitcIiBzdXBwbGllZCBpcyBvdXQgb2YgYm91bmRzIFwiK3RoaXMuY2hpbGRyZW4ubGVuZ3RoKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5zd2FwQ2hpbGRyZW49ZnVuY3Rpb24oYSxiKXtpZihhIT09Yil7dmFyIGM9dGhpcy5jaGlsZHJlbi5pbmRleE9mKGEpLGQ9dGhpcy5jaGlsZHJlbi5pbmRleE9mKGIpO2lmKDA+Y3x8MD5kKXRocm93IG5ldyBFcnJvcihcInN3YXBDaGlsZHJlbjogQm90aCB0aGUgc3VwcGxpZWQgRGlzcGxheU9iamVjdHMgbXVzdCBiZSBhIGNoaWxkIG9mIHRoZSBjYWxsZXIuXCIpO3RoaXMuY2hpbGRyZW5bY109Yix0aGlzLmNoaWxkcmVuW2RdPWF9fSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmdldENoaWxkQXQ9ZnVuY3Rpb24oYSl7aWYoYT49MCYmYTx0aGlzLmNoaWxkcmVuLmxlbmd0aClyZXR1cm4gdGhpcy5jaGlsZHJlblthXTt0aHJvdyBuZXcgRXJyb3IoXCJTdXBwbGllZCBpbmRleCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgY2hpbGQgbGlzdCwgb3IgdGhlIHN1cHBsaWVkIERpc3BsYXlPYmplY3QgbXVzdCBiZSBhIGNoaWxkIG9mIHRoZSBjYWxsZXJcIil9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUucmVtb3ZlQ2hpbGQ9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMucmVtb3ZlQ2hpbGRBdCh0aGlzLmNoaWxkcmVuLmluZGV4T2YoYSkpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZUNoaWxkQXQ9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5nZXRDaGlsZEF0KGEpO3JldHVybiB0aGlzLnN0YWdlJiZiLnJlbW92ZVN0YWdlUmVmZXJlbmNlKCksYi5wYXJlbnQ9dm9pZCAwLHRoaXMuY2hpbGRyZW4uc3BsaWNlKGEsMSksYn0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5yZW1vdmVDaGlsZHJlbj1mdW5jdGlvbihhLGIpe3ZhciBjPWF8fDAsZD1cIm51bWJlclwiPT10eXBlb2YgYj9iOnRoaXMuY2hpbGRyZW4ubGVuZ3RoLGU9ZC1jO2lmKGU+MCYmZD49ZSl7Zm9yKHZhciBmPXRoaXMuY2hpbGRyZW4uc3BsaWNlKGMsZSksZz0wO2c8Zi5sZW5ndGg7ZysrKXt2YXIgaD1mW2ddO3RoaXMuc3RhZ2UmJmgucmVtb3ZlU3RhZ2VSZWZlcmVuY2UoKSxoLnBhcmVudD12b2lkIDB9cmV0dXJuIGZ9dGhyb3cgbmV3IEVycm9yKFwiUmFuZ2UgRXJyb3IsIG51bWVyaWMgdmFsdWVzIGFyZSBvdXRzaWRlIHRoZSBhY2NlcHRhYmxlIHJhbmdlXCIpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe2lmKHRoaXMudmlzaWJsZSYmKGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyksIXRoaXMuX2NhY2hlQXNCaXRtYXApKWZvcih2YXIgYT0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5hO2ErKyl0aGlzLmNoaWxkcmVuW2FdLnVwZGF0ZVRyYW5zZm9ybSgpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbihhKXtpZigwPT09dGhpcy5jaGlsZHJlbi5sZW5ndGgpcmV0dXJuIGIuRW1wdHlSZWN0YW5nbGU7aWYoYSl7dmFyIGM9dGhpcy53b3JsZFRyYW5zZm9ybTt0aGlzLndvcmxkVHJhbnNmb3JtPWEsdGhpcy51cGRhdGVUcmFuc2Zvcm0oKSx0aGlzLndvcmxkVHJhbnNmb3JtPWN9Zm9yKHZhciBkLGUsZixnPTEvMCxoPTEvMCxpPS0xLzAsaj0tMS8wLGs9ITEsbD0wLG09dGhpcy5jaGlsZHJlbi5sZW5ndGg7bT5sO2wrKyl7dmFyIG49dGhpcy5jaGlsZHJlbltsXTtuLnZpc2libGUmJihrPSEwLGQ9dGhpcy5jaGlsZHJlbltsXS5nZXRCb3VuZHMoYSksZz1nPGQueD9nOmQueCxoPWg8ZC55P2g6ZC55LGU9ZC53aWR0aCtkLngsZj1kLmhlaWdodCtkLnksaT1pPmU/aTplLGo9aj5mP2o6Zil9aWYoIWspcmV0dXJuIGIuRW1wdHlSZWN0YW5nbGU7dmFyIG89dGhpcy5fYm91bmRzO3JldHVybiBvLng9ZyxvLnk9aCxvLndpZHRoPWktZyxvLmhlaWdodD1qLWgsb30sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5nZXRMb2NhbEJvdW5kcz1mdW5jdGlvbigpe3ZhciBhPXRoaXMud29ybGRUcmFuc2Zvcm07dGhpcy53b3JsZFRyYW5zZm9ybT1iLmlkZW50aXR5TWF0cml4O2Zvcih2YXIgYz0wLGQ9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZD5jO2MrKyl0aGlzLmNoaWxkcmVuW2NdLnVwZGF0ZVRyYW5zZm9ybSgpO3ZhciBlPXRoaXMuZ2V0Qm91bmRzKCk7cmV0dXJuIHRoaXMud29ybGRUcmFuc2Zvcm09YSxlfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnNldFN0YWdlUmVmZXJlbmNlPWZ1bmN0aW9uKGEpe3RoaXMuc3RhZ2U9YSx0aGlzLl9pbnRlcmFjdGl2ZSYmKHRoaXMuc3RhZ2UuZGlydHk9ITApO2Zvcih2YXIgYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl7dmFyIGQ9dGhpcy5jaGlsZHJlbltiXTtkLnNldFN0YWdlUmVmZXJlbmNlKGEpfX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5yZW1vdmVTdGFnZVJlZmVyZW5jZT1mdW5jdGlvbigpe2Zvcih2YXIgYT0wLGI9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yj5hO2ErKyl7dmFyIGM9dGhpcy5jaGlsZHJlblthXTtjLnJlbW92ZVN0YWdlUmVmZXJlbmNlKCl9dGhpcy5faW50ZXJhY3RpdmUmJih0aGlzLnN0YWdlLmRpcnR5PSEwKSx0aGlzLnN0YWdlPW51bGx9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSYmISh0aGlzLmFscGhhPD0wKSl7aWYodGhpcy5fY2FjaGVBc0JpdG1hcClyZXR1cm4gdGhpcy5fcmVuZGVyQ2FjaGVkU3ByaXRlKGEpLHZvaWQgMDt2YXIgYixjO2lmKHRoaXMuX21hc2t8fHRoaXMuX2ZpbHRlcnMpe2Zvcih0aGlzLl9maWx0ZXJzJiYoYS5zcHJpdGVCYXRjaC5mbHVzaCgpLGEuZmlsdGVyTWFuYWdlci5wdXNoRmlsdGVyKHRoaXMuX2ZpbHRlckJsb2NrKSksdGhpcy5fbWFzayYmKGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5tYXNrLGEpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKSksYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKTthLnNwcml0ZUJhdGNoLnN0b3AoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2sodGhpcy5fbWFzayxhKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucG9wRmlsdGVyKCksYS5zcHJpdGVCYXRjaC5zdGFydCgpfWVsc2UgZm9yKGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspdGhpcy5jaGlsZHJlbltiXS5fcmVuZGVyV2ViR0woYSl9fSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhKXtpZih0aGlzLl9jYWNoZUFzQml0bWFwKXJldHVybiB0aGlzLl9yZW5kZXJDYWNoZWRTcHJpdGUoYSksdm9pZCAwO3RoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhLmNvbnRleHQpO2Zvcih2YXIgYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl7dmFyIGQ9dGhpcy5jaGlsZHJlbltiXTtkLl9yZW5kZXJDYW52YXMoYSl9dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCl9fSxiLlNwcml0ZT1mdW5jdGlvbihhKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLmFuY2hvcj1uZXcgYi5Qb2ludCx0aGlzLnRleHR1cmU9YSx0aGlzLl93aWR0aD0wLHRoaXMuX2hlaWdodD0wLHRoaXMudGludD0xNjc3NzIxNSx0aGlzLmJsZW5kTW9kZT1iLmJsZW5kTW9kZXMuTk9STUFMLGEuYmFzZVRleHR1cmUuaGFzTG9hZGVkP3RoaXMub25UZXh0dXJlVXBkYXRlKCk6KHRoaXMub25UZXh0dXJlVXBkYXRlQmluZD10aGlzLm9uVGV4dHVyZVVwZGF0ZS5iaW5kKHRoaXMpLHRoaXMudGV4dHVyZS5hZGRFdmVudExpc3RlbmVyKFwidXBkYXRlXCIsdGhpcy5vblRleHR1cmVVcGRhdGVCaW5kKSksdGhpcy5yZW5kZXJhYmxlPSEwfSxiLlNwcml0ZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlNwcml0ZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcHJpdGUsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuU3ByaXRlLnByb3RvdHlwZSxcIndpZHRoXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYWxlLngqdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRofSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5zY2FsZS54PWEvdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoLHRoaXMuX3dpZHRoPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuU3ByaXRlLnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS55KnRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLnk9YS90aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0LHRoaXMuX2hlaWdodD1hfX0pLGIuU3ByaXRlLnByb3RvdHlwZS5zZXRUZXh0dXJlPWZ1bmN0aW9uKGEpe3RoaXMudGV4dHVyZT1hLHRoaXMuY2FjaGVkVGludD0xNjc3NzIxNX0sYi5TcHJpdGUucHJvdG90eXBlLm9uVGV4dHVyZVVwZGF0ZT1mdW5jdGlvbigpe3RoaXMuX3dpZHRoJiYodGhpcy5zY2FsZS54PXRoaXMuX3dpZHRoL3RoaXMudGV4dHVyZS5mcmFtZS53aWR0aCksdGhpcy5faGVpZ2h0JiYodGhpcy5zY2FsZS55PXRoaXMuX2hlaWdodC90aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0KX0sYi5TcHJpdGUucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbihhKXt2YXIgYj10aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsYz10aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0LGQ9YiooMS10aGlzLmFuY2hvci54KSxlPWIqLXRoaXMuYW5jaG9yLngsZj1jKigxLXRoaXMuYW5jaG9yLnkpLGc9YyotdGhpcy5hbmNob3IueSxoPWF8fHRoaXMud29ybGRUcmFuc2Zvcm0saT1oLmEsaj1oLmMsaz1oLmIsbD1oLmQsbT1oLnR4LG49aC50eSxvPWkqZStrKmcrbSxwPWwqZytqKmUrbixxPWkqZCtrKmcrbSxyPWwqZytqKmQrbixzPWkqZCtrKmYrbSx0PWwqZitqKmQrbix1PWkqZStrKmYrbSx2PWwqZitqKmUrbix3PS0xLzAseD0tMS8wLHk9MS8wLHo9MS8wO3k9eT5vP286eSx5PXk+cT9xOnkseT15PnM/czp5LHk9eT51P3U6eSx6PXo+cD9wOnosej16PnI/cjp6LHo9ej50P3Q6eix6PXo+dj92Onosdz1vPnc/bzp3LHc9cT53P3E6dyx3PXM+dz9zOncsdz11Pnc/dTp3LHg9cD54P3A6eCx4PXI+eD9yOngseD10Png/dDp4LHg9dj54P3Y6eDt2YXIgQT10aGlzLl9ib3VuZHM7cmV0dXJuIEEueD15LEEud2lkdGg9dy15LEEueT16LEEuaGVpZ2h0PXgteix0aGlzLl9jdXJyZW50Qm91bmRzPUEsQX0sYi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUmJiEodGhpcy5hbHBoYTw9MCkpe3ZhciBiLGM7aWYodGhpcy5fbWFza3x8dGhpcy5fZmlsdGVycyl7dmFyIGQ9YS5zcHJpdGVCYXRjaDtmb3IodGhpcy5fZmlsdGVycyYmKGQuZmx1c2goKSxhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jaykpLHRoaXMuX21hc2smJihkLnN0b3AoKSxhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMubWFzayxhKSxkLnN0YXJ0KCkpLGQucmVuZGVyKHRoaXMpLGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspdGhpcy5jaGlsZHJlbltiXS5fcmVuZGVyV2ViR0woYSk7ZC5zdG9wKCksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKHRoaXMuX21hc2ssYSksdGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnBvcEZpbHRlcigpLGQuc3RhcnQoKX1lbHNlIGZvcihhLnNwcml0ZUJhdGNoLnJlbmRlcih0aGlzKSxiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXRoaXMuY2hpbGRyZW5bYl0uX3JlbmRlcldlYkdMKGEpfX0sYi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhKXtpZih0aGlzLmJsZW5kTW9kZSE9PWEuY3VycmVudEJsZW5kTW9kZSYmKGEuY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZSxhLmNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPWIuYmxlbmRNb2Rlc0NhbnZhc1thLmN1cnJlbnRCbGVuZE1vZGVdKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMuX21hc2ssYS5jb250ZXh0KSx0aGlzLnRleHR1cmUudmFsaWQpe2EuY29udGV4dC5nbG9iYWxBbHBoYT10aGlzLndvcmxkQWxwaGEsYS5yb3VuZFBpeGVscz9hLmNvbnRleHQuc2V0VHJhbnNmb3JtKHRoaXMud29ybGRUcmFuc2Zvcm0uYSx0aGlzLndvcmxkVHJhbnNmb3JtLmMsdGhpcy53b3JsZFRyYW5zZm9ybS5iLHRoaXMud29ybGRUcmFuc2Zvcm0uZCwwfHRoaXMud29ybGRUcmFuc2Zvcm0udHgsMHx0aGlzLndvcmxkVHJhbnNmb3JtLnR5KTphLmNvbnRleHQuc2V0VHJhbnNmb3JtKHRoaXMud29ybGRUcmFuc2Zvcm0uYSx0aGlzLndvcmxkVHJhbnNmb3JtLmMsdGhpcy53b3JsZFRyYW5zZm9ybS5iLHRoaXMud29ybGRUcmFuc2Zvcm0uZCx0aGlzLndvcmxkVHJhbnNmb3JtLnR4LHRoaXMud29ybGRUcmFuc2Zvcm0udHkpLGEuc21vb3RoUHJvcGVydHkmJmEuc2NhbGVNb2RlIT09dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLnNjYWxlTW9kZSYmKGEuc2NhbGVNb2RlPXRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5zY2FsZU1vZGUsYS5jb250ZXh0W2Euc21vb3RoUHJvcGVydHldPWEuc2NhbGVNb2RlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUik7dmFyIGM9dGhpcy50ZXh0dXJlLnRyaW0/dGhpcy50ZXh0dXJlLnRyaW0ueC10aGlzLmFuY2hvci54KnRoaXMudGV4dHVyZS50cmltLndpZHRoOnRoaXMuYW5jaG9yLngqLXRoaXMudGV4dHVyZS5mcmFtZS53aWR0aCxkPXRoaXMudGV4dHVyZS50cmltP3RoaXMudGV4dHVyZS50cmltLnktdGhpcy5hbmNob3IueSp0aGlzLnRleHR1cmUudHJpbS5oZWlnaHQ6dGhpcy5hbmNob3IueSotdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodDsxNjc3NzIxNSE9PXRoaXMudGludD8odGhpcy5jYWNoZWRUaW50IT09dGhpcy50aW50JiYodGhpcy5jYWNoZWRUaW50PXRoaXMudGludCx0aGlzLnRpbnRlZFRleHR1cmU9Yi5DYW52YXNUaW50ZXIuZ2V0VGludGVkVGV4dHVyZSh0aGlzLHRoaXMudGludCkpLGEuY29udGV4dC5kcmF3SW1hZ2UodGhpcy50aW50ZWRUZXh0dXJlLDAsMCx0aGlzLnRleHR1cmUuY3JvcC53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQsYyxkLHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCkpOmEuY29udGV4dC5kcmF3SW1hZ2UodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZSx0aGlzLnRleHR1cmUuY3JvcC54LHRoaXMudGV4dHVyZS5jcm9wLnksdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0LGMsZCx0aGlzLnRleHR1cmUuY3JvcC53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQpfWZvcih2YXIgZT0wLGY9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Zj5lO2UrKyl0aGlzLmNoaWxkcmVuW2VdLl9yZW5kZXJDYW52YXMoYSk7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCl9fSxiLlNwcml0ZS5mcm9tRnJhbWU9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5UZXh0dXJlQ2FjaGVbYV07aWYoIWMpdGhyb3cgbmV3IEVycm9yKCdUaGUgZnJhbWVJZCBcIicrYSsnXCIgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHRleHR1cmUgY2FjaGUnK3RoaXMpO3JldHVybiBuZXcgYi5TcHJpdGUoYyl9LGIuU3ByaXRlLmZyb21JbWFnZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5UZXh0dXJlLmZyb21JbWFnZShhLGMsZCk7cmV0dXJuIG5ldyBiLlNwcml0ZShlKX0sYi5TcHJpdGVCYXRjaD1mdW5jdGlvbihhKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLnRleHR1cmVUaGluZz1hLHRoaXMucmVhZHk9ITF9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TcHJpdGVCYXRjaC5jb25zdHJ1Y3Rvcj1iLlNwcml0ZUJhdGNoLGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLmluaXRXZWJHTD1mdW5jdGlvbihhKXt0aGlzLmZhc3RTcHJpdGVCYXRjaD1uZXcgYi5XZWJHTEZhc3RTcHJpdGVCYXRjaChhKSx0aGlzLnJlYWR5PSEwfSxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXtiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfSxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7IXRoaXMudmlzaWJsZXx8dGhpcy5hbHBoYTw9MHx8IXRoaXMuY2hpbGRyZW4ubGVuZ3RofHwodGhpcy5yZWFkeXx8dGhpcy5pbml0V2ViR0woYS5nbCksYS5zcHJpdGVCYXRjaC5zdG9wKCksYS5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihhLnNoYWRlck1hbmFnZXIuZmFzdFNoYWRlciksdGhpcy5mYXN0U3ByaXRlQmF0Y2guYmVnaW4odGhpcyxhKSx0aGlzLmZhc3RTcHJpdGVCYXRjaC5yZW5kZXIodGhpcyksYS5zcHJpdGVCYXRjaC5zdGFydCgpKX0sYi5TcHJpdGVCYXRjaC5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXt2YXIgYz1hLmNvbnRleHQ7Yy5nbG9iYWxBbHBoYT10aGlzLndvcmxkQWxwaGEsYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKTtmb3IodmFyIGQ9dGhpcy53b3JsZFRyYW5zZm9ybSxlPSEwLGY9MDtmPHRoaXMuY2hpbGRyZW4ubGVuZ3RoO2YrKyl7dmFyIGc9dGhpcy5jaGlsZHJlbltmXTtpZihnLnZpc2libGUpe3ZhciBoPWcudGV4dHVyZSxpPWguZnJhbWU7aWYoYy5nbG9iYWxBbHBoYT10aGlzLndvcmxkQWxwaGEqZy5hbHBoYSxnLnJvdGF0aW9uJSgyKk1hdGguUEkpPT09MCllJiYoYy5zZXRUcmFuc2Zvcm0oZC5hLGQuYyxkLmIsZC5kLGQudHgsZC50eSksZT0hMSksYy5kcmF3SW1hZ2UoaC5iYXNlVGV4dHVyZS5zb3VyY2UsaS54LGkueSxpLndpZHRoLGkuaGVpZ2h0LGcuYW5jaG9yLngqLWkud2lkdGgqZy5zY2FsZS54K2cucG9zaXRpb24ueCsuNXwwLGcuYW5jaG9yLnkqLWkuaGVpZ2h0Kmcuc2NhbGUueStnLnBvc2l0aW9uLnkrLjV8MCxpLndpZHRoKmcuc2NhbGUueCxpLmhlaWdodCpnLnNjYWxlLnkpO2Vsc2V7ZXx8KGU9ITApLGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwoZyk7dmFyIGo9Zy53b3JsZFRyYW5zZm9ybTthLnJvdW5kUGl4ZWxzP2Muc2V0VHJhbnNmb3JtKGouYSxqLmMsai5iLGouZCwwfGoudHgsMHxqLnR5KTpjLnNldFRyYW5zZm9ybShqLmEsai5jLGouYixqLmQsai50eCxqLnR5KSxjLmRyYXdJbWFnZShoLmJhc2VUZXh0dXJlLnNvdXJjZSxpLngsaS55LGkud2lkdGgsaS5oZWlnaHQsZy5hbmNob3IueCotaS53aWR0aCsuNXwwLGcuYW5jaG9yLnkqLWkuaGVpZ2h0Ky41fDAsaS53aWR0aCxpLmhlaWdodCl9fX19LGIuTW92aWVDbGlwPWZ1bmN0aW9uKGEpe2IuU3ByaXRlLmNhbGwodGhpcyxhWzBdKSx0aGlzLnRleHR1cmVzPWEsdGhpcy5hbmltYXRpb25TcGVlZD0xLHRoaXMubG9vcD0hMCx0aGlzLm9uQ29tcGxldGU9bnVsbCx0aGlzLmN1cnJlbnRGcmFtZT0wLHRoaXMucGxheWluZz0hMX0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5TcHJpdGUucHJvdG90eXBlKSxiLk1vdmllQ2xpcC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Nb3ZpZUNsaXAsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuTW92aWVDbGlwLnByb3RvdHlwZSxcInRvdGFsRnJhbWVzXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRleHR1cmVzLmxlbmd0aH19KSxiLk1vdmllQ2xpcC5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMucGxheWluZz0hMX0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlLnBsYXk9ZnVuY3Rpb24oKXt0aGlzLnBsYXlpbmc9ITB9LGIuTW92aWVDbGlwLnByb3RvdHlwZS5nb3RvQW5kU3RvcD1mdW5jdGlvbihhKXt0aGlzLnBsYXlpbmc9ITEsdGhpcy5jdXJyZW50RnJhbWU9YTt2YXIgYj10aGlzLmN1cnJlbnRGcmFtZSsuNXwwO3RoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzW2IldGhpcy50ZXh0dXJlcy5sZW5ndGhdKX0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlLmdvdG9BbmRQbGF5PWZ1bmN0aW9uKGEpe3RoaXMuY3VycmVudEZyYW1lPWEsdGhpcy5wbGF5aW5nPSEwfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7aWYoYi5TcHJpdGUucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpLHRoaXMucGxheWluZyl7dGhpcy5jdXJyZW50RnJhbWUrPXRoaXMuYW5pbWF0aW9uU3BlZWQ7dmFyIGE9dGhpcy5jdXJyZW50RnJhbWUrLjV8MDt0aGlzLmN1cnJlbnRGcmFtZT10aGlzLmN1cnJlbnRGcmFtZSV0aGlzLnRleHR1cmVzLmxlbmd0aCx0aGlzLmxvb3B8fGE8dGhpcy50ZXh0dXJlcy5sZW5ndGg/dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbYSV0aGlzLnRleHR1cmVzLmxlbmd0aF0pOmE+PXRoaXMudGV4dHVyZXMubGVuZ3RoJiYodGhpcy5nb3RvQW5kU3RvcCh0aGlzLnRleHR1cmVzLmxlbmd0aC0xKSx0aGlzLm9uQ29tcGxldGUmJnRoaXMub25Db21wbGV0ZSgpKX19LGIuTW92aWVDbGlwLmZyb21GcmFtZXM9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGEubGVuZ3RoO2QrKyljLnB1c2gobmV3IGIuVGV4dHVyZS5mcm9tRnJhbWUoYVtkXSkpO3JldHVybiBuZXcgYi5Nb3ZpZUNsaXAoYyl9LGIuTW92aWVDbGlwLmZyb21JbWFnZXM9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGEubGVuZ3RoO2QrKyljLnB1c2gobmV3IGIuVGV4dHVyZS5mcm9tSW1hZ2UoYVtkXSkpO3JldHVybiBuZXcgYi5Nb3ZpZUNsaXAoYyl9LGIuRmlsdGVyQmxvY2s9ZnVuY3Rpb24oKXt0aGlzLnZpc2libGU9ITAsdGhpcy5yZW5kZXJhYmxlPSEwfSxiLlRleHQ9ZnVuY3Rpb24oYSxjKXt0aGlzLmNhbnZhcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLHRoaXMuY29udGV4dD10aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiksYi5TcHJpdGUuY2FsbCh0aGlzLGIuVGV4dHVyZS5mcm9tQ2FudmFzKHRoaXMuY2FudmFzKSksdGhpcy5zZXRUZXh0KGEpLHRoaXMuc2V0U3R5bGUoYyl9LGIuVGV4dC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlNwcml0ZS5wcm90b3R5cGUpLGIuVGV4dC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5UZXh0LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlRleHQucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZGlydHkmJih0aGlzLnVwZGF0ZVRleHQoKSx0aGlzLmRpcnR5PSExKSx0aGlzLnNjYWxlLngqdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRofSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5zY2FsZS54PWEvdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoLHRoaXMuX3dpZHRoPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVGV4dC5wcm90b3R5cGUsXCJoZWlnaHRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZGlydHkmJih0aGlzLnVwZGF0ZVRleHQoKSx0aGlzLmRpcnR5PSExKSx0aGlzLnNjYWxlLnkqdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuc2NhbGUueT1hL3RoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQsdGhpcy5faGVpZ2h0PWF9fSksYi5UZXh0LnByb3RvdHlwZS5zZXRTdHlsZT1mdW5jdGlvbihhKXthPWF8fHt9LGEuZm9udD1hLmZvbnR8fFwiYm9sZCAyMHB0IEFyaWFsXCIsYS5maWxsPWEuZmlsbHx8XCJibGFja1wiLGEuYWxpZ249YS5hbGlnbnx8XCJsZWZ0XCIsYS5zdHJva2U9YS5zdHJva2V8fFwiYmxhY2tcIixhLnN0cm9rZVRoaWNrbmVzcz1hLnN0cm9rZVRoaWNrbmVzc3x8MCxhLndvcmRXcmFwPWEud29yZFdyYXB8fCExLGEud29yZFdyYXBXaWR0aD1hLndvcmRXcmFwV2lkdGh8fDEwMCxhLndvcmRXcmFwV2lkdGg9YS53b3JkV3JhcFdpZHRofHwxMDAsYS5kcm9wU2hhZG93PWEuZHJvcFNoYWRvd3x8ITEsYS5kcm9wU2hhZG93QW5nbGU9YS5kcm9wU2hhZG93QW5nbGV8fE1hdGguUEkvNixhLmRyb3BTaGFkb3dEaXN0YW5jZT1hLmRyb3BTaGFkb3dEaXN0YW5jZXx8NCxhLmRyb3BTaGFkb3dDb2xvcj1hLmRyb3BTaGFkb3dDb2xvcnx8XCJibGFja1wiLHRoaXMuc3R5bGU9YSx0aGlzLmRpcnR5PSEwfSxiLlRleHQucHJvdG90eXBlLnNldFRleHQ9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0PWEudG9TdHJpbmcoKXx8XCIgXCIsdGhpcy5kaXJ0eT0hMH0sYi5UZXh0LnByb3RvdHlwZS51cGRhdGVUZXh0PWZ1bmN0aW9uKCl7dGhpcy5jb250ZXh0LmZvbnQ9dGhpcy5zdHlsZS5mb250O3ZhciBhPXRoaXMudGV4dDt0aGlzLnN0eWxlLndvcmRXcmFwJiYoYT10aGlzLndvcmRXcmFwKHRoaXMudGV4dCkpO2Zvcih2YXIgYj1hLnNwbGl0KC8oPzpcXHJcXG58XFxyfFxcbikvKSxjPVtdLGQ9MCxlPTA7ZTxiLmxlbmd0aDtlKyspe3ZhciBmPXRoaXMuY29udGV4dC5tZWFzdXJlVGV4dChiW2VdKS53aWR0aDtjW2VdPWYsZD1NYXRoLm1heChkLGYpfXZhciBnPWQrdGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3M7dGhpcy5zdHlsZS5kcm9wU2hhZG93JiYoZys9dGhpcy5zdHlsZS5kcm9wU2hhZG93RGlzdGFuY2UpLHRoaXMuY2FudmFzLndpZHRoPWcrdGhpcy5jb250ZXh0LmxpbmVXaWR0aDt2YXIgaD10aGlzLmRldGVybWluZUZvbnRIZWlnaHQoXCJmb250OiBcIit0aGlzLnN0eWxlLmZvbnQrXCI7XCIpK3RoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLGk9aCpiLmxlbmd0aDt0aGlzLnN0eWxlLmRyb3BTaGFkb3cmJihpKz10aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZSksdGhpcy5jYW52YXMuaGVpZ2h0PWksbmF2aWdhdG9yLmlzQ29jb29uSlMmJnRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCksdGhpcy5jb250ZXh0LmZvbnQ9dGhpcy5zdHlsZS5mb250LHRoaXMuY29udGV4dC5zdHJva2VTdHlsZT10aGlzLnN0eWxlLnN0cm9rZSx0aGlzLmNvbnRleHQubGluZVdpZHRoPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLHRoaXMuY29udGV4dC50ZXh0QmFzZWxpbmU9XCJ0b3BcIjt2YXIgaixrO2lmKHRoaXMuc3R5bGUuZHJvcFNoYWRvdyl7dGhpcy5jb250ZXh0LmZpbGxTdHlsZT10aGlzLnN0eWxlLmRyb3BTaGFkb3dDb2xvcjt2YXIgbD1NYXRoLnNpbih0aGlzLnN0eWxlLmRyb3BTaGFkb3dBbmdsZSkqdGhpcy5zdHlsZS5kcm9wU2hhZG93RGlzdGFuY2UsbT1NYXRoLmNvcyh0aGlzLnN0eWxlLmRyb3BTaGFkb3dBbmdsZSkqdGhpcy5zdHlsZS5kcm9wU2hhZG93RGlzdGFuY2U7Zm9yKGU9MDtlPGIubGVuZ3RoO2UrKylqPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIsaz10aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcy8yK2UqaCxcInJpZ2h0XCI9PT10aGlzLnN0eWxlLmFsaWduP2orPWQtY1tlXTpcImNlbnRlclwiPT09dGhpcy5zdHlsZS5hbGlnbiYmKGorPShkLWNbZV0pLzIpLHRoaXMuc3R5bGUuZmlsbCYmdGhpcy5jb250ZXh0LmZpbGxUZXh0KGJbZV0saitsLGsrbSl9Zm9yKHRoaXMuY29udGV4dC5maWxsU3R5bGU9dGhpcy5zdHlsZS5maWxsLGU9MDtlPGIubGVuZ3RoO2UrKylqPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIsaz10aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcy8yK2UqaCxcInJpZ2h0XCI9PT10aGlzLnN0eWxlLmFsaWduP2orPWQtY1tlXTpcImNlbnRlclwiPT09dGhpcy5zdHlsZS5hbGlnbiYmKGorPShkLWNbZV0pLzIpLHRoaXMuc3R5bGUuc3Ryb2tlJiZ0aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcyYmdGhpcy5jb250ZXh0LnN0cm9rZVRleHQoYltlXSxqLGspLHRoaXMuc3R5bGUuZmlsbCYmdGhpcy5jb250ZXh0LmZpbGxUZXh0KGJbZV0saixrKTt0aGlzLnVwZGF0ZVRleHR1cmUoKX0sYi5UZXh0LnByb3RvdHlwZS51cGRhdGVUZXh0dXJlPWZ1bmN0aW9uKCl7dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLndpZHRoPXRoaXMuY2FudmFzLndpZHRoLHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0LHRoaXMudGV4dHVyZS5jcm9wLndpZHRoPXRoaXMudGV4dHVyZS5mcmFtZS53aWR0aD10aGlzLmNhbnZhcy53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQ9dGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodD10aGlzLmNhbnZhcy5oZWlnaHQsdGhpcy5fd2lkdGg9dGhpcy5jYW52YXMud2lkdGgsdGhpcy5faGVpZ2h0PXRoaXMuY2FudmFzLmhlaWdodCx0aGlzLnJlcXVpcmVzVXBkYXRlPSEwfSxiLlRleHQucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXt0aGlzLnJlcXVpcmVzVXBkYXRlJiYodGhpcy5yZXF1aXJlc1VwZGF0ZT0hMSxiLnVwZGF0ZVdlYkdMVGV4dHVyZSh0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUsYS5nbCkpLGIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0wuY2FsbCh0aGlzLGEpfSxiLlRleHQucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3RoaXMuZGlydHkmJih0aGlzLnVwZGF0ZVRleHQoKSx0aGlzLmRpcnR5PSExKSxiLlNwcml0ZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuVGV4dC5wcm90b3R5cGUuZGV0ZXJtaW5lRm9udEhlaWdodD1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHQuaGVpZ2h0Q2FjaGVbYV07aWYoIWMpe3ZhciBkPWRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXSxlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksZj1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIk1cIik7ZS5hcHBlbmRDaGlsZChmKSxlLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsYStcIjtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtsZWZ0OjBcIiksZC5hcHBlbmRDaGlsZChlKSxjPWUub2Zmc2V0SGVpZ2h0LGIuVGV4dC5oZWlnaHRDYWNoZVthXT1jLGQucmVtb3ZlQ2hpbGQoZSl9cmV0dXJuIGN9LGIuVGV4dC5wcm90b3R5cGUud29yZFdyYXA9ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPVwiXCIsYz1hLnNwbGl0KFwiXFxuXCIpLGQ9MDtkPGMubGVuZ3RoO2QrKyl7Zm9yKHZhciBlPXRoaXMuc3R5bGUud29yZFdyYXBXaWR0aCxmPWNbZF0uc3BsaXQoXCIgXCIpLGc9MDtnPGYubGVuZ3RoO2crKyl7dmFyIGg9dGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KGZbZ10pLndpZHRoLGk9aCt0aGlzLmNvbnRleHQubWVhc3VyZVRleHQoXCIgXCIpLndpZHRoOzA9PT1nfHxpPmU/KGc+MCYmKGIrPVwiXFxuXCIpLGIrPWZbZ10sZT10aGlzLnN0eWxlLndvcmRXcmFwV2lkdGgtaCk6KGUtPWksYis9XCIgXCIrZltnXSl9ZDxjLmxlbmd0aC0xJiYoYis9XCJcXG5cIil9cmV0dXJuIGJ9LGIuVGV4dC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbihhKXt0aGlzLmNvbnRleHQ9bnVsbCx0aGlzLmNhbnZhcz1udWxsLHRoaXMudGV4dHVyZS5kZXN0cm95KHZvaWQgMD09PWE/ITA6YSl9LGIuVGV4dC5oZWlnaHRDYWNoZT17fSxiLkJpdG1hcFRleHQ9ZnVuY3Rpb24oYSxjKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLl9wb29sPVtdLHRoaXMuc2V0VGV4dChhKSx0aGlzLnNldFN0eWxlKGMpLHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITF9LGIuQml0bWFwVGV4dC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLkJpdG1hcFRleHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQml0bWFwVGV4dCxiLkJpdG1hcFRleHQucHJvdG90eXBlLnNldFRleHQ9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0PWF8fFwiIFwiLHRoaXMuZGlydHk9ITB9LGIuQml0bWFwVGV4dC5wcm90b3R5cGUuc2V0U3R5bGU9ZnVuY3Rpb24oYSl7YT1hfHx7fSxhLmFsaWduPWEuYWxpZ258fFwibGVmdFwiLHRoaXMuc3R5bGU9YTt2YXIgYz1hLmZvbnQuc3BsaXQoXCIgXCIpO3RoaXMuZm9udE5hbWU9Y1tjLmxlbmd0aC0xXSx0aGlzLmZvbnRTaXplPWMubGVuZ3RoPj0yP3BhcnNlSW50KGNbYy5sZW5ndGgtMl0sMTApOmIuQml0bWFwVGV4dC5mb250c1t0aGlzLmZvbnROYW1lXS5zaXplLHRoaXMuZGlydHk9ITAsdGhpcy50aW50PWEudGludH0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZS51cGRhdGVUZXh0PWZ1bmN0aW9uKCl7Zm9yKHZhciBhPWIuQml0bWFwVGV4dC5mb250c1t0aGlzLmZvbnROYW1lXSxjPW5ldyBiLlBvaW50LGQ9bnVsbCxlPVtdLGY9MCxnPVtdLGg9MCxpPXRoaXMuZm9udFNpemUvYS5zaXplLGo9MDtqPHRoaXMudGV4dC5sZW5ndGg7aisrKXt2YXIgaz10aGlzLnRleHQuY2hhckNvZGVBdChqKTtpZigvKD86XFxyXFxufFxccnxcXG4pLy50ZXN0KHRoaXMudGV4dC5jaGFyQXQoaikpKWcucHVzaChjLngpLGY9TWF0aC5tYXgoZixjLngpLGgrKyxjLng9MCxjLnkrPWEubGluZUhlaWdodCxkPW51bGw7ZWxzZXt2YXIgbD1hLmNoYXJzW2tdO2wmJihkJiZsW2RdJiYoYy54Kz1sLmtlcm5pbmdbZF0pLGUucHVzaCh7dGV4dHVyZTpsLnRleHR1cmUsbGluZTpoLGNoYXJDb2RlOmsscG9zaXRpb246bmV3IGIuUG9pbnQoYy54K2wueE9mZnNldCxjLnkrbC55T2Zmc2V0KX0pLGMueCs9bC54QWR2YW5jZSxkPWspfX1nLnB1c2goYy54KSxmPU1hdGgubWF4KGYsYy54KTt2YXIgbT1bXTtmb3Ioaj0wO2g+PWo7aisrKXt2YXIgbj0wO1wicmlnaHRcIj09PXRoaXMuc3R5bGUuYWxpZ24/bj1mLWdbal06XCJjZW50ZXJcIj09PXRoaXMuc3R5bGUuYWxpZ24mJihuPShmLWdbal0pLzIpLG0ucHVzaChuKX12YXIgbz10aGlzLmNoaWxkcmVuLmxlbmd0aCxwPWUubGVuZ3RoLHE9dGhpcy50aW50fHwxNjc3NzIxNTtmb3Ioaj0wO3A+ajtqKyspe3ZhciByPW8+aj90aGlzLmNoaWxkcmVuW2pdOnRoaXMuX3Bvb2wucG9wKCk7cj9yLnNldFRleHR1cmUoZVtqXS50ZXh0dXJlKTpyPW5ldyBiLlNwcml0ZShlW2pdLnRleHR1cmUpLHIucG9zaXRpb24ueD0oZVtqXS5wb3NpdGlvbi54K21bZVtqXS5saW5lXSkqaSxyLnBvc2l0aW9uLnk9ZVtqXS5wb3NpdGlvbi55Kmksci5zY2FsZS54PXIuc2NhbGUueT1pLHIudGludD1xLHIucGFyZW50fHx0aGlzLmFkZENoaWxkKHIpfWZvcig7dGhpcy5jaGlsZHJlbi5sZW5ndGg+cDspe3ZhciBzPXRoaXMuZ2V0Q2hpbGRBdCh0aGlzLmNoaWxkcmVuLmxlbmd0aC0xKTt0aGlzLl9wb29sLnB1c2gocyksdGhpcy5yZW1vdmVDaGlsZChzKX10aGlzLnRleHRXaWR0aD1mKmksdGhpcy50ZXh0SGVpZ2h0PShjLnkrYS5saW5lSGVpZ2h0KSppfSxiLkJpdG1hcFRleHQucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3RoaXMuZGlydHkmJih0aGlzLnVwZGF0ZVRleHQoKSx0aGlzLmRpcnR5PSExKSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfSxiLkJpdG1hcFRleHQuZm9udHM9e30sYi5JbnRlcmFjdGlvbkRhdGE9ZnVuY3Rpb24oKXt0aGlzLmdsb2JhbD1uZXcgYi5Qb2ludCx0aGlzLnRhcmdldD1udWxsLHRoaXMub3JpZ2luYWxFdmVudD1udWxsfSxiLkludGVyYWN0aW9uRGF0YS5wcm90b3R5cGUuZ2V0TG9jYWxQb3NpdGlvbj1mdW5jdGlvbihhKXt2YXIgYz1hLndvcmxkVHJhbnNmb3JtLGQ9dGhpcy5nbG9iYWwsZT1jLmEsZj1jLmIsZz1jLnR4LGg9Yy5jLGk9Yy5kLGo9Yy50eSxrPTEvKGUqaStmKi1oKTtyZXR1cm4gbmV3IGIuUG9pbnQoaSprKmQueCstZiprKmQueSsoaipmLWcqaSkqayxlKmsqZC55Ky1oKmsqZC54KygtaiplK2cqaCkqayl9LGIuSW50ZXJhY3Rpb25EYXRhLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkludGVyYWN0aW9uRGF0YSxiLkludGVyYWN0aW9uTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLnN0YWdlPWEsdGhpcy5tb3VzZT1uZXcgYi5JbnRlcmFjdGlvbkRhdGEsdGhpcy50b3VjaHM9e30sdGhpcy50ZW1wUG9pbnQ9bmV3IGIuUG9pbnQsdGhpcy5tb3VzZW92ZXJFbmFibGVkPSEwLHRoaXMucG9vbD1bXSx0aGlzLmludGVyYWN0aXZlSXRlbXM9W10sdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQ9bnVsbCx0aGlzLm9uTW91c2VNb3ZlPXRoaXMub25Nb3VzZU1vdmUuYmluZCh0aGlzKSx0aGlzLm9uTW91c2VEb3duPXRoaXMub25Nb3VzZURvd24uYmluZCh0aGlzKSx0aGlzLm9uTW91c2VPdXQ9dGhpcy5vbk1vdXNlT3V0LmJpbmQodGhpcyksdGhpcy5vbk1vdXNlVXA9dGhpcy5vbk1vdXNlVXAuYmluZCh0aGlzKSx0aGlzLm9uVG91Y2hTdGFydD10aGlzLm9uVG91Y2hTdGFydC5iaW5kKHRoaXMpLHRoaXMub25Ub3VjaEVuZD10aGlzLm9uVG91Y2hFbmQuYmluZCh0aGlzKSx0aGlzLm9uVG91Y2hNb3ZlPXRoaXMub25Ub3VjaE1vdmUuYmluZCh0aGlzKSx0aGlzLmxhc3Q9MCx0aGlzLmN1cnJlbnRDdXJzb3JTdHlsZT1cImluaGVyaXRcIix0aGlzLm1vdXNlT3V0PSExfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5JbnRlcmFjdGlvbk1hbmFnZXIsYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLmNvbGxlY3RJbnRlcmFjdGl2ZVNwcml0ZT1mdW5jdGlvbihhLGIpe2Zvcih2YXIgYz1hLmNoaWxkcmVuLGQ9Yy5sZW5ndGgsZT1kLTE7ZT49MDtlLS0pe3ZhciBmPWNbZV07Zi5faW50ZXJhY3RpdmU/KGIuaW50ZXJhY3RpdmVDaGlsZHJlbj0hMCx0aGlzLmludGVyYWN0aXZlSXRlbXMucHVzaChmKSxmLmNoaWxkcmVuLmxlbmd0aD4wJiZ0aGlzLmNvbGxlY3RJbnRlcmFjdGl2ZVNwcml0ZShmLGYpKTooZi5fX2lQYXJlbnQ9bnVsbCxmLmNoaWxkcmVuLmxlbmd0aD4wJiZ0aGlzLmNvbGxlY3RJbnRlcmFjdGl2ZVNwcml0ZShmLGIpKX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5zZXRUYXJnZXQ9ZnVuY3Rpb24oYSl7dGhpcy50YXJnZXQ9YSxudWxsPT09dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQmJnRoaXMuc2V0VGFyZ2V0RG9tRWxlbWVudChhLnZpZXcpfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuc2V0VGFyZ2V0RG9tRWxlbWVudD1mdW5jdGlvbihhKXt0aGlzLnJlbW92ZUV2ZW50cygpLHdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZCYmKGEuc3R5bGVbXCItbXMtY29udGVudC16b29taW5nXCJdPVwibm9uZVwiLGEuc3R5bGVbXCItbXMtdG91Y2gtYWN0aW9uXCJdPVwibm9uZVwiKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudD1hLGEuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLHRoaXMub25Nb3VzZU1vdmUsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLHRoaXMub25Nb3VzZURvd24sITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3V0XCIsdGhpcy5vbk1vdXNlT3V0LCEwKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsdGhpcy5vblRvdWNoU3RhcnQsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsdGhpcy5vblRvdWNoRW5kLCEwKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIix0aGlzLm9uVG91Y2hNb3ZlLCEwKSx3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIix0aGlzLm9uTW91c2VVcCwhMCl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5yZW1vdmVFdmVudHM9ZnVuY3Rpb24oKXt0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudCYmKHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnN0eWxlW1wiLW1zLWNvbnRlbnQtem9vbWluZ1wiXT1cIlwiLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnN0eWxlW1wiLW1zLXRvdWNoLWFjdGlvblwiXT1cIlwiLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIix0aGlzLm9uTW91c2VNb3ZlLCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5vbk1vdXNlRG93biwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3V0XCIsdGhpcy5vbk1vdXNlT3V0LCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLHRoaXMub25Ub3VjaFN0YXJ0LCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIix0aGlzLm9uVG91Y2hFbmQsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIix0aGlzLm9uVG91Y2hNb3ZlLCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudD1udWxsLHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLHRoaXMub25Nb3VzZVVwLCEwKSl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24oKXtpZih0aGlzLnRhcmdldCl7dmFyIGE9RGF0ZS5ub3coKSxjPWEtdGhpcy5sYXN0O2lmKGM9YypiLklOVEVSQUNUSU9OX0ZSRVFVRU5DWS8xZTMsISgxPmMpKXt0aGlzLmxhc3Q9YTt2YXIgZD0wO3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKTt2YXIgZT10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGY9XCJpbmhlcml0XCIsZz0hMTtmb3IoZD0wO2U+ZDtkKyspe3ZhciBoPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tkXTtoLl9faGl0PXRoaXMuaGl0VGVzdChoLHRoaXMubW91c2UpLHRoaXMubW91c2UudGFyZ2V0PWgsaC5fX2hpdCYmIWc/KGguYnV0dG9uTW9kZSYmKGY9aC5kZWZhdWx0Q3Vyc29yKSxoLmludGVyYWN0aXZlQ2hpbGRyZW58fChnPSEwKSxoLl9faXNPdmVyfHwoaC5tb3VzZW92ZXImJmgubW91c2VvdmVyKHRoaXMubW91c2UpLGguX19pc092ZXI9ITApKTpoLl9faXNPdmVyJiYoaC5tb3VzZW91dCYmaC5tb3VzZW91dCh0aGlzLm1vdXNlKSxoLl9faXNPdmVyPSExKX10aGlzLmN1cnJlbnRDdXJzb3JTdHlsZSE9PWYmJih0aGlzLmN1cnJlbnRDdXJzb3JTdHlsZT1mLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnN0eWxlLmN1cnNvcj1mKX19fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUucmVidWlsZEludGVyYWN0aXZlR3JhcGg9ZnVuY3Rpb24oKXt0aGlzLmRpcnR5PSExO2Zvcih2YXIgYT10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGI9MDthPmI7YisrKXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tiXS5pbnRlcmFjdGl2ZUNoaWxkcmVuPSExO3RoaXMuaW50ZXJhY3RpdmVJdGVtcz1bXSx0aGlzLnN0YWdlLmludGVyYWN0aXZlJiZ0aGlzLmludGVyYWN0aXZlSXRlbXMucHVzaCh0aGlzLnN0YWdlKSx0aGlzLmNvbGxlY3RJbnRlcmFjdGl2ZVNwcml0ZSh0aGlzLnN0YWdlLHRoaXMuc3RhZ2UpfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Nb3VzZU1vdmU9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpLHRoaXMubW91c2Uub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQ7dmFyIGI9dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7dGhpcy5tb3VzZS5nbG9iYWwueD0oYS5jbGllbnRYLWIubGVmdCkqKHRoaXMudGFyZ2V0LndpZHRoL2Iud2lkdGgpLHRoaXMubW91c2UuZ2xvYmFsLnk9KGEuY2xpZW50WS1iLnRvcCkqKHRoaXMudGFyZ2V0LmhlaWdodC9iLmhlaWdodCk7Zm9yKHZhciBjPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsZD0wO2M+ZDtkKyspe3ZhciBlPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tkXTtlLm1vdXNlbW92ZSYmZS5tb3VzZW1vdmUodGhpcy5tb3VzZSl9fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Nb3VzZURvd249ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpLHRoaXMubW91c2Uub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsYi5BVVRPX1BSRVZFTlRfREVGQVVMVCYmdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7Zm9yKHZhciBjPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsZD0wO2M+ZDtkKyspe3ZhciBlPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tkXTtpZigoZS5tb3VzZWRvd258fGUuY2xpY2spJiYoZS5fX21vdXNlSXNEb3duPSEwLGUuX19oaXQ9dGhpcy5oaXRUZXN0KGUsdGhpcy5tb3VzZSksZS5fX2hpdCYmKGUubW91c2Vkb3duJiZlLm1vdXNlZG93bih0aGlzLm1vdXNlKSxlLl9faXNEb3duPSEwLCFlLmludGVyYWN0aXZlQ2hpbGRyZW4pKSlicmVha319LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlT3V0PWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBhPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGg7dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGUuY3Vyc29yPVwiaW5oZXJpdFwiO2Zvcih2YXIgYj0wO2E+YjtiKyspe3ZhciBjPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tiXTtjLl9faXNPdmVyJiYodGhpcy5tb3VzZS50YXJnZXQ9YyxjLm1vdXNlb3V0JiZjLm1vdXNlb3V0KHRoaXMubW91c2UpLGMuX19pc092ZXI9ITEpfXRoaXMubW91c2VPdXQ9ITAsdGhpcy5tb3VzZS5nbG9iYWwueD0tMWU0LHRoaXMubW91c2UuZ2xvYmFsLnk9LTFlNH0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uTW91c2VVcD1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCksdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudDtcclxuZm9yKHZhciBiPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsYz0hMSxkPTA7Yj5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2UuX19oaXQ9dGhpcy5oaXRUZXN0KGUsdGhpcy5tb3VzZSksZS5fX2hpdCYmIWM/KGUubW91c2V1cCYmZS5tb3VzZXVwKHRoaXMubW91c2UpLGUuX19pc0Rvd24mJmUuY2xpY2smJmUuY2xpY2sodGhpcy5tb3VzZSksZS5pbnRlcmFjdGl2ZUNoaWxkcmVufHwoYz0hMCkpOmUuX19pc0Rvd24mJmUubW91c2V1cG91dHNpZGUmJmUubW91c2V1cG91dHNpZGUodGhpcy5tb3VzZSksZS5fX2lzRG93bj0hMX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5oaXRUZXN0PWZ1bmN0aW9uKGEsYyl7dmFyIGQ9Yy5nbG9iYWw7aWYoIWEud29ybGRWaXNpYmxlKXJldHVybiExO3ZhciBlPWEgaW5zdGFuY2VvZiBiLlNwcml0ZSxmPWEud29ybGRUcmFuc2Zvcm0sZz1mLmEsaD1mLmIsaT1mLnR4LGo9Zi5jLGs9Zi5kLGw9Zi50eSxtPTEvKGcqaytoKi1qKSxuPWsqbSpkLngrLWgqbSpkLnkrKGwqaC1pKmspKm0sbz1nKm0qZC55Ky1qKm0qZC54KygtbCpnK2kqaikqbTtpZihjLnRhcmdldD1hLGEuaGl0QXJlYSYmYS5oaXRBcmVhLmNvbnRhaW5zKXJldHVybiBhLmhpdEFyZWEuY29udGFpbnMobixvKT8oYy50YXJnZXQ9YSwhMCk6ITE7aWYoZSl7dmFyIHAscT1hLnRleHR1cmUuZnJhbWUud2lkdGgscj1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0LHM9LXEqYS5hbmNob3IueDtpZihuPnMmJnMrcT5uJiYocD0tciphLmFuY2hvci55LG8+cCYmcCtyPm8pKXJldHVybiBjLnRhcmdldD1hLCEwfWZvcih2YXIgdD1hLmNoaWxkcmVuLmxlbmd0aCx1PTA7dD51O3UrKyl7dmFyIHY9YS5jaGlsZHJlblt1XSx3PXRoaXMuaGl0VGVzdCh2LGMpO2lmKHcpcmV0dXJuIGMudGFyZ2V0PWEsITB9cmV0dXJuITF9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vblRvdWNoTW92ZT1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGIsYz10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxkPWEuY2hhbmdlZFRvdWNoZXMsZT0wO2ZvcihlPTA7ZTxkLmxlbmd0aDtlKyspe3ZhciBmPWRbZV07Yj10aGlzLnRvdWNoc1tmLmlkZW50aWZpZXJdLGIub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsYi5nbG9iYWwueD0oZi5jbGllbnRYLWMubGVmdCkqKHRoaXMudGFyZ2V0LndpZHRoL2Mud2lkdGgpLGIuZ2xvYmFsLnk9KGYuY2xpZW50WS1jLnRvcCkqKHRoaXMudGFyZ2V0LmhlaWdodC9jLmhlaWdodCksbmF2aWdhdG9yLmlzQ29jb29uSlMmJihiLmdsb2JhbC54PWYuY2xpZW50WCxiLmdsb2JhbC55PWYuY2xpZW50WSk7Zm9yKHZhciBnPTA7Zzx0aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoO2crKyl7dmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2ddO2gudG91Y2htb3ZlJiZoLl9fdG91Y2hEYXRhJiZoLl9fdG91Y2hEYXRhW2YuaWRlbnRpZmllcl0mJmgudG91Y2htb3ZlKGIpfX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vblRvdWNoU3RhcnQ9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBjPXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO2IuQVVUT19QUkVWRU5UX0RFRkFVTFQmJmEucHJldmVudERlZmF1bHQoKTtmb3IodmFyIGQ9YS5jaGFuZ2VkVG91Y2hlcyxlPTA7ZTxkLmxlbmd0aDtlKyspe3ZhciBmPWRbZV0sZz10aGlzLnBvb2wucG9wKCk7Z3x8KGc9bmV3IGIuSW50ZXJhY3Rpb25EYXRhKSxnLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50LHRoaXMudG91Y2hzW2YuaWRlbnRpZmllcl09ZyxnLmdsb2JhbC54PShmLmNsaWVudFgtYy5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYy53aWR0aCksZy5nbG9iYWwueT0oZi5jbGllbnRZLWMudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2MuaGVpZ2h0KSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmKGcuZ2xvYmFsLng9Zi5jbGllbnRYLGcuZ2xvYmFsLnk9Zi5jbGllbnRZKTtmb3IodmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxpPTA7aD5pO2krKyl7dmFyIGo9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2ldO2lmKChqLnRvdWNoc3RhcnR8fGoudGFwKSYmKGouX19oaXQ9dGhpcy5oaXRUZXN0KGosZyksai5fX2hpdCYmKGoudG91Y2hzdGFydCYmai50b3VjaHN0YXJ0KGcpLGouX19pc0Rvd249ITAsai5fX3RvdWNoRGF0YT1qLl9fdG91Y2hEYXRhfHx7fSxqLl9fdG91Y2hEYXRhW2YuaWRlbnRpZmllcl09Zywhai5pbnRlcmFjdGl2ZUNoaWxkcmVuKSkpYnJlYWt9fX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uVG91Y2hFbmQ9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO2Zvcih2YXIgYj10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxjPWEuY2hhbmdlZFRvdWNoZXMsZD0wO2Q8Yy5sZW5ndGg7ZCsrKXt2YXIgZT1jW2RdLGY9dGhpcy50b3VjaHNbZS5pZGVudGlmaWVyXSxnPSExO2YuZ2xvYmFsLng9KGUuY2xpZW50WC1iLmxlZnQpKih0aGlzLnRhcmdldC53aWR0aC9iLndpZHRoKSxmLmdsb2JhbC55PShlLmNsaWVudFktYi50b3ApKih0aGlzLnRhcmdldC5oZWlnaHQvYi5oZWlnaHQpLG5hdmlnYXRvci5pc0NvY29vbkpTJiYoZi5nbG9iYWwueD1lLmNsaWVudFgsZi5nbG9iYWwueT1lLmNsaWVudFkpO2Zvcih2YXIgaD10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGk9MDtoPmk7aSsrKXt2YXIgaj10aGlzLmludGVyYWN0aXZlSXRlbXNbaV07ai5fX3RvdWNoRGF0YSYmai5fX3RvdWNoRGF0YVtlLmlkZW50aWZpZXJdJiYoai5fX2hpdD10aGlzLmhpdFRlc3QoaixqLl9fdG91Y2hEYXRhW2UuaWRlbnRpZmllcl0pLGYub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsKGoudG91Y2hlbmR8fGoudGFwKSYmKGouX19oaXQmJiFnPyhqLnRvdWNoZW5kJiZqLnRvdWNoZW5kKGYpLGouX19pc0Rvd24mJmoudGFwJiZqLnRhcChmKSxqLmludGVyYWN0aXZlQ2hpbGRyZW58fChnPSEwKSk6ai5fX2lzRG93biYmai50b3VjaGVuZG91dHNpZGUmJmoudG91Y2hlbmRvdXRzaWRlKGYpLGouX19pc0Rvd249ITEpLGouX190b3VjaERhdGFbZS5pZGVudGlmaWVyXT1udWxsKX10aGlzLnBvb2wucHVzaChmKSx0aGlzLnRvdWNoc1tlLmlkZW50aWZpZXJdPW51bGx9fSxiLlN0YWdlPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMud29ybGRUcmFuc2Zvcm09bmV3IGIuTWF0cml4LHRoaXMuaW50ZXJhY3RpdmU9ITAsdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXI9bmV3IGIuSW50ZXJhY3Rpb25NYW5hZ2VyKHRoaXMpLHRoaXMuZGlydHk9ITAsdGhpcy5zdGFnZT10aGlzLHRoaXMuc3RhZ2UuaGl0QXJlYT1uZXcgYi5SZWN0YW5nbGUoMCwwLDFlNSwxZTUpLHRoaXMuc2V0QmFja2dyb3VuZENvbG9yKGEpfSxiLlN0YWdlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3RhZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3RhZ2UsYi5TdGFnZS5wcm90b3R5cGUuc2V0SW50ZXJhY3Rpb25EZWxlZ2F0ZT1mdW5jdGlvbihhKXt0aGlzLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXREb21FbGVtZW50KGEpfSxiLlN0YWdlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLndvcmxkQWxwaGE9MTtmb3IodmFyIGE9MCxiPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2I+YTthKyspdGhpcy5jaGlsZHJlblthXS51cGRhdGVUcmFuc2Zvcm0oKTt0aGlzLmRpcnR5JiYodGhpcy5kaXJ0eT0hMSx0aGlzLmludGVyYWN0aW9uTWFuYWdlci5kaXJ0eT0hMCksdGhpcy5pbnRlcmFjdGl2ZSYmdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXIudXBkYXRlKCl9LGIuU3RhZ2UucHJvdG90eXBlLnNldEJhY2tncm91bmRDb2xvcj1mdW5jdGlvbihhKXt0aGlzLmJhY2tncm91bmRDb2xvcj1hfHwwLHRoaXMuYmFja2dyb3VuZENvbG9yU3BsaXQ9Yi5oZXgycmdiKHRoaXMuYmFja2dyb3VuZENvbG9yKTt2YXIgYz10aGlzLmJhY2tncm91bmRDb2xvci50b1N0cmluZygxNik7Yz1cIjAwMDAwMFwiLnN1YnN0cigwLDYtYy5sZW5ndGgpK2MsdGhpcy5iYWNrZ3JvdW5kQ29sb3JTdHJpbmc9XCIjXCIrY30sYi5TdGFnZS5wcm90b3R5cGUuZ2V0TW91c2VQb3NpdGlvbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmludGVyYWN0aW9uTWFuYWdlci5tb3VzZS5nbG9iYWx9O2Zvcih2YXIgYz0wLGQ9W1wibXNcIixcIm1velwiLFwid2Via2l0XCIsXCJvXCJdLGU9MDtlPGQubGVuZ3RoJiYhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsrK2Upd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZT13aW5kb3dbZFtlXStcIlJlcXVlc3RBbmltYXRpb25GcmFtZVwiXSx3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU9d2luZG93W2RbZV0rXCJDYW5jZWxBbmltYXRpb25GcmFtZVwiXXx8d2luZG93W2RbZV0rXCJDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcIl07d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZXx8KHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU9ZnVuY3Rpb24oYSl7dmFyIGI9KG5ldyBEYXRlKS5nZXRUaW1lKCksZD1NYXRoLm1heCgwLDE2LShiLWMpKSxlPXdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7YShiK2QpfSxkKTtyZXR1cm4gYz1iK2QsZX0pLHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZXx8KHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZT1mdW5jdGlvbihhKXtjbGVhclRpbWVvdXQoYSl9KSx3aW5kb3cucmVxdWVzdEFuaW1GcmFtZT13aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLGIuaGV4MnJnYj1mdW5jdGlvbihhKXtyZXR1cm5bKGE+PjE2JjI1NSkvMjU1LChhPj44JjI1NSkvMjU1LCgyNTUmYSkvMjU1XX0sYi5yZ2IyaGV4PWZ1bmN0aW9uKGEpe3JldHVybigyNTUqYVswXTw8MTYpKygyNTUqYVsxXTw8OCkrMjU1KmFbMl19LFwiZnVuY3Rpb25cIiE9dHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kJiYoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQ9ZnVuY3Rpb24oKXt2YXIgYT1BcnJheS5wcm90b3R5cGUuc2xpY2U7cmV0dXJuIGZ1bmN0aW9uKGIpe2Z1bmN0aW9uIGMoKXt2YXIgZj1lLmNvbmNhdChhLmNhbGwoYXJndW1lbnRzKSk7ZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgYz90aGlzOmIsZil9dmFyIGQ9dGhpcyxlPWEuY2FsbChhcmd1bWVudHMsMSk7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZCl0aHJvdyBuZXcgVHlwZUVycm9yO3JldHVybiBjLnByb3RvdHlwZT1mdW5jdGlvbiBmKGEpe3JldHVybiBhJiYoZi5wcm90b3R5cGU9YSksdGhpcyBpbnN0YW5jZW9mIGY/dm9pZCAwOm5ldyBmfShkLnByb3RvdHlwZSksY319KCkpLGIuQWpheFJlcXVlc3Q9ZnVuY3Rpb24oKXt2YXIgYT1bXCJNc3htbDIuWE1MSFRUUC42LjBcIixcIk1zeG1sMi5YTUxIVFRQLjMuMFwiLFwiTWljcm9zb2Z0LlhNTEhUVFBcIl07aWYoIXdpbmRvdy5BY3RpdmVYT2JqZWN0KXJldHVybiB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q/bmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDohMTtmb3IodmFyIGI9MDtiPGEubGVuZ3RoO2IrKyl0cnl7cmV0dXJuIG5ldyB3aW5kb3cuQWN0aXZlWE9iamVjdChhW2JdKX1jYXRjaChjKXt9fSxiLmNhblVzZU5ld0NhbnZhc0JsZW5kTW9kZXM9ZnVuY3Rpb24oKXt2YXIgYT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO2Eud2lkdGg9MSxhLmhlaWdodD0xO3ZhciBiPWEuZ2V0Q29udGV4dChcIjJkXCIpO3JldHVybiBiLmZpbGxTdHlsZT1cIiMwMDBcIixiLmZpbGxSZWN0KDAsMCwxLDEpLGIuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwibXVsdGlwbHlcIixiLmZpbGxTdHlsZT1cIiNmZmZcIixiLmZpbGxSZWN0KDAsMCwxLDEpLDA9PT1iLmdldEltYWdlRGF0YSgwLDAsMSwxKS5kYXRhWzBdfSxiLmdldE5leHRQb3dlck9mVHdvPWZ1bmN0aW9uKGEpe2lmKGE+MCYmMD09PShhJmEtMSkpcmV0dXJuIGE7Zm9yKHZhciBiPTE7YT5iOyliPDw9MTtyZXR1cm4gYn0sYi5FdmVudFRhcmdldD1mdW5jdGlvbigpe3ZhciBhPXt9O3RoaXMuYWRkRXZlbnRMaXN0ZW5lcj10aGlzLm9uPWZ1bmN0aW9uKGIsYyl7dm9pZCAwPT09YVtiXSYmKGFbYl09W10pLC0xPT09YVtiXS5pbmRleE9mKGMpJiZhW2JdLnVuc2hpZnQoYyl9LHRoaXMuZGlzcGF0Y2hFdmVudD10aGlzLmVtaXQ9ZnVuY3Rpb24oYil7aWYoYVtiLnR5cGVdJiZhW2IudHlwZV0ubGVuZ3RoKWZvcih2YXIgYz1hW2IudHlwZV0ubGVuZ3RoLTE7Yz49MDtjLS0pYVtiLnR5cGVdW2NdKGIpfSx0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXI9dGhpcy5vZmY9ZnVuY3Rpb24oYixjKXtpZih2b2lkIDAhPT1hW2JdKXt2YXIgZD1hW2JdLmluZGV4T2YoYyk7LTEhPT1kJiZhW2JdLnNwbGljZShkLDEpfX0sdGhpcy5yZW1vdmVBbGxFdmVudExpc3RlbmVycz1mdW5jdGlvbihiKXt2YXIgYz1hW2JdO2MmJihjLmxlbmd0aD0wKX19LGIuYXV0b0RldGVjdFJlbmRlcmVyPWZ1bmN0aW9uKGEsYyxkLGUsZil7YXx8KGE9ODAwKSxjfHwoYz02MDApO3ZhciBnPWZ1bmN0aW9uKCl7dHJ5e3ZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7cmV0dXJuISF3aW5kb3cuV2ViR0xSZW5kZXJpbmdDb250ZXh0JiYoYS5nZXRDb250ZXh0KFwid2ViZ2xcIil8fGEuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiKSl9Y2F0Y2goYil7cmV0dXJuITF9fSgpO3JldHVybiBnP25ldyBiLldlYkdMUmVuZGVyZXIoYSxjLGQsZSxmKTpuZXcgYi5DYW52YXNSZW5kZXJlcihhLGMsZCxlKX0sYi5hdXRvRGV0ZWN0UmVjb21tZW5kZWRSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlLGYpe2F8fChhPTgwMCksY3x8KGM9NjAwKTt2YXIgZz1mdW5jdGlvbigpe3RyeXt2YXIgYT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO3JldHVybiEhd2luZG93LldlYkdMUmVuZGVyaW5nQ29udGV4dCYmKGEuZ2V0Q29udGV4dChcIndlYmdsXCIpfHxhLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIikpfWNhdGNoKGIpe3JldHVybiExfX0oKSxoPS9BbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtyZXR1cm4gZyYmIWg/bmV3IGIuV2ViR0xSZW5kZXJlcihhLGMsZCxlLGYpOm5ldyBiLkNhbnZhc1JlbmRlcmVyKGEsYyxkLGUpfSxiLlBvbHlLPXt9LGIuUG9seUsuVHJpYW5ndWxhdGU9ZnVuY3Rpb24oYSl7dmFyIGM9ITAsZD1hLmxlbmd0aD4+MTtpZigzPmQpcmV0dXJuW107Zm9yKHZhciBlPVtdLGY9W10sZz0wO2Q+ZztnKyspZi5wdXNoKGcpO2c9MDtmb3IodmFyIGg9ZDtoPjM7KXt2YXIgaT1mWyhnKzApJWhdLGo9ZlsoZysxKSVoXSxrPWZbKGcrMiklaF0sbD1hWzIqaV0sbT1hWzIqaSsxXSxuPWFbMipqXSxvPWFbMipqKzFdLHA9YVsyKmtdLHE9YVsyKmsrMV0scj0hMTtpZihiLlBvbHlLLl9jb252ZXgobCxtLG4sbyxwLHEsYykpe3I9ITA7Zm9yKHZhciBzPTA7aD5zO3MrKyl7dmFyIHQ9ZltzXTtpZih0IT09aSYmdCE9PWomJnQhPT1rJiZiLlBvbHlLLl9Qb2ludEluVHJpYW5nbGUoYVsyKnRdLGFbMip0KzFdLGwsbSxuLG8scCxxKSl7cj0hMTticmVha319fWlmKHIpZS5wdXNoKGksaixrKSxmLnNwbGljZSgoZysxKSVoLDEpLGgtLSxnPTA7ZWxzZSBpZihnKys+MypoKXtpZighYylyZXR1cm4gd2luZG93LmNvbnNvbGUubG9nKFwiUElYSSBXYXJuaW5nOiBzaGFwZSB0b28gY29tcGxleCB0byBmaWxsXCIpLFtdO2ZvcihlPVtdLGY9W10sZz0wO2Q+ZztnKyspZi5wdXNoKGcpO2c9MCxoPWQsYz0hMX19cmV0dXJuIGUucHVzaChmWzBdLGZbMV0sZlsyXSksZX0sYi5Qb2x5Sy5fUG9pbnRJblRyaWFuZ2xlPWZ1bmN0aW9uKGEsYixjLGQsZSxmLGcsaCl7dmFyIGk9Zy1jLGo9aC1kLGs9ZS1jLGw9Zi1kLG09YS1jLG49Yi1kLG89aSppK2oqaixwPWkqaytqKmwscT1pKm0raipuLHI9ayprK2wqbCxzPWsqbStsKm4sdD0xLyhvKnItcCpwKSx1PShyKnEtcCpzKSp0LHY9KG8qcy1wKnEpKnQ7cmV0dXJuIHU+PTAmJnY+PTAmJjE+dSt2fSxiLlBvbHlLLl9jb252ZXg9ZnVuY3Rpb24oYSxiLGMsZCxlLGYsZyl7cmV0dXJuKGItZCkqKGUtYykrKGMtYSkqKGYtZCk+PTA9PT1nfSxiLmluaXREZWZhdWx0U2hhZGVycz1mdW5jdGlvbigpe30sYi5Db21waWxlVmVydGV4U2hhZGVyPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGIuX0NvbXBpbGVTaGFkZXIoYSxjLGEuVkVSVEVYX1NIQURFUil9LGIuQ29tcGlsZUZyYWdtZW50U2hhZGVyPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGIuX0NvbXBpbGVTaGFkZXIoYSxjLGEuRlJBR01FTlRfU0hBREVSKX0sYi5fQ29tcGlsZVNoYWRlcj1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yi5qb2luKFwiXFxuXCIpLGU9YS5jcmVhdGVTaGFkZXIoYyk7cmV0dXJuIGEuc2hhZGVyU291cmNlKGUsZCksYS5jb21waWxlU2hhZGVyKGUpLGEuZ2V0U2hhZGVyUGFyYW1ldGVyKGUsYS5DT01QSUxFX1NUQVRVUyk/ZTood2luZG93LmNvbnNvbGUubG9nKGEuZ2V0U2hhZGVySW5mb0xvZyhlKSksbnVsbCl9LGIuY29tcGlsZVByb2dyYW09ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWIuQ29tcGlsZUZyYWdtZW50U2hhZGVyKGEsZCksZj1iLkNvbXBpbGVWZXJ0ZXhTaGFkZXIoYSxjKSxnPWEuY3JlYXRlUHJvZ3JhbSgpO3JldHVybiBhLmF0dGFjaFNoYWRlcihnLGYpLGEuYXR0YWNoU2hhZGVyKGcsZSksYS5saW5rUHJvZ3JhbShnKSxhLmdldFByb2dyYW1QYXJhbWV0ZXIoZyxhLkxJTktfU1RBVFVTKXx8d2luZG93LmNvbnNvbGUubG9nKFwiQ291bGQgbm90IGluaXRpYWxpc2Ugc2hhZGVyc1wiKSxnfSxiLlBpeGlTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBsb3dwIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKSAqIHZDb2xvciA7XCIsXCJ9XCJdLHRoaXMudGV4dHVyZUNvdW50PTAsdGhpcy5hdHRyaWJ1dGVzPVtdLHRoaXMuaW5pdCgpfSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjfHxiLlBpeGlTaGFkZXIuZGVmYXVsdFZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy51U2FtcGxlcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidVNhbXBsZXJcIiksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy5kaW1lbnNpb25zPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJkaW1lbnNpb25zXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFUZXh0dXJlQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVRleHR1cmVDb29yZFwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSwtMT09PXRoaXMuY29sb3JBdHRyaWJ1dGUmJih0aGlzLmNvbG9yQXR0cmlidXRlPTIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5hVGV4dHVyZUNvb3JkLHRoaXMuY29sb3JBdHRyaWJ1dGVdO2Zvcih2YXIgZCBpbiB0aGlzLnVuaWZvcm1zKXRoaXMudW5pZm9ybXNbZF0udW5pZm9ybUxvY2F0aW9uPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsZCk7dGhpcy5pbml0VW5pZm9ybXMoKSx0aGlzLnByb2dyYW09Y30sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5pbml0VW5pZm9ybXM9ZnVuY3Rpb24oKXt0aGlzLnRleHR1cmVDb3VudD0xO3ZhciBhLGI9dGhpcy5nbDtmb3IodmFyIGMgaW4gdGhpcy51bmlmb3Jtcyl7YT10aGlzLnVuaWZvcm1zW2NdO3ZhciBkPWEudHlwZTtcInNhbXBsZXIyRFwiPT09ZD8oYS5faW5pdD0hMSxudWxsIT09YS52YWx1ZSYmdGhpcy5pbml0U2FtcGxlcjJEKGEpKTpcIm1hdDJcIj09PWR8fFwibWF0M1wiPT09ZHx8XCJtYXQ0XCI9PT1kPyhhLmdsTWF0cml4PSEwLGEuZ2xWYWx1ZUxlbmd0aD0xLFwibWF0MlwiPT09ZD9hLmdsRnVuYz1iLnVuaWZvcm1NYXRyaXgyZnY6XCJtYXQzXCI9PT1kP2EuZ2xGdW5jPWIudW5pZm9ybU1hdHJpeDNmdjpcIm1hdDRcIj09PWQmJihhLmdsRnVuYz1iLnVuaWZvcm1NYXRyaXg0ZnYpKTooYS5nbEZ1bmM9YltcInVuaWZvcm1cIitkXSxhLmdsVmFsdWVMZW5ndGg9XCIyZlwiPT09ZHx8XCIyaVwiPT09ZD8yOlwiM2ZcIj09PWR8fFwiM2lcIj09PWQ/MzpcIjRmXCI9PT1kfHxcIjRpXCI9PT1kPzQ6MSl9fSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmluaXRTYW1wbGVyMkQ9ZnVuY3Rpb24oYSl7aWYoYS52YWx1ZSYmYS52YWx1ZS5iYXNlVGV4dHVyZSYmYS52YWx1ZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpe3ZhciBiPXRoaXMuZ2w7aWYoYi5hY3RpdmVUZXh0dXJlKGJbXCJURVhUVVJFXCIrdGhpcy50ZXh0dXJlQ291bnRdKSxiLmJpbmRUZXh0dXJlKGIuVEVYVFVSRV8yRCxhLnZhbHVlLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2IuaWRdKSxhLnRleHR1cmVEYXRhKXt2YXIgYz1hLnRleHR1cmVEYXRhLGQ9Yy5tYWdGaWx0ZXI/Yy5tYWdGaWx0ZXI6Yi5MSU5FQVIsZT1jLm1pbkZpbHRlcj9jLm1pbkZpbHRlcjpiLkxJTkVBUixmPWMud3JhcFM/Yy53cmFwUzpiLkNMQU1QX1RPX0VER0UsZz1jLndyYXBUP2Mud3JhcFQ6Yi5DTEFNUF9UT19FREdFLGg9Yy5sdW1pbmFuY2U/Yi5MVU1JTkFOQ0U6Yi5SR0JBO2lmKGMucmVwZWF0JiYoZj1iLlJFUEVBVCxnPWIuUkVQRUFUKSxiLnBpeGVsU3RvcmVpKGIuVU5QQUNLX0ZMSVBfWV9XRUJHTCwhIWMuZmxpcFkpLGMud2lkdGgpe3ZhciBpPWMud2lkdGg/Yy53aWR0aDo1MTIsaj1jLmhlaWdodD9jLmhlaWdodDoyLGs9Yy5ib3JkZXI/Yy5ib3JkZXI6MDtiLnRleEltYWdlMkQoYi5URVhUVVJFXzJELDAsaCxpLGosayxoLGIuVU5TSUdORURfQllURSxudWxsKX1lbHNlIGIudGV4SW1hZ2UyRChiLlRFWFRVUkVfMkQsMCxoLGIuUkdCQSxiLlVOU0lHTkVEX0JZVEUsYS52YWx1ZS5iYXNlVGV4dHVyZS5zb3VyY2UpO2IudGV4UGFyYW1ldGVyaShiLlRFWFRVUkVfMkQsYi5URVhUVVJFX01BR19GSUxURVIsZCksYi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfTUlOX0ZJTFRFUixlKSxiLnRleFBhcmFtZXRlcmkoYi5URVhUVVJFXzJELGIuVEVYVFVSRV9XUkFQX1MsZiksYi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfV1JBUF9ULGcpfWIudW5pZm9ybTFpKGEudW5pZm9ybUxvY2F0aW9uLHRoaXMudGV4dHVyZUNvdW50KSxhLl9pbml0PSEwLHRoaXMudGV4dHVyZUNvdW50Kyt9fSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLnN5bmNVbmlmb3Jtcz1mdW5jdGlvbigpe3RoaXMudGV4dHVyZUNvdW50PTE7dmFyIGEsYz10aGlzLmdsO2Zvcih2YXIgZCBpbiB0aGlzLnVuaWZvcm1zKWE9dGhpcy51bmlmb3Jtc1tkXSwxPT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xNYXRyaXg9PT0hMD9hLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS50cmFuc3Bvc2UsYS52YWx1ZSk6YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUpOjI9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUueCxhLnZhbHVlLnkpOjM9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUueCxhLnZhbHVlLnksYS52YWx1ZS56KTo0PT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnZhbHVlLngsYS52YWx1ZS55LGEudmFsdWUueixhLnZhbHVlLncpOlwic2FtcGxlcjJEXCI9PT1hLnR5cGUmJihhLl9pbml0PyhjLmFjdGl2ZVRleHR1cmUoY1tcIlRFWFRVUkVcIit0aGlzLnRleHR1cmVDb3VudF0pLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELGEudmFsdWUuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYy5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKGEudmFsdWUuYmFzZVRleHR1cmUsYykpLGMudW5pZm9ybTFpKGEudW5pZm9ybUxvY2F0aW9uLHRoaXMudGV4dHVyZUNvdW50KSx0aGlzLnRleHR1cmVDb3VudCsrKTp0aGlzLmluaXRTYW1wbGVyMkQoYSkpfSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlcz1udWxsfSxiLlBpeGlTaGFkZXIuZGVmYXVsdFZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1wiLFwiYXR0cmlidXRlIHZlYzIgYUNvbG9yO1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwiY29uc3QgdmVjMiBjZW50ZXIgPSB2ZWMyKC0xLjAsIDEuMCk7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCAoKGFWZXJ0ZXhQb3NpdGlvbiArIG9mZnNldFZlY3RvcikgLyBwcm9qZWN0aW9uVmVjdG9yKSArIGNlbnRlciAsIDAuMCwgMS4wKTtcIixcIiAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1wiLFwiICAgdmVjMyBjb2xvciA9IG1vZCh2ZWMzKGFDb2xvci55LzY1NTM2LjAsIGFDb2xvci55LzI1Ni4wLCBhQ29sb3IueSksIDI1Ni4wKSAvIDI1Ni4wO1wiLFwiICAgdkNvbG9yID0gdmVjNChjb2xvciAqIGFDb2xvci54LCBhQ29sb3IueCk7XCIsXCJ9XCJdLGIuUGl4aUZhc3RTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBsb3dwIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIGZsb2F0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCkgKiB2Q29sb3IgO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhUG9zaXRpb25Db29yZDtcIixcImF0dHJpYnV0ZSB2ZWMyIGFTY2FsZTtcIixcImF0dHJpYnV0ZSBmbG9hdCBhUm90YXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1wiLFwiYXR0cmlidXRlIGZsb2F0IGFDb2xvcjtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInVuaWZvcm0gbWF0MyB1TWF0cml4O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIGZsb2F0IHZDb2xvcjtcIixcImNvbnN0IHZlYzIgY2VudGVyID0gdmVjMigtMS4wLCAxLjApO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgdjtcIixcIiAgIHZlYzIgc3YgPSBhVmVydGV4UG9zaXRpb24gKiBhU2NhbGU7XCIsXCIgICB2LnggPSAoc3YueCkgKiBjb3MoYVJvdGF0aW9uKSAtIChzdi55KSAqIHNpbihhUm90YXRpb24pO1wiLFwiICAgdi55ID0gKHN2LngpICogc2luKGFSb3RhdGlvbikgKyAoc3YueSkgKiBjb3MoYVJvdGF0aW9uKTtcIixcIiAgIHYgPSAoIHVNYXRyaXggKiB2ZWMzKHYgKyBhUG9zaXRpb25Db29yZCAsIDEuMCkgKS54eSA7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoICggdiAvIHByb2plY3Rpb25WZWN0b3IpICsgY2VudGVyICwgMC4wLCAxLjApO1wiLFwiICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XCIsXCIgICB2Q29sb3IgPSBhQ29sb3I7XCIsXCJ9XCJdLHRoaXMudGV4dHVyZUNvdW50PTAsdGhpcy5pbml0KCl9LGIuUGl4aUZhc3RTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnVTYW1wbGVyPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1U2FtcGxlclwiKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLmRpbWVuc2lvbnM9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImRpbWVuc2lvbnNcIiksdGhpcy51TWF0cml4PWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1TWF0cml4XCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFQb3NpdGlvbkNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFQb3NpdGlvbkNvb3JkXCIpLHRoaXMuYVNjYWxlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFTY2FsZVwiKSx0aGlzLmFSb3RhdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhUm90YXRpb25cIiksdGhpcy5hVGV4dHVyZUNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFUZXh0dXJlQ29vcmRcIiksdGhpcy5jb2xvckF0dHJpYnV0ZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhQ29sb3JcIiksLTE9PT10aGlzLmNvbG9yQXR0cmlidXRlJiYodGhpcy5jb2xvckF0dHJpYnV0ZT0yKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuYVBvc2l0aW9uQ29vcmQsdGhpcy5hU2NhbGUsdGhpcy5hUm90YXRpb24sdGhpcy5hVGV4dHVyZUNvb3JkLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMucHJvZ3JhbT1jfSxiLlBpeGlGYXN0U2hhZGVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy51bmlmb3Jtcz1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLmF0dHJpYnV0ZXM9bnVsbH0sYi5TdHJpcFNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInVuaWZvcm0gZmxvYXQgYWxwaGE7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKTtcIixcIn1cIl0sdGhpcy52ZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcIixcInVuaWZvcm0gbWF0MyB0cmFuc2xhdGlvbk1hdHJpeDtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1wiLFwifVwiXSx0aGlzLmluaXQoKX0sYi5TdHJpcFNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMudVNhbXBsZXI9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInVTYW1wbGVyXCIpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMuY29sb3JBdHRyaWJ1dGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYUNvbG9yXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFUZXh0dXJlQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVRleHR1cmVDb29yZFwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuYVRleHR1cmVDb29yZF0sdGhpcy50cmFuc2xhdGlvbk1hdHJpeD1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidHJhbnNsYXRpb25NYXRyaXhcIiksdGhpcy5hbHBoYT1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiYWxwaGFcIiksdGhpcy5wcm9ncmFtPWN9LGIuUHJpbWl0aXZlU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjNCBhQ29sb3I7XCIsXCJ1bmlmb3JtIG1hdDMgdHJhbnNsYXRpb25NYXRyaXg7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGFscGhhO1wiLFwidW5pZm9ybSB2ZWMzIHRpbnQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZDb2xvciA9IGFDb2xvciAqIHZlYzQodGludCAqIGFscGhhLCBhbHBoYSk7XCIsXCJ9XCJdLHRoaXMuaW5pdCgpfSxiLlByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMudGludENvbG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0aW50XCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMudHJhbnNsYXRpb25NYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRyYW5zbGF0aW9uTWF0cml4XCIpLHRoaXMuYWxwaGE9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImFscGhhXCIpLHRoaXMucHJvZ3JhbT1jfSxiLlByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pLHRoaXMudW5pZm9ybXM9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5hdHRyaWJ1dGU9bnVsbH0sYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJ1bmlmb3JtIG1hdDMgdHJhbnNsYXRpb25NYXRyaXg7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzMgdGludDtcIixcInVuaWZvcm0gZmxvYXQgYWxwaGE7XCIsXCJ1bmlmb3JtIHZlYzMgY29sb3I7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZDb2xvciA9IHZlYzQoY29sb3IgKiBhbHBoYSAqIHRpbnQsIGFscGhhKTtcIixcIn1cIl0sdGhpcy5pbml0KCl9LGIuQ29tcGxleFByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMudGludENvbG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0aW50XCIpLHRoaXMuY29sb3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImNvbG9yXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMudHJhbnNsYXRpb25NYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRyYW5zbGF0aW9uTWF0cml4XCIpLHRoaXMuYWxwaGE9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImFscGhhXCIpLHRoaXMucHJvZ3JhbT1jfSxiLkNvbXBsZXhQcmltaXRpdmVTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlPW51bGx9LGIuV2ViR0xHcmFwaGljcz1mdW5jdGlvbigpe30sYi5XZWJHTEdyYXBoaWNzLnJlbmRlckdyYXBoaWNzPWZ1bmN0aW9uKGEsYyl7dmFyIGQsZT1jLmdsLGY9Yy5wcm9qZWN0aW9uLGc9Yy5vZmZzZXQsaD1jLnNoYWRlck1hbmFnZXIucHJpbWl0aXZlU2hhZGVyO2EuZGlydHkmJmIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcyhhLGUpO2Zvcih2YXIgaT1hLl93ZWJHTFtlLmlkXSxqPTA7ajxpLmRhdGEubGVuZ3RoO2orKykxPT09aS5kYXRhW2pdLm1vZGU/KGQ9aS5kYXRhW2pdLGMuc3RlbmNpbE1hbmFnZXIucHVzaFN0ZW5jaWwoYSxkLGMpLGUuZHJhd0VsZW1lbnRzKGUuVFJJQU5HTEVfRkFOLDQsZS5VTlNJR05FRF9TSE9SVCwyKihkLmluZGljZXMubGVuZ3RoLTQpKSxjLnN0ZW5jaWxNYW5hZ2VyLnBvcFN0ZW5jaWwoYSxkLGMpLHRoaXMubGFzdD1kLm1vZGUpOihkPWkuZGF0YVtqXSxjLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGgpLGg9Yy5zaGFkZXJNYW5hZ2VyLnByaW1pdGl2ZVNoYWRlcixlLnVuaWZvcm1NYXRyaXgzZnYoaC50cmFuc2xhdGlvbk1hdHJpeCwhMSxhLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApKSxlLnVuaWZvcm0yZihoLnByb2plY3Rpb25WZWN0b3IsZi54LC1mLnkpLGUudW5pZm9ybTJmKGgub2Zmc2V0VmVjdG9yLC1nLngsLWcueSksZS51bmlmb3JtM2Z2KGgudGludENvbG9yLGIuaGV4MnJnYihhLnRpbnQpKSxlLnVuaWZvcm0xZihoLmFscGhhLGEud29ybGRBbHBoYSksZS5iaW5kQnVmZmVyKGUuQVJSQVlfQlVGRkVSLGQuYnVmZmVyKSxlLnZlcnRleEF0dHJpYlBvaW50ZXIoaC5hVmVydGV4UG9zaXRpb24sMixlLkZMT0FULCExLDI0LDApLGUudmVydGV4QXR0cmliUG9pbnRlcihoLmNvbG9yQXR0cmlidXRlLDQsZS5GTE9BVCwhMSwyNCw4KSxlLmJpbmRCdWZmZXIoZS5FTEVNRU5UX0FSUkFZX0JVRkZFUixkLmluZGV4QnVmZmVyKSxlLmRyYXdFbGVtZW50cyhlLlRSSUFOR0xFX1NUUklQLGQuaW5kaWNlcy5sZW5ndGgsZS5VTlNJR05FRF9TSE9SVCwwKSl9LGIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcz1mdW5jdGlvbihhLGMpe3ZhciBkPWEuX3dlYkdMW2MuaWRdO2R8fChkPWEuX3dlYkdMW2MuaWRdPXtsYXN0SW5kZXg6MCxkYXRhOltdLGdsOmN9KSxhLmRpcnR5PSExO3ZhciBlO2lmKGEuY2xlYXJEaXJ0eSl7Zm9yKGEuY2xlYXJEaXJ0eT0hMSxlPTA7ZTxkLmRhdGEubGVuZ3RoO2UrKyl7dmFyIGY9ZC5kYXRhW2VdO2YucmVzZXQoKSxiLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbC5wdXNoKGYpfWQuZGF0YT1bXSxkLmxhc3RJbmRleD0wfXZhciBnO2ZvcihlPWQubGFzdEluZGV4O2U8YS5ncmFwaGljc0RhdGEubGVuZ3RoO2UrKyl7dmFyIGg9YS5ncmFwaGljc0RhdGFbZV07aC50eXBlPT09Yi5HcmFwaGljcy5QT0xZPyhoLmZpbGwmJmgucG9pbnRzLmxlbmd0aD42JiYoaC5wb2ludHMubGVuZ3RoPjEwPyhnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMSksYi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ29tcGxleFBvbHkoaCxnKSk6KGc9Yi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGUoZCwwKSxiLldlYkdMR3JhcGhpY3MuYnVpbGRQb2x5KGgsZykpKSxoLmxpbmVXaWR0aD4wJiYoZz1iLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZShkLDApLGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoaCxnKSkpOihnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMCksaC50eXBlPT09Yi5HcmFwaGljcy5SRUNUP2IuV2ViR0xHcmFwaGljcy5idWlsZFJlY3RhbmdsZShoLGcpOmgudHlwZT09PWIuR3JhcGhpY3MuQ0lSQ3x8aC50eXBlPT09Yi5HcmFwaGljcy5FTElQP2IuV2ViR0xHcmFwaGljcy5idWlsZENpcmNsZShoLGcpOmgudHlwZT09PWIuR3JhcGhpY3MuUlJFQyYmYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUm91bmRlZFJlY3RhbmdsZShoLGcpKSxkLmxhc3RJbmRleCsrfWZvcihlPTA7ZTxkLmRhdGEubGVuZ3RoO2UrKylnPWQuZGF0YVtlXSxnLmRpcnR5JiZnLnVwbG9hZCgpfSxiLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZT1mdW5jdGlvbihhLGMpe3ZhciBkO3JldHVybiBhLmRhdGEubGVuZ3RoPyhkPWEuZGF0YVthLmRhdGEubGVuZ3RoLTFdLChkLm1vZGUhPT1jfHwxPT09YykmJihkPWIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sLnBvcCgpfHxuZXcgYi5XZWJHTEdyYXBoaWNzRGF0YShhLmdsKSxkLm1vZGU9YyxhLmRhdGEucHVzaChkKSkpOihkPWIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sLnBvcCgpfHxuZXcgYi5XZWJHTEdyYXBoaWNzRGF0YShhLmdsKSxkLm1vZGU9YyxhLmRhdGEucHVzaChkKSksZC5kaXJ0eT0hMCxkfSxiLldlYkdMR3JhcGhpY3MuYnVpbGRSZWN0YW5nbGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cyxlPWRbMF0sZj1kWzFdLGc9ZFsyXSxoPWRbM107aWYoYS5maWxsKXt2YXIgaT1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLGo9YS5maWxsQWxwaGEsaz1pWzBdKmosbD1pWzFdKmosbT1pWzJdKmosbj1jLnBvaW50cyxvPWMuaW5kaWNlcyxwPW4ubGVuZ3RoLzY7bi5wdXNoKGUsZiksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlK2csZiksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlLGYraCksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlK2csZitoKSxuLnB1c2goayxsLG0saiksby5wdXNoKHAscCxwKzEscCsyLHArMyxwKzMpfWlmKGEubGluZVdpZHRoKXt2YXIgcT1hLnBvaW50czthLnBvaW50cz1bZSxmLGUrZyxmLGUrZyxmK2gsZSxmK2gsZSxmXSxiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lKGEsYyksYS5wb2ludHM9cX19LGIuV2ViR0xHcmFwaGljcy5idWlsZFJvdW5kZWRSZWN0YW5nbGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cyxlPWRbMF0sZj1kWzFdLGc9ZFsyXSxoPWRbM10saT1kWzRdLGo9W107aWYoai5wdXNoKGUsZitpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlLGYraC1pLGUsZitoLGUraSxmK2gpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2ctaSxmK2gsZStnLGYraCxlK2csZitoLWkpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2csZitpLGUrZyxmLGUrZy1pLGYpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2ksZixlLGYsZSxmK2kpKSxhLmZpbGwpe3ZhciBrPWIuaGV4MnJnYihhLmZpbGxDb2xvciksbD1hLmZpbGxBbHBoYSxtPWtbMF0qbCxuPWtbMV0qbCxvPWtbMl0qbCxwPWMucG9pbnRzLHE9Yy5pbmRpY2VzLHI9cC5sZW5ndGgvNixzPWIuUG9seUsuVHJpYW5ndWxhdGUoaiksdD0wO2Zvcih0PTA7dDxzLmxlbmd0aDt0Kz0zKXEucHVzaChzW3RdK3IpLHEucHVzaChzW3RdK3IpLHEucHVzaChzW3QrMV0rcikscS5wdXNoKHNbdCsyXStyKSxxLnB1c2goc1t0KzJdK3IpO2Zvcih0PTA7dDxqLmxlbmd0aDt0KyspcC5wdXNoKGpbdF0salsrK3RdLG0sbixvLGwpfWlmKGEubGluZVdpZHRoKXt2YXIgdT1hLnBvaW50czthLnBvaW50cz1qLGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoYSxjKSxhLnBvaW50cz11fX0sYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXtmdW5jdGlvbiBnKGEsYixjKXt2YXIgZD1iLWE7cmV0dXJuIGErZCpjfWZvcih2YXIgaCxpLGosayxsLG0sbj0yMCxvPVtdLHA9MCxxPTA7bj49cTtxKyspcD1xL24saD1nKGEsYyxwKSxpPWcoYixkLHApLGo9ZyhjLGUscCksaz1nKGQsZixwKSxsPWcoaCxqLHApLG09ZyhpLGsscCksby5wdXNoKGwsbSk7cmV0dXJuIG99LGIuV2ViR0xHcmFwaGljcy5idWlsZENpcmNsZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzLGU9ZFswXSxmPWRbMV0sZz1kWzJdLGg9ZFszXSxpPTQwLGo9MipNYXRoLlBJL2ksaz0wO2lmKGEuZmlsbCl7dmFyIGw9Yi5oZXgycmdiKGEuZmlsbENvbG9yKSxtPWEuZmlsbEFscGhhLG49bFswXSptLG89bFsxXSptLHA9bFsyXSptLHE9Yy5wb2ludHMscj1jLmluZGljZXMscz1xLmxlbmd0aC82O2ZvcihyLnB1c2gocyksaz0wO2krMT5rO2srKylxLnB1c2goZSxmLG4sbyxwLG0pLHEucHVzaChlK01hdGguc2luKGoqaykqZyxmK01hdGguY29zKGoqaykqaCxuLG8scCxtKSxyLnB1c2gocysrLHMrKyk7ci5wdXNoKHMtMSl9aWYoYS5saW5lV2lkdGgpe3ZhciB0PWEucG9pbnRzO2ZvcihhLnBvaW50cz1bXSxrPTA7aSsxPms7aysrKWEucG9pbnRzLnB1c2goZStNYXRoLnNpbihqKmspKmcsZitNYXRoLmNvcyhqKmspKmgpO2IuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoYSxjKSxhLnBvaW50cz10fX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZT1mdW5jdGlvbihhLGMpe3ZhciBkPTAsZT1hLnBvaW50cztpZigwIT09ZS5sZW5ndGgpe2lmKGEubGluZVdpZHRoJTIpZm9yKGQ9MDtkPGUubGVuZ3RoO2QrKyllW2RdKz0uNTt2YXIgZj1uZXcgYi5Qb2ludChlWzBdLGVbMV0pLGc9bmV3IGIuUG9pbnQoZVtlLmxlbmd0aC0yXSxlW2UubGVuZ3RoLTFdKTtpZihmLng9PT1nLngmJmYueT09PWcueSl7ZT1lLnNsaWNlKCksZS5wb3AoKSxlLnBvcCgpLGc9bmV3IGIuUG9pbnQoZVtlLmxlbmd0aC0yXSxlW2UubGVuZ3RoLTFdKTt2YXIgaD1nLngrLjUqKGYueC1nLngpLGk9Zy55Ky41KihmLnktZy55KTtlLnVuc2hpZnQoaCxpKSxlLnB1c2goaCxpKX12YXIgaixrLGwsbSxuLG8scCxxLHIscyx0LHUsdix3LHgseSx6LEEsQixDLEQsRSxGLEc9Yy5wb2ludHMsSD1jLmluZGljZXMsST1lLmxlbmd0aC8yLEo9ZS5sZW5ndGgsSz1HLmxlbmd0aC82LEw9YS5saW5lV2lkdGgvMixNPWIuaGV4MnJnYihhLmxpbmVDb2xvciksTj1hLmxpbmVBbHBoYSxPPU1bMF0qTixQPU1bMV0qTixRPU1bMl0qTjtmb3IobD1lWzBdLG09ZVsxXSxuPWVbMl0sbz1lWzNdLHI9LShtLW8pLHM9bC1uLEY9TWF0aC5zcXJ0KHIqcitzKnMpLHIvPUYscy89RixyKj1MLHMqPUwsRy5wdXNoKGwtcixtLXMsTyxQLFEsTiksRy5wdXNoKGwrcixtK3MsTyxQLFEsTiksZD0xO0ktMT5kO2QrKylsPWVbMiooZC0xKV0sbT1lWzIqKGQtMSkrMV0sbj1lWzIqZF0sbz1lWzIqZCsxXSxwPWVbMiooZCsxKV0scT1lWzIqKGQrMSkrMV0scj0tKG0tbykscz1sLW4sRj1NYXRoLnNxcnQocipyK3Mqcyksci89RixzLz1GLHIqPUwscyo9TCx0PS0oby1xKSx1PW4tcCxGPU1hdGguc3FydCh0KnQrdSp1KSx0Lz1GLHUvPUYsdCo9TCx1Kj1MLHg9LXMrbS0oLXMrbykseT0tcituLSgtcitsKSx6PSgtcitsKSooLXMrbyktKC1yK24pKigtcyttKSxBPS11K3EtKC11K28pLEI9LXQrbi0oLXQrcCksQz0oLXQrcCkqKC11K28pLSgtdCtuKSooLXUrcSksRD14KkItQSp5LE1hdGguYWJzKEQpPC4xPyhEKz0xMC4xLEcucHVzaChuLXIsby1zLE8sUCxRLE4pLEcucHVzaChuK3IsbytzLE8sUCxRLE4pKTooaj0oeSpDLUIqeikvRCxrPShBKnoteCpDKS9ELEU9KGotbikqKGotbikrKGstbykrKGstbyksRT4xOTYwMD8odj1yLXQsdz1zLXUsRj1NYXRoLnNxcnQodip2K3cqdyksdi89Rix3Lz1GLHYqPUwsdyo9TCxHLnB1c2gobi12LG8tdyksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuK3Ysbyt3KSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4tdixvLXcpLEcucHVzaChPLFAsUSxOKSxKKyspOihHLnB1c2goaixrKSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4tKGotbiksby0oay1vKSksRy5wdXNoKE8sUCxRLE4pKSk7Zm9yKGw9ZVsyKihJLTIpXSxtPWVbMiooSS0yKSsxXSxuPWVbMiooSS0xKV0sbz1lWzIqKEktMSkrMV0scj0tKG0tbykscz1sLW4sRj1NYXRoLnNxcnQocipyK3Mqcyksci89RixzLz1GLHIqPUwscyo9TCxHLnB1c2gobi1yLG8tcyksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuK3IsbytzKSxHLnB1c2goTyxQLFEsTiksSC5wdXNoKEspLGQ9MDtKPmQ7ZCsrKUgucHVzaChLKyspO0gucHVzaChLLTEpfX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ29tcGxleFBvbHk9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cy5zbGljZSgpO2lmKCEoZC5sZW5ndGg8Nikpe3ZhciBlPWMuaW5kaWNlcztjLnBvaW50cz1kLGMuYWxwaGE9YS5maWxsQWxwaGEsYy5jb2xvcj1iLmhleDJyZ2IoYS5maWxsQ29sb3IpO2Zvcih2YXIgZixnLGg9MS8wLGk9LTEvMCxqPTEvMCxrPS0xLzAsbD0wO2w8ZC5sZW5ndGg7bCs9MilmPWRbbF0sZz1kW2wrMV0saD1oPmY/ZjpoLGk9Zj5pP2Y6aSxqPWo+Zz9nOmosaz1nPms/ZzprO2QucHVzaChoLGosaSxqLGksayxoLGspO3ZhciBtPWQubGVuZ3RoLzI7Zm9yKGw9MDttPmw7bCsrKWUucHVzaChsKX19LGIuV2ViR0xHcmFwaGljcy5idWlsZFBvbHk9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cztpZighKGQubGVuZ3RoPDYpKXt2YXIgZT1jLnBvaW50cyxmPWMuaW5kaWNlcyxnPWQubGVuZ3RoLzIsaD1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLGk9YS5maWxsQWxwaGEsaj1oWzBdKmksaz1oWzFdKmksbD1oWzJdKmksbT1iLlBvbHlLLlRyaWFuZ3VsYXRlKGQpLG49ZS5sZW5ndGgvNixvPTA7Zm9yKG89MDtvPG0ubGVuZ3RoO28rPTMpZi5wdXNoKG1bb10rbiksZi5wdXNoKG1bb10rbiksZi5wdXNoKG1bbysxXStuKSxmLnB1c2gobVtvKzJdK24pLGYucHVzaChtW28rMl0rbik7Zm9yKG89MDtnPm87bysrKWUucHVzaChkWzIqb10sZFsyKm8rMV0saixrLGwsaSl9fSxiLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbD1bXSxiLldlYkdMR3JhcGhpY3NEYXRhPWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLmNvbG9yPVswLDAsMF0sdGhpcy5wb2ludHM9W10sdGhpcy5pbmRpY2VzPVtdLHRoaXMubGFzdEluZGV4PTAsdGhpcy5idWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmluZGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5tb2RlPTEsdGhpcy5hbHBoYT0xLHRoaXMuZGlydHk9ITB9LGIuV2ViR0xHcmFwaGljc0RhdGEucHJvdG90eXBlLnJlc2V0PWZ1bmN0aW9uKCl7dGhpcy5wb2ludHM9W10sdGhpcy5pbmRpY2VzPVtdLHRoaXMubGFzdEluZGV4PTB9LGIuV2ViR0xHcmFwaGljc0RhdGEucHJvdG90eXBlLnVwbG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7dGhpcy5nbFBvaW50cz1uZXcgRmxvYXQzMkFycmF5KHRoaXMucG9pbnRzKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy5idWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLmdsUG9pbnRzLGEuU1RBVElDX0RSQVcpLHRoaXMuZ2xJbmRpY2llcz1uZXcgVWludDE2QXJyYXkodGhpcy5pbmRpY2VzKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmdsSW5kaWNpZXMsYS5TVEFUSUNfRFJBVyksdGhpcy5kaXJ0eT0hMX0sYi5nbENvbnRleHRzPVtdLGIuV2ViR0xSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlLGYsZyl7Yi5kZWZhdWx0UmVuZGVyZXJ8fChiLnNheUhlbGxvKFwid2ViR0xcIiksYi5kZWZhdWx0UmVuZGVyZXI9dGhpcyksdGhpcy50eXBlPWIuV0VCR0xfUkVOREVSRVIsdGhpcy50cmFuc3BhcmVudD0hIWUsdGhpcy5wcmVzZXJ2ZURyYXdpbmdCdWZmZXI9Zyx0aGlzLndpZHRoPWF8fDgwMCx0aGlzLmhlaWdodD1jfHw2MDAsdGhpcy52aWV3PWR8fGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy52aWV3LndpZHRoPXRoaXMud2lkdGgsdGhpcy52aWV3LmhlaWdodD10aGlzLmhlaWdodCx0aGlzLmNvbnRleHRMb3N0PXRoaXMuaGFuZGxlQ29udGV4dExvc3QuYmluZCh0aGlzKSx0aGlzLmNvbnRleHRSZXN0b3JlZExvc3Q9dGhpcy5oYW5kbGVDb250ZXh0UmVzdG9yZWQuYmluZCh0aGlzKSx0aGlzLnZpZXcuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dGxvc3RcIix0aGlzLmNvbnRleHRMb3N0LCExKSx0aGlzLnZpZXcuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dHJlc3RvcmVkXCIsdGhpcy5jb250ZXh0UmVzdG9yZWRMb3N0LCExKSx0aGlzLm9wdGlvbnM9e2FscGhhOnRoaXMudHJhbnNwYXJlbnQsYW50aWFsaWFzOiEhZixwcmVtdWx0aXBsaWVkQWxwaGE6ISFlLHN0ZW5jaWw6ITAscHJlc2VydmVEcmF3aW5nQnVmZmVyOmd9O3ZhciBoPW51bGw7aWYoW1wiZXhwZXJpbWVudGFsLXdlYmdsXCIsXCJ3ZWJnbFwiXS5mb3JFYWNoKGZ1bmN0aW9uKGEpe3RyeXtoPWh8fHRoaXMudmlldy5nZXRDb250ZXh0KGEsdGhpcy5vcHRpb25zKX1jYXRjaChiKXt9fSx0aGlzKSwhaCl0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB3ZWJHTC4gVHJ5IHVzaW5nIHRoZSBjYW52YXMgcmVuZGVyZXJcIit0aGlzKTt0aGlzLmdsPWgsdGhpcy5nbENvbnRleHRJZD1oLmlkPWIuV2ViR0xSZW5kZXJlci5nbENvbnRleHRJZCsrLGIuZ2xDb250ZXh0c1t0aGlzLmdsQ29udGV4dElkXT1oLGIuYmxlbmRNb2Rlc1dlYkdMfHwoYi5ibGVuZE1vZGVzV2ViR0w9W10sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLk5PUk1BTF09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkFERF09W2guU1JDX0FMUEhBLGguRFNUX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTVVMVElQTFldPVtoLkRTVF9DT0xPUixoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5TQ1JFRU5dPVtoLlNSQ19BTFBIQSxoLk9ORV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLk9WRVJMQVldPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5MSUdIVEVOXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuQ09MT1JfRE9ER0VdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuSEFSRF9MSUdIVF09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLlNPRlRfTElHSFRdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuRVhDTFVTSU9OXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuSFVFXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuU0FUVVJBVElPTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkNPTE9SXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTFVNSU5PU0lUWV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0pLHRoaXMucHJvamVjdGlvbj1uZXcgYi5Qb2ludCx0aGlzLnByb2plY3Rpb24ueD10aGlzLndpZHRoLzIsdGhpcy5wcm9qZWN0aW9uLnk9LXRoaXMuaGVpZ2h0LzIsdGhpcy5vZmZzZXQ9bmV3IGIuUG9pbnQoMCwwKSx0aGlzLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLmNvbnRleHRMb3N0PSExLHRoaXMuc2hhZGVyTWFuYWdlcj1uZXcgYi5XZWJHTFNoYWRlck1hbmFnZXIoaCksdGhpcy5zcHJpdGVCYXRjaD1uZXcgYi5XZWJHTFNwcml0ZUJhdGNoKGgpLHRoaXMubWFza01hbmFnZXI9bmV3IGIuV2ViR0xNYXNrTWFuYWdlcihoKSx0aGlzLmZpbHRlck1hbmFnZXI9bmV3IGIuV2ViR0xGaWx0ZXJNYW5hZ2VyKGgsdGhpcy50cmFuc3BhcmVudCksdGhpcy5zdGVuY2lsTWFuYWdlcj1uZXcgYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyKGgpLHRoaXMuYmxlbmRNb2RlTWFuYWdlcj1uZXcgYi5XZWJHTEJsZW5kTW9kZU1hbmFnZXIoaCksdGhpcy5yZW5kZXJTZXNzaW9uPXt9LHRoaXMucmVuZGVyU2Vzc2lvbi5nbD10aGlzLmdsLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQ9MCx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlcj10aGlzLnNoYWRlck1hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLm1hc2tNYW5hZ2VyPXRoaXMubWFza01hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLmZpbHRlck1hbmFnZXI9dGhpcy5maWx0ZXJNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyPXRoaXMuYmxlbmRNb2RlTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24uc3ByaXRlQmF0Y2g9dGhpcy5zcHJpdGVCYXRjaCx0aGlzLnJlbmRlclNlc3Npb24uc3RlbmNpbE1hbmFnZXI9dGhpcy5zdGVuY2lsTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24ucmVuZGVyZXI9dGhpcyxoLnVzZVByb2dyYW0odGhpcy5zaGFkZXJNYW5hZ2VyLmRlZmF1bHRTaGFkZXIucHJvZ3JhbSksaC5kaXNhYmxlKGguREVQVEhfVEVTVCksaC5kaXNhYmxlKGguQ1VMTF9GQUNFKSxoLmVuYWJsZShoLkJMRU5EKSxoLmNvbG9yTWFzayghMCwhMCwhMCx0aGlzLnRyYW5zcGFyZW50KX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLldlYkdMUmVuZGVyZXIsYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7aWYoIXRoaXMuY29udGV4dExvc3Qpe3RoaXMuX19zdGFnZSE9PWEmJihhLmludGVyYWN0aXZlJiZhLmludGVyYWN0aW9uTWFuYWdlci5yZW1vdmVFdmVudHMoKSx0aGlzLl9fc3RhZ2U9YSksYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVzKCksYS51cGRhdGVUcmFuc2Zvcm0oKSxhLl9pbnRlcmFjdGl2ZSYmKGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWR8fChhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSEwLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSkpO3ZhciBjPXRoaXMuZ2w7Yy52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksYy5iaW5kRnJhbWVidWZmZXIoYy5GUkFNRUJVRkZFUixudWxsKSx0aGlzLnRyYW5zcGFyZW50P2MuY2xlYXJDb2xvcigwLDAsMCwwKTpjLmNsZWFyQ29sb3IoYS5iYWNrZ3JvdW5kQ29sb3JTcGxpdFswXSxhLmJhY2tncm91bmRDb2xvclNwbGl0WzFdLGEuYmFja2dyb3VuZENvbG9yU3BsaXRbMl0sMSksYy5jbGVhcihjLkNPTE9SX0JVRkZFUl9CSVQpLHRoaXMucmVuZGVyRGlzcGxheU9iamVjdChhLHRoaXMucHJvamVjdGlvbiksYS5pbnRlcmFjdGl2ZT9hLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkfHwoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZD0hMCxhLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXQodGhpcykpOmEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQmJihhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSExLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSl9fSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlckRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oYSxjLGQpe3RoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLnNldEJsZW5kTW9kZShiLmJsZW5kTW9kZXMuTk9STUFMKSx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50PTAsdGhpcy5yZW5kZXJTZXNzaW9uLmN1cnJlbnRCbGVuZE1vZGU9OTk5OSx0aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbj1jLHRoaXMucmVuZGVyU2Vzc2lvbi5vZmZzZXQ9dGhpcy5vZmZzZXQsdGhpcy5zcHJpdGVCYXRjaC5iZWdpbih0aGlzLnJlbmRlclNlc3Npb24pLHRoaXMuZmlsdGVyTWFuYWdlci5iZWdpbih0aGlzLnJlbmRlclNlc3Npb24sZCksYS5fcmVuZGVyV2ViR0wodGhpcy5yZW5kZXJTZXNzaW9uKSx0aGlzLnNwcml0ZUJhdGNoLmVuZCgpfSxiLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZXM9ZnVuY3Rpb24oKXt2YXIgYT0wO2ZvcihhPTA7YTxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aDthKyspYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVGcmFtZShiLlRleHR1cmUuZnJhbWVVcGRhdGVzW2FdKTtmb3IoYT0wO2E8Yi50ZXh0dXJlc1RvRGVzdHJveS5sZW5ndGg7YSsrKWIuV2ViR0xSZW5kZXJlci5kZXN0cm95VGV4dHVyZShiLnRleHR1cmVzVG9EZXN0cm95W2FdKTtiLnRleHR1cmVzVG9VcGRhdGUubGVuZ3RoPTAsYi50ZXh0dXJlc1RvRGVzdHJveS5sZW5ndGg9MCxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aD0wfSxiLldlYkdMUmVuZGVyZXIuZGVzdHJveVRleHR1cmU9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPWEuX2dsVGV4dHVyZXMubGVuZ3RoLTE7Yz49MDtjLS0pe3ZhciBkPWEuX2dsVGV4dHVyZXNbY10sZT1iLmdsQ29udGV4dHNbY107XHJcbmUmJmQmJmUuZGVsZXRlVGV4dHVyZShkKX1hLl9nbFRleHR1cmVzLmxlbmd0aD0wfSxiLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZUZyYW1lPWZ1bmN0aW9uKGEpe2EuX3VwZGF0ZVdlYkdMdXZzKCl9LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKGEsYil7dGhpcy53aWR0aD1hLHRoaXMuaGVpZ2h0PWIsdGhpcy52aWV3LndpZHRoPWEsdGhpcy52aWV3LmhlaWdodD1iLHRoaXMuZ2wudmlld3BvcnQoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMucHJvamVjdGlvbi54PXRoaXMud2lkdGgvMix0aGlzLnByb2plY3Rpb24ueT0tdGhpcy5oZWlnaHQvMn0sYi5jcmVhdGVXZWJHTFRleHR1cmU9ZnVuY3Rpb24oYSxjKXtyZXR1cm4gYS5oYXNMb2FkZWQmJihhLl9nbFRleHR1cmVzW2MuaWRdPWMuY3JlYXRlVGV4dHVyZSgpLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELGEuX2dsVGV4dHVyZXNbYy5pZF0pLGMucGl4ZWxTdG9yZWkoYy5VTlBBQ0tfUFJFTVVMVElQTFlfQUxQSEFfV0VCR0wsYS5wcmVtdWx0aXBsaWVkQWxwaGEpLGMudGV4SW1hZ2UyRChjLlRFWFRVUkVfMkQsMCxjLlJHQkEsYy5SR0JBLGMuVU5TSUdORURfQllURSxhLnNvdXJjZSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUFHX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9NSU5fRklMVEVSLGEuc2NhbGVNb2RlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9jLkxJTkVBUjpjLk5FQVJFU1QpLGEuX3Bvd2VyT2YyPyhjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1MsYy5SRVBFQVQpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfVCxjLlJFUEVBVCkpOihjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1MsYy5DTEFNUF9UT19FREdFKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5DTEFNUF9UT19FREdFKSksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsbnVsbCksYS5fZGlydHlbYy5pZF09ITEpLGEuX2dsVGV4dHVyZXNbYy5pZF19LGIudXBkYXRlV2ViR0xUZXh0dXJlPWZ1bmN0aW9uKGEsYyl7YS5fZ2xUZXh0dXJlc1tjLmlkXSYmKGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELGEuX2dsVGV4dHVyZXNbYy5pZF0pLGMucGl4ZWxTdG9yZWkoYy5VTlBBQ0tfUFJFTVVMVElQTFlfQUxQSEFfV0VCR0wsYS5wcmVtdWx0aXBsaWVkQWxwaGEpLGMudGV4SW1hZ2UyRChjLlRFWFRVUkVfMkQsMCxjLlJHQkEsYy5SR0JBLGMuVU5TSUdORURfQllURSxhLnNvdXJjZSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUFHX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9NSU5fRklMVEVSLGEuc2NhbGVNb2RlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9jLkxJTkVBUjpjLk5FQVJFU1QpLGEuX3Bvd2VyT2YyPyhjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1MsYy5SRVBFQVQpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfVCxjLlJFUEVBVCkpOihjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1MsYy5DTEFNUF9UT19FREdFKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5DTEFNUF9UT19FREdFKSksYS5fZGlydHlbYy5pZF09ITEpfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZUNvbnRleHRMb3N0PWZ1bmN0aW9uKGEpe2EucHJldmVudERlZmF1bHQoKSx0aGlzLmNvbnRleHRMb3N0PSEwfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZUNvbnRleHRSZXN0b3JlZD1mdW5jdGlvbigpe3RyeXt0aGlzLmdsPXRoaXMudmlldy5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIsdGhpcy5vcHRpb25zKX1jYXRjaChhKXt0cnl7dGhpcy5nbD10aGlzLnZpZXcuZ2V0Q29udGV4dChcIndlYmdsXCIsdGhpcy5vcHRpb25zKX1jYXRjaChjKXt0aHJvdyBuZXcgRXJyb3IoXCIgVGhpcyBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgd2ViR0wuIFRyeSB1c2luZyB0aGUgY2FudmFzIHJlbmRlcmVyXCIrdGhpcyl9fXZhciBkPXRoaXMuZ2w7ZC5pZD1iLldlYkdMUmVuZGVyZXIuZ2xDb250ZXh0SWQrKyx0aGlzLnNoYWRlck1hbmFnZXIuc2V0Q29udGV4dChkKSx0aGlzLnNwcml0ZUJhdGNoLnNldENvbnRleHQoZCksdGhpcy5wcmltaXRpdmVCYXRjaC5zZXRDb250ZXh0KGQpLHRoaXMubWFza01hbmFnZXIuc2V0Q29udGV4dChkKSx0aGlzLmZpbHRlck1hbmFnZXIuc2V0Q29udGV4dChkKSx0aGlzLnJlbmRlclNlc3Npb24uZ2w9dGhpcy5nbCxkLmRpc2FibGUoZC5ERVBUSF9URVNUKSxkLmRpc2FibGUoZC5DVUxMX0ZBQ0UpLGQuZW5hYmxlKGQuQkxFTkQpLGQuY29sb3JNYXNrKCEwLCEwLCEwLHRoaXMudHJhbnNwYXJlbnQpLHRoaXMuZ2wudmlld3BvcnQoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpO2Zvcih2YXIgZSBpbiBiLlRleHR1cmVDYWNoZSl7dmFyIGY9Yi5UZXh0dXJlQ2FjaGVbZV0uYmFzZVRleHR1cmU7Zi5fZ2xUZXh0dXJlcz1bXX10aGlzLmNvbnRleHRMb3N0PSExfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLnZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dGxvc3RcIix0aGlzLmNvbnRleHRMb3N0KSx0aGlzLnZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dHJlc3RvcmVkXCIsdGhpcy5jb250ZXh0UmVzdG9yZWRMb3N0KSxiLmdsQ29udGV4dHNbdGhpcy5nbENvbnRleHRJZF09bnVsbCx0aGlzLnByb2plY3Rpb249bnVsbCx0aGlzLm9mZnNldD1udWxsLHRoaXMuc2hhZGVyTWFuYWdlci5kZXN0cm95KCksdGhpcy5zcHJpdGVCYXRjaC5kZXN0cm95KCksdGhpcy5wcmltaXRpdmVCYXRjaC5kZXN0cm95KCksdGhpcy5tYXNrTWFuYWdlci5kZXN0cm95KCksdGhpcy5maWx0ZXJNYW5hZ2VyLmRlc3Ryb3koKSx0aGlzLnNoYWRlck1hbmFnZXI9bnVsbCx0aGlzLnNwcml0ZUJhdGNoPW51bGwsdGhpcy5tYXNrTWFuYWdlcj1udWxsLHRoaXMuZmlsdGVyTWFuYWdlcj1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLnJlbmRlclNlc3Npb249bnVsbH0sYi5XZWJHTFJlbmRlcmVyLmdsQ29udGV4dElkPTAsYi5XZWJHTEJsZW5kTW9kZU1hbmFnZXI9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMuY3VycmVudEJsZW5kTW9kZT05OTk5OX0sYi5XZWJHTEJsZW5kTW9kZU1hbmFnZXIucHJvdG90eXBlLnNldEJsZW5kTW9kZT1mdW5jdGlvbihhKXtpZih0aGlzLmN1cnJlbnRCbGVuZE1vZGU9PT1hKXJldHVybiExO3RoaXMuY3VycmVudEJsZW5kTW9kZT1hO3ZhciBjPWIuYmxlbmRNb2Rlc1dlYkdMW3RoaXMuY3VycmVudEJsZW5kTW9kZV07cmV0dXJuIHRoaXMuZ2wuYmxlbmRGdW5jKGNbMF0sY1sxXSksITB9LGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbD1udWxsfSxiLldlYkdMTWFza01hbmFnZXI9ZnVuY3Rpb24oYSl7dGhpcy5tYXNrU3RhY2s9W10sdGhpcy5tYXNrUG9zaXRpb249MCx0aGlzLnNldENvbnRleHQoYSksdGhpcy5yZXZlcnNlPSExLHRoaXMuY291bnQ9MH0sYi5XZWJHTE1hc2tNYW5hZ2VyLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YX0sYi5XZWJHTE1hc2tNYW5hZ2VyLnByb3RvdHlwZS5wdXNoTWFzaz1mdW5jdGlvbihhLGMpe3ZhciBkPWMuZ2w7YS5kaXJ0eSYmYi5XZWJHTEdyYXBoaWNzLnVwZGF0ZUdyYXBoaWNzKGEsZCksYS5fd2ViR0xbZC5pZF0uZGF0YS5sZW5ndGgmJmMuc3RlbmNpbE1hbmFnZXIucHVzaFN0ZW5jaWwoYSxhLl93ZWJHTFtkLmlkXS5kYXRhWzBdLGMpfSxiLldlYkdMTWFza01hbmFnZXIucHJvdG90eXBlLnBvcE1hc2s9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmdsO2Iuc3RlbmNpbE1hbmFnZXIucG9wU3RlbmNpbChhLGEuX3dlYkdMW2MuaWRdLmRhdGFbMF0sYil9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMubWFza1N0YWNrPW51bGwsdGhpcy5nbD1udWxsfSxiLldlYkdMU3RlbmNpbE1hbmFnZXI9ZnVuY3Rpb24oYSl7dGhpcy5zdGVuY2lsU3RhY2s9W10sdGhpcy5zZXRDb250ZXh0KGEpLHRoaXMucmV2ZXJzZT0hMCx0aGlzLmNvdW50PTB9LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWF9LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUucHVzaFN0ZW5jaWw9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZ2w7dGhpcy5iaW5kR3JhcGhpY3MoYSxiLGMpLDA9PT10aGlzLnN0ZW5jaWxTdGFjay5sZW5ndGgmJihkLmVuYWJsZShkLlNURU5DSUxfVEVTVCksZC5jbGVhcihkLlNURU5DSUxfQlVGRkVSX0JJVCksdGhpcy5yZXZlcnNlPSEwLHRoaXMuY291bnQ9MCksdGhpcy5zdGVuY2lsU3RhY2sucHVzaChiKTt2YXIgZT10aGlzLmNvdW50O2QuY29sb3JNYXNrKCExLCExLCExLCExKSxkLnN0ZW5jaWxGdW5jKGQuQUxXQVlTLDAsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5WRVJUKSwxPT09Yi5tb2RlPyhkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX0ZBTixiLmluZGljZXMubGVuZ3RoLTQsZC5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5ERUNSKSk6KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX0ZBTiw0LGQuVU5TSUdORURfU0hPUlQsMiooYi5pbmRpY2VzLmxlbmd0aC00KSksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtKGUrMSksMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSsxLDI1NSksdGhpcy5yZXZlcnNlPSF0aGlzLnJldmVyc2UpOih0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOQ1IpKTooZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS1lLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLkRFQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX1NUUklQLGIuaW5kaWNlcy5sZW5ndGgsZC5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJldmVyc2U/ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUrMSwyNTUpOmQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtKGUrMSksMjU1KSksZC5jb2xvck1hc2soITAsITAsITAsITApLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5LRUVQKSx0aGlzLmNvdW50Kyt9LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUuYmluZEdyYXBoaWNzPWZ1bmN0aW9uKGEsYyxkKXt0aGlzLl9jdXJyZW50R3JhcGhpY3M9YTt2YXIgZSxmPXRoaXMuZ2wsZz1kLnByb2plY3Rpb24saD1kLm9mZnNldDsxPT09Yy5tb2RlPyhlPWQuc2hhZGVyTWFuYWdlci5jb21wbGV4UHJpbWF0aXZlU2hhZGVyLGQuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoZSksZi51bmlmb3JtTWF0cml4M2Z2KGUudHJhbnNsYXRpb25NYXRyaXgsITEsYS53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksZi51bmlmb3JtMmYoZS5wcm9qZWN0aW9uVmVjdG9yLGcueCwtZy55KSxmLnVuaWZvcm0yZihlLm9mZnNldFZlY3RvciwtaC54LC1oLnkpLGYudW5pZm9ybTNmdihlLnRpbnRDb2xvcixiLmhleDJyZ2IoYS50aW50KSksZi51bmlmb3JtM2Z2KGUuY29sb3IsYy5jb2xvciksZi51bmlmb3JtMWYoZS5hbHBoYSxhLndvcmxkQWxwaGEqYy5hbHBoYSksZi5iaW5kQnVmZmVyKGYuQVJSQVlfQlVGRkVSLGMuYnVmZmVyKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZS5hVmVydGV4UG9zaXRpb24sMixmLkZMT0FULCExLDgsMCksZi5iaW5kQnVmZmVyKGYuRUxFTUVOVF9BUlJBWV9CVUZGRVIsYy5pbmRleEJ1ZmZlcikpOihlPWQuc2hhZGVyTWFuYWdlci5wcmltaXRpdmVTaGFkZXIsZC5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihlKSxmLnVuaWZvcm1NYXRyaXgzZnYoZS50cmFuc2xhdGlvbk1hdHJpeCwhMSxhLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApKSxmLnVuaWZvcm0yZihlLnByb2plY3Rpb25WZWN0b3IsZy54LC1nLnkpLGYudW5pZm9ybTJmKGUub2Zmc2V0VmVjdG9yLC1oLngsLWgueSksZi51bmlmb3JtM2Z2KGUudGludENvbG9yLGIuaGV4MnJnYihhLnRpbnQpKSxmLnVuaWZvcm0xZihlLmFscGhhLGEud29ybGRBbHBoYSksZi5iaW5kQnVmZmVyKGYuQVJSQVlfQlVGRkVSLGMuYnVmZmVyKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZS5hVmVydGV4UG9zaXRpb24sMixmLkZMT0FULCExLDI0LDApLGYudmVydGV4QXR0cmliUG9pbnRlcihlLmNvbG9yQXR0cmlidXRlLDQsZi5GTE9BVCwhMSwyNCw4KSxmLmJpbmRCdWZmZXIoZi5FTEVNRU5UX0FSUkFZX0JVRkZFUixjLmluZGV4QnVmZmVyKSl9LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUucG9wU3RlbmNpbD1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5nbDtpZih0aGlzLnN0ZW5jaWxTdGFjay5wb3AoKSx0aGlzLmNvdW50LS0sMD09PXRoaXMuc3RlbmNpbFN0YWNrLmxlbmd0aClkLmRpc2FibGUoZC5TVEVOQ0lMX1RFU1QpO2Vsc2V7dmFyIGU9dGhpcy5jb3VudDt0aGlzLmJpbmRHcmFwaGljcyhhLGIsYyksZC5jb2xvck1hc2soITEsITEsITEsITEpLDE9PT1iLm1vZGU/KHRoaXMucmV2ZXJzZT0hdGhpcy5yZXZlcnNlLHRoaXMucmV2ZXJzZT8oZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS0oZSsxKSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSk6KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpLGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfRkFOLDQsZC5VTlNJR05FRF9TSE9SVCwyKihiLmluZGljZXMubGVuZ3RoLTQpKSxkLnN0ZW5jaWxGdW5jKGQuQUxXQVlTLDAsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5WRVJUKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX0ZBTixiLmluZGljZXMubGVuZ3RoLTQsZC5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJldmVyc2U/ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUsMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSk6KHRoaXMucmV2ZXJzZT8oZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUrMSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5ERUNSKSk6KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtKGUrMSksMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5DUikpLGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfU1RSSVAsYi5pbmRpY2VzLmxlbmd0aCxkLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmV2ZXJzZT9kLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpOmQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtZSwyNTUpKSxkLmNvbG9yTWFzayghMCwhMCwhMCwhMCksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLktFRVApfX0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5tYXNrU3RhY2s9bnVsbCx0aGlzLmdsPW51bGx9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMubWF4QXR0aWJzPTEwLHRoaXMuYXR0cmliU3RhdGU9W10sdGhpcy50ZW1wQXR0cmliU3RhdGU9W10sdGhpcy5zaGFkZXJNYXA9W107Zm9yKHZhciBiPTA7Yjx0aGlzLm1heEF0dGlicztiKyspdGhpcy5hdHRyaWJTdGF0ZVtiXT0hMTt0aGlzLnNldENvbnRleHQoYSl9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLnByaW1pdGl2ZVNoYWRlcj1uZXcgYi5QcmltaXRpdmVTaGFkZXIoYSksdGhpcy5jb21wbGV4UHJpbWF0aXZlU2hhZGVyPW5ldyBiLkNvbXBsZXhQcmltaXRpdmVTaGFkZXIoYSksdGhpcy5kZWZhdWx0U2hhZGVyPW5ldyBiLlBpeGlTaGFkZXIoYSksdGhpcy5mYXN0U2hhZGVyPW5ldyBiLlBpeGlGYXN0U2hhZGVyKGEpLHRoaXMuc3RyaXBTaGFkZXI9bmV3IGIuU3RyaXBTaGFkZXIoYSksdGhpcy5zZXRTaGFkZXIodGhpcy5kZWZhdWx0U2hhZGVyKX0sYi5XZWJHTFNoYWRlck1hbmFnZXIucHJvdG90eXBlLnNldEF0dHJpYnM9ZnVuY3Rpb24oYSl7dmFyIGI7Zm9yKGI9MDtiPHRoaXMudGVtcEF0dHJpYlN0YXRlLmxlbmd0aDtiKyspdGhpcy50ZW1wQXR0cmliU3RhdGVbYl09ITE7Zm9yKGI9MDtiPGEubGVuZ3RoO2IrKyl7dmFyIGM9YVtiXTt0aGlzLnRlbXBBdHRyaWJTdGF0ZVtjXT0hMH12YXIgZD10aGlzLmdsO2ZvcihiPTA7Yjx0aGlzLmF0dHJpYlN0YXRlLmxlbmd0aDtiKyspdGhpcy5hdHRyaWJTdGF0ZVtiXSE9PXRoaXMudGVtcEF0dHJpYlN0YXRlW2JdJiYodGhpcy5hdHRyaWJTdGF0ZVtiXT10aGlzLnRlbXBBdHRyaWJTdGF0ZVtiXSx0aGlzLnRlbXBBdHRyaWJTdGF0ZVtiXT9kLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGIpOmQuZGlzYWJsZVZlcnRleEF0dHJpYkFycmF5KGIpKX0sYi5XZWJHTFNoYWRlck1hbmFnZXIucHJvdG90eXBlLnNldFNoYWRlcj1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fY3VycmVudElkPT09YS5fVUlEPyExOih0aGlzLl9jdXJyZW50SWQ9YS5fVUlELHRoaXMuY3VycmVudFNoYWRlcj1hLHRoaXMuZ2wudXNlUHJvZ3JhbShhLnByb2dyYW0pLHRoaXMuc2V0QXR0cmlicyhhLmF0dHJpYnV0ZXMpLCEwKX0sYi5XZWJHTFNoYWRlck1hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmF0dHJpYlN0YXRlPW51bGwsdGhpcy50ZW1wQXR0cmliU3RhdGU9bnVsbCx0aGlzLnByaW1pdGl2ZVNoYWRlci5kZXN0cm95KCksdGhpcy5kZWZhdWx0U2hhZGVyLmRlc3Ryb3koKSx0aGlzLmZhc3RTaGFkZXIuZGVzdHJveSgpLHRoaXMuc3RyaXBTaGFkZXIuZGVzdHJveSgpLHRoaXMuZ2w9bnVsbH0sYi5XZWJHTFNwcml0ZUJhdGNoPWZ1bmN0aW9uKGEpe3RoaXMudmVydFNpemU9Nix0aGlzLnNpemU9MmUzO3ZhciBiPTQqdGhpcy5zaXplKnRoaXMudmVydFNpemUsYz02KnRoaXMuc2l6ZTt0aGlzLnZlcnRpY2VzPW5ldyBGbG9hdDMyQXJyYXkoYiksdGhpcy5pbmRpY2VzPW5ldyBVaW50MTZBcnJheShjKSx0aGlzLmxhc3RJbmRleENvdW50PTA7Zm9yKHZhciBkPTAsZT0wO2M+ZDtkKz02LGUrPTQpdGhpcy5pbmRpY2VzW2QrMF09ZSswLHRoaXMuaW5kaWNlc1tkKzFdPWUrMSx0aGlzLmluZGljZXNbZCsyXT1lKzIsdGhpcy5pbmRpY2VzW2QrM109ZSswLHRoaXMuaW5kaWNlc1tkKzRdPWUrMix0aGlzLmluZGljZXNbZCs1XT1lKzM7dGhpcy5kcmF3aW5nPSExLHRoaXMuY3VycmVudEJhdGNoU2l6ZT0wLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPW51bGwsdGhpcy5zZXRDb250ZXh0KGEpLHRoaXMuZGlydHk9ITAsdGhpcy50ZXh0dXJlcz1bXSx0aGlzLmJsZW5kTW9kZXM9W119LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy52ZXJ0ZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmluZGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGEuU1RBVElDX0RSQVcpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGljZXMsYS5EWU5BTUlDX0RSQVcpLHRoaXMuY3VycmVudEJsZW5kTW9kZT05OTk5OX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5iZWdpbj1mdW5jdGlvbihhKXt0aGlzLnJlbmRlclNlc3Npb249YSx0aGlzLnNoYWRlcj10aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5kZWZhdWx0U2hhZGVyLHRoaXMuc3RhcnQoKX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5lbmQ9ZnVuY3Rpb24oKXt0aGlzLmZsdXNoKCl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUucmVuZGVyPWZ1bmN0aW9uKGEpe3ZhciBiPWEudGV4dHVyZTt0aGlzLmN1cnJlbnRCYXRjaFNpemU+PXRoaXMuc2l6ZSYmKHRoaXMuZmx1c2goKSx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1iLmJhc2VUZXh0dXJlKTt2YXIgYz1iLl91dnM7aWYoYyl7dmFyIGQsZSxmLGcsaD1hLndvcmxkQWxwaGEsaT1hLnRpbnQsaj10aGlzLnZlcnRpY2VzLGs9YS5hbmNob3IueCxsPWEuYW5jaG9yLnk7aWYoYi50cmltKXt2YXIgbT1iLnRyaW07ZT1tLngtayptLndpZHRoLGQ9ZStiLmNyb3Aud2lkdGgsZz1tLnktbCptLmhlaWdodCxmPWcrYi5jcm9wLmhlaWdodH1lbHNlIGQ9Yi5mcmFtZS53aWR0aCooMS1rKSxlPWIuZnJhbWUud2lkdGgqLWssZj1iLmZyYW1lLmhlaWdodCooMS1sKSxnPWIuZnJhbWUuaGVpZ2h0Ki1sO3ZhciBuPTQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUsbz1hLndvcmxkVHJhbnNmb3JtLHA9by5hLHE9by5jLHI9by5iLHM9by5kLHQ9by50eCx1PW8udHk7altuKytdPXAqZStyKmcrdCxqW24rK109cypnK3EqZSt1LGpbbisrXT1jLngwLGpbbisrXT1jLnkwLGpbbisrXT1oLGpbbisrXT1pLGpbbisrXT1wKmQrcipnK3QsaltuKytdPXMqZytxKmQrdSxqW24rK109Yy54MSxqW24rK109Yy55MSxqW24rK109aCxqW24rK109aSxqW24rK109cCpkK3IqZit0LGpbbisrXT1zKmYrcSpkK3UsaltuKytdPWMueDIsaltuKytdPWMueTIsaltuKytdPWgsaltuKytdPWksaltuKytdPXAqZStyKmYrdCxqW24rK109cypmK3EqZSt1LGpbbisrXT1jLngzLGpbbisrXT1jLnkzLGpbbisrXT1oLGpbbisrXT1pLHRoaXMudGV4dHVyZXNbdGhpcy5jdXJyZW50QmF0Y2hTaXplXT1hLnRleHR1cmUuYmFzZVRleHR1cmUsdGhpcy5ibGVuZE1vZGVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09YS5ibGVuZE1vZGUsdGhpcy5jdXJyZW50QmF0Y2hTaXplKyt9fSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlclRpbGluZ1Nwcml0ZT1mdW5jdGlvbihhKXt2YXIgYz1hLnRpbGluZ1RleHR1cmU7dGhpcy5jdXJyZW50QmF0Y2hTaXplPj10aGlzLnNpemUmJih0aGlzLmZsdXNoKCksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9Yy5iYXNlVGV4dHVyZSksYS5fdXZzfHwoYS5fdXZzPW5ldyBiLlRleHR1cmVVdnMpO3ZhciBkPWEuX3V2czthLnRpbGVQb3NpdGlvbi54JT1jLmJhc2VUZXh0dXJlLndpZHRoKmEudGlsZVNjYWxlT2Zmc2V0LngsYS50aWxlUG9zaXRpb24ueSU9Yy5iYXNlVGV4dHVyZS5oZWlnaHQqYS50aWxlU2NhbGVPZmZzZXQueTt2YXIgZT1hLnRpbGVQb3NpdGlvbi54LyhjLmJhc2VUZXh0dXJlLndpZHRoKmEudGlsZVNjYWxlT2Zmc2V0LngpLGY9YS50aWxlUG9zaXRpb24ueS8oYy5iYXNlVGV4dHVyZS5oZWlnaHQqYS50aWxlU2NhbGVPZmZzZXQueSksZz1hLndpZHRoL2MuYmFzZVRleHR1cmUud2lkdGgvKGEudGlsZVNjYWxlLngqYS50aWxlU2NhbGVPZmZzZXQueCksaD1hLmhlaWdodC9jLmJhc2VUZXh0dXJlLmhlaWdodC8oYS50aWxlU2NhbGUueSphLnRpbGVTY2FsZU9mZnNldC55KTtkLngwPTAtZSxkLnkwPTAtZixkLngxPTEqZy1lLGQueTE9MC1mLGQueDI9MSpnLWUsZC55Mj0xKmgtZixkLngzPTAtZSxkLnkzPTEqaC1mO3ZhciBpPWEud29ybGRBbHBoYSxqPWEudGludCxrPXRoaXMudmVydGljZXMsbD1hLndpZHRoLG09YS5oZWlnaHQsbj1hLmFuY2hvci54LG89YS5hbmNob3IueSxwPWwqKDEtbikscT1sKi1uLHI9bSooMS1vKSxzPW0qLW8sdD00KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplLHU9YS53b3JsZFRyYW5zZm9ybSx2PXUuYSx3PXUuYyx4PXUuYix5PXUuZCx6PXUudHgsQT11LnR5O2tbdCsrXT12KnEreCpzK3osa1t0KytdPXkqcyt3KnErQSxrW3QrK109ZC54MCxrW3QrK109ZC55MCxrW3QrK109aSxrW3QrK109aixrW3QrK109dipwK3gqcyt6LGtbdCsrXT15KnMrdypwK0Esa1t0KytdPWQueDEsa1t0KytdPWQueTEsa1t0KytdPWksa1t0KytdPWosa1t0KytdPXYqcCt4KnIreixrW3QrK109eSpyK3cqcCtBLGtbdCsrXT1kLngyLGtbdCsrXT1kLnkyLGtbdCsrXT1pLGtbdCsrXT1qLGtbdCsrXT12KnEreCpyK3osa1t0KytdPXkqcit3KnErQSxrW3QrK109ZC54MyxrW3QrK109ZC55MyxrW3QrK109aSxrW3QrK109aix0aGlzLnRleHR1cmVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09Yy5iYXNlVGV4dHVyZSx0aGlzLmJsZW5kTW9kZXNbdGhpcy5jdXJyZW50QmF0Y2hTaXplXT1hLmJsZW5kTW9kZSx0aGlzLmN1cnJlbnRCYXRjaFNpemUrK30sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5mbHVzaD1mdW5jdGlvbigpe2lmKDAhPT10aGlzLmN1cnJlbnRCYXRjaFNpemUpe3ZhciBhPXRoaXMuZ2w7aWYodGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLmRlZmF1bHRTaGFkZXIpLHRoaXMuZGlydHkpe3RoaXMuZGlydHk9ITEsYS5hY3RpdmVUZXh0dXJlKGEuVEVYVFVSRTApLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlcik7dmFyIGI9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb247YS51bmlmb3JtMmYodGhpcy5zaGFkZXIucHJvamVjdGlvblZlY3RvcixiLngsYi55KTt2YXIgYz00KnRoaXMudmVydFNpemU7YS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFWZXJ0ZXhQb3NpdGlvbiwyLGEuRkxPQVQsITEsYywwKSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVRleHR1cmVDb29yZCwyLGEuRkxPQVQsITEsYyw4KSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuY29sb3JBdHRyaWJ1dGUsMixhLkZMT0FULCExLGMsMTYpfWlmKHRoaXMuY3VycmVudEJhdGNoU2l6ZT4uNSp0aGlzLnNpemUpYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0aWNlcyk7ZWxzZXt2YXIgZD10aGlzLnZlcnRpY2VzLnN1YmFycmF5KDAsNCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSk7YS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsZCl9Zm9yKHZhciBlLGYsZz0wLGg9MCxpPW51bGwsaj10aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlci5jdXJyZW50QmxlbmRNb2RlLGs9MCxsPXRoaXMuY3VycmVudEJhdGNoU2l6ZTtsPms7aysrKWU9dGhpcy50ZXh0dXJlc1trXSxmPXRoaXMuYmxlbmRNb2Rlc1trXSwoaSE9PWV8fGohPT1mKSYmKHRoaXMucmVuZGVyQmF0Y2goaSxnLGgpLGg9ayxnPTAsaT1lLGo9Zix0aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlci5zZXRCbGVuZE1vZGUoaikpLGcrKzt0aGlzLnJlbmRlckJhdGNoKGksZyxoKSx0aGlzLmN1cnJlbnRCYXRjaFNpemU9MH19LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUucmVuZGVyQmF0Y2g9ZnVuY3Rpb24oYSxjLGQpe2lmKDAhPT1jKXt2YXIgZT10aGlzLmdsO2UuYmluZFRleHR1cmUoZS5URVhUVVJFXzJELGEuX2dsVGV4dHVyZXNbZS5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKGEsZSkpLGEuX2RpcnR5W2UuaWRdJiZiLnVwZGF0ZVdlYkdMVGV4dHVyZSh0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZSxlKSxlLmRyYXdFbGVtZW50cyhlLlRSSUFOR0xFUyw2KmMsZS5VTlNJR05FRF9TSE9SVCw2KmQqMiksdGhpcy5yZW5kZXJTZXNzaW9uLmRyYXdDb3VudCsrfX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zdG9wPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0YXJ0PWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eT0hMH0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy52ZXJ0aWNlcz1udWxsLHRoaXMuaW5kaWNlcz1udWxsLHRoaXMuZ2wuZGVsZXRlQnVmZmVyKHRoaXMudmVydGV4QnVmZmVyKSx0aGlzLmdsLmRlbGV0ZUJ1ZmZlcih0aGlzLmluZGV4QnVmZmVyKSx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1udWxsLHRoaXMuZ2w9bnVsbH0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaD1mdW5jdGlvbihhKXt0aGlzLnZlcnRTaXplPTEwLHRoaXMubWF4U2l6ZT02ZTMsdGhpcy5zaXplPXRoaXMubWF4U2l6ZTt2YXIgYj00KnRoaXMuc2l6ZSp0aGlzLnZlcnRTaXplLGM9Nip0aGlzLm1heFNpemU7dGhpcy52ZXJ0aWNlcz1uZXcgRmxvYXQzMkFycmF5KGIpLHRoaXMuaW5kaWNlcz1uZXcgVWludDE2QXJyYXkoYyksdGhpcy52ZXJ0ZXhCdWZmZXI9bnVsbCx0aGlzLmluZGV4QnVmZmVyPW51bGwsdGhpcy5sYXN0SW5kZXhDb3VudD0wO2Zvcih2YXIgZD0wLGU9MDtjPmQ7ZCs9NixlKz00KXRoaXMuaW5kaWNlc1tkKzBdPWUrMCx0aGlzLmluZGljZXNbZCsxXT1lKzEsdGhpcy5pbmRpY2VzW2QrMl09ZSsyLHRoaXMuaW5kaWNlc1tkKzNdPWUrMCx0aGlzLmluZGljZXNbZCs0XT1lKzIsdGhpcy5pbmRpY2VzW2QrNV09ZSszO3RoaXMuZHJhd2luZz0hMSx0aGlzLmN1cnJlbnRCYXRjaFNpemU9MCx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1udWxsLHRoaXMuY3VycmVudEJsZW5kTW9kZT0wLHRoaXMucmVuZGVyU2Vzc2lvbj1udWxsLHRoaXMuc2hhZGVyPW51bGwsdGhpcy5tYXRyaXg9bnVsbCx0aGlzLnNldENvbnRleHQoYSl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMudmVydGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kaWNlcyxhLlNUQVRJQ19EUkFXKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRpY2VzLGEuRFlOQU1JQ19EUkFXKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuYmVnaW49ZnVuY3Rpb24oYSxiKXt0aGlzLnJlbmRlclNlc3Npb249Yix0aGlzLnNoYWRlcj10aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5mYXN0U2hhZGVyLHRoaXMubWF0cml4PWEud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCksdGhpcy5zdGFydCgpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5lbmQ9ZnVuY3Rpb24oKXt0aGlzLmZsdXNoKCl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlcj1mdW5jdGlvbihhKXt2YXIgYj1hLmNoaWxkcmVuLGM9YlswXTtpZihjLnRleHR1cmUuX3V2cyl7dGhpcy5jdXJyZW50QmFzZVRleHR1cmU9Yy50ZXh0dXJlLmJhc2VUZXh0dXJlLGMuYmxlbmRNb2RlIT09dGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuY3VycmVudEJsZW5kTW9kZSYmKHRoaXMuZmx1c2goKSx0aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlci5zZXRCbGVuZE1vZGUoYy5ibGVuZE1vZGUpKTtmb3IodmFyIGQ9MCxlPWIubGVuZ3RoO2U+ZDtkKyspdGhpcy5yZW5kZXJTcHJpdGUoYltkXSk7dGhpcy5mbHVzaCgpfX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUucmVuZGVyU3ByaXRlPWZ1bmN0aW9uKGEpe2lmKGEudmlzaWJsZSYmKGEudGV4dHVyZS5iYXNlVGV4dHVyZT09PXRoaXMuY3VycmVudEJhc2VUZXh0dXJlfHwodGhpcy5mbHVzaCgpLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPWEudGV4dHVyZS5iYXNlVGV4dHVyZSxhLnRleHR1cmUuX3V2cykpKXt2YXIgYixjLGQsZSxmLGcsaCxpLGo9dGhpcy52ZXJ0aWNlcztpZihiPWEudGV4dHVyZS5fdXZzLGM9YS50ZXh0dXJlLmZyYW1lLndpZHRoLGQ9YS50ZXh0dXJlLmZyYW1lLmhlaWdodCxhLnRleHR1cmUudHJpbSl7dmFyIGs9YS50ZXh0dXJlLnRyaW07Zj1rLngtYS5hbmNob3IueCprLndpZHRoLGU9ZithLnRleHR1cmUuY3JvcC53aWR0aCxoPWsueS1hLmFuY2hvci55KmsuaGVpZ2h0LGc9aCthLnRleHR1cmUuY3JvcC5oZWlnaHR9ZWxzZSBlPWEudGV4dHVyZS5mcmFtZS53aWR0aCooMS1hLmFuY2hvci54KSxmPWEudGV4dHVyZS5mcmFtZS53aWR0aCotYS5hbmNob3IueCxnPWEudGV4dHVyZS5mcmFtZS5oZWlnaHQqKDEtYS5hbmNob3IueSksaD1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0Ki1hLmFuY2hvci55O2k9NCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSxqW2krK109ZixqW2krK109aCxqW2krK109YS5wb3NpdGlvbi54LGpbaSsrXT1hLnBvc2l0aW9uLnksaltpKytdPWEuc2NhbGUueCxqW2krK109YS5zY2FsZS55LGpbaSsrXT1hLnJvdGF0aW9uLGpbaSsrXT1iLngwLGpbaSsrXT1iLnkxLGpbaSsrXT1hLmFscGhhLGpbaSsrXT1lLGpbaSsrXT1oLGpbaSsrXT1hLnBvc2l0aW9uLngsaltpKytdPWEucG9zaXRpb24ueSxqW2krK109YS5zY2FsZS54LGpbaSsrXT1hLnNjYWxlLnksaltpKytdPWEucm90YXRpb24saltpKytdPWIueDEsaltpKytdPWIueTEsaltpKytdPWEuYWxwaGEsaltpKytdPWUsaltpKytdPWcsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MixqW2krK109Yi55MixqW2krK109YS5hbHBoYSxqW2krK109ZixqW2krK109ZyxqW2krK109YS5wb3NpdGlvbi54LGpbaSsrXT1hLnBvc2l0aW9uLnksaltpKytdPWEuc2NhbGUueCxqW2krK109YS5zY2FsZS55LGpbaSsrXT1hLnJvdGF0aW9uLGpbaSsrXT1iLngzLGpbaSsrXT1iLnkzLGpbaSsrXT1hLmFscGhhLHRoaXMuY3VycmVudEJhdGNoU2l6ZSsrLHRoaXMuY3VycmVudEJhdGNoU2l6ZT49dGhpcy5zaXplJiZ0aGlzLmZsdXNoKCl9fSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5mbHVzaD1mdW5jdGlvbigpe2lmKDAhPT10aGlzLmN1cnJlbnRCYXRjaFNpemUpe3ZhciBhPXRoaXMuZ2w7aWYodGhpcy5jdXJyZW50QmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYS5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKHRoaXMuY3VycmVudEJhc2VUZXh0dXJlLGEpLGEuYmluZFRleHR1cmUoYS5URVhUVVJFXzJELHRoaXMuY3VycmVudEJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2EuaWRdKSx0aGlzLmN1cnJlbnRCYXRjaFNpemU+LjUqdGhpcy5zaXplKWEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGljZXMpO2Vsc2V7dmFyIGM9dGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLDQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUpO2EuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLGMpfWEuZHJhd0VsZW1lbnRzKGEuVFJJQU5HTEVTLDYqdGhpcy5jdXJyZW50QmF0Y2hTaXplLGEuVU5TSUdORURfU0hPUlQsMCksdGhpcy5jdXJyZW50QmF0Y2hTaXplPTAsdGhpcy5yZW5kZXJTZXNzaW9uLmRyYXdDb3VudCsrfX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMuZmx1c2goKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuc3RhcnQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO2EuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpO3ZhciBiPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uO2EudW5pZm9ybTJmKHRoaXMuc2hhZGVyLnByb2plY3Rpb25WZWN0b3IsYi54LGIueSksYS51bmlmb3JtTWF0cml4M2Z2KHRoaXMuc2hhZGVyLnVNYXRyaXgsITEsdGhpcy5tYXRyaXgpO3ZhciBjPTQqdGhpcy52ZXJ0U2l6ZTthLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVZlcnRleFBvc2l0aW9uLDIsYS5GTE9BVCwhMSxjLDApLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hUG9zaXRpb25Db29yZCwyLGEuRkxPQVQsITEsYyw4KSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVNjYWxlLDIsYS5GTE9BVCwhMSxjLDE2KSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVJvdGF0aW9uLDEsYS5GTE9BVCwhMSxjLDI0KSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVRleHR1cmVDb29yZCwyLGEuRkxPQVQsITEsYywyOCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmNvbG9yQXR0cmlidXRlLDEsYS5GTE9BVCwhMSxjLDM2KX0sYi5XZWJHTEZpbHRlck1hbmFnZXI9ZnVuY3Rpb24oYSxiKXt0aGlzLnRyYW5zcGFyZW50PWIsdGhpcy5maWx0ZXJTdGFjaz1bXSx0aGlzLm9mZnNldFg9MCx0aGlzLm9mZnNldFk9MCx0aGlzLnNldENvbnRleHQoYSl9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLnRleHR1cmVQb29sPVtdLHRoaXMuaW5pdFNoYWRlckJ1ZmZlcnMoKX0sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLmJlZ2luPWZ1bmN0aW9uKGEsYil7dGhpcy5yZW5kZXJTZXNzaW9uPWEsdGhpcy5kZWZhdWx0U2hhZGVyPWEuc2hhZGVyTWFuYWdlci5kZWZhdWx0U2hhZGVyO3ZhciBjPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uO3RoaXMud2lkdGg9MipjLngsdGhpcy5oZWlnaHQ9MiotYy55LHRoaXMuYnVmZmVyPWJ9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5wdXNoRmlsdGVyPWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMuZ2wsZD10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbixlPXRoaXMucmVuZGVyU2Vzc2lvbi5vZmZzZXQ7YS5fZmlsdGVyQXJlYT1hLnRhcmdldC5maWx0ZXJBcmVhfHxhLnRhcmdldC5nZXRCb3VuZHMoKSx0aGlzLmZpbHRlclN0YWNrLnB1c2goYSk7dmFyIGY9YS5maWx0ZXJQYXNzZXNbMF07dGhpcy5vZmZzZXRYKz1hLl9maWx0ZXJBcmVhLngsdGhpcy5vZmZzZXRZKz1hLl9maWx0ZXJBcmVhLnk7dmFyIGc9dGhpcy50ZXh0dXJlUG9vbC5wb3AoKTtnP2cucmVzaXplKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpOmc9bmV3IGIuRmlsdGVyVGV4dHVyZSh0aGlzLmdsLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELGcudGV4dHVyZSk7dmFyIGg9YS5fZmlsdGVyQXJlYSxpPWYucGFkZGluZztoLngtPWksaC55LT1pLGgud2lkdGgrPTIqaSxoLmhlaWdodCs9MippLGgueDwwJiYoaC54PTApLGgud2lkdGg+dGhpcy53aWR0aCYmKGgud2lkdGg9dGhpcy53aWR0aCksaC55PDAmJihoLnk9MCksaC5oZWlnaHQ+dGhpcy5oZWlnaHQmJihoLmhlaWdodD10aGlzLmhlaWdodCksYy5iaW5kRnJhbWVidWZmZXIoYy5GUkFNRUJVRkZFUixnLmZyYW1lQnVmZmVyKSxjLnZpZXdwb3J0KDAsMCxoLndpZHRoLGguaGVpZ2h0KSxkLng9aC53aWR0aC8yLGQueT0taC5oZWlnaHQvMixlLng9LWgueCxlLnk9LWgueSx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIodGhpcy5kZWZhdWx0U2hhZGVyKSxjLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIucHJvamVjdGlvblZlY3RvcixoLndpZHRoLzIsLWguaGVpZ2h0LzIpLGMudW5pZm9ybTJmKHRoaXMuZGVmYXVsdFNoYWRlci5vZmZzZXRWZWN0b3IsLWgueCwtaC55KSxjLmNvbG9yTWFzayghMCwhMCwhMCwhMCksYy5jbGVhckNvbG9yKDAsMCwwLDApLGMuY2xlYXIoYy5DT0xPUl9CVUZGRVJfQklUKSxhLl9nbEZpbHRlclRleHR1cmU9Z30sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLnBvcEZpbHRlcj1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz10aGlzLmZpbHRlclN0YWNrLnBvcCgpLGQ9Yy5fZmlsdGVyQXJlYSxlPWMuX2dsRmlsdGVyVGV4dHVyZSxmPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uLGc9dGhpcy5yZW5kZXJTZXNzaW9uLm9mZnNldDtpZihjLmZpbHRlclBhc3Nlcy5sZW5ndGg+MSl7YS52aWV3cG9ydCgwLDAsZC53aWR0aCxkLmhlaWdodCksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSx0aGlzLnZlcnRleEFycmF5WzBdPTAsdGhpcy52ZXJ0ZXhBcnJheVsxXT1kLmhlaWdodCx0aGlzLnZlcnRleEFycmF5WzJdPWQud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVszXT1kLmhlaWdodCx0aGlzLnZlcnRleEFycmF5WzRdPTAsdGhpcy52ZXJ0ZXhBcnJheVs1XT0wLHRoaXMudmVydGV4QXJyYXlbNl09ZC53aWR0aCx0aGlzLnZlcnRleEFycmF5WzddPTAsYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0ZXhBcnJheSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudXZCdWZmZXIpLHRoaXMudXZBcnJheVsyXT1kLndpZHRoL3RoaXMud2lkdGgsdGhpcy51dkFycmF5WzVdPWQuaGVpZ2h0L3RoaXMuaGVpZ2h0LHRoaXMudXZBcnJheVs2XT1kLndpZHRoL3RoaXMud2lkdGgsdGhpcy51dkFycmF5WzddPWQuaGVpZ2h0L3RoaXMuaGVpZ2h0LGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudXZBcnJheSk7dmFyIGg9ZSxpPXRoaXMudGV4dHVyZVBvb2wucG9wKCk7aXx8KGk9bmV3IGIuRmlsdGVyVGV4dHVyZSh0aGlzLmdsLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpKSxpLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSxhLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLGkuZnJhbWVCdWZmZXIpLGEuY2xlYXIoYS5DT0xPUl9CVUZGRVJfQklUKSxhLmRpc2FibGUoYS5CTEVORCk7Zm9yKHZhciBqPTA7ajxjLmZpbHRlclBhc3Nlcy5sZW5ndGgtMTtqKyspe3ZhciBrPWMuZmlsdGVyUGFzc2VzW2pdO2EuYmluZEZyYW1lYnVmZmVyKGEuRlJBTUVCVUZGRVIsaS5mcmFtZUJ1ZmZlciksYS5hY3RpdmVUZXh0dXJlKGEuVEVYVFVSRTApLGEuYmluZFRleHR1cmUoYS5URVhUVVJFXzJELGgudGV4dHVyZSksdGhpcy5hcHBseUZpbHRlclBhc3MoayxkLGQud2lkdGgsZC5oZWlnaHQpO3ZhciBsPWg7aD1pLGk9bH1hLmVuYWJsZShhLkJMRU5EKSxlPWgsdGhpcy50ZXh0dXJlUG9vbC5wdXNoKGkpfXZhciBtPWMuZmlsdGVyUGFzc2VzW2MuZmlsdGVyUGFzc2VzLmxlbmd0aC0xXTt0aGlzLm9mZnNldFgtPWQueCx0aGlzLm9mZnNldFktPWQueTt2YXIgbj10aGlzLndpZHRoLG89dGhpcy5oZWlnaHQscD0wLHE9MCxyPXRoaXMuYnVmZmVyO2lmKDA9PT10aGlzLmZpbHRlclN0YWNrLmxlbmd0aClhLmNvbG9yTWFzayghMCwhMCwhMCwhMCk7ZWxzZXt2YXIgcz10aGlzLmZpbHRlclN0YWNrW3RoaXMuZmlsdGVyU3RhY2subGVuZ3RoLTFdO2Q9cy5fZmlsdGVyQXJlYSxuPWQud2lkdGgsbz1kLmhlaWdodCxwPWQueCxxPWQueSxyPXMuX2dsRmlsdGVyVGV4dHVyZS5mcmFtZUJ1ZmZlcn1mLng9bi8yLGYueT0tby8yLGcueD1wLGcueT1xLGQ9Yy5fZmlsdGVyQXJlYTt2YXIgdD1kLngtcCx1PWQueS1xO2EuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksdGhpcy52ZXJ0ZXhBcnJheVswXT10LHRoaXMudmVydGV4QXJyYXlbMV09dStkLmhlaWdodCx0aGlzLnZlcnRleEFycmF5WzJdPXQrZC53aWR0aCx0aGlzLnZlcnRleEFycmF5WzNdPXUrZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVs0XT10LHRoaXMudmVydGV4QXJyYXlbNV09dSx0aGlzLnZlcnRleEFycmF5WzZdPXQrZC53aWR0aCx0aGlzLnZlcnRleEFycmF5WzddPXUsYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0ZXhBcnJheSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudXZCdWZmZXIpLHRoaXMudXZBcnJheVsyXT1kLndpZHRoL3RoaXMud2lkdGgsdGhpcy51dkFycmF5WzVdPWQuaGVpZ2h0L3RoaXMuaGVpZ2h0LHRoaXMudXZBcnJheVs2XT1kLndpZHRoL3RoaXMud2lkdGgsdGhpcy51dkFycmF5WzddPWQuaGVpZ2h0L3RoaXMuaGVpZ2h0LGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudXZBcnJheSksYS52aWV3cG9ydCgwLDAsbixvKSxhLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLHIpLGEuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCxlLnRleHR1cmUpLHRoaXMuYXBwbHlGaWx0ZXJQYXNzKG0sZCxuLG8pLHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcih0aGlzLmRlZmF1bHRTaGFkZXIpLGEudW5pZm9ybTJmKHRoaXMuZGVmYXVsdFNoYWRlci5wcm9qZWN0aW9uVmVjdG9yLG4vMiwtby8yKSxhLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIub2Zmc2V0VmVjdG9yLC1wLC1xKSx0aGlzLnRleHR1cmVQb29sLnB1c2goZSksYy5fZ2xGaWx0ZXJUZXh0dXJlPW51bGx9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5hcHBseUZpbHRlclBhc3M9ZnVuY3Rpb24oYSxjLGQsZSl7dmFyIGY9dGhpcy5nbCxnPWEuc2hhZGVyc1tmLmlkXTtnfHwoZz1uZXcgYi5QaXhpU2hhZGVyKGYpLGcuZnJhZ21lbnRTcmM9YS5mcmFnbWVudFNyYyxnLnVuaWZvcm1zPWEudW5pZm9ybXMsZy5pbml0KCksYS5zaGFkZXJzW2YuaWRdPWcpLHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihnKSxmLnVuaWZvcm0yZihnLnByb2plY3Rpb25WZWN0b3IsZC8yLC1lLzIpLGYudW5pZm9ybTJmKGcub2Zmc2V0VmVjdG9yLDAsMCksYS51bmlmb3Jtcy5kaW1lbnNpb25zJiYoYS51bmlmb3Jtcy5kaW1lbnNpb25zLnZhbHVlWzBdPXRoaXMud2lkdGgsYS51bmlmb3Jtcy5kaW1lbnNpb25zLnZhbHVlWzFdPXRoaXMuaGVpZ2h0LGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVsyXT10aGlzLnZlcnRleEFycmF5WzBdLGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVszXT10aGlzLnZlcnRleEFycmF5WzVdKSxnLnN5bmNVbmlmb3JtcygpLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGcuYVZlcnRleFBvc2l0aW9uLDIsZi5GTE9BVCwhMSwwLDApLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZy5hVGV4dHVyZUNvb3JkLDIsZi5GTE9BVCwhMSwwLDApLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUix0aGlzLmNvbG9yQnVmZmVyKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZy5jb2xvckF0dHJpYnV0ZSwyLGYuRkxPQVQsITEsMCwwKSxmLmJpbmRCdWZmZXIoZi5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxmLmRyYXdFbGVtZW50cyhmLlRSSUFOR0xFUyw2LGYuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZW5kZXJTZXNzaW9uLmRyYXdDb3VudCsrfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuaW5pdFNoYWRlckJ1ZmZlcnM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO3RoaXMudmVydGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy51dkJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuY29sb3JCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmluZGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy52ZXJ0ZXhBcnJheT1uZXcgRmxvYXQzMkFycmF5KFswLDAsMSwwLDAsMSwxLDFdKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEFycmF5LGEuU1RBVElDX0RSQVcpLHRoaXMudXZBcnJheT1uZXcgRmxvYXQzMkFycmF5KFswLDAsMSwwLDAsMSwxLDFdKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy51dkJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMudXZBcnJheSxhLlNUQVRJQ19EUkFXKSx0aGlzLmNvbG9yQXJyYXk9bmV3IEZsb2F0MzJBcnJheShbMSwxNjc3NzIxNSwxLDE2Nzc3MjE1LDEsMTY3NzcyMTUsMSwxNjc3NzIxNV0pLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLmNvbG9yQnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvckFycmF5LGEuU1RBVElDX0RSQVcpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLG5ldyBVaW50MTZBcnJheShbMCwxLDIsMSwzLDJdKSxhLlNUQVRJQ19EUkFXKX0sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO3RoaXMuZmlsdGVyU3RhY2s9bnVsbCx0aGlzLm9mZnNldFg9MCx0aGlzLm9mZnNldFk9MDtmb3IodmFyIGI9MDtiPHRoaXMudGV4dHVyZVBvb2wubGVuZ3RoO2IrKyl0aGlzLnRleHR1cmVQb29sW2JdLmRlc3Ryb3koKTt0aGlzLnRleHR1cmVQb29sPW51bGwsYS5kZWxldGVCdWZmZXIodGhpcy52ZXJ0ZXhCdWZmZXIpLGEuZGVsZXRlQnVmZmVyKHRoaXMudXZCdWZmZXIpLGEuZGVsZXRlQnVmZmVyKHRoaXMuY29sb3JCdWZmZXIpLGEuZGVsZXRlQnVmZmVyKHRoaXMuaW5kZXhCdWZmZXIpfSxiLkZpbHRlclRleHR1cmU9ZnVuY3Rpb24oYSxjLGQsZSl7dGhpcy5nbD1hLHRoaXMuZnJhbWVCdWZmZXI9YS5jcmVhdGVGcmFtZWJ1ZmZlcigpLHRoaXMudGV4dHVyZT1hLmNyZWF0ZVRleHR1cmUoKSxlPWV8fGIuc2NhbGVNb2Rlcy5ERUZBVUxULGEuYmluZFRleHR1cmUoYS5URVhUVVJFXzJELHRoaXMudGV4dHVyZSksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfTUFHX0ZJTFRFUixlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9hLkxJTkVBUjphLk5FQVJFU1QpLGEudGV4UGFyYW1ldGVyaShhLlRFWFRVUkVfMkQsYS5URVhUVVJFX01JTl9GSUxURVIsZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/YS5MSU5FQVI6YS5ORUFSRVNUKSxhLnRleFBhcmFtZXRlcmkoYS5URVhUVVJFXzJELGEuVEVYVFVSRV9XUkFQX1MsYS5DTEFNUF9UT19FREdFKSxhLnRleFBhcmFtZXRlcmkoYS5URVhUVVJFXzJELGEuVEVYVFVSRV9XUkFQX1QsYS5DTEFNUF9UT19FREdFKSxhLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLHRoaXMuZnJhbWVidWZmZXIpLGEuYmluZEZyYW1lYnVmZmVyKGEuRlJBTUVCVUZGRVIsdGhpcy5mcmFtZUJ1ZmZlciksYS5mcmFtZWJ1ZmZlclRleHR1cmUyRChhLkZSQU1FQlVGRkVSLGEuQ09MT1JfQVRUQUNITUVOVDAsYS5URVhUVVJFXzJELHRoaXMudGV4dHVyZSwwKSx0aGlzLnJlbmRlckJ1ZmZlcj1hLmNyZWF0ZVJlbmRlcmJ1ZmZlcigpLGEuYmluZFJlbmRlcmJ1ZmZlcihhLlJFTkRFUkJVRkZFUix0aGlzLnJlbmRlckJ1ZmZlciksYS5mcmFtZWJ1ZmZlclJlbmRlcmJ1ZmZlcihhLkZSQU1FQlVGRkVSLGEuREVQVEhfU1RFTkNJTF9BVFRBQ0hNRU5ULGEuUkVOREVSQlVGRkVSLHRoaXMucmVuZGVyQnVmZmVyKSx0aGlzLnJlc2l6ZShjLGQpfSxiLkZpbHRlclRleHR1cmUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDthLmNsZWFyQ29sb3IoMCwwLDAsMCksYS5jbGVhcihhLkNPTE9SX0JVRkZFUl9CSVQpfSxiLkZpbHRlclRleHR1cmUucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGIpe2lmKHRoaXMud2lkdGghPT1hfHx0aGlzLmhlaWdodCE9PWIpe3RoaXMud2lkdGg9YSx0aGlzLmhlaWdodD1iO3ZhciBjPXRoaXMuZ2w7Yy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlKSxjLnRleEltYWdlMkQoYy5URVhUVVJFXzJELDAsYy5SR0JBLGEsYiwwLGMuUkdCQSxjLlVOU0lHTkVEX0JZVEUsbnVsbCksYy5iaW5kUmVuZGVyYnVmZmVyKGMuUkVOREVSQlVGRkVSLHRoaXMucmVuZGVyQnVmZmVyKSxjLnJlbmRlcmJ1ZmZlclN0b3JhZ2UoYy5SRU5ERVJCVUZGRVIsYy5ERVBUSF9TVEVOQ0lMLGEsYil9fSxiLkZpbHRlclRleHR1cmUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO2EuZGVsZXRlRnJhbWVidWZmZXIodGhpcy5mcmFtZUJ1ZmZlciksYS5kZWxldGVUZXh0dXJlKHRoaXMudGV4dHVyZSksdGhpcy5mcmFtZUJ1ZmZlcj1udWxsLHRoaXMudGV4dHVyZT1udWxsfSxiLkNhbnZhc01hc2tNYW5hZ2VyPWZ1bmN0aW9uKCl7fSxiLkNhbnZhc01hc2tNYW5hZ2VyLnByb3RvdHlwZS5wdXNoTWFzaz1mdW5jdGlvbihhLGMpe2Muc2F2ZSgpO3ZhciBkPWEuYWxwaGEsZT1hLndvcmxkVHJhbnNmb3JtO2Muc2V0VHJhbnNmb3JtKGUuYSxlLmMsZS5iLGUuZCxlLnR4LGUudHkpLGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3NNYXNrKGEsYyksYy5jbGlwKCksYS53b3JsZEFscGhhPWR9LGIuQ2FudmFzTWFza01hbmFnZXIucHJvdG90eXBlLnBvcE1hc2s9ZnVuY3Rpb24oYSl7YS5yZXN0b3JlKCl9LGIuQ2FudmFzVGludGVyPWZ1bmN0aW9uKCl7fSxiLkNhbnZhc1RpbnRlci5nZXRUaW50ZWRUZXh0dXJlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS50ZXh0dXJlO2M9Yi5DYW52YXNUaW50ZXIucm91bmRDb2xvcihjKTt2YXIgZT1cIiNcIisoXCIwMDAwMFwiKygwfGMpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KTtpZihkLnRpbnRDYWNoZT1kLnRpbnRDYWNoZXx8e30sZC50aW50Q2FjaGVbZV0pcmV0dXJuIGQudGludENhY2hlW2VdO3ZhciBmPWIuQ2FudmFzVGludGVyLmNhbnZhc3x8ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtpZihiLkNhbnZhc1RpbnRlci50aW50TWV0aG9kKGQsYyxmKSxiLkNhbnZhc1RpbnRlci5jb252ZXJ0VGludFRvSW1hZ2Upe3ZhciBnPW5ldyBJbWFnZTtnLnNyYz1mLnRvRGF0YVVSTCgpLGQudGludENhY2hlW2VdPWd9ZWxzZSBkLnRpbnRDYWNoZVtlXT1mLGIuQ2FudmFzVGludGVyLmNhbnZhcz1udWxsO3JldHVybiBmfSxiLkNhbnZhc1RpbnRlci50aW50V2l0aE11bHRpcGx5PWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1jLmdldENvbnRleHQoXCIyZFwiKSxlPWEuZnJhbWU7Yy53aWR0aD1lLndpZHRoLGMuaGVpZ2h0PWUuaGVpZ2h0LGQuZmlsbFN0eWxlPVwiI1wiKyhcIjAwMDAwXCIrKDB8YikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGQuZmlsbFJlY3QoMCwwLGUud2lkdGgsZS5oZWlnaHQpLGQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwibXVsdGlwbHlcIixkLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxlLngsZS55LGUud2lkdGgsZS5oZWlnaHQsMCwwLGUud2lkdGgsZS5oZWlnaHQpLGQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwiZGVzdGluYXRpb24tYXRvcFwiLGQuZHJhd0ltYWdlKGEuYmFzZVRleHR1cmUuc291cmNlLGUueCxlLnksZS53aWR0aCxlLmhlaWdodCwwLDAsZS53aWR0aCxlLmhlaWdodCl9LGIuQ2FudmFzVGludGVyLnRpbnRXaXRoT3ZlcmxheT1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yy5nZXRDb250ZXh0KFwiMmRcIiksZT1hLmZyYW1lO2Mud2lkdGg9ZS53aWR0aCxjLmhlaWdodD1lLmhlaWdodCxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImNvcHlcIixkLmZpbGxTdHlsZT1cIiNcIisoXCIwMDAwMFwiKygwfGIpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxkLmZpbGxSZWN0KDAsMCxlLndpZHRoLGUuaGVpZ2h0KSxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImRlc3RpbmF0aW9uLWF0b3BcIixkLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxlLngsZS55LGUud2lkdGgsZS5oZWlnaHQsMCwwLGUud2lkdGgsZS5oZWlnaHQpfSxiLkNhbnZhc1RpbnRlci50aW50V2l0aFBlclBpeGVsPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1kLmdldENvbnRleHQoXCIyZFwiKSxmPWEuZnJhbWU7ZC53aWR0aD1mLndpZHRoLGQuaGVpZ2h0PWYuaGVpZ2h0LGUuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwiY29weVwiLGUuZHJhd0ltYWdlKGEuYmFzZVRleHR1cmUuc291cmNlLGYueCxmLnksZi53aWR0aCxmLmhlaWdodCwwLDAsZi53aWR0aCxmLmhlaWdodCk7Zm9yKHZhciBnPWIuaGV4MnJnYihjKSxoPWdbMF0saT1nWzFdLGo9Z1syXSxrPWUuZ2V0SW1hZ2VEYXRhKDAsMCxmLndpZHRoLGYuaGVpZ2h0KSxsPWsuZGF0YSxtPTA7bTxsLmxlbmd0aDttKz00KWxbbSswXSo9aCxsW20rMV0qPWksbFttKzJdKj1qO2UucHV0SW1hZ2VEYXRhKGssMCwwKX0sYi5DYW52YXNUaW50ZXIucm91bmRDb2xvcj1mdW5jdGlvbihhKXt2YXIgYz1iLkNhbnZhc1RpbnRlci5jYWNoZVN0ZXBzUGVyQ29sb3JDaGFubmVsLGQ9Yi5oZXgycmdiKGEpO3JldHVybiBkWzBdPU1hdGgubWluKDI1NSxkWzBdL2MqYyksZFsxXT1NYXRoLm1pbigyNTUsZFsxXS9jKmMpLGRbMl09TWF0aC5taW4oMjU1LGRbMl0vYypjKSxiLnJnYjJoZXgoZCl9LGIuQ2FudmFzVGludGVyLmNhY2hlU3RlcHNQZXJDb2xvckNoYW5uZWw9OCxiLkNhbnZhc1RpbnRlci5jb252ZXJ0VGludFRvSW1hZ2U9ITEsYi5DYW52YXNUaW50ZXIuY2FuVXNlTXVsdGlwbHk9Yi5jYW5Vc2VOZXdDYW52YXNCbGVuZE1vZGVzKCksYi5DYW52YXNUaW50ZXIudGludE1ldGhvZD1iLkNhbnZhc1RpbnRlci5jYW5Vc2VNdWx0aXBseT9iLkNhbnZhc1RpbnRlci50aW50V2l0aE11bHRpcGx5OmIuQ2FudmFzVGludGVyLnRpbnRXaXRoUGVyUGl4ZWwsYi5DYW52YXNSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlKXtiLmRlZmF1bHRSZW5kZXJlcnx8KGIuc2F5SGVsbG8oXCJDYW52YXNcIiksYi5kZWZhdWx0UmVuZGVyZXI9dGhpcyksdGhpcy50eXBlPWIuQ0FOVkFTX1JFTkRFUkVSLHRoaXMuY2xlYXJCZWZvcmVSZW5kZXI9ITAsdGhpcy50cmFuc3BhcmVudD0hIWUsYi5ibGVuZE1vZGVzQ2FudmFzfHwoYi5ibGVuZE1vZGVzQ2FudmFzPVtdLGIuY2FuVXNlTmV3Q2FudmFzQmxlbmRNb2RlcygpPyhiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk5PUk1BTF09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQUREXT1cImxpZ2h0ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk1VTFRJUExZXT1cIm11bHRpcGx5XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TQ1JFRU5dPVwic2NyZWVuXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5PVkVSTEFZXT1cIm92ZXJsYXlcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkRBUktFTl09XCJkYXJrZW5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxJR0hURU5dPVwibGlnaHRlblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JfRE9ER0VdPVwiY29sb3ItZG9kZ2VcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0JVUk5dPVwiY29sb3ItYnVyblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuSEFSRF9MSUdIVF09XCJoYXJkLWxpZ2h0XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TT0ZUX0xJR0hUXT1cInNvZnQtbGlnaHRcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkRJRkZFUkVOQ0VdPVwiZGlmZmVyZW5jZVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuRVhDTFVTSU9OXT1cImV4Y2x1c2lvblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuSFVFXT1cImh1ZVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0FUVVJBVElPTl09XCJzYXR1cmF0aW9uXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl09XCJjb2xvclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTFVNSU5PU0lUWV09XCJsdW1pbm9zaXR5XCIpOihiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk5PUk1BTF09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQUREXT1cImxpZ2h0ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk1VTFRJUExZXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TQ1JFRU5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk9WRVJMQVldPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkRBUktFTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTElHSFRFTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JfRE9ER0VdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0JVUk5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhBUkRfTElHSFRdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNPRlRfTElHSFRdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkRJRkZFUkVOQ0VdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkVYQ0xVU0lPTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuSFVFXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TQVRVUkFUSU9OXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTFVNSU5PU0lUWV09XCJzb3VyY2Utb3ZlclwiKSksdGhpcy53aWR0aD1hfHw4MDAsdGhpcy5oZWlnaHQ9Y3x8NjAwLHRoaXMudmlldz1kfHxkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLHRoaXMuY29udGV4dD10aGlzLnZpZXcuZ2V0Q29udGV4dChcIjJkXCIse2FscGhhOnRoaXMudHJhbnNwYXJlbnR9KSx0aGlzLnJlZnJlc2g9ITAsdGhpcy52aWV3LndpZHRoPXRoaXMud2lkdGgsdGhpcy52aWV3LmhlaWdodD10aGlzLmhlaWdodCx0aGlzLmNvdW50PTAsdGhpcy5tYXNrTWFuYWdlcj1uZXcgYi5DYW52YXNNYXNrTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb249e2NvbnRleHQ6dGhpcy5jb250ZXh0LG1hc2tNYW5hZ2VyOnRoaXMubWFza01hbmFnZXIsc2NhbGVNb2RlOm51bGwsc21vb3RoUHJvcGVydHk6bnVsbCxyb3VuZFBpeGVsczohMX0sXCJpbWFnZVNtb290aGluZ0VuYWJsZWRcImluIHRoaXMuY29udGV4dD90aGlzLnJlbmRlclNlc3Npb24uc21vb3RoUHJvcGVydHk9XCJpbWFnZVNtb290aGluZ0VuYWJsZWRcIjpcIndlYmtpdEltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0P3RoaXMucmVuZGVyU2Vzc2lvbi5zbW9vdGhQcm9wZXJ0eT1cIndlYmtpdEltYWdlU21vb3RoaW5nRW5hYmxlZFwiOlwibW96SW1hZ2VTbW9vdGhpbmdFbmFibGVkXCJpbiB0aGlzLmNvbnRleHQ/dGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwibW96SW1hZ2VTbW9vdGhpbmdFbmFibGVkXCI6XCJvSW1hZ2VTbW9vdGhpbmdFbmFibGVkXCJpbiB0aGlzLmNvbnRleHQmJih0aGlzLnJlbmRlclNlc3Npb24uc21vb3RoUHJvcGVydHk9XCJvSW1hZ2VTbW9vdGhpbmdFbmFibGVkXCIpfSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkNhbnZhc1JlbmRlcmVyLGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlcj1mdW5jdGlvbihhKXtiLnRleHR1cmVzVG9VcGRhdGUubGVuZ3RoPTAsYi50ZXh0dXJlc1RvRGVzdHJveS5sZW5ndGg9MCxhLnVwZGF0ZVRyYW5zZm9ybSgpLHRoaXMuY29udGV4dC5zZXRUcmFuc2Zvcm0oMSwwLDAsMSwwLDApLHRoaXMuY29udGV4dC5nbG9iYWxBbHBoYT0xLG5hdmlnYXRvci5pc0NvY29vbkpTJiZ0aGlzLnZpZXcuc2NyZWVuY2FudmFzJiYodGhpcy5jb250ZXh0LmZpbGxTdHlsZT1cImJsYWNrXCIsdGhpcy5jb250ZXh0LmNsZWFyKCkpLCF0aGlzLnRyYW5zcGFyZW50JiZ0aGlzLmNsZWFyQmVmb3JlUmVuZGVyPyh0aGlzLmNvbnRleHQuZmlsbFN0eWxlPWEuYmFja2dyb3VuZENvbG9yU3RyaW5nLHRoaXMuY29udGV4dC5maWxsUmVjdCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCkpOnRoaXMudHJhbnNwYXJlbnQmJnRoaXMuY2xlYXJCZWZvcmVSZW5kZXImJnRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMucmVuZGVyRGlzcGxheU9iamVjdChhKSxhLmludGVyYWN0aXZlJiYoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZHx8KGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQ9ITAsYS5pbnRlcmFjdGlvbk1hbmFnZXIuc2V0VGFyZ2V0KHRoaXMpKSksYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5sZW5ndGg+MCYmKGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMubGVuZ3RoPTApXHJcbn0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKGEsYil7dGhpcy53aWR0aD1hLHRoaXMuaGVpZ2h0PWIsdGhpcy52aWV3LndpZHRoPWEsdGhpcy52aWV3LmhlaWdodD1ifSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJEaXNwbGF5T2JqZWN0PWZ1bmN0aW9uKGEsYil7dGhpcy5yZW5kZXJTZXNzaW9uLmNvbnRleHQ9Ynx8dGhpcy5jb250ZXh0LGEuX3JlbmRlckNhbnZhcyh0aGlzLnJlbmRlclNlc3Npb24pfSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJTdHJpcEZsYXQ9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5jb250ZXh0LGM9YS52ZXJ0aWNpZXMsZD1jLmxlbmd0aC8yO3RoaXMuY291bnQrKyxiLmJlZ2luUGF0aCgpO2Zvcih2YXIgZT0xO2QtMj5lO2UrKyl7dmFyIGY9MiplLGc9Y1tmXSxoPWNbZisyXSxpPWNbZis0XSxqPWNbZisxXSxrPWNbZiszXSxsPWNbZis1XTtiLm1vdmVUbyhnLGopLGIubGluZVRvKGgsayksYi5saW5lVG8oaSxsKX1iLmZpbGxTdHlsZT1cIiNGRjAwMDBcIixiLmZpbGwoKSxiLmNsb3NlUGF0aCgpfSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJTdHJpcD1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmNvbnRleHQsYz1hLnZlcnRpY2llcyxkPWEudXZzLGU9Yy5sZW5ndGgvMjt0aGlzLmNvdW50Kys7Zm9yKHZhciBmPTE7ZS0yPmY7ZisrKXt2YXIgZz0yKmYsaD1jW2ddLGk9Y1tnKzJdLGo9Y1tnKzRdLGs9Y1tnKzFdLGw9Y1tnKzNdLG09Y1tnKzVdLG49ZFtnXSphLnRleHR1cmUud2lkdGgsbz1kW2crMl0qYS50ZXh0dXJlLndpZHRoLHA9ZFtnKzRdKmEudGV4dHVyZS53aWR0aCxxPWRbZysxXSphLnRleHR1cmUuaGVpZ2h0LHI9ZFtnKzNdKmEudGV4dHVyZS5oZWlnaHQscz1kW2crNV0qYS50ZXh0dXJlLmhlaWdodDtiLnNhdmUoKSxiLmJlZ2luUGF0aCgpLGIubW92ZVRvKGgsayksYi5saW5lVG8oaSxsKSxiLmxpbmVUbyhqLG0pLGIuY2xvc2VQYXRoKCksYi5jbGlwKCk7dmFyIHQ9bipyK3EqcCtvKnMtcipwLXEqby1uKnMsdT1oKnIrcSpqK2kqcy1yKmotcSppLWgqcyx2PW4qaStoKnArbypqLWkqcC1oKm8tbipqLHc9bipyKmorcSppKnAraCpvKnMtaCpyKnAtcSpvKmotbippKnMseD1rKnIrcSptK2wqcy1yKm0tcSpsLWsqcyx5PW4qbCtrKnArbyptLWwqcC1rKm8tbiptLHo9bipyKm0rcSpsKnAraypvKnMtaypyKnAtcSpvKm0tbipsKnM7Yi50cmFuc2Zvcm0odS90LHgvdCx2L3QseS90LHcvdCx6L3QpLGIuZHJhd0ltYWdlKGEudGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsMCwwKSxiLnJlc3RvcmUoKX19LGIuQ2FudmFzQnVmZmVyPWZ1bmN0aW9uKGEsYil7dGhpcy53aWR0aD1hLHRoaXMuaGVpZ2h0PWIsdGhpcy5jYW52YXM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSx0aGlzLmNvbnRleHQ9dGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpLHRoaXMuY2FudmFzLndpZHRoPWEsdGhpcy5jYW52YXMuaGVpZ2h0PWJ9LGIuQ2FudmFzQnVmZmVyLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3RoaXMuY29udGV4dC5jbGVhclJlY3QoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLkNhbnZhc0J1ZmZlci5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKGEsYil7dGhpcy53aWR0aD10aGlzLmNhbnZhcy53aWR0aD1hLHRoaXMuaGVpZ2h0PXRoaXMuY2FudmFzLmhlaWdodD1ifSxiLkNhbnZhc0dyYXBoaWNzPWZ1bmN0aW9uKCl7fSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzPWZ1bmN0aW9uKGEsYyl7Zm9yKHZhciBkPWEud29ybGRBbHBoYSxlPVwiXCIsZj0wO2Y8YS5ncmFwaGljc0RhdGEubGVuZ3RoO2YrKyl7dmFyIGc9YS5ncmFwaGljc0RhdGFbZl0saD1nLnBvaW50cztpZihjLnN0cm9rZVN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmxpbmVDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMubGluZVdpZHRoPWcubGluZVdpZHRoLGcudHlwZT09PWIuR3JhcGhpY3MuUE9MWSl7Yy5iZWdpblBhdGgoKSxjLm1vdmVUbyhoWzBdLGhbMV0pO2Zvcih2YXIgaT0xO2k8aC5sZW5ndGgvMjtpKyspYy5saW5lVG8oaFsyKmldLGhbMippKzFdKTtoWzBdPT09aFtoLmxlbmd0aC0yXSYmaFsxXT09PWhbaC5sZW5ndGgtMV0mJmMuY2xvc2VQYXRoKCksZy5maWxsJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKX1lbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuUkVDVCkoZy5maWxsQ29sb3J8fDA9PT1nLmZpbGxDb2xvcikmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsUmVjdChoWzBdLGhbMV0saFsyXSxoWzNdKSksZy5saW5lV2lkdGgmJihjLmdsb2JhbEFscGhhPWcubGluZUFscGhhKmQsYy5zdHJva2VSZWN0KGhbMF0saFsxXSxoWzJdLGhbM10pKTtlbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuQ0lSQyljLmJlZ2luUGF0aCgpLGMuYXJjKGhbMF0saFsxXSxoWzJdLDAsMipNYXRoLlBJKSxjLmNsb3NlUGF0aCgpLGcuZmlsbCYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGwoKSksZy5saW5lV2lkdGgmJihjLmdsb2JhbEFscGhhPWcubGluZUFscGhhKmQsYy5zdHJva2UoKSk7ZWxzZSBpZihnLnR5cGU9PT1iLkdyYXBoaWNzLkVMSVApe3ZhciBqPWcucG9pbnRzLGs9MipqWzJdLGw9MipqWzNdLG09alswXS1rLzIsbj1qWzFdLWwvMjtjLmJlZ2luUGF0aCgpO3ZhciBvPS41NTIyODQ4LHA9ay8yKm8scT1sLzIqbyxyPW0rayxzPW4rbCx0PW0ray8yLHU9bitsLzI7Yy5tb3ZlVG8obSx1KSxjLmJlemllckN1cnZlVG8obSx1LXEsdC1wLG4sdCxuKSxjLmJlemllckN1cnZlVG8odCtwLG4scix1LXEscix1KSxjLmJlemllckN1cnZlVG8ocix1K3EsdCtwLHMsdCxzKSxjLmJlemllckN1cnZlVG8odC1wLHMsbSx1K3EsbSx1KSxjLmNsb3NlUGF0aCgpLGcuZmlsbCYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGwoKSksZy5saW5lV2lkdGgmJihjLmdsb2JhbEFscGhhPWcubGluZUFscGhhKmQsYy5zdHJva2UoKSl9ZWxzZSBpZihnLnR5cGU9PT1iLkdyYXBoaWNzLlJSRUMpe3ZhciB2PWhbMF0sdz1oWzFdLHg9aFsyXSx5PWhbM10sej1oWzRdLEE9TWF0aC5taW4oeCx5KS8yfDA7ej16PkE/QTp6LGMuYmVnaW5QYXRoKCksYy5tb3ZlVG8odix3K3opLGMubGluZVRvKHYsdyt5LXopLGMucXVhZHJhdGljQ3VydmVUbyh2LHcreSx2K3osdyt5KSxjLmxpbmVUbyh2K3gteix3K3kpLGMucXVhZHJhdGljQ3VydmVUbyh2K3gsdyt5LHYreCx3K3kteiksYy5saW5lVG8odit4LHcreiksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYreCx3LHYreC16LHcpLGMubGluZVRvKHYreix3KSxjLnF1YWRyYXRpY0N1cnZlVG8odix3LHYsdyt6KSxjLmNsb3NlUGF0aCgpLChnLmZpbGxDb2xvcnx8MD09PWcuZmlsbENvbG9yKSYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGwoKSksZy5saW5lV2lkdGgmJihjLmdsb2JhbEFscGhhPWcubGluZUFscGhhKmQsYy5zdHJva2UoKSl9fX0sYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljc01hc2s9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLmdyYXBoaWNzRGF0YS5sZW5ndGg7aWYoMCE9PWQpe2Q+MSYmKGQ9MSx3aW5kb3cuY29uc29sZS5sb2coXCJQaXhpLmpzIHdhcm5pbmc6IG1hc2tzIGluIGNhbnZhcyBjYW4gb25seSBtYXNrIHVzaW5nIHRoZSBmaXJzdCBwYXRoIGluIHRoZSBncmFwaGljcyBvYmplY3RcIikpO2Zvcih2YXIgZT0wOzE+ZTtlKyspe3ZhciBmPWEuZ3JhcGhpY3NEYXRhW2VdLGc9Zi5wb2ludHM7aWYoZi50eXBlPT09Yi5HcmFwaGljcy5QT0xZKXtjLmJlZ2luUGF0aCgpLGMubW92ZVRvKGdbMF0sZ1sxXSk7Zm9yKHZhciBoPTE7aDxnLmxlbmd0aC8yO2grKyljLmxpbmVUbyhnWzIqaF0sZ1syKmgrMV0pO2dbMF09PT1nW2cubGVuZ3RoLTJdJiZnWzFdPT09Z1tnLmxlbmd0aC0xXSYmYy5jbG9zZVBhdGgoKX1lbHNlIGlmKGYudHlwZT09PWIuR3JhcGhpY3MuUkVDVCljLmJlZ2luUGF0aCgpLGMucmVjdChnWzBdLGdbMV0sZ1syXSxnWzNdKSxjLmNsb3NlUGF0aCgpO2Vsc2UgaWYoZi50eXBlPT09Yi5HcmFwaGljcy5DSVJDKWMuYmVnaW5QYXRoKCksYy5hcmMoZ1swXSxnWzFdLGdbMl0sMCwyKk1hdGguUEkpLGMuY2xvc2VQYXRoKCk7ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLkVMSVApe3ZhciBpPWYucG9pbnRzLGo9MippWzJdLGs9MippWzNdLGw9aVswXS1qLzIsbT1pWzFdLWsvMjtjLmJlZ2luUGF0aCgpO3ZhciBuPS41NTIyODQ4LG89ai8yKm4scD1rLzIqbixxPWwraixyPW0rayxzPWwrai8yLHQ9bStrLzI7Yy5tb3ZlVG8obCx0KSxjLmJlemllckN1cnZlVG8obCx0LXAscy1vLG0scyxtKSxjLmJlemllckN1cnZlVG8ocytvLG0scSx0LXAscSx0KSxjLmJlemllckN1cnZlVG8ocSx0K3AscytvLHIscyxyKSxjLmJlemllckN1cnZlVG8ocy1vLHIsbCx0K3AsbCx0KSxjLmNsb3NlUGF0aCgpfWVsc2UgaWYoZi50eXBlPT09Yi5HcmFwaGljcy5SUkVDKXt2YXIgdT1nWzBdLHY9Z1sxXSx3PWdbMl0seD1nWzNdLHk9Z1s0XSx6PU1hdGgubWluKHcseCkvMnwwO3k9eT56P3o6eSxjLmJlZ2luUGF0aCgpLGMubW92ZVRvKHUsdit5KSxjLmxpbmVUbyh1LHYreC15KSxjLnF1YWRyYXRpY0N1cnZlVG8odSx2K3gsdSt5LHYreCksYy5saW5lVG8odSt3LXksdit4KSxjLnF1YWRyYXRpY0N1cnZlVG8odSt3LHYreCx1K3csdit4LXkpLGMubGluZVRvKHUrdyx2K3kpLGMucXVhZHJhdGljQ3VydmVUbyh1K3csdix1K3cteSx2KSxjLmxpbmVUbyh1K3ksdiksYy5xdWFkcmF0aWNDdXJ2ZVRvKHUsdix1LHYreSksYy5jbG9zZVBhdGgoKX19fX0sYi5HcmFwaGljcz1mdW5jdGlvbigpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMucmVuZGVyYWJsZT0hMCx0aGlzLmZpbGxBbHBoYT0xLHRoaXMubGluZVdpZHRoPTAsdGhpcy5saW5lQ29sb3I9XCJibGFja1wiLHRoaXMuZ3JhcGhpY3NEYXRhPVtdLHRoaXMudGludD0xNjc3NzIxNSx0aGlzLmJsZW5kTW9kZT1iLmJsZW5kTW9kZXMuTk9STUFMLHRoaXMuY3VycmVudFBhdGg9e3BvaW50czpbXX0sdGhpcy5fd2ViR0w9W10sdGhpcy5pc01hc2s9ITEsdGhpcy5ib3VuZHM9bnVsbCx0aGlzLmJvdW5kc1BhZGRpbmc9MTAsdGhpcy5kaXJ0eT0hMH0sYi5HcmFwaGljcy5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLkdyYXBoaWNzLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkdyYXBoaWNzLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkdyYXBoaWNzLnByb3RvdHlwZSxcImNhY2hlQXNCaXRtYXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2NhY2hlQXNCaXRtYXB9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9jYWNoZUFzQml0bWFwPWEsdGhpcy5fY2FjaGVBc0JpdG1hcD90aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpOih0aGlzLmRlc3Ryb3lDYWNoZWRTcHJpdGUoKSx0aGlzLmRpcnR5PSEwKX19KSxiLkdyYXBoaWNzLnByb3RvdHlwZS5saW5lU3R5bGU9ZnVuY3Rpb24oYSxjLGQpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMubGluZVdpZHRoPWF8fDAsdGhpcy5saW5lQ29sb3I9Y3x8MCx0aGlzLmxpbmVBbHBoYT1hcmd1bWVudHMubGVuZ3RoPDM/MTpkLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOltdLHR5cGU6Yi5HcmFwaGljcy5QT0xZfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLm1vdmVUbz1mdW5jdGlvbihhLGMpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9dGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W10sdHlwZTpiLkdyYXBoaWNzLlBPTFl9LHRoaXMuY3VycmVudFBhdGgucG9pbnRzLnB1c2goYSxjKSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmxpbmVUbz1mdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5wdXNoKGEsYiksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5xdWFkcmF0aWNDdXJ2ZVRvPWZ1bmN0aW9uKGEsYixjLGQpezA9PT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGgmJnRoaXMubW92ZVRvKDAsMCk7dmFyIGUsZixnPTIwLGg9dGhpcy5jdXJyZW50UGF0aC5wb2ludHM7MD09PWgubGVuZ3RoJiZ0aGlzLm1vdmVUbygwLDApO2Zvcih2YXIgaT1oW2gubGVuZ3RoLTJdLGo9aFtoLmxlbmd0aC0xXSxrPTAsbD0xO2c+PWw7bCsrKWs9bC9nLGU9aSsoYS1pKSprLGY9aisoYi1qKSprLGgucHVzaChlKyhhKyhjLWEpKmstZSkqayxmKyhiKyhkLWIpKmstZikqayk7cmV0dXJuIHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuYmV6aWVyQ3VydmVUbz1mdW5jdGlvbihhLGIsYyxkLGUsZil7MD09PXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aCYmdGhpcy5tb3ZlVG8oMCwwKTtmb3IodmFyIGcsaCxpLGosayxsPTIwLG09dGhpcy5jdXJyZW50UGF0aC5wb2ludHMsbj1tW20ubGVuZ3RoLTJdLG89bVttLmxlbmd0aC0xXSxwPTAscT0xO2w+cTtxKyspcD1xL2wsZz0xLXAsaD1nKmcsaT1oKmcsaj1wKnAsaz1qKnAsbS5wdXNoKGkqbiszKmgqcCphKzMqZypqKmMrayplLGkqbyszKmgqcCpiKzMqZypqKmQraypmKTtyZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5hcmNUbz1mdW5jdGlvbihhLGIsYyxkLGUpezA9PT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGgmJnRoaXMubW92ZVRvKGEsYik7dmFyIGY9dGhpcy5jdXJyZW50UGF0aC5wb2ludHMsZz1mW2YubGVuZ3RoLTJdLGg9ZltmLmxlbmd0aC0xXSxpPWgtYixqPWctYSxrPWQtYixsPWMtYSxtPU1hdGguYWJzKGkqbC1qKmspO2lmKDFlLTg+bXx8MD09PWUpZi5wdXNoKGEsYik7ZWxzZXt2YXIgbj1pKmkraipqLG89ayprK2wqbCxwPWkqaytqKmwscT1lKk1hdGguc3FydChuKS9tLHI9ZSpNYXRoLnNxcnQobykvbSxzPXEqcC9uLHQ9cipwL28sdT1xKmwrcipqLHY9cSprK3IqaSx3PWoqKHIrcykseD1pKihyK3MpLHk9bCoocSt0KSx6PWsqKHErdCksQT1NYXRoLmF0YW4yKHgtdix3LXUpLEI9TWF0aC5hdGFuMih6LXYseS11KTt0aGlzLmFyYyh1K2EsditiLGUsQSxCLGoqaz5sKmkpfXJldHVybiB0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmFyYz1mdW5jdGlvbihhLGIsYyxkLGUsZil7dmFyIGc9YStNYXRoLmNvcyhkKSpjLGg9YitNYXRoLnNpbihkKSpjLGk9dGhpcy5jdXJyZW50UGF0aC5wb2ludHM7aWYoKDAhPT1pLmxlbmd0aCYmaVtpLmxlbmd0aC0yXSE9PWd8fGlbaS5sZW5ndGgtMV0hPT1oKSYmKHRoaXMubW92ZVRvKGcsaCksaT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cyksZD09PWUpcmV0dXJuIHRoaXM7IWYmJmQ+PWU/ZSs9MipNYXRoLlBJOmYmJmU+PWQmJihkKz0yKk1hdGguUEkpO3ZhciBqPWY/LTEqKGQtZSk6ZS1kLGs9TWF0aC5hYnMoaikvKDIqTWF0aC5QSSkqNDA7aWYoMD09PWopcmV0dXJuIHRoaXM7Zm9yKHZhciBsPWovKDIqayksbT0yKmwsbj1NYXRoLmNvcyhsKSxvPU1hdGguc2luKGwpLHA9ay0xLHE9cCUxL3Ascj0wO3A+PXI7cisrKXt2YXIgcz1yK3Eqcix0PWwrZCttKnMsdT1NYXRoLmNvcyh0KSx2PS1NYXRoLnNpbih0KTtpLnB1c2goKG4qdStvKnYpKmMrYSwobiotditvKnUpKmMrYil9cmV0dXJuIHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZHJhd1BhdGg9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD10aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbXSx0eXBlOmIuR3JhcGhpY3MuUE9MWX0sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmN1cnJlbnRQYXRoLnBvaW50cz10aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5jb25jYXQoYSksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5iZWdpbkZpbGw9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5maWxsaW5nPSEwLHRoaXMuZmlsbENvbG9yPWF8fDAsdGhpcy5maWxsQWxwaGE9YXJndW1lbnRzLmxlbmd0aDwyPzE6Yix0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5lbmRGaWxsPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZmlsbGluZz0hMSx0aGlzLmZpbGxDb2xvcj1udWxsLHRoaXMuZmlsbEFscGhhPTEsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZHJhd1JlY3Q9ZnVuY3Rpb24oYSxjLGQsZSl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W2EsYyxkLGVdLHR5cGU6Yi5HcmFwaGljcy5SRUNUfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZHJhd1JvdW5kZWRSZWN0PWZ1bmN0aW9uKGEsYyxkLGUsZil7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W2EsYyxkLGUsZl0sdHlwZTpiLkdyYXBoaWNzLlJSRUN9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3Q2lyY2xlPWZ1bmN0aW9uKGEsYyxkKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZF0sdHlwZTpiLkdyYXBoaWNzLkNJUkN9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3RWxsaXBzZT1mdW5jdGlvbihhLGMsZCxlKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZV0sdHlwZTpiLkdyYXBoaWNzLkVMSVB9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmxpbmVXaWR0aD0wLHRoaXMuZmlsbGluZz0hMSx0aGlzLmRpcnR5PSEwLHRoaXMuY2xlYXJEaXJ0eT0hMCx0aGlzLmdyYXBoaWNzRGF0YT1bXSx0aGlzLmJvdW5kcz1udWxsLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmdlbmVyYXRlVGV4dHVyZT1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2V0Qm91bmRzKCksYz1uZXcgYi5DYW52YXNCdWZmZXIoYS53aWR0aCxhLmhlaWdodCksZD1iLlRleHR1cmUuZnJvbUNhbnZhcyhjLmNhbnZhcyk7cmV0dXJuIGMuY29udGV4dC50cmFuc2xhdGUoLWEueCwtYS55KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsYy5jb250ZXh0KSxkfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhJiZ0aGlzLmlzTWFzayE9PSEwKXtpZih0aGlzLl9jYWNoZUFzQml0bWFwKXJldHVybiB0aGlzLmRpcnR5JiYodGhpcy5fZ2VuZXJhdGVDYWNoZWRTcHJpdGUoKSxiLnVwZGF0ZVdlYkdMVGV4dHVyZSh0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5iYXNlVGV4dHVyZSxhLmdsKSx0aGlzLmRpcnR5PSExKSx0aGlzLl9jYWNoZWRTcHJpdGUuYWxwaGE9dGhpcy5hbHBoYSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMLmNhbGwodGhpcy5fY2FjaGVkU3ByaXRlLGEpLHZvaWQgMDtpZihhLnNwcml0ZUJhdGNoLnN0b3AoKSxhLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKHRoaXMuYmxlbmRNb2RlKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMuX21hc2ssYSksdGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnB1c2hGaWx0ZXIodGhpcy5fZmlsdGVyQmxvY2spLHRoaXMuYmxlbmRNb2RlIT09YS5zcHJpdGVCYXRjaC5jdXJyZW50QmxlbmRNb2RlKXthLnNwcml0ZUJhdGNoLmN1cnJlbnRCbGVuZE1vZGU9dGhpcy5ibGVuZE1vZGU7dmFyIGM9Yi5ibGVuZE1vZGVzV2ViR0xbYS5zcHJpdGVCYXRjaC5jdXJyZW50QmxlbmRNb2RlXTthLnNwcml0ZUJhdGNoLmdsLmJsZW5kRnVuYyhjWzBdLGNbMV0pfWlmKGIuV2ViR0xHcmFwaGljcy5yZW5kZXJHcmFwaGljcyh0aGlzLGEpLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKXthLnNwcml0ZUJhdGNoLnN0YXJ0KCk7Zm9yKHZhciBkPTAsZT10aGlzLmNoaWxkcmVuLmxlbmd0aDtlPmQ7ZCsrKXRoaXMuY2hpbGRyZW5bZF0uX3JlbmRlcldlYkdMKGEpO2Euc3ByaXRlQmF0Y2guc3RvcCgpfXRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2sodGhpcy5tYXNrLGEpLGEuZHJhd0NvdW50KyssYS5zcHJpdGVCYXRjaC5zdGFydCgpfX0sYi5HcmFwaGljcy5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEmJnRoaXMuaXNNYXNrIT09ITApe3ZhciBjPWEuY29udGV4dCxkPXRoaXMud29ybGRUcmFuc2Zvcm07dGhpcy5ibGVuZE1vZGUhPT1hLmN1cnJlbnRCbGVuZE1vZGUmJihhLmN1cnJlbnRCbGVuZE1vZGU9dGhpcy5ibGVuZE1vZGUsYy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249Yi5ibGVuZE1vZGVzQ2FudmFzW2EuY3VycmVudEJsZW5kTW9kZV0pLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhLmNvbnRleHQpLGMuc2V0VHJhbnNmb3JtKGQuYSxkLmMsZC5iLGQuZCxkLnR4LGQudHkpLGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3ModGhpcyxjKTtmb3IodmFyIGU9MCxmPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2Y+ZTtlKyspdGhpcy5jaGlsZHJlbltlXS5fcmVuZGVyQ2FudmFzKGEpO3RoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayhhLmNvbnRleHQpfX0sYi5HcmFwaGljcy5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe3RoaXMuYm91bmRzfHx0aGlzLnVwZGF0ZUJvdW5kcygpO3ZhciBiPXRoaXMuYm91bmRzLngsYz10aGlzLmJvdW5kcy53aWR0aCt0aGlzLmJvdW5kcy54LGQ9dGhpcy5ib3VuZHMueSxlPXRoaXMuYm91bmRzLmhlaWdodCt0aGlzLmJvdW5kcy55LGY9YXx8dGhpcy53b3JsZFRyYW5zZm9ybSxnPWYuYSxoPWYuYyxpPWYuYixqPWYuZCxrPWYudHgsbD1mLnR5LG09ZypjK2kqZStrLG49aiplK2gqYytsLG89ZypiK2kqZStrLHA9aiplK2gqYitsLHE9ZypiK2kqZCtrLHI9aipkK2gqYitsLHM9ZypjK2kqZCtrLHQ9aipkK2gqYytsLHU9bSx2PW4sdz1tLHg9bjt3PXc+bz9vOncsdz13PnE/cTp3LHc9dz5zP3M6dyx4PXg+cD9wOngseD14PnI/cjp4LHg9eD50P3Q6eCx1PW8+dT9vOnUsdT1xPnU/cTp1LHU9cz51P3M6dSx2PXA+dj9wOnYsdj1yPnY/cjp2LHY9dD52P3Q6djt2YXIgeT10aGlzLl9ib3VuZHM7cmV0dXJuIHkueD13LHkud2lkdGg9dS13LHkueT14LHkuaGVpZ2h0PXYteCx5fSxiLkdyYXBoaWNzLnByb3RvdHlwZS51cGRhdGVCb3VuZHM9ZnVuY3Rpb24oKXtmb3IodmFyIGEsYyxkLGUsZixnPTEvMCxoPS0xLzAsaT0xLzAsaj0tMS8wLGs9MDtrPHRoaXMuZ3JhcGhpY3NEYXRhLmxlbmd0aDtrKyspe3ZhciBsPXRoaXMuZ3JhcGhpY3NEYXRhW2tdLG09bC50eXBlLG49bC5saW5lV2lkdGg7aWYoYT1sLnBvaW50cyxtPT09Yi5HcmFwaGljcy5SRUNUKWM9YVswXS1uLzIsZD1hWzFdLW4vMixlPWFbMl0rbixmPWFbM10rbixnPWc+Yz9jOmcsaD1jK2U+aD9jK2U6aCxpPWk+ZD9jOmksaj1kK2Y+aj9kK2Y6ajtlbHNlIGlmKG09PT1iLkdyYXBoaWNzLkNJUkN8fG09PT1iLkdyYXBoaWNzLkVMSVApYz1hWzBdLGQ9YVsxXSxlPWFbMl0rbi8yLGY9YVszXStuLzIsZz1nPmMtZT9jLWU6ZyxoPWMrZT5oP2MrZTpoLGk9aT5kLWY/ZC1mOmksaj1kK2Y+aj9kK2Y6ajtlbHNlIGZvcih2YXIgbz0wO288YS5sZW5ndGg7bys9MiljPWFbb10sZD1hW28rMV0sZz1nPmMtbj9jLW46ZyxoPWMrbj5oP2MrbjpoLGk9aT5kLW4/ZC1uOmksaj1kK24+aj9kK246an12YXIgcD10aGlzLmJvdW5kc1BhZGRpbmc7dGhpcy5ib3VuZHM9bmV3IGIuUmVjdGFuZ2xlKGctcCxpLXAsaC1nKzIqcCxqLWkrMipwKX0sYi5HcmFwaGljcy5wcm90b3R5cGUuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nZXRMb2NhbEJvdW5kcygpO2lmKHRoaXMuX2NhY2hlZFNwcml0ZSl0aGlzLl9jYWNoZWRTcHJpdGUuYnVmZmVyLnJlc2l6ZShhLndpZHRoLGEuaGVpZ2h0KTtlbHNle3ZhciBjPW5ldyBiLkNhbnZhc0J1ZmZlcihhLndpZHRoLGEuaGVpZ2h0KSxkPWIuVGV4dHVyZS5mcm9tQ2FudmFzKGMuY2FudmFzKTt0aGlzLl9jYWNoZWRTcHJpdGU9bmV3IGIuU3ByaXRlKGQpLHRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXI9Yyx0aGlzLl9jYWNoZWRTcHJpdGUud29ybGRUcmFuc2Zvcm09dGhpcy53b3JsZFRyYW5zZm9ybX10aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLng9LShhLngvYS53aWR0aCksdGhpcy5fY2FjaGVkU3ByaXRlLmFuY2hvci55PS0oYS55L2EuaGVpZ2h0KSx0aGlzLl9jYWNoZWRTcHJpdGUuYnVmZmVyLmNvbnRleHQudHJhbnNsYXRlKC1hLngsLWEueSksYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljcyh0aGlzLHRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXIuY29udGV4dCksdGhpcy5fY2FjaGVkU3ByaXRlLmFscGhhPXRoaXMuYWxwaGF9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRlc3Ryb3lDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oKXt0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5kZXN0cm95KCEwKSx0aGlzLl9jYWNoZWRTcHJpdGU9bnVsbH0sYi5HcmFwaGljcy5QT0xZPTAsYi5HcmFwaGljcy5SRUNUPTEsYi5HcmFwaGljcy5DSVJDPTIsYi5HcmFwaGljcy5FTElQPTMsYi5HcmFwaGljcy5SUkVDPTQsYi5TdHJpcD1mdW5jdGlvbihhKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLnRleHR1cmU9YSx0aGlzLnV2cz1uZXcgYi5GbG9hdDMyQXJyYXkoWzAsMSwxLDEsMSwwLDAsMV0pLHRoaXMudmVydGljaWVzPW5ldyBiLkZsb2F0MzJBcnJheShbMCwwLDEwMCwwLDEwMCwxMDAsMCwxMDBdKSx0aGlzLmNvbG9ycz1uZXcgYi5GbG9hdDMyQXJyYXkoWzEsMSwxLDFdKSx0aGlzLmluZGljZXM9bmV3IGIuVWludDE2QXJyYXkoWzAsMSwyLDNdKSx0aGlzLmRpcnR5PSEwfSxiLlN0cmlwLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3RyaXAucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3RyaXAsYi5TdHJpcC5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpeyF0aGlzLnZpc2libGV8fHRoaXMuYWxwaGE8PTB8fChhLnNwcml0ZUJhdGNoLnN0b3AoKSx0aGlzLl92ZXJ0ZXhCdWZmZXJ8fHRoaXMuX2luaXRXZWJHTChhKSxhLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGEuc2hhZGVyTWFuYWdlci5zdHJpcFNoYWRlciksdGhpcy5fcmVuZGVyU3RyaXAoYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpKX0sYi5TdHJpcC5wcm90b3R5cGUuX2luaXRXZWJHTD1mdW5jdGlvbihhKXt2YXIgYj1hLmdsO3RoaXMuX3ZlcnRleEJ1ZmZlcj1iLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuX2luZGV4QnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksdGhpcy5fdXZCdWZmZXI9Yi5jcmVhdGVCdWZmZXIoKSx0aGlzLl9jb2xvckJ1ZmZlcj1iLmNyZWF0ZUJ1ZmZlcigpLGIuYmluZEJ1ZmZlcihiLkFSUkFZX0JVRkZFUix0aGlzLl92ZXJ0ZXhCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRpY2llcyxiLkRZTkFNSUNfRFJBVyksYi5iaW5kQnVmZmVyKGIuQVJSQVlfQlVGRkVSLHRoaXMuX3V2QnVmZmVyKSxiLmJ1ZmZlckRhdGEoYi5BUlJBWV9CVUZGRVIsdGhpcy51dnMsYi5TVEFUSUNfRFJBVyksYi5iaW5kQnVmZmVyKGIuQVJSQVlfQlVGRkVSLHRoaXMuX2NvbG9yQnVmZmVyKSxiLmJ1ZmZlckRhdGEoYi5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvcnMsYi5TVEFUSUNfRFJBVyksYi5iaW5kQnVmZmVyKGIuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5faW5kZXhCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kaWNlcyxiLlNUQVRJQ19EUkFXKX0sYi5TdHJpcC5wcm90b3R5cGUuX3JlbmRlclN0cmlwPWZ1bmN0aW9uKGEpe3ZhciBjPWEuZ2wsZD1hLnByb2plY3Rpb24sZT1hLm9mZnNldCxmPWEuc2hhZGVyTWFuYWdlci5zdHJpcFNoYWRlcjtjLmJsZW5kRnVuYyhjLk9ORSxjLk9ORV9NSU5VU19TUkNfQUxQSEEpLGMudW5pZm9ybU1hdHJpeDNmdihmLnRyYW5zbGF0aW9uTWF0cml4LCExLHRoaXMud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCkpLGMudW5pZm9ybTJmKGYucHJvamVjdGlvblZlY3RvcixkLngsLWQueSksYy51bmlmb3JtMmYoZi5vZmZzZXRWZWN0b3IsLWUueCwtZS55KSxjLnVuaWZvcm0xZihmLmFscGhhLDEpLHRoaXMuZGlydHk/KHRoaXMuZGlydHk9ITEsYy5iaW5kQnVmZmVyKGMuQVJSQVlfQlVGRkVSLHRoaXMuX3ZlcnRleEJ1ZmZlciksYy5idWZmZXJEYXRhKGMuQVJSQVlfQlVGRkVSLHRoaXMudmVydGljaWVzLGMuU1RBVElDX0RSQVcpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFWZXJ0ZXhQb3NpdGlvbiwyLGMuRkxPQVQsITEsMCwwKSxjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdXZCdWZmZXIpLGMuYnVmZmVyRGF0YShjLkFSUkFZX0JVRkZFUix0aGlzLnV2cyxjLlNUQVRJQ19EUkFXKSxjLnZlcnRleEF0dHJpYlBvaW50ZXIoZi5hVGV4dHVyZUNvb3JkLDIsYy5GTE9BVCwhMSwwLDApLGMuYWN0aXZlVGV4dHVyZShjLlRFWFRVUkUwKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYy5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZSxjKSksYy5iaW5kQnVmZmVyKGMuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5faW5kZXhCdWZmZXIpLGMuYnVmZmVyRGF0YShjLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kaWNlcyxjLlNUQVRJQ19EUkFXKSk6KGMuYmluZEJ1ZmZlcihjLkFSUkFZX0JVRkZFUix0aGlzLl92ZXJ0ZXhCdWZmZXIpLGMuYnVmZmVyU3ViRGF0YShjLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGljaWVzKSxjLnZlcnRleEF0dHJpYlBvaW50ZXIoZi5hVmVydGV4UG9zaXRpb24sMixjLkZMT0FULCExLDAsMCksYy5iaW5kQnVmZmVyKGMuQVJSQVlfQlVGRkVSLHRoaXMuX3V2QnVmZmVyKSxjLnZlcnRleEF0dHJpYlBvaW50ZXIoZi5hVGV4dHVyZUNvb3JkLDIsYy5GTE9BVCwhMSwwLDApLGMuYWN0aXZlVGV4dHVyZShjLlRFWFRVUkUwKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYy5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZSxjKSksYy5iaW5kQnVmZmVyKGMuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5faW5kZXhCdWZmZXIpKSxjLmRyYXdFbGVtZW50cyhjLlRSSUFOR0xFX1NUUklQLHRoaXMuaW5kaWNlcy5sZW5ndGgsYy5VTlNJR05FRF9TSE9SVCwwKX0sYi5TdHJpcC5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXt2YXIgYj1hLmNvbnRleHQsYz10aGlzLndvcmxkVHJhbnNmb3JtO2Eucm91bmRQaXhlbHM/Yi5zZXRUcmFuc2Zvcm0oYy5hLGMuYyxjLmIsYy5kLDB8Yy50eCwwfGMudHkpOmIuc2V0VHJhbnNmb3JtKGMuYSxjLmMsYy5iLGMuZCxjLnR4LGMudHkpO3ZhciBkPXRoaXMsZT1kLnZlcnRpY2llcyxmPWQudXZzLGc9ZS5sZW5ndGgvMjt0aGlzLmNvdW50Kys7Zm9yKHZhciBoPTA7Zy0yPmg7aCsrKXt2YXIgaT0yKmgsaj1lW2ldLGs9ZVtpKzJdLGw9ZVtpKzRdLG09ZVtpKzFdLG49ZVtpKzNdLG89ZVtpKzVdLHA9KGoraytsKS8zLHE9KG0rbitvKS8zLHI9ai1wLHM9bS1xLHQ9TWF0aC5zcXJ0KHIqcitzKnMpO2o9cCtyL3QqKHQrMyksbT1xK3MvdCoodCszKSxyPWstcCxzPW4tcSx0PU1hdGguc3FydChyKnIrcypzKSxrPXArci90Kih0KzMpLG49cStzL3QqKHQrMykscj1sLXAscz1vLXEsdD1NYXRoLnNxcnQocipyK3MqcyksbD1wK3IvdCoodCszKSxvPXErcy90Kih0KzMpO3ZhciB1PWZbaV0qZC50ZXh0dXJlLndpZHRoLHY9ZltpKzJdKmQudGV4dHVyZS53aWR0aCx3PWZbaSs0XSpkLnRleHR1cmUud2lkdGgseD1mW2krMV0qZC50ZXh0dXJlLmhlaWdodCx5PWZbaSszXSpkLnRleHR1cmUuaGVpZ2h0LHo9ZltpKzVdKmQudGV4dHVyZS5oZWlnaHQ7Yi5zYXZlKCksYi5iZWdpblBhdGgoKSxiLm1vdmVUbyhqLG0pLGIubGluZVRvKGssbiksYi5saW5lVG8obCxvKSxiLmNsb3NlUGF0aCgpLGIuY2xpcCgpO3ZhciBBPXUqeSt4Kncrdip6LXkqdy14KnYtdSp6LEI9aip5K3gqbCtrKnoteSpsLXgqay1qKnosQz11Kmsraip3K3YqbC1rKnctaip2LXUqbCxEPXUqeSpsK3gqayp3K2oqdip6LWoqeSp3LXgqdipsLXUqayp6LEU9bSp5K3gqbytuKnoteSpvLXgqbi1tKnosRj11Km4rbSp3K3Yqby1uKnctbSp2LXUqbyxHPXUqeSpvK3gqbip3K20qdip6LW0qeSp3LXgqdipvLXUqbip6O2IudHJhbnNmb3JtKEIvQSxFL0EsQy9BLEYvQSxEL0EsRy9BKSxiLmRyYXdJbWFnZShkLnRleHR1cmUuYmFzZVRleHR1cmUuc291cmNlLDAsMCksYi5yZXN0b3JlKCl9fSxiLlN0cmlwLnByb3RvdHlwZS5vblRleHR1cmVVcGRhdGU9ZnVuY3Rpb24oKXt0aGlzLnVwZGF0ZUZyYW1lPSEwfSxiLlJvcGU9ZnVuY3Rpb24oYSxjKXtiLlN0cmlwLmNhbGwodGhpcyxhKSx0aGlzLnBvaW50cz1jLHRoaXMudmVydGljaWVzPW5ldyBiLkZsb2F0MzJBcnJheSg0KmMubGVuZ3RoKSx0aGlzLnV2cz1uZXcgYi5GbG9hdDMyQXJyYXkoNCpjLmxlbmd0aCksdGhpcy5jb2xvcnM9bmV3IGIuRmxvYXQzMkFycmF5KDIqYy5sZW5ndGgpLHRoaXMuaW5kaWNlcz1uZXcgYi5VaW50MTZBcnJheSgyKmMubGVuZ3RoKSx0aGlzLnJlZnJlc2goKX0sYi5Sb3BlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuU3RyaXAucHJvdG90eXBlKSxiLlJvcGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUm9wZSxiLlJvcGUucHJvdG90eXBlLnJlZnJlc2g9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLnBvaW50cztpZighKGEubGVuZ3RoPDEpKXt2YXIgYj10aGlzLnV2cyxjPWFbMF0sZD10aGlzLmluZGljZXMsZT10aGlzLmNvbG9yczt0aGlzLmNvdW50LT0uMixiWzBdPTAsYlsxXT0wLGJbMl09MCxiWzNdPTEsZVswXT0xLGVbMV09MSxkWzBdPTAsZFsxXT0xO2Zvcih2YXIgZixnLGgsaT1hLmxlbmd0aCxqPTE7aT5qO2orKylmPWFbal0sZz00KmosaD1qLyhpLTEpLGolMj8oYltnXT1oLGJbZysxXT0wLGJbZysyXT1oLGJbZyszXT0xKTooYltnXT1oLGJbZysxXT0wLGJbZysyXT1oLGJbZyszXT0xKSxnPTIqaixlW2ddPTEsZVtnKzFdPTEsZz0yKmosZFtnXT1nLGRbZysxXT1nKzEsYz1mfX0sYi5Sb3BlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt2YXIgYT10aGlzLnBvaW50cztpZighKGEubGVuZ3RoPDEpKXt2YXIgYyxkPWFbMF0sZT17eDowLHk6MH07dGhpcy5jb3VudC09LjI7Zm9yKHZhciBmLGcsaCxpLGosaz10aGlzLnZlcnRpY2llcyxsPWEubGVuZ3RoLG09MDtsPm07bSsrKWY9YVttXSxnPTQqbSxjPW08YS5sZW5ndGgtMT9hW20rMV06ZixlLnk9LShjLngtZC54KSxlLng9Yy55LWQueSxoPTEwKigxLW0vKGwtMSkpLGg+MSYmKGg9MSksaT1NYXRoLnNxcnQoZS54KmUueCtlLnkqZS55KSxqPXRoaXMudGV4dHVyZS5oZWlnaHQvMixlLngvPWksZS55Lz1pLGUueCo9aixlLnkqPWosa1tnXT1mLngrZS54LGtbZysxXT1mLnkrZS55LGtbZysyXT1mLngtZS54LGtbZyszXT1mLnktZS55LGQ9ZjtiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfX0sYi5Sb3BlLnByb3RvdHlwZS5zZXRUZXh0dXJlPWZ1bmN0aW9uKGEpe3RoaXMudGV4dHVyZT1hfSxiLlRpbGluZ1Nwcml0ZT1mdW5jdGlvbihhLGMsZCl7Yi5TcHJpdGUuY2FsbCh0aGlzLGEpLHRoaXMuX3dpZHRoPWN8fDEwMCx0aGlzLl9oZWlnaHQ9ZHx8MTAwLHRoaXMudGlsZVNjYWxlPW5ldyBiLlBvaW50KDEsMSksdGhpcy50aWxlU2NhbGVPZmZzZXQ9bmV3IGIuUG9pbnQoMSwxKSx0aGlzLnRpbGVQb3NpdGlvbj1uZXcgYi5Qb2ludCgwLDApLHRoaXMucmVuZGVyYWJsZT0hMCx0aGlzLnRpbnQ9MTY3NzcyMTUsdGhpcy5ibGVuZE1vZGU9Yi5ibGVuZE1vZGVzLk5PUk1BTH0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5TcHJpdGUucHJvdG90eXBlKSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5UaWxpbmdTcHJpdGUsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZSxcIndpZHRoXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl93aWR0aH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX3dpZHRoPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faGVpZ2h0fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5faGVpZ2h0PWF9fSksYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLnNldFRleHR1cmU9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0dXJlIT09YSYmKHRoaXMudGV4dHVyZT1hLHRoaXMucmVmcmVzaFRleHR1cmU9ITAsdGhpcy5jYWNoZWRUaW50PTE2Nzc3MjE1KX0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe3ZhciBjLGQ7Zm9yKHRoaXMuX21hc2smJihhLnNwcml0ZUJhdGNoLnN0b3AoKSxhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMubWFzayxhKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpLHRoaXMuX2ZpbHRlcnMmJihhLnNwcml0ZUJhdGNoLmZsdXNoKCksYS5maWx0ZXJNYW5hZ2VyLnB1c2hGaWx0ZXIodGhpcy5fZmlsdGVyQmxvY2spKSwhdGhpcy50aWxpbmdUZXh0dXJlfHx0aGlzLnJlZnJlc2hUZXh0dXJlPyh0aGlzLmdlbmVyYXRlVGlsaW5nVGV4dHVyZSghMCksdGhpcy50aWxpbmdUZXh0dXJlJiZ0aGlzLnRpbGluZ1RleHR1cmUubmVlZHNVcGRhdGUmJihiLnVwZGF0ZVdlYkdMVGV4dHVyZSh0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUsYS5nbCksdGhpcy50aWxpbmdUZXh0dXJlLm5lZWRzVXBkYXRlPSExKSk6YS5zcHJpdGVCYXRjaC5yZW5kZXJUaWxpbmdTcHJpdGUodGhpcyksYz0wLGQ9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZD5jO2MrKyl0aGlzLmNoaWxkcmVuW2NdLl9yZW5kZXJXZWJHTChhKTthLnNwcml0ZUJhdGNoLnN0b3AoKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucG9wRmlsdGVyKCksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKX19LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSl7dmFyIGM9YS5jb250ZXh0O3RoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxjKSxjLmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYTt2YXIgZCxlLGY9dGhpcy53b3JsZFRyYW5zZm9ybTtpZihjLnNldFRyYW5zZm9ybShmLmEsZi5jLGYuYixmLmQsZi50eCxmLnR5KSwhdGhpcy5fX3RpbGVQYXR0ZXJufHx0aGlzLnJlZnJlc2hUZXh0dXJlKXtpZih0aGlzLmdlbmVyYXRlVGlsaW5nVGV4dHVyZSghMSksIXRoaXMudGlsaW5nVGV4dHVyZSlyZXR1cm47dGhpcy5fX3RpbGVQYXR0ZXJuPWMuY3JlYXRlUGF0dGVybih0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUuc291cmNlLFwicmVwZWF0XCIpfXRoaXMuYmxlbmRNb2RlIT09YS5jdXJyZW50QmxlbmRNb2RlJiYoYS5jdXJyZW50QmxlbmRNb2RlPXRoaXMuYmxlbmRNb2RlLGMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPWIuYmxlbmRNb2Rlc0NhbnZhc1thLmN1cnJlbnRCbGVuZE1vZGVdKTt2YXIgZz10aGlzLnRpbGVQb3NpdGlvbixoPXRoaXMudGlsZVNjYWxlO2ZvcihnLnglPXRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS53aWR0aCxnLnklPXRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS5oZWlnaHQsYy5zY2FsZShoLngsaC55KSxjLnRyYW5zbGF0ZShnLngsZy55KSxjLmZpbGxTdHlsZT10aGlzLl9fdGlsZVBhdHRlcm4sYy5maWxsUmVjdCgtZy54K3RoaXMuYW5jaG9yLngqLXRoaXMuX3dpZHRoLC1nLnkrdGhpcy5hbmNob3IueSotdGhpcy5faGVpZ2h0LHRoaXMuX3dpZHRoL2gueCx0aGlzLl9oZWlnaHQvaC55KSxjLnNjYWxlKDEvaC54LDEvaC55KSxjLnRyYW5zbGF0ZSgtZy54LC1nLnkpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayhhLmNvbnRleHQpLGQ9MCxlPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2U+ZDtkKyspdGhpcy5jaGlsZHJlbltkXS5fcmVuZGVyQ2FudmFzKGEpfX0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbigpe3ZhciBhPXRoaXMuX3dpZHRoLGI9dGhpcy5faGVpZ2h0LGM9YSooMS10aGlzLmFuY2hvci54KSxkPWEqLXRoaXMuYW5jaG9yLngsZT1iKigxLXRoaXMuYW5jaG9yLnkpLGY9YiotdGhpcy5hbmNob3IueSxnPXRoaXMud29ybGRUcmFuc2Zvcm0saD1nLmEsaT1nLmMsaj1nLmIsaz1nLmQsbD1nLnR4LG09Zy50eSxuPWgqZCtqKmYrbCxvPWsqZitpKmQrbSxwPWgqYytqKmYrbCxxPWsqZitpKmMrbSxyPWgqYytqKmUrbCxzPWsqZStpKmMrbSx0PWgqZCtqKmUrbCx1PWsqZStpKmQrbSx2PS0xLzAsdz0tMS8wLHg9MS8wLHk9MS8wO3g9eD5uP246eCx4PXg+cD9wOngseD14PnI/cjp4LHg9eD50P3Q6eCx5PXk+bz9vOnkseT15PnE/cTp5LHk9eT5zP3M6eSx5PXk+dT91Onksdj1uPnY/bjp2LHY9cD52P3A6dix2PXI+dj9yOnYsdj10PnY/dDp2LHc9bz53P286dyx3PXE+dz9xOncsdz1zPnc/czp3LHc9dT53P3U6dzt2YXIgej10aGlzLl9ib3VuZHM7cmV0dXJuIHoueD14LHoud2lkdGg9di14LHoueT15LHouaGVpZ2h0PXcteSx0aGlzLl9jdXJyZW50Qm91bmRzPXosen0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLm9uVGV4dHVyZVVwZGF0ZT1mdW5jdGlvbigpe30sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLmdlbmVyYXRlVGlsaW5nVGV4dHVyZT1mdW5jdGlvbihhKXtpZih0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuaGFzTG9hZGVkKXt2YXIgYyxkLGU9dGhpcy50ZXh0dXJlLGY9ZS5mcmFtZSxnPWYud2lkdGghPT1lLmJhc2VUZXh0dXJlLndpZHRofHxmLmhlaWdodCE9PWUuYmFzZVRleHR1cmUuaGVpZ2h0LGg9ITE7aWYoYT8oYz1iLmdldE5leHRQb3dlck9mVHdvKGYud2lkdGgpLGQ9Yi5nZXROZXh0UG93ZXJPZlR3byhmLmhlaWdodCksKGYud2lkdGghPT1jfHxmLmhlaWdodCE9PWQpJiYoaD0hMCkpOmcmJihjPWYud2lkdGgsZD1mLmhlaWdodCxoPSEwKSxoKXt2YXIgaTt0aGlzLnRpbGluZ1RleHR1cmUmJnRoaXMudGlsaW5nVGV4dHVyZS5pc1RpbGluZz8oaT10aGlzLnRpbGluZ1RleHR1cmUuY2FudmFzQnVmZmVyLGkucmVzaXplKGMsZCksdGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLndpZHRoPWMsdGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLmhlaWdodD1kLHRoaXMudGlsaW5nVGV4dHVyZS5uZWVkc1VwZGF0ZT0hMCk6KGk9bmV3IGIuQ2FudmFzQnVmZmVyKGMsZCksdGhpcy50aWxpbmdUZXh0dXJlPWIuVGV4dHVyZS5mcm9tQ2FudmFzKGkuY2FudmFzKSx0aGlzLnRpbGluZ1RleHR1cmUuY2FudmFzQnVmZmVyPWksdGhpcy50aWxpbmdUZXh0dXJlLmlzVGlsaW5nPSEwKSxpLmNvbnRleHQuZHJhd0ltYWdlKGUuYmFzZVRleHR1cmUuc291cmNlLGUuY3JvcC54LGUuY3JvcC55LGUuY3JvcC53aWR0aCxlLmNyb3AuaGVpZ2h0LDAsMCxjLGQpLHRoaXMudGlsZVNjYWxlT2Zmc2V0Lng9Zi53aWR0aC9jLHRoaXMudGlsZVNjYWxlT2Zmc2V0Lnk9Zi5oZWlnaHQvZH1lbHNlIHRoaXMudGlsaW5nVGV4dHVyZSYmdGhpcy50aWxpbmdUZXh0dXJlLmlzVGlsaW5nJiZ0aGlzLnRpbGluZ1RleHR1cmUuZGVzdHJveSghMCksdGhpcy50aWxlU2NhbGVPZmZzZXQueD0xLHRoaXMudGlsZVNjYWxlT2Zmc2V0Lnk9MSx0aGlzLnRpbGluZ1RleHR1cmU9ZTt0aGlzLnJlZnJlc2hUZXh0dXJlPSExLHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS5fcG93ZXJPZjI9ITB9fTt2YXIgZj17fTtmLkJvbmVEYXRhPWZ1bmN0aW9uKGEsYil7dGhpcy5uYW1lPWEsdGhpcy5wYXJlbnQ9Yn0sZi5Cb25lRGF0YS5wcm90b3R5cGU9e2xlbmd0aDowLHg6MCx5OjAscm90YXRpb246MCxzY2FsZVg6MSxzY2FsZVk6MX0sZi5TbG90RGF0YT1mdW5jdGlvbihhLGIpe3RoaXMubmFtZT1hLHRoaXMuYm9uZURhdGE9Yn0sZi5TbG90RGF0YS5wcm90b3R5cGU9e3I6MSxnOjEsYjoxLGE6MSxhdHRhY2htZW50TmFtZTpudWxsfSxmLkJvbmU9ZnVuY3Rpb24oYSxiKXt0aGlzLmRhdGE9YSx0aGlzLnBhcmVudD1iLHRoaXMuc2V0VG9TZXR1cFBvc2UoKX0sZi5Cb25lLnlEb3duPSExLGYuQm9uZS5wcm90b3R5cGU9e3g6MCx5OjAscm90YXRpb246MCxzY2FsZVg6MSxzY2FsZVk6MSxtMDA6MCxtMDE6MCx3b3JsZFg6MCxtMTA6MCxtMTE6MCx3b3JsZFk6MCx3b3JsZFJvdGF0aW9uOjAsd29ybGRTY2FsZVg6MSx3b3JsZFNjYWxlWToxLHVwZGF0ZVdvcmxkVHJhbnNmb3JtOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5wYXJlbnQ7bnVsbCE9Yz8odGhpcy53b3JsZFg9dGhpcy54KmMubTAwK3RoaXMueSpjLm0wMStjLndvcmxkWCx0aGlzLndvcmxkWT10aGlzLngqYy5tMTArdGhpcy55KmMubTExK2Mud29ybGRZLHRoaXMud29ybGRTY2FsZVg9Yy53b3JsZFNjYWxlWCp0aGlzLnNjYWxlWCx0aGlzLndvcmxkU2NhbGVZPWMud29ybGRTY2FsZVkqdGhpcy5zY2FsZVksdGhpcy53b3JsZFJvdGF0aW9uPWMud29ybGRSb3RhdGlvbit0aGlzLnJvdGF0aW9uKToodGhpcy53b3JsZFg9dGhpcy54LHRoaXMud29ybGRZPXRoaXMueSx0aGlzLndvcmxkU2NhbGVYPXRoaXMuc2NhbGVYLHRoaXMud29ybGRTY2FsZVk9dGhpcy5zY2FsZVksdGhpcy53b3JsZFJvdGF0aW9uPXRoaXMucm90YXRpb24pO3ZhciBkPXRoaXMud29ybGRSb3RhdGlvbipNYXRoLlBJLzE4MCxlPU1hdGguY29zKGQpLGc9TWF0aC5zaW4oZCk7dGhpcy5tMDA9ZSp0aGlzLndvcmxkU2NhbGVYLHRoaXMubTEwPWcqdGhpcy53b3JsZFNjYWxlWCx0aGlzLm0wMT0tZyp0aGlzLndvcmxkU2NhbGVZLHRoaXMubTExPWUqdGhpcy53b3JsZFNjYWxlWSxhJiYodGhpcy5tMDA9LXRoaXMubTAwLHRoaXMubTAxPS10aGlzLm0wMSksYiYmKHRoaXMubTEwPS10aGlzLm0xMCx0aGlzLm0xMT0tdGhpcy5tMTEpLGYuQm9uZS55RG93biYmKHRoaXMubTEwPS10aGlzLm0xMCx0aGlzLm0xMT0tdGhpcy5tMTEpfSxzZXRUb1NldHVwUG9zZTpmdW5jdGlvbigpe3ZhciBhPXRoaXMuZGF0YTt0aGlzLng9YS54LHRoaXMueT1hLnksdGhpcy5yb3RhdGlvbj1hLnJvdGF0aW9uLHRoaXMuc2NhbGVYPWEuc2NhbGVYLHRoaXMuc2NhbGVZPWEuc2NhbGVZfX0sZi5TbG90PWZ1bmN0aW9uKGEsYixjKXt0aGlzLmRhdGE9YSx0aGlzLnNrZWxldG9uPWIsdGhpcy5ib25lPWMsdGhpcy5zZXRUb1NldHVwUG9zZSgpfSxmLlNsb3QucHJvdG90eXBlPXtyOjEsZzoxLGI6MSxhOjEsX2F0dGFjaG1lbnRUaW1lOjAsYXR0YWNobWVudDpudWxsLHNldEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSl7dGhpcy5hdHRhY2htZW50PWEsdGhpcy5fYXR0YWNobWVudFRpbWU9dGhpcy5za2VsZXRvbi50aW1lfSxzZXRBdHRhY2htZW50VGltZTpmdW5jdGlvbihhKXt0aGlzLl9hdHRhY2htZW50VGltZT10aGlzLnNrZWxldG9uLnRpbWUtYX0sZ2V0QXR0YWNobWVudFRpbWU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5za2VsZXRvbi50aW1lLXRoaXMuX2F0dGFjaG1lbnRUaW1lfSxzZXRUb1NldHVwUG9zZTpmdW5jdGlvbigpe3ZhciBhPXRoaXMuZGF0YTt0aGlzLnI9YS5yLHRoaXMuZz1hLmcsdGhpcy5iPWEuYix0aGlzLmE9YS5hO2Zvcih2YXIgYj10aGlzLnNrZWxldG9uLmRhdGEuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdPT1hKXt0aGlzLnNldEF0dGFjaG1lbnQoYS5hdHRhY2htZW50TmFtZT90aGlzLnNrZWxldG9uLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleChjLGEuYXR0YWNobWVudE5hbWUpOm51bGwpO2JyZWFrfX19LGYuU2tpbj1mdW5jdGlvbihhKXt0aGlzLm5hbWU9YSx0aGlzLmF0dGFjaG1lbnRzPXt9fSxmLlNraW4ucHJvdG90eXBlPXthZGRBdHRhY2htZW50OmZ1bmN0aW9uKGEsYixjKXt0aGlzLmF0dGFjaG1lbnRzW2ErXCI6XCIrYl09Y30sZ2V0QXR0YWNobWVudDpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmF0dGFjaG1lbnRzW2ErXCI6XCIrYl19LF9hdHRhY2hBbGw6ZnVuY3Rpb24oYSxiKXtmb3IodmFyIGMgaW4gYi5hdHRhY2htZW50cyl7dmFyIGQ9Yy5pbmRleE9mKFwiOlwiKSxlPXBhcnNlSW50KGMuc3Vic3RyaW5nKDAsZCksMTApLGY9Yy5zdWJzdHJpbmcoZCsxKSxnPWEuc2xvdHNbZV07aWYoZy5hdHRhY2htZW50JiZnLmF0dGFjaG1lbnQubmFtZT09Zil7dmFyIGg9dGhpcy5nZXRBdHRhY2htZW50KGUsZik7aCYmZy5zZXRBdHRhY2htZW50KGgpfX19fSxmLkFuaW1hdGlvbj1mdW5jdGlvbihhLGIsYyl7dGhpcy5uYW1lPWEsdGhpcy50aW1lbGluZXM9Yix0aGlzLmR1cmF0aW9uPWN9LGYuQW5pbWF0aW9uLnByb3RvdHlwZT17YXBwbHk6ZnVuY3Rpb24oYSxiLGMpe2MmJnRoaXMuZHVyYXRpb24mJihiJT10aGlzLmR1cmF0aW9uKTtmb3IodmFyIGQ9dGhpcy50aW1lbGluZXMsZT0wLGY9ZC5sZW5ndGg7Zj5lO2UrKylkW2VdLmFwcGx5KGEsYiwxKX0sbWl4OmZ1bmN0aW9uKGEsYixjLGQpe2MmJnRoaXMuZHVyYXRpb24mJihiJT10aGlzLmR1cmF0aW9uKTtmb3IodmFyIGU9dGhpcy50aW1lbGluZXMsZj0wLGc9ZS5sZW5ndGg7Zz5mO2YrKyllW2ZdLmFwcGx5KGEsYixkKX19LGYuYmluYXJ5U2VhcmNoPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD0wLGU9TWF0aC5mbG9vcihhLmxlbmd0aC9jKS0yO2lmKCFlKXJldHVybiBjO2Zvcih2YXIgZj1lPj4+MTs7KXtpZihhWyhmKzEpKmNdPD1iP2Q9ZisxOmU9ZixkPT1lKXJldHVybihkKzEpKmM7Zj1kK2U+Pj4xfX0sZi5saW5lYXJTZWFyY2g9ZnVuY3Rpb24oYSxiLGMpe2Zvcih2YXIgZD0wLGU9YS5sZW5ndGgtYztlPj1kO2QrPWMpaWYoYVtkXT5iKXJldHVybiBkO3JldHVybi0xfSxmLkN1cnZlcz1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1bXSx0aGlzLmN1cnZlcy5sZW5ndGg9NiooYS0xKX0sZi5DdXJ2ZXMucHJvdG90eXBlPXtzZXRMaW5lYXI6ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXNbNiphXT0wfSxzZXRTdGVwcGVkOmZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzWzYqYV09LTF9LHNldEN1cnZlOmZ1bmN0aW9uKGEsYixjLGQsZSl7dmFyIGY9LjEsZz1mKmYsaD1nKmYsaT0zKmYsaj0zKmcsaz02KmcsbD02KmgsbT0yKi1iK2Qsbj0yKi1jK2Usbz0zKihiLWQpKzEscD0zKihjLWUpKzEscT02KmEscj10aGlzLmN1cnZlcztyW3FdPWIqaSttKmorbypoLHJbcSsxXT1jKmkrbipqK3AqaCxyW3ErMl09bSprK28qbCxyW3ErM109biprK3AqbCxyW3ErNF09bypsLHJbcSs1XT1wKmx9LGdldEN1cnZlUGVyY2VudDpmdW5jdGlvbihhLGIpe2I9MD5iPzA6Yj4xPzE6Yjt2YXIgYz02KmEsZD10aGlzLmN1cnZlcyxlPWRbY107aWYoIWUpcmV0dXJuIGI7aWYoLTE9PWUpcmV0dXJuIDA7Zm9yKHZhciBmPWRbYysxXSxnPWRbYysyXSxoPWRbYyszXSxpPWRbYys0XSxqPWRbYys1XSxrPWUsbD1mLG09ODs7KXtpZihrPj1iKXt2YXIgbj1rLWUsbz1sLWY7cmV0dXJuIG8rKGwtbykqKGItbikvKGstbil9aWYoIW0pYnJlYWs7bS0tLGUrPWcsZis9aCxnKz1pLGgrPWosays9ZSxsKz1mfXJldHVybiBsKygxLWwpKihiLWspLygxLWspfX0sZi5Sb3RhdGVUaW1lbGluZT1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1uZXcgZi5DdXJ2ZXMoYSksdGhpcy5mcmFtZXM9W10sdGhpcy5mcmFtZXMubGVuZ3RoPTIqYX0sZi5Sb3RhdGVUaW1lbGluZS5wcm90b3R5cGU9e2JvbmVJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoLzJ9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjKXthKj0yLHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jfSxhcHBseTpmdW5jdGlvbihhLGIsYyl7dmFyIGQsZT10aGlzLmZyYW1lcztpZighKGI8ZVswXSkpe3ZhciBnPWEuYm9uZXNbdGhpcy5ib25lSW5kZXhdO2lmKGI+PWVbZS5sZW5ndGgtMl0pe2ZvcihkPWcuZGF0YS5yb3RhdGlvbitlW2UubGVuZ3RoLTFdLWcucm90YXRpb247ZD4xODA7KWQtPTM2MDtmb3IoOy0xODA+ZDspZCs9MzYwO3JldHVybiBnLnJvdGF0aW9uKz1kKmMsdm9pZCAwfXZhciBoPWYuYmluYXJ5U2VhcmNoKGUsYiwyKSxpPWVbaC0xXSxqPWVbaF0saz0xLShiLWopLyhlW2gtMl0taik7Zm9yKGs9dGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGgvMi0xLGspLGQ9ZVtoKzFdLWk7ZD4xODA7KWQtPTM2MDtmb3IoOy0xODA+ZDspZCs9MzYwO2ZvcihkPWcuZGF0YS5yb3RhdGlvbisoaStkKmspLWcucm90YXRpb247ZD4xODA7KWQtPTM2MDtmb3IoOy0xODA+ZDspZCs9MzYwO2cucm90YXRpb24rPWQqY319fSxmLlRyYW5zbGF0ZVRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9MyphfSxmLlRyYW5zbGF0ZVRpbWVsaW5lLnByb3RvdHlwZT17Ym9uZUluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGgvM30sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMsZCl7YSo9Myx0aGlzLmZyYW1lc1thXT1iLHRoaXMuZnJhbWVzW2ErMV09Yyx0aGlzLmZyYW1lc1thKzJdPWR9LGFwcGx5OmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmZyYW1lcztpZighKGI8ZFswXSkpe3ZhciBlPWEuYm9uZXNbdGhpcy5ib25lSW5kZXhdO2lmKGI+PWRbZC5sZW5ndGgtM10pcmV0dXJuIGUueCs9KGUuZGF0YS54K2RbZC5sZW5ndGgtMl0tZS54KSpjLGUueSs9KGUuZGF0YS55K2RbZC5sZW5ndGgtMV0tZS55KSpjLHZvaWQgMDt2YXIgZz1mLmJpbmFyeVNlYXJjaChkLGIsMyksaD1kW2ctMl0saT1kW2ctMV0saj1kW2ddLGs9MS0oYi1qKS8oZFtnKy0zXS1qKTtrPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChnLzMtMSxrKSxlLngrPShlLmRhdGEueCtoKyhkW2crMV0taCkqay1lLngpKmMsZS55Kz0oZS5kYXRhLnkraSsoZFtnKzJdLWkpKmstZS55KSpjfX19LGYuU2NhbGVUaW1lbGluZT1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1uZXcgZi5DdXJ2ZXMoYSksdGhpcy5mcmFtZXM9W10sdGhpcy5mcmFtZXMubGVuZ3RoPTMqYX0sZi5TY2FsZVRpbWVsaW5lLnByb3RvdHlwZT17Ym9uZUluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGgvM30sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMsZCl7YSo9Myx0aGlzLmZyYW1lc1thXT1iLHRoaXMuZnJhbWVzW2ErMV09Yyx0aGlzLmZyYW1lc1thKzJdPWR9LGFwcGx5OmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmZyYW1lcztpZighKGI8ZFswXSkpe3ZhciBlPWEuYm9uZXNbdGhpcy5ib25lSW5kZXhdO2lmKGI+PWRbZC5sZW5ndGgtM10pcmV0dXJuIGUuc2NhbGVYKz0oZS5kYXRhLnNjYWxlWC0xK2RbZC5sZW5ndGgtMl0tZS5zY2FsZVgpKmMsZS5zY2FsZVkrPShlLmRhdGEuc2NhbGVZLTErZFtkLmxlbmd0aC0xXS1lLnNjYWxlWSkqYyx2b2lkIDA7dmFyIGc9Zi5iaW5hcnlTZWFyY2goZCxiLDMpLGg9ZFtnLTJdLGk9ZFtnLTFdLGo9ZFtnXSxrPTEtKGItaikvKGRbZystM10taik7az10aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZy8zLTEsayksZS5zY2FsZVgrPShlLmRhdGEuc2NhbGVYLTEraCsoZFtnKzFdLWgpKmstZS5zY2FsZVgpKmMsZS5zY2FsZVkrPShlLmRhdGEuc2NhbGVZLTEraSsoZFtnKzJdLWkpKmstZS5zY2FsZVkpKmN9fX0sZi5Db2xvclRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9NSphfSxmLkNvbG9yVGltZWxpbmUucHJvdG90eXBlPXtzbG90SW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC81fSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyxkLGUsZil7YSo9NSx0aGlzLmZyYW1lc1thXT1iLHRoaXMuZnJhbWVzW2ErMV09Yyx0aGlzLmZyYW1lc1thKzJdPWQsdGhpcy5mcmFtZXNbYSszXT1lLHRoaXMuZnJhbWVzW2ErNF09Zn0sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZnJhbWVzO2lmKCEoYjxkWzBdKSl7dmFyIGU9YS5zbG90c1t0aGlzLnNsb3RJbmRleF07aWYoYj49ZFtkLmxlbmd0aC01XSl7dmFyIGc9ZC5sZW5ndGgtMTtyZXR1cm4gZS5yPWRbZy0zXSxlLmc9ZFtnLTJdLGUuYj1kW2ctMV0sZS5hPWRbZ10sdm9pZCAwfXZhciBoPWYuYmluYXJ5U2VhcmNoKGQsYiw1KSxpPWRbaC00XSxqPWRbaC0zXSxrPWRbaC0yXSxsPWRbaC0xXSxtPWRbaF0sbj0xLShiLW0pLyhkW2gtNV0tbSk7bj10aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoaC81LTEsbik7dmFyIG89aSsoZFtoKzFdLWkpKm4scD1qKyhkW2grMl0taikqbixxPWsrKGRbaCszXS1rKSpuLHI9bCsoZFtoKzRdLWwpKm47MT5jPyhlLnIrPShvLWUucikqYyxlLmcrPShwLWUuZykqYyxlLmIrPShxLWUuYikqYyxlLmErPShyLWUuYSkqYyk6KGUucj1vLGUuZz1wLGUuYj1xLGUuYT1yKX19fSxmLkF0dGFjaG1lbnRUaW1lbGluZT1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1uZXcgZi5DdXJ2ZXMoYSksdGhpcy5mcmFtZXM9W10sdGhpcy5mcmFtZXMubGVuZ3RoPWEsdGhpcy5hdHRhY2htZW50TmFtZXM9W10sdGhpcy5hdHRhY2htZW50TmFtZXMubGVuZ3RoPWF9LGYuQXR0YWNobWVudFRpbWVsaW5lLnByb3RvdHlwZT17c2xvdEluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGh9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjKXt0aGlzLmZyYW1lc1thXT1iLHRoaXMuYXR0YWNobWVudE5hbWVzW2FdPWN9LGFwcGx5OmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5mcmFtZXM7aWYoIShiPGNbMF0pKXt2YXIgZDtkPWI+PWNbYy5sZW5ndGgtMV0/Yy5sZW5ndGgtMTpmLmJpbmFyeVNlYXJjaChjLGIsMSktMTt2YXIgZT10aGlzLmF0dGFjaG1lbnROYW1lc1tkXTthLnNsb3RzW3RoaXMuc2xvdEluZGV4XS5zZXRBdHRhY2htZW50KGU/YS5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgodGhpcy5zbG90SW5kZXgsZSk6bnVsbCl9fX0sZi5Ta2VsZXRvbkRhdGE9ZnVuY3Rpb24oKXt0aGlzLmJvbmVzPVtdLHRoaXMuc2xvdHM9W10sdGhpcy5za2lucz1bXSx0aGlzLmFuaW1hdGlvbnM9W119LGYuU2tlbGV0b25EYXRhLnByb3RvdHlwZT17ZGVmYXVsdFNraW46bnVsbCxmaW5kQm9uZTpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5ib25lcyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZmluZEJvbmVJbmRleDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5ib25lcyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sZmluZFNsb3Q6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIHNsb3RbY107cmV0dXJuIG51bGx9LGZpbmRTbG90SW5kZXg6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGM7cmV0dXJuLTF9LGZpbmRTa2luOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNraW5zLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kQW5pbWF0aW9uOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmFuaW1hdGlvbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9fSxmLlNrZWxldG9uPWZ1bmN0aW9uKGEpe3RoaXMuZGF0YT1hLHRoaXMuYm9uZXM9W107XHJcbmZvcih2YXIgYj0wLGM9YS5ib25lcy5sZW5ndGg7Yz5iO2IrKyl7dmFyIGQ9YS5ib25lc1tiXSxlPWQucGFyZW50P3RoaXMuYm9uZXNbYS5ib25lcy5pbmRleE9mKGQucGFyZW50KV06bnVsbDt0aGlzLmJvbmVzLnB1c2gobmV3IGYuQm9uZShkLGUpKX1mb3IodGhpcy5zbG90cz1bXSx0aGlzLmRyYXdPcmRlcj1bXSxiPTAsYz1hLnNsb3RzLmxlbmd0aDtjPmI7YisrKXt2YXIgZz1hLnNsb3RzW2JdLGg9dGhpcy5ib25lc1thLmJvbmVzLmluZGV4T2YoZy5ib25lRGF0YSldLGk9bmV3IGYuU2xvdChnLHRoaXMsaCk7dGhpcy5zbG90cy5wdXNoKGkpLHRoaXMuZHJhd09yZGVyLnB1c2goaSl9fSxmLlNrZWxldG9uLnByb3RvdHlwZT17eDowLHk6MCxza2luOm51bGwscjoxLGc6MSxiOjEsYToxLHRpbWU6MCxmbGlwWDohMSxmbGlwWTohMSx1cGRhdGVXb3JsZFRyYW5zZm9ybTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmZsaXBYLGI9dGhpcy5mbGlwWSxjPXRoaXMuYm9uZXMsZD0wLGU9Yy5sZW5ndGg7ZT5kO2QrKyljW2RdLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKGEsYil9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dGhpcy5zZXRCb25lc1RvU2V0dXBQb3NlKCksdGhpcy5zZXRTbG90c1RvU2V0dXBQb3NlKCl9LHNldEJvbmVzVG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5ib25lcyxiPTAsYz1hLmxlbmd0aDtjPmI7YisrKWFbYl0uc2V0VG9TZXR1cFBvc2UoKX0sc2V0U2xvdHNUb1NldHVwUG9zZTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLnNsb3RzLGI9MCxjPWEubGVuZ3RoO2M+YjtiKyspYVtiXS5zZXRUb1NldHVwUG9zZShiKX0sZ2V0Um9vdEJvbmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ib25lcy5sZW5ndGg/dGhpcy5ib25lc1swXTpudWxsfSxmaW5kQm9uZTpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5ib25lcyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10uZGF0YS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kQm9uZUluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGM7cmV0dXJuLTF9LGZpbmRTbG90OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRTbG90SW5kZXg6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLmRhdGEubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sc2V0U2tpbkJ5TmFtZTpmdW5jdGlvbihhKXt2YXIgYj10aGlzLmRhdGEuZmluZFNraW4oYSk7aWYoIWIpdGhyb3dcIlNraW4gbm90IGZvdW5kOiBcIithO3RoaXMuc2V0U2tpbihiKX0sc2V0U2tpbjpmdW5jdGlvbihhKXt0aGlzLnNraW4mJmEmJmEuX2F0dGFjaEFsbCh0aGlzLHRoaXMuc2tpbiksdGhpcy5za2luPWF9LGdldEF0dGFjaG1lbnRCeVNsb3ROYW1lOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KHRoaXMuZGF0YS5maW5kU2xvdEluZGV4KGEpLGIpfSxnZXRBdHRhY2htZW50QnlTbG90SW5kZXg6ZnVuY3Rpb24oYSxiKXtpZih0aGlzLnNraW4pe3ZhciBjPXRoaXMuc2tpbi5nZXRBdHRhY2htZW50KGEsYik7aWYoYylyZXR1cm4gY31yZXR1cm4gdGhpcy5kYXRhLmRlZmF1bHRTa2luP3RoaXMuZGF0YS5kZWZhdWx0U2tpbi5nZXRBdHRhY2htZW50KGEsYik6bnVsbH0sc2V0QXR0YWNobWVudDpmdW5jdGlvbihhLGIpe2Zvcih2YXIgYz10aGlzLnNsb3RzLGQ9MCxlPWMuc2l6ZTtlPmQ7ZCsrKXt2YXIgZj1jW2RdO2lmKGYuZGF0YS5uYW1lPT1hKXt2YXIgZz1udWxsO2lmKGImJihnPXRoaXMuZ2V0QXR0YWNobWVudChkLGIpLG51bGw9PWcpKXRocm93XCJBdHRhY2htZW50IG5vdCBmb3VuZDogXCIrYitcIiwgZm9yIHNsb3Q6IFwiK2E7cmV0dXJuIGYuc2V0QXR0YWNobWVudChnKSx2b2lkIDB9fXRocm93XCJTbG90IG5vdCBmb3VuZDogXCIrYX0sdXBkYXRlOmZ1bmN0aW9uKGEpe3RpbWUrPWF9fSxmLkF0dGFjaG1lbnRUeXBlPXtyZWdpb246MH0sZi5SZWdpb25BdHRhY2htZW50PWZ1bmN0aW9uKCl7dGhpcy5vZmZzZXQ9W10sdGhpcy5vZmZzZXQubGVuZ3RoPTgsdGhpcy51dnM9W10sdGhpcy51dnMubGVuZ3RoPTh9LGYuUmVnaW9uQXR0YWNobWVudC5wcm90b3R5cGU9e3g6MCx5OjAscm90YXRpb246MCxzY2FsZVg6MSxzY2FsZVk6MSx3aWR0aDowLGhlaWdodDowLHJlbmRlcmVyT2JqZWN0Om51bGwscmVnaW9uT2Zmc2V0WDowLHJlZ2lvbk9mZnNldFk6MCxyZWdpb25XaWR0aDowLHJlZ2lvbkhlaWdodDowLHJlZ2lvbk9yaWdpbmFsV2lkdGg6MCxyZWdpb25PcmlnaW5hbEhlaWdodDowLHNldFVWczpmdW5jdGlvbihhLGIsYyxkLGUpe3ZhciBmPXRoaXMudXZzO2U/KGZbMl09YSxmWzNdPWQsZls0XT1hLGZbNV09YixmWzZdPWMsZls3XT1iLGZbMF09YyxmWzFdPWQpOihmWzBdPWEsZlsxXT1kLGZbMl09YSxmWzNdPWIsZls0XT1jLGZbNV09YixmWzZdPWMsZls3XT1kKX0sdXBkYXRlT2Zmc2V0OmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy53aWR0aC90aGlzLnJlZ2lvbk9yaWdpbmFsV2lkdGgqdGhpcy5zY2FsZVgsYj10aGlzLmhlaWdodC90aGlzLnJlZ2lvbk9yaWdpbmFsSGVpZ2h0KnRoaXMuc2NhbGVZLGM9LXRoaXMud2lkdGgvMip0aGlzLnNjYWxlWCt0aGlzLnJlZ2lvbk9mZnNldFgqYSxkPS10aGlzLmhlaWdodC8yKnRoaXMuc2NhbGVZK3RoaXMucmVnaW9uT2Zmc2V0WSpiLGU9Yyt0aGlzLnJlZ2lvbldpZHRoKmEsZj1kK3RoaXMucmVnaW9uSGVpZ2h0KmIsZz10aGlzLnJvdGF0aW9uKk1hdGguUEkvMTgwLGg9TWF0aC5jb3MoZyksaT1NYXRoLnNpbihnKSxqPWMqaCt0aGlzLngsaz1jKmksbD1kKmgrdGhpcy55LG09ZCppLG49ZSpoK3RoaXMueCxvPWUqaSxwPWYqaCt0aGlzLnkscT1mKmkscj10aGlzLm9mZnNldDtyWzBdPWotbSxyWzFdPWwrayxyWzJdPWotcSxyWzNdPXArayxyWzRdPW4tcSxyWzVdPXArbyxyWzZdPW4tbSxyWzddPWwrb30sY29tcHV0ZVZlcnRpY2VzOmZ1bmN0aW9uKGEsYixjLGQpe2ErPWMud29ybGRYLGIrPWMud29ybGRZO3ZhciBlPWMubTAwLGY9Yy5tMDEsZz1jLm0xMCxoPWMubTExLGk9dGhpcy5vZmZzZXQ7ZFswXT1pWzBdKmUraVsxXSpmK2EsZFsxXT1pWzBdKmcraVsxXSpoK2IsZFsyXT1pWzJdKmUraVszXSpmK2EsZFszXT1pWzJdKmcraVszXSpoK2IsZFs0XT1pWzRdKmUraVs1XSpmK2EsZFs1XT1pWzRdKmcraVs1XSpoK2IsZFs2XT1pWzZdKmUraVs3XSpmK2EsZFs3XT1pWzZdKmcraVs3XSpoK2J9fSxmLkFuaW1hdGlvblN0YXRlRGF0YT1mdW5jdGlvbihhKXt0aGlzLnNrZWxldG9uRGF0YT1hLHRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lPXt9fSxmLkFuaW1hdGlvblN0YXRlRGF0YS5wcm90b3R5cGU9e2RlZmF1bHRNaXg6MCxzZXRNaXhCeU5hbWU6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWQpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dmFyIGU9dGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihiKTtpZighZSl0aHJvd1wiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIrYjt0aGlzLnNldE1peChkLGUsYyl9LHNldE1peDpmdW5jdGlvbihhLGIsYyl7dGhpcy5hbmltYXRpb25Ub01peFRpbWVbYS5uYW1lK1wiOlwiK2IubmFtZV09Y30sZ2V0TWl4OmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5hbmltYXRpb25Ub01peFRpbWVbYS5uYW1lK1wiOlwiK2IubmFtZV07cmV0dXJuIGM/Yzp0aGlzLmRlZmF1bHRNaXh9fSxmLkFuaW1hdGlvblN0YXRlPWZ1bmN0aW9uKGEpe3RoaXMuZGF0YT1hLHRoaXMucXVldWU9W119LGYuQW5pbWF0aW9uU3RhdGUucHJvdG90eXBlPXthbmltYXRpb25TcGVlZDoxLGN1cnJlbnQ6bnVsbCxwcmV2aW91czpudWxsLGN1cnJlbnRUaW1lOjAscHJldmlvdXNUaW1lOjAsY3VycmVudExvb3A6ITEscHJldmlvdXNMb29wOiExLG1peFRpbWU6MCxtaXhEdXJhdGlvbjowLHVwZGF0ZTpmdW5jdGlvbihhKXtpZih0aGlzLmN1cnJlbnRUaW1lKz1hKnRoaXMuYW5pbWF0aW9uU3BlZWQsdGhpcy5wcmV2aW91c1RpbWUrPWEsdGhpcy5taXhUaW1lKz1hLHRoaXMucXVldWUubGVuZ3RoPjApe3ZhciBiPXRoaXMucXVldWVbMF07dGhpcy5jdXJyZW50VGltZT49Yi5kZWxheSYmKHRoaXMuX3NldEFuaW1hdGlvbihiLmFuaW1hdGlvbixiLmxvb3ApLHRoaXMucXVldWUuc2hpZnQoKSl9fSxhcHBseTpmdW5jdGlvbihhKXtpZih0aGlzLmN1cnJlbnQpaWYodGhpcy5wcmV2aW91cyl7dGhpcy5wcmV2aW91cy5hcHBseShhLHRoaXMucHJldmlvdXNUaW1lLHRoaXMucHJldmlvdXNMb29wKTt2YXIgYj10aGlzLm1peFRpbWUvdGhpcy5taXhEdXJhdGlvbjtiPj0xJiYoYj0xLHRoaXMucHJldmlvdXM9bnVsbCksdGhpcy5jdXJyZW50Lm1peChhLHRoaXMuY3VycmVudFRpbWUsdGhpcy5jdXJyZW50TG9vcCxiKX1lbHNlIHRoaXMuY3VycmVudC5hcHBseShhLHRoaXMuY3VycmVudFRpbWUsdGhpcy5jdXJyZW50TG9vcCl9LGNsZWFyQW5pbWF0aW9uOmZ1bmN0aW9uKCl7dGhpcy5wcmV2aW91cz1udWxsLHRoaXMuY3VycmVudD1udWxsLHRoaXMucXVldWUubGVuZ3RoPTB9LF9zZXRBbmltYXRpb246ZnVuY3Rpb24oYSxiKXt0aGlzLnByZXZpb3VzPW51bGwsYSYmdGhpcy5jdXJyZW50JiYodGhpcy5taXhEdXJhdGlvbj10aGlzLmRhdGEuZ2V0TWl4KHRoaXMuY3VycmVudCxhKSx0aGlzLm1peER1cmF0aW9uPjAmJih0aGlzLm1peFRpbWU9MCx0aGlzLnByZXZpb3VzPXRoaXMuY3VycmVudCx0aGlzLnByZXZpb3VzVGltZT10aGlzLmN1cnJlbnRUaW1lLHRoaXMucHJldmlvdXNMb29wPXRoaXMuY3VycmVudExvb3ApKSx0aGlzLmN1cnJlbnQ9YSx0aGlzLmN1cnJlbnRMb29wPWIsdGhpcy5jdXJyZW50VGltZT0wfSxzZXRBbmltYXRpb25CeU5hbWU6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWMpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dGhpcy5zZXRBbmltYXRpb24oYyxiKX0sc2V0QW5pbWF0aW9uOmZ1bmN0aW9uKGEsYil7dGhpcy5xdWV1ZS5sZW5ndGg9MCx0aGlzLl9zZXRBbmltYXRpb24oYSxiKX0sYWRkQW5pbWF0aW9uQnlOYW1lOmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWQpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dGhpcy5hZGRBbmltYXRpb24oZCxiLGMpfSxhZGRBbmltYXRpb246ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXt9O2lmKGQuYW5pbWF0aW9uPWEsZC5sb29wPWIsIWN8fDA+PWMpe3ZhciBlPXRoaXMucXVldWUubGVuZ3RoP3RoaXMucXVldWVbdGhpcy5xdWV1ZS5sZW5ndGgtMV0uYW5pbWF0aW9uOnRoaXMuY3VycmVudDtjPW51bGwhPWU/ZS5kdXJhdGlvbi10aGlzLmRhdGEuZ2V0TWl4KGUsYSkrKGN8fDApOjB9ZC5kZWxheT1jLHRoaXMucXVldWUucHVzaChkKX0saXNDb21wbGV0ZTpmdW5jdGlvbigpe3JldHVybiF0aGlzLmN1cnJlbnR8fHRoaXMuY3VycmVudFRpbWU+PXRoaXMuY3VycmVudC5kdXJhdGlvbn19LGYuU2tlbGV0b25Kc29uPWZ1bmN0aW9uKGEpe3RoaXMuYXR0YWNobWVudExvYWRlcj1hfSxmLlNrZWxldG9uSnNvbi5wcm90b3R5cGU9e3NjYWxlOjEscmVhZFNrZWxldG9uRGF0YTpmdW5jdGlvbihhKXtmb3IodmFyIGIsYz1uZXcgZi5Ta2VsZXRvbkRhdGEsZD1hLmJvbmVzLGU9MCxnPWQubGVuZ3RoO2c+ZTtlKyspe3ZhciBoPWRbZV0saT1udWxsO2lmKGgucGFyZW50JiYoaT1jLmZpbmRCb25lKGgucGFyZW50KSwhaSkpdGhyb3dcIlBhcmVudCBib25lIG5vdCBmb3VuZDogXCIraC5wYXJlbnQ7Yj1uZXcgZi5Cb25lRGF0YShoLm5hbWUsaSksYi5sZW5ndGg9KGgubGVuZ3RofHwwKSp0aGlzLnNjYWxlLGIueD0oaC54fHwwKSp0aGlzLnNjYWxlLGIueT0oaC55fHwwKSp0aGlzLnNjYWxlLGIucm90YXRpb249aC5yb3RhdGlvbnx8MCxiLnNjYWxlWD1oLnNjYWxlWHx8MSxiLnNjYWxlWT1oLnNjYWxlWXx8MSxjLmJvbmVzLnB1c2goYil9dmFyIGo9YS5zbG90cztmb3IoZT0wLGc9ai5sZW5ndGg7Zz5lO2UrKyl7dmFyIGs9altlXTtpZihiPWMuZmluZEJvbmUoay5ib25lKSwhYil0aHJvd1wiU2xvdCBib25lIG5vdCBmb3VuZDogXCIray5ib25lO3ZhciBsPW5ldyBmLlNsb3REYXRhKGsubmFtZSxiKSxtPWsuY29sb3I7bSYmKGwucj1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMCksbC5nPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IobSwxKSxsLmI9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcihtLDIpLGwuYT1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMykpLGwuYXR0YWNobWVudE5hbWU9ay5hdHRhY2htZW50LGMuc2xvdHMucHVzaChsKX12YXIgbj1hLnNraW5zO2Zvcih2YXIgbyBpbiBuKWlmKG4uaGFzT3duUHJvcGVydHkobykpe3ZhciBwPW5bb10scT1uZXcgZi5Ta2luKG8pO2Zvcih2YXIgciBpbiBwKWlmKHAuaGFzT3duUHJvcGVydHkocikpe3ZhciBzPWMuZmluZFNsb3RJbmRleChyKSx0PXBbcl07Zm9yKHZhciB1IGluIHQpaWYodC5oYXNPd25Qcm9wZXJ0eSh1KSl7dmFyIHY9dGhpcy5yZWFkQXR0YWNobWVudChxLHUsdFt1XSk7bnVsbCE9diYmcS5hZGRBdHRhY2htZW50KHMsdSx2KX19Yy5za2lucy5wdXNoKHEpLFwiZGVmYXVsdFwiPT1xLm5hbWUmJihjLmRlZmF1bHRTa2luPXEpfXZhciB3PWEuYW5pbWF0aW9ucztmb3IodmFyIHggaW4gdyl3Lmhhc093blByb3BlcnR5KHgpJiZ0aGlzLnJlYWRBbmltYXRpb24oeCx3W3hdLGMpO3JldHVybiBjfSxyZWFkQXR0YWNobWVudDpmdW5jdGlvbihhLGIsYyl7Yj1jLm5hbWV8fGI7dmFyIGQ9Zi5BdHRhY2htZW50VHlwZVtjLnR5cGV8fFwicmVnaW9uXCJdO2lmKGQ9PWYuQXR0YWNobWVudFR5cGUucmVnaW9uKXt2YXIgZT1uZXcgZi5SZWdpb25BdHRhY2htZW50O3JldHVybiBlLng9KGMueHx8MCkqdGhpcy5zY2FsZSxlLnk9KGMueXx8MCkqdGhpcy5zY2FsZSxlLnNjYWxlWD1jLnNjYWxlWHx8MSxlLnNjYWxlWT1jLnNjYWxlWXx8MSxlLnJvdGF0aW9uPWMucm90YXRpb258fDAsZS53aWR0aD0oYy53aWR0aHx8MzIpKnRoaXMuc2NhbGUsZS5oZWlnaHQ9KGMuaGVpZ2h0fHwzMikqdGhpcy5zY2FsZSxlLnVwZGF0ZU9mZnNldCgpLGUucmVuZGVyZXJPYmplY3Q9e30sZS5yZW5kZXJlck9iamVjdC5uYW1lPWIsZS5yZW5kZXJlck9iamVjdC5zY2FsZT17fSxlLnJlbmRlcmVyT2JqZWN0LnNjYWxlLng9ZS5zY2FsZVgsZS5yZW5kZXJlck9iamVjdC5zY2FsZS55PWUuc2NhbGVZLGUucmVuZGVyZXJPYmplY3Qucm90YXRpb249LWUucm90YXRpb24qTWF0aC5QSS8xODAsZX10aHJvd1wiVW5rbm93biBhdHRhY2htZW50IHR5cGU6IFwiK2R9LHJlYWRBbmltYXRpb246ZnVuY3Rpb24oYSxiLGMpe3ZhciBkLGUsZyxoLGksaixrLGw9W10sbT0wLG49Yi5ib25lcztmb3IodmFyIG8gaW4gbilpZihuLmhhc093blByb3BlcnR5KG8pKXt2YXIgcD1jLmZpbmRCb25lSW5kZXgobyk7aWYoLTE9PXApdGhyb3dcIkJvbmUgbm90IGZvdW5kOiBcIitvO3ZhciBxPW5bb107Zm9yKGcgaW4gcSlpZihxLmhhc093blByb3BlcnR5KGcpKWlmKGk9cVtnXSxcInJvdGF0ZVwiPT1nKXtmb3IoZT1uZXcgZi5Sb3RhdGVUaW1lbGluZShpLmxlbmd0aCksZS5ib25lSW5kZXg9cCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyloPWlbal0sZS5zZXRGcmFtZShkLGgudGltZSxoLmFuZ2xlKSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmUoZSxkLGgpLGQrKztsLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzWzIqZS5nZXRGcmFtZUNvdW50KCktMl0pfWVsc2V7aWYoXCJ0cmFuc2xhdGVcIiE9ZyYmXCJzY2FsZVwiIT1nKXRocm93XCJJbnZhbGlkIHRpbWVsaW5lIHR5cGUgZm9yIGEgYm9uZTogXCIrZytcIiAoXCIrbytcIilcIjt2YXIgcj0xO2ZvcihcInNjYWxlXCI9PWc/ZT1uZXcgZi5TY2FsZVRpbWVsaW5lKGkubGVuZ3RoKTooZT1uZXcgZi5UcmFuc2xhdGVUaW1lbGluZShpLmxlbmd0aCkscj10aGlzLnNjYWxlKSxlLmJvbmVJbmRleD1wLGQ9MCxqPTAsaz1pLmxlbmd0aDtrPmo7aisrKXtoPWlbal07dmFyIHM9KGgueHx8MCkqcix0PShoLnl8fDApKnI7ZS5zZXRGcmFtZShkLGgudGltZSxzLHQpLGYuU2tlbGV0b25Kc29uLnJlYWRDdXJ2ZShlLGQsaCksZCsrfWwucHVzaChlKSxtPU1hdGgubWF4KG0sZS5mcmFtZXNbMyplLmdldEZyYW1lQ291bnQoKS0zXSl9fXZhciB1PWIuc2xvdHM7Zm9yKHZhciB2IGluIHUpaWYodS5oYXNPd25Qcm9wZXJ0eSh2KSl7dmFyIHc9dVt2XSx4PWMuZmluZFNsb3RJbmRleCh2KTtmb3IoZyBpbiB3KWlmKHcuaGFzT3duUHJvcGVydHkoZykpaWYoaT13W2ddLFwiY29sb3JcIj09Zyl7Zm9yKGU9bmV3IGYuQ29sb3JUaW1lbGluZShpLmxlbmd0aCksZS5zbG90SW5kZXg9eCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyl7aD1pW2pdO3ZhciB5PWguY29sb3Isej1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMCksQT1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMSksQj1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMiksQz1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMyk7ZS5zZXRGcmFtZShkLGgudGltZSx6LEEsQixDKSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmUoZSxkLGgpLGQrK31sLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzWzUqZS5nZXRGcmFtZUNvdW50KCktNV0pfWVsc2V7aWYoXCJhdHRhY2htZW50XCIhPWcpdGhyb3dcIkludmFsaWQgdGltZWxpbmUgdHlwZSBmb3IgYSBzbG90OiBcIitnK1wiIChcIit2K1wiKVwiO2ZvcihlPW5ldyBmLkF0dGFjaG1lbnRUaW1lbGluZShpLmxlbmd0aCksZS5zbG90SW5kZXg9eCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyloPWlbal0sZS5zZXRGcmFtZShkKyssaC50aW1lLGgubmFtZSk7bC5wdXNoKGUpLG09TWF0aC5tYXgobSxlLmZyYW1lc1tlLmdldEZyYW1lQ291bnQoKS0xXSl9fWMuYW5pbWF0aW9ucy5wdXNoKG5ldyBmLkFuaW1hdGlvbihhLGwsbSkpfX0sZi5Ta2VsZXRvbkpzb24ucmVhZEN1cnZlPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1jLmN1cnZlO2QmJihcInN0ZXBwZWRcIj09ZD9hLmN1cnZlcy5zZXRTdGVwcGVkKGIpOmQgaW5zdGFuY2VvZiBBcnJheSYmYS5jdXJ2ZXMuc2V0Q3VydmUoYixkWzBdLGRbMV0sZFsyXSxkWzNdKSl9LGYuU2tlbGV0b25Kc29uLnRvQ29sb3I9ZnVuY3Rpb24oYSxiKXtpZig4IT1hLmxlbmd0aCl0aHJvd1wiQ29sb3IgaGV4aWRlY2ltYWwgbGVuZ3RoIG11c3QgYmUgOCwgcmVjaWV2ZWQ6IFwiK2E7cmV0dXJuIHBhcnNlSW50KGEuc3Vic3RyKDIqYiwyKSwxNikvMjU1fSxmLkF0bGFzPWZ1bmN0aW9uKGEsYil7dGhpcy50ZXh0dXJlTG9hZGVyPWIsdGhpcy5wYWdlcz1bXSx0aGlzLnJlZ2lvbnM9W107dmFyIGM9bmV3IGYuQXRsYXNSZWFkZXIoYSksZD1bXTtkLmxlbmd0aD00O2Zvcih2YXIgZT1udWxsOzspe3ZhciBnPWMucmVhZExpbmUoKTtpZihudWxsPT1nKWJyZWFrO2lmKGc9Yy50cmltKGcpLGcubGVuZ3RoKWlmKGUpe3ZhciBoPW5ldyBmLkF0bGFzUmVnaW9uO2gubmFtZT1nLGgucGFnZT1lLGgucm90YXRlPVwidHJ1ZVwiPT1jLnJlYWRWYWx1ZSgpLGMucmVhZFR1cGxlKGQpO3ZhciBpPXBhcnNlSW50KGRbMF0sMTApLGo9cGFyc2VJbnQoZFsxXSwxMCk7Yy5yZWFkVHVwbGUoZCk7dmFyIGs9cGFyc2VJbnQoZFswXSwxMCksbD1wYXJzZUludChkWzFdLDEwKTtoLnU9aS9lLndpZHRoLGgudj1qL2UuaGVpZ2h0LGgucm90YXRlPyhoLnUyPShpK2wpL2Uud2lkdGgsaC52Mj0oaitrKS9lLmhlaWdodCk6KGgudTI9KGkraykvZS53aWR0aCxoLnYyPShqK2wpL2UuaGVpZ2h0KSxoLng9aSxoLnk9aixoLndpZHRoPU1hdGguYWJzKGspLGguaGVpZ2h0PU1hdGguYWJzKGwpLDQ9PWMucmVhZFR1cGxlKGQpJiYoaC5zcGxpdHM9W3BhcnNlSW50KGRbMF0sMTApLHBhcnNlSW50KGRbMV0sMTApLHBhcnNlSW50KGRbMl0sMTApLHBhcnNlSW50KGRbM10sMTApXSw0PT1jLnJlYWRUdXBsZShkKSYmKGgucGFkcz1bcGFyc2VJbnQoZFswXSwxMCkscGFyc2VJbnQoZFsxXSwxMCkscGFyc2VJbnQoZFsyXSwxMCkscGFyc2VJbnQoZFszXSwxMCldLGMucmVhZFR1cGxlKGQpKSksaC5vcmlnaW5hbFdpZHRoPXBhcnNlSW50KGRbMF0sMTApLGgub3JpZ2luYWxIZWlnaHQ9cGFyc2VJbnQoZFsxXSwxMCksYy5yZWFkVHVwbGUoZCksaC5vZmZzZXRYPXBhcnNlSW50KGRbMF0sMTApLGgub2Zmc2V0WT1wYXJzZUludChkWzFdLDEwKSxoLmluZGV4PXBhcnNlSW50KGMucmVhZFZhbHVlKCksMTApLHRoaXMucmVnaW9ucy5wdXNoKGgpfWVsc2V7ZT1uZXcgZi5BdGxhc1BhZ2UsZS5uYW1lPWcsZS5mb3JtYXQ9Zi5BdGxhcy5Gb3JtYXRbYy5yZWFkVmFsdWUoKV0sYy5yZWFkVHVwbGUoZCksZS5taW5GaWx0ZXI9Zi5BdGxhcy5UZXh0dXJlRmlsdGVyW2RbMF1dLGUubWFnRmlsdGVyPWYuQXRsYXMuVGV4dHVyZUZpbHRlcltkWzFdXTt2YXIgbT1jLnJlYWRWYWx1ZSgpO2UudVdyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5jbGFtcFRvRWRnZSxlLnZXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAuY2xhbXBUb0VkZ2UsXCJ4XCI9PW0/ZS51V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdDpcInlcIj09bT9lLnZXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0OlwieHlcIj09bSYmKGUudVdyYXA9ZS52V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdCksYi5sb2FkKGUsZyksdGhpcy5wYWdlcy5wdXNoKGUpfWVsc2UgZT1udWxsfX0sZi5BdGxhcy5wcm90b3R5cGU9e2ZpbmRSZWdpb246ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMucmVnaW9ucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZGlzcG9zZTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLnBhZ2VzLGI9MCxjPWEubGVuZ3RoO2M+YjtiKyspdGhpcy50ZXh0dXJlTG9hZGVyLnVubG9hZChhW2JdLnJlbmRlcmVyT2JqZWN0KX0sdXBkYXRlVVZzOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnJlZ2lvbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKyl7dmFyIGU9YltjXTtlLnBhZ2U9PWEmJihlLnU9ZS54L2Eud2lkdGgsZS52PWUueS9hLmhlaWdodCxlLnJvdGF0ZT8oZS51Mj0oZS54K2UuaGVpZ2h0KS9hLndpZHRoLGUudjI9KGUueStlLndpZHRoKS9hLmhlaWdodCk6KGUudTI9KGUueCtlLndpZHRoKS9hLndpZHRoLGUudjI9KGUueStlLmhlaWdodCkvYS5oZWlnaHQpKX19fSxmLkF0bGFzLkZvcm1hdD17YWxwaGE6MCxpbnRlbnNpdHk6MSxsdW1pbmFuY2VBbHBoYToyLHJnYjU2NTozLHJnYmE0NDQ0OjQscmdiODg4OjUscmdiYTg4ODg6Nn0sZi5BdGxhcy5UZXh0dXJlRmlsdGVyPXtuZWFyZXN0OjAsbGluZWFyOjEsbWlwTWFwOjIsbWlwTWFwTmVhcmVzdE5lYXJlc3Q6MyxtaXBNYXBMaW5lYXJOZWFyZXN0OjQsbWlwTWFwTmVhcmVzdExpbmVhcjo1LG1pcE1hcExpbmVhckxpbmVhcjo2fSxmLkF0bGFzLlRleHR1cmVXcmFwPXttaXJyb3JlZFJlcGVhdDowLGNsYW1wVG9FZGdlOjEscmVwZWF0OjJ9LGYuQXRsYXNQYWdlPWZ1bmN0aW9uKCl7fSxmLkF0bGFzUGFnZS5wcm90b3R5cGU9e25hbWU6bnVsbCxmb3JtYXQ6bnVsbCxtaW5GaWx0ZXI6bnVsbCxtYWdGaWx0ZXI6bnVsbCx1V3JhcDpudWxsLHZXcmFwOm51bGwscmVuZGVyZXJPYmplY3Q6bnVsbCx3aWR0aDowLGhlaWdodDowfSxmLkF0bGFzUmVnaW9uPWZ1bmN0aW9uKCl7fSxmLkF0bGFzUmVnaW9uLnByb3RvdHlwZT17cGFnZTpudWxsLG5hbWU6bnVsbCx4OjAseTowLHdpZHRoOjAsaGVpZ2h0OjAsdTowLHY6MCx1MjowLHYyOjAsb2Zmc2V0WDowLG9mZnNldFk6MCxvcmlnaW5hbFdpZHRoOjAsb3JpZ2luYWxIZWlnaHQ6MCxpbmRleDowLHJvdGF0ZTohMSxzcGxpdHM6bnVsbCxwYWRzOm51bGx9LGYuQXRsYXNSZWFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5saW5lcz1hLnNwbGl0KC9cXHJcXG58XFxyfFxcbi8pfSxmLkF0bGFzUmVhZGVyLnByb3RvdHlwZT17aW5kZXg6MCx0cmltOmZ1bmN0aW9uKGEpe3JldHVybiBhLnJlcGxhY2UoL15cXHMrfFxccyskL2csXCJcIil9LHJlYWRMaW5lOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaW5kZXg+PXRoaXMubGluZXMubGVuZ3RoP251bGw6dGhpcy5saW5lc1t0aGlzLmluZGV4KytdfSxyZWFkVmFsdWU6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLnJlYWRMaW5lKCksYj1hLmluZGV4T2YoXCI6XCIpO2lmKC0xPT1iKXRocm93XCJJbnZhbGlkIGxpbmU6IFwiK2E7cmV0dXJuIHRoaXMudHJpbShhLnN1YnN0cmluZyhiKzEpKX0scmVhZFR1cGxlOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMucmVhZExpbmUoKSxjPWIuaW5kZXhPZihcIjpcIik7aWYoLTE9PWMpdGhyb3dcIkludmFsaWQgbGluZTogXCIrYjtmb3IodmFyIGQ9MCxlPWMrMTszPmQ7ZCsrKXt2YXIgZj1iLmluZGV4T2YoXCIsXCIsZSk7aWYoLTE9PWYpe2lmKCFkKXRocm93XCJJbnZhbGlkIGxpbmU6IFwiK2I7YnJlYWt9YVtkXT10aGlzLnRyaW0oYi5zdWJzdHIoZSxmLWUpKSxlPWYrMX1yZXR1cm4gYVtkXT10aGlzLnRyaW0oYi5zdWJzdHJpbmcoZSkpLGQrMX19LGYuQXRsYXNBdHRhY2htZW50TG9hZGVyPWZ1bmN0aW9uKGEpe3RoaXMuYXRsYXM9YX0sZi5BdGxhc0F0dGFjaG1lbnRMb2FkZXIucHJvdG90eXBlPXtuZXdBdHRhY2htZW50OmZ1bmN0aW9uKGEsYixjKXtzd2l0Y2goYil7Y2FzZSBmLkF0dGFjaG1lbnRUeXBlLnJlZ2lvbjp2YXIgZD10aGlzLmF0bGFzLmZpbmRSZWdpb24oYyk7aWYoIWQpdGhyb3dcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiK2MrXCIgKFwiK2IrXCIpXCI7dmFyIGU9bmV3IGYuUmVnaW9uQXR0YWNobWVudChjKTtyZXR1cm4gZS5yZW5kZXJlck9iamVjdD1kLGUuc2V0VVZzKGQudSxkLnYsZC51MixkLnYyLGQucm90YXRlKSxlLnJlZ2lvbk9mZnNldFg9ZC5vZmZzZXRYLGUucmVnaW9uT2Zmc2V0WT1kLm9mZnNldFksZS5yZWdpb25XaWR0aD1kLndpZHRoLGUucmVnaW9uSGVpZ2h0PWQuaGVpZ2h0LGUucmVnaW9uT3JpZ2luYWxXaWR0aD1kLm9yaWdpbmFsV2lkdGgsZS5yZWdpb25PcmlnaW5hbEhlaWdodD1kLm9yaWdpbmFsSGVpZ2h0LGV9dGhyb3dcIlVua25vd24gYXR0YWNobWVudCB0eXBlOiBcIitifX0sZi5Cb25lLnlEb3duPSEwLGIuQW5pbUNhY2hlPXt9LGIuU3BpbmU9ZnVuY3Rpb24oYSl7aWYoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5zcGluZURhdGE9Yi5BbmltQ2FjaGVbYV0sIXRoaXMuc3BpbmVEYXRhKXRocm93IG5ldyBFcnJvcihcIlNwaW5lIGRhdGEgbXVzdCBiZSBwcmVsb2FkZWQgdXNpbmcgUElYSS5TcGluZUxvYWRlciBvciBQSVhJLkFzc2V0TG9hZGVyOiBcIithKTt0aGlzLnNrZWxldG9uPW5ldyBmLlNrZWxldG9uKHRoaXMuc3BpbmVEYXRhKSx0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCksdGhpcy5zdGF0ZURhdGE9bmV3IGYuQW5pbWF0aW9uU3RhdGVEYXRhKHRoaXMuc3BpbmVEYXRhKSx0aGlzLnN0YXRlPW5ldyBmLkFuaW1hdGlvblN0YXRlKHRoaXMuc3RhdGVEYXRhKSx0aGlzLnNsb3RDb250YWluZXJzPVtdO2Zvcih2YXIgYz0wLGQ9dGhpcy5za2VsZXRvbi5kcmF3T3JkZXIubGVuZ3RoO2Q+YztjKyspe3ZhciBlPXRoaXMuc2tlbGV0b24uZHJhd09yZGVyW2NdLGc9ZS5hdHRhY2htZW50LGg9bmV3IGIuRGlzcGxheU9iamVjdENvbnRhaW5lcjtpZih0aGlzLnNsb3RDb250YWluZXJzLnB1c2goaCksdGhpcy5hZGRDaGlsZChoKSxnIGluc3RhbmNlb2YgZi5SZWdpb25BdHRhY2htZW50KXt2YXIgaT1nLnJlbmRlcmVyT2JqZWN0Lm5hbWUsaj10aGlzLmNyZWF0ZVNwcml0ZShlLGcucmVuZGVyZXJPYmplY3QpO2UuY3VycmVudFNwcml0ZT1qLGUuY3VycmVudFNwcml0ZU5hbWU9aSxoLmFkZENoaWxkKGopfX19LGIuU3BpbmUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TcGluZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcGluZSxiLlNwaW5lLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLmxhc3RUaW1lPXRoaXMubGFzdFRpbWV8fERhdGUubm93KCk7dmFyIGE9LjAwMSooRGF0ZS5ub3coKS10aGlzLmxhc3RUaW1lKTt0aGlzLmxhc3RUaW1lPURhdGUubm93KCksdGhpcy5zdGF0ZS51cGRhdGUoYSksdGhpcy5zdGF0ZS5hcHBseSh0aGlzLnNrZWxldG9uKSx0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCk7Zm9yKHZhciBjPXRoaXMuc2tlbGV0b24uZHJhd09yZGVyLGQ9MCxlPWMubGVuZ3RoO2U+ZDtkKyspe3ZhciBnPWNbZF0saD1nLmF0dGFjaG1lbnQsaT10aGlzLnNsb3RDb250YWluZXJzW2RdO2lmKGggaW5zdGFuY2VvZiBmLlJlZ2lvbkF0dGFjaG1lbnQpe2lmKGgucmVuZGVyZXJPYmplY3QmJighZy5jdXJyZW50U3ByaXRlTmFtZXx8Zy5jdXJyZW50U3ByaXRlTmFtZSE9aC5uYW1lKSl7dmFyIGo9aC5yZW5kZXJlck9iamVjdC5uYW1lO2lmKHZvaWQgMCE9PWcuY3VycmVudFNwcml0ZSYmKGcuY3VycmVudFNwcml0ZS52aXNpYmxlPSExKSxnLnNwcml0ZXM9Zy5zcHJpdGVzfHx7fSx2b2lkIDAhPT1nLnNwcml0ZXNbal0pZy5zcHJpdGVzW2pdLnZpc2libGU9ITA7ZWxzZXt2YXIgaz10aGlzLmNyZWF0ZVNwcml0ZShnLGgucmVuZGVyZXJPYmplY3QpO2kuYWRkQ2hpbGQoayl9Zy5jdXJyZW50U3ByaXRlPWcuc3ByaXRlc1tqXSxnLmN1cnJlbnRTcHJpdGVOYW1lPWp9aS52aXNpYmxlPSEwO3ZhciBsPWcuYm9uZTtpLnBvc2l0aW9uLng9bC53b3JsZFgraC54KmwubTAwK2gueSpsLm0wMSxpLnBvc2l0aW9uLnk9bC53b3JsZFkraC54KmwubTEwK2gueSpsLm0xMSxpLnNjYWxlLng9bC53b3JsZFNjYWxlWCxpLnNjYWxlLnk9bC53b3JsZFNjYWxlWSxpLnJvdGF0aW9uPS0oZy5ib25lLndvcmxkUm90YXRpb24qTWF0aC5QSS8xODApLGkuYWxwaGE9Zy5hLGcuY3VycmVudFNwcml0ZS50aW50PWIucmdiMmhleChbZy5yLGcuZyxnLmJdKX1lbHNlIGkudmlzaWJsZT0hMX1iLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfSxiLlNwaW5lLnByb3RvdHlwZS5jcmVhdGVTcHJpdGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1iLlRleHR1cmVDYWNoZVtjLm5hbWVdP2MubmFtZTpjLm5hbWUrXCIucG5nXCIsZT1uZXcgYi5TcHJpdGUoYi5UZXh0dXJlLmZyb21GcmFtZShkKSk7cmV0dXJuIGUuc2NhbGU9Yy5zY2FsZSxlLnJvdGF0aW9uPWMucm90YXRpb24sZS5hbmNob3IueD1lLmFuY2hvci55PS41LGEuc3ByaXRlcz1hLnNwcml0ZXN8fHt9LGEuc3ByaXRlc1tjLm5hbWVdPWUsZX0sYi5CYXNlVGV4dHVyZUNhY2hlPXt9LGIudGV4dHVyZXNUb1VwZGF0ZT1bXSxiLnRleHR1cmVzVG9EZXN0cm95PVtdLGIuQmFzZVRleHR1cmVDYWNoZUlkR2VuZXJhdG9yPTAsYi5CYXNlVGV4dHVyZT1mdW5jdGlvbihhLGMpe2lmKGIuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLndpZHRoPTEwMCx0aGlzLmhlaWdodD0xMDAsdGhpcy5zY2FsZU1vZGU9Y3x8Yi5zY2FsZU1vZGVzLkRFRkFVTFQsdGhpcy5oYXNMb2FkZWQ9ITEsdGhpcy5zb3VyY2U9YSx0aGlzLmlkPWIuQmFzZVRleHR1cmVDYWNoZUlkR2VuZXJhdG9yKyssdGhpcy5wcmVtdWx0aXBsaWVkQWxwaGE9ITAsdGhpcy5fZ2xUZXh0dXJlcz1bXSx0aGlzLl9kaXJ0eT1bXSxhKXtpZigodGhpcy5zb3VyY2UuY29tcGxldGV8fHRoaXMuc291cmNlLmdldENvbnRleHQpJiZ0aGlzLnNvdXJjZS53aWR0aCYmdGhpcy5zb3VyY2UuaGVpZ2h0KXRoaXMuaGFzTG9hZGVkPSEwLHRoaXMud2lkdGg9dGhpcy5zb3VyY2Uud2lkdGgsdGhpcy5oZWlnaHQ9dGhpcy5zb3VyY2UuaGVpZ2h0LGIudGV4dHVyZXNUb1VwZGF0ZS5wdXNoKHRoaXMpO2Vsc2V7dmFyIGQ9dGhpczt0aGlzLnNvdXJjZS5vbmxvYWQ9ZnVuY3Rpb24oKXtkLmhhc0xvYWRlZD0hMCxkLndpZHRoPWQuc291cmNlLndpZHRoLGQuaGVpZ2h0PWQuc291cmNlLmhlaWdodDtmb3IodmFyIGE9MDthPGQuX2dsVGV4dHVyZXMubGVuZ3RoO2ErKylkLl9kaXJ0eVthXT0hMDtkLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OmR9KX0sdGhpcy5zb3VyY2Uub25lcnJvcj1mdW5jdGlvbigpe2QuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImVycm9yXCIsY29udGVudDpkfSl9fXRoaXMuaW1hZ2VVcmw9bnVsbCx0aGlzLl9wb3dlck9mMj0hMX19LGIuQmFzZVRleHR1cmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmFzZVRleHR1cmUsYi5CYXNlVGV4dHVyZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuaW1hZ2VVcmw/KGRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbdGhpcy5pbWFnZVVybF0sZGVsZXRlIGIuVGV4dHVyZUNhY2hlW3RoaXMuaW1hZ2VVcmxdLHRoaXMuaW1hZ2VVcmw9bnVsbCx0aGlzLnNvdXJjZS5zcmM9bnVsbCk6dGhpcy5zb3VyY2UmJnRoaXMuc291cmNlLl9waXhpSWQmJmRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbdGhpcy5zb3VyY2UuX3BpeGlJZF0sdGhpcy5zb3VyY2U9bnVsbCxiLnRleHR1cmVzVG9EZXN0cm95LnB1c2godGhpcyl9LGIuQmFzZVRleHR1cmUucHJvdG90eXBlLnVwZGF0ZVNvdXJjZUltYWdlPWZ1bmN0aW9uKGEpe3RoaXMuaGFzTG9hZGVkPSExLHRoaXMuc291cmNlLnNyYz1udWxsLHRoaXMuc291cmNlLnNyYz1hfSxiLkJhc2VUZXh0dXJlLmZyb21JbWFnZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5CYXNlVGV4dHVyZUNhY2hlW2FdO2lmKHZvaWQgMD09PWMmJi0xPT09YS5pbmRleE9mKFwiZGF0YTpcIikmJihjPSEwKSwhZSl7dmFyIGY9bmV3IEltYWdlO2MmJihmLmNyb3NzT3JpZ2luPVwiXCIpLGYuc3JjPWEsZT1uZXcgYi5CYXNlVGV4dHVyZShmLGQpLGUuaW1hZ2VVcmw9YSxiLkJhc2VUZXh0dXJlQ2FjaGVbYV09ZX1yZXR1cm4gZX0sYi5CYXNlVGV4dHVyZS5mcm9tQ2FudmFzPWZ1bmN0aW9uKGEsYyl7YS5fcGl4aUlkfHwoYS5fcGl4aUlkPVwiY2FudmFzX1wiK2IuVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3IrKyk7dmFyIGQ9Yi5CYXNlVGV4dHVyZUNhY2hlW2EuX3BpeGlJZF07cmV0dXJuIGR8fChkPW5ldyBiLkJhc2VUZXh0dXJlKGEsYyksYi5CYXNlVGV4dHVyZUNhY2hlW2EuX3BpeGlJZF09ZCksZH0sYi5UZXh0dXJlQ2FjaGU9e30sYi5GcmFtZUNhY2hlPXt9LGIuVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3I9MCxiLlRleHR1cmU9ZnVuY3Rpb24oYSxjKXtpZihiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy5ub0ZyYW1lPSExLGN8fCh0aGlzLm5vRnJhbWU9ITAsYz1uZXcgYi5SZWN0YW5nbGUoMCwwLDEsMSkpLGEgaW5zdGFuY2VvZiBiLlRleHR1cmUmJihhPWEuYmFzZVRleHR1cmUpLHRoaXMuYmFzZVRleHR1cmU9YSx0aGlzLmZyYW1lPWMsdGhpcy50cmltPW51bGwsdGhpcy52YWxpZD0hMSx0aGlzLnNjb3BlPXRoaXMsdGhpcy5fdXZzPW51bGwsdGhpcy53aWR0aD0wLHRoaXMuaGVpZ2h0PTAsdGhpcy5jcm9wPW5ldyBiLlJlY3RhbmdsZSgwLDAsMSwxKSxhLmhhc0xvYWRlZCl0aGlzLm5vRnJhbWUmJihjPW5ldyBiLlJlY3RhbmdsZSgwLDAsYS53aWR0aCxhLmhlaWdodCkpLHRoaXMuc2V0RnJhbWUoYyk7ZWxzZXt2YXIgZD10aGlzO2EuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7ZC5vbkJhc2VUZXh0dXJlTG9hZGVkKCl9KX19LGIuVGV4dHVyZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5UZXh0dXJlLGIuVGV4dHVyZS5wcm90b3R5cGUub25CYXNlVGV4dHVyZUxvYWRlZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuYmFzZVRleHR1cmU7YS5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsdGhpcy5vbkxvYWRlZCksdGhpcy5ub0ZyYW1lJiYodGhpcy5mcmFtZT1uZXcgYi5SZWN0YW5nbGUoMCwwLGEud2lkdGgsYS5oZWlnaHQpKSx0aGlzLnNldEZyYW1lKHRoaXMuZnJhbWUpLHRoaXMuc2NvcGUuZGlzcGF0Y2hFdmVudCh7dHlwZTpcInVwZGF0ZVwiLGNvbnRlbnQ6dGhpc30pfSxiLlRleHR1cmUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oYSl7YSYmdGhpcy5iYXNlVGV4dHVyZS5kZXN0cm95KCksdGhpcy52YWxpZD0hMX0sYi5UZXh0dXJlLnByb3RvdHlwZS5zZXRGcmFtZT1mdW5jdGlvbihhKXtpZih0aGlzLm5vRnJhbWU9ITEsdGhpcy5mcmFtZT1hLHRoaXMud2lkdGg9YS53aWR0aCx0aGlzLmhlaWdodD1hLmhlaWdodCx0aGlzLmNyb3AueD1hLngsdGhpcy5jcm9wLnk9YS55LHRoaXMuY3JvcC53aWR0aD1hLndpZHRoLHRoaXMuY3JvcC5oZWlnaHQ9YS5oZWlnaHQsIXRoaXMudHJpbSYmKGEueCthLndpZHRoPnRoaXMuYmFzZVRleHR1cmUud2lkdGh8fGEueSthLmhlaWdodD50aGlzLmJhc2VUZXh0dXJlLmhlaWdodCkpdGhyb3cgbmV3IEVycm9yKFwiVGV4dHVyZSBFcnJvcjogZnJhbWUgZG9lcyBub3QgZml0IGluc2lkZSB0aGUgYmFzZSBUZXh0dXJlIGRpbWVuc2lvbnMgXCIrdGhpcyk7dGhpcy52YWxpZD1hJiZhLndpZHRoJiZhLmhlaWdodCYmdGhpcy5iYXNlVGV4dHVyZS5zb3VyY2UmJnRoaXMuYmFzZVRleHR1cmUuaGFzTG9hZGVkLHRoaXMudHJpbSYmKHRoaXMud2lkdGg9dGhpcy50cmltLndpZHRoLHRoaXMuaGVpZ2h0PXRoaXMudHJpbS5oZWlnaHQsdGhpcy5mcmFtZS53aWR0aD10aGlzLnRyaW0ud2lkdGgsdGhpcy5mcmFtZS5oZWlnaHQ9dGhpcy50cmltLmhlaWdodCksdGhpcy52YWxpZCYmYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5wdXNoKHRoaXMpfSxiLlRleHR1cmUucHJvdG90eXBlLl91cGRhdGVXZWJHTHV2cz1mdW5jdGlvbigpe3RoaXMuX3V2c3x8KHRoaXMuX3V2cz1uZXcgYi5UZXh0dXJlVXZzKTt2YXIgYT10aGlzLmNyb3AsYz10aGlzLmJhc2VUZXh0dXJlLndpZHRoLGQ9dGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQ7dGhpcy5fdXZzLngwPWEueC9jLHRoaXMuX3V2cy55MD1hLnkvZCx0aGlzLl91dnMueDE9KGEueCthLndpZHRoKS9jLHRoaXMuX3V2cy55MT1hLnkvZCx0aGlzLl91dnMueDI9KGEueCthLndpZHRoKS9jLHRoaXMuX3V2cy55Mj0oYS55K2EuaGVpZ2h0KS9kLHRoaXMuX3V2cy54Mz1hLngvYyx0aGlzLl91dnMueTM9KGEueSthLmhlaWdodCkvZH0sYi5UZXh0dXJlLmZyb21JbWFnZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5UZXh0dXJlQ2FjaGVbYV07cmV0dXJuIGV8fChlPW5ldyBiLlRleHR1cmUoYi5CYXNlVGV4dHVyZS5mcm9tSW1hZ2UoYSxjLGQpKSxiLlRleHR1cmVDYWNoZVthXT1lKSxlfSxiLlRleHR1cmUuZnJvbUZyYW1lPWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dHVyZUNhY2hlW2FdO2lmKCFjKXRocm93IG5ldyBFcnJvcignVGhlIGZyYW1lSWQgXCInK2ErJ1wiIGRvZXMgbm90IGV4aXN0IGluIHRoZSB0ZXh0dXJlIGNhY2hlICcpO3JldHVybiBjfSxiLlRleHR1cmUuZnJvbUNhbnZhcz1mdW5jdGlvbihhLGMpe3ZhciBkPWIuQmFzZVRleHR1cmUuZnJvbUNhbnZhcyhhLGMpO3JldHVybiBuZXcgYi5UZXh0dXJlKGQpfSxiLlRleHR1cmUuYWRkVGV4dHVyZVRvQ2FjaGU9ZnVuY3Rpb24oYSxjKXtiLlRleHR1cmVDYWNoZVtjXT1hfSxiLlRleHR1cmUucmVtb3ZlVGV4dHVyZUZyb21DYWNoZT1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHR1cmVDYWNoZVthXTtyZXR1cm4gZGVsZXRlIGIuVGV4dHVyZUNhY2hlW2FdLGRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbYV0sY30sYi5UZXh0dXJlLmZyYW1lVXBkYXRlcz1bXSxiLlRleHR1cmVVdnM9ZnVuY3Rpb24oKXt0aGlzLngwPTAsdGhpcy55MD0wLHRoaXMueDE9MCx0aGlzLnkxPTAsdGhpcy54Mj0wLHRoaXMueTI9MCx0aGlzLngzPTAsdGhpcy55Mz0wfSxiLlJlbmRlclRleHR1cmU9ZnVuY3Rpb24oYSxjLGQsZSl7aWYoYi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMud2lkdGg9YXx8MTAwLHRoaXMuaGVpZ2h0PWN8fDEwMCx0aGlzLmZyYW1lPW5ldyBiLlJlY3RhbmdsZSgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5jcm9wPW5ldyBiLlJlY3RhbmdsZSgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5iYXNlVGV4dHVyZT1uZXcgYi5CYXNlVGV4dHVyZSx0aGlzLmJhc2VUZXh0dXJlLndpZHRoPXRoaXMud2lkdGgsdGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQ9dGhpcy5oZWlnaHQsdGhpcy5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlcz1bXSx0aGlzLmJhc2VUZXh0dXJlLnNjYWxlTW9kZT1lfHxiLnNjYWxlTW9kZXMuREVGQVVMVCx0aGlzLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD0hMCx0aGlzLnJlbmRlcmVyPWR8fGIuZGVmYXVsdFJlbmRlcmVyLHRoaXMucmVuZGVyZXIudHlwZT09PWIuV0VCR0xfUkVOREVSRVIpe3ZhciBmPXRoaXMucmVuZGVyZXIuZ2w7dGhpcy50ZXh0dXJlQnVmZmVyPW5ldyBiLkZpbHRlclRleHR1cmUoZix0aGlzLndpZHRoLHRoaXMuaGVpZ2h0LHRoaXMuYmFzZVRleHR1cmUuc2NhbGVNb2RlKSx0aGlzLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2YuaWRdPXRoaXMudGV4dHVyZUJ1ZmZlci50ZXh0dXJlLHRoaXMucmVuZGVyPXRoaXMucmVuZGVyV2ViR0wsdGhpcy5wcm9qZWN0aW9uPW5ldyBiLlBvaW50KHRoaXMud2lkdGgvMiwtdGhpcy5oZWlnaHQvMil9ZWxzZSB0aGlzLnJlbmRlcj10aGlzLnJlbmRlckNhbnZhcyx0aGlzLnRleHR1cmVCdWZmZXI9bmV3IGIuQ2FudmFzQnVmZmVyKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMuYmFzZVRleHR1cmUuc291cmNlPXRoaXMudGV4dHVyZUJ1ZmZlci5jYW52YXM7dGhpcy52YWxpZD0hMCxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLnB1c2godGhpcyl9LGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlRleHR1cmUucHJvdG90eXBlKSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUmVuZGVyVGV4dHVyZSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGMsZCl7KGEhPT10aGlzLndpZHRofHxjIT09dGhpcy5oZWlnaHQpJiYodGhpcy53aWR0aD10aGlzLmZyYW1lLndpZHRoPXRoaXMuY3JvcC53aWR0aD1hLHRoaXMuaGVpZ2h0PXRoaXMuZnJhbWUuaGVpZ2h0PXRoaXMuY3JvcC5oZWlnaHQ9YyxkJiYodGhpcy5iYXNlVGV4dHVyZS53aWR0aD10aGlzLndpZHRoLHRoaXMuYmFzZVRleHR1cmUuaGVpZ2h0PXRoaXMuaGVpZ2h0KSx0aGlzLnJlbmRlcmVyLnR5cGU9PT1iLldFQkdMX1JFTkRFUkVSJiYodGhpcy5wcm9qZWN0aW9uLng9dGhpcy53aWR0aC8yLHRoaXMucHJvamVjdGlvbi55PS10aGlzLmhlaWdodC8yKSx0aGlzLnRleHR1cmVCdWZmZXIucmVzaXplKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpKX0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3RoaXMucmVuZGVyZXIudHlwZT09PWIuV0VCR0xfUkVOREVSRVImJnRoaXMucmVuZGVyZXIuZ2wuYmluZEZyYW1lYnVmZmVyKHRoaXMucmVuZGVyZXIuZ2wuRlJBTUVCVUZGRVIsdGhpcy50ZXh0dXJlQnVmZmVyLmZyYW1lQnVmZmVyKSx0aGlzLnRleHR1cmVCdWZmZXIuY2xlYXIoKX0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5yZW5kZXJXZWJHTD1mdW5jdGlvbihhLGMsZCl7dmFyIGU9dGhpcy5yZW5kZXJlci5nbDtlLmNvbG9yTWFzayghMCwhMCwhMCwhMCksZS52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksZS5iaW5kRnJhbWVidWZmZXIoZS5GUkFNRUJVRkZFUix0aGlzLnRleHR1cmVCdWZmZXIuZnJhbWVCdWZmZXIpLGQmJnRoaXMudGV4dHVyZUJ1ZmZlci5jbGVhcigpO3ZhciBmPWEuY2hpbGRyZW4sZz1hLndvcmxkVHJhbnNmb3JtO2Eud29ybGRUcmFuc2Zvcm09Yi5SZW5kZXJUZXh0dXJlLnRlbXBNYXRyaXgsYS53b3JsZFRyYW5zZm9ybS5kPS0xLGEud29ybGRUcmFuc2Zvcm0udHk9LTIqdGhpcy5wcm9qZWN0aW9uLnksYyYmKGEud29ybGRUcmFuc2Zvcm0udHg9Yy54LGEud29ybGRUcmFuc2Zvcm0udHktPWMueSk7Zm9yKHZhciBoPTAsaT1mLmxlbmd0aDtpPmg7aCsrKWZbaF0udXBkYXRlVHJhbnNmb3JtKCk7Yi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVzKCksdGhpcy5yZW5kZXJlci5zcHJpdGVCYXRjaC5kaXJ0eT0hMCx0aGlzLnJlbmRlcmVyLnJlbmRlckRpc3BsYXlPYmplY3QoYSx0aGlzLnByb2plY3Rpb24sdGhpcy50ZXh0dXJlQnVmZmVyLmZyYW1lQnVmZmVyKSxhLndvcmxkVHJhbnNmb3JtPWcsdGhpcy5yZW5kZXJlci5zcHJpdGVCYXRjaC5kaXJ0eT0hMH0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWEuY2hpbGRyZW4sZj1hLndvcmxkVHJhbnNmb3JtO2Eud29ybGRUcmFuc2Zvcm09Yi5SZW5kZXJUZXh0dXJlLnRlbXBNYXRyaXgsYz8oYS53b3JsZFRyYW5zZm9ybS50eD1jLngsYS53b3JsZFRyYW5zZm9ybS50eT1jLnkpOihhLndvcmxkVHJhbnNmb3JtLnR4PTAsYS53b3JsZFRyYW5zZm9ybS50eT0wKTtmb3IodmFyIGc9MCxoPWUubGVuZ3RoO2g+ZztnKyspZVtnXS51cGRhdGVUcmFuc2Zvcm0oKTtkJiZ0aGlzLnRleHR1cmVCdWZmZXIuY2xlYXIoKTt2YXIgaT10aGlzLnRleHR1cmVCdWZmZXIuY29udGV4dDt0aGlzLnJlbmRlcmVyLnJlbmRlckRpc3BsYXlPYmplY3QoYSxpKSxpLnNldFRyYW5zZm9ybSgxLDAsMCwxLDAsMCksYS53b3JsZFRyYW5zZm9ybT1mfSxiLlJlbmRlclRleHR1cmUudGVtcE1hdHJpeD1uZXcgYi5NYXRyaXgsYi5Bc3NldExvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLmFzc2V0VVJMcz1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmxvYWRlcnNCeVR5cGU9e2pwZzpiLkltYWdlTG9hZGVyLGpwZWc6Yi5JbWFnZUxvYWRlcixwbmc6Yi5JbWFnZUxvYWRlcixnaWY6Yi5JbWFnZUxvYWRlcix3ZWJwOmIuSW1hZ2VMb2FkZXIsanNvbjpiLkpzb25Mb2FkZXIsYXRsYXM6Yi5BdGxhc0xvYWRlcixhbmltOmIuU3BpbmVMb2FkZXIseG1sOmIuQml0bWFwRm9udExvYWRlcixmbnQ6Yi5CaXRtYXBGb250TG9hZGVyfX0sYi5Bc3NldExvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Bc3NldExvYWRlcixiLkFzc2V0TG9hZGVyLnByb3RvdHlwZS5fZ2V0RGF0YVR5cGU9ZnVuY3Rpb24oYSl7dmFyIGI9XCJkYXRhOlwiLGM9YS5zbGljZSgwLGIubGVuZ3RoKS50b0xvd2VyQ2FzZSgpO2lmKGM9PT1iKXt2YXIgZD1hLnNsaWNlKGIubGVuZ3RoKSxlPWQuaW5kZXhPZihcIixcIik7aWYoLTE9PT1lKXJldHVybiBudWxsO3ZhciBmPWQuc2xpY2UoMCxlKS5zcGxpdChcIjtcIilbMF07cmV0dXJuIGYmJlwidGV4dC9wbGFpblwiIT09Zi50b0xvd2VyQ2FzZSgpP2Yuc3BsaXQoXCIvXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCk6XCJ0eHRcIn1yZXR1cm4gbnVsbH0sYi5Bc3NldExvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSl7Yi5vbkFzc2V0TG9hZGVkKGEuY29udGVudCl9dmFyIGI9dGhpczt0aGlzLmxvYWRDb3VudD10aGlzLmFzc2V0VVJMcy5sZW5ndGg7Zm9yKHZhciBjPTA7Yzx0aGlzLmFzc2V0VVJMcy5sZW5ndGg7YysrKXt2YXIgZD10aGlzLmFzc2V0VVJMc1tjXSxlPXRoaXMuX2dldERhdGFUeXBlKGQpO2V8fChlPWQuc3BsaXQoXCI/XCIpLnNoaWZ0KCkuc3BsaXQoXCIuXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCkpO3ZhciBmPXRoaXMubG9hZGVyc0J5VHlwZVtlXTtpZighZil0aHJvdyBuZXcgRXJyb3IoZStcIiBpcyBhbiB1bnN1cHBvcnRlZCBmaWxlIHR5cGVcIik7dmFyIGc9bmV3IGYoZCx0aGlzLmNyb3Nzb3JpZ2luKTtnLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixhKSxnLmxvYWQoKX19LGIuQXNzZXRMb2FkZXIucHJvdG90eXBlLm9uQXNzZXRMb2FkZWQ9ZnVuY3Rpb24oYSl7dGhpcy5sb2FkQ291bnQtLSx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJvblByb2dyZXNzXCIsY29udGVudDp0aGlzLGxvYWRlcjphfSksdGhpcy5vblByb2dyZXNzJiZ0aGlzLm9uUHJvZ3Jlc3MoYSksdGhpcy5sb2FkQ291bnR8fCh0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJvbkNvbXBsZXRlXCIsY29udGVudDp0aGlzfSksdGhpcy5vbkNvbXBsZXRlJiZ0aGlzLm9uQ29tcGxldGUoKSl9LGIuSnNvbkxvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmJhc2VVcmw9YS5yZXBsYWNlKC9bXlxcL10qJC8sXCJcIiksdGhpcy5sb2FkZWQ9ITF9LGIuSnNvbkxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Kc29uTG9hZGVyLGIuSnNvbkxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXM7d2luZG93LlhEb21haW5SZXF1ZXN0JiZhLmNyb3Nzb3JpZ2luPyh0aGlzLmFqYXhSZXF1ZXN0PW5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QsdGhpcy5hamF4UmVxdWVzdC50aW1lb3V0PTNlMyx0aGlzLmFqYXhSZXF1ZXN0Lm9uZXJyb3I9ZnVuY3Rpb24oKXthLm9uRXJyb3IoKX0sdGhpcy5hamF4UmVxdWVzdC5vbnRpbWVvdXQ9ZnVuY3Rpb24oKXthLm9uRXJyb3IoKX0sdGhpcy5hamF4UmVxdWVzdC5vbnByb2dyZXNzPWZ1bmN0aW9uKCl7fSk6dGhpcy5hamF4UmVxdWVzdD13aW5kb3cuWE1MSHR0cFJlcXVlc3Q/bmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDpuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKSx0aGlzLmFqYXhSZXF1ZXN0Lm9ubG9hZD1mdW5jdGlvbigpe2Eub25KU09OTG9hZGVkKCl9LHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIkdFVFwiLHRoaXMudXJsLCEwKSx0aGlzLmFqYXhSZXF1ZXN0LnNlbmQoKX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5vbkpTT05Mb2FkZWQ9ZnVuY3Rpb24oKXtpZighdGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQpcmV0dXJuIHRoaXMub25FcnJvcigpLHZvaWQgMDtpZih0aGlzLmpzb249SlNPTi5wYXJzZSh0aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dCksdGhpcy5qc29uLmZyYW1lcyl7dmFyIGE9dGhpcyxjPXRoaXMuYmFzZVVybCt0aGlzLmpzb24ubWV0YS5pbWFnZSxkPW5ldyBiLkltYWdlTG9hZGVyKGMsdGhpcy5jcm9zc29yaWdpbiksZT10aGlzLmpzb24uZnJhbWVzO3RoaXMudGV4dHVyZT1kLnRleHR1cmUuYmFzZVRleHR1cmUsZC5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXthLm9uTG9hZGVkKCl9KTtmb3IodmFyIGcgaW4gZSl7dmFyIGg9ZVtnXS5mcmFtZTtpZihoJiYoYi5UZXh0dXJlQ2FjaGVbZ109bmV3IGIuVGV4dHVyZSh0aGlzLnRleHR1cmUse3g6aC54LHk6aC55LHdpZHRoOmgudyxoZWlnaHQ6aC5ofSksYi5UZXh0dXJlQ2FjaGVbZ10uY3JvcD1uZXcgYi5SZWN0YW5nbGUoaC54LGgueSxoLncsaC5oKSxlW2ddLnRyaW1tZWQpKXt2YXIgaT1lW2ddLnNvdXJjZVNpemUsaj1lW2ddLnNwcml0ZVNvdXJjZVNpemU7Yi5UZXh0dXJlQ2FjaGVbZ10udHJpbT1uZXcgYi5SZWN0YW5nbGUoai54LGoueSxpLncsaS5oKX19ZC5sb2FkKCl9ZWxzZSBpZih0aGlzLmpzb24uYm9uZXMpe3ZhciBrPW5ldyBmLlNrZWxldG9uSnNvbixsPWsucmVhZFNrZWxldG9uRGF0YSh0aGlzLmpzb24pO2IuQW5pbUNhY2hlW3RoaXMudXJsXT1sLHRoaXMub25Mb2FkZWQoKX1lbHNlIHRoaXMub25Mb2FkZWQoKX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMubG9hZGVkPSEwLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkpzb25Mb2FkZXIucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJlcnJvclwiLGNvbnRlbnQ6dGhpc30pfSxiLkF0bGFzTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5iYXNlVXJsPWEucmVwbGFjZSgvW15cXC9dKiQvLFwiXCIpLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmxvYWRlZD0hMX0sYi5BdGxhc0xvYWRlci5jb25zdHJ1Y3Rvcj1iLkF0bGFzTG9hZGVyLGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt0aGlzLmFqYXhSZXF1ZXN0PW5ldyBiLkFqYXhSZXF1ZXN0LHRoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPXRoaXMub25BdGxhc0xvYWRlZC5iaW5kKHRoaXMpLHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIkdFVFwiLHRoaXMudXJsLCEwKSx0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUmJnRoaXMuYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShcImFwcGxpY2F0aW9uL2pzb25cIiksdGhpcy5hamF4UmVxdWVzdC5zZW5kKG51bGwpfSxiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5vbkF0bGFzTG9hZGVkPWZ1bmN0aW9uKCl7aWYoND09PXRoaXMuYWpheFJlcXVlc3QucmVhZHlTdGF0ZSlpZigyMDA9PT10aGlzLmFqYXhSZXF1ZXN0LnN0YXR1c3x8LTE9PT13aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKFwiaHR0cFwiKSl7dGhpcy5hdGxhcz17bWV0YTp7aW1hZ2U6W119LGZyYW1lczpbXX07dmFyIGE9dGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQuc3BsaXQoL1xccj9cXG4vKSxjPS0zLGQ9MCxlPW51bGwsZj0hMSxnPTAsaD0wLGk9dGhpcy5vbkxvYWRlZC5iaW5kKHRoaXMpO2ZvcihnPTA7ZzxhLmxlbmd0aDtnKyspaWYoYVtnXT1hW2ddLnJlcGxhY2UoL15cXHMrfFxccyskL2csXCJcIiksXCJcIj09PWFbZ10mJihmPWcrMSksYVtnXS5sZW5ndGg+MCl7aWYoZj09PWcpdGhpcy5hdGxhcy5tZXRhLmltYWdlLnB1c2goYVtnXSksZD10aGlzLmF0bGFzLm1ldGEuaW1hZ2UubGVuZ3RoLTEsdGhpcy5hdGxhcy5mcmFtZXMucHVzaCh7fSksYz0tMztlbHNlIGlmKGM+MClpZihjJTc9PT0xKW51bGwhPWUmJih0aGlzLmF0bGFzLmZyYW1lc1tkXVtlLm5hbWVdPWUpLGU9e25hbWU6YVtnXSxmcmFtZTp7fX07ZWxzZXt2YXIgaj1hW2ddLnNwbGl0KFwiIFwiKTtpZihjJTc9PT0zKWUuZnJhbWUueD1OdW1iZXIoalsxXS5yZXBsYWNlKFwiLFwiLFwiXCIpKSxlLmZyYW1lLnk9TnVtYmVyKGpbMl0pO2Vsc2UgaWYoYyU3PT09NCllLmZyYW1lLnc9TnVtYmVyKGpbMV0ucmVwbGFjZShcIixcIixcIlwiKSksZS5mcmFtZS5oPU51bWJlcihqWzJdKTtlbHNlIGlmKGMlNz09PTUpe3ZhciBrPXt4OjAseTowLHc6TnVtYmVyKGpbMV0ucmVwbGFjZShcIixcIixcIlwiKSksaDpOdW1iZXIoalsyXSl9O2sudz5lLmZyYW1lLnd8fGsuaD5lLmZyYW1lLmg/KGUudHJpbW1lZD0hMCxlLnJlYWxTaXplPWspOmUudHJpbW1lZD0hMX19YysrfWlmKG51bGwhPWUmJih0aGlzLmF0bGFzLmZyYW1lc1tkXVtlLm5hbWVdPWUpLHRoaXMuYXRsYXMubWV0YS5pbWFnZS5sZW5ndGg+MCl7Zm9yKHRoaXMuaW1hZ2VzPVtdLGg9MDtoPHRoaXMuYXRsYXMubWV0YS5pbWFnZS5sZW5ndGg7aCsrKXt2YXIgbD10aGlzLmJhc2VVcmwrdGhpcy5hdGxhcy5tZXRhLmltYWdlW2hdLG09dGhpcy5hdGxhcy5mcmFtZXNbaF07dGhpcy5pbWFnZXMucHVzaChuZXcgYi5JbWFnZUxvYWRlcihsLHRoaXMuY3Jvc3NvcmlnaW4pKTtmb3IoZyBpbiBtKXt2YXIgbj1tW2ddLmZyYW1lO24mJihiLlRleHR1cmVDYWNoZVtnXT1uZXcgYi5UZXh0dXJlKHRoaXMuaW1hZ2VzW2hdLnRleHR1cmUuYmFzZVRleHR1cmUse3g6bi54LHk6bi55LHdpZHRoOm4udyxoZWlnaHQ6bi5ofSksbVtnXS50cmltbWVkJiYoYi5UZXh0dXJlQ2FjaGVbZ10ucmVhbFNpemU9bVtnXS5yZWFsU2l6ZSxiLlRleHR1cmVDYWNoZVtnXS50cmltLng9MCxiLlRleHR1cmVDYWNoZVtnXS50cmltLnk9MCkpfX1mb3IodGhpcy5jdXJyZW50SW1hZ2VJZD0wLGg9MDtoPHRoaXMuaW1hZ2VzLmxlbmd0aDtoKyspdGhpcy5pbWFnZXNbaF0uYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGkpO3RoaXMuaW1hZ2VzW3RoaXMuY3VycmVudEltYWdlSWRdLmxvYWQoKX1lbHNlIHRoaXMub25Mb2FkZWQoKX1lbHNlIHRoaXMub25FcnJvcigpfSxiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuaW1hZ2VzLmxlbmd0aC0xPnRoaXMuY3VycmVudEltYWdlSWQ/KHRoaXMuY3VycmVudEltYWdlSWQrKyx0aGlzLmltYWdlc1t0aGlzLmN1cnJlbnRJbWFnZUlkXS5sb2FkKCkpOih0aGlzLmxvYWRlZD0hMCx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KSl9LGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJlcnJvclwiLGNvbnRlbnQ6dGhpc30pfSxiLlNwcml0ZVNoZWV0TG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLnRleHR1cmU9bnVsbCx0aGlzLmZyYW1lcz17fX0sYi5TcHJpdGVTaGVldExvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcHJpdGVTaGVldExvYWRlcixiLlNwcml0ZVNoZWV0TG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxjPW5ldyBiLkpzb25Mb2FkZXIodGhpcy51cmwsdGhpcy5jcm9zc29yaWdpbik7Yy5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oYil7YS5qc29uPWIuY29udGVudC5qc29uLGEub25Mb2FkZWQoKX0pLGMubG9hZCgpfSxiLlNwcml0ZVNoZWV0TG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkltYWdlTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZT1iLlRleHR1cmUuZnJvbUltYWdlKGEsYyksdGhpcy5mcmFtZXM9W119LGIuSW1hZ2VMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW1hZ2VMb2FkZXIsYi5JbWFnZUxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe2lmKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpdGhpcy5vbkxvYWRlZCgpO2Vsc2V7dmFyIGE9dGhpczt0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7YS5vbkxvYWRlZCgpfSl9fSxiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5sb2FkRnJhbWVkU3ByaXRlU2hlZXQ9ZnVuY3Rpb24oYSxjLGQpe3RoaXMuZnJhbWVzPVtdO2Zvcih2YXIgZT1NYXRoLmZsb29yKHRoaXMudGV4dHVyZS53aWR0aC9hKSxmPU1hdGguZmxvb3IodGhpcy50ZXh0dXJlLmhlaWdodC9jKSxnPTAsaD0wO2Y+aDtoKyspZm9yKHZhciBpPTA7ZT5pO2krKyxnKyspe3ZhciBqPW5ldyBiLlRleHR1cmUodGhpcy50ZXh0dXJlLHt4OmkqYSx5OmgqYyx3aWR0aDphLGhlaWdodDpjfSk7dGhpcy5mcmFtZXMucHVzaChqKSxkJiYoYi5UZXh0dXJlQ2FjaGVbZCtcIi1cIitnXT1qKX1pZih0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuaGFzTG9hZGVkKXRoaXMub25Mb2FkZWQoKTtlbHNle3ZhciBrPXRoaXM7dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe2sub25Mb2FkZWQoKX0pfX0sYi5CaXRtYXBGb250TG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLnRleHR1cmU9bnVsbH0sYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJpdG1hcEZvbnRMb2FkZXIsYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dGhpcy5hamF4UmVxdWVzdD1uZXcgYi5BamF4UmVxdWVzdDt2YXIgYT10aGlzO3RoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPWZ1bmN0aW9uKCl7YS5vblhNTExvYWRlZCgpfSx0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oXCJHRVRcIix0aGlzLnVybCwhMCksdGhpcy5hamF4UmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlJiZ0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUoXCJhcHBsaWNhdGlvbi94bWxcIiksdGhpcy5hamF4UmVxdWVzdC5zZW5kKG51bGwpfSxiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLm9uWE1MTG9hZGVkPWZ1bmN0aW9uKCl7aWYoND09PXRoaXMuYWpheFJlcXVlc3QucmVhZHlTdGF0ZSYmKDIwMD09PXRoaXMuYWpheFJlcXVlc3Quc3RhdHVzfHwtMT09PXdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbC5pbmRleE9mKFwiaHR0cFwiKSkpe3ZhciBhPXRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VYTUw7aWYoIWF8fC9NU0lFIDkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpfHxuYXZpZ2F0b3IuaXNDb2Nvb25KUylpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB3aW5kb3cuRE9NUGFyc2VyKXt2YXIgYz1uZXcgRE9NUGFyc2VyO2E9Yy5wYXJzZUZyb21TdHJpbmcodGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQsXCJ0ZXh0L3htbFwiKX1lbHNle3ZhciBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7ZC5pbm5lckhUTUw9dGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQsYT1kfXZhciBlPXRoaXMuYmFzZVVybCthLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicGFnZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJmaWxlXCIpLGY9bmV3IGIuSW1hZ2VMb2FkZXIoZSx0aGlzLmNyb3Nzb3JpZ2luKTt0aGlzLnRleHR1cmU9Zi50ZXh0dXJlLmJhc2VUZXh0dXJlO3ZhciBnPXt9LGg9YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImluZm9cIilbMF0saT1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY29tbW9uXCIpWzBdO2cuZm9udD1oLmdldEF0dHJpYnV0ZShcImZhY2VcIiksZy5zaXplPXBhcnNlSW50KGguZ2V0QXR0cmlidXRlKFwic2l6ZVwiKSwxMCksZy5saW5lSGVpZ2h0PXBhcnNlSW50KGkuZ2V0QXR0cmlidXRlKFwibGluZUhlaWdodFwiKSwxMCksZy5jaGFycz17fTtmb3IodmFyIGo9YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNoYXJcIiksaz0wO2s8ai5sZW5ndGg7aysrKXt2YXIgbD1wYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcImlkXCIpLDEwKSxtPW5ldyBiLlJlY3RhbmdsZShwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInhcIiksMTApLHBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieVwiKSwxMCkscGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiKSwxMCkscGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiksMTApKTtnLmNoYXJzW2xdPXt4T2Zmc2V0OnBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieG9mZnNldFwiKSwxMCkseU9mZnNldDpwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInlvZmZzZXRcIiksMTApLHhBZHZhbmNlOnBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieGFkdmFuY2VcIiksMTApLGtlcm5pbmc6e30sdGV4dHVyZTpiLlRleHR1cmVDYWNoZVtsXT1uZXcgYi5UZXh0dXJlKHRoaXMudGV4dHVyZSxtKX19dmFyIG49YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImtlcm5pbmdcIik7Zm9yKGs9MDtrPG4ubGVuZ3RoO2srKyl7dmFyIG89cGFyc2VJbnQobltrXS5nZXRBdHRyaWJ1dGUoXCJmaXJzdFwiKSwxMCkscD1wYXJzZUludChuW2tdLmdldEF0dHJpYnV0ZShcInNlY29uZFwiKSwxMCkscT1wYXJzZUludChuW2tdLmdldEF0dHJpYnV0ZShcImFtb3VudFwiKSwxMCk7Zy5jaGFyc1twXS5rZXJuaW5nW29dPXF9Yi5CaXRtYXBUZXh0LmZvbnRzW2cuZm9udF09Zzt2YXIgcj10aGlzO2YuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7ci5vbkxvYWRlZCgpfSksZi5sb2FkKCl9fSxiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuU3BpbmVMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5sb2FkZWQ9ITF9LGIuU3BpbmVMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3BpbmVMb2FkZXIsYi5TcGluZUxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYz1uZXcgYi5Kc29uTG9hZGVyKHRoaXMudXJsLHRoaXMuY3Jvc3NvcmlnaW4pO1xyXG5jLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbihiKXthLmpzb249Yi5jb250ZW50Lmpzb24sYS5vbkxvYWRlZCgpfSksYy5sb2FkKCl9LGIuU3BpbmVMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5sb2FkZWQ9ITAsdGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuQWJzdHJhY3RGaWx0ZXI9ZnVuY3Rpb24oYSxiKXt0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy5zaGFkZXJzPVtdLHRoaXMuZGlydHk9ITAsdGhpcy5wYWRkaW5nPTAsdGhpcy51bmlmb3Jtcz1ifHx7fSx0aGlzLmZyYWdtZW50U3JjPWF8fFtdfSxiLkFscGhhTWFza0ZpbHRlcj1mdW5jdGlvbihhKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLGEuYmFzZVRleHR1cmUuX3Bvd2VyT2YyPSEwLHRoaXMudW5pZm9ybXM9e21hc2s6e3R5cGU6XCJzYW1wbGVyMkRcIix2YWx1ZTphfSxtYXBEaW1lbnNpb25zOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoxLHk6NTExMn19LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpbMCwwLDAsMF19fSxhLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD8odGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLng9YS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hc2sudmFsdWUueT1hLmhlaWdodCk6KHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbj10aGlzLm9uVGV4dHVyZUxvYWRlZC5iaW5kKHRoaXMpLGEuYmFzZVRleHR1cmUub24oXCJsb2FkZWRcIix0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb24pKSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgbWFzaztcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldDtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSB2ZWMyIG1hcERpbWVuc2lvbnM7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiBtYXBDb3JkcyA9IHZUZXh0dXJlQ29vcmQueHk7XCIsXCIgICBtYXBDb3JkcyArPSAoZGltZW5zaW9ucy56dyArIG9mZnNldCkvIGRpbWVuc2lvbnMueHkgO1wiLFwiICAgbWFwQ29yZHMueSAqPSAtMS4wO1wiLFwiICAgbWFwQ29yZHMueSArPSAxLjA7XCIsXCIgICBtYXBDb3JkcyAqPSBkaW1lbnNpb25zLnh5IC8gbWFwRGltZW5zaW9ucztcIixcIiAgIHZlYzQgb3JpZ2luYWwgPSAgdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGZsb2F0IG1hc2tBbHBoYSA9ICB0ZXh0dXJlMkQobWFzaywgbWFwQ29yZHMpLnI7XCIsXCIgICBvcmlnaW5hbCAqPSBtYXNrQWxwaGE7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSAgb3JpZ2luYWw7XCIsXCJ9XCJdfSxiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5BbHBoYU1hc2tGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQWxwaGFNYXNrRmlsdGVyLGIuQWxwaGFNYXNrRmlsdGVyLnByb3RvdHlwZS5vblRleHR1cmVMb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueD10aGlzLnVuaWZvcm1zLm1hc2sudmFsdWUud2lkdGgsdGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLnk9dGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLmhlaWdodCx0aGlzLnVuaWZvcm1zLm1hc2sudmFsdWUuYmFzZVRleHR1cmUub2ZmKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQWxwaGFNYXNrRmlsdGVyLnByb3RvdHlwZSxcIm1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlPWF9fSksYi5Db2xvck1hdHJpeEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17bWF0cml4Ont0eXBlOlwibWF0NFwiLHZhbHVlOlsxLDAsMCwwLDAsMSwwLDAsMCwwLDEsMCwwLDAsMCwxXX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGludmVydDtcIixcInVuaWZvcm0gbWF0NCBtYXRyaXg7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpICogbWF0cml4O1wiLFwifVwiXX0sYi5Db2xvck1hdHJpeEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Db2xvck1hdHJpeEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Db2xvck1hdHJpeEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Db2xvck1hdHJpeEZpbHRlci5wcm90b3R5cGUsXCJtYXRyaXhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMubWF0cml4LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5tYXRyaXgudmFsdWU9YX19KSxiLkdyYXlGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2dyYXk6e3R5cGU6XCIxZlwiLHZhbHVlOjF9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IGdyYXk7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGdsX0ZyYWdDb2xvci5yZ2IgPSBtaXgoZ2xfRnJhZ0NvbG9yLnJnYiwgdmVjMygwLjIxMjYqZ2xfRnJhZ0NvbG9yLnIgKyAwLjcxNTIqZ2xfRnJhZ0NvbG9yLmcgKyAwLjA3MjIqZ2xfRnJhZ0NvbG9yLmIpLCBncmF5KTtcIixcIn1cIl19LGIuR3JheUZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5HcmF5RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkdyYXlGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuR3JheUZpbHRlci5wcm90b3R5cGUsXCJncmF5XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmdyYXkudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmdyYXkudmFsdWU9YX19KSxiLkRpc3BsYWNlbWVudEZpbHRlcj1mdW5jdGlvbihhKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLGEuYmFzZVRleHR1cmUuX3Bvd2VyT2YyPSEwLHRoaXMudW5pZm9ybXM9e2Rpc3BsYWNlbWVudE1hcDp7dHlwZTpcInNhbXBsZXIyRFwiLHZhbHVlOmF9LHNjYWxlOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDozMCx5OjMwfX0sb2Zmc2V0Ont0eXBlOlwiMmZcIix2YWx1ZTp7eDowLHk6MH19LG1hcERpbWVuc2lvbnM6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjEseTo1MTEyfX0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOlswLDAsMCwwXX19LGEuYmFzZVRleHR1cmUuaGFzTG9hZGVkPyh0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueD1hLndpZHRoLHRoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS55PWEuaGVpZ2h0KToodGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uPXRoaXMub25UZXh0dXJlTG9hZGVkLmJpbmQodGhpcyksYS5iYXNlVGV4dHVyZS5vbihcImxvYWRlZFwiLHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbikpLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCBkaXNwbGFjZW1lbnRNYXA7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gdmVjMiBzY2FsZTtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXQ7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gdmVjMiBtYXBEaW1lbnNpb25zO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgbWFwQ29yZHMgPSB2VGV4dHVyZUNvb3JkLnh5O1wiLFwiICAgbWFwQ29yZHMgKz0gKGRpbWVuc2lvbnMuencgKyBvZmZzZXQpLyBkaW1lbnNpb25zLnh5IDtcIixcIiAgIG1hcENvcmRzLnkgKj0gLTEuMDtcIixcIiAgIG1hcENvcmRzLnkgKz0gMS4wO1wiLFwiICAgdmVjMiBtYXRTYW1wbGUgPSB0ZXh0dXJlMkQoZGlzcGxhY2VtZW50TWFwLCBtYXBDb3JkcykueHk7XCIsXCIgICBtYXRTYW1wbGUgLT0gMC41O1wiLFwiICAgbWF0U2FtcGxlICo9IHNjYWxlO1wiLFwiICAgbWF0U2FtcGxlIC89IG1hcERpbWVuc2lvbnM7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgbWF0U2FtcGxlLngsIHZUZXh0dXJlQ29vcmQueSArIG1hdFNhbXBsZS55KSk7XCIsXCIgICBnbF9GcmFnQ29sb3IucmdiID0gbWl4KCBnbF9GcmFnQ29sb3IucmdiLCBnbF9GcmFnQ29sb3IucmdiLCAxLjApO1wiLFwiICAgdmVjMiBjb3JkID0gdlRleHR1cmVDb29yZDtcIixcIn1cIl19LGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5EaXNwbGFjZW1lbnRGaWx0ZXIsYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLm9uVGV4dHVyZUxvYWRlZD1mdW5jdGlvbigpe3RoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS54PXRoaXMudW5pZm9ybXMuZGlzcGxhY2VtZW50TWFwLnZhbHVlLndpZHRoLHRoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS55PXRoaXMudW5pZm9ybXMuZGlzcGxhY2VtZW50TWFwLnZhbHVlLmhlaWdodCx0aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZS5iYXNlVGV4dHVyZS5vZmYoXCJsb2FkZWRcIix0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb24pfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLFwibWFwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuZGlzcGxhY2VtZW50TWFwLnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZSxcInNjYWxlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5zY2FsZS52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUsXCJvZmZzZXRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMub2Zmc2V0LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5vZmZzZXQudmFsdWU9YX19KSxiLlBpeGVsYXRlRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtpbnZlcnQ6e3R5cGU6XCIxZlwiLHZhbHVlOjB9LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpuZXcgRmxvYXQzMkFycmF5KFsxZTQsMTAwLDEwLDEwXSl9LHBpeGVsU2l6ZTp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MTAseToxMH19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSB2ZWMyIHRlc3REaW07XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gdmVjMiBwaXhlbFNpemU7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIGNvb3JkID0gdlRleHR1cmVDb29yZDtcIixcIiAgIHZlYzIgc2l6ZSA9IGRpbWVuc2lvbnMueHkvcGl4ZWxTaXplO1wiLFwiICAgdmVjMiBjb2xvciA9IGZsb29yKCAoIHZUZXh0dXJlQ29vcmQgKiBzaXplICkgKSAvIHNpemUgKyBwaXhlbFNpemUvZGltZW5zaW9ucy54eSAqIDAuNTtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgY29sb3IpO1wiLFwifVwiXX0sYi5QaXhlbGF0ZUZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5QaXhlbGF0ZUZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5QaXhlbGF0ZUZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5QaXhlbGF0ZUZpbHRlci5wcm90b3R5cGUsXCJzaXplXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnBpeGVsU2l6ZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5waXhlbFNpemUudmFsdWU9YX19KSxiLkJsdXJYRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtibHVyOnt0eXBlOlwiMWZcIix2YWx1ZToxLzUxMn19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGJsdXI7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWM0IHN1bSA9IHZlYzQoMC4wKTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54IC0gNC4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54IC0gMy4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wOTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54IC0gMi4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xMjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54IC0gYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjE1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjE1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggKyAyLjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjEyO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggKyAzLjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjA5O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggKyA0LjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjA1O1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gc3VtO1wiLFwifVwiXX0sYi5CbHVyWEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5CbHVyWEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CbHVyWEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyWEZpbHRlci5wcm90b3R5cGUsXCJibHVyXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWUvKDEvN2UzKX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlPTEvN2UzKmF9fSksYi5CbHVyWUZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17Ymx1cjp7dHlwZTpcIjFmXCIsdmFsdWU6MS81MTJ9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBibHVyO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjNCBzdW0gPSB2ZWM0KDAuMCk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55IC0gNC4wKmJsdXIpKSAqIDAuMDU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55IC0gMy4wKmJsdXIpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55IC0gMi4wKmJsdXIpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55IC0gYmx1cikpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTY7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgYmx1cikpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgKyAyLjAqYmx1cikpICogMC4xMjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgKyAzLjAqYmx1cikpICogMC4wOTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgKyA0LjAqYmx1cikpICogMC4wNTtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHN1bTtcIixcIn1cIl19LGIuQmx1cllGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQmx1cllGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmx1cllGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1cllGaWx0ZXIucHJvdG90eXBlLFwiYmx1clwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWU9MS83ZTMqYX19KSxiLkJsdXJGaWx0ZXI9ZnVuY3Rpb24oKXt0aGlzLmJsdXJYRmlsdGVyPW5ldyBiLkJsdXJYRmlsdGVyLHRoaXMuYmx1cllGaWx0ZXI9bmV3IGIuQmx1cllGaWx0ZXIsdGhpcy5wYXNzZXM9W3RoaXMuYmx1clhGaWx0ZXIsdGhpcy5ibHVyWUZpbHRlcl19LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJGaWx0ZXIucHJvdG90eXBlLFwiYmx1clwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ibHVyWEZpbHRlci5ibHVyfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5ibHVyWEZpbHRlci5ibHVyPXRoaXMuYmx1cllGaWx0ZXIuYmx1cj1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJGaWx0ZXIucHJvdG90eXBlLFwiYmx1clhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYmx1clhGaWx0ZXIuYmx1cn0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuYmx1clhGaWx0ZXIuYmx1cj1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJGaWx0ZXIucHJvdG90eXBlLFwiYmx1cllcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYmx1cllGaWx0ZXIuYmx1cn0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuYmx1cllGaWx0ZXIuYmx1cj1hfX0pLGIuSW52ZXJ0RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtpbnZlcnQ6e3R5cGU6XCIxZlwiLHZhbHVlOjF9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBpbnZlcnQ7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peCggKHZlYzMoMSktZ2xfRnJhZ0NvbG9yLnJnYikgKiBnbF9GcmFnQ29sb3IuYSwgZ2xfRnJhZ0NvbG9yLnJnYiwgMS4wIC0gaW52ZXJ0KTtcIixcIn1cIl19LGIuSW52ZXJ0RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkludmVydEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5JbnZlcnRGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuSW52ZXJ0RmlsdGVyLnByb3RvdHlwZSxcImludmVydFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5pbnZlcnQudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmludmVydC52YWx1ZT1hfX0pLGIuU2VwaWFGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3NlcGlhOnt0eXBlOlwiMWZcIix2YWx1ZToxfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgc2VwaWE7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcImNvbnN0IG1hdDMgc2VwaWFNYXRyaXggPSBtYXQzKDAuMzU4OCwgMC43MDQ0LCAwLjEzNjgsIDAuMjk5MCwgMC41ODcwLCAwLjExNDAsIDAuMjM5MiwgMC40Njk2LCAwLjA5MTIpO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBnbF9GcmFnQ29sb3IucmdiID0gbWl4KCBnbF9GcmFnQ29sb3IucmdiLCBnbF9GcmFnQ29sb3IucmdiICogc2VwaWFNYXRyaXgsIHNlcGlhKTtcIixcIn1cIl19LGIuU2VwaWFGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuU2VwaWFGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU2VwaWFGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuU2VwaWFGaWx0ZXIucHJvdG90eXBlLFwic2VwaWFcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuc2VwaWEudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLnNlcGlhLnZhbHVlPWF9fSksYi5Ud2lzdEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17cmFkaXVzOnt0eXBlOlwiMWZcIix2YWx1ZTouNX0sYW5nbGU6e3R5cGU6XCIxZlwiLHZhbHVlOjV9LG9mZnNldDp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6LjUseTouNX19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gZmxvYXQgcmFkaXVzO1wiLFwidW5pZm9ybSBmbG9hdCBhbmdsZTtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXQ7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiBjb29yZCA9IHZUZXh0dXJlQ29vcmQgLSBvZmZzZXQ7XCIsXCIgICBmbG9hdCBkaXN0YW5jZSA9IGxlbmd0aChjb29yZCk7XCIsXCIgICBpZiAoZGlzdGFuY2UgPCByYWRpdXMpIHtcIixcIiAgICAgICBmbG9hdCByYXRpbyA9IChyYWRpdXMgLSBkaXN0YW5jZSkgLyByYWRpdXM7XCIsXCIgICAgICAgZmxvYXQgYW5nbGVNb2QgPSByYXRpbyAqIHJhdGlvICogYW5nbGU7XCIsXCIgICAgICAgZmxvYXQgcyA9IHNpbihhbmdsZU1vZCk7XCIsXCIgICAgICAgZmxvYXQgYyA9IGNvcyhhbmdsZU1vZCk7XCIsXCIgICAgICAgY29vcmQgPSB2ZWMyKGNvb3JkLnggKiBjIC0gY29vcmQueSAqIHMsIGNvb3JkLnggKiBzICsgY29vcmQueSAqIGMpO1wiLFwiICAgfVwiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCBjb29yZCtvZmZzZXQpO1wiLFwifVwiXX0sYi5Ud2lzdEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Ud2lzdEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Ud2lzdEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Ud2lzdEZpbHRlci5wcm90b3R5cGUsXCJvZmZzZXRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMub2Zmc2V0LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlR3aXN0RmlsdGVyLnByb3RvdHlwZSxcInJhZGl1c1wiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5yYWRpdXMudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMucmFkaXVzLnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLFwiYW5nbGVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYW5nbGUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMuYW5nbGUudmFsdWU9YX19KSxiLkNvbG9yU3RlcEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17c3RlcDp7dHlwZTpcIjFmXCIsdmFsdWU6NX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gZmxvYXQgc3RlcDtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWM0IGNvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGNvbG9yID0gZmxvb3IoY29sb3IgKiBzdGVwKSAvIHN0ZXA7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSBjb2xvcjtcIixcIn1cIl19LGIuQ29sb3JTdGVwRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkNvbG9yU3RlcEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Db2xvclN0ZXBGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQ29sb3JTdGVwRmlsdGVyLnByb3RvdHlwZSxcInN0ZXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuc3RlcC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuc3RlcC52YWx1ZT1hfX0pLGIuRG90U2NyZWVuRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtzY2FsZTp7dHlwZTpcIjFmXCIsdmFsdWU6MX0sYW5nbGU6e3R5cGU6XCIxZlwiLHZhbHVlOjV9LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpbMCwwLDAsMF19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gZmxvYXQgYW5nbGU7XCIsXCJ1bmlmb3JtIGZsb2F0IHNjYWxlO1wiLFwiZmxvYXQgcGF0dGVybigpIHtcIixcIiAgIGZsb2F0IHMgPSBzaW4oYW5nbGUpLCBjID0gY29zKGFuZ2xlKTtcIixcIiAgIHZlYzIgdGV4ID0gdlRleHR1cmVDb29yZCAqIGRpbWVuc2lvbnMueHk7XCIsXCIgICB2ZWMyIHBvaW50ID0gdmVjMihcIixcIiAgICAgICBjICogdGV4LnggLSBzICogdGV4LnksXCIsXCIgICAgICAgcyAqIHRleC54ICsgYyAqIHRleC55XCIsXCIgICApICogc2NhbGU7XCIsXCIgICByZXR1cm4gKHNpbihwb2ludC54KSAqIHNpbihwb2ludC55KSkgKiA0LjA7XCIsXCJ9XCIsXCJ2b2lkIG1haW4oKSB7XCIsXCIgICB2ZWM0IGNvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGZsb2F0IGF2ZXJhZ2UgPSAoY29sb3IuciArIGNvbG9yLmcgKyBjb2xvci5iKSAvIDMuMDtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHZlYzQodmVjMyhhdmVyYWdlICogMTAuMCAtIDUuMCArIHBhdHRlcm4oKSksIGNvbG9yLmEpO1wiLFwifVwiXX0sYi5Eb3RTY3JlZW5GaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRvdFNjcmVlbkZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Eb3RTY3JlZW5GaWx0ZXIucHJvdG90eXBlLFwic2NhbGVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuc2NhbGUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMuc2NhbGUudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Eb3RTY3JlZW5GaWx0ZXIucHJvdG90eXBlLFwiYW5nbGVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYW5nbGUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMuYW5nbGUudmFsdWU9YX19KSxiLkNyb3NzSGF0Y2hGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2JsdXI6e3R5cGU6XCIxZlwiLHZhbHVlOjEvNTEyfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgYmx1cjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgICBmbG9hdCBsdW0gPSBsZW5ndGgodGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkLnh5KS5yZ2IpO1wiLFwiICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMS4wLCAxLjAsIDEuMCwgMS4wKTtcIixcIiAgICBpZiAobHVtIDwgMS4wMCkge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54ICsgZ2xfRnJhZ0Nvb3JkLnksIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwiICAgIGlmIChsdW0gPCAwLjc1KSB7XCIsXCIgICAgICAgIGlmIChtb2QoZ2xfRnJhZ0Nvb3JkLnggLSBnbF9GcmFnQ29vcmQueSwgMTAuMCkgPT0gMC4wKSB7XCIsXCIgICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAuMCwgMC4wLCAwLjAsIDEuMCk7XCIsXCIgICAgICAgIH1cIixcIiAgICB9XCIsXCIgICAgaWYgKGx1bSA8IDAuNTApIHtcIixcIiAgICAgICAgaWYgKG1vZChnbF9GcmFnQ29vcmQueCArIGdsX0ZyYWdDb29yZC55IC0gNS4wLCAxMC4wKSA9PSAwLjApIHtcIixcIiAgICAgICAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMS4wKTtcIixcIiAgICAgICAgfVwiLFwiICAgIH1cIixcIiAgICBpZiAobHVtIDwgMC4zKSB7XCIsXCIgICAgICAgIGlmIChtb2QoZ2xfRnJhZ0Nvb3JkLnggLSBnbF9GcmFnQ29vcmQueSAtIDUuMCwgMTAuMCkgPT0gMC4wKSB7XCIsXCIgICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAuMCwgMC4wLCAwLjAsIDEuMCk7XCIsXCIgICAgICAgIH1cIixcIiAgICB9XCIsXCJ9XCJdfSxiLkNyb3NzSGF0Y2hGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQ3Jvc3NIYXRjaEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CbHVyWUZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Dcm9zc0hhdGNoRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZS8oMS83ZTMpfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlPTEvN2UzKmF9fSksYi5SR0JTcGxpdEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17cmVkOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoyMCx5OjIwfX0sZ3JlZW46e3R5cGU6XCIyZlwiLHZhbHVlOnt4Oi0yMCx5OjIwfX0sYmx1ZTp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MjAseTotMjB9fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjMiByZWQ7XCIsXCJ1bmlmb3JtIHZlYzIgZ3JlZW47XCIsXCJ1bmlmb3JtIHZlYzIgYmx1ZTtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnIgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQgKyByZWQvZGltZW5zaW9ucy54eSkucjtcIixcIiAgIGdsX0ZyYWdDb2xvci5nID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkICsgZ3JlZW4vZGltZW5zaW9ucy54eSkuZztcIixcIiAgIGdsX0ZyYWdDb2xvci5iID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkICsgYmx1ZS9kaW1lbnNpb25zLnh5KS5iO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLmEgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpLmE7XCIsXCJ9XCJdfSxiLlJHQlNwbGl0RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLlJHQlNwbGl0RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlJHQlNwbGl0RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlJHQlNwbGl0RmlsdGVyLnByb3RvdHlwZSxcImFuZ2xlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWUvKDEvN2UzKX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBleHBvcnRzPyhcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cyYmKGV4cG9ydHM9bW9kdWxlLmV4cG9ydHM9YiksZXhwb3J0cy5QSVhJPWIpOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGIpOmEuUElYST1ifSkuY2FsbCh0aGlzKTsiLCIvKipcbiAqIFR3ZWVuLmpzIC0gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc29sZS90d2Vlbi5qc1xuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vc29sZS90d2Vlbi5qcy9ncmFwaHMvY29udHJpYnV0b3JzIGZvciB0aGUgZnVsbCBsaXN0IG9mIGNvbnRyaWJ1dG9ycy5cbiAqIFRoYW5rIHlvdSBhbGwsIHlvdSdyZSBhd2Vzb21lIVxuICovXG5cbi8vIERhdGUubm93IHNoaW0gZm9yIChhaGVtKSBJbnRlcm5ldCBFeHBsbyhkfHIpZXJcbmlmICggRGF0ZS5ub3cgPT09IHVuZGVmaW5lZCApIHtcblxuXHREYXRlLm5vdyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBuZXcgRGF0ZSgpLnZhbHVlT2YoKTtcblxuXHR9O1xuXG59XG5cbnZhciBUV0VFTiA9IFRXRUVOIHx8ICggZnVuY3Rpb24gKCkge1xuXG5cdHZhciBfdHdlZW5zID0gW107XG5cblx0cmV0dXJuIHtcblxuXHRcdFJFVklTSU9OOiAnMTQnLFxuXG5cdFx0Z2V0QWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHJldHVybiBfdHdlZW5zO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZUFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRfdHdlZW5zID0gW107XG5cblx0XHR9LFxuXG5cdFx0YWRkOiBmdW5jdGlvbiAoIHR3ZWVuICkge1xuXG5cdFx0XHRfdHdlZW5zLnB1c2goIHR3ZWVuICk7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbiAoIHR3ZWVuICkge1xuXG5cdFx0XHR2YXIgaSA9IF90d2VlbnMuaW5kZXhPZiggdHdlZW4gKTtcblxuXHRcdFx0aWYgKCBpICE9PSAtMSApIHtcblxuXHRcdFx0XHRfdHdlZW5zLnNwbGljZSggaSwgMSApO1xuXG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAoIHRpbWUgKSB7XG5cblx0XHRcdGlmICggX3R3ZWVucy5sZW5ndGggPT09IDAgKSByZXR1cm4gZmFsc2U7XG5cblx0XHRcdHZhciBpID0gMDtcblxuXHRcdFx0dGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiAoIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgIT09IHVuZGVmaW5lZCA/IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSA6IERhdGUubm93KCkgKTtcblxuXHRcdFx0d2hpbGUgKCBpIDwgX3R3ZWVucy5sZW5ndGggKSB7XG5cblx0XHRcdFx0aWYgKCBfdHdlZW5zWyBpIF0udXBkYXRlKCB0aW1lICkgKSB7XG5cblx0XHRcdFx0XHRpKys7XG5cblx0XHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRcdF90d2VlbnMuc3BsaWNlKCBpLCAxICk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0fVxuXHR9O1xuXG59ICkoKTtcblxuVFdFRU4uVHdlZW4gPSBmdW5jdGlvbiAoIG9iamVjdCApIHtcblxuXHR2YXIgX29iamVjdCA9IG9iamVjdDtcblx0dmFyIF92YWx1ZXNTdGFydCA9IHt9O1xuXHR2YXIgX3ZhbHVlc0VuZCA9IHt9O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0UmVwZWF0ID0ge307XG5cdHZhciBfZHVyYXRpb24gPSAxMDAwO1xuXHR2YXIgX3JlcGVhdCA9IDA7XG5cdHZhciBfeW95byA9IGZhbHNlO1xuXHR2YXIgX2lzUGxheWluZyA9IGZhbHNlO1xuXHR2YXIgX3JldmVyc2VkID0gZmFsc2U7XG5cdHZhciBfZGVsYXlUaW1lID0gMDtcblx0dmFyIF9zdGFydFRpbWUgPSBudWxsO1xuXHR2YXIgX2Vhc2luZ0Z1bmN0aW9uID0gVFdFRU4uRWFzaW5nLkxpbmVhci5Ob25lO1xuXHR2YXIgX2ludGVycG9sYXRpb25GdW5jdGlvbiA9IFRXRUVOLkludGVycG9sYXRpb24uTGluZWFyO1xuXHR2YXIgX2NoYWluZWRUd2VlbnMgPSBbXTtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cdHZhciBfb25VcGRhdGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25Db21wbGV0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0b3BDYWxsYmFjayA9IG51bGw7XG5cblx0Ly8gU2V0IGFsbCBzdGFydGluZyB2YWx1ZXMgcHJlc2VudCBvbiB0aGUgdGFyZ2V0IG9iamVjdFxuXHRmb3IgKCB2YXIgZmllbGQgaW4gb2JqZWN0ICkge1xuXG5cdFx0X3ZhbHVlc1N0YXJ0WyBmaWVsZCBdID0gcGFyc2VGbG9hdChvYmplY3RbZmllbGRdLCAxMCk7XG5cblx0fVxuXG5cdHRoaXMudG8gPSBmdW5jdGlvbiAoIHByb3BlcnRpZXMsIGR1cmF0aW9uICkge1xuXG5cdFx0aWYgKCBkdXJhdGlvbiAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRfZHVyYXRpb24gPSBkdXJhdGlvbjtcblxuXHRcdH1cblxuXHRcdF92YWx1ZXNFbmQgPSBwcm9wZXJ0aWVzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0VFdFRU4uYWRkKCB0aGlzICk7XG5cblx0XHRfaXNQbGF5aW5nID0gdHJ1ZTtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXG5cdFx0X3N0YXJ0VGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiAoIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgIT09IHVuZGVmaW5lZCA/IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSA6IERhdGUubm93KCkgKTtcblx0XHRfc3RhcnRUaW1lICs9IF9kZWxheVRpbWU7XG5cblx0XHRmb3IgKCB2YXIgcHJvcGVydHkgaW4gX3ZhbHVlc0VuZCApIHtcblxuXHRcdFx0Ly8gY2hlY2sgaWYgYW4gQXJyYXkgd2FzIHByb3ZpZGVkIGFzIHByb3BlcnR5IHZhbHVlXG5cdFx0XHRpZiAoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gaW5zdGFuY2VvZiBBcnJheSApIHtcblxuXHRcdFx0XHRpZiAoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0ubGVuZ3RoID09PSAwICkge1xuXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGNyZWF0ZSBhIGxvY2FsIGNvcHkgb2YgdGhlIEFycmF5IHdpdGggdGhlIHN0YXJ0IHZhbHVlIGF0IHRoZSBmcm9udFxuXHRcdFx0XHRfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdID0gWyBfb2JqZWN0WyBwcm9wZXJ0eSBdIF0uY29uY2F0KCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdICk7XG5cblx0XHRcdH1cblxuXHRcdFx0X3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdID0gX29iamVjdFsgcHJvcGVydHkgXTtcblxuXHRcdFx0aWYoICggX3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdIGluc3RhbmNlb2YgQXJyYXkgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSAqPSAxLjA7IC8vIEVuc3VyZXMgd2UncmUgdXNpbmcgbnVtYmVycywgbm90IHN0cmluZ3Ncblx0XHRcdH1cblxuXHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdID0gX3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdIHx8IDA7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGlmICggIV9pc1BsYXlpbmcgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHRUV0VFTi5yZW1vdmUoIHRoaXMgKTtcblx0XHRfaXNQbGF5aW5nID0gZmFsc2U7XG5cblx0XHRpZiAoIF9vblN0b3BDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0X29uU3RvcENhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMuc3RvcENoYWluZWRUd2VlbnMoKTtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcENoYWluZWRUd2VlbnMgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRmb3IgKCB2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKysgKSB7XG5cblx0XHRcdF9jaGFpbmVkVHdlZW5zWyBpIF0uc3RvcCgpO1xuXG5cdFx0fVxuXG5cdH07XG5cblx0dGhpcy5kZWxheSA9IGZ1bmN0aW9uICggYW1vdW50ICkge1xuXG5cdFx0X2RlbGF5VGltZSA9IGFtb3VudDtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMucmVwZWF0ID0gZnVuY3Rpb24gKCB0aW1lcyApIHtcblxuXHRcdF9yZXBlYXQgPSB0aW1lcztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMueW95byA9IGZ1bmN0aW9uKCB5b3lvICkge1xuXG5cdFx0X3lveW8gPSB5b3lvO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblxuXHR0aGlzLmVhc2luZyA9IGZ1bmN0aW9uICggZWFzaW5nICkge1xuXG5cdFx0X2Vhc2luZ0Z1bmN0aW9uID0gZWFzaW5nO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5pbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKCBpbnRlcnBvbGF0aW9uICkge1xuXG5cdFx0X2ludGVycG9sYXRpb25GdW5jdGlvbiA9IGludGVycG9sYXRpb247XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLmNoYWluID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0X2NoYWluZWRUd2VlbnMgPSBhcmd1bWVudHM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RhcnQgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uU3RhcnRDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblVwZGF0ZSA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25VcGRhdGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vbkNvbXBsZXRlID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdG9wID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblN0b3BDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoIHRpbWUgKSB7XG5cblx0XHR2YXIgcHJvcGVydHk7XG5cblx0XHRpZiAoIHRpbWUgPCBfc3RhcnRUaW1lICkge1xuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblxuXHRcdGlmICggX29uU3RhcnRDYWxsYmFja0ZpcmVkID09PSBmYWxzZSApIHtcblxuXHRcdFx0aWYgKCBfb25TdGFydENhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRcdF9vblN0YXJ0Q2FsbGJhY2suY2FsbCggX29iamVjdCApO1xuXG5cdFx0XHR9XG5cblx0XHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IHRydWU7XG5cblx0XHR9XG5cblx0XHR2YXIgZWxhcHNlZCA9ICggdGltZSAtIF9zdGFydFRpbWUgKSAvIF9kdXJhdGlvbjtcblx0XHRlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuXHRcdHZhciB2YWx1ZSA9IF9lYXNpbmdGdW5jdGlvbiggZWxhcHNlZCApO1xuXG5cdFx0Zm9yICggcHJvcGVydHkgaW4gX3ZhbHVlc0VuZCApIHtcblxuXHRcdFx0dmFyIHN0YXJ0ID0gX3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdIHx8IDA7XG5cdFx0XHR2YXIgZW5kID0gX3ZhbHVlc0VuZFsgcHJvcGVydHkgXTtcblxuXHRcdFx0aWYgKCBlbmQgaW5zdGFuY2VvZiBBcnJheSApIHtcblxuXHRcdFx0XHRfb2JqZWN0WyBwcm9wZXJ0eSBdID0gX2ludGVycG9sYXRpb25GdW5jdGlvbiggZW5kLCB2YWx1ZSApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdC8vIFBhcnNlcyByZWxhdGl2ZSBlbmQgdmFsdWVzIHdpdGggc3RhcnQgYXMgYmFzZSAoZS5nLjogKzEwLCAtMylcblx0XHRcdFx0aWYgKCB0eXBlb2YoZW5kKSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRlbmQgPSBzdGFydCArIHBhcnNlRmxvYXQoZW5kLCAxMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBwcm90ZWN0IGFnYWluc3Qgbm9uIG51bWVyaWMgcHJvcGVydGllcy5cblx0XHRcdFx0aWYgKCB0eXBlb2YoZW5kKSA9PT0gXCJudW1iZXJcIiApIHtcblx0XHRcdFx0XHRfb2JqZWN0WyBwcm9wZXJ0eSBdID0gc3RhcnQgKyAoIGVuZCAtIHN0YXJ0ICkgKiB2YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRpZiAoIF9vblVwZGF0ZUNhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRfb25VcGRhdGVDYWxsYmFjay5jYWxsKCBfb2JqZWN0LCB2YWx1ZSApO1xuXG5cdFx0fVxuXG5cdFx0aWYgKCBlbGFwc2VkID09IDEgKSB7XG5cblx0XHRcdGlmICggX3JlcGVhdCA+IDAgKSB7XG5cblx0XHRcdFx0aWYoIGlzRmluaXRlKCBfcmVwZWF0ICkgKSB7XG5cdFx0XHRcdFx0X3JlcGVhdC0tO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcmVhc3NpZ24gc3RhcnRpbmcgdmFsdWVzLCByZXN0YXJ0IGJ5IG1ha2luZyBzdGFydFRpbWUgPSBub3dcblx0XHRcdFx0Zm9yKCBwcm9wZXJ0eSBpbiBfdmFsdWVzU3RhcnRSZXBlYXQgKSB7XG5cblx0XHRcdFx0XHRpZiAoIHR5cGVvZiggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSApID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdID0gX3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdICsgcGFyc2VGbG9hdChfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdLCAxMCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0XHR2YXIgdG1wID0gX3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdO1xuXHRcdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdID0gX3ZhbHVlc0VuZFsgcHJvcGVydHkgXTtcblx0XHRcdFx0XHRcdF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gPSB0bXA7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdID0gX3ZhbHVlc1N0YXJ0UmVwZWF0WyBwcm9wZXJ0eSBdO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRfcmV2ZXJzZWQgPSAhX3JldmVyc2VkO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0X3N0YXJ0VGltZSA9IHRpbWUgKyBfZGVsYXlUaW1lO1xuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdGlmICggX29uQ29tcGxldGVDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0XHRcdF9vbkNvbXBsZXRlQ2FsbGJhY2suY2FsbCggX29iamVjdCApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKCB2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKysgKSB7XG5cblx0XHRcdFx0XHRfY2hhaW5lZFR3ZWVuc1sgaSBdLnN0YXJ0KCB0aW1lICk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cblx0fTtcblxufTtcblxuXG5UV0VFTi5FYXNpbmcgPSB7XG5cblx0TGluZWFyOiB7XG5cblx0XHROb25lOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhZHJhdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogKCAyIC0gayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogayAqIGs7XG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoIC0tayAqICggayAtIDIgKSAtIDEgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEN1YmljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiBrICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhcnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gKCAtLWsgKiBrICogayAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxKSByZXR1cm4gMC41ICogayAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAtIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiBrICogayAtIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1aW50aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogayAqIGsgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gMC41ICogKCAoIGsgLT0gMiApICogayAqIGsgKiBrICogayArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFNpbnVzb2lkYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5jb3MoIGsgKiBNYXRoLlBJIC8gMiApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5zaW4oIGsgKiBNYXRoLlBJIC8gMiApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAwLjUgKiAoIDEgLSBNYXRoLmNvcyggTWF0aC5QSSAqIGsgKSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RXhwb25lbnRpYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrID09PSAwID8gMCA6IE1hdGgucG93KCAxMDI0LCBrIC0gMSApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMSA/IDEgOiAxIC0gTWF0aC5wb3coIDIsIC0gMTAgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogTWF0aC5wb3coIDEwMjQsIGsgLSAxICk7XG5cdFx0XHRyZXR1cm4gMC41ICogKCAtIE1hdGgucG93KCAyLCAtIDEwICogKCBrIC0gMSApICkgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDaXJjdWxhcjoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLnNxcnQoIDEgLSBrICogayApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5zcXJ0KCAxIC0gKCAtLWsgKiBrICkgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxKSByZXR1cm4gLSAwLjUgKiAoIE1hdGguc3FydCggMSAtIGsgKiBrKSAtIDEpO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggTWF0aC5zcXJ0KCAxIC0gKCBrIC09IDIpICogaykgKyAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEVsYXN0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzLCBhID0gMC4xLCBwID0gMC40O1xuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggIWEgfHwgYSA8IDEgKSB7IGEgPSAxOyBzID0gcCAvIDQ7IH1cblx0XHRcdGVsc2UgcyA9IHAgKiBNYXRoLmFzaW4oIDEgLyBhICkgLyAoIDIgKiBNYXRoLlBJICk7XG5cdFx0XHRyZXR1cm4gLSAoIGEgKiBNYXRoLnBvdyggMiwgMTAgKiAoIGsgLT0gMSApICkgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzLCBhID0gMC4xLCBwID0gMC40O1xuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggIWEgfHwgYSA8IDEgKSB7IGEgPSAxOyBzID0gcCAvIDQ7IH1cblx0XHRcdGVsc2UgcyA9IHAgKiBNYXRoLmFzaW4oIDEgLyBhICkgLyAoIDIgKiBNYXRoLlBJICk7XG5cdFx0XHRyZXR1cm4gKCBhICogTWF0aC5wb3coIDIsIC0gMTAgKiBrKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKyAxICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMsIGEgPSAwLjEsIHAgPSAwLjQ7XG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAhYSB8fCBhIDwgMSApIHsgYSA9IDE7IHMgPSBwIC8gNDsgfVxuXHRcdFx0ZWxzZSBzID0gcCAqIE1hdGguYXNpbiggMSAvIGEgKSAvICggMiAqIE1hdGguUEkgKTtcblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gLSAwLjUgKiAoIGEgKiBNYXRoLnBvdyggMiwgMTAgKiAoIGsgLT0gMSApICkgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICk7XG5cdFx0XHRyZXR1cm4gYSAqIE1hdGgucG93KCAyLCAtMTAgKiAoIGsgLT0gMSApICkgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICogMC41ICsgMTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJhY2s6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblx0XHRcdHJldHVybiBrICogayAqICggKCBzICsgMSApICogayAtIHMgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiAoICggcyArIDEgKSAqIGsgKyBzICkgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1OCAqIDEuNTI1O1xuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiAoIGsgKiBrICogKCAoIHMgKyAxICkgKiBrIC0gcyApICk7XG5cdFx0XHRyZXR1cm4gMC41ICogKCAoIGsgLT0gMiApICogayAqICggKCBzICsgMSApICogayArIHMgKSArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJvdW5jZToge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBUV0VFTi5FYXNpbmcuQm91bmNlLk91dCggMSAtIGsgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCBrIDwgKCAxIC8gMi43NSApICkge1xuXG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiBrICogaztcblxuXHRcdFx0fSBlbHNlIGlmICggayA8ICggMiAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMS41IC8gMi43NSApICkgKiBrICsgMC43NTtcblxuXHRcdFx0fSBlbHNlIGlmICggayA8ICggMi41IC8gMi43NSApICkge1xuXG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoIGsgLT0gKCAyLjI1IC8gMi43NSApICkgKiBrICsgMC45Mzc1O1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoIGsgLT0gKCAyLjYyNSAvIDIuNzUgKSApICogayArIDAuOTg0Mzc1O1xuXG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCBrIDwgMC41ICkgcmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuSW4oIGsgKiAyICkgKiAwLjU7XG5cdFx0XHRyZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoIGsgKiAyIC0gMSApICogMC41ICsgMC41O1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxuVFdFRU4uSW50ZXJwb2xhdGlvbiA9IHtcblxuXHRMaW5lYXI6IGZ1bmN0aW9uICggdiwgayApIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxLCBmID0gbSAqIGssIGkgPSBNYXRoLmZsb29yKCBmICksIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5MaW5lYXI7XG5cblx0XHRpZiAoIGsgPCAwICkgcmV0dXJuIGZuKCB2WyAwIF0sIHZbIDEgXSwgZiApO1xuXHRcdGlmICggayA+IDEgKSByZXR1cm4gZm4oIHZbIG0gXSwgdlsgbSAtIDEgXSwgbSAtIGYgKTtcblxuXHRcdHJldHVybiBmbiggdlsgaSBdLCB2WyBpICsgMSA+IG0gPyBtIDogaSArIDEgXSwgZiAtIGkgKTtcblxuXHR9LFxuXG5cdEJlemllcjogZnVuY3Rpb24gKCB2LCBrICkge1xuXG5cdFx0dmFyIGIgPSAwLCBuID0gdi5sZW5ndGggLSAxLCBwdyA9IE1hdGgucG93LCBibiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQmVybnN0ZWluLCBpO1xuXG5cdFx0Zm9yICggaSA9IDA7IGkgPD0gbjsgaSsrICkge1xuXHRcdFx0YiArPSBwdyggMSAtIGssIG4gLSBpICkgKiBwdyggaywgaSApICogdlsgaSBdICogYm4oIG4sIGkgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYjtcblxuXHR9LFxuXG5cdENhdG11bGxSb206IGZ1bmN0aW9uICggdiwgayApIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxLCBmID0gbSAqIGssIGkgPSBNYXRoLmZsb29yKCBmICksIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5DYXRtdWxsUm9tO1xuXG5cdFx0aWYgKCB2WyAwIF0gPT09IHZbIG0gXSApIHtcblxuXHRcdFx0aWYgKCBrIDwgMCApIGkgPSBNYXRoLmZsb29yKCBmID0gbSAqICggMSArIGsgKSApO1xuXG5cdFx0XHRyZXR1cm4gZm4oIHZbICggaSAtIDEgKyBtICkgJSBtIF0sIHZbIGkgXSwgdlsgKCBpICsgMSApICUgbSBdLCB2WyAoIGkgKyAyICkgJSBtIF0sIGYgLSBpICk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAoIGsgPCAwICkgcmV0dXJuIHZbIDAgXSAtICggZm4oIHZbIDAgXSwgdlsgMCBdLCB2WyAxIF0sIHZbIDEgXSwgLWYgKSAtIHZbIDAgXSApO1xuXHRcdFx0aWYgKCBrID4gMSApIHJldHVybiB2WyBtIF0gLSAoIGZuKCB2WyBtIF0sIHZbIG0gXSwgdlsgbSAtIDEgXSwgdlsgbSAtIDEgXSwgZiAtIG0gKSAtIHZbIG0gXSApO1xuXG5cdFx0XHRyZXR1cm4gZm4oIHZbIGkgPyBpIC0gMSA6IDAgXSwgdlsgaSBdLCB2WyBtIDwgaSArIDEgPyBtIDogaSArIDEgXSwgdlsgbSA8IGkgKyAyID8gbSA6IGkgKyAyIF0sIGYgLSBpICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRVdGlsczoge1xuXG5cdFx0TGluZWFyOiBmdW5jdGlvbiAoIHAwLCBwMSwgdCApIHtcblxuXHRcdFx0cmV0dXJuICggcDEgLSBwMCApICogdCArIHAwO1xuXG5cdFx0fSxcblxuXHRcdEJlcm5zdGVpbjogZnVuY3Rpb24gKCBuICwgaSApIHtcblxuXHRcdFx0dmFyIGZjID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5GYWN0b3JpYWw7XG5cdFx0XHRyZXR1cm4gZmMoIG4gKSAvIGZjKCBpICkgLyBmYyggbiAtIGkgKTtcblxuXHRcdH0sXG5cblx0XHRGYWN0b3JpYWw6ICggZnVuY3Rpb24gKCkge1xuXG5cdFx0XHR2YXIgYSA9IFsgMSBdO1xuXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCBuICkge1xuXG5cdFx0XHRcdHZhciBzID0gMSwgaTtcblx0XHRcdFx0aWYgKCBhWyBuIF0gKSByZXR1cm4gYVsgbiBdO1xuXHRcdFx0XHRmb3IgKCBpID0gbjsgaSA+IDE7IGktLSApIHMgKj0gaTtcblx0XHRcdFx0cmV0dXJuIGFbIG4gXSA9IHM7XG5cblx0XHRcdH07XG5cblx0XHR9ICkoKSxcblxuXHRcdENhdG11bGxSb206IGZ1bmN0aW9uICggcDAsIHAxLCBwMiwgcDMsIHQgKSB7XG5cblx0XHRcdHZhciB2MCA9ICggcDIgLSBwMCApICogMC41LCB2MSA9ICggcDMgLSBwMSApICogMC41LCB0MiA9IHQgKiB0LCB0MyA9IHQgKiB0Mjtcblx0XHRcdHJldHVybiAoIDIgKiBwMSAtIDIgKiBwMiArIHYwICsgdjEgKSAqIHQzICsgKCAtIDMgKiBwMSArIDMgKiBwMiAtIDIgKiB2MCAtIHYxICkgKiB0MiArIHYwICogdCArIHAxO1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxubW9kdWxlLmV4cG9ydHM9VFdFRU47IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFBpeGlBcHAgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvUGl4aUFwcFwiKTtcbnZhciBOZXRQb2tlckNsaWVudFZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9OZXRQb2tlckNsaWVudFZpZXdcIik7XG52YXIgTmV0UG9rZXJDbGllbnRDb250cm9sbGVyID0gcmVxdWlyZShcIi4uL2NvbnRyb2xsZXIvTmV0UG9rZXJDbGllbnRDb250cm9sbGVyXCIpO1xudmFyIE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL01lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uXCIpO1xudmFyIFByb3RvQ29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9Qcm90b0Nvbm5lY3Rpb25cIik7XG52YXIgTG9hZGluZ1NjcmVlbiA9IHJlcXVpcmUoXCIuLi92aWV3L0xvYWRpbmdTY3JlZW5cIik7XG52YXIgU3RhdGVDb21wbGV0ZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU3RhdGVDb21wbGV0ZU1lc3NhZ2VcIik7XG52YXIgSW5pdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvSW5pdE1lc3NhZ2VcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG5cbi8qKlxuICogTWFpbiBlbnRyeSBwb2ludCBmb3IgY2xpZW50LlxuICogQGNsYXNzIE5ldFBva2VyQ2xpZW50XG4gKi9cbmZ1bmN0aW9uIE5ldFBva2VyQ2xpZW50KGRvbUlkKSB7XG5cdFBpeGlBcHAuY2FsbCh0aGlzLCBkb21JZCwgOTYwLCA3MjApO1xuXG5cdHRoaXMubG9hZGluZ1NjcmVlbiA9IG5ldyBMb2FkaW5nU2NyZWVuKCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5sb2FkaW5nU2NyZWVuKTtcblx0dGhpcy5sb2FkaW5nU2NyZWVuLnNob3coXCJMT0FESU5HXCIpO1xuXG5cdHRoaXMudXJsID0gbnVsbDtcblxuXHR0aGlzLnRhYmxlSWQ9bnVsbDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChOZXRQb2tlckNsaWVudCwgUGl4aUFwcCk7XG5cbi8qKlxuICogU2V0IHVybC5cbiAqIEBtZXRob2Qgc2V0VXJsXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5zZXRVcmwgPSBmdW5jdGlvbih1cmwpIHtcblx0dGhpcy51cmwgPSB1cmw7XG59XG5cbi8qKlxuICogU2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBzZXRUYWJsZUlkXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5zZXRUYWJsZUlkID0gZnVuY3Rpb24odGFibGVJZCkge1xuXHR0aGlzLnRhYmxlSWQgPSB0YWJsZUlkO1xufVxuXG4vKipcbiAqIFNldCB2aWV3IGNhc2UuXG4gKiBAbWV0aG9kIHNldFZpZXdDYXNlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5zZXRWaWV3Q2FzZSA9IGZ1bmN0aW9uKHZpZXdDYXNlKSB7XG5cdGNvbnNvbGUubG9nKFwiKioqKioqIHJ1bm5pbmcgdmlldyBjYXNlOiBcIit2aWV3Q2FzZSk7XG5cdHRoaXMudmlld0Nhc2U9dmlld0Nhc2U7XG59XG5cbi8qKlxuICogU2V0IHRva2VuLlxuICogQG1ldGhvZCBzZXRUb2tlblxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0VG9rZW4gPSBmdW5jdGlvbih0b2tlbikge1xuXHR0aGlzLnRva2VuID0gdG9rZW47XG59XG5cbi8qKlxuICogU2V0IHRva2VuLlxuICogQG1ldGhvZCBzZXRTa2luXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5zZXRTa2luID0gZnVuY3Rpb24oc2tpbikge1xuXHRSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luID0gc2tpbjtcbn1cblxuLyoqXG4gKiBSdW4uXG4gKiBAbWV0aG9kIHJ1blxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24oKSB7XG5cblx0dmFyIGFzc2V0cyA9IFtcblx0XHRcInRhYmxlLnBuZ1wiLFxuXHRcdFwiY29tcG9uZW50cy5wbmdcIlxuXHRdO1xuXHRpZigoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbiAhPSBudWxsKSAmJiAoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlcyAhPSBudWxsKSkge1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luLnRleHR1cmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRhc3NldHMucHVzaChSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luLnRleHR1cmVzW2ldLmZpbGUpO1xuXHRcdFx0Y29uc29sZS5sb2coXCJhZGQgdG8gbG9hZCBsaXN0OiBcIiArIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4udGV4dHVyZXNbaV0uZmlsZSk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5hc3NldExvYWRlciA9IG5ldyBQSVhJLkFzc2V0TG9hZGVyKGFzc2V0cyk7XG5cdHRoaXMuYXNzZXRMb2FkZXIuYWRkRXZlbnRMaXN0ZW5lcihcIm9uQ29tcGxldGVcIiwgdGhpcy5vbkFzc2V0TG9hZGVyQ29tcGxldGUuYmluZCh0aGlzKSk7XG5cdHRoaXMuYXNzZXRMb2FkZXIubG9hZCgpO1xufVxuXG4vKipcbiAqIEFzc2V0cyBsb2FkZWQsIGNvbm5lY3QuXG4gKiBAbWV0aG9kIG9uQXNzZXRMb2FkZXJDb21wbGV0ZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLm9uQXNzZXRMb2FkZXJDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcImFzc2V0IGxvYWRlciBjb21wbGV0ZS4uLlwiKTtcblxuXHR0aGlzLm5ldFBva2VyQ2xpZW50VmlldyA9IG5ldyBOZXRQb2tlckNsaWVudFZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZEF0KHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LCAwKTtcblxuXHR0aGlzLm5ldFBva2VyQ2xpZW50Q29udHJvbGxlciA9IG5ldyBOZXRQb2tlckNsaWVudENvbnRyb2xsZXIodGhpcy5uZXRQb2tlckNsaWVudFZpZXcpO1xuXHR0aGlzLmNvbm5lY3QoKTtcbn1cblxuLyoqXG4gKiBDb25uZWN0LlxuICogQG1ldGhvZCBjb25uZWN0XG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMudXJsKSB7XG5cdFx0dGhpcy5sb2FkaW5nU2NyZWVuLnNob3coXCJORUVEIFVSTFwiKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0aGlzLmNvbm5lY3Rpb24gPSBuZXcgTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24oKTtcblx0dGhpcy5jb25uZWN0aW9uLm9uKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNPTk5FQ1QsIHRoaXMub25Db25uZWN0aW9uQ29ubmVjdCwgdGhpcyk7XG5cdHRoaXMuY29ubmVjdGlvbi5vbihNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DTE9TRSwgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZSwgdGhpcyk7XG5cdHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KHRoaXMudXJsKTtcblx0dGhpcy5sb2FkaW5nU2NyZWVuLnNob3coXCJDT05ORUNUSU5HXCIpO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uQ29ubmVjdGlvbkNvbm5lY3RcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25Db25uZWN0ID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwiKioqKiBjb25uZWN0ZWRcIik7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gbmV3IFByb3RvQ29ubmVjdGlvbih0aGlzLmNvbm5lY3Rpb24pO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5hZGRNZXNzYWdlSGFuZGxlcihTdGF0ZUNvbXBsZXRlTWVzc2FnZSwgdGhpcy5vblN0YXRlQ29tcGxldGVNZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5uZXRQb2tlckNsaWVudENvbnRyb2xsZXIuc2V0UHJvdG9Db25uZWN0aW9uKHRoaXMucHJvdG9Db25uZWN0aW9uKTtcblx0dGhpcy5sb2FkaW5nU2NyZWVuLnNob3coXCJJTklUSUFMSVpJTkdcIik7XG5cblx0dmFyIGluaXRNZXNzYWdlPW5ldyBJbml0TWVzc2FnZSh0aGlzLnRva2VuKTtcblxuXHRpZiAodGhpcy50YWJsZUlkKVxuXHRcdGluaXRNZXNzYWdlLnNldFRhYmxlSWQodGhpcy50YWJsZUlkKTtcblxuXHRpZiAodGhpcy52aWV3Q2FzZSlcblx0XHRpbml0TWVzc2FnZS5zZXRWaWV3Q2FzZSh0aGlzLnZpZXdDYXNlKTtcblxuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKGluaXRNZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBTdGF0ZSBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25TdGF0ZUNvbXBsZXRlTWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLm9uU3RhdGVDb21wbGV0ZU1lc3NhZ2U9ZnVuY3Rpb24oKSB7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5oaWRlKCk7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBjbG9zZWQuXG4gKiBAbWV0aG9kIG9uQ29ubmVjdGlvbkNsb3NlXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUub25Db25uZWN0aW9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCIqKioqIGNvbm5lY3Rpb24gY2xvc2VkXCIpO1xuXHRpZiAodGhpcy5wcm90b0Nvbm5lY3Rpb24pXG5cdFx0dGhpcy5wcm90b0Nvbm5lY3Rpb24ucmVtb3ZlTWVzc2FnZUhhbmRsZXIoU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMub25TdGF0ZUNvbXBsZXRlTWVzc2FnZSwgdGhpcyk7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24gPSBudWxsO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5zZXRQcm90b0Nvbm5lY3Rpb24obnVsbCk7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiQ09OTkVDVElPTiBFUlJPUlwiKTtcblx0c2V0VGltZW91dCh0aGlzLmNvbm5lY3QuYmluZCh0aGlzKSwgMzAwMCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmV0UG9rZXJDbGllbnQ7IiwiXG5cbi8qKlxuICogQ2xpZW50IHJlc291cmNlc1xuICogQGNsYXNzIFNldHRpbmdzLlxuICovXG4gZnVuY3Rpb24gU2V0dGluZ3MoKSB7XG4gXHR0aGlzLnBsYXlBbmltYXRpb25zID0gdHJ1ZTtcbiB9XG5cblxuLyoqXG4gKiBHZXQgc2luZ2xldG9uIGluc3RhbmNlLlxuICogQG1ldGhvZCBnZXRJbnN0YW5jZVxuICovXG5TZXR0aW5ncy5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoIVNldHRpbmdzLmluc3RhbmNlKVxuXHRcdFNldHRpbmdzLmluc3RhbmNlID0gbmV3IFNldHRpbmdzKCk7XG5cblx0cmV0dXJuIFNldHRpbmdzLmluc3RhbmNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzOyIsInZhciBTaG93RGlhbG9nTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9TaG93RGlhbG9nTWVzc2FnZVwiKTtcclxudmFyIEJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0J1dHRvbnNNZXNzYWdlXCIpO1xyXG52YXIgQ2hhdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ2hhdE1lc3NhZ2VcIik7XHJcblxyXG4vKipcclxuICogQ29udHJvbCB1c2VyIGludGVyZmFjZS5cclxuICogQGNsYXNzIEludGVyZmFjZUNvbnRyb2xsZXJcclxuICovXHJcbmZ1bmN0aW9uIEludGVyZmFjZUNvbnRyb2xsZXIobWVzc2FnZVNlcXVlbmNlciwgdmlldykge1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlciA9IG1lc3NhZ2VTZXF1ZW5jZXI7XHJcblx0dGhpcy52aWV3ID0gdmlldztcclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEJ1dHRvbnNNZXNzYWdlLlRZUEUsIHRoaXMub25CdXR0b25zTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFNob3dEaWFsb2dNZXNzYWdlLlRZUEUsIHRoaXMub25TaG93RGlhbG9nTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKENoYXRNZXNzYWdlLlRZUEUsIHRoaXMub25DaGF0LCB0aGlzKTtcclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdXR0b25zIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25CdXR0b25zTWVzc2FnZVxyXG4gKi9cclxuSW50ZXJmYWNlQ29udHJvbGxlci5wcm90b3R5cGUub25CdXR0b25zTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgYnV0dG9uc1ZpZXcgPSB0aGlzLnZpZXcuZ2V0QnV0dG9uc1ZpZXcoKTtcclxuXHJcblx0YnV0dG9uc1ZpZXcuc2V0QnV0dG9ucyhtLmdldEJ1dHRvbnMoKSwgbS5zbGlkZXJCdXR0b25JbmRleCwgcGFyc2VJbnQobS5taW4sIDEwKSwgcGFyc2VJbnQobS5tYXgsIDEwKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaG93IGRpYWxvZy5cclxuICogQG1ldGhvZCBvblNob3dEaWFsb2dNZXNzYWdlXHJcbiAqL1xyXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vblNob3dEaWFsb2dNZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBkaWFsb2dWaWV3ID0gdGhpcy52aWV3LmdldERpYWxvZ1ZpZXcoKTtcclxuXHJcblx0ZGlhbG9nVmlldy5zaG93KG0uZ2V0VGV4dCgpLCBtLmdldEJ1dHRvbnMoKSwgbS5nZXREZWZhdWx0VmFsdWUoKSk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogT24gY2hhdCBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQ2hhdFxyXG4gKi9cclxuSW50ZXJmYWNlQ29udHJvbGxlci5wcm90b3R5cGUub25DaGF0ID0gZnVuY3Rpb24obSkge1xyXG5cdHRoaXMudmlldy5jaGF0Vmlldy5hZGRUZXh0KG0udXNlciwgbS50ZXh0KTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcmZhY2VDb250cm9sbGVyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgU2VxdWVuY2VyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1NlcXVlbmNlclwiKTtcblxuLyoqXG4gKiBBbiBpdGVtIGluIGEgbWVzc2FnZSBzZXF1ZW5jZS5cbiAqIEBjbGFzcyBNZXNzYWdlU2VxdWVuY2VJdGVtXG4gKi9cbmZ1bmN0aW9uIE1lc3NhZ2VTZXF1ZW5jZUl0ZW0obWVzc2FnZSkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0dGhpcy53YWl0VGFyZ2V0ID0gbnVsbDtcblx0dGhpcy53YWl0RXZlbnQgPSBudWxsO1xuXHR0aGlzLndhaXRDbG9zdXJlID0gbnVsbDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChNZXNzYWdlU2VxdWVuY2VJdGVtLCBFdmVudERpc3BhdGNoZXIpO1xuXG4vKipcbiAqIEdldCBtZXNzYWdlLlxuICogQG1ldGhvZCBnZXRNZXNzYWdlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLmdldE1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcblx0Ly9jb25zb2xlLmxvZyhcImdldHRpbmc6IFwiICsgdGhpcy5tZXNzYWdlLnR5cGUpO1xuXG5cdHJldHVybiB0aGlzLm1lc3NhZ2U7XG59XG5cbi8qKlxuICogQXJlIHdlIHdhaXRpbmcgZm9yIGFuIGV2ZW50P1xuICogQG1ldGhvZCBpc1dhaXRpbmdcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUuaXNXYWl0aW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLndhaXRFdmVudCAhPSBudWxsO1xufVxuXG4vKipcbiAqIE5vdGlmeSBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgbm90aWZ5Q29tcGxldGVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50cmlnZ2VyKFNlcXVlbmNlci5DT01QTEVURSk7XG59XG5cbi8qKlxuICogV2FpdCBmb3IgZXZlbnQgYmVmb3JlIHByb2Nlc3NpbmcgbmV4dCBtZXNzYWdlLlxuICogQG1ldGhvZCB3YWl0Rm9yXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbih0YXJnZXQsIGV2ZW50KSB7XG5cdHRoaXMud2FpdFRhcmdldCA9IHRhcmdldDtcblx0dGhpcy53YWl0RXZlbnQgPSBldmVudDtcblx0dGhpcy53YWl0Q2xvc3VyZSA9IHRoaXMub25UYXJnZXRDb21wbGV0ZS5iaW5kKHRoaXMpO1xuXG5cdHRoaXMud2FpdFRhcmdldC5hZGRFdmVudExpc3RlbmVyKHRoaXMud2FpdEV2ZW50LCB0aGlzLndhaXRDbG9zdXJlKTtcbn1cblxuLyoqXG4gKiBXYWl0IHRhcmdldCBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25UYXJnZXRDb21wbGV0ZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUub25UYXJnZXRDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHQvL2NvbnNvbGUubG9nKFwidGFyZ2V0IGlzIGNvbXBsZXRlXCIpO1xuXHR0aGlzLndhaXRUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLndhaXRFdmVudCwgdGhpcy53YWl0Q2xvc3VyZSk7XG5cdHRoaXMubm90aWZ5Q29tcGxldGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU2VxdWVuY2VJdGVtOyIsInZhciBTZXF1ZW5jZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2VxdWVuY2VyXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgTWVzc2FnZVNlcXVlbmNlSXRlbSA9IHJlcXVpcmUoXCIuL01lc3NhZ2VTZXF1ZW5jZUl0ZW1cIik7XG5cbi8qKlxuICogU2VxdWVuY2VzIG1lc3NhZ2VzLlxuICogQGNsYXNzIE1lc3NhZ2VTZXF1ZW5jZXJcbiAqL1xuZnVuY3Rpb24gTWVzc2FnZVNlcXVlbmNlcigpIHtcblx0dGhpcy5zZXF1ZW5jZXIgPSBuZXcgU2VxdWVuY2VyKCk7XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG5cdHRoaXMuY3VycmVudEl0ZW0gPSBudWxsO1xufVxuXG4vKipcbiAqIEFkZCBhIG1lc3NhZ2UgZm9yIHByb2Nlc2luZy5cbiAqIEBtZXRob2QgZW5xdWV1ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHRpZiAoIW1lc3NhZ2UudHlwZSlcblx0XHR0aHJvdyBcIk1lc3NhZ2UgZG9lc24ndCBoYXZlIGEgdHlwZVwiO1xuXG5cdHZhciBzZXF1ZW5jZUl0ZW0gPSBuZXcgTWVzc2FnZVNlcXVlbmNlSXRlbShtZXNzYWdlKTtcblxuXHRzZXF1ZW5jZUl0ZW0ub24oU2VxdWVuY2VyLlNUQVJULCB0aGlzLm9uU2VxdWVuY2VJdGVtU3RhcnQsIHRoaXMpO1xuXG5cdHRoaXMuc2VxdWVuY2VyLmVucXVldWUoc2VxdWVuY2VJdGVtKTtcbn1cblxuLyoqXG4gKiBTZXF1ZW5jZSBpdGVtIHN0YXJ0LlxuICogQG1ldGhvZCBvblNlcXVlbmNlSXRlbVN0YXJ0XG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS5vblNlcXVlbmNlSXRlbVN0YXJ0ID0gZnVuY3Rpb24oZSkge1xuXHQvL2NvbnNvbGUubG9nKFwic3RhcnRpbmcgaXRlbS4uLlwiKTtcblx0dmFyIGl0ZW0gPSBlLnRhcmdldDtcblxuXHRpdGVtLm9mZihTZXF1ZW5jZXIuU1RBUlQsIHRoaXMub25TZXF1ZW5jZUl0ZW1TdGFydCwgdGhpcyk7XG5cblx0dGhpcy5jdXJyZW50SXRlbSA9IGl0ZW07XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIudHJpZ2dlcihpdGVtLmdldE1lc3NhZ2UoKSk7XG5cdHRoaXMuY3VycmVudEl0ZW0gPSBudWxsO1xuXG5cdGlmICghaXRlbS5pc1dhaXRpbmcoKSlcblx0XHRpdGVtLm5vdGlmeUNvbXBsZXRlKCk7XG59XG5cbi8qKlxuICogQWRkIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgYWRkTWVzc2FnZUhhbmRsZXJcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUuYWRkTWVzc2FnZUhhbmRsZXIgPSBmdW5jdGlvbihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpIHtcblx0dGhpcy5tZXNzYWdlRGlzcGF0Y2hlci5vbihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpO1xufVxuXG4vKipcbiAqIFdhaXQgZm9yIHRoZSB0YXJnZXQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgYmVmb3JlIGNvbnRpbnVpbmcgdG9cbiAqIHByb2Nlc3MgdGhlIG1lc3NhZ2VzIGluIHRoZSBxdWUuXG4gKiBAbWV0aG9kIHdhaXRGb3JcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUud2FpdEZvciA9IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnQpIHtcblx0aWYgKCF0aGlzLmN1cnJlbnRJdGVtKVxuXHRcdHRocm93IFwiTm90IHdhaXRpbmcgZm9yIGV2ZW50XCI7XG5cblx0dGhpcy5jdXJyZW50SXRlbS53YWl0Rm9yKHRhcmdldCwgZXZlbnQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VTZXF1ZW5jZXI7IiwidmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgTWVzc2FnZVNlcXVlbmNlciA9IHJlcXVpcmUoXCIuL01lc3NhZ2VTZXF1ZW5jZXJcIik7XG52YXIgUHJvdG9Db25uZWN0aW9uID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL1Byb3RvQ29ubmVjdGlvblwiKTtcbnZhciBCdXR0b25zVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L0J1dHRvbnNWaWV3XCIpO1xudmFyIEJ1dHRvbkNsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgU2VhdENsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlXCIpO1xudmFyIE5ldFBva2VyQ2xpZW50VmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L05ldFBva2VyQ2xpZW50Vmlld1wiKTtcbnZhciBEaWFsb2dWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvRGlhbG9nVmlld1wiKTtcbnZhciBTZXR0aW5nc1ZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9TZXR0aW5nc1ZpZXdcIik7XG52YXIgVGFibGVDb250cm9sbGVyID0gcmVxdWlyZShcIi4vVGFibGVDb250cm9sbGVyXCIpO1xudmFyIEludGVyZmFjZUNvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi9JbnRlcmZhY2VDb250cm9sbGVyXCIpO1xudmFyIENoYXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NoYXRNZXNzYWdlXCIpO1xudmFyIEJ1dHRvbkRhdGEgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vZGF0YS9CdXR0b25EYXRhXCIpO1xuXG4vKipcbiAqIE1haW4gY29udHJvbGxlclxuICogQGNsYXNzIE5ldFBva2VyQ2xpZW50Q29udHJvbGxlclxuICovXG5mdW5jdGlvbiBOZXRQb2tlckNsaWVudENvbnRyb2xsZXIodmlldykge1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50VmlldyA9IHZpZXc7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gbnVsbDtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyID0gbmV3IE1lc3NhZ2VTZXF1ZW5jZXIoKTtcblxuXHR0aGlzLnRhYmxlQ29udHJvbGxlciA9IG5ldyBUYWJsZUNvbnRyb2xsZXIodGhpcy5tZXNzYWdlU2VxdWVuY2VyLCB0aGlzLm5ldFBva2VyQ2xpZW50Vmlldyk7XG5cdHRoaXMuaW50ZXJmYWNlQ29udHJvbGxlciA9IG5ldyBJbnRlcmZhY2VDb250cm9sbGVyKHRoaXMubWVzc2FnZVNlcXVlbmNlciwgdGhpcy5uZXRQb2tlckNsaWVudFZpZXcpO1xuXG5cdGNvbnNvbGUubG9nKHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmdldERpYWxvZ1ZpZXcoKSk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuZ2V0QnV0dG9uc1ZpZXcoKS5vbihCdXR0b25zVmlldy5CVVRUT05fQ0xJQ0ssIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmdldERpYWxvZ1ZpZXcoKS5vbihEaWFsb2dWaWV3LkJVVFRPTl9DTElDSywgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcub24oTmV0UG9rZXJDbGllbnRWaWV3LlNFQVRfQ0xJQ0ssIHRoaXMub25TZWF0Q2xpY2ssIHRoaXMpO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmNoYXRWaWV3LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGF0XCIsIHRoaXMub25WaWV3Q2hhdCwgdGhpcyk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuc2V0dGluZ3NWaWV3LmFkZEV2ZW50TGlzdGVuZXIoU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSywgdGhpcy5vbkJ1eUNoaXBzQnV0dG9uQ2xpY2ssIHRoaXMpO1xufVxuXG5cbi8qKlxuICogU2V0IGNvbm5lY3Rpb24uXG4gKiBAbWV0aG9kIHNldFByb3RvQ29ubmVjdGlvblxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLnNldFByb3RvQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKHByb3RvQ29ubmVjdGlvbikge1xuXHRpZiAodGhpcy5wcm90b0Nvbm5lY3Rpb24pIHtcblx0XHR0aGlzLnByb3RvQ29ubmVjdGlvbi5vZmYoUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UsIHRoaXMub25Qcm90b0Nvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0fVxuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gcHJvdG9Db25uZWN0aW9uO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5jbGVhcigpO1xuXG5cdGlmICh0aGlzLnByb3RvQ29ubmVjdGlvbikge1xuXHRcdHRoaXMucHJvdG9Db25uZWN0aW9uLm9uKFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFLCB0aGlzLm9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZSwgdGhpcyk7XG5cdH1cbn1cblxuLyoqXG4gKiBJbmNvbWluZyBtZXNzYWdlLlxuICogRW5xdWV1ZSBmb3IgcHJvY2Vzc2luZy5cbiAqwqBAbWV0aG9kIG9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vblByb3RvQ29ubmVjdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5lbnF1ZXVlKGUubWVzc2FnZSk7XG59XG5cbi8qKlxuICogQnV0dG9uIGNsaWNrLlxuICogVGhpcyBmdW5jdGlvbiBoYW5kbGVzIGNsaWNrcyBmcm9tIGJvdGggdGhlIGRpYWxvZyBhbmQgZ2FtZSBwbGF5IGJ1dHRvbnMuXG4gKiBAbWV0aG9kIG9uQnV0dG9uQ2xpY2tcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0aWYgKCF0aGlzLnByb3RvQ29ubmVjdGlvbilcblx0XHRyZXR1cm47XG5cblx0Y29uc29sZS5sb2coXCJidXR0b24gY2xpY2ssIHY9XCIgKyBlLnZhbHVlKTtcblxuXHR2YXIgbSA9IG5ldyBCdXR0b25DbGlja01lc3NhZ2UoZS5idXR0b24sIGUudmFsdWUpO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKG0pO1xufVxuXG4vKipcbiAqIFNlYXQgY2xpY2suXG4gKiBAbWV0aG9kIG9uU2VhdENsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uU2VhdENsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgbSA9IG5ldyBTZWF0Q2xpY2tNZXNzYWdlKGUuc2VhdEluZGV4KTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChtKTtcbn1cblxuLyoqXG4gKiBPbiBzZW5kIGNoYXQgbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25WaWV3Q2hhdFxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uVmlld0NoYXQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHZhciBtZXNzYWdlID0gbmV3IENoYXRNZXNzYWdlKCk7XG5cdG1lc3NhZ2UudXNlciA9IFwiXCI7XG5cdG1lc3NhZ2UudGV4dCA9IHRleHQ7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChtZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBPbiBidXkgY2hpcHMgYnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvbkJ1eUNoaXBzQnV0dG9uQ2xpY2tcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vbkJ1eUNoaXBzQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJidXkgY2hpcHMgY2xpY2tcIik7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChuZXcgQnV0dG9uQ2xpY2tNZXNzYWdlKEJ1dHRvbkRhdGEuQlVZX0NISVBTKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmV0UG9rZXJDbGllbnRDb250cm9sbGVyOyIsInZhciBTZWF0SW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU2VhdEluZm9NZXNzYWdlXCIpO1xyXG52YXIgQ29tbXVuaXR5Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NvbW11bml0eUNhcmRzTWVzc2FnZVwiKTtcclxudmFyIFBvY2tldENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Qb2NrZXRDYXJkc01lc3NhZ2VcIik7XHJcbnZhciBEZWFsZXJCdXR0b25NZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0RlYWxlckJ1dHRvbk1lc3NhZ2VcIik7XHJcbnZhciBCZXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0JldE1lc3NhZ2VcIik7XHJcbnZhciBCZXRzVG9Qb3RNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0JldHNUb1BvdE1lc3NhZ2VcIik7XHJcbnZhciBQb3RNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1BvdE1lc3NhZ2VcIik7XHJcbnZhciBUaW1lck1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvVGltZXJNZXNzYWdlXCIpO1xyXG52YXIgQWN0aW9uTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlXCIpO1xyXG52YXIgRm9sZENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlXCIpO1xyXG52YXIgRGVsYXlNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0RlbGF5TWVzc2FnZVwiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcbnZhciBDbGVhck1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ2xlYXJNZXNzYWdlXCIpO1xyXG52YXIgUGF5T3V0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9QYXlPdXRNZXNzYWdlXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnRyb2wgdGhlIHRhYmxlXHJcbiAqIEBjbGFzcyBUYWJsZUNvbnRyb2xsZXJcclxuICovXHJcbmZ1bmN0aW9uIFRhYmxlQ29udHJvbGxlcihtZXNzYWdlU2VxdWVuY2VyLCB2aWV3KSB7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyID0gbWVzc2FnZVNlcXVlbmNlcjtcclxuXHR0aGlzLnZpZXcgPSB2aWV3O1xyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoU2VhdEluZm9NZXNzYWdlLlRZUEUsIHRoaXMub25TZWF0SW5mb01lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihDb21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRSwgdGhpcy5vbkNvbW11bml0eUNhcmRzTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFBvY2tldENhcmRzTWVzc2FnZS5UWVBFLCB0aGlzLm9uUG9ja2V0Q2FyZHNNZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoRGVhbGVyQnV0dG9uTWVzc2FnZS5UWVBFLCB0aGlzLm9uRGVhbGVyQnV0dG9uTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEJldE1lc3NhZ2UuVFlQRSwgdGhpcy5vbkJldE1lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihCZXRzVG9Qb3RNZXNzYWdlLlRZUEUsIHRoaXMub25CZXRzVG9Qb3QsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihQb3RNZXNzYWdlLlRZUEUsIHRoaXMub25Qb3QsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihUaW1lck1lc3NhZ2UuVFlQRSwgdGhpcy5vblRpbWVyLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQWN0aW9uTWVzc2FnZS5UWVBFLCB0aGlzLm9uQWN0aW9uLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoRm9sZENhcmRzTWVzc2FnZS5UWVBFLCB0aGlzLm9uRm9sZENhcmRzLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoRGVsYXlNZXNzYWdlLlRZUEUsIHRoaXMub25EZWxheSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKENsZWFyTWVzc2FnZS5UWVBFLCB0aGlzLm9uQ2xlYXIsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihQYXlPdXRNZXNzYWdlLlRZUEUsIHRoaXMub25QYXlPdXQsIHRoaXMpO1xyXG59XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFRhYmxlQ29udHJvbGxlcik7XHJcblxyXG4vKipcclxuICogU2VhdCBpbmZvIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25TZWF0SW5mb01lc3NhZ2VcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25TZWF0SW5mb01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIHNlYXRWaWV3ID0gdGhpcy52aWV3LmdldFNlYXRWaWV3QnlJbmRleChtLmdldFNlYXRJbmRleCgpKTtcclxuXHJcblx0c2VhdFZpZXcuc2V0TmFtZShtLmdldE5hbWUoKSk7XHJcblx0c2VhdFZpZXcuc2V0Q2hpcHMobS5nZXRDaGlwcygpKTtcclxuXHRzZWF0Vmlldy5zZXRBY3RpdmUobS5pc0FjdGl2ZSgpKTtcclxuXHRzZWF0Vmlldy5zZXRTaXRvdXQobS5pc1NpdG91dCgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlYXQgaW5mbyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQ29tbXVuaXR5Q2FyZHNNZXNzYWdlXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQ29tbXVuaXR5Q2FyZHNNZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBpO1xyXG5cclxuXHRmb3IgKGkgPSAwOyBpIDwgbS5nZXRDYXJkcygpLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgY2FyZERhdGEgPSBtLmdldENhcmRzKClbaV07XHJcblx0XHR2YXIgY2FyZFZpZXcgPSB0aGlzLnZpZXcuZ2V0Q29tbXVuaXR5Q2FyZHMoKVttLmdldEZpcnN0SW5kZXgoKSArIGldO1xyXG5cclxuXHRcdGNhcmRWaWV3LnNldENhcmREYXRhKGNhcmREYXRhKTtcclxuXHRcdGNhcmRWaWV3LnNob3cobS5hbmltYXRlLCBpICogNTAwKTtcclxuXHR9XHJcblx0aWYgKG0uZ2V0Q2FyZHMoKS5sZW5ndGggPiAwKSB7XHJcblx0XHR2YXIgY2FyZERhdGEgPSBtLmdldENhcmRzKClbbS5nZXRDYXJkcygpLmxlbmd0aCAtIDFdO1xyXG5cdFx0dmFyIGNhcmRWaWV3ID0gdGhpcy52aWV3LmdldENvbW11bml0eUNhcmRzKClbbS5nZXRGaXJzdEluZGV4KCkgKyBtLmdldENhcmRzKCkubGVuZ3RoIC0gMV07XHJcblx0XHRpZihtLmFuaW1hdGUpXHJcblx0XHRcdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKGNhcmRWaWV3LCBcImFuaW1hdGlvbkRvbmVcIik7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogUG9ja2V0IGNhcmRzIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25Qb2NrZXRDYXJkc01lc3NhZ2VcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Qb2NrZXRDYXJkc01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIHNlYXRWaWV3ID0gdGhpcy52aWV3LmdldFNlYXRWaWV3QnlJbmRleChtLmdldFNlYXRJbmRleCgpKTtcclxuXHR2YXIgaTtcclxuXHJcblx0Zm9yIChpID0gMDsgaSA8IG0uZ2V0Q2FyZHMoKS5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGNhcmREYXRhID0gbS5nZXRDYXJkcygpW2ldO1xyXG5cdFx0dmFyIGNhcmRWaWV3ID0gc2VhdFZpZXcuZ2V0UG9ja2V0Q2FyZHMoKVttLmdldEZpcnN0SW5kZXgoKSArIGldO1xyXG5cclxuXHRcdGlmKG0uYW5pbWF0ZSlcclxuXHRcdFx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IoY2FyZFZpZXcsIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxuXHRcdGNhcmRWaWV3LnNldENhcmREYXRhKGNhcmREYXRhKTtcclxuXHRcdGNhcmRWaWV3LnNob3cobS5hbmltYXRlLCAxMCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogRGVhbGVyIGJ1dHRvbiBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uRGVhbGVyQnV0dG9uTWVzc2FnZVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkRlYWxlckJ1dHRvbk1lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIGRlYWxlckJ1dHRvblZpZXcgPSB0aGlzLnZpZXcuZ2V0RGVhbGVyQnV0dG9uVmlldygpO1xyXG5cclxuXHRpZiAobS5zZWF0SW5kZXggPCAwKSB7XHJcblx0XHRkZWFsZXJCdXR0b25WaWV3LmhpZGUoKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IoZGVhbGVyQnV0dG9uVmlldywgXCJhbmltYXRpb25Eb25lXCIpO1xyXG5cdFx0ZGVhbGVyQnV0dG9uVmlldy5zaG93KG0uZ2V0U2VhdEluZGV4KCksIG0uZ2V0QW5pbWF0ZSgpKTtcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogQmV0IG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25CZXRNZXNzYWdlXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQmV0TWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XS5iZXRDaGlwcy5zZXRWYWx1ZShtLnZhbHVlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCZXRzIHRvIHBvdC5cclxuICogQG1ldGhvZCBvbkJldHNUb1BvdFxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkJldHNUb1BvdCA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgaGF2ZUNoaXBzID0gZmFsc2U7XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy52aWV3LnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcclxuXHRcdGlmICh0aGlzLnZpZXcuc2VhdFZpZXdzW2ldLmJldENoaXBzLnZhbHVlID4gMClcclxuXHRcdFx0aGF2ZUNoaXBzID0gdHJ1ZTtcclxuXHJcblx0aWYgKCFoYXZlQ2hpcHMpXHJcblx0XHRyZXR1cm47XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy52aWV3LnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcclxuXHRcdHRoaXMudmlldy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMuYW5pbWF0ZUluKCk7XHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKHRoaXMudmlldy5zZWF0Vmlld3NbMF0uYmV0Q2hpcHMsIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBvdCBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uUG90XHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uUG90ID0gZnVuY3Rpb24obSkge1xyXG5cdHRoaXMudmlldy5wb3RWaWV3LnNldFZhbHVlcyhtLnZhbHVlcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGltZXIgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvblRpbWVyXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uVGltZXIgPSBmdW5jdGlvbihtKSB7XHJcblx0aWYgKG0uc2VhdEluZGV4IDwgMClcclxuXHRcdHRoaXMudmlldy50aW1lclZpZXcuaGlkZSgpO1xyXG5cclxuXHRlbHNlIHtcclxuXHRcdHRoaXMudmlldy50aW1lclZpZXcuc2hvdyhtLnNlYXRJbmRleCk7XHJcblx0XHR0aGlzLnZpZXcudGltZXJWaWV3LmNvdW50ZG93bihtLnRvdGFsVGltZSwgbS50aW1lTGVmdCk7XHJcblx0fVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFjdGlvbiBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQWN0aW9uXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQWN0aW9uID0gZnVuY3Rpb24obSkge1xyXG5cdGlmIChtLnNlYXRJbmRleCA9PSBudWxsKVxyXG5cdFx0bS5zZWF0SW5kZXggPSAwO1xyXG5cclxuXHR0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XS5hY3Rpb24obS5hY3Rpb24pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZvbGQgY2FyZHMgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkZvbGRDYXJkc1xyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkZvbGRDYXJkcyA9IGZ1bmN0aW9uKG0pIHtcclxuXHR0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XS5mb2xkQ2FyZHMoKTtcclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IodGhpcy52aWV3LnNlYXRWaWV3c1ttLnNlYXRJbmRleF0sIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWxheSBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uRGVsYXlcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25EZWxheSA9IGZ1bmN0aW9uKG0pIHtcclxuXHRjb25zb2xlLmxvZyhcImRlbGF5IGZvciAgPSBcIiArIG0uZGVsYXkpO1xyXG5cclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IodGhpcywgXCJ0aW1lckRvbmVcIik7XHJcblx0c2V0VGltZW91dCh0aGlzLmRpc3BhdGNoRXZlbnQuYmluZCh0aGlzLCBcInRpbWVyRG9uZVwiKSwgbS5kZWxheSk7XHJcblxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENsZWFyIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25DbGVhclxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkNsZWFyID0gZnVuY3Rpb24obSkge1xyXG5cclxuXHR2YXIgY29tcG9uZW50cyA9IG0uZ2V0Q29tcG9uZW50cygpO1xyXG5cclxuXHRmb3IodmFyIGkgPSAwOyBpIDwgY29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0c3dpdGNoKGNvbXBvbmVudHNbaV0pIHtcclxuXHRcdFx0Y2FzZSBDbGVhck1lc3NhZ2UuUE9UOiB7XHJcblx0XHRcdFx0dGhpcy52aWV3LnBvdFZpZXcuc2V0VmFsdWVzKFtdKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlIENsZWFyTWVzc2FnZS5CRVRTOiB7XHJcblx0XHRcdFx0Zm9yKHZhciBzID0gMDsgcyA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBzKyspIHtcclxuXHRcdFx0XHRcdHRoaXMudmlldy5zZWF0Vmlld3Nbc10uYmV0Q2hpcHMuc2V0VmFsdWUoMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgQ2xlYXJNZXNzYWdlLkNBUkRTOiB7XHJcblx0XHRcdFx0Zm9yKHZhciBzID0gMDsgcyA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBzKyspIHtcclxuXHRcdFx0XHRcdGZvcih2YXIgYyA9IDA7IGMgPCB0aGlzLnZpZXcuc2VhdFZpZXdzW3NdLnBvY2tldENhcmRzLmxlbmd0aDsgYysrKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMudmlldy5zZWF0Vmlld3Nbc10ucG9ja2V0Q2FyZHNbY10uaGlkZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Zm9yKHZhciBjID0gMDsgYyA8IHRoaXMudmlldy5jb21tdW5pdHlDYXJkcy5sZW5ndGg7IGMrKykge1xyXG5cdFx0XHRcdFx0dGhpcy52aWV3LmNvbW11bml0eUNhcmRzW2NdLmhpZGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSBDbGVhck1lc3NhZ2UuQ0hBVDoge1xyXG5cdFx0XHRcdHRoaXMudmlldy5jaGF0Vmlldy5jbGVhcigpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogUGF5IG91dCBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uUGF5T3V0XHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uUGF5T3V0ID0gZnVuY3Rpb24obSkge1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbS52YWx1ZXMubGVuZ3RoOyBpKyspXHJcblx0XHR0aGlzLnZpZXcuc2VhdFZpZXdzW2ldLmJldENoaXBzLnNldFZhbHVlKG0udmFsdWVzW2ldKTtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxyXG5cdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tpXS5iZXRDaGlwcy5hbmltYXRlT3V0KCk7XHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKHRoaXMudmlldy5zZWF0Vmlld3NbMF0uYmV0Q2hpcHMsIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRhYmxlQ29udHJvbGxlcjsiLCJOZXRQb2tlckNsaWVudCA9IHJlcXVpcmUoXCIuL2FwcC9OZXRQb2tlckNsaWVudFwiKTtcbi8vdmFyIG5ldFBva2VyQ2xpZW50ID0gbmV3IE5ldFBva2VyQ2xpZW50KCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0dGV4dHVyZXM6IFtcblx0XHR7XG5cdFx0XHRpZDogXCJjb21wb25lbnRzVGV4dHVyZVwiLFxuXHRcdFx0ZmlsZTogXCJjb21wb25lbnRzLnBuZ1wiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJ0YWJsZUJhY2tncm91bmRcIixcblx0XHRcdGZpbGU6IFwidGFibGUucG5nXCJcblx0XHR9XG5cdF0sXG5cdHRhYmxlQmFja2dyb3VuZDogXCJ0YWJsZUJhY2tncm91bmRcIixcblx0ZGVmYXVsdFRleHR1cmU6IFwiY29tcG9uZW50c1RleHR1cmVcIixcblxuXHRzZWF0UG9zaXRpb25zOiBbXG5cdFx0WzI4NywgMTE4XSwgWzQ4MywgMTEyXSwgWzY3NiwgMTE4XSxcblx0XHRbODQ0LCAyNDddLCBbODE3LCA0MTNdLCBbNjc2LCA0OTBdLFxuXHRcdFs0ODMsIDQ5NV0sIFsyODcsIDQ5MF0sIFsxNDAsIDQxM10sXG5cdFx0WzEyMywgMjQ3XVxuXHRdLFxuXG5cdHRpbWVyQmFja2dyb3VuZDogWzEyMSwyMDAsMzIsMzJdLFxuXG5cdHNlYXRQbGF0ZTogWzQwLCAxMTYsIDE2MCwgNzBdLFxuXG5cdGNvbW11bml0eUNhcmRzUG9zaXRpb246IFsyNTUsIDE5MF0sXG5cblx0Y2FyZEZyYW1lOiBbNDk4LCAyNTYsIDg3LCAxMjJdLFxuXHRjYXJkQmFjazogWzQwMiwgMjU2LCA4NywgMTIyXSxcblxuXHRkaXZpZGVyTGluZTogWzU2OCwgNzcsIDIsIDE3MF0sXG5cblx0c3VpdFN5bWJvbHM6IFtcblx0XHRbMjQ2LCA2NywgMTgsIDE5XSxcblx0XHRbMjY5LCA2NywgMTgsIDE5XSxcblx0XHRbMjkyLCA2NywgMTgsIDE5XSxcblx0XHRbMzE1LCA2NywgMTgsIDE5XVxuXHRdLFxuXG5cdGZyYW1lUGxhdGU6IFszMDEsIDI2MiwgNzQsIDc2XSxcblx0YmlnQnV0dG9uOiBbMzMsIDI5OCwgOTUsIDk0XSxcblx0ZGlhbG9nQnV0dG9uOiBbMzgzLCA0NjEsIDgyLCA0N10sXG5cdGRlYWxlckJ1dHRvbjogWzE5NywgMjM2LCA0MSwgMzVdLFxuXG5cdGRlYWxlckJ1dHRvblBvc2l0aW9uczogW1xuXHRcdFszNDcsIDEzM10sIFszOTUsIDEzM10sIFs1NzQsIDEzM10sXG5cdFx0Wzc2MiwgMjY3XSwgWzcxNSwgMzU4XSwgWzU3NCwgNDM0XSxcblx0XHRbNTM2LCA0MzJdLCBbMzUxLCA0MzJdLCBbMTkzLCAzNjJdLFxuXHRcdFsxNjgsIDI2Nl1cblx0XSxcblxuXHR0ZXh0U2Nyb2xsYmFyVHJhY2s6IFszNzEsNTAsNjAsMTBdLFxuXHR0ZXh0U2Nyb2xsYmFyVGh1bWI6IFszNzEsMzIsNjAsMTBdLFxuXG5cblx0YmV0QWxpZ246IFtcblx0XHRcImxlZnRcIiwgXCJjZW50ZXJcIiwgXCJyaWdodFwiLFxuXHRcdFwicmlnaHRcIiwgXCJyaWdodFwiLCBcblx0XHRcInJpZ2h0XCIsIFwiY2VudGVyXCIsIFwibGVmdFwiLFxuXHRcdFwibGVmdFwiLCBcImxlZnRcIlxuXHRdLFxuXG5cdGJldFBvc2l0aW9uczogW1xuXHRcdFsyMjUsMTUwXSwgWzQ3OCwxNTBdLCBbNzMwLDE1MF0sXG5cdFx0Wzc3OCwxOTZdLCBbNzQ4LDMyMl0sIFs3MTksMzYwXSxcblx0XHRbNDgxLDM2MF0sIFsyMzIsMzYwXSwgWzE5OSwzMjJdLFxuXHRcdFsxODEsMjAwXVxuXHRdLFxuXHRjaGlwczogW1xuXHRcdFszMCwgMjUsIDQwLCAzMF0sXG5cdFx0WzcwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTEwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTUwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTkwLCAyNSwgNDAsIDMwXVxuXHRdLFxuXHRjaGlwc0NvbG9yczogWzB4NDA0MDQwLCAweDAwODAwMCwgMHg4MDgwMDAsIDB4MDAwMDgwLCAweGZmMDAwMF0sXG5cdHBvdFBvc2l0aW9uOiBbNDg1LDMxNV0sXG5cdHdyZW5jaEljb246IFs0NjIsMzg5LDIxLDIxXSxcblx0Y2hhdEJhY2tncm91bmQ6IFszMDEsMjYyLDc0LDc2XSxcblx0Y2hlY2tib3hCYWNrZ3JvdW5kOiBbNTAxLDM5MSwxOCwxOF0sXG5cdGNoZWNrYm94VGljazogWzUyOCwzOTIsMjEsMTZdLFxuXHRidXR0b25CYWNrZ3JvdW5kOiBbNjgsNDQ2LDY0LDY0XSxcblx0c2xpZGVyQmFja2dyb3VuZDogWzMxMyw0MDcsMTIwLDMwXSxcblx0c2xpZGVyS25vYjogWzMxOCwzNzcsMjgsMjhdLFxuXHRiaWdCdXR0b25Qb3NpdGlvbjogWzM2Niw1NzVdLFxuXHR1cEFycm93OiBbNDgzLDY0LDEyLDhdXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvUG9pbnRcIik7XHJcbnZhciBEZWZhdWx0U2tpbiA9IHJlcXVpcmUoXCIuL0RlZmF1bHRTa2luXCIpO1xyXG5cclxuLyoqXHJcbiAqIENsaWVudCByZXNvdXJjZXNcclxuICogQGNsYXNzIFJlc291cmNlcy5cclxuICovXHJcbmZ1bmN0aW9uIFJlc291cmNlcygpIHtcclxuXHR2YXIgaTtcclxuXHJcblx0dGhpcy5kZWZhdWx0U2tpbiA9IERlZmF1bHRTa2luO1xyXG5cdHRoaXMuc2tpbiA9IG51bGw7XHJcblxyXG5cclxuXHQgdGhpcy5BbGlnbiA9IHtcclxuXHQgXHRMZWZ0OiBcImxlZnRcIixcclxuXHQgXHRSaWdodDogXCJyaWdodFwiLFxyXG5cdCBcdENlbnRlcjogXCJjZW50ZXJcIlxyXG5cdCB9O1xyXG5cclxuXHQgdGhpcy50ZXh0dXJlcyA9IHt9O1xyXG4vKlxyXG5cdHRoaXMuY29tcG9uZW50c1RleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlLmZyb21JbWFnZShcImNvbXBvbmVudHMucG5nXCIpO1xyXG5cdHRoaXMudGFibGVCYWNrZ3JvdW5kID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShcInRhYmxlLnBuZ1wiKTtcclxuXHJcblx0dGhpcy5zZWF0UG9zaXRpb25zID0gW1xyXG5cdFx0UG9pbnQoMjg3LCAxMTgpLCBQb2ludCg0ODMsIDExMiksIFBvaW50KDY3NiwgMTE4KSxcclxuXHRcdFBvaW50KDg0NCwgMjQ3KSwgUG9pbnQoODE3LCA0MTMpLCBQb2ludCg2NzYsIDQ5MCksXHJcblx0XHRQb2ludCg0ODMsIDQ5NSksIFBvaW50KDI4NywgNDkwKSwgUG9pbnQoMTQwLCA0MTMpLFxyXG5cdFx0UG9pbnQoMTIzLCAyNDcpXHJcblx0XTtcclxuXHJcblx0dGhpcy50aW1lckJhY2tncm91bmQgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDEyMSwyMDAsMzIsMzIpOyBcclxuXHJcblx0dGhpcy5zZWF0UGxhdGUgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDQwLCAxMTYsIDE2MCwgNzApO1xyXG5cclxuXHR0aGlzLmNvbW11bml0eUNhcmRzUG9zaXRpb24gPSBQb2ludCgyNTUsIDE5MCk7XHJcblxyXG5cdHRoaXMuY2FyZEZyYW1lID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg0OTgsIDI1NiwgODcsIDEyMik7XHJcblx0dGhpcy5jYXJkQmFjayA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoNDAyLCAyNTYsIDg3LCAxMjIpO1xyXG5cclxuXHR0aGlzLmRpdmlkZXJMaW5lID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg1NjgsIDc3LCAyLCAxNzApO1xyXG5cclxuXHR0aGlzLnN1aXRTeW1ib2xzID0gW107XHJcblx0Zm9yIChpID0gMDsgaSA8IDQ7IGkrKylcclxuXHRcdHRoaXMuc3VpdFN5bWJvbHMucHVzaCh0aGlzLmdldENvbXBvbmVudHNQYXJ0KDI0NiArIGkgKiAyMywgNjcsIDE4LCAxOSkpO1xyXG5cclxuXHR0aGlzLmZyYW1lUGxhdGUgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDMwMSwgMjYyLCA3NCwgNzYpO1xyXG5cdHRoaXMuYmlnQnV0dG9uID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzMywgMjk4LCA5NSwgOTQpO1xyXG5cdHRoaXMuZGlhbG9nQnV0dG9uID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzODMsIDQ2MSwgODIsIDQ3KTtcclxuXHR0aGlzLmRlYWxlckJ1dHRvbiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMTk3LCAyMzYsIDQxLCAzNSk7XHJcblxyXG5cdHRoaXMuZGVhbGVyQnV0dG9uUG9zaXRpb25zID0gW1xyXG5cdFx0UG9pbnQoMzQ3LCAxMzMpLCBQb2ludCgzOTUsIDEzMyksIFBvaW50KDU3NCwgMTMzKSxcclxuXHRcdFBvaW50KDc2MiwgMjY3KSwgUG9pbnQoNzE1LCAzNTgpLCBQb2ludCg1NzQsIDQzNCksXHJcblx0XHRQb2ludCg1MzYsIDQzMiksIFBvaW50KDM1MSwgNDMyKSwgUG9pbnQoMTkzLCAzNjIpLFxyXG5cdFx0UG9pbnQoMTY4LCAyNjYpXHJcblx0XTtcclxuXHJcblx0dGhpcy50ZXh0U2Nyb2xsYmFyVHJhY2sgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDM3MSw1MCw2MCwxMCk7XHJcblx0dGhpcy50ZXh0U2Nyb2xsYmFyVGh1bWIgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDM3MSwzMiw2MCwxMCk7XHJcblxyXG5cdCB0aGlzLkFsaWduID0ge1xyXG5cdCBcdExlZnQ6IFwibGVmdFwiLFxyXG5cdCBcdFJpZ2h0OiBcInJpZ2h0XCIsXHJcblx0IFx0Q2VudGVyOiBcImNlbnRlclwiLFxyXG5cdCB9O1xyXG5cclxuXHR0aGlzLmJldEFsaWduID0gW1xyXG5cdFx0XHR0aGlzLkFsaWduLkxlZnQsIHRoaXMuQWxpZ24uQ2VudGVyLCB0aGlzLkFsaWduLlJpZ2h0LFxyXG5cdFx0XHR0aGlzLkFsaWduLlJpZ2h0LCB0aGlzLkFsaWduLlJpZ2h0LCBcclxuXHRcdFx0dGhpcy5BbGlnbi5SaWdodCwgdGhpcy5BbGlnbi5DZW50ZXIsIHRoaXMuQWxpZ24uTGVmdCxcclxuXHRcdFx0dGhpcy5BbGlnbi5MZWZ0LCB0aGlzLkFsaWduLkxlZnRcclxuXHRcdF07XHJcblxyXG5cdHRoaXMuYmV0UG9zaXRpb25zID0gW1xyXG5cdFx0XHRQb2ludCgyMjUsMTUwKSwgUG9pbnQoNDc4LDE1MCksIFBvaW50KDczMCwxNTApLFxyXG5cdFx0XHRQb2ludCg3NzgsMTk2KSwgUG9pbnQoNzQ4LDMyMiksIFBvaW50KDcxOSwzNjApLFxyXG5cdFx0XHRQb2ludCg0ODEsMzYwKSwgUG9pbnQoMjMyLDM2MCksIFBvaW50KDE5OSwzMjIpLFxyXG5cdFx0XHRQb2ludCgxODEsMjAwKVxyXG5cdFx0XTtcclxuXHJcblx0dGhpcy5jaGlwcyA9IG5ldyBBcnJheSgpO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgNTsgaSsrKSB7XHJcblx0XHR2YXIgYiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzAgKyBpKjQwLCAyNSwgNDAsIDMwKTtcclxuXHRcdHRoaXMuY2hpcHMucHVzaChiKTtcclxuXHR9XHJcblxyXG5cdHRoaXMuY2hpcHNDb2xvcnMgPSBbMHg0MDQwNDAsIDB4MDA4MDAwLCAweDgwODAwMCwgMHgwMDAwODAsIDB4ZmYwMDAwXTtcclxuXHJcblx0dGhpcy5wb3RQb3NpdGlvbiA9IFBvaW50KDQ4NSwzMTUpO1xyXG5cdCovXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdmFsdWUgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxyXG4gKiBAbWV0aG9kIGdldFZhbHVlXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oa2V5KSB7XHJcblx0dmFyIHZhbHVlID0gbnVsbDtcclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpXHJcblx0XHR2YWx1ZSA9IHRoaXMuc2tpbltrZXldO1xyXG5cdGVsc2VcclxuXHRcdHZhbHVlID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xyXG5cclxuXHRpZih2YWx1ZSA9PSBudWxsKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XHJcblx0fSBcclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHBvaW50IGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cclxuICogQG1ldGhvZCBnZXRQb2ludFxyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRQb2ludCA9IGZ1bmN0aW9uKGtleSkge1xyXG5cdHZhciB2YWx1ZSA9IG51bGw7XHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbltrZXldICE9IG51bGwpKVxyXG5cdFx0dmFsdWUgPSBQb2ludCh0aGlzLnNraW5ba2V5XVswXSwgdGhpcy5za2luW2tleV1bMV0pO1xyXG5cdGVsc2VcclxuXHRcdHZhbHVlID0gUG9pbnQodGhpcy5kZWZhdWx0U2tpbltrZXldWzBdLCB0aGlzLmRlZmF1bHRTa2luW2tleV1bMV0pO1xyXG5cclxuXHRpZih2YWx1ZSA9PSBudWxsKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XHJcblx0fSBcclxuXHJcblx0cmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHBvaW50cyBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0UG9pbnRzXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFBvaW50cyA9IGZ1bmN0aW9uKGtleSkge1xyXG5cdHZhciB2YWx1ZXMgPSBudWxsO1xyXG5cclxuXHR2YXIgcG9pbnRzID0gbmV3IEFycmF5KCk7XHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbltrZXldICE9IG51bGwpKVxyXG5cdFx0dmFsdWVzID0gdGhpcy5za2luW2tleV07XHJcblx0ZWxzZVxyXG5cdFx0dmFsdWVzID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xyXG5cclxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRwb2ludHMucHVzaChQb2ludCh2YWx1ZXNbaV1bMF0sIHZhbHVlc1tpXVsxXSkpO1xyXG5cdH1cclxuXHJcblx0aWYocG9pbnRzLmxlbmd0aCA8PSAwKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XHJcblx0fSBcclxuXHJcblx0cmV0dXJuIHBvaW50cztcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0ZXh0dXJlIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cclxuICogQG1ldGhvZCBnZXRUZXh0dXJlXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFRleHR1cmUgPSBmdW5jdGlvbihrZXksIGluZGV4KSB7XHJcblx0dmFyIHZhbHVlID0gbnVsbDtcclxuXHR2YXIgaXNEZWZhdWx0ID0gZmFsc2U7XHJcblx0dmFyIHRleHR1cmUgPSBudWxsO1xyXG5cdHZhciBmcmFtZSA9IG51bGw7XHJcblxyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSkge1xyXG5cdFx0dmFsdWUgPSB0aGlzLnNraW5ba2V5XTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR2YWx1ZSA9IHRoaXMuZGVmYXVsdFNraW5ba2V5XTtcclxuXHRcdGlzRGVmYXVsdCA9IHRydWU7XHJcblx0fVxyXG4vL1x0Y29uc29sZS5sb2coXCJ2YWx1ZSA9IFwiICsgdmFsdWUgKyBcIiwga2V5ID0gXCIgK2tleSk7XHJcblxyXG5cclxuXHRpZih2YWx1ZS50ZXh0dXJlICE9IG51bGwpIHtcclxuXHRcdHRleHR1cmUgPSB2YWx1ZS50ZXh0dXJlO1xyXG5cdH1cclxuXHRlbHNlIGlmKCFpc0RlZmF1bHQgJiYgKHRoaXMuc2tpbi5kZWZhdWx0VGV4dHVyZSAhPSBudWxsKSkge1xyXG5cdFx0dGV4dHVyZSA9IHRoaXMuc2tpbi5kZWZhdWx0VGV4dHVyZTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR0ZXh0dXJlID0gdGhpcy5kZWZhdWx0U2tpbi5kZWZhdWx0VGV4dHVyZTtcclxuXHR9XHJcblxyXG5cdGlmKHZhbHVlLmNvb3JkcyAhPSBudWxsKSB7XHJcblx0XHRmcmFtZSA9IHZhbHVlLmNvb3JkcztcclxuXHR9XHJcblx0ZWxzZSBpZih0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdHRleHR1cmUgPSB2YWx1ZTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRmcmFtZSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0aWYodGV4dHVyZSAhPSBudWxsKSB7XHJcblx0XHRpZihmcmFtZSAhPSBudWxsKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRDb21wb25lbnRzUGFydCh0ZXh0dXJlLCBmcmFtZVswXSwgZnJhbWVbMV0sIGZyYW1lWzJdLCBmcmFtZVszXSk7XHJcblx0XHRlbHNlXHJcblx0XHRcdHJldHVybiB0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lKTtcclxuXHR9XHJcblxyXG5cclxuXHRcclxuXHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XHJcblx0XHJcblx0cmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGV4dHVyZXMgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxyXG4gKiBAbWV0aG9kIGdldFRleHR1cmVzXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFRleHR1cmVzID0gZnVuY3Rpb24oa2V5KSB7XHJcblx0dmFyIHZhbHVlcyA9IG51bGw7XHJcblx0dmFyIGlzRGVmYXVsdCA9IGZhbHNlO1xyXG5cclxuXHRcclxuXHRcclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpIHtcclxuXHRcdHZhbHVlcyA9IHRoaXMuc2tpbltrZXldO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHZhbHVlcyA9IHRoaXMuZGVmYXVsdFNraW5ba2V5XTtcclxuXHRcdGlzRGVmYXVsdCA9IHRydWU7XHJcblx0fVxyXG5cclxuXHJcblx0dmFyIGZyYW1lID0gbnVsbDtcclxuXHR2YXIgdGV4dHVyZSA9IG51bGw7XHJcblx0dmFyIHRleHR1cmVzID0gbmV3IEFycmF5KCk7XHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0ZnJhbWUgPSBudWxsO1xyXG5cdFx0dGV4dHVyZSA9IG51bGw7XHJcblx0XHRcclxuXHRcdGlmKHZhbHVlc1tpXS50ZXh0dXJlICE9IG51bGwpIHtcclxuXHRcdFx0dGV4dHVyZSA9IHZhbHVlc1tpXS50ZXh0dXJlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZighaXNEZWZhdWx0ICYmICh0aGlzLnNraW4uZGVmYXVsdFRleHR1cmUgIT0gbnVsbCkpIHtcclxuXHRcdFx0dGV4dHVyZSA9IHRoaXMuc2tpbi5kZWZhdWx0VGV4dHVyZTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0ZXh0dXJlID0gdGhpcy5kZWZhdWx0U2tpbi5kZWZhdWx0VGV4dHVyZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZih2YWx1ZXNbaV0uY29vcmRzICE9IG51bGwpIHtcclxuXHRcdFx0ZnJhbWUgPSB2YWx1ZXNbaV0uY29vcmRzO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZih0eXBlb2YgdmFsdWVzW2ldID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHRleHR1cmUgPSB2YWx1ZXNbaV07XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZnJhbWUgPSB2YWx1ZXNbaV07XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodGV4dHVyZSAhPSBudWxsKSB7XHJcblx0XHRcdGlmKGZyYW1lICE9IG51bGwpXHJcblx0XHRcdFx0dGV4dHVyZXMucHVzaCh0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lWzBdLCBmcmFtZVsxXSwgZnJhbWVbMl0sIGZyYW1lWzNdKSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR0ZXh0dXJlcy5wdXNoKHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWUpKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdFxyXG5cdGlmKHRleHR1cmVzLmxlbmd0aCA8PSAwKVxyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xyXG5cdCBcclxuXHJcblx0cmV0dXJuIHRleHR1cmVzO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHBhcnQgZnJvbSBjb21wb25lbnRzIGF0bGFzLlxyXG4gKiBAbWV0aG9kIGdldENvbXBvbmVudHNQYXJ0XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldENvbXBvbmVudHNQYXJ0ID0gZnVuY3Rpb24odGV4dHVyZWlkLCB4LCB5LCB3LCBoKSB7XHJcblxyXG5cdHZhciBmcmFtZTtcclxuXHR2YXIgdGV4dHVyZSA9IHRoaXMuZ2V0VGV4dHVyZUZyb21Ta2luKHRleHR1cmVpZCk7XHJcblxyXG5cdGlmKHggPT09IG51bGwpIHtcclxuXHRcdGZyYW1lID0ge1xyXG5cdFx0XHR4OiAwLFxyXG5cdFx0XHR5OiAwLFxyXG5cdFx0XHR3aWR0aDogdGV4dHVyZS53aWR0aCxcclxuXHRcdFx0aGVpZ2h0OiB0ZXh0dXJlLmhlaWdodFxyXG5cdFx0fTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRmcmFtZSA9IHtcclxuXHRcdFx0eDogeCxcclxuXHRcdFx0eTogeSxcclxuXHRcdFx0d2lkdGg6IHcsXHJcblx0XHRcdGhlaWdodDogaFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBuZXcgUElYSS5UZXh0dXJlKHRleHR1cmUsIGZyYW1lKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0ZXh0dXJlIG9iamVjdCBmcm9tIHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0VGV4dHVyZUZyb21Ta2luXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFRleHR1cmVGcm9tU2tpbiA9IGZ1bmN0aW9uKHRleHR1cmVpZCkge1xyXG5cclxuXHR2YXIgdGV4dHVyZU9iamVjdCA9IG51bGw7XHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbi50ZXh0dXJlcyAhPSBudWxsKSkge1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc2tpbi50ZXh0dXJlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZih0aGlzLnNraW4udGV4dHVyZXNbaV0uaWQgPT0gdGV4dHVyZWlkKSB7XHJcblx0XHRcdFx0dGV4dHVyZU9iamVjdCA9IHRoaXMuc2tpbi50ZXh0dXJlc1tpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRpZih0ZXh0dXJlT2JqZWN0ID09IG51bGwpIHtcclxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmRlZmF1bHRTa2luLnRleHR1cmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmKHRoaXMuZGVmYXVsdFNraW4udGV4dHVyZXNbaV0uaWQgPT0gdGV4dHVyZWlkKSB7XHJcblx0XHRcdFx0dGV4dHVyZU9iamVjdCA9IHRoaXMuZGVmYXVsdFNraW4udGV4dHVyZXNbaV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGlmKHRleHR1cmVPYmplY3QgPT0gbnVsbCkge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwidGV4dHVyZWlkIGRvZXNuJ3QgZXhpc3Q6IFwiICsgdGV4dHVyZWlkKTtcclxuXHR9XHJcblxyXG5cdGlmKHRoaXMudGV4dHVyZXNbdGV4dHVyZU9iamVjdC5pZF0gPT0gbnVsbClcclxuXHRcdHRoaXMudGV4dHVyZXNbdGV4dHVyZU9iamVjdC5pZF0gPSBuZXcgUElYSS5UZXh0dXJlLmZyb21JbWFnZSh0ZXh0dXJlT2JqZWN0LmZpbGUpO1xyXG5cclxuXHRyZXR1cm4gdGhpcy50ZXh0dXJlc1t0ZXh0dXJlT2JqZWN0LmlkXTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBHZXQgc2luZ2xldG9uIGluc3RhbmNlLlxyXG4gKiBAbWV0aG9kIGdldEluc3RhbmNlXHJcbiAqL1xyXG5SZXNvdXJjZXMuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbigpIHtcclxuXHRpZiAoIVJlc291cmNlcy5pbnN0YW5jZSlcclxuXHRcdFJlc291cmNlcy5pbnN0YW5jZSA9IG5ldyBSZXNvdXJjZXMoKTtcclxuXHJcblx0cmV0dXJuIFJlc291cmNlcy5pbnN0YW5jZTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZXM7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG5cbi8qKlxuICogQmlnIGJ1dHRvbi5cbiAqIEBjbGFzcyBCaWdCdXR0b25cbiAqL1xuZnVuY3Rpb24gQmlnQnV0dG9uKCkge1xuXHRCdXR0b24uY2FsbCh0aGlzKTtcblxuXHR0aGlzLmJpZ0J1dHRvblRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiYmlnQnV0dG9uXCIpO1xuXG5cdHRoaXMuYWRkQ2hpbGQobmV3IFBJWEkuU3ByaXRlKHRoaXMuYmlnQnV0dG9uVGV4dHVyZSkpO1xuXG5cdHZhciBzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMThweCBBcmlhbFwiLFxuXHRcdC8vZmlsbDogXCIjMDAwMDAwXCJcblx0fTtcblxuXHR0aGlzLmxhYmVsRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW2J1dHRvbl1cIiwgc3R5bGUpO1xuXHR0aGlzLmxhYmVsRmllbGQucG9zaXRpb24ueSA9IDMwO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMubGFiZWxGaWVsZCk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAxNHB4IEFyaWFsXCJcblx0XHQvL2ZpbGw6IFwiIzAwMDAwMFwiXG5cdH07XG5cblx0dGhpcy52YWx1ZUZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt2YWx1ZV1cIiwgc3R5bGUpO1xuXHR0aGlzLnZhbHVlRmllbGQucG9zaXRpb24ueSA9IDUwO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudmFsdWVGaWVsZCk7XG5cblx0dGhpcy5zZXRMYWJlbChcIlRFU1RcIik7XG5cdHRoaXMuc2V0VmFsdWUoMTIzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChCaWdCdXR0b24sIEJ1dHRvbik7XG5cbi8qKlxuICogU2V0IGxhYmVsIGZvciB0aGUgYnV0dG9uLlxuICogQG1ldGhvZCBzZXRMYWJlbFxuICovXG5CaWdCdXR0b24ucHJvdG90eXBlLnNldExhYmVsID0gZnVuY3Rpb24obGFiZWwpIHtcblx0dGhpcy5sYWJlbEZpZWxkLnNldFRleHQobGFiZWwpO1xuXHR0aGlzLmxhYmVsRmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cdHRoaXMubGFiZWxGaWVsZC54ID0gdGhpcy5iaWdCdXR0b25UZXh0dXJlLndpZHRoIC8gMiAtIHRoaXMubGFiZWxGaWVsZC53aWR0aCAvIDI7XG59XG5cbi8qKlxuICogU2V0IHZhbHVlLlxuICogQG1ldGhvZCBzZXRWYWx1ZVxuICovXG5CaWdCdXR0b24ucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcblx0aWYgKCF2YWx1ZSkge1xuXHRcdHRoaXMudmFsdWVGaWVsZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0dmFsdWUgPSBcIlwiO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMudmFsdWVGaWVsZC52aXNpYmxlID0gdHJ1ZTtcblx0fVxuXG5cdHRoaXMudmFsdWVGaWVsZC5zZXRUZXh0KHZhbHVlKTtcblx0dGhpcy52YWx1ZUZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXHR0aGlzLnZhbHVlRmllbGQueCA9IHRoaXMuYmlnQnV0dG9uVGV4dHVyZS53aWR0aCAvIDIgLSB0aGlzLnZhbHVlRmllbGQud2lkdGggLyAyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJpZ0J1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xyXG52YXIgU2xpZGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1NsaWRlclwiKTtcclxudmFyIE5pbmVTbGljZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9OaW5lU2xpY2VcIik7XHJcbnZhciBCaWdCdXR0b24gPSByZXF1aXJlKFwiLi9CaWdCdXR0b25cIik7XHJcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcclxudmFyIFJhaXNlU2hvcnRjdXRCdXR0b24gPSByZXF1aXJlKFwiLi9SYWlzZVNob3J0Y3V0QnV0dG9uXCIpO1xyXG5cclxuLyoqXHJcbiAqIEJ1dHRvbnNcclxuICogQGNsYXNzIEJ1dHRvbnNWaWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBCdXR0b25zVmlldygpIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHJcblx0dGhpcy5idXR0b25Ib2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJ1dHRvbkhvbGRlcik7XHJcblxyXG5cdHZhciBzbGlkZXJCYWNrZ3JvdW5kID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwic2xpZGVyQmFja2dyb3VuZFwiKSwgMjAsIDAsIDIwLCAwKTtcclxuXHRzbGlkZXJCYWNrZ3JvdW5kLndpZHRoID0gMzAwO1xyXG5cclxuXHR2YXIga25vYiA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwic2xpZGVyS25vYlwiKSk7XHJcblxyXG5cdHRoaXMuc2xpZGVyID0gbmV3IFNsaWRlcihzbGlkZXJCYWNrZ3JvdW5kLCBrbm9iKTtcclxuXHR2YXIgcG9zID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJiaWdCdXR0b25Qb3NpdGlvblwiKTtcclxuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi54ID0gcG9zLng7XHJcblx0dGhpcy5zbGlkZXIucG9zaXRpb24ueSA9IHBvcy55IC0gMzU7XHJcblx0dGhpcy5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uU2xpZGVyQ2hhbmdlLCB0aGlzKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuc2xpZGVyKTtcclxuXHJcblxyXG5cdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnggPSAzNjY7XHJcblx0dGhpcy5idXR0b25Ib2xkZXIucG9zaXRpb24ueSA9IDU3NTtcclxuXHJcblx0dGhpcy5idXR0b25zID0gW107XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XHJcblx0XHR2YXIgYnV0dG9uID0gbmV3IEJpZ0J1dHRvbigpO1xyXG5cdFx0YnV0dG9uLm9uKEJ1dHRvbi5DTElDSywgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcclxuXHRcdGJ1dHRvbi5wb3NpdGlvbi54ID0gaSAqIDEwNTtcclxuXHRcdHRoaXMuYnV0dG9uSG9sZGVyLmFkZENoaWxkKGJ1dHRvbik7XHJcblx0XHR0aGlzLmJ1dHRvbnMucHVzaChidXR0b24pO1xyXG5cdH1cclxuXHJcblx0dmFyIHJhaXNlU3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJzbGlkZXJLbm9iXCIpKTtcclxuXHR2YXIgYXJyb3dTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInVwQXJyb3dcIikpO1xyXG5cdGFycm93U3ByaXRlLnBvc2l0aW9uLnggPSAocmFpc2VTcHJpdGUud2lkdGggLSBhcnJvd1Nwcml0ZS53aWR0aCkqMC41IC0gMC41O1xyXG5cdGFycm93U3ByaXRlLnBvc2l0aW9uLnkgPSAocmFpc2VTcHJpdGUuaGVpZ2h0IC0gYXJyb3dTcHJpdGUuaGVpZ2h0KSowLjUgLSAyO1xyXG5cdHJhaXNlU3ByaXRlLmFkZENoaWxkKGFycm93U3ByaXRlKTtcclxuXHJcblx0dGhpcy5yYWlzZU1lbnVCdXR0b24gPSBuZXcgQnV0dG9uKHJhaXNlU3ByaXRlKTtcclxuXHR0aGlzLnJhaXNlTWVudUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKEJ1dHRvbi5DTElDSywgdGhpcy5vblJhaXNlTWVudUJ1dHRvbkNsaWNrLCB0aGlzKTtcclxuXHR0aGlzLnJhaXNlTWVudUJ1dHRvbi5wb3NpdGlvbi54ID0gMioxMDUgKyA3MDtcclxuXHR0aGlzLnJhaXNlTWVudUJ1dHRvbi5wb3NpdGlvbi55ID0gLTU7XHJcblx0dGhpcy5idXR0b25Ib2xkZXIuYWRkQ2hpbGQodGhpcy5yYWlzZU1lbnVCdXR0b24pO1xyXG5cclxuXHR0aGlzLnJhaXNlTWVudUJ1dHRvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0dGhpcy5jcmVhdGVSYWlzZUFtb3VudE1lbnUoKTtcclxuXHJcblx0dGhpcy5zZXRCdXR0b25zKFtdLCAwLCAtMSwgLTEpO1xyXG5cclxuXHR0aGlzLmJ1dHRvbnNEYXRhcyA9IFtdO1xyXG59XHJcblxyXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEJ1dHRvbnNWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xyXG5FdmVudERpc3BhdGNoZXIuaW5pdChCdXR0b25zVmlldyk7XHJcblxyXG5CdXR0b25zVmlldy5CVVRUT05fQ0xJQ0sgPSBcImJ1dHRvbkNsaWNrXCI7XHJcblxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByYWlzZSBhbW91bnQgbWVudS5cclxuICogQG1ldGhvZCBjcmVhdGVSYWlzZUFtb3VudE1lbnVcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5jcmVhdGVSYWlzZUFtb3VudE1lbnUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudSA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcclxuXHJcblx0dGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hhdEJhY2tncm91bmRcIiksIDEwLCAxMCwgMTAsIDEwKTtcclxuXHR0aGlzLnJhaXNlTWVudUJhY2tncm91bmQucG9zaXRpb24ueCA9IDA7XHJcblx0dGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kLnBvc2l0aW9uLnkgPSAwO1xyXG5cdHRoaXMucmFpc2VNZW51QmFja2dyb3VuZC53aWR0aCA9IDEyNTtcclxuXHR0aGlzLnJhaXNlTWVudUJhY2tncm91bmQuaGVpZ2h0ID0gMjIwO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LmFkZENoaWxkKHRoaXMucmFpc2VNZW51QmFja2dyb3VuZCk7XHJcblxyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LnggPSA2NDU7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUueSA9IDU3MCAtIHRoaXMucmFpc2VBbW91bnRNZW51LmhlaWdodDtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMucmFpc2VBbW91bnRNZW51KTtcclxuXHJcblx0dmFyIHN0eWxlT2JqZWN0ID0ge1xyXG5cdFx0Zm9udDogXCJib2xkIDE4cHggQXJpYWxcIixcclxuXHR9O1xyXG5cclxuXHR2YXIgdCA9IG5ldyBQSVhJLlRleHQoXCJSQUlTRSBUT1wiLCBzdHlsZU9iamVjdCk7XHJcblx0dC5wb3NpdGlvbi54ID0gKDEyNSAtIHQud2lkdGgpKjAuNTtcclxuXHR0LnBvc2l0aW9uLnkgPSAxMDtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS5hZGRDaGlsZCh0KTtcclxuXHJcblx0dGhpcy5yYWlzZVNob3J0Y3V0QnV0dG9ucyA9IG5ldyBBcnJheSgpO1xyXG5cclxuXHRmb3IodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7XHJcblx0XHR2YXIgYiA9IG5ldyBSYWlzZVNob3J0Y3V0QnV0dG9uKCk7XHJcblx0XHRiLmFkZEV2ZW50TGlzdGVuZXIoQnV0dG9uLkNMSUNLLCB0aGlzLm9uUmFpc2VTaG9ydGN1dENsaWNrLCB0aGlzKTtcclxuXHRcdGIucG9zaXRpb24ueCA9IDEwO1xyXG5cdFx0Yi5wb3NpdGlvbi55ID0gMzUgKyBpKjMwO1xyXG5cclxuXHRcdHRoaXMucmFpc2VBbW91bnRNZW51LmFkZENoaWxkKGIpO1xyXG5cdFx0dGhpcy5yYWlzZVNob3J0Y3V0QnV0dG9ucy5wdXNoKGIpO1xyXG5cdH1cclxuXHJcbi8qXHJcblx0UGl4aVRleHRpbnB1dCBzaG91bGQgYmUgdXNlZC5cclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0PW5ldyBUZXh0RmllbGQoKTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0Lng9MTA7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC55PTQwKzMwKjU7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC53aWR0aD0xMDU7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5oZWlnaHQ9MTk7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5ib3JkZXI9dHJ1ZTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmJvcmRlckNvbG9yPTB4NDA0MDQwO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuYmFja2dyb3VuZD10cnVlO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQubXVsdGlsaW5lPWZhbHNlO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQudHlwZT1UZXh0RmllbGRUeXBlLklOUFVUO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihFdmVudC5DSEFOR0Usb25SYWlzZUFtb3VudE1lbnVJbnB1dENoYW5nZSk7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5hZGRFdmVudExpc3RlbmVyKEtleWJvYXJkRXZlbnQuS0VZX0RPV04sb25SYWlzZUFtb3VudE1lbnVJbnB1dEtleURvd24pO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LmFkZENoaWxkKHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQpO1xyXG5cdCovXHJcblxyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJhaXNlIGFtb3VudCBidXR0b24uXHJcbiAqIEBtZXRob2Qgb25SYWlzZU1lbnVCdXR0b25DbGlja1xyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLm9uUmFpc2VTaG9ydGN1dENsaWNrID0gZnVuY3Rpb24oKSB7XHJcblx0Lyp2YXIgYiA9IGNhc3QgZS50YXJnZXQ7XHJcblxyXG5cdF9yYWlzZUFtb3VudE1lbnUudmlzaWJsZT1mYWxzZTtcclxuXHJcblx0YnV0dG9uc1tfc2xpZGVySW5kZXhdLnZhbHVlPWIudmFsdWU7XHJcblx0X3NsaWRlci52YWx1ZT0oYnV0dG9uc1tfc2xpZGVySW5kZXhdLnZhbHVlLV9zbGlkZXJNaW4pLyhfc2xpZGVyTWF4LV9zbGlkZXJNaW4pO1xyXG5cdF9yYWlzZUFtb3VudE1lbnVJbnB1dC50ZXh0PVN0ZC5zdHJpbmcoYnV0dG9uc1tfc2xpZGVySW5kZXhdLnZhbHVlKTtcclxuXHJcblx0dHJhY2UoXCJ2YWx1ZSBjbGljazogXCIrYi52YWx1ZSk7Ki9cclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogUmFpc2UgYW1vdW50IGJ1dHRvbi5cclxuICogQG1ldGhvZCBvblJhaXNlTWVudUJ1dHRvbkNsaWNrXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUub25SYWlzZU1lbnVCdXR0b25DbGljayA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LnZpc2libGUgPSAhdGhpcy5yYWlzZUFtb3VudE1lbnUudmlzaWJsZTtcclxuLypcclxuXHRpZih0aGlzLnJhaXNlQW1vdW50TWVudS52aXNpYmxlKSB7XHJcblx0XHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IHRoaXMub25TdGFnZU1vdXNlRG93bi5iaW5kKHRoaXMpO1xyXG5cdFx0Ly8gdGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5mb2N1cygpO1xyXG5cdFx0Ly8gdGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5TZWxlY3RBbGxcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IG51bGw7XHJcblx0fSovXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTbGlkZXIgY2hhbmdlLlxyXG4gKiBAbWV0aG9kIG9uU2xpZGVyQ2hhbmdlXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUub25TbGlkZXJDaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgbmV3VmFsdWUgPSBNYXRoLnJvdW5kKHRoaXMuc2xpZGVyTWluICsgdGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5zbGlkZXJNYXggLSB0aGlzLnNsaWRlck1pbikpO1xyXG5cdHRoaXMuYnV0dG9uc1t0aGlzLnNsaWRlckluZGV4XS5zZXRWYWx1ZShuZXdWYWx1ZSk7XHJcblx0dGhpcy5idXR0b25EYXRhc1t0aGlzLnNsaWRlckluZGV4XS52YWx1ZSA9IG5ld1ZhbHVlO1xyXG5cdGNvbnNvbGUubG9nKFwibmV3VmFsdWUgPSBcIiArIG5ld1ZhbHVlKTtcclxuXHJcblx0Ly90aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LnNldFRleHQoYnV0dG9uc1tfc2xpZGVySW5kZXhdLnZhbHVlLnRvU3RyaW5nKCkpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBzbGlkZXIuXHJcbiAqIEBtZXRob2Qgc2hvd1NsaWRlclxyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLnNob3dTbGlkZXIgPSBmdW5jdGlvbihpbmRleCwgbWluLCBtYXgpIHtcclxuXHRjb25zb2xlLmxvZyhcInNob3dTbGlkZXJcIik7XHJcblx0dGhpcy5zbGlkZXJJbmRleCA9IGluZGV4O1xyXG5cdHRoaXMuc2xpZGVyTWluID0gbWluO1xyXG5cdHRoaXMuc2xpZGVyTWF4ID0gbWF4O1xyXG5cclxuXHRjb25zb2xlLmxvZyhcInRoaXMuYnV0dG9uRGF0YXNbXCIraW5kZXgrXCJdID0gXCIgKyB0aGlzLmJ1dHRvbkRhdGFzW2luZGV4XS5nZXRWYWx1ZSgpICsgXCIsIG1pbiA9IFwiICsgbWluICsgXCIsIG1heCA9IFwiICsgbWF4KTtcclxuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgodGhpcy5idXR0b25EYXRhc1tpbmRleF0uZ2V0VmFsdWUoKSAtIG1pbikvKG1heCAtIG1pbikpO1xyXG5cdGNvbnNvbGUubG9nKFwidGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSA9IFwiICsgdGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSk7XHJcblx0dGhpcy5zbGlkZXIudmlzaWJsZSA9IHRydWU7XHJcblx0dGhpcy5zbGlkZXIuc2hvdygpO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xlYXIuXHJcbiAqIEBtZXRob2QgY2xlYXJcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKGJ1dHRvbkRhdGFzKSB7XHJcblx0dGhpcy5zZXRCdXR0b25zKFtdLCAwLCAtMSwgLTEpO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IGJ1dHRvbiBkYXRhcy5cclxuICogQG1ldGhvZCBzZXRCdXR0b25zXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUuc2V0QnV0dG9ucyA9IGZ1bmN0aW9uKGJ1dHRvbkRhdGFzLCBzbGlkZXJCdXR0b25JbmRleCwgbWluLCBtYXgpIHtcclxuXHR0aGlzLmJ1dHRvbkRhdGFzID0gYnV0dG9uRGF0YXM7XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgYnV0dG9uID0gdGhpcy5idXR0b25zW2ldO1xyXG5cdFx0aWYgKGkgPj0gYnV0dG9uRGF0YXMubGVuZ3RoKSB7XHJcblx0XHRcdGJ1dHRvbi52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBidXR0b25EYXRhID0gYnV0dG9uRGF0YXNbaV07XHJcblxyXG5cdFx0YnV0dG9uLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0YnV0dG9uLnNldExhYmVsKGJ1dHRvbkRhdGEuZ2V0QnV0dG9uU3RyaW5nKCkpO1xyXG5cdFx0YnV0dG9uLnNldFZhbHVlKGJ1dHRvbkRhdGEuZ2V0VmFsdWUoKSk7XHJcblxyXG5cdH1cclxuXHJcblx0aWYoKG1pbiA+PSAwKSAmJiAobWF4ID49IDApKVxyXG5cdFx0dGhpcy5zaG93U2xpZGVyKHNsaWRlckJ1dHRvbkluZGV4LCBtaW4sIG1heCk7XHJcblxyXG5cdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnggPSAzNjY7XHJcblxyXG5cdGlmIChidXR0b25EYXRhcy5sZW5ndGggPCAzKVxyXG5cdFx0dGhpcy5idXR0b25Ib2xkZXIucG9zaXRpb24ueCArPSA0NTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEJ1dHRvbiBjbGljay5cclxuICogQG1ldGhvZCBvbkJ1dHRvbkNsaWNrXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKGUpIHtcclxuXHR2YXIgYnV0dG9uSW5kZXggPSAtMTtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHRoaXMuYnV0dG9uc1tpXS52aXNpYmxlID0gZmFsc2U7XHJcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5idXR0b25zW2ldKVxyXG5cdFx0XHRidXR0b25JbmRleCA9IGk7XHJcblx0fVxyXG5cclxuXHQvL2NvbnNvbGUubG9nKFwiYnV0dG9uIGNsaWNrOiBcIiArIGJ1dHRvbkluZGV4KTtcclxuXHR2YXIgYnV0dG9uRGF0YSA9IHRoaXMuYnV0dG9uRGF0YXNbYnV0dG9uSW5kZXhdO1xyXG5cclxuXHR0aGlzLnRyaWdnZXIoe1xyXG5cdFx0dHlwZTogQnV0dG9uc1ZpZXcuQlVUVE9OX0NMSUNLLFxyXG5cdFx0YnV0dG9uOiBidXR0b25EYXRhLmdldEJ1dHRvbigpLFxyXG5cdFx0dmFsdWU6IGJ1dHRvbkRhdGEuZ2V0VmFsdWUoKVxyXG5cdH0pO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbnNWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcclxudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XHJcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcblxyXG4vKipcclxuICogQSBjYXJkIHZpZXcuXHJcbiAqIEBjbGFzcyBDYXJkVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gQ2FyZFZpZXcoKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblx0dGhpcy50YXJnZXRQb3NpdGlvbiA9IG51bGw7XHJcblxyXG5cclxuXHJcblxyXG5cdHRoaXMuZnJhbWUgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNhcmRGcmFtZVwiKSk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmZyYW1lKTtcclxuXHJcblx0dGhpcy5zdWl0ID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFwic3VpdFN5bWJvbHNcIilbMF0pO1xyXG5cdHRoaXMuc3VpdC5wb3NpdGlvbi54ID0gODtcclxuXHR0aGlzLnN1aXQucG9zaXRpb24ueSA9IDI1O1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zdWl0KTtcclxuXHJcblx0dmFyIHN0eWxlID0ge1xyXG5cdFx0Zm9udDogXCJib2xkIDE2cHggQXJpYWxcIlxyXG5cdH07XHJcblxyXG5cdHRoaXMudmFsdWVGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdmFsXVwiLCBzdHlsZSk7XHJcblx0dGhpcy52YWx1ZUZpZWxkLnBvc2l0aW9uLnggPSA2O1xyXG5cdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi55ID0gNTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMudmFsdWVGaWVsZCk7XHJcblxyXG5cdHRoaXMuYmFjayA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2FyZEJhY2tcIikpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5iYWNrKTtcclxuXHJcblxyXG5cdHRoaXMubWFza0dyYXBoaWNzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcclxuXHR0aGlzLm1hc2tHcmFwaGljcy5iZWdpbkZpbGwoMHgwMDAwMDApO1xyXG5cdHRoaXMubWFza0dyYXBoaWNzLmRyYXdSZWN0KDAsIDAsIDg3LCB0aGlzLmhlaWdodCk7XHJcblx0dGhpcy5tYXNrR3JhcGhpY3MuZW5kRmlsbCgpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5tYXNrR3JhcGhpY3MpO1xyXG5cclxuXHR0aGlzLm1hc2sgPSB0aGlzLm1hc2tHcmFwaGljcztcclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChDYXJkVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcclxuRXZlbnREaXNwYXRjaGVyLmluaXQoQ2FyZFZpZXcpO1xyXG5cclxuLyoqXHJcbiAqIFNldCBjYXJkIGRhdGEuXHJcbiAqIEBtZXRob2Qgc2V0Q2FyZERhdGFcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5zZXRDYXJkRGF0YSA9IGZ1bmN0aW9uKGNhcmREYXRhKSB7XHJcblx0dGhpcy5jYXJkRGF0YSA9IGNhcmREYXRhO1xyXG5cclxuXHJcblx0aWYgKHRoaXMuY2FyZERhdGEuaXNTaG93bigpKSB7XHJcblx0XHQvKlxyXG5cdFx0dGhpcy5iYWNrLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuZnJhbWUudmlzaWJsZSA9IHRydWU7XHJcbiovXHJcblx0XHR0aGlzLnZhbHVlRmllbGQuc3R5bGUuZmlsbCA9IHRoaXMuY2FyZERhdGEuZ2V0Q29sb3IoKTtcclxuXHJcblx0XHR0aGlzLnZhbHVlRmllbGQuc2V0VGV4dCh0aGlzLmNhcmREYXRhLmdldENhcmRWYWx1ZVN0cmluZygpKTtcclxuXHRcdHRoaXMudmFsdWVGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuXHRcdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi54ID0gMTcgLSB0aGlzLnZhbHVlRmllbGQuY2FudmFzLndpZHRoIC8gMjtcclxuXHJcblx0XHR0aGlzLnN1aXQuc2V0VGV4dHVyZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlcyhcInN1aXRTeW1ib2xzXCIpW3RoaXMuY2FyZERhdGEuZ2V0U3VpdEluZGV4KCldKTtcclxuXHR9XHJcblx0dGhpcy5iYWNrLnZpc2libGUgPSB0cnVlO1xyXG5cdHRoaXMuZnJhbWUudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IGNhcmQgZGF0YS5cclxuICogQG1ldGhvZCBzZXRDYXJkRGF0YVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLnNldFRhcmdldFBvc2l0aW9uID0gZnVuY3Rpb24ocG9pbnQpIHtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gcG9pbnQ7XHJcblxyXG5cdHRoaXMucG9zaXRpb24ueCA9IHBvaW50Lng7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gcG9pbnQueTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhpZGUuXHJcbiAqIEBtZXRob2QgaGlkZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cuXHJcbiAqIEBtZXRob2Qgc2hvd1xyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihhbmltYXRlLCBkZWxheSkge1xyXG5cdC8qaWYoZGVsYXkgPT0gdW5kZWZpbmVkKVxyXG5cdFx0ZGVsYXkgPSAxO1xyXG5cdCovXHJcblx0dGhpcy5tYXNrR3JhcGhpY3Muc2NhbGUueSA9IDE7XHJcblx0dGhpcy5wb3NpdGlvbi54ID0gdGhpcy50YXJnZXRQb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcclxuXHRpZighYW5pbWF0ZSkge1xyXG5cdFx0dGhpcy5vblNob3dDb21wbGV0ZSgpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHR0aGlzLm1hc2suaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XHJcblxyXG5cdHZhciBkZXN0aW5hdGlvbiA9IHt4OiB0aGlzLnBvc2l0aW9uLngsIHk6IHRoaXMucG9zaXRpb24ueX07XHJcblx0dGhpcy5wb3NpdGlvbi54ID0gKHRoaXMucGFyZW50LndpZHRoIC0gdGhpcy53aWR0aCkqMC41O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IC10aGlzLmhlaWdodDtcclxuXHJcblx0dmFyIGRpZmZYID0gdGhpcy5wb3NpdGlvbi54IC0gZGVzdGluYXRpb24ueDtcclxuXHR2YXIgZGlmZlkgPSB0aGlzLnBvc2l0aW9uLnkgLSBkZXN0aW5hdGlvbi55O1xyXG5cdHZhciBkaWZmID0gTWF0aC5zcXJ0KGRpZmZYKmRpZmZYICsgZGlmZlkqZGlmZlkpO1xyXG5cclxuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oIHRoaXMucG9zaXRpb24gKVxyXG4gICAgICAgICAgICAuZGVsYXkoZGVsYXkpXHJcbiAgICAgICAgICAgIC50byggeyB4OiBkZXN0aW5hdGlvbi54LCB5OiBkZXN0aW5hdGlvbi55IH0sIDMqZGlmZiApXHJcbiAgICAgICAgICAgIC5lYXNpbmcoIFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IClcclxuICAgICAgICAgICAgLm9uU3RhcnQodGhpcy5vblNob3dTdGFydC5iaW5kKHRoaXMpKVxyXG4gICAgICAgICAgICAub25Db21wbGV0ZSh0aGlzLm9uU2hvd0NvbXBsZXRlLmJpbmQodGhpcykpXHJcbiAgICAgICAgICAgIC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvblNob3dDb21wbGV0ZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLm9uU2hvd1N0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmKHRoaXMuY2FyZERhdGEuaXNTaG93bigpKSB7XHJcblx0XHR0aGlzLmJhY2sudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5mcmFtZS52aXNpYmxlID0gdHJ1ZTtcclxuXHR9XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvbGQuXHJcbiAqIEBtZXRob2QgZm9sZFxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLmZvbGQgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgbyA9IHtcclxuXHRcdHg6IHRoaXMudGFyZ2V0UG9zaXRpb24ueCxcclxuXHRcdHk6IHRoaXMudGFyZ2V0UG9zaXRpb24ueSs4MFxyXG5cdH07XHJcblxyXG5cdHZhciB0aW1lID0gNTAwOy8vIFNldHRpbmdzLmluc3RhbmNlLnNjYWxlQW5pbWF0aW9uVGltZSg1MDApO1xyXG5cdHRoaXMudDAgPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5wb3NpdGlvbilcclxuXHRcdFx0LnRvKG8sIHRpbWUpXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdC5vblVwZGF0ZSh0aGlzLm9uRm9sZFVwZGF0ZS5iaW5kKHRoaXMpKVxyXG5cdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uRm9sZENvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogRm9sZCBhbmltYXRpb24gdXBkYXRlLlxyXG4gKiBAbWV0aG9kIG9uRm9sZFVwZGF0ZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLm9uRm9sZFVwZGF0ZSA9IGZ1bmN0aW9uKHByb2dyZXNzKSB7XHJcblx0dGhpcy5tYXNrR3JhcGhpY3Muc2NhbGUueSA9IDEgLSBwcm9ncmVzcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvbGQgYW5pbWF0aW9uIGNvbXBsZXRlLlxyXG4gKiBAbWV0aG9kIG9uRm9sZENvbXBsZXRlXHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUub25Gb2xkQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFNsaWRlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9TbGlkZXJcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgUGl4aVRleHRJbnB1dCA9IHJlcXVpcmUoXCJQaXhpVGV4dElucHV0XCIpO1xudmFyIE1vdXNlT3Zlckdyb3VwID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL01vdXNlT3Zlckdyb3VwXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogQ2hhdCB2aWV3LlxuICogQGNsYXNzIENoYXRWaWV3XG4gKi9cbmZ1bmN0aW9uIENoYXRWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLm1hcmdpbiA9IDU7XG5cblx0XG5cdHZhciBjaGF0UGxhdGUgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJmcmFtZVBsYXRlXCIpLCAxMCk7XG5cdGNoYXRQbGF0ZS5wb3NpdGlvbi54ID0gMTA7XG5cdGNoYXRQbGF0ZS5wb3NpdGlvbi55ID0gNTQwO1xuXHRjaGF0UGxhdGUuc2V0TG9jYWxTaXplKDMzMCwgMTMwKTtcblx0dGhpcy5hZGRDaGlsZChjaGF0UGxhdGUpO1xuXG5cdHZhciBzID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRzLnBvc2l0aW9uLnggPSAxMDtcblx0cy5wb3NpdGlvbi55ID0gNjc1O1xuXHRzLnNldExvY2FsU2l6ZSgzMzAsIDM1KTtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgc3R5bGVPYmplY3QgPSB7XG5cdFx0Zm9udDogXCIxMnB4IEFyaWFsXCIsXG5cdFx0d29yZFdyYXBXaWR0aDogMzEwLFxuXHRcdGhlaWdodDogMTE0LFxuXHRcdGJvcmRlcjogdHJ1ZSxcblx0XHRjb2xvcjogMHhGRkZGRkYsXG5cdFx0Ym9yZGVyQ29sb3I6IDB4NDA0MDQwLFxuXHRcdHdvcmRXcmFwOiB0cnVlLFxuXHRcdG11bHRpbGluZTogdHJ1ZVxuXHR9O1xuXG5cdHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKTtcblx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueCA9IDIwO1xuXHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi55ID0gNTQ4O1xuXG5cdHRoaXMuY2hhdE1hc2sgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmNoYXRNYXNrLmJlZ2luRmlsbCgxMjMpO1xuXHR0aGlzLmNoYXRNYXNrLmRyYXdSZWN0KDAsIDAsIDMxMCwgMTE0KTtcblx0dGhpcy5jaGF0TWFzay5lbmRGaWxsKCk7XG5cdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuY2hhdE1hc2spO1xuXG5cdHRoaXMuY2hhdFRleHQgPSBuZXcgUElYSS5UZXh0KFwiXCIsIHN0eWxlT2JqZWN0KTtcblx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5jaGF0VGV4dCk7XG5cdHRoaXMuY2hhdFRleHQubWFzayA9IHRoaXMuY2hhdE1hc2s7XG5cblxuXG5cdHZhciBzdHlsZU9iamVjdCA9IHtcblx0XHRmb250OiBcIjE0cHggQXJpYWxcIixcblx0XHR3aWR0aDogMzEwLFxuXHRcdGhlaWdodDogMTksXG5cdFx0Ym9yZGVyOiB0cnVlLFxuXHRcdGJvcmRlckNvbG9yOiAweDQwNDA0MCxcblx0XHRiYWNrZ3JvdW5kOiB0cnVlLFxuXHRcdG11bHRpbGluZTogdHJ1ZVxuXHR9O1xuXHR0aGlzLmlucHV0RmllbGQgPSBuZXcgUGl4aVRleHRJbnB1dChcIlwiLCBzdHlsZU9iamVjdCk7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi54ID0gdGhpcy5jb250YWluZXIucG9zaXRpb24ueDtcblx0dGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnkgPSA2ODM7XG5cdHRoaXMuaW5wdXRGaWVsZC53aWR0aCA9IDMxMDtcblx0dGhpcy5pbnB1dEZpZWxkLmtleWRvd24gPSB0aGlzLm9uS2V5RG93bi5iaW5kKHRoaXMpO1xuXG5cdHZhciBpbnB1dFNoYWRvdyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdGlucHV0U2hhZG93LmJlZ2luRmlsbCgweDAwMDAwMCk7XG5cdGlucHV0U2hhZG93LmRyYXdSZWN0KC0xLCAtMSwgMzExLCAyMCk7XG5cdGlucHV0U2hhZG93LnBvc2l0aW9uLnggPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueDtcblx0aW5wdXRTaGFkb3cucG9zaXRpb24ueSA9IHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55O1xuXHR0aGlzLmFkZENoaWxkKGlucHV0U2hhZG93KTtcblxuXHR2YXIgaW5wdXRCYWNrZ3JvdW5kID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0aW5wdXRCYWNrZ3JvdW5kLmJlZ2luRmlsbCgweEZGRkZGRik7XG5cdGlucHV0QmFja2dyb3VuZC5kcmF3UmVjdCgwLCAwLCAzMTAsIDE5KTtcblx0aW5wdXRCYWNrZ3JvdW5kLnBvc2l0aW9uLnggPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueDtcblx0aW5wdXRCYWNrZ3JvdW5kLnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0dGhpcy5hZGRDaGlsZChpbnB1dEJhY2tncm91bmQpO1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5pbnB1dEZpZWxkKTtcblxuXG5cblx0dmFyIHNsaWRlQmFjayA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRleHRTY3JvbGxiYXJUcmFja1wiKSwgMTAsIDAsIDEwLCAwKTtcblx0c2xpZGVCYWNrLndpZHRoID0gMTA3O1xuXHR2YXIgc2xpZGVLbm9iID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwidGV4dFNjcm9sbGJhclRodW1iXCIpLCAxMCwgMCwgMTAsIDApO1xuXHRzbGlkZUtub2Iud2lkdGggPSAzMDtcblxuXG5cdHRoaXMuc2xpZGVyID0gbmV3IFNsaWRlcihzbGlkZUJhY2ssIHNsaWRlS25vYik7XG5cdHRoaXMuc2xpZGVyLnJvdGF0aW9uID0gTWF0aC5QSSowLjU7XG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnggPSAzMjY7XG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnkgPSA1NTI7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xuXHR0aGlzLnNsaWRlci52aXNpYmxlID0gZmFsc2U7XG5cdHRoaXMuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vblNsaWRlckNoYW5nZS5iaW5kKHRoaXMpKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNsaWRlcik7XG5cblxuXHR0aGlzLm1vdXNlT3Zlckdyb3VwID0gbmV3IE1vdXNlT3Zlckdyb3VwKCk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLmNoYXRUZXh0KTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KHRoaXMuc2xpZGVyKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KHRoaXMuY2hhdE1hc2spO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZERpc3BsYXlPYmplY3QoY2hhdFBsYXRlKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdmVyXCIsIHRoaXMub25DaGF0RmllbGRNb3VzZU92ZXIsIHRoaXMpO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCB0aGlzLm9uQ2hhdEZpZWxkTW91c2VPdXQsIHRoaXMpO1xuXG5cdHRoaXMuY2xlYXIoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChDaGF0VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KENoYXRWaWV3KTtcblxuXG5cbi8qKlxuICogQ2xlYXIgbWVzc2FnZXMuXG4gKiBAbWV0aG9kIGNsZWFyXG4gKi9cbkNoYXRWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNoYXRUZXh0LnNldFRleHQoXCJcIik7XG4gXHR0aGlzLmNoYXRUZXh0LnkgPSAtTWF0aC5yb3VuZCh0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKih0aGlzLmNoYXRUZXh0LmhlaWdodCArIHRoaXMubWFyZ2luIC0gdGhpcy5jaGF0TWFzay5oZWlnaHQgKSk7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xufVxuXG5cbi8qKlxuICogIEFkZCB0ZXh0LlxuICogQG1ldGhvZCBjbGVhclxuICovXG5DaGF0Vmlldy5wcm90b3R5cGUuYWRkVGV4dCA9IGZ1bmN0aW9uKHVzZXIsIHRleHQpIHtcblx0dGhpcy5jaGF0VGV4dC5zZXRUZXh0KHRoaXMuY2hhdFRleHQudGV4dCArIHVzZXIgKyBcIjogXCIgKyB0ZXh0ICsgXCJcXG5cIik7XG4gXHR0aGlzLmNoYXRUZXh0LnkgPSAtTWF0aC5yb3VuZCh0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKih0aGlzLmNoYXRUZXh0LmhlaWdodCArIHRoaXMubWFyZ2luIC0gdGhpcy5jaGF0TWFzay5oZWlnaHQgKSk7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xufVxuXG4vKipcbiAqIE9uIHNsaWRlciB2YWx1ZSBjaGFuZ2VcbiAqIEBtZXRob2Qgb25TbGlkZXJDaGFuZ2VcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vblNsaWRlckNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0KSk7XG4gfVxuXG5cbi8qKlxuICogT24gbW91c2Ugb3ZlclxuICogQG1ldGhvZCBvbkNoYXRGaWVsZE1vdXNlT3ZlclxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uQ2hhdEZpZWxkTW91c2VPdmVyID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2xpZGVyLnNob3coKTtcbiB9XG5cblxuLyoqXG4gKiBPbiBtb3VzZSBvdXRcbiAqIEBtZXRob2Qgb25DaGF0RmllbGRNb3VzZU91dFxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uQ2hhdEZpZWxkTW91c2VPdXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zbGlkZXIuaGlkZSgpO1xuIH1cblxuXG4vKipcbiAqIE9uIGtleSBkb3duXG4gKiBAbWV0aG9kIG9uS2V5RG93blxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uS2V5RG93biA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdGlmKGV2ZW50LmtleUNvZGUgPT0gMTMpIHtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGF0XCIsIHRoaXMuaW5wdXRGaWVsZC50ZXh0KTtcblx0XHRcblx0XHR0aGlzLmlucHV0RmllbGQuc2V0VGV4dChcIlwiKTtcblx0XHRcblx0fVxuIH1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdFZpZXc7XG4iLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XHJcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xyXG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xyXG5cclxuXHJcblxyXG4vKipcclxuICogQSBjaGlwcyB2aWV3LlxyXG4gKiBAY2xhc3MgQ2hpcHNWaWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBDaGlwc1ZpZXcoc2hvd1Rvb2xUaXApIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gbnVsbDtcclxuXHJcblx0dGhpcy5hbGlnbiA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkxlZnQ7XHJcblxyXG5cdHRoaXMudmFsdWUgPSAwO1xyXG5cclxuXHR0aGlzLmRlbm9taW5hdGlvbnMgPSBbNTAwMDAwLDEwMDAwMCwyNTAwMCw1MDAwLDEwMDAsNTAwLDEwMCwyNSw1LDFdO1xyXG5cclxuXHR0aGlzLnN0YWNrQ2xpcHMgPSBuZXcgQXJyYXkoKTtcclxuXHR0aGlzLmhvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaG9sZGVyKTtcclxuXHJcblx0dGhpcy50b29sVGlwID0gbnVsbDtcclxuXHJcblx0aWYoc2hvd1Rvb2xUaXApIHtcclxuXHRcdHRoaXMudG9vbFRpcCA9IG5ldyBUb29sVGlwKCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMudG9vbFRpcCk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChDaGlwc1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KENoaXBzVmlldyk7XHJcblxyXG4vKipcclxuICogU2V0IGFsaWdubWVudC5cclxuICogQG1ldGhvZCBzZXRDYXJkRGF0YVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5zZXRBbGlnbm1lbnQgPSBmdW5jdGlvbihhbGlnbikge1xyXG5cdHRoaXMuYWxpZ24gPSBhbGlnbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCB0YXJnZXQgcG9zaXRpb24uXHJcbiAqIEBtZXRob2Qgc2V0VGFyZ2V0UG9zaXRpb25cclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0VGFyZ2V0UG9zaXRpb24gPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG5cdHRoaXMudGFyZ2V0UG9zaXRpb24gPSBwb3NpdGlvbjtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSBwb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHBvc2l0aW9uLnk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgdmFsdWUuXHJcbiAqIEBtZXRob2Qgc2V0VmFsdWVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuXHJcblx0dmFyIHNwcml0ZTtcclxuXHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc3RhY2tDbGlwcy5sZW5ndGg7IGkrKylcclxuXHRcdHRoaXMuaG9sZGVyLnJlbW92ZUNoaWxkKHRoaXMuc3RhY2tDbGlwc1tpXSk7XHJcblxyXG5cdHRoaXMuc3RhY2tDbGlwcyA9IG5ldyBBcnJheSgpO1xyXG5cclxuXHRpZiAodGhpcy50b29sVGlwIT1udWxsKVxyXG5cdFx0dGhpcy50b29sVGlwLnRleHQgPSBcIkJldDogXCIrIHRoaXMudmFsdWUudG9TdHJpbmcoKTtcclxuXHJcblx0dmFyIGk7XHJcblx0dmFyIHN0YWNrQ2xpcCA9IG51bGw7XHJcblx0dmFyIHN0YWNrUG9zID0gMDtcclxuXHR2YXIgY2hpcFBvcyA9IDA7XHJcblx0dmFyIHRleHR1cmVzID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZXMoXCJjaGlwc1wiKTtcclxuXHJcblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuZGVub21pbmF0aW9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGRlbm9taW5hdGlvbiA9IHRoaXMuZGVub21pbmF0aW9uc1tpXTtcclxuXHJcblx0XHRjaGlwUG9zPTA7XHJcblx0XHRzdGFja0NsaXA9bnVsbDtcclxuXHRcdHdoaWxlKHZhbHVlID49IGRlbm9taW5hdGlvbikge1xyXG5cdFx0XHRpZiAoc3RhY2tDbGlwID09IG51bGwpIHtcclxuXHRcdFx0XHRzdGFja0NsaXAgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcblx0XHRcdFx0c3RhY2tDbGlwLnggPSBzdGFja1BvcztcclxuXHRcdFx0XHRzdGFja1BvcyArPSA0MDtcclxuXHRcdFx0XHR0aGlzLmhvbGRlci5hZGRDaGlsZChzdGFja0NsaXApO1xyXG5cdFx0XHRcdHRoaXMuc3RhY2tDbGlwcy5wdXNoKHN0YWNrQ2xpcCk7XHJcblx0XHRcdH1cclxuXHRcdCAgIFx0dmFyIHRleHR1cmUgPSB0ZXh0dXJlc1tpJXRleHR1cmVzLmxlbmd0aF07XHJcblx0XHRcdHZhciBjaGlwID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpO1xyXG5cdFx0XHRjaGlwLnBvc2l0aW9uLnkgPSBjaGlwUG9zO1xyXG5cdFx0XHRjaGlwUG9zIC09IDU7XHJcblx0XHRcdHN0YWNrQ2xpcC5hZGRDaGlsZChjaGlwKTtcclxuXHRcdFx0dmFsdWUgLT0gZGVub21pbmF0aW9uO1xyXG5cclxuXHRcdFx0dmFyIGRlbm9taW5hdGlvblN0cmluZztcclxuXHJcblx0XHRcdGlmKGRlbm9taW5hdGlvbiA+PSAxMDAwKVxyXG5cdFx0XHRcdGRlbm9taW5hdGlvblN0cmluZyA9IE1hdGgucm91bmQoZGVub21pbmF0aW9uIC8gMTAwMCkgKyBcIktcIjtcclxuXHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRkZW5vbWluYXRpb25TdHJpbmcgPSBkZW5vbWluYXRpb247XHJcblxyXG5cdFx0XHRpZigoc3RhY2tDbGlwICE9IG51bGwpICYmICh2YWx1ZSA8IGRlbm9taW5hdGlvbikpIHtcclxuXHJcblx0XHRcdFx0dmFyIHRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoZGVub21pbmF0aW9uU3RyaW5nLCB7XHJcblx0XHRcdFx0XHRmb250OiBcImJvbGQgMTJweCBBcmlhbFwiLFxyXG5cdFx0XHRcdFx0YWxpZ246IFwiY2VudGVyXCIsXHJcblx0XHRcdFx0XHRmaWxsOiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRWYWx1ZShcImNoaXBzQ29sb3JzXCIpW2klUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VmFsdWUoXCJjaGlwc0NvbG9yc1wiKS5sZW5ndGhdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnggPSAoc3RhY2tDbGlwLndpZHRoIC0gdGV4dEZpZWxkLndpZHRoKSowLjU7XHJcblx0XHRcdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnkgPSBjaGlwUG9zICsgMTE7XHJcblx0XHRcdFx0dGV4dEZpZWxkLmFscGhhID0gMC41O1xyXG5cdFx0XHRcdC8qXHJcblx0XHRcdFx0dGV4dEZpZWxkLndpZHRoID0gc3RhY2tDbGlwLndpZHRoIC0gMTtcclxuXHRcdFx0XHR0ZXh0RmllbGQuaGVpZ2h0ID0gMjA7Ki9cclxuXHJcblx0XHRcdFx0c3RhY2tDbGlwLmFkZENoaWxkKHRleHRGaWVsZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHN3aXRjaCAodGhpcy5hbGlnbikge1xyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MRUZUOiB7XHJcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAwO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjoge1xyXG5cdFx0XHR0aGlzLmhvbGRlci54ID0gLXRoaXMuaG9sZGVyLndpZHRoIC8gMjtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5SSUdIVDpcclxuXHRcdFx0dGhpcy5ob2xkZXIueCA9IC10aGlzLmhvbGRlci53aWR0aDtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIaWRlLlxyXG4gKiBAbWV0aG9kIGhpZGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdy5cclxuICogQG1ldGhvZCBzaG93XHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xyXG5cclxuXHR2YXIgZGVzdGluYXRpb24gPSB7eDogdGhpcy5wb3NpdGlvbi54LCB5OiB0aGlzLnBvc2l0aW9uLnl9O1xyXG5cdHRoaXMucG9zaXRpb24ueCA9ICh0aGlzLnBhcmVudC53aWR0aCAtIHRoaXMud2lkdGgpKjAuNTtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSAtdGhpcy5oZWlnaHQ7XHJcblxyXG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XHJcblx0dmFyIGRpZmZZID0gdGhpcy5wb3NpdGlvbi55IC0gZGVzdGluYXRpb24ueTtcclxuXHR2YXIgZGlmZiA9IE1hdGguc3FydChkaWZmWCpkaWZmWCArIGRpZmZZKmRpZmZZKTtcclxuXHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKCB0aGlzLnBvc2l0aW9uIClcclxuICAgICAgICAgICAgLnRvKCB7IHg6IGRlc3RpbmF0aW9uLngsIHk6IGRlc3RpbmF0aW9uLnkgfSwgMypkaWZmIClcclxuICAgICAgICAgICAgLmVhc2luZyggVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgKVxyXG4gICAgICAgICAgICAub25Db21wbGV0ZSh0aGlzLm9uU2hvd0NvbXBsZXRlLmJpbmQodGhpcykpXHJcbiAgICAgICAgICAgIC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvblNob3dDb21wbGV0ZVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFxyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbmltYXRlIGluLlxyXG4gKiBAbWV0aG9kIGFuaW1hdGVJblxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5hbmltYXRlSW4gPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgbyA9IHtcclxuXHRcdHk6IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueVxyXG5cdH07XHJcblxyXG5cdHN3aXRjaCAodGhpcy5hbGlnbikge1xyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MRUZUOlxyXG5cdFx0XHRvLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLngtd2lkdGgvMjtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjpcclxuXHRcdFx0by54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54O1xyXG5cclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uUklHSFQ6XHJcblx0XHRcdG8ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueCt3aWR0aC8yO1xyXG5cdH1cclxuXHJcblx0dmFyIHRpbWUgPSA1MDA7XHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMpXHJcblx0XHRcdFx0XHQudG8oeyB5OiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnkgfSwgdGltZSlcclxuXHRcdFx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25JbkFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluIGFuaW1hdGlvbiBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvbkluQW5pbWF0aW9uQ29tcGxldGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUub25JbkFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5zZXRWYWx1ZSgwKTtcclxuXHJcblx0eCA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueDtcclxuXHR5ID0gdGhpcy50YXJnZXRQb3NpdGlvbi55O1xyXG5cclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG59XHJcblxyXG4vKipcclxuICogQW5pbWF0ZSBvdXQuXHJcbiAqIEBtZXRob2QgYW5pbWF0ZU91dFxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5hbmltYXRlT3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS55O1xyXG5cclxuXHRzd2l0Y2ggKHRoaXMuYWxpZ24pIHtcclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uTEVGVDpcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54IC0gd2lkdGgvMjtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjpcclxuXHRcdFx0dGhpcy5wb3NpdGlvbi54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54O1xyXG5cclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uUklHSFQ6XHJcblx0XHRcdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueCArIHdpZHRoLzI7XHJcblx0fVxyXG5cclxuXHR2YXIgbyA9IHtcclxuXHRcdHg6IHRoaXMudGFyZ2V0UG9zaXRpb24ueCxcclxuXHRcdHk6IHRoaXMudGFyZ2V0UG9zaXRpb24ueVxyXG5cdH07XHJcblxyXG5cdHZhciB0aW1lID0gNTAwO1xyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxyXG5cdFx0XHRcdFx0LnRvKG8sIHRpbWUpXHJcblx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uT3V0QW5pbWF0aW9uQ29tcGxldGUuYmluZCh0aGlzKSlcclxuXHRcdFx0XHRcdC5zdGFydCgpO1xyXG5cdFxyXG59XHJcblxyXG4vKipcclxuICogT3V0IGFuaW1hdGlvbiBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvbk91dEFuaW1hdGlvbkNvbXBsZXRlXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLm9uT3V0QW5pbWF0aW9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHRpbWUgPSA1MDA7XHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHt4OjB9KVxyXG5cdFx0XHRcdFx0LnRvKHt4OjEwfSwgdGltZSlcclxuXHRcdFx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25PdXRXYWl0QW5pbWF0aW9uQ29tcGxldGUuYmluZCh0aGlzKSlcclxuXHRcdFx0XHRcdC5zdGFydCgpO1xyXG5cclxuXHR4ID0gdGhpcy50YXJnZXRQb3NpdGlvbi54O1xyXG5cdHkgPSB0aGlzLnRhcmdldFBvc2l0aW9uLnk7XHJcblxyXG59XHJcblxyXG4vKipcclxuICogT3V0IHdhaXQgYW5pbWF0aW9uIGNvbXBsZXRlLlxyXG4gKiBAbWV0aG9kIG9uT3V0V2FpdEFuaW1hdGlvbkNvbXBsZXRlXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLm9uT3V0V2FpdEFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdHRoaXMuc2V0VmFsdWUoMCk7XHJcblxyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hpcHNWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcclxudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XHJcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcblxyXG4vKipcclxuICogRGlhbG9nIHZpZXcuXHJcbiAqIEBjbGFzcyBEZWFsZXJCdXR0b25WaWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBEZWFsZXJCdXR0b25WaWV3KCkge1xyXG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xyXG5cclxuXHJcblx0dmFyIGRlYWxlckJ1dHRvblRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGVhbGVyQnV0dG9uXCIpO1xyXG5cdHRoaXMuc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKGRlYWxlckJ1dHRvblRleHR1cmUpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zcHJpdGUpO1xyXG5cdHRoaXMuaGlkZSgpO1xyXG59XHJcblxyXG5GdW5jdGlvblV0aWwuZXh0ZW5kKERlYWxlckJ1dHRvblZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KERlYWxlckJ1dHRvblZpZXcpO1xyXG5cclxuLyoqXHJcbiAqIFNldCBzZWF0IGluZGV4XHJcbiAqIEBtZXRob2Qgc2V0U2VhdEluZGV4XHJcbiAqL1xyXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5zZXRTZWF0SW5kZXggPSBmdW5jdGlvbihzZWF0SW5kZXgpIHtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJkZWFsZXJCdXR0b25Qb3NpdGlvbnNcIilbc2VhdEluZGV4XS54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImRlYWxlckJ1dHRvblBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLnk7XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBbmltYXRlIHRvIHNlYXQgaW5kZXguXHJcbiAqIEBtZXRob2QgYW5pbWF0ZVRvU2VhdEluZGV4XHJcbiAqL1xyXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5hbmltYXRlVG9TZWF0SW5kZXggPSBmdW5jdGlvbihzZWF0SW5kZXgpIHtcclxuXHRpZiAoIXRoaXMudmlzaWJsZSkge1xyXG5cdFx0dGhpcy5zZXRTZWF0SW5kZXgoc2VhdEluZGV4KTtcclxuXHRcdC8vIHRvZG8gZGlzcGF0Y2ggZXZlbnQgdGhhdCBpdCdzIGNvbXBsZXRlP1xyXG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0dmFyIGRlc3RpbmF0aW9uID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiZGVhbGVyQnV0dG9uUG9zaXRpb25zXCIpW3NlYXRJbmRleF07XHJcblx0dmFyIGRpZmZYID0gdGhpcy5wb3NpdGlvbi54IC0gZGVzdGluYXRpb24ueDtcclxuXHR2YXIgZGlmZlkgPSB0aGlzLnBvc2l0aW9uLnkgLSBkZXN0aW5hdGlvbi55O1xyXG5cdHZhciBkaWZmID0gTWF0aC5zcXJ0KGRpZmZYICogZGlmZlggKyBkaWZmWSAqIGRpZmZZKTtcclxuXHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMucG9zaXRpb24pXHJcblx0XHQudG8oe1xyXG5cdFx0XHR4OiBkZXN0aW5hdGlvbi54LFxyXG5cdFx0XHR5OiBkZXN0aW5hdGlvbi55XHJcblx0XHR9LCA1ICogZGlmZilcclxuXHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHQub25Db21wbGV0ZSh0aGlzLm9uU2hvd0NvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHQuc3RhcnQoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTaG93IENvbXBsZXRlLlxyXG4gKiBAbWV0aG9kIG9uU2hvd0NvbXBsZXRlXHJcbiAqL1xyXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIaWRlLlxyXG4gKiBAbWV0aG9kIGhpZGVcclxuICovXHJcbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cuXHJcbiAqIEBtZXRob2Qgc2hvd1xyXG4gKi9cclxuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKHNlYXRJbmRleCwgYW5pbWF0ZSkge1xyXG5cdGlmICh0aGlzLnZpc2libGUgJiYgYW5pbWF0ZSkge1xyXG5cdFx0dGhpcy5hbmltYXRlVG9TZWF0SW5kZXgoc2VhdEluZGV4KTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMuc2V0U2VhdEluZGV4KHNlYXRJbmRleCk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERlYWxlckJ1dHRvblZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG5cbi8qKlxuICogRGlhbG9nIGJ1dHRvbi5cbiAqIEBjbGFzcyBEaWFsb2dCdXR0b25cbiAqL1xuZnVuY3Rpb24gRGlhbG9nQnV0dG9uKCkge1xuXHRCdXR0b24uY2FsbCh0aGlzKTtcblxuXHR0aGlzLmJ1dHRvblRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGlhbG9nQnV0dG9uXCIpO1xuXHR0aGlzLmFkZENoaWxkKG5ldyBQSVhJLlNwcml0ZSh0aGlzLmJ1dHRvblRleHR1cmUpKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMTRweCBBcmlhbFwiLFxuXHRcdGZpbGw6IFwiI2ZmZmZmZlwiXG5cdH07XG5cblx0dGhpcy50ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3Rlc3RdXCIsIHN0eWxlKTtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueSA9IDE1O1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkKTtcblxuXHR0aGlzLnNldFRleHQoXCJCVE5cIik7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoRGlhbG9nQnV0dG9uLCBCdXR0b24pO1xuXG4vKipcbiAqIFNldCB0ZXh0IGZvciB0aGUgYnV0dG9uLlxuICogQG1ldGhvZCBzZXRUZXh0XG4gKi9cbkRpYWxvZ0J1dHRvbi5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcblx0dGhpcy50ZXh0RmllbGQuc2V0VGV4dCh0ZXh0KTtcblx0dGhpcy50ZXh0RmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cdHRoaXMudGV4dEZpZWxkLnggPSB0aGlzLmJ1dHRvblRleHR1cmUud2lkdGggLyAyIC0gdGhpcy50ZXh0RmllbGQud2lkdGggLyAyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERpYWxvZ0J1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBEaWFsb2dCdXR0b24gPSByZXF1aXJlKFwiLi9EaWFsb2dCdXR0b25cIik7XG52YXIgQnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9kYXRhL0J1dHRvbkRhdGFcIik7XG52YXIgUGl4aVRleHRJbnB1dCA9IHJlcXVpcmUoXCJQaXhpVGV4dElucHV0XCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG4vKipcbiAqIERpYWxvZyB2aWV3LlxuICogQGNsYXNzIERpYWxvZ1ZpZXdcbiAqL1xuZnVuY3Rpb24gRGlhbG9nVmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dmFyIGNvdmVyID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0Y292ZXIuYmVnaW5GaWxsKDB4MDAwMDAwLCAuNSk7XG5cdGNvdmVyLmRyYXdSZWN0KDAsIDAsIDk2MCwgNzIwKTtcblx0Y292ZXIuZW5kRmlsbCgpO1xuXHRjb3Zlci5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdC8vY292ZXIuYnV0dG9uTW9kZSA9IHRydWU7XG5cdGNvdmVyLmhpdEFyZWEgPSBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgOTYwLCA3MjApO1xuXHR0aGlzLmFkZENoaWxkKGNvdmVyKTtcblxuXHR2YXIgYiA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImZyYW1lUGxhdGVcIiksIDEwKTtcblx0Yi5zZXRMb2NhbFNpemUoNDgwLCAyNzApO1xuXHRiLnBvc2l0aW9uLnggPSA0ODAgLSA0ODAgLyAyO1xuXHRiLnBvc2l0aW9uLnkgPSAzNjAgLSAyNzAgLyAyO1xuXHR0aGlzLmFkZENoaWxkKGIpO1xuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwibm9ybWFsIDE0cHggQXJpYWxcIlxuXHR9O1xuXG5cdHRoaXMudGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt0ZXh0XVwiLCBzdHlsZSk7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnggPSBiLnBvc2l0aW9uLnggKyAyMDtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueSA9IGIucG9zaXRpb24ueSArIDIwO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkKTtcblxuXHR0aGlzLmJ1dHRvbnNIb2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdHRoaXMuYnV0dG9uc0hvbGRlci5wb3NpdGlvbi55ID0gNDMwO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV0dG9uc0hvbGRlcik7XG5cdHRoaXMuYnV0dG9ucyA9IFtdO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XG5cdFx0dmFyIGIgPSBuZXcgRGlhbG9nQnV0dG9uKCk7XG5cblx0XHRiLnBvc2l0aW9uLnggPSBpICogOTA7XG5cdFx0Yi5vbihcImNsaWNrXCIsIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XG5cdFx0dGhpcy5idXR0b25zSG9sZGVyLmFkZENoaWxkKGIpO1xuXHRcdHRoaXMuYnV0dG9ucy5wdXNoKGIpO1xuXHR9XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMThweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5pbnB1dEZpZWxkID0gbmV3IFBpeGlUZXh0SW5wdXQoXCJcIiwgc3R5bGUpO1xuXHR0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueCA9IHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLng7XG5cblx0dGhpcy5pbnB1dEZyYW1lID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0dGhpcy5pbnB1dEZyYW1lLmJlZ2luRmlsbCgweDAwMDAwMCk7XG5cdHRoaXMuaW5wdXRGcmFtZS5kcmF3UmVjdCgtMSwgLTEsIDEwMiwgMjMpO1xuXHR0aGlzLmlucHV0RnJhbWUucG9zaXRpb24ueCA9IHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi54O1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuaW5wdXRGcmFtZSk7XG5cblx0dGhpcy5hZGRDaGlsZCh0aGlzLmlucHV0RmllbGQpO1xuXG5cdHRoaXMuaGlkZSgpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKERpYWxvZ1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChEaWFsb2dWaWV3KTtcblxuRGlhbG9nVmlldy5CVVRUT05fQ0xJQ0sgPSBcImJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5EaWFsb2dWaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuRGlhbG9nVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKHRleHQsIGJ1dHRvbklkcywgZGVmYXVsdFZhbHVlKSB7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cblx0dGhpcy5idXR0b25JZHMgPSBidXR0b25JZHM7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdGlmIChpIDwgYnV0dG9uSWRzLmxlbmd0aCkge1xuXHRcdFx0dmFyIGJ1dHRvbiA9IHRoaXMuYnV0dG9uc1tpXVxuXHRcdFx0YnV0dG9uLnNldFRleHQoQnV0dG9uRGF0YS5nZXRCdXR0b25TdHJpbmdGb3JJZChidXR0b25JZHNbaV0pKTtcblx0XHRcdGJ1dHRvbi52aXNpYmxlID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5idXR0b25zW2ldLnZpc2libGUgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLmJ1dHRvbnNIb2xkZXIueCA9IDQ4MCAtIGJ1dHRvbklkcy5sZW5ndGggKiA5MCAvIDI7XG5cdHRoaXMudGV4dEZpZWxkLnNldFRleHQodGV4dCk7XG5cblx0aWYgKGRlZmF1bHRWYWx1ZSkge1xuXHRcdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55ID0gdGhpcy50ZXh0RmllbGQucG9zaXRpb24ueSArIHRoaXMudGV4dEZpZWxkLmhlaWdodCArIDIwO1xuXHRcdHRoaXMuaW5wdXRGcmFtZS5wb3NpdGlvbi55ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnk7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnZpc2libGUgPSB0cnVlO1xuXHRcdHRoaXMuaW5wdXRGcmFtZS52aXNpYmxlID0gdHJ1ZTtcblxuXHRcdHRoaXMuaW5wdXRGaWVsZC50ZXh0ID0gZGVmYXVsdFZhbHVlO1xuXHRcdHRoaXMuaW5wdXRGaWVsZC5mb2N1cygpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuaW5wdXRGaWVsZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5pbnB1dEZyYW1lLnZpc2libGUgPSBmYWxzZTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBidXR0b24gY2xpY2suXG4gKiBAbWV0aG9kIG9uQnV0dG9uQ2xpY2tcbiAqL1xuRGlhbG9nVmlldy5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0dmFyIGJ1dHRvbkluZGV4ID0gLTE7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspXG5cdFx0aWYgKGUudGFyZ2V0ID09IHRoaXMuYnV0dG9uc1tpXSlcblx0XHRcdGJ1dHRvbkluZGV4ID0gaTtcblxuXHR2YXIgdmFsdWUgPSBudWxsO1xuXHRpZiAodGhpcy5pbnB1dEZpZWxkLnZpc2libGUpXG5cdFx0dmFsdWUgPSB0aGlzLmlucHV0RmllbGQudGV4dDtcblxuXHR2YXIgZXYgPSB7XG5cdFx0dHlwZTogRGlhbG9nVmlldy5CVVRUT05fQ0xJQ0ssXG5cdFx0YnV0dG9uOiB0aGlzLmJ1dHRvbklkc1tidXR0b25JbmRleF0sXG5cdFx0dmFsdWU6IHZhbHVlXG5cdH07XG5cblx0dGhpcy50cmlnZ2VyKGV2KTtcblx0dGhpcy5oaWRlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlhbG9nVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgR3JhZGllbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvR3JhZGllbnRcIik7XG5cbi8qKlxuICogTG9hZGluZyBzY3JlZW4uXG4gKiBAY2xhc3MgTG9hZGluZ1NjcmVlblxuICovXG5mdW5jdGlvbiBMb2FkaW5nU2NyZWVuKCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR2YXIgZ3JhZGllbnQgPSBuZXcgR3JhZGllbnQoKTtcblx0Z3JhZGllbnQuc2V0U2l6ZSgxMDAsIDEwMCk7XG5cdGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBcIiNmZmZmZmZcIik7XG5cdGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCBcIiNjMGMwYzBcIik7XG5cblx0dmFyIHMgPSBncmFkaWVudC5jcmVhdGVTcHJpdGUoKTtcblx0cy53aWR0aCA9IDk2MDtcblx0cy5oZWlnaHQgPSA3MjA7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAyMHB4IEFyaWFsXCIsXG5cdFx0ZmlsbDogXCIjODA4MDgwXCJcblx0fTtcblxuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdGV4dF1cIiwgc3R5bGUpO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi54ID0gOTYwIC8gMjtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueSA9IDcyMCAvIDIgLSB0aGlzLnRleHRGaWVsZC5oZWlnaHQgLyAyO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChMb2FkaW5nU2NyZWVuLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuTG9hZGluZ1NjcmVlbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0dGhpcy50ZXh0RmllbGQuc2V0VGV4dChtZXNzYWdlKTtcblx0dGhpcy50ZXh0RmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cdHRoaXMudGV4dEZpZWxkLnggPSA5NjAgLyAyIC0gdGhpcy50ZXh0RmllbGQud2lkdGggLyAyO1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xufVxuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuTG9hZGluZ1NjcmVlbi5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkaW5nU2NyZWVuOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNlYXRWaWV3ID0gcmVxdWlyZShcIi4vU2VhdFZpZXdcIik7XG52YXIgQ2FyZFZpZXcgPSByZXF1aXJlKFwiLi9DYXJkVmlld1wiKTtcbnZhciBDaGF0VmlldyA9IHJlcXVpcmUoXCIuL0NoYXRWaWV3XCIpO1xudmFyIFBvaW50ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1BvaW50XCIpO1xudmFyIEdyYWRpZW50ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0dyYWRpZW50XCIpO1xudmFyIEJ1dHRvbnNWaWV3ID0gcmVxdWlyZShcIi4vQnV0dG9uc1ZpZXdcIik7XG52YXIgRGlhbG9nVmlldyA9IHJlcXVpcmUoXCIuL0RpYWxvZ1ZpZXdcIik7XG52YXIgRGVhbGVyQnV0dG9uVmlldyA9IHJlcXVpcmUoXCIuL0RlYWxlckJ1dHRvblZpZXdcIik7XG52YXIgQ2hpcHNWaWV3ID0gcmVxdWlyZShcIi4vQ2hpcHNWaWV3XCIpO1xudmFyIFBvdFZpZXcgPSByZXF1aXJlKFwiLi9Qb3RWaWV3XCIpO1xudmFyIFRpbWVyVmlldyA9IHJlcXVpcmUoXCIuL1RpbWVyVmlld1wiKTtcbnZhciBTZXR0aW5nc1ZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9TZXR0aW5nc1ZpZXdcIik7XG5cbi8qKlxuICogTmV0IHBva2VyIGNsaWVudCB2aWV3LlxuICogQGNsYXNzIE5ldFBva2VyQ2xpZW50Vmlld1xuICovXG5mdW5jdGlvbiBOZXRQb2tlckNsaWVudFZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuc2V0dXBCYWNrZ3JvdW5kKCk7XG5cblx0dGhpcy50YWJsZUNvbnRhaW5lciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRhYmxlQ29udGFpbmVyKTtcblxuXHR0aGlzLnRhYmxlQmFja2dyb3VuZCA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwidGFibGVCYWNrZ3JvdW5kXCIpKTtcblx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnRhYmxlQmFja2dyb3VuZCk7XG5cblx0dGhpcy5zZXR1cFNlYXRzKCk7XG5cdHRoaXMuc2V0dXBDb21tdW5pdHlDYXJkcygpO1xuXG5cdHRoaXMudGltZXJWaWV3ID0gbmV3IFRpbWVyVmlldygpO1xuXHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKHRoaXMudGltZXJWaWV3KTtcblxuXHR0aGlzLmNoYXRWaWV3ID0gbmV3IENoYXRWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5jaGF0Vmlldyk7XG5cblx0dGhpcy5idXR0b25zVmlldyA9IG5ldyBCdXR0b25zVmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV0dG9uc1ZpZXcpO1xuXG5cdHRoaXMuZGlhbG9nVmlldyA9IG5ldyBEaWFsb2dWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5kaWFsb2dWaWV3KTtcblxuXHR0aGlzLmRlYWxlckJ1dHRvblZpZXcgPSBuZXcgRGVhbGVyQnV0dG9uVmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuZGVhbGVyQnV0dG9uVmlldyk7XG5cblx0dGhpcy5wb3RWaWV3ID0gbmV3IFBvdFZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnBvdFZpZXcpO1xuXHR0aGlzLnBvdFZpZXcucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueDtcblx0dGhpcy5wb3RWaWV3LnBvc2l0aW9uLnkgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnk7XG5cblx0dGhpcy5zZXR0aW5nc1ZpZXcgPSBuZXcgU2V0dGluZ3NWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zZXR0aW5nc1ZpZXcpO1xuXG5cdHRoaXMuc2V0dXBDaGlwcygpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE5ldFBva2VyQ2xpZW50VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KE5ldFBva2VyQ2xpZW50Vmlldyk7XG5cbk5ldFBva2VyQ2xpZW50Vmlldy5TRUFUX0NMSUNLID0gXCJzZWF0Q2xpY2tcIjtcblxuLyoqXG4gKiBTZXR1cCBiYWNrZ3JvdW5kLlxuICogQG1ldGhvZCBzZXR1cEJhY2tncm91bmRcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cEJhY2tncm91bmQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGdyYWRpZW50ID0gbmV3IEdyYWRpZW50KCk7XG5cdGdyYWRpZW50LnNldFNpemUoMTAwLCAxMDApO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoMCwgXCIjNjA2MDYwXCIpO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoLjUsIFwiI2EwYTBhMFwiKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIFwiIzkwOTA5MFwiKTtcblxuXHR2YXIgcyA9IGdyYWRpZW50LmNyZWF0ZVNwcml0ZSgpO1xuXHRzLndpZHRoID0gOTYwO1xuXHRzLmhlaWdodCA9IDcyMDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGl2aWRlckxpbmVcIikpO1xuXHRzLnggPSAzNDU7XG5cdHMueSA9IDU0MDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGl2aWRlckxpbmVcIikpO1xuXHRzLnggPSA2OTM7XG5cdHMueSA9IDU0MDtcblx0dGhpcy5hZGRDaGlsZChzKTtcbn1cblxuLyoqXG4gKiBTZXR1cCBzZWF0cy5cbiAqIEBtZXRob2Qgc2VydXBTZWF0c1xuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLnNldHVwU2VhdHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGksIGo7XG5cdHZhciBwb2NrZXRDYXJkcztcblxuXHR0aGlzLnNlYXRWaWV3cyA9IFtdO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJzZWF0UG9zaXRpb25zXCIpLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHNlYXRWaWV3ID0gbmV3IFNlYXRWaWV3KGkpO1xuXHRcdHZhciBwID0gc2VhdFZpZXcucG9zaXRpb247XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgMjsgaisrKSB7XG5cdFx0XHR2YXIgYyA9IG5ldyBDYXJkVmlldygpO1xuXHRcdFx0Yy5oaWRlKCk7XG5cdFx0XHRjLnNldFRhcmdldFBvc2l0aW9uKFBvaW50KHAueCArIGogKiAzMCAtIDYwLCBwLnkgLSAxMDApKTtcblx0XHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoYyk7XG5cdFx0XHRzZWF0Vmlldy5hZGRQb2NrZXRDYXJkKGMpO1xuXHRcdFx0c2VhdFZpZXcub24oXCJjbGlja1wiLCB0aGlzLm9uU2VhdENsaWNrLCB0aGlzKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKHNlYXRWaWV3KTtcblx0XHR0aGlzLnNlYXRWaWV3cy5wdXNoKHNlYXRWaWV3KTtcblx0fVxufVxuXG4vKipcbiAqIFNldHVwIGNoaXBzLlxuICogQG1ldGhvZCBzZXJ1cFNlYXRzXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuc2V0dXBDaGlwcyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaTtcblx0Zm9yIChpID0gMDsgaSA8IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImJldFBvc2l0aW9uc1wiKS5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjaGlwc1ZpZXcgPSBuZXcgQ2hpcHNWaWV3KCk7XG5cdFx0dGhpcy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMgPSBjaGlwc1ZpZXc7XG5cblx0XHRjaGlwc1ZpZXcuc2V0QWxpZ25tZW50KFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFZhbHVlKFwiYmV0QWxpZ25cIilbaV0pO1xuXHRcdGNoaXBzVmlldy5zZXRUYXJnZXRQb3NpdGlvbihSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJiZXRQb3NpdGlvbnNcIilbaV0pO1xuXHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoY2hpcHNWaWV3KTtcblx0fVxufVxuXG4vKipcbiAqIFNlYXQgY2xpY2suXG4gKiBAbWV0aG9kIG9uU2VhdENsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLm9uU2VhdENsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgc2VhdEluZGV4ID0gLTE7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5zZWF0Vmlld3NbaV0pXG5cdFx0XHRzZWF0SW5kZXggPSBpO1xuXG5cdGNvbnNvbGUubG9nKFwic2VhdCBjbGljazogXCIgKyBzZWF0SW5kZXgpO1xuXHR0aGlzLnRyaWdnZXIoe1xuXHRcdHR5cGU6IE5ldFBva2VyQ2xpZW50Vmlldy5TRUFUX0NMSUNLLFxuXHRcdHNlYXRJbmRleDogc2VhdEluZGV4XG5cdH0pO1xufVxuXG4vKipcbiAqIFNldHVwIGNvbW11bml0eSBjYXJkcy5cbiAqIEBtZXRob2Qgc2V0dXBDb21tdW5pdHlDYXJkc1xuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cENvbW11bml0eUNhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29tbXVuaXR5Q2FyZHMgPSBbXTtcblxuXHR2YXIgcCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwiY29tbXVuaXR5Q2FyZHNQb3NpdGlvblwiKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgNTsgaSsrKSB7XG5cdFx0dmFyIGNhcmRWaWV3ID0gbmV3IENhcmRWaWV3KCk7XG5cdFx0Y2FyZFZpZXcuaGlkZSgpO1xuXHRcdGNhcmRWaWV3LnNldFRhcmdldFBvc2l0aW9uKFBvaW50KHAueCArIGkgKiA5MCwgcC55KSk7XG5cblx0XHR0aGlzLmNvbW11bml0eUNhcmRzLnB1c2goY2FyZFZpZXcpO1xuXHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoY2FyZFZpZXcpO1xuXHR9XG59XG5cbi8qKlxuICogR2V0IHNlYXQgdmlldyBieSBpbmRleC5cbiAqIEBtZXRob2QgZ2V0U2VhdFZpZXdCeUluZGV4XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0U2VhdFZpZXdCeUluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0cmV0dXJuIHRoaXMuc2VhdFZpZXdzW2luZGV4XTtcbn1cblxuLyoqXG4gKiBHZXQgc2VhdCB2aWV3IGJ5IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0Vmlld0J5SW5kZXhcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRDb21tdW5pdHlDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb21tdW5pdHlDYXJkcztcbn1cblxuLyoqXG4gKiBHZXQgYnV0dG9ucyB2aWV3LlxuICogQG1ldGhvZCBnZXRTZWF0Vmlld0J5SW5kZXhcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRCdXR0b25zVmlldyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b25zVmlldztcbn1cblxuLyoqXG4gKiBHZXQgZGlhbG9nIHZpZXcuXG4gKiBAbWV0aG9kIGdldERpYWxvZ1ZpZXdcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXREaWFsb2dWaWV3ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRpYWxvZ1ZpZXc7XG59XG5cbi8qKlxuICogR2V0IGRpYWxvZyB2aWV3LlxuICogQG1ldGhvZCBnZXREZWFsZXJCdXR0b25WaWV3XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0RGVhbGVyQnV0dG9uVmlldyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWFsZXJCdXR0b25WaWV3O1xufVxuXG4vKipcbiAqIENsZWFyIGV2ZXJ5dGhpbmcgdG8gYW4gZW1wdHkgc3RhdGUuXG4gKiBAbWV0aG9kIGNsZWFyXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuY29tbXVuaXR5Q2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5jb21tdW5pdHlDYXJkc1tpXS5oaWRlKCk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuc2VhdFZpZXdzW2ldLmNsZWFyKCk7XG5cblx0dGhpcy50aW1lclZpZXcuaGlkZSgpO1xuXHR0aGlzLnBvdFZpZXcuc2V0VmFsdWVzKG5ldyBBcnJheSgpKTtcblx0dGhpcy5kZWFsZXJCdXR0b25WaWV3LmhpZGUoKTtcblx0dGhpcy5jaGF0Vmlldy5jbGVhcigpO1xuXG5cdHRoaXMuZGlhbG9nVmlldy5oaWRlKCk7XG5cdHRoaXMuYnV0dG9uc1ZpZXcuY2xlYXIoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOZXRQb2tlckNsaWVudFZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgQ2hpcHNWaWV3ID0gcmVxdWlyZShcIi4vQ2hpcHNWaWV3XCIpO1xuXG5cblxuLyoqXG4gKiBBIHBvdCB2aWV3XG4gKiBAY2xhc3MgUG90Vmlld1xuICovXG5mdW5jdGlvbiBQb3RWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblx0XG5cdHRoaXMudmFsdWUgPSAwO1xuXG5cdHRoaXMuaG9sZGVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuaG9sZGVyKTtcblxuXHR0aGlzLnN0YWNrcyA9IG5ldyBBcnJheSgpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFBvdFZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChQb3RWaWV3KTtcblxuLyoqXG4gKiBTZXQgdmFsdWUuXG4gKiBAbWV0aG9kIHNldFZhbHVlXG4gKi9cblBvdFZpZXcucHJvdG90eXBlLnNldFZhbHVlcyA9IGZ1bmN0aW9uKHZhbHVlcykge1xuXHRcblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc3RhY2tzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuaG9sZGVyLnJlbW92ZUNoaWxkKHRoaXMuc3RhY2tzW2ldKTtcblxuXHR0aGlzLnN0YWNrcyA9IG5ldyBBcnJheSgpO1xuXG5cdHZhciBwb3MgPSAwO1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2hpcHMgPSBuZXcgQ2hpcHNWaWV3KGZhbHNlKTtcblx0XHR0aGlzLnN0YWNrcy5wdXNoKGNoaXBzKTtcblx0XHR0aGlzLmhvbGRlci5hZGRDaGlsZChjaGlwcyk7XG5cdFx0Y2hpcHMuc2V0VmFsdWUodmFsdWVzW2ldKTtcblx0XHRjaGlwcy54ID0gcG9zO1xuXHRcdHBvcyArPSBNYXRoLmZsb29yKGNoaXBzLndpZHRoICsgMjApO1xuXG5cdFx0dmFyIHRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQodmFsdWVzW2ldLCB7XG5cdFx0XHRmb250OiBcImJvbGQgMTJweCBBcmlhbFwiLFxuXHRcdFx0YWxpZ246IFwiY2VudGVyXCIsXG5cdFx0XHRmaWxsOiAweGZmZmZmZlxuXHRcdH0pO1xuXG5cdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnggPSAoY2hpcHMud2lkdGggLSB0ZXh0RmllbGQud2lkdGgpKjAuNTtcblx0XHR0ZXh0RmllbGQucG9zaXRpb24ueSA9IDMwO1xuXG5cdFx0Y2hpcHMuYWRkQ2hpbGQodGV4dEZpZWxkKTtcblx0fVxuXG5cdHRoaXMuaG9sZGVyLnggPSAtdGhpcy5ob2xkZXIud2lkdGgqMC41O1xufVxuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuUG90Vmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cblBvdFZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvdFZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoXCIuLi9hcHAvU2V0dGluZ3NcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBDaGVja2JveCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9DaGVja2JveFwiKTtcblxuXG5cbi8qKlxuICogUmFpc2Ugc2hvcnRjdXQgYnV0dG9uXG4gKiBAY2xhc3MgUmFpc2VTaG9ydGN1dEJ1dHRvblxuICovXG4gZnVuY3Rpb24gUmFpc2VTaG9ydGN1dEJ1dHRvbigpIHtcbiBcdHZhciBiYWNrZ3JvdW5kID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiYnV0dG9uQmFja2dyb3VuZFwiKSwgMTAsIDUsIDEwLCA1KTtcbiBcdGJhY2tncm91bmQud2lkdGggPSAxMDU7XG4gXHRiYWNrZ3JvdW5kLmhlaWdodCA9IDI1O1xuXHRCdXR0b24uY2FsbCh0aGlzLCBiYWNrZ3JvdW5kKTtcblxuIFx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuIFx0XHR3aWR0aDogMTA1LFxuIFx0XHRoZWlnaHQ6IDIwLFxuIFx0XHRmb250OiBcImJvbGQgMTRweCBBcmlhbFwiLFxuIFx0XHRjb2xvcjogXCJ3aGl0ZVwiXG4gXHR9O1xuXHR0aGlzLmxhYmVsID0gbmV3IFBJWEkuVGV4dChcIlwiLCBzdHlsZU9iamVjdCk7XG5cdHRoaXMubGFiZWwucG9zaXRpb24ueCA9IDg7XG5cdHRoaXMubGFiZWwucG9zaXRpb24ueSA9IDQ7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5sYWJlbCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoUmFpc2VTaG9ydGN1dEJ1dHRvbiwgQnV0dG9uKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFJhaXNlU2hvcnRjdXRCdXR0b24pO1xuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0VGV4dFxuICovXG5SYWlzZVNob3J0Y3V0QnV0dG9uLnByb3RvdHlwZS5zZXRUZXh0ID0gZnVuY3Rpb24oc3RyaW5nKSB7XG5cdHRoaXMubGFiZWwuc2V0VGV4dChzdHJpbmcpO1xuXHRyZXR1cm4gc3RyaW5nO1xufVxuXG4vKipcbiAqIFNldCBlbmFibGVkLlxuICogQG1ldGhvZCBzZXRFbmFibGVkXG4gKi9cblJhaXNlU2hvcnRjdXRCdXR0b24ucHJvdG90eXBlLnNldEVuYWJsZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZih2YWx1ZSkge1xuXHRcdHRoaXMuYWxwaGEgPSAxO1xuXHRcdHRoaXMuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHRcdHRoaXMuYnV0dG9uTW9kZSA9IHRydWU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy5hbHBoYSA9IDAuNTtcblx0XHR0aGlzLmludGVyYWN0aXZlID0gZmFsc2U7XG5cdFx0dGhpcy5idXR0b25Nb2RlID0gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHZhbHVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhaXNlU2hvcnRjdXRCdXR0b247IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG5cbi8qKlxuICogQSBzZWF0IHZpZXcuXG4gKiBAY2xhc3MgU2VhdFZpZXdcbiAqL1xuZnVuY3Rpb24gU2VhdFZpZXcoc2VhdEluZGV4KSB7XG5cdEJ1dHRvbi5jYWxsKHRoaXMpO1xuXG5cdHRoaXMucG9ja2V0Q2FyZHMgPSBbXTtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG5cblx0dmFyIHNlYXRUZXh0dXJlID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInNlYXRQbGF0ZVwiKTtcblx0dmFyIHNlYXRTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoc2VhdFRleHR1cmUpO1xuXG5cdHNlYXRTcHJpdGUucG9zaXRpb24ueCA9IC1zZWF0VGV4dHVyZS53aWR0aCAvIDI7XG5cdHNlYXRTcHJpdGUucG9zaXRpb24ueSA9IC1zZWF0VGV4dHVyZS5oZWlnaHQgLyAyO1xuXG5cdHRoaXMuYWRkQ2hpbGQoc2VhdFNwcml0ZSk7XG5cblx0dmFyIHBvcyA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcInNlYXRQb3NpdGlvbnNcIilbdGhpcy5zZWF0SW5kZXhdO1xuXG5cdHRoaXMucG9zaXRpb24ueCA9IHBvcy54O1xuXHR0aGlzLnBvc2l0aW9uLnkgPSBwb3MueTtcblxuXHR2YXIgc3R5bGU7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDIwcHggQXJpYWxcIlxuXHR9O1xuXG5cdHRoaXMubmFtZUZpZWxkID0gbmV3IFBJWEkuVGV4dChcIltuYW1lXVwiLCBzdHlsZSk7XG5cdHRoaXMubmFtZUZpZWxkLnBvc2l0aW9uLnkgPSAtMjA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5uYW1lRmllbGQpO1xuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwibm9ybWFsIDEycHggQXJpYWxcIlxuXHR9O1xuXG5cdHRoaXMuY2hpcHNGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbbmFtZV1cIiwgc3R5bGUpO1xuXHR0aGlzLmNoaXBzRmllbGQucG9zaXRpb24ueSA9IDU7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5jaGlwc0ZpZWxkKTtcblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMjBweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5hY3Rpb25GaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJhY3Rpb25cIiwgc3R5bGUpO1xuXHR0aGlzLmFjdGlvbkZpZWxkLnBvc2l0aW9uLnkgPSAtMTM7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5hY3Rpb25GaWVsZCk7XG5cdHRoaXMuYWN0aW9uRmllbGQuYWxwaGEgPSAwO1xuXG5cdHRoaXMuc2V0TmFtZShcIlwiKTtcblx0dGhpcy5zZXRDaGlwcyhcIlwiKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTZWF0VmlldywgQnV0dG9uKTtcblxuLyoqXG4gKiBTZXQgbmFtZS5cbiAqIEBtZXRob2Qgc2V0TmFtZVxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuc2V0TmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcblx0dGhpcy5uYW1lRmllbGQuc2V0VGV4dChuYW1lKTtcblx0dGhpcy5uYW1lRmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cblx0dGhpcy5uYW1lRmllbGQucG9zaXRpb24ueCA9IC10aGlzLm5hbWVGaWVsZC5jYW52YXMud2lkdGggLyAyO1xufVxuXG4vKipcbiAqIFNldCBuYW1lLlxuICogQG1ldGhvZCBzZXRDaGlwc1xuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuc2V0Q2hpcHMgPSBmdW5jdGlvbihjaGlwcykge1xuXHR0aGlzLmNoaXBzRmllbGQuc2V0VGV4dChjaGlwcyk7XG5cdHRoaXMuY2hpcHNGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblxuXHR0aGlzLmNoaXBzRmllbGQucG9zaXRpb24ueCA9IC10aGlzLmNoaXBzRmllbGQuY2FudmFzLndpZHRoIC8gMjtcbn1cblxuLyoqXG4gKiBTZXQgc2l0b3V0LlxuICogQG1ldGhvZCBzZXRTaXRvdXRcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLnNldFNpdG91dCA9IGZ1bmN0aW9uKHNpdG91dCkge1xuXHRpZiAoc2l0b3V0KVxuXHRcdHRoaXMuYWxwaGEgPSAuNTtcblxuXHRlbHNlXG5cdFx0dGhpcy5hbHBoYSA9IDE7XG59XG5cbi8qKlxuICogU2V0IHNpdG91dC5cbiAqIEBtZXRob2Qgc2V0QWN0aXZlXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXRBY3RpdmUgPSBmdW5jdGlvbihhY3RpdmUpIHtcblx0dGhpcy52aXNpYmxlID0gYWN0aXZlO1xufVxuXG4vKipcbiAqIEFkZCBwb2NrZXQgY2FyZC5cbiAqIEBtZXRob2QgYWRkUG9ja2V0Q2FyZFxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuYWRkUG9ja2V0Q2FyZCA9IGZ1bmN0aW9uKGNhcmRWaWV3KSB7XG5cdHRoaXMucG9ja2V0Q2FyZHMucHVzaChjYXJkVmlldyk7XG59XG5cbi8qKlxuICogR2V0IHBvY2tldCBjYXJkcy5cbiAqIEBtZXRob2QgZ2V0UG9ja2V0Q2FyZHNcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLmdldFBvY2tldENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnBvY2tldENhcmRzO1xufVxuXG4vKipcbiAqIEZvbGQgY2FyZHMuXG4gKiBAbWV0aG9kIGZvbGRDYXJkc1xuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuZm9sZENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucG9ja2V0Q2FyZHNbMF0uYWRkRXZlbnRMaXN0ZW5lcihcImFuaW1hdGlvbkRvbmVcIiwgdGhpcy5vbkZvbGRDb21wbGV0ZSwgdGhpcyk7XG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnBvY2tldENhcmRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5wb2NrZXRDYXJkc1tpXS5mb2xkKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBGb2xkIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvbkZvbGRDb21wbGV0ZVxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUub25Gb2xkQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5wb2NrZXRDYXJkc1swXS5yZW1vdmVFdmVudExpc3RlbmVyKFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzLm9uRm9sZENvbXBsZXRlLCB0aGlzKTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiKTtcbn1cblxuLyoqXG4gKiBTaG93IHVzZXIgYWN0aW9uLlxuICogQG1ldGhvZCBhY3Rpb25cbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLmFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHR0aGlzLmFjdGlvbkZpZWxkLnNldFRleHQoYWN0aW9uKTtcblx0dGhpcy5hY3Rpb25GaWVsZC5wb3NpdGlvbi54ID0gLXRoaXMuYWN0aW9uRmllbGQuY2FudmFzLndpZHRoIC8gMjtcblxuXHR0aGlzLmFjdGlvbkZpZWxkLmFscGhhID0gMTtcblx0dGhpcy5uYW1lRmllbGQuYWxwaGEgPSAwO1xuXHR0aGlzLmNoaXBzRmllbGQuYWxwaGEgPSAwO1xuXG5cdHNldFRpbWVvdXQodGhpcy5vblRpbWVyLmJpbmQodGhpcyksIDEwMDApO1xufVxuXG4vKipcbiAqIFNob3cgdXNlciBhY3Rpb24uXG4gKiBAbWV0aG9kIGFjdGlvblxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUub25UaW1lciA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXG5cdHZhciB0MSA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzLmFjdGlvbkZpZWxkKVxuXHRcdFx0XHRcdFx0XHQudG8oe2FscGhhOiAwfSwgMTAwMClcblx0XHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cdHZhciB0MiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzLm5hbWVGaWVsZClcblx0XHRcdFx0XHRcdFx0LnRvKHthbHBoYTogMX0sIDEwMDApXG5cdFx0XHRcdFx0XHRcdC5zdGFydCgpO1xuXHR2YXIgdDMgPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5jaGlwc0ZpZWxkKVxuXHRcdFx0XHRcdFx0XHQudG8oe2FscGhhOiAxfSwgMTAwMClcblx0XHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cbn1cblxuLyoqXG4gKiBDbGVhci5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpO1xuXG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdHRoaXMuc2l0b3V0ID0gZmFsc2U7XG5cdC8vc2VhdC5iZXRDaGlwcy5zZXRWYWx1ZSgwKTtcblx0dGhpcy5zZXROYW1lKFwiXCIpO1xuXHR0aGlzLnNldENoaXBzKFwiXCIpO1xuXG5cdGZvciAoaT0wOyBpPHRoaXMucG9ja2V0Q2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5wb2NrZXRDYXJkc1tpXS5oaWRlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VhdFZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoXCIuLi9hcHAvU2V0dGluZ3NcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBDaGVja2JveCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9DaGVja2JveFwiKTtcblxuXG5cbi8qKlxuICogQ2hlY2tib3hlcyB2aWV3XG4gKiBAY2xhc3MgU2V0dGluZ3NDaGVja2JveFxuICovXG4gZnVuY3Rpb24gU2V0dGluZ3NDaGVja2JveChpZCwgc3RyaW5nKSB7XG4gXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuIFx0dGhpcy5pZCA9IGlkO1xuXG4gXHR2YXIgeSA9IDA7XG5cbiBcdHZhciBzdHlsZU9iamVjdCA9IHtcbiBcdFx0d2lkdGg6IDIwMCxcbiBcdFx0aGVpZ2h0OiAyNSxcbiBcdFx0Zm9udDogXCJib2xkIDEzcHggQXJpYWxcIixcbiBcdFx0Y29sb3I6IFwid2hpdGVcIlxuIFx0fTtcbiBcdHRoaXMubGFiZWwgPSBuZXcgUElYSS5UZXh0KHN0cmluZywgc3R5bGVPYmplY3QpO1xuIFx0dGhpcy5sYWJlbC5wb3NpdGlvbi54ID0gMjU7XG4gXHR0aGlzLmxhYmVsLnBvc2l0aW9uLnkgPSB5ICsgMTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5sYWJlbCk7XG5cbiBcdHZhciBiYWNrZ3JvdW5kID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGVja2JveEJhY2tncm91bmRcIikpO1xuIFx0dmFyIHRpY2sgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoZWNrYm94VGlja1wiKSk7XG4gXHR0aWNrLnggPSAxO1xuXG4gXHR0aGlzLmNoZWNrYm94ID0gbmV3IENoZWNrYm94KGJhY2tncm91bmQsIHRpY2spO1xuIFx0dGhpcy5jaGVja2JveC5wb3NpdGlvbi55ID0geTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5jaGVja2JveCk7XG5cbiBcdHRoaXMuY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uQ2hlY2tib3hDaGFuZ2UsIHRoaXMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNldHRpbmdzQ2hlY2tib3gsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChTZXR0aW5nc0NoZWNrYm94KTtcblxuLyoqXG4gKiBDaGVja2JveCBjaGFuZ2UuXG4gKiBAbWV0aG9kIG9uQ2hlY2tib3hDaGFuZ2VcbiAqL1xuU2V0dGluZ3NDaGVja2JveC5wcm90b3R5cGUub25DaGVja2JveENoYW5nZSA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIiwgdGhpcyk7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDaGVja2VkXG4gKi9cblNldHRpbmdzQ2hlY2tib3gucHJvdG90eXBlLmdldENoZWNrZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hlY2tib3guZ2V0Q2hlY2tlZCgpO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0Q2hlY2tlZFxuICovXG5TZXR0aW5nc0NoZWNrYm94LnByb3RvdHlwZS5zZXRDaGVja2VkID0gZnVuY3Rpb24oY2hlY2tlZCkge1xuXHR0aGlzLmNoZWNrYm94LnNldENoZWNrZWQoY2hlY2tlZCk7XG5cdHJldHVybiBjaGVja2VkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzQ2hlY2tib3g7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBTZXR0aW5ncyA9IHJlcXVpcmUoXCIuLi9hcHAvU2V0dGluZ3NcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBTZXR0aW5nc0NoZWNrYm94ID0gcmVxdWlyZShcIi4vU2V0dGluZ3NDaGVja2JveFwiKTtcbnZhciBSYWlzZVNob3J0Y3V0QnV0dG9uID0gcmVxdWlyZShcIi4vUmFpc2VTaG9ydGN1dEJ1dHRvblwiKTtcbnZhciBDaGVja2JveE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlXCIpO1xuXG5cblxuLyoqXG4gKiBBIHNldHRpbmdzIHZpZXdcbiAqIEBjbGFzcyBTZXR0aW5nc1ZpZXdcbiAqL1xuIGZ1bmN0aW9uIFNldHRpbmdzVmlldygpIHtcbiBcdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG4gXHR2YXIgb2JqZWN0ID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuIFx0dmFyIGJnID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hhdEJhY2tncm91bmRcIiksIDEwLCAxMCwgMTAsIDEwKTtcbiBcdGJnLndpZHRoID0gMzA7XG4gXHRiZy5oZWlnaHQgPSAzMDtcbiBcdG9iamVjdC5hZGRDaGlsZChiZyk7XG5cbiBcdHZhciBzcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcIndyZW5jaEljb25cIikpO1xuIFx0c3ByaXRlLnggPSA1O1xuIFx0c3ByaXRlLnkgPSA1O1xuIFx0b2JqZWN0LmFkZENoaWxkKHNwcml0ZSk7XG5cbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24gPSBuZXcgQnV0dG9uKG9iamVjdCk7XG4gXHR0aGlzLnNldHRpbmdzQnV0dG9uLnBvc2l0aW9uLnggPSA5NjAgLSAxMCAtIHRoaXMuc2V0dGluZ3NCdXR0b24ud2lkdGg7XG4gXHR0aGlzLnNldHRpbmdzQnV0dG9uLnBvc2l0aW9uLnkgPSA1NDM7XG4gXHR0aGlzLnNldHRpbmdzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoQnV0dG9uLkNMSUNLLCB0aGlzLm9uU2V0dGluZ3NCdXR0b25DbGljaywgdGhpcyk7XG4gXHR0aGlzLmFkZENoaWxkKHRoaXMuc2V0dGluZ3NCdXR0b24pO1xuXG4gXHR0aGlzLnNldHRpbmdzTWVudSA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcbiBcdFxuIFx0dmFyIG1iZyA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoYXRCYWNrZ3JvdW5kXCIpLCAxMCwgMTAsIDEwLCAxMCk7XG4gXHRtYmcud2lkdGggPSAyNTA7XG4gXHRtYmcuaGVpZ2h0ID0gMTAwO1xuIFx0dGhpcy5zZXR0aW5nc01lbnUuYWRkQ2hpbGQobWJnKTtcblxuIFx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuIFx0XHRmb250OiBcImJvbGQgMTRweCBBcmlhbFwiLFxuIFx0XHRjb2xvcjogXCIjRkZGRkZGXCIsXG4gXHRcdHdpZHRoOiAyMDAsXG4gXHRcdGhlaWdodDogMjBcbiBcdH07XG4gXHR2YXIgbGFiZWwgPSBuZXcgUElYSS5UZXh0KFwiU2V0dGluZ3NcIiwgc3R5bGVPYmplY3QpO1xuIFx0bGFiZWwucG9zaXRpb24ueCA9IDE2O1xuIFx0bGFiZWwucG9zaXRpb24ueSA9IDEwO1xuXG4gXHR0aGlzLnNldHRpbmdzTWVudS5hZGRDaGlsZChsYWJlbCk7XG4gXHR0aGlzLnNldHRpbmdzTWVudS5wb3NpdGlvbi54ID0gOTYwIC0gMTAgLSB0aGlzLnNldHRpbmdzTWVudS53aWR0aDtcbiBcdHRoaXMuc2V0dGluZ3NNZW51LnBvc2l0aW9uLnkgPSA1MzggLSB0aGlzLnNldHRpbmdzTWVudS5oZWlnaHQ7XG4gXHR0aGlzLmFkZENoaWxkKHRoaXMuc2V0dGluZ3NNZW51KTtcblxuIFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXG4gXHR0aGlzLmNyZWF0ZU1lbnVTZXR0aW5nKFwicGxheUFuaW1hdGlvbnNcIiwgXCJQbGF5IGFuaW1hdGlvbnNcIiwgNDAsIFNldHRpbmdzLmdldEluc3RhbmNlKCkucGxheUFuaW1hdGlvbnMpO1xuIFx0dGhpcy5jcmVhdGVNZW51U2V0dGluZyhDaGVja2JveE1lc3NhZ2UuQVVUT19NVUNLX0xPU0lORywgXCJNdWNrIGxvc2luZyBoYW5kc1wiLCA2NSk7XG5cbiBcdHRoaXMuY3JlYXRlU2V0dGluZyhDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EUywgXCJQb3N0IGJsaW5kc1wiLCAwKTtcbiBcdHRoaXMuY3JlYXRlU2V0dGluZyhDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFQsIFwiU2l0IG91dFwiLCAyNSk7XG5cbiBcdHRoaXMuc2V0dGluZ3NNZW51LnZpc2libGUgPSBmYWxzZTtcblxuIFx0dGhpcy5idXlDaGlwc0J1dHRvbiA9IG5ldyBSYWlzZVNob3J0Y3V0QnV0dG9uKCk7XG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm9uQnV5Q2hpcHNDbGljaywgdGhpcyk7XG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnggPSA3MDA7XG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnkgPSA2MzU7XG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnNldFRleHQoXCJCdXkgY2hpcHNcIik7XG4gXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV5Q2hpcHNCdXR0b24pO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNldHRpbmdzVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFNldHRpbmdzVmlldyk7XG5cblNldHRpbmdzVmlldy5CVVlfQ0hJUFNfQ0xJQ0sgPSBcImJ1eUNoaXBzQ2xpY2tcIjtcblxuLyoqXG4gKiBPbiBidXkgY2hpcHMgYnV0dG9uIGNsaWNrZWQuXG4gKiBAbWV0aG9kIG9uQnV5Q2hpcHNDbGlja1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uQnV5Q2hpcHNDbGljayA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRjb25zb2xlLmxvZyhcImJ1eSBjaGlwcyBjbGlja1wiKTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFNldHRpbmdzVmlldy5CVVlfQ0hJUFNfQ0xJQ0spO1xufVxuXG4vKipcbiAqIENyZWF0ZSBjaGVja2JveC5cbiAqIEBtZXRob2QgY3JlYXRlTWVudVNldHRpbmdcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5jcmVhdGVNZW51U2V0dGluZyA9IGZ1bmN0aW9uKGlkLCBzdHJpbmcsIHksIGRlZikge1xuXHR2YXIgc2V0dGluZyA9IG5ldyBTZXR0aW5nc0NoZWNrYm94KGlkLCBzdHJpbmcpO1xuXG5cdHNldHRpbmcueSA9IHk7XG5cdHNldHRpbmcueCA9IDE2O1xuXHR0aGlzLnNldHRpbmdzTWVudS5hZGRDaGlsZChzZXR0aW5nKTtcblxuXHRzZXR0aW5nLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vbkNoZWNrYm94Q2hhbmdlLCB0aGlzKVxuXG5cdHRoaXMuc2V0dGluZ3NbaWRdID0gc2V0dGluZztcblx0c2V0dGluZy5zZXRDaGVja2VkKGRlZik7XG59XG5cbi8qKlxuICogQ3JlYXRlIHNldHRpbmcuXG4gKiBAbWV0aG9kIGNyZWF0ZVNldHRpbmdcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5jcmVhdGVTZXR0aW5nID0gZnVuY3Rpb24oaWQsIHN0cmluZywgeSkge1xuXHR2YXIgc2V0dGluZyA9IG5ldyBTZXR0aW5nc0NoZWNrYm94KGlkLCBzdHJpbmcpO1xuXG5cdHNldHRpbmcueSA9IDU0NSt5O1xuXHRzZXR0aW5nLnggPSA3MDA7XG5cdHRoaXMuYWRkQ2hpbGQoc2V0dGluZyk7XG5cblx0c2V0dGluZy5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25DaGVja2JveENoYW5nZSwgdGhpcylcblxuXHR0aGlzLnNldHRpbmdzW2lkXSA9IHNldHRpbmc7XG59XG5cbi8qKlxuICogQ2hlY2tib3ggY2hhbmdlLlxuICogQG1ldGhvZCBvbkNoZWNrYm94Q2hhbmdlXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUub25DaGVja2JveENoYW5nZSA9IGZ1bmN0aW9uKGNoZWNrYm94KSB7XG5cdGlmKGNoZWNrYm94LmlkID09IFwicGxheUFuaW1hdGlvbnNcIikge1xuXHRcdFNldHRpbmdzLmdldEluc3RhbmNlKCkucGxheUFuaW1hdGlvbnMgPSBjaGVja2JveC5nZXRDaGVja2VkKCk7XG5cdFx0Y29uc29sZS5sb2coXCJhbmltcyBjaGFuZ2VkLi5cIik7XG5cdH1cblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIiwgY2hlY2tib3guaWQsIGNoZWNrYm94LmdldENoZWNrZWQoKSk7XG59XG5cbi8qKlxuICogU2V0dGluZ3MgYnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvblNldHRpbmdzQnV0dG9uQ2xpY2tcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vblNldHRpbmdzQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0Y29uc29sZS5sb2coXCJTZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU2V0dGluZ3NCdXR0b25DbGlja1wiKTtcblx0dGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSA9ICF0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlO1xuXG5cdGlmKHRoaXMuc2V0dGluZ3NNZW51LnZpc2libGUpIHtcblx0XHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IHRoaXMub25TdGFnZU1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gbnVsbDtcblx0fVxufVxuXG4vKipcbiAqIFN0YWdlIG1vdXNlIGRvd24uXG4gKiBAbWV0aG9kIG9uU3RhZ2VNb3VzZURvd25cbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vblN0YWdlTW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGNvbnNvbGUubG9nKFwiU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vblN0YWdlTW91c2VEb3duXCIpO1xuXHRpZigodGhpcy5oaXRUZXN0KHRoaXMuc2V0dGluZ3NNZW51LCBpbnRlcmFjdGlvbl9vYmplY3QpKSB8fCAodGhpcy5oaXRUZXN0KHRoaXMuc2V0dGluZ3NCdXR0b24sIGludGVyYWN0aW9uX29iamVjdCkpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSBudWxsO1xuXHR0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlID0gZmFsc2U7XG59XG5cbi8qKlxuICogSGl0IHRlc3QuXG4gKiBAbWV0aG9kIGhpdFRlc3RcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5oaXRUZXN0ID0gZnVuY3Rpb24ob2JqZWN0LCBpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0aWYoKGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueCA+IG9iamVjdC5nZXRCb3VuZHMoKS54ICkgJiYgKGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueCA8IChvYmplY3QuZ2V0Qm91bmRzKCkueCArIG9iamVjdC5nZXRCb3VuZHMoKS53aWR0aCkpICYmXG5cdFx0KGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueSA+IG9iamVjdC5nZXRCb3VuZHMoKS55KSAmJiAoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC55IDwgKG9iamVjdC5nZXRCb3VuZHMoKS55ICsgb2JqZWN0LmdldEJvdW5kcygpLmhlaWdodCkpKSB7XG5cdFx0cmV0dXJuIHRydWU7XHRcdFxuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBSZXNldC5cbiAqIEBtZXRob2QgcmVzZXRcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLmVuYWJsZWQgPSB0cnVlO1xuXHR0aGlzLnNldFZpc2libGVCdXR0b25zKFtdKTtcbn1cblxuLyoqXG4gKiBTZXQgdmlzaWJsZSBidXR0b25zLlxuICogQG1ldGhvZCBzZXRWaXNpYmxlQnV0dG9uc1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLnNldFZpc2libGVCdXR0b25zID0gZnVuY3Rpb24oYnV0dG9ucykge1xuXHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnZpc2libGUgPSBidXR0b25zLmluZGV4T2YoQnV0dG9uRGF0YS5CVVlfQ0hJUFMpICE9IC0xO1xuXHR0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTXS52aXNpYmxlID0gYnV0dG9ucy5pbmRleE9mKENoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTKTtcblx0dGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFRdLnZpc2libGUgPSBidXR0b25zLmluZGV4T2YoQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUKTtcblxuXHR2YXIgeXAgPSA1NDM7XG5cblx0aWYodGhpcy5idXlDaGlwc0J1dHRvbi52aXNpYmxlKSB7XG5cdFx0dGhpcy5idXlDaGlwc0J1dHRvbi55ID0geXA7XG5cdFx0eXAgKz0gMzU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0eXAgKz0gMjtcblx0fVxuXG5cdGlmKHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFNdLnZpc2libGUpIHtcblx0XHR0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTXS55ID0geXA7XG5cdFx0eXAgKz0gMjU7XG5cdH1cblxuXHRpZih0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVF0udmlzaWJsZSkge1xuXHRcdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUXS55ID0geXA7XG5cdFx0eXAgKz0gMjU7XG5cdH1cbn1cblxuLyoqXG4gKiBHZXQgY2hlY2tib3guXG4gKiBAbWV0aG9kIGdldENoZWNrYm94QnlJZFxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmdldENoZWNrYm94QnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG5cdHJldHVybiB0aGlzLnNldHRpbmdzW2lkXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nc1ZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG5cblxuXG4vKipcbiAqIEEgdGltZXIgdmlld1xuICogQGNsYXNzIFRpbWVyVmlld1xuICovXG5mdW5jdGlvbiBUaW1lclZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXHRcblx0dGhpcy50aW1lckNsaXAgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRpbWVyQmFja2dyb3VuZFwiKSk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50aW1lckNsaXApO1xuXG5cblx0dGhpcy5jYW52YXMgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmNhbnZhcy54ID0gdGhpcy50aW1lckNsaXAud2lkdGgqMC41O1xuXHR0aGlzLmNhbnZhcy55ID0gdGhpcy50aW1lckNsaXAuaGVpZ2h0KjAuNTtcblx0dGhpcy50aW1lckNsaXAuYWRkQ2hpbGQodGhpcy5jYW52YXMpO1xuXG5cdHRoaXMudGltZXJDbGlwLnZpc2libGUgPSBmYWxzZTtcblxuXHR0aGlzLnR3ZWVuID0gbnVsbDtcblxuXHQvL3RoaXMuc2hvd1BlcmNlbnQoMzApO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFRpbWVyVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFRpbWVyVmlldyk7XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50aW1lckNsaXAudmlzaWJsZSA9IGZhbHNlO1xuXHR0aGlzLnN0b3AoKTtcbn1cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xuXHRcblx0dGhpcy50aW1lckNsaXAudmlzaWJsZSA9IHRydWU7XG5cdHRoaXMudGltZXJDbGlwLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJzZWF0UG9zaXRpb25zXCIpW3NlYXRJbmRleF0ueCArIDU1O1xuXHR0aGlzLnRpbWVyQ2xpcC55ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLnkgLSAzMDtcblxuXHR0aGlzLnN0b3AoKTtcblxufVxuXG4vKipcbiAqIFN0b3AuXG4gKiBAbWV0aG9kIHN0b3BcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oc2VhdEluZGV4KSB7XG5cdGlmKHRoaXMudHdlZW4gIT0gbnVsbClcblx0XHR0aGlzLnR3ZWVuLnN0b3AoKTtcblxufVxuXG4vKipcbiAqIENvdW50ZG93bi5cbiAqIEBtZXRob2QgY291bnRkb3duXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuY291bnRkb3duID0gZnVuY3Rpb24odG90YWxUaW1lLCB0aW1lTGVmdCkge1xuXHR0aGlzLnN0b3AoKTtcblxuXHR0b3RhbFRpbWUgKj0gMTAwMDtcblx0dGltZUxlZnQgKj0gMTAwMDtcblxuXHR2YXIgdGltZSA9IERhdGUubm93KCk7XG5cdHRoaXMuc3RhcnRBdCA9IHRpbWUgKyB0aW1lTGVmdCAtIHRvdGFsVGltZTtcblx0dGhpcy5zdG9wQXQgPSB0aW1lICsgdGltZUxlZnQ7XG5cblx0dGhpcy50d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih7dGltZTogdGltZX0pXG5cdFx0XHRcdFx0XHQudG8oe3RpbWU6IHRoaXMuc3RvcEF0fSwgdGltZUxlZnQpXG5cdFx0XHRcdFx0XHQub25VcGRhdGUodGhpcy5vblVwZGF0ZS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdFx0Lm9uQ29tcGxldGUodGhpcy5vbkNvbXBsZXRlLmJpbmQodGhpcykpXG5cdFx0XHRcdFx0XHQuc3RhcnQoKTtcblxufVxuXG4vKipcbiAqIE9uIHR3ZWVuIHVwZGF0ZS5cbiAqIEBtZXRob2Qgb25VcGRhdGVcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5vblVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZSA9IERhdGUubm93KCk7XG5cdHZhciBwZXJjZW50ID0gMTAwKih0aW1lIC0gdGhpcy5zdGFydEF0KS8odGhpcy5zdG9wQXQgLSB0aGlzLnN0YXJ0QXQpO1xuXG4vL1x0Y29uc29sZS5sb2coXCJwID0gXCIgKyBwZXJjZW50KTtcblxuXHR0aGlzLnNob3dQZXJjZW50KHBlcmNlbnQpO1xufVxuXG4vKipcbiAqIE9uIHR3ZWVuIHVwZGF0ZS5cbiAqIEBtZXRob2Qgb25VcGRhdGVcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5vbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lID0gRGF0ZS5ub3coKTtcblx0dmFyIHBlcmNlbnQgPSAxMDA7XG5cdHRoaXMuc2hvd1BlcmNlbnQocGVyY2VudCk7XG5cdHRoaXMudHdlZW4gPSBudWxsO1xufVxuXG4vKipcbiAqIFNob3cgcGVyY2VudC5cbiAqIEBtZXRob2Qgc2hvd1BlcmNlbnRcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5zaG93UGVyY2VudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdGlmICh2YWx1ZSA8IDApXG5cdFx0dmFsdWUgPSAwO1xuXG5cdGlmICh2YWx1ZSA+IDEwMClcblx0XHR2YWx1ZSA9IDEwMDtcblxuXHR0aGlzLmNhbnZhcy5jbGVhcigpO1xuXG5cdHRoaXMuY2FudmFzLmJlZ2luRmlsbCgweGMwMDAwMCk7XG5cdHRoaXMuY2FudmFzLmRyYXdDaXJjbGUoMCwwLDEwKTtcblx0dGhpcy5jYW52YXMuZW5kRmlsbCgpO1xuXG5cdHRoaXMuY2FudmFzLmJlZ2luRmlsbCgweGZmZmZmZik7XG5cdHRoaXMuY2FudmFzLm1vdmVUbygwLDApO1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgMzM7IGkrKykge1xuXHRcdHRoaXMuY2FudmFzLmxpbmVUbyhcblx0XHRcdFx0XHRcdFx0MTAqTWF0aC5jb3MoaSp2YWx1ZSoyKk1hdGguUEkvKDMyKjEwMCkgLSBNYXRoLlBJLzIpLFxuXHRcdFx0XHRcdFx0XHQxMCpNYXRoLnNpbihpKnZhbHVlKjIqTWF0aC5QSS8oMzIqMTAwKSAtIE1hdGguUEkvMilcblx0XHRcdFx0XHRcdCk7XG5cdH1cblxuXHR0aGlzLmNhbnZhcy5saW5lVG8oMCwwKTtcblx0dGhpcy5jYW52YXMuZW5kRmlsbCgpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGltZXJWaWV3OyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG5cbnZhciBJbml0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0luaXRNZXNzYWdlXCIpO1xudmFyIFN0YXRlQ29tcGxldGVNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvU3RhdGVDb21wbGV0ZU1lc3NhZ2VcIik7XG52YXIgU2VhdEluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvU2VhdEluZm9NZXNzYWdlXCIpO1xudmFyIENvbW11bml0eUNhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0NvbW11bml0eUNhcmRzTWVzc2FnZVwiKTtcbnZhciBQb2NrZXRDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Qb2NrZXRDYXJkc01lc3NhZ2VcIik7XG52YXIgU2VhdENsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1NlYXRDbGlja01lc3NhZ2VcIik7XG52YXIgU2hvd0RpYWxvZ01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9TaG93RGlhbG9nTWVzc2FnZVwiKTtcbnZhciBCdXR0b25DbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgQnV0dG9uc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9CdXR0b25zTWVzc2FnZVwiKTtcbnZhciBEZWxheU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9EZWxheU1lc3NhZ2VcIik7XG52YXIgQ2xlYXJNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ2xlYXJNZXNzYWdlXCIpO1xudmFyIERlYWxlckJ1dHRvbk1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9EZWFsZXJCdXR0b25NZXNzYWdlXCIpO1xudmFyIEJldE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9CZXRNZXNzYWdlXCIpO1xudmFyIEJldHNUb1BvdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9CZXRzVG9Qb3RNZXNzYWdlXCIpO1xuXG52YXIgQWN0aW9uTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0FjdGlvbk1lc3NhZ2VcIik7XG52YXIgQ2hhdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9DaGF0TWVzc2FnZVwiKTtcbnZhciBDaGVja2JveE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9DaGVja2JveE1lc3NhZ2VcIik7XG52YXIgRmFkZVRhYmxlTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0ZhZGVUYWJsZU1lc3NhZ2VcIik7XG52YXIgSGFuZEluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvSGFuZEluZm9NZXNzYWdlXCIpO1xudmFyIEludGVyZmFjZVN0YXRlTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0ludGVyZmFjZVN0YXRlTWVzc2FnZVwiKTtcbnZhciBQYXlPdXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUGF5T3V0TWVzc2FnZVwiKTtcbnZhciBQb3RNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUG90TWVzc2FnZVwiKTtcbnZhciBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9QcmVzZXRCdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgUHJlc2V0QnV0dG9uc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9QcmVzZXRCdXR0b25zTWVzc2FnZVwiKTtcbnZhciBQcmVUb3VybmFtZW50SW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9QcmVUb3VybmFtZW50SW5mb01lc3NhZ2VcIik7XG52YXIgVGFibGVCdXR0b25DbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZVwiKTtcbnZhciBUYWJsZUJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGFibGVCdXR0b25zTWVzc2FnZVwiKTtcbnZhciBUYWJsZUluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGFibGVJbmZvTWVzc2FnZVwiKTtcbnZhciBUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGVzdENhc2VSZXF1ZXN0TWVzc2FnZVwiKTtcbnZhciBUaW1lck1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9UaW1lck1lc3NhZ2VcIik7XG52YXIgVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Ub3VybmFtZW50UmVzdWx0TWVzc2FnZVwiKTtcbnZhciBGb2xkQ2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRm9sZENhcmRzTWVzc2FnZVwiKTtcblxuLyoqXG4gKiBBIHByb3RvY29sIGNvbm5lY3Rpb24gd2l0aCBhbiB1bmRlcmx5aW5nIGNvbm5lY3Rpb24uXG4gKlxuICogVGhlcmUgYXJlIHR3byB3YXlzIHRvIGxpdGVuIGZvciBjb25uZWN0aW9ucywgdGhlIGZpcnN0IG9uZSBhbmQgbW9zdCBzdHJhaWdodFxuICogZm9yd2FyZCBpcyB0aGUgYWRkTWVzc2FnZUhhbmRsZXIsIHdoaWNoIHJlZ2lzdGVycyBhIGxpc3RlbmVyIGZvciBhXG4gKiBwYXJ0aWN1bGFyIG5ldHdvcmsgbWVzc2FnZS4gVGhlIGZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSB0aGUgbWVzc2FnZVxuICogY2xhc3MgdG8gbGlzdGVuIGZvcjpcbiAqXG4gKiAgICAgZnVuY3Rpb24gb25TZWF0SW5mb01lc3NhZ2UobSkge1xuICogICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2VhdCBpcyBhY3RpdmUuXG4gKiAgICAgICAgIG0uaXNBY3RpdmUoKTtcbiAqICAgICB9XG4gKlxuICogICAgIHByb3RvQ29ubmVjdGlvbi5hZGRNZXNzYWdlSGFuZGxlcihTZWF0SW5mb01lc3NhZ2UsIG9uU2VhdEluZm9NZXNzYWdlKTtcbiAqXG4gKiBUaGUgc2Vjb25kIG1ldGhvZCBpcyB0byBsaXN0ZW4gdG8gdGhlIFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFIGRpc3BhdGNoZWRcbiAqIGJ5IHRoZSBpbnN0YW5jZSBvZiB0aGUgUHJvdG9Db25uZWN0aW9uLiBJbiB0aGlzIGNhc2UsIHRoZSBsaXN0ZW5lclxuICogd2lsbCBiZSBjYWxsZWQgZm9yIGFsbCBtZXNzYWdlcyByZWNlaXZlZCBvbiB0aGUgY29ubmVjdGlvbi5cbiAqXG4gKiAgICAgZnVuY3Rpb24gb25NZXNzYWdlKGUpIHtcbiAqICAgICAgICAgdmFyIG1lc3NhZ2U9ZS5tZXNzYWdlO1xuICpcbiAqICAgICAgICAgLy8gSXMgaXQgYSBTZWF0SW5mb01lc3NhZ2U/XG4gKiAgICAgICAgIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgU2VhdEluZm9NZXNzYWdlKSB7XG4gKiAgICAgICAgICAgICAvLyAuLi5cbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgcHJvdG9Db25uZWN0aW9uLmFkZE1lc3NhZ2VIYW5kbGVyKFNlYXRJbmZvTWVzc2FnZSwgb25NZXNzYWdlKTtcbiAqXG4gKiBUaGUgdW5kZXJseWluZyBjb25uZWN0aW9uIHNob3VsZCBiZSBhbiBvYmplY3QgdGhhdCBpbXBsZW1lbnRzIGFuIFwiaW50ZXJmYWNlXCJcbiAqIG9mIGEgY29ubmVjdGlvbi4gSXQgaXMgbm90IGFuIGludGVyZmFjZSBwZXIgc2UsIHNpbmNlIEphdmFTY3JpcHQgZG9lc24ndCBzdXBwb3J0XG4gKiBpdC4gQW55d2F5LCB0aGUgc2lnbmF0dXJlIG9mIHRoaXMgaW50ZXJmYWNlLCBpcyB0aGF0IHRoZSBjb25uZWN0aW9uIG9iamVjdFxuICogc2hvdWxkIGhhdmUgYSBgc2VuZGAgbWV0aG9kIHdoaWNoIHJlY2VpdmVzIGEgb2JqZWN0IHRvIGJlIHNlbmQuIEl0IHNob3VsZCBhbHNvXG4gKiBkaXNwYXRjaCBcIm1lc3NhZ2VcIiBldmVudHMgYXMgbWVzc2FnZXMgYXJlIHJlY2VpdmVkLCBhbmQgXCJjbG9zZVwiIGV2ZW50cyBpZiB0aGVcbiAqIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGJ5IHRoZSByZW1vdGUgcGFydHkuXG4gKlxuICogQGNsYXNzIFByb3RvQ29ubmVjdGlvblxuICogQGV4dGVuZHMgRXZlbnREaXNwYXRjaGVyXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSBjb25uZWN0aW9uIFRoZSB1bmRlcmx5aW5nIGNvbm5lY3Rpb24gb2JqZWN0LlxuICovXG5mdW5jdGlvbiBQcm90b0Nvbm5lY3Rpb24oY29ubmVjdGlvbikge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmxvZ01lc3NhZ2VzID0gZmFsc2U7XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG5cdHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG5cdHRoaXMuY29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCB0aGlzLm9uQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFByb3RvQ29ubmVjdGlvbiwgRXZlbnREaXNwYXRjaGVyKTtcblxuLyoqXG4gKiBUcmlnZ2VycyBpZiB0aGUgcmVtb3RlIHBhcnR5IGNsb3NlcyB0aGUgdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICogQGV2ZW50IFByb3RvQ29ubmVjdGlvbi5DTE9TRVxuICovXG5Qcm90b0Nvbm5lY3Rpb24uQ0xPU0UgPSBcImNsb3NlXCI7XG5cbi8qKlxuICogVHJpZ2dlcnMgd2hlbiB3ZSByZWNlaXZlIGEgbWVzc2FnZSBmcm9tIHRoZSByZW1vdGUgcGFydHkuXG4gKiBAZXZlbnQgUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRoYXQgd2FzIHJlY2VpdmVkLlxuICovXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSA9IFwibWVzc2FnZVwiO1xuXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFUyA9IHt9O1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbSW5pdE1lc3NhZ2UuVFlQRV0gPSBJbml0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1N0YXRlQ29tcGxldGVNZXNzYWdlLlRZUEVdID0gU3RhdGVDb21wbGV0ZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTZWF0SW5mb01lc3NhZ2UuVFlQRV0gPSBTZWF0SW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDb21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRV0gPSBDb21tdW5pdHlDYXJkc01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQb2NrZXRDYXJkc01lc3NhZ2UuVFlQRV0gPSBQb2NrZXRDYXJkc01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTZWF0Q2xpY2tNZXNzYWdlLlRZUEVdID0gU2VhdENsaWNrTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1Nob3dEaWFsb2dNZXNzYWdlLlRZUEVdID0gU2hvd0RpYWxvZ01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCdXR0b25zTWVzc2FnZS5UWVBFXSA9IEJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRGVsYXlNZXNzYWdlLlRZUEVdID0gRGVsYXlNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ2xlYXJNZXNzYWdlLlRZUEVdID0gQ2xlYXJNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRGVhbGVyQnV0dG9uTWVzc2FnZS5UWVBFXSA9IERlYWxlckJ1dHRvbk1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCZXRNZXNzYWdlLlRZUEVdID0gQmV0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0JldHNUb1BvdE1lc3NhZ2UuVFlQRV0gPSBCZXRzVG9Qb3RNZXNzYWdlO1xuXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tBY3Rpb25NZXNzYWdlLlRZUEVdID0gQWN0aW9uTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0NoYXRNZXNzYWdlLlRZUEVdID0gQ2hhdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDaGVja2JveE1lc3NhZ2UuVFlQRV0gPSBDaGVja2JveE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tGYWRlVGFibGVNZXNzYWdlLlRZUEVdID0gRmFkZVRhYmxlTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0hhbmRJbmZvTWVzc2FnZS5UWVBFXSA9IEhhbmRJbmZvTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0ludGVyZmFjZVN0YXRlTWVzc2FnZS5UWVBFXSA9IEludGVyZmFjZVN0YXRlTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1BheU91dE1lc3NhZ2UuVFlQRV0gPSBQYXlPdXRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUG90TWVzc2FnZS5UWVBFXSA9IFBvdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQcmVzZXRCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQcmVzZXRCdXR0b25zTWVzc2FnZS5UWVBFXSA9IFByZXNldEJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLlRZUEVdID0gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGFibGVCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBUYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlQnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBUYWJsZUJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGFibGVJbmZvTWVzc2FnZS5UWVBFXSA9IFRhYmxlSW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlLlRZUEVdID0gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RpbWVyTWVzc2FnZS5UWVBFXSA9IFRpbWVyTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLlRZUEVdID0gVG91cm5hbWVudFJlc3VsdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tGb2xkQ2FyZHNNZXNzYWdlLlRZUEVdID0gRm9sZENhcmRzTWVzc2FnZTtcblxuLyoqXG4gKiBBZGQgbWVzc2FnZSBoYW5kbGVyLlxuICogQG1ldGhvZCBhZGRNZXNzYWdlSGFuZGxlclxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLmFkZE1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKSB7XG5cdGlmIChtZXNzYWdlVHlwZS5oYXNPd25Qcm9wZXJ0eShcIlRZUEVcIikpXG5cdFx0bWVzc2FnZVR5cGUgPSBtZXNzYWdlVHlwZS5UWVBFO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIub24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgbWVzc2FnZSBoYW5kbGVyLlxuICogQG1ldGhvZCByZW1vdmVNZXNzYWdlSGFuZGxlclxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZU1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKSB7XG5cdGlmIChtZXNzYWdlVHlwZS5oYXNPd25Qcm9wZXJ0eShcIlRZUEVcIikpXG5cdFx0bWVzc2FnZVR5cGUgPSBtZXNzYWdlVHlwZS5UWVBFO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIub2ZmKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSk7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBtZXNzYWdlLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25NZXNzYWdlXG4gKiBAcHJpdmF0ZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLm9uQ29ubmVjdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbihldikge1xuXHR2YXIgbWVzc2FnZSA9IGV2Lm1lc3NhZ2U7XG5cdHZhciBjb25zdHJ1Y3RvcjtcblxuXHRpZiAodGhpcy5sb2dNZXNzYWdlcylcblx0XHRjb25zb2xlLmxvZyhcIj09PiBcIiArIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcblxuXHRmb3IgKHR5cGUgaW4gUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVMpIHtcblx0XHRpZiAobWVzc2FnZS50eXBlID09IHR5cGUpXG5cdFx0XHRjb25zdHJ1Y3RvciA9IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW3R5cGVdXG5cdH1cblxuXHRpZiAoIWNvbnN0cnVjdG9yKSB7XG5cdFx0Y29uc29sZS53YXJuKFwidW5rbm93biBtZXNzYWdlOiBcIiArIG1lc3NhZ2UudHlwZSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIG8gPSBuZXcgY29uc3RydWN0b3IoKTtcblx0by51bnNlcmlhbGl6ZShtZXNzYWdlKTtcblx0by50eXBlID0gbWVzc2FnZS50eXBlO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIudHJpZ2dlcihvKTtcblxuXHR0aGlzLnRyaWdnZXIoe1xuXHRcdHR5cGU6IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFLFxuXHRcdG1lc3NhZ2U6IG9cblx0fSk7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBjbG9zZS5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uQ2xvc2VcbiAqIEBwcml2YXRlXG4gKi9cblByb3RvQ29ubmVjdGlvbi5wcm90b3R5cGUub25Db25uZWN0aW9uQ2xvc2UgPSBmdW5jdGlvbihldikge1xuXHR0aGlzLmNvbm5lY3Rpb24ub2ZmKFwibWVzc2FnZVwiLCB0aGlzLm9uQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24ub2ZmKFwiY2xvc2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZSwgdGhpcyk7XG5cdHRoaXMuY29ubmVjdGlvbiA9IG51bGw7XG5cblx0dGhpcy50cmlnZ2VyKFByb3RvQ29ubmVjdGlvbi5DTE9TRSk7XG59XG5cbi8qKlxuICogU2VuZCBhIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlbmRcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHR2YXIgc2VyaWFsaXplZCA9IG1lc3NhZ2Uuc2VyaWFsaXplKCk7XG5cblx0Zm9yICh0eXBlIGluIFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTKSB7XG5cdFx0aWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1t0eXBlXSlcblx0XHRcdHNlcmlhbGl6ZWQudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRpZiAoIXNlcmlhbGl6ZWQudHlwZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIG1lc3NhZ2UgdHlwZSBmb3Igc2VuZCwgbWVzc2FnZT1cIiArIG1lc3NhZ2UuY29uc3RydWN0b3IubmFtZSk7XG5cblx0Ly9cdGNvbnNvbGUubG9nKFwic2VuZGluZzogXCIrc2VyaWFsaXplZCk7XG5cblx0dGhpcy5jb25uZWN0aW9uLnNlbmQoc2VyaWFsaXplZCk7XG59XG5cbi8qKlxuICogU2hvdWxkIG1lc3NhZ2VzIGJlIGxvZ2dlZCB0byBjb25zb2xlP1xuICogQG1ldGhvZCBzZXRMb2dNZXNzYWdlc1xuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLnNldExvZ01lc3NhZ2VzID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5sb2dNZXNzYWdlcyA9IHZhbHVlO1xufVxuXG4vKipcbiAqIENsb3NlIHRoZSB1bmRlcmx5aW5nIGNvbm5lY3Rpb24uXG4gKiBAbWV0aG9kIGNsb3NlXG4gKi9cblByb3RvQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb25uZWN0aW9uLmNsb3NlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvdG9Db25uZWN0aW9uOyIsIi8qKlxuICogQnV0dG9uIGRhdGEuXG4gKiBAY2xhc3MgQnV0dG9uRGF0YVxuICovXG5mdW5jdGlvbiBCdXR0b25EYXRhKGJ1dHRvbiwgdmFsdWUpIHtcblx0dGhpcy5idXR0b24gPSBidXR0b247XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0LypcdHRoaXMubWluID0gLTE7XG5cdHRoaXMubWF4ID0gLTE7Ki9cbn1cblxuQnV0dG9uRGF0YS5SQUlTRSA9IFwicmFpc2VcIjtcbkJ1dHRvbkRhdGEuRk9MRCA9IFwiZm9sZFwiO1xuQnV0dG9uRGF0YS5CRVQgPSBcImJldFwiO1xuQnV0dG9uRGF0YS5TSVRfT1VUID0gXCJzaXRPdXRcIjtcbkJ1dHRvbkRhdGEuU0lUX0lOID0gXCJzaXRJblwiO1xuQnV0dG9uRGF0YS5DQUxMID0gXCJjYWxsXCI7XG5CdXR0b25EYXRhLlBPU1RfQkIgPSBcInBvc3RCQlwiO1xuQnV0dG9uRGF0YS5QT1NUX1NCID0gXCJwb3N0U0JcIjtcbkJ1dHRvbkRhdGEuQ0FOQ0VMID0gXCJjYW5jZWxcIjtcbkJ1dHRvbkRhdGEuQ0hFQ0sgPSBcImNoZWNrXCI7XG5CdXR0b25EYXRhLlNIT1cgPSBcInNob3dcIjtcbkJ1dHRvbkRhdGEuTVVDSyA9IFwibXVja1wiO1xuQnV0dG9uRGF0YS5PSyA9IFwib2tcIjtcbkJ1dHRvbkRhdGEuSU1fQkFDSyA9IFwiaW1CYWNrXCI7XG5CdXR0b25EYXRhLkxFQVZFID0gXCJsZWF2ZVwiO1xuQnV0dG9uRGF0YS5DSEVDS19GT0xEID0gXCJjaGVja0ZvbGRcIjtcbkJ1dHRvbkRhdGEuQ0FMTF9BTlkgPSBcImNhbGxBbnlcIjtcbkJ1dHRvbkRhdGEuUkFJU0VfQU5ZID0gXCJyYWlzZUFueVwiO1xuQnV0dG9uRGF0YS5CVVlfSU4gPSBcImJ1eUluXCI7XG5CdXR0b25EYXRhLlJFX0JVWSA9IFwicmVCdXlcIjtcbkJ1dHRvbkRhdGEuSk9JTl9UT1VSTkFNRU5UID0gXCJqb2luVG91cm5hbWVudFwiO1xuQnV0dG9uRGF0YS5MRUFWRV9UT1VSTkFNRU5UID0gXCJsZWF2ZVRvdXJuYW1lbnRcIjtcblxuLyoqXG4gKiBHZXQgYnV0dG9uLlxuICogQG1ldGhvZCBnZXRCdXR0b25cbiAqL1xuQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXQgYnV0dG9uIHN0cmluZyBmb3IgdGhpcyBidXR0b24uXG4gKiBAbWV0aG9kIGdldEJ1dHRvblN0cmluZ1xuICovXG5CdXR0b25EYXRhLnByb3RvdHlwZS5nZXRCdXR0b25TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIEJ1dHRvbkRhdGEuZ2V0QnV0dG9uU3RyaW5nRm9ySWQodGhpcy5idXR0b24pO1xufVxuXG4vKipcbiAqIEdldCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbiBzdHJpbmcgZm9yIGlkLlxuICogQG1ldGhvZCBnZXRCdXR0b25TdHJpbmdGb3JJZFxuICogQHN0YXRpY1xuICovXG5CdXR0b25EYXRhLmdldEJ1dHRvblN0cmluZ0ZvcklkID0gZnVuY3Rpb24oYikge1xuXHRzd2l0Y2ggKGIpIHtcblx0XHRjYXNlIEJ1dHRvbkRhdGEuRk9MRDpcblx0XHRcdHJldHVybiBcIkZPTERcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DQUxMOlxuXHRcdFx0cmV0dXJuIFwiQ0FMTFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlJBSVNFOlxuXHRcdFx0cmV0dXJuIFwiUkFJU0UgVE9cIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5CRVQ6XG5cdFx0XHRyZXR1cm4gXCJCRVRcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5TSVRfT1VUOlxuXHRcdFx0cmV0dXJuIFwiU0lUIE9VVFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlBPU1RfQkI6XG5cdFx0XHRyZXR1cm4gXCJQT1NUIEJCXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUE9TVF9TQjpcblx0XHRcdHJldHVybiBcIlBPU1QgU0JcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5TSVRfSU46XG5cdFx0XHRyZXR1cm4gXCJTSVQgSU5cIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DQU5DRUw6XG5cdFx0XHRyZXR1cm4gXCJDQU5DRUxcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DSEVDSzpcblx0XHRcdHJldHVybiBcIkNIRUNLXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuU0hPVzpcblx0XHRcdHJldHVybiBcIlNIT1dcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5NVUNLOlxuXHRcdFx0cmV0dXJuIFwiTVVDS1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLk9LOlxuXHRcdFx0cmV0dXJuIFwiT0tcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5JTV9CQUNLOlxuXHRcdFx0cmV0dXJuIFwiSSdNIEJBQ0tcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5MRUFWRTpcblx0XHRcdHJldHVybiBcIkxFQVZFXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0hFQ0tfRk9MRDpcblx0XHRcdHJldHVybiBcIkNIRUNLIC8gRk9MRFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNBTExfQU5ZOlxuXHRcdFx0cmV0dXJuIFwiQ0FMTCBBTllcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5SQUlTRV9BTlk6XG5cdFx0XHRyZXR1cm4gXCJSQUlTRSBBTllcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5SRV9CVVk6XG5cdFx0XHRyZXR1cm4gXCJSRS1CVVlcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5CVVlfSU46XG5cdFx0XHRyZXR1cm4gXCJCVVkgSU5cIjtcblx0fVxuXG5cdHJldHVybiBcIlwiO1xufVxuXG4vKkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldE1pbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5taW47XG59Ki9cblxuLypCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRNYXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWF4O1xufSovXG5cbkJ1dHRvbkRhdGEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBcIjxCdXR0b25EYXRhIGJ1dHRvbj1cIiArIHRoaXMuYnV0dG9uICsgXCI+XCI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uRGF0YTsiLCIvKipcbiAqIENhcmQgZGF0YS5cbiAqIEBjbGFzcyBDYXJkRGF0YVxuICovXG5mdW5jdGlvbiBDYXJkRGF0YSh2YWx1ZSkge1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbkNhcmREYXRhLkNBUkRfVkFMVUVfU1RSSU5HUyA9XG5cdFtcIjJcIiwgXCIzXCIsIFwiNFwiLCBcIjVcIiwgXCI2XCIsIFwiN1wiLCBcIjhcIiwgXCI5XCIsIFwiMTBcIiwgXCJKXCIsIFwiUVwiLCBcIktcIiwgXCJBXCJdO1xuXG5DYXJkRGF0YS5TVUlUX1NUUklOR1MgPVxuXHRbXCJEXCIsIFwiQ1wiLCBcIkhcIiwgXCJTXCJdO1xuXG5DYXJkRGF0YS5ISURERU4gPSAtMTtcblxuLyoqXG4gKiBEb2VzIHRoaXMgQ2FyZERhdGEgcmVwcmVzZW50IGEgc2hvdyBjYXJkP1xuICogSWYgbm90IGl0IHNob3VsZCBiZSByZW5kZXJlZCB3aXRoIGl0cyBiYWNrc2lkZS5cbiAqIEBtZXRob2QgaXNTaG93blxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuaXNTaG93biA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZSA+PSAwO1xufVxuXG4vKipcbiAqIEdldCBjYXJkIHZhbHVlLlxuICogVGhpcyB2YWx1ZSByZXByZXNlbnRzIHRoZSByYW5rIG9mIHRoZSBjYXJkLCBidXQgc3RhcnRzIG9uIDAuXG4gKiBAbWV0aG9kIGdldENhcmRWYWx1ZVxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0Q2FyZFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlICUgMTM7XG59XG5cbi8qKlxuICogR2V0IGNhcmQgdmFsdWUgc3RyaW5nLlxuICogQG1ldGhvZCBnZXRDYXJkVmFsdWVTdHJpbmdcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENhcmRWYWx1ZVN0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTW3RoaXMudmFsdWUgJSAxM107XG59XG5cbi8qKlxuICogR2V0IHN1aXQgaW5kZXguXG4gKiBAbWV0aG9kIGdldFN1aXRJbmRleFxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0U3VpdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBNYXRoLmZsb29yKHRoaXMudmFsdWUgLyAxMyk7XG59XG5cbi8qKlxuICogR2V0IHN1aXQgc3RyaW5nLlxuICogQG1ldGhvZCBnZXRTdWl0U3RyaW5nXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5nZXRTdWl0U3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBDYXJkRGF0YS5TVUlUX1NUUklOR1NbdGhpcy5nZXRTdWl0SW5kZXgoKV07XG59XG5cbi8qKlxuICogR2V0IGNvbG9yLlxuICogQG1ldGhvZCBnZXRDb2xvclxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0Q29sb3IgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuZ2V0U3VpdEluZGV4KCkgJSAyICE9IDApXG5cdFx0cmV0dXJuIFwiIzAwMDAwMFwiO1xuXG5cdGVsc2Vcblx0XHRyZXR1cm4gXCIjZmYwMDAwXCI7XG59XG5cbi8qKlxuICogVG8gc3RyaW5nLlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICovXG5DYXJkRGF0YS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMudmFsdWUgPCAwKVxuXHRcdHJldHVybiBcIlhYXCI7XG5cblx0Ly9cdHJldHVybiBcIjxjYXJkIFwiICsgdGhpcy5nZXRDYXJkVmFsdWVTdHJpbmcoKSArIHRoaXMuZ2V0U3VpdFN0cmluZygpICsgXCI+XCI7XG5cdHJldHVybiB0aGlzLmdldENhcmRWYWx1ZVN0cmluZygpICsgdGhpcy5nZXRTdWl0U3RyaW5nKCk7XG59XG5cbi8qKlxuICogR2V0IHZhbHVlIG9mIHRoZSBjYXJkLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogQ29tcGFyZSB3aXRoIHJlc3BlY3QgdG8gdmFsdWUuIE5vdCByZWFsbHkgdXNlZnVsIGV4Y2VwdCBmb3IgZGVidWdnaW5nIVxuICogQG1ldGhvZCBjb21wYXJlVmFsdWVcbiAqIEBzdGF0aWNcbiAqL1xuQ2FyZERhdGEuY29tcGFyZVZhbHVlID0gZnVuY3Rpb24oYSwgYikge1xuXHRpZiAoIShhIGluc3RhbmNlb2YgQ2FyZERhdGEpIHx8ICEoYiBpbnN0YW5jZW9mIENhcmREYXRhKSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgY29tcGFyaW5nIGNhcmQgZGF0YVwiKTtcblxuXHRpZiAoYS5nZXRWYWx1ZSgpID4gYi5nZXRWYWx1ZSgpKVxuXHRcdHJldHVybiAxO1xuXG5cdGlmIChhLmdldFZhbHVlKCkgPCBiLmdldFZhbHVlKCkpXG5cdFx0cmV0dXJuIC0xO1xuXG5cdHJldHVybiAwO1xufVxuXG4vKipcbiAqIENvbXBhcmUgd2l0aCByZXNwZWN0IHRvIGNhcmQgdmFsdWUuXG4gKiBAbWV0aG9kIGNvbXBhcmVDYXJkVmFsdWVcbiAqIEBzdGF0aWNcbiAqL1xuQ2FyZERhdGEuY29tcGFyZUNhcmRWYWx1ZSA9IGZ1bmN0aW9uKGEsIGIpIHtcblx0aWYgKCEoYSBpbnN0YW5jZW9mIENhcmREYXRhKSB8fCAhKGIgaW5zdGFuY2VvZiBDYXJkRGF0YSkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGNvbXBhcmluZyBjYXJkIGRhdGFcIik7XG5cblx0aWYgKGEuZ2V0Q2FyZFZhbHVlKCkgPiBiLmdldENhcmRWYWx1ZSgpKVxuXHRcdHJldHVybiAxO1xuXG5cdGlmIChhLmdldENhcmRWYWx1ZSgpIDwgYi5nZXRDYXJkVmFsdWUoKSlcblx0XHRyZXR1cm4gLTE7XG5cblx0cmV0dXJuIDA7XG59XG5cbi8qKlxuICogQ29tcGFyZSB3aXRoIHJlc3BlY3QgdG8gc3VpdC5cbiAqIEBtZXRob2QgY29tcGFyZVN1aXRcbiAqIEBzdGF0aWNcbiAqL1xuQ2FyZERhdGEuY29tcGFyZVN1aXRJbmRleCA9IGZ1bmN0aW9uKGEsIGIpIHtcblx0aWYgKCEoYSBpbnN0YW5jZW9mIENhcmREYXRhKSB8fCAhKGIgaW5zdGFuY2VvZiBDYXJkRGF0YSkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGNvbXBhcmluZyBjYXJkIGRhdGFcIik7XG5cblx0aWYgKGEuZ2V0U3VpdEluZGV4KCkgPiBiLmdldFN1aXRJbmRleCgpKVxuXHRcdHJldHVybiAxO1xuXG5cdGlmIChhLmdldFN1aXRJbmRleCgpIDwgYi5nZXRTdWl0SW5kZXgoKSlcblx0XHRyZXR1cm4gLTE7XG5cblx0cmV0dXJuIDA7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgY2FyZCBkYXRhIGZyb20gYSBzdHJpbmcuXG4gKiBAbWV0aG9kIGZyb21TdHJpbmdcbiAqIEBzdGF0aWNcbiAqL1xuQ2FyZERhdGEuZnJvbVN0cmluZyA9IGZ1bmN0aW9uKHMpIHtcblx0dmFyIGk7XG5cblx0dmFyIGNhcmRWYWx1ZSA9IC0xO1xuXHRmb3IgKGkgPSAwOyBpIDwgQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNhbmQgPSBDYXJkRGF0YS5DQVJEX1ZBTFVFX1NUUklOR1NbaV07XG5cblx0XHRpZiAocy5zdWJzdHJpbmcoMCwgY2FuZC5sZW5ndGgpID09IGNhbmQpXG5cdFx0XHRjYXJkVmFsdWUgPSBpO1xuXHR9XG5cblx0aWYgKGNhcmRWYWx1ZSA8IDApXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGEgdmFsaWQgY2FyZCBzdHJpbmc6IFwiICsgcyk7XG5cblx0dmFyIHN1aXRTdHJpbmcgPSBzLnN1YnN0cmluZyhDYXJkRGF0YS5DQVJEX1ZBTFVFX1NUUklOR1NbY2FyZFZhbHVlXS5sZW5ndGgpO1xuXG5cdHZhciBzdWl0SW5kZXggPSAtMTtcblx0Zm9yIChpID0gMDsgaSA8IENhcmREYXRhLlNVSVRfU1RSSU5HUy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjYW5kID0gQ2FyZERhdGEuU1VJVF9TVFJJTkdTW2ldO1xuXG5cdFx0aWYgKHN1aXRTdHJpbmcgPT0gY2FuZClcblx0XHRcdHN1aXRJbmRleCA9IGk7XG5cdH1cblxuXHRpZiAoc3VpdEluZGV4IDwgMClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYSB2YWxpZCBjYXJkIHN0cmluZzogXCIgKyBzKTtcblxuXHRyZXR1cm4gbmV3IENhcmREYXRhKHN1aXRJbmRleCAqIDEzICsgY2FyZFZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkRGF0YTsiLCIvKipcbiAqIEJ1dHRvbiBkYXRhLlxuICogQGNsYXNzIEJ1dHRvbkRhdGFcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uRGF0YShidXR0b24sIHZhbHVlKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbi5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cblByZXNldEJ1dHRvbkRhdGEucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b247XG59XG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5QcmVzZXRCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdXR0b25EYXRhOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgbWFkZSBhbiBhY3Rpb24uXG4gKiBAY2xhc3MgQWN0aW9uTWVzc2FnZVxuICovXG5mdW5jdGlvbiBBY3Rpb25NZXNzYWdlKHNlYXRJbmRleCwgYWN0aW9uKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFjdGlvbiA9IGFjdGlvbjtcbn1cblxuQWN0aW9uTWVzc2FnZS5UWVBFID0gXCJhY3Rpb25cIjtcblxuQWN0aW9uTWVzc2FnZS5GT0xEID0gXCJmb2xkXCI7XG5BY3Rpb25NZXNzYWdlLkNBTEwgPSBcImNhbGxcIjtcbkFjdGlvbk1lc3NhZ2UuUkFJU0UgPSBcInJhaXNlXCI7XG5BY3Rpb25NZXNzYWdlLkNIRUNLID0gXCJjaGVja1wiO1xuQWN0aW9uTWVzc2FnZS5CRVQgPSBcImJldFwiO1xuQWN0aW9uTWVzc2FnZS5NVUNLID0gXCJtdWNrXCI7XG5BY3Rpb25NZXNzYWdlLkFOVEUgPSBcImFudGVcIjtcblxuLyoqXG4gKiBTZWF0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEFjdGlvblxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS5nZXRBY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYWN0aW9uO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cdHRoaXMuYWN0aW9uID0gZGF0YS5hY3Rpb247XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdGFjdGlvbjogdGhpcy5hY3Rpb25cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBY3Rpb25NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgaGFzIHBsYWNlZCBhIGJldC5cbiAqIEBjbGFzcyBCZXRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJldE1lc3NhZ2Uoc2VhdEluZGV4LCB2YWx1ZSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5CZXRNZXNzYWdlLlRZUEUgPSBcImJldFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5CZXRNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0dmFsdWU6IHRoaXMudmFsdWVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCZXRNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBiZXRzIHNob3VsZCBiZSBwbGFjZWQgaW4gcG90LlxuICogQGNsYXNzIEJldHNUb1BvdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQmV0c1RvUG90TWVzc2FnZSgpIHtcbn1cblxuQmV0c1RvUG90TWVzc2FnZS5UWVBFID0gXCJiZXRzVG9Qb3RcIjtcblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkJldHNUb1BvdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQmV0c1RvUG90TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCZXRzVG9Qb3RNZXNzYWdlOyIsIi8qKlxuICogU2VudCB3aGVuIHRoZSB1c2VyIGNsaWNrcyBhIGJ1dHRvbiwgZWl0aGVyIGluIGEgZGlhbG9nIG9yXG4gKiBmb3IgYSBnYW1lIGFjdGlvbi5cbiAqIEBjbGFzcyBCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQnV0dG9uQ2xpY2tNZXNzYWdlKGJ1dHRvbiwgdmFsdWUpIHtcblx0dGhpcy5idXR0b24gPSBidXR0b247XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuLy9cdGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgYnV0dG9uIGNsaWNrIG1lc3NhZ2UsIHZhbHVlPVwiICsgdmFsdWUpO1xufVxuXG5CdXR0b25DbGlja01lc3NhZ2UuVFlQRSA9IFwiYnV0dG9uQ2xpY2tcIjtcblxuLyoqXG4gKiBUaGUgdGhlIGJ1dHRvbiB0aGF0IHdhcyBwcmVzc2VkLlxuICogQG1ldGhvZCBnZXRCdXR0b25cbiAqL1xuQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuYnV0dG9uID0gZGF0YS5idXR0b247XG5cdHRoaXMudmFsdWUgPSBkYXRhLnZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRidXR0b246IHRoaXMuYnV0dG9uLFxuXHRcdHZhbHVlOiB0aGlzLnZhbHVlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uQ2xpY2tNZXNzYWdlOyIsInZhciBCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvQnV0dG9uRGF0YVwiKTtcblxuLyoqXG4gKiBNZXNzYWdlIHNlbnQgd2hlbiB0aGUgY2xpZW50IHNob3VsZCBzaG93IGdhbWUgYWN0aW9uIGJ1dHRvbnMsXG4gKiBGT0xELCBSQUlTRSBldGMuXG4gKiBAY2xhc3MgQnV0dG9uc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQnV0dG9uc01lc3NhZ2UoKSB7XG5cdHRoaXMuYnV0dG9ucyA9IFtdO1xuXHR0aGlzLnNsaWRlckJ1dHRvbkluZGV4ID0gMDtcblx0dGhpcy5taW4gPSAtMTtcblx0dGhpcy5tYXggPSAtMTtcbn1cblxuQnV0dG9uc01lc3NhZ2UuVFlQRSA9IFwiYnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldCBhbiBhcnJheSBvZiBCdXR0b25EYXRhIGluZGljYXRpbmcgd2hpY2ggYnV0dG9ucyB0byBzaG93LlxuICogQG1ldGhvZCBnZXRCdXR0b25zXG4gKi9cbkJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbnM7XG59XG5cbi8qKlxuICogQWRkIGEgYnV0dG9uIHRvIGJlIHNlbnQuXG4gKiBAbWV0aG9kIGFkZEJ1dHRvblxuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuYWRkQnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b24gPSBkYXRhLmJ1dHRvbnNbaV07XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSBuZXcgQnV0dG9uRGF0YShidXR0b24uYnV0dG9uLCBidXR0b24udmFsdWUpO1xuXHRcdHRoaXMuYWRkQnV0dG9uKGJ1dHRvbkRhdGEpO1xuXHR9XG5cdHRoaXMuc2xpZGVyQnV0dG9uSW5kZXggPSBkYXRhLnNsaWRlckJ1dHRvbkluZGV4O1xuXHR0aGlzLm1pbiA9IGRhdGEubWluO1xuXHR0aGlzLm1heCA9IGRhdGEubWF4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgYnV0dG9ucyA9IFtdO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbiA9IHt9O1xuXHRcdGJ1dHRvbi5idXR0b24gPSB0aGlzLmJ1dHRvbnNbaV0uZ2V0QnV0dG9uKCk7XG5cdFx0YnV0dG9uLnZhbHVlID0gdGhpcy5idXR0b25zW2ldLmdldFZhbHVlKCk7XG5cdFx0YnV0dG9ucy5wdXNoKGJ1dHRvbik7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGJ1dHRvbnM6IGJ1dHRvbnMsXG5cdFx0c2xpZGVyQnV0dG9uSW5kZXg6IHRoaXMuc2xpZGVyQnV0dG9uSW5kZXgsXG5cdFx0bWluOiB0aGlzLm1pbixcblx0XHRtYXg6IHRoaXMubWF4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uc01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIHNvbWV0aGluZyBoYXMgb2NjdXJyZWQgaW4gdGhlIGNoYXQuXG4gKiBAY2xhc3MgQ2hhdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQ2hhdE1lc3NhZ2UodXNlciwgdGV4dCkge1xuXHR0aGlzLnVzZXIgPSB1c2VyO1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xufVxuXG5DaGF0TWVzc2FnZS5UWVBFID0gXCJjaGF0XCI7XG5cbi8qKlxuICogR2V0IHRleHQuXG4gKiBAbWV0aG9kIGdldFRleHRcbiAqL1xuQ2hhdE1lc3NhZ2UucHJvdG90eXBlLmdldFRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGV4dDtcbn1cblxuLyoqXG4gKiBHZXQgdXNlci5cbiAqIEBtZXRob2QgZ2V0VXNlclxuICovXG5DaGF0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VXNlciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy51c2VyO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQ2hhdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMudXNlciA9IGRhdGEudXNlcjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0dXNlcjogdGhpcy51c2VyXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdE1lc3NhZ2U7IiwiLyoqXG4gKiBTZW50IHdoZW4gcGxheWVyIGhhcyBjaGVja2VkIGEgY2hlY2tib3guXG4gKiBAY2xhc3MgQ2hlY2tib3hNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIENoZWNrYm94TWVzc2FnZShpZCwgY2hlY2tlZCkge1xuXHR0aGlzLmlkID0gaWQ7XG5cdHRoaXMuY2hlY2tlZCA9IGNoZWNrZWQ7XG59XG5cbkNoZWNrYm94TWVzc2FnZS5UWVBFID0gXCJjaGVja2JveFwiO1xuXG5DaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EUyA9IFwiYXV0b1Bvc3RCbGluZHNcIjtcbkNoZWNrYm94TWVzc2FnZS5BVVRPX01VQ0tfTE9TSU5HID0gXCJhdXRvTXVja0xvc2luZ1wiO1xuQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUID0gXCJzaXRvdXROZXh0XCI7XG5cbi8qKlxuICogSWQgb2YgY2hlY2tib3guXG4gKiBAbWV0aG9kIGdldElkXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUuZ2V0SWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQ2hlY2tib3hNZXNzYWdlLnByb3RvdHlwZS5nZXRDaGVja2VkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNoZWNrZWQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5DaGVja2JveE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmlkID0gZGF0YS5pZDtcblx0dGhpcy5jaGVja2VkID0gZGF0YS5jaGVja2VkO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQ2hlY2tib3hNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRpZDogdGhpcy5pZCxcblx0XHRjaGVja2VkOiB0aGlzLmNoZWNrZWRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaGVja2JveE1lc3NhZ2U7IiwiLyoqXG4gKiBAY2xhc3MgQ2xlYXJNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIENsZWFyTWVzc2FnZShjb21wb25lbnRzKSB7XG5cdGlmICghY29tcG9uZW50cylcblx0XHRjb21wb25lbnRzID0gW107XG5cblx0dGhpcy5jb21wb25lbnRzID0gY29tcG9uZW50cztcbn1cblxuQ2xlYXJNZXNzYWdlLlRZUEUgPSBcImNsZWFyXCI7XG5cbkNsZWFyTWVzc2FnZS5DQVJEUyA9IFwiY2FyZHNcIjtcbkNsZWFyTWVzc2FnZS5CRVRTID0gXCJiZXRzXCI7XG5DbGVhck1lc3NhZ2UuUE9UID0gXCJwb3RcIjtcbkNsZWFyTWVzc2FnZS5DSEFUID0gXCJjaGF0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDb21wb25lbnRzXG4gKi9cbkNsZWFyTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb21wb25lbnRzO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQ2xlYXJNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5jb21wb25lbnRzID0gZGF0YS5jb21wb25lbnRzO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQ2xlYXJNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRjb21wb25lbnRzOiB0aGlzLmNvbXBvbmVudHNcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDbGVhck1lc3NhZ2U7IiwidmFyIENhcmREYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvQ2FyZERhdGFcIik7XG5cbi8qKlxuICogU2hvdyBjb21tdW5pdHkgY2FyZHMuXG4gKiBAY2xhc3MgQ29tbXVuaXR5Q2FyZHNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIENvbW11bml0eUNhcmRzTWVzc2FnZSgpIHtcblx0dGhpcy5hbmltYXRlID0gZmFsc2U7XG5cdHRoaXMuY2FyZHMgPSBbXTtcblx0dGhpcy5maXJzdEluZGV4ID0gMDtcbn1cblxuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLlRZUEUgPSBcImNvbW11bml0eUNhcmRzXCI7XG5cbi8qKlxuICogQW5pbWF0aW9uIG9yIG5vdD9cbiAqIEBtZXRob2Qgc2V0QW5pbWF0ZVxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEFuaW1hdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRyZXR1cm4gdGhpcy5hbmltYXRlID0gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0IGZpcnN0IGluZGV4LlxuICogQG1ldGhvZCBzZXRGaXJzdEluZGV4XG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2V0Rmlyc3RJbmRleCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHJldHVybiB0aGlzLmZpcnN0SW5kZXggPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBBZGQgY2FyZC5cbiAqIEBtZXRob2QgYWRkQ2FyZFxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLmFkZENhcmQgPSBmdW5jdGlvbihjKSB7XG5cdHRoaXMuY2FyZHMucHVzaChjKTtcbn1cblxuLyoqXG4gKiBHZXQgY2FyZCBkYXRhLlxuICogQG1ldGhvZCBnZXRDYXJkc1xuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNhcmRzO1xufVxuXG4vKipcbiAqIEdldCB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGNhcmQgdG8gYmUgc2hvd24gaW4gdGhlIHNlcXVlbmNlLlxuICogQG1ldGhvZCBnZXRGaXJzdEluZGV4XG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Rmlyc3RJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5maXJzdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHZhciBpO1xuXG5cdHRoaXMuYW5pbWF0ZSA9IGRhdGEuYW5pbWF0ZTtcblx0dGhpcy5maXJzdEluZGV4ID0gcGFyc2VJbnQoZGF0YS5maXJzdEluZGV4KTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBkYXRhLmNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuY2FyZHMucHVzaChuZXcgQ2FyZERhdGEoZGF0YS5jYXJkc1tpXSkpO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNhcmRzID0gW107XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0Y2FyZHMucHVzaCh0aGlzLmNhcmRzW2ldLmdldFZhbHVlKCkpO1xuXG5cdHJldHVybiB7XG5cdFx0YW5pbWF0ZTogdGhpcy5zZWF0SW5kZXgsXG5cdFx0Zmlyc3RJbmRleDogdGhpcy5maXJzdEluZGV4LFxuXHRcdGNhcmRzOiBjYXJkc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbW11bml0eUNhcmRzTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBEZWFsZXJCdXR0b25NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlYWxlckJ1dHRvbk1lc3NhZ2Uoc2VhdEluZGV4LCBhbmltYXRlKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBhbmltYXRlO1xufVxuXG5EZWFsZXJCdXR0b25NZXNzYWdlLlRZUEUgPSBcImRlYWxlckJ1dHRvblwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRBbmltYXRlXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldEFuaW1hdGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYW5pbWF0ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBkYXRhLmFuaW1hdGU7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5EZWFsZXJCdXR0b25NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdGFuaW1hdGU6IHRoaXMuYW5pbWF0ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlYWxlckJ1dHRvbk1lc3NhZ2U7IiwiLyoqXG4gKiBAY2xhc3MgRGVsYXlNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlbGF5TWVzc2FnZShkZWxheSkge1xuXHR0aGlzLmRlbGF5ID0gZGVsYXk7XG59XG5cbkRlbGF5TWVzc2FnZS5UWVBFID0gXCJkZWxheVwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RGVsYXlcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5nZXREZWxheSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWxheTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlbGF5TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuZGVsYXkgPSBkYXRhLmRlbGF5O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRkZWxheTogdGhpcy5kZWxheVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGF5TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHRhYmxlIHNob3VsZCBmYWRlLlxuICogQGNsYXNzIEZhZGVUYWJsZU1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRmFkZVRhYmxlTWVzc2FnZSh2aXNpYmxlLCBkaXJlY3Rpb24pIHtcblx0dGhpcy52aXNpYmxlID0gdmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG59XG5cbkZhZGVUYWJsZU1lc3NhZ2UuVFlQRSA9IFwiZmFkZVRhYmxlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlzaWJsZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldERpcmVjdGlvblxuICovXG5GYWRlVGFibGVNZXNzYWdlLnByb3RvdHlwZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZGlyZWN0aW9uO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRmFkZVRhYmxlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZSA9IGRhdGEudmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkYXRhLmRpcmVjdGlvbjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpc2libGU6IHRoaXMudmlzaWJsZSxcblx0XHRkaXJlY3Rpb246IHRoaXMuZGlyZWN0aW9uXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmFkZVRhYmxlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHBsYXllciBoYXMgZm9sZGVkLlxuICogQGNsYXNzIEZvbGRDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRm9sZENhcmRzTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG59XG5cbkZvbGRDYXJkc01lc3NhZ2UuVFlQRSA9IFwiZm9sZENhcmRzXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkZvbGRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvbGRDYXJkc01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgSGFuZEluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEhhbmRJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG59XG5cbkhhbmRJbmZvTWVzc2FnZS5UWVBFID0gXCJoYW5kSW5mb1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkhhbmRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDb3VudGRvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGRhdGEuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93blxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRJbmZvTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBJbml0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbml0TWVzc2FnZSh0b2tlbikge1xuXHR0aGlzLnRva2VuID0gdG9rZW47XG5cdHRoaXMudGFibGVJZCA9IG51bGw7XG5cdHRoaXMudmlld0Nhc2UgPSBudWxsO1xufVxuXG5Jbml0TWVzc2FnZS5UWVBFID0gXCJpbml0XCI7XG5cbi8qKlxuICogZ2V0IHRva2VuLlxuICogQG1ldGhvZCBnZXRUb2tlblxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudG9rZW47XG59XG5cbi8qKlxuICogU2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBzZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXRUYWJsZUlkID0gZnVuY3Rpb24oaWQpIHtcblx0dGhpcy50YWJsZUlkID0gaWQ7XG59XG5cbi8qKlxuICogR2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBnZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUYWJsZUlkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSWQ7XG59XG5cbi8qKlxuICogU2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2Qgc2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuc2V0Vmlld0Nhc2UgPSBmdW5jdGlvbih2aWV3Q2FzZSkge1xuXHR0aGlzLnZpZXdDYXNlID0gdmlld0Nhc2U7XG59XG5cbi8qKlxuICogR2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2QgZ2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0Vmlld0Nhc2UgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlld0Nhc2U7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRva2VuID0gZGF0YS50b2tlbjtcblx0dGhpcy50YWJsZUlkID0gZGF0YS50YWJsZUlkO1xuXHR0aGlzLnZpZXdDYXNlID0gZGF0YS52aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0b2tlbjogdGhpcy50b2tlbixcblx0XHR0YWJsZUlkOiB0aGlzLnRhYmxlSWQsXG5cdFx0dmlld0Nhc2U6IHRoaXMudmlld0Nhc2Vcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbml0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gaW50ZXJmYWNlIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICogQGNsYXNzIEludGVyZmFjZVN0YXRlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UodmlzaWJsZUJ1dHRvbnMpIHtcblx0XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSB2aXNpYmxlQnV0dG9ucyA9PSBudWxsID8gbmV3IEFycmF5KCkgOiB2aXNpYmxlQnV0dG9ucztcbn1cblxuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLlRZUEUgPSBcImludGVyZmFjZVN0YXRlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlQnV0dG9uc1xuICovXG5JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGVCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkludGVyZmFjZVN0YXRlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSBkYXRhLnZpc2libGVCdXR0b25zO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2aXNpYmxlQnV0dG9uczogdGhpcy52aXNpYmxlQnV0dG9uc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZVN0YXRlTWVzc2FnZTsiLCIvKipcclxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgaGFzIHBsYWNlZCBhIGJldC5cclxuICogQGNsYXNzIFBheU91dE1lc3NhZ2VcclxuICovXHJcbmZ1bmN0aW9uIFBheU91dE1lc3NhZ2UoKSB7XHJcblx0dGhpcy52YWx1ZXMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XHJcbn1cclxuXHJcblBheU91dE1lc3NhZ2UuVFlQRSA9IFwicGF5T3V0XCI7XHJcblxyXG4vKipcclxuICogR2V0dGVyLlxyXG4gKiBAbWV0aG9kIGdldFZhbHVlc1xyXG4gKi9cclxuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWVzID0gZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXMudmFsdWVzO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IHZhbHVlIGF0LlxyXG4gKiBAbWV0aG9kIHNldFZhbHVlQXRcclxuICovXHJcblBheU91dE1lc3NhZ2UucHJvdG90eXBlLnNldFZhbHVlQXQgPSBmdW5jdGlvbihzZWF0SW5kZXgsIHZhbHVlKSB7XHJcblx0dGhpcy52YWx1ZXNbc2VhdEluZGV4XSA9IHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogVW4tc2VyaWFsaXplLlxyXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXHJcbiAqL1xyXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEudmFsdWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR0aGlzLnZhbHVlc1tpXSA9IGRhdGEudmFsdWVzW2ldO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxyXG4gKi9cclxuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHZhbHVlczogdGhpcy52YWx1ZXNcclxuXHR9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBheU91dE1lc3NhZ2U7IiwidmFyIENhcmREYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvQ2FyZERhdGFcIik7XG5cbi8qKlxuICogU2hvdyBwb2NrZXQgY2FyZHMuXG4gKiBAY2xhc3MgUG9ja2V0Q2FyZHNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFBvY2tldENhcmRzTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5hbmltYXRlID0gZmFsc2U7XG5cdHRoaXMuY2FyZHMgPSBbXTtcblx0dGhpcy5maXJzdEluZGV4ID0gMDtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG59XG5cblBvY2tldENhcmRzTWVzc2FnZS5UWVBFID0gXCJwb2NrZXRDYXJkc1wiO1xuXG4vKipcbiAqIEFuaW1hdGlvbj9cbiAqIEBtZXRob2Qgc2V0QW5pbWF0ZVxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEFuaW1hdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLmFuaW1hdGUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgZmlyc3QgaW5kZXguXG4gKiBAbWV0aG9kIHNldEZpcnN0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0dGhpcy5maXJzdEluZGV4ID0gaW5kZXg7XG59XG5cbi8qKlxuICogR2V0IGFycmF5IG9mIENhcmREYXRhLlxuICogQG1ldGhvZCBnZXRDYXJkc1xuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNhcmRzO1xufVxuXG4vKipcbiAqIEFkZCBhIGNhcmQuXG4gKiBAbWV0aG9kIGFkZENhcmRcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5hZGRDYXJkID0gZnVuY3Rpb24oYykge1xuXHR0aGlzLmNhcmRzLnB1c2goYyk7XG59XG5cbi8qKlxuICogR2V0IGZpcnN0IGluZGV4LlxuICogQG1ldGhvZCBnZXRGaXJzdEluZGV4XG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Rmlyc3RJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5maXJzdEluZGV4O1xufVxuXG4vKipcbiAqIEdldCBzZWF0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHZhciBpO1xuXG5cdHRoaXMuYW5pbWF0ZSA9IGRhdGEuYW5pbWF0ZTtcblx0dGhpcy5maXJzdEluZGV4ID0gcGFyc2VJbnQoZGF0YS5maXJzdEluZGV4KTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXG5cdGZvciAoaSA9IDA7IGkgPCBkYXRhLmNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuY2FyZHMucHVzaChuZXcgQ2FyZERhdGEoZGF0YS5jYXJkc1tpXSkpO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNhcmRzID0gW107XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0Y2FyZHMucHVzaCh0aGlzLmNhcmRzW2ldLmdldFZhbHVlKCkpO1xuXG5cdHJldHVybiB7XG5cdFx0YW5pbWF0ZTogdGhpcy5hbmltYXRlLFxuXHRcdGZpcnN0SW5kZXg6IHRoaXMuZmlyc3RJbmRleCxcblx0XHRjYXJkczogY2FyZHMsXG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvY2tldENhcmRzTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gcGxheWVyIHBvdCBoYXMgY2hhbmdlZC5cbiAqIEBjbGFzcyBQb3RNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFBvdE1lc3NhZ2UodmFsdWVzKSB7XG5cdHRoaXMudmFsdWVzID0gdmFsdWVzID09IG51bGwgPyBuZXcgQXJyYXkoKSA6IHZhbHVlcztcbn1cblxuUG90TWVzc2FnZS5UWVBFID0gXCJwb3RcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlc1xuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWVzO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuUG90TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmFsdWVzID0gZGF0YS52YWx1ZXM7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2YWx1ZXM6IHRoaXMudmFsdWVzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG90TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gUHJlIHRvdXJuYW1lbnQgaW5mbyBtZXNzYWdlIGlzIGRpc3BhdGNoZWQuXG4gKiBAY2xhc3MgUHJlVG91cm5hbWVudEluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG59XG5cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5UWVBFID0gXCJwcmVUb3VybmFtZW50SW5mb1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldFRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGV4dDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENvdW50ZG93blxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldENvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb3VudGRvd247XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMuY291bnRkb3duID0gZGF0YS5jb3VudGRvd247XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZih0aGlzLmNvdW50ZG93biA8IDApXG5cdFx0dGhpcy5jb3VudGRvd24gPSAwO1xuXHRcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93blxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlKGJ1dHRvbikge1xuXHR0aGlzLmJ1dHRvbiA9IGJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IG51bGw7XG59XG5cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5UWVBFID0gXCJwcmVzZXRCdXR0b25DbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbiA9IGRhdGEuYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0YnV0dG9uOiB0aGlzLmJ1dHRvbixcblx0XHR2YWx1ZTogdGhpcy52YWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZTsiLCJ2YXIgUHJlc2V0QnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhL1ByZXNldEJ1dHRvbkRhdGFcIik7XG5cbi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFByZXNldEJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFByZXNldEJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmJ1dHRvbnMgPSBuZXcgQXJyYXkoNyk7XG5cdHRoaXMuY3VycmVudCA9IG51bGw7XG59XG5cblByZXNldEJ1dHRvbnNNZXNzYWdlLlRZUEUgPSBcInByZXNldEJ1dHRvbnNcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9ucztcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEN1cnJlbnRcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEN1cnJlbnQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY3VycmVudDtcbn1cblxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmN1cnJlbnQgPSBkYXRhLmN1cnJlbnQ7XG5cblx0dGhpcy5idXR0b25zID0gbmV3IEFycmF5KCk7XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IGRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b24gPSBkYXRhLmJ1dHRvbnNbaV07XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSBudWxsO1xuXG5cdFx0aWYoYnV0dG9uICE9IG51bGwpIHtcblx0XHRcdGJ1dHRvbkRhdGEgPSBuZXcgUHJlc2V0QnV0dG9uRGF0YSgpO1xuXG5cdFx0XHRidXR0b25EYXRhLmJ1dHRvbiA9IGJ1dHRvbi5idXR0b247XG5cdFx0XHRidXR0b25EYXRhLnZhbHVlID0gYnV0dG9uLnZhbHVlO1xuXHRcdH1cblxuXHRcdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbkRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBvYmplY3QgPSB7XG5cdFx0YnV0dG9uczogW10sXG5cdFx0Y3VycmVudDogdGhpcy5jdXJyZW50XG5cdH07XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b25EYXRhID0gdGhpcy5idXR0b25zW2ldO1xuXHRcdGlmKGJ1dHRvbkRhdGEgIT0gbnVsbClcblx0XHRcdG9iamVjdC5idXR0b25zLnB1c2goe1xuXHRcdFx0XHRidXR0b246IGJ1dHRvbkRhdGEuYnV0dG9uLFxuXHRcdFx0XHR2YWx1ZTogYnV0dG9uRGF0YS52YWx1ZVxuXHRcdFx0fSk7XG5cblx0XHRlbHNlXG5cdFx0XHRvYmplY3QuYnV0dG9ucy5wdXNoKG51bGwpO1xuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdXR0b25zTWVzc2FnZTsiLCIvKipcbiAqIE1lc3NhZ2UgaW5kaWNhdGluZyB0aGF0IHRoZSB1c2VyIGhhcyBjbGlja2VkIGEgc2VhdC5cbiAqIEBjbGFzcyBTZWF0Q2xpY2tNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFNlYXRDbGlja01lc3NhZ2Uoc2VhdEluZGV4KSB7XG5cdHRoaXMuc2VhdEluZGV4PXNlYXRJbmRleDtcbn1cblxuU2VhdENsaWNrTWVzc2FnZS5UWVBFID0gXCJzZWF0Q2xpY2tcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5TZWF0Q2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblNlYXRDbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2VhdENsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0Q2xpY2tNZXNzYWdlOyIsIi8qKlxuICogU2hvdyB1c2VybmFtZSBhbmQgY2hpcHMgb24gc2VhdC5cbiAqIEBjbGFzcyBTZWF0SW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gU2VhdEluZm9NZXNzYWdlKHNlYXRJbmRleCkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblx0dGhpcy5hY3RpdmUgPSB0cnVlO1xuXHR0aGlzLnNpdG91dCA9IGZhbHNlO1xuXHR0aGlzLm5hbWUgPSBcIlwiO1xuXHR0aGlzLmNoaXBzID0gXCJcIjtcbn1cblxuU2VhdEluZm9NZXNzYWdlLlRZUEUgPSBcInNlYXRJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0TmFtZVxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldE5hbWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubmFtZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoaXBzXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2hpcHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hpcHM7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBpc1NpdG91dFxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmlzU2l0b3V0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNpdG91dDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGlzQWN0aXZlXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuaXNBY3RpdmUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYWN0aXZlO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0QWN0aXZlXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0QWN0aXZlID0gZnVuY3Rpb24odikge1xuXHR0aGlzLmFjdGl2ZSA9IHY7XG59XG5cbi8qKlxuICogU2V0IHNpdG91dC5cbiAqIEBtZXRob2Qgc2V0U2l0b3V0XG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0U2l0b3V0ID0gZnVuY3Rpb24odikge1xuXHR0aGlzLnNpdG91dCA9IHY7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXROYW1lXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0TmFtZSA9IGZ1bmN0aW9uKHYpIHtcblx0dGhpcy5uYW1lID0gdjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldENoaXBzXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0Q2hpcHMgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuY2hpcHMgPSB2O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuXHR0aGlzLmNoaXBzID0gZGF0YS5jaGlwcztcblx0dGhpcy5zaXRvdXQgPSBkYXRhLnNpdG91dDtcblx0dGhpcy5hY3RpdmUgPSBkYXRhLmFjdGl2ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHRuYW1lOiB0aGlzLm5hbWUsXG5cdFx0Y2hpcHM6IHRoaXMuY2hpcHMsXG5cdFx0c2l0b3V0OiB0aGlzLnNpdG91dCxcblx0XHRhY3RpdmU6IHRoaXMuYWN0aXZlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VhdEluZm9NZXNzYWdlOyIsIi8qKlxuICogU2hvdyBkaWFsb2csIGZvciBlLmcuIGJ1eSBpbi5cbiAqIEBjbGFzcyBTaG93RGlhbG9nTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTaG93RGlhbG9nTWVzc2FnZSgpIHtcblx0dGhpcy50ZXh0ID0gXCJcIjtcblx0dGhpcy5idXR0b25zID0gW107XG5cdHRoaXMuZGVmYXVsdFZhbHVlID0gbnVsbDtcbn1cblxuU2hvd0RpYWxvZ01lc3NhZ2UuVFlQRSA9IFwic2hvd0RpYWxvZ1wiO1xuXG4vKipcbiAqIEFkZCBhIGJ1dHRvbiB0byB0aGUgZGlhbG9nLlxuICogQG1ldGhvZCBhZGRCdXR0b25cbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uKGJ1dHRvbikge1xuXHR0aGlzLmJ1dHRvbnMucHVzaChidXR0b24pO1xufVxuXG4vKipcbiAqIEdldCB0ZXh0IG9mIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGdldFRleHRcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldFRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGV4dDtcbn1cblxuLyoqXG4gKiBHZXQgYXJyYXkgb2YgQnV0dG9uRGF0YSB0byBiZSBzaG93biBpbiB0aGUgZGlhbG9nLlxuICogQG1ldGhvZCBnZXRCdXR0b25zXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbnM7XG59XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldERlZmF1bHRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogU2V0IGRlZmF1bHQgdmFsdWUuXG4gKiBAbWV0aG9kIHNldERlZmF1bHRWYWx1ZVxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuc2V0RGVmYXVsdFZhbHVlID0gZnVuY3Rpb24odikge1xuXHR0aGlzLmRlZmF1bHRWYWx1ZT12O1xufVxuXG4vKipcbiAqIFNldCB0ZXh0IGluIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHRoaXMudGV4dCA9IHRleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMuYnV0dG9ucyA9IGRhdGEuYnV0dG9ucztcblx0dGhpcy5kZWZhdWx0VmFsdWUgPSBkYXRhLmRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0YnV0dG9uczogdGhpcy5idXR0b25zLFxuXHRcdGRlZmF1bHRWYWx1ZTogdGhpcy5kZWZhdWx0VmFsdWVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaG93RGlhbG9nTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBTdGF0ZUNvbXBsZXRlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTdGF0ZUNvbXBsZXRlTWVzc2FnZSgpIHt9XG5cblN0YXRlQ29tcGxldGVNZXNzYWdlLlRZUEUgPSBcInN0YXRlQ29tcGxldGVcIjtcblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5TdGF0ZUNvbXBsZXRlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7fVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU3RhdGVDb21wbGV0ZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdGVDb21wbGV0ZU1lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIHRhYmxlIGJ1dHRvbiBjbGlja2VkLlxuICogQGNsYXNzIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlKHRhYmxlSW5kZXgpIHtcblx0dGhpcy50YWJsZUluZGV4ID0gdGFibGVJbmRleDtcbn1cblxuVGFibGVCdXR0b25DbGlja01lc3NhZ2UuVFlQRSA9IFwidGFibGVCdXR0b25DbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGFibGVJbmRleFxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGFibGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50YWJsZUluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRhYmxlSW5kZXggPSBkYXRhLnRhYmxlSW5kZXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGFibGVJbmRleDogdGhpcy50YWJsZUluZGV4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGFibGVCdXR0b25DbGlja01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgVGFibGVCdXR0b25zTWVzc2FnZVxuICovXG5mdW5jdGlvbiBUYWJsZUJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmVuYWJsZWQgPSBuZXcgQXJyYXkoKTtcblx0dGhpcy5jdXJyZW50SW5kZXggPSAtMTtcblx0dGhpcy5wbGF5ZXJJbmRleCA9IC0xO1xuXHR0aGlzLmluZm9MaW5rID0gXCJcIjtcbn1cblxuVGFibGVCdXR0b25zTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUJ1dHRvbnNcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEVuYWJsZWRcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5lbmFibGVkO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q3VycmVudEluZGV4XG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEN1cnJlbnRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jdXJyZW50SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRQbGF5ZXJJbmRleFxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRQbGF5ZXJJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5wbGF5ZXJJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEluZm9MaW5rXG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMucGxheWVySW5kZXggPSBkYXRhLnBsYXllckluZGV4O1xuXHR0aGlzLmN1cnJlbnRJbmRleCA9IGRhdGEuY3VycmVudEluZGV4O1xuXHR0aGlzLmluZm9MaW5rID0gZGF0YS5pbmZvTGluaztcblxuXHR0aGlzLmVuYWJsZWQgPSBuZXcgQXJyYXkoKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IGRhdGEuZW5hYmxlZC5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmVuYWJsZWQucHVzaChkYXRhLmVuYWJsZWRbaV0pO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBvYmplY3QgPSB7XG5cdFx0Y3VycmVudEluZGV4OiB0aGlzLmN1cnJlbnRJbmRleCxcblx0XHRwbGF5ZXJJbmRleDogdGhpcy5wbGF5ZXJJbmRleCxcblx0XHRlbmFibGVkOiBbXSxcblx0XHRpbmZvTGluazogdGhpcy5pbmZvTGlua1xuXHR9O1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmVuYWJsZWQubGVuZ3RoOyBpKyspXG5cdFx0b2JqZWN0LmVuYWJsZWQucHVzaCh0aGlzLmVuYWJsZWRbaV0pO1xuXG5cdHJldHVybiBvYmplY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGFibGVCdXR0b25zTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUYWJsZUluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlSW5mb01lc3NhZ2UodGV4dCwgY291bnRkb3duKSB7XG5cdHRoaXMuY291bnRkb3duID0gY291bnRkb3duO1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLnNob3dKb2luQnV0dG9uID0gZmFsc2U7XG5cdHRoaXMuc2hvd0xlYXZlQnV0dG9uID0gZmFsc2U7XG5cdHRoaXMuaW5mb0xpbmsgPSBudWxsO1xuXHR0aGlzLmluZm9MaW5rVGV4dCA9IG51bGw7XG59XG5cblRhYmxlSW5mb01lc3NhZ2UuVFlQRSA9IFwidGFibGVJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDb3VudGRvd25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q291bnRkb3duID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRleHRcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2hvd0pvaW5CdXR0b25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2hvd0pvaW5CdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2hvd0pvaW5CdXR0b247XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTaG93TGVhdmVCdXR0b25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2hvd0xlYXZlQnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNob3dMZWF2ZUJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEluZm9MaW5rXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtUZXh0XG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5pbmZvTGlua1RleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0aWYoZGF0YS50ZXh0ICE9IG51bGwpXG5cdFx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXG5cdGlmKGRhdGEuY291bnRkb3duICE9IG51bGwpXG5cdFx0dGhpcy5jb3VudGRvd24gPSBkYXRhLmNvdW50ZG93bjtcblxuXHRpZihkYXRhLnNob3dKb2luQnV0dG9uICE9IG51bGwpXG5cdFx0dGhpcy5zaG93Sm9pbkJ1dHRvbiA9IGRhdGEuc2hvd0pvaW5CdXR0b247XG5cblx0aWYoZGF0YS5zaG93TGVhdmVCdXR0b24gIT0gbnVsbClcblx0XHR0aGlzLnNob3dMZWF2ZUJ1dHRvbiA9IGRhdGEuc2hvd0xlYXZlQnV0dG9uO1xuXG5cdGlmKGRhdGEuaW5mb0xpbmsgIT0gbnVsbClcblx0XHR0aGlzLmluZm9MaW5rID0gZGF0YS5pbmZvTGluaztcblxuXHRpZihkYXRhLmluZm9MaW5rVGV4dCAhPSBudWxsKVxuXHRcdHRoaXMuaW5mb0xpbmtUZXh0ID0gZGF0YS5pbmZvTGlua1RleHQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93bixcblx0XHRzaG93Sm9pbkJ1dHRvbjogdGhpcy5zaG93Sm9pbkJ1dHRvbixcblx0XHRzaG93TGVhdmVCdXR0b246IHRoaXMuc2hvd0xlYXZlQnV0dG9uLFxuXHRcdGluZm9MaW5rOiB0aGlzLmluZm9MaW5rLFxuXHRcdGluZm9MaW5rVGV4dDogdGhpcy5pbmZvTGlua1RleHRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUluZm9NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRlc3RDYXNlUmVxdWVzdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZSh0ZXN0Q2FzZSkge1xuXHR0aGlzLnRlc3RDYXNlID0gdGVzdENhc2U7XG59XG5cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UuVFlQRSA9IFwidGVzdENhc2VSZXF1ZXN0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXN0Q2FzZVxuICovXG5UZXN0Q2FzZVJlcXVlc3RNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXN0Q2FzZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXN0Q2FzZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRlc3RDYXNlID0gZGF0YS50ZXN0Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRlc3RDYXNlOiB0aGlzLnRlc3RDYXNlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUaW1lck1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGltZXJNZXNzYWdlKCkge1xuXHR0aGlzLnNlYXRJbmRleCA9IC0xO1xuXHR0aGlzLnRvdGFsVGltZSA9IC0xO1xuXHR0aGlzLnRpbWVMZWZ0ID0gLTE7XG59XG5cblRpbWVyTWVzc2FnZS5UWVBFID0gXCJ0aW1lclwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRvdGFsVGltZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLmdldFRvdGFsVGltZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50b3RhbFRpbWU7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUaW1lTGVmdFxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLmdldFRpbWVMZWZ0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRpbWVMZWZ0O1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0U2VhdEluZGV4XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0U2VhdEluZGV4ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5zZWF0SW5kZXggPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldFRvdGFsVGltZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNldFRvdGFsVGltZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMudG90YWxUaW1lID0gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRUaW1lTGVmdFxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNldFRpbWVMZWZ0ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy50aW1lTGVmdCA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy50b3RhbFRpbWUgPSBkYXRhLnRvdGFsVGltZTtcblx0dGhpcy50aW1lTGVmdCA9IGRhdGEudGltZUxlZnQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0dG90YWxUaW1lOiB0aGlzLnRvdGFsVGltZSxcblx0XHR0aW1lTGVmdDogdGhpcy50aW1lTGVmdFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVyTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gdG91cm5hbWVudCByZXN1bHQgbWVzc2FnZSBpcyBkaXNwYXRjaGVkLlxuICogQGNsYXNzIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlKHRleHQsIHJpZ2h0Q29sdW1uVGV4dCkge1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLnJpZ2h0Q29sdW1uVGV4dCA9IHJpZ2h0Q29sdW1uVGV4dDtcbn1cblxuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UuVFlQRSA9IFwidG91cm5hbWVudFJlc3VsdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0UmlnaHRDb2x1bW5UZXh0XG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5nZXRSaWdodENvbHVtblRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMucmlnaHRDb2x1bW5UZXh0O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMucmlnaHRDb2x1bW5UZXh0ID0gZGF0YS5yaWdodENvbHVtblRleHQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGV4dDogdGhpcy50ZXh0LFxuXHRcdHJpZ2h0Q29sdW1uVGV4dDogdGhpcy5yaWdodENvbHVtblRleHRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUb3VybmFtZW50UmVzdWx0TWVzc2FnZTsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogQnV0dG9uLlxuICogQGNsYXNzIEJ1dHRvblxuICovXG5mdW5jdGlvbiBCdXR0b24oY29udGVudCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHRpZiAoY29udGVudClcblx0XHR0aGlzLmFkZENoaWxkKGNvbnRlbnQpO1xuXG5cdHRoaXMuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHR0aGlzLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXG5cdHRoaXMubW91c2VvdmVyID0gdGhpcy5vbk1vdXNlb3Zlci5iaW5kKHRoaXMpO1xuXHR0aGlzLm1vdXNlb3V0ID0gdGhpcy5vbk1vdXNlb3V0LmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2Vkb3duID0gdGhpcy5vbk1vdXNlZG93bi5iaW5kKHRoaXMpO1xuXHR0aGlzLm1vdXNldXAgPSB0aGlzLm9uTW91c2V1cC5iaW5kKHRoaXMpO1xuXHR0aGlzLmNsaWNrID0gdGhpcy5vbkNsaWNrLmJpbmQodGhpcyk7XG5cblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlciA9IG5ldyBQSVhJLkNvbG9yTWF0cml4RmlsdGVyKCk7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG5cdHRoaXMuZmlsdGVycyA9IFt0aGlzLmNvbG9yTWF0cml4RmlsdGVyXTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChCdXR0b24sIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChCdXR0b24pO1xuXG5CdXR0b24uTElHSFRfTUFUUklYID0gWzEuNSwgMCwgMCwgMCwgMCwgMS41LCAwLCAwLCAwLCAwLCAxLjUsIDAsIDAsIDAsIDAsIDFdO1xuQnV0dG9uLkRBUktfTUFUUklYID0gWy43NSwgMCwgMCwgMCwgMCwgLjc1LCAwLCAwLCAwLCAwLCAuNzUsIDAsIDAsIDAsIDAsIDFdO1xuQnV0dG9uLkRFRkFVTFRfTUFUUklYID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG5CdXR0b24uQ0xJQ0sgPSBcImNsaWNrXCI7XG5cbi8qKlxuICogTW91c2Ugb3Zlci5cbiAqIEBtZXRob2Qgb25Nb3VzZW92ZXJcbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uTElHSFRfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIG91dC5cbiAqIEBtZXRob2Qgb25Nb3VzZW91dFxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkRFRkFVTFRfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIGRvd24uXG4gKiBAbWV0aG9kIG9uTW91c2Vkb3duXG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uTW91c2Vkb3duID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkRBUktfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIHVwLlxuICogQG1ldGhvZCBvbk1vdXNldXBcbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZXVwID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkxJR0hUX01BVFJJWDtcbn1cblxuLyoqXG4gKiBDbGljay5cbiAqIEBtZXRob2Qgb25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbkNsaWNrID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHJpZ2dlcihCdXR0b24uQ0xJQ0spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4vQnV0dG9uXCIpO1xuXG4vKipcbiAqIENoZWNrYm94LlxuICogQGNsYXNzIENoZWNrYm94XG4gKi9cbmZ1bmN0aW9uIENoZWNrYm94KGJhY2tncm91bmQsIHRpY2spIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5idXR0b24gPSBuZXcgQnV0dG9uKGJhY2tncm91bmQpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV0dG9uKTtcblxuXHR0aGlzLmNoZWNrID0gdGljaztcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoZWNrKTtcblxuXHR0aGlzLmJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblxuXHR0aGlzLnNldENoZWNrZWQoZmFsc2UpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKENoZWNrYm94LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoQ2hlY2tib3gpO1xuXG4vKipcbiAqIEJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jaGVjay52aXNpYmxlID0gIXRoaXMuY2hlY2sudmlzaWJsZTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIik7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRDaGVja2VkXG4gKi9cbkNoZWNrYm94LnByb3RvdHlwZS5zZXRDaGVja2VkID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5jaGVjay52aXNpYmxlID0gdmFsdWU7XG5cdHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoZWNrZWRcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLmdldENoZWNrZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hlY2sudmlzaWJsZTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBQSVhJPXJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbD1yZXF1aXJlKFwiLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xuXG5mdW5jdGlvbiBDb250ZW50U2NhbGVyKGNvbnRlbnQpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5jb250ZW50V2lkdGg9MTAwO1xuXHR0aGlzLmNvbnRlbnRIZWlnaHQ9MTAwO1xuXG5cdHRoaXMuc2NyZWVuV2lkdGg9MTAwO1xuXHR0aGlzLnNjcmVlbkhlaWdodD0xMDA7XG5cblx0dGhpcy50aGVNYXNrPW51bGw7XG5cblx0aWYgKGNvbnRlbnQpXG5cdFx0dGhpcy5zZXRDb250ZW50KGNvbnRlbnQpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKENvbnRlbnRTY2FsZXIsUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUuc2V0Q29udGVudD1mdW5jdGlvbihjb250ZW50KSB7XG5cdHRoaXMuY29udGVudD1jb250ZW50O1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5jb250ZW50KTtcblxuXHRpZiAodGhpcy50aGVNYXNrKSB7XG5cdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLnRoZU1hc2spO1xuXHRcdHRoaXMudGhlTWFzaz1udWxsO1xuXHR9XG5cblx0dGhpcy50aGVNYXNrPW5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdC8vdGhpcy5hZGRDaGlsZCh0aGlzLnRoZU1hc2spO1xuXG5cdHRoaXMudXBkYXRlU2NhbGUoKTtcbn1cblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUuc2V0Q29udGVudFNpemU9ZnVuY3Rpb24oY29udGVudFdpZHRoLCBjb250ZW50SGVpZ2h0KSB7XG5cdHRoaXMuY29udGVudFdpZHRoPWNvbnRlbnRXaWR0aDtcblx0dGhpcy5jb250ZW50SGVpZ2h0PWNvbnRlbnRIZWlnaHQ7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRTY3JlZW5TaXplPWZ1bmN0aW9uKHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpIHtcblx0dGhpcy5zY3JlZW5XaWR0aD1zY3JlZW5XaWR0aDtcblx0dGhpcy5zY3JlZW5IZWlnaHQ9c2NyZWVuSGVpZ2h0O1xuXG5cdHRoaXMudXBkYXRlU2NhbGUoKTtcbn1cblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUudXBkYXRlU2NhbGU9ZnVuY3Rpb24oKSB7XG5cdHZhciBzY2FsZTtcblxuXHRpZiAodGhpcy5zY3JlZW5XaWR0aC90aGlzLmNvbnRlbnRXaWR0aDx0aGlzLnNjcmVlbkhlaWdodC90aGlzLmNvbnRlbnRIZWlnaHQpXG5cdFx0c2NhbGU9dGhpcy5zY3JlZW5XaWR0aC90aGlzLmNvbnRlbnRXaWR0aDtcblxuXHRlbHNlXG5cdFx0c2NhbGU9dGhpcy5zY3JlZW5IZWlnaHQvdGhpcy5jb250ZW50SGVpZ2h0O1xuXG5cdHRoaXMuY29udGVudC5zY2FsZS54PXNjYWxlO1xuXHR0aGlzLmNvbnRlbnQuc2NhbGUueT1zY2FsZTtcblxuXHR2YXIgc2NhbGVkV2lkdGg9dGhpcy5jb250ZW50V2lkdGgqc2NhbGU7XG5cdHZhciBzY2FsZWRIZWlnaHQ9dGhpcy5jb250ZW50SGVpZ2h0KnNjYWxlO1xuXG5cdHRoaXMuY29udGVudC5wb3NpdGlvbi54PSh0aGlzLnNjcmVlbldpZHRoLXNjYWxlZFdpZHRoKS8yO1xuXHR0aGlzLmNvbnRlbnQucG9zaXRpb24ueT0odGhpcy5zY3JlZW5IZWlnaHQtc2NhbGVkSGVpZ2h0KS8yO1xuXG5cdHZhciByPW5ldyBQSVhJLlJlY3RhbmdsZSh0aGlzLmNvbnRlbnQucG9zaXRpb24ueCx0aGlzLmNvbnRlbnQucG9zaXRpb24ueSxzY2FsZWRXaWR0aCxzY2FsZWRIZWlnaHQpO1xuXHR2YXIgcmlnaHQ9ci54K3Iud2lkdGg7XG5cdHZhciBib3R0b209ci55K3IuaGVpZ2h0O1xuXG5cdHRoaXMudGhlTWFzay5jbGVhcigpO1xuXHR0aGlzLnRoZU1hc2suYmVnaW5GaWxsKCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLDAsdGhpcy5zY3JlZW5XaWR0aCxyLnkpO1xuXHR0aGlzLnRoZU1hc2suZHJhd1JlY3QoMCwwLHIueCx0aGlzLnNjcmVlbkhlaWdodCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdChyaWdodCwwLHRoaXMuc2NyZWVuV2lkdGgtcmlnaHQsdGhpcy5zY3JlZW5IZWlnaHQpO1xuXHR0aGlzLnRoZU1hc2suZHJhd1JlY3QoMCxib3R0b20sdGhpcy5zY3JlZW5XaWR0aCx0aGlzLnNjcmVlbkhlaWdodC1ib3R0b20pO1xuXHR0aGlzLnRoZU1hc2suZW5kRmlsbCgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cz1Db250ZW50U2NhbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIEFTMy9qcXVlcnkgc3R5bGUgZXZlbnQgZGlzcGF0Y2hlci4gU2xpZ2h0bHkgbW9kaWZpZWQuIFRoZVxuICoganF1ZXJ5IHN0eWxlIG9uL29mZi90cmlnZ2VyIHN0eWxlIG9mIGFkZGluZyBsaXN0ZW5lcnMgaXNcbiAqIGN1cnJlbnRseSB0aGUgcHJlZmVycmVkIG9uZS5cbiAqIFxuICogVGhlIG9uIG1ldGhvZCBmb3IgYWRkaW5nIGxpc3RlbmVycyB0YWtlcyBhbiBleHRyYSBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlXG4gKiBzY29wZSBpbiB3aGljaCBsaXN0ZW5lcnMgc2hvdWxkIGJlIGNhbGxlZC4gU28gdGhpczpcbiAqXG4gKiAgICAgb2JqZWN0Lm9uKFwiZXZlbnRcIiwgbGlzdGVuZXIsIHRoaXMpO1xuICpcbiAqIEhhcyB0aGUgc2FtZSBmdW5jdGlvbiB3aGVuIGFkZGluZyBldmVudHMgYXM6XG4gKlxuICogICAgIG9iamVjdC5vbihcImV2ZW50XCIsIGxpc3RlbmVyLmJpbmQodGhpcykpO1xuICpcbiAqIEhvd2V2ZXIsIHRoZSBkaWZmZXJlbmNlIGlzIHRoYXQgaWYgd2UgdXNlIHRoZSBzZWNvbmQgbWV0aG9kIGl0XG4gKiB3aWxsIG5vdCBiZSBwb3NzaWJsZSB0byByZW1vdmUgdGhlIGxpc3RlbmVycyBsYXRlciwgdW5sZXNzXG4gKiB0aGUgY2xvc3VyZSBjcmVhdGVkIGJ5IGJpbmQgaXMgc3RvcmVkIHNvbWV3aGVyZS4gSWYgdGhlIFxuICogZmlyc3QgbWV0aG9kIGlzIHVzZWQsIHdlIGNhbiByZW1vdmUgdGhlIGxpc3RlbmVyIHdpdGg6XG4gKlxuICogICAgIG9iamVjdC5vZmYoXCJldmVudFwiLCBsaXN0ZW5lciwgdGhpcyk7XG4gKlxuICogQGNsYXNzIEV2ZW50RGlzcGF0Y2hlclxuICovXG5mdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG5cdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcbn1cblxuLyoqXG4gKiBBZGQgZXZlbnQgbGlzdGVuZXIuXG4gKiBAbWV0aG9kIGFkZEV2ZW50TGlzdGVuZXJcbiAqIEBkZXByZWNhdGVkXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKCFldmVudFR5cGUpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgdHlwZSByZXF1aXJlZCBmb3IgZXZlbnQgZGlzcGF0Y2hlclwiKTtcblxuXHRpZiAoIWxpc3RlbmVyKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIkxpc3RlbmVyIHJlcXVpcmVkIGZvciBldmVudCBkaXNwYXRjaGVyXCIpO1xuXG5cdHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGxpc3RlbmVyLCBzY29wZSk7XG5cblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpXG5cdFx0dGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdID0gW107XG5cblx0dGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdLnB1c2goe1xuXHRcdGxpc3RlbmVyOiBsaXN0ZW5lcixcblx0XHRzY29wZTogc2NvcGVcblx0fSk7XG59XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVyLlxuICogQG1ldGhvZCByZW1vdmVFdmVudExpc3RlbmVyXG4gKiBAZGVwcmVjYXRlZFxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudFR5cGUsIGxpc3RlbmVyLCBzY29wZSkge1xuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXApXG5cdFx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuXG5cdGlmICghdGhpcy5saXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKVxuXHRcdHJldHVybjtcblxuXHR2YXIgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGxpc3RlbmVyT2JqID0gbGlzdGVuZXJzW2ldO1xuXG5cdFx0aWYgKGxpc3RlbmVyID09IGxpc3RlbmVyT2JqLmxpc3RlbmVyICYmIHNjb3BlID09IGxpc3RlbmVyT2JqLnNjb3BlKSB7XG5cdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0aS0tO1xuXHRcdH1cblx0fVxuXG5cdGlmICghbGlzdGVuZXJzLmxlbmd0aClcblx0XHRkZWxldGUgdGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdO1xufVxuXG4vKipcbiAqIERpc3BhdGNoIGV2ZW50LlxuICogQG1ldGhvZCBkaXNwYXRjaEV2ZW50XG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKHR5cGVvZiBldmVudCA9PSBcInN0cmluZ1wiKSB7XG5cdFx0ZXZlbnQgPSB7XG5cdFx0XHR0eXBlOiBldmVudFxuXHRcdH07XG5cdH1cblxuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoZXZlbnQudHlwZSkpXG5cdFx0cmV0dXJuO1xuXG5cdGlmIChkYXRhID09IHVuZGVmaW5lZClcblx0XHRkYXRhID0gZXZlbnQ7XG5cblx0ZGF0YS50YXJnZXQgPSB0aGlzO1xuXG5cdGZvciAodmFyIGkgaW4gdGhpcy5saXN0ZW5lck1hcFtldmVudC50eXBlXSkge1xuXHRcdHZhciBsaXN0ZW5lck9iaiA9IHRoaXMubGlzdGVuZXJNYXBbZXZlbnQudHlwZV1baV07XG5cblx0XHRsaXN0ZW5lck9iai5saXN0ZW5lci5jYWxsKGxpc3RlbmVyT2JqLnNjb3BlLCBkYXRhKTtcblx0fVxufVxuXG4vKipcbiAqIEpxdWVyeSBzdHlsZSBhbGlhcyBmb3IgYWRkRXZlbnRMaXN0ZW5lclxuICogQG1ldGhvZCBvblxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xuXG4vKipcbiAqIEpxdWVyeSBzdHlsZSBhbGlhcyBmb3IgcmVtb3ZlRXZlbnRMaXN0ZW5lclxuICogQG1ldGhvZCBvZmZcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciBkaXNwYXRjaEV2ZW50XG4gKiBAbWV0aG9kIHRyaWdnZXJcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xuXG4vKipcbiAqIE1ha2Ugc29tZXRoaW5nIGFuIGV2ZW50IGRpc3BhdGNoZXIuIENhbiBiZSB1c2VkIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS5cbiAqIEBtZXRob2QgaW5pdFxuICogQHN0YXRpY1xuICovXG5FdmVudERpc3BhdGNoZXIuaW5pdCA9IGZ1bmN0aW9uKGNscykge1xuXHRjbHMucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XG5cdGNscy5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcblx0Y2xzLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xuXHRjbHMucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbjtcblx0Y2xzLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZjtcblx0Y2xzLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIEV2ZW50RGlzcGF0Y2hlcj1yZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgRnVuY3Rpb25VdGlsPXJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcblxuLyoqXG4gKiBGcmFtZSB0aW1lci5cbiAqIEBjbGFzcyBGcmFtZVRpbWVyXG4gKi9cbmZ1bmN0aW9uIEZyYW1lVGltZXIoKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuaW50ZXJ2YWxJZD1zZXRJbnRlcnZhbChGdW5jdGlvblV0aWwuY3JlYXRlRGVsZWdhdGUodGhpcy5vbkludGVydmFsLHRoaXMpLDEwMDAvNjApO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEZyYW1lVGltZXIsRXZlbnREaXNwYXRjaGVyKTtcblxuRnJhbWVUaW1lci5USU1FUj1cInRpbWVyXCI7XG5GcmFtZVRpbWVyLlJFTkRFUj1cInJlbmRlclwiO1xuXG4vKipcbiAqIE9uIGludGVydmFsLlxuICogQG1ldGhvZCBvbkludGVydmFsXG4gKiBAcHJpdmF0ZVxuICovXG5GcmFtZVRpbWVyLnByb3RvdHlwZS5vbkludGVydmFsPWZ1bmN0aW9uKCkge1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoRnJhbWVUaW1lci5USU1FUik7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChGcmFtZVRpbWVyLlJFTkRFUik7XG59XG5cbi8qKlxuICogR2V0IHNpbmdsZXRvbiBpbnN0YW5jZS5cbiAqIEBtZXRob2QgZ2V0SW5zdGFuY2VcbiAqIEBzdGF0aWNcbiAqL1xuRnJhbWVUaW1lci5nZXRJbnN0YW5jZT1mdW5jdGlvbigpIHtcblx0aWYgKCFGcmFtZVRpbWVyLmluc3RhbmNlKVxuXHRcdEZyYW1lVGltZXIuaW5zdGFuY2U9bmV3IEZyYW1lVGltZXIoKTtcblxuXHRyZXR1cm4gRnJhbWVUaW1lci5pbnN0YW5jZTtcbn1cblxubW9kdWxlLmV4cG9ydHM9RnJhbWVUaW1lcjsiLCIvKipcbiAqIEZ1bmN0aW9uIHV0aWxzLlxuICogQGNsYXNzIEZ1bmN0aW9uVXRpbFxuICovXG5mdW5jdGlvbiBGdW5jdGlvblV0aWwoKSB7XG59XG5cbi8qKlxuICogRXh0ZW5kIGEgY2xhc3MuXG4gKiBEb24ndCBmb3JnZXQgdG8gY2FsbCBzdXBlci5cbiAqIEBtZXRob2QgZXh0ZW5kXG4gKiBAc3RhdGljXG4gKi9cbkZ1bmN0aW9uVXRpbC5leHRlbmQ9ZnVuY3Rpb24odGFyZ2V0LCBiYXNlKSB7XG5cdHRhcmdldC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiYXNlLnByb3RvdHlwZSk7XG5cdHRhcmdldC5wcm90b3R5cGUuY29uc3RydWN0b3I9dGFyZ2V0O1xufVxuXG4vKipcbiAqIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvbi4gRGVwcmVjYXRlZCwgdXNlIGJpbmQoKSBpbnN0ZWFkLlxuICogQG1ldGhvZCBjcmVhdGVEZWxlZ2F0ZVxuICogQGRlcHJlY2F0ZWRcbiAqIEBzdGF0aWNcbiAqL1xuRnVuY3Rpb25VdGlsLmNyZWF0ZURlbGVnYXRlPWZ1bmN0aW9uKGZ1bmMsIHNjb3BlKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRmdW5jLmFwcGx5KHNjb3BlLGFyZ3VtZW50cyk7XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzPUZ1bmN0aW9uVXRpbDtcbiIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHNwcml0ZSB3aXRoIGEgZ3JhZGllbnQuXG4gKiBAY2xhc3MgR3JhZGllbnRcbiAqL1xuZnVuY3Rpb24gR3JhZGllbnQoKSB7XG5cdHRoaXMud2lkdGggPSAxMDA7XG5cdHRoaXMuaGVpZ2h0ID0gMTAwO1xuXHR0aGlzLnN0b3BzID0gW107XG59XG5cbi8qKlxuICogU2V0IHNpemUgb2YgdGhlIGdyYWRpZW50LlxuICogQG1ldGhvZCBzZXRTaXplXG4gKi9cbkdyYWRpZW50LnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24odywgaCkge1xuXHR0aGlzLndpZHRoID0gdztcblx0dGhpcy5oZWlnaHQgPSBoO1xufVxuXG4vKipcbiAqIEFkZCBjb2xvciBzdG9wLlxuICogQG1ldGhvZCBhZGRDb2xvclN0b3BcbiAqL1xuR3JhZGllbnQucHJvdG90eXBlLmFkZENvbG9yU3RvcCA9IGZ1bmN0aW9uKHdlaWdodCwgY29sb3IpIHtcblx0dGhpcy5zdG9wcy5wdXNoKHtcblx0XHR3ZWlnaHQ6IHdlaWdodCxcblx0XHRjb2xvcjogY29sb3Jcblx0fSk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBzcHJpdGUuXG4gKiBAbWV0aG9kIGNyZWF0ZVNwcml0ZVxuICovXG5HcmFkaWVudC5wcm90b3R5cGUuY3JlYXRlU3ByaXRlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIGdyYWRpZW50Li4uXCIpO1xuXHR2YXIgYyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdGMud2lkdGggPSB0aGlzLndpZHRoO1xuXHRjLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuXG5cdHZhciBjdHggPSBjLmdldENvbnRleHQoXCIyZFwiKTtcblx0dmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCB0aGlzLmhlaWdodCk7XG5cdHZhciBpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLnN0b3BzLmxlbmd0aDsgaSsrKVxuXHRcdGdyZC5hZGRDb2xvclN0b3AodGhpcy5zdG9wc1tpXS53ZWlnaHQsIHRoaXMuc3RvcHNbaV0uY29sb3IpO1xuXG5cdGN0eC5maWxsU3R5bGUgPSBncmQ7XG5cdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG5cblx0cmV0dXJuIG5ldyBQSVhJLlNwcml0ZShQSVhJLlRleHR1cmUuZnJvbUNhbnZhcyhjKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR3JhZGllbnQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgVGhlbmFibGUgPSByZXF1aXJlKFwiLi9UaGVuYWJsZVwiKTtcblxuLyoqXG4gKiBNZXNzYWdlIGNvbm5lY3Rpb24gaW4gYSBicm93c2VyLlxuICogQGNsYXNzIE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uKCkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblx0dGhpcy50ZXN0ID0gMTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbiwgRXZlbnREaXNwYXRjaGVyKTtcblxuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ09OTkVDVCA9IFwiY29ubmVjdFwiO1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uTUVTU0FHRSA9IFwibWVzc2FnZVwiO1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UgPSBcImNsb3NlXCI7XG5cbi8qKlxuICogQ29ubmVjdC5cbiAqIEBtZXRob2QgY29ubmVjdFxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKHVybCkge1xuXHR0aGlzLndlYlNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcblxuXHR0aGlzLndlYlNvY2tldC5vbm9wZW4gPSB0aGlzLm9uV2ViU29ja2V0T3Blbi5iaW5kKHRoaXMpO1xuXHR0aGlzLndlYlNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLm9uV2ViU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpO1xuXHR0aGlzLndlYlNvY2tldC5vbmNsb3NlID0gdGhpcy5vbldlYlNvY2tldENsb3NlLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9uZXJyb3IgPSB0aGlzLm9uV2ViU29ja2V0RXJyb3IuYmluZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBTZW5kLlxuICogQG1ldGhvZCBzZW5kXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obSkge1xuXHR0aGlzLndlYlNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KG0pKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IG9wZW4uXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0T3BlblxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0T3BlbiA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ09OTkVDVCk7XG59XG5cbi8qKlxuICogV2ViIHNvY2tldCBtZXNzYWdlLlxuICogQG1ldGhvZCBvbldlYlNvY2tldE1lc3NhZ2VcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldE1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuXG5cdHRoaXMudHJpZ2dlcih7XG5cdFx0dHlwZTogTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uTUVTU0FHRSxcblx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdH0pO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgY2xvc2UuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0Q2xvc2VcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldENsb3NlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwid2ViIHNvY2tldCBjbG9zZSwgd3M9XCIgKyB0aGlzLndlYlNvY2tldCArIFwiIHRoaXM9XCIgKyB0aGlzLnRlc3QpO1xuXHR0aGlzLndlYlNvY2tldC5jbG9zZSgpO1xuXHR0aGlzLmNsZWFyV2ViU29ja2V0KCk7XG5cblx0dGhpcy50cmlnZ2VyKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNMT1NFKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IGVycm9yLlxuICogQG1ldGhvZCBvbldlYlNvY2tldEVycm9yXG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUub25XZWJTb2NrZXRFcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcIndlYiBzb2NrZXQgZXJyb3IsIHdzPVwiICsgdGhpcy53ZWJTb2NrZXQgKyBcIiB0aGlzPVwiICsgdGhpcy50ZXN0KTtcblxuXHR0aGlzLndlYlNvY2tldC5jbG9zZSgpO1xuXHR0aGlzLmNsZWFyV2ViU29ja2V0KCk7XG5cblx0dGhpcy50cmlnZ2VyKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNMT1NFKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgY3VycmVudCB3ZWIgc29ja2V0LlxuICogQG1ldGhvZCBjbGVhcldlYlNvY2tldFxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUuY2xlYXJXZWJTb2NrZXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy53ZWJTb2NrZXQub25vcGVuID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25tZXNzYWdlID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25jbG9zZSA9IG51bGw7XG5cdHRoaXMud2ViU29ja2V0Lm9uZXJyb3IgPSBudWxsO1xuXG5cdHRoaXMud2ViU29ja2V0ID0gbnVsbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogTW91c2VPdmVyR3JvdXAuIFRoaXMgaXMgdGhlIGNsYXNzIGZvciB0aGUgTW91c2VPdmVyR3JvdXAuXG4gKiBAY2xhc3MgTW91c2VPdmVyR3JvdXBcbiAqL1xuZnVuY3Rpb24gTW91c2VPdmVyR3JvdXAoKSB7XG5cdHRoaXMub2JqZWN0cyA9IG5ldyBBcnJheSgpO1xuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0dGhpcy5tb3VzZURvd24gPSBmYWxzZTtcblxufVxuRnVuY3Rpb25VdGlsLmV4dGVuZChNb3VzZU92ZXJHcm91cCwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KE1vdXNlT3Zlckdyb3VwKTtcblxuXG4vKipcbiAqIEFkZCBkaXNwbGF5b2JqZWN0IHRvIHdhdGNobGlzdC5cbiAqIEBtZXRob2QgYWRkRGlzcGxheU9iamVjdFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUuYWRkRGlzcGxheU9iamVjdCA9IGZ1bmN0aW9uKGRpc3BsYXlPYmplY3QpIHtcblxuXHRkaXNwbGF5T2JqZWN0LmludGVyYWN0aXZlID0gdHJ1ZTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW92ZXJFbmFibGVkID0gdHJ1ZTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW92ZXIgPSB0aGlzLm9uT2JqZWN0TW91c2VPdmVyLmJpbmQodGhpcyk7XG5cdGRpc3BsYXlPYmplY3QubW91c2VvdXQgPSB0aGlzLm9uT2JqZWN0TW91c2VPdXQuYmluZCh0aGlzKTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZWRvd24gPSB0aGlzLm9uT2JqZWN0TW91c2VEb3duLmJpbmQodGhpcyk7XG5cdHRoaXMub2JqZWN0cy5wdXNoKGRpc3BsYXlPYmplY3QpO1xuXG59XG5cblxuLyoqXG4gKiBNb3VzZSBvdmVyIG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZU92ZXJcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uT2JqZWN0TW91c2VPdmVyID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKHRoaXMuY3VycmVudGx5T3Zlcilcblx0XHRyZXR1cm47XG5cblx0dGhpcy5jdXJyZW50bHlPdmVyID0gdHJ1ZTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwibW91c2VvdmVyXCIpO1xufVxuXG5cbi8qKlxuICogTW91c2Ugb3V0IG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZU91dFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25PYmplY3RNb3VzZU91dCA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZighdGhpcy5jdXJyZW50bHlPdmVyIHx8IHRoaXMubW91c2VEb3duKVxuXHRcdHJldHVybjtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5vYmplY3RzLmxlbmd0aDsgaSsrKVxuXHRcdGlmKHRoaXMuaGl0VGVzdCh0aGlzLm9iamVjdHNbaV0sIGludGVyYWN0aW9uX29iamVjdCkpXG5cdFx0XHRyZXR1cm47XG5cblx0dGhpcy5jdXJyZW50bHlPdmVyID0gZmFsc2U7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcIm1vdXNlb3V0XCIpO1xufVxuXG5cbi8qKlxuICogSGl0IHRlc3QuXG4gKiBAbWV0aG9kIGhpdFRlc3RcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLmhpdFRlc3QgPSBmdW5jdGlvbihvYmplY3QsIGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZigoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54ID4gb2JqZWN0LmdldEJvdW5kcygpLnggKSAmJiAoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54IDwgKG9iamVjdC5nZXRCb3VuZHMoKS54ICsgb2JqZWN0LmdldEJvdW5kcygpLndpZHRoKSkgJiZcblx0XHQoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC55ID4gb2JqZWN0LmdldEJvdW5kcygpLnkpICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPCAob2JqZWN0LmdldEJvdW5kcygpLnkgKyBvYmplY3QuZ2V0Qm91bmRzKCkuaGVpZ2h0KSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcdFx0XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5cbi8qKlxuICogTW91c2UgZG93biBvYmplY3QuXG4gKiBAbWV0aG9kIG9uT2JqZWN0TW91c2VEb3duXG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5vbk9iamVjdE1vdXNlRG93biA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLm1vdXNlRG93biA9IHRydWU7XG5cdGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cCA9IGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cG91dHNpZGUgPSB0aGlzLm9uU3RhZ2VNb3VzZVVwLmJpbmQodGhpcyk7XG59XG5cblxuLyoqXG4gKiBNb3VzZSB1cCBzdGFnZS5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlVXBcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uU3RhZ2VNb3VzZVVwID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cCA9IGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cG91dHNpZGUgPSBudWxsO1xuXHR0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuXG5cdGlmKHRoaXMuY3VycmVudGx5T3Zlcikge1xuXHRcdHZhciBvdmVyID0gZmFsc2U7XG5cblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5vYmplY3RzLmxlbmd0aDsgaSsrKVxuXHRcdFx0aWYodGhpcy5oaXRUZXN0KHRoaXMub2JqZWN0c1tpXSwgaW50ZXJhY3Rpb25fb2JqZWN0KSlcblx0XHRcdFx0b3ZlciA9IHRydWU7XG5cblx0XHRpZighb3Zlcikge1xuXHRcdFx0dGhpcy5jdXJyZW50bHlPdmVyID0gZmFsc2U7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJtb3VzZW91dFwiKTtcblx0XHR9XG5cdH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlT3Zlckdyb3VwO1xuXG4iLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcblxuLyoqXG4gKiBOaW5lIHNsaWNlLiBUaGlzIGlzIGEgc3ByaXRlIHRoYXQgaXMgYSBncmlkLCBhbmQgb25seSB0aGVcbiAqIG1pZGRsZSBwYXJ0IHN0cmV0Y2hlcyB3aGVuIHNjYWxpbmcuXG4gKiBAY2xhc3MgTmluZVNsaWNlXG4gKi9cbmZ1bmN0aW9uIE5pbmVTbGljZSh0ZXh0dXJlLCBsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy50ZXh0dXJlID0gdGV4dHVyZTtcblxuXHRpZiAoIXRvcClcblx0XHR0b3AgPSBsZWZ0O1xuXG5cdGlmICghcmlnaHQpXG5cdFx0cmlnaHQgPSBsZWZ0O1xuXG5cdGlmICghYm90dG9tKVxuXHRcdGJvdHRvbSA9IHRvcDtcblxuXHR0aGlzLmxlZnQgPSBsZWZ0O1xuXHR0aGlzLnRvcCA9IHRvcDtcblx0dGhpcy5yaWdodCA9IHJpZ2h0O1xuXHR0aGlzLmJvdHRvbSA9IGJvdHRvbTtcblxuXHR0aGlzLmxvY2FsV2lkdGggPSB0ZXh0dXJlLndpZHRoO1xuXHR0aGlzLmxvY2FsSGVpZ2h0ID0gdGV4dHVyZS5oZWlnaHQ7XG5cblx0dGhpcy5idWlsZFBhcnRzKCk7XG5cdHRoaXMudXBkYXRlU2l6ZXMoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChOaW5lU2xpY2UsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5cbi8qKlxuICogQnVpbGQgdGhlIHBhcnRzIGZvciB0aGUgc2xpY2VzLlxuICogQG1ldGhvZCBidWlsZFBhcnRzXG4gKiBAcHJpdmF0ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLmJ1aWxkUGFydHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHhwID0gWzAsIHRoaXMubGVmdCwgdGhpcy50ZXh0dXJlLndpZHRoIC0gdGhpcy5yaWdodCwgdGhpcy50ZXh0dXJlLndpZHRoXTtcblx0dmFyIHlwID0gWzAsIHRoaXMudG9wLCB0aGlzLnRleHR1cmUuaGVpZ2h0IC0gdGhpcy5ib3R0b20sIHRoaXMudGV4dHVyZS5oZWlnaHRdO1xuXHR2YXIgaGksIHZpO1xuXG5cdHRoaXMucGFydHMgPSBbXTtcblxuXHRmb3IgKHZpID0gMDsgdmkgPCAzOyB2aSsrKSB7XG5cdFx0Zm9yIChoaSA9IDA7IGhpIDwgMzsgaGkrKykge1xuXHRcdFx0dmFyIHcgPSB4cFtoaSArIDFdIC0geHBbaGldO1xuXHRcdFx0dmFyIGggPSB5cFt2aSArIDFdIC0geXBbdmldO1xuXG5cdFx0XHRpZiAodyAhPSAwICYmIGggIT0gMCkge1xuXHRcdFx0XHR2YXIgdGV4dHVyZVBhcnQgPSB0aGlzLmNyZWF0ZVRleHR1cmVQYXJ0KHhwW2hpXSwgeXBbdmldLCB3LCBoKTtcblx0XHRcdFx0dmFyIHMgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZVBhcnQpO1xuXHRcdFx0XHR0aGlzLmFkZENoaWxkKHMpO1xuXG5cdFx0XHRcdHRoaXMucGFydHMucHVzaChzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucGFydHMucHVzaChudWxsKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgc2l6ZXMuXG4gKiBAbWV0aG9kIHVwZGF0ZVNpemVzXG4gKiBAcHJpdmF0ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLnVwZGF0ZVNpemVzID0gZnVuY3Rpb24oKSB7XG5cdHZhciB4cCA9IFswLCB0aGlzLmxlZnQsIHRoaXMubG9jYWxXaWR0aCAtIHRoaXMucmlnaHQsIHRoaXMubG9jYWxXaWR0aF07XG5cdHZhciB5cCA9IFswLCB0aGlzLnRvcCwgdGhpcy5sb2NhbEhlaWdodCAtIHRoaXMuYm90dG9tLCB0aGlzLmxvY2FsSGVpZ2h0XTtcblx0dmFyIGhpLCB2aSwgaSA9IDA7XG5cblx0Zm9yICh2aSA9IDA7IHZpIDwgMzsgdmkrKykge1xuXHRcdGZvciAoaGkgPSAwOyBoaSA8IDM7IGhpKyspIHtcblx0XHRcdGlmICh0aGlzLnBhcnRzW2ldKSB7XG5cdFx0XHRcdHZhciBwYXJ0ID0gdGhpcy5wYXJ0c1tpXTtcblxuXHRcdFx0XHRwYXJ0LnBvc2l0aW9uLnggPSB4cFtoaV07XG5cdFx0XHRcdHBhcnQucG9zaXRpb24ueSA9IHlwW3ZpXTtcblx0XHRcdFx0cGFydC53aWR0aCA9IHhwW2hpICsgMV0gLSB4cFtoaV07XG5cdFx0XHRcdHBhcnQuaGVpZ2h0ID0geXBbdmkgKyAxXSAtIHlwW3ZpXTtcblx0XHRcdH1cblxuXHRcdFx0aSsrO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFNldCBsb2NhbCBzaXplLlxuICogQG1ldGhvZCBzZXRMb2NhbFNpemVcbiAqL1xuTmluZVNsaWNlLnByb3RvdHlwZS5zZXRMb2NhbFNpemUgPSBmdW5jdGlvbih3LCBoKSB7XG5cdHRoaXMubG9jYWxXaWR0aCA9IHc7XG5cdHRoaXMubG9jYWxIZWlnaHQgPSBoO1xuXHR0aGlzLnVwZGF0ZVNpemVzKCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHRleHR1cmUgcGFydC5cbiAqIEBtZXRob2QgY3JlYXRlVGV4dHVyZVBhcnRcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUuY3JlYXRlVGV4dHVyZVBhcnQgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG5cdHZhciBmcmFtZSA9IHtcblx0XHR4OiB0aGlzLnRleHR1cmUuZnJhbWUueCArIHgsXG5cdFx0eTogdGhpcy50ZXh0dXJlLmZyYW1lLnkgKyB5LFxuXHRcdHdpZHRoOiB3aWR0aCxcblx0XHRoZWlnaHQ6IGhlaWdodFxuXHR9O1xuXG5cdHJldHVybiBuZXcgUElYSS5UZXh0dXJlKHRoaXMudGV4dHVyZSwgZnJhbWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5pbmVTbGljZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgQ29udGVudFNjYWxlciA9IHJlcXVpcmUoXCIuL0NvbnRlbnRTY2FsZXJcIik7XG52YXIgRnJhbWVUaW1lciA9IHJlcXVpcmUoXCIuL0ZyYW1lVGltZXJcIik7XG5cbi8qKlxuICogUGl4aSBmdWxsIHdpbmRvdyBhcHAuXG4gKiBDYW4gb3BlcmF0ZSB1c2luZyB3aW5kb3cgY29vcmRpbmF0ZXMgb3Igc2NhbGVkIHRvIHNwZWNpZmljIGFyZWEuXG4gKiBAY2xhc3MgUGl4aUFwcFxuICovXG5mdW5jdGlvbiBQaXhpQXBwKGRvbUlkLCB3aWR0aCwgaGVpZ2h0KSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHZhciB2aWV3O1xuXG5cdGlmIChuYXZpZ2F0b3IuaXNDb2Nvb25KUylcblx0XHR2aWV3ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyZWVuY2FudmFzJyk7XG5cblx0ZWxzZVxuXHRcdHZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblxuXHRpZiAoIWRvbUlkKSB7XG5cdFx0aWYgKFBpeGlBcHAuZnVsbFNjcmVlbkluc3RhbmNlKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT25seSBvbmUgUGl4aUFwcCBwZXIgYXBwXCIpO1xuXG5cdFx0UGl4aUFwcC5mdWxsU2NyZWVuSW5zdGFuY2UgPSB0aGlzO1xuXG5cdFx0Y29uc29sZS5sb2coXCJubyBkb20gaXQsIGF0dGFjaGluZyB0byBib2R5XCIpO1xuXHRcdHRoaXMuY29udGFpbmVyRWwgPSBkb2N1bWVudC5ib2R5O1xuXHRcdGRvY3VtZW50LmJvZHkuc3R5bGUubWFyZ2luID0gMDtcblx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmcgPSAwO1xuXG5cdFx0ZG9jdW1lbnQuYm9keS5vbnJlc2l6ZSA9IEZ1bmN0aW9uVXRpbC5jcmVhdGVEZWxlZ2F0ZSh0aGlzLm9uV2luZG93UmVzaXplLCB0aGlzKTtcblx0XHR3aW5kb3cub25yZXNpemUgPSBGdW5jdGlvblV0aWwuY3JlYXRlRGVsZWdhdGUodGhpcy5vbldpbmRvd1Jlc2l6ZSwgdGhpcyk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc29sZS5sb2coXCJhdHRhY2hpbmcgdG86IFwiICsgZG9tSWQpO1xuXHRcdHRoaXMuY29udGFpbmVyRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChkb21JZCk7XG5cdH1cblxuXHR0aGlzLnJlbmRlcmVyID0gbmV3IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKHRoaXMuY29udGFpbmVyRWwuY2xpZW50V2lkdGgsIHRoaXMuY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0LCB2aWV3KTtcblx0dGhpcy5jb250YWluZXJFbC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlcmVyLnZpZXcpO1xuXG5cdHRoaXMuY29udGVudFNjYWxlciA9IG51bGw7XG5cblx0dGhpcy5hcHBTdGFnZSA9IG5ldyBQSVhJLlN0YWdlKDAsIHRydWUpO1xuXG5cdGlmICghd2lkdGggfHwgIWhlaWdodClcblx0XHR0aGlzLnVzZU5vU2NhbGluZygpO1xuXG5cdGVsc2Vcblx0XHR0aGlzLnVzZVNjYWxpbmcod2lkdGgsIGhlaWdodCk7XG5cbi8vXHRGcmFtZVRpbWVyLmdldEluc3RhbmNlKCkuYWRkRXZlbnRMaXN0ZW5lcihGcmFtZVRpbWVyLlJFTkRFUiwgdGhpcy5vbkFuaW1hdGlvbkZyYW1lLCB0aGlzKTtcblxuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25BbmltYXRpb25GcmFtZS5iaW5kKHRoaXMpKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChQaXhpQXBwLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuXG4vKipcbiAqIFVzZSBzY2FsaW5nIG1vZGUuXG4gKiBAbWV0aG9kIHVzZVNjYWxpbmdcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUudXNlU2NhbGluZyA9IGZ1bmN0aW9uKHcsIGgpIHtcblx0dGhpcy5yZW1vdmVDb250ZW50KCk7XG5cblx0dGhpcy5jb250ZW50U2NhbGVyID0gbmV3IENvbnRlbnRTY2FsZXIodGhpcyk7XG5cdHRoaXMuY29udGVudFNjYWxlci5zZXRDb250ZW50U2l6ZSh3LCBoKTtcblx0dGhpcy5jb250ZW50U2NhbGVyLnNldFNjcmVlblNpemUodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQpO1xuXHR0aGlzLmFwcFN0YWdlLmFkZENoaWxkKHRoaXMuY29udGVudFNjYWxlcik7XG59XG5cbi8qKlxuICogVXNlIG5vIHNjYWxpbmcgbW9kZS5cbiAqIEBtZXRob2QgdXNlTm9TY2FsaW5nXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLnVzZU5vU2NhbGluZyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlbW92ZUNvbnRlbnQoKTtcblxuXHR0aGlzLmFwcFN0YWdlLmFkZENoaWxkKHRoaXMpO1xufVxuXG4vKipcbiAqIFJlbW92ZSBhbnkgY29udGVudC5cbiAqIEBtZXRob2QgcmVtb3ZlQ29udGVudFxuICogQHByaXZhdGVcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUucmVtb3ZlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5hcHBTdGFnZS5jaGlsZHJlbi5pbmRleE9mKHRoaXMpID49IDApXG5cdFx0dGhpcy5hcHBTdGFnZS5yZW1vdmVDaGlsZCh0aGlzKTtcblxuXHRpZiAodGhpcy5jb250ZW50U2NhbGVyKSB7XG5cdFx0dGhpcy5hcHBTdGFnZS5yZW1vdmVDaGlsZCh0aGlzLmNvbnRlbnRTY2FsZXIpXG5cdFx0dGhpcy5jb250ZW50U2NhbGVyID0gbnVsbDtcblx0fVxufVxuXG4vKipcbiAqIFdpbmRvdyByZXNpemUuXG4gKiBAbWV0aG9kIG9uV2luZG93UmVzaXplXG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpQXBwLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jb250ZW50U2NhbGVyKVxuXHRcdHRoaXMuY29udGVudFNjYWxlci5zZXRTY3JlZW5TaXplKHRoaXMuY29udGFpbmVyRWwuY2xpZW50V2lkdGgsIHRoaXMuY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0KTtcblxuXHR0aGlzLnJlbmRlcmVyLnJlc2l6ZSh0aGlzLmNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCB0aGlzLmNvbnRhaW5lckVsLmNsaWVudEhlaWdodCk7XG5cdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwU3RhZ2UpO1xufVxuXG4vKipcbiAqIEFuaW1hdGlvbiBmcmFtZS5cbiAqIEBtZXRob2Qgb25BbmltYXRpb25GcmFtZVxuICogQHByaXZhdGVcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUub25BbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKHRpbWUpIHtcblx0dGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5hcHBTdGFnZSk7XG5cdFRXRUVOLnVwZGF0ZSh0aW1lKTtcblxuXHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25BbmltYXRpb25GcmFtZS5iaW5kKHRoaXMpKTtcbn1cblxuLyoqXG4gKiBHZXQgY2FudmFzLlxuICogQG1ldGhvZCBnZXRDYW52YXNcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUuZ2V0Q2FudmFzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnJlbmRlcmVyLnZpZXc7XG59XG5cbi8qKlxuICogR2V0IHN0YWdlLlxuICogQG1ldGhvZCBnZXRTdGFnZVxuICovXG5QaXhpQXBwLnByb3RvdHlwZS5nZXRTdGFnZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5hcHBTdGFnZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQaXhpQXBwOyIsIi8qKlxuICogUmVwcmVzZW50cyBhIHBvaW50LlxuICogQGNsYXNzIFBvaW50XG4gKi9cbmZ1bmN0aW9uIFBvaW50KHgsIHkpIHtcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFBvaW50KSlcblx0XHRyZXR1cm4gbmV3IFBvaW50KHgsIHkpO1xuXG5cdHRoaXMueCA9IHg7XG5cdHRoaXMueSA9IHk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7IiwidmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogUGVyZm9ybSB0YXNrcyBpbiBhIHNlcXVlbmNlLlxuICogVGFza3MsIHdoaWNoIHNob3VsZCBiZSBldmVudCBkaXNwYXRjaGVycyxcbiAqIGFyZSBldXF1ZXVlZCB3aXRoIHRoZSBlbnF1ZXVlIGZ1bmN0aW9uLFxuICogYSBTVEFSVCBldmVudCBpcyBkaXNwYXRjaGVyIHVwb24gdGFza1xuICogc3RhcnQsIGFuZCB0aGUgdGFzayBpcyBjb25zaWRlcmVkIGNvbXBsZXRlXG4gKiBhcyBpdCBkaXNwYXRjaGVzIGEgQ09NUExFVEUgZXZlbnQuXG4gKiBAY2xhc3MgU2VxdWVuY2VyXG4gKi9cbmZ1bmN0aW9uIFNlcXVlbmNlcigpIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5xdWV1ZSA9IFtdO1xuXHR0aGlzLmN1cnJlbnRUYXNrID0gbnVsbDtcblx0dGhpcy5vblRhc2tDb21wbGV0ZUNsb3N1cmUgPSB0aGlzLm9uVGFza0NvbXBsZXRlLmJpbmQodGhpcyk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2VxdWVuY2VyLCBFdmVudERpc3BhdGNoZXIpO1xuXG5TZXF1ZW5jZXIuU1RBUlQgPSBcInN0YXJ0XCI7XG5TZXF1ZW5jZXIuQ09NUExFVEUgPSBcImNvbXBsZXRlXCI7XG5cbi8qKlxuICogRW5xdWV1ZSBhIHRhc2sgdG8gYmUgcGVyZm9ybWVkLlxuICogQG1ldGhvZCBlbnF1ZXVlXG4gKi9cblNlcXVlbmNlci5wcm90b3R5cGUuZW5xdWV1ZSA9IGZ1bmN0aW9uKHRhc2spIHtcblx0aWYgKCF0aGlzLmN1cnJlbnRUYXNrKVxuXHRcdHRoaXMuc3RhcnRUYXNrKHRhc2spXG5cblx0ZWxzZVxuXHRcdHRoaXMucXVldWUucHVzaCh0YXNrKTtcbn1cblxuLyoqXG4gKiBTdGFydCB0aGUgdGFzay5cbiAqIEBtZXRob2Qgc3RhcnRUYXNrXG4gKiBAcHJpdmF0ZVxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0YXJ0VGFzayA9IGZ1bmN0aW9uKHRhc2spIHtcblx0dGhpcy5jdXJyZW50VGFzayA9IHRhc2s7XG5cblx0dGhpcy5jdXJyZW50VGFzay5hZGRFdmVudExpc3RlbmVyKFNlcXVlbmNlci5DT01QTEVURSwgdGhpcy5vblRhc2tDb21wbGV0ZUNsb3N1cmUpO1xuXHR0aGlzLmN1cnJlbnRUYXNrLmRpc3BhdGNoRXZlbnQoe1xuXHRcdHR5cGU6IFNlcXVlbmNlci5TVEFSVFxuXHR9KTtcbn1cblxuLyoqXG4gKiBUaGUgY3VycmVudCB0YXNrIGlzIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvblRhc2tDb21wbGV0ZVxuICrCoEBwcml2YXRlXG4gKi9cblNlcXVlbmNlci5wcm90b3R5cGUub25UYXNrQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jdXJyZW50VGFzay5yZW1vdmVFdmVudExpc3RlbmVyKFNlcXVlbmNlci5DT01QTEVURSwgdGhpcy5vblRhc2tDb21wbGV0ZUNsb3N1cmUpO1xuXHR0aGlzLmN1cnJlbnRUYXNrID0gbnVsbDtcblxuXHRpZiAodGhpcy5xdWV1ZS5sZW5ndGggPiAwKVxuXHRcdHRoaXMuc3RhcnRUYXNrKHRoaXMucXVldWUuc2hpZnQoKSk7XG5cblx0ZWxzZVxuXHRcdHRoaXMudHJpZ2dlcihTZXF1ZW5jZXIuQ09NUExFVEUpO1xuXG59XG5cbi8qKlxuICogQWJvcnQgdGhlIHNlcXVlbmNlLlxuICogQG1ldGhvZCBhYm9ydFxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLmN1cnJlbnRUYXNrKSB7XG5cdFx0dGhpcy5jdXJyZW50VGFzay5yZW1vdmVFdmVudExpc3RlbmVyKFNlcXVlbmNlci5DT01QTEVURSwgdGhpcy5vblRhc2tDb21wbGV0ZUNsb3N1cmUpO1xuXHRcdHRoaXMuY3VycmVudFRhc2sgPSBudWxsO1xuXHR9XG5cblx0dGhpcy5xdWV1ZSA9IFtdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlcXVlbmNlcjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogU2xpZGVyLiBUaGlzIGlzIHRoZSBjbGFzcyBmb3IgdGhlIHNsaWRlci5cbiAqIEBjbGFzcyBTbGlkZXJcbiAqL1xuZnVuY3Rpb24gU2xpZGVyKGJhY2tncm91bmQsIGtub2IpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5iYWNrZ3JvdW5kID0gYmFja2dyb3VuZDtcblx0dGhpcy5rbm9iID0ga25vYjtcblxuXHR0aGlzLmFkZENoaWxkKHRoaXMuYmFja2dyb3VuZCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5rbm9iKTtcblxuXG5cdHRoaXMua25vYi5idXR0b25Nb2RlID0gdHJ1ZTtcblx0dGhpcy5rbm9iLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0dGhpcy5rbm9iLm1vdXNlZG93biA9IHRoaXMub25Lbm9iTW91c2VEb3duLmJpbmQodGhpcyk7XG5cblx0dGhpcy5iYWNrZ3JvdW5kLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXHR0aGlzLmJhY2tncm91bmQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHR0aGlzLmJhY2tncm91bmQubW91c2Vkb3duID0gdGhpcy5vbkJhY2tncm91bmRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuXHR0aGlzLmZhZGVUd2VlbiA9IG51bGw7XG5cdHRoaXMuYWxwaGEgPSAwO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNsaWRlciwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFNsaWRlcik7XG5cblxuLyoqXG4gKiBNb3VzZSBkb3duIG9uIGtub2IuXG4gKiBAbWV0aG9kIG9uS25vYk1vdXNlRG93blxuICovXG5TbGlkZXIucHJvdG90eXBlLm9uS25vYk1vdXNlRG93biA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLmRvd25Qb3MgPSB0aGlzLmtub2IucG9zaXRpb24ueDtcblx0dGhpcy5kb3duWCA9IGludGVyYWN0aW9uX29iamVjdC5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLng7XG5cblx0dGhpcy5zdGFnZS5tb3VzZXVwID0gdGhpcy5vblN0YWdlTW91c2VVcC5iaW5kKHRoaXMpO1xuXHR0aGlzLnN0YWdlLm1vdXNlbW92ZSA9IHRoaXMub25TdGFnZU1vdXNlTW92ZS5iaW5kKHRoaXMpO1xufVxuXG5cbi8qKlxuICogTW91c2UgZG93biBvbiBiYWNrZ3JvdW5kLlxuICogQG1ldGhvZCBvbkJhY2tncm91bmRNb3VzZURvd25cbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vbkJhY2tncm91bmRNb3VzZURvd24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5kb3duWCA9IGludGVyYWN0aW9uX29iamVjdC5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLng7XG5cdHRoaXMua25vYi54ID0gaW50ZXJhY3Rpb25fb2JqZWN0LmdldExvY2FsUG9zaXRpb24odGhpcykueCAtIHRoaXMua25vYi53aWR0aCowLjU7XG5cblx0dGhpcy52YWxpZGF0ZVZhbHVlKCk7XG5cblx0dGhpcy5kb3duUG9zID0gdGhpcy5rbm9iLnBvc2l0aW9uLng7XG5cblx0dGhpcy5zdGFnZS5tb3VzZXVwID0gdGhpcy5vblN0YWdlTW91c2VVcC5iaW5kKHRoaXMpO1xuXHR0aGlzLnN0YWdlLm1vdXNlbW92ZSA9IHRoaXMub25TdGFnZU1vdXNlTW92ZS5iaW5kKHRoaXMpO1xuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiKTtcbn1cblxuXG4vKipcbiAqIE1vdXNlIHVwLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VVcFxuICovXG5TbGlkZXIucHJvdG90eXBlLm9uU3RhZ2VNb3VzZVVwID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuc3RhZ2UubW91c2V1cCA9IG51bGw7XG5cdHRoaXMuc3RhZ2UubW91c2Vtb3ZlID0gbnVsbDtcbn1cblxuXG4vKipcbiAqIE1vdXNlIG1vdmUuXG4gKiBAbWV0aG9kIG9uU3RhZ2VNb3VzZU1vdmVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vblN0YWdlTW91c2VNb3ZlID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMua25vYi54ID0gdGhpcy5kb3duUG9zICsgKGludGVyYWN0aW9uX29iamVjdC5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLnggLSB0aGlzLmRvd25YKTtcblxuXHR0aGlzLnZhbGlkYXRlVmFsdWUoKTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIik7XG59XG5cblxuLyoqXG4gKiBWYWxpZGF0ZSBwb3NpdGlvbi5cbiAqIEBtZXRob2QgdmFsaWRhdGVWYWx1ZVxuICovXG5TbGlkZXIucHJvdG90eXBlLnZhbGlkYXRlVmFsdWUgPSBmdW5jdGlvbigpIHtcblxuXHRpZih0aGlzLmtub2IueCA8IDApXG5cdFx0dGhpcy5rbm9iLnggPSAwO1xuXG5cdGlmKHRoaXMua25vYi54ID4gKHRoaXMuYmFja2dyb3VuZC53aWR0aCAtIHRoaXMua25vYi53aWR0aCkpXG5cdFx0dGhpcy5rbm9iLnggPSB0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGg7XG59XG5cblxuLyoqXG4gKiBHZXQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cblNsaWRlci5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGZyYWN0aW9uID0gdGhpcy5rbm9iLnBvc2l0aW9uLngvKHRoaXMuYmFja2dyb3VuZC53aWR0aCAtIHRoaXMua25vYi53aWR0aCk7XG5cblx0cmV0dXJuIGZyYWN0aW9uO1xufVxuXG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5TbGlkZXIucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5rbm9iLnggPSB0aGlzLmJhY2tncm91bmQucG9zaXRpb24ueCArIHZhbHVlKih0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGgpO1xuXG5cdHRoaXMudmFsaWRhdGVWYWx1ZSgpO1xuXHRyZXR1cm4gdGhpcy5nZXRWYWx1ZSgpO1xufVxuXG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5TbGlkZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblx0aWYodGhpcy5mYWRlVHdlZW4gIT0gbnVsbClcblx0XHR0aGlzLmZhZGVUd2Vlbi5zdG9wKCk7XG5cdHRoaXMuZmFkZVR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMpXG5cdFx0XHQudG8oe2FscGhhOiAxfSwgMjUwKVxuXHRcdFx0LnN0YXJ0KCk7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5TbGlkZXIucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0aWYodGhpcy5mYWRlVHdlZW4gIT0gbnVsbClcblx0XHR0aGlzLmZhZGVUd2Vlbi5zdG9wKCk7XG5cdHRoaXMuZmFkZVR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMpXG5cdFx0XHQudG8oe2FscGhhOiAwfSwgMjUwKVxuXHRcdFx0Lm9uQ29tcGxldGUodGhpcy5vbkhpZGRlbi5iaW5kKHRoaXMpKVxuXHRcdFx0LnN0YXJ0KCk7XG59XG5cbi8qKlxuICogT24gaGlkZGVuLlxuICogQG1ldGhvZCBvbkhpZGRlblxuICovXG5TbGlkZXIucHJvdG90eXBlLm9uSGlkZGVuID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyO1xuIiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgcHJvbWlzZXMgYXMgZGVmaW5lZCBoZXJlOlxuICogaHR0cDovL3Byb21pc2VzLWFwbHVzLmdpdGh1Yi5pby9wcm9taXNlcy1zcGVjL1xuICogQGNsYXNzIFRoZW5hYmxlXG4gKi9cbmZ1bmN0aW9uIFRoZW5hYmxlKCkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKVxuXG5cdHRoaXMuc3VjY2Vzc0hhbmRsZXJzID0gW107XG5cdHRoaXMuZXJyb3JIYW5kbGVycyA9IFtdO1xuXHR0aGlzLm5vdGlmaWVkID0gZmFsc2U7XG5cdHRoaXMuaGFuZGxlcnNDYWxsZWQgPSBmYWxzZTtcblx0dGhpcy5ub3RpZnlQYXJhbSA9IG51bGw7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoVGhlbmFibGUsIEV2ZW50RGlzcGF0Y2hlcik7XG5cbi8qKlxuICogU2V0IHJlc29sdXRpb24gaGFuZGxlcnMuXG4gKiBAbWV0aG9kIHRoZW5cbiAqIEBwYXJhbSBzdWNjZXNzIFRoZSBmdW5jdGlvbiBjYWxsZWQgdG8gaGFuZGxlIHN1Y2Nlc3MuXG4gKiBAcGFyYW0gZXJyb3IgVGhlIGZ1bmN0aW9uIGNhbGxlZCB0byBoYW5kbGUgZXJyb3IuXG4gKiBAcmV0dXJuIFRoaXMgVGhlbmFibGUgZm9yIGNoYWluaW5nLlxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKHN1Y2Nlc3MsIGVycm9yKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgdGhlbmFibGUgaXMgYWxyZWFkeSB1c2VkLlwiKTtcblxuXHR0aGlzLnN1Y2Nlc3NIYW5kbGVycy5wdXNoKHN1Y2Nlc3MpO1xuXHR0aGlzLmVycm9ySGFuZGxlcnMucHVzaChlcnJvcik7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogTm90aWZ5IHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEBtZXRob2Qgbm90aWZ5U3VjY2Vzc1xuICovXG5UaGVuYWJsZS5wcm90b3R5cGUubm90aWZ5U3VjY2VzcyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgdGhlbmFibGUgaXMgYWxyZWFkeSBub3RpZmllZC5cIik7XG5cblx0dGhpcy5ub3RpZnlQYXJhbSA9IHBhcmFtO1xuXHRzZXRUaW1lb3V0KHRoaXMuZG9Ob3RpZnlTdWNjZXNzLmJpbmQodGhpcyksIDApO1xufVxuXG4vKipcbiAqIE5vdGlmeSBmYWlsdXJlIG9mIHRoZSBvcGVyYXRpb24uXG4gKiBAbWV0aG9kIG5vdGlmeUVycm9yXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5ub3RpZnlFcnJvciA9IGZ1bmN0aW9uKHBhcmFtKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgdGhlbmFibGUgaXMgYWxyZWFkeSBub3RpZmllZC5cIik7XG5cblx0dGhpcy5ub3RpZnlQYXJhbSA9IHBhcmFtO1xuXHRzZXRUaW1lb3V0KHRoaXMuZG9Ob3RpZnlFcnJvci5iaW5kKHRoaXMpLCAwKTtcbn1cblxuLyoqXG4gKiBBY3R1YWxseSBub3RpZnkgc3VjY2Vzcy5cbiAqIEBtZXRob2QgZG9Ob3RpZnlTdWNjZXNzXG4gKiBAcHJpdmF0ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUuZG9Ob3RpZnlTdWNjZXNzID0gZnVuY3Rpb24ocGFyYW0pIHtcblx0aWYgKHBhcmFtKVxuXHRcdHRoaXMubm90aWZ5UGFyYW0gPSBwYXJhbTtcblxuXHR0aGlzLmNhbGxIYW5kbGVycyh0aGlzLnN1Y2Nlc3NIYW5kbGVycyk7XG59XG5cbi8qKlxuICogQWN0dWFsbHkgbm90aWZ5IGVycm9yLlxuICogQG1ldGhvZCBkb05vdGlmeUVycm9yXG4gKiBAcHJpdmF0ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUuZG9Ob3RpZnlFcnJvciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNhbGxIYW5kbGVycyh0aGlzLmVycm9ySGFuZGxlcnMpO1xufVxuXG4vKipcbiAqIENhbGwgaGFuZGxlcnMuXG4gKiBAbWV0aG9kIGNhbGxIYW5kbGVyc1xuICogQHByaXZhdGVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLmNhbGxIYW5kbGVycyA9IGZ1bmN0aW9uKGhhbmRsZXJzKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBuZXZlciBoYXBwZW4uXCIpO1xuXG5cdHRoaXMuaGFuZGxlcnNDYWxsZWQgPSB0cnVlO1xuXG5cdGZvciAodmFyIGkgaW4gaGFuZGxlcnMpIHtcblx0XHRpZiAoaGFuZGxlcnNbaV0pIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGhhbmRsZXJzW2ldLmNhbGwobnVsbCwgdGhpcy5ub3RpZnlQYXJhbSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFeGNlcHRpb24gaW4gVGhlbmFibGUgaGFuZGxlcjogXCIgKyBlKTtcblx0XHRcdFx0Y29uc29sZS5sb2coZS5zdGFjayk7XG5cdFx0XHRcdHRocm93IGU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBwcm9taXNlLlxuICogQG1ldGhvZCByZXNvbHZlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24ocmVzdWx0KSB7XG5cdHRoaXMubm90aWZ5U3VjY2VzcyhyZXN1bHQpO1xufVxuXG4vKipcbiAqIFJlamVjdCBwcm9taXNlLlxuICogQG1ldGhvZCByZWplY3RcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLnJlamVjdCA9IGZ1bmN0aW9uKHJlYXNvbikge1xuXHR0aGlzLm5vdGlmeUVycm9yKHJlYXNvbik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGhlbmFibGU7Il19
