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
},{"pixi.js":4}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var PixiApp = require("../../utils/PixiApp");
var ContentScaler = require("../../utils/ContentScaler");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");
var Resources = require("../resources/Resources");
var ViewConfig = require("../resources/ViewConfig");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient(domId) {
	PixiApp.call(this, domId, 960, 720);

	this.setContentAlign(ContentScaler.TOP);

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.loadingScreen.show("LOADING");

	this.url = null;
	this.tableId = null;
	this.viewConfig = new ViewConfig();
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
	console.log("****** running view case: " + viewCase);
	this.viewCase = viewCase;
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
	if ((Resources.getInstance().skin != null) && (Resources.getInstance().skin.textures != null)) {
		for (var i = 0; i < Resources.getInstance().skin.textures.length; i++) {
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

	this.netPokerClientView = new NetPokerClientView(this.viewConfig);
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

	var initMessage = new InitMessage(this.token);

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
NetPokerClient.prototype.onStateCompleteMessage = function() {
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
},{"../../proto/ProtoConnection":35,"../../proto/messages/InitMessage":52,"../../proto/messages/StateCompleteMessage":63,"../../utils/ContentScaler":72,"../../utils/FunctionUtil":74,"../../utils/MessageWebSocketConnection":76,"../../utils/PixiApp":79,"../controller/NetPokerClientController":10,"../resources/Resources":14,"../resources/ViewConfig":15,"../view/LoadingScreen":24,"../view/NetPokerClientView":25,"pixi.js":4}],7:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var ShowDialogMessage = require("../../proto/messages/ShowDialogMessage");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var ChatMessage = require("../../proto/messages/ChatMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var HandInfoMessage = require("../../proto/messages/HandInfoMessage");
var PresetButtonsMessage = require("../../proto/messages/PresetButtonsMessage");
var InterfaceStateMessage = require("../../proto/messages/InterfaceStateMessage");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");

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
	this.messageSequencer.addMessageHandler(HandInfoMessage.TYPE, this.onHandInfoMessage, this);
	this.messageSequencer.addMessageHandler(InterfaceStateMessage.TYPE, this.onInterfaceStateMessage, this);
	this.messageSequencer.addMessageHandler(CheckboxMessage.TYPE, this.onCheckboxMessage, this);

	this.messageSequencer.addMessageHandler(PresetButtonsMessage.TYPE, this.onPresetButtons, this);
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
 * PresetButtons message.
 * @method onPresetButtons
 */
InterfaceController.prototype.onPresetButtons = function(m) {
	var presetButtonsView = this.view.getPresetButtonsView();

	var buttons = presetButtonsView.getButtons();
	for (var i = 0; i < buttons.length; i++) {
		if (i > m.buttons.length) {
			buttons[i].hide();
		} else {
			var data = m.buttons[i];

			if (data == null) {
				buttons[i].hide();
			} else {
				buttons[i].show(data.button, data.value);
			}
		}
	}

	presetButtonsView.setCurrent(m.current);
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
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setTableInfoText(m.getText());
}

/**
 * Handle hand info message.
 * @method onHandInfoMessage
 */
InterfaceController.prototype.onHandInfoMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setHandInfoText(m.getText());
}

/**
 * Handle interface state message.
 * @method onInterfaceStateMessage
 */
InterfaceController.prototype.onInterfaceStateMessage = function(m) {
	var settingsView = this.view.getSettingsView();

	settingsView.setVisibleButtons(m.getVisibleButtons());
}

/**
 * Handle checkbox message.
 * @method onCheckboxMessage
 */
InterfaceController.prototype.onCheckboxMessage = function(m) {
	console.log(m);

	var settingsView = this.view.getSettingsView();

	settingsView.setCheckboxChecked(m.getId(), m.getChecked());
}

module.exports = InterfaceController;
},{"../../proto/messages/ButtonsMessage":42,"../../proto/messages/ChatMessage":43,"../../proto/messages/CheckboxMessage":44,"../../proto/messages/HandInfoMessage":51,"../../proto/messages/InterfaceStateMessage":53,"../../proto/messages/PresetButtonsMessage":59,"../../proto/messages/ShowDialogMessage":62,"../../proto/messages/TableInfoMessage":66}],8:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/Sequencer":81}],9:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/EventDispatcher":73,"../../utils/Sequencer":81,"./MessageSequenceItem":8}],10:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var FunctionUtil = require("../../utils/FunctionUtil");
var MessageSequencer = require("./MessageSequencer");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonsView = require("../view/ButtonsView");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");
var PresetButtonClickMessage = require("../../proto/messages/PresetButtonClickMessage");
var NetPokerClientView = require("../view/NetPokerClientView");
var DialogView = require("../view/DialogView");
var SettingsView = require("../view/SettingsView");
var TableController = require("./TableController");
var InterfaceController = require("./InterfaceController");
var ChatMessage = require("../../proto/messages/ChatMessage");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ButtonData = require("../../proto/data/ButtonData");
var PresetButtonsView = require("../view/PresetButtonsView");

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
	this.netPokerClientView.settingsView.addEventListener(SettingsView.CHECKBOX_CHANGE, this.onCheckboxChange, this);

	this.netPokerClientView.getPresetButtonsView().addEventListener(PresetButtonsView.CHANGE, this.onPresetButtonsChange, this);
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
NetPokerClientController.prototype.onViewChat = function(e) {
	var message = new ChatMessage();
	message.user = "";
	message.text = e.text;

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

/**
 * PresetButtons change message.
 * @method onPresetButtonsChange
 */
NetPokerClientController.prototype.onPresetButtonsChange = function() {
	var presetButtonsView = this.netPokerClientView.getPresetButtonsView();
	var message = new PresetButtonClickMessage();

	var c = presetButtonsView.getCurrent();
	if (c != null) {
		message.button = c.id;
		message.value = c.value;
	}

	this.protoConnection.send(message);
}

/**
 * Checkbox change.
 * @method onCheckboxChange
 */
NetPokerClientController.prototype.onCheckboxChange = function(ev) {
	this.protoConnection.send(new CheckboxMessage(ev.checkboxId, ev.checked));
}

module.exports = NetPokerClientController;
},{"../../proto/ProtoConnection":35,"../../proto/data/ButtonData":36,"../../proto/messages/ButtonClickMessage":41,"../../proto/messages/ChatMessage":43,"../../proto/messages/CheckboxMessage":44,"../../proto/messages/PresetButtonClickMessage":58,"../../proto/messages/SeatClickMessage":60,"../../utils/FunctionUtil":74,"../view/ButtonsView":17,"../view/DialogView":23,"../view/NetPokerClientView":25,"../view/PresetButtonsView":28,"../view/SettingsView":32,"./InterfaceController":7,"./MessageSequencer":9,"./TableController":11}],11:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../proto/messages/ActionMessage":38,"../../proto/messages/BetMessage":39,"../../proto/messages/BetsToPotMessage":40,"../../proto/messages/ClearMessage":45,"../../proto/messages/CommunityCardsMessage":46,"../../proto/messages/DealerButtonMessage":47,"../../proto/messages/DelayMessage":48,"../../proto/messages/FoldCardsMessage":50,"../../proto/messages/PayOutMessage":54,"../../proto/messages/PocketCardsMessage":55,"../../proto/messages/PotMessage":56,"../../proto/messages/SeatInfoMessage":61,"../../proto/messages/TimerMessage":68,"../../utils/EventDispatcher":73}],12:[function(require,module,exports){
NetPokerClient = require("./app/NetPokerClient");
//var netPokerClient = new NetPokerClient();

},{"./app/NetPokerClient":6}],13:[function(require,module,exports){
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
/**
 * Client.
 * @module client
 */

"use strict";

var PIXI = require("pixi.js");
var Point = require("../../utils/Point");
var DefaultSkin = require("./DefaultSkin");

/**
 * Client resources
 * @class Resources
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
},{"../../utils/Point":80,"./DefaultSkin":13,"pixi.js":4}],15:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

/**
 * View configuration.
 * @class ViewConfig
 */
function ViewConfig() {
	this.playAnimations = true;
}

/**
 * Should we play animations?
 * @method setPlayAnimations
 */
ViewConfig.prototype.setPlayAnimations = function(value) {
	this.playAnimations = value;
}

/**
 * Should we play animations?
 * @method getPlayAnimations
 */
ViewConfig.prototype.getPlayAnimations = function() {
	return this.playAnimations;
}

/**
 * Scale animation time.
 * @method scaleAnimationTime
 */
ViewConfig.prototype.scaleAnimationTime = function(millis) {
	if (this.playAnimations)
		return millis;

	return 1;
}

module.exports = ViewConfig;
},{}],16:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/Button":70,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4}],17:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
	sliderBackground.setLocalSize(300,sliderBackground.height);
	//sliderBackground.width = 300;

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
	this.slider.visible = false;
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
},{"../../utils/Button":70,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/NineSlice":78,"../../utils/Slider":82,"../resources/Resources":14,"./BigButton":16,"./RaiseShortcutButton":29,"pixi.js":4}],18:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * A card view.
 * @class CardView
 */
function CardView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.viewConfig = viewConfig;


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
	if (!animate) {
		this.visible = true;
		this.onShowComplete();
		return;
	}
	this.mask.height = this.height;

	var destination = {
		x: this.position.x,
		y: this.position.y
	};
	this.position.x = (this.parent.width - this.width) * 0.5;
	this.position.y = -this.height;

	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX * diffX + diffY * diffY);

	var tween = new TWEEN.Tween(this.position)
		//            .delay(delay)
		.to({
			x: destination.x,
			y: destination.y
		}, this.viewConfig.scaleAnimationTime(500))
		.easing(TWEEN.Easing.Quadratic.Out)
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
	if (this.cardData.isShown()) {
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
		y: this.targetPosition.y + 80
	};

	var time = this.viewConfig.scaleAnimationTime(500);
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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],19:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
	this.mouseOverGroup.addEventListener("mousedown", this.onChatFieldMouseDown, this);
	this.mouseOverGroup.addEventListener("mouseup", this.onChatFieldMouseUp, this);

	chatPlate.touchstart = this.onChatFieldMouseDown.bind(this);


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
 * On mouse down
 * @method onChatFieldMouseDown
 */
ChatView.prototype.onChatFieldMouseDown = function(interaction_object) {
	interaction_object.target.touchend = interaction_object.target.touchendoutside = this.onChatFieldMouseUp.bind(this);
	interaction_object.target.touchmove = this.onChatFieldMouseMove.bind(this);
	this.startMousePos = interaction_object.global.y;
	this.startPos = this.chatText.y;
	this.slider.show();
}

/**
 * On mouse up
 * @method onChatFieldMouseUp
 */
ChatView.prototype.onChatFieldMouseUp = function(interaction_object) {
	interaction_object.target.touchend = interaction_object.target.touchendoutside = null;
	interaction_object.target.touchmove = null;
	this.slider.hide();
}

/**
 * On mouse up
 * @method onChatFieldMouseUp
 */
ChatView.prototype.onChatFieldMouseMove = function(interaction_object) {
	var pos = interaction_object.global.y;
	var diff = pos - this.startMousePos;

	this.slider.setValue((-(this.startPos + diff)) / (this.chatText.height + this.margin - this.chatMask.height));
 	this.onSliderChange();
}

/**
 * On key down
 * @method onKeyDown
 */
 ChatView.prototype.onKeyDown = function(event) {
	if(event.keyCode == 13) {
		this.dispatchEvent("chat", {text: this.inputField.text});
		
		this.inputField.setText("");
		
	}
 }



module.exports = ChatView;

},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/MouseOverGroup":77,"../../utils/NineSlice":78,"../../utils/Slider":82,"../resources/Resources":14,"PixiTextInput":1,"pixi.js":4}],20:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * A chips view.
 * @class ChipsView
 */
function ChipsView(viewConfig, showToolTip) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.viewConfig = viewConfig;

	this.align = Resources.getInstance().Align.Left;

	this.value = 0;

	this.denominations = [500000, 100000, 25000, 5000, 1000, 500, 100, 25, 5, 1];

	this.stackClips = new Array();
	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.toolTip = null;

	if (showToolTip) {
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
	if (!align)
		throw new Error("unknown alignment: " + align);

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

	for (var i = 0; i < this.stackClips.length; i++)
		this.holder.removeChild(this.stackClips[i]);

	this.stackClips = new Array();

	if (this.toolTip != null)
		this.toolTip.text = "Bet: " + this.value.toString();

	var i;
	var stackClip = null;
	var stackPos = 0;
	var chipPos = 0;
	var textures = Resources.getInstance().getTextures("chips");

	for (i = 0; i < this.denominations.length; i++) {
		var denomination = this.denominations[i];

		chipPos = 0;
		stackClip = null;
		while (value >= denomination) {
			if (stackClip == null) {
				stackClip = new PIXI.DisplayObjectContainer();
				stackClip.x = stackPos;
				stackPos += 40;
				this.holder.addChild(stackClip);
				this.stackClips.push(stackClip);
			}
			var texture = textures[i % textures.length];
			var chip = new PIXI.Sprite(texture);
			chip.position.y = chipPos;
			chipPos -= 5;
			stackClip.addChild(chip);
			value -= denomination;

			var denominationString;

			if (denomination >= 1000)
				denominationString = Math.round(denomination / 1000) + "K";

			else
				denominationString = denomination;

			if ((stackClip != null) && (value < denomination)) {

				var textField = new PIXI.Text(denominationString, {
					font: "bold 12px Arial",
					align: "center",
					fill: Resources.getInstance().getValue("chipsColors")[i % Resources.getInstance().getValue("chipsColors").length]
				});
				textField.position.x = (stackClip.width - textField.width) * 0.5;
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
		case Resources.getInstance().Align.Left:
			{
				this.holder.x = 0;
				break;
			}

		case Resources.getInstance().Align.Center:
			{
				this.holder.x = -this.holder.width / 2;
				break;
			}

		case Resources.getInstance().Align.Right:
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

	var destination = {
		x: this.targetPosition.x,
		y: this.targetPosition.y
	};
	this.position.x = (this.parent.width - this.width) * 0.5;
	this.position.y = -this.height;

	var diffX = this.position.x - destination.x;
	var diffY = this.position.y - destination.y;
	var diff = Math.sqrt(diffX * diffX + diffY * diffY);

	var tween = new TWEEN.Tween(this.position)
		.to({
			x: destination.x,
			y: destination.y
		}, 3 * diff)
		.easing(TWEEN.Easing.Quadratic.Out)
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
		case Resources.getInstance().Align.Left:
			o.x = Resources.getInstance().getPoint("potPosition").x - this.width / 2;

		case Resources.getInstance().Align.Center:
			o.x = Resources.getInstance().getPoint("potPosition").x;

		case Resources.getInstance().Align.Right:
			o.x = Resources.getInstance().getPoint("potPosition").x + this.width / 2;
	}

	var time = this.viewConfig.scaleAnimationTime(500);
	var tween = new TWEEN.Tween(this)
		.to({
			y: Resources.getInstance().getPoint("potPosition").y,
			x: o.x
		}, time)
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
		case Resources.getInstance().Align.Left:
			this.position.x = Resources.getInstance().getPoint("potPosition").x - this.width / 2;

		case Resources.getInstance().Align.Center:
			this.position.x = Resources.getInstance().getPoint("potPosition").x;

		case Resources.getInstance().Align.Right:
			this.position.x = Resources.getInstance().getPoint("potPosition").x + this.width / 2;
	}

	var o = {
		x: this.targetPosition.x,
		y: this.targetPosition.y
	};

	var time = this.viewConfig.scaleAnimationTime(500);
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
	var tween = new TWEEN.Tween({
			x: 0
		})
		.to({
			x: 10
		}, time)
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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],21:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");

/**
 * Dialog view.
 * @class DealerButtonView
 */
function DealerButtonView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;

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
		}, this.viewConfig.scaleAnimationTime(5 * diff))
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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],22:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/Button":70,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4}],23:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
	cover.drawRect(-1000, -1000, 960 + 2000, 720 + 2000);
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
},{"../../proto/data/ButtonData":36,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/NineSlice":78,"../resources/Resources":14,"./DialogButton":22,"PixiTextInput":1,"pixi.js":4}],24:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
	s.position.x=-1000;
	s.position.y=-1000;
	s.width = 960+2000;
	s.height = 720+2000;
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
},{"../../utils/FunctionUtil":74,"../../utils/Gradient":75,"pixi.js":4}],25:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
var PresetButtonsView = require("../view/PresetButtonsView");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.setupBackground();

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableBackground = new PIXI.Sprite(Resources.getInstance().getTexture("tableBackground"));
	this.tableContainer.addChild(this.tableBackground);

	this.setupSeats();
	this.setupCommunityCards();

	this.timerView = new TimerView(this.viewConfig);
	this.tableContainer.addChild(this.timerView);

	this.chatView = new ChatView(this.viewConfig);
	this.addChild(this.chatView);

	this.buttonsView = new ButtonsView(this.viewConfig);
	this.addChild(this.buttonsView);

	this.dealerButtonView = new DealerButtonView(this.viewConfig);
	this.addChild(this.dealerButtonView);

	this.tableInfoView = new TableInfoView(this.viewConfig);
	this.addChild(this.tableInfoView);

	this.potView = new PotView(this.viewConfig);
	this.addChild(this.potView);
	this.potView.position.x = Resources.getInstance().getPoint("potPosition").x;
	this.potView.position.y = Resources.getInstance().getPoint("potPosition").y;

	this.settingsView = new SettingsView(this.viewConfig);
	this.addChild(this.settingsView);

	this.dialogView = new DialogView(this.viewConfig);
	this.addChild(this.dialogView);

	this.presetButtonsView = new PresetButtonsView(this.viewConfig);
	this.addChild(this.presetButtonsView);

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
	var g = new PIXI.Graphics();
	g.beginFill(0x05391d, 1);
	g.drawRect(-1000, 0, 960 + 2000, 720);
	g.endFill();
	this.addChild(g);

	var g = new PIXI.Graphics();
	g.beginFill(0x909090, 1);
	g.drawRect(-1000, 720, 960 + 2000, 1000);
	g.endFill();
	this.addChild(g);

	var gradient = new Gradient();
	gradient.setSize(100, 100);
	gradient.addColorStop(0, "#606060");
	gradient.addColorStop(.05, "#a0a0a0");
	gradient.addColorStop(1, "#909090");

	var s = gradient.createSprite();
	s.position.y = 530;
	s.position.x = -1000;
	s.width = 960 + 2000;
	s.height = 190;
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
			var c = new CardView(this.viewConfig);
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
		var chipsView = new ChipsView(this.viewConfig);
		this.seatViews[i].setBetChipsView(chipsView);

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
		var cardView = new CardView(this.viewConfig);
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
 * Get community cards.
 * @method getCommunityCards
 */
NetPokerClientView.prototype.getCommunityCards = function() {
	return this.communityCards;
}

/**
 * Get buttons view.
 * @method getButtonsView
 */
NetPokerClientView.prototype.getButtonsView = function() {
	return this.buttonsView;
}

/**
 * Get preset buttons view.
 * @method presetButtonsView
 */
NetPokerClientView.prototype.getPresetButtonsView = function() {
	return this.presetButtonsView;
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
 * Get settings view.
 * @method getSettingsView
 */
NetPokerClientView.prototype.getSettingsView = function() {
	return this.settingsView;
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

	this.presetButtonsView.hide();

	this.dialogView.hide();
	this.buttonsView.clear();

	this.tableInfoView.clear();
	this.settingsView.clear();
}

module.exports = NetPokerClientView;
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/Gradient":75,"../../utils/Point":80,"../resources/Resources":14,"../view/PresetButtonsView":28,"../view/SettingsView":32,"../view/TableInfoView":33,"./ButtonsView":17,"./CardView":18,"./ChatView":19,"./ChipsView":20,"./DealerButtonView":21,"./DialogView":23,"./PotView":26,"./SeatView":30,"./TimerView":34,"pixi.js":4}],26:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"./ChipsView":20,"pixi.js":4,"tween.js":5}],27:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var Checkbox = require("../../utils/Checkbox");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * A pot view
 * @class PresetButton
 */
function PresetButton() {
	PIXI.DisplayObjectContainer.call(this);
	
	this.id = null;
	this.visible = false;
	this.value = 0;

	var b = new PIXI.Sprite(Resources.getInstance().getTexture("checkboxBackground"));
	var t = new PIXI.Sprite(Resources.getInstance().getTexture("checkboxTick"));
	t.x = 1;

	this.checkbox = new Checkbox(b,t);
	this.checkbox.addEventListener("change", this.onCheckboxChange, this);
	this.addChild(this.checkbox);

	var styleObject = {
		font: "bold 12px Arial",
		wordWrap: true,
		wordWrapWidth: 250,
		fill: "white"
	};

	this.labelField = new PIXI.Text("", styleObject);
	this.labelField.position.x = 25;

	this.addChild(this.labelField);
}

FunctionUtil.extend(PresetButton, PIXI.DisplayObjectContainer);
EventDispatcher.init(PresetButton);


PresetButton.CHANGE = "change";

/**
 * Preset button change.
 * @method onPresetButtonChange
 */
PresetButton.prototype.onCheckboxChange = function() {
	this.dispatchEvent(PresetButton.CHANGE);
}

/**
 * Set label.
 * @method setLabel
 */
PresetButton.prototype.setLabel = function(label) {
	this.labelField.setText(label);
	return label;
}

/**
 * Show.
 * @method show
 */
PresetButton.prototype.show = function(id, value) {
	this.id = id;
	this.value = value;

	if(this.value > 0)
		this.setLabel(ButtonData.getButtonStringForId(id)+" ("+this.value+")");

	else
		this.setLabel(ButtonData.getButtonStringForId(id));

	this.visible = true;
}

/**
 * Hide.
 * @method hide
 */
PresetButton.prototype.hide = function() {
	this.id = null;
	this.visible = false;
	this.value = 0;
	this.setChecked(false);
}

/**
 * Get checked.
 * @method getChecked
 */
PresetButton.prototype.getChecked = function() {
	return this.checkbox.getChecked();
}

/**
 * Set checked.
 * @method setChecked
 */
PresetButton.prototype.setChecked = function(b) {
	this.checkbox.setChecked(b);

	return this.checkbox.getChecked();
}

/**
 * Get value.
 * @method getValue
 */
PresetButton.prototype.getValue = function() {
	return this.value;
}

module.exports = PresetButton;
},{"../../proto/data/ButtonData":36,"../../utils/Checkbox":71,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],28:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var PresetButton = require("./PresetButton");

/**
 * A pot view
 * @class PresetButtonsView
 */
function PresetButtonsView() {
	PIXI.DisplayObjectContainer.call(this);

	this.buttons = new Array();
	var origin = Resources.getInstance().getPoint("bigButtonPosition");

	for (var i = 0; i < 6; i++) {
		var p = new PresetButton();
		p.addEventListener(PresetButton.CHANGE, this.onPresetButtonChange, this);
		p.x = origin.x + 30 + 140 * (i % 2);
		p.y = origin.y + 35 * Math.floor(i / 2);
		this.addChild(p);
		this.buttons.push(p);
	}

	this.hide();
}

FunctionUtil.extend(PresetButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(PresetButtonsView);

PresetButtonsView.CHANGE = "change";

/**
 * Preset button change.
 * @method onPresetButtonChange
 */
PresetButtonsView.prototype.onPresetButtonChange = function(ev) {

	for (var i = 0; i < this.buttons.length; i++) {
		var b = this.buttons[i];
		if (b != ev.target) {
			b.setChecked(false);
		}
	}

	this.dispatchEvent(PresetButtonsView.CHANGE);
}

/**
 * Hide.
 * @method hide
 */
PresetButtonsView.prototype.hide = function() {
	for (var i = 0; i < this.buttons.length; i++) {
		this.buttons[i].hide();
	}
}

/**
 * Show.
 * @method show
 */
PresetButtonsView.prototype.show = function() {
	this.visible = true;

}

/**
 * Get buttons.
 * @method getButtons
 */
PresetButtonsView.prototype.getButtons = function() {
	return this.buttons;
}

/**
 * Get current preset button.
 * @method getCurrent
 */
PresetButtonsView.prototype.getCurrent = function() {
	for (var i = 0; i < this.buttons.length; i++) {
		if (this.buttons[i].getChecked() == true) {
			return this.buttons[i];
		}
	}
	return null;
}

/**
 * Get current preset button.
 * @method setCurrent
 */
PresetButtonsView.prototype.setCurrent = function(id) {
	for (var i = 0; i < this.buttons.length; i++) {
		var b = this.buttons[i];
		if ((id != null) && (b.id == id)) {
			b.setChecked(true);
		} else {
			b.setChecked(false);
		}
	}
}

module.exports = PresetButtonsView;
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"./PresetButton":27,"pixi.js":4,"tween.js":5}],29:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var Checkbox = require("../../utils/Checkbox");

/**
 * Raise shortcut button
 * @class RaiseShortcutButton
 */
function RaiseShortcutButton() {
	var background = new NineSlice(Resources.getInstance().getTexture("buttonBackground"), 10, 5, 10, 5);
	background.setLocalSize(105, 25);
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
	if (value) {
		this.alpha = 1;
		this.interactive = true;
		this.buttonMode = true;
	} else {
		this.alpha = 0.5;
		this.interactive = false;
		this.buttonMode = false;
	}
	return value;
}

module.exports = RaiseShortcutButton;
},{"../../utils/Button":70,"../../utils/Checkbox":71,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/NineSlice":78,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],30:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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

	this.betChips = null;
}

FunctionUtil.extend(SeatView, Button);

/**
 * Set reference to bet chips.
 * @method setBetChipsView
 */
SeatView.prototype.setBetChipsView = function(value) {
	this.betChips = value;
}

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
	for (var i = 0; i < this.pocketCards.length; i++) {
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
		.to({
			alpha: 0
		}, 1000)
		.start();
	var t2 = new TWEEN.Tween(this.nameField)
		.to({
			alpha: 1
		}, 1000)
		.start();
	var t3 = new TWEEN.Tween(this.chipsField)
		.to({
			alpha: 1
		}, 1000)
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
	this.betChips.setValue(0);
	this.setName("");
	this.setChips("");

	for (i = 0; i < this.pocketCards.length; i++)
		this.pocketCards[i].hide();
}

module.exports = SeatView;
},{"../../utils/Button":70,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],31:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
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
},{"../../utils/Button":70,"../../utils/Checkbox":71,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/NineSlice":78,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],32:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var FunctionUtil = require("../../utils/FunctionUtil");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var Resources = require("../resources/Resources");
var EventDispatcher = require("../../utils/EventDispatcher");
var SettingsCheckbox = require("./SettingsCheckbox");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ButtonData = require("../../proto/data/ButtonData");

/**
 * A settings view
 * @class SettingsView
 */
function SettingsView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;

	var object = new PIXI.DisplayObjectContainer();
	var bg = new NineSlice(Resources.getInstance().getTexture("chatBackground"), 10, 10, 10, 10);
	bg.setLocalSize(30, 30);
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
	mbg.setLocalSize(250, 100);
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

	console.log("setting up settings, viewconfig=" + this.viewConfig);

	this.createMenuSetting("playAnimations", "Play animations", 40, this.viewConfig.getPlayAnimations());
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

	this.buyChipsButton.visible = false;

	// Prevent mouse over from falling through, doesn't work.
	/*this.settingsMenu.interactive = true;
	this.settingsMenu.buttonMode = true;
	this.settingsMenu.mouseover = function() { console.log("test"); };
	this.settingsMenu.mouseout = function() { console.log("test"); };
	this.settingsMenu.mousedown = function() { console.log("test"); };
	this.settingsMenu.mouseup = function() { console.log("test"); };
	this.settingsMenu.click = function() { console.log("test"); };*/
}

FunctionUtil.extend(SettingsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(SettingsView);

SettingsView.BUY_CHIPS_CLICK = "buyChipsClick";
SettingsView.CHECKBOX_CHANGE = "checkboxChange";

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

	setting.y = 545 + y;
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
	if (checkbox.id == "playAnimations") {
		this.viewConfig.setPlayAnimations(checkbox.getChecked());
		console.log("anims changed..");
	}

	this.dispatchEvent(SettingsView.CHECKBOX_CHANGE, {
		checkboxId: checkbox.id,
		checked: checkbox.getChecked()
	});
}

/**
 * Settings button click.
 * @method onSettingsButtonClick
 */
SettingsView.prototype.onSettingsButtonClick = function(interaction_object) {
	console.log("SettingsView.prototype.onSettingsButtonClick");
	this.settingsMenu.visible = !this.settingsMenu.visible;

	if (this.settingsMenu.visible) {
		this.stage.mousedown = this.stage.touchstart = this.onStageMouseDown.bind(this);
	} else {
		this.stage.mousedown = null;
	}
}

/**
 * Stage mouse down.
 * @method onStageMouseDown
 */
SettingsView.prototype.onStageMouseDown = function(interaction_object) {
	console.log("SettingsView.prototype.onStageMouseDown");
	if ((this.hitTest(this.settingsMenu, interaction_object)) || (this.hitTest(this.settingsButton, interaction_object))) {
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
	if ((interaction_object.global.x > object.getBounds().x) && (interaction_object.global.x < (object.getBounds().x + object.getBounds().width)) &&
		(interaction_object.global.y > object.getBounds().y) && (interaction_object.global.y < (object.getBounds().y + object.getBounds().height))) {
		return true;
	}
	return false;
}

/**
 * Reset.
 * @method clear
 */
SettingsView.prototype.clear = function() {
	this.buyChipsButton.enabled = true;
	this.setVisibleButtons([]);

	this.setCheckboxChecked(CheckboxMessage.AUTO_POST_BLINDS, false);
	this.setCheckboxChecked(CheckboxMessage.AUTO_MUCK_LOSING, false);
	this.setCheckboxChecked(CheckboxMessage.SITOUT_NEXT, false);

	this.settingsMenu.visible = false;
	if (this.settingsMenu.visible)
		this.stage.mousedown = null;
}

/**
 * Set visible buttons.
 * @method setVisibleButtons
 */
SettingsView.prototype.setVisibleButtons = function(buttons) {
	this.buyChipsButton.visible = buttons.indexOf(ButtonData.BUY_CHIPS) != -1;
	this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible = buttons.indexOf(CheckboxMessage.AUTO_POST_BLINDS) >= 0;
	this.settings[CheckboxMessage.SITOUT_NEXT].visible = buttons.indexOf(CheckboxMessage.SITOUT_NEXT) >= 0;

	var yp = 543;

	if (this.buyChipsButton.visible) {
		this.buyChipsButton.y = yp;
		yp += 35;
	} else {
		yp += 2;
	}

	if (this.settings[CheckboxMessage.AUTO_POST_BLINDS].visible) {
		this.settings[CheckboxMessage.AUTO_POST_BLINDS].y = yp;
		yp += 25;
	}

	if (this.settings[CheckboxMessage.SITOUT_NEXT].visible) {
		this.settings[CheckboxMessage.SITOUT_NEXT].y = yp;
		yp += 25;
	}
}

/**
 * Set checkbox state.
 * @method setCheckboxChecked
 */
SettingsView.prototype.setCheckboxChecked = function(id, checked) {
	console.log("setting checkbox state for: " + id);

	this.settings[id].setChecked(checked);
}

module.exports = SettingsView;
},{"../../proto/data/ButtonData":36,"../../proto/messages/CheckboxMessage":44,"../../utils/Button":70,"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../../utils/NineSlice":78,"../resources/Resources":14,"./RaiseShortcutButton":29,"./SettingsCheckbox":31,"pixi.js":4,"tween.js":5}],33:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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

	var style={
		font: "bold 12px Arial",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 1,
		stroke: "#000000",
		strokeThickness: 1,
	};

	this.handInfoText=new PIXI.Text("<HandInfoText>",style);
	this.handInfoText.position.y=10;
	this.handInfoText.position.x=960-this.handInfoText.width;
	this.addChild(this.handInfoText);
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
}

/**
 * Set hand info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setHandInfoText = function(s) {
	if (!s)
		s="";

	this.handInfoText.setText(s);
	this.handInfoText.updateTransform();
	this.handInfoText.position.x=960-this.handInfoText.width-10;
}

/**
 * Clear.
 * @method clear
 */
TableInfoView.prototype.clear = function() {
	this.tableInfoText.setText("");
	this.handInfoText.setText("");
}

module.exports = TableInfoView;
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"pixi.js":4}],34:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

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
},{"../../utils/EventDispatcher":73,"../../utils/FunctionUtil":74,"../resources/Resources":14,"pixi.js":4,"tween.js":5}],35:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
	this.connection.close();
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

/**
 * Get string representation.
 * @method toString
 */
ProtoConnection.prototype.toString = function() {
	return "<ProtoConnection>";
}

module.exports = ProtoConnection;
},{"../utils/EventDispatcher":73,"../utils/FunctionUtil":74,"./messages/ActionMessage":38,"./messages/BetMessage":39,"./messages/BetsToPotMessage":40,"./messages/ButtonClickMessage":41,"./messages/ButtonsMessage":42,"./messages/ChatMessage":43,"./messages/CheckboxMessage":44,"./messages/ClearMessage":45,"./messages/CommunityCardsMessage":46,"./messages/DealerButtonMessage":47,"./messages/DelayMessage":48,"./messages/FadeTableMessage":49,"./messages/FoldCardsMessage":50,"./messages/HandInfoMessage":51,"./messages/InitMessage":52,"./messages/InterfaceStateMessage":53,"./messages/PayOutMessage":54,"./messages/PocketCardsMessage":55,"./messages/PotMessage":56,"./messages/PreTournamentInfoMessage":57,"./messages/PresetButtonClickMessage":58,"./messages/PresetButtonsMessage":59,"./messages/SeatClickMessage":60,"./messages/SeatInfoMessage":61,"./messages/ShowDialogMessage":62,"./messages/StateCompleteMessage":63,"./messages/TableButtonClickMessage":64,"./messages/TableButtonsMessage":65,"./messages/TableInfoMessage":66,"./messages/TestCaseRequestMessage":67,"./messages/TimerMessage":68,"./messages/TournamentResultMessage":69}],36:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Button data.
 * @class ButtonData
 */
function ButtonData(button, value) {
	this.button = button;
	this.value = value;
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

ButtonData.prototype.toString = function() {
	return "<ButtonData button=" + this.button + ", value=" + this.value + ">";
}

module.exports = ButtonData;
},{}],37:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],38:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],39:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],40:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],41:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],42:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{"../data/ButtonData":36}],43:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],44:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
	return this.id;
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
},{}],45:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],46:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

var CardData = require("../data/CardData");

/**
 * Show community cards.
 * @class CommunityCardsMessage
 */
function CommunityCardsMessage(cards) {
	if (!cards)
		cards = [];

	this.animate = false;
	this.cards = cards;
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
},{"../data/CardData":37}],47:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],48:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],49:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],50:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],51:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],52:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],53:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Received when interface state has changed.
 * @class InterfaceStateMessage
 */
function InterfaceStateMessage(visibleButtons) {
	if (!visibleButtons)
		visibleButtons = [];

	this.visibleButtons = visibleButtons;
}

InterfaceStateMessage.TYPE = "interfaceState";

/**
 * Getter.
 * @method getVisibleButtons
 */
InterfaceStateMessage.prototype.getVisibleButtons = function() {
	return this.visibleButtons;
}

/**
 * Add a button to be shown.
 * @method addVisibleButton
 */
InterfaceStateMessage.prototype.addVisibleButton=function(buttonId) {
	this.visibleButtons.push(buttonId);
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
},{}],54:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],55:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{"../data/CardData":37}],56:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],57:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],58:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Received when ?.
 * @class PresetButtonClickMessage
 */
function PresetButtonClickMessage(button, value) {
	if (!value)
		value = null;

	this.button = button;
	this.value = value;
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
},{}],59:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

var ButtonData = require("../data/ButtonData");

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
 * Set buton data.
 * @method
 */
PresetButtonsMessage.prototype.setButtonDataAt = function(index, buttonData) {
	this.buttons[index] = buttonData;
}

/**
 * Un-serialize.
 * @method unserialize
 */
PresetButtonsMessage.prototype.unserialize = function(data) {
	this.current = data.current;

	this.buttons = new Array();

	for (var i = 0; i < data.buttons.length; i++) {
		var button = data.buttons[i];
		var buttonData = null;

		if (button != null) {
			buttonData = new ButtonData(button.button, button.value);
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

	for (var i = 0; i < this.buttons.length; i++) {
		var buttonData = this.buttons[i];
		if (buttonData != null)
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
},{"../data/ButtonData":36}],60:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],61:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],62:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],63:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],64:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],65:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],66:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Set the big text that calls for user action,
 * such as "Welcome, please take a seat!".
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
},{}],67:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],68:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],69:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

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
},{}],70:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
	this.mouseout = this.touchend = this.touchendoutside = this.onMouseout.bind(this);
	this.mousedown = this.touchstart = this.onMousedown.bind(this);
	this.mouseup = this.onMouseup.bind(this);
	this.click = this.tap = this.onClick.bind(this);

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
},{"./EventDispatcher":73,"./FunctionUtil":74,"pixi.js":4}],71:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{"./Button":70,"./EventDispatcher":73,"./FunctionUtil":74,"pixi.js":4}],72:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var FunctionUtil = require("../utils/FunctionUtil");

/**
 * Keep content with a logic size inside boundaries.
 * @class ContentScaler
 */
function ContentScaler(content) {
	PIXI.DisplayObjectContainer.call(this);

	this.contentWidth = 100;
	this.contentHeight = 100;

	this.screenWidth = 100;
	this.screenHeight = 100;

	this.theMask = null;

	if (content)
		this.setContent(content);

	this.align = ContentScaler.MIDDLE;
}

FunctionUtil.extend(ContentScaler, PIXI.DisplayObjectContainer);

ContentScaler.MIDDLE = "middle";
ContentScaler.TOP = "top";

/**
 * Set content to use.
 * @method setContent
 */
ContentScaler.prototype.setContent = function(content) {
	this.content = content;

	this.addChild(this.content);

	if (this.theMask) {
		this.removeChild(this.theMask);
		this.theMask = null;
	}

	this.theMask = new PIXI.Graphics();
	//this.addChild(this.theMask);

	this.updateScale();
}

/**
 * Set logic size of the content.
 * @method setContentSize
 */
ContentScaler.prototype.setContentSize = function(contentWidth, contentHeight) {
	this.contentWidth = contentWidth;
	this.contentHeight = contentHeight;

	this.updateScale();
}

/**
 * Set the actual screen size.
 * @method setScreenSize
 */
ContentScaler.prototype.setScreenSize = function(screenWidth, screenHeight) {
	this.screenWidth = screenWidth;
	this.screenHeight = screenHeight;

	this.updateScale();
}

/**
 * Set how the content should be aligned on the screen.
 * @method setAlign
 */
ContentScaler.prototype.setAlign = function(align) {
	this.align = align;
	this.updateScale();
}

/**
 * Update the scaling.
 * @method updateScale
 * @private
 */
ContentScaler.prototype.updateScale = function() {
	var scale;

	if (this.screenWidth / this.contentWidth < this.screenHeight / this.contentHeight)
		scale = this.screenWidth / this.contentWidth;

	else
		scale = this.screenHeight / this.contentHeight;

	this.content.scale.x = scale;
	this.content.scale.y = scale;

	var scaledWidth = this.contentWidth * scale;
	var scaledHeight = this.contentHeight * scale;

	this.content.position.x = (this.screenWidth - scaledWidth) / 2;

	if (this.align == ContentScaler.TOP)
		this.content.position.y = 0;

	else
		this.content.position.y = (this.screenHeight - scaledHeight) / 2;

	var r = new PIXI.Rectangle(this.content.position.x, this.content.position.y, scaledWidth, scaledHeight);
	var right = r.x + r.width;
	var bottom = r.y + r.height;

	this.theMask.clear();
	this.theMask.beginFill();
	this.theMask.drawRect(0, 0, this.screenWidth, r.y);
	this.theMask.drawRect(0, 0, r.x, this.screenHeight);
	this.theMask.drawRect(right, 0, this.screenWidth - right, this.screenHeight);
	this.theMask.drawRect(0, bottom, this.screenWidth, this.screenHeight - bottom);
	this.theMask.endFill();
}

module.exports = ContentScaler;
},{"../utils/FunctionUtil":74,"pixi.js":4}],73:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{}],74:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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

},{}],75:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{"./FunctionUtil":74,"pixi.js":4}],76:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{"./EventDispatcher":73,"./FunctionUtil":74,"./Thenable":83}],77:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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


},{"./EventDispatcher":73,"./FunctionUtil":74,"pixi.js":4}],78:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{"./FunctionUtil":74,"pixi.js":4}],79:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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

	this.contentAlign=ContentScaler.MIDDLE;

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
	this.contentScaler.setAlign(this.contentAlign);
	this.contentScaler.setContentSize(w, h);
	this.contentScaler.setScreenSize(this.containerEl.clientWidth, this.containerEl.clientHeight);
	this.appStage.addChild(this.contentScaler);
}

/**
 * Set content alignment.
 * @method setContentAlign
 */
PixiApp.prototype.setContentAlign = function(align) {
	this.contentAlign=align;

	if (this.contentScaler)
		this.contentScaler.setAlign(this.contentAlign);
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
},{"./ContentScaler":72,"./FunctionUtil":74,"pixi.js":4,"tween.js":5}],80:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

/**
 * Represents a point.
 * @class Point
 * @module utils
 */
function Point(x, y) {
	if (!(this instanceof Point))
		return new Point(x, y);

	this.x = x;
	this.y = y;
}

module.exports = Point;
},{}],81:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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
},{"./EventDispatcher":73,"./FunctionUtil":74}],82:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

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

},{"./EventDispatcher":73,"./FunctionUtil":74,"pixi.js":4,"tween.js":5}],83:[function(require,module,exports){
(function (process){
/**
 * Utilities.
 * @module utils
 */

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
	//setTimeout(this.doNotifySuccess.bind(this), 0);
	process.nextTick(this.doNotifySuccess.bind(this));
}

/**
 * Notify failure of the operation.
 * @method notifyError
 */
Thenable.prototype.notifyError = function(param) {
	if (this.handlersCalled)
		throw new Error("This thenable is already notified.");

	this.notifyParam = param;
	//setTimeout(this.doNotifyError.bind(this), 0);
	process.nextTick(this.doNotifyError.bind(this));
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
}).call(this,require('_process'))
},{"./EventDispatcher":73,"./FunctionUtil":74,"_process":3}]},{},[12]);
