(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process){(function (){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time, preserve) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : TWEEN.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time) || preserve) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();


// Include a performance.now polyfill.
// In node.js, use process.hrtime.
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined') {
	TWEEN.now = function () {
		var time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
}
// In a browser, use window.performance.now if it is available.
else if (typeof (window) !== 'undefined' &&
         window.performance !== undefined &&
		 window.performance.now !== undefined) {
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	TWEEN.now = window.performance.now.bind(window.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
	TWEEN.now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
	TWEEN.now = function () {
		return new Date().getTime();
	};
}


TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _repeatDelayTime;
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

	this.to = function (properties, duration) {

		_valuesEnd = properties;

		if (duration !== undefined) {
			_duration = duration;
		}

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : TWEEN.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_object[property] === undefined) {
				continue;
			}

			// Save the starting value.
			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object, _object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.end = function () {

		this.update(_startTime + _duration);
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.repeatDelay = function (amount) {

		_repeatDelayTime = amount;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object, _object);
			}

			_onStartCallbackFired = true;
		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end);
					} else {
						end = parseFloat(end);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property]);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				if (_repeatDelayTime !== undefined) {
					_startTime = time + _repeatDelayTime;
				} else {
					_startTime = time + _delayTime;
				}

				return true;

			} else {

				if (_onCompleteCallback !== null) {

					_onCompleteCallback.call(_object, _object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this)}).call(this,require('_process'))
},{"_process":1}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
'use strict';

module.exports = function () {
  throw new Error(
    'ws does not work in the browser. Browser clients must use the native ' +
      'WebSocket object'
  );
};

},{}],5:[function(require,module,exports){
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

	getResources() {
		return this.resources;
	}
}

module.exports=NetPokerClient;

},{"../../utils/ContentScaler":13,"../../utils/MessageConnection":15,"../view/NetPokerClientView":9,"./Resources":6}],6:[function(require,module,exports){
const THEME=require("./theme.js");

class Resources {
	constructor(spriteSheetUrl) {
		this.spriteSheetUrl=spriteSheetUrl
	}

	createSprite(id) {
		let fn=THEME[id];
		return new PIXI.Sprite(this.sheet.textures[fn]);
	}

	getPoint(id) {
		return new PIXI.Point(THEME[id][0],THEME[id][1]);
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

},{"./theme.js":7}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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

},{"../utils/ArrayUtil":11,"./app/NetPokerClient":5}],9:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

/*var CardView = require("./CardView");
var ChatView = require("./ChatView");
var Point = require("../../utils/Point");
var ButtonsView = require("./ButtonsView");
var DialogView = require("./DialogView");
var DealerButtonView = require("./DealerButtonView");
var ChipsView = require("./ChipsView");
var PotView = require("./PotView");
var TimerView = require("./TimerView");
var SettingsView = require("../view/SettingsView");
var TableInfoView = require("../view/TableInfoView");
var PresetButtonsView = require("../view/PresetButtonsView");
var TableButtonsView = require("./TableButtonsView");*/
const SeatView = require("./SeatView");
const TWEEN = require("tween.js");
const Gradient = require("../../utils/Gradient");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
class NetPokerClientView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=this.client.getResources();
		this.setupBackground();

		this.tableContainer = new PIXI.Container();
		this.addChild(this.tableContainer);

		this.tableBackground = this.resources.createSprite("tableBackground");
		this.tableContainer.addChild(this.tableBackground);
		this.tableBackground.position = this.resources.getPoint("tablePosition");

		this.setupSeats();
		/*this.setupCommunityCards();

		this.timerView = new TimerView(this.client);
		this.tableContainer.addChild(this.timerView);

		this.chatView = new ChatView(this.client);
		this.addChild(this.chatView);

		this.buttonsView = new ButtonsView(this.client);
		this.addChild(this.buttonsView);

		this.dealerButtonView = new DealerButtonView(this.client);
		this.tableContainer.addChild(this.dealerButtonView);

		this.tableInfoView = new TableInfoView(this.client);
		this.addChild(this.tableInfoView);

		this.potView = new PotView(this.client);
		this.tableContainer.addChild(this.potView);
		this.potView.position.x = this.resources.getPoint("potPosition").x;
		this.potView.position.y = this.resources.getPoint("potPosition").y;

		this.settingsView = new SettingsView(this.client);
		this.addChild(this.settingsView);

		this.dialogView = new DialogView(this.client);
		this.addChild(this.dialogView);

		this.presetButtonsView = new PresetButtonsView(this.client);
		this.addChild(this.presetButtonsView);

		this.tableButtonsView = new TableButtonsView(this.client);
		this.addChild(this.tableButtonsView);

		this.setupChips();

		this.fadeTableTween = null;*/
	}

	/**
	 * Setup background.
	 * @method setupBackground
	 */
	setupBackground() {
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

		var s = this.resources.createSprite("dividerLine");
		s.x = 345;
		s.y = 540;
		this.addChild(s);

		var s = this.resources.createSprite("dividerLine");
		s.x = 693;
		s.y = 540;
		this.addChild(s);
	}

	/**
	 * Setup seats.
	 * @method serupSeats
	 */
	setupSeats() {
		let i, j;
		let pocketCards;

		this.seatViews = [];

		for (i = 0; i < 10; i++) {
			let seatView = new SeatView(this.client, i);
			let p = seatView.position;

			/*for (j = 0; j < 2; j++) {
				let c = new CardView(this.client);
				c.hide();
				c.setTargetPosition(Point(p.x + j * 30 - 60, p.y - 100));
				this.tableContainer.addChild(c);
				seatView.addPocketCard(c);
			}*/

			seatView.on("click", this.onSeatClick, this);

			this.tableContainer.addChild(seatView);
			this.seatViews.push(seatView);
		}
	}

	/**
	 * Setup chips.
	 * @method serupSeats
	 */
	setupChips() {
		for (let i = 0; i < 10; i++) {
			var chipsView = new ChipsView(this.viewConfig, this.resources);
			this.seatViews[i].setBetChipsView(chipsView);

			chipsView.setAlignment(this.resources.getValue("betAlign").charAt(i));
			chipsView.setTargetPosition(this.resources.getPoint("betPosition" + i));
			this.tableContainer.addChild(chipsView);
		}
	}

	/**
	 * Seat click.
	 * @method onSeatClick
	 * @private
	 */
	onSeatClick=(e)=>{
		var seatIndex = -1;

		for (var i = 0; i < this.seatViews.length; i++)
			if (e.target == this.seatViews[i])
				seatIndex = i;

		console.log("seat click: " + seatIndex);
		this.emit("seatClick",seatIndex);
	}

	/**
	 * Setup community cards.
	 * @method setupCommunityCards
	 * @private
	 */
	setupCommunityCards() {
		this.communityCards = [];

		var p = this.resources.getPoint("communityCardsPosition");
		var margin = parseInt(this.resources.getValue("communityCardMargin"));
		for (i = 0; i < 5; i++) {
			var cardView = new CardView(this.viewConfig, this.resources);
			cardView.hide();
			cardView.setTargetPosition(Point(p.x + i * (cardView.back.width + margin), p.y));

			this.communityCards.push(cardView);
			this.tableContainer.addChild(cardView);
		}
	}

	/**
	 * Get seat view by index.
	 * @method getSeatViewByIndex
	 */
	getSeatViewByIndex(index) {
		return this.seatViews[index];
	}

	/**
	 * Get community cards.
	 * @method getCommunityCards
	 */
	getCommunityCards() {
		return this.communityCards;
	}

	/**
	 * Get buttons view.
	 * @method getButtonsView
	 */
	getButtonsView() {
		return this.buttonsView;
	}

	/**
	 * Get preset buttons view.
	 * @method presetButtonsView
	 */
	getPresetButtonsView() {
		return this.presetButtonsView;
	}

	/**
	 * Get dialog view.
	 * @method getDialogView
	 */
	getDialogView() {
		return this.dialogView;
	}

	/**
	 * Get dialog view.
	 * @method getDealerButtonView
	 */
	getDealerButtonView() {
		return this.dealerButtonView;
	}

	/**
	 * Get table info view.
	 * @method getTableInfoView
	 */
	getTableInfoView() {
		return this.tableInfoView;
	}

	/**
	 * Get settings view.
	 * @method getSettingsView
	 */
	getSettingsView() {
		return this.settingsView;
	}

	/**
	 * Get table buttons view.
	 * @method getTableButtonsView
	 */
	getTableButtonsView() {
		return this.tableButtonsView;
	}

	/**
	 * Fade table.
	 * @method fadeTable
	 */
	fadeTable(visible, direction) {
		//console.log("fading table: "+visible);

		if (this.fadeTableTween) {
			console.log("there is already a tween...");
			this.fadeTableTween.onComplete(null);
			this.fadeTableTween.stop();
			this.fadeTableTween = null;
		}

		var dirMultiplier = 0;

		switch (direction) {
			case FadeTableMessage.LEFT:
				dirMultiplier = -1;
				break;

			case FadeTableMessage.RIGHT:
				dirMultiplier = 1;
				break;

			default:
				throw new Error("unknown fade direction: " + direction);
				break;
		}

		var target = {};
		var completeFunction;

		if (visible) {
			this.tableContainer.alpha = 0;
			this.tableContainer.x = -100 * dirMultiplier;
			target.alpha = 1;
			target.x = 0;
			completeFunction = this.onFadeInComplete.bind(this);
		} else {
			this.tableContainer.alpha = 1;
			this.tableContainer.x = 0;
			target.alpha = 0;
			target.x = 100 * dirMultiplier;
			completeFunction = this.onFadeOutComplete.bind(this);
		}

		var original = {
			x: this.tableContainer.x,
			alpha: this.tableContainer.alpha
		};

		this.fadeTableTween = new TWEEN.Tween(this.tableContainer);
		this.fadeTableTween.easing(TWEEN.Easing.Quadratic.InOut);
		this.fadeTableTween.onComplete(completeFunction);
		this.fadeTableTween.to(target, this.viewConfig.scaleAnimationTime(250));
		this.fadeTableTween.start();
		TWEEN.add(this.fadeTableTween);
	}

	/**
	 * Fade out complete
	 * @method onFadeOutComplete
	 * @private
	 */
	onFadeOutComplete=()=>{
		if (!this.fadeTableTween)
			return;

		this.fadeTableTween.onComplete(null);
		this.fadeTableTween.stop();
		this.fadeTableTween = null;
		this.clearTableContents();

		this.trigger(NetPokerClientView.FADE_TABLE_COMPLETE);
	}

	/**
	 * Fade in complete
	 * @method onFadeInComplete
	 * @private
	 */
	onFadeInComplete=()=>{
		if (!this.fadeTableTween)
			return;

		this.fadeTableTween.onComplete(null);
		this.fadeTableTween.stop();
		this.fadeTableTween = null;

		this.trigger(NetPokerClientView.FADE_TABLE_COMPLETE);
	}

	/**
	 * Clear the contents of the table.
	 * @method clearTableContents
	 * @private
	 */
	clearTableContents() {
		this.dealerButtonView.hide();

		for (i = 0; i < this.communityCards.length; i++)
			this.communityCards[i].hide();

		for (i = 0; i < this.seatViews.length; i++)
			this.seatViews[i].clear();

		this.timerView.hide();
		this.potView.setValues([]);
	}

	/**
	 * Clear everything to an empty state.
	 * @method clear
	 */
	clear = function() {
		var i;

		this.clearTableContents();

		this.presetButtonsView.hide();

		this.chatView.clear();

		this.dialogView.hide();
		this.buttonsView.clear();

		this.tableInfoView.clear();
		this.settingsView.clear();
		this.tableButtonsView.clear();

		if (this.fadeTableTween) {
			this.fadeTableTween.stop();
			this.fadeTableTween = null;
		}

		this.tableContainer.alpha = 1;
		this.tableContainer.x = 0;
	}
}

module.exports = NetPokerClientView;

},{"../../utils/Gradient":14,"./SeatView":10,"tween.js":2}],10:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var TWEEN = require("tween.js");
var Button = require("../../utils/Button");

/**
 * A seat view.
 * @class SeatView
 */
class SeatView extends Button {
	constructor(client, seatIndex) {
		super();

		this.pocketCards = [];
		this.resources = client.getResources();
		this.seatIndex = seatIndex;

		var seatSprite = this.resources.createSprite("seatPlate");

		seatSprite.position.x = -seatSprite.width / 2;
		seatSprite.position.y = -seatSprite.height / 2;

		this.addChild(seatSprite);

		var pos = this.resources.getPoint("seatPosition" + this.seatIndex);

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

	/**
	 * Set reference to bet chips.
	 * @method setBetChipsView
	 */
	setBetChipsView(chipsView) {
		this.betChips = chipsView;
		chipsView.seatIndex = this.seatIndex;
	}

	/**
	 * Set name.
	 * @method setName
	 */
	setName(name) {
		if (!name)
			name = "";

		this.nameField.text=name;
		this.nameField.x = -this.nameField.width / 2;
	}

	/**
	 * Set name.
	 * @method setChips
	 */
	setChips(chips) {
		if (chips === undefined || chips === null)
			chips = "";

		this.chipsField.text=chips;
		this.chipsField.updateTransform();

		this.chipsField.position.x = -this.chipsField.canvas.width / 2;
	}

	/**
	 * Set sitout.
	 * @method setSitout
	 */
	setSitout(sitout) {
		if (sitout)
			this.alpha = .5;

		else
			this.alpha = 1;
	}

	/**
	 * Set sitout.
	 * @method setActive
	 */
	setActive(active) {
		this.visible = active;
	}

	/**
	 * Add pocket card.
	 * @method addPocketCard
	 */
	addPocketCard(cardView) {
		this.pocketCards.push(cardView);
	}

	/**
	 * Get pocket cards.
	 * @method getPocketCards
	 */
	getPocketCards() {
		return this.pocketCards;
	}

	/**
	 * Fold cards.
	 * @method foldCards
	 */
	foldCards() {
		this.pocketCards[0].addEventListener("animationDone", this.onFoldComplete, this);
		for (var i = 0; i < this.pocketCards.length; i++) {
			this.pocketCards[i].fold();
		}
	}

	/**
	 * Fold complete.
	 * @method onFoldComplete
	 */
	onFoldComplete() {
		this.pocketCards[0].removeEventListener("animationDone", this.onFoldComplete, this);
		this.dispatchEvent("animationDone");
	}

	/**
	 * Show user action.
	 * @method action
	 */
	action(action) {
		this.actionField.text=action;
		this.actionField.position.x = -this.actionField.width / 2;

		this.actionField.alpha = 1;
		this.nameField.alpha = 0;
		this.chipsField.alpha = 0;

		setTimeout(this.onTimer.bind(this), 1000);
	}

	/**
	 * Show user action.
	 * @method action
	 */
	onTimer(action) {

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
	clear() {
		var i;

		this.visible = true;
		this.sitout = false;
		this.betChips.setValue(0);
		this.setName("");
		this.setChips("");

		for (i = 0; i < this.pocketCards.length; i++)
			this.pocketCards[i].hide();
	}
}

module.exports = SeatView;
},{"../../utils/Button":12,"tween.js":2}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

/**
 * Create a sprite with a gradient.
 * @class Gradient
 */
class Gradient {
	constructor() {
		this.width = 100;
		this.height = 100;
		this.stops = [];
	}

	/**
	 * Set size of the gradient.
	 * @method setSize
	 */
	setSize(w, h) {
		this.width = w;
		this.height = h;
	}

	/**
	 * Add color stop.
	 * @method addColorStop
	 */
	addColorStop(weight, color) {
		this.stops.push({
			weight: weight,
			color: color
		});
	}

	/**
	 * Render the sprite.
	 * @method createSprite
	 */
	createSprite() {
		//console.log("rendering gradient...");
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
}

module.exports = Gradient;
},{}],15:[function(require,module,exports){
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
},{"events":3,"ws":4}]},{},[8]);
