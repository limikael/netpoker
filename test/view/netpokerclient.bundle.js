(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PixiTextInput = require("./src/PixiTextInput");

module.exports = PixiTextInput
},{"./src/PixiTextInput":2}],2:[function(require,module,exports){
if (typeof module !== 'undefined') {
	PIXI = require("pixi.js");
}

/**
 * Text input field for pixi.js.
 * @class PixiTextInput
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
 * @property backgroundColor
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
 * Should a background be shown?
 * @property background
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

	buttonsView.setButtons(m.getButtons());
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
		cardView.show();
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

		this.messageSequencer.waitFor(cardView, "animationDone");
		cardView.setCardData(cardData);
		cardView.show();
	}
}

/**
 * Dealer button message.
 * @method onDealerButtonMessage
 */
TableController.prototype.onDealerButtonMessage = function(m) {
	var dealerButtonView = this.view.getDealerButtonView();
	this.messageSequencer.waitFor(dealerButtonView, "animationDone");
	dealerButtonView.show(m.getSeatIndex(), m.getAnimate());
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

	for(var i = 0; i < this.view.seatViews.length; i++)
		if(this.view.seatViews[i].betChips.value > 0)
			haveChips = true;

	if (!haveChips)
		return;

	for(var i = 0; i < this.view.seatViews.length; i++)
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
 	console.log("delay for  = "+m.delay);


	this.messageSequencer.waitFor(this, "timerDone");
	setTimeout(this.dispatchEvent.bind(this, "timerDone"), m.delay);

 };

module.exports = TableController;
},{"../../proto/messages/ActionMessage":35,"../../proto/messages/BetMessage":36,"../../proto/messages/BetsToPotMessage":37,"../../proto/messages/CommunityCardsMessage":43,"../../proto/messages/DealerButtonMessage":44,"../../proto/messages/DelayMessage":45,"../../proto/messages/FoldCardsMessage":47,"../../proto/messages/PocketCardsMessage":52,"../../proto/messages/PotMessage":53,"../../proto/messages/SeatInfoMessage":58,"../../proto/messages/TimerMessage":65,"../../utils/EventDispatcher":70}],12:[function(require,module,exports){
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
	buttonBackground: [68,446,64,64]
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
	console.log("value = " + value + ", key = " +key);


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
var BigButton = require("./BigButton");

/**
 * Buttons
 * @class ButtonsView
 */
function ButtonsView() {
	PIXI.DisplayObjectContainer.call(this);

	this.buttonHolder = new PIXI.DisplayObjectContainer();
	this.addChild(this.buttonHolder);

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

	this.setButtons([]);

	this.buttonsDatas = [];
}

FunctionUtil.extend(ButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ButtonsView);

ButtonsView.BUTTON_CLICK = "buttonClick";

/**
 * Clear.
 * @method clear
 */
ButtonsView.prototype.clear = function(buttonDatas) {
	this.setButtons([]);
}

/**
 * Set button datas.
 * @method setButtons
 */
ButtonsView.prototype.setButtons = function(buttonDatas) {
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
},{"../../utils/Button":67,"../../utils/EventDispatcher":70,"../../utils/FunctionUtil":72,"./BigButton":15,"pixi.js":3}],17:[function(require,module,exports){
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
CardView.prototype.show = function() {
	this.visible = true;
	this.mask.height = this.height;

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
	var diff = Math.sqrt(diffX*diffX + diffY*diffY);

	var tween = new TWEEN.Tween( this.position )
            .to( { x: destination.x, y: destination.y }, 5*diff )
            .easing( TWEEN.Easing.Quadratic.Out )
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
	this.visible = true;
	if(animate) {
		this.animateToSeatIndex(seatIndex);
	}
	else {
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

	console.log("incoming connection message: " + message.type);
	console.log(message);

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

	return this.getCardValueString() + this.getSuitString();
}

/**
 * Get value of the card.
 * @method getValue
 */
CardData.prototype.getValue = function() {
	return this.value;
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

	console.log("Creating button click message, value=" + value);
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
		buttons: buttons
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
var CardData=require("../data/CardData");

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
	this.cards=[];

	for (i=0; i<data.cards.length; i++)
		this.cards.push(new CardData(data.cards[i]));
}

/**
 * Serialize message.
 * @method serialize
 */
CommunityCardsMessage.prototype.serialize = function() {
	var cards=[];

	for (i=0; i<this.cards.length; i++)
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
 * Un-serialize.
 * @method unserialize
 */
PayOutMessage.prototype.unserialize = function(data) {
	for(var i = 0; i < data.values.length; i++) {
		this.values.push(data.values[i]);
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

	FrameTimer.getInstance().addEventListener(FrameTimer.RENDER, this.onAnimationFrame, this);
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
PixiApp.prototype.onAnimationFrame = function() {
	this.renderer.render(this.appStage);
	TWEEN.update();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvbm9kZV9tb2R1bGVzL1BpeGlUZXh0SW5wdXQvaW5kZXguanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL25vZGVfbW9kdWxlcy9QaXhpVGV4dElucHV0L3NyYy9QaXhpVGV4dElucHV0LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9ub2RlX21vZHVsZXMvcGl4aS5qcy9iaW4vcGl4aS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvbm9kZV9tb2R1bGVzL3R3ZWVuLmpzL2luZGV4LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2FwcC9OZXRQb2tlckNsaWVudC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC9hcHAvU2V0dGluZ3MuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9JbnRlcmZhY2VDb250cm9sbGVyLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L2NvbnRyb2xsZXIvTWVzc2FnZVNlcXVlbmNlSXRlbS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC9jb250cm9sbGVyL01lc3NhZ2VTZXF1ZW5jZXIuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9OZXRQb2tlckNsaWVudENvbnRyb2xsZXIuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvY29udHJvbGxlci9UYWJsZUNvbnRyb2xsZXIuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvbmV0cG9rZXJjbGllbnQuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvcmVzb3VyY2VzL0RlZmF1bHRTa2luLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3Jlc291cmNlcy9SZXNvdXJjZXMuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9CaWdCdXR0b24uanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9CdXR0b25zVmlldy5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0NhcmRWaWV3LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvQ2hhdFZpZXcuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9DaGlwc1ZpZXcuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9EZWFsZXJCdXR0b25WaWV3LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvRGlhbG9nQnV0dG9uLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvRGlhbG9nVmlldy5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L0xvYWRpbmdTY3JlZW4uanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9OZXRQb2tlckNsaWVudFZpZXcuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9jbGllbnQvdmlldy9Qb3RWaWV3LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvUmFpc2VTaG9ydGN1dEJ1dHRvbi5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NlYXRWaWV3LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvY2xpZW50L3ZpZXcvU2V0dGluZ3NDaGVja2JveC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1NldHRpbmdzVmlldy5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL2NsaWVudC92aWV3L1RpbWVyVmlldy5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL1Byb3RvQ29ubmVjdGlvbi5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL2RhdGEvQnV0dG9uRGF0YS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL2RhdGEvQ2FyZERhdGEuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9kYXRhL1ByZXNldEJ1dHRvbkRhdGEuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9BY3Rpb25NZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQmV0TWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0JldHNUb1BvdE1lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9CdXR0b25zTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0NoYXRNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ2hlY2tib3hNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ2xlYXJNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvRGVhbGVyQnV0dG9uTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0RlbGF5TWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL0ZhZGVUYWJsZU1lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvSGFuZEluZm9NZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvSW5pdE1lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9QYXlPdXRNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUG9ja2V0Q2FyZHNNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvUG90TWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1ByZXNldEJ1dHRvbnNNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvU2VhdENsaWNrTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1NlYXRJbmZvTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvU3RhdGVDb21wbGV0ZU1lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RhYmxlQnV0dG9uc01lc3NhZ2UuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy9wcm90by9tZXNzYWdlcy9UYWJsZUluZm9NZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvcHJvdG8vbWVzc2FnZXMvVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3Byb3RvL21lc3NhZ2VzL1RvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvQnV0dG9uLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvQ2hlY2tib3guanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9Db250ZW50U2NhbGVyLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRXZlbnREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvRnJhbWVUaW1lci5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0Z1bmN0aW9uVXRpbC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL0dyYWRpZW50LmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci9zcmMvanMvdXRpbHMvTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9Nb3VzZU92ZXJHcm91cC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL05pbmVTbGljZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1BpeGlBcHAuanMiLCIvVXNlcnMvbWlrYWVsL0RvY3VtZW50cy9yZXBvL25ldHBva2VyL3NyYy9qcy91dGlscy9Qb2ludC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1NlcXVlbmNlci5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1NsaWRlci5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL2pzL3V0aWxzL1RoZW5hYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGl4aVRleHRJbnB1dCA9IHJlcXVpcmUoXCIuL3NyYy9QaXhpVGV4dElucHV0XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpeGlUZXh0SW5wdXQiLCJpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0UElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xufVxuXG4vKipcbiAqIFRleHQgaW5wdXQgZmllbGQgZm9yIHBpeGkuanMuXG4gKiBAY2xhc3MgUGl4aVRleHRJbnB1dFxuICovXG5mdW5jdGlvbiBQaXhpVGV4dElucHV0KHRleHQsIHN0eWxlKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdGlmICghdGV4dClcblx0XHR0ZXh0ID0gXCJcIjtcblxuXHR0ZXh0ID0gdGV4dC50b1N0cmluZygpO1xuXG5cdGlmIChzdHlsZSAmJiBzdHlsZS53b3JkV3JhcClcblx0XHR0aHJvdyBcIndvcmRXcmFwIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIGlucHV0IGZpZWxkc1wiO1xuXG5cdHRoaXMuX3RleHQgPSB0ZXh0O1xuXG5cdHRoaXMubG9jYWxXaWR0aCA9IDEwMDtcblx0dGhpcy5fYmFja2dyb3VuZENvbG9yID0gMHhmZmZmZmY7XG5cdHRoaXMuX2NhcmV0Q29sb3IgPSAweDAwMDAwMDtcblx0dGhpcy5fYmFja2dyb3VuZCA9IHRydWU7XG5cblx0dGhpcy5zdHlsZSA9IHN0eWxlO1xuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQodGhpcy5fdGV4dCwgc3R5bGUpO1xuXG5cdHRoaXMubG9jYWxIZWlnaHQgPVxuXHRcdHRoaXMudGV4dEZpZWxkLmRldGVybWluZUZvbnRIZWlnaHQoJ2ZvbnQ6ICcgKyB0aGlzLnRleHRGaWVsZC5zdHlsZS5mb250ICsgJzsnKSArXG5cdFx0dGhpcy50ZXh0RmllbGQuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzO1xuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdHRoaXMudGV4dEZpZWxkTWFzayA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdHRoaXMuY2FyZXQgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmRyYXdFbGVtZW50cygpO1xuXG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGV4dEZpZWxkKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNhcmV0KTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRleHRGaWVsZE1hc2spO1xuXG5cdHRoaXMuc2Nyb2xsSW5kZXggPSAwO1xuXHR0aGlzLl9jYXJldEluZGV4ID0gMDtcblx0dGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwgPSBudWxsO1xuXHR0aGlzLmJsdXIoKTtcblx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XG5cblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5idXR0b25Nb2RlID0gdHJ1ZTtcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuZGVmYXVsdEN1cnNvciA9IFwidGV4dFwiO1xuXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLm1vdXNlZG93biA9IHRoaXMub25CYWNrZ3JvdW5kTW91c2VEb3duLmJpbmQodGhpcyk7XG5cdHRoaXMua2V5RXZlbnRDbG9zdXJlID0gdGhpcy5vbktleUV2ZW50LmJpbmQodGhpcyk7XG5cdHRoaXMud2luZG93Qmx1ckNsb3N1cmUgPSB0aGlzLm9uV2luZG93Qmx1ci5iaW5kKHRoaXMpO1xuXHR0aGlzLmRvY3VtZW50TW91c2VEb3duQ2xvc3VyZSA9IHRoaXMub25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXHR0aGlzLmlzRm9jdXNDbGljayA9IGZhbHNlO1xuXG5cdHRoaXMudXBkYXRlVGV4dCgpO1xuXG5cdHRoaXMudGV4dEZpZWxkLm1hc2sgPSB0aGlzLnRleHRGaWVsZE1hc2s7XG5cblx0dGhpcy5rZXlwcmVzcyA9IG51bGw7XG5cdHRoaXMua2V5ZG93biA9IG51bGw7XG5cdHRoaXMuY2hhbmdlID0gbnVsbDtcbn1cblxuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpO1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQaXhpVGV4dElucHV0O1xuXG4vKipcbiAqIFNvbWVvbmUgY2xpY2tlZC5cbiAqIEBtZXRob2Qgb25CYWNrZ3JvdW5kTW91c2VEb3duXG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbkJhY2tncm91bmRNb3VzZURvd24gPSBmdW5jdGlvbihlKSB7XG5cdHZhciB4ID0gZS5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLng7XG5cdHRoaXMuX2NhcmV0SW5kZXggPSB0aGlzLmdldENhcmV0SW5kZXhCeUNvb3JkKHgpO1xuXHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcblxuXHR0aGlzLmZvY3VzKCk7XG5cblx0dGhpcy5pc0ZvY3VzQ2xpY2sgPSB0cnVlO1xuXHR2YXIgc2NvcGUgPSB0aGlzO1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdHNjb3BlLmlzRm9jdXNDbGljayA9IGZhbHNlO1xuXHR9LCAwKTtcbn1cblxuLyoqXG4gKiBGb2N1cyB0aGlzIGlucHV0IGZpZWxkLlxuICogQG1ldGhvZCBmb2N1c1xuICovXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5mb2N1cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmJsdXIoKTtcblxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5kb2N1bWVudE1vdXNlRG93bkNsb3N1cmUpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgdGhpcy53aW5kb3dCbHVyQ2xvc3VyZSk7XG5cblx0dGhpcy5zaG93Q2FyZXQoKTtcbn1cblxuLyoqXG4gKiBIYW5kbGUga2V5IGV2ZW50LlxuICogQG1ldGhvZCBvbktleUV2ZW50XG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS5vbktleUV2ZW50ID0gZnVuY3Rpb24oZSkge1xuXHQvKmNvbnNvbGUubG9nKFwia2V5IGV2ZW50XCIpO1xuXHRjb25zb2xlLmxvZyhlKTsqL1xuXG5cdGlmIChlLnR5cGUgPT0gXCJrZXlwcmVzc1wiKSB7XG5cdFx0aWYgKGUuY2hhckNvZGUgPCAzMilcblx0XHRcdHJldHVybjtcblxuXHRcdHRoaXMuX3RleHQgPVxuXHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcoMCwgdGhpcy5fY2FyZXRJbmRleCkgK1xuXHRcdFx0U3RyaW5nLmZyb21DaGFyQ29kZShlLmNoYXJDb2RlKSArXG5cdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLl9jYXJldEluZGV4KTtcblxuXHRcdHRoaXMuX2NhcmV0SW5kZXgrKztcblx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XG5cdFx0dGhpcy5zaG93Q2FyZXQoKTtcblx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcblx0XHR0aGlzLnRyaWdnZXIodGhpcy5rZXlwcmVzcywgZSk7XG5cdFx0dGhpcy50cmlnZ2VyKHRoaXMuY2hhbmdlKTtcblx0fVxuXG5cdGlmIChlLnR5cGUgPT0gXCJrZXlkb3duXCIpIHtcblx0XHRzd2l0Y2ggKGUua2V5Q29kZSkge1xuXHRcdFx0Y2FzZSA4OlxuXHRcdFx0XHRpZiAodGhpcy5fY2FyZXRJbmRleCA+IDApIHtcblx0XHRcdFx0XHR0aGlzLl90ZXh0ID1cblx0XHRcdFx0XHRcdHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXggLSAxKSArXG5cdFx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZyh0aGlzLl9jYXJldEluZGV4KTtcblxuXHRcdFx0XHRcdHRoaXMuX2NhcmV0SW5kZXgtLTtcblx0XHRcdFx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XG5cdFx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcblx0XHRcdFx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcih0aGlzLmNoYW5nZSk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDQ2OlxuXHRcdFx0XHR0aGlzLl90ZXh0ID1cblx0XHRcdFx0XHR0aGlzLl90ZXh0LnN1YnN0cmluZygwLCB0aGlzLl9jYXJldEluZGV4KSArXG5cdFx0XHRcdFx0dGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5fY2FyZXRJbmRleCArIDEpO1xuXG5cdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcblx0XHRcdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XG5cdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcih0aGlzLmNoYW5nZSk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDM5OlxuXHRcdFx0XHR0aGlzLl9jYXJldEluZGV4Kys7XG5cdFx0XHRcdGlmICh0aGlzLl9jYXJldEluZGV4ID4gdGhpcy5fdGV4dC5sZW5ndGgpXG5cdFx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleCA9IHRoaXMuX3RleHQubGVuZ3RoO1xuXG5cdFx0XHRcdHRoaXMuZW5zdXJlQ2FyZXRJblZpZXcoKTtcblx0XHRcdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XG5cdFx0XHRcdHRoaXMuc2hvd0NhcmV0KCk7XG5cdFx0XHRcdHRoaXMudXBkYXRlVGV4dCgpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAzNzpcblx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleC0tO1xuXHRcdFx0XHRpZiAodGhpcy5fY2FyZXRJbmRleCA8IDApXG5cdFx0XHRcdFx0dGhpcy5fY2FyZXRJbmRleCA9IDA7XG5cblx0XHRcdFx0dGhpcy5lbnN1cmVDYXJldEluVmlldygpO1xuXHRcdFx0XHR0aGlzLnVwZGF0ZUNhcmV0UG9zaXRpb24oKTtcblx0XHRcdFx0dGhpcy5zaG93Q2FyZXQoKTtcblx0XHRcdFx0dGhpcy51cGRhdGVUZXh0KCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMudHJpZ2dlcih0aGlzLmtleWRvd24sIGUpO1xuXHR9XG59XG5cbi8qKlxuICogRW5zdXJlIHRoZSBjYXJldCBpcyBub3Qgb3V0c2lkZSB0aGUgYm91bmRzLlxuICogQG1ldGhvZCBlbnN1cmVDYXJldEluVmlld1xuICogQHByaXZhdGVcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZW5zdXJlQ2FyZXRJblZpZXcgPSBmdW5jdGlvbigpIHtcblx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XG5cblx0d2hpbGUgKHRoaXMuY2FyZXQucG9zaXRpb24ueCA+PSB0aGlzLmxvY2FsV2lkdGggLSAxKSB7XG5cdFx0dGhpcy5zY3JvbGxJbmRleCsrO1xuXHRcdHRoaXMudXBkYXRlQ2FyZXRQb3NpdGlvbigpO1xuXHR9XG5cblx0d2hpbGUgKHRoaXMuY2FyZXQucG9zaXRpb24ueCA8IDApIHtcblx0XHR0aGlzLnNjcm9sbEluZGV4IC09IDI7XG5cdFx0aWYgKHRoaXMuc2Nyb2xsSW5kZXggPCAwKVxuXHRcdFx0dGhpcy5zY3JvbGxJbmRleCA9IDA7XG5cdFx0dGhpcy51cGRhdGVDYXJldFBvc2l0aW9uKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBCbHVyIG91cnNlbGYuXG4gKiBAbWV0aG9kIGJsdXJcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuYmx1ciA9IGZ1bmN0aW9uKCkge1xuXHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XG5cdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCB0aGlzLmtleUV2ZW50Q2xvc3VyZSk7XG5cdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5kb2N1bWVudE1vdXNlRG93bkNsb3N1cmUpO1xuXHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgdGhpcy53aW5kb3dCbHVyQ2xvc3VyZSk7XG5cblx0dGhpcy5oaWRlQ2FyZXQoKTtcbn1cblxuLyoqXG4gKiBXaW5kb3cgYmx1ci5cbiAqIEBtZXRob2Qgb25Eb2N1bWVudE1vdXNlRG93blxuICogQHByaXZhdGVcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUub25Eb2N1bWVudE1vdXNlRG93biA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMuaXNGb2N1c0NsaWNrKVxuXHRcdHRoaXMuYmx1cigpO1xufVxuXG4vKipcbiAqIFdpbmRvdyBibHVyLlxuICogQG1ldGhvZCBvbldpbmRvd0JsdXJcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uV2luZG93Qmx1ciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmJsdXIoKTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgY2FyZXQgUG9zaXRpb24uXG4gKiBAbWV0aG9kIHVwZGF0ZUNhcmV0UG9zaXRpb25cbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnVwZGF0ZUNhcmV0UG9zaXRpb24gPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuX2NhcmV0SW5kZXggPCB0aGlzLnNjcm9sbEluZGV4KSB7XG5cdFx0dGhpcy5jYXJldC5wb3NpdGlvbi54ID0gLTE7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIHN1YiA9IHRoaXMuX3RleHQuc3Vic3RyaW5nKDAsIHRoaXMuX2NhcmV0SW5kZXgpLnN1YnN0cmluZyh0aGlzLnNjcm9sbEluZGV4KTtcblx0dGhpcy5jYXJldC5wb3NpdGlvbi54ID0gdGhpcy50ZXh0RmllbGQuY29udGV4dC5tZWFzdXJlVGV4dChzdWIpLndpZHRoO1xufVxuXG4vKipcbiAqIFVwZGF0ZSB0ZXh0LlxuICogQG1ldGhvZCB1cGRhdGVUZXh0XG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpVGV4dElucHV0LnByb3RvdHlwZS51cGRhdGVUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudGV4dEZpZWxkLnNldFRleHQodGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5zY3JvbGxJbmRleCkpO1xufVxuXG4vKipcbiAqIERyYXcgdGhlIGJhY2tncm91bmQgYW5kIGNhcmV0LlxuICogQG1ldGhvZCBkcmF3RWxlbWVudHNcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmRyYXdFbGVtZW50cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5jbGVhcigpO1xuXHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5iZWdpbkZpbGwodGhpcy5fYmFja2dyb3VuZENvbG9yKTtcblxuXHRpZiAodGhpcy5fYmFja2dyb3VuZClcblx0XHR0aGlzLmJhY2tncm91bmRHcmFwaGljcy5kcmF3UmVjdCgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xuXG5cdHRoaXMuYmFja2dyb3VuZEdyYXBoaWNzLmVuZEZpbGwoKTtcblx0dGhpcy5iYWNrZ3JvdW5kR3JhcGhpY3MuaGl0QXJlYSA9IG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xuXG5cdHRoaXMudGV4dEZpZWxkTWFzay5jbGVhcigpO1xuXHR0aGlzLnRleHRGaWVsZE1hc2suYmVnaW5GaWxsKHRoaXMuX2JhY2tncm91bmRDb2xvcik7XG5cdHRoaXMudGV4dEZpZWxkTWFzay5kcmF3UmVjdCgwLCAwLCB0aGlzLmxvY2FsV2lkdGgsIHRoaXMubG9jYWxIZWlnaHQpO1xuXHR0aGlzLnRleHRGaWVsZE1hc2suZW5kRmlsbCgpO1xuXG5cdHRoaXMuY2FyZXQuY2xlYXIoKTtcblx0dGhpcy5jYXJldC5iZWdpbkZpbGwodGhpcy5fY2FyZXRDb2xvcik7XG5cdHRoaXMuY2FyZXQuZHJhd1JlY3QoMSwgMSwgMSwgdGhpcy5sb2NhbEhlaWdodCAtIDIpO1xuXHR0aGlzLmNhcmV0LmVuZEZpbGwoKTtcbn1cblxuLyoqXG4gKiBTaG93IGNhcmV0LlxuICogQG1ldGhvZCBzaG93Q2FyZXRcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLnNob3dDYXJldCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpIHtcblx0XHRjbGVhckludGVydmFsKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKTtcblx0XHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IG51bGw7XG5cdH1cblxuXHR0aGlzLmNhcmV0LnZpc2libGUgPSB0cnVlO1xuXHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMub25DYXJldEZsYXNoSW50ZXJ2YWwuYmluZCh0aGlzKSwgNTAwKTtcbn1cblxuLyoqXG4gKiBIaWRlIGNhcmV0LlxuICogQG1ldGhvZCBoaWRlQ2FyZXRcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLmhpZGVDYXJldCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jYXJldEZsYXNoSW50ZXJ2YWwpIHtcblx0XHRjbGVhckludGVydmFsKHRoaXMuY2FyZXRGbGFzaEludGVydmFsKTtcblx0XHR0aGlzLmNhcmV0Rmxhc2hJbnRlcnZhbCA9IG51bGw7XG5cdH1cblxuXHR0aGlzLmNhcmV0LnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBDYXJldCBmbGFzaCBpbnRlcnZhbC5cbiAqIEBtZXRob2Qgb25DYXJldEZsYXNoSW50ZXJ2YWxcbiAqIEBwcml2YXRlXG4gKi9cblBpeGlUZXh0SW5wdXQucHJvdG90eXBlLm9uQ2FyZXRGbGFzaEludGVydmFsID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY2FyZXQudmlzaWJsZSA9ICF0aGlzLmNhcmV0LnZpc2libGU7XG59XG5cbi8qKlxuICogTWFwIHBvc2l0aW9uIHRvIGNhcmV0IGluZGV4LlxuICogQG1ldGhvZCBnZXRDYXJldEluZGV4QnlDb29yZFxuICogQHByaXZhdGVcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuZ2V0Q2FyZXRJbmRleEJ5Q29vcmQgPSBmdW5jdGlvbih4KSB7XG5cdHZhciBzbWFsbGVzdCA9IDEwMDAwO1xuXHR2YXIgY2FuZCA9IDA7XG5cdHZhciB2aXNpYmxlID0gdGhpcy5fdGV4dC5zdWJzdHJpbmcodGhpcy5zY3JvbGxJbmRleCk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHZpc2libGUubGVuZ3RoICsgMTsgaSsrKSB7XG5cdFx0dmFyIHN1YiA9IHZpc2libGUuc3Vic3RyaW5nKDAsIGkpO1xuXHRcdHZhciB3ID0gdGhpcy50ZXh0RmllbGQuY29udGV4dC5tZWFzdXJlVGV4dChzdWIpLndpZHRoO1xuXG5cdFx0aWYgKE1hdGguYWJzKHcgLSB4KSA8IHNtYWxsZXN0KSB7XG5cdFx0XHRzbWFsbGVzdCA9IE1hdGguYWJzKHcgLSB4KTtcblx0XHRcdGNhbmQgPSBpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzLnNjcm9sbEluZGV4ICsgY2FuZDtcbn1cblxuLyoqXG4gKiBUaGUgd2lkdGggb2YgdGhlIFBpeGlUZXh0SW5wdXQuIFRoaXMgaXMgb3ZlcnJpZGRlbiB0byBoYXZlIGEgc2xpZ2h0bHlcbiAqIGRpZmZlcmVudCBiZWhhaXZvdXIgdGhhbiB0aGUgb3RoZXIgRGlzcGxheU9iamVjdHMuIFNldHRpbmcgdGhlXG4gKiB3aWR0aCBvZiB0aGUgUGl4aVRleHRJbnB1dCBkb2VzIG5vdCBjaGFuZ2UgdGhlIHNjYWxlLCBidXQgaXQgcmF0aGVyXG4gKiBtYWtlcyB0aGUgZmllbGQgbGFyZ2VyLiBJZiB5b3UgYWN0dWFsbHkgd2FudCB0byBzY2FsZSBpdCxcbiAqIHVzZSB0aGUgc2NhbGUgcHJvcGVydHkuXG4gKiBAcHJvcGVydHkgd2lkdGhcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcIndpZHRoXCIsIHtcblx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5zY2FsZS54ICogdGhpcy5nZXRMb2NhbEJvdW5kcygpLndpZHRoO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odikge1xuXHRcdHRoaXMubG9jYWxXaWR0aCA9IHY7XG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcblx0XHR0aGlzLmVuc3VyZUNhcmV0SW5WaWV3KCk7XG5cdFx0dGhpcy51cGRhdGVUZXh0KCk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFRoZSB0ZXh0IGluIHRoZSBpbnB1dCBmaWVsZC4gU2V0dGluZyB3aWxsIGhhdmUgdGhlIGltcGxpY2l0IGZ1bmN0aW9uIG9mIHJlc2V0dGluZyB0aGUgc2Nyb2xsXG4gKiBvZiB0aGUgaW5wdXQgZmllbGQgYW5kIHJlbW92aW5nIGZvY3VzLlxuICogQHByb3BlcnR5IHRleHRcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcInRleHRcIiwge1xuXHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl90ZXh0O1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odikge1xuXHRcdHRoaXMuX3RleHQgPSB2LnRvU3RyaW5nKCk7XG5cdFx0dGhpcy5zY3JvbGxJbmRleCA9IDA7XG5cdFx0dGhpcy5jYXJldEluZGV4ID0gMDtcblx0XHR0aGlzLmJsdXIoKTtcblx0XHR0aGlzLnVwZGF0ZVRleHQoKTtcblx0fVxufSk7XG5cbi8qKlxuICogVGhlIGNvbG9yIG9mIHRoZSBiYWNrZ3JvdW5kIGZvciB0aGUgaW5wdXQgZmllbGQuXG4gKiBAcHJvcGVydHkgYmFja2dyb3VuZENvbG9yXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQaXhpVGV4dElucHV0LnByb3RvdHlwZSwgXCJiYWNrZ3JvdW5kQ29sb3JcIiwge1xuXHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9iYWNrZ3JvdW5kQ29sb3I7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2KSB7XG5cdFx0dGhpcy5fYmFja2dyb3VuZENvbG9yID0gdjtcblx0XHR0aGlzLmRyYXdFbGVtZW50cygpO1xuXHR9XG59KTtcblxuLyoqXG4gKiBUaGUgY29sb3Igb2YgdGhlIGNhcmV0LlxuICogQHByb3BlcnR5IGNhcmV0Q29sb3JcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBpeGlUZXh0SW5wdXQucHJvdG90eXBlLCBcImNhcmV0Q29sb3JcIiwge1xuXHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9jYXJldENvbG9yO1xuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24odikge1xuXHRcdHRoaXMuX2NhcmV0Q29sb3IgPSB2O1xuXHRcdHRoaXMuZHJhd0VsZW1lbnRzKCk7XG5cdH1cbn0pO1xuXG4vKipcbiAqIFNob3VsZCBhIGJhY2tncm91bmQgYmUgc2hvd24/XG4gKiBAcHJvcGVydHkgYmFja2dyb3VuZFxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGl4aVRleHRJbnB1dC5wcm90b3R5cGUsIFwiYmFja2dyb3VuZFwiLCB7XG5cdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2JhY2tncm91bmQ7XG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbih2KSB7XG5cdFx0dGhpcy5fYmFja2dyb3VuZCA9IHY7XG5cdFx0dGhpcy5kcmF3RWxlbWVudHMoKTtcblx0fVxufSk7XG5cbi8qKlxuICogU2V0IHRleHQuXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHYpIHtcblx0dGhpcy50ZXh0ID0gdjtcbn1cblxuLyoqXG4gKiBUcmlnZ2VyIGFuIGV2ZW50IGZ1bmN0aW9uIGlmIGl0IGV4aXN0cy5cbiAqIEBtZXRob2QgdHJpZ2dlclxuICogQHByaXZhdGVcbiAqL1xuUGl4aVRleHRJbnB1dC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGZuLCBlKSB7XG5cdGlmIChmbilcblx0XHRmbihlKTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gUGl4aVRleHRJbnB1dDtcbn0iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBwaXhpLmpzIC0gdjEuNi4wXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTItMjAxNCwgTWF0IEdyb3Zlc1xuICogaHR0cDovL2dvb2Rib3lkaWdpdGFsLmNvbS9cbiAqXG4gKiBDb21waWxlZDogMjAxNC0wNy0xOFxuICpcbiAqIHBpeGkuanMgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICogaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAqL1xuKGZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxiPWJ8fHt9O2IuV0VCR0xfUkVOREVSRVI9MCxiLkNBTlZBU19SRU5ERVJFUj0xLGIuVkVSU0lPTj1cInYxLjYuMVwiLGIuYmxlbmRNb2Rlcz17Tk9STUFMOjAsQUREOjEsTVVMVElQTFk6MixTQ1JFRU46MyxPVkVSTEFZOjQsREFSS0VOOjUsTElHSFRFTjo2LENPTE9SX0RPREdFOjcsQ09MT1JfQlVSTjo4LEhBUkRfTElHSFQ6OSxTT0ZUX0xJR0hUOjEwLERJRkZFUkVOQ0U6MTEsRVhDTFVTSU9OOjEyLEhVRToxMyxTQVRVUkFUSU9OOjE0LENPTE9SOjE1LExVTUlOT1NJVFk6MTZ9LGIuc2NhbGVNb2Rlcz17REVGQVVMVDowLExJTkVBUjowLE5FQVJFU1Q6MX0sYi5fVUlEPTAsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZsb2F0MzJBcnJheT8oYi5GbG9hdDMyQXJyYXk9RmxvYXQzMkFycmF5LGIuVWludDE2QXJyYXk9VWludDE2QXJyYXkpOihiLkZsb2F0MzJBcnJheT1BcnJheSxiLlVpbnQxNkFycmF5PUFycmF5KSxiLklOVEVSQUNUSU9OX0ZSRVFVRU5DWT0zMCxiLkFVVE9fUFJFVkVOVF9ERUZBVUxUPSEwLGIuUkFEX1RPX0RFRz0xODAvTWF0aC5QSSxiLkRFR19UT19SQUQ9TWF0aC5QSS8xODAsYi5kb250U2F5SGVsbG89ITEsYi5zYXlIZWxsbz1mdW5jdGlvbihhKXtpZighYi5kb250U2F5SGVsbG8pe2lmKG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKFwiY2hyb21lXCIpPi0xKXt2YXIgYz1bXCIlYyAlYyAlYyBQaXhpLmpzIFwiK2IuVkVSU0lPTitcIiAtIFwiK2ErXCIgICVjICAlYyAgaHR0cDovL3d3dy5waXhpanMuY29tLyAgJWMgJWMg4pmlJWPimaUlY+KZpSBcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImJhY2tncm91bmQ6ICNmZjY2YTVcIixcImNvbG9yOiAjZmY2NmE1OyBiYWNrZ3JvdW5kOiAjMDMwMzA3O1wiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiYmFja2dyb3VuZDogI2ZmYzNkY1wiLFwiYmFja2dyb3VuZDogI2ZmNjZhNVwiLFwiY29sb3I6ICNmZjI0MjQ7IGJhY2tncm91bmQ6ICNmZmZcIixcImNvbG9yOiAjZmYyNDI0OyBiYWNrZ3JvdW5kOiAjZmZmXCIsXCJjb2xvcjogI2ZmMjQyNDsgYmFja2dyb3VuZDogI2ZmZlwiXTtjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLGMpfWVsc2Ugd2luZG93LmNvbnNvbGUmJmNvbnNvbGUubG9nKFwiUGl4aS5qcyBcIitiLlZFUlNJT04rXCIgLSBodHRwOi8vd3d3LnBpeGlqcy5jb20vXCIpO2IuZG9udFNheUhlbGxvPSEwfX0sYi5Qb2ludD1mdW5jdGlvbihhLGIpe3RoaXMueD1hfHwwLHRoaXMueT1ifHwwfSxiLlBvaW50LnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5Qb2ludCh0aGlzLngsdGhpcy55KX0sYi5Qb2ludC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKGEsYil7dGhpcy54PWF8fDAsdGhpcy55PWJ8fCgwIT09Yj90aGlzLng6MCl9LGIuUG9pbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUG9pbnQsYi5SZWN0YW5nbGU9ZnVuY3Rpb24oYSxiLGMsZCl7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDAsdGhpcy53aWR0aD1jfHwwLHRoaXMuaGVpZ2h0PWR8fDB9LGIuUmVjdGFuZ2xlLnByb3RvdHlwZS5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBuZXcgYi5SZWN0YW5nbGUodGhpcy54LHRoaXMueSx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5SZWN0YW5nbGUucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7aWYodGhpcy53aWR0aDw9MHx8dGhpcy5oZWlnaHQ8PTApcmV0dXJuITE7dmFyIGM9dGhpcy54O2lmKGE+PWMmJmE8PWMrdGhpcy53aWR0aCl7dmFyIGQ9dGhpcy55O2lmKGI+PWQmJmI8PWQrdGhpcy5oZWlnaHQpcmV0dXJuITB9cmV0dXJuITF9LGIuUmVjdGFuZ2xlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlJlY3RhbmdsZSxiLkVtcHR5UmVjdGFuZ2xlPW5ldyBiLlJlY3RhbmdsZSgwLDAsMCwwKSxiLlBvbHlnb249ZnVuY3Rpb24oYSl7aWYoYSBpbnN0YW5jZW9mIEFycmF5fHwoYT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSxcIm51bWJlclwiPT10eXBlb2YgYVswXSl7Zm9yKHZhciBjPVtdLGQ9MCxlPWEubGVuZ3RoO2U+ZDtkKz0yKWMucHVzaChuZXcgYi5Qb2ludChhW2RdLGFbZCsxXSkpO2E9Y310aGlzLnBvaW50cz1hfSxiLlBvbHlnb24ucHJvdG90eXBlLmNsb25lPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPVtdLGM9MDtjPHRoaXMucG9pbnRzLmxlbmd0aDtjKyspYS5wdXNoKHRoaXMucG9pbnRzW2NdLmNsb25lKCkpO3JldHVybiBuZXcgYi5Qb2x5Z29uKGEpfSxiLlBvbHlnb24ucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPSExLGQ9MCxlPXRoaXMucG9pbnRzLmxlbmd0aC0xO2Q8dGhpcy5wb2ludHMubGVuZ3RoO2U9ZCsrKXt2YXIgZj10aGlzLnBvaW50c1tkXS54LGc9dGhpcy5wb2ludHNbZF0ueSxoPXRoaXMucG9pbnRzW2VdLngsaT10aGlzLnBvaW50c1tlXS55LGo9Zz5iIT1pPmImJihoLWYpKihiLWcpLyhpLWcpK2Y+YTtqJiYoYz0hYyl9cmV0dXJuIGN9LGIuUG9seWdvbi5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Qb2x5Z29uLGIuQ2lyY2xlPWZ1bmN0aW9uKGEsYixjKXt0aGlzLng9YXx8MCx0aGlzLnk9Ynx8MCx0aGlzLnJhZGl1cz1jfHwwfSxiLkNpcmNsZS5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuQ2lyY2xlKHRoaXMueCx0aGlzLnksdGhpcy5yYWRpdXMpfSxiLkNpcmNsZS5wcm90b3R5cGUuY29udGFpbnM9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLnJhZGl1czw9MClyZXR1cm4hMTt2YXIgYz10aGlzLngtYSxkPXRoaXMueS1iLGU9dGhpcy5yYWRpdXMqdGhpcy5yYWRpdXM7cmV0dXJuIGMqPWMsZCo9ZCxlPj1jK2R9LGIuQ2lyY2xlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUmVjdGFuZ2xlKHRoaXMueC10aGlzLnJhZGl1cyx0aGlzLnktdGhpcy5yYWRpdXMsdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuQ2lyY2xlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkNpcmNsZSxiLkVsbGlwc2U9ZnVuY3Rpb24oYSxiLGMsZCl7dGhpcy54PWF8fDAsdGhpcy55PWJ8fDAsdGhpcy53aWR0aD1jfHwwLHRoaXMuaGVpZ2h0PWR8fDB9LGIuRWxsaXBzZS5wcm90b3R5cGUuY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuRWxsaXBzZSh0aGlzLngsdGhpcy55LHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpfSxiLkVsbGlwc2UucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7aWYodGhpcy53aWR0aDw9MHx8dGhpcy5oZWlnaHQ8PTApcmV0dXJuITE7dmFyIGM9KGEtdGhpcy54KS90aGlzLndpZHRoLGQ9KGItdGhpcy55KS90aGlzLmhlaWdodDtyZXR1cm4gYyo9YyxkKj1kLDE+PWMrZH0sYi5FbGxpcHNlLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGIuUmVjdGFuZ2xlKHRoaXMueC10aGlzLndpZHRoLHRoaXMueS10aGlzLmhlaWdodCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KX0sYi5FbGxpcHNlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkVsbGlwc2UsYi5NYXRyaXg9ZnVuY3Rpb24oKXt0aGlzLmE9MSx0aGlzLmI9MCx0aGlzLmM9MCx0aGlzLmQ9MSx0aGlzLnR4PTAsdGhpcy50eT0wfSxiLk1hdHJpeC5wcm90b3R5cGUuZnJvbUFycmF5PWZ1bmN0aW9uKGEpe3RoaXMuYT1hWzBdLHRoaXMuYj1hWzFdLHRoaXMuYz1hWzNdLHRoaXMuZD1hWzRdLHRoaXMudHg9YVsyXSx0aGlzLnR5PWFbNV19LGIuTWF0cml4LnByb3RvdHlwZS50b0FycmF5PWZ1bmN0aW9uKGEpe3RoaXMuYXJyYXl8fCh0aGlzLmFycmF5PW5ldyBGbG9hdDMyQXJyYXkoOSkpO3ZhciBiPXRoaXMuYXJyYXk7cmV0dXJuIGE/KGJbMF09dGhpcy5hLGJbMV09dGhpcy5jLGJbMl09MCxiWzNdPXRoaXMuYixiWzRdPXRoaXMuZCxiWzVdPTAsYls2XT10aGlzLnR4LGJbN109dGhpcy50eSxiWzhdPTEpOihiWzBdPXRoaXMuYSxiWzFdPXRoaXMuYixiWzJdPXRoaXMudHgsYlszXT10aGlzLmMsYls0XT10aGlzLmQsYls1XT10aGlzLnR5LGJbNl09MCxiWzddPTAsYls4XT0xKSxifSxiLmlkZW50aXR5TWF0cml4PW5ldyBiLk1hdHJpeCxiLmRldGVybWluZU1hdHJpeEFycmF5VHlwZT1mdW5jdGlvbigpe3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBGbG9hdDMyQXJyYXk/RmxvYXQzMkFycmF5OkFycmF5fSxiLk1hdHJpeDI9Yi5kZXRlcm1pbmVNYXRyaXhBcnJheVR5cGUoKSxiLkRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oKXt0aGlzLnBvc2l0aW9uPW5ldyBiLlBvaW50LHRoaXMuc2NhbGU9bmV3IGIuUG9pbnQoMSwxKSx0aGlzLnBpdm90PW5ldyBiLlBvaW50KDAsMCksdGhpcy5yb3RhdGlvbj0wLHRoaXMuYWxwaGE9MSx0aGlzLnZpc2libGU9ITAsdGhpcy5oaXRBcmVhPW51bGwsdGhpcy5idXR0b25Nb2RlPSExLHRoaXMucmVuZGVyYWJsZT0hMSx0aGlzLnBhcmVudD1udWxsLHRoaXMuc3RhZ2U9bnVsbCx0aGlzLndvcmxkQWxwaGE9MSx0aGlzLl9pbnRlcmFjdGl2ZT0hMSx0aGlzLmRlZmF1bHRDdXJzb3I9XCJwb2ludGVyXCIsdGhpcy53b3JsZFRyYW5zZm9ybT1uZXcgYi5NYXRyaXgsdGhpcy5jb2xvcj1bXSx0aGlzLmR5bmFtaWM9ITAsdGhpcy5fc3I9MCx0aGlzLl9jcj0xLHRoaXMuZmlsdGVyQXJlYT1udWxsLHRoaXMuX2JvdW5kcz1uZXcgYi5SZWN0YW5nbGUoMCwwLDEsMSksdGhpcy5fY3VycmVudEJvdW5kcz1udWxsLHRoaXMuX21hc2s9bnVsbCx0aGlzLl9jYWNoZUFzQml0bWFwPSExLHRoaXMuX2NhY2hlSXNEaXJ0eT0hMX0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRpc3BsYXlPYmplY3QsYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS5zZXRJbnRlcmFjdGl2ZT1mdW5jdGlvbihhKXt0aGlzLmludGVyYWN0aXZlPWF9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwiaW50ZXJhY3RpdmVcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2ludGVyYWN0aXZlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5faW50ZXJhY3RpdmU9YSx0aGlzLnN0YWdlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCl9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJ3b3JsZFZpc2libGVcIix7Z2V0OmZ1bmN0aW9uKCl7dmFyIGE9dGhpcztkb3tpZighYS52aXNpYmxlKXJldHVybiExO2E9YS5wYXJlbnR9d2hpbGUoYSk7cmV0dXJuITB9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJtYXNrXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXNrfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fbWFzayYmKHRoaXMuX21hc2suaXNNYXNrPSExKSx0aGlzLl9tYXNrPWEsdGhpcy5fbWFzayYmKHRoaXMuX21hc2suaXNNYXNrPSEwKX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSxcImZpbHRlcnNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2ZpbHRlcnN9LHNldDpmdW5jdGlvbihhKXtpZihhKXtmb3IodmFyIGI9W10sYz0wO2M8YS5sZW5ndGg7YysrKWZvcih2YXIgZD1hW2NdLnBhc3NlcyxlPTA7ZTxkLmxlbmd0aDtlKyspYi5wdXNoKGRbZV0pO3RoaXMuX2ZpbHRlckJsb2NrPXt0YXJnZXQ6dGhpcyxmaWx0ZXJQYXNzZXM6Yn19dGhpcy5fZmlsdGVycz1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwiY2FjaGVBc0JpdG1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY2FjaGVBc0JpdG1hcH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2NhY2hlQXNCaXRtYXAhPT1hJiYoYT90aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpOnRoaXMuX2Rlc3Ryb3lDYWNoZWRTcHJpdGUoKSx0aGlzLl9jYWNoZUFzQml0bWFwPWEpfX0pLGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5yb3RhdGlvbiE9PXRoaXMucm90YXRpb25DYWNoZSYmKHRoaXMucm90YXRpb25DYWNoZT10aGlzLnJvdGF0aW9uLHRoaXMuX3NyPU1hdGguc2luKHRoaXMucm90YXRpb24pLHRoaXMuX2NyPU1hdGguY29zKHRoaXMucm90YXRpb24pKTt2YXIgYT10aGlzLnBhcmVudC53b3JsZFRyYW5zZm9ybSxiPXRoaXMud29ybGRUcmFuc2Zvcm0sYz10aGlzLnBpdm90LngsZD10aGlzLnBpdm90LnksZT10aGlzLl9jcip0aGlzLnNjYWxlLngsZj0tdGhpcy5fc3IqdGhpcy5zY2FsZS55LGc9dGhpcy5fc3IqdGhpcy5zY2FsZS54LGg9dGhpcy5fY3IqdGhpcy5zY2FsZS55LGk9dGhpcy5wb3NpdGlvbi54LWUqYy1kKmYsaj10aGlzLnBvc2l0aW9uLnktaCpkLWMqZyxrPWEuYSxsPWEuYixtPWEuYyxuPWEuZDtiLmE9ayplK2wqZyxiLmI9aypmK2wqaCxiLnR4PWsqaStsKmorYS50eCxiLmM9bSplK24qZyxiLmQ9bSpmK24qaCxiLnR5PW0qaStuKmorYS50eSx0aGlzLndvcmxkQWxwaGE9dGhpcy5hbHBoYSp0aGlzLnBhcmVudC53b3JsZEFscGhhfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLmdldEJvdW5kcz1mdW5jdGlvbihhKXtyZXR1cm4gYT1hLGIuRW1wdHlSZWN0YW5nbGV9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuZ2V0TG9jYWxCb3VuZHM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXRCb3VuZHMoYi5pZGVudGl0eU1hdHJpeCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuc2V0U3RhZ2VSZWZlcmVuY2U9ZnVuY3Rpb24oYSl7dGhpcy5zdGFnZT1hLHRoaXMuX2ludGVyYWN0aXZlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuZ2VuZXJhdGVUZXh0dXJlPWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKSxkPW5ldyBiLlJlbmRlclRleHR1cmUoMHxjLndpZHRoLDB8Yy5oZWlnaHQsYSk7cmV0dXJuIGQucmVuZGVyKHRoaXMsbmV3IGIuUG9pbnQoLWMueCwtYy55KSksZH0sYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVDYWNoZT1mdW5jdGlvbigpe3RoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCl9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX3JlbmRlckNhY2hlZFNwcml0ZT1mdW5jdGlvbihhKXt0aGlzLl9jYWNoZWRTcHJpdGUud29ybGRBbHBoYT10aGlzLndvcmxkQWxwaGEsYS5nbD9iLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMLmNhbGwodGhpcy5fY2FjaGVkU3ByaXRlLGEpOmIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzLmNhbGwodGhpcy5fY2FjaGVkU3ByaXRlLGEpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3RoaXMuX2NhY2hlQXNCaXRtYXA9ITE7dmFyIGE9dGhpcy5nZXRMb2NhbEJvdW5kcygpO2lmKHRoaXMuX2NhY2hlZFNwcml0ZSl0aGlzLl9jYWNoZWRTcHJpdGUudGV4dHVyZS5yZXNpemUoMHxhLndpZHRoLDB8YS5oZWlnaHQpO2Vsc2V7dmFyIGM9bmV3IGIuUmVuZGVyVGV4dHVyZSgwfGEud2lkdGgsMHxhLmhlaWdodCk7dGhpcy5fY2FjaGVkU3ByaXRlPW5ldyBiLlNwcml0ZShjKSx0aGlzLl9jYWNoZWRTcHJpdGUud29ybGRUcmFuc2Zvcm09dGhpcy53b3JsZFRyYW5zZm9ybX12YXIgZD10aGlzLl9maWx0ZXJzO3RoaXMuX2ZpbHRlcnM9bnVsbCx0aGlzLl9jYWNoZWRTcHJpdGUuZmlsdGVycz1kLHRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLnJlbmRlcih0aGlzLG5ldyBiLlBvaW50KC1hLngsLWEueSkpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueD0tKGEueC9hLndpZHRoKSx0aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLnk9LShhLnkvYS5oZWlnaHQpLHRoaXMuX2ZpbHRlcnM9ZCx0aGlzLl9jYWNoZUFzQml0bWFwPSEwfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9kZXN0cm95Q2FjaGVkU3ByaXRlPWZ1bmN0aW9uKCl7dGhpcy5fY2FjaGVkU3ByaXRlJiYodGhpcy5fY2FjaGVkU3ByaXRlLnRleHR1cmUuZGVzdHJveSghMCksdGhpcy5fY2FjaGVkU3ByaXRlPW51bGwpfSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXthPWF9LGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXthPWF9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLFwieFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wb3NpdGlvbi54fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5wb3NpdGlvbi54PWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdC5wcm90b3R5cGUsXCJ5XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnBvc2l0aW9uLnl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnBvc2l0aW9uLnk9YX19KSxiLkRpc3BsYXlPYmplY3RDb250YWluZXI9ZnVuY3Rpb24oKXtiLkRpc3BsYXlPYmplY3QuY2FsbCh0aGlzKSx0aGlzLmNoaWxkcmVuPVtdfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZSksYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkRpc3BsYXlPYmplY3RDb250YWluZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS54KnRoaXMuZ2V0TG9jYWxCb3VuZHMoKS53aWR0aH0sc2V0OmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuZ2V0TG9jYWxCb3VuZHMoKS53aWR0aDt0aGlzLnNjYWxlLng9MCE9PWI/YS8oYi90aGlzLnNjYWxlLngpOjEsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zY2FsZS55KnRoaXMuZ2V0TG9jYWxCb3VuZHMoKS5oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt2YXIgYj10aGlzLmdldExvY2FsQm91bmRzKCkuaGVpZ2h0O3RoaXMuc2NhbGUueT0wIT09Yj9hLyhiL3RoaXMuc2NhbGUueSk6MSx0aGlzLl9oZWlnaHQ9YX19KSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmFkZENoaWxkPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmFkZENoaWxkQXQoYSx0aGlzLmNoaWxkcmVuLmxlbmd0aCl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuYWRkQ2hpbGRBdD1mdW5jdGlvbihhLGIpe2lmKGI+PTAmJmI8PXRoaXMuY2hpbGRyZW4ubGVuZ3RoKXJldHVybiBhLnBhcmVudCYmYS5wYXJlbnQucmVtb3ZlQ2hpbGQoYSksYS5wYXJlbnQ9dGhpcyx0aGlzLmNoaWxkcmVuLnNwbGljZShiLDAsYSksdGhpcy5zdGFnZSYmYS5zZXRTdGFnZVJlZmVyZW5jZSh0aGlzLnN0YWdlKSxhO3Rocm93IG5ldyBFcnJvcihhK1wiIFRoZSBpbmRleCBcIitiK1wiIHN1cHBsaWVkIGlzIG91dCBvZiBib3VuZHMgXCIrdGhpcy5jaGlsZHJlbi5sZW5ndGgpfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnN3YXBDaGlsZHJlbj1mdW5jdGlvbihhLGIpe2lmKGEhPT1iKXt2YXIgYz10aGlzLmNoaWxkcmVuLmluZGV4T2YoYSksZD10aGlzLmNoaWxkcmVuLmluZGV4T2YoYik7aWYoMD5jfHwwPmQpdGhyb3cgbmV3IEVycm9yKFwic3dhcENoaWxkcmVuOiBCb3RoIHRoZSBzdXBwbGllZCBEaXNwbGF5T2JqZWN0cyBtdXN0IGJlIGEgY2hpbGQgb2YgdGhlIGNhbGxlci5cIik7dGhpcy5jaGlsZHJlbltjXT1iLHRoaXMuY2hpbGRyZW5bZF09YX19LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuZ2V0Q2hpbGRBdD1mdW5jdGlvbihhKXtpZihhPj0wJiZhPHRoaXMuY2hpbGRyZW4ubGVuZ3RoKXJldHVybiB0aGlzLmNoaWxkcmVuW2FdO3Rocm93IG5ldyBFcnJvcihcIlN1cHBsaWVkIGluZGV4IGRvZXMgbm90IGV4aXN0IGluIHRoZSBjaGlsZCBsaXN0LCBvciB0aGUgc3VwcGxpZWQgRGlzcGxheU9iamVjdCBtdXN0IGJlIGEgY2hpbGQgb2YgdGhlIGNhbGxlclwiKX0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5yZW1vdmVDaGlsZD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5yZW1vdmVDaGlsZEF0KHRoaXMuY2hpbGRyZW4uaW5kZXhPZihhKSl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUucmVtb3ZlQ2hpbGRBdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmdldENoaWxkQXQoYSk7cmV0dXJuIHRoaXMuc3RhZ2UmJmIucmVtb3ZlU3RhZ2VSZWZlcmVuY2UoKSxiLnBhcmVudD12b2lkIDAsdGhpcy5jaGlsZHJlbi5zcGxpY2UoYSwxKSxifSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZUNoaWxkcmVuPWZ1bmN0aW9uKGEsYil7dmFyIGM9YXx8MCxkPVwibnVtYmVyXCI9PXR5cGVvZiBiP2I6dGhpcy5jaGlsZHJlbi5sZW5ndGgsZT1kLWM7aWYoZT4wJiZkPj1lKXtmb3IodmFyIGY9dGhpcy5jaGlsZHJlbi5zcGxpY2UoYyxlKSxnPTA7ZzxmLmxlbmd0aDtnKyspe3ZhciBoPWZbZ107dGhpcy5zdGFnZSYmaC5yZW1vdmVTdGFnZVJlZmVyZW5jZSgpLGgucGFyZW50PXZvaWQgMH1yZXR1cm4gZn10aHJvdyBuZXcgRXJyb3IoXCJSYW5nZSBFcnJvciwgbnVtZXJpYyB2YWx1ZXMgYXJlIG91dHNpZGUgdGhlIGFjY2VwdGFibGUgcmFuZ2VcIil9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7aWYodGhpcy52aXNpYmxlJiYoYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKSwhdGhpcy5fY2FjaGVBc0JpdG1hcCkpZm9yKHZhciBhPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmE7YSsrKXRoaXMuY2hpbGRyZW5bYV0udXBkYXRlVHJhbnNmb3JtKCl9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe2lmKDA9PT10aGlzLmNoaWxkcmVuLmxlbmd0aClyZXR1cm4gYi5FbXB0eVJlY3RhbmdsZTtpZihhKXt2YXIgYz10aGlzLndvcmxkVHJhbnNmb3JtO3RoaXMud29ybGRUcmFuc2Zvcm09YSx0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpLHRoaXMud29ybGRUcmFuc2Zvcm09Y31mb3IodmFyIGQsZSxmLGc9MS8wLGg9MS8wLGk9LTEvMCxqPS0xLzAsaz0hMSxsPTAsbT10aGlzLmNoaWxkcmVuLmxlbmd0aDttPmw7bCsrKXt2YXIgbj10aGlzLmNoaWxkcmVuW2xdO24udmlzaWJsZSYmKGs9ITAsZD10aGlzLmNoaWxkcmVuW2xdLmdldEJvdW5kcyhhKSxnPWc8ZC54P2c6ZC54LGg9aDxkLnk/aDpkLnksZT1kLndpZHRoK2QueCxmPWQuaGVpZ2h0K2QueSxpPWk+ZT9pOmUsaj1qPmY/ajpmKX1pZighaylyZXR1cm4gYi5FbXB0eVJlY3RhbmdsZTt2YXIgbz10aGlzLl9ib3VuZHM7cmV0dXJuIG8ueD1nLG8ueT1oLG8ud2lkdGg9aS1nLG8uaGVpZ2h0PWotaCxvfSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLmdldExvY2FsQm91bmRzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy53b3JsZFRyYW5zZm9ybTt0aGlzLndvcmxkVHJhbnNmb3JtPWIuaWRlbnRpdHlNYXRyaXg7Zm9yKHZhciBjPTAsZD10aGlzLmNoaWxkcmVuLmxlbmd0aDtkPmM7YysrKXRoaXMuY2hpbGRyZW5bY10udXBkYXRlVHJhbnNmb3JtKCk7dmFyIGU9dGhpcy5nZXRCb3VuZHMoKTtyZXR1cm4gdGhpcy53b3JsZFRyYW5zZm9ybT1hLGV9LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuc2V0U3RhZ2VSZWZlcmVuY2U9ZnVuY3Rpb24oYSl7dGhpcy5zdGFnZT1hLHRoaXMuX2ludGVyYWN0aXZlJiYodGhpcy5zdGFnZS5kaXJ0eT0hMCk7Zm9yKHZhciBiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXt2YXIgZD10aGlzLmNoaWxkcmVuW2JdO2Quc2V0U3RhZ2VSZWZlcmVuY2UoYSl9fSxiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnJlbW92ZVN0YWdlUmVmZXJlbmNlPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPTAsYj10aGlzLmNoaWxkcmVuLmxlbmd0aDtiPmE7YSsrKXt2YXIgYz10aGlzLmNoaWxkcmVuW2FdO2MucmVtb3ZlU3RhZ2VSZWZlcmVuY2UoKX10aGlzLl9pbnRlcmFjdGl2ZSYmKHRoaXMuc3RhZ2UuZGlydHk9ITApLHRoaXMuc3RhZ2U9bnVsbH0sYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlJiYhKHRoaXMuYWxwaGE8PTApKXtpZih0aGlzLl9jYWNoZUFzQml0bWFwKXJldHVybiB0aGlzLl9yZW5kZXJDYWNoZWRTcHJpdGUoYSksdm9pZCAwO3ZhciBiLGM7aWYodGhpcy5fbWFza3x8dGhpcy5fZmlsdGVycyl7Zm9yKHRoaXMuX2ZpbHRlcnMmJihhLnNwcml0ZUJhdGNoLmZsdXNoKCksYS5maWx0ZXJNYW5hZ2VyLnB1c2hGaWx0ZXIodGhpcy5fZmlsdGVyQmxvY2spKSx0aGlzLl9tYXNrJiYoYS5zcHJpdGVCYXRjaC5zdG9wKCksYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLm1hc2ssYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpKSxiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXRoaXMuY2hpbGRyZW5bYl0uX3JlbmRlcldlYkdMKGEpO2Euc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayh0aGlzLl9tYXNrLGEpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCl9ZWxzZSBmb3IoYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKX19LGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe2lmKHRoaXMuX2NhY2hlQXNCaXRtYXApcmV0dXJuIHRoaXMuX3JlbmRlckNhY2hlZFNwcml0ZShhKSx2b2lkIDA7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEuY29udGV4dCk7Zm9yKHZhciBiPTAsYz10aGlzLmNoaWxkcmVuLmxlbmd0aDtjPmI7YisrKXt2YXIgZD10aGlzLmNoaWxkcmVuW2JdO2QuX3JlbmRlckNhbnZhcyhhKX10aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KX19LGIuU3ByaXRlPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMuYW5jaG9yPW5ldyBiLlBvaW50LHRoaXMudGV4dHVyZT1hLHRoaXMuX3dpZHRoPTAsdGhpcy5faGVpZ2h0PTAsdGhpcy50aW50PTE2Nzc3MjE1LHRoaXMuYmxlbmRNb2RlPWIuYmxlbmRNb2Rlcy5OT1JNQUwsYS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ/dGhpcy5vblRleHR1cmVVcGRhdGUoKToodGhpcy5vblRleHR1cmVVcGRhdGVCaW5kPXRoaXMub25UZXh0dXJlVXBkYXRlLmJpbmQodGhpcyksdGhpcy50ZXh0dXJlLmFkZEV2ZW50TGlzdGVuZXIoXCJ1cGRhdGVcIix0aGlzLm9uVGV4dHVyZVVwZGF0ZUJpbmQpKSx0aGlzLnJlbmRlcmFibGU9ITB9LGIuU3ByaXRlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3ByaXRlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNwcml0ZSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5TcHJpdGUucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbGUueCp0aGlzLnRleHR1cmUuZnJhbWUud2lkdGh9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLng9YS90aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5TcHJpdGUucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYWxlLnkqdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuc2NhbGUueT1hL3RoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQsdGhpcy5faGVpZ2h0PWF9fSksYi5TcHJpdGUucHJvdG90eXBlLnNldFRleHR1cmU9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0dXJlPWEsdGhpcy5jYWNoZWRUaW50PTE2Nzc3MjE1fSxiLlNwcml0ZS5wcm90b3R5cGUub25UZXh0dXJlVXBkYXRlPWZ1bmN0aW9uKCl7dGhpcy5fd2lkdGgmJih0aGlzLnNjYWxlLng9dGhpcy5fd2lkdGgvdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoKSx0aGlzLl9oZWlnaHQmJih0aGlzLnNjYWxlLnk9dGhpcy5faGVpZ2h0L3RoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQpfSxiLlNwcml0ZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMudGV4dHVyZS5mcmFtZS53aWR0aCxjPXRoaXMudGV4dHVyZS5mcmFtZS5oZWlnaHQsZD1iKigxLXRoaXMuYW5jaG9yLngpLGU9YiotdGhpcy5hbmNob3IueCxmPWMqKDEtdGhpcy5hbmNob3IueSksZz1jKi10aGlzLmFuY2hvci55LGg9YXx8dGhpcy53b3JsZFRyYW5zZm9ybSxpPWguYSxqPWguYyxrPWguYixsPWguZCxtPWgudHgsbj1oLnR5LG89aSplK2sqZyttLHA9bCpnK2oqZStuLHE9aSpkK2sqZyttLHI9bCpnK2oqZCtuLHM9aSpkK2sqZittLHQ9bCpmK2oqZCtuLHU9aSplK2sqZittLHY9bCpmK2oqZStuLHc9LTEvMCx4PS0xLzAseT0xLzAsej0xLzA7eT15Pm8/bzp5LHk9eT5xP3E6eSx5PXk+cz9zOnkseT15PnU/dTp5LHo9ej5wP3A6eix6PXo+cj9yOnosej16PnQ/dDp6LHo9ej52P3Y6eix3PW8+dz9vOncsdz1xPnc/cTp3LHc9cz53P3M6dyx3PXU+dz91OncseD1wPng/cDp4LHg9cj54P3I6eCx4PXQ+eD90OngseD12Png/djp4O3ZhciBBPXRoaXMuX2JvdW5kcztyZXR1cm4gQS54PXksQS53aWR0aD13LXksQS55PXosQS5oZWlnaHQ9eC16LHRoaXMuX2N1cnJlbnRCb3VuZHM9QSxBfSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSYmISh0aGlzLmFscGhhPD0wKSl7dmFyIGIsYztpZih0aGlzLl9tYXNrfHx0aGlzLl9maWx0ZXJzKXt2YXIgZD1hLnNwcml0ZUJhdGNoO2Zvcih0aGlzLl9maWx0ZXJzJiYoZC5mbHVzaCgpLGEuZmlsdGVyTWFuYWdlci5wdXNoRmlsdGVyKHRoaXMuX2ZpbHRlckJsb2NrKSksdGhpcy5fbWFzayYmKGQuc3RvcCgpLGEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5tYXNrLGEpLGQuc3RhcnQoKSksZC5yZW5kZXIodGhpcyksYj0wLGM9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Yz5iO2IrKyl0aGlzLmNoaWxkcmVuW2JdLl9yZW5kZXJXZWJHTChhKTtkLnN0b3AoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2sodGhpcy5fbWFzayxhKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucG9wRmlsdGVyKCksZC5zdGFydCgpfWVsc2UgZm9yKGEuc3ByaXRlQmF0Y2gucmVuZGVyKHRoaXMpLGI9MCxjPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2M+YjtiKyspdGhpcy5jaGlsZHJlbltiXS5fcmVuZGVyV2ViR0woYSl9fSxiLlNwcml0ZS5wcm90b3R5cGUuX3JlbmRlckNhbnZhcz1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEpe2lmKHRoaXMuYmxlbmRNb2RlIT09YS5jdXJyZW50QmxlbmRNb2RlJiYoYS5jdXJyZW50QmxlbmRNb2RlPXRoaXMuYmxlbmRNb2RlLGEuY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249Yi5ibGVuZE1vZGVzQ2FudmFzW2EuY3VycmVudEJsZW5kTW9kZV0pLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhLmNvbnRleHQpLHRoaXMudGV4dHVyZS52YWxpZCl7YS5jb250ZXh0Lmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSxhLnJvdW5kUGl4ZWxzP2EuY29udGV4dC5zZXRUcmFuc2Zvcm0odGhpcy53b3JsZFRyYW5zZm9ybS5hLHRoaXMud29ybGRUcmFuc2Zvcm0uYyx0aGlzLndvcmxkVHJhbnNmb3JtLmIsdGhpcy53b3JsZFRyYW5zZm9ybS5kLDB8dGhpcy53b3JsZFRyYW5zZm9ybS50eCwwfHRoaXMud29ybGRUcmFuc2Zvcm0udHkpOmEuY29udGV4dC5zZXRUcmFuc2Zvcm0odGhpcy53b3JsZFRyYW5zZm9ybS5hLHRoaXMud29ybGRUcmFuc2Zvcm0uYyx0aGlzLndvcmxkVHJhbnNmb3JtLmIsdGhpcy53b3JsZFRyYW5zZm9ybS5kLHRoaXMud29ybGRUcmFuc2Zvcm0udHgsdGhpcy53b3JsZFRyYW5zZm9ybS50eSksYS5zbW9vdGhQcm9wZXJ0eSYmYS5zY2FsZU1vZGUhPT10aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuc2NhbGVNb2RlJiYoYS5zY2FsZU1vZGU9dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLnNjYWxlTW9kZSxhLmNvbnRleHRbYS5zbW9vdGhQcm9wZXJ0eV09YS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSKTt2YXIgYz10aGlzLnRleHR1cmUudHJpbT90aGlzLnRleHR1cmUudHJpbS54LXRoaXMuYW5jaG9yLngqdGhpcy50ZXh0dXJlLnRyaW0ud2lkdGg6dGhpcy5hbmNob3IueCotdGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoLGQ9dGhpcy50ZXh0dXJlLnRyaW0/dGhpcy50ZXh0dXJlLnRyaW0ueS10aGlzLmFuY2hvci55KnRoaXMudGV4dHVyZS50cmltLmhlaWdodDp0aGlzLmFuY2hvci55Ki10aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0OzE2Nzc3MjE1IT09dGhpcy50aW50Pyh0aGlzLmNhY2hlZFRpbnQhPT10aGlzLnRpbnQmJih0aGlzLmNhY2hlZFRpbnQ9dGhpcy50aW50LHRoaXMudGludGVkVGV4dHVyZT1iLkNhbnZhc1RpbnRlci5nZXRUaW50ZWRUZXh0dXJlKHRoaXMsdGhpcy50aW50KSksYS5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLnRpbnRlZFRleHR1cmUsMCwwLHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCxjLGQsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGgsdGhpcy50ZXh0dXJlLmNyb3AuaGVpZ2h0KSk6YS5jb250ZXh0LmRyYXdJbWFnZSh0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuc291cmNlLHRoaXMudGV4dHVyZS5jcm9wLngsdGhpcy50ZXh0dXJlLmNyb3AueSx0aGlzLnRleHR1cmUuY3JvcC53aWR0aCx0aGlzLnRleHR1cmUuY3JvcC5oZWlnaHQsYyxkLHRoaXMudGV4dHVyZS5jcm9wLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodCl9Zm9yKHZhciBlPTAsZj10aGlzLmNoaWxkcmVuLmxlbmd0aDtmPmU7ZSsrKXRoaXMuY2hpbGRyZW5bZV0uX3JlbmRlckNhbnZhcyhhKTt0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYS5jb250ZXh0KX19LGIuU3ByaXRlLmZyb21GcmFtZT1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHR1cmVDYWNoZVthXTtpZighYyl0aHJvdyBuZXcgRXJyb3IoJ1RoZSBmcmFtZUlkIFwiJythKydcIiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgdGV4dHVyZSBjYWNoZScrdGhpcyk7cmV0dXJuIG5ldyBiLlNwcml0ZShjKX0sYi5TcHJpdGUuZnJvbUltYWdlPWZ1bmN0aW9uKGEsYyxkKXt2YXIgZT1iLlRleHR1cmUuZnJvbUltYWdlKGEsYyxkKTtyZXR1cm4gbmV3IGIuU3ByaXRlKGUpfSxiLlNwcml0ZUJhdGNoPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZVRoaW5nPWEsdGhpcy5yZWFkeT0hMX0sYi5TcHJpdGVCYXRjaC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlKSxiLlNwcml0ZUJhdGNoLmNvbnN0cnVjdG9yPWIuU3ByaXRlQmF0Y2gsYi5TcHJpdGVCYXRjaC5wcm90b3R5cGUuaW5pdFdlYkdMPWZ1bmN0aW9uKGEpe3RoaXMuZmFzdFNwcml0ZUJhdGNoPW5ldyBiLldlYkdMRmFzdFNwcml0ZUJhdGNoKGEpLHRoaXMucmVhZHk9ITB9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe2IuRGlzcGxheU9iamVjdC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuU3ByaXRlQmF0Y2gucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXshdGhpcy52aXNpYmxlfHx0aGlzLmFscGhhPD0wfHwhdGhpcy5jaGlsZHJlbi5sZW5ndGh8fCh0aGlzLnJlYWR5fHx0aGlzLmluaXRXZWJHTChhLmdsKSxhLnNwcml0ZUJhdGNoLnN0b3AoKSxhLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGEuc2hhZGVyTWFuYWdlci5mYXN0U2hhZGVyKSx0aGlzLmZhc3RTcHJpdGVCYXRjaC5iZWdpbih0aGlzLGEpLHRoaXMuZmFzdFNwcml0ZUJhdGNoLnJlbmRlcih0aGlzKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpfSxiLlNwcml0ZUJhdGNoLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe3ZhciBjPWEuY29udGV4dDtjLmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSxiLkRpc3BsYXlPYmplY3QucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpO2Zvcih2YXIgZD10aGlzLndvcmxkVHJhbnNmb3JtLGU9ITAsZj0wO2Y8dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZisrKXt2YXIgZz10aGlzLmNoaWxkcmVuW2ZdO2lmKGcudmlzaWJsZSl7dmFyIGg9Zy50ZXh0dXJlLGk9aC5mcmFtZTtpZihjLmdsb2JhbEFscGhhPXRoaXMud29ybGRBbHBoYSpnLmFscGhhLGcucm90YXRpb24lKDIqTWF0aC5QSSk9PT0wKWUmJihjLnNldFRyYW5zZm9ybShkLmEsZC5jLGQuYixkLmQsZC50eCxkLnR5KSxlPSExKSxjLmRyYXdJbWFnZShoLmJhc2VUZXh0dXJlLnNvdXJjZSxpLngsaS55LGkud2lkdGgsaS5oZWlnaHQsZy5hbmNob3IueCotaS53aWR0aCpnLnNjYWxlLngrZy5wb3NpdGlvbi54Ky41fDAsZy5hbmNob3IueSotaS5oZWlnaHQqZy5zY2FsZS55K2cucG9zaXRpb24ueSsuNXwwLGkud2lkdGgqZy5zY2FsZS54LGkuaGVpZ2h0Kmcuc2NhbGUueSk7ZWxzZXtlfHwoZT0hMCksYi5EaXNwbGF5T2JqZWN0LnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbChnKTt2YXIgaj1nLndvcmxkVHJhbnNmb3JtO2Eucm91bmRQaXhlbHM/Yy5zZXRUcmFuc2Zvcm0oai5hLGouYyxqLmIsai5kLDB8ai50eCwwfGoudHkpOmMuc2V0VHJhbnNmb3JtKGouYSxqLmMsai5iLGouZCxqLnR4LGoudHkpLGMuZHJhd0ltYWdlKGguYmFzZVRleHR1cmUuc291cmNlLGkueCxpLnksaS53aWR0aCxpLmhlaWdodCxnLmFuY2hvci54Ki1pLndpZHRoKy41fDAsZy5hbmNob3IueSotaS5oZWlnaHQrLjV8MCxpLndpZHRoLGkuaGVpZ2h0KX19fX0sYi5Nb3ZpZUNsaXA9ZnVuY3Rpb24oYSl7Yi5TcHJpdGUuY2FsbCh0aGlzLGFbMF0pLHRoaXMudGV4dHVyZXM9YSx0aGlzLmFuaW1hdGlvblNwZWVkPTEsdGhpcy5sb29wPSEwLHRoaXMub25Db21wbGV0ZT1udWxsLHRoaXMuY3VycmVudEZyYW1lPTAsdGhpcy5wbGF5aW5nPSExfSxiLk1vdmllQ2xpcC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlNwcml0ZS5wcm90b3R5cGUpLGIuTW92aWVDbGlwLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLk1vdmllQ2xpcCxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Nb3ZpZUNsaXAucHJvdG90eXBlLFwidG90YWxGcmFtZXNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudGV4dHVyZXMubGVuZ3RofX0pLGIuTW92aWVDbGlwLnByb3RvdHlwZS5zdG9wPWZ1bmN0aW9uKCl7dGhpcy5wbGF5aW5nPSExfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUucGxheT1mdW5jdGlvbigpe3RoaXMucGxheWluZz0hMH0sYi5Nb3ZpZUNsaXAucHJvdG90eXBlLmdvdG9BbmRTdG9wPWZ1bmN0aW9uKGEpe3RoaXMucGxheWluZz0hMSx0aGlzLmN1cnJlbnRGcmFtZT1hO3ZhciBiPXRoaXMuY3VycmVudEZyYW1lKy41fDA7dGhpcy5zZXRUZXh0dXJlKHRoaXMudGV4dHVyZXNbYiV0aGlzLnRleHR1cmVzLmxlbmd0aF0pfSxiLk1vdmllQ2xpcC5wcm90b3R5cGUuZ290b0FuZFBsYXk9ZnVuY3Rpb24oYSl7dGhpcy5jdXJyZW50RnJhbWU9YSx0aGlzLnBsYXlpbmc9ITB9LGIuTW92aWVDbGlwLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXtpZihiLlNwcml0ZS5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyksdGhpcy5wbGF5aW5nKXt0aGlzLmN1cnJlbnRGcmFtZSs9dGhpcy5hbmltYXRpb25TcGVlZDt2YXIgYT10aGlzLmN1cnJlbnRGcmFtZSsuNXwwO3RoaXMuY3VycmVudEZyYW1lPXRoaXMuY3VycmVudEZyYW1lJXRoaXMudGV4dHVyZXMubGVuZ3RoLHRoaXMubG9vcHx8YTx0aGlzLnRleHR1cmVzLmxlbmd0aD90aGlzLnNldFRleHR1cmUodGhpcy50ZXh0dXJlc1thJXRoaXMudGV4dHVyZXMubGVuZ3RoXSk6YT49dGhpcy50ZXh0dXJlcy5sZW5ndGgmJih0aGlzLmdvdG9BbmRTdG9wKHRoaXMudGV4dHVyZXMubGVuZ3RoLTEpLHRoaXMub25Db21wbGV0ZSYmdGhpcy5vbkNvbXBsZXRlKCkpfX0sYi5Nb3ZpZUNsaXAuZnJvbUZyYW1lcz1mdW5jdGlvbihhKXtmb3IodmFyIGM9W10sZD0wO2Q8YS5sZW5ndGg7ZCsrKWMucHVzaChuZXcgYi5UZXh0dXJlLmZyb21GcmFtZShhW2RdKSk7cmV0dXJuIG5ldyBiLk1vdmllQ2xpcChjKX0sYi5Nb3ZpZUNsaXAuZnJvbUltYWdlcz1mdW5jdGlvbihhKXtmb3IodmFyIGM9W10sZD0wO2Q8YS5sZW5ndGg7ZCsrKWMucHVzaChuZXcgYi5UZXh0dXJlLmZyb21JbWFnZShhW2RdKSk7cmV0dXJuIG5ldyBiLk1vdmllQ2xpcChjKX0sYi5GaWx0ZXJCbG9jaz1mdW5jdGlvbigpe3RoaXMudmlzaWJsZT0hMCx0aGlzLnJlbmRlcmFibGU9ITB9LGIuVGV4dD1mdW5jdGlvbihhLGMpe3RoaXMuY2FudmFzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy5jb250ZXh0PXRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKSxiLlNwcml0ZS5jYWxsKHRoaXMsYi5UZXh0dXJlLmZyb21DYW52YXModGhpcy5jYW52YXMpKSx0aGlzLnNldFRleHQoYSksdGhpcy5zZXRTdHlsZShjKX0sYi5UZXh0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuU3ByaXRlLnByb3RvdHlwZSksYi5UZXh0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlRleHQsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVGV4dC5wcm90b3R5cGUsXCJ3aWR0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLHRoaXMuc2NhbGUueCp0aGlzLnRleHR1cmUuZnJhbWUud2lkdGh9LHNldDpmdW5jdGlvbihhKXt0aGlzLnNjYWxlLng9YS90aGlzLnRleHR1cmUuZnJhbWUud2lkdGgsdGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UZXh0LnByb3RvdHlwZSxcImhlaWdodFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLHRoaXMuc2NhbGUueSp0aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0fSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5zY2FsZS55PWEvdGhpcy50ZXh0dXJlLmZyYW1lLmhlaWdodCx0aGlzLl9oZWlnaHQ9YX19KSxiLlRleHQucHJvdG90eXBlLnNldFN0eWxlPWZ1bmN0aW9uKGEpe2E9YXx8e30sYS5mb250PWEuZm9udHx8XCJib2xkIDIwcHQgQXJpYWxcIixhLmZpbGw9YS5maWxsfHxcImJsYWNrXCIsYS5hbGlnbj1hLmFsaWdufHxcImxlZnRcIixhLnN0cm9rZT1hLnN0cm9rZXx8XCJibGFja1wiLGEuc3Ryb2tlVGhpY2tuZXNzPWEuc3Ryb2tlVGhpY2tuZXNzfHwwLGEud29yZFdyYXA9YS53b3JkV3JhcHx8ITEsYS53b3JkV3JhcFdpZHRoPWEud29yZFdyYXBXaWR0aHx8MTAwLGEud29yZFdyYXBXaWR0aD1hLndvcmRXcmFwV2lkdGh8fDEwMCxhLmRyb3BTaGFkb3c9YS5kcm9wU2hhZG93fHwhMSxhLmRyb3BTaGFkb3dBbmdsZT1hLmRyb3BTaGFkb3dBbmdsZXx8TWF0aC5QSS82LGEuZHJvcFNoYWRvd0Rpc3RhbmNlPWEuZHJvcFNoYWRvd0Rpc3RhbmNlfHw0LGEuZHJvcFNoYWRvd0NvbG9yPWEuZHJvcFNoYWRvd0NvbG9yfHxcImJsYWNrXCIsdGhpcy5zdHlsZT1hLHRoaXMuZGlydHk9ITB9LGIuVGV4dC5wcm90b3R5cGUuc2V0VGV4dD1mdW5jdGlvbihhKXt0aGlzLnRleHQ9YS50b1N0cmluZygpfHxcIiBcIix0aGlzLmRpcnR5PSEwfSxiLlRleHQucHJvdG90eXBlLnVwZGF0ZVRleHQ9ZnVuY3Rpb24oKXt0aGlzLmNvbnRleHQuZm9udD10aGlzLnN0eWxlLmZvbnQ7dmFyIGE9dGhpcy50ZXh0O3RoaXMuc3R5bGUud29yZFdyYXAmJihhPXRoaXMud29yZFdyYXAodGhpcy50ZXh0KSk7Zm9yKHZhciBiPWEuc3BsaXQoLyg/OlxcclxcbnxcXHJ8XFxuKS8pLGM9W10sZD0wLGU9MDtlPGIubGVuZ3RoO2UrKyl7dmFyIGY9dGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KGJbZV0pLndpZHRoO2NbZV09ZixkPU1hdGgubWF4KGQsZil9dmFyIGc9ZCt0aGlzLnN0eWxlLnN0cm9rZVRoaWNrbmVzczt0aGlzLnN0eWxlLmRyb3BTaGFkb3cmJihnKz10aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZSksdGhpcy5jYW52YXMud2lkdGg9Zyt0aGlzLmNvbnRleHQubGluZVdpZHRoO3ZhciBoPXRoaXMuZGV0ZXJtaW5lRm9udEhlaWdodChcImZvbnQ6IFwiK3RoaXMuc3R5bGUuZm9udCtcIjtcIikrdGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MsaT1oKmIubGVuZ3RoO3RoaXMuc3R5bGUuZHJvcFNoYWRvdyYmKGkrPXRoaXMuc3R5bGUuZHJvcFNoYWRvd0Rpc3RhbmNlKSx0aGlzLmNhbnZhcy5oZWlnaHQ9aSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLDAsdGhpcy5jYW52YXMud2lkdGgsdGhpcy5jYW52YXMuaGVpZ2h0KSx0aGlzLmNvbnRleHQuZm9udD10aGlzLnN0eWxlLmZvbnQsdGhpcy5jb250ZXh0LnN0cm9rZVN0eWxlPXRoaXMuc3R5bGUuc3Ryb2tlLHRoaXMuY29udGV4dC5saW5lV2lkdGg9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MsdGhpcy5jb250ZXh0LnRleHRCYXNlbGluZT1cInRvcFwiO3ZhciBqLGs7aWYodGhpcy5zdHlsZS5kcm9wU2hhZG93KXt0aGlzLmNvbnRleHQuZmlsbFN0eWxlPXRoaXMuc3R5bGUuZHJvcFNoYWRvd0NvbG9yO3ZhciBsPU1hdGguc2luKHRoaXMuc3R5bGUuZHJvcFNoYWRvd0FuZ2xlKSp0aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZSxtPU1hdGguY29zKHRoaXMuc3R5bGUuZHJvcFNoYWRvd0FuZ2xlKSp0aGlzLnN0eWxlLmRyb3BTaGFkb3dEaXN0YW5jZTtmb3IoZT0wO2U8Yi5sZW5ndGg7ZSsrKWo9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMixrPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIrZSpoLFwicmlnaHRcIj09PXRoaXMuc3R5bGUuYWxpZ24/ais9ZC1jW2VdOlwiY2VudGVyXCI9PT10aGlzLnN0eWxlLmFsaWduJiYoais9KGQtY1tlXSkvMiksdGhpcy5zdHlsZS5maWxsJiZ0aGlzLmNvbnRleHQuZmlsbFRleHQoYltlXSxqK2wsayttKX1mb3IodGhpcy5jb250ZXh0LmZpbGxTdHlsZT10aGlzLnN0eWxlLmZpbGwsZT0wO2U8Yi5sZW5ndGg7ZSsrKWo9dGhpcy5zdHlsZS5zdHJva2VUaGlja25lc3MvMixrPXRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzLzIrZSpoLFwicmlnaHRcIj09PXRoaXMuc3R5bGUuYWxpZ24/ais9ZC1jW2VdOlwiY2VudGVyXCI9PT10aGlzLnN0eWxlLmFsaWduJiYoais9KGQtY1tlXSkvMiksdGhpcy5zdHlsZS5zdHJva2UmJnRoaXMuc3R5bGUuc3Ryb2tlVGhpY2tuZXNzJiZ0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dChiW2VdLGosayksdGhpcy5zdHlsZS5maWxsJiZ0aGlzLmNvbnRleHQuZmlsbFRleHQoYltlXSxqLGspO3RoaXMudXBkYXRlVGV4dHVyZSgpfSxiLlRleHQucHJvdG90eXBlLnVwZGF0ZVRleHR1cmU9ZnVuY3Rpb24oKXt0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUud2lkdGg9dGhpcy5jYW52YXMud2lkdGgsdGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmhlaWdodD10aGlzLmNhbnZhcy5oZWlnaHQsdGhpcy50ZXh0dXJlLmNyb3Aud2lkdGg9dGhpcy50ZXh0dXJlLmZyYW1lLndpZHRoPXRoaXMuY2FudmFzLndpZHRoLHRoaXMudGV4dHVyZS5jcm9wLmhlaWdodD10aGlzLnRleHR1cmUuZnJhbWUuaGVpZ2h0PXRoaXMuY2FudmFzLmhlaWdodCx0aGlzLl93aWR0aD10aGlzLmNhbnZhcy53aWR0aCx0aGlzLl9oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0LHRoaXMucmVxdWlyZXNVcGRhdGU9ITB9LGIuVGV4dC5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe3RoaXMucmVxdWlyZXNVcGRhdGUmJih0aGlzLnJlcXVpcmVzVXBkYXRlPSExLGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZSxhLmdsKSksYi5TcHJpdGUucHJvdG90eXBlLl9yZW5kZXJXZWJHTC5jYWxsKHRoaXMsYSl9LGIuVGV4dC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLGIuU3ByaXRlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm0uY2FsbCh0aGlzKX0sYi5UZXh0LnByb3RvdHlwZS5kZXRlcm1pbmVGb250SGVpZ2h0PWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dC5oZWlnaHRDYWNoZVthXTtpZighYyl7dmFyIGQ9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdLGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSxmPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiTVwiKTtlLmFwcGVuZENoaWxkKGYpLGUuc2V0QXR0cmlidXRlKFwic3R5bGVcIixhK1wiO3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MFwiKSxkLmFwcGVuZENoaWxkKGUpLGM9ZS5vZmZzZXRIZWlnaHQsYi5UZXh0LmhlaWdodENhY2hlW2FdPWMsZC5yZW1vdmVDaGlsZChlKX1yZXR1cm4gY30sYi5UZXh0LnByb3RvdHlwZS53b3JkV3JhcD1mdW5jdGlvbihhKXtmb3IodmFyIGI9XCJcIixjPWEuc3BsaXQoXCJcXG5cIiksZD0wO2Q8Yy5sZW5ndGg7ZCsrKXtmb3IodmFyIGU9dGhpcy5zdHlsZS53b3JkV3JhcFdpZHRoLGY9Y1tkXS5zcGxpdChcIiBcIiksZz0wO2c8Zi5sZW5ndGg7ZysrKXt2YXIgaD10aGlzLmNvbnRleHQubWVhc3VyZVRleHQoZltnXSkud2lkdGgsaT1oK3RoaXMuY29udGV4dC5tZWFzdXJlVGV4dChcIiBcIikud2lkdGg7MD09PWd8fGk+ZT8oZz4wJiYoYis9XCJcXG5cIiksYis9ZltnXSxlPXRoaXMuc3R5bGUud29yZFdyYXBXaWR0aC1oKTooZS09aSxiKz1cIiBcIitmW2ddKX1kPGMubGVuZ3RoLTEmJihiKz1cIlxcblwiKX1yZXR1cm4gYn0sYi5UZXh0LnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKGEpe3RoaXMuY29udGV4dD1udWxsLHRoaXMuY2FudmFzPW51bGwsdGhpcy50ZXh0dXJlLmRlc3Ryb3kodm9pZCAwPT09YT8hMDphKX0sYi5UZXh0LmhlaWdodENhY2hlPXt9LGIuQml0bWFwVGV4dD1mdW5jdGlvbihhLGMpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMuX3Bvb2w9W10sdGhpcy5zZXRUZXh0KGEpLHRoaXMuc2V0U3R5bGUoYyksdGhpcy51cGRhdGVUZXh0KCksdGhpcy5kaXJ0eT0hMX0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuQml0bWFwVGV4dC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5CaXRtYXBUZXh0LGIuQml0bWFwVGV4dC5wcm90b3R5cGUuc2V0VGV4dD1mdW5jdGlvbihhKXt0aGlzLnRleHQ9YXx8XCIgXCIsdGhpcy5kaXJ0eT0hMH0sYi5CaXRtYXBUZXh0LnByb3RvdHlwZS5zZXRTdHlsZT1mdW5jdGlvbihhKXthPWF8fHt9LGEuYWxpZ249YS5hbGlnbnx8XCJsZWZ0XCIsdGhpcy5zdHlsZT1hO3ZhciBjPWEuZm9udC5zcGxpdChcIiBcIik7dGhpcy5mb250TmFtZT1jW2MubGVuZ3RoLTFdLHRoaXMuZm9udFNpemU9Yy5sZW5ndGg+PTI/cGFyc2VJbnQoY1tjLmxlbmd0aC0yXSwxMCk6Yi5CaXRtYXBUZXh0LmZvbnRzW3RoaXMuZm9udE5hbWVdLnNpemUsdGhpcy5kaXJ0eT0hMCx0aGlzLnRpbnQ9YS50aW50fSxiLkJpdG1hcFRleHQucHJvdG90eXBlLnVwZGF0ZVRleHQ9ZnVuY3Rpb24oKXtmb3IodmFyIGE9Yi5CaXRtYXBUZXh0LmZvbnRzW3RoaXMuZm9udE5hbWVdLGM9bmV3IGIuUG9pbnQsZD1udWxsLGU9W10sZj0wLGc9W10saD0wLGk9dGhpcy5mb250U2l6ZS9hLnNpemUsaj0wO2o8dGhpcy50ZXh0Lmxlbmd0aDtqKyspe3ZhciBrPXRoaXMudGV4dC5jaGFyQ29kZUF0KGopO2lmKC8oPzpcXHJcXG58XFxyfFxcbikvLnRlc3QodGhpcy50ZXh0LmNoYXJBdChqKSkpZy5wdXNoKGMueCksZj1NYXRoLm1heChmLGMueCksaCsrLGMueD0wLGMueSs9YS5saW5lSGVpZ2h0LGQ9bnVsbDtlbHNle3ZhciBsPWEuY2hhcnNba107bCYmKGQmJmxbZF0mJihjLngrPWwua2VybmluZ1tkXSksZS5wdXNoKHt0ZXh0dXJlOmwudGV4dHVyZSxsaW5lOmgsY2hhckNvZGU6ayxwb3NpdGlvbjpuZXcgYi5Qb2ludChjLngrbC54T2Zmc2V0LGMueStsLnlPZmZzZXQpfSksYy54Kz1sLnhBZHZhbmNlLGQ9ayl9fWcucHVzaChjLngpLGY9TWF0aC5tYXgoZixjLngpO3ZhciBtPVtdO2ZvcihqPTA7aD49ajtqKyspe3ZhciBuPTA7XCJyaWdodFwiPT09dGhpcy5zdHlsZS5hbGlnbj9uPWYtZ1tqXTpcImNlbnRlclwiPT09dGhpcy5zdHlsZS5hbGlnbiYmKG49KGYtZ1tqXSkvMiksbS5wdXNoKG4pfXZhciBvPXRoaXMuY2hpbGRyZW4ubGVuZ3RoLHA9ZS5sZW5ndGgscT10aGlzLnRpbnR8fDE2Nzc3MjE1O2ZvcihqPTA7cD5qO2orKyl7dmFyIHI9bz5qP3RoaXMuY2hpbGRyZW5bal06dGhpcy5fcG9vbC5wb3AoKTtyP3Iuc2V0VGV4dHVyZShlW2pdLnRleHR1cmUpOnI9bmV3IGIuU3ByaXRlKGVbal0udGV4dHVyZSksci5wb3NpdGlvbi54PShlW2pdLnBvc2l0aW9uLngrbVtlW2pdLmxpbmVdKSppLHIucG9zaXRpb24ueT1lW2pdLnBvc2l0aW9uLnkqaSxyLnNjYWxlLng9ci5zY2FsZS55PWksci50aW50PXEsci5wYXJlbnR8fHRoaXMuYWRkQ2hpbGQocil9Zm9yKDt0aGlzLmNoaWxkcmVuLmxlbmd0aD5wOyl7dmFyIHM9dGhpcy5nZXRDaGlsZEF0KHRoaXMuY2hpbGRyZW4ubGVuZ3RoLTEpO3RoaXMuX3Bvb2wucHVzaChzKSx0aGlzLnJlbW92ZUNoaWxkKHMpfXRoaXMudGV4dFdpZHRoPWYqaSx0aGlzLnRleHRIZWlnaHQ9KGMueSthLmxpbmVIZWlnaHQpKml9LGIuQml0bWFwVGV4dC5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtPWZ1bmN0aW9uKCl7dGhpcy5kaXJ0eSYmKHRoaXMudXBkYXRlVGV4dCgpLHRoaXMuZGlydHk9ITEpLGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9LGIuQml0bWFwVGV4dC5mb250cz17fSxiLkludGVyYWN0aW9uRGF0YT1mdW5jdGlvbigpe3RoaXMuZ2xvYmFsPW5ldyBiLlBvaW50LHRoaXMudGFyZ2V0PW51bGwsdGhpcy5vcmlnaW5hbEV2ZW50PW51bGx9LGIuSW50ZXJhY3Rpb25EYXRhLnByb3RvdHlwZS5nZXRMb2NhbFBvc2l0aW9uPWZ1bmN0aW9uKGEpe3ZhciBjPWEud29ybGRUcmFuc2Zvcm0sZD10aGlzLmdsb2JhbCxlPWMuYSxmPWMuYixnPWMudHgsaD1jLmMsaT1jLmQsaj1jLnR5LGs9MS8oZSppK2YqLWgpO3JldHVybiBuZXcgYi5Qb2ludChpKmsqZC54Ky1mKmsqZC55KyhqKmYtZyppKSprLGUqaypkLnkrLWgqaypkLngrKC1qKmUrZypoKSprKX0sYi5JbnRlcmFjdGlvbkRhdGEucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW50ZXJhY3Rpb25EYXRhLGIuSW50ZXJhY3Rpb25NYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuc3RhZ2U9YSx0aGlzLm1vdXNlPW5ldyBiLkludGVyYWN0aW9uRGF0YSx0aGlzLnRvdWNocz17fSx0aGlzLnRlbXBQb2ludD1uZXcgYi5Qb2ludCx0aGlzLm1vdXNlb3ZlckVuYWJsZWQ9ITAsdGhpcy5wb29sPVtdLHRoaXMuaW50ZXJhY3RpdmVJdGVtcz1bXSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudD1udWxsLHRoaXMub25Nb3VzZU1vdmU9dGhpcy5vbk1vdXNlTW92ZS5iaW5kKHRoaXMpLHRoaXMub25Nb3VzZURvd249dGhpcy5vbk1vdXNlRG93bi5iaW5kKHRoaXMpLHRoaXMub25Nb3VzZU91dD10aGlzLm9uTW91c2VPdXQuYmluZCh0aGlzKSx0aGlzLm9uTW91c2VVcD10aGlzLm9uTW91c2VVcC5iaW5kKHRoaXMpLHRoaXMub25Ub3VjaFN0YXJ0PXRoaXMub25Ub3VjaFN0YXJ0LmJpbmQodGhpcyksdGhpcy5vblRvdWNoRW5kPXRoaXMub25Ub3VjaEVuZC5iaW5kKHRoaXMpLHRoaXMub25Ub3VjaE1vdmU9dGhpcy5vblRvdWNoTW92ZS5iaW5kKHRoaXMpLHRoaXMubGFzdD0wLHRoaXMuY3VycmVudEN1cnNvclN0eWxlPVwiaW5oZXJpdFwiLHRoaXMubW91c2VPdXQ9ITF9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkludGVyYWN0aW9uTWFuYWdlcixiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlPWZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPWEuY2hpbGRyZW4sZD1jLmxlbmd0aCxlPWQtMTtlPj0wO2UtLSl7dmFyIGY9Y1tlXTtmLl9pbnRlcmFjdGl2ZT8oYi5pbnRlcmFjdGl2ZUNoaWxkcmVuPSEwLHRoaXMuaW50ZXJhY3RpdmVJdGVtcy5wdXNoKGYpLGYuY2hpbGRyZW4ubGVuZ3RoPjAmJnRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKGYsZikpOihmLl9faVBhcmVudD1udWxsLGYuY2hpbGRyZW4ubGVuZ3RoPjAmJnRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKGYsYikpfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnNldFRhcmdldD1mdW5jdGlvbihhKXt0aGlzLnRhcmdldD1hLG51bGw9PT10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudCYmdGhpcy5zZXRUYXJnZXREb21FbGVtZW50KGEudmlldyl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5zZXRUYXJnZXREb21FbGVtZW50PWZ1bmN0aW9uKGEpe3RoaXMucmVtb3ZlRXZlbnRzKCksd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkJiYoYS5zdHlsZVtcIi1tcy1jb250ZW50LXpvb21pbmdcIl09XCJub25lXCIsYS5zdHlsZVtcIi1tcy10b3VjaC1hY3Rpb25cIl09XCJub25lXCIpLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50PWEsYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsdGhpcy5vbk1vdXNlTW92ZSwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsdGhpcy5vbk1vdXNlRG93biwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIix0aGlzLm9uTW91c2VPdXQsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIix0aGlzLm9uVG91Y2hTdGFydCwhMCksYS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIix0aGlzLm9uVG91Y2hFbmQsITApLGEuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLHRoaXMub25Ub3VjaE1vdmUsITApLHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLHRoaXMub25Nb3VzZVVwLCEwKX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50cz1mdW5jdGlvbigpe3RoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50JiYodGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGVbXCItbXMtY29udGVudC16b29taW5nXCJdPVwiXCIsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGVbXCItbXMtdG91Y2gtYWN0aW9uXCJdPVwiXCIsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLHRoaXMub25Nb3VzZU1vdmUsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIix0aGlzLm9uTW91c2VEb3duLCEwKSx0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIix0aGlzLm9uTW91c2VPdXQsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsdGhpcy5vblRvdWNoU3RhcnQsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLHRoaXMub25Ub3VjaEVuZCwhMCksdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLHRoaXMub25Ub3VjaE1vdmUsITApLHRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50PW51bGwsd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsdGhpcy5vbk1vdXNlVXAsITApKX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbigpe2lmKHRoaXMudGFyZ2V0KXt2YXIgYT1EYXRlLm5vdygpLGM9YS10aGlzLmxhc3Q7aWYoYz1jKmIuSU5URVJBQ1RJT05fRlJFUVVFTkNZLzFlMywhKDE+Yykpe3RoaXMubGFzdD1hO3ZhciBkPTA7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBlPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsZj1cImluaGVyaXRcIixnPSExO2ZvcihkPTA7ZT5kO2QrKyl7dmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2guX19oaXQ9dGhpcy5oaXRUZXN0KGgsdGhpcy5tb3VzZSksdGhpcy5tb3VzZS50YXJnZXQ9aCxoLl9faGl0JiYhZz8oaC5idXR0b25Nb2RlJiYoZj1oLmRlZmF1bHRDdXJzb3IpLGguaW50ZXJhY3RpdmVDaGlsZHJlbnx8KGc9ITApLGguX19pc092ZXJ8fChoLm1vdXNlb3ZlciYmaC5tb3VzZW92ZXIodGhpcy5tb3VzZSksaC5fX2lzT3Zlcj0hMCkpOmguX19pc092ZXImJihoLm1vdXNlb3V0JiZoLm1vdXNlb3V0KHRoaXMubW91c2UpLGguX19pc092ZXI9ITEpfXRoaXMuY3VycmVudEN1cnNvclN0eWxlIT09ZiYmKHRoaXMuY3VycmVudEN1cnNvclN0eWxlPWYsdGhpcy5pbnRlcmFjdGlvbkRPTUVsZW1lbnQuc3R5bGUuY3Vyc29yPWYpfX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaD1mdW5jdGlvbigpe3RoaXMuZGlydHk9ITE7Zm9yKHZhciBhPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsYj0wO2E+YjtiKyspdGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2JdLmludGVyYWN0aXZlQ2hpbGRyZW49ITE7dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zPVtdLHRoaXMuc3RhZ2UuaW50ZXJhY3RpdmUmJnRoaXMuaW50ZXJhY3RpdmVJdGVtcy5wdXNoKHRoaXMuc3RhZ2UpLHRoaXMuY29sbGVjdEludGVyYWN0aXZlU3ByaXRlKHRoaXMuc3RhZ2UsdGhpcy5zdGFnZSl9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlTW92ZT1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCksdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudDt2YXIgYj10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTt0aGlzLm1vdXNlLmdsb2JhbC54PShhLmNsaWVudFgtYi5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYi53aWR0aCksdGhpcy5tb3VzZS5nbG9iYWwueT0oYS5jbGllbnRZLWIudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2IuaGVpZ2h0KTtmb3IodmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxkPTA7Yz5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2UubW91c2Vtb3ZlJiZlLm1vdXNlbW92ZSh0aGlzLm1vdXNlKX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vbk1vdXNlRG93bj1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCksdGhpcy5tb3VzZS5vcmlnaW5hbEV2ZW50PWF8fHdpbmRvdy5ldmVudCxiLkFVVE9fUFJFVkVOVF9ERUZBVUxUJiZ0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtmb3IodmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxkPTA7Yz5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2lmKChlLm1vdXNlZG93bnx8ZS5jbGljaykmJihlLl9fbW91c2VJc0Rvd249ITAsZS5fX2hpdD10aGlzLmhpdFRlc3QoZSx0aGlzLm1vdXNlKSxlLl9faGl0JiYoZS5tb3VzZWRvd24mJmUubW91c2Vkb3duKHRoaXMubW91c2UpLGUuX19pc0Rvd249ITAsIWUuaW50ZXJhY3RpdmVDaGlsZHJlbikpKWJyZWFrfX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uTW91c2VPdXQ9ZnVuY3Rpb24oKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGE9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aDt0aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5zdHlsZS5jdXJzb3I9XCJpbmhlcml0XCI7Zm9yKHZhciBiPTA7YT5iO2IrKyl7dmFyIGM9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2JdO2MuX19pc092ZXImJih0aGlzLm1vdXNlLnRhcmdldD1jLGMubW91c2VvdXQmJmMubW91c2VvdXQodGhpcy5tb3VzZSksYy5fX2lzT3Zlcj0hMSl9dGhpcy5tb3VzZU91dD0hMCx0aGlzLm1vdXNlLmdsb2JhbC54PS0xZTQsdGhpcy5tb3VzZS5nbG9iYWwueT0tMWU0fSxiLkludGVyYWN0aW9uTWFuYWdlci5wcm90b3R5cGUub25Nb3VzZVVwPWZ1bmN0aW9uKGEpe3RoaXMuZGlydHkmJnRoaXMucmVidWlsZEludGVyYWN0aXZlR3JhcGgoKSx0aGlzLm1vdXNlLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50O1xuZm9yKHZhciBiPXRoaXMuaW50ZXJhY3RpdmVJdGVtcy5sZW5ndGgsYz0hMSxkPTA7Yj5kO2QrKyl7dmFyIGU9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2RdO2UuX19oaXQ9dGhpcy5oaXRUZXN0KGUsdGhpcy5tb3VzZSksZS5fX2hpdCYmIWM/KGUubW91c2V1cCYmZS5tb3VzZXVwKHRoaXMubW91c2UpLGUuX19pc0Rvd24mJmUuY2xpY2smJmUuY2xpY2sodGhpcy5tb3VzZSksZS5pbnRlcmFjdGl2ZUNoaWxkcmVufHwoYz0hMCkpOmUuX19pc0Rvd24mJmUubW91c2V1cG91dHNpZGUmJmUubW91c2V1cG91dHNpZGUodGhpcy5tb3VzZSksZS5fX2lzRG93bj0hMX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5oaXRUZXN0PWZ1bmN0aW9uKGEsYyl7dmFyIGQ9Yy5nbG9iYWw7aWYoIWEud29ybGRWaXNpYmxlKXJldHVybiExO3ZhciBlPWEgaW5zdGFuY2VvZiBiLlNwcml0ZSxmPWEud29ybGRUcmFuc2Zvcm0sZz1mLmEsaD1mLmIsaT1mLnR4LGo9Zi5jLGs9Zi5kLGw9Zi50eSxtPTEvKGcqaytoKi1qKSxuPWsqbSpkLngrLWgqbSpkLnkrKGwqaC1pKmspKm0sbz1nKm0qZC55Ky1qKm0qZC54KygtbCpnK2kqaikqbTtpZihjLnRhcmdldD1hLGEuaGl0QXJlYSYmYS5oaXRBcmVhLmNvbnRhaW5zKXJldHVybiBhLmhpdEFyZWEuY29udGFpbnMobixvKT8oYy50YXJnZXQ9YSwhMCk6ITE7aWYoZSl7dmFyIHAscT1hLnRleHR1cmUuZnJhbWUud2lkdGgscj1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0LHM9LXEqYS5hbmNob3IueDtpZihuPnMmJnMrcT5uJiYocD0tciphLmFuY2hvci55LG8+cCYmcCtyPm8pKXJldHVybiBjLnRhcmdldD1hLCEwfWZvcih2YXIgdD1hLmNoaWxkcmVuLmxlbmd0aCx1PTA7dD51O3UrKyl7dmFyIHY9YS5jaGlsZHJlblt1XSx3PXRoaXMuaGl0VGVzdCh2LGMpO2lmKHcpcmV0dXJuIGMudGFyZ2V0PWEsITB9cmV0dXJuITF9LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vblRvdWNoTW92ZT1mdW5jdGlvbihhKXt0aGlzLmRpcnR5JiZ0aGlzLnJlYnVpbGRJbnRlcmFjdGl2ZUdyYXBoKCk7dmFyIGIsYz10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxkPWEuY2hhbmdlZFRvdWNoZXMsZT0wO2ZvcihlPTA7ZTxkLmxlbmd0aDtlKyspe3ZhciBmPWRbZV07Yj10aGlzLnRvdWNoc1tmLmlkZW50aWZpZXJdLGIub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsYi5nbG9iYWwueD0oZi5jbGllbnRYLWMubGVmdCkqKHRoaXMudGFyZ2V0LndpZHRoL2Mud2lkdGgpLGIuZ2xvYmFsLnk9KGYuY2xpZW50WS1jLnRvcCkqKHRoaXMudGFyZ2V0LmhlaWdodC9jLmhlaWdodCksbmF2aWdhdG9yLmlzQ29jb29uSlMmJihiLmdsb2JhbC54PWYuY2xpZW50WCxiLmdsb2JhbC55PWYuY2xpZW50WSk7Zm9yKHZhciBnPTA7Zzx0aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoO2crKyl7dmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2ddO2gudG91Y2htb3ZlJiZoLl9fdG91Y2hEYXRhJiZoLl9fdG91Y2hEYXRhW2YuaWRlbnRpZmllcl0mJmgudG91Y2htb3ZlKGIpfX19LGIuSW50ZXJhY3Rpb25NYW5hZ2VyLnByb3RvdHlwZS5vblRvdWNoU3RhcnQ9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO3ZhciBjPXRoaXMuaW50ZXJhY3Rpb25ET01FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO2IuQVVUT19QUkVWRU5UX0RFRkFVTFQmJmEucHJldmVudERlZmF1bHQoKTtmb3IodmFyIGQ9YS5jaGFuZ2VkVG91Y2hlcyxlPTA7ZTxkLmxlbmd0aDtlKyspe3ZhciBmPWRbZV0sZz10aGlzLnBvb2wucG9wKCk7Z3x8KGc9bmV3IGIuSW50ZXJhY3Rpb25EYXRhKSxnLm9yaWdpbmFsRXZlbnQ9YXx8d2luZG93LmV2ZW50LHRoaXMudG91Y2hzW2YuaWRlbnRpZmllcl09ZyxnLmdsb2JhbC54PShmLmNsaWVudFgtYy5sZWZ0KSoodGhpcy50YXJnZXQud2lkdGgvYy53aWR0aCksZy5nbG9iYWwueT0oZi5jbGllbnRZLWMudG9wKSoodGhpcy50YXJnZXQuaGVpZ2h0L2MuaGVpZ2h0KSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmKGcuZ2xvYmFsLng9Zi5jbGllbnRYLGcuZ2xvYmFsLnk9Zi5jbGllbnRZKTtmb3IodmFyIGg9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zLmxlbmd0aCxpPTA7aD5pO2krKyl7dmFyIGo9dGhpcy5pbnRlcmFjdGl2ZUl0ZW1zW2ldO2lmKChqLnRvdWNoc3RhcnR8fGoudGFwKSYmKGouX19oaXQ9dGhpcy5oaXRUZXN0KGosZyksai5fX2hpdCYmKGoudG91Y2hzdGFydCYmai50b3VjaHN0YXJ0KGcpLGouX19pc0Rvd249ITAsai5fX3RvdWNoRGF0YT1qLl9fdG91Y2hEYXRhfHx7fSxqLl9fdG91Y2hEYXRhW2YuaWRlbnRpZmllcl09Zywhai5pbnRlcmFjdGl2ZUNoaWxkcmVuKSkpYnJlYWt9fX0sYi5JbnRlcmFjdGlvbk1hbmFnZXIucHJvdG90eXBlLm9uVG91Y2hFbmQ9ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eSYmdGhpcy5yZWJ1aWxkSW50ZXJhY3RpdmVHcmFwaCgpO2Zvcih2YXIgYj10aGlzLmludGVyYWN0aW9uRE9NRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxjPWEuY2hhbmdlZFRvdWNoZXMsZD0wO2Q8Yy5sZW5ndGg7ZCsrKXt2YXIgZT1jW2RdLGY9dGhpcy50b3VjaHNbZS5pZGVudGlmaWVyXSxnPSExO2YuZ2xvYmFsLng9KGUuY2xpZW50WC1iLmxlZnQpKih0aGlzLnRhcmdldC53aWR0aC9iLndpZHRoKSxmLmdsb2JhbC55PShlLmNsaWVudFktYi50b3ApKih0aGlzLnRhcmdldC5oZWlnaHQvYi5oZWlnaHQpLG5hdmlnYXRvci5pc0NvY29vbkpTJiYoZi5nbG9iYWwueD1lLmNsaWVudFgsZi5nbG9iYWwueT1lLmNsaWVudFkpO2Zvcih2YXIgaD10aGlzLmludGVyYWN0aXZlSXRlbXMubGVuZ3RoLGk9MDtoPmk7aSsrKXt2YXIgaj10aGlzLmludGVyYWN0aXZlSXRlbXNbaV07ai5fX3RvdWNoRGF0YSYmai5fX3RvdWNoRGF0YVtlLmlkZW50aWZpZXJdJiYoai5fX2hpdD10aGlzLmhpdFRlc3QoaixqLl9fdG91Y2hEYXRhW2UuaWRlbnRpZmllcl0pLGYub3JpZ2luYWxFdmVudD1hfHx3aW5kb3cuZXZlbnQsKGoudG91Y2hlbmR8fGoudGFwKSYmKGouX19oaXQmJiFnPyhqLnRvdWNoZW5kJiZqLnRvdWNoZW5kKGYpLGouX19pc0Rvd24mJmoudGFwJiZqLnRhcChmKSxqLmludGVyYWN0aXZlQ2hpbGRyZW58fChnPSEwKSk6ai5fX2lzRG93biYmai50b3VjaGVuZG91dHNpZGUmJmoudG91Y2hlbmRvdXRzaWRlKGYpLGouX19pc0Rvd249ITEpLGouX190b3VjaERhdGFbZS5pZGVudGlmaWVyXT1udWxsKX10aGlzLnBvb2wucHVzaChmKSx0aGlzLnRvdWNoc1tlLmlkZW50aWZpZXJdPW51bGx9fSxiLlN0YWdlPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMud29ybGRUcmFuc2Zvcm09bmV3IGIuTWF0cml4LHRoaXMuaW50ZXJhY3RpdmU9ITAsdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXI9bmV3IGIuSW50ZXJhY3Rpb25NYW5hZ2VyKHRoaXMpLHRoaXMuZGlydHk9ITAsdGhpcy5zdGFnZT10aGlzLHRoaXMuc3RhZ2UuaGl0QXJlYT1uZXcgYi5SZWN0YW5nbGUoMCwwLDFlNSwxZTUpLHRoaXMuc2V0QmFja2dyb3VuZENvbG9yKGEpfSxiLlN0YWdlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuU3RhZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3RhZ2UsYi5TdGFnZS5wcm90b3R5cGUuc2V0SW50ZXJhY3Rpb25EZWxlZ2F0ZT1mdW5jdGlvbihhKXt0aGlzLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXREb21FbGVtZW50KGEpfSxiLlN0YWdlLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLndvcmxkQWxwaGE9MTtmb3IodmFyIGE9MCxiPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2I+YTthKyspdGhpcy5jaGlsZHJlblthXS51cGRhdGVUcmFuc2Zvcm0oKTt0aGlzLmRpcnR5JiYodGhpcy5kaXJ0eT0hMSx0aGlzLmludGVyYWN0aW9uTWFuYWdlci5kaXJ0eT0hMCksdGhpcy5pbnRlcmFjdGl2ZSYmdGhpcy5pbnRlcmFjdGlvbk1hbmFnZXIudXBkYXRlKCl9LGIuU3RhZ2UucHJvdG90eXBlLnNldEJhY2tncm91bmRDb2xvcj1mdW5jdGlvbihhKXt0aGlzLmJhY2tncm91bmRDb2xvcj1hfHwwLHRoaXMuYmFja2dyb3VuZENvbG9yU3BsaXQ9Yi5oZXgycmdiKHRoaXMuYmFja2dyb3VuZENvbG9yKTt2YXIgYz10aGlzLmJhY2tncm91bmRDb2xvci50b1N0cmluZygxNik7Yz1cIjAwMDAwMFwiLnN1YnN0cigwLDYtYy5sZW5ndGgpK2MsdGhpcy5iYWNrZ3JvdW5kQ29sb3JTdHJpbmc9XCIjXCIrY30sYi5TdGFnZS5wcm90b3R5cGUuZ2V0TW91c2VQb3NpdGlvbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmludGVyYWN0aW9uTWFuYWdlci5tb3VzZS5nbG9iYWx9O2Zvcih2YXIgYz0wLGQ9W1wibXNcIixcIm1velwiLFwid2Via2l0XCIsXCJvXCJdLGU9MDtlPGQubGVuZ3RoJiYhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsrK2Upd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZT13aW5kb3dbZFtlXStcIlJlcXVlc3RBbmltYXRpb25GcmFtZVwiXSx3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU9d2luZG93W2RbZV0rXCJDYW5jZWxBbmltYXRpb25GcmFtZVwiXXx8d2luZG93W2RbZV0rXCJDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcIl07d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZXx8KHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU9ZnVuY3Rpb24oYSl7dmFyIGI9KG5ldyBEYXRlKS5nZXRUaW1lKCksZD1NYXRoLm1heCgwLDE2LShiLWMpKSxlPXdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7YShiK2QpfSxkKTtyZXR1cm4gYz1iK2QsZX0pLHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZXx8KHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZT1mdW5jdGlvbihhKXtjbGVhclRpbWVvdXQoYSl9KSx3aW5kb3cucmVxdWVzdEFuaW1GcmFtZT13aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLGIuaGV4MnJnYj1mdW5jdGlvbihhKXtyZXR1cm5bKGE+PjE2JjI1NSkvMjU1LChhPj44JjI1NSkvMjU1LCgyNTUmYSkvMjU1XX0sYi5yZ2IyaGV4PWZ1bmN0aW9uKGEpe3JldHVybigyNTUqYVswXTw8MTYpKygyNTUqYVsxXTw8OCkrMjU1KmFbMl19LFwiZnVuY3Rpb25cIiE9dHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kJiYoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQ9ZnVuY3Rpb24oKXt2YXIgYT1BcnJheS5wcm90b3R5cGUuc2xpY2U7cmV0dXJuIGZ1bmN0aW9uKGIpe2Z1bmN0aW9uIGMoKXt2YXIgZj1lLmNvbmNhdChhLmNhbGwoYXJndW1lbnRzKSk7ZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgYz90aGlzOmIsZil9dmFyIGQ9dGhpcyxlPWEuY2FsbChhcmd1bWVudHMsMSk7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZCl0aHJvdyBuZXcgVHlwZUVycm9yO3JldHVybiBjLnByb3RvdHlwZT1mdW5jdGlvbiBmKGEpe3JldHVybiBhJiYoZi5wcm90b3R5cGU9YSksdGhpcyBpbnN0YW5jZW9mIGY/dm9pZCAwOm5ldyBmfShkLnByb3RvdHlwZSksY319KCkpLGIuQWpheFJlcXVlc3Q9ZnVuY3Rpb24oKXt2YXIgYT1bXCJNc3htbDIuWE1MSFRUUC42LjBcIixcIk1zeG1sMi5YTUxIVFRQLjMuMFwiLFwiTWljcm9zb2Z0LlhNTEhUVFBcIl07aWYoIXdpbmRvdy5BY3RpdmVYT2JqZWN0KXJldHVybiB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q/bmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDohMTtmb3IodmFyIGI9MDtiPGEubGVuZ3RoO2IrKyl0cnl7cmV0dXJuIG5ldyB3aW5kb3cuQWN0aXZlWE9iamVjdChhW2JdKX1jYXRjaChjKXt9fSxiLmNhblVzZU5ld0NhbnZhc0JsZW5kTW9kZXM9ZnVuY3Rpb24oKXt2YXIgYT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO2Eud2lkdGg9MSxhLmhlaWdodD0xO3ZhciBiPWEuZ2V0Q29udGV4dChcIjJkXCIpO3JldHVybiBiLmZpbGxTdHlsZT1cIiMwMDBcIixiLmZpbGxSZWN0KDAsMCwxLDEpLGIuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPVwibXVsdGlwbHlcIixiLmZpbGxTdHlsZT1cIiNmZmZcIixiLmZpbGxSZWN0KDAsMCwxLDEpLDA9PT1iLmdldEltYWdlRGF0YSgwLDAsMSwxKS5kYXRhWzBdfSxiLmdldE5leHRQb3dlck9mVHdvPWZ1bmN0aW9uKGEpe2lmKGE+MCYmMD09PShhJmEtMSkpcmV0dXJuIGE7Zm9yKHZhciBiPTE7YT5iOyliPDw9MTtyZXR1cm4gYn0sYi5FdmVudFRhcmdldD1mdW5jdGlvbigpe3ZhciBhPXt9O3RoaXMuYWRkRXZlbnRMaXN0ZW5lcj10aGlzLm9uPWZ1bmN0aW9uKGIsYyl7dm9pZCAwPT09YVtiXSYmKGFbYl09W10pLC0xPT09YVtiXS5pbmRleE9mKGMpJiZhW2JdLnVuc2hpZnQoYyl9LHRoaXMuZGlzcGF0Y2hFdmVudD10aGlzLmVtaXQ9ZnVuY3Rpb24oYil7aWYoYVtiLnR5cGVdJiZhW2IudHlwZV0ubGVuZ3RoKWZvcih2YXIgYz1hW2IudHlwZV0ubGVuZ3RoLTE7Yz49MDtjLS0pYVtiLnR5cGVdW2NdKGIpfSx0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXI9dGhpcy5vZmY9ZnVuY3Rpb24oYixjKXtpZih2b2lkIDAhPT1hW2JdKXt2YXIgZD1hW2JdLmluZGV4T2YoYyk7LTEhPT1kJiZhW2JdLnNwbGljZShkLDEpfX0sdGhpcy5yZW1vdmVBbGxFdmVudExpc3RlbmVycz1mdW5jdGlvbihiKXt2YXIgYz1hW2JdO2MmJihjLmxlbmd0aD0wKX19LGIuYXV0b0RldGVjdFJlbmRlcmVyPWZ1bmN0aW9uKGEsYyxkLGUsZil7YXx8KGE9ODAwKSxjfHwoYz02MDApO3ZhciBnPWZ1bmN0aW9uKCl7dHJ5e3ZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7cmV0dXJuISF3aW5kb3cuV2ViR0xSZW5kZXJpbmdDb250ZXh0JiYoYS5nZXRDb250ZXh0KFwid2ViZ2xcIil8fGEuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiKSl9Y2F0Y2goYil7cmV0dXJuITF9fSgpO3JldHVybiBnP25ldyBiLldlYkdMUmVuZGVyZXIoYSxjLGQsZSxmKTpuZXcgYi5DYW52YXNSZW5kZXJlcihhLGMsZCxlKX0sYi5hdXRvRGV0ZWN0UmVjb21tZW5kZWRSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlLGYpe2F8fChhPTgwMCksY3x8KGM9NjAwKTt2YXIgZz1mdW5jdGlvbigpe3RyeXt2YXIgYT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO3JldHVybiEhd2luZG93LldlYkdMUmVuZGVyaW5nQ29udGV4dCYmKGEuZ2V0Q29udGV4dChcIndlYmdsXCIpfHxhLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIikpfWNhdGNoKGIpe3JldHVybiExfX0oKSxoPS9BbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtyZXR1cm4gZyYmIWg/bmV3IGIuV2ViR0xSZW5kZXJlcihhLGMsZCxlLGYpOm5ldyBiLkNhbnZhc1JlbmRlcmVyKGEsYyxkLGUpfSxiLlBvbHlLPXt9LGIuUG9seUsuVHJpYW5ndWxhdGU9ZnVuY3Rpb24oYSl7dmFyIGM9ITAsZD1hLmxlbmd0aD4+MTtpZigzPmQpcmV0dXJuW107Zm9yKHZhciBlPVtdLGY9W10sZz0wO2Q+ZztnKyspZi5wdXNoKGcpO2c9MDtmb3IodmFyIGg9ZDtoPjM7KXt2YXIgaT1mWyhnKzApJWhdLGo9ZlsoZysxKSVoXSxrPWZbKGcrMiklaF0sbD1hWzIqaV0sbT1hWzIqaSsxXSxuPWFbMipqXSxvPWFbMipqKzFdLHA9YVsyKmtdLHE9YVsyKmsrMV0scj0hMTtpZihiLlBvbHlLLl9jb252ZXgobCxtLG4sbyxwLHEsYykpe3I9ITA7Zm9yKHZhciBzPTA7aD5zO3MrKyl7dmFyIHQ9ZltzXTtpZih0IT09aSYmdCE9PWomJnQhPT1rJiZiLlBvbHlLLl9Qb2ludEluVHJpYW5nbGUoYVsyKnRdLGFbMip0KzFdLGwsbSxuLG8scCxxKSl7cj0hMTticmVha319fWlmKHIpZS5wdXNoKGksaixrKSxmLnNwbGljZSgoZysxKSVoLDEpLGgtLSxnPTA7ZWxzZSBpZihnKys+MypoKXtpZighYylyZXR1cm4gd2luZG93LmNvbnNvbGUubG9nKFwiUElYSSBXYXJuaW5nOiBzaGFwZSB0b28gY29tcGxleCB0byBmaWxsXCIpLFtdO2ZvcihlPVtdLGY9W10sZz0wO2Q+ZztnKyspZi5wdXNoKGcpO2c9MCxoPWQsYz0hMX19cmV0dXJuIGUucHVzaChmWzBdLGZbMV0sZlsyXSksZX0sYi5Qb2x5Sy5fUG9pbnRJblRyaWFuZ2xlPWZ1bmN0aW9uKGEsYixjLGQsZSxmLGcsaCl7dmFyIGk9Zy1jLGo9aC1kLGs9ZS1jLGw9Zi1kLG09YS1jLG49Yi1kLG89aSppK2oqaixwPWkqaytqKmwscT1pKm0raipuLHI9ayprK2wqbCxzPWsqbStsKm4sdD0xLyhvKnItcCpwKSx1PShyKnEtcCpzKSp0LHY9KG8qcy1wKnEpKnQ7cmV0dXJuIHU+PTAmJnY+PTAmJjE+dSt2fSxiLlBvbHlLLl9jb252ZXg9ZnVuY3Rpb24oYSxiLGMsZCxlLGYsZyl7cmV0dXJuKGItZCkqKGUtYykrKGMtYSkqKGYtZCk+PTA9PT1nfSxiLmluaXREZWZhdWx0U2hhZGVycz1mdW5jdGlvbigpe30sYi5Db21waWxlVmVydGV4U2hhZGVyPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGIuX0NvbXBpbGVTaGFkZXIoYSxjLGEuVkVSVEVYX1NIQURFUil9LGIuQ29tcGlsZUZyYWdtZW50U2hhZGVyPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGIuX0NvbXBpbGVTaGFkZXIoYSxjLGEuRlJBR01FTlRfU0hBREVSKX0sYi5fQ29tcGlsZVNoYWRlcj1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yi5qb2luKFwiXFxuXCIpLGU9YS5jcmVhdGVTaGFkZXIoYyk7cmV0dXJuIGEuc2hhZGVyU291cmNlKGUsZCksYS5jb21waWxlU2hhZGVyKGUpLGEuZ2V0U2hhZGVyUGFyYW1ldGVyKGUsYS5DT01QSUxFX1NUQVRVUyk/ZTood2luZG93LmNvbnNvbGUubG9nKGEuZ2V0U2hhZGVySW5mb0xvZyhlKSksbnVsbCl9LGIuY29tcGlsZVByb2dyYW09ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWIuQ29tcGlsZUZyYWdtZW50U2hhZGVyKGEsZCksZj1iLkNvbXBpbGVWZXJ0ZXhTaGFkZXIoYSxjKSxnPWEuY3JlYXRlUHJvZ3JhbSgpO3JldHVybiBhLmF0dGFjaFNoYWRlcihnLGYpLGEuYXR0YWNoU2hhZGVyKGcsZSksYS5saW5rUHJvZ3JhbShnKSxhLmdldFByb2dyYW1QYXJhbWV0ZXIoZyxhLkxJTktfU1RBVFVTKXx8d2luZG93LmNvbnNvbGUubG9nKFwiQ291bGQgbm90IGluaXRpYWxpc2Ugc2hhZGVyc1wiKSxnfSxiLlBpeGlTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBsb3dwIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKSAqIHZDb2xvciA7XCIsXCJ9XCJdLHRoaXMudGV4dHVyZUNvdW50PTAsdGhpcy5hdHRyaWJ1dGVzPVtdLHRoaXMuaW5pdCgpfSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjfHxiLlBpeGlTaGFkZXIuZGVmYXVsdFZlcnRleFNyYyx0aGlzLmZyYWdtZW50U3JjKTthLnVzZVByb2dyYW0oYyksdGhpcy51U2FtcGxlcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidVNhbXBsZXJcIiksdGhpcy5wcm9qZWN0aW9uVmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJwcm9qZWN0aW9uVmVjdG9yXCIpLHRoaXMub2Zmc2V0VmVjdG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJvZmZzZXRWZWN0b3JcIiksdGhpcy5kaW1lbnNpb25zPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJkaW1lbnNpb25zXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFUZXh0dXJlQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVRleHR1cmVDb29yZFwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSwtMT09PXRoaXMuY29sb3JBdHRyaWJ1dGUmJih0aGlzLmNvbG9yQXR0cmlidXRlPTIpLHRoaXMuYXR0cmlidXRlcz1bdGhpcy5hVmVydGV4UG9zaXRpb24sdGhpcy5hVGV4dHVyZUNvb3JkLHRoaXMuY29sb3JBdHRyaWJ1dGVdO2Zvcih2YXIgZCBpbiB0aGlzLnVuaWZvcm1zKXRoaXMudW5pZm9ybXNbZF0udW5pZm9ybUxvY2F0aW9uPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsZCk7dGhpcy5pbml0VW5pZm9ybXMoKSx0aGlzLnByb2dyYW09Y30sYi5QaXhpU2hhZGVyLnByb3RvdHlwZS5pbml0VW5pZm9ybXM9ZnVuY3Rpb24oKXt0aGlzLnRleHR1cmVDb3VudD0xO3ZhciBhLGI9dGhpcy5nbDtmb3IodmFyIGMgaW4gdGhpcy51bmlmb3Jtcyl7YT10aGlzLnVuaWZvcm1zW2NdO3ZhciBkPWEudHlwZTtcInNhbXBsZXIyRFwiPT09ZD8oYS5faW5pdD0hMSxudWxsIT09YS52YWx1ZSYmdGhpcy5pbml0U2FtcGxlcjJEKGEpKTpcIm1hdDJcIj09PWR8fFwibWF0M1wiPT09ZHx8XCJtYXQ0XCI9PT1kPyhhLmdsTWF0cml4PSEwLGEuZ2xWYWx1ZUxlbmd0aD0xLFwibWF0MlwiPT09ZD9hLmdsRnVuYz1iLnVuaWZvcm1NYXRyaXgyZnY6XCJtYXQzXCI9PT1kP2EuZ2xGdW5jPWIudW5pZm9ybU1hdHJpeDNmdjpcIm1hdDRcIj09PWQmJihhLmdsRnVuYz1iLnVuaWZvcm1NYXRyaXg0ZnYpKTooYS5nbEZ1bmM9YltcInVuaWZvcm1cIitkXSxhLmdsVmFsdWVMZW5ndGg9XCIyZlwiPT09ZHx8XCIyaVwiPT09ZD8yOlwiM2ZcIj09PWR8fFwiM2lcIj09PWQ/MzpcIjRmXCI9PT1kfHxcIjRpXCI9PT1kPzQ6MSl9fSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmluaXRTYW1wbGVyMkQ9ZnVuY3Rpb24oYSl7aWYoYS52YWx1ZSYmYS52YWx1ZS5iYXNlVGV4dHVyZSYmYS52YWx1ZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpe3ZhciBiPXRoaXMuZ2w7aWYoYi5hY3RpdmVUZXh0dXJlKGJbXCJURVhUVVJFXCIrdGhpcy50ZXh0dXJlQ291bnRdKSxiLmJpbmRUZXh0dXJlKGIuVEVYVFVSRV8yRCxhLnZhbHVlLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2IuaWRdKSxhLnRleHR1cmVEYXRhKXt2YXIgYz1hLnRleHR1cmVEYXRhLGQ9Yy5tYWdGaWx0ZXI/Yy5tYWdGaWx0ZXI6Yi5MSU5FQVIsZT1jLm1pbkZpbHRlcj9jLm1pbkZpbHRlcjpiLkxJTkVBUixmPWMud3JhcFM/Yy53cmFwUzpiLkNMQU1QX1RPX0VER0UsZz1jLndyYXBUP2Mud3JhcFQ6Yi5DTEFNUF9UT19FREdFLGg9Yy5sdW1pbmFuY2U/Yi5MVU1JTkFOQ0U6Yi5SR0JBO2lmKGMucmVwZWF0JiYoZj1iLlJFUEVBVCxnPWIuUkVQRUFUKSxiLnBpeGVsU3RvcmVpKGIuVU5QQUNLX0ZMSVBfWV9XRUJHTCwhIWMuZmxpcFkpLGMud2lkdGgpe3ZhciBpPWMud2lkdGg/Yy53aWR0aDo1MTIsaj1jLmhlaWdodD9jLmhlaWdodDoyLGs9Yy5ib3JkZXI/Yy5ib3JkZXI6MDtiLnRleEltYWdlMkQoYi5URVhUVVJFXzJELDAsaCxpLGosayxoLGIuVU5TSUdORURfQllURSxudWxsKX1lbHNlIGIudGV4SW1hZ2UyRChiLlRFWFRVUkVfMkQsMCxoLGIuUkdCQSxiLlVOU0lHTkVEX0JZVEUsYS52YWx1ZS5iYXNlVGV4dHVyZS5zb3VyY2UpO2IudGV4UGFyYW1ldGVyaShiLlRFWFRVUkVfMkQsYi5URVhUVVJFX01BR19GSUxURVIsZCksYi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfTUlOX0ZJTFRFUixlKSxiLnRleFBhcmFtZXRlcmkoYi5URVhUVVJFXzJELGIuVEVYVFVSRV9XUkFQX1MsZiksYi50ZXhQYXJhbWV0ZXJpKGIuVEVYVFVSRV8yRCxiLlRFWFRVUkVfV1JBUF9ULGcpfWIudW5pZm9ybTFpKGEudW5pZm9ybUxvY2F0aW9uLHRoaXMudGV4dHVyZUNvdW50KSxhLl9pbml0PSEwLHRoaXMudGV4dHVyZUNvdW50Kyt9fSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLnN5bmNVbmlmb3Jtcz1mdW5jdGlvbigpe3RoaXMudGV4dHVyZUNvdW50PTE7dmFyIGEsYz10aGlzLmdsO2Zvcih2YXIgZCBpbiB0aGlzLnVuaWZvcm1zKWE9dGhpcy51bmlmb3Jtc1tkXSwxPT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xNYXRyaXg9PT0hMD9hLmdsRnVuYy5jYWxsKGMsYS51bmlmb3JtTG9jYXRpb24sYS50cmFuc3Bvc2UsYS52YWx1ZSk6YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUpOjI9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUueCxhLnZhbHVlLnkpOjM9PT1hLmdsVmFsdWVMZW5ndGg/YS5nbEZ1bmMuY2FsbChjLGEudW5pZm9ybUxvY2F0aW9uLGEudmFsdWUueCxhLnZhbHVlLnksYS52YWx1ZS56KTo0PT09YS5nbFZhbHVlTGVuZ3RoP2EuZ2xGdW5jLmNhbGwoYyxhLnVuaWZvcm1Mb2NhdGlvbixhLnZhbHVlLngsYS52YWx1ZS55LGEudmFsdWUueixhLnZhbHVlLncpOlwic2FtcGxlcjJEXCI9PT1hLnR5cGUmJihhLl9pbml0PyhjLmFjdGl2ZVRleHR1cmUoY1tcIlRFWFRVUkVcIit0aGlzLnRleHR1cmVDb3VudF0pLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELGEudmFsdWUuYmFzZVRleHR1cmUuX2dsVGV4dHVyZXNbYy5pZF18fGIuY3JlYXRlV2ViR0xUZXh0dXJlKGEudmFsdWUuYmFzZVRleHR1cmUsYykpLGMudW5pZm9ybTFpKGEudW5pZm9ybUxvY2F0aW9uLHRoaXMudGV4dHVyZUNvdW50KSx0aGlzLnRleHR1cmVDb3VudCsrKTp0aGlzLmluaXRTYW1wbGVyMkQoYSkpfSxiLlBpeGlTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlcz1udWxsfSxiLlBpeGlTaGFkZXIuZGVmYXVsdFZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1wiLFwiYXR0cmlidXRlIHZlYzIgYUNvbG9yO1wiLFwidW5pZm9ybSB2ZWMyIHByb2plY3Rpb25WZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0VmVjdG9yO1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwiY29uc3QgdmVjMiBjZW50ZXIgPSB2ZWMyKC0xLjAsIDEuMCk7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCAoKGFWZXJ0ZXhQb3NpdGlvbiArIG9mZnNldFZlY3RvcikgLyBwcm9qZWN0aW9uVmVjdG9yKSArIGNlbnRlciAsIDAuMCwgMS4wKTtcIixcIiAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1wiLFwiICAgdmVjMyBjb2xvciA9IG1vZCh2ZWMzKGFDb2xvci55LzY1NTM2LjAsIGFDb2xvci55LzI1Ni4wLCBhQ29sb3IueSksIDI1Ni4wKSAvIDI1Ni4wO1wiLFwiICAgdkNvbG9yID0gdmVjNChjb2xvciAqIGFDb2xvci54LCBhQ29sb3IueCk7XCIsXCJ9XCJdLGIuUGl4aUZhc3RTaGFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5fVUlEPWIuX1VJRCsrLHRoaXMuZ2w9YSx0aGlzLnByb2dyYW09bnVsbCx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBsb3dwIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIGZsb2F0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCkgKiB2Q29sb3IgO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhUG9zaXRpb25Db29yZDtcIixcImF0dHJpYnV0ZSB2ZWMyIGFTY2FsZTtcIixcImF0dHJpYnV0ZSBmbG9hdCBhUm90YXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1wiLFwiYXR0cmlidXRlIGZsb2F0IGFDb2xvcjtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInVuaWZvcm0gbWF0MyB1TWF0cml4O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIGZsb2F0IHZDb2xvcjtcIixcImNvbnN0IHZlYzIgY2VudGVyID0gdmVjMigtMS4wLCAxLjApO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgdjtcIixcIiAgIHZlYzIgc3YgPSBhVmVydGV4UG9zaXRpb24gKiBhU2NhbGU7XCIsXCIgICB2LnggPSAoc3YueCkgKiBjb3MoYVJvdGF0aW9uKSAtIChzdi55KSAqIHNpbihhUm90YXRpb24pO1wiLFwiICAgdi55ID0gKHN2LngpICogc2luKGFSb3RhdGlvbikgKyAoc3YueSkgKiBjb3MoYVJvdGF0aW9uKTtcIixcIiAgIHYgPSAoIHVNYXRyaXggKiB2ZWMzKHYgKyBhUG9zaXRpb25Db29yZCAsIDEuMCkgKS54eSA7XCIsXCIgICBnbF9Qb3NpdGlvbiA9IHZlYzQoICggdiAvIHByb2plY3Rpb25WZWN0b3IpICsgY2VudGVyICwgMC4wLCAxLjApO1wiLFwiICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XCIsXCIgICB2Q29sb3IgPSBhQ29sb3I7XCIsXCJ9XCJdLHRoaXMudGV4dHVyZUNvdW50PTAsdGhpcy5pbml0KCl9LGIuUGl4aUZhc3RTaGFkZXIucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9Yi5jb21waWxlUHJvZ3JhbShhLHRoaXMudmVydGV4U3JjLHRoaXMuZnJhZ21lbnRTcmMpO2EudXNlUHJvZ3JhbShjKSx0aGlzLnVTYW1wbGVyPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1U2FtcGxlclwiKSx0aGlzLnByb2plY3Rpb25WZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInByb2plY3Rpb25WZWN0b3JcIiksdGhpcy5vZmZzZXRWZWN0b3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcIm9mZnNldFZlY3RvclwiKSx0aGlzLmRpbWVuc2lvbnM9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImRpbWVuc2lvbnNcIiksdGhpcy51TWF0cml4PWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ1TWF0cml4XCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFQb3NpdGlvbkNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFQb3NpdGlvbkNvb3JkXCIpLHRoaXMuYVNjYWxlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFTY2FsZVwiKSx0aGlzLmFSb3RhdGlvbj1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhUm90YXRpb25cIiksdGhpcy5hVGV4dHVyZUNvb3JkPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFUZXh0dXJlQ29vcmRcIiksdGhpcy5jb2xvckF0dHJpYnV0ZT1hLmdldEF0dHJpYkxvY2F0aW9uKGMsXCJhQ29sb3JcIiksLTE9PT10aGlzLmNvbG9yQXR0cmlidXRlJiYodGhpcy5jb2xvckF0dHJpYnV0ZT0yKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuYVBvc2l0aW9uQ29vcmQsdGhpcy5hU2NhbGUsdGhpcy5hUm90YXRpb24sdGhpcy5hVGV4dHVyZUNvb3JkLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMucHJvZ3JhbT1jfSxiLlBpeGlGYXN0U2hhZGVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5nbC5kZWxldGVQcm9ncmFtKHRoaXMucHJvZ3JhbSksdGhpcy51bmlmb3Jtcz1udWxsLHRoaXMuZ2w9bnVsbCx0aGlzLmF0dHJpYnV0ZXM9bnVsbH0sYi5TdHJpcFNoYWRlcj1mdW5jdGlvbihhKXt0aGlzLl9VSUQ9Yi5fVUlEKyssdGhpcy5nbD1hLHRoaXMucHJvZ3JhbT1udWxsLHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInVuaWZvcm0gZmxvYXQgYWxwaGE7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKTtcIixcIn1cIl0sdGhpcy52ZXJ0ZXhTcmM9W1wiYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1wiLFwiYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcIixcInVuaWZvcm0gbWF0MyB0cmFuc2xhdGlvbk1hdHJpeDtcIixcInVuaWZvcm0gdmVjMiBwcm9qZWN0aW9uVmVjdG9yO1wiLFwidW5pZm9ybSB2ZWMyIG9mZnNldFZlY3RvcjtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1wiLFwifVwiXSx0aGlzLmluaXQoKX0sYi5TdHJpcFNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMudVNhbXBsZXI9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInVTYW1wbGVyXCIpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMuY29sb3JBdHRyaWJ1dGU9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYUNvbG9yXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmFUZXh0dXJlQ29vcmQ9YS5nZXRBdHRyaWJMb2NhdGlvbihjLFwiYVRleHR1cmVDb29yZFwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuYVRleHR1cmVDb29yZF0sdGhpcy50cmFuc2xhdGlvbk1hdHJpeD1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwidHJhbnNsYXRpb25NYXRyaXhcIiksdGhpcy5hbHBoYT1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwiYWxwaGFcIiksdGhpcy5wcm9ncmFtPWN9LGIuUHJpbWl0aXZlU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJhdHRyaWJ1dGUgdmVjNCBhQ29sb3I7XCIsXCJ1bmlmb3JtIG1hdDMgdHJhbnNsYXRpb25NYXRyaXg7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGFscGhhO1wiLFwidW5pZm9ybSB2ZWMzIHRpbnQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZDb2xvciA9IGFDb2xvciAqIHZlYzQodGludCAqIGFscGhhLCBhbHBoYSk7XCIsXCJ9XCJdLHRoaXMuaW5pdCgpfSxiLlByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMudGludENvbG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0aW50XCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmNvbG9yQXR0cmlidXRlPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFDb2xvclwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMudHJhbnNsYXRpb25NYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRyYW5zbGF0aW9uTWF0cml4XCIpLHRoaXMuYWxwaGE9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImFscGhhXCIpLHRoaXMucHJvZ3JhbT1jfSxiLlByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2wuZGVsZXRlUHJvZ3JhbSh0aGlzLnByb2dyYW0pLHRoaXMudW5pZm9ybXM9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5hdHRyaWJ1dGU9bnVsbH0sYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyPWZ1bmN0aW9uKGEpe3RoaXMuX1VJRD1iLl9VSUQrKyx0aGlzLmdsPWEsdGhpcy5wcm9ncmFtPW51bGwsdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLFwifVwiXSx0aGlzLnZlcnRleFNyYz1bXCJhdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XCIsXCJ1bmlmb3JtIG1hdDMgdHJhbnNsYXRpb25NYXRyaXg7XCIsXCJ1bmlmb3JtIHZlYzIgcHJvamVjdGlvblZlY3RvcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXRWZWN0b3I7XCIsXCJ1bmlmb3JtIHZlYzMgdGludDtcIixcInVuaWZvcm0gZmxvYXQgYWxwaGE7XCIsXCJ1bmlmb3JtIHZlYzMgY29sb3I7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzMgdiA9IHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24gLCAxLjApO1wiLFwiICAgdiAtPSBvZmZzZXRWZWN0b3IueHl4O1wiLFwiICAgZ2xfUG9zaXRpb24gPSB2ZWM0KCB2LnggLyBwcm9qZWN0aW9uVmVjdG9yLnggLTEuMCwgdi55IC8gLXByb2plY3Rpb25WZWN0b3IueSArIDEuMCAsIDAuMCwgMS4wKTtcIixcIiAgIHZDb2xvciA9IHZlYzQoY29sb3IgKiBhbHBoYSAqIHRpbnQsIGFscGhhKTtcIixcIn1cIl0sdGhpcy5pbml0KCl9LGIuQ29tcGxleFByaW1pdGl2ZVNoYWRlci5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2wsYz1iLmNvbXBpbGVQcm9ncmFtKGEsdGhpcy52ZXJ0ZXhTcmMsdGhpcy5mcmFnbWVudFNyYyk7YS51c2VQcm9ncmFtKGMpLHRoaXMucHJvamVjdGlvblZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwicHJvamVjdGlvblZlY3RvclwiKSx0aGlzLm9mZnNldFZlY3Rvcj1hLmdldFVuaWZvcm1Mb2NhdGlvbihjLFwib2Zmc2V0VmVjdG9yXCIpLHRoaXMudGludENvbG9yPWEuZ2V0VW5pZm9ybUxvY2F0aW9uKGMsXCJ0aW50XCIpLHRoaXMuY29sb3I9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImNvbG9yXCIpLHRoaXMuYVZlcnRleFBvc2l0aW9uPWEuZ2V0QXR0cmliTG9jYXRpb24oYyxcImFWZXJ0ZXhQb3NpdGlvblwiKSx0aGlzLmF0dHJpYnV0ZXM9W3RoaXMuYVZlcnRleFBvc2l0aW9uLHRoaXMuY29sb3JBdHRyaWJ1dGVdLHRoaXMudHJhbnNsYXRpb25NYXRyaXg9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcInRyYW5zbGF0aW9uTWF0cml4XCIpLHRoaXMuYWxwaGE9YS5nZXRVbmlmb3JtTG9jYXRpb24oYyxcImFscGhhXCIpLHRoaXMucHJvZ3JhbT1jfSxiLkNvbXBsZXhQcmltaXRpdmVTaGFkZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLmdsLmRlbGV0ZVByb2dyYW0odGhpcy5wcm9ncmFtKSx0aGlzLnVuaWZvcm1zPW51bGwsdGhpcy5nbD1udWxsLHRoaXMuYXR0cmlidXRlPW51bGx9LGIuV2ViR0xHcmFwaGljcz1mdW5jdGlvbigpe30sYi5XZWJHTEdyYXBoaWNzLnJlbmRlckdyYXBoaWNzPWZ1bmN0aW9uKGEsYyl7dmFyIGQsZT1jLmdsLGY9Yy5wcm9qZWN0aW9uLGc9Yy5vZmZzZXQsaD1jLnNoYWRlck1hbmFnZXIucHJpbWl0aXZlU2hhZGVyO2EuZGlydHkmJmIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcyhhLGUpO2Zvcih2YXIgaT1hLl93ZWJHTFtlLmlkXSxqPTA7ajxpLmRhdGEubGVuZ3RoO2orKykxPT09aS5kYXRhW2pdLm1vZGU/KGQ9aS5kYXRhW2pdLGMuc3RlbmNpbE1hbmFnZXIucHVzaFN0ZW5jaWwoYSxkLGMpLGUuZHJhd0VsZW1lbnRzKGUuVFJJQU5HTEVfRkFOLDQsZS5VTlNJR05FRF9TSE9SVCwyKihkLmluZGljZXMubGVuZ3RoLTQpKSxjLnN0ZW5jaWxNYW5hZ2VyLnBvcFN0ZW5jaWwoYSxkLGMpLHRoaXMubGFzdD1kLm1vZGUpOihkPWkuZGF0YVtqXSxjLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGgpLGg9Yy5zaGFkZXJNYW5hZ2VyLnByaW1pdGl2ZVNoYWRlcixlLnVuaWZvcm1NYXRyaXgzZnYoaC50cmFuc2xhdGlvbk1hdHJpeCwhMSxhLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApKSxlLnVuaWZvcm0yZihoLnByb2plY3Rpb25WZWN0b3IsZi54LC1mLnkpLGUudW5pZm9ybTJmKGgub2Zmc2V0VmVjdG9yLC1nLngsLWcueSksZS51bmlmb3JtM2Z2KGgudGludENvbG9yLGIuaGV4MnJnYihhLnRpbnQpKSxlLnVuaWZvcm0xZihoLmFscGhhLGEud29ybGRBbHBoYSksZS5iaW5kQnVmZmVyKGUuQVJSQVlfQlVGRkVSLGQuYnVmZmVyKSxlLnZlcnRleEF0dHJpYlBvaW50ZXIoaC5hVmVydGV4UG9zaXRpb24sMixlLkZMT0FULCExLDI0LDApLGUudmVydGV4QXR0cmliUG9pbnRlcihoLmNvbG9yQXR0cmlidXRlLDQsZS5GTE9BVCwhMSwyNCw4KSxlLmJpbmRCdWZmZXIoZS5FTEVNRU5UX0FSUkFZX0JVRkZFUixkLmluZGV4QnVmZmVyKSxlLmRyYXdFbGVtZW50cyhlLlRSSUFOR0xFX1NUUklQLGQuaW5kaWNlcy5sZW5ndGgsZS5VTlNJR05FRF9TSE9SVCwwKSl9LGIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcz1mdW5jdGlvbihhLGMpe3ZhciBkPWEuX3dlYkdMW2MuaWRdO2R8fChkPWEuX3dlYkdMW2MuaWRdPXtsYXN0SW5kZXg6MCxkYXRhOltdLGdsOmN9KSxhLmRpcnR5PSExO3ZhciBlO2lmKGEuY2xlYXJEaXJ0eSl7Zm9yKGEuY2xlYXJEaXJ0eT0hMSxlPTA7ZTxkLmRhdGEubGVuZ3RoO2UrKyl7dmFyIGY9ZC5kYXRhW2VdO2YucmVzZXQoKSxiLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbC5wdXNoKGYpfWQuZGF0YT1bXSxkLmxhc3RJbmRleD0wfXZhciBnO2ZvcihlPWQubGFzdEluZGV4O2U8YS5ncmFwaGljc0RhdGEubGVuZ3RoO2UrKyl7dmFyIGg9YS5ncmFwaGljc0RhdGFbZV07aC50eXBlPT09Yi5HcmFwaGljcy5QT0xZPyhoLmZpbGwmJmgucG9pbnRzLmxlbmd0aD42JiYoaC5wb2ludHMubGVuZ3RoPjEwPyhnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMSksYi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ29tcGxleFBvbHkoaCxnKSk6KGc9Yi5XZWJHTEdyYXBoaWNzLnN3aXRjaE1vZGUoZCwwKSxiLldlYkdMR3JhcGhpY3MuYnVpbGRQb2x5KGgsZykpKSxoLmxpbmVXaWR0aD4wJiYoZz1iLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZShkLDApLGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoaCxnKSkpOihnPWIuV2ViR0xHcmFwaGljcy5zd2l0Y2hNb2RlKGQsMCksaC50eXBlPT09Yi5HcmFwaGljcy5SRUNUP2IuV2ViR0xHcmFwaGljcy5idWlsZFJlY3RhbmdsZShoLGcpOmgudHlwZT09PWIuR3JhcGhpY3MuQ0lSQ3x8aC50eXBlPT09Yi5HcmFwaGljcy5FTElQP2IuV2ViR0xHcmFwaGljcy5idWlsZENpcmNsZShoLGcpOmgudHlwZT09PWIuR3JhcGhpY3MuUlJFQyYmYi5XZWJHTEdyYXBoaWNzLmJ1aWxkUm91bmRlZFJlY3RhbmdsZShoLGcpKSxkLmxhc3RJbmRleCsrfWZvcihlPTA7ZTxkLmRhdGEubGVuZ3RoO2UrKylnPWQuZGF0YVtlXSxnLmRpcnR5JiZnLnVwbG9hZCgpfSxiLldlYkdMR3JhcGhpY3Muc3dpdGNoTW9kZT1mdW5jdGlvbihhLGMpe3ZhciBkO3JldHVybiBhLmRhdGEubGVuZ3RoPyhkPWEuZGF0YVthLmRhdGEubGVuZ3RoLTFdLChkLm1vZGUhPT1jfHwxPT09YykmJihkPWIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sLnBvcCgpfHxuZXcgYi5XZWJHTEdyYXBoaWNzRGF0YShhLmdsKSxkLm1vZGU9YyxhLmRhdGEucHVzaChkKSkpOihkPWIuV2ViR0xHcmFwaGljcy5ncmFwaGljc0RhdGFQb29sLnBvcCgpfHxuZXcgYi5XZWJHTEdyYXBoaWNzRGF0YShhLmdsKSxkLm1vZGU9YyxhLmRhdGEucHVzaChkKSksZC5kaXJ0eT0hMCxkfSxiLldlYkdMR3JhcGhpY3MuYnVpbGRSZWN0YW5nbGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cyxlPWRbMF0sZj1kWzFdLGc9ZFsyXSxoPWRbM107aWYoYS5maWxsKXt2YXIgaT1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLGo9YS5maWxsQWxwaGEsaz1pWzBdKmosbD1pWzFdKmosbT1pWzJdKmosbj1jLnBvaW50cyxvPWMuaW5kaWNlcyxwPW4ubGVuZ3RoLzY7bi5wdXNoKGUsZiksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlK2csZiksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlLGYraCksbi5wdXNoKGssbCxtLGopLG4ucHVzaChlK2csZitoKSxuLnB1c2goayxsLG0saiksby5wdXNoKHAscCxwKzEscCsyLHArMyxwKzMpfWlmKGEubGluZVdpZHRoKXt2YXIgcT1hLnBvaW50czthLnBvaW50cz1bZSxmLGUrZyxmLGUrZyxmK2gsZSxmK2gsZSxmXSxiLldlYkdMR3JhcGhpY3MuYnVpbGRMaW5lKGEsYyksYS5wb2ludHM9cX19LGIuV2ViR0xHcmFwaGljcy5idWlsZFJvdW5kZWRSZWN0YW5nbGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cyxlPWRbMF0sZj1kWzFdLGc9ZFsyXSxoPWRbM10saT1kWzRdLGo9W107aWYoai5wdXNoKGUsZitpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlLGYraC1pLGUsZitoLGUraSxmK2gpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2ctaSxmK2gsZStnLGYraCxlK2csZitoLWkpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2csZitpLGUrZyxmLGUrZy1pLGYpKSxqPWouY29uY2F0KGIuV2ViR0xHcmFwaGljcy5xdWFkcmF0aWNCZXppZXJDdXJ2ZShlK2ksZixlLGYsZSxmK2kpKSxhLmZpbGwpe3ZhciBrPWIuaGV4MnJnYihhLmZpbGxDb2xvciksbD1hLmZpbGxBbHBoYSxtPWtbMF0qbCxuPWtbMV0qbCxvPWtbMl0qbCxwPWMucG9pbnRzLHE9Yy5pbmRpY2VzLHI9cC5sZW5ndGgvNixzPWIuUG9seUsuVHJpYW5ndWxhdGUoaiksdD0wO2Zvcih0PTA7dDxzLmxlbmd0aDt0Kz0zKXEucHVzaChzW3RdK3IpLHEucHVzaChzW3RdK3IpLHEucHVzaChzW3QrMV0rcikscS5wdXNoKHNbdCsyXStyKSxxLnB1c2goc1t0KzJdK3IpO2Zvcih0PTA7dDxqLmxlbmd0aDt0KyspcC5wdXNoKGpbdF0salsrK3RdLG0sbixvLGwpfWlmKGEubGluZVdpZHRoKXt2YXIgdT1hLnBvaW50czthLnBvaW50cz1qLGIuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoYSxjKSxhLnBvaW50cz11fX0sYi5XZWJHTEdyYXBoaWNzLnF1YWRyYXRpY0JlemllckN1cnZlPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXtmdW5jdGlvbiBnKGEsYixjKXt2YXIgZD1iLWE7cmV0dXJuIGErZCpjfWZvcih2YXIgaCxpLGosayxsLG0sbj0yMCxvPVtdLHA9MCxxPTA7bj49cTtxKyspcD1xL24saD1nKGEsYyxwKSxpPWcoYixkLHApLGo9ZyhjLGUscCksaz1nKGQsZixwKSxsPWcoaCxqLHApLG09ZyhpLGsscCksby5wdXNoKGwsbSk7cmV0dXJuIG99LGIuV2ViR0xHcmFwaGljcy5idWlsZENpcmNsZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEucG9pbnRzLGU9ZFswXSxmPWRbMV0sZz1kWzJdLGg9ZFszXSxpPTQwLGo9MipNYXRoLlBJL2ksaz0wO2lmKGEuZmlsbCl7dmFyIGw9Yi5oZXgycmdiKGEuZmlsbENvbG9yKSxtPWEuZmlsbEFscGhhLG49bFswXSptLG89bFsxXSptLHA9bFsyXSptLHE9Yy5wb2ludHMscj1jLmluZGljZXMscz1xLmxlbmd0aC82O2ZvcihyLnB1c2gocyksaz0wO2krMT5rO2srKylxLnB1c2goZSxmLG4sbyxwLG0pLHEucHVzaChlK01hdGguc2luKGoqaykqZyxmK01hdGguY29zKGoqaykqaCxuLG8scCxtKSxyLnB1c2gocysrLHMrKyk7ci5wdXNoKHMtMSl9aWYoYS5saW5lV2lkdGgpe3ZhciB0PWEucG9pbnRzO2ZvcihhLnBvaW50cz1bXSxrPTA7aSsxPms7aysrKWEucG9pbnRzLnB1c2goZStNYXRoLnNpbihqKmspKmcsZitNYXRoLmNvcyhqKmspKmgpO2IuV2ViR0xHcmFwaGljcy5idWlsZExpbmUoYSxjKSxhLnBvaW50cz10fX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkTGluZT1mdW5jdGlvbihhLGMpe3ZhciBkPTAsZT1hLnBvaW50cztpZigwIT09ZS5sZW5ndGgpe2lmKGEubGluZVdpZHRoJTIpZm9yKGQ9MDtkPGUubGVuZ3RoO2QrKyllW2RdKz0uNTt2YXIgZj1uZXcgYi5Qb2ludChlWzBdLGVbMV0pLGc9bmV3IGIuUG9pbnQoZVtlLmxlbmd0aC0yXSxlW2UubGVuZ3RoLTFdKTtpZihmLng9PT1nLngmJmYueT09PWcueSl7ZT1lLnNsaWNlKCksZS5wb3AoKSxlLnBvcCgpLGc9bmV3IGIuUG9pbnQoZVtlLmxlbmd0aC0yXSxlW2UubGVuZ3RoLTFdKTt2YXIgaD1nLngrLjUqKGYueC1nLngpLGk9Zy55Ky41KihmLnktZy55KTtlLnVuc2hpZnQoaCxpKSxlLnB1c2goaCxpKX12YXIgaixrLGwsbSxuLG8scCxxLHIscyx0LHUsdix3LHgseSx6LEEsQixDLEQsRSxGLEc9Yy5wb2ludHMsSD1jLmluZGljZXMsST1lLmxlbmd0aC8yLEo9ZS5sZW5ndGgsSz1HLmxlbmd0aC82LEw9YS5saW5lV2lkdGgvMixNPWIuaGV4MnJnYihhLmxpbmVDb2xvciksTj1hLmxpbmVBbHBoYSxPPU1bMF0qTixQPU1bMV0qTixRPU1bMl0qTjtmb3IobD1lWzBdLG09ZVsxXSxuPWVbMl0sbz1lWzNdLHI9LShtLW8pLHM9bC1uLEY9TWF0aC5zcXJ0KHIqcitzKnMpLHIvPUYscy89RixyKj1MLHMqPUwsRy5wdXNoKGwtcixtLXMsTyxQLFEsTiksRy5wdXNoKGwrcixtK3MsTyxQLFEsTiksZD0xO0ktMT5kO2QrKylsPWVbMiooZC0xKV0sbT1lWzIqKGQtMSkrMV0sbj1lWzIqZF0sbz1lWzIqZCsxXSxwPWVbMiooZCsxKV0scT1lWzIqKGQrMSkrMV0scj0tKG0tbykscz1sLW4sRj1NYXRoLnNxcnQocipyK3Mqcyksci89RixzLz1GLHIqPUwscyo9TCx0PS0oby1xKSx1PW4tcCxGPU1hdGguc3FydCh0KnQrdSp1KSx0Lz1GLHUvPUYsdCo9TCx1Kj1MLHg9LXMrbS0oLXMrbykseT0tcituLSgtcitsKSx6PSgtcitsKSooLXMrbyktKC1yK24pKigtcyttKSxBPS11K3EtKC11K28pLEI9LXQrbi0oLXQrcCksQz0oLXQrcCkqKC11K28pLSgtdCtuKSooLXUrcSksRD14KkItQSp5LE1hdGguYWJzKEQpPC4xPyhEKz0xMC4xLEcucHVzaChuLXIsby1zLE8sUCxRLE4pLEcucHVzaChuK3IsbytzLE8sUCxRLE4pKTooaj0oeSpDLUIqeikvRCxrPShBKnoteCpDKS9ELEU9KGotbikqKGotbikrKGstbykrKGstbyksRT4xOTYwMD8odj1yLXQsdz1zLXUsRj1NYXRoLnNxcnQodip2K3cqdyksdi89Rix3Lz1GLHYqPUwsdyo9TCxHLnB1c2gobi12LG8tdyksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuK3Ysbyt3KSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4tdixvLXcpLEcucHVzaChPLFAsUSxOKSxKKyspOihHLnB1c2goaixrKSxHLnB1c2goTyxQLFEsTiksRy5wdXNoKG4tKGotbiksby0oay1vKSksRy5wdXNoKE8sUCxRLE4pKSk7Zm9yKGw9ZVsyKihJLTIpXSxtPWVbMiooSS0yKSsxXSxuPWVbMiooSS0xKV0sbz1lWzIqKEktMSkrMV0scj0tKG0tbykscz1sLW4sRj1NYXRoLnNxcnQocipyK3Mqcyksci89RixzLz1GLHIqPUwscyo9TCxHLnB1c2gobi1yLG8tcyksRy5wdXNoKE8sUCxRLE4pLEcucHVzaChuK3IsbytzKSxHLnB1c2goTyxQLFEsTiksSC5wdXNoKEspLGQ9MDtKPmQ7ZCsrKUgucHVzaChLKyspO0gucHVzaChLLTEpfX0sYi5XZWJHTEdyYXBoaWNzLmJ1aWxkQ29tcGxleFBvbHk9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cy5zbGljZSgpO2lmKCEoZC5sZW5ndGg8Nikpe3ZhciBlPWMuaW5kaWNlcztjLnBvaW50cz1kLGMuYWxwaGE9YS5maWxsQWxwaGEsYy5jb2xvcj1iLmhleDJyZ2IoYS5maWxsQ29sb3IpO2Zvcih2YXIgZixnLGg9MS8wLGk9LTEvMCxqPTEvMCxrPS0xLzAsbD0wO2w8ZC5sZW5ndGg7bCs9MilmPWRbbF0sZz1kW2wrMV0saD1oPmY/ZjpoLGk9Zj5pP2Y6aSxqPWo+Zz9nOmosaz1nPms/ZzprO2QucHVzaChoLGosaSxqLGksayxoLGspO3ZhciBtPWQubGVuZ3RoLzI7Zm9yKGw9MDttPmw7bCsrKWUucHVzaChsKX19LGIuV2ViR0xHcmFwaGljcy5idWlsZFBvbHk9ZnVuY3Rpb24oYSxjKXt2YXIgZD1hLnBvaW50cztpZighKGQubGVuZ3RoPDYpKXt2YXIgZT1jLnBvaW50cyxmPWMuaW5kaWNlcyxnPWQubGVuZ3RoLzIsaD1iLmhleDJyZ2IoYS5maWxsQ29sb3IpLGk9YS5maWxsQWxwaGEsaj1oWzBdKmksaz1oWzFdKmksbD1oWzJdKmksbT1iLlBvbHlLLlRyaWFuZ3VsYXRlKGQpLG49ZS5sZW5ndGgvNixvPTA7Zm9yKG89MDtvPG0ubGVuZ3RoO28rPTMpZi5wdXNoKG1bb10rbiksZi5wdXNoKG1bb10rbiksZi5wdXNoKG1bbysxXStuKSxmLnB1c2gobVtvKzJdK24pLGYucHVzaChtW28rMl0rbik7Zm9yKG89MDtnPm87bysrKWUucHVzaChkWzIqb10sZFsyKm8rMV0saixrLGwsaSl9fSxiLldlYkdMR3JhcGhpY3MuZ3JhcGhpY3NEYXRhUG9vbD1bXSxiLldlYkdMR3JhcGhpY3NEYXRhPWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLmNvbG9yPVswLDAsMF0sdGhpcy5wb2ludHM9W10sdGhpcy5pbmRpY2VzPVtdLHRoaXMubGFzdEluZGV4PTAsdGhpcy5idWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmluZGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5tb2RlPTEsdGhpcy5hbHBoYT0xLHRoaXMuZGlydHk9ITB9LGIuV2ViR0xHcmFwaGljc0RhdGEucHJvdG90eXBlLnJlc2V0PWZ1bmN0aW9uKCl7dGhpcy5wb2ludHM9W10sdGhpcy5pbmRpY2VzPVtdLHRoaXMubGFzdEluZGV4PTB9LGIuV2ViR0xHcmFwaGljc0RhdGEucHJvdG90eXBlLnVwbG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7dGhpcy5nbFBvaW50cz1uZXcgRmxvYXQzMkFycmF5KHRoaXMucG9pbnRzKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy5idWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLmdsUG9pbnRzLGEuU1RBVElDX0RSQVcpLHRoaXMuZ2xJbmRpY2llcz1uZXcgVWludDE2QXJyYXkodGhpcy5pbmRpY2VzKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmdsSW5kaWNpZXMsYS5TVEFUSUNfRFJBVyksdGhpcy5kaXJ0eT0hMX0sYi5nbENvbnRleHRzPVtdLGIuV2ViR0xSZW5kZXJlcj1mdW5jdGlvbihhLGMsZCxlLGYsZyl7Yi5kZWZhdWx0UmVuZGVyZXJ8fChiLnNheUhlbGxvKFwid2ViR0xcIiksYi5kZWZhdWx0UmVuZGVyZXI9dGhpcyksdGhpcy50eXBlPWIuV0VCR0xfUkVOREVSRVIsdGhpcy50cmFuc3BhcmVudD0hIWUsdGhpcy5wcmVzZXJ2ZURyYXdpbmdCdWZmZXI9Zyx0aGlzLndpZHRoPWF8fDgwMCx0aGlzLmhlaWdodD1jfHw2MDAsdGhpcy52aWV3PWR8fGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIiksdGhpcy52aWV3LndpZHRoPXRoaXMud2lkdGgsdGhpcy52aWV3LmhlaWdodD10aGlzLmhlaWdodCx0aGlzLmNvbnRleHRMb3N0PXRoaXMuaGFuZGxlQ29udGV4dExvc3QuYmluZCh0aGlzKSx0aGlzLmNvbnRleHRSZXN0b3JlZExvc3Q9dGhpcy5oYW5kbGVDb250ZXh0UmVzdG9yZWQuYmluZCh0aGlzKSx0aGlzLnZpZXcuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dGxvc3RcIix0aGlzLmNvbnRleHRMb3N0LCExKSx0aGlzLnZpZXcuYWRkRXZlbnRMaXN0ZW5lcihcIndlYmdsY29udGV4dHJlc3RvcmVkXCIsdGhpcy5jb250ZXh0UmVzdG9yZWRMb3N0LCExKSx0aGlzLm9wdGlvbnM9e2FscGhhOnRoaXMudHJhbnNwYXJlbnQsYW50aWFsaWFzOiEhZixwcmVtdWx0aXBsaWVkQWxwaGE6ISFlLHN0ZW5jaWw6ITAscHJlc2VydmVEcmF3aW5nQnVmZmVyOmd9O3ZhciBoPW51bGw7aWYoW1wiZXhwZXJpbWVudGFsLXdlYmdsXCIsXCJ3ZWJnbFwiXS5mb3JFYWNoKGZ1bmN0aW9uKGEpe3RyeXtoPWh8fHRoaXMudmlldy5nZXRDb250ZXh0KGEsdGhpcy5vcHRpb25zKX1jYXRjaChiKXt9fSx0aGlzKSwhaCl0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB3ZWJHTC4gVHJ5IHVzaW5nIHRoZSBjYW52YXMgcmVuZGVyZXJcIit0aGlzKTt0aGlzLmdsPWgsdGhpcy5nbENvbnRleHRJZD1oLmlkPWIuV2ViR0xSZW5kZXJlci5nbENvbnRleHRJZCsrLGIuZ2xDb250ZXh0c1t0aGlzLmdsQ29udGV4dElkXT1oLGIuYmxlbmRNb2Rlc1dlYkdMfHwoYi5ibGVuZE1vZGVzV2ViR0w9W10sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLk5PUk1BTF09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkFERF09W2guU1JDX0FMUEhBLGguRFNUX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTVVMVElQTFldPVtoLkRTVF9DT0xPUixoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5TQ1JFRU5dPVtoLlNSQ19BTFBIQSxoLk9ORV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLk9WRVJMQVldPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5MSUdIVEVOXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuQ09MT1JfRE9ER0VdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuSEFSRF9MSUdIVF09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLlNPRlRfTElHSFRdPVtoLk9ORSxoLk9ORV9NSU5VU19TUkNfQUxQSEFdLGIuYmxlbmRNb2Rlc1dlYkdMW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuRVhDTFVTSU9OXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuSFVFXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuU0FUVVJBVElPTl09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0sYi5ibGVuZE1vZGVzV2ViR0xbYi5ibGVuZE1vZGVzLkNPTE9SXT1baC5PTkUsaC5PTkVfTUlOVVNfU1JDX0FMUEhBXSxiLmJsZW5kTW9kZXNXZWJHTFtiLmJsZW5kTW9kZXMuTFVNSU5PU0lUWV09W2guT05FLGguT05FX01JTlVTX1NSQ19BTFBIQV0pLHRoaXMucHJvamVjdGlvbj1uZXcgYi5Qb2ludCx0aGlzLnByb2plY3Rpb24ueD10aGlzLndpZHRoLzIsdGhpcy5wcm9qZWN0aW9uLnk9LXRoaXMuaGVpZ2h0LzIsdGhpcy5vZmZzZXQ9bmV3IGIuUG9pbnQoMCwwKSx0aGlzLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLmNvbnRleHRMb3N0PSExLHRoaXMuc2hhZGVyTWFuYWdlcj1uZXcgYi5XZWJHTFNoYWRlck1hbmFnZXIoaCksdGhpcy5zcHJpdGVCYXRjaD1uZXcgYi5XZWJHTFNwcml0ZUJhdGNoKGgpLHRoaXMubWFza01hbmFnZXI9bmV3IGIuV2ViR0xNYXNrTWFuYWdlcihoKSx0aGlzLmZpbHRlck1hbmFnZXI9bmV3IGIuV2ViR0xGaWx0ZXJNYW5hZ2VyKGgsdGhpcy50cmFuc3BhcmVudCksdGhpcy5zdGVuY2lsTWFuYWdlcj1uZXcgYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyKGgpLHRoaXMuYmxlbmRNb2RlTWFuYWdlcj1uZXcgYi5XZWJHTEJsZW5kTW9kZU1hbmFnZXIoaCksdGhpcy5yZW5kZXJTZXNzaW9uPXt9LHRoaXMucmVuZGVyU2Vzc2lvbi5nbD10aGlzLmdsLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQ9MCx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlcj10aGlzLnNoYWRlck1hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLm1hc2tNYW5hZ2VyPXRoaXMubWFza01hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uLmZpbHRlck1hbmFnZXI9dGhpcy5maWx0ZXJNYW5hZ2VyLHRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyPXRoaXMuYmxlbmRNb2RlTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24uc3ByaXRlQmF0Y2g9dGhpcy5zcHJpdGVCYXRjaCx0aGlzLnJlbmRlclNlc3Npb24uc3RlbmNpbE1hbmFnZXI9dGhpcy5zdGVuY2lsTWFuYWdlcix0aGlzLnJlbmRlclNlc3Npb24ucmVuZGVyZXI9dGhpcyxoLnVzZVByb2dyYW0odGhpcy5zaGFkZXJNYW5hZ2VyLmRlZmF1bHRTaGFkZXIucHJvZ3JhbSksaC5kaXNhYmxlKGguREVQVEhfVEVTVCksaC5kaXNhYmxlKGguQ1VMTF9GQUNFKSxoLmVuYWJsZShoLkJMRU5EKSxoLmNvbG9yTWFzayghMCwhMCwhMCx0aGlzLnRyYW5zcGFyZW50KX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLldlYkdMUmVuZGVyZXIsYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7aWYoIXRoaXMuY29udGV4dExvc3Qpe3RoaXMuX19zdGFnZSE9PWEmJihhLmludGVyYWN0aXZlJiZhLmludGVyYWN0aW9uTWFuYWdlci5yZW1vdmVFdmVudHMoKSx0aGlzLl9fc3RhZ2U9YSksYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVzKCksYS51cGRhdGVUcmFuc2Zvcm0oKSxhLl9pbnRlcmFjdGl2ZSYmKGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWR8fChhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSEwLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSkpO3ZhciBjPXRoaXMuZ2w7Yy52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksYy5iaW5kRnJhbWVidWZmZXIoYy5GUkFNRUJVRkZFUixudWxsKSx0aGlzLnRyYW5zcGFyZW50P2MuY2xlYXJDb2xvcigwLDAsMCwwKTpjLmNsZWFyQ29sb3IoYS5iYWNrZ3JvdW5kQ29sb3JTcGxpdFswXSxhLmJhY2tncm91bmRDb2xvclNwbGl0WzFdLGEuYmFja2dyb3VuZENvbG9yU3BsaXRbMl0sMSksYy5jbGVhcihjLkNPTE9SX0JVRkZFUl9CSVQpLHRoaXMucmVuZGVyRGlzcGxheU9iamVjdChhLHRoaXMucHJvamVjdGlvbiksYS5pbnRlcmFjdGl2ZT9hLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkfHwoYS5faW50ZXJhY3RpdmVFdmVudHNBZGRlZD0hMCxhLmludGVyYWN0aW9uTWFuYWdlci5zZXRUYXJnZXQodGhpcykpOmEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWQmJihhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSExLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSl9fSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlckRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oYSxjLGQpe3RoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLnNldEJsZW5kTW9kZShiLmJsZW5kTW9kZXMuTk9STUFMKSx0aGlzLnJlbmRlclNlc3Npb24uZHJhd0NvdW50PTAsdGhpcy5yZW5kZXJTZXNzaW9uLmN1cnJlbnRCbGVuZE1vZGU9OTk5OSx0aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbj1jLHRoaXMucmVuZGVyU2Vzc2lvbi5vZmZzZXQ9dGhpcy5vZmZzZXQsdGhpcy5zcHJpdGVCYXRjaC5iZWdpbih0aGlzLnJlbmRlclNlc3Npb24pLHRoaXMuZmlsdGVyTWFuYWdlci5iZWdpbih0aGlzLnJlbmRlclNlc3Npb24sZCksYS5fcmVuZGVyV2ViR0wodGhpcy5yZW5kZXJTZXNzaW9uKSx0aGlzLnNwcml0ZUJhdGNoLmVuZCgpfSxiLldlYkdMUmVuZGVyZXIudXBkYXRlVGV4dHVyZXM9ZnVuY3Rpb24oKXt2YXIgYT0wO2ZvcihhPTA7YTxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aDthKyspYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVGcmFtZShiLlRleHR1cmUuZnJhbWVVcGRhdGVzW2FdKTtmb3IoYT0wO2E8Yi50ZXh0dXJlc1RvRGVzdHJveS5sZW5ndGg7YSsrKWIuV2ViR0xSZW5kZXJlci5kZXN0cm95VGV4dHVyZShiLnRleHR1cmVzVG9EZXN0cm95W2FdKTtiLnRleHR1cmVzVG9VcGRhdGUubGVuZ3RoPTAsYi50ZXh0dXJlc1RvRGVzdHJveS5sZW5ndGg9MCxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aD0wfSxiLldlYkdMUmVuZGVyZXIuZGVzdHJveVRleHR1cmU9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPWEuX2dsVGV4dHVyZXMubGVuZ3RoLTE7Yz49MDtjLS0pe3ZhciBkPWEuX2dsVGV4dHVyZXNbY10sZT1iLmdsQ29udGV4dHNbY107XG5lJiZkJiZlLmRlbGV0ZVRleHR1cmUoZCl9YS5fZ2xUZXh0dXJlcy5sZW5ndGg9MH0sYi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVGcmFtZT1mdW5jdGlvbihhKXthLl91cGRhdGVXZWJHTHV2cygpfSxiLldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGIpe3RoaXMud2lkdGg9YSx0aGlzLmhlaWdodD1iLHRoaXMudmlldy53aWR0aD1hLHRoaXMudmlldy5oZWlnaHQ9Yix0aGlzLmdsLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLnByb2plY3Rpb24ueD10aGlzLndpZHRoLzIsdGhpcy5wcm9qZWN0aW9uLnk9LXRoaXMuaGVpZ2h0LzJ9LGIuY3JlYXRlV2ViR0xUZXh0dXJlPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGEuaGFzTG9hZGVkJiYoYS5fZ2xUZXh0dXJlc1tjLmlkXT1jLmNyZWF0ZVRleHR1cmUoKSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2MuaWRdKSxjLnBpeGVsU3RvcmVpKGMuVU5QQUNLX1BSRU1VTFRJUExZX0FMUEhBX1dFQkdMLGEucHJlbXVsdGlwbGllZEFscGhhKSxjLnRleEltYWdlMkQoYy5URVhUVVJFXzJELDAsYy5SR0JBLGMuUkdCQSxjLlVOU0lHTkVEX0JZVEUsYS5zb3VyY2UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01BR19GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUlOX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxhLl9wb3dlck9mMj8oYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuUkVQRUFUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5SRVBFQVQpKTooYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuQ0xBTVBfVE9fRURHRSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuQ0xBTVBfVE9fRURHRSkpLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELG51bGwpLGEuX2RpcnR5W2MuaWRdPSExKSxhLl9nbFRleHR1cmVzW2MuaWRdfSxiLnVwZGF0ZVdlYkdMVGV4dHVyZT1mdW5jdGlvbihhLGMpe2EuX2dsVGV4dHVyZXNbYy5pZF0mJihjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2MuaWRdKSxjLnBpeGVsU3RvcmVpKGMuVU5QQUNLX1BSRU1VTFRJUExZX0FMUEhBX1dFQkdMLGEucHJlbXVsdGlwbGllZEFscGhhKSxjLnRleEltYWdlMkQoYy5URVhUVVJFXzJELDAsYy5SR0JBLGMuUkdCQSxjLlVOU0lHTkVEX0JZVEUsYS5zb3VyY2UpLGMudGV4UGFyYW1ldGVyaShjLlRFWFRVUkVfMkQsYy5URVhUVVJFX01BR19GSUxURVIsYS5zY2FsZU1vZGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2MuTElORUFSOmMuTkVBUkVTVCksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfTUlOX0ZJTFRFUixhLnNjYWxlTW9kZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/Yy5MSU5FQVI6Yy5ORUFSRVNUKSxhLl9wb3dlck9mMj8oYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuUkVQRUFUKSxjLnRleFBhcmFtZXRlcmkoYy5URVhUVVJFXzJELGMuVEVYVFVSRV9XUkFQX1QsYy5SRVBFQVQpKTooYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9TLGMuQ0xBTVBfVE9fRURHRSksYy50ZXhQYXJhbWV0ZXJpKGMuVEVYVFVSRV8yRCxjLlRFWFRVUkVfV1JBUF9ULGMuQ0xBTVBfVE9fRURHRSkpLGEuX2RpcnR5W2MuaWRdPSExKX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVDb250ZXh0TG9zdD1mdW5jdGlvbihhKXthLnByZXZlbnREZWZhdWx0KCksdGhpcy5jb250ZXh0TG9zdD0hMH0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVDb250ZXh0UmVzdG9yZWQ9ZnVuY3Rpb24oKXt0cnl7dGhpcy5nbD10aGlzLnZpZXcuZ2V0Q29udGV4dChcImV4cGVyaW1lbnRhbC13ZWJnbFwiLHRoaXMub3B0aW9ucyl9Y2F0Y2goYSl7dHJ5e3RoaXMuZ2w9dGhpcy52aWV3LmdldENvbnRleHQoXCJ3ZWJnbFwiLHRoaXMub3B0aW9ucyl9Y2F0Y2goYyl7dGhyb3cgbmV3IEVycm9yKFwiIFRoaXMgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHdlYkdMLiBUcnkgdXNpbmcgdGhlIGNhbnZhcyByZW5kZXJlclwiK3RoaXMpfX12YXIgZD10aGlzLmdsO2QuaWQ9Yi5XZWJHTFJlbmRlcmVyLmdsQ29udGV4dElkKyssdGhpcy5zaGFkZXJNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5zcHJpdGVCYXRjaC5zZXRDb250ZXh0KGQpLHRoaXMucHJpbWl0aXZlQmF0Y2guc2V0Q29udGV4dChkKSx0aGlzLm1hc2tNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5maWx0ZXJNYW5hZ2VyLnNldENvbnRleHQoZCksdGhpcy5yZW5kZXJTZXNzaW9uLmdsPXRoaXMuZ2wsZC5kaXNhYmxlKGQuREVQVEhfVEVTVCksZC5kaXNhYmxlKGQuQ1VMTF9GQUNFKSxkLmVuYWJsZShkLkJMRU5EKSxkLmNvbG9yTWFzayghMCwhMCwhMCx0aGlzLnRyYW5zcGFyZW50KSx0aGlzLmdsLnZpZXdwb3J0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KTtmb3IodmFyIGUgaW4gYi5UZXh0dXJlQ2FjaGUpe3ZhciBmPWIuVGV4dHVyZUNhY2hlW2VdLmJhc2VUZXh0dXJlO2YuX2dsVGV4dHVyZXM9W119dGhpcy5jb250ZXh0TG9zdD0hMX0sYi5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy52aWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRsb3N0XCIsdGhpcy5jb250ZXh0TG9zdCksdGhpcy52aWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3ZWJnbGNvbnRleHRyZXN0b3JlZFwiLHRoaXMuY29udGV4dFJlc3RvcmVkTG9zdCksYi5nbENvbnRleHRzW3RoaXMuZ2xDb250ZXh0SWRdPW51bGwsdGhpcy5wcm9qZWN0aW9uPW51bGwsdGhpcy5vZmZzZXQ9bnVsbCx0aGlzLnNoYWRlck1hbmFnZXIuZGVzdHJveSgpLHRoaXMuc3ByaXRlQmF0Y2guZGVzdHJveSgpLHRoaXMucHJpbWl0aXZlQmF0Y2guZGVzdHJveSgpLHRoaXMubWFza01hbmFnZXIuZGVzdHJveSgpLHRoaXMuZmlsdGVyTWFuYWdlci5kZXN0cm95KCksdGhpcy5zaGFkZXJNYW5hZ2VyPW51bGwsdGhpcy5zcHJpdGVCYXRjaD1udWxsLHRoaXMubWFza01hbmFnZXI9bnVsbCx0aGlzLmZpbHRlck1hbmFnZXI9bnVsbCx0aGlzLmdsPW51bGwsdGhpcy5yZW5kZXJTZXNzaW9uPW51bGx9LGIuV2ViR0xSZW5kZXJlci5nbENvbnRleHRJZD0wLGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9OTk5OTl9LGIuV2ViR0xCbGVuZE1vZGVNYW5hZ2VyLnByb3RvdHlwZS5zZXRCbGVuZE1vZGU9ZnVuY3Rpb24oYSl7aWYodGhpcy5jdXJyZW50QmxlbmRNb2RlPT09YSlyZXR1cm4hMTt0aGlzLmN1cnJlbnRCbGVuZE1vZGU9YTt2YXIgYz1iLmJsZW5kTW9kZXNXZWJHTFt0aGlzLmN1cnJlbnRCbGVuZE1vZGVdO3JldHVybiB0aGlzLmdsLmJsZW5kRnVuYyhjWzBdLGNbMV0pLCEwfSxiLldlYkdMQmxlbmRNb2RlTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuZ2w9bnVsbH0sYi5XZWJHTE1hc2tNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMubWFza1N0YWNrPVtdLHRoaXMubWFza1Bvc2l0aW9uPTAsdGhpcy5zZXRDb250ZXh0KGEpLHRoaXMucmV2ZXJzZT0hMSx0aGlzLmNvdW50PTB9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWF9LGIuV2ViR0xNYXNrTWFuYWdlci5wcm90b3R5cGUucHVzaE1hc2s9ZnVuY3Rpb24oYSxjKXt2YXIgZD1jLmdsO2EuZGlydHkmJmIuV2ViR0xHcmFwaGljcy51cGRhdGVHcmFwaGljcyhhLGQpLGEuX3dlYkdMW2QuaWRdLmRhdGEubGVuZ3RoJiZjLnN0ZW5jaWxNYW5hZ2VyLnB1c2hTdGVuY2lsKGEsYS5fd2ViR0xbZC5pZF0uZGF0YVswXSxjKX0sYi5XZWJHTE1hc2tNYW5hZ2VyLnByb3RvdHlwZS5wb3BNYXNrPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5nbDtiLnN0ZW5jaWxNYW5hZ2VyLnBvcFN0ZW5jaWwoYSxhLl93ZWJHTFtjLmlkXS5kYXRhWzBdLGIpfSxiLldlYkdMTWFza01hbmFnZXIucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLm1hc2tTdGFjaz1udWxsLHRoaXMuZ2w9bnVsbH0sYi5XZWJHTFN0ZW5jaWxNYW5hZ2VyPWZ1bmN0aW9uKGEpe3RoaXMuc3RlbmNpbFN0YWNrPVtdLHRoaXMuc2V0Q29udGV4dChhKSx0aGlzLnJldmVyc2U9ITAsdGhpcy5jb3VudD0wfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnB1c2hTdGVuY2lsPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmdsO3RoaXMuYmluZEdyYXBoaWNzKGEsYixjKSwwPT09dGhpcy5zdGVuY2lsU3RhY2subGVuZ3RoJiYoZC5lbmFibGUoZC5TVEVOQ0lMX1RFU1QpLGQuY2xlYXIoZC5TVEVOQ0lMX0JVRkZFUl9CSVQpLHRoaXMucmV2ZXJzZT0hMCx0aGlzLmNvdW50PTApLHRoaXMuc3RlbmNpbFN0YWNrLnB1c2goYik7dmFyIGU9dGhpcy5jb3VudDtkLmNvbG9yTWFzayghMSwhMSwhMSwhMSksZC5zdGVuY2lsRnVuYyhkLkFMV0FZUywwLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOVkVSVCksMT09PWIubW9kZT8oZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sYi5pbmRpY2VzLmxlbmd0aC00LGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sNCxkLlVOU0lHTkVEX1NIT1JULDIqKGIuaW5kaWNlcy5sZW5ndGgtNCkpLHRoaXMucmV2ZXJzZT9kLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUrMSwyNTUpLHRoaXMucmV2ZXJzZT0hdGhpcy5yZXZlcnNlKToodGhpcy5yZXZlcnNlPyhkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5JTkNSKSk6KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtZSwyNTUpLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5ERUNSKSksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9TVFJJUCxiLmluZGljZXMubGVuZ3RoLGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSkpLGQuY29sb3JNYXNrKCEwLCEwLCEwLCEwKSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuS0VFUCksdGhpcy5jb3VudCsrfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLmJpbmRHcmFwaGljcz1mdW5jdGlvbihhLGMsZCl7dGhpcy5fY3VycmVudEdyYXBoaWNzPWE7dmFyIGUsZj10aGlzLmdsLGc9ZC5wcm9qZWN0aW9uLGg9ZC5vZmZzZXQ7MT09PWMubW9kZT8oZT1kLnNoYWRlck1hbmFnZXIuY29tcGxleFByaW1hdGl2ZVNoYWRlcixkLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKGUpLGYudW5pZm9ybU1hdHJpeDNmdihlLnRyYW5zbGF0aW9uTWF0cml4LCExLGEud29ybGRUcmFuc2Zvcm0udG9BcnJheSghMCkpLGYudW5pZm9ybTJmKGUucHJvamVjdGlvblZlY3RvcixnLngsLWcueSksZi51bmlmb3JtMmYoZS5vZmZzZXRWZWN0b3IsLWgueCwtaC55KSxmLnVuaWZvcm0zZnYoZS50aW50Q29sb3IsYi5oZXgycmdiKGEudGludCkpLGYudW5pZm9ybTNmdihlLmNvbG9yLGMuY29sb3IpLGYudW5pZm9ybTFmKGUuYWxwaGEsYS53b3JsZEFscGhhKmMuYWxwaGEpLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUixjLmJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGUuYVZlcnRleFBvc2l0aW9uLDIsZi5GTE9BVCwhMSw4LDApLGYuYmluZEJ1ZmZlcihmLkVMRU1FTlRfQVJSQVlfQlVGRkVSLGMuaW5kZXhCdWZmZXIpKTooZT1kLnNoYWRlck1hbmFnZXIucHJpbWl0aXZlU2hhZGVyLGQuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoZSksZi51bmlmb3JtTWF0cml4M2Z2KGUudHJhbnNsYXRpb25NYXRyaXgsITEsYS53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksZi51bmlmb3JtMmYoZS5wcm9qZWN0aW9uVmVjdG9yLGcueCwtZy55KSxmLnVuaWZvcm0yZihlLm9mZnNldFZlY3RvciwtaC54LC1oLnkpLGYudW5pZm9ybTNmdihlLnRpbnRDb2xvcixiLmhleDJyZ2IoYS50aW50KSksZi51bmlmb3JtMWYoZS5hbHBoYSxhLndvcmxkQWxwaGEpLGYuYmluZEJ1ZmZlcihmLkFSUkFZX0JVRkZFUixjLmJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGUuYVZlcnRleFBvc2l0aW9uLDIsZi5GTE9BVCwhMSwyNCwwKSxmLnZlcnRleEF0dHJpYlBvaW50ZXIoZS5jb2xvckF0dHJpYnV0ZSw0LGYuRkxPQVQsITEsMjQsOCksZi5iaW5kQnVmZmVyKGYuRUxFTUVOVF9BUlJBWV9CVUZGRVIsYy5pbmRleEJ1ZmZlcikpfSxiLldlYkdMU3RlbmNpbE1hbmFnZXIucHJvdG90eXBlLnBvcFN0ZW5jaWw9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZ2w7aWYodGhpcy5zdGVuY2lsU3RhY2sucG9wKCksdGhpcy5jb3VudC0tLDA9PT10aGlzLnN0ZW5jaWxTdGFjay5sZW5ndGgpZC5kaXNhYmxlKGQuU1RFTkNJTF9URVNUKTtlbHNle3ZhciBlPXRoaXMuY291bnQ7dGhpcy5iaW5kR3JhcGhpY3MoYSxiLGMpLGQuY29sb3JNYXNrKCExLCExLCExLCExKSwxPT09Yi5tb2RlPyh0aGlzLnJldmVyc2U9IXRoaXMucmV2ZXJzZSx0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCwyNTUtKGUrMSksMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuSU5DUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsZSsxLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLkRFQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX0ZBTiw0LGQuVU5TSUdORURfU0hPUlQsMiooYi5pbmRpY2VzLmxlbmd0aC00KSksZC5zdGVuY2lsRnVuYyhkLkFMV0FZUywwLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOVkVSVCksZC5kcmF3RWxlbWVudHMoZC5UUklBTkdMRV9GQU4sYi5pbmRpY2VzLmxlbmd0aC00LGQuVU5TSUdORURfU0hPUlQsMCksdGhpcy5yZXZlcnNlP2Quc3RlbmNpbEZ1bmMoZC5FUVVBTCxlLDI1NSk6ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLDI1NS1lLDI1NSkpOih0aGlzLnJldmVyc2U/KGQuc3RlbmNpbEZ1bmMoZC5FUVVBTCxlKzEsMjU1KSxkLnN0ZW5jaWxPcChkLktFRVAsZC5LRUVQLGQuREVDUikpOihkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LShlKzEpLDI1NSksZC5zdGVuY2lsT3AoZC5LRUVQLGQuS0VFUCxkLklOQ1IpKSxkLmRyYXdFbGVtZW50cyhkLlRSSUFOR0xFX1NUUklQLGIuaW5kaWNlcy5sZW5ndGgsZC5VTlNJR05FRF9TSE9SVCwwKSx0aGlzLnJldmVyc2U/ZC5zdGVuY2lsRnVuYyhkLkVRVUFMLGUsMjU1KTpkLnN0ZW5jaWxGdW5jKGQuRVFVQUwsMjU1LWUsMjU1KSksZC5jb2xvck1hc2soITAsITAsITAsITApLGQuc3RlbmNpbE9wKGQuS0VFUCxkLktFRVAsZC5LRUVQKX19LGIuV2ViR0xTdGVuY2lsTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMubWFza1N0YWNrPW51bGwsdGhpcy5nbD1udWxsfSxiLldlYkdMU2hhZGVyTWFuYWdlcj1mdW5jdGlvbihhKXt0aGlzLm1heEF0dGlicz0xMCx0aGlzLmF0dHJpYlN0YXRlPVtdLHRoaXMudGVtcEF0dHJpYlN0YXRlPVtdLHRoaXMuc2hhZGVyTWFwPVtdO2Zvcih2YXIgYj0wO2I8dGhpcy5tYXhBdHRpYnM7YisrKXRoaXMuYXR0cmliU3RhdGVbYl09ITE7dGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMU2hhZGVyTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy5wcmltaXRpdmVTaGFkZXI9bmV3IGIuUHJpbWl0aXZlU2hhZGVyKGEpLHRoaXMuY29tcGxleFByaW1hdGl2ZVNoYWRlcj1uZXcgYi5Db21wbGV4UHJpbWl0aXZlU2hhZGVyKGEpLHRoaXMuZGVmYXVsdFNoYWRlcj1uZXcgYi5QaXhpU2hhZGVyKGEpLHRoaXMuZmFzdFNoYWRlcj1uZXcgYi5QaXhpRmFzdFNoYWRlcihhKSx0aGlzLnN0cmlwU2hhZGVyPW5ldyBiLlN0cmlwU2hhZGVyKGEpLHRoaXMuc2V0U2hhZGVyKHRoaXMuZGVmYXVsdFNoYWRlcil9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRBdHRyaWJzPWZ1bmN0aW9uKGEpe3ZhciBiO2ZvcihiPTA7Yjx0aGlzLnRlbXBBdHRyaWJTdGF0ZS5sZW5ndGg7YisrKXRoaXMudGVtcEF0dHJpYlN0YXRlW2JdPSExO2ZvcihiPTA7YjxhLmxlbmd0aDtiKyspe3ZhciBjPWFbYl07dGhpcy50ZW1wQXR0cmliU3RhdGVbY109ITB9dmFyIGQ9dGhpcy5nbDtmb3IoYj0wO2I8dGhpcy5hdHRyaWJTdGF0ZS5sZW5ndGg7YisrKXRoaXMuYXR0cmliU3RhdGVbYl0hPT10aGlzLnRlbXBBdHRyaWJTdGF0ZVtiXSYmKHRoaXMuYXR0cmliU3RhdGVbYl09dGhpcy50ZW1wQXR0cmliU3RhdGVbYl0sdGhpcy50ZW1wQXR0cmliU3RhdGVbYl0/ZC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShiKTpkLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheShiKSl9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRTaGFkZXI9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX2N1cnJlbnRJZD09PWEuX1VJRD8hMToodGhpcy5fY3VycmVudElkPWEuX1VJRCx0aGlzLmN1cnJlbnRTaGFkZXI9YSx0aGlzLmdsLnVzZVByb2dyYW0oYS5wcm9ncmFtKSx0aGlzLnNldEF0dHJpYnMoYS5hdHRyaWJ1dGVzKSwhMCl9LGIuV2ViR0xTaGFkZXJNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5hdHRyaWJTdGF0ZT1udWxsLHRoaXMudGVtcEF0dHJpYlN0YXRlPW51bGwsdGhpcy5wcmltaXRpdmVTaGFkZXIuZGVzdHJveSgpLHRoaXMuZGVmYXVsdFNoYWRlci5kZXN0cm95KCksdGhpcy5mYXN0U2hhZGVyLmRlc3Ryb3koKSx0aGlzLnN0cmlwU2hhZGVyLmRlc3Ryb3koKSx0aGlzLmdsPW51bGx9LGIuV2ViR0xTcHJpdGVCYXRjaD1mdW5jdGlvbihhKXt0aGlzLnZlcnRTaXplPTYsdGhpcy5zaXplPTJlMzt2YXIgYj00KnRoaXMuc2l6ZSp0aGlzLnZlcnRTaXplLGM9Nip0aGlzLnNpemU7dGhpcy52ZXJ0aWNlcz1uZXcgRmxvYXQzMkFycmF5KGIpLHRoaXMuaW5kaWNlcz1uZXcgVWludDE2QXJyYXkoYyksdGhpcy5sYXN0SW5kZXhDb3VudD0wO2Zvcih2YXIgZD0wLGU9MDtjPmQ7ZCs9NixlKz00KXRoaXMuaW5kaWNlc1tkKzBdPWUrMCx0aGlzLmluZGljZXNbZCsxXT1lKzEsdGhpcy5pbmRpY2VzW2QrMl09ZSsyLHRoaXMuaW5kaWNlc1tkKzNdPWUrMCx0aGlzLmluZGljZXNbZCs0XT1lKzIsdGhpcy5pbmRpY2VzW2QrNV09ZSszO3RoaXMuZHJhd2luZz0hMSx0aGlzLmN1cnJlbnRCYXRjaFNpemU9MCx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1udWxsLHRoaXMuc2V0Q29udGV4dChhKSx0aGlzLmRpcnR5PSEwLHRoaXMudGV4dHVyZXM9W10sdGhpcy5ibGVuZE1vZGVzPVtdfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnNldENvbnRleHQ9ZnVuY3Rpb24oYSl7dGhpcy5nbD1hLHRoaXMudmVydGV4QnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kaWNlcyxhLlNUQVRJQ19EUkFXKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRpY2VzLGEuRFlOQU1JQ19EUkFXKSx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9OTk5OTl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuYmVnaW49ZnVuY3Rpb24oYSl7dGhpcy5yZW5kZXJTZXNzaW9uPWEsdGhpcy5zaGFkZXI9dGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlcix0aGlzLnN0YXJ0KCl9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlcj1mdW5jdGlvbihhKXt2YXIgYj1hLnRleHR1cmU7dGhpcy5jdXJyZW50QmF0Y2hTaXplPj10aGlzLnNpemUmJih0aGlzLmZsdXNoKCksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9Yi5iYXNlVGV4dHVyZSk7dmFyIGM9Yi5fdXZzO2lmKGMpe3ZhciBkLGUsZixnLGg9YS53b3JsZEFscGhhLGk9YS50aW50LGo9dGhpcy52ZXJ0aWNlcyxrPWEuYW5jaG9yLngsbD1hLmFuY2hvci55O2lmKGIudHJpbSl7dmFyIG09Yi50cmltO2U9bS54LWsqbS53aWR0aCxkPWUrYi5jcm9wLndpZHRoLGc9bS55LWwqbS5oZWlnaHQsZj1nK2IuY3JvcC5oZWlnaHR9ZWxzZSBkPWIuZnJhbWUud2lkdGgqKDEtayksZT1iLmZyYW1lLndpZHRoKi1rLGY9Yi5mcmFtZS5oZWlnaHQqKDEtbCksZz1iLmZyYW1lLmhlaWdodCotbDt2YXIgbj00KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplLG89YS53b3JsZFRyYW5zZm9ybSxwPW8uYSxxPW8uYyxyPW8uYixzPW8uZCx0PW8udHgsdT1vLnR5O2pbbisrXT1wKmUrcipnK3QsaltuKytdPXMqZytxKmUrdSxqW24rK109Yy54MCxqW24rK109Yy55MCxqW24rK109aCxqW24rK109aSxqW24rK109cCpkK3IqZyt0LGpbbisrXT1zKmcrcSpkK3UsaltuKytdPWMueDEsaltuKytdPWMueTEsaltuKytdPWgsaltuKytdPWksaltuKytdPXAqZCtyKmYrdCxqW24rK109cypmK3EqZCt1LGpbbisrXT1jLngyLGpbbisrXT1jLnkyLGpbbisrXT1oLGpbbisrXT1pLGpbbisrXT1wKmUrcipmK3QsaltuKytdPXMqZitxKmUrdSxqW24rK109Yy54MyxqW24rK109Yy55MyxqW24rK109aCxqW24rK109aSx0aGlzLnRleHR1cmVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09YS50ZXh0dXJlLmJhc2VUZXh0dXJlLHRoaXMuYmxlbmRNb2Rlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWEuYmxlbmRNb2RlLHRoaXMuY3VycmVudEJhdGNoU2l6ZSsrfX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXJUaWxpbmdTcHJpdGU9ZnVuY3Rpb24oYSl7dmFyIGM9YS50aWxpbmdUZXh0dXJlO3RoaXMuY3VycmVudEJhdGNoU2l6ZT49dGhpcy5zaXplJiYodGhpcy5mbHVzaCgpLHRoaXMuY3VycmVudEJhc2VUZXh0dXJlPWMuYmFzZVRleHR1cmUpLGEuX3V2c3x8KGEuX3V2cz1uZXcgYi5UZXh0dXJlVXZzKTt2YXIgZD1hLl91dnM7YS50aWxlUG9zaXRpb24ueCU9Yy5iYXNlVGV4dHVyZS53aWR0aCphLnRpbGVTY2FsZU9mZnNldC54LGEudGlsZVBvc2l0aW9uLnklPWMuYmFzZVRleHR1cmUuaGVpZ2h0KmEudGlsZVNjYWxlT2Zmc2V0Lnk7dmFyIGU9YS50aWxlUG9zaXRpb24ueC8oYy5iYXNlVGV4dHVyZS53aWR0aCphLnRpbGVTY2FsZU9mZnNldC54KSxmPWEudGlsZVBvc2l0aW9uLnkvKGMuYmFzZVRleHR1cmUuaGVpZ2h0KmEudGlsZVNjYWxlT2Zmc2V0LnkpLGc9YS53aWR0aC9jLmJhc2VUZXh0dXJlLndpZHRoLyhhLnRpbGVTY2FsZS54KmEudGlsZVNjYWxlT2Zmc2V0LngpLGg9YS5oZWlnaHQvYy5iYXNlVGV4dHVyZS5oZWlnaHQvKGEudGlsZVNjYWxlLnkqYS50aWxlU2NhbGVPZmZzZXQueSk7ZC54MD0wLWUsZC55MD0wLWYsZC54MT0xKmctZSxkLnkxPTAtZixkLngyPTEqZy1lLGQueTI9MSpoLWYsZC54Mz0wLWUsZC55Mz0xKmgtZjt2YXIgaT1hLndvcmxkQWxwaGEsaj1hLnRpbnQsaz10aGlzLnZlcnRpY2VzLGw9YS53aWR0aCxtPWEuaGVpZ2h0LG49YS5hbmNob3IueCxvPWEuYW5jaG9yLnkscD1sKigxLW4pLHE9bCotbixyPW0qKDEtbykscz1tKi1vLHQ9NCp0aGlzLmN1cnJlbnRCYXRjaFNpemUqdGhpcy52ZXJ0U2l6ZSx1PWEud29ybGRUcmFuc2Zvcm0sdj11LmEsdz11LmMseD11LmIseT11LmQsej11LnR4LEE9dS50eTtrW3QrK109dipxK3gqcyt6LGtbdCsrXT15KnMrdypxK0Esa1t0KytdPWQueDAsa1t0KytdPWQueTAsa1t0KytdPWksa1t0KytdPWosa1t0KytdPXYqcCt4KnMreixrW3QrK109eSpzK3cqcCtBLGtbdCsrXT1kLngxLGtbdCsrXT1kLnkxLGtbdCsrXT1pLGtbdCsrXT1qLGtbdCsrXT12KnAreCpyK3osa1t0KytdPXkqcit3KnArQSxrW3QrK109ZC54MixrW3QrK109ZC55MixrW3QrK109aSxrW3QrK109aixrW3QrK109dipxK3gqcit6LGtbdCsrXT15KnIrdypxK0Esa1t0KytdPWQueDMsa1t0KytdPWQueTMsa1t0KytdPWksa1t0KytdPWosdGhpcy50ZXh0dXJlc1t0aGlzLmN1cnJlbnRCYXRjaFNpemVdPWMuYmFzZVRleHR1cmUsdGhpcy5ibGVuZE1vZGVzW3RoaXMuY3VycmVudEJhdGNoU2l6ZV09YS5ibGVuZE1vZGUsdGhpcy5jdXJyZW50QmF0Y2hTaXplKyt9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZmx1c2g9ZnVuY3Rpb24oKXtpZigwIT09dGhpcy5jdXJyZW50QmF0Y2hTaXplKXt2YXIgYT10aGlzLmdsO2lmKHRoaXMucmVuZGVyU2Vzc2lvbi5zaGFkZXJNYW5hZ2VyLnNldFNoYWRlcih0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5kZWZhdWx0U2hhZGVyKSx0aGlzLmRpcnR5KXt0aGlzLmRpcnR5PSExLGEuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGEuYmluZEJ1ZmZlcihhLkVMRU1FTlRfQVJSQVlfQlVGRkVSLHRoaXMuaW5kZXhCdWZmZXIpO3ZhciBiPXRoaXMucmVuZGVyU2Vzc2lvbi5wcm9qZWN0aW9uO2EudW5pZm9ybTJmKHRoaXMuc2hhZGVyLnByb2plY3Rpb25WZWN0b3IsYi54LGIueSk7dmFyIGM9NCp0aGlzLnZlcnRTaXplO2EudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5hVmVydGV4UG9zaXRpb24sMixhLkZMT0FULCExLGMsMCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFUZXh0dXJlQ29vcmQsMixhLkZMT0FULCExLGMsOCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmNvbG9yQXR0cmlidXRlLDIsYS5GTE9BVCwhMSxjLDE2KX1pZih0aGlzLmN1cnJlbnRCYXRjaFNpemU+LjUqdGhpcy5zaXplKWEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGljZXMpO2Vsc2V7dmFyIGQ9dGhpcy52ZXJ0aWNlcy5zdWJhcnJheSgwLDQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUpO2EuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLGQpfWZvcih2YXIgZSxmLGc9MCxoPTAsaT1udWxsLGo9dGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuY3VycmVudEJsZW5kTW9kZSxrPTAsbD10aGlzLmN1cnJlbnRCYXRjaFNpemU7bD5rO2srKyllPXRoaXMudGV4dHVyZXNba10sZj10aGlzLmJsZW5kTW9kZXNba10sKGkhPT1lfHxqIT09ZikmJih0aGlzLnJlbmRlckJhdGNoKGksZyxoKSxoPWssZz0wLGk9ZSxqPWYsdGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKGopKSxnKys7dGhpcy5yZW5kZXJCYXRjaChpLGcsaCksdGhpcy5jdXJyZW50QmF0Y2hTaXplPTB9fSxiLldlYkdMU3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlckJhdGNoPWZ1bmN0aW9uKGEsYyxkKXtpZigwIT09Yyl7dmFyIGU9dGhpcy5nbDtlLmJpbmRUZXh0dXJlKGUuVEVYVFVSRV8yRCxhLl9nbFRleHR1cmVzW2UuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZShhLGUpKSxhLl9kaXJ0eVtlLmlkXSYmYi51cGRhdGVXZWJHTFRleHR1cmUodGhpcy5jdXJyZW50QmFzZVRleHR1cmUsZSksZS5kcmF3RWxlbWVudHMoZS5UUklBTkdMRVMsNipjLGUuVU5TSUdORURfU0hPUlQsNipkKjIpLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK319LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMuZmx1c2goKX0sYi5XZWJHTFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zdGFydD1mdW5jdGlvbigpe3RoaXMuZGlydHk9ITB9LGIuV2ViR0xTcHJpdGVCYXRjaC5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMudmVydGljZXM9bnVsbCx0aGlzLmluZGljZXM9bnVsbCx0aGlzLmdsLmRlbGV0ZUJ1ZmZlcih0aGlzLnZlcnRleEJ1ZmZlciksdGhpcy5nbC5kZWxldGVCdWZmZXIodGhpcy5pbmRleEJ1ZmZlciksdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9bnVsbCx0aGlzLmdsPW51bGx9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2g9ZnVuY3Rpb24oYSl7dGhpcy52ZXJ0U2l6ZT0xMCx0aGlzLm1heFNpemU9NmUzLHRoaXMuc2l6ZT10aGlzLm1heFNpemU7dmFyIGI9NCp0aGlzLnNpemUqdGhpcy52ZXJ0U2l6ZSxjPTYqdGhpcy5tYXhTaXplO3RoaXMudmVydGljZXM9bmV3IEZsb2F0MzJBcnJheShiKSx0aGlzLmluZGljZXM9bmV3IFVpbnQxNkFycmF5KGMpLHRoaXMudmVydGV4QnVmZmVyPW51bGwsdGhpcy5pbmRleEJ1ZmZlcj1udWxsLHRoaXMubGFzdEluZGV4Q291bnQ9MDtmb3IodmFyIGQ9MCxlPTA7Yz5kO2QrPTYsZSs9NCl0aGlzLmluZGljZXNbZCswXT1lKzAsdGhpcy5pbmRpY2VzW2QrMV09ZSsxLHRoaXMuaW5kaWNlc1tkKzJdPWUrMix0aGlzLmluZGljZXNbZCszXT1lKzAsdGhpcy5pbmRpY2VzW2QrNF09ZSsyLHRoaXMuaW5kaWNlc1tkKzVdPWUrMzt0aGlzLmRyYXdpbmc9ITEsdGhpcy5jdXJyZW50QmF0Y2hTaXplPTAsdGhpcy5jdXJyZW50QmFzZVRleHR1cmU9bnVsbCx0aGlzLmN1cnJlbnRCbGVuZE1vZGU9MCx0aGlzLnJlbmRlclNlc3Npb249bnVsbCx0aGlzLnNoYWRlcj1udWxsLHRoaXMubWF0cml4PW51bGwsdGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5zZXRDb250ZXh0PWZ1bmN0aW9uKGEpe3RoaXMuZ2w9YSx0aGlzLnZlcnRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuaW5kZXhCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGljZXMsYS5TVEFUSUNfRFJBVyksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNlcyxhLkRZTkFNSUNfRFJBVyl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLmJlZ2luPWZ1bmN0aW9uKGEsYil7dGhpcy5yZW5kZXJTZXNzaW9uPWIsdGhpcy5zaGFkZXI9dGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuZmFzdFNoYWRlcix0aGlzLm1hdHJpeD1hLndvcmxkVHJhbnNmb3JtLnRvQXJyYXkoITApLHRoaXMuc3RhcnQoKX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuZW5kPWZ1bmN0aW9uKCl7dGhpcy5mbHVzaCgpfSxiLldlYkdMRmFzdFNwcml0ZUJhdGNoLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7dmFyIGI9YS5jaGlsZHJlbixjPWJbMF07aWYoYy50ZXh0dXJlLl91dnMpe3RoaXMuY3VycmVudEJhc2VUZXh0dXJlPWMudGV4dHVyZS5iYXNlVGV4dHVyZSxjLmJsZW5kTW9kZSE9PXRoaXMucmVuZGVyU2Vzc2lvbi5ibGVuZE1vZGVNYW5hZ2VyLmN1cnJlbnRCbGVuZE1vZGUmJih0aGlzLmZsdXNoKCksdGhpcy5yZW5kZXJTZXNzaW9uLmJsZW5kTW9kZU1hbmFnZXIuc2V0QmxlbmRNb2RlKGMuYmxlbmRNb2RlKSk7Zm9yKHZhciBkPTAsZT1iLmxlbmd0aDtlPmQ7ZCsrKXRoaXMucmVuZGVyU3ByaXRlKGJbZF0pO3RoaXMuZmx1c2goKX19LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnJlbmRlclNwcml0ZT1mdW5jdGlvbihhKXtpZihhLnZpc2libGUmJihhLnRleHR1cmUuYmFzZVRleHR1cmU9PT10aGlzLmN1cnJlbnRCYXNlVGV4dHVyZXx8KHRoaXMuZmx1c2goKSx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZT1hLnRleHR1cmUuYmFzZVRleHR1cmUsYS50ZXh0dXJlLl91dnMpKSl7dmFyIGIsYyxkLGUsZixnLGgsaSxqPXRoaXMudmVydGljZXM7aWYoYj1hLnRleHR1cmUuX3V2cyxjPWEudGV4dHVyZS5mcmFtZS53aWR0aCxkPWEudGV4dHVyZS5mcmFtZS5oZWlnaHQsYS50ZXh0dXJlLnRyaW0pe3ZhciBrPWEudGV4dHVyZS50cmltO2Y9ay54LWEuYW5jaG9yLngqay53aWR0aCxlPWYrYS50ZXh0dXJlLmNyb3Aud2lkdGgsaD1rLnktYS5hbmNob3IueSprLmhlaWdodCxnPWgrYS50ZXh0dXJlLmNyb3AuaGVpZ2h0fWVsc2UgZT1hLnRleHR1cmUuZnJhbWUud2lkdGgqKDEtYS5hbmNob3IueCksZj1hLnRleHR1cmUuZnJhbWUud2lkdGgqLWEuYW5jaG9yLngsZz1hLnRleHR1cmUuZnJhbWUuaGVpZ2h0KigxLWEuYW5jaG9yLnkpLGg9YS50ZXh0dXJlLmZyYW1lLmhlaWdodCotYS5hbmNob3IueTtpPTQqdGhpcy5jdXJyZW50QmF0Y2hTaXplKnRoaXMudmVydFNpemUsaltpKytdPWYsaltpKytdPWgsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MCxqW2krK109Yi55MSxqW2krK109YS5hbHBoYSxqW2krK109ZSxqW2krK109aCxqW2krK109YS5wb3NpdGlvbi54LGpbaSsrXT1hLnBvc2l0aW9uLnksaltpKytdPWEuc2NhbGUueCxqW2krK109YS5zY2FsZS55LGpbaSsrXT1hLnJvdGF0aW9uLGpbaSsrXT1iLngxLGpbaSsrXT1iLnkxLGpbaSsrXT1hLmFscGhhLGpbaSsrXT1lLGpbaSsrXT1nLGpbaSsrXT1hLnBvc2l0aW9uLngsaltpKytdPWEucG9zaXRpb24ueSxqW2krK109YS5zY2FsZS54LGpbaSsrXT1hLnNjYWxlLnksaltpKytdPWEucm90YXRpb24saltpKytdPWIueDIsaltpKytdPWIueTIsaltpKytdPWEuYWxwaGEsaltpKytdPWYsaltpKytdPWcsaltpKytdPWEucG9zaXRpb24ueCxqW2krK109YS5wb3NpdGlvbi55LGpbaSsrXT1hLnNjYWxlLngsaltpKytdPWEuc2NhbGUueSxqW2krK109YS5yb3RhdGlvbixqW2krK109Yi54MyxqW2krK109Yi55MyxqW2krK109YS5hbHBoYSx0aGlzLmN1cnJlbnRCYXRjaFNpemUrKyx0aGlzLmN1cnJlbnRCYXRjaFNpemU+PXRoaXMuc2l6ZSYmdGhpcy5mbHVzaCgpfX0sYi5XZWJHTEZhc3RTcHJpdGVCYXRjaC5wcm90b3R5cGUuZmx1c2g9ZnVuY3Rpb24oKXtpZigwIT09dGhpcy5jdXJyZW50QmF0Y2hTaXplKXt2YXIgYT10aGlzLmdsO2lmKHRoaXMuY3VycmVudEJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2EuaWRdfHxiLmNyZWF0ZVdlYkdMVGV4dHVyZSh0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZSxhKSxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCx0aGlzLmN1cnJlbnRCYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1thLmlkXSksdGhpcy5jdXJyZW50QmF0Y2hTaXplPi41KnRoaXMuc2l6ZSlhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnZlcnRpY2VzKTtlbHNle3ZhciBjPXRoaXMudmVydGljZXMuc3ViYXJyYXkoMCw0KnRoaXMuY3VycmVudEJhdGNoU2l6ZSp0aGlzLnZlcnRTaXplKTthLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCxjKX1hLmRyYXdFbGVtZW50cyhhLlRSSUFOR0xFUyw2KnRoaXMuY3VycmVudEJhdGNoU2l6ZSxhLlVOU0lHTkVEX1NIT1JULDApLHRoaXMuY3VycmVudEJhdGNoU2l6ZT0wLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK319LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0b3A9ZnVuY3Rpb24oKXt0aGlzLmZsdXNoKCl9LGIuV2ViR0xGYXN0U3ByaXRlQmF0Y2gucHJvdG90eXBlLnN0YXJ0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDthLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKTt2YXIgYj10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbjthLnVuaWZvcm0yZih0aGlzLnNoYWRlci5wcm9qZWN0aW9uVmVjdG9yLGIueCxiLnkpLGEudW5pZm9ybU1hdHJpeDNmdih0aGlzLnNoYWRlci51TWF0cml4LCExLHRoaXMubWF0cml4KTt2YXIgYz00KnRoaXMudmVydFNpemU7YS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFWZXJ0ZXhQb3NpdGlvbiwyLGEuRkxPQVQsITEsYywwKSxhLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5zaGFkZXIuYVBvc2l0aW9uQ29vcmQsMixhLkZMT0FULCExLGMsOCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFTY2FsZSwyLGEuRkxPQVQsITEsYywxNiksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFSb3RhdGlvbiwxLGEuRkxPQVQsITEsYywyNCksYS52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMuc2hhZGVyLmFUZXh0dXJlQ29vcmQsMixhLkZMT0FULCExLGMsMjgpLGEudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLnNoYWRlci5jb2xvckF0dHJpYnV0ZSwxLGEuRkxPQVQsITEsYywzNil9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyPWZ1bmN0aW9uKGEsYil7dGhpcy50cmFuc3BhcmVudD1iLHRoaXMuZmlsdGVyU3RhY2s9W10sdGhpcy5vZmZzZXRYPTAsdGhpcy5vZmZzZXRZPTAsdGhpcy5zZXRDb250ZXh0KGEpfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuc2V0Q29udGV4dD1mdW5jdGlvbihhKXt0aGlzLmdsPWEsdGhpcy50ZXh0dXJlUG9vbD1bXSx0aGlzLmluaXRTaGFkZXJCdWZmZXJzKCl9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5iZWdpbj1mdW5jdGlvbihhLGIpe3RoaXMucmVuZGVyU2Vzc2lvbj1hLHRoaXMuZGVmYXVsdFNoYWRlcj1hLnNoYWRlck1hbmFnZXIuZGVmYXVsdFNoYWRlcjt2YXIgYz10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbjt0aGlzLndpZHRoPTIqYy54LHRoaXMuaGVpZ2h0PTIqLWMueSx0aGlzLmJ1ZmZlcj1ifSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUucHVzaEZpbHRlcj1mdW5jdGlvbihhKXt2YXIgYz10aGlzLmdsLGQ9dGhpcy5yZW5kZXJTZXNzaW9uLnByb2plY3Rpb24sZT10aGlzLnJlbmRlclNlc3Npb24ub2Zmc2V0O2EuX2ZpbHRlckFyZWE9YS50YXJnZXQuZmlsdGVyQXJlYXx8YS50YXJnZXQuZ2V0Qm91bmRzKCksdGhpcy5maWx0ZXJTdGFjay5wdXNoKGEpO3ZhciBmPWEuZmlsdGVyUGFzc2VzWzBdO3RoaXMub2Zmc2V0WCs9YS5fZmlsdGVyQXJlYS54LHRoaXMub2Zmc2V0WSs9YS5fZmlsdGVyQXJlYS55O3ZhciBnPXRoaXMudGV4dHVyZVBvb2wucG9wKCk7Zz9nLnJlc2l6ZSh0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KTpnPW5ldyBiLkZpbHRlclRleHR1cmUodGhpcy5nbCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSxjLmJpbmRUZXh0dXJlKGMuVEVYVFVSRV8yRCxnLnRleHR1cmUpO3ZhciBoPWEuX2ZpbHRlckFyZWEsaT1mLnBhZGRpbmc7aC54LT1pLGgueS09aSxoLndpZHRoKz0yKmksaC5oZWlnaHQrPTIqaSxoLng8MCYmKGgueD0wKSxoLndpZHRoPnRoaXMud2lkdGgmJihoLndpZHRoPXRoaXMud2lkdGgpLGgueTwwJiYoaC55PTApLGguaGVpZ2h0PnRoaXMuaGVpZ2h0JiYoaC5oZWlnaHQ9dGhpcy5oZWlnaHQpLGMuYmluZEZyYW1lYnVmZmVyKGMuRlJBTUVCVUZGRVIsZy5mcmFtZUJ1ZmZlciksYy52aWV3cG9ydCgwLDAsaC53aWR0aCxoLmhlaWdodCksZC54PWgud2lkdGgvMixkLnk9LWguaGVpZ2h0LzIsZS54PS1oLngsZS55PS1oLnksdGhpcy5yZW5kZXJTZXNzaW9uLnNoYWRlck1hbmFnZXIuc2V0U2hhZGVyKHRoaXMuZGVmYXVsdFNoYWRlciksYy51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLnByb2plY3Rpb25WZWN0b3IsaC53aWR0aC8yLC1oLmhlaWdodC8yKSxjLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIub2Zmc2V0VmVjdG9yLC1oLngsLWgueSksYy5jb2xvck1hc2soITAsITAsITAsITApLGMuY2xlYXJDb2xvcigwLDAsMCwwKSxjLmNsZWFyKGMuQ09MT1JfQlVGRkVSX0JJVCksYS5fZ2xGaWx0ZXJUZXh0dXJlPWd9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5wb3BGaWx0ZXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdsLGM9dGhpcy5maWx0ZXJTdGFjay5wb3AoKSxkPWMuX2ZpbHRlckFyZWEsZT1jLl9nbEZpbHRlclRleHR1cmUsZj10aGlzLnJlbmRlclNlc3Npb24ucHJvamVjdGlvbixnPXRoaXMucmVuZGVyU2Vzc2lvbi5vZmZzZXQ7aWYoYy5maWx0ZXJQYXNzZXMubGVuZ3RoPjEpe2Eudmlld3BvcnQoMCwwLGQud2lkdGgsZC5oZWlnaHQpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnZlcnRleEJ1ZmZlciksdGhpcy52ZXJ0ZXhBcnJheVswXT0wLHRoaXMudmVydGV4QXJyYXlbMV09ZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVsyXT1kLndpZHRoLHRoaXMudmVydGV4QXJyYXlbM109ZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVs0XT0wLHRoaXMudmVydGV4QXJyYXlbNV09MCx0aGlzLnZlcnRleEFycmF5WzZdPWQud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVs3XT0wLGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGV4QXJyYXkpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSx0aGlzLnV2QXJyYXlbMl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs1XT1kLmhlaWdodC90aGlzLmhlaWdodCx0aGlzLnV2QXJyYXlbNl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs3XT1kLmhlaWdodC90aGlzLmhlaWdodCxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnV2QXJyYXkpO3ZhciBoPWUsaT10aGlzLnRleHR1cmVQb29sLnBvcCgpO2l8fChpPW5ldyBiLkZpbHRlclRleHR1cmUodGhpcy5nbCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSksaS5yZXNpemUodGhpcy53aWR0aCx0aGlzLmhlaWdodCksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUixpLmZyYW1lQnVmZmVyKSxhLmNsZWFyKGEuQ09MT1JfQlVGRkVSX0JJVCksYS5kaXNhYmxlKGEuQkxFTkQpO2Zvcih2YXIgaj0wO2o8Yy5maWx0ZXJQYXNzZXMubGVuZ3RoLTE7aisrKXt2YXIgaz1jLmZpbHRlclBhc3Nlc1tqXTthLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLGkuZnJhbWVCdWZmZXIpLGEuYWN0aXZlVGV4dHVyZShhLlRFWFRVUkUwKSxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCxoLnRleHR1cmUpLHRoaXMuYXBwbHlGaWx0ZXJQYXNzKGssZCxkLndpZHRoLGQuaGVpZ2h0KTt2YXIgbD1oO2g9aSxpPWx9YS5lbmFibGUoYS5CTEVORCksZT1oLHRoaXMudGV4dHVyZVBvb2wucHVzaChpKX12YXIgbT1jLmZpbHRlclBhc3Nlc1tjLmZpbHRlclBhc3Nlcy5sZW5ndGgtMV07dGhpcy5vZmZzZXRYLT1kLngsdGhpcy5vZmZzZXRZLT1kLnk7dmFyIG49dGhpcy53aWR0aCxvPXRoaXMuaGVpZ2h0LHA9MCxxPTAscj10aGlzLmJ1ZmZlcjtpZigwPT09dGhpcy5maWx0ZXJTdGFjay5sZW5ndGgpYS5jb2xvck1hc2soITAsITAsITAsITApO2Vsc2V7dmFyIHM9dGhpcy5maWx0ZXJTdGFja1t0aGlzLmZpbHRlclN0YWNrLmxlbmd0aC0xXTtkPXMuX2ZpbHRlckFyZWEsbj1kLndpZHRoLG89ZC5oZWlnaHQscD1kLngscT1kLnkscj1zLl9nbEZpbHRlclRleHR1cmUuZnJhbWVCdWZmZXJ9Zi54PW4vMixmLnk9LW8vMixnLng9cCxnLnk9cSxkPWMuX2ZpbHRlckFyZWE7dmFyIHQ9ZC54LXAsdT1kLnktcTthLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLHRoaXMudmVydGV4QXJyYXlbMF09dCx0aGlzLnZlcnRleEFycmF5WzFdPXUrZC5oZWlnaHQsdGhpcy52ZXJ0ZXhBcnJheVsyXT10K2Qud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVszXT11K2QuaGVpZ2h0LHRoaXMudmVydGV4QXJyYXlbNF09dCx0aGlzLnZlcnRleEFycmF5WzVdPXUsdGhpcy52ZXJ0ZXhBcnJheVs2XT10K2Qud2lkdGgsdGhpcy52ZXJ0ZXhBcnJheVs3XT11LGEuYnVmZmVyU3ViRGF0YShhLkFSUkFZX0JVRkZFUiwwLHRoaXMudmVydGV4QXJyYXkpLGEuYmluZEJ1ZmZlcihhLkFSUkFZX0JVRkZFUix0aGlzLnV2QnVmZmVyKSx0aGlzLnV2QXJyYXlbMl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs1XT1kLmhlaWdodC90aGlzLmhlaWdodCx0aGlzLnV2QXJyYXlbNl09ZC53aWR0aC90aGlzLndpZHRoLHRoaXMudXZBcnJheVs3XT1kLmhlaWdodC90aGlzLmhlaWdodCxhLmJ1ZmZlclN1YkRhdGEoYS5BUlJBWV9CVUZGRVIsMCx0aGlzLnV2QXJyYXkpLGEudmlld3BvcnQoMCwwLG4sbyksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUixyKSxhLmFjdGl2ZVRleHR1cmUoYS5URVhUVVJFMCksYS5iaW5kVGV4dHVyZShhLlRFWFRVUkVfMkQsZS50ZXh0dXJlKSx0aGlzLmFwcGx5RmlsdGVyUGFzcyhtLGQsbixvKSx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIodGhpcy5kZWZhdWx0U2hhZGVyKSxhLnVuaWZvcm0yZih0aGlzLmRlZmF1bHRTaGFkZXIucHJvamVjdGlvblZlY3RvcixuLzIsLW8vMiksYS51bmlmb3JtMmYodGhpcy5kZWZhdWx0U2hhZGVyLm9mZnNldFZlY3RvciwtcCwtcSksdGhpcy50ZXh0dXJlUG9vbC5wdXNoKGUpLGMuX2dsRmlsdGVyVGV4dHVyZT1udWxsfSxiLldlYkdMRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuYXBwbHlGaWx0ZXJQYXNzPWZ1bmN0aW9uKGEsYyxkLGUpe3ZhciBmPXRoaXMuZ2wsZz1hLnNoYWRlcnNbZi5pZF07Z3x8KGc9bmV3IGIuUGl4aVNoYWRlcihmKSxnLmZyYWdtZW50U3JjPWEuZnJhZ21lbnRTcmMsZy51bmlmb3Jtcz1hLnVuaWZvcm1zLGcuaW5pdCgpLGEuc2hhZGVyc1tmLmlkXT1nKSx0aGlzLnJlbmRlclNlc3Npb24uc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoZyksZi51bmlmb3JtMmYoZy5wcm9qZWN0aW9uVmVjdG9yLGQvMiwtZS8yKSxmLnVuaWZvcm0yZihnLm9mZnNldFZlY3RvciwwLDApLGEudW5pZm9ybXMuZGltZW5zaW9ucyYmKGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVswXT10aGlzLndpZHRoLGEudW5pZm9ybXMuZGltZW5zaW9ucy52YWx1ZVsxXT10aGlzLmhlaWdodCxhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbMl09dGhpcy52ZXJ0ZXhBcnJheVswXSxhLnVuaWZvcm1zLmRpbWVuc2lvbnMudmFsdWVbM109dGhpcy52ZXJ0ZXhBcnJheVs1XSksZy5zeW5jVW5pZm9ybXMoKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhCdWZmZXIpLGYudmVydGV4QXR0cmliUG9pbnRlcihnLmFWZXJ0ZXhQb3NpdGlvbiwyLGYuRkxPQVQsITEsMCwwKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy51dkJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGcuYVRleHR1cmVDb29yZCwyLGYuRkxPQVQsITEsMCwwKSxmLmJpbmRCdWZmZXIoZi5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvckJ1ZmZlciksZi52ZXJ0ZXhBdHRyaWJQb2ludGVyKGcuY29sb3JBdHRyaWJ1dGUsMixmLkZMT0FULCExLDAsMCksZi5iaW5kQnVmZmVyKGYuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRleEJ1ZmZlciksZi5kcmF3RWxlbWVudHMoZi5UUklBTkdMRVMsNixmLlVOU0lHTkVEX1NIT1JULDApLHRoaXMucmVuZGVyU2Vzc2lvbi5kcmF3Q291bnQrK30sYi5XZWJHTEZpbHRlck1hbmFnZXIucHJvdG90eXBlLmluaXRTaGFkZXJCdWZmZXJzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDt0aGlzLnZlcnRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMudXZCdWZmZXI9YS5jcmVhdGVCdWZmZXIoKSx0aGlzLmNvbG9yQnVmZmVyPWEuY3JlYXRlQnVmZmVyKCksdGhpcy5pbmRleEJ1ZmZlcj1hLmNyZWF0ZUJ1ZmZlcigpLHRoaXMudmVydGV4QXJyYXk9bmV3IEZsb2F0MzJBcnJheShbMCwwLDEsMCwwLDEsMSwxXSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudmVydGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0ZXhBcnJheSxhLlNUQVRJQ19EUkFXKSx0aGlzLnV2QXJyYXk9bmV3IEZsb2F0MzJBcnJheShbMCwwLDEsMCwwLDEsMSwxXSksYS5iaW5kQnVmZmVyKGEuQVJSQVlfQlVGRkVSLHRoaXMudXZCdWZmZXIpLGEuYnVmZmVyRGF0YShhLkFSUkFZX0JVRkZFUix0aGlzLnV2QXJyYXksYS5TVEFUSUNfRFJBVyksdGhpcy5jb2xvckFycmF5PW5ldyBGbG9hdDMyQXJyYXkoWzEsMTY3NzcyMTUsMSwxNjc3NzIxNSwxLDE2Nzc3MjE1LDEsMTY3NzcyMTVdKSxhLmJpbmRCdWZmZXIoYS5BUlJBWV9CVUZGRVIsdGhpcy5jb2xvckJ1ZmZlciksYS5idWZmZXJEYXRhKGEuQVJSQVlfQlVGRkVSLHRoaXMuY29sb3JBcnJheSxhLlNUQVRJQ19EUkFXKSxhLmJpbmRCdWZmZXIoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLmluZGV4QnVmZmVyKSxhLmJ1ZmZlckRhdGEoYS5FTEVNRU5UX0FSUkFZX0JVRkZFUixuZXcgVWludDE2QXJyYXkoWzAsMSwyLDEsMywyXSksYS5TVEFUSUNfRFJBVyl9LGIuV2ViR0xGaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDt0aGlzLmZpbHRlclN0YWNrPW51bGwsdGhpcy5vZmZzZXRYPTAsdGhpcy5vZmZzZXRZPTA7Zm9yKHZhciBiPTA7Yjx0aGlzLnRleHR1cmVQb29sLmxlbmd0aDtiKyspdGhpcy50ZXh0dXJlUG9vbFtiXS5kZXN0cm95KCk7dGhpcy50ZXh0dXJlUG9vbD1udWxsLGEuZGVsZXRlQnVmZmVyKHRoaXMudmVydGV4QnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLnV2QnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLmNvbG9yQnVmZmVyKSxhLmRlbGV0ZUJ1ZmZlcih0aGlzLmluZGV4QnVmZmVyKX0sYi5GaWx0ZXJUZXh0dXJlPWZ1bmN0aW9uKGEsYyxkLGUpe3RoaXMuZ2w9YSx0aGlzLmZyYW1lQnVmZmVyPWEuY3JlYXRlRnJhbWVidWZmZXIoKSx0aGlzLnRleHR1cmU9YS5jcmVhdGVUZXh0dXJlKCksZT1lfHxiLnNjYWxlTW9kZXMuREVGQVVMVCxhLmJpbmRUZXh0dXJlKGEuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUpLGEudGV4UGFyYW1ldGVyaShhLlRFWFRVUkVfMkQsYS5URVhUVVJFX01BR19GSUxURVIsZT09PWIuc2NhbGVNb2Rlcy5MSU5FQVI/YS5MSU5FQVI6YS5ORUFSRVNUKSxhLnRleFBhcmFtZXRlcmkoYS5URVhUVVJFXzJELGEuVEVYVFVSRV9NSU5fRklMVEVSLGU9PT1iLnNjYWxlTW9kZXMuTElORUFSP2EuTElORUFSOmEuTkVBUkVTVCksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfV1JBUF9TLGEuQ0xBTVBfVE9fRURHRSksYS50ZXhQYXJhbWV0ZXJpKGEuVEVYVFVSRV8yRCxhLlRFWFRVUkVfV1JBUF9ULGEuQ0xBTVBfVE9fRURHRSksYS5iaW5kRnJhbWVidWZmZXIoYS5GUkFNRUJVRkZFUix0aGlzLmZyYW1lYnVmZmVyKSxhLmJpbmRGcmFtZWJ1ZmZlcihhLkZSQU1FQlVGRkVSLHRoaXMuZnJhbWVCdWZmZXIpLGEuZnJhbWVidWZmZXJUZXh0dXJlMkQoYS5GUkFNRUJVRkZFUixhLkNPTE9SX0FUVEFDSE1FTlQwLGEuVEVYVFVSRV8yRCx0aGlzLnRleHR1cmUsMCksdGhpcy5yZW5kZXJCdWZmZXI9YS5jcmVhdGVSZW5kZXJidWZmZXIoKSxhLmJpbmRSZW5kZXJidWZmZXIoYS5SRU5ERVJCVUZGRVIsdGhpcy5yZW5kZXJCdWZmZXIpLGEuZnJhbWVidWZmZXJSZW5kZXJidWZmZXIoYS5GUkFNRUJVRkZFUixhLkRFUFRIX1NURU5DSUxfQVRUQUNITUVOVCxhLlJFTkRFUkJVRkZFUix0aGlzLnJlbmRlckJ1ZmZlciksdGhpcy5yZXNpemUoYyxkKX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3ZhciBhPXRoaXMuZ2w7YS5jbGVhckNvbG9yKDAsMCwwLDApLGEuY2xlYXIoYS5DT0xPUl9CVUZGRVJfQklUKX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXtpZih0aGlzLndpZHRoIT09YXx8dGhpcy5oZWlnaHQhPT1iKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yjt2YXIgYz10aGlzLmdsO2MuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZSksYy50ZXhJbWFnZTJEKGMuVEVYVFVSRV8yRCwwLGMuUkdCQSxhLGIsMCxjLlJHQkEsYy5VTlNJR05FRF9CWVRFLG51bGwpLGMuYmluZFJlbmRlcmJ1ZmZlcihjLlJFTkRFUkJVRkZFUix0aGlzLnJlbmRlckJ1ZmZlciksYy5yZW5kZXJidWZmZXJTdG9yYWdlKGMuUkVOREVSQlVGRkVSLGMuREVQVEhfU1RFTkNJTCxhLGIpfX0sYi5GaWx0ZXJUZXh0dXJlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nbDthLmRlbGV0ZUZyYW1lYnVmZmVyKHRoaXMuZnJhbWVCdWZmZXIpLGEuZGVsZXRlVGV4dHVyZSh0aGlzLnRleHR1cmUpLHRoaXMuZnJhbWVCdWZmZXI9bnVsbCx0aGlzLnRleHR1cmU9bnVsbH0sYi5DYW52YXNNYXNrTWFuYWdlcj1mdW5jdGlvbigpe30sYi5DYW52YXNNYXNrTWFuYWdlci5wcm90b3R5cGUucHVzaE1hc2s9ZnVuY3Rpb24oYSxjKXtjLnNhdmUoKTt2YXIgZD1hLmFscGhhLGU9YS53b3JsZFRyYW5zZm9ybTtjLnNldFRyYW5zZm9ybShlLmEsZS5jLGUuYixlLmQsZS50eCxlLnR5KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzTWFzayhhLGMpLGMuY2xpcCgpLGEud29ybGRBbHBoYT1kfSxiLkNhbnZhc01hc2tNYW5hZ2VyLnByb3RvdHlwZS5wb3BNYXNrPWZ1bmN0aW9uKGEpe2EucmVzdG9yZSgpfSxiLkNhbnZhc1RpbnRlcj1mdW5jdGlvbigpe30sYi5DYW52YXNUaW50ZXIuZ2V0VGludGVkVGV4dHVyZT1mdW5jdGlvbihhLGMpe3ZhciBkPWEudGV4dHVyZTtjPWIuQ2FudmFzVGludGVyLnJvdW5kQ29sb3IoYyk7dmFyIGU9XCIjXCIrKFwiMDAwMDBcIisoMHxjKS50b1N0cmluZygxNikpLnN1YnN0cigtNik7aWYoZC50aW50Q2FjaGU9ZC50aW50Q2FjaGV8fHt9LGQudGludENhY2hlW2VdKXJldHVybiBkLnRpbnRDYWNoZVtlXTt2YXIgZj1iLkNhbnZhc1RpbnRlci5jYW52YXN8fGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7aWYoYi5DYW52YXNUaW50ZXIudGludE1ldGhvZChkLGMsZiksYi5DYW52YXNUaW50ZXIuY29udmVydFRpbnRUb0ltYWdlKXt2YXIgZz1uZXcgSW1hZ2U7Zy5zcmM9Zi50b0RhdGFVUkwoKSxkLnRpbnRDYWNoZVtlXT1nfWVsc2UgZC50aW50Q2FjaGVbZV09ZixiLkNhbnZhc1RpbnRlci5jYW52YXM9bnVsbDtyZXR1cm4gZn0sYi5DYW52YXNUaW50ZXIudGludFdpdGhNdWx0aXBseT1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9Yy5nZXRDb250ZXh0KFwiMmRcIiksZT1hLmZyYW1lO2Mud2lkdGg9ZS53aWR0aCxjLmhlaWdodD1lLmhlaWdodCxkLmZpbGxTdHlsZT1cIiNcIisoXCIwMDAwMFwiKygwfGIpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxkLmZpbGxSZWN0KDAsMCxlLndpZHRoLGUuaGVpZ2h0KSxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cIm11bHRpcGx5XCIsZC5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZS54LGUueSxlLndpZHRoLGUuaGVpZ2h0LDAsMCxlLndpZHRoLGUuaGVpZ2h0KSxkLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImRlc3RpbmF0aW9uLWF0b3BcIixkLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxlLngsZS55LGUud2lkdGgsZS5oZWlnaHQsMCwwLGUud2lkdGgsZS5oZWlnaHQpfSxiLkNhbnZhc1RpbnRlci50aW50V2l0aE92ZXJsYXk9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWMuZ2V0Q29udGV4dChcIjJkXCIpLGU9YS5mcmFtZTtjLndpZHRoPWUud2lkdGgsYy5oZWlnaHQ9ZS5oZWlnaHQsZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJjb3B5XCIsZC5maWxsU3R5bGU9XCIjXCIrKFwiMDAwMDBcIisoMHxiKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksZC5maWxsUmVjdCgwLDAsZS53aWR0aCxlLmhlaWdodCksZC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249XCJkZXN0aW5hdGlvbi1hdG9wXCIsZC5kcmF3SW1hZ2UoYS5iYXNlVGV4dHVyZS5zb3VyY2UsZS54LGUueSxlLndpZHRoLGUuaGVpZ2h0LDAsMCxlLndpZHRoLGUuaGVpZ2h0KX0sYi5DYW52YXNUaW50ZXIudGludFdpdGhQZXJQaXhlbD1mdW5jdGlvbihhLGMsZCl7dmFyIGU9ZC5nZXRDb250ZXh0KFwiMmRcIiksZj1hLmZyYW1lO2Qud2lkdGg9Zi53aWR0aCxkLmhlaWdodD1mLmhlaWdodCxlLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1cImNvcHlcIixlLmRyYXdJbWFnZShhLmJhc2VUZXh0dXJlLnNvdXJjZSxmLngsZi55LGYud2lkdGgsZi5oZWlnaHQsMCwwLGYud2lkdGgsZi5oZWlnaHQpO2Zvcih2YXIgZz1iLmhleDJyZ2IoYyksaD1nWzBdLGk9Z1sxXSxqPWdbMl0saz1lLmdldEltYWdlRGF0YSgwLDAsZi53aWR0aCxmLmhlaWdodCksbD1rLmRhdGEsbT0wO208bC5sZW5ndGg7bSs9NClsW20rMF0qPWgsbFttKzFdKj1pLGxbbSsyXSo9ajtlLnB1dEltYWdlRGF0YShrLDAsMCl9LGIuQ2FudmFzVGludGVyLnJvdW5kQ29sb3I9ZnVuY3Rpb24oYSl7dmFyIGM9Yi5DYW52YXNUaW50ZXIuY2FjaGVTdGVwc1BlckNvbG9yQ2hhbm5lbCxkPWIuaGV4MnJnYihhKTtyZXR1cm4gZFswXT1NYXRoLm1pbigyNTUsZFswXS9jKmMpLGRbMV09TWF0aC5taW4oMjU1LGRbMV0vYypjKSxkWzJdPU1hdGgubWluKDI1NSxkWzJdL2MqYyksYi5yZ2IyaGV4KGQpfSxiLkNhbnZhc1RpbnRlci5jYWNoZVN0ZXBzUGVyQ29sb3JDaGFubmVsPTgsYi5DYW52YXNUaW50ZXIuY29udmVydFRpbnRUb0ltYWdlPSExLGIuQ2FudmFzVGludGVyLmNhblVzZU11bHRpcGx5PWIuY2FuVXNlTmV3Q2FudmFzQmxlbmRNb2RlcygpLGIuQ2FudmFzVGludGVyLnRpbnRNZXRob2Q9Yi5DYW52YXNUaW50ZXIuY2FuVXNlTXVsdGlwbHk/Yi5DYW52YXNUaW50ZXIudGludFdpdGhNdWx0aXBseTpiLkNhbnZhc1RpbnRlci50aW50V2l0aFBlclBpeGVsLGIuQ2FudmFzUmVuZGVyZXI9ZnVuY3Rpb24oYSxjLGQsZSl7Yi5kZWZhdWx0UmVuZGVyZXJ8fChiLnNheUhlbGxvKFwiQ2FudmFzXCIpLGIuZGVmYXVsdFJlbmRlcmVyPXRoaXMpLHRoaXMudHlwZT1iLkNBTlZBU19SRU5ERVJFUix0aGlzLmNsZWFyQmVmb3JlUmVuZGVyPSEwLHRoaXMudHJhbnNwYXJlbnQ9ISFlLGIuYmxlbmRNb2Rlc0NhbnZhc3x8KGIuYmxlbmRNb2Rlc0NhbnZhcz1bXSxiLmNhblVzZU5ld0NhbnZhc0JsZW5kTW9kZXMoKT8oYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5OT1JNQUxdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkFERF09XCJsaWdodGVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5NVUxUSVBMWV09XCJtdWx0aXBseVwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0NSRUVOXT1cInNjcmVlblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuT1ZFUkxBWV09XCJvdmVybGF5XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVwiZGFya2VuXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5MSUdIVEVOXT1cImxpZ2h0ZW5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0RPREdFXT1cImNvbG9yLWRvZGdlXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1cImNvbG9yLWJ1cm5cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhBUkRfTElHSFRdPVwiaGFyZC1saWdodFwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU09GVF9MSUdIVF09XCJzb2Z0LWxpZ2h0XCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1cImRpZmZlcmVuY2VcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkVYQ0xVU0lPTl09XCJleGNsdXNpb25cIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhVRV09XCJodWVcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLlNBVFVSQVRJT05dPVwic2F0dXJhdGlvblwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JdPVwiY29sb3JcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxVTUlOT1NJVFldPVwibHVtaW5vc2l0eVwiKTooYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5OT1JNQUxdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkFERF09XCJsaWdodGVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5NVUxUSVBMWV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0NSRUVOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5PVkVSTEFZXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5EQVJLRU5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxJR0hURU5dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkNPTE9SX0RPREdFXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5DT0xPUl9CVVJOXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5IQVJEX0xJR0hUXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5TT0ZUX0xJR0hUXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5ESUZGRVJFTkNFXT1cInNvdXJjZS1vdmVyXCIsYi5ibGVuZE1vZGVzQ2FudmFzW2IuYmxlbmRNb2Rlcy5FWENMVVNJT05dPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkhVRV09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuU0FUVVJBVElPTl09XCJzb3VyY2Utb3ZlclwiLGIuYmxlbmRNb2Rlc0NhbnZhc1tiLmJsZW5kTW9kZXMuQ09MT1JdPVwic291cmNlLW92ZXJcIixiLmJsZW5kTW9kZXNDYW52YXNbYi5ibGVuZE1vZGVzLkxVTUlOT1NJVFldPVwic291cmNlLW92ZXJcIikpLHRoaXMud2lkdGg9YXx8ODAwLHRoaXMuaGVpZ2h0PWN8fDYwMCx0aGlzLnZpZXc9ZHx8ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSx0aGlzLmNvbnRleHQ9dGhpcy52aWV3LmdldENvbnRleHQoXCIyZFwiLHthbHBoYTp0aGlzLnRyYW5zcGFyZW50fSksdGhpcy5yZWZyZXNoPSEwLHRoaXMudmlldy53aWR0aD10aGlzLndpZHRoLHRoaXMudmlldy5oZWlnaHQ9dGhpcy5oZWlnaHQsdGhpcy5jb3VudD0wLHRoaXMubWFza01hbmFnZXI9bmV3IGIuQ2FudmFzTWFza01hbmFnZXIsdGhpcy5yZW5kZXJTZXNzaW9uPXtjb250ZXh0OnRoaXMuY29udGV4dCxtYXNrTWFuYWdlcjp0aGlzLm1hc2tNYW5hZ2VyLHNjYWxlTW9kZTpudWxsLHNtb290aFByb3BlcnR5Om51bGwscm91bmRQaXhlbHM6ITF9LFwiaW1hZ2VTbW9vdGhpbmdFbmFibGVkXCJpbiB0aGlzLmNvbnRleHQ/dGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwiaW1hZ2VTbW9vdGhpbmdFbmFibGVkXCI6XCJ3ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWRcImluIHRoaXMuY29udGV4dD90aGlzLnJlbmRlclNlc3Npb24uc21vb3RoUHJvcGVydHk9XCJ3ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWRcIjpcIm1vekltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0P3RoaXMucmVuZGVyU2Vzc2lvbi5zbW9vdGhQcm9wZXJ0eT1cIm1vekltYWdlU21vb3RoaW5nRW5hYmxlZFwiOlwib0ltYWdlU21vb3RoaW5nRW5hYmxlZFwiaW4gdGhpcy5jb250ZXh0JiYodGhpcy5yZW5kZXJTZXNzaW9uLnNtb290aFByb3BlcnR5PVwib0ltYWdlU21vb3RoaW5nRW5hYmxlZFwiKX0sYi5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5DYW52YXNSZW5kZXJlcixiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXI9ZnVuY3Rpb24oYSl7Yi50ZXh0dXJlc1RvVXBkYXRlLmxlbmd0aD0wLGIudGV4dHVyZXNUb0Rlc3Ryb3kubGVuZ3RoPTAsYS51cGRhdGVUcmFuc2Zvcm0oKSx0aGlzLmNvbnRleHQuc2V0VHJhbnNmb3JtKDEsMCwwLDEsMCwwKSx0aGlzLmNvbnRleHQuZ2xvYmFsQWxwaGE9MSxuYXZpZ2F0b3IuaXNDb2Nvb25KUyYmdGhpcy52aWV3LnNjcmVlbmNhbnZhcyYmKHRoaXMuY29udGV4dC5maWxsU3R5bGU9XCJibGFja1wiLHRoaXMuY29udGV4dC5jbGVhcigpKSwhdGhpcy50cmFuc3BhcmVudCYmdGhpcy5jbGVhckJlZm9yZVJlbmRlcj8odGhpcy5jb250ZXh0LmZpbGxTdHlsZT1hLmJhY2tncm91bmRDb2xvclN0cmluZyx0aGlzLmNvbnRleHQuZmlsbFJlY3QoMCwwLHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpKTp0aGlzLnRyYW5zcGFyZW50JiZ0aGlzLmNsZWFyQmVmb3JlUmVuZGVyJiZ0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSx0aGlzLnJlbmRlckRpc3BsYXlPYmplY3QoYSksYS5pbnRlcmFjdGl2ZSYmKGEuX2ludGVyYWN0aXZlRXZlbnRzQWRkZWR8fChhLl9pbnRlcmFjdGl2ZUV2ZW50c0FkZGVkPSEwLGEuaW50ZXJhY3Rpb25NYW5hZ2VyLnNldFRhcmdldCh0aGlzKSkpLGIuVGV4dHVyZS5mcmFtZVVwZGF0ZXMubGVuZ3RoPjAmJihiLlRleHR1cmUuZnJhbWVVcGRhdGVzLmxlbmd0aD0wKVxufSxiLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yix0aGlzLnZpZXcud2lkdGg9YSx0aGlzLnZpZXcuaGVpZ2h0PWJ9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlckRpc3BsYXlPYmplY3Q9ZnVuY3Rpb24oYSxiKXt0aGlzLnJlbmRlclNlc3Npb24uY29udGV4dD1ifHx0aGlzLmNvbnRleHQsYS5fcmVuZGVyQ2FudmFzKHRoaXMucmVuZGVyU2Vzc2lvbil9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlclN0cmlwRmxhdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzLmNvbnRleHQsYz1hLnZlcnRpY2llcyxkPWMubGVuZ3RoLzI7dGhpcy5jb3VudCsrLGIuYmVnaW5QYXRoKCk7Zm9yKHZhciBlPTE7ZC0yPmU7ZSsrKXt2YXIgZj0yKmUsZz1jW2ZdLGg9Y1tmKzJdLGk9Y1tmKzRdLGo9Y1tmKzFdLGs9Y1tmKzNdLGw9Y1tmKzVdO2IubW92ZVRvKGcsaiksYi5saW5lVG8oaCxrKSxiLmxpbmVUbyhpLGwpfWIuZmlsbFN0eWxlPVwiI0ZGMDAwMFwiLGIuZmlsbCgpLGIuY2xvc2VQYXRoKCl9LGIuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlclN0cmlwPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuY29udGV4dCxjPWEudmVydGljaWVzLGQ9YS51dnMsZT1jLmxlbmd0aC8yO3RoaXMuY291bnQrKztmb3IodmFyIGY9MTtlLTI+ZjtmKyspe3ZhciBnPTIqZixoPWNbZ10saT1jW2crMl0saj1jW2crNF0saz1jW2crMV0sbD1jW2crM10sbT1jW2crNV0sbj1kW2ddKmEudGV4dHVyZS53aWR0aCxvPWRbZysyXSphLnRleHR1cmUud2lkdGgscD1kW2crNF0qYS50ZXh0dXJlLndpZHRoLHE9ZFtnKzFdKmEudGV4dHVyZS5oZWlnaHQscj1kW2crM10qYS50ZXh0dXJlLmhlaWdodCxzPWRbZys1XSphLnRleHR1cmUuaGVpZ2h0O2Iuc2F2ZSgpLGIuYmVnaW5QYXRoKCksYi5tb3ZlVG8oaCxrKSxiLmxpbmVUbyhpLGwpLGIubGluZVRvKGosbSksYi5jbG9zZVBhdGgoKSxiLmNsaXAoKTt2YXIgdD1uKnIrcSpwK28qcy1yKnAtcSpvLW4qcyx1PWgqcitxKmoraSpzLXIqai1xKmktaCpzLHY9bippK2gqcCtvKmotaSpwLWgqby1uKmosdz1uKnIqaitxKmkqcCtoKm8qcy1oKnIqcC1xKm8qai1uKmkqcyx4PWsqcitxKm0rbCpzLXIqbS1xKmwtaypzLHk9bipsK2sqcCtvKm0tbCpwLWsqby1uKm0sej1uKnIqbStxKmwqcCtrKm8qcy1rKnIqcC1xKm8qbS1uKmwqcztiLnRyYW5zZm9ybSh1L3QseC90LHYvdCx5L3Qsdy90LHovdCksYi5kcmF3SW1hZ2UoYS50ZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZSwwLDApLGIucmVzdG9yZSgpfX0sYi5DYW52YXNCdWZmZXI9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPWEsdGhpcy5oZWlnaHQ9Yix0aGlzLmNhbnZhcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLHRoaXMuY29udGV4dD10aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIiksdGhpcy5jYW52YXMud2lkdGg9YSx0aGlzLmNhbnZhcy5oZWlnaHQ9Yn0sYi5DYW52YXNCdWZmZXIucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCl9LGIuQ2FudmFzQnVmZmVyLnByb3RvdHlwZS5yZXNpemU9ZnVuY3Rpb24oYSxiKXt0aGlzLndpZHRoPXRoaXMuY2FudmFzLndpZHRoPWEsdGhpcy5oZWlnaHQ9dGhpcy5jYW52YXMuaGVpZ2h0PWJ9LGIuQ2FudmFzR3JhcGhpY3M9ZnVuY3Rpb24oKXt9LGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3M9ZnVuY3Rpb24oYSxjKXtmb3IodmFyIGQ9YS53b3JsZEFscGhhLGU9XCJcIixmPTA7ZjxhLmdyYXBoaWNzRGF0YS5sZW5ndGg7ZisrKXt2YXIgZz1hLmdyYXBoaWNzRGF0YVtmXSxoPWcucG9pbnRzO2lmKGMuc3Ryb2tlU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcubGluZUNvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5saW5lV2lkdGg9Zy5saW5lV2lkdGgsZy50eXBlPT09Yi5HcmFwaGljcy5QT0xZKXtjLmJlZ2luUGF0aCgpLGMubW92ZVRvKGhbMF0saFsxXSk7Zm9yKHZhciBpPTE7aTxoLmxlbmd0aC8yO2krKyljLmxpbmVUbyhoWzIqaV0saFsyKmkrMV0pO2hbMF09PT1oW2gubGVuZ3RoLTJdJiZoWzFdPT09aFtoLmxlbmd0aC0xXSYmYy5jbG9zZVBhdGgoKSxnLmZpbGwmJihjLmdsb2JhbEFscGhhPWcuZmlsbEFscGhhKmQsYy5maWxsU3R5bGU9ZT1cIiNcIisoXCIwMDAwMFwiKygwfGcuZmlsbENvbG9yKS50b1N0cmluZygxNikpLnN1YnN0cigtNiksYy5maWxsKCkpLGcubGluZVdpZHRoJiYoYy5nbG9iYWxBbHBoYT1nLmxpbmVBbHBoYSpkLGMuc3Ryb2tlKCkpfWVsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5SRUNUKShnLmZpbGxDb2xvcnx8MD09PWcuZmlsbENvbG9yKSYmKGMuZ2xvYmFsQWxwaGE9Zy5maWxsQWxwaGEqZCxjLmZpbGxTdHlsZT1lPVwiI1wiKyhcIjAwMDAwXCIrKDB8Zy5maWxsQ29sb3IpLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC02KSxjLmZpbGxSZWN0KGhbMF0saFsxXSxoWzJdLGhbM10pKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZVJlY3QoaFswXSxoWzFdLGhbMl0saFszXSkpO2Vsc2UgaWYoZy50eXBlPT09Yi5HcmFwaGljcy5DSVJDKWMuYmVnaW5QYXRoKCksYy5hcmMoaFswXSxoWzFdLGhbMl0sMCwyKk1hdGguUEkpLGMuY2xvc2VQYXRoKCksZy5maWxsJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKTtlbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuRUxJUCl7dmFyIGo9Zy5wb2ludHMsaz0yKmpbMl0sbD0yKmpbM10sbT1qWzBdLWsvMixuPWpbMV0tbC8yO2MuYmVnaW5QYXRoKCk7dmFyIG89LjU1MjI4NDgscD1rLzIqbyxxPWwvMipvLHI9bStrLHM9bitsLHQ9bStrLzIsdT1uK2wvMjtjLm1vdmVUbyhtLHUpLGMuYmV6aWVyQ3VydmVUbyhtLHUtcSx0LXAsbix0LG4pLGMuYmV6aWVyQ3VydmVUbyh0K3AsbixyLHUtcSxyLHUpLGMuYmV6aWVyQ3VydmVUbyhyLHUrcSx0K3Ascyx0LHMpLGMuYmV6aWVyQ3VydmVUbyh0LXAscyxtLHUrcSxtLHUpLGMuY2xvc2VQYXRoKCksZy5maWxsJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKX1lbHNlIGlmKGcudHlwZT09PWIuR3JhcGhpY3MuUlJFQyl7dmFyIHY9aFswXSx3PWhbMV0seD1oWzJdLHk9aFszXSx6PWhbNF0sQT1NYXRoLm1pbih4LHkpLzJ8MDt6PXo+QT9BOnosYy5iZWdpblBhdGgoKSxjLm1vdmVUbyh2LHcreiksYy5saW5lVG8odix3K3kteiksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYsdyt5LHYreix3K3kpLGMubGluZVRvKHYreC16LHcreSksYy5xdWFkcmF0aWNDdXJ2ZVRvKHYreCx3K3ksdit4LHcreS16KSxjLmxpbmVUbyh2K3gsdyt6KSxjLnF1YWRyYXRpY0N1cnZlVG8odit4LHcsdit4LXosdyksYy5saW5lVG8odit6LHcpLGMucXVhZHJhdGljQ3VydmVUbyh2LHcsdix3K3opLGMuY2xvc2VQYXRoKCksKGcuZmlsbENvbG9yfHwwPT09Zy5maWxsQ29sb3IpJiYoYy5nbG9iYWxBbHBoYT1nLmZpbGxBbHBoYSpkLGMuZmlsbFN0eWxlPWU9XCIjXCIrKFwiMDAwMDBcIisoMHxnLmZpbGxDb2xvcikudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpLGMuZmlsbCgpKSxnLmxpbmVXaWR0aCYmKGMuZ2xvYmFsQWxwaGE9Zy5saW5lQWxwaGEqZCxjLnN0cm9rZSgpKX19fSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzTWFzaz1mdW5jdGlvbihhLGMpe3ZhciBkPWEuZ3JhcGhpY3NEYXRhLmxlbmd0aDtpZigwIT09ZCl7ZD4xJiYoZD0xLHdpbmRvdy5jb25zb2xlLmxvZyhcIlBpeGkuanMgd2FybmluZzogbWFza3MgaW4gY2FudmFzIGNhbiBvbmx5IG1hc2sgdXNpbmcgdGhlIGZpcnN0IHBhdGggaW4gdGhlIGdyYXBoaWNzIG9iamVjdFwiKSk7Zm9yKHZhciBlPTA7MT5lO2UrKyl7dmFyIGY9YS5ncmFwaGljc0RhdGFbZV0sZz1mLnBvaW50cztpZihmLnR5cGU9PT1iLkdyYXBoaWNzLlBPTFkpe2MuYmVnaW5QYXRoKCksYy5tb3ZlVG8oZ1swXSxnWzFdKTtmb3IodmFyIGg9MTtoPGcubGVuZ3RoLzI7aCsrKWMubGluZVRvKGdbMipoXSxnWzIqaCsxXSk7Z1swXT09PWdbZy5sZW5ndGgtMl0mJmdbMV09PT1nW2cubGVuZ3RoLTFdJiZjLmNsb3NlUGF0aCgpfWVsc2UgaWYoZi50eXBlPT09Yi5HcmFwaGljcy5SRUNUKWMuYmVnaW5QYXRoKCksYy5yZWN0KGdbMF0sZ1sxXSxnWzJdLGdbM10pLGMuY2xvc2VQYXRoKCk7ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLkNJUkMpYy5iZWdpblBhdGgoKSxjLmFyYyhnWzBdLGdbMV0sZ1syXSwwLDIqTWF0aC5QSSksYy5jbG9zZVBhdGgoKTtlbHNlIGlmKGYudHlwZT09PWIuR3JhcGhpY3MuRUxJUCl7dmFyIGk9Zi5wb2ludHMsaj0yKmlbMl0saz0yKmlbM10sbD1pWzBdLWovMixtPWlbMV0tay8yO2MuYmVnaW5QYXRoKCk7dmFyIG49LjU1MjI4NDgsbz1qLzIqbixwPWsvMipuLHE9bCtqLHI9bStrLHM9bCtqLzIsdD1tK2svMjtjLm1vdmVUbyhsLHQpLGMuYmV6aWVyQ3VydmVUbyhsLHQtcCxzLW8sbSxzLG0pLGMuYmV6aWVyQ3VydmVUbyhzK28sbSxxLHQtcCxxLHQpLGMuYmV6aWVyQ3VydmVUbyhxLHQrcCxzK28scixzLHIpLGMuYmV6aWVyQ3VydmVUbyhzLW8scixsLHQrcCxsLHQpLGMuY2xvc2VQYXRoKCl9ZWxzZSBpZihmLnR5cGU9PT1iLkdyYXBoaWNzLlJSRUMpe3ZhciB1PWdbMF0sdj1nWzFdLHc9Z1syXSx4PWdbM10seT1nWzRdLHo9TWF0aC5taW4odyx4KS8yfDA7eT15Pno/ejp5LGMuYmVnaW5QYXRoKCksYy5tb3ZlVG8odSx2K3kpLGMubGluZVRvKHUsdit4LXkpLGMucXVhZHJhdGljQ3VydmVUbyh1LHYreCx1K3ksdit4KSxjLmxpbmVUbyh1K3cteSx2K3gpLGMucXVhZHJhdGljQ3VydmVUbyh1K3csdit4LHUrdyx2K3gteSksYy5saW5lVG8odSt3LHYreSksYy5xdWFkcmF0aWNDdXJ2ZVRvKHUrdyx2LHUrdy15LHYpLGMubGluZVRvKHUreSx2KSxjLnF1YWRyYXRpY0N1cnZlVG8odSx2LHUsdit5KSxjLmNsb3NlUGF0aCgpfX19fSxiLkdyYXBoaWNzPWZ1bmN0aW9uKCl7Yi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5yZW5kZXJhYmxlPSEwLHRoaXMuZmlsbEFscGhhPTEsdGhpcy5saW5lV2lkdGg9MCx0aGlzLmxpbmVDb2xvcj1cImJsYWNrXCIsdGhpcy5ncmFwaGljc0RhdGE9W10sdGhpcy50aW50PTE2Nzc3MjE1LHRoaXMuYmxlbmRNb2RlPWIuYmxlbmRNb2Rlcy5OT1JNQUwsdGhpcy5jdXJyZW50UGF0aD17cG9pbnRzOltdfSx0aGlzLl93ZWJHTD1bXSx0aGlzLmlzTWFzaz0hMSx0aGlzLmJvdW5kcz1udWxsLHRoaXMuYm91bmRzUGFkZGluZz0xMCx0aGlzLmRpcnR5PSEwfSxiLkdyYXBoaWNzLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUpLGIuR3JhcGhpY3MucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuR3JhcGhpY3MsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuR3JhcGhpY3MucHJvdG90eXBlLFwiY2FjaGVBc0JpdG1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY2FjaGVBc0JpdG1hcH0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuX2NhY2hlQXNCaXRtYXA9YSx0aGlzLl9jYWNoZUFzQml0bWFwP3RoaXMuX2dlbmVyYXRlQ2FjaGVkU3ByaXRlKCk6KHRoaXMuZGVzdHJveUNhY2hlZFNwcml0ZSgpLHRoaXMuZGlydHk9ITApfX0pLGIuR3JhcGhpY3MucHJvdG90eXBlLmxpbmVTdHlsZT1mdW5jdGlvbihhLGMsZCl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5saW5lV2lkdGg9YXx8MCx0aGlzLmxpbmVDb2xvcj1jfHwwLHRoaXMubGluZUFscGhhPWFyZ3VtZW50cy5sZW5ndGg8Mz8xOmQsdGhpcy5jdXJyZW50UGF0aD17bGluZVdpZHRoOnRoaXMubGluZVdpZHRoLGxpbmVDb2xvcjp0aGlzLmxpbmVDb2xvcixsaW5lQWxwaGE6dGhpcy5saW5lQWxwaGEsZmlsbENvbG9yOnRoaXMuZmlsbENvbG9yLGZpbGxBbHBoYTp0aGlzLmZpbGxBbHBoYSxmaWxsOnRoaXMuZmlsbGluZyxwb2ludHM6W10sdHlwZTpiLkdyYXBoaWNzLlBPTFl9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUubW92ZVRvPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aHx8dGhpcy5ncmFwaGljc0RhdGEucG9wKCksdGhpcy5jdXJyZW50UGF0aD10aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbXSx0eXBlOmIuR3JhcGhpY3MuUE9MWX0sdGhpcy5jdXJyZW50UGF0aC5wb2ludHMucHVzaChhLGMpLHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUubGluZVRvPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuY3VycmVudFBhdGgucG9pbnRzLnB1c2goYSxiKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLnF1YWRyYXRpY0N1cnZlVG89ZnVuY3Rpb24oYSxiLGMsZCl7MD09PXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aCYmdGhpcy5tb3ZlVG8oMCwwKTt2YXIgZSxmLGc9MjAsaD10aGlzLmN1cnJlbnRQYXRoLnBvaW50czswPT09aC5sZW5ndGgmJnRoaXMubW92ZVRvKDAsMCk7Zm9yKHZhciBpPWhbaC5sZW5ndGgtMl0saj1oW2gubGVuZ3RoLTFdLGs9MCxsPTE7Zz49bDtsKyspaz1sL2csZT1pKyhhLWkpKmssZj1qKyhiLWopKmssaC5wdXNoKGUrKGErKGMtYSkqay1lKSprLGYrKGIrKGQtYikqay1mKSprKTtyZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5iZXppZXJDdXJ2ZVRvPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXswPT09dGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RoJiZ0aGlzLm1vdmVUbygwLDApO2Zvcih2YXIgZyxoLGksaixrLGw9MjAsbT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cyxuPW1bbS5sZW5ndGgtMl0sbz1tW20ubGVuZ3RoLTFdLHA9MCxxPTE7bD5xO3ErKylwPXEvbCxnPTEtcCxoPWcqZyxpPWgqZyxqPXAqcCxrPWoqcCxtLnB1c2goaSpuKzMqaCpwKmErMypnKmoqYytrKmUsaSpvKzMqaCpwKmIrMypnKmoqZCtrKmYpO3JldHVybiB0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmFyY1RvPWZ1bmN0aW9uKGEsYixjLGQsZSl7MD09PXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmxlbmd0aCYmdGhpcy5tb3ZlVG8oYSxiKTt2YXIgZj10aGlzLmN1cnJlbnRQYXRoLnBvaW50cyxnPWZbZi5sZW5ndGgtMl0saD1mW2YubGVuZ3RoLTFdLGk9aC1iLGo9Zy1hLGs9ZC1iLGw9Yy1hLG09TWF0aC5hYnMoaSpsLWoqayk7aWYoMWUtOD5tfHwwPT09ZSlmLnB1c2goYSxiKTtlbHNle3ZhciBuPWkqaStqKmosbz1rKmsrbCpsLHA9aSprK2oqbCxxPWUqTWF0aC5zcXJ0KG4pL20scj1lKk1hdGguc3FydChvKS9tLHM9cSpwL24sdD1yKnAvbyx1PXEqbCtyKmosdj1xKmsrcippLHc9aioocitzKSx4PWkqKHIrcykseT1sKihxK3QpLHo9ayoocSt0KSxBPU1hdGguYXRhbjIoeC12LHctdSksQj1NYXRoLmF0YW4yKHotdix5LXUpO3RoaXMuYXJjKHUrYSx2K2IsZSxBLEIsaiprPmwqaSl9cmV0dXJuIHRoaXMuZGlydHk9ITAsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuYXJjPWZ1bmN0aW9uKGEsYixjLGQsZSxmKXt2YXIgZz1hK01hdGguY29zKGQpKmMsaD1iK01hdGguc2luKGQpKmMsaT10aGlzLmN1cnJlbnRQYXRoLnBvaW50cztpZigoMCE9PWkubGVuZ3RoJiZpW2kubGVuZ3RoLTJdIT09Z3x8aVtpLmxlbmd0aC0xXSE9PWgpJiYodGhpcy5tb3ZlVG8oZyxoKSxpPXRoaXMuY3VycmVudFBhdGgucG9pbnRzKSxkPT09ZSlyZXR1cm4gdGhpczshZiYmZD49ZT9lKz0yKk1hdGguUEk6ZiYmZT49ZCYmKGQrPTIqTWF0aC5QSSk7dmFyIGo9Zj8tMSooZC1lKTplLWQsaz1NYXRoLmFicyhqKS8oMipNYXRoLlBJKSo0MDtpZigwPT09ailyZXR1cm4gdGhpcztmb3IodmFyIGw9ai8oMiprKSxtPTIqbCxuPU1hdGguY29zKGwpLG89TWF0aC5zaW4obCkscD1rLTEscT1wJTEvcCxyPTA7cD49cjtyKyspe3ZhciBzPXIrcSpyLHQ9bCtkK20qcyx1PU1hdGguY29zKHQpLHY9LU1hdGguc2luKHQpO2kucHVzaCgobip1K28qdikqYythLChuKi12K28qdSkqYytiKX1yZXR1cm4gdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3UGF0aD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOltdLHR5cGU6Yi5HcmFwaGljcy5QT0xZfSx0aGlzLmdyYXBoaWNzRGF0YS5wdXNoKHRoaXMuY3VycmVudFBhdGgpLHRoaXMuY3VycmVudFBhdGgucG9pbnRzPXRoaXMuY3VycmVudFBhdGgucG9pbnRzLmNvbmNhdChhKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmJlZ2luRmlsbD1mdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmZpbGxpbmc9ITAsdGhpcy5maWxsQ29sb3I9YXx8MCx0aGlzLmZpbGxBbHBoYT1hcmd1bWVudHMubGVuZ3RoPDI/MTpiLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmVuZEZpbGw9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5maWxsaW5nPSExLHRoaXMuZmlsbENvbG9yPW51bGwsdGhpcy5maWxsQWxwaGE9MSx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3UmVjdD1mdW5jdGlvbihhLGMsZCxlKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZV0sdHlwZTpiLkdyYXBoaWNzLlJFQ1R9LHRoaXMuZ3JhcGhpY3NEYXRhLnB1c2godGhpcy5jdXJyZW50UGF0aCksdGhpcy5kaXJ0eT0hMCx0aGlzfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5kcmF3Um91bmRlZFJlY3Q9ZnVuY3Rpb24oYSxjLGQsZSxmKXtyZXR1cm4gdGhpcy5jdXJyZW50UGF0aC5wb2ludHMubGVuZ3RofHx0aGlzLmdyYXBoaWNzRGF0YS5wb3AoKSx0aGlzLmN1cnJlbnRQYXRoPXtsaW5lV2lkdGg6dGhpcy5saW5lV2lkdGgsbGluZUNvbG9yOnRoaXMubGluZUNvbG9yLGxpbmVBbHBoYTp0aGlzLmxpbmVBbHBoYSxmaWxsQ29sb3I6dGhpcy5maWxsQ29sb3IsZmlsbEFscGhhOnRoaXMuZmlsbEFscGhhLGZpbGw6dGhpcy5maWxsaW5nLHBvaW50czpbYSxjLGQsZSxmXSx0eXBlOmIuR3JhcGhpY3MuUlJFQ30sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdDaXJjbGU9ZnVuY3Rpb24oYSxjLGQpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxkXSx0eXBlOmIuR3JhcGhpY3MuQ0lSQ30sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmRyYXdFbGxpcHNlPWZ1bmN0aW9uKGEsYyxkLGUpe3JldHVybiB0aGlzLmN1cnJlbnRQYXRoLnBvaW50cy5sZW5ndGh8fHRoaXMuZ3JhcGhpY3NEYXRhLnBvcCgpLHRoaXMuY3VycmVudFBhdGg9e2xpbmVXaWR0aDp0aGlzLmxpbmVXaWR0aCxsaW5lQ29sb3I6dGhpcy5saW5lQ29sb3IsbGluZUFscGhhOnRoaXMubGluZUFscGhhLGZpbGxDb2xvcjp0aGlzLmZpbGxDb2xvcixmaWxsQWxwaGE6dGhpcy5maWxsQWxwaGEsZmlsbDp0aGlzLmZpbGxpbmcscG9pbnRzOlthLGMsZCxlXSx0eXBlOmIuR3JhcGhpY3MuRUxJUH0sdGhpcy5ncmFwaGljc0RhdGEucHVzaCh0aGlzLmN1cnJlbnRQYXRoKSx0aGlzLmRpcnR5PSEwLHRoaXN9LGIuR3JhcGhpY3MucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubGluZVdpZHRoPTAsdGhpcy5maWxsaW5nPSExLHRoaXMuZGlydHk9ITAsdGhpcy5jbGVhckRpcnR5PSEwLHRoaXMuZ3JhcGhpY3NEYXRhPVtdLHRoaXMuYm91bmRzPW51bGwsdGhpc30sYi5HcmFwaGljcy5wcm90b3R5cGUuZ2VuZXJhdGVUZXh0dXJlPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5nZXRCb3VuZHMoKSxjPW5ldyBiLkNhbnZhc0J1ZmZlcihhLndpZHRoLGEuaGVpZ2h0KSxkPWIuVGV4dHVyZS5mcm9tQ2FudmFzKGMuY2FudmFzKTtyZXR1cm4gYy5jb250ZXh0LnRyYW5zbGF0ZSgtYS54LC1hLnkpLGIuQ2FudmFzR3JhcGhpY3MucmVuZGVyR3JhcGhpY3ModGhpcyxjLmNvbnRleHQpLGR9LGIuR3JhcGhpY3MucHJvdG90eXBlLl9yZW5kZXJXZWJHTD1mdW5jdGlvbihhKXtpZih0aGlzLnZpc2libGUhPT0hMSYmMCE9PXRoaXMuYWxwaGEmJnRoaXMuaXNNYXNrIT09ITApe2lmKHRoaXMuX2NhY2hlQXNCaXRtYXApcmV0dXJuIHRoaXMuZGlydHkmJih0aGlzLl9nZW5lcmF0ZUNhY2hlZFNwcml0ZSgpLGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLmJhc2VUZXh0dXJlLGEuZ2wpLHRoaXMuZGlydHk9ITEpLHRoaXMuX2NhY2hlZFNwcml0ZS5hbHBoYT10aGlzLmFscGhhLGIuU3ByaXRlLnByb3RvdHlwZS5fcmVuZGVyV2ViR0wuY2FsbCh0aGlzLl9jYWNoZWRTcHJpdGUsYSksdm9pZCAwO2lmKGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEuYmxlbmRNb2RlTWFuYWdlci5zZXRCbGVuZE1vZGUodGhpcy5ibGVuZE1vZGUpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5fbWFzayxhKSx0aGlzLl9maWx0ZXJzJiZhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jayksdGhpcy5ibGVuZE1vZGUhPT1hLnNwcml0ZUJhdGNoLmN1cnJlbnRCbGVuZE1vZGUpe2Euc3ByaXRlQmF0Y2guY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZTt2YXIgYz1iLmJsZW5kTW9kZXNXZWJHTFthLnNwcml0ZUJhdGNoLmN1cnJlbnRCbGVuZE1vZGVdO2Euc3ByaXRlQmF0Y2guZ2wuYmxlbmRGdW5jKGNbMF0sY1sxXSl9aWYoYi5XZWJHTEdyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsYSksdGhpcy5jaGlsZHJlbi5sZW5ndGgpe2Euc3ByaXRlQmF0Y2guc3RhcnQoKTtmb3IodmFyIGQ9MCxlPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2U+ZDtkKyspdGhpcy5jaGlsZHJlbltkXS5fcmVuZGVyV2ViR0woYSk7YS5zcHJpdGVCYXRjaC5zdG9wKCl9dGhpcy5fZmlsdGVycyYmYS5maWx0ZXJNYW5hZ2VyLnBvcEZpbHRlcigpLHRoaXMuX21hc2smJmEubWFza01hbmFnZXIucG9wTWFzayh0aGlzLm1hc2ssYSksYS5kcmF3Q291bnQrKyxhLnNwcml0ZUJhdGNoLnN0YXJ0KCl9fSxiLkdyYXBoaWNzLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSYmdGhpcy5pc01hc2shPT0hMCl7dmFyIGM9YS5jb250ZXh0LGQ9dGhpcy53b3JsZFRyYW5zZm9ybTt0aGlzLmJsZW5kTW9kZSE9PWEuY3VycmVudEJsZW5kTW9kZSYmKGEuY3VycmVudEJsZW5kTW9kZT10aGlzLmJsZW5kTW9kZSxjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj1iLmJsZW5kTW9kZXNDYW52YXNbYS5jdXJyZW50QmxlbmRNb2RlXSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGEuY29udGV4dCksYy5zZXRUcmFuc2Zvcm0oZC5hLGQuYyxkLmIsZC5kLGQudHgsZC50eSksYi5DYW52YXNHcmFwaGljcy5yZW5kZXJHcmFwaGljcyh0aGlzLGMpO2Zvcih2YXIgZT0wLGY9dGhpcy5jaGlsZHJlbi5sZW5ndGg7Zj5lO2UrKyl0aGlzLmNoaWxkcmVuW2VdLl9yZW5kZXJDYW52YXMoYSk7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCl9fSxiLkdyYXBoaWNzLnByb3RvdHlwZS5nZXRCb3VuZHM9ZnVuY3Rpb24oYSl7dGhpcy5ib3VuZHN8fHRoaXMudXBkYXRlQm91bmRzKCk7dmFyIGI9dGhpcy5ib3VuZHMueCxjPXRoaXMuYm91bmRzLndpZHRoK3RoaXMuYm91bmRzLngsZD10aGlzLmJvdW5kcy55LGU9dGhpcy5ib3VuZHMuaGVpZ2h0K3RoaXMuYm91bmRzLnksZj1hfHx0aGlzLndvcmxkVHJhbnNmb3JtLGc9Zi5hLGg9Zi5jLGk9Zi5iLGo9Zi5kLGs9Zi50eCxsPWYudHksbT1nKmMraSplK2ssbj1qKmUraCpjK2wsbz1nKmIraSplK2sscD1qKmUraCpiK2wscT1nKmIraSpkK2sscj1qKmQraCpiK2wscz1nKmMraSpkK2ssdD1qKmQraCpjK2wsdT1tLHY9bix3PW0seD1uO3c9dz5vP286dyx3PXc+cT9xOncsdz13PnM/czp3LHg9eD5wP3A6eCx4PXg+cj9yOngseD14PnQ/dDp4LHU9bz51P286dSx1PXE+dT9xOnUsdT1zPnU/czp1LHY9cD52P3A6dix2PXI+dj9yOnYsdj10PnY/dDp2O3ZhciB5PXRoaXMuX2JvdW5kcztyZXR1cm4geS54PXcseS53aWR0aD11LXcseS55PXgseS5oZWlnaHQ9di14LHl9LGIuR3JhcGhpY3MucHJvdG90eXBlLnVwZGF0ZUJvdW5kcz1mdW5jdGlvbigpe2Zvcih2YXIgYSxjLGQsZSxmLGc9MS8wLGg9LTEvMCxpPTEvMCxqPS0xLzAsaz0wO2s8dGhpcy5ncmFwaGljc0RhdGEubGVuZ3RoO2srKyl7dmFyIGw9dGhpcy5ncmFwaGljc0RhdGFba10sbT1sLnR5cGUsbj1sLmxpbmVXaWR0aDtpZihhPWwucG9pbnRzLG09PT1iLkdyYXBoaWNzLlJFQ1QpYz1hWzBdLW4vMixkPWFbMV0tbi8yLGU9YVsyXStuLGY9YVszXStuLGc9Zz5jP2M6ZyxoPWMrZT5oP2MrZTpoLGk9aT5kP2M6aSxqPWQrZj5qP2QrZjpqO2Vsc2UgaWYobT09PWIuR3JhcGhpY3MuQ0lSQ3x8bT09PWIuR3JhcGhpY3MuRUxJUCljPWFbMF0sZD1hWzFdLGU9YVsyXStuLzIsZj1hWzNdK24vMixnPWc+Yy1lP2MtZTpnLGg9YytlPmg/YytlOmgsaT1pPmQtZj9kLWY6aSxqPWQrZj5qP2QrZjpqO2Vsc2UgZm9yKHZhciBvPTA7bzxhLmxlbmd0aDtvKz0yKWM9YVtvXSxkPWFbbysxXSxnPWc+Yy1uP2MtbjpnLGg9YytuPmg/YytuOmgsaT1pPmQtbj9kLW46aSxqPWQrbj5qP2QrbjpqfXZhciBwPXRoaXMuYm91bmRzUGFkZGluZzt0aGlzLmJvdW5kcz1uZXcgYi5SZWN0YW5nbGUoZy1wLGktcCxoLWcrMipwLGotaSsyKnApfSxiLkdyYXBoaWNzLnByb3RvdHlwZS5fZ2VuZXJhdGVDYWNoZWRTcHJpdGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLmdldExvY2FsQm91bmRzKCk7aWYodGhpcy5fY2FjaGVkU3ByaXRlKXRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXIucmVzaXplKGEud2lkdGgsYS5oZWlnaHQpO2Vsc2V7dmFyIGM9bmV3IGIuQ2FudmFzQnVmZmVyKGEud2lkdGgsYS5oZWlnaHQpLGQ9Yi5UZXh0dXJlLmZyb21DYW52YXMoYy5jYW52YXMpO3RoaXMuX2NhY2hlZFNwcml0ZT1uZXcgYi5TcHJpdGUoZCksdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlcj1jLHRoaXMuX2NhY2hlZFNwcml0ZS53b3JsZFRyYW5zZm9ybT10aGlzLndvcmxkVHJhbnNmb3JtfXRoaXMuX2NhY2hlZFNwcml0ZS5hbmNob3IueD0tKGEueC9hLndpZHRoKSx0aGlzLl9jYWNoZWRTcHJpdGUuYW5jaG9yLnk9LShhLnkvYS5oZWlnaHQpLHRoaXMuX2NhY2hlZFNwcml0ZS5idWZmZXIuY29udGV4dC50cmFuc2xhdGUoLWEueCwtYS55KSxiLkNhbnZhc0dyYXBoaWNzLnJlbmRlckdyYXBoaWNzKHRoaXMsdGhpcy5fY2FjaGVkU3ByaXRlLmJ1ZmZlci5jb250ZXh0KSx0aGlzLl9jYWNoZWRTcHJpdGUuYWxwaGE9dGhpcy5hbHBoYX0sYi5HcmFwaGljcy5wcm90b3R5cGUuZGVzdHJveUNhY2hlZFNwcml0ZT1mdW5jdGlvbigpe3RoaXMuX2NhY2hlZFNwcml0ZS50ZXh0dXJlLmRlc3Ryb3koITApLHRoaXMuX2NhY2hlZFNwcml0ZT1udWxsfSxiLkdyYXBoaWNzLlBPTFk9MCxiLkdyYXBoaWNzLlJFQ1Q9MSxiLkdyYXBoaWNzLkNJUkM9MixiLkdyYXBoaWNzLkVMSVA9MyxiLkdyYXBoaWNzLlJSRUM9NCxiLlN0cmlwPWZ1bmN0aW9uKGEpe2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZT1hLHRoaXMudXZzPW5ldyBiLkZsb2F0MzJBcnJheShbMCwxLDEsMSwxLDAsMCwxXSksdGhpcy52ZXJ0aWNpZXM9bmV3IGIuRmxvYXQzMkFycmF5KFswLDAsMTAwLDAsMTAwLDEwMCwwLDEwMF0pLHRoaXMuY29sb3JzPW5ldyBiLkZsb2F0MzJBcnJheShbMSwxLDEsMV0pLHRoaXMuaW5kaWNlcz1uZXcgYi5VaW50MTZBcnJheShbMCwxLDIsM10pLHRoaXMuZGlydHk9ITB9LGIuU3RyaXAucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TdHJpcC5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TdHJpcCxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyV2ViR0w9ZnVuY3Rpb24oYSl7IXRoaXMudmlzaWJsZXx8dGhpcy5hbHBoYTw9MHx8KGEuc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX3ZlcnRleEJ1ZmZlcnx8dGhpcy5faW5pdFdlYkdMKGEpLGEuc2hhZGVyTWFuYWdlci5zZXRTaGFkZXIoYS5zaGFkZXJNYW5hZ2VyLnN0cmlwU2hhZGVyKSx0aGlzLl9yZW5kZXJTdHJpcChhKSxhLnNwcml0ZUJhdGNoLnN0YXJ0KCkpfSxiLlN0cmlwLnByb3RvdHlwZS5faW5pdFdlYkdMPWZ1bmN0aW9uKGEpe3ZhciBiPWEuZ2w7dGhpcy5fdmVydGV4QnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksdGhpcy5faW5kZXhCdWZmZXI9Yi5jcmVhdGVCdWZmZXIoKSx0aGlzLl91dkJ1ZmZlcj1iLmNyZWF0ZUJ1ZmZlcigpLHRoaXMuX2NvbG9yQnVmZmVyPWIuY3JlYXRlQnVmZmVyKCksYi5iaW5kQnVmZmVyKGIuQVJSQVlfQlVGRkVSLHRoaXMuX3ZlcnRleEJ1ZmZlciksYi5idWZmZXJEYXRhKGIuQVJSQVlfQlVGRkVSLHRoaXMudmVydGljaWVzLGIuRFlOQU1JQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5BUlJBWV9CVUZGRVIsdGhpcy5fdXZCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkFSUkFZX0JVRkZFUix0aGlzLnV2cyxiLlNUQVRJQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5BUlJBWV9CVUZGRVIsdGhpcy5fY29sb3JCdWZmZXIpLGIuYnVmZmVyRGF0YShiLkFSUkFZX0JVRkZFUix0aGlzLmNvbG9ycyxiLlNUQVRJQ19EUkFXKSxiLmJpbmRCdWZmZXIoYi5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlciksYi5idWZmZXJEYXRhKGIuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGIuU1RBVElDX0RSQVcpfSxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyU3RyaXA9ZnVuY3Rpb24oYSl7dmFyIGM9YS5nbCxkPWEucHJvamVjdGlvbixlPWEub2Zmc2V0LGY9YS5zaGFkZXJNYW5hZ2VyLnN0cmlwU2hhZGVyO2MuYmxlbmRGdW5jKGMuT05FLGMuT05FX01JTlVTX1NSQ19BTFBIQSksYy51bmlmb3JtTWF0cml4M2Z2KGYudHJhbnNsYXRpb25NYXRyaXgsITEsdGhpcy53b3JsZFRyYW5zZm9ybS50b0FycmF5KCEwKSksYy51bmlmb3JtMmYoZi5wcm9qZWN0aW9uVmVjdG9yLGQueCwtZC55KSxjLnVuaWZvcm0yZihmLm9mZnNldFZlY3RvciwtZS54LC1lLnkpLGMudW5pZm9ybTFmKGYuYWxwaGEsMSksdGhpcy5kaXJ0eT8odGhpcy5kaXJ0eT0hMSxjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdmVydGV4QnVmZmVyKSxjLmJ1ZmZlckRhdGEoYy5BUlJBWV9CVUZGRVIsdGhpcy52ZXJ0aWNpZXMsYy5TVEFUSUNfRFJBVyksYy52ZXJ0ZXhBdHRyaWJQb2ludGVyKGYuYVZlcnRleFBvc2l0aW9uLDIsYy5GTE9BVCwhMSwwLDApLGMuYmluZEJ1ZmZlcihjLkFSUkFZX0JVRkZFUix0aGlzLl91dkJ1ZmZlciksYy5idWZmZXJEYXRhKGMuQVJSQVlfQlVGRkVSLHRoaXMudXZzLGMuU1RBVElDX0RSQVcpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFUZXh0dXJlQ29vcmQsMixjLkZMT0FULCExLDAsMCksYy5hY3RpdmVUZXh0dXJlKGMuVEVYVFVSRTApLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tjLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLGMpKSxjLmJpbmRCdWZmZXIoYy5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlciksYy5idWZmZXJEYXRhKGMuRUxFTUVOVF9BUlJBWV9CVUZGRVIsdGhpcy5pbmRpY2VzLGMuU1RBVElDX0RSQVcpKTooYy5iaW5kQnVmZmVyKGMuQVJSQVlfQlVGRkVSLHRoaXMuX3ZlcnRleEJ1ZmZlciksYy5idWZmZXJTdWJEYXRhKGMuQVJSQVlfQlVGRkVSLDAsdGhpcy52ZXJ0aWNpZXMpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFWZXJ0ZXhQb3NpdGlvbiwyLGMuRkxPQVQsITEsMCwwKSxjLmJpbmRCdWZmZXIoYy5BUlJBWV9CVUZGRVIsdGhpcy5fdXZCdWZmZXIpLGMudmVydGV4QXR0cmliUG9pbnRlcihmLmFUZXh0dXJlQ29vcmQsMixjLkZMT0FULCExLDAsMCksYy5hY3RpdmVUZXh0dXJlKGMuVEVYVFVSRTApLGMuYmluZFRleHR1cmUoYy5URVhUVVJFXzJELHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlc1tjLmlkXXx8Yi5jcmVhdGVXZWJHTFRleHR1cmUodGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLGMpKSxjLmJpbmRCdWZmZXIoYy5FTEVNRU5UX0FSUkFZX0JVRkZFUix0aGlzLl9pbmRleEJ1ZmZlcikpLGMuZHJhd0VsZW1lbnRzKGMuVFJJQU5HTEVfU1RSSVAsdGhpcy5pbmRpY2VzLmxlbmd0aCxjLlVOU0lHTkVEX1NIT1JULDApfSxiLlN0cmlwLnByb3RvdHlwZS5fcmVuZGVyQ2FudmFzPWZ1bmN0aW9uKGEpe3ZhciBiPWEuY29udGV4dCxjPXRoaXMud29ybGRUcmFuc2Zvcm07YS5yb3VuZFBpeGVscz9iLnNldFRyYW5zZm9ybShjLmEsYy5jLGMuYixjLmQsMHxjLnR4LDB8Yy50eSk6Yi5zZXRUcmFuc2Zvcm0oYy5hLGMuYyxjLmIsYy5kLGMudHgsYy50eSk7dmFyIGQ9dGhpcyxlPWQudmVydGljaWVzLGY9ZC51dnMsZz1lLmxlbmd0aC8yO3RoaXMuY291bnQrKztmb3IodmFyIGg9MDtnLTI+aDtoKyspe3ZhciBpPTIqaCxqPWVbaV0saz1lW2krMl0sbD1lW2krNF0sbT1lW2krMV0sbj1lW2krM10sbz1lW2krNV0scD0oaitrK2wpLzMscT0obStuK28pLzMscj1qLXAscz1tLXEsdD1NYXRoLnNxcnQocipyK3Mqcyk7aj1wK3IvdCoodCszKSxtPXErcy90Kih0KzMpLHI9ay1wLHM9bi1xLHQ9TWF0aC5zcXJ0KHIqcitzKnMpLGs9cCtyL3QqKHQrMyksbj1xK3MvdCoodCszKSxyPWwtcCxzPW8tcSx0PU1hdGguc3FydChyKnIrcypzKSxsPXArci90Kih0KzMpLG89cStzL3QqKHQrMyk7dmFyIHU9ZltpXSpkLnRleHR1cmUud2lkdGgsdj1mW2krMl0qZC50ZXh0dXJlLndpZHRoLHc9ZltpKzRdKmQudGV4dHVyZS53aWR0aCx4PWZbaSsxXSpkLnRleHR1cmUuaGVpZ2h0LHk9ZltpKzNdKmQudGV4dHVyZS5oZWlnaHQsej1mW2krNV0qZC50ZXh0dXJlLmhlaWdodDtiLnNhdmUoKSxiLmJlZ2luUGF0aCgpLGIubW92ZVRvKGosbSksYi5saW5lVG8oayxuKSxiLmxpbmVUbyhsLG8pLGIuY2xvc2VQYXRoKCksYi5jbGlwKCk7dmFyIEE9dSp5K3gqdyt2KnoteSp3LXgqdi11KnosQj1qKnkreCpsK2sqei15KmwteCprLWoqeixDPXUqaytqKncrdipsLWsqdy1qKnYtdSpsLEQ9dSp5KmwreCprKncraip2Knotaip5KncteCp2KmwtdSprKnosRT1tKnkreCpvK24qei15Km8teCpuLW0qeixGPXUqbittKncrdipvLW4qdy1tKnYtdSpvLEc9dSp5Km8reCpuKncrbSp2KnotbSp5KncteCp2Km8tdSpuKno7Yi50cmFuc2Zvcm0oQi9BLEUvQSxDL0EsRi9BLEQvQSxHL0EpLGIuZHJhd0ltYWdlKGQudGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsMCwwKSxiLnJlc3RvcmUoKX19LGIuU3RyaXAucHJvdG90eXBlLm9uVGV4dHVyZVVwZGF0ZT1mdW5jdGlvbigpe3RoaXMudXBkYXRlRnJhbWU9ITB9LGIuUm9wZT1mdW5jdGlvbihhLGMpe2IuU3RyaXAuY2FsbCh0aGlzLGEpLHRoaXMucG9pbnRzPWMsdGhpcy52ZXJ0aWNpZXM9bmV3IGIuRmxvYXQzMkFycmF5KDQqYy5sZW5ndGgpLHRoaXMudXZzPW5ldyBiLkZsb2F0MzJBcnJheSg0KmMubGVuZ3RoKSx0aGlzLmNvbG9ycz1uZXcgYi5GbG9hdDMyQXJyYXkoMipjLmxlbmd0aCksdGhpcy5pbmRpY2VzPW5ldyBiLlVpbnQxNkFycmF5KDIqYy5sZW5ndGgpLHRoaXMucmVmcmVzaCgpfSxiLlJvcGUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5TdHJpcC5wcm90b3R5cGUpLGIuUm9wZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Sb3BlLGIuUm9wZS5wcm90b3R5cGUucmVmcmVzaD1mdW5jdGlvbigpe3ZhciBhPXRoaXMucG9pbnRzO2lmKCEoYS5sZW5ndGg8MSkpe3ZhciBiPXRoaXMudXZzLGM9YVswXSxkPXRoaXMuaW5kaWNlcyxlPXRoaXMuY29sb3JzO3RoaXMuY291bnQtPS4yLGJbMF09MCxiWzFdPTAsYlsyXT0wLGJbM109MSxlWzBdPTEsZVsxXT0xLGRbMF09MCxkWzFdPTE7Zm9yKHZhciBmLGcsaCxpPWEubGVuZ3RoLGo9MTtpPmo7aisrKWY9YVtqXSxnPTQqaixoPWovKGktMSksaiUyPyhiW2ddPWgsYltnKzFdPTAsYltnKzJdPWgsYltnKzNdPTEpOihiW2ddPWgsYltnKzFdPTAsYltnKzJdPWgsYltnKzNdPTEpLGc9MipqLGVbZ109MSxlW2crMV09MSxnPTIqaixkW2ddPWcsZFtnKzFdPWcrMSxjPWZ9fSxiLlJvcGUucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybT1mdW5jdGlvbigpe3ZhciBhPXRoaXMucG9pbnRzO2lmKCEoYS5sZW5ndGg8MSkpe3ZhciBjLGQ9YVswXSxlPXt4OjAseTowfTt0aGlzLmNvdW50LT0uMjtmb3IodmFyIGYsZyxoLGksaixrPXRoaXMudmVydGljaWVzLGw9YS5sZW5ndGgsbT0wO2w+bTttKyspZj1hW21dLGc9NCptLGM9bTxhLmxlbmd0aC0xP2FbbSsxXTpmLGUueT0tKGMueC1kLngpLGUueD1jLnktZC55LGg9MTAqKDEtbS8obC0xKSksaD4xJiYoaD0xKSxpPU1hdGguc3FydChlLngqZS54K2UueSplLnkpLGo9dGhpcy50ZXh0dXJlLmhlaWdodC8yLGUueC89aSxlLnkvPWksZS54Kj1qLGUueSo9aixrW2ddPWYueCtlLngsa1tnKzFdPWYueStlLnksa1tnKzJdPWYueC1lLngsa1tnKzNdPWYueS1lLnksZD1mO2IuRGlzcGxheU9iamVjdENvbnRhaW5lci5wcm90b3R5cGUudXBkYXRlVHJhbnNmb3JtLmNhbGwodGhpcyl9fSxiLlJvcGUucHJvdG90eXBlLnNldFRleHR1cmU9ZnVuY3Rpb24oYSl7dGhpcy50ZXh0dXJlPWF9LGIuVGlsaW5nU3ByaXRlPWZ1bmN0aW9uKGEsYyxkKXtiLlNwcml0ZS5jYWxsKHRoaXMsYSksdGhpcy5fd2lkdGg9Y3x8MTAwLHRoaXMuX2hlaWdodD1kfHwxMDAsdGhpcy50aWxlU2NhbGU9bmV3IGIuUG9pbnQoMSwxKSx0aGlzLnRpbGVTY2FsZU9mZnNldD1uZXcgYi5Qb2ludCgxLDEpLHRoaXMudGlsZVBvc2l0aW9uPW5ldyBiLlBvaW50KDAsMCksdGhpcy5yZW5kZXJhYmxlPSEwLHRoaXMudGludD0xNjc3NzIxNSx0aGlzLmJsZW5kTW9kZT1iLmJsZW5kTW9kZXMuTk9STUFMfSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlNwcml0ZS5wcm90b3R5cGUpLGIuVGlsaW5nU3ByaXRlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlRpbGluZ1Nwcml0ZSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLFwid2lkdGhcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3dpZHRofSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5fd2lkdGg9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLFwiaGVpZ2h0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9oZWlnaHR9LHNldDpmdW5jdGlvbihhKXt0aGlzLl9oZWlnaHQ9YX19KSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuc2V0VGV4dHVyZT1mdW5jdGlvbihhKXt0aGlzLnRleHR1cmUhPT1hJiYodGhpcy50ZXh0dXJlPWEsdGhpcy5yZWZyZXNoVGV4dHVyZT0hMCx0aGlzLmNhY2hlZFRpbnQ9MTY3NzcyMTUpfSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuX3JlbmRlcldlYkdMPWZ1bmN0aW9uKGEpe2lmKHRoaXMudmlzaWJsZSE9PSExJiYwIT09dGhpcy5hbHBoYSl7dmFyIGMsZDtmb3IodGhpcy5fbWFzayYmKGEuc3ByaXRlQmF0Y2guc3RvcCgpLGEubWFza01hbmFnZXIucHVzaE1hc2sodGhpcy5tYXNrLGEpLGEuc3ByaXRlQmF0Y2guc3RhcnQoKSksdGhpcy5fZmlsdGVycyYmKGEuc3ByaXRlQmF0Y2guZmx1c2goKSxhLmZpbHRlck1hbmFnZXIucHVzaEZpbHRlcih0aGlzLl9maWx0ZXJCbG9jaykpLCF0aGlzLnRpbGluZ1RleHR1cmV8fHRoaXMucmVmcmVzaFRleHR1cmU/KHRoaXMuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlKCEwKSx0aGlzLnRpbGluZ1RleHR1cmUmJnRoaXMudGlsaW5nVGV4dHVyZS5uZWVkc1VwZGF0ZSYmKGIudXBkYXRlV2ViR0xUZXh0dXJlKHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZSxhLmdsKSx0aGlzLnRpbGluZ1RleHR1cmUubmVlZHNVcGRhdGU9ITEpKTphLnNwcml0ZUJhdGNoLnJlbmRlclRpbGluZ1Nwcml0ZSh0aGlzKSxjPTAsZD10aGlzLmNoaWxkcmVuLmxlbmd0aDtkPmM7YysrKXRoaXMuY2hpbGRyZW5bY10uX3JlbmRlcldlYkdMKGEpO2Euc3ByaXRlQmF0Y2guc3RvcCgpLHRoaXMuX2ZpbHRlcnMmJmEuZmlsdGVyTWFuYWdlci5wb3BGaWx0ZXIoKSx0aGlzLl9tYXNrJiZhLm1hc2tNYW5hZ2VyLnBvcE1hc2soYSksYS5zcHJpdGVCYXRjaC5zdGFydCgpfX0sYi5UaWxpbmdTcHJpdGUucHJvdG90eXBlLl9yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSl7aWYodGhpcy52aXNpYmxlIT09ITEmJjAhPT10aGlzLmFscGhhKXt2YXIgYz1hLmNvbnRleHQ7dGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wdXNoTWFzayh0aGlzLl9tYXNrLGMpLGMuZ2xvYmFsQWxwaGE9dGhpcy53b3JsZEFscGhhO3ZhciBkLGUsZj10aGlzLndvcmxkVHJhbnNmb3JtO2lmKGMuc2V0VHJhbnNmb3JtKGYuYSxmLmMsZi5iLGYuZCxmLnR4LGYudHkpLCF0aGlzLl9fdGlsZVBhdHRlcm58fHRoaXMucmVmcmVzaFRleHR1cmUpe2lmKHRoaXMuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlKCExKSwhdGhpcy50aWxpbmdUZXh0dXJlKXJldHVybjt0aGlzLl9fdGlsZVBhdHRlcm49Yy5jcmVhdGVQYXR0ZXJuKHRoaXMudGlsaW5nVGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2UsXCJyZXBlYXRcIil9dGhpcy5ibGVuZE1vZGUhPT1hLmN1cnJlbnRCbGVuZE1vZGUmJihhLmN1cnJlbnRCbGVuZE1vZGU9dGhpcy5ibGVuZE1vZGUsYy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249Yi5ibGVuZE1vZGVzQ2FudmFzW2EuY3VycmVudEJsZW5kTW9kZV0pO3ZhciBnPXRoaXMudGlsZVBvc2l0aW9uLGg9dGhpcy50aWxlU2NhbGU7Zm9yKGcueCU9dGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLndpZHRoLGcueSU9dGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLmhlaWdodCxjLnNjYWxlKGgueCxoLnkpLGMudHJhbnNsYXRlKGcueCxnLnkpLGMuZmlsbFN0eWxlPXRoaXMuX190aWxlUGF0dGVybixjLmZpbGxSZWN0KC1nLngrdGhpcy5hbmNob3IueCotdGhpcy5fd2lkdGgsLWcueSt0aGlzLmFuY2hvci55Ki10aGlzLl9oZWlnaHQsdGhpcy5fd2lkdGgvaC54LHRoaXMuX2hlaWdodC9oLnkpLGMuc2NhbGUoMS9oLngsMS9oLnkpLGMudHJhbnNsYXRlKC1nLngsLWcueSksdGhpcy5fbWFzayYmYS5tYXNrTWFuYWdlci5wb3BNYXNrKGEuY29udGV4dCksZD0wLGU9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZT5kO2QrKyl0aGlzLmNoaWxkcmVuW2RdLl9yZW5kZXJDYW52YXMoYSl9fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuZ2V0Qm91bmRzPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5fd2lkdGgsYj10aGlzLl9oZWlnaHQsYz1hKigxLXRoaXMuYW5jaG9yLngpLGQ9YSotdGhpcy5hbmNob3IueCxlPWIqKDEtdGhpcy5hbmNob3IueSksZj1iKi10aGlzLmFuY2hvci55LGc9dGhpcy53b3JsZFRyYW5zZm9ybSxoPWcuYSxpPWcuYyxqPWcuYixrPWcuZCxsPWcudHgsbT1nLnR5LG49aCpkK2oqZitsLG89aypmK2kqZCttLHA9aCpjK2oqZitsLHE9aypmK2kqYyttLHI9aCpjK2oqZStsLHM9ayplK2kqYyttLHQ9aCpkK2oqZStsLHU9ayplK2kqZCttLHY9LTEvMCx3PS0xLzAseD0xLzAseT0xLzA7eD14Pm4/bjp4LHg9eD5wP3A6eCx4PXg+cj9yOngseD14PnQ/dDp4LHk9eT5vP286eSx5PXk+cT9xOnkseT15PnM/czp5LHk9eT51P3U6eSx2PW4+dj9uOnYsdj1wPnY/cDp2LHY9cj52P3I6dix2PXQ+dj90OnYsdz1vPnc/bzp3LHc9cT53P3E6dyx3PXM+dz9zOncsdz11Pnc/dTp3O3ZhciB6PXRoaXMuX2JvdW5kcztyZXR1cm4gei54PXgsei53aWR0aD12LXgsei55PXksei5oZWlnaHQ9dy15LHRoaXMuX2N1cnJlbnRCb3VuZHM9eix6fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUub25UZXh0dXJlVXBkYXRlPWZ1bmN0aW9uKCl7fSxiLlRpbGluZ1Nwcml0ZS5wcm90b3R5cGUuZ2VuZXJhdGVUaWxpbmdUZXh0dXJlPWZ1bmN0aW9uKGEpe2lmKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpe3ZhciBjLGQsZT10aGlzLnRleHR1cmUsZj1lLmZyYW1lLGc9Zi53aWR0aCE9PWUuYmFzZVRleHR1cmUud2lkdGh8fGYuaGVpZ2h0IT09ZS5iYXNlVGV4dHVyZS5oZWlnaHQsaD0hMTtpZihhPyhjPWIuZ2V0TmV4dFBvd2VyT2ZUd28oZi53aWR0aCksZD1iLmdldE5leHRQb3dlck9mVHdvKGYuaGVpZ2h0KSwoZi53aWR0aCE9PWN8fGYuaGVpZ2h0IT09ZCkmJihoPSEwKSk6ZyYmKGM9Zi53aWR0aCxkPWYuaGVpZ2h0LGg9ITApLGgpe3ZhciBpO3RoaXMudGlsaW5nVGV4dHVyZSYmdGhpcy50aWxpbmdUZXh0dXJlLmlzVGlsaW5nPyhpPXRoaXMudGlsaW5nVGV4dHVyZS5jYW52YXNCdWZmZXIsaS5yZXNpemUoYyxkKSx0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUud2lkdGg9Yyx0aGlzLnRpbGluZ1RleHR1cmUuYmFzZVRleHR1cmUuaGVpZ2h0PWQsdGhpcy50aWxpbmdUZXh0dXJlLm5lZWRzVXBkYXRlPSEwKTooaT1uZXcgYi5DYW52YXNCdWZmZXIoYyxkKSx0aGlzLnRpbGluZ1RleHR1cmU9Yi5UZXh0dXJlLmZyb21DYW52YXMoaS5jYW52YXMpLHRoaXMudGlsaW5nVGV4dHVyZS5jYW52YXNCdWZmZXI9aSx0aGlzLnRpbGluZ1RleHR1cmUuaXNUaWxpbmc9ITApLGkuY29udGV4dC5kcmF3SW1hZ2UoZS5iYXNlVGV4dHVyZS5zb3VyY2UsZS5jcm9wLngsZS5jcm9wLnksZS5jcm9wLndpZHRoLGUuY3JvcC5oZWlnaHQsMCwwLGMsZCksdGhpcy50aWxlU2NhbGVPZmZzZXQueD1mLndpZHRoL2MsdGhpcy50aWxlU2NhbGVPZmZzZXQueT1mLmhlaWdodC9kfWVsc2UgdGhpcy50aWxpbmdUZXh0dXJlJiZ0aGlzLnRpbGluZ1RleHR1cmUuaXNUaWxpbmcmJnRoaXMudGlsaW5nVGV4dHVyZS5kZXN0cm95KCEwKSx0aGlzLnRpbGVTY2FsZU9mZnNldC54PTEsdGhpcy50aWxlU2NhbGVPZmZzZXQueT0xLHRoaXMudGlsaW5nVGV4dHVyZT1lO3RoaXMucmVmcmVzaFRleHR1cmU9ITEsdGhpcy50aWxpbmdUZXh0dXJlLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMH19O3ZhciBmPXt9O2YuQm9uZURhdGE9ZnVuY3Rpb24oYSxiKXt0aGlzLm5hbWU9YSx0aGlzLnBhcmVudD1ifSxmLkJvbmVEYXRhLnByb3RvdHlwZT17bGVuZ3RoOjAseDowLHk6MCxyb3RhdGlvbjowLHNjYWxlWDoxLHNjYWxlWToxfSxmLlNsb3REYXRhPWZ1bmN0aW9uKGEsYil7dGhpcy5uYW1lPWEsdGhpcy5ib25lRGF0YT1ifSxmLlNsb3REYXRhLnByb3RvdHlwZT17cjoxLGc6MSxiOjEsYToxLGF0dGFjaG1lbnROYW1lOm51bGx9LGYuQm9uZT1mdW5jdGlvbihhLGIpe3RoaXMuZGF0YT1hLHRoaXMucGFyZW50PWIsdGhpcy5zZXRUb1NldHVwUG9zZSgpfSxmLkJvbmUueURvd249ITEsZi5Cb25lLnByb3RvdHlwZT17eDowLHk6MCxyb3RhdGlvbjowLHNjYWxlWDoxLHNjYWxlWToxLG0wMDowLG0wMTowLHdvcmxkWDowLG0xMDowLG0xMTowLHdvcmxkWTowLHdvcmxkUm90YXRpb246MCx3b3JsZFNjYWxlWDoxLHdvcmxkU2NhbGVZOjEsdXBkYXRlV29ybGRUcmFuc2Zvcm06ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLnBhcmVudDtudWxsIT1jPyh0aGlzLndvcmxkWD10aGlzLngqYy5tMDArdGhpcy55KmMubTAxK2Mud29ybGRYLHRoaXMud29ybGRZPXRoaXMueCpjLm0xMCt0aGlzLnkqYy5tMTErYy53b3JsZFksdGhpcy53b3JsZFNjYWxlWD1jLndvcmxkU2NhbGVYKnRoaXMuc2NhbGVYLHRoaXMud29ybGRTY2FsZVk9Yy53b3JsZFNjYWxlWSp0aGlzLnNjYWxlWSx0aGlzLndvcmxkUm90YXRpb249Yy53b3JsZFJvdGF0aW9uK3RoaXMucm90YXRpb24pOih0aGlzLndvcmxkWD10aGlzLngsdGhpcy53b3JsZFk9dGhpcy55LHRoaXMud29ybGRTY2FsZVg9dGhpcy5zY2FsZVgsdGhpcy53b3JsZFNjYWxlWT10aGlzLnNjYWxlWSx0aGlzLndvcmxkUm90YXRpb249dGhpcy5yb3RhdGlvbik7dmFyIGQ9dGhpcy53b3JsZFJvdGF0aW9uKk1hdGguUEkvMTgwLGU9TWF0aC5jb3MoZCksZz1NYXRoLnNpbihkKTt0aGlzLm0wMD1lKnRoaXMud29ybGRTY2FsZVgsdGhpcy5tMTA9Zyp0aGlzLndvcmxkU2NhbGVYLHRoaXMubTAxPS1nKnRoaXMud29ybGRTY2FsZVksdGhpcy5tMTE9ZSp0aGlzLndvcmxkU2NhbGVZLGEmJih0aGlzLm0wMD0tdGhpcy5tMDAsdGhpcy5tMDE9LXRoaXMubTAxKSxiJiYodGhpcy5tMTA9LXRoaXMubTEwLHRoaXMubTExPS10aGlzLm0xMSksZi5Cb25lLnlEb3duJiYodGhpcy5tMTA9LXRoaXMubTEwLHRoaXMubTExPS10aGlzLm0xMSl9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5kYXRhO3RoaXMueD1hLngsdGhpcy55PWEueSx0aGlzLnJvdGF0aW9uPWEucm90YXRpb24sdGhpcy5zY2FsZVg9YS5zY2FsZVgsdGhpcy5zY2FsZVk9YS5zY2FsZVl9fSxmLlNsb3Q9ZnVuY3Rpb24oYSxiLGMpe3RoaXMuZGF0YT1hLHRoaXMuc2tlbGV0b249Yix0aGlzLmJvbmU9Yyx0aGlzLnNldFRvU2V0dXBQb3NlKCl9LGYuU2xvdC5wcm90b3R5cGU9e3I6MSxnOjEsYjoxLGE6MSxfYXR0YWNobWVudFRpbWU6MCxhdHRhY2htZW50Om51bGwsc2V0QXR0YWNobWVudDpmdW5jdGlvbihhKXt0aGlzLmF0dGFjaG1lbnQ9YSx0aGlzLl9hdHRhY2htZW50VGltZT10aGlzLnNrZWxldG9uLnRpbWV9LHNldEF0dGFjaG1lbnRUaW1lOmZ1bmN0aW9uKGEpe3RoaXMuX2F0dGFjaG1lbnRUaW1lPXRoaXMuc2tlbGV0b24udGltZS1hfSxnZXRBdHRhY2htZW50VGltZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNrZWxldG9uLnRpbWUtdGhpcy5fYXR0YWNobWVudFRpbWV9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5kYXRhO3RoaXMucj1hLnIsdGhpcy5nPWEuZyx0aGlzLmI9YS5iLHRoaXMuYT1hLmE7Zm9yKHZhciBiPXRoaXMuc2tlbGV0b24uZGF0YS5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY109PWEpe3RoaXMuc2V0QXR0YWNobWVudChhLmF0dGFjaG1lbnROYW1lP3RoaXMuc2tlbGV0b24uZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KGMsYS5hdHRhY2htZW50TmFtZSk6bnVsbCk7YnJlYWt9fX0sZi5Ta2luPWZ1bmN0aW9uKGEpe3RoaXMubmFtZT1hLHRoaXMuYXR0YWNobWVudHM9e319LGYuU2tpbi5wcm90b3R5cGU9e2FkZEF0dGFjaG1lbnQ6ZnVuY3Rpb24oYSxiLGMpe3RoaXMuYXR0YWNobWVudHNbYStcIjpcIitiXT1jfSxnZXRBdHRhY2htZW50OmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuYXR0YWNobWVudHNbYStcIjpcIitiXX0sX2F0dGFjaEFsbDpmdW5jdGlvbihhLGIpe2Zvcih2YXIgYyBpbiBiLmF0dGFjaG1lbnRzKXt2YXIgZD1jLmluZGV4T2YoXCI6XCIpLGU9cGFyc2VJbnQoYy5zdWJzdHJpbmcoMCxkKSwxMCksZj1jLnN1YnN0cmluZyhkKzEpLGc9YS5zbG90c1tlXTtpZihnLmF0dGFjaG1lbnQmJmcuYXR0YWNobWVudC5uYW1lPT1mKXt2YXIgaD10aGlzLmdldEF0dGFjaG1lbnQoZSxmKTtoJiZnLnNldEF0dGFjaG1lbnQoaCl9fX19LGYuQW5pbWF0aW9uPWZ1bmN0aW9uKGEsYixjKXt0aGlzLm5hbWU9YSx0aGlzLnRpbWVsaW5lcz1iLHRoaXMuZHVyYXRpb249Y30sZi5BbmltYXRpb24ucHJvdG90eXBlPXthcHBseTpmdW5jdGlvbihhLGIsYyl7YyYmdGhpcy5kdXJhdGlvbiYmKGIlPXRoaXMuZHVyYXRpb24pO2Zvcih2YXIgZD10aGlzLnRpbWVsaW5lcyxlPTAsZj1kLmxlbmd0aDtmPmU7ZSsrKWRbZV0uYXBwbHkoYSxiLDEpfSxtaXg6ZnVuY3Rpb24oYSxiLGMsZCl7YyYmdGhpcy5kdXJhdGlvbiYmKGIlPXRoaXMuZHVyYXRpb24pO2Zvcih2YXIgZT10aGlzLnRpbWVsaW5lcyxmPTAsZz1lLmxlbmd0aDtnPmY7ZisrKWVbZl0uYXBwbHkoYSxiLGQpfX0sZi5iaW5hcnlTZWFyY2g9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPTAsZT1NYXRoLmZsb29yKGEubGVuZ3RoL2MpLTI7aWYoIWUpcmV0dXJuIGM7Zm9yKHZhciBmPWU+Pj4xOzspe2lmKGFbKGYrMSkqY108PWI/ZD1mKzE6ZT1mLGQ9PWUpcmV0dXJuKGQrMSkqYztmPWQrZT4+PjF9fSxmLmxpbmVhclNlYXJjaD1mdW5jdGlvbihhLGIsYyl7Zm9yKHZhciBkPTAsZT1hLmxlbmd0aC1jO2U+PWQ7ZCs9YylpZihhW2RdPmIpcmV0dXJuIGQ7cmV0dXJuLTF9LGYuQ3VydmVzPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPVtdLHRoaXMuY3VydmVzLmxlbmd0aD02KihhLTEpfSxmLkN1cnZlcy5wcm90b3R5cGU9e3NldExpbmVhcjpmdW5jdGlvbihhKXt0aGlzLmN1cnZlc1s2KmFdPTB9LHNldFN0ZXBwZWQ6ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXNbNiphXT0tMX0sc2V0Q3VydmU6ZnVuY3Rpb24oYSxiLGMsZCxlKXt2YXIgZj0uMSxnPWYqZixoPWcqZixpPTMqZixqPTMqZyxrPTYqZyxsPTYqaCxtPTIqLWIrZCxuPTIqLWMrZSxvPTMqKGItZCkrMSxwPTMqKGMtZSkrMSxxPTYqYSxyPXRoaXMuY3VydmVzO3JbcV09YippK20qaitvKmgscltxKzFdPWMqaStuKmorcCpoLHJbcSsyXT1tKmsrbypsLHJbcSszXT1uKmsrcCpsLHJbcSs0XT1vKmwscltxKzVdPXAqbH0sZ2V0Q3VydmVQZXJjZW50OmZ1bmN0aW9uKGEsYil7Yj0wPmI/MDpiPjE/MTpiO3ZhciBjPTYqYSxkPXRoaXMuY3VydmVzLGU9ZFtjXTtpZighZSlyZXR1cm4gYjtpZigtMT09ZSlyZXR1cm4gMDtmb3IodmFyIGY9ZFtjKzFdLGc9ZFtjKzJdLGg9ZFtjKzNdLGk9ZFtjKzRdLGo9ZFtjKzVdLGs9ZSxsPWYsbT04Ozspe2lmKGs+PWIpe3ZhciBuPWstZSxvPWwtZjtyZXR1cm4gbysobC1vKSooYi1uKS8oay1uKX1pZighbSlicmVhazttLS0sZSs9ZyxmKz1oLGcrPWksaCs9aixrKz1lLGwrPWZ9cmV0dXJuIGwrKDEtbCkqKGItaykvKDEtayl9fSxmLlJvdGF0ZVRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9MiphfSxmLlJvdGF0ZVRpbWVsaW5lLnByb3RvdHlwZT17Ym9uZUluZGV4OjAsZ2V0RnJhbWVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZyYW1lcy5sZW5ndGgvMn0sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMpe2EqPTIsdGhpcy5mcmFtZXNbYV09Yix0aGlzLmZyYW1lc1thKzFdPWN9LGFwcGx5OmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlPXRoaXMuZnJhbWVzO2lmKCEoYjxlWzBdKSl7dmFyIGc9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZVtlLmxlbmd0aC0yXSl7Zm9yKGQ9Zy5kYXRhLnJvdGF0aW9uK2VbZS5sZW5ndGgtMV0tZy5yb3RhdGlvbjtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7cmV0dXJuIGcucm90YXRpb24rPWQqYyx2b2lkIDB9dmFyIGg9Zi5iaW5hcnlTZWFyY2goZSxiLDIpLGk9ZVtoLTFdLGo9ZVtoXSxrPTEtKGItaikvKGVbaC0yXS1qKTtmb3Ioaz10aGlzLmN1cnZlcy5nZXRDdXJ2ZVBlcmNlbnQoaC8yLTEsayksZD1lW2grMV0taTtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7Zm9yKGQ9Zy5kYXRhLnJvdGF0aW9uKyhpK2QqayktZy5yb3RhdGlvbjtkPjE4MDspZC09MzYwO2Zvcig7LTE4MD5kOylkKz0zNjA7Zy5yb3RhdGlvbis9ZCpjfX19LGYuVHJhbnNsYXRlVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD0zKmF9LGYuVHJhbnNsYXRlVGltZWxpbmUucHJvdG90eXBlPXtib25lSW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC8zfSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyxkKXthKj0zLHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZH0sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZnJhbWVzO2lmKCEoYjxkWzBdKSl7dmFyIGU9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZFtkLmxlbmd0aC0zXSlyZXR1cm4gZS54Kz0oZS5kYXRhLngrZFtkLmxlbmd0aC0yXS1lLngpKmMsZS55Kz0oZS5kYXRhLnkrZFtkLmxlbmd0aC0xXS1lLnkpKmMsdm9pZCAwO3ZhciBnPWYuYmluYXJ5U2VhcmNoKGQsYiwzKSxoPWRbZy0yXSxpPWRbZy0xXSxqPWRbZ10saz0xLShiLWopLyhkW2crLTNdLWopO2s9dGhpcy5jdXJ2ZXMuZ2V0Q3VydmVQZXJjZW50KGcvMy0xLGspLGUueCs9KGUuZGF0YS54K2grKGRbZysxXS1oKSprLWUueCkqYyxlLnkrPShlLmRhdGEueStpKyhkW2crMl0taSkqay1lLnkpKmN9fX0sZi5TY2FsZVRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9MyphfSxmLlNjYWxlVGltZWxpbmUucHJvdG90eXBlPXtib25lSW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aC8zfSxzZXRGcmFtZTpmdW5jdGlvbihhLGIsYyxkKXthKj0zLHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZH0sYXBwbHk6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuZnJhbWVzO2lmKCEoYjxkWzBdKSl7dmFyIGU9YS5ib25lc1t0aGlzLmJvbmVJbmRleF07aWYoYj49ZFtkLmxlbmd0aC0zXSlyZXR1cm4gZS5zY2FsZVgrPShlLmRhdGEuc2NhbGVYLTErZFtkLmxlbmd0aC0yXS1lLnNjYWxlWCkqYyxlLnNjYWxlWSs9KGUuZGF0YS5zY2FsZVktMStkW2QubGVuZ3RoLTFdLWUuc2NhbGVZKSpjLHZvaWQgMDt2YXIgZz1mLmJpbmFyeVNlYXJjaChkLGIsMyksaD1kW2ctMl0saT1kW2ctMV0saj1kW2ddLGs9MS0oYi1qKS8oZFtnKy0zXS1qKTtrPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChnLzMtMSxrKSxlLnNjYWxlWCs9KGUuZGF0YS5zY2FsZVgtMStoKyhkW2crMV0taCkqay1lLnNjYWxlWCkqYyxlLnNjYWxlWSs9KGUuZGF0YS5zY2FsZVktMStpKyhkW2crMl0taSkqay1lLnNjYWxlWSkqY319fSxmLkNvbG9yVGltZWxpbmU9ZnVuY3Rpb24oYSl7dGhpcy5jdXJ2ZXM9bmV3IGYuQ3VydmVzKGEpLHRoaXMuZnJhbWVzPVtdLHRoaXMuZnJhbWVzLmxlbmd0aD01KmF9LGYuQ29sb3JUaW1lbGluZS5wcm90b3R5cGU9e3Nsb3RJbmRleDowLGdldEZyYW1lQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5mcmFtZXMubGVuZ3RoLzV9LHNldEZyYW1lOmZ1bmN0aW9uKGEsYixjLGQsZSxmKXthKj01LHRoaXMuZnJhbWVzW2FdPWIsdGhpcy5mcmFtZXNbYSsxXT1jLHRoaXMuZnJhbWVzW2ErMl09ZCx0aGlzLmZyYW1lc1thKzNdPWUsdGhpcy5mcmFtZXNbYSs0XT1mfSxhcHBseTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5mcmFtZXM7aWYoIShiPGRbMF0pKXt2YXIgZT1hLnNsb3RzW3RoaXMuc2xvdEluZGV4XTtpZihiPj1kW2QubGVuZ3RoLTVdKXt2YXIgZz1kLmxlbmd0aC0xO3JldHVybiBlLnI9ZFtnLTNdLGUuZz1kW2ctMl0sZS5iPWRbZy0xXSxlLmE9ZFtnXSx2b2lkIDB9dmFyIGg9Zi5iaW5hcnlTZWFyY2goZCxiLDUpLGk9ZFtoLTRdLGo9ZFtoLTNdLGs9ZFtoLTJdLGw9ZFtoLTFdLG09ZFtoXSxuPTEtKGItbSkvKGRbaC01XS1tKTtuPXRoaXMuY3VydmVzLmdldEN1cnZlUGVyY2VudChoLzUtMSxuKTt2YXIgbz1pKyhkW2grMV0taSkqbixwPWorKGRbaCsyXS1qKSpuLHE9aysoZFtoKzNdLWspKm4scj1sKyhkW2grNF0tbCkqbjsxPmM/KGUucis9KG8tZS5yKSpjLGUuZys9KHAtZS5nKSpjLGUuYis9KHEtZS5iKSpjLGUuYSs9KHItZS5hKSpjKTooZS5yPW8sZS5nPXAsZS5iPXEsZS5hPXIpfX19LGYuQXR0YWNobWVudFRpbWVsaW5lPWZ1bmN0aW9uKGEpe3RoaXMuY3VydmVzPW5ldyBmLkN1cnZlcyhhKSx0aGlzLmZyYW1lcz1bXSx0aGlzLmZyYW1lcy5sZW5ndGg9YSx0aGlzLmF0dGFjaG1lbnROYW1lcz1bXSx0aGlzLmF0dGFjaG1lbnROYW1lcy5sZW5ndGg9YX0sZi5BdHRhY2htZW50VGltZWxpbmUucHJvdG90eXBlPXtzbG90SW5kZXg6MCxnZXRGcmFtZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZnJhbWVzLmxlbmd0aH0sc2V0RnJhbWU6ZnVuY3Rpb24oYSxiLGMpe3RoaXMuZnJhbWVzW2FdPWIsdGhpcy5hdHRhY2htZW50TmFtZXNbYV09Y30sYXBwbHk6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmZyYW1lcztpZighKGI8Y1swXSkpe3ZhciBkO2Q9Yj49Y1tjLmxlbmd0aC0xXT9jLmxlbmd0aC0xOmYuYmluYXJ5U2VhcmNoKGMsYiwxKS0xO3ZhciBlPXRoaXMuYXR0YWNobWVudE5hbWVzW2RdO2Euc2xvdHNbdGhpcy5zbG90SW5kZXhdLnNldEF0dGFjaG1lbnQoZT9hLmdldEF0dGFjaG1lbnRCeVNsb3RJbmRleCh0aGlzLnNsb3RJbmRleCxlKTpudWxsKX19fSxmLlNrZWxldG9uRGF0YT1mdW5jdGlvbigpe3RoaXMuYm9uZXM9W10sdGhpcy5zbG90cz1bXSx0aGlzLnNraW5zPVtdLHRoaXMuYW5pbWF0aW9ucz1bXX0sZi5Ta2VsZXRvbkRhdGEucHJvdG90eXBlPXtkZWZhdWx0U2tpbjpudWxsLGZpbmRCb25lOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kQm9uZUluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5uYW1lPT1hKXJldHVybiBjO3JldHVybi0xfSxmaW5kU2xvdDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gc2xvdFtjXTtyZXR1cm4gbnVsbH0sZmluZFNsb3RJbmRleDpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5zbG90cyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sZmluZFNraW46ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2tpbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRBbmltYXRpb246ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuYW5pbWF0aW9ucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH19LGYuU2tlbGV0b249ZnVuY3Rpb24oYSl7dGhpcy5kYXRhPWEsdGhpcy5ib25lcz1bXTtcbmZvcih2YXIgYj0wLGM9YS5ib25lcy5sZW5ndGg7Yz5iO2IrKyl7dmFyIGQ9YS5ib25lc1tiXSxlPWQucGFyZW50P3RoaXMuYm9uZXNbYS5ib25lcy5pbmRleE9mKGQucGFyZW50KV06bnVsbDt0aGlzLmJvbmVzLnB1c2gobmV3IGYuQm9uZShkLGUpKX1mb3IodGhpcy5zbG90cz1bXSx0aGlzLmRyYXdPcmRlcj1bXSxiPTAsYz1hLnNsb3RzLmxlbmd0aDtjPmI7YisrKXt2YXIgZz1hLnNsb3RzW2JdLGg9dGhpcy5ib25lc1thLmJvbmVzLmluZGV4T2YoZy5ib25lRGF0YSldLGk9bmV3IGYuU2xvdChnLHRoaXMsaCk7dGhpcy5zbG90cy5wdXNoKGkpLHRoaXMuZHJhd09yZGVyLnB1c2goaSl9fSxmLlNrZWxldG9uLnByb3RvdHlwZT17eDowLHk6MCxza2luOm51bGwscjoxLGc6MSxiOjEsYToxLHRpbWU6MCxmbGlwWDohMSxmbGlwWTohMSx1cGRhdGVXb3JsZFRyYW5zZm9ybTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmZsaXBYLGI9dGhpcy5mbGlwWSxjPXRoaXMuYm9uZXMsZD0wLGU9Yy5sZW5ndGg7ZT5kO2QrKyljW2RdLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKGEsYil9LHNldFRvU2V0dXBQb3NlOmZ1bmN0aW9uKCl7dGhpcy5zZXRCb25lc1RvU2V0dXBQb3NlKCksdGhpcy5zZXRTbG90c1RvU2V0dXBQb3NlKCl9LHNldEJvbmVzVG9TZXR1cFBvc2U6ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5ib25lcyxiPTAsYz1hLmxlbmd0aDtjPmI7YisrKWFbYl0uc2V0VG9TZXR1cFBvc2UoKX0sc2V0U2xvdHNUb1NldHVwUG9zZTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLnNsb3RzLGI9MCxjPWEubGVuZ3RoO2M+YjtiKyspYVtiXS5zZXRUb1NldHVwUG9zZShiKX0sZ2V0Um9vdEJvbmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ib25lcy5sZW5ndGg/dGhpcy5ib25lc1swXTpudWxsfSxmaW5kQm9uZTpmdW5jdGlvbihhKXtmb3IodmFyIGI9dGhpcy5ib25lcyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10uZGF0YS5uYW1lPT1hKXJldHVybiBiW2NdO3JldHVybiBudWxsfSxmaW5kQm9uZUluZGV4OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLmJvbmVzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGM7cmV0dXJuLTF9LGZpbmRTbG90OmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnNsb3RzLGM9MCxkPWIubGVuZ3RoO2Q+YztjKyspaWYoYltjXS5kYXRhLm5hbWU9PWEpcmV0dXJuIGJbY107cmV0dXJuIG51bGx9LGZpbmRTbG90SW5kZXg6ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMuc2xvdHMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKylpZihiW2NdLmRhdGEubmFtZT09YSlyZXR1cm4gYztyZXR1cm4tMX0sc2V0U2tpbkJ5TmFtZTpmdW5jdGlvbihhKXt2YXIgYj10aGlzLmRhdGEuZmluZFNraW4oYSk7aWYoIWIpdGhyb3dcIlNraW4gbm90IGZvdW5kOiBcIithO3RoaXMuc2V0U2tpbihiKX0sc2V0U2tpbjpmdW5jdGlvbihhKXt0aGlzLnNraW4mJmEmJmEuX2F0dGFjaEFsbCh0aGlzLHRoaXMuc2tpbiksdGhpcy5za2luPWF9LGdldEF0dGFjaG1lbnRCeVNsb3ROYW1lOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuZ2V0QXR0YWNobWVudEJ5U2xvdEluZGV4KHRoaXMuZGF0YS5maW5kU2xvdEluZGV4KGEpLGIpfSxnZXRBdHRhY2htZW50QnlTbG90SW5kZXg6ZnVuY3Rpb24oYSxiKXtpZih0aGlzLnNraW4pe3ZhciBjPXRoaXMuc2tpbi5nZXRBdHRhY2htZW50KGEsYik7aWYoYylyZXR1cm4gY31yZXR1cm4gdGhpcy5kYXRhLmRlZmF1bHRTa2luP3RoaXMuZGF0YS5kZWZhdWx0U2tpbi5nZXRBdHRhY2htZW50KGEsYik6bnVsbH0sc2V0QXR0YWNobWVudDpmdW5jdGlvbihhLGIpe2Zvcih2YXIgYz10aGlzLnNsb3RzLGQ9MCxlPWMuc2l6ZTtlPmQ7ZCsrKXt2YXIgZj1jW2RdO2lmKGYuZGF0YS5uYW1lPT1hKXt2YXIgZz1udWxsO2lmKGImJihnPXRoaXMuZ2V0QXR0YWNobWVudChkLGIpLG51bGw9PWcpKXRocm93XCJBdHRhY2htZW50IG5vdCBmb3VuZDogXCIrYitcIiwgZm9yIHNsb3Q6IFwiK2E7cmV0dXJuIGYuc2V0QXR0YWNobWVudChnKSx2b2lkIDB9fXRocm93XCJTbG90IG5vdCBmb3VuZDogXCIrYX0sdXBkYXRlOmZ1bmN0aW9uKGEpe3RpbWUrPWF9fSxmLkF0dGFjaG1lbnRUeXBlPXtyZWdpb246MH0sZi5SZWdpb25BdHRhY2htZW50PWZ1bmN0aW9uKCl7dGhpcy5vZmZzZXQ9W10sdGhpcy5vZmZzZXQubGVuZ3RoPTgsdGhpcy51dnM9W10sdGhpcy51dnMubGVuZ3RoPTh9LGYuUmVnaW9uQXR0YWNobWVudC5wcm90b3R5cGU9e3g6MCx5OjAscm90YXRpb246MCxzY2FsZVg6MSxzY2FsZVk6MSx3aWR0aDowLGhlaWdodDowLHJlbmRlcmVyT2JqZWN0Om51bGwscmVnaW9uT2Zmc2V0WDowLHJlZ2lvbk9mZnNldFk6MCxyZWdpb25XaWR0aDowLHJlZ2lvbkhlaWdodDowLHJlZ2lvbk9yaWdpbmFsV2lkdGg6MCxyZWdpb25PcmlnaW5hbEhlaWdodDowLHNldFVWczpmdW5jdGlvbihhLGIsYyxkLGUpe3ZhciBmPXRoaXMudXZzO2U/KGZbMl09YSxmWzNdPWQsZls0XT1hLGZbNV09YixmWzZdPWMsZls3XT1iLGZbMF09YyxmWzFdPWQpOihmWzBdPWEsZlsxXT1kLGZbMl09YSxmWzNdPWIsZls0XT1jLGZbNV09YixmWzZdPWMsZls3XT1kKX0sdXBkYXRlT2Zmc2V0OmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy53aWR0aC90aGlzLnJlZ2lvbk9yaWdpbmFsV2lkdGgqdGhpcy5zY2FsZVgsYj10aGlzLmhlaWdodC90aGlzLnJlZ2lvbk9yaWdpbmFsSGVpZ2h0KnRoaXMuc2NhbGVZLGM9LXRoaXMud2lkdGgvMip0aGlzLnNjYWxlWCt0aGlzLnJlZ2lvbk9mZnNldFgqYSxkPS10aGlzLmhlaWdodC8yKnRoaXMuc2NhbGVZK3RoaXMucmVnaW9uT2Zmc2V0WSpiLGU9Yyt0aGlzLnJlZ2lvbldpZHRoKmEsZj1kK3RoaXMucmVnaW9uSGVpZ2h0KmIsZz10aGlzLnJvdGF0aW9uKk1hdGguUEkvMTgwLGg9TWF0aC5jb3MoZyksaT1NYXRoLnNpbihnKSxqPWMqaCt0aGlzLngsaz1jKmksbD1kKmgrdGhpcy55LG09ZCppLG49ZSpoK3RoaXMueCxvPWUqaSxwPWYqaCt0aGlzLnkscT1mKmkscj10aGlzLm9mZnNldDtyWzBdPWotbSxyWzFdPWwrayxyWzJdPWotcSxyWzNdPXArayxyWzRdPW4tcSxyWzVdPXArbyxyWzZdPW4tbSxyWzddPWwrb30sY29tcHV0ZVZlcnRpY2VzOmZ1bmN0aW9uKGEsYixjLGQpe2ErPWMud29ybGRYLGIrPWMud29ybGRZO3ZhciBlPWMubTAwLGY9Yy5tMDEsZz1jLm0xMCxoPWMubTExLGk9dGhpcy5vZmZzZXQ7ZFswXT1pWzBdKmUraVsxXSpmK2EsZFsxXT1pWzBdKmcraVsxXSpoK2IsZFsyXT1pWzJdKmUraVszXSpmK2EsZFszXT1pWzJdKmcraVszXSpoK2IsZFs0XT1pWzRdKmUraVs1XSpmK2EsZFs1XT1pWzRdKmcraVs1XSpoK2IsZFs2XT1pWzZdKmUraVs3XSpmK2EsZFs3XT1pWzZdKmcraVs3XSpoK2J9fSxmLkFuaW1hdGlvblN0YXRlRGF0YT1mdW5jdGlvbihhKXt0aGlzLnNrZWxldG9uRGF0YT1hLHRoaXMuYW5pbWF0aW9uVG9NaXhUaW1lPXt9fSxmLkFuaW1hdGlvblN0YXRlRGF0YS5wcm90b3R5cGU9e2RlZmF1bHRNaXg6MCxzZXRNaXhCeU5hbWU6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWQpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dmFyIGU9dGhpcy5za2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihiKTtpZighZSl0aHJvd1wiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIrYjt0aGlzLnNldE1peChkLGUsYyl9LHNldE1peDpmdW5jdGlvbihhLGIsYyl7dGhpcy5hbmltYXRpb25Ub01peFRpbWVbYS5uYW1lK1wiOlwiK2IubmFtZV09Y30sZ2V0TWl4OmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5hbmltYXRpb25Ub01peFRpbWVbYS5uYW1lK1wiOlwiK2IubmFtZV07cmV0dXJuIGM/Yzp0aGlzLmRlZmF1bHRNaXh9fSxmLkFuaW1hdGlvblN0YXRlPWZ1bmN0aW9uKGEpe3RoaXMuZGF0YT1hLHRoaXMucXVldWU9W119LGYuQW5pbWF0aW9uU3RhdGUucHJvdG90eXBlPXthbmltYXRpb25TcGVlZDoxLGN1cnJlbnQ6bnVsbCxwcmV2aW91czpudWxsLGN1cnJlbnRUaW1lOjAscHJldmlvdXNUaW1lOjAsY3VycmVudExvb3A6ITEscHJldmlvdXNMb29wOiExLG1peFRpbWU6MCxtaXhEdXJhdGlvbjowLHVwZGF0ZTpmdW5jdGlvbihhKXtpZih0aGlzLmN1cnJlbnRUaW1lKz1hKnRoaXMuYW5pbWF0aW9uU3BlZWQsdGhpcy5wcmV2aW91c1RpbWUrPWEsdGhpcy5taXhUaW1lKz1hLHRoaXMucXVldWUubGVuZ3RoPjApe3ZhciBiPXRoaXMucXVldWVbMF07dGhpcy5jdXJyZW50VGltZT49Yi5kZWxheSYmKHRoaXMuX3NldEFuaW1hdGlvbihiLmFuaW1hdGlvbixiLmxvb3ApLHRoaXMucXVldWUuc2hpZnQoKSl9fSxhcHBseTpmdW5jdGlvbihhKXtpZih0aGlzLmN1cnJlbnQpaWYodGhpcy5wcmV2aW91cyl7dGhpcy5wcmV2aW91cy5hcHBseShhLHRoaXMucHJldmlvdXNUaW1lLHRoaXMucHJldmlvdXNMb29wKTt2YXIgYj10aGlzLm1peFRpbWUvdGhpcy5taXhEdXJhdGlvbjtiPj0xJiYoYj0xLHRoaXMucHJldmlvdXM9bnVsbCksdGhpcy5jdXJyZW50Lm1peChhLHRoaXMuY3VycmVudFRpbWUsdGhpcy5jdXJyZW50TG9vcCxiKX1lbHNlIHRoaXMuY3VycmVudC5hcHBseShhLHRoaXMuY3VycmVudFRpbWUsdGhpcy5jdXJyZW50TG9vcCl9LGNsZWFyQW5pbWF0aW9uOmZ1bmN0aW9uKCl7dGhpcy5wcmV2aW91cz1udWxsLHRoaXMuY3VycmVudD1udWxsLHRoaXMucXVldWUubGVuZ3RoPTB9LF9zZXRBbmltYXRpb246ZnVuY3Rpb24oYSxiKXt0aGlzLnByZXZpb3VzPW51bGwsYSYmdGhpcy5jdXJyZW50JiYodGhpcy5taXhEdXJhdGlvbj10aGlzLmRhdGEuZ2V0TWl4KHRoaXMuY3VycmVudCxhKSx0aGlzLm1peER1cmF0aW9uPjAmJih0aGlzLm1peFRpbWU9MCx0aGlzLnByZXZpb3VzPXRoaXMuY3VycmVudCx0aGlzLnByZXZpb3VzVGltZT10aGlzLmN1cnJlbnRUaW1lLHRoaXMucHJldmlvdXNMb29wPXRoaXMuY3VycmVudExvb3ApKSx0aGlzLmN1cnJlbnQ9YSx0aGlzLmN1cnJlbnRMb29wPWIsdGhpcy5jdXJyZW50VGltZT0wfSxzZXRBbmltYXRpb25CeU5hbWU6ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWMpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dGhpcy5zZXRBbmltYXRpb24oYyxiKX0sc2V0QW5pbWF0aW9uOmZ1bmN0aW9uKGEsYil7dGhpcy5xdWV1ZS5sZW5ndGg9MCx0aGlzLl9zZXRBbmltYXRpb24oYSxiKX0sYWRkQW5pbWF0aW9uQnlOYW1lOmZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmRhdGEuc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oYSk7aWYoIWQpdGhyb3dcIkFuaW1hdGlvbiBub3QgZm91bmQ6IFwiK2E7dGhpcy5hZGRBbmltYXRpb24oZCxiLGMpfSxhZGRBbmltYXRpb246ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXt9O2lmKGQuYW5pbWF0aW9uPWEsZC5sb29wPWIsIWN8fDA+PWMpe3ZhciBlPXRoaXMucXVldWUubGVuZ3RoP3RoaXMucXVldWVbdGhpcy5xdWV1ZS5sZW5ndGgtMV0uYW5pbWF0aW9uOnRoaXMuY3VycmVudDtjPW51bGwhPWU/ZS5kdXJhdGlvbi10aGlzLmRhdGEuZ2V0TWl4KGUsYSkrKGN8fDApOjB9ZC5kZWxheT1jLHRoaXMucXVldWUucHVzaChkKX0saXNDb21wbGV0ZTpmdW5jdGlvbigpe3JldHVybiF0aGlzLmN1cnJlbnR8fHRoaXMuY3VycmVudFRpbWU+PXRoaXMuY3VycmVudC5kdXJhdGlvbn19LGYuU2tlbGV0b25Kc29uPWZ1bmN0aW9uKGEpe3RoaXMuYXR0YWNobWVudExvYWRlcj1hfSxmLlNrZWxldG9uSnNvbi5wcm90b3R5cGU9e3NjYWxlOjEscmVhZFNrZWxldG9uRGF0YTpmdW5jdGlvbihhKXtmb3IodmFyIGIsYz1uZXcgZi5Ta2VsZXRvbkRhdGEsZD1hLmJvbmVzLGU9MCxnPWQubGVuZ3RoO2c+ZTtlKyspe3ZhciBoPWRbZV0saT1udWxsO2lmKGgucGFyZW50JiYoaT1jLmZpbmRCb25lKGgucGFyZW50KSwhaSkpdGhyb3dcIlBhcmVudCBib25lIG5vdCBmb3VuZDogXCIraC5wYXJlbnQ7Yj1uZXcgZi5Cb25lRGF0YShoLm5hbWUsaSksYi5sZW5ndGg9KGgubGVuZ3RofHwwKSp0aGlzLnNjYWxlLGIueD0oaC54fHwwKSp0aGlzLnNjYWxlLGIueT0oaC55fHwwKSp0aGlzLnNjYWxlLGIucm90YXRpb249aC5yb3RhdGlvbnx8MCxiLnNjYWxlWD1oLnNjYWxlWHx8MSxiLnNjYWxlWT1oLnNjYWxlWXx8MSxjLmJvbmVzLnB1c2goYil9dmFyIGo9YS5zbG90cztmb3IoZT0wLGc9ai5sZW5ndGg7Zz5lO2UrKyl7dmFyIGs9altlXTtpZihiPWMuZmluZEJvbmUoay5ib25lKSwhYil0aHJvd1wiU2xvdCBib25lIG5vdCBmb3VuZDogXCIray5ib25lO3ZhciBsPW5ldyBmLlNsb3REYXRhKGsubmFtZSxiKSxtPWsuY29sb3I7bSYmKGwucj1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMCksbC5nPWYuU2tlbGV0b25Kc29uLnRvQ29sb3IobSwxKSxsLmI9Zi5Ta2VsZXRvbkpzb24udG9Db2xvcihtLDIpLGwuYT1mLlNrZWxldG9uSnNvbi50b0NvbG9yKG0sMykpLGwuYXR0YWNobWVudE5hbWU9ay5hdHRhY2htZW50LGMuc2xvdHMucHVzaChsKX12YXIgbj1hLnNraW5zO2Zvcih2YXIgbyBpbiBuKWlmKG4uaGFzT3duUHJvcGVydHkobykpe3ZhciBwPW5bb10scT1uZXcgZi5Ta2luKG8pO2Zvcih2YXIgciBpbiBwKWlmKHAuaGFzT3duUHJvcGVydHkocikpe3ZhciBzPWMuZmluZFNsb3RJbmRleChyKSx0PXBbcl07Zm9yKHZhciB1IGluIHQpaWYodC5oYXNPd25Qcm9wZXJ0eSh1KSl7dmFyIHY9dGhpcy5yZWFkQXR0YWNobWVudChxLHUsdFt1XSk7bnVsbCE9diYmcS5hZGRBdHRhY2htZW50KHMsdSx2KX19Yy5za2lucy5wdXNoKHEpLFwiZGVmYXVsdFwiPT1xLm5hbWUmJihjLmRlZmF1bHRTa2luPXEpfXZhciB3PWEuYW5pbWF0aW9ucztmb3IodmFyIHggaW4gdyl3Lmhhc093blByb3BlcnR5KHgpJiZ0aGlzLnJlYWRBbmltYXRpb24oeCx3W3hdLGMpO3JldHVybiBjfSxyZWFkQXR0YWNobWVudDpmdW5jdGlvbihhLGIsYyl7Yj1jLm5hbWV8fGI7dmFyIGQ9Zi5BdHRhY2htZW50VHlwZVtjLnR5cGV8fFwicmVnaW9uXCJdO2lmKGQ9PWYuQXR0YWNobWVudFR5cGUucmVnaW9uKXt2YXIgZT1uZXcgZi5SZWdpb25BdHRhY2htZW50O3JldHVybiBlLng9KGMueHx8MCkqdGhpcy5zY2FsZSxlLnk9KGMueXx8MCkqdGhpcy5zY2FsZSxlLnNjYWxlWD1jLnNjYWxlWHx8MSxlLnNjYWxlWT1jLnNjYWxlWXx8MSxlLnJvdGF0aW9uPWMucm90YXRpb258fDAsZS53aWR0aD0oYy53aWR0aHx8MzIpKnRoaXMuc2NhbGUsZS5oZWlnaHQ9KGMuaGVpZ2h0fHwzMikqdGhpcy5zY2FsZSxlLnVwZGF0ZU9mZnNldCgpLGUucmVuZGVyZXJPYmplY3Q9e30sZS5yZW5kZXJlck9iamVjdC5uYW1lPWIsZS5yZW5kZXJlck9iamVjdC5zY2FsZT17fSxlLnJlbmRlcmVyT2JqZWN0LnNjYWxlLng9ZS5zY2FsZVgsZS5yZW5kZXJlck9iamVjdC5zY2FsZS55PWUuc2NhbGVZLGUucmVuZGVyZXJPYmplY3Qucm90YXRpb249LWUucm90YXRpb24qTWF0aC5QSS8xODAsZX10aHJvd1wiVW5rbm93biBhdHRhY2htZW50IHR5cGU6IFwiK2R9LHJlYWRBbmltYXRpb246ZnVuY3Rpb24oYSxiLGMpe3ZhciBkLGUsZyxoLGksaixrLGw9W10sbT0wLG49Yi5ib25lcztmb3IodmFyIG8gaW4gbilpZihuLmhhc093blByb3BlcnR5KG8pKXt2YXIgcD1jLmZpbmRCb25lSW5kZXgobyk7aWYoLTE9PXApdGhyb3dcIkJvbmUgbm90IGZvdW5kOiBcIitvO3ZhciBxPW5bb107Zm9yKGcgaW4gcSlpZihxLmhhc093blByb3BlcnR5KGcpKWlmKGk9cVtnXSxcInJvdGF0ZVwiPT1nKXtmb3IoZT1uZXcgZi5Sb3RhdGVUaW1lbGluZShpLmxlbmd0aCksZS5ib25lSW5kZXg9cCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyloPWlbal0sZS5zZXRGcmFtZShkLGgudGltZSxoLmFuZ2xlKSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmUoZSxkLGgpLGQrKztsLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzWzIqZS5nZXRGcmFtZUNvdW50KCktMl0pfWVsc2V7aWYoXCJ0cmFuc2xhdGVcIiE9ZyYmXCJzY2FsZVwiIT1nKXRocm93XCJJbnZhbGlkIHRpbWVsaW5lIHR5cGUgZm9yIGEgYm9uZTogXCIrZytcIiAoXCIrbytcIilcIjt2YXIgcj0xO2ZvcihcInNjYWxlXCI9PWc/ZT1uZXcgZi5TY2FsZVRpbWVsaW5lKGkubGVuZ3RoKTooZT1uZXcgZi5UcmFuc2xhdGVUaW1lbGluZShpLmxlbmd0aCkscj10aGlzLnNjYWxlKSxlLmJvbmVJbmRleD1wLGQ9MCxqPTAsaz1pLmxlbmd0aDtrPmo7aisrKXtoPWlbal07dmFyIHM9KGgueHx8MCkqcix0PShoLnl8fDApKnI7ZS5zZXRGcmFtZShkLGgudGltZSxzLHQpLGYuU2tlbGV0b25Kc29uLnJlYWRDdXJ2ZShlLGQsaCksZCsrfWwucHVzaChlKSxtPU1hdGgubWF4KG0sZS5mcmFtZXNbMyplLmdldEZyYW1lQ291bnQoKS0zXSl9fXZhciB1PWIuc2xvdHM7Zm9yKHZhciB2IGluIHUpaWYodS5oYXNPd25Qcm9wZXJ0eSh2KSl7dmFyIHc9dVt2XSx4PWMuZmluZFNsb3RJbmRleCh2KTtmb3IoZyBpbiB3KWlmKHcuaGFzT3duUHJvcGVydHkoZykpaWYoaT13W2ddLFwiY29sb3JcIj09Zyl7Zm9yKGU9bmV3IGYuQ29sb3JUaW1lbGluZShpLmxlbmd0aCksZS5zbG90SW5kZXg9eCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyl7aD1pW2pdO3ZhciB5PWguY29sb3Isej1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMCksQT1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMSksQj1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMiksQz1mLlNrZWxldG9uSnNvbi50b0NvbG9yKHksMyk7ZS5zZXRGcmFtZShkLGgudGltZSx6LEEsQixDKSxmLlNrZWxldG9uSnNvbi5yZWFkQ3VydmUoZSxkLGgpLGQrK31sLnB1c2goZSksbT1NYXRoLm1heChtLGUuZnJhbWVzWzUqZS5nZXRGcmFtZUNvdW50KCktNV0pfWVsc2V7aWYoXCJhdHRhY2htZW50XCIhPWcpdGhyb3dcIkludmFsaWQgdGltZWxpbmUgdHlwZSBmb3IgYSBzbG90OiBcIitnK1wiIChcIit2K1wiKVwiO2ZvcihlPW5ldyBmLkF0dGFjaG1lbnRUaW1lbGluZShpLmxlbmd0aCksZS5zbG90SW5kZXg9eCxkPTAsaj0wLGs9aS5sZW5ndGg7az5qO2orKyloPWlbal0sZS5zZXRGcmFtZShkKyssaC50aW1lLGgubmFtZSk7bC5wdXNoKGUpLG09TWF0aC5tYXgobSxlLmZyYW1lc1tlLmdldEZyYW1lQ291bnQoKS0xXSl9fWMuYW5pbWF0aW9ucy5wdXNoKG5ldyBmLkFuaW1hdGlvbihhLGwsbSkpfX0sZi5Ta2VsZXRvbkpzb24ucmVhZEN1cnZlPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1jLmN1cnZlO2QmJihcInN0ZXBwZWRcIj09ZD9hLmN1cnZlcy5zZXRTdGVwcGVkKGIpOmQgaW5zdGFuY2VvZiBBcnJheSYmYS5jdXJ2ZXMuc2V0Q3VydmUoYixkWzBdLGRbMV0sZFsyXSxkWzNdKSl9LGYuU2tlbGV0b25Kc29uLnRvQ29sb3I9ZnVuY3Rpb24oYSxiKXtpZig4IT1hLmxlbmd0aCl0aHJvd1wiQ29sb3IgaGV4aWRlY2ltYWwgbGVuZ3RoIG11c3QgYmUgOCwgcmVjaWV2ZWQ6IFwiK2E7cmV0dXJuIHBhcnNlSW50KGEuc3Vic3RyKDIqYiwyKSwxNikvMjU1fSxmLkF0bGFzPWZ1bmN0aW9uKGEsYil7dGhpcy50ZXh0dXJlTG9hZGVyPWIsdGhpcy5wYWdlcz1bXSx0aGlzLnJlZ2lvbnM9W107dmFyIGM9bmV3IGYuQXRsYXNSZWFkZXIoYSksZD1bXTtkLmxlbmd0aD00O2Zvcih2YXIgZT1udWxsOzspe3ZhciBnPWMucmVhZExpbmUoKTtpZihudWxsPT1nKWJyZWFrO2lmKGc9Yy50cmltKGcpLGcubGVuZ3RoKWlmKGUpe3ZhciBoPW5ldyBmLkF0bGFzUmVnaW9uO2gubmFtZT1nLGgucGFnZT1lLGgucm90YXRlPVwidHJ1ZVwiPT1jLnJlYWRWYWx1ZSgpLGMucmVhZFR1cGxlKGQpO3ZhciBpPXBhcnNlSW50KGRbMF0sMTApLGo9cGFyc2VJbnQoZFsxXSwxMCk7Yy5yZWFkVHVwbGUoZCk7dmFyIGs9cGFyc2VJbnQoZFswXSwxMCksbD1wYXJzZUludChkWzFdLDEwKTtoLnU9aS9lLndpZHRoLGgudj1qL2UuaGVpZ2h0LGgucm90YXRlPyhoLnUyPShpK2wpL2Uud2lkdGgsaC52Mj0oaitrKS9lLmhlaWdodCk6KGgudTI9KGkraykvZS53aWR0aCxoLnYyPShqK2wpL2UuaGVpZ2h0KSxoLng9aSxoLnk9aixoLndpZHRoPU1hdGguYWJzKGspLGguaGVpZ2h0PU1hdGguYWJzKGwpLDQ9PWMucmVhZFR1cGxlKGQpJiYoaC5zcGxpdHM9W3BhcnNlSW50KGRbMF0sMTApLHBhcnNlSW50KGRbMV0sMTApLHBhcnNlSW50KGRbMl0sMTApLHBhcnNlSW50KGRbM10sMTApXSw0PT1jLnJlYWRUdXBsZShkKSYmKGgucGFkcz1bcGFyc2VJbnQoZFswXSwxMCkscGFyc2VJbnQoZFsxXSwxMCkscGFyc2VJbnQoZFsyXSwxMCkscGFyc2VJbnQoZFszXSwxMCldLGMucmVhZFR1cGxlKGQpKSksaC5vcmlnaW5hbFdpZHRoPXBhcnNlSW50KGRbMF0sMTApLGgub3JpZ2luYWxIZWlnaHQ9cGFyc2VJbnQoZFsxXSwxMCksYy5yZWFkVHVwbGUoZCksaC5vZmZzZXRYPXBhcnNlSW50KGRbMF0sMTApLGgub2Zmc2V0WT1wYXJzZUludChkWzFdLDEwKSxoLmluZGV4PXBhcnNlSW50KGMucmVhZFZhbHVlKCksMTApLHRoaXMucmVnaW9ucy5wdXNoKGgpfWVsc2V7ZT1uZXcgZi5BdGxhc1BhZ2UsZS5uYW1lPWcsZS5mb3JtYXQ9Zi5BdGxhcy5Gb3JtYXRbYy5yZWFkVmFsdWUoKV0sYy5yZWFkVHVwbGUoZCksZS5taW5GaWx0ZXI9Zi5BdGxhcy5UZXh0dXJlRmlsdGVyW2RbMF1dLGUubWFnRmlsdGVyPWYuQXRsYXMuVGV4dHVyZUZpbHRlcltkWzFdXTt2YXIgbT1jLnJlYWRWYWx1ZSgpO2UudVdyYXA9Zi5BdGxhcy5UZXh0dXJlV3JhcC5jbGFtcFRvRWRnZSxlLnZXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAuY2xhbXBUb0VkZ2UsXCJ4XCI9PW0/ZS51V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdDpcInlcIj09bT9lLnZXcmFwPWYuQXRsYXMuVGV4dHVyZVdyYXAucmVwZWF0OlwieHlcIj09bSYmKGUudVdyYXA9ZS52V3JhcD1mLkF0bGFzLlRleHR1cmVXcmFwLnJlcGVhdCksYi5sb2FkKGUsZyksdGhpcy5wYWdlcy5wdXNoKGUpfWVsc2UgZT1udWxsfX0sZi5BdGxhcy5wcm90b3R5cGU9e2ZpbmRSZWdpb246ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPXRoaXMucmVnaW9ucyxjPTAsZD1iLmxlbmd0aDtkPmM7YysrKWlmKGJbY10ubmFtZT09YSlyZXR1cm4gYltjXTtyZXR1cm4gbnVsbH0sZGlzcG9zZTpmdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLnBhZ2VzLGI9MCxjPWEubGVuZ3RoO2M+YjtiKyspdGhpcy50ZXh0dXJlTG9hZGVyLnVubG9hZChhW2JdLnJlbmRlcmVyT2JqZWN0KX0sdXBkYXRlVVZzOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYj10aGlzLnJlZ2lvbnMsYz0wLGQ9Yi5sZW5ndGg7ZD5jO2MrKyl7dmFyIGU9YltjXTtlLnBhZ2U9PWEmJihlLnU9ZS54L2Eud2lkdGgsZS52PWUueS9hLmhlaWdodCxlLnJvdGF0ZT8oZS51Mj0oZS54K2UuaGVpZ2h0KS9hLndpZHRoLGUudjI9KGUueStlLndpZHRoKS9hLmhlaWdodCk6KGUudTI9KGUueCtlLndpZHRoKS9hLndpZHRoLGUudjI9KGUueStlLmhlaWdodCkvYS5oZWlnaHQpKX19fSxmLkF0bGFzLkZvcm1hdD17YWxwaGE6MCxpbnRlbnNpdHk6MSxsdW1pbmFuY2VBbHBoYToyLHJnYjU2NTozLHJnYmE0NDQ0OjQscmdiODg4OjUscmdiYTg4ODg6Nn0sZi5BdGxhcy5UZXh0dXJlRmlsdGVyPXtuZWFyZXN0OjAsbGluZWFyOjEsbWlwTWFwOjIsbWlwTWFwTmVhcmVzdE5lYXJlc3Q6MyxtaXBNYXBMaW5lYXJOZWFyZXN0OjQsbWlwTWFwTmVhcmVzdExpbmVhcjo1LG1pcE1hcExpbmVhckxpbmVhcjo2fSxmLkF0bGFzLlRleHR1cmVXcmFwPXttaXJyb3JlZFJlcGVhdDowLGNsYW1wVG9FZGdlOjEscmVwZWF0OjJ9LGYuQXRsYXNQYWdlPWZ1bmN0aW9uKCl7fSxmLkF0bGFzUGFnZS5wcm90b3R5cGU9e25hbWU6bnVsbCxmb3JtYXQ6bnVsbCxtaW5GaWx0ZXI6bnVsbCxtYWdGaWx0ZXI6bnVsbCx1V3JhcDpudWxsLHZXcmFwOm51bGwscmVuZGVyZXJPYmplY3Q6bnVsbCx3aWR0aDowLGhlaWdodDowfSxmLkF0bGFzUmVnaW9uPWZ1bmN0aW9uKCl7fSxmLkF0bGFzUmVnaW9uLnByb3RvdHlwZT17cGFnZTpudWxsLG5hbWU6bnVsbCx4OjAseTowLHdpZHRoOjAsaGVpZ2h0OjAsdTowLHY6MCx1MjowLHYyOjAsb2Zmc2V0WDowLG9mZnNldFk6MCxvcmlnaW5hbFdpZHRoOjAsb3JpZ2luYWxIZWlnaHQ6MCxpbmRleDowLHJvdGF0ZTohMSxzcGxpdHM6bnVsbCxwYWRzOm51bGx9LGYuQXRsYXNSZWFkZXI9ZnVuY3Rpb24oYSl7dGhpcy5saW5lcz1hLnNwbGl0KC9cXHJcXG58XFxyfFxcbi8pfSxmLkF0bGFzUmVhZGVyLnByb3RvdHlwZT17aW5kZXg6MCx0cmltOmZ1bmN0aW9uKGEpe3JldHVybiBhLnJlcGxhY2UoL15cXHMrfFxccyskL2csXCJcIil9LHJlYWRMaW5lOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaW5kZXg+PXRoaXMubGluZXMubGVuZ3RoP251bGw6dGhpcy5saW5lc1t0aGlzLmluZGV4KytdfSxyZWFkVmFsdWU6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLnJlYWRMaW5lKCksYj1hLmluZGV4T2YoXCI6XCIpO2lmKC0xPT1iKXRocm93XCJJbnZhbGlkIGxpbmU6IFwiK2E7cmV0dXJuIHRoaXMudHJpbShhLnN1YnN0cmluZyhiKzEpKX0scmVhZFR1cGxlOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMucmVhZExpbmUoKSxjPWIuaW5kZXhPZihcIjpcIik7aWYoLTE9PWMpdGhyb3dcIkludmFsaWQgbGluZTogXCIrYjtmb3IodmFyIGQ9MCxlPWMrMTszPmQ7ZCsrKXt2YXIgZj1iLmluZGV4T2YoXCIsXCIsZSk7aWYoLTE9PWYpe2lmKCFkKXRocm93XCJJbnZhbGlkIGxpbmU6IFwiK2I7YnJlYWt9YVtkXT10aGlzLnRyaW0oYi5zdWJzdHIoZSxmLWUpKSxlPWYrMX1yZXR1cm4gYVtkXT10aGlzLnRyaW0oYi5zdWJzdHJpbmcoZSkpLGQrMX19LGYuQXRsYXNBdHRhY2htZW50TG9hZGVyPWZ1bmN0aW9uKGEpe3RoaXMuYXRsYXM9YX0sZi5BdGxhc0F0dGFjaG1lbnRMb2FkZXIucHJvdG90eXBlPXtuZXdBdHRhY2htZW50OmZ1bmN0aW9uKGEsYixjKXtzd2l0Y2goYil7Y2FzZSBmLkF0dGFjaG1lbnRUeXBlLnJlZ2lvbjp2YXIgZD10aGlzLmF0bGFzLmZpbmRSZWdpb24oYyk7aWYoIWQpdGhyb3dcIlJlZ2lvbiBub3QgZm91bmQgaW4gYXRsYXM6IFwiK2MrXCIgKFwiK2IrXCIpXCI7dmFyIGU9bmV3IGYuUmVnaW9uQXR0YWNobWVudChjKTtyZXR1cm4gZS5yZW5kZXJlck9iamVjdD1kLGUuc2V0VVZzKGQudSxkLnYsZC51MixkLnYyLGQucm90YXRlKSxlLnJlZ2lvbk9mZnNldFg9ZC5vZmZzZXRYLGUucmVnaW9uT2Zmc2V0WT1kLm9mZnNldFksZS5yZWdpb25XaWR0aD1kLndpZHRoLGUucmVnaW9uSGVpZ2h0PWQuaGVpZ2h0LGUucmVnaW9uT3JpZ2luYWxXaWR0aD1kLm9yaWdpbmFsV2lkdGgsZS5yZWdpb25PcmlnaW5hbEhlaWdodD1kLm9yaWdpbmFsSGVpZ2h0LGV9dGhyb3dcIlVua25vd24gYXR0YWNobWVudCB0eXBlOiBcIitifX0sZi5Cb25lLnlEb3duPSEwLGIuQW5pbUNhY2hlPXt9LGIuU3BpbmU9ZnVuY3Rpb24oYSl7aWYoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyksdGhpcy5zcGluZURhdGE9Yi5BbmltQ2FjaGVbYV0sIXRoaXMuc3BpbmVEYXRhKXRocm93IG5ldyBFcnJvcihcIlNwaW5lIGRhdGEgbXVzdCBiZSBwcmVsb2FkZWQgdXNpbmcgUElYSS5TcGluZUxvYWRlciBvciBQSVhJLkFzc2V0TG9hZGVyOiBcIithKTt0aGlzLnNrZWxldG9uPW5ldyBmLlNrZWxldG9uKHRoaXMuc3BpbmVEYXRhKSx0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCksdGhpcy5zdGF0ZURhdGE9bmV3IGYuQW5pbWF0aW9uU3RhdGVEYXRhKHRoaXMuc3BpbmVEYXRhKSx0aGlzLnN0YXRlPW5ldyBmLkFuaW1hdGlvblN0YXRlKHRoaXMuc3RhdGVEYXRhKSx0aGlzLnNsb3RDb250YWluZXJzPVtdO2Zvcih2YXIgYz0wLGQ9dGhpcy5za2VsZXRvbi5kcmF3T3JkZXIubGVuZ3RoO2Q+YztjKyspe3ZhciBlPXRoaXMuc2tlbGV0b24uZHJhd09yZGVyW2NdLGc9ZS5hdHRhY2htZW50LGg9bmV3IGIuRGlzcGxheU9iamVjdENvbnRhaW5lcjtpZih0aGlzLnNsb3RDb250YWluZXJzLnB1c2goaCksdGhpcy5hZGRDaGlsZChoKSxnIGluc3RhbmNlb2YgZi5SZWdpb25BdHRhY2htZW50KXt2YXIgaT1nLnJlbmRlcmVyT2JqZWN0Lm5hbWUsaj10aGlzLmNyZWF0ZVNwcml0ZShlLGcucmVuZGVyZXJPYmplY3QpO2UuY3VycmVudFNwcml0ZT1qLGUuY3VycmVudFNwcml0ZU5hbWU9aSxoLmFkZENoaWxkKGopfX19LGIuU3BpbmUucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLnByb3RvdHlwZSksYi5TcGluZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcGluZSxiLlNwaW5lLnByb3RvdHlwZS51cGRhdGVUcmFuc2Zvcm09ZnVuY3Rpb24oKXt0aGlzLmxhc3RUaW1lPXRoaXMubGFzdFRpbWV8fERhdGUubm93KCk7dmFyIGE9LjAwMSooRGF0ZS5ub3coKS10aGlzLmxhc3RUaW1lKTt0aGlzLmxhc3RUaW1lPURhdGUubm93KCksdGhpcy5zdGF0ZS51cGRhdGUoYSksdGhpcy5zdGF0ZS5hcHBseSh0aGlzLnNrZWxldG9uKSx0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKCk7Zm9yKHZhciBjPXRoaXMuc2tlbGV0b24uZHJhd09yZGVyLGQ9MCxlPWMubGVuZ3RoO2U+ZDtkKyspe3ZhciBnPWNbZF0saD1nLmF0dGFjaG1lbnQsaT10aGlzLnNsb3RDb250YWluZXJzW2RdO2lmKGggaW5zdGFuY2VvZiBmLlJlZ2lvbkF0dGFjaG1lbnQpe2lmKGgucmVuZGVyZXJPYmplY3QmJighZy5jdXJyZW50U3ByaXRlTmFtZXx8Zy5jdXJyZW50U3ByaXRlTmFtZSE9aC5uYW1lKSl7dmFyIGo9aC5yZW5kZXJlck9iamVjdC5uYW1lO2lmKHZvaWQgMCE9PWcuY3VycmVudFNwcml0ZSYmKGcuY3VycmVudFNwcml0ZS52aXNpYmxlPSExKSxnLnNwcml0ZXM9Zy5zcHJpdGVzfHx7fSx2b2lkIDAhPT1nLnNwcml0ZXNbal0pZy5zcHJpdGVzW2pdLnZpc2libGU9ITA7ZWxzZXt2YXIgaz10aGlzLmNyZWF0ZVNwcml0ZShnLGgucmVuZGVyZXJPYmplY3QpO2kuYWRkQ2hpbGQoayl9Zy5jdXJyZW50U3ByaXRlPWcuc3ByaXRlc1tqXSxnLmN1cnJlbnRTcHJpdGVOYW1lPWp9aS52aXNpYmxlPSEwO3ZhciBsPWcuYm9uZTtpLnBvc2l0aW9uLng9bC53b3JsZFgraC54KmwubTAwK2gueSpsLm0wMSxpLnBvc2l0aW9uLnk9bC53b3JsZFkraC54KmwubTEwK2gueSpsLm0xMSxpLnNjYWxlLng9bC53b3JsZFNjYWxlWCxpLnNjYWxlLnk9bC53b3JsZFNjYWxlWSxpLnJvdGF0aW9uPS0oZy5ib25lLndvcmxkUm90YXRpb24qTWF0aC5QSS8xODApLGkuYWxwaGE9Zy5hLGcuY3VycmVudFNwcml0ZS50aW50PWIucmdiMmhleChbZy5yLGcuZyxnLmJdKX1lbHNlIGkudmlzaWJsZT0hMX1iLkRpc3BsYXlPYmplY3RDb250YWluZXIucHJvdG90eXBlLnVwZGF0ZVRyYW5zZm9ybS5jYWxsKHRoaXMpfSxiLlNwaW5lLnByb3RvdHlwZS5jcmVhdGVTcHJpdGU9ZnVuY3Rpb24oYSxjKXt2YXIgZD1iLlRleHR1cmVDYWNoZVtjLm5hbWVdP2MubmFtZTpjLm5hbWUrXCIucG5nXCIsZT1uZXcgYi5TcHJpdGUoYi5UZXh0dXJlLmZyb21GcmFtZShkKSk7cmV0dXJuIGUuc2NhbGU9Yy5zY2FsZSxlLnJvdGF0aW9uPWMucm90YXRpb24sZS5hbmNob3IueD1lLmFuY2hvci55PS41LGEuc3ByaXRlcz1hLnNwcml0ZXN8fHt9LGEuc3ByaXRlc1tjLm5hbWVdPWUsZX0sYi5CYXNlVGV4dHVyZUNhY2hlPXt9LGIudGV4dHVyZXNUb1VwZGF0ZT1bXSxiLnRleHR1cmVzVG9EZXN0cm95PVtdLGIuQmFzZVRleHR1cmVDYWNoZUlkR2VuZXJhdG9yPTAsYi5CYXNlVGV4dHVyZT1mdW5jdGlvbihhLGMpe2lmKGIuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLndpZHRoPTEwMCx0aGlzLmhlaWdodD0xMDAsdGhpcy5zY2FsZU1vZGU9Y3x8Yi5zY2FsZU1vZGVzLkRFRkFVTFQsdGhpcy5oYXNMb2FkZWQ9ITEsdGhpcy5zb3VyY2U9YSx0aGlzLmlkPWIuQmFzZVRleHR1cmVDYWNoZUlkR2VuZXJhdG9yKyssdGhpcy5wcmVtdWx0aXBsaWVkQWxwaGE9ITAsdGhpcy5fZ2xUZXh0dXJlcz1bXSx0aGlzLl9kaXJ0eT1bXSxhKXtpZigodGhpcy5zb3VyY2UuY29tcGxldGV8fHRoaXMuc291cmNlLmdldENvbnRleHQpJiZ0aGlzLnNvdXJjZS53aWR0aCYmdGhpcy5zb3VyY2UuaGVpZ2h0KXRoaXMuaGFzTG9hZGVkPSEwLHRoaXMud2lkdGg9dGhpcy5zb3VyY2Uud2lkdGgsdGhpcy5oZWlnaHQ9dGhpcy5zb3VyY2UuaGVpZ2h0LGIudGV4dHVyZXNUb1VwZGF0ZS5wdXNoKHRoaXMpO2Vsc2V7dmFyIGQ9dGhpczt0aGlzLnNvdXJjZS5vbmxvYWQ9ZnVuY3Rpb24oKXtkLmhhc0xvYWRlZD0hMCxkLndpZHRoPWQuc291cmNlLndpZHRoLGQuaGVpZ2h0PWQuc291cmNlLmhlaWdodDtmb3IodmFyIGE9MDthPGQuX2dsVGV4dHVyZXMubGVuZ3RoO2ErKylkLl9kaXJ0eVthXT0hMDtkLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OmR9KX0sdGhpcy5zb3VyY2Uub25lcnJvcj1mdW5jdGlvbigpe2QuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImVycm9yXCIsY29udGVudDpkfSl9fXRoaXMuaW1hZ2VVcmw9bnVsbCx0aGlzLl9wb3dlck9mMj0hMX19LGIuQmFzZVRleHR1cmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmFzZVRleHR1cmUsYi5CYXNlVGV4dHVyZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuaW1hZ2VVcmw/KGRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbdGhpcy5pbWFnZVVybF0sZGVsZXRlIGIuVGV4dHVyZUNhY2hlW3RoaXMuaW1hZ2VVcmxdLHRoaXMuaW1hZ2VVcmw9bnVsbCx0aGlzLnNvdXJjZS5zcmM9bnVsbCk6dGhpcy5zb3VyY2UmJnRoaXMuc291cmNlLl9waXhpSWQmJmRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbdGhpcy5zb3VyY2UuX3BpeGlJZF0sdGhpcy5zb3VyY2U9bnVsbCxiLnRleHR1cmVzVG9EZXN0cm95LnB1c2godGhpcyl9LGIuQmFzZVRleHR1cmUucHJvdG90eXBlLnVwZGF0ZVNvdXJjZUltYWdlPWZ1bmN0aW9uKGEpe3RoaXMuaGFzTG9hZGVkPSExLHRoaXMuc291cmNlLnNyYz1udWxsLHRoaXMuc291cmNlLnNyYz1hfSxiLkJhc2VUZXh0dXJlLmZyb21JbWFnZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5CYXNlVGV4dHVyZUNhY2hlW2FdO2lmKHZvaWQgMD09PWMmJi0xPT09YS5pbmRleE9mKFwiZGF0YTpcIikmJihjPSEwKSwhZSl7dmFyIGY9bmV3IEltYWdlO2MmJihmLmNyb3NzT3JpZ2luPVwiXCIpLGYuc3JjPWEsZT1uZXcgYi5CYXNlVGV4dHVyZShmLGQpLGUuaW1hZ2VVcmw9YSxiLkJhc2VUZXh0dXJlQ2FjaGVbYV09ZX1yZXR1cm4gZX0sYi5CYXNlVGV4dHVyZS5mcm9tQ2FudmFzPWZ1bmN0aW9uKGEsYyl7YS5fcGl4aUlkfHwoYS5fcGl4aUlkPVwiY2FudmFzX1wiK2IuVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3IrKyk7dmFyIGQ9Yi5CYXNlVGV4dHVyZUNhY2hlW2EuX3BpeGlJZF07cmV0dXJuIGR8fChkPW5ldyBiLkJhc2VUZXh0dXJlKGEsYyksYi5CYXNlVGV4dHVyZUNhY2hlW2EuX3BpeGlJZF09ZCksZH0sYi5UZXh0dXJlQ2FjaGU9e30sYi5GcmFtZUNhY2hlPXt9LGIuVGV4dHVyZUNhY2hlSWRHZW5lcmF0b3I9MCxiLlRleHR1cmU9ZnVuY3Rpb24oYSxjKXtpZihiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy5ub0ZyYW1lPSExLGN8fCh0aGlzLm5vRnJhbWU9ITAsYz1uZXcgYi5SZWN0YW5nbGUoMCwwLDEsMSkpLGEgaW5zdGFuY2VvZiBiLlRleHR1cmUmJihhPWEuYmFzZVRleHR1cmUpLHRoaXMuYmFzZVRleHR1cmU9YSx0aGlzLmZyYW1lPWMsdGhpcy50cmltPW51bGwsdGhpcy52YWxpZD0hMSx0aGlzLnNjb3BlPXRoaXMsdGhpcy5fdXZzPW51bGwsdGhpcy53aWR0aD0wLHRoaXMuaGVpZ2h0PTAsdGhpcy5jcm9wPW5ldyBiLlJlY3RhbmdsZSgwLDAsMSwxKSxhLmhhc0xvYWRlZCl0aGlzLm5vRnJhbWUmJihjPW5ldyBiLlJlY3RhbmdsZSgwLDAsYS53aWR0aCxhLmhlaWdodCkpLHRoaXMuc2V0RnJhbWUoYyk7ZWxzZXt2YXIgZD10aGlzO2EuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7ZC5vbkJhc2VUZXh0dXJlTG9hZGVkKCl9KX19LGIuVGV4dHVyZS5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5UZXh0dXJlLGIuVGV4dHVyZS5wcm90b3R5cGUub25CYXNlVGV4dHVyZUxvYWRlZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMuYmFzZVRleHR1cmU7YS5yZW1vdmVFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsdGhpcy5vbkxvYWRlZCksdGhpcy5ub0ZyYW1lJiYodGhpcy5mcmFtZT1uZXcgYi5SZWN0YW5nbGUoMCwwLGEud2lkdGgsYS5oZWlnaHQpKSx0aGlzLnNldEZyYW1lKHRoaXMuZnJhbWUpLHRoaXMuc2NvcGUuZGlzcGF0Y2hFdmVudCh7dHlwZTpcInVwZGF0ZVwiLGNvbnRlbnQ6dGhpc30pfSxiLlRleHR1cmUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oYSl7YSYmdGhpcy5iYXNlVGV4dHVyZS5kZXN0cm95KCksdGhpcy52YWxpZD0hMX0sYi5UZXh0dXJlLnByb3RvdHlwZS5zZXRGcmFtZT1mdW5jdGlvbihhKXtpZih0aGlzLm5vRnJhbWU9ITEsdGhpcy5mcmFtZT1hLHRoaXMud2lkdGg9YS53aWR0aCx0aGlzLmhlaWdodD1hLmhlaWdodCx0aGlzLmNyb3AueD1hLngsdGhpcy5jcm9wLnk9YS55LHRoaXMuY3JvcC53aWR0aD1hLndpZHRoLHRoaXMuY3JvcC5oZWlnaHQ9YS5oZWlnaHQsIXRoaXMudHJpbSYmKGEueCthLndpZHRoPnRoaXMuYmFzZVRleHR1cmUud2lkdGh8fGEueSthLmhlaWdodD50aGlzLmJhc2VUZXh0dXJlLmhlaWdodCkpdGhyb3cgbmV3IEVycm9yKFwiVGV4dHVyZSBFcnJvcjogZnJhbWUgZG9lcyBub3QgZml0IGluc2lkZSB0aGUgYmFzZSBUZXh0dXJlIGRpbWVuc2lvbnMgXCIrdGhpcyk7dGhpcy52YWxpZD1hJiZhLndpZHRoJiZhLmhlaWdodCYmdGhpcy5iYXNlVGV4dHVyZS5zb3VyY2UmJnRoaXMuYmFzZVRleHR1cmUuaGFzTG9hZGVkLHRoaXMudHJpbSYmKHRoaXMud2lkdGg9dGhpcy50cmltLndpZHRoLHRoaXMuaGVpZ2h0PXRoaXMudHJpbS5oZWlnaHQsdGhpcy5mcmFtZS53aWR0aD10aGlzLnRyaW0ud2lkdGgsdGhpcy5mcmFtZS5oZWlnaHQ9dGhpcy50cmltLmhlaWdodCksdGhpcy52YWxpZCYmYi5UZXh0dXJlLmZyYW1lVXBkYXRlcy5wdXNoKHRoaXMpfSxiLlRleHR1cmUucHJvdG90eXBlLl91cGRhdGVXZWJHTHV2cz1mdW5jdGlvbigpe3RoaXMuX3V2c3x8KHRoaXMuX3V2cz1uZXcgYi5UZXh0dXJlVXZzKTt2YXIgYT10aGlzLmNyb3AsYz10aGlzLmJhc2VUZXh0dXJlLndpZHRoLGQ9dGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQ7dGhpcy5fdXZzLngwPWEueC9jLHRoaXMuX3V2cy55MD1hLnkvZCx0aGlzLl91dnMueDE9KGEueCthLndpZHRoKS9jLHRoaXMuX3V2cy55MT1hLnkvZCx0aGlzLl91dnMueDI9KGEueCthLndpZHRoKS9jLHRoaXMuX3V2cy55Mj0oYS55K2EuaGVpZ2h0KS9kLHRoaXMuX3V2cy54Mz1hLngvYyx0aGlzLl91dnMueTM9KGEueSthLmhlaWdodCkvZH0sYi5UZXh0dXJlLmZyb21JbWFnZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9Yi5UZXh0dXJlQ2FjaGVbYV07cmV0dXJuIGV8fChlPW5ldyBiLlRleHR1cmUoYi5CYXNlVGV4dHVyZS5mcm9tSW1hZ2UoYSxjLGQpKSxiLlRleHR1cmVDYWNoZVthXT1lKSxlfSxiLlRleHR1cmUuZnJvbUZyYW1lPWZ1bmN0aW9uKGEpe3ZhciBjPWIuVGV4dHVyZUNhY2hlW2FdO2lmKCFjKXRocm93IG5ldyBFcnJvcignVGhlIGZyYW1lSWQgXCInK2ErJ1wiIGRvZXMgbm90IGV4aXN0IGluIHRoZSB0ZXh0dXJlIGNhY2hlICcpO3JldHVybiBjfSxiLlRleHR1cmUuZnJvbUNhbnZhcz1mdW5jdGlvbihhLGMpe3ZhciBkPWIuQmFzZVRleHR1cmUuZnJvbUNhbnZhcyhhLGMpO3JldHVybiBuZXcgYi5UZXh0dXJlKGQpfSxiLlRleHR1cmUuYWRkVGV4dHVyZVRvQ2FjaGU9ZnVuY3Rpb24oYSxjKXtiLlRleHR1cmVDYWNoZVtjXT1hfSxiLlRleHR1cmUucmVtb3ZlVGV4dHVyZUZyb21DYWNoZT1mdW5jdGlvbihhKXt2YXIgYz1iLlRleHR1cmVDYWNoZVthXTtyZXR1cm4gZGVsZXRlIGIuVGV4dHVyZUNhY2hlW2FdLGRlbGV0ZSBiLkJhc2VUZXh0dXJlQ2FjaGVbYV0sY30sYi5UZXh0dXJlLmZyYW1lVXBkYXRlcz1bXSxiLlRleHR1cmVVdnM9ZnVuY3Rpb24oKXt0aGlzLngwPTAsdGhpcy55MD0wLHRoaXMueDE9MCx0aGlzLnkxPTAsdGhpcy54Mj0wLHRoaXMueTI9MCx0aGlzLngzPTAsdGhpcy55Mz0wfSxiLlJlbmRlclRleHR1cmU9ZnVuY3Rpb24oYSxjLGQsZSl7aWYoYi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMud2lkdGg9YXx8MTAwLHRoaXMuaGVpZ2h0PWN8fDEwMCx0aGlzLmZyYW1lPW5ldyBiLlJlY3RhbmdsZSgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5jcm9wPW5ldyBiLlJlY3RhbmdsZSgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksdGhpcy5iYXNlVGV4dHVyZT1uZXcgYi5CYXNlVGV4dHVyZSx0aGlzLmJhc2VUZXh0dXJlLndpZHRoPXRoaXMud2lkdGgsdGhpcy5iYXNlVGV4dHVyZS5oZWlnaHQ9dGhpcy5oZWlnaHQsdGhpcy5iYXNlVGV4dHVyZS5fZ2xUZXh0dXJlcz1bXSx0aGlzLmJhc2VUZXh0dXJlLnNjYWxlTW9kZT1lfHxiLnNjYWxlTW9kZXMuREVGQVVMVCx0aGlzLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD0hMCx0aGlzLnJlbmRlcmVyPWR8fGIuZGVmYXVsdFJlbmRlcmVyLHRoaXMucmVuZGVyZXIudHlwZT09PWIuV0VCR0xfUkVOREVSRVIpe3ZhciBmPXRoaXMucmVuZGVyZXIuZ2w7dGhpcy50ZXh0dXJlQnVmZmVyPW5ldyBiLkZpbHRlclRleHR1cmUoZix0aGlzLndpZHRoLHRoaXMuaGVpZ2h0LHRoaXMuYmFzZVRleHR1cmUuc2NhbGVNb2RlKSx0aGlzLmJhc2VUZXh0dXJlLl9nbFRleHR1cmVzW2YuaWRdPXRoaXMudGV4dHVyZUJ1ZmZlci50ZXh0dXJlLHRoaXMucmVuZGVyPXRoaXMucmVuZGVyV2ViR0wsdGhpcy5wcm9qZWN0aW9uPW5ldyBiLlBvaW50KHRoaXMud2lkdGgvMiwtdGhpcy5oZWlnaHQvMil9ZWxzZSB0aGlzLnJlbmRlcj10aGlzLnJlbmRlckNhbnZhcyx0aGlzLnRleHR1cmVCdWZmZXI9bmV3IGIuQ2FudmFzQnVmZmVyKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpLHRoaXMuYmFzZVRleHR1cmUuc291cmNlPXRoaXMudGV4dHVyZUJ1ZmZlci5jYW52YXM7dGhpcy52YWxpZD0hMCxiLlRleHR1cmUuZnJhbWVVcGRhdGVzLnB1c2godGhpcyl9LGIuUmVuZGVyVGV4dHVyZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLlRleHR1cmUucHJvdG90eXBlKSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUmVuZGVyVGV4dHVyZSxiLlJlbmRlclRleHR1cmUucHJvdG90eXBlLnJlc2l6ZT1mdW5jdGlvbihhLGMsZCl7KGEhPT10aGlzLndpZHRofHxjIT09dGhpcy5oZWlnaHQpJiYodGhpcy53aWR0aD10aGlzLmZyYW1lLndpZHRoPXRoaXMuY3JvcC53aWR0aD1hLHRoaXMuaGVpZ2h0PXRoaXMuZnJhbWUuaGVpZ2h0PXRoaXMuY3JvcC5oZWlnaHQ9YyxkJiYodGhpcy5iYXNlVGV4dHVyZS53aWR0aD10aGlzLndpZHRoLHRoaXMuYmFzZVRleHR1cmUuaGVpZ2h0PXRoaXMuaGVpZ2h0KSx0aGlzLnJlbmRlcmVyLnR5cGU9PT1iLldFQkdMX1JFTkRFUkVSJiYodGhpcy5wcm9qZWN0aW9uLng9dGhpcy53aWR0aC8yLHRoaXMucHJvamVjdGlvbi55PS10aGlzLmhlaWdodC8yKSx0aGlzLnRleHR1cmVCdWZmZXIucmVzaXplKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpKX0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3RoaXMucmVuZGVyZXIudHlwZT09PWIuV0VCR0xfUkVOREVSRVImJnRoaXMucmVuZGVyZXIuZ2wuYmluZEZyYW1lYnVmZmVyKHRoaXMucmVuZGVyZXIuZ2wuRlJBTUVCVUZGRVIsdGhpcy50ZXh0dXJlQnVmZmVyLmZyYW1lQnVmZmVyKSx0aGlzLnRleHR1cmVCdWZmZXIuY2xlYXIoKX0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5yZW5kZXJXZWJHTD1mdW5jdGlvbihhLGMsZCl7dmFyIGU9dGhpcy5yZW5kZXJlci5nbDtlLmNvbG9yTWFzayghMCwhMCwhMCwhMCksZS52aWV3cG9ydCgwLDAsdGhpcy53aWR0aCx0aGlzLmhlaWdodCksZS5iaW5kRnJhbWVidWZmZXIoZS5GUkFNRUJVRkZFUix0aGlzLnRleHR1cmVCdWZmZXIuZnJhbWVCdWZmZXIpLGQmJnRoaXMudGV4dHVyZUJ1ZmZlci5jbGVhcigpO3ZhciBmPWEuY2hpbGRyZW4sZz1hLndvcmxkVHJhbnNmb3JtO2Eud29ybGRUcmFuc2Zvcm09Yi5SZW5kZXJUZXh0dXJlLnRlbXBNYXRyaXgsYS53b3JsZFRyYW5zZm9ybS5kPS0xLGEud29ybGRUcmFuc2Zvcm0udHk9LTIqdGhpcy5wcm9qZWN0aW9uLnksYyYmKGEud29ybGRUcmFuc2Zvcm0udHg9Yy54LGEud29ybGRUcmFuc2Zvcm0udHktPWMueSk7Zm9yKHZhciBoPTAsaT1mLmxlbmd0aDtpPmg7aCsrKWZbaF0udXBkYXRlVHJhbnNmb3JtKCk7Yi5XZWJHTFJlbmRlcmVyLnVwZGF0ZVRleHR1cmVzKCksdGhpcy5yZW5kZXJlci5zcHJpdGVCYXRjaC5kaXJ0eT0hMCx0aGlzLnJlbmRlcmVyLnJlbmRlckRpc3BsYXlPYmplY3QoYSx0aGlzLnByb2plY3Rpb24sdGhpcy50ZXh0dXJlQnVmZmVyLmZyYW1lQnVmZmVyKSxhLndvcmxkVHJhbnNmb3JtPWcsdGhpcy5yZW5kZXJlci5zcHJpdGVCYXRjaC5kaXJ0eT0hMH0sYi5SZW5kZXJUZXh0dXJlLnByb3RvdHlwZS5yZW5kZXJDYW52YXM9ZnVuY3Rpb24oYSxjLGQpe3ZhciBlPWEuY2hpbGRyZW4sZj1hLndvcmxkVHJhbnNmb3JtO2Eud29ybGRUcmFuc2Zvcm09Yi5SZW5kZXJUZXh0dXJlLnRlbXBNYXRyaXgsYz8oYS53b3JsZFRyYW5zZm9ybS50eD1jLngsYS53b3JsZFRyYW5zZm9ybS50eT1jLnkpOihhLndvcmxkVHJhbnNmb3JtLnR4PTAsYS53b3JsZFRyYW5zZm9ybS50eT0wKTtmb3IodmFyIGc9MCxoPWUubGVuZ3RoO2g+ZztnKyspZVtnXS51cGRhdGVUcmFuc2Zvcm0oKTtkJiZ0aGlzLnRleHR1cmVCdWZmZXIuY2xlYXIoKTt2YXIgaT10aGlzLnRleHR1cmVCdWZmZXIuY29udGV4dDt0aGlzLnJlbmRlcmVyLnJlbmRlckRpc3BsYXlPYmplY3QoYSxpKSxpLnNldFRyYW5zZm9ybSgxLDAsMCwxLDAsMCksYS53b3JsZFRyYW5zZm9ybT1mfSxiLlJlbmRlclRleHR1cmUudGVtcE1hdHJpeD1uZXcgYi5NYXRyaXgsYi5Bc3NldExvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLmFzc2V0VVJMcz1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmxvYWRlcnNCeVR5cGU9e2pwZzpiLkltYWdlTG9hZGVyLGpwZWc6Yi5JbWFnZUxvYWRlcixwbmc6Yi5JbWFnZUxvYWRlcixnaWY6Yi5JbWFnZUxvYWRlcix3ZWJwOmIuSW1hZ2VMb2FkZXIsanNvbjpiLkpzb25Mb2FkZXIsYXRsYXM6Yi5BdGxhc0xvYWRlcixhbmltOmIuU3BpbmVMb2FkZXIseG1sOmIuQml0bWFwRm9udExvYWRlcixmbnQ6Yi5CaXRtYXBGb250TG9hZGVyfX0sYi5Bc3NldExvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Bc3NldExvYWRlcixiLkFzc2V0TG9hZGVyLnByb3RvdHlwZS5fZ2V0RGF0YVR5cGU9ZnVuY3Rpb24oYSl7dmFyIGI9XCJkYXRhOlwiLGM9YS5zbGljZSgwLGIubGVuZ3RoKS50b0xvd2VyQ2FzZSgpO2lmKGM9PT1iKXt2YXIgZD1hLnNsaWNlKGIubGVuZ3RoKSxlPWQuaW5kZXhPZihcIixcIik7aWYoLTE9PT1lKXJldHVybiBudWxsO3ZhciBmPWQuc2xpY2UoMCxlKS5zcGxpdChcIjtcIilbMF07cmV0dXJuIGYmJlwidGV4dC9wbGFpblwiIT09Zi50b0xvd2VyQ2FzZSgpP2Yuc3BsaXQoXCIvXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCk6XCJ0eHRcIn1yZXR1cm4gbnVsbH0sYi5Bc3NldExvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSl7Yi5vbkFzc2V0TG9hZGVkKGEuY29udGVudCl9dmFyIGI9dGhpczt0aGlzLmxvYWRDb3VudD10aGlzLmFzc2V0VVJMcy5sZW5ndGg7Zm9yKHZhciBjPTA7Yzx0aGlzLmFzc2V0VVJMcy5sZW5ndGg7YysrKXt2YXIgZD10aGlzLmFzc2V0VVJMc1tjXSxlPXRoaXMuX2dldERhdGFUeXBlKGQpO2V8fChlPWQuc3BsaXQoXCI/XCIpLnNoaWZ0KCkuc3BsaXQoXCIuXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCkpO3ZhciBmPXRoaXMubG9hZGVyc0J5VHlwZVtlXTtpZighZil0aHJvdyBuZXcgRXJyb3IoZStcIiBpcyBhbiB1bnN1cHBvcnRlZCBmaWxlIHR5cGVcIik7dmFyIGc9bmV3IGYoZCx0aGlzLmNyb3Nzb3JpZ2luKTtnLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixhKSxnLmxvYWQoKX19LGIuQXNzZXRMb2FkZXIucHJvdG90eXBlLm9uQXNzZXRMb2FkZWQ9ZnVuY3Rpb24oYSl7dGhpcy5sb2FkQ291bnQtLSx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJvblByb2dyZXNzXCIsY29udGVudDp0aGlzLGxvYWRlcjphfSksdGhpcy5vblByb2dyZXNzJiZ0aGlzLm9uUHJvZ3Jlc3MoYSksdGhpcy5sb2FkQ291bnR8fCh0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJvbkNvbXBsZXRlXCIsY29udGVudDp0aGlzfSksdGhpcy5vbkNvbXBsZXRlJiZ0aGlzLm9uQ29tcGxldGUoKSl9LGIuSnNvbkxvYWRlcj1mdW5jdGlvbihhLGMpe2IuRXZlbnRUYXJnZXQuY2FsbCh0aGlzKSx0aGlzLnVybD1hLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmJhc2VVcmw9YS5yZXBsYWNlKC9bXlxcL10qJC8sXCJcIiksdGhpcy5sb2FkZWQ9ITF9LGIuSnNvbkxvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Kc29uTG9hZGVyLGIuSnNvbkxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXM7d2luZG93LlhEb21haW5SZXF1ZXN0JiZhLmNyb3Nzb3JpZ2luPyh0aGlzLmFqYXhSZXF1ZXN0PW5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QsdGhpcy5hamF4UmVxdWVzdC50aW1lb3V0PTNlMyx0aGlzLmFqYXhSZXF1ZXN0Lm9uZXJyb3I9ZnVuY3Rpb24oKXthLm9uRXJyb3IoKX0sdGhpcy5hamF4UmVxdWVzdC5vbnRpbWVvdXQ9ZnVuY3Rpb24oKXthLm9uRXJyb3IoKX0sdGhpcy5hamF4UmVxdWVzdC5vbnByb2dyZXNzPWZ1bmN0aW9uKCl7fSk6dGhpcy5hamF4UmVxdWVzdD13aW5kb3cuWE1MSHR0cFJlcXVlc3Q/bmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDpuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKSx0aGlzLmFqYXhSZXF1ZXN0Lm9ubG9hZD1mdW5jdGlvbigpe2Eub25KU09OTG9hZGVkKCl9LHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIkdFVFwiLHRoaXMudXJsLCEwKSx0aGlzLmFqYXhSZXF1ZXN0LnNlbmQoKX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5vbkpTT05Mb2FkZWQ9ZnVuY3Rpb24oKXtpZighdGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQpcmV0dXJuIHRoaXMub25FcnJvcigpLHZvaWQgMDtpZih0aGlzLmpzb249SlNPTi5wYXJzZSh0aGlzLmFqYXhSZXF1ZXN0LnJlc3BvbnNlVGV4dCksdGhpcy5qc29uLmZyYW1lcyl7dmFyIGE9dGhpcyxjPXRoaXMuYmFzZVVybCt0aGlzLmpzb24ubWV0YS5pbWFnZSxkPW5ldyBiLkltYWdlTG9hZGVyKGMsdGhpcy5jcm9zc29yaWdpbiksZT10aGlzLmpzb24uZnJhbWVzO3RoaXMudGV4dHVyZT1kLnRleHR1cmUuYmFzZVRleHR1cmUsZC5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oKXthLm9uTG9hZGVkKCl9KTtmb3IodmFyIGcgaW4gZSl7dmFyIGg9ZVtnXS5mcmFtZTtpZihoJiYoYi5UZXh0dXJlQ2FjaGVbZ109bmV3IGIuVGV4dHVyZSh0aGlzLnRleHR1cmUse3g6aC54LHk6aC55LHdpZHRoOmgudyxoZWlnaHQ6aC5ofSksYi5UZXh0dXJlQ2FjaGVbZ10uY3JvcD1uZXcgYi5SZWN0YW5nbGUoaC54LGgueSxoLncsaC5oKSxlW2ddLnRyaW1tZWQpKXt2YXIgaT1lW2ddLnNvdXJjZVNpemUsaj1lW2ddLnNwcml0ZVNvdXJjZVNpemU7Yi5UZXh0dXJlQ2FjaGVbZ10udHJpbT1uZXcgYi5SZWN0YW5nbGUoai54LGoueSxpLncsaS5oKX19ZC5sb2FkKCl9ZWxzZSBpZih0aGlzLmpzb24uYm9uZXMpe3ZhciBrPW5ldyBmLlNrZWxldG9uSnNvbixsPWsucmVhZFNrZWxldG9uRGF0YSh0aGlzLmpzb24pO2IuQW5pbUNhY2hlW3RoaXMudXJsXT1sLHRoaXMub25Mb2FkZWQoKX1lbHNlIHRoaXMub25Mb2FkZWQoKX0sYi5Kc29uTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMubG9hZGVkPSEwLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkpzb25Mb2FkZXIucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJlcnJvclwiLGNvbnRlbnQ6dGhpc30pfSxiLkF0bGFzTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5iYXNlVXJsPWEucmVwbGFjZSgvW15cXC9dKiQvLFwiXCIpLHRoaXMuY3Jvc3NvcmlnaW49Yyx0aGlzLmxvYWRlZD0hMX0sYi5BdGxhc0xvYWRlci5jb25zdHJ1Y3Rvcj1iLkF0bGFzTG9hZGVyLGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLmxvYWQ9ZnVuY3Rpb24oKXt0aGlzLmFqYXhSZXF1ZXN0PW5ldyBiLkFqYXhSZXF1ZXN0LHRoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPXRoaXMub25BdGxhc0xvYWRlZC5iaW5kKHRoaXMpLHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIkdFVFwiLHRoaXMudXJsLCEwKSx0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUmJnRoaXMuYWpheFJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShcImFwcGxpY2F0aW9uL2pzb25cIiksdGhpcy5hamF4UmVxdWVzdC5zZW5kKG51bGwpfSxiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5vbkF0bGFzTG9hZGVkPWZ1bmN0aW9uKCl7aWYoND09PXRoaXMuYWpheFJlcXVlc3QucmVhZHlTdGF0ZSlpZigyMDA9PT10aGlzLmFqYXhSZXF1ZXN0LnN0YXR1c3x8LTE9PT13aW5kb3cubG9jYXRpb24uaHJlZi5pbmRleE9mKFwiaHR0cFwiKSl7dGhpcy5hdGxhcz17bWV0YTp7aW1hZ2U6W119LGZyYW1lczpbXX07dmFyIGE9dGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQuc3BsaXQoL1xccj9cXG4vKSxjPS0zLGQ9MCxlPW51bGwsZj0hMSxnPTAsaD0wLGk9dGhpcy5vbkxvYWRlZC5iaW5kKHRoaXMpO2ZvcihnPTA7ZzxhLmxlbmd0aDtnKyspaWYoYVtnXT1hW2ddLnJlcGxhY2UoL15cXHMrfFxccyskL2csXCJcIiksXCJcIj09PWFbZ10mJihmPWcrMSksYVtnXS5sZW5ndGg+MCl7aWYoZj09PWcpdGhpcy5hdGxhcy5tZXRhLmltYWdlLnB1c2goYVtnXSksZD10aGlzLmF0bGFzLm1ldGEuaW1hZ2UubGVuZ3RoLTEsdGhpcy5hdGxhcy5mcmFtZXMucHVzaCh7fSksYz0tMztlbHNlIGlmKGM+MClpZihjJTc9PT0xKW51bGwhPWUmJih0aGlzLmF0bGFzLmZyYW1lc1tkXVtlLm5hbWVdPWUpLGU9e25hbWU6YVtnXSxmcmFtZTp7fX07ZWxzZXt2YXIgaj1hW2ddLnNwbGl0KFwiIFwiKTtpZihjJTc9PT0zKWUuZnJhbWUueD1OdW1iZXIoalsxXS5yZXBsYWNlKFwiLFwiLFwiXCIpKSxlLmZyYW1lLnk9TnVtYmVyKGpbMl0pO2Vsc2UgaWYoYyU3PT09NCllLmZyYW1lLnc9TnVtYmVyKGpbMV0ucmVwbGFjZShcIixcIixcIlwiKSksZS5mcmFtZS5oPU51bWJlcihqWzJdKTtlbHNlIGlmKGMlNz09PTUpe3ZhciBrPXt4OjAseTowLHc6TnVtYmVyKGpbMV0ucmVwbGFjZShcIixcIixcIlwiKSksaDpOdW1iZXIoalsyXSl9O2sudz5lLmZyYW1lLnd8fGsuaD5lLmZyYW1lLmg/KGUudHJpbW1lZD0hMCxlLnJlYWxTaXplPWspOmUudHJpbW1lZD0hMX19YysrfWlmKG51bGwhPWUmJih0aGlzLmF0bGFzLmZyYW1lc1tkXVtlLm5hbWVdPWUpLHRoaXMuYXRsYXMubWV0YS5pbWFnZS5sZW5ndGg+MCl7Zm9yKHRoaXMuaW1hZ2VzPVtdLGg9MDtoPHRoaXMuYXRsYXMubWV0YS5pbWFnZS5sZW5ndGg7aCsrKXt2YXIgbD10aGlzLmJhc2VVcmwrdGhpcy5hdGxhcy5tZXRhLmltYWdlW2hdLG09dGhpcy5hdGxhcy5mcmFtZXNbaF07dGhpcy5pbWFnZXMucHVzaChuZXcgYi5JbWFnZUxvYWRlcihsLHRoaXMuY3Jvc3NvcmlnaW4pKTtmb3IoZyBpbiBtKXt2YXIgbj1tW2ddLmZyYW1lO24mJihiLlRleHR1cmVDYWNoZVtnXT1uZXcgYi5UZXh0dXJlKHRoaXMuaW1hZ2VzW2hdLnRleHR1cmUuYmFzZVRleHR1cmUse3g6bi54LHk6bi55LHdpZHRoOm4udyxoZWlnaHQ6bi5ofSksbVtnXS50cmltbWVkJiYoYi5UZXh0dXJlQ2FjaGVbZ10ucmVhbFNpemU9bVtnXS5yZWFsU2l6ZSxiLlRleHR1cmVDYWNoZVtnXS50cmltLng9MCxiLlRleHR1cmVDYWNoZVtnXS50cmltLnk9MCkpfX1mb3IodGhpcy5jdXJyZW50SW1hZ2VJZD0wLGg9MDtoPHRoaXMuaW1hZ2VzLmxlbmd0aDtoKyspdGhpcy5pbWFnZXNbaF0uYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGkpO3RoaXMuaW1hZ2VzW3RoaXMuY3VycmVudEltYWdlSWRdLmxvYWQoKX1lbHNlIHRoaXMub25Mb2FkZWQoKX1lbHNlIHRoaXMub25FcnJvcigpfSxiLkF0bGFzTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuaW1hZ2VzLmxlbmd0aC0xPnRoaXMuY3VycmVudEltYWdlSWQ/KHRoaXMuY3VycmVudEltYWdlSWQrKyx0aGlzLmltYWdlc1t0aGlzLmN1cnJlbnRJbWFnZUlkXS5sb2FkKCkpOih0aGlzLmxvYWRlZD0hMCx0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJsb2FkZWRcIixjb250ZW50OnRoaXN9KSl9LGIuQXRsYXNMb2FkZXIucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oKXt0aGlzLmRpc3BhdGNoRXZlbnQoe3R5cGU6XCJlcnJvclwiLGNvbnRlbnQ6dGhpc30pfSxiLlNwcml0ZVNoZWV0TG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLnRleHR1cmU9bnVsbCx0aGlzLmZyYW1lcz17fX0sYi5TcHJpdGVTaGVldExvYWRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5TcHJpdGVTaGVldExvYWRlcixiLlNwcml0ZVNoZWV0TG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxjPW5ldyBiLkpzb25Mb2FkZXIodGhpcy51cmwsdGhpcy5jcm9zc29yaWdpbik7Yy5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oYil7YS5qc29uPWIuY29udGVudC5qc29uLGEub25Mb2FkZWQoKX0pLGMubG9hZCgpfSxiLlNwcml0ZVNoZWV0TG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkltYWdlTG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudGV4dHVyZT1iLlRleHR1cmUuZnJvbUltYWdlKGEsYyksdGhpcy5mcmFtZXM9W119LGIuSW1hZ2VMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW1hZ2VMb2FkZXIsYi5JbWFnZUxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe2lmKHRoaXMudGV4dHVyZS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQpdGhpcy5vbkxvYWRlZCgpO2Vsc2V7dmFyIGE9dGhpczt0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7YS5vbkxvYWRlZCgpfSl9fSxiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkltYWdlTG9hZGVyLnByb3RvdHlwZS5sb2FkRnJhbWVkU3ByaXRlU2hlZXQ9ZnVuY3Rpb24oYSxjLGQpe3RoaXMuZnJhbWVzPVtdO2Zvcih2YXIgZT1NYXRoLmZsb29yKHRoaXMudGV4dHVyZS53aWR0aC9hKSxmPU1hdGguZmxvb3IodGhpcy50ZXh0dXJlLmhlaWdodC9jKSxnPTAsaD0wO2Y+aDtoKyspZm9yKHZhciBpPTA7ZT5pO2krKyxnKyspe3ZhciBqPW5ldyBiLlRleHR1cmUodGhpcy50ZXh0dXJlLHt4OmkqYSx5OmgqYyx3aWR0aDphLGhlaWdodDpjfSk7dGhpcy5mcmFtZXMucHVzaChqKSxkJiYoYi5UZXh0dXJlQ2FjaGVbZCtcIi1cIitnXT1qKX1pZih0aGlzLnRleHR1cmUuYmFzZVRleHR1cmUuaGFzTG9hZGVkKXRoaXMub25Mb2FkZWQoKTtlbHNle3ZhciBrPXRoaXM7dGhpcy50ZXh0dXJlLmJhc2VUZXh0dXJlLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRcIixmdW5jdGlvbigpe2sub25Mb2FkZWQoKX0pfX0sYi5CaXRtYXBGb250TG9hZGVyPWZ1bmN0aW9uKGEsYyl7Yi5FdmVudFRhcmdldC5jYWxsKHRoaXMpLHRoaXMudXJsPWEsdGhpcy5jcm9zc29yaWdpbj1jLHRoaXMuYmFzZVVybD1hLnJlcGxhY2UoL1teXFwvXSokLyxcIlwiKSx0aGlzLnRleHR1cmU9bnVsbH0sYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJpdG1hcEZvbnRMb2FkZXIsYi5CaXRtYXBGb250TG9hZGVyLnByb3RvdHlwZS5sb2FkPWZ1bmN0aW9uKCl7dGhpcy5hamF4UmVxdWVzdD1uZXcgYi5BamF4UmVxdWVzdDt2YXIgYT10aGlzO3RoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPWZ1bmN0aW9uKCl7YS5vblhNTExvYWRlZCgpfSx0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oXCJHRVRcIix0aGlzLnVybCwhMCksdGhpcy5hamF4UmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlJiZ0aGlzLmFqYXhSZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUoXCJhcHBsaWNhdGlvbi94bWxcIiksdGhpcy5hamF4UmVxdWVzdC5zZW5kKG51bGwpfSxiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLm9uWE1MTG9hZGVkPWZ1bmN0aW9uKCl7aWYoND09PXRoaXMuYWpheFJlcXVlc3QucmVhZHlTdGF0ZSYmKDIwMD09PXRoaXMuYWpheFJlcXVlc3Quc3RhdHVzfHwtMT09PXdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbC5pbmRleE9mKFwiaHR0cFwiKSkpe3ZhciBhPXRoaXMuYWpheFJlcXVlc3QucmVzcG9uc2VYTUw7aWYoIWF8fC9NU0lFIDkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpfHxuYXZpZ2F0b3IuaXNDb2Nvb25KUylpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB3aW5kb3cuRE9NUGFyc2VyKXt2YXIgYz1uZXcgRE9NUGFyc2VyO2E9Yy5wYXJzZUZyb21TdHJpbmcodGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQsXCJ0ZXh0L3htbFwiKX1lbHNle3ZhciBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7ZC5pbm5lckhUTUw9dGhpcy5hamF4UmVxdWVzdC5yZXNwb25zZVRleHQsYT1kfXZhciBlPXRoaXMuYmFzZVVybCthLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicGFnZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJmaWxlXCIpLGY9bmV3IGIuSW1hZ2VMb2FkZXIoZSx0aGlzLmNyb3Nzb3JpZ2luKTt0aGlzLnRleHR1cmU9Zi50ZXh0dXJlLmJhc2VUZXh0dXJlO3ZhciBnPXt9LGg9YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImluZm9cIilbMF0saT1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY29tbW9uXCIpWzBdO2cuZm9udD1oLmdldEF0dHJpYnV0ZShcImZhY2VcIiksZy5zaXplPXBhcnNlSW50KGguZ2V0QXR0cmlidXRlKFwic2l6ZVwiKSwxMCksZy5saW5lSGVpZ2h0PXBhcnNlSW50KGkuZ2V0QXR0cmlidXRlKFwibGluZUhlaWdodFwiKSwxMCksZy5jaGFycz17fTtmb3IodmFyIGo9YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNoYXJcIiksaz0wO2s8ai5sZW5ndGg7aysrKXt2YXIgbD1wYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcImlkXCIpLDEwKSxtPW5ldyBiLlJlY3RhbmdsZShwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInhcIiksMTApLHBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieVwiKSwxMCkscGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiKSwxMCkscGFyc2VJbnQoaltrXS5nZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiksMTApKTtnLmNoYXJzW2xdPXt4T2Zmc2V0OnBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieG9mZnNldFwiKSwxMCkseU9mZnNldDpwYXJzZUludChqW2tdLmdldEF0dHJpYnV0ZShcInlvZmZzZXRcIiksMTApLHhBZHZhbmNlOnBhcnNlSW50KGpba10uZ2V0QXR0cmlidXRlKFwieGFkdmFuY2VcIiksMTApLGtlcm5pbmc6e30sdGV4dHVyZTpiLlRleHR1cmVDYWNoZVtsXT1uZXcgYi5UZXh0dXJlKHRoaXMudGV4dHVyZSxtKX19dmFyIG49YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImtlcm5pbmdcIik7Zm9yKGs9MDtrPG4ubGVuZ3RoO2srKyl7dmFyIG89cGFyc2VJbnQobltrXS5nZXRBdHRyaWJ1dGUoXCJmaXJzdFwiKSwxMCkscD1wYXJzZUludChuW2tdLmdldEF0dHJpYnV0ZShcInNlY29uZFwiKSwxMCkscT1wYXJzZUludChuW2tdLmdldEF0dHJpYnV0ZShcImFtb3VudFwiKSwxMCk7Zy5jaGFyc1twXS5rZXJuaW5nW29dPXF9Yi5CaXRtYXBUZXh0LmZvbnRzW2cuZm9udF09Zzt2YXIgcj10aGlzO2YuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZFwiLGZ1bmN0aW9uKCl7ci5vbkxvYWRlZCgpfSksZi5sb2FkKCl9fSxiLkJpdG1hcEZvbnRMb2FkZXIucHJvdG90eXBlLm9uTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy5kaXNwYXRjaEV2ZW50KHt0eXBlOlwibG9hZGVkXCIsY29udGVudDp0aGlzfSl9LGIuU3BpbmVMb2FkZXI9ZnVuY3Rpb24oYSxjKXtiLkV2ZW50VGFyZ2V0LmNhbGwodGhpcyksdGhpcy51cmw9YSx0aGlzLmNyb3Nzb3JpZ2luPWMsdGhpcy5sb2FkZWQ9ITF9LGIuU3BpbmVMb2FkZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuU3BpbmVMb2FkZXIsYi5TcGluZUxvYWRlci5wcm90b3R5cGUubG9hZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYz1uZXcgYi5Kc29uTG9hZGVyKHRoaXMudXJsLHRoaXMuY3Jvc3NvcmlnaW4pO1xuYy5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkXCIsZnVuY3Rpb24oYil7YS5qc29uPWIuY29udGVudC5qc29uLGEub25Mb2FkZWQoKX0pLGMubG9hZCgpfSxiLlNwaW5lTG9hZGVyLnByb3RvdHlwZS5vbkxvYWRlZD1mdW5jdGlvbigpe3RoaXMubG9hZGVkPSEwLHRoaXMuZGlzcGF0Y2hFdmVudCh7dHlwZTpcImxvYWRlZFwiLGNvbnRlbnQ6dGhpc30pfSxiLkFic3RyYWN0RmlsdGVyPWZ1bmN0aW9uKGEsYil7dGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMuc2hhZGVycz1bXSx0aGlzLmRpcnR5PSEwLHRoaXMucGFkZGluZz0wLHRoaXMudW5pZm9ybXM9Ynx8e30sdGhpcy5mcmFnbWVudFNyYz1hfHxbXX0sYi5BbHBoYU1hc2tGaWx0ZXI9ZnVuY3Rpb24oYSl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSxhLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMCx0aGlzLnVuaWZvcm1zPXttYXNrOnt0eXBlOlwic2FtcGxlcjJEXCIsdmFsdWU6YX0sbWFwRGltZW5zaW9uczp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MSx5OjUxMTJ9fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sYS5iYXNlVGV4dHVyZS5oYXNMb2FkZWQ/KHRoaXMudW5pZm9ybXMubWFzay52YWx1ZS54PWEud2lkdGgsdGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLnk9YS5oZWlnaHQpOih0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb249dGhpcy5vblRleHR1cmVMb2FkZWQuYmluZCh0aGlzKSxhLmJhc2VUZXh0dXJlLm9uKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKSksdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIG1hc2s7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInVuaWZvcm0gdmVjMiBvZmZzZXQ7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gdmVjMiBtYXBEaW1lbnNpb25zO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgbWFwQ29yZHMgPSB2VGV4dHVyZUNvb3JkLnh5O1wiLFwiICAgbWFwQ29yZHMgKz0gKGRpbWVuc2lvbnMuencgKyBvZmZzZXQpLyBkaW1lbnNpb25zLnh5IDtcIixcIiAgIG1hcENvcmRzLnkgKj0gLTEuMDtcIixcIiAgIG1hcENvcmRzLnkgKz0gMS4wO1wiLFwiICAgbWFwQ29yZHMgKj0gZGltZW5zaW9ucy54eSAvIG1hcERpbWVuc2lvbnM7XCIsXCIgICB2ZWM0IG9yaWdpbmFsID0gIHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBmbG9hdCBtYXNrQWxwaGEgPSAgdGV4dHVyZTJEKG1hc2ssIG1hcENvcmRzKS5yO1wiLFwiICAgb3JpZ2luYWwgKj0gbWFza0FscGhhO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gIG9yaWdpbmFsO1wiLFwifVwiXX0sYi5BbHBoYU1hc2tGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQWxwaGFNYXNrRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkFscGhhTWFza0ZpbHRlcixiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGUub25UZXh0dXJlTG9hZGVkPWZ1bmN0aW9uKCl7dGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLng9dGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLndpZHRoLHRoaXMudW5pZm9ybXMubWFwRGltZW5zaW9ucy52YWx1ZS55PXRoaXMudW5pZm9ybXMubWFzay52YWx1ZS5oZWlnaHQsdGhpcy51bmlmb3Jtcy5tYXNrLnZhbHVlLmJhc2VUZXh0dXJlLm9mZihcImxvYWRlZFwiLHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbil9LE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkFscGhhTWFza0ZpbHRlci5wcm90b3R5cGUsXCJtYXBcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMubWFzay52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMubWFzay52YWx1ZT1hfX0pLGIuQ29sb3JNYXRyaXhGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e21hdHJpeDp7dHlwZTpcIm1hdDRcIix2YWx1ZTpbMSwwLDAsMCwwLDEsMCwwLDAsMCwxLDAsMCwwLDAsMV19fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBpbnZlcnQ7XCIsXCJ1bmlmb3JtIG1hdDQgbWF0cml4O1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKSAqIG1hdHJpeDtcIixcIn1cIl19LGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ29sb3JNYXRyaXhGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQ29sb3JNYXRyaXhGaWx0ZXIucHJvdG90eXBlLFwibWF0cml4XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm1hdHJpeC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMubWF0cml4LnZhbHVlPWF9fSksYi5HcmF5RmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtncmF5Ont0eXBlOlwiMWZcIix2YWx1ZToxfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidW5pZm9ybSBmbG9hdCBncmF5O1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBnbF9GcmFnQ29sb3IucmdiID0gbWl4KGdsX0ZyYWdDb2xvci5yZ2IsIHZlYzMoMC4yMTI2KmdsX0ZyYWdDb2xvci5yICsgMC43MTUyKmdsX0ZyYWdDb2xvci5nICsgMC4wNzIyKmdsX0ZyYWdDb2xvci5iKSwgZ3JheSk7XCIsXCJ9XCJdfSxiLkdyYXlGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuR3JheUZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5HcmF5RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkdyYXlGaWx0ZXIucHJvdG90eXBlLFwiZ3JheVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ncmF5LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ncmF5LnZhbHVlPWF9fSksYi5EaXNwbGFjZW1lbnRGaWx0ZXI9ZnVuY3Rpb24oYSl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSxhLmJhc2VUZXh0dXJlLl9wb3dlck9mMj0hMCx0aGlzLnVuaWZvcm1zPXtkaXNwbGFjZW1lbnRNYXA6e3R5cGU6XCJzYW1wbGVyMkRcIix2YWx1ZTphfSxzY2FsZTp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MzAseTozMH19LG9mZnNldDp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MCx5OjB9fSxtYXBEaW1lbnNpb25zOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDoxLHk6NTExMn19LGRpbWVuc2lvbnM6e3R5cGU6XCI0ZnZcIix2YWx1ZTpbMCwwLDAsMF19fSxhLmJhc2VUZXh0dXJlLmhhc0xvYWRlZD8odGhpcy51bmlmb3Jtcy5tYXBEaW1lbnNpb25zLnZhbHVlLng9YS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueT1hLmhlaWdodCk6KHRoaXMuYm91bmRMb2FkZWRGdW5jdGlvbj10aGlzLm9uVGV4dHVyZUxvYWRlZC5iaW5kKHRoaXMpLGEuYmFzZVRleHR1cmUub24oXCJsb2FkZWRcIix0aGlzLmJvdW5kTG9hZGVkRnVuY3Rpb24pKSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgZGlzcGxhY2VtZW50TWFwO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIHZlYzIgc2NhbGU7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0O1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHZlYzIgbWFwRGltZW5zaW9ucztcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICB2ZWMyIG1hcENvcmRzID0gdlRleHR1cmVDb29yZC54eTtcIixcIiAgIG1hcENvcmRzICs9IChkaW1lbnNpb25zLnp3ICsgb2Zmc2V0KS8gZGltZW5zaW9ucy54eSA7XCIsXCIgICBtYXBDb3Jkcy55ICo9IC0xLjA7XCIsXCIgICBtYXBDb3Jkcy55ICs9IDEuMDtcIixcIiAgIHZlYzIgbWF0U2FtcGxlID0gdGV4dHVyZTJEKGRpc3BsYWNlbWVudE1hcCwgbWFwQ29yZHMpLnh5O1wiLFwiICAgbWF0U2FtcGxlIC09IDAuNTtcIixcIiAgIG1hdFNhbXBsZSAqPSBzY2FsZTtcIixcIiAgIG1hdFNhbXBsZSAvPSBtYXBEaW1lbnNpb25zO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIG1hdFNhbXBsZS54LCB2VGV4dHVyZUNvb3JkLnkgKyBtYXRTYW1wbGUueSkpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peCggZ2xfRnJhZ0NvbG9yLnJnYiwgZ2xfRnJhZ0NvbG9yLnJnYiwgMS4wKTtcIixcIiAgIHZlYzIgY29yZCA9IHZUZXh0dXJlQ29vcmQ7XCIsXCJ9XCJdfSxiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuRGlzcGxhY2VtZW50RmlsdGVyLGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZS5vblRleHR1cmVMb2FkZWQ9ZnVuY3Rpb24oKXt0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueD10aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZS53aWR0aCx0aGlzLnVuaWZvcm1zLm1hcERpbWVuc2lvbnMudmFsdWUueT10aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZS5oZWlnaHQsdGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWUuYmFzZVRleHR1cmUub2ZmKFwibG9hZGVkXCIsdGhpcy5ib3VuZExvYWRlZEZ1bmN0aW9uKX0sT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRGlzcGxhY2VtZW50RmlsdGVyLnByb3RvdHlwZSxcIm1hcFwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5kaXNwbGFjZW1lbnRNYXAudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmRpc3BsYWNlbWVudE1hcC52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkRpc3BsYWNlbWVudEZpbHRlci5wcm90b3R5cGUsXCJzY2FsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5zY2FsZS52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuc2NhbGUudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5EaXNwbGFjZW1lbnRGaWx0ZXIucHJvdG90eXBlLFwib2Zmc2V0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMub2Zmc2V0LnZhbHVlPWF9fSksYi5QaXhlbGF0ZUZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17aW52ZXJ0Ont0eXBlOlwiMWZcIix2YWx1ZTowfSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6bmV3IEZsb2F0MzJBcnJheShbMWU0LDEwMCwxMCwxMF0pfSxwaXhlbFNpemU6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjEwLHk6MTB9fX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjMiB0ZXN0RGltO1wiLFwidW5pZm9ybSB2ZWM0IGRpbWVuc2lvbnM7XCIsXCJ1bmlmb3JtIHZlYzIgcGl4ZWxTaXplO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjMiBjb29yZCA9IHZUZXh0dXJlQ29vcmQ7XCIsXCIgICB2ZWMyIHNpemUgPSBkaW1lbnNpb25zLnh5L3BpeGVsU2l6ZTtcIixcIiAgIHZlYzIgY29sb3IgPSBmbG9vciggKCB2VGV4dHVyZUNvb3JkICogc2l6ZSApICkgLyBzaXplICsgcGl4ZWxTaXplL2RpbWVuc2lvbnMueHkgKiAwLjU7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIGNvbG9yKTtcIixcIn1cIl19LGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuUGl4ZWxhdGVGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuUGl4ZWxhdGVGaWx0ZXIucHJvdG90eXBlLFwic2l6ZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5waXhlbFNpemUudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMucGl4ZWxTaXplLnZhbHVlPWF9fSksYi5CbHVyWEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17Ymx1cjp7dHlwZTpcIjFmXCIsdmFsdWU6MS81MTJ9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBmbG9hdCBibHVyO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjNCBzdW0gPSB2ZWM0KDAuMCk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDQuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDMuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIDIuMCpibHVyLCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCAtIGJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKSAqIDAuMTY7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCArIGJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xNTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgMi4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4xMjtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgMy4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wOTtcIixcIiAgIHN1bSArPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICsgNC4wKmJsdXIsIHZUZXh0dXJlQ29vcmQueSkpICogMC4wNTtcIixcIiAgIGdsX0ZyYWdDb2xvciA9IHN1bTtcIixcIn1cIl19LGIuQmx1clhGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuQmx1clhGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmx1clhGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQmx1clhGaWx0ZXIucHJvdG90eXBlLFwiYmx1clwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLmRpcnR5PSEwLHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLGIuQmx1cllGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e2JsdXI6e3R5cGU6XCIxZlwiLHZhbHVlOjEvNTEyfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgYmx1cjtcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzQgc3VtID0gdmVjNCgwLjApO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDQuMCpibHVyKSkgKiAwLjA1O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDMuMCpibHVyKSkgKiAwLjA5O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIDIuMCpibHVyKSkgKiAwLjEyO1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSAtIGJsdXIpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSkgKiAwLjE2O1wiLFwiICAgc3VtICs9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSArIGJsdXIpKSAqIDAuMTU7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgMi4wKmJsdXIpKSAqIDAuMTI7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgMy4wKmJsdXIpKSAqIDAuMDk7XCIsXCIgICBzdW0gKz0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55ICsgNC4wKmJsdXIpKSAqIDAuMDU7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSBzdW07XCIsXCJ9XCJdfSxiLkJsdXJZRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkJsdXJZRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLkJsdXJZRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkJsdXJZRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuYmx1ci52YWx1ZS8oMS83ZTMpfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlPTEvN2UzKmF9fSksYi5CbHVyRmlsdGVyPWZ1bmN0aW9uKCl7dGhpcy5ibHVyWEZpbHRlcj1uZXcgYi5CbHVyWEZpbHRlcix0aGlzLmJsdXJZRmlsdGVyPW5ldyBiLkJsdXJZRmlsdGVyLHRoaXMucGFzc2VzPVt0aGlzLmJsdXJYRmlsdGVyLHRoaXMuYmx1cllGaWx0ZXJdfSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYmx1clhGaWx0ZXIuYmx1cn0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuYmx1clhGaWx0ZXIuYmx1cj10aGlzLmJsdXJZRmlsdGVyLmJsdXI9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJYXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJsdXJYRmlsdGVyLmJsdXJ9LHNldDpmdW5jdGlvbihhKXt0aGlzLmJsdXJYRmlsdGVyLmJsdXI9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5CbHVyRmlsdGVyLnByb3RvdHlwZSxcImJsdXJZXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmJsdXJZRmlsdGVyLmJsdXJ9LHNldDpmdW5jdGlvbihhKXt0aGlzLmJsdXJZRmlsdGVyLmJsdXI9YX19KSxiLkludmVydEZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17aW52ZXJ0Ont0eXBlOlwiMWZcIix2YWx1ZToxfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gZmxvYXQgaW52ZXJ0O1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKTtcIixcIiAgIGdsX0ZyYWdDb2xvci5yZ2IgPSBtaXgoICh2ZWMzKDEpLWdsX0ZyYWdDb2xvci5yZ2IpICogZ2xfRnJhZ0NvbG9yLmEsIGdsX0ZyYWdDb2xvci5yZ2IsIDEuMCAtIGludmVydCk7XCIsXCJ9XCJdfSxiLkludmVydEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5JbnZlcnRGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuSW52ZXJ0RmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkludmVydEZpbHRlci5wcm90b3R5cGUsXCJpbnZlcnRcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMuaW52ZXJ0LnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5pbnZlcnQudmFsdWU9YX19KSxiLlNlcGlhRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtzZXBpYTp7dHlwZTpcIjFmXCIsdmFsdWU6MX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IHNlcGlhO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJjb25zdCBtYXQzIHNlcGlhTWF0cml4ID0gbWF0MygwLjM1ODgsIDAuNzA0NCwgMC4xMzY4LCAwLjI5OTAsIDAuNTg3MCwgMC4xMTQwLCAwLjIzOTIsIDAuNDY5NiwgMC4wOTEyKTtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLFwiICAgZ2xfRnJhZ0NvbG9yLnJnYiA9IG1peCggZ2xfRnJhZ0NvbG9yLnJnYiwgZ2xfRnJhZ0NvbG9yLnJnYiAqIHNlcGlhTWF0cml4LCBzZXBpYSk7XCIsXCJ9XCJdfSxiLlNlcGlhRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLlNlcGlhRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1iLlNlcGlhRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlNlcGlhRmlsdGVyLnByb3RvdHlwZSxcInNlcGlhXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnNlcGlhLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy51bmlmb3Jtcy5zZXBpYS52YWx1ZT1hfX0pLGIuVHdpc3RGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3JhZGl1czp7dHlwZTpcIjFmXCIsdmFsdWU6LjV9LGFuZ2xlOnt0eXBlOlwiMWZcIix2YWx1ZTo1fSxvZmZzZXQ6e3R5cGU6XCIyZlwiLHZhbHVlOnt4Oi41LHk6LjV9fX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IHJhZGl1cztcIixcInVuaWZvcm0gZmxvYXQgYW5nbGU7XCIsXCJ1bmlmb3JtIHZlYzIgb2Zmc2V0O1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIHZlYzIgY29vcmQgPSB2VGV4dHVyZUNvb3JkIC0gb2Zmc2V0O1wiLFwiICAgZmxvYXQgZGlzdGFuY2UgPSBsZW5ndGgoY29vcmQpO1wiLFwiICAgaWYgKGRpc3RhbmNlIDwgcmFkaXVzKSB7XCIsXCIgICAgICAgZmxvYXQgcmF0aW8gPSAocmFkaXVzIC0gZGlzdGFuY2UpIC8gcmFkaXVzO1wiLFwiICAgICAgIGZsb2F0IGFuZ2xlTW9kID0gcmF0aW8gKiByYXRpbyAqIGFuZ2xlO1wiLFwiICAgICAgIGZsb2F0IHMgPSBzaW4oYW5nbGVNb2QpO1wiLFwiICAgICAgIGZsb2F0IGMgPSBjb3MoYW5nbGVNb2QpO1wiLFwiICAgICAgIGNvb3JkID0gdmVjMihjb29yZC54ICogYyAtIGNvb3JkLnkgKiBzLCBjb29yZC54ICogcyArIGNvb3JkLnkgKiBjKTtcIixcIiAgIH1cIixcIiAgIGdsX0ZyYWdDb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgY29vcmQrb2Zmc2V0KTtcIixcIn1cIl19LGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYi5BYnN0cmFjdEZpbHRlci5wcm90b3R5cGUpLGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuVHdpc3RGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuVHdpc3RGaWx0ZXIucHJvdG90eXBlLFwib2Zmc2V0XCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLm9mZnNldC52YWx1ZX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMuZGlydHk9ITAsdGhpcy51bmlmb3Jtcy5vZmZzZXQudmFsdWU9YX19KSxPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5Ud2lzdEZpbHRlci5wcm90b3R5cGUsXCJyYWRpdXNcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pZm9ybXMucmFkaXVzLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLnJhZGl1cy52YWx1ZT1hfX0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLlR3aXN0RmlsdGVyLnByb3RvdHlwZSxcImFuZ2xlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlPWF9fSksYi5Db2xvclN0ZXBGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3N0ZXA6e3R5cGU6XCIxZlwiLHZhbHVlOjV9fSx0aGlzLmZyYWdtZW50U3JjPVtcInByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1wiLFwidmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XCIsXCJ2YXJ5aW5nIHZlYzQgdkNvbG9yO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IHN0ZXA7XCIsXCJ2b2lkIG1haW4odm9pZCkge1wiLFwiICAgdmVjNCBjb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBjb2xvciA9IGZsb29yKGNvbG9yICogc3RlcCkgLyBzdGVwO1wiLFwiICAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XCIsXCJ9XCJdfSxiLkNvbG9yU3RlcEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5Db2xvclN0ZXBGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQ29sb3JTdGVwRmlsdGVyLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShiLkNvbG9yU3RlcEZpbHRlci5wcm90b3R5cGUsXCJzdGVwXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnN0ZXAudmFsdWV9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLnN0ZXAudmFsdWU9YX19KSxiLkRvdFNjcmVlbkZpbHRlcj1mdW5jdGlvbigpe2IuQWJzdHJhY3RGaWx0ZXIuY2FsbCh0aGlzKSx0aGlzLnBhc3Nlcz1bdGhpc10sdGhpcy51bmlmb3Jtcz17c2NhbGU6e3R5cGU6XCIxZlwiLHZhbHVlOjF9LGFuZ2xlOnt0eXBlOlwiMWZcIix2YWx1ZTo1fSxkaW1lbnNpb25zOnt0eXBlOlwiNGZ2XCIsdmFsdWU6WzAsMCwwLDBdfX0sdGhpcy5mcmFnbWVudFNyYz1bXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcIixcInZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1wiLFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIixcInVuaWZvcm0gdmVjNCBkaW1lbnNpb25zO1wiLFwidW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XCIsXCJ1bmlmb3JtIGZsb2F0IGFuZ2xlO1wiLFwidW5pZm9ybSBmbG9hdCBzY2FsZTtcIixcImZsb2F0IHBhdHRlcm4oKSB7XCIsXCIgICBmbG9hdCBzID0gc2luKGFuZ2xlKSwgYyA9IGNvcyhhbmdsZSk7XCIsXCIgICB2ZWMyIHRleCA9IHZUZXh0dXJlQ29vcmQgKiBkaW1lbnNpb25zLnh5O1wiLFwiICAgdmVjMiBwb2ludCA9IHZlYzIoXCIsXCIgICAgICAgYyAqIHRleC54IC0gcyAqIHRleC55LFwiLFwiICAgICAgIHMgKiB0ZXgueCArIGMgKiB0ZXgueVwiLFwiICAgKSAqIHNjYWxlO1wiLFwiICAgcmV0dXJuIChzaW4ocG9pbnQueCkgKiBzaW4ocG9pbnQueSkpICogNC4wO1wiLFwifVwiLFwidm9pZCBtYWluKCkge1wiLFwiICAgdmVjNCBjb2xvciA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCk7XCIsXCIgICBmbG9hdCBhdmVyYWdlID0gKGNvbG9yLnIgKyBjb2xvci5nICsgY29sb3IuYikgLyAzLjA7XCIsXCIgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHZlYzMoYXZlcmFnZSAqIDEwLjAgLSA1LjAgKyBwYXR0ZXJuKCkpLCBjb2xvci5hKTtcIixcIn1cIl19LGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkRvdFNjcmVlbkZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5Eb3RTY3JlZW5GaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZSxcInNjYWxlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLnNjYWxlLnZhbHVlPWF9fSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuRG90U2NyZWVuRmlsdGVyLnByb3RvdHlwZSxcImFuZ2xlXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlfSxzZXQ6ZnVuY3Rpb24oYSl7dGhpcy5kaXJ0eT0hMCx0aGlzLnVuaWZvcm1zLmFuZ2xlLnZhbHVlPWF9fSksYi5Dcm9zc0hhdGNoRmlsdGVyPWZ1bmN0aW9uKCl7Yi5BYnN0cmFjdEZpbHRlci5jYWxsKHRoaXMpLHRoaXMucGFzc2VzPVt0aGlzXSx0aGlzLnVuaWZvcm1zPXtibHVyOnt0eXBlOlwiMWZcIix2YWx1ZToxLzUxMn19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIGZsb2F0IGJsdXI7XCIsXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIixcInZvaWQgbWFpbih2b2lkKSB7XCIsXCIgICAgZmxvYXQgbHVtID0gbGVuZ3RoKHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZC54eSkucmdiKTtcIixcIiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDEuMCwgMS4wLCAxLjAsIDEuMCk7XCIsXCIgICAgaWYgKGx1bSA8IDEuMDApIHtcIixcIiAgICAgICAgaWYgKG1vZChnbF9GcmFnQ29vcmQueCArIGdsX0ZyYWdDb29yZC55LCAxMC4wKSA9PSAwLjApIHtcIixcIiAgICAgICAgICAgIGdsX0ZyYWdDb2xvciA9IHZlYzQoMC4wLCAwLjAsIDAuMCwgMS4wKTtcIixcIiAgICAgICAgfVwiLFwiICAgIH1cIixcIiAgICBpZiAobHVtIDwgMC43NSkge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54IC0gZ2xfRnJhZ0Nvb3JkLnksIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwiICAgIGlmIChsdW0gPCAwLjUwKSB7XCIsXCIgICAgICAgIGlmIChtb2QoZ2xfRnJhZ0Nvb3JkLnggKyBnbF9GcmFnQ29vcmQueSAtIDUuMCwgMTAuMCkgPT0gMC4wKSB7XCIsXCIgICAgICAgICAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KDAuMCwgMC4wLCAwLjAsIDEuMCk7XCIsXCIgICAgICAgIH1cIixcIiAgICB9XCIsXCIgICAgaWYgKGx1bSA8IDAuMykge1wiLFwiICAgICAgICBpZiAobW9kKGdsX0ZyYWdDb29yZC54IC0gZ2xfRnJhZ0Nvb3JkLnkgLSA1LjAsIDEwLjApID09IDAuMCkge1wiLFwiICAgICAgICAgICAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgwLjAsIDAuMCwgMC4wLCAxLjApO1wiLFwiICAgICAgICB9XCIsXCIgICAgfVwiLFwifVwiXX0sYi5Dcm9zc0hhdGNoRmlsdGVyLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGIuQWJzdHJhY3RGaWx0ZXIucHJvdG90eXBlKSxiLkNyb3NzSGF0Y2hGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yPWIuQmx1cllGaWx0ZXIsT2JqZWN0LmRlZmluZVByb3BlcnR5KGIuQ3Jvc3NIYXRjaEZpbHRlci5wcm90b3R5cGUsXCJibHVyXCIse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWUvKDEvN2UzKX0sc2V0OmZ1bmN0aW9uKGEpe3RoaXMudW5pZm9ybXMuYmx1ci52YWx1ZT0xLzdlMyphfX0pLGIuUkdCU3BsaXRGaWx0ZXI9ZnVuY3Rpb24oKXtiLkFic3RyYWN0RmlsdGVyLmNhbGwodGhpcyksdGhpcy5wYXNzZXM9W3RoaXNdLHRoaXMudW5pZm9ybXM9e3JlZDp7dHlwZTpcIjJmXCIsdmFsdWU6e3g6MjAseToyMH19LGdyZWVuOnt0eXBlOlwiMmZcIix2YWx1ZTp7eDotMjAseToyMH19LGJsdWU6e3R5cGU6XCIyZlwiLHZhbHVlOnt4OjIwLHk6LTIwfX0sZGltZW5zaW9uczp7dHlwZTpcIjRmdlwiLHZhbHVlOlswLDAsMCwwXX19LHRoaXMuZnJhZ21lbnRTcmM9W1wicHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XCIsXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIixcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsXCJ1bmlmb3JtIHZlYzIgcmVkO1wiLFwidW5pZm9ybSB2ZWMyIGdyZWVuO1wiLFwidW5pZm9ybSB2ZWMyIGJsdWU7XCIsXCJ1bmlmb3JtIHZlYzQgZGltZW5zaW9ucztcIixcInVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1wiLFwidm9pZCBtYWluKHZvaWQpIHtcIixcIiAgIGdsX0ZyYWdDb2xvci5yID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkICsgcmVkL2RpbWVuc2lvbnMueHkpLnI7XCIsXCIgICBnbF9GcmFnQ29sb3IuZyA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCArIGdyZWVuL2RpbWVuc2lvbnMueHkpLmc7XCIsXCIgICBnbF9GcmFnQ29sb3IuYiA9IHRleHR1cmUyRCh1U2FtcGxlciwgdlRleHR1cmVDb29yZCArIGJsdWUvZGltZW5zaW9ucy54eSkuYjtcIixcIiAgIGdsX0ZyYWdDb2xvci5hID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2VGV4dHVyZUNvb3JkKS5hO1wiLFwifVwiXX0sYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShiLkFic3RyYWN0RmlsdGVyLnByb3RvdHlwZSksYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3I9Yi5SR0JTcGxpdEZpbHRlcixPYmplY3QuZGVmaW5lUHJvcGVydHkoYi5SR0JTcGxpdEZpbHRlci5wcm90b3R5cGUsXCJhbmdsZVwiLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlmb3Jtcy5ibHVyLnZhbHVlLygxLzdlMyl9LHNldDpmdW5jdGlvbihhKXt0aGlzLnVuaWZvcm1zLmJsdXIudmFsdWU9MS83ZTMqYX19KSxcInVuZGVmaW5lZFwiIT10eXBlb2YgZXhwb3J0cz8oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHMmJihleHBvcnRzPW1vZHVsZS5leHBvcnRzPWIpLGV4cG9ydHMuUElYST1iKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShiKTphLlBJWEk9Yn0pLmNhbGwodGhpcyk7IiwiLyoqXG4gKiBUd2Vlbi5qcyAtIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanNcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanMvZ3JhcGhzL2NvbnRyaWJ1dG9ycyBmb3IgdGhlIGZ1bGwgbGlzdCBvZiBjb250cmlidXRvcnMuXG4gKiBUaGFuayB5b3UgYWxsLCB5b3UncmUgYXdlc29tZSFcbiAqL1xuXG4vLyBEYXRlLm5vdyBzaGltIGZvciAoYWhlbSkgSW50ZXJuZXQgRXhwbG8oZHxyKWVyXG5pZiAoIERhdGUubm93ID09PSB1bmRlZmluZWQgKSB7XG5cblx0RGF0ZS5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cblx0fTtcblxufVxuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoIGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgX3R3ZWVucyA9IFtdO1xuXG5cdHJldHVybiB7XG5cblx0XHRSRVZJU0lPTjogJzE0JyxcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0X3R3ZWVucy5wdXNoKCB0d2VlbiApO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZTogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YoIHR3ZWVuICk7XG5cblx0XHRcdGlmICggaSAhPT0gLTEgKSB7XG5cblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoIGksIDEgKTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0XHRpZiAoIF90d2VlbnMubGVuZ3RoID09PSAwICkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdHRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cblx0XHRcdHdoaWxlICggaSA8IF90d2VlbnMubGVuZ3RoICkge1xuXG5cdFx0XHRcdGlmICggX3R3ZWVuc1sgaSBdLnVwZGF0ZSggdGltZSApICkge1xuXG5cdFx0XHRcdFx0aSsrO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHRfdHdlZW5zLnNwbGljZSggaSwgMSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxufSApKCk7XG5cblRXRUVOLlR3ZWVuID0gZnVuY3Rpb24gKCBvYmplY3QgKSB7XG5cblx0dmFyIF9vYmplY3QgPSBvYmplY3Q7XG5cdHZhciBfdmFsdWVzU3RhcnQgPSB7fTtcblx0dmFyIF92YWx1ZXNFbmQgPSB7fTtcblx0dmFyIF92YWx1ZXNTdGFydFJlcGVhdCA9IHt9O1xuXHR2YXIgX2R1cmF0aW9uID0gMTAwMDtcblx0dmFyIF9yZXBlYXQgPSAwO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIFNldCBhbGwgc3RhcnRpbmcgdmFsdWVzIHByZXNlbnQgb24gdGhlIHRhcmdldCBvYmplY3Rcblx0Zm9yICggdmFyIGZpZWxkIGluIG9iamVjdCApIHtcblxuXHRcdF92YWx1ZXNTdGFydFsgZmllbGQgXSA9IHBhcnNlRmxvYXQob2JqZWN0W2ZpZWxkXSwgMTApO1xuXG5cdH1cblxuXHR0aGlzLnRvID0gZnVuY3Rpb24gKCBwcm9wZXJ0aWVzLCBkdXJhdGlvbiApIHtcblxuXHRcdGlmICggZHVyYXRpb24gIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0X2R1cmF0aW9uID0gZHVyYXRpb247XG5cblx0XHR9XG5cblx0XHRfdmFsdWVzRW5kID0gcHJvcGVydGllcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdFRXRUVOLmFkZCggdGhpcyApO1xuXG5cdFx0X2lzUGxheWluZyA9IHRydWU7XG5cblx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblxuXHRcdF9zdGFydFRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cdFx0X3N0YXJ0VGltZSArPSBfZGVsYXlUaW1lO1xuXG5cdFx0Zm9yICggdmFyIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdLmxlbmd0aCA9PT0gMCApIHtcblxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBjcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFsgcHJvcGVydHkgXSA9IFsgX29iamVjdFsgcHJvcGVydHkgXSBdLmNvbmNhdCggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSApO1xuXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF9vYmplY3RbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmKCAoIF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSBpbnN0YW5jZW9mIEFycmF5ICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoICFfaXNQbGF5aW5nICkge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKCB0aGlzICk7XG5cdFx0X2lzUGxheWluZyA9IGZhbHNlO1xuXG5cdFx0aWYgKCBfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHR9XG5cblx0XHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRfY2hhaW5lZFR3ZWVuc1sgaSBdLnN0b3AoKTtcblxuXHRcdH1cblxuXHR9O1xuXG5cdHRoaXMuZGVsYXkgPSBmdW5jdGlvbiAoIGFtb3VudCApIHtcblxuXHRcdF9kZWxheVRpbWUgPSBhbW91bnQ7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnJlcGVhdCA9IGZ1bmN0aW9uICggdGltZXMgKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnlveW8gPSBmdW5jdGlvbiggeW95byApIHtcblxuXHRcdF95b3lvID0geW95bztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cblx0dGhpcy5lYXNpbmcgPSBmdW5jdGlvbiAoIGVhc2luZyApIHtcblxuXHRcdF9lYXNpbmdGdW5jdGlvbiA9IGVhc2luZztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuaW50ZXJwb2xhdGlvbiA9IGZ1bmN0aW9uICggaW50ZXJwb2xhdGlvbiApIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25VcGRhdGUgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25Db21wbGV0ZSA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25TdG9wQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0dmFyIHByb3BlcnR5O1xuXG5cdFx0aWYgKCB0aW1lIDwgX3N0YXJ0VGltZSApIHtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cblx0XHRpZiAoIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9PT0gZmFsc2UgKSB7XG5cblx0XHRcdGlmICggX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0dmFyIGVsYXBzZWQgPSAoIHRpbWUgLSBfc3RhcnRUaW1lICkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YXIgdmFsdWUgPSBfZWFzaW5nRnVuY3Rpb24oIGVsYXBzZWQgKTtcblxuXHRcdGZvciAoIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdHZhciBzdGFydCA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXHRcdFx0dmFyIGVuZCA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmICggZW5kIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24oIGVuZCwgdmFsdWUgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHQvLyBQYXJzZXMgcmVsYXRpdmUgZW5kIHZhbHVlcyB3aXRoIHN0YXJ0IGFzIGJhc2UgKGUuZy46ICsxMCwgLTMpXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0ZW5kID0gc3RhcnQgKyBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IHN0YXJ0ICsgKCBlbmQgLSBzdGFydCApICogdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0aWYgKCBfb25VcGRhdGVDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0X29uVXBkYXRlQ2FsbGJhY2suY2FsbCggX29iamVjdCwgdmFsdWUgKTtcblxuXHRcdH1cblxuXHRcdGlmICggZWxhcHNlZCA9PSAxICkge1xuXG5cdFx0XHRpZiAoIF9yZXBlYXQgPiAwICkge1xuXG5cdFx0XHRcdGlmKCBpc0Zpbml0ZSggX3JlcGVhdCApICkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciggcHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0ICkge1xuXG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gKSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSwgMTApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cdFx0XHRcdFx0XHRfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0X3JldmVyc2VkID0gIV9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX2RlbGF5VGltZTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoIF9vbkNvbXBsZXRlQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdFx0XHRfb25Db21wbGV0ZUNhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRcdFx0X2NoYWluZWRUd2VlbnNbIGkgXS5zdGFydCggdGltZSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXG5cdH07XG5cbn07XG5cblxuVFdFRU4uRWFzaW5nID0ge1xuXG5cdExpbmVhcjoge1xuXG5cdFx0Tm9uZTogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gaztcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YWRyYXRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqICggMiAtIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIC0gMC41ICogKCAtLWsgKiAoIGsgLSAyICkgLSAxICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDdWJpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogayArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YXJ0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtICggLS1rICogayAqIGsgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoICggayAtPSAyICkgKiBrICogayAqIGsgLSAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWludGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiBrICogayAqIGsgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRTaW51c29pZGFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguY29zKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc2luKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKCAxIC0gTWF0aC5jb3MoIE1hdGguUEkgKiBrICkgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEV4cG9uZW50aWFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdyggMTAyNCwgayAtIDEgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDEgPyAxIDogMSAtIE1hdGgucG93KCAyLCAtIDEwICogayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIE1hdGgucG93KCAxMDI0LCBrIC0gMSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggLSBNYXRoLnBvdyggMiwgLSAxMCAqICggayAtIDEgKSApICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5zcXJ0KCAxIC0gayAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCggMSAtICggLS1rICogayApICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIC0gMC41ICogKCBNYXRoLnNxcnQoIDEgLSBrICogaykgLSAxKTtcblx0XHRcdHJldHVybiAwLjUgKiAoIE1hdGguc3FydCggMSAtICggayAtPSAyKSAqIGspICsgMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFbGFzdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuIC0gKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuICggYSAqIE1hdGgucG93KCAyLCAtIDEwICogaykgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICsgMSApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzLCBhID0gMC4xLCBwID0gMC40O1xuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggIWEgfHwgYSA8IDEgKSB7IGEgPSAxOyBzID0gcCAvIDQ7IH1cblx0XHRcdGVsc2UgcyA9IHAgKiBNYXRoLmFzaW4oIDEgLyBhICkgLyAoIDIgKiBNYXRoLlBJICk7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIC0gMC41ICogKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXHRcdFx0cmV0dXJuIGEgKiBNYXRoLnBvdyggMiwgLTEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSAqIDAuNSArIDE7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCYWNrOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cdFx0XHRyZXR1cm4gayAqIGsgKiAoICggcyArIDEgKSAqIGsgLSBzICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblx0XHRcdHJldHVybiAtLWsgKiBrICogKCAoIHMgKyAxICkgKiBrICsgcyApICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogKCBrICogayAqICggKCBzICsgMSApICogayAtIHMgKSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiAoICggcyArIDEgKSAqIGsgKyBzICkgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCb3VuY2U6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoIDEgLSBrICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8ICggMSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogayAqIGs7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDEuNSAvIDIuNzUgKSApICogayArIDAuNzU7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIuNSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi4yNSAvIDIuNzUgKSApICogayArIDAuOTM3NTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi42MjUgLyAyLjc1ICkgKSAqIGsgKyAwLjk4NDM3NTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8IDAuNSApIHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLkluKCBrICogMiApICogMC41O1xuXHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KCBrICogMiAtIDEgKSAqIDAuNSArIDAuNTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cblRXRUVOLkludGVycG9sYXRpb24gPSB7XG5cblx0TGluZWFyOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuTGluZWFyO1xuXG5cdFx0aWYgKCBrIDwgMCApIHJldHVybiBmbiggdlsgMCBdLCB2WyAxIF0sIGYgKTtcblx0XHRpZiAoIGsgPiAxICkgcmV0dXJuIGZuKCB2WyBtIF0sIHZbIG0gLSAxIF0sIG0gLSBmICk7XG5cblx0XHRyZXR1cm4gZm4oIHZbIGkgXSwgdlsgaSArIDEgPiBtID8gbSA6IGkgKyAxIF0sIGYgLSBpICk7XG5cblx0fSxcblxuXHRCZXppZXI6IGZ1bmN0aW9uICggdiwgayApIHtcblxuXHRcdHZhciBiID0gMCwgbiA9IHYubGVuZ3RoIC0gMSwgcHcgPSBNYXRoLnBvdywgYm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkJlcm5zdGVpbiwgaTtcblxuXHRcdGZvciAoIGkgPSAwOyBpIDw9IG47IGkrKyApIHtcblx0XHRcdGIgKz0gcHcoIDEgLSBrLCBuIC0gaSApICogcHcoIGssIGkgKSAqIHZbIGkgXSAqIGJuKCBuLCBpICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGI7XG5cblx0fSxcblxuXHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQ2F0bXVsbFJvbTtcblxuXHRcdGlmICggdlsgMCBdID09PSB2WyBtIF0gKSB7XG5cblx0XHRcdGlmICggayA8IDAgKSBpID0gTWF0aC5mbG9vciggZiA9IG0gKiAoIDEgKyBrICkgKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyAoIGkgLSAxICsgbSApICUgbSBdLCB2WyBpIF0sIHZbICggaSArIDEgKSAlIG0gXSwgdlsgKCBpICsgMiApICUgbSBdLCBmIC0gaSApO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKCBrIDwgMCApIHJldHVybiB2WyAwIF0gLSAoIGZuKCB2WyAwIF0sIHZbIDAgXSwgdlsgMSBdLCB2WyAxIF0sIC1mICkgLSB2WyAwIF0gKTtcblx0XHRcdGlmICggayA+IDEgKSByZXR1cm4gdlsgbSBdIC0gKCBmbiggdlsgbSBdLCB2WyBtIF0sIHZbIG0gLSAxIF0sIHZbIG0gLSAxIF0sIGYgLSBtICkgLSB2WyBtIF0gKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyBpID8gaSAtIDEgOiAwIF0sIHZbIGkgXSwgdlsgbSA8IGkgKyAxID8gbSA6IGkgKyAxIF0sIHZbIG0gPCBpICsgMiA/IG0gOiBpICsgMiBdLCBmIC0gaSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0VXRpbHM6IHtcblxuXHRcdExpbmVhcjogZnVuY3Rpb24gKCBwMCwgcDEsIHQgKSB7XG5cblx0XHRcdHJldHVybiAoIHAxIC0gcDAgKSAqIHQgKyBwMDtcblxuXHRcdH0sXG5cblx0XHRCZXJuc3RlaW46IGZ1bmN0aW9uICggbiAsIGkgKSB7XG5cblx0XHRcdHZhciBmYyA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuRmFjdG9yaWFsO1xuXHRcdFx0cmV0dXJuIGZjKCBuICkgLyBmYyggaSApIC8gZmMoIG4gLSBpICk7XG5cblx0XHR9LFxuXG5cdFx0RmFjdG9yaWFsOiAoIGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0dmFyIGEgPSBbIDEgXTtcblxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICggbiApIHtcblxuXHRcdFx0XHR2YXIgcyA9IDEsIGk7XG5cdFx0XHRcdGlmICggYVsgbiBdICkgcmV0dXJuIGFbIG4gXTtcblx0XHRcdFx0Zm9yICggaSA9IG47IGkgPiAxOyBpLS0gKSBzICo9IGk7XG5cdFx0XHRcdHJldHVybiBhWyBuIF0gPSBzO1xuXG5cdFx0XHR9O1xuXG5cdFx0fSApKCksXG5cblx0XHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHAwLCBwMSwgcDIsIHAzLCB0ICkge1xuXG5cdFx0XHR2YXIgdjAgPSAoIHAyIC0gcDAgKSAqIDAuNSwgdjEgPSAoIHAzIC0gcDEgKSAqIDAuNSwgdDIgPSB0ICogdCwgdDMgPSB0ICogdDI7XG5cdFx0XHRyZXR1cm4gKCAyICogcDEgLSAyICogcDIgKyB2MCArIHYxICkgKiB0MyArICggLSAzICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSApICogdDIgKyB2MCAqIHQgKyBwMTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzPVRXRUVOOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBQaXhpQXBwID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1BpeGlBcHBcIik7XG52YXIgTmV0UG9rZXJDbGllbnRWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvTmV0UG9rZXJDbGllbnRWaWV3XCIpO1xudmFyIE5ldFBva2VyQ2xpZW50Q29udHJvbGxlciA9IHJlcXVpcmUoXCIuLi9jb250cm9sbGVyL05ldFBva2VyQ2xpZW50Q29udHJvbGxlclwiKTtcbnZhciBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvblwiKTtcbnZhciBQcm90b0Nvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vUHJvdG9Db25uZWN0aW9uXCIpO1xudmFyIExvYWRpbmdTY3JlZW4gPSByZXF1aXJlKFwiLi4vdmlldy9Mb2FkaW5nU2NyZWVuXCIpO1xudmFyIFN0YXRlQ29tcGxldGVNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1N0YXRlQ29tcGxldGVNZXNzYWdlXCIpO1xudmFyIEluaXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0luaXRNZXNzYWdlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xuXG4vKipcbiAqIE1haW4gZW50cnkgcG9pbnQgZm9yIGNsaWVudC5cbiAqIEBjbGFzcyBOZXRQb2tlckNsaWVudFxuICovXG5mdW5jdGlvbiBOZXRQb2tlckNsaWVudChkb21JZCkge1xuXHRQaXhpQXBwLmNhbGwodGhpcywgZG9tSWQsIDk2MCwgNzIwKTtcblxuXHR0aGlzLmxvYWRpbmdTY3JlZW4gPSBuZXcgTG9hZGluZ1NjcmVlbigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMubG9hZGluZ1NjcmVlbik7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiTE9BRElOR1wiKTtcblxuXHR0aGlzLnVybCA9IG51bGw7XG5cblx0dGhpcy50YWJsZUlkPW51bGw7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoTmV0UG9rZXJDbGllbnQsIFBpeGlBcHApO1xuXG4vKipcbiAqIFNldCB1cmwuXG4gKiBAbWV0aG9kIHNldFVybFxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0VXJsID0gZnVuY3Rpb24odXJsKSB7XG5cdHRoaXMudXJsID0gdXJsO1xufVxuXG4vKipcbiAqIFNldCB0YWJsZSBpZC5cbiAqIEBtZXRob2Qgc2V0VGFibGVJZFxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0VGFibGVJZCA9IGZ1bmN0aW9uKHRhYmxlSWQpIHtcblx0dGhpcy50YWJsZUlkID0gdGFibGVJZDtcbn1cblxuLyoqXG4gKiBTZXQgdmlldyBjYXNlLlxuICogQG1ldGhvZCBzZXRWaWV3Q2FzZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0Vmlld0Nhc2UgPSBmdW5jdGlvbih2aWV3Q2FzZSkge1xuXHRjb25zb2xlLmxvZyhcIioqKioqKiBydW5uaW5nIHZpZXcgY2FzZTogXCIrdmlld0Nhc2UpO1xuXHR0aGlzLnZpZXdDYXNlPXZpZXdDYXNlO1xufVxuXG4vKipcbiAqIFNldCB0b2tlbi5cbiAqIEBtZXRob2Qgc2V0VG9rZW5cbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnNldFRva2VuID0gZnVuY3Rpb24odG9rZW4pIHtcblx0dGhpcy50b2tlbiA9IHRva2VuO1xufVxuXG4vKipcbiAqIFNldCB0b2tlbi5cbiAqIEBtZXRob2Qgc2V0U2tpblxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUuc2V0U2tpbiA9IGZ1bmN0aW9uKHNraW4pIHtcblx0UmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbiA9IHNraW47XG59XG5cbi8qKlxuICogUnVuLlxuICogQG1ldGhvZCBydW5cbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCkge1xuXG5cdHZhciBhc3NldHMgPSBbXG5cdFx0XCJ0YWJsZS5wbmdcIixcblx0XHRcImNvbXBvbmVudHMucG5nXCJcblx0XTtcblx0aWYoKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4gIT0gbnVsbCkgJiYgKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLnNraW4udGV4dHVyZXMgIT0gbnVsbCkpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0YXNzZXRzLnB1c2goUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuc2tpbi50ZXh0dXJlc1tpXS5maWxlKTtcblx0XHRcdGNvbnNvbGUubG9nKFwiYWRkIHRvIGxvYWQgbGlzdDogXCIgKyBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5za2luLnRleHR1cmVzW2ldLmZpbGUpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuYXNzZXRMb2FkZXIgPSBuZXcgUElYSS5Bc3NldExvYWRlcihhc3NldHMpO1xuXHR0aGlzLmFzc2V0TG9hZGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJvbkNvbXBsZXRlXCIsIHRoaXMub25Bc3NldExvYWRlckNvbXBsZXRlLmJpbmQodGhpcykpO1xuXHR0aGlzLmFzc2V0TG9hZGVyLmxvYWQoKTtcbn1cblxuLyoqXG4gKiBBc3NldHMgbG9hZGVkLCBjb25uZWN0LlxuICogQG1ldGhvZCBvbkFzc2V0TG9hZGVyQ29tcGxldGVcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vbkFzc2V0TG9hZGVyQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJhc3NldCBsb2FkZXIgY29tcGxldGUuLi5cIik7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcgPSBuZXcgTmV0UG9rZXJDbGllbnRWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGRBdCh0aGlzLm5ldFBva2VyQ2xpZW50VmlldywgMCk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudENvbnRyb2xsZXIgPSBuZXcgTmV0UG9rZXJDbGllbnRDb250cm9sbGVyKHRoaXMubmV0UG9rZXJDbGllbnRWaWV3KTtcblx0dGhpcy5jb25uZWN0KCk7XG59XG5cbi8qKlxuICogQ29ubmVjdC5cbiAqIEBtZXRob2QgY29ubmVjdFxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpIHtcblx0aWYgKCF0aGlzLnVybCkge1xuXHRcdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiTkVFRCBVUkxcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5jb25uZWN0aW9uID0gbmV3IE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uKCk7XG5cdHRoaXMuY29ubmVjdGlvbi5vbihNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNULCB0aGlzLm9uQ29ubmVjdGlvbkNvbm5lY3QsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24ub24oTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24uY29ubmVjdCh0aGlzLnVybCk7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiQ09OTkVDVElOR1wiKTtcbn1cblxuLyoqXG4gKiBDb25uZWN0aW9uIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25Db25uZWN0XG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudC5wcm90b3R5cGUub25Db25uZWN0aW9uQ29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuXHRjb25zb2xlLmxvZyhcIioqKiogY29ubmVjdGVkXCIpO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbiA9IG5ldyBQcm90b0Nvbm5lY3Rpb24odGhpcy5jb25uZWN0aW9uKTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uYWRkTWVzc2FnZUhhbmRsZXIoU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMub25TdGF0ZUNvbXBsZXRlTWVzc2FnZSwgdGhpcyk7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnNldFByb3RvQ29ubmVjdGlvbih0aGlzLnByb3RvQ29ubmVjdGlvbik7XG5cdHRoaXMubG9hZGluZ1NjcmVlbi5zaG93KFwiSU5JVElBTElaSU5HXCIpO1xuXG5cdHZhciBpbml0TWVzc2FnZT1uZXcgSW5pdE1lc3NhZ2UodGhpcy50b2tlbik7XG5cblx0aWYgKHRoaXMudGFibGVJZClcblx0XHRpbml0TWVzc2FnZS5zZXRUYWJsZUlkKHRoaXMudGFibGVJZCk7XG5cblx0aWYgKHRoaXMudmlld0Nhc2UpXG5cdFx0aW5pdE1lc3NhZ2Uuc2V0Vmlld0Nhc2UodGhpcy52aWV3Q2FzZSk7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChpbml0TWVzc2FnZSk7XG59XG5cbi8qKlxuICogU3RhdGUgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uU3RhdGVDb21wbGV0ZU1lc3NhZ2VcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50LnByb3RvdHlwZS5vblN0YXRlQ29tcGxldGVNZXNzYWdlPWZ1bmN0aW9uKCkge1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uaGlkZSgpO1xufVxuXG4vKipcbiAqIENvbm5lY3Rpb24gY2xvc2VkLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25DbG9zZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnQucHJvdG90eXBlLm9uQ29ubmVjdGlvbkNsb3NlID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwiKioqKiBjb25uZWN0aW9uIGNsb3NlZFwiKTtcblx0aWYgKHRoaXMucHJvdG9Db25uZWN0aW9uKVxuXHRcdHRoaXMucHJvdG9Db25uZWN0aW9uLnJlbW92ZU1lc3NhZ2VIYW5kbGVyKFN0YXRlQ29tcGxldGVNZXNzYWdlLCB0aGlzLm9uU3RhdGVDb21wbGV0ZU1lc3NhZ2UsIHRoaXMpO1xuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gbnVsbDtcblx0dGhpcy5uZXRQb2tlckNsaWVudENvbnRyb2xsZXIuc2V0UHJvdG9Db25uZWN0aW9uKG51bGwpO1xuXHR0aGlzLmxvYWRpbmdTY3JlZW4uc2hvdyhcIkNPTk5FQ1RJT04gRVJST1JcIik7XG5cdHNldFRpbWVvdXQodGhpcy5jb25uZWN0LmJpbmQodGhpcyksIDMwMDApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5ldFBva2VyQ2xpZW50OyIsIlxuXG4vKipcbiAqIENsaWVudCByZXNvdXJjZXNcbiAqIEBjbGFzcyBTZXR0aW5ncy5cbiAqL1xuIGZ1bmN0aW9uIFNldHRpbmdzKCkge1xuIFx0dGhpcy5wbGF5QW5pbWF0aW9ucyA9IHRydWU7XG4gfVxuXG5cbi8qKlxuICogR2V0IHNpbmdsZXRvbiBpbnN0YW5jZS5cbiAqIEBtZXRob2QgZ2V0SW5zdGFuY2VcbiAqL1xuU2V0dGluZ3MuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbigpIHtcblx0aWYgKCFTZXR0aW5ncy5pbnN0YW5jZSlcblx0XHRTZXR0aW5ncy5pbnN0YW5jZSA9IG5ldyBTZXR0aW5ncygpO1xuXG5cdHJldHVybiBTZXR0aW5ncy5pbnN0YW5jZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXR0aW5nczsiLCJ2YXIgU2hvd0RpYWxvZ01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU2hvd0RpYWxvZ01lc3NhZ2VcIik7XG52YXIgQnV0dG9uc01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQnV0dG9uc01lc3NhZ2VcIik7XG52YXIgQ2hhdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQ2hhdE1lc3NhZ2VcIik7XG5cbi8qKlxuICogQ29udHJvbCB1c2VyIGludGVyZmFjZS5cbiAqIEBjbGFzcyBJbnRlcmZhY2VDb250cm9sbGVyXG4gKi9cbmZ1bmN0aW9uIEludGVyZmFjZUNvbnRyb2xsZXIobWVzc2FnZVNlcXVlbmNlciwgdmlldykge1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIgPSBtZXNzYWdlU2VxdWVuY2VyO1xuXHR0aGlzLnZpZXcgPSB2aWV3O1xuXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihCdXR0b25zTWVzc2FnZS5UWVBFLCB0aGlzLm9uQnV0dG9uc01lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoU2hvd0RpYWxvZ01lc3NhZ2UuVFlQRSwgdGhpcy5vblNob3dEaWFsb2dNZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKENoYXRNZXNzYWdlLlRZUEUsIHRoaXMub25DaGF0LCB0aGlzKTtcblxufVxuXG4vKipcbiAqIEJ1dHRvbnMgbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25CdXR0b25zTWVzc2FnZVxuICovXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vbkJ1dHRvbnNNZXNzYWdlID0gZnVuY3Rpb24obSkge1xuXHR2YXIgYnV0dG9uc1ZpZXcgPSB0aGlzLnZpZXcuZ2V0QnV0dG9uc1ZpZXcoKTtcblxuXHRidXR0b25zVmlldy5zZXRCdXR0b25zKG0uZ2V0QnV0dG9ucygpKTtcbn1cblxuLyoqXG4gKiBTaG93IGRpYWxvZy5cbiAqIEBtZXRob2Qgb25TaG93RGlhbG9nTWVzc2FnZVxuICovXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vblNob3dEaWFsb2dNZXNzYWdlID0gZnVuY3Rpb24obSkge1xuXHR2YXIgZGlhbG9nVmlldyA9IHRoaXMudmlldy5nZXREaWFsb2dWaWV3KCk7XG5cblx0ZGlhbG9nVmlldy5zaG93KG0uZ2V0VGV4dCgpLCBtLmdldEJ1dHRvbnMoKSwgbS5nZXREZWZhdWx0VmFsdWUoKSk7XG59XG5cblxuLyoqXG4gKiBPbiBjaGF0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uQ2hhdFxuICovXG5JbnRlcmZhY2VDb250cm9sbGVyLnByb3RvdHlwZS5vbkNoYXQgPSBmdW5jdGlvbihtKSB7XG5cdHRoaXMudmlldy5jaGF0Vmlldy5hZGRUZXh0KG0udXNlciwgbS50ZXh0KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcmZhY2VDb250cm9sbGVyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgU2VxdWVuY2VyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1NlcXVlbmNlclwiKTtcblxuLyoqXG4gKiBBbiBpdGVtIGluIGEgbWVzc2FnZSBzZXF1ZW5jZS5cbiAqIEBjbGFzcyBNZXNzYWdlU2VxdWVuY2VJdGVtXG4gKi9cbmZ1bmN0aW9uIE1lc3NhZ2VTZXF1ZW5jZUl0ZW0obWVzc2FnZSkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0dGhpcy53YWl0VGFyZ2V0ID0gbnVsbDtcblx0dGhpcy53YWl0RXZlbnQgPSBudWxsO1xuXHR0aGlzLndhaXRDbG9zdXJlID0gbnVsbDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChNZXNzYWdlU2VxdWVuY2VJdGVtLCBFdmVudERpc3BhdGNoZXIpO1xuXG4vKipcbiAqIEdldCBtZXNzYWdlLlxuICogQG1ldGhvZCBnZXRNZXNzYWdlXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLmdldE1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcblx0Ly9jb25zb2xlLmxvZyhcImdldHRpbmc6IFwiICsgdGhpcy5tZXNzYWdlLnR5cGUpO1xuXG5cdHJldHVybiB0aGlzLm1lc3NhZ2U7XG59XG5cbi8qKlxuICogQXJlIHdlIHdhaXRpbmcgZm9yIGFuIGV2ZW50P1xuICogQG1ldGhvZCBpc1dhaXRpbmdcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUuaXNXYWl0aW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLndhaXRFdmVudCAhPSBudWxsO1xufVxuXG4vKipcbiAqIE5vdGlmeSBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgbm90aWZ5Q29tcGxldGVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUubm90aWZ5Q29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50cmlnZ2VyKFNlcXVlbmNlci5DT01QTEVURSk7XG59XG5cbi8qKlxuICogV2FpdCBmb3IgZXZlbnQgYmVmb3JlIHByb2Nlc3NpbmcgbmV4dCBtZXNzYWdlLlxuICogQG1ldGhvZCB3YWl0Rm9yXG4gKi9cbk1lc3NhZ2VTZXF1ZW5jZUl0ZW0ucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbih0YXJnZXQsIGV2ZW50KSB7XG5cdHRoaXMud2FpdFRhcmdldCA9IHRhcmdldDtcblx0dGhpcy53YWl0RXZlbnQgPSBldmVudDtcblx0dGhpcy53YWl0Q2xvc3VyZSA9IHRoaXMub25UYXJnZXRDb21wbGV0ZS5iaW5kKHRoaXMpO1xuXG5cdHRoaXMud2FpdFRhcmdldC5hZGRFdmVudExpc3RlbmVyKHRoaXMud2FpdEV2ZW50LCB0aGlzLndhaXRDbG9zdXJlKTtcbn1cblxuLyoqXG4gKiBXYWl0IHRhcmdldCBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25UYXJnZXRDb21wbGV0ZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVNlcXVlbmNlSXRlbS5wcm90b3R5cGUub25UYXJnZXRDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHQvL2NvbnNvbGUubG9nKFwidGFyZ2V0IGlzIGNvbXBsZXRlXCIpO1xuXHR0aGlzLndhaXRUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLndhaXRFdmVudCwgdGhpcy53YWl0Q2xvc3VyZSk7XG5cdHRoaXMubm90aWZ5Q29tcGxldGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlU2VxdWVuY2VJdGVtOyIsInZhciBTZXF1ZW5jZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2VxdWVuY2VyXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgTWVzc2FnZVNlcXVlbmNlSXRlbSA9IHJlcXVpcmUoXCIuL01lc3NhZ2VTZXF1ZW5jZUl0ZW1cIik7XG5cbi8qKlxuICogU2VxdWVuY2VzIG1lc3NhZ2VzLlxuICogQGNsYXNzIE1lc3NhZ2VTZXF1ZW5jZXJcbiAqL1xuZnVuY3Rpb24gTWVzc2FnZVNlcXVlbmNlcigpIHtcblx0dGhpcy5zZXF1ZW5jZXIgPSBuZXcgU2VxdWVuY2VyKCk7XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG5cdHRoaXMuY3VycmVudEl0ZW0gPSBudWxsO1xufVxuXG4vKipcbiAqIEFkZCBhIG1lc3NhZ2UgZm9yIHByb2Nlc2luZy5cbiAqIEBtZXRob2QgZW5xdWV1ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHRpZiAoIW1lc3NhZ2UudHlwZSlcblx0XHR0aHJvdyBcIk1lc3NhZ2UgZG9lc24ndCBoYXZlIGEgdHlwZVwiO1xuXG5cdHZhciBzZXF1ZW5jZUl0ZW0gPSBuZXcgTWVzc2FnZVNlcXVlbmNlSXRlbShtZXNzYWdlKTtcblxuXHRzZXF1ZW5jZUl0ZW0ub24oU2VxdWVuY2VyLlNUQVJULCB0aGlzLm9uU2VxdWVuY2VJdGVtU3RhcnQsIHRoaXMpO1xuXG5cdHRoaXMuc2VxdWVuY2VyLmVucXVldWUoc2VxdWVuY2VJdGVtKTtcbn1cblxuLyoqXG4gKiBTZXF1ZW5jZSBpdGVtIHN0YXJ0LlxuICogQG1ldGhvZCBvblNlcXVlbmNlSXRlbVN0YXJ0XG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlU2VxdWVuY2VyLnByb3RvdHlwZS5vblNlcXVlbmNlSXRlbVN0YXJ0ID0gZnVuY3Rpb24oZSkge1xuXHQvL2NvbnNvbGUubG9nKFwic3RhcnRpbmcgaXRlbS4uLlwiKTtcblx0dmFyIGl0ZW0gPSBlLnRhcmdldDtcblxuXHRpdGVtLm9mZihTZXF1ZW5jZXIuU1RBUlQsIHRoaXMub25TZXF1ZW5jZUl0ZW1TdGFydCwgdGhpcyk7XG5cblx0dGhpcy5jdXJyZW50SXRlbSA9IGl0ZW07XG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIudHJpZ2dlcihpdGVtLmdldE1lc3NhZ2UoKSk7XG5cdHRoaXMuY3VycmVudEl0ZW0gPSBudWxsO1xuXG5cdGlmICghaXRlbS5pc1dhaXRpbmcoKSlcblx0XHRpdGVtLm5vdGlmeUNvbXBsZXRlKCk7XG59XG5cbi8qKlxuICogQWRkIG1lc3NhZ2UgaGFuZGxlci5cbiAqIEBtZXRob2QgYWRkTWVzc2FnZUhhbmRsZXJcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUuYWRkTWVzc2FnZUhhbmRsZXIgPSBmdW5jdGlvbihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpIHtcblx0dGhpcy5tZXNzYWdlRGlzcGF0Y2hlci5vbihtZXNzYWdlVHlwZSwgaGFuZGxlciwgc2NvcGUpO1xufVxuXG4vKipcbiAqIFdhaXQgZm9yIHRoZSB0YXJnZXQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgYmVmb3JlIGNvbnRpbnVpbmcgdG9cbiAqIHByb2Nlc3MgdGhlIG1lc3NhZ2VzIGluIHRoZSBxdWUuXG4gKiBAbWV0aG9kIHdhaXRGb3JcbiAqL1xuTWVzc2FnZVNlcXVlbmNlci5wcm90b3R5cGUud2FpdEZvciA9IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnQpIHtcblx0aWYgKCF0aGlzLmN1cnJlbnRJdGVtKVxuXHRcdHRocm93IFwiTm90IHdhaXRpbmcgZm9yIGV2ZW50XCI7XG5cblx0dGhpcy5jdXJyZW50SXRlbS53YWl0Rm9yKHRhcmdldCwgZXZlbnQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VTZXF1ZW5jZXI7IiwidmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgTWVzc2FnZVNlcXVlbmNlciA9IHJlcXVpcmUoXCIuL01lc3NhZ2VTZXF1ZW5jZXJcIik7XG52YXIgUHJvdG9Db25uZWN0aW9uID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL1Byb3RvQ29ubmVjdGlvblwiKTtcbnZhciBCdXR0b25zVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L0J1dHRvbnNWaWV3XCIpO1xudmFyIEJ1dHRvbkNsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CdXR0b25DbGlja01lc3NhZ2VcIik7XG52YXIgU2VhdENsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9TZWF0Q2xpY2tNZXNzYWdlXCIpO1xudmFyIE5ldFBva2VyQ2xpZW50VmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L05ldFBva2VyQ2xpZW50Vmlld1wiKTtcbnZhciBEaWFsb2dWaWV3ID0gcmVxdWlyZShcIi4uL3ZpZXcvRGlhbG9nVmlld1wiKTtcbnZhciBTZXR0aW5nc1ZpZXcgPSByZXF1aXJlKFwiLi4vdmlldy9TZXR0aW5nc1ZpZXdcIik7XG52YXIgVGFibGVDb250cm9sbGVyID0gcmVxdWlyZShcIi4vVGFibGVDb250cm9sbGVyXCIpO1xudmFyIEludGVyZmFjZUNvbnRyb2xsZXIgPSByZXF1aXJlKFwiLi9JbnRlcmZhY2VDb250cm9sbGVyXCIpO1xudmFyIENoYXRNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0NoYXRNZXNzYWdlXCIpO1xudmFyIEJ1dHRvbkRhdGEgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vZGF0YS9CdXR0b25EYXRhXCIpO1xuXG4vKipcbiAqIE1haW4gY29udHJvbGxlclxuICogQGNsYXNzIE5ldFBva2VyQ2xpZW50Q29udHJvbGxlclxuICovXG5mdW5jdGlvbiBOZXRQb2tlckNsaWVudENvbnRyb2xsZXIodmlldykge1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50VmlldyA9IHZpZXc7XG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gbnVsbDtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyID0gbmV3IE1lc3NhZ2VTZXF1ZW5jZXIoKTtcblxuXHR0aGlzLnRhYmxlQ29udHJvbGxlciA9IG5ldyBUYWJsZUNvbnRyb2xsZXIodGhpcy5tZXNzYWdlU2VxdWVuY2VyLCB0aGlzLm5ldFBva2VyQ2xpZW50Vmlldyk7XG5cdHRoaXMuaW50ZXJmYWNlQ29udHJvbGxlciA9IG5ldyBJbnRlcmZhY2VDb250cm9sbGVyKHRoaXMubWVzc2FnZVNlcXVlbmNlciwgdGhpcy5uZXRQb2tlckNsaWVudFZpZXcpO1xuXG5cdGNvbnNvbGUubG9nKHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmdldERpYWxvZ1ZpZXcoKSk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuZ2V0QnV0dG9uc1ZpZXcoKS5vbihCdXR0b25zVmlldy5CVVRUT05fQ0xJQ0ssIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmdldERpYWxvZ1ZpZXcoKS5vbihEaWFsb2dWaWV3LkJVVFRPTl9DTElDSywgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcub24oTmV0UG9rZXJDbGllbnRWaWV3LlNFQVRfQ0xJQ0ssIHRoaXMub25TZWF0Q2xpY2ssIHRoaXMpO1xuXG5cdHRoaXMubmV0UG9rZXJDbGllbnRWaWV3LmNoYXRWaWV3LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGF0XCIsIHRoaXMub25WaWV3Q2hhdCwgdGhpcyk7XG5cblx0dGhpcy5uZXRQb2tlckNsaWVudFZpZXcuc2V0dGluZ3NWaWV3LmFkZEV2ZW50TGlzdGVuZXIoU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSywgdGhpcy5vbkJ1eUNoaXBzQnV0dG9uQ2xpY2ssIHRoaXMpO1xufVxuXG5cbi8qKlxuICogU2V0IGNvbm5lY3Rpb24uXG4gKiBAbWV0aG9kIHNldFByb3RvQ29ubmVjdGlvblxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLnNldFByb3RvQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKHByb3RvQ29ubmVjdGlvbikge1xuXHRpZiAodGhpcy5wcm90b0Nvbm5lY3Rpb24pIHtcblx0XHR0aGlzLnByb3RvQ29ubmVjdGlvbi5vZmYoUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UsIHRoaXMub25Qcm90b0Nvbm5lY3Rpb25NZXNzYWdlLCB0aGlzKTtcblx0fVxuXG5cdHRoaXMucHJvdG9Db25uZWN0aW9uID0gcHJvdG9Db25uZWN0aW9uO1xuXHR0aGlzLm5ldFBva2VyQ2xpZW50Vmlldy5jbGVhcigpO1xuXG5cdGlmICh0aGlzLnByb3RvQ29ubmVjdGlvbikge1xuXHRcdHRoaXMucHJvdG9Db25uZWN0aW9uLm9uKFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFLCB0aGlzLm9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZSwgdGhpcyk7XG5cdH1cbn1cblxuLyoqXG4gKiBJbmNvbWluZyBtZXNzYWdlLlxuICogRW5xdWV1ZSBmb3IgcHJvY2Vzc2luZy5cbiAqwqBAbWV0aG9kIG9uUHJvdG9Db25uZWN0aW9uTWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vblByb3RvQ29ubmVjdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5lbnF1ZXVlKGUubWVzc2FnZSk7XG59XG5cbi8qKlxuICogQnV0dG9uIGNsaWNrLlxuICogVGhpcyBmdW5jdGlvbiBoYW5kbGVzIGNsaWNrcyBmcm9tIGJvdGggdGhlIGRpYWxvZyBhbmQgZ2FtZSBwbGF5IGJ1dHRvbnMuXG4gKiBAbWV0aG9kIG9uQnV0dG9uQ2xpY2tcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Q29udHJvbGxlci5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0aWYgKCF0aGlzLnByb3RvQ29ubmVjdGlvbilcblx0XHRyZXR1cm47XG5cblx0Y29uc29sZS5sb2coXCJidXR0b24gY2xpY2ssIHY9XCIgKyBlLnZhbHVlKTtcblxuXHR2YXIgbSA9IG5ldyBCdXR0b25DbGlja01lc3NhZ2UoZS5idXR0b24sIGUudmFsdWUpO1xuXHR0aGlzLnByb3RvQ29ubmVjdGlvbi5zZW5kKG0pO1xufVxuXG4vKipcbiAqIFNlYXQgY2xpY2suXG4gKiBAbWV0aG9kIG9uU2VhdENsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uU2VhdENsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgbSA9IG5ldyBTZWF0Q2xpY2tNZXNzYWdlKGUuc2VhdEluZGV4KTtcblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChtKTtcbn1cblxuLyoqXG4gKiBPbiBzZW5kIGNoYXQgbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25WaWV3Q2hhdFxuICovXG5OZXRQb2tlckNsaWVudENvbnRyb2xsZXIucHJvdG90eXBlLm9uVmlld0NoYXQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHZhciBtZXNzYWdlID0gbmV3IENoYXRNZXNzYWdlKCk7XG5cdG1lc3NhZ2UudXNlciA9IFwiXCI7XG5cdG1lc3NhZ2UudGV4dCA9IHRleHQ7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChtZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBPbiBidXkgY2hpcHMgYnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvbkJ1eUNoaXBzQnV0dG9uQ2xpY2tcbiAqL1xuTmV0UG9rZXJDbGllbnRDb250cm9sbGVyLnByb3RvdHlwZS5vbkJ1eUNoaXBzQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJidXkgY2hpcHMgY2xpY2tcIik7XG5cblx0dGhpcy5wcm90b0Nvbm5lY3Rpb24uc2VuZChuZXcgQnV0dG9uQ2xpY2tNZXNzYWdlKEJ1dHRvbkRhdGEuQlVZX0NISVBTKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmV0UG9rZXJDbGllbnRDb250cm9sbGVyOyIsInZhciBTZWF0SW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvU2VhdEluZm9NZXNzYWdlXCIpO1xudmFyIENvbW11bml0eUNhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Db21tdW5pdHlDYXJkc01lc3NhZ2VcIik7XG52YXIgUG9ja2V0Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZVwiKTtcbnZhciBEZWFsZXJCdXR0b25NZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0RlYWxlckJ1dHRvbk1lc3NhZ2VcIik7XG52YXIgQmV0TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9CZXRNZXNzYWdlXCIpO1xudmFyIEJldHNUb1BvdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi4vLi4vcHJvdG8vbWVzc2FnZXMvQmV0c1RvUG90TWVzc2FnZVwiKTtcbnZhciBQb3RNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1BvdE1lc3NhZ2VcIik7XG52YXIgVGltZXJNZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL1RpbWVyTWVzc2FnZVwiKTtcbnZhciBBY3Rpb25NZXNzYWdlID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL21lc3NhZ2VzL0FjdGlvbk1lc3NhZ2VcIik7XG52YXIgRm9sZENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlXCIpO1xudmFyIERlbGF5TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9EZWxheU1lc3NhZ2VcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBDb250cm9sIHRoZSB0YWJsZVxuICogQGNsYXNzIFRhYmxlQ29udHJvbGxlclxuICovXG5mdW5jdGlvbiBUYWJsZUNvbnRyb2xsZXIobWVzc2FnZVNlcXVlbmNlciwgdmlldykge1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIgPSBtZXNzYWdlU2VxdWVuY2VyO1xuXHR0aGlzLnZpZXcgPSB2aWV3O1xuXG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihTZWF0SW5mb01lc3NhZ2UuVFlQRSwgdGhpcy5vblNlYXRJbmZvTWVzc2FnZSwgdGhpcyk7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihDb21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRSwgdGhpcy5vbkNvbW11bml0eUNhcmRzTWVzc2FnZSwgdGhpcyk7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihQb2NrZXRDYXJkc01lc3NhZ2UuVFlQRSwgdGhpcy5vblBvY2tldENhcmRzTWVzc2FnZSwgdGhpcyk7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihEZWFsZXJCdXR0b25NZXNzYWdlLlRZUEUsIHRoaXMub25EZWFsZXJCdXR0b25NZXNzYWdlLCB0aGlzKTtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEJldE1lc3NhZ2UuVFlQRSwgdGhpcy5vbkJldE1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoQmV0c1RvUG90TWVzc2FnZS5UWVBFLCB0aGlzLm9uQmV0c1RvUG90LCB0aGlzKTtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKFBvdE1lc3NhZ2UuVFlQRSwgdGhpcy5vblBvdCwgdGhpcyk7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihUaW1lck1lc3NhZ2UuVFlQRSwgdGhpcy5vblRpbWVyLCB0aGlzKTtcblx0dGhpcy5tZXNzYWdlU2VxdWVuY2VyLmFkZE1lc3NhZ2VIYW5kbGVyKEFjdGlvbk1lc3NhZ2UuVFlQRSwgdGhpcy5vbkFjdGlvbiwgdGhpcyk7XG5cdHRoaXMubWVzc2FnZVNlcXVlbmNlci5hZGRNZXNzYWdlSGFuZGxlcihGb2xkQ2FyZHNNZXNzYWdlLlRZUEUsIHRoaXMub25Gb2xkQ2FyZHMsIHRoaXMpO1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIuYWRkTWVzc2FnZUhhbmRsZXIoRGVsYXlNZXNzYWdlLlRZUEUsIHRoaXMub25EZWxheSwgdGhpcyk7XG59XG5FdmVudERpc3BhdGNoZXIuaW5pdChUYWJsZUNvbnRyb2xsZXIpO1xuXG4vKipcbiAqIFNlYXQgaW5mbyBtZXNzYWdlLlxuICogQG1ldGhvZCBvblNlYXRJbmZvTWVzc2FnZVxuICovXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uU2VhdEluZm9NZXNzYWdlID0gZnVuY3Rpb24obSkge1xuXHR2YXIgc2VhdFZpZXcgPSB0aGlzLnZpZXcuZ2V0U2VhdFZpZXdCeUluZGV4KG0uZ2V0U2VhdEluZGV4KCkpO1xuXG5cdHNlYXRWaWV3LnNldE5hbWUobS5nZXROYW1lKCkpO1xuXHRzZWF0Vmlldy5zZXRDaGlwcyhtLmdldENoaXBzKCkpO1xuXHRzZWF0Vmlldy5zZXRBY3RpdmUobS5pc0FjdGl2ZSgpKTtcblx0c2VhdFZpZXcuc2V0U2l0b3V0KG0uaXNTaXRvdXQoKSk7XG59XG5cbi8qKlxuICogU2VhdCBpbmZvIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uQ29tbXVuaXR5Q2FyZHNNZXNzYWdlXG4gKi9cblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Db21tdW5pdHlDYXJkc01lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XG5cdHZhciBpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBtLmdldENhcmRzKCkubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgY2FyZERhdGEgPSBtLmdldENhcmRzKClbaV07XG5cdFx0dmFyIGNhcmRWaWV3ID0gdGhpcy52aWV3LmdldENvbW11bml0eUNhcmRzKClbbS5nZXRGaXJzdEluZGV4KCkgKyBpXTtcblxuXHRcdGNhcmRWaWV3LnNldENhcmREYXRhKGNhcmREYXRhKTtcblx0XHRjYXJkVmlldy5zaG93KCk7XG5cdH1cbn1cblxuLyoqXG4gKiBQb2NrZXQgY2FyZHMgbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25Qb2NrZXRDYXJkc01lc3NhZ2VcbiAqL1xuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblBvY2tldENhcmRzTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcblx0dmFyIHNlYXRWaWV3ID0gdGhpcy52aWV3LmdldFNlYXRWaWV3QnlJbmRleChtLmdldFNlYXRJbmRleCgpKTtcblx0dmFyIGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IG0uZ2V0Q2FyZHMoKS5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjYXJkRGF0YSA9IG0uZ2V0Q2FyZHMoKVtpXTtcblx0XHR2YXIgY2FyZFZpZXcgPSBzZWF0Vmlldy5nZXRQb2NrZXRDYXJkcygpW20uZ2V0Rmlyc3RJbmRleCgpICsgaV07XG5cblx0XHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcihjYXJkVmlldywgXCJhbmltYXRpb25Eb25lXCIpO1xuXHRcdGNhcmRWaWV3LnNldENhcmREYXRhKGNhcmREYXRhKTtcblx0XHRjYXJkVmlldy5zaG93KCk7XG5cdH1cbn1cblxuLyoqXG4gKiBEZWFsZXIgYnV0dG9uIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uRGVhbGVyQnV0dG9uTWVzc2FnZVxuICovXG5UYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uRGVhbGVyQnV0dG9uTWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcblx0dmFyIGRlYWxlckJ1dHRvblZpZXcgPSB0aGlzLnZpZXcuZ2V0RGVhbGVyQnV0dG9uVmlldygpO1xuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcihkZWFsZXJCdXR0b25WaWV3LCBcImFuaW1hdGlvbkRvbmVcIik7XG5cdGRlYWxlckJ1dHRvblZpZXcuc2hvdyhtLmdldFNlYXRJbmRleCgpLCBtLmdldEFuaW1hdGUoKSk7XG59O1xuXG4vKipcbiAqIEJldCBtZXNzYWdlLlxuICogQG1ldGhvZCBvbkJldE1lc3NhZ2VcbiAqL1xuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkJldE1lc3NhZ2UgPSBmdW5jdGlvbihtKSB7XG5cdHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLmJldENoaXBzLnNldFZhbHVlKG0udmFsdWUpO1xufTtcblxuLyoqXG4gKiBCZXRzIHRvIHBvdC5cbiAqIEBtZXRob2Qgb25CZXRzVG9Qb3RcbiAqL1xuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkJldHNUb1BvdCA9IGZ1bmN0aW9uKG0pIHtcblx0dmFyIGhhdmVDaGlwcyA9IGZhbHNlO1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnZpZXcuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxuXHRcdGlmKHRoaXMudmlldy5zZWF0Vmlld3NbaV0uYmV0Q2hpcHMudmFsdWUgPiAwKVxuXHRcdFx0aGF2ZUNoaXBzID0gdHJ1ZTtcblxuXHRpZiAoIWhhdmVDaGlwcylcblx0XHRyZXR1cm47XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMudmlldy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy52aWV3LnNlYXRWaWV3c1tpXS5iZXRDaGlwcy5hbmltYXRlSW4oKTtcblxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLnZpZXcuc2VhdFZpZXdzWzBdLmJldENoaXBzLCBcImFuaW1hdGlvbkRvbmVcIik7XG59XG5cbi8qKlxuICogUG90IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uUG90XG4gKi9cblRhYmxlQ29udHJvbGxlci5wcm90b3R5cGUub25Qb3QgPSBmdW5jdGlvbihtKSB7XG5cdHRoaXMudmlldy5wb3RWaWV3LnNldFZhbHVlcyhtLnZhbHVlcyk7XG59O1xuXG4vKipcbiAqIFRpbWVyIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uVGltZXJcbiAqL1xuVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vblRpbWVyID0gZnVuY3Rpb24obSkge1xuXHRpZiAobS5zZWF0SW5kZXggPCAwKVxuXHRcdHRoaXMudmlldy50aW1lclZpZXcuaGlkZSgpO1xuXG5cdGVsc2Uge1xuXHRcdHRoaXMudmlldy50aW1lclZpZXcuc2hvdyhtLnNlYXRJbmRleCk7XG5cdFx0dGhpcy52aWV3LnRpbWVyVmlldy5jb3VudGRvd24obS50b3RhbFRpbWUsIG0udGltZUxlZnQpO1xuXHR9XG59O1xuXG4vKipcbiAqIEFjdGlvbiBtZXNzYWdlLlxuICogQG1ldGhvZCBvbkFjdGlvblxuICovXG4gVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkFjdGlvbiA9IGZ1bmN0aW9uKG0pIHtcblx0aWYgKG0uc2VhdEluZGV4ID09IG51bGwpXG5cdFx0bS5zZWF0SW5kZXggPSAwO1xuXG5cdHRoaXMudmlldy5zZWF0Vmlld3NbbS5zZWF0SW5kZXhdLmFjdGlvbihtLmFjdGlvbik7XG4gfTtcblxuLyoqXG4gKiBGb2xkIGNhcmRzIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uRm9sZENhcmRzXG4gKi9cbiBUYWJsZUNvbnRyb2xsZXIucHJvdG90eXBlLm9uRm9sZENhcmRzID0gZnVuY3Rpb24obSkge1xuXHR0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XS5mb2xkQ2FyZHMoKTtcblxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLnZpZXcuc2VhdFZpZXdzW20uc2VhdEluZGV4XSwgXCJhbmltYXRpb25Eb25lXCIpO1xuIH07XG5cbi8qKlxuICogRGVsYXkgbWVzc2FnZS5cbiAqIEBtZXRob2Qgb25EZWxheVxuICovXG4gVGFibGVDb250cm9sbGVyLnByb3RvdHlwZS5vbkRlbGF5ID0gZnVuY3Rpb24obSkge1xuIFx0Y29uc29sZS5sb2coXCJkZWxheSBmb3IgID0gXCIrbS5kZWxheSk7XG5cblxuXHR0aGlzLm1lc3NhZ2VTZXF1ZW5jZXIud2FpdEZvcih0aGlzLCBcInRpbWVyRG9uZVwiKTtcblx0c2V0VGltZW91dCh0aGlzLmRpc3BhdGNoRXZlbnQuYmluZCh0aGlzLCBcInRpbWVyRG9uZVwiKSwgbS5kZWxheSk7XG5cbiB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRhYmxlQ29udHJvbGxlcjsiLCJOZXRQb2tlckNsaWVudCA9IHJlcXVpcmUoXCIuL2FwcC9OZXRQb2tlckNsaWVudFwiKTtcbi8vdmFyIG5ldFBva2VyQ2xpZW50ID0gbmV3IE5ldFBva2VyQ2xpZW50KCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0dGV4dHVyZXM6IFtcblx0XHR7XG5cdFx0XHRpZDogXCJjb21wb25lbnRzVGV4dHVyZVwiLFxuXHRcdFx0ZmlsZTogXCJjb21wb25lbnRzLnBuZ1wiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRpZDogXCJ0YWJsZUJhY2tncm91bmRcIixcblx0XHRcdGZpbGU6IFwidGFibGUucG5nXCJcblx0XHR9XG5cdF0sXG5cdHRhYmxlQmFja2dyb3VuZDogXCJ0YWJsZUJhY2tncm91bmRcIixcblx0ZGVmYXVsdFRleHR1cmU6IFwiY29tcG9uZW50c1RleHR1cmVcIixcblxuXHRzZWF0UG9zaXRpb25zOiBbXG5cdFx0WzI4NywgMTE4XSwgWzQ4MywgMTEyXSwgWzY3NiwgMTE4XSxcblx0XHRbODQ0LCAyNDddLCBbODE3LCA0MTNdLCBbNjc2LCA0OTBdLFxuXHRcdFs0ODMsIDQ5NV0sIFsyODcsIDQ5MF0sIFsxNDAsIDQxM10sXG5cdFx0WzEyMywgMjQ3XVxuXHRdLFxuXG5cdHRpbWVyQmFja2dyb3VuZDogWzEyMSwyMDAsMzIsMzJdLFxuXG5cdHNlYXRQbGF0ZTogWzQwLCAxMTYsIDE2MCwgNzBdLFxuXG5cdGNvbW11bml0eUNhcmRzUG9zaXRpb246IFsyNTUsIDE5MF0sXG5cblx0Y2FyZEZyYW1lOiBbNDk4LCAyNTYsIDg3LCAxMjJdLFxuXHRjYXJkQmFjazogWzQwMiwgMjU2LCA4NywgMTIyXSxcblxuXHRkaXZpZGVyTGluZTogWzU2OCwgNzcsIDIsIDE3MF0sXG5cblx0c3VpdFN5bWJvbHM6IFtcblx0XHRbMjQ2LCA2NywgMTgsIDE5XSxcblx0XHRbMjY5LCA2NywgMTgsIDE5XSxcblx0XHRbMjkyLCA2NywgMTgsIDE5XSxcblx0XHRbMzE1LCA2NywgMTgsIDE5XVxuXHRdLFxuXG5cdGZyYW1lUGxhdGU6IFszMDEsIDI2MiwgNzQsIDc2XSxcblx0YmlnQnV0dG9uOiBbMzMsIDI5OCwgOTUsIDk0XSxcblx0ZGlhbG9nQnV0dG9uOiBbMzgzLCA0NjEsIDgyLCA0N10sXG5cdGRlYWxlckJ1dHRvbjogWzE5NywgMjM2LCA0MSwgMzVdLFxuXG5cdGRlYWxlckJ1dHRvblBvc2l0aW9uczogW1xuXHRcdFszNDcsIDEzM10sIFszOTUsIDEzM10sIFs1NzQsIDEzM10sXG5cdFx0Wzc2MiwgMjY3XSwgWzcxNSwgMzU4XSwgWzU3NCwgNDM0XSxcblx0XHRbNTM2LCA0MzJdLCBbMzUxLCA0MzJdLCBbMTkzLCAzNjJdLFxuXHRcdFsxNjgsIDI2Nl1cblx0XSxcblxuXHR0ZXh0U2Nyb2xsYmFyVHJhY2s6IFszNzEsNTAsNjAsMTBdLFxuXHR0ZXh0U2Nyb2xsYmFyVGh1bWI6IFszNzEsMzIsNjAsMTBdLFxuXG5cblx0YmV0QWxpZ246IFtcblx0XHRcImxlZnRcIiwgXCJjZW50ZXJcIiwgXCJyaWdodFwiLFxuXHRcdFwicmlnaHRcIiwgXCJyaWdodFwiLCBcblx0XHRcInJpZ2h0XCIsIFwiY2VudGVyXCIsIFwibGVmdFwiLFxuXHRcdFwibGVmdFwiLCBcImxlZnRcIlxuXHRdLFxuXG5cdGJldFBvc2l0aW9uczogW1xuXHRcdFsyMjUsMTUwXSwgWzQ3OCwxNTBdLCBbNzMwLDE1MF0sXG5cdFx0Wzc3OCwxOTZdLCBbNzQ4LDMyMl0sIFs3MTksMzYwXSxcblx0XHRbNDgxLDM2MF0sIFsyMzIsMzYwXSwgWzE5OSwzMjJdLFxuXHRcdFsxODEsMjAwXVxuXHRdLFxuXHRjaGlwczogW1xuXHRcdFszMCwgMjUsIDQwLCAzMF0sXG5cdFx0WzcwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTEwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTUwLCAyNSwgNDAsIDMwXSxcblx0XHRbMTkwLCAyNSwgNDAsIDMwXVxuXHRdLFxuXHRjaGlwc0NvbG9yczogWzB4NDA0MDQwLCAweDAwODAwMCwgMHg4MDgwMDAsIDB4MDAwMDgwLCAweGZmMDAwMF0sXG5cdHBvdFBvc2l0aW9uOiBbNDg1LDMxNV0sXG5cdHdyZW5jaEljb246IFs0NjIsMzg5LDIxLDIxXSxcblx0Y2hhdEJhY2tncm91bmQ6IFszMDEsMjYyLDc0LDc2XSxcblx0Y2hlY2tib3hCYWNrZ3JvdW5kOiBbNTAxLDM5MSwxOCwxOF0sXG5cdGNoZWNrYm94VGljazogWzUyOCwzOTIsMjEsMTZdLFxuXHRidXR0b25CYWNrZ3JvdW5kOiBbNjgsNDQ2LDY0LDY0XVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFBvaW50ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL1BvaW50XCIpO1xudmFyIERlZmF1bHRTa2luID0gcmVxdWlyZShcIi4vRGVmYXVsdFNraW5cIik7XG5cbi8qKlxuICogQ2xpZW50IHJlc291cmNlc1xuICogQGNsYXNzIFJlc291cmNlcy5cbiAqL1xuZnVuY3Rpb24gUmVzb3VyY2VzKCkge1xuXHR2YXIgaTtcblxuXHR0aGlzLmRlZmF1bHRTa2luID0gRGVmYXVsdFNraW47XG5cdHRoaXMuc2tpbiA9IG51bGw7XG5cblxuXHQgdGhpcy5BbGlnbiA9IHtcblx0IFx0TGVmdDogXCJsZWZ0XCIsXG5cdCBcdFJpZ2h0OiBcInJpZ2h0XCIsXG5cdCBcdENlbnRlcjogXCJjZW50ZXJcIlxuXHQgfTtcblxuXHQgdGhpcy50ZXh0dXJlcyA9IHt9O1xuLypcblx0dGhpcy5jb21wb25lbnRzVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUuZnJvbUltYWdlKFwiY29tcG9uZW50cy5wbmdcIik7XG5cdHRoaXMudGFibGVCYWNrZ3JvdW5kID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZShcInRhYmxlLnBuZ1wiKTtcblxuXHR0aGlzLnNlYXRQb3NpdGlvbnMgPSBbXG5cdFx0UG9pbnQoMjg3LCAxMTgpLCBQb2ludCg0ODMsIDExMiksIFBvaW50KDY3NiwgMTE4KSxcblx0XHRQb2ludCg4NDQsIDI0NyksIFBvaW50KDgxNywgNDEzKSwgUG9pbnQoNjc2LCA0OTApLFxuXHRcdFBvaW50KDQ4MywgNDk1KSwgUG9pbnQoMjg3LCA0OTApLCBQb2ludCgxNDAsIDQxMyksXG5cdFx0UG9pbnQoMTIzLCAyNDcpXG5cdF07XG5cblx0dGhpcy50aW1lckJhY2tncm91bmQgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDEyMSwyMDAsMzIsMzIpOyBcblxuXHR0aGlzLnNlYXRQbGF0ZSA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoNDAsIDExNiwgMTYwLCA3MCk7XG5cblx0dGhpcy5jb21tdW5pdHlDYXJkc1Bvc2l0aW9uID0gUG9pbnQoMjU1LCAxOTApO1xuXG5cdHRoaXMuY2FyZEZyYW1lID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg0OTgsIDI1NiwgODcsIDEyMik7XG5cdHRoaXMuY2FyZEJhY2sgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDQwMiwgMjU2LCA4NywgMTIyKTtcblxuXHR0aGlzLmRpdmlkZXJMaW5lID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCg1NjgsIDc3LCAyLCAxNzApO1xuXG5cdHRoaXMuc3VpdFN5bWJvbHMgPSBbXTtcblx0Zm9yIChpID0gMDsgaSA8IDQ7IGkrKylcblx0XHR0aGlzLnN1aXRTeW1ib2xzLnB1c2godGhpcy5nZXRDb21wb25lbnRzUGFydCgyNDYgKyBpICogMjMsIDY3LCAxOCwgMTkpKTtcblxuXHR0aGlzLmZyYW1lUGxhdGUgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDMwMSwgMjYyLCA3NCwgNzYpO1xuXHR0aGlzLmJpZ0J1dHRvbiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMzMsIDI5OCwgOTUsIDk0KTtcblx0dGhpcy5kaWFsb2dCdXR0b24gPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDM4MywgNDYxLCA4MiwgNDcpO1xuXHR0aGlzLmRlYWxlckJ1dHRvbiA9IHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQoMTk3LCAyMzYsIDQxLCAzNSk7XG5cblx0dGhpcy5kZWFsZXJCdXR0b25Qb3NpdGlvbnMgPSBbXG5cdFx0UG9pbnQoMzQ3LCAxMzMpLCBQb2ludCgzOTUsIDEzMyksIFBvaW50KDU3NCwgMTMzKSxcblx0XHRQb2ludCg3NjIsIDI2NyksIFBvaW50KDcxNSwgMzU4KSwgUG9pbnQoNTc0LCA0MzQpLFxuXHRcdFBvaW50KDUzNiwgNDMyKSwgUG9pbnQoMzUxLCA0MzIpLCBQb2ludCgxOTMsIDM2MiksXG5cdFx0UG9pbnQoMTY4LCAyNjYpXG5cdF07XG5cblx0dGhpcy50ZXh0U2Nyb2xsYmFyVHJhY2sgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDM3MSw1MCw2MCwxMCk7XG5cdHRoaXMudGV4dFNjcm9sbGJhclRodW1iID0gdGhpcy5nZXRDb21wb25lbnRzUGFydCgzNzEsMzIsNjAsMTApO1xuXG5cdCB0aGlzLkFsaWduID0ge1xuXHQgXHRMZWZ0OiBcImxlZnRcIixcblx0IFx0UmlnaHQ6IFwicmlnaHRcIixcblx0IFx0Q2VudGVyOiBcImNlbnRlclwiLFxuXHQgfTtcblxuXHR0aGlzLmJldEFsaWduID0gW1xuXHRcdFx0dGhpcy5BbGlnbi5MZWZ0LCB0aGlzLkFsaWduLkNlbnRlciwgdGhpcy5BbGlnbi5SaWdodCxcblx0XHRcdHRoaXMuQWxpZ24uUmlnaHQsIHRoaXMuQWxpZ24uUmlnaHQsIFxuXHRcdFx0dGhpcy5BbGlnbi5SaWdodCwgdGhpcy5BbGlnbi5DZW50ZXIsIHRoaXMuQWxpZ24uTGVmdCxcblx0XHRcdHRoaXMuQWxpZ24uTGVmdCwgdGhpcy5BbGlnbi5MZWZ0XG5cdFx0XTtcblxuXHR0aGlzLmJldFBvc2l0aW9ucyA9IFtcblx0XHRcdFBvaW50KDIyNSwxNTApLCBQb2ludCg0NzgsMTUwKSwgUG9pbnQoNzMwLDE1MCksXG5cdFx0XHRQb2ludCg3NzgsMTk2KSwgUG9pbnQoNzQ4LDMyMiksIFBvaW50KDcxOSwzNjApLFxuXHRcdFx0UG9pbnQoNDgxLDM2MCksIFBvaW50KDIzMiwzNjApLCBQb2ludCgxOTksMzIyKSxcblx0XHRcdFBvaW50KDE4MSwyMDApXG5cdFx0XTtcblxuXHR0aGlzLmNoaXBzID0gbmV3IEFycmF5KCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgNTsgaSsrKSB7XG5cdFx0dmFyIGIgPSB0aGlzLmdldENvbXBvbmVudHNQYXJ0KDMwICsgaSo0MCwgMjUsIDQwLCAzMCk7XG5cdFx0dGhpcy5jaGlwcy5wdXNoKGIpO1xuXHR9XG5cblx0dGhpcy5jaGlwc0NvbG9ycyA9IFsweDQwNDA0MCwgMHgwMDgwMDAsIDB4ODA4MDAwLCAweDAwMDA4MCwgMHhmZjAwMDBdO1xuXG5cdHRoaXMucG90UG9zaXRpb24gPSBQb2ludCg0ODUsMzE1KTtcblx0Ki9cbn1cblxuLyoqXG4gKiBHZXQgdmFsdWUgZnJvbSBlaXRoZXIgbG9hZGVkIHNraW4gb3IgZGVmYXVsdCBza2luLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oa2V5KSB7XG5cdHZhciB2YWx1ZSA9IG51bGw7XG5cblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpXG5cdFx0dmFsdWUgPSB0aGlzLnNraW5ba2V5XTtcblx0ZWxzZVxuXHRcdHZhbHVlID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xuXG5cdGlmKHZhbHVlID09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHNraW4ga2V5OiBcIiArIGtleSk7XG5cdH0gXG5cblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEdldCBwb2ludCBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXG4gKiBAbWV0aG9kIGdldFBvaW50XG4gKi9cblJlc291cmNlcy5wcm90b3R5cGUuZ2V0UG9pbnQgPSBmdW5jdGlvbihrZXkpIHtcblx0dmFyIHZhbHVlID0gbnVsbDtcblxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSlcblx0XHR2YWx1ZSA9IFBvaW50KHRoaXMuc2tpbltrZXldWzBdLCB0aGlzLnNraW5ba2V5XVsxXSk7XG5cdGVsc2Vcblx0XHR2YWx1ZSA9IFBvaW50KHRoaXMuZGVmYXVsdFNraW5ba2V5XVswXSwgdGhpcy5kZWZhdWx0U2tpbltrZXldWzFdKTtcblxuXHRpZih2YWx1ZSA9PSBudWxsKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBza2luIGtleTogXCIgKyBrZXkpO1xuXHR9IFxuXG5cdHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBHZXQgcG9pbnRzIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cbiAqIEBtZXRob2QgZ2V0UG9pbnRzXG4gKi9cblJlc291cmNlcy5wcm90b3R5cGUuZ2V0UG9pbnRzID0gZnVuY3Rpb24oa2V5KSB7XG5cdHZhciB2YWx1ZXMgPSBudWxsO1xuXG5cdHZhciBwb2ludHMgPSBuZXcgQXJyYXkoKTtcblxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW5ba2V5XSAhPSBudWxsKSlcblx0XHR2YWx1ZXMgPSB0aGlzLnNraW5ba2V5XTtcblx0ZWxzZVxuXHRcdHZhbHVlcyA9IHRoaXMuZGVmYXVsdFNraW5ba2V5XTtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0cG9pbnRzLnB1c2goUG9pbnQodmFsdWVzW2ldWzBdLCB2YWx1ZXNbaV1bMV0pKTtcblx0fVxuXG5cdGlmKHBvaW50cy5sZW5ndGggPD0gMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcblx0fSBcblxuXHRyZXR1cm4gcG9pbnRzO1xufVxuXG4vKipcbiAqIEdldCB0ZXh0dXJlIGZyb20gZWl0aGVyIGxvYWRlZCBza2luIG9yIGRlZmF1bHQgc2tpbi5cbiAqIEBtZXRob2QgZ2V0VGV4dHVyZVxuICovXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFRleHR1cmUgPSBmdW5jdGlvbihrZXksIGluZGV4KSB7XG5cdHZhciB2YWx1ZSA9IG51bGw7XG5cdHZhciBpc0RlZmF1bHQgPSBmYWxzZTtcblx0dmFyIHRleHR1cmUgPSBudWxsO1xuXHR2YXIgZnJhbWUgPSBudWxsO1xuXG5cblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpIHtcblx0XHR2YWx1ZSA9IHRoaXMuc2tpbltrZXldO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHZhbHVlID0gdGhpcy5kZWZhdWx0U2tpbltrZXldO1xuXHRcdGlzRGVmYXVsdCA9IHRydWU7XG5cdH1cblx0Y29uc29sZS5sb2coXCJ2YWx1ZSA9IFwiICsgdmFsdWUgKyBcIiwga2V5ID0gXCIgK2tleSk7XG5cblxuXHRpZih2YWx1ZS50ZXh0dXJlICE9IG51bGwpIHtcblx0XHR0ZXh0dXJlID0gdmFsdWUudGV4dHVyZTtcblx0fVxuXHRlbHNlIGlmKCFpc0RlZmF1bHQgJiYgKHRoaXMuc2tpbi5kZWZhdWx0VGV4dHVyZSAhPSBudWxsKSkge1xuXHRcdHRleHR1cmUgPSB0aGlzLnNraW4uZGVmYXVsdFRleHR1cmU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGV4dHVyZSA9IHRoaXMuZGVmYXVsdFNraW4uZGVmYXVsdFRleHR1cmU7XG5cdH1cblxuXHRpZih2YWx1ZS5jb29yZHMgIT0gbnVsbCkge1xuXHRcdGZyYW1lID0gdmFsdWUuY29vcmRzO1xuXHR9XG5cdGVsc2UgaWYodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG5cdFx0dGV4dHVyZSA9IHZhbHVlO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGZyYW1lID0gdmFsdWU7XG5cdH1cblxuXHRpZih0ZXh0dXJlICE9IG51bGwpIHtcblx0XHRpZihmcmFtZSAhPSBudWxsKVxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWVbMF0sIGZyYW1lWzFdLCBmcmFtZVsyXSwgZnJhbWVbM10pO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiB0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lKTtcblx0fVxuXG5cblx0XG5cdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcblx0XG5cdHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEdldCB0ZXh0dXJlcyBmcm9tIGVpdGhlciBsb2FkZWQgc2tpbiBvciBkZWZhdWx0IHNraW4uXG4gKiBAbWV0aG9kIGdldFRleHR1cmVzXG4gKi9cblJlc291cmNlcy5wcm90b3R5cGUuZ2V0VGV4dHVyZXMgPSBmdW5jdGlvbihrZXkpIHtcblx0dmFyIHZhbHVlcyA9IG51bGw7XG5cdHZhciBpc0RlZmF1bHQgPSBmYWxzZTtcblxuXHRcblx0XG5cblx0aWYoKHRoaXMuc2tpbiAhPSBudWxsKSAmJiAodGhpcy5za2luW2tleV0gIT0gbnVsbCkpIHtcblx0XHR2YWx1ZXMgPSB0aGlzLnNraW5ba2V5XTtcblx0fVxuXHRlbHNlIHtcblx0XHR2YWx1ZXMgPSB0aGlzLmRlZmF1bHRTa2luW2tleV07XG5cdFx0aXNEZWZhdWx0ID0gdHJ1ZTtcblx0fVxuXG5cblx0dmFyIGZyYW1lID0gbnVsbDtcblx0dmFyIHRleHR1cmUgPSBudWxsO1xuXHR2YXIgdGV4dHVyZXMgPSBuZXcgQXJyYXkoKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuXHRcdGZyYW1lID0gbnVsbDtcblx0XHR0ZXh0dXJlID0gbnVsbDtcblx0XHRcblx0XHRpZih2YWx1ZXNbaV0udGV4dHVyZSAhPSBudWxsKSB7XG5cdFx0XHR0ZXh0dXJlID0gdmFsdWVzW2ldLnRleHR1cmU7XG5cdFx0fVxuXHRcdGVsc2UgaWYoIWlzRGVmYXVsdCAmJiAodGhpcy5za2luLmRlZmF1bHRUZXh0dXJlICE9IG51bGwpKSB7XG5cdFx0XHR0ZXh0dXJlID0gdGhpcy5za2luLmRlZmF1bHRUZXh0dXJlO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRleHR1cmUgPSB0aGlzLmRlZmF1bHRTa2luLmRlZmF1bHRUZXh0dXJlO1xuXHRcdH1cblxuXHRcdGlmKHZhbHVlc1tpXS5jb29yZHMgIT0gbnVsbCkge1xuXHRcdFx0ZnJhbWUgPSB2YWx1ZXNbaV0uY29vcmRzO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGVvZiB2YWx1ZXNbaV0gPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdHRleHR1cmUgPSB2YWx1ZXNbaV07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0ZnJhbWUgPSB2YWx1ZXNbaV07XG5cdFx0fVxuXG5cdFx0aWYodGV4dHVyZSAhPSBudWxsKSB7XG5cdFx0XHRpZihmcmFtZSAhPSBudWxsKVxuXHRcdFx0XHR0ZXh0dXJlcy5wdXNoKHRoaXMuZ2V0Q29tcG9uZW50c1BhcnQodGV4dHVyZSwgZnJhbWVbMF0sIGZyYW1lWzFdLCBmcmFtZVsyXSwgZnJhbWVbM10pKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dGV4dHVyZXMucHVzaCh0aGlzLmdldENvbXBvbmVudHNQYXJ0KHRleHR1cmUsIGZyYW1lKSk7XG5cdFx0fVxuXHR9XG5cblx0XG5cdGlmKHRleHR1cmVzLmxlbmd0aCA8PSAwKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2tpbiBrZXk6IFwiICsga2V5KTtcblx0IFxuXG5cdHJldHVybiB0ZXh0dXJlcztcbn1cblxuLyoqXG4gKiBHZXQgcGFydCBmcm9tIGNvbXBvbmVudHMgYXRsYXMuXG4gKiBAbWV0aG9kIGdldENvbXBvbmVudHNQYXJ0XG4gKiBAcHJpdmF0ZVxuICovXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldENvbXBvbmVudHNQYXJ0ID0gZnVuY3Rpb24odGV4dHVyZWlkLCB4LCB5LCB3LCBoKSB7XG5cblx0dmFyIGZyYW1lO1xuXHR2YXIgdGV4dHVyZSA9IHRoaXMuZ2V0VGV4dHVyZUZyb21Ta2luKHRleHR1cmVpZCk7XG5cblx0aWYoeCA9PT0gbnVsbCkge1xuXHRcdGZyYW1lID0ge1xuXHRcdFx0eDogMCxcblx0XHRcdHk6IDAsXG5cdFx0XHR3aWR0aDogdGV4dHVyZS53aWR0aCxcblx0XHRcdGhlaWdodDogdGV4dHVyZS5oZWlnaHRcblx0XHR9O1xuXHR9XG5cdGVsc2Uge1xuXHRcdGZyYW1lID0ge1xuXHRcdFx0eDogeCxcblx0XHRcdHk6IHksXG5cdFx0XHR3aWR0aDogdyxcblx0XHRcdGhlaWdodDogaFxuXHRcdH07XG5cdH1cblxuXHRyZXR1cm4gbmV3IFBJWEkuVGV4dHVyZSh0ZXh0dXJlLCBmcmFtZSk7XG59XG5cbi8qKlxuICogR2V0IHRleHR1cmUgb2JqZWN0IGZyb20gc2tpbi5cbiAqIEBtZXRob2QgZ2V0VGV4dHVyZUZyb21Ta2luXG4gKiBAcHJpdmF0ZVxuICovXG5SZXNvdXJjZXMucHJvdG90eXBlLmdldFRleHR1cmVGcm9tU2tpbiA9IGZ1bmN0aW9uKHRleHR1cmVpZCkge1xuXG5cdHZhciB0ZXh0dXJlT2JqZWN0ID0gbnVsbDtcblxuXHRpZigodGhpcy5za2luICE9IG51bGwpICYmICh0aGlzLnNraW4udGV4dHVyZXMgIT0gbnVsbCkpIHtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5za2luLnRleHR1cmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZih0aGlzLnNraW4udGV4dHVyZXNbaV0uaWQgPT0gdGV4dHVyZWlkKSB7XG5cdFx0XHRcdHRleHR1cmVPYmplY3QgPSB0aGlzLnNraW4udGV4dHVyZXNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGlmKHRleHR1cmVPYmplY3QgPT0gbnVsbCkge1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmRlZmF1bHRTa2luLnRleHR1cmVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZih0aGlzLmRlZmF1bHRTa2luLnRleHR1cmVzW2ldLmlkID09IHRleHR1cmVpZCkge1xuXHRcdFx0XHR0ZXh0dXJlT2JqZWN0ID0gdGhpcy5kZWZhdWx0U2tpbi50ZXh0dXJlc1tpXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZih0ZXh0dXJlT2JqZWN0ID09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJ0ZXh0dXJlaWQgZG9lc24ndCBleGlzdDogXCIgKyB0ZXh0dXJlaWQpO1xuXHR9XG5cblx0aWYodGhpcy50ZXh0dXJlc1t0ZXh0dXJlT2JqZWN0LmlkXSA9PSBudWxsKVxuXHRcdHRoaXMudGV4dHVyZXNbdGV4dHVyZU9iamVjdC5pZF0gPSBuZXcgUElYSS5UZXh0dXJlLmZyb21JbWFnZSh0ZXh0dXJlT2JqZWN0LmZpbGUpO1xuXG5cdHJldHVybiB0aGlzLnRleHR1cmVzW3RleHR1cmVPYmplY3QuaWRdO1xufVxuXG5cbi8qKlxuICogR2V0IHNpbmdsZXRvbiBpbnN0YW5jZS5cbiAqIEBtZXRob2QgZ2V0SW5zdGFuY2VcbiAqL1xuUmVzb3VyY2VzLmdldEluc3RhbmNlID0gZnVuY3Rpb24oKSB7XG5cdGlmICghUmVzb3VyY2VzLmluc3RhbmNlKVxuXHRcdFJlc291cmNlcy5pbnN0YW5jZSA9IG5ldyBSZXNvdXJjZXMoKTtcblxuXHRyZXR1cm4gUmVzb3VyY2VzLmluc3RhbmNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlczsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcblxuLyoqXG4gKiBCaWcgYnV0dG9uLlxuICogQGNsYXNzIEJpZ0J1dHRvblxuICovXG5mdW5jdGlvbiBCaWdCdXR0b24oKSB7XG5cdEJ1dHRvbi5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYmlnQnV0dG9uVGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJiaWdCdXR0b25cIik7XG5cblx0dGhpcy5hZGRDaGlsZChuZXcgUElYSS5TcHJpdGUodGhpcy5iaWdCdXR0b25UZXh0dXJlKSk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAxOHB4IEFyaWFsXCIsXG5cdFx0Ly9maWxsOiBcIiMwMDAwMDBcIlxuXHR9O1xuXG5cdHRoaXMubGFiZWxGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbYnV0dG9uXVwiLCBzdHlsZSk7XG5cdHRoaXMubGFiZWxGaWVsZC5wb3NpdGlvbi55ID0gMzA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5sYWJlbEZpZWxkKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDE0cHggQXJpYWxcIlxuXHRcdC8vZmlsbDogXCIjMDAwMDAwXCJcblx0fTtcblxuXHR0aGlzLnZhbHVlRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3ZhbHVlXVwiLCBzdHlsZSk7XG5cdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi55ID0gNTA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy52YWx1ZUZpZWxkKTtcblxuXHR0aGlzLnNldExhYmVsKFwiVEVTVFwiKTtcblx0dGhpcy5zZXRWYWx1ZSgxMjMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEJpZ0J1dHRvbiwgQnV0dG9uKTtcblxuLyoqXG4gKiBTZXQgbGFiZWwgZm9yIHRoZSBidXR0b24uXG4gKiBAbWV0aG9kIHNldExhYmVsXG4gKi9cbkJpZ0J1dHRvbi5wcm90b3R5cGUuc2V0TGFiZWwgPSBmdW5jdGlvbihsYWJlbCkge1xuXHR0aGlzLmxhYmVsRmllbGQuc2V0VGV4dChsYWJlbCk7XG5cdHRoaXMubGFiZWxGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy5sYWJlbEZpZWxkLnggPSB0aGlzLmJpZ0J1dHRvblRleHR1cmUud2lkdGggLyAyIC0gdGhpcy5sYWJlbEZpZWxkLndpZHRoIC8gMjtcbn1cblxuLyoqXG4gKiBTZXQgdmFsdWUuXG4gKiBAbWV0aG9kIHNldFZhbHVlXG4gKi9cbkJpZ0J1dHRvbi5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZiAoIXZhbHVlKSB7XG5cdFx0dGhpcy52YWx1ZUZpZWxkLnZpc2libGUgPSBmYWxzZTtcblx0XHR2YWx1ZSA9IFwiXCI7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy52YWx1ZUZpZWxkLnZpc2libGUgPSB0cnVlO1xuXHR9XG5cblx0dGhpcy52YWx1ZUZpZWxkLnNldFRleHQodmFsdWUpO1xuXHR0aGlzLnZhbHVlRmllbGQudXBkYXRlVHJhbnNmb3JtKCk7XG5cdHRoaXMudmFsdWVGaWVsZC54ID0gdGhpcy5iaWdCdXR0b25UZXh0dXJlLndpZHRoIC8gMiAtIHRoaXMudmFsdWVGaWVsZC53aWR0aCAvIDI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmlnQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9CdXR0b25cIik7XG52YXIgQmlnQnV0dG9uID0gcmVxdWlyZShcIi4vQmlnQnV0dG9uXCIpO1xuXG4vKipcbiAqIEJ1dHRvbnNcbiAqIEBjbGFzcyBCdXR0b25zVmlld1xuICovXG5mdW5jdGlvbiBCdXR0b25zVmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5idXR0b25Ib2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25Ib2xkZXIpO1xuXG5cdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnggPSAzNjY7XG5cdHRoaXMuYnV0dG9uSG9sZGVyLnBvc2l0aW9uLnkgPSA1NzU7XG5cblx0dGhpcy5idXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHR2YXIgYnV0dG9uID0gbmV3IEJpZ0J1dHRvbigpO1xuXHRcdGJ1dHRvbi5vbihCdXR0b24uQ0xJQ0ssIHRoaXMub25CdXR0b25DbGljaywgdGhpcyk7XG5cdFx0YnV0dG9uLnBvc2l0aW9uLnggPSBpICogMTA1O1xuXHRcdHRoaXMuYnV0dG9uSG9sZGVyLmFkZENoaWxkKGJ1dHRvbik7XG5cdFx0dGhpcy5idXR0b25zLnB1c2goYnV0dG9uKTtcblx0fVxuXG5cdHRoaXMuc2V0QnV0dG9ucyhbXSk7XG5cblx0dGhpcy5idXR0b25zRGF0YXMgPSBbXTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChCdXR0b25zVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KEJ1dHRvbnNWaWV3KTtcblxuQnV0dG9uc1ZpZXcuQlVUVE9OX0NMSUNLID0gXCJidXR0b25DbGlja1wiO1xuXG4vKipcbiAqIENsZWFyLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5CdXR0b25zVmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbihidXR0b25EYXRhcykge1xuXHR0aGlzLnNldEJ1dHRvbnMoW10pO1xufVxuXG4vKipcbiAqIFNldCBidXR0b24gZGF0YXMuXG4gKiBAbWV0aG9kIHNldEJ1dHRvbnNcbiAqL1xuQnV0dG9uc1ZpZXcucHJvdG90eXBlLnNldEJ1dHRvbnMgPSBmdW5jdGlvbihidXR0b25EYXRhcykge1xuXHR0aGlzLmJ1dHRvbkRhdGFzID0gYnV0dG9uRGF0YXM7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgYnV0dG9uID0gdGhpcy5idXR0b25zW2ldO1xuXHRcdGlmIChpID49IGJ1dHRvbkRhdGFzLmxlbmd0aCkge1xuXHRcdFx0YnV0dG9uLnZpc2libGUgPSBmYWxzZTtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdHZhciBidXR0b25EYXRhID0gYnV0dG9uRGF0YXNbaV07XG5cblx0XHRidXR0b24udmlzaWJsZSA9IHRydWU7XG5cdFx0YnV0dG9uLnNldExhYmVsKGJ1dHRvbkRhdGEuZ2V0QnV0dG9uU3RyaW5nKCkpO1xuXHRcdGJ1dHRvbi5zZXRWYWx1ZShidXR0b25EYXRhLmdldFZhbHVlKCkpO1xuXHR9XG5cblx0dGhpcy5idXR0b25Ib2xkZXIucG9zaXRpb24ueCA9IDM2NjtcblxuXHRpZiAoYnV0dG9uRGF0YXMubGVuZ3RoIDwgMylcblx0XHR0aGlzLmJ1dHRvbkhvbGRlci5wb3NpdGlvbi54ICs9IDQ1O1xufVxuXG4vKipcbiAqIEJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uc1ZpZXcucHJvdG90eXBlLm9uQnV0dG9uQ2xpY2sgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBidXR0b25JbmRleCA9IC0xO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5idXR0b25zW2ldLnZpc2libGUgPSBmYWxzZTtcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5idXR0b25zW2ldKVxuXHRcdFx0YnV0dG9uSW5kZXggPSBpO1xuXHR9XG5cblx0Ly9jb25zb2xlLmxvZyhcImJ1dHRvbiBjbGljazogXCIgKyBidXR0b25JbmRleCk7XG5cdHZhciBidXR0b25EYXRhID0gdGhpcy5idXR0b25EYXRhc1tidXR0b25JbmRleF07XG5cblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBCdXR0b25zVmlldy5CVVRUT05fQ0xJQ0ssXG5cdFx0YnV0dG9uOiBidXR0b25EYXRhLmdldEJ1dHRvbigpLFxuXHRcdHZhbHVlOiBidXR0b25EYXRhLmdldFZhbHVlKClcblx0fSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uc1ZpZXc7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG5cbi8qKlxuICogQSBjYXJkIHZpZXcuXG4gKiBAY2xhc3MgQ2FyZFZpZXdcbiAqL1xuZnVuY3Rpb24gQ2FyZFZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gbnVsbDtcblxuXG5cblxuXHR0aGlzLmZyYW1lID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjYXJkRnJhbWVcIikpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuZnJhbWUpO1xuXG5cdHRoaXMuc3VpdCA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlcyhcInN1aXRTeW1ib2xzXCIpWzBdKTtcblx0dGhpcy5zdWl0LnBvc2l0aW9uLnggPSA4O1xuXHR0aGlzLnN1aXQucG9zaXRpb24ueSA9IDI1O1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuc3VpdCk7XG5cblx0dmFyIHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAxNnB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLnZhbHVlRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3ZhbF1cIiwgc3R5bGUpO1xuXHR0aGlzLnZhbHVlRmllbGQucG9zaXRpb24ueCA9IDY7XG5cdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi55ID0gNTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnZhbHVlRmllbGQpO1xuXG5cdHRoaXMuYmFjayA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2FyZEJhY2tcIikpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuYmFjayk7XG5cblxuXHR0aGlzLm1hc2tHcmFwaGljcyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdHRoaXMubWFza0dyYXBoaWNzLmJlZ2luRmlsbCgweDAwMDAwMCk7XG5cdHRoaXMubWFza0dyYXBoaWNzLmRyYXdSZWN0KDAsIDAsIDg3LCB0aGlzLmhlaWdodCk7XG5cdHRoaXMubWFza0dyYXBoaWNzLmVuZEZpbGwoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLm1hc2tHcmFwaGljcyk7XG5cblx0dGhpcy5tYXNrID0gdGhpcy5tYXNrR3JhcGhpY3M7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2FyZFZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDYXJkVmlldyk7XG5cbi8qKlxuICogU2V0IGNhcmQgZGF0YS5cbiAqIEBtZXRob2Qgc2V0Q2FyZERhdGFcbiAqL1xuQ2FyZFZpZXcucHJvdG90eXBlLnNldENhcmREYXRhID0gZnVuY3Rpb24oY2FyZERhdGEpIHtcblx0dGhpcy5jYXJkRGF0YSA9IGNhcmREYXRhO1xuXG5cblx0aWYgKHRoaXMuY2FyZERhdGEuaXNTaG93bigpKSB7XG5cdFx0Lypcblx0XHR0aGlzLmJhY2sudmlzaWJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuZnJhbWUudmlzaWJsZSA9IHRydWU7XG4qL1xuXHRcdHRoaXMudmFsdWVGaWVsZC5zdHlsZS5maWxsID0gdGhpcy5jYXJkRGF0YS5nZXRDb2xvcigpO1xuXG5cdFx0dGhpcy52YWx1ZUZpZWxkLnNldFRleHQodGhpcy5jYXJkRGF0YS5nZXRDYXJkVmFsdWVTdHJpbmcoKSk7XG5cdFx0dGhpcy52YWx1ZUZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXHRcdHRoaXMudmFsdWVGaWVsZC5wb3NpdGlvbi54ID0gMTcgLSB0aGlzLnZhbHVlRmllbGQuY2FudmFzLndpZHRoIC8gMjtcblxuXHRcdHRoaXMuc3VpdC5zZXRUZXh0dXJlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFwic3VpdFN5bWJvbHNcIilbdGhpcy5jYXJkRGF0YS5nZXRTdWl0SW5kZXgoKV0pO1xuXHR9XG5cdHRoaXMuYmFjay52aXNpYmxlID0gdHJ1ZTtcblx0dGhpcy5mcmFtZS52aXNpYmxlID0gZmFsc2U7XG59XG5cbi8qKlxuICogU2V0IGNhcmQgZGF0YS5cbiAqIEBtZXRob2Qgc2V0Q2FyZERhdGFcbiAqL1xuQ2FyZFZpZXcucHJvdG90eXBlLnNldFRhcmdldFBvc2l0aW9uID0gZnVuY3Rpb24ocG9pbnQpIHtcblx0dGhpcy50YXJnZXRQb3NpdGlvbiA9IHBvaW50O1xuXG5cdHRoaXMucG9zaXRpb24ueCA9IHBvaW50Lng7XG5cdHRoaXMucG9zaXRpb24ueSA9IHBvaW50Lnk7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5DYXJkVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cbkNhcmRWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdHRoaXMubWFzay5oZWlnaHQgPSB0aGlzLmhlaWdodDtcblxuXHR2YXIgZGVzdGluYXRpb24gPSB7eDogdGhpcy5wb3NpdGlvbi54LCB5OiB0aGlzLnBvc2l0aW9uLnl9O1xuXHR0aGlzLnBvc2l0aW9uLnggPSAodGhpcy5wYXJlbnQud2lkdGggLSB0aGlzLndpZHRoKSowLjU7XG5cdHRoaXMucG9zaXRpb24ueSA9IC10aGlzLmhlaWdodDtcblxuXHR2YXIgZGlmZlggPSB0aGlzLnBvc2l0aW9uLnggLSBkZXN0aW5hdGlvbi54O1xuXHR2YXIgZGlmZlkgPSB0aGlzLnBvc2l0aW9uLnkgLSBkZXN0aW5hdGlvbi55O1xuXHR2YXIgZGlmZiA9IE1hdGguc3FydChkaWZmWCpkaWZmWCArIGRpZmZZKmRpZmZZKTtcblxuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oIHRoaXMucG9zaXRpb24gKVxuICAgICAgICAgICAgLnRvKCB7IHg6IGRlc3RpbmF0aW9uLngsIHk6IGRlc3RpbmF0aW9uLnkgfSwgMypkaWZmIClcbiAgICAgICAgICAgIC5lYXNpbmcoIFRXRUVOLkVhc2luZy5RdWFkcmF0aWMuT3V0IClcbiAgICAgICAgICAgIC5vbkNvbXBsZXRlKHRoaXMub25TaG93Q29tcGxldGUuYmluZCh0aGlzKSlcbiAgICAgICAgICAgIC5zdGFydCgpO1xufVxuXG4vKipcbiAqIFNob3cgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uU2hvd0NvbXBsZXRlXG4gKi9cbkNhcmRWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZih0aGlzLmNhcmREYXRhLmlzU2hvd24oKSkge1xuXHRcdHRoaXMuYmFjay52aXNpYmxlID0gZmFsc2U7XG5cdFx0dGhpcy5mcmFtZS52aXNpYmxlID0gdHJ1ZTtcblx0fVxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xufVxuXG4vKipcbiAqIEZvbGQuXG4gKiBAbWV0aG9kIGZvbGRcbiAqL1xuQ2FyZFZpZXcucHJvdG90eXBlLmZvbGQgPSBmdW5jdGlvbigpIHtcblx0dmFyIG8gPSB7XG5cdFx0eDogdGhpcy50YXJnZXRQb3NpdGlvbi54LFxuXHRcdHk6IHRoaXMudGFyZ2V0UG9zaXRpb24ueSs4MFxuXHR9O1xuXG5cdHZhciB0aW1lID0gNTAwOy8vIFNldHRpbmdzLmluc3RhbmNlLnNjYWxlQW5pbWF0aW9uVGltZSg1MDApO1xuXHR0aGlzLnQwID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMucG9zaXRpb24pXG5cdFx0XHQudG8obywgdGltZSlcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQpXG5cdFx0XHQub25VcGRhdGUodGhpcy5vbkZvbGRVcGRhdGUuYmluZCh0aGlzKSlcblx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25Gb2xkQ29tcGxldGUuYmluZCh0aGlzKSlcblx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIEZvbGQgYW5pbWF0aW9uIHVwZGF0ZS5cbiAqIEBtZXRob2Qgb25Gb2xkVXBkYXRlXG4gKi9cbkNhcmRWaWV3LnByb3RvdHlwZS5vbkZvbGRVcGRhdGUgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuXHR0aGlzLm1hc2tHcmFwaGljcy5zY2FsZS55ID0gMSAtIHByb2dyZXNzO1xufVxuXG4vKipcbiAqIEZvbGQgYW5pbWF0aW9uIGNvbXBsZXRlLlxuICogQG1ldGhvZCBvbkZvbGRDb21wbGV0ZVxuICovXG5DYXJkVmlldy5wcm90b3R5cGUub25Gb2xkQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgTmluZVNsaWNlID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL05pbmVTbGljZVwiKTtcbnZhciBTbGlkZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvU2xpZGVyXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFBpeGlUZXh0SW5wdXQgPSByZXF1aXJlKFwiUGl4aVRleHRJbnB1dFwiKTtcbnZhciBNb3VzZU92ZXJHcm91cCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9Nb3VzZU92ZXJHcm91cFwiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIENoYXQgdmlldy5cbiAqIEBjbGFzcyBDaGF0Vmlld1xuICovXG5mdW5jdGlvbiBDaGF0VmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5tYXJnaW4gPSA1O1xuXG5cdFxuXHR2YXIgY2hhdFBsYXRlID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRjaGF0UGxhdGUucG9zaXRpb24ueCA9IDEwO1xuXHRjaGF0UGxhdGUucG9zaXRpb24ueSA9IDU0MDtcblx0Y2hhdFBsYXRlLnNldExvY2FsU2l6ZSgzMzAsIDEzMCk7XG5cdHRoaXMuYWRkQ2hpbGQoY2hhdFBsYXRlKTtcblxuXHR2YXIgcyA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImZyYW1lUGxhdGVcIiksIDEwKTtcblx0cy5wb3NpdGlvbi54ID0gMTA7XG5cdHMucG9zaXRpb24ueSA9IDY3NTtcblx0cy5zZXRMb2NhbFNpemUoMzMwLCAzNSk7XG5cdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuXHRcdGZvbnQ6IFwiMTJweCBBcmlhbFwiLFxuXHRcdHdvcmRXcmFwV2lkdGg6IDMxMCxcblx0XHRoZWlnaHQ6IDExNCxcblx0XHRib3JkZXI6IHRydWUsXG5cdFx0Y29sb3I6IDB4RkZGRkZGLFxuXHRcdGJvcmRlckNvbG9yOiAweDQwNDA0MCxcblx0XHR3b3JkV3JhcDogdHJ1ZSxcblx0XHRtdWx0aWxpbmU6IHRydWVcblx0fTtcblxuXHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRhaW5lcik7XG5cdHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLnggPSAyMDtcblx0dGhpcy5jb250YWluZXIucG9zaXRpb24ueSA9IDU0ODtcblxuXHR0aGlzLmNoYXRNYXNrID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0dGhpcy5jaGF0TWFzay5iZWdpbkZpbGwoMTIzKTtcblx0dGhpcy5jaGF0TWFzay5kcmF3UmVjdCgwLCAwLCAzMTAsIDExNCk7XG5cdHRoaXMuY2hhdE1hc2suZW5kRmlsbCgpO1xuXHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmNoYXRNYXNrKTtcblxuXHR0aGlzLmNoYXRUZXh0ID0gbmV3IFBJWEkuVGV4dChcIlwiLCBzdHlsZU9iamVjdCk7XG5cdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuY2hhdFRleHQpO1xuXHR0aGlzLmNoYXRUZXh0Lm1hc2sgPSB0aGlzLmNoYXRNYXNrO1xuXG5cblxuXHR2YXIgc3R5bGVPYmplY3QgPSB7XG5cdFx0Zm9udDogXCIxNHB4IEFyaWFsXCIsXG5cdFx0d2lkdGg6IDMxMCxcblx0XHRoZWlnaHQ6IDE5LFxuXHRcdGJvcmRlcjogdHJ1ZSxcblx0XHRib3JkZXJDb2xvcjogMHg0MDQwNDAsXG5cdFx0YmFja2dyb3VuZDogdHJ1ZSxcblx0XHRtdWx0aWxpbmU6IHRydWVcblx0fTtcblx0dGhpcy5pbnB1dEZpZWxkID0gbmV3IFBpeGlUZXh0SW5wdXQoXCJcIiwgc3R5bGVPYmplY3QpO1xuXHR0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueCA9IHRoaXMuY29udGFpbmVyLnBvc2l0aW9uLng7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi55ID0gNjgzO1xuXHR0aGlzLmlucHV0RmllbGQud2lkdGggPSAzMTA7XG5cdHRoaXMuaW5wdXRGaWVsZC5rZXlkb3duID0gdGhpcy5vbktleURvd24uYmluZCh0aGlzKTtcblxuXHR2YXIgaW5wdXRTaGFkb3cgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHRpbnB1dFNoYWRvdy5iZWdpbkZpbGwoMHgwMDAwMDApO1xuXHRpbnB1dFNoYWRvdy5kcmF3UmVjdCgtMSwgLTEsIDMxMSwgMjApO1xuXHRpbnB1dFNoYWRvdy5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdGlucHV0U2hhZG93LnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0dGhpcy5hZGRDaGlsZChpbnB1dFNoYWRvdyk7XG5cblx0dmFyIGlucHV0QmFja2dyb3VuZCA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdGlucHV0QmFja2dyb3VuZC5iZWdpbkZpbGwoMHhGRkZGRkYpO1xuXHRpbnB1dEJhY2tncm91bmQuZHJhd1JlY3QoMCwgMCwgMzEwLCAxOSk7XG5cdGlucHV0QmFja2dyb3VuZC5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdGlucHV0QmFja2dyb3VuZC5wb3NpdGlvbi55ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnk7XG5cdHRoaXMuYWRkQ2hpbGQoaW5wdXRCYWNrZ3JvdW5kKTtcblxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaW5wdXRGaWVsZCk7XG5cblxuXG5cdHZhciBzbGlkZUJhY2sgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0ZXh0U2Nyb2xsYmFyVHJhY2tcIiksIDEwLCAwLCAxMCwgMCk7XG5cdHNsaWRlQmFjay53aWR0aCA9IDEwNztcblx0dmFyIHNsaWRlS25vYiA9IG5ldyBOaW5lU2xpY2UoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcInRleHRTY3JvbGxiYXJUaHVtYlwiKSwgMTAsIDAsIDEwLCAwKTtcblx0c2xpZGVLbm9iLndpZHRoID0gMzA7XG5cblxuXHR0aGlzLnNsaWRlciA9IG5ldyBTbGlkZXIoc2xpZGVCYWNrLCBzbGlkZUtub2IpO1xuXHR0aGlzLnNsaWRlci5yb3RhdGlvbiA9IE1hdGguUEkqMC41O1xuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi54ID0gMzI2O1xuXHR0aGlzLnNsaWRlci5wb3NpdGlvbi55ID0gNTUyO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcblx0dGhpcy5zbGlkZXIudmlzaWJsZSA9IGZhbHNlO1xuXHR0aGlzLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25TbGlkZXJDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5zbGlkZXIpO1xuXG5cblx0dGhpcy5tb3VzZU92ZXJHcm91cCA9IG5ldyBNb3VzZU92ZXJHcm91cCgpO1xuXHR0aGlzLm1vdXNlT3Zlckdyb3VwLmFkZERpc3BsYXlPYmplY3QodGhpcy5jaGF0VGV4dCk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLnNsaWRlcik7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRGlzcGxheU9iamVjdCh0aGlzLmNoYXRNYXNrKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGREaXNwbGF5T2JqZWN0KGNoYXRQbGF0ZSk7XG5cdHRoaXMubW91c2VPdmVyR3JvdXAuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3ZlclwiLCB0aGlzLm9uQ2hhdEZpZWxkTW91c2VPdmVyLCB0aGlzKTtcblx0dGhpcy5tb3VzZU92ZXJHcm91cC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgdGhpcy5vbkNoYXRGaWVsZE1vdXNlT3V0LCB0aGlzKTtcblxuXHR0aGlzLmNsZWFyKCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2hhdFZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGF0Vmlldyk7XG5cblxuXG4vKipcbiAqIENsZWFyIG1lc3NhZ2VzLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5DaGF0Vmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jaGF0VGV4dC5zZXRUZXh0KFwiXCIpO1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0ICkpO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcbn1cblxuXG4vKipcbiAqICBBZGQgdGV4dC5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuQ2hhdFZpZXcucHJvdG90eXBlLmFkZFRleHQgPSBmdW5jdGlvbih1c2VyLCB0ZXh0KSB7XG5cdHRoaXMuY2hhdFRleHQuc2V0VGV4dCh0aGlzLmNoYXRUZXh0LnRleHQgKyB1c2VyICsgXCI6IFwiICsgdGV4dCArIFwiXFxuXCIpO1xuIFx0dGhpcy5jaGF0VGV4dC55ID0gLU1hdGgucm91bmQodGhpcy5zbGlkZXIuZ2V0VmFsdWUoKSoodGhpcy5jaGF0VGV4dC5oZWlnaHQgKyB0aGlzLm1hcmdpbiAtIHRoaXMuY2hhdE1hc2suaGVpZ2h0ICkpO1xuXHR0aGlzLnNsaWRlci5zZXRWYWx1ZSgxKTtcbn1cblxuLyoqXG4gKiBPbiBzbGlkZXIgdmFsdWUgY2hhbmdlXG4gKiBAbWV0aG9kIG9uU2xpZGVyQ2hhbmdlXG4gKi9cbiBDaGF0Vmlldy5wcm90b3R5cGUub25TbGlkZXJDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiBcdHRoaXMuY2hhdFRleHQueSA9IC1NYXRoLnJvdW5kKHRoaXMuc2xpZGVyLmdldFZhbHVlKCkqKHRoaXMuY2hhdFRleHQuaGVpZ2h0ICsgdGhpcy5tYXJnaW4gLSB0aGlzLmNoYXRNYXNrLmhlaWdodCkpO1xuIH1cblxuXG4vKipcbiAqIE9uIG1vdXNlIG92ZXJcbiAqIEBtZXRob2Qgb25DaGF0RmllbGRNb3VzZU92ZXJcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbkNoYXRGaWVsZE1vdXNlT3ZlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNsaWRlci5zaG93KCk7XG4gfVxuXG5cbi8qKlxuICogT24gbW91c2Ugb3V0XG4gKiBAbWV0aG9kIG9uQ2hhdEZpZWxkTW91c2VPdXRcbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbkNoYXRGaWVsZE1vdXNlT3V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2xpZGVyLmhpZGUoKTtcbiB9XG5cblxuLyoqXG4gKiBPbiBrZXkgZG93blxuICogQG1ldGhvZCBvbktleURvd25cbiAqL1xuIENoYXRWaWV3LnByb3RvdHlwZS5vbktleURvd24gPSBmdW5jdGlvbihldmVudCkge1xuXHRpZihldmVudC5rZXlDb2RlID09IDEzKSB7XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhdFwiLCB0aGlzLmlucHV0RmllbGQudGV4dCk7XG5cdFx0XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnNldFRleHQoXCJcIik7XG5cdFx0XG5cdH1cbiB9XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRWaWV3O1xuIiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG5cblxuXG4vKipcbiAqIEEgY2hpcHMgdmlldy5cbiAqIEBjbGFzcyBDaGlwc1ZpZXdcbiAqL1xuZnVuY3Rpb24gQ2hpcHNWaWV3KHNob3dUb29sVGlwKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gbnVsbDtcblxuXHR0aGlzLmFsaWduID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uTGVmdDtcblxuXHR0aGlzLnZhbHVlID0gMDtcblxuXHR0aGlzLmRlbm9taW5hdGlvbnMgPSBbNTAwMDAwLDEwMDAwMCwyNTAwMCw1MDAwLDEwMDAsNTAwLDEwMCwyNSw1LDFdO1xuXG5cdHRoaXMuc3RhY2tDbGlwcyA9IG5ldyBBcnJheSgpO1xuXHR0aGlzLmhvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmhvbGRlcik7XG5cblx0dGhpcy50b29sVGlwID0gbnVsbDtcblxuXHRpZihzaG93VG9vbFRpcCkge1xuXHRcdHRoaXMudG9vbFRpcCA9IG5ldyBUb29sVGlwKCk7XG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnRvb2xUaXApO1xuXHR9XG5cbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChDaGlwc1ZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGlwc1ZpZXcpO1xuXG4vKipcbiAqIFNldCBhbGlnbm1lbnQuXG4gKiBAbWV0aG9kIHNldENhcmREYXRhXG4gKi9cbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0QWxpZ25tZW50ID0gZnVuY3Rpb24oYWxpZ24pIHtcblx0dGhpcy5hbGlnbiA9IGFsaWduO1xufVxuXG4vKipcbiAqIFNldCB0YXJnZXQgcG9zaXRpb24uXG4gKiBAbWV0aG9kIHNldFRhcmdldFBvc2l0aW9uXG4gKi9cbkNoaXBzVmlldy5wcm90b3R5cGUuc2V0VGFyZ2V0UG9zaXRpb24gPSBmdW5jdGlvbihwb3NpdGlvbikge1xuXHR0aGlzLnRhcmdldFBvc2l0aW9uID0gcG9zaXRpb247XG5cdHRoaXMucG9zaXRpb24ueCA9IHBvc2l0aW9uLng7XG5cdHRoaXMucG9zaXRpb24ueSA9IHBvc2l0aW9uLnk7XG59XG5cbi8qKlxuICogU2V0IHZhbHVlLlxuICogQG1ldGhvZCBzZXRWYWx1ZVxuICovXG5DaGlwc1ZpZXcucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXG5cdHZhciBzcHJpdGU7XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc3RhY2tDbGlwcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmhvbGRlci5yZW1vdmVDaGlsZCh0aGlzLnN0YWNrQ2xpcHNbaV0pO1xuXG5cdHRoaXMuc3RhY2tDbGlwcyA9IG5ldyBBcnJheSgpO1xuXG5cdGlmICh0aGlzLnRvb2xUaXAhPW51bGwpXG5cdFx0dGhpcy50b29sVGlwLnRleHQgPSBcIkJldDogXCIrIHRoaXMudmFsdWUudG9TdHJpbmcoKTtcblxuXHR2YXIgaTtcblx0dmFyIHN0YWNrQ2xpcCA9IG51bGw7XG5cdHZhciBzdGFja1BvcyA9IDA7XG5cdHZhciBjaGlwUG9zID0gMDtcblx0dmFyIHRleHR1cmVzID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZXMoXCJjaGlwc1wiKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5kZW5vbWluYXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGRlbm9taW5hdGlvbiA9IHRoaXMuZGVub21pbmF0aW9uc1tpXTtcblxuXHRcdGNoaXBQb3M9MDtcblx0XHRzdGFja0NsaXA9bnVsbDtcblx0XHR3aGlsZSh2YWx1ZSA+PSBkZW5vbWluYXRpb24pIHtcblx0XHRcdGlmIChzdGFja0NsaXAgPT0gbnVsbCkge1xuXHRcdFx0XHRzdGFja0NsaXAgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdFx0XHRcdHN0YWNrQ2xpcC54ID0gc3RhY2tQb3M7XG5cdFx0XHRcdHN0YWNrUG9zICs9IDQwO1xuXHRcdFx0XHR0aGlzLmhvbGRlci5hZGRDaGlsZChzdGFja0NsaXApO1xuXHRcdFx0XHR0aGlzLnN0YWNrQ2xpcHMucHVzaChzdGFja0NsaXApO1xuXHRcdFx0fVxuXHRcdCAgIFx0dmFyIHRleHR1cmUgPSB0ZXh0dXJlc1tpJXRleHR1cmVzLmxlbmd0aF07XG5cdFx0XHR2YXIgY2hpcCA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKTtcblx0XHRcdGNoaXAucG9zaXRpb24ueSA9IGNoaXBQb3M7XG5cdFx0XHRjaGlwUG9zIC09IDU7XG5cdFx0XHRzdGFja0NsaXAuYWRkQ2hpbGQoY2hpcCk7XG5cdFx0XHR2YWx1ZSAtPSBkZW5vbWluYXRpb247XG5cblx0XHRcdHZhciBkZW5vbWluYXRpb25TdHJpbmc7XG5cblx0XHRcdGlmKGRlbm9taW5hdGlvbiA+PSAxMDAwKVxuXHRcdFx0XHRkZW5vbWluYXRpb25TdHJpbmcgPSBNYXRoLnJvdW5kKGRlbm9taW5hdGlvbiAvIDEwMDApICsgXCJLXCI7XG5cblx0XHRcdGVsc2Vcblx0XHRcdFx0ZGVub21pbmF0aW9uU3RyaW5nID0gZGVub21pbmF0aW9uO1xuXG5cdFx0XHRpZigoc3RhY2tDbGlwICE9IG51bGwpICYmICh2YWx1ZSA8IGRlbm9taW5hdGlvbikpIHtcblxuXHRcdFx0XHR2YXIgdGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dChkZW5vbWluYXRpb25TdHJpbmcsIHtcblx0XHRcdFx0XHRmb250OiBcImJvbGQgMTJweCBBcmlhbFwiLFxuXHRcdFx0XHRcdGFsaWduOiBcImNlbnRlclwiLFxuXHRcdFx0XHRcdGZpbGw6IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFZhbHVlKFwiY2hpcHNDb2xvcnNcIilbaSVSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRWYWx1ZShcImNoaXBzQ29sb3JzXCIpLmxlbmd0aF1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHRleHRGaWVsZC5wb3NpdGlvbi54ID0gKHN0YWNrQ2xpcC53aWR0aCAtIHRleHRGaWVsZC53aWR0aCkqMC41O1xuXHRcdFx0XHR0ZXh0RmllbGQucG9zaXRpb24ueSA9IGNoaXBQb3MgKyAxMTtcblx0XHRcdFx0dGV4dEZpZWxkLmFscGhhID0gMC41O1xuXHRcdFx0XHQvKlxuXHRcdFx0XHR0ZXh0RmllbGQud2lkdGggPSBzdGFja0NsaXAud2lkdGggLSAxO1xuXHRcdFx0XHR0ZXh0RmllbGQuaGVpZ2h0ID0gMjA7Ki9cblxuXHRcdFx0XHRzdGFja0NsaXAuYWRkQ2hpbGQodGV4dEZpZWxkKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRzd2l0Y2ggKHRoaXMuYWxpZ24pIHtcblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkxFRlQ6IHtcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAwO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5DRU5URVI6IHtcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAtdGhpcy5ob2xkZXIud2lkdGggLyAyO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5SSUdIVDpcblx0XHRcdHRoaXMuaG9sZGVyLnggPSAtdGhpcy5ob2xkZXIud2lkdGg7XG5cdH1cbn1cblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cbkNoaXBzVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBTaG93LlxuICogQG1ldGhvZCBzaG93XG4gKi9cbkNoaXBzVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXG5cdHZhciBkZXN0aW5hdGlvbiA9IHt4OiB0aGlzLnBvc2l0aW9uLngsIHk6IHRoaXMucG9zaXRpb24ueX07XG5cdHRoaXMucG9zaXRpb24ueCA9ICh0aGlzLnBhcmVudC53aWR0aCAtIHRoaXMud2lkdGgpKjAuNTtcblx0dGhpcy5wb3NpdGlvbi55ID0gLXRoaXMuaGVpZ2h0O1xuXG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XG5cdHZhciBkaWZmWSA9IHRoaXMucG9zaXRpb24ueSAtIGRlc3RpbmF0aW9uLnk7XG5cdHZhciBkaWZmID0gTWF0aC5zcXJ0KGRpZmZYKmRpZmZYICsgZGlmZlkqZGlmZlkpO1xuXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbiggdGhpcy5wb3NpdGlvbiApXG4gICAgICAgICAgICAudG8oIHsgeDogZGVzdGluYXRpb24ueCwgeTogZGVzdGluYXRpb24ueSB9LCAzKmRpZmYgKVxuICAgICAgICAgICAgLmVhc2luZyggVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgKVxuICAgICAgICAgICAgLm9uQ29tcGxldGUodGhpcy5vblNob3dDb21wbGV0ZS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLnN0YXJ0KCk7XG59XG5cbi8qKlxuICogU2hvdyBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25TaG93Q29tcGxldGVcbiAqL1xuQ2hpcHNWaWV3LnByb3RvdHlwZS5vblNob3dDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcbn1cblxuLyoqXG4gKiBBbmltYXRlIGluLlxuICogQG1ldGhvZCBhbmltYXRlSW5cbiAqL1xuQ2hpcHNWaWV3LnByb3RvdHlwZS5hbmltYXRlSW4gPSBmdW5jdGlvbigpIHtcblx0dmFyIG8gPSB7XG5cdFx0eTogUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS55XG5cdH07XG5cblx0c3dpdGNoICh0aGlzLmFsaWduKSB7XG5cdFx0Y2FzZSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5BbGlnbi5MRUZUOlxuXHRcdFx0by54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54LXdpZHRoLzI7XG5cblx0XHRjYXNlIFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLkFsaWduLkNFTlRFUjpcblx0XHRcdG8ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueDtcblxuXHRcdGNhc2UgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuQWxpZ24uUklHSFQ6XG5cdFx0XHRvLnggPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLngrd2lkdGgvMjtcblx0fVxuXG5cdHZhciB0aW1lID0gNTAwO1xuXHR2YXIgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcblx0XHRcdFx0XHQudG8oeyB5OiBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludChcInBvdFBvc2l0aW9uXCIpLnkgfSwgdGltZSlcblx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uSW5BbmltYXRpb25Db21wbGV0ZS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIEluIGFuaW1hdGlvbiBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25JbkFuaW1hdGlvbkNvbXBsZXRlXG4gKi9cbkNoaXBzVmlldy5wcm90b3R5cGUub25JbkFuaW1hdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc2V0VmFsdWUoMCk7XG5cblx0eCA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueDtcblx0eSA9IHRoaXMudGFyZ2V0UG9zaXRpb24ueTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoaXBzVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBEaWFsb2cgdmlldy5cbiAqIEBjbGFzcyBEZWFsZXJCdXR0b25WaWV3XG4gKi9cbmZ1bmN0aW9uIERlYWxlckJ1dHRvblZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cblx0dmFyIGRlYWxlckJ1dHRvblRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZGVhbGVyQnV0dG9uXCIpO1xuXHR0aGlzLnNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShkZWFsZXJCdXR0b25UZXh0dXJlKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XG5cdHRoaXMuaGlkZSgpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKERlYWxlckJ1dHRvblZpZXcsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChEZWFsZXJCdXR0b25WaWV3KTtcblxuLyoqXG4gKiBTZXQgc2VhdCBpbmRleFxuICogQG1ldGhvZCBzZXRTZWF0SW5kZXhcbiAqL1xuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuc2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oc2VhdEluZGV4KSB7XG5cdHRoaXMucG9zaXRpb24ueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImRlYWxlckJ1dHRvblBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLng7XG5cdHRoaXMucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImRlYWxlckJ1dHRvblBvc2l0aW9uc1wiKVtzZWF0SW5kZXhdLnk7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEFuaW1hdGUgdG8gc2VhdCBpbmRleC5cbiAqIEBtZXRob2QgYW5pbWF0ZVRvU2VhdEluZGV4XG4gKi9cbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLmFuaW1hdGVUb1NlYXRJbmRleCA9IGZ1bmN0aW9uKHNlYXRJbmRleCkge1xuXHRpZiAoIXRoaXMudmlzaWJsZSkge1xuXHRcdHRoaXMuc2V0U2VhdEluZGV4KHNlYXRJbmRleCk7XG5cdFx0Ly8gdG9kbyBkaXNwYXRjaCBldmVudCB0aGF0IGl0J3MgY29tcGxldGU/XG5cdFx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzKTtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyIGRlc3RpbmF0aW9uID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiZGVhbGVyQnV0dG9uUG9zaXRpb25zXCIpW3NlYXRJbmRleF07XG5cdHZhciBkaWZmWCA9IHRoaXMucG9zaXRpb24ueCAtIGRlc3RpbmF0aW9uLng7XG5cdHZhciBkaWZmWSA9IHRoaXMucG9zaXRpb24ueSAtIGRlc3RpbmF0aW9uLnk7XG5cdHZhciBkaWZmID0gTWF0aC5zcXJ0KGRpZmZYKmRpZmZYICsgZGlmZlkqZGlmZlkpO1xuXG5cdHZhciB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbiggdGhpcy5wb3NpdGlvbiApXG4gICAgICAgICAgICAudG8oIHsgeDogZGVzdGluYXRpb24ueCwgeTogZGVzdGluYXRpb24ueSB9LCA1KmRpZmYgKVxuICAgICAgICAgICAgLmVhc2luZyggVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5PdXQgKVxuICAgICAgICAgICAgLm9uQ29tcGxldGUodGhpcy5vblNob3dDb21wbGV0ZS5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLnN0YXJ0KCk7XG59O1xuXG4vKipcbiAqIFNob3cgQ29tcGxldGUuXG4gKiBAbWV0aG9kIG9uU2hvd0NvbXBsZXRlXG4gKi9cbkRlYWxlckJ1dHRvblZpZXcucHJvdG90eXBlLm9uU2hvd0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImFuaW1hdGlvbkRvbmVcIiwgdGhpcyk7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5EZWFsZXJCdXR0b25WaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuRGVhbGVyQnV0dG9uVmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKHNlYXRJbmRleCwgYW5pbWF0ZSkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXHRpZihhbmltYXRlKSB7XG5cdFx0dGhpcy5hbmltYXRlVG9TZWF0SW5kZXgoc2VhdEluZGV4KTtcblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLnNldFNlYXRJbmRleChzZWF0SW5kZXgpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGVhbGVyQnV0dG9uVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vcmVzb3VyY2VzL1Jlc291cmNlc1wiKTtcblxuLyoqXG4gKiBEaWFsb2cgYnV0dG9uLlxuICogQGNsYXNzIERpYWxvZ0J1dHRvblxuICovXG5mdW5jdGlvbiBEaWFsb2dCdXR0b24oKSB7XG5cdEJ1dHRvbi5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYnV0dG9uVGV4dHVyZSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJkaWFsb2dCdXR0b25cIik7XG5cdHRoaXMuYWRkQ2hpbGQobmV3IFBJWEkuU3ByaXRlKHRoaXMuYnV0dG9uVGV4dHVyZSkpO1xuXG5cdHZhciBzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxNHB4IEFyaWFsXCIsXG5cdFx0ZmlsbDogXCIjZmZmZmZmXCJcblx0fTtcblxuXHR0aGlzLnRleHRGaWVsZCA9IG5ldyBQSVhJLlRleHQoXCJbdGVzdF1cIiwgc3R5bGUpO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gMTU7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xuXG5cdHRoaXMuc2V0VGV4dChcIkJUTlwiKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChEaWFsb2dCdXR0b24sIEJ1dHRvbik7XG5cbi8qKlxuICogU2V0IHRleHQgZm9yIHRoZSBidXR0b24uXG4gKiBAbWV0aG9kIHNldFRleHRcbiAqL1xuRGlhbG9nQnV0dG9uLnByb3RvdHlwZS5zZXRUZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KHRleHQpO1xuXHR0aGlzLnRleHRGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy50ZXh0RmllbGQueCA9IHRoaXMuYnV0dG9uVGV4dHVyZS53aWR0aCAvIDIgLSB0aGlzLnRleHRGaWVsZC53aWR0aCAvIDI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlhbG9nQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIERpYWxvZ0J1dHRvbiA9IHJlcXVpcmUoXCIuL0RpYWxvZ0J1dHRvblwiKTtcbnZhciBCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uLy4uL3Byb3RvL2RhdGEvQnV0dG9uRGF0YVwiKTtcbnZhciBQaXhpVGV4dElucHV0ID0gcmVxdWlyZShcIlBpeGlUZXh0SW5wdXRcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbi8qKlxuICogRGlhbG9nIHZpZXcuXG4gKiBAY2xhc3MgRGlhbG9nVmlld1xuICovXG5mdW5jdGlvbiBEaWFsb2dWaWV3KCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR2YXIgY292ZXIgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHRjb3Zlci5iZWdpbkZpbGwoMHgwMDAwMDAsIC41KTtcblx0Y292ZXIuZHJhd1JlY3QoMCwgMCwgOTYwLCA3MjApO1xuXHRjb3Zlci5lbmRGaWxsKCk7XG5cdGNvdmVyLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0Ly9jb3Zlci5idXR0b25Nb2RlID0gdHJ1ZTtcblx0Y292ZXIuaGl0QXJlYSA9IG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCA5NjAsIDcyMCk7XG5cdHRoaXMuYWRkQ2hpbGQoY292ZXIpO1xuXG5cdHZhciBiID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiZnJhbWVQbGF0ZVwiKSwgMTApO1xuXHRiLnNldExvY2FsU2l6ZSg0ODAsIDI3MCk7XG5cdGIucG9zaXRpb24ueCA9IDQ4MCAtIDQ4MCAvIDI7XG5cdGIucG9zaXRpb24ueSA9IDM2MCAtIDI3MCAvIDI7XG5cdHRoaXMuYWRkQ2hpbGQoYik7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMTRweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy50ZXh0RmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW3RleHRdXCIsIHN0eWxlKTtcblx0dGhpcy50ZXh0RmllbGQucG9zaXRpb24ueCA9IGIucG9zaXRpb24ueCArIDIwO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gYi5wb3NpdGlvbi55ICsgMjA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xuXG5cdHRoaXMuYnV0dG9uc0hvbGRlciA9IG5ldyBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIoKTtcblx0dGhpcy5idXR0b25zSG9sZGVyLnBvc2l0aW9uLnkgPSA0MzA7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25zSG9sZGVyKTtcblx0dGhpcy5idXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHtcblx0XHR2YXIgYiA9IG5ldyBEaWFsb2dCdXR0b24oKTtcblxuXHRcdGIucG9zaXRpb24ueCA9IGkgKiA5MDtcblx0XHRiLm9uKFwiY2xpY2tcIiwgdGhpcy5vbkJ1dHRvbkNsaWNrLCB0aGlzKTtcblx0XHR0aGlzLmJ1dHRvbnNIb2xkZXIuYWRkQ2hpbGQoYik7XG5cdFx0dGhpcy5idXR0b25zLnB1c2goYik7XG5cdH1cblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcIm5vcm1hbCAxOHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLmlucHV0RmllbGQgPSBuZXcgUGl4aVRleHRJbnB1dChcIlwiLCBzdHlsZSk7XG5cdHRoaXMuaW5wdXRGaWVsZC5wb3NpdGlvbi54ID0gdGhpcy50ZXh0RmllbGQucG9zaXRpb24ueDtcblxuXHR0aGlzLmlucHV0RnJhbWUgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXHR0aGlzLmlucHV0RnJhbWUuYmVnaW5GaWxsKDB4MDAwMDAwKTtcblx0dGhpcy5pbnB1dEZyYW1lLmRyYXdSZWN0KC0xLCAtMSwgMTAyLCAyMyk7XG5cdHRoaXMuaW5wdXRGcmFtZS5wb3NpdGlvbi54ID0gdGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLng7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5pbnB1dEZyYW1lKTtcblxuXHR0aGlzLmFkZENoaWxkKHRoaXMuaW5wdXRGaWVsZCk7XG5cblx0dGhpcy5oaWRlKCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoRGlhbG9nVmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KERpYWxvZ1ZpZXcpO1xuXG5EaWFsb2dWaWV3LkJVVFRPTl9DTElDSyA9IFwiYnV0dG9uQ2xpY2tcIjtcblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cbkRpYWxvZ1ZpZXcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG59XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5EaWFsb2dWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24odGV4dCwgYnV0dG9uSWRzLCBkZWZhdWx0VmFsdWUpIHtcblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblxuXHR0aGlzLmJ1dHRvbklkcyA9IGJ1dHRvbklkcztcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGkgPCBidXR0b25JZHMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgYnV0dG9uID0gdGhpcy5idXR0b25zW2ldXG5cdFx0XHRidXR0b24uc2V0VGV4dChCdXR0b25EYXRhLmdldEJ1dHRvblN0cmluZ0ZvcklkKGJ1dHRvbklkc1tpXSkpO1xuXHRcdFx0YnV0dG9uLnZpc2libGUgPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmJ1dHRvbnNbaV0udmlzaWJsZSA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuYnV0dG9uc0hvbGRlci54ID0gNDgwIC0gYnV0dG9uSWRzLmxlbmd0aCAqIDkwIC8gMjtcblx0dGhpcy50ZXh0RmllbGQuc2V0VGV4dCh0ZXh0KTtcblxuXHRpZiAoZGVmYXVsdFZhbHVlKSB7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnBvc2l0aW9uLnkgPSB0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ICsgdGhpcy50ZXh0RmllbGQuaGVpZ2h0ICsgMjA7XG5cdFx0dGhpcy5pbnB1dEZyYW1lLnBvc2l0aW9uLnkgPSB0aGlzLmlucHV0RmllbGQucG9zaXRpb24ueTtcblx0XHR0aGlzLmlucHV0RmllbGQudmlzaWJsZSA9IHRydWU7XG5cdFx0dGhpcy5pbnB1dEZyYW1lLnZpc2libGUgPSB0cnVlO1xuXG5cdFx0dGhpcy5pbnB1dEZpZWxkLnRleHQgPSBkZWZhdWx0VmFsdWU7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLmZvY3VzKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5pbnB1dEZpZWxkLnZpc2libGUgPSBmYWxzZTtcblx0XHR0aGlzLmlucHV0RnJhbWUudmlzaWJsZSA9IGZhbHNlO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIGJ1dHRvbiBjbGljay5cbiAqIEBtZXRob2Qgb25CdXR0b25DbGlja1xuICovXG5EaWFsb2dWaWV3LnByb3RvdHlwZS5vbkJ1dHRvbkNsaWNrID0gZnVuY3Rpb24oZSkge1xuXHR2YXIgYnV0dG9uSW5kZXggPSAtMTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnV0dG9ucy5sZW5ndGg7IGkrKylcblx0XHRpZiAoZS50YXJnZXQgPT0gdGhpcy5idXR0b25zW2ldKVxuXHRcdFx0YnV0dG9uSW5kZXggPSBpO1xuXG5cdHZhciB2YWx1ZSA9IG51bGw7XG5cdGlmICh0aGlzLmlucHV0RmllbGQudmlzaWJsZSlcblx0XHR2YWx1ZSA9IHRoaXMuaW5wdXRGaWVsZC50ZXh0O1xuXG5cdHZhciBldiA9IHtcblx0XHR0eXBlOiBEaWFsb2dWaWV3LkJVVFRPTl9DTElDSyxcblx0XHRidXR0b246IHRoaXMuYnV0dG9uSWRzW2J1dHRvbkluZGV4XSxcblx0XHR2YWx1ZTogdmFsdWVcblx0fTtcblxuXHR0aGlzLnRyaWdnZXIoZXYpO1xuXHR0aGlzLmhpZGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaWFsb2dWaWV3OyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBHcmFkaWVudCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9HcmFkaWVudFwiKTtcblxuLyoqXG4gKiBMb2FkaW5nIHNjcmVlbi5cbiAqIEBjbGFzcyBMb2FkaW5nU2NyZWVuXG4gKi9cbmZ1bmN0aW9uIExvYWRpbmdTY3JlZW4oKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHZhciBncmFkaWVudCA9IG5ldyBHcmFkaWVudCgpO1xuXHRncmFkaWVudC5zZXRTaXplKDEwMCwgMTAwKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDAsIFwiI2ZmZmZmZlwiKTtcblx0Z3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIFwiI2MwYzBjMFwiKTtcblxuXHR2YXIgcyA9IGdyYWRpZW50LmNyZWF0ZVNwcml0ZSgpO1xuXHRzLndpZHRoID0gOTYwO1xuXHRzLmhlaWdodCA9IDcyMDtcblx0dGhpcy5hZGRDaGlsZChzKTtcblxuXHR2YXIgc3R5bGUgPSB7XG5cdFx0Zm9udDogXCJib2xkIDIwcHggQXJpYWxcIixcblx0XHRmaWxsOiBcIiM4MDgwODBcIlxuXHR9O1xuXG5cdHRoaXMudGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dChcIlt0ZXh0XVwiLCBzdHlsZSk7XG5cdHRoaXMudGV4dEZpZWxkLnBvc2l0aW9uLnggPSA5NjAgLyAyO1xuXHR0aGlzLnRleHRGaWVsZC5wb3NpdGlvbi55ID0gNzIwIC8gMiAtIHRoaXMudGV4dEZpZWxkLmhlaWdodCAvIDI7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0RmllbGQpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKExvYWRpbmdTY3JlZW4sIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5cbi8qKlxuICogU2hvdy5cbiAqIEBtZXRob2Qgc2hvd1xuICovXG5Mb2FkaW5nU2NyZWVuLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHR0aGlzLnRleHRGaWVsZC5zZXRUZXh0KG1lc3NhZ2UpO1xuXHR0aGlzLnRleHRGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblx0dGhpcy50ZXh0RmllbGQueCA9IDk2MCAvIDIgLSB0aGlzLnRleHRGaWVsZC53aWR0aCAvIDI7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5Mb2FkaW5nU2NyZWVuLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRpbmdTY3JlZW47IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgU2VhdFZpZXcgPSByZXF1aXJlKFwiLi9TZWF0Vmlld1wiKTtcbnZhciBDYXJkVmlldyA9IHJlcXVpcmUoXCIuL0NhcmRWaWV3XCIpO1xudmFyIENoYXRWaWV3ID0gcmVxdWlyZShcIi4vQ2hhdFZpZXdcIik7XG52YXIgUG9pbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvUG9pbnRcIik7XG52YXIgR3JhZGllbnQgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvR3JhZGllbnRcIik7XG52YXIgQnV0dG9uc1ZpZXcgPSByZXF1aXJlKFwiLi9CdXR0b25zVmlld1wiKTtcbnZhciBEaWFsb2dWaWV3ID0gcmVxdWlyZShcIi4vRGlhbG9nVmlld1wiKTtcbnZhciBEZWFsZXJCdXR0b25WaWV3ID0gcmVxdWlyZShcIi4vRGVhbGVyQnV0dG9uVmlld1wiKTtcbnZhciBDaGlwc1ZpZXcgPSByZXF1aXJlKFwiLi9DaGlwc1ZpZXdcIik7XG52YXIgUG90VmlldyA9IHJlcXVpcmUoXCIuL1BvdFZpZXdcIik7XG52YXIgVGltZXJWaWV3ID0gcmVxdWlyZShcIi4vVGltZXJWaWV3XCIpO1xudmFyIFNldHRpbmdzVmlldyA9IHJlcXVpcmUoXCIuLi92aWV3L1NldHRpbmdzVmlld1wiKTtcblxuLyoqXG4gKiBOZXQgcG9rZXIgY2xpZW50IHZpZXcuXG4gKiBAY2xhc3MgTmV0UG9rZXJDbGllbnRWaWV3XG4gKi9cbmZ1bmN0aW9uIE5ldFBva2VyQ2xpZW50VmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5zZXR1cEJhY2tncm91bmQoKTtcblxuXHR0aGlzLnRhYmxlQ29udGFpbmVyID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMudGFibGVDb250YWluZXIpO1xuXG5cdHRoaXMudGFibGVCYWNrZ3JvdW5kID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJ0YWJsZUJhY2tncm91bmRcIikpO1xuXHR0aGlzLnRhYmxlQ29udGFpbmVyLmFkZENoaWxkKHRoaXMudGFibGVCYWNrZ3JvdW5kKTtcblxuXHR0aGlzLnNldHVwU2VhdHMoKTtcblx0dGhpcy5zZXR1cENvbW11bml0eUNhcmRzKCk7XG5cblx0dGhpcy50aW1lclZpZXcgPSBuZXcgVGltZXJWaWV3KCk7XG5cdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQodGhpcy50aW1lclZpZXcpO1xuXG5cdHRoaXMuY2hhdFZpZXcgPSBuZXcgQ2hhdFZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoYXRWaWV3KTtcblxuXHR0aGlzLmJ1dHRvbnNWaWV3ID0gbmV3IEJ1dHRvbnNWaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b25zVmlldyk7XG5cblx0dGhpcy5kaWFsb2dWaWV3ID0gbmV3IERpYWxvZ1ZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmRpYWxvZ1ZpZXcpO1xuXG5cdHRoaXMuZGVhbGVyQnV0dG9uVmlldyA9IG5ldyBEZWFsZXJCdXR0b25WaWV3KCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5kZWFsZXJCdXR0b25WaWV3KTtcblxuXHR0aGlzLnBvdFZpZXcgPSBuZXcgUG90VmlldygpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMucG90Vmlldyk7XG5cdHRoaXMucG90Vmlldy5wb3NpdGlvbi54ID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJwb3RQb3NpdGlvblwiKS54O1xuXHR0aGlzLnBvdFZpZXcucG9zaXRpb24ueSA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50KFwicG90UG9zaXRpb25cIikueTtcblxuXHR0aGlzLnNldHRpbmdzVmlldyA9IG5ldyBTZXR0aW5nc1ZpZXcoKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnNldHRpbmdzVmlldyk7XG5cblx0dGhpcy5zZXR1cENoaXBzKCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoTmV0UG9rZXJDbGllbnRWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoTmV0UG9rZXJDbGllbnRWaWV3KTtcblxuTmV0UG9rZXJDbGllbnRWaWV3LlNFQVRfQ0xJQ0sgPSBcInNlYXRDbGlja1wiO1xuXG4vKipcbiAqIFNldHVwIGJhY2tncm91bmQuXG4gKiBAbWV0aG9kIHNldHVwQmFja2dyb3VuZFxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLnNldHVwQmFja2dyb3VuZCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZ3JhZGllbnQgPSBuZXcgR3JhZGllbnQoKTtcblx0Z3JhZGllbnQuc2V0U2l6ZSgxMDAsIDEwMCk7XG5cdGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCBcIiM2MDYwNjBcIik7XG5cdGdyYWRpZW50LmFkZENvbG9yU3RvcCguNSwgXCIjYTBhMGEwXCIpO1xuXHRncmFkaWVudC5hZGRDb2xvclN0b3AoMSwgXCIjOTA5MDkwXCIpO1xuXG5cdHZhciBzID0gZ3JhZGllbnQuY3JlYXRlU3ByaXRlKCk7XG5cdHMud2lkdGggPSA5NjA7XG5cdHMuaGVpZ2h0ID0gNzIwO1xuXHR0aGlzLmFkZENoaWxkKHMpO1xuXG5cdHZhciBzID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJkaXZpZGVyTGluZVwiKSk7XG5cdHMueCA9IDM0NTtcblx0cy55ID0gNTQwO1xuXHR0aGlzLmFkZENoaWxkKHMpO1xuXG5cdHZhciBzID0gbmV3IFBJWEkuU3ByaXRlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJkaXZpZGVyTGluZVwiKSk7XG5cdHMueCA9IDY5Mztcblx0cy55ID0gNTQwO1xuXHR0aGlzLmFkZENoaWxkKHMpO1xufVxuXG4vKipcbiAqIFNldHVwIHNlYXRzLlxuICogQG1ldGhvZCBzZXJ1cFNlYXRzXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUuc2V0dXBTZWF0cyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaSwgajtcblx0dmFyIHBvY2tldENhcmRzO1xuXG5cdHRoaXMuc2VhdFZpZXdzID0gW107XG5cblx0Zm9yIChpID0gMDsgaSA8IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcInNlYXRQb3NpdGlvbnNcIikubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgc2VhdFZpZXcgPSBuZXcgU2VhdFZpZXcoaSk7XG5cdFx0dmFyIHAgPSBzZWF0Vmlldy5wb3NpdGlvbjtcblxuXHRcdGZvciAoaiA9IDA7IGogPCAyOyBqKyspIHtcblx0XHRcdHZhciBjID0gbmV3IENhcmRWaWV3KCk7XG5cdFx0XHRjLmhpZGUoKTtcblx0XHRcdGMuc2V0VGFyZ2V0UG9zaXRpb24oUG9pbnQocC54ICsgaiAqIDMwIC0gNjAsIHAueSAtIDEwMCkpO1xuXHRcdFx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZChjKTtcblx0XHRcdHNlYXRWaWV3LmFkZFBvY2tldENhcmQoYyk7XG5cdFx0XHRzZWF0Vmlldy5vbihcImNsaWNrXCIsIHRoaXMub25TZWF0Q2xpY2ssIHRoaXMpO1xuXHRcdH1cblxuXHRcdHRoaXMudGFibGVDb250YWluZXIuYWRkQ2hpbGQoc2VhdFZpZXcpO1xuXHRcdHRoaXMuc2VhdFZpZXdzLnB1c2goc2VhdFZpZXcpO1xuXHR9XG59XG5cbi8qKlxuICogU2V0dXAgY2hpcHMuXG4gKiBAbWV0aG9kIHNlcnVwU2VhdHNcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5zZXR1cENoaXBzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpO1xuXHRmb3IgKGkgPSAwOyBpIDwgUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwiYmV0UG9zaXRpb25zXCIpLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGNoaXBzVmlldyA9IG5ldyBDaGlwc1ZpZXcoKTtcblx0XHR0aGlzLnNlYXRWaWV3c1tpXS5iZXRDaGlwcyA9IGNoaXBzVmlldztcblxuXHRcdGNoaXBzVmlldy5zZXRBbGlnbm1lbnQoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VmFsdWUoXCJiZXRBbGlnblwiKVtpXSk7XG5cdFx0Y2hpcHNWaWV3LnNldFRhcmdldFBvc2l0aW9uKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcImJldFBvc2l0aW9uc1wiKVtpXSk7XG5cdFx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZChjaGlwc1ZpZXcpO1xuXHR9XG59XG5cbi8qKlxuICogU2VhdCBjbGljay5cbiAqIEBtZXRob2Qgb25TZWF0Q2xpY2tcbiAqIEBwcml2YXRlXG4gKi9cbk5ldFBva2VyQ2xpZW50Vmlldy5wcm90b3R5cGUub25TZWF0Q2xpY2sgPSBmdW5jdGlvbihlKSB7XG5cdHZhciBzZWF0SW5kZXggPSAtMTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2VhdFZpZXdzLmxlbmd0aDsgaSsrKVxuXHRcdGlmIChlLnRhcmdldCA9PSB0aGlzLnNlYXRWaWV3c1tpXSlcblx0XHRcdHNlYXRJbmRleCA9IGk7XG5cblx0Y29uc29sZS5sb2coXCJzZWF0IGNsaWNrOiBcIiArIHNlYXRJbmRleCk7XG5cdHRoaXMudHJpZ2dlcih7XG5cdFx0dHlwZTogTmV0UG9rZXJDbGllbnRWaWV3LlNFQVRfQ0xJQ0ssXG5cdFx0c2VhdEluZGV4OiBzZWF0SW5kZXhcblx0fSk7XG59XG5cbi8qKlxuICogU2V0dXAgY29tbXVuaXR5IGNhcmRzLlxuICogQG1ldGhvZCBzZXR1cENvbW11bml0eUNhcmRzXG4gKiBAcHJpdmF0ZVxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLnNldHVwQ29tbXVuaXR5Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb21tdW5pdHlDYXJkcyA9IFtdO1xuXG5cdHZhciBwID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnQoXCJjb21tdW5pdHlDYXJkc1Bvc2l0aW9uXCIpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCA1OyBpKyspIHtcblx0XHR2YXIgY2FyZFZpZXcgPSBuZXcgQ2FyZFZpZXcoKTtcblx0XHRjYXJkVmlldy5oaWRlKCk7XG5cdFx0Y2FyZFZpZXcuc2V0VGFyZ2V0UG9zaXRpb24oUG9pbnQocC54ICsgaSAqIDkwLCBwLnkpKTtcblxuXHRcdHRoaXMuY29tbXVuaXR5Q2FyZHMucHVzaChjYXJkVmlldyk7XG5cdFx0dGhpcy50YWJsZUNvbnRhaW5lci5hZGRDaGlsZChjYXJkVmlldyk7XG5cdH1cbn1cblxuLyoqXG4gKiBHZXQgc2VhdCB2aWV3IGJ5IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0Vmlld0J5SW5kZXhcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXRTZWF0Vmlld0J5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0Vmlld3NbaW5kZXhdO1xufVxuXG4vKipcbiAqIEdldCBzZWF0IHZpZXcgYnkgaW5kZXguXG4gKiBAbWV0aG9kIGdldFNlYXRWaWV3QnlJbmRleFxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmdldENvbW11bml0eUNhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvbW11bml0eUNhcmRzO1xufVxuXG4vKipcbiAqIEdldCBidXR0b25zIHZpZXcuXG4gKiBAbWV0aG9kIGdldFNlYXRWaWV3QnlJbmRleFxuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmdldEJ1dHRvbnNWaWV3ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbnNWaWV3O1xufVxuXG4vKipcbiAqIEdldCBkaWFsb2cgdmlldy5cbiAqIEBtZXRob2QgZ2V0RGlhbG9nVmlld1xuICovXG5OZXRQb2tlckNsaWVudFZpZXcucHJvdG90eXBlLmdldERpYWxvZ1ZpZXcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZGlhbG9nVmlldztcbn1cblxuLyoqXG4gKiBHZXQgZGlhbG9nIHZpZXcuXG4gKiBAbWV0aG9kIGdldERlYWxlckJ1dHRvblZpZXdcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5nZXREZWFsZXJCdXR0b25WaWV3ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRlYWxlckJ1dHRvblZpZXc7XG59XG5cbi8qKlxuICogQ2xlYXIgZXZlcnl0aGluZyB0byBhbiBlbXB0eSBzdGF0ZS5cbiAqIEBtZXRob2QgY2xlYXJcbiAqL1xuTmV0UG9rZXJDbGllbnRWaWV3LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgaTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5jb21tdW5pdHlDYXJkcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLmNvbW11bml0eUNhcmRzW2ldLmhpZGUoKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5zZWF0Vmlld3MubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5zZWF0Vmlld3NbaV0uY2xlYXIoKTtcblxuXHR0aGlzLnRpbWVyVmlldy5oaWRlKCk7XG5cdHRoaXMucG90Vmlldy5zZXRWYWx1ZXMobmV3IEFycmF5KCkpO1xuXHR0aGlzLmRlYWxlckJ1dHRvblZpZXcuaGlkZSgpO1xuXHR0aGlzLmNoYXRWaWV3LmNsZWFyKCk7XG5cblx0dGhpcy5kaWFsb2dWaWV3LmhpZGUoKTtcblx0dGhpcy5idXR0b25zVmlldy5jbGVhcigpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5ldFBva2VyQ2xpZW50VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBDaGlwc1ZpZXcgPSByZXF1aXJlKFwiLi9DaGlwc1ZpZXdcIik7XG5cblxuXG4vKipcbiAqIEEgcG90IHZpZXdcbiAqIEBjbGFzcyBQb3RWaWV3XG4gKi9cbmZ1bmN0aW9uIFBvdFZpZXcoKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXHRcblx0dGhpcy52YWx1ZSA9IDA7XG5cblx0dGhpcy5ob2xkZXIgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5ob2xkZXIpO1xuXG5cdHRoaXMuc3RhY2tzID0gbmV3IEFycmF5KCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoUG90VmlldywgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFBvdFZpZXcpO1xuXG4vKipcbiAqIFNldCB2YWx1ZS5cbiAqIEBtZXRob2Qgc2V0VmFsdWVcbiAqL1xuUG90Vmlldy5wcm90b3R5cGUuc2V0VmFsdWVzID0gZnVuY3Rpb24odmFsdWVzKSB7XG5cdFxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5zdGFja3MubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5ob2xkZXIucmVtb3ZlQ2hpbGQodGhpcy5zdGFja3NbaV0pO1xuXG5cdHRoaXMuc3RhY2tzID0gbmV3IEFycmF5KCk7XG5cblx0dmFyIHBvcyA9IDA7XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjaGlwcyA9IG5ldyBDaGlwc1ZpZXcoZmFsc2UpO1xuXHRcdHRoaXMuc3RhY2tzLnB1c2goY2hpcHMpO1xuXHRcdHRoaXMuaG9sZGVyLmFkZENoaWxkKGNoaXBzKTtcblx0XHRjaGlwcy5zZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuXHRcdGNoaXBzLnggPSBwb3M7XG5cdFx0cG9zICs9IE1hdGguZmxvb3IoY2hpcHMud2lkdGggKyAyMCk7XG5cblx0XHR2YXIgdGV4dEZpZWxkID0gbmV3IFBJWEkuVGV4dCh2YWx1ZXNbaV0sIHtcblx0XHRcdGZvbnQ6IFwiYm9sZCAxMnB4IEFyaWFsXCIsXG5cdFx0XHRhbGlnbjogXCJjZW50ZXJcIixcblx0XHRcdGZpbGw6IDB4ZmZmZmZmXG5cdFx0fSk7XG5cblx0XHR0ZXh0RmllbGQucG9zaXRpb24ueCA9IChjaGlwcy53aWR0aCAtIHRleHRGaWVsZC53aWR0aCkqMC41O1xuXHRcdHRleHRGaWVsZC5wb3NpdGlvbi55ID0gMzA7XG5cblx0XHRjaGlwcy5hZGRDaGlsZCh0ZXh0RmllbGQpO1xuXHR9XG5cblx0dGhpcy5ob2xkZXIueCA9IC10aGlzLmhvbGRlci53aWR0aCowLjU7XG59XG5cbi8qKlxuICogSGlkZS5cbiAqIEBtZXRob2QgaGlkZVxuICovXG5Qb3RWaWV3LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuUG90Vmlldy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSB0cnVlO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG90VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIENoZWNrYm94ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0NoZWNrYm94XCIpO1xuXG5cblxuLyoqXG4gKiBSYWlzZSBzaG9ydGN1dCBidXR0b25cbiAqIEBjbGFzcyBSYWlzZVNob3J0Y3V0QnV0dG9uXG4gKi9cbiBmdW5jdGlvbiBSYWlzZVNob3J0Y3V0QnV0dG9uKCkge1xuIFx0dmFyIGJhY2tncm91bmQgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJidXR0b25CYWNrZ3JvdW5kXCIpLCAxMCwgNSwgMTAsIDUpO1xuIFx0YmFja2dyb3VuZC53aWR0aCA9IDEwNTtcbiBcdGJhY2tncm91bmQuaGVpZ2h0ID0gMjU7XG5cdEJ1dHRvbi5jYWxsKHRoaXMsIGJhY2tncm91bmQpO1xuXG4gXHR2YXIgc3R5bGVPYmplY3QgPSB7XG4gXHRcdHdpZHRoOiAxMDUsXG4gXHRcdGhlaWdodDogMjAsXG4gXHRcdGZvbnQ6IFwiYm9sZCAxNHB4IEFyaWFsXCIsXG4gXHRcdGNvbG9yOiBcIndoaXRlXCJcbiBcdH07XG5cdHRoaXMubGFiZWwgPSBuZXcgUElYSS5UZXh0KFwiXCIsIHN0eWxlT2JqZWN0KTtcblx0dGhpcy5sYWJlbC5wb3NpdGlvbi54ID0gODtcblx0dGhpcy5sYWJlbC5wb3NpdGlvbi55ID0gNDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChSYWlzZVNob3J0Y3V0QnV0dG9uLCBCdXR0b24pO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoUmFpc2VTaG9ydGN1dEJ1dHRvbik7XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRUZXh0XG4gKi9cblJhaXNlU2hvcnRjdXRCdXR0b24ucHJvdG90eXBlLnNldFRleHQgPSBmdW5jdGlvbihzdHJpbmcpIHtcblx0dGhpcy5sYWJlbC5zZXRUZXh0KHN0cmluZyk7XG5cdHJldHVybiBzdHJpbmc7XG59XG5cbi8qKlxuICogU2V0IGVuYWJsZWQuXG4gKiBAbWV0aG9kIHNldEVuYWJsZWRcbiAqL1xuUmFpc2VTaG9ydGN1dEJ1dHRvbi5wcm90b3R5cGUuc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdGlmKHZhbHVlKSB7XG5cdFx0dGhpcy5hbHBoYSA9IDE7XG5cdFx0dGhpcy5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdFx0dGhpcy5idXR0b25Nb2RlID0gdHJ1ZTtcblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLmFscGhhID0gMC41O1xuXHRcdHRoaXMuaW50ZXJhY3RpdmUgPSBmYWxzZTtcblx0XHR0aGlzLmJ1dHRvbk1vZGUgPSBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmFpc2VTaG9ydGN1dEJ1dHRvbjsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcblxuLyoqXG4gKiBBIHNlYXQgdmlldy5cbiAqIEBjbGFzcyBTZWF0Vmlld1xuICovXG5mdW5jdGlvbiBTZWF0VmlldyhzZWF0SW5kZXgpIHtcblx0QnV0dG9uLmNhbGwodGhpcyk7XG5cblx0dGhpcy5wb2NrZXRDYXJkcyA9IFtdO1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblxuXHR2YXIgc2VhdFRleHR1cmUgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwic2VhdFBsYXRlXCIpO1xuXHR2YXIgc2VhdFNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShzZWF0VGV4dHVyZSk7XG5cblx0c2VhdFNwcml0ZS5wb3NpdGlvbi54ID0gLXNlYXRUZXh0dXJlLndpZHRoIC8gMjtcblx0c2VhdFNwcml0ZS5wb3NpdGlvbi55ID0gLXNlYXRUZXh0dXJlLmhlaWdodCAvIDI7XG5cblx0dGhpcy5hZGRDaGlsZChzZWF0U3ByaXRlKTtcblxuXHR2YXIgcG9zID0gUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0UG9pbnRzKFwic2VhdFBvc2l0aW9uc1wiKVt0aGlzLnNlYXRJbmRleF07XG5cblx0dGhpcy5wb3NpdGlvbi54ID0gcG9zLng7XG5cdHRoaXMucG9zaXRpb24ueSA9IHBvcy55O1xuXG5cdHZhciBzdHlsZTtcblxuXHRzdHlsZSA9IHtcblx0XHRmb250OiBcImJvbGQgMjBweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5uYW1lRmllbGQgPSBuZXcgUElYSS5UZXh0KFwiW25hbWVdXCIsIHN0eWxlKTtcblx0dGhpcy5uYW1lRmllbGQucG9zaXRpb24ueSA9IC0yMDtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLm5hbWVGaWVsZCk7XG5cblx0c3R5bGUgPSB7XG5cdFx0Zm9udDogXCJub3JtYWwgMTJweCBBcmlhbFwiXG5cdH07XG5cblx0dGhpcy5jaGlwc0ZpZWxkID0gbmV3IFBJWEkuVGV4dChcIltuYW1lXVwiLCBzdHlsZSk7XG5cdHRoaXMuY2hpcHNGaWVsZC5wb3NpdGlvbi55ID0gNTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoaXBzRmllbGQpO1xuXG5cdHN0eWxlID0ge1xuXHRcdGZvbnQ6IFwiYm9sZCAyMHB4IEFyaWFsXCJcblx0fTtcblxuXHR0aGlzLmFjdGlvbkZpZWxkID0gbmV3IFBJWEkuVGV4dChcImFjdGlvblwiLCBzdHlsZSk7XG5cdHRoaXMuYWN0aW9uRmllbGQucG9zaXRpb24ueSA9IC0xMztcblx0dGhpcy5hZGRDaGlsZCh0aGlzLmFjdGlvbkZpZWxkKTtcblx0dGhpcy5hY3Rpb25GaWVsZC5hbHBoYSA9IDA7XG5cblx0dGhpcy5zZXROYW1lKFwiXCIpO1xuXHR0aGlzLnNldENoaXBzKFwiXCIpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNlYXRWaWV3LCBCdXR0b24pO1xuXG4vKipcbiAqIFNldCBuYW1lLlxuICogQG1ldGhvZCBzZXROYW1lXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXROYW1lID0gZnVuY3Rpb24obmFtZSkge1xuXHR0aGlzLm5hbWVGaWVsZC5zZXRUZXh0KG5hbWUpO1xuXHR0aGlzLm5hbWVGaWVsZC51cGRhdGVUcmFuc2Zvcm0oKTtcblxuXHR0aGlzLm5hbWVGaWVsZC5wb3NpdGlvbi54ID0gLXRoaXMubmFtZUZpZWxkLmNhbnZhcy53aWR0aCAvIDI7XG59XG5cbi8qKlxuICogU2V0IG5hbWUuXG4gKiBAbWV0aG9kIHNldENoaXBzXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5zZXRDaGlwcyA9IGZ1bmN0aW9uKGNoaXBzKSB7XG5cdHRoaXMuY2hpcHNGaWVsZC5zZXRUZXh0KGNoaXBzKTtcblx0dGhpcy5jaGlwc0ZpZWxkLnVwZGF0ZVRyYW5zZm9ybSgpO1xuXG5cdHRoaXMuY2hpcHNGaWVsZC5wb3NpdGlvbi54ID0gLXRoaXMuY2hpcHNGaWVsZC5jYW52YXMud2lkdGggLyAyO1xufVxuXG4vKipcbiAqIFNldCBzaXRvdXQuXG4gKiBAbWV0aG9kIHNldFNpdG91dFxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuc2V0U2l0b3V0ID0gZnVuY3Rpb24oc2l0b3V0KSB7XG5cdGlmIChzaXRvdXQpXG5cdFx0dGhpcy5hbHBoYSA9IC41O1xuXG5cdGVsc2Vcblx0XHR0aGlzLmFscGhhID0gMTtcbn1cblxuLyoqXG4gKiBTZXQgc2l0b3V0LlxuICogQG1ldGhvZCBzZXRBY3RpdmVcbiAqL1xuU2VhdFZpZXcucHJvdG90eXBlLnNldEFjdGl2ZSA9IGZ1bmN0aW9uKGFjdGl2ZSkge1xuXHR0aGlzLnZpc2libGUgPSBhY3RpdmU7XG59XG5cbi8qKlxuICogQWRkIHBvY2tldCBjYXJkLlxuICogQG1ldGhvZCBhZGRQb2NrZXRDYXJkXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5hZGRQb2NrZXRDYXJkID0gZnVuY3Rpb24oY2FyZFZpZXcpIHtcblx0dGhpcy5wb2NrZXRDYXJkcy5wdXNoKGNhcmRWaWV3KTtcbn1cblxuLyoqXG4gKiBHZXQgcG9ja2V0IGNhcmRzLlxuICogQG1ldGhvZCBnZXRQb2NrZXRDYXJkc1xuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuZ2V0UG9ja2V0Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMucG9ja2V0Q2FyZHM7XG59XG5cbi8qKlxuICogRm9sZCBjYXJkcy5cbiAqIEBtZXRob2QgZm9sZENhcmRzXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5mb2xkQ2FyZHMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5wb2NrZXRDYXJkc1swXS5hZGRFdmVudExpc3RlbmVyKFwiYW5pbWF0aW9uRG9uZVwiLCB0aGlzLm9uRm9sZENvbXBsZXRlLCB0aGlzKTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMucG9ja2V0Q2FyZHMubGVuZ3RoOyBpKyspIHtcblx0XHR0aGlzLnBvY2tldENhcmRzW2ldLmZvbGQoKTtcblx0fVxufVxuXG4vKipcbiAqIEZvbGQgY29tcGxldGUuXG4gKiBAbWV0aG9kIG9uRm9sZENvbXBsZXRlXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5vbkZvbGRDb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnBvY2tldENhcmRzWzBdLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhbmltYXRpb25Eb25lXCIsIHRoaXMub25Gb2xkQ29tcGxldGUsIHRoaXMpO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJhbmltYXRpb25Eb25lXCIpO1xufVxuXG4vKipcbiAqIFNob3cgdXNlciBhY3Rpb24uXG4gKiBAbWV0aG9kIGFjdGlvblxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdHRoaXMuYWN0aW9uRmllbGQuc2V0VGV4dChhY3Rpb24pO1xuXHR0aGlzLmFjdGlvbkZpZWxkLnBvc2l0aW9uLnggPSAtdGhpcy5hY3Rpb25GaWVsZC5jYW52YXMud2lkdGggLyAyO1xuXG5cdHRoaXMuYWN0aW9uRmllbGQuYWxwaGEgPSAxO1xuXHR0aGlzLm5hbWVGaWVsZC5hbHBoYSA9IDA7XG5cdHRoaXMuY2hpcHNGaWVsZC5hbHBoYSA9IDA7XG5cblx0c2V0VGltZW91dCh0aGlzLm9uVGltZXIuYmluZCh0aGlzKSwgMTAwMCk7XG59XG5cbi8qKlxuICogU2hvdyB1c2VyIGFjdGlvbi5cbiAqIEBtZXRob2QgYWN0aW9uXG4gKi9cblNlYXRWaWV3LnByb3RvdHlwZS5vblRpbWVyID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cblx0dmFyIHQxID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMuYWN0aW9uRmllbGQpXG5cdFx0XHRcdFx0XHRcdC50byh7YWxwaGE6IDB9LCAxMDAwKVxuXHRcdFx0XHRcdFx0XHQuc3RhcnQoKTtcblx0dmFyIHQyID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMubmFtZUZpZWxkKVxuXHRcdFx0XHRcdFx0XHQudG8oe2FscGhhOiAxfSwgMTAwMClcblx0XHRcdFx0XHRcdFx0LnN0YXJ0KCk7XG5cdHZhciB0MyA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzLmNoaXBzRmllbGQpXG5cdFx0XHRcdFx0XHRcdC50byh7YWxwaGE6IDF9LCAxMDAwKVxuXHRcdFx0XHRcdFx0XHQuc3RhcnQoKTtcblxufVxuXG4vKipcbiAqIENsZWFyLlxuICogQG1ldGhvZCBjbGVhclxuICovXG5TZWF0Vmlldy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGk7XG5cblx0dGhpcy52aXNpYmxlID0gdHJ1ZTtcblx0dGhpcy5zaXRvdXQgPSBmYWxzZTtcblx0Ly9zZWF0LmJldENoaXBzLnNldFZhbHVlKDApO1xuXHR0aGlzLnNldE5hbWUoXCJcIik7XG5cdHRoaXMuc2V0Q2hpcHMoXCJcIik7XG5cblx0Zm9yIChpPTA7IGk8dGhpcy5wb2NrZXRDYXJkcy5sZW5ndGg7IGkrKylcblx0XHR0aGlzLnBvY2tldENhcmRzW2ldLmhpZGUoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0VmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIENoZWNrYm94ID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0NoZWNrYm94XCIpO1xuXG5cblxuLyoqXG4gKiBDaGVja2JveGVzIHZpZXdcbiAqIEBjbGFzcyBTZXR0aW5nc0NoZWNrYm94XG4gKi9cbiBmdW5jdGlvbiBTZXR0aW5nc0NoZWNrYm94KGlkLCBzdHJpbmcpIHtcbiBcdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG4gXHR0aGlzLmlkID0gaWQ7XG5cbiBcdHZhciB5ID0gMDtcblxuIFx0dmFyIHN0eWxlT2JqZWN0ID0ge1xuIFx0XHR3aWR0aDogMjAwLFxuIFx0XHRoZWlnaHQ6IDI1LFxuIFx0XHRmb250OiBcImJvbGQgMTNweCBBcmlhbFwiLFxuIFx0XHRjb2xvcjogXCJ3aGl0ZVwiXG4gXHR9O1xuIFx0dGhpcy5sYWJlbCA9IG5ldyBQSVhJLlRleHQoc3RyaW5nLCBzdHlsZU9iamVjdCk7XG4gXHR0aGlzLmxhYmVsLnBvc2l0aW9uLnggPSAyNTtcbiBcdHRoaXMubGFiZWwucG9zaXRpb24ueSA9IHkgKyAxO1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLmxhYmVsKTtcblxuIFx0dmFyIGJhY2tncm91bmQgPSBuZXcgUElYSS5TcHJpdGUoUmVzb3VyY2VzLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZShcImNoZWNrYm94QmFja2dyb3VuZFwiKSk7XG4gXHR2YXIgdGljayA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hlY2tib3hUaWNrXCIpKTtcbiBcdHRpY2sueCA9IDE7XG5cbiBcdHRoaXMuY2hlY2tib3ggPSBuZXcgQ2hlY2tib3goYmFja2dyb3VuZCwgdGljayk7XG4gXHR0aGlzLmNoZWNrYm94LnBvc2l0aW9uLnkgPSB5O1xuIFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNoZWNrYm94KTtcblxuIFx0dGhpcy5jaGVja2JveC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMub25DaGVja2JveENoYW5nZSwgdGhpcyk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2V0dGluZ3NDaGVja2JveCwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KFNldHRpbmdzQ2hlY2tib3gpO1xuXG4vKipcbiAqIENoZWNrYm94IGNoYW5nZS5cbiAqIEBtZXRob2Qgb25DaGVja2JveENoYW5nZVxuICovXG5TZXR0aW5nc0NoZWNrYm94LnByb3RvdHlwZS5vbkNoZWNrYm94Q2hhbmdlID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiLCB0aGlzKTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENoZWNrZWRcbiAqL1xuU2V0dGluZ3NDaGVja2JveC5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVja2JveC5nZXRDaGVja2VkKCk7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRDaGVja2VkXG4gKi9cblNldHRpbmdzQ2hlY2tib3gucHJvdG90eXBlLnNldENoZWNrZWQgPSBmdW5jdGlvbihjaGVja2VkKSB7XG5cdHRoaXMuY2hlY2tib3guc2V0Q2hlY2tlZChjaGVja2VkKTtcblx0cmV0dXJuIGNoZWNrZWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0dGluZ3NDaGVja2JveDsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgQnV0dG9uID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0J1dHRvblwiKTtcbnZhciBOaW5lU2xpY2UgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvTmluZVNsaWNlXCIpO1xudmFyIFJlc291cmNlcyA9IHJlcXVpcmUoXCIuLi9yZXNvdXJjZXMvUmVzb3VyY2VzXCIpO1xudmFyIFNldHRpbmdzID0gcmVxdWlyZShcIi4uL2FwcC9TZXR0aW5nc1wiKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi4vLi4vdXRpbHMvRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIFNldHRpbmdzQ2hlY2tib3ggPSByZXF1aXJlKFwiLi9TZXR0aW5nc0NoZWNrYm94XCIpO1xudmFyIFJhaXNlU2hvcnRjdXRCdXR0b24gPSByZXF1aXJlKFwiLi9SYWlzZVNob3J0Y3V0QnV0dG9uXCIpO1xudmFyIENoZWNrYm94TWVzc2FnZSA9IHJlcXVpcmUoXCIuLi8uLi9wcm90by9tZXNzYWdlcy9DaGVja2JveE1lc3NhZ2VcIik7XG5cblxuXG4vKipcbiAqIEEgc2V0dGluZ3Mgdmlld1xuICogQGNsYXNzIFNldHRpbmdzVmlld1xuICovXG4gZnVuY3Rpb24gU2V0dGluZ3NWaWV3KCkge1xuIFx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cbiBcdHZhciBvYmplY3QgPSBuZXcgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKCk7XG4gXHR2YXIgYmcgPSBuZXcgTmluZVNsaWNlKFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmUoXCJjaGF0QmFja2dyb3VuZFwiKSwgMTAsIDEwLCAxMCwgMTApO1xuIFx0Ymcud2lkdGggPSAzMDtcbiBcdGJnLmhlaWdodCA9IDMwO1xuIFx0b2JqZWN0LmFkZENoaWxkKGJnKTtcblxuIFx0dmFyIHNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwid3JlbmNoSWNvblwiKSk7XG4gXHRzcHJpdGUueCA9IDU7XG4gXHRzcHJpdGUueSA9IDU7XG4gXHRvYmplY3QuYWRkQ2hpbGQoc3ByaXRlKTtcblxuIFx0dGhpcy5zZXR0aW5nc0J1dHRvbiA9IG5ldyBCdXR0b24ob2JqZWN0KTtcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24ucG9zaXRpb24ueCA9IDk2MCAtIDEwIC0gdGhpcy5zZXR0aW5nc0J1dHRvbi53aWR0aDtcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24ucG9zaXRpb24ueSA9IDU0MztcbiBcdHRoaXMuc2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihCdXR0b24uQ0xJQ0ssIHRoaXMub25TZXR0aW5nc0J1dHRvbkNsaWNrLCB0aGlzKTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5zZXR0aW5nc0J1dHRvbik7XG5cbiBcdHRoaXMuc2V0dGluZ3NNZW51ID0gbmV3IFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcigpO1xuIFx0XG4gXHR2YXIgbWJnID0gbmV3IE5pbmVTbGljZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwiY2hhdEJhY2tncm91bmRcIiksIDEwLCAxMCwgMTAsIDEwKTtcbiBcdG1iZy53aWR0aCA9IDI1MDtcbiBcdG1iZy5oZWlnaHQgPSAxMDA7XG4gXHR0aGlzLnNldHRpbmdzTWVudS5hZGRDaGlsZChtYmcpO1xuXG4gXHR2YXIgc3R5bGVPYmplY3QgPSB7XG4gXHRcdGZvbnQ6IFwiYm9sZCAxNHB4IEFyaWFsXCIsXG4gXHRcdGNvbG9yOiBcIiNGRkZGRkZcIixcbiBcdFx0d2lkdGg6IDIwMCxcbiBcdFx0aGVpZ2h0OiAyMFxuIFx0fTtcbiBcdHZhciBsYWJlbCA9IG5ldyBQSVhJLlRleHQoXCJTZXR0aW5nc1wiLCBzdHlsZU9iamVjdCk7XG4gXHRsYWJlbC5wb3NpdGlvbi54ID0gMTY7XG4gXHRsYWJlbC5wb3NpdGlvbi55ID0gMTA7XG5cbiBcdHRoaXMuc2V0dGluZ3NNZW51LmFkZENoaWxkKGxhYmVsKTtcbiBcdHRoaXMuc2V0dGluZ3NNZW51LnBvc2l0aW9uLnggPSA5NjAgLSAxMCAtIHRoaXMuc2V0dGluZ3NNZW51LndpZHRoO1xuIFx0dGhpcy5zZXR0aW5nc01lbnUucG9zaXRpb24ueSA9IDUzOCAtIHRoaXMuc2V0dGluZ3NNZW51LmhlaWdodDtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5zZXR0aW5nc01lbnUpO1xuXG4gXHR0aGlzLnNldHRpbmdzID0ge307XG5cbiBcdHRoaXMuY3JlYXRlTWVudVNldHRpbmcoXCJwbGF5QW5pbWF0aW9uc1wiLCBcIlBsYXkgYW5pbWF0aW9uc1wiLCA0MCwgU2V0dGluZ3MuZ2V0SW5zdGFuY2UoKS5wbGF5QW5pbWF0aW9ucyk7XG4gXHR0aGlzLmNyZWF0ZU1lbnVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5BVVRPX01VQ0tfTE9TSU5HLCBcIk11Y2sgbG9zaW5nIGhhbmRzXCIsIDY1KTtcblxuIFx0dGhpcy5jcmVhdGVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5BVVRPX1BPU1RfQkxJTkRTLCBcIlBvc3QgYmxpbmRzXCIsIDApO1xuIFx0dGhpcy5jcmVhdGVTZXR0aW5nKENoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVCwgXCJTaXQgb3V0XCIsIDI1KTtcblxuIFx0dGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSA9IGZhbHNlO1xuXG4gXHR0aGlzLmJ1eUNoaXBzQnV0dG9uID0gbmV3IFJhaXNlU2hvcnRjdXRCdXR0b24oKTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMub25CdXlDaGlwc0NsaWNrLCB0aGlzKTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24ueCA9IDcwMDtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24ueSA9IDYzNTtcbiBcdHRoaXMuYnV5Q2hpcHNCdXR0b24uc2V0VGV4dChcIkJ1eSBjaGlwc1wiKTtcbiBcdHRoaXMuYWRkQ2hpbGQodGhpcy5idXlDaGlwc0J1dHRvbik7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoU2V0dGluZ3NWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoU2V0dGluZ3NWaWV3KTtcblxuU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSyA9IFwiYnV5Q2hpcHNDbGlja1wiO1xuXG4vKipcbiAqIE9uIGJ1eSBjaGlwcyBidXR0b24gY2xpY2tlZC5cbiAqIEBtZXRob2Qgb25CdXlDaGlwc0NsaWNrXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUub25CdXlDaGlwc0NsaWNrID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGNvbnNvbGUubG9nKFwiYnV5IGNoaXBzIGNsaWNrXCIpO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoU2V0dGluZ3NWaWV3LkJVWV9DSElQU19DTElDSyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGNoZWNrYm94LlxuICogQG1ldGhvZCBjcmVhdGVNZW51U2V0dGluZ1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmNyZWF0ZU1lbnVTZXR0aW5nID0gZnVuY3Rpb24oaWQsIHN0cmluZywgeSwgZGVmKSB7XG5cdHZhciBzZXR0aW5nID0gbmV3IFNldHRpbmdzQ2hlY2tib3goaWQsIHN0cmluZyk7XG5cblx0c2V0dGluZy55ID0geTtcblx0c2V0dGluZy54ID0gMTY7XG5cdHRoaXMuc2V0dGluZ3NNZW51LmFkZENoaWxkKHNldHRpbmcpO1xuXG5cdHNldHRpbmcuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uQ2hlY2tib3hDaGFuZ2UsIHRoaXMpXG5cblx0dGhpcy5zZXR0aW5nc1tpZF0gPSBzZXR0aW5nO1xuXHRzZXR0aW5nLnNldENoZWNrZWQoZGVmKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgc2V0dGluZy5cbiAqIEBtZXRob2QgY3JlYXRlU2V0dGluZ1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmNyZWF0ZVNldHRpbmcgPSBmdW5jdGlvbihpZCwgc3RyaW5nLCB5KSB7XG5cdHZhciBzZXR0aW5nID0gbmV3IFNldHRpbmdzQ2hlY2tib3goaWQsIHN0cmluZyk7XG5cblx0c2V0dGluZy55ID0gNTQ1K3k7XG5cdHNldHRpbmcueCA9IDcwMDtcblx0dGhpcy5hZGRDaGlsZChzZXR0aW5nKTtcblxuXHRzZXR0aW5nLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgdGhpcy5vbkNoZWNrYm94Q2hhbmdlLCB0aGlzKVxuXG5cdHRoaXMuc2V0dGluZ3NbaWRdID0gc2V0dGluZztcbn1cblxuLyoqXG4gKiBDaGVja2JveCBjaGFuZ2UuXG4gKiBAbWV0aG9kIG9uQ2hlY2tib3hDaGFuZ2VcbiAqL1xuU2V0dGluZ3NWaWV3LnByb3RvdHlwZS5vbkNoZWNrYm94Q2hhbmdlID0gZnVuY3Rpb24oY2hlY2tib3gpIHtcblx0aWYoY2hlY2tib3guaWQgPT0gXCJwbGF5QW5pbWF0aW9uc1wiKSB7XG5cdFx0U2V0dGluZ3MuZ2V0SW5zdGFuY2UoKS5wbGF5QW5pbWF0aW9ucyA9IGNoZWNrYm94LmdldENoZWNrZWQoKTtcblx0XHRjb25zb2xlLmxvZyhcImFuaW1zIGNoYW5nZWQuLlwiKTtcblx0fVxuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiLCBjaGVja2JveC5pZCwgY2hlY2tib3guZ2V0Q2hlY2tlZCgpKTtcbn1cblxuLyoqXG4gKiBTZXR0aW5ncyBidXR0b24gY2xpY2suXG4gKiBAbWV0aG9kIG9uU2V0dGluZ3NCdXR0b25DbGlja1xuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU2V0dGluZ3NCdXR0b25DbGljayA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHRjb25zb2xlLmxvZyhcIlNldHRpbmdzVmlldy5wcm90b3R5cGUub25TZXR0aW5nc0J1dHRvbkNsaWNrXCIpO1xuXHR0aGlzLnNldHRpbmdzTWVudS52aXNpYmxlID0gIXRoaXMuc2V0dGluZ3NNZW51LnZpc2libGU7XG5cblx0aWYodGhpcy5zZXR0aW5nc01lbnUudmlzaWJsZSkge1xuXHRcdHRoaXMuc3RhZ2UubW91c2Vkb3duID0gdGhpcy5vblN0YWdlTW91c2VEb3duLmJpbmQodGhpcyk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy5zdGFnZS5tb3VzZWRvd24gPSBudWxsO1xuXHR9XG59XG5cbi8qKlxuICogU3RhZ2UgbW91c2UgZG93bi5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlRG93blxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU3RhZ2VNb3VzZURvd24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0Y29uc29sZS5sb2coXCJTZXR0aW5nc1ZpZXcucHJvdG90eXBlLm9uU3RhZ2VNb3VzZURvd25cIik7XG5cdGlmKCh0aGlzLmhpdFRlc3QodGhpcy5zZXR0aW5nc01lbnUsIGludGVyYWN0aW9uX29iamVjdCkpIHx8ICh0aGlzLmhpdFRlc3QodGhpcy5zZXR0aW5nc0J1dHRvbiwgaW50ZXJhY3Rpb25fb2JqZWN0KSkpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR0aGlzLnN0YWdlLm1vdXNlZG93biA9IG51bGw7XG5cdHRoaXMuc2V0dGluZ3NNZW51LnZpc2libGUgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBIaXQgdGVzdC5cbiAqIEBtZXRob2QgaGl0VGVzdFxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLmhpdFRlc3QgPSBmdW5jdGlvbihvYmplY3QsIGludGVyYWN0aW9uX29iamVjdCkge1xuXHRpZigoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54ID4gb2JqZWN0LmdldEJvdW5kcygpLnggKSAmJiAoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC54IDwgKG9iamVjdC5nZXRCb3VuZHMoKS54ICsgb2JqZWN0LmdldEJvdW5kcygpLndpZHRoKSkgJiZcblx0XHQoaW50ZXJhY3Rpb25fb2JqZWN0Lmdsb2JhbC55ID4gb2JqZWN0LmdldEJvdW5kcygpLnkpICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPCAob2JqZWN0LmdldEJvdW5kcygpLnkgKyBvYmplY3QuZ2V0Qm91bmRzKCkuaGVpZ2h0KSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcdFx0XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJlc2V0LlxuICogQG1ldGhvZCByZXNldFxuICovXG5TZXR0aW5nc1ZpZXcucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuYnV5Q2hpcHNCdXR0b24uZW5hYmxlZCA9IHRydWU7XG5cdHRoaXMuc2V0VmlzaWJsZUJ1dHRvbnMoW10pO1xufVxuXG4vKipcbiAqIFNldCB2aXNpYmxlIGJ1dHRvbnMuXG4gKiBAbWV0aG9kIHNldFZpc2libGVCdXR0b25zXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuc2V0VmlzaWJsZUJ1dHRvbnMgPSBmdW5jdGlvbihidXR0b25zKSB7XG5cdHRoaXMuYnV5Q2hpcHNCdXR0b24udmlzaWJsZSA9IGJ1dHRvbnMuaW5kZXhPZihCdXR0b25EYXRhLkJVWV9DSElQUykgIT0gLTE7XG5cdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFNdLnZpc2libGUgPSBidXR0b25zLmluZGV4T2YoQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFMpO1xuXHR0aGlzLnNldHRpbmdzW0NoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVF0udmlzaWJsZSA9IGJ1dHRvbnMuaW5kZXhPZihDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFQpO1xuXG5cdHZhciB5cCA9IDU0MztcblxuXHRpZih0aGlzLmJ1eUNoaXBzQnV0dG9uLnZpc2libGUpIHtcblx0XHR0aGlzLmJ1eUNoaXBzQnV0dG9uLnkgPSB5cDtcblx0XHR5cCArPSAzNTtcblx0fVxuXHRlbHNlIHtcblx0XHR5cCArPSAyO1xuXHR9XG5cblx0aWYodGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuQVVUT19QT1NUX0JMSU5EU10udmlzaWJsZSkge1xuXHRcdHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFNdLnkgPSB5cDtcblx0XHR5cCArPSAyNTtcblx0fVxuXG5cdGlmKHRoaXMuc2V0dGluZ3NbQ2hlY2tib3hNZXNzYWdlLlNJVE9VVF9ORVhUXS52aXNpYmxlKSB7XG5cdFx0dGhpcy5zZXR0aW5nc1tDaGVja2JveE1lc3NhZ2UuU0lUT1VUX05FWFRdLnkgPSB5cDtcblx0XHR5cCArPSAyNTtcblx0fVxufVxuXG4vKipcbiAqIEdldCBjaGVja2JveC5cbiAqIEBtZXRob2QgZ2V0Q2hlY2tib3hCeUlkXG4gKi9cblNldHRpbmdzVmlldy5wcm90b3R5cGUuZ2V0Q2hlY2tib3hCeUlkID0gZnVuY3Rpb24oaWQpIHtcblx0cmV0dXJuIHRoaXMuc2V0dGluZ3NbaWRdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNldHRpbmdzVmlldzsiLCJ2YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuLi8uLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG52YXIgUmVzb3VyY2VzID0gcmVxdWlyZShcIi4uL3Jlc291cmNlcy9SZXNvdXJjZXNcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4uLy4uL3V0aWxzL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuXG5cbi8qKlxuICogQSB0aW1lciB2aWV3XG4gKiBAY2xhc3MgVGltZXJWaWV3XG4gKi9cbmZ1bmN0aW9uIFRpbWVyVmlldygpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cdFxuXHR0aGlzLnRpbWVyQ2xpcCA9IG5ldyBQSVhJLlNwcml0ZShSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlKFwidGltZXJCYWNrZ3JvdW5kXCIpKTtcblx0dGhpcy5hZGRDaGlsZCh0aGlzLnRpbWVyQ2xpcCk7XG5cblxuXHR0aGlzLmNhbnZhcyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cdHRoaXMuY2FudmFzLnggPSB0aGlzLnRpbWVyQ2xpcC53aWR0aCowLjU7XG5cdHRoaXMuY2FudmFzLnkgPSB0aGlzLnRpbWVyQ2xpcC5oZWlnaHQqMC41O1xuXHR0aGlzLnRpbWVyQ2xpcC5hZGRDaGlsZCh0aGlzLmNhbnZhcyk7XG5cblx0dGhpcy50aW1lckNsaXAudmlzaWJsZSA9IGZhbHNlO1xuXG5cdHRoaXMudHdlZW4gPSBudWxsO1xuXG5cdC8vdGhpcy5zaG93UGVyY2VudCgzMCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoVGltZXJWaWV3LCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoVGltZXJWaWV3KTtcblxuLyoqXG4gKiBIaWRlLlxuICogQG1ldGhvZCBoaWRlXG4gKi9cblRpbWVyVmlldy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnRpbWVyQ2xpcC52aXNpYmxlID0gZmFsc2U7XG5cdHRoaXMuc3RvcCgpO1xufVxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oc2VhdEluZGV4KSB7XG5cdFxuXHR0aGlzLnRpbWVyQ2xpcC52aXNpYmxlID0gdHJ1ZTtcblx0dGhpcy50aW1lckNsaXAueCA9IFJlc291cmNlcy5nZXRJbnN0YW5jZSgpLmdldFBvaW50cyhcInNlYXRQb3NpdGlvbnNcIilbc2VhdEluZGV4XS54ICsgNTU7XG5cdHRoaXMudGltZXJDbGlwLnkgPSBSZXNvdXJjZXMuZ2V0SW5zdGFuY2UoKS5nZXRQb2ludHMoXCJzZWF0UG9zaXRpb25zXCIpW3NlYXRJbmRleF0ueSAtIDMwO1xuXG5cdHRoaXMuc3RvcCgpO1xuXG59XG5cbi8qKlxuICogU3RvcC5cbiAqIEBtZXRob2Qgc3RvcFxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihzZWF0SW5kZXgpIHtcblx0aWYodGhpcy50d2VlbiAhPSBudWxsKVxuXHRcdHRoaXMudHdlZW4uc3RvcCgpO1xuXG59XG5cbi8qKlxuICogQ291bnRkb3duLlxuICogQG1ldGhvZCBjb3VudGRvd25cbiAqL1xuVGltZXJWaWV3LnByb3RvdHlwZS5jb3VudGRvd24gPSBmdW5jdGlvbih0b3RhbFRpbWUsIHRpbWVMZWZ0KSB7XG5cdHRoaXMuc3RvcCgpO1xuXG5cdHRvdGFsVGltZSAqPSAxMDAwO1xuXHR0aW1lTGVmdCAqPSAxMDAwO1xuXG5cdHZhciB0aW1lID0gRGF0ZS5ub3coKTtcblx0dGhpcy5zdGFydEF0ID0gdGltZSArIHRpbWVMZWZ0IC0gdG90YWxUaW1lO1xuXHR0aGlzLnN0b3BBdCA9IHRpbWUgKyB0aW1lTGVmdDtcblxuXHR0aGlzLnR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHt0aW1lOiB0aW1lfSlcblx0XHRcdFx0XHRcdC50byh7dGltZTogdGhpcy5zdG9wQXR9LCB0aW1lTGVmdClcblx0XHRcdFx0XHRcdC5vblVwZGF0ZSh0aGlzLm9uVXBkYXRlLmJpbmQodGhpcykpXG5cdFx0XHRcdFx0XHQub25Db21wbGV0ZSh0aGlzLm9uQ29tcGxldGUuYmluZCh0aGlzKSlcblx0XHRcdFx0XHRcdC5zdGFydCgpO1xuXG59XG5cbi8qKlxuICogT24gdHdlZW4gdXBkYXRlLlxuICogQG1ldGhvZCBvblVwZGF0ZVxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLm9uVXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lID0gRGF0ZS5ub3coKTtcblx0dmFyIHBlcmNlbnQgPSAxMDAqKHRpbWUgLSB0aGlzLnN0YXJ0QXQpLyh0aGlzLnN0b3BBdCAtIHRoaXMuc3RhcnRBdCk7XG5cbi8vXHRjb25zb2xlLmxvZyhcInAgPSBcIiArIHBlcmNlbnQpO1xuXG5cdHRoaXMuc2hvd1BlcmNlbnQocGVyY2VudCk7XG59XG5cbi8qKlxuICogT24gdHdlZW4gdXBkYXRlLlxuICogQG1ldGhvZCBvblVwZGF0ZVxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLm9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuXHR2YXIgcGVyY2VudCA9IDEwMDtcblx0dGhpcy5zaG93UGVyY2VudChwZXJjZW50KTtcblx0dGhpcy50d2VlbiA9IG51bGw7XG59XG5cbi8qKlxuICogU2hvdyBwZXJjZW50LlxuICogQG1ldGhvZCBzaG93UGVyY2VudFxuICovXG5UaW1lclZpZXcucHJvdG90eXBlLnNob3dQZXJjZW50ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0aWYgKHZhbHVlIDwgMClcblx0XHR2YWx1ZSA9IDA7XG5cblx0aWYgKHZhbHVlID4gMTAwKVxuXHRcdHZhbHVlID0gMTAwO1xuXG5cdHRoaXMuY2FudmFzLmNsZWFyKCk7XG5cblx0dGhpcy5jYW52YXMuYmVnaW5GaWxsKDB4YzAwMDAwKTtcblx0dGhpcy5jYW52YXMuZHJhd0NpcmNsZSgwLDAsMTApO1xuXHR0aGlzLmNhbnZhcy5lbmRGaWxsKCk7XG5cblx0dGhpcy5jYW52YXMuYmVnaW5GaWxsKDB4ZmZmZmZmKTtcblx0dGhpcy5jYW52YXMubW92ZVRvKDAsMCk7XG5cdGZvcih2YXIgaSA9IDA7IGkgPCAzMzsgaSsrKSB7XG5cdFx0dGhpcy5jYW52YXMubGluZVRvKFxuXHRcdFx0XHRcdFx0XHQxMCpNYXRoLmNvcyhpKnZhbHVlKjIqTWF0aC5QSS8oMzIqMTAwKSAtIE1hdGguUEkvMiksXG5cdFx0XHRcdFx0XHRcdDEwKk1hdGguc2luKGkqdmFsdWUqMipNYXRoLlBJLygzMioxMDApIC0gTWF0aC5QSS8yKVxuXHRcdFx0XHRcdFx0KTtcblx0fVxuXG5cdHRoaXMuY2FudmFzLmxpbmVUbygwLDApO1xuXHR0aGlzLmNhbnZhcy5lbmRGaWxsKCk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lclZpZXc7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuLi91dGlscy9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4uL3V0aWxzL0Z1bmN0aW9uVXRpbFwiKTtcblxudmFyIEluaXRNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvSW5pdE1lc3NhZ2VcIik7XG52YXIgU3RhdGVDb21wbGV0ZU1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9TdGF0ZUNvbXBsZXRlTWVzc2FnZVwiKTtcbnZhciBTZWF0SW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9TZWF0SW5mb01lc3NhZ2VcIik7XG52YXIgQ29tbXVuaXR5Q2FyZHNNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQ29tbXVuaXR5Q2FyZHNNZXNzYWdlXCIpO1xudmFyIFBvY2tldENhcmRzTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1BvY2tldENhcmRzTWVzc2FnZVwiKTtcbnZhciBTZWF0Q2xpY2tNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvU2VhdENsaWNrTWVzc2FnZVwiKTtcbnZhciBTaG93RGlhbG9nTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1Nob3dEaWFsb2dNZXNzYWdlXCIpO1xudmFyIEJ1dHRvbkNsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0J1dHRvbkNsaWNrTWVzc2FnZVwiKTtcbnZhciBCdXR0b25zTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0J1dHRvbnNNZXNzYWdlXCIpO1xudmFyIERlbGF5TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0RlbGF5TWVzc2FnZVwiKTtcbnZhciBDbGVhck1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9DbGVhck1lc3NhZ2VcIik7XG52YXIgRGVhbGVyQnV0dG9uTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0RlYWxlckJ1dHRvbk1lc3NhZ2VcIik7XG52YXIgQmV0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0JldE1lc3NhZ2VcIik7XG52YXIgQmV0c1RvUG90TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0JldHNUb1BvdE1lc3NhZ2VcIik7XG5cbnZhciBBY3Rpb25NZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvQWN0aW9uTWVzc2FnZVwiKTtcbnZhciBDaGF0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0NoYXRNZXNzYWdlXCIpO1xudmFyIENoZWNrYm94TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL0NoZWNrYm94TWVzc2FnZVwiKTtcbnZhciBGYWRlVGFibGVNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvRmFkZVRhYmxlTWVzc2FnZVwiKTtcbnZhciBIYW5kSW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9IYW5kSW5mb01lc3NhZ2VcIik7XG52YXIgSW50ZXJmYWNlU3RhdGVNZXNzYWdlID0gcmVxdWlyZShcIi4vbWVzc2FnZXMvSW50ZXJmYWNlU3RhdGVNZXNzYWdlXCIpO1xudmFyIFBheU91dE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9QYXlPdXRNZXNzYWdlXCIpO1xudmFyIFBvdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Qb3RNZXNzYWdlXCIpO1xudmFyIFByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1ByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZVwiKTtcbnZhciBQcmVzZXRCdXR0b25zTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1ByZXNldEJ1dHRvbnNNZXNzYWdlXCIpO1xudmFyIFByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1ByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZVwiKTtcbnZhciBUYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlXCIpO1xudmFyIFRhYmxlQnV0dG9uc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9UYWJsZUJ1dHRvbnNNZXNzYWdlXCIpO1xudmFyIFRhYmxlSW5mb01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9UYWJsZUluZm9NZXNzYWdlXCIpO1xudmFyIFRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9UZXN0Q2FzZVJlcXVlc3RNZXNzYWdlXCIpO1xudmFyIFRpbWVyTWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RpbWVyTWVzc2FnZVwiKTtcbnZhciBUb3VybmFtZW50UmVzdWx0TWVzc2FnZSA9IHJlcXVpcmUoXCIuL21lc3NhZ2VzL1RvdXJuYW1lbnRSZXN1bHRNZXNzYWdlXCIpO1xudmFyIEZvbGRDYXJkc01lc3NhZ2UgPSByZXF1aXJlKFwiLi9tZXNzYWdlcy9Gb2xkQ2FyZHNNZXNzYWdlXCIpO1xuXG4vKipcbiAqIEEgcHJvdG9jb2wgY29ubmVjdGlvbiB3aXRoIGFuIHVuZGVybHlpbmcgY29ubmVjdGlvbi5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIHdheXMgdG8gbGl0ZW4gZm9yIGNvbm5lY3Rpb25zLCB0aGUgZmlyc3Qgb25lIGFuZCBtb3N0IHN0cmFpZ2h0XG4gKiBmb3J3YXJkIGlzIHRoZSBhZGRNZXNzYWdlSGFuZGxlciwgd2hpY2ggcmVnaXN0ZXJzIGEgbGlzdGVuZXIgZm9yIGFcbiAqIHBhcnRpY3VsYXIgbmV0d29yayBtZXNzYWdlLiBUaGUgZmlyc3QgYXJndW1lbnQgc2hvdWxkIGJlIHRoZSBtZXNzYWdlXG4gKiBjbGFzcyB0byBsaXN0ZW4gZm9yOlxuICpcbiAqICAgICBmdW5jdGlvbiBvblNlYXRJbmZvTWVzc2FnZShtKSB7XG4gKiAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzZWF0IGlzIGFjdGl2ZS5cbiAqICAgICAgICAgbS5pc0FjdGl2ZSgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgcHJvdG9Db25uZWN0aW9uLmFkZE1lc3NhZ2VIYW5kbGVyKFNlYXRJbmZvTWVzc2FnZSwgb25TZWF0SW5mb01lc3NhZ2UpO1xuICpcbiAqIFRoZSBzZWNvbmQgbWV0aG9kIGlzIHRvIGxpc3RlbiB0byB0aGUgUHJvdG9Db25uZWN0aW9uLk1FU1NBR0UgZGlzcGF0Y2hlZFxuICogYnkgdGhlIGluc3RhbmNlIG9mIHRoZSBQcm90b0Nvbm5lY3Rpb24uIEluIHRoaXMgY2FzZSwgdGhlIGxpc3RlbmVyXG4gKiB3aWxsIGJlIGNhbGxlZCBmb3IgYWxsIG1lc3NhZ2VzIHJlY2VpdmVkIG9uIHRoZSBjb25uZWN0aW9uLlxuICpcbiAqICAgICBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuICogICAgICAgICB2YXIgbWVzc2FnZT1lLm1lc3NhZ2U7XG4gKlxuICogICAgICAgICAvLyBJcyBpdCBhIFNlYXRJbmZvTWVzc2FnZT9cbiAqICAgICAgICAgaWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBTZWF0SW5mb01lc3NhZ2UpIHtcbiAqICAgICAgICAgICAgIC8vIC4uLlxuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90b0Nvbm5lY3Rpb24uYWRkTWVzc2FnZUhhbmRsZXIoU2VhdEluZm9NZXNzYWdlLCBvbk1lc3NhZ2UpO1xuICpcbiAqIFRoZSB1bmRlcmx5aW5nIGNvbm5lY3Rpb24gc2hvdWxkIGJlIGFuIG9iamVjdCB0aGF0IGltcGxlbWVudHMgYW4gXCJpbnRlcmZhY2VcIlxuICogb2YgYSBjb25uZWN0aW9uLiBJdCBpcyBub3QgYW4gaW50ZXJmYWNlIHBlciBzZSwgc2luY2UgSmF2YVNjcmlwdCBkb2Vzbid0IHN1cHBvcnRcbiAqIGl0LiBBbnl3YXksIHRoZSBzaWduYXR1cmUgb2YgdGhpcyBpbnRlcmZhY2UsIGlzIHRoYXQgdGhlIGNvbm5lY3Rpb24gb2JqZWN0XG4gKiBzaG91bGQgaGF2ZSBhIGBzZW5kYCBtZXRob2Qgd2hpY2ggcmVjZWl2ZXMgYSBvYmplY3QgdG8gYmUgc2VuZC4gSXQgc2hvdWxkIGFsc29cbiAqIGRpc3BhdGNoIFwibWVzc2FnZVwiIGV2ZW50cyBhcyBtZXNzYWdlcyBhcmUgcmVjZWl2ZWQsIGFuZCBcImNsb3NlXCIgZXZlbnRzIGlmIHRoZVxuICogY29ubmVjdGlvbiBpcyBjbG9zZWQgYnkgdGhlIHJlbW90ZSBwYXJ0eS5cbiAqXG4gKiBAY2xhc3MgUHJvdG9Db25uZWN0aW9uXG4gKiBAZXh0ZW5kcyBFdmVudERpc3BhdGNoZXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGNvbm5lY3Rpb24gVGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFByb3RvQ29ubmVjdGlvbihjb25uZWN0aW9uKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG5cdHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG5cdHRoaXMuY29ubmVjdGlvbi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCB0aGlzLm9uQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsIHRoaXMub25Db25uZWN0aW9uQ2xvc2UsIHRoaXMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFByb3RvQ29ubmVjdGlvbiwgRXZlbnREaXNwYXRjaGVyKTtcblxuLyoqXG4gKiBUcmlnZ2VycyBpZiB0aGUgcmVtb3RlIHBhcnR5IGNsb3NlcyB0aGUgdW5kZXJseWluZyBjb25uZWN0aW9uLlxuICogQGV2ZW50IFByb3RvQ29ubmVjdGlvbi5DTE9TRVxuICovXG5Qcm90b0Nvbm5lY3Rpb24uQ0xPU0UgPSBcImNsb3NlXCI7XG5cbi8qKlxuICogVHJpZ2dlcnMgd2hlbiB3ZSByZWNlaXZlIGEgbWVzc2FnZSBmcm9tIHRoZSByZW1vdGUgcGFydHkuXG4gKiBAZXZlbnQgUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRoYXQgd2FzIHJlY2VpdmVkLlxuICovXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRSA9IFwibWVzc2FnZVwiO1xuXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFUyA9IHt9O1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbSW5pdE1lc3NhZ2UuVFlQRV0gPSBJbml0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1N0YXRlQ29tcGxldGVNZXNzYWdlLlRZUEVdID0gU3RhdGVDb21wbGV0ZU1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTZWF0SW5mb01lc3NhZ2UuVFlQRV0gPSBTZWF0SW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDb21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRV0gPSBDb21tdW5pdHlDYXJkc01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQb2NrZXRDYXJkc01lc3NhZ2UuVFlQRV0gPSBQb2NrZXRDYXJkc01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tTZWF0Q2xpY2tNZXNzYWdlLlRZUEVdID0gU2VhdENsaWNrTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1Nob3dEaWFsb2dNZXNzYWdlLlRZUEVdID0gU2hvd0RpYWxvZ01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCdXR0b25zTWVzc2FnZS5UWVBFXSA9IEJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRGVsYXlNZXNzYWdlLlRZUEVdID0gRGVsYXlNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbQ2xlYXJNZXNzYWdlLlRZUEVdID0gQ2xlYXJNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbRGVhbGVyQnV0dG9uTWVzc2FnZS5UWVBFXSA9IERlYWxlckJ1dHRvbk1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tCZXRNZXNzYWdlLlRZUEVdID0gQmV0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0JldHNUb1BvdE1lc3NhZ2UuVFlQRV0gPSBCZXRzVG9Qb3RNZXNzYWdlO1xuXG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tBY3Rpb25NZXNzYWdlLlRZUEVdID0gQWN0aW9uTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0NoYXRNZXNzYWdlLlRZUEVdID0gQ2hhdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tDaGVja2JveE1lc3NhZ2UuVFlQRV0gPSBDaGVja2JveE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tGYWRlVGFibGVNZXNzYWdlLlRZUEVdID0gRmFkZVRhYmxlTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0hhbmRJbmZvTWVzc2FnZS5UWVBFXSA9IEhhbmRJbmZvTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW0ludGVyZmFjZVN0YXRlTWVzc2FnZS5UWVBFXSA9IEludGVyZmFjZVN0YXRlTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1BheU91dE1lc3NhZ2UuVFlQRV0gPSBQYXlPdXRNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUG90TWVzc2FnZS5UWVBFXSA9IFBvdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQcmVzZXRCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tQcmVzZXRCdXR0b25zTWVzc2FnZS5UWVBFXSA9IFByZXNldEJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLlRZUEVdID0gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGFibGVCdXR0b25DbGlja01lc3NhZ2UuVFlQRV0gPSBUYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RhYmxlQnV0dG9uc01lc3NhZ2UuVFlQRV0gPSBUYWJsZUJ1dHRvbnNNZXNzYWdlO1xuUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVNbVGFibGVJbmZvTWVzc2FnZS5UWVBFXSA9IFRhYmxlSW5mb01lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlLlRZUEVdID0gVGVzdENhc2VSZXF1ZXN0TWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RpbWVyTWVzc2FnZS5UWVBFXSA9IFRpbWVyTWVzc2FnZTtcblByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW1RvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLlRZUEVdID0gVG91cm5hbWVudFJlc3VsdE1lc3NhZ2U7XG5Qcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1tGb2xkQ2FyZHNNZXNzYWdlLlRZUEVdID0gRm9sZENhcmRzTWVzc2FnZTtcblxuLyoqXG4gKiBBZGQgbWVzc2FnZSBoYW5kbGVyLlxuICogQG1ldGhvZCBhZGRNZXNzYWdlSGFuZGxlclxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLmFkZE1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKSB7XG5cdGlmIChtZXNzYWdlVHlwZS5oYXNPd25Qcm9wZXJ0eShcIlRZUEVcIikpXG5cdFx0bWVzc2FnZVR5cGUgPSBtZXNzYWdlVHlwZS5UWVBFO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIub24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgbWVzc2FnZSBoYW5kbGVyLlxuICogQG1ldGhvZCByZW1vdmVNZXNzYWdlSGFuZGxlclxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZU1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZVR5cGUsIGhhbmRsZXIsIHNjb3BlKSB7XG5cdGlmIChtZXNzYWdlVHlwZS5oYXNPd25Qcm9wZXJ0eShcIlRZUEVcIikpXG5cdFx0bWVzc2FnZVR5cGUgPSBtZXNzYWdlVHlwZS5UWVBFO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIub2ZmKG1lc3NhZ2VUeXBlLCBoYW5kbGVyLCBzY29wZSk7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBtZXNzYWdlLlxuICogQG1ldGhvZCBvbkNvbm5lY3Rpb25NZXNzYWdlXG4gKiBAcHJpdmF0ZVxuICovXG5Qcm90b0Nvbm5lY3Rpb24ucHJvdG90eXBlLm9uQ29ubmVjdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbihldikge1xuXHR2YXIgbWVzc2FnZSA9IGV2Lm1lc3NhZ2U7XG5cdHZhciBjb25zdHJ1Y3RvcjtcblxuXHRjb25zb2xlLmxvZyhcImluY29taW5nIGNvbm5lY3Rpb24gbWVzc2FnZTogXCIgKyBtZXNzYWdlLnR5cGUpO1xuXHRjb25zb2xlLmxvZyhtZXNzYWdlKTtcblxuXHRmb3IgKHR5cGUgaW4gUHJvdG9Db25uZWN0aW9uLk1FU1NBR0VfVFlQRVMpIHtcblx0XHRpZiAobWVzc2FnZS50eXBlID09IHR5cGUpXG5cdFx0XHRjb25zdHJ1Y3RvciA9IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTW3R5cGVdXG5cdH1cblxuXHRpZiAoIWNvbnN0cnVjdG9yKSB7XG5cdFx0Y29uc29sZS53YXJuKFwidW5rbm93biBtZXNzYWdlOiBcIiArIG1lc3NhZ2UudHlwZSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIG8gPSBuZXcgY29uc3RydWN0b3IoKTtcblx0by51bnNlcmlhbGl6ZShtZXNzYWdlKTtcblx0by50eXBlID0gbWVzc2FnZS50eXBlO1xuXG5cdHRoaXMubWVzc2FnZURpc3BhdGNoZXIudHJpZ2dlcihvKTtcblxuXHR0aGlzLnRyaWdnZXIoe1xuXHRcdHR5cGU6IFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFLFxuXHRcdG1lc3NhZ2U6IG9cblx0fSk7XG59XG5cbi8qKlxuICogQ29ubmVjdGlvbiBjbG9zZS5cbiAqIEBtZXRob2Qgb25Db25uZWN0aW9uQ2xvc2VcbiAqIEBwcml2YXRlXG4gKi9cblByb3RvQ29ubmVjdGlvbi5wcm90b3R5cGUub25Db25uZWN0aW9uQ2xvc2UgPSBmdW5jdGlvbihldikge1xuXHR0aGlzLmNvbm5lY3Rpb24ub2ZmKFwibWVzc2FnZVwiLCB0aGlzLm9uQ29ubmVjdGlvbk1lc3NhZ2UsIHRoaXMpO1xuXHR0aGlzLmNvbm5lY3Rpb24ub2ZmKFwiY2xvc2VcIiwgdGhpcy5vbkNvbm5lY3Rpb25DbG9zZSwgdGhpcyk7XG5cdHRoaXMuY29ubmVjdGlvbiA9IG51bGw7XG5cblx0dGhpcy50cmlnZ2VyKFByb3RvQ29ubmVjdGlvbi5DTE9TRSk7XG59XG5cbi8qKlxuICogU2VuZCBhIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlbmRcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuXHR2YXIgc2VyaWFsaXplZCA9IG1lc3NhZ2Uuc2VyaWFsaXplKCk7XG5cblx0Zm9yICh0eXBlIGluIFByb3RvQ29ubmVjdGlvbi5NRVNTQUdFX1RZUEVTKSB7XG5cdFx0aWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBQcm90b0Nvbm5lY3Rpb24uTUVTU0FHRV9UWVBFU1t0eXBlXSlcblx0XHRcdHNlcmlhbGl6ZWQudHlwZSA9IHR5cGU7XG5cdH1cblxuXHRpZiAoIXNlcmlhbGl6ZWQudHlwZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIG1lc3NhZ2UgdHlwZSBmb3Igc2VuZCwgbWVzc2FnZT1cIiArIG1lc3NhZ2UuY29uc3RydWN0b3IubmFtZSk7XG5cblx0Ly9cdGNvbnNvbGUubG9nKFwic2VuZGluZzogXCIrc2VyaWFsaXplZCk7XG5cblx0dGhpcy5jb25uZWN0aW9uLnNlbmQoc2VyaWFsaXplZCk7XG59XG5cbi8qKlxuICogQ2xvc2UgdGhlIHVuZGVybHlpbmcgY29ubmVjdGlvbi5cbiAqIEBtZXRob2QgY2xvc2VcbiAqL1xuUHJvdG9Db25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNvbm5lY3Rpb24uY2xvc2UoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcm90b0Nvbm5lY3Rpb247IiwiLyoqXG4gKiBCdXR0b24gZGF0YS5cbiAqIEBjbGFzcyBCdXR0b25EYXRhXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbkRhdGEoYnV0dG9uLCB2YWx1ZSkge1xuXHR0aGlzLmJ1dHRvbiA9IGJ1dHRvbjtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHQvKlx0dGhpcy5taW4gPSAtMTtcblx0dGhpcy5tYXggPSAtMTsqL1xufVxuXG5CdXR0b25EYXRhLlJBSVNFID0gXCJyYWlzZVwiO1xuQnV0dG9uRGF0YS5GT0xEID0gXCJmb2xkXCI7XG5CdXR0b25EYXRhLkJFVCA9IFwiYmV0XCI7XG5CdXR0b25EYXRhLlNJVF9PVVQgPSBcInNpdE91dFwiO1xuQnV0dG9uRGF0YS5TSVRfSU4gPSBcInNpdEluXCI7XG5CdXR0b25EYXRhLkNBTEwgPSBcImNhbGxcIjtcbkJ1dHRvbkRhdGEuUE9TVF9CQiA9IFwicG9zdEJCXCI7XG5CdXR0b25EYXRhLlBPU1RfU0IgPSBcInBvc3RTQlwiO1xuQnV0dG9uRGF0YS5DQU5DRUwgPSBcImNhbmNlbFwiO1xuQnV0dG9uRGF0YS5DSEVDSyA9IFwiY2hlY2tcIjtcbkJ1dHRvbkRhdGEuU0hPVyA9IFwic2hvd1wiO1xuQnV0dG9uRGF0YS5NVUNLID0gXCJtdWNrXCI7XG5CdXR0b25EYXRhLk9LID0gXCJva1wiO1xuQnV0dG9uRGF0YS5JTV9CQUNLID0gXCJpbUJhY2tcIjtcbkJ1dHRvbkRhdGEuTEVBVkUgPSBcImxlYXZlXCI7XG5CdXR0b25EYXRhLkNIRUNLX0ZPTEQgPSBcImNoZWNrRm9sZFwiO1xuQnV0dG9uRGF0YS5DQUxMX0FOWSA9IFwiY2FsbEFueVwiO1xuQnV0dG9uRGF0YS5SQUlTRV9BTlkgPSBcInJhaXNlQW55XCI7XG5CdXR0b25EYXRhLkJVWV9JTiA9IFwiYnV5SW5cIjtcbkJ1dHRvbkRhdGEuUkVfQlVZID0gXCJyZUJ1eVwiO1xuQnV0dG9uRGF0YS5KT0lOX1RPVVJOQU1FTlQgPSBcImpvaW5Ub3VybmFtZW50XCI7XG5CdXR0b25EYXRhLkxFQVZFX1RPVVJOQU1FTlQgPSBcImxlYXZlVG91cm5hbWVudFwiO1xuXG4vKipcbiAqIEdldCBidXR0b24uXG4gKiBAbWV0aG9kIGdldEJ1dHRvblxuICovXG5CdXR0b25EYXRhLnByb3RvdHlwZS5nZXRCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uO1xufVxuXG4vKipcbiAqIEdldCBidXR0b24gc3RyaW5nIGZvciB0aGlzIGJ1dHRvbi5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uU3RyaW5nXG4gKi9cbkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldEJ1dHRvblN0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gQnV0dG9uRGF0YS5nZXRCdXR0b25TdHJpbmdGb3JJZCh0aGlzLmJ1dHRvbik7XG59XG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5CdXR0b25EYXRhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBHZXQgYnV0dG9uIHN0cmluZyBmb3IgaWQuXG4gKiBAbWV0aG9kIGdldEJ1dHRvblN0cmluZ0ZvcklkXG4gKiBAc3RhdGljXG4gKi9cbkJ1dHRvbkRhdGEuZ2V0QnV0dG9uU3RyaW5nRm9ySWQgPSBmdW5jdGlvbihiKSB7XG5cdHN3aXRjaCAoYikge1xuXHRcdGNhc2UgQnV0dG9uRGF0YS5GT0xEOlxuXHRcdFx0cmV0dXJuIFwiRk9MRFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNBTEw6XG5cdFx0XHRyZXR1cm4gXCJDQUxMXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUkFJU0U6XG5cdFx0XHRyZXR1cm4gXCJSQUlTRSBUT1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkJFVDpcblx0XHRcdHJldHVybiBcIkJFVFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlNJVF9PVVQ6XG5cdFx0XHRyZXR1cm4gXCJTSVQgT1VUXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuUE9TVF9CQjpcblx0XHRcdHJldHVybiBcIlBPU1QgQkJcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5QT1NUX1NCOlxuXHRcdFx0cmV0dXJuIFwiUE9TVCBTQlwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlNJVF9JTjpcblx0XHRcdHJldHVybiBcIlNJVCBJTlwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNBTkNFTDpcblx0XHRcdHJldHVybiBcIkNBTkNFTFwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkNIRUNLOlxuXHRcdFx0cmV0dXJuIFwiQ0hFQ0tcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5TSE9XOlxuXHRcdFx0cmV0dXJuIFwiU0hPV1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLk1VQ0s6XG5cdFx0XHRyZXR1cm4gXCJNVUNLXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuT0s6XG5cdFx0XHRyZXR1cm4gXCJPS1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLklNX0JBQ0s6XG5cdFx0XHRyZXR1cm4gXCJJJ00gQkFDS1wiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkxFQVZFOlxuXHRcdFx0cmV0dXJuIFwiTEVBVkVcIjtcblxuXHRcdGNhc2UgQnV0dG9uRGF0YS5DSEVDS19GT0xEOlxuXHRcdFx0cmV0dXJuIFwiQ0hFQ0sgLyBGT0xEXCI7XG5cblx0XHRjYXNlIEJ1dHRvbkRhdGEuQ0FMTF9BTlk6XG5cdFx0XHRyZXR1cm4gXCJDQUxMIEFOWVwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlJBSVNFX0FOWTpcblx0XHRcdHJldHVybiBcIlJBSVNFIEFOWVwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLlJFX0JVWTpcblx0XHRcdHJldHVybiBcIlJFLUJVWVwiO1xuXG5cdFx0Y2FzZSBCdXR0b25EYXRhLkJVWV9JTjpcblx0XHRcdHJldHVybiBcIkJVWSBJTlwiO1xuXHR9XG5cblx0cmV0dXJuIFwiXCI7XG59XG5cbi8qQnV0dG9uRGF0YS5wcm90b3R5cGUuZ2V0TWluID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1pbjtcbn0qL1xuXG4vKkJ1dHRvbkRhdGEucHJvdG90eXBlLmdldE1heCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXg7XG59Ki9cblxuQnV0dG9uRGF0YS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIFwiPEJ1dHRvbkRhdGEgYnV0dG9uPVwiICsgdGhpcy5idXR0b24gKyBcIj5cIjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b25EYXRhOyIsIi8qKlxuICogQ2FyZCBkYXRhLlxuICogQGNsYXNzIENhcmREYXRhXG4gKi9cbmZ1bmN0aW9uIENhcmREYXRhKHZhbHVlKSB7XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTID1cblx0W1wiMlwiLCBcIjNcIiwgXCI0XCIsIFwiNVwiLCBcIjZcIiwgXCI3XCIsIFwiOFwiLCBcIjlcIiwgXCIxMFwiLCBcIkpcIiwgXCJRXCIsIFwiS1wiLCBcIkFcIl07XG5cbkNhcmREYXRhLlNVSVRfU1RSSU5HUyA9XG5cdFtcIkRcIiwgXCJDXCIsIFwiSFwiLCBcIlNcIl07XG5cbkNhcmREYXRhLkhJRERFTiA9IC0xO1xuXG4vKipcbiAqIERvZXMgdGhpcyBDYXJkRGF0YSByZXByZXNlbnQgYSBzaG93IGNhcmQ/XG4gKiBJZiBub3QgaXQgc2hvdWxkIGJlIHJlbmRlcmVkIHdpdGggaXRzIGJhY2tzaWRlLlxuICogQG1ldGhvZCBpc1Nob3duXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5pc1Nob3duID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnZhbHVlID49IDA7XG59XG5cbi8qKlxuICogR2V0IGNhcmQgdmFsdWUgc3RyaW5nLlxuICogQG1ldGhvZCBnZXRDYXJkVmFsdWVTdHJpbmdcbiAqL1xuQ2FyZERhdGEucHJvdG90eXBlLmdldENhcmRWYWx1ZVN0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gQ2FyZERhdGEuQ0FSRF9WQUxVRV9TVFJJTkdTW3RoaXMudmFsdWUgJSAxM107XG59XG5cbi8qKlxuICogR2V0IHN1aXQgaW5kZXguXG4gKiBAbWV0aG9kIGdldFN1aXRJbmRleFxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0U3VpdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBNYXRoLmZsb29yKHRoaXMudmFsdWUgLyAxMyk7XG59XG5cbi8qKlxuICogR2V0IHN1aXQgc3RyaW5nLlxuICogQG1ldGhvZCBnZXRTdWl0U3RyaW5nXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5nZXRTdWl0U3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBDYXJkRGF0YS5TVUlUX1NUUklOR1NbdGhpcy5nZXRTdWl0SW5kZXgoKV07XG59XG5cbi8qKlxuICogR2V0IGNvbG9yLlxuICogQG1ldGhvZCBnZXRDb2xvclxuICovXG5DYXJkRGF0YS5wcm90b3R5cGUuZ2V0Q29sb3IgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMuZ2V0U3VpdEluZGV4KCkgJSAyICE9IDApXG5cdFx0cmV0dXJuIFwiIzAwMDAwMFwiO1xuXG5cdGVsc2Vcblx0XHRyZXR1cm4gXCIjZmYwMDAwXCI7XG59XG5cbi8qKlxuICogVG8gc3RyaW5nLlxuICogQG1ldGhvZCB0b1N0cmluZ1xuICovXG5DYXJkRGF0YS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0aWYgKHRoaXMudmFsdWUgPCAwKVxuXHRcdHJldHVybiBcIlhYXCI7XG5cblx0cmV0dXJuIHRoaXMuZ2V0Q2FyZFZhbHVlU3RyaW5nKCkgKyB0aGlzLmdldFN1aXRTdHJpbmcoKTtcbn1cblxuLyoqXG4gKiBHZXQgdmFsdWUgb2YgdGhlIGNhcmQuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkNhcmREYXRhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkRGF0YTsiLCIvKipcbiAqIEJ1dHRvbiBkYXRhLlxuICogQGNsYXNzIEJ1dHRvbkRhdGFcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uRGF0YShidXR0b24sIHZhbHVlKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbi8qKlxuICogR2V0IGJ1dHRvbi5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cblByZXNldEJ1dHRvbkRhdGEucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b247XG59XG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5QcmVzZXRCdXR0b25EYXRhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdXR0b25EYXRhOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgbWFkZSBhbiBhY3Rpb24uXG4gKiBAY2xhc3MgQWN0aW9uTWVzc2FnZVxuICovXG5mdW5jdGlvbiBBY3Rpb25NZXNzYWdlKHNlYXRJbmRleCwgYWN0aW9uKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFjdGlvbiA9IGFjdGlvbjtcbn1cblxuQWN0aW9uTWVzc2FnZS5UWVBFID0gXCJhY3Rpb25cIjtcblxuQWN0aW9uTWVzc2FnZS5GT0xEID0gXCJmb2xkXCI7XG5BY3Rpb25NZXNzYWdlLkNBTEwgPSBcImNhbGxcIjtcbkFjdGlvbk1lc3NhZ2UuUkFJU0UgPSBcInJhaXNlXCI7XG5BY3Rpb25NZXNzYWdlLkNIRUNLID0gXCJjaGVja1wiO1xuQWN0aW9uTWVzc2FnZS5CRVQgPSBcImJldFwiO1xuQWN0aW9uTWVzc2FnZS5NVUNLID0gXCJtdWNrXCI7XG5BY3Rpb25NZXNzYWdlLkFOVEUgPSBcImFudGVcIjtcblxuLyoqXG4gKiBTZWF0IGluZGV4LlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldEFjdGlvblxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS5nZXRBY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYWN0aW9uO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQWN0aW9uTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cdHRoaXMuYWN0aW9uID0gZGF0YS5hY3Rpb247XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5BY3Rpb25NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdGFjdGlvbjogdGhpcy5hY3Rpb25cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBY3Rpb25NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgaGFzIHBsYWNlZCBhIGJldC5cbiAqIEBjbGFzcyBCZXRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJldE1lc3NhZ2Uoc2VhdEluZGV4LCB2YWx1ZSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcblx0dGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5CZXRNZXNzYWdlLlRZUEUgPSBcImJldFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5CZXRNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJldE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNlYXRJbmRleDogdGhpcy5zZWF0SW5kZXgsXG5cdFx0dmFsdWU6IHRoaXMudmFsdWVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCZXRNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBiZXRzIHNob3VsZCBiZSBwbGFjZWQgaW4gcG90LlxuICogQGNsYXNzIEJldHNUb1BvdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQmV0c1RvUG90TWVzc2FnZSgpIHtcbn1cblxuQmV0c1RvUG90TWVzc2FnZS5UWVBFID0gXCJiZXRzVG9Qb3RcIjtcblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkJldHNUb1BvdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQmV0c1RvUG90TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCZXRzVG9Qb3RNZXNzYWdlOyIsIi8qKlxuICogU2VudCB3aGVuIHRoZSB1c2VyIGNsaWNrcyBhIGJ1dHRvbiwgZWl0aGVyIGluIGEgZGlhbG9nIG9yXG4gKiBmb3IgYSBnYW1lIGFjdGlvbi5cbiAqIEBjbGFzcyBCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQnV0dG9uQ2xpY2tNZXNzYWdlKGJ1dHRvbiwgdmFsdWUpIHtcblx0dGhpcy5idXR0b24gPSBidXR0b247XG5cdHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuXHRjb25zb2xlLmxvZyhcIkNyZWF0aW5nIGJ1dHRvbiBjbGljayBtZXNzYWdlLCB2YWx1ZT1cIiArIHZhbHVlKTtcbn1cblxuQnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEUgPSBcImJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogVGhlIHRoZSBidXR0b24gdGhhdCB3YXMgcHJlc3NlZC5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5CdXR0b25DbGlja01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbiA9IGRhdGEuYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gZGF0YS52YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0YnV0dG9uOiB0aGlzLmJ1dHRvbixcblx0XHR2YWx1ZTogdGhpcy52YWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbkNsaWNrTWVzc2FnZTsiLCJ2YXIgQnV0dG9uRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhL0J1dHRvbkRhdGFcIik7XG5cbi8qKlxuICogTWVzc2FnZSBzZW50IHdoZW4gdGhlIGNsaWVudCBzaG91bGQgc2hvdyBnYW1lIGFjdGlvbiBidXR0b25zLFxuICogRk9MRCwgUkFJU0UgZXRjLlxuICogQGNsYXNzIEJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbnNNZXNzYWdlKCkge1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcbn1cblxuQnV0dG9uc01lc3NhZ2UuVFlQRSA9IFwiYnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldCBhbiBhcnJheSBvZiBCdXR0b25EYXRhIGluZGljYXRpbmcgd2hpY2ggYnV0dG9ucyB0byBzaG93LlxuICogQG1ldGhvZCBnZXRCdXR0b25zXG4gKi9cbkJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmJ1dHRvbnM7XG59XG5cbi8qKlxuICogQWRkIGEgYnV0dG9uIHRvIGJlIHNlbnQuXG4gKiBAbWV0aG9kIGFkZEJ1dHRvblxuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuYWRkQnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBidXR0b24gPSBkYXRhLmJ1dHRvbnNbaV07XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSBuZXcgQnV0dG9uRGF0YShidXR0b24uYnV0dG9uLCBidXR0b24udmFsdWUpO1xuXHRcdHRoaXMuYWRkQnV0dG9uKGJ1dHRvbkRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5CdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHZhciBidXR0b25zID0gW107XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgYnV0dG9uID0ge307XG5cdFx0YnV0dG9uLmJ1dHRvbiA9IHRoaXMuYnV0dG9uc1tpXS5nZXRCdXR0b24oKTtcblx0XHRidXR0b24udmFsdWUgPSB0aGlzLmJ1dHRvbnNbaV0uZ2V0VmFsdWUoKTtcblx0XHRidXR0b25zLnB1c2goYnV0dG9uKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0YnV0dG9uczogYnV0dG9uc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBzb21ldGhpbmcgaGFzIG9jY3VycmVkIGluIHRoZSBjaGF0LlxuICogQGNsYXNzIENoYXRNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIENoYXRNZXNzYWdlKHVzZXIsIHRleHQpIHtcblx0dGhpcy51c2VyID0gdXNlcjtcblx0dGhpcy50ZXh0ID0gdGV4dDtcbn1cblxuQ2hhdE1lc3NhZ2UuVFlQRSA9IFwiY2hhdFwiO1xuXG4vKipcbiAqIEdldCB0ZXh0LlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0IHVzZXIuXG4gKiBAbWV0aG9kIGdldFVzZXJcbiAqL1xuQ2hhdE1lc3NhZ2UucHJvdG90eXBlLmdldFVzZXIgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudXNlcjtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkNoYXRNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXHR0aGlzLnVzZXIgPSBkYXRhLnVzZXI7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5DaGF0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGV4dDogdGhpcy50ZXh0LFxuXHRcdHVzZXI6IHRoaXMudXNlclxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRNZXNzYWdlOyIsIi8qKlxuICogU2VudCB3aGVuIHBsYXllciBoYXMgY2hlY2tlZCBhIGNoZWNrYm94LlxuICogQGNsYXNzIENoZWNrYm94TWVzc2FnZVxuICovXG5mdW5jdGlvbiBDaGVja2JveE1lc3NhZ2UoaWQsIGNoZWNrZWQpIHtcblx0dGhpcy5pZCA9IGlkO1xuXHR0aGlzLmNoZWNrZWQgPSBjaGVja2VkO1xufVxuXG5DaGVja2JveE1lc3NhZ2UuVFlQRSA9IFwiY2hlY2tib3hcIjtcblxuQ2hlY2tib3hNZXNzYWdlLkFVVE9fUE9TVF9CTElORFMgPSBcImF1dG9Qb3N0QmxpbmRzXCI7XG5DaGVja2JveE1lc3NhZ2UuQVVUT19NVUNLX0xPU0lORyA9IFwiYXV0b011Y2tMb3NpbmdcIjtcbkNoZWNrYm94TWVzc2FnZS5TSVRPVVRfTkVYVCA9IFwic2l0b3V0TmV4dFwiO1xuXG4vKipcbiAqIElkIG9mIGNoZWNrYm94LlxuICogQG1ldGhvZCBnZXRJZFxuICovXG5DaGVja2JveE1lc3NhZ2UucHJvdG90eXBlLmdldElkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVja2VkO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuQ2hlY2tib3hNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5pZCA9IGRhdGEuaWQ7XG5cdHRoaXMuY2hlY2tlZCA9IGRhdGEuY2hlY2tlZDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNoZWNrYm94TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0aWQ6IHRoaXMuaWQsXG5cdFx0Y2hlY2tlZDogdGhpcy5jaGVja2VkXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3hNZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIENsZWFyTWVzc2FnZVxuICovXG5mdW5jdGlvbiBDbGVhck1lc3NhZ2UoY29tcG9uZW50cykge1xuXHRpZiAoIWNvbXBvbmVudHMpXG5cdFx0Y29tcG9uZW50cyA9IFtdO1xuXG5cdHRoaXMuY29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG59XG5cbkNsZWFyTWVzc2FnZS5UWVBFID0gXCJjbGVhclwiO1xuXG5DbGVhck1lc3NhZ2UuQ0FSRFMgPSBcImNhcmRzXCI7XG5DbGVhck1lc3NhZ2UuQkVUUyA9IFwiYmV0c1wiO1xuQ2xlYXJNZXNzYWdlLlBPVCA9IFwicG90XCI7XG5DbGVhck1lc3NhZ2UuQ0hBVCA9IFwiY2hhdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q29tcG9uZW50c1xuICovXG5DbGVhck1lc3NhZ2UucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY29tcG9uZW50cztcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkNsZWFyTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuY29tcG9uZW50cyA9IGRhdGEuY29tcG9uZW50cztcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkNsZWFyTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0Y29tcG9uZW50czogdGhpcy5jb21wb25lbnRzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xlYXJNZXNzYWdlOyIsInZhciBDYXJkRGF0YT1yZXF1aXJlKFwiLi4vZGF0YS9DYXJkRGF0YVwiKTtcblxuLyoqXG4gKiBTaG93IGNvbW11bml0eSBjYXJkcy5cbiAqIEBjbGFzcyBDb21tdW5pdHlDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gQ29tbXVuaXR5Q2FyZHNNZXNzYWdlKCkge1xuXHR0aGlzLmFuaW1hdGUgPSBmYWxzZTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLmZpcnN0SW5kZXggPSAwO1xufVxuXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UuVFlQRSA9IFwiY29tbXVuaXR5Q2FyZHNcIjtcblxuLyoqXG4gKiBHZXQgY2FyZCBkYXRhLlxuICogQG1ldGhvZCBnZXRDYXJkc1xuICovXG5Db21tdW5pdHlDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldENhcmRzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNhcmRzO1xufVxuXG4vKipcbiAqIEdldCB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGNhcmQgdG8gYmUgc2hvd24gaW4gdGhlIHNlcXVlbmNlLlxuICogQG1ldGhvZCBnZXRGaXJzdEluZGV4XG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Rmlyc3RJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5maXJzdEluZGV4O1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cbkNvbW11bml0eUNhcmRzTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHZhciBpO1xuXG5cdHRoaXMuYW5pbWF0ZSA9IGRhdGEuYW5pbWF0ZTtcblx0dGhpcy5maXJzdEluZGV4ID0gcGFyc2VJbnQoZGF0YS5maXJzdEluZGV4KTtcblx0dGhpcy5jYXJkcz1bXTtcblxuXHRmb3IgKGk9MDsgaTxkYXRhLmNhcmRzLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuY2FyZHMucHVzaChuZXcgQ2FyZERhdGEoZGF0YS5jYXJkc1tpXSkpO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuQ29tbXVuaXR5Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNhcmRzPVtdO1xuXG5cdGZvciAoaT0wOyBpPHRoaXMuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0Y2FyZHMucHVzaCh0aGlzLmNhcmRzW2ldLmdldFZhbHVlKCkpO1xuXG5cdHJldHVybiB7XG5cdFx0YW5pbWF0ZTogdGhpcy5zZWF0SW5kZXgsXG5cdFx0Zmlyc3RJbmRleDogdGhpcy5maXJzdEluZGV4LFxuXHRcdGNhcmRzOiBjYXJkc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbW11bml0eUNhcmRzTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBEZWFsZXJCdXR0b25NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlYWxlckJ1dHRvbk1lc3NhZ2Uoc2VhdEluZGV4LCBhbmltYXRlKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBhbmltYXRlO1xufVxuXG5EZWFsZXJCdXR0b25NZXNzYWdlLlRZUEUgPSBcImRlYWxlckJ1dHRvblwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRBbmltYXRlXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLmdldEFuaW1hdGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYW5pbWF0ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlYWxlckJ1dHRvbk1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLmFuaW1hdGUgPSBkYXRhLmFuaW1hdGU7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5EZWFsZXJCdXR0b25NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdGFuaW1hdGU6IHRoaXMuYW5pbWF0ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlYWxlckJ1dHRvbk1lc3NhZ2U7IiwiLyoqXG4gKiBAY2xhc3MgRGVsYXlNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIERlbGF5TWVzc2FnZShkZWxheSkge1xuXHR0aGlzLmRlbGF5ID0gZGVsYXk7XG59XG5cbkRlbGF5TWVzc2FnZS5UWVBFID0gXCJkZWxheVwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RGVsYXlcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5nZXREZWxheSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZWxheTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkRlbGF5TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuZGVsYXkgPSBkYXRhLmRlbGF5O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRGVsYXlNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRkZWxheTogdGhpcy5kZWxheVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGF5TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHRhYmxlIHNob3VsZCBmYWRlLlxuICogQGNsYXNzIEZhZGVUYWJsZU1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRmFkZVRhYmxlTWVzc2FnZSh2aXNpYmxlLCBkaXJlY3Rpb24pIHtcblx0dGhpcy52aXNpYmxlID0gdmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG59XG5cbkZhZGVUYWJsZU1lc3NhZ2UuVFlQRSA9IFwiZmFkZVRhYmxlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlzaWJsZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldERpcmVjdGlvblxuICovXG5GYWRlVGFibGVNZXNzYWdlLnByb3RvdHlwZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuZGlyZWN0aW9uO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuRmFkZVRhYmxlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZSA9IGRhdGEudmlzaWJsZTtcblx0dGhpcy5kaXJlY3Rpb24gPSBkYXRhLmRpcmVjdGlvbjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkZhZGVUYWJsZU1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpc2libGU6IHRoaXMudmlzaWJsZSxcblx0XHRkaXJlY3Rpb246IHRoaXMuZGlyZWN0aW9uXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmFkZVRhYmxlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHBsYXllciBoYXMgZm9sZGVkLlxuICogQGNsYXNzIEZvbGRDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gRm9sZENhcmRzTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5zZWF0SW5kZXggPSBzZWF0SW5kZXg7XG59XG5cbkZvbGRDYXJkc01lc3NhZ2UuVFlQRSA9IFwiZm9sZENhcmRzXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0U2VhdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkZvbGRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuRm9sZENhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvbGRDYXJkc01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgSGFuZEluZm9NZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIEhhbmRJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG59XG5cbkhhbmRJbmZvTWVzc2FnZS5UWVBFID0gXCJoYW5kSW5mb1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cbkhhbmRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDb3VudGRvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy50ZXh0ID0gZGF0YS50ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGRhdGEuY291bnRkb3duO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSGFuZEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0Y291bnRkb3duOiB0aGlzLmNvdW50ZG93blxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRJbmZvTWVzc2FnZTsiLCIvKipcbiAqIEBjbGFzcyBJbml0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbml0TWVzc2FnZSh0b2tlbikge1xuXHR0aGlzLnRva2VuID0gdG9rZW47XG5cdHRoaXMudGFibGVJZCA9IG51bGw7XG5cdHRoaXMudmlld0Nhc2UgPSBudWxsO1xufVxuXG5Jbml0TWVzc2FnZS5UWVBFID0gXCJpbml0XCI7XG5cbi8qKlxuICogZ2V0IHRva2VuLlxuICogQG1ldGhvZCBnZXRUb2tlblxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0VG9rZW4gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudG9rZW47XG59XG5cbi8qKlxuICogU2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBzZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXRUYWJsZUlkID0gZnVuY3Rpb24oaWQpIHtcblx0dGhpcy50YWJsZUlkID0gaWQ7XG59XG5cbi8qKlxuICogR2V0IHRhYmxlIGlkLlxuICogQG1ldGhvZCBnZXRUYWJsZUlkXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5nZXRUYWJsZUlkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSWQ7XG59XG5cbi8qKlxuICogU2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2Qgc2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuc2V0Vmlld0Nhc2UgPSBmdW5jdGlvbih2aWV3Q2FzZSkge1xuXHR0aGlzLnZpZXdDYXNlID0gdmlld0Nhc2U7XG59XG5cbi8qKlxuICogR2V0IHZpZXcgY2FzZS5cbiAqIEBtZXRob2QgZ2V0VGFibGVJZFxuICovXG5Jbml0TWVzc2FnZS5wcm90b3R5cGUuZ2V0Vmlld0Nhc2UgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmlld0Nhc2U7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuSW5pdE1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnRva2VuID0gZGF0YS50b2tlbjtcblx0dGhpcy50YWJsZUlkID0gZGF0YS50YWJsZUlkO1xuXHR0aGlzLnZpZXdDYXNlID0gZGF0YS52aWV3Q2FzZTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cbkluaXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0b2tlbjogdGhpcy50b2tlbixcblx0XHR0YWJsZUlkOiB0aGlzLnRhYmxlSWQsXG5cdFx0dmlld0Nhc2U6IHRoaXMudmlld0Nhc2Vcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbml0TWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gaW50ZXJmYWNlIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICogQGNsYXNzIEludGVyZmFjZVN0YXRlTWVzc2FnZVxuICovXG5mdW5jdGlvbiBJbnRlcmZhY2VTdGF0ZU1lc3NhZ2UodmlzaWJsZUJ1dHRvbnMpIHtcblx0XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSB2aXNpYmxlQnV0dG9ucyA9PSBudWxsID8gbmV3IEFycmF5KCkgOiB2aXNpYmxlQnV0dG9ucztcbn1cblxuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLlRZUEUgPSBcImludGVyZmFjZVN0YXRlXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRWaXNpYmxlQnV0dG9uc1xuICovXG5JbnRlcmZhY2VTdGF0ZU1lc3NhZ2UucHJvdG90eXBlLmdldFZpc2libGVCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNlYXRJbmRleDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cbkludGVyZmFjZVN0YXRlTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudmlzaWJsZUJ1dHRvbnMgPSBkYXRhLnZpc2libGVCdXR0b25zO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuSW50ZXJmYWNlU3RhdGVNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2aXNpYmxlQnV0dG9uczogdGhpcy52aXNpYmxlQnV0dG9uc1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyZmFjZVN0YXRlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gcGxheWVyIGhhcyBwbGFjZWQgYSBiZXQuXG4gKiBAY2xhc3MgUGF5T3V0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBQYXlPdXRNZXNzYWdlKCkge1xuXHR0aGlzLnZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbn1cblxuUGF5T3V0TWVzc2FnZS5UWVBFID0gXCJwYXlPdXRcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFZhbHVlc1xuICovXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZXMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudmFsdWVzO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuUGF5T3V0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdGZvcih2YXIgaSA9IDA7IGkgPCBkYXRhLnZhbHVlcy5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMudmFsdWVzLnB1c2goZGF0YS52YWx1ZXNbaV0pO1xuXHR9XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5QYXlPdXRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR2YWx1ZXM6IHRoaXMudmFsdWVzXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGF5T3V0TWVzc2FnZTsiLCJ2YXIgQ2FyZERhdGEgPSByZXF1aXJlKFwiLi4vZGF0YS9DYXJkRGF0YVwiKTtcblxuLyoqXG4gKiBTaG93IHBvY2tldCBjYXJkcy5cbiAqIEBjbGFzcyBQb2NrZXRDYXJkc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUG9ja2V0Q2FyZHNNZXNzYWdlKHNlYXRJbmRleCkge1xuXHR0aGlzLmFuaW1hdGUgPSBmYWxzZTtcblx0dGhpcy5jYXJkcyA9IFtdO1xuXHR0aGlzLmZpcnN0SW5kZXggPSAwO1xuXHR0aGlzLnNlYXRJbmRleCA9IHNlYXRJbmRleDtcbn1cblxuUG9ja2V0Q2FyZHNNZXNzYWdlLlRZUEUgPSBcInBvY2tldENhcmRzXCI7XG5cbi8qKlxuICogQW5pbWF0aW9uP1xuICogQG1ldGhvZCBzZXRBbmltYXRlXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuc2V0QW5pbWF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMuYW5pbWF0ZSA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBmaXJzdCBpbmRleC5cbiAqIEBtZXRob2Qgc2V0Rmlyc3RJbmRleFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNldEZpcnN0SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuXHR0aGlzLmZpcnN0SW5kZXggPSBpbmRleDtcbn1cblxuLyoqXG4gKiBHZXQgYXJyYXkgb2YgQ2FyZERhdGEuXG4gKiBAbWV0aG9kIGdldENhcmRzXG4gKi9cblBvY2tldENhcmRzTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q2FyZHMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY2FyZHM7XG59XG5cbi8qKlxuICogQWRkIGEgY2FyZC5cbiAqIEBtZXRob2QgYWRkQ2FyZFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmFkZENhcmQgPSBmdW5jdGlvbihjKSB7XG5cdHRoaXMuY2FyZHMucHVzaChjKTtcbn1cblxuLyoqXG4gKiBHZXQgZmlyc3QgaW5kZXguXG4gKiBAbWV0aG9kIGdldEZpcnN0SW5kZXhcbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS5nZXRGaXJzdEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmZpcnN0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0IHNlYXQgaW5kZXguXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuUG9ja2V0Q2FyZHNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dmFyIGk7XG5cblx0dGhpcy5hbmltYXRlID0gZGF0YS5hbmltYXRlO1xuXHR0aGlzLmZpcnN0SW5kZXggPSBwYXJzZUludChkYXRhLmZpcnN0SW5kZXgpO1xuXHR0aGlzLmNhcmRzID0gW107XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG5cblx0Zm9yIChpID0gMDsgaSA8IGRhdGEuY2FyZHMubGVuZ3RoOyBpKyspXG5cdFx0dGhpcy5jYXJkcy5wdXNoKG5ldyBDYXJkRGF0YShkYXRhLmNhcmRzW2ldKSk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5Qb2NrZXRDYXJkc01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2FyZHMgPSBbXTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5jYXJkcy5sZW5ndGg7IGkrKylcblx0XHRjYXJkcy5wdXNoKHRoaXMuY2FyZHNbaV0uZ2V0VmFsdWUoKSk7XG5cblx0cmV0dXJuIHtcblx0XHRhbmltYXRlOiB0aGlzLmFuaW1hdGUsXG5cdFx0Zmlyc3RJbmRleDogdGhpcy5maXJzdEluZGV4LFxuXHRcdGNhcmRzOiBjYXJkcyxcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9ja2V0Q2FyZHNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBwbGF5ZXIgcG90IGhhcyBjaGFuZ2VkLlxuICogQGNsYXNzIFBvdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUG90TWVzc2FnZSh2YWx1ZXMpIHtcblx0dGhpcy52YWx1ZXMgPSB2YWx1ZXMgPT0gbnVsbCA/IG5ldyBBcnJheSgpIDogdmFsdWVzO1xufVxuXG5Qb3RNZXNzYWdlLlRZUEUgPSBcInBvdFwiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVzXG4gKi9cblBvdE1lc3NhZ2UucHJvdG90eXBlLmdldFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZXM7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5Qb3RNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy52YWx1ZXMgPSBkYXRhLnZhbHVlcztcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblBvdE1lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZhbHVlczogdGhpcy52YWx1ZXNcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQb3RNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiBQcmUgdG91cm5hbWVudCBpbmZvIG1lc3NhZ2UgaXMgZGlzcGF0Y2hlZC5cbiAqIEBjbGFzcyBQcmVUb3VybmFtZW50SW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlKHRleHQsIGNvdW50ZG93bikge1xuXHR0aGlzLnRleHQgPSB0ZXh0O1xuXHR0aGlzLmNvdW50ZG93biA9IGNvdW50ZG93bjtcbn1cblxuUHJlVG91cm5hbWVudEluZm9NZXNzYWdlLlRZUEUgPSBcInByZVRvdXJuYW1lbnRJbmZvXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q291bnRkb3duXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q291bnRkb3duID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5jb3VudGRvd24gPSBkYXRhLmNvdW50ZG93bjtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZVRvdXJuYW1lbnRJbmZvTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdGlmKHRoaXMuY291bnRkb3duIDwgMClcblx0XHR0aGlzLmNvdW50ZG93biA9IDA7XG5cdFxuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRjb3VudGRvd246IHRoaXMuY291bnRkb3duXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlVG91cm5hbWVudEluZm9NZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZVxuICovXG5mdW5jdGlvbiBQcmVzZXRCdXR0b25DbGlja01lc3NhZ2UoYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuXHR0aGlzLnZhbHVlID0gbnVsbDtcbn1cblxuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLlRZUEUgPSBcInByZXNldEJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRCdXR0b25cbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9uO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZTtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuYnV0dG9uID0gZGF0YS5idXR0b247XG5cdHRoaXMudmFsdWUgPSBkYXRhLnZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRidXR0b246IHRoaXMuYnV0dG9uLFxuXHRcdHZhbHVlOiB0aGlzLnZhbHVlXG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0QnV0dG9uQ2xpY2tNZXNzYWdlOyIsInZhciBQcmVzZXRCdXR0b25EYXRhID0gcmVxdWlyZShcIi4uL2RhdGEvUHJlc2V0QnV0dG9uRGF0YVwiKTtcblxuLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgUHJlc2V0QnV0dG9uc01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gUHJlc2V0QnV0dG9uc01lc3NhZ2UoKSB7XG5cdHRoaXMuYnV0dG9ucyA9IG5ldyBBcnJheSg3KTtcblx0dGhpcy5jdXJyZW50ID0gbnVsbDtcbn1cblxuUHJlc2V0QnV0dG9uc01lc3NhZ2UuVFlQRSA9IFwicHJlc2V0QnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uc1xuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5idXR0b25zO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q3VycmVudFxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q3VycmVudCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jdXJyZW50O1xufVxuXG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5QcmVzZXRCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuY3VycmVudCA9IGRhdGEuY3VycmVudDtcblxuXHR0aGlzLmJ1dHRvbnMgPSBuZXcgQXJyYXkoKTtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgZGF0YS5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbiA9IGRhdGEuYnV0dG9uc1tpXTtcblx0XHR2YXIgYnV0dG9uRGF0YSA9IG51bGw7XG5cblx0XHRpZihidXR0b24gIT0gbnVsbCkge1xuXHRcdFx0YnV0dG9uRGF0YSA9IG5ldyBQcmVzZXRCdXR0b25EYXRhKCk7XG5cblx0XHRcdGJ1dHRvbkRhdGEuYnV0dG9uID0gYnV0dG9uLmJ1dHRvbjtcblx0XHRcdGJ1dHRvbkRhdGEudmFsdWUgPSBidXR0b24udmFsdWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5idXR0b25zLnB1c2goYnV0dG9uRGF0YSk7XG5cdH1cbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblByZXNldEJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIG9iamVjdCA9IHtcblx0XHRidXR0b25zOiBbXSxcblx0XHRjdXJyZW50OiB0aGlzLmN1cnJlbnRcblx0fTtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGJ1dHRvbkRhdGEgPSB0aGlzLmJ1dHRvbnNbaV07XG5cdFx0aWYoYnV0dG9uRGF0YSAhPSBudWxsKVxuXHRcdFx0b2JqZWN0LmJ1dHRvbnMucHVzaCh7XG5cdFx0XHRcdGJ1dHRvbjogYnV0dG9uRGF0YS5idXR0b24sXG5cdFx0XHRcdHZhbHVlOiBidXR0b25EYXRhLnZhbHVlXG5cdFx0XHR9KTtcblxuXHRcdGVsc2Vcblx0XHRcdG9iamVjdC5idXR0b25zLnB1c2gobnVsbCk7XG5cdH1cblxuXHRyZXR1cm4gb2JqZWN0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogTWVzc2FnZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHVzZXIgaGFzIGNsaWNrZWQgYSBzZWF0LlxuICogQGNsYXNzIFNlYXRDbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gU2VhdENsaWNrTWVzc2FnZShzZWF0SW5kZXgpIHtcblx0dGhpcy5zZWF0SW5kZXg9c2VhdEluZGV4O1xufVxuXG5TZWF0Q2xpY2tNZXNzYWdlLlRZUEUgPSBcInNlYXRDbGlja1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0U2VhdEluZGV4XG4gKi9cblNlYXRDbGlja01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZS5cbiAqL1xuU2VhdENsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gZGF0YS5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5TZWF0Q2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXRDbGlja01lc3NhZ2U7IiwiLyoqXG4gKiBTaG93IHVzZXJuYW1lIGFuZCBjaGlwcyBvbiBzZWF0LlxuICogQGNsYXNzIFNlYXRJbmZvTWVzc2FnZVxuICovXG5mdW5jdGlvbiBTZWF0SW5mb01lc3NhZ2Uoc2VhdEluZGV4KSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gc2VhdEluZGV4O1xuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMuc2l0b3V0ID0gZmFsc2U7XG5cdHRoaXMubmFtZSA9IFwiXCI7XG5cdHRoaXMuY2hpcHMgPSBcIlwiO1xufVxuXG5TZWF0SW5mb01lc3NhZ2UuVFlQRSA9IFwic2VhdEluZm9cIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNlYXRJbmRleFxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLmdldFNlYXRJbmRleCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zZWF0SW5kZXg7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXROYW1lXG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5uYW1lO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q2hpcHNcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDaGlwcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGlwcztcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGlzU2l0b3V0XG4gKi9cblNlYXRJbmZvTWVzc2FnZS5wcm90b3R5cGUuaXNTaXRvdXQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2l0b3V0O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgaXNBY3RpdmVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5hY3RpdmU7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRBY3RpdmVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRBY3RpdmUgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuYWN0aXZlID0gdjtcbn1cblxuLyoqXG4gKiBTZXQgc2l0b3V0LlxuICogQG1ldGhvZCBzZXRTaXRvdXRcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRTaXRvdXQgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuc2l0b3V0ID0gdjtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldE5hbWVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXROYW1lID0gZnVuY3Rpb24odikge1xuXHR0aGlzLm5hbWUgPSB2O1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0Q2hpcHNcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXRDaGlwcyA9IGZ1bmN0aW9uKHYpIHtcblx0dGhpcy5jaGlwcyA9IHY7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5TZWF0SW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG5cdHRoaXMuY2hpcHMgPSBkYXRhLmNoaXBzO1xuXHR0aGlzLnNpdG91dCA9IGRhdGEuc2l0b3V0O1xuXHR0aGlzLmFjdGl2ZSA9IGRhdGEuYWN0aXZlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2VhdEluZm9NZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzZWF0SW5kZXg6IHRoaXMuc2VhdEluZGV4LFxuXHRcdG5hbWU6IHRoaXMubmFtZSxcblx0XHRjaGlwczogdGhpcy5jaGlwcyxcblx0XHRzaXRvdXQ6IHRoaXMuc2l0b3V0LFxuXHRcdGFjdGl2ZTogdGhpcy5hY3RpdmVcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWF0SW5mb01lc3NhZ2U7IiwiLyoqXG4gKiBTaG93IGRpYWxvZywgZm9yIGUuZy4gYnV5IGluLlxuICogQGNsYXNzIFNob3dEaWFsb2dNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFNob3dEaWFsb2dNZXNzYWdlKCkge1xuXHR0aGlzLnRleHQgPSBcIlwiO1xuXHR0aGlzLmJ1dHRvbnMgPSBbXTtcblx0dGhpcy5kZWZhdWx0VmFsdWUgPSBudWxsO1xufVxuXG5TaG93RGlhbG9nTWVzc2FnZS5UWVBFID0gXCJzaG93RGlhbG9nXCI7XG5cbi8qKlxuICogQWRkIGEgYnV0dG9uIHRvIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGFkZEJ1dHRvblxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuYWRkQnV0dG9uID0gZnVuY3Rpb24oYnV0dG9uKSB7XG5cdHRoaXMuYnV0dG9ucy5wdXNoKGJ1dHRvbik7XG59XG5cbi8qKlxuICogR2V0IHRleHQgb2YgdGhlIGRpYWxvZy5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy50ZXh0O1xufVxuXG4vKipcbiAqIEdldCBhcnJheSBvZiBCdXR0b25EYXRhIHRvIGJlIHNob3duIGluIHRoZSBkaWFsb2cuXG4gKiBAbWV0aG9kIGdldEJ1dHRvbnNcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYnV0dG9ucztcbn1cblxuLyoqXG4gKiBHZXQgZGVmYXVsdCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0QnV0dG9uc1xuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuZ2V0RGVmYXVsdFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRlZmF1bHRWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgZGVmYXVsdCB2YWx1ZS5cbiAqIEBtZXRob2Qgc2V0RGVmYXVsdFZhbHVlXG4gKi9cblNob3dEaWFsb2dNZXNzYWdlLnByb3RvdHlwZS5zZXREZWZhdWx0VmFsdWUgPSBmdW5jdGlvbih2KSB7XG5cdHRoaXMuZGVmYXVsdFZhbHVlPXY7XG59XG5cbi8qKlxuICogU2V0IHRleHQgaW4gdGhlIGRpYWxvZy5cbiAqIEBtZXRob2Qgc2V0VGV4dFxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUuc2V0VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcblx0dGhpcy50ZXh0ID0gdGV4dDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplLlxuICovXG5TaG93RGlhbG9nTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5idXR0b25zID0gZGF0YS5idXR0b25zO1xuXHR0aGlzLmRlZmF1bHRWYWx1ZSA9IGRhdGEuZGVmYXVsdFZhbHVlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuU2hvd0RpYWxvZ01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRidXR0b25zOiB0aGlzLmJ1dHRvbnMsXG5cdFx0ZGVmYXVsdFZhbHVlOiB0aGlzLmRlZmF1bHRWYWx1ZVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNob3dEaWFsb2dNZXNzYWdlOyIsIi8qKlxuICogQGNsYXNzIFN0YXRlQ29tcGxldGVNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFN0YXRlQ29tcGxldGVNZXNzYWdlKCkge31cblxuU3RhdGVDb21wbGV0ZU1lc3NhZ2UuVFlQRSA9IFwic3RhdGVDb21wbGV0ZVwiO1xuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemUuXG4gKi9cblN0YXRlQ29tcGxldGVNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHt9XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5TdGF0ZUNvbXBsZXRlTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZUNvbXBsZXRlTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gdGFibGUgYnV0dG9uIGNsaWNrZWQuXG4gKiBAY2xhc3MgVGFibGVCdXR0b25DbGlja01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGFibGVCdXR0b25DbGlja01lc3NhZ2UodGFibGVJbmRleCkge1xuXHR0aGlzLnRhYmxlSW5kZXggPSB0YWJsZUluZGV4O1xufVxuXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUJ1dHRvbkNsaWNrXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUYWJsZUluZGV4XG4gKi9cblRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5nZXRUYWJsZUluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRhYmxlSW5kZXg7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGFibGVJbmRleCA9IGRhdGEudGFibGVJbmRleDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRhYmxlQnV0dG9uQ2xpY2tNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0YWJsZUluZGV4OiB0aGlzLnRhYmxlSW5kZXhcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUJ1dHRvbkNsaWNrTWVzc2FnZTsiLCIvKipcbiAqIFJlY2VpdmVkIHdoZW4gPy5cbiAqIEBjbGFzcyBUYWJsZUJ1dHRvbnNNZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIFRhYmxlQnV0dG9uc01lc3NhZ2UoKSB7XG5cdHRoaXMuZW5hYmxlZCA9IG5ldyBBcnJheSgpO1xuXHR0aGlzLmN1cnJlbnRJbmRleCA9IC0xO1xuXHR0aGlzLnBsYXllckluZGV4ID0gLTE7XG5cdHRoaXMuaW5mb0xpbmsgPSBcIlwiO1xufVxuXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLlRZUEUgPSBcInRhYmxlQnV0dG9uc1wiO1xuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0RW5hYmxlZFxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5nZXRFbmFibGVkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmVuYWJsZWQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRDdXJyZW50SW5kZXhcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0Q3VycmVudEluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmN1cnJlbnRJbmRleDtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFBsYXllckluZGV4XG4gKi9cblRhYmxlQnV0dG9uc01lc3NhZ2UucHJvdG90eXBlLmdldFBsYXllckluZGV4ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnBsYXllckluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtcbiAqL1xuVGFibGVCdXR0b25zTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmsgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuaW5mb0xpbms7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS51bnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0dGhpcy5wbGF5ZXJJbmRleCA9IGRhdGEucGxheWVySW5kZXg7XG5cdHRoaXMuY3VycmVudEluZGV4ID0gZGF0YS5jdXJyZW50SW5kZXg7XG5cdHRoaXMuaW5mb0xpbmsgPSBkYXRhLmluZm9MaW5rO1xuXG5cdHRoaXMuZW5hYmxlZCA9IG5ldyBBcnJheSgpO1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgZGF0YS5lbmFibGVkLmxlbmd0aDsgaSsrKVxuXHRcdHRoaXMuZW5hYmxlZC5wdXNoKGRhdGEuZW5hYmxlZFtpXSk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplIG1lc3NhZ2UuXG4gKiBAbWV0aG9kIHNlcmlhbGl6ZVxuICovXG5UYWJsZUJ1dHRvbnNNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dmFyIG9iamVjdCA9IHtcblx0XHRjdXJyZW50SW5kZXg6IHRoaXMuY3VycmVudEluZGV4LFxuXHRcdHBsYXllckluZGV4OiB0aGlzLnBsYXllckluZGV4LFxuXHRcdGVuYWJsZWQ6IFtdLFxuXHRcdGluZm9MaW5rOiB0aGlzLmluZm9MaW5rXG5cdH07XG5cblx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMuZW5hYmxlZC5sZW5ndGg7IGkrKylcblx0XHRvYmplY3QuZW5hYmxlZC5wdXNoKHRoaXMuZW5hYmxlZFtpXSk7XG5cblx0cmV0dXJuIG9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUYWJsZUJ1dHRvbnNNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRhYmxlSW5mb01lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVGFibGVJbmZvTWVzc2FnZSh0ZXh0LCBjb3VudGRvd24pIHtcblx0dGhpcy5jb3VudGRvd24gPSBjb3VudGRvd247XG5cdHRoaXMudGV4dCA9IHRleHQ7XG5cdHRoaXMuc2hvd0pvaW5CdXR0b24gPSBmYWxzZTtcblx0dGhpcy5zaG93TGVhdmVCdXR0b24gPSBmYWxzZTtcblx0dGhpcy5pbmZvTGluayA9IG51bGw7XG5cdHRoaXMuaW5mb0xpbmtUZXh0ID0gbnVsbDtcbn1cblxuVGFibGVJbmZvTWVzc2FnZS5UWVBFID0gXCJ0YWJsZUluZm9cIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldENvdW50ZG93blxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRDb3VudGRvd24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuY291bnRkb3duO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VGV4dFxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTaG93Sm9pbkJ1dHRvblxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTaG93Sm9pbkJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zaG93Sm9pbkJ1dHRvbjtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFNob3dMZWF2ZUJ1dHRvblxuICovXG5UYWJsZUluZm9NZXNzYWdlLnByb3RvdHlwZS5nZXRTaG93TGVhdmVCdXR0b24gPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2hvd0xlYXZlQnV0dG9uO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0SW5mb0xpbmtcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmsgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuaW5mb0xpbms7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRJbmZvTGlua1RleHRcbiAqL1xuVGFibGVJbmZvTWVzc2FnZS5wcm90b3R5cGUuZ2V0SW5mb0xpbmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmluZm9MaW5rVGV4dDtcbn1cblxuLyoqXG4gKiBVbi1zZXJpYWxpemUuXG4gKiBAbWV0aG9kIHVuc2VyaWFsaXplXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHRpZihkYXRhLnRleHQgIT0gbnVsbClcblx0XHR0aGlzLnRleHQgPSBkYXRhLnRleHQ7XG5cblx0aWYoZGF0YS5jb3VudGRvd24gIT0gbnVsbClcblx0XHR0aGlzLmNvdW50ZG93biA9IGRhdGEuY291bnRkb3duO1xuXG5cdGlmKGRhdGEuc2hvd0pvaW5CdXR0b24gIT0gbnVsbClcblx0XHR0aGlzLnNob3dKb2luQnV0dG9uID0gZGF0YS5zaG93Sm9pbkJ1dHRvbjtcblxuXHRpZihkYXRhLnNob3dMZWF2ZUJ1dHRvbiAhPSBudWxsKVxuXHRcdHRoaXMuc2hvd0xlYXZlQnV0dG9uID0gZGF0YS5zaG93TGVhdmVCdXR0b247XG5cblx0aWYoZGF0YS5pbmZvTGluayAhPSBudWxsKVxuXHRcdHRoaXMuaW5mb0xpbmsgPSBkYXRhLmluZm9MaW5rO1xuXG5cdGlmKGRhdGEuaW5mb0xpbmtUZXh0ICE9IG51bGwpXG5cdFx0dGhpcy5pbmZvTGlua1RleHQgPSBkYXRhLmluZm9MaW5rVGV4dDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRhYmxlSW5mb01lc3NhZ2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHRleHQ6IHRoaXMudGV4dCxcblx0XHRjb3VudGRvd246IHRoaXMuY291bnRkb3duLFxuXHRcdHNob3dKb2luQnV0dG9uOiB0aGlzLnNob3dKb2luQnV0dG9uLFxuXHRcdHNob3dMZWF2ZUJ1dHRvbjogdGhpcy5zaG93TGVhdmVCdXR0b24sXG5cdFx0aW5mb0xpbms6IHRoaXMuaW5mb0xpbmssXG5cdFx0aW5mb0xpbmtUZXh0OiB0aGlzLmluZm9MaW5rVGV4dFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRhYmxlSW5mb01lc3NhZ2U7IiwiLyoqXG4gKiBSZWNlaXZlZCB3aGVuID8uXG4gKiBAY2xhc3MgVGVzdENhc2VSZXF1ZXN0TWVzc2FnZVxuICovXG5mdW5jdGlvbiBUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlKHRlc3RDYXNlKSB7XG5cdHRoaXMudGVzdENhc2UgPSB0ZXN0Q2FzZTtcbn1cblxuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5UWVBFID0gXCJ0ZXN0Q2FzZVJlcXVlc3RcIjtcblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRlc3RDYXNlXG4gKi9cblRlc3RDYXNlUmVxdWVzdE1lc3NhZ2UucHJvdG90eXBlLmdldFRlc3RDYXNlID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRlc3RDYXNlO1xufVxuXG4vKipcbiAqIFVuLXNlcmlhbGl6ZS5cbiAqIEBtZXRob2QgdW5zZXJpYWxpemVcbiAqL1xuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGVzdENhc2UgPSBkYXRhLnRlc3RDYXNlO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBtZXNzYWdlLlxuICogQG1ldGhvZCBzZXJpYWxpemVcbiAqL1xuVGVzdENhc2VSZXF1ZXN0TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0dGVzdENhc2U6IHRoaXMudGVzdENhc2Vcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUZXN0Q2FzZVJlcXVlc3RNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiA/LlxuICogQGNsYXNzIFRpbWVyTWVzc2FnZVxuICovXG5mdW5jdGlvbiBUaW1lck1lc3NhZ2UoKSB7XG5cdHRoaXMuc2VhdEluZGV4ID0gLTE7XG5cdHRoaXMudG90YWxUaW1lID0gLTE7XG5cdHRoaXMudGltZUxlZnQgPSAtMTtcbn1cblxuVGltZXJNZXNzYWdlLlRZUEUgPSBcInRpbWVyXCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRTZWF0SW5kZXhcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS5nZXRTZWF0SW5kZXggPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc2VhdEluZGV4O1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0VG90YWxUaW1lXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0VG90YWxUaW1lID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRvdGFsVGltZTtcbn1cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKiBAbWV0aG9kIGdldFRpbWVMZWZ0XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuZ2V0VGltZUxlZnQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMudGltZUxlZnQ7XG59XG5cbi8qKlxuICogU2V0dGVyLlxuICogQG1ldGhvZCBzZXRTZWF0SW5kZXhcbiAqL1xuVGltZXJNZXNzYWdlLnByb3RvdHlwZS5zZXRTZWF0SW5kZXggPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IHZhbHVlO1xufVxuXG4vKipcbiAqIFNldHRlci5cbiAqIEBtZXRob2Qgc2V0VG90YWxUaW1lXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0VG90YWxUaW1lID0gZnVuY3Rpb24odmFsdWUpIHtcblx0dGhpcy50b3RhbFRpbWUgPSB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldFRpbWVMZWZ0XG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2V0VGltZUxlZnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLnRpbWVMZWZ0ID0gdmFsdWU7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5UaW1lck1lc3NhZ2UucHJvdG90eXBlLnVuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSkge1xuXHR0aGlzLnNlYXRJbmRleCA9IGRhdGEuc2VhdEluZGV4O1xuXHR0aGlzLnRvdGFsVGltZSA9IGRhdGEudG90YWxUaW1lO1xuXHR0aGlzLnRpbWVMZWZ0ID0gZGF0YS50aW1lTGVmdDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRpbWVyTWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0c2VhdEluZGV4OiB0aGlzLnNlYXRJbmRleCxcblx0XHR0b3RhbFRpbWU6IHRoaXMudG90YWxUaW1lLFxuXHRcdHRpbWVMZWZ0OiB0aGlzLnRpbWVMZWZ0XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGltZXJNZXNzYWdlOyIsIi8qKlxuICogUmVjZWl2ZWQgd2hlbiB0b3VybmFtZW50IHJlc3VsdCBtZXNzYWdlIGlzIGRpc3BhdGNoZWQuXG4gKiBAY2xhc3MgVG91cm5hbWVudFJlc3VsdE1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UodGV4dCwgcmlnaHRDb2x1bW5UZXh0KSB7XG5cdHRoaXMudGV4dCA9IHRleHQ7XG5cdHRoaXMucmlnaHRDb2x1bW5UZXh0ID0gcmlnaHRDb2x1bW5UZXh0O1xufVxuXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5UWVBFID0gXCJ0b3VybmFtZW50UmVzdWx0XCI7XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRUZXh0XG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5nZXRUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnRleHQ7XG59XG5cbi8qKlxuICogR2V0dGVyLlxuICogQG1ldGhvZCBnZXRSaWdodENvbHVtblRleHRcbiAqL1xuVG91cm5hbWVudFJlc3VsdE1lc3NhZ2UucHJvdG90eXBlLmdldFJpZ2h0Q29sdW1uVGV4dCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5yaWdodENvbHVtblRleHQ7XG59XG5cbi8qKlxuICogVW4tc2VyaWFsaXplLlxuICogQG1ldGhvZCB1bnNlcmlhbGl6ZVxuICovXG5Ub3VybmFtZW50UmVzdWx0TWVzc2FnZS5wcm90b3R5cGUudW5zZXJpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cdHRoaXMudGV4dCA9IGRhdGEudGV4dDtcblx0dGhpcy5yaWdodENvbHVtblRleHQgPSBkYXRhLnJpZ2h0Q29sdW1uVGV4dDtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgbWVzc2FnZS5cbiAqIEBtZXRob2Qgc2VyaWFsaXplXG4gKi9cblRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHR0ZXh0OiB0aGlzLnRleHQsXG5cdFx0cmlnaHRDb2x1bW5UZXh0OiB0aGlzLnJpZ2h0Q29sdW1uVGV4dFxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRvdXJuYW1lbnRSZXN1bHRNZXNzYWdlOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBCdXR0b24uXG4gKiBAY2xhc3MgQnV0dG9uXG4gKi9cbmZ1bmN0aW9uIEJ1dHRvbihjb250ZW50KSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdGlmIChjb250ZW50KVxuXHRcdHRoaXMuYWRkQ2hpbGQoY29udGVudCk7XG5cblx0dGhpcy5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMuYnV0dG9uTW9kZSA9IHRydWU7XG5cblx0dGhpcy5tb3VzZW92ZXIgPSB0aGlzLm9uTW91c2VvdmVyLmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2VvdXQgPSB0aGlzLm9uTW91c2VvdXQuYmluZCh0aGlzKTtcblx0dGhpcy5tb3VzZWRvd24gPSB0aGlzLm9uTW91c2Vkb3duLmJpbmQodGhpcyk7XG5cdHRoaXMubW91c2V1cCA9IHRoaXMub25Nb3VzZXVwLmJpbmQodGhpcyk7XG5cdHRoaXMuY2xpY2sgPSB0aGlzLm9uQ2xpY2suYmluZCh0aGlzKTtcblxuXHR0aGlzLmNvbG9yTWF0cml4RmlsdGVyID0gbmV3IFBJWEkuQ29sb3JNYXRyaXhGaWx0ZXIoKTtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG5cblx0dGhpcy5maWx0ZXJzID0gW3RoaXMuY29sb3JNYXRyaXhGaWx0ZXJdO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKEJ1dHRvbiwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcbkV2ZW50RGlzcGF0Y2hlci5pbml0KEJ1dHRvbik7XG5cbkJ1dHRvbi5MSUdIVF9NQVRSSVggPSBbMS41LCAwLCAwLCAwLCAwLCAxLjUsIDAsIDAsIDAsIDAsIDEuNSwgMCwgMCwgMCwgMCwgMV07XG5CdXR0b24uREFSS19NQVRSSVggPSBbLjc1LCAwLCAwLCAwLCAwLCAuNzUsIDAsIDAsIDAsIDAsIC43NSwgMCwgMCwgMCwgMCwgMV07XG5CdXR0b24uREVGQVVMVF9NQVRSSVggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG5cbkJ1dHRvbi5DTElDSyA9IFwiY2xpY2tcIjtcblxuLyoqXG4gKiBNb3VzZSBvdmVyLlxuICogQG1ldGhvZCBvbk1vdXNlb3ZlclxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNlb3ZlciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNvbG9yTWF0cml4RmlsdGVyLm1hdHJpeCA9IEJ1dHRvbi5MSUdIVF9NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2Ugb3V0LlxuICogQG1ldGhvZCBvbk1vdXNlb3V0XG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uTW91c2VvdXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uREVGQVVMVF9NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2UgZG93bi5cbiAqIEBtZXRob2Qgb25Nb3VzZWRvd25cbiAqIEBwcml2YXRlXG4gKi9cbkJ1dHRvbi5wcm90b3R5cGUub25Nb3VzZWRvd24gPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uREFSS19NQVRSSVg7XG59XG5cbi8qKlxuICogTW91c2UgdXAuXG4gKiBAbWV0aG9kIG9uTW91c2V1cFxuICogQHByaXZhdGVcbiAqL1xuQnV0dG9uLnByb3RvdHlwZS5vbk1vdXNldXAgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jb2xvck1hdHJpeEZpbHRlci5tYXRyaXggPSBCdXR0b24uTElHSFRfTUFUUklYO1xufVxuXG4vKipcbiAqIENsaWNrLlxuICogQG1ldGhvZCBvbkNsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5CdXR0b24ucHJvdG90eXBlLm9uQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50cmlnZ2VyKEJ1dHRvbi5DTElDSyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBCdXR0b24gPSByZXF1aXJlKFwiLi9CdXR0b25cIik7XG5cbi8qKlxuICogQ2hlY2tib3guXG4gKiBAY2xhc3MgQ2hlY2tib3hcbiAqL1xuZnVuY3Rpb24gQ2hlY2tib3goYmFja2dyb3VuZCwgdGljaykge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmJ1dHRvbiA9IG5ldyBCdXR0b24oYmFja2dyb3VuZCk7XG5cdHRoaXMuYWRkQ2hpbGQodGhpcy5idXR0b24pO1xuXG5cdHRoaXMuY2hlY2sgPSB0aWNrO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMuY2hlY2spO1xuXG5cdHRoaXMuYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm9uQnV0dG9uQ2xpY2ssIHRoaXMpO1xuXG5cdHRoaXMuc2V0Q2hlY2tlZChmYWxzZSk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ2hlY2tib3gsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChDaGVja2JveCk7XG5cbi8qKlxuICogQnV0dG9uIGNsaWNrLlxuICogQG1ldGhvZCBvbkJ1dHRvbkNsaWNrXG4gKiBAcHJpdmF0ZVxuICovXG5DaGVja2JveC5wcm90b3R5cGUub25CdXR0b25DbGljayA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNoZWNrLnZpc2libGUgPSAhdGhpcy5jaGVjay52aXNpYmxlO1xuXG5cdHRoaXMuZGlzcGF0Y2hFdmVudChcImNoYW5nZVwiKTtcbn1cblxuLyoqXG4gKiBTZXR0ZXIuXG4gKiBAbWV0aG9kIHNldENoZWNrZWRcbiAqL1xuQ2hlY2tib3gucHJvdG90eXBlLnNldENoZWNrZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHR0aGlzLmNoZWNrLnZpc2libGUgPSB2YWx1ZTtcblx0cmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEdldHRlci5cbiAqIEBtZXRob2QgZ2V0Q2hlY2tlZFxuICovXG5DaGVja2JveC5wcm90b3R5cGUuZ2V0Q2hlY2tlZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5jaGVjay52aXNpYmxlO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hlY2tib3g7IiwidmFyIFBJWEk9cmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsPXJlcXVpcmUoXCIuLi91dGlscy9GdW5jdGlvblV0aWxcIik7XG5cbmZ1bmN0aW9uIENvbnRlbnRTY2FsZXIoY29udGVudCkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLmNvbnRlbnRXaWR0aD0xMDA7XG5cdHRoaXMuY29udGVudEhlaWdodD0xMDA7XG5cblx0dGhpcy5zY3JlZW5XaWR0aD0xMDA7XG5cdHRoaXMuc2NyZWVuSGVpZ2h0PTEwMDtcblxuXHR0aGlzLnRoZU1hc2s9bnVsbDtcblxuXHRpZiAoY29udGVudClcblx0XHR0aGlzLnNldENvbnRlbnQoY29udGVudCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoQ29udGVudFNjYWxlcixQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRDb250ZW50PWZ1bmN0aW9uKGNvbnRlbnQpIHtcblx0dGhpcy5jb250ZW50PWNvbnRlbnQ7XG5cblx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvbnRlbnQpO1xuXG5cdGlmICh0aGlzLnRoZU1hc2spIHtcblx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMudGhlTWFzayk7XG5cdFx0dGhpcy50aGVNYXNrPW51bGw7XG5cdH1cblxuXHR0aGlzLnRoZU1hc2s9bmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0Ly90aGlzLmFkZENoaWxkKHRoaXMudGhlTWFzayk7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS5zZXRDb250ZW50U2l6ZT1mdW5jdGlvbihjb250ZW50V2lkdGgsIGNvbnRlbnRIZWlnaHQpIHtcblx0dGhpcy5jb250ZW50V2lkdGg9Y29udGVudFdpZHRoO1xuXHR0aGlzLmNvbnRlbnRIZWlnaHQ9Y29udGVudEhlaWdodDtcblxuXHR0aGlzLnVwZGF0ZVNjYWxlKCk7XG59XG5cbkNvbnRlbnRTY2FsZXIucHJvdG90eXBlLnNldFNjcmVlblNpemU9ZnVuY3Rpb24oc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkge1xuXHR0aGlzLnNjcmVlbldpZHRoPXNjcmVlbldpZHRoO1xuXHR0aGlzLnNjcmVlbkhlaWdodD1zY3JlZW5IZWlnaHQ7XG5cblx0dGhpcy51cGRhdGVTY2FsZSgpO1xufVxuXG5Db250ZW50U2NhbGVyLnByb3RvdHlwZS51cGRhdGVTY2FsZT1mdW5jdGlvbigpIHtcblx0dmFyIHNjYWxlO1xuXG5cdGlmICh0aGlzLnNjcmVlbldpZHRoL3RoaXMuY29udGVudFdpZHRoPHRoaXMuc2NyZWVuSGVpZ2h0L3RoaXMuY29udGVudEhlaWdodClcblx0XHRzY2FsZT10aGlzLnNjcmVlbldpZHRoL3RoaXMuY29udGVudFdpZHRoO1xuXG5cdGVsc2Vcblx0XHRzY2FsZT10aGlzLnNjcmVlbkhlaWdodC90aGlzLmNvbnRlbnRIZWlnaHQ7XG5cblx0dGhpcy5jb250ZW50LnNjYWxlLng9c2NhbGU7XG5cdHRoaXMuY29udGVudC5zY2FsZS55PXNjYWxlO1xuXG5cdHZhciBzY2FsZWRXaWR0aD10aGlzLmNvbnRlbnRXaWR0aCpzY2FsZTtcblx0dmFyIHNjYWxlZEhlaWdodD10aGlzLmNvbnRlbnRIZWlnaHQqc2NhbGU7XG5cblx0dGhpcy5jb250ZW50LnBvc2l0aW9uLng9KHRoaXMuc2NyZWVuV2lkdGgtc2NhbGVkV2lkdGgpLzI7XG5cdHRoaXMuY29udGVudC5wb3NpdGlvbi55PSh0aGlzLnNjcmVlbkhlaWdodC1zY2FsZWRIZWlnaHQpLzI7XG5cblx0dmFyIHI9bmV3IFBJWEkuUmVjdGFuZ2xlKHRoaXMuY29udGVudC5wb3NpdGlvbi54LHRoaXMuY29udGVudC5wb3NpdGlvbi55LHNjYWxlZFdpZHRoLHNjYWxlZEhlaWdodCk7XG5cdHZhciByaWdodD1yLngrci53aWR0aDtcblx0dmFyIGJvdHRvbT1yLnkrci5oZWlnaHQ7XG5cblx0dGhpcy50aGVNYXNrLmNsZWFyKCk7XG5cdHRoaXMudGhlTWFzay5iZWdpbkZpbGwoKTtcblx0dGhpcy50aGVNYXNrLmRyYXdSZWN0KDAsMCx0aGlzLnNjcmVlbldpZHRoLHIueSk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLDAsci54LHRoaXMuc2NyZWVuSGVpZ2h0KTtcblx0dGhpcy50aGVNYXNrLmRyYXdSZWN0KHJpZ2h0LDAsdGhpcy5zY3JlZW5XaWR0aC1yaWdodCx0aGlzLnNjcmVlbkhlaWdodCk7XG5cdHRoaXMudGhlTWFzay5kcmF3UmVjdCgwLGJvdHRvbSx0aGlzLnNjcmVlbldpZHRoLHRoaXMuc2NyZWVuSGVpZ2h0LWJvdHRvbSk7XG5cdHRoaXMudGhlTWFzay5lbmRGaWxsKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzPUNvbnRlbnRTY2FsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQVMzL2pxdWVyeSBzdHlsZSBldmVudCBkaXNwYXRjaGVyLiBTbGlnaHRseSBtb2RpZmllZC4gVGhlXG4gKiBqcXVlcnkgc3R5bGUgb24vb2ZmL3RyaWdnZXIgc3R5bGUgb2YgYWRkaW5nIGxpc3RlbmVycyBpc1xuICogY3VycmVudGx5IHRoZSBwcmVmZXJyZWQgb25lLlxuICogXG4gKiBUaGUgb24gbWV0aG9kIGZvciBhZGRpbmcgbGlzdGVuZXJzIHRha2VzIGFuIGV4dHJhIHBhcmFtZXRlciB3aGljaCBpcyB0aGVcbiAqIHNjb3BlIGluIHdoaWNoIGxpc3RlbmVycyBzaG91bGQgYmUgY2FsbGVkLiBTbyB0aGlzOlxuICpcbiAqICAgICBvYmplY3Qub24oXCJldmVudFwiLCBsaXN0ZW5lciwgdGhpcyk7XG4gKlxuICogSGFzIHRoZSBzYW1lIGZ1bmN0aW9uIHdoZW4gYWRkaW5nIGV2ZW50cyBhczpcbiAqXG4gKiAgICAgb2JqZWN0Lm9uKFwiZXZlbnRcIiwgbGlzdGVuZXIuYmluZCh0aGlzKSk7XG4gKlxuICogSG93ZXZlciwgdGhlIGRpZmZlcmVuY2UgaXMgdGhhdCBpZiB3ZSB1c2UgdGhlIHNlY29uZCBtZXRob2QgaXRcbiAqIHdpbGwgbm90IGJlIHBvc3NpYmxlIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXJzIGxhdGVyLCB1bmxlc3NcbiAqIHRoZSBjbG9zdXJlIGNyZWF0ZWQgYnkgYmluZCBpcyBzdG9yZWQgc29tZXdoZXJlLiBJZiB0aGUgXG4gKiBmaXJzdCBtZXRob2QgaXMgdXNlZCwgd2UgY2FuIHJlbW92ZSB0aGUgbGlzdGVuZXIgd2l0aDpcbiAqXG4gKiAgICAgb2JqZWN0Lm9mZihcImV2ZW50XCIsIGxpc3RlbmVyLCB0aGlzKTtcbiAqXG4gKiBAY2xhc3MgRXZlbnREaXNwYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcblx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xufVxuXG4vKipcbiAqIEFkZCBldmVudCBsaXN0ZW5lci5cbiAqIEBtZXRob2QgYWRkRXZlbnRMaXN0ZW5lclxuICogQGRlcHJlY2F0ZWRcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBsaXN0ZW5lciwgc2NvcGUpIHtcblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwKVxuXHRcdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcblxuXHRpZiAoIWV2ZW50VHlwZSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB0eXBlIHJlcXVpcmVkIGZvciBldmVudCBkaXNwYXRjaGVyXCIpO1xuXG5cdGlmICghbGlzdGVuZXIpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiTGlzdGVuZXIgcmVxdWlyZWQgZm9yIGV2ZW50IGRpc3BhdGNoZXJcIik7XG5cblx0dGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKTtcblxuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSlcblx0XHR0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV0gPSBbXTtcblxuXHR0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV0ucHVzaCh7XG5cdFx0bGlzdGVuZXI6IGxpc3RlbmVyLFxuXHRcdHNjb3BlOiBzY29wZVxuXHR9KTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXIuXG4gKiBAbWV0aG9kIHJlbW92ZUV2ZW50TGlzdGVuZXJcbiAqIEBkZXByZWNhdGVkXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgbGlzdGVuZXIsIHNjb3BlKSB7XG5cdGlmICghdGhpcy5saXN0ZW5lck1hcClcblx0XHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG5cblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpXG5cdFx0cmV0dXJuO1xuXG5cdHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgbGlzdGVuZXJPYmogPSBsaXN0ZW5lcnNbaV07XG5cblx0XHRpZiAobGlzdGVuZXIgPT0gbGlzdGVuZXJPYmoubGlzdGVuZXIgJiYgc2NvcGUgPT0gbGlzdGVuZXJPYmouc2NvcGUpIHtcblx0XHRcdGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRpLS07XG5cdFx0fVxuXHR9XG5cblx0aWYgKCFsaXN0ZW5lcnMubGVuZ3RoKVxuXHRcdGRlbGV0ZSB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggZXZlbnQuXG4gKiBAbWV0aG9kIGRpc3BhdGNoRXZlbnRcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQsIGRhdGEpIHtcblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwKVxuXHRcdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcblxuXHRpZiAodHlwZW9mIGV2ZW50ID09IFwic3RyaW5nXCIpIHtcblx0XHRldmVudCA9IHtcblx0XHRcdHR5cGU6IGV2ZW50XG5cdFx0fTtcblx0fVxuXG5cdGlmICghdGhpcy5saXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShldmVudC50eXBlKSlcblx0XHRyZXR1cm47XG5cblx0aWYgKGRhdGEgPT0gdW5kZWZpbmVkKVxuXHRcdGRhdGEgPSBldmVudDtcblxuXHRkYXRhLnRhcmdldCA9IHRoaXM7XG5cblx0Zm9yICh2YXIgaSBpbiB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50LnR5cGVdKSB7XG5cdFx0dmFyIGxpc3RlbmVyT2JqID0gdGhpcy5saXN0ZW5lck1hcFtldmVudC50eXBlXVtpXTtcblxuXHRcdGxpc3RlbmVyT2JqLmxpc3RlbmVyLmNhbGwobGlzdGVuZXJPYmouc2NvcGUsIGRhdGEpO1xuXHR9XG59XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciBhZGRFdmVudExpc3RlbmVyXG4gKiBAbWV0aG9kIG9uXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XG5cbi8qKlxuICogSnF1ZXJ5IHN0eWxlIGFsaWFzIGZvciByZW1vdmVFdmVudExpc3RlbmVyXG4gKiBAbWV0aG9kIG9mZlxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcblxuLyoqXG4gKiBKcXVlcnkgc3R5bGUgYWxpYXMgZm9yIGRpc3BhdGNoRXZlbnRcbiAqIEBtZXRob2QgdHJpZ2dlclxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XG5cbi8qKlxuICogTWFrZSBzb21ldGhpbmcgYW4gZXZlbnQgZGlzcGF0Y2hlci4gQ2FuIGJlIHVzZWQgZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLlxuICogQG1ldGhvZCBpbml0XG4gKiBAc3RhdGljXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5pbml0ID0gZnVuY3Rpb24oY2xzKSB7XG5cdGNscy5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcblx0Y2xzLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyO1xuXHRjbHMucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQ7XG5cdGNscy5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uO1xuXHRjbHMucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmO1xuXHRjbHMucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnRyaWdnZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyPXJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWw9cmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIEZyYW1lIHRpbWVyLlxuICogQGNsYXNzIEZyYW1lVGltZXJcbiAqL1xuZnVuY3Rpb24gRnJhbWVUaW1lcigpIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cblx0dGhpcy5pbnRlcnZhbElkPXNldEludGVydmFsKEZ1bmN0aW9uVXRpbC5jcmVhdGVEZWxlZ2F0ZSh0aGlzLm9uSW50ZXJ2YWwsdGhpcyksMTAwMC82MCk7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoRnJhbWVUaW1lcixFdmVudERpc3BhdGNoZXIpO1xuXG5GcmFtZVRpbWVyLlRJTUVSPVwidGltZXJcIjtcbkZyYW1lVGltZXIuUkVOREVSPVwicmVuZGVyXCI7XG5cbi8qKlxuICogT24gaW50ZXJ2YWwuXG4gKiBAbWV0aG9kIG9uSW50ZXJ2YWxcbiAqIEBwcml2YXRlXG4gKi9cbkZyYW1lVGltZXIucHJvdG90eXBlLm9uSW50ZXJ2YWw9ZnVuY3Rpb24oKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChGcmFtZVRpbWVyLlRJTUVSKTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KEZyYW1lVGltZXIuUkVOREVSKTtcbn1cblxuLyoqXG4gKiBHZXQgc2luZ2xldG9uIGluc3RhbmNlLlxuICogQG1ldGhvZCBnZXRJbnN0YW5jZVxuICogQHN0YXRpY1xuICovXG5GcmFtZVRpbWVyLmdldEluc3RhbmNlPWZ1bmN0aW9uKCkge1xuXHRpZiAoIUZyYW1lVGltZXIuaW5zdGFuY2UpXG5cdFx0RnJhbWVUaW1lci5pbnN0YW5jZT1uZXcgRnJhbWVUaW1lcigpO1xuXG5cdHJldHVybiBGcmFtZVRpbWVyLmluc3RhbmNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cz1GcmFtZVRpbWVyOyIsIi8qKlxuICogRnVuY3Rpb24gdXRpbHMuXG4gKiBAY2xhc3MgRnVuY3Rpb25VdGlsXG4gKi9cbmZ1bmN0aW9uIEZ1bmN0aW9uVXRpbCgpIHtcbn1cblxuLyoqXG4gKiBFeHRlbmQgYSBjbGFzcy5cbiAqIERvbid0IGZvcmdldCB0byBjYWxsIHN1cGVyLlxuICogQG1ldGhvZCBleHRlbmRcbiAqIEBzdGF0aWNcbiAqL1xuRnVuY3Rpb25VdGlsLmV4dGVuZD1mdW5jdGlvbih0YXJnZXQsIGJhc2UpIHtcblx0dGFyZ2V0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGJhc2UucHJvdG90eXBlKTtcblx0dGFyZ2V0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj10YXJnZXQ7XG59XG5cbi8qKlxuICogQ3JlYXRlIGRlbGVnYXRlIGZ1bmN0aW9uLiBEZXByZWNhdGVkLCB1c2UgYmluZCgpIGluc3RlYWQuXG4gKiBAbWV0aG9kIGNyZWF0ZURlbGVnYXRlXG4gKiBAZGVwcmVjYXRlZFxuICogQHN0YXRpY1xuICovXG5GdW5jdGlvblV0aWwuY3JlYXRlRGVsZWdhdGU9ZnVuY3Rpb24oZnVuYywgc2NvcGUpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGZ1bmMuYXBwbHkoc2NvcGUsYXJndW1lbnRzKTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHM9RnVuY3Rpb25VdGlsO1xuIiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG5cbi8qKlxuICogQ3JlYXRlIGEgc3ByaXRlIHdpdGggYSBncmFkaWVudC5cbiAqIEBjbGFzcyBHcmFkaWVudFxuICovXG5mdW5jdGlvbiBHcmFkaWVudCgpIHtcblx0dGhpcy53aWR0aCA9IDEwMDtcblx0dGhpcy5oZWlnaHQgPSAxMDA7XG5cdHRoaXMuc3RvcHMgPSBbXTtcbn1cblxuLyoqXG4gKiBTZXQgc2l6ZSBvZiB0aGUgZ3JhZGllbnQuXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqL1xuR3JhZGllbnQucHJvdG90eXBlLnNldFNpemUgPSBmdW5jdGlvbih3LCBoKSB7XG5cdHRoaXMud2lkdGggPSB3O1xuXHR0aGlzLmhlaWdodCA9IGg7XG59XG5cbi8qKlxuICogQWRkIGNvbG9yIHN0b3AuXG4gKiBAbWV0aG9kIGFkZENvbG9yU3RvcFxuICovXG5HcmFkaWVudC5wcm90b3R5cGUuYWRkQ29sb3JTdG9wID0gZnVuY3Rpb24od2VpZ2h0LCBjb2xvcikge1xuXHR0aGlzLnN0b3BzLnB1c2goe1xuXHRcdHdlaWdodDogd2VpZ2h0LFxuXHRcdGNvbG9yOiBjb2xvclxuXHR9KTtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIHNwcml0ZS5cbiAqIEBtZXRob2QgY3JlYXRlU3ByaXRlXG4gKi9cbkdyYWRpZW50LnByb3RvdHlwZS5jcmVhdGVTcHJpdGUgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJyZW5kZXJpbmcgZ3JhZGllbnQuLi5cIik7XG5cdHZhciBjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0Yy53aWR0aCA9IHRoaXMud2lkdGg7XG5cdGMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cblx0dmFyIGN0eCA9IGMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXHR2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIDAsIHRoaXMuaGVpZ2h0KTtcblx0dmFyIGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc3RvcHMubGVuZ3RoOyBpKyspXG5cdFx0Z3JkLmFkZENvbG9yU3RvcCh0aGlzLnN0b3BzW2ldLndlaWdodCwgdGhpcy5zdG9wc1tpXS5jb2xvcik7XG5cblx0Y3R4LmZpbGxTdHlsZSA9IGdyZDtcblx0Y3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcblxuXHRyZXR1cm4gbmV3IFBJWEkuU3ByaXRlKFBJWEkuVGV4dHVyZS5mcm9tQ2FudmFzKGMpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHcmFkaWVudDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBUaGVuYWJsZSA9IHJlcXVpcmUoXCIuL1RoZW5hYmxlXCIpO1xuXG4vKipcbiAqIE1lc3NhZ2UgY29ubmVjdGlvbiBpbiBhIGJyb3dzZXIuXG4gKiBAY2xhc3MgTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb25cbiAqL1xuZnVuY3Rpb24gTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24oKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXHR0aGlzLnRlc3QgPSAxO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLCBFdmVudERpc3BhdGNoZXIpO1xuXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNUID0gXCJjb25uZWN0XCI7XG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5NRVNTQUdFID0gXCJtZXNzYWdlXCI7XG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DTE9TRSA9IFwiY2xvc2VcIjtcblxuLyoqXG4gKiBDb25uZWN0LlxuICogQG1ldGhvZCBjb25uZWN0XG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24odXJsKSB7XG5cdHRoaXMud2ViU29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpO1xuXG5cdHRoaXMud2ViU29ja2V0Lm9ub3BlbiA9IHRoaXMub25XZWJTb2NrZXRPcGVuLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMub25XZWJTb2NrZXRNZXNzYWdlLmJpbmQodGhpcyk7XG5cdHRoaXMud2ViU29ja2V0Lm9uY2xvc2UgPSB0aGlzLm9uV2ViU29ja2V0Q2xvc2UuYmluZCh0aGlzKTtcblx0dGhpcy53ZWJTb2NrZXQub25lcnJvciA9IHRoaXMub25XZWJTb2NrZXRFcnJvci5iaW5kKHRoaXMpO1xufVxuXG4vKipcbiAqIFNlbmQuXG4gKiBAbWV0aG9kIHNlbmRcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihtKSB7XG5cdHRoaXMud2ViU29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobSkpO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgb3Blbi5cbiAqIEBtZXRob2Qgb25XZWJTb2NrZXRPcGVuXG4gKiBAcHJpdmF0ZVxuICovXG5NZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5wcm90b3R5cGUub25XZWJTb2NrZXRPcGVuID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudHJpZ2dlcihNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5DT05ORUNUKTtcbn1cblxuLyoqXG4gKiBXZWIgc29ja2V0IG1lc3NhZ2UuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0TWVzc2FnZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0TWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcblx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSk7XG5cblx0dGhpcy50cmlnZ2VyKHtcblx0XHR0eXBlOiBNZXNzYWdlV2ViU29ja2V0Q29ubmVjdGlvbi5NRVNTQUdFLFxuXHRcdG1lc3NhZ2U6IG1lc3NhZ2Vcblx0fSk7XG59XG5cbi8qKlxuICogV2ViIHNvY2tldCBjbG9zZS5cbiAqIEBtZXRob2Qgb25XZWJTb2NrZXRDbG9zZVxuICogQHByaXZhdGVcbiAqL1xuTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24ucHJvdG90eXBlLm9uV2ViU29ja2V0Q2xvc2UgPSBmdW5jdGlvbigpIHtcblx0Y29uc29sZS5sb2coXCJ3ZWIgc29ja2V0IGNsb3NlLCB3cz1cIiArIHRoaXMud2ViU29ja2V0ICsgXCIgdGhpcz1cIiArIHRoaXMudGVzdCk7XG5cdHRoaXMud2ViU29ja2V0LmNsb3NlKCk7XG5cdHRoaXMuY2xlYXJXZWJTb2NrZXQoKTtcblxuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIFdlYiBzb2NrZXQgZXJyb3IuXG4gKiBAbWV0aG9kIG9uV2ViU29ja2V0RXJyb3JcbiAqIEBwcml2YXRlXG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5vbldlYlNvY2tldEVycm9yID0gZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwid2ViIHNvY2tldCBlcnJvciwgd3M9XCIgKyB0aGlzLndlYlNvY2tldCArIFwiIHRoaXM9XCIgKyB0aGlzLnRlc3QpO1xuXG5cdHRoaXMud2ViU29ja2V0LmNsb3NlKCk7XG5cdHRoaXMuY2xlYXJXZWJTb2NrZXQoKTtcblxuXHR0aGlzLnRyaWdnZXIoTWVzc2FnZVdlYlNvY2tldENvbm5lY3Rpb24uQ0xPU0UpO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBjdXJyZW50IHdlYiBzb2NrZXQuXG4gKiBAbWV0aG9kIGNsZWFyV2ViU29ja2V0XG4gKi9cbk1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uLnByb3RvdHlwZS5jbGVhcldlYlNvY2tldCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLndlYlNvY2tldC5vbm9wZW4gPSBudWxsO1xuXHR0aGlzLndlYlNvY2tldC5vbm1lc3NhZ2UgPSBudWxsO1xuXHR0aGlzLndlYlNvY2tldC5vbmNsb3NlID0gbnVsbDtcblx0dGhpcy53ZWJTb2NrZXQub25lcnJvciA9IG51bGw7XG5cblx0dGhpcy53ZWJTb2NrZXQgPSBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VXZWJTb2NrZXRDb25uZWN0aW9uOyIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcblxuLyoqXG4gKiBNb3VzZU92ZXJHcm91cC4gVGhpcyBpcyB0aGUgY2xhc3MgZm9yIHRoZSBNb3VzZU92ZXJHcm91cC5cbiAqIEBjbGFzcyBNb3VzZU92ZXJHcm91cFxuICovXG5mdW5jdGlvbiBNb3VzZU92ZXJHcm91cCgpIHtcblx0dGhpcy5vYmplY3RzID0gbmV3IEFycmF5KCk7XG5cdHRoaXMuY3VycmVudGx5T3ZlciA9IGZhbHNlO1xuXHR0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuXG59XG5GdW5jdGlvblV0aWwuZXh0ZW5kKE1vdXNlT3Zlckdyb3VwLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuRXZlbnREaXNwYXRjaGVyLmluaXQoTW91c2VPdmVyR3JvdXApO1xuXG5cbi8qKlxuICogQWRkIGRpc3BsYXlvYmplY3QgdG8gd2F0Y2hsaXN0LlxuICogQG1ldGhvZCBhZGREaXNwbGF5T2JqZWN0XG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5hZGREaXNwbGF5T2JqZWN0ID0gZnVuY3Rpb24oZGlzcGxheU9iamVjdCkge1xuXG5cdGRpc3BsYXlPYmplY3QuaW50ZXJhY3RpdmUgPSB0cnVlO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlb3ZlckVuYWJsZWQgPSB0cnVlO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlb3ZlciA9IHRoaXMub25PYmplY3RNb3VzZU92ZXIuYmluZCh0aGlzKTtcblx0ZGlzcGxheU9iamVjdC5tb3VzZW91dCA9IHRoaXMub25PYmplY3RNb3VzZU91dC5iaW5kKHRoaXMpO1xuXHRkaXNwbGF5T2JqZWN0Lm1vdXNlZG93biA9IHRoaXMub25PYmplY3RNb3VzZURvd24uYmluZCh0aGlzKTtcblx0dGhpcy5vYmplY3RzLnB1c2goZGlzcGxheU9iamVjdCk7XG5cbn1cblxuXG4vKipcbiAqIE1vdXNlIG92ZXIgb2JqZWN0LlxuICogQG1ldGhvZCBvbk9iamVjdE1vdXNlT3ZlclxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25PYmplY3RNb3VzZU92ZXIgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0aWYodGhpcy5jdXJyZW50bHlPdmVyKVxuXHRcdHJldHVybjtcblxuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSB0cnVlO1xuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJtb3VzZW92ZXJcIik7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBvdXQgb2JqZWN0LlxuICogQG1ldGhvZCBvbk9iamVjdE1vdXNlT3V0XG4gKi9cbk1vdXNlT3Zlckdyb3VwLnByb3RvdHlwZS5vbk9iamVjdE1vdXNlT3V0ID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKCF0aGlzLmN1cnJlbnRseU92ZXIgfHwgdGhpcy5tb3VzZURvd24pXG5cdFx0cmV0dXJuO1xuXG5cdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLm9iamVjdHMubGVuZ3RoOyBpKyspXG5cdFx0aWYodGhpcy5oaXRUZXN0KHRoaXMub2JqZWN0c1tpXSwgaW50ZXJhY3Rpb25fb2JqZWN0KSlcblx0XHRcdHJldHVybjtcblxuXHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwibW91c2VvdXRcIik7XG59XG5cblxuLyoqXG4gKiBIaXQgdGVzdC5cbiAqIEBtZXRob2QgaGl0VGVzdFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUuaGl0VGVzdCA9IGZ1bmN0aW9uKG9iamVjdCwgaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdGlmKChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPiBvYmplY3QuZ2V0Qm91bmRzKCkueCApICYmIChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnggPCAob2JqZWN0LmdldEJvdW5kcygpLnggKyBvYmplY3QuZ2V0Qm91bmRzKCkud2lkdGgpKSAmJlxuXHRcdChpbnRlcmFjdGlvbl9vYmplY3QuZ2xvYmFsLnkgPiBvYmplY3QuZ2V0Qm91bmRzKCkueSkgJiYgKGludGVyYWN0aW9uX29iamVjdC5nbG9iYWwueSA8IChvYmplY3QuZ2V0Qm91bmRzKCkueSArIG9iamVjdC5nZXRCb3VuZHMoKS5oZWlnaHQpKSkge1xuXHRcdHJldHVybiB0cnVlO1x0XHRcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBkb3duIG9iamVjdC5cbiAqIEBtZXRob2Qgb25PYmplY3RNb3VzZURvd25cbiAqL1xuTW91c2VPdmVyR3JvdXAucHJvdG90eXBlLm9uT2JqZWN0TW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMubW91c2VEb3duID0gdHJ1ZTtcblx0aW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwID0gaW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwb3V0c2lkZSA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcbn1cblxuXG4vKipcbiAqIE1vdXNlIHVwIHN0YWdlLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VVcFxuICovXG5Nb3VzZU92ZXJHcm91cC5wcm90b3R5cGUub25TdGFnZU1vdXNlVXAgPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0aW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwID0gaW50ZXJhY3Rpb25fb2JqZWN0LnRhcmdldC5tb3VzZXVwb3V0c2lkZSA9IG51bGw7XG5cdHRoaXMubW91c2VEb3duID0gZmFsc2U7XG5cblx0aWYodGhpcy5jdXJyZW50bHlPdmVyKSB7XG5cdFx0dmFyIG92ZXIgPSBmYWxzZTtcblxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLm9iamVjdHMubGVuZ3RoOyBpKyspXG5cdFx0XHRpZih0aGlzLmhpdFRlc3QodGhpcy5vYmplY3RzW2ldLCBpbnRlcmFjdGlvbl9vYmplY3QpKVxuXHRcdFx0XHRvdmVyID0gdHJ1ZTtcblxuXHRcdGlmKCFvdmVyKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnRseU92ZXIgPSBmYWxzZTtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudChcIm1vdXNlb3V0XCIpO1xuXHRcdH1cblx0fVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VPdmVyR3JvdXA7XG5cbiIsInZhciBQSVhJID0gcmVxdWlyZShcInBpeGkuanNcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIE5pbmUgc2xpY2UuIFRoaXMgaXMgYSBzcHJpdGUgdGhhdCBpcyBhIGdyaWQsIGFuZCBvbmx5IHRoZVxuICogbWlkZGxlIHBhcnQgc3RyZXRjaGVzIHdoZW4gc2NhbGluZy5cbiAqIEBjbGFzcyBOaW5lU2xpY2VcbiAqL1xuZnVuY3Rpb24gTmluZVNsaWNlKHRleHR1cmUsIGxlZnQsIHRvcCwgcmlnaHQsIGJvdHRvbSkge1xuXHRQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnRleHR1cmUgPSB0ZXh0dXJlO1xuXG5cdGlmICghdG9wKVxuXHRcdHRvcCA9IGxlZnQ7XG5cblx0aWYgKCFyaWdodClcblx0XHRyaWdodCA9IGxlZnQ7XG5cblx0aWYgKCFib3R0b20pXG5cdFx0Ym90dG9tID0gdG9wO1xuXG5cdHRoaXMubGVmdCA9IGxlZnQ7XG5cdHRoaXMudG9wID0gdG9wO1xuXHR0aGlzLnJpZ2h0ID0gcmlnaHQ7XG5cdHRoaXMuYm90dG9tID0gYm90dG9tO1xuXG5cdHRoaXMubG9jYWxXaWR0aCA9IHRleHR1cmUud2lkdGg7XG5cdHRoaXMubG9jYWxIZWlnaHQgPSB0ZXh0dXJlLmhlaWdodDtcblxuXHR0aGlzLmJ1aWxkUGFydHMoKTtcblx0dGhpcy51cGRhdGVTaXplcygpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKE5pbmVTbGljZSwgUElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyKTtcblxuLyoqXG4gKiBCdWlsZCB0aGUgcGFydHMgZm9yIHRoZSBzbGljZXMuXG4gKiBAbWV0aG9kIGJ1aWxkUGFydHNcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUuYnVpbGRQYXJ0cyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgeHAgPSBbMCwgdGhpcy5sZWZ0LCB0aGlzLnRleHR1cmUud2lkdGggLSB0aGlzLnJpZ2h0LCB0aGlzLnRleHR1cmUud2lkdGhdO1xuXHR2YXIgeXAgPSBbMCwgdGhpcy50b3AsIHRoaXMudGV4dHVyZS5oZWlnaHQgLSB0aGlzLmJvdHRvbSwgdGhpcy50ZXh0dXJlLmhlaWdodF07XG5cdHZhciBoaSwgdmk7XG5cblx0dGhpcy5wYXJ0cyA9IFtdO1xuXG5cdGZvciAodmkgPSAwOyB2aSA8IDM7IHZpKyspIHtcblx0XHRmb3IgKGhpID0gMDsgaGkgPCAzOyBoaSsrKSB7XG5cdFx0XHR2YXIgdyA9IHhwW2hpICsgMV0gLSB4cFtoaV07XG5cdFx0XHR2YXIgaCA9IHlwW3ZpICsgMV0gLSB5cFt2aV07XG5cblx0XHRcdGlmICh3ICE9IDAgJiYgaCAhPSAwKSB7XG5cdFx0XHRcdHZhciB0ZXh0dXJlUGFydCA9IHRoaXMuY3JlYXRlVGV4dHVyZVBhcnQoeHBbaGldLCB5cFt2aV0sIHcsIGgpO1xuXHRcdFx0XHR2YXIgcyA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlUGFydCk7XG5cdFx0XHRcdHRoaXMuYWRkQ2hpbGQocyk7XG5cblx0XHRcdFx0dGhpcy5wYXJ0cy5wdXNoKHMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wYXJ0cy5wdXNoKG51bGwpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFVwZGF0ZSBzaXplcy5cbiAqIEBtZXRob2QgdXBkYXRlU2l6ZXNcbiAqIEBwcml2YXRlXG4gKi9cbk5pbmVTbGljZS5wcm90b3R5cGUudXBkYXRlU2l6ZXMgPSBmdW5jdGlvbigpIHtcblx0dmFyIHhwID0gWzAsIHRoaXMubGVmdCwgdGhpcy5sb2NhbFdpZHRoIC0gdGhpcy5yaWdodCwgdGhpcy5sb2NhbFdpZHRoXTtcblx0dmFyIHlwID0gWzAsIHRoaXMudG9wLCB0aGlzLmxvY2FsSGVpZ2h0IC0gdGhpcy5ib3R0b20sIHRoaXMubG9jYWxIZWlnaHRdO1xuXHR2YXIgaGksIHZpLCBpID0gMDtcblxuXHRmb3IgKHZpID0gMDsgdmkgPCAzOyB2aSsrKSB7XG5cdFx0Zm9yIChoaSA9IDA7IGhpIDwgMzsgaGkrKykge1xuXHRcdFx0aWYgKHRoaXMucGFydHNbaV0pIHtcblx0XHRcdFx0dmFyIHBhcnQgPSB0aGlzLnBhcnRzW2ldO1xuXG5cdFx0XHRcdHBhcnQucG9zaXRpb24ueCA9IHhwW2hpXTtcblx0XHRcdFx0cGFydC5wb3NpdGlvbi55ID0geXBbdmldO1xuXHRcdFx0XHRwYXJ0LndpZHRoID0geHBbaGkgKyAxXSAtIHhwW2hpXTtcblx0XHRcdFx0cGFydC5oZWlnaHQgPSB5cFt2aSArIDFdIC0geXBbdmldO1xuXHRcdFx0fVxuXG5cdFx0XHRpKys7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogU2V0IGxvY2FsIHNpemUuXG4gKiBAbWV0aG9kIHNldExvY2FsU2l6ZVxuICovXG5OaW5lU2xpY2UucHJvdG90eXBlLnNldExvY2FsU2l6ZSA9IGZ1bmN0aW9uKHcsIGgpIHtcblx0dGhpcy5sb2NhbFdpZHRoID0gdztcblx0dGhpcy5sb2NhbEhlaWdodCA9IGg7XG5cdHRoaXMudXBkYXRlU2l6ZXMoKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGV4dHVyZSBwYXJ0LlxuICogQG1ldGhvZCBjcmVhdGVUZXh0dXJlUGFydFxuICogQHByaXZhdGVcbiAqL1xuTmluZVNsaWNlLnByb3RvdHlwZS5jcmVhdGVUZXh0dXJlUGFydCA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcblx0dmFyIGZyYW1lID0ge1xuXHRcdHg6IHRoaXMudGV4dHVyZS5mcmFtZS54ICsgeCxcblx0XHR5OiB0aGlzLnRleHR1cmUuZnJhbWUueSArIHksXG5cdFx0d2lkdGg6IHdpZHRoLFxuXHRcdGhlaWdodDogaGVpZ2h0XG5cdH07XG5cblx0cmV0dXJuIG5ldyBQSVhJLlRleHR1cmUodGhpcy50ZXh0dXJlLCBmcmFtZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTmluZVNsaWNlOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgUElYSSA9IHJlcXVpcmUoXCJwaXhpLmpzXCIpO1xudmFyIFRXRUVOID0gcmVxdWlyZShcInR3ZWVuLmpzXCIpO1xudmFyIEZ1bmN0aW9uVXRpbCA9IHJlcXVpcmUoXCIuL0Z1bmN0aW9uVXRpbFwiKTtcbnZhciBDb250ZW50U2NhbGVyID0gcmVxdWlyZShcIi4vQ29udGVudFNjYWxlclwiKTtcbnZhciBGcmFtZVRpbWVyID0gcmVxdWlyZShcIi4vRnJhbWVUaW1lclwiKTtcblxuLyoqXG4gKiBQaXhpIGZ1bGwgd2luZG93IGFwcC5cbiAqIENhbiBvcGVyYXRlIHVzaW5nIHdpbmRvdyBjb29yZGluYXRlcyBvciBzY2FsZWQgdG8gc3BlY2lmaWMgYXJlYS5cbiAqIEBjbGFzcyBQaXhpQXBwXG4gKi9cbmZ1bmN0aW9uIFBpeGlBcHAoZG9tSWQsIHdpZHRoLCBoZWlnaHQpIHtcblx0UElYSS5EaXNwbGF5T2JqZWN0Q29udGFpbmVyLmNhbGwodGhpcyk7XG5cblx0dmFyIHZpZXc7XG5cblx0aWYgKG5hdmlnYXRvci5pc0NvY29vbkpTKVxuXHRcdHZpZXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JlZW5jYW52YXMnKTtcblxuXHRlbHNlXG5cdFx0dmlldyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXG5cdGlmICghZG9tSWQpIHtcblx0XHRpZiAoUGl4aUFwcC5mdWxsU2NyZWVuSW5zdGFuY2UpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IG9uZSBQaXhpQXBwIHBlciBhcHBcIik7XG5cblx0XHRQaXhpQXBwLmZ1bGxTY3JlZW5JbnN0YW5jZSA9IHRoaXM7XG5cblx0XHRjb25zb2xlLmxvZyhcIm5vIGRvbSBpdCwgYXR0YWNoaW5nIHRvIGJvZHlcIik7XG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGRvY3VtZW50LmJvZHk7XG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW4gPSAwO1xuXHRcdGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZyA9IDA7XG5cblx0XHRkb2N1bWVudC5ib2R5Lm9ucmVzaXplID0gRnVuY3Rpb25VdGlsLmNyZWF0ZURlbGVnYXRlKHRoaXMub25XaW5kb3dSZXNpemUsIHRoaXMpO1xuXHRcdHdpbmRvdy5vbnJlc2l6ZSA9IEZ1bmN0aW9uVXRpbC5jcmVhdGVEZWxlZ2F0ZSh0aGlzLm9uV2luZG93UmVzaXplLCB0aGlzKTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmxvZyhcImF0dGFjaGluZyB0bzogXCIgKyBkb21JZCk7XG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGRvbUlkKTtcblx0fVxuXG5cdHRoaXMucmVuZGVyZXIgPSBuZXcgUElYSS5hdXRvRGV0ZWN0UmVuZGVyZXIodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQsIHZpZXcpO1xuXHR0aGlzLmNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIudmlldyk7XG5cblx0dGhpcy5jb250ZW50U2NhbGVyID0gbnVsbDtcblxuXHR0aGlzLmFwcFN0YWdlID0gbmV3IFBJWEkuU3RhZ2UoMCwgdHJ1ZSk7XG5cblx0aWYgKCF3aWR0aCB8fCAhaGVpZ2h0KVxuXHRcdHRoaXMudXNlTm9TY2FsaW5nKCk7XG5cblx0ZWxzZVxuXHRcdHRoaXMudXNlU2NhbGluZyh3aWR0aCwgaGVpZ2h0KTtcblxuXHRGcmFtZVRpbWVyLmdldEluc3RhbmNlKCkuYWRkRXZlbnRMaXN0ZW5lcihGcmFtZVRpbWVyLlJFTkRFUiwgdGhpcy5vbkFuaW1hdGlvbkZyYW1lLCB0aGlzKTtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChQaXhpQXBwLCBQSVhJLkRpc3BsYXlPYmplY3RDb250YWluZXIpO1xuXG4vKipcbiAqIFVzZSBzY2FsaW5nIG1vZGUuXG4gKiBAbWV0aG9kIHVzZVNjYWxpbmdcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUudXNlU2NhbGluZyA9IGZ1bmN0aW9uKHcsIGgpIHtcblx0dGhpcy5yZW1vdmVDb250ZW50KCk7XG5cblx0dGhpcy5jb250ZW50U2NhbGVyID0gbmV3IENvbnRlbnRTY2FsZXIodGhpcyk7XG5cdHRoaXMuY29udGVudFNjYWxlci5zZXRDb250ZW50U2l6ZSh3LCBoKTtcblx0dGhpcy5jb250ZW50U2NhbGVyLnNldFNjcmVlblNpemUodGhpcy5jb250YWluZXJFbC5jbGllbnRXaWR0aCwgdGhpcy5jb250YWluZXJFbC5jbGllbnRIZWlnaHQpO1xuXHR0aGlzLmFwcFN0YWdlLmFkZENoaWxkKHRoaXMuY29udGVudFNjYWxlcik7XG59XG5cbi8qKlxuICogVXNlIG5vIHNjYWxpbmcgbW9kZS5cbiAqIEBtZXRob2QgdXNlTm9TY2FsaW5nXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLnVzZU5vU2NhbGluZyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlbW92ZUNvbnRlbnQoKTtcblxuXHR0aGlzLmFwcFN0YWdlLmFkZENoaWxkKHRoaXMpO1xufVxuXG4vKipcbiAqIFJlbW92ZSBhbnkgY29udGVudC5cbiAqIEBtZXRob2QgcmVtb3ZlQ29udGVudFxuICogQHByaXZhdGVcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUucmVtb3ZlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5hcHBTdGFnZS5jaGlsZHJlbi5pbmRleE9mKHRoaXMpID49IDApXG5cdFx0dGhpcy5hcHBTdGFnZS5yZW1vdmVDaGlsZCh0aGlzKTtcblxuXHRpZiAodGhpcy5jb250ZW50U2NhbGVyKSB7XG5cdFx0dGhpcy5hcHBTdGFnZS5yZW1vdmVDaGlsZCh0aGlzLmNvbnRlbnRTY2FsZXIpXG5cdFx0dGhpcy5jb250ZW50U2NhbGVyID0gbnVsbDtcblx0fVxufVxuXG4vKipcbiAqIFdpbmRvdyByZXNpemUuXG4gKiBAbWV0aG9kIG9uV2luZG93UmVzaXplXG4gKiBAcHJpdmF0ZVxuICovXG5QaXhpQXBwLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jb250ZW50U2NhbGVyKVxuXHRcdHRoaXMuY29udGVudFNjYWxlci5zZXRTY3JlZW5TaXplKHRoaXMuY29udGFpbmVyRWwuY2xpZW50V2lkdGgsIHRoaXMuY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0KTtcblxuXHR0aGlzLnJlbmRlcmVyLnJlc2l6ZSh0aGlzLmNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCB0aGlzLmNvbnRhaW5lckVsLmNsaWVudEhlaWdodCk7XG5cdHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuYXBwU3RhZ2UpO1xufVxuXG4vKipcbiAqIEFuaW1hdGlvbiBmcmFtZS5cbiAqIEBtZXRob2Qgb25BbmltYXRpb25GcmFtZVxuICogQHByaXZhdGVcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUub25BbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcFN0YWdlKTtcblx0VFdFRU4udXBkYXRlKCk7XG59XG5cbi8qKlxuICogR2V0IGNhbnZhcy5cbiAqIEBtZXRob2QgZ2V0Q2FudmFzXG4gKi9cblBpeGlBcHAucHJvdG90eXBlLmdldENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5yZW5kZXJlci52aWV3O1xufVxuXG4vKipcbiAqIEdldCBzdGFnZS5cbiAqIEBtZXRob2QgZ2V0U3RhZ2VcbiAqL1xuUGl4aUFwcC5wcm90b3R5cGUuZ2V0U3RhZ2UgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuYXBwU3RhZ2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGl4aUFwcDsiLCIvKipcbiAqIFJlcHJlc2VudHMgYSBwb2ludC5cbiAqIEBjbGFzcyBQb2ludFxuICovXG5mdW5jdGlvbiBQb2ludCh4LCB5KSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBQb2ludCkpXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcblxuXHR0aGlzLnggPSB4O1xuXHR0aGlzLnkgPSB5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50OyIsInZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIFBlcmZvcm0gdGFza3MgaW4gYSBzZXF1ZW5jZS5cbiAqIFRhc2tzLCB3aGljaCBzaG91bGQgYmUgZXZlbnQgZGlzcGF0Y2hlcnMsXG4gKiBhcmUgZXVxdWV1ZWQgd2l0aCB0aGUgZW5xdWV1ZSBmdW5jdGlvbixcbiAqIGEgU1RBUlQgZXZlbnQgaXMgZGlzcGF0Y2hlciB1cG9uIHRhc2tcbiAqIHN0YXJ0LCBhbmQgdGhlIHRhc2sgaXMgY29uc2lkZXJlZCBjb21wbGV0ZVxuICogYXMgaXQgZGlzcGF0Y2hlcyBhIENPTVBMRVRFIGV2ZW50LlxuICogQGNsYXNzIFNlcXVlbmNlclxuICovXG5mdW5jdGlvbiBTZXF1ZW5jZXIoKSB7XG5cdEV2ZW50RGlzcGF0Y2hlci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMucXVldWUgPSBbXTtcblx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XG5cdHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlID0gdGhpcy5vblRhc2tDb21wbGV0ZS5iaW5kKHRoaXMpO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFNlcXVlbmNlciwgRXZlbnREaXNwYXRjaGVyKTtcblxuU2VxdWVuY2VyLlNUQVJUID0gXCJzdGFydFwiO1xuU2VxdWVuY2VyLkNPTVBMRVRFID0gXCJjb21wbGV0ZVwiO1xuXG4vKipcbiAqIEVucXVldWUgYSB0YXNrIHRvIGJlIHBlcmZvcm1lZC5cbiAqIEBtZXRob2QgZW5xdWV1ZVxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLmVucXVldWUgPSBmdW5jdGlvbih0YXNrKSB7XG5cdGlmICghdGhpcy5jdXJyZW50VGFzaylcblx0XHR0aGlzLnN0YXJ0VGFzayh0YXNrKVxuXG5cdGVsc2Vcblx0XHR0aGlzLnF1ZXVlLnB1c2godGFzayk7XG59XG5cbi8qKlxuICogU3RhcnQgdGhlIHRhc2suXG4gKiBAbWV0aG9kIHN0YXJ0VGFza1xuICogQHByaXZhdGVcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5zdGFydFRhc2sgPSBmdW5jdGlvbih0YXNrKSB7XG5cdHRoaXMuY3VycmVudFRhc2sgPSB0YXNrO1xuXG5cdHRoaXMuY3VycmVudFRhc2suYWRkRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0dGhpcy5jdXJyZW50VGFzay5kaXNwYXRjaEV2ZW50KHtcblx0XHR0eXBlOiBTZXF1ZW5jZXIuU1RBUlRcblx0fSk7XG59XG5cbi8qKlxuICogVGhlIGN1cnJlbnQgdGFzayBpcyBjb21wbGV0ZS5cbiAqIEBtZXRob2Qgb25UYXNrQ29tcGxldGVcbiAqwqBAcHJpdmF0ZVxuICovXG5TZXF1ZW5jZXIucHJvdG90eXBlLm9uVGFza0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY3VycmVudFRhc2sucmVtb3ZlRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0dGhpcy5jdXJyZW50VGFzayA9IG51bGw7XG5cblx0aWYgKHRoaXMucXVldWUubGVuZ3RoID4gMClcblx0XHR0aGlzLnN0YXJ0VGFzayh0aGlzLnF1ZXVlLnNoaWZ0KCkpO1xuXG5cdGVsc2Vcblx0XHR0aGlzLnRyaWdnZXIoU2VxdWVuY2VyLkNPTVBMRVRFKTtcblxufVxuXG4vKipcbiAqIEFib3J0IHRoZSBzZXF1ZW5jZS5cbiAqIEBtZXRob2QgYWJvcnRcbiAqL1xuU2VxdWVuY2VyLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRpZiAodGhpcy5jdXJyZW50VGFzaykge1xuXHRcdHRoaXMuY3VycmVudFRhc2sucmVtb3ZlRXZlbnRMaXN0ZW5lcihTZXF1ZW5jZXIuQ09NUExFVEUsIHRoaXMub25UYXNrQ29tcGxldGVDbG9zdXJlKTtcblx0XHR0aGlzLmN1cnJlbnRUYXNrID0gbnVsbDtcblx0fVxuXG5cdHRoaXMucXVldWUgPSBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXF1ZW5jZXI7IiwidmFyIFBJWEkgPSByZXF1aXJlKFwicGl4aS5qc1wiKTtcbnZhciBUV0VFTiA9IHJlcXVpcmUoXCJ0d2Vlbi5qc1wiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZShcIi4vRXZlbnREaXNwYXRjaGVyXCIpO1xuXG4vKipcbiAqIFNsaWRlci4gVGhpcyBpcyB0aGUgY2xhc3MgZm9yIHRoZSBzbGlkZXIuXG4gKiBAY2xhc3MgU2xpZGVyXG4gKi9cbmZ1bmN0aW9uIFNsaWRlcihiYWNrZ3JvdW5kLCBrbm9iKSB7XG5cdFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lci5jYWxsKHRoaXMpO1xuXG5cdHRoaXMuYmFja2dyb3VuZCA9IGJhY2tncm91bmQ7XG5cdHRoaXMua25vYiA9IGtub2I7XG5cblx0dGhpcy5hZGRDaGlsZCh0aGlzLmJhY2tncm91bmQpO1xuXHR0aGlzLmFkZENoaWxkKHRoaXMua25vYik7XG5cblxuXHR0aGlzLmtub2IuYnV0dG9uTW9kZSA9IHRydWU7XG5cdHRoaXMua25vYi5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdHRoaXMua25vYi5tb3VzZWRvd24gPSB0aGlzLm9uS25vYk1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXG5cdHRoaXMuYmFja2dyb3VuZC5idXR0b25Nb2RlID0gdHJ1ZTtcblx0dGhpcy5iYWNrZ3JvdW5kLmludGVyYWN0aXZlID0gdHJ1ZTtcblx0dGhpcy5iYWNrZ3JvdW5kLm1vdXNlZG93biA9IHRoaXMub25CYWNrZ3JvdW5kTW91c2VEb3duLmJpbmQodGhpcyk7XG5cblx0dGhpcy5mYWRlVHdlZW4gPSBudWxsO1xuXHR0aGlzLmFscGhhID0gMDtcbn1cblxuRnVuY3Rpb25VdGlsLmV4dGVuZChTbGlkZXIsIFBJWEkuRGlzcGxheU9iamVjdENvbnRhaW5lcik7XG5FdmVudERpc3BhdGNoZXIuaW5pdChTbGlkZXIpO1xuXG5cbi8qKlxuICogTW91c2UgZG93biBvbiBrbm9iLlxuICogQG1ldGhvZCBvbktub2JNb3VzZURvd25cbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vbktub2JNb3VzZURvd24gPSBmdW5jdGlvbihpbnRlcmFjdGlvbl9vYmplY3QpIHtcblx0dGhpcy5kb3duUG9zID0gdGhpcy5rbm9iLnBvc2l0aW9uLng7XG5cdHRoaXMuZG93blggPSBpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54O1xuXG5cdHRoaXMuc3RhZ2UubW91c2V1cCA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcblx0dGhpcy5zdGFnZS5tb3VzZW1vdmUgPSB0aGlzLm9uU3RhZ2VNb3VzZU1vdmUuYmluZCh0aGlzKTtcbn1cblxuXG4vKipcbiAqIE1vdXNlIGRvd24gb24gYmFja2dyb3VuZC5cbiAqIEBtZXRob2Qgb25CYWNrZ3JvdW5kTW91c2VEb3duXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25CYWNrZ3JvdW5kTW91c2VEb3duID0gZnVuY3Rpb24oaW50ZXJhY3Rpb25fb2JqZWN0KSB7XG5cdHRoaXMuZG93blggPSBpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54O1xuXHR0aGlzLmtub2IueCA9IGludGVyYWN0aW9uX29iamVjdC5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpLnggLSB0aGlzLmtub2Iud2lkdGgqMC41O1xuXG5cdHRoaXMudmFsaWRhdGVWYWx1ZSgpO1xuXG5cdHRoaXMuZG93blBvcyA9IHRoaXMua25vYi5wb3NpdGlvbi54O1xuXG5cdHRoaXMuc3RhZ2UubW91c2V1cCA9IHRoaXMub25TdGFnZU1vdXNlVXAuYmluZCh0aGlzKTtcblx0dGhpcy5zdGFnZS5tb3VzZW1vdmUgPSB0aGlzLm9uU3RhZ2VNb3VzZU1vdmUuYmluZCh0aGlzKTtcblxuXHR0aGlzLmRpc3BhdGNoRXZlbnQoXCJjaGFuZ2VcIik7XG59XG5cblxuLyoqXG4gKiBNb3VzZSB1cC5cbiAqIEBtZXRob2Qgb25TdGFnZU1vdXNlVXBcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vblN0YWdlTW91c2VVcCA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLnN0YWdlLm1vdXNldXAgPSBudWxsO1xuXHR0aGlzLnN0YWdlLm1vdXNlbW92ZSA9IG51bGw7XG59XG5cblxuLyoqXG4gKiBNb3VzZSBtb3ZlLlxuICogQG1ldGhvZCBvblN0YWdlTW91c2VNb3ZlXG4gKi9cblNsaWRlci5wcm90b3R5cGUub25TdGFnZU1vdXNlTW92ZSA9IGZ1bmN0aW9uKGludGVyYWN0aW9uX29iamVjdCkge1xuXHR0aGlzLmtub2IueCA9IHRoaXMuZG93blBvcyArIChpbnRlcmFjdGlvbl9vYmplY3QuZ2V0TG9jYWxQb3NpdGlvbih0aGlzKS54IC0gdGhpcy5kb3duWCk7XG5cblx0dGhpcy52YWxpZGF0ZVZhbHVlKCk7XG5cblx0dGhpcy5kaXNwYXRjaEV2ZW50KFwiY2hhbmdlXCIpO1xufVxuXG5cbi8qKlxuICogVmFsaWRhdGUgcG9zaXRpb24uXG4gKiBAbWV0aG9kIHZhbGlkYXRlVmFsdWVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS52YWxpZGF0ZVZhbHVlID0gZnVuY3Rpb24oKSB7XG5cblx0aWYodGhpcy5rbm9iLnggPCAwKVxuXHRcdHRoaXMua25vYi54ID0gMDtcblxuXHRpZih0aGlzLmtub2IueCA+ICh0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGgpKVxuXHRcdHRoaXMua25vYi54ID0gdGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoO1xufVxuXG5cbi8qKlxuICogR2V0IHZhbHVlLlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICovXG5TbGlkZXIucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oKSB7XG5cdHZhciBmcmFjdGlvbiA9IHRoaXMua25vYi5wb3NpdGlvbi54Lyh0aGlzLmJhY2tncm91bmQud2lkdGggLSB0aGlzLmtub2Iud2lkdGgpO1xuXG5cdHJldHVybiBmcmFjdGlvbjtcbn1cblxuXG4vKipcbiAqIEdldCB2YWx1ZS5cbiAqIEBtZXRob2QgZ2V0VmFsdWVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHRoaXMua25vYi54ID0gdGhpcy5iYWNrZ3JvdW5kLnBvc2l0aW9uLnggKyB2YWx1ZSoodGhpcy5iYWNrZ3JvdW5kLndpZHRoIC0gdGhpcy5rbm9iLndpZHRoKTtcblxuXHR0aGlzLnZhbGlkYXRlVmFsdWUoKTtcblx0cmV0dXJuIHRoaXMuZ2V0VmFsdWUoKTtcbn1cblxuXG4vKipcbiAqIFNob3cuXG4gKiBAbWV0aG9kIHNob3dcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdGlmKHRoaXMuZmFkZVR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy5mYWRlVHdlZW4uc3RvcCgpO1xuXHR0aGlzLmZhZGVUd2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxuXHRcdFx0LnRvKHthbHBoYTogMX0sIDI1MClcblx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIEhpZGUuXG4gKiBAbWV0aG9kIGhpZGVcbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24oKSB7XG5cdGlmKHRoaXMuZmFkZVR3ZWVuICE9IG51bGwpXG5cdFx0dGhpcy5mYWRlVHdlZW4uc3RvcCgpO1xuXHR0aGlzLmZhZGVUd2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxuXHRcdFx0LnRvKHthbHBoYTogMH0sIDI1MClcblx0XHRcdC5vbkNvbXBsZXRlKHRoaXMub25IaWRkZW4uYmluZCh0aGlzKSlcblx0XHRcdC5zdGFydCgpO1xufVxuXG4vKipcbiAqIE9uIGhpZGRlbi5cbiAqIEBtZXRob2Qgb25IaWRkZW5cbiAqL1xuU2xpZGVyLnByb3RvdHlwZS5vbkhpZGRlbiA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnZpc2libGUgPSBmYWxzZTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcjtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKFwiLi9FdmVudERpc3BhdGNoZXJcIik7XG52YXIgRnVuY3Rpb25VdGlsID0gcmVxdWlyZShcIi4vRnVuY3Rpb25VdGlsXCIpO1xuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIHByb21pc2VzIGFzIGRlZmluZWQgaGVyZTpcbiAqIGh0dHA6Ly9wcm9taXNlcy1hcGx1cy5naXRodWIuaW8vcHJvbWlzZXMtc3BlYy9cbiAqIEBjbGFzcyBUaGVuYWJsZVxuICovXG5mdW5jdGlvbiBUaGVuYWJsZSgpIHtcblx0RXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcylcblxuXHR0aGlzLnN1Y2Nlc3NIYW5kbGVycyA9IFtdO1xuXHR0aGlzLmVycm9ySGFuZGxlcnMgPSBbXTtcblx0dGhpcy5ub3RpZmllZCA9IGZhbHNlO1xuXHR0aGlzLmhhbmRsZXJzQ2FsbGVkID0gZmFsc2U7XG5cdHRoaXMubm90aWZ5UGFyYW0gPSBudWxsO1xufVxuXG5GdW5jdGlvblV0aWwuZXh0ZW5kKFRoZW5hYmxlLCBFdmVudERpc3BhdGNoZXIpO1xuXG4vKipcbiAqIFNldCByZXNvbHV0aW9uIGhhbmRsZXJzLlxuICogQG1ldGhvZCB0aGVuXG4gKiBAcGFyYW0gc3VjY2VzcyBUaGUgZnVuY3Rpb24gY2FsbGVkIHRvIGhhbmRsZSBzdWNjZXNzLlxuICogQHBhcmFtIGVycm9yIFRoZSBmdW5jdGlvbiBjYWxsZWQgdG8gaGFuZGxlIGVycm9yLlxuICogQHJldHVybiBUaGlzIFRoZW5hYmxlIGZvciBjaGFpbmluZy5cbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihzdWNjZXNzLCBlcnJvcikge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgdXNlZC5cIik7XG5cblx0dGhpcy5zdWNjZXNzSGFuZGxlcnMucHVzaChzdWNjZXNzKTtcblx0dGhpcy5lcnJvckhhbmRsZXJzLnB1c2goZXJyb3IpO1xuXG5cdHJldHVybiB0aGlzO1xufVxuXG4vKipcbiAqIE5vdGlmeSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gKiBAbWV0aG9kIG5vdGlmeVN1Y2Nlc3NcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLm5vdGlmeVN1Y2Nlc3MgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgbm90aWZpZWQuXCIpO1xuXG5cdHRoaXMubm90aWZ5UGFyYW0gPSBwYXJhbTtcblx0c2V0VGltZW91dCh0aGlzLmRvTm90aWZ5U3VjY2Vzcy5iaW5kKHRoaXMpLCAwKTtcbn1cblxuLyoqXG4gKiBOb3RpZnkgZmFpbHVyZSBvZiB0aGUgb3BlcmF0aW9uLlxuICogQG1ldGhvZCBub3RpZnlFcnJvclxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUubm90aWZ5RXJyb3IgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHRoZW5hYmxlIGlzIGFscmVhZHkgbm90aWZpZWQuXCIpO1xuXG5cdHRoaXMubm90aWZ5UGFyYW0gPSBwYXJhbTtcblx0c2V0VGltZW91dCh0aGlzLmRvTm90aWZ5RXJyb3IuYmluZCh0aGlzKSwgMCk7XG59XG5cbi8qKlxuICogQWN0dWFsbHkgbm90aWZ5IHN1Y2Nlc3MuXG4gKiBAbWV0aG9kIGRvTm90aWZ5U3VjY2Vzc1xuICogQHByaXZhdGVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLmRvTm90aWZ5U3VjY2VzcyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG5cdGlmIChwYXJhbSlcblx0XHR0aGlzLm5vdGlmeVBhcmFtID0gcGFyYW07XG5cblx0dGhpcy5jYWxsSGFuZGxlcnModGhpcy5zdWNjZXNzSGFuZGxlcnMpO1xufVxuXG4vKipcbiAqIEFjdHVhbGx5IG5vdGlmeSBlcnJvci5cbiAqIEBtZXRob2QgZG9Ob3RpZnlFcnJvclxuICogQHByaXZhdGVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLmRvTm90aWZ5RXJyb3IgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jYWxsSGFuZGxlcnModGhpcy5lcnJvckhhbmRsZXJzKTtcbn1cblxuLyoqXG4gKiBDYWxsIGhhbmRsZXJzLlxuICogQG1ldGhvZCBjYWxsSGFuZGxlcnNcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5jYWxsSGFuZGxlcnMgPSBmdW5jdGlvbihoYW5kbGVycykge1xuXHRpZiAodGhpcy5oYW5kbGVyc0NhbGxlZClcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgbmV2ZXIgaGFwcGVuLlwiKTtcblxuXHR0aGlzLmhhbmRsZXJzQ2FsbGVkID0gdHJ1ZTtcblxuXHRmb3IgKHZhciBpIGluIGhhbmRsZXJzKSB7XG5cdFx0aWYgKGhhbmRsZXJzW2ldKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRoYW5kbGVyc1tpXS5jYWxsKG51bGwsIHRoaXMubm90aWZ5UGFyYW0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRXhjZXB0aW9uIGluIFRoZW5hYmxlIGhhbmRsZXI6IFwiICsgZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIFJlc29sdmUgcHJvbWlzZS5cbiAqIEBtZXRob2QgcmVzb2x2ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHR0aGlzLm5vdGlmeVN1Y2Nlc3MocmVzdWx0KTtcbn1cblxuLyoqXG4gKiBSZWplY3QgcHJvbWlzZS5cbiAqIEBtZXRob2QgcmVqZWN0XG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5yZWplY3QgPSBmdW5jdGlvbihyZWFzb24pIHtcblx0dGhpcy5ub3RpZnlFcnJvcihyZWFzb24pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRoZW5hYmxlOyJdfQ==
