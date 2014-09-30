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
},{"../../proto/ProtoConnection":32,"../../proto/messages/InitMessage":50,"../../proto/messages/StateCompleteMessage":61,"../../utils/FunctionUtil":72,"../../utils/MessageWebSocketConnection":74,"../../utils/PixiApp":77,"../controller/NetPokerClientController":10,"../resources/Resources":14,"../view/LoadingScreen":23,"../view/NetPokerClientView":24,"pixi.js":3}],6:[function(require,module,exports){


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
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");

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
	this.messageSequencer.addMessageHandler(TableInfoMessage.TYPE, this.onTableInfoMessage, this);
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

/**
 * Handle table info message.
 * @method onTableInfoMessage
 */
InterfaceController.prototype.onTableInfoMessage = function(m) {
	var tableInfoView=this.view.getTableInfoView();

	tableInfoView.setTableInfoText(m.getText());
}

module.exports = InterfaceController;
},{"../../proto/messages/ButtonsMessage":40,"../../proto/messages/ChatMessage":41,"../../proto/messages/ShowDialogMessage":60,"../../proto/messages/TableInfoMessage":64}],8:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/Sequencer":79}],9:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":71,"../../utils/Sequencer":79,"./MessageSequenceItem":8}],10:[function(require,module,exports){
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
},{"../../proto/ProtoConnection":32,"../../proto/data/ButtonData":33,"../../proto/messages/ButtonClickMessage":39,"../../proto/messages/ChatMessage":41,"../../proto/messages/SeatClickMessage":58,"../../utils/FunctionUtil":72,"../view/ButtonsView":16,"../view/DialogView":22,"../view/NetPokerClientView":24,"../view/SettingsView":29,"./InterfaceController":7,"./MessageSequencer":9,"./TableController":11}],11:[function(require,module,exports){
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
},{"../../proto/messages/ActionMessage":36,"../../proto/messages/BetMessage":37,"../../proto/messages/BetsToPotMessage":38,"../../proto/messages/ClearMessage":43,"../../proto/messages/CommunityCardsMessage":44,"../../proto/messages/DealerButtonMessage":45,"../../proto/messages/DelayMessage":46,"../../proto/messages/FoldCardsMessage":48,"../../proto/messages/PayOutMessage":52,"../../proto/messages/PocketCardsMessage":53,"../../proto/messages/PotMessage":54,"../../proto/messages/SeatInfoMessage":59,"../../proto/messages/TimerMessage":66,"../../utils/EventDispatcher":71}],12:[function(require,module,exports){
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
},{"../../utils/Button":68,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3}],16:[function(require,module,exports){
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

	this.slider.visible = false;

	//console.log("button click: " + buttonIndex);
	var buttonData = this.buttonDatas[buttonIndex];

	this.trigger({
		type: ButtonsView.BUTTON_CLICK,
		button: buttonData.getButton(),
		value: buttonData.getValue()
	});
}

module.exports = ButtonsView;
},{"../../utils/Button":68,"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../../utils/Slider":80,"../resources/Resources":14,"./BigButton":15,"./RaiseShortcutButton":26,"pixi.js":3}],17:[function(require,module,exports){
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
		this.visible = true;
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],18:[function(require,module,exports){
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

},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/MouseOverGroup":75,"../../utils/NineSlice":76,"../../utils/Slider":80,"../resources/Resources":14,"PixiTextInput":1,"pixi.js":3}],19:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],20:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],21:[function(require,module,exports){
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
},{"../../utils/Button":68,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3}],22:[function(require,module,exports){
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
},{"../../proto/data/ButtonData":33,"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../resources/Resources":14,"./DialogButton":21,"PixiTextInput":1,"pixi.js":3}],23:[function(require,module,exports){
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
var TableInfoView = require("../view/TableInfoView");

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

	this.dealerButtonView = new DealerButtonView();
	this.addChild(this.dealerButtonView);

	this.tableInfoView = new TableInfoView();
	this.addChild(this.tableInfoView);

	this.potView = new PotView();
	this.addChild(this.potView);
	this.potView.position.x = Resources.getInstance().getPoint("potPosition").x;
	this.potView.position.y = Resources.getInstance().getPoint("potPosition").y;

	this.settingsView = new SettingsView();
	this.addChild(this.settingsView);

	this.dialogView = new DialogView();
	this.addChild(this.dialogView);

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
 * Get table info view.
 * @method getTableInfoView
 */
NetPokerClientView.prototype.getTableInfoView = function() {
	return this.tableInfoView;
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

	this.tableInfoView.clear();
}

module.exports = NetPokerClientView;
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/Gradient":73,"../../utils/Point":78,"../resources/Resources":14,"../view/SettingsView":29,"../view/TableInfoView":30,"./ButtonsView":16,"./CardView":17,"./ChatView":18,"./ChipsView":19,"./DealerButtonView":20,"./DialogView":22,"./PotView":25,"./SeatView":27,"./TimerView":31,"pixi.js":3}],25:[function(require,module,exports){
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
			fill: "#ffffff"
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../resources/Resources":14,"./ChipsView":19,"pixi.js":3,"tween.js":4}],26:[function(require,module,exports){
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
},{"../../utils/Button":68,"../../utils/Checkbox":69,"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],27:[function(require,module,exports){
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
},{"../../utils/Button":68,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],28:[function(require,module,exports){
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
},{"../../utils/Button":68,"../../utils/Checkbox":69,"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],29:[function(require,module,exports){
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
},{"../../proto/messages/CheckboxMessage":42,"../../utils/Button":68,"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../../utils/NineSlice":76,"../app/Settings":6,"../resources/Resources":14,"./RaiseShortcutButton":26,"./SettingsCheckbox":28,"pixi.js":3,"tween.js":4}],30:[function(require,module,exports){
var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Show table info.
 * @class TableInfoView
 */
function TableInfoView() {
	PIXI.DisplayObjectContainer.call(this);

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 2,
		stroke: "#000000",
		strokeThickness: 2,
		wordWrap: true,
		wordWrapWidth: 300
	};

	this.tableInfoText = new PIXI.Text("<TableInfoText>", style);
	this.tableInfoText.position.x = 355;
	this.tableInfoText.position.y = 540;
	this.addChild(this.tableInfoText);
}

FunctionUtil.extend(TableInfoView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableInfoView);

/**
 * Set table info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setTableInfoText = function(s) {
	if (!s)
		s="";

	this.tableInfoText.setText(s);
	console.log("setting table info text: " + s);
}

/**
 * Clear.
 * @method clear
 */
TableInfoView.prototype.clear = function() {
	this.tableInfoText.setText("");
}

module.exports = TableInfoView;
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"pixi.js":3}],31:[function(require,module,exports){
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
},{"../../utils/EventDispatcher":71,"../../utils/FunctionUtil":72,"../resources/Resources":14,"pixi.js":3,"tween.js":4}],32:[function(require,module,exports){
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
},{"../utils/EventDispatcher":71,"../utils/FunctionUtil":72,"./messages/ActionMessage":36,"./messages/BetMessage":37,"./messages/BetsToPotMessage":38,"./messages/ButtonClickMessage":39,"./messages/ButtonsMessage":40,"./messages/ChatMessage":41,"./messages/CheckboxMessage":42,"./messages/ClearMessage":43,"./messages/CommunityCardsMessage":44,"./messages/DealerButtonMessage":45,"./messages/DelayMessage":46,"./messages/FadeTableMessage":47,"./messages/FoldCardsMessage":48,"./messages/HandInfoMessage":49,"./messages/InitMessage":50,"./messages/InterfaceStateMessage":51,"./messages/PayOutMessage":52,"./messages/PocketCardsMessage":53,"./messages/PotMessage":54,"./messages/PreTournamentInfoMessage":55,"./messages/PresetButtonClickMessage":56,"./messages/PresetButtonsMessage":57,"./messages/SeatClickMessage":58,"./messages/SeatInfoMessage":59,"./messages/ShowDialogMessage":60,"./messages/StateCompleteMessage":61,"./messages/TableButtonClickMessage":62,"./messages/TableButtonsMessage":63,"./messages/TableInfoMessage":64,"./messages/TestCaseRequestMessage":65,"./messages/TimerMessage":66,"./messages/TournamentResultMessage":67}],33:[function(require,module,exports){
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
},{}],34:[function(require,module,exports){
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

		if (s.substring(0, cand.length).toUpperCase() == cand)
			cardValue = i;
	}

	if (cardValue < 0)
		throw new Error("Not a valid card string: " + s);

	var suitString = s.substring(CardData.CARD_VALUE_STRINGS[cardValue].length);

	var suitIndex = -1;
	for (i = 0; i < CardData.SUIT_STRINGS.length; i++) {
		var cand = CardData.SUIT_STRINGS[i];

		if (suitString.toUpperCase() == cand)
			suitIndex = i;
	}

	if (suitIndex < 0)
		throw new Error("Not a valid card string: " + s);

	return new CardData(suitIndex * 13 + cardValue);
}

module.exports = CardData;
},{}],35:[function(require,module,exports){
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
},{}],36:[function(require,module,exports){
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
},{}],37:[function(require,module,exports){
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
},{}],38:[function(require,module,exports){
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
},{}],39:[function(require,module,exports){
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
},{}],40:[function(require,module,exports){
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
},{"../data/ButtonData":33}],41:[function(require,module,exports){
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
},{}],42:[function(require,module,exports){
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
},{}],43:[function(require,module,exports){
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
},{}],44:[function(require,module,exports){
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
},{"../data/CardData":34}],45:[function(require,module,exports){
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
},{}],46:[function(require,module,exports){
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
},{}],47:[function(require,module,exports){
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
},{}],48:[function(require,module,exports){
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
},{}],49:[function(require,module,exports){
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
},{}],50:[function(require,module,exports){
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
},{}],51:[function(require,module,exports){
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
},{}],52:[function(require,module,exports){
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
},{}],53:[function(require,module,exports){
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
},{"../data/CardData":34}],54:[function(require,module,exports){
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
},{}],55:[function(require,module,exports){
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
},{}],56:[function(require,module,exports){
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
},{}],57:[function(require,module,exports){
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
},{"../data/PresetButtonData":35}],58:[function(require,module,exports){
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
},{}],59:[function(require,module,exports){
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
},{}],60:[function(require,module,exports){
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
},{}],61:[function(require,module,exports){
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
},{}],62:[function(require,module,exports){
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
},{}],63:[function(require,module,exports){
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
},{}],64:[function(require,module,exports){
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
},{}],65:[function(require,module,exports){
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
},{}],66:[function(require,module,exports){
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
},{}],67:[function(require,module,exports){
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
},{}],68:[function(require,module,exports){
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
},{"./EventDispatcher":71,"./FunctionUtil":72,"pixi.js":3}],69:[function(require,module,exports){
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
},{"./Button":68,"./EventDispatcher":71,"./FunctionUtil":72,"pixi.js":3}],70:[function(require,module,exports){
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
},{"../utils/FunctionUtil":72,"pixi.js":3}],71:[function(require,module,exports){
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
},{}],72:[function(require,module,exports){
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
},{"./EventDispatcher":71,"./FunctionUtil":72,"./Thenable":81}],75:[function(require,module,exports){
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


},{"./EventDispatcher":71,"./FunctionUtil":72,"pixi.js":3}],76:[function(require,module,exports){
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
},{"./ContentScaler":70,"./FunctionUtil":72,"pixi.js":3,"tween.js":4}],78:[function(require,module,exports){
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
},{"./EventDispatcher":71,"./FunctionUtil":72}],80:[function(require,module,exports){
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

},{"./EventDispatcher":71,"./FunctionUtil":72,"pixi.js":3,"tween.js":4}],81:[function(require,module,exports){
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
},{"./EventDispatcher":71,"./FunctionUtil":72}]},{},[12])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbWxpbmRxdmlzdFxccmVwb1xcbmV0cG9rZXJcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L2luZGV4LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L3NyYy9QaXhpVGV4dElucHV0LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9waXhpLmpzL2Jpbi9waXhpLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy90d2Vlbi5qcy9pbmRleC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9OZXRQb2tlckNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9TZXR0aW5ncy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvSW50ZXJmYWNlQ29udHJvbGxlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlSXRlbS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9UYWJsZUNvbnRyb2xsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC9uZXRwb2tlcmNsaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9EZWZhdWx0U2tpbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9SZXNvdXJjZXMuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0JpZ0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQnV0dG9uc1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0NhcmRWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9DaGF0Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQ2hpcHNWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EZWFsZXJCdXR0b25WaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EaWFsb2dCdXR0b24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0RpYWxvZ1ZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0xvYWRpbmdTY3JlZW4uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L05ldFBva2VyQ2xpZW50Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUG90Vmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUmFpc2VTaG9ydGN1dEJ1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvU2VhdFZpZXcuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzVmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvVGFibGVJbmZvVmlldy5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvVGltZXJWaWV3LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9Qcm90b0Nvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL2RhdGEvQnV0dG9uRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9DYXJkRGF0YS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vZGF0YS9QcmVzZXRCdXR0b25EYXRhLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CZXRzVG9Qb3RNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0J1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DaGF0TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9DbGVhck1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0NvbW11bml0eUNhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVsYXlNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9GYWRlVGFibGVNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9IYW5kSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0luaXRNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BheU91dE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUG90TWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9QcmVzZXRCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZXNldEJ1dHRvbnNNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TZWF0SW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9TdGF0ZUNvbXBsZXRlTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVGFibGVCdXR0b25DbGlja01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlSW5mb01lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Rlc3RDYXNlUmVxdWVzdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZS5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0J1dHRvbi5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvQ2hlY2tib3guanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0NvbnRlbnRTY2FsZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0V2ZW50RGlzcGF0Y2hlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRnVuY3Rpb25VdGlsLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9HcmFkaWVudC5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL01vdXNlT3Zlckdyb3VwLmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9OaW5lU2xpY2UuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BpeGlBcHAuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BvaW50LmpzIiwiQzovVXNlcnMvbWxpbmRxdmlzdC9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9TZXF1ZW5jZXIuanMiLCJDOi9Vc2Vycy9tbGluZHF2aXN0L3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1NsaWRlci5qcyIsIkM6L1VzZXJzL21saW5kcXZpc3QvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvVGhlbmFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGl4aVRleHRJbnB1dCA9IHJlcXVpcmUoXCIuL3NyYy9QaXhpVGV4dElucHV0XCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQaXhpVGV4dElucHV0OyIsImlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRleHQgaW5wdXQgZmllbGQgZm9yIHBpeGkuanMuXHJcbiAqIEEgc2ltcGxlIGV4YW1wbGU6XHJcbiAqXHJcbiAqICAgICAvLyBXZSBuZWVkIGEgY29udGFpbmVyXHJcbiAqICAgICB2YXIgY29udGFpbmVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xyXG4gKlxyXG4gKiAgICAgLy8gU2FtZSBzdHlsZSBvcHRpb25zIGFzIFBJWEkuVGV4dFxyXG4gKiAgICAgdmFyIHN0eWxlPXsgLi4uIH07XHJcbiAqXHJcbiAqICAgICB2YXIgaW5wdXRGaWVsZCA9IG5ldyBQaXhpVGV4dElucHV0KFwiaGVsbG9cIixzdHlsZSk7XHJcbiAqICAgICBjb250YWluZXIuYWRkQ2hpbGQoaW5wdXRGaWVsZCk7XHJcbiAqXHJcbiAqIFRoZSBzdHlsZSBkZWZpbml0aW9ucyBhY2NlcHRlZCBieSB0aGUgY29uc3RydWN0b3IgYXJlIHRoZSBzYW1lIGFzIHRob3NlIGFjY2VwdGVkIGJ5XHJcbiAqIFtQSVhJLlRleHRdKGh0dHA6Ly93d3cuZ29vZGJveWRpZ2l0YWwuY29tL3BpeGlqcy9kb2NzL2NsYXNzZXMvVGV4dC5odG1sKS5cclxuICogQGNsYXNzIFBpeGlUZXh0SW5wdXRcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdGV4dF0gVGhlIGluaXRpYWwgdGV4dC5cclxuICogQHBhcmFtIHtPYmplY3R9IFtzdHlsZV0gU3R5bGUgZGVmaW5pdGlvbiwgc2FtZSBhcyBmb3IgUElYSS5UZXh0XHJcbiAqL1xyXG5mdW5jdGlvbiBQaXhpVGV4dElucHV0KHRleHQsIHN0eWxlKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblxyXG5cdGlmICghdGV4dClcclxuXHRcdHRleHQgPSBcIlwiO1xyXG5cclxuXHR0ZXh0ID0gdGV4dC50b1N0cmluZygpO1xyXG5cclxuXHRpZiAoc3R5bGUgJiYgc3R5bGUud29yZFdyYXApXHJcblx0XHR0aHJvdyBcIndvcmRXcmFwIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIGlucHV0IGZpZWxkc1wiO1xyXG5cclxuXHR0aGlzLl90ZXh0ID0gdGV4dDtcclxuXHJcblx0dGhpcy5sb2NhbFdpZHRoID0gMTAwO1xyXG5cdHRoaXMuX2JhY2tncm91bmRDb2xvciA9IDB4ZmZmZmZmO1xyXG5cdHRoaXMuX2NhcmV0Q29sb3IgPSAweDAwMDAwMDtcclxuXHR0aGlzLl9iYWNrZ3JvdW5kID0gdHJ1ZTtcclxuXHJcblx0dGhpcy5zdHlsZSA9IHN0eWxlO1xyXG5cdHRoaXMudGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dCh0aGlzLl90ZXh0LCBzdHlsZSk7XHJcblxyXG5cdHRoaXMubG9jYWxIZWlnaHQgPVxyXG5cdFx0dGhpcy50ZXh0RmllbGQuZGV0ZXJtaW5lRm9udEhlaWdodCgnZm9udDogJyArIHRoaXMudGV4dEZpZWxkLnN0eWxlLmZvbnQgKyAnOycpICtcclxuXHRcdHRoaXMudGV4dEZpZWxkLnN0eWxlLnN0cm9rZVRoaWNrbmVzcztcclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XHJcblx0dGhpcy50ZXh0RmllbGRNYXNrID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcclxuXHR0aGlzLmNhcmV0ID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcclxuXHR0aGlzLmRyYXdFbGVtZW50cygpO1xyXG5cclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuY2FyZXQpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGRNYXNrKTtcclxuXHJcblx0dGhpcy5zY3JvbGxJbmRleCA9IDA7XHJcblx0dGhpcy5fY2FyZXRJbmRleCA9IDA7XHJcblx0dGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwgPSBudWxsO1xyXG5cdHRoaXMuYmx1cigpO1xyXG5cdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5pbnRlcmFjdGl2ZSA9IHRydWU7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuYnV0dG9uTW9kZSA9IHRydWU7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuZGVmYXVsdEN1cnNvciA9IFwidGV4dFwiO1xyXG5cclxuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5tb3VzZWRvd24gPSB0aGlzLm9uQmFja2dyb3VuZE1vdXNlRG93bi5iaW5kKHRoaXMpO1xyXG5cdHRoaXMua2V5RXZlbnRDbG9zdXJlID0gdGhpcy5vbktleUV2ZW50LmJpbmQodGhpcyk7XHJcblx0dGhpcy53aW5kb3dCbHVyQ2xvc3VyZSA9IHRoaXMub25XaW5kb3dCbHVyLmJpbmQodGhpcyk7XHJcblx0dGhpcy5kb2N1bWVudE1vdXNlRG93bkNsb3N1cmUgPSB0aGlzLm9uRG9jdW1lbnRNb3VzZURvd24uYmluZCh0aGlzKTtcclxuXHR0aGlzLmlzRm9jdXNDbGljayA9IGZhbHNlO1xyXG5cclxuXHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHJcblx0dGhpcy50ZXh0RmllbGQubWFzayA9IHRoaXMudGV4dEZpZWxkTWFzaztcclxuXHJcblx0dGhpcy5rZXlwcmVzcyA9IG51bGw7XHJcblx0dGhpcy5rZXlkb3duID0gbnVsbDtcclxuXHR0aGlzLmNoYW5nZSA9IG51bGw7XHJcbn1cclxuXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKTtcclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQaXhpVGV4dElucHV0O1xyXG5cclxuLyoqXHJcbiAqIFNvbWVvbmUgY2xpY2tlZC5cclxuICogQG1ldGhvZCBvbkJhY2tncm91bmRNb3VzZURvd25cclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uQmFja2dyb3VuZE1vdXNlRG93biA9IGZ1bmN0aW9uKGUpIHtcclxuXHR2YXIgeCA9IGUuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54O1xyXG5cdHRoaXMuX2NhcmV0SW5kZXggPSB0aGlzLmdldENhcmV0SW5kZXhCeUNvb3JkKHgpO1xyXG5cdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cclxuXHR0aGlzLmZvY3VzKCk7XHJcblxyXG5cdHRoaXMuaXNGb2N1c0NsaWNrID0gdHJ1ZTtcclxuXHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRzY29wZS5pc0ZvY3VzQ2xpY2sgPSBmYWxzZTtcclxuXHR9LCAwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvY3VzIHRoaXMgaW5wdXQgZmllbGQuXHJcbiAqIEBtZXRob2QgZm9jdXNcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5ibHVyKCk7XHJcblxyXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5RXZlbnRDbG9zdXJlKTtcclxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgdGhpcy5rZXlFdmVudENsb3N1cmUpO1xyXG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5kb2N1bWVudE1vdXNlRG93bkNsb3N1cmUpO1xyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCB0aGlzLndpbmRvd0JsdXJDbG9zdXJlKTtcclxuXHJcblx0dGhpcy5zaG93Q2FyZXQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBrZXkgZXZlbnQuXHJcbiAqIEBtZXRob2Qgb25LZXlFdmVudFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25LZXlFdmVudCA9IGZ1bmN0aW9uKGUpIHtcclxuXHQvKmNvbnNvbGUubG9nKFwia2V5IGV2ZW50XCIpO1xyXG5cdGNvbnNvbGUubG9nKGUpOyovXHJcblxyXG5cdGlmIChlLnR5cGUgPT0gXCJrZXlwcmVzc1wiKSB7XHJcblx0XHRpZiAoZS5jaGFyQ29kZSA8IDMyKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0dGhpcy5fdGV4dCA9XHJcblx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXgpICtcclxuXHRcdFx0U3RyaW5nLmZyb21DaGFyQ29kZShlLmNoYXJDb2RlKSArXHJcblx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKHRoaXMuX2NhcmV0SW5kZXgpO1xyXG5cclxuXHRcdHRoaXMuX2NhcmV0SW5kZXgrKztcclxuXHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdHRoaXMuc2hvd0NhcmV0KCk7XHJcblx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcclxuXHRcdHRoaXMudHJpZ2dlcih0aGlzLmtleXByZXNzLCBlKTtcclxuXHRcdHRoaXMudHJpZ2dlcih0aGlzLmNoYW5nZSk7XHJcblx0fVxyXG5cclxuXHRpZiAoZS50eXBlID09IFwia2V5ZG93blwiKSB7XHJcblx0XHRzd2l0Y2ggKGUua2V5Q29kZSkge1xyXG5cdFx0XHRjYXNlIDg6XHJcblx0XHRcdFx0aWYgKHRoaXMuX2NhcmV0SW5kZXggPiAwKSB7XHJcblx0XHRcdFx0XHR0aGlzLl90ZXh0ID1cclxuXHRcdFx0XHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcoMCwgdGhpcy5fY2FyZXRJbmRleCAtIDEpICtcclxuXHRcdFx0XHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5fY2FyZXRJbmRleCk7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleC0tO1xyXG5cdFx0XHRcdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyKHRoaXMuY2hhbmdlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgNDY6XHJcblx0XHRcdFx0dGhpcy5fdGV4dCA9XHJcblx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZygwLCB0aGlzLl9jYXJldEluZGV4KSArXHJcblx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLl9jYXJldEluZGV4ICsgMSk7XHJcblxyXG5cdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnNob3dDYXJldCgpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXIodGhpcy5jaGFuZ2UpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAzOTpcclxuXHRcdFx0XHR0aGlzLl9jYXJldEluZGV4Kys7XHJcblx0XHRcdFx0aWYgKHRoaXMuX2NhcmV0SW5kZXggPiB0aGlzLl90ZXh0Lmxlbmd0aClcclxuXHRcdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXggPSB0aGlzLl90ZXh0Lmxlbmd0aDtcclxuXHJcblx0XHRcdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIDM3OlxyXG5cdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXgtLTtcclxuXHRcdFx0XHRpZiAodGhpcy5fY2FyZXRJbmRleCA8IDApXHJcblx0XHRcdFx0XHR0aGlzLl9jYXJldEluZGV4ID0gMDtcclxuXHJcblx0XHRcdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy50cmlnZ2VyKHRoaXMua2V5ZG93biwgZSk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogRW5zdXJlIHRoZSBjYXJldCBpcyBub3Qgb3V0c2lkZSB0aGUgYm91bmRzLlxyXG4gKiBAbWV0aG9kIGVuc3VyZUNhcmV0SW5WaWV3XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5lbnN1cmVDYXJldEluVmlldyA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cclxuXHR3aGlsZSAodGhpcy5jYXJldC5wb3NpdGlvbi54ID49IHRoaXMubG9jYWxXaWR0aCAtIDEpIHtcclxuXHRcdHRoaXMuc2Nyb2xsSW5kZXgrKztcclxuXHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xyXG5cdH1cclxuXHJcblx0d2hpbGUgKHRoaXMuY2FyZXQucG9zaXRpb24ueCA8IDApIHtcclxuXHRcdHRoaXMuc2Nyb2xsSW5kZXggLT0gMjtcclxuXHRcdGlmICh0aGlzLnNjcm9sbEluZGV4IDwgMClcclxuXHRcdFx0dGhpcy5zY3JvbGxJbmRleCA9IDA7XHJcblx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCbHVyIG91cnNlbGYuXHJcbiAqIEBtZXRob2QgYmx1clxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuYmx1ciA9IGZ1bmN0aW9uKCkge1xyXG5cdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5RXZlbnRDbG9zdXJlKTtcclxuXHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgdGhpcy5rZXlFdmVudENsb3N1cmUpO1xyXG5cdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5kb2N1bWVudE1vdXNlRG93bkNsb3N1cmUpO1xyXG5cdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwiYmx1clwiLCB0aGlzLndpbmRvd0JsdXJDbG9zdXJlKTtcclxuXHJcblx0dGhpcy5oaWRlQ2FyZXQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFdpbmRvdyBibHVyLlxyXG4gKiBAbWV0aG9kIG9uRG9jdW1lbnRNb3VzZURvd25cclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uRG9jdW1lbnRNb3VzZURvd24gPSBmdW5jdGlvbigpIHtcclxuXHRpZiAoIXRoaXMuaXNGb2N1c0NsaWNrKVxyXG5cdFx0dGhpcy5ibHVyKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXaW5kb3cgYmx1ci5cclxuICogQG1ldGhvZCBvbldpbmRvd0JsdXJcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uV2luZG93Qmx1ciA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuYmx1cigpO1xyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGNhcmV0IFBvc2l0aW9uLlxyXG4gKiBAbWV0aG9kIHVwZGF0ZUNhcmV0UG9zaXRpb25cclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnVwZGF0ZUNhcmV0UG9zaXRpb24gPSBmdW5jdGlvbigpIHtcclxuXHRpZiAodGhpcy5fY2FyZXRJbmRleCA8IHRoaXMuc2Nyb2xsSW5kZXgpIHtcclxuXHRcdHRoaXMuY2FyZXQucG9zaXRpb24ueCA9IC0xO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0dmFyIHN1YiA9IHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXgpLnN1YnN0cmluZyh0aGlzLnNjcm9sbEluZGV4KTtcclxuXHR0aGlzLmNhcmV0LnBvc2l0aW9uLnggPSB0aGlzLnRleHRGaWVsZC5jb250ZXh0Lm1lYXN1cmVUZXh0KHN1Yikud2lkdGg7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgdGV4dC5cclxuICogQG1ldGhvZCB1cGRhdGVUZXh0XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS51cGRhdGVUZXh0ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy50ZXh0RmllbGQuc2V0VGV4dCh0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLnNjcm9sbEluZGV4KSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEcmF3IHRoZSBiYWNrZ3JvdW5kIGFuZCBjYXJldC5cclxuICogQG1ldGhvZCBkcmF3RWxlbWVudHNcclxuICogQHByaXZhdGVcclxuICovXHJcblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmRyYXdFbGVtZW50cyA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmNsZWFyKCk7XHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuYmVnaW5GaWxsKHRoaXMuX2JhY2tncm91bmRDb2xvcik7XHJcblxyXG5cdGlmICh0aGlzLl9iYWNrZ3JvdW5kKVxyXG5cdFx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuZHJhd1JlY3QoMCwgMCwgdGhpcy5sb2NhbFdpZHRoLCB0aGlzLmxvY2FsSGVpZ2h0KTtcclxuXHJcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuZW5kRmlsbCgpO1xyXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmhpdEFyZWEgPSBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgdGhpcy5sb2NhbFdpZHRoLCB0aGlzLmxvY2FsSGVpZ2h0KTtcclxuXHJcblx0dGhpcy50ZXh0RmllbGRNYXNrLmNsZWFyKCk7XHJcblx0dGhpcy50ZXh0RmllbGRNYXNrLmJlZ2luRmlsbCh0aGlzLl9iYWNrZ3JvdW5kQ29sb3IpO1xyXG5cdHRoaXMudGV4dEZpZWxkTWFzay5kcmF3UmVjdCgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xyXG5cdHRoaXMudGV4dEZpZWxkTWFzay5lbmRGaWxsKCk7XHJcblxyXG5cdHRoaXMuY2FyZXQuY2xlYXIoKTtcclxuXHR0aGlzLmNhcmV0LmJlZ2luRmlsbCh0aGlzLl9jYXJldENvbG9yKTtcclxuXHR0aGlzLmNhcmV0LmRyYXdSZWN0KDEsIDEsIDEsIHRoaXMubG9jYWxIZWlnaHQgLSAyKTtcclxuXHR0aGlzLmNhcmV0LmVuZEZpbGwoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgY2FyZXQuXHJcbiAqIEBtZXRob2Qgc2hvd0NhcmV0XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5zaG93Q2FyZXQgPSBmdW5jdGlvbigpIHtcclxuXHRpZiAodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpIHtcclxuXHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpO1xyXG5cdFx0dGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwgPSBudWxsO1xyXG5cdH1cclxuXHJcblx0dGhpcy5jYXJldC52aXNpYmxlID0gdHJ1ZTtcclxuXHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMub25DYXJldEZsYXNoSW50ZXJ2YWwuYmluZCh0aGlzKSwgNTAwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhpZGUgY2FyZXQuXHJcbiAqIEBtZXRob2QgaGlkZUNhcmV0XHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5oaWRlQ2FyZXQgPSBmdW5jdGlvbigpIHtcclxuXHRpZiAodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpIHtcclxuXHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpO1xyXG5cdFx0dGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwgPSBudWxsO1xyXG5cdH1cclxuXHJcblx0dGhpcy5jYXJldC52aXNpYmxlID0gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYXJldCBmbGFzaCBpbnRlcnZhbC5cclxuICogQG1ldGhvZCBvbkNhcmV0Rmxhc2hJbnRlcnZhbFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25DYXJldEZsYXNoSW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmNhcmV0LnZpc2libGUgPSAhdGhpcy5jYXJldC52aXNpYmxlO1xyXG59XHJcblxyXG4vKipcclxuICogTWFwIHBvc2l0aW9uIHRvIGNhcmV0IGluZGV4LlxyXG4gKiBAbWV0aG9kIGdldENhcmV0SW5kZXhCeUNvb3JkXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5nZXRDYXJldEluZGV4QnlDb29yZCA9IGZ1bmN0aW9uKHgpIHtcclxuXHR2YXIgc21hbGxlc3QgPSAxMDAwMDtcclxuXHR2YXIgY2FuZCA9IDA7XHJcblx0dmFyIHZpc2libGUgPSB0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLnNjcm9sbEluZGV4KTtcclxuXHJcblx0Zm9yIChpID0gMDsgaSA8IHZpc2libGUubGVuZ3RoICsgMTsgaSsrKSB7XHJcblx0XHR2YXIgc3ViID0gdmlzaWJsZS5zdWJzdHJpbmcoMCwgaSk7XHJcblx0XHR2YXIgdyA9IHRoaXMudGV4dEZpZWxkLmNvbnRleHQubWVhc3VyZVRleHQoc3ViKS53aWR0aDtcclxuXHJcblx0XHRpZiAoTWF0aC5hYnModyAtIHgpIDwgc21hbGxlc3QpIHtcclxuXHRcdFx0c21hbGxlc3QgPSBNYXRoLmFicyh3IC0geCk7XHJcblx0XHRcdGNhbmQgPSBpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHRoaXMuc2Nyb2xsSW5kZXggKyBjYW5kO1xyXG59XHJcblxyXG4vKipcclxuICogVGhlIHdpZHRoIG9mIHRoZSBQaXhpVGV4dElucHV0LiBUaGlzIGlzIG92ZXJyaWRkZW4gdG8gaGF2ZSBhIHNsaWdodGx5XHJcbiAqIGRpZmZlcmVudCBiZWhhaXZvdXIgdGhhbiB0aGUgb3RoZXIgRGlzcGxheU9iamVjdHMuIFNldHRpbmcgdGhlXHJcbiAqIHdpZHRoIG9mIHRoZSBQaXhpVGV4dElucHV0IGRvZXMgbm90IGNoYW5nZSB0aGUgc2NhbGUsIGJ1dCBpdCByYXRoZXJcclxuICogbWFrZXMgdGhlIGZpZWxkIGxhcmdlci4gSWYgeW91IGFjdHVhbGx5IHdhbnQgdG8gc2NhbGUgaXQsXHJcbiAqIHVzZSB0aGUgc2NhbGUgcHJvcGVydHkuXHJcbiAqIEBwcm9wZXJ0eSB3aWR0aFxyXG4gKiBAdHlwZSBOdW1iZXJcclxuICovXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJ3aWR0aFwiLCB7XHJcblx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLnNjYWxlLnggKiB0aGlzLmdldExvY2FsQm91bmRzKCkud2lkdGg7XHJcblx0fSxcclxuXHJcblx0c2V0OiBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLmxvY2FsV2lkdGggPSB2O1xyXG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcclxuXHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcclxuXHRcdHRoaXMudXBkYXRlVGV4dCgpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogVGhlIHRleHQgaW4gdGhlIGlucHV0IGZpZWxkLiBTZXR0aW5nIHdpbGwgaGF2ZSB0aGUgaW1wbGljaXQgZnVuY3Rpb24gb2YgcmVzZXR0aW5nIHRoZSBzY3JvbGxcclxuICogb2YgdGhlIGlucHV0IGZpZWxkIGFuZCByZW1vdmluZyBmb2N1cy5cclxuICogQHByb3BlcnR5IHRleHRcclxuICogQHR5cGUgU3RyaW5nXHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwidGV4dFwiLCB7XHJcblx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl90ZXh0O1xyXG5cdH0sXHJcblxyXG5cdHNldDogZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5fdGV4dCA9IHYudG9TdHJpbmcoKTtcclxuXHRcdHRoaXMuc2Nyb2xsSW5kZXggPSAwO1xyXG5cdFx0dGhpcy5jYXJldEluZGV4ID0gMDtcclxuXHRcdHRoaXMuYmx1cigpO1xyXG5cdFx0dGhpcy51cGRhdGVUZXh0KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgY29sb3Igb2YgdGhlIGJhY2tncm91bmQgZm9yIHRoZSBpbnB1dCBmaWVsZC5cclxuICogVGhpcyBuZWVkcyB0byBiZSBzcGVjaWZpZWQgYXMgYW4gaW50ZWdlciwgbm90IHVzaW5nIEhUTUxcclxuICogbm90YXRpb24sIGUuZy4gZm9yIHJlZCBiYWNrZ3JvdW5kOlxyXG4gKlxyXG4gKiAgICAgbXlJbnB1dFRleHQuYmFja2dyb3VuZENvbG9yID0gMHhmZjAwMDA7XHJcbiAqXHJcbiAqIEluIG9yZGVyIGZvciB0aGUgYmFja2dyb3VuZCB0byBiZSBkcmF3biwgdGhlIGBiYWNrZ3JvdW5kYFxyXG4gKiBwcm9wZXJ0eSBuZWVkcyB0byBiZSB0cnVlLiBJZiBub3QsIHRoaXMgcHJvcGVydHkgd2lsbCBoYXZlXHJcbiAqIG5vIGVmZmVjdC5cclxuICogQHByb3BlcnR5IGJhY2tncm91bmRDb2xvclxyXG4gKiBAdHlwZSBJbnRlZ2VyXHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwiYmFja2dyb3VuZENvbG9yXCIsIHtcclxuXHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmRDb2xvcjtcclxuXHR9LFxyXG5cclxuXHRzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuXHRcdHRoaXMuX2JhY2tncm91bmRDb2xvciA9IHY7XHJcblx0XHR0aGlzLmRyYXdFbGVtZW50cygpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogVGhlIGNvbG9yIG9mIHRoZSBjYXJldC5cclxuICogQHByb3BlcnR5IGNhcmV0Q29sb3JcclxuICogQHR5cGUgSW50ZWdlclxyXG4gKi9cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcImNhcmV0Q29sb3JcIiwge1xyXG5cdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fY2FyZXRDb2xvcjtcclxuXHR9LFxyXG5cclxuXHRzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuXHRcdHRoaXMuX2NhcmV0Q29sb3IgPSB2O1xyXG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIERldGVybWluZXMgaWYgdGhlIGJhY2tncm91bmQgc2hvdWxkIGJlIGRyYXduIGJlaGluZCB0aGUgdGV4dC5cclxuICogVGhlIGNvbG9yIG9mIHRoZSBiYWNrZ3JvdW5kIGlzIHNwZWNpZmllZCB1c2luZyB0aGUgYmFja2dyb3VuZENvbG9yXHJcbiAqIHByb3BlcnR5LlxyXG4gKiBAcHJvcGVydHkgYmFja2dyb3VuZFxyXG4gKiBAdHlwZSBCb29sZWFuXHJcbiAqL1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwiYmFja2dyb3VuZFwiLCB7XHJcblx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kO1xyXG5cdH0sXHJcblxyXG5cdHNldDogZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5fYmFja2dyb3VuZCA9IHY7XHJcblx0XHR0aGlzLmRyYXdFbGVtZW50cygpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogU2V0IHRleHQuXHJcbiAqIEBtZXRob2Qgc2V0VGV4dFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdGV4dCBUaGUgbmV3IHRleHQuXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5zZXRUZXh0ID0gZnVuY3Rpb24odikge1xyXG5cdHRoaXMudGV4dCA9IHY7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUcmlnZ2VyIGFuIGV2ZW50IGZ1bmN0aW9uIGlmIGl0IGV4aXN0cy5cclxuICogQG1ldGhvZCB0cmlnZ2VyXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24oZm4sIGUpIHtcclxuXHRpZiAoZm4pXHJcblx0XHRmbihlKTtcclxufVxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSBQaXhpVGV4dElucHV0O1xyXG59IiwiLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIHBpeGkuanMgLSB2MS42LjBcclxuICogQ29weXJpZ2h0IChjKSAyMDEyLTIwMTQsIE1hdCBHcm92ZXNcclxuICogaHR0cDovL2dvb2Rib3lkaWdpdGFsLmNvbS9cclxuICpcclxuICogQ29tcGlsZWQ6IDIwMTQtMDctMThcclxuICpcclxuICogcGl4aS5qcyBpcyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXHJcbiAqIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXHJcbiAqL1xyXG4oZnVuY3Rpb24oKXt2YXIgYT10aGlzLGI9Ynx8e307Yi5XRUJHTF9SRU5ERVJFUj0wLGIuQ0FOVkFTX1JFTkRFUkVSPTEsYi5WRVJTSU9OPVwidjEuNi4xXCIsYi5ibGVuZE1vZGVzPXtOT1JNQUw6MCxBREQ6MSxNVUxUSVBMWToyLFNDUkVFTjozLE9WRVJMQVk6NCxEQVJLRU46NSxMSUdIVEVOOjYsQ09MT1JfRE9ER0U6NyxDT0xPUl9CVVJOOjgsSEFSRF9MSUdIVDo5LFNPRlRfTElHSFQ6MTAsRElGRkVSRU5DRToxMSxFWENMVVNJT046MTIsSFVFOjEzLFNBVFVSQVRJT046MTQsQ09MT1I6MTUsTFVNSU5PU0lUWToxNn0sYi5zY2FsZU1vZGVzPXtERUZBVUxUOjAsTElORUFSOjAsTkVBUkVTVDoxfSxiLl9VSUQ9MCxcInVuZGVmaW5lZFwiIT10eXBlb2YgRmxvYXQzMkFycmF5PyhiLkZsb2F0MzJBcnJheT1GbG9hdDMyQXJyYXksYi5VaW50MTZBcnJheT1VaW50MTZBcnJheSk6KGIuRmxvYXQzMkFycmF5PUFycmF5LGIuVWludDE2QXJyYXk9QXJyYXkpLGIuSU5URVJBQ1RJT05fRlJFUVVFTkNZPTMwLGIuQVVUT19QUkVWRU5UX0RFRkFVTFQ9ITAsYi5SQURfVE9fREVHPTE4MC9NYXRoLlBJLGIuREVHX1RPX1JBRD1NYXRoLlBJLzE4MCxiLmRvbnRTYXlIZWxsbz0hMSxiLnNheUhlbGxvPWZ1bmN0aW9uKGEpe2lmKCFiLmRvbnRTYXlIZWxsbyl7aWYobmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoXCJjaHJvbWVcIik+LTEpe3ZhciBjPVtcIiVjICVjICVjIFBpeGkuanMgXCIrYi5WRVJTSU9OK1wiIC0gXCIrYStcIiAgJWMgICVjICBodHRwOi8vd3d3LnBpeGlqcy5jb20vICAlYyAlYyDimaUlY+KZpSVj4pmlIFwiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiY29sb3I6ICNmZjY2YTU7IGJhY2tncm91bmQ6ICMwMzAzMDc7XCIsXCJiYWNrZ3JvdW5kOiAjZmY2NmE1XCIsXCJiYWNrZ3JvdW5kOiAjZmZjM2RjXCIsXCJiYWNrZ3JvdW5kOiAjZmY2NmE1XCIsXCJjb2xvcjogI2ZmMjQyNDsgYmFja2dyb3VuZDogI2ZmZlwiLFwiY29sb3I6ICNmZjI0MjQ7IGJhY2tncm91bmQ6ICNmZmZcIixcImNvbG9yOiAjZmYyNDI0OyBiYWNrZ3JvdW5kOiAjZmZmXCJdO2NvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsYyl9ZWxzZSB3aW5kb3cuY29uc29sZSYmY29uc29sZS5sb2coXCJQaXhpLmpzIFwiK2IuVkVSU0lPTitcIiAtIGh0dHA6Ly93d3cucGl4aWpzLmNvbS9cIik7Yi5kb250U2F5SGVsbG89ITB9fSxiLlBvaW50PWZ1bmN0aW9uKGEsYil7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDB9LGIuUG9pbnQucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLlBvaW50KHRoaXMueCx0aGlzLnkpfSxiLlBvaW50LnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24oYSxiKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8KDAhPT1iP3RoaXMueDowKX0sYi5Qb2ludC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Qb2ludCxiLlJlY3RhbmdsZT1mdW5jdGlvbihhLGIsYyxkKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8MCx0aGlzLndpZHRoPWN8fDAsdGhpcy5oZWlnaHQ9ZHx8MH0sYi5SZWN0YW5nbGUucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBiLlJlY3RhbmdsZSh0aGlzLngsdGhpcy55LHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLlJlY3RhbmdsZS5wcm90b3R5cGUuY29udGFpbnM9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLndpZHRoPD0wfHx0aGlzLmhlaWdodDw9MClyZXR1cm4hMTt2YXIgYz10aGlzLng7aWYoYT49YyYmYTw9Yyt0aGlzLndpZHRoKXt2YXIgZD10aGlzLnk7aWYoYj49ZCYmYjw9ZCt0aGlzLmhlaWdodClyZXR1cm4hMH1yZXR1cm4hMX0sYi5SZWN0YW5nbGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUmVjdGFuZ2xlLGIuRW1wdHlSZWN0YW5nbGU9bmV3IGIuUmVjdGFuZ2xlKDAsMCwwLDApLGIuUG9seWdvbj1mdW5jdGlvbihhKXtpZihhIGluc3RhbmNlb2YgQXJyYXl8fChhPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpLFwibnVtYmVyXCI9PXR5cGVvZiBhWzBdKXtmb3IodmFyIGM9W10sZD0wLGU9YS5sZW5ndGg7ZT5kO2QrPTIpYy5wdXNoKG5ldyBiLlBvaW50KGFbZF0sYVtkKzFdKSk7YT1jfXRoaXMucG9pbnRzPWF9LGIuUG9seWdvbi5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtmb3IodmFyIGE9W10sYz0wO2M8dGhpcy5wb2ludHMubGVuZ3RoO2MrKylhLnB1c2godGhpcy5wb2ludHNbY10uY2xvbmUoKSk7cmV0dXJuIG5ldyBiLlBvbHlnb24oYSl9LGIuUG9seWdvbi5wcm90b3R5cGUuY29udGFpbnM9ZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9ITEsZD0wLGU9dGhpcy5wb2ludHMubGVuZ3RoLTE7ZDx0aGlzLnBvaW50cy5sZW5ndGg7ZT1kKyspe3ZhciBmPXRoaXMucG9pbnRzW2RdLngsZz10aGlzLnBvaW50c1tkXS55LGg9dGhpcy5wb2ludHNbZV0ueCxpPXRoaXMucG9pbnRzW2VdLnksaj1nPmIhPWk+YiYmKGgtZikqKGItZykvKGktZykrZj5hO2omJihjPSFjKX1yZXR1cm4gY30sYi5Qb2x5Z29uLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlBvbHlnb24sYi5DaXJjbGU9ZnVuY3Rpb24oYSxiLGMpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwwLHRoaXMucmFkaXVzPWN8fDB9LGIuQ2lyY2xlLnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5DaXJjbGUodGhpcy54LHRoaXMueSx0aGlzLnJhZGl1cyl9LGIuQ2lyY2xlLnByb3RvdHlwZS5jb250YWlucz1mdW5jdGlvbihhLGIpe2lmKHRoaXMucmFkaXVzPD0wKXJldHVybiExO3ZhciBjPXRoaXMueC1hLGQ9dGhpcy55LWIsZT10aGlzLnJhZGl1cyp0aGlzLnJhZGl1cztyZXR1cm4gYyo9YyxkKj1kLGU+PWMrZH0sYi5DaXJjbGUucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5SZWN0YW5nbGUodGhpcy54LXRoaXMucmFkaXVzLHRoaXMueS10aGlzLnJhZGl1cyx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5DaXJjbGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ2lyY2xlLGIuRWxsaXBzZT1mdW5jdGlvbihhLGIsYyxkKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8MCx0aGlzLndpZHRoPWN8fDAsdGhpcy5oZWlnaHQ9ZHx8MH0sYi5FbGxpcHNlLnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5FbGxpcHNlKHRoaXMueCx0aGlzLnksdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuRWxsaXBzZS5wcm90b3R5cGUuY29udGFpbnM9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLndpZHRoPD0wfHx0aGlzLmhlaWdodDw9MClyZXR1cm4hMTt2YXIgYz0oYS10aGlzLngpL3RoaXMud2lkdGgsZD0oYi10aGlzLnkpL3RoaXMuaGVpZ2h0O3JldHVybiBjKj1jLGQqPWQsMT49YytkfSxiLkVsbGlwc2UucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5SZWN0YW5nbGUodGhpcy54LXRoaXMud2lkdGgsdGhpcy55LXRoaXMuaGVpZ2h0LHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLkVsbGlwc2UucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRWxsaXBzZSxiLk1hdHJpeD1mdW5jdGlvbigpe3RoaXMuYT0xLHRoaXMuYj0wLHRoaXMuYz0wLHRoaXMuZD0xLHRoaXMudHg9MCx0aGlzLnR5PTB9LGIuTWF0cml4LnByb3RvdHlwZS5mcm9tQXJyYXk9ZnVuY3Rpb24oYSl7dGhpcy5hPWFbMF0sdGhpcy5iPWFbMV0sdGhpcy5jPWFbM10sdGhpcy5kPWFbNF0sdGhpcy50eD1hWzJdLHRoaXMudHk9YVs1XX0sYi5NYXRyaXgucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24oYSl7dGhpcy5hcnJheXx8KHRoaXMuYXJyYXk9bmV3IEZsb2F0MzJBcnJheSg5KSk7dmFyIGI9dGhpcy5hcnJheTtyZXR1cm4gYT8oYlswXT10aGlzLmEsYlsxXT10aGlzLmMsYlsyXT0wLGJbM109dGhpcy5iLGJbNF09dGhpcy5kLGJbNV09MCxiWzZdPXRoaXMudHgsYls3XT10aGlzLnR5LGJbOF09MSk6KGJbMF09dGhpcy5hLGJbMV09dGhpcy5iLGJbMl09dGhpcy50eCxiWzNdPXRoaXMuYyxiWzRdPXRoaXMuZCxiWzVdPXRoaXMudHksYls2XT0wLGJbN109MCxiWzhdPTEpLGJ9LGIuaWRlbnRpdHlNYXRyaXg9bmV3IGIuTWF0cml4LGIuZGV0ZXJtaW5lTWF0cml4QXJyYXlUeXBlPWZ1bmN0aW9uKCl7cmV0dXJuXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZsb2F0MzJBcnJheT9GbG9hdDMyQXJyYXk6QXJyYXl9LGIuTWF0cml4Mj1iLmRldGVybWluZU1hdHJpeEFycmF5VHlwZSgpLGIuRGlzcGxheU9iamVjdD1mdW5jdGlvbigpe3RoaXMucG9zaXRpb249bmV3IGIuUG9pbnQsdGhpcy5zY2FsZT1uZXcgYi5Qb2ludCgxLDEpLHRoaXMucGl2b3Q9bmV3IGIuUG9pbnQoMCwwKSx0aGlzLnJvdGF0aW9uPTAsdGhpcy5hbHBoYT0xLHRoaXMudmlzaWJsZT0hMCx0aGlzLmhpdEFyZWE9bnVsbCx0aGlzLmJ1dHRvbk1vZGU9ITEsdGhpcy5yZW5kZXJhYmxlPSExLHRoaXMucGFyZW50PW51bGwsdGhpcy5zdGFnZT1udWxsLHRoaXMud29ybGRBbHBoYT0xLHRoaXMuX2ludGVyYWN0aXZlPSExLHRoaXMuZGVmYXVsdEN1cnNvcj1cInBvaW50ZXJcIix0aGlzLndvcmxkVHJhbnNmb3JtPW5ldyBiLk1hdHJpeCx0aGlzLmNvbG9yPVtdLHRoaXMuZHluYW1pYz0hMCx0aGlzLl9zcj0wLHRoaXMuX2NyPTEsdGhpcy5maWx0ZXJBcmVhPW51bGwsdGhpcy5fYm91bmRzPW5ldyBiLlJlY3RhbmdsZSgwLDAsMSwxKSx0aGlzLl9jdXJyZW50Qm91bmRzPW51bGwsdGhpcy5fbWFzaz1udWxsLHRoaXMuX2NhY2hlQXNCaXRtYXA9ITEsdGhpcy5fY2FjaGVJc0RpcnR5PSExfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRGlzcGxheU9iamVjdCxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnNldEludGVyYWN0aXZlPWZ1bmN0aW9uKGEpe3RoaXMuaW50ZXJhY3RpdmU9YX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJpbnRlcmFjdGl2ZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faW50ZXJhY3RpdmV9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9pbnRlcmFjdGl2ZT1hLHRoaXMuc3RhZ2UmJih0aGlzLnN0YWdlLmRpcnR5PSEwKX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcIndvcmxkVmlzaWJsZVwiLHtnZXQ6ZnVuY3Rpb24oKXt2YXIgYT10aGlzO2Rve2lmKCFhLnZpc2libGUpcmV0dXJuITE7YT1hLnBhcmVudH13aGlsZShhKTtyZXR1cm4hMH19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcIm1hc2tcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21hc2t9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9tYXNrJiYodGhpcy5fbWFzay5pc01hc2s9ITEpLHRoaXMuX21hc2s9YSx0aGlzLl9tYXNrJiYodGhpcy5fbWFzay5pc01hc2s9ITApfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwiZmlsdGVyc1wiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZmlsdGVyc30sc2V0OmZ1bmN0aW9uKGEpe2lmKGEpe2Zvcih2YXIgYj1bXSxjPTA7YzxhLmxlbmd0aDtjKyspZm9yKHZhciBkPWFbY10ucGFzc2VzLGU9MDtlPGQubGVuZ3RoO2UrKyliLnB1c2goZFtlXSk7dGhpcy5fZmlsdGVyQmxvY2s9e3RhcmdldDp0aGlzLGZpbHRlclBhc3NlczpifX10aGlzLl9maWx0ZXJzPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJjYWNoZUFzQml0bWFwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9jYWNoZUFzQml0bWFwfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fY2FjaGVBc0JpdG1hcCE9PWEmJihhP3RoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCk6dGhpcy5fZGVzdHJveUNhY2hlZFNwcml0ZSgpLHRoaXMuX2NhY2hlQXNCaXRtYXA9YSl9fSksYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLnJvdGF0aW9uIT09dGhpcy5yb3RhdGlvbkNhY2hlJiYodGhpcy5yb3RhdGlvbkNhY2hlPXRoaXMucm90YXRpb24sdGhpcy5fc3I9TWF0aC5zaW4odGhpcy5yb3RhdGlvbiksdGhpcy5fY3I9TWF0aC5jb3ModGhpcy5yb3RhdGlvbikpO3ZhciBhPXRoaXMucGFyZW50LndvcmxkVHJhbnNmb3JtLGI9dGhpcy53b3JsZFRyYW5zZm9ybSxjPXRoaXMucGl2b3QueCxkPXRoaXMucGl2b3QueSxlPXRoaXMuX2NyKnRoaXMuc2NhbGUueCxmPS10aGlzLl9zcip0aGlzLnNjYWxlLnksZz10aGlzLl9zcip0aGlzLnNjYWxlLngsaD10aGlzLl9jcip0aGlzLnNjYWxlLnksaT10aGlzLnBvc2l0aW9uLngtZSpjLWQqZixqPXRoaXMucG9zaXRpb24ueS1oKmQtYypnLGs9YS5hLGw9YS5iLG09YS5jLG49YS5kO2IuYT1rKmUrbCpnLGIuYj1rKmYrbCpoLGIudHg9ayppK2wqaithLnR4LGIuYz1tKmUrbipnLGIuZD1tKmYrbipoLGIudHk9bSppK24qaithLnR5LHRoaXMud29ybGRBbHBoYT10aGlzLmFscGhhKnRoaXMucGFyZW50LndvcmxkQWxwaGF9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe3JldHVybiBhPWEsYi5FbXB0eVJlY3RhbmdsZX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5nZXRMb2NhbEJvdW5kcz1mdW5jdGlvbigpe3JldHVybiB0aGlzLmdldEJvdW5kcyhiLmlkZW50aXR5TWF0cml4KX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5zZXRTdGFnZVJlZmVyZW5jZT1mdW5jdGlvbihhKXt0aGlzLnN0YWdlPWEsdGhpcy5faW50ZXJhY3RpdmUmJih0aGlzLnN0YWdlLmRpcnR5PSEwKX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5nZW5lcmF0ZVRleHR1cmU9ZnVuY3Rpb24oYSl7dmFyIGM9dGhpcy5nZXRMb2NhbEJvdW5kcygpLGQ9bmV3IGIuUmVuZGVyVGV4dHVyZSgwfGMud2lkdGgsMHxjLmhlaWdodCxhKTtyZXR1cm4gZC5yZW5kZXIodGhpcyxuZXcgYi5Qb2ludCgtYy54LC1jLnkpKSxkfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZUNhY2hlPWZ1bmN0aW9uKCl7dGhpcy5fZ2VuZXJhdGVDYWNoZWRTcHJpdGUoKX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5fcmVuZGVyQ2FjaGVkU3ByaXRlPWZ1bmN0aW9uKGEpe3RoaXMuX2NhY2hlZFNwcml0ZS53b3JsZEFscGhhPXRoaXMud29ybGRBbHBoYSxhLmdsP2IuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0wuY2FsbCh0aGlzLl9jYWNoZWRTcHJpdGUsYSk6Yi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJDYW52YXMuY2FsbCh0aGlzLl9jYWNoZWRTcHJpdGUsYSl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlPWZ1bmN0aW9uKCl7dGhpcy5fY2FjaGVBc0JpdG1hcD0hMTt2YXIgYT10aGlzLmdldExvY2FsQm91bmRzKCk7aWYodGhpcy5fY2FjaGVkU3ByaXRlKXRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLnJlc2l6ZSgwfGEud2lkdGgsMHxhLmhlaWdodCk7ZWxzZXt2YXIgYz1uZXcgYi5SZW5kZXJUZXh0dXJlKDB8YS53aWR0aCwwfGEuaGVpZ2h0KTt0aGlzLl9jYWNoZWRTcHJpdGU9bmV3IGIuU3ByaXRlKGMpLHRoaXMuX2NhY2hlZFNwcml0ZS53b3JsZFRyYW5zZm9ybT10aGlzLndvcmxkVHJhbnNmb3JtfXZhciBkPXRoaXMuX2ZpbHRlcnM7dGhpcy5fZmlsdGVycz1udWxsLHRoaXMuX2NhY2hlZFNwcml0ZS5maWx0ZXJzPWQsdGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUucmVuZGVyKHRoaXMsbmV3IGIuUG9pbnQoLWEueCwtYS55KSksdGhpcy5fY2FjaGVkU3ByaXRlLmFuY2hvci54PS0oYS54L2Eud2lkdGgpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueT0tKGEueS9hLmhlaWdodCksdGhpcy5fZmlsdGVycz1kLHRoaXMuX2NhY2hlQXNCaXRtYXA9ITB9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX2Rlc3Ryb3lDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oKXt0aGlzLl9jYWNoZWRTcHJpdGUmJih0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5kZXN0cm95KCEwKSx0aGlzLl9jYWNoZWRTcHJpdGU9bnVsbCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2E9YX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2E9YX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJ4XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnBvc2l0aW9uLnh9LHNldDpmdW5jdGlvbihhKXt0aGlzLnBvc2l0aW9uLng9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcInlcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucG9zaXRpb24ueX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMucG9zaXRpb24ueT1hfX0pLGIuRGlzcGxheU9iamVjdENvbnRhaW5lcj1mdW5jdGlvbigpe2IuRGlzcGxheU9iamVjdC5jYWxsKHRoaXMpLHRoaXMuY2hpbGRyZW49W119LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlKSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRGlzcGxheU9iamVjdENvbnRhaW5lcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSxcIndpZHRoXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYWxlLngqdGhpcy5nZXRMb2NhbEJvdW5kcygpLndpZHRofSxzZXQ6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5nZXRMb2NhbEJvdW5kcygpLndpZHRoO3RoaXMuc2NhbGUueD0wIT09Yj9hLyhiL3RoaXMuc2NhbGUueCk6MSx0aGlzLl93aWR0aD1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYWxlLnkqdGhpcy5nZXRMb2NhbEJvdW5kcygpLmhlaWdodH0sc2V0OmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKS5oZWlnaHQ7dGhpcy5zY2FsZS55PTAhPT1iP2EvKGIvdGhpcy5zY2FsZS55KToxLHRoaXMuX2hlaWdodD1hfX0pLGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuYWRkQ2hpbGQ9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuYWRkQ2hpbGRBdChhLHRoaXMuY2hpbGRyZW4ubGVuZ3RoKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5hZGRDaGlsZEF0PWZ1bmN0aW9uKGEsYil7aWYoYj49MCYmYjw9dGhpcy5jaGlsZHJlbi5sZW5ndGgpcmV0dXJuIGEucGFyZW50JiZhLnBhcmVudC5yZW1vdmVDaGlsZChhKSxhLnBhcmVudD10aGlzLHRoaXMuY2hpbGRyZW4uc3BsaWNlKGIsMCxhKSx0aGlzLnN0YWdlJiZhLnNldFN0YWdlUmVmZXJlbmNlKHRoaXMuc3RhZ2UpLGE7dGhyb3cgbmV3IEVycm9yKGErXCIgVGhlIGluZGV4IFwiK2IrXCIgc3VwcGxpZWQgaXMgb3V0IG9mIGJvdW5kcyBcIit0aGlzLmNoaWxkcmVuLmxlbmd0aCl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuc3dhcENoaWxkcmVuPWZ1bmN0aW9uKGEsYil7aWYoYSE9PWIpe3ZhciBjPXRoaXMuY2hpbGRyZW4uaW5kZXhPZihhKSxkPXRoaXMuY2hpbGRyZW4uaW5kZXhPZihiKTtpZigwPmN8fDA+ZCl0aHJvdyBuZXcgRXJyb3IoXCJzd2FwQ2hpbGRyZW46IEJvdGggdGhlIHN1cHBsaWVkIERpc3BsYXlPYmplY3RzIG11c3QgYmUgYSBjaGlsZCBvZiB0aGUgY2FsbGVyLlwiKTt0aGlzLmNoaWxkcmVuW2NdPWIsdGhpcy5jaGlsZHJlbltkXT1hfX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5nZXRDaGlsZEF0PWZ1bmN0aW9uKGEpe2lmKGE+PTAmJmE8dGhpcy5jaGlsZHJlbi5sZW5ndGgpcmV0dXJuIHRoaXMuY2hpbGRyZW5bYV07dGhyb3cgbmV3IEVycm9yKFwiU3VwcGxpZWQgaW5kZXggZG9lcyBub3QgZXhpc3QgaW4gdGhlIGNoaWxkIGxpc3QsIG9yIHRoZSBzdXBwbGllZCBEaXNwbGF5T2JqZWN0IG11c3QgYmUgYSBjaGlsZCBvZiB0aGUgY2FsbGVyXCIpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZUNoaWxkPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnJlbW92ZUNoaWxkQXQodGhpcy5jaGlsZHJlbi5pbmRleE9mKGEpKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5yZW1vdmVDaGlsZEF0PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuZ2V0Q2hpbGRBdChhKTtyZXR1cm4gdGhpcy5zdGFnZSYmYi5yZW1vdmVTdGFnZVJlZmVyZW5jZSgpLGIucGFyZW50PXZvaWQgMCx0aGlzLmNoaWxkcmVuLnNwbGljZShhLDEpLGJ9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUucmVtb3ZlQ2hpbGRyZW49ZnVuY3Rpb24oYSxiKXt2YXIgYz1hfHwwLGQ9XCJudW1iZXJcIj09dHlwZW9mIGI/Yjp0aGlzLmNoaWxkcmVuLmxlbmd0aCxlPWQtYztpZihlPjAmJmQ+PWUpe2Zvcih2YXIgZj10aGlzLmNoaWxkcmVuLnNwbGljZShjLGUpLGc9MDtnPGYubGVuZ3RoO2crKyl7dmFyIGg9ZltnXTt0aGlzLnN0YWdlJiZoLnJlbW92ZVN0YWdlUmVmZXJlbmNlKCksaC5wYXJlbnQ9dm9pZCAwfXJldHVybiBmfXRocm93IG5ldyBFcnJvcihcIlJhbmdlIEVycm9yLCBudW1lcmljIHZhbHVlcyBhcmUgb3V0c2lkZSB0aGUgYWNjZXB0YWJsZSByYW5nZVwiKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXtpZih0aGlzLnZpc2libGUmJihiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpLCF0aGlzLl9jYWNoZUFzQml0bWFwKSlmb3IodmFyIGE9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YTthKyspdGhpcy5jaGlsZHJlblthXS51cGRhdGVUcmFuc2Zvcm0oKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oYSl7aWYoMD09PXRoaXMuY2hpbGRyZW4ubGVuZ3RoKXJldHVybiBiLkVtcHR5UmVjdGFuZ2xlO2lmKGEpe3ZhciBjPXRoaXMud29ybGRUcmFuc2Zvcm07dGhpcy53b3JsZFRyYW5zZm9ybT1hLHRoaXMudXBkYXRlVHJhbnNmb3JtKCksdGhpcy53b3JsZFRyYW5zZm9ybT1jfWZvcih2YXIgZCxlLGYsZz0xLzAsaD0xLzAsaT0tMS8wLGo9LTEvMCxrPSExLGw9MCxtPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO20+bDtsKyspe3ZhciBuPXRoaXMuY2hpbGRyZW5bbF07bi52aXNpYmxlJiYoaz0hMCxkPXRoaXMuY2hpbGRyZW5bbF0uZ2V0Qm91bmRzKGEpLGc9ZzxkLng/ZzpkLngsaD1oPGQueT9oOmQueSxlPWQud2lkdGgrZC54LGY9ZC5oZWlnaHQrZC55LGk9aT5lP2k6ZSxqPWo+Zj9qOmYpfWlmKCFrKXJldHVybiBiLkVtcHR5UmVjdGFuZ2xlO3ZhciBvPXRoaXMuX2JvdW5kcztyZXR1cm4gby54PWcsby55PWgsby53aWR0aD1pLWcsby5oZWlnaHQ9ai1oLG99LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuZ2V0TG9jYWxCb3VuZHM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLndvcmxkVHJhbnNmb3JtO3RoaXMud29ybGRUcmFuc2Zvcm09Yi5pZGVudGl0eU1hdHJpeDtmb3IodmFyIGM9MCxkPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2Q+YztjKyspdGhpcy5jaGlsZHJlbltjXS51cGRhdGVUcmFuc2Zvcm0oKTt2YXIgZT10aGlzLmdldEJvdW5kcygpO3JldHVybiB0aGlzLndvcmxkVHJhbnNmb3JtPWEsZX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5zZXRTdGFnZVJlZmVyZW5jZT1mdW5jdGlvbihhKXt0aGlzLnN0YWdlPWEsdGhpcy5faW50ZXJhY3RpdmUmJih0aGlzLnN0YWdlLmRpcnR5PSEwKTtmb3IodmFyIGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspe3ZhciBkPXRoaXMuY2hpbGRyZW5bYl07ZC5zZXRTdGFnZVJlZmVyZW5jZShhKX19LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUucmVtb3ZlU3RhZ2VSZWZlcmVuY2U9ZnVuY3Rpb24oKXtmb3IodmFyIGE9MCxiPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2I+YTthKyspe3ZhciBjPXRoaXMuY2hpbGRyZW5bYV07Yy5yZW1vdmVTdGFnZVJlZmVyZW5jZSgpfXRoaXMuX2ludGVyYWN0aXZlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCksdGhpcy5zdGFnZT1udWxsfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUmJiEodGhpcy5hbHBoYTw9MCkpe2lmKHRoaXMuX2NhY2hlQXNCaXRtYXApcmV0dXJuIHRoaXMuX3JlbmRlckNhY2hlZFNwcml0ZShhKSx2b2lkIDA7dmFyIGIsYztpZih0aGlzLl9tYXNrfHx0aGlzLl9maWx0ZXJzKXtmb3IodGhpcy5fZmlsdGVycyYmKGEuc3ByaXRlQmF0Y2guZmx1c2goKSxhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jaykpLHRoaXMuX21hc2smJihhLnNwcml0ZUJhdGNoLnN0b3AoKSxhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMubWFzayxhKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpLGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspdGhpcy5jaGlsZHJlbltiXS5fcmVuZGVyV2ViR0woYSk7YS5zcHJpdGVCYXRjaC5zdG9wKCksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKHRoaXMuX21hc2ssYSksdGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnBvcEZpbHRlcigpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKX1lbHNlIGZvcihiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXRoaXMuY2hpbGRyZW5bYl0uX3JlbmRlcldlYkdMKGEpfX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSl7aWYodGhpcy5fY2FjaGVBc0JpdG1hcClyZXR1cm4gdGhpcy5fcmVuZGVyQ2FjaGVkU3ByaXRlKGEpLHZvaWQgMDt0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMuX21hc2ssYS5jb250ZXh0KTtmb3IodmFyIGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspe3ZhciBkPXRoaXMuY2hpbGRyZW5bYl07ZC5fcmVuZGVyQ2FudmFzKGEpfXRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayhhLmNvbnRleHQpfX0sYi5TcHJpdGU9ZnVuY3Rpb24oYSl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5hbmNob3I9bmV3IGIuUG9pbnQsdGhpcy50ZXh0dXJlPWEsdGhpcy5fd2lkdGg9MCx0aGlzLl9oZWlnaHQ9MCx0aGlzLnRpbnQ9MTY3NzcyMTUsdGhpcy5ibGVuZE1vZGU9Yi5ibGVuZE1vZGVzLk5PUk1BTCxhLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD90aGlzLm9uVGV4dHVyZVVwZGF0ZSgpOih0aGlzLm9uVGV4dHVyZVVwZGF0ZUJpbmQ9dGhpcy5vblRleHR1cmVVcGRhdGUuYmluZCh0aGlzKSx0aGlzLnRleHR1cmUuYWRkRXZlbnRMaXN0ZW5lcihcInVwZGF0ZVwiLHRoaXMub25UZXh0dXJlVXBkYXRlQmluZCkpLHRoaXMucmVuZGVyYWJsZT0hMH0sYi5TcHJpdGUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TcHJpdGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3ByaXRlLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlNwcml0ZS5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS54KnRoaXMudGV4dHVyZS5mcmFtZS53aWR0aH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuc2NhbGUueD1hL3RoaXMudGV4dHVyZS5mcmFtZS53aWR0aCx0aGlzLl93aWR0aD1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlNwcml0ZS5wcm90b3R5cGUsXCJoZWlnaHRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbGUueSp0aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5zY2FsZS55PWEvdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodCx0aGlzLl9oZWlnaHQ9YX19KSxiLlNwcml0ZS5wcm90b3R5cGUuc2V0VGV4dHVyZT1mdW5jdGlvbihhKXt0aGlzLnRleHR1cmU9YSx0aGlzLmNhY2hlZFRpbnQ9MTY3NzcyMTV9LGIuU3ByaXRlLnByb3RvdHlwZS5vblRleHR1cmVVcGRhdGU9ZnVuY3Rpb24oKXt0aGlzLl93aWR0aCYmKHRoaXMuc2NhbGUueD10aGlzLl93aWR0aC90aGlzLnRleHR1cmUuZnJhbWUud2lkdGgpLHRoaXMuX2hlaWdodCYmKHRoaXMuc2NhbGUueT10aGlzLl9oZWlnaHQvdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodCl9LGIuU3ByaXRlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoLGM9dGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodCxkPWIqKDEtdGhpcy5hbmNob3IueCksZT1iKi10aGlzLmFuY2hvci54LGY9YyooMS10aGlzLmFuY2hvci55KSxnPWMqLXRoaXMuYW5jaG9yLnksaD1hfHx0aGlzLndvcmxkVHJhbnNmb3JtLGk9aC5hLGo9aC5jLGs9aC5iLGw9aC5kLG09aC50eCxuPWgudHksbz1pKmUraypnK20scD1sKmcraiplK24scT1pKmQraypnK20scj1sKmcraipkK24scz1pKmQraypmK20sdD1sKmYraipkK24sdT1pKmUraypmK20sdj1sKmYraiplK24sdz0tMS8wLHg9LTEvMCx5PTEvMCx6PTEvMDt5PXk+bz9vOnkseT15PnE/cTp5LHk9eT5zP3M6eSx5PXk+dT91Onksej16PnA/cDp6LHo9ej5yP3I6eix6PXo+dD90Onosej16PnY/djp6LHc9bz53P286dyx3PXE+dz9xOncsdz1zPnc/czp3LHc9dT53P3U6dyx4PXA+eD9wOngseD1yPng/cjp4LHg9dD54P3Q6eCx4PXY+eD92Ong7dmFyIEE9dGhpcy5fYm91bmRzO3JldHVybiBBLng9eSxBLndpZHRoPXcteSxBLnk9eixBLmhlaWdodD14LXosdGhpcy5fY3VycmVudEJvdW5kcz1BLEF9LGIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlJiYhKHRoaXMuYWxwaGE8PTApKXt2YXIgYixjO2lmKHRoaXMuX21hc2t8fHRoaXMuX2ZpbHRlcnMpe3ZhciBkPWEuc3ByaXRlQmF0Y2g7Zm9yKHRoaXMuX2ZpbHRlcnMmJihkLmZsdXNoKCksYS5maWx0ZXJNYW5hZ2VyLnB1c2hGaWx0ZXIodGhpcy5fZmlsdGVyQmxvY2spKSx0aGlzLl9tYXNrJiYoZC5zdG9wKCksYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLm1hc2ssYSksZC5zdGFydCgpKSxkLnJlbmRlcih0aGlzKSxiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXRoaXMuY2hpbGRyZW5bYl0uX3JlbmRlcldlYkdMKGEpO2Quc3RvcCgpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayh0aGlzLl9tYXNrLGEpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSxkLnN0YXJ0KCl9ZWxzZSBmb3IoYS5zcHJpdGVCYXRjaC5yZW5kZXIodGhpcyksYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKX19LGIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSl7aWYodGhpcy5ibGVuZE1vZGUhPT1hLmN1cnJlbnRCbGVuZE1vZGUmJihhLmN1cnJlbnRCbGVuZE1vZGU9dGhpcy5ibGVuZE1vZGUsYS5jb250ZXh0Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1iLmJsZW5kTW9kZXNDYW52YXNbYS5jdXJyZW50QmxlbmRNb2RlXSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEuY29udGV4dCksdGhpcy50ZXh0dXJlLnZhbGlkKXthLmNvbnRleHQuZ2xvYmFsQWxwaGE9dGhpcy53b3JsZEFscGhhLGEucm91bmRQaXhlbHM/YS5jb250ZXh0LnNldFRyYW5zZm9ybSh0aGlzLndvcmxkVHJhbnNmb3JtLmEsdGhpcy53b3JsZFRyYW5zZm9ybS5jLHRoaXMud29ybGRUcmFuc2Zvcm0uYix0aGlzLndvcmxkVHJhbnNmb3JtLmQsMHx0aGlzLndvcmxkVHJhbnNmb3JtLnR4LDB8dGhpcy53b3JsZFRyYW5zZm9ybS50eSk6YS5jb250ZXh0LnNldFRyYW5zZm9ybSh0aGlzLndvcmxkVHJhbnNmb3JtLmEsdGhpcy53b3JsZFRyYW5zZm9ybS5jLHRoaXMud29ybGRUcmFuc2Zvcm0uYix0aGlzLndvcmxkVHJhbnNmb3JtLmQsdGhpcy53b3JsZFRyYW5zZm9ybS50eCx0aGlzLndvcmxkVHJhbnNmb3JtLnR5KSxhLnNtb290aFByb3BlcnR5JiZhLnNjYWxlTW9kZSE9PXRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5zY2FsZU1vZGUmJihhLnNjYWxlTW9kZT10aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuc2NhbGVNb2RlLGEuY29udGV4dFthLnNtb290aFByb3BlcnR5XT1hLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVIpO3ZhciBjPXRoaXMudGV4dHVyZS50cmltP3RoaXMudGV4dHVyZS50cmltLngtdGhpcy5hbmNob3IueCp0aGlzLnRleHR1cmUudHJpbS53aWR0aDp0aGlzLmFuY2hvci54Ki10aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsZD10aGlzLnRleHR1cmUudHJpbT90aGlzLnRleHR1cmUudHJpbS55LXRoaXMuYW5jaG9yLnkqdGhpcy50ZXh0dXJlLnRyaW0uaGVpZ2h0OnRoaXMuYW5jaG9yLnkqLXRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQ7MTY3NzcyMTUhPT10aGlzLnRpbnQ/KHRoaXMuY2FjaGVkVGludCE9PXRoaXMudGludCYmKHRoaXMuY2FjaGVkVGludD10aGlzLnRpbnQsdGhpcy50aW50ZWRUZXh0dXJlPWIuQ2FudmFzVGludGVyLmdldFRpbnRlZFRleHR1cmUodGhpcyx0aGlzLnRpbnQpKSxhLmNvbnRleHQuZHJhd0ltYWdlKHRoaXMudGludGVkVGV4dHVyZSwwLDAsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0LGMsZCx0aGlzLnRleHR1cmUuY3JvcC53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQpKTphLmNvbnRleHQuZHJhd0ltYWdlKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsdGhpcy50ZXh0dXJlLmNyb3AueCx0aGlzLnRleHR1cmUuY3JvcC55LHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCxjLGQsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0KX1mb3IodmFyIGU9MCxmPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2Y+ZTtlKyspdGhpcy5jaGlsZHJlbltlXS5fcmVuZGVyQ2FudmFzKGEpO3RoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayhhLmNvbnRleHQpfX0sYi5TcHJpdGUuZnJvbUZyYW1lPWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dHVyZUNhY2hlW2FdO2lmKCFjKXRocm93IG5ldyBFcnJvcignVGhlIGZyYW1lSWQgXCInK2ErJ1wiIGRvZXMgbm90IGV4aXN0IGluIHRoZSB0ZXh0dXJlIGNhY2hlJyt0aGlzKTtyZXR1cm4gbmV3IGIuU3ByaXRlKGMpfSxiLlNwcml0ZS5mcm9tSW1hZ2U9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWIuVGV4dHVyZS5mcm9tSW1hZ2UoYSxjLGQpO3JldHVybiBuZXcgYi5TcHJpdGUoZSl9LGIuU3ByaXRlQmF0Y2g9ZnVuY3Rpb24oYSl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy50ZXh0dXJlVGhpbmc9YSx0aGlzLnJlYWR5PSExfSxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3ByaXRlQmF0Y2guY29uc3RydWN0b3I9Yi5TcHJpdGVCYXRjaCxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZS5pbml0V2ViR0w9ZnVuY3Rpb24oYSl7dGhpcy5mYXN0U3ByaXRlQmF0Y2g9bmV3IGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2goYSksdGhpcy5yZWFkeT0hMH0sYi5TcHJpdGVCYXRjaC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7Yi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX0sYi5TcHJpdGVCYXRjaC5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpeyF0aGlzLnZpc2libGV8fHRoaXMuYWxwaGE8PTB8fCF0aGlzLmNoaWxkcmVuLmxlbmd0aHx8KHRoaXMucmVhZHl8fHRoaXMuaW5pdFdlYkdMKGEuZ2wpLGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoYS5zaGFkZXJNYW5hZ2VyLmZhc3RTaGFkZXIpLHRoaXMuZmFzdFNwcml0ZUJhdGNoLmJlZ2luKHRoaXMsYSksdGhpcy5mYXN0U3ByaXRlQmF0Y2gucmVuZGVyKHRoaXMpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKSl9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7dmFyIGM9YS5jb250ZXh0O2MuZ2xvYmFsQWxwaGE9dGhpcy53b3JsZEFscGhhLGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyk7Zm9yKHZhciBkPXRoaXMud29ybGRUcmFuc2Zvcm0sZT0hMCxmPTA7Zjx0aGlzLmNoaWxkcmVuLmxlbmd0aDtmKyspe3ZhciBnPXRoaXMuY2hpbGRyZW5bZl07aWYoZy52aXNpYmxlKXt2YXIgaD1nLnRleHR1cmUsaT1oLmZyYW1lO2lmKGMuZ2xvYmFsQWxwaGE9dGhpcy53b3JsZEFscGhhKmcuYWxwaGEsZy5yb3RhdGlvbiUoMipNYXRoLlBJKT09PTApZSYmKGMuc2V0VHJhbnNmb3JtKGQuYSxkLmMsZC5iLGQuZCxkLnR4LGQudHkpLGU9ITEpLGMuZHJhd0ltYWdlKGguYmFzZVRleHR1cmUuc291cmNlLGkueCxpLnksaS53aWR0aCxpLmhlaWdodCxnLmFuY2hvci54Ki1pLndpZHRoKmcuc2NhbGUueCtnLnBvc2l0aW9uLngrLjV8MCxnLmFuY2hvci55Ki1pLmhlaWdodCpnLnNjYWxlLnkrZy5wb3NpdGlvbi55Ky41fDAsaS53aWR0aCpnLnNjYWxlLngsaS5oZWlnaHQqZy5zY2FsZS55KTtlbHNle2V8fChlPSEwKSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKGcpO3ZhciBqPWcud29ybGRUcmFuc2Zvcm07YS5yb3VuZFBpeGVscz9jLnNldFRyYW5zZm9ybShqLmEsai5jLGouYixqLmQsMHxqLnR4LDB8ai50eSk6Yy5zZXRUcmFuc2Zvcm0oai5hLGouYyxqLmIsai5kLGoudHgsai50eSksYy5kcmF3SW1hZ2UoaC5iYXNlVGV4dHVyZS5zb3VyY2UsaS54LGkueSxpLndpZHRoLGkuaGVpZ2h0LGcuYW5jaG9yLngqLWkud2lkdGgrLjV8MCxnLmFuY2hvci55Ki1pLmhlaWdodCsuNXwwLGkud2lkdGgsaS5oZWlnaHQpfX19fSxiLk1vdmllQ2xpcD1mdW5jdGlvbihhKXtiLlNwcml0ZS5jYWxsKHRoaXMsYVswXSksdGhpcy50ZXh0dXJlcz1hLHRoaXMuYW5pbWF0aW9uU3BlZWQ9MSx0aGlzLmxvb3A9ITAsdGhpcy5vbkNvbXBsZXRlPW51bGwsdGhpcy5jdXJyZW50RnJhbWU9MCx0aGlzLnBsYXlpbmc9ITF9LGIuTW92aWVDbGlwLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuU3ByaXRlLnByb3RvdHlwZSksYi5Nb3ZpZUNsaXAucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuTW92aWVDbGlwLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLk1vdmllQ2xpcC5wcm90b3R5cGUsXCJ0b3RhbEZyYW1lc1wiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50ZXh0dXJlcy5sZW5ndGh9fSksYi5Nb3ZpZUNsaXAucHJvdG90eXBlLnN0b3A9ZnVuY3Rpb24oKXt0aGlzLnBsYXlpbmc9ITF9LGIuTW92aWVDbGlwLnByb3RvdHlwZS5wbGF5PWZ1bmN0aW9uKCl7dGhpcy5wbGF5aW5nPSEwfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUuZ290b0FuZFN0b3A9ZnVuY3Rpb24oYSl7dGhpcy5wbGF5aW5nPSExLHRoaXMuY3VycmVudEZyYW1lPWE7dmFyIGI9dGhpcy5jdXJyZW50RnJhbWUrLjV8MDt0aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1tiJXRoaXMudGV4dHVyZXMubGVuZ3RoXSl9LGIuTW92aWVDbGlwLnByb3RvdHlwZS5nb3RvQW5kUGxheT1mdW5jdGlvbihhKXt0aGlzLmN1cnJlbnRGcmFtZT1hLHRoaXMucGxheWluZz0hMH0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe2lmKGIuU3ByaXRlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKSx0aGlzLnBsYXlpbmcpe3RoaXMuY3VycmVudEZyYW1lKz10aGlzLmFuaW1hdGlvblNwZWVkO3ZhciBhPXRoaXMuY3VycmVudEZyYW1lKy41fDA7dGhpcy5jdXJyZW50RnJhbWU9dGhpcy5jdXJyZW50RnJhbWUldGhpcy50ZXh0dXJlcy5sZW5ndGgsdGhpcy5sb29wfHxhPHRoaXMudGV4dHVyZXMubGVuZ3RoP3RoaXMuc2V0VGV4dHVyZSh0aGlzLnRleHR1cmVzW2EldGhpcy50ZXh0dXJlcy5sZW5ndGhdKTphPj10aGlzLnRleHR1cmVzLmxlbmd0aCYmKHRoaXMuZ290b0FuZFN0b3AodGhpcy50ZXh0dXJlcy5sZW5ndGgtMSksdGhpcy5vbkNvbXBsZXRlJiZ0aGlzLm9uQ29tcGxldGUoKSl9fSxiLk1vdmllQ2xpcC5mcm9tRnJhbWVzPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1bXSxkPTA7ZDxhLmxlbmd0aDtkKyspYy5wdXNoKG5ldyBiLlRleHR1cmUuZnJvbUZyYW1lKGFbZF0pKTtyZXR1cm4gbmV3IGIuTW92aWVDbGlwKGMpfSxiLk1vdmllQ2xpcC5mcm9tSW1hZ2VzPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1bXSxkPTA7ZDxhLmxlbmd0aDtkKyspYy5wdXNoKG5ldyBiLlRleHR1cmUuZnJvbUltYWdlKGFbZF0pKTtyZXR1cm4gbmV3IGIuTW92aWVDbGlwKGMpfSxiLkZpbHRlckJsb2NrPWZ1bmN0aW9uKCl7dGhpcy52aXNpYmxlPSEwLHRoaXMucmVuZGVyYWJsZT0hMH0sYi5UZXh0PWZ1bmN0aW9uKGEsYyl7dGhpcy5jYW52YXM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSx0aGlzLmNvbnRleHQ9dGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpLGIuU3ByaXRlLmNhbGwodGhpcyxiLlRleHR1cmUuZnJvbUNhbnZhcyh0aGlzLmNhbnZhcykpLHRoaXMuc2V0VGV4dChhKSx0aGlzLnNldFN0eWxlKGMpfSxiLlRleHQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5TcHJpdGUucHJvdG90eXBlKSxiLlRleHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuVGV4dCxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UZXh0LnByb3RvdHlwZSxcIndpZHRoXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmRpcnR5JiYodGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMSksdGhpcy5zY2FsZS54KnRoaXMudGV4dHVyZS5mcmFtZS53aWR0aH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuc2NhbGUueD1hL3RoaXMudGV4dHVyZS5mcmFtZS53aWR0aCx0aGlzLl93aWR0aD1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlRleHQucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmRpcnR5JiYodGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMSksdGhpcy5zY2FsZS55KnRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLnk9YS90aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0LHRoaXMuX2hlaWdodD1hfX0pLGIuVGV4dC5wcm90b3R5cGUuc2V0U3R5bGU9ZnVuY3Rpb24oYSl7YT1hfHx7fSxhLmZvbnQ9YS5mb250fHxcImJvbGQgMjBwdCBBcmlhbFwiLGEuZmlsbD1hLmZpbGx8fFwiYmxhY2tcIixhLmFsaWduPWEuYWxpZ258fFwibGVmdFwiLGEuc3Ryb2tlPWEuc3Ryb2tlfHxcImJsYWNrXCIsYS5zdHJva2VUaGlja25lc3M9YS5zdHJva2VUaGlja25lc3N8fDAsYS53b3JkV3JhcD1hLndvcmRXcmFwfHwhMSxhLndvcmRXcmFwV2lkdGg9YS53b3JkV3JhcFdpZHRofHwxMDAsYS53b3JkV3JhcFdpZHRoPWEud29yZFdyYXBXaWR0aHx8MTAwLGEuZHJvcFNoYWRvdz1hLmRyb3BTaGFkb3d8fCExLGEuZHJvcFNoYWRvd0FuZ2xlPWEuZHJvcFNoYWRvd0FuZ2xlfHxNYXRoLlBJLzYsYS5kcm9wU2hhZG93RGlzdGFuY2U9YS5kcm9wU2hhZG93RGlzdGFuY2V8fDQsYS5kcm9wU2hhZG93Q29sb3I9YS5kcm9wU2hhZG93Q29sb3J8fFwiYmxhY2tcIix0aGlzLnN0eWxlPWEsdGhpcy5kaXJ0eT0hMH0sYi5UZXh0LnByb3RvdHlwZS5zZXRUZXh0PWZ1bmN0aW9uKGEpe3RoaXMudGV4dD1hLnRvU3RyaW5nKCl8fFwiIFwiLHRoaXMuZGlydHk9ITB9LGIuVGV4dC5wcm90b3R5cGUudXBkYXRlVGV4dD1mdW5jdGlvbigpe3RoaXMuY29udGV4dC5mb250PXRoaXMuc3R5bGUuZm9udDt2YXIgYT10aGlzLnRleHQ7dGhpcy5zdHlsZS53b3JkV3JhcCYmKGE9dGhpcy53b3JkV3JhcCh0aGlzLnRleHQpKTtmb3IodmFyIGI9YS5zcGxpdCgvKD86XFxyXFxufFxccnxcXG4pLyksYz1bXSxkPTAsZT0wO2U8Yi5sZW5ndGg7ZSsrKXt2YXIgZj10aGlzLmNvbnRleHQubWVhc3VyZVRleHQoYltlXSkud2lkdGg7Y1tlXT1mLGQ9TWF0aC5tYXgoZCxmKX12YXIgZz1kK3RoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzO3RoaXMuc3R5bGUuZHJvcFNoYWRvdyYmKGcrPXRoaXMuc3R5bGUuZHJvcFNoYWRvd0Rpc3RhbmNlKSx0aGlzLmNhbnZhcy53aWR0aD1nK3RoaXMuY29udGV4dC5saW5lV2lkdGg7dmFyIGg9dGhpcy5kZXRlcm1pbmVGb250SGVpZ2h0KFwiZm9udDogXCIrdGhpcy5zdHlsZS5mb250K1wiO1wiKSt0aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcyxpPWgqYi5sZW5ndGg7dGhpcy5zdHlsZS5kcm9wU2hhZG93JiYoaSs9dGhpcy5zdHlsZS5kcm9wU2hhZG93RGlzdGFuY2UpLHRoaXMuY2FudmFzLmhlaWdodD1pLG5hdmlnYXRvci5pc0NvY29vbkpTJiZ0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLmNhbnZhcy53aWR0aCx0aGlzLmNhbnZhcy5oZWlnaHQpLHRoaXMuY29udGV4dC5mb250PXRoaXMuc3R5bGUuZm9udCx0aGlzLmNvbnRleHQuc3Ryb2tlU3R5bGU9dGhpcy5zdHlsZS5zdHJva2UsdGhpcy5jb250ZXh0LmxpbmVXaWR0aD10aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcyx0aGlzLmNvbnRleHQudGV4dEJhc2VsaW5lPVwidG9wXCI7dmFyIGosaztpZih0aGlzLnN0eWxlLmRyb3BTaGFkb3cpe3RoaXMuY29udGV4dC5maWxsU3R5bGU9dGhpcy5zdHlsZS5kcm9wU2hhZG93Q29sb3I7dmFyIGw9TWF0aC5zaW4odGhpcy5zdHlsZS5kcm9wU2hhZG93QW5nbGUpKnRoaXMuc3R5bGUuZHJvcFNoYWRvd0Rpc3RhbmNlLG09TWF0aC5jb3ModGhpcy5zdHlsZS5kcm9wU2hhZG93QW5nbGUpKnRoaXMuc3R5bGUuZHJvcFNoYWRvd0Rpc3RhbmNlO2ZvcihlPTA7ZTxiLmxlbmd0aDtlKyspaj10aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcy8yLGs9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMitlKmgsXCJyaWdodFwiPT09dGhpcy5zdHlsZS5hbGlnbj9qKz1kLWNbZV06XCJjZW50ZXJcIj09PXRoaXMuc3R5bGUuYWxpZ24mJihqKz0oZC1jW2VdKS8yKSx0aGlzLnN0eWxlLmZpbGwmJnRoaXMuY29udGV4dC5maWxsVGV4dChiW2VdLGorbCxrK20pfWZvcih0aGlzLmNvbnRleHQuZmlsbFN0eWxlPXRoaXMuc3R5bGUuZmlsbCxlPTA7ZTxiLmxlbmd0aDtlKyspaj10aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzcy8yLGs9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMitlKmgsXCJyaWdodFwiPT09dGhpcy5zdHlsZS5hbGlnbj9qKz1kLWNbZV06XCJjZW50ZXJcIj09PXRoaXMuc3R5bGUuYWxpZ24mJihqKz0oZC1jW2VdKS8yKSx0aGlzLnN0eWxlLnN0cm9rZSYmdGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MmJnRoaXMuY29udGV4dC5zdHJva2VUZXh0KGJbZV0saixrKSx0aGlzLnN0eWxlLmZpbGwmJnRoaXMuY29udGV4dC5maWxsVGV4dChiW2VdLGosayk7dGhpcy51cGRhdGVUZXh0dXJlKCl9LGIuVGV4dC5wcm90b3R5cGUudXBkYXRlVGV4dHVyZT1mdW5jdGlvbigpe3RoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS53aWR0aD10aGlzLmNhbnZhcy53aWR0aCx0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuaGVpZ2h0PXRoaXMuY2FudmFzLmhlaWdodCx0aGlzLnRleHR1cmUuY3JvcC53aWR0aD10aGlzLnRleHR1cmUuZnJhbWUud2lkdGg9dGhpcy5jYW52YXMud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0PXRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0LHRoaXMuX3dpZHRoPXRoaXMuY2FudmFzLndpZHRoLHRoaXMuX2hlaWdodD10aGlzLmNhbnZhcy5oZWlnaHQsdGhpcy5yZXF1aXJlc1VwZGF0ZT0hMH0sYi5UZXh0LnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7dGhpcy5yZXF1aXJlc1VwZGF0ZSYmKHRoaXMucmVxdWlyZXNVcGRhdGU9ITEsYi51cGRhdGVXZWJHTFRleHR1cmUodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLGEuZ2wpKSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMLmNhbGwodGhpcyxhKX0sYi5UZXh0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLmRpcnR5JiYodGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMSksYi5TcHJpdGUucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfSxiLlRleHQucHJvdG90eXBlLmRldGVybWluZUZvbnRIZWlnaHQ9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5UZXh0LmhlaWdodENhY2hlW2FdO2lmKCFjKXt2YXIgZD1kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJvZHlcIilbMF0sZT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLGY9ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJNXCIpO2UuYXBwZW5kQ2hpbGQoZiksZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLGErXCI7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowXCIpLGQuYXBwZW5kQ2hpbGQoZSksYz1lLm9mZnNldEhlaWdodCxiLlRleHQuaGVpZ2h0Q2FjaGVbYV09YyxkLnJlbW92ZUNoaWxkKGUpfXJldHVybiBjfSxiLlRleHQucHJvdG90eXBlLndvcmRXcmFwPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYj1cIlwiLGM9YS5zcGxpdChcIlxcblwiKSxkPTA7ZDxjLmxlbmd0aDtkKyspe2Zvcih2YXIgZT10aGlzLnN0eWxlLndvcmRXcmFwV2lkdGgsZj1jW2RdLnNwbGl0KFwiIFwiKSxnPTA7ZzxmLmxlbmd0aDtnKyspe3ZhciBoPXRoaXMuY29udGV4dC5tZWFzdXJlVGV4dChmW2ddKS53aWR0aCxpPWgrdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KFwiIFwiKS53aWR0aDswPT09Z3x8aT5lPyhnPjAmJihiKz1cIlxcblwiKSxiKz1mW2ddLGU9dGhpcy5zdHlsZS53b3JkV3JhcFdpZHRoLWgpOihlLT1pLGIrPVwiIFwiK2ZbZ10pfWQ8Yy5sZW5ndGgtMSYmKGIrPVwiXFxuXCIpfXJldHVybiBifSxiLlRleHQucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oYSl7dGhpcy5jb250ZXh0PW51bGwsdGhpcy5jYW52YXM9bnVsbCx0aGlzLnRleHR1cmUuZGVzdHJveSh2b2lkIDA9PT1hPyEwOmEpfSxiLlRleHQuaGVpZ2h0Q2FjaGU9e30sYi5CaXRtYXBUZXh0PWZ1bmN0aW9uKGEsYyl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5fcG9vbD1bXSx0aGlzLnNldFRleHQoYSksdGhpcy5zZXRTdHlsZShjKSx0aGlzLnVwZGF0ZVRleHQoKSx0aGlzLmRpcnR5PSExfSxiLkJpdG1hcFRleHQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5CaXRtYXBUZXh0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJpdG1hcFRleHQsYi5CaXRtYXBUZXh0LnByb3RvdHlwZS5zZXRUZXh0PWZ1bmN0aW9uKGEpe3RoaXMudGV4dD1hfHxcIiBcIix0aGlzLmRpcnR5PSEwfSxiLkJpdG1hcFRleHQucHJvdG90eXBlLnNldFN0eWxlPWZ1bmN0aW9uKGEpe2E9YXx8e30sYS5hbGlnbj1hLmFsaWdufHxcImxlZnRcIix0aGlzLnN0eWxlPWE7dmFyIGM9YS5mb250LnNwbGl0KFwiIFwiKTt0aGlzLmZvbnROYW1lPWNbYy5sZW5ndGgtMV0sdGhpcy5mb250U2l6ZT1jLmxlbmd0aD49Mj9wYXJzZUludChjW2MubGVuZ3RoLTJdLDEwKTpiLkJpdG1hcFRleHQuZm9udHNbdGhpcy5mb250TmFtZV0uc2l6ZSx0aGlzLmRpcnR5PSEwLHRoaXMudGludD1hLnRpbnR9LGIuQml0bWFwVGV4dC5wcm90b3R5cGUudXBkYXRlVGV4dD1mdW5jdGlvbigpe2Zvcih2YXIgYT1iLkJpdG1hcFRleHQuZm9udHNbdGhpcy5mb250TmFtZV0sYz1uZXcgYi5Qb2ludCxkPW51bGwsZT1bXSxmPTAsZz1bXSxoPTAsaT10aGlzLmZvbnRTaXplL2Euc2l6ZSxqPTA7ajx0aGlzLnRleHQubGVuZ3RoO2orKyl7dmFyIGs9dGhpcy50ZXh0LmNoYXJDb2RlQXQoaik7aWYoLyg/OlxcclxcbnxcXHJ8XFxuKS8udGVzdCh0aGlzLnRleHQuY2hhckF0KGopKSlnLnB1c2goYy54KSxmPU1hdGgubWF4KGYsYy54KSxoKyssYy54PTAsYy55Kz1hLmxpbmVIZWlnaHQsZD1udWxsO2Vsc2V7dmFyIGw9YS5jaGFyc1trXTtsJiYoZCYmbFtkXSYmKGMueCs9bC5rZXJuaW5nW2RdKSxlLnB1c2goe3RleHR1cmU6bC50ZXh0dXJlLGxpbmU6aCxjaGFyQ29kZTprLHBvc2l0aW9uOm5ldyBiLlBvaW50KGMueCtsLnhPZmZzZXQsYy55K2wueU9mZnNldCl9KSxjLngrPWwueEFkdmFuY2UsZD1rKX19Zy5wdXNoKGMueCksZj1NYXRoLm1heChmLGMueCk7dmFyIG09W107Zm9yKGo9MDtoPj1qO2orKyl7dmFyIG49MDtcInJpZ2h0XCI9PT10aGlzLnN0eWxlLmFsaWduP249Zi1nW2pdOlwiY2VudGVyXCI9PT10aGlzLnN0eWxlLmFsaWduJiYobj0oZi1nW2pdKS8yKSxtLnB1c2gobil9dmFyIG89dGhpcy5jaGlsZHJlbi5sZW5ndGgscD1lLmxlbmd0aCxxPXRoaXMudGludHx8MTY3NzcyMTU7Zm9yKGo9MDtwPmo7aisrKXt2YXIgcj1vPmo/dGhpcy5jaGlsZHJlbltqXTp0aGlzLl9wb29sLnBvcCgpO3I/ci5zZXRUZXh0dXJlKGVbal0udGV4dHVyZSk6cj1uZXcgYi5TcHJpdGUoZVtqXS50ZXh0dXJlKSxyLnBvc2l0aW9uLng9KGVbal0ucG9zaXRpb24ueCttW2Vbal0ubGluZV0pKmksci5wb3NpdGlvbi55PWVbal0ucG9zaXRpb24ueSppLHIuc2NhbGUueD1yLnNjYWxlLnk9aSxyLnRpbnQ9cSxyLnBhcmVudHx8dGhpcy5hZGRDaGlsZChyKX1mb3IoO3RoaXMuY2hpbGRyZW4ubGVuZ3RoPnA7KXt2YXIgcz10aGlzLmdldENoaWxkQXQodGhpcy5jaGlsZHJlbi5sZW5ndGgtMSk7dGhpcy5fcG9vbC5wdXNoKHMpLHRoaXMucmVtb3ZlQ2hpbGQocyl9dGhpcy50ZXh0V2lkdGg9ZippLHRoaXMudGV4dEhlaWdodD0oYy55K2EubGluZUhlaWdodCkqaX0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLmRpcnR5JiYodGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMSksYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX0sYi5CaXRtYXBUZXh0LmZvbnRzPXt9LGIuSW50ZXJhY3Rpb25EYXRhPWZ1bmN0aW9uKCl7dGhpcy5nbG9iYWw9bmV3IGIuUG9pbnQsdGhpcy50YXJnZXQ9bnVsbCx0aGlzLm9yaWdpbmFsRXZlbnQ9bnVsbH0sYi5JbnRlcmFjdGlvbkRhdGEucHJvdG90eXBlLmdldExvY2FsUG9zaXRpb249ZnVuY3Rpb24oYSl7dmFyIGM9YS53b3JsZFRyYW5zZm9ybSxkPXRoaXMuZ2xvYmFsLGU9Yy5hLGY9Yy5iLGc9Yy50eCxoPWMuYyxpPWMuZCxqPWMudHksaz0xLyhlKmkrZiotaCk7cmV0dXJuIG5ldyBiLlBvaW50KGkqaypkLngrLWYqaypkLnkrKGoqZi1nKmkpKmssZSprKmQueSstaCprKmQueCsoLWoqZStnKmgpKmspfSxiLkludGVyYWN0aW9uRGF0YS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5JbnRlcmFjdGlvbkRhdGEsYi5JbnRlcmFjdGlvbk1hbmFnZXI9ZnVuY3Rpb24oYSl7dGhpcy5zdGFnZT1hLHRoaXMubW91c2U9bmV3IGIuSW50ZXJhY3Rpb25EYXRhLHRoaXMudG91Y2hzPXt9LHRoaXMudGVtcFBvaW50PW5ldyBiLlBvaW50LHRoaXMubW91c2VvdmVyRW5hYmxlZD0hMCx0aGlzLnBvb2w9W10sdGhpcy5pbnRlcmFjdGl2ZUl0ZW1zPVtdLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50PW51bGwsdGhpcy5vbk1vdXNlTW92ZT10aGlzLm9uTW91c2VNb3ZlLmJpbmQodGhpcyksdGhpcy5vbk1vdXNlRG93bj10aGlzLm9uTW91c2VEb3duLmJpbmQodGhpcyksdGhpcy5vbk1vdXNlT3V0PXRoaXMub25Nb3VzZU91dC5iaW5kKHRoaXMpLHRoaXMub25Nb3VzZVVwPXRoaXMub25Nb3VzZVVwLmJpbmQodGhpcyksdGhpcy5vblRvdWNoU3RhcnQ9dGhpcy5vblRvdWNoU3RhcnQuYmluZCh0aGlzKSx0aGlzLm9uVG91Y2hFbmQ9dGhpcy5vblRvdWNoRW5kLmJpbmQodGhpcyksdGhpcy5vblRvdWNoTW92ZT10aGlzLm9uVG91Y2hNb3ZlLmJpbmQodGhpcyksdGhpcy5sYXN0PTAsdGhpcy5jdXJyZW50Q3Vyc29yU3R5bGU9XCJpbmhlcml0XCIsdGhpcy5tb3VzZU91dD0hMX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW50ZXJhY3Rpb25NYW5hZ2VyLGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5jb2xsZWN0SW50ZXJhY3RpdmVTcHJpdGU9ZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9YS5jaGlsZHJlbixkPWMubGVuZ3RoLGU9ZC0xO2U+PTA7ZS0tKXt2YXIgZj1jW2VdO2YuX2ludGVyYWN0aXZlPyhiLmludGVyYWN0aXZlQ2hpbGRyZW49ITAsdGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLnB1c2goZiksZi5jaGlsZHJlbi5sZW5ndGg+MCYmdGhpcy5jb2xsZWN0SW50ZXJhY3RpdmVTcHJpdGUoZixmKSk6KGYuX19pUGFyZW50PW51bGwsZi5jaGlsZHJlbi5sZW5ndGg+MCYmdGhpcy5jb2xsZWN0SW50ZXJhY3RpdmVTcHJpdGUoZixiKSl9fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuc2V0VGFyZ2V0PWZ1bmN0aW9uKGEpe3RoaXMudGFyZ2V0PWEsbnVsbD09PXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50JiZ0aGlzLnNldFRhcmdldERvbUVsZW1lbnQoYS52aWV3KX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnNldFRhcmdldERvbUVsZW1lbnQ9ZnVuY3Rpb24oYSl7dGhpcy5yZW1vdmVFdmVudHMoKSx3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQmJihhLnN0eWxlW1wiLW1zLWNvbnRlbnQtem9vbWluZ1wiXT1cIm5vbmVcIixhLnN0eWxlW1wiLW1zLXRvdWNoLWFjdGlvblwiXT1cIm5vbmVcIiksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQ9YSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIix0aGlzLm9uTW91c2VNb3ZlLCEwKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLm9uTW91c2VEb3duLCEwKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLHRoaXMub25Nb3VzZU91dCwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLHRoaXMub25Ub3VjaFN0YXJ0LCEwKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLHRoaXMub25Ub3VjaEVuZCwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsdGhpcy5vblRvdWNoTW92ZSwhMCksd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsdGhpcy5vbk1vdXNlVXAsITApfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRzPWZ1bmN0aW9uKCl7dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQmJih0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5zdHlsZVtcIi1tcy1jb250ZW50LXpvb21pbmdcIl09XCJcIix0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5zdHlsZVtcIi1tcy10b3VjaC1hY3Rpb25cIl09XCJcIix0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsdGhpcy5vbk1vdXNlTW92ZSwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLHRoaXMub25Nb3VzZURvd24sITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLHRoaXMub25Nb3VzZU91dCwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIix0aGlzLm9uVG91Y2hTdGFydCwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsdGhpcy5vblRvdWNoRW5kLCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsdGhpcy5vblRvdWNoTW92ZSwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQ9bnVsbCx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIix0aGlzLm9uTW91c2VVcCwhMCkpfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKCl7aWYodGhpcy50YXJnZXQpe3ZhciBhPURhdGUubm93KCksYz1hLXRoaXMubGFzdDtpZihjPWMqYi5JTlRFUkFDVElPTl9GUkVRVUVOQ1kvMWUzLCEoMT5jKSl7dGhpcy5sYXN0PWE7dmFyIGQ9MDt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxmPVwiaW5oZXJpdFwiLGc9ITE7Zm9yKGQ9MDtlPmQ7ZCsrKXt2YXIgaD10aGlzLmludGVyYWN0aXZlSXRlbXNbZF07aC5fX2hpdD10aGlzLmhpdFRlc3QoaCx0aGlzLm1vdXNlKSx0aGlzLm1vdXNlLnRhcmdldD1oLGguX19oaXQmJiFnPyhoLmJ1dHRvbk1vZGUmJihmPWguZGVmYXVsdEN1cnNvciksaC5pbnRlcmFjdGl2ZUNoaWxkcmVufHwoZz0hMCksaC5fX2lzT3Zlcnx8KGgubW91c2VvdmVyJiZoLm1vdXNlb3Zlcih0aGlzLm1vdXNlKSxoLl9faXNPdmVyPSEwKSk6aC5fX2lzT3ZlciYmKGgubW91c2VvdXQmJmgubW91c2VvdXQodGhpcy5tb3VzZSksaC5fX2lzT3Zlcj0hMSl9dGhpcy5jdXJyZW50Q3Vyc29yU3R5bGUhPT1mJiYodGhpcy5jdXJyZW50Q3Vyc29yU3R5bGU9Zix0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5zdHlsZS5jdXJzb3I9Zil9fX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoPWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eT0hMTtmb3IodmFyIGE9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxiPTA7YT5iO2IrKyl0aGlzLmludGVyYWN0aXZlSXRlbXNbYl0uaW50ZXJhY3RpdmVDaGlsZHJlbj0hMTt0aGlzLmludGVyYWN0aXZlSXRlbXM9W10sdGhpcy5zdGFnZS5pbnRlcmFjdGl2ZSYmdGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLnB1c2godGhpcy5zdGFnZSksdGhpcy5jb2xsZWN0SW50ZXJhY3RpdmVTcHJpdGUodGhpcy5zdGFnZSx0aGlzLnN0YWdlKX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uTW91c2VNb3ZlPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKSx0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50O3ZhciBiPXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO3RoaXMubW91c2UuZ2xvYmFsLng9KGEuY2xpZW50WC1iLmxlZnQpKih0aGlzLnRhcmdldC53aWR0aC9iLndpZHRoKSx0aGlzLm1vdXNlLmdsb2JhbC55PShhLmNsaWVudFktYi50b3ApKih0aGlzLnRhcmdldC5oZWlnaHQvYi5oZWlnaHQpO2Zvcih2YXIgYz10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGQ9MDtjPmQ7ZCsrKXt2YXIgZT10aGlzLmludGVyYWN0aXZlSXRlbXNbZF07ZS5tb3VzZW1vdmUmJmUubW91c2Vtb3ZlKHRoaXMubW91c2UpfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uTW91c2VEb3duPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKSx0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50LGIuQVVUT19QUkVWRU5UX0RFRkFVTFQmJnRoaXMubW91c2Uub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO2Zvcih2YXIgYz10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGQ9MDtjPmQ7ZCsrKXt2YXIgZT10aGlzLmludGVyYWN0aXZlSXRlbXNbZF07aWYoKGUubW91c2Vkb3dufHxlLmNsaWNrKSYmKGUuX19tb3VzZUlzRG93bj0hMCxlLl9faGl0PXRoaXMuaGl0VGVzdChlLHRoaXMubW91c2UpLGUuX19oaXQmJihlLm1vdXNlZG93biYmZS5tb3VzZWRvd24odGhpcy5tb3VzZSksZS5fX2lzRG93bj0hMCwhZS5pbnRlcmFjdGl2ZUNoaWxkcmVuKSkpYnJlYWt9fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Nb3VzZU91dD1mdW5jdGlvbigpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKTt2YXIgYT10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoO3RoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnN0eWxlLmN1cnNvcj1cImluaGVyaXRcIjtmb3IodmFyIGI9MDthPmI7YisrKXt2YXIgYz10aGlzLmludGVyYWN0aXZlSXRlbXNbYl07Yy5fX2lzT3ZlciYmKHRoaXMubW91c2UudGFyZ2V0PWMsYy5tb3VzZW91dCYmYy5tb3VzZW91dCh0aGlzLm1vdXNlKSxjLl9faXNPdmVyPSExKX10aGlzLm1vdXNlT3V0PSEwLHRoaXMubW91c2UuZ2xvYmFsLng9LTFlNCx0aGlzLm1vdXNlLmdsb2JhbC55PS0xZTR9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlVXA9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpLHRoaXMubW91c2Uub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQ7XHJcbmZvcih2YXIgYj10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGM9ITEsZD0wO2I+ZDtkKyspe3ZhciBlPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tkXTtlLl9faGl0PXRoaXMuaGl0VGVzdChlLHRoaXMubW91c2UpLGUuX19oaXQmJiFjPyhlLm1vdXNldXAmJmUubW91c2V1cCh0aGlzLm1vdXNlKSxlLl9faXNEb3duJiZlLmNsaWNrJiZlLmNsaWNrKHRoaXMubW91c2UpLGUuaW50ZXJhY3RpdmVDaGlsZHJlbnx8KGM9ITApKTplLl9faXNEb3duJiZlLm1vdXNldXBvdXRzaWRlJiZlLm1vdXNldXBvdXRzaWRlKHRoaXMubW91c2UpLGUuX19pc0Rvd249ITF9fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuaGl0VGVzdD1mdW5jdGlvbihhLGMpe3ZhciBkPWMuZ2xvYmFsO2lmKCFhLndvcmxkVmlzaWJsZSlyZXR1cm4hMTt2YXIgZT1hIGluc3RhbmNlb2YgYi5TcHJpdGUsZj1hLndvcmxkVHJhbnNmb3JtLGc9Zi5hLGg9Zi5iLGk9Zi50eCxqPWYuYyxrPWYuZCxsPWYudHksbT0xLyhnKmsraCotaiksbj1rKm0qZC54Ky1oKm0qZC55KyhsKmgtaSprKSptLG89ZyptKmQueSstaiptKmQueCsoLWwqZytpKmopKm07aWYoYy50YXJnZXQ9YSxhLmhpdEFyZWEmJmEuaGl0QXJlYS5jb250YWlucylyZXR1cm4gYS5oaXRBcmVhLmNvbnRhaW5zKG4sbyk/KGMudGFyZ2V0PWEsITApOiExO2lmKGUpe3ZhciBwLHE9YS50ZXh0dXJlLmZyYW1lLndpZHRoLHI9YS50ZXh0dXJlLmZyYW1lLmhlaWdodCxzPS1xKmEuYW5jaG9yLng7aWYobj5zJiZzK3E+biYmKHA9LXIqYS5hbmNob3IueSxvPnAmJnArcj5vKSlyZXR1cm4gYy50YXJnZXQ9YSwhMH1mb3IodmFyIHQ9YS5jaGlsZHJlbi5sZW5ndGgsdT0wO3Q+dTt1Kyspe3ZhciB2PWEuY2hpbGRyZW5bdV0sdz10aGlzLmhpdFRlc3QodixjKTtpZih3KXJldHVybiBjLnRhcmdldD1hLCEwfXJldHVybiExfSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Ub3VjaE1vdmU9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBiLGM9dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksZD1hLmNoYW5nZWRUb3VjaGVzLGU9MDtmb3IoZT0wO2U8ZC5sZW5ndGg7ZSsrKXt2YXIgZj1kW2VdO2I9dGhpcy50b3VjaHNbZi5pZGVudGlmaWVyXSxiLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50LGIuZ2xvYmFsLng9KGYuY2xpZW50WC1jLmxlZnQpKih0aGlzLnRhcmdldC53aWR0aC9jLndpZHRoKSxiLmdsb2JhbC55PShmLmNsaWVudFktYy50b3ApKih0aGlzLnRhcmdldC5oZWlnaHQvYy5oZWlnaHQpLG5hdmlnYXRvci5pc0NvY29vbkpTJiYoYi5nbG9iYWwueD1mLmNsaWVudFgsYi5nbG9iYWwueT1mLmNsaWVudFkpO2Zvcih2YXIgZz0wO2c8dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aDtnKyspe3ZhciBoPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tnXTtoLnRvdWNobW92ZSYmaC5fX3RvdWNoRGF0YSYmaC5fX3RvdWNoRGF0YVtmLmlkZW50aWZpZXJdJiZoLnRvdWNobW92ZShiKX19fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Ub3VjaFN0YXJ0PWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKTt2YXIgYz10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtiLkFVVE9fUFJFVkVOVF9ERUZBVUxUJiZhLnByZXZlbnREZWZhdWx0KCk7Zm9yKHZhciBkPWEuY2hhbmdlZFRvdWNoZXMsZT0wO2U8ZC5sZW5ndGg7ZSsrKXt2YXIgZj1kW2VdLGc9dGhpcy5wb29sLnBvcCgpO2d8fChnPW5ldyBiLkludGVyYWN0aW9uRGF0YSksZy5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudCx0aGlzLnRvdWNoc1tmLmlkZW50aWZpZXJdPWcsZy5nbG9iYWwueD0oZi5jbGllbnRYLWMubGVmdCkqKHRoaXMudGFyZ2V0LndpZHRoL2Mud2lkdGgpLGcuZ2xvYmFsLnk9KGYuY2xpZW50WS1jLnRvcCkqKHRoaXMudGFyZ2V0LmhlaWdodC9jLmhlaWdodCksbmF2aWdhdG9yLmlzQ29jb29uSlMmJihnLmdsb2JhbC54PWYuY2xpZW50WCxnLmdsb2JhbC55PWYuY2xpZW50WSk7Zm9yKHZhciBoPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsaT0wO2g+aTtpKyspe3ZhciBqPXRoaXMuaW50ZXJhY3RpdmVJdGVtc1tpXTtpZigoai50b3VjaHN0YXJ0fHxqLnRhcCkmJihqLl9faGl0PXRoaXMuaGl0VGVzdChqLGcpLGouX19oaXQmJihqLnRvdWNoc3RhcnQmJmoudG91Y2hzdGFydChnKSxqLl9faXNEb3duPSEwLGouX190b3VjaERhdGE9ai5fX3RvdWNoRGF0YXx8e30sai5fX3RvdWNoRGF0YVtmLmlkZW50aWZpZXJdPWcsIWouaW50ZXJhY3RpdmVDaGlsZHJlbikpKWJyZWFrfX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vblRvdWNoRW5kPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKTtmb3IodmFyIGI9dGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksYz1hLmNoYW5nZWRUb3VjaGVzLGQ9MDtkPGMubGVuZ3RoO2QrKyl7dmFyIGU9Y1tkXSxmPXRoaXMudG91Y2hzW2UuaWRlbnRpZmllcl0sZz0hMTtmLmdsb2JhbC54PShlLmNsaWVudFgtYi5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYi53aWR0aCksZi5nbG9iYWwueT0oZS5jbGllbnRZLWIudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2IuaGVpZ2h0KSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmKGYuZ2xvYmFsLng9ZS5jbGllbnRYLGYuZ2xvYmFsLnk9ZS5jbGllbnRZKTtmb3IodmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxpPTA7aD5pO2krKyl7dmFyIGo9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2ldO2ouX190b3VjaERhdGEmJmouX190b3VjaERhdGFbZS5pZGVudGlmaWVyXSYmKGouX19oaXQ9dGhpcy5oaXRUZXN0KGosai5fX3RvdWNoRGF0YVtlLmlkZW50aWZpZXJdKSxmLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50LChqLnRvdWNoZW5kfHxqLnRhcCkmJihqLl9faGl0JiYhZz8oai50b3VjaGVuZCYmai50b3VjaGVuZChmKSxqLl9faXNEb3duJiZqLnRhcCYmai50YXAoZiksai5pbnRlcmFjdGl2ZUNoaWxkcmVufHwoZz0hMCkpOmouX19pc0Rvd24mJmoudG91Y2hlbmRvdXRzaWRlJiZqLnRvdWNoZW5kb3V0c2lkZShmKSxqLl9faXNEb3duPSExKSxqLl9fdG91Y2hEYXRhW2UuaWRlbnRpZmllcl09bnVsbCl9dGhpcy5wb29sLnB1c2goZiksdGhpcy50b3VjaHNbZS5pZGVudGlmaWVyXT1udWxsfX0sYi5TdGFnZT1mdW5jdGlvbihhKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLndvcmxkVHJhbnNmb3JtPW5ldyBiLk1hdHJpeCx0aGlzLmludGVyYWN0aXZlPSEwLHRoaXMuaW50ZXJhY3Rpb25NYW5hZ2VyPW5ldyBiLkludGVyYWN0aW9uTWFuYWdlcih0aGlzKSx0aGlzLmRpcnR5PSEwLHRoaXMuc3RhZ2U9dGhpcyx0aGlzLnN0YWdlLmhpdEFyZWE9bmV3IGIuUmVjdGFuZ2xlKDAsMCwxZTUsMWU1KSx0aGlzLnNldEJhY2tncm91bmRDb2xvcihhKX0sYi5TdGFnZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlN0YWdlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlN0YWdlLGIuU3RhZ2UucHJvdG90eXBlLnNldEludGVyYWN0aW9uRGVsZWdhdGU9ZnVuY3Rpb24oYSl7dGhpcy5pbnRlcmFjdGlvbk1hbmFnZXIuc2V0VGFyZ2V0RG9tRWxlbWVudChhKX0sYi5TdGFnZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy53b3JsZEFscGhhPTE7Zm9yKHZhciBhPTAsYj10aGlzLmNoaWxkcmVuLmxlbmd0aDtiPmE7YSsrKXRoaXMuY2hpbGRyZW5bYV0udXBkYXRlVHJhbnNmb3JtKCk7dGhpcy5kaXJ0eSYmKHRoaXMuZGlydHk9ITEsdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXIuZGlydHk9ITApLHRoaXMuaW50ZXJhY3RpdmUmJnRoaXMuaW50ZXJhY3Rpb25NYW5hZ2VyLnVwZGF0ZSgpfSxiLlN0YWdlLnByb3RvdHlwZS5zZXRCYWNrZ3JvdW5kQ29sb3I9ZnVuY3Rpb24oYSl7dGhpcy5iYWNrZ3JvdW5kQ29sb3I9YXx8MCx0aGlzLmJhY2tncm91bmRDb2xvclNwbGl0PWIuaGV4MnJnYih0aGlzLmJhY2tncm91bmRDb2xvcik7dmFyIGM9dGhpcy5iYWNrZ3JvdW5kQ29sb3IudG9TdHJpbmcoMTYpO2M9XCIwMDAwMDBcIi5zdWJzdHIoMCw2LWMubGVuZ3RoKStjLHRoaXMuYmFja2dyb3VuZENvbG9yU3RyaW5nPVwiI1wiK2N9LGIuU3RhZ2UucHJvdG90eXBlLmdldE1vdXNlUG9zaXRpb249ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXIubW91c2UuZ2xvYmFsfTtmb3IodmFyIGM9MCxkPVtcIm1zXCIsXCJtb3pcIixcIndlYmtpdFwiLFwib1wiXSxlPTA7ZTxkLmxlbmd0aCYmIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7KytlKXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU9d2luZG93W2RbZV0rXCJSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcIl0sd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lPXdpbmRvd1tkW2VdK1wiQ2FuY2VsQW5pbWF0aW9uRnJhbWVcIl18fHdpbmRvd1tkW2VdK1wiQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lXCJdO3dpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWV8fCh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lPWZ1bmN0aW9uKGEpe3ZhciBiPShuZXcgRGF0ZSkuZ2V0VGltZSgpLGQ9TWF0aC5tYXgoMCwxNi0oYi1jKSksZT13aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpe2EoYitkKX0sZCk7cmV0dXJuIGM9YitkLGV9KSx3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWV8fCh3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU9ZnVuY3Rpb24oYSl7Y2xlYXJUaW1lb3V0KGEpfSksd2luZG93LnJlcXVlc3RBbmltRnJhbWU9d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSxiLmhleDJyZ2I9ZnVuY3Rpb24oYSl7cmV0dXJuWyhhPj4xNiYyNTUpLzI1NSwoYT4+OCYyNTUpLzI1NSwoMjU1JmEpLzI1NV19LGIucmdiMmhleD1mdW5jdGlvbihhKXtyZXR1cm4oMjU1KmFbMF08PDE2KSsoMjU1KmFbMV08PDgpKzI1NSphWzJdfSxcImZ1bmN0aW9uXCIhPXR5cGVvZiBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCYmKEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kPWZ1bmN0aW9uKCl7dmFyIGE9QXJyYXkucHJvdG90eXBlLnNsaWNlO3JldHVybiBmdW5jdGlvbihiKXtmdW5jdGlvbiBjKCl7dmFyIGY9ZS5jb25jYXQoYS5jYWxsKGFyZ3VtZW50cykpO2QuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGM/dGhpczpiLGYpfXZhciBkPXRoaXMsZT1hLmNhbGwoYXJndW1lbnRzLDEpO2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGQpdGhyb3cgbmV3IFR5cGVFcnJvcjtyZXR1cm4gYy5wcm90b3R5cGU9ZnVuY3Rpb24gZihhKXtyZXR1cm4gYSYmKGYucHJvdG90eXBlPWEpLHRoaXMgaW5zdGFuY2VvZiBmP3ZvaWQgMDpuZXcgZn0oZC5wcm90b3R5cGUpLGN9fSgpKSxiLkFqYXhSZXF1ZXN0PWZ1bmN0aW9uKCl7dmFyIGE9W1wiTXN4bWwyLlhNTEhUVFAuNi4wXCIsXCJNc3htbDIuWE1MSFRUUC4zLjBcIixcIk1pY3Jvc29mdC5YTUxIVFRQXCJdO2lmKCF3aW5kb3cuQWN0aXZlWE9iamVjdClyZXR1cm4gd2luZG93LlhNTEh0dHBSZXF1ZXN0P25ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q6ITE7Zm9yKHZhciBiPTA7YjxhLmxlbmd0aDtiKyspdHJ5e3JldHVybiBuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoYVtiXSl9Y2F0Y2goYyl7fX0sYi5jYW5Vc2VOZXdDYW52YXNCbGVuZE1vZGVzPWZ1bmN0aW9uKCl7dmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTthLndpZHRoPTEsYS5oZWlnaHQ9MTt2YXIgYj1hLmdldENvbnRleHQoXCIyZFwiKTtyZXR1cm4gYi5maWxsU3R5bGU9XCIjMDAwXCIsYi5maWxsUmVjdCgwLDAsMSwxKSxiLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cIm11bHRpcGx5XCIsYi5maWxsU3R5bGU9XCIjZmZmXCIsYi5maWxsUmVjdCgwLDAsMSwxKSwwPT09Yi5nZXRJbWFnZURhdGEoMCwwLDEsMSkuZGF0YVswXX0sYi5nZXROZXh0UG93ZXJPZlR3bz1mdW5jdGlvbihhKXtpZihhPjAmJjA9PT0oYSZhLTEpKXJldHVybiBhO2Zvcih2YXIgYj0xO2E+YjspYjw8PTE7cmV0dXJuIGJ9LGIuRXZlbnRUYXJnZXQ9ZnVuY3Rpb24oKXt2YXIgYT17fTt0aGlzLmFkZEV2ZW50TGlzdGVuZXI9dGhpcy5vbj1mdW5jdGlvbihiLGMpe3ZvaWQgMD09PWFbYl0mJihhW2JdPVtdKSwtMT09PWFbYl0uaW5kZXhPZihjKSYmYVtiXS51bnNoaWZ0KGMpfSx0aGlzLmRpc3BhdGNoRXZlbnQ9dGhpcy5lbWl0PWZ1bmN0aW9uKGIpe2lmKGFbYi50eXBlXSYmYVtiLnR5cGVdLmxlbmd0aClmb3IodmFyIGM9YVtiLnR5cGVdLmxlbmd0aC0xO2M+PTA7Yy0tKWFbYi50eXBlXVtjXShiKX0sdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyPXRoaXMub2ZmPWZ1bmN0aW9uKGIsYyl7aWYodm9pZCAwIT09YVtiXSl7dmFyIGQ9YVtiXS5pbmRleE9mKGMpOy0xIT09ZCYmYVtiXS5zcGxpY2UoZCwxKX19LHRoaXMucmVtb3ZlQWxsRXZlbnRMaXN0ZW5lcnM9ZnVuY3Rpb24oYil7dmFyIGM9YVtiXTtjJiYoYy5sZW5ndGg9MCl9fSxiLmF1dG9EZXRlY3RSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlLGYpe2F8fChhPTgwMCksY3x8KGM9NjAwKTt2YXIgZz1mdW5jdGlvbigpe3RyeXt2YXIgYT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO3JldHVybiEhd2luZG93LldlYkdMUmVuZGVyaW5nQ29udGV4dCYmKGEuZ2V0Q29udGV4dChcIndlYmdsXCIpfHxhLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIikpfWNhdGNoKGIpe3JldHVybiExfX0oKTtyZXR1cm4gZz9uZXcgYi5XZWJHTFJlbmRlcmVyKGEsYyxkLGUsZik6bmV3IGIuQ2FudmFzUmVuZGVyZXIoYSxjLGQsZSl9LGIuYXV0b0RldGVjdFJlY29tbWVuZGVkUmVuZGVyZXI9ZnVuY3Rpb24oYSxjLGQsZSxmKXthfHwoYT04MDApLGN8fChjPTYwMCk7dmFyIGc9ZnVuY3Rpb24oKXt0cnl7dmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtyZXR1cm4hIXdpbmRvdy5XZWJHTFJlbmRlcmluZ0NvbnRleHQmJihhLmdldENvbnRleHQoXCJ3ZWJnbFwiKXx8YS5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIpKX1jYXRjaChiKXtyZXR1cm4hMX19KCksaD0vQW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7cmV0dXJuIGcmJiFoP25ldyBiLldlYkdMUmVuZGVyZXIoYSxjLGQsZSxmKTpuZXcgYi5DYW52YXNSZW5kZXJlcihhLGMsZCxlKX0sYi5Qb2x5Sz17fSxiLlBvbHlLLlRyaWFuZ3VsYXRlPWZ1bmN0aW9uKGEpe3ZhciBjPSEwLGQ9YS5sZW5ndGg+PjE7aWYoMz5kKXJldHVybltdO2Zvcih2YXIgZT1bXSxmPVtdLGc9MDtkPmc7ZysrKWYucHVzaChnKTtnPTA7Zm9yKHZhciBoPWQ7aD4zOyl7dmFyIGk9ZlsoZyswKSVoXSxqPWZbKGcrMSklaF0saz1mWyhnKzIpJWhdLGw9YVsyKmldLG09YVsyKmkrMV0sbj1hWzIqal0sbz1hWzIqaisxXSxwPWFbMiprXSxxPWFbMiprKzFdLHI9ITE7aWYoYi5Qb2x5Sy5fY29udmV4KGwsbSxuLG8scCxxLGMpKXtyPSEwO2Zvcih2YXIgcz0wO2g+cztzKyspe3ZhciB0PWZbc107aWYodCE9PWkmJnQhPT1qJiZ0IT09ayYmYi5Qb2x5Sy5fUG9pbnRJblRyaWFuZ2xlKGFbMip0XSxhWzIqdCsxXSxsLG0sbixvLHAscSkpe3I9ITE7YnJlYWt9fX1pZihyKWUucHVzaChpLGosayksZi5zcGxpY2UoKGcrMSklaCwxKSxoLS0sZz0wO2Vsc2UgaWYoZysrPjMqaCl7aWYoIWMpcmV0dXJuIHdpbmRvdy5jb25zb2xlLmxvZyhcIlBJWEkgV2FybmluZzogc2hhcGUgdG9vIGNvbXBsZXggdG8gZmlsbFwiKSxbXTtmb3IoZT1bXSxmPVtdLGc9MDtkPmc7ZysrKWYucHVzaChnKTtnPTAsaD1kLGM9ITF9fXJldHVybiBlLnB1c2goZlswXSxmWzFdLGZbMl0pLGV9LGIuUG9seUsuX1BvaW50SW5UcmlhbmdsZT1mdW5jdGlvbihhLGIsYyxkLGUsZixnLGgpe3ZhciBpPWctYyxqPWgtZCxrPWUtYyxsPWYtZCxtPWEtYyxuPWItZCxvPWkqaStqKmoscD1pKmsraipsLHE9aSptK2oqbixyPWsqaytsKmwscz1rKm0rbCpuLHQ9MS8obypyLXAqcCksdT0ocipxLXAqcykqdCx2PShvKnMtcCpxKSp0O3JldHVybiB1Pj0wJiZ2Pj0wJiYxPnUrdn0sYi5Qb2x5Sy5fY29udmV4PWZ1bmN0aW9uKGEsYixjLGQsZSxmLGcpe3JldHVybihiLWQpKihlLWMpKyhjLWEpKihmLWQpPj0wPT09Z30sYi5pbml0RGVmYXVsdFNoYWRlcnM9ZnVuY3Rpb24oKXt9LGIuQ29tcGlsZVZlcnRleFNoYWRlcj1mdW5jdGlvbihhLGMpe3JldHVybiBiLl9Db21waWxlU2hhZGVyKGEsYyxhLlZFUlRFWF9TSEFERVIpfSxiLkNvbXBpbGVGcmFnbWVudFNoYWRlcj1mdW5jdGlvbihhLGMpe3JldHVybiBiLl9Db21waWxlU2hhZGVyKGEsYyxhLkZSQUdNRU5UX1NIQURFUil9LGIuX0NvbXBpbGVTaGFkZXI9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWIuam9pbihcIlxcblwiKSxlPWEuY3JlYXRlU2hhZGVyKGMpO3JldHVybiBhLnNoYWRlclNvdXJjZShlLGQpLGEuY29tcGlsZVNoYWRlcihlKSxhLmdldFNoYWRlclBhcmFtZXRlcihlLGEuQ09NUElMRV9TVEFUVVMpP2U6KHdpbmRvdy5jb25zb2xlLmxvZyhhLmdldFNoYWRlckluZm9Mb2coZSkpLG51bGwpfSxiLmNvbXBpbGVQcm9ncmFtPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1iLkNvbXBpbGVGcmFnbWVudFNoYWRlcihhLGQpLGY9Yi5Db21waWxlVmVydGV4U2hhZGVyKGEsYyksZz1hLmNyZWF0ZVByb2dyYW0oKTtyZXR1cm4gYS5hdHRhY2hTaGFkZXIoZyxmKSxhLmF0dGFjaFNoYWRlcihnLGUpLGEubGlua1Byb2dyYW0oZyksYS5nZXRQcm9ncmFtUGFyYW1ldGVyKGcsYS5MSU5LX1NUQVRVUyl8fHdpbmRvdy5jb25zb2xlLmxvZyhcIkNvdWxkIG5vdCBpbml0aWFsaXNlIHNoYWRlcnNcIiksZ30sYi5QaXhpU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbG93cCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCkgKiB2Q29sb3IgO1wiLFwifVwiXSx0aGlzLnRleHR1cmVDb3VudD0wLHRoaXMuYXR0cmlidXRlcz1bXSx0aGlzLmluaXQoKX0sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPWIuY29tcGlsZVByb2dyYW0oYSx0aGlzLnZlcnRleFNyY3x8Yi5QaXhpU2hhZGVyLmRlZmF1bHRWZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMudVNhbXBsZXI9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInVTYW1wbGVyXCIpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMuZGltZW5zaW9ucz1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiZGltZW5zaW9uc1wiKSx0aGlzLmFWZXJ0ZXhQb3NpdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVmVydGV4UG9zaXRpb25cIiksdGhpcy5hVGV4dHVyZUNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFUZXh0dXJlQ29vcmRcIiksdGhpcy5jb2xvckF0dHJpYnV0ZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhQ29sb3JcIiksLTE9PT10aGlzLmNvbG9yQXR0cmlidXRlJiYodGhpcy5jb2xvckF0dHJpYnV0ZT0yKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuYVRleHR1cmVDb29yZCx0aGlzLmNvbG9yQXR0cmlidXRlXTtmb3IodmFyIGQgaW4gdGhpcy51bmlmb3Jtcyl0aGlzLnVuaWZvcm1zW2RdLnVuaWZvcm1Mb2NhdGlvbj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLGQpO3RoaXMuaW5pdFVuaWZvcm1zKCksdGhpcy5wcm9ncmFtPWN9LGIuUGl4aVNoYWRlci5wcm90b3R5cGUuaW5pdFVuaWZvcm1zPWZ1bmN0aW9uKCl7dGhpcy50ZXh0dXJlQ291bnQ9MTt2YXIgYSxiPXRoaXMuZ2w7Zm9yKHZhciBjIGluIHRoaXMudW5pZm9ybXMpe2E9dGhpcy51bmlmb3Jtc1tjXTt2YXIgZD1hLnR5cGU7XCJzYW1wbGVyMkRcIj09PWQ/KGEuX2luaXQ9ITEsbnVsbCE9PWEudmFsdWUmJnRoaXMuaW5pdFNhbXBsZXIyRChhKSk6XCJtYXQyXCI9PT1kfHxcIm1hdDNcIj09PWR8fFwibWF0NFwiPT09ZD8oYS5nbE1hdHJpeD0hMCxhLmdsVmFsdWVMZW5ndGg9MSxcIm1hdDJcIj09PWQ/YS5nbEZ1bmM9Yi51bmlmb3JtTWF0cml4MmZ2OlwibWF0M1wiPT09ZD9hLmdsRnVuYz1iLnVuaWZvcm1NYXRyaXgzZnY6XCJtYXQ0XCI9PT1kJiYoYS5nbEZ1bmM9Yi51bmlmb3JtTWF0cml4NGZ2KSk6KGEuZ2xGdW5jPWJbXCJ1bmlmb3JtXCIrZF0sYS5nbFZhbHVlTGVuZ3RoPVwiMmZcIj09PWR8fFwiMmlcIj09PWQ/MjpcIjNmXCI9PT1kfHxcIjNpXCI9PT1kPzM6XCI0ZlwiPT09ZHx8XCI0aVwiPT09ZD80OjEpfX0sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5pbml0U2FtcGxlcjJEPWZ1bmN0aW9uKGEpe2lmKGEudmFsdWUmJmEudmFsdWUuYmFzZVRleHR1cmUmJmEudmFsdWUuYmFzZVRleHR1cmUuaGFzTG9hZGVkKXt2YXIgYj10aGlzLmdsO2lmKGIuYWN0aXZlVGV4dHVyZShiW1wiVEVYVFVSRVwiK3RoaXMudGV4dHVyZUNvdW50XSksYi5iaW5kVGV4dHVyZShiLlRFWFRVUkVfMkQsYS52YWx1ZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tiLmlkXSksYS50ZXh0dXJlRGF0YSl7dmFyIGM9YS50ZXh0dXJlRGF0YSxkPWMubWFnRmlsdGVyP2MubWFnRmlsdGVyOmIuTElORUFSLGU9Yy5taW5GaWx0ZXI/Yy5taW5GaWx0ZXI6Yi5MSU5FQVIsZj1jLndyYXBTP2Mud3JhcFM6Yi5DTEFNUF9UT19FREdFLGc9Yy53cmFwVD9jLndyYXBUOmIuQ0xBTVBfVE9fRURHRSxoPWMubHVtaW5hbmNlP2IuTFVNSU5BTkNFOmIuUkdCQTtpZihjLnJlcGVhdCYmKGY9Yi5SRVBFQVQsZz1iLlJFUEVBVCksYi5waXhlbFN0b3JlaShiLlVOUEFDS19GTElQX1lfV0VCR0wsISFjLmZsaXBZKSxjLndpZHRoKXt2YXIgaT1jLndpZHRoP2Mud2lkdGg6NTEyLGo9Yy5oZWlnaHQ/Yy5oZWlnaHQ6MixrPWMuYm9yZGVyP2MuYm9yZGVyOjA7Yi50ZXhJbWFnZTJEKGIuVEVYVFVSRV8yRCwwLGgsaSxqLGssaCxiLlVOU0lHTkVEX0JZVEUsbnVsbCl9ZWxzZSBiLnRleEltYWdlMkQoYi5URVhUVVJFXzJELDAsaCxiLlJHQkEsYi5VTlNJR05FRF9CWVRFLGEudmFsdWUuYmFzZVRleHR1cmUuc291cmNlKTtiLnRleFBhcmFtZXRlcmkoYi5URVhUVVJFXzJELGIuVEVYVFVSRV9NQUdfRklMVEVSLGQpLGIudGV4UGFyYW1ldGVyaShiLlRFWFRVUkVfMkQsYi5URVhUVVJFX01JTl9GSUxURVIsZSksYi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfV1JBUF9TLGYpLGIudGV4UGFyYW1ldGVyaShiLlRFWFRVUkVfMkQsYi5URVhUVVJFX1dSQVBfVCxnKX1iLnVuaWZvcm0xaShhLnVuaWZvcm1Mb2NhdGlvbix0aGlzLnRleHR1cmVDb3VudCksYS5faW5pdD0hMCx0aGlzLnRleHR1cmVDb3VudCsrfX0sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5zeW5jVW5pZm9ybXM9ZnVuY3Rpb24oKXt0aGlzLnRleHR1cmVDb3VudD0xO3ZhciBhLGM9dGhpcy5nbDtmb3IodmFyIGQgaW4gdGhpcy51bmlmb3JtcylhPXRoaXMudW5pZm9ybXNbZF0sMT09PWEuZ2xWYWx1ZUxlbmd0aD9hLmdsTWF0cml4PT09ITA/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudHJhbnNwb3NlLGEudmFsdWUpOmEuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnZhbHVlKToyPT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnZhbHVlLngsYS52YWx1ZS55KTozPT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnZhbHVlLngsYS52YWx1ZS55LGEudmFsdWUueik6ND09PWEuZ2xWYWx1ZUxlbmd0aD9hLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS52YWx1ZS54LGEudmFsdWUueSxhLnZhbHVlLnosYS52YWx1ZS53KTpcInNhbXBsZXIyRFwiPT09YS50eXBlJiYoYS5faW5pdD8oYy5hY3RpdmVUZXh0dXJlKGNbXCJURVhUVVJFXCIrdGhpcy50ZXh0dXJlQ291bnRdKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxhLnZhbHVlLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2MuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZShhLnZhbHVlLmJhc2VUZXh0dXJlLGMpKSxjLnVuaWZvcm0xaShhLnVuaWZvcm1Mb2NhdGlvbix0aGlzLnRleHR1cmVDb3VudCksdGhpcy50ZXh0dXJlQ291bnQrKyk6dGhpcy5pbml0U2FtcGxlcjJEKGEpKX0sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy51bmlmb3Jtcz1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLmF0dHJpYnV0ZXM9bnVsbH0sYi5QaXhpU2hhZGVyLmRlZmF1bHRWZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcIixcImF0dHJpYnV0ZSB2ZWMyIGFDb2xvcjtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcImNvbnN0IHZlYzIgY2VudGVyID0gdmVjMigtMS4wLCAxLjApO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX1Bvc2l0aW9uID0gdmVjNCggKChhVmVydGV4UG9zaXRpb24gKyBvZmZzZXRWZWN0b3IpIC8gcHJvamVjdGlvblZlY3RvcikgKyBjZW50ZXIgLCAwLjAsIDEuMCk7XCIsXCIgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcIixcIiAgIHZlYzMgY29sb3IgPSBtb2QodmVjMyhhQ29sb3IueS82NTUzNi4wLCBhQ29sb3IueS8yNTYuMCwgYUNvbG9yLnkpLCAyNTYuMCkgLyAyNTYuMDtcIixcIiAgIHZDb2xvciA9IHZlYzQoY29sb3IgKiBhQ29sb3IueCwgYUNvbG9yLngpO1wiLFwifVwiXSxiLlBpeGlGYXN0U2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbG93cCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyBmbG9hdCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpICogdkNvbG9yIDtcIixcIn1cIl0sdGhpcy52ZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzIgYVBvc2l0aW9uQ29vcmQ7XCIsXCJhdHRyaWJ1dGUgdmVjMiBhU2NhbGU7XCIsXCJhdHRyaWJ1dGUgZmxvYXQgYVJvdGF0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcIixcImF0dHJpYnV0ZSBmbG9hdCBhQ29sb3I7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ1bmlmb3JtIG1hdDMgdU1hdHJpeDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyBmbG9hdCB2Q29sb3I7XCIsXCJjb25zdCB2ZWMyIGNlbnRlciA9IHZlYzIoLTEuMCwgMS4wKTtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIHY7XCIsXCIgICB2ZWMyIHN2ID0gYVZlcnRleFBvc2l0aW9uICogYVNjYWxlO1wiLFwiICAgdi54ID0gKHN2LngpICogY29zKGFSb3RhdGlvbikgLSAoc3YueSkgKiBzaW4oYVJvdGF0aW9uKTtcIixcIiAgIHYueSA9IChzdi54KSAqIHNpbihhUm90YXRpb24pICsgKHN2LnkpICogY29zKGFSb3RhdGlvbik7XCIsXCIgICB2ID0gKCB1TWF0cml4ICogdmVjMyh2ICsgYVBvc2l0aW9uQ29vcmQgLCAxLjApICkueHkgO1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCAoIHYgLyBwcm9qZWN0aW9uVmVjdG9yKSArIGNlbnRlciAsIDAuMCwgMS4wKTtcIixcIiAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1wiLFwiICAgdkNvbG9yID0gYUNvbG9yO1wiLFwifVwiXSx0aGlzLnRleHR1cmVDb3VudD0wLHRoaXMuaW5pdCgpfSxiLlBpeGlGYXN0U2hhZGVyLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbCxjPWIuY29tcGlsZVByb2dyYW0oYSx0aGlzLnZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy51U2FtcGxlcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidVNhbXBsZXJcIiksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy5kaW1lbnNpb25zPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJkaW1lbnNpb25zXCIpLHRoaXMudU1hdHJpeD1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidU1hdHJpeFwiKSx0aGlzLmFWZXJ0ZXhQb3NpdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVmVydGV4UG9zaXRpb25cIiksdGhpcy5hUG9zaXRpb25Db29yZD1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhUG9zaXRpb25Db29yZFwiKSx0aGlzLmFTY2FsZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhU2NhbGVcIiksdGhpcy5hUm90YXRpb249YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVJvdGF0aW9uXCIpLHRoaXMuYVRleHR1cmVDb29yZD1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVGV4dHVyZUNvb3JkXCIpLHRoaXMuY29sb3JBdHRyaWJ1dGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYUNvbG9yXCIpLC0xPT09dGhpcy5jb2xvckF0dHJpYnV0ZSYmKHRoaXMuY29sb3JBdHRyaWJ1dGU9MiksdGhpcy5hdHRyaWJ1dGVzPVt0aGlzLmFWZXJ0ZXhQb3NpdGlvbix0aGlzLmFQb3NpdGlvbkNvb3JkLHRoaXMuYVNjYWxlLHRoaXMuYVJvdGF0aW9uLHRoaXMuYVRleHR1cmVDb29yZCx0aGlzLmNvbG9yQXR0cmlidXRlXSx0aGlzLnByb2dyYW09Y30sYi5QaXhpRmFzdFNoYWRlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pLHRoaXMudW5pZm9ybXM9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5hdHRyaWJ1dGVzPW51bGx9LGIuU3RyaXBTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ1bmlmb3JtIGZsb2F0IGFscGhhO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSk7XCIsXCJ9XCJdLHRoaXMudmVydGV4U3JjPVtcImF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcIixcImF0dHJpYnV0ZSB2ZWMyIGFUZXh0dXJlQ29vcmQ7XCIsXCJ1bmlmb3JtIG1hdDMgdHJhbnNsYXRpb25NYXRyaXg7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMzIHYgPSB0cmFuc2xhdGlvbk1hdHJpeCAqIHZlYzMoYVZlcnRleFBvc2l0aW9uICwgMS4wKTtcIixcIiAgIHYgLT0gb2Zmc2V0VmVjdG9yLnh5eDtcIixcIiAgIGdsX1Bvc2l0aW9uID0gdmVjNCggdi54IC8gcHJvamVjdGlvblZlY3Rvci54IC0xLjAsIHYueSAvIC1wcm9qZWN0aW9uVmVjdG9yLnkgKyAxLjAgLCAwLjAsIDEuMCk7XCIsXCIgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcIixcIn1cIl0sdGhpcy5pbml0KCl9LGIuU3RyaXBTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnVTYW1wbGVyPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1U2FtcGxlclwiKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSx0aGlzLmFWZXJ0ZXhQb3NpdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVmVydGV4UG9zaXRpb25cIiksdGhpcy5hVGV4dHVyZUNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFUZXh0dXJlQ29vcmRcIiksdGhpcy5hdHRyaWJ1dGVzPVt0aGlzLmFWZXJ0ZXhQb3NpdGlvbix0aGlzLmFUZXh0dXJlQ29vcmRdLHRoaXMudHJhbnNsYXRpb25NYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRyYW5zbGF0aW9uTWF0cml4XCIpLHRoaXMuYWxwaGE9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImFscGhhXCIpLHRoaXMucHJvZ3JhbT1jfSxiLlByaW1pdGl2ZVNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHZDb2xvcjtcIixcIn1cIl0sdGhpcy52ZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzQgYUNvbG9yO1wiLFwidW5pZm9ybSBtYXQzIHRyYW5zbGF0aW9uTWF0cml4O1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidW5pZm9ybSBmbG9hdCBhbHBoYTtcIixcInVuaWZvcm0gdmVjMyB0aW50O1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMzIHYgPSB0cmFuc2xhdGlvbk1hdHJpeCAqIHZlYzMoYVZlcnRleFBvc2l0aW9uICwgMS4wKTtcIixcIiAgIHYgLT0gb2Zmc2V0VmVjdG9yLnh5eDtcIixcIiAgIGdsX1Bvc2l0aW9uID0gdmVjNCggdi54IC8gcHJvamVjdGlvblZlY3Rvci54IC0xLjAsIHYueSAvIC1wcm9qZWN0aW9uVmVjdG9yLnkgKyAxLjAgLCAwLjAsIDEuMCk7XCIsXCIgICB2Q29sb3IgPSBhQ29sb3IgKiB2ZWM0KHRpbnQgKiBhbHBoYSwgYWxwaGEpO1wiLFwifVwiXSx0aGlzLmluaXQoKX0sYi5QcmltaXRpdmVTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLnRpbnRDb2xvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidGludFwiKSx0aGlzLmFWZXJ0ZXhQb3NpdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVmVydGV4UG9zaXRpb25cIiksdGhpcy5jb2xvckF0dHJpYnV0ZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhQ29sb3JcIiksdGhpcy5hdHRyaWJ1dGVzPVt0aGlzLmFWZXJ0ZXhQb3NpdGlvbix0aGlzLmNvbG9yQXR0cmlidXRlXSx0aGlzLnRyYW5zbGF0aW9uTWF0cml4PWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0cmFuc2xhdGlvbk1hdHJpeFwiKSx0aGlzLmFscGhhPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJhbHBoYVwiKSx0aGlzLnByb2dyYW09Y30sYi5QcmltaXRpdmVTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlPW51bGx9LGIuQ29tcGxleFByaW1pdGl2ZVNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHZDb2xvcjtcIixcIn1cIl0sdGhpcy52ZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwidW5pZm9ybSBtYXQzIHRyYW5zbGF0aW9uTWF0cml4O1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMzIHRpbnQ7XCIsXCJ1bmlmb3JtIGZsb2F0IGFscGhhO1wiLFwidW5pZm9ybSB2ZWMzIGNvbG9yO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMzIHYgPSB0cmFuc2xhdGlvbk1hdHJpeCAqIHZlYzMoYVZlcnRleFBvc2l0aW9uICwgMS4wKTtcIixcIiAgIHYgLT0gb2Zmc2V0VmVjdG9yLnh5eDtcIixcIiAgIGdsX1Bvc2l0aW9uID0gdmVjNCggdi54IC8gcHJvamVjdGlvblZlY3Rvci54IC0xLjAsIHYueSAvIC1wcm9qZWN0aW9uVmVjdG9yLnkgKyAxLjAgLCAwLjAsIDEuMCk7XCIsXCIgICB2Q29sb3IgPSB2ZWM0KGNvbG9yICogYWxwaGEgKiB0aW50LCBhbHBoYSk7XCIsXCJ9XCJdLHRoaXMuaW5pdCgpfSxiLkNvbXBsZXhQcmltaXRpdmVTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLnRpbnRDb2xvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidGludFwiKSx0aGlzLmNvbG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJjb2xvclwiKSx0aGlzLmFWZXJ0ZXhQb3NpdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhVmVydGV4UG9zaXRpb25cIiksdGhpcy5hdHRyaWJ1dGVzPVt0aGlzLmFWZXJ0ZXhQb3NpdGlvbix0aGlzLmNvbG9yQXR0cmlidXRlXSx0aGlzLnRyYW5zbGF0aW9uTWF0cml4PWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0cmFuc2xhdGlvbk1hdHJpeFwiKSx0aGlzLmFscGhhPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJhbHBoYVwiKSx0aGlzLnByb2dyYW09Y30sYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy51bmlmb3Jtcz1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLmF0dHJpYnV0ZT1udWxsfSxiLldlYkdMR3JhcGhpY3M9ZnVuY3Rpb24oKXt9LGIuV2ViR0xHcmFwaGljcy5yZW5kZXJHcmFwaGljcz1mdW5jdGlvbihhLGMpe3ZhciBkLGU9Yy5nbCxmPWMucHJvamVjdGlvbixnPWMub2Zmc2V0LGg9Yy5zaGFkZXJNYW5hZ2VyLnByaW1pdGl2ZVNoYWRlcjthLmRpcnR5JiZiLldlYkdMR3JhcGhpY3MudXBkYXRlR3JhcGhpY3MoYSxlKTtmb3IodmFyIGk9YS5fd2ViR0xbZS5pZF0saj0wO2o8aS5kYXRhLmxlbmd0aDtqKyspMT09PWkuZGF0YVtqXS5tb2RlPyhkPWkuZGF0YVtqXSxjLnN0ZW5jaWxNYW5hZ2VyLnB1c2hTdGVuY2lsKGEsZCxjKSxlLmRyYXdFbGVtZW50cyhlLlRSSUFOR0xFX0ZBTiw0LGUuVU5TSUdORURfU0hPUlQsMiooZC5pbmRpY2VzLmxlbmd0aC00KSksYy5zdGVuY2lsTWFuYWdlci5wb3BTdGVuY2lsKGEsZCxjKSx0aGlzLmxhc3Q9ZC5tb2RlKTooZD1pLmRhdGFbal0sYy5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihoKSxoPWMuc2hhZGVyTWFuYWdlci5wcmltaXRpdmVTaGFkZXIsZS51bmlmb3JtTWF0cml4M2Z2KGgudHJhbnNsYXRpb25NYXRyaXgsITEsYS53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksZS51bmlmb3JtMmYoaC5wcm9qZWN0aW9uVmVjdG9yLGYueCwtZi55KSxlLnVuaWZvcm0yZihoLm9mZnNldFZlY3RvciwtZy54LC1nLnkpLGUudW5pZm9ybTNmdihoLnRpbnRDb2xvcixiLmhleDJyZ2IoYS50aW50KSksZS51bmlmb3JtMWYoaC5hbHBoYSxhLndvcmxkQWxwaGEpLGUuYmluZEJ1ZmZlcihlLkFSUkFZX0JVRkZFUixkLmJ1ZmZlciksZS52ZXJ0ZXhBdHRyaWJQb2ludGVyKGguYVZlcnRleFBvc2l0aW9uLDIsZS5GTE9BVCwhMSwyNCwwKSxlLnZlcnRleEF0dHJpYlBvaW50ZXIoaC5jb2xvckF0dHJpYnV0ZSw0LGUuRkxPQVQsITEsMjQsOCksZS5iaW5kQnVmZmVyKGUuRUxFTUVOVF9BUlJBWV9CVUZGRVIsZC5pbmRleEJ1ZmZlciksZS5kcmF3RWxlbWVudHMoZS5UUklBTkdMRV9TVFJJUCxkLmluZGljZXMubGVuZ3RoLGUuVU5TSUdORURfU0hPUlQsMCkpfSxiLldlYkdMR3JhcGhpY3MudXBkYXRlR3JhcGhpY3M9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLl93ZWJHTFtjLmlkXTtkfHwoZD1hLl93ZWJHTFtjLmlkXT17bGFzdEluZGV4OjAsZGF0YTpbXSxnbDpjfSksYS5kaXJ0eT0hMTt2YXIgZTtpZihhLmNsZWFyRGlydHkpe2ZvcihhLmNsZWFyRGlydHk9ITEsZT0wO2U8ZC5kYXRhLmxlbmd0aDtlKyspe3ZhciBmPWQuZGF0YVtlXTtmLnJlc2V0KCksYi5XZWJHTEdyYXBoaWNzLmdyYXBoaWNzRGF0YVBvb2wucHVzaChmKX1kLmRhdGE9W10sZC5sYXN0SW5kZXg9MH12YXIgZztmb3IoZT1kLmxhc3RJbmRleDtlPGEuZ3JhcGhpY3NEYXRhLmxlbmd0aDtlKyspe3ZhciBoPWEuZ3JhcGhpY3NEYXRhW2VdO2gudHlwZT09PWIuR3JhcGhpY3MuUE9MWT8oaC5maWxsJiZoLnBvaW50cy5sZW5ndGg+NiYmKGgucG9pbnRzLmxlbmd0aD4xMD8oZz1iLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZShkLDEpLGIuV2ViR0xHcmFwaGljcy5idWlsZENvbXBsZXhQb2x5KGgsZykpOihnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMCksYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUG9seShoLGcpKSksaC5saW5lV2lkdGg+MCYmKGc9Yi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGUoZCwwKSxiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lKGgsZykpKTooZz1iLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZShkLDApLGgudHlwZT09PWIuR3JhcGhpY3MuUkVDVD9iLldlYkdMR3JhcGhpY3MuYnVpbGRSZWN0YW5nbGUoaCxnKTpoLnR5cGU9PT1iLkdyYXBoaWNzLkNJUkN8fGgudHlwZT09PWIuR3JhcGhpY3MuRUxJUD9iLldlYkdMR3JhcGhpY3MuYnVpbGRDaXJjbGUoaCxnKTpoLnR5cGU9PT1iLkdyYXBoaWNzLlJSRUMmJmIuV2ViR0xHcmFwaGljcy5idWlsZFJvdW5kZWRSZWN0YW5nbGUoaCxnKSksZC5sYXN0SW5kZXgrK31mb3IoZT0wO2U8ZC5kYXRhLmxlbmd0aDtlKyspZz1kLmRhdGFbZV0sZy5kaXJ0eSYmZy51cGxvYWQoKX0sYi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGU9ZnVuY3Rpb24oYSxjKXt2YXIgZDtyZXR1cm4gYS5kYXRhLmxlbmd0aD8oZD1hLmRhdGFbYS5kYXRhLmxlbmd0aC0xXSwoZC5tb2RlIT09Y3x8MT09PWMpJiYoZD1iLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbC5wb3AoKXx8bmV3IGIuV2ViR0xHcmFwaGljc0RhdGEoYS5nbCksZC5tb2RlPWMsYS5kYXRhLnB1c2goZCkpKTooZD1iLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbC5wb3AoKXx8bmV3IGIuV2ViR0xHcmFwaGljc0RhdGEoYS5nbCksZC5tb2RlPWMsYS5kYXRhLnB1c2goZCkpLGQuZGlydHk9ITAsZH0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUmVjdGFuZ2xlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5wb2ludHMsZT1kWzBdLGY9ZFsxXSxnPWRbMl0saD1kWzNdO2lmKGEuZmlsbCl7dmFyIGk9Yi5oZXgycmdiKGEuZmlsbENvbG9yKSxqPWEuZmlsbEFscGhhLGs9aVswXSpqLGw9aVsxXSpqLG09aVsyXSpqLG49Yy5wb2ludHMsbz1jLmluZGljZXMscD1uLmxlbmd0aC82O24ucHVzaChlLGYpLG4ucHVzaChrLGwsbSxqKSxuLnB1c2goZStnLGYpLG4ucHVzaChrLGwsbSxqKSxuLnB1c2goZSxmK2gpLG4ucHVzaChrLGwsbSxqKSxuLnB1c2goZStnLGYraCksbi5wdXNoKGssbCxtLGopLG8ucHVzaChwLHAscCsxLHArMixwKzMscCszKX1pZihhLmxpbmVXaWR0aCl7dmFyIHE9YS5wb2ludHM7YS5wb2ludHM9W2UsZixlK2csZixlK2csZitoLGUsZitoLGUsZl0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZShhLGMpLGEucG9pbnRzPXF9fSxiLldlYkdMR3JhcGhpY3MuYnVpbGRSb3VuZGVkUmVjdGFuZ2xlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5wb2ludHMsZT1kWzBdLGY9ZFsxXSxnPWRbMl0saD1kWzNdLGk9ZFs0XSxqPVtdO2lmKGoucHVzaChlLGYraSksaj1qLmNvbmNhdChiLldlYkdMR3JhcGhpY3MucXVhZHJhdGljQmV6aWVyQ3VydmUoZSxmK2gtaSxlLGYraCxlK2ksZitoKSksaj1qLmNvbmNhdChiLldlYkdMR3JhcGhpY3MucXVhZHJhdGljQmV6aWVyQ3VydmUoZStnLWksZitoLGUrZyxmK2gsZStnLGYraC1pKSksaj1qLmNvbmNhdChiLldlYkdMR3JhcGhpY3MucXVhZHJhdGljQmV6aWVyQ3VydmUoZStnLGYraSxlK2csZixlK2ctaSxmKSksaj1qLmNvbmNhdChiLldlYkdMR3JhcGhpY3MucXVhZHJhdGljQmV6aWVyQ3VydmUoZStpLGYsZSxmLGUsZitpKSksYS5maWxsKXt2YXIgaz1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLGw9YS5maWxsQWxwaGEsbT1rWzBdKmwsbj1rWzFdKmwsbz1rWzJdKmwscD1jLnBvaW50cyxxPWMuaW5kaWNlcyxyPXAubGVuZ3RoLzYscz1iLlBvbHlLLlRyaWFuZ3VsYXRlKGopLHQ9MDtmb3IodD0wO3Q8cy5sZW5ndGg7dCs9MylxLnB1c2goc1t0XStyKSxxLnB1c2goc1t0XStyKSxxLnB1c2goc1t0KzFdK3IpLHEucHVzaChzW3QrMl0rcikscS5wdXNoKHNbdCsyXStyKTtmb3IodD0wO3Q8ai5sZW5ndGg7dCsrKXAucHVzaChqW3RdLGpbKyt0XSxtLG4sbyxsKX1pZihhLmxpbmVXaWR0aCl7dmFyIHU9YS5wb2ludHM7YS5wb2ludHM9aixiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lKGEsYyksYS5wb2ludHM9dX19LGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZT1mdW5jdGlvbihhLGIsYyxkLGUsZil7ZnVuY3Rpb24gZyhhLGIsYyl7dmFyIGQ9Yi1hO3JldHVybiBhK2QqY31mb3IodmFyIGgsaSxqLGssbCxtLG49MjAsbz1bXSxwPTAscT0wO24+PXE7cSsrKXA9cS9uLGg9ZyhhLGMscCksaT1nKGIsZCxwKSxqPWcoYyxlLHApLGs9ZyhkLGYscCksbD1nKGgsaixwKSxtPWcoaSxrLHApLG8ucHVzaChsLG0pO3JldHVybiBvfSxiLldlYkdMR3JhcGhpY3MuYnVpbGRDaXJjbGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cyxlPWRbMF0sZj1kWzFdLGc9ZFsyXSxoPWRbM10saT00MCxqPTIqTWF0aC5QSS9pLGs9MDtpZihhLmZpbGwpe3ZhciBsPWIuaGV4MnJnYihhLmZpbGxDb2xvciksbT1hLmZpbGxBbHBoYSxuPWxbMF0qbSxvPWxbMV0qbSxwPWxbMl0qbSxxPWMucG9pbnRzLHI9Yy5pbmRpY2VzLHM9cS5sZW5ndGgvNjtmb3Ioci5wdXNoKHMpLGs9MDtpKzE+aztrKyspcS5wdXNoKGUsZixuLG8scCxtKSxxLnB1c2goZStNYXRoLnNpbihqKmspKmcsZitNYXRoLmNvcyhqKmspKmgsbixvLHAsbSksci5wdXNoKHMrKyxzKyspO3IucHVzaChzLTEpfWlmKGEubGluZVdpZHRoKXt2YXIgdD1hLnBvaW50cztmb3IoYS5wb2ludHM9W10saz0wO2krMT5rO2srKylhLnBvaW50cy5wdXNoKGUrTWF0aC5zaW4oaiprKSpnLGYrTWF0aC5jb3MoaiprKSpoKTtiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lKGEsYyksYS5wb2ludHM9dH19LGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmU9ZnVuY3Rpb24oYSxjKXt2YXIgZD0wLGU9YS5wb2ludHM7aWYoMCE9PWUubGVuZ3RoKXtpZihhLmxpbmVXaWR0aCUyKWZvcihkPTA7ZDxlLmxlbmd0aDtkKyspZVtkXSs9LjU7dmFyIGY9bmV3IGIuUG9pbnQoZVswXSxlWzFdKSxnPW5ldyBiLlBvaW50KGVbZS5sZW5ndGgtMl0sZVtlLmxlbmd0aC0xXSk7aWYoZi54PT09Zy54JiZmLnk9PT1nLnkpe2U9ZS5zbGljZSgpLGUucG9wKCksZS5wb3AoKSxnPW5ldyBiLlBvaW50KGVbZS5sZW5ndGgtMl0sZVtlLmxlbmd0aC0xXSk7dmFyIGg9Zy54Ky41KihmLngtZy54KSxpPWcueSsuNSooZi55LWcueSk7ZS51bnNoaWZ0KGgsaSksZS5wdXNoKGgsaSl9dmFyIGosayxsLG0sbixvLHAscSxyLHMsdCx1LHYsdyx4LHkseixBLEIsQyxELEUsRixHPWMucG9pbnRzLEg9Yy5pbmRpY2VzLEk9ZS5sZW5ndGgvMixKPWUubGVuZ3RoLEs9Ry5sZW5ndGgvNixMPWEubGluZVdpZHRoLzIsTT1iLmhleDJyZ2IoYS5saW5lQ29sb3IpLE49YS5saW5lQWxwaGEsTz1NWzBdKk4sUD1NWzFdKk4sUT1NWzJdKk47Zm9yKGw9ZVswXSxtPWVbMV0sbj1lWzJdLG89ZVszXSxyPS0obS1vKSxzPWwtbixGPU1hdGguc3FydChyKnIrcypzKSxyLz1GLHMvPUYscio9TCxzKj1MLEcucHVzaChsLXIsbS1zLE8sUCxRLE4pLEcucHVzaChsK3IsbStzLE8sUCxRLE4pLGQ9MTtJLTE+ZDtkKyspbD1lWzIqKGQtMSldLG09ZVsyKihkLTEpKzFdLG49ZVsyKmRdLG89ZVsyKmQrMV0scD1lWzIqKGQrMSldLHE9ZVsyKihkKzEpKzFdLHI9LShtLW8pLHM9bC1uLEY9TWF0aC5zcXJ0KHIqcitzKnMpLHIvPUYscy89RixyKj1MLHMqPUwsdD0tKG8tcSksdT1uLXAsRj1NYXRoLnNxcnQodCp0K3UqdSksdC89Rix1Lz1GLHQqPUwsdSo9TCx4PS1zK20tKC1zK28pLHk9LXIrbi0oLXIrbCksej0oLXIrbCkqKC1zK28pLSgtcituKSooLXMrbSksQT0tdStxLSgtdStvKSxCPS10K24tKC10K3ApLEM9KC10K3ApKigtdStvKS0oLXQrbikqKC11K3EpLEQ9eCpCLUEqeSxNYXRoLmFicyhEKTwuMT8oRCs9MTAuMSxHLnB1c2gobi1yLG8tcyxPLFAsUSxOKSxHLnB1c2gobityLG8rcyxPLFAsUSxOKSk6KGo9KHkqQy1CKnopL0Qsaz0oQSp6LXgqQykvRCxFPShqLW4pKihqLW4pKyhrLW8pKyhrLW8pLEU+MTk2MDA/KHY9ci10LHc9cy11LEY9TWF0aC5zcXJ0KHYqdit3KncpLHYvPUYsdy89Rix2Kj1MLHcqPUwsRy5wdXNoKG4tdixvLXcpLEcucHVzaChPLFAsUSxOKSxHLnB1c2gobit2LG8rdyksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuLXYsby13KSxHLnB1c2goTyxQLFEsTiksSisrKTooRy5wdXNoKGosayksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuLShqLW4pLG8tKGstbykpLEcucHVzaChPLFAsUSxOKSkpO2ZvcihsPWVbMiooSS0yKV0sbT1lWzIqKEktMikrMV0sbj1lWzIqKEktMSldLG89ZVsyKihJLTEpKzFdLHI9LShtLW8pLHM9bC1uLEY9TWF0aC5zcXJ0KHIqcitzKnMpLHIvPUYscy89RixyKj1MLHMqPUwsRy5wdXNoKG4tcixvLXMpLEcucHVzaChPLFAsUSxOKSxHLnB1c2gobityLG8rcyksRy5wdXNoKE8sUCxRLE4pLEgucHVzaChLKSxkPTA7Sj5kO2QrKylILnB1c2goSysrKTtILnB1c2goSy0xKX19LGIuV2ViR0xHcmFwaGljcy5idWlsZENvbXBsZXhQb2x5PWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5wb2ludHMuc2xpY2UoKTtpZighKGQubGVuZ3RoPDYpKXt2YXIgZT1jLmluZGljZXM7Yy5wb2ludHM9ZCxjLmFscGhhPWEuZmlsbEFscGhhLGMuY29sb3I9Yi5oZXgycmdiKGEuZmlsbENvbG9yKTtmb3IodmFyIGYsZyxoPTEvMCxpPS0xLzAsaj0xLzAsaz0tMS8wLGw9MDtsPGQubGVuZ3RoO2wrPTIpZj1kW2xdLGc9ZFtsKzFdLGg9aD5mP2Y6aCxpPWY+aT9mOmksaj1qPmc/ZzpqLGs9Zz5rP2c6aztkLnB1c2goaCxqLGksaixpLGssaCxrKTt2YXIgbT1kLmxlbmd0aC8yO2ZvcihsPTA7bT5sO2wrKyllLnB1c2gobCl9fSxiLldlYkdMR3JhcGhpY3MuYnVpbGRQb2x5PWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5wb2ludHM7aWYoIShkLmxlbmd0aDw2KSl7dmFyIGU9Yy5wb2ludHMsZj1jLmluZGljZXMsZz1kLmxlbmd0aC8yLGg9Yi5oZXgycmdiKGEuZmlsbENvbG9yKSxpPWEuZmlsbEFscGhhLGo9aFswXSppLGs9aFsxXSppLGw9aFsyXSppLG09Yi5Qb2x5Sy5Ucmlhbmd1bGF0ZShkKSxuPWUubGVuZ3RoLzYsbz0wO2ZvcihvPTA7bzxtLmxlbmd0aDtvKz0zKWYucHVzaChtW29dK24pLGYucHVzaChtW29dK24pLGYucHVzaChtW28rMV0rbiksZi5wdXNoKG1bbysyXStuKSxmLnB1c2gobVtvKzJdK24pO2ZvcihvPTA7Zz5vO28rKyllLnB1c2goZFsyKm9dLGRbMipvKzFdLGosayxsLGkpfX0sYi5XZWJHTEdyYXBoaWNzLmdyYXBoaWNzRGF0YVBvb2w9W10sYi5XZWJHTEdyYXBoaWNzRGF0YT1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy5jb2xvcj1bMCwwLDBdLHRoaXMucG9pbnRzPVtdLHRoaXMuaW5kaWNlcz1bXSx0aGlzLmxhc3RJbmRleD0wLHRoaXMuYnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMubW9kZT0xLHRoaXMuYWxwaGE9MSx0aGlzLmRpcnR5PSEwfSxiLldlYkdMR3JhcGhpY3NEYXRhLnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbigpe3RoaXMucG9pbnRzPVtdLHRoaXMuaW5kaWNlcz1bXSx0aGlzLmxhc3RJbmRleD0wfSxiLldlYkdMR3JhcGhpY3NEYXRhLnByb3RvdHlwZS51cGxvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsO3RoaXMuZ2xQb2ludHM9bmV3IEZsb2F0MzJBcnJheSh0aGlzLnBvaW50cyksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMuYnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy5nbFBvaW50cyxhLlNUQVRJQ19EUkFXKSx0aGlzLmdsSW5kaWNpZXM9bmV3IFVpbnQxNkFycmF5KHRoaXMuaW5kaWNlcyksYS5iaW5kQnVmZmVyKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksYS5idWZmZXJEYXRhKGEuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5nbEluZGljaWVzLGEuU1RBVElDX0RSQVcpLHRoaXMuZGlydHk9ITF9LGIuZ2xDb250ZXh0cz1bXSxiLldlYkdMUmVuZGVyZXI9ZnVuY3Rpb24oYSxjLGQsZSxmLGcpe2IuZGVmYXVsdFJlbmRlcmVyfHwoYi5zYXlIZWxsbyhcIndlYkdMXCIpLGIuZGVmYXVsdFJlbmRlcmVyPXRoaXMpLHRoaXMudHlwZT1iLldFQkdMX1JFTkRFUkVSLHRoaXMudHJhbnNwYXJlbnQ9ISFlLHRoaXMucHJlc2VydmVEcmF3aW5nQnVmZmVyPWcsdGhpcy53aWR0aD1hfHw4MDAsdGhpcy5oZWlnaHQ9Y3x8NjAwLHRoaXMudmlldz1kfHxkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLHRoaXMudmlldy53aWR0aD10aGlzLndpZHRoLHRoaXMudmlldy5oZWlnaHQ9dGhpcy5oZWlnaHQsdGhpcy5jb250ZXh0TG9zdD10aGlzLmhhbmRsZUNvbnRleHRMb3N0LmJpbmQodGhpcyksdGhpcy5jb250ZXh0UmVzdG9yZWRMb3N0PXRoaXMuaGFuZGxlQ29udGV4dFJlc3RvcmVkLmJpbmQodGhpcyksdGhpcy52aWV3LmFkZEV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRsb3N0XCIsdGhpcy5jb250ZXh0TG9zdCwhMSksdGhpcy52aWV3LmFkZEV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRyZXN0b3JlZFwiLHRoaXMuY29udGV4dFJlc3RvcmVkTG9zdCwhMSksdGhpcy5vcHRpb25zPXthbHBoYTp0aGlzLnRyYW5zcGFyZW50LGFudGlhbGlhczohIWYscHJlbXVsdGlwbGllZEFscGhhOiEhZSxzdGVuY2lsOiEwLHByZXNlcnZlRHJhd2luZ0J1ZmZlcjpnfTt2YXIgaD1udWxsO2lmKFtcImV4cGVyaW1lbnRhbC13ZWJnbFwiLFwid2ViZ2xcIl0uZm9yRWFjaChmdW5jdGlvbihhKXt0cnl7aD1ofHx0aGlzLnZpZXcuZ2V0Q29udGV4dChhLHRoaXMub3B0aW9ucyl9Y2F0Y2goYil7fX0sdGhpcyksIWgpdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgd2ViR0wuIFRyeSB1c2luZyB0aGUgY2FudmFzIHJlbmRlcmVyXCIrdGhpcyk7dGhpcy5nbD1oLHRoaXMuZ2xDb250ZXh0SWQ9aC5pZD1iLldlYkdMUmVuZGVyZXIuZ2xDb250ZXh0SWQrKyxiLmdsQ29udGV4dHNbdGhpcy5nbENvbnRleHRJZF09aCxiLmJsZW5kTW9kZXNXZWJHTHx8KGIuYmxlbmRNb2Rlc1dlYkdMPVtdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5OT1JNQUxdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5BRERdPVtoLlNSQ19BTFBIQSxoLkRTVF9BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLk1VTFRJUExZXT1baC5EU1RfQ09MT1IsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuU0NSRUVOXT1baC5TUkNfQUxQSEEsaC5PTkVdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5PVkVSTEFZXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuREFSS0VOXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTElHSFRFTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkNPTE9SX0RPREdFXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuQ09MT1JfQlVSTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkhBUkRfTElHSFRdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5TT0ZUX0xJR0hUXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuRElGRkVSRU5DRV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkVYQ0xVU0lPTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkhVRV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLlNBVFVSQVRJT05dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5DT0xPUl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkxVTUlOT1NJVFldPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdKSx0aGlzLnByb2plY3Rpb249bmV3IGIuUG9pbnQsdGhpcy5wcm9qZWN0aW9uLng9dGhpcy53aWR0aC8yLHRoaXMucHJvamVjdGlvbi55PS10aGlzLmhlaWdodC8yLHRoaXMub2Zmc2V0PW5ldyBiLlBvaW50KDAsMCksdGhpcy5yZXNpemUodGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5jb250ZXh0TG9zdD0hMSx0aGlzLnNoYWRlck1hbmFnZXI9bmV3IGIuV2ViR0xTaGFkZXJNYW5hZ2VyKGgpLHRoaXMuc3ByaXRlQmF0Y2g9bmV3IGIuV2ViR0xTcHJpdGVCYXRjaChoKSx0aGlzLm1hc2tNYW5hZ2VyPW5ldyBiLldlYkdMTWFza01hbmFnZXIoaCksdGhpcy5maWx0ZXJNYW5hZ2VyPW5ldyBiLldlYkdMRmlsdGVyTWFuYWdlcihoLHRoaXMudHJhbnNwYXJlbnQpLHRoaXMuc3RlbmNpbE1hbmFnZXI9bmV3IGIuV2ViR0xTdGVuY2lsTWFuYWdlcihoKSx0aGlzLmJsZW5kTW9kZU1hbmFnZXI9bmV3IGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyKGgpLHRoaXMucmVuZGVyU2Vzc2lvbj17fSx0aGlzLnJlbmRlclNlc3Npb24uZ2w9dGhpcy5nbCx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50PTAsdGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXI9dGhpcy5zaGFkZXJNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5tYXNrTWFuYWdlcj10aGlzLm1hc2tNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5maWx0ZXJNYW5hZ2VyPXRoaXMuZmlsdGVyTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlcj10aGlzLmJsZW5kTW9kZU1hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLnNwcml0ZUJhdGNoPXRoaXMuc3ByaXRlQmF0Y2gsdGhpcy5yZW5kZXJTZXNzaW9uLnN0ZW5jaWxNYW5hZ2VyPXRoaXMuc3RlbmNpbE1hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLnJlbmRlcmVyPXRoaXMsaC51c2VQcm9ncmFtKHRoaXMuc2hhZGVyTWFuYWdlci5kZWZhdWx0U2hhZGVyLnByb2dyYW0pLGguZGlzYWJsZShoLkRFUFRIX1RFU1QpLGguZGlzYWJsZShoLkNVTExfRkFDRSksaC5lbmFibGUoaC5CTEVORCksaC5jb2xvck1hc2soITAsITAsITAsdGhpcy50cmFuc3BhcmVudCl9LGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5XZWJHTFJlbmRlcmVyLGIuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyPWZ1bmN0aW9uKGEpe2lmKCF0aGlzLmNvbnRleHRMb3N0KXt0aGlzLl9fc3RhZ2UhPT1hJiYoYS5pbnRlcmFjdGl2ZSYmYS5pbnRlcmFjdGlvbk1hbmFnZXIucmVtb3ZlRXZlbnRzKCksdGhpcy5fX3N0YWdlPWEpLGIuV2ViR0xSZW5kZXJlci51cGRhdGVUZXh0dXJlcygpLGEudXBkYXRlVHJhbnNmb3JtKCksYS5faW50ZXJhY3RpdmUmJihhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkfHwoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZD0hMCxhLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXQodGhpcykpKTt2YXIgYz10aGlzLmdsO2Mudmlld3BvcnQoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLGMuYmluZEZyYW1lYnVmZmVyKGMuRlJBTUVCVUZGRVIsbnVsbCksdGhpcy50cmFuc3BhcmVudD9jLmNsZWFyQ29sb3IoMCwwLDAsMCk6Yy5jbGVhckNvbG9yKGEuYmFja2dyb3VuZENvbG9yU3BsaXRbMF0sYS5iYWNrZ3JvdW5kQ29sb3JTcGxpdFsxXSxhLmJhY2tncm91bmRDb2xvclNwbGl0WzJdLDEpLGMuY2xlYXIoYy5DT0xPUl9CVUZGRVJfQklUKSx0aGlzLnJlbmRlckRpc3BsYXlPYmplY3QoYSx0aGlzLnByb2plY3Rpb24pLGEuaW50ZXJhY3RpdmU/YS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZHx8KGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQ9ITAsYS5pbnRlcmFjdGlvbk1hbmFnZXIuc2V0VGFyZ2V0KHRoaXMpKTphLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkJiYoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZD0hMSxhLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXQodGhpcykpfX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJEaXNwbGF5T2JqZWN0PWZ1bmN0aW9uKGEsYyxkKXt0aGlzLnJlbmRlclNlc3Npb24uYmxlbmRNb2RlTWFuYWdlci5zZXRCbGVuZE1vZGUoYi5ibGVuZE1vZGVzLk5PUk1BTCksdGhpcy5yZW5kZXJTZXNzaW9uLmRyYXdDb3VudD0wLHRoaXMucmVuZGVyU2Vzc2lvbi5jdXJyZW50QmxlbmRNb2RlPTk5OTksdGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb249Yyx0aGlzLnJlbmRlclNlc3Npb24ub2Zmc2V0PXRoaXMub2Zmc2V0LHRoaXMuc3ByaXRlQmF0Y2guYmVnaW4odGhpcy5yZW5kZXJTZXNzaW9uKSx0aGlzLmZpbHRlck1hbmFnZXIuYmVnaW4odGhpcy5yZW5kZXJTZXNzaW9uLGQpLGEuX3JlbmRlcldlYkdMKHRoaXMucmVuZGVyU2Vzc2lvbiksdGhpcy5zcHJpdGVCYXRjaC5lbmQoKX0sYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVzPWZ1bmN0aW9uKCl7dmFyIGE9MDtmb3IoYT0wO2E8Yi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5sZW5ndGg7YSsrKWIuV2ViR0xSZW5kZXJlci51cGRhdGVUZXh0dXJlRnJhbWUoYi5UZXh0dXJlLmZyYW1lVXBkYXRlc1thXSk7Zm9yKGE9MDthPGIudGV4dHVyZXNUb0Rlc3Ryb3kubGVuZ3RoO2ErKyliLldlYkdMUmVuZGVyZXIuZGVzdHJveVRleHR1cmUoYi50ZXh0dXJlc1RvRGVzdHJveVthXSk7Yi50ZXh0dXJlc1RvVXBkYXRlLmxlbmd0aD0wLGIudGV4dHVyZXNUb0Rlc3Ryb3kubGVuZ3RoPTAsYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5sZW5ndGg9MH0sYi5XZWJHTFJlbmRlcmVyLmRlc3Ryb3lUZXh0dXJlPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1hLl9nbFRleHR1cmVzLmxlbmd0aC0xO2M+PTA7Yy0tKXt2YXIgZD1hLl9nbFRleHR1cmVzW2NdLGU9Yi5nbENvbnRleHRzW2NdO1xyXG5lJiZkJiZlLmRlbGV0ZVRleHR1cmUoZCl9YS5fZ2xUZXh0dXJlcy5sZW5ndGg9MH0sYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVGcmFtZT1mdW5jdGlvbihhKXthLl91cGRhdGVXZWJHTHV2cygpfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGIpe3RoaXMud2lkdGg9YSx0aGlzLmhlaWdodD1iLHRoaXMudmlldy53aWR0aD1hLHRoaXMudmlldy5oZWlnaHQ9Yix0aGlzLmdsLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLnByb2plY3Rpb24ueD10aGlzLndpZHRoLzIsdGhpcy5wcm9qZWN0aW9uLnk9LXRoaXMuaGVpZ2h0LzJ9LGIuY3JlYXRlV2ViR0xUZXh0dXJlPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGEuaGFzTG9hZGVkJiYoYS5fZ2xUZXh0dXJlc1tjLmlkXT1jLmNyZWF0ZVRleHR1cmUoKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2MuaWRdKSxjLnBpeGVsU3RvcmVpKGMuVU5QQUNLX1BSRU1VTFRJUExZX0FMUEhBX1dFQkdMLGEucHJlbXVsdGlwbGllZEFscGhhKSxjLnRleEltYWdlMkQoYy5URVhUVVJFXzJELDAsYy5SR0JBLGMuUkdCQSxjLlVOU0lHTkVEX0JZVEUsYS5zb3VyY2UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01BR19GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUlOX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxhLl9wb3dlck9mMj8oYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuUkVQRUFUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5SRVBFQVQpKTooYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuQ0xBTVBfVE9fRURHRSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuQ0xBTVBfVE9fRURHRSkpLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELG51bGwpLGEuX2RpcnR5W2MuaWRdPSExKSxhLl9nbFRleHR1cmVzW2MuaWRdfSxiLnVwZGF0ZVdlYkdMVGV4dHVyZT1mdW5jdGlvbihhLGMpe2EuX2dsVGV4dHVyZXNbYy5pZF0mJihjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2MuaWRdKSxjLnBpeGVsU3RvcmVpKGMuVU5QQUNLX1BSRU1VTFRJUExZX0FMUEhBX1dFQkdMLGEucHJlbXVsdGlwbGllZEFscGhhKSxjLnRleEltYWdlMkQoYy5URVhUVVJFXzJELDAsYy5SR0JBLGMuUkdCQSxjLlVOU0lHTkVEX0JZVEUsYS5zb3VyY2UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01BR19GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUlOX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxhLl9wb3dlck9mMj8oYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuUkVQRUFUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5SRVBFQVQpKTooYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuQ0xBTVBfVE9fRURHRSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuQ0xBTVBfVE9fRURHRSkpLGEuX2RpcnR5W2MuaWRdPSExKX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVDb250ZXh0TG9zdD1mdW5jdGlvbihhKXthLnByZXZlbnREZWZhdWx0KCksdGhpcy5jb250ZXh0TG9zdD0hMH0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVDb250ZXh0UmVzdG9yZWQ9ZnVuY3Rpb24oKXt0cnl7dGhpcy5nbD10aGlzLnZpZXcuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiLHRoaXMub3B0aW9ucyl9Y2F0Y2goYSl7dHJ5e3RoaXMuZ2w9dGhpcy52aWV3LmdldENvbnRleHQoXCJ3ZWJnbFwiLHRoaXMub3B0aW9ucyl9Y2F0Y2goYyl7dGhyb3cgbmV3IEVycm9yKFwiIFRoaXMgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHdlYkdMLiBUcnkgdXNpbmcgdGhlIGNhbnZhcyByZW5kZXJlclwiK3RoaXMpfX12YXIgZD10aGlzLmdsO2QuaWQ9Yi5XZWJHTFJlbmRlcmVyLmdsQ29udGV4dElkKyssdGhpcy5zaGFkZXJNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5zcHJpdGVCYXRjaC5zZXRDb250ZXh0KGQpLHRoaXMucHJpbWl0aXZlQmF0Y2guc2V0Q29udGV4dChkKSx0aGlzLm1hc2tNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5maWx0ZXJNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5yZW5kZXJTZXNzaW9uLmdsPXRoaXMuZ2wsZC5kaXNhYmxlKGQuREVQVEhfVEVTVCksZC5kaXNhYmxlKGQuQ1VMTF9GQUNFKSxkLmVuYWJsZShkLkJMRU5EKSxkLmNvbG9yTWFzayghMCwhMCwhMCx0aGlzLnRyYW5zcGFyZW50KSx0aGlzLmdsLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KTtmb3IodmFyIGUgaW4gYi5UZXh0dXJlQ2FjaGUpe3ZhciBmPWIuVGV4dHVyZUNhY2hlW2VdLmJhc2VUZXh0dXJlO2YuX2dsVGV4dHVyZXM9W119dGhpcy5jb250ZXh0TG9zdD0hMX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy52aWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRsb3N0XCIsdGhpcy5jb250ZXh0TG9zdCksdGhpcy52aWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRyZXN0b3JlZFwiLHRoaXMuY29udGV4dFJlc3RvcmVkTG9zdCksYi5nbENvbnRleHRzW3RoaXMuZ2xDb250ZXh0SWRdPW51bGwsdGhpcy5wcm9qZWN0aW9uPW51bGwsdGhpcy5vZmZzZXQ9bnVsbCx0aGlzLnNoYWRlck1hbmFnZXIuZGVzdHJveSgpLHRoaXMuc3ByaXRlQmF0Y2guZGVzdHJveSgpLHRoaXMucHJpbWl0aXZlQmF0Y2guZGVzdHJveSgpLHRoaXMubWFza01hbmFnZXIuZGVzdHJveSgpLHRoaXMuZmlsdGVyTWFuYWdlci5kZXN0cm95KCksdGhpcy5zaGFkZXJNYW5hZ2VyPW51bGwsdGhpcy5zcHJpdGVCYXRjaD1udWxsLHRoaXMubWFza01hbmFnZXI9bnVsbCx0aGlzLmZpbHRlck1hbmFnZXI9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5yZW5kZXJTZXNzaW9uPW51bGx9LGIuV2ViR0xSZW5kZXJlci5nbENvbnRleHRJZD0wLGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9OTk5OTl9LGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyLnByb3RvdHlwZS5zZXRCbGVuZE1vZGU9ZnVuY3Rpb24oYSl7aWYodGhpcy5jdXJyZW50QmxlbmRNb2RlPT09YSlyZXR1cm4hMTt0aGlzLmN1cnJlbnRCbGVuZE1vZGU9YTt2YXIgYz1iLmJsZW5kTW9kZXNXZWJHTFt0aGlzLmN1cnJlbnRCbGVuZE1vZGVdO3JldHVybiB0aGlzLmdsLmJsZW5kRnVuYyhjWzBdLGNbMV0pLCEwfSxiLldlYkdMQmxlbmRNb2RlTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2w9bnVsbH0sYi5XZWJHTE1hc2tNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMubWFza1N0YWNrPVtdLHRoaXMubWFza1Bvc2l0aW9uPTAsdGhpcy5zZXRDb250ZXh0KGEpLHRoaXMucmV2ZXJzZT0hMSx0aGlzLmNvdW50PTB9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWF9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUucHVzaE1hc2s9ZnVuY3Rpb24oYSxjKXt2YXIgZD1jLmdsO2EuZGlydHkmJmIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcyhhLGQpLGEuX3dlYkdMW2QuaWRdLmRhdGEubGVuZ3RoJiZjLnN0ZW5jaWxNYW5hZ2VyLnB1c2hTdGVuY2lsKGEsYS5fd2ViR0xbZC5pZF0uZGF0YVswXSxjKX0sYi5XZWJHTE1hc2tNYW5hZ2VyLnByb3RvdHlwZS5wb3BNYXNrPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5nbDtiLnN0ZW5jaWxNYW5hZ2VyLnBvcFN0ZW5jaWwoYSxhLl93ZWJHTFtjLmlkXS5kYXRhWzBdLGIpfSxiLldlYkdMTWFza01hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLm1hc2tTdGFjaz1udWxsLHRoaXMuZ2w9bnVsbH0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuc3RlbmNpbFN0YWNrPVtdLHRoaXMuc2V0Q29udGV4dChhKSx0aGlzLnJldmVyc2U9ITAsdGhpcy5jb3VudD0wfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnB1c2hTdGVuY2lsPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmdsO3RoaXMuYmluZEdyYXBoaWNzKGEsYixjKSwwPT09dGhpcy5zdGVuY2lsU3RhY2subGVuZ3RoJiYoZC5lbmFibGUoZC5TVEVOQ0lMX1RFU1QpLGQuY2xlYXIoZC5TVEVOQ0lMX0JVRkZFUl9CSVQpLHRoaXMucmV2ZXJzZT0hMCx0aGlzLmNvdW50PTApLHRoaXMuc3RlbmNpbFN0YWNrLnB1c2goYik7dmFyIGU9dGhpcy5jb3VudDtkLmNvbG9yTWFzayghMSwhMSwhMSwhMSksZC5zdGVuY2lsRnVuYyhkLkFMV0FZUywwLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOVkVSVCksMT09PWIubW9kZT8oZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sYi5pbmRpY2VzLmxlbmd0aC00LGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sNCxkLlVOU0lHTkVEX1NIT1JULDIqKGIuaW5kaWNlcy5sZW5ndGgtNCkpLHRoaXMucmV2ZXJzZT9kLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUrMSwyNTUpLHRoaXMucmV2ZXJzZT0hdGhpcy5yZXZlcnNlKToodGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSk6KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5ERUNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9TVFJJUCxiLmluZGljZXMubGVuZ3RoLGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSkpLGQuY29sb3JNYXNrKCEwLCEwLCEwLCEwKSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuS0VFUCksdGhpcy5jb3VudCsrfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLmJpbmRHcmFwaGljcz1mdW5jdGlvbihhLGMsZCl7dGhpcy5fY3VycmVudEdyYXBoaWNzPWE7dmFyIGUsZj10aGlzLmdsLGc9ZC5wcm9qZWN0aW9uLGg9ZC5vZmZzZXQ7MT09PWMubW9kZT8oZT1kLnNoYWRlck1hbmFnZXIuY29tcGxleFByaW1hdGl2ZVNoYWRlcixkLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGUpLGYudW5pZm9ybU1hdHJpeDNmdihlLnRyYW5zbGF0aW9uTWF0cml4LCExLGEud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCkpLGYudW5pZm9ybTJmKGUucHJvamVjdGlvblZlY3RvcixnLngsLWcueSksZi51bmlmb3JtMmYoZS5vZmZzZXRWZWN0b3IsLWgueCwtaC55KSxmLnVuaWZvcm0zZnYoZS50aW50Q29sb3IsYi5oZXgycmdiKGEudGludCkpLGYudW5pZm9ybTNmdihlLmNvbG9yLGMuY29sb3IpLGYudW5pZm9ybTFmKGUuYWxwaGEsYS53b3JsZEFscGhhKmMuYWxwaGEpLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUixjLmJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGUuYVZlcnRleFBvc2l0aW9uLDIsZi5GTE9BVCwhMSw4LDApLGYuYmluZEJ1ZmZlcihmLkVMRU1FTlRfQVJSQVlfQlVGRkVSLGMuaW5kZXhCdWZmZXIpKTooZT1kLnNoYWRlck1hbmFnZXIucHJpbWl0aXZlU2hhZGVyLGQuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoZSksZi51bmlmb3JtTWF0cml4M2Z2KGUudHJhbnNsYXRpb25NYXRyaXgsITEsYS53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksZi51bmlmb3JtMmYoZS5wcm9qZWN0aW9uVmVjdG9yLGcueCwtZy55KSxmLnVuaWZvcm0yZihlLm9mZnNldFZlY3RvciwtaC54LC1oLnkpLGYudW5pZm9ybTNmdihlLnRpbnRDb2xvcixiLmhleDJyZ2IoYS50aW50KSksZi51bmlmb3JtMWYoZS5hbHBoYSxhLndvcmxkQWxwaGEpLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUixjLmJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGUuYVZlcnRleFBvc2l0aW9uLDIsZi5GTE9BVCwhMSwyNCwwKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZS5jb2xvckF0dHJpYnV0ZSw0LGYuRkxPQVQsITEsMjQsOCksZi5iaW5kQnVmZmVyKGYuRUxFTUVOVF9BUlJBWV9CVUZGRVIsYy5pbmRleEJ1ZmZlcikpfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnBvcFN0ZW5jaWw9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZ2w7aWYodGhpcy5zdGVuY2lsU3RhY2sucG9wKCksdGhpcy5jb3VudC0tLDA9PT10aGlzLnN0ZW5jaWxTdGFjay5sZW5ndGgpZC5kaXNhYmxlKGQuU1RFTkNJTF9URVNUKTtlbHNle3ZhciBlPXRoaXMuY291bnQ7dGhpcy5iaW5kR3JhcGhpY3MoYSxiLGMpLGQuY29sb3JNYXNrKCExLCExLCExLCExKSwxPT09Yi5tb2RlPyh0aGlzLnJldmVyc2U9IXRoaXMucmV2ZXJzZSx0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtKGUrMSksMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5DUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSsxLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLkRFQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX0ZBTiw0LGQuVU5TSUdORURfU0hPUlQsMiooYi5pbmRpY2VzLmxlbmd0aC00KSksZC5zdGVuY2lsRnVuYyhkLkFMV0FZUywwLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOVkVSVCksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sYi5pbmRpY2VzLmxlbmd0aC00LGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCxlLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS1lLDI1NSkpOih0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX1NUUklQLGIuaW5kaWNlcy5sZW5ndGgsZC5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJldmVyc2U/ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUsMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSksZC5jb2xvck1hc2soITAsITAsITAsITApLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5LRUVQKX19LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMubWFza1N0YWNrPW51bGwsdGhpcy5nbD1udWxsfSxiLldlYkdMU2hhZGVyTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLm1heEF0dGlicz0xMCx0aGlzLmF0dHJpYlN0YXRlPVtdLHRoaXMudGVtcEF0dHJpYlN0YXRlPVtdLHRoaXMuc2hhZGVyTWFwPVtdO2Zvcih2YXIgYj0wO2I8dGhpcy5tYXhBdHRpYnM7YisrKXRoaXMuYXR0cmliU3RhdGVbYl09ITE7dGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMU2hhZGVyTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy5wcmltaXRpdmVTaGFkZXI9bmV3IGIuUHJpbWl0aXZlU2hhZGVyKGEpLHRoaXMuY29tcGxleFByaW1hdGl2ZVNoYWRlcj1uZXcgYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyKGEpLHRoaXMuZGVmYXVsdFNoYWRlcj1uZXcgYi5QaXhpU2hhZGVyKGEpLHRoaXMuZmFzdFNoYWRlcj1uZXcgYi5QaXhpRmFzdFNoYWRlcihhKSx0aGlzLnN0cmlwU2hhZGVyPW5ldyBiLlN0cmlwU2hhZGVyKGEpLHRoaXMuc2V0U2hhZGVyKHRoaXMuZGVmYXVsdFNoYWRlcil9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRBdHRyaWJzPWZ1bmN0aW9uKGEpe3ZhciBiO2ZvcihiPTA7Yjx0aGlzLnRlbXBBdHRyaWJTdGF0ZS5sZW5ndGg7YisrKXRoaXMudGVtcEF0dHJpYlN0YXRlW2JdPSExO2ZvcihiPTA7YjxhLmxlbmd0aDtiKyspe3ZhciBjPWFbYl07dGhpcy50ZW1wQXR0cmliU3RhdGVbY109ITB9dmFyIGQ9dGhpcy5nbDtmb3IoYj0wO2I8dGhpcy5hdHRyaWJTdGF0ZS5sZW5ndGg7YisrKXRoaXMuYXR0cmliU3RhdGVbYl0hPT10aGlzLnRlbXBBdHRyaWJTdGF0ZVtiXSYmKHRoaXMuYXR0cmliU3RhdGVbYl09dGhpcy50ZW1wQXR0cmliU3RhdGVbYl0sdGhpcy50ZW1wQXR0cmliU3RhdGVbYl0/ZC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShiKTpkLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheShiKSl9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRTaGFkZXI9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX2N1cnJlbnRJZD09PWEuX1VJRD8hMToodGhpcy5fY3VycmVudElkPWEuX1VJRCx0aGlzLmN1cnJlbnRTaGFkZXI9YSx0aGlzLmdsLnVzZVByb2dyYW0oYS5wcm9ncmFtKSx0aGlzLnNldEF0dHJpYnMoYS5hdHRyaWJ1dGVzKSwhMCl9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5hdHRyaWJTdGF0ZT1udWxsLHRoaXMudGVtcEF0dHJpYlN0YXRlPW51bGwsdGhpcy5wcmltaXRpdmVTaGFkZXIuZGVzdHJveSgpLHRoaXMuZGVmYXVsdFNoYWRlci5kZXN0cm95KCksdGhpcy5mYXN0U2hhZGVyLmRlc3Ryb3koKSx0aGlzLnN0cmlwU2hhZGVyLmRlc3Ryb3koKSx0aGlzLmdsPW51bGx9LGIuV2ViR0xTcHJpdGVCYXRjaD1mdW5jdGlvbihhKXt0aGlzLnZlcnRTaXplPTYsdGhpcy5zaXplPTJlMzt2YXIgYj00KnRoaXMuc2l6ZSp0aGlzLnZlcnRTaXplLGM9Nip0aGlzLnNpemU7dGhpcy52ZXJ0aWNlcz1uZXcgRmxvYXQzMkFycmF5KGIpLHRoaXMuaW5kaWNlcz1uZXcgVWludDE2QXJyYXkoYyksdGhpcy5sYXN0SW5kZXhDb3VudD0wO2Zvcih2YXIgZD0wLGU9MDtjPmQ7ZCs9NixlKz00KXRoaXMuaW5kaWNlc1tkKzBdPWUrMCx0aGlzLmluZGljZXNbZCsxXT1lKzEsdGhpcy5pbmRpY2VzW2QrMl09ZSsyLHRoaXMuaW5kaWNlc1tkKzNdPWUrMCx0aGlzLmluZGljZXNbZCs0XT1lKzIsdGhpcy5pbmRpY2VzW2QrNV09ZSszO3RoaXMuZHJhd2luZz0hMSx0aGlzLmN1cnJlbnRCYXRjaFNpemU9MCx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1udWxsLHRoaXMuc2V0Q29udGV4dChhKSx0aGlzLmRpcnR5PSEwLHRoaXMudGV4dHVyZXM9W10sdGhpcy5ibGVuZE1vZGVzPVtdfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMudmVydGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kaWNlcyxhLlNUQVRJQ19EUkFXKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRpY2VzLGEuRFlOQU1JQ19EUkFXKSx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9OTk5OTl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuYmVnaW49ZnVuY3Rpb24oYSl7dGhpcy5yZW5kZXJTZXNzaW9uPWEsdGhpcy5zaGFkZXI9dGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlcix0aGlzLnN0YXJ0KCl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlcj1mdW5jdGlvbihhKXt2YXIgYj1hLnRleHR1cmU7dGhpcy5jdXJyZW50QmF0Y2hTaXplPj10aGlzLnNpemUmJih0aGlzLmZsdXNoKCksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9Yi5iYXNlVGV4dHVyZSk7dmFyIGM9Yi5fdXZzO2lmKGMpe3ZhciBkLGUsZixnLGg9YS53b3JsZEFscGhhLGk9YS50aW50LGo9dGhpcy52ZXJ0aWNlcyxrPWEuYW5jaG9yLngsbD1hLmFuY2hvci55O2lmKGIudHJpbSl7dmFyIG09Yi50cmltO2U9bS54LWsqbS53aWR0aCxkPWUrYi5jcm9wLndpZHRoLGc9bS55LWwqbS5oZWlnaHQsZj1nK2IuY3JvcC5oZWlnaHR9ZWxzZSBkPWIuZnJhbWUud2lkdGgqKDEtayksZT1iLmZyYW1lLndpZHRoKi1rLGY9Yi5mcmFtZS5oZWlnaHQqKDEtbCksZz1iLmZyYW1lLmhlaWdodCotbDt2YXIgbj00KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplLG89YS53b3JsZFRyYW5zZm9ybSxwPW8uYSxxPW8uYyxyPW8uYixzPW8uZCx0PW8udHgsdT1vLnR5O2pbbisrXT1wKmUrcipnK3QsaltuKytdPXMqZytxKmUrdSxqW24rK109Yy54MCxqW24rK109Yy55MCxqW24rK109aCxqW24rK109aSxqW24rK109cCpkK3IqZyt0LGpbbisrXT1zKmcrcSpkK3UsaltuKytdPWMueDEsaltuKytdPWMueTEsaltuKytdPWgsaltuKytdPWksaltuKytdPXAqZCtyKmYrdCxqW24rK109cypmK3EqZCt1LGpbbisrXT1jLngyLGpbbisrXT1jLnkyLGpbbisrXT1oLGpbbisrXT1pLGpbbisrXT1wKmUrcipmK3QsaltuKytdPXMqZitxKmUrdSxqW24rK109Yy54MyxqW24rK109Yy55MyxqW24rK109aCxqW24rK109aSx0aGlzLnRleHR1cmVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09YS50ZXh0dXJlLmJhc2VUZXh0dXJlLHRoaXMuYmxlbmRNb2Rlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWEuYmxlbmRNb2RlLHRoaXMuY3VycmVudEJhdGNoU2l6ZSsrfX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXJUaWxpbmdTcHJpdGU9ZnVuY3Rpb24oYSl7dmFyIGM9YS50aWxpbmdUZXh0dXJlO3RoaXMuY3VycmVudEJhdGNoU2l6ZT49dGhpcy5zaXplJiYodGhpcy5mbHVzaCgpLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPWMuYmFzZVRleHR1cmUpLGEuX3V2c3x8KGEuX3V2cz1uZXcgYi5UZXh0dXJlVXZzKTt2YXIgZD1hLl91dnM7YS50aWxlUG9zaXRpb24ueCU9Yy5iYXNlVGV4dHVyZS53aWR0aCphLnRpbGVTY2FsZU9mZnNldC54LGEudGlsZVBvc2l0aW9uLnklPWMuYmFzZVRleHR1cmUuaGVpZ2h0KmEudGlsZVNjYWxlT2Zmc2V0Lnk7dmFyIGU9YS50aWxlUG9zaXRpb24ueC8oYy5iYXNlVGV4dHVyZS53aWR0aCphLnRpbGVTY2FsZU9mZnNldC54KSxmPWEudGlsZVBvc2l0aW9uLnkvKGMuYmFzZVRleHR1cmUuaGVpZ2h0KmEudGlsZVNjYWxlT2Zmc2V0LnkpLGc9YS53aWR0aC9jLmJhc2VUZXh0dXJlLndpZHRoLyhhLnRpbGVTY2FsZS54KmEudGlsZVNjYWxlT2Zmc2V0LngpLGg9YS5oZWlnaHQvYy5iYXNlVGV4dHVyZS5oZWlnaHQvKGEudGlsZVNjYWxlLnkqYS50aWxlU2NhbGVPZmZzZXQueSk7ZC54MD0wLWUsZC55MD0wLWYsZC54MT0xKmctZSxkLnkxPTAtZixkLngyPTEqZy1lLGQueTI9MSpoLWYsZC54Mz0wLWUsZC55Mz0xKmgtZjt2YXIgaT1hLndvcmxkQWxwaGEsaj1hLnRpbnQsaz10aGlzLnZlcnRpY2VzLGw9YS53aWR0aCxtPWEuaGVpZ2h0LG49YS5hbmNob3IueCxvPWEuYW5jaG9yLnkscD1sKigxLW4pLHE9bCotbixyPW0qKDEtbykscz1tKi1vLHQ9NCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSx1PWEud29ybGRUcmFuc2Zvcm0sdj11LmEsdz11LmMseD11LmIseT11LmQsej11LnR4LEE9dS50eTtrW3QrK109dipxK3gqcyt6LGtbdCsrXT15KnMrdypxK0Esa1t0KytdPWQueDAsa1t0KytdPWQueTAsa1t0KytdPWksa1t0KytdPWosa1t0KytdPXYqcCt4KnMreixrW3QrK109eSpzK3cqcCtBLGtbdCsrXT1kLngxLGtbdCsrXT1kLnkxLGtbdCsrXT1pLGtbdCsrXT1qLGtbdCsrXT12KnAreCpyK3osa1t0KytdPXkqcit3KnArQSxrW3QrK109ZC54MixrW3QrK109ZC55MixrW3QrK109aSxrW3QrK109aixrW3QrK109dipxK3gqcit6LGtbdCsrXT15KnIrdypxK0Esa1t0KytdPWQueDMsa1t0KytdPWQueTMsa1t0KytdPWksa1t0KytdPWosdGhpcy50ZXh0dXJlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWMuYmFzZVRleHR1cmUsdGhpcy5ibGVuZE1vZGVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09YS5ibGVuZE1vZGUsdGhpcy5jdXJyZW50QmF0Y2hTaXplKyt9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZmx1c2g9ZnVuY3Rpb24oKXtpZigwIT09dGhpcy5jdXJyZW50QmF0Y2hTaXplKXt2YXIgYT10aGlzLmdsO2lmKHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcih0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5kZWZhdWx0U2hhZGVyKSx0aGlzLmRpcnR5KXt0aGlzLmRpcnR5PSExLGEuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpO3ZhciBiPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uO2EudW5pZm9ybTJmKHRoaXMuc2hhZGVyLnByb2plY3Rpb25WZWN0b3IsYi54LGIueSk7dmFyIGM9NCp0aGlzLnZlcnRTaXplO2EudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hVmVydGV4UG9zaXRpb24sMixhLkZMT0FULCExLGMsMCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFUZXh0dXJlQ29vcmQsMixhLkZMT0FULCExLGMsOCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmNvbG9yQXR0cmlidXRlLDIsYS5GTE9BVCwhMSxjLDE2KX1pZih0aGlzLmN1cnJlbnRCYXRjaFNpemU+LjUqdGhpcy5zaXplKWEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGljZXMpO2Vsc2V7dmFyIGQ9dGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLDQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUpO2EuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLGQpfWZvcih2YXIgZSxmLGc9MCxoPTAsaT1udWxsLGo9dGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuY3VycmVudEJsZW5kTW9kZSxrPTAsbD10aGlzLmN1cnJlbnRCYXRjaFNpemU7bD5rO2srKyllPXRoaXMudGV4dHVyZXNba10sZj10aGlzLmJsZW5kTW9kZXNba10sKGkhPT1lfHxqIT09ZikmJih0aGlzLnJlbmRlckJhdGNoKGksZyxoKSxoPWssZz0wLGk9ZSxqPWYsdGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKGopKSxnKys7dGhpcy5yZW5kZXJCYXRjaChpLGcsaCksdGhpcy5jdXJyZW50QmF0Y2hTaXplPTB9fSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlckJhdGNoPWZ1bmN0aW9uKGEsYyxkKXtpZigwIT09Yyl7dmFyIGU9dGhpcy5nbDtlLmJpbmRUZXh0dXJlKGUuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2UuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZShhLGUpKSxhLl9kaXJ0eVtlLmlkXSYmYi51cGRhdGVXZWJHTFRleHR1cmUodGhpcy5jdXJyZW50QmFzZVRleHR1cmUsZSksZS5kcmF3RWxlbWVudHMoZS5UUklBTkdMRVMsNipjLGUuVU5TSUdORURfU0hPUlQsNipkKjIpLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK319LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMuZmx1c2goKX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zdGFydD1mdW5jdGlvbigpe3RoaXMuZGlydHk9ITB9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMudmVydGljZXM9bnVsbCx0aGlzLmluZGljZXM9bnVsbCx0aGlzLmdsLmRlbGV0ZUJ1ZmZlcih0aGlzLnZlcnRleEJ1ZmZlciksdGhpcy5nbC5kZWxldGVCdWZmZXIodGhpcy5pbmRleEJ1ZmZlciksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9bnVsbCx0aGlzLmdsPW51bGx9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2g9ZnVuY3Rpb24oYSl7dGhpcy52ZXJ0U2l6ZT0xMCx0aGlzLm1heFNpemU9NmUzLHRoaXMuc2l6ZT10aGlzLm1heFNpemU7dmFyIGI9NCp0aGlzLnNpemUqdGhpcy52ZXJ0U2l6ZSxjPTYqdGhpcy5tYXhTaXplO3RoaXMudmVydGljZXM9bmV3IEZsb2F0MzJBcnJheShiKSx0aGlzLmluZGljZXM9bmV3IFVpbnQxNkFycmF5KGMpLHRoaXMudmVydGV4QnVmZmVyPW51bGwsdGhpcy5pbmRleEJ1ZmZlcj1udWxsLHRoaXMubGFzdEluZGV4Q291bnQ9MDtmb3IodmFyIGQ9MCxlPTA7Yz5kO2QrPTYsZSs9NCl0aGlzLmluZGljZXNbZCswXT1lKzAsdGhpcy5pbmRpY2VzW2QrMV09ZSsxLHRoaXMuaW5kaWNlc1tkKzJdPWUrMix0aGlzLmluZGljZXNbZCszXT1lKzAsdGhpcy5pbmRpY2VzW2QrNF09ZSsyLHRoaXMuaW5kaWNlc1tkKzVdPWUrMzt0aGlzLmRyYXdpbmc9ITEsdGhpcy5jdXJyZW50QmF0Y2hTaXplPTAsdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9bnVsbCx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9MCx0aGlzLnJlbmRlclNlc3Npb249bnVsbCx0aGlzLnNoYWRlcj1udWxsLHRoaXMubWF0cml4PW51bGwsdGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLnZlcnRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuaW5kZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGljZXMsYS5TVEFUSUNfRFJBVyksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNlcyxhLkRZTkFNSUNfRFJBVyl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLmJlZ2luPWZ1bmN0aW9uKGEsYil7dGhpcy5yZW5kZXJTZXNzaW9uPWIsdGhpcy5zaGFkZXI9dGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuZmFzdFNoYWRlcix0aGlzLm1hdHJpeD1hLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApLHRoaXMuc3RhcnQoKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7dmFyIGI9YS5jaGlsZHJlbixjPWJbMF07aWYoYy50ZXh0dXJlLl91dnMpe3RoaXMuY3VycmVudEJhc2VUZXh0dXJlPWMudGV4dHVyZS5iYXNlVGV4dHVyZSxjLmJsZW5kTW9kZSE9PXRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLmN1cnJlbnRCbGVuZE1vZGUmJih0aGlzLmZsdXNoKCksdGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKGMuYmxlbmRNb2RlKSk7Zm9yKHZhciBkPTAsZT1iLmxlbmd0aDtlPmQ7ZCsrKXRoaXMucmVuZGVyU3ByaXRlKGJbZF0pO3RoaXMuZmx1c2goKX19LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlclNwcml0ZT1mdW5jdGlvbihhKXtpZihhLnZpc2libGUmJihhLnRleHR1cmUuYmFzZVRleHR1cmU9PT10aGlzLmN1cnJlbnRCYXNlVGV4dHVyZXx8KHRoaXMuZmx1c2goKSx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1hLnRleHR1cmUuYmFzZVRleHR1cmUsYS50ZXh0dXJlLl91dnMpKSl7dmFyIGIsYyxkLGUsZixnLGgsaSxqPXRoaXMudmVydGljZXM7aWYoYj1hLnRleHR1cmUuX3V2cyxjPWEudGV4dHVyZS5mcmFtZS53aWR0aCxkPWEudGV4dHVyZS5mcmFtZS5oZWlnaHQsYS50ZXh0dXJlLnRyaW0pe3ZhciBrPWEudGV4dHVyZS50cmltO2Y9ay54LWEuYW5jaG9yLngqay53aWR0aCxlPWYrYS50ZXh0dXJlLmNyb3Aud2lkdGgsaD1rLnktYS5hbmNob3IueSprLmhlaWdodCxnPWgrYS50ZXh0dXJlLmNyb3AuaGVpZ2h0fWVsc2UgZT1hLnRleHR1cmUuZnJhbWUud2lkdGgqKDEtYS5hbmNob3IueCksZj1hLnRleHR1cmUuZnJhbWUud2lkdGgqLWEuYW5jaG9yLngsZz1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0KigxLWEuYW5jaG9yLnkpLGg9YS50ZXh0dXJlLmZyYW1lLmhlaWdodCotYS5hbmNob3IueTtpPTQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUsaltpKytdPWYsaltpKytdPWgsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MCxqW2krK109Yi55MSxqW2krK109YS5hbHBoYSxqW2krK109ZSxqW2krK109aCxqW2krK109YS5wb3NpdGlvbi54LGpbaSsrXT1hLnBvc2l0aW9uLnksaltpKytdPWEuc2NhbGUueCxqW2krK109YS5zY2FsZS55LGpbaSsrXT1hLnJvdGF0aW9uLGpbaSsrXT1iLngxLGpbaSsrXT1iLnkxLGpbaSsrXT1hLmFscGhhLGpbaSsrXT1lLGpbaSsrXT1nLGpbaSsrXT1hLnBvc2l0aW9uLngsaltpKytdPWEucG9zaXRpb24ueSxqW2krK109YS5zY2FsZS54LGpbaSsrXT1hLnNjYWxlLnksaltpKytdPWEucm90YXRpb24saltpKytdPWIueDIsaltpKytdPWIueTIsaltpKytdPWEuYWxwaGEsaltpKytdPWYsaltpKytdPWcsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MyxqW2krK109Yi55MyxqW2krK109YS5hbHBoYSx0aGlzLmN1cnJlbnRCYXRjaFNpemUrKyx0aGlzLmN1cnJlbnRCYXRjaFNpemU+PXRoaXMuc2l6ZSYmdGhpcy5mbHVzaCgpfX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuZmx1c2g9ZnVuY3Rpb24oKXtpZigwIT09dGhpcy5jdXJyZW50QmF0Y2hTaXplKXt2YXIgYT10aGlzLmdsO2lmKHRoaXMuY3VycmVudEJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2EuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZSh0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZSxhKSxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1thLmlkXSksdGhpcy5jdXJyZW50QmF0Y2hTaXplPi41KnRoaXMuc2l6ZSlhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRpY2VzKTtlbHNle3ZhciBjPXRoaXMudmVydGljZXMuc3ViYXJyYXkoMCw0KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplKTthLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCxjKX1hLmRyYXdFbGVtZW50cyhhLlRSSUFOR0xFUyw2KnRoaXMuY3VycmVudEJhdGNoU2l6ZSxhLlVOU0lHTkVEX1NIT1JULDApLHRoaXMuY3VycmVudEJhdGNoU2l6ZT0wLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK319LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0b3A9ZnVuY3Rpb24oKXt0aGlzLmZsdXNoKCl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0YXJ0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDthLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKTt2YXIgYj10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbjthLnVuaWZvcm0yZih0aGlzLnNoYWRlci5wcm9qZWN0aW9uVmVjdG9yLGIueCxiLnkpLGEudW5pZm9ybU1hdHJpeDNmdih0aGlzLnNoYWRlci51TWF0cml4LCExLHRoaXMubWF0cml4KTt2YXIgYz00KnRoaXMudmVydFNpemU7YS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFWZXJ0ZXhQb3NpdGlvbiwyLGEuRkxPQVQsITEsYywwKSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVBvc2l0aW9uQ29vcmQsMixhLkZMT0FULCExLGMsOCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFTY2FsZSwyLGEuRkxPQVQsITEsYywxNiksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFSb3RhdGlvbiwxLGEuRkxPQVQsITEsYywyNCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFUZXh0dXJlQ29vcmQsMixhLkZMT0FULCExLGMsMjgpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5jb2xvckF0dHJpYnV0ZSwxLGEuRkxPQVQsITEsYywzNil9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyPWZ1bmN0aW9uKGEsYil7dGhpcy50cmFuc3BhcmVudD1iLHRoaXMuZmlsdGVyU3RhY2s9W10sdGhpcy5vZmZzZXRYPTAsdGhpcy5vZmZzZXRZPTAsdGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy50ZXh0dXJlUG9vbD1bXSx0aGlzLmluaXRTaGFkZXJCdWZmZXJzKCl9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5iZWdpbj1mdW5jdGlvbihhLGIpe3RoaXMucmVuZGVyU2Vzc2lvbj1hLHRoaXMuZGVmYXVsdFNoYWRlcj1hLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlcjt2YXIgYz10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbjt0aGlzLndpZHRoPTIqYy54LHRoaXMuaGVpZ2h0PTIqLWMueSx0aGlzLmJ1ZmZlcj1ifSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUucHVzaEZpbHRlcj1mdW5jdGlvbihhKXt2YXIgYz10aGlzLmdsLGQ9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb24sZT10aGlzLnJlbmRlclNlc3Npb24ub2Zmc2V0O2EuX2ZpbHRlckFyZWE9YS50YXJnZXQuZmlsdGVyQXJlYXx8YS50YXJnZXQuZ2V0Qm91bmRzKCksdGhpcy5maWx0ZXJTdGFjay5wdXNoKGEpO3ZhciBmPWEuZmlsdGVyUGFzc2VzWzBdO3RoaXMub2Zmc2V0WCs9YS5fZmlsdGVyQXJlYS54LHRoaXMub2Zmc2V0WSs9YS5fZmlsdGVyQXJlYS55O3ZhciBnPXRoaXMudGV4dHVyZVBvb2wucG9wKCk7Zz9nLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KTpnPW5ldyBiLkZpbHRlclRleHR1cmUodGhpcy5nbCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxnLnRleHR1cmUpO3ZhciBoPWEuX2ZpbHRlckFyZWEsaT1mLnBhZGRpbmc7aC54LT1pLGgueS09aSxoLndpZHRoKz0yKmksaC5oZWlnaHQrPTIqaSxoLng8MCYmKGgueD0wKSxoLndpZHRoPnRoaXMud2lkdGgmJihoLndpZHRoPXRoaXMud2lkdGgpLGgueTwwJiYoaC55PTApLGguaGVpZ2h0PnRoaXMuaGVpZ2h0JiYoaC5oZWlnaHQ9dGhpcy5oZWlnaHQpLGMuYmluZEZyYW1lYnVmZmVyKGMuRlJBTUVCVUZGRVIsZy5mcmFtZUJ1ZmZlciksYy52aWV3cG9ydCgwLDAsaC53aWR0aCxoLmhlaWdodCksZC54PWgud2lkdGgvMixkLnk9LWguaGVpZ2h0LzIsZS54PS1oLngsZS55PS1oLnksdGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKHRoaXMuZGVmYXVsdFNoYWRlciksYy51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLnByb2plY3Rpb25WZWN0b3IsaC53aWR0aC8yLC1oLmhlaWdodC8yKSxjLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIub2Zmc2V0VmVjdG9yLC1oLngsLWgueSksYy5jb2xvck1hc2soITAsITAsITAsITApLGMuY2xlYXJDb2xvcigwLDAsMCwwKSxjLmNsZWFyKGMuQ09MT1JfQlVGRkVSX0JJVCksYS5fZ2xGaWx0ZXJUZXh0dXJlPWd9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5wb3BGaWx0ZXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9dGhpcy5maWx0ZXJTdGFjay5wb3AoKSxkPWMuX2ZpbHRlckFyZWEsZT1jLl9nbEZpbHRlclRleHR1cmUsZj10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbixnPXRoaXMucmVuZGVyU2Vzc2lvbi5vZmZzZXQ7aWYoYy5maWx0ZXJQYXNzZXMubGVuZ3RoPjEpe2Eudmlld3BvcnQoMCwwLGQud2lkdGgsZC5oZWlnaHQpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksdGhpcy52ZXJ0ZXhBcnJheVswXT0wLHRoaXMudmVydGV4QXJyYXlbMV09ZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVsyXT1kLndpZHRoLHRoaXMudmVydGV4QXJyYXlbM109ZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVs0XT0wLHRoaXMudmVydGV4QXJyYXlbNV09MCx0aGlzLnZlcnRleEFycmF5WzZdPWQud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVs3XT0wLGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGV4QXJyYXkpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSx0aGlzLnV2QXJyYXlbMl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs1XT1kLmhlaWdodC90aGlzLmhlaWdodCx0aGlzLnV2QXJyYXlbNl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs3XT1kLmhlaWdodC90aGlzLmhlaWdodCxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnV2QXJyYXkpO3ZhciBoPWUsaT10aGlzLnRleHR1cmVQb29sLnBvcCgpO2l8fChpPW5ldyBiLkZpbHRlclRleHR1cmUodGhpcy5nbCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSksaS5yZXNpemUodGhpcy53aWR0aCx0aGlzLmhlaWdodCksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUixpLmZyYW1lQnVmZmVyKSxhLmNsZWFyKGEuQ09MT1JfQlVGRkVSX0JJVCksYS5kaXNhYmxlKGEuQkxFTkQpO2Zvcih2YXIgaj0wO2o8Yy5maWx0ZXJQYXNzZXMubGVuZ3RoLTE7aisrKXt2YXIgaz1jLmZpbHRlclBhc3Nlc1tqXTthLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLGkuZnJhbWVCdWZmZXIpLGEuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCxoLnRleHR1cmUpLHRoaXMuYXBwbHlGaWx0ZXJQYXNzKGssZCxkLndpZHRoLGQuaGVpZ2h0KTt2YXIgbD1oO2g9aSxpPWx9YS5lbmFibGUoYS5CTEVORCksZT1oLHRoaXMudGV4dHVyZVBvb2wucHVzaChpKX12YXIgbT1jLmZpbHRlclBhc3Nlc1tjLmZpbHRlclBhc3Nlcy5sZW5ndGgtMV07dGhpcy5vZmZzZXRYLT1kLngsdGhpcy5vZmZzZXRZLT1kLnk7dmFyIG49dGhpcy53aWR0aCxvPXRoaXMuaGVpZ2h0LHA9MCxxPTAscj10aGlzLmJ1ZmZlcjtpZigwPT09dGhpcy5maWx0ZXJTdGFjay5sZW5ndGgpYS5jb2xvck1hc2soITAsITAsITAsITApO2Vsc2V7dmFyIHM9dGhpcy5maWx0ZXJTdGFja1t0aGlzLmZpbHRlclN0YWNrLmxlbmd0aC0xXTtkPXMuX2ZpbHRlckFyZWEsbj1kLndpZHRoLG89ZC5oZWlnaHQscD1kLngscT1kLnkscj1zLl9nbEZpbHRlclRleHR1cmUuZnJhbWVCdWZmZXJ9Zi54PW4vMixmLnk9LW8vMixnLng9cCxnLnk9cSxkPWMuX2ZpbHRlckFyZWE7dmFyIHQ9ZC54LXAsdT1kLnktcTthLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLHRoaXMudmVydGV4QXJyYXlbMF09dCx0aGlzLnZlcnRleEFycmF5WzFdPXUrZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVsyXT10K2Qud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVszXT11K2QuaGVpZ2h0LHRoaXMudmVydGV4QXJyYXlbNF09dCx0aGlzLnZlcnRleEFycmF5WzVdPXUsdGhpcy52ZXJ0ZXhBcnJheVs2XT10K2Qud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVs3XT11LGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGV4QXJyYXkpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSx0aGlzLnV2QXJyYXlbMl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs1XT1kLmhlaWdodC90aGlzLmhlaWdodCx0aGlzLnV2QXJyYXlbNl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs3XT1kLmhlaWdodC90aGlzLmhlaWdodCxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnV2QXJyYXkpLGEudmlld3BvcnQoMCwwLG4sbyksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUixyKSxhLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kVGV4dHVyZShhLlRFWFRVUkVfMkQsZS50ZXh0dXJlKSx0aGlzLmFwcGx5RmlsdGVyUGFzcyhtLGQsbixvKSx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIodGhpcy5kZWZhdWx0U2hhZGVyKSxhLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIucHJvamVjdGlvblZlY3RvcixuLzIsLW8vMiksYS51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLm9mZnNldFZlY3RvciwtcCwtcSksdGhpcy50ZXh0dXJlUG9vbC5wdXNoKGUpLGMuX2dsRmlsdGVyVGV4dHVyZT1udWxsfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuYXBwbHlGaWx0ZXJQYXNzPWZ1bmN0aW9uKGEsYyxkLGUpe3ZhciBmPXRoaXMuZ2wsZz1hLnNoYWRlcnNbZi5pZF07Z3x8KGc9bmV3IGIuUGl4aVNoYWRlcihmKSxnLmZyYWdtZW50U3JjPWEuZnJhZ21lbnRTcmMsZy51bmlmb3Jtcz1hLnVuaWZvcm1zLGcuaW5pdCgpLGEuc2hhZGVyc1tmLmlkXT1nKSx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoZyksZi51bmlmb3JtMmYoZy5wcm9qZWN0aW9uVmVjdG9yLGQvMiwtZS8yKSxmLnVuaWZvcm0yZihnLm9mZnNldFZlY3RvciwwLDApLGEudW5pZm9ybXMuZGltZW5zaW9ucyYmKGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVswXT10aGlzLndpZHRoLGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVsxXT10aGlzLmhlaWdodCxhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbMl09dGhpcy52ZXJ0ZXhBcnJheVswXSxhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbM109dGhpcy52ZXJ0ZXhBcnJheVs1XSksZy5zeW5jVW5pZm9ybXMoKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihnLmFWZXJ0ZXhQb3NpdGlvbiwyLGYuRkxPQVQsITEsMCwwKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy51dkJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGcuYVRleHR1cmVDb29yZCwyLGYuRkxPQVQsITEsMCwwKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvckJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGcuY29sb3JBdHRyaWJ1dGUsMixmLkZMT0FULCExLDAsMCksZi5iaW5kQnVmZmVyKGYuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksZi5kcmF3RWxlbWVudHMoZi5UUklBTkdMRVMsNixmLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK30sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLmluaXRTaGFkZXJCdWZmZXJzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDt0aGlzLnZlcnRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMudXZCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmNvbG9yQnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMudmVydGV4QXJyYXk9bmV3IEZsb2F0MzJBcnJheShbMCwwLDEsMCwwLDEsMSwxXSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhBcnJheSxhLlNUQVRJQ19EUkFXKSx0aGlzLnV2QXJyYXk9bmV3IEZsb2F0MzJBcnJheShbMCwwLDEsMCwwLDEsMSwxXSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudXZCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnV2QXJyYXksYS5TVEFUSUNfRFJBVyksdGhpcy5jb2xvckFycmF5PW5ldyBGbG9hdDMyQXJyYXkoWzEsMTY3NzcyMTUsMSwxNjc3NzIxNSwxLDE2Nzc3MjE1LDEsMTY3NzcyMTVdKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvckJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMuY29sb3JBcnJheSxhLlNUQVRJQ19EUkFXKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUixuZXcgVWludDE2QXJyYXkoWzAsMSwyLDEsMywyXSksYS5TVEFUSUNfRFJBVyl9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDt0aGlzLmZpbHRlclN0YWNrPW51bGwsdGhpcy5vZmZzZXRYPTAsdGhpcy5vZmZzZXRZPTA7Zm9yKHZhciBiPTA7Yjx0aGlzLnRleHR1cmVQb29sLmxlbmd0aDtiKyspdGhpcy50ZXh0dXJlUG9vbFtiXS5kZXN0cm95KCk7dGhpcy50ZXh0dXJlUG9vbD1udWxsLGEuZGVsZXRlQnVmZmVyKHRoaXMudmVydGV4QnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLnV2QnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLmNvbG9yQnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLmluZGV4QnVmZmVyKX0sYi5GaWx0ZXJUZXh0dXJlPWZ1bmN0aW9uKGEsYyxkLGUpe3RoaXMuZ2w9YSx0aGlzLmZyYW1lQnVmZmVyPWEuY3JlYXRlRnJhbWVidWZmZXIoKSx0aGlzLnRleHR1cmU9YS5jcmVhdGVUZXh0dXJlKCksZT1lfHxiLnNjYWxlTW9kZXMuREVGQVVMVCxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUpLGEudGV4UGFyYW1ldGVyaShhLlRFWFRVUkVfMkQsYS5URVhUVVJFX01BR19GSUxURVIsZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/YS5MSU5FQVI6YS5ORUFSRVNUKSxhLnRleFBhcmFtZXRlcmkoYS5URVhUVVJFXzJELGEuVEVYVFVSRV9NSU5fRklMVEVSLGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2EuTElORUFSOmEuTkVBUkVTVCksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfV1JBUF9TLGEuQ0xBTVBfVE9fRURHRSksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfV1JBUF9ULGEuQ0xBTVBfVE9fRURHRSksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUix0aGlzLmZyYW1lYnVmZmVyKSxhLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLHRoaXMuZnJhbWVCdWZmZXIpLGEuZnJhbWVidWZmZXJUZXh0dXJlMkQoYS5GUkFNRUJVRkZFUixhLkNPTE9SX0FUVEFDSE1FTlQwLGEuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUsMCksdGhpcy5yZW5kZXJCdWZmZXI9YS5jcmVhdGVSZW5kZXJidWZmZXIoKSxhLmJpbmRSZW5kZXJidWZmZXIoYS5SRU5ERVJCVUZGRVIsdGhpcy5yZW5kZXJCdWZmZXIpLGEuZnJhbWVidWZmZXJSZW5kZXJidWZmZXIoYS5GUkFNRUJVRkZFUixhLkRFUFRIX1NURU5DSUxfQVRUQUNITUVOVCxhLlJFTkRFUkJVRkZFUix0aGlzLnJlbmRlckJ1ZmZlciksdGhpcy5yZXNpemUoYyxkKX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7YS5jbGVhckNvbG9yKDAsMCwwLDApLGEuY2xlYXIoYS5DT0xPUl9CVUZGRVJfQklUKX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLndpZHRoIT09YXx8dGhpcy5oZWlnaHQhPT1iKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yjt2YXIgYz10aGlzLmdsO2MuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZSksYy50ZXhJbWFnZTJEKGMuVEVYVFVSRV8yRCwwLGMuUkdCQSxhLGIsMCxjLlJHQkEsYy5VTlNJR05FRF9CWVRFLG51bGwpLGMuYmluZFJlbmRlcmJ1ZmZlcihjLlJFTkRFUkJVRkZFUix0aGlzLnJlbmRlckJ1ZmZlciksYy5yZW5kZXJidWZmZXJTdG9yYWdlKGMuUkVOREVSQlVGRkVSLGMuREVQVEhfU1RFTkNJTCxhLGIpfX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDthLmRlbGV0ZUZyYW1lYnVmZmVyKHRoaXMuZnJhbWVCdWZmZXIpLGEuZGVsZXRlVGV4dHVyZSh0aGlzLnRleHR1cmUpLHRoaXMuZnJhbWVCdWZmZXI9bnVsbCx0aGlzLnRleHR1cmU9bnVsbH0sYi5DYW52YXNNYXNrTWFuYWdlcj1mdW5jdGlvbigpe30sYi5DYW52YXNNYXNrTWFuYWdlci5wcm90b3R5cGUucHVzaE1hc2s9ZnVuY3Rpb24oYSxjKXtjLnNhdmUoKTt2YXIgZD1hLmFscGhhLGU9YS53b3JsZFRyYW5zZm9ybTtjLnNldFRyYW5zZm9ybShlLmEsZS5jLGUuYixlLmQsZS50eCxlLnR5KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzTWFzayhhLGMpLGMuY2xpcCgpLGEud29ybGRBbHBoYT1kfSxiLkNhbnZhc01hc2tNYW5hZ2VyLnByb3RvdHlwZS5wb3BNYXNrPWZ1bmN0aW9uKGEpe2EucmVzdG9yZSgpfSxiLkNhbnZhc1RpbnRlcj1mdW5jdGlvbigpe30sYi5DYW52YXNUaW50ZXIuZ2V0VGludGVkVGV4dHVyZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEudGV4dHVyZTtjPWIuQ2FudmFzVGludGVyLnJvdW5kQ29sb3IoYyk7dmFyIGU9XCIjXCIrKFwiMDAwMDBcIisoMHxjKS50b1N0cmluZygxNikpLnN1YnN0cigtNik7aWYoZC50aW50Q2FjaGU9ZC50aW50Q2FjaGV8fHt9LGQudGludENhY2hlW2VdKXJldHVybiBkLnRpbnRDYWNoZVtlXTt2YXIgZj1iLkNhbnZhc1RpbnRlci5jYW52YXN8fGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7aWYoYi5DYW52YXNUaW50ZXIudGludE1ldGhvZChkLGMsZiksYi5DYW52YXNUaW50ZXIuY29udmVydFRpbnRUb0ltYWdlKXt2YXIgZz1uZXcgSW1hZ2U7Zy5zcmM9Zi50b0RhdGFVUkwoKSxkLnRpbnRDYWNoZVtlXT1nfWVsc2UgZC50aW50Q2FjaGVbZV09ZixiLkNhbnZhc1RpbnRlci5jYW52YXM9bnVsbDtyZXR1cm4gZn0sYi5DYW52YXNUaW50ZXIudGludFdpdGhNdWx0aXBseT1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yy5nZXRDb250ZXh0KFwiMmRcIiksZT1hLmZyYW1lO2Mud2lkdGg9ZS53aWR0aCxjLmhlaWdodD1lLmhlaWdodCxkLmZpbGxTdHlsZT1cIiNcIisoXCIwMDAwMFwiKygwfGIpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxkLmZpbGxSZWN0KDAsMCxlLndpZHRoLGUuaGVpZ2h0KSxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cIm11bHRpcGx5XCIsZC5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZS54LGUueSxlLndpZHRoLGUuaGVpZ2h0LDAsMCxlLndpZHRoLGUuaGVpZ2h0KSxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImRlc3RpbmF0aW9uLWF0b3BcIixkLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxlLngsZS55LGUud2lkdGgsZS5oZWlnaHQsMCwwLGUud2lkdGgsZS5oZWlnaHQpfSxiLkNhbnZhc1RpbnRlci50aW50V2l0aE92ZXJsYXk9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWMuZ2V0Q29udGV4dChcIjJkXCIpLGU9YS5mcmFtZTtjLndpZHRoPWUud2lkdGgsYy5oZWlnaHQ9ZS5oZWlnaHQsZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJjb3B5XCIsZC5maWxsU3R5bGU9XCIjXCIrKFwiMDAwMDBcIisoMHxiKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksZC5maWxsUmVjdCgwLDAsZS53aWR0aCxlLmhlaWdodCksZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJkZXN0aW5hdGlvbi1hdG9wXCIsZC5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZS54LGUueSxlLndpZHRoLGUuaGVpZ2h0LDAsMCxlLndpZHRoLGUuaGVpZ2h0KX0sYi5DYW52YXNUaW50ZXIudGludFdpdGhQZXJQaXhlbD1mdW5jdGlvbihhLGMsZCl7dmFyIGU9ZC5nZXRDb250ZXh0KFwiMmRcIiksZj1hLmZyYW1lO2Qud2lkdGg9Zi53aWR0aCxkLmhlaWdodD1mLmhlaWdodCxlLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImNvcHlcIixlLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxmLngsZi55LGYud2lkdGgsZi5oZWlnaHQsMCwwLGYud2lkdGgsZi5oZWlnaHQpO2Zvcih2YXIgZz1iLmhleDJyZ2IoYyksaD1nWzBdLGk9Z1sxXSxqPWdbMl0saz1lLmdldEltYWdlRGF0YSgwLDAsZi53aWR0aCxmLmhlaWdodCksbD1rLmRhdGEsbT0wO208bC5sZW5ndGg7bSs9NClsW20rMF0qPWgsbFttKzFdKj1pLGxbbSsyXSo9ajtlLnB1dEltYWdlRGF0YShrLDAsMCl9LGIuQ2FudmFzVGludGVyLnJvdW5kQ29sb3I9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5DYW52YXNUaW50ZXIuY2FjaGVTdGVwc1BlckNvbG9yQ2hhbm5lbCxkPWIuaGV4MnJnYihhKTtyZXR1cm4gZFswXT1NYXRoLm1pbigyNTUsZFswXS9jKmMpLGRbMV09TWF0aC5taW4oMjU1LGRbMV0vYypjKSxkWzJdPU1hdGgubWluKDI1NSxkWzJdL2MqYyksYi5yZ2IyaGV4KGQpfSxiLkNhbnZhc1RpbnRlci5jYWNoZVN0ZXBzUGVyQ29sb3JDaGFubmVsPTgsYi5DYW52YXNUaW50ZXIuY29udmVydFRpbnRUb0ltYWdlPSExLGIuQ2FudmFzVGludGVyLmNhblVzZU11bHRpcGx5PWIuY2FuVXNlTmV3Q2FudmFzQmxlbmRNb2RlcygpLGIuQ2FudmFzVGludGVyLnRpbnRNZXRob2Q9Yi5DYW52YXNUaW50ZXIuY2FuVXNlTXVsdGlwbHk/Yi5DYW52YXNUaW50ZXIudGludFdpdGhNdWx0aXBseTpiLkNhbnZhc1RpbnRlci50aW50V2l0aFBlclBpeGVsLGIuQ2FudmFzUmVuZGVyZXI9ZnVuY3Rpb24oYSxjLGQsZSl7Yi5kZWZhdWx0UmVuZGVyZXJ8fChiLnNheUhlbGxvKFwiQ2FudmFzXCIpLGIuZGVmYXVsdFJlbmRlcmVyPXRoaXMpLHRoaXMudHlwZT1iLkNBTlZBU19SRU5ERVJFUix0aGlzLmNsZWFyQmVmb3JlUmVuZGVyPSEwLHRoaXMudHJhbnNwYXJlbnQ9ISFlLGIuYmxlbmRNb2Rlc0NhbnZhc3x8KGIuYmxlbmRNb2Rlc0NhbnZhcz1bXSxiLmNhblVzZU5ld0NhbnZhc0JsZW5kTW9kZXMoKT8oYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5OT1JNQUxdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkFERF09XCJsaWdodGVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5NVUxUSVBMWV09XCJtdWx0aXBseVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0NSRUVOXT1cInNjcmVlblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuT1ZFUkxBWV09XCJvdmVybGF5XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVwiZGFya2VuXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5MSUdIVEVOXT1cImxpZ2h0ZW5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0RPREdFXT1cImNvbG9yLWRvZGdlXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1cImNvbG9yLWJ1cm5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhBUkRfTElHSFRdPVwiaGFyZC1saWdodFwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU09GVF9MSUdIVF09XCJzb2Z0LWxpZ2h0XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1cImRpZmZlcmVuY2VcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkVYQ0xVU0lPTl09XCJleGNsdXNpb25cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhVRV09XCJodWVcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNBVFVSQVRJT05dPVwic2F0dXJhdGlvblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JdPVwiY29sb3JcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxVTUlOT1NJVFldPVwibHVtaW5vc2l0eVwiKTooYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5OT1JNQUxdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkFERF09XCJsaWdodGVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5NVUxUSVBMWV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0NSRUVOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5PVkVSTEFZXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxJR0hURU5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0RPREdFXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5IQVJEX0xJR0hUXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TT0ZUX0xJR0hUXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5FWENMVVNJT05dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhVRV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0FUVVJBVElPTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxVTUlOT1NJVFldPVwic291cmNlLW92ZXJcIikpLHRoaXMud2lkdGg9YXx8ODAwLHRoaXMuaGVpZ2h0PWN8fDYwMCx0aGlzLnZpZXc9ZHx8ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSx0aGlzLmNvbnRleHQ9dGhpcy52aWV3LmdldENvbnRleHQoXCIyZFwiLHthbHBoYTp0aGlzLnRyYW5zcGFyZW50fSksdGhpcy5yZWZyZXNoPSEwLHRoaXMudmlldy53aWR0aD10aGlzLndpZHRoLHRoaXMudmlldy5oZWlnaHQ9dGhpcy5oZWlnaHQsdGhpcy5jb3VudD0wLHRoaXMubWFza01hbmFnZXI9bmV3IGIuQ2FudmFzTWFza01hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uPXtjb250ZXh0OnRoaXMuY29udGV4dCxtYXNrTWFuYWdlcjp0aGlzLm1hc2tNYW5hZ2VyLHNjYWxlTW9kZTpudWxsLHNtb290aFByb3BlcnR5Om51bGwscm91bmRQaXhlbHM6ITF9LFwiaW1hZ2VTbW9vdGhpbmdFbmFibGVkXCJpbiB0aGlzLmNvbnRleHQ/dGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwiaW1hZ2VTbW9vdGhpbmdFbmFibGVkXCI6XCJ3ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWRcImluIHRoaXMuY29udGV4dD90aGlzLnJlbmRlclNlc3Npb24uc21vb3RoUHJvcGVydHk9XCJ3ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWRcIjpcIm1vekltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0P3RoaXMucmVuZGVyU2Vzc2lvbi5zbW9vdGhQcm9wZXJ0eT1cIm1vekltYWdlU21vb3RoaW5nRW5hYmxlZFwiOlwib0ltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0JiYodGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwib0ltYWdlU21vb3RoaW5nRW5hYmxlZFwiKX0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5DYW52YXNSZW5kZXJlcixiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7Yi50ZXh0dXJlc1RvVXBkYXRlLmxlbmd0aD0wLGIudGV4dHVyZXNUb0Rlc3Ryb3kubGVuZ3RoPTAsYS51cGRhdGVUcmFuc2Zvcm0oKSx0aGlzLmNvbnRleHQuc2V0VHJhbnNmb3JtKDEsMCwwLDEsMCwwKSx0aGlzLmNvbnRleHQuZ2xvYmFsQWxwaGE9MSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmdGhpcy52aWV3LnNjcmVlbmNhbnZhcyYmKHRoaXMuY29udGV4dC5maWxsU3R5bGU9XCJibGFja1wiLHRoaXMuY29udGV4dC5jbGVhcigpKSwhdGhpcy50cmFuc3BhcmVudCYmdGhpcy5jbGVhckJlZm9yZVJlbmRlcj8odGhpcy5jb250ZXh0LmZpbGxTdHlsZT1hLmJhY2tncm91bmRDb2xvclN0cmluZyx0aGlzLmNvbnRleHQuZmlsbFJlY3QoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpKTp0aGlzLnRyYW5zcGFyZW50JiZ0aGlzLmNsZWFyQmVmb3JlUmVuZGVyJiZ0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLnJlbmRlckRpc3BsYXlPYmplY3QoYSksYS5pbnRlcmFjdGl2ZSYmKGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWR8fChhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSEwLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSkpLGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMubGVuZ3RoPjAmJihiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aD0wKVxyXG59LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGIpe3RoaXMud2lkdGg9YSx0aGlzLmhlaWdodD1iLHRoaXMudmlldy53aWR0aD1hLHRoaXMudmlldy5oZWlnaHQ9Yn0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyRGlzcGxheU9iamVjdD1mdW5jdGlvbihhLGIpe3RoaXMucmVuZGVyU2Vzc2lvbi5jb250ZXh0PWJ8fHRoaXMuY29udGV4dCxhLl9yZW5kZXJDYW52YXModGhpcy5yZW5kZXJTZXNzaW9uKX0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyU3RyaXBGbGF0PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuY29udGV4dCxjPWEudmVydGljaWVzLGQ9Yy5sZW5ndGgvMjt0aGlzLmNvdW50KyssYi5iZWdpblBhdGgoKTtmb3IodmFyIGU9MTtkLTI+ZTtlKyspe3ZhciBmPTIqZSxnPWNbZl0saD1jW2YrMl0saT1jW2YrNF0saj1jW2YrMV0saz1jW2YrM10sbD1jW2YrNV07Yi5tb3ZlVG8oZyxqKSxiLmxpbmVUbyhoLGspLGIubGluZVRvKGksbCl9Yi5maWxsU3R5bGU9XCIjRkYwMDAwXCIsYi5maWxsKCksYi5jbG9zZVBhdGgoKX0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyU3RyaXA9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5jb250ZXh0LGM9YS52ZXJ0aWNpZXMsZD1hLnV2cyxlPWMubGVuZ3RoLzI7dGhpcy5jb3VudCsrO2Zvcih2YXIgZj0xO2UtMj5mO2YrKyl7dmFyIGc9MipmLGg9Y1tnXSxpPWNbZysyXSxqPWNbZys0XSxrPWNbZysxXSxsPWNbZyszXSxtPWNbZys1XSxuPWRbZ10qYS50ZXh0dXJlLndpZHRoLG89ZFtnKzJdKmEudGV4dHVyZS53aWR0aCxwPWRbZys0XSphLnRleHR1cmUud2lkdGgscT1kW2crMV0qYS50ZXh0dXJlLmhlaWdodCxyPWRbZyszXSphLnRleHR1cmUuaGVpZ2h0LHM9ZFtnKzVdKmEudGV4dHVyZS5oZWlnaHQ7Yi5zYXZlKCksYi5iZWdpblBhdGgoKSxiLm1vdmVUbyhoLGspLGIubGluZVRvKGksbCksYi5saW5lVG8oaixtKSxiLmNsb3NlUGF0aCgpLGIuY2xpcCgpO3ZhciB0PW4qcitxKnArbypzLXIqcC1xKm8tbipzLHU9aCpyK3EqaitpKnMtcipqLXEqaS1oKnMsdj1uKmkraCpwK28qai1pKnAtaCpvLW4qaix3PW4qcipqK3EqaSpwK2gqbypzLWgqcipwLXEqbypqLW4qaSpzLHg9aypyK3EqbStsKnMtciptLXEqbC1rKnMseT1uKmwraypwK28qbS1sKnAtaypvLW4qbSx6PW4qciptK3EqbCpwK2sqbypzLWsqcipwLXEqbyptLW4qbCpzO2IudHJhbnNmb3JtKHUvdCx4L3Qsdi90LHkvdCx3L3Qsei90KSxiLmRyYXdJbWFnZShhLnRleHR1cmUuYmFzZVRleHR1cmUuc291cmNlLDAsMCksYi5yZXN0b3JlKCl9fSxiLkNhbnZhc0J1ZmZlcj1mdW5jdGlvbihhLGIpe3RoaXMud2lkdGg9YSx0aGlzLmhlaWdodD1iLHRoaXMuY2FudmFzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy5jb250ZXh0PXRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSx0aGlzLmNhbnZhcy53aWR0aD1hLHRoaXMuY2FudmFzLmhlaWdodD1ifSxiLkNhbnZhc0J1ZmZlci5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5DYW52YXNCdWZmZXIucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGIpe3RoaXMud2lkdGg9dGhpcy5jYW52YXMud2lkdGg9YSx0aGlzLmhlaWdodD10aGlzLmNhbnZhcy5oZWlnaHQ9Yn0sYi5DYW52YXNHcmFwaGljcz1mdW5jdGlvbigpe30sYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljcz1mdW5jdGlvbihhLGMpe2Zvcih2YXIgZD1hLndvcmxkQWxwaGEsZT1cIlwiLGY9MDtmPGEuZ3JhcGhpY3NEYXRhLmxlbmd0aDtmKyspe3ZhciBnPWEuZ3JhcGhpY3NEYXRhW2ZdLGg9Zy5wb2ludHM7aWYoYy5zdHJva2VTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5saW5lQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmxpbmVXaWR0aD1nLmxpbmVXaWR0aCxnLnR5cGU9PT1iLkdyYXBoaWNzLlBPTFkpe2MuYmVnaW5QYXRoKCksYy5tb3ZlVG8oaFswXSxoWzFdKTtmb3IodmFyIGk9MTtpPGgubGVuZ3RoLzI7aSsrKWMubGluZVRvKGhbMippXSxoWzIqaSsxXSk7aFswXT09PWhbaC5sZW5ndGgtMl0mJmhbMV09PT1oW2gubGVuZ3RoLTFdJiZjLmNsb3NlUGF0aCgpLGcuZmlsbCYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGwoKSksZy5saW5lV2lkdGgmJihjLmdsb2JhbEFscGhhPWcubGluZUFscGhhKmQsYy5zdHJva2UoKSl9ZWxzZSBpZihnLnR5cGU9PT1iLkdyYXBoaWNzLlJFQ1QpKGcuZmlsbENvbG9yfHwwPT09Zy5maWxsQ29sb3IpJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbFJlY3QoaFswXSxoWzFdLGhbMl0saFszXSkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlUmVjdChoWzBdLGhbMV0saFsyXSxoWzNdKSk7ZWxzZSBpZihnLnR5cGU9PT1iLkdyYXBoaWNzLkNJUkMpYy5iZWdpblBhdGgoKSxjLmFyYyhoWzBdLGhbMV0saFsyXSwwLDIqTWF0aC5QSSksYy5jbG9zZVBhdGgoKSxnLmZpbGwmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsKCkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlKCkpO2Vsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5FTElQKXt2YXIgaj1nLnBvaW50cyxrPTIqalsyXSxsPTIqalszXSxtPWpbMF0tay8yLG49alsxXS1sLzI7Yy5iZWdpblBhdGgoKTt2YXIgbz0uNTUyMjg0OCxwPWsvMipvLHE9bC8yKm8scj1tK2sscz1uK2wsdD1tK2svMix1PW4rbC8yO2MubW92ZVRvKG0sdSksYy5iZXppZXJDdXJ2ZVRvKG0sdS1xLHQtcCxuLHQsbiksYy5iZXppZXJDdXJ2ZVRvKHQrcCxuLHIsdS1xLHIsdSksYy5iZXppZXJDdXJ2ZVRvKHIsdStxLHQrcCxzLHQscyksYy5iZXppZXJDdXJ2ZVRvKHQtcCxzLG0sdStxLG0sdSksYy5jbG9zZVBhdGgoKSxnLmZpbGwmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsKCkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlKCkpfWVsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5SUkVDKXt2YXIgdj1oWzBdLHc9aFsxXSx4PWhbMl0seT1oWzNdLHo9aFs0XSxBPU1hdGgubWluKHgseSkvMnwwO3o9ej5BP0E6eixjLmJlZ2luUGF0aCgpLGMubW92ZVRvKHYsdyt6KSxjLmxpbmVUbyh2LHcreS16KSxjLnF1YWRyYXRpY0N1cnZlVG8odix3K3ksdit6LHcreSksYy5saW5lVG8odit4LXosdyt5KSxjLnF1YWRyYXRpY0N1cnZlVG8odit4LHcreSx2K3gsdyt5LXopLGMubGluZVRvKHYreCx3K3opLGMucXVhZHJhdGljQ3VydmVUbyh2K3gsdyx2K3gteix3KSxjLmxpbmVUbyh2K3osdyksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYsdyx2LHcreiksYy5jbG9zZVBhdGgoKSwoZy5maWxsQ29sb3J8fDA9PT1nLmZpbGxDb2xvcikmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsKCkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlKCkpfX19LGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3NNYXNrPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9YS5ncmFwaGljc0RhdGEubGVuZ3RoO2lmKDAhPT1kKXtkPjEmJihkPTEsd2luZG93LmNvbnNvbGUubG9nKFwiUGl4aS5qcyB3YXJuaW5nOiBtYXNrcyBpbiBjYW52YXMgY2FuIG9ubHkgbWFzayB1c2luZyB0aGUgZmlyc3QgcGF0aCBpbiB0aGUgZ3JhcGhpY3Mgb2JqZWN0XCIpKTtmb3IodmFyIGU9MDsxPmU7ZSsrKXt2YXIgZj1hLmdyYXBoaWNzRGF0YVtlXSxnPWYucG9pbnRzO2lmKGYudHlwZT09PWIuR3JhcGhpY3MuUE9MWSl7Yy5iZWdpblBhdGgoKSxjLm1vdmVUbyhnWzBdLGdbMV0pO2Zvcih2YXIgaD0xO2g8Zy5sZW5ndGgvMjtoKyspYy5saW5lVG8oZ1syKmhdLGdbMipoKzFdKTtnWzBdPT09Z1tnLmxlbmd0aC0yXSYmZ1sxXT09PWdbZy5sZW5ndGgtMV0mJmMuY2xvc2VQYXRoKCl9ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLlJFQ1QpYy5iZWdpblBhdGgoKSxjLnJlY3QoZ1swXSxnWzFdLGdbMl0sZ1szXSksYy5jbG9zZVBhdGgoKTtlbHNlIGlmKGYudHlwZT09PWIuR3JhcGhpY3MuQ0lSQyljLmJlZ2luUGF0aCgpLGMuYXJjKGdbMF0sZ1sxXSxnWzJdLDAsMipNYXRoLlBJKSxjLmNsb3NlUGF0aCgpO2Vsc2UgaWYoZi50eXBlPT09Yi5HcmFwaGljcy5FTElQKXt2YXIgaT1mLnBvaW50cyxqPTIqaVsyXSxrPTIqaVszXSxsPWlbMF0tai8yLG09aVsxXS1rLzI7Yy5iZWdpblBhdGgoKTt2YXIgbj0uNTUyMjg0OCxvPWovMipuLHA9ay8yKm4scT1sK2oscj1tK2sscz1sK2ovMix0PW0ray8yO2MubW92ZVRvKGwsdCksYy5iZXppZXJDdXJ2ZVRvKGwsdC1wLHMtbyxtLHMsbSksYy5iZXppZXJDdXJ2ZVRvKHMrbyxtLHEsdC1wLHEsdCksYy5iZXppZXJDdXJ2ZVRvKHEsdCtwLHMrbyxyLHMsciksYy5iZXppZXJDdXJ2ZVRvKHMtbyxyLGwsdCtwLGwsdCksYy5jbG9zZVBhdGgoKX1lbHNlIGlmKGYudHlwZT09PWIuR3JhcGhpY3MuUlJFQyl7dmFyIHU9Z1swXSx2PWdbMV0sdz1nWzJdLHg9Z1szXSx5PWdbNF0sej1NYXRoLm1pbih3LHgpLzJ8MDt5PXk+ej96OnksYy5iZWdpblBhdGgoKSxjLm1vdmVUbyh1LHYreSksYy5saW5lVG8odSx2K3gteSksYy5xdWFkcmF0aWNDdXJ2ZVRvKHUsdit4LHUreSx2K3gpLGMubGluZVRvKHUrdy15LHYreCksYy5xdWFkcmF0aWNDdXJ2ZVRvKHUrdyx2K3gsdSt3LHYreC15KSxjLmxpbmVUbyh1K3csdit5KSxjLnF1YWRyYXRpY0N1cnZlVG8odSt3LHYsdSt3LXksdiksYy5saW5lVG8odSt5LHYpLGMucXVhZHJhdGljQ3VydmVUbyh1LHYsdSx2K3kpLGMuY2xvc2VQYXRoKCl9fX19LGIuR3JhcGhpY3M9ZnVuY3Rpb24oKXtiLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKSx0aGlzLnJlbmRlcmFibGU9ITAsdGhpcy5maWxsQWxwaGE9MSx0aGlzLmxpbmVXaWR0aD0wLHRoaXMubGluZUNvbG9yPVwiYmxhY2tcIix0aGlzLmdyYXBoaWNzRGF0YT1bXSx0aGlzLnRpbnQ9MTY3NzcyMTUsdGhpcy5ibGVuZE1vZGU9Yi5ibGVuZE1vZGVzLk5PUk1BTCx0aGlzLmN1cnJlbnRQYXRoPXtwb2ludHM6W119LHRoaXMuX3dlYkdMPVtdLHRoaXMuaXNNYXNrPSExLHRoaXMuYm91bmRzPW51bGwsdGhpcy5ib3VuZHNQYWRkaW5nPTEwLHRoaXMuZGlydHk9ITB9LGIuR3JhcGhpY3MucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5HcmFwaGljcy5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5HcmFwaGljcyxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5HcmFwaGljcy5wcm90b3R5cGUsXCJjYWNoZUFzQml0bWFwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9jYWNoZUFzQml0bWFwfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fY2FjaGVBc0JpdG1hcD1hLHRoaXMuX2NhY2hlQXNCaXRtYXA/dGhpcy5fZ2VuZXJhdGVDYWNoZWRTcHJpdGUoKToodGhpcy5kZXN0cm95Q2FjaGVkU3ByaXRlKCksdGhpcy5kaXJ0eT0hMCl9fSksYi5HcmFwaGljcy5wcm90b3R5cGUubGluZVN0eWxlPWZ1bmN0aW9uKGEsYyxkKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmxpbmVXaWR0aD1hfHwwLHRoaXMubGluZUNvbG9yPWN8fDAsdGhpcy5saW5lQWxwaGE9YXJndW1lbnRzLmxlbmd0aDwzPzE6ZCx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbXSx0eXBlOmIuR3JhcGhpY3MuUE9MWX0sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5tb3ZlVG89ZnVuY3Rpb24oYSxjKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOltdLHR5cGU6Yi5HcmFwaGljcy5QT0xZfSx0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5wdXNoKGEsYyksdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5saW5lVG89ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMucHVzaChhLGIpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUucXVhZHJhdGljQ3VydmVUbz1mdW5jdGlvbihhLGIsYyxkKXswPT09dGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RoJiZ0aGlzLm1vdmVUbygwLDApO3ZhciBlLGYsZz0yMCxoPXRoaXMuY3VycmVudFBhdGgucG9pbnRzOzA9PT1oLmxlbmd0aCYmdGhpcy5tb3ZlVG8oMCwwKTtmb3IodmFyIGk9aFtoLmxlbmd0aC0yXSxqPWhbaC5sZW5ndGgtMV0saz0wLGw9MTtnPj1sO2wrKylrPWwvZyxlPWkrKGEtaSkqayxmPWorKGItaikqayxoLnB1c2goZSsoYSsoYy1hKSprLWUpKmssZisoYisoZC1iKSprLWYpKmspO3JldHVybiB0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmJlemllckN1cnZlVG89ZnVuY3Rpb24oYSxiLGMsZCxlLGYpezA9PT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGgmJnRoaXMubW92ZVRvKDAsMCk7Zm9yKHZhciBnLGgsaSxqLGssbD0yMCxtPXRoaXMuY3VycmVudFBhdGgucG9pbnRzLG49bVttLmxlbmd0aC0yXSxvPW1bbS5sZW5ndGgtMV0scD0wLHE9MTtsPnE7cSsrKXA9cS9sLGc9MS1wLGg9ZypnLGk9aCpnLGo9cCpwLGs9aipwLG0ucHVzaChpKm4rMypoKnAqYSszKmcqaipjK2sqZSxpKm8rMypoKnAqYiszKmcqaipkK2sqZik7cmV0dXJuIHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuYXJjVG89ZnVuY3Rpb24oYSxiLGMsZCxlKXswPT09dGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RoJiZ0aGlzLm1vdmVUbyhhLGIpO3ZhciBmPXRoaXMuY3VycmVudFBhdGgucG9pbnRzLGc9ZltmLmxlbmd0aC0yXSxoPWZbZi5sZW5ndGgtMV0saT1oLWIsaj1nLWEsaz1kLWIsbD1jLWEsbT1NYXRoLmFicyhpKmwtaiprKTtpZigxZS04Pm18fDA9PT1lKWYucHVzaChhLGIpO2Vsc2V7dmFyIG49aSppK2oqaixvPWsqaytsKmwscD1pKmsraipsLHE9ZSpNYXRoLnNxcnQobikvbSxyPWUqTWF0aC5zcXJ0KG8pL20scz1xKnAvbix0PXIqcC9vLHU9cSpsK3Iqaix2PXEqaytyKmksdz1qKihyK3MpLHg9aSoocitzKSx5PWwqKHErdCksej1rKihxK3QpLEE9TWF0aC5hdGFuMih4LXYsdy11KSxCPU1hdGguYXRhbjIoei12LHktdSk7dGhpcy5hcmModSthLHYrYixlLEEsQixqKms+bCppKX1yZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5hcmM9ZnVuY3Rpb24oYSxiLGMsZCxlLGYpe3ZhciBnPWErTWF0aC5jb3MoZCkqYyxoPWIrTWF0aC5zaW4oZCkqYyxpPXRoaXMuY3VycmVudFBhdGgucG9pbnRzO2lmKCgwIT09aS5sZW5ndGgmJmlbaS5sZW5ndGgtMl0hPT1nfHxpW2kubGVuZ3RoLTFdIT09aCkmJih0aGlzLm1vdmVUbyhnLGgpLGk9dGhpcy5jdXJyZW50UGF0aC5wb2ludHMpLGQ9PT1lKXJldHVybiB0aGlzOyFmJiZkPj1lP2UrPTIqTWF0aC5QSTpmJiZlPj1kJiYoZCs9MipNYXRoLlBJKTt2YXIgaj1mPy0xKihkLWUpOmUtZCxrPU1hdGguYWJzKGopLygyKk1hdGguUEkpKjQwO2lmKDA9PT1qKXJldHVybiB0aGlzO2Zvcih2YXIgbD1qLygyKmspLG09MipsLG49TWF0aC5jb3MobCksbz1NYXRoLnNpbihsKSxwPWstMSxxPXAlMS9wLHI9MDtwPj1yO3IrKyl7dmFyIHM9citxKnIsdD1sK2QrbSpzLHU9TWF0aC5jb3ModCksdj0tTWF0aC5zaW4odCk7aS5wdXNoKChuKnUrbyp2KSpjK2EsKG4qLXYrbyp1KSpjK2IpfXJldHVybiB0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdQYXRoPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9dGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W10sdHlwZTpiLkdyYXBoaWNzLlBPTFl9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5jdXJyZW50UGF0aC5wb2ludHM9dGhpcy5jdXJyZW50UGF0aC5wb2ludHMuY29uY2F0KGEpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuYmVnaW5GaWxsPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuZmlsbGluZz0hMCx0aGlzLmZpbGxDb2xvcj1hfHwwLHRoaXMuZmlsbEFscGhhPWFyZ3VtZW50cy5sZW5ndGg8Mj8xOmIsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZW5kRmlsbD1mdW5jdGlvbigpe3JldHVybiB0aGlzLmZpbGxpbmc9ITEsdGhpcy5maWxsQ29sb3I9bnVsbCx0aGlzLmZpbGxBbHBoYT0xLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdSZWN0PWZ1bmN0aW9uKGEsYyxkLGUpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxlXSx0eXBlOmIuR3JhcGhpY3MuUkVDVH0sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdSb3VuZGVkUmVjdD1mdW5jdGlvbihhLGMsZCxlLGYpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxlLGZdLHR5cGU6Yi5HcmFwaGljcy5SUkVDfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZHJhd0NpcmNsZT1mdW5jdGlvbihhLGMsZCl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W2EsYyxkLGRdLHR5cGU6Yi5HcmFwaGljcy5DSVJDfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZHJhd0VsbGlwc2U9ZnVuY3Rpb24oYSxjLGQsZSl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W2EsYyxkLGVdLHR5cGU6Yi5HcmFwaGljcy5FTElQfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5saW5lV2lkdGg9MCx0aGlzLmZpbGxpbmc9ITEsdGhpcy5kaXJ0eT0hMCx0aGlzLmNsZWFyRGlydHk9ITAsdGhpcy5ncmFwaGljc0RhdGE9W10sdGhpcy5ib3VuZHM9bnVsbCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5nZW5lcmF0ZVRleHR1cmU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdldEJvdW5kcygpLGM9bmV3IGIuQ2FudmFzQnVmZmVyKGEud2lkdGgsYS5oZWlnaHQpLGQ9Yi5UZXh0dXJlLmZyb21DYW52YXMoYy5jYW52YXMpO3JldHVybiBjLmNvbnRleHQudHJhbnNsYXRlKC1hLngsLWEueSksYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljcyh0aGlzLGMuY29udGV4dCksZH0sYi5HcmFwaGljcy5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSYmdGhpcy5pc01hc2shPT0hMCl7aWYodGhpcy5fY2FjaGVBc0JpdG1hcClyZXR1cm4gdGhpcy5kaXJ0eSYmKHRoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCksYi51cGRhdGVXZWJHTFRleHR1cmUodGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUuYmFzZVRleHR1cmUsYS5nbCksdGhpcy5kaXJ0eT0hMSksdGhpcy5fY2FjaGVkU3ByaXRlLmFscGhhPXRoaXMuYWxwaGEsYi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTC5jYWxsKHRoaXMuX2NhY2hlZFNwcml0ZSxhKSx2b2lkIDA7aWYoYS5zcHJpdGVCYXRjaC5zdG9wKCksYS5ibGVuZE1vZGVNYW5hZ2VyLnNldEJsZW5kTW9kZSh0aGlzLmJsZW5kTW9kZSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wdXNoRmlsdGVyKHRoaXMuX2ZpbHRlckJsb2NrKSx0aGlzLmJsZW5kTW9kZSE9PWEuc3ByaXRlQmF0Y2guY3VycmVudEJsZW5kTW9kZSl7YS5zcHJpdGVCYXRjaC5jdXJyZW50QmxlbmRNb2RlPXRoaXMuYmxlbmRNb2RlO3ZhciBjPWIuYmxlbmRNb2Rlc1dlYkdMW2Euc3ByaXRlQmF0Y2guY3VycmVudEJsZW5kTW9kZV07YS5zcHJpdGVCYXRjaC5nbC5ibGVuZEZ1bmMoY1swXSxjWzFdKX1pZihiLldlYkdMR3JhcGhpY3MucmVuZGVyR3JhcGhpY3ModGhpcyxhKSx0aGlzLmNoaWxkcmVuLmxlbmd0aCl7YS5zcHJpdGVCYXRjaC5zdGFydCgpO2Zvcih2YXIgZD0wLGU9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZT5kO2QrKyl0aGlzLmNoaWxkcmVuW2RdLl9yZW5kZXJXZWJHTChhKTthLnNwcml0ZUJhdGNoLnN0b3AoKX10aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucG9wRmlsdGVyKCksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKHRoaXMubWFzayxhKSxhLmRyYXdDb3VudCsrLGEuc3ByaXRlQmF0Y2guc3RhcnQoKX19LGIuR3JhcGhpY3MucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhJiZ0aGlzLmlzTWFzayE9PSEwKXt2YXIgYz1hLmNvbnRleHQsZD10aGlzLndvcmxkVHJhbnNmb3JtO3RoaXMuYmxlbmRNb2RlIT09YS5jdXJyZW50QmxlbmRNb2RlJiYoYS5jdXJyZW50QmxlbmRNb2RlPXRoaXMuYmxlbmRNb2RlLGMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPWIuYmxlbmRNb2Rlc0NhbnZhc1thLmN1cnJlbnRCbGVuZE1vZGVdKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMuX21hc2ssYS5jb250ZXh0KSxjLnNldFRyYW5zZm9ybShkLmEsZC5jLGQuYixkLmQsZC50eCxkLnR5KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsYyk7Zm9yKHZhciBlPTAsZj10aGlzLmNoaWxkcmVuLmxlbmd0aDtmPmU7ZSsrKXRoaXMuY2hpbGRyZW5bZV0uX3JlbmRlckNhbnZhcyhhKTt0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KX19LGIuR3JhcGhpY3MucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbihhKXt0aGlzLmJvdW5kc3x8dGhpcy51cGRhdGVCb3VuZHMoKTt2YXIgYj10aGlzLmJvdW5kcy54LGM9dGhpcy5ib3VuZHMud2lkdGgrdGhpcy5ib3VuZHMueCxkPXRoaXMuYm91bmRzLnksZT10aGlzLmJvdW5kcy5oZWlnaHQrdGhpcy5ib3VuZHMueSxmPWF8fHRoaXMud29ybGRUcmFuc2Zvcm0sZz1mLmEsaD1mLmMsaT1mLmIsaj1mLmQsaz1mLnR4LGw9Zi50eSxtPWcqYytpKmUrayxuPWoqZStoKmMrbCxvPWcqYitpKmUrayxwPWoqZStoKmIrbCxxPWcqYitpKmQrayxyPWoqZCtoKmIrbCxzPWcqYytpKmQrayx0PWoqZCtoKmMrbCx1PW0sdj1uLHc9bSx4PW47dz13Pm8/bzp3LHc9dz5xP3E6dyx3PXc+cz9zOncseD14PnA/cDp4LHg9eD5yP3I6eCx4PXg+dD90OngsdT1vPnU/bzp1LHU9cT51P3E6dSx1PXM+dT9zOnUsdj1wPnY/cDp2LHY9cj52P3I6dix2PXQ+dj90OnY7dmFyIHk9dGhpcy5fYm91bmRzO3JldHVybiB5Lng9dyx5LndpZHRoPXUtdyx5Lnk9eCx5LmhlaWdodD12LXgseX0sYi5HcmFwaGljcy5wcm90b3R5cGUudXBkYXRlQm91bmRzPWZ1bmN0aW9uKCl7Zm9yKHZhciBhLGMsZCxlLGYsZz0xLzAsaD0tMS8wLGk9MS8wLGo9LTEvMCxrPTA7azx0aGlzLmdyYXBoaWNzRGF0YS5sZW5ndGg7aysrKXt2YXIgbD10aGlzLmdyYXBoaWNzRGF0YVtrXSxtPWwudHlwZSxuPWwubGluZVdpZHRoO2lmKGE9bC5wb2ludHMsbT09PWIuR3JhcGhpY3MuUkVDVCljPWFbMF0tbi8yLGQ9YVsxXS1uLzIsZT1hWzJdK24sZj1hWzNdK24sZz1nPmM/YzpnLGg9YytlPmg/YytlOmgsaT1pPmQ/YzppLGo9ZCtmPmo/ZCtmOmo7ZWxzZSBpZihtPT09Yi5HcmFwaGljcy5DSVJDfHxtPT09Yi5HcmFwaGljcy5FTElQKWM9YVswXSxkPWFbMV0sZT1hWzJdK24vMixmPWFbM10rbi8yLGc9Zz5jLWU/Yy1lOmcsaD1jK2U+aD9jK2U6aCxpPWk+ZC1mP2QtZjppLGo9ZCtmPmo/ZCtmOmo7ZWxzZSBmb3IodmFyIG89MDtvPGEubGVuZ3RoO28rPTIpYz1hW29dLGQ9YVtvKzFdLGc9Zz5jLW4/Yy1uOmcsaD1jK24+aD9jK246aCxpPWk+ZC1uP2QtbjppLGo9ZCtuPmo/ZCtuOmp9dmFyIHA9dGhpcy5ib3VuZHNQYWRkaW5nO3RoaXMuYm91bmRzPW5ldyBiLlJlY3RhbmdsZShnLXAsaS1wLGgtZysyKnAsai1pKzIqcCl9LGIuR3JhcGhpY3MucHJvdG90eXBlLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKTtpZih0aGlzLl9jYWNoZWRTcHJpdGUpdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlci5yZXNpemUoYS53aWR0aCxhLmhlaWdodCk7ZWxzZXt2YXIgYz1uZXcgYi5DYW52YXNCdWZmZXIoYS53aWR0aCxhLmhlaWdodCksZD1iLlRleHR1cmUuZnJvbUNhbnZhcyhjLmNhbnZhcyk7dGhpcy5fY2FjaGVkU3ByaXRlPW5ldyBiLlNwcml0ZShkKSx0aGlzLl9jYWNoZWRTcHJpdGUuYnVmZmVyPWMsdGhpcy5fY2FjaGVkU3ByaXRlLndvcmxkVHJhbnNmb3JtPXRoaXMud29ybGRUcmFuc2Zvcm19dGhpcy5fY2FjaGVkU3ByaXRlLmFuY2hvci54PS0oYS54L2Eud2lkdGgpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueT0tKGEueS9hLmhlaWdodCksdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlci5jb250ZXh0LnRyYW5zbGF0ZSgtYS54LC1hLnkpLGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3ModGhpcyx0aGlzLl9jYWNoZWRTcHJpdGUuYnVmZmVyLmNvbnRleHQpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbHBoYT10aGlzLmFscGhhfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kZXN0cm95Q2FjaGVkU3ByaXRlPWZ1bmN0aW9uKCl7dGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUuZGVzdHJveSghMCksdGhpcy5fY2FjaGVkU3ByaXRlPW51bGx9LGIuR3JhcGhpY3MuUE9MWT0wLGIuR3JhcGhpY3MuUkVDVD0xLGIuR3JhcGhpY3MuQ0lSQz0yLGIuR3JhcGhpY3MuRUxJUD0zLGIuR3JhcGhpY3MuUlJFQz00LGIuU3RyaXA9ZnVuY3Rpb24oYSl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy50ZXh0dXJlPWEsdGhpcy51dnM9bmV3IGIuRmxvYXQzMkFycmF5KFswLDEsMSwxLDEsMCwwLDFdKSx0aGlzLnZlcnRpY2llcz1uZXcgYi5GbG9hdDMyQXJyYXkoWzAsMCwxMDAsMCwxMDAsMTAwLDAsMTAwXSksdGhpcy5jb2xvcnM9bmV3IGIuRmxvYXQzMkFycmF5KFsxLDEsMSwxXSksdGhpcy5pbmRpY2VzPW5ldyBiLlVpbnQxNkFycmF5KFswLDEsMiwzXSksdGhpcy5kaXJ0eT0hMH0sYi5TdHJpcC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlN0cmlwLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlN0cmlwLGIuU3RyaXAucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXshdGhpcy52aXNpYmxlfHx0aGlzLmFscGhhPD0wfHwoYS5zcHJpdGVCYXRjaC5zdG9wKCksdGhpcy5fdmVydGV4QnVmZmVyfHx0aGlzLl9pbml0V2ViR0woYSksYS5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcihhLnNoYWRlck1hbmFnZXIuc3RyaXBTaGFkZXIpLHRoaXMuX3JlbmRlclN0cmlwKGEpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKSl9LGIuU3RyaXAucHJvdG90eXBlLl9pbml0V2ViR0w9ZnVuY3Rpb24oYSl7dmFyIGI9YS5nbDt0aGlzLl92ZXJ0ZXhCdWZmZXI9Yi5jcmVhdGVCdWZmZXIoKSx0aGlzLl9pbmRleEJ1ZmZlcj1iLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuX3V2QnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksdGhpcy5fY29sb3JCdWZmZXI9Yi5jcmVhdGVCdWZmZXIoKSxiLmJpbmRCdWZmZXIoYi5BUlJBWV9CVUZGRVIsdGhpcy5fdmVydGV4QnVmZmVyKSxiLmJ1ZmZlckRhdGEoYi5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNpZXMsYi5EWU5BTUlDX0RSQVcpLGIuYmluZEJ1ZmZlcihiLkFSUkFZX0JVRkZFUix0aGlzLl91dkJ1ZmZlciksYi5idWZmZXJEYXRhKGIuQVJSQVlfQlVGRkVSLHRoaXMudXZzLGIuU1RBVElDX0RSQVcpLGIuYmluZEJ1ZmZlcihiLkFSUkFZX0JVRkZFUix0aGlzLl9jb2xvckJ1ZmZlciksYi5idWZmZXJEYXRhKGIuQVJSQVlfQlVGRkVSLHRoaXMuY29sb3JzLGIuU1RBVElDX0RSQVcpLGIuYmluZEJ1ZmZlcihiLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuX2luZGV4QnVmZmVyKSxiLmJ1ZmZlckRhdGEoYi5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGljZXMsYi5TVEFUSUNfRFJBVyl9LGIuU3RyaXAucHJvdG90eXBlLl9yZW5kZXJTdHJpcD1mdW5jdGlvbihhKXt2YXIgYz1hLmdsLGQ9YS5wcm9qZWN0aW9uLGU9YS5vZmZzZXQsZj1hLnNoYWRlck1hbmFnZXIuc3RyaXBTaGFkZXI7Yy5ibGVuZEZ1bmMoYy5PTkUsYy5PTkVfTUlOVVNfU1JDX0FMUEhBKSxjLnVuaWZvcm1NYXRyaXgzZnYoZi50cmFuc2xhdGlvbk1hdHJpeCwhMSx0aGlzLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApKSxjLnVuaWZvcm0yZihmLnByb2plY3Rpb25WZWN0b3IsZC54LC1kLnkpLGMudW5pZm9ybTJmKGYub2Zmc2V0VmVjdG9yLC1lLngsLWUueSksYy51bmlmb3JtMWYoZi5hbHBoYSwxKSx0aGlzLmRpcnR5Pyh0aGlzLmRpcnR5PSExLGMuYmluZEJ1ZmZlcihjLkFSUkFZX0JVRkZFUix0aGlzLl92ZXJ0ZXhCdWZmZXIpLGMuYnVmZmVyRGF0YShjLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRpY2llcyxjLlNUQVRJQ19EUkFXKSxjLnZlcnRleEF0dHJpYlBvaW50ZXIoZi5hVmVydGV4UG9zaXRpb24sMixjLkZMT0FULCExLDAsMCksYy5iaW5kQnVmZmVyKGMuQVJSQVlfQlVGRkVSLHRoaXMuX3V2QnVmZmVyKSxjLmJ1ZmZlckRhdGEoYy5BUlJBWV9CVUZGRVIsdGhpcy51dnMsYy5TVEFUSUNfRFJBVyksYy52ZXJ0ZXhBdHRyaWJQb2ludGVyKGYuYVRleHR1cmVDb29yZCwyLGMuRkxPQVQsITEsMCwwKSxjLmFjdGl2ZVRleHR1cmUoYy5URVhUVVJFMCksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2MuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZSh0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUsYykpLGMuYmluZEJ1ZmZlcihjLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuX2luZGV4QnVmZmVyKSxjLmJ1ZmZlckRhdGEoYy5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGljZXMsYy5TVEFUSUNfRFJBVykpOihjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdmVydGV4QnVmZmVyKSxjLmJ1ZmZlclN1YkRhdGEoYy5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRpY2llcyksYy52ZXJ0ZXhBdHRyaWJQb2ludGVyKGYuYVZlcnRleFBvc2l0aW9uLDIsYy5GTE9BVCwhMSwwLDApLGMuYmluZEJ1ZmZlcihjLkFSUkFZX0JVRkZFUix0aGlzLl91dkJ1ZmZlciksYy52ZXJ0ZXhBdHRyaWJQb2ludGVyKGYuYVRleHR1cmVDb29yZCwyLGMuRkxPQVQsITEsMCwwKSxjLmFjdGl2ZVRleHR1cmUoYy5URVhUVVJFMCksYy5iaW5kVGV4dHVyZShjLlRFWFRVUkVfMkQsdGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2MuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZSh0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUsYykpLGMuYmluZEJ1ZmZlcihjLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuX2luZGV4QnVmZmVyKSksYy5kcmF3RWxlbWVudHMoYy5UUklBTkdMRV9TVFJJUCx0aGlzLmluZGljZXMubGVuZ3RoLGMuVU5TSUdORURfU0hPUlQsMCl9LGIuU3RyaXAucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7dmFyIGI9YS5jb250ZXh0LGM9dGhpcy53b3JsZFRyYW5zZm9ybTthLnJvdW5kUGl4ZWxzP2Iuc2V0VHJhbnNmb3JtKGMuYSxjLmMsYy5iLGMuZCwwfGMudHgsMHxjLnR5KTpiLnNldFRyYW5zZm9ybShjLmEsYy5jLGMuYixjLmQsYy50eCxjLnR5KTt2YXIgZD10aGlzLGU9ZC52ZXJ0aWNpZXMsZj1kLnV2cyxnPWUubGVuZ3RoLzI7dGhpcy5jb3VudCsrO2Zvcih2YXIgaD0wO2ctMj5oO2grKyl7dmFyIGk9MipoLGo9ZVtpXSxrPWVbaSsyXSxsPWVbaSs0XSxtPWVbaSsxXSxuPWVbaSszXSxvPWVbaSs1XSxwPShqK2srbCkvMyxxPShtK24rbykvMyxyPWotcCxzPW0tcSx0PU1hdGguc3FydChyKnIrcypzKTtqPXArci90Kih0KzMpLG09cStzL3QqKHQrMykscj1rLXAscz1uLXEsdD1NYXRoLnNxcnQocipyK3Mqcyksaz1wK3IvdCoodCszKSxuPXErcy90Kih0KzMpLHI9bC1wLHM9by1xLHQ9TWF0aC5zcXJ0KHIqcitzKnMpLGw9cCtyL3QqKHQrMyksbz1xK3MvdCoodCszKTt2YXIgdT1mW2ldKmQudGV4dHVyZS53aWR0aCx2PWZbaSsyXSpkLnRleHR1cmUud2lkdGgsdz1mW2krNF0qZC50ZXh0dXJlLndpZHRoLHg9ZltpKzFdKmQudGV4dHVyZS5oZWlnaHQseT1mW2krM10qZC50ZXh0dXJlLmhlaWdodCx6PWZbaSs1XSpkLnRleHR1cmUuaGVpZ2h0O2Iuc2F2ZSgpLGIuYmVnaW5QYXRoKCksYi5tb3ZlVG8oaixtKSxiLmxpbmVUbyhrLG4pLGIubGluZVRvKGwsbyksYi5jbG9zZVBhdGgoKSxiLmNsaXAoKTt2YXIgQT11KnkreCp3K3Yqei15KncteCp2LXUqeixCPWoqeSt4Kmwrayp6LXkqbC14Kmstaip6LEM9dSprK2oqdyt2Kmwtayp3LWoqdi11KmwsRD11KnkqbCt4KmsqdytqKnYqei1qKnkqdy14KnYqbC11KmsqeixFPW0qeSt4Km8rbip6LXkqby14Km4tbSp6LEY9dSpuK20qdyt2Km8tbip3LW0qdi11Km8sRz11Knkqbyt4Km4qdyttKnYqei1tKnkqdy14KnYqby11Km4qejtiLnRyYW5zZm9ybShCL0EsRS9BLEMvQSxGL0EsRC9BLEcvQSksYi5kcmF3SW1hZ2UoZC50ZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZSwwLDApLGIucmVzdG9yZSgpfX0sYi5TdHJpcC5wcm90b3R5cGUub25UZXh0dXJlVXBkYXRlPWZ1bmN0aW9uKCl7dGhpcy51cGRhdGVGcmFtZT0hMH0sYi5Sb3BlPWZ1bmN0aW9uKGEsYyl7Yi5TdHJpcC5jYWxsKHRoaXMsYSksdGhpcy5wb2ludHM9Yyx0aGlzLnZlcnRpY2llcz1uZXcgYi5GbG9hdDMyQXJyYXkoNCpjLmxlbmd0aCksdGhpcy51dnM9bmV3IGIuRmxvYXQzMkFycmF5KDQqYy5sZW5ndGgpLHRoaXMuY29sb3JzPW5ldyBiLkZsb2F0MzJBcnJheSgyKmMubGVuZ3RoKSx0aGlzLmluZGljZXM9bmV3IGIuVWludDE2QXJyYXkoMipjLmxlbmd0aCksdGhpcy5yZWZyZXNoKCl9LGIuUm9wZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlN0cmlwLnByb3RvdHlwZSksYi5Sb3BlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlJvcGUsYi5Sb3BlLnByb3RvdHlwZS5yZWZyZXNoPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5wb2ludHM7aWYoIShhLmxlbmd0aDwxKSl7dmFyIGI9dGhpcy51dnMsYz1hWzBdLGQ9dGhpcy5pbmRpY2VzLGU9dGhpcy5jb2xvcnM7dGhpcy5jb3VudC09LjIsYlswXT0wLGJbMV09MCxiWzJdPTAsYlszXT0xLGVbMF09MSxlWzFdPTEsZFswXT0wLGRbMV09MTtmb3IodmFyIGYsZyxoLGk9YS5sZW5ndGgsaj0xO2k+ajtqKyspZj1hW2pdLGc9NCpqLGg9ai8oaS0xKSxqJTI/KGJbZ109aCxiW2crMV09MCxiW2crMl09aCxiW2crM109MSk6KGJbZ109aCxiW2crMV09MCxiW2crMl09aCxiW2crM109MSksZz0yKmosZVtnXT0xLGVbZysxXT0xLGc9MipqLGRbZ109ZyxkW2crMV09ZysxLGM9Zn19LGIuUm9wZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5wb2ludHM7aWYoIShhLmxlbmd0aDwxKSl7dmFyIGMsZD1hWzBdLGU9e3g6MCx5OjB9O3RoaXMuY291bnQtPS4yO2Zvcih2YXIgZixnLGgsaSxqLGs9dGhpcy52ZXJ0aWNpZXMsbD1hLmxlbmd0aCxtPTA7bD5tO20rKylmPWFbbV0sZz00Km0sYz1tPGEubGVuZ3RoLTE/YVttKzFdOmYsZS55PS0oYy54LWQueCksZS54PWMueS1kLnksaD0xMCooMS1tLyhsLTEpKSxoPjEmJihoPTEpLGk9TWF0aC5zcXJ0KGUueCplLngrZS55KmUueSksaj10aGlzLnRleHR1cmUuaGVpZ2h0LzIsZS54Lz1pLGUueS89aSxlLngqPWosZS55Kj1qLGtbZ109Zi54K2UueCxrW2crMV09Zi55K2UueSxrW2crMl09Zi54LWUueCxrW2crM109Zi55LWUueSxkPWY7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX19LGIuUm9wZS5wcm90b3R5cGUuc2V0VGV4dHVyZT1mdW5jdGlvbihhKXt0aGlzLnRleHR1cmU9YX0sYi5UaWxpbmdTcHJpdGU9ZnVuY3Rpb24oYSxjLGQpe2IuU3ByaXRlLmNhbGwodGhpcyxhKSx0aGlzLl93aWR0aD1jfHwxMDAsdGhpcy5faGVpZ2h0PWR8fDEwMCx0aGlzLnRpbGVTY2FsZT1uZXcgYi5Qb2ludCgxLDEpLHRoaXMudGlsZVNjYWxlT2Zmc2V0PW5ldyBiLlBvaW50KDEsMSksdGhpcy50aWxlUG9zaXRpb249bmV3IGIuUG9pbnQoMCwwKSx0aGlzLnJlbmRlcmFibGU9ITAsdGhpcy50aW50PTE2Nzc3MjE1LHRoaXMuYmxlbmRNb2RlPWIuYmxlbmRNb2Rlcy5OT1JNQUx9LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuU3ByaXRlLnByb3RvdHlwZSksYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuVGlsaW5nU3ByaXRlLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fd2lkdGh9LHNldDpmdW5jdGlvbihhKXt0aGlzLl93aWR0aD1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUsXCJoZWlnaHRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2hlaWdodH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2hlaWdodD1hfX0pLGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5zZXRUZXh0dXJlPWZ1bmN0aW9uKGEpe3RoaXMudGV4dHVyZSE9PWEmJih0aGlzLnRleHR1cmU9YSx0aGlzLnJlZnJlc2hUZXh0dXJlPSEwLHRoaXMuY2FjaGVkVGludD0xNjc3NzIxNSl9LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhKXt2YXIgYyxkO2Zvcih0aGlzLl9tYXNrJiYoYS5zcHJpdGVCYXRjaC5zdG9wKCksYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLm1hc2ssYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpKSx0aGlzLl9maWx0ZXJzJiYoYS5zcHJpdGVCYXRjaC5mbHVzaCgpLGEuZmlsdGVyTWFuYWdlci5wdXNoRmlsdGVyKHRoaXMuX2ZpbHRlckJsb2NrKSksIXRoaXMudGlsaW5nVGV4dHVyZXx8dGhpcy5yZWZyZXNoVGV4dHVyZT8odGhpcy5nZW5lcmF0ZVRpbGluZ1RleHR1cmUoITApLHRoaXMudGlsaW5nVGV4dHVyZSYmdGhpcy50aWxpbmdUZXh0dXJlLm5lZWRzVXBkYXRlJiYoYi51cGRhdGVXZWJHTFRleHR1cmUodGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLGEuZ2wpLHRoaXMudGlsaW5nVGV4dHVyZS5uZWVkc1VwZGF0ZT0hMSkpOmEuc3ByaXRlQmF0Y2gucmVuZGVyVGlsaW5nU3ByaXRlKHRoaXMpLGM9MCxkPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2Q+YztjKyspdGhpcy5jaGlsZHJlbltjXS5fcmVuZGVyV2ViR0woYSk7YS5zcHJpdGVCYXRjaC5zdG9wKCksdGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnBvcEZpbHRlcigpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayhhKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCl9fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe3ZhciBjPWEuY29udGV4dDt0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnB1c2hNYXNrKHRoaXMuX21hc2ssYyksYy5nbG9iYWxBbHBoYT10aGlzLndvcmxkQWxwaGE7dmFyIGQsZSxmPXRoaXMud29ybGRUcmFuc2Zvcm07aWYoYy5zZXRUcmFuc2Zvcm0oZi5hLGYuYyxmLmIsZi5kLGYudHgsZi50eSksIXRoaXMuX190aWxlUGF0dGVybnx8dGhpcy5yZWZyZXNoVGV4dHVyZSl7aWYodGhpcy5nZW5lcmF0ZVRpbGluZ1RleHR1cmUoITEpLCF0aGlzLnRpbGluZ1RleHR1cmUpcmV0dXJuO3RoaXMuX190aWxlUGF0dGVybj1jLmNyZWF0ZVBhdHRlcm4odGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZSxcInJlcGVhdFwiKX10aGlzLmJsZW5kTW9kZSE9PWEuY3VycmVudEJsZW5kTW9kZSYmKGEuY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZSxjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1iLmJsZW5kTW9kZXNDYW52YXNbYS5jdXJyZW50QmxlbmRNb2RlXSk7dmFyIGc9dGhpcy50aWxlUG9zaXRpb24saD10aGlzLnRpbGVTY2FsZTtmb3IoZy54JT10aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUud2lkdGgsZy55JT10aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUuaGVpZ2h0LGMuc2NhbGUoaC54LGgueSksYy50cmFuc2xhdGUoZy54LGcueSksYy5maWxsU3R5bGU9dGhpcy5fX3RpbGVQYXR0ZXJuLGMuZmlsbFJlY3QoLWcueCt0aGlzLmFuY2hvci54Ki10aGlzLl93aWR0aCwtZy55K3RoaXMuYW5jaG9yLnkqLXRoaXMuX2hlaWdodCx0aGlzLl93aWR0aC9oLngsdGhpcy5faGVpZ2h0L2gueSksYy5zY2FsZSgxL2gueCwxL2gueSksYy50cmFuc2xhdGUoLWcueCwtZy55KSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KSxkPTAsZT10aGlzLmNoaWxkcmVuLmxlbmd0aDtlPmQ7ZCsrKXRoaXMuY2hpbGRyZW5bZF0uX3JlbmRlckNhbnZhcyhhKX19LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLl93aWR0aCxiPXRoaXMuX2hlaWdodCxjPWEqKDEtdGhpcy5hbmNob3IueCksZD1hKi10aGlzLmFuY2hvci54LGU9YiooMS10aGlzLmFuY2hvci55KSxmPWIqLXRoaXMuYW5jaG9yLnksZz10aGlzLndvcmxkVHJhbnNmb3JtLGg9Zy5hLGk9Zy5jLGo9Zy5iLGs9Zy5kLGw9Zy50eCxtPWcudHksbj1oKmQraipmK2wsbz1rKmYraSpkK20scD1oKmMraipmK2wscT1rKmYraSpjK20scj1oKmMraiplK2wscz1rKmUraSpjK20sdD1oKmQraiplK2wsdT1rKmUraSpkK20sdj0tMS8wLHc9LTEvMCx4PTEvMCx5PTEvMDt4PXg+bj9uOngseD14PnA/cDp4LHg9eD5yP3I6eCx4PXg+dD90OngseT15Pm8/bzp5LHk9eT5xP3E6eSx5PXk+cz9zOnkseT15PnU/dTp5LHY9bj52P246dix2PXA+dj9wOnYsdj1yPnY/cjp2LHY9dD52P3Q6dix3PW8+dz9vOncsdz1xPnc/cTp3LHc9cz53P3M6dyx3PXU+dz91Onc7dmFyIHo9dGhpcy5fYm91bmRzO3JldHVybiB6Lng9eCx6LndpZHRoPXYteCx6Lnk9eSx6LmhlaWdodD13LXksdGhpcy5fY3VycmVudEJvdW5kcz16LHp9LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5vblRleHR1cmVVcGRhdGU9ZnVuY3Rpb24oKXt9LGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5nZW5lcmF0ZVRpbGluZ1RleHR1cmU9ZnVuY3Rpb24oYSl7aWYodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCl7dmFyIGMsZCxlPXRoaXMudGV4dHVyZSxmPWUuZnJhbWUsZz1mLndpZHRoIT09ZS5iYXNlVGV4dHVyZS53aWR0aHx8Zi5oZWlnaHQhPT1lLmJhc2VUZXh0dXJlLmhlaWdodCxoPSExO2lmKGE/KGM9Yi5nZXROZXh0UG93ZXJPZlR3byhmLndpZHRoKSxkPWIuZ2V0TmV4dFBvd2VyT2ZUd28oZi5oZWlnaHQpLChmLndpZHRoIT09Y3x8Zi5oZWlnaHQhPT1kKSYmKGg9ITApKTpnJiYoYz1mLndpZHRoLGQ9Zi5oZWlnaHQsaD0hMCksaCl7dmFyIGk7dGhpcy50aWxpbmdUZXh0dXJlJiZ0aGlzLnRpbGluZ1RleHR1cmUuaXNUaWxpbmc/KGk9dGhpcy50aWxpbmdUZXh0dXJlLmNhbnZhc0J1ZmZlcixpLnJlc2l6ZShjLGQpLHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS53aWR0aD1jLHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS5oZWlnaHQ9ZCx0aGlzLnRpbGluZ1RleHR1cmUubmVlZHNVcGRhdGU9ITApOihpPW5ldyBiLkNhbnZhc0J1ZmZlcihjLGQpLHRoaXMudGlsaW5nVGV4dHVyZT1iLlRleHR1cmUuZnJvbUNhbnZhcyhpLmNhbnZhcyksdGhpcy50aWxpbmdUZXh0dXJlLmNhbnZhc0J1ZmZlcj1pLHRoaXMudGlsaW5nVGV4dHVyZS5pc1RpbGluZz0hMCksaS5jb250ZXh0LmRyYXdJbWFnZShlLmJhc2VUZXh0dXJlLnNvdXJjZSxlLmNyb3AueCxlLmNyb3AueSxlLmNyb3Aud2lkdGgsZS5jcm9wLmhlaWdodCwwLDAsYyxkKSx0aGlzLnRpbGVTY2FsZU9mZnNldC54PWYud2lkdGgvYyx0aGlzLnRpbGVTY2FsZU9mZnNldC55PWYuaGVpZ2h0L2R9ZWxzZSB0aGlzLnRpbGluZ1RleHR1cmUmJnRoaXMudGlsaW5nVGV4dHVyZS5pc1RpbGluZyYmdGhpcy50aWxpbmdUZXh0dXJlLmRlc3Ryb3koITApLHRoaXMudGlsZVNjYWxlT2Zmc2V0Lng9MSx0aGlzLnRpbGVTY2FsZU9mZnNldC55PTEsdGhpcy50aWxpbmdUZXh0dXJlPWU7dGhpcy5yZWZyZXNoVGV4dHVyZT0hMSx0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUuX3Bvd2VyT2YyPSEwfX07dmFyIGY9e307Zi5Cb25lRGF0YT1mdW5jdGlvbihhLGIpe3RoaXMubmFtZT1hLHRoaXMucGFyZW50PWJ9LGYuQm9uZURhdGEucHJvdG90eXBlPXtsZW5ndGg6MCx4OjAseTowLHJvdGF0aW9uOjAsc2NhbGVYOjEsc2NhbGVZOjF9LGYuU2xvdERhdGE9ZnVuY3Rpb24oYSxiKXt0aGlzLm5hbWU9YSx0aGlzLmJvbmVEYXRhPWJ9LGYuU2xvdERhdGEucHJvdG90eXBlPXtyOjEsZzoxLGI6MSxhOjEsYXR0YWNobWVudE5hbWU6bnVsbH0sZi5Cb25lPWZ1bmN0aW9uKGEsYil7dGhpcy5kYXRhPWEsdGhpcy5wYXJlbnQ9Yix0aGlzLnNldFRvU2V0dXBQb3NlKCl9LGYuQm9uZS55RG93bj0hMSxmLkJvbmUucHJvdG90eXBlPXt4OjAseTowLHJvdGF0aW9uOjAsc2NhbGVYOjEsc2NhbGVZOjEsbTAwOjAsbTAxOjAsd29ybGRYOjAsbTEwOjAsbTExOjAsd29ybGRZOjAsd29ybGRSb3RhdGlvbjowLHdvcmxkU2NhbGVYOjEsd29ybGRTY2FsZVk6MSx1cGRhdGVXb3JsZFRyYW5zZm9ybTpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMucGFyZW50O251bGwhPWM/KHRoaXMud29ybGRYPXRoaXMueCpjLm0wMCt0aGlzLnkqYy5tMDErYy53b3JsZFgsdGhpcy53b3JsZFk9dGhpcy54KmMubTEwK3RoaXMueSpjLm0xMStjLndvcmxkWSx0aGlzLndvcmxkU2NhbGVYPWMud29ybGRTY2FsZVgqdGhpcy5zY2FsZVgsdGhpcy53b3JsZFNjYWxlWT1jLndvcmxkU2NhbGVZKnRoaXMuc2NhbGVZLHRoaXMud29ybGRSb3RhdGlvbj1jLndvcmxkUm90YXRpb24rdGhpcy5yb3RhdGlvbik6KHRoaXMud29ybGRYPXRoaXMueCx0aGlzLndvcmxkWT10aGlzLnksdGhpcy53b3JsZFNjYWxlWD10aGlzLnNjYWxlWCx0aGlzLndvcmxkU2NhbGVZPXRoaXMuc2NhbGVZLHRoaXMud29ybGRSb3RhdGlvbj10aGlzLnJvdGF0aW9uKTt2YXIgZD10aGlzLndvcmxkUm90YXRpb24qTWF0aC5QSS8xODAsZT1NYXRoLmNvcyhkKSxnPU1hdGguc2luKGQpO3RoaXMubTAwPWUqdGhpcy53b3JsZFNjYWxlWCx0aGlzLm0xMD1nKnRoaXMud29ybGRTY2FsZVgsdGhpcy5tMDE9LWcqdGhpcy53b3JsZFNjYWxlWSx0aGlzLm0xMT1lKnRoaXMud29ybGRTY2FsZVksYSYmKHRoaXMubTAwPS10aGlzLm0wMCx0aGlzLm0wMT0tdGhpcy5tMDEpLGImJih0aGlzLm0xMD0tdGhpcy5tMTAsdGhpcy5tMTE9LXRoaXMubTExKSxmLkJvbmUueURvd24mJih0aGlzLm0xMD0tdGhpcy5tMTAsdGhpcy5tMTE9LXRoaXMubTExKX0sc2V0VG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmRhdGE7dGhpcy54PWEueCx0aGlzLnk9YS55LHRoaXMucm90YXRpb249YS5yb3RhdGlvbix0aGlzLnNjYWxlWD1hLnNjYWxlWCx0aGlzLnNjYWxlWT1hLnNjYWxlWX19LGYuU2xvdD1mdW5jdGlvbihhLGIsYyl7dGhpcy5kYXRhPWEsdGhpcy5za2VsZXRvbj1iLHRoaXMuYm9uZT1jLHRoaXMuc2V0VG9TZXR1cFBvc2UoKX0sZi5TbG90LnByb3RvdHlwZT17cjoxLGc6MSxiOjEsYToxLF9hdHRhY2htZW50VGltZTowLGF0dGFjaG1lbnQ6bnVsbCxzZXRBdHRhY2htZW50OmZ1bmN0aW9uKGEpe3RoaXMuYXR0YWNobWVudD1hLHRoaXMuX2F0dGFjaG1lbnRUaW1lPXRoaXMuc2tlbGV0b24udGltZX0sc2V0QXR0YWNobWVudFRpbWU6ZnVuY3Rpb24oYSl7dGhpcy5fYXR0YWNobWVudFRpbWU9dGhpcy5za2VsZXRvbi50aW1lLWF9LGdldEF0dGFjaG1lbnRUaW1lOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2tlbGV0b24udGltZS10aGlzLl9hdHRhY2htZW50VGltZX0sc2V0VG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmRhdGE7dGhpcy5yPWEucix0aGlzLmc9YS5nLHRoaXMuYj1hLmIsdGhpcy5hPWEuYTtmb3IodmFyIGI9dGhpcy5za2VsZXRvbi5kYXRhLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXT09YSl7dGhpcy5zZXRBdHRhY2htZW50KGEuYXR0YWNobWVudE5hbWU/dGhpcy5za2VsZXRvbi5nZXRBdHRhY2htZW50QnlTbG90SW5kZXgoYyxhLmF0dGFjaG1lbnROYW1lKTpudWxsKTticmVha319fSxmLlNraW49ZnVuY3Rpb24oYSl7dGhpcy5uYW1lPWEsdGhpcy5hdHRhY2htZW50cz17fX0sZi5Ta2luLnByb3RvdHlwZT17YWRkQXR0YWNobWVudDpmdW5jdGlvbihhLGIsYyl7dGhpcy5hdHRhY2htZW50c1thK1wiOlwiK2JdPWN9LGdldEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5hdHRhY2htZW50c1thK1wiOlwiK2JdfSxfYXR0YWNoQWxsOmZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjIGluIGIuYXR0YWNobWVudHMpe3ZhciBkPWMuaW5kZXhPZihcIjpcIiksZT1wYXJzZUludChjLnN1YnN0cmluZygwLGQpLDEwKSxmPWMuc3Vic3RyaW5nKGQrMSksZz1hLnNsb3RzW2VdO2lmKGcuYXR0YWNobWVudCYmZy5hdHRhY2htZW50Lm5hbWU9PWYpe3ZhciBoPXRoaXMuZ2V0QXR0YWNobWVudChlLGYpO2gmJmcuc2V0QXR0YWNobWVudChoKX19fX0sZi5BbmltYXRpb249ZnVuY3Rpb24oYSxiLGMpe3RoaXMubmFtZT1hLHRoaXMudGltZWxpbmVzPWIsdGhpcy5kdXJhdGlvbj1jfSxmLkFuaW1hdGlvbi5wcm90b3R5cGU9e2FwcGx5OmZ1bmN0aW9uKGEsYixjKXtjJiZ0aGlzLmR1cmF0aW9uJiYoYiU9dGhpcy5kdXJhdGlvbik7Zm9yKHZhciBkPXRoaXMudGltZWxpbmVzLGU9MCxmPWQubGVuZ3RoO2Y+ZTtlKyspZFtlXS5hcHBseShhLGIsMSl9LG1peDpmdW5jdGlvbihhLGIsYyxkKXtjJiZ0aGlzLmR1cmF0aW9uJiYoYiU9dGhpcy5kdXJhdGlvbik7Zm9yKHZhciBlPXRoaXMudGltZWxpbmVzLGY9MCxnPWUubGVuZ3RoO2c+ZjtmKyspZVtmXS5hcHBseShhLGIsZCl9fSxmLmJpbmFyeVNlYXJjaD1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9MCxlPU1hdGguZmxvb3IoYS5sZW5ndGgvYyktMjtpZighZSlyZXR1cm4gYztmb3IodmFyIGY9ZT4+PjE7Oyl7aWYoYVsoZisxKSpjXTw9Yj9kPWYrMTplPWYsZD09ZSlyZXR1cm4oZCsxKSpjO2Y9ZCtlPj4+MX19LGYubGluZWFyU2VhcmNoPWZ1bmN0aW9uKGEsYixjKXtmb3IodmFyIGQ9MCxlPWEubGVuZ3RoLWM7ZT49ZDtkKz1jKWlmKGFbZF0+YilyZXR1cm4gZDtyZXR1cm4tMX0sZi5DdXJ2ZXM9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9W10sdGhpcy5jdXJ2ZXMubGVuZ3RoPTYqKGEtMSl9LGYuQ3VydmVzLnByb3RvdHlwZT17c2V0TGluZWFyOmZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzWzYqYV09MH0sc2V0U3RlcHBlZDpmdW5jdGlvbihhKXt0aGlzLmN1cnZlc1s2KmFdPS0xfSxzZXRDdXJ2ZTpmdW5jdGlvbihhLGIsYyxkLGUpe3ZhciBmPS4xLGc9ZipmLGg9ZypmLGk9MypmLGo9MypnLGs9NipnLGw9NipoLG09MiotYitkLG49MiotYytlLG89MyooYi1kKSsxLHA9MyooYy1lKSsxLHE9NiphLHI9dGhpcy5jdXJ2ZXM7cltxXT1iKmkrbSpqK28qaCxyW3ErMV09YyppK24qaitwKmgscltxKzJdPW0qaytvKmwscltxKzNdPW4qaytwKmwscltxKzRdPW8qbCxyW3ErNV09cCpsfSxnZXRDdXJ2ZVBlcmNlbnQ6ZnVuY3Rpb24oYSxiKXtiPTA+Yj8wOmI+MT8xOmI7dmFyIGM9NiphLGQ9dGhpcy5jdXJ2ZXMsZT1kW2NdO2lmKCFlKXJldHVybiBiO2lmKC0xPT1lKXJldHVybiAwO2Zvcih2YXIgZj1kW2MrMV0sZz1kW2MrMl0saD1kW2MrM10saT1kW2MrNF0saj1kW2MrNV0saz1lLGw9ZixtPTg7Oyl7aWYoaz49Yil7dmFyIG49ay1lLG89bC1mO3JldHVybiBvKyhsLW8pKihiLW4pLyhrLW4pfWlmKCFtKWJyZWFrO20tLSxlKz1nLGYrPWgsZys9aSxoKz1qLGsrPWUsbCs9Zn1yZXR1cm4gbCsoMS1sKSooYi1rKS8oMS1rKX19LGYuUm90YXRlVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD0yKmF9LGYuUm90YXRlVGltZWxpbmUucHJvdG90eXBlPXtib25lSW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC8yfSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyl7YSo9Mix0aGlzLmZyYW1lc1thXT1iLHRoaXMuZnJhbWVzW2ErMV09Y30sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkLGU9dGhpcy5mcmFtZXM7aWYoIShiPGVbMF0pKXt2YXIgZz1hLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtpZihiPj1lW2UubGVuZ3RoLTJdKXtmb3IoZD1nLmRhdGEucm90YXRpb24rZVtlLmxlbmd0aC0xXS1nLnJvdGF0aW9uO2Q+MTgwOylkLT0zNjA7Zm9yKDstMTgwPmQ7KWQrPTM2MDtyZXR1cm4gZy5yb3RhdGlvbis9ZCpjLHZvaWQgMH12YXIgaD1mLmJpbmFyeVNlYXJjaChlLGIsMiksaT1lW2gtMV0saj1lW2hdLGs9MS0oYi1qKS8oZVtoLTJdLWopO2ZvcihrPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChoLzItMSxrKSxkPWVbaCsxXS1pO2Q+MTgwOylkLT0zNjA7Zm9yKDstMTgwPmQ7KWQrPTM2MDtmb3IoZD1nLmRhdGEucm90YXRpb24rKGkrZCprKS1nLnJvdGF0aW9uO2Q+MTgwOylkLT0zNjA7Zm9yKDstMTgwPmQ7KWQrPTM2MDtnLnJvdGF0aW9uKz1kKmN9fX0sZi5UcmFuc2xhdGVUaW1lbGluZT1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1uZXcgZi5DdXJ2ZXMoYSksdGhpcy5mcmFtZXM9W10sdGhpcy5mcmFtZXMubGVuZ3RoPTMqYX0sZi5UcmFuc2xhdGVUaW1lbGluZS5wcm90b3R5cGU9e2JvbmVJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoLzN9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjLGQpe2EqPTMsdGhpcy5mcmFtZXNbYV09Yix0aGlzLmZyYW1lc1thKzFdPWMsdGhpcy5mcmFtZXNbYSsyXT1kfSxhcHBseTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5mcmFtZXM7aWYoIShiPGRbMF0pKXt2YXIgZT1hLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtpZihiPj1kW2QubGVuZ3RoLTNdKXJldHVybiBlLngrPShlLmRhdGEueCtkW2QubGVuZ3RoLTJdLWUueCkqYyxlLnkrPShlLmRhdGEueStkW2QubGVuZ3RoLTFdLWUueSkqYyx2b2lkIDA7dmFyIGc9Zi5iaW5hcnlTZWFyY2goZCxiLDMpLGg9ZFtnLTJdLGk9ZFtnLTFdLGo9ZFtnXSxrPTEtKGItaikvKGRbZystM10taik7az10aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoZy8zLTEsayksZS54Kz0oZS5kYXRhLngraCsoZFtnKzFdLWgpKmstZS54KSpjLGUueSs9KGUuZGF0YS55K2krKGRbZysyXS1pKSprLWUueSkqY319fSxmLlNjYWxlVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD0zKmF9LGYuU2NhbGVUaW1lbGluZS5wcm90b3R5cGU9e2JvbmVJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoLzN9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjLGQpe2EqPTMsdGhpcy5mcmFtZXNbYV09Yix0aGlzLmZyYW1lc1thKzFdPWMsdGhpcy5mcmFtZXNbYSsyXT1kfSxhcHBseTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5mcmFtZXM7aWYoIShiPGRbMF0pKXt2YXIgZT1hLmJvbmVzW3RoaXMuYm9uZUluZGV4XTtpZihiPj1kW2QubGVuZ3RoLTNdKXJldHVybiBlLnNjYWxlWCs9KGUuZGF0YS5zY2FsZVgtMStkW2QubGVuZ3RoLTJdLWUuc2NhbGVYKSpjLGUuc2NhbGVZKz0oZS5kYXRhLnNjYWxlWS0xK2RbZC5sZW5ndGgtMV0tZS5zY2FsZVkpKmMsdm9pZCAwO3ZhciBnPWYuYmluYXJ5U2VhcmNoKGQsYiwzKSxoPWRbZy0yXSxpPWRbZy0xXSxqPWRbZ10saz0xLShiLWopLyhkW2crLTNdLWopO2s9dGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGcvMy0xLGspLGUuc2NhbGVYKz0oZS5kYXRhLnNjYWxlWC0xK2grKGRbZysxXS1oKSprLWUuc2NhbGVYKSpjLGUuc2NhbGVZKz0oZS5kYXRhLnNjYWxlWS0xK2krKGRbZysyXS1pKSprLWUuc2NhbGVZKSpjfX19LGYuQ29sb3JUaW1lbGluZT1mdW5jdGlvbihhKXt0aGlzLmN1cnZlcz1uZXcgZi5DdXJ2ZXMoYSksdGhpcy5mcmFtZXM9W10sdGhpcy5mcmFtZXMubGVuZ3RoPTUqYX0sZi5Db2xvclRpbWVsaW5lLnByb3RvdHlwZT17c2xvdEluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGgvNX0sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMsZCxlLGYpe2EqPTUsdGhpcy5mcmFtZXNbYV09Yix0aGlzLmZyYW1lc1thKzFdPWMsdGhpcy5mcmFtZXNbYSsyXT1kLHRoaXMuZnJhbWVzW2ErM109ZSx0aGlzLmZyYW1lc1thKzRdPWZ9LGFwcGx5OmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmZyYW1lcztpZighKGI8ZFswXSkpe3ZhciBlPWEuc2xvdHNbdGhpcy5zbG90SW5kZXhdO2lmKGI+PWRbZC5sZW5ndGgtNV0pe3ZhciBnPWQubGVuZ3RoLTE7cmV0dXJuIGUucj1kW2ctM10sZS5nPWRbZy0yXSxlLmI9ZFtnLTFdLGUuYT1kW2ddLHZvaWQgMH12YXIgaD1mLmJpbmFyeVNlYXJjaChkLGIsNSksaT1kW2gtNF0saj1kW2gtM10saz1kW2gtMl0sbD1kW2gtMV0sbT1kW2hdLG49MS0oYi1tKS8oZFtoLTVdLW0pO249dGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGgvNS0xLG4pO3ZhciBvPWkrKGRbaCsxXS1pKSpuLHA9aisoZFtoKzJdLWopKm4scT1rKyhkW2grM10taykqbixyPWwrKGRbaCs0XS1sKSpuOzE+Yz8oZS5yKz0oby1lLnIpKmMsZS5nKz0ocC1lLmcpKmMsZS5iKz0ocS1lLmIpKmMsZS5hKz0oci1lLmEpKmMpOihlLnI9byxlLmc9cCxlLmI9cSxlLmE9cil9fX0sZi5BdHRhY2htZW50VGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD1hLHRoaXMuYXR0YWNobWVudE5hbWVzPVtdLHRoaXMuYXR0YWNobWVudE5hbWVzLmxlbmd0aD1hfSxmLkF0dGFjaG1lbnRUaW1lbGluZS5wcm90b3R5cGU9e3Nsb3RJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RofSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyl7dGhpcy5mcmFtZXNbYV09Yix0aGlzLmF0dGFjaG1lbnROYW1lc1thXT1jfSxhcHBseTpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuZnJhbWVzO2lmKCEoYjxjWzBdKSl7dmFyIGQ7ZD1iPj1jW2MubGVuZ3RoLTFdP2MubGVuZ3RoLTE6Zi5iaW5hcnlTZWFyY2goYyxiLDEpLTE7dmFyIGU9dGhpcy5hdHRhY2htZW50TmFtZXNbZF07YS5zbG90c1t0aGlzLnNsb3RJbmRleF0uc2V0QXR0YWNobWVudChlP2EuZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KHRoaXMuc2xvdEluZGV4LGUpOm51bGwpfX19LGYuU2tlbGV0b25EYXRhPWZ1bmN0aW9uKCl7dGhpcy5ib25lcz1bXSx0aGlzLnNsb3RzPVtdLHRoaXMuc2tpbnM9W10sdGhpcy5hbmltYXRpb25zPVtdfSxmLlNrZWxldG9uRGF0YS5wcm90b3R5cGU9e2RlZmF1bHRTa2luOm51bGwsZmluZEJvbmU6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYm9uZXMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRCb25lSW5kZXg6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYm9uZXMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGM7cmV0dXJuLTF9LGZpbmRTbG90OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBzbG90W2NdO3JldHVybiBudWxsfSxmaW5kU2xvdEluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBjO3JldHVybi0xfSxmaW5kU2tpbjpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5za2lucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZmluZEFuaW1hdGlvbjpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5hbmltYXRpb25zLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfX0sZi5Ta2VsZXRvbj1mdW5jdGlvbihhKXt0aGlzLmRhdGE9YSx0aGlzLmJvbmVzPVtdO1xyXG5mb3IodmFyIGI9MCxjPWEuYm9uZXMubGVuZ3RoO2M+YjtiKyspe3ZhciBkPWEuYm9uZXNbYl0sZT1kLnBhcmVudD90aGlzLmJvbmVzW2EuYm9uZXMuaW5kZXhPZihkLnBhcmVudCldOm51bGw7dGhpcy5ib25lcy5wdXNoKG5ldyBmLkJvbmUoZCxlKSl9Zm9yKHRoaXMuc2xvdHM9W10sdGhpcy5kcmF3T3JkZXI9W10sYj0wLGM9YS5zbG90cy5sZW5ndGg7Yz5iO2IrKyl7dmFyIGc9YS5zbG90c1tiXSxoPXRoaXMuYm9uZXNbYS5ib25lcy5pbmRleE9mKGcuYm9uZURhdGEpXSxpPW5ldyBmLlNsb3QoZyx0aGlzLGgpO3RoaXMuc2xvdHMucHVzaChpKSx0aGlzLmRyYXdPcmRlci5wdXNoKGkpfX0sZi5Ta2VsZXRvbi5wcm90b3R5cGU9e3g6MCx5OjAsc2tpbjpudWxsLHI6MSxnOjEsYjoxLGE6MSx0aW1lOjAsZmxpcFg6ITEsZmxpcFk6ITEsdXBkYXRlV29ybGRUcmFuc2Zvcm06ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5mbGlwWCxiPXRoaXMuZmxpcFksYz10aGlzLmJvbmVzLGQ9MCxlPWMubGVuZ3RoO2U+ZDtkKyspY1tkXS51cGRhdGVXb3JsZFRyYW5zZm9ybShhLGIpfSxzZXRUb1NldHVwUG9zZTpmdW5jdGlvbigpe3RoaXMuc2V0Qm9uZXNUb1NldHVwUG9zZSgpLHRoaXMuc2V0U2xvdHNUb1NldHVwUG9zZSgpfSxzZXRCb25lc1RvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMuYm9uZXMsYj0wLGM9YS5sZW5ndGg7Yz5iO2IrKylhW2JdLnNldFRvU2V0dXBQb3NlKCl9LHNldFNsb3RzVG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5zbG90cyxiPTAsYz1hLmxlbmd0aDtjPmI7YisrKWFbYl0uc2V0VG9TZXR1cFBvc2UoYil9LGdldFJvb3RCb25lOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYm9uZXMubGVuZ3RoP3RoaXMuYm9uZXNbMF06bnVsbH0sZmluZEJvbmU6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYm9uZXMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLmRhdGEubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZmluZEJvbmVJbmRleDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5ib25lcyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10uZGF0YS5uYW1lPT1hKXJldHVybiBjO3JldHVybi0xfSxmaW5kU2xvdDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10uZGF0YS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kU2xvdEluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGM7cmV0dXJuLTF9LHNldFNraW5CeU5hbWU6ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcy5kYXRhLmZpbmRTa2luKGEpO2lmKCFiKXRocm93XCJTa2luIG5vdCBmb3VuZDogXCIrYTt0aGlzLnNldFNraW4oYil9LHNldFNraW46ZnVuY3Rpb24oYSl7dGhpcy5za2luJiZhJiZhLl9hdHRhY2hBbGwodGhpcyx0aGlzLnNraW4pLHRoaXMuc2tpbj1hfSxnZXRBdHRhY2htZW50QnlTbG90TmFtZTpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLmRhdGEuZmluZFNsb3RJbmRleChhKSxiKX0sZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4OmZ1bmN0aW9uKGEsYil7aWYodGhpcy5za2luKXt2YXIgYz10aGlzLnNraW4uZ2V0QXR0YWNobWVudChhLGIpO2lmKGMpcmV0dXJuIGN9cmV0dXJuIHRoaXMuZGF0YS5kZWZhdWx0U2tpbj90aGlzLmRhdGEuZGVmYXVsdFNraW4uZ2V0QXR0YWNobWVudChhLGIpOm51bGx9LHNldEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9dGhpcy5zbG90cyxkPTAsZT1jLnNpemU7ZT5kO2QrKyl7dmFyIGY9Y1tkXTtpZihmLmRhdGEubmFtZT09YSl7dmFyIGc9bnVsbDtpZihiJiYoZz10aGlzLmdldEF0dGFjaG1lbnQoZCxiKSxudWxsPT1nKSl0aHJvd1wiQXR0YWNobWVudCBub3QgZm91bmQ6IFwiK2IrXCIsIGZvciBzbG90OiBcIithO3JldHVybiBmLnNldEF0dGFjaG1lbnQoZyksdm9pZCAwfX10aHJvd1wiU2xvdCBub3QgZm91bmQ6IFwiK2F9LHVwZGF0ZTpmdW5jdGlvbihhKXt0aW1lKz1hfX0sZi5BdHRhY2htZW50VHlwZT17cmVnaW9uOjB9LGYuUmVnaW9uQXR0YWNobWVudD1mdW5jdGlvbigpe3RoaXMub2Zmc2V0PVtdLHRoaXMub2Zmc2V0Lmxlbmd0aD04LHRoaXMudXZzPVtdLHRoaXMudXZzLmxlbmd0aD04fSxmLlJlZ2lvbkF0dGFjaG1lbnQucHJvdG90eXBlPXt4OjAseTowLHJvdGF0aW9uOjAsc2NhbGVYOjEsc2NhbGVZOjEsd2lkdGg6MCxoZWlnaHQ6MCxyZW5kZXJlck9iamVjdDpudWxsLHJlZ2lvbk9mZnNldFg6MCxyZWdpb25PZmZzZXRZOjAscmVnaW9uV2lkdGg6MCxyZWdpb25IZWlnaHQ6MCxyZWdpb25PcmlnaW5hbFdpZHRoOjAscmVnaW9uT3JpZ2luYWxIZWlnaHQ6MCxzZXRVVnM6ZnVuY3Rpb24oYSxiLGMsZCxlKXt2YXIgZj10aGlzLnV2cztlPyhmWzJdPWEsZlszXT1kLGZbNF09YSxmWzVdPWIsZls2XT1jLGZbN109YixmWzBdPWMsZlsxXT1kKTooZlswXT1hLGZbMV09ZCxmWzJdPWEsZlszXT1iLGZbNF09YyxmWzVdPWIsZls2XT1jLGZbN109ZCl9LHVwZGF0ZU9mZnNldDpmdW5jdGlvbigpe3ZhciBhPXRoaXMud2lkdGgvdGhpcy5yZWdpb25PcmlnaW5hbFdpZHRoKnRoaXMuc2NhbGVYLGI9dGhpcy5oZWlnaHQvdGhpcy5yZWdpb25PcmlnaW5hbEhlaWdodCp0aGlzLnNjYWxlWSxjPS10aGlzLndpZHRoLzIqdGhpcy5zY2FsZVgrdGhpcy5yZWdpb25PZmZzZXRYKmEsZD0tdGhpcy5oZWlnaHQvMip0aGlzLnNjYWxlWSt0aGlzLnJlZ2lvbk9mZnNldFkqYixlPWMrdGhpcy5yZWdpb25XaWR0aCphLGY9ZCt0aGlzLnJlZ2lvbkhlaWdodCpiLGc9dGhpcy5yb3RhdGlvbipNYXRoLlBJLzE4MCxoPU1hdGguY29zKGcpLGk9TWF0aC5zaW4oZyksaj1jKmgrdGhpcy54LGs9YyppLGw9ZCpoK3RoaXMueSxtPWQqaSxuPWUqaCt0aGlzLngsbz1lKmkscD1mKmgrdGhpcy55LHE9ZippLHI9dGhpcy5vZmZzZXQ7clswXT1qLW0sclsxXT1sK2ssclsyXT1qLXEsclszXT1wK2sscls0XT1uLXEscls1XT1wK28scls2XT1uLW0scls3XT1sK299LGNvbXB1dGVWZXJ0aWNlczpmdW5jdGlvbihhLGIsYyxkKXthKz1jLndvcmxkWCxiKz1jLndvcmxkWTt2YXIgZT1jLm0wMCxmPWMubTAxLGc9Yy5tMTAsaD1jLm0xMSxpPXRoaXMub2Zmc2V0O2RbMF09aVswXSplK2lbMV0qZithLGRbMV09aVswXSpnK2lbMV0qaCtiLGRbMl09aVsyXSplK2lbM10qZithLGRbM109aVsyXSpnK2lbM10qaCtiLGRbNF09aVs0XSplK2lbNV0qZithLGRbNV09aVs0XSpnK2lbNV0qaCtiLGRbNl09aVs2XSplK2lbN10qZithLGRbN109aVs2XSpnK2lbN10qaCtifX0sZi5BbmltYXRpb25TdGF0ZURhdGE9ZnVuY3Rpb24oYSl7dGhpcy5za2VsZXRvbkRhdGE9YSx0aGlzLmFuaW1hdGlvblRvTWl4VGltZT17fX0sZi5BbmltYXRpb25TdGF0ZURhdGEucHJvdG90eXBlPXtkZWZhdWx0TWl4OjAsc2V0TWl4QnlOYW1lOmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGEpO2lmKCFkKXRocm93XCJBbmltYXRpb24gbm90IGZvdW5kOiBcIithO3ZhciBlPXRoaXMuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYik7aWYoIWUpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2I7dGhpcy5zZXRNaXgoZCxlLGMpfSxzZXRNaXg6ZnVuY3Rpb24oYSxiLGMpe3RoaXMuYW5pbWF0aW9uVG9NaXhUaW1lW2EubmFtZStcIjpcIitiLm5hbWVdPWN9LGdldE1peDpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lW2EubmFtZStcIjpcIitiLm5hbWVdO3JldHVybiBjP2M6dGhpcy5kZWZhdWx0TWl4fX0sZi5BbmltYXRpb25TdGF0ZT1mdW5jdGlvbihhKXt0aGlzLmRhdGE9YSx0aGlzLnF1ZXVlPVtdfSxmLkFuaW1hdGlvblN0YXRlLnByb3RvdHlwZT17YW5pbWF0aW9uU3BlZWQ6MSxjdXJyZW50Om51bGwscHJldmlvdXM6bnVsbCxjdXJyZW50VGltZTowLHByZXZpb3VzVGltZTowLGN1cnJlbnRMb29wOiExLHByZXZpb3VzTG9vcDohMSxtaXhUaW1lOjAsbWl4RHVyYXRpb246MCx1cGRhdGU6ZnVuY3Rpb24oYSl7aWYodGhpcy5jdXJyZW50VGltZSs9YSp0aGlzLmFuaW1hdGlvblNwZWVkLHRoaXMucHJldmlvdXNUaW1lKz1hLHRoaXMubWl4VGltZSs9YSx0aGlzLnF1ZXVlLmxlbmd0aD4wKXt2YXIgYj10aGlzLnF1ZXVlWzBdO3RoaXMuY3VycmVudFRpbWU+PWIuZGVsYXkmJih0aGlzLl9zZXRBbmltYXRpb24oYi5hbmltYXRpb24sYi5sb29wKSx0aGlzLnF1ZXVlLnNoaWZ0KCkpfX0sYXBwbHk6ZnVuY3Rpb24oYSl7aWYodGhpcy5jdXJyZW50KWlmKHRoaXMucHJldmlvdXMpe3RoaXMucHJldmlvdXMuYXBwbHkoYSx0aGlzLnByZXZpb3VzVGltZSx0aGlzLnByZXZpb3VzTG9vcCk7dmFyIGI9dGhpcy5taXhUaW1lL3RoaXMubWl4RHVyYXRpb247Yj49MSYmKGI9MSx0aGlzLnByZXZpb3VzPW51bGwpLHRoaXMuY3VycmVudC5taXgoYSx0aGlzLmN1cnJlbnRUaW1lLHRoaXMuY3VycmVudExvb3AsYil9ZWxzZSB0aGlzLmN1cnJlbnQuYXBwbHkoYSx0aGlzLmN1cnJlbnRUaW1lLHRoaXMuY3VycmVudExvb3ApfSxjbGVhckFuaW1hdGlvbjpmdW5jdGlvbigpe3RoaXMucHJldmlvdXM9bnVsbCx0aGlzLmN1cnJlbnQ9bnVsbCx0aGlzLnF1ZXVlLmxlbmd0aD0wfSxfc2V0QW5pbWF0aW9uOmZ1bmN0aW9uKGEsYil7dGhpcy5wcmV2aW91cz1udWxsLGEmJnRoaXMuY3VycmVudCYmKHRoaXMubWl4RHVyYXRpb249dGhpcy5kYXRhLmdldE1peCh0aGlzLmN1cnJlbnQsYSksdGhpcy5taXhEdXJhdGlvbj4wJiYodGhpcy5taXhUaW1lPTAsdGhpcy5wcmV2aW91cz10aGlzLmN1cnJlbnQsdGhpcy5wcmV2aW91c1RpbWU9dGhpcy5jdXJyZW50VGltZSx0aGlzLnByZXZpb3VzTG9vcD10aGlzLmN1cnJlbnRMb29wKSksdGhpcy5jdXJyZW50PWEsdGhpcy5jdXJyZW50TG9vcD1iLHRoaXMuY3VycmVudFRpbWU9MH0sc2V0QW5pbWF0aW9uQnlOYW1lOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5kYXRhLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGEpO2lmKCFjKXRocm93XCJBbmltYXRpb24gbm90IGZvdW5kOiBcIithO3RoaXMuc2V0QW5pbWF0aW9uKGMsYil9LHNldEFuaW1hdGlvbjpmdW5jdGlvbihhLGIpe3RoaXMucXVldWUubGVuZ3RoPTAsdGhpcy5fc2V0QW5pbWF0aW9uKGEsYil9LGFkZEFuaW1hdGlvbkJ5TmFtZTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5kYXRhLnNrZWxldG9uRGF0YS5maW5kQW5pbWF0aW9uKGEpO2lmKCFkKXRocm93XCJBbmltYXRpb24gbm90IGZvdW5kOiBcIithO3RoaXMuYWRkQW5pbWF0aW9uKGQsYixjKX0sYWRkQW5pbWF0aW9uOmZ1bmN0aW9uKGEsYixjKXt2YXIgZD17fTtpZihkLmFuaW1hdGlvbj1hLGQubG9vcD1iLCFjfHwwPj1jKXt2YXIgZT10aGlzLnF1ZXVlLmxlbmd0aD90aGlzLnF1ZXVlW3RoaXMucXVldWUubGVuZ3RoLTFdLmFuaW1hdGlvbjp0aGlzLmN1cnJlbnQ7Yz1udWxsIT1lP2UuZHVyYXRpb24tdGhpcy5kYXRhLmdldE1peChlLGEpKyhjfHwwKTowfWQuZGVsYXk9Yyx0aGlzLnF1ZXVlLnB1c2goZCl9LGlzQ29tcGxldGU6ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5jdXJyZW50fHx0aGlzLmN1cnJlbnRUaW1lPj10aGlzLmN1cnJlbnQuZHVyYXRpb259fSxmLlNrZWxldG9uSnNvbj1mdW5jdGlvbihhKXt0aGlzLmF0dGFjaG1lbnRMb2FkZXI9YX0sZi5Ta2VsZXRvbkpzb24ucHJvdG90eXBlPXtzY2FsZToxLHJlYWRTa2VsZXRvbkRhdGE6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiLGM9bmV3IGYuU2tlbGV0b25EYXRhLGQ9YS5ib25lcyxlPTAsZz1kLmxlbmd0aDtnPmU7ZSsrKXt2YXIgaD1kW2VdLGk9bnVsbDtpZihoLnBhcmVudCYmKGk9Yy5maW5kQm9uZShoLnBhcmVudCksIWkpKXRocm93XCJQYXJlbnQgYm9uZSBub3QgZm91bmQ6IFwiK2gucGFyZW50O2I9bmV3IGYuQm9uZURhdGEoaC5uYW1lLGkpLGIubGVuZ3RoPShoLmxlbmd0aHx8MCkqdGhpcy5zY2FsZSxiLng9KGgueHx8MCkqdGhpcy5zY2FsZSxiLnk9KGgueXx8MCkqdGhpcy5zY2FsZSxiLnJvdGF0aW9uPWgucm90YXRpb258fDAsYi5zY2FsZVg9aC5zY2FsZVh8fDEsYi5zY2FsZVk9aC5zY2FsZVl8fDEsYy5ib25lcy5wdXNoKGIpfXZhciBqPWEuc2xvdHM7Zm9yKGU9MCxnPWoubGVuZ3RoO2c+ZTtlKyspe3ZhciBrPWpbZV07aWYoYj1jLmZpbmRCb25lKGsuYm9uZSksIWIpdGhyb3dcIlNsb3QgYm9uZSBub3QgZm91bmQ6IFwiK2suYm9uZTt2YXIgbD1uZXcgZi5TbG90RGF0YShrLm5hbWUsYiksbT1rLmNvbG9yO20mJihsLnI9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcihtLDApLGwuZz1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMSksbC5iPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IobSwyKSxsLmE9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcihtLDMpKSxsLmF0dGFjaG1lbnROYW1lPWsuYXR0YWNobWVudCxjLnNsb3RzLnB1c2gobCl9dmFyIG49YS5za2lucztmb3IodmFyIG8gaW4gbilpZihuLmhhc093blByb3BlcnR5KG8pKXt2YXIgcD1uW29dLHE9bmV3IGYuU2tpbihvKTtmb3IodmFyIHIgaW4gcClpZihwLmhhc093blByb3BlcnR5KHIpKXt2YXIgcz1jLmZpbmRTbG90SW5kZXgociksdD1wW3JdO2Zvcih2YXIgdSBpbiB0KWlmKHQuaGFzT3duUHJvcGVydHkodSkpe3ZhciB2PXRoaXMucmVhZEF0dGFjaG1lbnQocSx1LHRbdV0pO251bGwhPXYmJnEuYWRkQXR0YWNobWVudChzLHUsdil9fWMuc2tpbnMucHVzaChxKSxcImRlZmF1bHRcIj09cS5uYW1lJiYoYy5kZWZhdWx0U2tpbj1xKX12YXIgdz1hLmFuaW1hdGlvbnM7Zm9yKHZhciB4IGluIHcpdy5oYXNPd25Qcm9wZXJ0eSh4KSYmdGhpcy5yZWFkQW5pbWF0aW9uKHgsd1t4XSxjKTtyZXR1cm4gY30scmVhZEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiLGMpe2I9Yy5uYW1lfHxiO3ZhciBkPWYuQXR0YWNobWVudFR5cGVbYy50eXBlfHxcInJlZ2lvblwiXTtpZihkPT1mLkF0dGFjaG1lbnRUeXBlLnJlZ2lvbil7dmFyIGU9bmV3IGYuUmVnaW9uQXR0YWNobWVudDtyZXR1cm4gZS54PShjLnh8fDApKnRoaXMuc2NhbGUsZS55PShjLnl8fDApKnRoaXMuc2NhbGUsZS5zY2FsZVg9Yy5zY2FsZVh8fDEsZS5zY2FsZVk9Yy5zY2FsZVl8fDEsZS5yb3RhdGlvbj1jLnJvdGF0aW9ufHwwLGUud2lkdGg9KGMud2lkdGh8fDMyKSp0aGlzLnNjYWxlLGUuaGVpZ2h0PShjLmhlaWdodHx8MzIpKnRoaXMuc2NhbGUsZS51cGRhdGVPZmZzZXQoKSxlLnJlbmRlcmVyT2JqZWN0PXt9LGUucmVuZGVyZXJPYmplY3QubmFtZT1iLGUucmVuZGVyZXJPYmplY3Quc2NhbGU9e30sZS5yZW5kZXJlck9iamVjdC5zY2FsZS54PWUuc2NhbGVYLGUucmVuZGVyZXJPYmplY3Quc2NhbGUueT1lLnNjYWxlWSxlLnJlbmRlcmVyT2JqZWN0LnJvdGF0aW9uPS1lLnJvdGF0aW9uKk1hdGguUEkvMTgwLGV9dGhyb3dcIlVua25vd24gYXR0YWNobWVudCB0eXBlOiBcIitkfSxyZWFkQW5pbWF0aW9uOmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGcsaCxpLGosayxsPVtdLG09MCxuPWIuYm9uZXM7Zm9yKHZhciBvIGluIG4paWYobi5oYXNPd25Qcm9wZXJ0eShvKSl7dmFyIHA9Yy5maW5kQm9uZUluZGV4KG8pO2lmKC0xPT1wKXRocm93XCJCb25lIG5vdCBmb3VuZDogXCIrbzt2YXIgcT1uW29dO2ZvcihnIGluIHEpaWYocS5oYXNPd25Qcm9wZXJ0eShnKSlpZihpPXFbZ10sXCJyb3RhdGVcIj09Zyl7Zm9yKGU9bmV3IGYuUm90YXRlVGltZWxpbmUoaS5sZW5ndGgpLGUuYm9uZUluZGV4PXAsZD0wLGo9MCxrPWkubGVuZ3RoO2s+ajtqKyspaD1pW2pdLGUuc2V0RnJhbWUoZCxoLnRpbWUsaC5hbmdsZSksZi5Ta2VsZXRvbkpzb24ucmVhZEN1cnZlKGUsZCxoKSxkKys7bC5wdXNoKGUpLG09TWF0aC5tYXgobSxlLmZyYW1lc1syKmUuZ2V0RnJhbWVDb3VudCgpLTJdKX1lbHNle2lmKFwidHJhbnNsYXRlXCIhPWcmJlwic2NhbGVcIiE9Zyl0aHJvd1wiSW52YWxpZCB0aW1lbGluZSB0eXBlIGZvciBhIGJvbmU6IFwiK2crXCIgKFwiK28rXCIpXCI7dmFyIHI9MTtmb3IoXCJzY2FsZVwiPT1nP2U9bmV3IGYuU2NhbGVUaW1lbGluZShpLmxlbmd0aCk6KGU9bmV3IGYuVHJhbnNsYXRlVGltZWxpbmUoaS5sZW5ndGgpLHI9dGhpcy5zY2FsZSksZS5ib25lSW5kZXg9cCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyl7aD1pW2pdO3ZhciBzPShoLnh8fDApKnIsdD0oaC55fHwwKSpyO2Uuc2V0RnJhbWUoZCxoLnRpbWUscyx0KSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmUoZSxkLGgpLGQrK31sLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzWzMqZS5nZXRGcmFtZUNvdW50KCktM10pfX12YXIgdT1iLnNsb3RzO2Zvcih2YXIgdiBpbiB1KWlmKHUuaGFzT3duUHJvcGVydHkodikpe3ZhciB3PXVbdl0seD1jLmZpbmRTbG90SW5kZXgodik7Zm9yKGcgaW4gdylpZih3Lmhhc093blByb3BlcnR5KGcpKWlmKGk9d1tnXSxcImNvbG9yXCI9PWcpe2ZvcihlPW5ldyBmLkNvbG9yVGltZWxpbmUoaS5sZW5ndGgpLGUuc2xvdEluZGV4PXgsZD0wLGo9MCxrPWkubGVuZ3RoO2s+ajtqKyspe2g9aVtqXTt2YXIgeT1oLmNvbG9yLHo9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcih5LDApLEE9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcih5LDEpLEI9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcih5LDIpLEM9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcih5LDMpO2Uuc2V0RnJhbWUoZCxoLnRpbWUseixBLEIsQyksZi5Ta2VsZXRvbkpzb24ucmVhZEN1cnZlKGUsZCxoKSxkKyt9bC5wdXNoKGUpLG09TWF0aC5tYXgobSxlLmZyYW1lc1s1KmUuZ2V0RnJhbWVDb3VudCgpLTVdKX1lbHNle2lmKFwiYXR0YWNobWVudFwiIT1nKXRocm93XCJJbnZhbGlkIHRpbWVsaW5lIHR5cGUgZm9yIGEgc2xvdDogXCIrZytcIiAoXCIrditcIilcIjtmb3IoZT1uZXcgZi5BdHRhY2htZW50VGltZWxpbmUoaS5sZW5ndGgpLGUuc2xvdEluZGV4PXgsZD0wLGo9MCxrPWkubGVuZ3RoO2s+ajtqKyspaD1pW2pdLGUuc2V0RnJhbWUoZCsrLGgudGltZSxoLm5hbWUpO2wucHVzaChlKSxtPU1hdGgubWF4KG0sZS5mcmFtZXNbZS5nZXRGcmFtZUNvdW50KCktMV0pfX1jLmFuaW1hdGlvbnMucHVzaChuZXcgZi5BbmltYXRpb24oYSxsLG0pKX19LGYuU2tlbGV0b25Kc29uLnJlYWRDdXJ2ZT1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yy5jdXJ2ZTtkJiYoXCJzdGVwcGVkXCI9PWQ/YS5jdXJ2ZXMuc2V0U3RlcHBlZChiKTpkIGluc3RhbmNlb2YgQXJyYXkmJmEuY3VydmVzLnNldEN1cnZlKGIsZFswXSxkWzFdLGRbMl0sZFszXSkpfSxmLlNrZWxldG9uSnNvbi50b0NvbG9yPWZ1bmN0aW9uKGEsYil7aWYoOCE9YS5sZW5ndGgpdGhyb3dcIkNvbG9yIGhleGlkZWNpbWFsIGxlbmd0aCBtdXN0IGJlIDgsIHJlY2lldmVkOiBcIithO3JldHVybiBwYXJzZUludChhLnN1YnN0cigyKmIsMiksMTYpLzI1NX0sZi5BdGxhcz1mdW5jdGlvbihhLGIpe3RoaXMudGV4dHVyZUxvYWRlcj1iLHRoaXMucGFnZXM9W10sdGhpcy5yZWdpb25zPVtdO3ZhciBjPW5ldyBmLkF0bGFzUmVhZGVyKGEpLGQ9W107ZC5sZW5ndGg9NDtmb3IodmFyIGU9bnVsbDs7KXt2YXIgZz1jLnJlYWRMaW5lKCk7aWYobnVsbD09ZylicmVhaztpZihnPWMudHJpbShnKSxnLmxlbmd0aClpZihlKXt2YXIgaD1uZXcgZi5BdGxhc1JlZ2lvbjtoLm5hbWU9ZyxoLnBhZ2U9ZSxoLnJvdGF0ZT1cInRydWVcIj09Yy5yZWFkVmFsdWUoKSxjLnJlYWRUdXBsZShkKTt2YXIgaT1wYXJzZUludChkWzBdLDEwKSxqPXBhcnNlSW50KGRbMV0sMTApO2MucmVhZFR1cGxlKGQpO3ZhciBrPXBhcnNlSW50KGRbMF0sMTApLGw9cGFyc2VJbnQoZFsxXSwxMCk7aC51PWkvZS53aWR0aCxoLnY9ai9lLmhlaWdodCxoLnJvdGF0ZT8oaC51Mj0oaStsKS9lLndpZHRoLGgudjI9KGoraykvZS5oZWlnaHQpOihoLnUyPShpK2spL2Uud2lkdGgsaC52Mj0oaitsKS9lLmhlaWdodCksaC54PWksaC55PWosaC53aWR0aD1NYXRoLmFicyhrKSxoLmhlaWdodD1NYXRoLmFicyhsKSw0PT1jLnJlYWRUdXBsZShkKSYmKGguc3BsaXRzPVtwYXJzZUludChkWzBdLDEwKSxwYXJzZUludChkWzFdLDEwKSxwYXJzZUludChkWzJdLDEwKSxwYXJzZUludChkWzNdLDEwKV0sND09Yy5yZWFkVHVwbGUoZCkmJihoLnBhZHM9W3BhcnNlSW50KGRbMF0sMTApLHBhcnNlSW50KGRbMV0sMTApLHBhcnNlSW50KGRbMl0sMTApLHBhcnNlSW50KGRbM10sMTApXSxjLnJlYWRUdXBsZShkKSkpLGgub3JpZ2luYWxXaWR0aD1wYXJzZUludChkWzBdLDEwKSxoLm9yaWdpbmFsSGVpZ2h0PXBhcnNlSW50KGRbMV0sMTApLGMucmVhZFR1cGxlKGQpLGgub2Zmc2V0WD1wYXJzZUludChkWzBdLDEwKSxoLm9mZnNldFk9cGFyc2VJbnQoZFsxXSwxMCksaC5pbmRleD1wYXJzZUludChjLnJlYWRWYWx1ZSgpLDEwKSx0aGlzLnJlZ2lvbnMucHVzaChoKX1lbHNle2U9bmV3IGYuQXRsYXNQYWdlLGUubmFtZT1nLGUuZm9ybWF0PWYuQXRsYXMuRm9ybWF0W2MucmVhZFZhbHVlKCldLGMucmVhZFR1cGxlKGQpLGUubWluRmlsdGVyPWYuQXRsYXMuVGV4dHVyZUZpbHRlcltkWzBdXSxlLm1hZ0ZpbHRlcj1mLkF0bGFzLlRleHR1cmVGaWx0ZXJbZFsxXV07dmFyIG09Yy5yZWFkVmFsdWUoKTtlLnVXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAuY2xhbXBUb0VkZ2UsZS52V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLmNsYW1wVG9FZGdlLFwieFwiPT1tP2UudVdyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQ6XCJ5XCI9PW0/ZS52V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdDpcInh5XCI9PW0mJihlLnVXcmFwPWUudldyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5yZXBlYXQpLGIubG9hZChlLGcpLHRoaXMucGFnZXMucHVzaChlKX1lbHNlIGU9bnVsbH19LGYuQXRsYXMucHJvdG90eXBlPXtmaW5kUmVnaW9uOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnJlZ2lvbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGRpc3Bvc2U6ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5wYWdlcyxiPTAsYz1hLmxlbmd0aDtjPmI7YisrKXRoaXMudGV4dHVyZUxvYWRlci51bmxvYWQoYVtiXS5yZW5kZXJlck9iamVjdCl9LHVwZGF0ZVVWczpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5yZWdpb25zLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspe3ZhciBlPWJbY107ZS5wYWdlPT1hJiYoZS51PWUueC9hLndpZHRoLGUudj1lLnkvYS5oZWlnaHQsZS5yb3RhdGU/KGUudTI9KGUueCtlLmhlaWdodCkvYS53aWR0aCxlLnYyPShlLnkrZS53aWR0aCkvYS5oZWlnaHQpOihlLnUyPShlLngrZS53aWR0aCkvYS53aWR0aCxlLnYyPShlLnkrZS5oZWlnaHQpL2EuaGVpZ2h0KSl9fX0sZi5BdGxhcy5Gb3JtYXQ9e2FscGhhOjAsaW50ZW5zaXR5OjEsbHVtaW5hbmNlQWxwaGE6MixyZ2I1NjU6MyxyZ2JhNDQ0NDo0LHJnYjg4ODo1LHJnYmE4ODg4OjZ9LGYuQXRsYXMuVGV4dHVyZUZpbHRlcj17bmVhcmVzdDowLGxpbmVhcjoxLG1pcE1hcDoyLG1pcE1hcE5lYXJlc3ROZWFyZXN0OjMsbWlwTWFwTGluZWFyTmVhcmVzdDo0LG1pcE1hcE5lYXJlc3RMaW5lYXI6NSxtaXBNYXBMaW5lYXJMaW5lYXI6Nn0sZi5BdGxhcy5UZXh0dXJlV3JhcD17bWlycm9yZWRSZXBlYXQ6MCxjbGFtcFRvRWRnZToxLHJlcGVhdDoyfSxmLkF0bGFzUGFnZT1mdW5jdGlvbigpe30sZi5BdGxhc1BhZ2UucHJvdG90eXBlPXtuYW1lOm51bGwsZm9ybWF0Om51bGwsbWluRmlsdGVyOm51bGwsbWFnRmlsdGVyOm51bGwsdVdyYXA6bnVsbCx2V3JhcDpudWxsLHJlbmRlcmVyT2JqZWN0Om51bGwsd2lkdGg6MCxoZWlnaHQ6MH0sZi5BdGxhc1JlZ2lvbj1mdW5jdGlvbigpe30sZi5BdGxhc1JlZ2lvbi5wcm90b3R5cGU9e3BhZ2U6bnVsbCxuYW1lOm51bGwseDowLHk6MCx3aWR0aDowLGhlaWdodDowLHU6MCx2OjAsdTI6MCx2MjowLG9mZnNldFg6MCxvZmZzZXRZOjAsb3JpZ2luYWxXaWR0aDowLG9yaWdpbmFsSGVpZ2h0OjAsaW5kZXg6MCxyb3RhdGU6ITEsc3BsaXRzOm51bGwscGFkczpudWxsfSxmLkF0bGFzUmVhZGVyPWZ1bmN0aW9uKGEpe3RoaXMubGluZXM9YS5zcGxpdCgvXFxyXFxufFxccnxcXG4vKX0sZi5BdGxhc1JlYWRlci5wcm90b3R5cGU9e2luZGV4OjAsdHJpbTpmdW5jdGlvbihhKXtyZXR1cm4gYS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLFwiXCIpfSxyZWFkTGluZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmluZGV4Pj10aGlzLmxpbmVzLmxlbmd0aD9udWxsOnRoaXMubGluZXNbdGhpcy5pbmRleCsrXX0scmVhZFZhbHVlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5yZWFkTGluZSgpLGI9YS5pbmRleE9mKFwiOlwiKTtpZigtMT09Yil0aHJvd1wiSW52YWxpZCBsaW5lOiBcIithO3JldHVybiB0aGlzLnRyaW0oYS5zdWJzdHJpbmcoYisxKSl9LHJlYWRUdXBsZTpmdW5jdGlvbihhKXt2YXIgYj10aGlzLnJlYWRMaW5lKCksYz1iLmluZGV4T2YoXCI6XCIpO2lmKC0xPT1jKXRocm93XCJJbnZhbGlkIGxpbmU6IFwiK2I7Zm9yKHZhciBkPTAsZT1jKzE7Mz5kO2QrKyl7dmFyIGY9Yi5pbmRleE9mKFwiLFwiLGUpO2lmKC0xPT1mKXtpZighZCl0aHJvd1wiSW52YWxpZCBsaW5lOiBcIitiO2JyZWFrfWFbZF09dGhpcy50cmltKGIuc3Vic3RyKGUsZi1lKSksZT1mKzF9cmV0dXJuIGFbZF09dGhpcy50cmltKGIuc3Vic3RyaW5nKGUpKSxkKzF9fSxmLkF0bGFzQXR0YWNobWVudExvYWRlcj1mdW5jdGlvbihhKXt0aGlzLmF0bGFzPWF9LGYuQXRsYXNBdHRhY2htZW50TG9hZGVyLnByb3RvdHlwZT17bmV3QXR0YWNobWVudDpmdW5jdGlvbihhLGIsYyl7c3dpdGNoKGIpe2Nhc2UgZi5BdHRhY2htZW50VHlwZS5yZWdpb246dmFyIGQ9dGhpcy5hdGxhcy5maW5kUmVnaW9uKGMpO2lmKCFkKXRocm93XCJSZWdpb24gbm90IGZvdW5kIGluIGF0bGFzOiBcIitjK1wiIChcIitiK1wiKVwiO3ZhciBlPW5ldyBmLlJlZ2lvbkF0dGFjaG1lbnQoYyk7cmV0dXJuIGUucmVuZGVyZXJPYmplY3Q9ZCxlLnNldFVWcyhkLnUsZC52LGQudTIsZC52MixkLnJvdGF0ZSksZS5yZWdpb25PZmZzZXRYPWQub2Zmc2V0WCxlLnJlZ2lvbk9mZnNldFk9ZC5vZmZzZXRZLGUucmVnaW9uV2lkdGg9ZC53aWR0aCxlLnJlZ2lvbkhlaWdodD1kLmhlaWdodCxlLnJlZ2lvbk9yaWdpbmFsV2lkdGg9ZC5vcmlnaW5hbFdpZHRoLGUucmVnaW9uT3JpZ2luYWxIZWlnaHQ9ZC5vcmlnaW5hbEhlaWdodCxlfXRocm93XCJVbmtub3duIGF0dGFjaG1lbnQgdHlwZTogXCIrYn19LGYuQm9uZS55RG93bj0hMCxiLkFuaW1DYWNoZT17fSxiLlNwaW5lPWZ1bmN0aW9uKGEpe2lmKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMuc3BpbmVEYXRhPWIuQW5pbUNhY2hlW2FdLCF0aGlzLnNwaW5lRGF0YSl0aHJvdyBuZXcgRXJyb3IoXCJTcGluZSBkYXRhIG11c3QgYmUgcHJlbG9hZGVkIHVzaW5nIFBJWEkuU3BpbmVMb2FkZXIgb3IgUElYSS5Bc3NldExvYWRlcjogXCIrYSk7dGhpcy5za2VsZXRvbj1uZXcgZi5Ta2VsZXRvbih0aGlzLnNwaW5lRGF0YSksdGhpcy5za2VsZXRvbi51cGRhdGVXb3JsZFRyYW5zZm9ybSgpLHRoaXMuc3RhdGVEYXRhPW5ldyBmLkFuaW1hdGlvblN0YXRlRGF0YSh0aGlzLnNwaW5lRGF0YSksdGhpcy5zdGF0ZT1uZXcgZi5BbmltYXRpb25TdGF0ZSh0aGlzLnN0YXRlRGF0YSksdGhpcy5zbG90Q29udGFpbmVycz1bXTtmb3IodmFyIGM9MCxkPXRoaXMuc2tlbGV0b24uZHJhd09yZGVyLmxlbmd0aDtkPmM7YysrKXt2YXIgZT10aGlzLnNrZWxldG9uLmRyYXdPcmRlcltjXSxnPWUuYXR0YWNobWVudCxoPW5ldyBiLkRpc3BsYXlPYmplY3RDb250YWluZXI7aWYodGhpcy5zbG90Q29udGFpbmVycy5wdXNoKGgpLHRoaXMuYWRkQ2hpbGQoaCksZyBpbnN0YW5jZW9mIGYuUmVnaW9uQXR0YWNobWVudCl7dmFyIGk9Zy5yZW5kZXJlck9iamVjdC5uYW1lLGo9dGhpcy5jcmVhdGVTcHJpdGUoZSxnLnJlbmRlcmVyT2JqZWN0KTtlLmN1cnJlbnRTcHJpdGU9aixlLmN1cnJlbnRTcHJpdGVOYW1lPWksaC5hZGRDaGlsZChqKX19fSxiLlNwaW5lLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3BpbmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3BpbmUsYi5TcGluZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5sYXN0VGltZT10aGlzLmxhc3RUaW1lfHxEYXRlLm5vdygpO3ZhciBhPS4wMDEqKERhdGUubm93KCktdGhpcy5sYXN0VGltZSk7dGhpcy5sYXN0VGltZT1EYXRlLm5vdygpLHRoaXMuc3RhdGUudXBkYXRlKGEpLHRoaXMuc3RhdGUuYXBwbHkodGhpcy5za2VsZXRvbiksdGhpcy5za2VsZXRvbi51cGRhdGVXb3JsZFRyYW5zZm9ybSgpO2Zvcih2YXIgYz10aGlzLnNrZWxldG9uLmRyYXdPcmRlcixkPTAsZT1jLmxlbmd0aDtlPmQ7ZCsrKXt2YXIgZz1jW2RdLGg9Zy5hdHRhY2htZW50LGk9dGhpcy5zbG90Q29udGFpbmVyc1tkXTtpZihoIGluc3RhbmNlb2YgZi5SZWdpb25BdHRhY2htZW50KXtpZihoLnJlbmRlcmVyT2JqZWN0JiYoIWcuY3VycmVudFNwcml0ZU5hbWV8fGcuY3VycmVudFNwcml0ZU5hbWUhPWgubmFtZSkpe3ZhciBqPWgucmVuZGVyZXJPYmplY3QubmFtZTtpZih2b2lkIDAhPT1nLmN1cnJlbnRTcHJpdGUmJihnLmN1cnJlbnRTcHJpdGUudmlzaWJsZT0hMSksZy5zcHJpdGVzPWcuc3ByaXRlc3x8e30sdm9pZCAwIT09Zy5zcHJpdGVzW2pdKWcuc3ByaXRlc1tqXS52aXNpYmxlPSEwO2Vsc2V7dmFyIGs9dGhpcy5jcmVhdGVTcHJpdGUoZyxoLnJlbmRlcmVyT2JqZWN0KTtpLmFkZENoaWxkKGspfWcuY3VycmVudFNwcml0ZT1nLnNwcml0ZXNbal0sZy5jdXJyZW50U3ByaXRlTmFtZT1qfWkudmlzaWJsZT0hMDt2YXIgbD1nLmJvbmU7aS5wb3NpdGlvbi54PWwud29ybGRYK2gueCpsLm0wMCtoLnkqbC5tMDEsaS5wb3NpdGlvbi55PWwud29ybGRZK2gueCpsLm0xMCtoLnkqbC5tMTEsaS5zY2FsZS54PWwud29ybGRTY2FsZVgsaS5zY2FsZS55PWwud29ybGRTY2FsZVksaS5yb3RhdGlvbj0tKGcuYm9uZS53b3JsZFJvdGF0aW9uKk1hdGguUEkvMTgwKSxpLmFscGhhPWcuYSxnLmN1cnJlbnRTcHJpdGUudGludD1iLnJnYjJoZXgoW2cucixnLmcsZy5iXSl9ZWxzZSBpLnZpc2libGU9ITF9Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX0sYi5TcGluZS5wcm90b3R5cGUuY3JlYXRlU3ByaXRlPWZ1bmN0aW9uKGEsYyl7dmFyIGQ9Yi5UZXh0dXJlQ2FjaGVbYy5uYW1lXT9jLm5hbWU6Yy5uYW1lK1wiLnBuZ1wiLGU9bmV3IGIuU3ByaXRlKGIuVGV4dHVyZS5mcm9tRnJhbWUoZCkpO3JldHVybiBlLnNjYWxlPWMuc2NhbGUsZS5yb3RhdGlvbj1jLnJvdGF0aW9uLGUuYW5jaG9yLng9ZS5hbmNob3IueT0uNSxhLnNwcml0ZXM9YS5zcHJpdGVzfHx7fSxhLnNwcml0ZXNbYy5uYW1lXT1lLGV9LGIuQmFzZVRleHR1cmVDYWNoZT17fSxiLnRleHR1cmVzVG9VcGRhdGU9W10sYi50ZXh0dXJlc1RvRGVzdHJveT1bXSxiLkJhc2VUZXh0dXJlQ2FjaGVJZEdlbmVyYXRvcj0wLGIuQmFzZVRleHR1cmU9ZnVuY3Rpb24oYSxjKXtpZihiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy53aWR0aD0xMDAsdGhpcy5oZWlnaHQ9MTAwLHRoaXMuc2NhbGVNb2RlPWN8fGIuc2NhbGVNb2Rlcy5ERUZBVUxULHRoaXMuaGFzTG9hZGVkPSExLHRoaXMuc291cmNlPWEsdGhpcy5pZD1iLkJhc2VUZXh0dXJlQ2FjaGVJZEdlbmVyYXRvcisrLHRoaXMucHJlbXVsdGlwbGllZEFscGhhPSEwLHRoaXMuX2dsVGV4dHVyZXM9W10sdGhpcy5fZGlydHk9W10sYSl7aWYoKHRoaXMuc291cmNlLmNvbXBsZXRlfHx0aGlzLnNvdXJjZS5nZXRDb250ZXh0KSYmdGhpcy5zb3VyY2Uud2lkdGgmJnRoaXMuc291cmNlLmhlaWdodCl0aGlzLmhhc0xvYWRlZD0hMCx0aGlzLndpZHRoPXRoaXMuc291cmNlLndpZHRoLHRoaXMuaGVpZ2h0PXRoaXMuc291cmNlLmhlaWdodCxiLnRleHR1cmVzVG9VcGRhdGUucHVzaCh0aGlzKTtlbHNle3ZhciBkPXRoaXM7dGhpcy5zb3VyY2Uub25sb2FkPWZ1bmN0aW9uKCl7ZC5oYXNMb2FkZWQ9ITAsZC53aWR0aD1kLnNvdXJjZS53aWR0aCxkLmhlaWdodD1kLnNvdXJjZS5oZWlnaHQ7Zm9yKHZhciBhPTA7YTxkLl9nbFRleHR1cmVzLmxlbmd0aDthKyspZC5fZGlydHlbYV09ITA7ZC5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDpkfSl9LHRoaXMuc291cmNlLm9uZXJyb3I9ZnVuY3Rpb24oKXtkLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJlcnJvclwiLGNvbnRlbnQ6ZH0pfX10aGlzLmltYWdlVXJsPW51bGwsdGhpcy5fcG93ZXJPZjI9ITF9fSxiLkJhc2VUZXh0dXJlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJhc2VUZXh0dXJlLGIuQmFzZVRleHR1cmUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmltYWdlVXJsPyhkZWxldGUgYi5CYXNlVGV4dHVyZUNhY2hlW3RoaXMuaW1hZ2VVcmxdLGRlbGV0ZSBiLlRleHR1cmVDYWNoZVt0aGlzLmltYWdlVXJsXSx0aGlzLmltYWdlVXJsPW51bGwsdGhpcy5zb3VyY2Uuc3JjPW51bGwpOnRoaXMuc291cmNlJiZ0aGlzLnNvdXJjZS5fcGl4aUlkJiZkZWxldGUgYi5CYXNlVGV4dHVyZUNhY2hlW3RoaXMuc291cmNlLl9waXhpSWRdLHRoaXMuc291cmNlPW51bGwsYi50ZXh0dXJlc1RvRGVzdHJveS5wdXNoKHRoaXMpfSxiLkJhc2VUZXh0dXJlLnByb3RvdHlwZS51cGRhdGVTb3VyY2VJbWFnZT1mdW5jdGlvbihhKXt0aGlzLmhhc0xvYWRlZD0hMSx0aGlzLnNvdXJjZS5zcmM9bnVsbCx0aGlzLnNvdXJjZS5zcmM9YX0sYi5CYXNlVGV4dHVyZS5mcm9tSW1hZ2U9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWIuQmFzZVRleHR1cmVDYWNoZVthXTtpZih2b2lkIDA9PT1jJiYtMT09PWEuaW5kZXhPZihcImRhdGE6XCIpJiYoYz0hMCksIWUpe3ZhciBmPW5ldyBJbWFnZTtjJiYoZi5jcm9zc09yaWdpbj1cIlwiKSxmLnNyYz1hLGU9bmV3IGIuQmFzZVRleHR1cmUoZixkKSxlLmltYWdlVXJsPWEsYi5CYXNlVGV4dHVyZUNhY2hlW2FdPWV9cmV0dXJuIGV9LGIuQmFzZVRleHR1cmUuZnJvbUNhbnZhcz1mdW5jdGlvbihhLGMpe2EuX3BpeGlJZHx8KGEuX3BpeGlJZD1cImNhbnZhc19cIitiLlRleHR1cmVDYWNoZUlkR2VuZXJhdG9yKyspO3ZhciBkPWIuQmFzZVRleHR1cmVDYWNoZVthLl9waXhpSWRdO3JldHVybiBkfHwoZD1uZXcgYi5CYXNlVGV4dHVyZShhLGMpLGIuQmFzZVRleHR1cmVDYWNoZVthLl9waXhpSWRdPWQpLGR9LGIuVGV4dHVyZUNhY2hlPXt9LGIuRnJhbWVDYWNoZT17fSxiLlRleHR1cmVDYWNoZUlkR2VuZXJhdG9yPTAsYi5UZXh0dXJlPWZ1bmN0aW9uKGEsYyl7aWYoYi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMubm9GcmFtZT0hMSxjfHwodGhpcy5ub0ZyYW1lPSEwLGM9bmV3IGIuUmVjdGFuZ2xlKDAsMCwxLDEpKSxhIGluc3RhbmNlb2YgYi5UZXh0dXJlJiYoYT1hLmJhc2VUZXh0dXJlKSx0aGlzLmJhc2VUZXh0dXJlPWEsdGhpcy5mcmFtZT1jLHRoaXMudHJpbT1udWxsLHRoaXMudmFsaWQ9ITEsdGhpcy5zY29wZT10aGlzLHRoaXMuX3V2cz1udWxsLHRoaXMud2lkdGg9MCx0aGlzLmhlaWdodD0wLHRoaXMuY3JvcD1uZXcgYi5SZWN0YW5nbGUoMCwwLDEsMSksYS5oYXNMb2FkZWQpdGhpcy5ub0ZyYW1lJiYoYz1uZXcgYi5SZWN0YW5nbGUoMCwwLGEud2lkdGgsYS5oZWlnaHQpKSx0aGlzLnNldEZyYW1lKGMpO2Vsc2V7dmFyIGQ9dGhpczthLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe2Qub25CYXNlVGV4dHVyZUxvYWRlZCgpfSl9fSxiLlRleHR1cmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuVGV4dHVyZSxiLlRleHR1cmUucHJvdG90eXBlLm9uQmFzZVRleHR1cmVMb2FkZWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmJhc2VUZXh0dXJlO2EucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLHRoaXMub25Mb2FkZWQpLHRoaXMubm9GcmFtZSYmKHRoaXMuZnJhbWU9bmV3IGIuUmVjdGFuZ2xlKDAsMCxhLndpZHRoLGEuaGVpZ2h0KSksdGhpcy5zZXRGcmFtZSh0aGlzLmZyYW1lKSx0aGlzLnNjb3BlLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJ1cGRhdGVcIixjb250ZW50OnRoaXN9KX0sYi5UZXh0dXJlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKGEpe2EmJnRoaXMuYmFzZVRleHR1cmUuZGVzdHJveSgpLHRoaXMudmFsaWQ9ITF9LGIuVGV4dHVyZS5wcm90b3R5cGUuc2V0RnJhbWU9ZnVuY3Rpb24oYSl7aWYodGhpcy5ub0ZyYW1lPSExLHRoaXMuZnJhbWU9YSx0aGlzLndpZHRoPWEud2lkdGgsdGhpcy5oZWlnaHQ9YS5oZWlnaHQsdGhpcy5jcm9wLng9YS54LHRoaXMuY3JvcC55PWEueSx0aGlzLmNyb3Aud2lkdGg9YS53aWR0aCx0aGlzLmNyb3AuaGVpZ2h0PWEuaGVpZ2h0LCF0aGlzLnRyaW0mJihhLngrYS53aWR0aD50aGlzLmJhc2VUZXh0dXJlLndpZHRofHxhLnkrYS5oZWlnaHQ+dGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQpKXRocm93IG5ldyBFcnJvcihcIlRleHR1cmUgRXJyb3I6IGZyYW1lIGRvZXMgbm90IGZpdCBpbnNpZGUgdGhlIGJhc2UgVGV4dHVyZSBkaW1lbnNpb25zIFwiK3RoaXMpO3RoaXMudmFsaWQ9YSYmYS53aWR0aCYmYS5oZWlnaHQmJnRoaXMuYmFzZVRleHR1cmUuc291cmNlJiZ0aGlzLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCx0aGlzLnRyaW0mJih0aGlzLndpZHRoPXRoaXMudHJpbS53aWR0aCx0aGlzLmhlaWdodD10aGlzLnRyaW0uaGVpZ2h0LHRoaXMuZnJhbWUud2lkdGg9dGhpcy50cmltLndpZHRoLHRoaXMuZnJhbWUuaGVpZ2h0PXRoaXMudHJpbS5oZWlnaHQpLHRoaXMudmFsaWQmJmIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMucHVzaCh0aGlzKX0sYi5UZXh0dXJlLnByb3RvdHlwZS5fdXBkYXRlV2ViR0x1dnM9ZnVuY3Rpb24oKXt0aGlzLl91dnN8fCh0aGlzLl91dnM9bmV3IGIuVGV4dHVyZVV2cyk7dmFyIGE9dGhpcy5jcm9wLGM9dGhpcy5iYXNlVGV4dHVyZS53aWR0aCxkPXRoaXMuYmFzZVRleHR1cmUuaGVpZ2h0O3RoaXMuX3V2cy54MD1hLngvYyx0aGlzLl91dnMueTA9YS55L2QsdGhpcy5fdXZzLngxPShhLngrYS53aWR0aCkvYyx0aGlzLl91dnMueTE9YS55L2QsdGhpcy5fdXZzLngyPShhLngrYS53aWR0aCkvYyx0aGlzLl91dnMueTI9KGEueSthLmhlaWdodCkvZCx0aGlzLl91dnMueDM9YS54L2MsdGhpcy5fdXZzLnkzPShhLnkrYS5oZWlnaHQpL2R9LGIuVGV4dHVyZS5mcm9tSW1hZ2U9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWIuVGV4dHVyZUNhY2hlW2FdO3JldHVybiBlfHwoZT1uZXcgYi5UZXh0dXJlKGIuQmFzZVRleHR1cmUuZnJvbUltYWdlKGEsYyxkKSksYi5UZXh0dXJlQ2FjaGVbYV09ZSksZX0sYi5UZXh0dXJlLmZyb21GcmFtZT1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHR1cmVDYWNoZVthXTtpZighYyl0aHJvdyBuZXcgRXJyb3IoJ1RoZSBmcmFtZUlkIFwiJythKydcIiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgdGV4dHVyZSBjYWNoZSAnKTtyZXR1cm4gY30sYi5UZXh0dXJlLmZyb21DYW52YXM9ZnVuY3Rpb24oYSxjKXt2YXIgZD1iLkJhc2VUZXh0dXJlLmZyb21DYW52YXMoYSxjKTtyZXR1cm4gbmV3IGIuVGV4dHVyZShkKX0sYi5UZXh0dXJlLmFkZFRleHR1cmVUb0NhY2hlPWZ1bmN0aW9uKGEsYyl7Yi5UZXh0dXJlQ2FjaGVbY109YX0sYi5UZXh0dXJlLnJlbW92ZVRleHR1cmVGcm9tQ2FjaGU9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5UZXh0dXJlQ2FjaGVbYV07cmV0dXJuIGRlbGV0ZSBiLlRleHR1cmVDYWNoZVthXSxkZWxldGUgYi5CYXNlVGV4dHVyZUNhY2hlW2FdLGN9LGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXM9W10sYi5UZXh0dXJlVXZzPWZ1bmN0aW9uKCl7dGhpcy54MD0wLHRoaXMueTA9MCx0aGlzLngxPTAsdGhpcy55MT0wLHRoaXMueDI9MCx0aGlzLnkyPTAsdGhpcy54Mz0wLHRoaXMueTM9MH0sYi5SZW5kZXJUZXh0dXJlPWZ1bmN0aW9uKGEsYyxkLGUpe2lmKGIuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLndpZHRoPWF8fDEwMCx0aGlzLmhlaWdodD1jfHwxMDAsdGhpcy5mcmFtZT1uZXcgYi5SZWN0YW5nbGUoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMuY3JvcD1uZXcgYi5SZWN0YW5nbGUoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMuYmFzZVRleHR1cmU9bmV3IGIuQmFzZVRleHR1cmUsdGhpcy5iYXNlVGV4dHVyZS53aWR0aD10aGlzLndpZHRoLHRoaXMuYmFzZVRleHR1cmUuaGVpZ2h0PXRoaXMuaGVpZ2h0LHRoaXMuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXM9W10sdGhpcy5iYXNlVGV4dHVyZS5zY2FsZU1vZGU9ZXx8Yi5zY2FsZU1vZGVzLkRFRkFVTFQsdGhpcy5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ9ITAsdGhpcy5yZW5kZXJlcj1kfHxiLmRlZmF1bHRSZW5kZXJlcix0aGlzLnJlbmRlcmVyLnR5cGU9PT1iLldFQkdMX1JFTkRFUkVSKXt2YXIgZj10aGlzLnJlbmRlcmVyLmdsO3RoaXMudGV4dHVyZUJ1ZmZlcj1uZXcgYi5GaWx0ZXJUZXh0dXJlKGYsdGhpcy53aWR0aCx0aGlzLmhlaWdodCx0aGlzLmJhc2VUZXh0dXJlLnNjYWxlTW9kZSksdGhpcy5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tmLmlkXT10aGlzLnRleHR1cmVCdWZmZXIudGV4dHVyZSx0aGlzLnJlbmRlcj10aGlzLnJlbmRlcldlYkdMLHRoaXMucHJvamVjdGlvbj1uZXcgYi5Qb2ludCh0aGlzLndpZHRoLzIsLXRoaXMuaGVpZ2h0LzIpfWVsc2UgdGhpcy5yZW5kZXI9dGhpcy5yZW5kZXJDYW52YXMsdGhpcy50ZXh0dXJlQnVmZmVyPW5ldyBiLkNhbnZhc0J1ZmZlcih0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLmJhc2VUZXh0dXJlLnNvdXJjZT10aGlzLnRleHR1cmVCdWZmZXIuY2FudmFzO3RoaXMudmFsaWQ9ITAsYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5wdXNoKHRoaXMpfSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5UZXh0dXJlLnByb3RvdHlwZSksYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlJlbmRlclRleHR1cmUsYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxjLGQpeyhhIT09dGhpcy53aWR0aHx8YyE9PXRoaXMuaGVpZ2h0KSYmKHRoaXMud2lkdGg9dGhpcy5mcmFtZS53aWR0aD10aGlzLmNyb3Aud2lkdGg9YSx0aGlzLmhlaWdodD10aGlzLmZyYW1lLmhlaWdodD10aGlzLmNyb3AuaGVpZ2h0PWMsZCYmKHRoaXMuYmFzZVRleHR1cmUud2lkdGg9dGhpcy53aWR0aCx0aGlzLmJhc2VUZXh0dXJlLmhlaWdodD10aGlzLmhlaWdodCksdGhpcy5yZW5kZXJlci50eXBlPT09Yi5XRUJHTF9SRU5ERVJFUiYmKHRoaXMucHJvamVjdGlvbi54PXRoaXMud2lkdGgvMix0aGlzLnByb2plY3Rpb24ueT0tdGhpcy5oZWlnaHQvMiksdGhpcy50ZXh0dXJlQnVmZmVyLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSl9LGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt0aGlzLnJlbmRlcmVyLnR5cGU9PT1iLldFQkdMX1JFTkRFUkVSJiZ0aGlzLnJlbmRlcmVyLmdsLmJpbmRGcmFtZWJ1ZmZlcih0aGlzLnJlbmRlcmVyLmdsLkZSQU1FQlVGRkVSLHRoaXMudGV4dHVyZUJ1ZmZlci5mcmFtZUJ1ZmZlciksdGhpcy50ZXh0dXJlQnVmZmVyLmNsZWFyKCl9LGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGUucmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPXRoaXMucmVuZGVyZXIuZ2w7ZS5jb2xvck1hc2soITAsITAsITAsITApLGUudmlld3BvcnQoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLGUuYmluZEZyYW1lYnVmZmVyKGUuRlJBTUVCVUZGRVIsdGhpcy50ZXh0dXJlQnVmZmVyLmZyYW1lQnVmZmVyKSxkJiZ0aGlzLnRleHR1cmVCdWZmZXIuY2xlYXIoKTt2YXIgZj1hLmNoaWxkcmVuLGc9YS53b3JsZFRyYW5zZm9ybTthLndvcmxkVHJhbnNmb3JtPWIuUmVuZGVyVGV4dHVyZS50ZW1wTWF0cml4LGEud29ybGRUcmFuc2Zvcm0uZD0tMSxhLndvcmxkVHJhbnNmb3JtLnR5PS0yKnRoaXMucHJvamVjdGlvbi55LGMmJihhLndvcmxkVHJhbnNmb3JtLnR4PWMueCxhLndvcmxkVHJhbnNmb3JtLnR5LT1jLnkpO2Zvcih2YXIgaD0wLGk9Zi5sZW5ndGg7aT5oO2grKylmW2hdLnVwZGF0ZVRyYW5zZm9ybSgpO2IuV2ViR0xSZW5kZXJlci51cGRhdGVUZXh0dXJlcygpLHRoaXMucmVuZGVyZXIuc3ByaXRlQmF0Y2guZGlydHk9ITAsdGhpcy5yZW5kZXJlci5yZW5kZXJEaXNwbGF5T2JqZWN0KGEsdGhpcy5wcm9qZWN0aW9uLHRoaXMudGV4dHVyZUJ1ZmZlci5mcmFtZUJ1ZmZlciksYS53b3JsZFRyYW5zZm9ybT1nLHRoaXMucmVuZGVyZXIuc3ByaXRlQmF0Y2guZGlydHk9ITB9LGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGUucmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1hLmNoaWxkcmVuLGY9YS53b3JsZFRyYW5zZm9ybTthLndvcmxkVHJhbnNmb3JtPWIuUmVuZGVyVGV4dHVyZS50ZW1wTWF0cml4LGM/KGEud29ybGRUcmFuc2Zvcm0udHg9Yy54LGEud29ybGRUcmFuc2Zvcm0udHk9Yy55KTooYS53b3JsZFRyYW5zZm9ybS50eD0wLGEud29ybGRUcmFuc2Zvcm0udHk9MCk7Zm9yKHZhciBnPTAsaD1lLmxlbmd0aDtoPmc7ZysrKWVbZ10udXBkYXRlVHJhbnNmb3JtKCk7ZCYmdGhpcy50ZXh0dXJlQnVmZmVyLmNsZWFyKCk7dmFyIGk9dGhpcy50ZXh0dXJlQnVmZmVyLmNvbnRleHQ7dGhpcy5yZW5kZXJlci5yZW5kZXJEaXNwbGF5T2JqZWN0KGEsaSksaS5zZXRUcmFuc2Zvcm0oMSwwLDAsMSwwLDApLGEud29ybGRUcmFuc2Zvcm09Zn0sYi5SZW5kZXJUZXh0dXJlLnRlbXBNYXRyaXg9bmV3IGIuTWF0cml4LGIuQXNzZXRMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy5hc3NldFVSTHM9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5sb2FkZXJzQnlUeXBlPXtqcGc6Yi5JbWFnZUxvYWRlcixqcGVnOmIuSW1hZ2VMb2FkZXIscG5nOmIuSW1hZ2VMb2FkZXIsZ2lmOmIuSW1hZ2VMb2FkZXIsd2VicDpiLkltYWdlTG9hZGVyLGpzb246Yi5Kc29uTG9hZGVyLGF0bGFzOmIuQXRsYXNMb2FkZXIsYW5pbTpiLlNwaW5lTG9hZGVyLHhtbDpiLkJpdG1hcEZvbnRMb2FkZXIsZm50OmIuQml0bWFwRm9udExvYWRlcn19LGIuQXNzZXRMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQXNzZXRMb2FkZXIsYi5Bc3NldExvYWRlci5wcm90b3R5cGUuX2dldERhdGFUeXBlPWZ1bmN0aW9uKGEpe3ZhciBiPVwiZGF0YTpcIixjPWEuc2xpY2UoMCxiLmxlbmd0aCkudG9Mb3dlckNhc2UoKTtpZihjPT09Yil7dmFyIGQ9YS5zbGljZShiLmxlbmd0aCksZT1kLmluZGV4T2YoXCIsXCIpO2lmKC0xPT09ZSlyZXR1cm4gbnVsbDt2YXIgZj1kLnNsaWNlKDAsZSkuc3BsaXQoXCI7XCIpWzBdO3JldHVybiBmJiZcInRleHQvcGxhaW5cIiE9PWYudG9Mb3dlckNhc2UoKT9mLnNwbGl0KFwiL1wiKS5wb3AoKS50b0xvd2VyQ2FzZSgpOlwidHh0XCJ9cmV0dXJuIG51bGx9LGIuQXNzZXRMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGEpe2Iub25Bc3NldExvYWRlZChhLmNvbnRlbnQpfXZhciBiPXRoaXM7dGhpcy5sb2FkQ291bnQ9dGhpcy5hc3NldFVSTHMubGVuZ3RoO2Zvcih2YXIgYz0wO2M8dGhpcy5hc3NldFVSTHMubGVuZ3RoO2MrKyl7dmFyIGQ9dGhpcy5hc3NldFVSTHNbY10sZT10aGlzLl9nZXREYXRhVHlwZShkKTtlfHwoZT1kLnNwbGl0KFwiP1wiKS5zaGlmdCgpLnNwbGl0KFwiLlwiKS5wb3AoKS50b0xvd2VyQ2FzZSgpKTt2YXIgZj10aGlzLmxvYWRlcnNCeVR5cGVbZV07aWYoIWYpdGhyb3cgbmV3IEVycm9yKGUrXCIgaXMgYW4gdW5zdXBwb3J0ZWQgZmlsZSB0eXBlXCIpO3ZhciBnPW5ldyBmKGQsdGhpcy5jcm9zc29yaWdpbik7Zy5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsYSksZy5sb2FkKCl9fSxiLkFzc2V0TG9hZGVyLnByb3RvdHlwZS5vbkFzc2V0TG9hZGVkPWZ1bmN0aW9uKGEpe3RoaXMubG9hZENvdW50LS0sdGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwib25Qcm9ncmVzc1wiLGNvbnRlbnQ6dGhpcyxsb2FkZXI6YX0pLHRoaXMub25Qcm9ncmVzcyYmdGhpcy5vblByb2dyZXNzKGEpLHRoaXMubG9hZENvdW50fHwodGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwib25Db21wbGV0ZVwiLGNvbnRlbnQ6dGhpc30pLHRoaXMub25Db21wbGV0ZSYmdGhpcy5vbkNvbXBsZXRlKCkpfSxiLkpzb25Mb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5iYXNlVXJsPWEucmVwbGFjZSgvW15cXC9dKiQvLFwiXCIpLHRoaXMubG9hZGVkPSExfSxiLkpzb25Mb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSnNvbkxvYWRlcixiLkpzb25Mb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3dpbmRvdy5YRG9tYWluUmVxdWVzdCYmYS5jcm9zc29yaWdpbj8odGhpcy5hamF4UmVxdWVzdD1uZXcgd2luZG93LlhEb21haW5SZXF1ZXN0LHRoaXMuYWpheFJlcXVlc3QudGltZW91dD0zZTMsdGhpcy5hamF4UmVxdWVzdC5vbmVycm9yPWZ1bmN0aW9uKCl7YS5vbkVycm9yKCl9LHRoaXMuYWpheFJlcXVlc3Qub250aW1lb3V0PWZ1bmN0aW9uKCl7YS5vbkVycm9yKCl9LHRoaXMuYWpheFJlcXVlc3Qub25wcm9ncmVzcz1mdW5jdGlvbigpe30pOnRoaXMuYWpheFJlcXVlc3Q9d2luZG93LlhNTEh0dHBSZXF1ZXN0P25ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q6bmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIiksdGhpcy5hamF4UmVxdWVzdC5vbmxvYWQ9ZnVuY3Rpb24oKXthLm9uSlNPTkxvYWRlZCgpfSx0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oXCJHRVRcIix0aGlzLnVybCwhMCksdGhpcy5hamF4UmVxdWVzdC5zZW5kKCl9LGIuSnNvbkxvYWRlci5wcm90b3R5cGUub25KU09OTG9hZGVkPWZ1bmN0aW9uKCl7aWYoIXRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VUZXh0KXJldHVybiB0aGlzLm9uRXJyb3IoKSx2b2lkIDA7aWYodGhpcy5qc29uPUpTT04ucGFyc2UodGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQpLHRoaXMuanNvbi5mcmFtZXMpe3ZhciBhPXRoaXMsYz10aGlzLmJhc2VVcmwrdGhpcy5qc29uLm1ldGEuaW1hZ2UsZD1uZXcgYi5JbWFnZUxvYWRlcihjLHRoaXMuY3Jvc3NvcmlnaW4pLGU9dGhpcy5qc29uLmZyYW1lczt0aGlzLnRleHR1cmU9ZC50ZXh0dXJlLmJhc2VUZXh0dXJlLGQuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7YS5vbkxvYWRlZCgpfSk7Zm9yKHZhciBnIGluIGUpe3ZhciBoPWVbZ10uZnJhbWU7aWYoaCYmKGIuVGV4dHVyZUNhY2hlW2ddPW5ldyBiLlRleHR1cmUodGhpcy50ZXh0dXJlLHt4OmgueCx5OmgueSx3aWR0aDpoLncsaGVpZ2h0OmguaH0pLGIuVGV4dHVyZUNhY2hlW2ddLmNyb3A9bmV3IGIuUmVjdGFuZ2xlKGgueCxoLnksaC53LGguaCksZVtnXS50cmltbWVkKSl7dmFyIGk9ZVtnXS5zb3VyY2VTaXplLGo9ZVtnXS5zcHJpdGVTb3VyY2VTaXplO2IuVGV4dHVyZUNhY2hlW2ddLnRyaW09bmV3IGIuUmVjdGFuZ2xlKGoueCxqLnksaS53LGkuaCl9fWQubG9hZCgpfWVsc2UgaWYodGhpcy5qc29uLmJvbmVzKXt2YXIgaz1uZXcgZi5Ta2VsZXRvbkpzb24sbD1rLnJlYWRTa2VsZXRvbkRhdGEodGhpcy5qc29uKTtiLkFuaW1DYWNoZVt0aGlzLnVybF09bCx0aGlzLm9uTG9hZGVkKCl9ZWxzZSB0aGlzLm9uTG9hZGVkKCl9LGIuSnNvbkxvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmxvYWRlZD0hMCx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5vbkVycm9yPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwiZXJyb3JcIixjb250ZW50OnRoaXN9KX0sYi5BdGxhc0xvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5sb2FkZWQ9ITF9LGIuQXRsYXNMb2FkZXIuY29uc3RydWN0b3I9Yi5BdGxhc0xvYWRlcixiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dGhpcy5hamF4UmVxdWVzdD1uZXcgYi5BamF4UmVxdWVzdCx0aGlzLmFqYXhSZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZT10aGlzLm9uQXRsYXNMb2FkZWQuYmluZCh0aGlzKSx0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oXCJHRVRcIix0aGlzLnVybCwhMCksdGhpcy5hamF4UmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlJiZ0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUoXCJhcHBsaWNhdGlvbi9qc29uXCIpLHRoaXMuYWpheFJlcXVlc3Quc2VuZChudWxsKX0sYi5BdGxhc0xvYWRlci5wcm90b3R5cGUub25BdGxhc0xvYWRlZD1mdW5jdGlvbigpe2lmKDQ9PT10aGlzLmFqYXhSZXF1ZXN0LnJlYWR5U3RhdGUpaWYoMjAwPT09dGhpcy5hamF4UmVxdWVzdC5zdGF0dXN8fC0xPT09d2luZG93LmxvY2F0aW9uLmhyZWYuaW5kZXhPZihcImh0dHBcIikpe3RoaXMuYXRsYXM9e21ldGE6e2ltYWdlOltdfSxmcmFtZXM6W119O3ZhciBhPXRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VUZXh0LnNwbGl0KC9cXHI/XFxuLyksYz0tMyxkPTAsZT1udWxsLGY9ITEsZz0wLGg9MCxpPXRoaXMub25Mb2FkZWQuYmluZCh0aGlzKTtmb3IoZz0wO2c8YS5sZW5ndGg7ZysrKWlmKGFbZ109YVtnXS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLFwiXCIpLFwiXCI9PT1hW2ddJiYoZj1nKzEpLGFbZ10ubGVuZ3RoPjApe2lmKGY9PT1nKXRoaXMuYXRsYXMubWV0YS5pbWFnZS5wdXNoKGFbZ10pLGQ9dGhpcy5hdGxhcy5tZXRhLmltYWdlLmxlbmd0aC0xLHRoaXMuYXRsYXMuZnJhbWVzLnB1c2goe30pLGM9LTM7ZWxzZSBpZihjPjApaWYoYyU3PT09MSludWxsIT1lJiYodGhpcy5hdGxhcy5mcmFtZXNbZF1bZS5uYW1lXT1lKSxlPXtuYW1lOmFbZ10sZnJhbWU6e319O2Vsc2V7dmFyIGo9YVtnXS5zcGxpdChcIiBcIik7aWYoYyU3PT09MyllLmZyYW1lLng9TnVtYmVyKGpbMV0ucmVwbGFjZShcIixcIixcIlwiKSksZS5mcmFtZS55PU51bWJlcihqWzJdKTtlbHNlIGlmKGMlNz09PTQpZS5mcmFtZS53PU51bWJlcihqWzFdLnJlcGxhY2UoXCIsXCIsXCJcIikpLGUuZnJhbWUuaD1OdW1iZXIoalsyXSk7ZWxzZSBpZihjJTc9PT01KXt2YXIgaz17eDowLHk6MCx3Ok51bWJlcihqWzFdLnJlcGxhY2UoXCIsXCIsXCJcIikpLGg6TnVtYmVyKGpbMl0pfTtrLnc+ZS5mcmFtZS53fHxrLmg+ZS5mcmFtZS5oPyhlLnRyaW1tZWQ9ITAsZS5yZWFsU2l6ZT1rKTplLnRyaW1tZWQ9ITF9fWMrK31pZihudWxsIT1lJiYodGhpcy5hdGxhcy5mcmFtZXNbZF1bZS5uYW1lXT1lKSx0aGlzLmF0bGFzLm1ldGEuaW1hZ2UubGVuZ3RoPjApe2Zvcih0aGlzLmltYWdlcz1bXSxoPTA7aDx0aGlzLmF0bGFzLm1ldGEuaW1hZ2UubGVuZ3RoO2grKyl7dmFyIGw9dGhpcy5iYXNlVXJsK3RoaXMuYXRsYXMubWV0YS5pbWFnZVtoXSxtPXRoaXMuYXRsYXMuZnJhbWVzW2hdO3RoaXMuaW1hZ2VzLnB1c2gobmV3IGIuSW1hZ2VMb2FkZXIobCx0aGlzLmNyb3Nzb3JpZ2luKSk7Zm9yKGcgaW4gbSl7dmFyIG49bVtnXS5mcmFtZTtuJiYoYi5UZXh0dXJlQ2FjaGVbZ109bmV3IGIuVGV4dHVyZSh0aGlzLmltYWdlc1toXS50ZXh0dXJlLmJhc2VUZXh0dXJlLHt4Om4ueCx5Om4ueSx3aWR0aDpuLncsaGVpZ2h0Om4uaH0pLG1bZ10udHJpbW1lZCYmKGIuVGV4dHVyZUNhY2hlW2ddLnJlYWxTaXplPW1bZ10ucmVhbFNpemUsYi5UZXh0dXJlQ2FjaGVbZ10udHJpbS54PTAsYi5UZXh0dXJlQ2FjaGVbZ10udHJpbS55PTApKX19Zm9yKHRoaXMuY3VycmVudEltYWdlSWQ9MCxoPTA7aDx0aGlzLmltYWdlcy5sZW5ndGg7aCsrKXRoaXMuaW1hZ2VzW2hdLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixpKTt0aGlzLmltYWdlc1t0aGlzLmN1cnJlbnRJbWFnZUlkXS5sb2FkKCl9ZWxzZSB0aGlzLm9uTG9hZGVkKCl9ZWxzZSB0aGlzLm9uRXJyb3IoKX0sYi5BdGxhc0xvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmltYWdlcy5sZW5ndGgtMT50aGlzLmN1cnJlbnRJbWFnZUlkPyh0aGlzLmN1cnJlbnRJbWFnZUlkKyssdGhpcy5pbWFnZXNbdGhpcy5jdXJyZW50SW1hZ2VJZF0ubG9hZCgpKToodGhpcy5sb2FkZWQ9ITAsdGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSkpfSxiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5vbkVycm9yPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwiZXJyb3JcIixjb250ZW50OnRoaXN9KX0sYi5TcHJpdGVTaGVldExvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmJhc2VVcmw9YS5yZXBsYWNlKC9bXlxcL10qJC8sXCJcIiksdGhpcy50ZXh0dXJlPW51bGwsdGhpcy5mcmFtZXM9e319LGIuU3ByaXRlU2hlZXRMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3ByaXRlU2hlZXRMb2FkZXIsYi5TcHJpdGVTaGVldExvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYz1uZXcgYi5Kc29uTG9hZGVyKHRoaXMudXJsLHRoaXMuY3Jvc3NvcmlnaW4pO2MuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKGIpe2EuanNvbj1iLmNvbnRlbnQuanNvbixhLm9uTG9hZGVkKCl9KSxjLmxvYWQoKX0sYi5TcHJpdGVTaGVldExvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KX0sYi5JbWFnZUxvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnRleHR1cmU9Yi5UZXh0dXJlLmZyb21JbWFnZShhLGMpLHRoaXMuZnJhbWVzPVtdfSxiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkltYWdlTG9hZGVyLGIuSW1hZ2VMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXtpZih0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuaGFzTG9hZGVkKXRoaXMub25Mb2FkZWQoKTtlbHNle3ZhciBhPXRoaXM7dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe2Eub25Mb2FkZWQoKX0pfX0sYi5JbWFnZUxvYWRlci5wcm90b3R5cGUub25Mb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KX0sYi5JbWFnZUxvYWRlci5wcm90b3R5cGUubG9hZEZyYW1lZFNwcml0ZVNoZWV0PWZ1bmN0aW9uKGEsYyxkKXt0aGlzLmZyYW1lcz1bXTtmb3IodmFyIGU9TWF0aC5mbG9vcih0aGlzLnRleHR1cmUud2lkdGgvYSksZj1NYXRoLmZsb29yKHRoaXMudGV4dHVyZS5oZWlnaHQvYyksZz0wLGg9MDtmPmg7aCsrKWZvcih2YXIgaT0wO2U+aTtpKyssZysrKXt2YXIgaj1uZXcgYi5UZXh0dXJlKHRoaXMudGV4dHVyZSx7eDppKmEseTpoKmMsd2lkdGg6YSxoZWlnaHQ6Y30pO3RoaXMuZnJhbWVzLnB1c2goaiksZCYmKGIuVGV4dHVyZUNhY2hlW2QrXCItXCIrZ109ail9aWYodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmhhc0xvYWRlZCl0aGlzLm9uTG9hZGVkKCk7ZWxzZXt2YXIgaz10aGlzO3RoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXtrLm9uTG9hZGVkKCl9KX19LGIuQml0bWFwRm9udExvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmJhc2VVcmw9YS5yZXBsYWNlKC9bXlxcL10qJC8sXCJcIiksdGhpcy50ZXh0dXJlPW51bGx9LGIuQml0bWFwRm9udExvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CaXRtYXBGb250TG9hZGVyLGIuQml0bWFwRm9udExvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3RoaXMuYWpheFJlcXVlc3Q9bmV3IGIuQWpheFJlcXVlc3Q7dmFyIGE9dGhpczt0aGlzLmFqYXhSZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZT1mdW5jdGlvbigpe2Eub25YTUxMb2FkZWQoKX0sdGhpcy5hamF4UmVxdWVzdC5vcGVuKFwiR0VUXCIsdGhpcy51cmwsITApLHRoaXMuYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZSYmdGhpcy5hamF4UmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKFwiYXBwbGljYXRpb24veG1sXCIpLHRoaXMuYWpheFJlcXVlc3Quc2VuZChudWxsKX0sYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5vblhNTExvYWRlZD1mdW5jdGlvbigpe2lmKDQ9PT10aGlzLmFqYXhSZXF1ZXN0LnJlYWR5U3RhdGUmJigyMDA9PT10aGlzLmFqYXhSZXF1ZXN0LnN0YXR1c3x8LTE9PT13aW5kb3cubG9jYXRpb24ucHJvdG9jb2wuaW5kZXhPZihcImh0dHBcIikpKXt2YXIgYT10aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlWE1MO2lmKCFhfHwvTVNJRSA5L2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KXx8bmF2aWdhdG9yLmlzQ29jb29uSlMpaWYoXCJmdW5jdGlvblwiPT10eXBlb2Ygd2luZG93LkRPTVBhcnNlcil7dmFyIGM9bmV3IERPTVBhcnNlcjthPWMucGFyc2VGcm9tU3RyaW5nKHRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VUZXh0LFwidGV4dC94bWxcIil9ZWxzZXt2YXIgZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO2QuaW5uZXJIVE1MPXRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VUZXh0LGE9ZH12YXIgZT10aGlzLmJhc2VVcmwrYS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInBhZ2VcIilbMF0uZ2V0QXR0cmlidXRlKFwiZmlsZVwiKSxmPW5ldyBiLkltYWdlTG9hZGVyKGUsdGhpcy5jcm9zc29yaWdpbik7dGhpcy50ZXh0dXJlPWYudGV4dHVyZS5iYXNlVGV4dHVyZTt2YXIgZz17fSxoPWEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbmZvXCIpWzBdLGk9YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNvbW1vblwiKVswXTtnLmZvbnQ9aC5nZXRBdHRyaWJ1dGUoXCJmYWNlXCIpLGcuc2l6ZT1wYXJzZUludChoLmdldEF0dHJpYnV0ZShcInNpemVcIiksMTApLGcubGluZUhlaWdodD1wYXJzZUludChpLmdldEF0dHJpYnV0ZShcImxpbmVIZWlnaHRcIiksMTApLGcuY2hhcnM9e307Zm9yKHZhciBqPWEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjaGFyXCIpLGs9MDtrPGoubGVuZ3RoO2srKyl7dmFyIGw9cGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJpZFwiKSwxMCksbT1uZXcgYi5SZWN0YW5nbGUocGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ4XCIpLDEwKSxwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInlcIiksMTApLHBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwid2lkdGhcIiksMTApLHBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIpLDEwKSk7Zy5jaGFyc1tsXT17eE9mZnNldDpwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInhvZmZzZXRcIiksMTApLHlPZmZzZXQ6cGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ5b2Zmc2V0XCIpLDEwKSx4QWR2YW5jZTpwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInhhZHZhbmNlXCIpLDEwKSxrZXJuaW5nOnt9LHRleHR1cmU6Yi5UZXh0dXJlQ2FjaGVbbF09bmV3IGIuVGV4dHVyZSh0aGlzLnRleHR1cmUsbSl9fXZhciBuPWEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJrZXJuaW5nXCIpO2ZvcihrPTA7azxuLmxlbmd0aDtrKyspe3ZhciBvPXBhcnNlSW50KG5ba10uZ2V0QXR0cmlidXRlKFwiZmlyc3RcIiksMTApLHA9cGFyc2VJbnQobltrXS5nZXRBdHRyaWJ1dGUoXCJzZWNvbmRcIiksMTApLHE9cGFyc2VJbnQobltrXS5nZXRBdHRyaWJ1dGUoXCJhbW91bnRcIiksMTApO2cuY2hhcnNbcF0ua2VybmluZ1tvXT1xfWIuQml0bWFwVGV4dC5mb250c1tnLmZvbnRdPWc7dmFyIHI9dGhpcztmLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe3Iub25Mb2FkZWQoKX0pLGYubG9hZCgpfX0sYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLlNwaW5lTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMubG9hZGVkPSExfSxiLlNwaW5lTG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNwaW5lTG9hZGVyLGIuU3BpbmVMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGM9bmV3IGIuSnNvbkxvYWRlcih0aGlzLnVybCx0aGlzLmNyb3Nzb3JpZ2luKTtcclxuYy5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oYil7YS5qc29uPWIuY29udGVudC5qc29uLGEub25Mb2FkZWQoKX0pLGMubG9hZCgpfSxiLlNwaW5lTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMubG9hZGVkPSEwLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkFic3RyYWN0RmlsdGVyPWZ1bmN0aW9uKGEsYil7dGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMuc2hhZGVycz1bXSx0aGlzLmRpcnR5PSEwLHRoaXMucGFkZGluZz0wLHRoaXMudW5pZm9ybXM9Ynx8e30sdGhpcy5mcmFnbWVudFNyYz1hfHxbXX0sYi5BbHBoYU1hc2tGaWx0ZXI9ZnVuY3Rpb24oYSl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSxhLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMCx0aGlzLnVuaWZvcm1zPXttYXNrOnt0eXBlOlwic2FtcGxlcjJEXCIsdmFsdWU6YX0sbWFwRGltZW5zaW9uczp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MSx5OjUxMTJ9fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sYS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ/KHRoaXMudW5pZm9ybXMubWFzay52YWx1ZS54PWEud2lkdGgsdGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLnk9YS5oZWlnaHQpOih0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb249dGhpcy5vblRleHR1cmVMb2FkZWQuYmluZCh0aGlzKSxhLmJhc2VUZXh0dXJlLm9uKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKSksdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIG1hc2s7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXQ7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gdmVjMiBtYXBEaW1lbnNpb25zO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgbWFwQ29yZHMgPSB2VGV4dHVyZUNvb3JkLnh5O1wiLFwiICAgbWFwQ29yZHMgKz0gKGRpbWVuc2lvbnMuencgKyBvZmZzZXQpLyBkaW1lbnNpb25zLnh5IDtcIixcIiAgIG1hcENvcmRzLnkgKj0gLTEuMDtcIixcIiAgIG1hcENvcmRzLnkgKz0gMS4wO1wiLFwiICAgbWFwQ29yZHMgKj0gZGltZW5zaW9ucy54eSAvIG1hcERpbWVuc2lvbnM7XCIsXCIgICB2ZWM0IG9yaWdpbmFsID0gIHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBmbG9hdCBtYXNrQWxwaGEgPSAgdGV4dHVyZTJEKG1hc2ssIG1hcENvcmRzKS5yO1wiLFwiICAgb3JpZ2luYWwgKj0gbWFza0FscGhhO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gIG9yaWdpbmFsO1wiLFwifVwiXX0sYi5BbHBoYU1hc2tGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQWxwaGFNYXNrRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkFscGhhTWFza0ZpbHRlcixiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGUub25UZXh0dXJlTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLng9dGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLndpZHRoLHRoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS55PXRoaXMudW5pZm9ybXMubWFzay52YWx1ZS5oZWlnaHQsdGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLmJhc2VUZXh0dXJlLm9mZihcImxvYWRlZFwiLHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbil9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGUsXCJtYXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMubWFzay52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMubWFzay52YWx1ZT1hfX0pLGIuQ29sb3JNYXRyaXhGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e21hdHJpeDp7dHlwZTpcIm1hdDRcIix2YWx1ZTpbMSwwLDAsMCwwLDEsMCwwLDAsMCwxLDAsMCwwLDAsMV19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBpbnZlcnQ7XCIsXCJ1bmlmb3JtIG1hdDQgbWF0cml4O1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKSAqIG1hdHJpeDtcIixcIn1cIl19LGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ29sb3JNYXRyaXhGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlLFwibWF0cml4XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm1hdHJpeC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMubWF0cml4LnZhbHVlPWF9fSksYi5HcmF5RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtncmF5Ont0eXBlOlwiMWZcIix2YWx1ZToxfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSBmbG9hdCBncmF5O1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBnbF9GcmFnQ29sb3IucmdiID0gbWl4KGdsX0ZyYWdDb2xvci5yZ2IsIHZlYzMoMC4yMTI2KmdsX0ZyYWdDb2xvci5yICsgMC43MTUyKmdsX0ZyYWdDb2xvci5nICsgMC4wNzIyKmdsX0ZyYWdDb2xvci5iKSwgZ3JheSk7XCIsXCJ9XCJdfSxiLkdyYXlGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuR3JheUZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5HcmF5RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkdyYXlGaWx0ZXIucHJvdG90eXBlLFwiZ3JheVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ncmF5LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ncmF5LnZhbHVlPWF9fSksYi5EaXNwbGFjZW1lbnRGaWx0ZXI9ZnVuY3Rpb24oYSl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSxhLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMCx0aGlzLnVuaWZvcm1zPXtkaXNwbGFjZW1lbnRNYXA6e3R5cGU6XCJzYW1wbGVyMkRcIix2YWx1ZTphfSxzY2FsZTp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MzAseTozMH19LG9mZnNldDp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MCx5OjB9fSxtYXBEaW1lbnNpb25zOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoxLHk6NTExMn19LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpbMCwwLDAsMF19fSxhLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD8odGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLng9YS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueT1hLmhlaWdodCk6KHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbj10aGlzLm9uVGV4dHVyZUxvYWRlZC5iaW5kKHRoaXMpLGEuYmFzZVRleHR1cmUub24oXCJsb2FkZWRcIix0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb24pKSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgZGlzcGxhY2VtZW50TWFwO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIHZlYzIgc2NhbGU7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0O1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHZlYzIgbWFwRGltZW5zaW9ucztcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIG1hcENvcmRzID0gdlRleHR1cmVDb29yZC54eTtcIixcIiAgIG1hcENvcmRzICs9IChkaW1lbnNpb25zLnp3ICsgb2Zmc2V0KS8gZGltZW5zaW9ucy54eSA7XCIsXCIgICBtYXBDb3Jkcy55ICo9IC0xLjA7XCIsXCIgICBtYXBDb3Jkcy55ICs9IDEuMDtcIixcIiAgIHZlYzIgbWF0U2FtcGxlID0gdGV4dHVyZTJEKGRpc3BsYWNlbWVudE1hcCwgbWFwQ29yZHMpLnh5O1wiLFwiICAgbWF0U2FtcGxlIC09IDAuNTtcIixcIiAgIG1hdFNhbXBsZSAqPSBzY2FsZTtcIixcIiAgIG1hdFNhbXBsZSAvPSBtYXBEaW1lbnNpb25zO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIG1hdFNhbXBsZS54LCB2VGV4dHVyZUNvb3JkLnkgKyBtYXRTYW1wbGUueSkpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peCggZ2xfRnJhZ0NvbG9yLnJnYiwgZ2xfRnJhZ0NvbG9yLnJnYiwgMS4wKTtcIixcIiAgIHZlYzIgY29yZCA9IHZUZXh0dXJlQ29vcmQ7XCIsXCJ9XCJdfSxiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRGlzcGxhY2VtZW50RmlsdGVyLGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZS5vblRleHR1cmVMb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueD10aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueT10aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZS5oZWlnaHQsdGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWUuYmFzZVRleHR1cmUub2ZmKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZSxcIm1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUsXCJzY2FsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5zY2FsZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuc2NhbGUudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLFwib2Zmc2V0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMub2Zmc2V0LnZhbHVlPWF9fSksYi5QaXhlbGF0ZUZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17aW52ZXJ0Ont0eXBlOlwiMWZcIix2YWx1ZTowfSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6bmV3IEZsb2F0MzJBcnJheShbMWU0LDEwMCwxMCwxMF0pfSxwaXhlbFNpemU6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjEwLHk6MTB9fX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjMiB0ZXN0RGltO1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHZlYzIgcGl4ZWxTaXplO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiBjb29yZCA9IHZUZXh0dXJlQ29vcmQ7XCIsXCIgICB2ZWMyIHNpemUgPSBkaW1lbnNpb25zLnh5L3BpeGVsU2l6ZTtcIixcIiAgIHZlYzIgY29sb3IgPSBmbG9vciggKCB2VGV4dHVyZUNvb3JkICogc2l6ZSApICkgLyBzaXplICsgcGl4ZWxTaXplL2RpbWVuc2lvbnMueHkgKiAwLjU7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIGNvbG9yKTtcIixcIn1cIl19LGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUGl4ZWxhdGVGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlLFwic2l6ZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5waXhlbFNpemUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMucGl4ZWxTaXplLnZhbHVlPWF9fSksYi5CbHVyWEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17Ymx1cjp7dHlwZTpcIjFmXCIsdmFsdWU6MS81MTJ9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBibHVyO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjNCBzdW0gPSB2ZWM0KDAuMCk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDQuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDMuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDIuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIGJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTY7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIGJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgMi4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xMjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgMy4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wOTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgNC4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wNTtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHN1bTtcIixcIn1cIl19LGIuQmx1clhGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQmx1clhGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmx1clhGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1clhGaWx0ZXIucHJvdG90eXBlLFwiYmx1clwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLGIuQmx1cllGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2JsdXI6e3R5cGU6XCIxZlwiLHZhbHVlOjEvNTEyfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgYmx1cjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzQgc3VtID0gdmVjNCgwLjApO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDQuMCpibHVyKSkgKiAwLjA1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDMuMCpibHVyKSkgKiAwLjA5O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDIuMCpibHVyKSkgKiAwLjEyO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIGJsdXIpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSkgKiAwLjE2O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSArIGJsdXIpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgMi4wKmJsdXIpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgMy4wKmJsdXIpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgNC4wKmJsdXIpKSAqIDAuMDU7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSBzdW07XCIsXCJ9XCJdfSxiLkJsdXJZRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkJsdXJZRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJsdXJZRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJZRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZS8oMS83ZTMpfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlPTEvN2UzKmF9fSksYi5CbHVyRmlsdGVyPWZ1bmN0aW9uKCl7dGhpcy5ibHVyWEZpbHRlcj1uZXcgYi5CbHVyWEZpbHRlcix0aGlzLmJsdXJZRmlsdGVyPW5ldyBiLkJsdXJZRmlsdGVyLHRoaXMucGFzc2VzPVt0aGlzLmJsdXJYRmlsdGVyLHRoaXMuYmx1cllGaWx0ZXJdfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYmx1clhGaWx0ZXIuYmx1cn0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuYmx1clhGaWx0ZXIuYmx1cj10aGlzLmJsdXJZRmlsdGVyLmJsdXI9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJYXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJsdXJYRmlsdGVyLmJsdXJ9LHNldDpmdW5jdGlvbihhKXt0aGlzLmJsdXJYRmlsdGVyLmJsdXI9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJZXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJsdXJZRmlsdGVyLmJsdXJ9LHNldDpmdW5jdGlvbihhKXt0aGlzLmJsdXJZRmlsdGVyLmJsdXI9YX19KSxiLkludmVydEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17aW52ZXJ0Ont0eXBlOlwiMWZcIix2YWx1ZToxfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgaW52ZXJ0O1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGdsX0ZyYWdDb2xvci5yZ2IgPSBtaXgoICh2ZWMzKDEpLWdsX0ZyYWdDb2xvci5yZ2IpICogZ2xfRnJhZ0NvbG9yLmEsIGdsX0ZyYWdDb2xvci5yZ2IsIDEuMCAtIGludmVydCk7XCIsXCJ9XCJdfSxiLkludmVydEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5JbnZlcnRGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW52ZXJ0RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkludmVydEZpbHRlci5wcm90b3R5cGUsXCJpbnZlcnRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuaW52ZXJ0LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5pbnZlcnQudmFsdWU9YX19KSxiLlNlcGlhRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtzZXBpYTp7dHlwZTpcIjFmXCIsdmFsdWU6MX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IHNlcGlhO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJjb25zdCBtYXQzIHNlcGlhTWF0cml4ID0gbWF0MygwLjM1ODgsIDAuNzA0NCwgMC4xMzY4LCAwLjI5OTAsIDAuNTg3MCwgMC4xMTQwLCAwLjIzOTIsIDAuNDY5NiwgMC4wOTEyKTtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peCggZ2xfRnJhZ0NvbG9yLnJnYiwgZ2xfRnJhZ0NvbG9yLnJnYiAqIHNlcGlhTWF0cml4LCBzZXBpYSk7XCIsXCJ9XCJdfSxiLlNlcGlhRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLlNlcGlhRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNlcGlhRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlNlcGlhRmlsdGVyLnByb3RvdHlwZSxcInNlcGlhXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnNlcGlhLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5zZXBpYS52YWx1ZT1hfX0pLGIuVHdpc3RGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3JhZGl1czp7dHlwZTpcIjFmXCIsdmFsdWU6LjV9LGFuZ2xlOnt0eXBlOlwiMWZcIix2YWx1ZTo1fSxvZmZzZXQ6e3R5cGU6XCIyZlwiLHZhbHVlOnt4Oi41LHk6LjV9fX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IHJhZGl1cztcIixcInVuaWZvcm0gZmxvYXQgYW5nbGU7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0O1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgY29vcmQgPSB2VGV4dHVyZUNvb3JkIC0gb2Zmc2V0O1wiLFwiICAgZmxvYXQgZGlzdGFuY2UgPSBsZW5ndGgoY29vcmQpO1wiLFwiICAgaWYgKGRpc3RhbmNlIDwgcmFkaXVzKSB7XCIsXCIgICAgICAgZmxvYXQgcmF0aW8gPSAocmFkaXVzIC0gZGlzdGFuY2UpIC8gcmFkaXVzO1wiLFwiICAgICAgIGZsb2F0IGFuZ2xlTW9kID0gcmF0aW8gKiByYXRpbyAqIGFuZ2xlO1wiLFwiICAgICAgIGZsb2F0IHMgPSBzaW4oYW5nbGVNb2QpO1wiLFwiICAgICAgIGZsb2F0IGMgPSBjb3MoYW5nbGVNb2QpO1wiLFwiICAgICAgIGNvb3JkID0gdmVjMihjb29yZC54ICogYyAtIGNvb3JkLnkgKiBzLCBjb29yZC54ICogcyArIGNvb3JkLnkgKiBjKTtcIixcIiAgIH1cIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgY29vcmQrb2Zmc2V0KTtcIixcIn1cIl19LGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuVHdpc3RGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLFwib2Zmc2V0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5vZmZzZXQudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Ud2lzdEZpbHRlci5wcm90b3R5cGUsXCJyYWRpdXNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMucmFkaXVzLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLnJhZGl1cy52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlR3aXN0RmlsdGVyLnByb3RvdHlwZSxcImFuZ2xlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlPWF9fSksYi5Db2xvclN0ZXBGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3N0ZXA6e3R5cGU6XCIxZlwiLHZhbHVlOjV9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IHN0ZXA7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjNCBjb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBjb2xvciA9IGZsb29yKGNvbG9yICogc3RlcCkgLyBzdGVwO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XCIsXCJ9XCJdfSxiLkNvbG9yU3RlcEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Db2xvclN0ZXBGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ29sb3JTdGVwRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkNvbG9yU3RlcEZpbHRlci5wcm90b3R5cGUsXCJzdGVwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnN0ZXAudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLnN0ZXAudmFsdWU9YX19KSxiLkRvdFNjcmVlbkZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17c2NhbGU6e3R5cGU6XCIxZlwiLHZhbHVlOjF9LGFuZ2xlOnt0eXBlOlwiMWZcIix2YWx1ZTo1fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IGFuZ2xlO1wiLFwidW5pZm9ybSBmbG9hdCBzY2FsZTtcIixcImZsb2F0IHBhdHRlcm4oKSB7XCIsXCIgICBmbG9hdCBzID0gc2luKGFuZ2xlKSwgYyA9IGNvcyhhbmdsZSk7XCIsXCIgICB2ZWMyIHRleCA9IHZUZXh0dXJlQ29vcmQgKiBkaW1lbnNpb25zLnh5O1wiLFwiICAgdmVjMiBwb2ludCA9IHZlYzIoXCIsXCIgICAgICAgYyAqIHRleC54IC0gcyAqIHRleC55LFwiLFwiICAgICAgIHMgKiB0ZXgueCArIGMgKiB0ZXgueVwiLFwiICAgKSAqIHNjYWxlO1wiLFwiICAgcmV0dXJuIChzaW4ocG9pbnQueCkgKiBzaW4ocG9pbnQueSkpICogNC4wO1wiLFwifVwiLFwidm9pZCBtYWluKCkge1wiLFwiICAgdmVjNCBjb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBmbG9hdCBhdmVyYWdlID0gKGNvbG9yLnIgKyBjb2xvci5nICsgY29sb3IuYikgLyAzLjA7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHZlYzMoYXZlcmFnZSAqIDEwLjAgLSA1LjAgKyBwYXR0ZXJuKCkpLCBjb2xvci5hKTtcIixcIn1cIl19LGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkRvdFNjcmVlbkZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Eb3RTY3JlZW5GaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZSxcInNjYWxlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZSxcImFuZ2xlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlPWF9fSksYi5Dcm9zc0hhdGNoRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtibHVyOnt0eXBlOlwiMWZcIix2YWx1ZToxLzUxMn19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGJsdXI7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICAgZmxvYXQgbHVtID0gbGVuZ3RoKHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZC54eSkucmdiKTtcIixcIiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDEuMCwgMS4wLCAxLjAsIDEuMCk7XCIsXCIgICAgaWYgKGx1bSA8IDEuMDApIHtcIixcIiAgICAgICAgaWYgKG1vZChnbF9GcmFnQ29vcmQueCArIGdsX0ZyYWdDb29yZC55LCAxMC4wKSA9PSAwLjApIHtcIixcIiAgICAgICAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMS4wKTtcIixcIiAgICAgICAgfVwiLFwiICAgIH1cIixcIiAgICBpZiAobHVtIDwgMC43NSkge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54IC0gZ2xfRnJhZ0Nvb3JkLnksIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwiICAgIGlmIChsdW0gPCAwLjUwKSB7XCIsXCIgICAgICAgIGlmIChtb2QoZ2xfRnJhZ0Nvb3JkLnggKyBnbF9GcmFnQ29vcmQueSAtIDUuMCwgMTAuMCkgPT0gMC4wKSB7XCIsXCIgICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAuMCwgMC4wLCAwLjAsIDEuMCk7XCIsXCIgICAgICAgIH1cIixcIiAgICB9XCIsXCIgICAgaWYgKGx1bSA8IDAuMykge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54IC0gZ2xfRnJhZ0Nvb3JkLnkgLSA1LjAsIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwifVwiXX0sYi5Dcm9zc0hhdGNoRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkNyb3NzSGF0Y2hGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmx1cllGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQ3Jvc3NIYXRjaEZpbHRlci5wcm90b3R5cGUsXCJibHVyXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWUvKDEvN2UzKX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLGIuUkdCU3BsaXRGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3JlZDp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MjAseToyMH19LGdyZWVuOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDotMjAseToyMH19LGJsdWU6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjIwLHk6LTIwfX0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOlswLDAsMCwwXX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHZlYzIgcmVkO1wiLFwidW5pZm9ybSB2ZWMyIGdyZWVuO1wiLFwidW5pZm9ybSB2ZWMyIGJsdWU7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvci5yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkICsgcmVkL2RpbWVuc2lvbnMueHkpLnI7XCIsXCIgICBnbF9GcmFnQ29sb3IuZyA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCArIGdyZWVuL2RpbWVuc2lvbnMueHkpLmc7XCIsXCIgICBnbF9GcmFnQ29sb3IuYiA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCArIGJsdWUvZGltZW5zaW9ucy54eSkuYjtcIixcIiAgIGdsX0ZyYWdDb2xvci5hID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKS5hO1wiLFwifVwiXX0sYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5SR0JTcGxpdEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGUsXCJhbmdsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWU9MS83ZTMqYX19KSxcInVuZGVmaW5lZFwiIT10eXBlb2YgZXhwb3J0cz8oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMmJihleHBvcnRzPW1vZHVsZS5leHBvcnRzPWIpLGV4cG9ydHMuUElYST1iKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShiKTphLlBJWEk9Yn0pLmNhbGwodGhpcyk7IiwiLyoqXG4gKiBUd2Vlbi5qcyAtIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanNcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanMvZ3JhcGhzL2NvbnRyaWJ1dG9ycyBmb3IgdGhlIGZ1bGwgbGlzdCBvZiBjb250cmlidXRvcnMuXG4gKiBUaGFuayB5b3UgYWxsLCB5b3UncmUgYXdlc29tZSFcbiAqL1xuXG4vLyBEYXRlLm5vdyBzaGltIGZvciAoYWhlbSkgSW50ZXJuZXQgRXhwbG8oZHxyKWVyXG5pZiAoIERhdGUubm93ID09PSB1bmRlZmluZWQgKSB7XG5cblx0RGF0ZS5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cblx0fTtcblxufVxuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoIGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgX3R3ZWVucyA9IFtdO1xuXG5cdHJldHVybiB7XG5cblx0XHRSRVZJU0lPTjogJzE0JyxcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0X3R3ZWVucy5wdXNoKCB0d2VlbiApO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZTogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YoIHR3ZWVuICk7XG5cblx0XHRcdGlmICggaSAhPT0gLTEgKSB7XG5cblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoIGksIDEgKTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0XHRpZiAoIF90d2VlbnMubGVuZ3RoID09PSAwICkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdHRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cblx0XHRcdHdoaWxlICggaSA8IF90d2VlbnMubGVuZ3RoICkge1xuXG5cdFx0XHRcdGlmICggX3R3ZWVuc1sgaSBdLnVwZGF0ZSggdGltZSApICkge1xuXG5cdFx0XHRcdFx0aSsrO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHRfdHdlZW5zLnNwbGljZSggaSwgMSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxufSApKCk7XG5cblRXRUVOLlR3ZWVuID0gZnVuY3Rpb24gKCBvYmplY3QgKSB7XG5cblx0dmFyIF9vYmplY3QgPSBvYmplY3Q7XG5cdHZhciBfdmFsdWVzU3RhcnQgPSB7fTtcblx0dmFyIF92YWx1ZXNFbmQgPSB7fTtcblx0dmFyIF92YWx1ZXNTdGFydFJlcGVhdCA9IHt9O1xuXHR2YXIgX2R1cmF0aW9uID0gMTAwMDtcblx0dmFyIF9yZXBlYXQgPSAwO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIFNldCBhbGwgc3RhcnRpbmcgdmFsdWVzIHByZXNlbnQgb24gdGhlIHRhcmdldCBvYmplY3Rcblx0Zm9yICggdmFyIGZpZWxkIGluIG9iamVjdCApIHtcblxuXHRcdF92YWx1ZXNTdGFydFsgZmllbGQgXSA9IHBhcnNlRmxvYXQob2JqZWN0W2ZpZWxkXSwgMTApO1xuXG5cdH1cblxuXHR0aGlzLnRvID0gZnVuY3Rpb24gKCBwcm9wZXJ0aWVzLCBkdXJhdGlvbiApIHtcblxuXHRcdGlmICggZHVyYXRpb24gIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0X2R1cmF0aW9uID0gZHVyYXRpb247XG5cblx0XHR9XG5cblx0XHRfdmFsdWVzRW5kID0gcHJvcGVydGllcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdFRXRUVOLmFkZCggdGhpcyApO1xuXG5cdFx0X2lzUGxheWluZyA9IHRydWU7XG5cblx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblxuXHRcdF9zdGFydFRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cdFx0X3N0YXJ0VGltZSArPSBfZGVsYXlUaW1lO1xuXG5cdFx0Zm9yICggdmFyIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdLmxlbmd0aCA9PT0gMCApIHtcblxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBjcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFsgcHJvcGVydHkgXSA9IFsgX29iamVjdFsgcHJvcGVydHkgXSBdLmNvbmNhdCggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSApO1xuXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF9vYmplY3RbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmKCAoIF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSBpbnN0YW5jZW9mIEFycmF5ICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoICFfaXNQbGF5aW5nICkge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKCB0aGlzICk7XG5cdFx0X2lzUGxheWluZyA9IGZhbHNlO1xuXG5cdFx0aWYgKCBfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHR9XG5cblx0XHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRfY2hhaW5lZFR3ZWVuc1sgaSBdLnN0b3AoKTtcblxuXHRcdH1cblxuXHR9O1xuXG5cdHRoaXMuZGVsYXkgPSBmdW5jdGlvbiAoIGFtb3VudCApIHtcblxuXHRcdF9kZWxheVRpbWUgPSBhbW91bnQ7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnJlcGVhdCA9IGZ1bmN0aW9uICggdGltZXMgKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnlveW8gPSBmdW5jdGlvbiggeW95byApIHtcblxuXHRcdF95b3lvID0geW95bztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cblx0dGhpcy5lYXNpbmcgPSBmdW5jdGlvbiAoIGVhc2luZyApIHtcblxuXHRcdF9lYXNpbmdGdW5jdGlvbiA9IGVhc2luZztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuaW50ZXJwb2xhdGlvbiA9IGZ1bmN0aW9uICggaW50ZXJwb2xhdGlvbiApIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25VcGRhdGUgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25Db21wbGV0ZSA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25TdG9wQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0dmFyIHByb3BlcnR5O1xuXG5cdFx0aWYgKCB0aW1lIDwgX3N0YXJ0VGltZSApIHtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cblx0XHRpZiAoIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9PT0gZmFsc2UgKSB7XG5cblx0XHRcdGlmICggX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0dmFyIGVsYXBzZWQgPSAoIHRpbWUgLSBfc3RhcnRUaW1lICkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YXIgdmFsdWUgPSBfZWFzaW5nRnVuY3Rpb24oIGVsYXBzZWQgKTtcblxuXHRcdGZvciAoIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdHZhciBzdGFydCA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXHRcdFx0dmFyIGVuZCA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmICggZW5kIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24oIGVuZCwgdmFsdWUgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHQvLyBQYXJzZXMgcmVsYXRpdmUgZW5kIHZhbHVlcyB3aXRoIHN0YXJ0IGFzIGJhc2UgKGUuZy46ICsxMCwgLTMpXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0ZW5kID0gc3RhcnQgKyBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IHN0YXJ0ICsgKCBlbmQgLSBzdGFydCApICogdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0aWYgKCBfb25VcGRhdGVDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0X29uVXBkYXRlQ2FsbGJhY2suY2FsbCggX29iamVjdCwgdmFsdWUgKTtcblxuXHRcdH1cblxuXHRcdGlmICggZWxhcHNlZCA9PSAxICkge1xuXG5cdFx0XHRpZiAoIF9yZXBlYXQgPiAwICkge1xuXG5cdFx0XHRcdGlmKCBpc0Zpbml0ZSggX3JlcGVhdCApICkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciggcHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0ICkge1xuXG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gKSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSwgMTApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cdFx0XHRcdFx0XHRfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0X3JldmVyc2VkID0gIV9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX2RlbGF5VGltZTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoIF9vbkNvbXBsZXRlQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdFx0XHRfb25Db21wbGV0ZUNhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRcdFx0X2NoYWluZWRUd2VlbnNbIGkgXS5zdGFydCggdGltZSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXG5cdH07XG5cbn07XG5cblxuVFdFRU4uRWFzaW5nID0ge1xuXG5cdExpbmVhcjoge1xuXG5cdFx0Tm9uZTogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gaztcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YWRyYXRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqICggMiAtIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIC0gMC41ICogKCAtLWsgKiAoIGsgLSAyICkgLSAxICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDdWJpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogayArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YXJ0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtICggLS1rICogayAqIGsgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoICggayAtPSAyICkgKiBrICogayAqIGsgLSAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWludGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiBrICogayAqIGsgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRTaW51c29pZGFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguY29zKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc2luKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKCAxIC0gTWF0aC5jb3MoIE1hdGguUEkgKiBrICkgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEV4cG9uZW50aWFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdyggMTAyNCwgayAtIDEgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDEgPyAxIDogMSAtIE1hdGgucG93KCAyLCAtIDEwICogayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIE1hdGgucG93KCAxMDI0LCBrIC0gMSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggLSBNYXRoLnBvdyggMiwgLSAxMCAqICggayAtIDEgKSApICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5zcXJ0KCAxIC0gayAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCggMSAtICggLS1rICogayApICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIC0gMC41ICogKCBNYXRoLnNxcnQoIDEgLSBrICogaykgLSAxKTtcblx0XHRcdHJldHVybiAwLjUgKiAoIE1hdGguc3FydCggMSAtICggayAtPSAyKSAqIGspICsgMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFbGFzdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuIC0gKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuICggYSAqIE1hdGgucG93KCAyLCAtIDEwICogaykgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICsgMSApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzLCBhID0gMC4xLCBwID0gMC40O1xuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggIWEgfHwgYSA8IDEgKSB7IGEgPSAxOyBzID0gcCAvIDQ7IH1cblx0XHRcdGVsc2UgcyA9IHAgKiBNYXRoLmFzaW4oIDEgLyBhICkgLyAoIDIgKiBNYXRoLlBJICk7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIC0gMC41ICogKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXHRcdFx0cmV0dXJuIGEgKiBNYXRoLnBvdyggMiwgLTEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSAqIDAuNSArIDE7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCYWNrOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cdFx0XHRyZXR1cm4gayAqIGsgKiAoICggcyArIDEgKSAqIGsgLSBzICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblx0XHRcdHJldHVybiAtLWsgKiBrICogKCAoIHMgKyAxICkgKiBrICsgcyApICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogKCBrICogayAqICggKCBzICsgMSApICogayAtIHMgKSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiAoICggcyArIDEgKSAqIGsgKyBzICkgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCb3VuY2U6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoIDEgLSBrICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8ICggMSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogayAqIGs7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDEuNSAvIDIuNzUgKSApICogayArIDAuNzU7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIuNSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi4yNSAvIDIuNzUgKSApICogayArIDAuOTM3NTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi42MjUgLyAyLjc1ICkgKSAqIGsgKyAwLjk4NDM3NTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8IDAuNSApIHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLkluKCBrICogMiApICogMC41O1xuXHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KCBrICogMiAtIDEgKSAqIDAuNSArIDAuNTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cblRXRUVOLkludGVycG9sYXRpb24gPSB7XG5cblx0TGluZWFyOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuTGluZWFyO1xuXG5cdFx0aWYgKCBrIDwgMCApIHJldHVybiBmbiggdlsgMCBdLCB2WyAxIF0sIGYgKTtcblx0XHRpZiAoIGsgPiAxICkgcmV0dXJuIGZuKCB2WyBtIF0sIHZbIG0gLSAxIF0sIG0gLSBmICk7XG5cblx0XHRyZXR1cm4gZm4oIHZbIGkgXSwgdlsgaSArIDEgPiBtID8gbSA6IGkgKyAxIF0sIGYgLSBpICk7XG5cblx0fSxcblxuXHRCZXppZXI6IGZ1bmN0aW9uICggdiwgayApIHtcblxuXHRcdHZhciBiID0gMCwgbiA9IHYubGVuZ3RoIC0gMSwgcHcgPSBNYXRoLnBvdywgYm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkJlcm5zdGVpbiwgaTtcblxuXHRcdGZvciAoIGkgPSAwOyBpIDw9IG47IGkrKyApIHtcblx0XHRcdGIgKz0gcHcoIDEgLSBrLCBuIC0gaSApICogcHcoIGssIGkgKSAqIHZbIGkgXSAqIGJuKCBuLCBpICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGI7XG5cblx0fSxcblxuXHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQ2F0bXVsbFJvbTtcblxuXHRcdGlmICggdlsgMCBdID09PSB2WyBtIF0gKSB7XG5cblx0XHRcdGlmICggayA8IDAgKSBpID0gTWF0aC5mbG9vciggZiA9IG0gKiAoIDEgKyBrICkgKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyAoIGkgLSAxICsgbSApICUgbSBdLCB2WyBpIF0sIHZbICggaSArIDEgKSAlIG0gXSwgdlsgKCBpICsgMiApICUgbSBdLCBmIC0gaSApO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKCBrIDwgMCApIHJldHVybiB2WyAwIF0gLSAoIGZuKCB2WyAwIF0sIHZbIDAgXSwgdlsgMSBdLCB2WyAxIF0sIC1mICkgLSB2WyAwIF0gKTtcblx0XHRcdGlmICggayA+IDEgKSByZXR1cm4gdlsgbSBdIC0gKCBmbiggdlsgbSBdLCB2WyBtIF0sIHZbIG0gLSAxIF0sIHZbIG0gLSAxIF0sIGYgLSBtICkgLSB2WyBtIF0gKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyBpID8gaSAtIDEgOiAwIF0sIHZbIGkgXSwgdlsgbSA8IGkgKyAxID8gbSA6IGkgKyAxIF0sIHZbIG0gPCBpICsgMiA/IG0gOiBpICsgMiBdLCBmIC0gaSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0VXRpbHM6IHtcblxuXHRcdExpbmVhcjogZnVuY3Rpb24gKCBwMCwgcDEsIHQgKSB7XG5cblx0XHRcdHJldHVybiAoIHAxIC0gcDAgKSAqIHQgKyBwMDtcblxuXHRcdH0sXG5cblx0XHRCZXJuc3RlaW46IGZ1bmN0aW9uICggbiAsIGkgKSB7XG5cblx0XHRcdHZhciBmYyA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuRmFjdG9yaWFsO1xuXHRcdFx0cmV0dXJuIGZjKCBuICkgLyBmYyggaSApIC8gZmMoIG4gLSBpICk7XG5cblx0XHR9LFxuXG5cdFx0RmFjdG9yaWFsOiAoIGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0dmFyIGEgPSBbIDEgXTtcblxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICggbiApIHtcblxuXHRcdFx0XHR2YXIgcyA9IDEsIGk7XG5cdFx0XHRcdGlmICggYVsgbiBdICkgcmV0dXJuIGFbIG4gXTtcblx0XHRcdFx0Zm9yICggaSA9IG47IGkgPiAxOyBpLS0gKSBzICo9IGk7XG5cdFx0XHRcdHJldHVybiBhWyBuIF0gPSBzO1xuXG5cdFx0XHR9O1xuXG5cdFx0fSApKCksXG5cblx0XHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHAwLCBwMSwgcDIsIHAzLCB0ICkge1xuXG5cdFx0XHR2YXIgdjAgPSAoIHAyIC0gcDAgKSAqIDAuNSwgdjEgPSAoIHAzIC0gcDEgKSAqIDAuNSwgdDIgPSB0ICogdCwgdDMgPSB0ICogdDI7XG5cdFx0XHRyZXR1cm4gKCAyICogcDEgLSAyICogcDIgKyB2MCArIHYxICkgKiB0MyArICggLSAzICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSApICogdDIgKyB2MCAqIHQgKyBwMTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzPVRXRUVOOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBQaXhpQXBwID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1BpeGlBcHBcIik7XG52YXIgTmV0UG9rZXJDbGllbnRWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvTmV0UG9rZXJDbGllbnRWaWV3XCIpO1xudmFyIE5ldFBva2VyQ2xpZW50Q29udHJvbGxlciA9IHJlcXVpcmUoXCIuLi9jb250cm9sbGVyL05ldFBva2VyQ2xpZW50Q29udHJvbGxlclwiKTtcbnZhciBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvblwiKTtcbnZhciBQcm90b0Nvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vUHJvdG9Db25uZWN0aW9uXCIpO1xudmFyIExvYWRpbmdTY3JlZW4gPSByZXF1aXJlKFwiLi4vdmlldy9Mb2FkaW5nU2NyZWVuXCIpO1xudmFyIFN0YXRlQ29tcGxldGVNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1N0YXRlQ29tcGxldGVNZXNzYWdlXCIpO1xudmFyIEluaXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0luaXRNZXNzYWdlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xuXG4vKipcbiAqIE1haW4gZW50cnkgcG9pbnQgZm9yIGNsaWVudC5cbiAqIEBjbGFzcyBOZXRQb2tlckNsaWVudFxuICovXG5mdW5jdGlvbiBOZXRQb2tlckNsaWVudChkb21JZCkge1xuXHRQaXhpQXBwLmNhbGwodGhpcywgZG9tSWQsIDk2MCwgNzIwKTtcblxuXHR0aGlzLmxvYWRpbmdTY3JlZW4gPSBuZXcgTG9hZGluZ1NjcmVlbigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMubG9hZGluZ1NjcmVlbik7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiTE9BRElOR1wiKTtcblxuXHR0aGlzLnVybCA9IG51bGw7XG5cblx0dGhpcy50YWJsZUlkPW51bGw7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoTmV0UG9rZXJDbGllbnQsIFBpeGlBcHApO1xuXG4vKipcbiAqIFNldCB1cmwuXG4gKiBAbWV0aG9kIHNldFVybFxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0VXJsID0gZnVuY3Rpb24odXJsKSB7XG5cdHRoaXMudXJsID0gdXJsO1xufVxuXG4vKipcbiAqIFNldCB0YWJsZSBpZC5cbiAqIEBtZXRob2Qgc2V0VGFibGVJZFxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0VGFibGVJZCA9IGZ1bmN0aW9uKHRhYmxlSWQpIHtcblx0dGhpcy50YWJsZUlkID0gdGFibGVJZDtcbn1cblxuLyoqXG4gKiBTZXQgdmlldyBjYXNlLlxuICogQG1ldGhvZCBzZXRWaWV3Q2FzZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0Vmlld0Nhc2UgPSBmdW5jdGlvbih2aWV3Q2FzZSkge1xuXHRjb25zb2xlLmxvZyhcIioqKioqKiBydW5uaW5nIHZpZXcgY2FzZTogXCIrdmlld0Nhc2UpO1xuXHR0aGlzLnZpZXdDYXNlPXZpZXdDYXNlO1xufVxuXG4vKipcbiAqIFNldCB0b2tlbi5cbiAqIEBtZXRob2Qgc2V0VG9rZW5cbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFRva2VuID0gZnVuY3Rpb24odG9rZW4pIHtcblx0dGhpcy50b2tlbiA9IHRva2VuO1xufVxuXG4vKipcbiAqIFNldCB0b2tlbi5cbiAqIEBtZXRob2Qgc2V0U2tpblxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0U2tpbiA9IGZ1bmN0aW9uKHNraW4pIHtcblx0UmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbiA9IHNraW47XG59XG5cbi8qKlxuICogUnVuLlxuICogQG1ldGhvZCBydW5cbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCkge1xuXG5cdHZhciBhc3NldHMgPSBbXG5cdFx0XCJ0YWJsZS5wbmdcIixcblx0XHRcImNvbXBvbmVudHMucG5nXCJcblx0XTtcblx0aWYoKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4gIT0gbnVsbCkgJiYgKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4udGV4dHVyZXMgIT0gbnVsbCkpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0YXNzZXRzLnB1c2goUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlc1tpXS5maWxlKTtcblx0XHRcdGNvbnNvbGUubG9nKFwiYWRkIHRvIGxvYWQgbGlzdDogXCIgKyBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luLnRleHR1cmVzW2ldLmZpbGUpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuYXNzZXRMb2FkZXIgPSBuZXcgUElYSS5Bc3NldExvYWRlcihhc3NldHMpO1xuXHR0aGlzLmFzc2V0TG9hZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJvbkNvbXBsZXRlXCIsIHRoaXMub25Bc3NldExvYWRlckNvbXBsZXRlLmJpbmQodGhpcykpO1xuXHR0aGlzLmFzc2V0TG9hZGVyLmxvYWQoKTtcbn1cblxuLyoqXG4gKiBBc3NldHMgbG9hZGVkLCBjb25uZWN0LlxuICogQG1ldGhvZCBvbkFzc2V0TG9hZGVyQ29tcGxldGVcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vbkFzc2V0TG9hZGVyQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJhc3NldCBsb2FkZXIgY29tcGxldGUuLi5cIik7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcgPSBuZXcgTmV0UG9rZXJDbGllbnRWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGRBdCh0aGlzLm5ldFBva2VyQ2xpZW50VmlldywgMCk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudENvbnRyb2xsZXIgPSBuZXcgTmV0UG9rZXJDbGllbnRDb250cm9sbGVyKHRoaXMubmV0UG9rZXJDbGllbnRWaWV3KTtcblx0dGhpcy5jb25uZWN0KCk7XG59XG5cbi8qKlxuICogQ29ubmVjdC5cbiAqIEBtZXRob2QgY29ubmVjdFxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVybCkge1xuXHRcdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiTkVFRCBVUkxcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5jb25uZWN0aW9uID0gbmV3IE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uKCk7XG5cdHRoaXMuY29ubmVjdGlvbi5vbihNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNULCB0aGlzLm9uQ29ubmVjdGlvbkNvbm5lY3QsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24ub24oTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24uY29ubmVjdCh0aGlzLnVybCk7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiQ09OTkVDVElOR1wiKTtcbn1cblxuLyoqXG4gKiBDb25uZWN0aW9uIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25Db25uZWN0XG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUub25Db25uZWN0aW9uQ29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcIioqKiogY29ubmVjdGVkXCIpO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbiA9IG5ldyBQcm90b0Nvbm5lY3Rpb24odGhpcy5jb25uZWN0aW9uKTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uYWRkTWVzc2FnZUhhbmRsZXIoU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMub25TdGF0ZUNvbXBsZXRlTWVzc2FnZSwgdGhpcyk7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnNldFByb3RvQ29ubmVjdGlvbih0aGlzLnByb3RvQ29ubmVjdGlvbik7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiSU5JVElBTElaSU5HXCIpO1xuXG5cdHZhciBpbml0TWVzc2FnZT1uZXcgSW5pdE1lc3NhZ2UodGhpcy50b2tlbik7XG5cblx0aWYgKHRoaXMudGFibGVJZClcblx0XHRpbml0TWVzc2FnZS5zZXRUYWJsZUlkKHRoaXMudGFibGVJZCk7XG5cblx0aWYgKHRoaXMudmlld0Nhc2UpXG5cdFx0aW5pdE1lc3NhZ2Uuc2V0Vmlld0Nhc2UodGhpcy52aWV3Q2FzZSk7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChpbml0TWVzc2FnZSk7XG59XG5cbi8qKlxuICogU3RhdGUgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uU3RhdGVDb21wbGV0ZU1lc3NhZ2VcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vblN0YXRlQ29tcGxldGVNZXNzYWdlPWZ1bmN0aW9uKCkge1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uaGlkZSgpO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gY2xvc2VkLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25DbG9zZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNsb3NlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwiKioqKiBjb25uZWN0aW9uIGNsb3NlZFwiKTtcblx0aWYgKHRoaXMucHJvdG9Db25uZWN0aW9uKVxuXHRcdHRoaXMucHJvdG9Db25uZWN0aW9uLnJlbW92ZU1lc3NhZ2VIYW5kbGVyKFN0YXRlQ29tcGxldGVNZXNzYWdlLCB0aGlzLm9uU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMpO1xuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gbnVsbDtcblx0dGhpcy5uZXRQb2tlckNsaWVudENvbnRyb2xsZXIuc2V0UHJvdG9Db25uZWN0aW9uKG51bGwpO1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIkNPTk5FQ1RJT04gRVJST1JcIik7XG5cdHNldFRpbWVvdXQodGhpcy5jb25uZWN0LmJpbmQodGhpcyksIDMwMDApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5ldFBva2VyQ2xpZW50OyIsIlxuXG4vKipcbiAqIENsaWVudCByZXNvdXJjZXNcbiAqIEBjbGFzcyBTZXR0aW5ncy5cbiAqL1xuIGZ1bmN0aW9uIFNldHRpbmdzKCkge1xuIFx0dGhpcy5wbGF5QW5pbWF0aW9ucyA9IHRydWU7XG4gfVxuXG5cbi8qKlxuICogR2V0IHNpbmdsZXRvbiBpbnN0YW5jZS5cbiAqIEBtZXRob2QgZ2V0SW5zdGFuY2VcbiAqL1xuU2V0dGluZ3MuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbigpIHtcblx0aWYgKCFTZXR0aW5ncy5pbnN0YW5jZSlcblx0XHRTZXR0aW5ncy5pbnN0YW5jZSA9IG5ldyBTZXR0aW5ncygpO1xuXG5cdHJldHVybiBTZXR0aW5ncy5pbnN0YW5jZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nczsiLCJ2YXIgU2hvd0RpYWxvZ01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU2hvd0RpYWxvZ01lc3NhZ2VcIik7XHJcbnZhciBCdXR0b25zTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CdXR0b25zTWVzc2FnZVwiKTtcclxudmFyIENoYXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NoYXRNZXNzYWdlXCIpO1xyXG52YXIgVGFibGVJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9UYWJsZUluZm9NZXNzYWdlXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnRyb2wgdXNlciBpbnRlcmZhY2UuXHJcbiAqIEBjbGFzcyBJbnRlcmZhY2VDb250cm9sbGVyXHJcbiAqL1xyXG5mdW5jdGlvbiBJbnRlcmZhY2VDb250cm9sbGVyKG1lc3NhZ2VTZXF1ZW5jZXIsIHZpZXcpIHtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIgPSBtZXNzYWdlU2VxdWVuY2VyO1xyXG5cdHRoaXMudmlldyA9IHZpZXc7XHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihCdXR0b25zTWVzc2FnZS5UWVBFLCB0aGlzLm9uQnV0dG9uc01lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihTaG93RGlhbG9nTWVzc2FnZS5UWVBFLCB0aGlzLm9uU2hvd0RpYWxvZ01lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihDaGF0TWVzc2FnZS5UWVBFLCB0aGlzLm9uQ2hhdCwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFRhYmxlSW5mb01lc3NhZ2UuVFlQRSwgdGhpcy5vblRhYmxlSW5mb01lc3NhZ2UsIHRoaXMpO1xyXG59XHJcblxyXG4vKipcclxuICogQnV0dG9ucyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQnV0dG9uc01lc3NhZ2VcclxuICovXHJcbkludGVyZmFjZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQnV0dG9uc01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIGJ1dHRvbnNWaWV3ID0gdGhpcy52aWV3LmdldEJ1dHRvbnNWaWV3KCk7XHJcblxyXG5cdGJ1dHRvbnNWaWV3LnNldEJ1dHRvbnMobS5nZXRCdXR0b25zKCksIG0uc2xpZGVyQnV0dG9uSW5kZXgsIHBhcnNlSW50KG0ubWluLCAxMCksIHBhcnNlSW50KG0ubWF4LCAxMCkpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBkaWFsb2cuXHJcbiAqIEBtZXRob2Qgb25TaG93RGlhbG9nTWVzc2FnZVxyXG4gKi9cclxuSW50ZXJmYWNlQ29udHJvbGxlci5wcm90b3R5cGUub25TaG93RGlhbG9nTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgZGlhbG9nVmlldyA9IHRoaXMudmlldy5nZXREaWFsb2dWaWV3KCk7XHJcblxyXG5cdGRpYWxvZ1ZpZXcuc2hvdyhtLmdldFRleHQoKSwgbS5nZXRCdXR0b25zKCksIG0uZ2V0RGVmYXVsdFZhbHVlKCkpO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIE9uIGNoYXQgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkNoYXRcclxuICovXHJcbkludGVyZmFjZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uQ2hhdCA9IGZ1bmN0aW9uKG0pIHtcclxuXHR0aGlzLnZpZXcuY2hhdFZpZXcuYWRkVGV4dChtLnVzZXIsIG0udGV4dCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgdGFibGUgaW5mbyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uVGFibGVJbmZvTWVzc2FnZVxyXG4gKi9cclxuSW50ZXJmYWNlQ29udHJvbGxlci5wcm90b3R5cGUub25UYWJsZUluZm9NZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciB0YWJsZUluZm9WaWV3PXRoaXMudmlldy5nZXRUYWJsZUluZm9WaWV3KCk7XHJcblxyXG5cdHRhYmxlSW5mb1ZpZXcuc2V0VGFibGVJbmZvVGV4dChtLmdldFRleHQoKSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW50ZXJmYWNlQ29udHJvbGxlcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFNlcXVlbmNlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9TZXF1ZW5jZXJcIik7XG5cbi8qKlxuICogQW4gaXRlbSBpbiBhIG1lc3NhZ2Ugc2VxdWVuY2UuXG4gKiBAY2xhc3MgTWVzc2FnZVNlcXVlbmNlSXRlbVxuICovXG5mdW5jdGlvbiBNZXNzYWdlU2VxdWVuY2VJdGVtKG1lc3NhZ2UpIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdHRoaXMud2FpdFRhcmdldCA9IG51bGw7XG5cdHRoaXMud2FpdEV2ZW50ID0gbnVsbDtcblx0dGhpcy53YWl0Q2xvc3VyZSA9IG51bGw7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoTWVzc2FnZVNlcXVlbmNlSXRlbSwgRXZlbnREaXNwYXRjaGVyKTtcblxuLyoqXG4gKiBHZXQgbWVzc2FnZS5cbiAqIEBtZXRob2QgZ2V0TWVzc2FnZVxuICovXG5NZXNzYWdlU2VxdWVuY2VJdGVtLnByb3RvdHlwZS5nZXRNZXNzYWdlID0gZnVuY3Rpb24oKSB7XG5cdC8vY29uc29sZS5sb2coXCJnZXR0aW5nOiBcIiArIHRoaXMubWVzc2FnZS50eXBlKTtcblxuXHRyZXR1cm4gdGhpcy5tZXNzYWdlO1xufVxuXG4vKipcbiAqIEFyZSB3ZSB3YWl0aW5nIGZvciBhbiBldmVudD9cbiAqIEBtZXRob2QgaXNXYWl0aW5nXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLmlzV2FpdGluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy53YWl0RXZlbnQgIT0gbnVsbDtcbn1cblxuLyoqXG4gKiBOb3RpZnkgY29tcGxldGUuXG4gKiBAbWV0aG9kIG5vdGlmeUNvbXBsZXRlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLm5vdGlmeUNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHJpZ2dlcihTZXF1ZW5jZXIuQ09NUExFVEUpO1xufVxuXG4vKipcbiAqIFdhaXQgZm9yIGV2ZW50IGJlZm9yZSBwcm9jZXNzaW5nIG5leHQgbWVzc2FnZS5cbiAqIEBtZXRob2Qgd2FpdEZvclxuICovXG5NZXNzYWdlU2VxdWVuY2VJdGVtLnByb3RvdHlwZS53YWl0Rm9yID0gZnVuY3Rpb24odGFyZ2V0LCBldmVudCkge1xuXHR0aGlzLndhaXRUYXJnZXQgPSB0YXJnZXQ7XG5cdHRoaXMud2FpdEV2ZW50ID0gZXZlbnQ7XG5cdHRoaXMud2FpdENsb3N1cmUgPSB0aGlzLm9uVGFyZ2V0Q29tcGxldGUuYmluZCh0aGlzKTtcblxuXHR0aGlzLndhaXRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLndhaXRFdmVudCwgdGhpcy53YWl0Q2xvc3VyZSk7XG59XG5cbi8qKlxuICogV2FpdCB0YXJnZXQgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uVGFyZ2V0Q29tcGxldGVcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLm9uVGFyZ2V0Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0Ly9jb25zb2xlLmxvZyhcInRhcmdldCBpcyBjb21wbGV0ZVwiKTtcblx0dGhpcy53YWl0VGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy53YWl0RXZlbnQsIHRoaXMud2FpdENsb3N1cmUpO1xuXHR0aGlzLm5vdGlmeUNvbXBsZXRlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVNlcXVlbmNlSXRlbTsiLCJ2YXIgU2VxdWVuY2VyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1NlcXVlbmNlclwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIE1lc3NhZ2VTZXF1ZW5jZUl0ZW0gPSByZXF1aXJlKFwiLi9NZXNzYWdlU2VxdWVuY2VJdGVtXCIpO1xuXG4vKipcbiAqIFNlcXVlbmNlcyBtZXNzYWdlcy5cbiAqIEBjbGFzcyBNZXNzYWdlU2VxdWVuY2VyXG4gKi9cbmZ1bmN0aW9uIE1lc3NhZ2VTZXF1ZW5jZXIoKSB7XG5cdHRoaXMuc2VxdWVuY2VyID0gbmV3IFNlcXVlbmNlcigpO1xuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyID0gbmV3IEV2ZW50RGlzcGF0Y2hlcigpO1xuXHR0aGlzLmN1cnJlbnRJdGVtID0gbnVsbDtcbn1cblxuLyoqXG4gKiBBZGQgYSBtZXNzYWdlIGZvciBwcm9jZXNpbmcuXG4gKiBAbWV0aG9kIGVucXVldWVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUuZW5xdWV1ZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0aWYgKCFtZXNzYWdlLnR5cGUpXG5cdFx0dGhyb3cgXCJNZXNzYWdlIGRvZXNuJ3QgaGF2ZSBhIHR5cGVcIjtcblxuXHR2YXIgc2VxdWVuY2VJdGVtID0gbmV3IE1lc3NhZ2VTZXF1ZW5jZUl0ZW0obWVzc2FnZSk7XG5cblx0c2VxdWVuY2VJdGVtLm9uKFNlcXVlbmNlci5TVEFSVCwgdGhpcy5vblNlcXVlbmNlSXRlbVN0YXJ0LCB0aGlzKTtcblxuXHR0aGlzLnNlcXVlbmNlci5lbnF1ZXVlKHNlcXVlbmNlSXRlbSk7XG59XG5cbi8qKlxuICogU2VxdWVuY2UgaXRlbSBzdGFydC5cbiAqIEBtZXRob2Qgb25TZXF1ZW5jZUl0ZW1TdGFydFxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUub25TZXF1ZW5jZUl0ZW1TdGFydCA9IGZ1bmN0aW9uKGUpIHtcblx0Ly9jb25zb2xlLmxvZyhcInN0YXJ0aW5nIGl0ZW0uLi5cIik7XG5cdHZhciBpdGVtID0gZS50YXJnZXQ7XG5cblx0aXRlbS5vZmYoU2VxdWVuY2VyLlNUQVJULCB0aGlzLm9uU2VxdWVuY2VJdGVtU3RhcnQsIHRoaXMpO1xuXG5cdHRoaXMuY3VycmVudEl0ZW0gPSBpdGVtO1xuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLnRyaWdnZXIoaXRlbS5nZXRNZXNzYWdlKCkpO1xuXHR0aGlzLmN1cnJlbnRJdGVtID0gbnVsbDtcblxuXHRpZiAoIWl0ZW0uaXNXYWl0aW5nKCkpXG5cdFx0aXRlbS5ub3RpZnlDb21wbGV0ZSgpO1xufVxuXG4vKipcbiAqIEFkZCBtZXNzYWdlIGhhbmRsZXIuXG4gKiBAbWV0aG9kIGFkZE1lc3NhZ2VIYW5kbGVyXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZXIucHJvdG90eXBlLmFkZE1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKSB7XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIub24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKTtcbn1cblxuLyoqXG4gKiBXYWl0IGZvciB0aGUgdGFyZ2V0IHRvIGRpc3BhdGNoIGFuIGV2ZW50IGJlZm9yZSBjb250aW51aW5nIHRvXG4gKiBwcm9jZXNzIHRoZSBtZXNzYWdlcyBpbiB0aGUgcXVlLlxuICogQG1ldGhvZCB3YWl0Rm9yXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZXIucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbih0YXJnZXQsIGV2ZW50KSB7XG5cdGlmICghdGhpcy5jdXJyZW50SXRlbSlcblx0XHR0aHJvdyBcIk5vdCB3YWl0aW5nIGZvciBldmVudFwiO1xuXG5cdHRoaXMuY3VycmVudEl0ZW0ud2FpdEZvcih0YXJnZXQsIGV2ZW50KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU2VxdWVuY2VyOyIsInZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIE1lc3NhZ2VTZXF1ZW5jZXIgPSByZXF1aXJlKFwiLi9NZXNzYWdlU2VxdWVuY2VyXCIpO1xudmFyIFByb3RvQ29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9Qcm90b0Nvbm5lY3Rpb25cIik7XG52YXIgQnV0dG9uc1ZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9CdXR0b25zVmlld1wiKTtcbnZhciBCdXR0b25DbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIFNlYXRDbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU2VhdENsaWNrTWVzc2FnZVwiKTtcbnZhciBOZXRQb2tlckNsaWVudFZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9OZXRQb2tlckNsaWVudFZpZXdcIik7XG52YXIgRGlhbG9nVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L0RpYWxvZ1ZpZXdcIik7XG52YXIgU2V0dGluZ3NWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvU2V0dGluZ3NWaWV3XCIpO1xudmFyIFRhYmxlQ29udHJvbGxlciA9IHJlcXVpcmUoXCIuL1RhYmxlQ29udHJvbGxlclwiKTtcbnZhciBJbnRlcmZhY2VDb250cm9sbGVyID0gcmVxdWlyZShcIi4vSW50ZXJmYWNlQ29udHJvbGxlclwiKTtcbnZhciBDaGF0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9DaGF0TWVzc2FnZVwiKTtcbnZhciBCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL2RhdGEvQnV0dG9uRGF0YVwiKTtcblxuLyoqXG4gKiBNYWluIGNvbnRyb2xsZXJcbiAqIEBjbGFzcyBOZXRQb2tlckNsaWVudENvbnRyb2xsZXJcbiAqL1xuZnVuY3Rpb24gTmV0UG9rZXJDbGllbnRDb250cm9sbGVyKHZpZXcpIHtcblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcgPSB2aWV3O1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbiA9IG51bGw7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlciA9IG5ldyBNZXNzYWdlU2VxdWVuY2VyKCk7XG5cblx0dGhpcy50YWJsZUNvbnRyb2xsZXIgPSBuZXcgVGFibGVDb250cm9sbGVyKHRoaXMubWVzc2FnZVNlcXVlbmNlciwgdGhpcy5uZXRQb2tlckNsaWVudFZpZXcpO1xuXHR0aGlzLmludGVyZmFjZUNvbnRyb2xsZXIgPSBuZXcgSW50ZXJmYWNlQ29udHJvbGxlcih0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIsIHRoaXMubmV0UG9rZXJDbGllbnRWaWV3KTtcblxuXHRjb25zb2xlLmxvZyh0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5nZXREaWFsb2dWaWV3KCkpO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmdldEJ1dHRvbnNWaWV3KCkub24oQnV0dG9uc1ZpZXcuQlVUVE9OX0NMSUNLLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5nZXREaWFsb2dWaWV3KCkub24oRGlhbG9nVmlldy5CVVRUT05fQ0xJQ0ssIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3Lm9uKE5ldFBva2VyQ2xpZW50Vmlldy5TRUFUX0NMSUNLLCB0aGlzLm9uU2VhdENsaWNrLCB0aGlzKTtcblxuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5jaGF0Vmlldy5hZGRFdmVudExpc3RlbmVyKFwiY2hhdFwiLCB0aGlzLm9uVmlld0NoYXQsIHRoaXMpO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LnNldHRpbmdzVmlldy5hZGRFdmVudExpc3RlbmVyKFNldHRpbmdzVmlldy5CVVlfQ0hJUFNfQ0xJQ0ssIHRoaXMub25CdXlDaGlwc0J1dHRvbkNsaWNrLCB0aGlzKTtcbn1cblxuXG4vKipcbiAqIFNldCBjb25uZWN0aW9uLlxuICogQG1ldGhvZCBzZXRQcm90b0Nvbm5lY3Rpb25cbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5zZXRQcm90b0Nvbm5lY3Rpb24gPSBmdW5jdGlvbihwcm90b0Nvbm5lY3Rpb24pIHtcblx0aWYgKHRoaXMucHJvdG9Db25uZWN0aW9uKSB7XG5cdFx0dGhpcy5wcm90b0Nvbm5lY3Rpb24ub2ZmKFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFLCB0aGlzLm9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZSwgdGhpcyk7XG5cdH1cblxuXHR0aGlzLnByb3RvQ29ubmVjdGlvbiA9IHByb3RvQ29ubmVjdGlvbjtcblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuY2xlYXIoKTtcblxuXHRpZiAodGhpcy5wcm90b0Nvbm5lY3Rpb24pIHtcblx0XHR0aGlzLnByb3RvQ29ubmVjdGlvbi5vbihQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSwgdGhpcy5vblByb3RvQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR9XG59XG5cbi8qKlxuICogSW5jb21pbmcgbWVzc2FnZS5cbiAqIEVucXVldWUgZm9yIHByb2Nlc3NpbmcuXG4gKsKgQG1ldGhvZCBvblByb3RvQ29ubmVjdGlvbk1lc3NhZ2VcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25Qcm90b0Nvbm5lY3Rpb25NZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuZW5xdWV1ZShlLm1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIEJ1dHRvbiBjbGljay5cbiAqIFRoaXMgZnVuY3Rpb24gaGFuZGxlcyBjbGlja3MgZnJvbSBib3RoIHRoZSBkaWFsb2cgYW5kIGdhbWUgcGxheSBidXR0b25zLlxuICogQG1ldGhvZCBvbkJ1dHRvbkNsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG5cdGlmICghdGhpcy5wcm90b0Nvbm5lY3Rpb24pXG5cdFx0cmV0dXJuO1xuXG5cdGNvbnNvbGUubG9nKFwiYnV0dG9uIGNsaWNrLCB2PVwiICsgZS52YWx1ZSk7XG5cblx0dmFyIG0gPSBuZXcgQnV0dG9uQ2xpY2tNZXNzYWdlKGUuYnV0dG9uLCBlLnZhbHVlKTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChtKTtcbn1cblxuLyoqXG4gKiBTZWF0IGNsaWNrLlxuICogQG1ldGhvZCBvblNlYXRDbGlja1xuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vblNlYXRDbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0dmFyIG0gPSBuZXcgU2VhdENsaWNrTWVzc2FnZShlLnNlYXRJbmRleCk7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLnNlbmQobSk7XG59XG5cbi8qKlxuICogT24gc2VuZCBjaGF0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uVmlld0NoYXRcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vblZpZXdDaGF0ID0gZnVuY3Rpb24odGV4dCkge1xuXHR2YXIgbWVzc2FnZSA9IG5ldyBDaGF0TWVzc2FnZSgpO1xuXHRtZXNzYWdlLnVzZXIgPSBcIlwiO1xuXHRtZXNzYWdlLnRleHQgPSB0ZXh0O1xuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLnNlbmQobWVzc2FnZSk7XG59XG5cbi8qKlxuICogT24gYnV5IGNoaXBzIGJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXlDaGlwc0J1dHRvbkNsaWNrXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25CdXlDaGlwc0J1dHRvbkNsaWNrID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwiYnV5IGNoaXBzIGNsaWNrXCIpO1xuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uLnNlbmQobmV3IEJ1dHRvbkNsaWNrTWVzc2FnZShCdXR0b25EYXRhLkJVWV9DSElQUykpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5ldFBva2VyQ2xpZW50Q29udHJvbGxlcjsiLCJ2YXIgU2VhdEluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1NlYXRJbmZvTWVzc2FnZVwiKTtcclxudmFyIENvbW11bml0eUNhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Db21tdW5pdHlDYXJkc01lc3NhZ2VcIik7XHJcbnZhciBQb2NrZXRDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvUG9ja2V0Q2FyZHNNZXNzYWdlXCIpO1xyXG52YXIgRGVhbGVyQnV0dG9uTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9EZWFsZXJCdXR0b25NZXNzYWdlXCIpO1xyXG52YXIgQmV0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CZXRNZXNzYWdlXCIpO1xyXG52YXIgQmV0c1RvUG90TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CZXRzVG9Qb3RNZXNzYWdlXCIpO1xyXG52YXIgUG90TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Qb3RNZXNzYWdlXCIpO1xyXG52YXIgVGltZXJNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZVwiKTtcclxudmFyIEFjdGlvbk1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQWN0aW9uTWVzc2FnZVwiKTtcclxudmFyIEZvbGRDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvRm9sZENhcmRzTWVzc2FnZVwiKTtcclxudmFyIERlbGF5TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9EZWxheU1lc3NhZ2VcIik7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xyXG52YXIgQ2xlYXJNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NsZWFyTWVzc2FnZVwiKTtcclxudmFyIFBheU91dE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvUGF5T3V0TWVzc2FnZVwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb250cm9sIHRoZSB0YWJsZVxyXG4gKiBAY2xhc3MgVGFibGVDb250cm9sbGVyXHJcbiAqL1xyXG5mdW5jdGlvbiBUYWJsZUNvbnRyb2xsZXIobWVzc2FnZVNlcXVlbmNlciwgdmlldykge1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlciA9IG1lc3NhZ2VTZXF1ZW5jZXI7XHJcblx0dGhpcy52aWV3ID0gdmlldztcclxuXHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFNlYXRJbmZvTWVzc2FnZS5UWVBFLCB0aGlzLm9uU2VhdEluZm9NZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLlRZUEUsIHRoaXMub25Db21tdW5pdHlDYXJkc01lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihQb2NrZXRDYXJkc01lc3NhZ2UuVFlQRSwgdGhpcy5vblBvY2tldENhcmRzTWVzc2FnZSwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKERlYWxlckJ1dHRvbk1lc3NhZ2UuVFlQRSwgdGhpcy5vbkRlYWxlckJ1dHRvbk1lc3NhZ2UsIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihCZXRNZXNzYWdlLlRZUEUsIHRoaXMub25CZXRNZXNzYWdlLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQmV0c1RvUG90TWVzc2FnZS5UWVBFLCB0aGlzLm9uQmV0c1RvUG90LCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoUG90TWVzc2FnZS5UWVBFLCB0aGlzLm9uUG90LCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoVGltZXJNZXNzYWdlLlRZUEUsIHRoaXMub25UaW1lciwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEFjdGlvbk1lc3NhZ2UuVFlQRSwgdGhpcy5vbkFjdGlvbiwgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEZvbGRDYXJkc01lc3NhZ2UuVFlQRSwgdGhpcy5vbkZvbGRDYXJkcywgdGhpcyk7XHJcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKERlbGF5TWVzc2FnZS5UWVBFLCB0aGlzLm9uRGVsYXksIHRoaXMpO1xyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihDbGVhck1lc3NhZ2UuVFlQRSwgdGhpcy5vbkNsZWFyLCB0aGlzKTtcclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoUGF5T3V0TWVzc2FnZS5UWVBFLCB0aGlzLm9uUGF5T3V0LCB0aGlzKTtcclxufVxyXG5FdmVudERpc3BhdGNoZXIuaW5pdChUYWJsZUNvbnRyb2xsZXIpO1xyXG5cclxuLyoqXHJcbiAqIFNlYXQgaW5mbyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uU2VhdEluZm9NZXNzYWdlXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uU2VhdEluZm9NZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBzZWF0VmlldyA9IHRoaXMudmlldy5nZXRTZWF0Vmlld0J5SW5kZXgobS5nZXRTZWF0SW5kZXgoKSk7XHJcblxyXG5cdHNlYXRWaWV3LnNldE5hbWUobS5nZXROYW1lKCkpO1xyXG5cdHNlYXRWaWV3LnNldENoaXBzKG0uZ2V0Q2hpcHMoKSk7XHJcblx0c2VhdFZpZXcuc2V0QWN0aXZlKG0uaXNBY3RpdmUoKSk7XHJcblx0c2VhdFZpZXcuc2V0U2l0b3V0KG0uaXNTaXRvdXQoKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZWF0IGluZm8gbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkNvbW11bml0eUNhcmRzTWVzc2FnZVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkNvbW11bml0eUNhcmRzTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcclxuXHR2YXIgaTtcclxuXHJcblx0Y29uc29sZS5sb2coXCJnb3QgY29tbXVuaXR5IGNhcmRzIVwiKTtcclxuXHRjb25zb2xlLmxvZyhtKTtcclxuXHJcblx0Zm9yIChpID0gMDsgaSA8IG0uZ2V0Q2FyZHMoKS5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGNhcmREYXRhID0gbS5nZXRDYXJkcygpW2ldO1xyXG5cdFx0dmFyIGNhcmRWaWV3ID0gdGhpcy52aWV3LmdldENvbW11bml0eUNhcmRzKClbbS5nZXRGaXJzdEluZGV4KCkgKyBpXTtcclxuXHJcblx0XHRjYXJkVmlldy5zZXRDYXJkRGF0YShjYXJkRGF0YSk7XHJcblx0XHRjYXJkVmlldy5zaG93KG0uYW5pbWF0ZSwgaSAqIDUwMCk7XHJcblx0fVxyXG5cdGlmIChtLmdldENhcmRzKCkubGVuZ3RoID4gMCkge1xyXG5cdFx0dmFyIGNhcmREYXRhID0gbS5nZXRDYXJkcygpW20uZ2V0Q2FyZHMoKS5sZW5ndGggLSAxXTtcclxuXHRcdHZhciBjYXJkVmlldyA9IHRoaXMudmlldy5nZXRDb21tdW5pdHlDYXJkcygpW20uZ2V0Rmlyc3RJbmRleCgpICsgbS5nZXRDYXJkcygpLmxlbmd0aCAtIDFdO1xyXG5cdFx0aWYobS5hbmltYXRlKVxyXG5cdFx0XHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcihjYXJkVmlldywgXCJhbmltYXRpb25Eb25lXCIpO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFBvY2tldCBjYXJkcyBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uUG9ja2V0Q2FyZHNNZXNzYWdlXHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uUG9ja2V0Q2FyZHNNZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBzZWF0VmlldyA9IHRoaXMudmlldy5nZXRTZWF0Vmlld0J5SW5kZXgobS5nZXRTZWF0SW5kZXgoKSk7XHJcblx0dmFyIGk7XHJcblxyXG5cdGZvciAoaSA9IDA7IGkgPCBtLmdldENhcmRzKCkubGVuZ3RoOyBpKyspIHtcclxuXHRcdHZhciBjYXJkRGF0YSA9IG0uZ2V0Q2FyZHMoKVtpXTtcclxuXHRcdHZhciBjYXJkVmlldyA9IHNlYXRWaWV3LmdldFBvY2tldENhcmRzKClbbS5nZXRGaXJzdEluZGV4KCkgKyBpXTtcclxuXHJcblx0XHRpZihtLmFuaW1hdGUpXHJcblx0XHRcdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKGNhcmRWaWV3LCBcImFuaW1hdGlvbkRvbmVcIik7XHJcblx0XHRjYXJkVmlldy5zZXRDYXJkRGF0YShjYXJkRGF0YSk7XHJcblx0XHRjYXJkVmlldy5zaG93KG0uYW5pbWF0ZSwgMTApO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIERlYWxlciBidXR0b24gbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkRlYWxlckJ1dHRvbk1lc3NhZ2VcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25EZWFsZXJCdXR0b25NZXNzYWdlID0gZnVuY3Rpb24obSkge1xyXG5cdHZhciBkZWFsZXJCdXR0b25WaWV3ID0gdGhpcy52aWV3LmdldERlYWxlckJ1dHRvblZpZXcoKTtcclxuXHJcblx0aWYgKG0uc2VhdEluZGV4IDwgMCkge1xyXG5cdFx0ZGVhbGVyQnV0dG9uVmlldy5oaWRlKCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKGRlYWxlckJ1dHRvblZpZXcsIFwiYW5pbWF0aW9uRG9uZVwiKTtcclxuXHRcdGRlYWxlckJ1dHRvblZpZXcuc2hvdyhtLmdldFNlYXRJbmRleCgpLCBtLmdldEFuaW1hdGUoKSk7XHJcblx0fVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJldCBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQmV0TWVzc2FnZVxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkJldE1lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XHJcblx0dGhpcy52aWV3LnNlYXRWaWV3c1ttLnNlYXRJbmRleF0uYmV0Q2hpcHMuc2V0VmFsdWUobS52YWx1ZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQmV0cyB0byBwb3QuXHJcbiAqIEBtZXRob2Qgb25CZXRzVG9Qb3RcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25CZXRzVG9Qb3QgPSBmdW5jdGlvbihtKSB7XHJcblx0dmFyIGhhdmVDaGlwcyA9IGZhbHNlO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXHJcblx0XHRpZiAodGhpcy52aWV3LnNlYXRWaWV3c1tpXS5iZXRDaGlwcy52YWx1ZSA+IDApXHJcblx0XHRcdGhhdmVDaGlwcyA9IHRydWU7XHJcblxyXG5cdGlmICghaGF2ZUNoaXBzKVxyXG5cdFx0cmV0dXJuO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXHJcblx0XHR0aGlzLnZpZXcuc2VhdFZpZXdzW2ldLmJldENoaXBzLmFuaW1hdGVJbigpO1xyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLnZpZXcuc2VhdFZpZXdzWzBdLmJldENoaXBzLCBcImFuaW1hdGlvbkRvbmVcIik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQb3QgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvblBvdFxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblBvdCA9IGZ1bmN0aW9uKG0pIHtcclxuXHR0aGlzLnZpZXcucG90Vmlldy5zZXRWYWx1ZXMobS52YWx1ZXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRpbWVyIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25UaW1lclxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblRpbWVyID0gZnVuY3Rpb24obSkge1xyXG5cdGlmIChtLnNlYXRJbmRleCA8IDApXHJcblx0XHR0aGlzLnZpZXcudGltZXJWaWV3LmhpZGUoKTtcclxuXHJcblx0ZWxzZSB7XHJcblx0XHR0aGlzLnZpZXcudGltZXJWaWV3LnNob3cobS5zZWF0SW5kZXgpO1xyXG5cdFx0dGhpcy52aWV3LnRpbWVyVmlldy5jb3VudGRvd24obS50b3RhbFRpbWUsIG0udGltZUxlZnQpO1xyXG5cdH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBBY3Rpb24gbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkFjdGlvblxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkFjdGlvbiA9IGZ1bmN0aW9uKG0pIHtcclxuXHRpZiAobS5zZWF0SW5kZXggPT0gbnVsbClcclxuXHRcdG0uc2VhdEluZGV4ID0gMDtcclxuXHJcblx0dGhpcy52aWV3LnNlYXRWaWV3c1ttLnNlYXRJbmRleF0uYWN0aW9uKG0uYWN0aW9uKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGb2xkIGNhcmRzIG1lc3NhZ2UuXHJcbiAqIEBtZXRob2Qgb25Gb2xkQ2FyZHNcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Gb2xkQ2FyZHMgPSBmdW5jdGlvbihtKSB7XHJcblx0dGhpcy52aWV3LnNlYXRWaWV3c1ttLnNlYXRJbmRleF0uZm9sZENhcmRzKCk7XHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLCBcImFuaW1hdGlvbkRvbmVcIik7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVsYXkgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvbkRlbGF5XHJcbiAqL1xyXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uRGVsYXkgPSBmdW5jdGlvbihtKSB7XHJcblx0Y29uc29sZS5sb2coXCJkZWxheSBmb3IgID0gXCIgKyBtLmRlbGF5KTtcclxuXHJcblxyXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci53YWl0Rm9yKHRoaXMsIFwidGltZXJEb25lXCIpO1xyXG5cdHNldFRpbWVvdXQodGhpcy5kaXNwYXRjaEV2ZW50LmJpbmQodGhpcywgXCJ0aW1lckRvbmVcIiksIG0uZGVsYXkpO1xyXG5cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDbGVhciBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIG9uQ2xlYXJcclxuICovXHJcblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25DbGVhciA9IGZ1bmN0aW9uKG0pIHtcclxuXHJcblx0dmFyIGNvbXBvbmVudHMgPSBtLmdldENvbXBvbmVudHMoKTtcclxuXHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IGNvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdHN3aXRjaChjb21wb25lbnRzW2ldKSB7XHJcblx0XHRcdGNhc2UgQ2xlYXJNZXNzYWdlLlBPVDoge1xyXG5cdFx0XHRcdHRoaXMudmlldy5wb3RWaWV3LnNldFZhbHVlcyhbXSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSBDbGVhck1lc3NhZ2UuQkVUUzoge1xyXG5cdFx0XHRcdGZvcih2YXIgcyA9IDA7IHMgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgcysrKSB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXcuc2VhdFZpZXdzW3NdLmJldENoaXBzLnNldFZhbHVlKDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlIENsZWFyTWVzc2FnZS5DQVJEUzoge1xyXG5cdFx0XHRcdGZvcih2YXIgcyA9IDA7IHMgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgcysrKSB7XHJcblx0XHRcdFx0XHRmb3IodmFyIGMgPSAwOyBjIDwgdGhpcy52aWV3LnNlYXRWaWV3c1tzXS5wb2NrZXRDYXJkcy5sZW5ndGg7IGMrKykge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnZpZXcuc2VhdFZpZXdzW3NdLnBvY2tldENhcmRzW2NdLmhpZGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGZvcih2YXIgYyA9IDA7IGMgPCB0aGlzLnZpZXcuY29tbXVuaXR5Q2FyZHMubGVuZ3RoOyBjKyspIHtcclxuXHRcdFx0XHRcdHRoaXMudmlldy5jb21tdW5pdHlDYXJkc1tjXS5oaWRlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgQ2xlYXJNZXNzYWdlLkNIQVQ6IHtcclxuXHRcdFx0XHR0aGlzLnZpZXcuY2hhdFZpZXcuY2xlYXIoKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFBheSBvdXQgbWVzc2FnZS5cclxuICogQG1ldGhvZCBvblBheU91dFxyXG4gKi9cclxuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblBheU91dCA9IGZ1bmN0aW9uKG0pIHtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG0udmFsdWVzLmxlbmd0aDsgaSsrKVxyXG5cdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tpXS5iZXRDaGlwcy5zZXRWYWx1ZShtLnZhbHVlc1tpXSk7XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy52aWV3LnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcclxuXHRcdHRoaXMudmlldy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMuYW5pbWF0ZU91dCgpO1xyXG5cclxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLnZpZXcuc2VhdFZpZXdzWzBdLmJldENoaXBzLCBcImFuaW1hdGlvbkRvbmVcIik7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUNvbnRyb2xsZXI7IiwiTmV0UG9rZXJDbGllbnQgPSByZXF1aXJlKFwiLi9hcHAvTmV0UG9rZXJDbGllbnRcIik7XG4vL3ZhciBuZXRQb2tlckNsaWVudCA9IG5ldyBOZXRQb2tlckNsaWVudCgpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHRleHR1cmVzOiBbXG5cdFx0e1xuXHRcdFx0aWQ6IFwiY29tcG9uZW50c1RleHR1cmVcIixcblx0XHRcdGZpbGU6IFwiY29tcG9uZW50cy5wbmdcIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aWQ6IFwidGFibGVCYWNrZ3JvdW5kXCIsXG5cdFx0XHRmaWxlOiBcInRhYmxlLnBuZ1wiXG5cdFx0fVxuXHRdLFxuXHR0YWJsZUJhY2tncm91bmQ6IFwidGFibGVCYWNrZ3JvdW5kXCIsXG5cdGRlZmF1bHRUZXh0dXJlOiBcImNvbXBvbmVudHNUZXh0dXJlXCIsXG5cblx0c2VhdFBvc2l0aW9uczogW1xuXHRcdFsyODcsIDExOF0sIFs0ODMsIDExMl0sIFs2NzYsIDExOF0sXG5cdFx0Wzg0NCwgMjQ3XSwgWzgxNywgNDEzXSwgWzY3NiwgNDkwXSxcblx0XHRbNDgzLCA0OTVdLCBbMjg3LCA0OTBdLCBbMTQwLCA0MTNdLFxuXHRcdFsxMjMsIDI0N11cblx0XSxcblxuXHR0aW1lckJhY2tncm91bmQ6IFsxMjEsMjAwLDMyLDMyXSxcblxuXHRzZWF0UGxhdGU6IFs0MCwgMTE2LCAxNjAsIDcwXSxcblxuXHRjb21tdW5pdHlDYXJkc1Bvc2l0aW9uOiBbMjU1LCAxOTBdLFxuXG5cdGNhcmRGcmFtZTogWzQ5OCwgMjU2LCA4NywgMTIyXSxcblx0Y2FyZEJhY2s6IFs0MDIsIDI1NiwgODcsIDEyMl0sXG5cblx0ZGl2aWRlckxpbmU6IFs1NjgsIDc3LCAyLCAxNzBdLFxuXG5cdHN1aXRTeW1ib2xzOiBbXG5cdFx0WzI0NiwgNjcsIDE4LCAxOV0sXG5cdFx0WzI2OSwgNjcsIDE4LCAxOV0sXG5cdFx0WzI5MiwgNjcsIDE4LCAxOV0sXG5cdFx0WzMxNSwgNjcsIDE4LCAxOV1cblx0XSxcblxuXHRmcmFtZVBsYXRlOiBbMzAxLCAyNjIsIDc0LCA3Nl0sXG5cdGJpZ0J1dHRvbjogWzMzLCAyOTgsIDk1LCA5NF0sXG5cdGRpYWxvZ0J1dHRvbjogWzM4MywgNDYxLCA4MiwgNDddLFxuXHRkZWFsZXJCdXR0b246IFsxOTcsIDIzNiwgNDEsIDM1XSxcblxuXHRkZWFsZXJCdXR0b25Qb3NpdGlvbnM6IFtcblx0XHRbMzQ3LCAxMzNdLCBbMzk1LCAxMzNdLCBbNTc0LCAxMzNdLFxuXHRcdFs3NjIsIDI2N10sIFs3MTUsIDM1OF0sIFs1NzQsIDQzNF0sXG5cdFx0WzUzNiwgNDMyXSwgWzM1MSwgNDMyXSwgWzE5MywgMzYyXSxcblx0XHRbMTY4LCAyNjZdXG5cdF0sXG5cblx0dGV4dFNjcm9sbGJhclRyYWNrOiBbMzcxLDUwLDYwLDEwXSxcblx0dGV4dFNjcm9sbGJhclRodW1iOiBbMzcxLDMyLDYwLDEwXSxcblxuXG5cdGJldEFsaWduOiBbXG5cdFx0XCJsZWZ0XCIsIFwiY2VudGVyXCIsIFwicmlnaHRcIixcblx0XHRcInJpZ2h0XCIsIFwicmlnaHRcIiwgXG5cdFx0XCJyaWdodFwiLCBcImNlbnRlclwiLCBcImxlZnRcIixcblx0XHRcImxlZnRcIiwgXCJsZWZ0XCJcblx0XSxcblxuXHRiZXRQb3NpdGlvbnM6IFtcblx0XHRbMjI1LDE1MF0sIFs0NzgsMTUwXSwgWzczMCwxNTBdLFxuXHRcdFs3NzgsMTk2XSwgWzc0OCwzMjJdLCBbNzE5LDM2MF0sXG5cdFx0WzQ4MSwzNjBdLCBbMjMyLDM2MF0sIFsxOTksMzIyXSxcblx0XHRbMTgxLDIwMF1cblx0XSxcblx0Y2hpcHM6IFtcblx0XHRbMzAsIDI1LCA0MCwgMzBdLFxuXHRcdFs3MCwgMjUsIDQwLCAzMF0sXG5cdFx0WzExMCwgMjUsIDQwLCAzMF0sXG5cdFx0WzE1MCwgMjUsIDQwLCAzMF0sXG5cdFx0WzE5MCwgMjUsIDQwLCAzMF1cblx0XSxcblx0Y2hpcHNDb2xvcnM6IFsweDQwNDA0MCwgMHgwMDgwMDAsIDB4ODA4MDAwLCAweDAwMDA4MCwgMHhmZjAwMDBdLFxuXHRwb3RQb3NpdGlvbjogWzQ4NSwzMTVdLFxuXHR3cmVuY2hJY29uOiBbNDYyLDM4OSwyMSwyMV0sXG5cdGNoYXRCYWNrZ3JvdW5kOiBbMzAxLDI2Miw3NCw3Nl0sXG5cdGNoZWNrYm94QmFja2dyb3VuZDogWzUwMSwzOTEsMTgsMThdLFxuXHRjaGVja2JveFRpY2s6IFs1MjgsMzkyLDIxLDE2XSxcblx0YnV0dG9uQmFja2dyb3VuZDogWzY4LDQ0Niw2NCw2NF0sXG5cdHNsaWRlckJhY2tncm91bmQ6IFszMTMsNDA3LDEyMCwzMF0sXG5cdHNsaWRlcktub2I6IFszMTgsMzc3LDI4LDI4XSxcblx0YmlnQnV0dG9uUG9zaXRpb246IFszNjYsNTc1XSxcblx0dXBBcnJvdzogWzQ4Myw2NCwxMiw4XVxufSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1BvaW50XCIpO1xyXG52YXIgRGVmYXVsdFNraW4gPSByZXF1aXJlKFwiLi9EZWZhdWx0U2tpblwiKTtcclxuXHJcbi8qKlxyXG4gKiBDbGllbnQgcmVzb3VyY2VzXHJcbiAqIEBjbGFzcyBSZXNvdXJjZXMuXHJcbiAqL1xyXG5mdW5jdGlvbiBSZXNvdXJjZXMoKSB7XHJcblx0dmFyIGk7XHJcblxyXG5cdHRoaXMuZGVmYXVsdFNraW4gPSBEZWZhdWx0U2tpbjtcclxuXHR0aGlzLnNraW4gPSBudWxsO1xyXG5cclxuXHJcblx0IHRoaXMuQWxpZ24gPSB7XHJcblx0IFx0TGVmdDogXCJsZWZ0XCIsXHJcblx0IFx0UmlnaHQ6IFwicmlnaHRcIixcclxuXHQgXHRDZW50ZXI6IFwiY2VudGVyXCJcclxuXHQgfTtcclxuXHJcblx0IHRoaXMudGV4dHVyZXMgPSB7fTtcclxuLypcclxuXHR0aGlzLmNvbXBvbmVudHNUZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoXCJjb21wb25lbnRzLnBuZ1wiKTtcclxuXHR0aGlzLnRhYmxlQmFja2dyb3VuZCA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoXCJ0YWJsZS5wbmdcIik7XHJcblxyXG5cdHRoaXMuc2VhdFBvc2l0aW9ucyA9IFtcclxuXHRcdFBvaW50KDI4NywgMTE4KSwgUG9pbnQoNDgzLCAxMTIpLCBQb2ludCg2NzYsIDExOCksXHJcblx0XHRQb2ludCg4NDQsIDI0NyksIFBvaW50KDgxNywgNDEzKSwgUG9pbnQoNjc2LCA0OTApLFxyXG5cdFx0UG9pbnQoNDgzLCA0OTUpLCBQb2ludCgyODcsIDQ5MCksIFBvaW50KDE0MCwgNDEzKSxcclxuXHRcdFBvaW50KDEyMywgMjQ3KVxyXG5cdF07XHJcblxyXG5cdHRoaXMudGltZXJCYWNrZ3JvdW5kID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgxMjEsMjAwLDMyLDMyKTsgXHJcblxyXG5cdHRoaXMuc2VhdFBsYXRlID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg0MCwgMTE2LCAxNjAsIDcwKTtcclxuXHJcblx0dGhpcy5jb21tdW5pdHlDYXJkc1Bvc2l0aW9uID0gUG9pbnQoMjU1LCAxOTApO1xyXG5cclxuXHR0aGlzLmNhcmRGcmFtZSA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoNDk4LCAyNTYsIDg3LCAxMjIpO1xyXG5cdHRoaXMuY2FyZEJhY2sgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDQwMiwgMjU2LCA4NywgMTIyKTtcclxuXHJcblx0dGhpcy5kaXZpZGVyTGluZSA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoNTY4LCA3NywgMiwgMTcwKTtcclxuXHJcblx0dGhpcy5zdWl0U3ltYm9scyA9IFtdO1xyXG5cdGZvciAoaSA9IDA7IGkgPCA0OyBpKyspXHJcblx0XHR0aGlzLnN1aXRTeW1ib2xzLnB1c2godGhpcy5nZXRDb21wb25lbnRzUGFydCgyNDYgKyBpICogMjMsIDY3LCAxOCwgMTkpKTtcclxuXHJcblx0dGhpcy5mcmFtZVBsYXRlID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzMDEsIDI2MiwgNzQsIDc2KTtcclxuXHR0aGlzLmJpZ0J1dHRvbiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzMsIDI5OCwgOTUsIDk0KTtcclxuXHR0aGlzLmRpYWxvZ0J1dHRvbiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzgzLCA0NjEsIDgyLCA0Nyk7XHJcblx0dGhpcy5kZWFsZXJCdXR0b24gPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDE5NywgMjM2LCA0MSwgMzUpO1xyXG5cclxuXHR0aGlzLmRlYWxlckJ1dHRvblBvc2l0aW9ucyA9IFtcclxuXHRcdFBvaW50KDM0NywgMTMzKSwgUG9pbnQoMzk1LCAxMzMpLCBQb2ludCg1NzQsIDEzMyksXHJcblx0XHRQb2ludCg3NjIsIDI2NyksIFBvaW50KDcxNSwgMzU4KSwgUG9pbnQoNTc0LCA0MzQpLFxyXG5cdFx0UG9pbnQoNTM2LCA0MzIpLCBQb2ludCgzNTEsIDQzMiksIFBvaW50KDE5MywgMzYyKSxcclxuXHRcdFBvaW50KDE2OCwgMjY2KVxyXG5cdF07XHJcblxyXG5cdHRoaXMudGV4dFNjcm9sbGJhclRyYWNrID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzNzEsNTAsNjAsMTApO1xyXG5cdHRoaXMudGV4dFNjcm9sbGJhclRodW1iID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzNzEsMzIsNjAsMTApO1xyXG5cclxuXHQgdGhpcy5BbGlnbiA9IHtcclxuXHQgXHRMZWZ0OiBcImxlZnRcIixcclxuXHQgXHRSaWdodDogXCJyaWdodFwiLFxyXG5cdCBcdENlbnRlcjogXCJjZW50ZXJcIixcclxuXHQgfTtcclxuXHJcblx0dGhpcy5iZXRBbGlnbiA9IFtcclxuXHRcdFx0dGhpcy5BbGlnbi5MZWZ0LCB0aGlzLkFsaWduLkNlbnRlciwgdGhpcy5BbGlnbi5SaWdodCxcclxuXHRcdFx0dGhpcy5BbGlnbi5SaWdodCwgdGhpcy5BbGlnbi5SaWdodCwgXHJcblx0XHRcdHRoaXMuQWxpZ24uUmlnaHQsIHRoaXMuQWxpZ24uQ2VudGVyLCB0aGlzLkFsaWduLkxlZnQsXHJcblx0XHRcdHRoaXMuQWxpZ24uTGVmdCwgdGhpcy5BbGlnbi5MZWZ0XHJcblx0XHRdO1xyXG5cclxuXHR0aGlzLmJldFBvc2l0aW9ucyA9IFtcclxuXHRcdFx0UG9pbnQoMjI1LDE1MCksIFBvaW50KDQ3OCwxNTApLCBQb2ludCg3MzAsMTUwKSxcclxuXHRcdFx0UG9pbnQoNzc4LDE5NiksIFBvaW50KDc0OCwzMjIpLCBQb2ludCg3MTksMzYwKSxcclxuXHRcdFx0UG9pbnQoNDgxLDM2MCksIFBvaW50KDIzMiwzNjApLCBQb2ludCgxOTksMzIyKSxcclxuXHRcdFx0UG9pbnQoMTgxLDIwMClcclxuXHRcdF07XHJcblxyXG5cdHRoaXMuY2hpcHMgPSBuZXcgQXJyYXkoKTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IDU7IGkrKykge1xyXG5cdFx0dmFyIGIgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDMwICsgaSo0MCwgMjUsIDQwLCAzMCk7XHJcblx0XHR0aGlzLmNoaXBzLnB1c2goYik7XHJcblx0fVxyXG5cclxuXHR0aGlzLmNoaXBzQ29sb3JzID0gWzB4NDA0MDQwLCAweDAwODAwMCwgMHg4MDgwMDAsIDB4MDAwMDgwLCAweGZmMDAwMF07XHJcblxyXG5cdHRoaXMucG90UG9zaXRpb24gPSBQb2ludCg0ODUsMzE1KTtcclxuXHQqL1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHZhbHVlIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cclxuICogQG1ldGhvZCBnZXRWYWx1ZVxyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKGtleSkge1xyXG5cdHZhciB2YWx1ZSA9IG51bGw7XHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbltrZXldICE9IG51bGwpKVxyXG5cdFx0dmFsdWUgPSB0aGlzLnNraW5ba2V5XTtcclxuXHRlbHNlXHJcblx0XHR2YWx1ZSA9IHRoaXMuZGVmYXVsdFNraW5ba2V5XTtcclxuXHJcblx0aWYodmFsdWUgPT0gbnVsbCkge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xyXG5cdH0gXHJcblxyXG5cdHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBwb2ludCBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0UG9pbnRcclxuICovXHJcblJlc291cmNlcy5wcm90b3R5cGUuZ2V0UG9pbnQgPSBmdW5jdGlvbihrZXkpIHtcclxuXHR2YXIgdmFsdWUgPSBudWxsO1xyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSlcclxuXHRcdHZhbHVlID0gUG9pbnQodGhpcy5za2luW2tleV1bMF0sIHRoaXMuc2tpbltrZXldWzFdKTtcclxuXHRlbHNlXHJcblx0XHR2YWx1ZSA9IFBvaW50KHRoaXMuZGVmYXVsdFNraW5ba2V5XVswXSwgdGhpcy5kZWZhdWx0U2tpbltrZXldWzFdKTtcclxuXHJcblx0aWYodmFsdWUgPT0gbnVsbCkge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xyXG5cdH0gXHJcblxyXG5cdHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBwb2ludHMgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxyXG4gKiBAbWV0aG9kIGdldFBvaW50c1xyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRQb2ludHMgPSBmdW5jdGlvbihrZXkpIHtcclxuXHR2YXIgdmFsdWVzID0gbnVsbDtcclxuXHJcblx0dmFyIHBvaW50cyA9IG5ldyBBcnJheSgpO1xyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSlcclxuXHRcdHZhbHVlcyA9IHRoaXMuc2tpbltrZXldO1xyXG5cdGVsc2VcclxuXHRcdHZhbHVlcyA9IHRoaXMuZGVmYXVsdFNraW5ba2V5XTtcclxuXHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0cG9pbnRzLnB1c2goUG9pbnQodmFsdWVzW2ldWzBdLCB2YWx1ZXNbaV1bMV0pKTtcclxuXHR9XHJcblxyXG5cdGlmKHBvaW50cy5sZW5ndGggPD0gMCkge1xyXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xyXG5cdH0gXHJcblxyXG5cdHJldHVybiBwb2ludHM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGV4dHVyZSBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXHJcbiAqIEBtZXRob2QgZ2V0VGV4dHVyZVxyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRUZXh0dXJlID0gZnVuY3Rpb24oa2V5LCBpbmRleCkge1xyXG5cdHZhciB2YWx1ZSA9IG51bGw7XHJcblx0dmFyIGlzRGVmYXVsdCA9IGZhbHNlO1xyXG5cdHZhciB0ZXh0dXJlID0gbnVsbDtcclxuXHR2YXIgZnJhbWUgPSBudWxsO1xyXG5cclxuXHJcblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpIHtcclxuXHRcdHZhbHVlID0gdGhpcy5za2luW2tleV07XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dmFsdWUgPSB0aGlzLmRlZmF1bHRTa2luW2tleV07XHJcblx0XHRpc0RlZmF1bHQgPSB0cnVlO1xyXG5cdH1cclxuLy9cdGNvbnNvbGUubG9nKFwidmFsdWUgPSBcIiArIHZhbHVlICsgXCIsIGtleSA9IFwiICtrZXkpO1xyXG5cclxuXHJcblx0aWYodmFsdWUudGV4dHVyZSAhPSBudWxsKSB7XHJcblx0XHR0ZXh0dXJlID0gdmFsdWUudGV4dHVyZTtcclxuXHR9XHJcblx0ZWxzZSBpZighaXNEZWZhdWx0ICYmICh0aGlzLnNraW4uZGVmYXVsdFRleHR1cmUgIT0gbnVsbCkpIHtcclxuXHRcdHRleHR1cmUgPSB0aGlzLnNraW4uZGVmYXVsdFRleHR1cmU7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dGV4dHVyZSA9IHRoaXMuZGVmYXVsdFNraW4uZGVmYXVsdFRleHR1cmU7XHJcblx0fVxyXG5cclxuXHRpZih2YWx1ZS5jb29yZHMgIT0gbnVsbCkge1xyXG5cdFx0ZnJhbWUgPSB2YWx1ZS5jb29yZHM7XHJcblx0fVxyXG5cdGVsc2UgaWYodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHR0ZXh0dXJlID0gdmFsdWU7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0ZnJhbWUgPSB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdGlmKHRleHR1cmUgIT0gbnVsbCkge1xyXG5cdFx0aWYoZnJhbWUgIT0gbnVsbClcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWVbMF0sIGZyYW1lWzFdLCBmcmFtZVsyXSwgZnJhbWVbM10pO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRDb21wb25lbnRzUGFydCh0ZXh0dXJlLCBmcmFtZSk7XHJcblx0fVxyXG5cclxuXHJcblx0XHJcblx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xyXG5cdFxyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRleHR1cmVzIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cclxuICogQG1ldGhvZCBnZXRUZXh0dXJlc1xyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRUZXh0dXJlcyA9IGZ1bmN0aW9uKGtleSkge1xyXG5cdHZhciB2YWx1ZXMgPSBudWxsO1xyXG5cdHZhciBpc0RlZmF1bHQgPSBmYWxzZTtcclxuXHJcblx0XHJcblx0XHJcblxyXG5cdGlmKCh0aGlzLnNraW4gIT0gbnVsbCkgJiYgKHRoaXMuc2tpbltrZXldICE9IG51bGwpKSB7XHJcblx0XHR2YWx1ZXMgPSB0aGlzLnNraW5ba2V5XTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHR2YWx1ZXMgPSB0aGlzLmRlZmF1bHRTa2luW2tleV07XHJcblx0XHRpc0RlZmF1bHQgPSB0cnVlO1xyXG5cdH1cclxuXHJcblxyXG5cdHZhciBmcmFtZSA9IG51bGw7XHJcblx0dmFyIHRleHR1cmUgPSBudWxsO1xyXG5cdHZhciB0ZXh0dXJlcyA9IG5ldyBBcnJheSgpO1xyXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZyYW1lID0gbnVsbDtcclxuXHRcdHRleHR1cmUgPSBudWxsO1xyXG5cdFx0XHJcblx0XHRpZih2YWx1ZXNbaV0udGV4dHVyZSAhPSBudWxsKSB7XHJcblx0XHRcdHRleHR1cmUgPSB2YWx1ZXNbaV0udGV4dHVyZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoIWlzRGVmYXVsdCAmJiAodGhpcy5za2luLmRlZmF1bHRUZXh0dXJlICE9IG51bGwpKSB7XHJcblx0XHRcdHRleHR1cmUgPSB0aGlzLnNraW4uZGVmYXVsdFRleHR1cmU7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGV4dHVyZSA9IHRoaXMuZGVmYXVsdFNraW4uZGVmYXVsdFRleHR1cmU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodmFsdWVzW2ldLmNvb3JkcyAhPSBudWxsKSB7XHJcblx0XHRcdGZyYW1lID0gdmFsdWVzW2ldLmNvb3JkcztcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYodHlwZW9mIHZhbHVlc1tpXSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR0ZXh0dXJlID0gdmFsdWVzW2ldO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZyYW1lID0gdmFsdWVzW2ldO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKHRleHR1cmUgIT0gbnVsbCkge1xyXG5cdFx0XHRpZihmcmFtZSAhPSBudWxsKVxyXG5cdFx0XHRcdHRleHR1cmVzLnB1c2godGhpcy5nZXRDb21wb25lbnRzUGFydCh0ZXh0dXJlLCBmcmFtZVswXSwgZnJhbWVbMV0sIGZyYW1lWzJdLCBmcmFtZVszXSkpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGV4dHVyZXMucHVzaCh0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRcclxuXHRpZih0ZXh0dXJlcy5sZW5ndGggPD0gMClcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcclxuXHQgXHJcblxyXG5cdHJldHVybiB0ZXh0dXJlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBwYXJ0IGZyb20gY29tcG9uZW50cyBhdGxhcy5cclxuICogQG1ldGhvZCBnZXRDb21wb25lbnRzUGFydFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRDb21wb25lbnRzUGFydCA9IGZ1bmN0aW9uKHRleHR1cmVpZCwgeCwgeSwgdywgaCkge1xyXG5cclxuXHR2YXIgZnJhbWU7XHJcblx0dmFyIHRleHR1cmUgPSB0aGlzLmdldFRleHR1cmVGcm9tU2tpbih0ZXh0dXJlaWQpO1xyXG5cclxuXHRpZih4ID09PSBudWxsKSB7XHJcblx0XHRmcmFtZSA9IHtcclxuXHRcdFx0eDogMCxcclxuXHRcdFx0eTogMCxcclxuXHRcdFx0d2lkdGg6IHRleHR1cmUud2lkdGgsXHJcblx0XHRcdGhlaWdodDogdGV4dHVyZS5oZWlnaHRcclxuXHRcdH07XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0ZnJhbWUgPSB7XHJcblx0XHRcdHg6IHgsXHJcblx0XHRcdHk6IHksXHJcblx0XHRcdHdpZHRoOiB3LFxyXG5cdFx0XHRoZWlnaHQ6IGhcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbmV3IFBJWEkuVGV4dHVyZSh0ZXh0dXJlLCBmcmFtZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGV4dHVyZSBvYmplY3QgZnJvbSBza2luLlxyXG4gKiBAbWV0aG9kIGdldFRleHR1cmVGcm9tU2tpblxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuUmVzb3VyY2VzLnByb3RvdHlwZS5nZXRUZXh0dXJlRnJvbVNraW4gPSBmdW5jdGlvbih0ZXh0dXJlaWQpIHtcclxuXHJcblx0dmFyIHRleHR1cmVPYmplY3QgPSBudWxsO1xyXG5cclxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW4udGV4dHVyZXMgIT0gbnVsbCkpIHtcclxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnNraW4udGV4dHVyZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYodGhpcy5za2luLnRleHR1cmVzW2ldLmlkID09IHRleHR1cmVpZCkge1xyXG5cdFx0XHRcdHRleHR1cmVPYmplY3QgPSB0aGlzLnNraW4udGV4dHVyZXNbaV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0aWYodGV4dHVyZU9iamVjdCA9PSBudWxsKSB7XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5kZWZhdWx0U2tpbi50ZXh0dXJlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZih0aGlzLmRlZmF1bHRTa2luLnRleHR1cmVzW2ldLmlkID09IHRleHR1cmVpZCkge1xyXG5cdFx0XHRcdHRleHR1cmVPYmplY3QgPSB0aGlzLmRlZmF1bHRTa2luLnRleHR1cmVzW2ldO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRpZih0ZXh0dXJlT2JqZWN0ID09IG51bGwpIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcInRleHR1cmVpZCBkb2Vzbid0IGV4aXN0OiBcIiArIHRleHR1cmVpZCk7XHJcblx0fVxyXG5cclxuXHRpZih0aGlzLnRleHR1cmVzW3RleHR1cmVPYmplY3QuaWRdID09IG51bGwpXHJcblx0XHR0aGlzLnRleHR1cmVzW3RleHR1cmVPYmplY3QuaWRdID0gbmV3IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UodGV4dHVyZU9iamVjdC5maWxlKTtcclxuXHJcblx0cmV0dXJuIHRoaXMudGV4dHVyZXNbdGV4dHVyZU9iamVjdC5pZF07XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogR2V0IHNpbmdsZXRvbiBpbnN0YW5jZS5cclxuICogQG1ldGhvZCBnZXRJbnN0YW5jZVxyXG4gKi9cclxuUmVzb3VyY2VzLmdldEluc3RhbmNlID0gZnVuY3Rpb24oKSB7XHJcblx0aWYgKCFSZXNvdXJjZXMuaW5zdGFuY2UpXHJcblx0XHRSZXNvdXJjZXMuaW5zdGFuY2UgPSBuZXcgUmVzb3VyY2VzKCk7XHJcblxyXG5cdHJldHVybiBSZXNvdXJjZXMuaW5zdGFuY2U7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVzb3VyY2VzOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvQnV0dG9uXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xuXG4vKipcbiAqIEJpZyBidXR0b24uXG4gKiBAY2xhc3MgQmlnQnV0dG9uXG4gKi9cbmZ1bmN0aW9uIEJpZ0J1dHRvbigpIHtcblx0QnV0dG9uLmNhbGwodGhpcyk7XG5cblx0dGhpcy5iaWdCdXR0b25UZXh0dXJlID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImJpZ0J1dHRvblwiKTtcblxuXHR0aGlzLmFkZENoaWxkKG5ldyBQSVhJLlNwcml0ZSh0aGlzLmJpZ0J1dHRvblRleHR1cmUpKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDE4cHggQXJpYWxcIixcblx0XHQvL2ZpbGw6IFwiIzAwMDAwMFwiXG5cdH07XG5cblx0dGhpcy5sYWJlbEZpZWxkID0gbmV3IFBJWEkuVGV4dChcIltidXR0b25dXCIsIHN0eWxlKTtcblx0dGhpcy5sYWJlbEZpZWxkLnBvc2l0aW9uLnkgPSAzMDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsRmllbGQpO1xuXG5cdHZhciBzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMTRweCBBcmlhbFwiXG5cdFx0Ly9maWxsOiBcIiMwMDAwMDBcIlxuXHR9O1xuXG5cdHRoaXMudmFsdWVGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdmFsdWVdXCIsIHN0eWxlKTtcblx0dGhpcy52YWx1ZUZpZWxkLnBvc2l0aW9uLnkgPSA1MDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnZhbHVlRmllbGQpO1xuXG5cdHRoaXMuc2V0TGFiZWwoXCJURVNUXCIpO1xuXHR0aGlzLnNldFZhbHVlKDEyMyk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQmlnQnV0dG9uLCBCdXR0b24pO1xuXG4vKipcbiAqIFNldCBsYWJlbCBmb3IgdGhlIGJ1dHRvbi5cbiAqIEBtZXRob2Qgc2V0TGFiZWxcbiAqL1xuQmlnQnV0dG9uLnByb3RvdHlwZS5zZXRMYWJlbCA9IGZ1bmN0aW9uKGxhYmVsKSB7XG5cdHRoaXMubGFiZWxGaWVsZC5zZXRUZXh0KGxhYmVsKTtcblx0dGhpcy5sYWJlbEZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXHR0aGlzLmxhYmVsRmllbGQueCA9IHRoaXMuYmlnQnV0dG9uVGV4dHVyZS53aWR0aCAvIDIgLSB0aGlzLmxhYmVsRmllbGQud2lkdGggLyAyO1xufVxuXG4vKipcbiAqIFNldCB2YWx1ZS5cbiAqIEBtZXRob2Qgc2V0VmFsdWVcbiAqL1xuQmlnQnV0dG9uLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdGlmICghdmFsdWUpIHtcblx0XHR0aGlzLnZhbHVlRmllbGQudmlzaWJsZSA9IGZhbHNlO1xuXHRcdHZhbHVlID0gXCJcIjtcblx0fSBlbHNlIHtcblx0XHR0aGlzLnZhbHVlRmllbGQudmlzaWJsZSA9IHRydWU7XG5cdH1cblxuXHR0aGlzLnZhbHVlRmllbGQuc2V0VGV4dCh2YWx1ZSk7XG5cdHRoaXMudmFsdWVGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy52YWx1ZUZpZWxkLnggPSB0aGlzLmJpZ0J1dHRvblRleHR1cmUud2lkdGggLyAyIC0gdGhpcy52YWx1ZUZpZWxkLndpZHRoIC8gMjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCaWdCdXR0b247IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xyXG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcclxudmFyIFNsaWRlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9TbGlkZXJcIik7XHJcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xyXG52YXIgQmlnQnV0dG9uID0gcmVxdWlyZShcIi4vQmlnQnV0dG9uXCIpO1xyXG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XHJcbnZhciBSYWlzZVNob3J0Y3V0QnV0dG9uID0gcmVxdWlyZShcIi4vUmFpc2VTaG9ydGN1dEJ1dHRvblwiKTtcclxuXHJcbi8qKlxyXG4gKiBCdXR0b25zXHJcbiAqIEBjbGFzcyBCdXR0b25zVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gQnV0dG9uc1ZpZXcoKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblxyXG5cdHRoaXMuYnV0dG9uSG9sZGVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25Ib2xkZXIpO1xyXG5cclxuXHR2YXIgc2xpZGVyQmFja2dyb3VuZCA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInNsaWRlckJhY2tncm91bmRcIiksIDIwLCAwLCAyMCwgMCk7XHJcblx0c2xpZGVyQmFja2dyb3VuZC53aWR0aCA9IDMwMDtcclxuXHJcblx0dmFyIGtub2IgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInNsaWRlcktub2JcIikpO1xyXG5cclxuXHR0aGlzLnNsaWRlciA9IG5ldyBTbGlkZXIoc2xpZGVyQmFja2dyb3VuZCwga25vYik7XHJcblx0dmFyIHBvcyA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwiYmlnQnV0dG9uUG9zaXRpb25cIik7XHJcblx0dGhpcy5zbGlkZXIucG9zaXRpb24ueCA9IHBvcy54O1xyXG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnkgPSBwb3MueSAtIDM1O1xyXG5cdHRoaXMuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vblNsaWRlckNoYW5nZSwgdGhpcyk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNsaWRlcik7XHJcblxyXG5cclxuXHR0aGlzLmJ1dHRvbkhvbGRlci5wb3NpdGlvbi54ID0gMzY2O1xyXG5cdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnkgPSA1NzU7XHJcblxyXG5cdHRoaXMuYnV0dG9ucyA9IFtdO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xyXG5cdFx0dmFyIGJ1dHRvbiA9IG5ldyBCaWdCdXR0b24oKTtcclxuXHRcdGJ1dHRvbi5vbihCdXR0b24uQ0xJQ0ssIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XHJcblx0XHRidXR0b24ucG9zaXRpb24ueCA9IGkgKiAxMDU7XHJcblx0XHR0aGlzLmJ1dHRvbkhvbGRlci5hZGRDaGlsZChidXR0b24pO1xyXG5cdFx0dGhpcy5idXR0b25zLnB1c2goYnV0dG9uKTtcclxuXHR9XHJcblxyXG5cdHZhciByYWlzZVNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwic2xpZGVyS25vYlwiKSk7XHJcblx0dmFyIGFycm93U3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ1cEFycm93XCIpKTtcclxuXHRhcnJvd1Nwcml0ZS5wb3NpdGlvbi54ID0gKHJhaXNlU3ByaXRlLndpZHRoIC0gYXJyb3dTcHJpdGUud2lkdGgpKjAuNSAtIDAuNTtcclxuXHRhcnJvd1Nwcml0ZS5wb3NpdGlvbi55ID0gKHJhaXNlU3ByaXRlLmhlaWdodCAtIGFycm93U3ByaXRlLmhlaWdodCkqMC41IC0gMjtcclxuXHRyYWlzZVNwcml0ZS5hZGRDaGlsZChhcnJvd1Nwcml0ZSk7XHJcblxyXG5cdHRoaXMucmFpc2VNZW51QnV0dG9uID0gbmV3IEJ1dHRvbihyYWlzZVNwcml0ZSk7XHJcblx0dGhpcy5yYWlzZU1lbnVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihCdXR0b24uQ0xJQ0ssIHRoaXMub25SYWlzZU1lbnVCdXR0b25DbGljaywgdGhpcyk7XHJcblx0dGhpcy5yYWlzZU1lbnVCdXR0b24ucG9zaXRpb24ueCA9IDIqMTA1ICsgNzA7XHJcblx0dGhpcy5yYWlzZU1lbnVCdXR0b24ucG9zaXRpb24ueSA9IC01O1xyXG5cdHRoaXMuYnV0dG9uSG9sZGVyLmFkZENoaWxkKHRoaXMucmFpc2VNZW51QnV0dG9uKTtcclxuXHJcblx0dGhpcy5yYWlzZU1lbnVCdXR0b24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdHRoaXMuY3JlYXRlUmFpc2VBbW91bnRNZW51KCk7XHJcblxyXG5cdHRoaXMuc2V0QnV0dG9ucyhbXSwgMCwgLTEsIC0xKTtcclxuXHJcblx0dGhpcy5idXR0b25zRGF0YXMgPSBbXTtcclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChCdXR0b25zVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcclxuRXZlbnREaXNwYXRjaGVyLmluaXQoQnV0dG9uc1ZpZXcpO1xyXG5cclxuQnV0dG9uc1ZpZXcuQlVUVE9OX0NMSUNLID0gXCJidXR0b25DbGlja1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmFpc2UgYW1vdW50IG1lbnUuXHJcbiAqIEBtZXRob2QgY3JlYXRlUmFpc2VBbW91bnRNZW51XHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUuY3JlYXRlUmFpc2VBbW91bnRNZW51ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcblxyXG5cdHRoaXMucmFpc2VNZW51QmFja2dyb3VuZCA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoYXRCYWNrZ3JvdW5kXCIpLCAxMCwgMTAsIDEwLCAxMCk7XHJcblx0dGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kLnBvc2l0aW9uLnggPSAwO1xyXG5cdHRoaXMucmFpc2VNZW51QmFja2dyb3VuZC5wb3NpdGlvbi55ID0gMDtcclxuXHR0aGlzLnJhaXNlTWVudUJhY2tncm91bmQud2lkdGggPSAxMjU7XHJcblx0dGhpcy5yYWlzZU1lbnVCYWNrZ3JvdW5kLmhlaWdodCA9IDIyMDtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS5hZGRDaGlsZCh0aGlzLnJhaXNlTWVudUJhY2tncm91bmQpO1xyXG5cclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS54ID0gNjQ1O1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51LnkgPSA1NzAgLSB0aGlzLnJhaXNlQW1vdW50TWVudS5oZWlnaHQ7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnJhaXNlQW1vdW50TWVudSk7XHJcblxyXG5cdHZhciBzdHlsZU9iamVjdCA9IHtcclxuXHRcdGZvbnQ6IFwiYm9sZCAxOHB4IEFyaWFsXCIsXHJcblx0fTtcclxuXHJcblx0dmFyIHQgPSBuZXcgUElYSS5UZXh0KFwiUkFJU0UgVE9cIiwgc3R5bGVPYmplY3QpO1xyXG5cdHQucG9zaXRpb24ueCA9ICgxMjUgLSB0LndpZHRoKSowLjU7XHJcblx0dC5wb3NpdGlvbi55ID0gMTA7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnUuYWRkQ2hpbGQodCk7XHJcblxyXG5cdHRoaXMucmFpc2VTaG9ydGN1dEJ1dHRvbnMgPSBuZXcgQXJyYXkoKTtcclxuXHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xyXG5cdFx0dmFyIGIgPSBuZXcgUmFpc2VTaG9ydGN1dEJ1dHRvbigpO1xyXG5cdFx0Yi5hZGRFdmVudExpc3RlbmVyKEJ1dHRvbi5DTElDSywgdGhpcy5vblJhaXNlU2hvcnRjdXRDbGljaywgdGhpcyk7XHJcblx0XHRiLnBvc2l0aW9uLnggPSAxMDtcclxuXHRcdGIucG9zaXRpb24ueSA9IDM1ICsgaSozMDtcclxuXHJcblx0XHR0aGlzLnJhaXNlQW1vdW50TWVudS5hZGRDaGlsZChiKTtcclxuXHRcdHRoaXMucmFpc2VTaG9ydGN1dEJ1dHRvbnMucHVzaChiKTtcclxuXHR9XHJcblxyXG4vKlxyXG5cdFBpeGlUZXh0aW5wdXQgc2hvdWxkIGJlIHVzZWQuXHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dD1uZXcgVGV4dEZpZWxkKCk7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC54PTEwO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQueT00MCszMCo1O1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQud2lkdGg9MTA1O1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuaGVpZ2h0PTE5O1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuYm9yZGVyPXRydWU7XHJcblx0dGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5ib3JkZXJDb2xvcj0weDQwNDA0MDtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmJhY2tncm91bmQ9dHJ1ZTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0Lm11bHRpbGluZT1mYWxzZTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LnR5cGU9VGV4dEZpZWxkVHlwZS5JTlBVVDtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoRXZlbnQuQ0hBTkdFLG9uUmFpc2VBbW91bnRNZW51SW5wdXRDaGFuZ2UpO1xyXG5cdHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihLZXlib2FyZEV2ZW50LktFWV9ET1dOLG9uUmFpc2VBbW91bnRNZW51SW5wdXRLZXlEb3duKTtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS5hZGRDaGlsZCh0aGlzLnJhaXNlQW1vdW50TWVudUlucHV0KTtcclxuXHQqL1xyXG5cclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS52aXNpYmxlID0gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSYWlzZSBhbW91bnQgYnV0dG9uLlxyXG4gKiBAbWV0aG9kIG9uUmFpc2VNZW51QnV0dG9uQ2xpY2tcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5vblJhaXNlU2hvcnRjdXRDbGljayA9IGZ1bmN0aW9uKCkge1xyXG5cdC8qdmFyIGIgPSBjYXN0IGUudGFyZ2V0O1xyXG5cclxuXHRfcmFpc2VBbW91bnRNZW51LnZpc2libGU9ZmFsc2U7XHJcblxyXG5cdGJ1dHRvbnNbX3NsaWRlckluZGV4XS52YWx1ZT1iLnZhbHVlO1xyXG5cdF9zbGlkZXIudmFsdWU9KGJ1dHRvbnNbX3NsaWRlckluZGV4XS52YWx1ZS1fc2xpZGVyTWluKS8oX3NsaWRlck1heC1fc2xpZGVyTWluKTtcclxuXHRfcmFpc2VBbW91bnRNZW51SW5wdXQudGV4dD1TdGQuc3RyaW5nKGJ1dHRvbnNbX3NsaWRlckluZGV4XS52YWx1ZSk7XHJcblxyXG5cdHRyYWNlKFwidmFsdWUgY2xpY2s6IFwiK2IudmFsdWUpOyovXHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIFJhaXNlIGFtb3VudCBidXR0b24uXHJcbiAqIEBtZXRob2Qgb25SYWlzZU1lbnVCdXR0b25DbGlja1xyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLm9uUmFpc2VNZW51QnV0dG9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnJhaXNlQW1vdW50TWVudS52aXNpYmxlID0gIXRoaXMucmFpc2VBbW91bnRNZW51LnZpc2libGU7XHJcbi8qXHJcblx0aWYodGhpcy5yYWlzZUFtb3VudE1lbnUudmlzaWJsZSkge1xyXG5cdFx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSB0aGlzLm9uU3RhZ2VNb3VzZURvd24uYmluZCh0aGlzKTtcclxuXHRcdC8vIHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuZm9jdXMoKTtcclxuXHRcdC8vIHRoaXMucmFpc2VBbW91bnRNZW51SW5wdXQuU2VsZWN0QWxsXHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSBudWxsO1xyXG5cdH0qL1xyXG59XHJcblxyXG4vKipcclxuICogU2xpZGVyIGNoYW5nZS5cclxuICogQG1ldGhvZCBvblNsaWRlckNoYW5nZVxyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLm9uU2xpZGVyQ2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIG5ld1ZhbHVlID0gTWF0aC5yb3VuZCh0aGlzLnNsaWRlck1pbiArIHRoaXMuc2xpZGVyLmdldFZhbHVlKCkqKHRoaXMuc2xpZGVyTWF4IC0gdGhpcy5zbGlkZXJNaW4pKTtcclxuXHR0aGlzLmJ1dHRvbnNbdGhpcy5zbGlkZXJJbmRleF0uc2V0VmFsdWUobmV3VmFsdWUpO1xyXG5cdHRoaXMuYnV0dG9uRGF0YXNbdGhpcy5zbGlkZXJJbmRleF0udmFsdWUgPSBuZXdWYWx1ZTtcclxuXHRjb25zb2xlLmxvZyhcIm5ld1ZhbHVlID0gXCIgKyBuZXdWYWx1ZSk7XHJcblxyXG5cdC8vdGhpcy5yYWlzZUFtb3VudE1lbnVJbnB1dC5zZXRUZXh0KGJ1dHRvbnNbX3NsaWRlckluZGV4XS52YWx1ZS50b1N0cmluZygpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgc2xpZGVyLlxyXG4gKiBAbWV0aG9kIHNob3dTbGlkZXJcclxuICovXHJcbkJ1dHRvbnNWaWV3LnByb3RvdHlwZS5zaG93U2xpZGVyID0gZnVuY3Rpb24oaW5kZXgsIG1pbiwgbWF4KSB7XHJcblx0Y29uc29sZS5sb2coXCJzaG93U2xpZGVyXCIpO1xyXG5cdHRoaXMuc2xpZGVySW5kZXggPSBpbmRleDtcclxuXHR0aGlzLnNsaWRlck1pbiA9IG1pbjtcclxuXHR0aGlzLnNsaWRlck1heCA9IG1heDtcclxuXHJcblx0Y29uc29sZS5sb2coXCJ0aGlzLmJ1dHRvbkRhdGFzW1wiK2luZGV4K1wiXSA9IFwiICsgdGhpcy5idXR0b25EYXRhc1tpbmRleF0uZ2V0VmFsdWUoKSArIFwiLCBtaW4gPSBcIiArIG1pbiArIFwiLCBtYXggPSBcIiArIG1heCk7XHJcblx0dGhpcy5zbGlkZXIuc2V0VmFsdWUoKHRoaXMuYnV0dG9uRGF0YXNbaW5kZXhdLmdldFZhbHVlKCkgLSBtaW4pLyhtYXggLSBtaW4pKTtcclxuXHRjb25zb2xlLmxvZyhcInRoaXMuc2xpZGVyLmdldFZhbHVlKCkgPSBcIiArIHRoaXMuc2xpZGVyLmdldFZhbHVlKCkpO1xyXG5cdHRoaXMuc2xpZGVyLnZpc2libGUgPSB0cnVlO1xyXG5cdHRoaXMuc2xpZGVyLnNob3coKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENsZWFyLlxyXG4gKiBAbWV0aG9kIGNsZWFyXHJcbiAqL1xyXG5CdXR0b25zVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbihidXR0b25EYXRhcykge1xyXG5cdHRoaXMuc2V0QnV0dG9ucyhbXSwgMCwgLTEsIC0xKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCBidXR0b24gZGF0YXMuXHJcbiAqIEBtZXRob2Qgc2V0QnV0dG9uc1xyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLnNldEJ1dHRvbnMgPSBmdW5jdGlvbihidXR0b25EYXRhcywgc2xpZGVyQnV0dG9uSW5kZXgsIG1pbiwgbWF4KSB7XHJcblx0dGhpcy5idXR0b25EYXRhcyA9IGJ1dHRvbkRhdGFzO1xyXG5cclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGJ1dHRvbiA9IHRoaXMuYnV0dG9uc1tpXTtcclxuXHRcdGlmIChpID49IGJ1dHRvbkRhdGFzLmxlbmd0aCkge1xyXG5cdFx0XHRidXR0b24udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0XHRjb250aW51ZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgYnV0dG9uRGF0YSA9IGJ1dHRvbkRhdGFzW2ldO1xyXG5cclxuXHRcdGJ1dHRvbi52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdGJ1dHRvbi5zZXRMYWJlbChidXR0b25EYXRhLmdldEJ1dHRvblN0cmluZygpKTtcclxuXHRcdGJ1dHRvbi5zZXRWYWx1ZShidXR0b25EYXRhLmdldFZhbHVlKCkpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmKChtaW4gPj0gMCkgJiYgKG1heCA+PSAwKSlcclxuXHRcdHRoaXMuc2hvd1NsaWRlcihzbGlkZXJCdXR0b25JbmRleCwgbWluLCBtYXgpO1xyXG5cclxuXHR0aGlzLmJ1dHRvbkhvbGRlci5wb3NpdGlvbi54ID0gMzY2O1xyXG5cclxuXHRpZiAoYnV0dG9uRGF0YXMubGVuZ3RoIDwgMylcclxuXHRcdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnggKz0gNDU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdXR0b24gY2xpY2suXHJcbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuQnV0dG9uc1ZpZXcucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbihlKSB7XHJcblx0dmFyIGJ1dHRvbkluZGV4ID0gLTE7XHJcblxyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR0aGlzLmJ1dHRvbnNbaV0udmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0aWYgKGUudGFyZ2V0ID09IHRoaXMuYnV0dG9uc1tpXSlcclxuXHRcdFx0YnV0dG9uSW5kZXggPSBpO1xyXG5cdH1cclxuXHJcblx0dGhpcy5zbGlkZXIudmlzaWJsZSA9IGZhbHNlO1xyXG5cclxuXHQvL2NvbnNvbGUubG9nKFwiYnV0dG9uIGNsaWNrOiBcIiArIGJ1dHRvbkluZGV4KTtcclxuXHR2YXIgYnV0dG9uRGF0YSA9IHRoaXMuYnV0dG9uRGF0YXNbYnV0dG9uSW5kZXhdO1xyXG5cclxuXHR0aGlzLnRyaWdnZXIoe1xyXG5cdFx0dHlwZTogQnV0dG9uc1ZpZXcuQlVUVE9OX0NMSUNLLFxyXG5cdFx0YnV0dG9uOiBidXR0b25EYXRhLmdldEJ1dHRvbigpLFxyXG5cdFx0dmFsdWU6IGJ1dHRvbkRhdGEuZ2V0VmFsdWUoKVxyXG5cdH0pO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbnNWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XHJcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcclxudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XHJcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcblxyXG4vKipcclxuICogQSBjYXJkIHZpZXcuXHJcbiAqIEBjbGFzcyBDYXJkVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gQ2FyZFZpZXcoKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblx0dGhpcy50YXJnZXRQb3NpdGlvbiA9IG51bGw7XHJcblxyXG5cclxuXHJcblxyXG5cdHRoaXMuZnJhbWUgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNhcmRGcmFtZVwiKSk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmZyYW1lKTtcclxuXHJcblx0dGhpcy5zdWl0ID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFwic3VpdFN5bWJvbHNcIilbMF0pO1xyXG5cdHRoaXMuc3VpdC5wb3NpdGlvbi54ID0gODtcclxuXHR0aGlzLnN1aXQucG9zaXRpb24ueSA9IDI1O1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zdWl0KTtcclxuXHJcblx0dmFyIHN0eWxlID0ge1xyXG5cdFx0Zm9udDogXCJib2xkIDE2cHggQXJpYWxcIlxyXG5cdH07XHJcblxyXG5cdHRoaXMudmFsdWVGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdmFsXVwiLCBzdHlsZSk7XHJcblx0dGhpcy52YWx1ZUZpZWxkLnBvc2l0aW9uLnggPSA2O1xyXG5cdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi55ID0gNTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMudmFsdWVGaWVsZCk7XHJcblxyXG5cdHRoaXMuYmFjayA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2FyZEJhY2tcIikpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5iYWNrKTtcclxuXHJcblxyXG5cdHRoaXMubWFza0dyYXBoaWNzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcclxuXHR0aGlzLm1hc2tHcmFwaGljcy5iZWdpbkZpbGwoMHgwMDAwMDApO1xyXG5cdHRoaXMubWFza0dyYXBoaWNzLmRyYXdSZWN0KDAsIDAsIDg3LCB0aGlzLmhlaWdodCk7XHJcblx0dGhpcy5tYXNrR3JhcGhpY3MuZW5kRmlsbCgpO1xyXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5tYXNrR3JhcGhpY3MpO1xyXG5cclxuXHR0aGlzLm1hc2sgPSB0aGlzLm1hc2tHcmFwaGljcztcclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChDYXJkVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcclxuRXZlbnREaXNwYXRjaGVyLmluaXQoQ2FyZFZpZXcpO1xyXG5cclxuLyoqXHJcbiAqIFNldCBjYXJkIGRhdGEuXHJcbiAqIEBtZXRob2Qgc2V0Q2FyZERhdGFcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5zZXRDYXJkRGF0YSA9IGZ1bmN0aW9uKGNhcmREYXRhKSB7XHJcblx0dGhpcy5jYXJkRGF0YSA9IGNhcmREYXRhO1xyXG5cclxuXHJcblx0aWYgKHRoaXMuY2FyZERhdGEuaXNTaG93bigpKSB7XHJcblx0XHQvKlxyXG5cdFx0dGhpcy5iYWNrLnZpc2libGUgPSBmYWxzZTtcclxuXHRcdHRoaXMuZnJhbWUudmlzaWJsZSA9IHRydWU7XHJcbiovXHJcblx0XHR0aGlzLnZhbHVlRmllbGQuc3R5bGUuZmlsbCA9IHRoaXMuY2FyZERhdGEuZ2V0Q29sb3IoKTtcclxuXHJcblx0XHR0aGlzLnZhbHVlRmllbGQuc2V0VGV4dCh0aGlzLmNhcmREYXRhLmdldENhcmRWYWx1ZVN0cmluZygpKTtcclxuXHRcdHRoaXMudmFsdWVGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcclxuXHRcdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi54ID0gMTcgLSB0aGlzLnZhbHVlRmllbGQuY2FudmFzLndpZHRoIC8gMjtcclxuXHJcblx0XHR0aGlzLnN1aXQuc2V0VGV4dHVyZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlcyhcInN1aXRTeW1ib2xzXCIpW3RoaXMuY2FyZERhdGEuZ2V0U3VpdEluZGV4KCldKTtcclxuXHR9XHJcblx0dGhpcy5iYWNrLnZpc2libGUgPSB0cnVlO1xyXG5cdHRoaXMuZnJhbWUudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IGNhcmQgZGF0YS5cclxuICogQG1ldGhvZCBzZXRDYXJkRGF0YVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLnNldFRhcmdldFBvc2l0aW9uID0gZnVuY3Rpb24ocG9pbnQpIHtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gcG9pbnQ7XHJcblxyXG5cdHRoaXMucG9zaXRpb24ueCA9IHBvaW50Lng7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gcG9pbnQueTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhpZGUuXHJcbiAqIEBtZXRob2QgaGlkZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cuXHJcbiAqIEBtZXRob2Qgc2hvd1xyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihhbmltYXRlLCBkZWxheSkge1xyXG5cdC8qaWYoZGVsYXkgPT0gdW5kZWZpbmVkKVxyXG5cdFx0ZGVsYXkgPSAxO1xyXG5cdCovXHJcblx0dGhpcy5tYXNrR3JhcGhpY3Muc2NhbGUueSA9IDE7XHJcblx0dGhpcy5wb3NpdGlvbi54ID0gdGhpcy50YXJnZXRQb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcclxuXHRpZighYW5pbWF0ZSkge1xyXG5cdFx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcclxuXHRcdHRoaXMub25TaG93Q29tcGxldGUoKTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0dGhpcy5tYXNrLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xyXG5cclxuXHR2YXIgZGVzdGluYXRpb24gPSB7eDogdGhpcy5wb3NpdGlvbi54LCB5OiB0aGlzLnBvc2l0aW9uLnl9O1xyXG5cdHRoaXMucG9zaXRpb24ueCA9ICh0aGlzLnBhcmVudC53aWR0aCAtIHRoaXMud2lkdGgpKjAuNTtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSAtdGhpcy5oZWlnaHQ7XHJcblxyXG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XHJcblx0dmFyIGRpZmZZID0gdGhpcy5wb3NpdGlvbi55IC0gZGVzdGluYXRpb24ueTtcclxuXHR2YXIgZGlmZiA9IE1hdGguc3FydChkaWZmWCpkaWZmWCArIGRpZmZZKmRpZmZZKTtcclxuXHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKCB0aGlzLnBvc2l0aW9uIClcclxuLy8gICAgICAgICAgICAuZGVsYXkoZGVsYXkpXHJcbiAgICAgICAgICAgIC50byggeyB4OiBkZXN0aW5hdGlvbi54LCB5OiBkZXN0aW5hdGlvbi55IH0sIDMqZGlmZiApXHJcbiAgICAgICAgICAgIC5lYXNpbmcoIFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IClcclxuICAgICAgICAgICAgLm9uU3RhcnQodGhpcy5vblNob3dTdGFydC5iaW5kKHRoaXMpKVxyXG4gICAgICAgICAgICAub25Db21wbGV0ZSh0aGlzLm9uU2hvd0NvbXBsZXRlLmJpbmQodGhpcykpXHJcbiAgICAgICAgICAgIC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvblNob3dDb21wbGV0ZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLm9uU2hvd1N0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNob3cgY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcclxuICovXHJcbkNhcmRWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdGlmKHRoaXMuY2FyZERhdGEuaXNTaG93bigpKSB7XHJcblx0XHR0aGlzLmJhY2sudmlzaWJsZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5mcmFtZS52aXNpYmxlID0gdHJ1ZTtcclxuXHR9XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvbGQuXHJcbiAqIEBtZXRob2QgZm9sZFxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLmZvbGQgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgbyA9IHtcclxuXHRcdHg6IHRoaXMudGFyZ2V0UG9zaXRpb24ueCxcclxuXHRcdHk6IHRoaXMudGFyZ2V0UG9zaXRpb24ueSs4MFxyXG5cdH07XHJcblxyXG5cdHZhciB0aW1lID0gNTAwOy8vIFNldHRpbmdzLmluc3RhbmNlLnNjYWxlQW5pbWF0aW9uVGltZSg1MDApO1xyXG5cdHRoaXMudDAgPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5wb3NpdGlvbilcclxuXHRcdFx0LnRvKG8sIHRpbWUpXHJcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXHJcblx0XHRcdC5vblVwZGF0ZSh0aGlzLm9uRm9sZFVwZGF0ZS5iaW5kKHRoaXMpKVxyXG5cdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uRm9sZENvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogRm9sZCBhbmltYXRpb24gdXBkYXRlLlxyXG4gKiBAbWV0aG9kIG9uRm9sZFVwZGF0ZVxyXG4gKi9cclxuQ2FyZFZpZXcucHJvdG90eXBlLm9uRm9sZFVwZGF0ZSA9IGZ1bmN0aW9uKHByb2dyZXNzKSB7XHJcblx0dGhpcy5tYXNrR3JhcGhpY3Muc2NhbGUueSA9IDEgLSBwcm9ncmVzcztcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvbGQgYW5pbWF0aW9uIGNvbXBsZXRlLlxyXG4gKiBAbWV0aG9kIG9uRm9sZENvbXBsZXRlXHJcbiAqL1xyXG5DYXJkVmlldy5wcm90b3R5cGUub25Gb2xkQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFNsaWRlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9TbGlkZXJcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgUGl4aVRleHRJbnB1dCA9IHJlcXVpcmUoXCJQaXhpVGV4dElucHV0XCIpO1xudmFyIE1vdXNlT3Zlckdyb3VwID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL01vdXNlT3Zlckdyb3VwXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogQ2hhdCB2aWV3LlxuICogQGNsYXNzIENoYXRWaWV3XG4gKi9cbmZ1bmN0aW9uIENoYXRWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLm1hcmdpbiA9IDU7XG5cblx0XG5cdHZhciBjaGF0UGxhdGUgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJmcmFtZVBsYXRlXCIpLCAxMCk7XG5cdGNoYXRQbGF0ZS5wb3NpdGlvbi54ID0gMTA7XG5cdGNoYXRQbGF0ZS5wb3NpdGlvbi55ID0gNTQwO1xuXHRjaGF0UGxhdGUuc2V0TG9jYWxTaXplKDMzMCwgMTMwKTtcblx0dGhpcy5hZGRDaGlsZChjaGF0UGxhdGUpO1xuXG5cdHZhciBzID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRzLnBvc2l0aW9uLnggPSAxMDtcblx0cy5wb3NpdGlvbi55ID0gNjc1O1xuXHRzLnNldExvY2FsU2l6ZSgzMzAsIDM1KTtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgc3R5bGVPYmplY3QgPSB7XG5cdFx0Zm9udDogXCIxMnB4IEFyaWFsXCIsXG5cdFx0d29yZFdyYXBXaWR0aDogMzEwLFxuXHRcdGhlaWdodDogMTE0LFxuXHRcdGJvcmRlcjogdHJ1ZSxcblx0XHRjb2xvcjogMHhGRkZGRkYsXG5cdFx0Ym9yZGVyQ29sb3I6IDB4NDA0MDQwLFxuXHRcdHdvcmRXcmFwOiB0cnVlLFxuXHRcdG11bHRpbGluZTogdHJ1ZVxuXHR9O1xuXG5cdHRoaXMuY29udGFpbmVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY29udGFpbmVyKTtcblx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueCA9IDIwO1xuXHR0aGlzLmNvbnRhaW5lci5wb3NpdGlvbi55ID0gNTQ4O1xuXG5cdHRoaXMuY2hhdE1hc2sgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmNoYXRNYXNrLmJlZ2luRmlsbCgxMjMpO1xuXHR0aGlzLmNoYXRNYXNrLmRyYXdSZWN0KDAsIDAsIDMxMCwgMTE0KTtcblx0dGhpcy5jaGF0TWFzay5lbmRGaWxsKCk7XG5cdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuY2hhdE1hc2spO1xuXG5cdHRoaXMuY2hhdFRleHQgPSBuZXcgUElYSS5UZXh0KFwiXCIsIHN0eWxlT2JqZWN0KTtcblx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGhpcy5jaGF0VGV4dCk7XG5cdHRoaXMuY2hhdFRleHQubWFzayA9IHRoaXMuY2hhdE1hc2s7XG5cblxuXG5cdHZhciBzdHlsZU9iamVjdCA9IHtcblx0XHRmb250OiBcIjE0cHggQXJpYWxcIixcblx0XHR3aWR0aDogMzEwLFxuXHRcdGhlaWdodDogMTksXG5cdFx0Ym9yZGVyOiB0cnVlLFxuXHRcdGJvcmRlckNvbG9yOiAweDQwNDA0MCxcblx0XHRiYWNrZ3JvdW5kOiB0cnVlLFxuXHRcdG11bHRpbGluZTogdHJ1ZVxuXHR9O1xuXHR0aGlzLmlucHV0RmllbGQgPSBuZXcgUGl4aVRleHRJbnB1dChcIlwiLCBzdHlsZU9iamVjdCk7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi54ID0gdGhpcy5jb250YWluZXIucG9zaXRpb24ueDtcblx0dGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnkgPSA2ODM7XG5cdHRoaXMuaW5wdXRGaWVsZC53aWR0aCA9IDMxMDtcblx0dGhpcy5pbnB1dEZpZWxkLmtleWRvd24gPSB0aGlzLm9uS2V5RG93bi5iaW5kKHRoaXMpO1xuXG5cdHZhciBpbnB1dFNoYWRvdyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdGlucHV0U2hhZG93LmJlZ2luRmlsbCgweDAwMDAwMCk7XG5cdGlucHV0U2hhZG93LmRyYXdSZWN0KC0xLCAtMSwgMzExLCAyMCk7XG5cdGlucHV0U2hhZG93LnBvc2l0aW9uLnggPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueDtcblx0aW5wdXRTaGFkb3cucG9zaXRpb24ueSA9IHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55O1xuXHR0aGlzLmFkZENoaWxkKGlucHV0U2hhZG93KTtcblxuXHR2YXIgaW5wdXRCYWNrZ3JvdW5kID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0aW5wdXRCYWNrZ3JvdW5kLmJlZ2luRmlsbCgweEZGRkZGRik7XG5cdGlucHV0QmFja2dyb3VuZC5kcmF3UmVjdCgwLCAwLCAzMTAsIDE5KTtcblx0aW5wdXRCYWNrZ3JvdW5kLnBvc2l0aW9uLnggPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueDtcblx0aW5wdXRCYWNrZ3JvdW5kLnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0dGhpcy5hZGRDaGlsZChpbnB1dEJhY2tncm91bmQpO1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5pbnB1dEZpZWxkKTtcblxuXG5cblx0dmFyIHNsaWRlQmFjayA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRleHRTY3JvbGxiYXJUcmFja1wiKSwgMTAsIDAsIDEwLCAwKTtcblx0c2xpZGVCYWNrLndpZHRoID0gMTA3O1xuXHR2YXIgc2xpZGVLbm9iID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwidGV4dFNjcm9sbGJhclRodW1iXCIpLCAxMCwgMCwgMTAsIDApO1xuXHRzbGlkZUtub2Iud2lkdGggPSAzMDtcblxuXG5cdHRoaXMuc2xpZGVyID0gbmV3IFNsaWRlcihzbGlkZUJhY2ssIHNsaWRlS25vYik7XG5cdHRoaXMuc2xpZGVyLnJvdGF0aW9uID0gTWF0aC5QSSowLjU7XG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnggPSAzMjY7XG5cdHRoaXMuc2xpZGVyLnBvc2l0aW9uLnkgPSA1NTI7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xuXHR0aGlzLnNsaWRlci52aXNpYmxlID0gZmFsc2U7XG5cdHRoaXMuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vblNsaWRlckNoYW5nZS5iaW5kKHRoaXMpKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNsaWRlcik7XG5cblxuXHR0aGlzLm1vdXNlT3Zlckdyb3VwID0gbmV3IE1vdXNlT3Zlckdyb3VwKCk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLmNoYXRUZXh0KTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KHRoaXMuc2xpZGVyKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KHRoaXMuY2hhdE1hc2spO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZERpc3BsYXlPYmplY3QoY2hhdFBsYXRlKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdmVyXCIsIHRoaXMub25DaGF0RmllbGRNb3VzZU92ZXIsIHRoaXMpO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCB0aGlzLm9uQ2hhdEZpZWxkTW91c2VPdXQsIHRoaXMpO1xuXG5cdHRoaXMuY2xlYXIoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChDaGF0VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KENoYXRWaWV3KTtcblxuXG5cbi8qKlxuICogQ2xlYXIgbWVzc2FnZXMuXG4gKiBAbWV0aG9kIGNsZWFyXG4gKi9cbkNoYXRWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNoYXRUZXh0LnNldFRleHQoXCJcIik7XG4gXHR0aGlzLmNoYXRUZXh0LnkgPSAtTWF0aC5yb3VuZCh0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKih0aGlzLmNoYXRUZXh0LmhlaWdodCArIHRoaXMubWFyZ2luIC0gdGhpcy5jaGF0TWFzay5oZWlnaHQgKSk7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xufVxuXG5cbi8qKlxuICogIEFkZCB0ZXh0LlxuICogQG1ldGhvZCBjbGVhclxuICovXG5DaGF0Vmlldy5wcm90b3R5cGUuYWRkVGV4dCA9IGZ1bmN0aW9uKHVzZXIsIHRleHQpIHtcblx0dGhpcy5jaGF0VGV4dC5zZXRUZXh0KHRoaXMuY2hhdFRleHQudGV4dCArIHVzZXIgKyBcIjogXCIgKyB0ZXh0ICsgXCJcXG5cIik7XG4gXHR0aGlzLmNoYXRUZXh0LnkgPSAtTWF0aC5yb3VuZCh0aGlzLnNsaWRlci5nZXRWYWx1ZSgpKih0aGlzLmNoYXRUZXh0LmhlaWdodCArIHRoaXMubWFyZ2luIC0gdGhpcy5jaGF0TWFzay5oZWlnaHQgKSk7XG5cdHRoaXMuc2xpZGVyLnNldFZhbHVlKDEpO1xufVxuXG4vKipcbiAqIE9uIHNsaWRlciB2YWx1ZSBjaGFuZ2VcbiAqIEBtZXRob2Qgb25TbGlkZXJDaGFuZ2VcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vblNsaWRlckNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0KSk7XG4gfVxuXG5cbi8qKlxuICogT24gbW91c2Ugb3ZlclxuICogQG1ldGhvZCBvbkNoYXRGaWVsZE1vdXNlT3ZlclxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uQ2hhdEZpZWxkTW91c2VPdmVyID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2xpZGVyLnNob3coKTtcbiB9XG5cblxuLyoqXG4gKiBPbiBtb3VzZSBvdXRcbiAqIEBtZXRob2Qgb25DaGF0RmllbGRNb3VzZU91dFxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uQ2hhdEZpZWxkTW91c2VPdXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zbGlkZXIuaGlkZSgpO1xuIH1cblxuXG4vKipcbiAqIE9uIGtleSBkb3duXG4gKiBAbWV0aG9kIG9uS2V5RG93blxuICovXG4gQ2hhdFZpZXcucHJvdG90eXBlLm9uS2V5RG93biA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdGlmKGV2ZW50LmtleUNvZGUgPT0gMTMpIHtcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGF0XCIsIHRoaXMuaW5wdXRGaWVsZC50ZXh0KTtcblx0XHRcblx0XHR0aGlzLmlucHV0RmllbGQuc2V0VGV4dChcIlwiKTtcblx0XHRcblx0fVxuIH1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdFZpZXc7XG4iLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XHJcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xyXG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XHJcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xyXG5cclxuXHJcblxyXG4vKipcclxuICogQSBjaGlwcyB2aWV3LlxyXG4gKiBAY2xhc3MgQ2hpcHNWaWV3XHJcbiAqL1xyXG5mdW5jdGlvbiBDaGlwc1ZpZXcoc2hvd1Rvb2xUaXApIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gbnVsbDtcclxuXHJcblx0dGhpcy5hbGlnbiA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkxlZnQ7XHJcblxyXG5cdHRoaXMudmFsdWUgPSAwO1xyXG5cclxuXHR0aGlzLmRlbm9taW5hdGlvbnMgPSBbNTAwMDAwLDEwMDAwMCwyNTAwMCw1MDAwLDEwMDAsNTAwLDEwMCwyNSw1LDFdO1xyXG5cclxuXHR0aGlzLnN0YWNrQ2xpcHMgPSBuZXcgQXJyYXkoKTtcclxuXHR0aGlzLmhvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcclxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaG9sZGVyKTtcclxuXHJcblx0dGhpcy50b29sVGlwID0gbnVsbDtcclxuXHJcblx0aWYoc2hvd1Rvb2xUaXApIHtcclxuXHRcdHRoaXMudG9vbFRpcCA9IG5ldyBUb29sVGlwKCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMudG9vbFRpcCk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuRnVuY3Rpb25VdGlsLmV4dGVuZChDaGlwc1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KENoaXBzVmlldyk7XHJcblxyXG4vKipcclxuICogU2V0IGFsaWdubWVudC5cclxuICogQG1ldGhvZCBzZXRDYXJkRGF0YVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5zZXRBbGlnbm1lbnQgPSBmdW5jdGlvbihhbGlnbikge1xyXG5cdHRoaXMuYWxpZ24gPSBhbGlnbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCB0YXJnZXQgcG9zaXRpb24uXHJcbiAqIEBtZXRob2Qgc2V0VGFyZ2V0UG9zaXRpb25cclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0VGFyZ2V0UG9zaXRpb24gPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG5cdHRoaXMudGFyZ2V0UG9zaXRpb24gPSBwb3NpdGlvbjtcclxuXHR0aGlzLnBvc2l0aW9uLnggPSBwb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHBvc2l0aW9uLnk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgdmFsdWUuXHJcbiAqIEBtZXRob2Qgc2V0VmFsdWVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuXHJcblx0dmFyIHNwcml0ZTtcclxuXHJcblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc3RhY2tDbGlwcy5sZW5ndGg7IGkrKylcclxuXHRcdHRoaXMuaG9sZGVyLnJlbW92ZUNoaWxkKHRoaXMuc3RhY2tDbGlwc1tpXSk7XHJcblxyXG5cdHRoaXMuc3RhY2tDbGlwcyA9IG5ldyBBcnJheSgpO1xyXG5cclxuXHRpZiAodGhpcy50b29sVGlwIT1udWxsKVxyXG5cdFx0dGhpcy50b29sVGlwLnRleHQgPSBcIkJldDogXCIrIHRoaXMudmFsdWUudG9TdHJpbmcoKTtcclxuXHJcblx0dmFyIGk7XHJcblx0dmFyIHN0YWNrQ2xpcCA9IG51bGw7XHJcblx0dmFyIHN0YWNrUG9zID0gMDtcclxuXHR2YXIgY2hpcFBvcyA9IDA7XHJcblx0dmFyIHRleHR1cmVzID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZXMoXCJjaGlwc1wiKTtcclxuXHJcblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuZGVub21pbmF0aW9ucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0dmFyIGRlbm9taW5hdGlvbiA9IHRoaXMuZGVub21pbmF0aW9uc1tpXTtcclxuXHJcblx0XHRjaGlwUG9zPTA7XHJcblx0XHRzdGFja0NsaXA9bnVsbDtcclxuXHRcdHdoaWxlKHZhbHVlID49IGRlbm9taW5hdGlvbikge1xyXG5cdFx0XHRpZiAoc3RhY2tDbGlwID09IG51bGwpIHtcclxuXHRcdFx0XHRzdGFja0NsaXAgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XHJcblx0XHRcdFx0c3RhY2tDbGlwLnggPSBzdGFja1BvcztcclxuXHRcdFx0XHRzdGFja1BvcyArPSA0MDtcclxuXHRcdFx0XHR0aGlzLmhvbGRlci5hZGRDaGlsZChzdGFja0NsaXApO1xyXG5cdFx0XHRcdHRoaXMuc3RhY2tDbGlwcy5wdXNoKHN0YWNrQ2xpcCk7XHJcblx0XHRcdH1cclxuXHRcdCAgIFx0dmFyIHRleHR1cmUgPSB0ZXh0dXJlc1tpJXRleHR1cmVzLmxlbmd0aF07XHJcblx0XHRcdHZhciBjaGlwID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpO1xyXG5cdFx0XHRjaGlwLnBvc2l0aW9uLnkgPSBjaGlwUG9zO1xyXG5cdFx0XHRjaGlwUG9zIC09IDU7XHJcblx0XHRcdHN0YWNrQ2xpcC5hZGRDaGlsZChjaGlwKTtcclxuXHRcdFx0dmFsdWUgLT0gZGVub21pbmF0aW9uO1xyXG5cclxuXHRcdFx0dmFyIGRlbm9taW5hdGlvblN0cmluZztcclxuXHJcblx0XHRcdGlmKGRlbm9taW5hdGlvbiA+PSAxMDAwKVxyXG5cdFx0XHRcdGRlbm9taW5hdGlvblN0cmluZyA9IE1hdGgucm91bmQoZGVub21pbmF0aW9uIC8gMTAwMCkgKyBcIktcIjtcclxuXHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRkZW5vbWluYXRpb25TdHJpbmcgPSBkZW5vbWluYXRpb247XHJcblxyXG5cdFx0XHRpZigoc3RhY2tDbGlwICE9IG51bGwpICYmICh2YWx1ZSA8IGRlbm9taW5hdGlvbikpIHtcclxuXHJcblx0XHRcdFx0dmFyIHRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoZGVub21pbmF0aW9uU3RyaW5nLCB7XHJcblx0XHRcdFx0XHRmb250OiBcImJvbGQgMTJweCBBcmlhbFwiLFxyXG5cdFx0XHRcdFx0YWxpZ246IFwiY2VudGVyXCIsXHJcblx0XHRcdFx0XHRmaWxsOiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRWYWx1ZShcImNoaXBzQ29sb3JzXCIpW2klUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VmFsdWUoXCJjaGlwc0NvbG9yc1wiKS5sZW5ndGhdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnggPSAoc3RhY2tDbGlwLndpZHRoIC0gdGV4dEZpZWxkLndpZHRoKSowLjU7XHJcblx0XHRcdFx0dGV4dEZpZWxkLnBvc2l0aW9uLnkgPSBjaGlwUG9zICsgMTE7XHJcblx0XHRcdFx0dGV4dEZpZWxkLmFscGhhID0gMC41O1xyXG5cdFx0XHRcdC8qXHJcblx0XHRcdFx0dGV4dEZpZWxkLndpZHRoID0gc3RhY2tDbGlwLndpZHRoIC0gMTtcclxuXHRcdFx0XHR0ZXh0RmllbGQuaGVpZ2h0ID0gMjA7Ki9cclxuXHJcblx0XHRcdFx0c3RhY2tDbGlwLmFkZENoaWxkKHRleHRGaWVsZCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHN3aXRjaCAodGhpcy5hbGlnbikge1xyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MRUZUOiB7XHJcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAwO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjoge1xyXG5cdFx0XHR0aGlzLmhvbGRlci54ID0gLXRoaXMuaG9sZGVyLndpZHRoIC8gMjtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5SSUdIVDpcclxuXHRcdFx0dGhpcy5ob2xkZXIueCA9IC10aGlzLmhvbGRlci53aWR0aDtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIaWRlLlxyXG4gKiBAbWV0aG9kIGhpZGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdy5cclxuICogQG1ldGhvZCBzaG93XHJcbiAqL1xyXG5DaGlwc1ZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xyXG5cclxuXHR2YXIgZGVzdGluYXRpb24gPSB7eDogdGhpcy50YXJnZXRQb3NpdGlvbi54LCB5OiB0aGlzLnRhcmdldFBvc2l0aW9uLnl9O1xyXG5cdHRoaXMucG9zaXRpb24ueCA9ICh0aGlzLnBhcmVudC53aWR0aCAtIHRoaXMud2lkdGgpKjAuNTtcclxuXHR0aGlzLnBvc2l0aW9uLnkgPSAtdGhpcy5oZWlnaHQ7XHJcblxyXG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XHJcblx0dmFyIGRpZmZZID0gdGhpcy5wb3NpdGlvbi55IC0gZGVzdGluYXRpb24ueTtcclxuXHR2YXIgZGlmZiA9IE1hdGguc3FydChkaWZmWCpkaWZmWCArIGRpZmZZKmRpZmZZKTtcclxuXHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKCB0aGlzLnBvc2l0aW9uIClcclxuICAgICAgICAgICAgLnRvKCB7IHg6IGRlc3RpbmF0aW9uLngsIHk6IGRlc3RpbmF0aW9uLnkgfSwgMypkaWZmIClcclxuICAgICAgICAgICAgLmVhc2luZyggVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgKVxyXG4gICAgICAgICAgICAub25Db21wbGV0ZSh0aGlzLm9uU2hvd0NvbXBsZXRlLmJpbmQodGhpcykpXHJcbiAgICAgICAgICAgIC5zdGFydCgpO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdyBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvblNob3dDb21wbGV0ZVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFxyXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbmltYXRlIGluLlxyXG4gKiBAbWV0aG9kIGFuaW1hdGVJblxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5hbmltYXRlSW4gPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgbyA9IHtcclxuXHRcdHk6IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueVxyXG5cdH07XHJcblxyXG5cdHN3aXRjaCAodGhpcy5hbGlnbikge1xyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MRUZUOlxyXG5cdFx0XHRvLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLngtd2lkdGgvMjtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjpcclxuXHRcdFx0by54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54O1xyXG5cclxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uUklHSFQ6XHJcblx0XHRcdG8ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueCt3aWR0aC8yO1xyXG5cdH1cclxuXHJcblx0dmFyIHRpbWUgPSA1MDA7XHJcblx0dmFyIHR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMpXHJcblx0XHRcdFx0XHQudG8oeyB5OiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnkgfSwgdGltZSlcclxuXHRcdFx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25JbkFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluIGFuaW1hdGlvbiBjb21wbGV0ZS5cclxuICogQG1ldGhvZCBvbkluQW5pbWF0aW9uQ29tcGxldGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUub25JbkFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5zZXRWYWx1ZSgwKTtcclxuXHJcblx0dGhpcy5wb3NpdGlvbi54ID0gdGhpcy50YXJnZXRQb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcclxuXHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFuaW1hdGUgb3V0LlxyXG4gKiBAbWV0aG9kIGFuaW1hdGVPdXRcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUuYW5pbWF0ZU91dCA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueTtcclxuXHJcblx0c3dpdGNoICh0aGlzLmFsaWduKSB7XHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkxFRlQ6XHJcblx0XHRcdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueCAtIHdpZHRoLzI7XHJcblxyXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5DRU5URVI6XHJcblx0XHRcdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueDtcclxuXHJcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLlJJR0hUOlxyXG5cdFx0XHR0aGlzLnBvc2l0aW9uLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnggKyB3aWR0aC8yO1xyXG5cdH1cclxuXHJcblx0dmFyIG8gPSB7XHJcblx0XHR4OiB0aGlzLnRhcmdldFBvc2l0aW9uLngsXHJcblx0XHR5OiB0aGlzLnRhcmdldFBvc2l0aW9uLnlcclxuXHR9O1xyXG5cclxuXHR2YXIgdGltZSA9IDUwMDtcclxuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcclxuXHRcdFx0XHRcdC50byhvLCB0aW1lKVxyXG5cdFx0XHRcdFx0Lm9uQ29tcGxldGUodGhpcy5vbk91dEFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxuXHRcclxufVxyXG5cclxuLyoqXHJcbiAqIE91dCBhbmltYXRpb24gY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25PdXRBbmltYXRpb25Db21wbGV0ZVxyXG4gKi9cclxuQ2hpcHNWaWV3LnByb3RvdHlwZS5vbk91dEFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciB0aW1lID0gNTAwO1xyXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih7eDowfSlcclxuXHRcdFx0XHRcdC50byh7eDoxMH0sIHRpbWUpXHJcblx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uT3V0V2FpdEFuaW1hdGlvbkNvbXBsZXRlLmJpbmQodGhpcykpXHJcblx0XHRcdFx0XHQuc3RhcnQoKTtcclxuXHJcblx0dGhpcy5wb3NpdGlvbi54ID0gdGhpcy50YXJnZXRQb3NpdGlvbi54O1xyXG5cdHRoaXMucG9zaXRpb24ueSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBPdXQgd2FpdCBhbmltYXRpb24gY29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25PdXRXYWl0QW5pbWF0aW9uQ29tcGxldGVcclxuICovXHJcbkNoaXBzVmlldy5wcm90b3R5cGUub25PdXRXYWl0QW5pbWF0aW9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcclxuXHJcblx0dGhpcy5zZXRWYWx1ZSgwKTtcclxuXHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDaGlwc1ZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcclxudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xyXG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcclxudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xyXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBEaWFsb2cgdmlldy5cclxuICogQGNsYXNzIERlYWxlckJ1dHRvblZpZXdcclxuICovXHJcbmZ1bmN0aW9uIERlYWxlckJ1dHRvblZpZXcoKSB7XHJcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XHJcblxyXG5cclxuXHR2YXIgZGVhbGVyQnV0dG9uVGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJkZWFsZXJCdXR0b25cIik7XHJcblx0dGhpcy5zcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoZGVhbGVyQnV0dG9uVGV4dHVyZSk7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XHJcblx0dGhpcy5oaWRlKCk7XHJcbn1cclxuXHJcbkZ1bmN0aW9uVXRpbC5leHRlbmQoRGVhbGVyQnV0dG9uVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcclxuRXZlbnREaXNwYXRjaGVyLmluaXQoRGVhbGVyQnV0dG9uVmlldyk7XHJcblxyXG4vKipcclxuICogU2V0IHNlYXQgaW5kZXhcclxuICogQG1ldGhvZCBzZXRTZWF0SW5kZXhcclxuICovXHJcbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLnNldFNlYXRJbmRleCA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xyXG5cdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImRlYWxlckJ1dHRvblBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLng7XHJcblx0dGhpcy5wb3NpdGlvbi55ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiZGVhbGVyQnV0dG9uUG9zaXRpb25zXCIpW3NlYXRJbmRleF0ueTtcclxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFuaW1hdGUgdG8gc2VhdCBpbmRleC5cclxuICogQG1ldGhvZCBhbmltYXRlVG9TZWF0SW5kZXhcclxuICovXHJcbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLmFuaW1hdGVUb1NlYXRJbmRleCA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xyXG5cdGlmICghdGhpcy52aXNpYmxlKSB7XHJcblx0XHR0aGlzLnNldFNlYXRJbmRleChzZWF0SW5kZXgpO1xyXG5cdFx0Ly8gdG9kbyBkaXNwYXRjaCBldmVudCB0aGF0IGl0J3MgY29tcGxldGU/XHJcblx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHR2YXIgZGVzdGluYXRpb24gPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJkZWFsZXJCdXR0b25Qb3NpdGlvbnNcIilbc2VhdEluZGV4XTtcclxuXHR2YXIgZGlmZlggPSB0aGlzLnBvc2l0aW9uLnggLSBkZXN0aW5hdGlvbi54O1xyXG5cdHZhciBkaWZmWSA9IHRoaXMucG9zaXRpb24ueSAtIGRlc3RpbmF0aW9uLnk7XHJcblx0dmFyIGRpZmYgPSBNYXRoLnNxcnQoZGlmZlggKiBkaWZmWCArIGRpZmZZICogZGlmZlkpO1xyXG5cclxuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcy5wb3NpdGlvbilcclxuXHRcdC50byh7XHJcblx0XHRcdHg6IGRlc3RpbmF0aW9uLngsXHJcblx0XHRcdHk6IGRlc3RpbmF0aW9uLnlcclxuXHRcdH0sIDUgKiBkaWZmKVxyXG5cdFx0LmVhc2luZyhUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dClcclxuXHRcdC5vbkNvbXBsZXRlKHRoaXMub25TaG93Q29tcGxldGUuYmluZCh0aGlzKSlcclxuXHRcdC5zdGFydCgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNob3cgQ29tcGxldGUuXHJcbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcclxuICovXHJcbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLm9uU2hvd0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhpZGUuXHJcbiAqIEBtZXRob2QgaGlkZVxyXG4gKi9cclxuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xyXG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogU2hvdy5cclxuICogQG1ldGhvZCBzaG93XHJcbiAqL1xyXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oc2VhdEluZGV4LCBhbmltYXRlKSB7XHJcblx0aWYgKHRoaXMudmlzaWJsZSAmJiBhbmltYXRlKSB7XHJcblx0XHR0aGlzLmFuaW1hdGVUb1NlYXRJbmRleChzZWF0SW5kZXgpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR0aGlzLnZpc2libGUgPSB0cnVlO1xyXG5cdFx0dGhpcy5zZXRTZWF0SW5kZXgoc2VhdEluZGV4KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGVhbGVyQnV0dG9uVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcblxuLyoqXG4gKiBEaWFsb2cgYnV0dG9uLlxuICogQGNsYXNzIERpYWxvZ0J1dHRvblxuICovXG5mdW5jdGlvbiBEaWFsb2dCdXR0b24oKSB7XG5cdEJ1dHRvbi5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYnV0dG9uVGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJkaWFsb2dCdXR0b25cIik7XG5cdHRoaXMuYWRkQ2hpbGQobmV3IFBJWEkuU3ByaXRlKHRoaXMuYnV0dG9uVGV4dHVyZSkpO1xuXG5cdHZhciBzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxNHB4IEFyaWFsXCIsXG5cdFx0ZmlsbDogXCIjZmZmZmZmXCJcblx0fTtcblxuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdGVzdF1cIiwgc3R5bGUpO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gMTU7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xuXG5cdHRoaXMuc2V0VGV4dChcIkJUTlwiKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChEaWFsb2dCdXR0b24sIEJ1dHRvbik7XG5cbi8qKlxuICogU2V0IHRleHQgZm9yIHRoZSBidXR0b24uXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuRGlhbG9nQnV0dG9uLnByb3RvdHlwZS5zZXRUZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KHRleHQpO1xuXHR0aGlzLnRleHRGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy50ZXh0RmllbGQueCA9IHRoaXMuYnV0dG9uVGV4dHVyZS53aWR0aCAvIDIgLSB0aGlzLnRleHRGaWVsZC53aWR0aCAvIDI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlhbG9nQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIERpYWxvZ0J1dHRvbiA9IHJlcXVpcmUoXCIuL0RpYWxvZ0J1dHRvblwiKTtcbnZhciBCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL2RhdGEvQnV0dG9uRGF0YVwiKTtcbnZhciBQaXhpVGV4dElucHV0ID0gcmVxdWlyZShcIlBpeGlUZXh0SW5wdXRcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbi8qKlxuICogRGlhbG9nIHZpZXcuXG4gKiBAY2xhc3MgRGlhbG9nVmlld1xuICovXG5mdW5jdGlvbiBEaWFsb2dWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR2YXIgY292ZXIgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHRjb3Zlci5iZWdpbkZpbGwoMHgwMDAwMDAsIC41KTtcblx0Y292ZXIuZHJhd1JlY3QoMCwgMCwgOTYwLCA3MjApO1xuXHRjb3Zlci5lbmRGaWxsKCk7XG5cdGNvdmVyLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0Ly9jb3Zlci5idXR0b25Nb2RlID0gdHJ1ZTtcblx0Y292ZXIuaGl0QXJlYSA9IG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCA5NjAsIDcyMCk7XG5cdHRoaXMuYWRkQ2hpbGQoY292ZXIpO1xuXG5cdHZhciBiID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRiLnNldExvY2FsU2l6ZSg0ODAsIDI3MCk7XG5cdGIucG9zaXRpb24ueCA9IDQ4MCAtIDQ4MCAvIDI7XG5cdGIucG9zaXRpb24ueSA9IDM2MCAtIDI3MCAvIDI7XG5cdHRoaXMuYWRkQ2hpbGQoYik7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMTRweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy50ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3RleHRdXCIsIHN0eWxlKTtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueCA9IGIucG9zaXRpb24ueCArIDIwO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gYi5wb3NpdGlvbi55ICsgMjA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xuXG5cdHRoaXMuYnV0dG9uc0hvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5idXR0b25zSG9sZGVyLnBvc2l0aW9uLnkgPSA0MzA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25zSG9sZGVyKTtcblx0dGhpcy5idXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHtcblx0XHR2YXIgYiA9IG5ldyBEaWFsb2dCdXR0b24oKTtcblxuXHRcdGIucG9zaXRpb24ueCA9IGkgKiA5MDtcblx0XHRiLm9uKFwiY2xpY2tcIiwgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblx0XHR0aGlzLmJ1dHRvbnNIb2xkZXIuYWRkQ2hpbGQoYik7XG5cdFx0dGhpcy5idXR0b25zLnB1c2goYik7XG5cdH1cblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxOHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLmlucHV0RmllbGQgPSBuZXcgUGl4aVRleHRJbnB1dChcIlwiLCBzdHlsZSk7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi54ID0gdGhpcy50ZXh0RmllbGQucG9zaXRpb24ueDtcblxuXHR0aGlzLmlucHV0RnJhbWUgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmlucHV0RnJhbWUuYmVnaW5GaWxsKDB4MDAwMDAwKTtcblx0dGhpcy5pbnB1dEZyYW1lLmRyYXdSZWN0KC0xLCAtMSwgMTAyLCAyMyk7XG5cdHRoaXMuaW5wdXRGcmFtZS5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5pbnB1dEZyYW1lKTtcblxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaW5wdXRGaWVsZCk7XG5cblx0dGhpcy5oaWRlKCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoRGlhbG9nVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KERpYWxvZ1ZpZXcpO1xuXG5EaWFsb2dWaWV3LkJVVFRPTl9DTElDSyA9IFwiYnV0dG9uQ2xpY2tcIjtcblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cbkRpYWxvZ1ZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG59XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5EaWFsb2dWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24odGV4dCwgYnV0dG9uSWRzLCBkZWZhdWx0VmFsdWUpIHtcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblxuXHR0aGlzLmJ1dHRvbklkcyA9IGJ1dHRvbklkcztcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGkgPCBidXR0b25JZHMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgYnV0dG9uID0gdGhpcy5idXR0b25zW2ldXG5cdFx0XHRidXR0b24uc2V0VGV4dChCdXR0b25EYXRhLmdldEJ1dHRvblN0cmluZ0ZvcklkKGJ1dHRvbklkc1tpXSkpO1xuXHRcdFx0YnV0dG9uLnZpc2libGUgPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmJ1dHRvbnNbaV0udmlzaWJsZSA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuYnV0dG9uc0hvbGRlci54ID0gNDgwIC0gYnV0dG9uSWRzLmxlbmd0aCAqIDkwIC8gMjtcblx0dGhpcy50ZXh0RmllbGQuc2V0VGV4dCh0ZXh0KTtcblxuXHRpZiAoZGVmYXVsdFZhbHVlKSB7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnkgPSB0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ICsgdGhpcy50ZXh0RmllbGQuaGVpZ2h0ICsgMjA7XG5cdFx0dGhpcy5pbnB1dEZyYW1lLnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0XHR0aGlzLmlucHV0RmllbGQudmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy5pbnB1dEZyYW1lLnZpc2libGUgPSB0cnVlO1xuXG5cdFx0dGhpcy5pbnB1dEZpZWxkLnRleHQgPSBkZWZhdWx0VmFsdWU7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLmZvY3VzKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLmlucHV0RnJhbWUudmlzaWJsZSA9IGZhbHNlO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIGJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICovXG5EaWFsb2dWaWV3LnByb3RvdHlwZS5vbkJ1dHRvbkNsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgYnV0dG9uSW5kZXggPSAtMTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKylcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5idXR0b25zW2ldKVxuXHRcdFx0YnV0dG9uSW5kZXggPSBpO1xuXG5cdHZhciB2YWx1ZSA9IG51bGw7XG5cdGlmICh0aGlzLmlucHV0RmllbGQudmlzaWJsZSlcblx0XHR2YWx1ZSA9IHRoaXMuaW5wdXRGaWVsZC50ZXh0O1xuXG5cdHZhciBldiA9IHtcblx0XHR0eXBlOiBEaWFsb2dWaWV3LkJVVFRPTl9DTElDSyxcblx0XHRidXR0b246IHRoaXMuYnV0dG9uSWRzW2J1dHRvbkluZGV4XSxcblx0XHR2YWx1ZTogdmFsdWVcblx0fTtcblxuXHR0aGlzLnRyaWdnZXIoZXYpO1xuXHR0aGlzLmhpZGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaWFsb2dWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBHcmFkaWVudCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9HcmFkaWVudFwiKTtcblxuLyoqXG4gKiBMb2FkaW5nIHNjcmVlbi5cbiAqIEBjbGFzcyBMb2FkaW5nU2NyZWVuXG4gKi9cbmZ1bmN0aW9uIExvYWRpbmdTY3JlZW4oKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHZhciBncmFkaWVudCA9IG5ldyBHcmFkaWVudCgpO1xuXHRncmFkaWVudC5zZXRTaXplKDEwMCwgMTAwKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIFwiI2ZmZmZmZlwiKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIFwiI2MwYzBjMFwiKTtcblxuXHR2YXIgcyA9IGdyYWRpZW50LmNyZWF0ZVNwcml0ZSgpO1xuXHRzLndpZHRoID0gOTYwO1xuXHRzLmhlaWdodCA9IDcyMDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDIwcHggQXJpYWxcIixcblx0XHRmaWxsOiBcIiM4MDgwODBcIlxuXHR9O1xuXG5cdHRoaXMudGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt0ZXh0XVwiLCBzdHlsZSk7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnggPSA5NjAgLyAyO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gNzIwIC8gMiAtIHRoaXMudGV4dEZpZWxkLmhlaWdodCAvIDI7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKExvYWRpbmdTY3JlZW4sIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5Mb2FkaW5nU2NyZWVuLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KG1lc3NhZ2UpO1xuXHR0aGlzLnRleHRGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy50ZXh0RmllbGQueCA9IDk2MCAvIDIgLSB0aGlzLnRleHRGaWVsZC53aWR0aCAvIDI7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5Mb2FkaW5nU2NyZWVuLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRpbmdTY3JlZW47IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgU2VhdFZpZXcgPSByZXF1aXJlKFwiLi9TZWF0Vmlld1wiKTtcbnZhciBDYXJkVmlldyA9IHJlcXVpcmUoXCIuL0NhcmRWaWV3XCIpO1xudmFyIENoYXRWaWV3ID0gcmVxdWlyZShcIi4vQ2hhdFZpZXdcIik7XG52YXIgUG9pbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvUG9pbnRcIik7XG52YXIgR3JhZGllbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvR3JhZGllbnRcIik7XG52YXIgQnV0dG9uc1ZpZXcgPSByZXF1aXJlKFwiLi9CdXR0b25zVmlld1wiKTtcbnZhciBEaWFsb2dWaWV3ID0gcmVxdWlyZShcIi4vRGlhbG9nVmlld1wiKTtcbnZhciBEZWFsZXJCdXR0b25WaWV3ID0gcmVxdWlyZShcIi4vRGVhbGVyQnV0dG9uVmlld1wiKTtcbnZhciBDaGlwc1ZpZXcgPSByZXF1aXJlKFwiLi9DaGlwc1ZpZXdcIik7XG52YXIgUG90VmlldyA9IHJlcXVpcmUoXCIuL1BvdFZpZXdcIik7XG52YXIgVGltZXJWaWV3ID0gcmVxdWlyZShcIi4vVGltZXJWaWV3XCIpO1xudmFyIFNldHRpbmdzVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L1NldHRpbmdzVmlld1wiKTtcbnZhciBUYWJsZUluZm9WaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvVGFibGVJbmZvVmlld1wiKTtcblxuLyoqXG4gKiBOZXQgcG9rZXIgY2xpZW50IHZpZXcuXG4gKiBAY2xhc3MgTmV0UG9rZXJDbGllbnRWaWV3XG4gKi9cbmZ1bmN0aW9uIE5ldFBva2VyQ2xpZW50VmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5zZXR1cEJhY2tncm91bmQoKTtcblxuXHR0aGlzLnRhYmxlQ29udGFpbmVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGFibGVDb250YWluZXIpO1xuXG5cdHRoaXMudGFibGVCYWNrZ3JvdW5kID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0YWJsZUJhY2tncm91bmRcIikpO1xuXHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKHRoaXMudGFibGVCYWNrZ3JvdW5kKTtcblxuXHR0aGlzLnNldHVwU2VhdHMoKTtcblx0dGhpcy5zZXR1cENvbW11bml0eUNhcmRzKCk7XG5cblx0dGhpcy50aW1lclZpZXcgPSBuZXcgVGltZXJWaWV3KCk7XG5cdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQodGhpcy50aW1lclZpZXcpO1xuXG5cdHRoaXMuY2hhdFZpZXcgPSBuZXcgQ2hhdFZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoYXRWaWV3KTtcblxuXHR0aGlzLmJ1dHRvbnNWaWV3ID0gbmV3IEJ1dHRvbnNWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25zVmlldyk7XG5cblx0dGhpcy5kZWFsZXJCdXR0b25WaWV3ID0gbmV3IERlYWxlckJ1dHRvblZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmRlYWxlckJ1dHRvblZpZXcpO1xuXG5cdHRoaXMudGFibGVJbmZvVmlldyA9IG5ldyBUYWJsZUluZm9WaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50YWJsZUluZm9WaWV3KTtcblxuXHR0aGlzLnBvdFZpZXcgPSBuZXcgUG90VmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMucG90Vmlldyk7XG5cdHRoaXMucG90Vmlldy5wb3NpdGlvbi54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54O1xuXHR0aGlzLnBvdFZpZXcucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueTtcblxuXHR0aGlzLnNldHRpbmdzVmlldyA9IG5ldyBTZXR0aW5nc1ZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNldHRpbmdzVmlldyk7XG5cblx0dGhpcy5kaWFsb2dWaWV3ID0gbmV3IERpYWxvZ1ZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmRpYWxvZ1ZpZXcpO1xuXG5cdHRoaXMuc2V0dXBDaGlwcygpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE5ldFBva2VyQ2xpZW50VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KE5ldFBva2VyQ2xpZW50Vmlldyk7XG5cbk5ldFBva2VyQ2xpZW50Vmlldy5TRUFUX0NMSUNLID0gXCJzZWF0Q2xpY2tcIjtcblxuLyoqXG4gKiBTZXR1cCBiYWNrZ3JvdW5kLlxuICogQG1ldGhvZCBzZXR1cEJhY2tncm91bmRcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cEJhY2tncm91bmQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGdyYWRpZW50ID0gbmV3IEdyYWRpZW50KCk7XG5cdGdyYWRpZW50LnNldFNpemUoMTAwLCAxMDApO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoMCwgXCIjNjA2MDYwXCIpO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoLjUsIFwiI2EwYTBhMFwiKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIFwiIzkwOTA5MFwiKTtcblxuXHR2YXIgcyA9IGdyYWRpZW50LmNyZWF0ZVNwcml0ZSgpO1xuXHRzLndpZHRoID0gOTYwO1xuXHRzLmhlaWdodCA9IDcyMDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGl2aWRlckxpbmVcIikpO1xuXHRzLnggPSAzNDU7XG5cdHMueSA9IDU0MDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGl2aWRlckxpbmVcIikpO1xuXHRzLnggPSA2OTM7XG5cdHMueSA9IDU0MDtcblx0dGhpcy5hZGRDaGlsZChzKTtcbn1cblxuLyoqXG4gKiBTZXR1cCBzZWF0cy5cbiAqIEBtZXRob2Qgc2VydXBTZWF0c1xuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLnNldHVwU2VhdHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGksIGo7XG5cdHZhciBwb2NrZXRDYXJkcztcblxuXHR0aGlzLnNlYXRWaWV3cyA9IFtdO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJzZWF0UG9zaXRpb25zXCIpLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHNlYXRWaWV3ID0gbmV3IFNlYXRWaWV3KGkpO1xuXHRcdHZhciBwID0gc2VhdFZpZXcucG9zaXRpb247XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgMjsgaisrKSB7XG5cdFx0XHR2YXIgYyA9IG5ldyBDYXJkVmlldygpO1xuXHRcdFx0Yy5oaWRlKCk7XG5cdFx0XHRjLnNldFRhcmdldFBvc2l0aW9uKFBvaW50KHAueCArIGogKiAzMCAtIDYwLCBwLnkgLSAxMDApKTtcblx0XHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoYyk7XG5cdFx0XHRzZWF0Vmlldy5hZGRQb2NrZXRDYXJkKGMpO1xuXHRcdFx0c2VhdFZpZXcub24oXCJjbGlja1wiLCB0aGlzLm9uU2VhdENsaWNrLCB0aGlzKTtcblx0XHR9XG5cblx0XHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKHNlYXRWaWV3KTtcblx0XHR0aGlzLnNlYXRWaWV3cy5wdXNoKHNlYXRWaWV3KTtcblx0fVxufVxuXG4vKipcbiAqIFNldHVwIGNoaXBzLlxuICogQG1ldGhvZCBzZXJ1cFNlYXRzXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuc2V0dXBDaGlwcyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaTtcblx0Zm9yIChpID0gMDsgaSA8IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImJldFBvc2l0aW9uc1wiKS5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjaGlwc1ZpZXcgPSBuZXcgQ2hpcHNWaWV3KCk7XG5cdFx0dGhpcy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMgPSBjaGlwc1ZpZXc7XG5cblx0XHRjaGlwc1ZpZXcuc2V0QWxpZ25tZW50KFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFZhbHVlKFwiYmV0QWxpZ25cIilbaV0pO1xuXHRcdGNoaXBzVmlldy5zZXRUYXJnZXRQb3NpdGlvbihSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJiZXRQb3NpdGlvbnNcIilbaV0pO1xuXHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoY2hpcHNWaWV3KTtcblx0fVxufVxuXG4vKipcbiAqIFNlYXQgY2xpY2suXG4gKiBAbWV0aG9kIG9uU2VhdENsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLm9uU2VhdENsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgc2VhdEluZGV4ID0gLTE7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNlYXRWaWV3cy5sZW5ndGg7IGkrKylcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5zZWF0Vmlld3NbaV0pXG5cdFx0XHRzZWF0SW5kZXggPSBpO1xuXG5cdGNvbnNvbGUubG9nKFwic2VhdCBjbGljazogXCIgKyBzZWF0SW5kZXgpO1xuXHR0aGlzLnRyaWdnZXIoe1xuXHRcdHR5cGU6IE5ldFBva2VyQ2xpZW50Vmlldy5TRUFUX0NMSUNLLFxuXHRcdHNlYXRJbmRleDogc2VhdEluZGV4XG5cdH0pO1xufVxuXG4vKipcbiAqIFNldHVwIGNvbW11bml0eSBjYXJkcy5cbiAqIEBtZXRob2Qgc2V0dXBDb21tdW5pdHlDYXJkc1xuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cENvbW11bml0eUNhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29tbXVuaXR5Q2FyZHMgPSBbXTtcblxuXHR2YXIgcCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwiY29tbXVuaXR5Q2FyZHNQb3NpdGlvblwiKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgNTsgaSsrKSB7XG5cdFx0dmFyIGNhcmRWaWV3ID0gbmV3IENhcmRWaWV3KCk7XG5cdFx0Y2FyZFZpZXcuaGlkZSgpO1xuXHRcdGNhcmRWaWV3LnNldFRhcmdldFBvc2l0aW9uKFBvaW50KHAueCArIGkgKiA5MCwgcC55KSk7XG5cblx0XHR0aGlzLmNvbW11bml0eUNhcmRzLnB1c2goY2FyZFZpZXcpO1xuXHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoY2FyZFZpZXcpO1xuXHR9XG59XG5cbi8qKlxuICogR2V0IHNlYXQgdmlldyBieSBpbmRleC5cbiAqIEBtZXRob2QgZ2V0U2VhdFZpZXdCeUluZGV4XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0U2VhdFZpZXdCeUluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0cmV0dXJuIHRoaXMuc2VhdFZpZXdzW2luZGV4XTtcbn1cblxuLyoqXG4gKiBHZXQgc2VhdCB2aWV3IGJ5IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0Vmlld0J5SW5kZXhcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRDb21tdW5pdHlDYXJkcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb21tdW5pdHlDYXJkcztcbn1cblxuLyoqXG4gKiBHZXQgYnV0dG9ucyB2aWV3LlxuICogQG1ldGhvZCBnZXRTZWF0Vmlld0J5SW5kZXhcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRCdXR0b25zVmlldyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b25zVmlldztcbn1cblxuLyoqXG4gKiBHZXQgZGlhbG9nIHZpZXcuXG4gKiBAbWV0aG9kIGdldERpYWxvZ1ZpZXdcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXREaWFsb2dWaWV3ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRpYWxvZ1ZpZXc7XG59XG5cbi8qKlxuICogR2V0IGRpYWxvZyB2aWV3LlxuICogQG1ldGhvZCBnZXREZWFsZXJCdXR0b25WaWV3XG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuZ2V0RGVhbGVyQnV0dG9uVmlldyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWFsZXJCdXR0b25WaWV3O1xufVxuXG4vKipcbiAqIEdldCB0YWJsZSBpbmZvIHZpZXcuXG4gKiBAbWV0aG9kIGdldFRhYmxlSW5mb1ZpZXdcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRUYWJsZUluZm9WaWV3ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSW5mb1ZpZXc7XG59XG5cbi8qKlxuICogQ2xlYXIgZXZlcnl0aGluZyB0byBhbiBlbXB0eSBzdGF0ZS5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5jb21tdW5pdHlDYXJkcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmNvbW11bml0eUNhcmRzW2ldLmhpZGUoKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5zZWF0Vmlld3NbaV0uY2xlYXIoKTtcblxuXHR0aGlzLnRpbWVyVmlldy5oaWRlKCk7XG5cdHRoaXMucG90Vmlldy5zZXRWYWx1ZXMobmV3IEFycmF5KCkpO1xuXHR0aGlzLmRlYWxlckJ1dHRvblZpZXcuaGlkZSgpO1xuXHR0aGlzLmNoYXRWaWV3LmNsZWFyKCk7XG5cblx0dGhpcy5kaWFsb2dWaWV3LmhpZGUoKTtcblx0dGhpcy5idXR0b25zVmlldy5jbGVhcigpO1xuXG5cdHRoaXMudGFibGVJbmZvVmlldy5jbGVhcigpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5ldFBva2VyQ2xpZW50VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBDaGlwc1ZpZXcgPSByZXF1aXJlKFwiLi9DaGlwc1ZpZXdcIik7XG5cblxuXG4vKipcbiAqIEEgcG90IHZpZXdcbiAqIEBjbGFzcyBQb3RWaWV3XG4gKi9cbmZ1bmN0aW9uIFBvdFZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXHRcblx0dGhpcy52YWx1ZSA9IDA7XG5cblx0dGhpcy5ob2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5ob2xkZXIpO1xuXG5cdHRoaXMuc3RhY2tzID0gbmV3IEFycmF5KCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoUG90VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFBvdFZpZXcpO1xuXG4vKipcbiAqIFNldCB2YWx1ZS5cbiAqIEBtZXRob2Qgc2V0VmFsdWVcbiAqL1xuUG90Vmlldy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24odmFsdWVzKSB7XG5cdFxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5zdGFja3MubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5ob2xkZXIucmVtb3ZlQ2hpbGQodGhpcy5zdGFja3NbaV0pO1xuXG5cdHRoaXMuc3RhY2tzID0gbmV3IEFycmF5KCk7XG5cblx0dmFyIHBvcyA9IDA7XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjaGlwcyA9IG5ldyBDaGlwc1ZpZXcoZmFsc2UpO1xuXHRcdHRoaXMuc3RhY2tzLnB1c2goY2hpcHMpO1xuXHRcdHRoaXMuaG9sZGVyLmFkZENoaWxkKGNoaXBzKTtcblx0XHRjaGlwcy5zZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuXHRcdGNoaXBzLnggPSBwb3M7XG5cdFx0cG9zICs9IE1hdGguZmxvb3IoY2hpcHMud2lkdGggKyAyMCk7XG5cblx0XHR2YXIgdGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dCh2YWx1ZXNbaV0sIHtcblx0XHRcdGZvbnQ6IFwiYm9sZCAxMnB4IEFyaWFsXCIsXG5cdFx0XHRhbGlnbjogXCJjZW50ZXJcIixcblx0XHRcdGZpbGw6IFwiI2ZmZmZmZlwiXG5cdFx0fSk7XG5cblx0XHR0ZXh0RmllbGQucG9zaXRpb24ueCA9IChjaGlwcy53aWR0aCAtIHRleHRGaWVsZC53aWR0aCkqMC41O1xuXHRcdHRleHRGaWVsZC5wb3NpdGlvbi55ID0gMzA7XG5cblx0XHRjaGlwcy5hZGRDaGlsZCh0ZXh0RmllbGQpO1xuXHR9XG5cblx0dGhpcy5ob2xkZXIueCA9IC10aGlzLmhvbGRlci53aWR0aCowLjU7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5Qb3RWaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuUG90Vmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG90VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIENoZWNrYm94ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0NoZWNrYm94XCIpO1xuXG5cblxuLyoqXG4gKiBSYWlzZSBzaG9ydGN1dCBidXR0b25cbiAqIEBjbGFzcyBSYWlzZVNob3J0Y3V0QnV0dG9uXG4gKi9cbiBmdW5jdGlvbiBSYWlzZVNob3J0Y3V0QnV0dG9uKCkge1xuIFx0dmFyIGJhY2tncm91bmQgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJidXR0b25CYWNrZ3JvdW5kXCIpLCAxMCwgNSwgMTAsIDUpO1xuIFx0YmFja2dyb3VuZC53aWR0aCA9IDEwNTtcbiBcdGJhY2tncm91bmQuaGVpZ2h0ID0gMjU7XG5cdEJ1dHRvbi5jYWxsKHRoaXMsIGJhY2tncm91bmQpO1xuXG4gXHR2YXIgc3R5bGVPYmplY3QgPSB7XG4gXHRcdHdpZHRoOiAxMDUsXG4gXHRcdGhlaWdodDogMjAsXG4gXHRcdGZvbnQ6IFwiYm9sZCAxNHB4IEFyaWFsXCIsXG4gXHRcdGNvbG9yOiBcIndoaXRlXCJcbiBcdH07XG5cdHRoaXMubGFiZWwgPSBuZXcgUElYSS5UZXh0KFwiXCIsIHN0eWxlT2JqZWN0KTtcblx0dGhpcy5sYWJlbC5wb3NpdGlvbi54ID0gODtcblx0dGhpcy5sYWJlbC5wb3NpdGlvbi55ID0gNDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChSYWlzZVNob3J0Y3V0QnV0dG9uLCBCdXR0b24pO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoUmFpc2VTaG9ydGN1dEJ1dHRvbik7XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRUZXh0XG4gKi9cblJhaXNlU2hvcnRjdXRCdXR0b24ucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbihzdHJpbmcpIHtcblx0dGhpcy5sYWJlbC5zZXRUZXh0KHN0cmluZyk7XG5cdHJldHVybiBzdHJpbmc7XG59XG5cbi8qKlxuICogU2V0IGVuYWJsZWQuXG4gKiBAbWV0aG9kIHNldEVuYWJsZWRcbiAqL1xuUmFpc2VTaG9ydGN1dEJ1dHRvbi5wcm90b3R5cGUuc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdGlmKHZhbHVlKSB7XG5cdFx0dGhpcy5hbHBoYSA9IDE7XG5cdFx0dGhpcy5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdFx0dGhpcy5idXR0b25Nb2RlID0gdHJ1ZTtcblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLmFscGhhID0gMC41O1xuXHRcdHRoaXMuaW50ZXJhY3RpdmUgPSBmYWxzZTtcblx0XHR0aGlzLmJ1dHRvbk1vZGUgPSBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmFpc2VTaG9ydGN1dEJ1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcblxuLyoqXG4gKiBBIHNlYXQgdmlldy5cbiAqIEBjbGFzcyBTZWF0Vmlld1xuICovXG5mdW5jdGlvbiBTZWF0VmlldyhzZWF0SW5kZXgpIHtcblx0QnV0dG9uLmNhbGwodGhpcyk7XG5cblx0dGhpcy5wb2NrZXRDYXJkcyA9IFtdO1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblxuXHR2YXIgc2VhdFRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwic2VhdFBsYXRlXCIpO1xuXHR2YXIgc2VhdFNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShzZWF0VGV4dHVyZSk7XG5cblx0c2VhdFNwcml0ZS5wb3NpdGlvbi54ID0gLXNlYXRUZXh0dXJlLndpZHRoIC8gMjtcblx0c2VhdFNwcml0ZS5wb3NpdGlvbi55ID0gLXNlYXRUZXh0dXJlLmhlaWdodCAvIDI7XG5cblx0dGhpcy5hZGRDaGlsZChzZWF0U3ByaXRlKTtcblxuXHR2YXIgcG9zID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKVt0aGlzLnNlYXRJbmRleF07XG5cblx0dGhpcy5wb3NpdGlvbi54ID0gcG9zLng7XG5cdHRoaXMucG9zaXRpb24ueSA9IHBvcy55O1xuXG5cdHZhciBzdHlsZTtcblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMjBweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5uYW1lRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW25hbWVdXCIsIHN0eWxlKTtcblx0dGhpcy5uYW1lRmllbGQucG9zaXRpb24ueSA9IC0yMDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLm5hbWVGaWVsZCk7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMTJweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5jaGlwc0ZpZWxkID0gbmV3IFBJWEkuVGV4dChcIltuYW1lXVwiLCBzdHlsZSk7XG5cdHRoaXMuY2hpcHNGaWVsZC5wb3NpdGlvbi55ID0gNTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoaXBzRmllbGQpO1xuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAyMHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLmFjdGlvbkZpZWxkID0gbmV3IFBJWEkuVGV4dChcImFjdGlvblwiLCBzdHlsZSk7XG5cdHRoaXMuYWN0aW9uRmllbGQucG9zaXRpb24ueSA9IC0xMztcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmFjdGlvbkZpZWxkKTtcblx0dGhpcy5hY3Rpb25GaWVsZC5hbHBoYSA9IDA7XG5cblx0dGhpcy5zZXROYW1lKFwiXCIpO1xuXHR0aGlzLnNldENoaXBzKFwiXCIpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNlYXRWaWV3LCBCdXR0b24pO1xuXG4vKipcbiAqIFNldCBuYW1lLlxuICogQG1ldGhvZCBzZXROYW1lXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXROYW1lID0gZnVuY3Rpb24obmFtZSkge1xuXHR0aGlzLm5hbWVGaWVsZC5zZXRUZXh0KG5hbWUpO1xuXHR0aGlzLm5hbWVGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblxuXHR0aGlzLm5hbWVGaWVsZC5wb3NpdGlvbi54ID0gLXRoaXMubmFtZUZpZWxkLmNhbnZhcy53aWR0aCAvIDI7XG59XG5cbi8qKlxuICogU2V0IG5hbWUuXG4gKiBAbWV0aG9kIHNldENoaXBzXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXRDaGlwcyA9IGZ1bmN0aW9uKGNoaXBzKSB7XG5cdHRoaXMuY2hpcHNGaWVsZC5zZXRUZXh0KGNoaXBzKTtcblx0dGhpcy5jaGlwc0ZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXG5cdHRoaXMuY2hpcHNGaWVsZC5wb3NpdGlvbi54ID0gLXRoaXMuY2hpcHNGaWVsZC5jYW52YXMud2lkdGggLyAyO1xufVxuXG4vKipcbiAqIFNldCBzaXRvdXQuXG4gKiBAbWV0aG9kIHNldFNpdG91dFxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuc2V0U2l0b3V0ID0gZnVuY3Rpb24oc2l0b3V0KSB7XG5cdGlmIChzaXRvdXQpXG5cdFx0dGhpcy5hbHBoYSA9IC41O1xuXG5cdGVsc2Vcblx0XHR0aGlzLmFscGhhID0gMTtcbn1cblxuLyoqXG4gKiBTZXQgc2l0b3V0LlxuICogQG1ldGhvZCBzZXRBY3RpdmVcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLnNldEFjdGl2ZSA9IGZ1bmN0aW9uKGFjdGl2ZSkge1xuXHR0aGlzLnZpc2libGUgPSBhY3RpdmU7XG59XG5cbi8qKlxuICogQWRkIHBvY2tldCBjYXJkLlxuICogQG1ldGhvZCBhZGRQb2NrZXRDYXJkXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5hZGRQb2NrZXRDYXJkID0gZnVuY3Rpb24oY2FyZFZpZXcpIHtcblx0dGhpcy5wb2NrZXRDYXJkcy5wdXNoKGNhcmRWaWV3KTtcbn1cblxuLyoqXG4gKiBHZXQgcG9ja2V0IGNhcmRzLlxuICogQG1ldGhvZCBnZXRQb2NrZXRDYXJkc1xuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuZ2V0UG9ja2V0Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMucG9ja2V0Q2FyZHM7XG59XG5cbi8qKlxuICogRm9sZCBjYXJkcy5cbiAqIEBtZXRob2QgZm9sZENhcmRzXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5mb2xkQ2FyZHMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5wb2NrZXRDYXJkc1swXS5hZGRFdmVudExpc3RlbmVyKFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzLm9uRm9sZENvbXBsZXRlLCB0aGlzKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMucG9ja2V0Q2FyZHMubGVuZ3RoOyBpKyspIHtcblx0XHR0aGlzLnBvY2tldENhcmRzW2ldLmZvbGQoKTtcblx0fVxufVxuXG4vKipcbiAqIEZvbGQgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uRm9sZENvbXBsZXRlXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5vbkZvbGRDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnBvY2tldENhcmRzWzBdLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMub25Gb2xkQ29tcGxldGUsIHRoaXMpO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIpO1xufVxuXG4vKipcbiAqIFNob3cgdXNlciBhY3Rpb24uXG4gKiBAbWV0aG9kIGFjdGlvblxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdHRoaXMuYWN0aW9uRmllbGQuc2V0VGV4dChhY3Rpb24pO1xuXHR0aGlzLmFjdGlvbkZpZWxkLnBvc2l0aW9uLnggPSAtdGhpcy5hY3Rpb25GaWVsZC5jYW52YXMud2lkdGggLyAyO1xuXG5cdHRoaXMuYWN0aW9uRmllbGQuYWxwaGEgPSAxO1xuXHR0aGlzLm5hbWVGaWVsZC5hbHBoYSA9IDA7XG5cdHRoaXMuY2hpcHNGaWVsZC5hbHBoYSA9IDA7XG5cblx0c2V0VGltZW91dCh0aGlzLm9uVGltZXIuYmluZCh0aGlzKSwgMTAwMCk7XG59XG5cbi8qKlxuICogU2hvdyB1c2VyIGFjdGlvbi5cbiAqIEBtZXRob2QgYWN0aW9uXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5vblRpbWVyID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cblx0dmFyIHQxID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMuYWN0aW9uRmllbGQpXG5cdFx0XHRcdFx0XHRcdC50byh7YWxwaGE6IDB9LCAxMDAwKVxuXHRcdFx0XHRcdFx0XHQuc3RhcnQoKTtcblx0dmFyIHQyID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMubmFtZUZpZWxkKVxuXHRcdFx0XHRcdFx0XHQudG8oe2FscGhhOiAxfSwgMTAwMClcblx0XHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cdHZhciB0MyA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzLmNoaXBzRmllbGQpXG5cdFx0XHRcdFx0XHRcdC50byh7YWxwaGE6IDF9LCAxMDAwKVxuXHRcdFx0XHRcdFx0XHQuc3RhcnQoKTtcblxufVxuXG4vKipcbiAqIENsZWFyLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGk7XG5cblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblx0dGhpcy5zaXRvdXQgPSBmYWxzZTtcblx0Ly9zZWF0LmJldENoaXBzLnNldFZhbHVlKDApO1xuXHR0aGlzLnNldE5hbWUoXCJcIik7XG5cdHRoaXMuc2V0Q2hpcHMoXCJcIik7XG5cblx0Zm9yIChpPTA7IGk8dGhpcy5wb2NrZXRDYXJkcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLnBvY2tldENhcmRzW2ldLmhpZGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIENoZWNrYm94ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0NoZWNrYm94XCIpO1xuXG5cblxuLyoqXG4gKiBDaGVja2JveGVzIHZpZXdcbiAqIEBjbGFzcyBTZXR0aW5nc0NoZWNrYm94XG4gKi9cbiBmdW5jdGlvbiBTZXR0aW5nc0NoZWNrYm94KGlkLCBzdHJpbmcpIHtcbiBcdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG4gXHR0aGlzLmlkID0gaWQ7XG5cbiBcdHZhciB5ID0gMDtcblxuIFx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuIFx0XHR3aWR0aDogMjAwLFxuIFx0XHRoZWlnaHQ6IDI1LFxuIFx0XHRmb250OiBcImJvbGQgMTNweCBBcmlhbFwiLFxuIFx0XHRjb2xvcjogXCJ3aGl0ZVwiXG4gXHR9O1xuIFx0dGhpcy5sYWJlbCA9IG5ldyBQSVhJLlRleHQoc3RyaW5nLCBzdHlsZU9iamVjdCk7XG4gXHR0aGlzLmxhYmVsLnBvc2l0aW9uLnggPSAyNTtcbiBcdHRoaXMubGFiZWwucG9zaXRpb24ueSA9IHkgKyAxO1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcblxuIFx0dmFyIGJhY2tncm91bmQgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoZWNrYm94QmFja2dyb3VuZFwiKSk7XG4gXHR2YXIgdGljayA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hlY2tib3hUaWNrXCIpKTtcbiBcdHRpY2sueCA9IDE7XG5cbiBcdHRoaXMuY2hlY2tib3ggPSBuZXcgQ2hlY2tib3goYmFja2dyb3VuZCwgdGljayk7XG4gXHR0aGlzLmNoZWNrYm94LnBvc2l0aW9uLnkgPSB5O1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoZWNrYm94KTtcblxuIFx0dGhpcy5jaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25DaGVja2JveENoYW5nZSwgdGhpcyk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2V0dGluZ3NDaGVja2JveCwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFNldHRpbmdzQ2hlY2tib3gpO1xuXG4vKipcbiAqIENoZWNrYm94IGNoYW5nZS5cbiAqIEBtZXRob2Qgb25DaGVja2JveENoYW5nZVxuICovXG5TZXR0aW5nc0NoZWNrYm94LnByb3RvdHlwZS5vbkNoZWNrYm94Q2hhbmdlID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiLCB0aGlzKTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoZWNrZWRcbiAqL1xuU2V0dGluZ3NDaGVja2JveC5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVja2JveC5nZXRDaGVja2VkKCk7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRDaGVja2VkXG4gKi9cblNldHRpbmdzQ2hlY2tib3gucHJvdG90eXBlLnNldENoZWNrZWQgPSBmdW5jdGlvbihjaGVja2VkKSB7XG5cdHRoaXMuY2hlY2tib3guc2V0Q2hlY2tlZChjaGVja2VkKTtcblx0cmV0dXJuIGNoZWNrZWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3NDaGVja2JveDsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIFNldHRpbmdzQ2hlY2tib3ggPSByZXF1aXJlKFwiLi9TZXR0aW5nc0NoZWNrYm94XCIpO1xudmFyIFJhaXNlU2hvcnRjdXRCdXR0b24gPSByZXF1aXJlKFwiLi9SYWlzZVNob3J0Y3V0QnV0dG9uXCIpO1xudmFyIENoZWNrYm94TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9DaGVja2JveE1lc3NhZ2VcIik7XG5cblxuXG4vKipcbiAqIEEgc2V0dGluZ3Mgdmlld1xuICogQGNsYXNzIFNldHRpbmdzVmlld1xuICovXG4gZnVuY3Rpb24gU2V0dGluZ3NWaWV3KCkge1xuIFx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cbiBcdHZhciBvYmplY3QgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG4gXHR2YXIgYmcgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGF0QmFja2dyb3VuZFwiKSwgMTAsIDEwLCAxMCwgMTApO1xuIFx0Ymcud2lkdGggPSAzMDtcbiBcdGJnLmhlaWdodCA9IDMwO1xuIFx0b2JqZWN0LmFkZENoaWxkKGJnKTtcblxuIFx0dmFyIHNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwid3JlbmNoSWNvblwiKSk7XG4gXHRzcHJpdGUueCA9IDU7XG4gXHRzcHJpdGUueSA9IDU7XG4gXHRvYmplY3QuYWRkQ2hpbGQoc3ByaXRlKTtcblxuIFx0dGhpcy5zZXR0aW5nc0J1dHRvbiA9IG5ldyBCdXR0b24ob2JqZWN0KTtcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24ucG9zaXRpb24ueCA9IDk2MCAtIDEwIC0gdGhpcy5zZXR0aW5nc0J1dHRvbi53aWR0aDtcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24ucG9zaXRpb24ueSA9IDU0MztcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihCdXR0b24uQ0xJQ0ssIHRoaXMub25TZXR0aW5nc0J1dHRvbkNsaWNrLCB0aGlzKTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5zZXR0aW5nc0J1dHRvbik7XG5cbiBcdHRoaXMuc2V0dGluZ3NNZW51ID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuIFx0XG4gXHR2YXIgbWJnID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hhdEJhY2tncm91bmRcIiksIDEwLCAxMCwgMTAsIDEwKTtcbiBcdG1iZy53aWR0aCA9IDI1MDtcbiBcdG1iZy5oZWlnaHQgPSAxMDA7XG4gXHR0aGlzLnNldHRpbmdzTWVudS5hZGRDaGlsZChtYmcpO1xuXG4gXHR2YXIgc3R5bGVPYmplY3QgPSB7XG4gXHRcdGZvbnQ6IFwiYm9sZCAxNHB4IEFyaWFsXCIsXG4gXHRcdGNvbG9yOiBcIiNGRkZGRkZcIixcbiBcdFx0d2lkdGg6IDIwMCxcbiBcdFx0aGVpZ2h0OiAyMFxuIFx0fTtcbiBcdHZhciBsYWJlbCA9IG5ldyBQSVhJLlRleHQoXCJTZXR0aW5nc1wiLCBzdHlsZU9iamVjdCk7XG4gXHRsYWJlbC5wb3NpdGlvbi54ID0gMTY7XG4gXHRsYWJlbC5wb3NpdGlvbi55ID0gMTA7XG5cbiBcdHRoaXMuc2V0dGluZ3NNZW51LmFkZENoaWxkKGxhYmVsKTtcbiBcdHRoaXMuc2V0dGluZ3NNZW51LnBvc2l0aW9uLnggPSA5NjAgLSAxMCAtIHRoaXMuc2V0dGluZ3NNZW51LndpZHRoO1xuIFx0dGhpcy5zZXR0aW5nc01lbnUucG9zaXRpb24ueSA9IDUzOCAtIHRoaXMuc2V0dGluZ3NNZW51LmhlaWdodDtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5zZXR0aW5nc01lbnUpO1xuXG4gXHR0aGlzLnNldHRpbmdzID0ge307XG5cbiBcdHRoaXMuY3JlYXRlTWVudVNldHRpbmcoXCJwbGF5QW5pbWF0aW9uc1wiLCBcIlBsYXkgYW5pbWF0aW9uc1wiLCA0MCwgU2V0dGluZ3MuZ2V0SW5zdGFuY2UoKS5wbGF5QW5pbWF0aW9ucyk7XG4gXHR0aGlzLmNyZWF0ZU1lbnVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5BVVRPX01VQ0tfTE9TSU5HLCBcIk11Y2sgbG9zaW5nIGhhbmRzXCIsIDY1KTtcblxuIFx0dGhpcy5jcmVhdGVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTLCBcIlBvc3QgYmxpbmRzXCIsIDApO1xuIFx0dGhpcy5jcmVhdGVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVCwgXCJTaXQgb3V0XCIsIDI1KTtcblxuIFx0dGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSA9IGZhbHNlO1xuXG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uID0gbmV3IFJhaXNlU2hvcnRjdXRCdXR0b24oKTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMub25CdXlDaGlwc0NsaWNrLCB0aGlzKTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24ueCA9IDcwMDtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24ueSA9IDYzNTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24uc2V0VGV4dChcIkJ1eSBjaGlwc1wiKTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5idXlDaGlwc0J1dHRvbik7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2V0dGluZ3NWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoU2V0dGluZ3NWaWV3KTtcblxuU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSyA9IFwiYnV5Q2hpcHNDbGlja1wiO1xuXG4vKipcbiAqIE9uIGJ1eSBjaGlwcyBidXR0b24gY2xpY2tlZC5cbiAqIEBtZXRob2Qgb25CdXlDaGlwc0NsaWNrXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUub25CdXlDaGlwc0NsaWNrID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGNvbnNvbGUubG9nKFwiYnV5IGNoaXBzIGNsaWNrXCIpO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGNoZWNrYm94LlxuICogQG1ldGhvZCBjcmVhdGVNZW51U2V0dGluZ1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmNyZWF0ZU1lbnVTZXR0aW5nID0gZnVuY3Rpb24oaWQsIHN0cmluZywgeSwgZGVmKSB7XG5cdHZhciBzZXR0aW5nID0gbmV3IFNldHRpbmdzQ2hlY2tib3goaWQsIHN0cmluZyk7XG5cblx0c2V0dGluZy55ID0geTtcblx0c2V0dGluZy54ID0gMTY7XG5cdHRoaXMuc2V0dGluZ3NNZW51LmFkZENoaWxkKHNldHRpbmcpO1xuXG5cdHNldHRpbmcuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uQ2hlY2tib3hDaGFuZ2UsIHRoaXMpXG5cblx0dGhpcy5zZXR0aW5nc1tpZF0gPSBzZXR0aW5nO1xuXHRzZXR0aW5nLnNldENoZWNrZWQoZGVmKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgc2V0dGluZy5cbiAqIEBtZXRob2QgY3JlYXRlU2V0dGluZ1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmNyZWF0ZVNldHRpbmcgPSBmdW5jdGlvbihpZCwgc3RyaW5nLCB5KSB7XG5cdHZhciBzZXR0aW5nID0gbmV3IFNldHRpbmdzQ2hlY2tib3goaWQsIHN0cmluZyk7XG5cblx0c2V0dGluZy55ID0gNTQ1K3k7XG5cdHNldHRpbmcueCA9IDcwMDtcblx0dGhpcy5hZGRDaGlsZChzZXR0aW5nKTtcblxuXHRzZXR0aW5nLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vbkNoZWNrYm94Q2hhbmdlLCB0aGlzKVxuXG5cdHRoaXMuc2V0dGluZ3NbaWRdID0gc2V0dGluZztcbn1cblxuLyoqXG4gKiBDaGVja2JveCBjaGFuZ2UuXG4gKiBAbWV0aG9kIG9uQ2hlY2tib3hDaGFuZ2VcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vbkNoZWNrYm94Q2hhbmdlID0gZnVuY3Rpb24oY2hlY2tib3gpIHtcblx0aWYoY2hlY2tib3guaWQgPT0gXCJwbGF5QW5pbWF0aW9uc1wiKSB7XG5cdFx0U2V0dGluZ3MuZ2V0SW5zdGFuY2UoKS5wbGF5QW5pbWF0aW9ucyA9IGNoZWNrYm94LmdldENoZWNrZWQoKTtcblx0XHRjb25zb2xlLmxvZyhcImFuaW1zIGNoYW5nZWQuLlwiKTtcblx0fVxuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiLCBjaGVja2JveC5pZCwgY2hlY2tib3guZ2V0Q2hlY2tlZCgpKTtcbn1cblxuLyoqXG4gKiBTZXR0aW5ncyBidXR0b24gY2xpY2suXG4gKiBAbWV0aG9kIG9uU2V0dGluZ3NCdXR0b25DbGlja1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU2V0dGluZ3NCdXR0b25DbGljayA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRjb25zb2xlLmxvZyhcIlNldHRpbmdzVmlldy5wcm90b3R5cGUub25TZXR0aW5nc0J1dHRvbkNsaWNrXCIpO1xuXHR0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlID0gIXRoaXMuc2V0dGluZ3NNZW51LnZpc2libGU7XG5cblx0aWYodGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSkge1xuXHRcdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gdGhpcy5vblN0YWdlTW91c2VEb3duLmJpbmQodGhpcyk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSBudWxsO1xuXHR9XG59XG5cbi8qKlxuICogU3RhZ2UgbW91c2UgZG93bi5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlRG93blxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU3RhZ2VNb3VzZURvd24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0Y29uc29sZS5sb2coXCJTZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU3RhZ2VNb3VzZURvd25cIik7XG5cdGlmKCh0aGlzLmhpdFRlc3QodGhpcy5zZXR0aW5nc01lbnUsIGludGVyYWN0aW9uX29iamVjdCkpIHx8ICh0aGlzLmhpdFRlc3QodGhpcy5zZXR0aW5nc0J1dHRvbiwgaW50ZXJhY3Rpb25fb2JqZWN0KSkpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IG51bGw7XG5cdHRoaXMuc2V0dGluZ3NNZW51LnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBIaXQgdGVzdC5cbiAqIEBtZXRob2QgaGl0VGVzdFxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmhpdFRlc3QgPSBmdW5jdGlvbihvYmplY3QsIGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZigoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54ID4gb2JqZWN0LmdldEJvdW5kcygpLnggKSAmJiAoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54IDwgKG9iamVjdC5nZXRCb3VuZHMoKS54ICsgb2JqZWN0LmdldEJvdW5kcygpLndpZHRoKSkgJiZcblx0XHQoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC55ID4gb2JqZWN0LmdldEJvdW5kcygpLnkpICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPCAob2JqZWN0LmdldEJvdW5kcygpLnkgKyBvYmplY3QuZ2V0Qm91bmRzKCkuaGVpZ2h0KSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcdFx0XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJlc2V0LlxuICogQG1ldGhvZCByZXNldFxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuYnV5Q2hpcHNCdXR0b24uZW5hYmxlZCA9IHRydWU7XG5cdHRoaXMuc2V0VmlzaWJsZUJ1dHRvbnMoW10pO1xufVxuXG4vKipcbiAqIFNldCB2aXNpYmxlIGJ1dHRvbnMuXG4gKiBAbWV0aG9kIHNldFZpc2libGVCdXR0b25zXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuc2V0VmlzaWJsZUJ1dHRvbnMgPSBmdW5jdGlvbihidXR0b25zKSB7XG5cdHRoaXMuYnV5Q2hpcHNCdXR0b24udmlzaWJsZSA9IGJ1dHRvbnMuaW5kZXhPZihCdXR0b25EYXRhLkJVWV9DSElQUykgIT0gLTE7XG5cdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFNdLnZpc2libGUgPSBidXR0b25zLmluZGV4T2YoQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFMpO1xuXHR0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVF0udmlzaWJsZSA9IGJ1dHRvbnMuaW5kZXhPZihDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFQpO1xuXG5cdHZhciB5cCA9IDU0MztcblxuXHRpZih0aGlzLmJ1eUNoaXBzQnV0dG9uLnZpc2libGUpIHtcblx0XHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnkgPSB5cDtcblx0XHR5cCArPSAzNTtcblx0fVxuXHRlbHNlIHtcblx0XHR5cCArPSAyO1xuXHR9XG5cblx0aWYodGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EU10udmlzaWJsZSkge1xuXHRcdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFNdLnkgPSB5cDtcblx0XHR5cCArPSAyNTtcblx0fVxuXG5cdGlmKHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUXS52aXNpYmxlKSB7XG5cdFx0dGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFRdLnkgPSB5cDtcblx0XHR5cCArPSAyNTtcblx0fVxufVxuXG4vKipcbiAqIEdldCBjaGVja2JveC5cbiAqIEBtZXRob2QgZ2V0Q2hlY2tib3hCeUlkXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuZ2V0Q2hlY2tib3hCeUlkID0gZnVuY3Rpb24oaWQpIHtcblx0cmV0dXJuIHRoaXMuc2V0dGluZ3NbaWRdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xyXG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcclxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XHJcblxyXG4vKipcclxuICogU2hvdyB0YWJsZSBpbmZvLlxyXG4gKiBAY2xhc3MgVGFibGVJbmZvVmlld1xyXG4gKi9cclxuZnVuY3Rpb24gVGFibGVJbmZvVmlldygpIHtcclxuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcclxuXHJcblx0dmFyIHN0eWxlID0ge1xyXG5cdFx0Zm9udDogXCJib2xkIDI0cHggVGltZXMgTmV3IFJvbWFuXCIsXHJcblx0XHRmaWxsOiBcIiNmZmZmZmZcIixcclxuXHRcdGRyb3BTaGFkb3c6IHRydWUsXHJcblx0XHRkcm9wU2hhZG93Q29sb3I6IFwiIzAwMDAwMFwiLFxyXG5cdFx0ZHJvcFNoYWRvd0Rpc3RhbmNlOiAyLFxyXG5cdFx0c3Ryb2tlOiBcIiMwMDAwMDBcIixcclxuXHRcdHN0cm9rZVRoaWNrbmVzczogMixcclxuXHRcdHdvcmRXcmFwOiB0cnVlLFxyXG5cdFx0d29yZFdyYXBXaWR0aDogMzAwXHJcblx0fTtcclxuXHJcblx0dGhpcy50YWJsZUluZm9UZXh0ID0gbmV3IFBJWEkuVGV4dChcIjxUYWJsZUluZm9UZXh0PlwiLCBzdHlsZSk7XHJcblx0dGhpcy50YWJsZUluZm9UZXh0LnBvc2l0aW9uLnggPSAzNTU7XHJcblx0dGhpcy50YWJsZUluZm9UZXh0LnBvc2l0aW9uLnkgPSA1NDA7XHJcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRhYmxlSW5mb1RleHQpO1xyXG59XHJcblxyXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFRhYmxlSW5mb1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XHJcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFRhYmxlSW5mb1ZpZXcpO1xyXG5cclxuLyoqXHJcbiAqIFNldCB0YWJsZSBpbmZvIHRleHQuXHJcbiAqIEBtZXRob2Qgc2V0VGFibGVJbmZvVGV4dFxyXG4gKi9cclxuVGFibGVJbmZvVmlldy5wcm90b3R5cGUuc2V0VGFibGVJbmZvVGV4dCA9IGZ1bmN0aW9uKHMpIHtcclxuXHRpZiAoIXMpXHJcblx0XHRzPVwiXCI7XHJcblxyXG5cdHRoaXMudGFibGVJbmZvVGV4dC5zZXRUZXh0KHMpO1xyXG5cdGNvbnNvbGUubG9nKFwic2V0dGluZyB0YWJsZSBpbmZvIHRleHQ6IFwiICsgcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhci5cclxuICogQG1ldGhvZCBjbGVhclxyXG4gKi9cclxuVGFibGVJbmZvVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLnRhYmxlSW5mb1RleHQuc2V0VGV4dChcIlwiKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUluZm9WaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xuXG5cblxuLyoqXG4gKiBBIHRpbWVyIHZpZXdcbiAqIEBjbGFzcyBUaW1lclZpZXdcbiAqL1xuZnVuY3Rpb24gVGltZXJWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblx0XG5cdHRoaXMudGltZXJDbGlwID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0aW1lckJhY2tncm91bmRcIikpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGltZXJDbGlwKTtcblxuXG5cdHRoaXMuY2FudmFzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0dGhpcy5jYW52YXMueCA9IHRoaXMudGltZXJDbGlwLndpZHRoKjAuNTtcblx0dGhpcy5jYW52YXMueSA9IHRoaXMudGltZXJDbGlwLmhlaWdodCowLjU7XG5cdHRoaXMudGltZXJDbGlwLmFkZENoaWxkKHRoaXMuY2FudmFzKTtcblxuXHR0aGlzLnRpbWVyQ2xpcC52aXNpYmxlID0gZmFsc2U7XG5cblx0dGhpcy50d2VlbiA9IG51bGw7XG5cblx0Ly90aGlzLnNob3dQZXJjZW50KDMwKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChUaW1lclZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChUaW1lclZpZXcpO1xuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudGltZXJDbGlwLnZpc2libGUgPSBmYWxzZTtcblx0dGhpcy5zdG9wKCk7XG59XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5UaW1lclZpZXcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbihzZWF0SW5kZXgpIHtcblx0XG5cdHRoaXMudGltZXJDbGlwLnZpc2libGUgPSB0cnVlO1xuXHR0aGlzLnRpbWVyQ2xpcC54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLnggKyA1NTtcblx0dGhpcy50aW1lckNsaXAueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcInNlYXRQb3NpdGlvbnNcIilbc2VhdEluZGV4XS55IC0gMzA7XG5cblx0dGhpcy5zdG9wKCk7XG5cbn1cblxuLyoqXG4gKiBTdG9wLlxuICogQG1ldGhvZCBzdG9wXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xuXHRpZih0aGlzLnR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy50d2Vlbi5zdG9wKCk7XG5cbn1cblxuLyoqXG4gKiBDb3VudGRvd24uXG4gKiBAbWV0aG9kIGNvdW50ZG93blxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLmNvdW50ZG93biA9IGZ1bmN0aW9uKHRvdGFsVGltZSwgdGltZUxlZnQpIHtcblx0dGhpcy5zdG9wKCk7XG5cblx0dG90YWxUaW1lICo9IDEwMDA7XG5cdHRpbWVMZWZ0ICo9IDEwMDA7XG5cblx0dmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuXHR0aGlzLnN0YXJ0QXQgPSB0aW1lICsgdGltZUxlZnQgLSB0b3RhbFRpbWU7XG5cdHRoaXMuc3RvcEF0ID0gdGltZSArIHRpbWVMZWZ0O1xuXG5cdHRoaXMudHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oe3RpbWU6IHRpbWV9KVxuXHRcdFx0XHRcdFx0LnRvKHt0aW1lOiB0aGlzLnN0b3BBdH0sIHRpbWVMZWZ0KVxuXHRcdFx0XHRcdFx0Lm9uVXBkYXRlKHRoaXMub25VcGRhdGUuYmluZCh0aGlzKSlcblx0XHRcdFx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25Db21wbGV0ZS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cbn1cblxuLyoqXG4gKiBPbiB0d2VlbiB1cGRhdGUuXG4gKiBAbWV0aG9kIG9uVXBkYXRlXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUub25VcGRhdGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuXHR2YXIgcGVyY2VudCA9IDEwMCoodGltZSAtIHRoaXMuc3RhcnRBdCkvKHRoaXMuc3RvcEF0IC0gdGhpcy5zdGFydEF0KTtcblxuLy9cdGNvbnNvbGUubG9nKFwicCA9IFwiICsgcGVyY2VudCk7XG5cblx0dGhpcy5zaG93UGVyY2VudChwZXJjZW50KTtcbn1cblxuLyoqXG4gKiBPbiB0d2VlbiB1cGRhdGUuXG4gKiBAbWV0aG9kIG9uVXBkYXRlXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUub25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZSA9IERhdGUubm93KCk7XG5cdHZhciBwZXJjZW50ID0gMTAwO1xuXHR0aGlzLnNob3dQZXJjZW50KHBlcmNlbnQpO1xuXHR0aGlzLnR3ZWVuID0gbnVsbDtcbn1cblxuLyoqXG4gKiBTaG93IHBlcmNlbnQuXG4gKiBAbWV0aG9kIHNob3dQZXJjZW50XG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuc2hvd1BlcmNlbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZiAodmFsdWUgPCAwKVxuXHRcdHZhbHVlID0gMDtcblxuXHRpZiAodmFsdWUgPiAxMDApXG5cdFx0dmFsdWUgPSAxMDA7XG5cblx0dGhpcy5jYW52YXMuY2xlYXIoKTtcblxuXHR0aGlzLmNhbnZhcy5iZWdpbkZpbGwoMHhjMDAwMDApO1xuXHR0aGlzLmNhbnZhcy5kcmF3Q2lyY2xlKDAsMCwxMCk7XG5cdHRoaXMuY2FudmFzLmVuZEZpbGwoKTtcblxuXHR0aGlzLmNhbnZhcy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuXHR0aGlzLmNhbnZhcy5tb3ZlVG8oMCwwKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IDMzOyBpKyspIHtcblx0XHR0aGlzLmNhbnZhcy5saW5lVG8oXG5cdFx0XHRcdFx0XHRcdDEwKk1hdGguY29zKGkqdmFsdWUqMipNYXRoLlBJLygzMioxMDApIC0gTWF0aC5QSS8yKSxcblx0XHRcdFx0XHRcdFx0MTAqTWF0aC5zaW4oaSp2YWx1ZSoyKk1hdGguUEkvKDMyKjEwMCkgLSBNYXRoLlBJLzIpXG5cdFx0XHRcdFx0XHQpO1xuXHR9XG5cblx0dGhpcy5jYW52YXMubGluZVRvKDAsMCk7XG5cdHRoaXMuY2FudmFzLmVuZEZpbGwoKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVyVmlldzsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xuXG52YXIgSW5pdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Jbml0TWVzc2FnZVwiKTtcbnZhciBTdGF0ZUNvbXBsZXRlTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1N0YXRlQ29tcGxldGVNZXNzYWdlXCIpO1xudmFyIFNlYXRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1NlYXRJbmZvTWVzc2FnZVwiKTtcbnZhciBDb21tdW5pdHlDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Db21tdW5pdHlDYXJkc01lc3NhZ2VcIik7XG52YXIgUG9ja2V0Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUG9ja2V0Q2FyZHNNZXNzYWdlXCIpO1xudmFyIFNlYXRDbGlja01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlXCIpO1xudmFyIFNob3dEaWFsb2dNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvU2hvd0RpYWxvZ01lc3NhZ2VcIik7XG52YXIgQnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIEJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQnV0dG9uc01lc3NhZ2VcIik7XG52YXIgRGVsYXlNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRGVsYXlNZXNzYWdlXCIpO1xudmFyIENsZWFyTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0NsZWFyTWVzc2FnZVwiKTtcbnZhciBEZWFsZXJCdXR0b25NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZVwiKTtcbnZhciBCZXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQmV0TWVzc2FnZVwiKTtcbnZhciBCZXRzVG9Qb3RNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQmV0c1RvUG90TWVzc2FnZVwiKTtcblxudmFyIEFjdGlvbk1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlXCIpO1xudmFyIENoYXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ2hhdE1lc3NhZ2VcIik7XG52YXIgQ2hlY2tib3hNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlXCIpO1xudmFyIEZhZGVUYWJsZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9GYWRlVGFibGVNZXNzYWdlXCIpO1xudmFyIEhhbmRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0hhbmRJbmZvTWVzc2FnZVwiKTtcbnZhciBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2VcIik7XG52YXIgUGF5T3V0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1BheU91dE1lc3NhZ2VcIik7XG52YXIgUG90TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1BvdE1lc3NhZ2VcIik7XG52YXIgUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIFByZXNldEJ1dHRvbnNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlc2V0QnV0dG9uc01lc3NhZ2VcIik7XG52YXIgUHJlVG91cm5hbWVudEluZm9NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvUHJlVG91cm5hbWVudEluZm9NZXNzYWdlXCIpO1xudmFyIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGFibGVCdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgVGFibGVCdXR0b25zTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2VcIik7XG52YXIgVGFibGVJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RhYmxlSW5mb01lc3NhZ2VcIik7XG52YXIgVGVzdENhc2VSZXF1ZXN0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1Rlc3RDYXNlUmVxdWVzdE1lc3NhZ2VcIik7XG52YXIgVGltZXJNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVGltZXJNZXNzYWdlXCIpO1xudmFyIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvVG91cm5hbWVudFJlc3VsdE1lc3NhZ2VcIik7XG52YXIgRm9sZENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0ZvbGRDYXJkc01lc3NhZ2VcIik7XG5cbi8qKlxuICogQSBwcm90b2NvbCBjb25uZWN0aW9uIHdpdGggYW4gdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gd2F5cyB0byBsaXRlbiBmb3IgY29ubmVjdGlvbnMsIHRoZSBmaXJzdCBvbmUgYW5kIG1vc3Qgc3RyYWlnaHRcbiAqIGZvcndhcmQgaXMgdGhlIGFkZE1lc3NhZ2VIYW5kbGVyLCB3aGljaCByZWdpc3RlcnMgYSBsaXN0ZW5lciBmb3IgYVxuICogcGFydGljdWxhciBuZXR3b3JrIG1lc3NhZ2UuIFRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgdGhlIG1lc3NhZ2VcbiAqIGNsYXNzIHRvIGxpc3RlbiBmb3I6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9uU2VhdEluZm9NZXNzYWdlKG0pIHtcbiAqICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNlYXQgaXMgYWN0aXZlLlxuICogICAgICAgICBtLmlzQWN0aXZlKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90b0Nvbm5lY3Rpb24uYWRkTWVzc2FnZUhhbmRsZXIoU2VhdEluZm9NZXNzYWdlLCBvblNlYXRJbmZvTWVzc2FnZSk7XG4gKlxuICogVGhlIHNlY29uZCBtZXRob2QgaXMgdG8gbGlzdGVuIHRvIHRoZSBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSBkaXNwYXRjaGVkXG4gKiBieSB0aGUgaW5zdGFuY2Ugb2YgdGhlIFByb3RvQ29ubmVjdGlvbi4gSW4gdGhpcyBjYXNlLCB0aGUgbGlzdGVuZXJcbiAqIHdpbGwgYmUgY2FsbGVkIGZvciBhbGwgbWVzc2FnZXMgcmVjZWl2ZWQgb24gdGhlIGNvbm5lY3Rpb24uXG4gKlxuICogICAgIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG4gKiAgICAgICAgIHZhciBtZXNzYWdlPWUubWVzc2FnZTtcbiAqXG4gKiAgICAgICAgIC8vIElzIGl0IGEgU2VhdEluZm9NZXNzYWdlP1xuICogICAgICAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFNlYXRJbmZvTWVzc2FnZSkge1xuICogICAgICAgICAgICAgLy8gLi4uXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHByb3RvQ29ubmVjdGlvbi5hZGRNZXNzYWdlSGFuZGxlcihTZWF0SW5mb01lc3NhZ2UsIG9uTWVzc2FnZSk7XG4gKlxuICogVGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbiBzaG91bGQgYmUgYW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyBhbiBcImludGVyZmFjZVwiXG4gKiBvZiBhIGNvbm5lY3Rpb24uIEl0IGlzIG5vdCBhbiBpbnRlcmZhY2UgcGVyIHNlLCBzaW5jZSBKYXZhU2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydFxuICogaXQuIEFueXdheSwgdGhlIHNpZ25hdHVyZSBvZiB0aGlzIGludGVyZmFjZSwgaXMgdGhhdCB0aGUgY29ubmVjdGlvbiBvYmplY3RcbiAqIHNob3VsZCBoYXZlIGEgYHNlbmRgIG1ldGhvZCB3aGljaCByZWNlaXZlcyBhIG9iamVjdCB0byBiZSBzZW5kLiBJdCBzaG91bGQgYWxzb1xuICogZGlzcGF0Y2ggXCJtZXNzYWdlXCIgZXZlbnRzIGFzIG1lc3NhZ2VzIGFyZSByZWNlaXZlZCwgYW5kIFwiY2xvc2VcIiBldmVudHMgaWYgdGhlXG4gKiBjb25uZWN0aW9uIGlzIGNsb3NlZCBieSB0aGUgcmVtb3RlIHBhcnR5LlxuICpcbiAqIEBjbGFzcyBQcm90b0Nvbm5lY3Rpb25cbiAqIEBleHRlbmRzIEV2ZW50RGlzcGF0Y2hlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gY29ubmVjdGlvbiBUaGUgdW5kZXJseWluZyBjb25uZWN0aW9uIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gUHJvdG9Db25uZWN0aW9uKGNvbm5lY3Rpb24pIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5sb2dNZXNzYWdlcyA9IGZhbHNlO1xuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyID0gbmV3IEV2ZW50RGlzcGF0Y2hlcigpO1xuXHR0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuXHR0aGlzLmNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlLCB0aGlzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChQcm90b0Nvbm5lY3Rpb24sIEV2ZW50RGlzcGF0Y2hlcik7XG5cbi8qKlxuICogVHJpZ2dlcnMgaWYgdGhlIHJlbW90ZSBwYXJ0eSBjbG9zZXMgdGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbi5cbiAqIEBldmVudCBQcm90b0Nvbm5lY3Rpb24uQ0xPU0VcbiAqL1xuUHJvdG9Db25uZWN0aW9uLkNMT1NFID0gXCJjbG9zZVwiO1xuXG4vKipcbiAqIFRyaWdnZXJzIHdoZW4gd2UgcmVjZWl2ZSBhIG1lc3NhZ2UgZnJvbSB0aGUgcmVtb3RlIHBhcnR5LlxuICogQGV2ZW50IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZSBUaGUgbWVzc2FnZSB0aGF0IHdhcyByZWNlaXZlZC5cbiAqL1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UgPSBcIm1lc3NhZ2VcIjtcblxuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVMgPSB7fTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0luaXRNZXNzYWdlLlRZUEVdID0gSW5pdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTdGF0ZUNvbXBsZXRlTWVzc2FnZS5UWVBFXSA9IFN0YXRlQ29tcGxldGVNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbU2VhdEluZm9NZXNzYWdlLlRZUEVdID0gU2VhdEluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLlRZUEVdID0gQ29tbXVuaXR5Q2FyZHNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUG9ja2V0Q2FyZHNNZXNzYWdlLlRZUEVdID0gUG9ja2V0Q2FyZHNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbU2VhdENsaWNrTWVzc2FnZS5UWVBFXSA9IFNlYXRDbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTaG93RGlhbG9nTWVzc2FnZS5UWVBFXSA9IFNob3dEaWFsb2dNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gQnV0dG9uQ2xpY2tNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0RlbGF5TWVzc2FnZS5UWVBFXSA9IERlbGF5TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0NsZWFyTWVzc2FnZS5UWVBFXSA9IENsZWFyTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0RlYWxlckJ1dHRvbk1lc3NhZ2UuVFlQRV0gPSBEZWFsZXJCdXR0b25NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQmV0TWVzc2FnZS5UWVBFXSA9IEJldE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCZXRzVG9Qb3RNZXNzYWdlLlRZUEVdID0gQmV0c1RvUG90TWVzc2FnZTtcblxuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQWN0aW9uTWVzc2FnZS5UWVBFXSA9IEFjdGlvbk1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDaGF0TWVzc2FnZS5UWVBFXSA9IENoYXRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ2hlY2tib3hNZXNzYWdlLlRZUEVdID0gQ2hlY2tib3hNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRmFkZVRhYmxlTWVzc2FnZS5UWVBFXSA9IEZhZGVUYWJsZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tIYW5kSW5mb01lc3NhZ2UuVFlQRV0gPSBIYW5kSW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuVFlQRV0gPSBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQYXlPdXRNZXNzYWdlLlRZUEVdID0gUGF5T3V0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1BvdE1lc3NhZ2UuVFlQRV0gPSBQb3RNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlc2V0QnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBQcmVzZXRCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1ByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5UWVBFXSA9IFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEVdID0gVGFibGVCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUYWJsZUJ1dHRvbnNNZXNzYWdlLlRZUEVdID0gVGFibGVCdXR0b25zTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlSW5mb01lc3NhZ2UuVFlQRV0gPSBUYWJsZUluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5UWVBFXSA9IFRlc3RDYXNlUmVxdWVzdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUaW1lck1lc3NhZ2UuVFlQRV0gPSBUaW1lck1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUb3VybmFtZW50UmVzdWx0TWVzc2FnZS5UWVBFXSA9IFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRm9sZENhcmRzTWVzc2FnZS5UWVBFXSA9IEZvbGRDYXJkc01lc3NhZ2U7XG5cbi8qKlxuICogQWRkIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgYWRkTWVzc2FnZUhhbmRsZXJcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5hZGRNZXNzYWdlSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSkge1xuXHRpZiAobWVzc2FnZVR5cGUuaGFzT3duUHJvcGVydHkoXCJUWVBFXCIpKVxuXHRcdG1lc3NhZ2VUeXBlID0gbWVzc2FnZVR5cGUuVFlQRTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLm9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSk7XG59XG5cbi8qKlxuICogUmVtb3ZlIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgcmVtb3ZlTWVzc2FnZUhhbmRsZXJcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVNZXNzYWdlSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSkge1xuXHRpZiAobWVzc2FnZVR5cGUuaGFzT3duUHJvcGVydHkoXCJUWVBFXCIpKVxuXHRcdG1lc3NhZ2VUeXBlID0gbWVzc2FnZVR5cGUuVFlQRTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLm9mZihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uTWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5vbkNvbm5lY3Rpb25NZXNzYWdlID0gZnVuY3Rpb24oZXYpIHtcblx0dmFyIG1lc3NhZ2UgPSBldi5tZXNzYWdlO1xuXHR2YXIgY29uc3RydWN0b3I7XG5cblx0aWYgKHRoaXMubG9nTWVzc2FnZXMpXG5cdFx0Y29uc29sZS5sb2coXCI9PT4gXCIgKyBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG5cblx0Zm9yICh0eXBlIGluIFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTKSB7XG5cdFx0aWYgKG1lc3NhZ2UudHlwZSA9PSB0eXBlKVxuXHRcdFx0Y29uc3RydWN0b3IgPSBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1t0eXBlXVxuXHR9XG5cblx0aWYgKCFjb25zdHJ1Y3Rvcikge1xuXHRcdGNvbnNvbGUud2FybihcInVua25vd24gbWVzc2FnZTogXCIgKyBtZXNzYWdlLnR5cGUpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBvID0gbmV3IGNvbnN0cnVjdG9yKCk7XG5cdG8udW5zZXJpYWxpemUobWVzc2FnZSk7XG5cdG8udHlwZSA9IG1lc3NhZ2UudHlwZTtcblxuXHR0aGlzLm1lc3NhZ2VEaXNwYXRjaGVyLnRyaWdnZXIobyk7XG5cblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSxcblx0XHRtZXNzYWdlOiBvXG5cdH0pO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gY2xvc2UuXG4gKiBAbWV0aG9kIG9uQ29ubmVjdGlvbkNsb3NlXG4gKiBAcHJpdmF0ZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNsb3NlID0gZnVuY3Rpb24oZXYpIHtcblx0dGhpcy5jb25uZWN0aW9uLm9mZihcIm1lc3NhZ2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5jb25uZWN0aW9uLm9mZihcImNsb3NlXCIsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24gPSBudWxsO1xuXG5cdHRoaXMudHJpZ2dlcihQcm90b0Nvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIFNlbmQgYSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZW5kXG4gKi9cblByb3RvQ29ubmVjdGlvbi5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0dmFyIHNlcmlhbGl6ZWQgPSBtZXNzYWdlLnNlcmlhbGl6ZSgpO1xuXG5cdGZvciAodHlwZSBpbiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFUykge1xuXHRcdGlmIChtZXNzYWdlIGluc3RhbmNlb2YgUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbdHlwZV0pXG5cdFx0XHRzZXJpYWxpemVkLnR5cGUgPSB0eXBlO1xuXHR9XG5cblx0aWYgKCFzZXJpYWxpemVkLnR5cGUpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBtZXNzYWdlIHR5cGUgZm9yIHNlbmQsIG1lc3NhZ2U9XCIgKyBtZXNzYWdlLmNvbnN0cnVjdG9yLm5hbWUpO1xuXG5cdC8vXHRjb25zb2xlLmxvZyhcInNlbmRpbmc6IFwiK3NlcmlhbGl6ZWQpO1xuXG5cdHRoaXMuY29ubmVjdGlvbi5zZW5kKHNlcmlhbGl6ZWQpO1xufVxuXG4vKipcbiAqIFNob3VsZCBtZXNzYWdlcyBiZSBsb2dnZWQgdG8gY29uc29sZT9cbiAqIEBtZXRob2Qgc2V0TG9nTWVzc2FnZXNcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2dNZXNzYWdlcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMubG9nTWVzc2FnZXMgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBDbG9zZSB0aGUgdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICogQG1ldGhvZCBjbG9zZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3RvQ29ubmVjdGlvbjsiLCIvKipcbiAqIEJ1dHRvbiBkYXRhLlxuICogQGNsYXNzIEJ1dHRvbkRhdGFcbiAqL1xuZnVuY3Rpb24gQnV0dG9uRGF0YShidXR0b24sIHZhbHVlKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdC8qXHR0aGlzLm1pbiA9IC0xO1xuXHR0aGlzLm1heCA9IC0xOyovXG59XG5cbkJ1dHRvbkRhdGEuUkFJU0UgPSBcInJhaXNlXCI7XG5CdXR0b25EYXRhLkZPTEQgPSBcImZvbGRcIjtcbkJ1dHRvbkRhdGEuQkVUID0gXCJiZXRcIjtcbkJ1dHRvbkRhdGEuU0lUX09VVCA9IFwic2l0T3V0XCI7XG5CdXR0b25EYXRhLlNJVF9JTiA9IFwic2l0SW5cIjtcbkJ1dHRvbkRhdGEuQ0FMTCA9IFwiY2FsbFwiO1xuQnV0dG9uRGF0YS5QT1NUX0JCID0gXCJwb3N0QkJcIjtcbkJ1dHRvbkRhdGEuUE9TVF9TQiA9IFwicG9zdFNCXCI7XG5CdXR0b25EYXRhLkNBTkNFTCA9IFwiY2FuY2VsXCI7XG5CdXR0b25EYXRhLkNIRUNLID0gXCJjaGVja1wiO1xuQnV0dG9uRGF0YS5TSE9XID0gXCJzaG93XCI7XG5CdXR0b25EYXRhLk1VQ0sgPSBcIm11Y2tcIjtcbkJ1dHRvbkRhdGEuT0sgPSBcIm9rXCI7XG5CdXR0b25EYXRhLklNX0JBQ0sgPSBcImltQmFja1wiO1xuQnV0dG9uRGF0YS5MRUFWRSA9IFwibGVhdmVcIjtcbkJ1dHRvbkRhdGEuQ0hFQ0tfRk9MRCA9IFwiY2hlY2tGb2xkXCI7XG5CdXR0b25EYXRhLkNBTExfQU5ZID0gXCJjYWxsQW55XCI7XG5CdXR0b25EYXRhLlJBSVNFX0FOWSA9IFwicmFpc2VBbnlcIjtcbkJ1dHRvbkRhdGEuQlVZX0lOID0gXCJidXlJblwiO1xuQnV0dG9uRGF0YS5SRV9CVVkgPSBcInJlQnV5XCI7XG5CdXR0b25EYXRhLkpPSU5fVE9VUk5BTUVOVCA9IFwiam9pblRvdXJuYW1lbnRcIjtcbkJ1dHRvbkRhdGEuTEVBVkVfVE9VUk5BTUVOVCA9IFwibGVhdmVUb3VybmFtZW50XCI7XG5cbi8qKlxuICogR2V0IGJ1dHRvbi5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cbkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b247XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbiBzdHJpbmcgZm9yIHRoaXMgYnV0dG9uLlxuICogQG1ldGhvZCBnZXRCdXR0b25TdHJpbmdcbiAqL1xuQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0QnV0dG9uU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBCdXR0b25EYXRhLmdldEJ1dHRvblN0cmluZ0ZvcklkKHRoaXMuYnV0dG9uKTtcbn1cblxuLyoqXG4gKiBHZXQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIEdldCBidXR0b24gc3RyaW5nIGZvciBpZC5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uU3RyaW5nRm9ySWRcbiAqIEBzdGF0aWNcbiAqL1xuQnV0dG9uRGF0YS5nZXRCdXR0b25TdHJpbmdGb3JJZCA9IGZ1bmN0aW9uKGIpIHtcblx0c3dpdGNoIChiKSB7XG5cdFx0Y2FzZSBCdXR0b25EYXRhLkZPTEQ6XG5cdFx0XHRyZXR1cm4gXCJGT0xEXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0FMTDpcblx0XHRcdHJldHVybiBcIkNBTExcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5SQUlTRTpcblx0XHRcdHJldHVybiBcIlJBSVNFIFRPXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQkVUOlxuXHRcdFx0cmV0dXJuIFwiQkVUXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuU0lUX09VVDpcblx0XHRcdHJldHVybiBcIlNJVCBPVVRcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5QT1NUX0JCOlxuXHRcdFx0cmV0dXJuIFwiUE9TVCBCQlwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlBPU1RfU0I6XG5cdFx0XHRyZXR1cm4gXCJQT1NUIFNCXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuU0lUX0lOOlxuXHRcdFx0cmV0dXJuIFwiU0lUIElOXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0FOQ0VMOlxuXHRcdFx0cmV0dXJuIFwiQ0FOQ0VMXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0hFQ0s6XG5cdFx0XHRyZXR1cm4gXCJDSEVDS1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlNIT1c6XG5cdFx0XHRyZXR1cm4gXCJTSE9XXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuTVVDSzpcblx0XHRcdHJldHVybiBcIk1VQ0tcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5PSzpcblx0XHRcdHJldHVybiBcIk9LXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuSU1fQkFDSzpcblx0XHRcdHJldHVybiBcIkknTSBCQUNLXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuTEVBVkU6XG5cdFx0XHRyZXR1cm4gXCJMRUFWRVwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNIRUNLX0ZPTEQ6XG5cdFx0XHRyZXR1cm4gXCJDSEVDSyAvIEZPTERcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DQUxMX0FOWTpcblx0XHRcdHJldHVybiBcIkNBTEwgQU5ZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUkFJU0VfQU5ZOlxuXHRcdFx0cmV0dXJuIFwiUkFJU0UgQU5ZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUkVfQlVZOlxuXHRcdFx0cmV0dXJuIFwiUkUtQlVZXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQlVZX0lOOlxuXHRcdFx0cmV0dXJuIFwiQlVZIElOXCI7XG5cdH1cblxuXHRyZXR1cm4gXCJcIjtcbn1cblxuLypCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRNaW4gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWluO1xufSovXG5cbi8qQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0TWF4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1heDtcbn0qL1xuXG5CdXR0b25EYXRhLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gXCI8QnV0dG9uRGF0YSBidXR0b249XCIgKyB0aGlzLmJ1dHRvbiArIFwiPlwiO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbkRhdGE7IiwiLyoqXG4gKiBDYXJkIGRhdGEuXG4gKiBAY2xhc3MgQ2FyZERhdGFcbiAqL1xuZnVuY3Rpb24gQ2FyZERhdGEodmFsdWUpIHtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5DYXJkRGF0YS5DQVJEX1ZBTFVFX1NUUklOR1MgPVxuXHRbXCIyXCIsIFwiM1wiLCBcIjRcIiwgXCI1XCIsIFwiNlwiLCBcIjdcIiwgXCI4XCIsIFwiOVwiLCBcIjEwXCIsIFwiSlwiLCBcIlFcIiwgXCJLXCIsIFwiQVwiXTtcblxuQ2FyZERhdGEuU1VJVF9TVFJJTkdTID1cblx0W1wiRFwiLCBcIkNcIiwgXCJIXCIsIFwiU1wiXTtcblxuQ2FyZERhdGEuSElEREVOID0gLTE7XG5cbi8qKlxuICogRG9lcyB0aGlzIENhcmREYXRhIHJlcHJlc2VudCBhIHNob3cgY2FyZD9cbiAqIElmIG5vdCBpdCBzaG91bGQgYmUgcmVuZGVyZWQgd2l0aCBpdHMgYmFja3NpZGUuXG4gKiBAbWV0aG9kIGlzU2hvd25cbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmlzU2hvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWUgPj0gMDtcbn1cblxuLyoqXG4gKiBHZXQgY2FyZCB2YWx1ZS5cbiAqIFRoaXMgdmFsdWUgcmVwcmVzZW50cyB0aGUgcmFuayBvZiB0aGUgY2FyZCwgYnV0IHN0YXJ0cyBvbiAwLlxuICogQG1ldGhvZCBnZXRDYXJkVmFsdWVcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENhcmRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZSAlIDEzO1xufVxuXG4vKipcbiAqIEdldCBjYXJkIHZhbHVlIHN0cmluZy5cbiAqIEBtZXRob2QgZ2V0Q2FyZFZhbHVlU3RyaW5nXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5nZXRDYXJkVmFsdWVTdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIENhcmREYXRhLkNBUkRfVkFMVUVfU1RSSU5HU1t0aGlzLnZhbHVlICUgMTNdO1xufVxuXG4vKipcbiAqIEdldCBzdWl0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTdWl0SW5kZXhcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldFN1aXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gTWF0aC5mbG9vcih0aGlzLnZhbHVlIC8gMTMpO1xufVxuXG4vKipcbiAqIEdldCBzdWl0IHN0cmluZy5cbiAqIEBtZXRob2QgZ2V0U3VpdFN0cmluZ1xuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0U3VpdFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gQ2FyZERhdGEuU1VJVF9TVFJJTkdTW3RoaXMuZ2V0U3VpdEluZGV4KCldO1xufVxuXG4vKipcbiAqIEdldCBjb2xvci5cbiAqIEBtZXRob2QgZ2V0Q29sb3JcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENvbG9yID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLmdldFN1aXRJbmRleCgpICUgMiAhPSAwKVxuXHRcdHJldHVybiBcIiMwMDAwMDBcIjtcblxuXHRlbHNlXG5cdFx0cmV0dXJuIFwiI2ZmMDAwMFwiO1xufVxuXG4vKipcbiAqIFRvIHN0cmluZy5cbiAqIEBtZXRob2QgdG9TdHJpbmdcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLnZhbHVlIDwgMClcblx0XHRyZXR1cm4gXCJYWFwiO1xuXG5cdC8vXHRyZXR1cm4gXCI8Y2FyZCBcIiArIHRoaXMuZ2V0Q2FyZFZhbHVlU3RyaW5nKCkgKyB0aGlzLmdldFN1aXRTdHJpbmcoKSArIFwiPlwiO1xuXHRyZXR1cm4gdGhpcy5nZXRDYXJkVmFsdWVTdHJpbmcoKSArIHRoaXMuZ2V0U3VpdFN0cmluZygpO1xufVxuXG4vKipcbiAqIEdldCB2YWx1ZSBvZiB0aGUgY2FyZC5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIENvbXBhcmUgd2l0aCByZXNwZWN0IHRvIHZhbHVlLiBOb3QgcmVhbGx5IHVzZWZ1bCBleGNlcHQgZm9yIGRlYnVnZ2luZyFcbiAqIEBtZXRob2QgY29tcGFyZVZhbHVlXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVWYWx1ZSA9IGZ1bmN0aW9uKGEsIGIpIHtcblx0aWYgKCEoYSBpbnN0YW5jZW9mIENhcmREYXRhKSB8fCAhKGIgaW5zdGFuY2VvZiBDYXJkRGF0YSkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGNvbXBhcmluZyBjYXJkIGRhdGFcIik7XG5cblx0aWYgKGEuZ2V0VmFsdWUoKSA+IGIuZ2V0VmFsdWUoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRWYWx1ZSgpIDwgYi5nZXRWYWx1ZSgpKVxuXHRcdHJldHVybiAtMTtcblxuXHRyZXR1cm4gMDtcbn1cblxuLyoqXG4gKiBDb21wYXJlIHdpdGggcmVzcGVjdCB0byBjYXJkIHZhbHVlLlxuICogQG1ldGhvZCBjb21wYXJlQ2FyZFZhbHVlXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVDYXJkVmFsdWUgPSBmdW5jdGlvbihhLCBiKSB7XG5cdGlmICghKGEgaW5zdGFuY2VvZiBDYXJkRGF0YSkgfHwgIShiIGluc3RhbmNlb2YgQ2FyZERhdGEpKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBjb21wYXJpbmcgY2FyZCBkYXRhXCIpO1xuXG5cdGlmIChhLmdldENhcmRWYWx1ZSgpID4gYi5nZXRDYXJkVmFsdWUoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRDYXJkVmFsdWUoKSA8IGIuZ2V0Q2FyZFZhbHVlKCkpXG5cdFx0cmV0dXJuIC0xO1xuXG5cdHJldHVybiAwO1xufVxuXG4vKipcbiAqIENvbXBhcmUgd2l0aCByZXNwZWN0IHRvIHN1aXQuXG4gKiBAbWV0aG9kIGNvbXBhcmVTdWl0XG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmNvbXBhcmVTdWl0SW5kZXggPSBmdW5jdGlvbihhLCBiKSB7XG5cdGlmICghKGEgaW5zdGFuY2VvZiBDYXJkRGF0YSkgfHwgIShiIGluc3RhbmNlb2YgQ2FyZERhdGEpKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBjb21wYXJpbmcgY2FyZCBkYXRhXCIpO1xuXG5cdGlmIChhLmdldFN1aXRJbmRleCgpID4gYi5nZXRTdWl0SW5kZXgoKSlcblx0XHRyZXR1cm4gMTtcblxuXHRpZiAoYS5nZXRTdWl0SW5kZXgoKSA8IGIuZ2V0U3VpdEluZGV4KCkpXG5cdFx0cmV0dXJuIC0xO1xuXG5cdHJldHVybiAwO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGNhcmQgZGF0YSBmcm9tIGEgc3RyaW5nLlxuICogQG1ldGhvZCBmcm9tU3RyaW5nXG4gKiBAc3RhdGljXG4gKi9cbkNhcmREYXRhLmZyb21TdHJpbmcgPSBmdW5jdGlvbihzKSB7XG5cdHZhciBpO1xuXG5cdHZhciBjYXJkVmFsdWUgPSAtMTtcblx0Zm9yIChpID0gMDsgaSA8IENhcmREYXRhLkNBUkRfVkFMVUVfU1RSSU5HUy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjYW5kID0gQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTW2ldO1xuXG5cdFx0aWYgKHMuc3Vic3RyaW5nKDAsIGNhbmQubGVuZ3RoKS50b1VwcGVyQ2FzZSgpID09IGNhbmQpXG5cdFx0XHRjYXJkVmFsdWUgPSBpO1xuXHR9XG5cblx0aWYgKGNhcmRWYWx1ZSA8IDApXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGEgdmFsaWQgY2FyZCBzdHJpbmc6IFwiICsgcyk7XG5cblx0dmFyIHN1aXRTdHJpbmcgPSBzLnN1YnN0cmluZyhDYXJkRGF0YS5DQVJEX1ZBTFVFX1NUUklOR1NbY2FyZFZhbHVlXS5sZW5ndGgpO1xuXG5cdHZhciBzdWl0SW5kZXggPSAtMTtcblx0Zm9yIChpID0gMDsgaSA8IENhcmREYXRhLlNVSVRfU1RSSU5HUy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjYW5kID0gQ2FyZERhdGEuU1VJVF9TVFJJTkdTW2ldO1xuXG5cdFx0aWYgKHN1aXRTdHJpbmcudG9VcHBlckNhc2UoKSA9PSBjYW5kKVxuXHRcdFx0c3VpdEluZGV4ID0gaTtcblx0fVxuXG5cdGlmIChzdWl0SW5kZXggPCAwKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBhIHZhbGlkIGNhcmQgc3RyaW5nOiBcIiArIHMpO1xuXG5cdHJldHVybiBuZXcgQ2FyZERhdGEoc3VpdEluZGV4ICogMTMgKyBjYXJkVmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhcmREYXRhOyIsIi8qKlxuICogQnV0dG9uIGRhdGEuXG4gKiBAY2xhc3MgQnV0dG9uRGF0YVxuICovXG5mdW5jdGlvbiBQcmVzZXRCdXR0b25EYXRhKGJ1dHRvbiwgdmFsdWUpIHtcblx0dGhpcy5idXR0b24gPSBidXR0b247XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBHZXQgYnV0dG9uLlxuICogQG1ldGhvZCBnZXRCdXR0b25cbiAqL1xuUHJlc2V0QnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cblByZXNldEJ1dHRvbkRhdGEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ1dHRvbkRhdGE7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIHBsYXllciBtYWRlIGFuIGFjdGlvbi5cbiAqIEBjbGFzcyBBY3Rpb25NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEFjdGlvbk1lc3NhZ2Uoc2VhdEluZGV4LCBhY3Rpb24pIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG5cdHRoaXMuYWN0aW9uID0gYWN0aW9uO1xufVxuXG5BY3Rpb25NZXNzYWdlLlRZUEUgPSBcImFjdGlvblwiO1xuXG5BY3Rpb25NZXNzYWdlLkZPTEQgPSBcImZvbGRcIjtcbkFjdGlvbk1lc3NhZ2UuQ0FMTCA9IFwiY2FsbFwiO1xuQWN0aW9uTWVzc2FnZS5SQUlTRSA9IFwicmFpc2VcIjtcbkFjdGlvbk1lc3NhZ2UuQ0hFQ0sgPSBcImNoZWNrXCI7XG5BY3Rpb25NZXNzYWdlLkJFVCA9IFwiYmV0XCI7XG5BY3Rpb25NZXNzYWdlLk1VQ0sgPSBcIm11Y2tcIjtcbkFjdGlvbk1lc3NhZ2UuQU5URSA9IFwiYW50ZVwiO1xuXG4vKipcbiAqIFNlYXQgaW5kZXguXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0QWN0aW9uXG4gKi9cbkFjdGlvbk1lc3NhZ2UucHJvdG90eXBlLmdldEFjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5hY3Rpb247XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy5hY3Rpb24gPSBkYXRhLmFjdGlvbjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkFjdGlvbk1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0YWN0aW9uOiB0aGlzLmFjdGlvblxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFjdGlvbk1lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIHBsYXllciBoYXMgcGxhY2VkIGEgYmV0LlxuICogQGNsYXNzIEJldE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQmV0TWVzc2FnZShzZWF0SW5kZXgsIHZhbHVlKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbkJldE1lc3NhZ2UuVFlQRSA9IFwiYmV0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuQmV0TWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQmV0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cdHRoaXMudmFsdWUgPSBkYXRhLnZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQmV0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHR2YWx1ZTogdGhpcy52YWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJldE1lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIGJldHMgc2hvdWxkIGJlIHBsYWNlZCBpbiBwb3QuXG4gKiBAY2xhc3MgQmV0c1RvUG90TWVzc2FnZVxuICovXG5mdW5jdGlvbiBCZXRzVG9Qb3RNZXNzYWdlKCkge1xufVxuXG5CZXRzVG9Qb3RNZXNzYWdlLlRZUEUgPSBcImJldHNUb1BvdFwiO1xuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQmV0c1RvUG90TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5CZXRzVG9Qb3RNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJldHNUb1BvdE1lc3NhZ2U7IiwiLyoqXG4gKiBTZW50IHdoZW4gdGhlIHVzZXIgY2xpY2tzIGEgYnV0dG9uLCBlaXRoZXIgaW4gYSBkaWFsb2cgb3JcbiAqIGZvciBhIGdhbWUgYWN0aW9uLlxuICogQGNsYXNzIEJ1dHRvbkNsaWNrTWVzc2FnZVxuICovXG5mdW5jdGlvbiBCdXR0b25DbGlja01lc3NhZ2UoYnV0dG9uLCB2YWx1ZSkge1xuXHR0aGlzLmJ1dHRvbiA9IGJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXG4vL1x0Y29uc29sZS5sb2coXCJDcmVhdGluZyBidXR0b24gY2xpY2sgbWVzc2FnZSwgdmFsdWU9XCIgKyB2YWx1ZSk7XG59XG5cbkJ1dHRvbkNsaWNrTWVzc2FnZS5UWVBFID0gXCJidXR0b25DbGlja1wiO1xuXG4vKipcbiAqIFRoZSB0aGUgYnV0dG9uIHRoYXQgd2FzIHByZXNzZWQuXG4gKiBAbWV0aG9kIGdldEJ1dHRvblxuICovXG5CdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b247XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5CdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5idXR0b24gPSBkYXRhLmJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IGRhdGEudmFsdWU7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5CdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdGJ1dHRvbjogdGhpcy5idXR0b24sXG5cdFx0dmFsdWU6IHRoaXMudmFsdWVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b25DbGlja01lc3NhZ2U7IiwidmFyIEJ1dHRvbkRhdGEgPSByZXF1aXJlKFwiLi4vZGF0YS9CdXR0b25EYXRhXCIpO1xuXG4vKipcbiAqIE1lc3NhZ2Ugc2VudCB3aGVuIHRoZSBjbGllbnQgc2hvdWxkIHNob3cgZ2FtZSBhY3Rpb24gYnV0dG9ucyxcbiAqIEZPTEQsIFJBSVNFIGV0Yy5cbiAqIEBjbGFzcyBCdXR0b25zTWVzc2FnZVxuICovXG5mdW5jdGlvbiBCdXR0b25zTWVzc2FnZSgpIHtcblx0dGhpcy5idXR0b25zID0gW107XG5cdHRoaXMuc2xpZGVyQnV0dG9uSW5kZXggPSAwO1xuXHR0aGlzLm1pbiA9IC0xO1xuXHR0aGlzLm1heCA9IC0xO1xufVxuXG5CdXR0b25zTWVzc2FnZS5UWVBFID0gXCJidXR0b25zXCI7XG5cbi8qKlxuICogR2V0IGFuIGFycmF5IG9mIEJ1dHRvbkRhdGEgaW5kaWNhdGluZyB3aGljaCBidXR0b25zIHRvIHNob3cuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9ucztcbn1cblxuLyoqXG4gKiBBZGQgYSBidXR0b24gdG8gYmUgc2VudC5cbiAqIEBtZXRob2QgYWRkQnV0dG9uXG4gKi9cbkJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5hZGRCdXR0b24gPSBmdW5jdGlvbihidXR0b24pIHtcblx0dGhpcy5idXR0b25zLnB1c2goYnV0dG9uKTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuYnV0dG9ucyA9IFtdO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbiA9IGRhdGEuYnV0dG9uc1tpXTtcblx0XHR2YXIgYnV0dG9uRGF0YSA9IG5ldyBCdXR0b25EYXRhKGJ1dHRvbi5idXR0b24sIGJ1dHRvbi52YWx1ZSk7XG5cdFx0dGhpcy5hZGRCdXR0b24oYnV0dG9uRGF0YSk7XG5cdH1cblx0dGhpcy5zbGlkZXJCdXR0b25JbmRleCA9IGRhdGEuc2xpZGVyQnV0dG9uSW5kZXg7XG5cdHRoaXMubWluID0gZGF0YS5taW47XG5cdHRoaXMubWF4ID0gZGF0YS5tYXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBidXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgYnV0dG9uID0ge307XG5cdFx0YnV0dG9uLmJ1dHRvbiA9IHRoaXMuYnV0dG9uc1tpXS5nZXRCdXR0b24oKTtcblx0XHRidXR0b24udmFsdWUgPSB0aGlzLmJ1dHRvbnNbaV0uZ2V0VmFsdWUoKTtcblx0XHRidXR0b25zLnB1c2goYnV0dG9uKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0YnV0dG9uczogYnV0dG9ucyxcblx0XHRzbGlkZXJCdXR0b25JbmRleDogdGhpcy5zbGlkZXJCdXR0b25JbmRleCxcblx0XHRtaW46IHRoaXMubWluLFxuXHRcdG1heDogdGhpcy5tYXhcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b25zTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gc29tZXRoaW5nIGhhcyBvY2N1cnJlZCBpbiB0aGUgY2hhdC5cbiAqIEBjbGFzcyBDaGF0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBDaGF0TWVzc2FnZSh1c2VyLCB0ZXh0KSB7XG5cdHRoaXMudXNlciA9IHVzZXI7XG5cdHRoaXMudGV4dCA9IHRleHQ7XG59XG5cbkNoYXRNZXNzYWdlLlRZUEUgPSBcImNoYXRcIjtcblxuLyoqXG4gKiBHZXQgdGV4dC5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5DaGF0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldCB1c2VyLlxuICogQG1ldGhvZCBnZXRVc2VyXG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS5nZXRVc2VyID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnVzZXI7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5DaGF0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy51c2VyID0gZGF0YS51c2VyO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQ2hhdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHR1c2VyOiB0aGlzLnVzZXJcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0TWVzc2FnZTsiLCIvKipcbiAqIFNlbnQgd2hlbiBwbGF5ZXIgaGFzIGNoZWNrZWQgYSBjaGVja2JveC5cbiAqIEBjbGFzcyBDaGVja2JveE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQ2hlY2tib3hNZXNzYWdlKGlkLCBjaGVja2VkKSB7XG5cdHRoaXMuaWQgPSBpZDtcblx0dGhpcy5jaGVja2VkID0gY2hlY2tlZDtcbn1cblxuQ2hlY2tib3hNZXNzYWdlLlRZUEUgPSBcImNoZWNrYm94XCI7XG5cbkNoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTID0gXCJhdXRvUG9zdEJsaW5kc1wiO1xuQ2hlY2tib3hNZXNzYWdlLkFVVE9fTVVDS19MT1NJTkcgPSBcImF1dG9NdWNrTG9zaW5nXCI7XG5DaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFQgPSBcInNpdG91dE5leHRcIjtcblxuLyoqXG4gKiBJZCBvZiBjaGVja2JveC5cbiAqIEBtZXRob2QgZ2V0SWRcbiAqL1xuQ2hlY2tib3hNZXNzYWdlLnByb3RvdHlwZS5nZXRJZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5DaGVja2JveE1lc3NhZ2UucHJvdG90eXBlLmdldENoZWNrZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hlY2tlZDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuaWQgPSBkYXRhLmlkO1xuXHR0aGlzLmNoZWNrZWQgPSBkYXRhLmNoZWNrZWQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5DaGVja2JveE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdGlkOiB0aGlzLmlkLFxuXHRcdGNoZWNrZWQ6IHRoaXMuY2hlY2tlZFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94TWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBDbGVhck1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQ2xlYXJNZXNzYWdlKGNvbXBvbmVudHMpIHtcblx0aWYgKCFjb21wb25lbnRzKVxuXHRcdGNvbXBvbmVudHMgPSBbXTtcblxuXHR0aGlzLmNvbXBvbmVudHMgPSBjb21wb25lbnRzO1xufVxuXG5DbGVhck1lc3NhZ2UuVFlQRSA9IFwiY2xlYXJcIjtcblxuQ2xlYXJNZXNzYWdlLkNBUkRTID0gXCJjYXJkc1wiO1xuQ2xlYXJNZXNzYWdlLkJFVFMgPSBcImJldHNcIjtcbkNsZWFyTWVzc2FnZS5QT1QgPSBcInBvdFwiO1xuQ2xlYXJNZXNzYWdlLkNIQVQgPSBcImNoYXRcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENvbXBvbmVudHNcbiAqL1xuQ2xlYXJNZXNzYWdlLnByb3RvdHlwZS5nZXRDb21wb25lbnRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvbXBvbmVudHM7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5DbGVhck1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmNvbXBvbmVudHMgPSBkYXRhLmNvbXBvbmVudHM7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5DbGVhck1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdGNvbXBvbmVudHM6IHRoaXMuY29tcG9uZW50c1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENsZWFyTWVzc2FnZTsiLCJ2YXIgQ2FyZERhdGEgPSByZXF1aXJlKFwiLi4vZGF0YS9DYXJkRGF0YVwiKTtcblxuLyoqXG4gKiBTaG93IGNvbW11bml0eSBjYXJkcy5cbiAqIEBjbGFzcyBDb21tdW5pdHlDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQ29tbXVuaXR5Q2FyZHNNZXNzYWdlKCkge1xuXHR0aGlzLmFuaW1hdGUgPSBmYWxzZTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLmZpcnN0SW5kZXggPSAwO1xufVxuXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRSA9IFwiY29tbXVuaXR5Q2FyZHNcIjtcblxuLyoqXG4gKiBBbmltYXRpb24gb3Igbm90P1xuICogQG1ldGhvZCBzZXRBbmltYXRlXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2V0QW5pbWF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHJldHVybiB0aGlzLmFuaW1hdGUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgZmlyc3QgaW5kZXguXG4gKiBAbWV0aG9kIHNldEZpcnN0SW5kZXhcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0cmV0dXJuIHRoaXMuZmlyc3RJbmRleCA9IHZhbHVlO1xufVxuXG4vKipcbiAqIEFkZCBjYXJkLlxuICogQG1ldGhvZCBhZGRDYXJkXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuYWRkQ2FyZCA9IGZ1bmN0aW9uKGMpIHtcblx0dGhpcy5jYXJkcy5wdXNoKGMpO1xufVxuXG4vKipcbiAqIEdldCBjYXJkIGRhdGEuXG4gKiBAbWV0aG9kIGdldENhcmRzXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2FyZHM7XG59XG5cbi8qKlxuICogR2V0IHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgY2FyZCB0byBiZSBzaG93biBpbiB0aGUgc2VxdWVuY2UuXG4gKiBAbWV0aG9kIGdldEZpcnN0SW5kZXhcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmZpcnN0SW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dmFyIGk7XG5cblx0dGhpcy5hbmltYXRlID0gZGF0YS5hbmltYXRlO1xuXHR0aGlzLmZpcnN0SW5kZXggPSBwYXJzZUludChkYXRhLmZpcnN0SW5kZXgpO1xuXHR0aGlzLmNhcmRzID0gW107XG5cblx0Zm9yIChpID0gMDsgaSA8IGRhdGEuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5jYXJkcy5wdXNoKG5ldyBDYXJkRGF0YShkYXRhLmNhcmRzW2ldKSk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2FyZHMgPSBbXTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5jYXJkcy5sZW5ndGg7IGkrKylcblx0XHRjYXJkcy5wdXNoKHRoaXMuY2FyZHNbaV0uZ2V0VmFsdWUoKSk7XG5cblx0cmV0dXJuIHtcblx0XHRhbmltYXRlOiB0aGlzLmFuaW1hdGUsXG5cdFx0Zmlyc3RJbmRleDogdGhpcy5maXJzdEluZGV4LFxuXHRcdGNhcmRzOiBjYXJkc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbW11bml0eUNhcmRzTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBEZWFsZXJCdXR0b25NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlYWxlckJ1dHRvbk1lc3NhZ2Uoc2VhdEluZGV4LCBhbmltYXRlKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBhbmltYXRlO1xufVxuXG5EZWFsZXJCdXR0b25NZXNzYWdlLlRZUEUgPSBcImRlYWxlckJ1dHRvblwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRBbmltYXRlXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldEFuaW1hdGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYW5pbWF0ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBkYXRhLmFuaW1hdGU7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5EZWFsZXJCdXR0b25NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdGFuaW1hdGU6IHRoaXMuYW5pbWF0ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlYWxlckJ1dHRvbk1lc3NhZ2U7IiwiLyoqXG4gKiBAY2xhc3MgRGVsYXlNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlbGF5TWVzc2FnZShkZWxheSkge1xuXHR0aGlzLmRlbGF5ID0gZGVsYXk7XG59XG5cbkRlbGF5TWVzc2FnZS5UWVBFID0gXCJkZWxheVwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RGVsYXlcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5nZXREZWxheSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWxheTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlbGF5TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuZGVsYXkgPSBkYXRhLmRlbGF5O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRkZWxheTogdGhpcy5kZWxheVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGF5TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHRhYmxlIHNob3VsZCBmYWRlLlxuICogQGNsYXNzIEZhZGVUYWJsZU1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRmFkZVRhYmxlTWVzc2FnZSh2aXNpYmxlLCBkaXJlY3Rpb24pIHtcblx0dGhpcy52aXNpYmxlID0gdmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG59XG5cbkZhZGVUYWJsZU1lc3NhZ2UuVFlQRSA9IFwiZmFkZVRhYmxlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlzaWJsZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldERpcmVjdGlvblxuICovXG5GYWRlVGFibGVNZXNzYWdlLnByb3RvdHlwZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZGlyZWN0aW9uO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRmFkZVRhYmxlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZSA9IGRhdGEudmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkYXRhLmRpcmVjdGlvbjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpc2libGU6IHRoaXMudmlzaWJsZSxcblx0XHRkaXJlY3Rpb246IHRoaXMuZGlyZWN0aW9uXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmFkZVRhYmxlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHBsYXllciBoYXMgZm9sZGVkLlxuICogQGNsYXNzIEZvbGRDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRm9sZENhcmRzTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG59XG5cbkZvbGRDYXJkc01lc3NhZ2UuVFlQRSA9IFwiZm9sZENhcmRzXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkZvbGRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvbGRDYXJkc01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgSGFuZEluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEhhbmRJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG59XG5cbkhhbmRJbmZvTWVzc2FnZS5UWVBFID0gXCJoYW5kSW5mb1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkhhbmRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDb3VudGRvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGRhdGEuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93blxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRJbmZvTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBJbml0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbml0TWVzc2FnZSh0b2tlbikge1xuXHR0aGlzLnRva2VuID0gdG9rZW47XG5cdHRoaXMudGFibGVJZCA9IG51bGw7XG5cdHRoaXMudmlld0Nhc2UgPSBudWxsO1xufVxuXG5Jbml0TWVzc2FnZS5UWVBFID0gXCJpbml0XCI7XG5cbi8qKlxuICogZ2V0IHRva2VuLlxuICogQG1ldGhvZCBnZXRUb2tlblxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudG9rZW47XG59XG5cbi8qKlxuICogU2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBzZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXRUYWJsZUlkID0gZnVuY3Rpb24oaWQpIHtcblx0dGhpcy50YWJsZUlkID0gaWQ7XG59XG5cbi8qKlxuICogR2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBnZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUYWJsZUlkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSWQ7XG59XG5cbi8qKlxuICogU2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2Qgc2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuc2V0Vmlld0Nhc2UgPSBmdW5jdGlvbih2aWV3Q2FzZSkge1xuXHR0aGlzLnZpZXdDYXNlID0gdmlld0Nhc2U7XG59XG5cbi8qKlxuICogR2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2QgZ2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0Vmlld0Nhc2UgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlld0Nhc2U7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRva2VuID0gZGF0YS50b2tlbjtcblx0dGhpcy50YWJsZUlkID0gZGF0YS50YWJsZUlkO1xuXHR0aGlzLnZpZXdDYXNlID0gZGF0YS52aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0b2tlbjogdGhpcy50b2tlbixcblx0XHR0YWJsZUlkOiB0aGlzLnRhYmxlSWQsXG5cdFx0dmlld0Nhc2U6IHRoaXMudmlld0Nhc2Vcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbml0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gaW50ZXJmYWNlIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICogQGNsYXNzIEludGVyZmFjZVN0YXRlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UodmlzaWJsZUJ1dHRvbnMpIHtcblx0XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSB2aXNpYmxlQnV0dG9ucyA9PSBudWxsID8gbmV3IEFycmF5KCkgOiB2aXNpYmxlQnV0dG9ucztcbn1cblxuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLlRZUEUgPSBcImludGVyZmFjZVN0YXRlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlQnV0dG9uc1xuICovXG5JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGVCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkludGVyZmFjZVN0YXRlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSBkYXRhLnZpc2libGVCdXR0b25zO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2aXNpYmxlQnV0dG9uczogdGhpcy52aXNpYmxlQnV0dG9uc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZVN0YXRlTWVzc2FnZTsiLCIvKipcclxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgaGFzIHBsYWNlZCBhIGJldC5cclxuICogQGNsYXNzIFBheU91dE1lc3NhZ2VcclxuICovXHJcbmZ1bmN0aW9uIFBheU91dE1lc3NhZ2UoKSB7XHJcblx0dGhpcy52YWx1ZXMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XHJcbn1cclxuXHJcblBheU91dE1lc3NhZ2UuVFlQRSA9IFwicGF5T3V0XCI7XHJcblxyXG4vKipcclxuICogR2V0dGVyLlxyXG4gKiBAbWV0aG9kIGdldFZhbHVlc1xyXG4gKi9cclxuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWVzID0gZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXMudmFsdWVzO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IHZhbHVlIGF0LlxyXG4gKiBAbWV0aG9kIHNldFZhbHVlQXRcclxuICovXHJcblBheU91dE1lc3NhZ2UucHJvdG90eXBlLnNldFZhbHVlQXQgPSBmdW5jdGlvbihzZWF0SW5kZXgsIHZhbHVlKSB7XHJcblx0dGhpcy52YWx1ZXNbc2VhdEluZGV4XSA9IHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogVW4tc2VyaWFsaXplLlxyXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXHJcbiAqL1xyXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEudmFsdWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHR0aGlzLnZhbHVlc1tpXSA9IGRhdGEudmFsdWVzW2ldO1xyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxyXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxyXG4gKi9cclxuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdHZhbHVlczogdGhpcy52YWx1ZXNcclxuXHR9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBheU91dE1lc3NhZ2U7IiwidmFyIENhcmREYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvQ2FyZERhdGFcIik7XG5cbi8qKlxuICogU2hvdyBwb2NrZXQgY2FyZHMuXG4gKiBAY2xhc3MgUG9ja2V0Q2FyZHNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFBvY2tldENhcmRzTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5hbmltYXRlID0gZmFsc2U7XG5cdHRoaXMuY2FyZHMgPSBbXTtcblx0dGhpcy5maXJzdEluZGV4ID0gMDtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG59XG5cblBvY2tldENhcmRzTWVzc2FnZS5UWVBFID0gXCJwb2NrZXRDYXJkc1wiO1xuXG4vKipcbiAqIEFuaW1hdGlvbj9cbiAqIEBtZXRob2Qgc2V0QW5pbWF0ZVxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEFuaW1hdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLmFuaW1hdGUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgZmlyc3QgaW5kZXguXG4gKiBAbWV0aG9kIHNldEZpcnN0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0dGhpcy5maXJzdEluZGV4ID0gaW5kZXg7XG59XG5cbi8qKlxuICogR2V0IGFycmF5IG9mIENhcmREYXRhLlxuICogQG1ldGhvZCBnZXRDYXJkc1xuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNhcmRzO1xufVxuXG4vKipcbiAqIEFkZCBhIGNhcmQuXG4gKiBAbWV0aG9kIGFkZENhcmRcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5hZGRDYXJkID0gZnVuY3Rpb24oYykge1xuXHR0aGlzLmNhcmRzLnB1c2goYyk7XG59XG5cbi8qKlxuICogR2V0IGZpcnN0IGluZGV4LlxuICogQG1ldGhvZCBnZXRGaXJzdEluZGV4XG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Rmlyc3RJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5maXJzdEluZGV4O1xufVxuXG4vKipcbiAqIEdldCBzZWF0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHZhciBpO1xuXG5cdHRoaXMuYW5pbWF0ZSA9IGRhdGEuYW5pbWF0ZTtcblx0dGhpcy5maXJzdEluZGV4ID0gcGFyc2VJbnQoZGF0YS5maXJzdEluZGV4KTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXG5cdGZvciAoaSA9IDA7IGkgPCBkYXRhLmNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuY2FyZHMucHVzaChuZXcgQ2FyZERhdGEoZGF0YS5jYXJkc1tpXSkpO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNhcmRzID0gW107XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0Y2FyZHMucHVzaCh0aGlzLmNhcmRzW2ldLmdldFZhbHVlKCkpO1xuXG5cdHJldHVybiB7XG5cdFx0YW5pbWF0ZTogdGhpcy5hbmltYXRlLFxuXHRcdGZpcnN0SW5kZXg6IHRoaXMuZmlyc3RJbmRleCxcblx0XHRjYXJkczogY2FyZHMsXG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvY2tldENhcmRzTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gcGxheWVyIHBvdCBoYXMgY2hhbmdlZC5cbiAqIEBjbGFzcyBQb3RNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFBvdE1lc3NhZ2UodmFsdWVzKSB7XG5cdHRoaXMudmFsdWVzID0gdmFsdWVzID09IG51bGwgPyBuZXcgQXJyYXkoKSA6IHZhbHVlcztcbn1cblxuUG90TWVzc2FnZS5UWVBFID0gXCJwb3RcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlc1xuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWVzO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuUG90TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmFsdWVzID0gZGF0YS52YWx1ZXM7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2YWx1ZXM6IHRoaXMudmFsdWVzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG90TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gUHJlIHRvdXJuYW1lbnQgaW5mbyBtZXNzYWdlIGlzIGRpc3BhdGNoZWQuXG4gKiBAY2xhc3MgUHJlVG91cm5hbWVudEluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG59XG5cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5UWVBFID0gXCJwcmVUb3VybmFtZW50SW5mb1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldFRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGV4dDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENvdW50ZG93blxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldENvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jb3VudGRvd247XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMuY291bnRkb3duID0gZGF0YS5jb3VudGRvd247XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5QcmVUb3VybmFtZW50SW5mb01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZih0aGlzLmNvdW50ZG93biA8IDApXG5cdFx0dGhpcy5jb3VudGRvd24gPSAwO1xuXHRcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93blxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlKGJ1dHRvbikge1xuXHR0aGlzLmJ1dHRvbiA9IGJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IG51bGw7XG59XG5cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5UWVBFID0gXCJwcmVzZXRCdXR0b25DbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbiA9IGRhdGEuYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0YnV0dG9uOiB0aGlzLmJ1dHRvbixcblx0XHR2YWx1ZTogdGhpcy52YWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZTsiLCJ2YXIgUHJlc2V0QnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhL1ByZXNldEJ1dHRvbkRhdGFcIik7XG5cbi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFByZXNldEJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFByZXNldEJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmJ1dHRvbnMgPSBuZXcgQXJyYXkoNyk7XG5cdHRoaXMuY3VycmVudCA9IG51bGw7XG59XG5cblByZXNldEJ1dHRvbnNNZXNzYWdlLlRZUEUgPSBcInByZXNldEJ1dHRvbnNcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9ucztcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEN1cnJlbnRcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEN1cnJlbnQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY3VycmVudDtcbn1cblxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuUHJlc2V0QnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmN1cnJlbnQgPSBkYXRhLmN1cnJlbnQ7XG5cblx0dGhpcy5idXR0b25zID0gbmV3IEFycmF5KCk7XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IGRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b24gPSBkYXRhLmJ1dHRvbnNbaV07XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSBudWxsO1xuXG5cdFx0aWYoYnV0dG9uICE9IG51bGwpIHtcblx0XHRcdGJ1dHRvbkRhdGEgPSBuZXcgUHJlc2V0QnV0dG9uRGF0YSgpO1xuXG5cdFx0XHRidXR0b25EYXRhLmJ1dHRvbiA9IGJ1dHRvbi5idXR0b247XG5cdFx0XHRidXR0b25EYXRhLnZhbHVlID0gYnV0dG9uLnZhbHVlO1xuXHRcdH1cblxuXHRcdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbkRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBvYmplY3QgPSB7XG5cdFx0YnV0dG9uczogW10sXG5cdFx0Y3VycmVudDogdGhpcy5jdXJyZW50XG5cdH07XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b25EYXRhID0gdGhpcy5idXR0b25zW2ldO1xuXHRcdGlmKGJ1dHRvbkRhdGEgIT0gbnVsbClcblx0XHRcdG9iamVjdC5idXR0b25zLnB1c2goe1xuXHRcdFx0XHRidXR0b246IGJ1dHRvbkRhdGEuYnV0dG9uLFxuXHRcdFx0XHR2YWx1ZTogYnV0dG9uRGF0YS52YWx1ZVxuXHRcdFx0fSk7XG5cblx0XHRlbHNlXG5cdFx0XHRvYmplY3QuYnV0dG9ucy5wdXNoKG51bGwpO1xuXHR9XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdXR0b25zTWVzc2FnZTsiLCIvKipcbiAqIE1lc3NhZ2UgaW5kaWNhdGluZyB0aGF0IHRoZSB1c2VyIGhhcyBjbGlja2VkIGEgc2VhdC5cbiAqIEBjbGFzcyBTZWF0Q2xpY2tNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFNlYXRDbGlja01lc3NhZ2Uoc2VhdEluZGV4KSB7XG5cdHRoaXMuc2VhdEluZGV4PXNlYXRJbmRleDtcbn1cblxuU2VhdENsaWNrTWVzc2FnZS5UWVBFID0gXCJzZWF0Q2xpY2tcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5TZWF0Q2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblNlYXRDbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2VhdENsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0Q2xpY2tNZXNzYWdlOyIsIi8qKlxuICogU2hvdyB1c2VybmFtZSBhbmQgY2hpcHMgb24gc2VhdC5cbiAqIEBjbGFzcyBTZWF0SW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gU2VhdEluZm9NZXNzYWdlKHNlYXRJbmRleCkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblx0dGhpcy5hY3RpdmUgPSB0cnVlO1xuXHR0aGlzLnNpdG91dCA9IGZhbHNlO1xuXHR0aGlzLm5hbWUgPSBcIlwiO1xuXHR0aGlzLmNoaXBzID0gXCJcIjtcbn1cblxuU2VhdEluZm9NZXNzYWdlLlRZUEUgPSBcInNlYXRJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0TmFtZVxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldE5hbWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubmFtZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoaXBzXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2hpcHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hpcHM7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBpc1NpdG91dFxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmlzU2l0b3V0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNpdG91dDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGlzQWN0aXZlXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuaXNBY3RpdmUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYWN0aXZlO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0QWN0aXZlXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0QWN0aXZlID0gZnVuY3Rpb24odikge1xuXHR0aGlzLmFjdGl2ZSA9IHY7XG59XG5cbi8qKlxuICogU2V0IHNpdG91dC5cbiAqIEBtZXRob2Qgc2V0U2l0b3V0XG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0U2l0b3V0ID0gZnVuY3Rpb24odikge1xuXHR0aGlzLnNpdG91dCA9IHY7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXROYW1lXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0TmFtZSA9IGZ1bmN0aW9uKHYpIHtcblx0dGhpcy5uYW1lID0gdjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldENoaXBzXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2V0Q2hpcHMgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuY2hpcHMgPSB2O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuXHR0aGlzLmNoaXBzID0gZGF0YS5jaGlwcztcblx0dGhpcy5zaXRvdXQgPSBkYXRhLnNpdG91dDtcblx0dGhpcy5hY3RpdmUgPSBkYXRhLmFjdGl2ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHRuYW1lOiB0aGlzLm5hbWUsXG5cdFx0Y2hpcHM6IHRoaXMuY2hpcHMsXG5cdFx0c2l0b3V0OiB0aGlzLnNpdG91dCxcblx0XHRhY3RpdmU6IHRoaXMuYWN0aXZlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VhdEluZm9NZXNzYWdlOyIsIi8qKlxuICogU2hvdyBkaWFsb2csIGZvciBlLmcuIGJ1eSBpbi5cbiAqIEBjbGFzcyBTaG93RGlhbG9nTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTaG93RGlhbG9nTWVzc2FnZSgpIHtcblx0dGhpcy50ZXh0ID0gXCJcIjtcblx0dGhpcy5idXR0b25zID0gW107XG5cdHRoaXMuZGVmYXVsdFZhbHVlID0gbnVsbDtcbn1cblxuU2hvd0RpYWxvZ01lc3NhZ2UuVFlQRSA9IFwic2hvd0RpYWxvZ1wiO1xuXG4vKipcbiAqIEFkZCBhIGJ1dHRvbiB0byB0aGUgZGlhbG9nLlxuICogQG1ldGhvZCBhZGRCdXR0b25cbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uKGJ1dHRvbikge1xuXHR0aGlzLmJ1dHRvbnMucHVzaChidXR0b24pO1xufVxuXG4vKipcbiAqIEdldCB0ZXh0IG9mIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGdldFRleHRcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldFRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGV4dDtcbn1cblxuLyoqXG4gKiBHZXQgYXJyYXkgb2YgQnV0dG9uRGF0YSB0byBiZSBzaG93biBpbiB0aGUgZGlhbG9nLlxuICogQG1ldGhvZCBnZXRCdXR0b25zXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbnM7XG59XG5cbi8qKlxuICogR2V0IGRlZmF1bHQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldERlZmF1bHRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogU2V0IGRlZmF1bHQgdmFsdWUuXG4gKiBAbWV0aG9kIHNldERlZmF1bHRWYWx1ZVxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuc2V0RGVmYXVsdFZhbHVlID0gZnVuY3Rpb24odikge1xuXHR0aGlzLmRlZmF1bHRWYWx1ZT12O1xufVxuXG4vKipcbiAqIFNldCB0ZXh0IGluIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHRoaXMudGV4dCA9IHRleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMuYnV0dG9ucyA9IGRhdGEuYnV0dG9ucztcblx0dGhpcy5kZWZhdWx0VmFsdWUgPSBkYXRhLmRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0YnV0dG9uczogdGhpcy5idXR0b25zLFxuXHRcdGRlZmF1bHRWYWx1ZTogdGhpcy5kZWZhdWx0VmFsdWVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaG93RGlhbG9nTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBTdGF0ZUNvbXBsZXRlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTdGF0ZUNvbXBsZXRlTWVzc2FnZSgpIHt9XG5cblN0YXRlQ29tcGxldGVNZXNzYWdlLlRZUEUgPSBcInN0YXRlQ29tcGxldGVcIjtcblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5TdGF0ZUNvbXBsZXRlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7fVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU3RhdGVDb21wbGV0ZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdGVDb21wbGV0ZU1lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuIHRhYmxlIGJ1dHRvbiBjbGlja2VkLlxuICogQGNsYXNzIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlKHRhYmxlSW5kZXgpIHtcblx0dGhpcy50YWJsZUluZGV4ID0gdGFibGVJbmRleDtcbn1cblxuVGFibGVCdXR0b25DbGlja01lc3NhZ2UuVFlQRSA9IFwidGFibGVCdXR0b25DbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGFibGVJbmRleFxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGFibGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50YWJsZUluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRhYmxlSW5kZXggPSBkYXRhLnRhYmxlSW5kZXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGFibGVJbmRleDogdGhpcy50YWJsZUluZGV4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGFibGVCdXR0b25DbGlja01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgVGFibGVCdXR0b25zTWVzc2FnZVxuICovXG5mdW5jdGlvbiBUYWJsZUJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmVuYWJsZWQgPSBuZXcgQXJyYXkoKTtcblx0dGhpcy5jdXJyZW50SW5kZXggPSAtMTtcblx0dGhpcy5wbGF5ZXJJbmRleCA9IC0xO1xuXHR0aGlzLmluZm9MaW5rID0gXCJcIjtcbn1cblxuVGFibGVCdXR0b25zTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUJ1dHRvbnNcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEVuYWJsZWRcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5lbmFibGVkO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q3VycmVudEluZGV4XG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEN1cnJlbnRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jdXJyZW50SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRQbGF5ZXJJbmRleFxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRQbGF5ZXJJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5wbGF5ZXJJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEluZm9MaW5rXG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMucGxheWVySW5kZXggPSBkYXRhLnBsYXllckluZGV4O1xuXHR0aGlzLmN1cnJlbnRJbmRleCA9IGRhdGEuY3VycmVudEluZGV4O1xuXHR0aGlzLmluZm9MaW5rID0gZGF0YS5pbmZvTGluaztcblxuXHR0aGlzLmVuYWJsZWQgPSBuZXcgQXJyYXkoKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IGRhdGEuZW5hYmxlZC5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmVuYWJsZWQucHVzaChkYXRhLmVuYWJsZWRbaV0pO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBvYmplY3QgPSB7XG5cdFx0Y3VycmVudEluZGV4OiB0aGlzLmN1cnJlbnRJbmRleCxcblx0XHRwbGF5ZXJJbmRleDogdGhpcy5wbGF5ZXJJbmRleCxcblx0XHRlbmFibGVkOiBbXSxcblx0XHRpbmZvTGluazogdGhpcy5pbmZvTGlua1xuXHR9O1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmVuYWJsZWQubGVuZ3RoOyBpKyspXG5cdFx0b2JqZWN0LmVuYWJsZWQucHVzaCh0aGlzLmVuYWJsZWRbaV0pO1xuXG5cdHJldHVybiBvYmplY3Q7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGFibGVCdXR0b25zTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUYWJsZUluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlSW5mb01lc3NhZ2UodGV4dCwgY291bnRkb3duKSB7XG5cdHRoaXMuY291bnRkb3duID0gY291bnRkb3duO1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLnNob3dKb2luQnV0dG9uID0gZmFsc2U7XG5cdHRoaXMuc2hvd0xlYXZlQnV0dG9uID0gZmFsc2U7XG5cdHRoaXMuaW5mb0xpbmsgPSBudWxsO1xuXHR0aGlzLmluZm9MaW5rVGV4dCA9IG51bGw7XG59XG5cblRhYmxlSW5mb01lc3NhZ2UuVFlQRSA9IFwidGFibGVJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDb3VudGRvd25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q291bnRkb3duID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRleHRcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2hvd0pvaW5CdXR0b25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2hvd0pvaW5CdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2hvd0pvaW5CdXR0b247XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTaG93TGVhdmVCdXR0b25cbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2hvd0xlYXZlQnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNob3dMZWF2ZUJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEluZm9MaW5rXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtUZXh0XG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLmdldEluZm9MaW5rVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5pbmZvTGlua1RleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0aWYoZGF0YS50ZXh0ICE9IG51bGwpXG5cdFx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXG5cdGlmKGRhdGEuY291bnRkb3duICE9IG51bGwpXG5cdFx0dGhpcy5jb3VudGRvd24gPSBkYXRhLmNvdW50ZG93bjtcblxuXHRpZihkYXRhLnNob3dKb2luQnV0dG9uICE9IG51bGwpXG5cdFx0dGhpcy5zaG93Sm9pbkJ1dHRvbiA9IGRhdGEuc2hvd0pvaW5CdXR0b247XG5cblx0aWYoZGF0YS5zaG93TGVhdmVCdXR0b24gIT0gbnVsbClcblx0XHR0aGlzLnNob3dMZWF2ZUJ1dHRvbiA9IGRhdGEuc2hvd0xlYXZlQnV0dG9uO1xuXG5cdGlmKGRhdGEuaW5mb0xpbmsgIT0gbnVsbClcblx0XHR0aGlzLmluZm9MaW5rID0gZGF0YS5pbmZvTGluaztcblxuXHRpZihkYXRhLmluZm9MaW5rVGV4dCAhPSBudWxsKVxuXHRcdHRoaXMuaW5mb0xpbmtUZXh0ID0gZGF0YS5pbmZvTGlua1RleHQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93bixcblx0XHRzaG93Sm9pbkJ1dHRvbjogdGhpcy5zaG93Sm9pbkJ1dHRvbixcblx0XHRzaG93TGVhdmVCdXR0b246IHRoaXMuc2hvd0xlYXZlQnV0dG9uLFxuXHRcdGluZm9MaW5rOiB0aGlzLmluZm9MaW5rLFxuXHRcdGluZm9MaW5rVGV4dDogdGhpcy5pbmZvTGlua1RleHRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUluZm9NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRlc3RDYXNlUmVxdWVzdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZSh0ZXN0Q2FzZSkge1xuXHR0aGlzLnRlc3RDYXNlID0gdGVzdENhc2U7XG59XG5cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UuVFlQRSA9IFwidGVzdENhc2VSZXF1ZXN0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXN0Q2FzZVxuICovXG5UZXN0Q2FzZVJlcXVlc3RNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXN0Q2FzZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXN0Q2FzZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRlc3RDYXNlID0gZGF0YS50ZXN0Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRlc3RDYXNlOiB0aGlzLnRlc3RDYXNlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUaW1lck1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGltZXJNZXNzYWdlKCkge1xuXHR0aGlzLnNlYXRJbmRleCA9IC0xO1xuXHR0aGlzLnRvdGFsVGltZSA9IC0xO1xuXHR0aGlzLnRpbWVMZWZ0ID0gLTE7XG59XG5cblRpbWVyTWVzc2FnZS5UWVBFID0gXCJ0aW1lclwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRvdGFsVGltZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLmdldFRvdGFsVGltZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50b3RhbFRpbWU7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUaW1lTGVmdFxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLmdldFRpbWVMZWZ0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRpbWVMZWZ0O1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0U2VhdEluZGV4XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0U2VhdEluZGV4ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5zZWF0SW5kZXggPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldFRvdGFsVGltZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNldFRvdGFsVGltZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMudG90YWxUaW1lID0gdmFsdWU7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRUaW1lTGVmdFxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNldFRpbWVMZWZ0ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy50aW1lTGVmdCA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBkYXRhLnNlYXRJbmRleDtcblx0dGhpcy50b3RhbFRpbWUgPSBkYXRhLnRvdGFsVGltZTtcblx0dGhpcy50aW1lTGVmdCA9IGRhdGEudGltZUxlZnQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0dG90YWxUaW1lOiB0aGlzLnRvdGFsVGltZSxcblx0XHR0aW1lTGVmdDogdGhpcy50aW1lTGVmdFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVyTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gdG91cm5hbWVudCByZXN1bHQgbWVzc2FnZSBpcyBkaXNwYXRjaGVkLlxuICogQGNsYXNzIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlKHRleHQsIHJpZ2h0Q29sdW1uVGV4dCkge1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLnJpZ2h0Q29sdW1uVGV4dCA9IHJpZ2h0Q29sdW1uVGV4dDtcbn1cblxuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UuVFlQRSA9IFwidG91cm5hbWVudFJlc3VsdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0UmlnaHRDb2x1bW5UZXh0XG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5nZXRSaWdodENvbHVtblRleHQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMucmlnaHRDb2x1bW5UZXh0O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cdHRoaXMucmlnaHRDb2x1bW5UZXh0ID0gZGF0YS5yaWdodENvbHVtblRleHQ7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGV4dDogdGhpcy50ZXh0LFxuXHRcdHJpZ2h0Q29sdW1uVGV4dDogdGhpcy5yaWdodENvbHVtblRleHRcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUb3VybmFtZW50UmVzdWx0TWVzc2FnZTsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogQnV0dG9uLlxuICogQGNsYXNzIEJ1dHRvblxuICovXG5mdW5jdGlvbiBCdXR0b24oY29udGVudCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHRpZiAoY29udGVudClcblx0XHR0aGlzLmFkZENoaWxkKGNvbnRlbnQpO1xuXG5cdHRoaXMuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHR0aGlzLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXG5cdHRoaXMubW91c2VvdmVyID0gdGhpcy5vbk1vdXNlb3Zlci5iaW5kKHRoaXMpO1xuXHR0aGlzLm1vdXNlb3V0ID0gdGhpcy5vbk1vdXNlb3V0LmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2Vkb3duID0gdGhpcy5vbk1vdXNlZG93bi5iaW5kKHRoaXMpO1xuXHR0aGlzLm1vdXNldXAgPSB0aGlzLm9uTW91c2V1cC5iaW5kKHRoaXMpO1xuXHR0aGlzLmNsaWNrID0gdGhpcy5vbkNsaWNrLmJpbmQodGhpcyk7XG5cblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlciA9IG5ldyBQSVhJLkNvbG9yTWF0cml4RmlsdGVyKCk7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG5cdHRoaXMuZmlsdGVycyA9IFt0aGlzLmNvbG9yTWF0cml4RmlsdGVyXTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChCdXR0b24sIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChCdXR0b24pO1xuXG5CdXR0b24uTElHSFRfTUFUUklYID0gWzEuNSwgMCwgMCwgMCwgMCwgMS41LCAwLCAwLCAwLCAwLCAxLjUsIDAsIDAsIDAsIDAsIDFdO1xuQnV0dG9uLkRBUktfTUFUUklYID0gWy43NSwgMCwgMCwgMCwgMCwgLjc1LCAwLCAwLCAwLCAwLCAuNzUsIDAsIDAsIDAsIDAsIDFdO1xuQnV0dG9uLkRFRkFVTFRfTUFUUklYID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG5CdXR0b24uQ0xJQ0sgPSBcImNsaWNrXCI7XG5cbi8qKlxuICogTW91c2Ugb3Zlci5cbiAqIEBtZXRob2Qgb25Nb3VzZW92ZXJcbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uTElHSFRfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIG91dC5cbiAqIEBtZXRob2Qgb25Nb3VzZW91dFxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkRFRkFVTFRfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIGRvd24uXG4gKiBAbWV0aG9kIG9uTW91c2Vkb3duXG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uTW91c2Vkb3duID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkRBUktfTUFUUklYO1xufVxuXG4vKipcbiAqIE1vdXNlIHVwLlxuICogQG1ldGhvZCBvbk1vdXNldXBcbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZXVwID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY29sb3JNYXRyaXhGaWx0ZXIubWF0cml4ID0gQnV0dG9uLkxJR0hUX01BVFJJWDtcbn1cblxuLyoqXG4gKiBDbGljay5cbiAqIEBtZXRob2Qgb25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbkNsaWNrID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHJpZ2dlcihCdXR0b24uQ0xJQ0spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4vQnV0dG9uXCIpO1xuXG4vKipcbiAqIENoZWNrYm94LlxuICogQGNsYXNzIENoZWNrYm94XG4gKi9cbmZ1bmN0aW9uIENoZWNrYm94KGJhY2tncm91bmQsIHRpY2spIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5idXR0b24gPSBuZXcgQnV0dG9uKGJhY2tncm91bmQpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYnV0dG9uKTtcblxuXHR0aGlzLmNoZWNrID0gdGljaztcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoZWNrKTtcblxuXHR0aGlzLmJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblxuXHR0aGlzLnNldENoZWNrZWQoZmFsc2UpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKENoZWNrYm94LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoQ2hlY2tib3gpO1xuXG4vKipcbiAqIEJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jaGVjay52aXNpYmxlID0gIXRoaXMuY2hlY2sudmlzaWJsZTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIik7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRDaGVja2VkXG4gKi9cbkNoZWNrYm94LnByb3RvdHlwZS5zZXRDaGVja2VkID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy5jaGVjay52aXNpYmxlID0gdmFsdWU7XG5cdHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoZWNrZWRcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLmdldENoZWNrZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2hlY2sudmlzaWJsZTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBQSVhJPXJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbD1yZXF1aXJlKFwiLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xuXG5mdW5jdGlvbiBDb250ZW50U2NhbGVyKGNvbnRlbnQpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5jb250ZW50V2lkdGg9MTAwO1xuXHR0aGlzLmNvbnRlbnRIZWlnaHQ9MTAwO1xuXG5cdHRoaXMuc2NyZWVuV2lkdGg9MTAwO1xuXHR0aGlzLnNjcmVlbkhlaWdodD0xMDA7XG5cblx0dGhpcy50aGVNYXNrPW51bGw7XG5cblx0aWYgKGNvbnRlbnQpXG5cdFx0dGhpcy5zZXRDb250ZW50KGNvbnRlbnQpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKENvbnRlbnRTY2FsZXIsUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUuc2V0Q29udGVudD1mdW5jdGlvbihjb250ZW50KSB7XG5cdHRoaXMuY29udGVudD1jb250ZW50O1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5jb250ZW50KTtcblxuXHRpZiAodGhpcy50aGVNYXNrKSB7XG5cdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLnRoZU1hc2spO1xuXHRcdHRoaXMudGhlTWFzaz1udWxsO1xuXHR9XG5cblx0dGhpcy50aGVNYXNrPW5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdC8vdGhpcy5hZGRDaGlsZCh0aGlzLnRoZU1hc2spO1xuXG5cdHRoaXMudXBkYXRlU2NhbGUoKTtcbn1cblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUuc2V0Q29udGVudFNpemU9ZnVuY3Rpb24oY29udGVudFdpZHRoLCBjb250ZW50SGVpZ2h0KSB7XG5cdHRoaXMuY29udGVudFdpZHRoPWNvbnRlbnRXaWR0aDtcblx0dGhpcy5jb250ZW50SGVpZ2h0PWNvbnRlbnRIZWlnaHQ7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRTY3JlZW5TaXplPWZ1bmN0aW9uKHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpIHtcblx0dGhpcy5zY3JlZW5XaWR0aD1zY3JlZW5XaWR0aDtcblx0dGhpcy5zY3JlZW5IZWlnaHQ9c2NyZWVuSGVpZ2h0O1xuXG5cdHRoaXMudXBkYXRlU2NhbGUoKTtcbn1cblxuQ29udGVudFNjYWxlci5wcm90b3R5cGUudXBkYXRlU2NhbGU9ZnVuY3Rpb24oKSB7XG5cdHZhciBzY2FsZTtcblxuXHRpZiAodGhpcy5zY3JlZW5XaWR0aC90aGlzLmNvbnRlbnRXaWR0aDx0aGlzLnNjcmVlbkhlaWdodC90aGlzLmNvbnRlbnRIZWlnaHQpXG5cdFx0c2NhbGU9dGhpcy5zY3JlZW5XaWR0aC90aGlzLmNvbnRlbnRXaWR0aDtcblxuXHRlbHNlXG5cdFx0c2NhbGU9dGhpcy5zY3JlZW5IZWlnaHQvdGhpcy5jb250ZW50SGVpZ2h0O1xuXG5cdHRoaXMuY29udGVudC5zY2FsZS54PXNjYWxlO1xuXHR0aGlzLmNvbnRlbnQuc2NhbGUueT1zY2FsZTtcblxuXHR2YXIgc2NhbGVkV2lkdGg9dGhpcy5jb250ZW50V2lkdGgqc2NhbGU7XG5cdHZhciBzY2FsZWRIZWlnaHQ9dGhpcy5jb250ZW50SGVpZ2h0KnNjYWxlO1xuXG5cdHRoaXMuY29udGVudC5wb3NpdGlvbi54PSh0aGlzLnNjcmVlbldpZHRoLXNjYWxlZFdpZHRoKS8yO1xuXHR0aGlzLmNvbnRlbnQucG9zaXRpb24ueT0odGhpcy5zY3JlZW5IZWlnaHQtc2NhbGVkSGVpZ2h0KS8yO1xuXG5cdHZhciByPW5ldyBQSVhJLlJlY3RhbmdsZSh0aGlzLmNvbnRlbnQucG9zaXRpb24ueCx0aGlzLmNvbnRlbnQucG9zaXRpb24ueSxzY2FsZWRXaWR0aCxzY2FsZWRIZWlnaHQpO1xuXHR2YXIgcmlnaHQ9ci54K3Iud2lkdGg7XG5cdHZhciBib3R0b209ci55K3IuaGVpZ2h0O1xuXG5cdHRoaXMudGhlTWFzay5jbGVhcigpO1xuXHR0aGlzLnRoZU1hc2suYmVnaW5GaWxsKCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLDAsdGhpcy5zY3JlZW5XaWR0aCxyLnkpO1xuXHR0aGlzLnRoZU1hc2suZHJhd1JlY3QoMCwwLHIueCx0aGlzLnNjcmVlbkhlaWdodCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdChyaWdodCwwLHRoaXMuc2NyZWVuV2lkdGgtcmlnaHQsdGhpcy5zY3JlZW5IZWlnaHQpO1xuXHR0aGlzLnRoZU1hc2suZHJhd1JlY3QoMCxib3R0b20sdGhpcy5zY3JlZW5XaWR0aCx0aGlzLnNjcmVlbkhlaWdodC1ib3R0b20pO1xuXHR0aGlzLnRoZU1hc2suZW5kRmlsbCgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cz1Db250ZW50U2NhbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIEFTMy9qcXVlcnkgc3R5bGUgZXZlbnQgZGlzcGF0Y2hlci4gU2xpZ2h0bHkgbW9kaWZpZWQuIFRoZVxuICoganF1ZXJ5IHN0eWxlIG9uL29mZi90cmlnZ2VyIHN0eWxlIG9mIGFkZGluZyBsaXN0ZW5lcnMgaXNcbiAqIGN1cnJlbnRseSB0aGUgcHJlZmVycmVkIG9uZS5cbiAqIFxuICogVGhlIG9uIG1ldGhvZCBmb3IgYWRkaW5nIGxpc3RlbmVycyB0YWtlcyBhbiBleHRyYSBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlXG4gKiBzY29wZSBpbiB3aGljaCBsaXN0ZW5lcnMgc2hvdWxkIGJlIGNhbGxlZC4gU28gdGhpczpcbiAqXG4gKiAgICAgb2JqZWN0Lm9uKFwiZXZlbnRcIiwgbGlzdGVuZXIsIHRoaXMpO1xuICpcbiAqIEhhcyB0aGUgc2FtZSBmdW5jdGlvbiB3aGVuIGFkZGluZyBldmVudHMgYXM6XG4gKlxuICogICAgIG9iamVjdC5vbihcImV2ZW50XCIsIGxpc3RlbmVyLmJpbmQodGhpcykpO1xuICpcbiAqIEhvd2V2ZXIsIHRoZSBkaWZmZXJlbmNlIGlzIHRoYXQgaWYgd2UgdXNlIHRoZSBzZWNvbmQgbWV0aG9kIGl0XG4gKiB3aWxsIG5vdCBiZSBwb3NzaWJsZSB0byByZW1vdmUgdGhlIGxpc3RlbmVycyBsYXRlciwgdW5sZXNzXG4gKiB0aGUgY2xvc3VyZSBjcmVhdGVkIGJ5IGJpbmQgaXMgc3RvcmVkIHNvbWV3aGVyZS4gSWYgdGhlIFxuICogZmlyc3QgbWV0aG9kIGlzIHVzZWQsIHdlIGNhbiByZW1vdmUgdGhlIGxpc3RlbmVyIHdpdGg6XG4gKlxuICogICAgIG9iamVjdC5vZmYoXCJldmVudFwiLCBsaXN0ZW5lciwgdGhpcyk7XG4gKlxuICogQGNsYXNzIEV2ZW50RGlzcGF0Y2hlclxuICovXG5mdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG5cdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcbn1cblxuLyoqXG4gKiBBZGQgZXZlbnQgbGlzdGVuZXIuXG4gKiBAbWV0aG9kIGFkZEV2ZW50TGlzdGVuZXJcbiAqIEBkZXByZWNhdGVkXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKCFldmVudFR5cGUpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgdHlwZSByZXF1aXJlZCBmb3IgZXZlbnQgZGlzcGF0Y2hlclwiKTtcblxuXHRpZiAoIWxpc3RlbmVyKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIkxpc3RlbmVyIHJlcXVpcmVkIGZvciBldmVudCBkaXNwYXRjaGVyXCIpO1xuXG5cdHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGxpc3RlbmVyLCBzY29wZSk7XG5cblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpXG5cdFx0dGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdID0gW107XG5cblx0dGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdLnB1c2goe1xuXHRcdGxpc3RlbmVyOiBsaXN0ZW5lcixcblx0XHRzY29wZTogc2NvcGVcblx0fSk7XG59XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVyLlxuICogQG1ldGhvZCByZW1vdmVFdmVudExpc3RlbmVyXG4gKiBAZGVwcmVjYXRlZFxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudFR5cGUsIGxpc3RlbmVyLCBzY29wZSkge1xuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXApXG5cdFx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuXG5cdGlmICghdGhpcy5saXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKVxuXHRcdHJldHVybjtcblxuXHR2YXIgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGxpc3RlbmVyT2JqID0gbGlzdGVuZXJzW2ldO1xuXG5cdFx0aWYgKGxpc3RlbmVyID09IGxpc3RlbmVyT2JqLmxpc3RlbmVyICYmIHNjb3BlID09IGxpc3RlbmVyT2JqLnNjb3BlKSB7XG5cdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0aS0tO1xuXHRcdH1cblx0fVxuXG5cdGlmICghbGlzdGVuZXJzLmxlbmd0aClcblx0XHRkZWxldGUgdGhpcy5saXN0ZW5lck1hcFtldmVudFR5cGVdO1xufVxuXG4vKipcbiAqIERpc3BhdGNoIGV2ZW50LlxuICogQG1ldGhvZCBkaXNwYXRjaEV2ZW50XG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKHR5cGVvZiBldmVudCA9PSBcInN0cmluZ1wiKSB7XG5cdFx0ZXZlbnQgPSB7XG5cdFx0XHR0eXBlOiBldmVudFxuXHRcdH07XG5cdH1cblxuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoZXZlbnQudHlwZSkpXG5cdFx0cmV0dXJuO1xuXG5cdGlmIChkYXRhID09IHVuZGVmaW5lZClcblx0XHRkYXRhID0gZXZlbnQ7XG5cblx0ZGF0YS50YXJnZXQgPSB0aGlzO1xuXG5cdGZvciAodmFyIGkgaW4gdGhpcy5saXN0ZW5lck1hcFtldmVudC50eXBlXSkge1xuXHRcdHZhciBsaXN0ZW5lck9iaiA9IHRoaXMubGlzdGVuZXJNYXBbZXZlbnQudHlwZV1baV07XG5cblx0XHRsaXN0ZW5lck9iai5saXN0ZW5lci5jYWxsKGxpc3RlbmVyT2JqLnNjb3BlLCBkYXRhKTtcblx0fVxufVxuXG4vKipcbiAqIEpxdWVyeSBzdHlsZSBhbGlhcyBmb3IgYWRkRXZlbnRMaXN0ZW5lclxuICogQG1ldGhvZCBvblxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xuXG4vKipcbiAqIEpxdWVyeSBzdHlsZSBhbGlhcyBmb3IgcmVtb3ZlRXZlbnRMaXN0ZW5lclxuICogQG1ldGhvZCBvZmZcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciBkaXNwYXRjaEV2ZW50XG4gKiBAbWV0aG9kIHRyaWdnZXJcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xuXG4vKipcbiAqIE1ha2Ugc29tZXRoaW5nIGFuIGV2ZW50IGRpc3BhdGNoZXIuIENhbiBiZSB1c2VkIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS5cbiAqIEBtZXRob2QgaW5pdFxuICogQHN0YXRpY1xuICovXG5FdmVudERpc3BhdGNoZXIuaW5pdCA9IGZ1bmN0aW9uKGNscykge1xuXHRjbHMucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XG5cdGNscy5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcblx0Y2xzLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50O1xuXHRjbHMucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbjtcblx0Y2xzLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZjtcblx0Y2xzLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjsiLCIvKipcbiAqIEZ1bmN0aW9uIHV0aWxzLlxuICogQGNsYXNzIEZ1bmN0aW9uVXRpbFxuICovXG5mdW5jdGlvbiBGdW5jdGlvblV0aWwoKSB7XG59XG5cbi8qKlxuICogRXh0ZW5kIGEgY2xhc3MuXG4gKiBEb24ndCBmb3JnZXQgdG8gY2FsbCBzdXBlci5cbiAqIEBtZXRob2QgZXh0ZW5kXG4gKiBAc3RhdGljXG4gKi9cbkZ1bmN0aW9uVXRpbC5leHRlbmQ9ZnVuY3Rpb24odGFyZ2V0LCBiYXNlKSB7XG5cdHRhcmdldC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiYXNlLnByb3RvdHlwZSk7XG5cdHRhcmdldC5wcm90b3R5cGUuY29uc3RydWN0b3I9dGFyZ2V0O1xufVxuXG4vKipcbiAqIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvbi4gRGVwcmVjYXRlZCwgdXNlIGJpbmQoKSBpbnN0ZWFkLlxuICogQG1ldGhvZCBjcmVhdGVEZWxlZ2F0ZVxuICogQGRlcHJlY2F0ZWRcbiAqIEBzdGF0aWNcbiAqL1xuRnVuY3Rpb25VdGlsLmNyZWF0ZURlbGVnYXRlPWZ1bmN0aW9uKGZ1bmMsIHNjb3BlKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRmdW5jLmFwcGx5KHNjb3BlLGFyZ3VtZW50cyk7XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzPUZ1bmN0aW9uVXRpbDtcbiIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHNwcml0ZSB3aXRoIGEgZ3JhZGllbnQuXG4gKiBAY2xhc3MgR3JhZGllbnRcbiAqL1xuZnVuY3Rpb24gR3JhZGllbnQoKSB7XG5cdHRoaXMud2lkdGggPSAxMDA7XG5cdHRoaXMuaGVpZ2h0ID0gMTAwO1xuXHR0aGlzLnN0b3BzID0gW107XG59XG5cbi8qKlxuICogU2V0IHNpemUgb2YgdGhlIGdyYWRpZW50LlxuICogQG1ldGhvZCBzZXRTaXplXG4gKi9cbkdyYWRpZW50LnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24odywgaCkge1xuXHR0aGlzLndpZHRoID0gdztcblx0dGhpcy5oZWlnaHQgPSBoO1xufVxuXG4vKipcbiAqIEFkZCBjb2xvciBzdG9wLlxuICogQG1ldGhvZCBhZGRDb2xvclN0b3BcbiAqL1xuR3JhZGllbnQucHJvdG90eXBlLmFkZENvbG9yU3RvcCA9IGZ1bmN0aW9uKHdlaWdodCwgY29sb3IpIHtcblx0dGhpcy5zdG9wcy5wdXNoKHtcblx0XHR3ZWlnaHQ6IHdlaWdodCxcblx0XHRjb2xvcjogY29sb3Jcblx0fSk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBzcHJpdGUuXG4gKiBAbWV0aG9kIGNyZWF0ZVNwcml0ZVxuICovXG5HcmFkaWVudC5wcm90b3R5cGUuY3JlYXRlU3ByaXRlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIGdyYWRpZW50Li4uXCIpO1xuXHR2YXIgYyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG5cdGMud2lkdGggPSB0aGlzLndpZHRoO1xuXHRjLmhlaWdodCA9IHRoaXMuaGVpZ2h0O1xuXG5cdHZhciBjdHggPSBjLmdldENvbnRleHQoXCIyZFwiKTtcblx0dmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCB0aGlzLmhlaWdodCk7XG5cdHZhciBpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLnN0b3BzLmxlbmd0aDsgaSsrKVxuXHRcdGdyZC5hZGRDb2xvclN0b3AodGhpcy5zdG9wc1tpXS53ZWlnaHQsIHRoaXMuc3RvcHNbaV0uY29sb3IpO1xuXG5cdGN0eC5maWxsU3R5bGUgPSBncmQ7XG5cdGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG5cblx0cmV0dXJuIG5ldyBQSVhJLlNwcml0ZShQSVhJLlRleHR1cmUuZnJvbUNhbnZhcyhjKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR3JhZGllbnQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgVGhlbmFibGUgPSByZXF1aXJlKFwiLi9UaGVuYWJsZVwiKTtcblxuLyoqXG4gKiBNZXNzYWdlIGNvbm5lY3Rpb24gaW4gYSBicm93c2VyLlxuICogQGNsYXNzIE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uKCkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblx0dGhpcy50ZXN0ID0gMTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbiwgRXZlbnREaXNwYXRjaGVyKTtcblxuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ09OTkVDVCA9IFwiY29ubmVjdFwiO1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uTUVTU0FHRSA9IFwibWVzc2FnZVwiO1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UgPSBcImNsb3NlXCI7XG5cbi8qKlxuICogQ29ubmVjdC5cbiAqIEBtZXRob2QgY29ubmVjdFxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKHVybCkge1xuXHR0aGlzLndlYlNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcblxuXHR0aGlzLndlYlNvY2tldC5vbm9wZW4gPSB0aGlzLm9uV2ViU29ja2V0T3Blbi5iaW5kKHRoaXMpO1xuXHR0aGlzLndlYlNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLm9uV2ViU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpO1xuXHR0aGlzLndlYlNvY2tldC5vbmNsb3NlID0gdGhpcy5vbldlYlNvY2tldENsb3NlLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9uZXJyb3IgPSB0aGlzLm9uV2ViU29ja2V0RXJyb3IuYmluZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBTZW5kLlxuICogQG1ldGhvZCBzZW5kXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obSkge1xuXHR0aGlzLndlYlNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KG0pKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IG9wZW4uXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0T3BlblxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0T3BlbiA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ09OTkVDVCk7XG59XG5cbi8qKlxuICogV2ViIHNvY2tldCBtZXNzYWdlLlxuICogQG1ldGhvZCBvbldlYlNvY2tldE1lc3NhZ2VcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldE1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuXG5cdHRoaXMudHJpZ2dlcih7XG5cdFx0dHlwZTogTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uTUVTU0FHRSxcblx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdH0pO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgY2xvc2UuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0Q2xvc2VcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldENsb3NlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwid2ViIHNvY2tldCBjbG9zZSwgd3M9XCIgKyB0aGlzLndlYlNvY2tldCArIFwiIHRoaXM9XCIgKyB0aGlzLnRlc3QpO1xuXHR0aGlzLndlYlNvY2tldC5jbG9zZSgpO1xuXHR0aGlzLmNsZWFyV2ViU29ja2V0KCk7XG5cblx0dGhpcy50cmlnZ2VyKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNMT1NFKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IGVycm9yLlxuICogQG1ldGhvZCBvbldlYlNvY2tldEVycm9yXG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUub25XZWJTb2NrZXRFcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcIndlYiBzb2NrZXQgZXJyb3IsIHdzPVwiICsgdGhpcy53ZWJTb2NrZXQgKyBcIiB0aGlzPVwiICsgdGhpcy50ZXN0KTtcblxuXHR0aGlzLndlYlNvY2tldC5jbG9zZSgpO1xuXHR0aGlzLmNsZWFyV2ViU29ja2V0KCk7XG5cblx0dGhpcy50cmlnZ2VyKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLkNMT1NFKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgY3VycmVudCB3ZWIgc29ja2V0LlxuICogQG1ldGhvZCBjbGVhcldlYlNvY2tldFxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUuY2xlYXJXZWJTb2NrZXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy53ZWJTb2NrZXQub25vcGVuID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25tZXNzYWdlID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25jbG9zZSA9IG51bGw7XG5cdHRoaXMud2ViU29ja2V0Lm9uZXJyb3IgPSBudWxsO1xuXG5cdHRoaXMud2ViU29ja2V0ID0gbnVsbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogTW91c2VPdmVyR3JvdXAuIFRoaXMgaXMgdGhlIGNsYXNzIGZvciB0aGUgTW91c2VPdmVyR3JvdXAuXG4gKiBAY2xhc3MgTW91c2VPdmVyR3JvdXBcbiAqL1xuZnVuY3Rpb24gTW91c2VPdmVyR3JvdXAoKSB7XG5cdHRoaXMub2JqZWN0cyA9IG5ldyBBcnJheSgpO1xuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0dGhpcy5tb3VzZURvd24gPSBmYWxzZTtcblxufVxuRnVuY3Rpb25VdGlsLmV4dGVuZChNb3VzZU92ZXJHcm91cCwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KE1vdXNlT3Zlckdyb3VwKTtcblxuXG4vKipcbiAqIEFkZCBkaXNwbGF5b2JqZWN0IHRvIHdhdGNobGlzdC5cbiAqIEBtZXRob2QgYWRkRGlzcGxheU9iamVjdFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUuYWRkRGlzcGxheU9iamVjdCA9IGZ1bmN0aW9uKGRpc3BsYXlPYmplY3QpIHtcblxuXHRkaXNwbGF5T2JqZWN0LmludGVyYWN0aXZlID0gdHJ1ZTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW92ZXJFbmFibGVkID0gdHJ1ZTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW92ZXIgPSB0aGlzLm9uT2JqZWN0TW91c2VPdmVyLmJpbmQodGhpcyk7XG5cdGRpc3BsYXlPYmplY3QubW91c2VvdXQgPSB0aGlzLm9uT2JqZWN0TW91c2VPdXQuYmluZCh0aGlzKTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZWRvd24gPSB0aGlzLm9uT2JqZWN0TW91c2VEb3duLmJpbmQodGhpcyk7XG5cdHRoaXMub2JqZWN0cy5wdXNoKGRpc3BsYXlPYmplY3QpO1xuXG59XG5cblxuLyoqXG4gKiBNb3VzZSBvdmVyIG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZU92ZXJcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uT2JqZWN0TW91c2VPdmVyID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKHRoaXMuY3VycmVudGx5T3Zlcilcblx0XHRyZXR1cm47XG5cblx0dGhpcy5jdXJyZW50bHlPdmVyID0gdHJ1ZTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwibW91c2VvdmVyXCIpO1xufVxuXG5cbi8qKlxuICogTW91c2Ugb3V0IG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZU91dFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25PYmplY3RNb3VzZU91dCA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZighdGhpcy5jdXJyZW50bHlPdmVyIHx8IHRoaXMubW91c2VEb3duKVxuXHRcdHJldHVybjtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5vYmplY3RzLmxlbmd0aDsgaSsrKVxuXHRcdGlmKHRoaXMuaGl0VGVzdCh0aGlzLm9iamVjdHNbaV0sIGludGVyYWN0aW9uX29iamVjdCkpXG5cdFx0XHRyZXR1cm47XG5cblx0dGhpcy5jdXJyZW50bHlPdmVyID0gZmFsc2U7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcIm1vdXNlb3V0XCIpO1xufVxuXG5cbi8qKlxuICogSGl0IHRlc3QuXG4gKiBAbWV0aG9kIGhpdFRlc3RcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLmhpdFRlc3QgPSBmdW5jdGlvbihvYmplY3QsIGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZigoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54ID4gb2JqZWN0LmdldEJvdW5kcygpLnggKSAmJiAoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54IDwgKG9iamVjdC5nZXRCb3VuZHMoKS54ICsgb2JqZWN0LmdldEJvdW5kcygpLndpZHRoKSkgJiZcblx0XHQoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC55ID4gb2JqZWN0LmdldEJvdW5kcygpLnkpICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPCAob2JqZWN0LmdldEJvdW5kcygpLnkgKyBvYmplY3QuZ2V0Qm91bmRzKCkuaGVpZ2h0KSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcdFx0XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5cbi8qKlxuICogTW91c2UgZG93biBvYmplY3QuXG4gKiBAbWV0aG9kIG9uT2JqZWN0TW91c2VEb3duXG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5vbk9iamVjdE1vdXNlRG93biA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLm1vdXNlRG93biA9IHRydWU7XG5cdGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cCA9IGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cG91dHNpZGUgPSB0aGlzLm9uU3RhZ2VNb3VzZVVwLmJpbmQodGhpcyk7XG59XG5cblxuLyoqXG4gKiBNb3VzZSB1cCBzdGFnZS5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlVXBcbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uU3RhZ2VNb3VzZVVwID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cCA9IGludGVyYWN0aW9uX29iamVjdC50YXJnZXQubW91c2V1cG91dHNpZGUgPSBudWxsO1xuXHR0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuXG5cdGlmKHRoaXMuY3VycmVudGx5T3Zlcikge1xuXHRcdHZhciBvdmVyID0gZmFsc2U7XG5cblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5vYmplY3RzLmxlbmd0aDsgaSsrKVxuXHRcdFx0aWYodGhpcy5oaXRUZXN0KHRoaXMub2JqZWN0c1tpXSwgaW50ZXJhY3Rpb25fb2JqZWN0KSlcblx0XHRcdFx0b3ZlciA9IHRydWU7XG5cblx0XHRpZighb3Zlcikge1xuXHRcdFx0dGhpcy5jdXJyZW50bHlPdmVyID0gZmFsc2U7XG5cdFx0XHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJtb3VzZW91dFwiKTtcblx0XHR9XG5cdH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlT3Zlckdyb3VwO1xuXG4iLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcblxuLyoqXG4gKiBOaW5lIHNsaWNlLiBUaGlzIGlzIGEgc3ByaXRlIHRoYXQgaXMgYSBncmlkLCBhbmQgb25seSB0aGVcbiAqIG1pZGRsZSBwYXJ0IHN0cmV0Y2hlcyB3aGVuIHNjYWxpbmcuXG4gKiBAY2xhc3MgTmluZVNsaWNlXG4gKi9cbmZ1bmN0aW9uIE5pbmVTbGljZSh0ZXh0dXJlLCBsZWZ0LCB0b3AsIHJpZ2h0LCBib3R0b20pIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy50ZXh0dXJlID0gdGV4dHVyZTtcblxuXHRpZiAoIXRvcClcblx0XHR0b3AgPSBsZWZ0O1xuXG5cdGlmICghcmlnaHQpXG5cdFx0cmlnaHQgPSBsZWZ0O1xuXG5cdGlmICghYm90dG9tKVxuXHRcdGJvdHRvbSA9IHRvcDtcblxuXHR0aGlzLmxlZnQgPSBsZWZ0O1xuXHR0aGlzLnRvcCA9IHRvcDtcblx0dGhpcy5yaWdodCA9IHJpZ2h0O1xuXHR0aGlzLmJvdHRvbSA9IGJvdHRvbTtcblxuXHR0aGlzLmxvY2FsV2lkdGggPSB0ZXh0dXJlLndpZHRoO1xuXHR0aGlzLmxvY2FsSGVpZ2h0ID0gdGV4dHVyZS5oZWlnaHQ7XG5cblx0dGhpcy5idWlsZFBhcnRzKCk7XG5cdHRoaXMudXBkYXRlU2l6ZXMoKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChOaW5lU2xpY2UsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5cbi8qKlxuICogQnVpbGQgdGhlIHBhcnRzIGZvciB0aGUgc2xpY2VzLlxuICogQG1ldGhvZCBidWlsZFBhcnRzXG4gKiBAcHJpdmF0ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLmJ1aWxkUGFydHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHhwID0gWzAsIHRoaXMubGVmdCwgdGhpcy50ZXh0dXJlLndpZHRoIC0gdGhpcy5yaWdodCwgdGhpcy50ZXh0dXJlLndpZHRoXTtcblx0dmFyIHlwID0gWzAsIHRoaXMudG9wLCB0aGlzLnRleHR1cmUuaGVpZ2h0IC0gdGhpcy5ib3R0b20sIHRoaXMudGV4dHVyZS5oZWlnaHRdO1xuXHR2YXIgaGksIHZpO1xuXG5cdHRoaXMucGFydHMgPSBbXTtcblxuXHRmb3IgKHZpID0gMDsgdmkgPCAzOyB2aSsrKSB7XG5cdFx0Zm9yIChoaSA9IDA7IGhpIDwgMzsgaGkrKykge1xuXHRcdFx0dmFyIHcgPSB4cFtoaSArIDFdIC0geHBbaGldO1xuXHRcdFx0dmFyIGggPSB5cFt2aSArIDFdIC0geXBbdmldO1xuXG5cdFx0XHRpZiAodyAhPSAwICYmIGggIT0gMCkge1xuXHRcdFx0XHR2YXIgdGV4dHVyZVBhcnQgPSB0aGlzLmNyZWF0ZVRleHR1cmVQYXJ0KHhwW2hpXSwgeXBbdmldLCB3LCBoKTtcblx0XHRcdFx0dmFyIHMgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZVBhcnQpO1xuXHRcdFx0XHR0aGlzLmFkZENoaWxkKHMpO1xuXG5cdFx0XHRcdHRoaXMucGFydHMucHVzaChzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucGFydHMucHVzaChudWxsKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBVcGRhdGUgc2l6ZXMuXG4gKiBAbWV0aG9kIHVwZGF0ZVNpemVzXG4gKiBAcHJpdmF0ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLnVwZGF0ZVNpemVzID0gZnVuY3Rpb24oKSB7XG5cdHZhciB4cCA9IFswLCB0aGlzLmxlZnQsIHRoaXMubG9jYWxXaWR0aCAtIHRoaXMucmlnaHQsIHRoaXMubG9jYWxXaWR0aF07XG5cdHZhciB5cCA9IFswLCB0aGlzLnRvcCwgdGhpcy5sb2NhbEhlaWdodCAtIHRoaXMuYm90dG9tLCB0aGlzLmxvY2FsSGVpZ2h0XTtcblx0dmFyIGhpLCB2aSwgaSA9IDA7XG5cblx0Zm9yICh2aSA9IDA7IHZpIDwgMzsgdmkrKykge1xuXHRcdGZvciAoaGkgPSAwOyBoaSA8IDM7IGhpKyspIHtcblx0XHRcdGlmICh0aGlzLnBhcnRzW2ldKSB7XG5cdFx0XHRcdHZhciBwYXJ0ID0gdGhpcy5wYXJ0c1tpXTtcblxuXHRcdFx0XHRwYXJ0LnBvc2l0aW9uLnggPSB4cFtoaV07XG5cdFx0XHRcdHBhcnQucG9zaXRpb24ueSA9IHlwW3ZpXTtcblx0XHRcdFx0cGFydC53aWR0aCA9IHhwW2hpICsgMV0gLSB4cFtoaV07XG5cdFx0XHRcdHBhcnQuaGVpZ2h0ID0geXBbdmkgKyAxXSAtIHlwW3ZpXTtcblx0XHRcdH1cblxuXHRcdFx0aSsrO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFNldCBsb2NhbCBzaXplLlxuICogQG1ldGhvZCBzZXRMb2NhbFNpemVcbiAqL1xuTmluZVNsaWNlLnByb3RvdHlwZS5zZXRMb2NhbFNpemUgPSBmdW5jdGlvbih3LCBoKSB7XG5cdHRoaXMubG9jYWxXaWR0aCA9IHc7XG5cdHRoaXMubG9jYWxIZWlnaHQgPSBoO1xuXHR0aGlzLnVwZGF0ZVNpemVzKCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHRleHR1cmUgcGFydC5cbiAqIEBtZXRob2QgY3JlYXRlVGV4dHVyZVBhcnRcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUuY3JlYXRlVGV4dHVyZVBhcnQgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG5cdHZhciBmcmFtZSA9IHtcblx0XHR4OiB0aGlzLnRleHR1cmUuZnJhbWUueCArIHgsXG5cdFx0eTogdGhpcy50ZXh0dXJlLmZyYW1lLnkgKyB5LFxuXHRcdHdpZHRoOiB3aWR0aCxcblx0XHRoZWlnaHQ6IGhlaWdodFxuXHR9O1xuXG5cdHJldHVybiBuZXcgUElYSS5UZXh0dXJlKHRoaXMudGV4dHVyZSwgZnJhbWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5pbmVTbGljZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgQ29udGVudFNjYWxlciA9IHJlcXVpcmUoXCIuL0NvbnRlbnRTY2FsZXJcIik7XG4vL3ZhciBGcmFtZVRpbWVyID0gcmVxdWlyZShcIi4vRnJhbWVUaW1lclwiKTtcblxuLyoqXG4gKiBQaXhpIGZ1bGwgd2luZG93IGFwcC5cbiAqIENhbiBvcGVyYXRlIHVzaW5nIHdpbmRvdyBjb29yZGluYXRlcyBvciBzY2FsZWQgdG8gc3BlY2lmaWMgYXJlYS5cbiAqIEBjbGFzcyBQaXhpQXBwXG4gKi9cbmZ1bmN0aW9uIFBpeGlBcHAoZG9tSWQsIHdpZHRoLCBoZWlnaHQpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dmFyIHZpZXc7XG5cblx0aWYgKG5hdmlnYXRvci5pc0NvY29vbkpTKVxuXHRcdHZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JlZW5jYW52YXMnKTtcblxuXHRlbHNlXG5cdFx0dmlldyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdGlmICghZG9tSWQpIHtcblx0XHRpZiAoUGl4aUFwcC5mdWxsU2NyZWVuSW5zdGFuY2UpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBQaXhpQXBwIHBlciBhcHBcIik7XG5cblx0XHRQaXhpQXBwLmZ1bGxTY3JlZW5JbnN0YW5jZSA9IHRoaXM7XG5cblx0XHRjb25zb2xlLmxvZyhcIm5vIGRvbSBpdCwgYXR0YWNoaW5nIHRvIGJvZHlcIik7XG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGRvY3VtZW50LmJvZHk7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW4gPSAwO1xuXHRcdGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZyA9IDA7XG5cblx0XHRkb2N1bWVudC5ib2R5Lm9ucmVzaXplID0gRnVuY3Rpb25VdGlsLmNyZWF0ZURlbGVnYXRlKHRoaXMub25XaW5kb3dSZXNpemUsIHRoaXMpO1xuXHRcdHdpbmRvdy5vbnJlc2l6ZSA9IEZ1bmN0aW9uVXRpbC5jcmVhdGVEZWxlZ2F0ZSh0aGlzLm9uV2luZG93UmVzaXplLCB0aGlzKTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmxvZyhcImF0dGFjaGluZyB0bzogXCIgKyBkb21JZCk7XG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRvbUlkKTtcblx0fVxuXG5cdHRoaXMucmVuZGVyZXIgPSBuZXcgUElYSS5hdXRvRGV0ZWN0UmVuZGVyZXIodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQsIHZpZXcpO1xuXHR0aGlzLmNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIudmlldyk7XG5cblx0dGhpcy5jb250ZW50U2NhbGVyID0gbnVsbDtcblxuXHR0aGlzLmFwcFN0YWdlID0gbmV3IFBJWEkuU3RhZ2UoMCwgdHJ1ZSk7XG5cblx0aWYgKCF3aWR0aCB8fCAhaGVpZ2h0KVxuXHRcdHRoaXMudXNlTm9TY2FsaW5nKCk7XG5cblx0ZWxzZVxuXHRcdHRoaXMudXNlU2NhbGluZyh3aWR0aCwgaGVpZ2h0KTtcblxuLy9cdEZyYW1lVGltZXIuZ2V0SW5zdGFuY2UoKS5hZGRFdmVudExpc3RlbmVyKEZyYW1lVGltZXIuUkVOREVSLCB0aGlzLm9uQW5pbWF0aW9uRnJhbWUsIHRoaXMpO1xuXG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbkFuaW1hdGlvbkZyYW1lLmJpbmQodGhpcykpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFBpeGlBcHAsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5cbi8qKlxuICogVXNlIHNjYWxpbmcgbW9kZS5cbiAqIEBtZXRob2QgdXNlU2NhbGluZ1xuICovXG5QaXhpQXBwLnByb3RvdHlwZS51c2VTY2FsaW5nID0gZnVuY3Rpb24odywgaCkge1xuXHR0aGlzLnJlbW92ZUNvbnRlbnQoKTtcblxuXHR0aGlzLmNvbnRlbnRTY2FsZXIgPSBuZXcgQ29udGVudFNjYWxlcih0aGlzKTtcblx0dGhpcy5jb250ZW50U2NhbGVyLnNldENvbnRlbnRTaXplKHcsIGgpO1xuXHR0aGlzLmNvbnRlbnRTY2FsZXIuc2V0U2NyZWVuU2l6ZSh0aGlzLmNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCB0aGlzLmNvbnRhaW5lckVsLmNsaWVudEhlaWdodCk7XG5cdHRoaXMuYXBwU3RhZ2UuYWRkQ2hpbGQodGhpcy5jb250ZW50U2NhbGVyKTtcbn1cblxuLyoqXG4gKiBVc2Ugbm8gc2NhbGluZyBtb2RlLlxuICogQG1ldGhvZCB1c2VOb1NjYWxpbmdcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUudXNlTm9TY2FsaW5nID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVtb3ZlQ29udGVudCgpO1xuXG5cdHRoaXMuYXBwU3RhZ2UuYWRkQ2hpbGQodGhpcyk7XG59XG5cbi8qKlxuICogUmVtb3ZlIGFueSBjb250ZW50LlxuICogQG1ldGhvZCByZW1vdmVDb250ZW50XG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpQXBwLnByb3RvdHlwZS5yZW1vdmVDb250ZW50ID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLmFwcFN0YWdlLmNoaWxkcmVuLmluZGV4T2YodGhpcykgPj0gMClcblx0XHR0aGlzLmFwcFN0YWdlLnJlbW92ZUNoaWxkKHRoaXMpO1xuXG5cdGlmICh0aGlzLmNvbnRlbnRTY2FsZXIpIHtcblx0XHR0aGlzLmFwcFN0YWdlLnJlbW92ZUNoaWxkKHRoaXMuY29udGVudFNjYWxlcilcblx0XHR0aGlzLmNvbnRlbnRTY2FsZXIgPSBudWxsO1xuXHR9XG59XG5cbi8qKlxuICogV2luZG93IHJlc2l6ZS5cbiAqIEBtZXRob2Qgb25XaW5kb3dSZXNpemVcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24oKSB7XG5cdGlmICh0aGlzLmNvbnRlbnRTY2FsZXIpXG5cdFx0dGhpcy5jb250ZW50U2NhbGVyLnNldFNjcmVlblNpemUodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQpO1xuXG5cdHRoaXMucmVuZGVyZXIucmVzaXplKHRoaXMuY29udGFpbmVyRWwuY2xpZW50V2lkdGgsIHRoaXMuY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0KTtcblx0dGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5hcHBTdGFnZSk7XG59XG5cbi8qKlxuICogQW5pbWF0aW9uIGZyYW1lLlxuICogQG1ldGhvZCBvbkFuaW1hdGlvbkZyYW1lXG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpQXBwLnByb3RvdHlwZS5vbkFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24odGltZSkge1xuXHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcFN0YWdlKTtcblx0VFdFRU4udXBkYXRlKHRpbWUpO1xuXG5cdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbkFuaW1hdGlvbkZyYW1lLmJpbmQodGhpcykpO1xufVxuXG4vKipcbiAqIEdldCBjYW52YXMuXG4gKiBAbWV0aG9kIGdldENhbnZhc1xuICovXG5QaXhpQXBwLnByb3RvdHlwZS5nZXRDYW52YXMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMucmVuZGVyZXIudmlldztcbn1cblxuLyoqXG4gKiBHZXQgc3RhZ2UuXG4gKiBAbWV0aG9kIGdldFN0YWdlXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLmdldFN0YWdlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmFwcFN0YWdlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBpeGlBcHA7IiwiLyoqXG4gKiBSZXByZXNlbnRzIGEgcG9pbnQuXG4gKiBAY2xhc3MgUG9pbnRcbiAqL1xuZnVuY3Rpb24gUG9pbnQoeCwgeSkge1xuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgUG9pbnQpKVxuXHRcdHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XG5cblx0dGhpcy54ID0geDtcblx0dGhpcy55ID0geTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJ2YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBQZXJmb3JtIHRhc2tzIGluIGEgc2VxdWVuY2UuXG4gKiBUYXNrcywgd2hpY2ggc2hvdWxkIGJlIGV2ZW50IGRpc3BhdGNoZXJzLFxuICogYXJlIGV1cXVldWVkIHdpdGggdGhlIGVucXVldWUgZnVuY3Rpb24sXG4gKiBhIFNUQVJUIGV2ZW50IGlzIGRpc3BhdGNoZXIgdXBvbiB0YXNrXG4gKiBzdGFydCwgYW5kIHRoZSB0YXNrIGlzIGNvbnNpZGVyZWQgY29tcGxldGVcbiAqIGFzIGl0IGRpc3BhdGNoZXMgYSBDT01QTEVURSBldmVudC5cbiAqIEBjbGFzcyBTZXF1ZW5jZXJcbiAqL1xuZnVuY3Rpb24gU2VxdWVuY2VyKCkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnF1ZXVlID0gW107XG5cdHRoaXMuY3VycmVudFRhc2sgPSBudWxsO1xuXHR0aGlzLm9uVGFza0NvbXBsZXRlQ2xvc3VyZSA9IHRoaXMub25UYXNrQ29tcGxldGUuYmluZCh0aGlzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTZXF1ZW5jZXIsIEV2ZW50RGlzcGF0Y2hlcik7XG5cblNlcXVlbmNlci5TVEFSVCA9IFwic3RhcnRcIjtcblNlcXVlbmNlci5DT01QTEVURSA9IFwiY29tcGxldGVcIjtcblxuLyoqXG4gKiBFbnF1ZXVlIGEgdGFzayB0byBiZSBwZXJmb3JtZWQuXG4gKiBAbWV0aG9kIGVucXVldWVcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24odGFzaykge1xuXHRpZiAoIXRoaXMuY3VycmVudFRhc2spXG5cdFx0dGhpcy5zdGFydFRhc2sodGFzaylcblxuXHRlbHNlXG5cdFx0dGhpcy5xdWV1ZS5wdXNoKHRhc2spO1xufVxuXG4vKipcbiAqIFN0YXJ0IHRoZSB0YXNrLlxuICogQG1ldGhvZCBzdGFydFRhc2tcbiAqIEBwcml2YXRlXG4gKi9cblNlcXVlbmNlci5wcm90b3R5cGUuc3RhcnRUYXNrID0gZnVuY3Rpb24odGFzaykge1xuXHR0aGlzLmN1cnJlbnRUYXNrID0gdGFzaztcblxuXHR0aGlzLmN1cnJlbnRUYXNrLmFkZEV2ZW50TGlzdGVuZXIoU2VxdWVuY2VyLkNPTVBMRVRFLCB0aGlzLm9uVGFza0NvbXBsZXRlQ2xvc3VyZSk7XG5cdHRoaXMuY3VycmVudFRhc2suZGlzcGF0Y2hFdmVudCh7XG5cdFx0dHlwZTogU2VxdWVuY2VyLlNUQVJUXG5cdH0pO1xufVxuXG4vKipcbiAqIFRoZSBjdXJyZW50IHRhc2sgaXMgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uVGFza0NvbXBsZXRlXG4gKsKgQHByaXZhdGVcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5vblRhc2tDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmN1cnJlbnRUYXNrLnJlbW92ZUV2ZW50TGlzdGVuZXIoU2VxdWVuY2VyLkNPTVBMRVRFLCB0aGlzLm9uVGFza0NvbXBsZXRlQ2xvc3VyZSk7XG5cdHRoaXMuY3VycmVudFRhc2sgPSBudWxsO1xuXG5cdGlmICh0aGlzLnF1ZXVlLmxlbmd0aCA+IDApXG5cdFx0dGhpcy5zdGFydFRhc2sodGhpcy5xdWV1ZS5zaGlmdCgpKTtcblxuXHRlbHNlXG5cdFx0dGhpcy50cmlnZ2VyKFNlcXVlbmNlci5DT01QTEVURSk7XG5cbn1cblxuLyoqXG4gKiBBYm9ydCB0aGUgc2VxdWVuY2UuXG4gKiBAbWV0aG9kIGFib3J0XG4gKi9cblNlcXVlbmNlci5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuY3VycmVudFRhc2spIHtcblx0XHR0aGlzLmN1cnJlbnRUYXNrLnJlbW92ZUV2ZW50TGlzdGVuZXIoU2VxdWVuY2VyLkNPTVBMRVRFLCB0aGlzLm9uVGFza0NvbXBsZXRlQ2xvc3VyZSk7XG5cdFx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XG5cdH1cblxuXHR0aGlzLnF1ZXVlID0gW107XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VxdWVuY2VyOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgVFdFRU4gPSByZXF1aXJlKFwidHdlZW4uanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBTbGlkZXIuIFRoaXMgaXMgdGhlIGNsYXNzIGZvciB0aGUgc2xpZGVyLlxuICogQGNsYXNzIFNsaWRlclxuICovXG5mdW5jdGlvbiBTbGlkZXIoYmFja2dyb3VuZCwga25vYikge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmJhY2tncm91bmQgPSBiYWNrZ3JvdW5kO1xuXHR0aGlzLmtub2IgPSBrbm9iO1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5iYWNrZ3JvdW5kKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmtub2IpO1xuXG5cblx0dGhpcy5rbm9iLmJ1dHRvbk1vZGUgPSB0cnVlO1xuXHR0aGlzLmtub2IuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHR0aGlzLmtub2IubW91c2Vkb3duID0gdGhpcy5vbktub2JNb3VzZURvd24uYmluZCh0aGlzKTtcblxuXHR0aGlzLmJhY2tncm91bmQuYnV0dG9uTW9kZSA9IHRydWU7XG5cdHRoaXMuYmFja2dyb3VuZC5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMuYmFja2dyb3VuZC5tb3VzZWRvd24gPSB0aGlzLm9uQmFja2dyb3VuZE1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXG5cdHRoaXMuZmFkZVR3ZWVuID0gbnVsbDtcblx0dGhpcy5hbHBoYSA9IDA7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2xpZGVyLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoU2xpZGVyKTtcblxuXG4vKipcbiAqIE1vdXNlIGRvd24gb24ga25vYi5cbiAqIEBtZXRob2Qgb25Lbm9iTW91c2VEb3duXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25Lbm9iTW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuZG93blBvcyA9IHRoaXMua25vYi5wb3NpdGlvbi54O1xuXHR0aGlzLmRvd25YID0gaW50ZXJhY3Rpb25fb2JqZWN0LmdldExvY2FsUG9zaXRpb24odGhpcykueDtcblxuXHR0aGlzLnN0YWdlLm1vdXNldXAgPSB0aGlzLm9uU3RhZ2VNb3VzZVVwLmJpbmQodGhpcyk7XG5cdHRoaXMuc3RhZ2UubW91c2Vtb3ZlID0gdGhpcy5vblN0YWdlTW91c2VNb3ZlLmJpbmQodGhpcyk7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBkb3duIG9uIGJhY2tncm91bmQuXG4gKiBAbWV0aG9kIG9uQmFja2dyb3VuZE1vdXNlRG93blxuICovXG5TbGlkZXIucHJvdG90eXBlLm9uQmFja2dyb3VuZE1vdXNlRG93biA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLmRvd25YID0gaW50ZXJhY3Rpb25fb2JqZWN0LmdldExvY2FsUG9zaXRpb24odGhpcykueDtcblx0dGhpcy5rbm9iLnggPSBpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54IC0gdGhpcy5rbm9iLndpZHRoKjAuNTtcblxuXHR0aGlzLnZhbGlkYXRlVmFsdWUoKTtcblxuXHR0aGlzLmRvd25Qb3MgPSB0aGlzLmtub2IucG9zaXRpb24ueDtcblxuXHR0aGlzLnN0YWdlLm1vdXNldXAgPSB0aGlzLm9uU3RhZ2VNb3VzZVVwLmJpbmQodGhpcyk7XG5cdHRoaXMuc3RhZ2UubW91c2Vtb3ZlID0gdGhpcy5vblN0YWdlTW91c2VNb3ZlLmJpbmQodGhpcyk7XG5cblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhbmdlXCIpO1xufVxuXG5cbi8qKlxuICogTW91c2UgdXAuXG4gKiBAbWV0aG9kIG9uU3RhZ2VNb3VzZVVwXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25TdGFnZU1vdXNlVXAgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5zdGFnZS5tb3VzZXVwID0gbnVsbDtcblx0dGhpcy5zdGFnZS5tb3VzZW1vdmUgPSBudWxsO1xufVxuXG5cbi8qKlxuICogTW91c2UgbW92ZS5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlTW92ZVxuICovXG5TbGlkZXIucHJvdG90eXBlLm9uU3RhZ2VNb3VzZU1vdmUgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5rbm9iLnggPSB0aGlzLmRvd25Qb3MgKyAoaW50ZXJhY3Rpb25fb2JqZWN0LmdldExvY2FsUG9zaXRpb24odGhpcykueCAtIHRoaXMuZG93blgpO1xuXG5cdHRoaXMudmFsaWRhdGVWYWx1ZSgpO1xuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiKTtcbn1cblxuXG4vKipcbiAqIFZhbGlkYXRlIHBvc2l0aW9uLlxuICogQG1ldGhvZCB2YWxpZGF0ZVZhbHVlXG4gKi9cblNsaWRlci5wcm90b3R5cGUudmFsaWRhdGVWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXG5cdGlmKHRoaXMua25vYi54IDwgMClcblx0XHR0aGlzLmtub2IueCA9IDA7XG5cblx0aWYodGhpcy5rbm9iLnggPiAodGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoKSlcblx0XHR0aGlzLmtub2IueCA9IHRoaXMuYmFja2dyb3VuZC53aWR0aCAtIHRoaXMua25vYi53aWR0aDtcbn1cblxuXG4vKipcbiAqIEdldCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZnJhY3Rpb24gPSB0aGlzLmtub2IucG9zaXRpb24ueC8odGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoKTtcblxuXHRyZXR1cm4gZnJhY3Rpb247XG59XG5cblxuLyoqXG4gKiBHZXQgdmFsdWUuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cblNsaWRlci5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLmtub2IueCA9IHRoaXMuYmFja2dyb3VuZC5wb3NpdGlvbi54ICsgdmFsdWUqKHRoaXMuYmFja2dyb3VuZC53aWR0aCAtIHRoaXMua25vYi53aWR0aCk7XG5cblx0dGhpcy52YWxpZGF0ZVZhbHVlKCk7XG5cdHJldHVybiB0aGlzLmdldFZhbHVlKCk7XG59XG5cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cblNsaWRlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXHRpZih0aGlzLmZhZGVUd2VlbiAhPSBudWxsKVxuXHRcdHRoaXMuZmFkZVR3ZWVuLnN0b3AoKTtcblx0dGhpcy5mYWRlVHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcblx0XHRcdC50byh7YWxwaGE6IDF9LCAyNTApXG5cdFx0XHQuc3RhcnQoKTtcbn1cblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cblNsaWRlci5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHRpZih0aGlzLmZhZGVUd2VlbiAhPSBudWxsKVxuXHRcdHRoaXMuZmFkZVR3ZWVuLnN0b3AoKTtcblx0dGhpcy5mYWRlVHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcblx0XHRcdC50byh7YWxwaGE6IDB9LCAyNTApXG5cdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uSGlkZGVuLmJpbmQodGhpcykpXG5cdFx0XHQuc3RhcnQoKTtcbn1cblxuLyoqXG4gKiBPbiBoaWRkZW4uXG4gKiBAbWV0aG9kIG9uSGlkZGVuXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25IaWRkZW4gPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTbGlkZXI7XG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBwcm9taXNlcyBhcyBkZWZpbmVkIGhlcmU6XG4gKiBodHRwOi8vcHJvbWlzZXMtYXBsdXMuZ2l0aHViLmlvL3Byb21pc2VzLXNwZWMvXG4gKiBAY2xhc3MgVGhlbmFibGVcbiAqL1xuZnVuY3Rpb24gVGhlbmFibGUoKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpXG5cblx0dGhpcy5zdWNjZXNzSGFuZGxlcnMgPSBbXTtcblx0dGhpcy5lcnJvckhhbmRsZXJzID0gW107XG5cdHRoaXMubm90aWZpZWQgPSBmYWxzZTtcblx0dGhpcy5oYW5kbGVyc0NhbGxlZCA9IGZhbHNlO1xuXHR0aGlzLm5vdGlmeVBhcmFtID0gbnVsbDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChUaGVuYWJsZSwgRXZlbnREaXNwYXRjaGVyKTtcblxuLyoqXG4gKiBTZXQgcmVzb2x1dGlvbiBoYW5kbGVycy5cbiAqIEBtZXRob2QgdGhlblxuICogQHBhcmFtIHN1Y2Nlc3MgVGhlIGZ1bmN0aW9uIGNhbGxlZCB0byBoYW5kbGUgc3VjY2Vzcy5cbiAqIEBwYXJhbSBlcnJvciBUaGUgZnVuY3Rpb24gY2FsbGVkIHRvIGhhbmRsZSBlcnJvci5cbiAqIEByZXR1cm4gVGhpcyBUaGVuYWJsZSBmb3IgY2hhaW5pbmcuXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24oc3VjY2VzcywgZXJyb3IpIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyB0aGVuYWJsZSBpcyBhbHJlYWR5IHVzZWQuXCIpO1xuXG5cdHRoaXMuc3VjY2Vzc0hhbmRsZXJzLnB1c2goc3VjY2Vzcyk7XG5cdHRoaXMuZXJyb3JIYW5kbGVycy5wdXNoKGVycm9yKTtcblxuXHRyZXR1cm4gdGhpcztcbn1cblxuLyoqXG4gKiBOb3RpZnkgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICogQG1ldGhvZCBub3RpZnlTdWNjZXNzXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5ub3RpZnlTdWNjZXNzID0gZnVuY3Rpb24ocGFyYW0pIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyB0aGVuYWJsZSBpcyBhbHJlYWR5IG5vdGlmaWVkLlwiKTtcblxuXHR0aGlzLm5vdGlmeVBhcmFtID0gcGFyYW07XG5cdHNldFRpbWVvdXQodGhpcy5kb05vdGlmeVN1Y2Nlc3MuYmluZCh0aGlzKSwgMCk7XG59XG5cbi8qKlxuICogTm90aWZ5IGZhaWx1cmUgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEBtZXRob2Qgbm90aWZ5RXJyb3JcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLm5vdGlmeUVycm9yID0gZnVuY3Rpb24ocGFyYW0pIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyB0aGVuYWJsZSBpcyBhbHJlYWR5IG5vdGlmaWVkLlwiKTtcblxuXHR0aGlzLm5vdGlmeVBhcmFtID0gcGFyYW07XG5cdHNldFRpbWVvdXQodGhpcy5kb05vdGlmeUVycm9yLmJpbmQodGhpcyksIDApO1xufVxuXG4vKipcbiAqIEFjdHVhbGx5IG5vdGlmeSBzdWNjZXNzLlxuICogQG1ldGhvZCBkb05vdGlmeVN1Y2Nlc3NcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5kb05vdGlmeVN1Y2Nlc3MgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAocGFyYW0pXG5cdFx0dGhpcy5ub3RpZnlQYXJhbSA9IHBhcmFtO1xuXG5cdHRoaXMuY2FsbEhhbmRsZXJzKHRoaXMuc3VjY2Vzc0hhbmRsZXJzKTtcbn1cblxuLyoqXG4gKiBBY3R1YWxseSBub3RpZnkgZXJyb3IuXG4gKiBAbWV0aG9kIGRvTm90aWZ5RXJyb3JcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5kb05vdGlmeUVycm9yID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY2FsbEhhbmRsZXJzKHRoaXMuZXJyb3JIYW5kbGVycyk7XG59XG5cbi8qKlxuICogQ2FsbCBoYW5kbGVycy5cbiAqIEBtZXRob2QgY2FsbEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUuY2FsbEhhbmRsZXJzID0gZnVuY3Rpb24oaGFuZGxlcnMpIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIG5ldmVyIGhhcHBlbi5cIik7XG5cblx0dGhpcy5oYW5kbGVyc0NhbGxlZCA9IHRydWU7XG5cblx0Zm9yICh2YXIgaSBpbiBoYW5kbGVycykge1xuXHRcdGlmIChoYW5kbGVyc1tpXSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aGFuZGxlcnNbaV0uY2FsbChudWxsLCB0aGlzLm5vdGlmeVBhcmFtKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkV4Y2VwdGlvbiBpbiBUaGVuYWJsZSBoYW5kbGVyOiBcIiArIGUpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblx0XHRcdFx0dGhyb3cgZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIHByb21pc2UuXG4gKiBAbWV0aG9kIHJlc29sdmVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbihyZXN1bHQpIHtcblx0dGhpcy5ub3RpZnlTdWNjZXNzKHJlc3VsdCk7XG59XG5cbi8qKlxuICogUmVqZWN0IHByb21pc2UuXG4gKiBAbWV0aG9kIHJlamVjdFxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24ocmVhc29uKSB7XG5cdHRoaXMubm90aWZ5RXJyb3IocmVhc29uKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaGVuYWJsZTsiXX0=
