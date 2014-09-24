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
},{"../../proto/ProtoConnection":31,"../../proto/messages/InitMessage":49,"../../proto/messages/StateCompleteMessage":60,"../../utils/FunctionUtil":71,"../../utils/MessageWebSocketConnection":73,"../../utils/PixiApp":76,"../controller/NetPokerClientController":10,"../resources/Resources":14,"../view/LoadingScreen":23,"../view/NetPokerClientView":24,"pixi.js":3}],6:[function(require,module,exports){


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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/Sequencer":78}],9:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/Sequencer":78,"./MessageSequenceItem":8}],10:[function(require,module,exports){
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
},{"../../proto/ProtoConnection":31,"../../proto/data/ButtonData":32,"../../proto/messages/ButtonClickMessage":38,"../../proto/messages/ChatMessage":40,"../../proto/messages/SeatClickMessage":57,"../../utils/FunctionUtil":71,"../view/ButtonsView":16,"../view/DialogView":22,"../view/NetPokerClientView":24,"../view/SettingsView":29,"./InterfaceController":7,"./MessageSequencer":9,"./TableController":11}],11:[function(require,module,exports){
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

	console.log("got community cards!");
	console.log(m);

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
},{"../../utils/Point":77,"./DefaultSkin":13,"pixi.js":3}],15:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3}],16:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/NineSlice":75,"../../utils/Slider":79,"../resources/Resources":14,"./BigButton":15,"./RaiseShortcutButton":26,"pixi.js":3}],17:[function(require,module,exports){
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
//            .delay(delay)
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],18:[function(require,module,exports){
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

},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/MouseOverGroup":74,"../../utils/NineSlice":75,"../../utils/Slider":79,"../resources/Resources":14,"PixiTextInput":1,"pixi.js":3}],19:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],20:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],21:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3}],22:[function(require,module,exports){
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
},{"../../proto/data/ButtonData":32,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/NineSlice":75,"../resources/Resources":14,"./DialogButton":21,"PixiTextInput":1,"pixi.js":3}],23:[function(require,module,exports){
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
},{"../../utils/FunctionUtil":71,"../../utils/Gradient":72,"pixi.js":3}],24:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/Gradient":72,"../../utils/Point":77,"../resources/Resources":14,"../view/SettingsView":29,"./ButtonsView":16,"./CardView":17,"./ChatView":18,"./ChipsView":19,"./DealerButtonView":20,"./DialogView":22,"./PotView":25,"./SeatView":27,"./TimerView":30,"pixi.js":3}],25:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../resources/Resources":14,"./ChipsView":19,"pixi.js":3,"tween.js":4}],26:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/Checkbox":68,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/NineSlice":75,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],27:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],28:[function(require,module,exports){
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
},{"../../utils/Button":67,"../../utils/Checkbox":68,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/NineSlice":75,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],29:[function(require,module,exports){
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
},{"../../proto/messages/CheckboxMessage":41,"../../utils/Button":67,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../../utils/NineSlice":75,"../app/Settings":6,"../resources/Resources":14,"./RaiseShortcutButton":26,"./SettingsCheckbox":28,"pixi.js":3,"tween.js":4}],30:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":71,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],31:[function(require,module,exports){
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
},{"../utils/EventDispatcher":70,"../utils/FunctionUtil":71,"./messages/ActionMessage":35,"./messages/BetMessage":36,"./messages/BetsToPotMessage":37,"./messages/ButtonClickMessage":38,"./messages/ButtonsMessage":39,"./messages/ChatMessage":40,"./messages/CheckboxMessage":41,"./messages/ClearMessage":42,"./messages/CommunityCardsMessage":43,"./messages/DealerButtonMessage":44,"./messages/DelayMessage":45,"./messages/FadeTableMessage":46,"./messages/FoldCardsMessage":47,"./messages/HandInfoMessage":48,"./messages/InitMessage":49,"./messages/InterfaceStateMessage":50,"./messages/PayOutMessage":51,"./messages/PocketCardsMessage":52,"./messages/PotMessage":53,"./messages/PreTournamentInfoMessage":54,"./messages/PresetButtonClickMessage":55,"./messages/PresetButtonsMessage":56,"./messages/SeatClickMessage":57,"./messages/SeatInfoMessage":58,"./messages/ShowDialogMessage":59,"./messages/StateCompleteMessage":60,"./messages/TableButtonClickMessage":61,"./messages/TableButtonsMessage":62,"./messages/TableInfoMessage":63,"./messages/TestCaseRequestMessage":64,"./messages/TimerMessage":65,"./messages/TournamentResultMessage":66}],32:[function(require,module,exports){
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
		animate: this.animate,
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
},{"./EventDispatcher":70,"./FunctionUtil":71,"pixi.js":3}],68:[function(require,module,exports){
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
},{"./Button":67,"./EventDispatcher":70,"./FunctionUtil":71,"pixi.js":3}],69:[function(require,module,exports){
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
},{"../utils/FunctionUtil":71,"pixi.js":3}],70:[function(require,module,exports){
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

},{}],72:[function(require,module,exports){
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
},{"./FunctionUtil":71,"pixi.js":3}],73:[function(require,module,exports){
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
},{"./EventDispatcher":70,"./FunctionUtil":71,"./Thenable":80}],74:[function(require,module,exports){
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


},{"./EventDispatcher":70,"./FunctionUtil":71,"pixi.js":3}],75:[function(require,module,exports){
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
},{"./FunctionUtil":71,"pixi.js":3}],76:[function(require,module,exports){
"use strict";

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("./FunctionUtil");
var ContentScaler = require("./ContentScaler");
//var FrameTimer = require("./FrameTimer");

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
},{"./ContentScaler":69,"./FunctionUtil":71,"pixi.js":3,"tween.js":4}],77:[function(require,module,exports){
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
},{}],78:[function(require,module,exports){
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
},{"./EventDispatcher":70,"./FunctionUtil":71}],79:[function(require,module,exports){
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

},{"./EventDispatcher":70,"./FunctionUtil":71,"pixi.js":3,"tween.js":4}],80:[function(require,module,exports){
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
},{"./EventDispatcher":70,"./FunctionUtil":71}]},{},[12])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbWxpbmRxdmlzdFxccmVwb1xcbmV0cG9rZXJcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L2luZGV4LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L3NyYy9QaXhpVGV4dElucHV0LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9waXhpLmpzL2Jpbi9waXhpLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy90d2Vlbi5qcy9pbmRleC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9OZXRQb2tlckNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9TZXR0aW5ncy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvSW50ZXJmYWNlQ29udHJvbGxlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlSXRlbS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9UYWJsZUNvbnRyb2xsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC9uZXRwb2tlcmNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9EZWZhdWx0U2tpbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9SZXNvdXJjZXMuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0JpZ0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQnV0dG9uc1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0NhcmRWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9DaGF0Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQ2hpcHNWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EZWFsZXJCdXR0b25WaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EaWFsb2dCdXR0b24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0RpYWxvZ1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0xvYWRpbmdTY3JlZW4uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L05ldFBva2VyQ2xpZW50Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUG90Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUmFpc2VTaG9ydGN1dEJ1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvU2VhdFZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzVmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvVGltZXJWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9Qcm90b0Nvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL2RhdGEvQnV0dG9uRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9DYXJkRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9QcmVzZXRCdXR0b25EYXRhLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRzVG9Qb3RNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0J1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DaGF0TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DbGVhck1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0NvbW11bml0eUNhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVsYXlNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9GYWRlVGFibGVNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9IYW5kSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0luaXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BheU91dE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUG90TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9QcmVzZXRCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZXNldEJ1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0SW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TdGF0ZUNvbXBsZXRlTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVGFibGVCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Rlc3RDYXNlUmVxdWVzdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0NvbnRlbnRTY2FsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0V2ZW50RGlzcGF0Y2hlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRnVuY3Rpb25VdGlsLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9HcmFkaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL01vdXNlT3Zlckdyb3VwLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9OaW5lU2xpY2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BpeGlBcHAuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BvaW50LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9TZXF1ZW5jZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1NsaWRlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvVGhlbmFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFBpeGlUZXh0SW5wdXQgPSByZXF1aXJlKFwiLi9zcmMvUGl4aVRleHRJbnB1dFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGl4aVRleHRJbnB1dDsiLCJpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUZXh0IGlucHV0IGZpZWxkIGZvciBwaXhpLmpzLlxyXG4gKiBBIHNpbXBsZSBleGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgLy8gV2UgbmVlZCBhIGNvbnRhaW5lclxyXG4gKiAgICAgdmFyIGNvbnRhaW5lciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcclxuICpcclxuICogICAgIC8vIFNhbWUgc3R5bGUgb3B0aW9ucyBhcyBQSVhJLlRleHRcclxuICogICAgIHZhciBzdHlsZT17IC4uLiB9O1xyXG4gKlxyXG4gKiAgICAgdmFyIGlucHV0RmllbGQgPSBuZXcgUGl4aVRleHRJbnB1dChcImhlbGxvXCIsc3R5bGUpO1xyXG4gKiAgICAgY29udGFpbmVyLmFkZENoaWxkKGlucHV0RmllbGQpO1xyXG4gKlxyXG4gKiBUaGUgc3R5bGUgZGVmaW5pdGlvbnMgYWNjZXB0ZWQgYnkgdGhlIGNvbnN0cnVjdG9yIGFyZSB0aGUgc2FtZSBhcyB0aG9zZSBhY2NlcHRlZCBieVxyXG4gKiBbUElYSS5UZXh0XShodHRwOi8vd3d3Lmdvb2Rib3lkaWdpdGFsLmNvbS9waXhpanMvZG9jcy9jbGFzc2VzL1RleHQuaHRtbCkuXHJcbiAqIEBjbGFzcyBQaXhpVGV4dElucHV0XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3RleHRdIFRoZSBpbml0aWFsIHRleHQuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbc3R5bGVdIFN0eWxlIGRlZmluaXRpb24sIHNhbWUgYXMgZm9yIFBJWEkuVGV4dFxyXG4gKi9cclxuZnVuY3Rpb24gUGl4aVRleHRJbnB1dCh0ZXh0LCBzdHlsZSkge1xyXG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xyXG5cclxuXHRpZiAoIXRleHQpXHJcblx0XHR0ZXh0ID0gXCJcIjtcclxuXHJcblx0dGV4dCA9IHRleHQudG9TdHJpbmcoKTtcclxuXHJcblx0aWYgKHN0eWxlICYmIHN0eWxlLndvcmRXcmFwKVxyXG5cdFx0dGhyb3cgXCJ3b3JkV3JhcCBpcyBub3Qgc3VwcG9ydGVkIGZvciBpbnB1dCBmaWVsZHNcIjtcclxuXHJcblx0dGhpcy5fdGV4dCA9IHRleHQ7XHJcblxyXG5cdHRoaXMubG9jYWxXaWR0aCA9IDEwMDtcclxuXHR0aGlzLl9iYWNrZ3JvdW5kQ29sb3IgPSAweGZmZmZmZjtcclxuXHR0aGlzLl9jYXJldENvbG9yID0gMHgwMDAwMDA7XHJcblx0dGhpcy5fYmFja2dyb3VuZCA9IHRydWU7XHJcblxyXG5cdHRoaXMuc3R5bGUgPSBzdHlsZTtcclxuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQodGhpcy5fdGV4dCwgc3R5bGUpO1xyXG5cclxuXHR0aGlzLmxvY2FsSGVpZ2h0ID1cclxuXHRcdHRoaXMudGV4dEZpZWxkLmRldGVybWluZUZvbnRIZWlnaHQoJ2ZvbnQ6ICcgKyB0aGlzLnRleHRGaWVsZC5zdHlsZS5mb250ICsgJzsnKSArXHJcblx0XHR0aGlzLnRleHRGaWVsZC5zdHlsZS5zdHJva2VUaGlja25lc3M7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MgPSBuZXcgUElYSS5HcmFwaGljcygpO1xyXG5cdHRoaXMudGV4dEZpZWxkTWFzayA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XHJcblx0dGhpcy5jYXJldCA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XHJcblx0dGhpcy5kcmF3RWxlbWVudHMoKTtcclxuXHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJhY2tncm91bmRHcmFwaGljcyk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZCk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNhcmV0KTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkTWFzayk7XHJcblxyXG5cdHRoaXMuc2Nyb2xsSW5kZXggPSAwO1xyXG5cdHRoaXMuX2NhcmV0SW5kZXggPSAwO1xyXG5cdHRoaXMuY2FyZXRGbGFzaEludGVydmFsID0gbnVsbDtcclxuXHR0aGlzLmJsdXIoKTtcclxuXHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuaW50ZXJhY3RpdmUgPSB0cnVlO1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmJ1dHRvbk1vZGUgPSB0cnVlO1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmRlZmF1bHRDdXJzb3IgPSBcInRleHRcIjtcclxuXHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MubW91c2Vkb3duID0gdGhpcy5vbkJhY2tncm91bmRNb3VzZURvd24uYmluZCh0aGlzKTtcclxuXHR0aGlzLmtleUV2ZW50Q2xvc3VyZSA9IHRoaXMub25LZXlFdmVudC5iaW5kKHRoaXMpO1xyXG5cdHRoaXMud2luZG93Qmx1ckNsb3N1cmUgPSB0aGlzLm9uV2luZG93Qmx1ci5iaW5kKHRoaXMpO1xyXG5cdHRoaXMuZG9jdW1lbnRNb3VzZURvd25DbG9zdXJlID0gdGhpcy5vbkRvY3VtZW50TW91c2VEb3duLmJpbmQodGhpcyk7XHJcblx0dGhpcy5pc0ZvY3VzQ2xpY2sgPSBmYWxzZTtcclxuXHJcblx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblxyXG5cdHRoaXMudGV4dEZpZWxkLm1hc2sgPSB0aGlzLnRleHRGaWVsZE1hc2s7XHJcblxyXG5cdHRoaXMua2V5cHJlc3MgPSBudWxsO1xyXG5cdHRoaXMua2V5ZG93biA9IG51bGw7XHJcblx0dGhpcy5jaGFuZ2UgPSBudWxsO1xyXG59XHJcblxyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSk7XHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGl4aVRleHRJbnB1dDtcclxuXHJcbi8qKlxyXG4gKiBTb21lb25lIGNsaWNrZWQuXHJcbiAqIEBtZXRob2Qgb25CYWNrZ3JvdW5kTW91c2VEb3duXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbkJhY2tncm91bmRNb3VzZURvd24gPSBmdW5jdGlvbihlKSB7XHJcblx0dmFyIHggPSBlLmdldExvY2FsUG9zaXRpb24odGhpcykueDtcclxuXHR0aGlzLl9jYXJldEluZGV4ID0gdGhpcy5nZXRDYXJldEluZGV4QnlDb29yZCh4KTtcclxuXHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHJcblx0dGhpcy5mb2N1cygpO1xyXG5cclxuXHR0aGlzLmlzRm9jdXNDbGljayA9IHRydWU7XHJcblx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0c2NvcGUuaXNGb2N1c0NsaWNrID0gZmFsc2U7XHJcblx0fSwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGb2N1cyB0aGlzIGlucHV0IGZpZWxkLlxyXG4gKiBAbWV0aG9kIGZvY3VzXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuYmx1cigpO1xyXG5cclxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XHJcblx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIHRoaXMua2V5RXZlbnRDbG9zdXJlKTtcclxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMuZG9jdW1lbnRNb3VzZURvd25DbG9zdXJlKTtcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgdGhpcy53aW5kb3dCbHVyQ2xvc3VyZSk7XHJcblxyXG5cdHRoaXMuc2hvd0NhcmV0KCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUga2V5IGV2ZW50LlxyXG4gKiBAbWV0aG9kIG9uS2V5RXZlbnRcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uS2V5RXZlbnQgPSBmdW5jdGlvbihlKSB7XHJcblx0Lypjb25zb2xlLmxvZyhcImtleSBldmVudFwiKTtcclxuXHRjb25zb2xlLmxvZyhlKTsqL1xyXG5cclxuXHRpZiAoZS50eXBlID09IFwia2V5cHJlc3NcIikge1xyXG5cdFx0aWYgKGUuY2hhckNvZGUgPCAzMilcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuX3RleHQgPVxyXG5cdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZygwLCB0aGlzLl9jYXJldEluZGV4KSArXHJcblx0XHRcdFN0cmluZy5mcm9tQ2hhckNvZGUoZS5jaGFyQ29kZSkgK1xyXG5cdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLl9jYXJldEluZGV4KTtcclxuXHJcblx0XHR0aGlzLl9jYXJldEluZGV4Kys7XHJcblx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHR0aGlzLnNob3dDYXJldCgpO1xyXG5cdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0XHR0aGlzLnRyaWdnZXIodGhpcy5rZXlwcmVzcywgZSk7XHJcblx0XHR0aGlzLnRyaWdnZXIodGhpcy5jaGFuZ2UpO1xyXG5cdH1cclxuXHJcblx0aWYgKGUudHlwZSA9PSBcImtleWRvd25cIikge1xyXG5cdFx0c3dpdGNoIChlLmtleUNvZGUpIHtcclxuXHRcdFx0Y2FzZSA4OlxyXG5cdFx0XHRcdGlmICh0aGlzLl9jYXJldEluZGV4ID4gMCkge1xyXG5cdFx0XHRcdFx0dGhpcy5fdGV4dCA9XHJcblx0XHRcdFx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXggLSAxKSArXHJcblx0XHRcdFx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKHRoaXMuX2NhcmV0SW5kZXgpO1xyXG5cclxuXHRcdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXgtLTtcclxuXHRcdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XHJcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdHRoaXMudHJpZ2dlcih0aGlzLmNoYW5nZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIDQ2OlxyXG5cdFx0XHRcdHRoaXMuX3RleHQgPVxyXG5cdFx0XHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcoMCwgdGhpcy5fY2FyZXRJbmRleCkgK1xyXG5cdFx0XHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5fY2FyZXRJbmRleCArIDEpO1xyXG5cclxuXHRcdFx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyKHRoaXMuY2hhbmdlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgMzk6XHJcblx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleCsrO1xyXG5cdFx0XHRcdGlmICh0aGlzLl9jYXJldEluZGV4ID4gdGhpcy5fdGV4dC5sZW5ndGgpXHJcblx0XHRcdFx0XHR0aGlzLl9jYXJldEluZGV4ID0gdGhpcy5fdGV4dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnNob3dDYXJldCgpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAzNzpcclxuXHRcdFx0XHR0aGlzLl9jYXJldEluZGV4LS07XHJcblx0XHRcdFx0aWYgKHRoaXMuX2NhcmV0SW5kZXggPCAwKVxyXG5cdFx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleCA9IDA7XHJcblxyXG5cdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnNob3dDYXJldCgpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudHJpZ2dlcih0aGlzLmtleWRvd24sIGUpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEVuc3VyZSB0aGUgY2FyZXQgaXMgbm90IG91dHNpZGUgdGhlIGJvdW5kcy5cclxuICogQG1ldGhvZCBlbnN1cmVDYXJldEluVmlld1xyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZW5zdXJlQ2FyZXRJblZpZXcgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHJcblx0d2hpbGUgKHRoaXMuY2FyZXQucG9zaXRpb24ueCA+PSB0aGlzLmxvY2FsV2lkdGggLSAxKSB7XHJcblx0XHR0aGlzLnNjcm9sbEluZGV4Kys7XHJcblx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHR9XHJcblxyXG5cdHdoaWxlICh0aGlzLmNhcmV0LnBvc2l0aW9uLnggPCAwKSB7XHJcblx0XHR0aGlzLnNjcm9sbEluZGV4IC09IDI7XHJcblx0XHRpZiAodGhpcy5zY3JvbGxJbmRleCA8IDApXHJcblx0XHRcdHRoaXMuc2Nyb2xsSW5kZXggPSAwO1xyXG5cdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQmx1ciBvdXJzZWxmLlxyXG4gKiBAbWV0aG9kIGJsdXJcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmJsdXIgPSBmdW5jdGlvbigpIHtcclxuXHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XHJcblx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIHRoaXMua2V5RXZlbnRDbG9zdXJlKTtcclxuXHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMuZG9jdW1lbnRNb3VzZURvd25DbG9zdXJlKTtcclxuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgdGhpcy53aW5kb3dCbHVyQ2xvc3VyZSk7XHJcblxyXG5cdHRoaXMuaGlkZUNhcmV0KCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXaW5kb3cgYmx1ci5cclxuICogQG1ldGhvZCBvbkRvY3VtZW50TW91c2VEb3duXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbkRvY3VtZW50TW91c2VEb3duID0gZnVuY3Rpb24oKSB7XHJcblx0aWYgKCF0aGlzLmlzRm9jdXNDbGljaylcclxuXHRcdHRoaXMuYmx1cigpO1xyXG59XHJcblxyXG4vKipcclxuICogV2luZG93IGJsdXIuXHJcbiAqIEBtZXRob2Qgb25XaW5kb3dCbHVyXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbldpbmRvd0JsdXIgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmJsdXIoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBjYXJldCBQb3NpdGlvbi5cclxuICogQG1ldGhvZCB1cGRhdGVDYXJldFBvc2l0aW9uXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS51cGRhdGVDYXJldFBvc2l0aW9uID0gZnVuY3Rpb24oKSB7XHJcblx0aWYgKHRoaXMuX2NhcmV0SW5kZXggPCB0aGlzLnNjcm9sbEluZGV4KSB7XHJcblx0XHR0aGlzLmNhcmV0LnBvc2l0aW9uLnggPSAtMTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdHZhciBzdWIgPSB0aGlzLl90ZXh0LnN1YnN0cmluZygwLCB0aGlzLl9jYXJldEluZGV4KS5zdWJzdHJpbmcodGhpcy5zY3JvbGxJbmRleCk7XHJcblx0dGhpcy5jYXJldC5wb3NpdGlvbi54ID0gdGhpcy50ZXh0RmllbGQuY29udGV4dC5tZWFzdXJlVGV4dChzdWIpLndpZHRoO1xyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIHRleHQuXHJcbiAqIEBtZXRob2QgdXBkYXRlVGV4dFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUudXBkYXRlVGV4dCA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudGV4dEZpZWxkLnNldFRleHQodGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5zY3JvbGxJbmRleCkpO1xyXG59XHJcblxyXG4vKipcclxuICogRHJhdyB0aGUgYmFja2dyb3VuZCBhbmQgY2FyZXQuXHJcbiAqIEBtZXRob2QgZHJhd0VsZW1lbnRzXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5kcmF3RWxlbWVudHMgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5jbGVhcigpO1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmJlZ2luRmlsbCh0aGlzLl9iYWNrZ3JvdW5kQ29sb3IpO1xyXG5cclxuXHRpZiAodGhpcy5fYmFja2dyb3VuZClcclxuXHRcdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmRyYXdSZWN0KDAsIDAsIHRoaXMubG9jYWxXaWR0aCwgdGhpcy5sb2NhbEhlaWdodCk7XHJcblxyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmVuZEZpbGwoKTtcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5oaXRBcmVhID0gbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIHRoaXMubG9jYWxXaWR0aCwgdGhpcy5sb2NhbEhlaWdodCk7XHJcblxyXG5cdHRoaXMudGV4dEZpZWxkTWFzay5jbGVhcigpO1xyXG5cdHRoaXMudGV4dEZpZWxkTWFzay5iZWdpbkZpbGwodGhpcy5fYmFja2dyb3VuZENvbG9yKTtcclxuXHR0aGlzLnRleHRGaWVsZE1hc2suZHJhd1JlY3QoMCwgMCwgdGhpcy5sb2NhbFdpZHRoLCB0aGlzLmxvY2FsSGVpZ2h0KTtcclxuXHR0aGlzLnRleHRGaWVsZE1hc2suZW5kRmlsbCgpO1xyXG5cclxuXHR0aGlzLmNhcmV0LmNsZWFyKCk7XHJcblx0dGhpcy5jYXJldC5iZWdpbkZpbGwodGhpcy5fY2FyZXRDb2xvcik7XHJcblx0dGhpcy5jYXJldC5kcmF3UmVjdCgxLCAxLCAxLCB0aGlzLmxvY2FsSGVpZ2h0IC0gMik7XHJcblx0dGhpcy5jYXJldC5lbmRGaWxsKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaG93IGNhcmV0LlxyXG4gKiBAbWV0aG9kIHNob3dDYXJldFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuc2hvd0NhcmV0ID0gZnVuY3Rpb24oKSB7XHJcblx0aWYgKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKSB7XHJcblx0XHRjbGVhckludGVydmFsKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKTtcclxuXHRcdHRoaXMuY2FyZXRGbGFzaEludGVydmFsID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHRoaXMuY2FyZXQudmlzaWJsZSA9IHRydWU7XHJcblx0dGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLm9uQ2FyZXRGbGFzaEludGVydmFsLmJpbmQodGhpcyksIDUwMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIaWRlIGNhcmV0LlxyXG4gKiBAbWV0aG9kIGhpZGVDYXJldFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuaGlkZUNhcmV0ID0gZnVuY3Rpb24oKSB7XHJcblx0aWYgKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKSB7XHJcblx0XHRjbGVhckludGVydmFsKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKTtcclxuXHRcdHRoaXMuY2FyZXRGbGFzaEludGVydmFsID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHRoaXMuY2FyZXQudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FyZXQgZmxhc2ggaW50ZXJ2YWwuXHJcbiAqIEBtZXRob2Qgb25DYXJldEZsYXNoSW50ZXJ2YWxcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uQ2FyZXRGbGFzaEludGVydmFsID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5jYXJldC52aXNpYmxlID0gIXRoaXMuY2FyZXQudmlzaWJsZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1hcCBwb3NpdGlvbiB0byBjYXJldCBpbmRleC5cclxuICogQG1ldGhvZCBnZXRDYXJldEluZGV4QnlDb29yZFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZ2V0Q2FyZXRJbmRleEJ5Q29vcmQgPSBmdW5jdGlvbih4KSB7XHJcblx0dmFyIHNtYWxsZXN0ID0gMTAwMDA7XHJcblx0dmFyIGNhbmQgPSAwO1xyXG5cdHZhciB2aXNpYmxlID0gdGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5zY3JvbGxJbmRleCk7XHJcblxyXG5cdGZvciAoaSA9IDA7IGkgPCB2aXNpYmxlLmxlbmd0aCArIDE7IGkrKykge1xyXG5cdFx0dmFyIHN1YiA9IHZpc2libGUuc3Vic3RyaW5nKDAsIGkpO1xyXG5cdFx0dmFyIHcgPSB0aGlzLnRleHRGaWVsZC5jb250ZXh0Lm1lYXN1cmVUZXh0KHN1Yikud2lkdGg7XHJcblxyXG5cdFx0aWYgKE1hdGguYWJzKHcgLSB4KSA8IHNtYWxsZXN0KSB7XHJcblx0XHRcdHNtYWxsZXN0ID0gTWF0aC5hYnModyAtIHgpO1xyXG5cdFx0XHRjYW5kID0gaTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB0aGlzLnNjcm9sbEluZGV4ICsgY2FuZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSB3aWR0aCBvZiB0aGUgUGl4aVRleHRJbnB1dC4gVGhpcyBpcyBvdmVycmlkZGVuIHRvIGhhdmUgYSBzbGlnaHRseVxyXG4gKiBkaWZmZXJlbnQgYmVoYWl2b3VyIHRoYW4gdGhlIG90aGVyIERpc3BsYXlPYmplY3RzLiBTZXR0aW5nIHRoZVxyXG4gKiB3aWR0aCBvZiB0aGUgUGl4aVRleHRJbnB1dCBkb2VzIG5vdCBjaGFuZ2UgdGhlIHNjYWxlLCBidXQgaXQgcmF0aGVyXHJcbiAqIG1ha2VzIHRoZSBmaWVsZCBsYXJnZXIuIElmIHlvdSBhY3R1YWxseSB3YW50IHRvIHNjYWxlIGl0LFxyXG4gKiB1c2UgdGhlIHNjYWxlIHByb3BlcnR5LlxyXG4gKiBAcHJvcGVydHkgd2lkdGhcclxuICogQHR5cGUgTnVtYmVyXHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwid2lkdGhcIiwge1xyXG5cdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5zY2FsZS54ICogdGhpcy5nZXRMb2NhbEJvdW5kcygpLndpZHRoO1xyXG5cdH0sXHJcblxyXG5cdHNldDogZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5sb2NhbFdpZHRoID0gdjtcclxuXHRcdHRoaXMuZHJhd0VsZW1lbnRzKCk7XHJcblx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XHJcblx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFRoZSB0ZXh0IGluIHRoZSBpbnB1dCBmaWVsZC4gU2V0dGluZyB3aWxsIGhhdmUgdGhlIGltcGxpY2l0IGZ1bmN0aW9uIG9mIHJlc2V0dGluZyB0aGUgc2Nyb2xsXHJcbiAqIG9mIHRoZSBpbnB1dCBmaWVsZCBhbmQgcmVtb3ZpbmcgZm9jdXMuXHJcbiAqIEBwcm9wZXJ0eSB0ZXh0XHJcbiAqIEB0eXBlIFN0cmluZ1xyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcInRleHRcIiwge1xyXG5cdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdGV4dDtcclxuXHR9LFxyXG5cclxuXHRzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuXHRcdHRoaXMuX3RleHQgPSB2LnRvU3RyaW5nKCk7XHJcblx0XHR0aGlzLnNjcm9sbEluZGV4ID0gMDtcclxuXHRcdHRoaXMuY2FyZXRJbmRleCA9IDA7XHJcblx0XHR0aGlzLmJsdXIoKTtcclxuXHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogVGhlIGNvbG9yIG9mIHRoZSBiYWNrZ3JvdW5kIGZvciB0aGUgaW5wdXQgZmllbGQuXHJcbiAqIFRoaXMgbmVlZHMgdG8gYmUgc3BlY2lmaWVkIGFzIGFuIGludGVnZXIsIG5vdCB1c2luZyBIVE1MXHJcbiAqIG5vdGF0aW9uLCBlLmcuIGZvciByZWQgYmFja2dyb3VuZDpcclxuICpcclxuICogICAgIG15SW5wdXRUZXh0LmJhY2tncm91bmRDb2xvciA9IDB4ZmYwMDAwO1xyXG4gKlxyXG4gKiBJbiBvcmRlciBmb3IgdGhlIGJhY2tncm91bmQgdG8gYmUgZHJhd24sIHRoZSBgYmFja2dyb3VuZGBcclxuICogcHJvcGVydHkgbmVlZHMgdG8gYmUgdHJ1ZS4gSWYgbm90LCB0aGlzIHByb3BlcnR5IHdpbGwgaGF2ZVxyXG4gKiBubyBlZmZlY3QuXHJcbiAqIEBwcm9wZXJ0eSBiYWNrZ3JvdW5kQ29sb3JcclxuICogQHR5cGUgSW50ZWdlclxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcImJhY2tncm91bmRDb2xvclwiLCB7XHJcblx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kQ29sb3I7XHJcblx0fSxcclxuXHJcblx0c2V0OiBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLl9iYWNrZ3JvdW5kQ29sb3IgPSB2O1xyXG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBjb2xvciBvZiB0aGUgY2FyZXQuXHJcbiAqIEBwcm9wZXJ0eSBjYXJldENvbG9yXHJcbiAqIEB0eXBlIEludGVnZXJcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJjYXJldENvbG9yXCIsIHtcclxuXHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NhcmV0Q29sb3I7XHJcblx0fSxcclxuXHJcblx0c2V0OiBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLl9jYXJldENvbG9yID0gdjtcclxuXHRcdHRoaXMuZHJhd0VsZW1lbnRzKCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBiYWNrZ3JvdW5kIHNob3VsZCBiZSBkcmF3biBiZWhpbmQgdGhlIHRleHQuXHJcbiAqIFRoZSBjb2xvciBvZiB0aGUgYmFja2dyb3VuZCBpcyBzcGVjaWZpZWQgdXNpbmcgdGhlIGJhY2tncm91bmRDb2xvclxyXG4gKiBwcm9wZXJ0eS5cclxuICogQHByb3BlcnR5IGJhY2tncm91bmRcclxuICogQHR5cGUgQm9vbGVhblxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcImJhY2tncm91bmRcIiwge1xyXG5cdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fYmFja2dyb3VuZDtcclxuXHR9LFxyXG5cclxuXHRzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuXHRcdHRoaXMuX2JhY2tncm91bmQgPSB2O1xyXG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFNldCB0ZXh0LlxyXG4gKiBAbWV0aG9kIHNldFRleHRcclxuICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIG5ldyB0ZXh0LlxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHYpIHtcclxuXHR0aGlzLnRleHQgPSB2O1xyXG59XHJcblxyXG4vKipcclxuICogVHJpZ2dlciBhbiBldmVudCBmdW5jdGlvbiBpZiBpdCBleGlzdHMuXHJcbiAqIEBtZXRob2QgdHJpZ2dlclxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGZuLCBlKSB7XHJcblx0aWYgKGZuKVxyXG5cdFx0Zm4oZSk7XHJcbn1cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gUGl4aVRleHRJbnB1dDtcclxufSIsIi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBwaXhpLmpzIC0gdjEuNi4wXHJcbiAqIENvcHlyaWdodCAoYykgMjAxMi0yMDE0LCBNYXQgR3JvdmVzXHJcbiAqIGh0dHA6Ly9nb29kYm95ZGlnaXRhbC5jb20vXHJcbiAqXHJcbiAqIENvbXBpbGVkOiAyMDE0LTA3LTE4XHJcbiAqXHJcbiAqIHBpeGkuanMgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxyXG4gKiBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxyXG4gKi9cclxuKGZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxiPWJ8fHt9O2IuV0VCR0xfUkVOREVSRVI9MCxiLkNBTlZBU19SRU5ERVJFUj0xLGIuVkVSU0lPTj1cInYxLjYuMVwiLGIuYmxlbmRNb2Rlcz17Tk9STUFMOjAsQUREOjEsTVVMVElQTFk6MixTQ1JFRU46MyxPVkVSTEFZOjQsREFSS0VOOjUsTElHSFRFTjo2LENPTE9SX0RPREdFOjcsQ09MT1JfQlVSTjo4LEhBUkRfTElHSFQ6OSxTT0ZUX0xJR0hUOjEwLERJRkZFUkVOQ0U6MTEsRVhDTFVTSU9OOjEyLEhVRToxMyxTQVRVUkFUSU9OOjE0LENPTE9SOjE1LExVTUlOT1NJVFk6MTZ9LGIuc2NhbGVNb2Rlcz17REVGQVVMVDowLExJTkVBUjowLE5FQVJFU1Q6MX0sYi5fVUlEPTAsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZsb2F0MzJBcnJheT8oYi5GbG9hdDMyQXJyYXk9RmxvYXQzMkFycmF5LGIuVWludDE2QXJyYXk9VWludDE2QXJyYXkpOihiLkZsb2F0MzJBcnJheT1BcnJheSxiLlVpbnQxNkFycmF5PUFycmF5KSxiLklOVEVSQUNUSU9OX0ZSRVFVRU5DWT0zMCxiLkFVVE9fUFJFVkVOVF9ERUZBVUxUPSEwLGIuUkFEX1RPX0RFRz0xODAvTWF0aC5QSSxiLkRFR19UT19SQUQ9TWF0aC5QSS8xODAsYi5kb250U2F5SGVsbG89ITEsYi5zYXlIZWxsbz1mdW5jdGlvbihhKXtpZighYi5kb250U2F5SGVsbG8pe2lmKG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKFwiY2hyb21lXCIpPi0xKXt2YXIgYz1bXCIlYyAlYyAlYyBQaXhpLmpzIFwiK2IuVkVSU0lPTitcIiAtIFwiK2ErXCIgICVjICAlYyAgaHR0cDovL3d3dy5waXhpanMuY29tLyAgJWMgJWMg4pmlJWPimaUlY+KZpSBcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImNvbG9yOiAjZmY2NmE1OyBiYWNrZ3JvdW5kOiAjMDMwMzA3O1wiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiYmFja2dyb3VuZDogI2ZmYzNkY1wiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiY29sb3I6ICNmZjI0MjQ7IGJhY2tncm91bmQ6ICNmZmZcIixcImNvbG9yOiAjZmYyNDI0OyBiYWNrZ3JvdW5kOiAjZmZmXCIsXCJjb2xvcjogI2ZmMjQyNDsgYmFja2dyb3VuZDogI2ZmZlwiXTtjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLGMpfWVsc2Ugd2luZG93LmNvbnNvbGUmJmNvbnNvbGUubG9nKFwiUGl4aS5qcyBcIitiLlZFUlNJT04rXCIgLSBodHRwOi8vd3d3LnBpeGlqcy5jb20vXCIpO2IuZG9udFNheUhlbGxvPSEwfX0sYi5Qb2ludD1mdW5jdGlvbihhLGIpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwwfSxiLlBvaW50LnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5Qb2ludCh0aGlzLngsdGhpcy55KX0sYi5Qb2ludC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKGEsYil7dGhpcy54PWF8fDAsdGhpcy55PWJ8fCgwIT09Yj90aGlzLng6MCl9LGIuUG9pbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUG9pbnQsYi5SZWN0YW5nbGU9ZnVuY3Rpb24oYSxiLGMsZCl7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDAsdGhpcy53aWR0aD1jfHwwLHRoaXMuaGVpZ2h0PWR8fDB9LGIuUmVjdGFuZ2xlLnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5SZWN0YW5nbGUodGhpcy54LHRoaXMueSx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5SZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7aWYodGhpcy53aWR0aDw9MHx8dGhpcy5oZWlnaHQ8PTApcmV0dXJuITE7dmFyIGM9dGhpcy54O2lmKGE+PWMmJmE8PWMrdGhpcy53aWR0aCl7dmFyIGQ9dGhpcy55O2lmKGI+PWQmJmI8PWQrdGhpcy5oZWlnaHQpcmV0dXJuITB9cmV0dXJuITF9LGIuUmVjdGFuZ2xlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlJlY3RhbmdsZSxiLkVtcHR5UmVjdGFuZ2xlPW5ldyBiLlJlY3RhbmdsZSgwLDAsMCwwKSxiLlBvbHlnb249ZnVuY3Rpb24oYSl7aWYoYSBpbnN0YW5jZW9mIEFycmF5fHwoYT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSxcIm51bWJlclwiPT10eXBlb2YgYVswXSl7Zm9yKHZhciBjPVtdLGQ9MCxlPWEubGVuZ3RoO2U+ZDtkKz0yKWMucHVzaChuZXcgYi5Qb2ludChhW2RdLGFbZCsxXSkpO2E9Y310aGlzLnBvaW50cz1hfSxiLlBvbHlnb24ucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPVtdLGM9MDtjPHRoaXMucG9pbnRzLmxlbmd0aDtjKyspYS5wdXNoKHRoaXMucG9pbnRzW2NdLmNsb25lKCkpO3JldHVybiBuZXcgYi5Qb2x5Z29uKGEpfSxiLlBvbHlnb24ucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPSExLGQ9MCxlPXRoaXMucG9pbnRzLmxlbmd0aC0xO2Q8dGhpcy5wb2ludHMubGVuZ3RoO2U9ZCsrKXt2YXIgZj10aGlzLnBvaW50c1tkXS54LGc9dGhpcy5wb2ludHNbZF0ueSxoPXRoaXMucG9pbnRzW2VdLngsaT10aGlzLnBvaW50c1tlXS55LGo9Zz5iIT1pPmImJihoLWYpKihiLWcpLyhpLWcpK2Y+YTtqJiYoYz0hYyl9cmV0dXJuIGN9LGIuUG9seWdvbi5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Qb2x5Z29uLGIuQ2lyY2xlPWZ1bmN0aW9uKGEsYixjKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8MCx0aGlzLnJhZGl1cz1jfHwwfSxiLkNpcmNsZS5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuQ2lyY2xlKHRoaXMueCx0aGlzLnksdGhpcy5yYWRpdXMpfSxiLkNpcmNsZS5wcm90b3R5cGUuY29udGFpbnM9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLnJhZGl1czw9MClyZXR1cm4hMTt2YXIgYz10aGlzLngtYSxkPXRoaXMueS1iLGU9dGhpcy5yYWRpdXMqdGhpcy5yYWRpdXM7cmV0dXJuIGMqPWMsZCo9ZCxlPj1jK2R9LGIuQ2lyY2xlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUmVjdGFuZ2xlKHRoaXMueC10aGlzLnJhZGl1cyx0aGlzLnktdGhpcy5yYWRpdXMsdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuQ2lyY2xlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkNpcmNsZSxiLkVsbGlwc2U9ZnVuY3Rpb24oYSxiLGMsZCl7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDAsdGhpcy53aWR0aD1jfHwwLHRoaXMuaGVpZ2h0PWR8fDB9LGIuRWxsaXBzZS5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuRWxsaXBzZSh0aGlzLngsdGhpcy55LHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLkVsbGlwc2UucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7aWYodGhpcy53aWR0aDw9MHx8dGhpcy5oZWlnaHQ8PTApcmV0dXJuITE7dmFyIGM9KGEtdGhpcy54KS90aGlzLndpZHRoLGQ9KGItdGhpcy55KS90aGlzLmhlaWdodDtyZXR1cm4gYyo9YyxkKj1kLDE+PWMrZH0sYi5FbGxpcHNlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUmVjdGFuZ2xlKHRoaXMueC10aGlzLndpZHRoLHRoaXMueS10aGlzLmhlaWdodCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5FbGxpcHNlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkVsbGlwc2UsYi5NYXRyaXg9ZnVuY3Rpb24oKXt0aGlzLmE9MSx0aGlzLmI9MCx0aGlzLmM9MCx0aGlzLmQ9MSx0aGlzLnR4PTAsdGhpcy50eT0wfSxiLk1hdHJpeC5wcm90b3R5cGUuZnJvbUFycmF5PWZ1bmN0aW9uKGEpe3RoaXMuYT1hWzBdLHRoaXMuYj1hWzFdLHRoaXMuYz1hWzNdLHRoaXMuZD1hWzRdLHRoaXMudHg9YVsyXSx0aGlzLnR5PWFbNV19LGIuTWF0cml4LnByb3RvdHlwZS50b0FycmF5PWZ1bmN0aW9uKGEpe3RoaXMuYXJyYXl8fCh0aGlzLmFycmF5PW5ldyBGbG9hdDMyQXJyYXkoOSkpO3ZhciBiPXRoaXMuYXJyYXk7cmV0dXJuIGE/KGJbMF09dGhpcy5hLGJbMV09dGhpcy5jLGJbMl09MCxiWzNdPXRoaXMuYixiWzRdPXRoaXMuZCxiWzVdPTAsYls2XT10aGlzLnR4LGJbN109dGhpcy50eSxiWzhdPTEpOihiWzBdPXRoaXMuYSxiWzFdPXRoaXMuYixiWzJdPXRoaXMudHgsYlszXT10aGlzLmMsYls0XT10aGlzLmQsYls1XT10aGlzLnR5LGJbNl09MCxiWzddPTAsYls4XT0xKSxifSxiLmlkZW50aXR5TWF0cml4PW5ldyBiLk1hdHJpeCxiLmRldGVybWluZU1hdHJpeEFycmF5VHlwZT1mdW5jdGlvbigpe3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBGbG9hdDMyQXJyYXk/RmxvYXQzMkFycmF5OkFycmF5fSxiLk1hdHJpeDI9Yi5kZXRlcm1pbmVNYXRyaXhBcnJheVR5cGUoKSxiLkRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oKXt0aGlzLnBvc2l0aW9uPW5ldyBiLlBvaW50LHRoaXMuc2NhbGU9bmV3IGIuUG9pbnQoMSwxKSx0aGlzLnBpdm90PW5ldyBiLlBvaW50KDAsMCksdGhpcy5yb3RhdGlvbj0wLHRoaXMuYWxwaGE9MSx0aGlzLnZpc2libGU9ITAsdGhpcy5oaXRBcmVhPW51bGwsdGhpcy5idXR0b25Nb2RlPSExLHRoaXMucmVuZGVyYWJsZT0hMSx0aGlzLnBhcmVudD1udWxsLHRoaXMuc3RhZ2U9bnVsbCx0aGlzLndvcmxkQWxwaGE9MSx0aGlzLl9pbnRlcmFjdGl2ZT0hMSx0aGlzLmRlZmF1bHRDdXJzb3I9XCJwb2ludGVyXCIsdGhpcy53b3JsZFRyYW5zZm9ybT1uZXcgYi5NYXRyaXgsdGhpcy5jb2xvcj1bXSx0aGlzLmR5bmFtaWM9ITAsdGhpcy5fc3I9MCx0aGlzLl9jcj0xLHRoaXMuZmlsdGVyQXJlYT1udWxsLHRoaXMuX2JvdW5kcz1uZXcgYi5SZWN0YW5nbGUoMCwwLDEsMSksdGhpcy5fY3VycmVudEJvdW5kcz1udWxsLHRoaXMuX21hc2s9bnVsbCx0aGlzLl9jYWNoZUFzQml0bWFwPSExLHRoaXMuX2NhY2hlSXNEaXJ0eT0hMX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRpc3BsYXlPYmplY3QsYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5zZXRJbnRlcmFjdGl2ZT1mdW5jdGlvbihhKXt0aGlzLmludGVyYWN0aXZlPWF9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwiaW50ZXJhY3RpdmVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2ludGVyYWN0aXZlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5faW50ZXJhY3RpdmU9YSx0aGlzLnN0YWdlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCl9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJ3b3JsZFZpc2libGVcIix7Z2V0OmZ1bmN0aW9uKCl7dmFyIGE9dGhpcztkb3tpZighYS52aXNpYmxlKXJldHVybiExO2E9YS5wYXJlbnR9d2hpbGUoYSk7cmV0dXJuITB9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJtYXNrXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXNrfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fbWFzayYmKHRoaXMuX21hc2suaXNNYXNrPSExKSx0aGlzLl9tYXNrPWEsdGhpcy5fbWFzayYmKHRoaXMuX21hc2suaXNNYXNrPSEwKX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcImZpbHRlcnNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2ZpbHRlcnN9LHNldDpmdW5jdGlvbihhKXtpZihhKXtmb3IodmFyIGI9W10sYz0wO2M8YS5sZW5ndGg7YysrKWZvcih2YXIgZD1hW2NdLnBhc3NlcyxlPTA7ZTxkLmxlbmd0aDtlKyspYi5wdXNoKGRbZV0pO3RoaXMuX2ZpbHRlckJsb2NrPXt0YXJnZXQ6dGhpcyxmaWx0ZXJQYXNzZXM6Yn19dGhpcy5fZmlsdGVycz1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwiY2FjaGVBc0JpdG1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY2FjaGVBc0JpdG1hcH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2NhY2hlQXNCaXRtYXAhPT1hJiYoYT90aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpOnRoaXMuX2Rlc3Ryb3lDYWNoZWRTcHJpdGUoKSx0aGlzLl9jYWNoZUFzQml0bWFwPWEpfX0pLGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5yb3RhdGlvbiE9PXRoaXMucm90YXRpb25DYWNoZSYmKHRoaXMucm90YXRpb25DYWNoZT10aGlzLnJvdGF0aW9uLHRoaXMuX3NyPU1hdGguc2luKHRoaXMucm90YXRpb24pLHRoaXMuX2NyPU1hdGguY29zKHRoaXMucm90YXRpb24pKTt2YXIgYT10aGlzLnBhcmVudC53b3JsZFRyYW5zZm9ybSxiPXRoaXMud29ybGRUcmFuc2Zvcm0sYz10aGlzLnBpdm90LngsZD10aGlzLnBpdm90LnksZT10aGlzLl9jcip0aGlzLnNjYWxlLngsZj0tdGhpcy5fc3IqdGhpcy5zY2FsZS55LGc9dGhpcy5fc3IqdGhpcy5zY2FsZS54LGg9dGhpcy5fY3IqdGhpcy5zY2FsZS55LGk9dGhpcy5wb3NpdGlvbi54LWUqYy1kKmYsaj10aGlzLnBvc2l0aW9uLnktaCpkLWMqZyxrPWEuYSxsPWEuYixtPWEuYyxuPWEuZDtiLmE9ayplK2wqZyxiLmI9aypmK2wqaCxiLnR4PWsqaStsKmorYS50eCxiLmM9bSplK24qZyxiLmQ9bSpmK24qaCxiLnR5PW0qaStuKmorYS50eSx0aGlzLndvcmxkQWxwaGE9dGhpcy5hbHBoYSp0aGlzLnBhcmVudC53b3JsZEFscGhhfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbihhKXtyZXR1cm4gYT1hLGIuRW1wdHlSZWN0YW5nbGV9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuZ2V0TG9jYWxCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXRCb3VuZHMoYi5pZGVudGl0eU1hdHJpeCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuc2V0U3RhZ2VSZWZlcmVuY2U9ZnVuY3Rpb24oYSl7dGhpcy5zdGFnZT1hLHRoaXMuX2ludGVyYWN0aXZlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuZ2VuZXJhdGVUZXh0dXJlPWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKSxkPW5ldyBiLlJlbmRlclRleHR1cmUoMHxjLndpZHRoLDB8Yy5oZWlnaHQsYSk7cmV0dXJuIGQucmVuZGVyKHRoaXMsbmV3IGIuUG9pbnQoLWMueCwtYy55KSksZH0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVDYWNoZT1mdW5jdGlvbigpe3RoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX3JlbmRlckNhY2hlZFNwcml0ZT1mdW5jdGlvbihhKXt0aGlzLl9jYWNoZWRTcHJpdGUud29ybGRBbHBoYT10aGlzLndvcmxkQWxwaGEsYS5nbD9iLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMLmNhbGwodGhpcy5fY2FjaGVkU3ByaXRlLGEpOmIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzLmNhbGwodGhpcy5fY2FjaGVkU3ByaXRlLGEpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3RoaXMuX2NhY2hlQXNCaXRtYXA9ITE7dmFyIGE9dGhpcy5nZXRMb2NhbEJvdW5kcygpO2lmKHRoaXMuX2NhY2hlZFNwcml0ZSl0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5yZXNpemUoMHxhLndpZHRoLDB8YS5oZWlnaHQpO2Vsc2V7dmFyIGM9bmV3IGIuUmVuZGVyVGV4dHVyZSgwfGEud2lkdGgsMHxhLmhlaWdodCk7dGhpcy5fY2FjaGVkU3ByaXRlPW5ldyBiLlNwcml0ZShjKSx0aGlzLl9jYWNoZWRTcHJpdGUud29ybGRUcmFuc2Zvcm09dGhpcy53b3JsZFRyYW5zZm9ybX12YXIgZD10aGlzLl9maWx0ZXJzO3RoaXMuX2ZpbHRlcnM9bnVsbCx0aGlzLl9jYWNoZWRTcHJpdGUuZmlsdGVycz1kLHRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLnJlbmRlcih0aGlzLG5ldyBiLlBvaW50KC1hLngsLWEueSkpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueD0tKGEueC9hLndpZHRoKSx0aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLnk9LShhLnkvYS5oZWlnaHQpLHRoaXMuX2ZpbHRlcnM9ZCx0aGlzLl9jYWNoZUFzQml0bWFwPSEwfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9kZXN0cm95Q2FjaGVkU3ByaXRlPWZ1bmN0aW9uKCl7dGhpcy5fY2FjaGVkU3ByaXRlJiYodGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUuZGVzdHJveSghMCksdGhpcy5fY2FjaGVkU3ByaXRlPW51bGwpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXthPWF9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXthPWF9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwieFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wb3NpdGlvbi54fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5wb3NpdGlvbi54PWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJ5XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnBvc2l0aW9uLnl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnBvc2l0aW9uLnk9YX19KSxiLkRpc3BsYXlPYmplY3RDb250YWluZXI9ZnVuY3Rpb24oKXtiLkRpc3BsYXlPYmplY3QuY2FsbCh0aGlzKSx0aGlzLmNoaWxkcmVuPVtdfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSksYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRpc3BsYXlPYmplY3RDb250YWluZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS54KnRoaXMuZ2V0TG9jYWxCb3VuZHMoKS53aWR0aH0sc2V0OmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKS53aWR0aDt0aGlzLnNjYWxlLng9MCE9PWI/YS8oYi90aGlzLnNjYWxlLngpOjEsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS55KnRoaXMuZ2V0TG9jYWxCb3VuZHMoKS5oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt2YXIgYj10aGlzLmdldExvY2FsQm91bmRzKCkuaGVpZ2h0O3RoaXMuc2NhbGUueT0wIT09Yj9hLyhiL3RoaXMuc2NhbGUueSk6MSx0aGlzLl9oZWlnaHQ9YX19KSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmFkZENoaWxkPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmFkZENoaWxkQXQoYSx0aGlzLmNoaWxkcmVuLmxlbmd0aCl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuYWRkQ2hpbGRBdD1mdW5jdGlvbihhLGIpe2lmKGI+PTAmJmI8PXRoaXMuY2hpbGRyZW4ubGVuZ3RoKXJldHVybiBhLnBhcmVudCYmYS5wYXJlbnQucmVtb3ZlQ2hpbGQoYSksYS5wYXJlbnQ9dGhpcyx0aGlzLmNoaWxkcmVuLnNwbGljZShiLDAsYSksdGhpcy5zdGFnZSYmYS5zZXRTdGFnZVJlZmVyZW5jZSh0aGlzLnN0YWdlKSxhO3Rocm93IG5ldyBFcnJvcihhK1wiIFRoZSBpbmRleCBcIitiK1wiIHN1cHBsaWVkIGlzIG91dCBvZiBib3VuZHMgXCIrdGhpcy5jaGlsZHJlbi5sZW5ndGgpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnN3YXBDaGlsZHJlbj1mdW5jdGlvbihhLGIpe2lmKGEhPT1iKXt2YXIgYz10aGlzLmNoaWxkcmVuLmluZGV4T2YoYSksZD10aGlzLmNoaWxkcmVuLmluZGV4T2YoYik7aWYoMD5jfHwwPmQpdGhyb3cgbmV3IEVycm9yKFwic3dhcENoaWxkcmVuOiBCb3RoIHRoZSBzdXBwbGllZCBEaXNwbGF5T2JqZWN0cyBtdXN0IGJlIGEgY2hpbGQgb2YgdGhlIGNhbGxlci5cIik7dGhpcy5jaGlsZHJlbltjXT1iLHRoaXMuY2hpbGRyZW5bZF09YX19LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuZ2V0Q2hpbGRBdD1mdW5jdGlvbihhKXtpZihhPj0wJiZhPHRoaXMuY2hpbGRyZW4ubGVuZ3RoKXJldHVybiB0aGlzLmNoaWxkcmVuW2FdO3Rocm93IG5ldyBFcnJvcihcIlN1cHBsaWVkIGluZGV4IGRvZXMgbm90IGV4aXN0IGluIHRoZSBjaGlsZCBsaXN0LCBvciB0aGUgc3VwcGxpZWQgRGlzcGxheU9iamVjdCBtdXN0IGJlIGEgY2hpbGQgb2YgdGhlIGNhbGxlclwiKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5yZW1vdmVDaGlsZD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5yZW1vdmVDaGlsZEF0KHRoaXMuY2hpbGRyZW4uaW5kZXhPZihhKSl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUucmVtb3ZlQ2hpbGRBdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmdldENoaWxkQXQoYSk7cmV0dXJuIHRoaXMuc3RhZ2UmJmIucmVtb3ZlU3RhZ2VSZWZlcmVuY2UoKSxiLnBhcmVudD12b2lkIDAsdGhpcy5jaGlsZHJlbi5zcGxpY2UoYSwxKSxifSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZUNoaWxkcmVuPWZ1bmN0aW9uKGEsYil7dmFyIGM9YXx8MCxkPVwibnVtYmVyXCI9PXR5cGVvZiBiP2I6dGhpcy5jaGlsZHJlbi5sZW5ndGgsZT1kLWM7aWYoZT4wJiZkPj1lKXtmb3IodmFyIGY9dGhpcy5jaGlsZHJlbi5zcGxpY2UoYyxlKSxnPTA7ZzxmLmxlbmd0aDtnKyspe3ZhciBoPWZbZ107dGhpcy5zdGFnZSYmaC5yZW1vdmVTdGFnZVJlZmVyZW5jZSgpLGgucGFyZW50PXZvaWQgMH1yZXR1cm4gZn10aHJvdyBuZXcgRXJyb3IoXCJSYW5nZSBFcnJvciwgbnVtZXJpYyB2YWx1ZXMgYXJlIG91dHNpZGUgdGhlIGFjY2VwdGFibGUgcmFuZ2VcIil9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7aWYodGhpcy52aXNpYmxlJiYoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKSwhdGhpcy5fY2FjaGVBc0JpdG1hcCkpZm9yKHZhciBhPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmE7YSsrKXRoaXMuY2hpbGRyZW5bYV0udXBkYXRlVHJhbnNmb3JtKCl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe2lmKDA9PT10aGlzLmNoaWxkcmVuLmxlbmd0aClyZXR1cm4gYi5FbXB0eVJlY3RhbmdsZTtpZihhKXt2YXIgYz10aGlzLndvcmxkVHJhbnNmb3JtO3RoaXMud29ybGRUcmFuc2Zvcm09YSx0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpLHRoaXMud29ybGRUcmFuc2Zvcm09Y31mb3IodmFyIGQsZSxmLGc9MS8wLGg9MS8wLGk9LTEvMCxqPS0xLzAsaz0hMSxsPTAsbT10aGlzLmNoaWxkcmVuLmxlbmd0aDttPmw7bCsrKXt2YXIgbj10aGlzLmNoaWxkcmVuW2xdO24udmlzaWJsZSYmKGs9ITAsZD10aGlzLmNoaWxkcmVuW2xdLmdldEJvdW5kcyhhKSxnPWc8ZC54P2c6ZC54LGg9aDxkLnk/aDpkLnksZT1kLndpZHRoK2QueCxmPWQuaGVpZ2h0K2QueSxpPWk+ZT9pOmUsaj1qPmY/ajpmKX1pZighaylyZXR1cm4gYi5FbXB0eVJlY3RhbmdsZTt2YXIgbz10aGlzLl9ib3VuZHM7cmV0dXJuIG8ueD1nLG8ueT1oLG8ud2lkdGg9aS1nLG8uaGVpZ2h0PWotaCxvfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmdldExvY2FsQm91bmRzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy53b3JsZFRyYW5zZm9ybTt0aGlzLndvcmxkVHJhbnNmb3JtPWIuaWRlbnRpdHlNYXRyaXg7Zm9yKHZhciBjPTAsZD10aGlzLmNoaWxkcmVuLmxlbmd0aDtkPmM7YysrKXRoaXMuY2hpbGRyZW5bY10udXBkYXRlVHJhbnNmb3JtKCk7dmFyIGU9dGhpcy5nZXRCb3VuZHMoKTtyZXR1cm4gdGhpcy53b3JsZFRyYW5zZm9ybT1hLGV9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuc2V0U3RhZ2VSZWZlcmVuY2U9ZnVuY3Rpb24oYSl7dGhpcy5zdGFnZT1hLHRoaXMuX2ludGVyYWN0aXZlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCk7Zm9yKHZhciBiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXt2YXIgZD10aGlzLmNoaWxkcmVuW2JdO2Quc2V0U3RhZ2VSZWZlcmVuY2UoYSl9fSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZVN0YWdlUmVmZXJlbmNlPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPTAsYj10aGlzLmNoaWxkcmVuLmxlbmd0aDtiPmE7YSsrKXt2YXIgYz10aGlzLmNoaWxkcmVuW2FdO2MucmVtb3ZlU3RhZ2VSZWZlcmVuY2UoKX10aGlzLl9pbnRlcmFjdGl2ZSYmKHRoaXMuc3RhZ2UuZGlydHk9ITApLHRoaXMuc3RhZ2U9bnVsbH0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlJiYhKHRoaXMuYWxwaGE8PTApKXtpZih0aGlzLl9jYWNoZUFzQml0bWFwKXJldHVybiB0aGlzLl9yZW5kZXJDYWNoZWRTcHJpdGUoYSksdm9pZCAwO3ZhciBiLGM7aWYodGhpcy5fbWFza3x8dGhpcy5fZmlsdGVycyl7Zm9yKHRoaXMuX2ZpbHRlcnMmJihhLnNwcml0ZUJhdGNoLmZsdXNoKCksYS5maWx0ZXJNYW5hZ2VyLnB1c2hGaWx0ZXIodGhpcy5fZmlsdGVyQmxvY2spKSx0aGlzLl9tYXNrJiYoYS5zcHJpdGVCYXRjaC5zdG9wKCksYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLm1hc2ssYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpKSxiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXRoaXMuY2hpbGRyZW5bYl0uX3JlbmRlcldlYkdMKGEpO2Euc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayh0aGlzLl9tYXNrLGEpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCl9ZWxzZSBmb3IoYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKX19LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe2lmKHRoaXMuX2NhY2hlQXNCaXRtYXApcmV0dXJuIHRoaXMuX3JlbmRlckNhY2hlZFNwcml0ZShhKSx2b2lkIDA7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEuY29udGV4dCk7Zm9yKHZhciBiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXt2YXIgZD10aGlzLmNoaWxkcmVuW2JdO2QuX3JlbmRlckNhbnZhcyhhKX10aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KX19LGIuU3ByaXRlPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMuYW5jaG9yPW5ldyBiLlBvaW50LHRoaXMudGV4dHVyZT1hLHRoaXMuX3dpZHRoPTAsdGhpcy5faGVpZ2h0PTAsdGhpcy50aW50PTE2Nzc3MjE1LHRoaXMuYmxlbmRNb2RlPWIuYmxlbmRNb2Rlcy5OT1JNQUwsYS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ/dGhpcy5vblRleHR1cmVVcGRhdGUoKToodGhpcy5vblRleHR1cmVVcGRhdGVCaW5kPXRoaXMub25UZXh0dXJlVXBkYXRlLmJpbmQodGhpcyksdGhpcy50ZXh0dXJlLmFkZEV2ZW50TGlzdGVuZXIoXCJ1cGRhdGVcIix0aGlzLm9uVGV4dHVyZVVwZGF0ZUJpbmQpKSx0aGlzLnJlbmRlcmFibGU9ITB9LGIuU3ByaXRlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3ByaXRlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNwcml0ZSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5TcHJpdGUucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbGUueCp0aGlzLnRleHR1cmUuZnJhbWUud2lkdGh9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLng9YS90aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5TcHJpdGUucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYWxlLnkqdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuc2NhbGUueT1hL3RoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQsdGhpcy5faGVpZ2h0PWF9fSksYi5TcHJpdGUucHJvdG90eXBlLnNldFRleHR1cmU9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0dXJlPWEsdGhpcy5jYWNoZWRUaW50PTE2Nzc3MjE1fSxiLlNwcml0ZS5wcm90b3R5cGUub25UZXh0dXJlVXBkYXRlPWZ1bmN0aW9uKCl7dGhpcy5fd2lkdGgmJih0aGlzLnNjYWxlLng9dGhpcy5fd2lkdGgvdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoKSx0aGlzLl9oZWlnaHQmJih0aGlzLnNjYWxlLnk9dGhpcy5faGVpZ2h0L3RoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQpfSxiLlNwcml0ZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMudGV4dHVyZS5mcmFtZS53aWR0aCxjPXRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQsZD1iKigxLXRoaXMuYW5jaG9yLngpLGU9YiotdGhpcy5hbmNob3IueCxmPWMqKDEtdGhpcy5hbmNob3IueSksZz1jKi10aGlzLmFuY2hvci55LGg9YXx8dGhpcy53b3JsZFRyYW5zZm9ybSxpPWguYSxqPWguYyxrPWguYixsPWguZCxtPWgudHgsbj1oLnR5LG89aSplK2sqZyttLHA9bCpnK2oqZStuLHE9aSpkK2sqZyttLHI9bCpnK2oqZCtuLHM9aSpkK2sqZittLHQ9bCpmK2oqZCtuLHU9aSplK2sqZittLHY9bCpmK2oqZStuLHc9LTEvMCx4PS0xLzAseT0xLzAsej0xLzA7eT15Pm8/bzp5LHk9eT5xP3E6eSx5PXk+cz9zOnkseT15PnU/dTp5LHo9ej5wP3A6eix6PXo+cj9yOnosej16PnQ/dDp6LHo9ej52P3Y6eix3PW8+dz9vOncsdz1xPnc/cTp3LHc9cz53P3M6dyx3PXU+dz91OncseD1wPng/cDp4LHg9cj54P3I6eCx4PXQ+eD90OngseD12Png/djp4O3ZhciBBPXRoaXMuX2JvdW5kcztyZXR1cm4gQS54PXksQS53aWR0aD13LXksQS55PXosQS5oZWlnaHQ9eC16LHRoaXMuX2N1cnJlbnRCb3VuZHM9QSxBfSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSYmISh0aGlzLmFscGhhPD0wKSl7dmFyIGIsYztpZih0aGlzLl9tYXNrfHx0aGlzLl9maWx0ZXJzKXt2YXIgZD1hLnNwcml0ZUJhdGNoO2Zvcih0aGlzLl9maWx0ZXJzJiYoZC5mbHVzaCgpLGEuZmlsdGVyTWFuYWdlci5wdXNoRmlsdGVyKHRoaXMuX2ZpbHRlckJsb2NrKSksdGhpcy5fbWFzayYmKGQuc3RvcCgpLGEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5tYXNrLGEpLGQuc3RhcnQoKSksZC5yZW5kZXIodGhpcyksYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKTtkLnN0b3AoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2sodGhpcy5fbWFzayxhKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucG9wRmlsdGVyKCksZC5zdGFydCgpfWVsc2UgZm9yKGEuc3ByaXRlQmF0Y2gucmVuZGVyKHRoaXMpLGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspdGhpcy5jaGlsZHJlbltiXS5fcmVuZGVyV2ViR0woYSl9fSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe2lmKHRoaXMuYmxlbmRNb2RlIT09YS5jdXJyZW50QmxlbmRNb2RlJiYoYS5jdXJyZW50QmxlbmRNb2RlPXRoaXMuYmxlbmRNb2RlLGEuY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249Yi5ibGVuZE1vZGVzQ2FudmFzW2EuY3VycmVudEJsZW5kTW9kZV0pLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhLmNvbnRleHQpLHRoaXMudGV4dHVyZS52YWxpZCl7YS5jb250ZXh0Lmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSxhLnJvdW5kUGl4ZWxzP2EuY29udGV4dC5zZXRUcmFuc2Zvcm0odGhpcy53b3JsZFRyYW5zZm9ybS5hLHRoaXMud29ybGRUcmFuc2Zvcm0uYyx0aGlzLndvcmxkVHJhbnNmb3JtLmIsdGhpcy53b3JsZFRyYW5zZm9ybS5kLDB8dGhpcy53b3JsZFRyYW5zZm9ybS50eCwwfHRoaXMud29ybGRUcmFuc2Zvcm0udHkpOmEuY29udGV4dC5zZXRUcmFuc2Zvcm0odGhpcy53b3JsZFRyYW5zZm9ybS5hLHRoaXMud29ybGRUcmFuc2Zvcm0uYyx0aGlzLndvcmxkVHJhbnNmb3JtLmIsdGhpcy53b3JsZFRyYW5zZm9ybS5kLHRoaXMud29ybGRUcmFuc2Zvcm0udHgsdGhpcy53b3JsZFRyYW5zZm9ybS50eSksYS5zbW9vdGhQcm9wZXJ0eSYmYS5zY2FsZU1vZGUhPT10aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuc2NhbGVNb2RlJiYoYS5zY2FsZU1vZGU9dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLnNjYWxlTW9kZSxhLmNvbnRleHRbYS5zbW9vdGhQcm9wZXJ0eV09YS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSKTt2YXIgYz10aGlzLnRleHR1cmUudHJpbT90aGlzLnRleHR1cmUudHJpbS54LXRoaXMuYW5jaG9yLngqdGhpcy50ZXh0dXJlLnRyaW0ud2lkdGg6dGhpcy5hbmNob3IueCotdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoLGQ9dGhpcy50ZXh0dXJlLnRyaW0/dGhpcy50ZXh0dXJlLnRyaW0ueS10aGlzLmFuY2hvci55KnRoaXMudGV4dHVyZS50cmltLmhlaWdodDp0aGlzLmFuY2hvci55Ki10aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0OzE2Nzc3MjE1IT09dGhpcy50aW50Pyh0aGlzLmNhY2hlZFRpbnQhPT10aGlzLnRpbnQmJih0aGlzLmNhY2hlZFRpbnQ9dGhpcy50aW50LHRoaXMudGludGVkVGV4dHVyZT1iLkNhbnZhc1RpbnRlci5nZXRUaW50ZWRUZXh0dXJlKHRoaXMsdGhpcy50aW50KSksYS5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLnRpbnRlZFRleHR1cmUsMCwwLHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCxjLGQsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0KSk6YS5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuc291cmNlLHRoaXMudGV4dHVyZS5jcm9wLngsdGhpcy50ZXh0dXJlLmNyb3AueSx0aGlzLnRleHR1cmUuY3JvcC53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQsYyxkLHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCl9Zm9yKHZhciBlPTAsZj10aGlzLmNoaWxkcmVuLmxlbmd0aDtmPmU7ZSsrKXRoaXMuY2hpbGRyZW5bZV0uX3JlbmRlckNhbnZhcyhhKTt0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KX19LGIuU3ByaXRlLmZyb21GcmFtZT1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHR1cmVDYWNoZVthXTtpZighYyl0aHJvdyBuZXcgRXJyb3IoJ1RoZSBmcmFtZUlkIFwiJythKydcIiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgdGV4dHVyZSBjYWNoZScrdGhpcyk7cmV0dXJuIG5ldyBiLlNwcml0ZShjKX0sYi5TcHJpdGUuZnJvbUltYWdlPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1iLlRleHR1cmUuZnJvbUltYWdlKGEsYyxkKTtyZXR1cm4gbmV3IGIuU3ByaXRlKGUpfSxiLlNwcml0ZUJhdGNoPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZVRoaW5nPWEsdGhpcy5yZWFkeT0hMX0sYi5TcHJpdGVCYXRjaC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlNwcml0ZUJhdGNoLmNvbnN0cnVjdG9yPWIuU3ByaXRlQmF0Y2gsYi5TcHJpdGVCYXRjaC5wcm90b3R5cGUuaW5pdFdlYkdMPWZ1bmN0aW9uKGEpe3RoaXMuZmFzdFNwcml0ZUJhdGNoPW5ldyBiLldlYkdMRmFzdFNwcml0ZUJhdGNoKGEpLHRoaXMucmVhZHk9ITB9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe2IuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXshdGhpcy52aXNpYmxlfHx0aGlzLmFscGhhPD0wfHwhdGhpcy5jaGlsZHJlbi5sZW5ndGh8fCh0aGlzLnJlYWR5fHx0aGlzLmluaXRXZWJHTChhLmdsKSxhLnNwcml0ZUJhdGNoLnN0b3AoKSxhLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGEuc2hhZGVyTWFuYWdlci5mYXN0U2hhZGVyKSx0aGlzLmZhc3RTcHJpdGVCYXRjaC5iZWdpbih0aGlzLGEpLHRoaXMuZmFzdFNwcml0ZUJhdGNoLnJlbmRlcih0aGlzKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpfSxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe3ZhciBjPWEuY29udGV4dDtjLmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpO2Zvcih2YXIgZD10aGlzLndvcmxkVHJhbnNmb3JtLGU9ITAsZj0wO2Y8dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZisrKXt2YXIgZz10aGlzLmNoaWxkcmVuW2ZdO2lmKGcudmlzaWJsZSl7dmFyIGg9Zy50ZXh0dXJlLGk9aC5mcmFtZTtpZihjLmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSpnLmFscGhhLGcucm90YXRpb24lKDIqTWF0aC5QSSk9PT0wKWUmJihjLnNldFRyYW5zZm9ybShkLmEsZC5jLGQuYixkLmQsZC50eCxkLnR5KSxlPSExKSxjLmRyYXdJbWFnZShoLmJhc2VUZXh0dXJlLnNvdXJjZSxpLngsaS55LGkud2lkdGgsaS5oZWlnaHQsZy5hbmNob3IueCotaS53aWR0aCpnLnNjYWxlLngrZy5wb3NpdGlvbi54Ky41fDAsZy5hbmNob3IueSotaS5oZWlnaHQqZy5zY2FsZS55K2cucG9zaXRpb24ueSsuNXwwLGkud2lkdGgqZy5zY2FsZS54LGkuaGVpZ2h0Kmcuc2NhbGUueSk7ZWxzZXtlfHwoZT0hMCksYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbChnKTt2YXIgaj1nLndvcmxkVHJhbnNmb3JtO2Eucm91bmRQaXhlbHM/Yy5zZXRUcmFuc2Zvcm0oai5hLGouYyxqLmIsai5kLDB8ai50eCwwfGoudHkpOmMuc2V0VHJhbnNmb3JtKGouYSxqLmMsai5iLGouZCxqLnR4LGoudHkpLGMuZHJhd0ltYWdlKGguYmFzZVRleHR1cmUuc291cmNlLGkueCxpLnksaS53aWR0aCxpLmhlaWdodCxnLmFuY2hvci54Ki1pLndpZHRoKy41fDAsZy5hbmNob3IueSotaS5oZWlnaHQrLjV8MCxpLndpZHRoLGkuaGVpZ2h0KX19fX0sYi5Nb3ZpZUNsaXA9ZnVuY3Rpb24oYSl7Yi5TcHJpdGUuY2FsbCh0aGlzLGFbMF0pLHRoaXMudGV4dHVyZXM9YSx0aGlzLmFuaW1hdGlvblNwZWVkPTEsdGhpcy5sb29wPSEwLHRoaXMub25Db21wbGV0ZT1udWxsLHRoaXMuY3VycmVudEZyYW1lPTAsdGhpcy5wbGF5aW5nPSExfSxiLk1vdmllQ2xpcC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlNwcml0ZS5wcm90b3R5cGUpLGIuTW92aWVDbGlwLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLk1vdmllQ2xpcCxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Nb3ZpZUNsaXAucHJvdG90eXBlLFwidG90YWxGcmFtZXNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudGV4dHVyZXMubGVuZ3RofX0pLGIuTW92aWVDbGlwLnByb3RvdHlwZS5zdG9wPWZ1bmN0aW9uKCl7dGhpcy5wbGF5aW5nPSExfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUucGxheT1mdW5jdGlvbigpe3RoaXMucGxheWluZz0hMH0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlLmdvdG9BbmRTdG9wPWZ1bmN0aW9uKGEpe3RoaXMucGxheWluZz0hMSx0aGlzLmN1cnJlbnRGcmFtZT1hO3ZhciBiPXRoaXMuY3VycmVudEZyYW1lKy41fDA7dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbYiV0aGlzLnRleHR1cmVzLmxlbmd0aF0pfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUuZ290b0FuZFBsYXk9ZnVuY3Rpb24oYSl7dGhpcy5jdXJyZW50RnJhbWU9YSx0aGlzLnBsYXlpbmc9ITB9LGIuTW92aWVDbGlwLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXtpZihiLlNwcml0ZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyksdGhpcy5wbGF5aW5nKXt0aGlzLmN1cnJlbnRGcmFtZSs9dGhpcy5hbmltYXRpb25TcGVlZDt2YXIgYT10aGlzLmN1cnJlbnRGcmFtZSsuNXwwO3RoaXMuY3VycmVudEZyYW1lPXRoaXMuY3VycmVudEZyYW1lJXRoaXMudGV4dHVyZXMubGVuZ3RoLHRoaXMubG9vcHx8YTx0aGlzLnRleHR1cmVzLmxlbmd0aD90aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1thJXRoaXMudGV4dHVyZXMubGVuZ3RoXSk6YT49dGhpcy50ZXh0dXJlcy5sZW5ndGgmJih0aGlzLmdvdG9BbmRTdG9wKHRoaXMudGV4dHVyZXMubGVuZ3RoLTEpLHRoaXMub25Db21wbGV0ZSYmdGhpcy5vbkNvbXBsZXRlKCkpfX0sYi5Nb3ZpZUNsaXAuZnJvbUZyYW1lcz1mdW5jdGlvbihhKXtmb3IodmFyIGM9W10sZD0wO2Q8YS5sZW5ndGg7ZCsrKWMucHVzaChuZXcgYi5UZXh0dXJlLmZyb21GcmFtZShhW2RdKSk7cmV0dXJuIG5ldyBiLk1vdmllQ2xpcChjKX0sYi5Nb3ZpZUNsaXAuZnJvbUltYWdlcz1mdW5jdGlvbihhKXtmb3IodmFyIGM9W10sZD0wO2Q8YS5sZW5ndGg7ZCsrKWMucHVzaChuZXcgYi5UZXh0dXJlLmZyb21JbWFnZShhW2RdKSk7cmV0dXJuIG5ldyBiLk1vdmllQ2xpcChjKX0sYi5GaWx0ZXJCbG9jaz1mdW5jdGlvbigpe3RoaXMudmlzaWJsZT0hMCx0aGlzLnJlbmRlcmFibGU9ITB9LGIuVGV4dD1mdW5jdGlvbihhLGMpe3RoaXMuY2FudmFzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy5jb250ZXh0PXRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSxiLlNwcml0ZS5jYWxsKHRoaXMsYi5UZXh0dXJlLmZyb21DYW52YXModGhpcy5jYW52YXMpKSx0aGlzLnNldFRleHQoYSksdGhpcy5zZXRTdHlsZShjKX0sYi5UZXh0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuU3ByaXRlLnByb3RvdHlwZSksYi5UZXh0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlRleHQsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVGV4dC5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLHRoaXMuc2NhbGUueCp0aGlzLnRleHR1cmUuZnJhbWUud2lkdGh9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLng9YS90aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UZXh0LnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLHRoaXMuc2NhbGUueSp0aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5zY2FsZS55PWEvdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodCx0aGlzLl9oZWlnaHQ9YX19KSxiLlRleHQucHJvdG90eXBlLnNldFN0eWxlPWZ1bmN0aW9uKGEpe2E9YXx8e30sYS5mb250PWEuZm9udHx8XCJib2xkIDIwcHQgQXJpYWxcIixhLmZpbGw9YS5maWxsfHxcImJsYWNrXCIsYS5hbGlnbj1hLmFsaWdufHxcImxlZnRcIixhLnN0cm9rZT1hLnN0cm9rZXx8XCJibGFja1wiLGEuc3Ryb2tlVGhpY2tuZXNzPWEuc3Ryb2tlVGhpY2tuZXNzfHwwLGEud29yZFdyYXA9YS53b3JkV3JhcHx8ITEsYS53b3JkV3JhcFdpZHRoPWEud29yZFdyYXBXaWR0aHx8MTAwLGEud29yZFdyYXBXaWR0aD1hLndvcmRXcmFwV2lkdGh8fDEwMCxhLmRyb3BTaGFkb3c9YS5kcm9wU2hhZG93fHwhMSxhLmRyb3BTaGFkb3dBbmdsZT1hLmRyb3BTaGFkb3dBbmdsZXx8TWF0aC5QSS82LGEuZHJvcFNoYWRvd0Rpc3RhbmNlPWEuZHJvcFNoYWRvd0Rpc3RhbmNlfHw0LGEuZHJvcFNoYWRvd0NvbG9yPWEuZHJvcFNoYWRvd0NvbG9yfHxcImJsYWNrXCIsdGhpcy5zdHlsZT1hLHRoaXMuZGlydHk9ITB9LGIuVGV4dC5wcm90b3R5cGUuc2V0VGV4dD1mdW5jdGlvbihhKXt0aGlzLnRleHQ9YS50b1N0cmluZygpfHxcIiBcIix0aGlzLmRpcnR5PSEwfSxiLlRleHQucHJvdG90eXBlLnVwZGF0ZVRleHQ9ZnVuY3Rpb24oKXt0aGlzLmNvbnRleHQuZm9udD10aGlzLnN0eWxlLmZvbnQ7dmFyIGE9dGhpcy50ZXh0O3RoaXMuc3R5bGUud29yZFdyYXAmJihhPXRoaXMud29yZFdyYXAodGhpcy50ZXh0KSk7Zm9yKHZhciBiPWEuc3BsaXQoLyg/OlxcclxcbnxcXHJ8XFxuKS8pLGM9W10sZD0wLGU9MDtlPGIubGVuZ3RoO2UrKyl7dmFyIGY9dGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KGJbZV0pLndpZHRoO2NbZV09ZixkPU1hdGgubWF4KGQsZil9dmFyIGc9ZCt0aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzczt0aGlzLnN0eWxlLmRyb3BTaGFkb3cmJihnKz10aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZSksdGhpcy5jYW52YXMud2lkdGg9Zyt0aGlzLmNvbnRleHQubGluZVdpZHRoO3ZhciBoPXRoaXMuZGV0ZXJtaW5lRm9udEhlaWdodChcImZvbnQ6IFwiK3RoaXMuc3R5bGUuZm9udCtcIjtcIikrdGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MsaT1oKmIubGVuZ3RoO3RoaXMuc3R5bGUuZHJvcFNoYWRvdyYmKGkrPXRoaXMuc3R5bGUuZHJvcFNoYWRvd0Rpc3RhbmNlKSx0aGlzLmNhbnZhcy5oZWlnaHQ9aSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLDAsdGhpcy5jYW52YXMud2lkdGgsdGhpcy5jYW52YXMuaGVpZ2h0KSx0aGlzLmNvbnRleHQuZm9udD10aGlzLnN0eWxlLmZvbnQsdGhpcy5jb250ZXh0LnN0cm9rZVN0eWxlPXRoaXMuc3R5bGUuc3Ryb2tlLHRoaXMuY29udGV4dC5saW5lV2lkdGg9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MsdGhpcy5jb250ZXh0LnRleHRCYXNlbGluZT1cInRvcFwiO3ZhciBqLGs7aWYodGhpcy5zdHlsZS5kcm9wU2hhZG93KXt0aGlzLmNvbnRleHQuZmlsbFN0eWxlPXRoaXMuc3R5bGUuZHJvcFNoYWRvd0NvbG9yO3ZhciBsPU1hdGguc2luKHRoaXMuc3R5bGUuZHJvcFNoYWRvd0FuZ2xlKSp0aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZSxtPU1hdGguY29zKHRoaXMuc3R5bGUuZHJvcFNoYWRvd0FuZ2xlKSp0aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZTtmb3IoZT0wO2U8Yi5sZW5ndGg7ZSsrKWo9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMixrPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIrZSpoLFwicmlnaHRcIj09PXRoaXMuc3R5bGUuYWxpZ24/ais9ZC1jW2VdOlwiY2VudGVyXCI9PT10aGlzLnN0eWxlLmFsaWduJiYoais9KGQtY1tlXSkvMiksdGhpcy5zdHlsZS5maWxsJiZ0aGlzLmNvbnRleHQuZmlsbFRleHQoYltlXSxqK2wsayttKX1mb3IodGhpcy5jb250ZXh0LmZpbGxTdHlsZT10aGlzLnN0eWxlLmZpbGwsZT0wO2U8Yi5sZW5ndGg7ZSsrKWo9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMixrPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIrZSpoLFwicmlnaHRcIj09PXRoaXMuc3R5bGUuYWxpZ24/ais9ZC1jW2VdOlwiY2VudGVyXCI9PT10aGlzLnN0eWxlLmFsaWduJiYoais9KGQtY1tlXSkvMiksdGhpcy5zdHlsZS5zdHJva2UmJnRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzJiZ0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dChiW2VdLGosayksdGhpcy5zdHlsZS5maWxsJiZ0aGlzLmNvbnRleHQuZmlsbFRleHQoYltlXSxqLGspO3RoaXMudXBkYXRlVGV4dHVyZSgpfSxiLlRleHQucHJvdG90eXBlLnVwZGF0ZVRleHR1cmU9ZnVuY3Rpb24oKXt0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUud2lkdGg9dGhpcy5jYW52YXMud2lkdGgsdGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmhlaWdodD10aGlzLmNhbnZhcy5oZWlnaHQsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGg9dGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoPXRoaXMuY2FudmFzLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodD10aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0PXRoaXMuY2FudmFzLmhlaWdodCx0aGlzLl93aWR0aD10aGlzLmNhbnZhcy53aWR0aCx0aGlzLl9oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0LHRoaXMucmVxdWlyZXNVcGRhdGU9ITB9LGIuVGV4dC5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe3RoaXMucmVxdWlyZXNVcGRhdGUmJih0aGlzLnJlcXVpcmVzVXBkYXRlPSExLGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZSxhLmdsKSksYi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTC5jYWxsKHRoaXMsYSl9LGIuVGV4dC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLGIuU3ByaXRlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX0sYi5UZXh0LnByb3RvdHlwZS5kZXRlcm1pbmVGb250SGVpZ2h0PWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dC5oZWlnaHRDYWNoZVthXTtpZighYyl7dmFyIGQ9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdLGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSxmPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiTVwiKTtlLmFwcGVuZENoaWxkKGYpLGUuc2V0QXR0cmlidXRlKFwic3R5bGVcIixhK1wiO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MFwiKSxkLmFwcGVuZENoaWxkKGUpLGM9ZS5vZmZzZXRIZWlnaHQsYi5UZXh0LmhlaWdodENhY2hlW2FdPWMsZC5yZW1vdmVDaGlsZChlKX1yZXR1cm4gY30sYi5UZXh0LnByb3RvdHlwZS53b3JkV3JhcD1mdW5jdGlvbihhKXtmb3IodmFyIGI9XCJcIixjPWEuc3BsaXQoXCJcXG5cIiksZD0wO2Q8Yy5sZW5ndGg7ZCsrKXtmb3IodmFyIGU9dGhpcy5zdHlsZS53b3JkV3JhcFdpZHRoLGY9Y1tkXS5zcGxpdChcIiBcIiksZz0wO2c8Zi5sZW5ndGg7ZysrKXt2YXIgaD10aGlzLmNvbnRleHQubWVhc3VyZVRleHQoZltnXSkud2lkdGgsaT1oK3RoaXMuY29udGV4dC5tZWFzdXJlVGV4dChcIiBcIikud2lkdGg7MD09PWd8fGk+ZT8oZz4wJiYoYis9XCJcXG5cIiksYis9ZltnXSxlPXRoaXMuc3R5bGUud29yZFdyYXBXaWR0aC1oKTooZS09aSxiKz1cIiBcIitmW2ddKX1kPGMubGVuZ3RoLTEmJihiKz1cIlxcblwiKX1yZXR1cm4gYn0sYi5UZXh0LnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKGEpe3RoaXMuY29udGV4dD1udWxsLHRoaXMuY2FudmFzPW51bGwsdGhpcy50ZXh0dXJlLmRlc3Ryb3kodm9pZCAwPT09YT8hMDphKX0sYi5UZXh0LmhlaWdodENhY2hlPXt9LGIuQml0bWFwVGV4dD1mdW5jdGlvbihhLGMpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMuX3Bvb2w9W10sdGhpcy5zZXRUZXh0KGEpLHRoaXMuc2V0U3R5bGUoYyksdGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMX0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuQml0bWFwVGV4dC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CaXRtYXBUZXh0LGIuQml0bWFwVGV4dC5wcm90b3R5cGUuc2V0VGV4dD1mdW5jdGlvbihhKXt0aGlzLnRleHQ9YXx8XCIgXCIsdGhpcy5kaXJ0eT0hMH0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZS5zZXRTdHlsZT1mdW5jdGlvbihhKXthPWF8fHt9LGEuYWxpZ249YS5hbGlnbnx8XCJsZWZ0XCIsdGhpcy5zdHlsZT1hO3ZhciBjPWEuZm9udC5zcGxpdChcIiBcIik7dGhpcy5mb250TmFtZT1jW2MubGVuZ3RoLTFdLHRoaXMuZm9udFNpemU9Yy5sZW5ndGg+PTI/cGFyc2VJbnQoY1tjLmxlbmd0aC0yXSwxMCk6Yi5CaXRtYXBUZXh0LmZvbnRzW3RoaXMuZm9udE5hbWVdLnNpemUsdGhpcy5kaXJ0eT0hMCx0aGlzLnRpbnQ9YS50aW50fSxiLkJpdG1hcFRleHQucHJvdG90eXBlLnVwZGF0ZVRleHQ9ZnVuY3Rpb24oKXtmb3IodmFyIGE9Yi5CaXRtYXBUZXh0LmZvbnRzW3RoaXMuZm9udE5hbWVdLGM9bmV3IGIuUG9pbnQsZD1udWxsLGU9W10sZj0wLGc9W10saD0wLGk9dGhpcy5mb250U2l6ZS9hLnNpemUsaj0wO2o8dGhpcy50ZXh0Lmxlbmd0aDtqKyspe3ZhciBrPXRoaXMudGV4dC5jaGFyQ29kZUF0KGopO2lmKC8oPzpcXHJcXG58XFxyfFxcbikvLnRlc3QodGhpcy50ZXh0LmNoYXJBdChqKSkpZy5wdXNoKGMueCksZj1NYXRoLm1heChmLGMueCksaCsrLGMueD0wLGMueSs9YS5saW5lSGVpZ2h0LGQ9bnVsbDtlbHNle3ZhciBsPWEuY2hhcnNba107bCYmKGQmJmxbZF0mJihjLngrPWwua2VybmluZ1tkXSksZS5wdXNoKHt0ZXh0dXJlOmwudGV4dHVyZSxsaW5lOmgsY2hhckNvZGU6ayxwb3NpdGlvbjpuZXcgYi5Qb2ludChjLngrbC54T2Zmc2V0LGMueStsLnlPZmZzZXQpfSksYy54Kz1sLnhBZHZhbmNlLGQ9ayl9fWcucHVzaChjLngpLGY9TWF0aC5tYXgoZixjLngpO3ZhciBtPVtdO2ZvcihqPTA7aD49ajtqKyspe3ZhciBuPTA7XCJyaWdodFwiPT09dGhpcy5zdHlsZS5hbGlnbj9uPWYtZ1tqXTpcImNlbnRlclwiPT09dGhpcy5zdHlsZS5hbGlnbiYmKG49KGYtZ1tqXSkvMiksbS5wdXNoKG4pfXZhciBvPXRoaXMuY2hpbGRyZW4ubGVuZ3RoLHA9ZS5sZW5ndGgscT10aGlzLnRpbnR8fDE2Nzc3MjE1O2ZvcihqPTA7cD5qO2orKyl7dmFyIHI9bz5qP3RoaXMuY2hpbGRyZW5bal06dGhpcy5fcG9vbC5wb3AoKTtyP3Iuc2V0VGV4dHVyZShlW2pdLnRleHR1cmUpOnI9bmV3IGIuU3ByaXRlKGVbal0udGV4dHVyZSksci5wb3NpdGlvbi54PShlW2pdLnBvc2l0aW9uLngrbVtlW2pdLmxpbmVdKSppLHIucG9zaXRpb24ueT1lW2pdLnBvc2l0aW9uLnkqaSxyLnNjYWxlLng9ci5zY2FsZS55PWksci50aW50PXEsci5wYXJlbnR8fHRoaXMuYWRkQ2hpbGQocil9Zm9yKDt0aGlzLmNoaWxkcmVuLmxlbmd0aD5wOyl7dmFyIHM9dGhpcy5nZXRDaGlsZEF0KHRoaXMuY2hpbGRyZW4ubGVuZ3RoLTEpO3RoaXMuX3Bvb2wucHVzaChzKSx0aGlzLnJlbW92ZUNoaWxkKHMpfXRoaXMudGV4dFdpZHRoPWYqaSx0aGlzLnRleHRIZWlnaHQ9KGMueSthLmxpbmVIZWlnaHQpKml9LGIuQml0bWFwVGV4dC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuQml0bWFwVGV4dC5mb250cz17fSxiLkludGVyYWN0aW9uRGF0YT1mdW5jdGlvbigpe3RoaXMuZ2xvYmFsPW5ldyBiLlBvaW50LHRoaXMudGFyZ2V0PW51bGwsdGhpcy5vcmlnaW5hbEV2ZW50PW51bGx9LGIuSW50ZXJhY3Rpb25EYXRhLnByb3RvdHlwZS5nZXRMb2NhbFBvc2l0aW9uPWZ1bmN0aW9uKGEpe3ZhciBjPWEud29ybGRUcmFuc2Zvcm0sZD10aGlzLmdsb2JhbCxlPWMuYSxmPWMuYixnPWMudHgsaD1jLmMsaT1jLmQsaj1jLnR5LGs9MS8oZSppK2YqLWgpO3JldHVybiBuZXcgYi5Qb2ludChpKmsqZC54Ky1mKmsqZC55KyhqKmYtZyppKSprLGUqaypkLnkrLWgqaypkLngrKC1qKmUrZypoKSprKX0sYi5JbnRlcmFjdGlvbkRhdGEucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW50ZXJhY3Rpb25EYXRhLGIuSW50ZXJhY3Rpb25NYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuc3RhZ2U9YSx0aGlzLm1vdXNlPW5ldyBiLkludGVyYWN0aW9uRGF0YSx0aGlzLnRvdWNocz17fSx0aGlzLnRlbXBQb2ludD1uZXcgYi5Qb2ludCx0aGlzLm1vdXNlb3ZlckVuYWJsZWQ9ITAsdGhpcy5wb29sPVtdLHRoaXMuaW50ZXJhY3RpdmVJdGVtcz1bXSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudD1udWxsLHRoaXMub25Nb3VzZU1vdmU9dGhpcy5vbk1vdXNlTW92ZS5iaW5kKHRoaXMpLHRoaXMub25Nb3VzZURvd249dGhpcy5vbk1vdXNlRG93bi5iaW5kKHRoaXMpLHRoaXMub25Nb3VzZU91dD10aGlzLm9uTW91c2VPdXQuYmluZCh0aGlzKSx0aGlzLm9uTW91c2VVcD10aGlzLm9uTW91c2VVcC5iaW5kKHRoaXMpLHRoaXMub25Ub3VjaFN0YXJ0PXRoaXMub25Ub3VjaFN0YXJ0LmJpbmQodGhpcyksdGhpcy5vblRvdWNoRW5kPXRoaXMub25Ub3VjaEVuZC5iaW5kKHRoaXMpLHRoaXMub25Ub3VjaE1vdmU9dGhpcy5vblRvdWNoTW92ZS5iaW5kKHRoaXMpLHRoaXMubGFzdD0wLHRoaXMuY3VycmVudEN1cnNvclN0eWxlPVwiaW5oZXJpdFwiLHRoaXMubW91c2VPdXQ9ITF9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkludGVyYWN0aW9uTWFuYWdlcixiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlPWZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPWEuY2hpbGRyZW4sZD1jLmxlbmd0aCxlPWQtMTtlPj0wO2UtLSl7dmFyIGY9Y1tlXTtmLl9pbnRlcmFjdGl2ZT8oYi5pbnRlcmFjdGl2ZUNoaWxkcmVuPSEwLHRoaXMuaW50ZXJhY3RpdmVJdGVtcy5wdXNoKGYpLGYuY2hpbGRyZW4ubGVuZ3RoPjAmJnRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKGYsZikpOihmLl9faVBhcmVudD1udWxsLGYuY2hpbGRyZW4ubGVuZ3RoPjAmJnRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKGYsYikpfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnNldFRhcmdldD1mdW5jdGlvbihhKXt0aGlzLnRhcmdldD1hLG51bGw9PT10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudCYmdGhpcy5zZXRUYXJnZXREb21FbGVtZW50KGEudmlldyl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5zZXRUYXJnZXREb21FbGVtZW50PWZ1bmN0aW9uKGEpe3RoaXMucmVtb3ZlRXZlbnRzKCksd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkJiYoYS5zdHlsZVtcIi1tcy1jb250ZW50LXpvb21pbmdcIl09XCJub25lXCIsYS5zdHlsZVtcIi1tcy10b3VjaC1hY3Rpb25cIl09XCJub25lXCIpLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50PWEsYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsdGhpcy5vbk1vdXNlTW92ZSwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5vbk1vdXNlRG93biwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIix0aGlzLm9uTW91c2VPdXQsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIix0aGlzLm9uVG91Y2hTdGFydCwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIix0aGlzLm9uVG91Y2hFbmQsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLHRoaXMub25Ub3VjaE1vdmUsITApLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLHRoaXMub25Nb3VzZVVwLCEwKX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50cz1mdW5jdGlvbigpe3RoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50JiYodGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGVbXCItbXMtY29udGVudC16b29taW5nXCJdPVwiXCIsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGVbXCItbXMtdG91Y2gtYWN0aW9uXCJdPVwiXCIsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLHRoaXMub25Nb3VzZU1vdmUsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLm9uTW91c2VEb3duLCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIix0aGlzLm9uTW91c2VPdXQsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsdGhpcy5vblRvdWNoU3RhcnQsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLHRoaXMub25Ub3VjaEVuZCwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLHRoaXMub25Ub3VjaE1vdmUsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50PW51bGwsd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsdGhpcy5vbk1vdXNlVXAsITApKX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbigpe2lmKHRoaXMudGFyZ2V0KXt2YXIgYT1EYXRlLm5vdygpLGM9YS10aGlzLmxhc3Q7aWYoYz1jKmIuSU5URVJBQ1RJT05fRlJFUVVFTkNZLzFlMywhKDE+Yykpe3RoaXMubGFzdD1hO3ZhciBkPTA7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBlPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsZj1cImluaGVyaXRcIixnPSExO2ZvcihkPTA7ZT5kO2QrKyl7dmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2guX19oaXQ9dGhpcy5oaXRUZXN0KGgsdGhpcy5tb3VzZSksdGhpcy5tb3VzZS50YXJnZXQ9aCxoLl9faGl0JiYhZz8oaC5idXR0b25Nb2RlJiYoZj1oLmRlZmF1bHRDdXJzb3IpLGguaW50ZXJhY3RpdmVDaGlsZHJlbnx8KGc9ITApLGguX19pc092ZXJ8fChoLm1vdXNlb3ZlciYmaC5tb3VzZW92ZXIodGhpcy5tb3VzZSksaC5fX2lzT3Zlcj0hMCkpOmguX19pc092ZXImJihoLm1vdXNlb3V0JiZoLm1vdXNlb3V0KHRoaXMubW91c2UpLGguX19pc092ZXI9ITEpfXRoaXMuY3VycmVudEN1cnNvclN0eWxlIT09ZiYmKHRoaXMuY3VycmVudEN1cnNvclN0eWxlPWYsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGUuY3Vyc29yPWYpfX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaD1mdW5jdGlvbigpe3RoaXMuZGlydHk9ITE7Zm9yKHZhciBhPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsYj0wO2E+YjtiKyspdGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2JdLmludGVyYWN0aXZlQ2hpbGRyZW49ITE7dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zPVtdLHRoaXMuc3RhZ2UuaW50ZXJhY3RpdmUmJnRoaXMuaW50ZXJhY3RpdmVJdGVtcy5wdXNoKHRoaXMuc3RhZ2UpLHRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKHRoaXMuc3RhZ2UsdGhpcy5zdGFnZSl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlTW92ZT1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCksdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudDt2YXIgYj10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTt0aGlzLm1vdXNlLmdsb2JhbC54PShhLmNsaWVudFgtYi5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYi53aWR0aCksdGhpcy5tb3VzZS5nbG9iYWwueT0oYS5jbGllbnRZLWIudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2IuaGVpZ2h0KTtmb3IodmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxkPTA7Yz5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2UubW91c2Vtb3ZlJiZlLm1vdXNlbW92ZSh0aGlzLm1vdXNlKX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlRG93bj1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCksdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudCxiLkFVVE9fUFJFVkVOVF9ERUZBVUxUJiZ0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtmb3IodmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxkPTA7Yz5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2lmKChlLm1vdXNlZG93bnx8ZS5jbGljaykmJihlLl9fbW91c2VJc0Rvd249ITAsZS5fX2hpdD10aGlzLmhpdFRlc3QoZSx0aGlzLm1vdXNlKSxlLl9faGl0JiYoZS5tb3VzZWRvd24mJmUubW91c2Vkb3duKHRoaXMubW91c2UpLGUuX19pc0Rvd249ITAsIWUuaW50ZXJhY3RpdmVDaGlsZHJlbikpKWJyZWFrfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uTW91c2VPdXQ9ZnVuY3Rpb24oKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGE9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aDt0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5zdHlsZS5jdXJzb3I9XCJpbmhlcml0XCI7Zm9yKHZhciBiPTA7YT5iO2IrKyl7dmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2JdO2MuX19pc092ZXImJih0aGlzLm1vdXNlLnRhcmdldD1jLGMubW91c2VvdXQmJmMubW91c2VvdXQodGhpcy5tb3VzZSksYy5fX2lzT3Zlcj0hMSl9dGhpcy5tb3VzZU91dD0hMCx0aGlzLm1vdXNlLmdsb2JhbC54PS0xZTQsdGhpcy5tb3VzZS5nbG9iYWwueT0tMWU0fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Nb3VzZVVwPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKSx0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50O1xyXG5mb3IodmFyIGI9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxjPSExLGQ9MDtiPmQ7ZCsrKXt2YXIgZT10aGlzLmludGVyYWN0aXZlSXRlbXNbZF07ZS5fX2hpdD10aGlzLmhpdFRlc3QoZSx0aGlzLm1vdXNlKSxlLl9faGl0JiYhYz8oZS5tb3VzZXVwJiZlLm1vdXNldXAodGhpcy5tb3VzZSksZS5fX2lzRG93biYmZS5jbGljayYmZS5jbGljayh0aGlzLm1vdXNlKSxlLmludGVyYWN0aXZlQ2hpbGRyZW58fChjPSEwKSk6ZS5fX2lzRG93biYmZS5tb3VzZXVwb3V0c2lkZSYmZS5tb3VzZXVwb3V0c2lkZSh0aGlzLm1vdXNlKSxlLl9faXNEb3duPSExfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLmhpdFRlc3Q9ZnVuY3Rpb24oYSxjKXt2YXIgZD1jLmdsb2JhbDtpZighYS53b3JsZFZpc2libGUpcmV0dXJuITE7dmFyIGU9YSBpbnN0YW5jZW9mIGIuU3ByaXRlLGY9YS53b3JsZFRyYW5zZm9ybSxnPWYuYSxoPWYuYixpPWYudHgsaj1mLmMsaz1mLmQsbD1mLnR5LG09MS8oZyprK2gqLWopLG49ayptKmQueCstaCptKmQueSsobCpoLWkqaykqbSxvPWcqbSpkLnkrLWoqbSpkLngrKC1sKmcraSpqKSptO2lmKGMudGFyZ2V0PWEsYS5oaXRBcmVhJiZhLmhpdEFyZWEuY29udGFpbnMpcmV0dXJuIGEuaGl0QXJlYS5jb250YWlucyhuLG8pPyhjLnRhcmdldD1hLCEwKTohMTtpZihlKXt2YXIgcCxxPWEudGV4dHVyZS5mcmFtZS53aWR0aCxyPWEudGV4dHVyZS5mcmFtZS5oZWlnaHQscz0tcSphLmFuY2hvci54O2lmKG4+cyYmcytxPm4mJihwPS1yKmEuYW5jaG9yLnksbz5wJiZwK3I+bykpcmV0dXJuIGMudGFyZ2V0PWEsITB9Zm9yKHZhciB0PWEuY2hpbGRyZW4ubGVuZ3RoLHU9MDt0PnU7dSsrKXt2YXIgdj1hLmNoaWxkcmVuW3VdLHc9dGhpcy5oaXRUZXN0KHYsYyk7aWYodylyZXR1cm4gYy50YXJnZXQ9YSwhMH1yZXR1cm4hMX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uVG91Y2hNb3ZlPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKTt2YXIgYixjPXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGQ9YS5jaGFuZ2VkVG91Y2hlcyxlPTA7Zm9yKGU9MDtlPGQubGVuZ3RoO2UrKyl7dmFyIGY9ZFtlXTtiPXRoaXMudG91Y2hzW2YuaWRlbnRpZmllcl0sYi5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudCxiLmdsb2JhbC54PShmLmNsaWVudFgtYy5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYy53aWR0aCksYi5nbG9iYWwueT0oZi5jbGllbnRZLWMudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2MuaGVpZ2h0KSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmKGIuZ2xvYmFsLng9Zi5jbGllbnRYLGIuZ2xvYmFsLnk9Zi5jbGllbnRZKTtmb3IodmFyIGc9MDtnPHRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGg7ZysrKXt2YXIgaD10aGlzLmludGVyYWN0aXZlSXRlbXNbZ107aC50b3VjaG1vdmUmJmguX190b3VjaERhdGEmJmguX190b3VjaERhdGFbZi5pZGVudGlmaWVyXSYmaC50b3VjaG1vdmUoYil9fX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uVG91Y2hTdGFydD1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGM9dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7Yi5BVVRPX1BSRVZFTlRfREVGQVVMVCYmYS5wcmV2ZW50RGVmYXVsdCgpO2Zvcih2YXIgZD1hLmNoYW5nZWRUb3VjaGVzLGU9MDtlPGQubGVuZ3RoO2UrKyl7dmFyIGY9ZFtlXSxnPXRoaXMucG9vbC5wb3AoKTtnfHwoZz1uZXcgYi5JbnRlcmFjdGlvbkRhdGEpLGcub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsdGhpcy50b3VjaHNbZi5pZGVudGlmaWVyXT1nLGcuZ2xvYmFsLng9KGYuY2xpZW50WC1jLmxlZnQpKih0aGlzLnRhcmdldC53aWR0aC9jLndpZHRoKSxnLmdsb2JhbC55PShmLmNsaWVudFktYy50b3ApKih0aGlzLnRhcmdldC5oZWlnaHQvYy5oZWlnaHQpLG5hdmlnYXRvci5pc0NvY29vbkpTJiYoZy5nbG9iYWwueD1mLmNsaWVudFgsZy5nbG9iYWwueT1mLmNsaWVudFkpO2Zvcih2YXIgaD10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGk9MDtoPmk7aSsrKXt2YXIgaj10aGlzLmludGVyYWN0aXZlSXRlbXNbaV07aWYoKGoudG91Y2hzdGFydHx8ai50YXApJiYoai5fX2hpdD10aGlzLmhpdFRlc3QoaixnKSxqLl9faGl0JiYoai50b3VjaHN0YXJ0JiZqLnRvdWNoc3RhcnQoZyksai5fX2lzRG93bj0hMCxqLl9fdG91Y2hEYXRhPWouX190b3VjaERhdGF8fHt9LGouX190b3VjaERhdGFbZi5pZGVudGlmaWVyXT1nLCFqLmludGVyYWN0aXZlQ2hpbGRyZW4pKSlicmVha319fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Ub3VjaEVuZD1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7Zm9yKHZhciBiPXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGM9YS5jaGFuZ2VkVG91Y2hlcyxkPTA7ZDxjLmxlbmd0aDtkKyspe3ZhciBlPWNbZF0sZj10aGlzLnRvdWNoc1tlLmlkZW50aWZpZXJdLGc9ITE7Zi5nbG9iYWwueD0oZS5jbGllbnRYLWIubGVmdCkqKHRoaXMudGFyZ2V0LndpZHRoL2Iud2lkdGgpLGYuZ2xvYmFsLnk9KGUuY2xpZW50WS1iLnRvcCkqKHRoaXMudGFyZ2V0LmhlaWdodC9iLmhlaWdodCksbmF2aWdhdG9yLmlzQ29jb29uSlMmJihmLmdsb2JhbC54PWUuY2xpZW50WCxmLmdsb2JhbC55PWUuY2xpZW50WSk7Zm9yKHZhciBoPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsaT0wO2g+aTtpKyspe3ZhciBqPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tpXTtqLl9fdG91Y2hEYXRhJiZqLl9fdG91Y2hEYXRhW2UuaWRlbnRpZmllcl0mJihqLl9faGl0PXRoaXMuaGl0VGVzdChqLGouX190b3VjaERhdGFbZS5pZGVudGlmaWVyXSksZi5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudCwoai50b3VjaGVuZHx8ai50YXApJiYoai5fX2hpdCYmIWc/KGoudG91Y2hlbmQmJmoudG91Y2hlbmQoZiksai5fX2lzRG93biYmai50YXAmJmoudGFwKGYpLGouaW50ZXJhY3RpdmVDaGlsZHJlbnx8KGc9ITApKTpqLl9faXNEb3duJiZqLnRvdWNoZW5kb3V0c2lkZSYmai50b3VjaGVuZG91dHNpZGUoZiksai5fX2lzRG93bj0hMSksai5fX3RvdWNoRGF0YVtlLmlkZW50aWZpZXJdPW51bGwpfXRoaXMucG9vbC5wdXNoKGYpLHRoaXMudG91Y2hzW2UuaWRlbnRpZmllcl09bnVsbH19LGIuU3RhZ2U9ZnVuY3Rpb24oYSl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy53b3JsZFRyYW5zZm9ybT1uZXcgYi5NYXRyaXgsdGhpcy5pbnRlcmFjdGl2ZT0hMCx0aGlzLmludGVyYWN0aW9uTWFuYWdlcj1uZXcgYi5JbnRlcmFjdGlvbk1hbmFnZXIodGhpcyksdGhpcy5kaXJ0eT0hMCx0aGlzLnN0YWdlPXRoaXMsdGhpcy5zdGFnZS5oaXRBcmVhPW5ldyBiLlJlY3RhbmdsZSgwLDAsMWU1LDFlNSksdGhpcy5zZXRCYWNrZ3JvdW5kQ29sb3IoYSl9LGIuU3RhZ2UucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TdGFnZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TdGFnZSxiLlN0YWdlLnByb3RvdHlwZS5zZXRJbnRlcmFjdGlvbkRlbGVnYXRlPWZ1bmN0aW9uKGEpe3RoaXMuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldERvbUVsZW1lbnQoYSl9LGIuU3RhZ2UucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3RoaXMud29ybGRBbHBoYT0xO2Zvcih2YXIgYT0wLGI9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yj5hO2ErKyl0aGlzLmNoaWxkcmVuW2FdLnVwZGF0ZVRyYW5zZm9ybSgpO3RoaXMuZGlydHkmJih0aGlzLmRpcnR5PSExLHRoaXMuaW50ZXJhY3Rpb25NYW5hZ2VyLmRpcnR5PSEwKSx0aGlzLmludGVyYWN0aXZlJiZ0aGlzLmludGVyYWN0aW9uTWFuYWdlci51cGRhdGUoKX0sYi5TdGFnZS5wcm90b3R5cGUuc2V0QmFja2dyb3VuZENvbG9yPWZ1bmN0aW9uKGEpe3RoaXMuYmFja2dyb3VuZENvbG9yPWF8fDAsdGhpcy5iYWNrZ3JvdW5kQ29sb3JTcGxpdD1iLmhleDJyZ2IodGhpcy5iYWNrZ3JvdW5kQ29sb3IpO3ZhciBjPXRoaXMuYmFja2dyb3VuZENvbG9yLnRvU3RyaW5nKDE2KTtjPVwiMDAwMDAwXCIuc3Vic3RyKDAsNi1jLmxlbmd0aCkrYyx0aGlzLmJhY2tncm91bmRDb2xvclN0cmluZz1cIiNcIitjfSxiLlN0YWdlLnByb3RvdHlwZS5nZXRNb3VzZVBvc2l0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaW50ZXJhY3Rpb25NYW5hZ2VyLm1vdXNlLmdsb2JhbH07Zm9yKHZhciBjPTAsZD1bXCJtc1wiLFwibW96XCIsXCJ3ZWJraXRcIixcIm9cIl0sZT0wO2U8ZC5sZW5ndGgmJiF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOysrZSl3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lPXdpbmRvd1tkW2VdK1wiUmVxdWVzdEFuaW1hdGlvbkZyYW1lXCJdLHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZT13aW5kb3dbZFtlXStcIkNhbmNlbEFuaW1hdGlvbkZyYW1lXCJdfHx3aW5kb3dbZFtlXStcIkNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZVwiXTt3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lfHwod2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZT1mdW5jdGlvbihhKXt2YXIgYj0obmV3IERhdGUpLmdldFRpbWUoKSxkPU1hdGgubWF4KDAsMTYtKGItYykpLGU9d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXthKGIrZCl9LGQpO3JldHVybiBjPWIrZCxlfSksd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lfHwod2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lPWZ1bmN0aW9uKGEpe2NsZWFyVGltZW91dChhKX0pLHdpbmRvdy5yZXF1ZXN0QW5pbUZyYW1lPXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsYi5oZXgycmdiPWZ1bmN0aW9uKGEpe3JldHVyblsoYT4+MTYmMjU1KS8yNTUsKGE+PjgmMjU1KS8yNTUsKDI1NSZhKS8yNTVdfSxiLnJnYjJoZXg9ZnVuY3Rpb24oYSl7cmV0dXJuKDI1NSphWzBdPDwxNikrKDI1NSphWzFdPDw4KSsyNTUqYVsyXX0sXCJmdW5jdGlvblwiIT10eXBlb2YgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQmJihGdW5jdGlvbi5wcm90b3R5cGUuYmluZD1mdW5jdGlvbigpe3ZhciBhPUFycmF5LnByb3RvdHlwZS5zbGljZTtyZXR1cm4gZnVuY3Rpb24oYil7ZnVuY3Rpb24gYygpe3ZhciBmPWUuY29uY2F0KGEuY2FsbChhcmd1bWVudHMpKTtkLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBjP3RoaXM6YixmKX12YXIgZD10aGlzLGU9YS5jYWxsKGFyZ3VtZW50cywxKTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBkKXRocm93IG5ldyBUeXBlRXJyb3I7cmV0dXJuIGMucHJvdG90eXBlPWZ1bmN0aW9uIGYoYSl7cmV0dXJuIGEmJihmLnByb3RvdHlwZT1hKSx0aGlzIGluc3RhbmNlb2YgZj92b2lkIDA6bmV3IGZ9KGQucHJvdG90eXBlKSxjfX0oKSksYi5BamF4UmVxdWVzdD1mdW5jdGlvbigpe3ZhciBhPVtcIk1zeG1sMi5YTUxIVFRQLjYuMFwiLFwiTXN4bWwyLlhNTEhUVFAuMy4wXCIsXCJNaWNyb3NvZnQuWE1MSFRUUFwiXTtpZighd2luZG93LkFjdGl2ZVhPYmplY3QpcmV0dXJuIHdpbmRvdy5YTUxIdHRwUmVxdWVzdD9uZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0OiExO2Zvcih2YXIgYj0wO2I8YS5sZW5ndGg7YisrKXRyeXtyZXR1cm4gbmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KGFbYl0pfWNhdGNoKGMpe319LGIuY2FuVXNlTmV3Q2FudmFzQmxlbmRNb2Rlcz1mdW5jdGlvbigpe3ZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7YS53aWR0aD0xLGEuaGVpZ2h0PTE7dmFyIGI9YS5nZXRDb250ZXh0KFwiMmRcIik7cmV0dXJuIGIuZmlsbFN0eWxlPVwiIzAwMFwiLGIuZmlsbFJlY3QoMCwwLDEsMSksYi5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJtdWx0aXBseVwiLGIuZmlsbFN0eWxlPVwiI2ZmZlwiLGIuZmlsbFJlY3QoMCwwLDEsMSksMD09PWIuZ2V0SW1hZ2VEYXRhKDAsMCwxLDEpLmRhdGFbMF19LGIuZ2V0TmV4dFBvd2VyT2ZUd289ZnVuY3Rpb24oYSl7aWYoYT4wJiYwPT09KGEmYS0xKSlyZXR1cm4gYTtmb3IodmFyIGI9MTthPmI7KWI8PD0xO3JldHVybiBifSxiLkV2ZW50VGFyZ2V0PWZ1bmN0aW9uKCl7dmFyIGE9e307dGhpcy5hZGRFdmVudExpc3RlbmVyPXRoaXMub249ZnVuY3Rpb24oYixjKXt2b2lkIDA9PT1hW2JdJiYoYVtiXT1bXSksLTE9PT1hW2JdLmluZGV4T2YoYykmJmFbYl0udW5zaGlmdChjKX0sdGhpcy5kaXNwYXRjaEV2ZW50PXRoaXMuZW1pdD1mdW5jdGlvbihiKXtpZihhW2IudHlwZV0mJmFbYi50eXBlXS5sZW5ndGgpZm9yKHZhciBjPWFbYi50eXBlXS5sZW5ndGgtMTtjPj0wO2MtLSlhW2IudHlwZV1bY10oYil9LHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcj10aGlzLm9mZj1mdW5jdGlvbihiLGMpe2lmKHZvaWQgMCE9PWFbYl0pe3ZhciBkPWFbYl0uaW5kZXhPZihjKTstMSE9PWQmJmFbYl0uc3BsaWNlKGQsMSl9fSx0aGlzLnJlbW92ZUFsbEV2ZW50TGlzdGVuZXJzPWZ1bmN0aW9uKGIpe3ZhciBjPWFbYl07YyYmKGMubGVuZ3RoPTApfX0sYi5hdXRvRGV0ZWN0UmVuZGVyZXI9ZnVuY3Rpb24oYSxjLGQsZSxmKXthfHwoYT04MDApLGN8fChjPTYwMCk7dmFyIGc9ZnVuY3Rpb24oKXt0cnl7dmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtyZXR1cm4hIXdpbmRvdy5XZWJHTFJlbmRlcmluZ0NvbnRleHQmJihhLmdldENvbnRleHQoXCJ3ZWJnbFwiKXx8YS5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIpKX1jYXRjaChiKXtyZXR1cm4hMX19KCk7cmV0dXJuIGc/bmV3IGIuV2ViR0xSZW5kZXJlcihhLGMsZCxlLGYpOm5ldyBiLkNhbnZhc1JlbmRlcmVyKGEsYyxkLGUpfSxiLmF1dG9EZXRlY3RSZWNvbW1lbmRlZFJlbmRlcmVyPWZ1bmN0aW9uKGEsYyxkLGUsZil7YXx8KGE9ODAwKSxjfHwoYz02MDApO3ZhciBnPWZ1bmN0aW9uKCl7dHJ5e3ZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7cmV0dXJuISF3aW5kb3cuV2ViR0xSZW5kZXJpbmdDb250ZXh0JiYoYS5nZXRDb250ZXh0KFwid2ViZ2xcIil8fGEuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiKSl9Y2F0Y2goYil7cmV0dXJuITF9fSgpLGg9L0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO3JldHVybiBnJiYhaD9uZXcgYi5XZWJHTFJlbmRlcmVyKGEsYyxkLGUsZik6bmV3IGIuQ2FudmFzUmVuZGVyZXIoYSxjLGQsZSl9LGIuUG9seUs9e30sYi5Qb2x5Sy5Ucmlhbmd1bGF0ZT1mdW5jdGlvbihhKXt2YXIgYz0hMCxkPWEubGVuZ3RoPj4xO2lmKDM+ZClyZXR1cm5bXTtmb3IodmFyIGU9W10sZj1bXSxnPTA7ZD5nO2crKylmLnB1c2goZyk7Zz0wO2Zvcih2YXIgaD1kO2g+Mzspe3ZhciBpPWZbKGcrMCklaF0saj1mWyhnKzEpJWhdLGs9ZlsoZysyKSVoXSxsPWFbMippXSxtPWFbMippKzFdLG49YVsyKmpdLG89YVsyKmorMV0scD1hWzIqa10scT1hWzIqaysxXSxyPSExO2lmKGIuUG9seUsuX2NvbnZleChsLG0sbixvLHAscSxjKSl7cj0hMDtmb3IodmFyIHM9MDtoPnM7cysrKXt2YXIgdD1mW3NdO2lmKHQhPT1pJiZ0IT09aiYmdCE9PWsmJmIuUG9seUsuX1BvaW50SW5UcmlhbmdsZShhWzIqdF0sYVsyKnQrMV0sbCxtLG4sbyxwLHEpKXtyPSExO2JyZWFrfX19aWYocillLnB1c2goaSxqLGspLGYuc3BsaWNlKChnKzEpJWgsMSksaC0tLGc9MDtlbHNlIGlmKGcrKz4zKmgpe2lmKCFjKXJldHVybiB3aW5kb3cuY29uc29sZS5sb2coXCJQSVhJIFdhcm5pbmc6IHNoYXBlIHRvbyBjb21wbGV4IHRvIGZpbGxcIiksW107Zm9yKGU9W10sZj1bXSxnPTA7ZD5nO2crKylmLnB1c2goZyk7Zz0wLGg9ZCxjPSExfX1yZXR1cm4gZS5wdXNoKGZbMF0sZlsxXSxmWzJdKSxlfSxiLlBvbHlLLl9Qb2ludEluVHJpYW5nbGU9ZnVuY3Rpb24oYSxiLGMsZCxlLGYsZyxoKXt2YXIgaT1nLWMsaj1oLWQsaz1lLWMsbD1mLWQsbT1hLWMsbj1iLWQsbz1pKmkraipqLHA9aSprK2oqbCxxPWkqbStqKm4scj1rKmsrbCpsLHM9ayptK2wqbix0PTEvKG8qci1wKnApLHU9KHIqcS1wKnMpKnQsdj0obypzLXAqcSkqdDtyZXR1cm4gdT49MCYmdj49MCYmMT51K3Z9LGIuUG9seUsuX2NvbnZleD1mdW5jdGlvbihhLGIsYyxkLGUsZixnKXtyZXR1cm4oYi1kKSooZS1jKSsoYy1hKSooZi1kKT49MD09PWd9LGIuaW5pdERlZmF1bHRTaGFkZXJzPWZ1bmN0aW9uKCl7fSxiLkNvbXBpbGVWZXJ0ZXhTaGFkZXI9ZnVuY3Rpb24oYSxjKXtyZXR1cm4gYi5fQ29tcGlsZVNoYWRlcihhLGMsYS5WRVJURVhfU0hBREVSKX0sYi5Db21waWxlRnJhZ21lbnRTaGFkZXI9ZnVuY3Rpb24oYSxjKXtyZXR1cm4gYi5fQ29tcGlsZVNoYWRlcihhLGMsYS5GUkFHTUVOVF9TSEFERVIpfSxiLl9Db21waWxlU2hhZGVyPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1iLmpvaW4oXCJcXG5cIiksZT1hLmNyZWF0ZVNoYWRlcihjKTtyZXR1cm4gYS5zaGFkZXJTb3VyY2UoZSxkKSxhLmNvbXBpbGVTaGFkZXIoZSksYS5nZXRTaGFkZXJQYXJhbWV0ZXIoZSxhLkNPTVBJTEVfU1RBVFVTKT9lOih3aW5kb3cuY29uc29sZS5sb2coYS5nZXRTaGFkZXJJbmZvTG9nKGUpKSxudWxsKX0sYi5jb21waWxlUHJvZ3JhbT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5Db21waWxlRnJhZ21lbnRTaGFkZXIoYSxkKSxmPWIuQ29tcGlsZVZlcnRleFNoYWRlcihhLGMpLGc9YS5jcmVhdGVQcm9ncmFtKCk7cmV0dXJuIGEuYXR0YWNoU2hhZGVyKGcsZiksYS5hdHRhY2hTaGFkZXIoZyxlKSxhLmxpbmtQcm9ncmFtKGcpLGEuZ2V0UHJvZ3JhbVBhcmFtZXRlcihnLGEuTElOS19TVEFUVVMpfHx3aW5kb3cuY29uc29sZS5sb2coXCJDb3VsZCBub3QgaW5pdGlhbGlzZSBzaGFkZXJzXCIpLGd9LGIuUGl4aVNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIGxvd3AgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpICogdkNvbG9yIDtcIixcIn1cIl0sdGhpcy50ZXh0dXJlQ291bnQ9MCx0aGlzLmF0dHJpYnV0ZXM9W10sdGhpcy5pbml0KCl9LGIuUGl4aVNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmN8fGIuUGl4aVNoYWRlci5kZWZhdWx0VmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnVTYW1wbGVyPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1U2FtcGxlclwiKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLmRpbWVuc2lvbnM9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImRpbWVuc2lvbnNcIiksdGhpcy5hVmVydGV4UG9zaXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVZlcnRleFBvc2l0aW9uXCIpLHRoaXMuYVRleHR1cmVDb29yZD1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVGV4dHVyZUNvb3JkXCIpLHRoaXMuY29sb3JBdHRyaWJ1dGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYUNvbG9yXCIpLC0xPT09dGhpcy5jb2xvckF0dHJpYnV0ZSYmKHRoaXMuY29sb3JBdHRyaWJ1dGU9MiksdGhpcy5hdHRyaWJ1dGVzPVt0aGlzLmFWZXJ0ZXhQb3NpdGlvbix0aGlzLmFUZXh0dXJlQ29vcmQsdGhpcy5jb2xvckF0dHJpYnV0ZV07Zm9yKHZhciBkIGluIHRoaXMudW5pZm9ybXMpdGhpcy51bmlmb3Jtc1tkXS51bmlmb3JtTG9jYXRpb249YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxkKTt0aGlzLmluaXRVbmlmb3JtcygpLHRoaXMucHJvZ3JhbT1jfSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmluaXRVbmlmb3Jtcz1mdW5jdGlvbigpe3RoaXMudGV4dHVyZUNvdW50PTE7dmFyIGEsYj10aGlzLmdsO2Zvcih2YXIgYyBpbiB0aGlzLnVuaWZvcm1zKXthPXRoaXMudW5pZm9ybXNbY107dmFyIGQ9YS50eXBlO1wic2FtcGxlcjJEXCI9PT1kPyhhLl9pbml0PSExLG51bGwhPT1hLnZhbHVlJiZ0aGlzLmluaXRTYW1wbGVyMkQoYSkpOlwibWF0MlwiPT09ZHx8XCJtYXQzXCI9PT1kfHxcIm1hdDRcIj09PWQ/KGEuZ2xNYXRyaXg9ITAsYS5nbFZhbHVlTGVuZ3RoPTEsXCJtYXQyXCI9PT1kP2EuZ2xGdW5jPWIudW5pZm9ybU1hdHJpeDJmdjpcIm1hdDNcIj09PWQ/YS5nbEZ1bmM9Yi51bmlmb3JtTWF0cml4M2Z2OlwibWF0NFwiPT09ZCYmKGEuZ2xGdW5jPWIudW5pZm9ybU1hdHJpeDRmdikpOihhLmdsRnVuYz1iW1widW5pZm9ybVwiK2RdLGEuZ2xWYWx1ZUxlbmd0aD1cIjJmXCI9PT1kfHxcIjJpXCI9PT1kPzI6XCIzZlwiPT09ZHx8XCIzaVwiPT09ZD8zOlwiNGZcIj09PWR8fFwiNGlcIj09PWQ/NDoxKX19LGIuUGl4aVNoYWRlci5wcm90b3R5cGUuaW5pdFNhbXBsZXIyRD1mdW5jdGlvbihhKXtpZihhLnZhbHVlJiZhLnZhbHVlLmJhc2VUZXh0dXJlJiZhLnZhbHVlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCl7dmFyIGI9dGhpcy5nbDtpZihiLmFjdGl2ZVRleHR1cmUoYltcIlRFWFRVUkVcIit0aGlzLnRleHR1cmVDb3VudF0pLGIuYmluZFRleHR1cmUoYi5URVhUVVJFXzJELGEudmFsdWUuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYi5pZF0pLGEudGV4dHVyZURhdGEpe3ZhciBjPWEudGV4dHVyZURhdGEsZD1jLm1hZ0ZpbHRlcj9jLm1hZ0ZpbHRlcjpiLkxJTkVBUixlPWMubWluRmlsdGVyP2MubWluRmlsdGVyOmIuTElORUFSLGY9Yy53cmFwUz9jLndyYXBTOmIuQ0xBTVBfVE9fRURHRSxnPWMud3JhcFQ/Yy53cmFwVDpiLkNMQU1QX1RPX0VER0UsaD1jLmx1bWluYW5jZT9iLkxVTUlOQU5DRTpiLlJHQkE7aWYoYy5yZXBlYXQmJihmPWIuUkVQRUFULGc9Yi5SRVBFQVQpLGIucGl4ZWxTdG9yZWkoYi5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCEhYy5mbGlwWSksYy53aWR0aCl7dmFyIGk9Yy53aWR0aD9jLndpZHRoOjUxMixqPWMuaGVpZ2h0P2MuaGVpZ2h0OjIsaz1jLmJvcmRlcj9jLmJvcmRlcjowO2IudGV4SW1hZ2UyRChiLlRFWFRVUkVfMkQsMCxoLGksaixrLGgsYi5VTlNJR05FRF9CWVRFLG51bGwpfWVsc2UgYi50ZXhJbWFnZTJEKGIuVEVYVFVSRV8yRCwwLGgsYi5SR0JBLGIuVU5TSUdORURfQllURSxhLnZhbHVlLmJhc2VUZXh0dXJlLnNvdXJjZSk7Yi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfTUFHX0ZJTFRFUixkKSxiLnRleFBhcmFtZXRlcmkoYi5URVhUVVJFXzJELGIuVEVYVFVSRV9NSU5fRklMVEVSLGUpLGIudGV4UGFyYW1ldGVyaShiLlRFWFRVUkVfMkQsYi5URVhUVVJFX1dSQVBfUyxmKSxiLnRleFBhcmFtZXRlcmkoYi5URVhUVVJFXzJELGIuVEVYVFVSRV9XUkFQX1QsZyl9Yi51bmlmb3JtMWkoYS51bmlmb3JtTG9jYXRpb24sdGhpcy50ZXh0dXJlQ291bnQpLGEuX2luaXQ9ITAsdGhpcy50ZXh0dXJlQ291bnQrK319LGIuUGl4aVNoYWRlci5wcm90b3R5cGUuc3luY1VuaWZvcm1zPWZ1bmN0aW9uKCl7dGhpcy50ZXh0dXJlQ291bnQ9MTt2YXIgYSxjPXRoaXMuZ2w7Zm9yKHZhciBkIGluIHRoaXMudW5pZm9ybXMpYT10aGlzLnVuaWZvcm1zW2RdLDE9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbE1hdHJpeD09PSEwP2EuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnRyYW5zcG9zZSxhLnZhbHVlKTphLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS52YWx1ZSk6Mj09PWEuZ2xWYWx1ZUxlbmd0aD9hLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS52YWx1ZS54LGEudmFsdWUueSk6Mz09PWEuZ2xWYWx1ZUxlbmd0aD9hLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS52YWx1ZS54LGEudmFsdWUueSxhLnZhbHVlLnopOjQ9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUueCxhLnZhbHVlLnksYS52YWx1ZS56LGEudmFsdWUudyk6XCJzYW1wbGVyMkRcIj09PWEudHlwZSYmKGEuX2luaXQ/KGMuYWN0aXZlVGV4dHVyZShjW1wiVEVYVFVSRVwiK3RoaXMudGV4dHVyZUNvdW50XSksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsYS52YWx1ZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tjLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUoYS52YWx1ZS5iYXNlVGV4dHVyZSxjKSksYy51bmlmb3JtMWkoYS51bmlmb3JtTG9jYXRpb24sdGhpcy50ZXh0dXJlQ291bnQpLHRoaXMudGV4dHVyZUNvdW50KyspOnRoaXMuaW5pdFNhbXBsZXIyRChhKSl9LGIuUGl4aVNoYWRlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pLHRoaXMudW5pZm9ybXM9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5hdHRyaWJ1dGVzPW51bGx9LGIuUGl4aVNoYWRlci5kZWZhdWx0VmVydGV4U3JjPVtcImF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcIixcImF0dHJpYnV0ZSB2ZWMyIGFUZXh0dXJlQ29vcmQ7XCIsXCJhdHRyaWJ1dGUgdmVjMiBhQ29sb3I7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJjb25zdCB2ZWMyIGNlbnRlciA9IHZlYzIoLTEuMCwgMS4wKTtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoICgoYVZlcnRleFBvc2l0aW9uICsgb2Zmc2V0VmVjdG9yKSAvIHByb2plY3Rpb25WZWN0b3IpICsgY2VudGVyICwgMC4wLCAxLjApO1wiLFwiICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XCIsXCIgICB2ZWMzIGNvbG9yID0gbW9kKHZlYzMoYUNvbG9yLnkvNjU1MzYuMCwgYUNvbG9yLnkvMjU2LjAsIGFDb2xvci55KSwgMjU2LjApIC8gMjU2LjA7XCIsXCIgICB2Q29sb3IgPSB2ZWM0KGNvbG9yICogYUNvbG9yLngsIGFDb2xvci54KTtcIixcIn1cIl0sYi5QaXhpRmFzdFNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIGxvd3AgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgZmxvYXQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKSAqIHZDb2xvciA7XCIsXCJ9XCJdLHRoaXMudmVydGV4U3JjPVtcImF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcIixcImF0dHJpYnV0ZSB2ZWMyIGFQb3NpdGlvbkNvb3JkO1wiLFwiYXR0cmlidXRlIHZlYzIgYVNjYWxlO1wiLFwiYXR0cmlidXRlIGZsb2F0IGFSb3RhdGlvbjtcIixcImF0dHJpYnV0ZSB2ZWMyIGFUZXh0dXJlQ29vcmQ7XCIsXCJhdHRyaWJ1dGUgZmxvYXQgYUNvbG9yO1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidW5pZm9ybSBtYXQzIHVNYXRyaXg7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgZmxvYXQgdkNvbG9yO1wiLFwiY29uc3QgdmVjMiBjZW50ZXIgPSB2ZWMyKC0xLjAsIDEuMCk7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiB2O1wiLFwiICAgdmVjMiBzdiA9IGFWZXJ0ZXhQb3NpdGlvbiAqIGFTY2FsZTtcIixcIiAgIHYueCA9IChzdi54KSAqIGNvcyhhUm90YXRpb24pIC0gKHN2LnkpICogc2luKGFSb3RhdGlvbik7XCIsXCIgICB2LnkgPSAoc3YueCkgKiBzaW4oYVJvdGF0aW9uKSArIChzdi55KSAqIGNvcyhhUm90YXRpb24pO1wiLFwiICAgdiA9ICggdU1hdHJpeCAqIHZlYzModiArIGFQb3NpdGlvbkNvb3JkICwgMS4wKSApLnh5IDtcIixcIiAgIGdsX1Bvc2l0aW9uID0gdmVjNCggKCB2IC8gcHJvamVjdGlvblZlY3RvcikgKyBjZW50ZXIgLCAwLjAsIDEuMCk7XCIsXCIgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcIixcIiAgIHZDb2xvciA9IGFDb2xvcjtcIixcIn1cIl0sdGhpcy50ZXh0dXJlQ291bnQ9MCx0aGlzLmluaXQoKX0sYi5QaXhpRmFzdFNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMudVNhbXBsZXI9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInVTYW1wbGVyXCIpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMuZGltZW5zaW9ucz1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiZGltZW5zaW9uc1wiKSx0aGlzLnVNYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInVNYXRyaXhcIiksdGhpcy5hVmVydGV4UG9zaXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVZlcnRleFBvc2l0aW9uXCIpLHRoaXMuYVBvc2l0aW9uQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVBvc2l0aW9uQ29vcmRcIiksdGhpcy5hU2NhbGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVNjYWxlXCIpLHRoaXMuYVJvdGF0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFSb3RhdGlvblwiKSx0aGlzLmFUZXh0dXJlQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVRleHR1cmVDb29yZFwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSwtMT09PXRoaXMuY29sb3JBdHRyaWJ1dGUmJih0aGlzLmNvbG9yQXR0cmlidXRlPTIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5hUG9zaXRpb25Db29yZCx0aGlzLmFTY2FsZSx0aGlzLmFSb3RhdGlvbix0aGlzLmFUZXh0dXJlQ29vcmQsdGhpcy5jb2xvckF0dHJpYnV0ZV0sdGhpcy5wcm9ncmFtPWN9LGIuUGl4aUZhc3RTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlcz1udWxsfSxiLlN0cmlwU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidW5pZm9ybSBmbG9hdCBhbHBoYTtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSkpO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1wiLFwidW5pZm9ybSBtYXQzIHRyYW5zbGF0aW9uTWF0cml4O1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMyB2ID0gdHJhbnNsYXRpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiAsIDEuMCk7XCIsXCIgICB2IC09IG9mZnNldFZlY3Rvci54eXg7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoIHYueCAvIHByb2plY3Rpb25WZWN0b3IueCAtMS4wLCB2LnkgLyAtcHJvamVjdGlvblZlY3Rvci55ICsgMS4wICwgMC4wLCAxLjApO1wiLFwiICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XCIsXCJ9XCJdLHRoaXMuaW5pdCgpfSxiLlN0cmlwU2hhZGVyLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPWIuY29tcGlsZVByb2dyYW0oYSx0aGlzLnZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy51U2FtcGxlcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidVNhbXBsZXJcIiksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy5jb2xvckF0dHJpYnV0ZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhQ29sb3JcIiksdGhpcy5hVmVydGV4UG9zaXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVZlcnRleFBvc2l0aW9uXCIpLHRoaXMuYVRleHR1cmVDb29yZD1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVGV4dHVyZUNvb3JkXCIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5hVGV4dHVyZUNvb3JkXSx0aGlzLnRyYW5zbGF0aW9uTWF0cml4PWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0cmFuc2xhdGlvbk1hdHJpeFwiKSx0aGlzLmFscGhhPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJhbHBoYVwiKSx0aGlzLnByb2dyYW09Y30sYi5QcmltaXRpdmVTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB2Q29sb3I7XCIsXCJ9XCJdLHRoaXMudmVydGV4U3JjPVtcImF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcIixcImF0dHJpYnV0ZSB2ZWM0IGFDb2xvcjtcIixcInVuaWZvcm0gbWF0MyB0cmFuc2xhdGlvbk1hdHJpeDtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInVuaWZvcm0gZmxvYXQgYWxwaGE7XCIsXCJ1bmlmb3JtIHZlYzMgdGludDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMyB2ID0gdHJhbnNsYXRpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiAsIDEuMCk7XCIsXCIgICB2IC09IG9mZnNldFZlY3Rvci54eXg7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoIHYueCAvIHByb2plY3Rpb25WZWN0b3IueCAtMS4wLCB2LnkgLyAtcHJvamVjdGlvblZlY3Rvci55ICsgMS4wICwgMC4wLCAxLjApO1wiLFwiICAgdkNvbG9yID0gYUNvbG9yICogdmVjNCh0aW50ICogYWxwaGEsIGFscGhhKTtcIixcIn1cIl0sdGhpcy5pbml0KCl9LGIuUHJpbWl0aXZlU2hhZGVyLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPWIuY29tcGlsZVByb2dyYW0oYSx0aGlzLnZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy50aW50Q29sb3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRpbnRcIiksdGhpcy5hVmVydGV4UG9zaXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVZlcnRleFBvc2l0aW9uXCIpLHRoaXMuY29sb3JBdHRyaWJ1dGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYUNvbG9yXCIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5jb2xvckF0dHJpYnV0ZV0sdGhpcy50cmFuc2xhdGlvbk1hdHJpeD1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidHJhbnNsYXRpb25NYXRyaXhcIiksdGhpcy5hbHBoYT1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiYWxwaGFcIiksdGhpcy5wcm9ncmFtPWN9LGIuUHJpbWl0aXZlU2hhZGVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy51bmlmb3Jtcz1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLmF0dHJpYnV0ZT1udWxsfSxiLkNvbXBsZXhQcmltaXRpdmVTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB2Q29sb3I7XCIsXCJ9XCJdLHRoaXMudmVydGV4U3JjPVtcImF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcIixcInVuaWZvcm0gbWF0MyB0cmFuc2xhdGlvbk1hdHJpeDtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInVuaWZvcm0gdmVjMyB0aW50O1wiLFwidW5pZm9ybSBmbG9hdCBhbHBoYTtcIixcInVuaWZvcm0gdmVjMyBjb2xvcjtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMyB2ID0gdHJhbnNsYXRpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiAsIDEuMCk7XCIsXCIgICB2IC09IG9mZnNldFZlY3Rvci54eXg7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoIHYueCAvIHByb2plY3Rpb25WZWN0b3IueCAtMS4wLCB2LnkgLyAtcHJvamVjdGlvblZlY3Rvci55ICsgMS4wICwgMC4wLCAxLjApO1wiLFwiICAgdkNvbG9yID0gdmVjNChjb2xvciAqIGFscGhhICogdGludCwgYWxwaGEpO1wiLFwifVwiXSx0aGlzLmluaXQoKX0sYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPWIuY29tcGlsZVByb2dyYW0oYSx0aGlzLnZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy50aW50Q29sb3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRpbnRcIiksdGhpcy5jb2xvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiY29sb3JcIiksdGhpcy5hVmVydGV4UG9zaXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVZlcnRleFBvc2l0aW9uXCIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5jb2xvckF0dHJpYnV0ZV0sdGhpcy50cmFuc2xhdGlvbk1hdHJpeD1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidHJhbnNsYXRpb25NYXRyaXhcIiksdGhpcy5hbHBoYT1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiYWxwaGFcIiksdGhpcy5wcm9ncmFtPWN9LGIuQ29tcGxleFByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pLHRoaXMudW5pZm9ybXM9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5hdHRyaWJ1dGU9bnVsbH0sYi5XZWJHTEdyYXBoaWNzPWZ1bmN0aW9uKCl7fSxiLldlYkdMR3JhcGhpY3MucmVuZGVyR3JhcGhpY3M9ZnVuY3Rpb24oYSxjKXt2YXIgZCxlPWMuZ2wsZj1jLnByb2plY3Rpb24sZz1jLm9mZnNldCxoPWMuc2hhZGVyTWFuYWdlci5wcmltaXRpdmVTaGFkZXI7YS5kaXJ0eSYmYi5XZWJHTEdyYXBoaWNzLnVwZGF0ZUdyYXBoaWNzKGEsZSk7Zm9yKHZhciBpPWEuX3dlYkdMW2UuaWRdLGo9MDtqPGkuZGF0YS5sZW5ndGg7aisrKTE9PT1pLmRhdGFbal0ubW9kZT8oZD1pLmRhdGFbal0sYy5zdGVuY2lsTWFuYWdlci5wdXNoU3RlbmNpbChhLGQsYyksZS5kcmF3RWxlbWVudHMoZS5UUklBTkdMRV9GQU4sNCxlLlVOU0lHTkVEX1NIT1JULDIqKGQuaW5kaWNlcy5sZW5ndGgtNCkpLGMuc3RlbmNpbE1hbmFnZXIucG9wU3RlbmNpbChhLGQsYyksdGhpcy5sYXN0PWQubW9kZSk6KGQ9aS5kYXRhW2pdLGMuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoaCksaD1jLnNoYWRlck1hbmFnZXIucHJpbWl0aXZlU2hhZGVyLGUudW5pZm9ybU1hdHJpeDNmdihoLnRyYW5zbGF0aW9uTWF0cml4LCExLGEud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCkpLGUudW5pZm9ybTJmKGgucHJvamVjdGlvblZlY3RvcixmLngsLWYueSksZS51bmlmb3JtMmYoaC5vZmZzZXRWZWN0b3IsLWcueCwtZy55KSxlLnVuaWZvcm0zZnYoaC50aW50Q29sb3IsYi5oZXgycmdiKGEudGludCkpLGUudW5pZm9ybTFmKGguYWxwaGEsYS53b3JsZEFscGhhKSxlLmJpbmRCdWZmZXIoZS5BUlJBWV9CVUZGRVIsZC5idWZmZXIpLGUudmVydGV4QXR0cmliUG9pbnRlcihoLmFWZXJ0ZXhQb3NpdGlvbiwyLGUuRkxPQVQsITEsMjQsMCksZS52ZXJ0ZXhBdHRyaWJQb2ludGVyKGguY29sb3JBdHRyaWJ1dGUsNCxlLkZMT0FULCExLDI0LDgpLGUuYmluZEJ1ZmZlcihlLkVMRU1FTlRfQVJSQVlfQlVGRkVSLGQuaW5kZXhCdWZmZXIpLGUuZHJhd0VsZW1lbnRzKGUuVFJJQU5HTEVfU1RSSVAsZC5pbmRpY2VzLmxlbmd0aCxlLlVOU0lHTkVEX1NIT1JULDApKX0sYi5XZWJHTEdyYXBoaWNzLnVwZGF0ZUdyYXBoaWNzPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5fd2ViR0xbYy5pZF07ZHx8KGQ9YS5fd2ViR0xbYy5pZF09e2xhc3RJbmRleDowLGRhdGE6W10sZ2w6Y30pLGEuZGlydHk9ITE7dmFyIGU7aWYoYS5jbGVhckRpcnR5KXtmb3IoYS5jbGVhckRpcnR5PSExLGU9MDtlPGQuZGF0YS5sZW5ndGg7ZSsrKXt2YXIgZj1kLmRhdGFbZV07Zi5yZXNldCgpLGIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sLnB1c2goZil9ZC5kYXRhPVtdLGQubGFzdEluZGV4PTB9dmFyIGc7Zm9yKGU9ZC5sYXN0SW5kZXg7ZTxhLmdyYXBoaWNzRGF0YS5sZW5ndGg7ZSsrKXt2YXIgaD1hLmdyYXBoaWNzRGF0YVtlXTtoLnR5cGU9PT1iLkdyYXBoaWNzLlBPTFk/KGguZmlsbCYmaC5wb2ludHMubGVuZ3RoPjYmJihoLnBvaW50cy5sZW5ndGg+MTA/KGc9Yi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGUoZCwxKSxiLldlYkdMR3JhcGhpY3MuYnVpbGRDb21wbGV4UG9seShoLGcpKTooZz1iLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZShkLDApLGIuV2ViR0xHcmFwaGljcy5idWlsZFBvbHkoaCxnKSkpLGgubGluZVdpZHRoPjAmJihnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMCksYi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZShoLGcpKSk6KGc9Yi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGUoZCwwKSxoLnR5cGU9PT1iLkdyYXBoaWNzLlJFQ1Q/Yi5XZWJHTEdyYXBoaWNzLmJ1aWxkUmVjdGFuZ2xlKGgsZyk6aC50eXBlPT09Yi5HcmFwaGljcy5DSVJDfHxoLnR5cGU9PT1iLkdyYXBoaWNzLkVMSVA/Yi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ2lyY2xlKGgsZyk6aC50eXBlPT09Yi5HcmFwaGljcy5SUkVDJiZiLldlYkdMR3JhcGhpY3MuYnVpbGRSb3VuZGVkUmVjdGFuZ2xlKGgsZykpLGQubGFzdEluZGV4Kyt9Zm9yKGU9MDtlPGQuZGF0YS5sZW5ndGg7ZSsrKWc9ZC5kYXRhW2VdLGcuZGlydHkmJmcudXBsb2FkKCl9LGIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ7cmV0dXJuIGEuZGF0YS5sZW5ndGg/KGQ9YS5kYXRhW2EuZGF0YS5sZW5ndGgtMV0sKGQubW9kZSE9PWN8fDE9PT1jKSYmKGQ9Yi5XZWJHTEdyYXBoaWNzLmdyYXBoaWNzRGF0YVBvb2wucG9wKCl8fG5ldyBiLldlYkdMR3JhcGhpY3NEYXRhKGEuZ2wpLGQubW9kZT1jLGEuZGF0YS5wdXNoKGQpKSk6KGQ9Yi5XZWJHTEdyYXBoaWNzLmdyYXBoaWNzRGF0YVBvb2wucG9wKCl8fG5ldyBiLldlYkdMR3JhcGhpY3NEYXRhKGEuZ2wpLGQubW9kZT1jLGEuZGF0YS5wdXNoKGQpKSxkLmRpcnR5PSEwLGR9LGIuV2ViR0xHcmFwaGljcy5idWlsZFJlY3RhbmdsZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzLGU9ZFswXSxmPWRbMV0sZz1kWzJdLGg9ZFszXTtpZihhLmZpbGwpe3ZhciBpPWIuaGV4MnJnYihhLmZpbGxDb2xvciksaj1hLmZpbGxBbHBoYSxrPWlbMF0qaixsPWlbMV0qaixtPWlbMl0qaixuPWMucG9pbnRzLG89Yy5pbmRpY2VzLHA9bi5sZW5ndGgvNjtuLnB1c2goZSxmKSxuLnB1c2goayxsLG0saiksbi5wdXNoKGUrZyxmKSxuLnB1c2goayxsLG0saiksbi5wdXNoKGUsZitoKSxuLnB1c2goayxsLG0saiksbi5wdXNoKGUrZyxmK2gpLG4ucHVzaChrLGwsbSxqKSxvLnB1c2gocCxwLHArMSxwKzIscCszLHArMyl9aWYoYS5saW5lV2lkdGgpe3ZhciBxPWEucG9pbnRzO2EucG9pbnRzPVtlLGYsZStnLGYsZStnLGYraCxlLGYraCxlLGZdLGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoYSxjKSxhLnBvaW50cz1xfX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUm91bmRlZFJlY3RhbmdsZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzLGU9ZFswXSxmPWRbMV0sZz1kWzJdLGg9ZFszXSxpPWRbNF0saj1bXTtpZihqLnB1c2goZSxmK2kpLGo9ai5jb25jYXQoYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlKGUsZitoLWksZSxmK2gsZStpLGYraCkpLGo9ai5jb25jYXQoYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlKGUrZy1pLGYraCxlK2csZitoLGUrZyxmK2gtaSkpLGo9ai5jb25jYXQoYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlKGUrZyxmK2ksZStnLGYsZStnLWksZikpLGo9ai5jb25jYXQoYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlKGUraSxmLGUsZixlLGYraSkpLGEuZmlsbCl7dmFyIGs9Yi5oZXgycmdiKGEuZmlsbENvbG9yKSxsPWEuZmlsbEFscGhhLG09a1swXSpsLG49a1sxXSpsLG89a1syXSpsLHA9Yy5wb2ludHMscT1jLmluZGljZXMscj1wLmxlbmd0aC82LHM9Yi5Qb2x5Sy5Ucmlhbmd1bGF0ZShqKSx0PTA7Zm9yKHQ9MDt0PHMubGVuZ3RoO3QrPTMpcS5wdXNoKHNbdF0rcikscS5wdXNoKHNbdF0rcikscS5wdXNoKHNbdCsxXStyKSxxLnB1c2goc1t0KzJdK3IpLHEucHVzaChzW3QrMl0rcik7Zm9yKHQ9MDt0PGoubGVuZ3RoO3QrKylwLnB1c2goalt0XSxqWysrdF0sbSxuLG8sbCl9aWYoYS5saW5lV2lkdGgpe3ZhciB1PWEucG9pbnRzO2EucG9pbnRzPWosYi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZShhLGMpLGEucG9pbnRzPXV9fSxiLldlYkdMR3JhcGhpY3MucXVhZHJhdGljQmV6aWVyQ3VydmU9ZnVuY3Rpb24oYSxiLGMsZCxlLGYpe2Z1bmN0aW9uIGcoYSxiLGMpe3ZhciBkPWItYTtyZXR1cm4gYStkKmN9Zm9yKHZhciBoLGksaixrLGwsbSxuPTIwLG89W10scD0wLHE9MDtuPj1xO3ErKylwPXEvbixoPWcoYSxjLHApLGk9ZyhiLGQscCksaj1nKGMsZSxwKSxrPWcoZCxmLHApLGw9ZyhoLGoscCksbT1nKGksayxwKSxvLnB1c2gobCxtKTtyZXR1cm4gb30sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ2lyY2xlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5wb2ludHMsZT1kWzBdLGY9ZFsxXSxnPWRbMl0saD1kWzNdLGk9NDAsaj0yKk1hdGguUEkvaSxrPTA7aWYoYS5maWxsKXt2YXIgbD1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLG09YS5maWxsQWxwaGEsbj1sWzBdKm0sbz1sWzFdKm0scD1sWzJdKm0scT1jLnBvaW50cyxyPWMuaW5kaWNlcyxzPXEubGVuZ3RoLzY7Zm9yKHIucHVzaChzKSxrPTA7aSsxPms7aysrKXEucHVzaChlLGYsbixvLHAsbSkscS5wdXNoKGUrTWF0aC5zaW4oaiprKSpnLGYrTWF0aC5jb3MoaiprKSpoLG4sbyxwLG0pLHIucHVzaChzKysscysrKTtyLnB1c2gocy0xKX1pZihhLmxpbmVXaWR0aCl7dmFyIHQ9YS5wb2ludHM7Zm9yKGEucG9pbnRzPVtdLGs9MDtpKzE+aztrKyspYS5wb2ludHMucHVzaChlK01hdGguc2luKGoqaykqZyxmK01hdGguY29zKGoqaykqaCk7Yi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZShhLGMpLGEucG9pbnRzPXR9fSxiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9MCxlPWEucG9pbnRzO2lmKDAhPT1lLmxlbmd0aCl7aWYoYS5saW5lV2lkdGglMilmb3IoZD0wO2Q8ZS5sZW5ndGg7ZCsrKWVbZF0rPS41O3ZhciBmPW5ldyBiLlBvaW50KGVbMF0sZVsxXSksZz1uZXcgYi5Qb2ludChlW2UubGVuZ3RoLTJdLGVbZS5sZW5ndGgtMV0pO2lmKGYueD09PWcueCYmZi55PT09Zy55KXtlPWUuc2xpY2UoKSxlLnBvcCgpLGUucG9wKCksZz1uZXcgYi5Qb2ludChlW2UubGVuZ3RoLTJdLGVbZS5sZW5ndGgtMV0pO3ZhciBoPWcueCsuNSooZi54LWcueCksaT1nLnkrLjUqKGYueS1nLnkpO2UudW5zaGlmdChoLGkpLGUucHVzaChoLGkpfXZhciBqLGssbCxtLG4sbyxwLHEscixzLHQsdSx2LHcseCx5LHosQSxCLEMsRCxFLEYsRz1jLnBvaW50cyxIPWMuaW5kaWNlcyxJPWUubGVuZ3RoLzIsSj1lLmxlbmd0aCxLPUcubGVuZ3RoLzYsTD1hLmxpbmVXaWR0aC8yLE09Yi5oZXgycmdiKGEubGluZUNvbG9yKSxOPWEubGluZUFscGhhLE89TVswXSpOLFA9TVsxXSpOLFE9TVsyXSpOO2ZvcihsPWVbMF0sbT1lWzFdLG49ZVsyXSxvPWVbM10scj0tKG0tbykscz1sLW4sRj1NYXRoLnNxcnQocipyK3Mqcyksci89RixzLz1GLHIqPUwscyo9TCxHLnB1c2gobC1yLG0tcyxPLFAsUSxOKSxHLnB1c2gobCtyLG0rcyxPLFAsUSxOKSxkPTE7SS0xPmQ7ZCsrKWw9ZVsyKihkLTEpXSxtPWVbMiooZC0xKSsxXSxuPWVbMipkXSxvPWVbMipkKzFdLHA9ZVsyKihkKzEpXSxxPWVbMiooZCsxKSsxXSxyPS0obS1vKSxzPWwtbixGPU1hdGguc3FydChyKnIrcypzKSxyLz1GLHMvPUYscio9TCxzKj1MLHQ9LShvLXEpLHU9bi1wLEY9TWF0aC5zcXJ0KHQqdCt1KnUpLHQvPUYsdS89Rix0Kj1MLHUqPUwseD0tcyttLSgtcytvKSx5PS1yK24tKC1yK2wpLHo9KC1yK2wpKigtcytvKS0oLXIrbikqKC1zK20pLEE9LXUrcS0oLXUrbyksQj0tdCtuLSgtdCtwKSxDPSgtdCtwKSooLXUrbyktKC10K24pKigtdStxKSxEPXgqQi1BKnksTWF0aC5hYnMoRCk8LjE/KEQrPTEwLjEsRy5wdXNoKG4tcixvLXMsTyxQLFEsTiksRy5wdXNoKG4rcixvK3MsTyxQLFEsTikpOihqPSh5KkMtQip6KS9ELGs9KEEqei14KkMpL0QsRT0oai1uKSooai1uKSsoay1vKSsoay1vKSxFPjE5NjAwPyh2PXItdCx3PXMtdSxGPU1hdGguc3FydCh2KnYrdyp3KSx2Lz1GLHcvPUYsdio9TCx3Kj1MLEcucHVzaChuLXYsby13KSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4rdixvK3cpLEcucHVzaChPLFAsUSxOKSxHLnB1c2gobi12LG8tdyksRy5wdXNoKE8sUCxRLE4pLEorKyk6KEcucHVzaChqLGspLEcucHVzaChPLFAsUSxOKSxHLnB1c2gobi0oai1uKSxvLShrLW8pKSxHLnB1c2goTyxQLFEsTikpKTtmb3IobD1lWzIqKEktMildLG09ZVsyKihJLTIpKzFdLG49ZVsyKihJLTEpXSxvPWVbMiooSS0xKSsxXSxyPS0obS1vKSxzPWwtbixGPU1hdGguc3FydChyKnIrcypzKSxyLz1GLHMvPUYscio9TCxzKj1MLEcucHVzaChuLXIsby1zKSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4rcixvK3MpLEcucHVzaChPLFAsUSxOKSxILnB1c2goSyksZD0wO0o+ZDtkKyspSC5wdXNoKEsrKyk7SC5wdXNoKEstMSl9fSxiLldlYkdMR3JhcGhpY3MuYnVpbGRDb21wbGV4UG9seT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzLnNsaWNlKCk7aWYoIShkLmxlbmd0aDw2KSl7dmFyIGU9Yy5pbmRpY2VzO2MucG9pbnRzPWQsYy5hbHBoYT1hLmZpbGxBbHBoYSxjLmNvbG9yPWIuaGV4MnJnYihhLmZpbGxDb2xvcik7Zm9yKHZhciBmLGcsaD0xLzAsaT0tMS8wLGo9MS8wLGs9LTEvMCxsPTA7bDxkLmxlbmd0aDtsKz0yKWY9ZFtsXSxnPWRbbCsxXSxoPWg+Zj9mOmgsaT1mPmk/ZjppLGo9aj5nP2c6aixrPWc+az9nOms7ZC5wdXNoKGgsaixpLGosaSxrLGgsayk7dmFyIG09ZC5sZW5ndGgvMjtmb3IobD0wO20+bDtsKyspZS5wdXNoKGwpfX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUG9seT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzO2lmKCEoZC5sZW5ndGg8Nikpe3ZhciBlPWMucG9pbnRzLGY9Yy5pbmRpY2VzLGc9ZC5sZW5ndGgvMixoPWIuaGV4MnJnYihhLmZpbGxDb2xvciksaT1hLmZpbGxBbHBoYSxqPWhbMF0qaSxrPWhbMV0qaSxsPWhbMl0qaSxtPWIuUG9seUsuVHJpYW5ndWxhdGUoZCksbj1lLmxlbmd0aC82LG89MDtmb3Iobz0wO288bS5sZW5ndGg7bys9MylmLnB1c2gobVtvXStuKSxmLnB1c2gobVtvXStuKSxmLnB1c2gobVtvKzFdK24pLGYucHVzaChtW28rMl0rbiksZi5wdXNoKG1bbysyXStuKTtmb3Iobz0wO2c+bztvKyspZS5wdXNoKGRbMipvXSxkWzIqbysxXSxqLGssbCxpKX19LGIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sPVtdLGIuV2ViR0xHcmFwaGljc0RhdGE9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMuY29sb3I9WzAsMCwwXSx0aGlzLnBvaW50cz1bXSx0aGlzLmluZGljZXM9W10sdGhpcy5sYXN0SW5kZXg9MCx0aGlzLmJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuaW5kZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLm1vZGU9MSx0aGlzLmFscGhhPTEsdGhpcy5kaXJ0eT0hMH0sYi5XZWJHTEdyYXBoaWNzRGF0YS5wcm90b3R5cGUucmVzZXQ9ZnVuY3Rpb24oKXt0aGlzLnBvaW50cz1bXSx0aGlzLmluZGljZXM9W10sdGhpcy5sYXN0SW5kZXg9MH0sYi5XZWJHTEdyYXBoaWNzRGF0YS5wcm90b3R5cGUudXBsb2FkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDt0aGlzLmdsUG9pbnRzPW5ldyBGbG9hdDMyQXJyYXkodGhpcy5wb2ludHMpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLmJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMuZ2xQb2ludHMsYS5TVEFUSUNfRFJBVyksdGhpcy5nbEluZGljaWVzPW5ldyBVaW50MTZBcnJheSh0aGlzLmluZGljZXMpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuZ2xJbmRpY2llcyxhLlNUQVRJQ19EUkFXKSx0aGlzLmRpcnR5PSExfSxiLmdsQ29udGV4dHM9W10sYi5XZWJHTFJlbmRlcmVyPWZ1bmN0aW9uKGEsYyxkLGUsZixnKXtiLmRlZmF1bHRSZW5kZXJlcnx8KGIuc2F5SGVsbG8oXCJ3ZWJHTFwiKSxiLmRlZmF1bHRSZW5kZXJlcj10aGlzKSx0aGlzLnR5cGU9Yi5XRUJHTF9SRU5ERVJFUix0aGlzLnRyYW5zcGFyZW50PSEhZSx0aGlzLnByZXNlcnZlRHJhd2luZ0J1ZmZlcj1nLHRoaXMud2lkdGg9YXx8ODAwLHRoaXMuaGVpZ2h0PWN8fDYwMCx0aGlzLnZpZXc9ZHx8ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSx0aGlzLnZpZXcud2lkdGg9dGhpcy53aWR0aCx0aGlzLnZpZXcuaGVpZ2h0PXRoaXMuaGVpZ2h0LHRoaXMuY29udGV4dExvc3Q9dGhpcy5oYW5kbGVDb250ZXh0TG9zdC5iaW5kKHRoaXMpLHRoaXMuY29udGV4dFJlc3RvcmVkTG9zdD10aGlzLmhhbmRsZUNvbnRleHRSZXN0b3JlZC5iaW5kKHRoaXMpLHRoaXMudmlldy5hZGRFdmVudExpc3RlbmVyKFwid2ViZ2xjb250ZXh0bG9zdFwiLHRoaXMuY29udGV4dExvc3QsITEpLHRoaXMudmlldy5hZGRFdmVudExpc3RlbmVyKFwid2ViZ2xjb250ZXh0cmVzdG9yZWRcIix0aGlzLmNvbnRleHRSZXN0b3JlZExvc3QsITEpLHRoaXMub3B0aW9ucz17YWxwaGE6dGhpcy50cmFuc3BhcmVudCxhbnRpYWxpYXM6ISFmLHByZW11bHRpcGxpZWRBbHBoYTohIWUsc3RlbmNpbDohMCxwcmVzZXJ2ZURyYXdpbmdCdWZmZXI6Z307dmFyIGg9bnVsbDtpZihbXCJleHBlcmltZW50YWwtd2ViZ2xcIixcIndlYmdsXCJdLmZvckVhY2goZnVuY3Rpb24oYSl7dHJ5e2g9aHx8dGhpcy52aWV3LmdldENvbnRleHQoYSx0aGlzLm9wdGlvbnMpfWNhdGNoKGIpe319LHRoaXMpLCFoKXRocm93IG5ldyBFcnJvcihcIlRoaXMgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHdlYkdMLiBUcnkgdXNpbmcgdGhlIGNhbnZhcyByZW5kZXJlclwiK3RoaXMpO3RoaXMuZ2w9aCx0aGlzLmdsQ29udGV4dElkPWguaWQ9Yi5XZWJHTFJlbmRlcmVyLmdsQ29udGV4dElkKyssYi5nbENvbnRleHRzW3RoaXMuZ2xDb250ZXh0SWRdPWgsYi5ibGVuZE1vZGVzV2ViR0x8fChiLmJsZW5kTW9kZXNXZWJHTD1bXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTk9STUFMXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuQUREXT1baC5TUkNfQUxQSEEsaC5EU1RfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5NVUxUSVBMWV09W2guRFNUX0NPTE9SLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLlNDUkVFTl09W2guU1JDX0FMUEhBLGguT05FXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuT1ZFUkxBWV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkRBUktFTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkxJR0hURU5dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5DT0xPUl9ET0RHRV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkNPTE9SX0JVUk5dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5IQVJEX0xJR0hUXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuU09GVF9MSUdIVF09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkRJRkZFUkVOQ0VdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5FWENMVVNJT05dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5IVUVdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5TQVRVUkFUSU9OXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuQ09MT1JdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5MVU1JTk9TSVRZXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSksdGhpcy5wcm9qZWN0aW9uPW5ldyBiLlBvaW50LHRoaXMucHJvamVjdGlvbi54PXRoaXMud2lkdGgvMix0aGlzLnByb2plY3Rpb24ueT0tdGhpcy5oZWlnaHQvMix0aGlzLm9mZnNldD1uZXcgYi5Qb2ludCgwLDApLHRoaXMucmVzaXplKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMuY29udGV4dExvc3Q9ITEsdGhpcy5zaGFkZXJNYW5hZ2VyPW5ldyBiLldlYkdMU2hhZGVyTWFuYWdlcihoKSx0aGlzLnNwcml0ZUJhdGNoPW5ldyBiLldlYkdMU3ByaXRlQmF0Y2goaCksdGhpcy5tYXNrTWFuYWdlcj1uZXcgYi5XZWJHTE1hc2tNYW5hZ2VyKGgpLHRoaXMuZmlsdGVyTWFuYWdlcj1uZXcgYi5XZWJHTEZpbHRlck1hbmFnZXIoaCx0aGlzLnRyYW5zcGFyZW50KSx0aGlzLnN0ZW5jaWxNYW5hZ2VyPW5ldyBiLldlYkdMU3RlbmNpbE1hbmFnZXIoaCksdGhpcy5ibGVuZE1vZGVNYW5hZ2VyPW5ldyBiLldlYkdMQmxlbmRNb2RlTWFuYWdlcihoKSx0aGlzLnJlbmRlclNlc3Npb249e30sdGhpcy5yZW5kZXJTZXNzaW9uLmdsPXRoaXMuZ2wsdGhpcy5yZW5kZXJTZXNzaW9uLmRyYXdDb3VudD0wLHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyPXRoaXMuc2hhZGVyTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24ubWFza01hbmFnZXI9dGhpcy5tYXNrTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24uZmlsdGVyTWFuYWdlcj10aGlzLmZpbHRlck1hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXI9dGhpcy5ibGVuZE1vZGVNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5zcHJpdGVCYXRjaD10aGlzLnNwcml0ZUJhdGNoLHRoaXMucmVuZGVyU2Vzc2lvbi5zdGVuY2lsTWFuYWdlcj10aGlzLnN0ZW5jaWxNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5yZW5kZXJlcj10aGlzLGgudXNlUHJvZ3JhbSh0aGlzLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlci5wcm9ncmFtKSxoLmRpc2FibGUoaC5ERVBUSF9URVNUKSxoLmRpc2FibGUoaC5DVUxMX0ZBQ0UpLGguZW5hYmxlKGguQkxFTkQpLGguY29sb3JNYXNrKCEwLCEwLCEwLHRoaXMudHJhbnNwYXJlbnQpfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuV2ViR0xSZW5kZXJlcixiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlcj1mdW5jdGlvbihhKXtpZighdGhpcy5jb250ZXh0TG9zdCl7dGhpcy5fX3N0YWdlIT09YSYmKGEuaW50ZXJhY3RpdmUmJmEuaW50ZXJhY3Rpb25NYW5hZ2VyLnJlbW92ZUV2ZW50cygpLHRoaXMuX19zdGFnZT1hKSxiLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZXMoKSxhLnVwZGF0ZVRyYW5zZm9ybSgpLGEuX2ludGVyYWN0aXZlJiYoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZHx8KGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQ9ITAsYS5pbnRlcmFjdGlvbk1hbmFnZXIuc2V0VGFyZ2V0KHRoaXMpKSk7dmFyIGM9dGhpcy5nbDtjLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSxjLmJpbmRGcmFtZWJ1ZmZlcihjLkZSQU1FQlVGRkVSLG51bGwpLHRoaXMudHJhbnNwYXJlbnQ/Yy5jbGVhckNvbG9yKDAsMCwwLDApOmMuY2xlYXJDb2xvcihhLmJhY2tncm91bmRDb2xvclNwbGl0WzBdLGEuYmFja2dyb3VuZENvbG9yU3BsaXRbMV0sYS5iYWNrZ3JvdW5kQ29sb3JTcGxpdFsyXSwxKSxjLmNsZWFyKGMuQ09MT1JfQlVGRkVSX0JJVCksdGhpcy5yZW5kZXJEaXNwbGF5T2JqZWN0KGEsdGhpcy5wcm9qZWN0aW9uKSxhLmludGVyYWN0aXZlP2EuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWR8fChhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSEwLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSk6YS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZCYmKGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQ9ITEsYS5pbnRlcmFjdGlvbk1hbmFnZXIuc2V0VGFyZ2V0KHRoaXMpKX19LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyRGlzcGxheU9iamVjdD1mdW5jdGlvbihhLGMsZCl7dGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKGIuYmxlbmRNb2Rlcy5OT1JNQUwpLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQ9MCx0aGlzLnJlbmRlclNlc3Npb24uY3VycmVudEJsZW5kTW9kZT05OTk5LHRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uPWMsdGhpcy5yZW5kZXJTZXNzaW9uLm9mZnNldD10aGlzLm9mZnNldCx0aGlzLnNwcml0ZUJhdGNoLmJlZ2luKHRoaXMucmVuZGVyU2Vzc2lvbiksdGhpcy5maWx0ZXJNYW5hZ2VyLmJlZ2luKHRoaXMucmVuZGVyU2Vzc2lvbixkKSxhLl9yZW5kZXJXZWJHTCh0aGlzLnJlbmRlclNlc3Npb24pLHRoaXMuc3ByaXRlQmF0Y2guZW5kKCl9LGIuV2ViR0xSZW5kZXJlci51cGRhdGVUZXh0dXJlcz1mdW5jdGlvbigpe3ZhciBhPTA7Zm9yKGE9MDthPGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMubGVuZ3RoO2ErKyliLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZUZyYW1lKGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXNbYV0pO2ZvcihhPTA7YTxiLnRleHR1cmVzVG9EZXN0cm95Lmxlbmd0aDthKyspYi5XZWJHTFJlbmRlcmVyLmRlc3Ryb3lUZXh0dXJlKGIudGV4dHVyZXNUb0Rlc3Ryb3lbYV0pO2IudGV4dHVyZXNUb1VwZGF0ZS5sZW5ndGg9MCxiLnRleHR1cmVzVG9EZXN0cm95Lmxlbmd0aD0wLGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMubGVuZ3RoPTB9LGIuV2ViR0xSZW5kZXJlci5kZXN0cm95VGV4dHVyZT1mdW5jdGlvbihhKXtmb3IodmFyIGM9YS5fZ2xUZXh0dXJlcy5sZW5ndGgtMTtjPj0wO2MtLSl7dmFyIGQ9YS5fZ2xUZXh0dXJlc1tjXSxlPWIuZ2xDb250ZXh0c1tjXTtcclxuZSYmZCYmZS5kZWxldGVUZXh0dXJlKGQpfWEuX2dsVGV4dHVyZXMubGVuZ3RoPTB9LGIuV2ViR0xSZW5kZXJlci51cGRhdGVUZXh0dXJlRnJhbWU9ZnVuY3Rpb24oYSl7YS5fdXBkYXRlV2ViR0x1dnMoKX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yix0aGlzLnZpZXcud2lkdGg9YSx0aGlzLnZpZXcuaGVpZ2h0PWIsdGhpcy5nbC52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5wcm9qZWN0aW9uLng9dGhpcy53aWR0aC8yLHRoaXMucHJvamVjdGlvbi55PS10aGlzLmhlaWdodC8yfSxiLmNyZWF0ZVdlYkdMVGV4dHVyZT1mdW5jdGlvbihhLGMpe3JldHVybiBhLmhhc0xvYWRlZCYmKGEuX2dsVGV4dHVyZXNbYy5pZF09Yy5jcmVhdGVUZXh0dXJlKCksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsYS5fZ2xUZXh0dXJlc1tjLmlkXSksYy5waXhlbFN0b3JlaShjLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCxhLnByZW11bHRpcGxpZWRBbHBoYSksYy50ZXhJbWFnZTJEKGMuVEVYVFVSRV8yRCwwLGMuUkdCQSxjLlJHQkEsYy5VTlNJR05FRF9CWVRFLGEuc291cmNlKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9NQUdfRklMVEVSLGEuc2NhbGVNb2RlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9jLkxJTkVBUjpjLk5FQVJFU1QpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01JTl9GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYS5fcG93ZXJPZjI/KGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfUyxjLlJFUEVBVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuUkVQRUFUKSk6KGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfUyxjLkNMQU1QX1RPX0VER0UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfVCxjLkNMQU1QX1RPX0VER0UpKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxudWxsKSxhLl9kaXJ0eVtjLmlkXT0hMSksYS5fZ2xUZXh0dXJlc1tjLmlkXX0sYi51cGRhdGVXZWJHTFRleHR1cmU9ZnVuY3Rpb24oYSxjKXthLl9nbFRleHR1cmVzW2MuaWRdJiYoYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsYS5fZ2xUZXh0dXJlc1tjLmlkXSksYy5waXhlbFN0b3JlaShjLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCxhLnByZW11bHRpcGxpZWRBbHBoYSksYy50ZXhJbWFnZTJEKGMuVEVYVFVSRV8yRCwwLGMuUkdCQSxjLlJHQkEsYy5VTlNJR05FRF9CWVRFLGEuc291cmNlKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9NQUdfRklMVEVSLGEuc2NhbGVNb2RlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9jLkxJTkVBUjpjLk5FQVJFU1QpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01JTl9GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYS5fcG93ZXJPZjI/KGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfUyxjLlJFUEVBVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuUkVQRUFUKSk6KGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfUyxjLkNMQU1QX1RPX0VER0UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX1dSQVBfVCxjLkNMQU1QX1RPX0VER0UpKSxhLl9kaXJ0eVtjLmlkXT0hMSl9LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlQ29udGV4dExvc3Q9ZnVuY3Rpb24oYSl7YS5wcmV2ZW50RGVmYXVsdCgpLHRoaXMuY29udGV4dExvc3Q9ITB9LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlQ29udGV4dFJlc3RvcmVkPWZ1bmN0aW9uKCl7dHJ5e3RoaXMuZ2w9dGhpcy52aWV3LmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIix0aGlzLm9wdGlvbnMpfWNhdGNoKGEpe3RyeXt0aGlzLmdsPXRoaXMudmlldy5nZXRDb250ZXh0KFwid2ViZ2xcIix0aGlzLm9wdGlvbnMpfWNhdGNoKGMpe3Rocm93IG5ldyBFcnJvcihcIiBUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB3ZWJHTC4gVHJ5IHVzaW5nIHRoZSBjYW52YXMgcmVuZGVyZXJcIit0aGlzKX19dmFyIGQ9dGhpcy5nbDtkLmlkPWIuV2ViR0xSZW5kZXJlci5nbENvbnRleHRJZCsrLHRoaXMuc2hhZGVyTWFuYWdlci5zZXRDb250ZXh0KGQpLHRoaXMuc3ByaXRlQmF0Y2guc2V0Q29udGV4dChkKSx0aGlzLnByaW1pdGl2ZUJhdGNoLnNldENvbnRleHQoZCksdGhpcy5tYXNrTWFuYWdlci5zZXRDb250ZXh0KGQpLHRoaXMuZmlsdGVyTWFuYWdlci5zZXRDb250ZXh0KGQpLHRoaXMucmVuZGVyU2Vzc2lvbi5nbD10aGlzLmdsLGQuZGlzYWJsZShkLkRFUFRIX1RFU1QpLGQuZGlzYWJsZShkLkNVTExfRkFDRSksZC5lbmFibGUoZC5CTEVORCksZC5jb2xvck1hc2soITAsITAsITAsdGhpcy50cmFuc3BhcmVudCksdGhpcy5nbC52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCk7Zm9yKHZhciBlIGluIGIuVGV4dHVyZUNhY2hlKXt2YXIgZj1iLlRleHR1cmVDYWNoZVtlXS5iYXNlVGV4dHVyZTtmLl9nbFRleHR1cmVzPVtdfXRoaXMuY29udGV4dExvc3Q9ITF9LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMudmlldy5yZW1vdmVFdmVudExpc3RlbmVyKFwid2ViZ2xjb250ZXh0bG9zdFwiLHRoaXMuY29udGV4dExvc3QpLHRoaXMudmlldy5yZW1vdmVFdmVudExpc3RlbmVyKFwid2ViZ2xjb250ZXh0cmVzdG9yZWRcIix0aGlzLmNvbnRleHRSZXN0b3JlZExvc3QpLGIuZ2xDb250ZXh0c1t0aGlzLmdsQ29udGV4dElkXT1udWxsLHRoaXMucHJvamVjdGlvbj1udWxsLHRoaXMub2Zmc2V0PW51bGwsdGhpcy5zaGFkZXJNYW5hZ2VyLmRlc3Ryb3koKSx0aGlzLnNwcml0ZUJhdGNoLmRlc3Ryb3koKSx0aGlzLnByaW1pdGl2ZUJhdGNoLmRlc3Ryb3koKSx0aGlzLm1hc2tNYW5hZ2VyLmRlc3Ryb3koKSx0aGlzLmZpbHRlck1hbmFnZXIuZGVzdHJveSgpLHRoaXMuc2hhZGVyTWFuYWdlcj1udWxsLHRoaXMuc3ByaXRlQmF0Y2g9bnVsbCx0aGlzLm1hc2tNYW5hZ2VyPW51bGwsdGhpcy5maWx0ZXJNYW5hZ2VyPW51bGwsdGhpcy5nbD1udWxsLHRoaXMucmVuZGVyU2Vzc2lvbj1udWxsfSxiLldlYkdMUmVuZGVyZXIuZ2xDb250ZXh0SWQ9MCxiLldlYkdMQmxlbmRNb2RlTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy5jdXJyZW50QmxlbmRNb2RlPTk5OTk5fSxiLldlYkdMQmxlbmRNb2RlTWFuYWdlci5wcm90b3R5cGUuc2V0QmxlbmRNb2RlPWZ1bmN0aW9uKGEpe2lmKHRoaXMuY3VycmVudEJsZW5kTW9kZT09PWEpcmV0dXJuITE7dGhpcy5jdXJyZW50QmxlbmRNb2RlPWE7dmFyIGM9Yi5ibGVuZE1vZGVzV2ViR0xbdGhpcy5jdXJyZW50QmxlbmRNb2RlXTtyZXR1cm4gdGhpcy5nbC5ibGVuZEZ1bmMoY1swXSxjWzFdKSwhMH0sYi5XZWJHTEJsZW5kTW9kZU1hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsPW51bGx9LGIuV2ViR0xNYXNrTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLm1hc2tTdGFjaz1bXSx0aGlzLm1hc2tQb3NpdGlvbj0wLHRoaXMuc2V0Q29udGV4dChhKSx0aGlzLnJldmVyc2U9ITEsdGhpcy5jb3VudD0wfSxiLldlYkdMTWFza01hbmFnZXIucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hfSxiLldlYkdMTWFza01hbmFnZXIucHJvdG90eXBlLnB1c2hNYXNrPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9Yy5nbDthLmRpcnR5JiZiLldlYkdMR3JhcGhpY3MudXBkYXRlR3JhcGhpY3MoYSxkKSxhLl93ZWJHTFtkLmlkXS5kYXRhLmxlbmd0aCYmYy5zdGVuY2lsTWFuYWdlci5wdXNoU3RlbmNpbChhLGEuX3dlYkdMW2QuaWRdLmRhdGFbMF0sYyl9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUucG9wTWFzaz1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuZ2w7Yi5zdGVuY2lsTWFuYWdlci5wb3BTdGVuY2lsKGEsYS5fd2ViR0xbYy5pZF0uZGF0YVswXSxiKX0sYi5XZWJHTE1hc2tNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5tYXNrU3RhY2s9bnVsbCx0aGlzLmdsPW51bGx9LGIuV2ViR0xTdGVuY2lsTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLnN0ZW5jaWxTdGFjaz1bXSx0aGlzLnNldENvbnRleHQoYSksdGhpcy5yZXZlcnNlPSEwLHRoaXMuY291bnQ9MH0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YX0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyLnByb3RvdHlwZS5wdXNoU3RlbmNpbD1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5nbDt0aGlzLmJpbmRHcmFwaGljcyhhLGIsYyksMD09PXRoaXMuc3RlbmNpbFN0YWNrLmxlbmd0aCYmKGQuZW5hYmxlKGQuU1RFTkNJTF9URVNUKSxkLmNsZWFyKGQuU1RFTkNJTF9CVUZGRVJfQklUKSx0aGlzLnJldmVyc2U9ITAsdGhpcy5jb3VudD0wKSx0aGlzLnN0ZW5jaWxTdGFjay5wdXNoKGIpO3ZhciBlPXRoaXMuY291bnQ7ZC5jb2xvck1hc2soITEsITEsITEsITEpLGQuc3RlbmNpbEZ1bmMoZC5BTFdBWVMsMCwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTlZFUlQpLDE9PT1iLm1vZGU/KGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfRkFOLGIuaW5kaWNlcy5sZW5ndGgtNCxkLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmV2ZXJzZT8oZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS1lLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLkRFQ1IpKTooZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5DUikpLGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfRkFOLDQsZC5VTlNJR05FRF9TSE9SVCwyKihiLmluZGljZXMubGVuZ3RoLTQpKSx0aGlzLnJldmVyc2U/ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS0oZSsxKSwyNTUpOmQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KSx0aGlzLnJldmVyc2U9IXRoaXMucmV2ZXJzZSk6KHRoaXMucmV2ZXJzZT8oZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5DUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpLGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfU1RSSVAsYi5pbmRpY2VzLmxlbmd0aCxkLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmV2ZXJzZT9kLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSsxLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS0oZSsxKSwyNTUpKSxkLmNvbG9yTWFzayghMCwhMCwhMCwhMCksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLktFRVApLHRoaXMuY291bnQrK30sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyLnByb3RvdHlwZS5iaW5kR3JhcGhpY3M9ZnVuY3Rpb24oYSxjLGQpe3RoaXMuX2N1cnJlbnRHcmFwaGljcz1hO3ZhciBlLGY9dGhpcy5nbCxnPWQucHJvamVjdGlvbixoPWQub2Zmc2V0OzE9PT1jLm1vZGU/KGU9ZC5zaGFkZXJNYW5hZ2VyLmNvbXBsZXhQcmltYXRpdmVTaGFkZXIsZC5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihlKSxmLnVuaWZvcm1NYXRyaXgzZnYoZS50cmFuc2xhdGlvbk1hdHJpeCwhMSxhLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApKSxmLnVuaWZvcm0yZihlLnByb2plY3Rpb25WZWN0b3IsZy54LC1nLnkpLGYudW5pZm9ybTJmKGUub2Zmc2V0VmVjdG9yLC1oLngsLWgueSksZi51bmlmb3JtM2Z2KGUudGludENvbG9yLGIuaGV4MnJnYihhLnRpbnQpKSxmLnVuaWZvcm0zZnYoZS5jb2xvcixjLmNvbG9yKSxmLnVuaWZvcm0xZihlLmFscGhhLGEud29ybGRBbHBoYSpjLmFscGhhKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsYy5idWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihlLmFWZXJ0ZXhQb3NpdGlvbiwyLGYuRkxPQVQsITEsOCwwKSxmLmJpbmRCdWZmZXIoZi5FTEVNRU5UX0FSUkFZX0JVRkZFUixjLmluZGV4QnVmZmVyKSk6KGU9ZC5zaGFkZXJNYW5hZ2VyLnByaW1pdGl2ZVNoYWRlcixkLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGUpLGYudW5pZm9ybU1hdHJpeDNmdihlLnRyYW5zbGF0aW9uTWF0cml4LCExLGEud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCkpLGYudW5pZm9ybTJmKGUucHJvamVjdGlvblZlY3RvcixnLngsLWcueSksZi51bmlmb3JtMmYoZS5vZmZzZXRWZWN0b3IsLWgueCwtaC55KSxmLnVuaWZvcm0zZnYoZS50aW50Q29sb3IsYi5oZXgycmdiKGEudGludCkpLGYudW5pZm9ybTFmKGUuYWxwaGEsYS53b3JsZEFscGhhKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsYy5idWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihlLmFWZXJ0ZXhQb3NpdGlvbiwyLGYuRkxPQVQsITEsMjQsMCksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGUuY29sb3JBdHRyaWJ1dGUsNCxmLkZMT0FULCExLDI0LDgpLGYuYmluZEJ1ZmZlcihmLkVMRU1FTlRfQVJSQVlfQlVGRkVSLGMuaW5kZXhCdWZmZXIpKX0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyLnByb3RvdHlwZS5wb3BTdGVuY2lsPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmdsO2lmKHRoaXMuc3RlbmNpbFN0YWNrLnBvcCgpLHRoaXMuY291bnQtLSwwPT09dGhpcy5zdGVuY2lsU3RhY2subGVuZ3RoKWQuZGlzYWJsZShkLlNURU5DSUxfVEVTVCk7ZWxzZXt2YXIgZT10aGlzLmNvdW50O3RoaXMuYmluZEdyYXBoaWNzKGEsYixjKSxkLmNvbG9yTWFzayghMSwhMSwhMSwhMSksMT09PWIubW9kZT8odGhpcy5yZXZlcnNlPSF0aGlzLnJldmVyc2UsdGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOQ1IpKTooZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUrMSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5ERUNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sNCxkLlVOU0lHTkVEX1NIT1JULDIqKGIuaW5kaWNlcy5sZW5ndGgtNCkpLGQuc3RlbmNpbEZ1bmMoZC5BTFdBWVMsMCwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTlZFUlQpLGQuZHJhd0VsZW1lbnRzKGQuVFJJQU5HTEVfRkFOLGIuaW5kaWNlcy5sZW5ndGgtNCxkLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmV2ZXJzZT9kLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpOmQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtZSwyNTUpKToodGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSsxLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLkRFQ1IpKTooZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS0oZSsxKSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9TVFJJUCxiLmluZGljZXMubGVuZ3RoLGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCxlLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS1lLDI1NSkpLGQuY29sb3JNYXNrKCEwLCEwLCEwLCEwKSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuS0VFUCl9fSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLm1hc2tTdGFjaz1udWxsLHRoaXMuZ2w9bnVsbH0sYi5XZWJHTFNoYWRlck1hbmFnZXI9ZnVuY3Rpb24oYSl7dGhpcy5tYXhBdHRpYnM9MTAsdGhpcy5hdHRyaWJTdGF0ZT1bXSx0aGlzLnRlbXBBdHRyaWJTdGF0ZT1bXSx0aGlzLnNoYWRlck1hcD1bXTtmb3IodmFyIGI9MDtiPHRoaXMubWF4QXR0aWJzO2IrKyl0aGlzLmF0dHJpYlN0YXRlW2JdPSExO3RoaXMuc2V0Q29udGV4dChhKX0sYi5XZWJHTFNoYWRlck1hbmFnZXIucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMucHJpbWl0aXZlU2hhZGVyPW5ldyBiLlByaW1pdGl2ZVNoYWRlcihhKSx0aGlzLmNvbXBsZXhQcmltYXRpdmVTaGFkZXI9bmV3IGIuQ29tcGxleFByaW1pdGl2ZVNoYWRlcihhKSx0aGlzLmRlZmF1bHRTaGFkZXI9bmV3IGIuUGl4aVNoYWRlcihhKSx0aGlzLmZhc3RTaGFkZXI9bmV3IGIuUGl4aUZhc3RTaGFkZXIoYSksdGhpcy5zdHJpcFNoYWRlcj1uZXcgYi5TdHJpcFNoYWRlcihhKSx0aGlzLnNldFNoYWRlcih0aGlzLmRlZmF1bHRTaGFkZXIpfSxiLldlYkdMU2hhZGVyTWFuYWdlci5wcm90b3R5cGUuc2V0QXR0cmlicz1mdW5jdGlvbihhKXt2YXIgYjtmb3IoYj0wO2I8dGhpcy50ZW1wQXR0cmliU3RhdGUubGVuZ3RoO2IrKyl0aGlzLnRlbXBBdHRyaWJTdGF0ZVtiXT0hMTtmb3IoYj0wO2I8YS5sZW5ndGg7YisrKXt2YXIgYz1hW2JdO3RoaXMudGVtcEF0dHJpYlN0YXRlW2NdPSEwfXZhciBkPXRoaXMuZ2w7Zm9yKGI9MDtiPHRoaXMuYXR0cmliU3RhdGUubGVuZ3RoO2IrKyl0aGlzLmF0dHJpYlN0YXRlW2JdIT09dGhpcy50ZW1wQXR0cmliU3RhdGVbYl0mJih0aGlzLmF0dHJpYlN0YXRlW2JdPXRoaXMudGVtcEF0dHJpYlN0YXRlW2JdLHRoaXMudGVtcEF0dHJpYlN0YXRlW2JdP2QuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoYik6ZC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkoYikpfSxiLldlYkdMU2hhZGVyTWFuYWdlci5wcm90b3R5cGUuc2V0U2hhZGVyPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLl9jdXJyZW50SWQ9PT1hLl9VSUQ/ITE6KHRoaXMuX2N1cnJlbnRJZD1hLl9VSUQsdGhpcy5jdXJyZW50U2hhZGVyPWEsdGhpcy5nbC51c2VQcm9ncmFtKGEucHJvZ3JhbSksdGhpcy5zZXRBdHRyaWJzKGEuYXR0cmlidXRlcyksITApfSxiLldlYkdMU2hhZGVyTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuYXR0cmliU3RhdGU9bnVsbCx0aGlzLnRlbXBBdHRyaWJTdGF0ZT1udWxsLHRoaXMucHJpbWl0aXZlU2hhZGVyLmRlc3Ryb3koKSx0aGlzLmRlZmF1bHRTaGFkZXIuZGVzdHJveSgpLHRoaXMuZmFzdFNoYWRlci5kZXN0cm95KCksdGhpcy5zdHJpcFNoYWRlci5kZXN0cm95KCksdGhpcy5nbD1udWxsfSxiLldlYkdMU3ByaXRlQmF0Y2g9ZnVuY3Rpb24oYSl7dGhpcy52ZXJ0U2l6ZT02LHRoaXMuc2l6ZT0yZTM7dmFyIGI9NCp0aGlzLnNpemUqdGhpcy52ZXJ0U2l6ZSxjPTYqdGhpcy5zaXplO3RoaXMudmVydGljZXM9bmV3IEZsb2F0MzJBcnJheShiKSx0aGlzLmluZGljZXM9bmV3IFVpbnQxNkFycmF5KGMpLHRoaXMubGFzdEluZGV4Q291bnQ9MDtmb3IodmFyIGQ9MCxlPTA7Yz5kO2QrPTYsZSs9NCl0aGlzLmluZGljZXNbZCswXT1lKzAsdGhpcy5pbmRpY2VzW2QrMV09ZSsxLHRoaXMuaW5kaWNlc1tkKzJdPWUrMix0aGlzLmluZGljZXNbZCszXT1lKzAsdGhpcy5pbmRpY2VzW2QrNF09ZSsyLHRoaXMuaW5kaWNlc1tkKzVdPWUrMzt0aGlzLmRyYXdpbmc9ITEsdGhpcy5jdXJyZW50QmF0Y2hTaXplPTAsdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9bnVsbCx0aGlzLnNldENvbnRleHQoYSksdGhpcy5kaXJ0eT0hMCx0aGlzLnRleHR1cmVzPVtdLHRoaXMuYmxlbmRNb2Rlcz1bXX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLnZlcnRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuaW5kZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGljZXMsYS5TVEFUSUNfRFJBVyksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNlcyxhLkRZTkFNSUNfRFJBVyksdGhpcy5jdXJyZW50QmxlbmRNb2RlPTk5OTk5fSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLmJlZ2luPWZ1bmN0aW9uKGEpe3RoaXMucmVuZGVyU2Vzc2lvbj1hLHRoaXMuc2hhZGVyPXRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLmRlZmF1bHRTaGFkZXIsdGhpcy5zdGFydCgpfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLmVuZD1mdW5jdGlvbigpe3RoaXMuZmx1c2goKX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7dmFyIGI9YS50ZXh0dXJlO3RoaXMuY3VycmVudEJhdGNoU2l6ZT49dGhpcy5zaXplJiYodGhpcy5mbHVzaCgpLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPWIuYmFzZVRleHR1cmUpO3ZhciBjPWIuX3V2cztpZihjKXt2YXIgZCxlLGYsZyxoPWEud29ybGRBbHBoYSxpPWEudGludCxqPXRoaXMudmVydGljZXMsaz1hLmFuY2hvci54LGw9YS5hbmNob3IueTtpZihiLnRyaW0pe3ZhciBtPWIudHJpbTtlPW0ueC1rKm0ud2lkdGgsZD1lK2IuY3JvcC53aWR0aCxnPW0ueS1sKm0uaGVpZ2h0LGY9ZytiLmNyb3AuaGVpZ2h0fWVsc2UgZD1iLmZyYW1lLndpZHRoKigxLWspLGU9Yi5mcmFtZS53aWR0aCotayxmPWIuZnJhbWUuaGVpZ2h0KigxLWwpLGc9Yi5mcmFtZS5oZWlnaHQqLWw7dmFyIG49NCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSxvPWEud29ybGRUcmFuc2Zvcm0scD1vLmEscT1vLmMscj1vLmIscz1vLmQsdD1vLnR4LHU9by50eTtqW24rK109cCplK3IqZyt0LGpbbisrXT1zKmcrcSplK3UsaltuKytdPWMueDAsaltuKytdPWMueTAsaltuKytdPWgsaltuKytdPWksaltuKytdPXAqZCtyKmcrdCxqW24rK109cypnK3EqZCt1LGpbbisrXT1jLngxLGpbbisrXT1jLnkxLGpbbisrXT1oLGpbbisrXT1pLGpbbisrXT1wKmQrcipmK3QsaltuKytdPXMqZitxKmQrdSxqW24rK109Yy54MixqW24rK109Yy55MixqW24rK109aCxqW24rK109aSxqW24rK109cCplK3IqZit0LGpbbisrXT1zKmYrcSplK3UsaltuKytdPWMueDMsaltuKytdPWMueTMsaltuKytdPWgsaltuKytdPWksdGhpcy50ZXh0dXJlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWEudGV4dHVyZS5iYXNlVGV4dHVyZSx0aGlzLmJsZW5kTW9kZXNbdGhpcy5jdXJyZW50QmF0Y2hTaXplXT1hLmJsZW5kTW9kZSx0aGlzLmN1cnJlbnRCYXRjaFNpemUrK319LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUucmVuZGVyVGlsaW5nU3ByaXRlPWZ1bmN0aW9uKGEpe3ZhciBjPWEudGlsaW5nVGV4dHVyZTt0aGlzLmN1cnJlbnRCYXRjaFNpemU+PXRoaXMuc2l6ZSYmKHRoaXMuZmx1c2goKSx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1jLmJhc2VUZXh0dXJlKSxhLl91dnN8fChhLl91dnM9bmV3IGIuVGV4dHVyZVV2cyk7dmFyIGQ9YS5fdXZzO2EudGlsZVBvc2l0aW9uLnglPWMuYmFzZVRleHR1cmUud2lkdGgqYS50aWxlU2NhbGVPZmZzZXQueCxhLnRpbGVQb3NpdGlvbi55JT1jLmJhc2VUZXh0dXJlLmhlaWdodCphLnRpbGVTY2FsZU9mZnNldC55O3ZhciBlPWEudGlsZVBvc2l0aW9uLngvKGMuYmFzZVRleHR1cmUud2lkdGgqYS50aWxlU2NhbGVPZmZzZXQueCksZj1hLnRpbGVQb3NpdGlvbi55LyhjLmJhc2VUZXh0dXJlLmhlaWdodCphLnRpbGVTY2FsZU9mZnNldC55KSxnPWEud2lkdGgvYy5iYXNlVGV4dHVyZS53aWR0aC8oYS50aWxlU2NhbGUueCphLnRpbGVTY2FsZU9mZnNldC54KSxoPWEuaGVpZ2h0L2MuYmFzZVRleHR1cmUuaGVpZ2h0LyhhLnRpbGVTY2FsZS55KmEudGlsZVNjYWxlT2Zmc2V0LnkpO2QueDA9MC1lLGQueTA9MC1mLGQueDE9MSpnLWUsZC55MT0wLWYsZC54Mj0xKmctZSxkLnkyPTEqaC1mLGQueDM9MC1lLGQueTM9MSpoLWY7dmFyIGk9YS53b3JsZEFscGhhLGo9YS50aW50LGs9dGhpcy52ZXJ0aWNlcyxsPWEud2lkdGgsbT1hLmhlaWdodCxuPWEuYW5jaG9yLngsbz1hLmFuY2hvci55LHA9bCooMS1uKSxxPWwqLW4scj1tKigxLW8pLHM9bSotbyx0PTQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUsdT1hLndvcmxkVHJhbnNmb3JtLHY9dS5hLHc9dS5jLHg9dS5iLHk9dS5kLHo9dS50eCxBPXUudHk7a1t0KytdPXYqcSt4KnMreixrW3QrK109eSpzK3cqcStBLGtbdCsrXT1kLngwLGtbdCsrXT1kLnkwLGtbdCsrXT1pLGtbdCsrXT1qLGtbdCsrXT12KnAreCpzK3osa1t0KytdPXkqcyt3KnArQSxrW3QrK109ZC54MSxrW3QrK109ZC55MSxrW3QrK109aSxrW3QrK109aixrW3QrK109dipwK3gqcit6LGtbdCsrXT15KnIrdypwK0Esa1t0KytdPWQueDIsa1t0KytdPWQueTIsa1t0KytdPWksa1t0KytdPWosa1t0KytdPXYqcSt4KnIreixrW3QrK109eSpyK3cqcStBLGtbdCsrXT1kLngzLGtbdCsrXT1kLnkzLGtbdCsrXT1pLGtbdCsrXT1qLHRoaXMudGV4dHVyZXNbdGhpcy5jdXJyZW50QmF0Y2hTaXplXT1jLmJhc2VUZXh0dXJlLHRoaXMuYmxlbmRNb2Rlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWEuYmxlbmRNb2RlLHRoaXMuY3VycmVudEJhdGNoU2l6ZSsrfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLmZsdXNoPWZ1bmN0aW9uKCl7aWYoMCE9PXRoaXMuY3VycmVudEJhdGNoU2l6ZSl7dmFyIGE9dGhpcy5nbDtpZih0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIodGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlciksdGhpcy5kaXJ0eSl7dGhpcy5kaXJ0eT0hMSxhLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKTt2YXIgYj10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbjthLnVuaWZvcm0yZih0aGlzLnNoYWRlci5wcm9qZWN0aW9uVmVjdG9yLGIueCxiLnkpO3ZhciBjPTQqdGhpcy52ZXJ0U2l6ZTthLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVZlcnRleFBvc2l0aW9uLDIsYS5GTE9BVCwhMSxjLDApLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hVGV4dHVyZUNvb3JkLDIsYS5GTE9BVCwhMSxjLDgpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5jb2xvckF0dHJpYnV0ZSwyLGEuRkxPQVQsITEsYywxNil9aWYodGhpcy5jdXJyZW50QmF0Y2hTaXplPi41KnRoaXMuc2l6ZSlhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRpY2VzKTtlbHNle3ZhciBkPXRoaXMudmVydGljZXMuc3ViYXJyYXkoMCw0KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplKTthLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCxkKX1mb3IodmFyIGUsZixnPTAsaD0wLGk9bnVsbCxqPXRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLmN1cnJlbnRCbGVuZE1vZGUsaz0wLGw9dGhpcy5jdXJyZW50QmF0Y2hTaXplO2w+aztrKyspZT10aGlzLnRleHR1cmVzW2tdLGY9dGhpcy5ibGVuZE1vZGVzW2tdLChpIT09ZXx8aiE9PWYpJiYodGhpcy5yZW5kZXJCYXRjaChpLGcsaCksaD1rLGc9MCxpPWUsaj1mLHRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLnNldEJsZW5kTW9kZShqKSksZysrO3RoaXMucmVuZGVyQmF0Y2goaSxnLGgpLHRoaXMuY3VycmVudEJhdGNoU2l6ZT0wfX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXJCYXRjaD1mdW5jdGlvbihhLGMsZCl7aWYoMCE9PWMpe3ZhciBlPXRoaXMuZ2w7ZS5iaW5kVGV4dHVyZShlLlRFWFRVUkVfMkQsYS5fZ2xUZXh0dXJlc1tlLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUoYSxlKSksYS5fZGlydHlbZS5pZF0mJmIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMuY3VycmVudEJhc2VUZXh0dXJlLGUpLGUuZHJhd0VsZW1lbnRzKGUuVFJJQU5HTEVTLDYqYyxlLlVOU0lHTkVEX1NIT1JULDYqZCoyKSx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50Kyt9fSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0b3A9ZnVuY3Rpb24oKXt0aGlzLmZsdXNoKCl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuc3RhcnQ9ZnVuY3Rpb24oKXt0aGlzLmRpcnR5PSEwfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLnZlcnRpY2VzPW51bGwsdGhpcy5pbmRpY2VzPW51bGwsdGhpcy5nbC5kZWxldGVCdWZmZXIodGhpcy52ZXJ0ZXhCdWZmZXIpLHRoaXMuZ2wuZGVsZXRlQnVmZmVyKHRoaXMuaW5kZXhCdWZmZXIpLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPW51bGwsdGhpcy5nbD1udWxsfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoPWZ1bmN0aW9uKGEpe3RoaXMudmVydFNpemU9MTAsdGhpcy5tYXhTaXplPTZlMyx0aGlzLnNpemU9dGhpcy5tYXhTaXplO3ZhciBiPTQqdGhpcy5zaXplKnRoaXMudmVydFNpemUsYz02KnRoaXMubWF4U2l6ZTt0aGlzLnZlcnRpY2VzPW5ldyBGbG9hdDMyQXJyYXkoYiksdGhpcy5pbmRpY2VzPW5ldyBVaW50MTZBcnJheShjKSx0aGlzLnZlcnRleEJ1ZmZlcj1udWxsLHRoaXMuaW5kZXhCdWZmZXI9bnVsbCx0aGlzLmxhc3RJbmRleENvdW50PTA7Zm9yKHZhciBkPTAsZT0wO2M+ZDtkKz02LGUrPTQpdGhpcy5pbmRpY2VzW2QrMF09ZSswLHRoaXMuaW5kaWNlc1tkKzFdPWUrMSx0aGlzLmluZGljZXNbZCsyXT1lKzIsdGhpcy5pbmRpY2VzW2QrM109ZSswLHRoaXMuaW5kaWNlc1tkKzRdPWUrMix0aGlzLmluZGljZXNbZCs1XT1lKzM7dGhpcy5kcmF3aW5nPSExLHRoaXMuY3VycmVudEJhdGNoU2l6ZT0wLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPW51bGwsdGhpcy5jdXJyZW50QmxlbmRNb2RlPTAsdGhpcy5yZW5kZXJTZXNzaW9uPW51bGwsdGhpcy5zaGFkZXI9bnVsbCx0aGlzLm1hdHJpeD1udWxsLHRoaXMuc2V0Q29udGV4dChhKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy52ZXJ0ZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmluZGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGEuU1RBVElDX0RSQVcpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGljZXMsYS5EWU5BTUlDX0RSQVcpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5iZWdpbj1mdW5jdGlvbihhLGIpe3RoaXMucmVuZGVyU2Vzc2lvbj1iLHRoaXMuc2hhZGVyPXRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLmZhc3RTaGFkZXIsdGhpcy5tYXRyaXg9YS53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSx0aGlzLnN0YXJ0KCl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLmVuZD1mdW5jdGlvbigpe3RoaXMuZmx1c2goKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUucmVuZGVyPWZ1bmN0aW9uKGEpe3ZhciBiPWEuY2hpbGRyZW4sYz1iWzBdO2lmKGMudGV4dHVyZS5fdXZzKXt0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1jLnRleHR1cmUuYmFzZVRleHR1cmUsYy5ibGVuZE1vZGUhPT10aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlci5jdXJyZW50QmxlbmRNb2RlJiYodGhpcy5mbHVzaCgpLHRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLnNldEJsZW5kTW9kZShjLmJsZW5kTW9kZSkpO2Zvcih2YXIgZD0wLGU9Yi5sZW5ndGg7ZT5kO2QrKyl0aGlzLnJlbmRlclNwcml0ZShiW2RdKTt0aGlzLmZsdXNoKCl9fSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXJTcHJpdGU9ZnVuY3Rpb24oYSl7aWYoYS52aXNpYmxlJiYoYS50ZXh0dXJlLmJhc2VUZXh0dXJlPT09dGhpcy5jdXJyZW50QmFzZVRleHR1cmV8fCh0aGlzLmZsdXNoKCksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9YS50ZXh0dXJlLmJhc2VUZXh0dXJlLGEudGV4dHVyZS5fdXZzKSkpe3ZhciBiLGMsZCxlLGYsZyxoLGksaj10aGlzLnZlcnRpY2VzO2lmKGI9YS50ZXh0dXJlLl91dnMsYz1hLnRleHR1cmUuZnJhbWUud2lkdGgsZD1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0LGEudGV4dHVyZS50cmltKXt2YXIgaz1hLnRleHR1cmUudHJpbTtmPWsueC1hLmFuY2hvci54Kmsud2lkdGgsZT1mK2EudGV4dHVyZS5jcm9wLndpZHRoLGg9ay55LWEuYW5jaG9yLnkqay5oZWlnaHQsZz1oK2EudGV4dHVyZS5jcm9wLmhlaWdodH1lbHNlIGU9YS50ZXh0dXJlLmZyYW1lLndpZHRoKigxLWEuYW5jaG9yLngpLGY9YS50ZXh0dXJlLmZyYW1lLndpZHRoKi1hLmFuY2hvci54LGc9YS50ZXh0dXJlLmZyYW1lLmhlaWdodCooMS1hLmFuY2hvci55KSxoPWEudGV4dHVyZS5mcmFtZS5oZWlnaHQqLWEuYW5jaG9yLnk7aT00KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplLGpbaSsrXT1mLGpbaSsrXT1oLGpbaSsrXT1hLnBvc2l0aW9uLngsaltpKytdPWEucG9zaXRpb24ueSxqW2krK109YS5zY2FsZS54LGpbaSsrXT1hLnNjYWxlLnksaltpKytdPWEucm90YXRpb24saltpKytdPWIueDAsaltpKytdPWIueTEsaltpKytdPWEuYWxwaGEsaltpKytdPWUsaltpKytdPWgsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MSxqW2krK109Yi55MSxqW2krK109YS5hbHBoYSxqW2krK109ZSxqW2krK109ZyxqW2krK109YS5wb3NpdGlvbi54LGpbaSsrXT1hLnBvc2l0aW9uLnksaltpKytdPWEuc2NhbGUueCxqW2krK109YS5zY2FsZS55LGpbaSsrXT1hLnJvdGF0aW9uLGpbaSsrXT1iLngyLGpbaSsrXT1iLnkyLGpbaSsrXT1hLmFscGhhLGpbaSsrXT1mLGpbaSsrXT1nLGpbaSsrXT1hLnBvc2l0aW9uLngsaltpKytdPWEucG9zaXRpb24ueSxqW2krK109YS5zY2FsZS54LGpbaSsrXT1hLnNjYWxlLnksaltpKytdPWEucm90YXRpb24saltpKytdPWIueDMsaltpKytdPWIueTMsaltpKytdPWEuYWxwaGEsdGhpcy5jdXJyZW50QmF0Y2hTaXplKyssdGhpcy5jdXJyZW50QmF0Y2hTaXplPj10aGlzLnNpemUmJnRoaXMuZmx1c2goKX19LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLmZsdXNoPWZ1bmN0aW9uKCl7aWYoMCE9PXRoaXMuY3VycmVudEJhdGNoU2l6ZSl7dmFyIGE9dGhpcy5nbDtpZih0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1thLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUodGhpcy5jdXJyZW50QmFzZVRleHR1cmUsYSksYS5iaW5kVGV4dHVyZShhLlRFWFRVUkVfMkQsdGhpcy5jdXJyZW50QmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYS5pZF0pLHRoaXMuY3VycmVudEJhdGNoU2l6ZT4uNSp0aGlzLnNpemUpYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0aWNlcyk7ZWxzZXt2YXIgYz10aGlzLnZlcnRpY2VzLnN1YmFycmF5KDAsNCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSk7YS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsYyl9YS5kcmF3RWxlbWVudHMoYS5UUklBTkdMRVMsNip0aGlzLmN1cnJlbnRCYXRjaFNpemUsYS5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLmN1cnJlbnRCYXRjaFNpemU9MCx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50Kyt9fSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zdG9wPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zdGFydD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7YS5hY3RpdmVUZXh0dXJlKGEuVEVYVFVSRTApLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlcik7dmFyIGI9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb247YS51bmlmb3JtMmYodGhpcy5zaGFkZXIucHJvamVjdGlvblZlY3RvcixiLngsYi55KSxhLnVuaWZvcm1NYXRyaXgzZnYodGhpcy5zaGFkZXIudU1hdHJpeCwhMSx0aGlzLm1hdHJpeCk7dmFyIGM9NCp0aGlzLnZlcnRTaXplO2EudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hVmVydGV4UG9zaXRpb24sMixhLkZMT0FULCExLGMsMCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFQb3NpdGlvbkNvb3JkLDIsYS5GTE9BVCwhMSxjLDgpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hU2NhbGUsMixhLkZMT0FULCExLGMsMTYpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hUm90YXRpb24sMSxhLkZMT0FULCExLGMsMjQpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hVGV4dHVyZUNvb3JkLDIsYS5GTE9BVCwhMSxjLDI4KSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuY29sb3JBdHRyaWJ1dGUsMSxhLkZMT0FULCExLGMsMzYpfSxiLldlYkdMRmlsdGVyTWFuYWdlcj1mdW5jdGlvbihhLGIpe3RoaXMudHJhbnNwYXJlbnQ9Yix0aGlzLmZpbHRlclN0YWNrPVtdLHRoaXMub2Zmc2V0WD0wLHRoaXMub2Zmc2V0WT0wLHRoaXMuc2V0Q29udGV4dChhKX0sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMudGV4dHVyZVBvb2w9W10sdGhpcy5pbml0U2hhZGVyQnVmZmVycygpfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuYmVnaW49ZnVuY3Rpb24oYSxiKXt0aGlzLnJlbmRlclNlc3Npb249YSx0aGlzLmRlZmF1bHRTaGFkZXI9YS5zaGFkZXJNYW5hZ2VyLmRlZmF1bHRTaGFkZXI7dmFyIGM9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb247dGhpcy53aWR0aD0yKmMueCx0aGlzLmhlaWdodD0yKi1jLnksdGhpcy5idWZmZXI9Yn0sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLnB1c2hGaWx0ZXI9ZnVuY3Rpb24oYSl7dmFyIGM9dGhpcy5nbCxkPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uLGU9dGhpcy5yZW5kZXJTZXNzaW9uLm9mZnNldDthLl9maWx0ZXJBcmVhPWEudGFyZ2V0LmZpbHRlckFyZWF8fGEudGFyZ2V0LmdldEJvdW5kcygpLHRoaXMuZmlsdGVyU3RhY2sucHVzaChhKTt2YXIgZj1hLmZpbHRlclBhc3Nlc1swXTt0aGlzLm9mZnNldFgrPWEuX2ZpbHRlckFyZWEueCx0aGlzLm9mZnNldFkrPWEuX2ZpbHRlckFyZWEueTt2YXIgZz10aGlzLnRleHR1cmVQb29sLnBvcCgpO2c/Zy5yZXNpemUodGhpcy53aWR0aCx0aGlzLmhlaWdodCk6Zz1uZXcgYi5GaWx0ZXJUZXh0dXJlKHRoaXMuZ2wsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsZy50ZXh0dXJlKTt2YXIgaD1hLl9maWx0ZXJBcmVhLGk9Zi5wYWRkaW5nO2gueC09aSxoLnktPWksaC53aWR0aCs9MippLGguaGVpZ2h0Kz0yKmksaC54PDAmJihoLng9MCksaC53aWR0aD50aGlzLndpZHRoJiYoaC53aWR0aD10aGlzLndpZHRoKSxoLnk8MCYmKGgueT0wKSxoLmhlaWdodD50aGlzLmhlaWdodCYmKGguaGVpZ2h0PXRoaXMuaGVpZ2h0KSxjLmJpbmRGcmFtZWJ1ZmZlcihjLkZSQU1FQlVGRkVSLGcuZnJhbWVCdWZmZXIpLGMudmlld3BvcnQoMCwwLGgud2lkdGgsaC5oZWlnaHQpLGQueD1oLndpZHRoLzIsZC55PS1oLmhlaWdodC8yLGUueD0taC54LGUueT0taC55LHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcih0aGlzLmRlZmF1bHRTaGFkZXIpLGMudW5pZm9ybTJmKHRoaXMuZGVmYXVsdFNoYWRlci5wcm9qZWN0aW9uVmVjdG9yLGgud2lkdGgvMiwtaC5oZWlnaHQvMiksYy51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLm9mZnNldFZlY3RvciwtaC54LC1oLnkpLGMuY29sb3JNYXNrKCEwLCEwLCEwLCEwKSxjLmNsZWFyQ29sb3IoMCwwLDAsMCksYy5jbGVhcihjLkNPTE9SX0JVRkZFUl9CSVQpLGEuX2dsRmlsdGVyVGV4dHVyZT1nfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUucG9wRmlsdGVyPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPXRoaXMuZmlsdGVyU3RhY2sucG9wKCksZD1jLl9maWx0ZXJBcmVhLGU9Yy5fZ2xGaWx0ZXJUZXh0dXJlLGY9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb24sZz10aGlzLnJlbmRlclNlc3Npb24ub2Zmc2V0O2lmKGMuZmlsdGVyUGFzc2VzLmxlbmd0aD4xKXthLnZpZXdwb3J0KDAsMCxkLndpZHRoLGQuaGVpZ2h0KSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLHRoaXMudmVydGV4QXJyYXlbMF09MCx0aGlzLnZlcnRleEFycmF5WzFdPWQuaGVpZ2h0LHRoaXMudmVydGV4QXJyYXlbMl09ZC53aWR0aCx0aGlzLnZlcnRleEFycmF5WzNdPWQuaGVpZ2h0LHRoaXMudmVydGV4QXJyYXlbNF09MCx0aGlzLnZlcnRleEFycmF5WzVdPTAsdGhpcy52ZXJ0ZXhBcnJheVs2XT1kLndpZHRoLHRoaXMudmVydGV4QXJyYXlbN109MCxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRleEFycmF5KSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy51dkJ1ZmZlciksdGhpcy51dkFycmF5WzJdPWQud2lkdGgvdGhpcy53aWR0aCx0aGlzLnV2QXJyYXlbNV09ZC5oZWlnaHQvdGhpcy5oZWlnaHQsdGhpcy51dkFycmF5WzZdPWQud2lkdGgvdGhpcy53aWR0aCx0aGlzLnV2QXJyYXlbN109ZC5oZWlnaHQvdGhpcy5oZWlnaHQsYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy51dkFycmF5KTt2YXIgaD1lLGk9dGhpcy50ZXh0dXJlUG9vbC5wb3AoKTtpfHwoaT1uZXcgYi5GaWx0ZXJUZXh0dXJlKHRoaXMuZ2wsdGhpcy53aWR0aCx0aGlzLmhlaWdodCkpLGkucmVzaXplKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLGEuYmluZEZyYW1lYnVmZmVyKGEuRlJBTUVCVUZGRVIsaS5mcmFtZUJ1ZmZlciksYS5jbGVhcihhLkNPTE9SX0JVRkZFUl9CSVQpLGEuZGlzYWJsZShhLkJMRU5EKTtmb3IodmFyIGo9MDtqPGMuZmlsdGVyUGFzc2VzLmxlbmd0aC0xO2orKyl7dmFyIGs9Yy5maWx0ZXJQYXNzZXNbal07YS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUixpLmZyYW1lQnVmZmVyKSxhLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kVGV4dHVyZShhLlRFWFRVUkVfMkQsaC50ZXh0dXJlKSx0aGlzLmFwcGx5RmlsdGVyUGFzcyhrLGQsZC53aWR0aCxkLmhlaWdodCk7dmFyIGw9aDtoPWksaT1sfWEuZW5hYmxlKGEuQkxFTkQpLGU9aCx0aGlzLnRleHR1cmVQb29sLnB1c2goaSl9dmFyIG09Yy5maWx0ZXJQYXNzZXNbYy5maWx0ZXJQYXNzZXMubGVuZ3RoLTFdO3RoaXMub2Zmc2V0WC09ZC54LHRoaXMub2Zmc2V0WS09ZC55O3ZhciBuPXRoaXMud2lkdGgsbz10aGlzLmhlaWdodCxwPTAscT0wLHI9dGhpcy5idWZmZXI7aWYoMD09PXRoaXMuZmlsdGVyU3RhY2subGVuZ3RoKWEuY29sb3JNYXNrKCEwLCEwLCEwLCEwKTtlbHNle3ZhciBzPXRoaXMuZmlsdGVyU3RhY2tbdGhpcy5maWx0ZXJTdGFjay5sZW5ndGgtMV07ZD1zLl9maWx0ZXJBcmVhLG49ZC53aWR0aCxvPWQuaGVpZ2h0LHA9ZC54LHE9ZC55LHI9cy5fZ2xGaWx0ZXJUZXh0dXJlLmZyYW1lQnVmZmVyfWYueD1uLzIsZi55PS1vLzIsZy54PXAsZy55PXEsZD1jLl9maWx0ZXJBcmVhO3ZhciB0PWQueC1wLHU9ZC55LXE7YS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSx0aGlzLnZlcnRleEFycmF5WzBdPXQsdGhpcy52ZXJ0ZXhBcnJheVsxXT11K2QuaGVpZ2h0LHRoaXMudmVydGV4QXJyYXlbMl09dCtkLndpZHRoLHRoaXMudmVydGV4QXJyYXlbM109dStkLmhlaWdodCx0aGlzLnZlcnRleEFycmF5WzRdPXQsdGhpcy52ZXJ0ZXhBcnJheVs1XT11LHRoaXMudmVydGV4QXJyYXlbNl09dCtkLndpZHRoLHRoaXMudmVydGV4QXJyYXlbN109dSxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRleEFycmF5KSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy51dkJ1ZmZlciksdGhpcy51dkFycmF5WzJdPWQud2lkdGgvdGhpcy53aWR0aCx0aGlzLnV2QXJyYXlbNV09ZC5oZWlnaHQvdGhpcy5oZWlnaHQsdGhpcy51dkFycmF5WzZdPWQud2lkdGgvdGhpcy53aWR0aCx0aGlzLnV2QXJyYXlbN109ZC5oZWlnaHQvdGhpcy5oZWlnaHQsYS5idWZmZXJTdWJEYXRhKGEuQVJSQVlfQlVGRkVSLDAsdGhpcy51dkFycmF5KSxhLnZpZXdwb3J0KDAsMCxuLG8pLGEuYmluZEZyYW1lYnVmZmVyKGEuRlJBTUVCVUZGRVIsciksYS5hY3RpdmVUZXh0dXJlKGEuVEVYVFVSRTApLGEuYmluZFRleHR1cmUoYS5URVhUVVJFXzJELGUudGV4dHVyZSksdGhpcy5hcHBseUZpbHRlclBhc3MobSxkLG4sbyksdGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKHRoaXMuZGVmYXVsdFNoYWRlciksYS51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLnByb2plY3Rpb25WZWN0b3Isbi8yLC1vLzIpLGEudW5pZm9ybTJmKHRoaXMuZGVmYXVsdFNoYWRlci5vZmZzZXRWZWN0b3IsLXAsLXEpLHRoaXMudGV4dHVyZVBvb2wucHVzaChlKSxjLl9nbEZpbHRlclRleHR1cmU9bnVsbH0sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLmFwcGx5RmlsdGVyUGFzcz1mdW5jdGlvbihhLGMsZCxlKXt2YXIgZj10aGlzLmdsLGc9YS5zaGFkZXJzW2YuaWRdO2d8fChnPW5ldyBiLlBpeGlTaGFkZXIoZiksZy5mcmFnbWVudFNyYz1hLmZyYWdtZW50U3JjLGcudW5pZm9ybXM9YS51bmlmb3JtcyxnLmluaXQoKSxhLnNoYWRlcnNbZi5pZF09ZyksdGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGcpLGYudW5pZm9ybTJmKGcucHJvamVjdGlvblZlY3RvcixkLzIsLWUvMiksZi51bmlmb3JtMmYoZy5vZmZzZXRWZWN0b3IsMCwwKSxhLnVuaWZvcm1zLmRpbWVuc2lvbnMmJihhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbMF09dGhpcy53aWR0aCxhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbMV09dGhpcy5oZWlnaHQsYS51bmlmb3Jtcy5kaW1lbnNpb25zLnZhbHVlWzJdPXRoaXMudmVydGV4QXJyYXlbMF0sYS51bmlmb3Jtcy5kaW1lbnNpb25zLnZhbHVlWzNdPXRoaXMudmVydGV4QXJyYXlbNV0pLGcuc3luY1VuaWZvcm1zKCksZi5iaW5kQnVmZmVyKGYuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZy5hVmVydGV4UG9zaXRpb24sMixmLkZMT0FULCExLDAsMCksZi5iaW5kQnVmZmVyKGYuQVJSQVlfQlVGRkVSLHRoaXMudXZCdWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihnLmFUZXh0dXJlQ29vcmQsMixmLkZMT0FULCExLDAsMCksZi5iaW5kQnVmZmVyKGYuQVJSQVlfQlVGRkVSLHRoaXMuY29sb3JCdWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihnLmNvbG9yQXR0cmlidXRlLDIsZi5GTE9BVCwhMSwwLDApLGYuYmluZEJ1ZmZlcihmLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGYuZHJhd0VsZW1lbnRzKGYuVFJJQU5HTEVTLDYsZi5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50Kyt9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5pbml0U2hhZGVyQnVmZmVycz1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7dGhpcy52ZXJ0ZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLnV2QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5jb2xvckJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuaW5kZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLnZlcnRleEFycmF5PW5ldyBGbG9hdDMyQXJyYXkoWzAsMCwxLDAsMCwxLDEsMV0pLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QXJyYXksYS5TVEFUSUNfRFJBVyksdGhpcy51dkFycmF5PW5ldyBGbG9hdDMyQXJyYXkoWzAsMCwxLDAsMCwxLDEsMV0pLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy51dkFycmF5LGEuU1RBVElDX0RSQVcpLHRoaXMuY29sb3JBcnJheT1uZXcgRmxvYXQzMkFycmF5KFsxLDE2Nzc3MjE1LDEsMTY3NzcyMTUsMSwxNjc3NzIxNSwxLDE2Nzc3MjE1XSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMuY29sb3JCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLmNvbG9yQXJyYXksYS5TVEFUSUNfRFJBVyksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsbmV3IFVpbnQxNkFycmF5KFswLDEsMiwxLDMsMl0pLGEuU1RBVElDX0RSQVcpfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7dGhpcy5maWx0ZXJTdGFjaz1udWxsLHRoaXMub2Zmc2V0WD0wLHRoaXMub2Zmc2V0WT0wO2Zvcih2YXIgYj0wO2I8dGhpcy50ZXh0dXJlUG9vbC5sZW5ndGg7YisrKXRoaXMudGV4dHVyZVBvb2xbYl0uZGVzdHJveSgpO3RoaXMudGV4dHVyZVBvb2w9bnVsbCxhLmRlbGV0ZUJ1ZmZlcih0aGlzLnZlcnRleEJ1ZmZlciksYS5kZWxldGVCdWZmZXIodGhpcy51dkJ1ZmZlciksYS5kZWxldGVCdWZmZXIodGhpcy5jb2xvckJ1ZmZlciksYS5kZWxldGVCdWZmZXIodGhpcy5pbmRleEJ1ZmZlcil9LGIuRmlsdGVyVGV4dHVyZT1mdW5jdGlvbihhLGMsZCxlKXt0aGlzLmdsPWEsdGhpcy5mcmFtZUJ1ZmZlcj1hLmNyZWF0ZUZyYW1lYnVmZmVyKCksdGhpcy50ZXh0dXJlPWEuY3JlYXRlVGV4dHVyZSgpLGU9ZXx8Yi5zY2FsZU1vZGVzLkRFRkFVTFQsYS5iaW5kVGV4dHVyZShhLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlKSxhLnRleFBhcmFtZXRlcmkoYS5URVhUVVJFXzJELGEuVEVYVFVSRV9NQUdfRklMVEVSLGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2EuTElORUFSOmEuTkVBUkVTVCksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfTUlOX0ZJTFRFUixlPT09Yi5zY2FsZU1vZGVzLkxJTkVBUj9hLkxJTkVBUjphLk5FQVJFU1QpLGEudGV4UGFyYW1ldGVyaShhLlRFWFRVUkVfMkQsYS5URVhUVVJFX1dSQVBfUyxhLkNMQU1QX1RPX0VER0UpLGEudGV4UGFyYW1ldGVyaShhLlRFWFRVUkVfMkQsYS5URVhUVVJFX1dSQVBfVCxhLkNMQU1QX1RPX0VER0UpLGEuYmluZEZyYW1lYnVmZmVyKGEuRlJBTUVCVUZGRVIsdGhpcy5mcmFtZWJ1ZmZlciksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUix0aGlzLmZyYW1lQnVmZmVyKSxhLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGEuRlJBTUVCVUZGRVIsYS5DT0xPUl9BVFRBQ0hNRU5UMCxhLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlLDApLHRoaXMucmVuZGVyQnVmZmVyPWEuY3JlYXRlUmVuZGVyYnVmZmVyKCksYS5iaW5kUmVuZGVyYnVmZmVyKGEuUkVOREVSQlVGRkVSLHRoaXMucmVuZGVyQnVmZmVyKSxhLmZyYW1lYnVmZmVyUmVuZGVyYnVmZmVyKGEuRlJBTUVCVUZGRVIsYS5ERVBUSF9TVEVOQ0lMX0FUVEFDSE1FTlQsYS5SRU5ERVJCVUZGRVIsdGhpcy5yZW5kZXJCdWZmZXIpLHRoaXMucmVzaXplKGMsZCl9LGIuRmlsdGVyVGV4dHVyZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO2EuY2xlYXJDb2xvcigwLDAsMCwwKSxhLmNsZWFyKGEuQ09MT1JfQlVGRkVSX0JJVCl9LGIuRmlsdGVyVGV4dHVyZS5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKGEsYil7aWYodGhpcy53aWR0aCE9PWF8fHRoaXMuaGVpZ2h0IT09Yil7dGhpcy53aWR0aD1hLHRoaXMuaGVpZ2h0PWI7dmFyIGM9dGhpcy5nbDtjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUpLGMudGV4SW1hZ2UyRChjLlRFWFRVUkVfMkQsMCxjLlJHQkEsYSxiLDAsYy5SR0JBLGMuVU5TSUdORURfQllURSxudWxsKSxjLmJpbmRSZW5kZXJidWZmZXIoYy5SRU5ERVJCVUZGRVIsdGhpcy5yZW5kZXJCdWZmZXIpLGMucmVuZGVyYnVmZmVyU3RvcmFnZShjLlJFTkRFUkJVRkZFUixjLkRFUFRIX1NURU5DSUwsYSxiKX19LGIuRmlsdGVyVGV4dHVyZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7YS5kZWxldGVGcmFtZWJ1ZmZlcih0aGlzLmZyYW1lQnVmZmVyKSxhLmRlbGV0ZVRleHR1cmUodGhpcy50ZXh0dXJlKSx0aGlzLmZyYW1lQnVmZmVyPW51bGwsdGhpcy50ZXh0dXJlPW51bGx9LGIuQ2FudmFzTWFza01hbmFnZXI9ZnVuY3Rpb24oKXt9LGIuQ2FudmFzTWFza01hbmFnZXIucHJvdG90eXBlLnB1c2hNYXNrPWZ1bmN0aW9uKGEsYyl7Yy5zYXZlKCk7dmFyIGQ9YS5hbHBoYSxlPWEud29ybGRUcmFuc2Zvcm07Yy5zZXRUcmFuc2Zvcm0oZS5hLGUuYyxlLmIsZS5kLGUudHgsZS50eSksYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljc01hc2soYSxjKSxjLmNsaXAoKSxhLndvcmxkQWxwaGE9ZH0sYi5DYW52YXNNYXNrTWFuYWdlci5wcm90b3R5cGUucG9wTWFzaz1mdW5jdGlvbihhKXthLnJlc3RvcmUoKX0sYi5DYW52YXNUaW50ZXI9ZnVuY3Rpb24oKXt9LGIuQ2FudmFzVGludGVyLmdldFRpbnRlZFRleHR1cmU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnRleHR1cmU7Yz1iLkNhbnZhc1RpbnRlci5yb3VuZENvbG9yKGMpO3ZhciBlPVwiI1wiKyhcIjAwMDAwXCIrKDB8YykudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpO2lmKGQudGludENhY2hlPWQudGludENhY2hlfHx7fSxkLnRpbnRDYWNoZVtlXSlyZXR1cm4gZC50aW50Q2FjaGVbZV07dmFyIGY9Yi5DYW52YXNUaW50ZXIuY2FudmFzfHxkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO2lmKGIuQ2FudmFzVGludGVyLnRpbnRNZXRob2QoZCxjLGYpLGIuQ2FudmFzVGludGVyLmNvbnZlcnRUaW50VG9JbWFnZSl7dmFyIGc9bmV3IEltYWdlO2cuc3JjPWYudG9EYXRhVVJMKCksZC50aW50Q2FjaGVbZV09Z31lbHNlIGQudGludENhY2hlW2VdPWYsYi5DYW52YXNUaW50ZXIuY2FudmFzPW51bGw7cmV0dXJuIGZ9LGIuQ2FudmFzVGludGVyLnRpbnRXaXRoTXVsdGlwbHk9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWMuZ2V0Q29udGV4dChcIjJkXCIpLGU9YS5mcmFtZTtjLndpZHRoPWUud2lkdGgsYy5oZWlnaHQ9ZS5oZWlnaHQsZC5maWxsU3R5bGU9XCIjXCIrKFwiMDAwMDBcIisoMHxiKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksZC5maWxsUmVjdCgwLDAsZS53aWR0aCxlLmhlaWdodCksZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJtdWx0aXBseVwiLGQuZHJhd0ltYWdlKGEuYmFzZVRleHR1cmUuc291cmNlLGUueCxlLnksZS53aWR0aCxlLmhlaWdodCwwLDAsZS53aWR0aCxlLmhlaWdodCksZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJkZXN0aW5hdGlvbi1hdG9wXCIsZC5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZS54LGUueSxlLndpZHRoLGUuaGVpZ2h0LDAsMCxlLndpZHRoLGUuaGVpZ2h0KX0sYi5DYW52YXNUaW50ZXIudGludFdpdGhPdmVybGF5PWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1jLmdldENvbnRleHQoXCIyZFwiKSxlPWEuZnJhbWU7Yy53aWR0aD1lLndpZHRoLGMuaGVpZ2h0PWUuaGVpZ2h0LGQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwiY29weVwiLGQuZmlsbFN0eWxlPVwiI1wiKyhcIjAwMDAwXCIrKDB8YikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGQuZmlsbFJlY3QoMCwwLGUud2lkdGgsZS5oZWlnaHQpLGQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwiZGVzdGluYXRpb24tYXRvcFwiLGQuZHJhd0ltYWdlKGEuYmFzZVRleHR1cmUuc291cmNlLGUueCxlLnksZS53aWR0aCxlLmhlaWdodCwwLDAsZS53aWR0aCxlLmhlaWdodCl9LGIuQ2FudmFzVGludGVyLnRpbnRXaXRoUGVyUGl4ZWw9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWQuZ2V0Q29udGV4dChcIjJkXCIpLGY9YS5mcmFtZTtkLndpZHRoPWYud2lkdGgsZC5oZWlnaHQ9Zi5oZWlnaHQsZS5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJjb3B5XCIsZS5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZi54LGYueSxmLndpZHRoLGYuaGVpZ2h0LDAsMCxmLndpZHRoLGYuaGVpZ2h0KTtmb3IodmFyIGc9Yi5oZXgycmdiKGMpLGg9Z1swXSxpPWdbMV0saj1nWzJdLGs9ZS5nZXRJbWFnZURhdGEoMCwwLGYud2lkdGgsZi5oZWlnaHQpLGw9ay5kYXRhLG09MDttPGwubGVuZ3RoO20rPTQpbFttKzBdKj1oLGxbbSsxXSo9aSxsW20rMl0qPWo7ZS5wdXRJbWFnZURhdGEoaywwLDApfSxiLkNhbnZhc1RpbnRlci5yb3VuZENvbG9yPWZ1bmN0aW9uKGEpe3ZhciBjPWIuQ2FudmFzVGludGVyLmNhY2hlU3RlcHNQZXJDb2xvckNoYW5uZWwsZD1iLmhleDJyZ2IoYSk7cmV0dXJuIGRbMF09TWF0aC5taW4oMjU1LGRbMF0vYypjKSxkWzFdPU1hdGgubWluKDI1NSxkWzFdL2MqYyksZFsyXT1NYXRoLm1pbigyNTUsZFsyXS9jKmMpLGIucmdiMmhleChkKX0sYi5DYW52YXNUaW50ZXIuY2FjaGVTdGVwc1BlckNvbG9yQ2hhbm5lbD04LGIuQ2FudmFzVGludGVyLmNvbnZlcnRUaW50VG9JbWFnZT0hMSxiLkNhbnZhc1RpbnRlci5jYW5Vc2VNdWx0aXBseT1iLmNhblVzZU5ld0NhbnZhc0JsZW5kTW9kZXMoKSxiLkNhbnZhc1RpbnRlci50aW50TWV0aG9kPWIuQ2FudmFzVGludGVyLmNhblVzZU11bHRpcGx5P2IuQ2FudmFzVGludGVyLnRpbnRXaXRoTXVsdGlwbHk6Yi5DYW52YXNUaW50ZXIudGludFdpdGhQZXJQaXhlbCxiLkNhbnZhc1JlbmRlcmVyPWZ1bmN0aW9uKGEsYyxkLGUpe2IuZGVmYXVsdFJlbmRlcmVyfHwoYi5zYXlIZWxsbyhcIkNhbnZhc1wiKSxiLmRlZmF1bHRSZW5kZXJlcj10aGlzKSx0aGlzLnR5cGU9Yi5DQU5WQVNfUkVOREVSRVIsdGhpcy5jbGVhckJlZm9yZVJlbmRlcj0hMCx0aGlzLnRyYW5zcGFyZW50PSEhZSxiLmJsZW5kTW9kZXNDYW52YXN8fChiLmJsZW5kTW9kZXNDYW52YXM9W10sYi5jYW5Vc2VOZXdDYW52YXNCbGVuZE1vZGVzKCk/KGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTk9STUFMXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5BRERdPVwibGlnaHRlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTVVMVElQTFldPVwibXVsdGlwbHlcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNDUkVFTl09XCJzY3JlZW5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLk9WRVJMQVldPVwib3ZlcmxheVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuREFSS0VOXT1cImRhcmtlblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTElHSFRFTl09XCJsaWdodGVuXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9ET0RHRV09XCJjb2xvci1kb2RnZVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JfQlVSTl09XCJjb2xvci1idXJuXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5IQVJEX0xJR0hUXT1cImhhcmQtbGlnaHRcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNPRlRfTElHSFRdPVwic29mdC1saWdodFwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuRElGRkVSRU5DRV09XCJkaWZmZXJlbmNlXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5FWENMVVNJT05dPVwiZXhjbHVzaW9uXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5IVUVdPVwiaHVlXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TQVRVUkFUSU9OXT1cInNhdHVyYXRpb25cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SXT1cImNvbG9yXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5MVU1JTk9TSVRZXT1cImx1bWlub3NpdHlcIik6KGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTk9STUFMXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5BRERdPVwibGlnaHRlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuTVVMVElQTFldPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNDUkVFTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuT1ZFUkxBWV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuREFSS0VOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5MSUdIVEVOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9ET0RHRV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JfQlVSTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuSEFSRF9MSUdIVF09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU09GVF9MSUdIVF09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuRElGRkVSRU5DRV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuRVhDTFVTSU9OXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5IVUVdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNBVFVSQVRJT05dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5MVU1JTk9TSVRZXT1cInNvdXJjZS1vdmVyXCIpKSx0aGlzLndpZHRoPWF8fDgwMCx0aGlzLmhlaWdodD1jfHw2MDAsdGhpcy52aWV3PWR8fGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy5jb250ZXh0PXRoaXMudmlldy5nZXRDb250ZXh0KFwiMmRcIix7YWxwaGE6dGhpcy50cmFuc3BhcmVudH0pLHRoaXMucmVmcmVzaD0hMCx0aGlzLnZpZXcud2lkdGg9dGhpcy53aWR0aCx0aGlzLnZpZXcuaGVpZ2h0PXRoaXMuaGVpZ2h0LHRoaXMuY291bnQ9MCx0aGlzLm1hc2tNYW5hZ2VyPW5ldyBiLkNhbnZhc01hc2tNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbj17Y29udGV4dDp0aGlzLmNvbnRleHQsbWFza01hbmFnZXI6dGhpcy5tYXNrTWFuYWdlcixzY2FsZU1vZGU6bnVsbCxzbW9vdGhQcm9wZXJ0eTpudWxsLHJvdW5kUGl4ZWxzOiExfSxcImltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0P3RoaXMucmVuZGVyU2Vzc2lvbi5zbW9vdGhQcm9wZXJ0eT1cImltYWdlU21vb3RoaW5nRW5hYmxlZFwiOlwid2Via2l0SW1hZ2VTbW9vdGhpbmdFbmFibGVkXCJpbiB0aGlzLmNvbnRleHQ/dGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwid2Via2l0SW1hZ2VTbW9vdGhpbmdFbmFibGVkXCI6XCJtb3pJbWFnZVNtb290aGluZ0VuYWJsZWRcImluIHRoaXMuY29udGV4dD90aGlzLnJlbmRlclNlc3Npb24uc21vb3RoUHJvcGVydHk9XCJtb3pJbWFnZVNtb290aGluZ0VuYWJsZWRcIjpcIm9JbWFnZVNtb290aGluZ0VuYWJsZWRcImluIHRoaXMuY29udGV4dCYmKHRoaXMucmVuZGVyU2Vzc2lvbi5zbW9vdGhQcm9wZXJ0eT1cIm9JbWFnZVNtb290aGluZ0VuYWJsZWRcIil9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ2FudmFzUmVuZGVyZXIsYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyPWZ1bmN0aW9uKGEpe2IudGV4dHVyZXNUb1VwZGF0ZS5sZW5ndGg9MCxiLnRleHR1cmVzVG9EZXN0cm95Lmxlbmd0aD0wLGEudXBkYXRlVHJhbnNmb3JtKCksdGhpcy5jb250ZXh0LnNldFRyYW5zZm9ybSgxLDAsMCwxLDAsMCksdGhpcy5jb250ZXh0Lmdsb2JhbEFscGhhPTEsbmF2aWdhdG9yLmlzQ29jb29uSlMmJnRoaXMudmlldy5zY3JlZW5jYW52YXMmJih0aGlzLmNvbnRleHQuZmlsbFN0eWxlPVwiYmxhY2tcIix0aGlzLmNvbnRleHQuY2xlYXIoKSksIXRoaXMudHJhbnNwYXJlbnQmJnRoaXMuY2xlYXJCZWZvcmVSZW5kZXI/KHRoaXMuY29udGV4dC5maWxsU3R5bGU9YS5iYWNrZ3JvdW5kQ29sb3JTdHJpbmcsdGhpcy5jb250ZXh0LmZpbGxSZWN0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSk6dGhpcy50cmFuc3BhcmVudCYmdGhpcy5jbGVhckJlZm9yZVJlbmRlciYmdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5yZW5kZXJEaXNwbGF5T2JqZWN0KGEpLGEuaW50ZXJhY3RpdmUmJihhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkfHwoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZD0hMCxhLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXQodGhpcykpKSxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aD4wJiYoYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5sZW5ndGg9MClcclxufSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yix0aGlzLnZpZXcud2lkdGg9YSx0aGlzLnZpZXcuaGVpZ2h0PWJ9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlckRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oYSxiKXt0aGlzLnJlbmRlclNlc3Npb24uY29udGV4dD1ifHx0aGlzLmNvbnRleHQsYS5fcmVuZGVyQ2FudmFzKHRoaXMucmVuZGVyU2Vzc2lvbil9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlclN0cmlwRmxhdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmNvbnRleHQsYz1hLnZlcnRpY2llcyxkPWMubGVuZ3RoLzI7dGhpcy5jb3VudCsrLGIuYmVnaW5QYXRoKCk7Zm9yKHZhciBlPTE7ZC0yPmU7ZSsrKXt2YXIgZj0yKmUsZz1jW2ZdLGg9Y1tmKzJdLGk9Y1tmKzRdLGo9Y1tmKzFdLGs9Y1tmKzNdLGw9Y1tmKzVdO2IubW92ZVRvKGcsaiksYi5saW5lVG8oaCxrKSxiLmxpbmVUbyhpLGwpfWIuZmlsbFN0eWxlPVwiI0ZGMDAwMFwiLGIuZmlsbCgpLGIuY2xvc2VQYXRoKCl9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlclN0cmlwPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuY29udGV4dCxjPWEudmVydGljaWVzLGQ9YS51dnMsZT1jLmxlbmd0aC8yO3RoaXMuY291bnQrKztmb3IodmFyIGY9MTtlLTI+ZjtmKyspe3ZhciBnPTIqZixoPWNbZ10saT1jW2crMl0saj1jW2crNF0saz1jW2crMV0sbD1jW2crM10sbT1jW2crNV0sbj1kW2ddKmEudGV4dHVyZS53aWR0aCxvPWRbZysyXSphLnRleHR1cmUud2lkdGgscD1kW2crNF0qYS50ZXh0dXJlLndpZHRoLHE9ZFtnKzFdKmEudGV4dHVyZS5oZWlnaHQscj1kW2crM10qYS50ZXh0dXJlLmhlaWdodCxzPWRbZys1XSphLnRleHR1cmUuaGVpZ2h0O2Iuc2F2ZSgpLGIuYmVnaW5QYXRoKCksYi5tb3ZlVG8oaCxrKSxiLmxpbmVUbyhpLGwpLGIubGluZVRvKGosbSksYi5jbG9zZVBhdGgoKSxiLmNsaXAoKTt2YXIgdD1uKnIrcSpwK28qcy1yKnAtcSpvLW4qcyx1PWgqcitxKmoraSpzLXIqai1xKmktaCpzLHY9bippK2gqcCtvKmotaSpwLWgqby1uKmosdz1uKnIqaitxKmkqcCtoKm8qcy1oKnIqcC1xKm8qai1uKmkqcyx4PWsqcitxKm0rbCpzLXIqbS1xKmwtaypzLHk9bipsK2sqcCtvKm0tbCpwLWsqby1uKm0sej1uKnIqbStxKmwqcCtrKm8qcy1rKnIqcC1xKm8qbS1uKmwqcztiLnRyYW5zZm9ybSh1L3QseC90LHYvdCx5L3Qsdy90LHovdCksYi5kcmF3SW1hZ2UoYS50ZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZSwwLDApLGIucmVzdG9yZSgpfX0sYi5DYW52YXNCdWZmZXI9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yix0aGlzLmNhbnZhcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLHRoaXMuY29udGV4dD10aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiksdGhpcy5jYW52YXMud2lkdGg9YSx0aGlzLmNhbnZhcy5oZWlnaHQ9Yn0sYi5DYW52YXNCdWZmZXIucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuQ2FudmFzQnVmZmVyLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPXRoaXMuY2FudmFzLndpZHRoPWEsdGhpcy5oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0PWJ9LGIuQ2FudmFzR3JhcGhpY3M9ZnVuY3Rpb24oKXt9LGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3M9ZnVuY3Rpb24oYSxjKXtmb3IodmFyIGQ9YS53b3JsZEFscGhhLGU9XCJcIixmPTA7ZjxhLmdyYXBoaWNzRGF0YS5sZW5ndGg7ZisrKXt2YXIgZz1hLmdyYXBoaWNzRGF0YVtmXSxoPWcucG9pbnRzO2lmKGMuc3Ryb2tlU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcubGluZUNvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5saW5lV2lkdGg9Zy5saW5lV2lkdGgsZy50eXBlPT09Yi5HcmFwaGljcy5QT0xZKXtjLmJlZ2luUGF0aCgpLGMubW92ZVRvKGhbMF0saFsxXSk7Zm9yKHZhciBpPTE7aTxoLmxlbmd0aC8yO2krKyljLmxpbmVUbyhoWzIqaV0saFsyKmkrMV0pO2hbMF09PT1oW2gubGVuZ3RoLTJdJiZoWzFdPT09aFtoLmxlbmd0aC0xXSYmYy5jbG9zZVBhdGgoKSxnLmZpbGwmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsKCkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlKCkpfWVsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5SRUNUKShnLmZpbGxDb2xvcnx8MD09PWcuZmlsbENvbG9yKSYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGxSZWN0KGhbMF0saFsxXSxoWzJdLGhbM10pKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZVJlY3QoaFswXSxoWzFdLGhbMl0saFszXSkpO2Vsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5DSVJDKWMuYmVnaW5QYXRoKCksYy5hcmMoaFswXSxoWzFdLGhbMl0sMCwyKk1hdGguUEkpLGMuY2xvc2VQYXRoKCksZy5maWxsJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKTtlbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuRUxJUCl7dmFyIGo9Zy5wb2ludHMsaz0yKmpbMl0sbD0yKmpbM10sbT1qWzBdLWsvMixuPWpbMV0tbC8yO2MuYmVnaW5QYXRoKCk7dmFyIG89LjU1MjI4NDgscD1rLzIqbyxxPWwvMipvLHI9bStrLHM9bitsLHQ9bStrLzIsdT1uK2wvMjtjLm1vdmVUbyhtLHUpLGMuYmV6aWVyQ3VydmVUbyhtLHUtcSx0LXAsbix0LG4pLGMuYmV6aWVyQ3VydmVUbyh0K3AsbixyLHUtcSxyLHUpLGMuYmV6aWVyQ3VydmVUbyhyLHUrcSx0K3Ascyx0LHMpLGMuYmV6aWVyQ3VydmVUbyh0LXAscyxtLHUrcSxtLHUpLGMuY2xvc2VQYXRoKCksZy5maWxsJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKX1lbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuUlJFQyl7dmFyIHY9aFswXSx3PWhbMV0seD1oWzJdLHk9aFszXSx6PWhbNF0sQT1NYXRoLm1pbih4LHkpLzJ8MDt6PXo+QT9BOnosYy5iZWdpblBhdGgoKSxjLm1vdmVUbyh2LHcreiksYy5saW5lVG8odix3K3kteiksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYsdyt5LHYreix3K3kpLGMubGluZVRvKHYreC16LHcreSksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYreCx3K3ksdit4LHcreS16KSxjLmxpbmVUbyh2K3gsdyt6KSxjLnF1YWRyYXRpY0N1cnZlVG8odit4LHcsdit4LXosdyksYy5saW5lVG8odit6LHcpLGMucXVhZHJhdGljQ3VydmVUbyh2LHcsdix3K3opLGMuY2xvc2VQYXRoKCksKGcuZmlsbENvbG9yfHwwPT09Zy5maWxsQ29sb3IpJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKX19fSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzTWFzaz1mdW5jdGlvbihhLGMpe3ZhciBkPWEuZ3JhcGhpY3NEYXRhLmxlbmd0aDtpZigwIT09ZCl7ZD4xJiYoZD0xLHdpbmRvdy5jb25zb2xlLmxvZyhcIlBpeGkuanMgd2FybmluZzogbWFza3MgaW4gY2FudmFzIGNhbiBvbmx5IG1hc2sgdXNpbmcgdGhlIGZpcnN0IHBhdGggaW4gdGhlIGdyYXBoaWNzIG9iamVjdFwiKSk7Zm9yKHZhciBlPTA7MT5lO2UrKyl7dmFyIGY9YS5ncmFwaGljc0RhdGFbZV0sZz1mLnBvaW50cztpZihmLnR5cGU9PT1iLkdyYXBoaWNzLlBPTFkpe2MuYmVnaW5QYXRoKCksYy5tb3ZlVG8oZ1swXSxnWzFdKTtmb3IodmFyIGg9MTtoPGcubGVuZ3RoLzI7aCsrKWMubGluZVRvKGdbMipoXSxnWzIqaCsxXSk7Z1swXT09PWdbZy5sZW5ndGgtMl0mJmdbMV09PT1nW2cubGVuZ3RoLTFdJiZjLmNsb3NlUGF0aCgpfWVsc2UgaWYoZi50eXBlPT09Yi5HcmFwaGljcy5SRUNUKWMuYmVnaW5QYXRoKCksYy5yZWN0KGdbMF0sZ1sxXSxnWzJdLGdbM10pLGMuY2xvc2VQYXRoKCk7ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLkNJUkMpYy5iZWdpblBhdGgoKSxjLmFyYyhnWzBdLGdbMV0sZ1syXSwwLDIqTWF0aC5QSSksYy5jbG9zZVBhdGgoKTtlbHNlIGlmKGYudHlwZT09PWIuR3JhcGhpY3MuRUxJUCl7dmFyIGk9Zi5wb2ludHMsaj0yKmlbMl0saz0yKmlbM10sbD1pWzBdLWovMixtPWlbMV0tay8yO2MuYmVnaW5QYXRoKCk7dmFyIG49LjU1MjI4NDgsbz1qLzIqbixwPWsvMipuLHE9bCtqLHI9bStrLHM9bCtqLzIsdD1tK2svMjtjLm1vdmVUbyhsLHQpLGMuYmV6aWVyQ3VydmVUbyhsLHQtcCxzLW8sbSxzLG0pLGMuYmV6aWVyQ3VydmVUbyhzK28sbSxxLHQtcCxxLHQpLGMuYmV6aWVyQ3VydmVUbyhxLHQrcCxzK28scixzLHIpLGMuYmV6aWVyQ3VydmVUbyhzLW8scixsLHQrcCxsLHQpLGMuY2xvc2VQYXRoKCl9ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLlJSRUMpe3ZhciB1PWdbMF0sdj1nWzFdLHc9Z1syXSx4PWdbM10seT1nWzRdLHo9TWF0aC5taW4odyx4KS8yfDA7eT15Pno/ejp5LGMuYmVnaW5QYXRoKCksYy5tb3ZlVG8odSx2K3kpLGMubGluZVRvKHUsdit4LXkpLGMucXVhZHJhdGljQ3VydmVUbyh1LHYreCx1K3ksdit4KSxjLmxpbmVUbyh1K3cteSx2K3gpLGMucXVhZHJhdGljQ3VydmVUbyh1K3csdit4LHUrdyx2K3gteSksYy5saW5lVG8odSt3LHYreSksYy5xdWFkcmF0aWNDdXJ2ZVRvKHUrdyx2LHUrdy15LHYpLGMubGluZVRvKHUreSx2KSxjLnF1YWRyYXRpY0N1cnZlVG8odSx2LHUsdit5KSxjLmNsb3NlUGF0aCgpfX19fSxiLkdyYXBoaWNzPWZ1bmN0aW9uKCl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5yZW5kZXJhYmxlPSEwLHRoaXMuZmlsbEFscGhhPTEsdGhpcy5saW5lV2lkdGg9MCx0aGlzLmxpbmVDb2xvcj1cImJsYWNrXCIsdGhpcy5ncmFwaGljc0RhdGE9W10sdGhpcy50aW50PTE2Nzc3MjE1LHRoaXMuYmxlbmRNb2RlPWIuYmxlbmRNb2Rlcy5OT1JNQUwsdGhpcy5jdXJyZW50UGF0aD17cG9pbnRzOltdfSx0aGlzLl93ZWJHTD1bXSx0aGlzLmlzTWFzaz0hMSx0aGlzLmJvdW5kcz1udWxsLHRoaXMuYm91bmRzUGFkZGluZz0xMCx0aGlzLmRpcnR5PSEwfSxiLkdyYXBoaWNzLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuR3JhcGhpY3MucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuR3JhcGhpY3MsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuR3JhcGhpY3MucHJvdG90eXBlLFwiY2FjaGVBc0JpdG1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY2FjaGVBc0JpdG1hcH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2NhY2hlQXNCaXRtYXA9YSx0aGlzLl9jYWNoZUFzQml0bWFwP3RoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCk6KHRoaXMuZGVzdHJveUNhY2hlZFNwcml0ZSgpLHRoaXMuZGlydHk9ITApfX0pLGIuR3JhcGhpY3MucHJvdG90eXBlLmxpbmVTdHlsZT1mdW5jdGlvbihhLGMsZCl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5saW5lV2lkdGg9YXx8MCx0aGlzLmxpbmVDb2xvcj1jfHwwLHRoaXMubGluZUFscGhhPWFyZ3VtZW50cy5sZW5ndGg8Mz8xOmQsdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W10sdHlwZTpiLkdyYXBoaWNzLlBPTFl9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUubW92ZVRvPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD10aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbXSx0eXBlOmIuR3JhcGhpY3MuUE9MWX0sdGhpcy5jdXJyZW50UGF0aC5wb2ludHMucHVzaChhLGMpLHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUubGluZVRvPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLnB1c2goYSxiKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLnF1YWRyYXRpY0N1cnZlVG89ZnVuY3Rpb24oYSxiLGMsZCl7MD09PXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aCYmdGhpcy5tb3ZlVG8oMCwwKTt2YXIgZSxmLGc9MjAsaD10aGlzLmN1cnJlbnRQYXRoLnBvaW50czswPT09aC5sZW5ndGgmJnRoaXMubW92ZVRvKDAsMCk7Zm9yKHZhciBpPWhbaC5sZW5ndGgtMl0saj1oW2gubGVuZ3RoLTFdLGs9MCxsPTE7Zz49bDtsKyspaz1sL2csZT1pKyhhLWkpKmssZj1qKyhiLWopKmssaC5wdXNoKGUrKGErKGMtYSkqay1lKSprLGYrKGIrKGQtYikqay1mKSprKTtyZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5iZXppZXJDdXJ2ZVRvPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXswPT09dGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RoJiZ0aGlzLm1vdmVUbygwLDApO2Zvcih2YXIgZyxoLGksaixrLGw9MjAsbT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cyxuPW1bbS5sZW5ndGgtMl0sbz1tW20ubGVuZ3RoLTFdLHA9MCxxPTE7bD5xO3ErKylwPXEvbCxnPTEtcCxoPWcqZyxpPWgqZyxqPXAqcCxrPWoqcCxtLnB1c2goaSpuKzMqaCpwKmErMypnKmoqYytrKmUsaSpvKzMqaCpwKmIrMypnKmoqZCtrKmYpO3JldHVybiB0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmFyY1RvPWZ1bmN0aW9uKGEsYixjLGQsZSl7MD09PXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aCYmdGhpcy5tb3ZlVG8oYSxiKTt2YXIgZj10aGlzLmN1cnJlbnRQYXRoLnBvaW50cyxnPWZbZi5sZW5ndGgtMl0saD1mW2YubGVuZ3RoLTFdLGk9aC1iLGo9Zy1hLGs9ZC1iLGw9Yy1hLG09TWF0aC5hYnMoaSpsLWoqayk7aWYoMWUtOD5tfHwwPT09ZSlmLnB1c2goYSxiKTtlbHNle3ZhciBuPWkqaStqKmosbz1rKmsrbCpsLHA9aSprK2oqbCxxPWUqTWF0aC5zcXJ0KG4pL20scj1lKk1hdGguc3FydChvKS9tLHM9cSpwL24sdD1yKnAvbyx1PXEqbCtyKmosdj1xKmsrcippLHc9aioocitzKSx4PWkqKHIrcykseT1sKihxK3QpLHo9ayoocSt0KSxBPU1hdGguYXRhbjIoeC12LHctdSksQj1NYXRoLmF0YW4yKHotdix5LXUpO3RoaXMuYXJjKHUrYSx2K2IsZSxBLEIsaiprPmwqaSl9cmV0dXJuIHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuYXJjPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXt2YXIgZz1hK01hdGguY29zKGQpKmMsaD1iK01hdGguc2luKGQpKmMsaT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cztpZigoMCE9PWkubGVuZ3RoJiZpW2kubGVuZ3RoLTJdIT09Z3x8aVtpLmxlbmd0aC0xXSE9PWgpJiYodGhpcy5tb3ZlVG8oZyxoKSxpPXRoaXMuY3VycmVudFBhdGgucG9pbnRzKSxkPT09ZSlyZXR1cm4gdGhpczshZiYmZD49ZT9lKz0yKk1hdGguUEk6ZiYmZT49ZCYmKGQrPTIqTWF0aC5QSSk7dmFyIGo9Zj8tMSooZC1lKTplLWQsaz1NYXRoLmFicyhqKS8oMipNYXRoLlBJKSo0MDtpZigwPT09ailyZXR1cm4gdGhpcztmb3IodmFyIGw9ai8oMiprKSxtPTIqbCxuPU1hdGguY29zKGwpLG89TWF0aC5zaW4obCkscD1rLTEscT1wJTEvcCxyPTA7cD49cjtyKyspe3ZhciBzPXIrcSpyLHQ9bCtkK20qcyx1PU1hdGguY29zKHQpLHY9LU1hdGguc2luKHQpO2kucHVzaCgobip1K28qdikqYythLChuKi12K28qdSkqYytiKX1yZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3UGF0aD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOltdLHR5cGU6Yi5HcmFwaGljcy5QT0xZfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuY3VycmVudFBhdGgucG9pbnRzPXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmNvbmNhdChhKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmJlZ2luRmlsbD1mdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmZpbGxpbmc9ITAsdGhpcy5maWxsQ29sb3I9YXx8MCx0aGlzLmZpbGxBbHBoYT1hcmd1bWVudHMubGVuZ3RoPDI/MTpiLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmVuZEZpbGw9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5maWxsaW5nPSExLHRoaXMuZmlsbENvbG9yPW51bGwsdGhpcy5maWxsQWxwaGE9MSx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3UmVjdD1mdW5jdGlvbihhLGMsZCxlKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZV0sdHlwZTpiLkdyYXBoaWNzLlJFQ1R9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3Um91bmRlZFJlY3Q9ZnVuY3Rpb24oYSxjLGQsZSxmKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZSxmXSx0eXBlOmIuR3JhcGhpY3MuUlJFQ30sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdDaXJjbGU9ZnVuY3Rpb24oYSxjLGQpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxkXSx0eXBlOmIuR3JhcGhpY3MuQ0lSQ30sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdFbGxpcHNlPWZ1bmN0aW9uKGEsYyxkLGUpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxlXSx0eXBlOmIuR3JhcGhpY3MuRUxJUH0sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubGluZVdpZHRoPTAsdGhpcy5maWxsaW5nPSExLHRoaXMuZGlydHk9ITAsdGhpcy5jbGVhckRpcnR5PSEwLHRoaXMuZ3JhcGhpY3NEYXRhPVtdLHRoaXMuYm91bmRzPW51bGwsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZ2VuZXJhdGVUZXh0dXJlPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nZXRCb3VuZHMoKSxjPW5ldyBiLkNhbnZhc0J1ZmZlcihhLndpZHRoLGEuaGVpZ2h0KSxkPWIuVGV4dHVyZS5mcm9tQ2FudmFzKGMuY2FudmFzKTtyZXR1cm4gYy5jb250ZXh0LnRyYW5zbGF0ZSgtYS54LC1hLnkpLGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3ModGhpcyxjLmNvbnRleHQpLGR9LGIuR3JhcGhpY3MucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEmJnRoaXMuaXNNYXNrIT09ITApe2lmKHRoaXMuX2NhY2hlQXNCaXRtYXApcmV0dXJuIHRoaXMuZGlydHkmJih0aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpLGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLmJhc2VUZXh0dXJlLGEuZ2wpLHRoaXMuZGlydHk9ITEpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbHBoYT10aGlzLmFscGhhLGIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0wuY2FsbCh0aGlzLl9jYWNoZWRTcHJpdGUsYSksdm9pZCAwO2lmKGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEuYmxlbmRNb2RlTWFuYWdlci5zZXRCbGVuZE1vZGUodGhpcy5ibGVuZE1vZGUpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jayksdGhpcy5ibGVuZE1vZGUhPT1hLnNwcml0ZUJhdGNoLmN1cnJlbnRCbGVuZE1vZGUpe2Euc3ByaXRlQmF0Y2guY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZTt2YXIgYz1iLmJsZW5kTW9kZXNXZWJHTFthLnNwcml0ZUJhdGNoLmN1cnJlbnRCbGVuZE1vZGVdO2Euc3ByaXRlQmF0Y2guZ2wuYmxlbmRGdW5jKGNbMF0sY1sxXSl9aWYoYi5XZWJHTEdyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsYSksdGhpcy5jaGlsZHJlbi5sZW5ndGgpe2Euc3ByaXRlQmF0Y2guc3RhcnQoKTtmb3IodmFyIGQ9MCxlPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2U+ZDtkKyspdGhpcy5jaGlsZHJlbltkXS5fcmVuZGVyV2ViR0woYSk7YS5zcHJpdGVCYXRjaC5zdG9wKCl9dGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnBvcEZpbHRlcigpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayh0aGlzLm1hc2ssYSksYS5kcmF3Q291bnQrKyxhLnNwcml0ZUJhdGNoLnN0YXJ0KCl9fSxiLkdyYXBoaWNzLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSYmdGhpcy5pc01hc2shPT0hMCl7dmFyIGM9YS5jb250ZXh0LGQ9dGhpcy53b3JsZFRyYW5zZm9ybTt0aGlzLmJsZW5kTW9kZSE9PWEuY3VycmVudEJsZW5kTW9kZSYmKGEuY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZSxjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1iLmJsZW5kTW9kZXNDYW52YXNbYS5jdXJyZW50QmxlbmRNb2RlXSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEuY29udGV4dCksYy5zZXRUcmFuc2Zvcm0oZC5hLGQuYyxkLmIsZC5kLGQudHgsZC50eSksYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljcyh0aGlzLGMpO2Zvcih2YXIgZT0wLGY9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Zj5lO2UrKyl0aGlzLmNoaWxkcmVuW2VdLl9yZW5kZXJDYW52YXMoYSk7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCl9fSxiLkdyYXBoaWNzLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oYSl7dGhpcy5ib3VuZHN8fHRoaXMudXBkYXRlQm91bmRzKCk7dmFyIGI9dGhpcy5ib3VuZHMueCxjPXRoaXMuYm91bmRzLndpZHRoK3RoaXMuYm91bmRzLngsZD10aGlzLmJvdW5kcy55LGU9dGhpcy5ib3VuZHMuaGVpZ2h0K3RoaXMuYm91bmRzLnksZj1hfHx0aGlzLndvcmxkVHJhbnNmb3JtLGc9Zi5hLGg9Zi5jLGk9Zi5iLGo9Zi5kLGs9Zi50eCxsPWYudHksbT1nKmMraSplK2ssbj1qKmUraCpjK2wsbz1nKmIraSplK2sscD1qKmUraCpiK2wscT1nKmIraSpkK2sscj1qKmQraCpiK2wscz1nKmMraSpkK2ssdD1qKmQraCpjK2wsdT1tLHY9bix3PW0seD1uO3c9dz5vP286dyx3PXc+cT9xOncsdz13PnM/czp3LHg9eD5wP3A6eCx4PXg+cj9yOngseD14PnQ/dDp4LHU9bz51P286dSx1PXE+dT9xOnUsdT1zPnU/czp1LHY9cD52P3A6dix2PXI+dj9yOnYsdj10PnY/dDp2O3ZhciB5PXRoaXMuX2JvdW5kcztyZXR1cm4geS54PXcseS53aWR0aD11LXcseS55PXgseS5oZWlnaHQ9di14LHl9LGIuR3JhcGhpY3MucHJvdG90eXBlLnVwZGF0ZUJvdW5kcz1mdW5jdGlvbigpe2Zvcih2YXIgYSxjLGQsZSxmLGc9MS8wLGg9LTEvMCxpPTEvMCxqPS0xLzAsaz0wO2s8dGhpcy5ncmFwaGljc0RhdGEubGVuZ3RoO2srKyl7dmFyIGw9dGhpcy5ncmFwaGljc0RhdGFba10sbT1sLnR5cGUsbj1sLmxpbmVXaWR0aDtpZihhPWwucG9pbnRzLG09PT1iLkdyYXBoaWNzLlJFQ1QpYz1hWzBdLW4vMixkPWFbMV0tbi8yLGU9YVsyXStuLGY9YVszXStuLGc9Zz5jP2M6ZyxoPWMrZT5oP2MrZTpoLGk9aT5kP2M6aSxqPWQrZj5qP2QrZjpqO2Vsc2UgaWYobT09PWIuR3JhcGhpY3MuQ0lSQ3x8bT09PWIuR3JhcGhpY3MuRUxJUCljPWFbMF0sZD1hWzFdLGU9YVsyXStuLzIsZj1hWzNdK24vMixnPWc+Yy1lP2MtZTpnLGg9YytlPmg/YytlOmgsaT1pPmQtZj9kLWY6aSxqPWQrZj5qP2QrZjpqO2Vsc2UgZm9yKHZhciBvPTA7bzxhLmxlbmd0aDtvKz0yKWM9YVtvXSxkPWFbbysxXSxnPWc+Yy1uP2MtbjpnLGg9YytuPmg/YytuOmgsaT1pPmQtbj9kLW46aSxqPWQrbj5qP2QrbjpqfXZhciBwPXRoaXMuYm91bmRzUGFkZGluZzt0aGlzLmJvdW5kcz1uZXcgYi5SZWN0YW5nbGUoZy1wLGktcCxoLWcrMipwLGotaSsyKnApfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5fZ2VuZXJhdGVDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdldExvY2FsQm91bmRzKCk7aWYodGhpcy5fY2FjaGVkU3ByaXRlKXRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXIucmVzaXplKGEud2lkdGgsYS5oZWlnaHQpO2Vsc2V7dmFyIGM9bmV3IGIuQ2FudmFzQnVmZmVyKGEud2lkdGgsYS5oZWlnaHQpLGQ9Yi5UZXh0dXJlLmZyb21DYW52YXMoYy5jYW52YXMpO3RoaXMuX2NhY2hlZFNwcml0ZT1uZXcgYi5TcHJpdGUoZCksdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlcj1jLHRoaXMuX2NhY2hlZFNwcml0ZS53b3JsZFRyYW5zZm9ybT10aGlzLndvcmxkVHJhbnNmb3JtfXRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueD0tKGEueC9hLndpZHRoKSx0aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLnk9LShhLnkvYS5oZWlnaHQpLHRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXIuY29udGV4dC50cmFuc2xhdGUoLWEueCwtYS55KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlci5jb250ZXh0KSx0aGlzLl9jYWNoZWRTcHJpdGUuYWxwaGE9dGhpcy5hbHBoYX0sYi5HcmFwaGljcy5wcm90b3R5cGUuZGVzdHJveUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3RoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLmRlc3Ryb3koITApLHRoaXMuX2NhY2hlZFNwcml0ZT1udWxsfSxiLkdyYXBoaWNzLlBPTFk9MCxiLkdyYXBoaWNzLlJFQ1Q9MSxiLkdyYXBoaWNzLkNJUkM9MixiLkdyYXBoaWNzLkVMSVA9MyxiLkdyYXBoaWNzLlJSRUM9NCxiLlN0cmlwPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZT1hLHRoaXMudXZzPW5ldyBiLkZsb2F0MzJBcnJheShbMCwxLDEsMSwxLDAsMCwxXSksdGhpcy52ZXJ0aWNpZXM9bmV3IGIuRmxvYXQzMkFycmF5KFswLDAsMTAwLDAsMTAwLDEwMCwwLDEwMF0pLHRoaXMuY29sb3JzPW5ldyBiLkZsb2F0MzJBcnJheShbMSwxLDEsMV0pLHRoaXMuaW5kaWNlcz1uZXcgYi5VaW50MTZBcnJheShbMCwxLDIsM10pLHRoaXMuZGlydHk9ITB9LGIuU3RyaXAucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TdHJpcC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TdHJpcCxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7IXRoaXMudmlzaWJsZXx8dGhpcy5hbHBoYTw9MHx8KGEuc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX3ZlcnRleEJ1ZmZlcnx8dGhpcy5faW5pdFdlYkdMKGEpLGEuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoYS5zaGFkZXJNYW5hZ2VyLnN0cmlwU2hhZGVyKSx0aGlzLl9yZW5kZXJTdHJpcChhKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpfSxiLlN0cmlwLnByb3RvdHlwZS5faW5pdFdlYkdMPWZ1bmN0aW9uKGEpe3ZhciBiPWEuZ2w7dGhpcy5fdmVydGV4QnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksdGhpcy5faW5kZXhCdWZmZXI9Yi5jcmVhdGVCdWZmZXIoKSx0aGlzLl91dkJ1ZmZlcj1iLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuX2NvbG9yQnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksYi5iaW5kQnVmZmVyKGIuQVJSQVlfQlVGRkVSLHRoaXMuX3ZlcnRleEJ1ZmZlciksYi5idWZmZXJEYXRhKGIuQVJSQVlfQlVGRkVSLHRoaXMudmVydGljaWVzLGIuRFlOQU1JQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5BUlJBWV9CVUZGRVIsdGhpcy5fdXZCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkFSUkFZX0JVRkZFUix0aGlzLnV2cyxiLlNUQVRJQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5BUlJBWV9CVUZGRVIsdGhpcy5fY29sb3JCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkFSUkFZX0JVRkZFUix0aGlzLmNvbG9ycyxiLlNUQVRJQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlciksYi5idWZmZXJEYXRhKGIuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGIuU1RBVElDX0RSQVcpfSxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyU3RyaXA9ZnVuY3Rpb24oYSl7dmFyIGM9YS5nbCxkPWEucHJvamVjdGlvbixlPWEub2Zmc2V0LGY9YS5zaGFkZXJNYW5hZ2VyLnN0cmlwU2hhZGVyO2MuYmxlbmRGdW5jKGMuT05FLGMuT05FX01JTlVTX1NSQ19BTFBIQSksYy51bmlmb3JtTWF0cml4M2Z2KGYudHJhbnNsYXRpb25NYXRyaXgsITEsdGhpcy53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksYy51bmlmb3JtMmYoZi5wcm9qZWN0aW9uVmVjdG9yLGQueCwtZC55KSxjLnVuaWZvcm0yZihmLm9mZnNldFZlY3RvciwtZS54LC1lLnkpLGMudW5pZm9ybTFmKGYuYWxwaGEsMSksdGhpcy5kaXJ0eT8odGhpcy5kaXJ0eT0hMSxjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdmVydGV4QnVmZmVyKSxjLmJ1ZmZlckRhdGEoYy5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNpZXMsYy5TVEFUSUNfRFJBVyksYy52ZXJ0ZXhBdHRyaWJQb2ludGVyKGYuYVZlcnRleFBvc2l0aW9uLDIsYy5GTE9BVCwhMSwwLDApLGMuYmluZEJ1ZmZlcihjLkFSUkFZX0JVRkZFUix0aGlzLl91dkJ1ZmZlciksYy5idWZmZXJEYXRhKGMuQVJSQVlfQlVGRkVSLHRoaXMudXZzLGMuU1RBVElDX0RSQVcpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFUZXh0dXJlQ29vcmQsMixjLkZMT0FULCExLDAsMCksYy5hY3RpdmVUZXh0dXJlKGMuVEVYVFVSRTApLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tjLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLGMpKSxjLmJpbmRCdWZmZXIoYy5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlciksYy5idWZmZXJEYXRhKGMuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGMuU1RBVElDX0RSQVcpKTooYy5iaW5kQnVmZmVyKGMuQVJSQVlfQlVGRkVSLHRoaXMuX3ZlcnRleEJ1ZmZlciksYy5idWZmZXJTdWJEYXRhKGMuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0aWNpZXMpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFWZXJ0ZXhQb3NpdGlvbiwyLGMuRkxPQVQsITEsMCwwKSxjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdXZCdWZmZXIpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFUZXh0dXJlQ29vcmQsMixjLkZMT0FULCExLDAsMCksYy5hY3RpdmVUZXh0dXJlKGMuVEVYVFVSRTApLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tjLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLGMpKSxjLmJpbmRCdWZmZXIoYy5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlcikpLGMuZHJhd0VsZW1lbnRzKGMuVFJJQU5HTEVfU1RSSVAsdGhpcy5pbmRpY2VzLmxlbmd0aCxjLlVOU0lHTkVEX1NIT1JULDApfSxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe3ZhciBiPWEuY29udGV4dCxjPXRoaXMud29ybGRUcmFuc2Zvcm07YS5yb3VuZFBpeGVscz9iLnNldFRyYW5zZm9ybShjLmEsYy5jLGMuYixjLmQsMHxjLnR4LDB8Yy50eSk6Yi5zZXRUcmFuc2Zvcm0oYy5hLGMuYyxjLmIsYy5kLGMudHgsYy50eSk7dmFyIGQ9dGhpcyxlPWQudmVydGljaWVzLGY9ZC51dnMsZz1lLmxlbmd0aC8yO3RoaXMuY291bnQrKztmb3IodmFyIGg9MDtnLTI+aDtoKyspe3ZhciBpPTIqaCxqPWVbaV0saz1lW2krMl0sbD1lW2krNF0sbT1lW2krMV0sbj1lW2krM10sbz1lW2krNV0scD0oaitrK2wpLzMscT0obStuK28pLzMscj1qLXAscz1tLXEsdD1NYXRoLnNxcnQocipyK3Mqcyk7aj1wK3IvdCoodCszKSxtPXErcy90Kih0KzMpLHI9ay1wLHM9bi1xLHQ9TWF0aC5zcXJ0KHIqcitzKnMpLGs9cCtyL3QqKHQrMyksbj1xK3MvdCoodCszKSxyPWwtcCxzPW8tcSx0PU1hdGguc3FydChyKnIrcypzKSxsPXArci90Kih0KzMpLG89cStzL3QqKHQrMyk7dmFyIHU9ZltpXSpkLnRleHR1cmUud2lkdGgsdj1mW2krMl0qZC50ZXh0dXJlLndpZHRoLHc9ZltpKzRdKmQudGV4dHVyZS53aWR0aCx4PWZbaSsxXSpkLnRleHR1cmUuaGVpZ2h0LHk9ZltpKzNdKmQudGV4dHVyZS5oZWlnaHQsej1mW2krNV0qZC50ZXh0dXJlLmhlaWdodDtiLnNhdmUoKSxiLmJlZ2luUGF0aCgpLGIubW92ZVRvKGosbSksYi5saW5lVG8oayxuKSxiLmxpbmVUbyhsLG8pLGIuY2xvc2VQYXRoKCksYi5jbGlwKCk7dmFyIEE9dSp5K3gqdyt2KnoteSp3LXgqdi11KnosQj1qKnkreCpsK2sqei15KmwteCprLWoqeixDPXUqaytqKncrdipsLWsqdy1qKnYtdSpsLEQ9dSp5KmwreCprKncraip2Knotaip5KncteCp2KmwtdSprKnosRT1tKnkreCpvK24qei15Km8teCpuLW0qeixGPXUqbittKncrdipvLW4qdy1tKnYtdSpvLEc9dSp5Km8reCpuKncrbSp2KnotbSp5KncteCp2Km8tdSpuKno7Yi50cmFuc2Zvcm0oQi9BLEUvQSxDL0EsRi9BLEQvQSxHL0EpLGIuZHJhd0ltYWdlKGQudGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsMCwwKSxiLnJlc3RvcmUoKX19LGIuU3RyaXAucHJvdG90eXBlLm9uVGV4dHVyZVVwZGF0ZT1mdW5jdGlvbigpe3RoaXMudXBkYXRlRnJhbWU9ITB9LGIuUm9wZT1mdW5jdGlvbihhLGMpe2IuU3RyaXAuY2FsbCh0aGlzLGEpLHRoaXMucG9pbnRzPWMsdGhpcy52ZXJ0aWNpZXM9bmV3IGIuRmxvYXQzMkFycmF5KDQqYy5sZW5ndGgpLHRoaXMudXZzPW5ldyBiLkZsb2F0MzJBcnJheSg0KmMubGVuZ3RoKSx0aGlzLmNvbG9ycz1uZXcgYi5GbG9hdDMyQXJyYXkoMipjLmxlbmd0aCksdGhpcy5pbmRpY2VzPW5ldyBiLlVpbnQxNkFycmF5KDIqYy5sZW5ndGgpLHRoaXMucmVmcmVzaCgpfSxiLlJvcGUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5TdHJpcC5wcm90b3R5cGUpLGIuUm9wZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Sb3BlLGIuUm9wZS5wcm90b3R5cGUucmVmcmVzaD1mdW5jdGlvbigpe3ZhciBhPXRoaXMucG9pbnRzO2lmKCEoYS5sZW5ndGg8MSkpe3ZhciBiPXRoaXMudXZzLGM9YVswXSxkPXRoaXMuaW5kaWNlcyxlPXRoaXMuY29sb3JzO3RoaXMuY291bnQtPS4yLGJbMF09MCxiWzFdPTAsYlsyXT0wLGJbM109MSxlWzBdPTEsZVsxXT0xLGRbMF09MCxkWzFdPTE7Zm9yKHZhciBmLGcsaCxpPWEubGVuZ3RoLGo9MTtpPmo7aisrKWY9YVtqXSxnPTQqaixoPWovKGktMSksaiUyPyhiW2ddPWgsYltnKzFdPTAsYltnKzJdPWgsYltnKzNdPTEpOihiW2ddPWgsYltnKzFdPTAsYltnKzJdPWgsYltnKzNdPTEpLGc9MipqLGVbZ109MSxlW2crMV09MSxnPTIqaixkW2ddPWcsZFtnKzFdPWcrMSxjPWZ9fSxiLlJvcGUucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3ZhciBhPXRoaXMucG9pbnRzO2lmKCEoYS5sZW5ndGg8MSkpe3ZhciBjLGQ9YVswXSxlPXt4OjAseTowfTt0aGlzLmNvdW50LT0uMjtmb3IodmFyIGYsZyxoLGksaixrPXRoaXMudmVydGljaWVzLGw9YS5sZW5ndGgsbT0wO2w+bTttKyspZj1hW21dLGc9NCptLGM9bTxhLmxlbmd0aC0xP2FbbSsxXTpmLGUueT0tKGMueC1kLngpLGUueD1jLnktZC55LGg9MTAqKDEtbS8obC0xKSksaD4xJiYoaD0xKSxpPU1hdGguc3FydChlLngqZS54K2UueSplLnkpLGo9dGhpcy50ZXh0dXJlLmhlaWdodC8yLGUueC89aSxlLnkvPWksZS54Kj1qLGUueSo9aixrW2ddPWYueCtlLngsa1tnKzFdPWYueStlLnksa1tnKzJdPWYueC1lLngsa1tnKzNdPWYueS1lLnksZD1mO2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9fSxiLlJvcGUucHJvdG90eXBlLnNldFRleHR1cmU9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0dXJlPWF9LGIuVGlsaW5nU3ByaXRlPWZ1bmN0aW9uKGEsYyxkKXtiLlNwcml0ZS5jYWxsKHRoaXMsYSksdGhpcy5fd2lkdGg9Y3x8MTAwLHRoaXMuX2hlaWdodD1kfHwxMDAsdGhpcy50aWxlU2NhbGU9bmV3IGIuUG9pbnQoMSwxKSx0aGlzLnRpbGVTY2FsZU9mZnNldD1uZXcgYi5Qb2ludCgxLDEpLHRoaXMudGlsZVBvc2l0aW9uPW5ldyBiLlBvaW50KDAsMCksdGhpcy5yZW5kZXJhYmxlPSEwLHRoaXMudGludD0xNjc3NzIxNSx0aGlzLmJsZW5kTW9kZT1iLmJsZW5kTW9kZXMuTk9STUFMfSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlNwcml0ZS5wcm90b3R5cGUpLGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlRpbGluZ1Nwcml0ZSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3dpZHRofSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9oZWlnaHQ9YX19KSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuc2V0VGV4dHVyZT1mdW5jdGlvbihhKXt0aGlzLnRleHR1cmUhPT1hJiYodGhpcy50ZXh0dXJlPWEsdGhpcy5yZWZyZXNoVGV4dHVyZT0hMCx0aGlzLmNhY2hlZFRpbnQ9MTY3NzcyMTUpfSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSl7dmFyIGMsZDtmb3IodGhpcy5fbWFzayYmKGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5tYXNrLGEpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKSksdGhpcy5fZmlsdGVycyYmKGEuc3ByaXRlQmF0Y2guZmx1c2goKSxhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jaykpLCF0aGlzLnRpbGluZ1RleHR1cmV8fHRoaXMucmVmcmVzaFRleHR1cmU/KHRoaXMuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlKCEwKSx0aGlzLnRpbGluZ1RleHR1cmUmJnRoaXMudGlsaW5nVGV4dHVyZS5uZWVkc1VwZGF0ZSYmKGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZSxhLmdsKSx0aGlzLnRpbGluZ1RleHR1cmUubmVlZHNVcGRhdGU9ITEpKTphLnNwcml0ZUJhdGNoLnJlbmRlclRpbGluZ1Nwcml0ZSh0aGlzKSxjPTAsZD10aGlzLmNoaWxkcmVuLmxlbmd0aDtkPmM7YysrKXRoaXMuY2hpbGRyZW5bY10uX3JlbmRlcldlYkdMKGEpO2Euc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpfX0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhKXt2YXIgYz1hLmNvbnRleHQ7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGMpLGMuZ2xvYmFsQWxwaGE9dGhpcy53b3JsZEFscGhhO3ZhciBkLGUsZj10aGlzLndvcmxkVHJhbnNmb3JtO2lmKGMuc2V0VHJhbnNmb3JtKGYuYSxmLmMsZi5iLGYuZCxmLnR4LGYudHkpLCF0aGlzLl9fdGlsZVBhdHRlcm58fHRoaXMucmVmcmVzaFRleHR1cmUpe2lmKHRoaXMuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlKCExKSwhdGhpcy50aWxpbmdUZXh0dXJlKXJldHVybjt0aGlzLl9fdGlsZVBhdHRlcm49Yy5jcmVhdGVQYXR0ZXJuKHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsXCJyZXBlYXRcIil9dGhpcy5ibGVuZE1vZGUhPT1hLmN1cnJlbnRCbGVuZE1vZGUmJihhLmN1cnJlbnRCbGVuZE1vZGU9dGhpcy5ibGVuZE1vZGUsYy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249Yi5ibGVuZE1vZGVzQ2FudmFzW2EuY3VycmVudEJsZW5kTW9kZV0pO3ZhciBnPXRoaXMudGlsZVBvc2l0aW9uLGg9dGhpcy50aWxlU2NhbGU7Zm9yKGcueCU9dGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLndpZHRoLGcueSU9dGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLmhlaWdodCxjLnNjYWxlKGgueCxoLnkpLGMudHJhbnNsYXRlKGcueCxnLnkpLGMuZmlsbFN0eWxlPXRoaXMuX190aWxlUGF0dGVybixjLmZpbGxSZWN0KC1nLngrdGhpcy5hbmNob3IueCotdGhpcy5fd2lkdGgsLWcueSt0aGlzLmFuY2hvci55Ki10aGlzLl9oZWlnaHQsdGhpcy5fd2lkdGgvaC54LHRoaXMuX2hlaWdodC9oLnkpLGMuc2NhbGUoMS9oLngsMS9oLnkpLGMudHJhbnNsYXRlKC1nLngsLWcueSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCksZD0wLGU9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZT5kO2QrKyl0aGlzLmNoaWxkcmVuW2RdLl9yZW5kZXJDYW52YXMoYSl9fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5fd2lkdGgsYj10aGlzLl9oZWlnaHQsYz1hKigxLXRoaXMuYW5jaG9yLngpLGQ9YSotdGhpcy5hbmNob3IueCxlPWIqKDEtdGhpcy5hbmNob3IueSksZj1iKi10aGlzLmFuY2hvci55LGc9dGhpcy53b3JsZFRyYW5zZm9ybSxoPWcuYSxpPWcuYyxqPWcuYixrPWcuZCxsPWcudHgsbT1nLnR5LG49aCpkK2oqZitsLG89aypmK2kqZCttLHA9aCpjK2oqZitsLHE9aypmK2kqYyttLHI9aCpjK2oqZStsLHM9ayplK2kqYyttLHQ9aCpkK2oqZStsLHU9ayplK2kqZCttLHY9LTEvMCx3PS0xLzAseD0xLzAseT0xLzA7eD14Pm4/bjp4LHg9eD5wP3A6eCx4PXg+cj9yOngseD14PnQ/dDp4LHk9eT5vP286eSx5PXk+cT9xOnkseT15PnM/czp5LHk9eT51P3U6eSx2PW4+dj9uOnYsdj1wPnY/cDp2LHY9cj52P3I6dix2PXQ+dj90OnYsdz1vPnc/bzp3LHc9cT53P3E6dyx3PXM+dz9zOncsdz11Pnc/dTp3O3ZhciB6PXRoaXMuX2JvdW5kcztyZXR1cm4gei54PXgsei53aWR0aD12LXgsei55PXksei5oZWlnaHQ9dy15LHRoaXMuX2N1cnJlbnRCb3VuZHM9eix6fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUub25UZXh0dXJlVXBkYXRlPWZ1bmN0aW9uKCl7fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlPWZ1bmN0aW9uKGEpe2lmKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpe3ZhciBjLGQsZT10aGlzLnRleHR1cmUsZj1lLmZyYW1lLGc9Zi53aWR0aCE9PWUuYmFzZVRleHR1cmUud2lkdGh8fGYuaGVpZ2h0IT09ZS5iYXNlVGV4dHVyZS5oZWlnaHQsaD0hMTtpZihhPyhjPWIuZ2V0TmV4dFBvd2VyT2ZUd28oZi53aWR0aCksZD1iLmdldE5leHRQb3dlck9mVHdvKGYuaGVpZ2h0KSwoZi53aWR0aCE9PWN8fGYuaGVpZ2h0IT09ZCkmJihoPSEwKSk6ZyYmKGM9Zi53aWR0aCxkPWYuaGVpZ2h0LGg9ITApLGgpe3ZhciBpO3RoaXMudGlsaW5nVGV4dHVyZSYmdGhpcy50aWxpbmdUZXh0dXJlLmlzVGlsaW5nPyhpPXRoaXMudGlsaW5nVGV4dHVyZS5jYW52YXNCdWZmZXIsaS5yZXNpemUoYyxkKSx0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUud2lkdGg9Yyx0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUuaGVpZ2h0PWQsdGhpcy50aWxpbmdUZXh0dXJlLm5lZWRzVXBkYXRlPSEwKTooaT1uZXcgYi5DYW52YXNCdWZmZXIoYyxkKSx0aGlzLnRpbGluZ1RleHR1cmU9Yi5UZXh0dXJlLmZyb21DYW52YXMoaS5jYW52YXMpLHRoaXMudGlsaW5nVGV4dHVyZS5jYW52YXNCdWZmZXI9aSx0aGlzLnRpbGluZ1RleHR1cmUuaXNUaWxpbmc9ITApLGkuY29udGV4dC5kcmF3SW1hZ2UoZS5iYXNlVGV4dHVyZS5zb3VyY2UsZS5jcm9wLngsZS5jcm9wLnksZS5jcm9wLndpZHRoLGUuY3JvcC5oZWlnaHQsMCwwLGMsZCksdGhpcy50aWxlU2NhbGVPZmZzZXQueD1mLndpZHRoL2MsdGhpcy50aWxlU2NhbGVPZmZzZXQueT1mLmhlaWdodC9kfWVsc2UgdGhpcy50aWxpbmdUZXh0dXJlJiZ0aGlzLnRpbGluZ1RleHR1cmUuaXNUaWxpbmcmJnRoaXMudGlsaW5nVGV4dHVyZS5kZXN0cm95KCEwKSx0aGlzLnRpbGVTY2FsZU9mZnNldC54PTEsdGhpcy50aWxlU2NhbGVPZmZzZXQueT0xLHRoaXMudGlsaW5nVGV4dHVyZT1lO3RoaXMucmVmcmVzaFRleHR1cmU9ITEsdGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMH19O3ZhciBmPXt9O2YuQm9uZURhdGE9ZnVuY3Rpb24oYSxiKXt0aGlzLm5hbWU9YSx0aGlzLnBhcmVudD1ifSxmLkJvbmVEYXRhLnByb3RvdHlwZT17bGVuZ3RoOjAseDowLHk6MCxyb3RhdGlvbjowLHNjYWxlWDoxLHNjYWxlWToxfSxmLlNsb3REYXRhPWZ1bmN0aW9uKGEsYil7dGhpcy5uYW1lPWEsdGhpcy5ib25lRGF0YT1ifSxmLlNsb3REYXRhLnByb3RvdHlwZT17cjoxLGc6MSxiOjEsYToxLGF0dGFjaG1lbnROYW1lOm51bGx9LGYuQm9uZT1mdW5jdGlvbihhLGIpe3RoaXMuZGF0YT1hLHRoaXMucGFyZW50PWIsdGhpcy5zZXRUb1NldHVwUG9zZSgpfSxmLkJvbmUueURvd249ITEsZi5Cb25lLnByb3RvdHlwZT17eDowLHk6MCxyb3RhdGlvbjowLHNjYWxlWDoxLHNjYWxlWToxLG0wMDowLG0wMTowLHdvcmxkWDowLG0xMDowLG0xMTowLHdvcmxkWTowLHdvcmxkUm90YXRpb246MCx3b3JsZFNjYWxlWDoxLHdvcmxkU2NhbGVZOjEsdXBkYXRlV29ybGRUcmFuc2Zvcm06ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLnBhcmVudDtudWxsIT1jPyh0aGlzLndvcmxkWD10aGlzLngqYy5tMDArdGhpcy55KmMubTAxK2Mud29ybGRYLHRoaXMud29ybGRZPXRoaXMueCpjLm0xMCt0aGlzLnkqYy5tMTErYy53b3JsZFksdGhpcy53b3JsZFNjYWxlWD1jLndvcmxkU2NhbGVYKnRoaXMuc2NhbGVYLHRoaXMud29ybGRTY2FsZVk9Yy53b3JsZFNjYWxlWSp0aGlzLnNjYWxlWSx0aGlzLndvcmxkUm90YXRpb249Yy53b3JsZFJvdGF0aW9uK3RoaXMucm90YXRpb24pOih0aGlzLndvcmxkWD10aGlzLngsdGhpcy53b3JsZFk9dGhpcy55LHRoaXMud29ybGRTY2FsZVg9dGhpcy5zY2FsZVgsdGhpcy53b3JsZFNjYWxlWT10aGlzLnNjYWxlWSx0aGlzLndvcmxkUm90YXRpb249dGhpcy5yb3RhdGlvbik7dmFyIGQ9dGhpcy53b3JsZFJvdGF0aW9uKk1hdGguUEkvMTgwLGU9TWF0aC5jb3MoZCksZz1NYXRoLnNpbihkKTt0aGlzLm0wMD1lKnRoaXMud29ybGRTY2FsZVgsdGhpcy5tMTA9Zyp0aGlzLndvcmxkU2NhbGVYLHRoaXMubTAxPS1nKnRoaXMud29ybGRTY2FsZVksdGhpcy5tMTE9ZSp0aGlzLndvcmxkU2NhbGVZLGEmJih0aGlzLm0wMD0tdGhpcy5tMDAsdGhpcy5tMDE9LXRoaXMubTAxKSxiJiYodGhpcy5tMTA9LXRoaXMubTEwLHRoaXMubTExPS10aGlzLm0xMSksZi5Cb25lLnlEb3duJiYodGhpcy5tMTA9LXRoaXMubTEwLHRoaXMubTExPS10aGlzLm0xMSl9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5kYXRhO3RoaXMueD1hLngsdGhpcy55PWEueSx0aGlzLnJvdGF0aW9uPWEucm90YXRpb24sdGhpcy5zY2FsZVg9YS5zY2FsZVgsdGhpcy5zY2FsZVk9YS5zY2FsZVl9fSxmLlNsb3Q9ZnVuY3Rpb24oYSxiLGMpe3RoaXMuZGF0YT1hLHRoaXMuc2tlbGV0b249Yix0aGlzLmJvbmU9Yyx0aGlzLnNldFRvU2V0dXBQb3NlKCl9LGYuU2xvdC5wcm90b3R5cGU9e3I6MSxnOjEsYjoxLGE6MSxfYXR0YWNobWVudFRpbWU6MCxhdHRhY2htZW50Om51bGwsc2V0QXR0YWNobWVudDpmdW5jdGlvbihhKXt0aGlzLmF0dGFjaG1lbnQ9YSx0aGlzLl9hdHRhY2htZW50VGltZT10aGlzLnNrZWxldG9uLnRpbWV9LHNldEF0dGFjaG1lbnRUaW1lOmZ1bmN0aW9uKGEpe3RoaXMuX2F0dGFjaG1lbnRUaW1lPXRoaXMuc2tlbGV0b24udGltZS1hfSxnZXRBdHRhY2htZW50VGltZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNrZWxldG9uLnRpbWUtdGhpcy5fYXR0YWNobWVudFRpbWV9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5kYXRhO3RoaXMucj1hLnIsdGhpcy5nPWEuZyx0aGlzLmI9YS5iLHRoaXMuYT1hLmE7Zm9yKHZhciBiPXRoaXMuc2tlbGV0b24uZGF0YS5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY109PWEpe3RoaXMuc2V0QXR0YWNobWVudChhLmF0dGFjaG1lbnROYW1lP3RoaXMuc2tlbGV0b24uZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KGMsYS5hdHRhY2htZW50TmFtZSk6bnVsbCk7YnJlYWt9fX0sZi5Ta2luPWZ1bmN0aW9uKGEpe3RoaXMubmFtZT1hLHRoaXMuYXR0YWNobWVudHM9e319LGYuU2tpbi5wcm90b3R5cGU9e2FkZEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiLGMpe3RoaXMuYXR0YWNobWVudHNbYStcIjpcIitiXT1jfSxnZXRBdHRhY2htZW50OmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuYXR0YWNobWVudHNbYStcIjpcIitiXX0sX2F0dGFjaEFsbDpmdW5jdGlvbihhLGIpe2Zvcih2YXIgYyBpbiBiLmF0dGFjaG1lbnRzKXt2YXIgZD1jLmluZGV4T2YoXCI6XCIpLGU9cGFyc2VJbnQoYy5zdWJzdHJpbmcoMCxkKSwxMCksZj1jLnN1YnN0cmluZyhkKzEpLGc9YS5zbG90c1tlXTtpZihnLmF0dGFjaG1lbnQmJmcuYXR0YWNobWVudC5uYW1lPT1mKXt2YXIgaD10aGlzLmdldEF0dGFjaG1lbnQoZSxmKTtoJiZnLnNldEF0dGFjaG1lbnQoaCl9fX19LGYuQW5pbWF0aW9uPWZ1bmN0aW9uKGEsYixjKXt0aGlzLm5hbWU9YSx0aGlzLnRpbWVsaW5lcz1iLHRoaXMuZHVyYXRpb249Y30sZi5BbmltYXRpb24ucHJvdG90eXBlPXthcHBseTpmdW5jdGlvbihhLGIsYyl7YyYmdGhpcy5kdXJhdGlvbiYmKGIlPXRoaXMuZHVyYXRpb24pO2Zvcih2YXIgZD10aGlzLnRpbWVsaW5lcyxlPTAsZj1kLmxlbmd0aDtmPmU7ZSsrKWRbZV0uYXBwbHkoYSxiLDEpfSxtaXg6ZnVuY3Rpb24oYSxiLGMsZCl7YyYmdGhpcy5kdXJhdGlvbiYmKGIlPXRoaXMuZHVyYXRpb24pO2Zvcih2YXIgZT10aGlzLnRpbWVsaW5lcyxmPTAsZz1lLmxlbmd0aDtnPmY7ZisrKWVbZl0uYXBwbHkoYSxiLGQpfX0sZi5iaW5hcnlTZWFyY2g9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPTAsZT1NYXRoLmZsb29yKGEubGVuZ3RoL2MpLTI7aWYoIWUpcmV0dXJuIGM7Zm9yKHZhciBmPWU+Pj4xOzspe2lmKGFbKGYrMSkqY108PWI/ZD1mKzE6ZT1mLGQ9PWUpcmV0dXJuKGQrMSkqYztmPWQrZT4+PjF9fSxmLmxpbmVhclNlYXJjaD1mdW5jdGlvbihhLGIsYyl7Zm9yKHZhciBkPTAsZT1hLmxlbmd0aC1jO2U+PWQ7ZCs9YylpZihhW2RdPmIpcmV0dXJuIGQ7cmV0dXJuLTF9LGYuQ3VydmVzPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPVtdLHRoaXMuY3VydmVzLmxlbmd0aD02KihhLTEpfSxmLkN1cnZlcy5wcm90b3R5cGU9e3NldExpbmVhcjpmdW5jdGlvbihhKXt0aGlzLmN1cnZlc1s2KmFdPTB9LHNldFN0ZXBwZWQ6ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXNbNiphXT0tMX0sc2V0Q3VydmU6ZnVuY3Rpb24oYSxiLGMsZCxlKXt2YXIgZj0uMSxnPWYqZixoPWcqZixpPTMqZixqPTMqZyxrPTYqZyxsPTYqaCxtPTIqLWIrZCxuPTIqLWMrZSxvPTMqKGItZCkrMSxwPTMqKGMtZSkrMSxxPTYqYSxyPXRoaXMuY3VydmVzO3JbcV09YippK20qaitvKmgscltxKzFdPWMqaStuKmorcCpoLHJbcSsyXT1tKmsrbypsLHJbcSszXT1uKmsrcCpsLHJbcSs0XT1vKmwscltxKzVdPXAqbH0sZ2V0Q3VydmVQZXJjZW50OmZ1bmN0aW9uKGEsYil7Yj0wPmI/MDpiPjE/MTpiO3ZhciBjPTYqYSxkPXRoaXMuY3VydmVzLGU9ZFtjXTtpZighZSlyZXR1cm4gYjtpZigtMT09ZSlyZXR1cm4gMDtmb3IodmFyIGY9ZFtjKzFdLGc9ZFtjKzJdLGg9ZFtjKzNdLGk9ZFtjKzRdLGo9ZFtjKzVdLGs9ZSxsPWYsbT04Ozspe2lmKGs+PWIpe3ZhciBuPWstZSxvPWwtZjtyZXR1cm4gbysobC1vKSooYi1uKS8oay1uKX1pZighbSlicmVhazttLS0sZSs9ZyxmKz1oLGcrPWksaCs9aixrKz1lLGwrPWZ9cmV0dXJuIGwrKDEtbCkqKGItaykvKDEtayl9fSxmLlJvdGF0ZVRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9MiphfSxmLlJvdGF0ZVRpbWVsaW5lLnByb3RvdHlwZT17Ym9uZUluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGgvMn0sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMpe2EqPTIsdGhpcy5mcmFtZXNbYV09Yix0aGlzLmZyYW1lc1thKzFdPWN9LGFwcGx5OmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlPXRoaXMuZnJhbWVzO2lmKCEoYjxlWzBdKSl7dmFyIGc9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZVtlLmxlbmd0aC0yXSl7Zm9yKGQ9Zy5kYXRhLnJvdGF0aW9uK2VbZS5sZW5ndGgtMV0tZy5yb3RhdGlvbjtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7cmV0dXJuIGcucm90YXRpb24rPWQqYyx2b2lkIDB9dmFyIGg9Zi5iaW5hcnlTZWFyY2goZSxiLDIpLGk9ZVtoLTFdLGo9ZVtoXSxrPTEtKGItaikvKGVbaC0yXS1qKTtmb3Ioaz10aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoaC8yLTEsayksZD1lW2grMV0taTtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7Zm9yKGQ9Zy5kYXRhLnJvdGF0aW9uKyhpK2QqayktZy5yb3RhdGlvbjtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7Zy5yb3RhdGlvbis9ZCpjfX19LGYuVHJhbnNsYXRlVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD0zKmF9LGYuVHJhbnNsYXRlVGltZWxpbmUucHJvdG90eXBlPXtib25lSW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC8zfSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyxkKXthKj0zLHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZH0sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZnJhbWVzO2lmKCEoYjxkWzBdKSl7dmFyIGU9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZFtkLmxlbmd0aC0zXSlyZXR1cm4gZS54Kz0oZS5kYXRhLngrZFtkLmxlbmd0aC0yXS1lLngpKmMsZS55Kz0oZS5kYXRhLnkrZFtkLmxlbmd0aC0xXS1lLnkpKmMsdm9pZCAwO3ZhciBnPWYuYmluYXJ5U2VhcmNoKGQsYiwzKSxoPWRbZy0yXSxpPWRbZy0xXSxqPWRbZ10saz0xLShiLWopLyhkW2crLTNdLWopO2s9dGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGcvMy0xLGspLGUueCs9KGUuZGF0YS54K2grKGRbZysxXS1oKSprLWUueCkqYyxlLnkrPShlLmRhdGEueStpKyhkW2crMl0taSkqay1lLnkpKmN9fX0sZi5TY2FsZVRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9MyphfSxmLlNjYWxlVGltZWxpbmUucHJvdG90eXBlPXtib25lSW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC8zfSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyxkKXthKj0zLHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZH0sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZnJhbWVzO2lmKCEoYjxkWzBdKSl7dmFyIGU9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZFtkLmxlbmd0aC0zXSlyZXR1cm4gZS5zY2FsZVgrPShlLmRhdGEuc2NhbGVYLTErZFtkLmxlbmd0aC0yXS1lLnNjYWxlWCkqYyxlLnNjYWxlWSs9KGUuZGF0YS5zY2FsZVktMStkW2QubGVuZ3RoLTFdLWUuc2NhbGVZKSpjLHZvaWQgMDt2YXIgZz1mLmJpbmFyeVNlYXJjaChkLGIsMyksaD1kW2ctMl0saT1kW2ctMV0saj1kW2ddLGs9MS0oYi1qKS8oZFtnKy0zXS1qKTtrPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChnLzMtMSxrKSxlLnNjYWxlWCs9KGUuZGF0YS5zY2FsZVgtMStoKyhkW2crMV0taCkqay1lLnNjYWxlWCkqYyxlLnNjYWxlWSs9KGUuZGF0YS5zY2FsZVktMStpKyhkW2crMl0taSkqay1lLnNjYWxlWSkqY319fSxmLkNvbG9yVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD01KmF9LGYuQ29sb3JUaW1lbGluZS5wcm90b3R5cGU9e3Nsb3RJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoLzV9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjLGQsZSxmKXthKj01LHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZCx0aGlzLmZyYW1lc1thKzNdPWUsdGhpcy5mcmFtZXNbYSs0XT1mfSxhcHBseTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5mcmFtZXM7aWYoIShiPGRbMF0pKXt2YXIgZT1hLnNsb3RzW3RoaXMuc2xvdEluZGV4XTtpZihiPj1kW2QubGVuZ3RoLTVdKXt2YXIgZz1kLmxlbmd0aC0xO3JldHVybiBlLnI9ZFtnLTNdLGUuZz1kW2ctMl0sZS5iPWRbZy0xXSxlLmE9ZFtnXSx2b2lkIDB9dmFyIGg9Zi5iaW5hcnlTZWFyY2goZCxiLDUpLGk9ZFtoLTRdLGo9ZFtoLTNdLGs9ZFtoLTJdLGw9ZFtoLTFdLG09ZFtoXSxuPTEtKGItbSkvKGRbaC01XS1tKTtuPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChoLzUtMSxuKTt2YXIgbz1pKyhkW2grMV0taSkqbixwPWorKGRbaCsyXS1qKSpuLHE9aysoZFtoKzNdLWspKm4scj1sKyhkW2grNF0tbCkqbjsxPmM/KGUucis9KG8tZS5yKSpjLGUuZys9KHAtZS5nKSpjLGUuYis9KHEtZS5iKSpjLGUuYSs9KHItZS5hKSpjKTooZS5yPW8sZS5nPXAsZS5iPXEsZS5hPXIpfX19LGYuQXR0YWNobWVudFRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9YSx0aGlzLmF0dGFjaG1lbnROYW1lcz1bXSx0aGlzLmF0dGFjaG1lbnROYW1lcy5sZW5ndGg9YX0sZi5BdHRhY2htZW50VGltZWxpbmUucHJvdG90eXBlPXtzbG90SW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aH0sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMpe3RoaXMuZnJhbWVzW2FdPWIsdGhpcy5hdHRhY2htZW50TmFtZXNbYV09Y30sYXBwbHk6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmZyYW1lcztpZighKGI8Y1swXSkpe3ZhciBkO2Q9Yj49Y1tjLmxlbmd0aC0xXT9jLmxlbmd0aC0xOmYuYmluYXJ5U2VhcmNoKGMsYiwxKS0xO3ZhciBlPXRoaXMuYXR0YWNobWVudE5hbWVzW2RdO2Euc2xvdHNbdGhpcy5zbG90SW5kZXhdLnNldEF0dGFjaG1lbnQoZT9hLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLnNsb3RJbmRleCxlKTpudWxsKX19fSxmLlNrZWxldG9uRGF0YT1mdW5jdGlvbigpe3RoaXMuYm9uZXM9W10sdGhpcy5zbG90cz1bXSx0aGlzLnNraW5zPVtdLHRoaXMuYW5pbWF0aW9ucz1bXX0sZi5Ta2VsZXRvbkRhdGEucHJvdG90eXBlPXtkZWZhdWx0U2tpbjpudWxsLGZpbmRCb25lOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kQm9uZUluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBjO3JldHVybi0xfSxmaW5kU2xvdDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gc2xvdFtjXTtyZXR1cm4gbnVsbH0sZmluZFNsb3RJbmRleDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sZmluZFNraW46ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2tpbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRBbmltYXRpb246ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYW5pbWF0aW9ucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH19LGYuU2tlbGV0b249ZnVuY3Rpb24oYSl7dGhpcy5kYXRhPWEsdGhpcy5ib25lcz1bXTtcclxuZm9yKHZhciBiPTAsYz1hLmJvbmVzLmxlbmd0aDtjPmI7YisrKXt2YXIgZD1hLmJvbmVzW2JdLGU9ZC5wYXJlbnQ/dGhpcy5ib25lc1thLmJvbmVzLmluZGV4T2YoZC5wYXJlbnQpXTpudWxsO3RoaXMuYm9uZXMucHVzaChuZXcgZi5Cb25lKGQsZSkpfWZvcih0aGlzLnNsb3RzPVtdLHRoaXMuZHJhd09yZGVyPVtdLGI9MCxjPWEuc2xvdHMubGVuZ3RoO2M+YjtiKyspe3ZhciBnPWEuc2xvdHNbYl0saD10aGlzLmJvbmVzW2EuYm9uZXMuaW5kZXhPZihnLmJvbmVEYXRhKV0saT1uZXcgZi5TbG90KGcsdGhpcyxoKTt0aGlzLnNsb3RzLnB1c2goaSksdGhpcy5kcmF3T3JkZXIucHVzaChpKX19LGYuU2tlbGV0b24ucHJvdG90eXBlPXt4OjAseTowLHNraW46bnVsbCxyOjEsZzoxLGI6MSxhOjEsdGltZTowLGZsaXBYOiExLGZsaXBZOiExLHVwZGF0ZVdvcmxkVHJhbnNmb3JtOmZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMuZmxpcFgsYj10aGlzLmZsaXBZLGM9dGhpcy5ib25lcyxkPTAsZT1jLmxlbmd0aDtlPmQ7ZCsrKWNbZF0udXBkYXRlV29ybGRUcmFuc2Zvcm0oYSxiKX0sc2V0VG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXt0aGlzLnNldEJvbmVzVG9TZXR1cFBvc2UoKSx0aGlzLnNldFNsb3RzVG9TZXR1cFBvc2UoKX0sc2V0Qm9uZXNUb1NldHVwUG9zZTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmJvbmVzLGI9MCxjPWEubGVuZ3RoO2M+YjtiKyspYVtiXS5zZXRUb1NldHVwUG9zZSgpfSxzZXRTbG90c1RvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMuc2xvdHMsYj0wLGM9YS5sZW5ndGg7Yz5iO2IrKylhW2JdLnNldFRvU2V0dXBQb3NlKGIpfSxnZXRSb290Qm9uZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJvbmVzLmxlbmd0aD90aGlzLmJvbmVzWzBdOm51bGx9LGZpbmRCb25lOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRCb25lSW5kZXg6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYm9uZXMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLmRhdGEubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sZmluZFNsb3Q6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLmRhdGEubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZmluZFNsb3RJbmRleDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10uZGF0YS5uYW1lPT1hKXJldHVybiBjO3JldHVybi0xfSxzZXRTa2luQnlOYW1lOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuZGF0YS5maW5kU2tpbihhKTtpZighYil0aHJvd1wiU2tpbiBub3QgZm91bmQ6IFwiK2E7dGhpcy5zZXRTa2luKGIpfSxzZXRTa2luOmZ1bmN0aW9uKGEpe3RoaXMuc2tpbiYmYSYmYS5fYXR0YWNoQWxsKHRoaXMsdGhpcy5za2luKSx0aGlzLnNraW49YX0sZ2V0QXR0YWNobWVudEJ5U2xvdE5hbWU6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgodGhpcy5kYXRhLmZpbmRTbG90SW5kZXgoYSksYil9LGdldEF0dGFjaG1lbnRCeVNsb3RJbmRleDpmdW5jdGlvbihhLGIpe2lmKHRoaXMuc2tpbil7dmFyIGM9dGhpcy5za2luLmdldEF0dGFjaG1lbnQoYSxiKTtpZihjKXJldHVybiBjfXJldHVybiB0aGlzLmRhdGEuZGVmYXVsdFNraW4/dGhpcy5kYXRhLmRlZmF1bHRTa2luLmdldEF0dGFjaG1lbnQoYSxiKTpudWxsfSxzZXRBdHRhY2htZW50OmZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPXRoaXMuc2xvdHMsZD0wLGU9Yy5zaXplO2U+ZDtkKyspe3ZhciBmPWNbZF07aWYoZi5kYXRhLm5hbWU9PWEpe3ZhciBnPW51bGw7aWYoYiYmKGc9dGhpcy5nZXRBdHRhY2htZW50KGQsYiksbnVsbD09ZykpdGhyb3dcIkF0dGFjaG1lbnQgbm90IGZvdW5kOiBcIitiK1wiLCBmb3Igc2xvdDogXCIrYTtyZXR1cm4gZi5zZXRBdHRhY2htZW50KGcpLHZvaWQgMH19dGhyb3dcIlNsb3Qgbm90IGZvdW5kOiBcIithfSx1cGRhdGU6ZnVuY3Rpb24oYSl7dGltZSs9YX19LGYuQXR0YWNobWVudFR5cGU9e3JlZ2lvbjowfSxmLlJlZ2lvbkF0dGFjaG1lbnQ9ZnVuY3Rpb24oKXt0aGlzLm9mZnNldD1bXSx0aGlzLm9mZnNldC5sZW5ndGg9OCx0aGlzLnV2cz1bXSx0aGlzLnV2cy5sZW5ndGg9OH0sZi5SZWdpb25BdHRhY2htZW50LnByb3RvdHlwZT17eDowLHk6MCxyb3RhdGlvbjowLHNjYWxlWDoxLHNjYWxlWToxLHdpZHRoOjAsaGVpZ2h0OjAscmVuZGVyZXJPYmplY3Q6bnVsbCxyZWdpb25PZmZzZXRYOjAscmVnaW9uT2Zmc2V0WTowLHJlZ2lvbldpZHRoOjAscmVnaW9uSGVpZ2h0OjAscmVnaW9uT3JpZ2luYWxXaWR0aDowLHJlZ2lvbk9yaWdpbmFsSGVpZ2h0OjAsc2V0VVZzOmZ1bmN0aW9uKGEsYixjLGQsZSl7dmFyIGY9dGhpcy51dnM7ZT8oZlsyXT1hLGZbM109ZCxmWzRdPWEsZls1XT1iLGZbNl09YyxmWzddPWIsZlswXT1jLGZbMV09ZCk6KGZbMF09YSxmWzFdPWQsZlsyXT1hLGZbM109YixmWzRdPWMsZls1XT1iLGZbNl09YyxmWzddPWQpfSx1cGRhdGVPZmZzZXQ6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLndpZHRoL3RoaXMucmVnaW9uT3JpZ2luYWxXaWR0aCp0aGlzLnNjYWxlWCxiPXRoaXMuaGVpZ2h0L3RoaXMucmVnaW9uT3JpZ2luYWxIZWlnaHQqdGhpcy5zY2FsZVksYz0tdGhpcy53aWR0aC8yKnRoaXMuc2NhbGVYK3RoaXMucmVnaW9uT2Zmc2V0WCphLGQ9LXRoaXMuaGVpZ2h0LzIqdGhpcy5zY2FsZVkrdGhpcy5yZWdpb25PZmZzZXRZKmIsZT1jK3RoaXMucmVnaW9uV2lkdGgqYSxmPWQrdGhpcy5yZWdpb25IZWlnaHQqYixnPXRoaXMucm90YXRpb24qTWF0aC5QSS8xODAsaD1NYXRoLmNvcyhnKSxpPU1hdGguc2luKGcpLGo9YypoK3RoaXMueCxrPWMqaSxsPWQqaCt0aGlzLnksbT1kKmksbj1lKmgrdGhpcy54LG89ZSppLHA9ZipoK3RoaXMueSxxPWYqaSxyPXRoaXMub2Zmc2V0O3JbMF09ai1tLHJbMV09bCtrLHJbMl09ai1xLHJbM109cCtrLHJbNF09bi1xLHJbNV09cCtvLHJbNl09bi1tLHJbN109bCtvfSxjb21wdXRlVmVydGljZXM6ZnVuY3Rpb24oYSxiLGMsZCl7YSs9Yy53b3JsZFgsYis9Yy53b3JsZFk7dmFyIGU9Yy5tMDAsZj1jLm0wMSxnPWMubTEwLGg9Yy5tMTEsaT10aGlzLm9mZnNldDtkWzBdPWlbMF0qZStpWzFdKmYrYSxkWzFdPWlbMF0qZytpWzFdKmgrYixkWzJdPWlbMl0qZStpWzNdKmYrYSxkWzNdPWlbMl0qZytpWzNdKmgrYixkWzRdPWlbNF0qZStpWzVdKmYrYSxkWzVdPWlbNF0qZytpWzVdKmgrYixkWzZdPWlbNl0qZStpWzddKmYrYSxkWzddPWlbNl0qZytpWzddKmgrYn19LGYuQW5pbWF0aW9uU3RhdGVEYXRhPWZ1bmN0aW9uKGEpe3RoaXMuc2tlbGV0b25EYXRhPWEsdGhpcy5hbmltYXRpb25Ub01peFRpbWU9e319LGYuQW5pbWF0aW9uU3RhdGVEYXRhLnByb3RvdHlwZT17ZGVmYXVsdE1peDowLHNldE1peEJ5TmFtZTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhKTtpZighZCl0aHJvd1wiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIrYTt2YXIgZT10aGlzLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGIpO2lmKCFlKXRocm93XCJBbmltYXRpb24gbm90IGZvdW5kOiBcIitiO3RoaXMuc2V0TWl4KGQsZSxjKX0sc2V0TWl4OmZ1bmN0aW9uKGEsYixjKXt0aGlzLmFuaW1hdGlvblRvTWl4VGltZVthLm5hbWUrXCI6XCIrYi5uYW1lXT1jfSxnZXRNaXg6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmFuaW1hdGlvblRvTWl4VGltZVthLm5hbWUrXCI6XCIrYi5uYW1lXTtyZXR1cm4gYz9jOnRoaXMuZGVmYXVsdE1peH19LGYuQW5pbWF0aW9uU3RhdGU9ZnVuY3Rpb24oYSl7dGhpcy5kYXRhPWEsdGhpcy5xdWV1ZT1bXX0sZi5BbmltYXRpb25TdGF0ZS5wcm90b3R5cGU9e2FuaW1hdGlvblNwZWVkOjEsY3VycmVudDpudWxsLHByZXZpb3VzOm51bGwsY3VycmVudFRpbWU6MCxwcmV2aW91c1RpbWU6MCxjdXJyZW50TG9vcDohMSxwcmV2aW91c0xvb3A6ITEsbWl4VGltZTowLG1peER1cmF0aW9uOjAsdXBkYXRlOmZ1bmN0aW9uKGEpe2lmKHRoaXMuY3VycmVudFRpbWUrPWEqdGhpcy5hbmltYXRpb25TcGVlZCx0aGlzLnByZXZpb3VzVGltZSs9YSx0aGlzLm1peFRpbWUrPWEsdGhpcy5xdWV1ZS5sZW5ndGg+MCl7dmFyIGI9dGhpcy5xdWV1ZVswXTt0aGlzLmN1cnJlbnRUaW1lPj1iLmRlbGF5JiYodGhpcy5fc2V0QW5pbWF0aW9uKGIuYW5pbWF0aW9uLGIubG9vcCksdGhpcy5xdWV1ZS5zaGlmdCgpKX19LGFwcGx5OmZ1bmN0aW9uKGEpe2lmKHRoaXMuY3VycmVudClpZih0aGlzLnByZXZpb3VzKXt0aGlzLnByZXZpb3VzLmFwcGx5KGEsdGhpcy5wcmV2aW91c1RpbWUsdGhpcy5wcmV2aW91c0xvb3ApO3ZhciBiPXRoaXMubWl4VGltZS90aGlzLm1peER1cmF0aW9uO2I+PTEmJihiPTEsdGhpcy5wcmV2aW91cz1udWxsKSx0aGlzLmN1cnJlbnQubWl4KGEsdGhpcy5jdXJyZW50VGltZSx0aGlzLmN1cnJlbnRMb29wLGIpfWVsc2UgdGhpcy5jdXJyZW50LmFwcGx5KGEsdGhpcy5jdXJyZW50VGltZSx0aGlzLmN1cnJlbnRMb29wKX0sY2xlYXJBbmltYXRpb246ZnVuY3Rpb24oKXt0aGlzLnByZXZpb3VzPW51bGwsdGhpcy5jdXJyZW50PW51bGwsdGhpcy5xdWV1ZS5sZW5ndGg9MH0sX3NldEFuaW1hdGlvbjpmdW5jdGlvbihhLGIpe3RoaXMucHJldmlvdXM9bnVsbCxhJiZ0aGlzLmN1cnJlbnQmJih0aGlzLm1peER1cmF0aW9uPXRoaXMuZGF0YS5nZXRNaXgodGhpcy5jdXJyZW50LGEpLHRoaXMubWl4RHVyYXRpb24+MCYmKHRoaXMubWl4VGltZT0wLHRoaXMucHJldmlvdXM9dGhpcy5jdXJyZW50LHRoaXMucHJldmlvdXNUaW1lPXRoaXMuY3VycmVudFRpbWUsdGhpcy5wcmV2aW91c0xvb3A9dGhpcy5jdXJyZW50TG9vcCkpLHRoaXMuY3VycmVudD1hLHRoaXMuY3VycmVudExvb3A9Yix0aGlzLmN1cnJlbnRUaW1lPTB9LHNldEFuaW1hdGlvbkJ5TmFtZTpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuZGF0YS5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhKTtpZighYyl0aHJvd1wiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIrYTt0aGlzLnNldEFuaW1hdGlvbihjLGIpfSxzZXRBbmltYXRpb246ZnVuY3Rpb24oYSxiKXt0aGlzLnF1ZXVlLmxlbmd0aD0wLHRoaXMuX3NldEFuaW1hdGlvbihhLGIpfSxhZGRBbmltYXRpb25CeU5hbWU6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZGF0YS5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhKTtpZighZCl0aHJvd1wiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIrYTt0aGlzLmFkZEFuaW1hdGlvbihkLGIsYyl9LGFkZEFuaW1hdGlvbjpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9e307aWYoZC5hbmltYXRpb249YSxkLmxvb3A9YiwhY3x8MD49Yyl7dmFyIGU9dGhpcy5xdWV1ZS5sZW5ndGg/dGhpcy5xdWV1ZVt0aGlzLnF1ZXVlLmxlbmd0aC0xXS5hbmltYXRpb246dGhpcy5jdXJyZW50O2M9bnVsbCE9ZT9lLmR1cmF0aW9uLXRoaXMuZGF0YS5nZXRNaXgoZSxhKSsoY3x8MCk6MH1kLmRlbGF5PWMsdGhpcy5xdWV1ZS5wdXNoKGQpfSxpc0NvbXBsZXRlOmZ1bmN0aW9uKCl7cmV0dXJuIXRoaXMuY3VycmVudHx8dGhpcy5jdXJyZW50VGltZT49dGhpcy5jdXJyZW50LmR1cmF0aW9ufX0sZi5Ta2VsZXRvbkpzb249ZnVuY3Rpb24oYSl7dGhpcy5hdHRhY2htZW50TG9hZGVyPWF9LGYuU2tlbGV0b25Kc29uLnByb3RvdHlwZT17c2NhbGU6MSxyZWFkU2tlbGV0b25EYXRhOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYixjPW5ldyBmLlNrZWxldG9uRGF0YSxkPWEuYm9uZXMsZT0wLGc9ZC5sZW5ndGg7Zz5lO2UrKyl7dmFyIGg9ZFtlXSxpPW51bGw7aWYoaC5wYXJlbnQmJihpPWMuZmluZEJvbmUoaC5wYXJlbnQpLCFpKSl0aHJvd1wiUGFyZW50IGJvbmUgbm90IGZvdW5kOiBcIitoLnBhcmVudDtiPW5ldyBmLkJvbmVEYXRhKGgubmFtZSxpKSxiLmxlbmd0aD0oaC5sZW5ndGh8fDApKnRoaXMuc2NhbGUsYi54PShoLnh8fDApKnRoaXMuc2NhbGUsYi55PShoLnl8fDApKnRoaXMuc2NhbGUsYi5yb3RhdGlvbj1oLnJvdGF0aW9ufHwwLGIuc2NhbGVYPWguc2NhbGVYfHwxLGIuc2NhbGVZPWguc2NhbGVZfHwxLGMuYm9uZXMucHVzaChiKX12YXIgaj1hLnNsb3RzO2ZvcihlPTAsZz1qLmxlbmd0aDtnPmU7ZSsrKXt2YXIgaz1qW2VdO2lmKGI9Yy5maW5kQm9uZShrLmJvbmUpLCFiKXRocm93XCJTbG90IGJvbmUgbm90IGZvdW5kOiBcIitrLmJvbmU7dmFyIGw9bmV3IGYuU2xvdERhdGEoay5uYW1lLGIpLG09ay5jb2xvcjttJiYobC5yPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IobSwwKSxsLmc9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcihtLDEpLGwuYj1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMiksbC5hPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IobSwzKSksbC5hdHRhY2htZW50TmFtZT1rLmF0dGFjaG1lbnQsYy5zbG90cy5wdXNoKGwpfXZhciBuPWEuc2tpbnM7Zm9yKHZhciBvIGluIG4paWYobi5oYXNPd25Qcm9wZXJ0eShvKSl7dmFyIHA9bltvXSxxPW5ldyBmLlNraW4obyk7Zm9yKHZhciByIGluIHApaWYocC5oYXNPd25Qcm9wZXJ0eShyKSl7dmFyIHM9Yy5maW5kU2xvdEluZGV4KHIpLHQ9cFtyXTtmb3IodmFyIHUgaW4gdClpZih0Lmhhc093blByb3BlcnR5KHUpKXt2YXIgdj10aGlzLnJlYWRBdHRhY2htZW50KHEsdSx0W3VdKTtudWxsIT12JiZxLmFkZEF0dGFjaG1lbnQocyx1LHYpfX1jLnNraW5zLnB1c2gocSksXCJkZWZhdWx0XCI9PXEubmFtZSYmKGMuZGVmYXVsdFNraW49cSl9dmFyIHc9YS5hbmltYXRpb25zO2Zvcih2YXIgeCBpbiB3KXcuaGFzT3duUHJvcGVydHkoeCkmJnRoaXMucmVhZEFuaW1hdGlvbih4LHdbeF0sYyk7cmV0dXJuIGN9LHJlYWRBdHRhY2htZW50OmZ1bmN0aW9uKGEsYixjKXtiPWMubmFtZXx8Yjt2YXIgZD1mLkF0dGFjaG1lbnRUeXBlW2MudHlwZXx8XCJyZWdpb25cIl07aWYoZD09Zi5BdHRhY2htZW50VHlwZS5yZWdpb24pe3ZhciBlPW5ldyBmLlJlZ2lvbkF0dGFjaG1lbnQ7cmV0dXJuIGUueD0oYy54fHwwKSp0aGlzLnNjYWxlLGUueT0oYy55fHwwKSp0aGlzLnNjYWxlLGUuc2NhbGVYPWMuc2NhbGVYfHwxLGUuc2NhbGVZPWMuc2NhbGVZfHwxLGUucm90YXRpb249Yy5yb3RhdGlvbnx8MCxlLndpZHRoPShjLndpZHRofHwzMikqdGhpcy5zY2FsZSxlLmhlaWdodD0oYy5oZWlnaHR8fDMyKSp0aGlzLnNjYWxlLGUudXBkYXRlT2Zmc2V0KCksZS5yZW5kZXJlck9iamVjdD17fSxlLnJlbmRlcmVyT2JqZWN0Lm5hbWU9YixlLnJlbmRlcmVyT2JqZWN0LnNjYWxlPXt9LGUucmVuZGVyZXJPYmplY3Quc2NhbGUueD1lLnNjYWxlWCxlLnJlbmRlcmVyT2JqZWN0LnNjYWxlLnk9ZS5zY2FsZVksZS5yZW5kZXJlck9iamVjdC5yb3RhdGlvbj0tZS5yb3RhdGlvbipNYXRoLlBJLzE4MCxlfXRocm93XCJVbmtub3duIGF0dGFjaG1lbnQgdHlwZTogXCIrZH0scmVhZEFuaW1hdGlvbjpmdW5jdGlvbihhLGIsYyl7dmFyIGQsZSxnLGgsaSxqLGssbD1bXSxtPTAsbj1iLmJvbmVzO2Zvcih2YXIgbyBpbiBuKWlmKG4uaGFzT3duUHJvcGVydHkobykpe3ZhciBwPWMuZmluZEJvbmVJbmRleChvKTtpZigtMT09cCl0aHJvd1wiQm9uZSBub3QgZm91bmQ6IFwiK287dmFyIHE9bltvXTtmb3IoZyBpbiBxKWlmKHEuaGFzT3duUHJvcGVydHkoZykpaWYoaT1xW2ddLFwicm90YXRlXCI9PWcpe2ZvcihlPW5ldyBmLlJvdGF0ZVRpbWVsaW5lKGkubGVuZ3RoKSxlLmJvbmVJbmRleD1wLGQ9MCxqPTAsaz1pLmxlbmd0aDtrPmo7aisrKWg9aVtqXSxlLnNldEZyYW1lKGQsaC50aW1lLGguYW5nbGUpLGYuU2tlbGV0b25Kc29uLnJlYWRDdXJ2ZShlLGQsaCksZCsrO2wucHVzaChlKSxtPU1hdGgubWF4KG0sZS5mcmFtZXNbMiplLmdldEZyYW1lQ291bnQoKS0yXSl9ZWxzZXtpZihcInRyYW5zbGF0ZVwiIT1nJiZcInNjYWxlXCIhPWcpdGhyb3dcIkludmFsaWQgdGltZWxpbmUgdHlwZSBmb3IgYSBib25lOiBcIitnK1wiIChcIitvK1wiKVwiO3ZhciByPTE7Zm9yKFwic2NhbGVcIj09Zz9lPW5ldyBmLlNjYWxlVGltZWxpbmUoaS5sZW5ndGgpOihlPW5ldyBmLlRyYW5zbGF0ZVRpbWVsaW5lKGkubGVuZ3RoKSxyPXRoaXMuc2NhbGUpLGUuYm9uZUluZGV4PXAsZD0wLGo9MCxrPWkubGVuZ3RoO2s+ajtqKyspe2g9aVtqXTt2YXIgcz0oaC54fHwwKSpyLHQ9KGgueXx8MCkqcjtlLnNldEZyYW1lKGQsaC50aW1lLHMsdCksZi5Ta2VsZXRvbkpzb24ucmVhZEN1cnZlKGUsZCxoKSxkKyt9bC5wdXNoKGUpLG09TWF0aC5tYXgobSxlLmZyYW1lc1szKmUuZ2V0RnJhbWVDb3VudCgpLTNdKX19dmFyIHU9Yi5zbG90cztmb3IodmFyIHYgaW4gdSlpZih1Lmhhc093blByb3BlcnR5KHYpKXt2YXIgdz11W3ZdLHg9Yy5maW5kU2xvdEluZGV4KHYpO2ZvcihnIGluIHcpaWYody5oYXNPd25Qcm9wZXJ0eShnKSlpZihpPXdbZ10sXCJjb2xvclwiPT1nKXtmb3IoZT1uZXcgZi5Db2xvclRpbWVsaW5lKGkubGVuZ3RoKSxlLnNsb3RJbmRleD14LGQ9MCxqPTAsaz1pLmxlbmd0aDtrPmo7aisrKXtoPWlbal07dmFyIHk9aC5jb2xvcix6PWYuU2tlbGV0b25Kc29uLnRvQ29sb3IoeSwwKSxBPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IoeSwxKSxCPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IoeSwyKSxDPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IoeSwzKTtlLnNldEZyYW1lKGQsaC50aW1lLHosQSxCLEMpLGYuU2tlbGV0b25Kc29uLnJlYWRDdXJ2ZShlLGQsaCksZCsrfWwucHVzaChlKSxtPU1hdGgubWF4KG0sZS5mcmFtZXNbNSplLmdldEZyYW1lQ291bnQoKS01XSl9ZWxzZXtpZihcImF0dGFjaG1lbnRcIiE9Zyl0aHJvd1wiSW52YWxpZCB0aW1lbGluZSB0eXBlIGZvciBhIHNsb3Q6IFwiK2crXCIgKFwiK3YrXCIpXCI7Zm9yKGU9bmV3IGYuQXR0YWNobWVudFRpbWVsaW5lKGkubGVuZ3RoKSxlLnNsb3RJbmRleD14LGQ9MCxqPTAsaz1pLmxlbmd0aDtrPmo7aisrKWg9aVtqXSxlLnNldEZyYW1lKGQrKyxoLnRpbWUsaC5uYW1lKTtsLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzW2UuZ2V0RnJhbWVDb3VudCgpLTFdKX19Yy5hbmltYXRpb25zLnB1c2gobmV3IGYuQW5pbWF0aW9uKGEsbCxtKSl9fSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmU9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWMuY3VydmU7ZCYmKFwic3RlcHBlZFwiPT1kP2EuY3VydmVzLnNldFN0ZXBwZWQoYik6ZCBpbnN0YW5jZW9mIEFycmF5JiZhLmN1cnZlcy5zZXRDdXJ2ZShiLGRbMF0sZFsxXSxkWzJdLGRbM10pKX0sZi5Ta2VsZXRvbkpzb24udG9Db2xvcj1mdW5jdGlvbihhLGIpe2lmKDghPWEubGVuZ3RoKXRocm93XCJDb2xvciBoZXhpZGVjaW1hbCBsZW5ndGggbXVzdCBiZSA4LCByZWNpZXZlZDogXCIrYTtyZXR1cm4gcGFyc2VJbnQoYS5zdWJzdHIoMipiLDIpLDE2KS8yNTV9LGYuQXRsYXM9ZnVuY3Rpb24oYSxiKXt0aGlzLnRleHR1cmVMb2FkZXI9Yix0aGlzLnBhZ2VzPVtdLHRoaXMucmVnaW9ucz1bXTt2YXIgYz1uZXcgZi5BdGxhc1JlYWRlcihhKSxkPVtdO2QubGVuZ3RoPTQ7Zm9yKHZhciBlPW51bGw7Oyl7dmFyIGc9Yy5yZWFkTGluZSgpO2lmKG51bGw9PWcpYnJlYWs7aWYoZz1jLnRyaW0oZyksZy5sZW5ndGgpaWYoZSl7dmFyIGg9bmV3IGYuQXRsYXNSZWdpb247aC5uYW1lPWcsaC5wYWdlPWUsaC5yb3RhdGU9XCJ0cnVlXCI9PWMucmVhZFZhbHVlKCksYy5yZWFkVHVwbGUoZCk7dmFyIGk9cGFyc2VJbnQoZFswXSwxMCksaj1wYXJzZUludChkWzFdLDEwKTtjLnJlYWRUdXBsZShkKTt2YXIgaz1wYXJzZUludChkWzBdLDEwKSxsPXBhcnNlSW50KGRbMV0sMTApO2gudT1pL2Uud2lkdGgsaC52PWovZS5oZWlnaHQsaC5yb3RhdGU/KGgudTI9KGkrbCkvZS53aWR0aCxoLnYyPShqK2spL2UuaGVpZ2h0KTooaC51Mj0oaStrKS9lLndpZHRoLGgudjI9KGorbCkvZS5oZWlnaHQpLGgueD1pLGgueT1qLGgud2lkdGg9TWF0aC5hYnMoayksaC5oZWlnaHQ9TWF0aC5hYnMobCksND09Yy5yZWFkVHVwbGUoZCkmJihoLnNwbGl0cz1bcGFyc2VJbnQoZFswXSwxMCkscGFyc2VJbnQoZFsxXSwxMCkscGFyc2VJbnQoZFsyXSwxMCkscGFyc2VJbnQoZFszXSwxMCldLDQ9PWMucmVhZFR1cGxlKGQpJiYoaC5wYWRzPVtwYXJzZUludChkWzBdLDEwKSxwYXJzZUludChkWzFdLDEwKSxwYXJzZUludChkWzJdLDEwKSxwYXJzZUludChkWzNdLDEwKV0sYy5yZWFkVHVwbGUoZCkpKSxoLm9yaWdpbmFsV2lkdGg9cGFyc2VJbnQoZFswXSwxMCksaC5vcmlnaW5hbEhlaWdodD1wYXJzZUludChkWzFdLDEwKSxjLnJlYWRUdXBsZShkKSxoLm9mZnNldFg9cGFyc2VJbnQoZFswXSwxMCksaC5vZmZzZXRZPXBhcnNlSW50KGRbMV0sMTApLGguaW5kZXg9cGFyc2VJbnQoYy5yZWFkVmFsdWUoKSwxMCksdGhpcy5yZWdpb25zLnB1c2goaCl9ZWxzZXtlPW5ldyBmLkF0bGFzUGFnZSxlLm5hbWU9ZyxlLmZvcm1hdD1mLkF0bGFzLkZvcm1hdFtjLnJlYWRWYWx1ZSgpXSxjLnJlYWRUdXBsZShkKSxlLm1pbkZpbHRlcj1mLkF0bGFzLlRleHR1cmVGaWx0ZXJbZFswXV0sZS5tYWdGaWx0ZXI9Zi5BdGxhcy5UZXh0dXJlRmlsdGVyW2RbMV1dO3ZhciBtPWMucmVhZFZhbHVlKCk7ZS51V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLmNsYW1wVG9FZGdlLGUudldyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5jbGFtcFRvRWRnZSxcInhcIj09bT9lLnVXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0OlwieVwiPT1tP2UudldyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ6XCJ4eVwiPT1tJiYoZS51V3JhcD1lLnZXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0KSxiLmxvYWQoZSxnKSx0aGlzLnBhZ2VzLnB1c2goZSl9ZWxzZSBlPW51bGx9fSxmLkF0bGFzLnByb3RvdHlwZT17ZmluZFJlZ2lvbjpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5yZWdpb25zLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxkaXNwb3NlOmZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMucGFnZXMsYj0wLGM9YS5sZW5ndGg7Yz5iO2IrKyl0aGlzLnRleHR1cmVMb2FkZXIudW5sb2FkKGFbYl0ucmVuZGVyZXJPYmplY3QpfSx1cGRhdGVVVnM6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMucmVnaW9ucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKXt2YXIgZT1iW2NdO2UucGFnZT09YSYmKGUudT1lLngvYS53aWR0aCxlLnY9ZS55L2EuaGVpZ2h0LGUucm90YXRlPyhlLnUyPShlLngrZS5oZWlnaHQpL2Eud2lkdGgsZS52Mj0oZS55K2Uud2lkdGgpL2EuaGVpZ2h0KTooZS51Mj0oZS54K2Uud2lkdGgpL2Eud2lkdGgsZS52Mj0oZS55K2UuaGVpZ2h0KS9hLmhlaWdodCkpfX19LGYuQXRsYXMuRm9ybWF0PXthbHBoYTowLGludGVuc2l0eToxLGx1bWluYW5jZUFscGhhOjIscmdiNTY1OjMscmdiYTQ0NDQ6NCxyZ2I4ODg6NSxyZ2JhODg4ODo2fSxmLkF0bGFzLlRleHR1cmVGaWx0ZXI9e25lYXJlc3Q6MCxsaW5lYXI6MSxtaXBNYXA6MixtaXBNYXBOZWFyZXN0TmVhcmVzdDozLG1pcE1hcExpbmVhck5lYXJlc3Q6NCxtaXBNYXBOZWFyZXN0TGluZWFyOjUsbWlwTWFwTGluZWFyTGluZWFyOjZ9LGYuQXRsYXMuVGV4dHVyZVdyYXA9e21pcnJvcmVkUmVwZWF0OjAsY2xhbXBUb0VkZ2U6MSxyZXBlYXQ6Mn0sZi5BdGxhc1BhZ2U9ZnVuY3Rpb24oKXt9LGYuQXRsYXNQYWdlLnByb3RvdHlwZT17bmFtZTpudWxsLGZvcm1hdDpudWxsLG1pbkZpbHRlcjpudWxsLG1hZ0ZpbHRlcjpudWxsLHVXcmFwOm51bGwsdldyYXA6bnVsbCxyZW5kZXJlck9iamVjdDpudWxsLHdpZHRoOjAsaGVpZ2h0OjB9LGYuQXRsYXNSZWdpb249ZnVuY3Rpb24oKXt9LGYuQXRsYXNSZWdpb24ucHJvdG90eXBlPXtwYWdlOm51bGwsbmFtZTpudWxsLHg6MCx5OjAsd2lkdGg6MCxoZWlnaHQ6MCx1OjAsdjowLHUyOjAsdjI6MCxvZmZzZXRYOjAsb2Zmc2V0WTowLG9yaWdpbmFsV2lkdGg6MCxvcmlnaW5hbEhlaWdodDowLGluZGV4OjAscm90YXRlOiExLHNwbGl0czpudWxsLHBhZHM6bnVsbH0sZi5BdGxhc1JlYWRlcj1mdW5jdGlvbihhKXt0aGlzLmxpbmVzPWEuc3BsaXQoL1xcclxcbnxcXHJ8XFxuLyl9LGYuQXRsYXNSZWFkZXIucHJvdG90eXBlPXtpbmRleDowLHRyaW06ZnVuY3Rpb24oYSl7cmV0dXJuIGEucmVwbGFjZSgvXlxccyt8XFxzKyQvZyxcIlwiKX0scmVhZExpbmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pbmRleD49dGhpcy5saW5lcy5sZW5ndGg/bnVsbDp0aGlzLmxpbmVzW3RoaXMuaW5kZXgrK119LHJlYWRWYWx1ZTpmdW5jdGlvbigpe3ZhciBhPXRoaXMucmVhZExpbmUoKSxiPWEuaW5kZXhPZihcIjpcIik7aWYoLTE9PWIpdGhyb3dcIkludmFsaWQgbGluZTogXCIrYTtyZXR1cm4gdGhpcy50cmltKGEuc3Vic3RyaW5nKGIrMSkpfSxyZWFkVHVwbGU6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5yZWFkTGluZSgpLGM9Yi5pbmRleE9mKFwiOlwiKTtpZigtMT09Yyl0aHJvd1wiSW52YWxpZCBsaW5lOiBcIitiO2Zvcih2YXIgZD0wLGU9YysxOzM+ZDtkKyspe3ZhciBmPWIuaW5kZXhPZihcIixcIixlKTtpZigtMT09Zil7aWYoIWQpdGhyb3dcIkludmFsaWQgbGluZTogXCIrYjticmVha31hW2RdPXRoaXMudHJpbShiLnN1YnN0cihlLGYtZSkpLGU9ZisxfXJldHVybiBhW2RdPXRoaXMudHJpbShiLnN1YnN0cmluZyhlKSksZCsxfX0sZi5BdGxhc0F0dGFjaG1lbnRMb2FkZXI9ZnVuY3Rpb24oYSl7dGhpcy5hdGxhcz1hfSxmLkF0bGFzQXR0YWNobWVudExvYWRlci5wcm90b3R5cGU9e25ld0F0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiLGMpe3N3aXRjaChiKXtjYXNlIGYuQXR0YWNobWVudFR5cGUucmVnaW9uOnZhciBkPXRoaXMuYXRsYXMuZmluZFJlZ2lvbihjKTtpZighZCl0aHJvd1wiUmVnaW9uIG5vdCBmb3VuZCBpbiBhdGxhczogXCIrYytcIiAoXCIrYitcIilcIjt2YXIgZT1uZXcgZi5SZWdpb25BdHRhY2htZW50KGMpO3JldHVybiBlLnJlbmRlcmVyT2JqZWN0PWQsZS5zZXRVVnMoZC51LGQudixkLnUyLGQudjIsZC5yb3RhdGUpLGUucmVnaW9uT2Zmc2V0WD1kLm9mZnNldFgsZS5yZWdpb25PZmZzZXRZPWQub2Zmc2V0WSxlLnJlZ2lvbldpZHRoPWQud2lkdGgsZS5yZWdpb25IZWlnaHQ9ZC5oZWlnaHQsZS5yZWdpb25PcmlnaW5hbFdpZHRoPWQub3JpZ2luYWxXaWR0aCxlLnJlZ2lvbk9yaWdpbmFsSGVpZ2h0PWQub3JpZ2luYWxIZWlnaHQsZX10aHJvd1wiVW5rbm93biBhdHRhY2htZW50IHR5cGU6IFwiK2J9fSxmLkJvbmUueURvd249ITAsYi5BbmltQ2FjaGU9e30sYi5TcGluZT1mdW5jdGlvbihhKXtpZihiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLnNwaW5lRGF0YT1iLkFuaW1DYWNoZVthXSwhdGhpcy5zcGluZURhdGEpdGhyb3cgbmV3IEVycm9yKFwiU3BpbmUgZGF0YSBtdXN0IGJlIHByZWxvYWRlZCB1c2luZyBQSVhJLlNwaW5lTG9hZGVyIG9yIFBJWEkuQXNzZXRMb2FkZXI6IFwiK2EpO3RoaXMuc2tlbGV0b249bmV3IGYuU2tlbGV0b24odGhpcy5zcGluZURhdGEpLHRoaXMuc2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oKSx0aGlzLnN0YXRlRGF0YT1uZXcgZi5BbmltYXRpb25TdGF0ZURhdGEodGhpcy5zcGluZURhdGEpLHRoaXMuc3RhdGU9bmV3IGYuQW5pbWF0aW9uU3RhdGUodGhpcy5zdGF0ZURhdGEpLHRoaXMuc2xvdENvbnRhaW5lcnM9W107Zm9yKHZhciBjPTAsZD10aGlzLnNrZWxldG9uLmRyYXdPcmRlci5sZW5ndGg7ZD5jO2MrKyl7dmFyIGU9dGhpcy5za2VsZXRvbi5kcmF3T3JkZXJbY10sZz1lLmF0dGFjaG1lbnQsaD1uZXcgYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyO2lmKHRoaXMuc2xvdENvbnRhaW5lcnMucHVzaChoKSx0aGlzLmFkZENoaWxkKGgpLGcgaW5zdGFuY2VvZiBmLlJlZ2lvbkF0dGFjaG1lbnQpe3ZhciBpPWcucmVuZGVyZXJPYmplY3QubmFtZSxqPXRoaXMuY3JlYXRlU3ByaXRlKGUsZy5yZW5kZXJlck9iamVjdCk7ZS5jdXJyZW50U3ByaXRlPWosZS5jdXJyZW50U3ByaXRlTmFtZT1pLGguYWRkQ2hpbGQoail9fX0sYi5TcGluZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlNwaW5lLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNwaW5lLGIuU3BpbmUucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3RoaXMubGFzdFRpbWU9dGhpcy5sYXN0VGltZXx8RGF0ZS5ub3coKTt2YXIgYT0uMDAxKihEYXRlLm5vdygpLXRoaXMubGFzdFRpbWUpO3RoaXMubGFzdFRpbWU9RGF0ZS5ub3coKSx0aGlzLnN0YXRlLnVwZGF0ZShhKSx0aGlzLnN0YXRlLmFwcGx5KHRoaXMuc2tlbGV0b24pLHRoaXMuc2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oKTtmb3IodmFyIGM9dGhpcy5za2VsZXRvbi5kcmF3T3JkZXIsZD0wLGU9Yy5sZW5ndGg7ZT5kO2QrKyl7dmFyIGc9Y1tkXSxoPWcuYXR0YWNobWVudCxpPXRoaXMuc2xvdENvbnRhaW5lcnNbZF07aWYoaCBpbnN0YW5jZW9mIGYuUmVnaW9uQXR0YWNobWVudCl7aWYoaC5yZW5kZXJlck9iamVjdCYmKCFnLmN1cnJlbnRTcHJpdGVOYW1lfHxnLmN1cnJlbnRTcHJpdGVOYW1lIT1oLm5hbWUpKXt2YXIgaj1oLnJlbmRlcmVyT2JqZWN0Lm5hbWU7aWYodm9pZCAwIT09Zy5jdXJyZW50U3ByaXRlJiYoZy5jdXJyZW50U3ByaXRlLnZpc2libGU9ITEpLGcuc3ByaXRlcz1nLnNwcml0ZXN8fHt9LHZvaWQgMCE9PWcuc3ByaXRlc1tqXSlnLnNwcml0ZXNbal0udmlzaWJsZT0hMDtlbHNle3ZhciBrPXRoaXMuY3JlYXRlU3ByaXRlKGcsaC5yZW5kZXJlck9iamVjdCk7aS5hZGRDaGlsZChrKX1nLmN1cnJlbnRTcHJpdGU9Zy5zcHJpdGVzW2pdLGcuY3VycmVudFNwcml0ZU5hbWU9an1pLnZpc2libGU9ITA7dmFyIGw9Zy5ib25lO2kucG9zaXRpb24ueD1sLndvcmxkWCtoLngqbC5tMDAraC55KmwubTAxLGkucG9zaXRpb24ueT1sLndvcmxkWStoLngqbC5tMTAraC55KmwubTExLGkuc2NhbGUueD1sLndvcmxkU2NhbGVYLGkuc2NhbGUueT1sLndvcmxkU2NhbGVZLGkucm90YXRpb249LShnLmJvbmUud29ybGRSb3RhdGlvbipNYXRoLlBJLzE4MCksaS5hbHBoYT1nLmEsZy5jdXJyZW50U3ByaXRlLnRpbnQ9Yi5yZ2IyaGV4KFtnLnIsZy5nLGcuYl0pfWVsc2UgaS52aXNpYmxlPSExfWIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuU3BpbmUucHJvdG90eXBlLmNyZWF0ZVNwcml0ZT1mdW5jdGlvbihhLGMpe3ZhciBkPWIuVGV4dHVyZUNhY2hlW2MubmFtZV0/Yy5uYW1lOmMubmFtZStcIi5wbmdcIixlPW5ldyBiLlNwcml0ZShiLlRleHR1cmUuZnJvbUZyYW1lKGQpKTtyZXR1cm4gZS5zY2FsZT1jLnNjYWxlLGUucm90YXRpb249Yy5yb3RhdGlvbixlLmFuY2hvci54PWUuYW5jaG9yLnk9LjUsYS5zcHJpdGVzPWEuc3ByaXRlc3x8e30sYS5zcHJpdGVzW2MubmFtZV09ZSxlfSxiLkJhc2VUZXh0dXJlQ2FjaGU9e30sYi50ZXh0dXJlc1RvVXBkYXRlPVtdLGIudGV4dHVyZXNUb0Rlc3Ryb3k9W10sYi5CYXNlVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3I9MCxiLkJhc2VUZXh0dXJlPWZ1bmN0aW9uKGEsYyl7aWYoYi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMud2lkdGg9MTAwLHRoaXMuaGVpZ2h0PTEwMCx0aGlzLnNjYWxlTW9kZT1jfHxiLnNjYWxlTW9kZXMuREVGQVVMVCx0aGlzLmhhc0xvYWRlZD0hMSx0aGlzLnNvdXJjZT1hLHRoaXMuaWQ9Yi5CYXNlVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3IrKyx0aGlzLnByZW11bHRpcGxpZWRBbHBoYT0hMCx0aGlzLl9nbFRleHR1cmVzPVtdLHRoaXMuX2RpcnR5PVtdLGEpe2lmKCh0aGlzLnNvdXJjZS5jb21wbGV0ZXx8dGhpcy5zb3VyY2UuZ2V0Q29udGV4dCkmJnRoaXMuc291cmNlLndpZHRoJiZ0aGlzLnNvdXJjZS5oZWlnaHQpdGhpcy5oYXNMb2FkZWQ9ITAsdGhpcy53aWR0aD10aGlzLnNvdXJjZS53aWR0aCx0aGlzLmhlaWdodD10aGlzLnNvdXJjZS5oZWlnaHQsYi50ZXh0dXJlc1RvVXBkYXRlLnB1c2godGhpcyk7ZWxzZXt2YXIgZD10aGlzO3RoaXMuc291cmNlLm9ubG9hZD1mdW5jdGlvbigpe2QuaGFzTG9hZGVkPSEwLGQud2lkdGg9ZC5zb3VyY2Uud2lkdGgsZC5oZWlnaHQ9ZC5zb3VyY2UuaGVpZ2h0O2Zvcih2YXIgYT0wO2E8ZC5fZ2xUZXh0dXJlcy5sZW5ndGg7YSsrKWQuX2RpcnR5W2FdPSEwO2QuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6ZH0pfSx0aGlzLnNvdXJjZS5vbmVycm9yPWZ1bmN0aW9uKCl7ZC5kaXNwYXRjaEV2ZW50KHt0eXBlOlwiZXJyb3JcIixjb250ZW50OmR9KX19dGhpcy5pbWFnZVVybD1udWxsLHRoaXMuX3Bvd2VyT2YyPSExfX0sYi5CYXNlVGV4dHVyZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CYXNlVGV4dHVyZSxiLkJhc2VUZXh0dXJlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5pbWFnZVVybD8oZGVsZXRlIGIuQmFzZVRleHR1cmVDYWNoZVt0aGlzLmltYWdlVXJsXSxkZWxldGUgYi5UZXh0dXJlQ2FjaGVbdGhpcy5pbWFnZVVybF0sdGhpcy5pbWFnZVVybD1udWxsLHRoaXMuc291cmNlLnNyYz1udWxsKTp0aGlzLnNvdXJjZSYmdGhpcy5zb3VyY2UuX3BpeGlJZCYmZGVsZXRlIGIuQmFzZVRleHR1cmVDYWNoZVt0aGlzLnNvdXJjZS5fcGl4aUlkXSx0aGlzLnNvdXJjZT1udWxsLGIudGV4dHVyZXNUb0Rlc3Ryb3kucHVzaCh0aGlzKX0sYi5CYXNlVGV4dHVyZS5wcm90b3R5cGUudXBkYXRlU291cmNlSW1hZ2U9ZnVuY3Rpb24oYSl7dGhpcy5oYXNMb2FkZWQ9ITEsdGhpcy5zb3VyY2Uuc3JjPW51bGwsdGhpcy5zb3VyY2Uuc3JjPWF9LGIuQmFzZVRleHR1cmUuZnJvbUltYWdlPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1iLkJhc2VUZXh0dXJlQ2FjaGVbYV07aWYodm9pZCAwPT09YyYmLTE9PT1hLmluZGV4T2YoXCJkYXRhOlwiKSYmKGM9ITApLCFlKXt2YXIgZj1uZXcgSW1hZ2U7YyYmKGYuY3Jvc3NPcmlnaW49XCJcIiksZi5zcmM9YSxlPW5ldyBiLkJhc2VUZXh0dXJlKGYsZCksZS5pbWFnZVVybD1hLGIuQmFzZVRleHR1cmVDYWNoZVthXT1lfXJldHVybiBlfSxiLkJhc2VUZXh0dXJlLmZyb21DYW52YXM9ZnVuY3Rpb24oYSxjKXthLl9waXhpSWR8fChhLl9waXhpSWQ9XCJjYW52YXNfXCIrYi5UZXh0dXJlQ2FjaGVJZEdlbmVyYXRvcisrKTt2YXIgZD1iLkJhc2VUZXh0dXJlQ2FjaGVbYS5fcGl4aUlkXTtyZXR1cm4gZHx8KGQ9bmV3IGIuQmFzZVRleHR1cmUoYSxjKSxiLkJhc2VUZXh0dXJlQ2FjaGVbYS5fcGl4aUlkXT1kKSxkfSxiLlRleHR1cmVDYWNoZT17fSxiLkZyYW1lQ2FjaGU9e30sYi5UZXh0dXJlQ2FjaGVJZEdlbmVyYXRvcj0wLGIuVGV4dHVyZT1mdW5jdGlvbihhLGMpe2lmKGIuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLm5vRnJhbWU9ITEsY3x8KHRoaXMubm9GcmFtZT0hMCxjPW5ldyBiLlJlY3RhbmdsZSgwLDAsMSwxKSksYSBpbnN0YW5jZW9mIGIuVGV4dHVyZSYmKGE9YS5iYXNlVGV4dHVyZSksdGhpcy5iYXNlVGV4dHVyZT1hLHRoaXMuZnJhbWU9Yyx0aGlzLnRyaW09bnVsbCx0aGlzLnZhbGlkPSExLHRoaXMuc2NvcGU9dGhpcyx0aGlzLl91dnM9bnVsbCx0aGlzLndpZHRoPTAsdGhpcy5oZWlnaHQ9MCx0aGlzLmNyb3A9bmV3IGIuUmVjdGFuZ2xlKDAsMCwxLDEpLGEuaGFzTG9hZGVkKXRoaXMubm9GcmFtZSYmKGM9bmV3IGIuUmVjdGFuZ2xlKDAsMCxhLndpZHRoLGEuaGVpZ2h0KSksdGhpcy5zZXRGcmFtZShjKTtlbHNle3ZhciBkPXRoaXM7YS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXtkLm9uQmFzZVRleHR1cmVMb2FkZWQoKX0pfX0sYi5UZXh0dXJlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlRleHR1cmUsYi5UZXh0dXJlLnByb3RvdHlwZS5vbkJhc2VUZXh0dXJlTG9hZGVkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5iYXNlVGV4dHVyZTthLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIix0aGlzLm9uTG9hZGVkKSx0aGlzLm5vRnJhbWUmJih0aGlzLmZyYW1lPW5ldyBiLlJlY3RhbmdsZSgwLDAsYS53aWR0aCxhLmhlaWdodCkpLHRoaXMuc2V0RnJhbWUodGhpcy5mcmFtZSksdGhpcy5zY29wZS5kaXNwYXRjaEV2ZW50KHt0eXBlOlwidXBkYXRlXCIsY29udGVudDp0aGlzfSl9LGIuVGV4dHVyZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbihhKXthJiZ0aGlzLmJhc2VUZXh0dXJlLmRlc3Ryb3koKSx0aGlzLnZhbGlkPSExfSxiLlRleHR1cmUucHJvdG90eXBlLnNldEZyYW1lPWZ1bmN0aW9uKGEpe2lmKHRoaXMubm9GcmFtZT0hMSx0aGlzLmZyYW1lPWEsdGhpcy53aWR0aD1hLndpZHRoLHRoaXMuaGVpZ2h0PWEuaGVpZ2h0LHRoaXMuY3JvcC54PWEueCx0aGlzLmNyb3AueT1hLnksdGhpcy5jcm9wLndpZHRoPWEud2lkdGgsdGhpcy5jcm9wLmhlaWdodD1hLmhlaWdodCwhdGhpcy50cmltJiYoYS54K2Eud2lkdGg+dGhpcy5iYXNlVGV4dHVyZS53aWR0aHx8YS55K2EuaGVpZ2h0PnRoaXMuYmFzZVRleHR1cmUuaGVpZ2h0KSl0aHJvdyBuZXcgRXJyb3IoXCJUZXh0dXJlIEVycm9yOiBmcmFtZSBkb2VzIG5vdCBmaXQgaW5zaWRlIHRoZSBiYXNlIFRleHR1cmUgZGltZW5zaW9ucyBcIit0aGlzKTt0aGlzLnZhbGlkPWEmJmEud2lkdGgmJmEuaGVpZ2h0JiZ0aGlzLmJhc2VUZXh0dXJlLnNvdXJjZSYmdGhpcy5iYXNlVGV4dHVyZS5oYXNMb2FkZWQsdGhpcy50cmltJiYodGhpcy53aWR0aD10aGlzLnRyaW0ud2lkdGgsdGhpcy5oZWlnaHQ9dGhpcy50cmltLmhlaWdodCx0aGlzLmZyYW1lLndpZHRoPXRoaXMudHJpbS53aWR0aCx0aGlzLmZyYW1lLmhlaWdodD10aGlzLnRyaW0uaGVpZ2h0KSx0aGlzLnZhbGlkJiZiLlRleHR1cmUuZnJhbWVVcGRhdGVzLnB1c2godGhpcyl9LGIuVGV4dHVyZS5wcm90b3R5cGUuX3VwZGF0ZVdlYkdMdXZzPWZ1bmN0aW9uKCl7dGhpcy5fdXZzfHwodGhpcy5fdXZzPW5ldyBiLlRleHR1cmVVdnMpO3ZhciBhPXRoaXMuY3JvcCxjPXRoaXMuYmFzZVRleHR1cmUud2lkdGgsZD10aGlzLmJhc2VUZXh0dXJlLmhlaWdodDt0aGlzLl91dnMueDA9YS54L2MsdGhpcy5fdXZzLnkwPWEueS9kLHRoaXMuX3V2cy54MT0oYS54K2Eud2lkdGgpL2MsdGhpcy5fdXZzLnkxPWEueS9kLHRoaXMuX3V2cy54Mj0oYS54K2Eud2lkdGgpL2MsdGhpcy5fdXZzLnkyPShhLnkrYS5oZWlnaHQpL2QsdGhpcy5fdXZzLngzPWEueC9jLHRoaXMuX3V2cy55Mz0oYS55K2EuaGVpZ2h0KS9kfSxiLlRleHR1cmUuZnJvbUltYWdlPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1iLlRleHR1cmVDYWNoZVthXTtyZXR1cm4gZXx8KGU9bmV3IGIuVGV4dHVyZShiLkJhc2VUZXh0dXJlLmZyb21JbWFnZShhLGMsZCkpLGIuVGV4dHVyZUNhY2hlW2FdPWUpLGV9LGIuVGV4dHVyZS5mcm9tRnJhbWU9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5UZXh0dXJlQ2FjaGVbYV07aWYoIWMpdGhyb3cgbmV3IEVycm9yKCdUaGUgZnJhbWVJZCBcIicrYSsnXCIgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHRleHR1cmUgY2FjaGUgJyk7cmV0dXJuIGN9LGIuVGV4dHVyZS5mcm9tQ2FudmFzPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9Yi5CYXNlVGV4dHVyZS5mcm9tQ2FudmFzKGEsYyk7cmV0dXJuIG5ldyBiLlRleHR1cmUoZCl9LGIuVGV4dHVyZS5hZGRUZXh0dXJlVG9DYWNoZT1mdW5jdGlvbihhLGMpe2IuVGV4dHVyZUNhY2hlW2NdPWF9LGIuVGV4dHVyZS5yZW1vdmVUZXh0dXJlRnJvbUNhY2hlPWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dHVyZUNhY2hlW2FdO3JldHVybiBkZWxldGUgYi5UZXh0dXJlQ2FjaGVbYV0sZGVsZXRlIGIuQmFzZVRleHR1cmVDYWNoZVthXSxjfSxiLlRleHR1cmUuZnJhbWVVcGRhdGVzPVtdLGIuVGV4dHVyZVV2cz1mdW5jdGlvbigpe3RoaXMueDA9MCx0aGlzLnkwPTAsdGhpcy54MT0wLHRoaXMueTE9MCx0aGlzLngyPTAsdGhpcy55Mj0wLHRoaXMueDM9MCx0aGlzLnkzPTB9LGIuUmVuZGVyVGV4dHVyZT1mdW5jdGlvbihhLGMsZCxlKXtpZihiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy53aWR0aD1hfHwxMDAsdGhpcy5oZWlnaHQ9Y3x8MTAwLHRoaXMuZnJhbWU9bmV3IGIuUmVjdGFuZ2xlKDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLmNyb3A9bmV3IGIuUmVjdGFuZ2xlKDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLmJhc2VUZXh0dXJlPW5ldyBiLkJhc2VUZXh0dXJlLHRoaXMuYmFzZVRleHR1cmUud2lkdGg9dGhpcy53aWR0aCx0aGlzLmJhc2VUZXh0dXJlLmhlaWdodD10aGlzLmhlaWdodCx0aGlzLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzPVtdLHRoaXMuYmFzZVRleHR1cmUuc2NhbGVNb2RlPWV8fGIuc2NhbGVNb2Rlcy5ERUZBVUxULHRoaXMuYmFzZVRleHR1cmUuaGFzTG9hZGVkPSEwLHRoaXMucmVuZGVyZXI9ZHx8Yi5kZWZhdWx0UmVuZGVyZXIsdGhpcy5yZW5kZXJlci50eXBlPT09Yi5XRUJHTF9SRU5ERVJFUil7dmFyIGY9dGhpcy5yZW5kZXJlci5nbDt0aGlzLnRleHR1cmVCdWZmZXI9bmV3IGIuRmlsdGVyVGV4dHVyZShmLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQsdGhpcy5iYXNlVGV4dHVyZS5zY2FsZU1vZGUpLHRoaXMuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbZi5pZF09dGhpcy50ZXh0dXJlQnVmZmVyLnRleHR1cmUsdGhpcy5yZW5kZXI9dGhpcy5yZW5kZXJXZWJHTCx0aGlzLnByb2plY3Rpb249bmV3IGIuUG9pbnQodGhpcy53aWR0aC8yLC10aGlzLmhlaWdodC8yKX1lbHNlIHRoaXMucmVuZGVyPXRoaXMucmVuZGVyQ2FudmFzLHRoaXMudGV4dHVyZUJ1ZmZlcj1uZXcgYi5DYW52YXNCdWZmZXIodGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5iYXNlVGV4dHVyZS5zb3VyY2U9dGhpcy50ZXh0dXJlQnVmZmVyLmNhbnZhczt0aGlzLnZhbGlkPSEwLGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMucHVzaCh0aGlzKX0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuVGV4dHVyZS5wcm90b3R5cGUpLGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5SZW5kZXJUZXh0dXJlLGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGUucmVzaXplPWZ1bmN0aW9uKGEsYyxkKXsoYSE9PXRoaXMud2lkdGh8fGMhPT10aGlzLmhlaWdodCkmJih0aGlzLndpZHRoPXRoaXMuZnJhbWUud2lkdGg9dGhpcy5jcm9wLndpZHRoPWEsdGhpcy5oZWlnaHQ9dGhpcy5mcmFtZS5oZWlnaHQ9dGhpcy5jcm9wLmhlaWdodD1jLGQmJih0aGlzLmJhc2VUZXh0dXJlLndpZHRoPXRoaXMud2lkdGgsdGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQ9dGhpcy5oZWlnaHQpLHRoaXMucmVuZGVyZXIudHlwZT09PWIuV0VCR0xfUkVOREVSRVImJih0aGlzLnByb2plY3Rpb24ueD10aGlzLndpZHRoLzIsdGhpcy5wcm9qZWN0aW9uLnk9LXRoaXMuaGVpZ2h0LzIpLHRoaXMudGV4dHVyZUJ1ZmZlci5yZXNpemUodGhpcy53aWR0aCx0aGlzLmhlaWdodCkpfSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5yZW5kZXJlci50eXBlPT09Yi5XRUJHTF9SRU5ERVJFUiYmdGhpcy5yZW5kZXJlci5nbC5iaW5kRnJhbWVidWZmZXIodGhpcy5yZW5kZXJlci5nbC5GUkFNRUJVRkZFUix0aGlzLnRleHR1cmVCdWZmZXIuZnJhbWVCdWZmZXIpLHRoaXMudGV4dHVyZUJ1ZmZlci5jbGVhcigpfSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLnJlbmRlcldlYkdMPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT10aGlzLnJlbmRlcmVyLmdsO2UuY29sb3JNYXNrKCEwLCEwLCEwLCEwKSxlLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSxlLmJpbmRGcmFtZWJ1ZmZlcihlLkZSQU1FQlVGRkVSLHRoaXMudGV4dHVyZUJ1ZmZlci5mcmFtZUJ1ZmZlciksZCYmdGhpcy50ZXh0dXJlQnVmZmVyLmNsZWFyKCk7dmFyIGY9YS5jaGlsZHJlbixnPWEud29ybGRUcmFuc2Zvcm07YS53b3JsZFRyYW5zZm9ybT1iLlJlbmRlclRleHR1cmUudGVtcE1hdHJpeCxhLndvcmxkVHJhbnNmb3JtLmQ9LTEsYS53b3JsZFRyYW5zZm9ybS50eT0tMip0aGlzLnByb2plY3Rpb24ueSxjJiYoYS53b3JsZFRyYW5zZm9ybS50eD1jLngsYS53b3JsZFRyYW5zZm9ybS50eS09Yy55KTtmb3IodmFyIGg9MCxpPWYubGVuZ3RoO2k+aDtoKyspZltoXS51cGRhdGVUcmFuc2Zvcm0oKTtiLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZXMoKSx0aGlzLnJlbmRlcmVyLnNwcml0ZUJhdGNoLmRpcnR5PSEwLHRoaXMucmVuZGVyZXIucmVuZGVyRGlzcGxheU9iamVjdChhLHRoaXMucHJvamVjdGlvbix0aGlzLnRleHR1cmVCdWZmZXIuZnJhbWVCdWZmZXIpLGEud29ybGRUcmFuc2Zvcm09Zyx0aGlzLnJlbmRlcmVyLnNwcml0ZUJhdGNoLmRpcnR5PSEwfSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLnJlbmRlckNhbnZhcz1mdW5jdGlvbihhLGMsZCl7dmFyIGU9YS5jaGlsZHJlbixmPWEud29ybGRUcmFuc2Zvcm07YS53b3JsZFRyYW5zZm9ybT1iLlJlbmRlclRleHR1cmUudGVtcE1hdHJpeCxjPyhhLndvcmxkVHJhbnNmb3JtLnR4PWMueCxhLndvcmxkVHJhbnNmb3JtLnR5PWMueSk6KGEud29ybGRUcmFuc2Zvcm0udHg9MCxhLndvcmxkVHJhbnNmb3JtLnR5PTApO2Zvcih2YXIgZz0wLGg9ZS5sZW5ndGg7aD5nO2crKyllW2ddLnVwZGF0ZVRyYW5zZm9ybSgpO2QmJnRoaXMudGV4dHVyZUJ1ZmZlci5jbGVhcigpO3ZhciBpPXRoaXMudGV4dHVyZUJ1ZmZlci5jb250ZXh0O3RoaXMucmVuZGVyZXIucmVuZGVyRGlzcGxheU9iamVjdChhLGkpLGkuc2V0VHJhbnNmb3JtKDEsMCwwLDEsMCwwKSxhLndvcmxkVHJhbnNmb3JtPWZ9LGIuUmVuZGVyVGV4dHVyZS50ZW1wTWF0cml4PW5ldyBiLk1hdHJpeCxiLkFzc2V0TG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMuYXNzZXRVUkxzPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMubG9hZGVyc0J5VHlwZT17anBnOmIuSW1hZ2VMb2FkZXIsanBlZzpiLkltYWdlTG9hZGVyLHBuZzpiLkltYWdlTG9hZGVyLGdpZjpiLkltYWdlTG9hZGVyLHdlYnA6Yi5JbWFnZUxvYWRlcixqc29uOmIuSnNvbkxvYWRlcixhdGxhczpiLkF0bGFzTG9hZGVyLGFuaW06Yi5TcGluZUxvYWRlcix4bWw6Yi5CaXRtYXBGb250TG9hZGVyLGZudDpiLkJpdG1hcEZvbnRMb2FkZXJ9fSxiLkFzc2V0TG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkFzc2V0TG9hZGVyLGIuQXNzZXRMb2FkZXIucHJvdG90eXBlLl9nZXREYXRhVHlwZT1mdW5jdGlvbihhKXt2YXIgYj1cImRhdGE6XCIsYz1hLnNsaWNlKDAsYi5sZW5ndGgpLnRvTG93ZXJDYXNlKCk7aWYoYz09PWIpe3ZhciBkPWEuc2xpY2UoYi5sZW5ndGgpLGU9ZC5pbmRleE9mKFwiLFwiKTtpZigtMT09PWUpcmV0dXJuIG51bGw7dmFyIGY9ZC5zbGljZSgwLGUpLnNwbGl0KFwiO1wiKVswXTtyZXR1cm4gZiYmXCJ0ZXh0L3BsYWluXCIhPT1mLnRvTG93ZXJDYXNlKCk/Zi5zcGxpdChcIi9cIikucG9wKCkudG9Mb3dlckNhc2UoKTpcInR4dFwifXJldHVybiBudWxsfSxiLkFzc2V0TG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShhKXtiLm9uQXNzZXRMb2FkZWQoYS5jb250ZW50KX12YXIgYj10aGlzO3RoaXMubG9hZENvdW50PXRoaXMuYXNzZXRVUkxzLmxlbmd0aDtmb3IodmFyIGM9MDtjPHRoaXMuYXNzZXRVUkxzLmxlbmd0aDtjKyspe3ZhciBkPXRoaXMuYXNzZXRVUkxzW2NdLGU9dGhpcy5fZ2V0RGF0YVR5cGUoZCk7ZXx8KGU9ZC5zcGxpdChcIj9cIikuc2hpZnQoKS5zcGxpdChcIi5cIikucG9wKCkudG9Mb3dlckNhc2UoKSk7dmFyIGY9dGhpcy5sb2FkZXJzQnlUeXBlW2VdO2lmKCFmKXRocm93IG5ldyBFcnJvcihlK1wiIGlzIGFuIHVuc3VwcG9ydGVkIGZpbGUgdHlwZVwiKTt2YXIgZz1uZXcgZihkLHRoaXMuY3Jvc3NvcmlnaW4pO2cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGEpLGcubG9hZCgpfX0sYi5Bc3NldExvYWRlci5wcm90b3R5cGUub25Bc3NldExvYWRlZD1mdW5jdGlvbihhKXt0aGlzLmxvYWRDb3VudC0tLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcIm9uUHJvZ3Jlc3NcIixjb250ZW50OnRoaXMsbG9hZGVyOmF9KSx0aGlzLm9uUHJvZ3Jlc3MmJnRoaXMub25Qcm9ncmVzcyhhKSx0aGlzLmxvYWRDb3VudHx8KHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcIm9uQ29tcGxldGVcIixjb250ZW50OnRoaXN9KSx0aGlzLm9uQ29tcGxldGUmJnRoaXMub25Db21wbGV0ZSgpKX0sYi5Kc29uTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLmxvYWRlZD0hMX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkpzb25Mb2FkZXIsYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpczt3aW5kb3cuWERvbWFpblJlcXVlc3QmJmEuY3Jvc3NvcmlnaW4/KHRoaXMuYWpheFJlcXVlc3Q9bmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCx0aGlzLmFqYXhSZXF1ZXN0LnRpbWVvdXQ9M2UzLHRoaXMuYWpheFJlcXVlc3Qub25lcnJvcj1mdW5jdGlvbigpe2Eub25FcnJvcigpfSx0aGlzLmFqYXhSZXF1ZXN0Lm9udGltZW91dD1mdW5jdGlvbigpe2Eub25FcnJvcigpfSx0aGlzLmFqYXhSZXF1ZXN0Lm9ucHJvZ3Jlc3M9ZnVuY3Rpb24oKXt9KTp0aGlzLmFqYXhSZXF1ZXN0PXdpbmRvdy5YTUxIdHRwUmVxdWVzdD9uZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0Om5ldyB3aW5kb3cuQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxIVFRQXCIpLHRoaXMuYWpheFJlcXVlc3Qub25sb2FkPWZ1bmN0aW9uKCl7YS5vbkpTT05Mb2FkZWQoKX0sdGhpcy5hamF4UmVxdWVzdC5vcGVuKFwiR0VUXCIsdGhpcy51cmwsITApLHRoaXMuYWpheFJlcXVlc3Quc2VuZCgpfSxiLkpzb25Mb2FkZXIucHJvdG90eXBlLm9uSlNPTkxvYWRlZD1mdW5jdGlvbigpe2lmKCF0aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dClyZXR1cm4gdGhpcy5vbkVycm9yKCksdm9pZCAwO2lmKHRoaXMuanNvbj1KU09OLnBhcnNlKHRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VUZXh0KSx0aGlzLmpzb24uZnJhbWVzKXt2YXIgYT10aGlzLGM9dGhpcy5iYXNlVXJsK3RoaXMuanNvbi5tZXRhLmltYWdlLGQ9bmV3IGIuSW1hZ2VMb2FkZXIoYyx0aGlzLmNyb3Nzb3JpZ2luKSxlPXRoaXMuanNvbi5mcmFtZXM7dGhpcy50ZXh0dXJlPWQudGV4dHVyZS5iYXNlVGV4dHVyZSxkLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe2Eub25Mb2FkZWQoKX0pO2Zvcih2YXIgZyBpbiBlKXt2YXIgaD1lW2ddLmZyYW1lO2lmKGgmJihiLlRleHR1cmVDYWNoZVtnXT1uZXcgYi5UZXh0dXJlKHRoaXMudGV4dHVyZSx7eDpoLngseTpoLnksd2lkdGg6aC53LGhlaWdodDpoLmh9KSxiLlRleHR1cmVDYWNoZVtnXS5jcm9wPW5ldyBiLlJlY3RhbmdsZShoLngsaC55LGgudyxoLmgpLGVbZ10udHJpbW1lZCkpe3ZhciBpPWVbZ10uc291cmNlU2l6ZSxqPWVbZ10uc3ByaXRlU291cmNlU2l6ZTtiLlRleHR1cmVDYWNoZVtnXS50cmltPW5ldyBiLlJlY3RhbmdsZShqLngsai55LGkudyxpLmgpfX1kLmxvYWQoKX1lbHNlIGlmKHRoaXMuanNvbi5ib25lcyl7dmFyIGs9bmV3IGYuU2tlbGV0b25Kc29uLGw9ay5yZWFkU2tlbGV0b25EYXRhKHRoaXMuanNvbik7Yi5BbmltQ2FjaGVbdGhpcy51cmxdPWwsdGhpcy5vbkxvYWRlZCgpfWVsc2UgdGhpcy5vbkxvYWRlZCgpfSxiLkpzb25Mb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5sb2FkZWQ9ITAsdGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuSnNvbkxvYWRlci5wcm90b3R5cGUub25FcnJvcj1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImVycm9yXCIsY29udGVudDp0aGlzfSl9LGIuQXRsYXNMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmJhc2VVcmw9YS5yZXBsYWNlKC9bXlxcL10qJC8sXCJcIiksdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMubG9hZGVkPSExfSxiLkF0bGFzTG9hZGVyLmNvbnN0cnVjdG9yPWIuQXRsYXNMb2FkZXIsYi5BdGxhc0xvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3RoaXMuYWpheFJlcXVlc3Q9bmV3IGIuQWpheFJlcXVlc3QsdGhpcy5hamF4UmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2U9dGhpcy5vbkF0bGFzTG9hZGVkLmJpbmQodGhpcyksdGhpcy5hamF4UmVxdWVzdC5vcGVuKFwiR0VUXCIsdGhpcy51cmwsITApLHRoaXMuYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZSYmdGhpcy5hamF4UmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKFwiYXBwbGljYXRpb24vanNvblwiKSx0aGlzLmFqYXhSZXF1ZXN0LnNlbmQobnVsbCl9LGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLm9uQXRsYXNMb2FkZWQ9ZnVuY3Rpb24oKXtpZig0PT09dGhpcy5hamF4UmVxdWVzdC5yZWFkeVN0YXRlKWlmKDIwMD09PXRoaXMuYWpheFJlcXVlc3Quc3RhdHVzfHwtMT09PXdpbmRvdy5sb2NhdGlvbi5ocmVmLmluZGV4T2YoXCJodHRwXCIpKXt0aGlzLmF0bGFzPXttZXRhOntpbWFnZTpbXX0sZnJhbWVzOltdfTt2YXIgYT10aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dC5zcGxpdCgvXFxyP1xcbi8pLGM9LTMsZD0wLGU9bnVsbCxmPSExLGc9MCxoPTAsaT10aGlzLm9uTG9hZGVkLmJpbmQodGhpcyk7Zm9yKGc9MDtnPGEubGVuZ3RoO2crKylpZihhW2ddPWFbZ10ucmVwbGFjZSgvXlxccyt8XFxzKyQvZyxcIlwiKSxcIlwiPT09YVtnXSYmKGY9ZysxKSxhW2ddLmxlbmd0aD4wKXtpZihmPT09Zyl0aGlzLmF0bGFzLm1ldGEuaW1hZ2UucHVzaChhW2ddKSxkPXRoaXMuYXRsYXMubWV0YS5pbWFnZS5sZW5ndGgtMSx0aGlzLmF0bGFzLmZyYW1lcy5wdXNoKHt9KSxjPS0zO2Vsc2UgaWYoYz4wKWlmKGMlNz09PTEpbnVsbCE9ZSYmKHRoaXMuYXRsYXMuZnJhbWVzW2RdW2UubmFtZV09ZSksZT17bmFtZTphW2ddLGZyYW1lOnt9fTtlbHNle3ZhciBqPWFbZ10uc3BsaXQoXCIgXCIpO2lmKGMlNz09PTMpZS5mcmFtZS54PU51bWJlcihqWzFdLnJlcGxhY2UoXCIsXCIsXCJcIikpLGUuZnJhbWUueT1OdW1iZXIoalsyXSk7ZWxzZSBpZihjJTc9PT00KWUuZnJhbWUudz1OdW1iZXIoalsxXS5yZXBsYWNlKFwiLFwiLFwiXCIpKSxlLmZyYW1lLmg9TnVtYmVyKGpbMl0pO2Vsc2UgaWYoYyU3PT09NSl7dmFyIGs9e3g6MCx5OjAsdzpOdW1iZXIoalsxXS5yZXBsYWNlKFwiLFwiLFwiXCIpKSxoOk51bWJlcihqWzJdKX07ay53PmUuZnJhbWUud3x8ay5oPmUuZnJhbWUuaD8oZS50cmltbWVkPSEwLGUucmVhbFNpemU9ayk6ZS50cmltbWVkPSExfX1jKyt9aWYobnVsbCE9ZSYmKHRoaXMuYXRsYXMuZnJhbWVzW2RdW2UubmFtZV09ZSksdGhpcy5hdGxhcy5tZXRhLmltYWdlLmxlbmd0aD4wKXtmb3IodGhpcy5pbWFnZXM9W10saD0wO2g8dGhpcy5hdGxhcy5tZXRhLmltYWdlLmxlbmd0aDtoKyspe3ZhciBsPXRoaXMuYmFzZVVybCt0aGlzLmF0bGFzLm1ldGEuaW1hZ2VbaF0sbT10aGlzLmF0bGFzLmZyYW1lc1toXTt0aGlzLmltYWdlcy5wdXNoKG5ldyBiLkltYWdlTG9hZGVyKGwsdGhpcy5jcm9zc29yaWdpbikpO2ZvcihnIGluIG0pe3ZhciBuPW1bZ10uZnJhbWU7biYmKGIuVGV4dHVyZUNhY2hlW2ddPW5ldyBiLlRleHR1cmUodGhpcy5pbWFnZXNbaF0udGV4dHVyZS5iYXNlVGV4dHVyZSx7eDpuLngseTpuLnksd2lkdGg6bi53LGhlaWdodDpuLmh9KSxtW2ddLnRyaW1tZWQmJihiLlRleHR1cmVDYWNoZVtnXS5yZWFsU2l6ZT1tW2ddLnJlYWxTaXplLGIuVGV4dHVyZUNhY2hlW2ddLnRyaW0ueD0wLGIuVGV4dHVyZUNhY2hlW2ddLnRyaW0ueT0wKSl9fWZvcih0aGlzLmN1cnJlbnRJbWFnZUlkPTAsaD0wO2g8dGhpcy5pbWFnZXMubGVuZ3RoO2grKyl0aGlzLmltYWdlc1toXS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsaSk7dGhpcy5pbWFnZXNbdGhpcy5jdXJyZW50SW1hZ2VJZF0ubG9hZCgpfWVsc2UgdGhpcy5vbkxvYWRlZCgpfWVsc2UgdGhpcy5vbkVycm9yKCl9LGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5pbWFnZXMubGVuZ3RoLTE+dGhpcy5jdXJyZW50SW1hZ2VJZD8odGhpcy5jdXJyZW50SW1hZ2VJZCsrLHRoaXMuaW1hZ2VzW3RoaXMuY3VycmVudEltYWdlSWRdLmxvYWQoKSk6KHRoaXMubG9hZGVkPSEwLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pKX0sYi5BdGxhc0xvYWRlci5wcm90b3R5cGUub25FcnJvcj1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImVycm9yXCIsY29udGVudDp0aGlzfSl9LGIuU3ByaXRlU2hlZXRMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5iYXNlVXJsPWEucmVwbGFjZSgvW15cXC9dKiQvLFwiXCIpLHRoaXMudGV4dHVyZT1udWxsLHRoaXMuZnJhbWVzPXt9fSxiLlNwcml0ZVNoZWV0TG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNwcml0ZVNoZWV0TG9hZGVyLGIuU3ByaXRlU2hlZXRMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGM9bmV3IGIuSnNvbkxvYWRlcih0aGlzLnVybCx0aGlzLmNyb3Nzb3JpZ2luKTtjLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbihiKXthLmpzb249Yi5jb250ZW50Lmpzb24sYS5vbkxvYWRlZCgpfSksYy5sb2FkKCl9LGIuU3ByaXRlU2hlZXRMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuSW1hZ2VMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy50ZXh0dXJlPWIuVGV4dHVyZS5mcm9tSW1hZ2UoYSxjKSx0aGlzLmZyYW1lcz1bXX0sYi5JbWFnZUxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5JbWFnZUxvYWRlcixiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7aWYodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCl0aGlzLm9uTG9hZGVkKCk7ZWxzZXt2YXIgYT10aGlzO3RoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXthLm9uTG9hZGVkKCl9KX19LGIuSW1hZ2VMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuSW1hZ2VMb2FkZXIucHJvdG90eXBlLmxvYWRGcmFtZWRTcHJpdGVTaGVldD1mdW5jdGlvbihhLGMsZCl7dGhpcy5mcmFtZXM9W107Zm9yKHZhciBlPU1hdGguZmxvb3IodGhpcy50ZXh0dXJlLndpZHRoL2EpLGY9TWF0aC5mbG9vcih0aGlzLnRleHR1cmUuaGVpZ2h0L2MpLGc9MCxoPTA7Zj5oO2grKylmb3IodmFyIGk9MDtlPmk7aSsrLGcrKyl7dmFyIGo9bmV3IGIuVGV4dHVyZSh0aGlzLnRleHR1cmUse3g6aSphLHk6aCpjLHdpZHRoOmEsaGVpZ2h0OmN9KTt0aGlzLmZyYW1lcy5wdXNoKGopLGQmJihiLlRleHR1cmVDYWNoZVtkK1wiLVwiK2ddPWopfWlmKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpdGhpcy5vbkxvYWRlZCgpO2Vsc2V7dmFyIGs9dGhpczt0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7ay5vbkxvYWRlZCgpfSl9fSxiLkJpdG1hcEZvbnRMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5iYXNlVXJsPWEucmVwbGFjZSgvW15cXC9dKiQvLFwiXCIpLHRoaXMudGV4dHVyZT1udWxsfSxiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQml0bWFwRm9udExvYWRlcixiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt0aGlzLmFqYXhSZXF1ZXN0PW5ldyBiLkFqYXhSZXF1ZXN0O3ZhciBhPXRoaXM7dGhpcy5hamF4UmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2U9ZnVuY3Rpb24oKXthLm9uWE1MTG9hZGVkKCl9LHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIkdFVFwiLHRoaXMudXJsLCEwKSx0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUmJnRoaXMuYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShcImFwcGxpY2F0aW9uL3htbFwiKSx0aGlzLmFqYXhSZXF1ZXN0LnNlbmQobnVsbCl9LGIuQml0bWFwRm9udExvYWRlci5wcm90b3R5cGUub25YTUxMb2FkZWQ9ZnVuY3Rpb24oKXtpZig0PT09dGhpcy5hamF4UmVxdWVzdC5yZWFkeVN0YXRlJiYoMjAwPT09dGhpcy5hamF4UmVxdWVzdC5zdGF0dXN8fC0xPT09d2luZG93LmxvY2F0aW9uLnByb3RvY29sLmluZGV4T2YoXCJodHRwXCIpKSl7dmFyIGE9dGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVhNTDtpZighYXx8L01TSUUgOS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCl8fG5hdmlnYXRvci5pc0NvY29vbkpTKWlmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHdpbmRvdy5ET01QYXJzZXIpe3ZhciBjPW5ldyBET01QYXJzZXI7YT1jLnBhcnNlRnJvbVN0cmluZyh0aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dCxcInRleHQveG1sXCIpfWVsc2V7dmFyIGQ9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtkLmlubmVySFRNTD10aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dCxhPWR9dmFyIGU9dGhpcy5iYXNlVXJsK2EuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJwYWdlXCIpWzBdLmdldEF0dHJpYnV0ZShcImZpbGVcIiksZj1uZXcgYi5JbWFnZUxvYWRlcihlLHRoaXMuY3Jvc3NvcmlnaW4pO3RoaXMudGV4dHVyZT1mLnRleHR1cmUuYmFzZVRleHR1cmU7dmFyIGc9e30saD1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5mb1wiKVswXSxpPWEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjb21tb25cIilbMF07Zy5mb250PWguZ2V0QXR0cmlidXRlKFwiZmFjZVwiKSxnLnNpemU9cGFyc2VJbnQoaC5nZXRBdHRyaWJ1dGUoXCJzaXplXCIpLDEwKSxnLmxpbmVIZWlnaHQ9cGFyc2VJbnQoaS5nZXRBdHRyaWJ1dGUoXCJsaW5lSGVpZ2h0XCIpLDEwKSxnLmNoYXJzPXt9O2Zvcih2YXIgaj1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2hhclwiKSxrPTA7azxqLmxlbmd0aDtrKyspe3ZhciBsPXBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwiaWRcIiksMTApLG09bmV3IGIuUmVjdGFuZ2xlKHBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieFwiKSwxMCkscGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ5XCIpLDEwKSxwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcIndpZHRoXCIpLDEwKSxwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcImhlaWdodFwiKSwxMCkpO2cuY2hhcnNbbF09e3hPZmZzZXQ6cGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ4b2Zmc2V0XCIpLDEwKSx5T2Zmc2V0OnBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieW9mZnNldFwiKSwxMCkseEFkdmFuY2U6cGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ4YWR2YW5jZVwiKSwxMCksa2VybmluZzp7fSx0ZXh0dXJlOmIuVGV4dHVyZUNhY2hlW2xdPW5ldyBiLlRleHR1cmUodGhpcy50ZXh0dXJlLG0pfX12YXIgbj1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwia2VybmluZ1wiKTtmb3Ioaz0wO2s8bi5sZW5ndGg7aysrKXt2YXIgbz1wYXJzZUludChuW2tdLmdldEF0dHJpYnV0ZShcImZpcnN0XCIpLDEwKSxwPXBhcnNlSW50KG5ba10uZ2V0QXR0cmlidXRlKFwic2Vjb25kXCIpLDEwKSxxPXBhcnNlSW50KG5ba10uZ2V0QXR0cmlidXRlKFwiYW1vdW50XCIpLDEwKTtnLmNoYXJzW3BdLmtlcm5pbmdbb109cX1iLkJpdG1hcFRleHQuZm9udHNbZy5mb250XT1nO3ZhciByPXRoaXM7Zi5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXtyLm9uTG9hZGVkKCl9KSxmLmxvYWQoKX19LGIuQml0bWFwRm9udExvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KX0sYi5TcGluZUxvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmxvYWRlZD0hMX0sYi5TcGluZUxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcGluZUxvYWRlcixiLlNwaW5lTG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxjPW5ldyBiLkpzb25Mb2FkZXIodGhpcy51cmwsdGhpcy5jcm9zc29yaWdpbik7XHJcbmMuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKGIpe2EuanNvbj1iLmNvbnRlbnQuanNvbixhLm9uTG9hZGVkKCl9KSxjLmxvYWQoKX0sYi5TcGluZUxvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmxvYWRlZD0hMCx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KX0sYi5BYnN0cmFjdEZpbHRlcj1mdW5jdGlvbihhLGIpe3RoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnNoYWRlcnM9W10sdGhpcy5kaXJ0eT0hMCx0aGlzLnBhZGRpbmc9MCx0aGlzLnVuaWZvcm1zPWJ8fHt9LHRoaXMuZnJhZ21lbnRTcmM9YXx8W119LGIuQWxwaGFNYXNrRmlsdGVyPWZ1bmN0aW9uKGEpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sYS5iYXNlVGV4dHVyZS5fcG93ZXJPZjI9ITAsdGhpcy51bmlmb3Jtcz17bWFzazp7dHlwZTpcInNhbXBsZXIyRFwiLHZhbHVlOmF9LG1hcERpbWVuc2lvbnM6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjEseTo1MTEyfX0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOlswLDAsMCwwXX19LGEuYmFzZVRleHR1cmUuaGFzTG9hZGVkPyh0aGlzLnVuaWZvcm1zLm1hc2sudmFsdWUueD1hLndpZHRoLHRoaXMudW5pZm9ybXMubWFzay52YWx1ZS55PWEuaGVpZ2h0KToodGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uPXRoaXMub25UZXh0dXJlTG9hZGVkLmJpbmQodGhpcyksYS5iYXNlVGV4dHVyZS5vbihcImxvYWRlZFwiLHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbikpLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCBtYXNrO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0O1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHZlYzIgbWFwRGltZW5zaW9ucztcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIG1hcENvcmRzID0gdlRleHR1cmVDb29yZC54eTtcIixcIiAgIG1hcENvcmRzICs9IChkaW1lbnNpb25zLnp3ICsgb2Zmc2V0KS8gZGltZW5zaW9ucy54eSA7XCIsXCIgICBtYXBDb3Jkcy55ICo9IC0xLjA7XCIsXCIgICBtYXBDb3Jkcy55ICs9IDEuMDtcIixcIiAgIG1hcENvcmRzICo9IGRpbWVuc2lvbnMueHkgLyBtYXBEaW1lbnNpb25zO1wiLFwiICAgdmVjNCBvcmlnaW5hbCA9ICB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZmxvYXQgbWFza0FscGhhID0gIHRleHR1cmUyRChtYXNrLCBtYXBDb3JkcykucjtcIixcIiAgIG9yaWdpbmFsICo9IG1hc2tBbHBoYTtcIixcIiAgIGdsX0ZyYWdDb2xvciA9ICBvcmlnaW5hbDtcIixcIn1cIl19LGIuQWxwaGFNYXNrRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5BbHBoYU1hc2tGaWx0ZXIsYi5BbHBoYU1hc2tGaWx0ZXIucHJvdG90eXBlLm9uVGV4dHVyZUxvYWRlZD1mdW5jdGlvbigpe3RoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS54PXRoaXMudW5pZm9ybXMubWFzay52YWx1ZS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueT10aGlzLnVuaWZvcm1zLm1hc2sudmFsdWUuaGVpZ2h0LHRoaXMudW5pZm9ybXMubWFzay52YWx1ZS5iYXNlVGV4dHVyZS5vZmYoXCJsb2FkZWRcIix0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb24pfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5BbHBoYU1hc2tGaWx0ZXIucHJvdG90eXBlLFwibWFwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm1hc2sudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLm1hc2sudmFsdWU9YX19KSxiLkNvbG9yTWF0cml4RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXttYXRyaXg6e3R5cGU6XCJtYXQ0XCIsdmFsdWU6WzEsMCwwLDAsMCwxLDAsMCwwLDAsMSwwLDAsMCwwLDFdfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgaW52ZXJ0O1wiLFwidW5pZm9ybSBtYXQ0IG1hdHJpeDtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCkgKiBtYXRyaXg7XCIsXCJ9XCJdfSxiLkNvbG9yTWF0cml4RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkNvbG9yTWF0cml4RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkNvbG9yTWF0cml4RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkNvbG9yTWF0cml4RmlsdGVyLnByb3RvdHlwZSxcIm1hdHJpeFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5tYXRyaXgudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLm1hdHJpeC52YWx1ZT1hfX0pLGIuR3JheUZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17Z3JheTp7dHlwZTpcIjFmXCIsdmFsdWU6MX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gZmxvYXQgZ3JheTtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peChnbF9GcmFnQ29sb3IucmdiLCB2ZWMzKDAuMjEyNipnbF9GcmFnQ29sb3IuciArIDAuNzE1MipnbF9GcmFnQ29sb3IuZyArIDAuMDcyMipnbF9GcmFnQ29sb3IuYiksIGdyYXkpO1wiLFwifVwiXX0sYi5HcmF5RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkdyYXlGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuR3JheUZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5HcmF5RmlsdGVyLnByb3RvdHlwZSxcImdyYXlcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuZ3JheS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuZ3JheS52YWx1ZT1hfX0pLGIuRGlzcGxhY2VtZW50RmlsdGVyPWZ1bmN0aW9uKGEpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sYS5iYXNlVGV4dHVyZS5fcG93ZXJPZjI9ITAsdGhpcy51bmlmb3Jtcz17ZGlzcGxhY2VtZW50TWFwOnt0eXBlOlwic2FtcGxlcjJEXCIsdmFsdWU6YX0sc2NhbGU6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjMwLHk6MzB9fSxvZmZzZXQ6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjAseTowfX0sbWFwRGltZW5zaW9uczp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MSx5OjUxMTJ9fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sYS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ/KHRoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS54PWEud2lkdGgsdGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLnk9YS5oZWlnaHQpOih0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb249dGhpcy5vblRleHR1cmVMb2FkZWQuYmluZCh0aGlzKSxhLmJhc2VUZXh0dXJlLm9uKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKSksdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIGRpc3BsYWNlbWVudE1hcDtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSB2ZWMyIHNjYWxlO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldDtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSB2ZWMyIG1hcERpbWVuc2lvbnM7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiBtYXBDb3JkcyA9IHZUZXh0dXJlQ29vcmQueHk7XCIsXCIgICBtYXBDb3JkcyArPSAoZGltZW5zaW9ucy56dyArIG9mZnNldCkvIGRpbWVuc2lvbnMueHkgO1wiLFwiICAgbWFwQ29yZHMueSAqPSAtMS4wO1wiLFwiICAgbWFwQ29yZHMueSArPSAxLjA7XCIsXCIgICB2ZWMyIG1hdFNhbXBsZSA9IHRleHR1cmUyRChkaXNwbGFjZW1lbnRNYXAsIG1hcENvcmRzKS54eTtcIixcIiAgIG1hdFNhbXBsZSAtPSAwLjU7XCIsXCIgICBtYXRTYW1wbGUgKj0gc2NhbGU7XCIsXCIgICBtYXRTYW1wbGUgLz0gbWFwRGltZW5zaW9ucztcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggKyBtYXRTYW1wbGUueCwgdlRleHR1cmVDb29yZC55ICsgbWF0U2FtcGxlLnkpKTtcIixcIiAgIGdsX0ZyYWdDb2xvci5yZ2IgPSBtaXgoIGdsX0ZyYWdDb2xvci5yZ2IsIGdsX0ZyYWdDb2xvci5yZ2IsIDEuMCk7XCIsXCIgICB2ZWMyIGNvcmQgPSB2VGV4dHVyZUNvb3JkO1wiLFwifVwiXX0sYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRpc3BsYWNlbWVudEZpbHRlcixiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUub25UZXh0dXJlTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLng9dGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWUud2lkdGgsdGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLnk9dGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWUuaGVpZ2h0LHRoaXMudW5pZm9ybXMuZGlzcGxhY2VtZW50TWFwLnZhbHVlLmJhc2VUZXh0dXJlLm9mZihcImxvYWRlZFwiLHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbil9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUsXCJtYXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuZGlzcGxhY2VtZW50TWFwLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLFwic2NhbGVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuc2NhbGUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZSxcIm9mZnNldFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5vZmZzZXQudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZT1hfX0pLGIuUGl4ZWxhdGVGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2ludmVydDp7dHlwZTpcIjFmXCIsdmFsdWU6MH0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOm5ldyBGbG9hdDMyQXJyYXkoWzFlNCwxMDAsMTAsMTBdKX0scGl4ZWxTaXplOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoxMCx5OjEwfX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHZlYzIgdGVzdERpbTtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSB2ZWMyIHBpeGVsU2l6ZTtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgY29vcmQgPSB2VGV4dHVyZUNvb3JkO1wiLFwiICAgdmVjMiBzaXplID0gZGltZW5zaW9ucy54eS9waXhlbFNpemU7XCIsXCIgICB2ZWMyIGNvbG9yID0gZmxvb3IoICggdlRleHR1cmVDb29yZCAqIHNpemUgKSApIC8gc2l6ZSArIHBpeGVsU2l6ZS9kaW1lbnNpb25zLnh5ICogMC41O1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCBjb2xvcik7XCIsXCJ9XCJdfSxiLlBpeGVsYXRlRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLlBpeGVsYXRlRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlBpeGVsYXRlRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlBpeGVsYXRlRmlsdGVyLnByb3RvdHlwZSxcInNpemVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMucGl4ZWxTaXplLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLnBpeGVsU2l6ZS52YWx1ZT1hfX0pLGIuQmx1clhGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2JsdXI6e3R5cGU6XCIxZlwiLHZhbHVlOjEvNTEyfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgYmx1cjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzQgc3VtID0gdmVjNCgwLjApO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggLSA0LjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjA1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggLSAzLjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjA5O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggLSAyLjAqYmx1ciwgdlRleHR1cmVDb29yZC55KSkgKiAwLjEyO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggLSBibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSkgKiAwLjE2O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLnggKyBibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIDIuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIDMuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIDQuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDU7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSBzdW07XCIsXCJ9XCJdfSxiLkJsdXJYRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkJsdXJYRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJsdXJYRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJYRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZS8oMS83ZTMpfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWU9MS83ZTMqYX19KSxiLkJsdXJZRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtibHVyOnt0eXBlOlwiMWZcIix2YWx1ZToxLzUxMn19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGJsdXI7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWM0IHN1bSA9IHZlYzQoMC4wKTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgLSA0LjAqYmx1cikpICogMC4wNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgLSAzLjAqYmx1cikpICogMC4wOTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgLSAyLjAqYmx1cikpICogMC4xMjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgLSBibHVyKSkgKiAwLjE1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkgKyBibHVyKSkgKiAwLjE1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSArIDIuMCpibHVyKSkgKiAwLjEyO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSArIDMuMCpibHVyKSkgKiAwLjA5O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSArIDQuMCpibHVyKSkgKiAwLjA1O1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gc3VtO1wiLFwifVwiXX0sYi5CbHVyWUZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5CbHVyWUZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CbHVyWUZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyWUZpbHRlci5wcm90b3R5cGUsXCJibHVyXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWUvKDEvN2UzKX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLGIuQmx1ckZpbHRlcj1mdW5jdGlvbigpe3RoaXMuYmx1clhGaWx0ZXI9bmV3IGIuQmx1clhGaWx0ZXIsdGhpcy5ibHVyWUZpbHRlcj1uZXcgYi5CbHVyWUZpbHRlcix0aGlzLnBhc3Nlcz1bdGhpcy5ibHVyWEZpbHRlcix0aGlzLmJsdXJZRmlsdGVyXX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1ckZpbHRlci5wcm90b3R5cGUsXCJibHVyXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJsdXJYRmlsdGVyLmJsdXJ9LHNldDpmdW5jdGlvbihhKXt0aGlzLmJsdXJYRmlsdGVyLmJsdXI9dGhpcy5ibHVyWUZpbHRlci5ibHVyPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1ckZpbHRlci5wcm90b3R5cGUsXCJibHVyWFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ibHVyWEZpbHRlci5ibHVyfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5ibHVyWEZpbHRlci5ibHVyPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1ckZpbHRlci5wcm90b3R5cGUsXCJibHVyWVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ibHVyWUZpbHRlci5ibHVyfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5ibHVyWUZpbHRlci5ibHVyPWF9fSksYi5JbnZlcnRGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2ludmVydDp7dHlwZTpcIjFmXCIsdmFsdWU6MX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGludmVydDtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBnbF9GcmFnQ29sb3IucmdiID0gbWl4KCAodmVjMygxKS1nbF9GcmFnQ29sb3IucmdiKSAqIGdsX0ZyYWdDb2xvci5hLCBnbF9GcmFnQ29sb3IucmdiLCAxLjAgLSBpbnZlcnQpO1wiLFwifVwiXX0sYi5JbnZlcnRGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuSW52ZXJ0RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkludmVydEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5JbnZlcnRGaWx0ZXIucHJvdG90eXBlLFwiaW52ZXJ0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmludmVydC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuaW52ZXJ0LnZhbHVlPWF9fSksYi5TZXBpYUZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17c2VwaWE6e3R5cGU6XCIxZlwiLHZhbHVlOjF9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBzZXBpYTtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwiY29uc3QgbWF0MyBzZXBpYU1hdHJpeCA9IG1hdDMoMC4zNTg4LCAwLjcwNDQsIDAuMTM2OCwgMC4yOTkwLCAwLjU4NzAsIDAuMTE0MCwgMC4yMzkyLCAwLjQ2OTYsIDAuMDkxMik7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGdsX0ZyYWdDb2xvci5yZ2IgPSBtaXgoIGdsX0ZyYWdDb2xvci5yZ2IsIGdsX0ZyYWdDb2xvci5yZ2IgKiBzZXBpYU1hdHJpeCwgc2VwaWEpO1wiLFwifVwiXX0sYi5TZXBpYUZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5TZXBpYUZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TZXBpYUZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5TZXBpYUZpbHRlci5wcm90b3R5cGUsXCJzZXBpYVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5zZXBpYS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuc2VwaWEudmFsdWU9YX19KSxiLlR3aXN0RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtyYWRpdXM6e3R5cGU6XCIxZlwiLHZhbHVlOi41fSxhbmdsZTp7dHlwZTpcIjFmXCIsdmFsdWU6NX0sb2Zmc2V0Ont0eXBlOlwiMmZcIix2YWx1ZTp7eDouNSx5Oi41fX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSBmbG9hdCByYWRpdXM7XCIsXCJ1bmlmb3JtIGZsb2F0IGFuZ2xlO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldDtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIGNvb3JkID0gdlRleHR1cmVDb29yZCAtIG9mZnNldDtcIixcIiAgIGZsb2F0IGRpc3RhbmNlID0gbGVuZ3RoKGNvb3JkKTtcIixcIiAgIGlmIChkaXN0YW5jZSA8IHJhZGl1cykge1wiLFwiICAgICAgIGZsb2F0IHJhdGlvID0gKHJhZGl1cyAtIGRpc3RhbmNlKSAvIHJhZGl1cztcIixcIiAgICAgICBmbG9hdCBhbmdsZU1vZCA9IHJhdGlvICogcmF0aW8gKiBhbmdsZTtcIixcIiAgICAgICBmbG9hdCBzID0gc2luKGFuZ2xlTW9kKTtcIixcIiAgICAgICBmbG9hdCBjID0gY29zKGFuZ2xlTW9kKTtcIixcIiAgICAgICBjb29yZCA9IHZlYzIoY29vcmQueCAqIGMgLSBjb29yZC55ICogcywgY29vcmQueCAqIHMgKyBjb29yZC55ICogYyk7XCIsXCIgICB9XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIGNvb3JkK29mZnNldCk7XCIsXCJ9XCJdfSxiLlR3aXN0RmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLlR3aXN0RmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlR3aXN0RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlR3aXN0RmlsdGVyLnByb3RvdHlwZSxcIm9mZnNldFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5vZmZzZXQudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMub2Zmc2V0LnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLFwicmFkaXVzXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnJhZGl1cy52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5yYWRpdXMudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Ud2lzdEZpbHRlci5wcm90b3R5cGUsXCJhbmdsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5hbmdsZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5hbmdsZS52YWx1ZT1hfX0pLGIuQ29sb3JTdGVwRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtzdGVwOnt0eXBlOlwiMWZcIix2YWx1ZTo1fX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSBmbG9hdCBzdGVwO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzQgY29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgY29sb3IgPSBmbG9vcihjb2xvciAqIHN0ZXApIC8gc3RlcDtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IGNvbG9yO1wiLFwifVwiXX0sYi5Db2xvclN0ZXBGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQ29sb3JTdGVwRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkNvbG9yU3RlcEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Db2xvclN0ZXBGaWx0ZXIucHJvdG90eXBlLFwic3RlcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5zdGVwLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5zdGVwLnZhbHVlPWF9fSksYi5Eb3RTY3JlZW5GaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3NjYWxlOnt0eXBlOlwiMWZcIix2YWx1ZToxfSxhbmdsZTp7dHlwZTpcIjFmXCIsdmFsdWU6NX0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOlswLDAsMCwwXX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSBmbG9hdCBhbmdsZTtcIixcInVuaWZvcm0gZmxvYXQgc2NhbGU7XCIsXCJmbG9hdCBwYXR0ZXJuKCkge1wiLFwiICAgZmxvYXQgcyA9IHNpbihhbmdsZSksIGMgPSBjb3MoYW5nbGUpO1wiLFwiICAgdmVjMiB0ZXggPSB2VGV4dHVyZUNvb3JkICogZGltZW5zaW9ucy54eTtcIixcIiAgIHZlYzIgcG9pbnQgPSB2ZWMyKFwiLFwiICAgICAgIGMgKiB0ZXgueCAtIHMgKiB0ZXgueSxcIixcIiAgICAgICBzICogdGV4LnggKyBjICogdGV4LnlcIixcIiAgICkgKiBzY2FsZTtcIixcIiAgIHJldHVybiAoc2luKHBvaW50LngpICogc2luKHBvaW50LnkpKSAqIDQuMDtcIixcIn1cIixcInZvaWQgbWFpbigpIHtcIixcIiAgIHZlYzQgY29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZmxvYXQgYXZlcmFnZSA9IChjb2xvci5yICsgY29sb3IuZyArIGNvbG9yLmIpIC8gMy4wO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCh2ZWMzKGF2ZXJhZ2UgKiAxMC4wIC0gNS4wICsgcGF0dGVybigpKSwgY29sb3IuYSk7XCIsXCJ9XCJdfSxiLkRvdFNjcmVlbkZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Eb3RTY3JlZW5GaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRG90U2NyZWVuRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRvdFNjcmVlbkZpbHRlci5wcm90b3R5cGUsXCJzY2FsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5zY2FsZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5zY2FsZS52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRvdFNjcmVlbkZpbHRlci5wcm90b3R5cGUsXCJhbmdsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5hbmdsZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5hbmdsZS52YWx1ZT1hfX0pLGIuQ3Jvc3NIYXRjaEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17Ymx1cjp7dHlwZTpcIjFmXCIsdmFsdWU6MS81MTJ9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBibHVyO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgIGZsb2F0IGx1bSA9IGxlbmd0aCh0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQueHkpLnJnYik7XCIsXCIgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLjAsIDEuMCwgMS4wLCAxLjApO1wiLFwiICAgIGlmIChsdW0gPCAxLjAwKSB7XCIsXCIgICAgICAgIGlmIChtb2QoZ2xfRnJhZ0Nvb3JkLnggKyBnbF9GcmFnQ29vcmQueSwgMTAuMCkgPT0gMC4wKSB7XCIsXCIgICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAuMCwgMC4wLCAwLjAsIDEuMCk7XCIsXCIgICAgICAgIH1cIixcIiAgICB9XCIsXCIgICAgaWYgKGx1bSA8IDAuNzUpIHtcIixcIiAgICAgICAgaWYgKG1vZChnbF9GcmFnQ29vcmQueCAtIGdsX0ZyYWdDb29yZC55LCAxMC4wKSA9PSAwLjApIHtcIixcIiAgICAgICAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMS4wKTtcIixcIiAgICAgICAgfVwiLFwiICAgIH1cIixcIiAgICBpZiAobHVtIDwgMC41MCkge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54ICsgZ2xfRnJhZ0Nvb3JkLnkgLSA1LjAsIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwiICAgIGlmIChsdW0gPCAwLjMpIHtcIixcIiAgICAgICAgaWYgKG1vZChnbF9GcmFnQ29vcmQueCAtIGdsX0ZyYWdDb29yZC55IC0gNS4wLCAxMC4wKSA9PSAwLjApIHtcIixcIiAgICAgICAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMS4wKTtcIixcIiAgICAgICAgfVwiLFwiICAgIH1cIixcIn1cIl19LGIuQ3Jvc3NIYXRjaEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Dcm9zc0hhdGNoRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJsdXJZRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkNyb3NzSGF0Y2hGaWx0ZXIucHJvdG90eXBlLFwiYmx1clwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWU9MS83ZTMqYX19KSxiLlJHQlNwbGl0RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtyZWQ6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjIwLHk6MjB9fSxncmVlbjp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6LTIwLHk6MjB9fSxibHVlOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoyMCx5Oi0yMH19LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpbMCwwLDAsMF19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSB2ZWMyIHJlZDtcIixcInVuaWZvcm0gdmVjMiBncmVlbjtcIixcInVuaWZvcm0gdmVjMiBibHVlO1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IuciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCArIHJlZC9kaW1lbnNpb25zLnh5KS5yO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLmcgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQgKyBncmVlbi9kaW1lbnNpb25zLnh5KS5nO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLmIgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQgKyBibHVlL2RpbWVuc2lvbnMueHkpLmI7XCIsXCIgICBnbF9GcmFnQ29sb3IuYSA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCkuYTtcIixcIn1cIl19LGIuUkdCU3BsaXRGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuUkdCU3BsaXRGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUkdCU3BsaXRGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuUkdCU3BsaXRGaWx0ZXIucHJvdG90eXBlLFwiYW5nbGVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZS8oMS83ZTMpfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlPTEvN2UzKmF9fSksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHM/KFwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzJiYoZXhwb3J0cz1tb2R1bGUuZXhwb3J0cz1iKSxleHBvcnRzLlBJWEk9Yik6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoYik6YS5QSVhJPWJ9KS5jYWxsKHRoaXMpOyIsIi8qKlxuICogVHdlZW4uanMgLSBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2xlL3R3ZWVuLmpzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2xlL3R3ZWVuLmpzL2dyYXBocy9jb250cmlidXRvcnMgZm9yIHRoZSBmdWxsIGxpc3Qgb2YgY29udHJpYnV0b3JzLlxuICogVGhhbmsgeW91IGFsbCwgeW91J3JlIGF3ZXNvbWUhXG4gKi9cblxuLy8gRGF0ZS5ub3cgc2hpbSBmb3IgKGFoZW0pIEludGVybmV0IEV4cGxvKGR8cillclxuaWYgKCBEYXRlLm5vdyA9PT0gdW5kZWZpbmVkICkge1xuXG5cdERhdGUubm93ID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXG5cdH07XG5cbn1cblxudmFyIFRXRUVOID0gVFdFRU4gfHwgKCBmdW5jdGlvbiAoKSB7XG5cblx0dmFyIF90d2VlbnMgPSBbXTtcblxuXHRyZXR1cm4ge1xuXG5cdFx0UkVWSVNJT046ICcxNCcsXG5cblx0XHRnZXRBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0cmV0dXJuIF90d2VlbnM7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdF90d2VlbnMgPSBbXTtcblxuXHRcdH0sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uICggdHdlZW4gKSB7XG5cblx0XHRcdF90d2VlbnMucHVzaCggdHdlZW4gKTtcblxuXHRcdH0sXG5cblx0XHRyZW1vdmU6IGZ1bmN0aW9uICggdHdlZW4gKSB7XG5cblx0XHRcdHZhciBpID0gX3R3ZWVucy5pbmRleE9mKCB0d2VlbiApO1xuXG5cdFx0XHRpZiAoIGkgIT09IC0xICkge1xuXG5cdFx0XHRcdF90d2VlbnMuc3BsaWNlKCBpLCAxICk7XG5cblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdFx0aWYgKCBfdHdlZW5zLmxlbmd0aCA9PT0gMCApIHJldHVybiBmYWxzZTtcblxuXHRcdFx0dmFyIGkgPSAwO1xuXG5cdFx0XHR0aW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6ICggdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyAhPT0gdW5kZWZpbmVkID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogRGF0ZS5ub3coKSApO1xuXG5cdFx0XHR3aGlsZSAoIGkgPCBfdHdlZW5zLmxlbmd0aCApIHtcblxuXHRcdFx0XHRpZiAoIF90d2VlbnNbIGkgXS51cGRhdGUoIHRpbWUgKSApIHtcblxuXHRcdFx0XHRcdGkrKztcblxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoIGksIDEgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cdH07XG5cbn0gKSgpO1xuXG5UV0VFTi5Ud2VlbiA9IGZ1bmN0aW9uICggb2JqZWN0ICkge1xuXG5cdHZhciBfb2JqZWN0ID0gb2JqZWN0O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0ID0ge307XG5cdHZhciBfdmFsdWVzRW5kID0ge307XG5cdHZhciBfdmFsdWVzU3RhcnRSZXBlYXQgPSB7fTtcblx0dmFyIF9kdXJhdGlvbiA9IDEwMDA7XG5cdHZhciBfcmVwZWF0ID0gMDtcblx0dmFyIF95b3lvID0gZmFsc2U7XG5cdHZhciBfaXNQbGF5aW5nID0gZmFsc2U7XG5cdHZhciBfcmV2ZXJzZWQgPSBmYWxzZTtcblx0dmFyIF9kZWxheVRpbWUgPSAwO1xuXHR2YXIgX3N0YXJ0VGltZSA9IG51bGw7XG5cdHZhciBfZWFzaW5nRnVuY3Rpb24gPSBUV0VFTi5FYXNpbmcuTGluZWFyLk5vbmU7XG5cdHZhciBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5MaW5lYXI7XG5cdHZhciBfY2hhaW5lZFR3ZWVucyA9IFtdO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblx0dmFyIF9vblVwZGF0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RvcENhbGxiYWNrID0gbnVsbDtcblxuXHQvLyBTZXQgYWxsIHN0YXJ0aW5nIHZhbHVlcyBwcmVzZW50IG9uIHRoZSB0YXJnZXQgb2JqZWN0XG5cdGZvciAoIHZhciBmaWVsZCBpbiBvYmplY3QgKSB7XG5cblx0XHRfdmFsdWVzU3RhcnRbIGZpZWxkIF0gPSBwYXJzZUZsb2F0KG9iamVjdFtmaWVsZF0sIDEwKTtcblxuXHR9XG5cblx0dGhpcy50byA9IGZ1bmN0aW9uICggcHJvcGVydGllcywgZHVyYXRpb24gKSB7XG5cblx0XHRpZiAoIGR1cmF0aW9uICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdF9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXG5cdFx0fVxuXG5cdFx0X3ZhbHVlc0VuZCA9IHByb3BlcnRpZXM7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RhcnQgPSBmdW5jdGlvbiAoIHRpbWUgKSB7XG5cblx0XHRUV0VFTi5hZGQoIHRoaXMgKTtcblxuXHRcdF9pc1BsYXlpbmcgPSB0cnVlO1xuXG5cdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cblx0XHRfc3RhcnRUaW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6ICggdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyAhPT0gdW5kZWZpbmVkID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogRGF0ZS5ub3coKSApO1xuXHRcdF9zdGFydFRpbWUgKz0gX2RlbGF5VGltZTtcblxuXHRcdGZvciAoIHZhciBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kICkge1xuXG5cdFx0XHQvLyBjaGVjayBpZiBhbiBBcnJheSB3YXMgcHJvdmlkZWQgYXMgcHJvcGVydHkgdmFsdWVcblx0XHRcdGlmICggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSBpbnN0YW5jZW9mIEFycmF5ICkge1xuXG5cdFx0XHRcdGlmICggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXS5sZW5ndGggPT09IDAgKSB7XG5cblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY3JlYXRlIGEgbG9jYWwgY29weSBvZiB0aGUgQXJyYXkgd2l0aCB0aGUgc3RhcnQgdmFsdWUgYXQgdGhlIGZyb250XG5cdFx0XHRcdF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gPSBbIF9vYmplY3RbIHByb3BlcnR5IF0gXS5jb25jYXQoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gPSBfb2JqZWN0WyBwcm9wZXJ0eSBdO1xuXG5cdFx0XHRpZiggKCBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gaW5zdGFuY2VvZiBBcnJheSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0X3ZhbHVlc1N0YXJ0WyBwcm9wZXJ0eSBdICo9IDEuMDsgLy8gRW5zdXJlcyB3ZSdyZSB1c2luZyBudW1iZXJzLCBub3Qgc3RyaW5nc1xuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gfHwgMDtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0aWYgKCAhX2lzUGxheWluZyApIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdFRXRUVOLnJlbW92ZSggdGhpcyApO1xuXHRcdF9pc1BsYXlpbmcgPSBmYWxzZTtcblxuXHRcdGlmICggX29uU3RvcENhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRfb25TdG9wQ2FsbGJhY2suY2FsbCggX29iamVjdCApO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucygpO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdG9wQ2hhaW5lZFR3ZWVucyA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGZvciAoIHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKyApIHtcblxuXHRcdFx0X2NoYWluZWRUd2VlbnNbIGkgXS5zdG9wKCk7XG5cblx0XHR9XG5cblx0fTtcblxuXHR0aGlzLmRlbGF5ID0gZnVuY3Rpb24gKCBhbW91bnQgKSB7XG5cblx0XHRfZGVsYXlUaW1lID0gYW1vdW50O1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5yZXBlYXQgPSBmdW5jdGlvbiAoIHRpbWVzICkge1xuXG5cdFx0X3JlcGVhdCA9IHRpbWVzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy55b3lvID0gZnVuY3Rpb24oIHlveW8gKSB7XG5cblx0XHRfeW95byA9IHlveW87XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXG5cdHRoaXMuZWFzaW5nID0gZnVuY3Rpb24gKCBlYXNpbmcgKSB7XG5cblx0XHRfZWFzaW5nRnVuY3Rpb24gPSBlYXNpbmc7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLmludGVycG9sYXRpb24gPSBmdW5jdGlvbiAoIGludGVycG9sYXRpb24gKSB7XG5cblx0XHRfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gaW50ZXJwb2xhdGlvbjtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuY2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRfY2hhaW5lZFR3ZWVucyA9IGFyZ3VtZW50cztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdGFydCA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25TdGFydENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uVXBkYXRlID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblVwZGF0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uQ29tcGxldGUgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uQ29tcGxldGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0b3AgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uU3RvcENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdHZhciBwcm9wZXJ0eTtcblxuXHRcdGlmICggdGltZSA8IF9zdGFydFRpbWUgKSB7XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0aWYgKCBfb25TdGFydENhbGxiYWNrRmlyZWQgPT09IGZhbHNlICkge1xuXG5cdFx0XHRpZiAoIF9vblN0YXJ0Q2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdFx0X29uU3RhcnRDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHRcdH1cblxuXHRcdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gdHJ1ZTtcblxuXHRcdH1cblxuXHRcdHZhciBlbGFwc2VkID0gKCB0aW1lIC0gX3N0YXJ0VGltZSApIC8gX2R1cmF0aW9uO1xuXHRcdGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG5cdFx0dmFyIHZhbHVlID0gX2Vhc2luZ0Z1bmN0aW9uKCBlbGFwc2VkICk7XG5cblx0XHRmb3IgKCBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kICkge1xuXG5cdFx0XHR2YXIgc3RhcnQgPSBfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gfHwgMDtcblx0XHRcdHZhciBlbmQgPSBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdO1xuXG5cdFx0XHRpZiAoIGVuZCBpbnN0YW5jZW9mIEFycmF5ICkge1xuXG5cdFx0XHRcdF9vYmplY3RbIHByb3BlcnR5IF0gPSBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uKCBlbmQsIHZhbHVlICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Ly8gUGFyc2VzIHJlbGF0aXZlIGVuZCB2YWx1ZXMgd2l0aCBzdGFydCBhcyBiYXNlIChlLmcuOiArMTAsIC0zKVxuXHRcdFx0XHRpZiAoIHR5cGVvZihlbmQpID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdGVuZCA9IHN0YXJ0ICsgcGFyc2VGbG9hdChlbmQsIDEwKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHByb3RlY3QgYWdhaW5zdCBub24gbnVtZXJpYyBwcm9wZXJ0aWVzLlxuXHRcdFx0XHRpZiAoIHR5cGVvZihlbmQpID09PSBcIm51bWJlclwiICkge1xuXHRcdFx0XHRcdF9vYmplY3RbIHByb3BlcnR5IF0gPSBzdGFydCArICggZW5kIC0gc3RhcnQgKSAqIHZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGlmICggX29uVXBkYXRlQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdF9vblVwZGF0ZUNhbGxiYWNrLmNhbGwoIF9vYmplY3QsIHZhbHVlICk7XG5cblx0XHR9XG5cblx0XHRpZiAoIGVsYXBzZWQgPT0gMSApIHtcblxuXHRcdFx0aWYgKCBfcmVwZWF0ID4gMCApIHtcblxuXHRcdFx0XHRpZiggaXNGaW5pdGUoIF9yZXBlYXQgKSApIHtcblx0XHRcdFx0XHRfcmVwZWF0LS07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyByZWFzc2lnbiBzdGFydGluZyB2YWx1ZXMsIHJlc3RhcnQgYnkgbWFraW5nIHN0YXJ0VGltZSA9IG5vd1xuXHRcdFx0XHRmb3IoIHByb3BlcnR5IGluIF92YWx1ZXNTdGFydFJlcGVhdCApIHtcblxuXHRcdFx0XHRcdGlmICggdHlwZW9mKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdICkgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gKyBwYXJzZUZsb2F0KF92YWx1ZXNFbmRbIHByb3BlcnR5IF0sIDEwKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRcdHZhciB0bXAgPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF07XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF0gPSBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdO1xuXHRcdFx0XHRcdFx0X3ZhbHVlc0VuZFsgcHJvcGVydHkgXSA9IHRtcDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbIHByb3BlcnR5IF07XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdF9yZXZlcnNlZCA9ICFfcmV2ZXJzZWQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfc3RhcnRUaW1lID0gdGltZSArIF9kZWxheVRpbWU7XG5cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0aWYgKCBfb25Db21wbGV0ZUNhbGxiYWNrICE9PSBudWxsICkge1xuXG5cdFx0XHRcdFx0X29uQ29tcGxldGVDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAoIHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKyApIHtcblxuXHRcdFx0XHRcdF9jaGFpbmVkVHdlZW5zWyBpIF0uc3RhcnQoIHRpbWUgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHR9O1xuXG59O1xuXG5cblRXRUVOLkVhc2luZyA9IHtcblxuXHRMaW5lYXI6IHtcblxuXHRcdE5vbmU6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGs7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFkcmF0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiAoIDIgLSBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogaztcblx0XHRcdHJldHVybiAtIDAuNSAqICggLS1rICogKCBrIC0gMiApIC0gMSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q3ViaWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gMC41ICogKCAoIGsgLT0gMiApICogayAqIGsgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFydGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSAoIC0tayAqIGsgKiBrICogayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEpIHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIC0gMC41ICogKCAoIGsgLT0gMiApICogayAqIGsgKiBrIC0gMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVpbnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogayAqIGsgKiBrICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0U2ludXNvaWRhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLmNvcyggayAqIE1hdGguUEkgLyAyICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNpbiggayAqIE1hdGguUEkgLyAyICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIDAuNSAqICggMSAtIE1hdGguY29zKCBNYXRoLlBJICogayApICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFeHBvbmVudGlhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDAgPyAwIDogTWF0aC5wb3coIDEwMjQsIGsgLSAxICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrID09PSAxID8gMSA6IDEgLSBNYXRoLnBvdyggMiwgLSAxMCAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAwLjUgKiBNYXRoLnBvdyggMTAyNCwgayAtIDEgKTtcblx0XHRcdHJldHVybiAwLjUgKiAoIC0gTWF0aC5wb3coIDIsIC0gMTAgKiAoIGsgLSAxICkgKSArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdENpcmN1bGFyOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguc3FydCggMSAtIGsgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNxcnQoIDEgLSAoIC0tayAqIGsgKSApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEpIHJldHVybiAtIDAuNSAqICggTWF0aC5zcXJ0KCAxIC0gayAqIGspIC0gMSk7XG5cdFx0XHRyZXR1cm4gMC41ICogKCBNYXRoLnNxcnQoIDEgLSAoIGsgLT0gMikgKiBrKSArIDEpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RWxhc3RpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMsIGEgPSAwLjEsIHAgPSAwLjQ7XG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAhYSB8fCBhIDwgMSApIHsgYSA9IDE7IHMgPSBwIC8gNDsgfVxuXHRcdFx0ZWxzZSBzID0gcCAqIE1hdGguYXNpbiggMSAvIGEgKSAvICggMiAqIE1hdGguUEkgKTtcblx0XHRcdHJldHVybiAtICggYSAqIE1hdGgucG93KCAyLCAxMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMsIGEgPSAwLjEsIHAgPSAwLjQ7XG5cdFx0XHRpZiAoIGsgPT09IDAgKSByZXR1cm4gMDtcblx0XHRcdGlmICggayA9PT0gMSApIHJldHVybiAxO1xuXHRcdFx0aWYgKCAhYSB8fCBhIDwgMSApIHsgYSA9IDE7IHMgPSBwIC8gNDsgfVxuXHRcdFx0ZWxzZSBzID0gcCAqIE1hdGguYXNpbiggMSAvIGEgKSAvICggMiAqIE1hdGguUEkgKTtcblx0XHRcdHJldHVybiAoIGEgKiBNYXRoLnBvdyggMiwgLSAxMCAqIGspICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSArIDEgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSApIHJldHVybiAtIDAuNSAqICggYSAqIE1hdGgucG93KCAyLCAxMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKTtcblx0XHRcdHJldHVybiBhICogTWF0aC5wb3coIDIsIC0xMCAqICggayAtPSAxICkgKSAqIE1hdGguc2luKCAoIGsgLSBzICkgKiAoIDIgKiBNYXRoLlBJICkgLyBwICkgKiAwLjUgKyAxO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0QmFjazoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXHRcdFx0cmV0dXJuIGsgKiBrICogKCAoIHMgKyAxICkgKiBrIC0gcyApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cdFx0XHRyZXR1cm4gLS1rICogayAqICggKCBzICsgMSApICogayArIHMgKSArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqICggayAqIGsgKiAoICggcyArIDEgKSAqIGsgLSBzICkgKTtcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogKCAoIHMgKyAxICkgKiBrICsgcyApICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Qm91bmNlOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KCAxIC0gayApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPCAoIDEgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuXG5cdFx0XHR9IGVsc2UgaWYgKCBrIDwgKCAyIC8gMi43NSApICkge1xuXG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoIGsgLT0gKCAxLjUgLyAyLjc1ICkgKSAqIGsgKyAwLjc1O1xuXG5cdFx0XHR9IGVsc2UgaWYgKCBrIDwgKCAyLjUgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDIuMjUgLyAyLjc1ICkgKSAqIGsgKyAwLjkzNzU7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDIuNjI1IC8gMi43NSApICkgKiBrICsgMC45ODQzNzU7XG5cblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoIGsgPCAwLjUgKSByZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5JbiggayAqIDIgKSAqIDAuNTtcblx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLk91dCggayAqIDIgLSAxICkgKiAwLjUgKyAwLjU7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5UV0VFTi5JbnRlcnBvbGF0aW9uID0ge1xuXG5cdExpbmVhcjogZnVuY3Rpb24gKCB2LCBrICkge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDEsIGYgPSBtICogaywgaSA9IE1hdGguZmxvb3IoIGYgKSwgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkxpbmVhcjtcblxuXHRcdGlmICggayA8IDAgKSByZXR1cm4gZm4oIHZbIDAgXSwgdlsgMSBdLCBmICk7XG5cdFx0aWYgKCBrID4gMSApIHJldHVybiBmbiggdlsgbSBdLCB2WyBtIC0gMSBdLCBtIC0gZiApO1xuXG5cdFx0cmV0dXJuIGZuKCB2WyBpIF0sIHZbIGkgKyAxID4gbSA/IG0gOiBpICsgMSBdLCBmIC0gaSApO1xuXG5cdH0sXG5cblx0QmV6aWVyOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgYiA9IDAsIG4gPSB2Lmxlbmd0aCAtIDEsIHB3ID0gTWF0aC5wb3csIGJuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5CZXJuc3RlaW4sIGk7XG5cblx0XHRmb3IgKCBpID0gMDsgaSA8PSBuOyBpKysgKSB7XG5cdFx0XHRiICs9IHB3KCAxIC0gaywgbiAtIGkgKSAqIHB3KCBrLCBpICkgKiB2WyBpIF0gKiBibiggbiwgaSApO1xuXHRcdH1cblxuXHRcdHJldHVybiBiO1xuXG5cdH0sXG5cblx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKCB2LCBrICkge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDEsIGYgPSBtICogaywgaSA9IE1hdGguZmxvb3IoIGYgKSwgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkNhdG11bGxSb207XG5cblx0XHRpZiAoIHZbIDAgXSA9PT0gdlsgbSBdICkge1xuXG5cdFx0XHRpZiAoIGsgPCAwICkgaSA9IE1hdGguZmxvb3IoIGYgPSBtICogKCAxICsgayApICk7XG5cblx0XHRcdHJldHVybiBmbiggdlsgKCBpIC0gMSArIG0gKSAlIG0gXSwgdlsgaSBdLCB2WyAoIGkgKyAxICkgJSBtIF0sIHZbICggaSArIDIgKSAlIG0gXSwgZiAtIGkgKTtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGlmICggayA8IDAgKSByZXR1cm4gdlsgMCBdIC0gKCBmbiggdlsgMCBdLCB2WyAwIF0sIHZbIDEgXSwgdlsgMSBdLCAtZiApIC0gdlsgMCBdICk7XG5cdFx0XHRpZiAoIGsgPiAxICkgcmV0dXJuIHZbIG0gXSAtICggZm4oIHZbIG0gXSwgdlsgbSBdLCB2WyBtIC0gMSBdLCB2WyBtIC0gMSBdLCBmIC0gbSApIC0gdlsgbSBdICk7XG5cblx0XHRcdHJldHVybiBmbiggdlsgaSA/IGkgLSAxIDogMCBdLCB2WyBpIF0sIHZbIG0gPCBpICsgMSA/IG0gOiBpICsgMSBdLCB2WyBtIDwgaSArIDIgPyBtIDogaSArIDIgXSwgZiAtIGkgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFV0aWxzOiB7XG5cblx0XHRMaW5lYXI6IGZ1bmN0aW9uICggcDAsIHAxLCB0ICkge1xuXG5cdFx0XHRyZXR1cm4gKCBwMSAtIHAwICkgKiB0ICsgcDA7XG5cblx0XHR9LFxuXG5cdFx0QmVybnN0ZWluOiBmdW5jdGlvbiAoIG4gLCBpICkge1xuXG5cdFx0XHR2YXIgZmMgPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkZhY3RvcmlhbDtcblx0XHRcdHJldHVybiBmYyggbiApIC8gZmMoIGkgKSAvIGZjKCBuIC0gaSApO1xuXG5cdFx0fSxcblxuXHRcdEZhY3RvcmlhbDogKCBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHZhciBhID0gWyAxIF07XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAoIG4gKSB7XG5cblx0XHRcdFx0dmFyIHMgPSAxLCBpO1xuXHRcdFx0XHRpZiAoIGFbIG4gXSApIHJldHVybiBhWyBuIF07XG5cdFx0XHRcdGZvciAoIGkgPSBuOyBpID4gMTsgaS0tICkgcyAqPSBpO1xuXHRcdFx0XHRyZXR1cm4gYVsgbiBdID0gcztcblxuXHRcdFx0fTtcblxuXHRcdH0gKSgpLFxuXG5cdFx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKCBwMCwgcDEsIHAyLCBwMywgdCApIHtcblxuXHRcdFx0dmFyIHYwID0gKCBwMiAtIHAwICkgKiAwLjUsIHYxID0gKCBwMyAtIHAxICkgKiAwLjUsIHQyID0gdCAqIHQsIHQzID0gdCAqIHQyO1xuXHRcdFx0cmV0dXJuICggMiAqIHAxIC0gMiAqIHAyICsgdjAgKyB2MSApICogdDMgKyAoIC0gMyAqIHAxICsgMyAqIHAyIC0gMiAqIHYwIC0gdjEgKSAqIHQyICsgdjAgKiB0ICsgcDE7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cz1UV0VFTjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUGl4aUFwcCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9QaXhpQXBwXCIpO1xudmFyIE5ldFBva2VyQ2xpZW50VmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L05ldFBva2VyQ2xpZW50Vmlld1wiKTtcbnZhciBOZXRQb2tlckNsaWVudENvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi4vY29udHJvbGxlci9OZXRQb2tlckNsaWVudENvbnRyb2xsZXJcIik7XG52YXIgTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb25cIik7XG52YXIgUHJvdG9Db25uZWN0aW9uID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL1Byb3RvQ29ubmVjdGlvblwiKTtcbnZhciBMb2FkaW5nU2NyZWVuID0gcmVxdWlyZShcIi4uL3ZpZXcvTG9hZGluZ1NjcmVlblwiKTtcbnZhciBTdGF0ZUNvbXBsZXRlTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9TdGF0ZUNvbXBsZXRlTWVzc2FnZVwiKTtcbnZhciBJbml0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Jbml0TWVzc2FnZVwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcblxuLyoqXG4gKiBNYWluIGVudHJ5IHBvaW50IGZvciBjbGllbnQuXG4gKiBAY2xhc3MgTmV0UG9rZXJDbGllbnRcbiAqL1xuZnVuY3Rpb24gTmV0UG9rZXJDbGllbnQoZG9tSWQpIHtcblx0UGl4aUFwcC5jYWxsKHRoaXMsIGRvbUlkLCA5NjAsIDcyMCk7XG5cblx0dGhpcy5sb2FkaW5nU2NyZWVuID0gbmV3IExvYWRpbmdTY3JlZW4oKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmxvYWRpbmdTY3JlZW4pO1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIkxPQURJTkdcIik7XG5cblx0dGhpcy51cmwgPSBudWxsO1xuXG5cdHRoaXMudGFibGVJZD1udWxsO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE5ldFBva2VyQ2xpZW50LCBQaXhpQXBwKTtcblxuLyoqXG4gKiBTZXQgdXJsLlxuICogQG1ldGhvZCBzZXRVcmxcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFVybCA9IGZ1bmN0aW9uKHVybCkge1xuXHR0aGlzLnVybCA9IHVybDtcbn1cblxuLyoqXG4gKiBTZXQgdGFibGUgaWQuXG4gKiBAbWV0aG9kIHNldFRhYmxlSWRcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFRhYmxlSWQgPSBmdW5jdGlvbih0YWJsZUlkKSB7XG5cdHRoaXMudGFibGVJZCA9IHRhYmxlSWQ7XG59XG5cbi8qKlxuICogU2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2Qgc2V0Vmlld0Nhc2VcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFZpZXdDYXNlID0gZnVuY3Rpb24odmlld0Nhc2UpIHtcblx0Y29uc29sZS5sb2coXCIqKioqKiogcnVubmluZyB2aWV3IGNhc2U6IFwiK3ZpZXdDYXNlKTtcblx0dGhpcy52aWV3Q2FzZT12aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXQgdG9rZW4uXG4gKiBAbWV0aG9kIHNldFRva2VuXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5zZXRUb2tlbiA9IGZ1bmN0aW9uKHRva2VuKSB7XG5cdHRoaXMudG9rZW4gPSB0b2tlbjtcbn1cblxuLyoqXG4gKiBTZXQgdG9rZW4uXG4gKiBAbWV0aG9kIHNldFNraW5cbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFNraW4gPSBmdW5jdGlvbihza2luKSB7XG5cdFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4gPSBza2luO1xufVxuXG4vKipcbiAqIFJ1bi5cbiAqIEBtZXRob2QgcnVuXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblxuXHR2YXIgYXNzZXRzID0gW1xuXHRcdFwidGFibGUucG5nXCIsXG5cdFx0XCJjb21wb25lbnRzLnBuZ1wiXG5cdF07XG5cdGlmKChSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luICE9IG51bGwpICYmIChSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luLnRleHR1cmVzICE9IG51bGwpKSB7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4udGV4dHVyZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGFzc2V0cy5wdXNoKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4udGV4dHVyZXNbaV0uZmlsZSk7XG5cdFx0XHRjb25zb2xlLmxvZyhcImFkZCB0byBsb2FkIGxpc3Q6IFwiICsgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlc1tpXS5maWxlKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLmFzc2V0TG9hZGVyID0gbmV3IFBJWEkuQXNzZXRMb2FkZXIoYXNzZXRzKTtcblx0dGhpcy5hc3NldExvYWRlci5hZGRFdmVudExpc3RlbmVyKFwib25Db21wbGV0ZVwiLCB0aGlzLm9uQXNzZXRMb2FkZXJDb21wbGV0ZS5iaW5kKHRoaXMpKTtcblx0dGhpcy5hc3NldExvYWRlci5sb2FkKCk7XG59XG5cbi8qKlxuICogQXNzZXRzIGxvYWRlZCwgY29ubmVjdC5cbiAqIEBtZXRob2Qgb25Bc3NldExvYWRlckNvbXBsZXRlXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUub25Bc3NldExvYWRlckNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwiYXNzZXQgbG9hZGVyIGNvbXBsZXRlLi4uXCIpO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3ID0gbmV3IE5ldFBva2VyQ2xpZW50VmlldygpO1xuXHR0aGlzLmFkZENoaWxkQXQodGhpcy5uZXRQb2tlckNsaWVudFZpZXcsIDApO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRDb250cm9sbGVyID0gbmV3IE5ldFBva2VyQ2xpZW50Q29udHJvbGxlcih0aGlzLm5ldFBva2VyQ2xpZW50Vmlldyk7XG5cdHRoaXMuY29ubmVjdCgpO1xufVxuXG4vKipcbiAqIENvbm5lY3QuXG4gKiBAbWV0aG9kIGNvbm5lY3RcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51cmwpIHtcblx0XHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIk5FRUQgVVJMXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRoaXMuY29ubmVjdGlvbiA9IG5ldyBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbigpO1xuXHR0aGlzLmNvbm5lY3Rpb24ub24oTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ09OTkVDVCwgdGhpcy5vbkNvbm5lY3Rpb25Db25uZWN0LCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLm9uKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNMT1NFLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlLCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLmNvbm5lY3QodGhpcy51cmwpO1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIkNPTk5FQ1RJTkdcIik7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uQ29ubmVjdFxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNvbm5lY3QgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCIqKioqIGNvbm5lY3RlZFwiKTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24gPSBuZXcgUHJvdG9Db25uZWN0aW9uKHRoaXMuY29ubmVjdGlvbik7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLmFkZE1lc3NhZ2VIYW5kbGVyKFN0YXRlQ29tcGxldGVNZXNzYWdlLCB0aGlzLm9uU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5zZXRQcm90b0Nvbm5lY3Rpb24odGhpcy5wcm90b0Nvbm5lY3Rpb24pO1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIklOSVRJQUxJWklOR1wiKTtcblxuXHR2YXIgaW5pdE1lc3NhZ2U9bmV3IEluaXRNZXNzYWdlKHRoaXMudG9rZW4pO1xuXG5cdGlmICh0aGlzLnRhYmxlSWQpXG5cdFx0aW5pdE1lc3NhZ2Uuc2V0VGFibGVJZCh0aGlzLnRhYmxlSWQpO1xuXG5cdGlmICh0aGlzLnZpZXdDYXNlKVxuXHRcdGluaXRNZXNzYWdlLnNldFZpZXdDYXNlKHRoaXMudmlld0Nhc2UpO1xuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLnNlbmQoaW5pdE1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIFN0YXRlIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvblN0YXRlQ29tcGxldGVNZXNzYWdlXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUub25TdGF0ZUNvbXBsZXRlTWVzc2FnZT1mdW5jdGlvbigpIHtcblx0dGhpcy5sb2FkaW5nU2NyZWVuLmhpZGUoKTtcbn1cblxuLyoqXG4gKiBDb25uZWN0aW9uIGNsb3NlZC5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uQ2xvc2VcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcIioqKiogY29ubmVjdGlvbiBjbG9zZWRcIik7XG5cdGlmICh0aGlzLnByb3RvQ29ubmVjdGlvbilcblx0XHR0aGlzLnByb3RvQ29ubmVjdGlvbi5yZW1vdmVNZXNzYWdlSGFuZGxlcihTdGF0ZUNvbXBsZXRlTWVzc2FnZSwgdGhpcy5vblN0YXRlQ29tcGxldGVNZXNzYWdlLCB0aGlzKTtcblxuXHR0aGlzLnByb3RvQ29ubmVjdGlvbiA9IG51bGw7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnNldFByb3RvQ29ubmVjdGlvbihudWxsKTtcblx0dGhpcy5sb2FkaW5nU2NyZWVuLnNob3coXCJDT05ORUNUSU9OIEVSUk9SXCIpO1xuXHRzZXRUaW1lb3V0KHRoaXMuY29ubmVjdC5iaW5kKHRoaXMpLCAzMDAwKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOZXRQb2tlckNsaWVudDsiLCJcblxuLyoqXG4gKiBDbGllbnQgcmVzb3VyY2VzXG4gKiBAY2xhc3MgU2V0dGluZ3MuXG4gKi9cbiBmdW5jdGlvbiBTZXR0aW5ncygpIHtcbiBcdHRoaXMucGxheUFuaW1hdGlvbnMgPSB0cnVlO1xuIH1cblxuXG4vKipcbiAqIEdldCBzaW5nbGV0b24gaW5zdGFuY2UuXG4gKiBAbWV0aG9kIGdldEluc3RhbmNlXG4gKi9cblNldHRpbmdzLmdldEluc3RhbmNlID0gZnVuY3Rpb24oKSB7XG5cdGlmICghU2V0dGluZ3MuaW5zdGFuY2UpXG5cdFx0U2V0dGluZ3MuaW5zdGFuY2UgPSBuZXcgU2V0dGluZ3MoKTtcblxuXHRyZXR1cm4gU2V0dGluZ3MuaW5zdGFuY2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3M7IiwidmFyIFNob3dEaWFsb2dNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlXCIpO1xyXG52YXIgQnV0dG9uc01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQnV0dG9uc01lc3NhZ2VcIik7XHJcbnZhciBDaGF0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9DaGF0TWVzc2FnZVwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb250cm9sIHVzZXIgaW50ZXJmYWNlLlxyXG4gKiBAY2xhc3MgSW50ZXJmYWNlQ29udHJvbGxlclxyXG4gKi9cclxuZnVuY3Rpb24gSW50ZXJmYWNlQ29udHJvbGxlcihtZXNzYWdlU2VxdWVuY2VyLCB2aWV3KSB7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyID0gbWVzc2FnZVNlcXVlbmNlcjtcclxuXHR0aGlzLnZpZXcgPSB2aWV3O1xyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQnV0dG9uc01lc3NhZ2UuVFlQRSwgdGhpcy5vbkJ1dHRvbnNNZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoU2hvd0RpYWxvZ01lc3NhZ2UuVFlQRSwgdGhpcy5vblNob3dEaWFsb2dNZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQ2hhdE1lc3NhZ2UuVFlQRSwgdGhpcy5vbkNoYXQsIHRoaXMpO1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIEJ1dHRvbnMgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkJ1dHRvbnNNZXNzYWdlXHJcbiAqL1xyXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vbkJ1dHRvbnNNZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBidXR0b25zVmlldyA9IHRoaXMudmlldy5nZXRCdXR0b25zVmlldygpO1xyXG5cclxuXHRidXR0b25zVmlldy5zZXRCdXR0b25zKG0uZ2V0QnV0dG9ucygpLCBtLnNsaWRlckJ1dHRvbkluZGV4LCBwYXJzZUludChtLm1pbiwgMTApLCBwYXJzZUludChtLm1heCwgMTApKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgZGlhbG9nLlxyXG4gKiBAbWV0aG9kIG9uU2hvd0RpYWxvZ01lc3NhZ2VcclxuICovXHJcbkludGVyZmFjZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uU2hvd0RpYWxvZ01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIGRpYWxvZ1ZpZXcgPSB0aGlzLnZpZXcuZ2V0RGlhbG9nVmlldygpO1xyXG5cclxuXHRkaWFsb2dWaWV3LnNob3cobS5nZXRUZXh0KCksIG0uZ2V0QnV0dG9ucygpLCBtLmdldERlZmF1bHRWYWx1ZSgpKTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBPbiBjaGF0IG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25DaGF0XHJcbiAqL1xyXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vbkNoYXQgPSBmdW5jdGlvbihtKSB7XHJcblx0dGhpcy52aWV3LmNoYXRWaWV3LmFkZFRleHQobS51c2VyLCBtLnRleHQpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZUNvbnRyb2xsZXI7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBTZXF1ZW5jZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2VxdWVuY2VyXCIpO1xuXG4vKipcbiAqIEFuIGl0ZW0gaW4gYSBtZXNzYWdlIHNlcXVlbmNlLlxuICogQGNsYXNzIE1lc3NhZ2VTZXF1ZW5jZUl0ZW1cbiAqL1xuZnVuY3Rpb24gTWVzc2FnZVNlcXVlbmNlSXRlbShtZXNzYWdlKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHR0aGlzLndhaXRUYXJnZXQgPSBudWxsO1xuXHR0aGlzLndhaXRFdmVudCA9IG51bGw7XG5cdHRoaXMud2FpdENsb3N1cmUgPSBudWxsO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE1lc3NhZ2VTZXF1ZW5jZUl0ZW0sIEV2ZW50RGlzcGF0Y2hlcik7XG5cbi8qKlxuICogR2V0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIGdldE1lc3NhZ2VcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUuZ2V0TWVzc2FnZSA9IGZ1bmN0aW9uKCkge1xuXHQvL2NvbnNvbGUubG9nKFwiZ2V0dGluZzogXCIgKyB0aGlzLm1lc3NhZ2UudHlwZSk7XG5cblx0cmV0dXJuIHRoaXMubWVzc2FnZTtcbn1cblxuLyoqXG4gKiBBcmUgd2Ugd2FpdGluZyBmb3IgYW4gZXZlbnQ/XG4gKiBAbWV0aG9kIGlzV2FpdGluZ1xuICovXG5NZXNzYWdlU2VxdWVuY2VJdGVtLnByb3RvdHlwZS5pc1dhaXRpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMud2FpdEV2ZW50ICE9IG51bGw7XG59XG5cbi8qKlxuICogTm90aWZ5IGNvbXBsZXRlLlxuICogQG1ldGhvZCBub3RpZnlDb21wbGV0ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VJdGVtLnByb3RvdHlwZS5ub3RpZnlDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnRyaWdnZXIoU2VxdWVuY2VyLkNPTVBMRVRFKTtcbn1cblxuLyoqXG4gKiBXYWl0IGZvciBldmVudCBiZWZvcmUgcHJvY2Vzc2luZyBuZXh0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHdhaXRGb3JcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUud2FpdEZvciA9IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnQpIHtcblx0dGhpcy53YWl0VGFyZ2V0ID0gdGFyZ2V0O1xuXHR0aGlzLndhaXRFdmVudCA9IGV2ZW50O1xuXHR0aGlzLndhaXRDbG9zdXJlID0gdGhpcy5vblRhcmdldENvbXBsZXRlLmJpbmQodGhpcyk7XG5cblx0dGhpcy53YWl0VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodGhpcy53YWl0RXZlbnQsIHRoaXMud2FpdENsb3N1cmUpO1xufVxuXG4vKipcbiAqIFdhaXQgdGFyZ2V0IGNvbXBsZXRlLlxuICogQG1ldGhvZCBvblRhcmdldENvbXBsZXRlXG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VJdGVtLnByb3RvdHlwZS5vblRhcmdldENvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdC8vY29uc29sZS5sb2coXCJ0YXJnZXQgaXMgY29tcGxldGVcIik7XG5cdHRoaXMud2FpdFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMud2FpdEV2ZW50LCB0aGlzLndhaXRDbG9zdXJlKTtcblx0dGhpcy5ub3RpZnlDb21wbGV0ZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VTZXF1ZW5jZUl0ZW07IiwidmFyIFNlcXVlbmNlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9TZXF1ZW5jZXJcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBNZXNzYWdlU2VxdWVuY2VJdGVtID0gcmVxdWlyZShcIi4vTWVzc2FnZVNlcXVlbmNlSXRlbVwiKTtcblxuLyoqXG4gKiBTZXF1ZW5jZXMgbWVzc2FnZXMuXG4gKiBAY2xhc3MgTWVzc2FnZVNlcXVlbmNlclxuICovXG5mdW5jdGlvbiBNZXNzYWdlU2VxdWVuY2VyKCkge1xuXHR0aGlzLnNlcXVlbmNlciA9IG5ldyBTZXF1ZW5jZXIoKTtcblx0dGhpcy5tZXNzYWdlRGlzcGF0Y2hlciA9IG5ldyBFdmVudERpc3BhdGNoZXIoKTtcblx0dGhpcy5jdXJyZW50SXRlbSA9IG51bGw7XG59XG5cbi8qKlxuICogQWRkIGEgbWVzc2FnZSBmb3IgcHJvY2VzaW5nLlxuICogQG1ldGhvZCBlbnF1ZXVlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZXIucHJvdG90eXBlLmVucXVldWUgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG5cdGlmICghbWVzc2FnZS50eXBlKVxuXHRcdHRocm93IFwiTWVzc2FnZSBkb2Vzbid0IGhhdmUgYSB0eXBlXCI7XG5cblx0dmFyIHNlcXVlbmNlSXRlbSA9IG5ldyBNZXNzYWdlU2VxdWVuY2VJdGVtKG1lc3NhZ2UpO1xuXG5cdHNlcXVlbmNlSXRlbS5vbihTZXF1ZW5jZXIuU1RBUlQsIHRoaXMub25TZXF1ZW5jZUl0ZW1TdGFydCwgdGhpcyk7XG5cblx0dGhpcy5zZXF1ZW5jZXIuZW5xdWV1ZShzZXF1ZW5jZUl0ZW0pO1xufVxuXG4vKipcbiAqIFNlcXVlbmNlIGl0ZW0gc3RhcnQuXG4gKiBAbWV0aG9kIG9uU2VxdWVuY2VJdGVtU3RhcnRcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZXIucHJvdG90eXBlLm9uU2VxdWVuY2VJdGVtU3RhcnQgPSBmdW5jdGlvbihlKSB7XG5cdC8vY29uc29sZS5sb2coXCJzdGFydGluZyBpdGVtLi4uXCIpO1xuXHR2YXIgaXRlbSA9IGUudGFyZ2V0O1xuXG5cdGl0ZW0ub2ZmKFNlcXVlbmNlci5TVEFSVCwgdGhpcy5vblNlcXVlbmNlSXRlbVN0YXJ0LCB0aGlzKTtcblxuXHR0aGlzLmN1cnJlbnRJdGVtID0gaXRlbTtcblx0dGhpcy5tZXNzYWdlRGlzcGF0Y2hlci50cmlnZ2VyKGl0ZW0uZ2V0TWVzc2FnZSgpKTtcblx0dGhpcy5jdXJyZW50SXRlbSA9IG51bGw7XG5cblx0aWYgKCFpdGVtLmlzV2FpdGluZygpKVxuXHRcdGl0ZW0ubm90aWZ5Q29tcGxldGUoKTtcbn1cblxuLyoqXG4gKiBBZGQgbWVzc2FnZSBoYW5kbGVyLlxuICogQG1ldGhvZCBhZGRNZXNzYWdlSGFuZGxlclxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS5hZGRNZXNzYWdlSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSkge1xuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLm9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSk7XG59XG5cbi8qKlxuICogV2FpdCBmb3IgdGhlIHRhcmdldCB0byBkaXNwYXRjaCBhbiBldmVudCBiZWZvcmUgY29udGludWluZyB0b1xuICogcHJvY2VzcyB0aGUgbWVzc2FnZXMgaW4gdGhlIHF1ZS5cbiAqIEBtZXRob2Qgd2FpdEZvclxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS53YWl0Rm9yID0gZnVuY3Rpb24odGFyZ2V0LCBldmVudCkge1xuXHRpZiAoIXRoaXMuY3VycmVudEl0ZW0pXG5cdFx0dGhyb3cgXCJOb3Qgd2FpdGluZyBmb3IgZXZlbnRcIjtcblxuXHR0aGlzLmN1cnJlbnRJdGVtLndhaXRGb3IodGFyZ2V0LCBldmVudCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNlcXVlbmNlcjsiLCJ2YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBNZXNzYWdlU2VxdWVuY2VyID0gcmVxdWlyZShcIi4vTWVzc2FnZVNlcXVlbmNlclwiKTtcbnZhciBQcm90b0Nvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vUHJvdG9Db25uZWN0aW9uXCIpO1xudmFyIEJ1dHRvbnNWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvQnV0dG9uc1ZpZXdcIik7XG52YXIgQnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0J1dHRvbkNsaWNrTWVzc2FnZVwiKTtcbnZhciBTZWF0Q2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1NlYXRDbGlja01lc3NhZ2VcIik7XG52YXIgTmV0UG9rZXJDbGllbnRWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvTmV0UG9rZXJDbGllbnRWaWV3XCIpO1xudmFyIERpYWxvZ1ZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9EaWFsb2dWaWV3XCIpO1xudmFyIFNldHRpbmdzVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L1NldHRpbmdzVmlld1wiKTtcbnZhciBUYWJsZUNvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi9UYWJsZUNvbnRyb2xsZXJcIik7XG52YXIgSW50ZXJmYWNlQ29udHJvbGxlciA9IHJlcXVpcmUoXCIuL0ludGVyZmFjZUNvbnRyb2xsZXJcIik7XG52YXIgQ2hhdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ2hhdE1lc3NhZ2VcIik7XG52YXIgQnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9kYXRhL0J1dHRvbkRhdGFcIik7XG5cbi8qKlxuICogTWFpbiBjb250cm9sbGVyXG4gKiBAY2xhc3MgTmV0UG9rZXJDbGllbnRDb250cm9sbGVyXG4gKi9cbmZ1bmN0aW9uIE5ldFBva2VyQ2xpZW50Q29udHJvbGxlcih2aWV3KSB7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3ID0gdmlldztcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24gPSBudWxsO1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIgPSBuZXcgTWVzc2FnZVNlcXVlbmNlcigpO1xuXG5cdHRoaXMudGFibGVDb250cm9sbGVyID0gbmV3IFRhYmxlQ29udHJvbGxlcih0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIsIHRoaXMubmV0UG9rZXJDbGllbnRWaWV3KTtcblx0dGhpcy5pbnRlcmZhY2VDb250cm9sbGVyID0gbmV3IEludGVyZmFjZUNvbnRyb2xsZXIodGhpcy5tZXNzYWdlU2VxdWVuY2VyLCB0aGlzLm5ldFBva2VyQ2xpZW50Vmlldyk7XG5cblx0Y29uc29sZS5sb2codGhpcy5uZXRQb2tlckNsaWVudFZpZXcuZ2V0RGlhbG9nVmlldygpKTtcblxuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5nZXRCdXR0b25zVmlldygpLm9uKEJ1dHRvbnNWaWV3LkJVVFRPTl9DTElDSywgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuZ2V0RGlhbG9nVmlldygpLm9uKERpYWxvZ1ZpZXcuQlVUVE9OX0NMSUNLLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5vbihOZXRQb2tlckNsaWVudFZpZXcuU0VBVF9DTElDSywgdGhpcy5vblNlYXRDbGljaywgdGhpcyk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuY2hhdFZpZXcuYWRkRXZlbnRMaXN0ZW5lcihcImNoYXRcIiwgdGhpcy5vblZpZXdDaGF0LCB0aGlzKTtcblxuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5zZXR0aW5nc1ZpZXcuYWRkRXZlbnRMaXN0ZW5lcihTZXR0aW5nc1ZpZXcuQlVZX0NISVBTX0NMSUNLLCB0aGlzLm9uQnV5Q2hpcHNCdXR0b25DbGljaywgdGhpcyk7XG59XG5cblxuLyoqXG4gKiBTZXQgY29ubmVjdGlvbi5cbiAqIEBtZXRob2Qgc2V0UHJvdG9Db25uZWN0aW9uXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUuc2V0UHJvdG9Db25uZWN0aW9uID0gZnVuY3Rpb24ocHJvdG9Db25uZWN0aW9uKSB7XG5cdGlmICh0aGlzLnByb3RvQ29ubmVjdGlvbikge1xuXHRcdHRoaXMucHJvdG9Db25uZWN0aW9uLm9mZihQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSwgdGhpcy5vblByb3RvQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR9XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24gPSBwcm90b0Nvbm5lY3Rpb247XG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmNsZWFyKCk7XG5cblx0aWYgKHRoaXMucHJvdG9Db25uZWN0aW9uKSB7XG5cdFx0dGhpcy5wcm90b0Nvbm5lY3Rpb24ub24oUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UsIHRoaXMub25Qcm90b0Nvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0fVxufVxuXG4vKipcbiAqIEluY29taW5nIG1lc3NhZ2UuXG4gKiBFbnF1ZXVlIGZvciBwcm9jZXNzaW5nLlxuICrCoEBtZXRob2Qgb25Qcm90b0Nvbm5lY3Rpb25NZXNzYWdlXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmVucXVldWUoZS5tZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBCdXR0b24gY2xpY2suXG4gKiBUaGlzIGZ1bmN0aW9uIGhhbmRsZXMgY2xpY2tzIGZyb20gYm90aCB0aGUgZGlhbG9nIGFuZCBnYW1lIHBsYXkgYnV0dG9ucy5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vbkJ1dHRvbkNsaWNrID0gZnVuY3Rpb24oZSkge1xuXHRpZiAoIXRoaXMucHJvdG9Db25uZWN0aW9uKVxuXHRcdHJldHVybjtcblxuXHRjb25zb2xlLmxvZyhcImJ1dHRvbiBjbGljaywgdj1cIiArIGUudmFsdWUpO1xuXG5cdHZhciBtID0gbmV3IEJ1dHRvbkNsaWNrTWVzc2FnZShlLmJ1dHRvbiwgZS52YWx1ZSk7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLnNlbmQobSk7XG59XG5cbi8qKlxuICogU2VhdCBjbGljay5cbiAqIEBtZXRob2Qgb25TZWF0Q2xpY2tcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25TZWF0Q2xpY2sgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBtID0gbmV3IFNlYXRDbGlja01lc3NhZ2UoZS5zZWF0SW5kZXgpO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKG0pO1xufVxuXG4vKipcbiAqIE9uIHNlbmQgY2hhdCBtZXNzYWdlLlxuICogQG1ldGhvZCBvblZpZXdDaGF0XG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25WaWV3Q2hhdCA9IGZ1bmN0aW9uKHRleHQpIHtcblx0dmFyIG1lc3NhZ2UgPSBuZXcgQ2hhdE1lc3NhZ2UoKTtcblx0bWVzc2FnZS51c2VyID0gXCJcIjtcblx0bWVzc2FnZS50ZXh0ID0gdGV4dDtcblxuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIE9uIGJ1eSBjaGlwcyBidXR0b24gY2xpY2suXG4gKiBAbWV0aG9kIG9uQnV5Q2hpcHNCdXR0b25DbGlja1xuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uQnV5Q2hpcHNCdXR0b25DbGljayA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcImJ1eSBjaGlwcyBjbGlja1wiKTtcblxuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKG5ldyBCdXR0b25DbGlja01lc3NhZ2UoQnV0dG9uRGF0YS5CVVlfQ0hJUFMpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOZXRQb2tlckNsaWVudENvbnRyb2xsZXI7IiwidmFyIFNlYXRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9TZWF0SW5mb01lc3NhZ2VcIik7XHJcbnZhciBDb21tdW5pdHlDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ29tbXVuaXR5Q2FyZHNNZXNzYWdlXCIpO1xyXG52YXIgUG9ja2V0Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZVwiKTtcclxudmFyIERlYWxlckJ1dHRvbk1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZVwiKTtcclxudmFyIEJldE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQmV0TWVzc2FnZVwiKTtcclxudmFyIEJldHNUb1BvdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQmV0c1RvUG90TWVzc2FnZVwiKTtcclxudmFyIFBvdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvUG90TWVzc2FnZVwiKTtcclxudmFyIFRpbWVyTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9UaW1lck1lc3NhZ2VcIik7XHJcbnZhciBBY3Rpb25NZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0FjdGlvbk1lc3NhZ2VcIik7XHJcbnZhciBGb2xkQ2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0ZvbGRDYXJkc01lc3NhZ2VcIik7XHJcbnZhciBEZWxheU1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvRGVsYXlNZXNzYWdlXCIpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcclxudmFyIENsZWFyTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9DbGVhck1lc3NhZ2VcIik7XHJcbnZhciBQYXlPdXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1BheU91dE1lc3NhZ2VcIik7XHJcblxyXG4vKipcclxuICogQ29udHJvbCB0aGUgdGFibGVcclxuICogQGNsYXNzIFRhYmxlQ29udHJvbGxlclxyXG4gKi9cclxuZnVuY3Rpb24gVGFibGVDb250cm9sbGVyKG1lc3NhZ2VTZXF1ZW5jZXIsIHZpZXcpIHtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIgPSBtZXNzYWdlU2VxdWVuY2VyO1xyXG5cdHRoaXMudmlldyA9IHZpZXc7XHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihTZWF0SW5mb01lc3NhZ2UuVFlQRSwgdGhpcy5vblNlYXRJbmZvTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKENvbW11bml0eUNhcmRzTWVzc2FnZS5UWVBFLCB0aGlzLm9uQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoUG9ja2V0Q2FyZHNNZXNzYWdlLlRZUEUsIHRoaXMub25Qb2NrZXRDYXJkc01lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihEZWFsZXJCdXR0b25NZXNzYWdlLlRZUEUsIHRoaXMub25EZWFsZXJCdXR0b25NZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQmV0TWVzc2FnZS5UWVBFLCB0aGlzLm9uQmV0TWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEJldHNUb1BvdE1lc3NhZ2UuVFlQRSwgdGhpcy5vbkJldHNUb1BvdCwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFBvdE1lc3NhZ2UuVFlQRSwgdGhpcy5vblBvdCwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFRpbWVyTWVzc2FnZS5UWVBFLCB0aGlzLm9uVGltZXIsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihBY3Rpb25NZXNzYWdlLlRZUEUsIHRoaXMub25BY3Rpb24sIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihGb2xkQ2FyZHNNZXNzYWdlLlRZUEUsIHRoaXMub25Gb2xkQ2FyZHMsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihEZWxheU1lc3NhZ2UuVFlQRSwgdGhpcy5vbkRlbGF5LCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQ2xlYXJNZXNzYWdlLlRZUEUsIHRoaXMub25DbGVhciwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFBheU91dE1lc3NhZ2UuVFlQRSwgdGhpcy5vblBheU91dCwgdGhpcyk7XHJcbn1cclxuRXZlbnREaXNwYXRjaGVyLmluaXQoVGFibGVDb250cm9sbGVyKTtcclxuXHJcbi8qKlxyXG4gKiBTZWF0IGluZm8gbWVzc2FnZS5cclxuICogQG1ldGhvZCBvblNlYXRJbmZvTWVzc2FnZVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblNlYXRJbmZvTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgc2VhdFZpZXcgPSB0aGlzLnZpZXcuZ2V0U2VhdFZpZXdCeUluZGV4KG0uZ2V0U2VhdEluZGV4KCkpO1xyXG5cclxuXHRzZWF0Vmlldy5zZXROYW1lKG0uZ2V0TmFtZSgpKTtcclxuXHRzZWF0Vmlldy5zZXRDaGlwcyhtLmdldENoaXBzKCkpO1xyXG5cdHNlYXRWaWV3LnNldEFjdGl2ZShtLmlzQWN0aXZlKCkpO1xyXG5cdHNlYXRWaWV3LnNldFNpdG91dChtLmlzU2l0b3V0KCkpO1xyXG59XHJcblxyXG4vKipcclxuICogU2VhdCBpbmZvIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25Db21tdW5pdHlDYXJkc01lc3NhZ2VcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Db21tdW5pdHlDYXJkc01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIGk7XHJcblxyXG5cdGNvbnNvbGUubG9nKFwiZ290IGNvbW11bml0eSBjYXJkcyFcIik7XHJcblx0Y29uc29sZS5sb2cobSk7XHJcblxyXG5cdGZvciAoaSA9IDA7IGkgPCBtLmdldENhcmRzKCkubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBjYXJkRGF0YSA9IG0uZ2V0Q2FyZHMoKVtpXTtcclxuXHRcdHZhciBjYXJkVmlldyA9IHRoaXMudmlldy5nZXRDb21tdW5pdHlDYXJkcygpW20uZ2V0Rmlyc3RJbmRleCgpICsgaV07XHJcblxyXG5cdFx0Y2FyZFZpZXcuc2V0Q2FyZERhdGEoY2FyZERhdGEpO1xyXG5cdFx0Y2FyZFZpZXcuc2hvdyhtLmFuaW1hdGUsIGkgKiA1MDApO1xyXG5cdH1cclxuXHRpZiAobS5nZXRDYXJkcygpLmxlbmd0aCA+IDApIHtcclxuXHRcdHZhciBjYXJkRGF0YSA9IG0uZ2V0Q2FyZHMoKVttLmdldENhcmRzKCkubGVuZ3RoIC0gMV07XHJcblx0XHR2YXIgY2FyZFZpZXcgPSB0aGlzLnZpZXcuZ2V0Q29tbXVuaXR5Q2FyZHMoKVttLmdldEZpcnN0SW5kZXgoKSArIG0uZ2V0Q2FyZHMoKS5sZW5ndGggLSAxXTtcclxuXHRcdGlmKG0uYW5pbWF0ZSlcclxuXHRcdFx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IoY2FyZFZpZXcsIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQb2NrZXQgY2FyZHMgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvblBvY2tldENhcmRzTWVzc2FnZVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblBvY2tldENhcmRzTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgc2VhdFZpZXcgPSB0aGlzLnZpZXcuZ2V0U2VhdFZpZXdCeUluZGV4KG0uZ2V0U2VhdEluZGV4KCkpO1xyXG5cdHZhciBpO1xyXG5cclxuXHRmb3IgKGkgPSAwOyBpIDwgbS5nZXRDYXJkcygpLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR2YXIgY2FyZERhdGEgPSBtLmdldENhcmRzKClbaV07XHJcblx0XHR2YXIgY2FyZFZpZXcgPSBzZWF0Vmlldy5nZXRQb2NrZXRDYXJkcygpW20uZ2V0Rmlyc3RJbmRleCgpICsgaV07XHJcblxyXG5cdFx0aWYobS5hbmltYXRlKVxyXG5cdFx0XHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcihjYXJkVmlldywgXCJhbmltYXRpb25Eb25lXCIpO1xyXG5cdFx0Y2FyZFZpZXcuc2V0Q2FyZERhdGEoY2FyZERhdGEpO1xyXG5cdFx0Y2FyZFZpZXcuc2hvdyhtLmFuaW1hdGUsIDEwKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWFsZXIgYnV0dG9uIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25EZWFsZXJCdXR0b25NZXNzYWdlXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uRGVhbGVyQnV0dG9uTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgZGVhbGVyQnV0dG9uVmlldyA9IHRoaXMudmlldy5nZXREZWFsZXJCdXR0b25WaWV3KCk7XHJcblxyXG5cdGlmIChtLnNlYXRJbmRleCA8IDApIHtcclxuXHRcdGRlYWxlckJ1dHRvblZpZXcuaGlkZSgpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcihkZWFsZXJCdXR0b25WaWV3LCBcImFuaW1hdGlvbkRvbmVcIik7XHJcblx0XHRkZWFsZXJCdXR0b25WaWV3LnNob3cobS5nZXRTZWF0SW5kZXgoKSwgbS5nZXRBbmltYXRlKCkpO1xyXG5cdH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBCZXQgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkJldE1lc3NhZ2VcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25CZXRNZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLmJldENoaXBzLnNldFZhbHVlKG0udmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJldHMgdG8gcG90LlxyXG4gKiBAbWV0aG9kIG9uQmV0c1RvUG90XHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQmV0c1RvUG90ID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBoYXZlQ2hpcHMgPSBmYWxzZTtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxyXG5cdFx0aWYgKHRoaXMudmlldy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMudmFsdWUgPiAwKVxyXG5cdFx0XHRoYXZlQ2hpcHMgPSB0cnVlO1xyXG5cclxuXHRpZiAoIWhhdmVDaGlwcylcclxuXHRcdHJldHVybjtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxyXG5cdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tpXS5iZXRDaGlwcy5hbmltYXRlSW4oKTtcclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IodGhpcy52aWV3LnNlYXRWaWV3c1swXS5iZXRDaGlwcywgXCJhbmltYXRpb25Eb25lXCIpO1xyXG59XHJcblxyXG4vKipcclxuICogUG90IG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25Qb3RcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Qb3QgPSBmdW5jdGlvbihtKSB7XHJcblx0dGhpcy52aWV3LnBvdFZpZXcuc2V0VmFsdWVzKG0udmFsdWVzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaW1lciBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uVGltZXJcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25UaW1lciA9IGZ1bmN0aW9uKG0pIHtcclxuXHRpZiAobS5zZWF0SW5kZXggPCAwKVxyXG5cdFx0dGhpcy52aWV3LnRpbWVyVmlldy5oaWRlKCk7XHJcblxyXG5cdGVsc2Uge1xyXG5cdFx0dGhpcy52aWV3LnRpbWVyVmlldy5zaG93KG0uc2VhdEluZGV4KTtcclxuXHRcdHRoaXMudmlldy50aW1lclZpZXcuY291bnRkb3duKG0udG90YWxUaW1lLCBtLnRpbWVMZWZ0KTtcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogQWN0aW9uIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25BY3Rpb25cclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25BY3Rpb24gPSBmdW5jdGlvbihtKSB7XHJcblx0aWYgKG0uc2VhdEluZGV4ID09IG51bGwpXHJcblx0XHRtLnNlYXRJbmRleCA9IDA7XHJcblxyXG5cdHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLmFjdGlvbihtLmFjdGlvbik7XHJcbn07XHJcblxyXG4vKipcclxuICogRm9sZCBjYXJkcyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uRm9sZENhcmRzXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uRm9sZENhcmRzID0gZnVuY3Rpb24obSkge1xyXG5cdHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLmZvbGRDYXJkcygpO1xyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XSwgXCJhbmltYXRpb25Eb25lXCIpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlbGF5IG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25EZWxheVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkRlbGF5ID0gZnVuY3Rpb24obSkge1xyXG5cdGNvbnNvbGUubG9nKFwiZGVsYXkgZm9yICA9IFwiICsgbS5kZWxheSk7XHJcblxyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLCBcInRpbWVyRG9uZVwiKTtcclxuXHRzZXRUaW1lb3V0KHRoaXMuZGlzcGF0Y2hFdmVudC5iaW5kKHRoaXMsIFwidGltZXJEb25lXCIpLCBtLmRlbGF5KTtcclxuXHJcbn07XHJcblxyXG4vKipcclxuICogQ2xlYXIgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkNsZWFyXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQ2xlYXIgPSBmdW5jdGlvbihtKSB7XHJcblxyXG5cdHZhciBjb21wb25lbnRzID0gbS5nZXRDb21wb25lbnRzKCk7XHJcblxyXG5cdGZvcih2YXIgaSA9IDA7IGkgPCBjb21wb25lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRzd2l0Y2goY29tcG9uZW50c1tpXSkge1xyXG5cdFx0XHRjYXNlIENsZWFyTWVzc2FnZS5QT1Q6IHtcclxuXHRcdFx0XHR0aGlzLnZpZXcucG90Vmlldy5zZXRWYWx1ZXMoW10pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgQ2xlYXJNZXNzYWdlLkJFVFM6IHtcclxuXHRcdFx0XHRmb3IodmFyIHMgPSAwOyBzIDwgdGhpcy52aWV3LnNlYXRWaWV3cy5sZW5ndGg7IHMrKykge1xyXG5cdFx0XHRcdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tzXS5iZXRDaGlwcy5zZXRWYWx1ZSgwKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSBDbGVhck1lc3NhZ2UuQ0FSRFM6IHtcclxuXHRcdFx0XHRmb3IodmFyIHMgPSAwOyBzIDwgdGhpcy52aWV3LnNlYXRWaWV3cy5sZW5ndGg7IHMrKykge1xyXG5cdFx0XHRcdFx0Zm9yKHZhciBjID0gMDsgYyA8IHRoaXMudmlldy5zZWF0Vmlld3Nbc10ucG9ja2V0Q2FyZHMubGVuZ3RoOyBjKyspIHtcclxuXHRcdFx0XHRcdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tzXS5wb2NrZXRDYXJkc1tjXS5oaWRlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRmb3IodmFyIGMgPSAwOyBjIDwgdGhpcy52aWV3LmNvbW11bml0eUNhcmRzLmxlbmd0aDsgYysrKSB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXcuY29tbXVuaXR5Q2FyZHNbY10uaGlkZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlIENsZWFyTWVzc2FnZS5DSEFUOiB7XHJcblx0XHRcdFx0dGhpcy52aWV3LmNoYXRWaWV3LmNsZWFyKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXkgb3V0IG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25QYXlPdXRcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25QYXlPdXQgPSBmdW5jdGlvbihtKSB7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtLnZhbHVlcy5sZW5ndGg7IGkrKylcclxuXHRcdHRoaXMudmlldy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMuc2V0VmFsdWUobS52YWx1ZXNbaV0pO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXHJcblx0XHR0aGlzLnZpZXcuc2VhdFZpZXdzW2ldLmJldENoaXBzLmFuaW1hdGVPdXQoKTtcclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLndhaXRGb3IodGhpcy52aWV3LnNlYXRWaWV3c1swXS5iZXRDaGlwcywgXCJhbmltYXRpb25Eb25lXCIpO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGFibGVDb250cm9sbGVyOyIsIk5ldFBva2VyQ2xpZW50ID0gcmVxdWlyZShcIi4vYXBwL05ldFBva2VyQ2xpZW50XCIpO1xuLy92YXIgbmV0UG9rZXJDbGllbnQgPSBuZXcgTmV0UG9rZXJDbGllbnQoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHR0ZXh0dXJlczogW1xuXHRcdHtcblx0XHRcdGlkOiBcImNvbXBvbmVudHNUZXh0dXJlXCIsXG5cdFx0XHRmaWxlOiBcImNvbXBvbmVudHMucG5nXCJcblx0XHR9LFxuXHRcdHtcblx0XHRcdGlkOiBcInRhYmxlQmFja2dyb3VuZFwiLFxuXHRcdFx0ZmlsZTogXCJ0YWJsZS5wbmdcIlxuXHRcdH1cblx0XSxcblx0dGFibGVCYWNrZ3JvdW5kOiBcInRhYmxlQmFja2dyb3VuZFwiLFxuXHRkZWZhdWx0VGV4dHVyZTogXCJjb21wb25lbnRzVGV4dHVyZVwiLFxuXG5cdHNlYXRQb3NpdGlvbnM6IFtcblx0XHRbMjg3LCAxMThdLCBbNDgzLCAxMTJdLCBbNjc2LCAxMThdLFxuXHRcdFs4NDQsIDI0N10sIFs4MTcsIDQxM10sIFs2NzYsIDQ5MF0sXG5cdFx0WzQ4MywgNDk1XSwgWzI4NywgNDkwXSwgWzE0MCwgNDEzXSxcblx0XHRbMTIzLCAyNDddXG5cdF0sXG5cblx0dGltZXJCYWNrZ3JvdW5kOiBbMTIxLDIwMCwzMiwzMl0sXG5cblx0c2VhdFBsYXRlOiBbNDAsIDExNiwgMTYwLCA3MF0sXG5cblx0Y29tbXVuaXR5Q2FyZHNQb3NpdGlvbjogWzI1NSwgMTkwXSxcblxuXHRjYXJkRnJhbWU6IFs0OTgsIDI1NiwgODcsIDEyMl0sXG5cdGNhcmRCYWNrOiBbNDAyLCAyNTYsIDg3LCAxMjJdLFxuXG5cdGRpdmlkZXJMaW5lOiBbNTY4LCA3NywgMiwgMTcwXSxcblxuXHRzdWl0U3ltYm9sczogW1xuXHRcdFsyNDYsIDY3LCAxOCwgMTldLFxuXHRcdFsyNjksIDY3LCAxOCwgMTldLFxuXHRcdFsyOTIsIDY3LCAxOCwgMTldLFxuXHRcdFszMTUsIDY3LCAxOCwgMTldXG5cdF0sXG5cblx0ZnJhbWVQbGF0ZTogWzMwMSwgMjYyLCA3NCwgNzZdLFxuXHRiaWdCdXR0b246IFszMywgMjk4LCA5NSwgOTRdLFxuXHRkaWFsb2dCdXR0b246IFszODMsIDQ2MSwgODIsIDQ3XSxcblx0ZGVhbGVyQnV0dG9uOiBbMTk3LCAyMzYsIDQxLCAzNV0sXG5cblx0ZGVhbGVyQnV0dG9uUG9zaXRpb25zOiBbXG5cdFx0WzM0NywgMTMzXSwgWzM5NSwgMTMzXSwgWzU3NCwgMTMzXSxcblx0XHRbNzYyLCAyNjddLCBbNzE1LCAzNThdLCBbNTc0LCA0MzRdLFxuXHRcdFs1MzYsIDQzMl0sIFszNTEsIDQzMl0sIFsxOTMsIDM2Ml0sXG5cdFx0WzE2OCwgMjY2XVxuXHRdLFxuXG5cdHRleHRTY3JvbGxiYXJUcmFjazogWzM3MSw1MCw2MCwxMF0sXG5cdHRleHRTY3JvbGxiYXJUaHVtYjogWzM3MSwzMiw2MCwxMF0sXG5cblxuXHRiZXRBbGlnbjogW1xuXHRcdFwibGVmdFwiLCBcImNlbnRlclwiLCBcInJpZ2h0XCIsXG5cdFx0XCJyaWdodFwiLCBcInJpZ2h0XCIsIFxuXHRcdFwicmlnaHRcIiwgXCJjZW50ZXJcIiwgXCJsZWZ0XCIsXG5cdFx0XCJsZWZ0XCIsIFwibGVmdFwiXG5cdF0sXG5cblx0YmV0UG9zaXRpb25zOiBbXG5cdFx0WzIyNSwxNTBdLCBbNDc4LDE1MF0sIFs3MzAsMTUwXSxcblx0XHRbNzc4LDE5Nl0sIFs3NDgsMzIyXSwgWzcxOSwzNjBdLFxuXHRcdFs0ODEsMzYwXSwgWzIzMiwzNjBdLCBbMTk5LDMyMl0sXG5cdFx0WzE4MSwyMDBdXG5cdF0sXG5cdGNoaXBzOiBbXG5cdFx0WzMwLCAyNSwgNDAsIDMwXSxcblx0XHRbNzAsIDI1LCA0MCwgMzBdLFxuXHRcdFsxMTAsIDI1LCA0MCwgMzBdLFxuXHRcdFsxNTAsIDI1LCA0MCwgMzBdLFxuXHRcdFsxOTAsIDI1LCA0MCwgMzBdXG5cdF0sXG5cdGNoaXBzQ29sb3JzOiBbMHg0MDQwNDAsIDB4MDA4MDAwLCAweDgwODAwMCwgMHgwMDAwODAsIDB4ZmYwMDAwXSxcblx0cG90UG9zaXRpb246IFs0ODUsMzE1XSxcblx0d3JlbmNoSWNvbjogWzQ2MiwzODksMjEsMjFdLFxuXHRjaGF0QmFja2dyb3VuZDogWzMwMSwyNjIsNzQsNzZdLFxuXHRjaGVja2JveEJhY2tncm91bmQ6IFs1MDEsMzkxLDE4LDE4XSxcblx0Y2hlY2tib3hUaWNrOiBbNTI4LDM5MiwyMSwxNl0sXG5cdGJ1dHRvbkJhY2tncm91bmQ6IFs2OCw0NDYsNjQsNjRdLFxuXHRzbGlkZXJCYWNrZ3JvdW5kOiBbMzEzLDQwNywxMjAsMzBdLFxuXHRzbGlkZXJLbm9iOiBbMzE4LDM3NywyOCwyOF0sXG5cdGJpZ0J1dHRvblBvc2l0aW9uOiBbMzY2LDU3NV0sXG5cdHVwQXJyb3c6IFs0ODMsNjQsMTIsOF1cbn0iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Qb2ludFwiKTtcclxudmFyIERlZmF1bHRTa2luID0gcmVxdWlyZShcIi4vRGVmYXVsdFNraW5cIik7XHJcblxyXG4vKipcclxuICogQ2xpZW50IHJlc291cmNlc1xyXG4gKiBAY2xhc3MgUmVzb3VyY2VzLlxyXG4gKi9cclxuZnVuY3Rpb24gUmVzb3VyY2VzKCkge1xyXG5cdHZhciBpO1xyXG5cclxuXHR0aGlzLmRlZmF1bHRTa2luID0gRGVmYXVsdFNraW47XHJcblx0dGhpcy5za2luID0gbnVsbDtcclxuXHJcblxyXG5cdCB0aGlzLkFsaWduID0ge1xyXG5cdCBcdExlZnQ6IFwibGVmdFwiLFxyXG5cdCBcdFJpZ2h0OiBcInJpZ2h0XCIsXHJcblx0IFx0Q2VudGVyOiBcImNlbnRlclwiXHJcblx0IH07XHJcblxyXG5cdCB0aGlzLnRleHR1cmVzID0ge307XHJcbi8qXHJcblx0dGhpcy5jb21wb25lbnRzVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUuZnJvbUltYWdlKFwiY29tcG9uZW50cy5wbmdcIik7XHJcblx0dGhpcy50YWJsZUJhY2tncm91bmQgPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKFwidGFibGUucG5nXCIpO1xyXG5cclxuXHR0aGlzLnNlYXRQb3NpdGlvbnMgPSBbXHJcblx0XHRQb2ludCgyODcsIDExOCksIFBvaW50KDQ4MywgMTEyKSwgUG9pbnQoNjc2LCAxMTgpLFxyXG5cdFx0UG9pbnQoODQ0LCAyNDcpLCBQb2ludCg4MTcsIDQxMyksIFBvaW50KDY3NiwgNDkwKSxcclxuXHRcdFBvaW50KDQ4MywgNDk1KSwgUG9pbnQoMjg3LCA0OTApLCBQb2ludCgxNDAsIDQxMyksXHJcblx0XHRQb2ludCgxMjMsIDI0NylcclxuXHRdO1xyXG5cclxuXHR0aGlzLnRpbWVyQmFja2dyb3VuZCA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMTIxLDIwMCwzMiwzMik7IFxyXG5cclxuXHR0aGlzLnNlYXRQbGF0ZSA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoNDAsIDExNiwgMTYwLCA3MCk7XHJcblxyXG5cdHRoaXMuY29tbXVuaXR5Q2FyZHNQb3NpdGlvbiA9IFBvaW50KDI1NSwgMTkwKTtcclxuXHJcblx0dGhpcy5jYXJkRnJhbWUgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDQ5OCwgMjU2LCA4NywgMTIyKTtcclxuXHR0aGlzLmNhcmRCYWNrID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg0MDIsIDI1NiwgODcsIDEyMik7XHJcblxyXG5cdHRoaXMuZGl2aWRlckxpbmUgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDU2OCwgNzcsIDIsIDE3MCk7XHJcblxyXG5cdHRoaXMuc3VpdFN5bWJvbHMgPSBbXTtcclxuXHRmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKVxyXG5cdFx0dGhpcy5zdWl0U3ltYm9scy5wdXNoKHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMjQ2ICsgaSAqIDIzLCA2NywgMTgsIDE5KSk7XHJcblxyXG5cdHRoaXMuZnJhbWVQbGF0ZSA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzAxLCAyNjIsIDc0LCA3Nik7XHJcblx0dGhpcy5iaWdCdXR0b24gPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDMzLCAyOTgsIDk1LCA5NCk7XHJcblx0dGhpcy5kaWFsb2dCdXR0b24gPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDM4MywgNDYxLCA4MiwgNDcpO1xyXG5cdHRoaXMuZGVhbGVyQnV0dG9uID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgxOTcsIDIzNiwgNDEsIDM1KTtcclxuXHJcblx0dGhpcy5kZWFsZXJCdXR0b25Qb3NpdGlvbnMgPSBbXHJcblx0XHRQb2ludCgzNDcsIDEzMyksIFBvaW50KDM5NSwgMTMzKSwgUG9pbnQoNTc0LCAxMzMpLFxyXG5cdFx0UG9pbnQoNzYyLCAyNjcpLCBQb2ludCg3MTUsIDM1OCksIFBvaW50KDU3NCwgNDM0KSxcclxuXHRcdFBvaW50KDUzNiwgNDMyKSwgUG9pbnQoMzUxLCA0MzIpLCBQb2ludCgxOTMsIDM2MiksXHJcblx0XHRQb2ludCgxNjgsIDI2NilcclxuXHRdO1xyXG5cclxuXHR0aGlzLnRleHRTY3JvbGxiYXJUcmFjayA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzcxLDUwLDYwLDEwKTtcclxuXHR0aGlzLnRleHRTY3JvbGxiYXJUaHVtYiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzcxLDMyLDYwLDEwKTtcclxuXHJcblx0IHRoaXMuQWxpZ24gPSB7XHJcblx0IFx0TGVmdDogXCJsZWZ0XCIsXHJcblx0IFx0UmlnaHQ6IFwicmlnaHRcIixcclxuXHQgXHRDZW50ZXI6IFwiY2VudGVyXCIsXHJcblx0IH07XHJcblxyXG5cdHRoaXMuYmV0QWxpZ24gPSBbXHJcblx0XHRcdHRoaXMuQWxpZ24uTGVmdCwgdGhpcy5BbGlnbi5DZW50ZXIsIHRoaXMuQWxpZ24uUmlnaHQsXHJcblx0XHRcdHRoaXMuQWxpZ24uUmlnaHQsIHRoaXMuQWxpZ24uUmlnaHQsIFxyXG5cdFx0XHR0aGlzLkFsaWduLlJpZ2h0LCB0aGlzLkFsaWduLkNlbnRlciwgdGhpcy5BbGlnbi5MZWZ0LFxyXG5cdFx0XHR0aGlzLkFsaWduLkxlZnQsIHRoaXMuQWxpZ24uTGVmdFxyXG5cdFx0XTtcclxuXHJcblx0dGhpcy5iZXRQb3NpdGlvbnMgPSBbXHJcblx0XHRcdFBvaW50KDIyNSwxNTApLCBQb2ludCg0NzgsMTUwKSwgUG9pbnQoNzMwLDE1MCksXHJcblx0XHRcdFBvaW50KDc3OCwxOTYpLCBQb2ludCg3NDgsMzIyKSwgUG9pbnQoNzE5LDM2MCksXHJcblx0XHRcdFBvaW50KDQ4MSwzNjApLCBQb2ludCgyMzIsMzYwKSwgUG9pbnQoMTk5LDMyMiksXHJcblx0XHRcdFBvaW50KDE4MSwyMDApXHJcblx0XHRdO1xyXG5cclxuXHR0aGlzLmNoaXBzID0gbmV3IEFycmF5KCk7XHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCA1OyBpKyspIHtcclxuXHRcdHZhciBiID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzMCArIGkqNDAsIDI1LCA0MCwgMzApO1xyXG5cdFx0dGhpcy5jaGlwcy5wdXNoKGIpO1xyXG5cdH1cclxuXHJcblx0dGhpcy5jaGlwc0NvbG9ycyA9IFsweDQwNDA0MCwgMHgwMDgwMDAsIDB4ODA4MDAwLCAweDAwMDA4MCwgMHhmZjAwMDBdO1xyXG5cclxuXHR0aGlzLnBvdFBvc2l0aW9uID0gUG9pbnQoNDg1LDMxNSk7XHJcblx0Ki9cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB2YWx1ZSBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0VmFsdWVcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihrZXkpIHtcclxuXHR2YXIgdmFsdWUgPSBudWxsO1xyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSlcclxuXHRcdHZhbHVlID0gdGhpcy5za2luW2tleV07XHJcblx0ZWxzZVxyXG5cdFx0dmFsdWUgPSB0aGlzLmRlZmF1bHRTa2luW2tleV07XHJcblxyXG5cdGlmKHZhbHVlID09IG51bGwpIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcclxuXHR9IFxyXG5cclxuXHRyZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgcG9pbnQgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxyXG4gKiBAbWV0aG9kIGdldFBvaW50XHJcbiAqL1xyXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFBvaW50ID0gZnVuY3Rpb24oa2V5KSB7XHJcblx0dmFyIHZhbHVlID0gbnVsbDtcclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpXHJcblx0XHR2YWx1ZSA9IFBvaW50KHRoaXMuc2tpbltrZXldWzBdLCB0aGlzLnNraW5ba2V5XVsxXSk7XHJcblx0ZWxzZVxyXG5cdFx0dmFsdWUgPSBQb2ludCh0aGlzLmRlZmF1bHRTa2luW2tleV1bMF0sIHRoaXMuZGVmYXVsdFNraW5ba2V5XVsxXSk7XHJcblxyXG5cdGlmKHZhbHVlID09IG51bGwpIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcclxuXHR9IFxyXG5cclxuXHRyZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgcG9pbnRzIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cclxuICogQG1ldGhvZCBnZXRQb2ludHNcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0UG9pbnRzID0gZnVuY3Rpb24oa2V5KSB7XHJcblx0dmFyIHZhbHVlcyA9IG51bGw7XHJcblxyXG5cdHZhciBwb2ludHMgPSBuZXcgQXJyYXkoKTtcclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpXHJcblx0XHR2YWx1ZXMgPSB0aGlzLnNraW5ba2V5XTtcclxuXHRlbHNlXHJcblx0XHR2YWx1ZXMgPSB0aGlzLmRlZmF1bHRTa2luW2tleV07XHJcblxyXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHBvaW50cy5wdXNoKFBvaW50KHZhbHVlc1tpXVswXSwgdmFsdWVzW2ldWzFdKSk7XHJcblx0fVxyXG5cclxuXHRpZihwb2ludHMubGVuZ3RoIDw9IDApIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcclxuXHR9IFxyXG5cclxuXHRyZXR1cm4gcG9pbnRzO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRleHR1cmUgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxyXG4gKiBAbWV0aG9kIGdldFRleHR1cmVcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0VGV4dHVyZSA9IGZ1bmN0aW9uKGtleSwgaW5kZXgpIHtcclxuXHR2YXIgdmFsdWUgPSBudWxsO1xyXG5cdHZhciBpc0RlZmF1bHQgPSBmYWxzZTtcclxuXHR2YXIgdGV4dHVyZSA9IG51bGw7XHJcblx0dmFyIGZyYW1lID0gbnVsbDtcclxuXHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbltrZXldICE9IG51bGwpKSB7XHJcblx0XHR2YWx1ZSA9IHRoaXMuc2tpbltrZXldO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHZhbHVlID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xyXG5cdFx0aXNEZWZhdWx0ID0gdHJ1ZTtcclxuXHR9XHJcbi8vXHRjb25zb2xlLmxvZyhcInZhbHVlID0gXCIgKyB2YWx1ZSArIFwiLCBrZXkgPSBcIiAra2V5KTtcclxuXHJcblxyXG5cdGlmKHZhbHVlLnRleHR1cmUgIT0gbnVsbCkge1xyXG5cdFx0dGV4dHVyZSA9IHZhbHVlLnRleHR1cmU7XHJcblx0fVxyXG5cdGVsc2UgaWYoIWlzRGVmYXVsdCAmJiAodGhpcy5za2luLmRlZmF1bHRUZXh0dXJlICE9IG51bGwpKSB7XHJcblx0XHR0ZXh0dXJlID0gdGhpcy5za2luLmRlZmF1bHRUZXh0dXJlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHRleHR1cmUgPSB0aGlzLmRlZmF1bHRTa2luLmRlZmF1bHRUZXh0dXJlO1xyXG5cdH1cclxuXHJcblx0aWYodmFsdWUuY29vcmRzICE9IG51bGwpIHtcclxuXHRcdGZyYW1lID0gdmFsdWUuY29vcmRzO1xyXG5cdH1cclxuXHRlbHNlIGlmKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0dGV4dHVyZSA9IHZhbHVlO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGZyYW1lID0gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRpZih0ZXh0dXJlICE9IG51bGwpIHtcclxuXHRcdGlmKGZyYW1lICE9IG51bGwpXHJcblx0XHRcdHJldHVybiB0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lWzBdLCBmcmFtZVsxXSwgZnJhbWVbMl0sIGZyYW1lWzNdKTtcclxuXHRcdGVsc2VcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWUpO1xyXG5cdH1cclxuXHJcblxyXG5cdFxyXG5cdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcclxuXHRcclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0ZXh0dXJlcyBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0VGV4dHVyZXNcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0VGV4dHVyZXMgPSBmdW5jdGlvbihrZXkpIHtcclxuXHR2YXIgdmFsdWVzID0gbnVsbDtcclxuXHR2YXIgaXNEZWZhdWx0ID0gZmFsc2U7XHJcblxyXG5cdFxyXG5cdFxyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSkge1xyXG5cdFx0dmFsdWVzID0gdGhpcy5za2luW2tleV07XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dmFsdWVzID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xyXG5cdFx0aXNEZWZhdWx0ID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cclxuXHR2YXIgZnJhbWUgPSBudWxsO1xyXG5cdHZhciB0ZXh0dXJlID0gbnVsbDtcclxuXHR2YXIgdGV4dHVyZXMgPSBuZXcgQXJyYXkoKTtcclxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRmcmFtZSA9IG51bGw7XHJcblx0XHR0ZXh0dXJlID0gbnVsbDtcclxuXHRcdFxyXG5cdFx0aWYodmFsdWVzW2ldLnRleHR1cmUgIT0gbnVsbCkge1xyXG5cdFx0XHR0ZXh0dXJlID0gdmFsdWVzW2ldLnRleHR1cmU7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKCFpc0RlZmF1bHQgJiYgKHRoaXMuc2tpbi5kZWZhdWx0VGV4dHVyZSAhPSBudWxsKSkge1xyXG5cdFx0XHR0ZXh0dXJlID0gdGhpcy5za2luLmRlZmF1bHRUZXh0dXJlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRleHR1cmUgPSB0aGlzLmRlZmF1bHRTa2luLmRlZmF1bHRUZXh0dXJlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHZhbHVlc1tpXS5jb29yZHMgIT0gbnVsbCkge1xyXG5cdFx0XHRmcmFtZSA9IHZhbHVlc1tpXS5jb29yZHM7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKHR5cGVvZiB2YWx1ZXNbaV0gPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dGV4dHVyZSA9IHZhbHVlc1tpXTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRmcmFtZSA9IHZhbHVlc1tpXTtcclxuXHRcdH1cclxuXHJcblx0XHRpZih0ZXh0dXJlICE9IG51bGwpIHtcclxuXHRcdFx0aWYoZnJhbWUgIT0gbnVsbClcclxuXHRcdFx0XHR0ZXh0dXJlcy5wdXNoKHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWVbMF0sIGZyYW1lWzFdLCBmcmFtZVsyXSwgZnJhbWVbM10pKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHRleHR1cmVzLnB1c2godGhpcy5nZXRDb21wb25lbnRzUGFydCh0ZXh0dXJlLCBmcmFtZSkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0XHJcblx0aWYodGV4dHVyZXMubGVuZ3RoIDw9IDApXHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XHJcblx0IFxyXG5cclxuXHRyZXR1cm4gdGV4dHVyZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgcGFydCBmcm9tIGNvbXBvbmVudHMgYXRsYXMuXHJcbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50c1BhcnRcclxuICogQHByaXZhdGVcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0Q29tcG9uZW50c1BhcnQgPSBmdW5jdGlvbih0ZXh0dXJlaWQsIHgsIHksIHcsIGgpIHtcclxuXHJcblx0dmFyIGZyYW1lO1xyXG5cdHZhciB0ZXh0dXJlID0gdGhpcy5nZXRUZXh0dXJlRnJvbVNraW4odGV4dHVyZWlkKTtcclxuXHJcblx0aWYoeCA9PT0gbnVsbCkge1xyXG5cdFx0ZnJhbWUgPSB7XHJcblx0XHRcdHg6IDAsXHJcblx0XHRcdHk6IDAsXHJcblx0XHRcdHdpZHRoOiB0ZXh0dXJlLndpZHRoLFxyXG5cdFx0XHRoZWlnaHQ6IHRleHR1cmUuaGVpZ2h0XHJcblx0XHR9O1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGZyYW1lID0ge1xyXG5cdFx0XHR4OiB4LFxyXG5cdFx0XHR5OiB5LFxyXG5cdFx0XHR3aWR0aDogdyxcclxuXHRcdFx0aGVpZ2h0OiBoXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG5ldyBQSVhJLlRleHR1cmUodGV4dHVyZSwgZnJhbWUpO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRleHR1cmUgb2JqZWN0IGZyb20gc2tpbi5cclxuICogQG1ldGhvZCBnZXRUZXh0dXJlRnJvbVNraW5cclxuICogQHByaXZhdGVcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0VGV4dHVyZUZyb21Ta2luID0gZnVuY3Rpb24odGV4dHVyZWlkKSB7XHJcblxyXG5cdHZhciB0ZXh0dXJlT2JqZWN0ID0gbnVsbDtcclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luLnRleHR1cmVzICE9IG51bGwpKSB7XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5za2luLnRleHR1cmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmKHRoaXMuc2tpbi50ZXh0dXJlc1tpXS5pZCA9PSB0ZXh0dXJlaWQpIHtcclxuXHRcdFx0XHR0ZXh0dXJlT2JqZWN0ID0gdGhpcy5za2luLnRleHR1cmVzW2ldO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdGlmKHRleHR1cmVPYmplY3QgPT0gbnVsbCkge1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuZGVmYXVsdFNraW4udGV4dHVyZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYodGhpcy5kZWZhdWx0U2tpbi50ZXh0dXJlc1tpXS5pZCA9PSB0ZXh0dXJlaWQpIHtcclxuXHRcdFx0XHR0ZXh0dXJlT2JqZWN0ID0gdGhpcy5kZWZhdWx0U2tpbi50ZXh0dXJlc1tpXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYodGV4dHVyZU9iamVjdCA9PSBudWxsKSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJ0ZXh0dXJlaWQgZG9lc24ndCBleGlzdDogXCIgKyB0ZXh0dXJlaWQpO1xyXG5cdH1cclxuXHJcblx0aWYodGhpcy50ZXh0dXJlc1t0ZXh0dXJlT2JqZWN0LmlkXSA9PSBudWxsKVxyXG5cdFx0dGhpcy50ZXh0dXJlc1t0ZXh0dXJlT2JqZWN0LmlkXSA9IG5ldyBQSVhJLlRleHR1cmUuZnJvbUltYWdlKHRleHR1cmVPYmplY3QuZmlsZSk7XHJcblxyXG5cdHJldHVybiB0aGlzLnRleHR1cmVzW3RleHR1cmVPYmplY3QuaWRdO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEdldCBzaW5nbGV0b24gaW5zdGFuY2UuXHJcbiAqIEBtZXRob2QgZ2V0SW5zdGFuY2VcclxuICovXHJcblJlc291cmNlcy5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmICghUmVzb3VyY2VzLmluc3RhbmNlKVxyXG5cdFx0UmVzb3VyY2VzLmluc3RhbmNlID0gbmV3IFJlc291cmNlcygpO1xyXG5cclxuXHRyZXR1cm4gUmVzb3VyY2VzLmluc3RhbmNlO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlczsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcblxuLyoqXG4gKiBCaWcgYnV0dG9uLlxuICogQGNsYXNzIEJpZ0J1dHRvblxuICovXG5mdW5jdGlvbiBCaWdCdXR0b24oKSB7XG5cdEJ1dHRvbi5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYmlnQnV0dG9uVGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJiaWdCdXR0b25cIik7XG5cblx0dGhpcy5hZGRDaGlsZChuZXcgUElYSS5TcHJpdGUodGhpcy5iaWdCdXR0b25UZXh0dXJlKSk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAxOHB4IEFyaWFsXCIsXG5cdFx0Ly9maWxsOiBcIiMwMDAwMDBcIlxuXHR9O1xuXG5cdHRoaXMubGFiZWxGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbYnV0dG9uXVwiLCBzdHlsZSk7XG5cdHRoaXMubGFiZWxGaWVsZC5wb3NpdGlvbi55ID0gMzA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5sYWJlbEZpZWxkKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDE0cHggQXJpYWxcIlxuXHRcdC8vZmlsbDogXCIjMDAwMDAwXCJcblx0fTtcblxuXHR0aGlzLnZhbHVlRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3ZhbHVlXVwiLCBzdHlsZSk7XG5cdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi55ID0gNTA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy52YWx1ZUZpZWxkKTtcblxuXHR0aGlzLnNldExhYmVsKFwiVEVTVFwiKTtcblx0dGhpcy5zZXRWYWx1ZSgxMjMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEJpZ0J1dHRvbiwgQnV0dG9uKTtcblxuLyoqXG4gKiBTZXQgbGFiZWwgZm9yIHRoZSBidXR0b24uXG4gKiBAbWV0aG9kIHNldExhYmVsXG4gKi9cbkJpZ0J1dHRvbi5wcm90b3R5cGUuc2V0TGFiZWwgPSBmdW5jdGlvbihsYWJlbCkge1xuXHR0aGlzLmxhYmVsRmllbGQuc2V0VGV4dChsYWJlbCk7XG5cdHRoaXMubGFiZWxGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy5sYWJlbEZpZWxkLnggPSB0aGlzLmJpZ0J1dHRvblRleHR1cmUud2lkdGggLyAyIC0gdGhpcy5sYWJlbEZpZWxkLndpZHRoIC8gMjtcbn1cblxuLyoqXG4gKiBTZXQgdmFsdWUuXG4gKiBAbWV0aG9kIHNldFZhbHVlXG4gKi9cbkJpZ0J1dHRvbi5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZiAoIXZhbHVlKSB7XG5cdFx0dGhpcy52YWx1ZUZpZWxkLnZpc2libGUgPSBmYWxzZTtcblx0XHR2YWx1ZSA9IFwiXCI7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy52YWx1ZUZpZWxkLnZpc2libGUgPSB0cnVlO1xuXHR9XG5cblx0dGhpcy52YWx1ZUZpZWxkLnNldFRleHQodmFsdWUpO1xuXHR0aGlzLnZhbHVlRmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cdHRoaXMudmFsdWVGaWVsZC54ID0gdGhpcy5iaWdCdXR0b25UZXh0dXJlLndpZHRoIC8gMiAtIHRoaXMudmFsdWVGaWVsZC53aWR0aCAvIDI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmlnQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcclxudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XHJcbnZhciBTbGlkZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2xpZGVyXCIpO1xyXG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcclxudmFyIEJpZ0J1dHRvbiA9IHJlcXVpcmUoXCIuL0JpZ0J1dHRvblwiKTtcclxudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xyXG52YXIgUmFpc2VTaG9ydGN1dEJ1dHRvbiA9IHJlcXVpcmUoXCIuL1JhaXNlU2hvcnRjdXRCdXR0b25cIik7XHJcblxyXG4vKipcclxuICogQnV0dG9uc1xyXG4gKiBAY2xhc3MgQnV0dG9uc1ZpZXdcclxuICovXHJcbmZ1bmN0aW9uIEJ1dHRvbnNWaWV3KCkge1xyXG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xyXG5cclxuXHR0aGlzLmJ1dHRvbkhvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV0dG9uSG9sZGVyKTtcclxuXHJcblx0dmFyIHNsaWRlckJhY2tncm91bmQgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJzbGlkZXJCYWNrZ3JvdW5kXCIpLCAyMCwgMCwgMjAsIDApO1xyXG5cdHNsaWRlckJhY2tncm91bmQud2lkdGggPSAzMDA7XHJcblxyXG5cdHZhciBrbm9iID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJzbGlkZXJLbm9iXCIpKTtcclxuXHJcblx0dGhpcy5zbGlkZXIgPSBuZXcgU2xpZGVyKHNsaWRlckJhY2tncm91bmQsIGtub2IpO1xyXG5cdHZhciBwb3MgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcImJpZ0J1dHRvblBvc2l0aW9uXCIpO1xyXG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnggPSBwb3MueDtcclxuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi55ID0gcG9zLnkgLSAzNTtcclxuXHR0aGlzLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25TbGlkZXJDaGFuZ2UsIHRoaXMpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zbGlkZXIpO1xyXG5cclxuXHJcblx0dGhpcy5idXR0b25Ib2xkZXIucG9zaXRpb24ueCA9IDM2NjtcclxuXHR0aGlzLmJ1dHRvbkhvbGRlci5wb3NpdGlvbi55ID0gNTc1O1xyXG5cclxuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuXHRcdHZhciBidXR0b24gPSBuZXcgQmlnQnV0dG9uKCk7XHJcblx0XHRidXR0b24ub24oQnV0dG9uLkNMSUNLLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xyXG5cdFx0YnV0dG9uLnBvc2l0aW9uLnggPSBpICogMTA1O1xyXG5cdFx0dGhpcy5idXR0b25Ib2xkZXIuYWRkQ2hpbGQoYnV0dG9uKTtcclxuXHRcdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbik7XHJcblx0fVxyXG5cclxuXHR2YXIgcmFpc2VTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInNsaWRlcktub2JcIikpO1xyXG5cdHZhciBhcnJvd1Nwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwidXBBcnJvd1wiKSk7XHJcblx0YXJyb3dTcHJpdGUucG9zaXRpb24ueCA9IChyYWlzZVNwcml0ZS53aWR0aCAtIGFycm93U3ByaXRlLndpZHRoKSowLjUgLSAwLjU7XHJcblx0YXJyb3dTcHJpdGUucG9zaXRpb24ueSA9IChyYWlzZVNwcml0ZS5oZWlnaHQgLSBhcnJvd1Nwcml0ZS5oZWlnaHQpKjAuNSAtIDI7XHJcblx0cmFpc2VTcHJpdGUuYWRkQ2hpbGQoYXJyb3dTcHJpdGUpO1xyXG5cclxuXHR0aGlzLnJhaXNlTWVudUJ1dHRvbiA9IG5ldyBCdXR0b24ocmFpc2VTcHJpdGUpO1xyXG5cdHRoaXMucmFpc2VNZW51QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoQnV0dG9uLkNMSUNLLCB0aGlzLm9uUmFpc2VNZW51QnV0dG9uQ2xpY2ssIHRoaXMpO1xyXG5cdHRoaXMucmFpc2VNZW51QnV0dG9uLnBvc2l0aW9uLnggPSAyKjEwNSArIDcwO1xyXG5cdHRoaXMucmFpc2VNZW51QnV0dG9uLnBvc2l0aW9uLnkgPSAtNTtcclxuXHR0aGlzLmJ1dHRvbkhvbGRlci5hZGRDaGlsZCh0aGlzLnJhaXNlTWVudUJ1dHRvbik7XHJcblxyXG5cdHRoaXMucmFpc2VNZW51QnV0dG9uLnZpc2libGUgPSBmYWxzZTtcclxuXHR0aGlzLmNyZWF0ZVJhaXNlQW1vdW50TWVudSgpO1xyXG5cclxuXHR0aGlzLnNldEJ1dHRvbnMoW10sIDAsIC0xLCAtMSk7XHJcblxyXG5cdHRoaXMuYnV0dG9uc0RhdGFzID0gW107XHJcbn1cclxuXHJcbkZ1bmN0aW9uVXRpbC5leHRlbmQoQnV0dG9uc1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KEJ1dHRvbnNWaWV3KTtcclxuXHJcbkJ1dHRvbnNWaWV3LkJVVFRPTl9DTElDSyA9IFwiYnV0dG9uQ2xpY2tcIjtcclxuXHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJhaXNlIGFtb3VudCBtZW51LlxyXG4gKiBAbWV0aG9kIGNyZWF0ZVJhaXNlQW1vdW50TWVudVxyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLmNyZWF0ZVJhaXNlQW1vdW50TWVudSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51ID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xyXG5cclxuXHR0aGlzLnJhaXNlTWVudUJhY2tncm91bmQgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGF0QmFja2dyb3VuZFwiKSwgMTAsIDEwLCAxMCwgMTApO1xyXG5cdHRoaXMucmFpc2VNZW51QmFja2dyb3VuZC5wb3NpdGlvbi54ID0gMDtcclxuXHR0aGlzLnJhaXNlTWVudUJhY2tncm91bmQucG9zaXRpb24ueSA9IDA7XHJcblx0dGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kLndpZHRoID0gMTI1O1xyXG5cdHRoaXMucmFpc2VNZW51QmFja2dyb3VuZC5oZWlnaHQgPSAyMjA7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUuYWRkQ2hpbGQodGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kKTtcclxuXHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUueCA9IDY0NTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS55ID0gNTcwIC0gdGhpcy5yYWlzZUFtb3VudE1lbnUuaGVpZ2h0O1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5yYWlzZUFtb3VudE1lbnUpO1xyXG5cclxuXHR2YXIgc3R5bGVPYmplY3QgPSB7XHJcblx0XHRmb250OiBcImJvbGQgMThweCBBcmlhbFwiLFxyXG5cdH07XHJcblxyXG5cdHZhciB0ID0gbmV3IFBJWEkuVGV4dChcIlJBSVNFIFRPXCIsIHN0eWxlT2JqZWN0KTtcclxuXHR0LnBvc2l0aW9uLnggPSAoMTI1IC0gdC53aWR0aCkqMC41O1xyXG5cdHQucG9zaXRpb24ueSA9IDEwO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LmFkZENoaWxkKHQpO1xyXG5cclxuXHR0aGlzLnJhaXNlU2hvcnRjdXRCdXR0b25zID0gbmV3IEFycmF5KCk7XHJcblxyXG5cdGZvcih2YXIgaSA9IDA7IGkgPCA2OyBpKyspIHtcclxuXHRcdHZhciBiID0gbmV3IFJhaXNlU2hvcnRjdXRCdXR0b24oKTtcclxuXHRcdGIuYWRkRXZlbnRMaXN0ZW5lcihCdXR0b24uQ0xJQ0ssIHRoaXMub25SYWlzZVNob3J0Y3V0Q2xpY2ssIHRoaXMpO1xyXG5cdFx0Yi5wb3NpdGlvbi54ID0gMTA7XHJcblx0XHRiLnBvc2l0aW9uLnkgPSAzNSArIGkqMzA7XHJcblxyXG5cdFx0dGhpcy5yYWlzZUFtb3VudE1lbnUuYWRkQ2hpbGQoYik7XHJcblx0XHR0aGlzLnJhaXNlU2hvcnRjdXRCdXR0b25zLnB1c2goYik7XHJcblx0fVxyXG5cclxuLypcclxuXHRQaXhpVGV4dGlucHV0IHNob3VsZCBiZSB1c2VkLlxyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQ9bmV3IFRleHRGaWVsZCgpO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQueD0xMDtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0Lnk9NDArMzAqNTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LndpZHRoPTEwNTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmhlaWdodD0xOTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmJvcmRlcj10cnVlO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuYm9yZGVyQ29sb3I9MHg0MDQwNDA7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5iYWNrZ3JvdW5kPXRydWU7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5tdWx0aWxpbmU9ZmFsc2U7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC50eXBlPVRleHRGaWVsZFR5cGUuSU5QVVQ7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5hZGRFdmVudExpc3RlbmVyKEV2ZW50LkNIQU5HRSxvblJhaXNlQW1vdW50TWVudUlucHV0Q2hhbmdlKTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoS2V5Ym9hcmRFdmVudC5LRVlfRE9XTixvblJhaXNlQW1vdW50TWVudUlucHV0S2V5RG93bik7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUuYWRkQ2hpbGQodGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dCk7XHJcblx0Ki9cclxuXHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogUmFpc2UgYW1vdW50IGJ1dHRvbi5cclxuICogQG1ldGhvZCBvblJhaXNlTWVudUJ1dHRvbkNsaWNrXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUub25SYWlzZVNob3J0Y3V0Q2xpY2sgPSBmdW5jdGlvbigpIHtcclxuXHQvKnZhciBiID0gY2FzdCBlLnRhcmdldDtcclxuXHJcblx0X3JhaXNlQW1vdW50TWVudS52aXNpYmxlPWZhbHNlO1xyXG5cclxuXHRidXR0b25zW19zbGlkZXJJbmRleF0udmFsdWU9Yi52YWx1ZTtcclxuXHRfc2xpZGVyLnZhbHVlPShidXR0b25zW19zbGlkZXJJbmRleF0udmFsdWUtX3NsaWRlck1pbikvKF9zbGlkZXJNYXgtX3NsaWRlck1pbik7XHJcblx0X3JhaXNlQW1vdW50TWVudUlucHV0LnRleHQ9U3RkLnN0cmluZyhidXR0b25zW19zbGlkZXJJbmRleF0udmFsdWUpO1xyXG5cclxuXHR0cmFjZShcInZhbHVlIGNsaWNrOiBcIitiLnZhbHVlKTsqL1xyXG59XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBSYWlzZSBhbW91bnQgYnV0dG9uLlxyXG4gKiBAbWV0aG9kIG9uUmFpc2VNZW51QnV0dG9uQ2xpY2tcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5vblJhaXNlTWVudUJ1dHRvbkNsaWNrID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUudmlzaWJsZSA9ICF0aGlzLnJhaXNlQW1vdW50TWVudS52aXNpYmxlO1xyXG4vKlxyXG5cdGlmKHRoaXMucmFpc2VBbW91bnRNZW51LnZpc2libGUpIHtcclxuXHRcdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gdGhpcy5vblN0YWdlTW91c2VEb3duLmJpbmQodGhpcyk7XHJcblx0XHQvLyB0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmZvY3VzKCk7XHJcblx0XHQvLyB0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LlNlbGVjdEFsbFxyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gbnVsbDtcclxuXHR9Ki9cclxufVxyXG5cclxuLyoqXHJcbiAqIFNsaWRlciBjaGFuZ2UuXHJcbiAqIEBtZXRob2Qgb25TbGlkZXJDaGFuZ2VcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5vblNsaWRlckNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHZhciBuZXdWYWx1ZSA9IE1hdGgucm91bmQodGhpcy5zbGlkZXJNaW4gKyB0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKih0aGlzLnNsaWRlck1heCAtIHRoaXMuc2xpZGVyTWluKSk7XHJcblx0dGhpcy5idXR0b25zW3RoaXMuc2xpZGVySW5kZXhdLnNldFZhbHVlKG5ld1ZhbHVlKTtcclxuXHR0aGlzLmJ1dHRvbkRhdGFzW3RoaXMuc2xpZGVySW5kZXhdLnZhbHVlID0gbmV3VmFsdWU7XHJcblx0Y29uc29sZS5sb2coXCJuZXdWYWx1ZSA9IFwiICsgbmV3VmFsdWUpO1xyXG5cclxuXHQvL3RoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuc2V0VGV4dChidXR0b25zW19zbGlkZXJJbmRleF0udmFsdWUudG9TdHJpbmcoKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaG93IHNsaWRlci5cclxuICogQG1ldGhvZCBzaG93U2xpZGVyXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUuc2hvd1NsaWRlciA9IGZ1bmN0aW9uKGluZGV4LCBtaW4sIG1heCkge1xyXG5cdGNvbnNvbGUubG9nKFwic2hvd1NsaWRlclwiKTtcclxuXHR0aGlzLnNsaWRlckluZGV4ID0gaW5kZXg7XHJcblx0dGhpcy5zbGlkZXJNaW4gPSBtaW47XHJcblx0dGhpcy5zbGlkZXJNYXggPSBtYXg7XHJcblxyXG5cdGNvbnNvbGUubG9nKFwidGhpcy5idXR0b25EYXRhc1tcIitpbmRleCtcIl0gPSBcIiArIHRoaXMuYnV0dG9uRGF0YXNbaW5kZXhdLmdldFZhbHVlKCkgKyBcIiwgbWluID0gXCIgKyBtaW4gKyBcIiwgbWF4ID0gXCIgKyBtYXgpO1xyXG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKCh0aGlzLmJ1dHRvbkRhdGFzW2luZGV4XS5nZXRWYWx1ZSgpIC0gbWluKS8obWF4IC0gbWluKSk7XHJcblx0Y29uc29sZS5sb2coXCJ0aGlzLnNsaWRlci5nZXRWYWx1ZSgpID0gXCIgKyB0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKTtcclxuXHR0aGlzLnNsaWRlci52aXNpYmxlID0gdHJ1ZTtcclxuXHR0aGlzLnNsaWRlci5zaG93KCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhci5cclxuICogQG1ldGhvZCBjbGVhclxyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oYnV0dG9uRGF0YXMpIHtcclxuXHR0aGlzLnNldEJ1dHRvbnMoW10sIDAsIC0xLCAtMSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgYnV0dG9uIGRhdGFzLlxyXG4gKiBAbWV0aG9kIHNldEJ1dHRvbnNcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5zZXRCdXR0b25zID0gZnVuY3Rpb24oYnV0dG9uRGF0YXMsIHNsaWRlckJ1dHRvbkluZGV4LCBtaW4sIG1heCkge1xyXG5cdHRoaXMuYnV0dG9uRGF0YXMgPSBidXR0b25EYXRhcztcclxuXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBidXR0b24gPSB0aGlzLmJ1dHRvbnNbaV07XHJcblx0XHRpZiAoaSA+PSBidXR0b25EYXRhcy5sZW5ndGgpIHtcclxuXHRcdFx0YnV0dG9uLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSBidXR0b25EYXRhc1tpXTtcclxuXHJcblx0XHRidXR0b24udmlzaWJsZSA9IHRydWU7XHJcblx0XHRidXR0b24uc2V0TGFiZWwoYnV0dG9uRGF0YS5nZXRCdXR0b25TdHJpbmcoKSk7XHJcblx0XHRidXR0b24uc2V0VmFsdWUoYnV0dG9uRGF0YS5nZXRWYWx1ZSgpKTtcclxuXHJcblx0fVxyXG5cclxuXHRpZigobWluID49IDApICYmIChtYXggPj0gMCkpXHJcblx0XHR0aGlzLnNob3dTbGlkZXIoc2xpZGVyQnV0dG9uSW5kZXgsIG1pbiwgbWF4KTtcclxuXHJcblx0dGhpcy5idXR0b25Ib2xkZXIucG9zaXRpb24ueCA9IDM2NjtcclxuXHJcblx0aWYgKGJ1dHRvbkRhdGFzLmxlbmd0aCA8IDMpXHJcblx0XHR0aGlzLmJ1dHRvbkhvbGRlci5wb3NpdGlvbi54ICs9IDQ1O1xyXG59XHJcblxyXG4vKipcclxuICogQnV0dG9uIGNsaWNrLlxyXG4gKiBAbWV0aG9kIG9uQnV0dG9uQ2xpY2tcclxuICogQHByaXZhdGVcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5vbkJ1dHRvbkNsaWNrID0gZnVuY3Rpb24oZSkge1xyXG5cdHZhciBidXR0b25JbmRleCA9IC0xO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0dGhpcy5idXR0b25zW2ldLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdGlmIChlLnRhcmdldCA9PSB0aGlzLmJ1dHRvbnNbaV0pXHJcblx0XHRcdGJ1dHRvbkluZGV4ID0gaTtcclxuXHR9XHJcblxyXG5cdC8vY29uc29sZS5sb2coXCJidXR0b24gY2xpY2s6IFwiICsgYnV0dG9uSW5kZXgpO1xyXG5cdHZhciBidXR0b25EYXRhID0gdGhpcy5idXR0b25EYXRhc1tidXR0b25JbmRleF07XHJcblxyXG5cdHRoaXMudHJpZ2dlcih7XHJcblx0XHR0eXBlOiBCdXR0b25zVmlldy5CVVRUT05fQ0xJQ0ssXHJcblx0XHRidXR0b246IGJ1dHRvbkRhdGEuZ2V0QnV0dG9uKCksXHJcblx0XHR2YWx1ZTogYnV0dG9uRGF0YS5nZXRWYWx1ZSgpXHJcblx0fSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uc1ZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xyXG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcclxudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBBIGNhcmQgdmlldy5cclxuICogQGNsYXNzIENhcmRWaWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBDYXJkVmlldygpIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gbnVsbDtcclxuXHJcblxyXG5cclxuXHJcblx0dGhpcy5mcmFtZSA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2FyZEZyYW1lXCIpKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuZnJhbWUpO1xyXG5cclxuXHR0aGlzLnN1aXQgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZXMoXCJzdWl0U3ltYm9sc1wiKVswXSk7XHJcblx0dGhpcy5zdWl0LnBvc2l0aW9uLnggPSA4O1xyXG5cdHRoaXMuc3VpdC5wb3NpdGlvbi55ID0gMjU7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnN1aXQpO1xyXG5cclxuXHR2YXIgc3R5bGUgPSB7XHJcblx0XHRmb250OiBcImJvbGQgMTZweCBBcmlhbFwiXHJcblx0fTtcclxuXHJcblx0dGhpcy52YWx1ZUZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt2YWxdXCIsIHN0eWxlKTtcclxuXHR0aGlzLnZhbHVlRmllbGQucG9zaXRpb24ueCA9IDY7XHJcblx0dGhpcy52YWx1ZUZpZWxkLnBvc2l0aW9uLnkgPSA1O1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy52YWx1ZUZpZWxkKTtcclxuXHJcblx0dGhpcy5iYWNrID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjYXJkQmFja1wiKSk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJhY2spO1xyXG5cclxuXHJcblx0dGhpcy5tYXNrR3JhcGhpY3MgPSBuZXcgUElYSS5HcmFwaGljcygpO1xyXG5cdHRoaXMubWFza0dyYXBoaWNzLmJlZ2luRmlsbCgweDAwMDAwMCk7XHJcblx0dGhpcy5tYXNrR3JhcGhpY3MuZHJhd1JlY3QoMCwgMCwgODcsIHRoaXMuaGVpZ2h0KTtcclxuXHR0aGlzLm1hc2tHcmFwaGljcy5lbmRGaWxsKCk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLm1hc2tHcmFwaGljcyk7XHJcblxyXG5cdHRoaXMubWFzayA9IHRoaXMubWFza0dyYXBoaWNzO1xyXG59XHJcblxyXG5GdW5jdGlvblV0aWwuZXh0ZW5kKENhcmRWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xyXG5FdmVudERpc3BhdGNoZXIuaW5pdChDYXJkVmlldyk7XHJcblxyXG4vKipcclxuICogU2V0IGNhcmQgZGF0YS5cclxuICogQG1ldGhvZCBzZXRDYXJkRGF0YVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLnNldENhcmREYXRhID0gZnVuY3Rpb24oY2FyZERhdGEpIHtcclxuXHR0aGlzLmNhcmREYXRhID0gY2FyZERhdGE7XHJcblxyXG5cclxuXHRpZiAodGhpcy5jYXJkRGF0YS5pc1Nob3duKCkpIHtcclxuXHRcdC8qXHJcblx0XHR0aGlzLmJhY2sudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5mcmFtZS52aXNpYmxlID0gdHJ1ZTtcclxuKi9cclxuXHRcdHRoaXMudmFsdWVGaWVsZC5zdHlsZS5maWxsID0gdGhpcy5jYXJkRGF0YS5nZXRDb2xvcigpO1xyXG5cclxuXHRcdHRoaXMudmFsdWVGaWVsZC5zZXRUZXh0KHRoaXMuY2FyZERhdGEuZ2V0Q2FyZFZhbHVlU3RyaW5nKCkpO1xyXG5cdFx0dGhpcy52YWx1ZUZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xyXG5cdFx0dGhpcy52YWx1ZUZpZWxkLnBvc2l0aW9uLnggPSAxNyAtIHRoaXMudmFsdWVGaWVsZC5jYW52YXMud2lkdGggLyAyO1xyXG5cclxuXHRcdHRoaXMuc3VpdC5zZXRUZXh0dXJlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFwic3VpdFN5bWJvbHNcIilbdGhpcy5jYXJkRGF0YS5nZXRTdWl0SW5kZXgoKV0pO1xyXG5cdH1cclxuXHR0aGlzLmJhY2sudmlzaWJsZSA9IHRydWU7XHJcblx0dGhpcy5mcmFtZS52aXNpYmxlID0gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgY2FyZCBkYXRhLlxyXG4gKiBAbWV0aG9kIHNldENhcmREYXRhXHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUuc2V0VGFyZ2V0UG9zaXRpb24gPSBmdW5jdGlvbihwb2ludCkge1xyXG5cdHRoaXMudGFyZ2V0UG9zaXRpb24gPSBwb2ludDtcclxuXHJcblx0dGhpcy5wb3NpdGlvbi54ID0gcG9pbnQueDtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSBwb2ludC55O1xyXG59XHJcblxyXG4vKipcclxuICogSGlkZS5cclxuICogQG1ldGhvZCBoaWRlXHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdy5cclxuICogQG1ldGhvZCBzaG93XHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKGFuaW1hdGUsIGRlbGF5KSB7XHJcblx0LyppZihkZWxheSA9PSB1bmRlZmluZWQpXHJcblx0XHRkZWxheSA9IDE7XHJcblx0Ki9cclxuXHR0aGlzLm1hc2tHcmFwaGljcy5zY2FsZS55ID0gMTtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSB0aGlzLnRhcmdldFBvc2l0aW9uLng7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gdGhpcy50YXJnZXRQb3NpdGlvbi55O1xyXG5cdGlmKCFhbmltYXRlKSB7XHJcblx0XHR0aGlzLm9uU2hvd0NvbXBsZXRlKCk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdHRoaXMubWFzay5oZWlnaHQgPSB0aGlzLmhlaWdodDtcclxuXHJcblx0dmFyIGRlc3RpbmF0aW9uID0ge3g6IHRoaXMucG9zaXRpb24ueCwgeTogdGhpcy5wb3NpdGlvbi55fTtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSAodGhpcy5wYXJlbnQud2lkdGggLSB0aGlzLndpZHRoKSowLjU7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gLXRoaXMuaGVpZ2h0O1xyXG5cclxuXHR2YXIgZGlmZlggPSB0aGlzLnBvc2l0aW9uLnggLSBkZXN0aW5hdGlvbi54O1xyXG5cdHZhciBkaWZmWSA9IHRoaXMucG9zaXRpb24ueSAtIGRlc3RpbmF0aW9uLnk7XHJcblx0dmFyIGRpZmYgPSBNYXRoLnNxcnQoZGlmZlgqZGlmZlggKyBkaWZmWSpkaWZmWSk7XHJcblxyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbiggdGhpcy5wb3NpdGlvbiApXHJcbi8vICAgICAgICAgICAgLmRlbGF5KGRlbGF5KVxyXG4gICAgICAgICAgICAudG8oIHsgeDogZGVzdGluYXRpb24ueCwgeTogZGVzdGluYXRpb24ueSB9LCAzKmRpZmYgKVxyXG4gICAgICAgICAgICAuZWFzaW5nKCBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCApXHJcbiAgICAgICAgICAgIC5vblN0YXJ0KHRoaXMub25TaG93U3RhcnQuYmluZCh0aGlzKSlcclxuICAgICAgICAgICAgLm9uQ29tcGxldGUodGhpcy5vblNob3dDb21wbGV0ZS5iaW5kKHRoaXMpKVxyXG4gICAgICAgICAgICAuc3RhcnQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5vblNob3dTdGFydCA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaG93IGNvbXBsZXRlLlxyXG4gKiBAbWV0aG9kIG9uU2hvd0NvbXBsZXRlXHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUub25TaG93Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHRpZih0aGlzLmNhcmREYXRhLmlzU2hvd24oKSkge1xyXG5cdFx0dGhpcy5iYWNrLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuZnJhbWUudmlzaWJsZSA9IHRydWU7XHJcblx0fVxyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGb2xkLlxyXG4gKiBAbWV0aG9kIGZvbGRcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5mb2xkID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIG8gPSB7XHJcblx0XHR4OiB0aGlzLnRhcmdldFBvc2l0aW9uLngsXHJcblx0XHR5OiB0aGlzLnRhcmdldFBvc2l0aW9uLnkrODBcclxuXHR9O1xyXG5cclxuXHR2YXIgdGltZSA9IDUwMDsvLyBTZXR0aW5ncy5pbnN0YW5jZS5zY2FsZUFuaW1hdGlvblRpbWUoNTAwKTtcclxuXHR0aGlzLnQwID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMucG9zaXRpb24pXHJcblx0XHRcdC50byhvLCB0aW1lKVxyXG5cdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0XHQub25VcGRhdGUodGhpcy5vbkZvbGRVcGRhdGUuYmluZCh0aGlzKSlcclxuXHRcdFx0Lm9uQ29tcGxldGUodGhpcy5vbkZvbGRDb21wbGV0ZS5iaW5kKHRoaXMpKVxyXG5cdFx0XHQuc3RhcnQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvbGQgYW5pbWF0aW9uIHVwZGF0ZS5cclxuICogQG1ldGhvZCBvbkZvbGRVcGRhdGVcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5vbkZvbGRVcGRhdGUgPSBmdW5jdGlvbihwcm9ncmVzcykge1xyXG5cdHRoaXMubWFza0dyYXBoaWNzLnNjYWxlLnkgPSAxIC0gcHJvZ3Jlc3M7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGb2xkIGFuaW1hdGlvbiBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvbkZvbGRDb21wbGV0ZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLm9uRm9sZENvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYXJkVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBTbGlkZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2xpZGVyXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFBpeGlUZXh0SW5wdXQgPSByZXF1aXJlKFwiUGl4aVRleHRJbnB1dFwiKTtcbnZhciBNb3VzZU92ZXJHcm91cCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Nb3VzZU92ZXJHcm91cFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIENoYXQgdmlldy5cbiAqIEBjbGFzcyBDaGF0Vmlld1xuICovXG5mdW5jdGlvbiBDaGF0VmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5tYXJnaW4gPSA1O1xuXG5cdFxuXHR2YXIgY2hhdFBsYXRlID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRjaGF0UGxhdGUucG9zaXRpb24ueCA9IDEwO1xuXHRjaGF0UGxhdGUucG9zaXRpb24ueSA9IDU0MDtcblx0Y2hhdFBsYXRlLnNldExvY2FsU2l6ZSgzMzAsIDEzMCk7XG5cdHRoaXMuYWRkQ2hpbGQoY2hhdFBsYXRlKTtcblxuXHR2YXIgcyA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImZyYW1lUGxhdGVcIiksIDEwKTtcblx0cy5wb3NpdGlvbi54ID0gMTA7XG5cdHMucG9zaXRpb24ueSA9IDY3NTtcblx0cy5zZXRMb2NhbFNpemUoMzMwLCAzNSk7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuXHRcdGZvbnQ6IFwiMTJweCBBcmlhbFwiLFxuXHRcdHdvcmRXcmFwV2lkdGg6IDMxMCxcblx0XHRoZWlnaHQ6IDExNCxcblx0XHRib3JkZXI6IHRydWUsXG5cdFx0Y29sb3I6IDB4RkZGRkZGLFxuXHRcdGJvcmRlckNvbG9yOiAweDQwNDA0MCxcblx0XHR3b3JkV3JhcDogdHJ1ZSxcblx0XHRtdWx0aWxpbmU6IHRydWVcblx0fTtcblxuXHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcik7XG5cdHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLnggPSAyMDtcblx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueSA9IDU0ODtcblxuXHR0aGlzLmNoYXRNYXNrID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0dGhpcy5jaGF0TWFzay5iZWdpbkZpbGwoMTIzKTtcblx0dGhpcy5jaGF0TWFzay5kcmF3UmVjdCgwLCAwLCAzMTAsIDExNCk7XG5cdHRoaXMuY2hhdE1hc2suZW5kRmlsbCgpO1xuXHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNoYXRNYXNrKTtcblxuXHR0aGlzLmNoYXRUZXh0ID0gbmV3IFBJWEkuVGV4dChcIlwiLCBzdHlsZU9iamVjdCk7XG5cdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuY2hhdFRleHQpO1xuXHR0aGlzLmNoYXRUZXh0Lm1hc2sgPSB0aGlzLmNoYXRNYXNrO1xuXG5cblxuXHR2YXIgc3R5bGVPYmplY3QgPSB7XG5cdFx0Zm9udDogXCIxNHB4IEFyaWFsXCIsXG5cdFx0d2lkdGg6IDMxMCxcblx0XHRoZWlnaHQ6IDE5LFxuXHRcdGJvcmRlcjogdHJ1ZSxcblx0XHRib3JkZXJDb2xvcjogMHg0MDQwNDAsXG5cdFx0YmFja2dyb3VuZDogdHJ1ZSxcblx0XHRtdWx0aWxpbmU6IHRydWVcblx0fTtcblx0dGhpcy5pbnB1dEZpZWxkID0gbmV3IFBpeGlUZXh0SW5wdXQoXCJcIiwgc3R5bGVPYmplY3QpO1xuXHR0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueCA9IHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLng7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55ID0gNjgzO1xuXHR0aGlzLmlucHV0RmllbGQud2lkdGggPSAzMTA7XG5cdHRoaXMuaW5wdXRGaWVsZC5rZXlkb3duID0gdGhpcy5vbktleURvd24uYmluZCh0aGlzKTtcblxuXHR2YXIgaW5wdXRTaGFkb3cgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHRpbnB1dFNoYWRvdy5iZWdpbkZpbGwoMHgwMDAwMDApO1xuXHRpbnB1dFNoYWRvdy5kcmF3UmVjdCgtMSwgLTEsIDMxMSwgMjApO1xuXHRpbnB1dFNoYWRvdy5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdGlucHV0U2hhZG93LnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0dGhpcy5hZGRDaGlsZChpbnB1dFNoYWRvdyk7XG5cblx0dmFyIGlucHV0QmFja2dyb3VuZCA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdGlucHV0QmFja2dyb3VuZC5iZWdpbkZpbGwoMHhGRkZGRkYpO1xuXHRpbnB1dEJhY2tncm91bmQuZHJhd1JlY3QoMCwgMCwgMzEwLCAxOSk7XG5cdGlucHV0QmFja2dyb3VuZC5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdGlucHV0QmFja2dyb3VuZC5wb3NpdGlvbi55ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnk7XG5cdHRoaXMuYWRkQ2hpbGQoaW5wdXRCYWNrZ3JvdW5kKTtcblxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaW5wdXRGaWVsZCk7XG5cblxuXG5cdHZhciBzbGlkZUJhY2sgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0ZXh0U2Nyb2xsYmFyVHJhY2tcIiksIDEwLCAwLCAxMCwgMCk7XG5cdHNsaWRlQmFjay53aWR0aCA9IDEwNztcblx0dmFyIHNsaWRlS25vYiA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRleHRTY3JvbGxiYXJUaHVtYlwiKSwgMTAsIDAsIDEwLCAwKTtcblx0c2xpZGVLbm9iLndpZHRoID0gMzA7XG5cblxuXHR0aGlzLnNsaWRlciA9IG5ldyBTbGlkZXIoc2xpZGVCYWNrLCBzbGlkZUtub2IpO1xuXHR0aGlzLnNsaWRlci5yb3RhdGlvbiA9IE1hdGguUEkqMC41O1xuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi54ID0gMzI2O1xuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi55ID0gNTUyO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcblx0dGhpcy5zbGlkZXIudmlzaWJsZSA9IGZhbHNlO1xuXHR0aGlzLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25TbGlkZXJDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zbGlkZXIpO1xuXG5cblx0dGhpcy5tb3VzZU92ZXJHcm91cCA9IG5ldyBNb3VzZU92ZXJHcm91cCgpO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZERpc3BsYXlPYmplY3QodGhpcy5jaGF0VGV4dCk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLnNsaWRlcik7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLmNoYXRNYXNrKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KGNoYXRQbGF0ZSk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3ZlclwiLCB0aGlzLm9uQ2hhdEZpZWxkTW91c2VPdmVyLCB0aGlzKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgdGhpcy5vbkNoYXRGaWVsZE1vdXNlT3V0LCB0aGlzKTtcblxuXHR0aGlzLmNsZWFyKCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2hhdFZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGF0Vmlldyk7XG5cblxuXG4vKipcbiAqIENsZWFyIG1lc3NhZ2VzLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5DaGF0Vmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jaGF0VGV4dC5zZXRUZXh0KFwiXCIpO1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0ICkpO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcbn1cblxuXG4vKipcbiAqICBBZGQgdGV4dC5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuQ2hhdFZpZXcucHJvdG90eXBlLmFkZFRleHQgPSBmdW5jdGlvbih1c2VyLCB0ZXh0KSB7XG5cdHRoaXMuY2hhdFRleHQuc2V0VGV4dCh0aGlzLmNoYXRUZXh0LnRleHQgKyB1c2VyICsgXCI6IFwiICsgdGV4dCArIFwiXFxuXCIpO1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0ICkpO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcbn1cblxuLyoqXG4gKiBPbiBzbGlkZXIgdmFsdWUgY2hhbmdlXG4gKiBAbWV0aG9kIG9uU2xpZGVyQ2hhbmdlXG4gKi9cbiBDaGF0Vmlldy5wcm90b3R5cGUub25TbGlkZXJDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiBcdHRoaXMuY2hhdFRleHQueSA9IC1NYXRoLnJvdW5kKHRoaXMuc2xpZGVyLmdldFZhbHVlKCkqKHRoaXMuY2hhdFRleHQuaGVpZ2h0ICsgdGhpcy5tYXJnaW4gLSB0aGlzLmNoYXRNYXNrLmhlaWdodCkpO1xuIH1cblxuXG4vKipcbiAqIE9uIG1vdXNlIG92ZXJcbiAqIEBtZXRob2Qgb25DaGF0RmllbGRNb3VzZU92ZXJcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbkNoYXRGaWVsZE1vdXNlT3ZlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNsaWRlci5zaG93KCk7XG4gfVxuXG5cbi8qKlxuICogT24gbW91c2Ugb3V0XG4gKiBAbWV0aG9kIG9uQ2hhdEZpZWxkTW91c2VPdXRcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbkNoYXRGaWVsZE1vdXNlT3V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2xpZGVyLmhpZGUoKTtcbiB9XG5cblxuLyoqXG4gKiBPbiBrZXkgZG93blxuICogQG1ldGhvZCBvbktleURvd25cbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbktleURvd24gPSBmdW5jdGlvbihldmVudCkge1xuXHRpZihldmVudC5rZXlDb2RlID09IDEzKSB7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhdFwiLCB0aGlzLmlucHV0RmllbGQudGV4dCk7XG5cdFx0XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnNldFRleHQoXCJcIik7XG5cdFx0XG5cdH1cbiB9XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRWaWV3O1xuIiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xyXG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcclxudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEEgY2hpcHMgdmlldy5cclxuICogQGNsYXNzIENoaXBzVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gQ2hpcHNWaWV3KHNob3dUb29sVGlwKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblx0dGhpcy50YXJnZXRQb3NpdGlvbiA9IG51bGw7XHJcblxyXG5cdHRoaXMuYWxpZ24gPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MZWZ0O1xyXG5cclxuXHR0aGlzLnZhbHVlID0gMDtcclxuXHJcblx0dGhpcy5kZW5vbWluYXRpb25zID0gWzUwMDAwMCwxMDAwMDAsMjUwMDAsNTAwMCwxMDAwLDUwMCwxMDAsMjUsNSwxXTtcclxuXHJcblx0dGhpcy5zdGFja0NsaXBzID0gbmV3IEFycmF5KCk7XHJcblx0dGhpcy5ob2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmhvbGRlcik7XHJcblxyXG5cdHRoaXMudG9vbFRpcCA9IG51bGw7XHJcblxyXG5cdGlmKHNob3dUb29sVGlwKSB7XHJcblx0XHR0aGlzLnRvb2xUaXAgPSBuZXcgVG9vbFRpcCgpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnRvb2xUaXApO1xyXG5cdH1cclxuXHJcbn1cclxuXHJcbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2hpcHNWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xyXG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGlwc1ZpZXcpO1xyXG5cclxuLyoqXHJcbiAqIFNldCBhbGlnbm1lbnQuXHJcbiAqIEBtZXRob2Qgc2V0Q2FyZERhdGFcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0QWxpZ25tZW50ID0gZnVuY3Rpb24oYWxpZ24pIHtcclxuXHR0aGlzLmFsaWduID0gYWxpZ247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgdGFyZ2V0IHBvc2l0aW9uLlxyXG4gKiBAbWV0aG9kIHNldFRhcmdldFBvc2l0aW9uXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLnNldFRhcmdldFBvc2l0aW9uID0gZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gcG9zaXRpb247XHJcblx0dGhpcy5wb3NpdGlvbi54ID0gcG9zaXRpb24ueDtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSBwb3NpdGlvbi55O1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IHZhbHVlLlxyXG4gKiBAbWV0aG9kIHNldFZhbHVlXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHR0aGlzLnZhbHVlID0gdmFsdWU7XHJcblxyXG5cdHZhciBzcHJpdGU7XHJcblxyXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnN0YWNrQ2xpcHMubGVuZ3RoOyBpKyspXHJcblx0XHR0aGlzLmhvbGRlci5yZW1vdmVDaGlsZCh0aGlzLnN0YWNrQ2xpcHNbaV0pO1xyXG5cclxuXHR0aGlzLnN0YWNrQ2xpcHMgPSBuZXcgQXJyYXkoKTtcclxuXHJcblx0aWYgKHRoaXMudG9vbFRpcCE9bnVsbClcclxuXHRcdHRoaXMudG9vbFRpcC50ZXh0ID0gXCJCZXQ6IFwiKyB0aGlzLnZhbHVlLnRvU3RyaW5nKCk7XHJcblxyXG5cdHZhciBpO1xyXG5cdHZhciBzdGFja0NsaXAgPSBudWxsO1xyXG5cdHZhciBzdGFja1BvcyA9IDA7XHJcblx0dmFyIGNoaXBQb3MgPSAwO1xyXG5cdHZhciB0ZXh0dXJlcyA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFwiY2hpcHNcIik7XHJcblxyXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLmRlbm9taW5hdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBkZW5vbWluYXRpb24gPSB0aGlzLmRlbm9taW5hdGlvbnNbaV07XHJcblxyXG5cdFx0Y2hpcFBvcz0wO1xyXG5cdFx0c3RhY2tDbGlwPW51bGw7XHJcblx0XHR3aGlsZSh2YWx1ZSA+PSBkZW5vbWluYXRpb24pIHtcclxuXHRcdFx0aWYgKHN0YWNrQ2xpcCA9PSBudWxsKSB7XHJcblx0XHRcdFx0c3RhY2tDbGlwID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xyXG5cdFx0XHRcdHN0YWNrQ2xpcC54ID0gc3RhY2tQb3M7XHJcblx0XHRcdFx0c3RhY2tQb3MgKz0gNDA7XHJcblx0XHRcdFx0dGhpcy5ob2xkZXIuYWRkQ2hpbGQoc3RhY2tDbGlwKTtcclxuXHRcdFx0XHR0aGlzLnN0YWNrQ2xpcHMucHVzaChzdGFja0NsaXApO1xyXG5cdFx0XHR9XHJcblx0XHQgICBcdHZhciB0ZXh0dXJlID0gdGV4dHVyZXNbaSV0ZXh0dXJlcy5sZW5ndGhdO1xyXG5cdFx0XHR2YXIgY2hpcCA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKTtcclxuXHRcdFx0Y2hpcC5wb3NpdGlvbi55ID0gY2hpcFBvcztcclxuXHRcdFx0Y2hpcFBvcyAtPSA1O1xyXG5cdFx0XHRzdGFja0NsaXAuYWRkQ2hpbGQoY2hpcCk7XHJcblx0XHRcdHZhbHVlIC09IGRlbm9taW5hdGlvbjtcclxuXHJcblx0XHRcdHZhciBkZW5vbWluYXRpb25TdHJpbmc7XHJcblxyXG5cdFx0XHRpZihkZW5vbWluYXRpb24gPj0gMTAwMClcclxuXHRcdFx0XHRkZW5vbWluYXRpb25TdHJpbmcgPSBNYXRoLnJvdW5kKGRlbm9taW5hdGlvbiAvIDEwMDApICsgXCJLXCI7XHJcblxyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0ZGVub21pbmF0aW9uU3RyaW5nID0gZGVub21pbmF0aW9uO1xyXG5cclxuXHRcdFx0aWYoKHN0YWNrQ2xpcCAhPSBudWxsKSAmJiAodmFsdWUgPCBkZW5vbWluYXRpb24pKSB7XHJcblxyXG5cdFx0XHRcdHZhciB0ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KGRlbm9taW5hdGlvblN0cmluZywge1xyXG5cdFx0XHRcdFx0Zm9udDogXCJib2xkIDEycHggQXJpYWxcIixcclxuXHRcdFx0XHRcdGFsaWduOiBcImNlbnRlclwiLFxyXG5cdFx0XHRcdFx0ZmlsbDogUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VmFsdWUoXCJjaGlwc0NvbG9yc1wiKVtpJVJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFZhbHVlKFwiY2hpcHNDb2xvcnNcIikubGVuZ3RoXVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHRleHRGaWVsZC5wb3NpdGlvbi54ID0gKHN0YWNrQ2xpcC53aWR0aCAtIHRleHRGaWVsZC53aWR0aCkqMC41O1xyXG5cdFx0XHRcdHRleHRGaWVsZC5wb3NpdGlvbi55ID0gY2hpcFBvcyArIDExO1xyXG5cdFx0XHRcdHRleHRGaWVsZC5hbHBoYSA9IDAuNTtcclxuXHRcdFx0XHQvKlxyXG5cdFx0XHRcdHRleHRGaWVsZC53aWR0aCA9IHN0YWNrQ2xpcC53aWR0aCAtIDE7XHJcblx0XHRcdFx0dGV4dEZpZWxkLmhlaWdodCA9IDIwOyovXHJcblxyXG5cdFx0XHRcdHN0YWNrQ2xpcC5hZGRDaGlsZCh0ZXh0RmllbGQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzd2l0Y2ggKHRoaXMuYWxpZ24pIHtcclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uTEVGVDoge1xyXG5cdFx0XHR0aGlzLmhvbGRlci54ID0gMDtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5DRU5URVI6IHtcclxuXHRcdFx0dGhpcy5ob2xkZXIueCA9IC10aGlzLmhvbGRlci53aWR0aCAvIDI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uUklHSFQ6XHJcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAtdGhpcy5ob2xkZXIud2lkdGg7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogSGlkZS5cclxuICogQG1ldGhvZCBoaWRlXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cuXHJcbiAqIEBtZXRob2Qgc2hvd1xyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHJcblx0dmFyIGRlc3RpbmF0aW9uID0ge3g6IHRoaXMucG9zaXRpb24ueCwgeTogdGhpcy5wb3NpdGlvbi55fTtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSAodGhpcy5wYXJlbnQud2lkdGggLSB0aGlzLndpZHRoKSowLjU7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gLXRoaXMuaGVpZ2h0O1xyXG5cclxuXHR2YXIgZGlmZlggPSB0aGlzLnBvc2l0aW9uLnggLSBkZXN0aW5hdGlvbi54O1xyXG5cdHZhciBkaWZmWSA9IHRoaXMucG9zaXRpb24ueSAtIGRlc3RpbmF0aW9uLnk7XHJcblx0dmFyIGRpZmYgPSBNYXRoLnNxcnQoZGlmZlgqZGlmZlggKyBkaWZmWSpkaWZmWSk7XHJcblxyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbiggdGhpcy5wb3NpdGlvbiApXHJcbiAgICAgICAgICAgIC50byggeyB4OiBkZXN0aW5hdGlvbi54LCB5OiBkZXN0aW5hdGlvbi55IH0sIDMqZGlmZiApXHJcbiAgICAgICAgICAgIC5lYXNpbmcoIFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IClcclxuICAgICAgICAgICAgLm9uQ29tcGxldGUodGhpcy5vblNob3dDb21wbGV0ZS5iaW5kKHRoaXMpKVxyXG4gICAgICAgICAgICAuc3RhcnQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUub25TaG93Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHRcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG59XHJcblxyXG4vKipcclxuICogQW5pbWF0ZSBpbi5cclxuICogQG1ldGhvZCBhbmltYXRlSW5cclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuYW5pbWF0ZUluID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIG8gPSB7XHJcblx0XHR5OiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnlcclxuXHR9O1xyXG5cclxuXHRzd2l0Y2ggKHRoaXMuYWxpZ24pIHtcclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uTEVGVDpcclxuXHRcdFx0by54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54LXdpZHRoLzI7XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5DRU5URVI6XHJcblx0XHRcdG8ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueDtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLlJJR0hUOlxyXG5cdFx0XHRvLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLngrd2lkdGgvMjtcclxuXHR9XHJcblxyXG5cdHZhciB0aW1lID0gNTAwO1xyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxyXG5cdFx0XHRcdFx0LnRvKHsgeTogUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS55IH0sIHRpbWUpXHJcblx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uSW5BbmltYXRpb25Db21wbGV0ZS5iaW5kKHRoaXMpKVxyXG5cdFx0XHRcdFx0LnN0YXJ0KCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbiBhbmltYXRpb24gY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25JbkFuaW1hdGlvbkNvbXBsZXRlXHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLm9uSW5BbmltYXRpb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuc2V0VmFsdWUoMCk7XHJcblxyXG5cdHggPSB0aGlzLnRhcmdldFBvc2l0aW9uLng7XHJcblx0eSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcclxuXHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFuaW1hdGUgb3V0LlxyXG4gKiBAbWV0aG9kIGFuaW1hdGVPdXRcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuYW5pbWF0ZU91dCA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueTtcclxuXHJcblx0c3dpdGNoICh0aGlzLmFsaWduKSB7XHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkxFRlQ6XHJcblx0XHRcdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueCAtIHdpZHRoLzI7XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5DRU5URVI6XHJcblx0XHRcdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueDtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLlJJR0hUOlxyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnggKyB3aWR0aC8yO1xyXG5cdH1cclxuXHJcblx0dmFyIG8gPSB7XHJcblx0XHR4OiB0aGlzLnRhcmdldFBvc2l0aW9uLngsXHJcblx0XHR5OiB0aGlzLnRhcmdldFBvc2l0aW9uLnlcclxuXHR9O1xyXG5cclxuXHR2YXIgdGltZSA9IDUwMDtcclxuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcclxuXHRcdFx0XHRcdC50byhvLCB0aW1lKVxyXG5cdFx0XHRcdFx0Lm9uQ29tcGxldGUodGhpcy5vbk91dEFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxuXHRcclxufVxyXG5cclxuLyoqXHJcbiAqIE91dCBhbmltYXRpb24gY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25PdXRBbmltYXRpb25Db21wbGV0ZVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5vbk91dEFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciB0aW1lID0gNTAwO1xyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih7eDowfSlcclxuXHRcdFx0XHRcdC50byh7eDoxMH0sIHRpbWUpXHJcblx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uT3V0V2FpdEFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxuXHJcblx0eCA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueDtcclxuXHR5ID0gdGhpcy50YXJnZXRQb3NpdGlvbi55O1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIE91dCB3YWl0IGFuaW1hdGlvbiBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvbk91dFdhaXRBbmltYXRpb25Db21wbGV0ZVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5vbk91dFdhaXRBbmltYXRpb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cclxuXHR0aGlzLnNldFZhbHVlKDApO1xyXG5cclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoaXBzVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XHJcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xyXG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xyXG5cclxuLyoqXHJcbiAqIERpYWxvZyB2aWV3LlxyXG4gKiBAY2xhc3MgRGVhbGVyQnV0dG9uVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gRGVhbGVyQnV0dG9uVmlldygpIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHJcblxyXG5cdHZhciBkZWFsZXJCdXR0b25UZXh0dXJlID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImRlYWxlckJ1dHRvblwiKTtcclxuXHR0aGlzLnNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShkZWFsZXJCdXR0b25UZXh0dXJlKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuc3ByaXRlKTtcclxuXHR0aGlzLmhpZGUoKTtcclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChEZWFsZXJCdXR0b25WaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xyXG5FdmVudERpc3BhdGNoZXIuaW5pdChEZWFsZXJCdXR0b25WaWV3KTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgc2VhdCBpbmRleFxyXG4gKiBAbWV0aG9kIHNldFNlYXRJbmRleFxyXG4gKi9cclxuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuc2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oc2VhdEluZGV4KSB7XHJcblx0dGhpcy5wb3NpdGlvbi54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiZGVhbGVyQnV0dG9uUG9zaXRpb25zXCIpW3NlYXRJbmRleF0ueDtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJkZWFsZXJCdXR0b25Qb3NpdGlvbnNcIilbc2VhdEluZGV4XS55O1xyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQW5pbWF0ZSB0byBzZWF0IGluZGV4LlxyXG4gKiBAbWV0aG9kIGFuaW1hdGVUb1NlYXRJbmRleFxyXG4gKi9cclxuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuYW5pbWF0ZVRvU2VhdEluZGV4ID0gZnVuY3Rpb24oc2VhdEluZGV4KSB7XHJcblx0aWYgKCF0aGlzLnZpc2libGUpIHtcclxuXHRcdHRoaXMuc2V0U2VhdEluZGV4KHNlYXRJbmRleCk7XHJcblx0XHQvLyB0b2RvIGRpc3BhdGNoIGV2ZW50IHRoYXQgaXQncyBjb21wbGV0ZT9cclxuXHRcdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdHZhciBkZXN0aW5hdGlvbiA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImRlYWxlckJ1dHRvblBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdO1xyXG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XHJcblx0dmFyIGRpZmZZID0gdGhpcy5wb3NpdGlvbi55IC0gZGVzdGluYXRpb24ueTtcclxuXHR2YXIgZGlmZiA9IE1hdGguc3FydChkaWZmWCAqIGRpZmZYICsgZGlmZlkgKiBkaWZmWSk7XHJcblxyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzLnBvc2l0aW9uKVxyXG5cdFx0LnRvKHtcclxuXHRcdFx0eDogZGVzdGluYXRpb24ueCxcclxuXHRcdFx0eTogZGVzdGluYXRpb24ueVxyXG5cdFx0fSwgNSAqIGRpZmYpXHJcblx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0KVxyXG5cdFx0Lm9uQ29tcGxldGUodGhpcy5vblNob3dDb21wbGV0ZS5iaW5kKHRoaXMpKVxyXG5cdFx0LnN0YXJ0KCk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2hvdyBDb21wbGV0ZS5cclxuICogQG1ldGhvZCBvblNob3dDb21wbGV0ZVxyXG4gKi9cclxuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUub25TaG93Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG59XHJcblxyXG4vKipcclxuICogSGlkZS5cclxuICogQG1ldGhvZCBoaWRlXHJcbiAqL1xyXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTaG93LlxyXG4gKiBAbWV0aG9kIHNob3dcclxuICovXHJcbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihzZWF0SW5kZXgsIGFuaW1hdGUpIHtcclxuXHRpZiAodGhpcy52aXNpYmxlICYmIGFuaW1hdGUpIHtcclxuXHRcdHRoaXMuYW5pbWF0ZVRvU2VhdEluZGV4KHNlYXRJbmRleCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRoaXMudmlzaWJsZSA9IHRydWU7XHJcblx0XHR0aGlzLnNldFNlYXRJbmRleChzZWF0SW5kZXgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEZWFsZXJCdXR0b25WaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xuXG4vKipcbiAqIERpYWxvZyBidXR0b24uXG4gKiBAY2xhc3MgRGlhbG9nQnV0dG9uXG4gKi9cbmZ1bmN0aW9uIERpYWxvZ0J1dHRvbigpIHtcblx0QnV0dG9uLmNhbGwodGhpcyk7XG5cblx0dGhpcy5idXR0b25UZXh0dXJlID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImRpYWxvZ0J1dHRvblwiKTtcblx0dGhpcy5hZGRDaGlsZChuZXcgUElYSS5TcHJpdGUodGhpcy5idXR0b25UZXh0dXJlKSk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwibm9ybWFsIDE0cHggQXJpYWxcIixcblx0XHRmaWxsOiBcIiNmZmZmZmZcIlxuXHR9O1xuXG5cdHRoaXMudGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt0ZXN0XVwiLCBzdHlsZSk7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnkgPSAxNTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZCk7XG5cblx0dGhpcy5zZXRUZXh0KFwiQlROXCIpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKERpYWxvZ0J1dHRvbiwgQnV0dG9uKTtcblxuLyoqXG4gKiBTZXQgdGV4dCBmb3IgdGhlIGJ1dHRvbi5cbiAqIEBtZXRob2Qgc2V0VGV4dFxuICovXG5EaWFsb2dCdXR0b24ucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHRoaXMudGV4dEZpZWxkLnNldFRleHQodGV4dCk7XG5cdHRoaXMudGV4dEZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXHR0aGlzLnRleHRGaWVsZC54ID0gdGhpcy5idXR0b25UZXh0dXJlLndpZHRoIC8gMiAtIHRoaXMudGV4dEZpZWxkLndpZHRoIC8gMjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaWFsb2dCdXR0b247IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIE5pbmVTbGljZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9OaW5lU2xpY2VcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgRGlhbG9nQnV0dG9uID0gcmVxdWlyZShcIi4vRGlhbG9nQnV0dG9uXCIpO1xudmFyIEJ1dHRvbkRhdGEgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vZGF0YS9CdXR0b25EYXRhXCIpO1xudmFyIFBpeGlUZXh0SW5wdXQgPSByZXF1aXJlKFwiUGl4aVRleHRJbnB1dFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xuLyoqXG4gKiBEaWFsb2cgdmlldy5cbiAqIEBjbGFzcyBEaWFsb2dWaWV3XG4gKi9cbmZ1bmN0aW9uIERpYWxvZ1ZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHZhciBjb3ZlciA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdGNvdmVyLmJlZ2luRmlsbCgweDAwMDAwMCwgLjUpO1xuXHRjb3Zlci5kcmF3UmVjdCgwLCAwLCA5NjAsIDcyMCk7XG5cdGNvdmVyLmVuZEZpbGwoKTtcblx0Y292ZXIuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHQvL2NvdmVyLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXHRjb3Zlci5oaXRBcmVhID0gbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIDk2MCwgNzIwKTtcblx0dGhpcy5hZGRDaGlsZChjb3Zlcik7XG5cblx0dmFyIGIgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJmcmFtZVBsYXRlXCIpLCAxMCk7XG5cdGIuc2V0TG9jYWxTaXplKDQ4MCwgMjcwKTtcblx0Yi5wb3NpdGlvbi54ID0gNDgwIC0gNDgwIC8gMjtcblx0Yi5wb3NpdGlvbi55ID0gMzYwIC0gMjcwIC8gMjtcblx0dGhpcy5hZGRDaGlsZChiKTtcblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxNHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdGV4dF1cIiwgc3R5bGUpO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi54ID0gYi5wb3NpdGlvbi54ICsgMjA7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnkgPSBiLnBvc2l0aW9uLnkgKyAyMDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZCk7XG5cblx0dGhpcy5idXR0b25zSG9sZGVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmJ1dHRvbnNIb2xkZXIucG9zaXRpb24ueSA9IDQzMDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJ1dHRvbnNIb2xkZXIpO1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IDI7IGkrKykge1xuXHRcdHZhciBiID0gbmV3IERpYWxvZ0J1dHRvbigpO1xuXG5cdFx0Yi5wb3NpdGlvbi54ID0gaSAqIDkwO1xuXHRcdGIub24oXCJjbGlja1wiLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xuXHRcdHRoaXMuYnV0dG9uc0hvbGRlci5hZGRDaGlsZChiKTtcblx0XHR0aGlzLmJ1dHRvbnMucHVzaChiKTtcblx0fVxuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwibm9ybWFsIDE4cHggQXJpYWxcIlxuXHR9O1xuXG5cdHRoaXMuaW5wdXRGaWVsZCA9IG5ldyBQaXhpVGV4dElucHV0KFwiXCIsIHN0eWxlKTtcblx0dGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnggPSB0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi54O1xuXG5cdHRoaXMuaW5wdXRGcmFtZSA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdHRoaXMuaW5wdXRGcmFtZS5iZWdpbkZpbGwoMHgwMDAwMDApO1xuXHR0aGlzLmlucHV0RnJhbWUuZHJhd1JlY3QoLTEsIC0xLCAxMDIsIDIzKTtcblx0dGhpcy5pbnB1dEZyYW1lLnBvc2l0aW9uLnggPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmlucHV0RnJhbWUpO1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5pbnB1dEZpZWxkKTtcblxuXHR0aGlzLmhpZGUoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChEaWFsb2dWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoRGlhbG9nVmlldyk7XG5cbkRpYWxvZ1ZpZXcuQlVUVE9OX0NMSUNLID0gXCJidXR0b25DbGlja1wiO1xuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuRGlhbG9nVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cbkRpYWxvZ1ZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbih0ZXh0LCBidXR0b25JZHMsIGRlZmF1bHRWYWx1ZSkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXG5cdHRoaXMuYnV0dG9uSWRzID0gYnV0dG9uSWRzO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAoaSA8IGJ1dHRvbklkcy5sZW5ndGgpIHtcblx0XHRcdHZhciBidXR0b24gPSB0aGlzLmJ1dHRvbnNbaV1cblx0XHRcdGJ1dHRvbi5zZXRUZXh0KEJ1dHRvbkRhdGEuZ2V0QnV0dG9uU3RyaW5nRm9ySWQoYnV0dG9uSWRzW2ldKSk7XG5cdFx0XHRidXR0b24udmlzaWJsZSA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuYnV0dG9uc1tpXS52aXNpYmxlID0gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5idXR0b25zSG9sZGVyLnggPSA0ODAgLSBidXR0b25JZHMubGVuZ3RoICogOTAgLyAyO1xuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KHRleHQpO1xuXG5cdGlmIChkZWZhdWx0VmFsdWUpIHtcblx0XHR0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueSA9IHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnkgKyB0aGlzLnRleHRGaWVsZC5oZWlnaHQgKyAyMDtcblx0XHR0aGlzLmlucHV0RnJhbWUucG9zaXRpb24ueSA9IHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55O1xuXHRcdHRoaXMuaW5wdXRGaWVsZC52aXNpYmxlID0gdHJ1ZTtcblx0XHR0aGlzLmlucHV0RnJhbWUudmlzaWJsZSA9IHRydWU7XG5cblx0XHR0aGlzLmlucHV0RmllbGQudGV4dCA9IGRlZmF1bHRWYWx1ZTtcblx0XHR0aGlzLmlucHV0RmllbGQuZm9jdXMoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmlucHV0RmllbGQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuaW5wdXRGcmFtZS52aXNpYmxlID0gZmFsc2U7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgYnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvbkJ1dHRvbkNsaWNrXG4gKi9cbkRpYWxvZ1ZpZXcucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBidXR0b25JbmRleCA9IC0xO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChlLnRhcmdldCA9PSB0aGlzLmJ1dHRvbnNbaV0pXG5cdFx0XHRidXR0b25JbmRleCA9IGk7XG5cblx0dmFyIHZhbHVlID0gbnVsbDtcblx0aWYgKHRoaXMuaW5wdXRGaWVsZC52aXNpYmxlKVxuXHRcdHZhbHVlID0gdGhpcy5pbnB1dEZpZWxkLnRleHQ7XG5cblx0dmFyIGV2ID0ge1xuXHRcdHR5cGU6IERpYWxvZ1ZpZXcuQlVUVE9OX0NMSUNLLFxuXHRcdGJ1dHRvbjogdGhpcy5idXR0b25JZHNbYnV0dG9uSW5kZXhdLFxuXHRcdHZhbHVlOiB2YWx1ZVxuXHR9O1xuXG5cdHRoaXMudHJpZ2dlcihldik7XG5cdHRoaXMuaGlkZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERpYWxvZ1ZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEdyYWRpZW50ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0dyYWRpZW50XCIpO1xuXG4vKipcbiAqIExvYWRpbmcgc2NyZWVuLlxuICogQGNsYXNzIExvYWRpbmdTY3JlZW5cbiAqL1xuZnVuY3Rpb24gTG9hZGluZ1NjcmVlbigpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dmFyIGdyYWRpZW50ID0gbmV3IEdyYWRpZW50KCk7XG5cdGdyYWRpZW50LnNldFNpemUoMTAwLCAxMDApO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoMCwgXCIjZmZmZmZmXCIpO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoMSwgXCIjYzBjMGMwXCIpO1xuXG5cdHZhciBzID0gZ3JhZGllbnQuY3JlYXRlU3ByaXRlKCk7XG5cdHMud2lkdGggPSA5NjA7XG5cdHMuaGVpZ2h0ID0gNzIwO1xuXHR0aGlzLmFkZENoaWxkKHMpO1xuXG5cdHZhciBzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMjBweCBBcmlhbFwiLFxuXHRcdGZpbGw6IFwiIzgwODA4MFwiXG5cdH07XG5cblx0dGhpcy50ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3RleHRdXCIsIHN0eWxlKTtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueCA9IDk2MCAvIDI7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnkgPSA3MjAgLyAyIC0gdGhpcy50ZXh0RmllbGQuaGVpZ2h0IC8gMjtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoTG9hZGluZ1NjcmVlbiwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cbkxvYWRpbmdTY3JlZW4ucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG5cdHRoaXMudGV4dEZpZWxkLnNldFRleHQobWVzc2FnZSk7XG5cdHRoaXMudGV4dEZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXHR0aGlzLnRleHRGaWVsZC54ID0gOTYwIC8gMiAtIHRoaXMudGV4dEZpZWxkLndpZHRoIC8gMjtcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cbkxvYWRpbmdTY3JlZW4ucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGluZ1NjcmVlbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBTZWF0VmlldyA9IHJlcXVpcmUoXCIuL1NlYXRWaWV3XCIpO1xudmFyIENhcmRWaWV3ID0gcmVxdWlyZShcIi4vQ2FyZFZpZXdcIik7XG52YXIgQ2hhdFZpZXcgPSByZXF1aXJlKFwiLi9DaGF0Vmlld1wiKTtcbnZhciBQb2ludCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Qb2ludFwiKTtcbnZhciBHcmFkaWVudCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9HcmFkaWVudFwiKTtcbnZhciBCdXR0b25zVmlldyA9IHJlcXVpcmUoXCIuL0J1dHRvbnNWaWV3XCIpO1xudmFyIERpYWxvZ1ZpZXcgPSByZXF1aXJlKFwiLi9EaWFsb2dWaWV3XCIpO1xudmFyIERlYWxlckJ1dHRvblZpZXcgPSByZXF1aXJlKFwiLi9EZWFsZXJCdXR0b25WaWV3XCIpO1xudmFyIENoaXBzVmlldyA9IHJlcXVpcmUoXCIuL0NoaXBzVmlld1wiKTtcbnZhciBQb3RWaWV3ID0gcmVxdWlyZShcIi4vUG90Vmlld1wiKTtcbnZhciBUaW1lclZpZXcgPSByZXF1aXJlKFwiLi9UaW1lclZpZXdcIik7XG52YXIgU2V0dGluZ3NWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvU2V0dGluZ3NWaWV3XCIpO1xuXG4vKipcbiAqIE5ldCBwb2tlciBjbGllbnQgdmlldy5cbiAqIEBjbGFzcyBOZXRQb2tlckNsaWVudFZpZXdcbiAqL1xuZnVuY3Rpb24gTmV0UG9rZXJDbGllbnRWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnNldHVwQmFja2dyb3VuZCgpO1xuXG5cdHRoaXMudGFibGVDb250YWluZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50YWJsZUNvbnRhaW5lcik7XG5cblx0dGhpcy50YWJsZUJhY2tncm91bmQgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRhYmxlQmFja2dyb3VuZFwiKSk7XG5cdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQodGhpcy50YWJsZUJhY2tncm91bmQpO1xuXG5cdHRoaXMuc2V0dXBTZWF0cygpO1xuXHR0aGlzLnNldHVwQ29tbXVuaXR5Q2FyZHMoKTtcblxuXHR0aGlzLnRpbWVyVmlldyA9IG5ldyBUaW1lclZpZXcoKTtcblx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnRpbWVyVmlldyk7XG5cblx0dGhpcy5jaGF0VmlldyA9IG5ldyBDaGF0VmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY2hhdFZpZXcpO1xuXG5cdHRoaXMuYnV0dG9uc1ZpZXcgPSBuZXcgQnV0dG9uc1ZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJ1dHRvbnNWaWV3KTtcblxuXHR0aGlzLmRpYWxvZ1ZpZXcgPSBuZXcgRGlhbG9nVmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuZGlhbG9nVmlldyk7XG5cblx0dGhpcy5kZWFsZXJCdXR0b25WaWV3ID0gbmV3IERlYWxlckJ1dHRvblZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmRlYWxlckJ1dHRvblZpZXcpO1xuXG5cdHRoaXMucG90VmlldyA9IG5ldyBQb3RWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5wb3RWaWV3KTtcblx0dGhpcy5wb3RWaWV3LnBvc2l0aW9uLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLng7XG5cdHRoaXMucG90Vmlldy5wb3NpdGlvbi55ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS55O1xuXG5cdHRoaXMuc2V0dGluZ3NWaWV3ID0gbmV3IFNldHRpbmdzVmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuc2V0dGluZ3NWaWV3KTtcblxuXHR0aGlzLnNldHVwQ2hpcHMoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChOZXRQb2tlckNsaWVudFZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChOZXRQb2tlckNsaWVudFZpZXcpO1xuXG5OZXRQb2tlckNsaWVudFZpZXcuU0VBVF9DTElDSyA9IFwic2VhdENsaWNrXCI7XG5cbi8qKlxuICogU2V0dXAgYmFja2dyb3VuZC5cbiAqIEBtZXRob2Qgc2V0dXBCYWNrZ3JvdW5kXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuc2V0dXBCYWNrZ3JvdW5kID0gZnVuY3Rpb24oKSB7XG5cdHZhciBncmFkaWVudCA9IG5ldyBHcmFkaWVudCgpO1xuXHRncmFkaWVudC5zZXRTaXplKDEwMCwgMTAwKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIFwiIzYwNjA2MFwiKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKC41LCBcIiNhMGEwYTBcIik7XG5cdGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLCBcIiM5MDkwOTBcIik7XG5cblx0dmFyIHMgPSBncmFkaWVudC5jcmVhdGVTcHJpdGUoKTtcblx0cy53aWR0aCA9IDk2MDtcblx0cy5oZWlnaHQgPSA3MjA7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0dmFyIHMgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImRpdmlkZXJMaW5lXCIpKTtcblx0cy54ID0gMzQ1O1xuXHRzLnkgPSA1NDA7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0dmFyIHMgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImRpdmlkZXJMaW5lXCIpKTtcblx0cy54ID0gNjkzO1xuXHRzLnkgPSA1NDA7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG59XG5cbi8qKlxuICogU2V0dXAgc2VhdHMuXG4gKiBAbWV0aG9kIHNlcnVwU2VhdHNcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cFNlYXRzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpLCBqO1xuXHR2YXIgcG9ja2V0Q2FyZHM7XG5cblx0dGhpcy5zZWF0Vmlld3MgPSBbXTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKS5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBzZWF0VmlldyA9IG5ldyBTZWF0VmlldyhpKTtcblx0XHR2YXIgcCA9IHNlYXRWaWV3LnBvc2l0aW9uO1xuXG5cdFx0Zm9yIChqID0gMDsgaiA8IDI7IGorKykge1xuXHRcdFx0dmFyIGMgPSBuZXcgQ2FyZFZpZXcoKTtcblx0XHRcdGMuaGlkZSgpO1xuXHRcdFx0Yy5zZXRUYXJnZXRQb3NpdGlvbihQb2ludChwLnggKyBqICogMzAgLSA2MCwgcC55IC0gMTAwKSk7XG5cdFx0XHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKGMpO1xuXHRcdFx0c2VhdFZpZXcuYWRkUG9ja2V0Q2FyZChjKTtcblx0XHRcdHNlYXRWaWV3Lm9uKFwiY2xpY2tcIiwgdGhpcy5vblNlYXRDbGljaywgdGhpcyk7XG5cdFx0fVxuXG5cdFx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZChzZWF0Vmlldyk7XG5cdFx0dGhpcy5zZWF0Vmlld3MucHVzaChzZWF0Vmlldyk7XG5cdH1cbn1cblxuLyoqXG4gKiBTZXR1cCBjaGlwcy5cbiAqIEBtZXRob2Qgc2VydXBTZWF0c1xuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLnNldHVwQ2hpcHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGk7XG5cdGZvciAoaSA9IDA7IGkgPCBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJiZXRQb3NpdGlvbnNcIikubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2hpcHNWaWV3ID0gbmV3IENoaXBzVmlldygpO1xuXHRcdHRoaXMuc2VhdFZpZXdzW2ldLmJldENoaXBzID0gY2hpcHNWaWV3O1xuXG5cdFx0Y2hpcHNWaWV3LnNldEFsaWdubWVudChSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRWYWx1ZShcImJldEFsaWduXCIpW2ldKTtcblx0XHRjaGlwc1ZpZXcuc2V0VGFyZ2V0UG9zaXRpb24oUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiYmV0UG9zaXRpb25zXCIpW2ldKTtcblx0XHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKGNoaXBzVmlldyk7XG5cdH1cbn1cblxuLyoqXG4gKiBTZWF0IGNsaWNrLlxuICogQG1ldGhvZCBvblNlYXRDbGlja1xuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5vblNlYXRDbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0dmFyIHNlYXRJbmRleCA9IC0xO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXG5cdFx0aWYgKGUudGFyZ2V0ID09IHRoaXMuc2VhdFZpZXdzW2ldKVxuXHRcdFx0c2VhdEluZGV4ID0gaTtcblxuXHRjb25zb2xlLmxvZyhcInNlYXQgY2xpY2s6IFwiICsgc2VhdEluZGV4KTtcblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBOZXRQb2tlckNsaWVudFZpZXcuU0VBVF9DTElDSyxcblx0XHRzZWF0SW5kZXg6IHNlYXRJbmRleFxuXHR9KTtcbn1cblxuLyoqXG4gKiBTZXR1cCBjb21tdW5pdHkgY2FyZHMuXG4gKiBAbWV0aG9kIHNldHVwQ29tbXVuaXR5Q2FyZHNcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuc2V0dXBDb21tdW5pdHlDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNvbW11bml0eUNhcmRzID0gW107XG5cblx0dmFyIHAgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcImNvbW11bml0eUNhcmRzUG9zaXRpb25cIik7XG5cblx0Zm9yIChpID0gMDsgaSA8IDU7IGkrKykge1xuXHRcdHZhciBjYXJkVmlldyA9IG5ldyBDYXJkVmlldygpO1xuXHRcdGNhcmRWaWV3LmhpZGUoKTtcblx0XHRjYXJkVmlldy5zZXRUYXJnZXRQb3NpdGlvbihQb2ludChwLnggKyBpICogOTAsIHAueSkpO1xuXG5cdFx0dGhpcy5jb21tdW5pdHlDYXJkcy5wdXNoKGNhcmRWaWV3KTtcblx0XHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKGNhcmRWaWV3KTtcblx0fVxufVxuXG4vKipcbiAqIEdldCBzZWF0IHZpZXcgYnkgaW5kZXguXG4gKiBAbWV0aG9kIGdldFNlYXRWaWV3QnlJbmRleFxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmdldFNlYXRWaWV3QnlJbmRleCA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdHJldHVybiB0aGlzLnNlYXRWaWV3c1tpbmRleF07XG59XG5cbi8qKlxuICogR2V0IHNlYXQgdmlldyBieSBpbmRleC5cbiAqIEBtZXRob2QgZ2V0U2VhdFZpZXdCeUluZGV4XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0Q29tbXVuaXR5Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY29tbXVuaXR5Q2FyZHM7XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbnMgdmlldy5cbiAqIEBtZXRob2QgZ2V0U2VhdFZpZXdCeUluZGV4XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0QnV0dG9uc1ZpZXcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uc1ZpZXc7XG59XG5cbi8qKlxuICogR2V0IGRpYWxvZyB2aWV3LlxuICogQG1ldGhvZCBnZXREaWFsb2dWaWV3XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0RGlhbG9nVmlldyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kaWFsb2dWaWV3O1xufVxuXG4vKipcbiAqIEdldCBkaWFsb2cgdmlldy5cbiAqIEBtZXRob2QgZ2V0RGVhbGVyQnV0dG9uVmlld1xuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmdldERlYWxlckJ1dHRvblZpZXcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZGVhbGVyQnV0dG9uVmlldztcbn1cblxuLyoqXG4gKiBDbGVhciBldmVyeXRoaW5nIHRvIGFuIGVtcHR5IHN0YXRlLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLmNvbW11bml0eUNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuY29tbXVuaXR5Q2FyZHNbaV0uaGlkZSgpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLnNlYXRWaWV3c1tpXS5jbGVhcigpO1xuXG5cdHRoaXMudGltZXJWaWV3LmhpZGUoKTtcblx0dGhpcy5wb3RWaWV3LnNldFZhbHVlcyhuZXcgQXJyYXkoKSk7XG5cdHRoaXMuZGVhbGVyQnV0dG9uVmlldy5oaWRlKCk7XG5cdHRoaXMuY2hhdFZpZXcuY2xlYXIoKTtcblxuXHR0aGlzLmRpYWxvZ1ZpZXcuaGlkZSgpO1xuXHR0aGlzLmJ1dHRvbnNWaWV3LmNsZWFyKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmV0UG9rZXJDbGllbnRWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIENoaXBzVmlldyA9IHJlcXVpcmUoXCIuL0NoaXBzVmlld1wiKTtcblxuXG5cbi8qKlxuICogQSBwb3Qgdmlld1xuICogQGNsYXNzIFBvdFZpZXdcbiAqL1xuZnVuY3Rpb24gUG90VmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cdFxuXHR0aGlzLnZhbHVlID0gMDtcblxuXHR0aGlzLmhvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmhvbGRlcik7XG5cblx0dGhpcy5zdGFja3MgPSBuZXcgQXJyYXkoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChQb3RWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoUG90Vmlldyk7XG5cbi8qKlxuICogU2V0IHZhbHVlLlxuICogQG1ldGhvZCBzZXRWYWx1ZVxuICovXG5Qb3RWaWV3LnByb3RvdHlwZS5zZXRWYWx1ZXMgPSBmdW5jdGlvbih2YWx1ZXMpIHtcblx0XG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnN0YWNrcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmhvbGRlci5yZW1vdmVDaGlsZCh0aGlzLnN0YWNrc1tpXSk7XG5cblx0dGhpcy5zdGFja3MgPSBuZXcgQXJyYXkoKTtcblxuXHR2YXIgcG9zID0gMDtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNoaXBzID0gbmV3IENoaXBzVmlldyhmYWxzZSk7XG5cdFx0dGhpcy5zdGFja3MucHVzaChjaGlwcyk7XG5cdFx0dGhpcy5ob2xkZXIuYWRkQ2hpbGQoY2hpcHMpO1xuXHRcdGNoaXBzLnNldFZhbHVlKHZhbHVlc1tpXSk7XG5cdFx0Y2hpcHMueCA9IHBvcztcblx0XHRwb3MgKz0gTWF0aC5mbG9vcihjaGlwcy53aWR0aCArIDIwKTtcblxuXHRcdHZhciB0ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KHZhbHVlc1tpXSwge1xuXHRcdFx0Zm9udDogXCJib2xkIDEycHggQXJpYWxcIixcblx0XHRcdGFsaWduOiBcImNlbnRlclwiLFxuXHRcdFx0ZmlsbDogMHhmZmZmZmZcblx0XHR9KTtcblxuXHRcdHRleHRGaWVsZC5wb3NpdGlvbi54ID0gKGNoaXBzLndpZHRoIC0gdGV4dEZpZWxkLndpZHRoKSowLjU7XG5cdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnkgPSAzMDtcblxuXHRcdGNoaXBzLmFkZENoaWxkKHRleHRGaWVsZCk7XG5cdH1cblxuXHR0aGlzLmhvbGRlci54ID0gLXRoaXMuaG9sZGVyLndpZHRoKjAuNTtcbn1cblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cblBvdFZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG59XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5Qb3RWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQb3RWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xudmFyIE5pbmVTbGljZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9OaW5lU2xpY2VcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKFwiLi4vYXBwL1NldHRpbmdzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgQ2hlY2tib3ggPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQ2hlY2tib3hcIik7XG5cblxuXG4vKipcbiAqIFJhaXNlIHNob3J0Y3V0IGJ1dHRvblxuICogQGNsYXNzIFJhaXNlU2hvcnRjdXRCdXR0b25cbiAqL1xuIGZ1bmN0aW9uIFJhaXNlU2hvcnRjdXRCdXR0b24oKSB7XG4gXHR2YXIgYmFja2dyb3VuZCA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImJ1dHRvbkJhY2tncm91bmRcIiksIDEwLCA1LCAxMCwgNSk7XG4gXHRiYWNrZ3JvdW5kLndpZHRoID0gMTA1O1xuIFx0YmFja2dyb3VuZC5oZWlnaHQgPSAyNTtcblx0QnV0dG9uLmNhbGwodGhpcywgYmFja2dyb3VuZCk7XG5cbiBcdHZhciBzdHlsZU9iamVjdCA9IHtcbiBcdFx0d2lkdGg6IDEwNSxcbiBcdFx0aGVpZ2h0OiAyMCxcbiBcdFx0Zm9udDogXCJib2xkIDE0cHggQXJpYWxcIixcbiBcdFx0Y29sb3I6IFwid2hpdGVcIlxuIFx0fTtcblx0dGhpcy5sYWJlbCA9IG5ldyBQSVhJLlRleHQoXCJcIiwgc3R5bGVPYmplY3QpO1xuXHR0aGlzLmxhYmVsLnBvc2l0aW9uLnggPSA4O1xuXHR0aGlzLmxhYmVsLnBvc2l0aW9uLnkgPSA0O1xuXHR0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFJhaXNlU2hvcnRjdXRCdXR0b24sIEJ1dHRvbik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChSYWlzZVNob3J0Y3V0QnV0dG9uKTtcblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuUmFpc2VTaG9ydGN1dEJ1dHRvbi5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHN0cmluZykge1xuXHR0aGlzLmxhYmVsLnNldFRleHQoc3RyaW5nKTtcblx0cmV0dXJuIHN0cmluZztcbn1cblxuLyoqXG4gKiBTZXQgZW5hYmxlZC5cbiAqIEBtZXRob2Qgc2V0RW5hYmxlZFxuICovXG5SYWlzZVNob3J0Y3V0QnV0dG9uLnByb3RvdHlwZS5zZXRFbmFibGVkID0gZnVuY3Rpb24odmFsdWUpIHtcblx0aWYodmFsdWUpIHtcblx0XHR0aGlzLmFscGhhID0gMTtcblx0XHR0aGlzLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0XHR0aGlzLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRoaXMuYWxwaGEgPSAwLjU7XG5cdFx0dGhpcy5pbnRlcmFjdGl2ZSA9IGZhbHNlO1xuXHRcdHRoaXMuYnV0dG9uTW9kZSA9IGZhbHNlO1xuXHR9XG5cdHJldHVybiB2YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSYWlzZVNob3J0Y3V0QnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xuXG4vKipcbiAqIEEgc2VhdCB2aWV3LlxuICogQGNsYXNzIFNlYXRWaWV3XG4gKi9cbmZ1bmN0aW9uIFNlYXRWaWV3KHNlYXRJbmRleCkge1xuXHRCdXR0b24uY2FsbCh0aGlzKTtcblxuXHR0aGlzLnBvY2tldENhcmRzID0gW107XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXG5cdHZhciBzZWF0VGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJzZWF0UGxhdGVcIik7XG5cdHZhciBzZWF0U3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHNlYXRUZXh0dXJlKTtcblxuXHRzZWF0U3ByaXRlLnBvc2l0aW9uLnggPSAtc2VhdFRleHR1cmUud2lkdGggLyAyO1xuXHRzZWF0U3ByaXRlLnBvc2l0aW9uLnkgPSAtc2VhdFRleHR1cmUuaGVpZ2h0IC8gMjtcblxuXHR0aGlzLmFkZENoaWxkKHNlYXRTcHJpdGUpO1xuXG5cdHZhciBwb3MgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJzZWF0UG9zaXRpb25zXCIpW3RoaXMuc2VhdEluZGV4XTtcblxuXHR0aGlzLnBvc2l0aW9uLnggPSBwb3MueDtcblx0dGhpcy5wb3NpdGlvbi55ID0gcG9zLnk7XG5cblx0dmFyIHN0eWxlO1xuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAyMHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLm5hbWVGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbbmFtZV1cIiwgc3R5bGUpO1xuXHR0aGlzLm5hbWVGaWVsZC5wb3NpdGlvbi55ID0gLTIwO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMubmFtZUZpZWxkKTtcblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxMnB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLmNoaXBzRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW25hbWVdXCIsIHN0eWxlKTtcblx0dGhpcy5jaGlwc0ZpZWxkLnBvc2l0aW9uLnkgPSA1O1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY2hpcHNGaWVsZCk7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDIwcHggQXJpYWxcIlxuXHR9O1xuXG5cdHRoaXMuYWN0aW9uRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiYWN0aW9uXCIsIHN0eWxlKTtcblx0dGhpcy5hY3Rpb25GaWVsZC5wb3NpdGlvbi55ID0gLTEzO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYWN0aW9uRmllbGQpO1xuXHR0aGlzLmFjdGlvbkZpZWxkLmFscGhhID0gMDtcblxuXHR0aGlzLnNldE5hbWUoXCJcIik7XG5cdHRoaXMuc2V0Q2hpcHMoXCJcIik7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2VhdFZpZXcsIEJ1dHRvbik7XG5cbi8qKlxuICogU2V0IG5hbWUuXG4gKiBAbWV0aG9kIHNldE5hbWVcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLnNldE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG5cdHRoaXMubmFtZUZpZWxkLnNldFRleHQobmFtZSk7XG5cdHRoaXMubmFtZUZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXG5cdHRoaXMubmFtZUZpZWxkLnBvc2l0aW9uLnggPSAtdGhpcy5uYW1lRmllbGQuY2FudmFzLndpZHRoIC8gMjtcbn1cblxuLyoqXG4gKiBTZXQgbmFtZS5cbiAqIEBtZXRob2Qgc2V0Q2hpcHNcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLnNldENoaXBzID0gZnVuY3Rpb24oY2hpcHMpIHtcblx0dGhpcy5jaGlwc0ZpZWxkLnNldFRleHQoY2hpcHMpO1xuXHR0aGlzLmNoaXBzRmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cblx0dGhpcy5jaGlwc0ZpZWxkLnBvc2l0aW9uLnggPSAtdGhpcy5jaGlwc0ZpZWxkLmNhbnZhcy53aWR0aCAvIDI7XG59XG5cbi8qKlxuICogU2V0IHNpdG91dC5cbiAqIEBtZXRob2Qgc2V0U2l0b3V0XG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXRTaXRvdXQgPSBmdW5jdGlvbihzaXRvdXQpIHtcblx0aWYgKHNpdG91dClcblx0XHR0aGlzLmFscGhhID0gLjU7XG5cblx0ZWxzZVxuXHRcdHRoaXMuYWxwaGEgPSAxO1xufVxuXG4vKipcbiAqIFNldCBzaXRvdXQuXG4gKiBAbWV0aG9kIHNldEFjdGl2ZVxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuc2V0QWN0aXZlID0gZnVuY3Rpb24oYWN0aXZlKSB7XG5cdHRoaXMudmlzaWJsZSA9IGFjdGl2ZTtcbn1cblxuLyoqXG4gKiBBZGQgcG9ja2V0IGNhcmQuXG4gKiBAbWV0aG9kIGFkZFBvY2tldENhcmRcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLmFkZFBvY2tldENhcmQgPSBmdW5jdGlvbihjYXJkVmlldykge1xuXHR0aGlzLnBvY2tldENhcmRzLnB1c2goY2FyZFZpZXcpO1xufVxuXG4vKipcbiAqIEdldCBwb2NrZXQgY2FyZHMuXG4gKiBAbWV0aG9kIGdldFBvY2tldENhcmRzXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5nZXRQb2NrZXRDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5wb2NrZXRDYXJkcztcbn1cblxuLyoqXG4gKiBGb2xkIGNhcmRzLlxuICogQG1ldGhvZCBmb2xkQ2FyZHNcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLmZvbGRDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnBvY2tldENhcmRzWzBdLmFkZEV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMub25Gb2xkQ29tcGxldGUsIHRoaXMpO1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5wb2NrZXRDYXJkcy5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMucG9ja2V0Q2FyZHNbaV0uZm9sZCgpO1xuXHR9XG59XG5cbi8qKlxuICogRm9sZCBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25Gb2xkQ29tcGxldGVcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLm9uRm9sZENvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucG9ja2V0Q2FyZHNbMF0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFuaW1hdGlvbkRvbmVcIiwgdGhpcy5vbkZvbGRDb21wbGV0ZSwgdGhpcyk7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIik7XG59XG5cbi8qKlxuICogU2hvdyB1c2VyIGFjdGlvbi5cbiAqIEBtZXRob2QgYWN0aW9uXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5hY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0dGhpcy5hY3Rpb25GaWVsZC5zZXRUZXh0KGFjdGlvbik7XG5cdHRoaXMuYWN0aW9uRmllbGQucG9zaXRpb24ueCA9IC10aGlzLmFjdGlvbkZpZWxkLmNhbnZhcy53aWR0aCAvIDI7XG5cblx0dGhpcy5hY3Rpb25GaWVsZC5hbHBoYSA9IDE7XG5cdHRoaXMubmFtZUZpZWxkLmFscGhhID0gMDtcblx0dGhpcy5jaGlwc0ZpZWxkLmFscGhhID0gMDtcblxuXHRzZXRUaW1lb3V0KHRoaXMub25UaW1lci5iaW5kKHRoaXMpLCAxMDAwKTtcbn1cblxuLyoqXG4gKiBTaG93IHVzZXIgYWN0aW9uLlxuICogQG1ldGhvZCBhY3Rpb25cbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLm9uVGltZXIgPSBmdW5jdGlvbihhY3Rpb24pIHtcblxuXHR2YXIgdDEgPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5hY3Rpb25GaWVsZClcblx0XHRcdFx0XHRcdFx0LnRvKHthbHBoYTogMH0sIDEwMDApXG5cdFx0XHRcdFx0XHRcdC5zdGFydCgpO1xuXHR2YXIgdDIgPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5uYW1lRmllbGQpXG5cdFx0XHRcdFx0XHRcdC50byh7YWxwaGE6IDF9LCAxMDAwKVxuXHRcdFx0XHRcdFx0XHQuc3RhcnQoKTtcblx0dmFyIHQzID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMuY2hpcHNGaWVsZClcblx0XHRcdFx0XHRcdFx0LnRvKHthbHBoYTogMX0sIDEwMDApXG5cdFx0XHRcdFx0XHRcdC5zdGFydCgpO1xuXG59XG5cbi8qKlxuICogQ2xlYXIuXG4gKiBAbWV0aG9kIGNsZWFyXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaTtcblxuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXHR0aGlzLnNpdG91dCA9IGZhbHNlO1xuXHQvL3NlYXQuYmV0Q2hpcHMuc2V0VmFsdWUoMCk7XG5cdHRoaXMuc2V0TmFtZShcIlwiKTtcblx0dGhpcy5zZXRDaGlwcyhcIlwiKTtcblxuXHRmb3IgKGk9MDsgaTx0aGlzLnBvY2tldENhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMucG9ja2V0Q2FyZHNbaV0uaGlkZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXRWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xudmFyIE5pbmVTbGljZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9OaW5lU2xpY2VcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKFwiLi4vYXBwL1NldHRpbmdzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgQ2hlY2tib3ggPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQ2hlY2tib3hcIik7XG5cblxuXG4vKipcbiAqIENoZWNrYm94ZXMgdmlld1xuICogQGNsYXNzIFNldHRpbmdzQ2hlY2tib3hcbiAqL1xuIGZ1bmN0aW9uIFNldHRpbmdzQ2hlY2tib3goaWQsIHN0cmluZykge1xuIFx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cbiBcdHRoaXMuaWQgPSBpZDtcblxuIFx0dmFyIHkgPSAwO1xuXG4gXHR2YXIgc3R5bGVPYmplY3QgPSB7XG4gXHRcdHdpZHRoOiAyMDAsXG4gXHRcdGhlaWdodDogMjUsXG4gXHRcdGZvbnQ6IFwiYm9sZCAxM3B4IEFyaWFsXCIsXG4gXHRcdGNvbG9yOiBcIndoaXRlXCJcbiBcdH07XG4gXHR0aGlzLmxhYmVsID0gbmV3IFBJWEkuVGV4dChzdHJpbmcsIHN0eWxlT2JqZWN0KTtcbiBcdHRoaXMubGFiZWwucG9zaXRpb24ueCA9IDI1O1xuIFx0dGhpcy5sYWJlbC5wb3NpdGlvbi55ID0geSArIDE7XG4gXHR0aGlzLmFkZENoaWxkKHRoaXMubGFiZWwpO1xuXG4gXHR2YXIgYmFja2dyb3VuZCA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hlY2tib3hCYWNrZ3JvdW5kXCIpKTtcbiBcdHZhciB0aWNrID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGVja2JveFRpY2tcIikpO1xuIFx0dGljay54ID0gMTtcblxuIFx0dGhpcy5jaGVja2JveCA9IG5ldyBDaGVja2JveChiYWNrZ3JvdW5kLCB0aWNrKTtcbiBcdHRoaXMuY2hlY2tib3gucG9zaXRpb24ueSA9IHk7XG4gXHR0aGlzLmFkZENoaWxkKHRoaXMuY2hlY2tib3gpO1xuXG4gXHR0aGlzLmNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vbkNoZWNrYm94Q2hhbmdlLCB0aGlzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTZXR0aW5nc0NoZWNrYm94LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoU2V0dGluZ3NDaGVja2JveCk7XG5cbi8qKlxuICogQ2hlY2tib3ggY2hhbmdlLlxuICogQG1ldGhvZCBvbkNoZWNrYm94Q2hhbmdlXG4gKi9cblNldHRpbmdzQ2hlY2tib3gucHJvdG90eXBlLm9uQ2hlY2tib3hDaGFuZ2UgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhbmdlXCIsIHRoaXMpO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q2hlY2tlZFxuICovXG5TZXR0aW5nc0NoZWNrYm94LnByb3RvdHlwZS5nZXRDaGVja2VkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNoZWNrYm94LmdldENoZWNrZWQoKTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldENoZWNrZWRcbiAqL1xuU2V0dGluZ3NDaGVja2JveC5wcm90b3R5cGUuc2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKGNoZWNrZWQpIHtcblx0dGhpcy5jaGVja2JveC5zZXRDaGVja2VkKGNoZWNrZWQpO1xuXHRyZXR1cm4gY2hlY2tlZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nc0NoZWNrYm94OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xudmFyIE5pbmVTbGljZSA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9OaW5lU2xpY2VcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgU2V0dGluZ3MgPSByZXF1aXJlKFwiLi4vYXBwL1NldHRpbmdzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgU2V0dGluZ3NDaGVja2JveCA9IHJlcXVpcmUoXCIuL1NldHRpbmdzQ2hlY2tib3hcIik7XG52YXIgUmFpc2VTaG9ydGN1dEJ1dHRvbiA9IHJlcXVpcmUoXCIuL1JhaXNlU2hvcnRjdXRCdXR0b25cIik7XG52YXIgQ2hlY2tib3hNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NoZWNrYm94TWVzc2FnZVwiKTtcblxuXG5cbi8qKlxuICogQSBzZXR0aW5ncyB2aWV3XG4gKiBAY2xhc3MgU2V0dGluZ3NWaWV3XG4gKi9cbiBmdW5jdGlvbiBTZXR0aW5nc1ZpZXcoKSB7XG4gXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuIFx0dmFyIG9iamVjdCA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcbiBcdHZhciBiZyA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoYXRCYWNrZ3JvdW5kXCIpLCAxMCwgMTAsIDEwLCAxMCk7XG4gXHRiZy53aWR0aCA9IDMwO1xuIFx0YmcuaGVpZ2h0ID0gMzA7XG4gXHRvYmplY3QuYWRkQ2hpbGQoYmcpO1xuXG4gXHR2YXIgc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ3cmVuY2hJY29uXCIpKTtcbiBcdHNwcml0ZS54ID0gNTtcbiBcdHNwcml0ZS55ID0gNTtcbiBcdG9iamVjdC5hZGRDaGlsZChzcHJpdGUpO1xuXG4gXHR0aGlzLnNldHRpbmdzQnV0dG9uID0gbmV3IEJ1dHRvbihvYmplY3QpO1xuIFx0dGhpcy5zZXR0aW5nc0J1dHRvbi5wb3NpdGlvbi54ID0gOTYwIC0gMTAgLSB0aGlzLnNldHRpbmdzQnV0dG9uLndpZHRoO1xuIFx0dGhpcy5zZXR0aW5nc0J1dHRvbi5wb3NpdGlvbi55ID0gNTQzO1xuIFx0dGhpcy5zZXR0aW5nc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKEJ1dHRvbi5DTElDSywgdGhpcy5vblNldHRpbmdzQnV0dG9uQ2xpY2ssIHRoaXMpO1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLnNldHRpbmdzQnV0dG9uKTtcblxuIFx0dGhpcy5zZXR0aW5nc01lbnUgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG4gXHRcbiBcdHZhciBtYmcgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGF0QmFja2dyb3VuZFwiKSwgMTAsIDEwLCAxMCwgMTApO1xuIFx0bWJnLndpZHRoID0gMjUwO1xuIFx0bWJnLmhlaWdodCA9IDEwMDtcbiBcdHRoaXMuc2V0dGluZ3NNZW51LmFkZENoaWxkKG1iZyk7XG5cbiBcdHZhciBzdHlsZU9iamVjdCA9IHtcbiBcdFx0Zm9udDogXCJib2xkIDE0cHggQXJpYWxcIixcbiBcdFx0Y29sb3I6IFwiI0ZGRkZGRlwiLFxuIFx0XHR3aWR0aDogMjAwLFxuIFx0XHRoZWlnaHQ6IDIwXG4gXHR9O1xuIFx0dmFyIGxhYmVsID0gbmV3IFBJWEkuVGV4dChcIlNldHRpbmdzXCIsIHN0eWxlT2JqZWN0KTtcbiBcdGxhYmVsLnBvc2l0aW9uLnggPSAxNjtcbiBcdGxhYmVsLnBvc2l0aW9uLnkgPSAxMDtcblxuIFx0dGhpcy5zZXR0aW5nc01lbnUuYWRkQ2hpbGQobGFiZWwpO1xuIFx0dGhpcy5zZXR0aW5nc01lbnUucG9zaXRpb24ueCA9IDk2MCAtIDEwIC0gdGhpcy5zZXR0aW5nc01lbnUud2lkdGg7XG4gXHR0aGlzLnNldHRpbmdzTWVudS5wb3NpdGlvbi55ID0gNTM4IC0gdGhpcy5zZXR0aW5nc01lbnUuaGVpZ2h0O1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLnNldHRpbmdzTWVudSk7XG5cbiBcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblxuIFx0dGhpcy5jcmVhdGVNZW51U2V0dGluZyhcInBsYXlBbmltYXRpb25zXCIsIFwiUGxheSBhbmltYXRpb25zXCIsIDQwLCBTZXR0aW5ncy5nZXRJbnN0YW5jZSgpLnBsYXlBbmltYXRpb25zKTtcbiBcdHRoaXMuY3JlYXRlTWVudVNldHRpbmcoQ2hlY2tib3hNZXNzYWdlLkFVVE9fTVVDS19MT1NJTkcsIFwiTXVjayBsb3NpbmcgaGFuZHNcIiwgNjUpO1xuXG4gXHR0aGlzLmNyZWF0ZVNldHRpbmcoQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFMsIFwiUG9zdCBibGluZHNcIiwgMCk7XG4gXHR0aGlzLmNyZWF0ZVNldHRpbmcoQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhULCBcIlNpdCBvdXRcIiwgMjUpO1xuXG4gXHR0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlID0gZmFsc2U7XG5cbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24gPSBuZXcgUmFpc2VTaG9ydGN1dEJ1dHRvbigpO1xuIFx0dGhpcy5idXlDaGlwc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5vbkJ1eUNoaXBzQ2xpY2ssIHRoaXMpO1xuIFx0dGhpcy5idXlDaGlwc0J1dHRvbi54ID0gNzAwO1xuIFx0dGhpcy5idXlDaGlwc0J1dHRvbi55ID0gNjM1O1xuIFx0dGhpcy5idXlDaGlwc0J1dHRvbi5zZXRUZXh0KFwiQnV5IGNoaXBzXCIpO1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLmJ1eUNoaXBzQnV0dG9uKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTZXR0aW5nc1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChTZXR0aW5nc1ZpZXcpO1xuXG5TZXR0aW5nc1ZpZXcuQlVZX0NISVBTX0NMSUNLID0gXCJidXlDaGlwc0NsaWNrXCI7XG5cbi8qKlxuICogT24gYnV5IGNoaXBzIGJ1dHRvbiBjbGlja2VkLlxuICogQG1ldGhvZCBvbkJ1eUNoaXBzQ2xpY2tcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vbkJ1eUNoaXBzQ2xpY2sgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0Y29uc29sZS5sb2coXCJidXkgY2hpcHMgY2xpY2tcIik7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChTZXR0aW5nc1ZpZXcuQlVZX0NISVBTX0NMSUNLKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgY2hlY2tib3guXG4gKiBAbWV0aG9kIGNyZWF0ZU1lbnVTZXR0aW5nXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuY3JlYXRlTWVudVNldHRpbmcgPSBmdW5jdGlvbihpZCwgc3RyaW5nLCB5LCBkZWYpIHtcblx0dmFyIHNldHRpbmcgPSBuZXcgU2V0dGluZ3NDaGVja2JveChpZCwgc3RyaW5nKTtcblxuXHRzZXR0aW5nLnkgPSB5O1xuXHRzZXR0aW5nLnggPSAxNjtcblx0dGhpcy5zZXR0aW5nc01lbnUuYWRkQ2hpbGQoc2V0dGluZyk7XG5cblx0c2V0dGluZy5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25DaGVja2JveENoYW5nZSwgdGhpcylcblxuXHR0aGlzLnNldHRpbmdzW2lkXSA9IHNldHRpbmc7XG5cdHNldHRpbmcuc2V0Q2hlY2tlZChkZWYpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBzZXR0aW5nLlxuICogQG1ldGhvZCBjcmVhdGVTZXR0aW5nXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuY3JlYXRlU2V0dGluZyA9IGZ1bmN0aW9uKGlkLCBzdHJpbmcsIHkpIHtcblx0dmFyIHNldHRpbmcgPSBuZXcgU2V0dGluZ3NDaGVja2JveChpZCwgc3RyaW5nKTtcblxuXHRzZXR0aW5nLnkgPSA1NDUreTtcblx0c2V0dGluZy54ID0gNzAwO1xuXHR0aGlzLmFkZENoaWxkKHNldHRpbmcpO1xuXG5cdHNldHRpbmcuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uQ2hlY2tib3hDaGFuZ2UsIHRoaXMpXG5cblx0dGhpcy5zZXR0aW5nc1tpZF0gPSBzZXR0aW5nO1xufVxuXG4vKipcbiAqIENoZWNrYm94IGNoYW5nZS5cbiAqIEBtZXRob2Qgb25DaGVja2JveENoYW5nZVxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uQ2hlY2tib3hDaGFuZ2UgPSBmdW5jdGlvbihjaGVja2JveCkge1xuXHRpZihjaGVja2JveC5pZCA9PSBcInBsYXlBbmltYXRpb25zXCIpIHtcblx0XHRTZXR0aW5ncy5nZXRJbnN0YW5jZSgpLnBsYXlBbmltYXRpb25zID0gY2hlY2tib3guZ2V0Q2hlY2tlZCgpO1xuXHRcdGNvbnNvbGUubG9nKFwiYW5pbXMgY2hhbmdlZC4uXCIpO1xuXHR9XG5cblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhbmdlXCIsIGNoZWNrYm94LmlkLCBjaGVja2JveC5nZXRDaGVja2VkKCkpO1xufVxuXG4vKipcbiAqIFNldHRpbmdzIGJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25TZXR0aW5nc0J1dHRvbkNsaWNrXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUub25TZXR0aW5nc0J1dHRvbkNsaWNrID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGNvbnNvbGUubG9nKFwiU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vblNldHRpbmdzQnV0dG9uQ2xpY2tcIik7XG5cdHRoaXMuc2V0dGluZ3NNZW51LnZpc2libGUgPSAhdGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZTtcblxuXHRpZih0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlKSB7XG5cdFx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSB0aGlzLm9uU3RhZ2VNb3VzZURvd24uYmluZCh0aGlzKTtcblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IG51bGw7XG5cdH1cbn1cblxuLyoqXG4gKiBTdGFnZSBtb3VzZSBkb3duLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VEb3duXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUub25TdGFnZU1vdXNlRG93biA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRjb25zb2xlLmxvZyhcIlNldHRpbmdzVmlldy5wcm90b3R5cGUub25TdGFnZU1vdXNlRG93blwiKTtcblx0aWYoKHRoaXMuaGl0VGVzdCh0aGlzLnNldHRpbmdzTWVudSwgaW50ZXJhY3Rpb25fb2JqZWN0KSkgfHwgKHRoaXMuaGl0VGVzdCh0aGlzLnNldHRpbmdzQnV0dG9uLCBpbnRlcmFjdGlvbl9vYmplY3QpKSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gbnVsbDtcblx0dGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSA9IGZhbHNlO1xufVxuXG4vKipcbiAqIEhpdCB0ZXN0LlxuICogQG1ldGhvZCBoaXRUZXN0XG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuaGl0VGVzdCA9IGZ1bmN0aW9uKG9iamVjdCwgaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPiBvYmplY3QuZ2V0Qm91bmRzKCkueCApICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPCAob2JqZWN0LmdldEJvdW5kcygpLnggKyBvYmplY3QuZ2V0Qm91bmRzKCkud2lkdGgpKSAmJlxuXHRcdChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPiBvYmplY3QuZ2V0Qm91bmRzKCkueSkgJiYgKGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueSA8IChvYmplY3QuZ2V0Qm91bmRzKCkueSArIG9iamVjdC5nZXRCb3VuZHMoKS5oZWlnaHQpKSkge1xuXHRcdHJldHVybiB0cnVlO1x0XHRcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUmVzZXQuXG4gKiBAbWV0aG9kIHJlc2V0XG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5idXlDaGlwc0J1dHRvbi5lbmFibGVkID0gdHJ1ZTtcblx0dGhpcy5zZXRWaXNpYmxlQnV0dG9ucyhbXSk7XG59XG5cbi8qKlxuICogU2V0IHZpc2libGUgYnV0dG9ucy5cbiAqIEBtZXRob2Qgc2V0VmlzaWJsZUJ1dHRvbnNcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5zZXRWaXNpYmxlQnV0dG9ucyA9IGZ1bmN0aW9uKGJ1dHRvbnMpIHtcblx0dGhpcy5idXlDaGlwc0J1dHRvbi52aXNpYmxlID0gYnV0dG9ucy5pbmRleE9mKEJ1dHRvbkRhdGEuQlVZX0NISVBTKSAhPSAtMTtcblx0dGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EU10udmlzaWJsZSA9IGJ1dHRvbnMuaW5kZXhPZihDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EUyk7XG5cdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUXS52aXNpYmxlID0gYnV0dG9ucy5pbmRleE9mKENoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVCk7XG5cblx0dmFyIHlwID0gNTQzO1xuXG5cdGlmKHRoaXMuYnV5Q2hpcHNCdXR0b24udmlzaWJsZSkge1xuXHRcdHRoaXMuYnV5Q2hpcHNCdXR0b24ueSA9IHlwO1xuXHRcdHlwICs9IDM1O1xuXHR9XG5cdGVsc2Uge1xuXHRcdHlwICs9IDI7XG5cdH1cblxuXHRpZih0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTXS52aXNpYmxlKSB7XG5cdFx0dGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EU10ueSA9IHlwO1xuXHRcdHlwICs9IDI1O1xuXHR9XG5cblx0aWYodGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFRdLnZpc2libGUpIHtcblx0XHR0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVF0ueSA9IHlwO1xuXHRcdHlwICs9IDI1O1xuXHR9XG59XG5cbi8qKlxuICogR2V0IGNoZWNrYm94LlxuICogQG1ldGhvZCBnZXRDaGVja2JveEJ5SWRcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5nZXRDaGVja2JveEJ5SWQgPSBmdW5jdGlvbihpZCkge1xuXHRyZXR1cm4gdGhpcy5zZXR0aW5nc1tpZF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3NWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xuXG5cblxuLyoqXG4gKiBBIHRpbWVyIHZpZXdcbiAqIEBjbGFzcyBUaW1lclZpZXdcbiAqL1xuZnVuY3Rpb24gVGltZXJWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblx0XG5cdHRoaXMudGltZXJDbGlwID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0aW1lckJhY2tncm91bmRcIikpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGltZXJDbGlwKTtcblxuXG5cdHRoaXMuY2FudmFzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0dGhpcy5jYW52YXMueCA9IHRoaXMudGltZXJDbGlwLndpZHRoKjAuNTtcblx0dGhpcy5jYW52YXMueSA9IHRoaXMudGltZXJDbGlwLmhlaWdodCowLjU7XG5cdHRoaXMudGltZXJDbGlwLmFkZENoaWxkKHRoaXMuY2FudmFzKTtcblxuXHR0aGlzLnRpbWVyQ2xpcC52aXNpYmxlID0gZmFsc2U7XG5cblx0dGhpcy50d2VlbiA9IG51bGw7XG5cblx0Ly90aGlzLnNob3dQZXJjZW50KDMwKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChUaW1lclZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChUaW1lclZpZXcpO1xuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudGltZXJDbGlwLnZpc2libGUgPSBmYWxzZTtcblx0dGhpcy5zdG9wKCk7XG59XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5UaW1lclZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihzZWF0SW5kZXgpIHtcblx0XG5cdHRoaXMudGltZXJDbGlwLnZpc2libGUgPSB0cnVlO1xuXHR0aGlzLnRpbWVyQ2xpcC54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLnggKyA1NTtcblx0dGhpcy50aW1lckNsaXAueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcInNlYXRQb3NpdGlvbnNcIilbc2VhdEluZGV4XS55IC0gMzA7XG5cblx0dGhpcy5zdG9wKCk7XG5cbn1cblxuLyoqXG4gKiBTdG9wLlxuICogQG1ldGhvZCBzdG9wXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xuXHRpZih0aGlzLnR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy50d2Vlbi5zdG9wKCk7XG5cbn1cblxuLyoqXG4gKiBDb3VudGRvd24uXG4gKiBAbWV0aG9kIGNvdW50ZG93blxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLmNvdW50ZG93biA9IGZ1bmN0aW9uKHRvdGFsVGltZSwgdGltZUxlZnQpIHtcblx0dGhpcy5zdG9wKCk7XG5cblx0dG90YWxUaW1lICo9IDEwMDA7XG5cdHRpbWVMZWZ0ICo9IDEwMDA7XG5cblx0dmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuXHR0aGlzLnN0YXJ0QXQgPSB0aW1lICsgdGltZUxlZnQgLSB0b3RhbFRpbWU7XG5cdHRoaXMuc3RvcEF0ID0gdGltZSArIHRpbWVMZWZ0O1xuXG5cdHRoaXMudHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oe3RpbWU6IHRpbWV9KVxuXHRcdFx0XHRcdFx0LnRvKHt0aW1lOiB0aGlzLnN0b3BBdH0sIHRpbWVMZWZ0KVxuXHRcdFx0XHRcdFx0Lm9uVXBkYXRlKHRoaXMub25VcGRhdGUuYmluZCh0aGlzKSlcblx0XHRcdFx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25Db21wbGV0ZS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cbn1cblxuLyoqXG4gKiBPbiB0d2VlbiB1cGRhdGUuXG4gKiBAbWV0aG9kIG9uVXBkYXRlXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUub25VcGRhdGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuXHR2YXIgcGVyY2VudCA9IDEwMCoodGltZSAtIHRoaXMuc3RhcnRBdCkvKHRoaXMuc3RvcEF0IC0gdGhpcy5zdGFydEF0KTtcblxuLy9cdGNvbnNvbGUubG9nKFwicCA9IFwiICsgcGVyY2VudCk7XG5cblx0dGhpcy5zaG93UGVyY2VudChwZXJjZW50KTtcbn1cblxuLyoqXG4gKiBPbiB0d2VlbiB1cGRhdGUuXG4gKiBAbWV0aG9kIG9uVXBkYXRlXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUub25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZSA9IERhdGUubm93KCk7XG5cdHZhciBwZXJjZW50ID0gMTAwO1xuXHR0aGlzLnNob3dQZXJjZW50KHBlcmNlbnQpO1xuXHR0aGlzLnR3ZWVuID0gbnVsbDtcbn1cblxuLyoqXG4gKiBTaG93IHBlcmNlbnQuXG4gKiBAbWV0aG9kIHNob3dQZXJjZW50XG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuc2hvd1BlcmNlbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZiAodmFsdWUgPCAwKVxuXHRcdHZhbHVlID0gMDtcblxuXHRpZiAodmFsdWUgPiAxMDApXG5cdFx0dmFsdWUgPSAxMDA7XG5cblx0dGhpcy5jYW52YXMuY2xlYXIoKTtcblxuXHR0aGlzLmNhbnZhcy5iZWdpbkZpbGwoMHhjMDAwMDApO1xuXHR0aGlzLmNhbnZhcy5kcmF3Q2lyY2xlKDAsMCwxMCk7XG5cdHRoaXMuY2FudmFzLmVuZEZpbGwoKTtcblxuXHR0aGlzLmNhbnZhcy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuXHR0aGlzLmNhbnZhcy5tb3ZlVG8oMCwwKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IDMzOyBpKyspIHtcblx0XHR0aGlzLmNhbnZhcy5saW5lVG8oXG5cdFx0XHRcdFx0XHRcdDEwKk1hdGguY29zKGkqdmFsdWUqMipNYXRoLlBJLygzMioxMDApIC0gTWF0aC5QSS8yKSxcblx0XHRcdFx0XHRcdFx0MTAqTWF0aC5zaW4oaSp2YWx1ZSoyKk1hdGguUEkvKDMyKjEwMCkgLSBNYXRoLlBJLzIpXG5cdFx0XHRcdFx0XHQpO1xuXHR9XG5cblx0dGhpcy5jYW52YXMubGluZVRvKDAsMCk7XG5cdHRoaXMuY2FudmFzLmVuZEZpbGwoKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVyVmlldzsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xuXG52YXIgSW5pdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Jbml0TWVzc2FnZVwiKTtcbnZhciBTdGF0ZUNvbXBsZXRlTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1N0YXRlQ29tcGxldGVNZXNzYWdlXCIpO1xudmFyIFNlYXRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1NlYXRJbmZvTWVzc2FnZVwiKTtcbnZhciBDb21tdW5pdHlDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Db21tdW5pdHlDYXJkc01lc3NhZ2VcIik7XG52YXIgUG9ja2V0Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUG9ja2V0Q2FyZHNNZXNzYWdlXCIpO1xudmFyIFNlYXRDbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlXCIpO1xudmFyIFNob3dEaWFsb2dNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvU2hvd0RpYWxvZ01lc3NhZ2VcIik7XG52YXIgQnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIEJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQnV0dG9uc01lc3NhZ2VcIik7XG52YXIgRGVsYXlNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRGVsYXlNZXNzYWdlXCIpO1xudmFyIENsZWFyTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0NsZWFyTWVzc2FnZVwiKTtcbnZhciBEZWFsZXJCdXR0b25NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZVwiKTtcbnZhciBCZXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQmV0TWVzc2FnZVwiKTtcbnZhciBCZXRzVG9Qb3RNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQmV0c1RvUG90TWVzc2FnZVwiKTtcblxudmFyIEFjdGlvbk1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlXCIpO1xudmFyIENoYXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ2hhdE1lc3NhZ2VcIik7XG52YXIgQ2hlY2tib3hNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlXCIpO1xudmFyIEZhZGVUYWJsZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9GYWRlVGFibGVNZXNzYWdlXCIpO1xudmFyIEhhbmRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0hhbmRJbmZvTWVzc2FnZVwiKTtcbnZhciBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2VcIik7XG52YXIgUGF5T3V0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1BheU91dE1lc3NhZ2VcIik7XG52YXIgUG90TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1BvdE1lc3NhZ2VcIik7XG52YXIgUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIFByZXNldEJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlc2V0QnV0dG9uc01lc3NhZ2VcIik7XG52YXIgUHJlVG91cm5hbWVudEluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlVG91cm5hbWVudEluZm9NZXNzYWdlXCIpO1xudmFyIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGFibGVCdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgVGFibGVCdXR0b25zTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2VcIik7XG52YXIgVGFibGVJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RhYmxlSW5mb01lc3NhZ2VcIik7XG52YXIgVGVzdENhc2VSZXF1ZXN0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1Rlc3RDYXNlUmVxdWVzdE1lc3NhZ2VcIik7XG52YXIgVGltZXJNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGltZXJNZXNzYWdlXCIpO1xudmFyIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVG91cm5hbWVudFJlc3VsdE1lc3NhZ2VcIik7XG52YXIgRm9sZENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0ZvbGRDYXJkc01lc3NhZ2VcIik7XG5cbi8qKlxuICogQSBwcm90b2NvbCBjb25uZWN0aW9uIHdpdGggYW4gdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBsaXRlbiBmb3IgY29ubmVjdGlvbnMsIHRoZSBmaXJzdCBvbmUgYW5kIG1vc3Qgc3RyYWlnaHRcbiAqIGZvcndhcmQgaXMgdGhlIGFkZE1lc3NhZ2VIYW5kbGVyLCB3aGljaCByZWdpc3RlcnMgYSBsaXN0ZW5lciBmb3IgYVxuICogcGFydGljdWxhciBuZXR3b3JrIG1lc3NhZ2UuIFRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgdGhlIG1lc3NhZ2VcbiAqIGNsYXNzIHRvIGxpc3RlbiBmb3I6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9uU2VhdEluZm9NZXNzYWdlKG0pIHtcbiAqICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlYXQgaXMgYWN0aXZlLlxuICogICAgICAgICBtLmlzQWN0aXZlKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90b0Nvbm5lY3Rpb24uYWRkTWVzc2FnZUhhbmRsZXIoU2VhdEluZm9NZXNzYWdlLCBvblNlYXRJbmZvTWVzc2FnZSk7XG4gKlxuICogVGhlIHNlY29uZCBtZXRob2QgaXMgdG8gbGlzdGVuIHRvIHRoZSBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSBkaXNwYXRjaGVkXG4gKiBieSB0aGUgaW5zdGFuY2Ugb2YgdGhlIFByb3RvQ29ubmVjdGlvbi4gSW4gdGhpcyBjYXNlLCB0aGUgbGlzdGVuZXJcbiAqIHdpbGwgYmUgY2FsbGVkIGZvciBhbGwgbWVzc2FnZXMgcmVjZWl2ZWQgb24gdGhlIGNvbm5lY3Rpb24uXG4gKlxuICogICAgIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG4gKiAgICAgICAgIHZhciBtZXNzYWdlPWUubWVzc2FnZTtcbiAqXG4gKiAgICAgICAgIC8vIElzIGl0IGEgU2VhdEluZm9NZXNzYWdlP1xuICogICAgICAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFNlYXRJbmZvTWVzc2FnZSkge1xuICogICAgICAgICAgICAgLy8gLi4uXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHByb3RvQ29ubmVjdGlvbi5hZGRNZXNzYWdlSGFuZGxlcihTZWF0SW5mb01lc3NhZ2UsIG9uTWVzc2FnZSk7XG4gKlxuICogVGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbiBzaG91bGQgYmUgYW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyBhbiBcImludGVyZmFjZVwiXG4gKiBvZiBhIGNvbm5lY3Rpb24uIEl0IGlzIG5vdCBhbiBpbnRlcmZhY2UgcGVyIHNlLCBzaW5jZSBKYXZhU2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydFxuICogaXQuIEFueXdheSwgdGhlIHNpZ25hdHVyZSBvZiB0aGlzIGludGVyZmFjZSwgaXMgdGhhdCB0aGUgY29ubmVjdGlvbiBvYmplY3RcbiAqIHNob3VsZCBoYXZlIGEgYHNlbmRgIG1ldGhvZCB3aGljaCByZWNlaXZlcyBhIG9iamVjdCB0byBiZSBzZW5kLiBJdCBzaG91bGQgYWxzb1xuICogZGlzcGF0Y2ggXCJtZXNzYWdlXCIgZXZlbnRzIGFzIG1lc3NhZ2VzIGFyZSByZWNlaXZlZCwgYW5kIFwiY2xvc2VcIiBldmVudHMgaWYgdGhlXG4gKiBjb25uZWN0aW9uIGlzIGNsb3NlZCBieSB0aGUgcmVtb3RlIHBhcnR5LlxuICpcbiAqIEBjbGFzcyBQcm90b0Nvbm5lY3Rpb25cbiAqIEBleHRlbmRzIEV2ZW50RGlzcGF0Y2hlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gY29ubmVjdGlvbiBUaGUgdW5kZXJseWluZyBjb25uZWN0aW9uIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gUHJvdG9Db25uZWN0aW9uKGNvbm5lY3Rpb24pIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5sb2dNZXNzYWdlcyA9IGZhbHNlO1xuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyID0gbmV3IEV2ZW50RGlzcGF0Y2hlcigpO1xuXHR0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuXHR0aGlzLmNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlLCB0aGlzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChQcm90b0Nvbm5lY3Rpb24sIEV2ZW50RGlzcGF0Y2hlcik7XG5cbi8qKlxuICogVHJpZ2dlcnMgaWYgdGhlIHJlbW90ZSBwYXJ0eSBjbG9zZXMgdGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbi5cbiAqIEBldmVudCBQcm90b0Nvbm5lY3Rpb24uQ0xPU0VcbiAqL1xuUHJvdG9Db25uZWN0aW9uLkNMT1NFID0gXCJjbG9zZVwiO1xuXG4vKipcbiAqIFRyaWdnZXJzIHdoZW4gd2UgcmVjZWl2ZSBhIG1lc3NhZ2UgZnJvbSB0aGUgcmVtb3RlIHBhcnR5LlxuICogQGV2ZW50IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgbWVzc2FnZSB0aGF0IHdhcyByZWNlaXZlZC5cbiAqL1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UgPSBcIm1lc3NhZ2VcIjtcblxuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVMgPSB7fTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0luaXRNZXNzYWdlLlRZUEVdID0gSW5pdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTdGF0ZUNvbXBsZXRlTWVzc2FnZS5UWVBFXSA9IFN0YXRlQ29tcGxldGVNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbU2VhdEluZm9NZXNzYWdlLlRZUEVdID0gU2VhdEluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLlRZUEVdID0gQ29tbXVuaXR5Q2FyZHNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUG9ja2V0Q2FyZHNNZXNzYWdlLlRZUEVdID0gUG9ja2V0Q2FyZHNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbU2VhdENsaWNrTWVzc2FnZS5UWVBFXSA9IFNlYXRDbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTaG93RGlhbG9nTWVzc2FnZS5UWVBFXSA9IFNob3dEaWFsb2dNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gQnV0dG9uQ2xpY2tNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0RlbGF5TWVzc2FnZS5UWVBFXSA9IERlbGF5TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0NsZWFyTWVzc2FnZS5UWVBFXSA9IENsZWFyTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0RlYWxlckJ1dHRvbk1lc3NhZ2UuVFlQRV0gPSBEZWFsZXJCdXR0b25NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQmV0TWVzc2FnZS5UWVBFXSA9IEJldE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCZXRzVG9Qb3RNZXNzYWdlLlRZUEVdID0gQmV0c1RvUG90TWVzc2FnZTtcblxuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQWN0aW9uTWVzc2FnZS5UWVBFXSA9IEFjdGlvbk1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDaGF0TWVzc2FnZS5UWVBFXSA9IENoYXRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ2hlY2tib3hNZXNzYWdlLlRZUEVdID0gQ2hlY2tib3hNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRmFkZVRhYmxlTWVzc2FnZS5UWVBFXSA9IEZhZGVUYWJsZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tIYW5kSW5mb01lc3NhZ2UuVFlQRV0gPSBIYW5kSW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuVFlQRV0gPSBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQYXlPdXRNZXNzYWdlLlRZUEVdID0gUGF5T3V0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1BvdE1lc3NhZ2UuVFlQRV0gPSBQb3RNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlc2V0QnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBQcmVzZXRCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1ByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5UWVBFXSA9IFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gVGFibGVCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUYWJsZUJ1dHRvbnNNZXNzYWdlLlRZUEVdID0gVGFibGVCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlSW5mb01lc3NhZ2UuVFlQRV0gPSBUYWJsZUluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5UWVBFXSA9IFRlc3RDYXNlUmVxdWVzdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUaW1lck1lc3NhZ2UuVFlQRV0gPSBUaW1lck1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUb3VybmFtZW50UmVzdWx0TWVzc2FnZS5UWVBFXSA9IFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRm9sZENhcmRzTWVzc2FnZS5UWVBFXSA9IEZvbGRDYXJkc01lc3NhZ2U7XG5cbi8qKlxuICogQWRkIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgYWRkTWVzc2FnZUhhbmRsZXJcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5hZGRNZXNzYWdlSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSkge1xuXHRpZiAobWVzc2FnZVR5cGUuaGFzT3duUHJvcGVydHkoXCJUWVBFXCIpKVxuXHRcdG1lc3NhZ2VUeXBlID0gbWVzc2FnZVR5cGUuVFlQRTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLm9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSk7XG59XG5cbi8qKlxuICogUmVtb3ZlIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgcmVtb3ZlTWVzc2FnZUhhbmRsZXJcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVNZXNzYWdlSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSkge1xuXHRpZiAobWVzc2FnZVR5cGUuaGFzT3duUHJvcGVydHkoXCJUWVBFXCIpKVxuXHRcdG1lc3NhZ2VUeXBlID0gbWVzc2FnZVR5cGUuVFlQRTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLm9mZihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uTWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5vbkNvbm5lY3Rpb25NZXNzYWdlID0gZnVuY3Rpb24oZXYpIHtcblx0dmFyIG1lc3NhZ2UgPSBldi5tZXNzYWdlO1xuXHR2YXIgY29uc3RydWN0b3I7XG5cblx0aWYgKHRoaXMubG9nTWVzc2FnZXMpXG5cdFx0Y29uc29sZS5sb2coXCI9PT4gXCIgKyBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG5cblx0Zm9yICh0eXBlIGluIFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTKSB7XG5cdFx0aWYgKG1lc3NhZ2UudHlwZSA9PSB0eXBlKVxuXHRcdFx0Y29uc3RydWN0b3IgPSBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1t0eXBlXVxuXHR9XG5cblx0aWYgKCFjb25zdHJ1Y3Rvcikge1xuXHRcdGNvbnNvbGUud2FybihcInVua25vd24gbWVzc2FnZTogXCIgKyBtZXNzYWdlLnR5cGUpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBvID0gbmV3IGNvbnN0cnVjdG9yKCk7XG5cdG8udW5zZXJpYWxpemUobWVzc2FnZSk7XG5cdG8udHlwZSA9IG1lc3NhZ2UudHlwZTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLnRyaWdnZXIobyk7XG5cblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSxcblx0XHRtZXNzYWdlOiBvXG5cdH0pO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gY2xvc2UuXG4gKiBAbWV0aG9kIG9uQ29ubmVjdGlvbkNsb3NlXG4gKiBAcHJpdmF0ZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNsb3NlID0gZnVuY3Rpb24oZXYpIHtcblx0dGhpcy5jb25uZWN0aW9uLm9mZihcIm1lc3NhZ2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLm9mZihcImNsb3NlXCIsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24gPSBudWxsO1xuXG5cdHRoaXMudHJpZ2dlcihQcm90b0Nvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIFNlbmQgYSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZW5kXG4gKi9cblByb3RvQ29ubmVjdGlvbi5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0dmFyIHNlcmlhbGl6ZWQgPSBtZXNzYWdlLnNlcmlhbGl6ZSgpO1xuXG5cdGZvciAodHlwZSBpbiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFUykge1xuXHRcdGlmIChtZXNzYWdlIGluc3RhbmNlb2YgUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbdHlwZV0pXG5cdFx0XHRzZXJpYWxpemVkLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0aWYgKCFzZXJpYWxpemVkLnR5cGUpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBtZXNzYWdlIHR5cGUgZm9yIHNlbmQsIG1lc3NhZ2U9XCIgKyBtZXNzYWdlLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdC8vXHRjb25zb2xlLmxvZyhcInNlbmRpbmc6IFwiK3NlcmlhbGl6ZWQpO1xuXG5cdHRoaXMuY29ubmVjdGlvbi5zZW5kKHNlcmlhbGl6ZWQpO1xufVxuXG4vKipcbiAqIFNob3VsZCBtZXNzYWdlcyBiZSBsb2dnZWQgdG8gY29uc29sZT9cbiAqIEBtZXRob2Qgc2V0TG9nTWVzc2FnZXNcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2dNZXNzYWdlcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMubG9nTWVzc2FnZXMgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBDbG9zZSB0aGUgdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICogQG1ldGhvZCBjbG9zZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3RvQ29ubmVjdGlvbjsiLCIvKipcbiAqIEJ1dHRvbiBkYXRhLlxuICogQGNsYXNzIEJ1dHRvbkRhdGFcbiAqL1xuZnVuY3Rpb24gQnV0dG9uRGF0YShidXR0b24sIHZhbHVlKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdC8qXHR0aGlzLm1pbiA9IC0xO1xuXHR0aGlzLm1heCA9IC0xOyovXG59XG5cbkJ1dHRvbkRhdGEuUkFJU0UgPSBcInJhaXNlXCI7XG5CdXR0b25EYXRhLkZPTEQgPSBcImZvbGRcIjtcbkJ1dHRvbkRhdGEuQkVUID0gXCJiZXRcIjtcbkJ1dHRvbkRhdGEuU0lUX09VVCA9IFwic2l0T3V0XCI7XG5CdXR0b25EYXRhLlNJVF9JTiA9IFwic2l0SW5cIjtcbkJ1dHRvbkRhdGEuQ0FMTCA9IFwiY2FsbFwiO1xuQnV0dG9uRGF0YS5QT1NUX0JCID0gXCJwb3N0QkJcIjtcbkJ1dHRvbkRhdGEuUE9TVF9TQiA9IFwicG9zdFNCXCI7XG5CdXR0b25EYXRhLkNBTkNFTCA9IFwiY2FuY2VsXCI7XG5CdXR0b25EYXRhLkNIRUNLID0gXCJjaGVja1wiO1xuQnV0dG9uRGF0YS5TSE9XID0gXCJzaG93XCI7XG5CdXR0b25EYXRhLk1VQ0sgPSBcIm11Y2tcIjtcbkJ1dHRvbkRhdGEuT0sgPSBcIm9rXCI7XG5CdXR0b25EYXRhLklNX0JBQ0sgPSBcImltQmFja1wiO1xuQnV0dG9uRGF0YS5MRUFWRSA9IFwibGVhdmVcIjtcbkJ1dHRvbkRhdGEuQ0hFQ0tfRk9MRCA9IFwiY2hlY2tGb2xkXCI7XG5CdXR0b25EYXRhLkNBTExfQU5ZID0gXCJjYWxsQW55XCI7XG5CdXR0b25EYXRhLlJBSVNFX0FOWSA9IFwicmFpc2VBbnlcIjtcbkJ1dHRvbkRhdGEuQlVZX0lOID0gXCJidXlJblwiO1xuQnV0dG9uRGF0YS5SRV9CVVkgPSBcInJlQnV5XCI7XG5CdXR0b25EYXRhLkpPSU5fVE9VUk5BTUVOVCA9IFwiam9pblRvdXJuYW1lbnRcIjtcbkJ1dHRvbkRhdGEuTEVBVkVfVE9VUk5BTUVOVCA9IFwibGVhdmVUb3VybmFtZW50XCI7XG5cbi8qKlxuICogR2V0IGJ1dHRvbi5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cbkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b247XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbiBzdHJpbmcgZm9yIHRoaXMgYnV0dG9uLlxuICogQG1ldGhvZCBnZXRCdXR0b25TdHJpbmdcbiAqL1xuQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0QnV0dG9uU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBCdXR0b25EYXRhLmdldEJ1dHRvblN0cmluZ0ZvcklkKHRoaXMuYnV0dG9uKTtcbn1cblxuLyoqXG4gKiBHZXQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIEdldCBidXR0b24gc3RyaW5nIGZvciBpZC5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uU3RyaW5nRm9ySWRcbiAqIEBzdGF0aWNcbiAqL1xuQnV0dG9uRGF0YS5nZXRCdXR0b25TdHJpbmdGb3JJZCA9IGZ1bmN0aW9uKGIpIHtcblx0c3dpdGNoIChiKSB7XG5cdFx0Y2FzZSBCdXR0b25EYXRhLkZPTEQ6XG5cdFx0XHRyZXR1cm4gXCJGT0xEXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0FMTDpcblx0XHRcdHJldHVybiBcIkNBTExcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5SQUlTRTpcblx0XHRcdHJldHVybiBcIlJBSVNFIFRPXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQkVUOlxuXHRcdFx0cmV0dXJuIFwiQkVUXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuU0lUX09VVDpcblx0XHRcdHJldHVybiBcIlNJVCBPVVRcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5QT1NUX0JCOlxuXHRcdFx0cmV0dXJuIFwiUE9TVCBCQlwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlBPU1RfU0I6XG5cdFx0XHRyZXR1cm4gXCJQT1NUIFNCXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuU0lUX0lOOlxuXHRcdFx0cmV0dXJuIFwiU0lUIElOXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0FOQ0VMOlxuXHRcdFx0cmV0dXJuIFwiQ0FOQ0VMXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0hFQ0s6XG5cdFx0XHRyZXR1cm4gXCJDSEVDS1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlNIT1c6XG5cdFx0XHRyZXR1cm4gXCJTSE9XXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuTVVDSzpcblx0XHRcdHJldHVybiBcIk1VQ0tcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5PSzpcblx0XHRcdHJldHVybiBcIk9LXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuSU1fQkFDSzpcblx0XHRcdHJldHVybiBcIkknTSBCQUNLXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuTEVBVkU6XG5cdFx0XHRyZXR1cm4gXCJMRUFWRVwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNIRUNLX0ZPTEQ6XG5cdFx0XHRyZXR1cm4gXCJDSEVDSyAvIEZPTERcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DQUxMX0FOWTpcblx0XHRcdHJldHVybiBcIkNBTEwgQU5ZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUkFJU0VfQU5ZOlxuXHRcdFx0cmV0dXJuIFwiUkFJU0UgQU5ZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUkVfQlVZOlxuXHRcdFx0cmV0dXJuIFwiUkUtQlVZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQlVZX0lOOlxuXHRcdFx0cmV0dXJuIFwiQlVZIElOXCI7XG5cdH1cblxuXHRyZXR1cm4gXCJcIjtcbn1cblxuLypCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRNaW4gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWluO1xufSovXG5cbi8qQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0TWF4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1heDtcbn0qL1xuXG5CdXR0b25EYXRhLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gXCI8QnV0dG9uRGF0YSBidXR0b249XCIgKyB0aGlzLmJ1dHRvbiArIFwiPlwiO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbkRhdGE7IiwiLyoqXG4gKiBDYXJkIGRhdGEuXG4gKiBAY2xhc3MgQ2FyZERhdGFcbiAqL1xuZnVuY3Rpb24gQ2FyZERhdGEodmFsdWUpIHtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5DYXJkRGF0YS5DQVJEX1ZBTFVFX1NUUklOR1MgPVxuXHRbXCIyXCIsIFwiM1wiLCBcIjRcIiwgXCI1XCIsIFwiNlwiLCBcIjdcIiwgXCI4XCIsIFwiOVwiLCBcIjEwXCIsIFwiSlwiLCBcIlFcIiwgXCJLXCIsIFwiQVwiXTtcblxuQ2FyZERhdGEuU1VJVF9TVFJJTkdTID1cblx0W1wiRFwiLCBcIkNcIiwgXCJIXCIsIFwiU1wiXTtcblxuQ2FyZERhdGEuSElEREVOID0gLTE7XG5cbi8qKlxuICogRG9lcyB0aGlzIENhcmREYXRhIHJlcHJlc2VudCBhIHNob3cgY2FyZD9cbiAqIElmIG5vdCBpdCBzaG91bGQgYmUgcmVuZGVyZWQgd2l0aCBpdHMgYmFja3NpZGUuXG4gKiBAbWV0aG9kIGlzU2hvd25cbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmlzU2hvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWUgPj0gMDtcbn1cblxuLyoqXG4gKiBHZXQgY2FyZCB2YWx1ZS5cbiAqIFRoaXMgdmFsdWUgcmVwcmVzZW50cyB0aGUgcmFuayBvZiB0aGUgY2FyZCwgYnV0IHN0YXJ0cyBvbiAwLlxuICogQG1ldGhvZCBnZXRDYXJkVmFsdWVcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENhcmRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZSAlIDEzO1xufVxuXG4vKipcbiAqIEdldCBjYXJkIHZhbHVlIHN0cmluZy5cbiAqIEBtZXRob2QgZ2V0Q2FyZFZhbHVlU3RyaW5nXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5nZXRDYXJkVmFsdWVTdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIENhcmREYXRhLkNBUkRfVkFMVUVfU1RSSU5HU1t0aGlzLnZhbHVlICUgMTNdO1xufVxuXG4vKipcbiAqIEdldCBzdWl0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTdWl0SW5kZXhcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldFN1aXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWF0aC5mbG9vcih0aGlzLnZhbHVlIC8gMTMpO1xufVxuXG4vKipcbiAqIEdldCBzdWl0IHN0cmluZy5cbiAqIEBtZXRob2QgZ2V0U3VpdFN0cmluZ1xuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0U3VpdFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gQ2FyZERhdGEuU1VJVF9TVFJJTkdTW3RoaXMuZ2V0U3VpdEluZGV4KCldO1xufVxuXG4vKipcbiAqIEdldCBjb2xvci5cbiAqIEBtZXRob2QgZ2V0Q29sb3JcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENvbG9yID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLmdldFN1aXRJbmRleCgpICUgMiAhPSAwKVxuXHRcdHJldHVybiBcIiMwMDAwMDBcIjtcblxuXHRlbHNlXG5cdFx0cmV0dXJuIFwiI2ZmMDAwMFwiO1xufVxuXG4vKipcbiAqIFRvIHN0cmluZy5cbiAqIEBtZXRob2QgdG9TdHJpbmdcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLnZhbHVlIDwgMClcblx0XHRyZXR1cm4gXCJYWFwiO1xuXG5cdC8vXHRyZXR1cm4gXCI8Y2FyZCBcIiArIHRoaXMuZ2V0Q2FyZFZhbHVlU3RyaW5nKCkgKyB0aGlzLmdldFN1aXRTdHJpbmcoKSArIFwiPlwiO1xuXHRyZXR1cm4gdGhpcy5nZXRDYXJkVmFsdWVTdHJpbmcoKSArIHRoaXMuZ2V0U3VpdFN0cmluZygpO1xufVxuXG4vKipcbiAqIEdldCB2YWx1ZSBvZiB0aGUgY2FyZC5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIENvbXBhcmUgd2l0aCByZXNwZWN0IHRvIHZhbHVlLiBOb3QgcmVhbGx5IHVzZWZ1bCBleGNlcHQgZm9yIGRlYnVnZ2luZyFcbiAqIEBtZXRob2QgY29tcGFyZVZhbHVlXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVWYWx1ZSA9IGZ1bmN0aW9uKGEsIGIpIHtcblx0aWYgKCEoYSBpbnN0YW5jZW9mIENhcmREYXRhKSB8fCAhKGIgaW5zdGFuY2VvZiBDYXJkRGF0YSkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGNvbXBhcmluZyBjYXJkIGRhdGFcIik7XG5cblx0aWYgKGEuZ2V0VmFsdWUoKSA+IGIuZ2V0VmFsdWUoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRWYWx1ZSgpIDwgYi5nZXRWYWx1ZSgpKVxuXHRcdHJldHVybiAtMTtcblxuXHRyZXR1cm4gMDtcbn1cblxuLyoqXG4gKiBDb21wYXJlIHdpdGggcmVzcGVjdCB0byBjYXJkIHZhbHVlLlxuICogQG1ldGhvZCBjb21wYXJlQ2FyZFZhbHVlXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVDYXJkVmFsdWUgPSBmdW5jdGlvbihhLCBiKSB7XG5cdGlmICghKGEgaW5zdGFuY2VvZiBDYXJkRGF0YSkgfHwgIShiIGluc3RhbmNlb2YgQ2FyZERhdGEpKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBjb21wYXJpbmcgY2FyZCBkYXRhXCIpO1xuXG5cdGlmIChhLmdldENhcmRWYWx1ZSgpID4gYi5nZXRDYXJkVmFsdWUoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRDYXJkVmFsdWUoKSA8IGIuZ2V0Q2FyZFZhbHVlKCkpXG5cdFx0cmV0dXJuIC0xO1xuXG5cdHJldHVybiAwO1xufVxuXG4vKipcbiAqIENvbXBhcmUgd2l0aCByZXNwZWN0IHRvIHN1aXQuXG4gKiBAbWV0aG9kIGNvbXBhcmVTdWl0XG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVTdWl0SW5kZXggPSBmdW5jdGlvbihhLCBiKSB7XG5cdGlmICghKGEgaW5zdGFuY2VvZiBDYXJkRGF0YSkgfHwgIShiIGluc3RhbmNlb2YgQ2FyZERhdGEpKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBjb21wYXJpbmcgY2FyZCBkYXRhXCIpO1xuXG5cdGlmIChhLmdldFN1aXRJbmRleCgpID4gYi5nZXRTdWl0SW5kZXgoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRTdWl0SW5kZXgoKSA8IGIuZ2V0U3VpdEluZGV4KCkpXG5cdFx0cmV0dXJuIC0xO1xuXG5cdHJldHVybiAwO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGNhcmQgZGF0YSBmcm9tIGEgc3RyaW5nLlxuICogQG1ldGhvZCBmcm9tU3RyaW5nXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmZyb21TdHJpbmcgPSBmdW5jdGlvbihzKSB7XG5cdHZhciBpO1xuXG5cdHZhciBjYXJkVmFsdWUgPSAtMTtcblx0Zm9yIChpID0gMDsgaSA8IENhcmREYXRhLkNBUkRfVkFMVUVfU1RSSU5HUy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjYW5kID0gQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTW2ldO1xuXG5cdFx0aWYgKHMuc3Vic3RyaW5nKDAsIGNhbmQubGVuZ3RoKSA9PSBjYW5kKVxuXHRcdFx0Y2FyZFZhbHVlID0gaTtcblx0fVxuXG5cdGlmIChjYXJkVmFsdWUgPCAwKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBhIHZhbGlkIGNhcmQgc3RyaW5nOiBcIiArIHMpO1xuXG5cdHZhciBzdWl0U3RyaW5nID0gcy5zdWJzdHJpbmcoQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTW2NhcmRWYWx1ZV0ubGVuZ3RoKTtcblxuXHR2YXIgc3VpdEluZGV4ID0gLTE7XG5cdGZvciAoaSA9IDA7IGkgPCBDYXJkRGF0YS5TVUlUX1NUUklOR1MubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2FuZCA9IENhcmREYXRhLlNVSVRfU1RSSU5HU1tpXTtcblxuXHRcdGlmIChzdWl0U3RyaW5nID09IGNhbmQpXG5cdFx0XHRzdWl0SW5kZXggPSBpO1xuXHR9XG5cblx0aWYgKHN1aXRJbmRleCA8IDApXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGEgdmFsaWQgY2FyZCBzdHJpbmc6IFwiICsgcyk7XG5cblx0cmV0dXJuIG5ldyBDYXJkRGF0YShzdWl0SW5kZXggKiAxMyArIGNhcmRWYWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FyZERhdGE7IiwiLyoqXG4gKiBCdXR0b24gZGF0YS5cbiAqIEBjbGFzcyBCdXR0b25EYXRhXG4gKi9cbmZ1bmN0aW9uIFByZXNldEJ1dHRvbkRhdGEoYnV0dG9uLCB2YWx1ZSkge1xuXHR0aGlzLmJ1dHRvbiA9IGJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG4vKipcbiAqIEdldCBidXR0b24uXG4gKiBAbWV0aG9kIGdldEJ1dHRvblxuICovXG5QcmVzZXRCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uO1xufVxuXG4vKipcbiAqIEdldCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuUHJlc2V0QnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0QnV0dG9uRGF0YTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gcGxheWVyIG1hZGUgYW4gYWN0aW9uLlxuICogQGNsYXNzIEFjdGlvbk1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQWN0aW9uTWVzc2FnZShzZWF0SW5kZXgsIGFjdGlvbikge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblx0dGhpcy5hY3Rpb24gPSBhY3Rpb247XG59XG5cbkFjdGlvbk1lc3NhZ2UuVFlQRSA9IFwiYWN0aW9uXCI7XG5cbkFjdGlvbk1lc3NhZ2UuRk9MRCA9IFwiZm9sZFwiO1xuQWN0aW9uTWVzc2FnZS5DQUxMID0gXCJjYWxsXCI7XG5BY3Rpb25NZXNzYWdlLlJBSVNFID0gXCJyYWlzZVwiO1xuQWN0aW9uTWVzc2FnZS5DSEVDSyA9IFwiY2hlY2tcIjtcbkFjdGlvbk1lc3NhZ2UuQkVUID0gXCJiZXRcIjtcbkFjdGlvbk1lc3NhZ2UuTVVDSyA9IFwibXVja1wiO1xuQWN0aW9uTWVzc2FnZS5BTlRFID0gXCJhbnRlXCI7XG5cbi8qKlxuICogU2VhdCBpbmRleC5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkFjdGlvbk1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRBY3Rpb25cbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUuZ2V0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmFjdGlvbjtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkFjdGlvbk1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLmFjdGlvbiA9IGRhdGEuYWN0aW9uO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHRhY3Rpb246IHRoaXMuYWN0aW9uXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWN0aW9uTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gcGxheWVyIGhhcyBwbGFjZWQgYSBiZXQuXG4gKiBAY2xhc3MgQmV0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBCZXRNZXNzYWdlKHNlYXRJbmRleCwgdmFsdWUpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuQmV0TWVzc2FnZS5UWVBFID0gXCJiZXRcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5CZXRNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQmV0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5CZXRNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy52YWx1ZSA9IGRhdGEudmFsdWU7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5CZXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdHZhbHVlOiB0aGlzLnZhbHVlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmV0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gYmV0cyBzaG91bGQgYmUgcGxhY2VkIGluIHBvdC5cbiAqIEBjbGFzcyBCZXRzVG9Qb3RNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJldHNUb1BvdE1lc3NhZ2UoKSB7XG59XG5cbkJldHNUb1BvdE1lc3NhZ2UuVFlQRSA9IFwiYmV0c1RvUG90XCI7XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5CZXRzVG9Qb3RNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJldHNUb1BvdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmV0c1RvUG90TWVzc2FnZTsiLCIvKipcbiAqIFNlbnQgd2hlbiB0aGUgdXNlciBjbGlja3MgYSBidXR0b24sIGVpdGhlciBpbiBhIGRpYWxvZyBvclxuICogZm9yIGEgZ2FtZSBhY3Rpb24uXG4gKiBAY2xhc3MgQnV0dG9uQ2xpY2tNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbkNsaWNrTWVzc2FnZShidXR0b24sIHZhbHVlKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cbi8vXHRjb25zb2xlLmxvZyhcIkNyZWF0aW5nIGJ1dHRvbiBjbGljayBtZXNzYWdlLCB2YWx1ZT1cIiArIHZhbHVlKTtcbn1cblxuQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEUgPSBcImJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogVGhlIHRoZSBidXR0b24gdGhhdCB3YXMgcHJlc3NlZC5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5CdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbiA9IGRhdGEuYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0YnV0dG9uOiB0aGlzLmJ1dHRvbixcblx0XHR2YWx1ZTogdGhpcy52YWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbkNsaWNrTWVzc2FnZTsiLCJ2YXIgQnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhL0J1dHRvbkRhdGFcIik7XG5cbi8qKlxuICogTWVzc2FnZSBzZW50IHdoZW4gdGhlIGNsaWVudCBzaG91bGQgc2hvdyBnYW1lIGFjdGlvbiBidXR0b25zLFxuICogRk9MRCwgUkFJU0UgZXRjLlxuICogQGNsYXNzIEJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblx0dGhpcy5zbGlkZXJCdXR0b25JbmRleCA9IDA7XG5cdHRoaXMubWluID0gLTE7XG5cdHRoaXMubWF4ID0gLTE7XG59XG5cbkJ1dHRvbnNNZXNzYWdlLlRZUEUgPSBcImJ1dHRvbnNcIjtcblxuLyoqXG4gKiBHZXQgYW4gYXJyYXkgb2YgQnV0dG9uRGF0YSBpbmRpY2F0aW5nIHdoaWNoIGJ1dHRvbnMgdG8gc2hvdy5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uc1xuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b25zO1xufVxuXG4vKipcbiAqIEFkZCBhIGJ1dHRvbiB0byBiZSBzZW50LlxuICogQG1ldGhvZCBhZGRCdXR0b25cbiAqL1xuQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uKGJ1dHRvbikge1xuXHR0aGlzLmJ1dHRvbnMucHVzaChidXR0b24pO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cbkJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5idXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgYnV0dG9uID0gZGF0YS5idXR0b25zW2ldO1xuXHRcdHZhciBidXR0b25EYXRhID0gbmV3IEJ1dHRvbkRhdGEoYnV0dG9uLmJ1dHRvbiwgYnV0dG9uLnZhbHVlKTtcblx0XHR0aGlzLmFkZEJ1dHRvbihidXR0b25EYXRhKTtcblx0fVxuXHR0aGlzLnNsaWRlckJ1dHRvbkluZGV4ID0gZGF0YS5zbGlkZXJCdXR0b25JbmRleDtcblx0dGhpcy5taW4gPSBkYXRhLm1pbjtcblx0dGhpcy5tYXggPSBkYXRhLm1heDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGJ1dHRvbnMgPSBbXTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b24gPSB7fTtcblx0XHRidXR0b24uYnV0dG9uID0gdGhpcy5idXR0b25zW2ldLmdldEJ1dHRvbigpO1xuXHRcdGJ1dHRvbi52YWx1ZSA9IHRoaXMuYnV0dG9uc1tpXS5nZXRWYWx1ZSgpO1xuXHRcdGJ1dHRvbnMucHVzaChidXR0b24pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRidXR0b25zOiBidXR0b25zLFxuXHRcdHNsaWRlckJ1dHRvbkluZGV4OiB0aGlzLnNsaWRlckJ1dHRvbkluZGV4LFxuXHRcdG1pbjogdGhpcy5taW4sXG5cdFx0bWF4OiB0aGlzLm1heFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBzb21ldGhpbmcgaGFzIG9jY3VycmVkIGluIHRoZSBjaGF0LlxuICogQGNsYXNzIENoYXRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIENoYXRNZXNzYWdlKHVzZXIsIHRleHQpIHtcblx0dGhpcy51c2VyID0gdXNlcjtcblx0dGhpcy50ZXh0ID0gdGV4dDtcbn1cblxuQ2hhdE1lc3NhZ2UuVFlQRSA9IFwiY2hhdFwiO1xuXG4vKipcbiAqIEdldCB0ZXh0LlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0IHVzZXIuXG4gKiBAbWV0aG9kIGdldFVzZXJcbiAqL1xuQ2hhdE1lc3NhZ2UucHJvdG90eXBlLmdldFVzZXIgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudXNlcjtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXHR0aGlzLnVzZXIgPSBkYXRhLnVzZXI7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5DaGF0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGV4dDogdGhpcy50ZXh0LFxuXHRcdHVzZXI6IHRoaXMudXNlclxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRNZXNzYWdlOyIsIi8qKlxuICogU2VudCB3aGVuIHBsYXllciBoYXMgY2hlY2tlZCBhIGNoZWNrYm94LlxuICogQGNsYXNzIENoZWNrYm94TWVzc2FnZVxuICovXG5mdW5jdGlvbiBDaGVja2JveE1lc3NhZ2UoaWQsIGNoZWNrZWQpIHtcblx0dGhpcy5pZCA9IGlkO1xuXHR0aGlzLmNoZWNrZWQgPSBjaGVja2VkO1xufVxuXG5DaGVja2JveE1lc3NhZ2UuVFlQRSA9IFwiY2hlY2tib3hcIjtcblxuQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFMgPSBcImF1dG9Qb3N0QmxpbmRzXCI7XG5DaGVja2JveE1lc3NhZ2UuQVVUT19NVUNLX0xPU0lORyA9IFwiYXV0b011Y2tMb3NpbmdcIjtcbkNoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVCA9IFwic2l0b3V0TmV4dFwiO1xuXG4vKipcbiAqIElkIG9mIGNoZWNrYm94LlxuICogQG1ldGhvZCBnZXRJZFxuICovXG5DaGVja2JveE1lc3NhZ2UucHJvdG90eXBlLmdldElkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVja2VkO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQ2hlY2tib3hNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5pZCA9IGRhdGEuaWQ7XG5cdHRoaXMuY2hlY2tlZCA9IGRhdGEuY2hlY2tlZDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0aWQ6IHRoaXMuaWQsXG5cdFx0Y2hlY2tlZDogdGhpcy5jaGVja2VkXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3hNZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIENsZWFyTWVzc2FnZVxuICovXG5mdW5jdGlvbiBDbGVhck1lc3NhZ2UoY29tcG9uZW50cykge1xuXHRpZiAoIWNvbXBvbmVudHMpXG5cdFx0Y29tcG9uZW50cyA9IFtdO1xuXG5cdHRoaXMuY29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG59XG5cbkNsZWFyTWVzc2FnZS5UWVBFID0gXCJjbGVhclwiO1xuXG5DbGVhck1lc3NhZ2UuQ0FSRFMgPSBcImNhcmRzXCI7XG5DbGVhck1lc3NhZ2UuQkVUUyA9IFwiYmV0c1wiO1xuQ2xlYXJNZXNzYWdlLlBPVCA9IFwicG90XCI7XG5DbGVhck1lc3NhZ2UuQ0hBVCA9IFwiY2hhdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50c1xuICovXG5DbGVhck1lc3NhZ2UucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50cztcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkNsZWFyTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuY29tcG9uZW50cyA9IGRhdGEuY29tcG9uZW50cztcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNsZWFyTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0Y29tcG9uZW50czogdGhpcy5jb21wb25lbnRzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xlYXJNZXNzYWdlOyIsInZhciBDYXJkRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhL0NhcmREYXRhXCIpO1xuXG4vKipcbiAqIFNob3cgY29tbXVuaXR5IGNhcmRzLlxuICogQGNsYXNzIENvbW11bml0eUNhcmRzTWVzc2FnZVxuICovXG5mdW5jdGlvbiBDb21tdW5pdHlDYXJkc01lc3NhZ2UoKSB7XG5cdHRoaXMuYW5pbWF0ZSA9IGZhbHNlO1xuXHR0aGlzLmNhcmRzID0gW107XG5cdHRoaXMuZmlyc3RJbmRleCA9IDA7XG59XG5cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5UWVBFID0gXCJjb21tdW5pdHlDYXJkc1wiO1xuXG4vKipcbiAqIEFuaW1hdGlvbiBvciBub3Q/XG4gKiBAbWV0aG9kIHNldEFuaW1hdGVcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXRBbmltYXRlID0gZnVuY3Rpb24odmFsdWUpIHtcblx0cmV0dXJuIHRoaXMuYW5pbWF0ZSA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBmaXJzdCBpbmRleC5cbiAqIEBtZXRob2Qgc2V0Rmlyc3RJbmRleFxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEZpcnN0SW5kZXggPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRyZXR1cm4gdGhpcy5maXJzdEluZGV4ID0gdmFsdWU7XG59XG5cbi8qKlxuICogQWRkIGNhcmQuXG4gKiBAbWV0aG9kIGFkZENhcmRcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5hZGRDYXJkID0gZnVuY3Rpb24oYykge1xuXHR0aGlzLmNhcmRzLnB1c2goYyk7XG59XG5cbi8qKlxuICogR2V0IGNhcmQgZGF0YS5cbiAqIEBtZXRob2QgZ2V0Q2FyZHNcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jYXJkcztcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBjYXJkIHRvIGJlIHNob3duIGluIHRoZSBzZXF1ZW5jZS5cbiAqIEBtZXRob2QgZ2V0Rmlyc3RJbmRleFxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldEZpcnN0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZmlyc3RJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR2YXIgaTtcblxuXHR0aGlzLmFuaW1hdGUgPSBkYXRhLmFuaW1hdGU7XG5cdHRoaXMuZmlyc3RJbmRleCA9IHBhcnNlSW50KGRhdGEuZmlyc3RJbmRleCk7XG5cdHRoaXMuY2FyZHMgPSBbXTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgZGF0YS5jYXJkcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmNhcmRzLnB1c2gobmV3IENhcmREYXRhKGRhdGEuY2FyZHNbaV0pKTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjYXJkcyA9IFtdO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLmNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdGNhcmRzLnB1c2godGhpcy5jYXJkc1tpXS5nZXRWYWx1ZSgpKTtcblxuXHRyZXR1cm4ge1xuXHRcdGFuaW1hdGU6IHRoaXMuYW5pbWF0ZSxcblx0XHRmaXJzdEluZGV4OiB0aGlzLmZpcnN0SW5kZXgsXG5cdFx0Y2FyZHM6IGNhcmRzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tbXVuaXR5Q2FyZHNNZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIERlYWxlckJ1dHRvbk1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRGVhbGVyQnV0dG9uTWVzc2FnZShzZWF0SW5kZXgsIGFuaW1hdGUpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG5cdHRoaXMuYW5pbWF0ZSA9IGFuaW1hdGU7XG59XG5cbkRlYWxlckJ1dHRvbk1lc3NhZ2UuVFlQRSA9IFwiZGVhbGVyQnV0dG9uXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuRGVhbGVyQnV0dG9uTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEFuaW1hdGVcbiAqL1xuRGVhbGVyQnV0dG9uTWVzc2FnZS5wcm90b3R5cGUuZ2V0QW5pbWF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5hbmltYXRlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRGVhbGVyQnV0dG9uTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cdHRoaXMuYW5pbWF0ZSA9IGRhdGEuYW5pbWF0ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0YW5pbWF0ZTogdGhpcy5hbmltYXRlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGVhbGVyQnV0dG9uTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBEZWxheU1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRGVsYXlNZXNzYWdlKGRlbGF5KSB7XG5cdHRoaXMuZGVsYXkgPSBkZWxheTtcbn1cblxuRGVsYXlNZXNzYWdlLlRZUEUgPSBcImRlbGF5XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXREZWxheVxuICovXG5EZWxheU1lc3NhZ2UucHJvdG90eXBlLmdldERlbGF5ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRlbGF5O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5kZWxheSA9IGRhdGEuZGVsYXk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5EZWxheU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdGRlbGF5OiB0aGlzLmRlbGF5XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGVsYXlNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgdGFibGUgc2hvdWxkIGZhZGUuXG4gKiBAY2xhc3MgRmFkZVRhYmxlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBGYWRlVGFibGVNZXNzYWdlKHZpc2libGUsIGRpcmVjdGlvbikge1xuXHR0aGlzLnZpc2libGUgPSB2aXNpYmxlO1xuXHR0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbn1cblxuRmFkZVRhYmxlTWVzc2FnZS5UWVBFID0gXCJmYWRlVGFibGVcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZpc2libGVcbiAqL1xuRmFkZVRhYmxlTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmlzaWJsZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52aXNpYmxlO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RGlyZWN0aW9uXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLmdldERpcmVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kaXJlY3Rpb247XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5GYWRlVGFibGVNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy52aXNpYmxlID0gZGF0YS52aXNpYmxlO1xuXHR0aGlzLmRpcmVjdGlvbiA9IGRhdGEuZGlyZWN0aW9uO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRmFkZVRhYmxlTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dmlzaWJsZTogdGhpcy52aXNpYmxlLFxuXHRcdGRpcmVjdGlvbjogdGhpcy5kaXJlY3Rpb25cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGYWRlVGFibGVNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgcGxheWVyIGhhcyBmb2xkZWQuXG4gKiBAY2xhc3MgRm9sZENhcmRzTWVzc2FnZVxuICovXG5mdW5jdGlvbiBGb2xkQ2FyZHNNZXNzYWdlKHNlYXRJbmRleCkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcbn1cblxuRm9sZENhcmRzTWVzc2FnZS5UWVBFID0gXCJmb2xkQ2FyZHNcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5Gb2xkQ2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Gb2xkQ2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRm9sZENhcmRzTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBIYW5kSW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gSGFuZEluZm9NZXNzYWdlKHRleHQsIGNvdW50ZG93bikge1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGNvdW50ZG93bjtcbn1cblxuSGFuZEluZm9NZXNzYWdlLlRZUEUgPSBcImhhbmRJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5IYW5kSW5mb01lc3NhZ2UucHJvdG90eXBlLmdldENvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb3VudGRvd247XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5IYW5kSW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMuY291bnRkb3duID0gZGF0YS5jb3VudGRvd247XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5IYW5kSW5mb01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRjb3VudGRvd246IHRoaXMuY291bnRkb3duXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFuZEluZm9NZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIEluaXRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEluaXRNZXNzYWdlKHRva2VuKSB7XG5cdHRoaXMudG9rZW4gPSB0b2tlbjtcblx0dGhpcy50YWJsZUlkID0gbnVsbDtcblx0dGhpcy52aWV3Q2FzZSA9IG51bGw7XG59XG5cbkluaXRNZXNzYWdlLlRZUEUgPSBcImluaXRcIjtcblxuLyoqXG4gKiBnZXQgdG9rZW4uXG4gKiBAbWV0aG9kIGdldFRva2VuXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUb2tlbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50b2tlbjtcbn1cblxuLyoqXG4gKiBTZXQgdGFibGUgaWQuXG4gKiBAbWV0aG9kIHNldFRhYmxlSWRcbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLnNldFRhYmxlSWQgPSBmdW5jdGlvbihpZCkge1xuXHR0aGlzLnRhYmxlSWQgPSBpZDtcbn1cblxuLyoqXG4gKiBHZXQgdGFibGUgaWQuXG4gKiBAbWV0aG9kIGdldFRhYmxlSWRcbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLmdldFRhYmxlSWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGFibGVJZDtcbn1cblxuLyoqXG4gKiBTZXQgdmlldyBjYXNlLlxuICogQG1ldGhvZCBzZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXRWaWV3Q2FzZSA9IGZ1bmN0aW9uKHZpZXdDYXNlKSB7XG5cdHRoaXMudmlld0Nhc2UgPSB2aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBHZXQgdmlldyBjYXNlLlxuICogQG1ldGhvZCBnZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5nZXRWaWV3Q2FzZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudG9rZW4gPSBkYXRhLnRva2VuO1xuXHR0aGlzLnRhYmxlSWQgPSBkYXRhLnRhYmxlSWQ7XG5cdHRoaXMudmlld0Nhc2UgPSBkYXRhLnZpZXdDYXNlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRva2VuOiB0aGlzLnRva2VuLFxuXHRcdHRhYmxlSWQ6IHRoaXMudGFibGVJZCxcblx0XHR2aWV3Q2FzZTogdGhpcy52aWV3Q2FzZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEluaXRNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBpbnRlcmZhY2Ugc3RhdGUgaGFzIGNoYW5nZWQuXG4gKiBAY2xhc3MgSW50ZXJmYWNlU3RhdGVNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEludGVyZmFjZVN0YXRlTWVzc2FnZSh2aXNpYmxlQnV0dG9ucykge1xuXHRcblx0dGhpcy52aXNpYmxlQnV0dG9ucyA9IHZpc2libGVCdXR0b25zID09IG51bGwgPyBuZXcgQXJyYXkoKSA6IHZpc2libGVCdXR0b25zO1xufVxuXG5JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuVFlQRSA9IFwiaW50ZXJmYWNlU3RhdGVcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZpc2libGVCdXR0b25zXG4gKi9cbkludGVyZmFjZVN0YXRlTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmlzaWJsZUJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy52aXNpYmxlQnV0dG9ucyA9IGRhdGEudmlzaWJsZUJ1dHRvbnM7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpc2libGVCdXR0b25zOiB0aGlzLnZpc2libGVCdXR0b25zXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJmYWNlU3RhdGVNZXNzYWdlOyIsIi8qKlxyXG4gKiBSZWNlaXZlZCB3aGVuIHBsYXllciBoYXMgcGxhY2VkIGEgYmV0LlxyXG4gKiBAY2xhc3MgUGF5T3V0TWVzc2FnZVxyXG4gKi9cclxuZnVuY3Rpb24gUGF5T3V0TWVzc2FnZSgpIHtcclxuXHR0aGlzLnZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcclxufVxyXG5cclxuUGF5T3V0TWVzc2FnZS5UWVBFID0gXCJwYXlPdXRcIjtcclxuXHJcbi8qKlxyXG4gKiBHZXR0ZXIuXHJcbiAqIEBtZXRob2QgZ2V0VmFsdWVzXHJcbiAqL1xyXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4gdGhpcy52YWx1ZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgdmFsdWUgYXQuXHJcbiAqIEBtZXRob2Qgc2V0VmFsdWVBdFxyXG4gKi9cclxuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUuc2V0VmFsdWVBdCA9IGZ1bmN0aW9uKHNlYXRJbmRleCwgdmFsdWUpIHtcclxuXHR0aGlzLnZhbHVlc1tzZWF0SW5kZXhdID0gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVbi1zZXJpYWxpemUuXHJcbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcclxuICovXHJcblBheU91dE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS52YWx1ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHRoaXMudmFsdWVzW2ldID0gZGF0YS52YWx1ZXNbaV07XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogU2VyaWFsaXplIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgc2VyaWFsaXplXHJcbiAqL1xyXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0dmFsdWVzOiB0aGlzLnZhbHVlc1xyXG5cdH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGF5T3V0TWVzc2FnZTsiLCJ2YXIgQ2FyZERhdGEgPSByZXF1aXJlKFwiLi4vZGF0YS9DYXJkRGF0YVwiKTtcblxuLyoqXG4gKiBTaG93IHBvY2tldCBjYXJkcy5cbiAqIEBjbGFzcyBQb2NrZXRDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUG9ja2V0Q2FyZHNNZXNzYWdlKHNlYXRJbmRleCkge1xuXHR0aGlzLmFuaW1hdGUgPSBmYWxzZTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLmZpcnN0SW5kZXggPSAwO1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcbn1cblxuUG9ja2V0Q2FyZHNNZXNzYWdlLlRZUEUgPSBcInBvY2tldENhcmRzXCI7XG5cbi8qKlxuICogQW5pbWF0aW9uP1xuICogQG1ldGhvZCBzZXRBbmltYXRlXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2V0QW5pbWF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMuYW5pbWF0ZSA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBmaXJzdCBpbmRleC5cbiAqIEBtZXRob2Qgc2V0Rmlyc3RJbmRleFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEZpcnN0SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuXHR0aGlzLmZpcnN0SW5kZXggPSBpbmRleDtcbn1cblxuLyoqXG4gKiBHZXQgYXJyYXkgb2YgQ2FyZERhdGEuXG4gKiBAbWV0aG9kIGdldENhcmRzXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2FyZHM7XG59XG5cbi8qKlxuICogQWRkIGEgY2FyZC5cbiAqIEBtZXRob2QgYWRkQ2FyZFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmFkZENhcmQgPSBmdW5jdGlvbihjKSB7XG5cdHRoaXMuY2FyZHMucHVzaChjKTtcbn1cblxuLyoqXG4gKiBHZXQgZmlyc3QgaW5kZXguXG4gKiBAbWV0aG9kIGdldEZpcnN0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmZpcnN0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0IHNlYXQgaW5kZXguXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dmFyIGk7XG5cblx0dGhpcy5hbmltYXRlID0gZGF0YS5hbmltYXRlO1xuXHR0aGlzLmZpcnN0SW5kZXggPSBwYXJzZUludChkYXRhLmZpcnN0SW5kZXgpO1xuXHR0aGlzLmNhcmRzID0gW107XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cblx0Zm9yIChpID0gMDsgaSA8IGRhdGEuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5jYXJkcy5wdXNoKG5ldyBDYXJkRGF0YShkYXRhLmNhcmRzW2ldKSk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2FyZHMgPSBbXTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5jYXJkcy5sZW5ndGg7IGkrKylcblx0XHRjYXJkcy5wdXNoKHRoaXMuY2FyZHNbaV0uZ2V0VmFsdWUoKSk7XG5cblx0cmV0dXJuIHtcblx0XHRhbmltYXRlOiB0aGlzLmFuaW1hdGUsXG5cdFx0Zmlyc3RJbmRleDogdGhpcy5maXJzdEluZGV4LFxuXHRcdGNhcmRzOiBjYXJkcyxcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9ja2V0Q2FyZHNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgcG90IGhhcyBjaGFuZ2VkLlxuICogQGNsYXNzIFBvdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUG90TWVzc2FnZSh2YWx1ZXMpIHtcblx0dGhpcy52YWx1ZXMgPSB2YWx1ZXMgPT0gbnVsbCA/IG5ldyBBcnJheSgpIDogdmFsdWVzO1xufVxuXG5Qb3RNZXNzYWdlLlRZUEUgPSBcInBvdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVzXG4gKi9cblBvdE1lc3NhZ2UucHJvdG90eXBlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZXM7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy52YWx1ZXMgPSBkYXRhLnZhbHVlcztcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblBvdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZhbHVlczogdGhpcy52YWx1ZXNcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQb3RNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBQcmUgdG91cm5hbWVudCBpbmZvIG1lc3NhZ2UgaXMgZGlzcGF0Y2hlZC5cbiAqIEBjbGFzcyBQcmVUb3VybmFtZW50SW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlKHRleHQsIGNvdW50ZG93bikge1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGNvdW50ZG93bjtcbn1cblxuUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLlRZUEUgPSBcInByZVRvdXJuYW1lbnRJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q291bnRkb3duXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q291bnRkb3duID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBkYXRhLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdGlmKHRoaXMuY291bnRkb3duIDwgMClcblx0XHR0aGlzLmNvdW50ZG93biA9IDA7XG5cdFxuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRjb3VudGRvd246IHRoaXMuY291bnRkb3duXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZVxuICovXG5mdW5jdGlvbiBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2UoYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gbnVsbDtcbn1cblxuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEUgPSBcInByZXNldEJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRCdXR0b25cbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuYnV0dG9uID0gZGF0YS5idXR0b247XG5cdHRoaXMudmFsdWUgPSBkYXRhLnZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRidXR0b246IHRoaXMuYnV0dG9uLFxuXHRcdHZhbHVlOiB0aGlzLnZhbHVlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlOyIsInZhciBQcmVzZXRCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvUHJlc2V0QnV0dG9uRGF0YVwiKTtcblxuLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgUHJlc2V0QnV0dG9uc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uc01lc3NhZ2UoKSB7XG5cdHRoaXMuYnV0dG9ucyA9IG5ldyBBcnJheSg3KTtcblx0dGhpcy5jdXJyZW50ID0gbnVsbDtcbn1cblxuUHJlc2V0QnV0dG9uc01lc3NhZ2UuVFlQRSA9IFwicHJlc2V0QnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uc1xuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b25zO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q3VycmVudFxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q3VycmVudCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jdXJyZW50O1xufVxuXG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuY3VycmVudCA9IGRhdGEuY3VycmVudDtcblxuXHR0aGlzLmJ1dHRvbnMgPSBuZXcgQXJyYXkoKTtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgZGF0YS5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbiA9IGRhdGEuYnV0dG9uc1tpXTtcblx0XHR2YXIgYnV0dG9uRGF0YSA9IG51bGw7XG5cblx0XHRpZihidXR0b24gIT0gbnVsbCkge1xuXHRcdFx0YnV0dG9uRGF0YSA9IG5ldyBQcmVzZXRCdXR0b25EYXRhKCk7XG5cblx0XHRcdGJ1dHRvbkRhdGEuYnV0dG9uID0gYnV0dG9uLmJ1dHRvbjtcblx0XHRcdGJ1dHRvbkRhdGEudmFsdWUgPSBidXR0b24udmFsdWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5idXR0b25zLnB1c2goYnV0dG9uRGF0YSk7XG5cdH1cbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIG9iamVjdCA9IHtcblx0XHRidXR0b25zOiBbXSxcblx0XHRjdXJyZW50OiB0aGlzLmN1cnJlbnRcblx0fTtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSB0aGlzLmJ1dHRvbnNbaV07XG5cdFx0aWYoYnV0dG9uRGF0YSAhPSBudWxsKVxuXHRcdFx0b2JqZWN0LmJ1dHRvbnMucHVzaCh7XG5cdFx0XHRcdGJ1dHRvbjogYnV0dG9uRGF0YS5idXR0b24sXG5cdFx0XHRcdHZhbHVlOiBidXR0b25EYXRhLnZhbHVlXG5cdFx0XHR9KTtcblxuXHRcdGVsc2Vcblx0XHRcdG9iamVjdC5idXR0b25zLnB1c2gobnVsbCk7XG5cdH1cblxuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogTWVzc2FnZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHVzZXIgaGFzIGNsaWNrZWQgYSBzZWF0LlxuICogQGNsYXNzIFNlYXRDbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gU2VhdENsaWNrTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5zZWF0SW5kZXg9c2VhdEluZGV4O1xufVxuXG5TZWF0Q2xpY2tNZXNzYWdlLlRZUEUgPSBcInNlYXRDbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cblNlYXRDbGlja01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuU2VhdENsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5TZWF0Q2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXRDbGlja01lc3NhZ2U7IiwiLyoqXG4gKiBTaG93IHVzZXJuYW1lIGFuZCBjaGlwcyBvbiBzZWF0LlxuICogQGNsYXNzIFNlYXRJbmZvTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTZWF0SW5mb01lc3NhZ2Uoc2VhdEluZGV4KSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMuc2l0b3V0ID0gZmFsc2U7XG5cdHRoaXMubmFtZSA9IFwiXCI7XG5cdHRoaXMuY2hpcHMgPSBcIlwiO1xufVxuXG5TZWF0SW5mb01lc3NhZ2UuVFlQRSA9IFwic2VhdEluZm9cIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXROYW1lXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5uYW1lO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q2hpcHNcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDaGlwcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGlwcztcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGlzU2l0b3V0XG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuaXNTaXRvdXQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2l0b3V0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgaXNBY3RpdmVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5hY3RpdmU7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRBY3RpdmVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRBY3RpdmUgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuYWN0aXZlID0gdjtcbn1cblxuLyoqXG4gKiBTZXQgc2l0b3V0LlxuICogQG1ldGhvZCBzZXRTaXRvdXRcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRTaXRvdXQgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuc2l0b3V0ID0gdjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldE5hbWVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXROYW1lID0gZnVuY3Rpb24odikge1xuXHR0aGlzLm5hbWUgPSB2O1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0Q2hpcHNcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRDaGlwcyA9IGZ1bmN0aW9uKHYpIHtcblx0dGhpcy5jaGlwcyA9IHY7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG5cdHRoaXMuY2hpcHMgPSBkYXRhLmNoaXBzO1xuXHR0aGlzLnNpdG91dCA9IGRhdGEuc2l0b3V0O1xuXHR0aGlzLmFjdGl2ZSA9IGRhdGEuYWN0aXZlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdG5hbWU6IHRoaXMubmFtZSxcblx0XHRjaGlwczogdGhpcy5jaGlwcyxcblx0XHRzaXRvdXQ6IHRoaXMuc2l0b3V0LFxuXHRcdGFjdGl2ZTogdGhpcy5hY3RpdmVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0SW5mb01lc3NhZ2U7IiwiLyoqXG4gKiBTaG93IGRpYWxvZywgZm9yIGUuZy4gYnV5IGluLlxuICogQGNsYXNzIFNob3dEaWFsb2dNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFNob3dEaWFsb2dNZXNzYWdlKCkge1xuXHR0aGlzLnRleHQgPSBcIlwiO1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblx0dGhpcy5kZWZhdWx0VmFsdWUgPSBudWxsO1xufVxuXG5TaG93RGlhbG9nTWVzc2FnZS5UWVBFID0gXCJzaG93RGlhbG9nXCI7XG5cbi8qKlxuICogQWRkIGEgYnV0dG9uIHRvIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGFkZEJ1dHRvblxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuYWRkQnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59XG5cbi8qKlxuICogR2V0IHRleHQgb2YgdGhlIGRpYWxvZy5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldCBhcnJheSBvZiBCdXR0b25EYXRhIHRvIGJlIHNob3duIGluIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9ucztcbn1cblxuLyoqXG4gKiBHZXQgZGVmYXVsdCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uc1xuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuZ2V0RGVmYXVsdFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgZGVmYXVsdCB2YWx1ZS5cbiAqIEBtZXRob2Qgc2V0RGVmYXVsdFZhbHVlXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5zZXREZWZhdWx0VmFsdWUgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuZGVmYXVsdFZhbHVlPXY7XG59XG5cbi8qKlxuICogU2V0IHRleHQgaW4gdGhlIGRpYWxvZy5cbiAqIEBtZXRob2Qgc2V0VGV4dFxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5idXR0b25zID0gZGF0YS5idXR0b25zO1xuXHR0aGlzLmRlZmF1bHRWYWx1ZSA9IGRhdGEuZGVmYXVsdFZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRidXR0b25zOiB0aGlzLmJ1dHRvbnMsXG5cdFx0ZGVmYXVsdFZhbHVlOiB0aGlzLmRlZmF1bHRWYWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNob3dEaWFsb2dNZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIFN0YXRlQ29tcGxldGVNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFN0YXRlQ29tcGxldGVNZXNzYWdlKCkge31cblxuU3RhdGVDb21wbGV0ZU1lc3NhZ2UuVFlQRSA9IFwic3RhdGVDb21wbGV0ZVwiO1xuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblN0YXRlQ29tcGxldGVNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHt9XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5TdGF0ZUNvbXBsZXRlTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZUNvbXBsZXRlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gdGFibGUgYnV0dG9uIGNsaWNrZWQuXG4gKiBAY2xhc3MgVGFibGVCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGFibGVCdXR0b25DbGlja01lc3NhZ2UodGFibGVJbmRleCkge1xuXHR0aGlzLnRhYmxlSW5kZXggPSB0YWJsZUluZGV4O1xufVxuXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUYWJsZUluZGV4XG4gKi9cblRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRUYWJsZUluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGFibGVJbmRleCA9IGRhdGEudGFibGVJbmRleDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0YWJsZUluZGV4OiB0aGlzLnRhYmxlSW5kZXhcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUYWJsZUJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlQnV0dG9uc01lc3NhZ2UoKSB7XG5cdHRoaXMuZW5hYmxlZCA9IG5ldyBBcnJheSgpO1xuXHR0aGlzLmN1cnJlbnRJbmRleCA9IC0xO1xuXHR0aGlzLnBsYXllckluZGV4ID0gLTE7XG5cdHRoaXMuaW5mb0xpbmsgPSBcIlwiO1xufVxuXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLlRZUEUgPSBcInRhYmxlQnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RW5hYmxlZFxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRFbmFibGVkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmVuYWJsZWQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDdXJyZW50SW5kZXhcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q3VycmVudEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmN1cnJlbnRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFBsYXllckluZGV4XG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldFBsYXllckluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnBsYXllckluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmsgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuaW5mb0xpbms7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5wbGF5ZXJJbmRleCA9IGRhdGEucGxheWVySW5kZXg7XG5cdHRoaXMuY3VycmVudEluZGV4ID0gZGF0YS5jdXJyZW50SW5kZXg7XG5cdHRoaXMuaW5mb0xpbmsgPSBkYXRhLmluZm9MaW5rO1xuXG5cdHRoaXMuZW5hYmxlZCA9IG5ldyBBcnJheSgpO1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgZGF0YS5lbmFibGVkLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuZW5hYmxlZC5wdXNoKGRhdGEuZW5hYmxlZFtpXSk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIG9iamVjdCA9IHtcblx0XHRjdXJyZW50SW5kZXg6IHRoaXMuY3VycmVudEluZGV4LFxuXHRcdHBsYXllckluZGV4OiB0aGlzLnBsYXllckluZGV4LFxuXHRcdGVuYWJsZWQ6IFtdLFxuXHRcdGluZm9MaW5rOiB0aGlzLmluZm9MaW5rXG5cdH07XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuZW5hYmxlZC5sZW5ndGg7IGkrKylcblx0XHRvYmplY3QuZW5hYmxlZC5wdXNoKHRoaXMuZW5hYmxlZFtpXSk7XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRhYmxlSW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGFibGVJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG5cdHRoaXMudGV4dCA9IHRleHQ7XG5cdHRoaXMuc2hvd0pvaW5CdXR0b24gPSBmYWxzZTtcblx0dGhpcy5zaG93TGVhdmVCdXR0b24gPSBmYWxzZTtcblx0dGhpcy5pbmZvTGluayA9IG51bGw7XG5cdHRoaXMuaW5mb0xpbmtUZXh0ID0gbnVsbDtcbn1cblxuVGFibGVJbmZvTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUluZm9cIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENvdW50ZG93blxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDb3VudGRvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY291bnRkb3duO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTaG93Sm9pbkJ1dHRvblxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTaG93Sm9pbkJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zaG93Sm9pbkJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNob3dMZWF2ZUJ1dHRvblxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTaG93TGVhdmVCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2hvd0xlYXZlQnV0dG9uO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmsgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuaW5mb0xpbms7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRJbmZvTGlua1RleHRcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rVGV4dDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHRpZihkYXRhLnRleHQgIT0gbnVsbClcblx0XHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cblx0aWYoZGF0YS5jb3VudGRvd24gIT0gbnVsbClcblx0XHR0aGlzLmNvdW50ZG93biA9IGRhdGEuY291bnRkb3duO1xuXG5cdGlmKGRhdGEuc2hvd0pvaW5CdXR0b24gIT0gbnVsbClcblx0XHR0aGlzLnNob3dKb2luQnV0dG9uID0gZGF0YS5zaG93Sm9pbkJ1dHRvbjtcblxuXHRpZihkYXRhLnNob3dMZWF2ZUJ1dHRvbiAhPSBudWxsKVxuXHRcdHRoaXMuc2hvd0xlYXZlQnV0dG9uID0gZGF0YS5zaG93TGVhdmVCdXR0b247XG5cblx0aWYoZGF0YS5pbmZvTGluayAhPSBudWxsKVxuXHRcdHRoaXMuaW5mb0xpbmsgPSBkYXRhLmluZm9MaW5rO1xuXG5cdGlmKGRhdGEuaW5mb0xpbmtUZXh0ICE9IG51bGwpXG5cdFx0dGhpcy5pbmZvTGlua1RleHQgPSBkYXRhLmluZm9MaW5rVGV4dDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRjb3VudGRvd246IHRoaXMuY291bnRkb3duLFxuXHRcdHNob3dKb2luQnV0dG9uOiB0aGlzLnNob3dKb2luQnV0dG9uLFxuXHRcdHNob3dMZWF2ZUJ1dHRvbjogdGhpcy5zaG93TGVhdmVCdXR0b24sXG5cdFx0aW5mb0xpbms6IHRoaXMuaW5mb0xpbmssXG5cdFx0aW5mb0xpbmtUZXh0OiB0aGlzLmluZm9MaW5rVGV4dFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRhYmxlSW5mb01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgVGVzdENhc2VSZXF1ZXN0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlKHRlc3RDYXNlKSB7XG5cdHRoaXMudGVzdENhc2UgPSB0ZXN0Q2FzZTtcbn1cblxuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5UWVBFID0gXCJ0ZXN0Q2FzZVJlcXVlc3RcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRlc3RDYXNlXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLmdldFRlc3RDYXNlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRlc3RDYXNlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGVzdENhc2UgPSBkYXRhLnRlc3RDYXNlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGVzdENhc2U6IHRoaXMudGVzdENhc2Vcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRpbWVyTWVzc2FnZVxuICovXG5mdW5jdGlvbiBUaW1lck1lc3NhZ2UoKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gLTE7XG5cdHRoaXMudG90YWxUaW1lID0gLTE7XG5cdHRoaXMudGltZUxlZnQgPSAtMTtcbn1cblxuVGltZXJNZXNzYWdlLlRZUEUgPSBcInRpbWVyXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VG90YWxUaW1lXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0VG90YWxUaW1lID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRvdGFsVGltZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRpbWVMZWZ0XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGltZUxlZnQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGltZUxlZnQ7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRTZWF0SW5kZXhcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS5zZXRTZWF0SW5kZXggPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0VG90YWxUaW1lXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0VG90YWxUaW1lID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy50b3RhbFRpbWUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldFRpbWVMZWZ0XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0VGltZUxlZnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLnRpbWVMZWZ0ID0gdmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLnRvdGFsVGltZSA9IGRhdGEudG90YWxUaW1lO1xuXHR0aGlzLnRpbWVMZWZ0ID0gZGF0YS50aW1lTGVmdDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHR0b3RhbFRpbWU6IHRoaXMudG90YWxUaW1lLFxuXHRcdHRpbWVMZWZ0OiB0aGlzLnRpbWVMZWZ0XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGltZXJNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiB0b3VybmFtZW50IHJlc3VsdCBtZXNzYWdlIGlzIGRpc3BhdGNoZWQuXG4gKiBAY2xhc3MgVG91cm5hbWVudFJlc3VsdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UodGV4dCwgcmlnaHRDb2x1bW5UZXh0KSB7XG5cdHRoaXMudGV4dCA9IHRleHQ7XG5cdHRoaXMucmlnaHRDb2x1bW5UZXh0ID0gcmlnaHRDb2x1bW5UZXh0O1xufVxuXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5UWVBFID0gXCJ0b3VybmFtZW50UmVzdWx0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRSaWdodENvbHVtblRleHRcbiAqL1xuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UucHJvdG90eXBlLmdldFJpZ2h0Q29sdW1uVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5yaWdodENvbHVtblRleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5yaWdodENvbHVtblRleHQgPSBkYXRhLnJpZ2h0Q29sdW1uVGV4dDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0cmlnaHRDb2x1bW5UZXh0OiB0aGlzLnJpZ2h0Q29sdW1uVGV4dFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBCdXR0b24uXG4gKiBAY2xhc3MgQnV0dG9uXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbihjb250ZW50KSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdGlmIChjb250ZW50KVxuXHRcdHRoaXMuYWRkQ2hpbGQoY29udGVudCk7XG5cblx0dGhpcy5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMuYnV0dG9uTW9kZSA9IHRydWU7XG5cblx0dGhpcy5tb3VzZW92ZXIgPSB0aGlzLm9uTW91c2VvdmVyLmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2VvdXQgPSB0aGlzLm9uTW91c2VvdXQuYmluZCh0aGlzKTtcblx0dGhpcy5tb3VzZWRvd24gPSB0aGlzLm9uTW91c2Vkb3duLmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2V1cCA9IHRoaXMub25Nb3VzZXVwLmJpbmQodGhpcyk7XG5cdHRoaXMuY2xpY2sgPSB0aGlzLm9uQ2xpY2suYmluZCh0aGlzKTtcblxuXHR0aGlzLmNvbG9yTWF0cml4RmlsdGVyID0gbmV3IFBJWEkuQ29sb3JNYXRyaXhGaWx0ZXIoKTtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG5cblx0dGhpcy5maWx0ZXJzID0gW3RoaXMuY29sb3JNYXRyaXhGaWx0ZXJdO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEJ1dHRvbiwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KEJ1dHRvbik7XG5cbkJ1dHRvbi5MSUdIVF9NQVRSSVggPSBbMS41LCAwLCAwLCAwLCAwLCAxLjUsIDAsIDAsIDAsIDAsIDEuNSwgMCwgMCwgMCwgMCwgMV07XG5CdXR0b24uREFSS19NQVRSSVggPSBbLjc1LCAwLCAwLCAwLCAwLCAuNzUsIDAsIDAsIDAsIDAsIC43NSwgMCwgMCwgMCwgMCwgMV07XG5CdXR0b24uREVGQVVMVF9NQVRSSVggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG5cbkJ1dHRvbi5DTElDSyA9IFwiY2xpY2tcIjtcblxuLyoqXG4gKiBNb3VzZSBvdmVyLlxuICogQG1ldGhvZCBvbk1vdXNlb3ZlclxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNlb3ZlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNvbG9yTWF0cml4RmlsdGVyLm1hdHJpeCA9IEJ1dHRvbi5MSUdIVF9NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2Ugb3V0LlxuICogQG1ldGhvZCBvbk1vdXNlb3V0XG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uTW91c2VvdXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uREVGQVVMVF9NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2UgZG93bi5cbiAqIEBtZXRob2Qgb25Nb3VzZWRvd25cbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZWRvd24gPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uREFSS19NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2UgdXAuXG4gKiBAbWV0aG9kIG9uTW91c2V1cFxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNldXAgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uTElHSFRfTUFUUklYO1xufVxuXG4vKipcbiAqIENsaWNrLlxuICogQG1ldGhvZCBvbkNsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50cmlnZ2VyKEJ1dHRvbi5DTElDSyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi9CdXR0b25cIik7XG5cbi8qKlxuICogQ2hlY2tib3guXG4gKiBAY2xhc3MgQ2hlY2tib3hcbiAqL1xuZnVuY3Rpb24gQ2hlY2tib3goYmFja2dyb3VuZCwgdGljaykge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmJ1dHRvbiA9IG5ldyBCdXR0b24oYmFja2dyb3VuZCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b24pO1xuXG5cdHRoaXMuY2hlY2sgPSB0aWNrO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY2hlY2spO1xuXG5cdHRoaXMuYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xuXG5cdHRoaXMuc2V0Q2hlY2tlZChmYWxzZSk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2hlY2tib3gsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGVja2JveCk7XG5cbi8qKlxuICogQnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvbkJ1dHRvbkNsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5DaGVja2JveC5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNoZWNrLnZpc2libGUgPSAhdGhpcy5jaGVjay52aXNpYmxlO1xuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiKTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldENoZWNrZWRcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLnNldENoZWNrZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLmNoZWNrLnZpc2libGUgPSB2YWx1ZTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q2hlY2tlZFxuICovXG5DaGVja2JveC5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVjay52aXNpYmxlO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3g7IiwidmFyIFBJWEk9cmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsPXJlcXVpcmUoXCIuLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG5cbmZ1bmN0aW9uIENvbnRlbnRTY2FsZXIoY29udGVudCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmNvbnRlbnRXaWR0aD0xMDA7XG5cdHRoaXMuY29udGVudEhlaWdodD0xMDA7XG5cblx0dGhpcy5zY3JlZW5XaWR0aD0xMDA7XG5cdHRoaXMuc2NyZWVuSGVpZ2h0PTEwMDtcblxuXHR0aGlzLnRoZU1hc2s9bnVsbDtcblxuXHRpZiAoY29udGVudClcblx0XHR0aGlzLnNldENvbnRlbnQoY29udGVudCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ29udGVudFNjYWxlcixQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRDb250ZW50PWZ1bmN0aW9uKGNvbnRlbnQpIHtcblx0dGhpcy5jb250ZW50PWNvbnRlbnQ7XG5cblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRlbnQpO1xuXG5cdGlmICh0aGlzLnRoZU1hc2spIHtcblx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMudGhlTWFzayk7XG5cdFx0dGhpcy50aGVNYXNrPW51bGw7XG5cdH1cblxuXHR0aGlzLnRoZU1hc2s9bmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0Ly90aGlzLmFkZENoaWxkKHRoaXMudGhlTWFzayk7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRDb250ZW50U2l6ZT1mdW5jdGlvbihjb250ZW50V2lkdGgsIGNvbnRlbnRIZWlnaHQpIHtcblx0dGhpcy5jb250ZW50V2lkdGg9Y29udGVudFdpZHRoO1xuXHR0aGlzLmNvbnRlbnRIZWlnaHQ9Y29udGVudEhlaWdodDtcblxuXHR0aGlzLnVwZGF0ZVNjYWxlKCk7XG59XG5cbkNvbnRlbnRTY2FsZXIucHJvdG90eXBlLnNldFNjcmVlblNpemU9ZnVuY3Rpb24oc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkge1xuXHR0aGlzLnNjcmVlbldpZHRoPXNjcmVlbldpZHRoO1xuXHR0aGlzLnNjcmVlbkhlaWdodD1zY3JlZW5IZWlnaHQ7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS51cGRhdGVTY2FsZT1mdW5jdGlvbigpIHtcblx0dmFyIHNjYWxlO1xuXG5cdGlmICh0aGlzLnNjcmVlbldpZHRoL3RoaXMuY29udGVudFdpZHRoPHRoaXMuc2NyZWVuSGVpZ2h0L3RoaXMuY29udGVudEhlaWdodClcblx0XHRzY2FsZT10aGlzLnNjcmVlbldpZHRoL3RoaXMuY29udGVudFdpZHRoO1xuXG5cdGVsc2Vcblx0XHRzY2FsZT10aGlzLnNjcmVlbkhlaWdodC90aGlzLmNvbnRlbnRIZWlnaHQ7XG5cblx0dGhpcy5jb250ZW50LnNjYWxlLng9c2NhbGU7XG5cdHRoaXMuY29udGVudC5zY2FsZS55PXNjYWxlO1xuXG5cdHZhciBzY2FsZWRXaWR0aD10aGlzLmNvbnRlbnRXaWR0aCpzY2FsZTtcblx0dmFyIHNjYWxlZEhlaWdodD10aGlzLmNvbnRlbnRIZWlnaHQqc2NhbGU7XG5cblx0dGhpcy5jb250ZW50LnBvc2l0aW9uLng9KHRoaXMuc2NyZWVuV2lkdGgtc2NhbGVkV2lkdGgpLzI7XG5cdHRoaXMuY29udGVudC5wb3NpdGlvbi55PSh0aGlzLnNjcmVlbkhlaWdodC1zY2FsZWRIZWlnaHQpLzI7XG5cblx0dmFyIHI9bmV3IFBJWEkuUmVjdGFuZ2xlKHRoaXMuY29udGVudC5wb3NpdGlvbi54LHRoaXMuY29udGVudC5wb3NpdGlvbi55LHNjYWxlZFdpZHRoLHNjYWxlZEhlaWdodCk7XG5cdHZhciByaWdodD1yLngrci53aWR0aDtcblx0dmFyIGJvdHRvbT1yLnkrci5oZWlnaHQ7XG5cblx0dGhpcy50aGVNYXNrLmNsZWFyKCk7XG5cdHRoaXMudGhlTWFzay5iZWdpbkZpbGwoKTtcblx0dGhpcy50aGVNYXNrLmRyYXdSZWN0KDAsMCx0aGlzLnNjcmVlbldpZHRoLHIueSk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLDAsci54LHRoaXMuc2NyZWVuSGVpZ2h0KTtcblx0dGhpcy50aGVNYXNrLmRyYXdSZWN0KHJpZ2h0LDAsdGhpcy5zY3JlZW5XaWR0aC1yaWdodCx0aGlzLnNjcmVlbkhlaWdodCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLGJvdHRvbSx0aGlzLnNjcmVlbldpZHRoLHRoaXMuc2NyZWVuSGVpZ2h0LWJvdHRvbSk7XG5cdHRoaXMudGhlTWFzay5lbmRGaWxsKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzPUNvbnRlbnRTY2FsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQVMzL2pxdWVyeSBzdHlsZSBldmVudCBkaXNwYXRjaGVyLiBTbGlnaHRseSBtb2RpZmllZC4gVGhlXG4gKiBqcXVlcnkgc3R5bGUgb24vb2ZmL3RyaWdnZXIgc3R5bGUgb2YgYWRkaW5nIGxpc3RlbmVycyBpc1xuICogY3VycmVudGx5IHRoZSBwcmVmZXJyZWQgb25lLlxuICogXG4gKiBUaGUgb24gbWV0aG9kIGZvciBhZGRpbmcgbGlzdGVuZXJzIHRha2VzIGFuIGV4dHJhIHBhcmFtZXRlciB3aGljaCBpcyB0aGVcbiAqIHNjb3BlIGluIHdoaWNoIGxpc3RlbmVycyBzaG91bGQgYmUgY2FsbGVkLiBTbyB0aGlzOlxuICpcbiAqICAgICBvYmplY3Qub24oXCJldmVudFwiLCBsaXN0ZW5lciwgdGhpcyk7XG4gKlxuICogSGFzIHRoZSBzYW1lIGZ1bmN0aW9uIHdoZW4gYWRkaW5nIGV2ZW50cyBhczpcbiAqXG4gKiAgICAgb2JqZWN0Lm9uKFwiZXZlbnRcIiwgbGlzdGVuZXIuYmluZCh0aGlzKSk7XG4gKlxuICogSG93ZXZlciwgdGhlIGRpZmZlcmVuY2UgaXMgdGhhdCBpZiB3ZSB1c2UgdGhlIHNlY29uZCBtZXRob2QgaXRcbiAqIHdpbGwgbm90IGJlIHBvc3NpYmxlIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXJzIGxhdGVyLCB1bmxlc3NcbiAqIHRoZSBjbG9zdXJlIGNyZWF0ZWQgYnkgYmluZCBpcyBzdG9yZWQgc29tZXdoZXJlLiBJZiB0aGUgXG4gKiBmaXJzdCBtZXRob2QgaXMgdXNlZCwgd2UgY2FuIHJlbW92ZSB0aGUgbGlzdGVuZXIgd2l0aDpcbiAqXG4gKiAgICAgb2JqZWN0Lm9mZihcImV2ZW50XCIsIGxpc3RlbmVyLCB0aGlzKTtcbiAqXG4gKiBAY2xhc3MgRXZlbnREaXNwYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcblx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xufVxuXG4vKipcbiAqIEFkZCBldmVudCBsaXN0ZW5lci5cbiAqIEBtZXRob2QgYWRkRXZlbnRMaXN0ZW5lclxuICogQGRlcHJlY2F0ZWRcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBsaXN0ZW5lciwgc2NvcGUpIHtcblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwKVxuXHRcdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcblxuXHRpZiAoIWV2ZW50VHlwZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB0eXBlIHJlcXVpcmVkIGZvciBldmVudCBkaXNwYXRjaGVyXCIpO1xuXG5cdGlmICghbGlzdGVuZXIpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTGlzdGVuZXIgcmVxdWlyZWQgZm9yIGV2ZW50IGRpc3BhdGNoZXJcIik7XG5cblx0dGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKTtcblxuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSlcblx0XHR0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV0gPSBbXTtcblxuXHR0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV0ucHVzaCh7XG5cdFx0bGlzdGVuZXI6IGxpc3RlbmVyLFxuXHRcdHNjb3BlOiBzY29wZVxuXHR9KTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXIuXG4gKiBAbWV0aG9kIHJlbW92ZUV2ZW50TGlzdGVuZXJcbiAqIEBkZXByZWNhdGVkXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpXG5cdFx0cmV0dXJuO1xuXG5cdHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgbGlzdGVuZXJPYmogPSBsaXN0ZW5lcnNbaV07XG5cblx0XHRpZiAobGlzdGVuZXIgPT0gbGlzdGVuZXJPYmoubGlzdGVuZXIgJiYgc2NvcGUgPT0gbGlzdGVuZXJPYmouc2NvcGUpIHtcblx0XHRcdGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRpLS07XG5cdFx0fVxuXHR9XG5cblx0aWYgKCFsaXN0ZW5lcnMubGVuZ3RoKVxuXHRcdGRlbGV0ZSB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggZXZlbnQuXG4gKiBAbWV0aG9kIGRpc3BhdGNoRXZlbnRcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQsIGRhdGEpIHtcblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwKVxuXHRcdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcblxuXHRpZiAodHlwZW9mIGV2ZW50ID09IFwic3RyaW5nXCIpIHtcblx0XHRldmVudCA9IHtcblx0XHRcdHR5cGU6IGV2ZW50XG5cdFx0fTtcblx0fVxuXG5cdGlmICghdGhpcy5saXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShldmVudC50eXBlKSlcblx0XHRyZXR1cm47XG5cblx0aWYgKGRhdGEgPT0gdW5kZWZpbmVkKVxuXHRcdGRhdGEgPSBldmVudDtcblxuXHRkYXRhLnRhcmdldCA9IHRoaXM7XG5cblx0Zm9yICh2YXIgaSBpbiB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50LnR5cGVdKSB7XG5cdFx0dmFyIGxpc3RlbmVyT2JqID0gdGhpcy5saXN0ZW5lck1hcFtldmVudC50eXBlXVtpXTtcblxuXHRcdGxpc3RlbmVyT2JqLmxpc3RlbmVyLmNhbGwobGlzdGVuZXJPYmouc2NvcGUsIGRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciBhZGRFdmVudExpc3RlbmVyXG4gKiBAbWV0aG9kIG9uXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciByZW1vdmVFdmVudExpc3RlbmVyXG4gKiBAbWV0aG9kIG9mZlxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcblxuLyoqXG4gKiBKcXVlcnkgc3R5bGUgYWxpYXMgZm9yIGRpc3BhdGNoRXZlbnRcbiAqIEBtZXRob2QgdHJpZ2dlclxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XG5cbi8qKlxuICogTWFrZSBzb21ldGhpbmcgYW4gZXZlbnQgZGlzcGF0Y2hlci4gQ2FuIGJlIHVzZWQgZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLlxuICogQG1ldGhvZCBpbml0XG4gKiBAc3RhdGljXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5pbml0ID0gZnVuY3Rpb24oY2xzKSB7XG5cdGNscy5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcblx0Y2xzLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyO1xuXHRjbHMucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XG5cdGNscy5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uO1xuXHRjbHMucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmO1xuXHRjbHMucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnRyaWdnZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyOyIsIi8qKlxuICogRnVuY3Rpb24gdXRpbHMuXG4gKiBAY2xhc3MgRnVuY3Rpb25VdGlsXG4gKi9cbmZ1bmN0aW9uIEZ1bmN0aW9uVXRpbCgpIHtcbn1cblxuLyoqXG4gKiBFeHRlbmQgYSBjbGFzcy5cbiAqIERvbid0IGZvcmdldCB0byBjYWxsIHN1cGVyLlxuICogQG1ldGhvZCBleHRlbmRcbiAqIEBzdGF0aWNcbiAqL1xuRnVuY3Rpb25VdGlsLmV4dGVuZD1mdW5jdGlvbih0YXJnZXQsIGJhc2UpIHtcblx0dGFyZ2V0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGJhc2UucHJvdG90eXBlKTtcblx0dGFyZ2V0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj10YXJnZXQ7XG59XG5cbi8qKlxuICogQ3JlYXRlIGRlbGVnYXRlIGZ1bmN0aW9uLiBEZXByZWNhdGVkLCB1c2UgYmluZCgpIGluc3RlYWQuXG4gKiBAbWV0aG9kIGNyZWF0ZURlbGVnYXRlXG4gKiBAZGVwcmVjYXRlZFxuICogQHN0YXRpY1xuICovXG5GdW5jdGlvblV0aWwuY3JlYXRlRGVsZWdhdGU9ZnVuY3Rpb24oZnVuYywgc2NvcGUpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGZ1bmMuYXBwbHkoc2NvcGUsYXJndW1lbnRzKTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHM9RnVuY3Rpb25VdGlsO1xuIiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG5cbi8qKlxuICogQ3JlYXRlIGEgc3ByaXRlIHdpdGggYSBncmFkaWVudC5cbiAqIEBjbGFzcyBHcmFkaWVudFxuICovXG5mdW5jdGlvbiBHcmFkaWVudCgpIHtcblx0dGhpcy53aWR0aCA9IDEwMDtcblx0dGhpcy5oZWlnaHQgPSAxMDA7XG5cdHRoaXMuc3RvcHMgPSBbXTtcbn1cblxuLyoqXG4gKiBTZXQgc2l6ZSBvZiB0aGUgZ3JhZGllbnQuXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqL1xuR3JhZGllbnQucHJvdG90eXBlLnNldFNpemUgPSBmdW5jdGlvbih3LCBoKSB7XG5cdHRoaXMud2lkdGggPSB3O1xuXHR0aGlzLmhlaWdodCA9IGg7XG59XG5cbi8qKlxuICogQWRkIGNvbG9yIHN0b3AuXG4gKiBAbWV0aG9kIGFkZENvbG9yU3RvcFxuICovXG5HcmFkaWVudC5wcm90b3R5cGUuYWRkQ29sb3JTdG9wID0gZnVuY3Rpb24od2VpZ2h0LCBjb2xvcikge1xuXHR0aGlzLnN0b3BzLnB1c2goe1xuXHRcdHdlaWdodDogd2VpZ2h0LFxuXHRcdGNvbG9yOiBjb2xvclxuXHR9KTtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIHNwcml0ZS5cbiAqIEBtZXRob2QgY3JlYXRlU3ByaXRlXG4gKi9cbkdyYWRpZW50LnByb3RvdHlwZS5jcmVhdGVTcHJpdGUgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJyZW5kZXJpbmcgZ3JhZGllbnQuLi5cIik7XG5cdHZhciBjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0Yy53aWR0aCA9IHRoaXMud2lkdGg7XG5cdGMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cblx0dmFyIGN0eCA9IGMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXHR2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcblx0dmFyIGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc3RvcHMubGVuZ3RoOyBpKyspXG5cdFx0Z3JkLmFkZENvbG9yU3RvcCh0aGlzLnN0b3BzW2ldLndlaWdodCwgdGhpcy5zdG9wc1tpXS5jb2xvcik7XG5cblx0Y3R4LmZpbGxTdHlsZSA9IGdyZDtcblx0Y3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblxuXHRyZXR1cm4gbmV3IFBJWEkuU3ByaXRlKFBJWEkuVGV4dHVyZS5mcm9tQ2FudmFzKGMpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHcmFkaWVudDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBUaGVuYWJsZSA9IHJlcXVpcmUoXCIuL1RoZW5hYmxlXCIpO1xuXG4vKipcbiAqIE1lc3NhZ2UgY29ubmVjdGlvbiBpbiBhIGJyb3dzZXIuXG4gKiBAY2xhc3MgTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb25cbiAqL1xuZnVuY3Rpb24gTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24oKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXHR0aGlzLnRlc3QgPSAxO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLCBFdmVudERpc3BhdGNoZXIpO1xuXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNUID0gXCJjb25uZWN0XCI7XG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5NRVNTQUdFID0gXCJtZXNzYWdlXCI7XG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DTE9TRSA9IFwiY2xvc2VcIjtcblxuLyoqXG4gKiBDb25uZWN0LlxuICogQG1ldGhvZCBjb25uZWN0XG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24odXJsKSB7XG5cdHRoaXMud2ViU29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpO1xuXG5cdHRoaXMud2ViU29ja2V0Lm9ub3BlbiA9IHRoaXMub25XZWJTb2NrZXRPcGVuLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25XZWJTb2NrZXRNZXNzYWdlLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9uY2xvc2UgPSB0aGlzLm9uV2ViU29ja2V0Q2xvc2UuYmluZCh0aGlzKTtcblx0dGhpcy53ZWJTb2NrZXQub25lcnJvciA9IHRoaXMub25XZWJTb2NrZXRFcnJvci5iaW5kKHRoaXMpO1xufVxuXG4vKipcbiAqIFNlbmQuXG4gKiBAbWV0aG9kIHNlbmRcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihtKSB7XG5cdHRoaXMud2ViU29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobSkpO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgb3Blbi5cbiAqIEBtZXRob2Qgb25XZWJTb2NrZXRPcGVuXG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUub25XZWJTb2NrZXRPcGVuID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHJpZ2dlcihNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNUKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0TWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0TWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcblx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSk7XG5cblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5NRVNTQUdFLFxuXHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0fSk7XG59XG5cbi8qKlxuICogV2ViIHNvY2tldCBjbG9zZS5cbiAqIEBtZXRob2Qgb25XZWJTb2NrZXRDbG9zZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0Q2xvc2UgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJ3ZWIgc29ja2V0IGNsb3NlLCB3cz1cIiArIHRoaXMud2ViU29ja2V0ICsgXCIgdGhpcz1cIiArIHRoaXMudGVzdCk7XG5cdHRoaXMud2ViU29ja2V0LmNsb3NlKCk7XG5cdHRoaXMuY2xlYXJXZWJTb2NrZXQoKTtcblxuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgZXJyb3IuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0RXJyb3JcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldEVycm9yID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwid2ViIHNvY2tldCBlcnJvciwgd3M9XCIgKyB0aGlzLndlYlNvY2tldCArIFwiIHRoaXM9XCIgKyB0aGlzLnRlc3QpO1xuXG5cdHRoaXMud2ViU29ja2V0LmNsb3NlKCk7XG5cdHRoaXMuY2xlYXJXZWJTb2NrZXQoKTtcblxuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBjdXJyZW50IHdlYiBzb2NrZXQuXG4gKiBAbWV0aG9kIGNsZWFyV2ViU29ja2V0XG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5jbGVhcldlYlNvY2tldCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLndlYlNvY2tldC5vbm9wZW4gPSBudWxsO1xuXHR0aGlzLndlYlNvY2tldC5vbm1lc3NhZ2UgPSBudWxsO1xuXHR0aGlzLndlYlNvY2tldC5vbmNsb3NlID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25lcnJvciA9IG51bGw7XG5cblx0dGhpcy53ZWJTb2NrZXQgPSBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBNb3VzZU92ZXJHcm91cC4gVGhpcyBpcyB0aGUgY2xhc3MgZm9yIHRoZSBNb3VzZU92ZXJHcm91cC5cbiAqIEBjbGFzcyBNb3VzZU92ZXJHcm91cFxuICovXG5mdW5jdGlvbiBNb3VzZU92ZXJHcm91cCgpIHtcblx0dGhpcy5vYmplY3RzID0gbmV3IEFycmF5KCk7XG5cdHRoaXMuY3VycmVudGx5T3ZlciA9IGZhbHNlO1xuXHR0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuXG59XG5GdW5jdGlvblV0aWwuZXh0ZW5kKE1vdXNlT3Zlckdyb3VwLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoTW91c2VPdmVyR3JvdXApO1xuXG5cbi8qKlxuICogQWRkIGRpc3BsYXlvYmplY3QgdG8gd2F0Y2hsaXN0LlxuICogQG1ldGhvZCBhZGREaXNwbGF5T2JqZWN0XG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5hZGREaXNwbGF5T2JqZWN0ID0gZnVuY3Rpb24oZGlzcGxheU9iamVjdCkge1xuXG5cdGRpc3BsYXlPYmplY3QuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlb3ZlckVuYWJsZWQgPSB0cnVlO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlb3ZlciA9IHRoaXMub25PYmplY3RNb3VzZU92ZXIuYmluZCh0aGlzKTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW91dCA9IHRoaXMub25PYmplY3RNb3VzZU91dC5iaW5kKHRoaXMpO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlZG93biA9IHRoaXMub25PYmplY3RNb3VzZURvd24uYmluZCh0aGlzKTtcblx0dGhpcy5vYmplY3RzLnB1c2goZGlzcGxheU9iamVjdCk7XG5cbn1cblxuXG4vKipcbiAqIE1vdXNlIG92ZXIgb2JqZWN0LlxuICogQG1ldGhvZCBvbk9iamVjdE1vdXNlT3ZlclxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25PYmplY3RNb3VzZU92ZXIgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0aWYodGhpcy5jdXJyZW50bHlPdmVyKVxuXHRcdHJldHVybjtcblxuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSB0cnVlO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJtb3VzZW92ZXJcIik7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBvdXQgb2JqZWN0LlxuICogQG1ldGhvZCBvbk9iamVjdE1vdXNlT3V0XG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5vbk9iamVjdE1vdXNlT3V0ID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKCF0aGlzLmN1cnJlbnRseU92ZXIgfHwgdGhpcy5tb3VzZURvd24pXG5cdFx0cmV0dXJuO1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLm9iamVjdHMubGVuZ3RoOyBpKyspXG5cdFx0aWYodGhpcy5oaXRUZXN0KHRoaXMub2JqZWN0c1tpXSwgaW50ZXJhY3Rpb25fb2JqZWN0KSlcblx0XHRcdHJldHVybjtcblxuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwibW91c2VvdXRcIik7XG59XG5cblxuLyoqXG4gKiBIaXQgdGVzdC5cbiAqIEBtZXRob2QgaGl0VGVzdFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUuaGl0VGVzdCA9IGZ1bmN0aW9uKG9iamVjdCwgaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPiBvYmplY3QuZ2V0Qm91bmRzKCkueCApICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPCAob2JqZWN0LmdldEJvdW5kcygpLnggKyBvYmplY3QuZ2V0Qm91bmRzKCkud2lkdGgpKSAmJlxuXHRcdChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPiBvYmplY3QuZ2V0Qm91bmRzKCkueSkgJiYgKGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueSA8IChvYmplY3QuZ2V0Qm91bmRzKCkueSArIG9iamVjdC5nZXRCb3VuZHMoKS5oZWlnaHQpKSkge1xuXHRcdHJldHVybiB0cnVlO1x0XHRcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBkb3duIG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZURvd25cbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uT2JqZWN0TW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMubW91c2VEb3duID0gdHJ1ZTtcblx0aW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwID0gaW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwb3V0c2lkZSA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcbn1cblxuXG4vKipcbiAqIE1vdXNlIHVwIHN0YWdlLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VVcFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25TdGFnZU1vdXNlVXAgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0aW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwID0gaW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwb3V0c2lkZSA9IG51bGw7XG5cdHRoaXMubW91c2VEb3duID0gZmFsc2U7XG5cblx0aWYodGhpcy5jdXJyZW50bHlPdmVyKSB7XG5cdFx0dmFyIG92ZXIgPSBmYWxzZTtcblxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLm9iamVjdHMubGVuZ3RoOyBpKyspXG5cdFx0XHRpZih0aGlzLmhpdFRlc3QodGhpcy5vYmplY3RzW2ldLCBpbnRlcmFjdGlvbl9vYmplY3QpKVxuXHRcdFx0XHRvdmVyID0gdHJ1ZTtcblxuXHRcdGlmKCFvdmVyKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudChcIm1vdXNlb3V0XCIpO1xuXHRcdH1cblx0fVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VPdmVyR3JvdXA7XG5cbiIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIE5pbmUgc2xpY2UuIFRoaXMgaXMgYSBzcHJpdGUgdGhhdCBpcyBhIGdyaWQsIGFuZCBvbmx5IHRoZVxuICogbWlkZGxlIHBhcnQgc3RyZXRjaGVzIHdoZW4gc2NhbGluZy5cbiAqIEBjbGFzcyBOaW5lU2xpY2VcbiAqL1xuZnVuY3Rpb24gTmluZVNsaWNlKHRleHR1cmUsIGxlZnQsIHRvcCwgcmlnaHQsIGJvdHRvbSkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnRleHR1cmUgPSB0ZXh0dXJlO1xuXG5cdGlmICghdG9wKVxuXHRcdHRvcCA9IGxlZnQ7XG5cblx0aWYgKCFyaWdodClcblx0XHRyaWdodCA9IGxlZnQ7XG5cblx0aWYgKCFib3R0b20pXG5cdFx0Ym90dG9tID0gdG9wO1xuXG5cdHRoaXMubGVmdCA9IGxlZnQ7XG5cdHRoaXMudG9wID0gdG9wO1xuXHR0aGlzLnJpZ2h0ID0gcmlnaHQ7XG5cdHRoaXMuYm90dG9tID0gYm90dG9tO1xuXG5cdHRoaXMubG9jYWxXaWR0aCA9IHRleHR1cmUud2lkdGg7XG5cdHRoaXMubG9jYWxIZWlnaHQgPSB0ZXh0dXJlLmhlaWdodDtcblxuXHR0aGlzLmJ1aWxkUGFydHMoKTtcblx0dGhpcy51cGRhdGVTaXplcygpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE5pbmVTbGljZSwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuLyoqXG4gKiBCdWlsZCB0aGUgcGFydHMgZm9yIHRoZSBzbGljZXMuXG4gKiBAbWV0aG9kIGJ1aWxkUGFydHNcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUuYnVpbGRQYXJ0cyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgeHAgPSBbMCwgdGhpcy5sZWZ0LCB0aGlzLnRleHR1cmUud2lkdGggLSB0aGlzLnJpZ2h0LCB0aGlzLnRleHR1cmUud2lkdGhdO1xuXHR2YXIgeXAgPSBbMCwgdGhpcy50b3AsIHRoaXMudGV4dHVyZS5oZWlnaHQgLSB0aGlzLmJvdHRvbSwgdGhpcy50ZXh0dXJlLmhlaWdodF07XG5cdHZhciBoaSwgdmk7XG5cblx0dGhpcy5wYXJ0cyA9IFtdO1xuXG5cdGZvciAodmkgPSAwOyB2aSA8IDM7IHZpKyspIHtcblx0XHRmb3IgKGhpID0gMDsgaGkgPCAzOyBoaSsrKSB7XG5cdFx0XHR2YXIgdyA9IHhwW2hpICsgMV0gLSB4cFtoaV07XG5cdFx0XHR2YXIgaCA9IHlwW3ZpICsgMV0gLSB5cFt2aV07XG5cblx0XHRcdGlmICh3ICE9IDAgJiYgaCAhPSAwKSB7XG5cdFx0XHRcdHZhciB0ZXh0dXJlUGFydCA9IHRoaXMuY3JlYXRlVGV4dHVyZVBhcnQoeHBbaGldLCB5cFt2aV0sIHcsIGgpO1xuXHRcdFx0XHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlUGFydCk7XG5cdFx0XHRcdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0XHRcdFx0dGhpcy5wYXJ0cy5wdXNoKHMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wYXJ0cy5wdXNoKG51bGwpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFVwZGF0ZSBzaXplcy5cbiAqIEBtZXRob2QgdXBkYXRlU2l6ZXNcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUudXBkYXRlU2l6ZXMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHhwID0gWzAsIHRoaXMubGVmdCwgdGhpcy5sb2NhbFdpZHRoIC0gdGhpcy5yaWdodCwgdGhpcy5sb2NhbFdpZHRoXTtcblx0dmFyIHlwID0gWzAsIHRoaXMudG9wLCB0aGlzLmxvY2FsSGVpZ2h0IC0gdGhpcy5ib3R0b20sIHRoaXMubG9jYWxIZWlnaHRdO1xuXHR2YXIgaGksIHZpLCBpID0gMDtcblxuXHRmb3IgKHZpID0gMDsgdmkgPCAzOyB2aSsrKSB7XG5cdFx0Zm9yIChoaSA9IDA7IGhpIDwgMzsgaGkrKykge1xuXHRcdFx0aWYgKHRoaXMucGFydHNbaV0pIHtcblx0XHRcdFx0dmFyIHBhcnQgPSB0aGlzLnBhcnRzW2ldO1xuXG5cdFx0XHRcdHBhcnQucG9zaXRpb24ueCA9IHhwW2hpXTtcblx0XHRcdFx0cGFydC5wb3NpdGlvbi55ID0geXBbdmldO1xuXHRcdFx0XHRwYXJ0LndpZHRoID0geHBbaGkgKyAxXSAtIHhwW2hpXTtcblx0XHRcdFx0cGFydC5oZWlnaHQgPSB5cFt2aSArIDFdIC0geXBbdmldO1xuXHRcdFx0fVxuXG5cdFx0XHRpKys7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogU2V0IGxvY2FsIHNpemUuXG4gKiBAbWV0aG9kIHNldExvY2FsU2l6ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLnNldExvY2FsU2l6ZSA9IGZ1bmN0aW9uKHcsIGgpIHtcblx0dGhpcy5sb2NhbFdpZHRoID0gdztcblx0dGhpcy5sb2NhbEhlaWdodCA9IGg7XG5cdHRoaXMudXBkYXRlU2l6ZXMoKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGV4dHVyZSBwYXJ0LlxuICogQG1ldGhvZCBjcmVhdGVUZXh0dXJlUGFydFxuICogQHByaXZhdGVcbiAqL1xuTmluZVNsaWNlLnByb3RvdHlwZS5jcmVhdGVUZXh0dXJlUGFydCA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcblx0dmFyIGZyYW1lID0ge1xuXHRcdHg6IHRoaXMudGV4dHVyZS5mcmFtZS54ICsgeCxcblx0XHR5OiB0aGlzLnRleHR1cmUuZnJhbWUueSArIHksXG5cdFx0d2lkdGg6IHdpZHRoLFxuXHRcdGhlaWdodDogaGVpZ2h0XG5cdH07XG5cblx0cmV0dXJuIG5ldyBQSVhJLlRleHR1cmUodGhpcy50ZXh0dXJlLCBmcmFtZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmluZVNsaWNlOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBDb250ZW50U2NhbGVyID0gcmVxdWlyZShcIi4vQ29udGVudFNjYWxlclwiKTtcbi8vdmFyIEZyYW1lVGltZXIgPSByZXF1aXJlKFwiLi9GcmFtZVRpbWVyXCIpO1xuXG4vKipcbiAqIFBpeGkgZnVsbCB3aW5kb3cgYXBwLlxuICogQ2FuIG9wZXJhdGUgdXNpbmcgd2luZG93IGNvb3JkaW5hdGVzIG9yIHNjYWxlZCB0byBzcGVjaWZpYyBhcmVhLlxuICogQGNsYXNzIFBpeGlBcHBcbiAqL1xuZnVuY3Rpb24gUGl4aUFwcChkb21JZCwgd2lkdGgsIGhlaWdodCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR2YXIgdmlldztcblxuXHRpZiAobmF2aWdhdG9yLmlzQ29jb29uSlMpXG5cdFx0dmlldyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmVlbmNhbnZhcycpO1xuXG5cdGVsc2Vcblx0XHR2aWV3ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0aWYgKCFkb21JZCkge1xuXHRcdGlmIChQaXhpQXBwLmZ1bGxTY3JlZW5JbnN0YW5jZSlcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk9ubHkgb25lIFBpeGlBcHAgcGVyIGFwcFwiKTtcblxuXHRcdFBpeGlBcHAuZnVsbFNjcmVlbkluc3RhbmNlID0gdGhpcztcblxuXHRcdGNvbnNvbGUubG9nKFwibm8gZG9tIGl0LCBhdHRhY2hpbmcgdG8gYm9keVwiKTtcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gZG9jdW1lbnQuYm9keTtcblx0XHRkb2N1bWVudC5ib2R5LnN0eWxlLm1hcmdpbiA9IDA7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nID0gMDtcblxuXHRcdGRvY3VtZW50LmJvZHkub25yZXNpemUgPSBGdW5jdGlvblV0aWwuY3JlYXRlRGVsZWdhdGUodGhpcy5vbldpbmRvd1Jlc2l6ZSwgdGhpcyk7XG5cdFx0d2luZG93Lm9ucmVzaXplID0gRnVuY3Rpb25VdGlsLmNyZWF0ZURlbGVnYXRlKHRoaXMub25XaW5kb3dSZXNpemUsIHRoaXMpO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnNvbGUubG9nKFwiYXR0YWNoaW5nIHRvOiBcIiArIGRvbUlkKTtcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZG9tSWQpO1xuXHR9XG5cblx0dGhpcy5yZW5kZXJlciA9IG5ldyBQSVhJLmF1dG9EZXRlY3RSZW5kZXJlcih0aGlzLmNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCB0aGlzLmNvbnRhaW5lckVsLmNsaWVudEhlaWdodCwgdmlldyk7XG5cdHRoaXMuY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci52aWV3KTtcblxuXHR0aGlzLmNvbnRlbnRTY2FsZXIgPSBudWxsO1xuXG5cdHRoaXMuYXBwU3RhZ2UgPSBuZXcgUElYSS5TdGFnZSgwLCB0cnVlKTtcblxuXHRpZiAoIXdpZHRoIHx8ICFoZWlnaHQpXG5cdFx0dGhpcy51c2VOb1NjYWxpbmcoKTtcblxuXHRlbHNlXG5cdFx0dGhpcy51c2VTY2FsaW5nKHdpZHRoLCBoZWlnaHQpO1xuXG4vL1x0RnJhbWVUaW1lci5nZXRJbnN0YW5jZSgpLmFkZEV2ZW50TGlzdGVuZXIoRnJhbWVUaW1lci5SRU5ERVIsIHRoaXMub25BbmltYXRpb25GcmFtZSwgdGhpcyk7XG5cblx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uQW5pbWF0aW9uRnJhbWUuYmluZCh0aGlzKSk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoUGl4aUFwcCwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuLyoqXG4gKiBVc2Ugc2NhbGluZyBtb2RlLlxuICogQG1ldGhvZCB1c2VTY2FsaW5nXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLnVzZVNjYWxpbmcgPSBmdW5jdGlvbih3LCBoKSB7XG5cdHRoaXMucmVtb3ZlQ29udGVudCgpO1xuXG5cdHRoaXMuY29udGVudFNjYWxlciA9IG5ldyBDb250ZW50U2NhbGVyKHRoaXMpO1xuXHR0aGlzLmNvbnRlbnRTY2FsZXIuc2V0Q29udGVudFNpemUodywgaCk7XG5cdHRoaXMuY29udGVudFNjYWxlci5zZXRTY3JlZW5TaXplKHRoaXMuY29udGFpbmVyRWwuY2xpZW50V2lkdGgsIHRoaXMuY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0KTtcblx0dGhpcy5hcHBTdGFnZS5hZGRDaGlsZCh0aGlzLmNvbnRlbnRTY2FsZXIpO1xufVxuXG4vKipcbiAqIFVzZSBubyBzY2FsaW5nIG1vZGUuXG4gKiBAbWV0aG9kIHVzZU5vU2NhbGluZ1xuICovXG5QaXhpQXBwLnByb3RvdHlwZS51c2VOb1NjYWxpbmcgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5yZW1vdmVDb250ZW50KCk7XG5cblx0dGhpcy5hcHBTdGFnZS5hZGRDaGlsZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgYW55IGNvbnRlbnQuXG4gKiBAbWV0aG9kIHJlbW92ZUNvbnRlbnRcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLnJlbW92ZUNvbnRlbnQgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuYXBwU3RhZ2UuY2hpbGRyZW4uaW5kZXhPZih0aGlzKSA+PSAwKVxuXHRcdHRoaXMuYXBwU3RhZ2UucmVtb3ZlQ2hpbGQodGhpcyk7XG5cblx0aWYgKHRoaXMuY29udGVudFNjYWxlcikge1xuXHRcdHRoaXMuYXBwU3RhZ2UucmVtb3ZlQ2hpbGQodGhpcy5jb250ZW50U2NhbGVyKVxuXHRcdHRoaXMuY29udGVudFNjYWxlciA9IG51bGw7XG5cdH1cbn1cblxuLyoqXG4gKiBXaW5kb3cgcmVzaXplLlxuICogQG1ldGhvZCBvbldpbmRvd1Jlc2l6ZVxuICogQHByaXZhdGVcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuY29udGVudFNjYWxlcilcblx0XHR0aGlzLmNvbnRlbnRTY2FsZXIuc2V0U2NyZWVuU2l6ZSh0aGlzLmNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCB0aGlzLmNvbnRhaW5lckVsLmNsaWVudEhlaWdodCk7XG5cblx0dGhpcy5yZW5kZXJlci5yZXNpemUodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQpO1xuXHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcFN0YWdlKTtcbn1cblxuLyoqXG4gKiBBbmltYXRpb24gZnJhbWUuXG4gKiBAbWV0aG9kIG9uQW5pbWF0aW9uRnJhbWVcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLm9uQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbih0aW1lKSB7XG5cdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwU3RhZ2UpO1xuXHRUV0VFTi51cGRhdGUodGltZSk7XG5cblx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uQW5pbWF0aW9uRnJhbWUuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogR2V0IGNhbnZhcy5cbiAqIEBtZXRob2QgZ2V0Q2FudmFzXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLmdldENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5yZW5kZXJlci52aWV3O1xufVxuXG4vKipcbiAqIEdldCBzdGFnZS5cbiAqIEBtZXRob2QgZ2V0U3RhZ2VcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUuZ2V0U3RhZ2UgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYXBwU3RhZ2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGl4aUFwcDsiLCIvKipcbiAqIFJlcHJlc2VudHMgYSBwb2ludC5cbiAqIEBjbGFzcyBQb2ludFxuICovXG5mdW5jdGlvbiBQb2ludCh4LCB5KSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBQb2ludCkpXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcblxuXHR0aGlzLnggPSB4O1xuXHR0aGlzLnkgPSB5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50OyIsInZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIFBlcmZvcm0gdGFza3MgaW4gYSBzZXF1ZW5jZS5cbiAqIFRhc2tzLCB3aGljaCBzaG91bGQgYmUgZXZlbnQgZGlzcGF0Y2hlcnMsXG4gKiBhcmUgZXVxdWV1ZWQgd2l0aCB0aGUgZW5xdWV1ZSBmdW5jdGlvbixcbiAqIGEgU1RBUlQgZXZlbnQgaXMgZGlzcGF0Y2hlciB1cG9uIHRhc2tcbiAqIHN0YXJ0LCBhbmQgdGhlIHRhc2sgaXMgY29uc2lkZXJlZCBjb21wbGV0ZVxuICogYXMgaXQgZGlzcGF0Y2hlcyBhIENPTVBMRVRFIGV2ZW50LlxuICogQGNsYXNzIFNlcXVlbmNlclxuICovXG5mdW5jdGlvbiBTZXF1ZW5jZXIoKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMucXVldWUgPSBbXTtcblx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XG5cdHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlID0gdGhpcy5vblRhc2tDb21wbGV0ZS5iaW5kKHRoaXMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNlcXVlbmNlciwgRXZlbnREaXNwYXRjaGVyKTtcblxuU2VxdWVuY2VyLlNUQVJUID0gXCJzdGFydFwiO1xuU2VxdWVuY2VyLkNPTVBMRVRFID0gXCJjb21wbGV0ZVwiO1xuXG4vKipcbiAqIEVucXVldWUgYSB0YXNrIHRvIGJlIHBlcmZvcm1lZC5cbiAqIEBtZXRob2QgZW5xdWV1ZVxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLmVucXVldWUgPSBmdW5jdGlvbih0YXNrKSB7XG5cdGlmICghdGhpcy5jdXJyZW50VGFzaylcblx0XHR0aGlzLnN0YXJ0VGFzayh0YXNrKVxuXG5cdGVsc2Vcblx0XHR0aGlzLnF1ZXVlLnB1c2godGFzayk7XG59XG5cbi8qKlxuICogU3RhcnQgdGhlIHRhc2suXG4gKiBAbWV0aG9kIHN0YXJ0VGFza1xuICogQHByaXZhdGVcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5zdGFydFRhc2sgPSBmdW5jdGlvbih0YXNrKSB7XG5cdHRoaXMuY3VycmVudFRhc2sgPSB0YXNrO1xuXG5cdHRoaXMuY3VycmVudFRhc2suYWRkRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0dGhpcy5jdXJyZW50VGFzay5kaXNwYXRjaEV2ZW50KHtcblx0XHR0eXBlOiBTZXF1ZW5jZXIuU1RBUlRcblx0fSk7XG59XG5cbi8qKlxuICogVGhlIGN1cnJlbnQgdGFzayBpcyBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25UYXNrQ29tcGxldGVcbiAqwqBAcHJpdmF0ZVxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLm9uVGFza0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY3VycmVudFRhc2sucmVtb3ZlRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XG5cblx0aWYgKHRoaXMucXVldWUubGVuZ3RoID4gMClcblx0XHR0aGlzLnN0YXJ0VGFzayh0aGlzLnF1ZXVlLnNoaWZ0KCkpO1xuXG5cdGVsc2Vcblx0XHR0aGlzLnRyaWdnZXIoU2VxdWVuY2VyLkNPTVBMRVRFKTtcblxufVxuXG4vKipcbiAqIEFib3J0IHRoZSBzZXF1ZW5jZS5cbiAqIEBtZXRob2QgYWJvcnRcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jdXJyZW50VGFzaykge1xuXHRcdHRoaXMuY3VycmVudFRhc2sucmVtb3ZlRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0XHR0aGlzLmN1cnJlbnRUYXNrID0gbnVsbDtcblx0fVxuXG5cdHRoaXMucXVldWUgPSBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXF1ZW5jZXI7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIFNsaWRlci4gVGhpcyBpcyB0aGUgY2xhc3MgZm9yIHRoZSBzbGlkZXIuXG4gKiBAY2xhc3MgU2xpZGVyXG4gKi9cbmZ1bmN0aW9uIFNsaWRlcihiYWNrZ3JvdW5kLCBrbm9iKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYmFja2dyb3VuZCA9IGJhY2tncm91bmQ7XG5cdHRoaXMua25vYiA9IGtub2I7XG5cblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJhY2tncm91bmQpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMua25vYik7XG5cblxuXHR0aGlzLmtub2IuYnV0dG9uTW9kZSA9IHRydWU7XG5cdHRoaXMua25vYi5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMua25vYi5tb3VzZWRvd24gPSB0aGlzLm9uS25vYk1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXG5cdHRoaXMuYmFja2dyb3VuZC5idXR0b25Nb2RlID0gdHJ1ZTtcblx0dGhpcy5iYWNrZ3JvdW5kLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0dGhpcy5iYWNrZ3JvdW5kLm1vdXNlZG93biA9IHRoaXMub25CYWNrZ3JvdW5kTW91c2VEb3duLmJpbmQodGhpcyk7XG5cblx0dGhpcy5mYWRlVHdlZW4gPSBudWxsO1xuXHR0aGlzLmFscGhhID0gMDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTbGlkZXIsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChTbGlkZXIpO1xuXG5cbi8qKlxuICogTW91c2UgZG93biBvbiBrbm9iLlxuICogQG1ldGhvZCBvbktub2JNb3VzZURvd25cbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vbktub2JNb3VzZURvd24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5kb3duUG9zID0gdGhpcy5rbm9iLnBvc2l0aW9uLng7XG5cdHRoaXMuZG93blggPSBpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54O1xuXG5cdHRoaXMuc3RhZ2UubW91c2V1cCA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcblx0dGhpcy5zdGFnZS5tb3VzZW1vdmUgPSB0aGlzLm9uU3RhZ2VNb3VzZU1vdmUuYmluZCh0aGlzKTtcbn1cblxuXG4vKipcbiAqIE1vdXNlIGRvd24gb24gYmFja2dyb3VuZC5cbiAqIEBtZXRob2Qgb25CYWNrZ3JvdW5kTW91c2VEb3duXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25CYWNrZ3JvdW5kTW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuZG93blggPSBpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54O1xuXHR0aGlzLmtub2IueCA9IGludGVyYWN0aW9uX29iamVjdC5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLnggLSB0aGlzLmtub2Iud2lkdGgqMC41O1xuXG5cdHRoaXMudmFsaWRhdGVWYWx1ZSgpO1xuXG5cdHRoaXMuZG93blBvcyA9IHRoaXMua25vYi5wb3NpdGlvbi54O1xuXG5cdHRoaXMuc3RhZ2UubW91c2V1cCA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcblx0dGhpcy5zdGFnZS5tb3VzZW1vdmUgPSB0aGlzLm9uU3RhZ2VNb3VzZU1vdmUuYmluZCh0aGlzKTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIik7XG59XG5cblxuLyoqXG4gKiBNb3VzZSB1cC5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlVXBcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vblN0YWdlTW91c2VVcCA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLnN0YWdlLm1vdXNldXAgPSBudWxsO1xuXHR0aGlzLnN0YWdlLm1vdXNlbW92ZSA9IG51bGw7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBtb3ZlLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VNb3ZlXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25TdGFnZU1vdXNlTW92ZSA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLmtub2IueCA9IHRoaXMuZG93blBvcyArIChpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54IC0gdGhpcy5kb3duWCk7XG5cblx0dGhpcy52YWxpZGF0ZVZhbHVlKCk7XG5cblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhbmdlXCIpO1xufVxuXG5cbi8qKlxuICogVmFsaWRhdGUgcG9zaXRpb24uXG4gKiBAbWV0aG9kIHZhbGlkYXRlVmFsdWVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS52YWxpZGF0ZVZhbHVlID0gZnVuY3Rpb24oKSB7XG5cblx0aWYodGhpcy5rbm9iLnggPCAwKVxuXHRcdHRoaXMua25vYi54ID0gMDtcblxuXHRpZih0aGlzLmtub2IueCA+ICh0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGgpKVxuXHRcdHRoaXMua25vYi54ID0gdGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoO1xufVxuXG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5TbGlkZXIucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHZhciBmcmFjdGlvbiA9IHRoaXMua25vYi5wb3NpdGlvbi54Lyh0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGgpO1xuXG5cdHJldHVybiBmcmFjdGlvbjtcbn1cblxuXG4vKipcbiAqIEdldCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMua25vYi54ID0gdGhpcy5iYWNrZ3JvdW5kLnBvc2l0aW9uLnggKyB2YWx1ZSoodGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoKTtcblxuXHR0aGlzLnZhbGlkYXRlVmFsdWUoKTtcblx0cmV0dXJuIHRoaXMuZ2V0VmFsdWUoKTtcbn1cblxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdGlmKHRoaXMuZmFkZVR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy5mYWRlVHdlZW4uc3RvcCgpO1xuXHR0aGlzLmZhZGVUd2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxuXHRcdFx0LnRvKHthbHBoYTogMX0sIDI1MClcblx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdGlmKHRoaXMuZmFkZVR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy5mYWRlVHdlZW4uc3RvcCgpO1xuXHR0aGlzLmZhZGVUd2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxuXHRcdFx0LnRvKHthbHBoYTogMH0sIDI1MClcblx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25IaWRkZW4uYmluZCh0aGlzKSlcblx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIE9uIGhpZGRlbi5cbiAqIEBtZXRob2Qgb25IaWRkZW5cbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vbkhpZGRlbiA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcjtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIHByb21pc2VzIGFzIGRlZmluZWQgaGVyZTpcbiAqIGh0dHA6Ly9wcm9taXNlcy1hcGx1cy5naXRodWIuaW8vcHJvbWlzZXMtc3BlYy9cbiAqIEBjbGFzcyBUaGVuYWJsZVxuICovXG5mdW5jdGlvbiBUaGVuYWJsZSgpIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcylcblxuXHR0aGlzLnN1Y2Nlc3NIYW5kbGVycyA9IFtdO1xuXHR0aGlzLmVycm9ySGFuZGxlcnMgPSBbXTtcblx0dGhpcy5ub3RpZmllZCA9IGZhbHNlO1xuXHR0aGlzLmhhbmRsZXJzQ2FsbGVkID0gZmFsc2U7XG5cdHRoaXMubm90aWZ5UGFyYW0gPSBudWxsO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFRoZW5hYmxlLCBFdmVudERpc3BhdGNoZXIpO1xuXG4vKipcbiAqIFNldCByZXNvbHV0aW9uIGhhbmRsZXJzLlxuICogQG1ldGhvZCB0aGVuXG4gKiBAcGFyYW0gc3VjY2VzcyBUaGUgZnVuY3Rpb24gY2FsbGVkIHRvIGhhbmRsZSBzdWNjZXNzLlxuICogQHBhcmFtIGVycm9yIFRoZSBmdW5jdGlvbiBjYWxsZWQgdG8gaGFuZGxlIGVycm9yLlxuICogQHJldHVybiBUaGlzIFRoZW5hYmxlIGZvciBjaGFpbmluZy5cbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihzdWNjZXNzLCBlcnJvcikge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgdXNlZC5cIik7XG5cblx0dGhpcy5zdWNjZXNzSGFuZGxlcnMucHVzaChzdWNjZXNzKTtcblx0dGhpcy5lcnJvckhhbmRsZXJzLnB1c2goZXJyb3IpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG4vKipcbiAqIE5vdGlmeSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gKiBAbWV0aG9kIG5vdGlmeVN1Y2Nlc3NcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLm5vdGlmeVN1Y2Nlc3MgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgbm90aWZpZWQuXCIpO1xuXG5cdHRoaXMubm90aWZ5UGFyYW0gPSBwYXJhbTtcblx0c2V0VGltZW91dCh0aGlzLmRvTm90aWZ5U3VjY2Vzcy5iaW5kKHRoaXMpLCAwKTtcbn1cblxuLyoqXG4gKiBOb3RpZnkgZmFpbHVyZSBvZiB0aGUgb3BlcmF0aW9uLlxuICogQG1ldGhvZCBub3RpZnlFcnJvclxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUubm90aWZ5RXJyb3IgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgbm90aWZpZWQuXCIpO1xuXG5cdHRoaXMubm90aWZ5UGFyYW0gPSBwYXJhbTtcblx0c2V0VGltZW91dCh0aGlzLmRvTm90aWZ5RXJyb3IuYmluZCh0aGlzKSwgMCk7XG59XG5cbi8qKlxuICogQWN0dWFsbHkgbm90aWZ5IHN1Y2Nlc3MuXG4gKiBAbWV0aG9kIGRvTm90aWZ5U3VjY2Vzc1xuICogQHByaXZhdGVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLmRvTm90aWZ5U3VjY2VzcyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG5cdGlmIChwYXJhbSlcblx0XHR0aGlzLm5vdGlmeVBhcmFtID0gcGFyYW07XG5cblx0dGhpcy5jYWxsSGFuZGxlcnModGhpcy5zdWNjZXNzSGFuZGxlcnMpO1xufVxuXG4vKipcbiAqIEFjdHVhbGx5IG5vdGlmeSBlcnJvci5cbiAqIEBtZXRob2QgZG9Ob3RpZnlFcnJvclxuICogQHByaXZhdGVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLmRvTm90aWZ5RXJyb3IgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jYWxsSGFuZGxlcnModGhpcy5lcnJvckhhbmRsZXJzKTtcbn1cblxuLyoqXG4gKiBDYWxsIGhhbmRsZXJzLlxuICogQG1ldGhvZCBjYWxsSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5jYWxsSGFuZGxlcnMgPSBmdW5jdGlvbihoYW5kbGVycykge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgbmV2ZXIgaGFwcGVuLlwiKTtcblxuXHR0aGlzLmhhbmRsZXJzQ2FsbGVkID0gdHJ1ZTtcblxuXHRmb3IgKHZhciBpIGluIGhhbmRsZXJzKSB7XG5cdFx0aWYgKGhhbmRsZXJzW2ldKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRoYW5kbGVyc1tpXS5jYWxsKG51bGwsIHRoaXMubm90aWZ5UGFyYW0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRXhjZXB0aW9uIGluIFRoZW5hYmxlIGhhbmRsZXI6IFwiICsgZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFJlc29sdmUgcHJvbWlzZS5cbiAqIEBtZXRob2QgcmVzb2x2ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHR0aGlzLm5vdGlmeVN1Y2Nlc3MocmVzdWx0KTtcbn1cblxuLyoqXG4gKiBSZWplY3QgcHJvbWlzZS5cbiAqIEBtZXRob2QgcmVqZWN0XG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5yZWplY3QgPSBmdW5jdGlvbihyZWFzb24pIHtcblx0dGhpcy5ub3RpZnlFcnJvcihyZWFzb24pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRoZW5hYmxlOyJdfQ==
