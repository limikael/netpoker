(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
'use strict';

module.exports = function () {
  throw new Error(
    'ws does not work in the browser. Browser clients must use the native ' +
      'WebSocket object'
  );
};

},{}],3:[function(require,module,exports){
const Resources=require("./Resources");
const NetPokerClientView=require("../view/NetPokerClientView");
const ContentScaler=require("../../utils/ContentScaler");
const MessageConnection=require("../../utils/MessageConnection");

class NetPokerClient {
	constructor(params) {
		this.params=params;

		this.element=params.element;
		this.pixiApp=new PIXI.Application({
			width: this.element.clientWidth,
			height: this.element.clientHeight
		});

		this.pixiApp.renderer.autoDensity=true;
		this.pixiApp.view.style.position="absolute";
		this.pixiApp.view.style.top=0;
		this.pixiApp.view.style.left=0;

		window.addEventListener("resize",this.onWindowResize);

		this.element.appendChild(this.pixiApp.view);

		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);

		this.stage=new PIXI.Container();

		this.contentScaler=new ContentScaler(this.stage);
		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.contentScaler.setContentSize(960,720);
		this.pixiApp.stage.addChild(this.contentScaler);
	}

	onWindowResize=()=>{
		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.pixiApp.renderer.resize(
			this.element.clientWidth,
			this.element.clientHeight
		);
	}

	getResources() {
		return this.resources;
	}

	async run() {
		await this.resources.load();

		this.clientView=new NetPokerClientView(this);
		this.stage.addChild(this.clientView);

		this.connect();
	}

	async connect() {
		this.connection=await MessageConnection.connect(this.params.serverUrl);

		
	}
}

module.exports=NetPokerClient;

},{"../../utils/ContentScaler":9,"../../utils/MessageConnection":10,"../view/NetPokerClientView":7,"./Resources":4}],4:[function(require,module,exports){
const THEME=require("./theme.js");

class Resources {
	constructor(spriteSheetUrl) {
		this.spriteSheetUrl=spriteSheetUrl
	}

	createSprite(id) {
		let fn=THEME[id];
		return new PIXI.Sprite(this.sheet.textures[fn]);
	}

	async load() {
		await new Promise((resolve,reject)=>{
			PIXI.Loader.shared.add(this.spriteSheetUrl);
			PIXI.Loader.shared.load(resolve);
		});

		this.sheet=PIXI.Loader.shared.resources[this.spriteSheetUrl];
	}
}

module.exports=Resources;

},{"./theme.js":5}],5:[function(require,module,exports){
module.exports={
	"tableBackground": "table.png",
	"seatPlate": "seatPlate.png",
	"timerBackground": "timerBackground.png",
	"dealerButton": "dealerButton.png",
	"cardFrame": "cardFrame.png",
	"cardBack": "cardBack.png",
	"suitSymbol0": "suitSymbol0.png",
	"suitSymbol1": "suitSymbol1.png",
	"suitSymbol2": "suitSymbol2.png",
	"suitSymbol3": "suitSymbol3.png",
	"chip0": "chip0.png",
	"chip1": "chip1.png",
	"chip2": "chip2.png",
	"chip3": "chip3.png",
	"chip4": "chip4.png",
	"dividerLine": "dividerLine.png",
	"framePlate": "framePlate.png",
	"bigButton": "bigButton.png",
	"dialogButton": "dialogButton.png",
	"textScrollbarTrack": "textScrollbarTrack.png",
	"textScrollbarThumb": "textScrollbarThumb.png",
	"wrenchIcon": "wrenchIcon.png",
	"chatBackground": "chatBackground.png",
	"checkboxBackground": "checkboxBackground.png",
	"checkboxTick": "checkboxTick.png",
	"buttonBackground": "buttonBackground.png",
	"sliderBackground": "sliderBackground.png",
	"sliderKnob": "sliderKnob.png",
	"upArrow": "upArrow.png",
	"selectTableButton": "selectTableButton.png",
	"selectedTableButton": "selectedTableButton.png",
	"eleminatedTableIcon": "eleminatedTableIcon.png",

	"chipsColor0": 0x404040,
	"chipsColor1": 0x008000,
	"chipsColor2": 0x808000,
	"chipsColor3": 0x000080,
	"chipsColor4": 0xff0000,

	"communityCardMargin": 1,
	"betAlign": "LCRRRRCLLL",

	"tablePosition": [101, 94],
	"potPosition": [485, 315],

	"timerOffset": [55, -30],
	"communityCardsPosition": [255, 190],

	"seatPosition0": [287, 118],
	"seatPosition1": [483, 112],
	"seatPosition2": [676, 118],
	"seatPosition3": [844, 247],
	"seatPosition4": [817, 413],
	"seatPosition5": [676, 490],
	"seatPosition6": [483, 495],
	"seatPosition7": [287, 490],
	"seatPosition8": [140, 413],
	"seatPosition9": [123, 247],

	"dealerButtonPosition0": [347, 133],
	"dealerButtonPosition1": [395, 133],
	"dealerButtonPosition2": [574, 133],
	"dealerButtonPosition3": [762, 267],
	"dealerButtonPosition4": [715, 358],
	"dealerButtonPosition5": [574, 434],
	"dealerButtonPosition6": [536, 432],
	"dealerButtonPosition7": [351, 432],
	"dealerButtonPosition8": [193, 362],
	"dealerButtonPosition9": [168, 266],

	"betPosition0": [225, 150],
	"betPosition1": [478, 150],
	"betPosition2": [730, 150],
	"betPosition3": [778, 196],
	"betPosition4": [748, 322],
	"betPosition5": [719, 360],
	"betPosition6": [481, 360],
	"betPosition7": [232, 360],
	"betPosition8": [199, 322],
	"betPosition9": [181, 200],

	"bigButtonPosition": [366, 575]
}
},{}],6:[function(require,module,exports){
const NetPokerClient=require("./app/NetPokerClient");
const ArrayUtil=require("../utils/ArrayUtil");

(function($) {
	$.fn.netpoker=function(params) {
		$(this).each(function() {
			let paramsCopy={...params};
			paramsCopy.element=$(this)[0];
			let netPokerClient=new NetPokerClient(paramsCopy);
			netPokerClient.run();
		});
	}
})(jQuery);

},{"../utils/ArrayUtil":8,"./app/NetPokerClient":3}],7:[function(require,module,exports){
class NetPokerClientView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=this.client.getResources();

		let table=this.resources.createSprite("tableBackground");
		this.addChild(table);
	}
}

module.exports=NetPokerClientView;
},{}],8:[function(require,module,exports){
class ArrayUtil {

	/**
	 * Remove an element.
	 * @method remove
	 * @static
	 */
	static remove(array, element) {
		var index = array.indexOf(element);

		if (index >= 0)
			array.splice(index, 1);
	}

	/**
	 * Shuffles the "arr" Array (in place) according to a randomly chosen permutation
	 * This is the classic Fisher-Yates style shuffle.
	 * @method
	 * @static
	 */
	static shuffle(arr) {
		var n = arr.length;
		while (n > 0) {
			var k = Math.floor(Math.random() * n);
			n--;
			var temp = arr[n];
			arr[n] = arr[k];
			arr[k] = temp;
		}

		return arr;
	}

	/**
	 * Check if every value in both arrays equal.
	 * It doesn't do deep comparision in case the conatined elements are arrays.
	 * Not tested since I didn't actually need it.
	 * @method equals
	 * @static
	 */
	static equals(a, b) {
		if (a.length != b.length)
			return false;

		for (var i = 0; i < a.length; i++)
			if (a[i] != b[i])
				return false;

		return true;
	}

	/**
	 * Comparision function for numeric sort.
	 * @method compareNumbers
	 */
	static compareNumbers(a, b) {
		return a - b;
	}

	/**
	 * Shallow copy.
	 * @method copy
	 */
	static copy(array) {
		var copy = [];

		for (var i = 0; i < array.length; i++)
			copy.push(array[i]);

		return copy;
	}
}

module.exports = ArrayUtil;
},{}],9:[function(require,module,exports){
class ContentScaler extends PIXI.Container {
	constructor(content) {
		super();

		this.contentWidth = 100;
		this.contentHeight = 100;
		this.screenWidth = 100;
		this.screenHeight = 100;

		if (content)
			this.setContent(content);

		this.updateScale();
	}

	setContentSize(contentWidth, contentHeight) {
		this.contentWidth = contentWidth;
		this.contentHeight = contentHeight;
		this.updateScale();
	}

	setScreenSize(screenWidth, screenHeight) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
		this.updateScale();
	}

	setContent(content) {
		if (this.content)
			throw new Error("Content already set");

		this.content=content;
		this.addChild(this.content);

		this.updateScale();
	}

	updateScale() {
		if (!this.content)
			return;

		let scale;

		if (this.screenWidth / this.contentWidth < this.screenHeight / this.contentHeight)
			scale = this.screenWidth / this.contentWidth;

		else
			scale = this.screenHeight / this.contentHeight;		

		this.content.scale.x = scale;
		this.content.scale.y = scale;

		let scaledWidth = this.contentWidth * scale;
		let scaledHeight = this.contentHeight * scale;		

		this.content.position.x = (this.screenWidth - scaledWidth) / 2;
		this.content.position.y = (this.screenHeight - scaledHeight) / 2;
	}
}

module.exports=ContentScaler;
},{}],10:[function(require,module,exports){
let WebSocket;

if (window.WebSocket)
	WebSocket=window.WebSocket

else
	WebSocket=require("ws");

const EventEmitter=require("events");

class MessageConnection extends EventEmitter {
	constructor(webSocket) {
		super();

		this.webSocket=webSocket;
		this.webSocket.addEventListener("message",this.onMessage);
	}

	send(type, message) {
		message._=type;
		this.webSocket.send(JSON.stringify(message));
	}

	onMessage=(event)=>{
		let data;

		try {
			data=JSON.parse(event.data);
		}

		catch (e) {
			console.log("Warning! Unable to parse JSON, ignoring message...");
			return;
		}

		if (!data.type) {
			console.log("Warning! No message type, ignoring...");
			return;
		}

		this.emit(data.type,data);
		this.emit("message",data);
	}

	static connect(url) {
		return new Promise((resolve, reject)=>{
			let webSocket=new WebSocket(url);
			webSocket.onopen=()=>{
				console.log("connected...");
				resolve(new MessageConnection(webSocket));
			}

			webSocket.onerror=(err)=>{
				console.log("connection failed...");
				reject(err);
			}
		});
	}
}

module.exports=MessageConnection;
},{"events":1,"ws":2}]},{},[6]);
