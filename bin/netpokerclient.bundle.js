(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.NetPokerClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
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
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
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
        setTimeout(drainQueue, 0);
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

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.3.2 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.3.2',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
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

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],4:[function(require,module,exports){
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

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],5:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":3,"./encode":4}],6:[function(require,module,exports){
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

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":2,"querystring":5}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
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
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

(function(){

    var root = this;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * @module PIXI
 */
var PIXI = PIXI || {};

/* 
* 
* This file contains a lot of pixi consts which are used across the rendering engine
* @class Consts
*/
PIXI.WEBGL_RENDERER = 0;
PIXI.CANVAS_RENDERER = 1;

// useful for testing against if your lib is using pixi.
PIXI.VERSION = "v1.6.1";


// the various blend modes supported by pixi
PIXI.blendModes = {
    NORMAL:0,
    ADD:1,
    MULTIPLY:2,
    SCREEN:3,
    OVERLAY:4,
    DARKEN:5,
    LIGHTEN:6,
    COLOR_DODGE:7,
    COLOR_BURN:8,
    HARD_LIGHT:9,
    SOFT_LIGHT:10,
    DIFFERENCE:11,
    EXCLUSION:12,
    HUE:13,
    SATURATION:14,
    COLOR:15,
    LUMINOSITY:16
};

// the scale modes
PIXI.scaleModes = {
    DEFAULT:0,
    LINEAR:0,
    NEAREST:1
};

// used to create uids for various pixi objects..
PIXI._UID = 0;

if(typeof(Float32Array) != 'undefined')
{
    PIXI.Float32Array = Float32Array;
    PIXI.Uint16Array = Uint16Array;
}
else
{
    PIXI.Float32Array = Array;
    PIXI.Uint16Array = Array;
}

// interaction frequency 
PIXI.INTERACTION_FREQUENCY = 30;
PIXI.AUTO_PREVENT_DEFAULT = true;

PIXI.RAD_TO_DEG = 180 / Math.PI;
PIXI.DEG_TO_RAD = Math.PI / 180;


PIXI.dontSayHello = false;

PIXI.sayHello = function (type) 
{
    if(PIXI.dontSayHello)return;

    if ( navigator.userAgent.toLowerCase().indexOf('chrome') > -1 )
    {
        var args = [
            '%c %c %c Pixi.js ' + PIXI.VERSION + ' - ' + type + '  %c ' + ' %c ' + ' http://www.pixijs.com/  %c %c ♥%c♥%c♥ ',
            'background: #ff66a5',
            'background: #ff66a5',
            'color: #ff66a5; background: #030307;',
            'background: #ff66a5',
            'background: #ffc3dc',
            'background: #ff66a5',
            'color: #ff2424; background: #fff',
            'color: #ff2424; background: #fff',
            'color: #ff2424; background: #fff'
        ];

       

        console.log.apply(console, args);
    }
    else if (window['console'])
    {
        console.log('Pixi.js ' + PIXI.VERSION + ' - http://www.pixijs.com/');
    }

    PIXI.dontSayHello = true;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents the horizontal axis and y represents the vertical axis.
 *
 * @class Point
 * @constructor
 * @param x {Number} position of the point on the x axis
 * @param y {Number} position of the point on the y axis
 */
PIXI.Point = function(x, y)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;
};

/**
 * Creates a clone of this point
 *
 * @method clone
 * @return {Point} a copy of the point
 */
PIXI.Point.prototype.clone = function()
{
    return new PIXI.Point(this.x, this.y);
};

/**
 * Sets the point to a new x and y position.
 * If y is ommited, both x and y will be set to x.
 * 
 * @method set
 * @param [x=0] {Number} position of the point on the x axis
 * @param [y=0] {Number} position of the point on the y axis
 */
PIXI.Point.prototype.set = function(x, y)
{
    this.x = x || 0;
    this.y = y || ( (y !== 0) ? this.x : 0 ) ;
};

// constructor
PIXI.Point.prototype.constructor = PIXI.Point;
/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * the Rectangle object is an area defined by its position, as indicated by its top-left corner point (x, y) and by its width and its height.
 *
 * @class Rectangle
 * @constructor
 * @param x {Number} The X coord of the upper-left corner of the rectangle
 * @param y {Number} The Y coord of the upper-left corner of the rectangle
 * @param width {Number} The overall width of this rectangle
 * @param height {Number} The overall height of this rectangle
 */
PIXI.Rectangle = function(x, y, width, height)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property width
     * @type Number
     * @default 0
     */
    this.width = width || 0;

    /**
     * @property height
     * @type Number
     * @default 0
     */
    this.height = height || 0;
};

/**
 * Creates a clone of this Rectangle
 *
 * @method clone
 * @return {Rectangle} a copy of the rectangle
 */
PIXI.Rectangle.prototype.clone = function()
{
    return new PIXI.Rectangle(this.x, this.y, this.width, this.height);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this Rectangle
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coords are within this Rectangle
 */
PIXI.Rectangle.prototype.contains = function(x, y)
{
    if(this.width <= 0 || this.height <= 0)
        return false;

    var x1 = this.x;
    if(x >= x1 && x <= x1 + this.width)
    {
        var y1 = this.y;

        if(y >= y1 && y <= y1 + this.height)
        {
            return true;
        }
    }

    return false;
};

// constructor
PIXI.Rectangle.prototype.constructor = PIXI.Rectangle;

PIXI.EmptyRectangle = new PIXI.Rectangle(0,0,0,0);
/**
 * @author Adrien Brault <adrien.brault@gmail.com>
 */

/**
 * @class Polygon
 * @constructor
 * @param points* {Array<Point>|Array<Number>|Point...|Number...} This can be an array of Points that form the polygon,
 *      a flat array of numbers that will be interpreted as [x,y, x,y, ...], or the arguments passed can be
 *      all the points of the polygon e.g. `new PIXI.Polygon(new PIXI.Point(), new PIXI.Point(), ...)`, or the
 *      arguments passed can be flat x,y values e.g. `new PIXI.Polygon(x,y, x,y, x,y, ...)` where `x` and `y` are
 *      Numbers.
 */
PIXI.Polygon = function(points)
{
    //if points isn't an array, use arguments as the array
    if(!(points instanceof Array))
        points = Array.prototype.slice.call(arguments);

    //if this is a flat array of numbers, convert it to points
    if(typeof points[0] === 'number') {
        var p = [];
        for(var i = 0, il = points.length; i < il; i+=2) {
            p.push(
                new PIXI.Point(points[i], points[i + 1])
            );
        }

        points = p;
    }

    this.points = points;
};

/**
 * Creates a clone of this polygon
 *
 * @method clone
 * @return {Polygon} a copy of the polygon
 */
PIXI.Polygon.prototype.clone = function()
{
    var points = [];
    for (var i=0; i<this.points.length; i++) {
        points.push(this.points[i].clone());
    }

    return new PIXI.Polygon(points);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this polygon
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coordinates are within this polygon
 */
PIXI.Polygon.prototype.contains = function(x, y)
{
    var inside = false;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    for(var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y,
            xj = this.points[j].x, yj = this.points[j].y,
            intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if(intersect) inside = !inside;
    }

    return inside;
};

// constructor
PIXI.Polygon.prototype.constructor = PIXI.Polygon;

/**
 * @author Chad Engler <chad@pantherdev.com>
 */

/**
 * The Circle object can be used to specify a hit area for displayObjects
 *
 * @class Circle
 * @constructor
 * @param x {Number} The X coordinate of the center of this circle
 * @param y {Number} The Y coordinate of the center of this circle
 * @param radius {Number} The radius of the circle
 */
PIXI.Circle = function(x, y, radius)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property radius
     * @type Number
     * @default 0
     */
    this.radius = radius || 0;
};

/**
 * Creates a clone of this Circle instance
 *
 * @method clone
 * @return {Circle} a copy of the polygon
 */
PIXI.Circle.prototype.clone = function()
{
    return new PIXI.Circle(this.x, this.y, this.radius);
};

/**
 * Checks whether the x, and y coordinates passed to this function are contained within this circle
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coordinates are within this polygon
 */
PIXI.Circle.prototype.contains = function(x, y)
{
    if(this.radius <= 0)
        return false;

    var dx = (this.x - x),
        dy = (this.y - y),
        r2 = this.radius * this.radius;

    dx *= dx;
    dy *= dy;

    return (dx + dy <= r2);
};

/**
* Returns the framing rectangle of the circle as a PIXI.Rectangle object
*
* @method getBounds
* @return {Rectangle} the framing rectangle
*/
PIXI.Circle.prototype.getBounds = function()
{
    return new PIXI.Rectangle(this.x - this.radius, this.y - this.radius, this.width, this.height);
};

// constructor
PIXI.Circle.prototype.constructor = PIXI.Circle;


/**
 * @author Chad Engler <chad@pantherdev.com>
 */

/**
 * The Ellipse object can be used to specify a hit area for displayObjects
 *
 * @class Ellipse
 * @constructor
 * @param x {Number} The X coordinate of the center of the ellipse
 * @param y {Number} The Y coordinate of the center of the ellipse
 * @param width {Number} The half width of this ellipse
 * @param height {Number} The half height of this ellipse
 */
PIXI.Ellipse = function(x, y, width, height)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property width
     * @type Number
     * @default 0
     */
    this.width = width || 0;

    /**
     * @property height
     * @type Number
     * @default 0
     */
    this.height = height || 0;
};

/**
 * Creates a clone of this Ellipse instance
 *
 * @method clone
 * @return {Ellipse} a copy of the ellipse
 */
PIXI.Ellipse.prototype.clone = function()
{
    return new PIXI.Ellipse(this.x, this.y, this.width, this.height);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this ellipse
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coords are within this ellipse
 */
PIXI.Ellipse.prototype.contains = function(x, y)
{
    if(this.width <= 0 || this.height <= 0)
        return false;

    //normalize the coords to an ellipse with center 0,0
    var normx = ((x - this.x) / this.width),
        normy = ((y - this.y) / this.height);

    normx *= normx;
    normy *= normy;

    return (normx + normy <= 1);
};

/**
* Returns the framing rectangle of the ellipse as a PIXI.Rectangle object
*
* @method getBounds
* @return {Rectangle} the framing rectangle
*/
PIXI.Ellipse.prototype.getBounds = function()
{
    return new PIXI.Rectangle(this.x - this.width, this.y - this.height, this.width, this.height);
};

// constructor
PIXI.Ellipse.prototype.constructor = PIXI.Ellipse;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The Matrix class is now an object, which makes it a lot faster, 
 * here is a representation of it : 
 * | a | b | tx|
 * | c | d | ty|
 * | 0 | 0 | 1 |
 *
 * @class Matrix
 * @constructor
 */
PIXI.Matrix = function()
{
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;
};

/**
 * Creates a pixi matrix object based on the array given as a parameter
 *
 * @method fromArray
 * @param array {Array} The array that the matrix will be filled with
 */
PIXI.Matrix.prototype.fromArray = function(array)
{
    this.a = array[0];
    this.b = array[1];
    this.c = array[3];
    this.d = array[4];
    this.tx = array[2];
    this.ty = array[5];
};

/**
 * Creates an array from the current Matrix object
 *
 * @method toArray
 * @param transpose {Boolean} Whether we need to transpose the matrix or not
 * @return {Array} the newly created array which contains the matrix
 */
PIXI.Matrix.prototype.toArray = function(transpose)
{
    if(!this.array) this.array = new Float32Array(9);
    var array = this.array;

    if(transpose)
    {
        array[0] = this.a;
        array[1] = this.c;
        array[2] = 0;
        array[3] = this.b;
        array[4] = this.d;
        array[5] = 0;
        array[6] = this.tx;
        array[7] = this.ty;
        array[8] = 1;
    }
    else
    {
        array[0] = this.a;
        array[1] = this.b;
        array[2] = this.tx;
        array[3] = this.c;
        array[4] = this.d;
        array[5] = this.ty;
        array[6] = 0;
        array[7] = 0;
        array[8] = 1;
    }

    return array;
};

PIXI.identityMatrix = new PIXI.Matrix();

PIXI.determineMatrixArrayType = function() {
    return (typeof Float32Array !== 'undefined') ? Float32Array : Array;
};

/**
 * The Matrix2 class will choose the best type of array to use between
 * a regular javascript Array and a Float32Array if the latter is available
 *
 * @class Matrix2
 * @constructor
 */
PIXI.Matrix2 = PIXI.determineMatrixArrayType();

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The base class for all objects that are rendered on the screen. 
 * This is an abstract class and should not be used on its own rather it should be extended.
 *
 * @class DisplayObject
 * @constructor
 */
PIXI.DisplayObject = function()
{
    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     *
     * @property position
     * @type Point
     */
    this.position = new PIXI.Point();

    /**
     * The scale factor of the object.
     *
     * @property scale
     * @type Point
     */
    this.scale = new PIXI.Point(1,1);//{x:1, y:1};

    /**
     * The pivot point of the displayObject that it rotates around
     *
     * @property pivot
     * @type Point
     */
    this.pivot = new PIXI.Point(0,0);

    /**
     * The rotation of the object in radians.
     *
     * @property rotation
     * @type Number
     */
    this.rotation = 0;

    /**
     * The opacity of the object.
     *
     * @property alpha
     * @type Number
     */
    this.alpha = 1;

    /**
     * The visibility of the object.
     *
     * @property visible
     * @type Boolean
     */
    this.visible = true;

    /**
     * This is the defined area that will pick up mouse / touch events. It is null by default.
     * Setting it is a neat way of optimising the hitTest function that the interactionManager will use (as it will not need to hit test all the children)
     *
     * @property hitArea
     * @type Rectangle|Circle|Ellipse|Polygon
     */
    this.hitArea = null;

    /**
     * This is used to indicate if the displayObject should display a mouse hand cursor on rollover
     *
     * @property buttonMode
     * @type Boolean
     */
    this.buttonMode = false;

    /**
     * Can this object be rendered
     *
     * @property renderable
     * @type Boolean
     */
    this.renderable = false;

    /**
     * [read-only] The display object container that contains this display object.
     *
     * @property parent
     * @type DisplayObjectContainer
     * @readOnly
     */
    this.parent = null;

    /**
     * [read-only] The stage the display object is connected to, or undefined if it is not connected to the stage.
     *
     * @property stage
     * @type Stage
     * @readOnly
     */
    this.stage = null;

    /**
     * [read-only] The multiplied alpha of the displayObject
     *
     * @property worldAlpha
     * @type Number
     * @readOnly
     */
    this.worldAlpha = 1;

    /**
     * [read-only] Whether or not the object is interactive, do not toggle directly! use the `interactive` property
     *
     * @property _interactive
     * @type Boolean
     * @readOnly
     * @private
     */
    this._interactive = false;

    /**
     * This is the cursor that will be used when the mouse is over this object. To enable this the element must have interaction = true and buttonMode = true
     * 
     * @property defaultCursor
     * @type String
     *
    */
    this.defaultCursor = 'pointer';

    /**
     * [read-only] Current transform of the object based on world (parent) factors
     *
     * @property worldTransform
     * @type Mat3
     * @readOnly
     * @private
     */
    this.worldTransform = new PIXI.Matrix();

    /**
     * [NYI] Unknown
     *
     * @property color
     * @type Array<>
     * @private
     */
    this.color = [];

    /**
     * [NYI] Holds whether or not this object is dynamic, for rendering optimization
     *
     * @property dynamic
     * @type Boolean
     * @private
     */
    this.dynamic = true;

    // cached sin rotation and cos rotation
    this._sr = 0;
    this._cr = 1;

    /**
     * The area the filter is applied to like the hitArea this is used as more of an optimisation
     * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle
     *
     * @property filterArea
     * @type Rectangle
     */
    this.filterArea = null;//new PIXI.Rectangle(0,0,1,1);

    /**
     * The original, cached bounds of the object
     *
     * @property _bounds
     * @type Rectangle
     * @private
     */
    this._bounds = new PIXI.Rectangle(0, 0, 1, 1);
    /**
     * The most up-to-date bounds of the object
     *
     * @property _currentBounds
     * @type Rectangle
     * @private
     */
    this._currentBounds = null;
    /**
     * The original, cached mask of the object
     *
     * @property _currentBounds
     * @type Rectangle
     * @private
     */
    this._mask = null;

    this._cacheAsBitmap = false;
    this._cacheIsDirty = false;


    /*
     * MOUSE Callbacks
     */

    /**
     * A callback that is used when the users clicks on the displayObject with their mouse
     * @method click
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user clicks the mouse down over the sprite
     * @method mousedown
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the mouse that was over the displayObject
     * for this callback to be fired the mouse must have been pressed down over the displayObject
     * @method mouseup
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the mouse that was over the displayObject but is no longer over the displayObject
     * for this callback to be fired, The touch must have started over the displayObject
     * @method mouseupoutside
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the users mouse rolls over the displayObject
     * @method mouseover
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the users mouse leaves the displayObject
     * @method mouseout
     * @param interactionData {InteractionData}
     */


    /*
     * TOUCH Callbacks
     */

    /**
     * A callback that is used when the users taps on the sprite with their finger
     * basically a touch version of click
     * @method tap
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user touches over the displayObject
     * @method touchstart
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases a touch over the displayObject
     * @method touchend
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the touch that was over the displayObject
     * for this callback to be fired, The touch must have started over the sprite
     * @method touchendoutside
     * @param interactionData {InteractionData}
     */
};

// constructor
PIXI.DisplayObject.prototype.constructor = PIXI.DisplayObject;

/**
 * [Deprecated] Indicates if the sprite will have touch and mouse interactivity. It is false by default
 * Instead of using this function you can now simply set the interactive property to true or false
 *
 * @method setInteractive
 * @param interactive {Boolean}
 * @deprecated Simply set the `interactive` property directly
 */
PIXI.DisplayObject.prototype.setInteractive = function(interactive)
{
    this.interactive = interactive;
};

/**
 * Indicates if the sprite will have touch and mouse interactivity. It is false by default
 *
 * @property interactive
 * @type Boolean
 * @default false
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'interactive', {
    get: function() {
        return this._interactive;
    },
    set: function(value) {
        this._interactive = value;

        // TODO more to be done here..
        // need to sort out a re-crawl!
        if(this.stage)this.stage.dirty = true;
    }
});

/**
 * [read-only] Indicates if the sprite is globaly visible.
 *
 * @property worldVisible
 * @type Boolean
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'worldVisible', {
    get: function() {
        var item = this;

        do
        {
            if(!item.visible)return false;
            item = item.parent;
        }
        while(item);

        return true;
    }
});

/**
 * Sets a mask for the displayObject. A mask is an object that limits the visibility of an object to the shape of the mask applied to it.
 * In PIXI a regular mask must be a PIXI.Graphics object. This allows for much faster masking in canvas as it utilises shape clipping.
 * To remove a mask, set this property to null.
 *
 * @property mask
 * @type Graphics
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'mask', {
    get: function() {
        return this._mask;
    },
    set: function(value) {

        if(this._mask)this._mask.isMask = false;
        this._mask = value;
        if(this._mask)this._mask.isMask = true;
    }
});

/**
 * Sets the filters for the displayObject.
 * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
 * To remove filters simply set this property to 'null'
 * @property filters
 * @type Array An array of filters
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'filters', {
    get: function() {
        return this._filters;
    },
    set: function(value) {

        if(value)
        {
            // now put all the passes in one place..
            var passes = [];
            for (var i = 0; i < value.length; i++)
            {
                var filterPasses = value[i].passes;
                for (var j = 0; j < filterPasses.length; j++)
                {
                    passes.push(filterPasses[j]);
                }
            }

            // TODO change this as it is legacy
            this._filterBlock = {target:this, filterPasses:passes};
        }

        this._filters = value;
    }
});

/**
 * Set weather or not a the display objects is cached as a bitmap.
 * This basically takes a snap shot of the display object as it is at that moment. It can provide a performance benefit for complex static displayObjects
 * To remove filters simply set this property to 'null'
 * @property cacheAsBitmap
 * @type Boolean
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'cacheAsBitmap', {
    get: function() {
        return  this._cacheAsBitmap;
    },
    set: function(value) {

        if(this._cacheAsBitmap === value)return;

        if(value)
        {
            //this._cacheIsDirty = true;
            this._generateCachedSprite();
        }
        else
        {
            this._destroyCachedSprite();
        }

        this._cacheAsBitmap = value;
    }
});

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.DisplayObject.prototype.updateTransform = function()
{
    // TODO OPTIMIZE THIS!! with dirty
    if(this.rotation !== this.rotationCache)
    {

        this.rotationCache = this.rotation;
        this._sr =  Math.sin(this.rotation);
        this._cr =  Math.cos(this.rotation);
    }

   // var localTransform = this.localTransform//.toArray();
    var parentTransform = this.parent.worldTransform;//.toArray();
    var worldTransform = this.worldTransform;//.toArray();

    var px = this.pivot.x;
    var py = this.pivot.y;

    var a00 = this._cr * this.scale.x,
        a01 = -this._sr * this.scale.y,
        a10 = this._sr * this.scale.x,
        a11 = this._cr * this.scale.y,
        a02 = this.position.x - a00 * px - py * a01,
        a12 = this.position.y - a11 * py - px * a10,
        b00 = parentTransform.a, b01 = parentTransform.b,
        b10 = parentTransform.c, b11 = parentTransform.d;

    worldTransform.a = b00 * a00 + b01 * a10;
    worldTransform.b = b00 * a01 + b01 * a11;
    worldTransform.tx = b00 * a02 + b01 * a12 + parentTransform.tx;

    worldTransform.c = b10 * a00 + b11 * a10;
    worldTransform.d = b10 * a01 + b11 * a11;
    worldTransform.ty = b10 * a02 + b11 * a12 + parentTransform.ty;

    this.worldAlpha = this.alpha * this.parent.worldAlpha;
};

/**
 * Retrieves the bounds of the displayObject as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObject.prototype.getBounds = function( matrix )
{
    matrix = matrix;//just to get passed js hinting (and preserve inheritance)
    return PIXI.EmptyRectangle;
};

/**
 * Retrieves the local bounds of the displayObject as a rectangle object
 *
 * @method getLocalBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObject.prototype.getLocalBounds = function()
{
    return this.getBounds(PIXI.identityMatrix);///PIXI.EmptyRectangle();
};


/**
 * Sets the object's stage reference, the stage this object is connected to
 *
 * @method setStageReference
 * @param stage {Stage} the stage that the object will have as its current stage reference
 */
PIXI.DisplayObject.prototype.setStageReference = function(stage)
{
    this.stage = stage;
    if(this._interactive)this.stage.dirty = true;
};

PIXI.DisplayObject.prototype.generateTexture = function(renderer)
{
    var bounds = this.getLocalBounds();

    var renderTexture = new PIXI.RenderTexture(bounds.width | 0, bounds.height | 0, renderer);
    renderTexture.render(this, new PIXI.Point(-bounds.x, -bounds.y) );

    return renderTexture;
};

PIXI.DisplayObject.prototype.updateCache = function()
{
    this._generateCachedSprite();
};

PIXI.DisplayObject.prototype._renderCachedSprite = function(renderSession)
{
    this._cachedSprite.worldAlpha = this.worldAlpha;
   
    if(renderSession.gl)
    {
        PIXI.Sprite.prototype._renderWebGL.call(this._cachedSprite, renderSession);
    }
    else
    {
        PIXI.Sprite.prototype._renderCanvas.call(this._cachedSprite, renderSession);
    }
};

PIXI.DisplayObject.prototype._generateCachedSprite = function()//renderSession)
{
    this._cacheAsBitmap = false;
    var bounds = this.getLocalBounds();
   
    if(!this._cachedSprite)
    {
        var renderTexture = new PIXI.RenderTexture(bounds.width | 0, bounds.height | 0);//, renderSession.renderer);
        
        this._cachedSprite = new PIXI.Sprite(renderTexture);
        this._cachedSprite.worldTransform = this.worldTransform;
    }
    else
    {
        this._cachedSprite.texture.resize(bounds.width | 0, bounds.height | 0);
    }

    //REMOVE filter!
    var tempFilters = this._filters;
    this._filters = null;

    this._cachedSprite.filters = tempFilters;
    this._cachedSprite.texture.render(this, new PIXI.Point(-bounds.x, -bounds.y) );

    this._cachedSprite.anchor.x = -( bounds.x / bounds.width );
    this._cachedSprite.anchor.y = -( bounds.y / bounds.height );

    this._filters = tempFilters;

    this._cacheAsBitmap = true;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObject.prototype._destroyCachedSprite = function()
{
    if(!this._cachedSprite)return;

    this._cachedSprite.texture.destroy(true);
  //  console.log("DESTROY")
    // let the gc collect the unused sprite
    // TODO could be object pooled!
    this._cachedSprite = null;
};


PIXI.DisplayObject.prototype._renderWebGL = function(renderSession)
{
    // OVERWRITE;
    // this line is just here to pass jshinting :)
    renderSession = renderSession;
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObject.prototype._renderCanvas = function(renderSession)
{
    // OVERWRITE;
    // this line is just here to pass jshinting :)
    renderSession = renderSession;
};

/**
 * The position of the displayObject on the x axis relative to the local coordinates of the parent.
 *
 * @property x
 * @type Number
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'x', {
    get: function() {
        return  this.position.x;
    },
    set: function(value) {
        this.position.x = value;
    }
});

/**
 * The position of the displayObject on the y axis relative to the local coordinates of the parent.
 *
 * @property y
 * @type Number
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'y', {
    get: function() {
        return  this.position.y;
    },
    set: function(value) {
        this.position.y = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * A DisplayObjectContainer represents a collection of display objects.
 * It is the base class of all display objects that act as a container for other objects.
 *
 * @class DisplayObjectContainer
 * @extends DisplayObject
 * @constructor
 */
PIXI.DisplayObjectContainer = function()
{
    PIXI.DisplayObject.call( this );

    /**
     * [read-only] The array of children of this container.
     *
     * @property children
     * @type Array<DisplayObject>
     * @readOnly
     */
    this.children = [];
};

// constructor
PIXI.DisplayObjectContainer.prototype = Object.create( PIXI.DisplayObject.prototype );
PIXI.DisplayObjectContainer.prototype.constructor = PIXI.DisplayObjectContainer;

/**
 * The width of the displayObjectContainer, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */

 
Object.defineProperty(PIXI.DisplayObjectContainer.prototype, 'width', {
    get: function() {
        return this.scale.x * this.getLocalBounds().width;
    },
    set: function(value) {
        
        var width = this.getLocalBounds().width;

        if(width !== 0)
        {
            this.scale.x = value / ( width/this.scale.x );
        }
        else
        {
            this.scale.x = 1;
        }

        
        this._width = value;
    }
});


/**
 * The height of the displayObjectContainer, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */

Object.defineProperty(PIXI.DisplayObjectContainer.prototype, 'height', {
    get: function() {
        return  this.scale.y * this.getLocalBounds().height;
    },
    set: function(value) {

        var height = this.getLocalBounds().height;

        if(height !== 0)
        {
            this.scale.y = value / ( height/this.scale.y );
        }
        else
        {
            this.scale.y = 1;
        }

        this._height = value;
    }
});


/**
 * Adds a child to the container.
 *
 * @method addChild
 * @param child {DisplayObject} The DisplayObject to add to the container
 */
PIXI.DisplayObjectContainer.prototype.addChild = function(child)
{
    return this.addChildAt(child, this.children.length);
};

/**
 * Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown
 *
 * @method addChildAt
 * @param child {DisplayObject} The child to add
 * @param index {Number} The index to place the child in
 */
PIXI.DisplayObjectContainer.prototype.addChildAt = function(child, index)
{
    if(index >= 0 && index <= this.children.length)
    {
        if(child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;

        this.children.splice(index, 0, child);

        if(this.stage)child.setStageReference(this.stage);

        return child;
    }
    else
    {
        throw new Error(child + ' The index '+ index +' supplied is out of bounds ' + this.children.length);
    }
};

/**
 * [NYI] Swaps the depth of 2 displayObjects
 *
 * @method swapChildren
 * @param child {DisplayObject}
 * @param child2 {DisplayObject}
 * @private
 */
PIXI.DisplayObjectContainer.prototype.swapChildren = function(child, child2)
{
    if(child === child2) {
        return;
    }

    var index1 = this.children.indexOf(child);
    var index2 = this.children.indexOf(child2);

    if(index1 < 0 || index2 < 0) {
        throw new Error('swapChildren: Both the supplied DisplayObjects must be a child of the caller.');
    }

    this.children[index1] = child2;
    this.children[index2] = child;
    
};

/**
 * Returns the child at the specified index
 *
 * @method getChildAt
 * @param index {Number} The index to get the child from
 */
PIXI.DisplayObjectContainer.prototype.getChildAt = function(index)
{
    if(index >= 0 && index < this.children.length)
    {
        return this.children[index];
    }
    else
    {
        throw new Error('Supplied index does not exist in the child list, or the supplied DisplayObject must be a child of the caller');
    }
};

/**
 * Removes a child from the container.
 *
 * @method removeChild
 * @param child {DisplayObject} The DisplayObject to remove
 */
PIXI.DisplayObjectContainer.prototype.removeChild = function(child)
{
    return this.removeChildAt( this.children.indexOf( child ) );
};

/**
 * Removes a child from the specified index position in the child list of the container.
 *
 * @method removeChildAt
 * @param index {Number} The index to get the child from
 */
PIXI.DisplayObjectContainer.prototype.removeChildAt = function(index)
{
    var child = this.getChildAt( index );
    if(this.stage)
        child.removeStageReference();

    child.parent = undefined;
    this.children.splice( index, 1 );
    return child;
};

/**
* Removes all child instances from the child list of the container.
*
* @method removeChildren
* @param beginIndex {Number} The beginning position. Predefined value is 0.
* @param endIndex {Number} The ending position. Predefined value is children's array length.
*/
PIXI.DisplayObjectContainer.prototype.removeChildren = function(beginIndex, endIndex)
{
    var begin = beginIndex || 0;
    var end = typeof endIndex === 'number' ? endIndex : this.children.length;
    var range = end - begin;

    if (range > 0 && range <= end)
    {
        var removed = this.children.splice(begin, range);
        for (var i = 0; i < removed.length; i++) {
            var child = removed[i];
            if(this.stage)
                child.removeStageReference();
            child.parent = undefined;
        }
        return removed;
    }
    else
    {
        throw new Error( 'Range Error, numeric values are outside the acceptable range' );
    }
};

/*
 * Updates the container's childrens transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.DisplayObjectContainer.prototype.updateTransform = function()
{
    //this._currentBounds = null;

    if(!this.visible)return;

    PIXI.DisplayObject.prototype.updateTransform.call( this );

    if(this._cacheAsBitmap)return;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }
};

/**
 * Retrieves the bounds of the displayObjectContainer as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObjectContainer.prototype.getBounds = function(matrix)
{
    if(this.children.length === 0)return PIXI.EmptyRectangle;

    // TODO the bounds have already been calculated this render session so return what we have
    if(matrix)
    {
        var matrixCache = this.worldTransform;
        this.worldTransform = matrix;
        this.updateTransform();
        this.worldTransform = matrixCache;
    }

    var minX = Infinity;
    var minY = Infinity;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var childBounds;
    var childMaxX;
    var childMaxY;

    var childVisible = false;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        
        if(!child.visible)continue;

        childVisible = true;

        childBounds = this.children[i].getBounds( matrix );
     
        minX = minX < childBounds.x ? minX : childBounds.x;
        minY = minY < childBounds.y ? minY : childBounds.y;

        childMaxX = childBounds.width + childBounds.x;
        childMaxY = childBounds.height + childBounds.y;

        maxX = maxX > childMaxX ? maxX : childMaxX;
        maxY = maxY > childMaxY ? maxY : childMaxY;
    }

    if(!childVisible)
        return PIXI.EmptyRectangle;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.y = minY;
    bounds.width = maxX - minX;
    bounds.height = maxY - minY;

    // TODO: store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    //this._currentBounds = bounds;
   
    return bounds;
};

PIXI.DisplayObjectContainer.prototype.getLocalBounds = function()
{
    var matrixCache = this.worldTransform;

    this.worldTransform = PIXI.identityMatrix;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }

    var bounds = this.getBounds();

    this.worldTransform = matrixCache;

    return bounds;
};

/**
 * Sets the container's stage reference, the stage this object is connected to
 *
 * @method setStageReference
 * @param stage {Stage} the stage that the container will have as its current stage reference
 */
PIXI.DisplayObjectContainer.prototype.setStageReference = function(stage)
{
    this.stage = stage;
    if(this._interactive)this.stage.dirty = true;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child.setStageReference(stage);
    }
};

/**
 * removes the current stage reference of the container
 *
 * @method removeStageReference
 */
PIXI.DisplayObjectContainer.prototype.removeStageReference = function()
{

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child.removeStageReference();
    }

    if(this._interactive)this.stage.dirty = true;
    
    this.stage = null;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObjectContainer.prototype._renderWebGL = function(renderSession)
{
    if(!this.visible || this.alpha <= 0)return;
    
    if(this._cacheAsBitmap)
    {
        this._renderCachedSprite(renderSession);
        return;
    }
    
    var i,j;

    if(this._mask || this._filters)
    {
        
        // push filter first as we need to ensure the stencil buffer is correct for any masking
        if(this._filters)
        {
            renderSession.spriteBatch.flush();
            renderSession.filterManager.pushFilter(this._filterBlock);
        }

        if(this._mask)
        {
            renderSession.spriteBatch.stop();
            renderSession.maskManager.pushMask(this.mask, renderSession);
            renderSession.spriteBatch.start();
        }

        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }

        renderSession.spriteBatch.stop();

        if(this._mask)renderSession.maskManager.popMask(this._mask, renderSession);
        if(this._filters)renderSession.filterManager.popFilter();
        
        renderSession.spriteBatch.start();
    }
    else
    {
        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }
    }
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObjectContainer.prototype._renderCanvas = function(renderSession)
{
    if(this.visible === false || this.alpha === 0)return;

    if(this._cacheAsBitmap)
    {

        this._renderCachedSprite(renderSession);
        return;
    }

    if(this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, renderSession.context);
    }

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child._renderCanvas(renderSession);
    }

    if(this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The Sprite object is the base for all textured objects that are rendered to the screen
 *
 * @class Sprite
 * @extends DisplayObjectContainer
 * @constructor
 * @param texture {Texture} The texture for this sprite
 * 
 * A sprite can be created directly from an image like this : 
 * var sprite = new PIXI.Sprite.fromImage('assets/image.png');
 * yourStage.addChild(sprite);
 * then obviously don't forget to add it to the stage you have already created
 */
PIXI.Sprite = function(texture)
{
    PIXI.DisplayObjectContainer.call( this );

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 this means the texture's origin is the top left
     * Setting than anchor to 0.5,0.5 means the textures origin is centred
     * Setting the anchor to 1,1 would mean the textures origin points will be the bottom right corner
     *
     * @property anchor
     * @type Point
     */
    this.anchor = new PIXI.Point();

    /**
     * The texture that the sprite is using
     *
     * @property texture
     * @type Texture
     */
    this.texture = texture;

    /**
     * The width of the sprite (this is initially set by the texture)
     *
     * @property _width
     * @type Number
     * @private
     */
    this._width = 0;

    /**
     * The height of the sprite (this is initially set by the texture)
     *
     * @property _height
     * @type Number
     * @private
     */
    this._height = 0;


    /**
     * The tint applied to the sprite. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;// * Math.random();
    
    /**
     * The blend mode to be applied to the sprite
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;

    if(texture.baseTexture.hasLoaded)
    {
        this.onTextureUpdate();
    }
    else
    {
        this.onTextureUpdateBind = this.onTextureUpdate.bind(this);
        this.texture.addEventListener( 'update', this.onTextureUpdateBind );
    }

    this.renderable = true;
};

// constructor
PIXI.Sprite.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Sprite.prototype.constructor = PIXI.Sprite;

/**
 * The width of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */
Object.defineProperty(PIXI.Sprite.prototype, 'width', {
    get: function() {
        return this.scale.x * this.texture.frame.width;
    },
    set: function(value) {
        this.scale.x = value / this.texture.frame.width;
        this._width = value;
    }
});

/**
 * The height of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */
Object.defineProperty(PIXI.Sprite.prototype, 'height', {
    get: function() {
        return  this.scale.y * this.texture.frame.height;
    },
    set: function(value) {
        this.scale.y = value / this.texture.frame.height;
        this._height = value;
    }
});

/**
 * Sets the texture of the sprite
 *
 * @method setTexture
 * @param texture {Texture} The PIXI texture that is displayed by the sprite
 */
PIXI.Sprite.prototype.setTexture = function(texture)
{
    this.texture = texture;
    this.cachedTint = 0xFFFFFF;
};

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */
PIXI.Sprite.prototype.onTextureUpdate = function()
{
    // so if _width is 0 then width was not set..
    if(this._width)this.scale.x = this._width / this.texture.frame.width;
    if(this._height)this.scale.y = this._height / this.texture.frame.height;


    //this.updateFrame = true;
};

/**
* Returns the framing rectangle of the sprite as a PIXI.Rectangle object
*
* @method getBounds
* @param matrix {Matrix} the transformation matrix of the sprite
* @return {Rectangle} the framing rectangle
*/
PIXI.Sprite.prototype.getBounds = function(matrix)
{

    var width = this.texture.frame.width;
    var height = this.texture.frame.height;

    var w0 = width * (1-this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1-this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = matrix || this.worldTransform ;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    minX = x1 < minX ? x1 : minX;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1 < minY ? y1 : minY;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1 > maxX ? x1 : maxX;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1 > maxY ? y1 : maxY;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Sprite.prototype._renderWebGL = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(!this.visible || this.alpha <= 0)return;
    
    var i,j;

    // do a quick check to see if this element has a mask or a filter.
    if(this._mask || this._filters)
    {
        var spriteBatch =  renderSession.spriteBatch;

        // push filter first as we need to ensure the stencil buffer is correct for any masking
        if(this._filters)
        {
            spriteBatch.flush();
            renderSession.filterManager.pushFilter(this._filterBlock);
        }

        if(this._mask)
        {
            spriteBatch.stop();
            renderSession.maskManager.pushMask(this.mask, renderSession);
            spriteBatch.start();
        }

        // add this sprite to the batch
        spriteBatch.render(this);

        // now loop through the children and make sure they get rendered
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }

        // time to stop the sprite batch as either a mask element or a filter draw will happen next
        spriteBatch.stop();

        if(this._mask)renderSession.maskManager.popMask(this._mask, renderSession);
        if(this._filters)renderSession.filterManager.popFilter();
        
        spriteBatch.start();
    }
    else
    {
        renderSession.spriteBatch.render(this);

        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }
    }

   
    //TODO check culling  
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Sprite.prototype._renderCanvas = function(renderSession)
{
    // If the sprite is not visible or the alpha is 0 then no need to render this element
    if (this.visible === false || this.alpha === 0) return;
    
    if (this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        renderSession.context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    if (this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, renderSession.context);
    }

    //  Ignore null sources
    if (this.texture.valid)
    {
        renderSession.context.globalAlpha = this.worldAlpha;

        //  Allow for pixel rounding
        if (renderSession.roundPixels)
        {
            renderSession.context.setTransform(
                this.worldTransform.a,
                this.worldTransform.c,
                this.worldTransform.b,
                this.worldTransform.d,
                this.worldTransform.tx | 0,
                this.worldTransform.ty | 0);
        }
        else
        {
            renderSession.context.setTransform(
                this.worldTransform.a,
                this.worldTransform.c,
                this.worldTransform.b,
                this.worldTransform.d,
                this.worldTransform.tx,
                this.worldTransform.ty);
        }

        //  If smoothingEnabled is supported and we need to change the smoothing property for this texture
        if (renderSession.smoothProperty && renderSession.scaleMode !== this.texture.baseTexture.scaleMode)
        {
            renderSession.scaleMode = this.texture.baseTexture.scaleMode;
            renderSession.context[renderSession.smoothProperty] = (renderSession.scaleMode === PIXI.scaleModes.LINEAR);
        }

        //  If the texture is trimmed we offset by the trim x/y, otherwise we use the frame dimensions
        var dx = (this.texture.trim) ? this.texture.trim.x - this.anchor.x * this.texture.trim.width : this.anchor.x * -this.texture.frame.width;
        var dy = (this.texture.trim) ? this.texture.trim.y - this.anchor.y * this.texture.trim.height : this.anchor.y * -this.texture.frame.height;

        if (this.tint !== 0xFFFFFF)
        {
            if (this.cachedTint !== this.tint)
            {
                this.cachedTint = this.tint;
                
                //  TODO clean up caching - how to clean up the caches?
                this.tintedTexture = PIXI.CanvasTinter.getTintedTexture(this, this.tint);
            }

            renderSession.context.drawImage(
                                this.tintedTexture,
                                0,
                                0,
                                this.texture.crop.width,
                                this.texture.crop.height,
                                dx,
                                dy,
                                this.texture.crop.width,
                                this.texture.crop.height);
        }
        else
        {
            renderSession.context.drawImage(
                                this.texture.baseTexture.source,
                                this.texture.crop.x,
                                this.texture.crop.y,
                                this.texture.crop.width,
                                this.texture.crop.height,
                                dx,
                                dy,
                                this.texture.crop.width,
                                this.texture.crop.height);
        }
    }

    // OVERWRITE
    for (var i = 0, j = this.children.length; i < j; i++)
    {
        this.children[i]._renderCanvas(renderSession);
    }

    if (this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};

// some helper functions..

/**
 *
 * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
 * The frame ids are created when a Texture packer file has been loaded
 *
 * @method fromFrame
 * @static
 * @param frameId {String} The frame Id of the texture in the cache
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the frameId
 */
PIXI.Sprite.fromFrame = function(frameId)
{
    var texture = PIXI.TextureCache[frameId];
    if(!texture) throw new Error('The frameId "' + frameId + '" does not exist in the texture cache' + this);
    return new PIXI.Sprite(texture);
};

/**
 *
 * Helper function that creates a sprite that will contain a texture based on an image url
 * If the image is not in the texture cache it will be loaded
 *
 * @method fromImage
 * @static
 * @param imageId {String} The image url of the texture
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the image id
 */
PIXI.Sprite.fromImage = function(imageId, crossorigin, scaleMode)
{
    var texture = PIXI.Texture.fromImage(imageId, crossorigin, scaleMode);
    return new PIXI.Sprite(texture);
};

/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * The SpriteBatch class is a really fast version of the DisplayObjectContainer 
 * built solely for speed, so use when you need a lot of sprites or particles.
 * And it's extremely easy to use : 

    var container = new PIXI.SpriteBatch();
 
    stage.addChild(container);
 
    for(var i  = 0; i < 100; i++)
    {
        var sprite = new PIXI.Sprite.fromImage("myImage.png");
        container.addChild(sprite);
    }
 * And here you have a hundred sprites that will be renderer at the speed of light
 *
 * @class SpriteBatch
 * @constructor
 * @param texture {Texture}
 */
PIXI.SpriteBatch = function(texture)
{
    PIXI.DisplayObjectContainer.call( this);

    this.textureThing = texture;

    this.ready = false;
};

PIXI.SpriteBatch.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.SpriteBatch.constructor = PIXI.SpriteBatch;

/*
 * Initialises the spriteBatch
 *
 * @method initWebGL
 * @param gl {WebGLContext} the current WebGL drawing context
 */
PIXI.SpriteBatch.prototype.initWebGL = function(gl)
{
    // TODO only one needed for the whole engine really?
    this.fastSpriteBatch = new PIXI.WebGLFastSpriteBatch(gl);

    this.ready = true;
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.SpriteBatch.prototype.updateTransform = function()
{
   // TODO dont need to!
    PIXI.DisplayObject.prototype.updateTransform.call( this );
  //  PIXI.DisplayObjectContainer.prototype.updateTransform.call( this );
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.SpriteBatch.prototype._renderWebGL = function(renderSession)
{
    if(!this.visible || this.alpha <= 0 || !this.children.length)return;

    if(!this.ready)this.initWebGL( renderSession.gl );
    
    renderSession.spriteBatch.stop();
    
    renderSession.shaderManager.setShader(renderSession.shaderManager.fastShader);
    
    this.fastSpriteBatch.begin(this, renderSession);
    this.fastSpriteBatch.render(this);

    renderSession.spriteBatch.start();
 
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.SpriteBatch.prototype._renderCanvas = function(renderSession)
{
    var context = renderSession.context;
    context.globalAlpha = this.worldAlpha;

    PIXI.DisplayObject.prototype.updateTransform.call(this);

    var transform = this.worldTransform;
    // alow for trimming
       
    var isRotated = true;

    for (var i = 0; i < this.children.length; i++) {
       
        var child = this.children[i];

        if(!child.visible)continue;

        var texture = child.texture;
        var frame = texture.frame;

        context.globalAlpha = this.worldAlpha * child.alpha;

        if(child.rotation % (Math.PI * 2) === 0)
        {
            if(isRotated)
            {
                context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
                isRotated = false;
            }

            // this is the fastest  way to optimise! - if rotation is 0 then we can avoid any kind of setTransform call
            context.drawImage(texture.baseTexture.source,
                                 frame.x,
                                 frame.y,
                                 frame.width,
                                 frame.height,
                                 ((child.anchor.x) * (-frame.width * child.scale.x) + child.position.x  + 0.5) | 0,
                                 ((child.anchor.y) * (-frame.height * child.scale.y) + child.position.y  + 0.5) | 0,
                                 frame.width * child.scale.x,
                                 frame.height * child.scale.y);
        }
        else
        {
            if(!isRotated)isRotated = true;
    
            PIXI.DisplayObject.prototype.updateTransform.call(child);
           
            var childTransform = child.worldTransform;

            // allow for trimming
           
            if (renderSession.roundPixels)
            {
                context.setTransform(childTransform.a, childTransform.c, childTransform.b, childTransform.d, childTransform.tx | 0, childTransform.ty | 0);
            }
            else
            {
                context.setTransform(childTransform.a, childTransform.c, childTransform.b, childTransform.d, childTransform.tx, childTransform.ty);
            }

            context.drawImage(texture.baseTexture.source,
                                 frame.x,
                                 frame.y,
                                 frame.width,
                                 frame.height,
                                 ((child.anchor.x) * (-frame.width) + 0.5) | 0,
                                 ((child.anchor.y) * (-frame.height) + 0.5) | 0,
                                 frame.width,
                                 frame.height);
           

        }

       // context.restore();
    }

//    context.restore();
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A MovieClip is a simple way to display an animation depicted by a list of textures.
 *
 * @class MovieClip
 * @extends Sprite
 * @constructor
 * @param textures {Array<Texture>} an array of {Texture} objects that make up the animation
 */
PIXI.MovieClip = function(textures)
{
    PIXI.Sprite.call(this, textures[0]);

    /**
     * The array of textures that make up the animation
     *
     * @property textures
     * @type Array
     */
    this.textures = textures;

    /**
     * The speed that the MovieClip will play at. Higher is faster, lower is slower
     *
     * @property animationSpeed
     * @type Number
     * @default 1
     */
    this.animationSpeed = 1;

    /**
     * Whether or not the movie clip repeats after playing.
     *
     * @property loop
     * @type Boolean
     * @default true
     */
    this.loop = true;

    /**
     * Function to call when a MovieClip finishes playing
     *
     * @property onComplete
     * @type Function
     */
    this.onComplete = null;

    /**
     * [read-only] The MovieClips current frame index (this may not have to be a whole number)
     *
     * @property currentFrame
     * @type Number
     * @default 0
     * @readOnly
     */
    this.currentFrame = 0;

    /**
     * [read-only] Indicates if the MovieClip is currently playing
     *
     * @property playing
     * @type Boolean
     * @readOnly
     */
    this.playing = false;
};

// constructor
PIXI.MovieClip.prototype = Object.create( PIXI.Sprite.prototype );
PIXI.MovieClip.prototype.constructor = PIXI.MovieClip;

/**
* [read-only] totalFrames is the total number of frames in the MovieClip. This is the same as number of textures
* assigned to the MovieClip.
*
* @property totalFrames
* @type Number
* @default 0
* @readOnly
*/
Object.defineProperty( PIXI.MovieClip.prototype, 'totalFrames', {
	get: function() {

		return this.textures.length;
	}
});


/**
 * Stops the MovieClip
 *
 * @method stop
 */
PIXI.MovieClip.prototype.stop = function()
{
    this.playing = false;
};

/**
 * Plays the MovieClip
 *
 * @method play
 */
PIXI.MovieClip.prototype.play = function()
{
    this.playing = true;
};

/**
 * Stops the MovieClip and goes to a specific frame
 *
 * @method gotoAndStop
 * @param frameNumber {Number} frame index to stop at
 */
PIXI.MovieClip.prototype.gotoAndStop = function(frameNumber)
{
    this.playing = false;
    this.currentFrame = frameNumber;
    var round = (this.currentFrame + 0.5) | 0;
    this.setTexture(this.textures[round % this.textures.length]);
};

/**
 * Goes to a specific frame and begins playing the MovieClip
 *
 * @method gotoAndPlay
 * @param frameNumber {Number} frame index to start at
 */
PIXI.MovieClip.prototype.gotoAndPlay = function(frameNumber)
{
    this.currentFrame = frameNumber;
    this.playing = true;
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.MovieClip.prototype.updateTransform = function()
{
    PIXI.Sprite.prototype.updateTransform.call(this);

    if(!this.playing)return;

    this.currentFrame += this.animationSpeed;

    var round = (this.currentFrame + 0.5) | 0;

    this.currentFrame = this.currentFrame % this.textures.length;

    if(this.loop || round < this.textures.length)
    {
        this.setTexture(this.textures[round % this.textures.length]);
    }
    else if(round >= this.textures.length)
    {
        this.gotoAndStop(this.textures.length - 1);
        if(this.onComplete)
        {
            this.onComplete();
        }
    }
};

/**
 * A short hand way of creating a movieclip from an array of frame ids
 *
 * @static
 * @method fromFrames
 * @param frames {Array} the array of frames ids the movieclip will use as its texture frames
 */
PIXI.MovieClip.fromFrames = function(frames)
{
    var textures = [];

    for (var i = 0; i < frames.length; i++)
    {
        textures.push(new PIXI.Texture.fromFrame(frames[i]));
    }

    return new PIXI.MovieClip(textures);
};

/**
 * A short hand way of creating a movieclip from an array of image ids
 *
 * @static
 * @method fromFrames
 * @param frames {Array} the array of image ids the movieclip will use as its texture frames
 */
PIXI.MovieClip.fromImages = function(images)
{
    var textures = [];

    for (var i = 0; i < images.length; i++)
    {
        textures.push(new PIXI.Texture.fromImage(images[i]));
    }

    return new PIXI.MovieClip(textures);
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


PIXI.FilterBlock = function()
{
    this.visible = true;
    this.renderable = true;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * - Modified by Tom Slezakowski http://www.tomslezakowski.com @TomSlezakowski (24/03/2014) - Added dropShadowColor.
 */

/**
 * A Text Object will create a line(s) of text. To split a line you can use '\n' 
 * or add a wordWrap property set to true and and wordWrapWidth property with a value
 * in the style object
 *
 * @class Text
 * @extends Sprite
 * @constructor
 * @param text {String} The copy that you would like the text to display
 * @param [style] {Object} The style parameters
 * @param [style.font] {String} default 'bold 20px Arial' The style and size of the font
 * @param [style.fill='black'] {String|Number} A canvas fillstyle that will be used on the text e.g 'red', '#00FF00'
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 * @param [style.stroke] {String|Number} A canvas fillstyle that will be used on the text stroke e.g 'blue', '#FCFF00'
 * @param [style.strokeThickness=0] {Number} A number that represents the thickness of the stroke. Default is 0 (no stroke)
 * @param [style.wordWrap=false] {Boolean} Indicates if word wrap should be used
 * @param [style.wordWrapWidth=100] {Number} The width at which text will wrap, it needs wordWrap to be set to true
 * @param [style.dropShadow=false] {Boolean} Set a drop shadow for the text
 * @param [style.dropShadowColor='#000000'] {String} A fill style to be used on the dropshadow e.g 'red', '#00FF00'
 * @param [style.dropShadowAngle=Math.PI/4] {Number} Set a angle of the drop shadow
 * @param [style.dropShadowDistance=5] {Number} Set a distance of the drop shadow
 */
PIXI.Text = function(text, style)
{
    /**
     * The canvas element that everything is drawn to
     *
     * @property canvas
     * @type HTMLCanvasElement
     */
    this.canvas = document.createElement('canvas');

    /**
     * The canvas 2d context that everything is drawn with
     * @property context
     * @type HTMLCanvasElement 2d Context
     */
    this.context = this.canvas.getContext('2d');

    PIXI.Sprite.call(this, PIXI.Texture.fromCanvas(this.canvas));

    this.setText(text);
    this.setStyle(style);
};

// constructor
PIXI.Text.prototype = Object.create(PIXI.Sprite.prototype);
PIXI.Text.prototype.constructor = PIXI.Text;


/**
 * The width of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */
Object.defineProperty(PIXI.Text.prototype, 'width', {
    get: function() {

        if(this.dirty)
        {
            this.updateText();
            this.dirty = false;
        }


        return this.scale.x * this.texture.frame.width;
    },
    set: function(value) {
        this.scale.x = value / this.texture.frame.width;
        this._width = value;
    }
});

/**
 * The height of the Text, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */
Object.defineProperty(PIXI.Text.prototype, 'height', {
    get: function() {

        if(this.dirty)
        {
            this.updateText();
            this.dirty = false;
        }


        return  this.scale.y * this.texture.frame.height;
    },
    set: function(value) {
        this.scale.y = value / this.texture.frame.height;
        this._height = value;
    }
});


/**
 * Set the style of the text
 *
 * @method setStyle
 * @param [style] {Object} The style parameters
 * @param [style.font='bold 20pt Arial'] {String} The style and size of the font
 * @param [style.fill='black'] {Object} A canvas fillstyle that will be used on the text eg 'red', '#00FF00'
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 * @param [style.stroke='black'] {String} A canvas fillstyle that will be used on the text stroke eg 'blue', '#FCFF00'
 * @param [style.strokeThickness=0] {Number} A number that represents the thickness of the stroke. Default is 0 (no stroke)
 * @param [style.wordWrap=false] {Boolean} Indicates if word wrap should be used
 * @param [style.wordWrapWidth=100] {Number} The width at which text will wrap
 * @param [style.dropShadow=false] {Boolean} Set a drop shadow for the text
 * @param [style.dropShadowColor='#000000'] {String} A fill style to be used on the dropshadow e.g 'red', '#00FF00'
 * @param [style.dropShadowAngle=Math.PI/4] {Number} Set a angle of the drop shadow
 * @param [style.dropShadowDistance=5] {Number} Set a distance of the drop shadow
 */
PIXI.Text.prototype.setStyle = function(style)
{
    style = style || {};
    style.font = style.font || 'bold 20pt Arial';
    style.fill = style.fill || 'black';
    style.align = style.align || 'left';
    style.stroke = style.stroke || 'black'; //provide a default, see: https://github.com/GoodBoyDigital/pixi.js/issues/136
    style.strokeThickness = style.strokeThickness || 0;
    style.wordWrap = style.wordWrap || false;
    style.wordWrapWidth = style.wordWrapWidth || 100;
    style.wordWrapWidth = style.wordWrapWidth || 100;
    
    style.dropShadow = style.dropShadow || false;
    style.dropShadowAngle = style.dropShadowAngle || Math.PI / 6;
    style.dropShadowDistance = style.dropShadowDistance || 4;
    style.dropShadowColor = style.dropShadowColor || 'black';

    this.style = style;
    this.dirty = true;
};

/**
 * Set the copy for the text object. To split a line you can use '\n'
 *
 * @method setText
 * @param {String} text The copy that you would like the text to display
 */
PIXI.Text.prototype.setText = function(text)
{
    this.text = text.toString() || ' ';
    this.dirty = true;

};

/**
 * Renders text and updates it when needed
 *
 * @method updateText
 * @private
 */
PIXI.Text.prototype.updateText = function()
{
    this.context.font = this.style.font;

    var outputText = this.text;

    // word wrap
    // preserve original text
    if(this.style.wordWrap)outputText = this.wordWrap(this.text);

    //split text into lines
    var lines = outputText.split(/(?:\r\n|\r|\n)/);

    //calculate text width
    var lineWidths = [];
    var maxLineWidth = 0;
    for (var i = 0; i < lines.length; i++)
    {
        var lineWidth = this.context.measureText(lines[i]).width;
        lineWidths[i] = lineWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }

    var width = maxLineWidth + this.style.strokeThickness;
    if(this.style.dropShadow)width += this.style.dropShadowDistance;

    this.canvas.width = width + this.context.lineWidth;
    //calculate text height
    var lineHeight = this.determineFontHeight('font: ' + this.style.font  + ';') + this.style.strokeThickness;
    
    var height = lineHeight * lines.length;
    if(this.style.dropShadow)height += this.style.dropShadowDistance;

    this.canvas.height = height;

    if(navigator.isCocoonJS) this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    
    this.context.font = this.style.font;
    this.context.strokeStyle = this.style.stroke;
    this.context.lineWidth = this.style.strokeThickness;
    this.context.textBaseline = 'top';

    var linePositionX;
    var linePositionY;

    if(this.style.dropShadow)
    {
        this.context.fillStyle = this.style.dropShadowColor;

        var xShadowOffset = Math.sin(this.style.dropShadowAngle) * this.style.dropShadowDistance;
        var yShadowOffset = Math.cos(this.style.dropShadowAngle) * this.style.dropShadowDistance;

        for (i = 0; i < lines.length; i++)
        {
            linePositionX = this.style.strokeThickness / 2;
            linePositionY = this.style.strokeThickness / 2 + i * lineHeight;

            if(this.style.align === 'right')
            {
                linePositionX += maxLineWidth - lineWidths[i];
            }
            else if(this.style.align === 'center')
            {
                linePositionX += (maxLineWidth - lineWidths[i]) / 2;
            }

            if(this.style.fill)
            {
                this.context.fillText(lines[i], linePositionX + xShadowOffset, linePositionY + yShadowOffset);
            }

          //  if(dropShadow)
        }
    }

    //set canvas text styles
    this.context.fillStyle = this.style.fill;
    
    //draw lines line by line
    for (i = 0; i < lines.length; i++)
    {
        linePositionX = this.style.strokeThickness / 2;
        linePositionY = this.style.strokeThickness / 2 + i * lineHeight;

        if(this.style.align === 'right')
        {
            linePositionX += maxLineWidth - lineWidths[i];
        }
        else if(this.style.align === 'center')
        {
            linePositionX += (maxLineWidth - lineWidths[i]) / 2;
        }

        if(this.style.stroke && this.style.strokeThickness)
        {
            this.context.strokeText(lines[i], linePositionX, linePositionY);
        }

        if(this.style.fill)
        {
            this.context.fillText(lines[i], linePositionX, linePositionY);
        }

      //  if(dropShadow)
    }


    this.updateTexture();
};

/**
 * Updates texture size based on canvas size
 *
 * @method updateTexture
 * @private
 */
PIXI.Text.prototype.updateTexture = function()
{
    this.texture.baseTexture.width = this.canvas.width;
    this.texture.baseTexture.height = this.canvas.height;
    this.texture.crop.width = this.texture.frame.width = this.canvas.width;
    this.texture.crop.height = this.texture.frame.height = this.canvas.height;

    this._width = this.canvas.width;
    this._height = this.canvas.height;

    this.requiresUpdate =  true;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Text.prototype._renderWebGL = function(renderSession)
{
    if(this.requiresUpdate)
    {
        this.requiresUpdate = false;
        PIXI.updateWebGLTexture(this.texture.baseTexture, renderSession.gl);
    }

    PIXI.Sprite.prototype._renderWebGL.call(this, renderSession);
};

/**
 * Updates the transform of this object
 *
 * @method updateTransform
 * @private
 */
PIXI.Text.prototype.updateTransform = function()
{
    if(this.dirty)
    {
        this.updateText();
        this.dirty = false;
    }

    PIXI.Sprite.prototype.updateTransform.call(this);
};

/*
 * http://stackoverflow.com/users/34441/ellisbben
 * great solution to the problem!
 * returns the height of the given font
 *
 * @method determineFontHeight
 * @param fontStyle {Object}
 * @private
 */
PIXI.Text.prototype.determineFontHeight = function(fontStyle)
{
    // build a little reference dictionary so if the font style has been used return a
    // cached version...
    var result = PIXI.Text.heightCache[fontStyle];

    if(!result)
    {
        var body = document.getElementsByTagName('body')[0];
        var dummy = document.createElement('div');
        var dummyText = document.createTextNode('M');
        dummy.appendChild(dummyText);
        dummy.setAttribute('style', fontStyle + ';position:absolute;top:0;left:0');
        body.appendChild(dummy);

        result = dummy.offsetHeight;
        PIXI.Text.heightCache[fontStyle] = result;

        body.removeChild(dummy);
    }

    return result;
};

/**
 * Applies newlines to a string to have it optimally fit into the horizontal
 * bounds set by the Text object's wordWrapWidth property.
 *
 * @method wordWrap
 * @param text {String}
 * @private
 */
PIXI.Text.prototype.wordWrap = function(text)
{
    // Greedy wrapping algorithm that will wrap words as the line grows longer
    // than its horizontal bounds.
    var result = '';
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++)
    {
        var spaceLeft = this.style.wordWrapWidth;
        var words = lines[i].split(' ');
        for (var j = 0; j < words.length; j++)
        {
            var wordWidth = this.context.measureText(words[j]).width;
            var wordWidthWithSpace = wordWidth + this.context.measureText(' ').width;
            if(j === 0 || wordWidthWithSpace > spaceLeft)
            {
                // Skip printing the newline if it's the first word of the line that is
                // greater than the word wrap width.
                if(j > 0)
                {
                    result += '\n';
                }
                result += words[j];
                spaceLeft = this.style.wordWrapWidth - wordWidth;
            }
            else
            {
                spaceLeft -= wordWidthWithSpace;
                result += ' ' + words[j];
            }
        }

        if (i < lines.length-1)
        {
            result += '\n';
        }
    }
    return result;
};

/**
 * Destroys this text object
 *
 * @method destroy
 * @param destroyBaseTexture {Boolean} whether to destroy the base texture as well
 */
PIXI.Text.prototype.destroy = function(destroyBaseTexture)
{
    // make sure to reset the the context and canvas.. dont want this hanging around in memory!
    this.context = null;
    this.canvas = null;

    this.texture.destroy(destroyBaseTexture === undefined ? true : destroyBaseTexture);
};

PIXI.Text.heightCache = {};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Text Object will create a line(s) of text using bitmap font. To split a line you can use '\n', '\r' or '\r\n'
 * You can generate the fnt files using
 * http://www.angelcode.com/products/bmfont/ for windows or
 * http://www.bmglyph.com/ for mac.
 *
 * @class BitmapText
 * @extends DisplayObjectContainer
 * @constructor
 * @param text {String} The copy that you would like the text to display
 * @param style {Object} The style parameters
 * @param style.font {String} The size (optional) and bitmap font id (required) eq 'Arial' or '20px Arial' (must have loaded previously)
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 */
PIXI.BitmapText = function(text, style)
{
    PIXI.DisplayObjectContainer.call(this);

    this._pool = [];

    this.setText(text);
    this.setStyle(style);
    this.updateText();
    this.dirty = false;
};

// constructor
PIXI.BitmapText.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.BitmapText.prototype.constructor = PIXI.BitmapText;

/**
 * Set the copy for the text object
 *
 * @method setText
 * @param text {String} The copy that you would like the text to display
 */
PIXI.BitmapText.prototype.setText = function(text)
{
    this.text = text || ' ';
    this.dirty = true;
};

/**
 * Set the style of the text
 * style.font {String} The size (optional) and bitmap font id (required) eq 'Arial' or '20px Arial' (must have loaded previously)
 * [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 *
 * @method setStyle
 * @param style {Object} The style parameters, contained as properties of an object
 */
PIXI.BitmapText.prototype.setStyle = function(style)
{
    style = style || {};
    style.align = style.align || 'left';
    this.style = style;

    var font = style.font.split(' ');
    this.fontName = font[font.length - 1];
    this.fontSize = font.length >= 2 ? parseInt(font[font.length - 2], 10) : PIXI.BitmapText.fonts[this.fontName].size;

    this.dirty = true;
    this.tint = style.tint;
};

/**
 * Renders text and updates it when needed
 *
 * @method updateText
 * @private
 */
PIXI.BitmapText.prototype.updateText = function()
{
    var data = PIXI.BitmapText.fonts[this.fontName];
    var pos = new PIXI.Point();
    var prevCharCode = null;
    var chars = [];
    var maxLineWidth = 0;
    var lineWidths = [];
    var line = 0;
    var scale = this.fontSize / data.size;
    

    for(var i = 0; i < this.text.length; i++)
    {
        var charCode = this.text.charCodeAt(i);
        if(/(?:\r\n|\r|\n)/.test(this.text.charAt(i)))
        {
            lineWidths.push(pos.x);
            maxLineWidth = Math.max(maxLineWidth, pos.x);
            line++;

            pos.x = 0;
            pos.y += data.lineHeight;
            prevCharCode = null;
            continue;
        }

        var charData = data.chars[charCode];
        if(!charData) continue;

        if(prevCharCode && charData[prevCharCode])
        {
            pos.x += charData.kerning[prevCharCode];
        }
        chars.push({texture:charData.texture, line: line, charCode: charCode, position: new PIXI.Point(pos.x + charData.xOffset, pos.y + charData.yOffset)});
        pos.x += charData.xAdvance;

        prevCharCode = charCode;
    }

    lineWidths.push(pos.x);
    maxLineWidth = Math.max(maxLineWidth, pos.x);

    var lineAlignOffsets = [];
    for(i = 0; i <= line; i++)
    {
        var alignOffset = 0;
        if(this.style.align === 'right')
        {
            alignOffset = maxLineWidth - lineWidths[i];
        }
        else if(this.style.align === 'center')
        {
            alignOffset = (maxLineWidth - lineWidths[i]) / 2;
        }
        lineAlignOffsets.push(alignOffset);
    }

    var lenChildren = this.children.length;
    var lenChars = chars.length;
    var tint = this.tint || 0xFFFFFF;
    for(i = 0; i < lenChars; i++)
    {
        var c = i < lenChildren ? this.children[i] : this._pool.pop(); // get old child if have. if not - take from pool.

        if (c) c.setTexture(chars[i].texture); // check if got one before.
        else c = new PIXI.Sprite(chars[i].texture); // if no create new one.

        c.position.x = (chars[i].position.x + lineAlignOffsets[chars[i].line]) * scale;
        c.position.y = chars[i].position.y * scale;
        c.scale.x = c.scale.y = scale;
        c.tint = tint;
        if (!c.parent) this.addChild(c);
    }

    // remove unnecessary children.
    // and put their into the pool.
    while(this.children.length > lenChars)
    {
        var child = this.getChildAt(this.children.length - 1);
        this._pool.push(child);
        this.removeChild(child);
    }


    /**
     * [read-only] The width of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @property textWidth
     * @type Number
     */
    this.textWidth = maxLineWidth * scale;

    /**
     * [read-only] The height of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @property textHeight
     * @type Number
     */
    this.textHeight = (pos.y + data.lineHeight) * scale;
};

/**
 * Updates the transform of this object
 *
 * @method updateTransform
 * @private
 */
PIXI.BitmapText.prototype.updateTransform = function()
{
    if(this.dirty)
    {
        this.updateText();
        this.dirty = false;
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call(this);
};

PIXI.BitmapText.fonts = {};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
/**
 * Holds all information related to an Interaction event
 *
 * @class InteractionData
 * @constructor
 */
PIXI.InteractionData = function()
{
    /**
     * This point stores the global coords of where the touch/mouse event happened
     *
     * @property global
     * @type Point
     */
    this.global = new PIXI.Point();

   
    /**
     * The target Sprite that was interacted with
     *
     * @property target
     * @type Sprite
     */
    this.target = null;

    /**
     * When passed to an event handler, this will be the original DOM Event that was captured
     *
     * @property originalEvent
     * @type Event
     */
    this.originalEvent = null;
};

/**
 * This will return the local coordinates of the specified displayObject for this InteractionData
 *
 * @method getLocalPosition
 * @param displayObject {DisplayObject} The DisplayObject that you would like the local coords off
 * @return {Point} A point containing the coordinates of the InteractionData position relative to the DisplayObject
 */
PIXI.InteractionData.prototype.getLocalPosition = function(displayObject)
{
    var worldTransform = displayObject.worldTransform;
    var global = this.global;

    // do a cheeky transform to get the mouse coords;
    var a00 = worldTransform.a, a01 = worldTransform.b, a02 = worldTransform.tx,
        a10 = worldTransform.c, a11 = worldTransform.d, a12 = worldTransform.ty,
        id = 1 / (a00 * a11 + a01 * -a10);
    // set the mouse coords...
    return new PIXI.Point(a11 * id * global.x + -a01 * id * global.y + (a12 * a01 - a02 * a11) * id,
                               a00 * id * global.y + -a10 * id * global.x + (-a12 * a00 + a02 * a10) * id);
};

// constructor
PIXI.InteractionData.prototype.constructor = PIXI.InteractionData;
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

 /**
 * The interaction manager deals with mouse and touch events. Any DisplayObject can be interactive
 * if its interactive parameter is set to true
 * This manager also supports multitouch.
 *
 * @class InteractionManager
 * @constructor
 * @param stage {Stage} The stage to handle interactions
 */
PIXI.InteractionManager = function(stage)
{
    /**
     * a reference to the stage
     *
     * @property stage
     * @type Stage
     */
    this.stage = stage;

    /**
     * the mouse data
     *
     * @property mouse
     * @type InteractionData
     */
    this.mouse = new PIXI.InteractionData();

    /**
     * an object that stores current touches (InteractionData) by id reference
     *
     * @property touchs
     * @type Object
     */
    this.touchs = {};

    // helpers
    this.tempPoint = new PIXI.Point();

    /**
     * 
     * @property mouseoverEnabled
     * @type Boolean
     * @default
     */
    this.mouseoverEnabled = true;

    /**
     * tiny little interactiveData pool !
     * 
     * @property pool
     * @type Array
     */
    this.pool = [];

    /**
     * An array containing all the iterative items from the our interactive tree
     * @property interactiveItems
     * @type Array
     * @private
     *
     */
    this.interactiveItems = [];

    /**
     * Our canvas
     * @property interactionDOMElement
     * @type HTMLCanvasElement
     * @private
     */
    this.interactionDOMElement = null;

    //this will make it so that you dont have to call bind all the time
    this.onMouseMove = this.onMouseMove.bind( this );
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    this.last = 0;

    /**
     * The css style of the cursor that is being used
     * @property currentCursorStyle
     * @type String
     *
     */
    this.currentCursorStyle = 'inherit';

    /**
     * Is set to true when the mouse is moved out of the canvas
     * @property mouseOut
     * @type Boolean
     *
     */
    this.mouseOut = false;
};

// constructor
PIXI.InteractionManager.prototype.constructor = PIXI.InteractionManager;

/**
 * Collects an interactive sprite recursively to have their interactions managed
 *
 * @method collectInteractiveSprite
 * @param displayObject {DisplayObject} the displayObject to collect
 * @param iParent {DisplayObject} the display object's parent
 * @private
 */
PIXI.InteractionManager.prototype.collectInteractiveSprite = function(displayObject, iParent)
{
    var children = displayObject.children;
    var length = children.length;

    // make an interaction tree... {item.__interactiveParent}
    for (var i = length-1; i >= 0; i--)
    {
        var child = children[i];

        // push all interactive bits
        if(child._interactive)
        {
            iParent.interactiveChildren = true;
            //child.__iParent = iParent;
            this.interactiveItems.push(child);

            if(child.children.length > 0)
            {
                this.collectInteractiveSprite(child, child);
            }
        }
        else
        {
            child.__iParent = null;

            if(child.children.length > 0)
            {
                this.collectInteractiveSprite(child, iParent);
            }
        }

    }
};

/**
 * Sets the target for event delegation
 *
 * @method setTarget
 * @param target {WebGLRenderer|CanvasRenderer} the renderer to bind events to
 * @private
 */
PIXI.InteractionManager.prototype.setTarget = function(target)
{
    this.target = target;

    //check if the dom element has been set. If it has don't do anything
    if( this.interactionDOMElement === null ) {

        this.setTargetDomElement( target.view );
    }

    
};


/**
 * Sets the DOM element which will receive mouse/touch events. This is useful for when you have other DOM
 * elements on top of the renderers Canvas element. With this you'll be able to delegate another DOM element
 * to receive those events
 *
 * @method setTargetDomElement
 * @param domElement {DOMElement} the DOM element which will receive mouse and touch events
 * @private
 */
PIXI.InteractionManager.prototype.setTargetDomElement = function(domElement)
{

    this.removeEvents();


    if (window.navigator.msPointerEnabled)
    {
        // time to remove some of that zoom in ja..
        domElement.style['-ms-content-zooming'] = 'none';
        domElement.style['-ms-touch-action'] = 'none';

        // DO some window specific touch!
    }

    this.interactionDOMElement = domElement;

    domElement.addEventListener('mousemove',  this.onMouseMove, true);
    domElement.addEventListener('mousedown',  this.onMouseDown, true);
    domElement.addEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    domElement.addEventListener('touchstart', this.onTouchStart, true);
    domElement.addEventListener('touchend', this.onTouchEnd, true);
    domElement.addEventListener('touchmove', this.onTouchMove, true);

    window.addEventListener('mouseup',  this.onMouseUp, true);
};


PIXI.InteractionManager.prototype.removeEvents = function()
{
    if(!this.interactionDOMElement)return;

    this.interactionDOMElement.style['-ms-content-zooming'] = '';
    this.interactionDOMElement.style['-ms-touch-action'] = '';

    this.interactionDOMElement.removeEventListener('mousemove',  this.onMouseMove, true);
    this.interactionDOMElement.removeEventListener('mousedown',  this.onMouseDown, true);
    this.interactionDOMElement.removeEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    this.interactionDOMElement.removeEventListener('touchstart', this.onTouchStart, true);
    this.interactionDOMElement.removeEventListener('touchend', this.onTouchEnd, true);
    this.interactionDOMElement.removeEventListener('touchmove', this.onTouchMove, true);

    this.interactionDOMElement = null;

    window.removeEventListener('mouseup',  this.onMouseUp, true);
};

/**
 * updates the state of interactive objects
 *
 * @method update
 * @private
 */
PIXI.InteractionManager.prototype.update = function()
{
    if(!this.target)return;

    // frequency of 30fps??
    var now = Date.now();
    var diff = now - this.last;
    diff = (diff * PIXI.INTERACTION_FREQUENCY ) / 1000;
    if(diff < 1)return;
    this.last = now;

    var i = 0;

    // ok.. so mouse events??
    // yes for now :)
    // OPTIMISE - how often to check??
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    // loop through interactive objects!
    var length = this.interactiveItems.length;
    var cursor = 'inherit';
    var over = false;

    for (i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        // OPTIMISATION - only calculate every time if the mousemove function exists..
        // OK so.. does the object have any other interactive functions?
        // hit-test the clip!
       // if(item.mouseover || item.mouseout || item.buttonMode)
       // {
        // ok so there are some functions so lets hit test it..
        item.__hit = this.hitTest(item, this.mouse);
        this.mouse.target = item;
        // ok so deal with interactions..
        // looks like there was a hit!
        if(item.__hit && !over)
        {
            if(item.buttonMode) cursor = item.defaultCursor;

            if(!item.interactiveChildren)over = true;

            if(!item.__isOver)
            {
                if(item.mouseover)item.mouseover(this.mouse);
                item.__isOver = true;
            }
        }
        else
        {
            if(item.__isOver)
            {
                // roll out!
                if(item.mouseout)item.mouseout(this.mouse);
                item.__isOver = false;
            }
        }
    }

    if( this.currentCursorStyle !== cursor )
    {
        this.currentCursorStyle = cursor;
        this.interactionDOMElement.style.cursor = cursor;
    }
};

PIXI.InteractionManager.prototype.rebuildInteractiveGraph = function()
{
    this.dirty = false;

    var len = this.interactiveItems.length;

    for (var i = 0; i < len; i++) {
        this.interactiveItems[i].interactiveChildren = false;
    }

    this.interactiveItems = [];

    if(this.stage.interactive)this.interactiveItems.push(this.stage);
    // go through and collect all the objects that are interactive..
    this.collectInteractiveSprite(this.stage, this.stage);
};

/**
 * Is called when the mouse moves across the renderer element
 *
 * @method onMouseMove
 * @param event {Event} The DOM event of the mouse moving
 * @private
 */
PIXI.InteractionManager.prototype.onMouseMove = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    this.mouse.originalEvent = event || window.event; //IE uses window.event
    // TODO optimize by not check EVERY TIME! maybe half as often? //
    var rect = this.interactionDOMElement.getBoundingClientRect();

    this.mouse.global.x = (event.clientX - rect.left) * (this.target.width / rect.width);
    this.mouse.global.y = (event.clientY - rect.top) * ( this.target.height / rect.height);

    var length = this.interactiveItems.length;

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        if(item.mousemove)
        {
            //call the function!
            item.mousemove(this.mouse);
        }
    }
};

/**
 * Is called when the mouse button is pressed down on the renderer element
 *
 * @method onMouseDown
 * @param event {Event} The DOM event of a mouse button being pressed down
 * @private
 */
PIXI.InteractionManager.prototype.onMouseDown = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    this.mouse.originalEvent = event || window.event; //IE uses window.event

    if(PIXI.AUTO_PREVENT_DEFAULT)this.mouse.originalEvent.preventDefault();

    // loop through interaction tree...
    // hit test each item! ->
    // get interactive items under point??
    //stage.__i
    var length = this.interactiveItems.length;

    // while
    // hit test
    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        if(item.mousedown || item.click)
        {
            item.__mouseIsDown = true;
            item.__hit = this.hitTest(item, this.mouse);

            if(item.__hit)
            {
                //call the function!
                if(item.mousedown)item.mousedown(this.mouse);
                item.__isDown = true;

                // just the one!
                if(!item.interactiveChildren)break;
            }
        }
    }
};

/**
 * Is called when the mouse button is moved out of the renderer element
 *
 * @method onMouseOut
 * @param event {Event} The DOM event of a mouse button being moved out
 * @private 
 */
PIXI.InteractionManager.prototype.onMouseOut = function()
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    var length = this.interactiveItems.length;

    this.interactionDOMElement.style.cursor = 'inherit';

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];
        if(item.__isOver)
        {
            this.mouse.target = item;
            if(item.mouseout)item.mouseout(this.mouse);
            item.__isOver = false;
        }
    }

    this.mouseOut = true;

    // move the mouse to an impossible position
    this.mouse.global.x = -10000;
    this.mouse.global.y = -10000;
};

/**
 * Is called when the mouse button is released on the renderer element
 *
 * @method onMouseUp
 * @param event {Event} The DOM event of a mouse button being released
 * @private
 */
PIXI.InteractionManager.prototype.onMouseUp = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    this.mouse.originalEvent = event || window.event; //IE uses window.event

    var length = this.interactiveItems.length;
    var up = false;

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        item.__hit = this.hitTest(item, this.mouse);

        if(item.__hit && !up)
        {
            //call the function!
            if(item.mouseup)
            {
                item.mouseup(this.mouse);
            }
            if(item.__isDown)
            {
                if(item.click)item.click(this.mouse);
            }

            if(!item.interactiveChildren)up = true;
        }
        else
        {
            if(item.__isDown)
            {
                if(item.mouseupoutside)item.mouseupoutside(this.mouse);
            }
        }

        item.__isDown = false;
        //}
    }
};

/**
 * Tests if the current mouse coordinates hit a sprite
 *
 * @method hitTest
 * @param item {DisplayObject} The displayObject to test for a hit
 * @param interactionData {InteractionData} The interactionData object to update in the case there is a hit
 * @private
 */
PIXI.InteractionManager.prototype.hitTest = function(item, interactionData)
{
    var global = interactionData.global;

    if( !item.worldVisible )return false;

    // temp fix for if the element is in a non visible
   
    var isSprite = (item instanceof PIXI.Sprite),
        worldTransform = item.worldTransform,
        a00 = worldTransform.a, a01 = worldTransform.b, a02 = worldTransform.tx,
        a10 = worldTransform.c, a11 = worldTransform.d, a12 = worldTransform.ty,
        id = 1 / (a00 * a11 + a01 * -a10),
        x = a11 * id * global.x + -a01 * id * global.y + (a12 * a01 - a02 * a11) * id,
        y = a00 * id * global.y + -a10 * id * global.x + (-a12 * a00 + a02 * a10) * id;

    interactionData.target = item;

    //a sprite or display object with a hit area defined
    if(item.hitArea && item.hitArea.contains) {
        if(item.hitArea.contains(x, y)) {
            //if(isSprite)
            interactionData.target = item;

            return true;
        }

        return false;
    }
    // a sprite with no hitarea defined
    else if(isSprite)
    {
        var width = item.texture.frame.width,
            height = item.texture.frame.height,
            x1 = -width * item.anchor.x,
            y1;

        if(x > x1 && x < x1 + width)
        {
            y1 = -height * item.anchor.y;

            if(y > y1 && y < y1 + height)
            {
                // set the target property if a hit is true!
                interactionData.target = item;
                return true;
            }
        }
    }

    var length = item.children.length;

    for (var i = 0; i < length; i++)
    {
        var tempItem = item.children[i];
        var hit = this.hitTest(tempItem, interactionData);
        if(hit)
        {
            // hmm.. TODO SET CORRECT TARGET?
            interactionData.target = item;
            return true;
        }
    }

    return false;
};

/**
 * Is called when a touch is moved across the renderer element
 *
 * @method onTouchMove
 * @param event {Event} The DOM event of a touch moving across the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchMove = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    var rect = this.interactionDOMElement.getBoundingClientRect();
    var changedTouches = event.changedTouches;
    var touchData;
    var i = 0;

    for (i = 0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];
        touchData = this.touchs[touchEvent.identifier];
        touchData.originalEvent =  event || window.event;

        // update the touch position
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }

        for (var j = 0; j < this.interactiveItems.length; j++)
        {
            var item = this.interactiveItems[j];
            if(item.touchmove && item.__touchData && item.__touchData[touchEvent.identifier]) item.touchmove(touchData);
        }
    }
};

/**
 * Is called when a touch is started on the renderer element
 *
 * @method onTouchStart
 * @param event {Event} The DOM event of a touch starting on the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchStart = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }

    var rect = this.interactionDOMElement.getBoundingClientRect();

    if(PIXI.AUTO_PREVENT_DEFAULT)event.preventDefault();
    
    var changedTouches = event.changedTouches;
    for (var i=0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];

        var touchData = this.pool.pop();
        if(!touchData)touchData = new PIXI.InteractionData();

        touchData.originalEvent =  event || window.event;

        this.touchs[touchEvent.identifier] = touchData;
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }

        var length = this.interactiveItems.length;

        for (var j = 0; j < length; j++)
        {
            var item = this.interactiveItems[j];

            if(item.touchstart || item.tap)
            {
                item.__hit = this.hitTest(item, touchData);

                if(item.__hit)
                {
                    //call the function!
                    if(item.touchstart)item.touchstart(touchData);
                    item.__isDown = true;
                    item.__touchData = item.__touchData || {};
                    item.__touchData[touchEvent.identifier] = touchData;

                    if(!item.interactiveChildren)break;
                }
            }
        }
    }
};

/**
 * Is called when a touch is ended on the renderer element
 *
 * @method onTouchEnd
 * @param event {Event} The DOM event of a touch ending on the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchEnd = function(event)
{
    if(this.dirty)
    {
        this.rebuildInteractiveGraph();
    }
    
    //this.mouse.originalEvent = event || window.event; //IE uses window.event
    var rect = this.interactionDOMElement.getBoundingClientRect();
    var changedTouches = event.changedTouches;

    for (var i=0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];
        var touchData = this.touchs[touchEvent.identifier];
        var up = false;
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }

        var length = this.interactiveItems.length;
        for (var j = 0; j < length; j++)
        {
            var item = this.interactiveItems[j];

            if(item.__touchData && item.__touchData[touchEvent.identifier]) {

                item.__hit = this.hitTest(item, item.__touchData[touchEvent.identifier]);

                // so this one WAS down...
                touchData.originalEvent = event || window.event;
                // hitTest??

                if(item.touchend || item.tap)
                {
                    if(item.__hit && !up)
                    {
                        if(item.touchend)item.touchend(touchData);
                        if(item.__isDown)
                        {
                            if(item.tap)item.tap(touchData);
                        }

                        if(!item.interactiveChildren)up = true;
                    }
                    else
                    {
                        if(item.__isDown)
                        {
                            if(item.touchendoutside)item.touchendoutside(touchData);
                        }
                    }

                    item.__isDown = false;
                }

                item.__touchData[touchEvent.identifier] = null;
            }
        }
        // remove the touch..
        this.pool.push(touchData);
        this.touchs[touchEvent.identifier] = null;
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Stage represents the root of the display tree. Everything connected to the stage is rendered
 *
 * @class Stage
 * @extends DisplayObjectContainer
 * @constructor
 * @param backgroundColor {Number} the background color of the stage, you have to pass this in is in hex format
 *      like: 0xFFFFFF for white
 * 
 * Creating a stage is a mandatory process when you use Pixi, which is as simple as this : 
 * var stage = new PIXI.Stage(0xFFFFFF);
 * where the parameter given is the background colour of the stage, in hex
 * you will use this stage instance to add your sprites to it and therefore to the renderer
 * Here is how to add a sprite to the stage : 
 * stage.addChild(sprite);
 */
PIXI.Stage = function(backgroundColor)
{
    PIXI.DisplayObjectContainer.call( this );

    /**
     * [read-only] Current transform of the object based on world (parent) factors
     *
     * @property worldTransform
     * @type Mat3
     * @readOnly
     * @private
     */
    this.worldTransform = new PIXI.Matrix();

    /**
     * Whether or not the stage is interactive
     *
     * @property interactive
     * @type Boolean
     */
    this.interactive = true;

    /**
     * The interaction manage for this stage, manages all interactive activity on the stage
     *
     * @property interactionManager
     * @type InteractionManager
     */
    this.interactionManager = new PIXI.InteractionManager(this);

    /**
     * Whether the stage is dirty and needs to have interactions updated
     *
     * @property dirty
     * @type Boolean
     * @private
     */
    this.dirty = true;

    //the stage is its own stage
    this.stage = this;

    //optimize hit detection a bit
    this.stage.hitArea = new PIXI.Rectangle(0,0,100000, 100000);

    this.setBackgroundColor(backgroundColor);
};

// constructor
PIXI.Stage.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Stage.prototype.constructor = PIXI.Stage;

/**
 * Sets another DOM element which can receive mouse/touch interactions instead of the default Canvas element.
 * This is useful for when you have other DOM elements on top of the Canvas element.
 *
 * @method setInteractionDelegate
 * @param domElement {DOMElement} This new domElement which will receive mouse/touch events
 */
PIXI.Stage.prototype.setInteractionDelegate = function(domElement)
{
    this.interactionManager.setTargetDomElement( domElement );
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Stage.prototype.updateTransform = function()
{
    this.worldAlpha = 1;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }

    if(this.dirty)
    {
        this.dirty = false;
        // update interactive!
        this.interactionManager.dirty = true;
    }

    if(this.interactive)this.interactionManager.update();
};

/**
 * Sets the background color for the stage
 *
 * @method setBackgroundColor
 * @param backgroundColor {Number} the color of the background, easiest way to pass this in is in hex format
 *      like: 0xFFFFFF for white
 */
PIXI.Stage.prototype.setBackgroundColor = function(backgroundColor)
{
    this.backgroundColor = backgroundColor || 0x000000;
    this.backgroundColorSplit = PIXI.hex2rgb(this.backgroundColor);
    var hex = this.backgroundColor.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;
    this.backgroundColorString = '#' + hex;
};

/**
 * This will return the point containing global coords of the mouse.
 *
 * @method getMousePosition
 * @return {Point} The point containing the coords of the global InteractionData position.
 */
PIXI.Stage.prototype.getMousePosition = function()
{
    return this.interactionManager.mouse.global;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

/**
 * A polyfill for requestAnimationFrame
 * You can actually use both requestAnimationFrame and requestAnimFrame, 
 * you will still benefit from the polyfill
 *
 * @method requestAnimationFrame
 */
/**
 * A polyfill for cancelAnimationFrame
 *
 * @method cancelAnimationFrame
 */
var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
        window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}

if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

window.requestAnimFrame = window.requestAnimationFrame;

/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @method hex2rgb
 * @param hex {Number}
 */
PIXI.hex2rgb = function(hex) {
    return [(hex >> 16 & 0xFF) / 255, ( hex >> 8 & 0xFF) / 255, (hex & 0xFF)/ 255];
};

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @method rgb2hex
 * @param rgb {Array}
 */
PIXI.rgb2hex = function(rgb) {
    return ((rgb[0]*255 << 16) + (rgb[1]*255 << 8) + rgb[2]*255);
};

/**
 * A polyfill for Function.prototype.bind
 *
 * @method bind
 */
if (typeof Function.prototype.bind !== 'function') {
    Function.prototype.bind = (function () {
        var slice = Array.prototype.slice;
        return function (thisArg) {
            var target = this, boundArgs = slice.call(arguments, 1);

            if (typeof target !== 'function') throw new TypeError();

            function bound() {
                var args = boundArgs.concat(slice.call(arguments));
                target.apply(this instanceof bound ? this : thisArg, args);
            }

            bound.prototype = (function F(proto) {
                if (proto) F.prototype = proto;
                if (!(this instanceof F)) return new F();
            })(target.prototype);

            return bound;
        };
    })();
}

/**
 * A wrapper for ajax requests to be handled cross browser
 *
 * @class AjaxRequest
 * @constructor
 */
PIXI.AjaxRequest = function()
{
    var activexmodes = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Microsoft.XMLHTTP']; //activeX versions to check for in IE

    if (window.ActiveXObject)
    { //Test for support for ActiveXObject in IE first (as XMLHttpRequest in IE7 is broken)
        for (var i=0; i<activexmodes.length; i++)
        {
            try{
                return new window.ActiveXObject(activexmodes[i]);
            }
            catch(e) {
                //suppress error
            }
        }
    }
    else if (window.XMLHttpRequest) // if Mozilla, Safari etc
    {
        return new window.XMLHttpRequest();
    }
    else
    {
        return false;
    }
};
/*
PIXI.packColorRGBA = function(r, g, b, a)//r, g, b, a)
{
  //  console.log(r, b, c, d)
  return (Math.floor((r)*63) << 18) | (Math.floor((g)*63) << 12) | (Math.floor((b)*63) << 6);// | (Math.floor((a)*63))
  //  i = i | (Math.floor((a)*63));
   // return i;
   // var r = (i / 262144.0 ) / 64;
   // var g = (i / 4096.0)%64 / 64;
  //  var b = (i / 64.0)%64 / 64;
  //  var a = (i)%64 / 64;
     
  //  console.log(r, g, b, a);
  //  return i;

};
*/
/*
PIXI.packColorRGB = function(r, g, b)//r, g, b, a)
{
    return (Math.floor((r)*255) << 16) | (Math.floor((g)*255) << 8) | (Math.floor((b)*255));
};

PIXI.unpackColorRGB = function(r, g, b)//r, g, b, a)
{
    return (Math.floor((r)*255) << 16) | (Math.floor((g)*255) << 8) | (Math.floor((b)*255));
};
*/

/**
 * Checks whether the Canvas BlendModes are supported by the current browser
 *
 * @method canUseNewCanvasBlendModes
 * @return {Boolean} whether they are supported
 */
PIXI.canUseNewCanvasBlendModes = function()
{
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    var context = canvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0,0,1,1);
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = '#fff';
    context.fillRect(0,0,1,1);
    return context.getImageData(0,0,1,1).data[0] === 0;
};

/**
 * Given a number, this function returns the closest number that is a power of two
 * this function is taken from Starling Framework as its pretty neat ;)
 *
 * @method getNextPowerOfTwo
 * @param number {Number}
 * @return {Number} the closest number that is a power of two
 */
PIXI.getNextPowerOfTwo = function(number)
{
    if (number > 0 && (number & (number - 1)) === 0) // see: http://goo.gl/D9kPj
        return number;
    else
    {
        var result = 1;
        while (result < number) result <<= 1;
        return result;
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
/**
 * https://github.com/mrdoob/eventtarget.js/
 * THankS mr DOob!
 */

/**
 * Adds event emitter functionality to a class
 *
 * @class EventTarget
 * @example
 *      function MyEmitter() {
 *          PIXI.EventTarget.call(this); //mixes in event target stuff
 *      }
 *
 *      var em = new MyEmitter();
 *      em.emit({ type: 'eventName', data: 'some data' });
 */
PIXI.EventTarget = function () {

    /**
     * Holds all the listeners
     *
     * @property listeners
     * @type Object
     */
    var listeners = {};

    /**
     * Adds a listener for a specific event
     *
     * @method addEventListener
     * @param type {string} A string representing the event type to listen for.
     * @param listener {function} The callback function that will be fired when the event occurs
     */
    this.addEventListener = this.on = function ( type, listener ) {


        if ( listeners[ type ] === undefined ) {

            listeners[ type ] = [];

        }

        if ( listeners[ type ].indexOf( listener ) === - 1 ) {

            listeners[ type ].unshift( listener );
        }

    };

    /**
     * Fires the event, ie pretends that the event has happened
     *
     * @method dispatchEvent
     * @param event {Event} the event object
     */
    this.dispatchEvent = this.emit = function ( event ) {

        if ( !listeners[ event.type ] || !listeners[ event.type ].length ) {

            return;

        }


        for(var i = listeners[ event.type ].length-1; i >= 0; i--) {
//        for(var i = 0, l=listeners[ event.type ].length; i < l; i++) {


            listeners[ event.type ][ i ]( event );

        }

    };

    /**
     * Removes the specified listener that was assigned to the specified event type
     *
     * @method removeEventListener
     * @param type {string} A string representing the event type which will have its listener removed
     * @param listener {function} The callback function that was be fired when the event occured
     */
    this.removeEventListener = this.off = function ( type, listener ) {

        if ( listeners[ type ] === undefined ) return;

        var index = listeners[ type ].indexOf( listener );

        if ( index !== - 1 ) {

            listeners[ type ].splice( index, 1 );

        }

    };

    /**
     * Removes all the listeners that were active for the specified event type
     *
     * @method removeAllEventListeners
     * @param type {string} A string representing the event type which will have all its listeners removed
     */
	this.removeAllEventListeners = function( type ) {
		var a = listeners[type];
		if (a)
			a.length = 0;
	};
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * This helper function will automatically detect which renderer you should be using.
 * WebGL is the preferred renderer as it is a lot faster. If webGL is not supported by
 * the browser then this function will return a canvas renderer
 * @class autoDetectRenderer
 * @static
 * @param width=800 {Number} the width of the renderers view
 * @param height=600 {Number} the height of the renderers view
 * @param [view] {Canvas} the canvas to use as a view, optional 
 * @param [transparent=false] {Boolean} the transparency of the render view, default false
 * @param [antialias=false] {Boolean} sets antialias (only applicable in webGL chrome at the moment)
 *
 */
PIXI.autoDetectRenderer = function(width, height, view, transparent, antialias)
{
    if(!width)width = 800;
    if(!height)height = 600;

    // BORROWED from Mr Doob (mrdoob.com)
    var webgl = ( function () { try {
                                    var canvas = document.createElement( 'canvas' );
                                    return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
                                } catch( e ) {
                                    return false;
                                }
                            } )();

    if( webgl )
    {
        return new PIXI.WebGLRenderer(width, height, view, transparent, antialias);
    }

    return  new PIXI.CanvasRenderer(width, height, view, transparent);
};

/**
 * This helper function will automatically detect which renderer you should be using.
 * This function is very similar to the autoDetectRenderer function except that is will return a canvas renderer for android.
 * Even thought both android chrome suports webGL the canvas implementation perform better at the time of writing. 
 * This function will likely change and update as webGL performance imporoves on thease devices.
 * @class getRecommendedRenderer
 * @static
 * @param width=800 {Number} the width of the renderers view
 * @param height=600 {Number} the height of the renderers view
 * @param [view] {Canvas} the canvas to use as a view, optional 
 * @param [transparent=false] {Boolean} the transparency of the render view, default false
 * @param [antialias=false] {Boolean} sets antialias (only applicable in webGL chrome at the moment)
 *
 */
PIXI.autoDetectRecommendedRenderer = function(width, height, view, transparent, antialias)
{
    if(!width)width = 800;
    if(!height)height = 600;

    // BORROWED from Mr Doob (mrdoob.com)
    var webgl = ( function () { try {
                                    var canvas = document.createElement( 'canvas' );
                                    return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
                                } catch( e ) {
                                    return false;
                                }
                            } )();

    var isAndroid = /Android/i.test(navigator.userAgent);

    if( webgl && !isAndroid)
    {
        return new PIXI.WebGLRenderer(width, height, view, transparent, antialias);
    }

    return  new PIXI.CanvasRenderer(width, height, view, transparent);
};

/*
    PolyK library
    url: http://polyk.ivank.net
    Released under MIT licence.

    Copyright (c) 2012 Ivan Kuckir

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    This is an amazing lib!

    slightly modified by Mat Groves (matgroves.com);
*/

/**
 * Based on the Polyk library http://polyk.ivank.net released under MIT licence.
 * This is an amazing lib!
 * slightly modified by Mat Groves (matgroves.com);
 * @class PolyK
 *
 */
PIXI.PolyK = {};

/**
 * Triangulates shapes for webGL graphic fills
 *
 * @method Triangulate
 * 
 */
PIXI.PolyK.Triangulate = function(p)
{
    var sign = true;

    var n = p.length >> 1;
    if(n < 3) return [];

    var tgs = [];
    var avl = [];
    for(var i = 0; i < n; i++) avl.push(i);

    i = 0;
    var al = n;
    while(al > 3)
    {
        var i0 = avl[(i+0)%al];
        var i1 = avl[(i+1)%al];
        var i2 = avl[(i+2)%al];

        var ax = p[2*i0],  ay = p[2*i0+1];
        var bx = p[2*i1],  by = p[2*i1+1];
        var cx = p[2*i2],  cy = p[2*i2+1];

        var earFound = false;
        if(PIXI.PolyK._convex(ax, ay, bx, by, cx, cy, sign))
        {
            earFound = true;
            for(var j = 0; j < al; j++)
            {
                var vi = avl[j];
                if(vi === i0 || vi === i1 || vi === i2) continue;

                if(PIXI.PolyK._PointInTriangle(p[2*vi], p[2*vi+1], ax, ay, bx, by, cx, cy)) {
                    earFound = false;
                    break;
                }
            }
        }

        if(earFound)
        {
            tgs.push(i0, i1, i2);
            avl.splice((i+1)%al, 1);
            al--;
            i = 0;
        }
        else if(i++ > 3*al)
        {
            // need to flip flip reverse it!
            // reset!
            if(sign)
            {
                tgs = [];
                avl = [];
                for(i = 0; i < n; i++) avl.push(i);

                i = 0;
                al = n;

                sign = false;
            }
            else
            {
                window.console.log("PIXI Warning: shape too complex to fill");
                return [];
            }
        }
    }

    tgs.push(avl[0], avl[1], avl[2]);
    return tgs;
};

/**
 * Checks whether a point is within a triangle
 *
 * @method _PointInTriangle
 * @param px {Number} x coordinate of the point to test
 * @param py {Number} y coordinate of the point to test
 * @param ax {Number} x coordinate of the a point of the triangle
 * @param ay {Number} y coordinate of the a point of the triangle
 * @param bx {Number} x coordinate of the b point of the triangle
 * @param by {Number} y coordinate of the b point of the triangle
 * @param cx {Number} x coordinate of the c point of the triangle
 * @param cy {Number} y coordinate of the c point of the triangle
 * @private
 */
PIXI.PolyK._PointInTriangle = function(px, py, ax, ay, bx, by, cx, cy)
{
    var v0x = cx-ax;
    var v0y = cy-ay;
    var v1x = bx-ax;
    var v1y = by-ay;
    var v2x = px-ax;
    var v2y = py-ay;

    var dot00 = v0x*v0x+v0y*v0y;
    var dot01 = v0x*v1x+v0y*v1y;
    var dot02 = v0x*v2x+v0y*v2y;
    var dot11 = v1x*v1x+v1y*v1y;
    var dot12 = v1x*v2x+v1y*v2y;

    var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    // Check if point is in triangle
    return (u >= 0) && (v >= 0) && (u + v < 1);
};

/**
 * Checks whether a shape is convex
 *
 * @method _convex
 * 
 * @private
 */
PIXI.PolyK._convex = function(ax, ay, bx, by, cx, cy, sign)
{
    return ((ay-by)*(cx-bx) + (bx-ax)*(cy-by) >= 0) === sign;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

// TODO Alvin and Mat
// Should we eventually create a Utils class ? 
// Or just move this file to the pixi.js file ?
PIXI.initDefaultShaders = function()
{
   
  //  PIXI.stripShader = new PIXI.StripShader();
//    PIXI.stripShader.init();

};

PIXI.CompileVertexShader = function(gl, shaderSrc)
{
    return PIXI._CompileShader(gl, shaderSrc, gl.VERTEX_SHADER);
};

PIXI.CompileFragmentShader = function(gl, shaderSrc)
{
    return PIXI._CompileShader(gl, shaderSrc, gl.FRAGMENT_SHADER);
};

PIXI._CompileShader = function(gl, shaderSrc, shaderType)
{
    var src = shaderSrc.join("\n");
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        window.console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

PIXI.compileProgram = function(gl, vertexSrc, fragmentSrc)
{
    var fragmentShader = PIXI.CompileFragmentShader(gl, fragmentSrc);
    var vertexShader = PIXI.CompileVertexShader(gl, vertexSrc);

    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        window.console.log("Could not initialise shaders");
    }

    return shaderProgram;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * @author Richard Davey http://www.photonstorm.com @photonstorm
 */

/**
* @class PixiShader
* @constructor
*/
PIXI.PixiShader = function(gl)
{
    this._UID = PIXI._UID++;
    
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
    * @property {array} fragmentSrc - The fragment shader.
    */
    this.fragmentSrc = [
        'precision lowp float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;',
        '}'
    ];

    /**
    * @property {number} textureCount - A local texture counter for multi-texture shaders.
    */
    this.textureCount = 0;

    this.attributes = [];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PixiShader.prototype.init = function()
{
    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc || PIXI.PixiShader.defaultVertexSrc, this.fragmentSrc);
    
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.dimensions = gl.getUniformLocation(program, 'dimensions');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');


    // Begin worst hack eva //

    // WHY??? ONLY on my chrome pixel the line above returns -1 when using filters?
    // maybe its something to do with the current state of the gl context.
    // Im convinced this is a bug in the chrome browser as there is NO reason why this should be returning -1 especially as it only manifests on my chrome pixel
    // If theres any webGL people that know why could happen please help :)
    if(this.colorAttribute === -1)
    {
        this.colorAttribute = 2;
    }

    this.attributes = [this.aVertexPosition, this.aTextureCoord, this.colorAttribute];

    // End worst hack eva //

    // add those custom shaders!
    for (var key in this.uniforms)
    {
        // get the uniform locations..
        this.uniforms[key].uniformLocation = gl.getUniformLocation(program, key);
    }

    this.initUniforms();

    this.program = program;
};

/**
* Initialises the shader uniform values.
* Uniforms are specified in the GLSL_ES Specification: http://www.khronos.org/registry/webgl/specs/latest/1.0/
* http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf
*
* @method initUniforms
*/
PIXI.PixiShader.prototype.initUniforms = function()
{
    this.textureCount = 1;
    var gl = this.gl;
    var uniform;

    for (var key in this.uniforms)
    {
        uniform = this.uniforms[key];

        var type = uniform.type;

        if (type === 'sampler2D')
        {
            uniform._init = false;

            if (uniform.value !== null)
            {
                this.initSampler2D(uniform);
            }
        }
        else if (type === 'mat2' || type === 'mat3' || type === 'mat4')
        {
            //  These require special handling
            uniform.glMatrix = true;
            uniform.glValueLength = 1;

            if (type === 'mat2')
            {
                uniform.glFunc = gl.uniformMatrix2fv;
            }
            else if (type === 'mat3')
            {
                uniform.glFunc = gl.uniformMatrix3fv;
            }
            else if (type === 'mat4')
            {
                uniform.glFunc = gl.uniformMatrix4fv;
            }
        }
        else
        {
            //  GL function reference
            uniform.glFunc = gl['uniform' + type];

            if (type === '2f' || type === '2i')
            {
                uniform.glValueLength = 2;
            }
            else if (type === '3f' || type === '3i')
            {
                uniform.glValueLength = 3;
            }
            else if (type === '4f' || type === '4i')
            {
                uniform.glValueLength = 4;
            }
            else
            {
                uniform.glValueLength = 1;
            }
        }
    }

};

/**
* Initialises a Sampler2D uniform (which may only be available later on after initUniforms once the texture has loaded)
*
* @method initSampler2D
*/
PIXI.PixiShader.prototype.initSampler2D = function(uniform)
{
    if (!uniform.value || !uniform.value.baseTexture || !uniform.value.baseTexture.hasLoaded)
    {
        return;
    }

    var gl = this.gl;

    gl.activeTexture(gl['TEXTURE' + this.textureCount]);
    gl.bindTexture(gl.TEXTURE_2D, uniform.value.baseTexture._glTextures[gl.id]);

    //  Extended texture data
    if (uniform.textureData)
    {
        var data = uniform.textureData;

        // GLTexture = mag linear, min linear_mipmap_linear, wrap repeat + gl.generateMipmap(gl.TEXTURE_2D);
        // GLTextureLinear = mag/min linear, wrap clamp
        // GLTextureNearestRepeat = mag/min NEAREST, wrap repeat
        // GLTextureNearest = mag/min nearest, wrap clamp
        // AudioTexture = whatever + luminance + width 512, height 2, border 0
        // KeyTexture = whatever + luminance + width 256, height 2, border 0

        //  magFilter can be: gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR or gl.NEAREST
        //  wrapS/T can be: gl.CLAMP_TO_EDGE or gl.REPEAT

        var magFilter = (data.magFilter) ? data.magFilter : gl.LINEAR;
        var minFilter = (data.minFilter) ? data.minFilter : gl.LINEAR;
        var wrapS = (data.wrapS) ? data.wrapS : gl.CLAMP_TO_EDGE;
        var wrapT = (data.wrapT) ? data.wrapT : gl.CLAMP_TO_EDGE;
        var format = (data.luminance) ? gl.LUMINANCE : gl.RGBA;

        if (data.repeat)
        {
            wrapS = gl.REPEAT;
            wrapT = gl.REPEAT;
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!data.flipY);

        if (data.width)
        {
            var width = (data.width) ? data.width : 512;
            var height = (data.height) ? data.height : 2;
            var border = (data.border) ? data.border : 0;

            // void texImage2D(GLenum target, GLint level, GLenum internalformat, GLsizei width, GLsizei height, GLint border, GLenum format, GLenum type, ArrayBufferView? pixels);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, border, format, gl.UNSIGNED_BYTE, null);
        }
        else
        {
            //  void texImage2D(GLenum target, GLint level, GLenum internalformat, GLenum format, GLenum type, ImageData? pixels);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, gl.RGBA, gl.UNSIGNED_BYTE, uniform.value.baseTexture.source);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    }

    gl.uniform1i(uniform.uniformLocation, this.textureCount);

    uniform._init = true;

    this.textureCount++;

};

/**
* Updates the shader uniform values.
*
* @method syncUniforms
*/
PIXI.PixiShader.prototype.syncUniforms = function()
{
    this.textureCount = 1;
    var uniform;
    var gl = this.gl;

    //  This would probably be faster in an array and it would guarantee key order
    for (var key in this.uniforms)
    {
        uniform = this.uniforms[key];

        if (uniform.glValueLength === 1)
        {
            if (uniform.glMatrix === true)
            {
                uniform.glFunc.call(gl, uniform.uniformLocation, uniform.transpose, uniform.value);
            }
            else
            {
                uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value);
            }
        }
        else if (uniform.glValueLength === 2)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y);
        }
        else if (uniform.glValueLength === 3)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y, uniform.value.z);
        }
        else if (uniform.glValueLength === 4)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
        }
        else if (uniform.type === 'sampler2D')
        {
            if (uniform._init)
            {
                gl.activeTexture(gl['TEXTURE' + this.textureCount]);
                gl.bindTexture(gl.TEXTURE_2D, uniform.value.baseTexture._glTextures[gl.id] || PIXI.createWebGLTexture( uniform.value.baseTexture, gl));
                gl.uniform1i(uniform.uniformLocation, this.textureCount);
                this.textureCount++;
            }
            else
            {
                this.initSampler2D(uniform);
            }
        }
    }

};

/**
* Destroys the shader
* @method destroy
*/
PIXI.PixiShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attributes = null;
};

/**
* The Default Vertex shader source
* @property defaultVertexSrc
* @type String
*/
PIXI.PixiShader.defaultVertexSrc = [
    'attribute vec2 aVertexPosition;',
    'attribute vec2 aTextureCoord;',
    'attribute vec2 aColor;',

    'uniform vec2 projectionVector;',
    'uniform vec2 offsetVector;',

    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',

    'const vec2 center = vec2(-1.0, 1.0);',

    'void main(void) {',
    '   gl_Position = vec4( ((aVertexPosition + offsetVector) / projectionVector) + center , 0.0, 1.0);',
    '   vTextureCoord = aTextureCoord;',
    '   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;',
    '   vColor = vec4(color * aColor.x, aColor.x);',
    '}'
];

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * @author Richard Davey http://www.photonstorm.com @photonstorm
 */

/**
* @class PixiFastShader
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.PixiFastShader = function(gl)
{
    this._UID = PIXI._UID++;
    
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
     * @property {any} program - The WebGL program.
     */
    this.program = null;

    /**
     * @property {array} fragmentSrc - The fragment shader.
     */
    this.fragmentSrc = [
        'precision lowp float;',
        'varying vec2 vTextureCoord;',
        'varying float vColor;',
        'uniform sampler2D uSampler;',
        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;',
        '}'
    ];

    /**
    * @property {array} vertexSrc - The vertex shader
    */
    this.vertexSrc = [
        'attribute vec2 aVertexPosition;',
        'attribute vec2 aPositionCoord;',
        'attribute vec2 aScale;',
        'attribute float aRotation;',
        'attribute vec2 aTextureCoord;',
        'attribute float aColor;',

        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
        'uniform mat3 uMatrix;',

        'varying vec2 vTextureCoord;',
        'varying float vColor;',

        'const vec2 center = vec2(-1.0, 1.0);',

        'void main(void) {',
        '   vec2 v;',
        '   vec2 sv = aVertexPosition * aScale;',
        '   v.x = (sv.x) * cos(aRotation) - (sv.y) * sin(aRotation);',
        '   v.y = (sv.x) * sin(aRotation) + (sv.y) * cos(aRotation);',
        '   v = ( uMatrix * vec3(v + aPositionCoord , 1.0) ).xy ;',
        '   gl_Position = vec4( ( v / projectionVector) + center , 0.0, 1.0);',
        '   vTextureCoord = aTextureCoord;',
      //  '   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;',
        '   vColor = aColor;',
        '}'
    ];


    /**
    * @property {number} textureCount - A local texture counter for multi-texture shaders.
    */
    this.textureCount = 0;

    
    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PixiFastShader.prototype.init = function()
{

    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');

    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.dimensions = gl.getUniformLocation(program, 'dimensions');
    this.uMatrix = gl.getUniformLocation(program, 'uMatrix');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aPositionCoord = gl.getAttribLocation(program, 'aPositionCoord');

    this.aScale = gl.getAttribLocation(program, 'aScale');
    this.aRotation = gl.getAttribLocation(program, 'aRotation');

    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');
   

   
    // Begin worst hack eva //

    // WHY??? ONLY on my chrome pixel the line above returns -1 when using filters?
    // maybe its somthing to do with the current state of the gl context.
    // Im convinced this is a bug in the chrome browser as there is NO reason why this should be returning -1 especially as it only manifests on my chrome pixel
    // If theres any webGL people that know why could happen please help :)
    if(this.colorAttribute === -1)
    {
        this.colorAttribute = 2;
    }

    this.attributes = [this.aVertexPosition, this.aPositionCoord,  this.aScale, this.aRotation, this.aTextureCoord, this.colorAttribute];
    
    // End worst hack eva //


    this.program = program;
};

/**
* Destroys the shader
* @method destroy
*
*/
PIXI.PixiFastShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attributes = null;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


PIXI.StripShader = function(gl)
{
    this._UID = PIXI._UID++;
    
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
     * @property {array} fragmentSrc - The fragment shader.
     */
    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
     //   'varying float vColor;',
        'uniform float alpha;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));',
      //  '   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',//gl_FragColor * alpha;',
        '}'
    ];

     /**
    * @property {array} fragmentSrc - The fragment shader.
    */
    this.vertexSrc  = [
        'attribute vec2 aVertexPosition;',
        'attribute vec2 aTextureCoord;',
        'uniform mat3 translationMatrix;',
        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
      //  'uniform float alpha;',
       // 'uniform vec3 tint;',
        'varying vec2 vTextureCoord;',
      //  'varying vec4 vColor;',

        'void main(void) {',
        '   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);',
        '   v -= offsetVector.xyx;',
        '   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);',
        '   vTextureCoord = aTextureCoord;',
       // '   vColor = aColor * vec4(tint * alpha, alpha);',
        '}'
    ];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.StripShader.prototype.init = function()
{
    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');
    //this.dimensions = gl.getUniformLocation(this.program, 'dimensions');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');

    this.attributes = [this.aVertexPosition, this.aTextureCoord];

    this.translationMatrix = gl.getUniformLocation(program, 'translationMatrix');
    this.alpha = gl.getUniformLocation(program, 'alpha');

    this.program = program;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class PrimitiveShader
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.PrimitiveShader = function(gl)
{
    this._UID = PIXI._UID++;
 
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
     * @property fragmentSrc
     * @type Array
     */
    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec4 vColor;',

        'void main(void) {',
        '   gl_FragColor = vColor;',
        '}'
    ];

    /**
     * @property vertexSrc
     * @type Array
     */
    this.vertexSrc  = [
        'attribute vec2 aVertexPosition;',
        'attribute vec4 aColor;',
        'uniform mat3 translationMatrix;',
        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
        'uniform float alpha;',
        'uniform vec3 tint;',
        'varying vec4 vColor;',

        'void main(void) {',
        '   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);',
        '   v -= offsetVector.xyx;',
        '   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);',
        '   vColor = aColor * vec4(tint * alpha, alpha);',
        '}'
    ];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PrimitiveShader.prototype.init = function()
{

    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.tintColor = gl.getUniformLocation(program, 'tint');


    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');

    this.attributes = [this.aVertexPosition, this.colorAttribute];

    this.translationMatrix = gl.getUniformLocation(program, 'translationMatrix');
    this.alpha = gl.getUniformLocation(program, 'alpha');

    this.program = program;
};

/**
* Destroys the shader
* @method destroy
*
*/
PIXI.PrimitiveShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attribute = null;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class ComplexPrimitiveShader
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.ComplexPrimitiveShader = function(gl)
{
    this._UID = PIXI._UID++;
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
     * @property fragmentSrc
     * @type Array
     */
    this.fragmentSrc = [
        'precision mediump float;',
        


        'varying vec4 vColor;',

        'void main(void) {',
        '   gl_FragColor = vColor;',
        '}'
    ];

    /**
     * @property vertexSrc
     * @type Array
     */
    this.vertexSrc  = [
        'attribute vec2 aVertexPosition;',
        //'attribute vec4 aColor;',
        'uniform mat3 translationMatrix;',
        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
        
        'uniform vec3 tint;',
        'uniform float alpha;',
        'uniform vec3 color;',

        'varying vec4 vColor;',

        'void main(void) {',
        '   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);',
        '   v -= offsetVector.xyx;',
        '   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);',
        '   vColor = vec4(color * alpha * tint, alpha);',//" * vec4(tint * alpha, alpha);',
        '}'
    ];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.ComplexPrimitiveShader.prototype.init = function()
{

    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.tintColor = gl.getUniformLocation(program, 'tint');
    this.color = gl.getUniformLocation(program, 'color');


    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
   // this.colorAttribute = gl.getAttribLocation(program, 'aColor');

    this.attributes = [this.aVertexPosition, this.colorAttribute];

    this.translationMatrix = gl.getUniformLocation(program, 'translationMatrix');
    this.alpha = gl.getUniformLocation(program, 'alpha');

    this.program = program;
};

/**
* Destroys the shader
* @method destroy
*
*/
PIXI.ComplexPrimitiveShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attribute = null;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A set of functions used by the webGL renderer to draw the primitive graphics data
 *
 * @class WebGLGraphics
 * @private
 * @static
 */
PIXI.WebGLGraphics = function()
{

};

/**
 * Renders the graphics object
 *
 * @static
 * @private
 * @method renderGraphics
 * @param graphics {Graphics}
 * @param renderSession {Object}
 */
PIXI.WebGLGraphics.renderGraphics = function(graphics, renderSession)//projection, offset)
{
    var gl = renderSession.gl;
    var projection = renderSession.projection,
        offset = renderSession.offset,
        shader = renderSession.shaderManager.primitiveShader,
        webGLData;

    if(graphics.dirty)
    {
        PIXI.WebGLGraphics.updateGraphics(graphics, gl);
    }

    var webGL = graphics._webGL[gl.id];

    // This  could be speeded up for sure!

    for (var i = 0; i < webGL.data.length; i++)
    {
        if(webGL.data[i].mode === 1)
        {
            webGLData = webGL.data[i];

            renderSession.stencilManager.pushStencil(graphics, webGLData, renderSession);

            // render quad..
            gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, ( webGLData.indices.length - 4 ) * 2 );
            
            renderSession.stencilManager.popStencil(graphics, webGLData, renderSession);
            
            this.last = webGLData.mode;
        }
        else
        {
            webGLData = webGL.data[i];
           

            renderSession.shaderManager.setShader( shader );//activatePrimitiveShader();
            shader = renderSession.shaderManager.primitiveShader;
            gl.uniformMatrix3fv(shader.translationMatrix, false, graphics.worldTransform.toArray(true));

            gl.uniform2f(shader.projectionVector, projection.x, -projection.y);
            gl.uniform2f(shader.offsetVector, -offset.x, -offset.y);

            gl.uniform3fv(shader.tintColor, PIXI.hex2rgb(graphics.tint));

            gl.uniform1f(shader.alpha, graphics.worldAlpha);
            

            gl.bindBuffer(gl.ARRAY_BUFFER, webGLData.buffer);

            gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 4 * 6, 0);
            gl.vertexAttribPointer(shader.colorAttribute, 4, gl.FLOAT, false,4 * 6, 2 * 4);

            // set the index buffer!
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGLData.indexBuffer);
            gl.drawElements(gl.TRIANGLE_STRIP,  webGLData.indices.length, gl.UNSIGNED_SHORT, 0 );
        }
    }
};

/**
 * Updates the graphics object
 *
 * @static
 * @private
 * @method updateGraphics
 * @param graphicsData {Graphics} The graphics object to update
 * @param gl {WebGLContext} the current WebGL drawing context
 */
PIXI.WebGLGraphics.updateGraphics = function(graphics, gl)
{
    // get the contexts graphics object
    var webGL = graphics._webGL[gl.id];
    // if the graphics object does not exist in the webGL context time to create it!
    if(!webGL)webGL = graphics._webGL[gl.id] = {lastIndex:0, data:[], gl:gl};

    // flag the graphics as not dirty as we are about to update it...
    graphics.dirty = false;

    var i;

    // if the user cleared the graphics object we will need to clear every object
    if(graphics.clearDirty)
    {
        graphics.clearDirty = false;

        // lop through and return all the webGLDatas to the object pool so than can be reused later on
        for (i = 0; i < webGL.data.length; i++)
        {
            var graphicsData = webGL.data[i];
            graphicsData.reset();
            PIXI.WebGLGraphics.graphicsDataPool.push( graphicsData );
        }

        // clear the array and reset the index.. 
        webGL.data = [];
        webGL.lastIndex = 0;
    }

    
    var webGLData;
    
    // loop through the graphics datas and construct each one..
    // if the object is a complex fill then the new stencil buffer technique will be used
    // other wise graphics objects will be pushed into a batch..
    for (i = webGL.lastIndex; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];

        if(data.type === PIXI.Graphics.POLY)
        {
            // MAKE SURE WE HAVE THE CORRECT TYPE..
            if(data.fill)
            {
                if(data.points.length > 6)
                {
                    if(data.points.length > 5 * 2)
                    {
                        webGLData = PIXI.WebGLGraphics.switchMode(webGL, 1);
                        PIXI.WebGLGraphics.buildComplexPoly(data, webGLData);
                    }
                    else
                    {
                        webGLData = PIXI.WebGLGraphics.switchMode(webGL, 0);
                        PIXI.WebGLGraphics.buildPoly(data, webGLData);
                    }
                }
            }

            if(data.lineWidth > 0)
            {
                webGLData = PIXI.WebGLGraphics.switchMode(webGL, 0);
                PIXI.WebGLGraphics.buildLine(data, webGLData);

            }
        }
        else
        {
            webGLData = PIXI.WebGLGraphics.switchMode(webGL, 0);
            
            if(data.type === PIXI.Graphics.RECT)
            {
                PIXI.WebGLGraphics.buildRectangle(data, webGLData);
            }
            else if(data.type === PIXI.Graphics.CIRC || data.type === PIXI.Graphics.ELIP)
            {
                PIXI.WebGLGraphics.buildCircle(data, webGLData);
            }
            else if(data.type === PIXI.Graphics.RREC)
            {
                PIXI.WebGLGraphics.buildRoundedRectangle(data, webGLData);
            }
        }


        webGL.lastIndex++;
    }

    // upload all the dirty data...
    for (i = 0; i < webGL.data.length; i++)
    {
        webGLData = webGL.data[i];
        if(webGLData.dirty)webGLData.upload();
    }
};


PIXI.WebGLGraphics.switchMode = function(webGL, type)
{
    var webGLData;

    if(!webGL.data.length)
    {
        webGLData = PIXI.WebGLGraphics.graphicsDataPool.pop() || new PIXI.WebGLGraphicsData(webGL.gl);
        webGLData.mode = type;
        webGL.data.push(webGLData);
    }
    else
    {
        webGLData = webGL.data[webGL.data.length-1];

        if(webGLData.mode !== type || type === 1)
        {
            webGLData = PIXI.WebGLGraphics.graphicsDataPool.pop() || new PIXI.WebGLGraphicsData(webGL.gl);
            webGLData.mode = type;
            webGL.data.push(webGLData);
        }
    }

    webGLData.dirty = true;

    return webGLData;
};

/**
 * Builds a rectangle to draw
 *
 * @static
 * @private
 * @method buildRectangle
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildRectangle = function(graphicsData, webGLData)
{
    // --- //
    // need to convert points to a nice regular data
    //
    var rectData = graphicsData.points;
    var x = rectData[0];
    var y = rectData[1];
    var width = rectData[2];
    var height = rectData[3];


    if(graphicsData.fill)
    {
        var color = PIXI.hex2rgb(graphicsData.fillColor);
        var alpha = graphicsData.fillAlpha;

        var r = color[0] * alpha;
        var g = color[1] * alpha;
        var b = color[2] * alpha;

        var verts = webGLData.points;
        var indices = webGLData.indices;

        var vertPos = verts.length/6;

        // start
        verts.push(x, y);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y);
        verts.push(r, g, b, alpha);

        verts.push(x , y + height);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y + height);
        verts.push(r, g, b, alpha);

        // insert 2 dead triangles..
        indices.push(vertPos, vertPos, vertPos+1, vertPos+2, vertPos+3, vertPos+3);
    }

    if(graphicsData.lineWidth)
    {
        var tempPoints = graphicsData.points;

        graphicsData.points = [x, y,
                  x + width, y,
                  x + width, y + height,
                  x, y + height,
                  x, y];


        PIXI.WebGLGraphics.buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Builds a rounded rectangle to draw
 *
 * @static
 * @private
 * @method buildRoundedRectangle
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildRoundedRectangle = function(graphicsData, webGLData)
{

    var points = graphicsData.points;
    var x = points[0];
    var y = points[1];
    var width = points[2];
    var height = points[3];
    var radius = points[4];


    var recPoints = [];
    recPoints.push(x, y + radius);
    recPoints = recPoints.concat(PIXI.WebGLGraphics.quadraticBezierCurve(x, y + height - radius, x, y + height, x + radius, y + height));
    recPoints = recPoints.concat(PIXI.WebGLGraphics.quadraticBezierCurve(x + width - radius, y + height, x + width, y + height, x + width, y + height - radius));
    recPoints = recPoints.concat(PIXI.WebGLGraphics.quadraticBezierCurve(x + width, y + radius, x + width, y, x + width - radius, y));
    recPoints = recPoints.concat(PIXI.WebGLGraphics.quadraticBezierCurve(x + radius, y, x, y, x, y + radius));


    if (graphicsData.fill) {
        var color = PIXI.hex2rgb(graphicsData.fillColor);
        var alpha = graphicsData.fillAlpha;

        var r = color[0] * alpha;
        var g = color[1] * alpha;
        var b = color[2] * alpha;

        var verts = webGLData.points;
        var indices = webGLData.indices;

        var vecPos = verts.length/6;

        var triangles = PIXI.PolyK.Triangulate(recPoints);

        var i = 0;
        for (i = 0; i < triangles.length; i+=3)
        {
            indices.push(triangles[i] + vecPos);
            indices.push(triangles[i] + vecPos);
            indices.push(triangles[i+1] + vecPos);
            indices.push(triangles[i+2] + vecPos);
            indices.push(triangles[i+2] + vecPos);
        }

        for (i = 0; i < recPoints.length; i++)
        {
            verts.push(recPoints[i], recPoints[++i], r, g, b, alpha);
        }
    }

    if (graphicsData.lineWidth) {
        var tempPoints = graphicsData.points;

        graphicsData.points = recPoints;

        PIXI.WebGLGraphics.buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Calcul the points for a quadratic bezier curve. (helper function..)
 * Based on : https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
 *
 * @param  {number}   fromX Origin point x
 * @param  {number}   fromY Origin point x
 * @param  {number}   cpX   Control point x
 * @param  {number}   cpY   Control point y
 * @param  {number}   toX   Destination point x
 * @param  {number}   toY   Destination point y
 * @return {number[]}
 */
PIXI.WebGLGraphics.quadraticBezierCurve = function(fromX, fromY, cpX, cpY, toX, toY) {
    var xa,
        ya,
        xb,
        yb,
        x,
        y,
        n = 20,
        points = [];

    function getPt(n1 , n2, perc) {
        var diff = n2 - n1;

        return n1 + ( diff * perc );
    }

    var j = 0;
    for (var i = 0; i <= n; i++ )
    {
        j = i / n;

        // The Green Line
        xa = getPt( fromX , cpX , j );
        ya = getPt( fromY , cpY , j );
        xb = getPt( cpX , toX , j );
        yb = getPt( cpY , toY , j );

        // The Black Dot
        x = getPt( xa , xb , j );
        y = getPt( ya , yb , j );

        points.push(x, y);
    }
    return points;
};

/**
 * Builds a circle to draw
 *
 * @static
 * @private
 * @method buildCircle
 * @param graphicsData {Graphics} The graphics object to draw
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildCircle = function(graphicsData, webGLData)
{
    
    // need to convert points to a nice regular data
    var rectData = graphicsData.points;
    var x = rectData[0];
    var y = rectData[1];
    var width = rectData[2];
    var height = rectData[3];

    var totalSegs = 40;
    var seg = (Math.PI * 2) / totalSegs ;

    var i = 0;

    if(graphicsData.fill)
    {
        var color = PIXI.hex2rgb(graphicsData.fillColor);
        var alpha = graphicsData.fillAlpha;

        var r = color[0] * alpha;
        var g = color[1] * alpha;
        var b = color[2] * alpha;

        var verts = webGLData.points;
        var indices = webGLData.indices;

        var vecPos = verts.length/6;

        indices.push(vecPos);

        for (i = 0; i < totalSegs + 1 ; i++)
        {
            verts.push(x,y, r, g, b, alpha);

            verts.push(x + Math.sin(seg * i) * width,
                       y + Math.cos(seg * i) * height,
                       r, g, b, alpha);

            indices.push(vecPos++, vecPos++);
        }

        indices.push(vecPos-1);
    }

    if(graphicsData.lineWidth)
    {
        var tempPoints = graphicsData.points;

        graphicsData.points = [];

        for (i = 0; i < totalSegs + 1; i++)
        {
            graphicsData.points.push(x + Math.sin(seg * i) * width,
                                     y + Math.cos(seg * i) * height);
        }

        PIXI.WebGLGraphics.buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Builds a line to draw
 *
 * @static
 * @private
 * @method buildLine
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildLine = function(graphicsData, webGLData)
{
    // TODO OPTIMISE!
    var i = 0;

    var points = graphicsData.points;
    if(points.length === 0)return;

    // if the line width is an odd number add 0.5 to align to a whole pixel
    if(graphicsData.lineWidth%2)
    {
        for (i = 0; i < points.length; i++) {
            points[i] += 0.5;
        }
    }

    // get first and last point.. figure out the middle!
    var firstPoint = new PIXI.Point( points[0], points[1] );
    var lastPoint = new PIXI.Point( points[points.length - 2], points[points.length - 1] );

    // if the first point is the last point - gonna have issues :)
    if(firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y)
    {
        // need to clone as we are going to slightly modify the shape..
        points = points.slice();

        points.pop();
        points.pop();

        lastPoint = new PIXI.Point( points[points.length - 2], points[points.length - 1] );

        var midPointX = lastPoint.x + (firstPoint.x - lastPoint.x) *0.5;
        var midPointY = lastPoint.y + (firstPoint.y - lastPoint.y) *0.5;

        points.unshift(midPointX, midPointY);
        points.push(midPointX, midPointY);
    }

    var verts = webGLData.points;
    var indices = webGLData.indices;
    var length = points.length / 2;
    var indexCount = points.length;
    var indexStart = verts.length/6;

    // DRAW the Line
    var width = graphicsData.lineWidth / 2;

    // sort color
    var color = PIXI.hex2rgb(graphicsData.lineColor);
    var alpha = graphicsData.lineAlpha;
    var r = color[0] * alpha;
    var g = color[1] * alpha;
    var b = color[2] * alpha;

    var px, py, p1x, p1y, p2x, p2y, p3x, p3y;
    var perpx, perpy, perp2x, perp2y, perp3x, perp3y;
    var a1, b1, c1, a2, b2, c2;
    var denom, pdist, dist;

    p1x = points[0];
    p1y = points[1];

    p2x = points[2];
    p2y = points[3];

    perpx = -(p1y - p2y);
    perpy =  p1x - p2x;

    dist = Math.sqrt(perpx*perpx + perpy*perpy);

    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    // start
    verts.push(p1x - perpx , p1y - perpy,
                r, g, b, alpha);

    verts.push(p1x + perpx , p1y + perpy,
                r, g, b, alpha);

    for (i = 1; i < length-1; i++)
    {
        p1x = points[(i-1)*2];
        p1y = points[(i-1)*2 + 1];

        p2x = points[(i)*2];
        p2y = points[(i)*2 + 1];

        p3x = points[(i+1)*2];
        p3y = points[(i+1)*2 + 1];

        perpx = -(p1y - p2y);
        perpy = p1x - p2x;

        dist = Math.sqrt(perpx*perpx + perpy*perpy);
        perpx /= dist;
        perpy /= dist;
        perpx *= width;
        perpy *= width;

        perp2x = -(p2y - p3y);
        perp2y = p2x - p3x;

        dist = Math.sqrt(perp2x*perp2x + perp2y*perp2y);
        perp2x /= dist;
        perp2y /= dist;
        perp2x *= width;
        perp2y *= width;

        a1 = (-perpy + p1y) - (-perpy + p2y);
        b1 = (-perpx + p2x) - (-perpx + p1x);
        c1 = (-perpx + p1x) * (-perpy + p2y) - (-perpx + p2x) * (-perpy + p1y);
        a2 = (-perp2y + p3y) - (-perp2y + p2y);
        b2 = (-perp2x + p2x) - (-perp2x + p3x);
        c2 = (-perp2x + p3x) * (-perp2y + p2y) - (-perp2x + p2x) * (-perp2y + p3y);

        denom = a1*b2 - a2*b1;

        if(Math.abs(denom) < 0.1 )
        {

            denom+=10.1;
            verts.push(p2x - perpx , p2y - perpy,
                r, g, b, alpha);

            verts.push(p2x + perpx , p2y + perpy,
                r, g, b, alpha);

            continue;
        }

        px = (b1*c2 - b2*c1)/denom;
        py = (a2*c1 - a1*c2)/denom;


        pdist = (px -p2x) * (px -p2x) + (py -p2y) + (py -p2y);


        if(pdist > 140 * 140)
        {
            perp3x = perpx - perp2x;
            perp3y = perpy - perp2y;

            dist = Math.sqrt(perp3x*perp3x + perp3y*perp3y);
            perp3x /= dist;
            perp3y /= dist;
            perp3x *= width;
            perp3y *= width;

            verts.push(p2x - perp3x, p2y -perp3y);
            verts.push(r, g, b, alpha);

            verts.push(p2x + perp3x, p2y +perp3y);
            verts.push(r, g, b, alpha);

            verts.push(p2x - perp3x, p2y -perp3y);
            verts.push(r, g, b, alpha);

            indexCount++;
        }
        else
        {

            verts.push(px , py);
            verts.push(r, g, b, alpha);

            verts.push(p2x - (px-p2x), p2y - (py - p2y));
            verts.push(r, g, b, alpha);
        }
    }

    p1x = points[(length-2)*2];
    p1y = points[(length-2)*2 + 1];

    p2x = points[(length-1)*2];
    p2y = points[(length-1)*2 + 1];

    perpx = -(p1y - p2y);
    perpy = p1x - p2x;

    dist = Math.sqrt(perpx*perpx + perpy*perpy);
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    verts.push(p2x - perpx , p2y - perpy);
    verts.push(r, g, b, alpha);

    verts.push(p2x + perpx , p2y + perpy);
    verts.push(r, g, b, alpha);

    indices.push(indexStart);

    for (i = 0; i < indexCount; i++)
    {
        indices.push(indexStart++);
    }

    indices.push(indexStart-1);
};

/**
 * Builds a complex polygon to draw
 *
 * @static
 * @private
 * @method buildPoly
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildComplexPoly = function(graphicsData, webGLData)
{

    //TODO - no need to copy this as it gets turned into a FLoat32Array anyways..
    var points = graphicsData.points.slice();
    if(points.length < 6)return;

    // get first and last point.. figure out the middle!
    var indices = webGLData.indices;
    webGLData.points = points;
    webGLData.alpha = graphicsData.fillAlpha;
    webGLData.color = PIXI.hex2rgb(graphicsData.fillColor);

    /*
        calclate the bounds..
    */
    var minX = Infinity;
    var maxX = -Infinity;

    var minY = Infinity;
    var maxY = -Infinity;

    var x,y;

    // get size..
    for (var i = 0; i < points.length; i+=2)
    {
        x = points[i];
        y = points[i+1];

        minX = x < minX ? x : minX;
        maxX = x > maxX ? x : maxX;

        minY = y < minY ? y : minY;
        maxY = y > maxY ? y : maxY;
    }

    // add a quad to the end cos there is no point making another buffer!
    points.push(minX, minY,
                maxX, minY,
                maxX, maxY,
                minX, maxY);

    // push a quad onto the end.. 
    
    //TODO - this aint needed!
    var length = points.length / 2;
    for (i = 0; i < length; i++)
    {
        indices.push( i );
    }

};

PIXI.WebGLGraphics.buildPoly = function(graphicsData, webGLData)
{
    var points = graphicsData.points;
    if(points.length < 6)return;

    // get first and last point.. figure out the middle!
    var verts = webGLData.points;
    var indices = webGLData.indices;

    var length = points.length / 2;

    // sort color
    var color = PIXI.hex2rgb(graphicsData.fillColor);
    var alpha = graphicsData.fillAlpha;
    var r = color[0] * alpha;
    var g = color[1] * alpha;
    var b = color[2] * alpha;

    var triangles = PIXI.PolyK.Triangulate(points);
    var vertPos = verts.length / 6;

    var i = 0;

    for (i = 0; i < triangles.length; i+=3)
    {
        indices.push(triangles[i] + vertPos);
        indices.push(triangles[i] + vertPos);
        indices.push(triangles[i+1] + vertPos);
        indices.push(triangles[i+2] +vertPos);
        indices.push(triangles[i+2] + vertPos);
    }

    for (i = 0; i < length; i++)
    {
        verts.push(points[i * 2], points[i * 2 + 1],
                   r, g, b, alpha);
    }

};

PIXI.WebGLGraphics.graphicsDataPool = [];

PIXI.WebGLGraphicsData = function(gl)
{
    this.gl = gl;

    //TODO does this need to be split before uploding??
    this.color = [0,0,0]; // color split!
    this.points = [];
    this.indices = [];
    this.lastIndex = 0;
    this.buffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.mode = 1;
    this.alpha = 1;
    this.dirty = true;
};

PIXI.WebGLGraphicsData.prototype.reset = function()
{
    this.points = [];
    this.indices = [];
    this.lastIndex = 0;
};

PIXI.WebGLGraphicsData.prototype.upload = function()
{
    var gl = this.gl;

//    this.lastIndex = graphics.graphicsData.length;
    this.glPoints = new Float32Array(this.points);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.glPoints, gl.STATIC_DRAW);

    this.glIndicies = new Uint16Array(this.indices);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.glIndicies, gl.STATIC_DRAW);

    this.dirty = false;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.glContexts = []; // this is where we store the webGL contexts for easy access.

/**
 * the WebGLRenderer draws the stage and all its content onto a webGL enabled canvas. This renderer
 * should be used for browsers that support webGL. This Render works by automatically managing webGLBatch's.
 * So no need for Sprite Batch's or Sprite Cloud's
 * Dont forget to add the view to your DOM or you will not see anything :)
 *
 * @class WebGLRenderer
 * @constructor
 * @param width=0 {Number} the width of the canvas view
 * @param height=0 {Number} the height of the canvas view
 * @param view {HTMLCanvasElement} the canvas to use as a view, optional
 * @param transparent=false {Boolean} If the render view is transparent, default false
 * @param antialias=false {Boolean} sets antialias (only applicable in chrome at the moment)
 * @param preserveDrawingBuffer=false {Boolean} enables drawing buffer preservation, enable this if you need to call toDataUrl on the webgl context
 *
 */
PIXI.WebGLRenderer = function(width, height, view, transparent, antialias, preserveDrawingBuffer)
{
    if(!PIXI.defaultRenderer)
    {
        PIXI.sayHello('webGL');
        PIXI.defaultRenderer = this;
    }

    this.type = PIXI.WEBGL_RENDERER;

    // do a catch.. only 1 webGL renderer..
    /**
     * Whether the render view is transparent
     *
     * @property transparent
     * @type Boolean
     */
    this.transparent = !!transparent;

    /**
     * The value of the preserveDrawingBuffer flag affects whether or not the contents of the stencil buffer is retained after rendering.
     *
     * @property preserveDrawingBuffer
     * @type Boolean
     */
    this.preserveDrawingBuffer = preserveDrawingBuffer;

    /**
     * The width of the canvas view
     *
     * @property width
     * @type Number
     * @default 800
     */
    this.width = width || 800;

    /**
     * The height of the canvas view
     *
     * @property height
     * @type Number
     * @default 600
     */
    this.height = height || 600;

    /**
     * The canvas element that everything is drawn to
     *
     * @property view
     * @type HTMLCanvasElement
     */
    this.view = view || document.createElement( 'canvas' );
    this.view.width = this.width;
    this.view.height = this.height;

    // deal with losing context..
    this.contextLost = this.handleContextLost.bind(this);
    this.contextRestoredLost = this.handleContextRestored.bind(this);
    
    this.view.addEventListener('webglcontextlost', this.contextLost, false);
    this.view.addEventListener('webglcontextrestored', this.contextRestoredLost, false);

    this.options = {
        alpha: this.transparent,
        antialias:!!antialias, // SPEED UP??
        premultipliedAlpha:!!transparent,
        stencil:true,
        preserveDrawingBuffer: preserveDrawingBuffer
    };

    var gl = null;

    ['experimental-webgl', 'webgl'].forEach(function(name) {
        try {
            gl = gl || this.view.getContext(name,  this.options);
        } catch(e) {}
    }, this);

    if (!gl) {
        // fail, not able to get a context
        throw new Error('This browser does not support webGL. Try using the canvas renderer' + this);
    }

    this.gl = gl;
    this.glContextId = gl.id = PIXI.WebGLRenderer.glContextId ++;

    PIXI.glContexts[this.glContextId] = gl;

    if(!PIXI.blendModesWebGL)
    {
        PIXI.blendModesWebGL = [];

        PIXI.blendModesWebGL[PIXI.blendModes.NORMAL]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.ADD]           = [gl.SRC_ALPHA, gl.DST_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.MULTIPLY]      = [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SCREEN]        = [gl.SRC_ALPHA, gl.ONE];
        PIXI.blendModesWebGL[PIXI.blendModes.OVERLAY]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.DARKEN]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.LIGHTEN]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR_DODGE]   = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR_BURN]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.HARD_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SOFT_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.DIFFERENCE]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.EXCLUSION]     = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.HUE]           = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SATURATION]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR]         = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.LUMINOSITY]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
    }




    this.projection = new PIXI.Point();
    this.projection.x =  this.width/2;
    this.projection.y =  -this.height/2;

    this.offset = new PIXI.Point(0, 0);

    this.resize(this.width, this.height);
    this.contextLost = false;

    // time to create the render managers! each one focuses on managine a state in webGL
    this.shaderManager = new PIXI.WebGLShaderManager(gl);                   // deals with managing the shader programs and their attribs
    this.spriteBatch = new PIXI.WebGLSpriteBatch(gl);                       // manages the rendering of sprites
    //this.primitiveBatch = new PIXI.WebGLPrimitiveBatch(gl);               // primitive batch renderer
    this.maskManager = new PIXI.WebGLMaskManager(gl);                       // manages the masks using the stencil buffer
    this.filterManager = new PIXI.WebGLFilterManager(gl, this.transparent); // manages the filters
    this.stencilManager = new PIXI.WebGLStencilManager(gl);
    this.blendModeManager = new PIXI.WebGLBlendModeManager(gl);

    this.renderSession = {};
    this.renderSession.gl = this.gl;
    this.renderSession.drawCount = 0;
    this.renderSession.shaderManager = this.shaderManager;
    this.renderSession.maskManager = this.maskManager;
    this.renderSession.filterManager = this.filterManager;
    this.renderSession.blendModeManager = this.blendModeManager;
   // this.renderSession.primitiveBatch = this.primitiveBatch;
    this.renderSession.spriteBatch = this.spriteBatch;
    this.renderSession.stencilManager = this.stencilManager;
    this.renderSession.renderer = this;

    gl.useProgram(this.shaderManager.defaultShader.program);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, this.transparent);
};

// constructor
PIXI.WebGLRenderer.prototype.constructor = PIXI.WebGLRenderer;

/**
 * Renders the stage to its webGL view
 *
 * @method render
 * @param stage {Stage} the Stage element to be rendered
 */
PIXI.WebGLRenderer.prototype.render = function(stage)
{
    if(this.contextLost)return;


    // if rendering a new stage clear the batches..
    if(this.__stage !== stage)
    {
        if(stage.interactive)stage.interactionManager.removeEvents();

        // TODO make this work
        // dont think this is needed any more?
        this.__stage = stage;
    }

    // update any textures this includes uvs and uploading them to the gpu
    PIXI.WebGLRenderer.updateTextures();

    // update the scene graph
    stage.updateTransform();


    // interaction
    if(stage._interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }
    
    var gl = this.gl;

    // -- Does this need to be set every frame? -- //
    //gl.colorMask(true, true, true, this.transparent);
    gl.viewport(0, 0, this.width, this.height);

    // make sure we are bound to the main frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if(this.transparent)
    {
        gl.clearColor(0, 0, 0, 0);
    }
    else
    {
        gl.clearColor(stage.backgroundColorSplit[0],stage.backgroundColorSplit[1],stage.backgroundColorSplit[2], 1);
    }


    gl.clear(gl.COLOR_BUFFER_BIT);

    this.renderDisplayObject( stage, this.projection );

    // interaction
    if(stage.interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }
    else
    {
        if(stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = false;
            stage.interactionManager.setTarget(this);
        }
    }

    /*
    //can simulate context loss in Chrome like so:
     this.view.onmousedown = function(ev) {
     console.dir(this.gl.getSupportedExtensions());
        var ext = (
            gl.getExtension("WEBGL_scompressed_texture_s3tc")
       // gl.getExtension("WEBGL_compressed_texture_s3tc") ||
       // gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
       // gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
     );
     console.dir(ext);
     var loseCtx = this.gl.getExtension("WEBGL_lose_context");
      console.log("killing context");
      loseCtx.loseContext();
     setTimeout(function() {
          console.log("restoring context...");
          loseCtx.restoreContext();
      }.bind(this), 1000);
     }.bind(this);
     */
};

/**
 * Renders a display Object
 *
 * @method renderDIsplayObject
 * @param displayObject {DisplayObject} The DisplayObject to render
 * @param projection {Point} The projection
 * @param buffer {Array} a standard WebGL buffer 
 */
PIXI.WebGLRenderer.prototype.renderDisplayObject = function(displayObject, projection, buffer)
{
    this.renderSession.blendModeManager.setBlendMode(PIXI.blendModes.NORMAL);
    // reset the render session data..
    this.renderSession.drawCount = 0;
    this.renderSession.currentBlendMode = 9999;

    this.renderSession.projection = projection;
    this.renderSession.offset = this.offset;

    // start the sprite batch
    this.spriteBatch.begin(this.renderSession);

//    this.primitiveBatch.begin(this.renderSession);

    // start the filter manager
    this.filterManager.begin(this.renderSession, buffer);

    // render the scene!
    displayObject._renderWebGL(this.renderSession);

    // finish the sprite batch
    this.spriteBatch.end();

//    this.primitiveBatch.end();
};

/**
 * Updates the textures loaded into this webgl renderer
 *
 * @static
 * @method updateTextures
 * @private
 */
PIXI.WebGLRenderer.updateTextures = function()
{
    var i = 0;

    //TODO break this out into a texture manager...
  //  for (i = 0; i < PIXI.texturesToUpdate.length; i++)
  //      PIXI..updateWebGLTexture(PIXI.texturesToUpdate[i], this.gl);


    for (i=0; i < PIXI.Texture.frameUpdates.length; i++)
        PIXI.WebGLRenderer.updateTextureFrame(PIXI.Texture.frameUpdates[i]);

    for (i = 0; i < PIXI.texturesToDestroy.length; i++)
        PIXI.WebGLRenderer.destroyTexture(PIXI.texturesToDestroy[i]);

    PIXI.texturesToUpdate.length = 0;
    PIXI.texturesToDestroy.length = 0;
    PIXI.Texture.frameUpdates.length = 0;
};

/**
 * Destroys a loaded webgl texture
 *
 * @method destroyTexture
 * @param texture {Texture} The texture to update
 * @private
 */
PIXI.WebGLRenderer.destroyTexture = function(texture)
{
    //TODO break this out into a texture manager...

    for (var i = texture._glTextures.length - 1; i >= 0; i--)
    {
        var glTexture = texture._glTextures[i];
        var gl = PIXI.glContexts[i];

        if(gl && glTexture)
        {
            gl.deleteTexture(glTexture);
        }
    }

    texture._glTextures.length = 0;
};

/**
 *
 * @method updateTextureFrame
 * @param texture {Texture} The texture to update the frame from
 * @private
 */
PIXI.WebGLRenderer.updateTextureFrame = function(texture)
{
    //texture.updateFrame = false;

    // now set the uvs. Figured that the uv data sits with a texture rather than a sprite.
    // so uv data is stored on the texture itself
    texture._updateWebGLuvs();
};

/**
 * resizes the webGL view to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the webGL view
 * @param height {Number} the new height of the webGL view
 */
PIXI.WebGLRenderer.prototype.resize = function(width, height)
{
    this.width = width;
    this.height = height;

    this.view.width = width;
    this.view.height = height;

    this.gl.viewport(0, 0, this.width, this.height);

    this.projection.x =  this.width/2;
    this.projection.y =  -this.height/2;
};

/**
 * Creates a WebGL texture
 *
 * @method createWebGLTexture
 * @param texture {Texture} the texture to render
 * @param gl {webglContext} the WebGL context
 * @static
 */
PIXI.createWebGLTexture = function(texture, gl)
{


    if(texture.hasLoaded)
    {
        texture._glTextures[gl.id] = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultipliedAlpha);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);

        // reguler...

        if(!texture._powerOf2)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);

        texture._dirty[gl.id] = false;
    }

    return  texture._glTextures[gl.id];
};

/**
 * Updates a WebGL texture
 *
 * @method updateWebGLTexture
 * @param texture {Texture} the texture to update
 * @param gl {webglContext} the WebGL context
 * @private
 */
PIXI.updateWebGLTexture = function(texture, gl)
{
    if( texture._glTextures[gl.id] )
    {
        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultipliedAlpha);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);

        // reguler...

        if(!texture._powerOf2)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }

        texture._dirty[gl.id] = false;
    }
    
};

/**
 * Handles a lost webgl context
 *
 * @method handleContextLost
 * @param event {Event}
 * @private
 */
PIXI.WebGLRenderer.prototype.handleContextLost = function(event)
{
    event.preventDefault();
    this.contextLost = true;
};

/**
 * Handles a restored webgl context
 *
 * @method handleContextRestored
 * @param event {Event}
 * @private
 */
PIXI.WebGLRenderer.prototype.handleContextRestored = function()
{

    //try 'experimental-webgl'
    try {
        this.gl = this.view.getContext('experimental-webgl',  this.options);
    } catch (e) {
        //try 'webgl'
        try {
            this.gl = this.view.getContext('webgl',  this.options);
        } catch (e2) {
            // fail, not able to get a context
            throw new Error(' This browser does not support webGL. Try using the canvas renderer' + this);
        }
    }

    var gl = this.gl;
    gl.id = PIXI.WebGLRenderer.glContextId ++;



    // need to set the context...
    this.shaderManager.setContext(gl);
    this.spriteBatch.setContext(gl);
    this.primitiveBatch.setContext(gl);
    this.maskManager.setContext(gl);
    this.filterManager.setContext(gl);


    this.renderSession.gl = this.gl;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, this.transparent);

    this.gl.viewport(0, 0, this.width, this.height);

    for(var key in PIXI.TextureCache)
    {
        var texture = PIXI.TextureCache[key].baseTexture;
        texture._glTextures = [];
    }

    /**
     * Whether the context was lost 
     * @property contextLost
     * @type Boolean
     */
    this.contextLost = false;

};

/**
 * Removes everything from the renderer (event listeners, spritebatch, etc...)
 *
 * @method destroy
 */
PIXI.WebGLRenderer.prototype.destroy = function()
{

    // deal with losing context..
    
    // remove listeners
    this.view.removeEventListener('webglcontextlost', this.contextLost);
    this.view.removeEventListener('webglcontextrestored', this.contextRestoredLost);

    PIXI.glContexts[this.glContextId] = null;

    this.projection = null;
    this.offset = null;

    // time to create the render managers! each one focuses on managine a state in webGL
    this.shaderManager.destroy();
    this.spriteBatch.destroy();
    this.primitiveBatch.destroy();
    this.maskManager.destroy();
    this.filterManager.destroy();

    this.shaderManager = null;
    this.spriteBatch = null;
    this.maskManager = null;
    this.filterManager = null;
    
    this.gl = null;
    //
    this.renderSession = null;
};


PIXI.WebGLRenderer.glContextId = 0;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLMaskManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLBlendModeManager = function(gl)
{
    this.gl = gl;
    this.currentBlendMode = 99999;
};

/**
* Sets-up the given blendMode from WebGL's point of view
* @method setBlendMode 
*
* @param blendMode {Number} the blendMode, should be a Pixi const, such as PIXI.BlendModes.ADD
*/
PIXI.WebGLBlendModeManager.prototype.setBlendMode = function(blendMode)
{
    if(this.currentBlendMode === blendMode)return false;
 //   console.log("SWAP!")
    this.currentBlendMode = blendMode;
    
    var blendModeWebGL = PIXI.blendModesWebGL[this.currentBlendMode];
    this.gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
    
    return true;
};

PIXI.WebGLBlendModeManager.prototype.destroy = function()
{
    this.gl = null;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLMaskManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLMaskManager = function(gl)
{
    this.maskStack = [];
    this.maskPosition = 0;

    this.setContext(gl);

    this.reverse = false;
    this.count = 0;
};

/**
* Sets the drawing context to the one given in parameter
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLMaskManager.prototype.setContext = function(gl)
{
    this.gl = gl;
};

/**
* Applies the Mask and adds it to the current filter stack
* @method pushMask
* @param maskData {Array}
* @param renderSession {RenderSession}
*/
PIXI.WebGLMaskManager.prototype.pushMask = function(maskData, renderSession)
{
    var gl = renderSession.gl;

    if(maskData.dirty)
    {
        PIXI.WebGLGraphics.updateGraphics(maskData, gl);
    }

    if(!maskData._webGL[gl.id].data.length)return;

    renderSession.stencilManager.pushStencil(maskData, maskData._webGL[gl.id].data[0], renderSession);
};

/**
* Removes the last filter from the filter stack and doesn't return it
* @method popMask
*
* @param renderSession {RenderSession} an object containing all the useful parameters
*/
PIXI.WebGLMaskManager.prototype.popMask = function(maskData, renderSession)
{
    var gl = this.gl;
    renderSession.stencilManager.popStencil(maskData, maskData._webGL[gl.id].data[0], renderSession);
};


/**
* Destroys the mask stack
* @method destroy
*/
PIXI.WebGLMaskManager.prototype.destroy = function()
{
    this.maskStack = null;
    this.gl = null;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
//BA0285
//Intercontinental Hotel, 888 Howard Street
//San Francisco

/**
* @class WebGLStencilManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLStencilManager = function(gl)
{
   
    this.stencilStack = [];
    this.setContext(gl);
    this.reverse = true;
    this.count = 0;

};

/**
* Sets the drawing context to the one given in parameter
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLStencilManager.prototype.setContext = function(gl)
{
    this.gl = gl;
};

/**
* Applies the Mask and adds it to the current filter stack
* @method pushMask
* @param maskData {Array}
* @param renderSession {RenderSession}
*/
PIXI.WebGLStencilManager.prototype.pushStencil = function(graphics, webGLData, renderSession)
{
    var gl = this.gl;
    this.bindGraphics(graphics, webGLData, renderSession);

    if(this.stencilStack.length === 0)
    {
        gl.enable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        this.reverse = true;
        this.count = 0;
    }

    this.stencilStack.push(webGLData);

    var level = this.count;

    gl.colorMask(false, false, false, false);

    gl.stencilFunc(gl.ALWAYS,0,0xFF);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);

    // draw the triangle strip!

    if(webGLData.mode === 1)
    {

        gl.drawElements(gl.TRIANGLE_FAN,  webGLData.indices.length - 4, gl.UNSIGNED_SHORT, 0 );
       
        if(this.reverse)
        {
            gl.stencilFunc(gl.EQUAL, 0xFF - level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
        }

        // draw a quad to increment..
        gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, ( webGLData.indices.length - 4 ) * 2 );
               
        if(this.reverse)
        {
            gl.stencilFunc(gl.EQUAL,0xFF-(level+1), 0xFF);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
        }

        this.reverse = !this.reverse;
    }
    else
    {
        if(!this.reverse)
        {
            gl.stencilFunc(gl.EQUAL, 0xFF - level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
        }

        gl.drawElements(gl.TRIANGLE_STRIP,  webGLData.indices.length, gl.UNSIGNED_SHORT, 0 );

        if(!this.reverse)
        {
            gl.stencilFunc(gl.EQUAL,0xFF-(level+1), 0xFF);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
        }
    }

    gl.colorMask(true, true, true, true);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);

    this.count++;
};

//TODO this does not belong here!
PIXI.WebGLStencilManager.prototype.bindGraphics = function(graphics, webGLData, renderSession)
{
    //if(this._currentGraphics === graphics)return;
    this._currentGraphics = graphics;

    var gl = this.gl;

     // bind the graphics object..
    var projection = renderSession.projection,
        offset = renderSession.offset,
        shader;// = renderSession.shaderManager.primitiveShader;

    if(webGLData.mode === 1)
    {
        shader = renderSession.shaderManager.complexPrimativeShader;

        renderSession.shaderManager.setShader( shader );

        gl.uniformMatrix3fv(shader.translationMatrix, false, graphics.worldTransform.toArray(true));

        gl.uniform2f(shader.projectionVector, projection.x, -projection.y);
        gl.uniform2f(shader.offsetVector, -offset.x, -offset.y);

        gl.uniform3fv(shader.tintColor, PIXI.hex2rgb(graphics.tint));
        gl.uniform3fv(shader.color, webGLData.color);

        gl.uniform1f(shader.alpha, graphics.worldAlpha * webGLData.alpha);

        gl.bindBuffer(gl.ARRAY_BUFFER, webGLData.buffer);

        gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 4 * 2, 0);


        // now do the rest..
        // set the index buffer!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGLData.indexBuffer);
    }
    else
    {
        //renderSession.shaderManager.activatePrimitiveShader();
        shader = renderSession.shaderManager.primitiveShader;
        renderSession.shaderManager.setShader( shader );

        gl.uniformMatrix3fv(shader.translationMatrix, false, graphics.worldTransform.toArray(true));

        gl.uniform2f(shader.projectionVector, projection.x, -projection.y);
        gl.uniform2f(shader.offsetVector, -offset.x, -offset.y);

        gl.uniform3fv(shader.tintColor, PIXI.hex2rgb(graphics.tint));

        gl.uniform1f(shader.alpha, graphics.worldAlpha);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, webGLData.buffer);

        gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 4 * 6, 0);
        gl.vertexAttribPointer(shader.colorAttribute, 4, gl.FLOAT, false,4 * 6, 2 * 4);

        // set the index buffer!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGLData.indexBuffer);
    }
};

PIXI.WebGLStencilManager.prototype.popStencil = function(graphics, webGLData, renderSession)
{
	var gl = this.gl;
    this.stencilStack.pop();
   
    this.count--;

    if(this.stencilStack.length === 0)
    {
        // the stack is empty!
        gl.disable(gl.STENCIL_TEST);

    }
    else
    {

        var level = this.count;

        this.bindGraphics(graphics, webGLData, renderSession);

        gl.colorMask(false, false, false, false);
    
        if(webGLData.mode === 1)
        {
            this.reverse = !this.reverse;

            if(this.reverse)
            {
                gl.stencilFunc(gl.EQUAL, 0xFF - (level+1), 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
            }

            // draw a quad to increment..
            gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, ( webGLData.indices.length - 4 ) * 2 );
            
            gl.stencilFunc(gl.ALWAYS,0,0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);

            // draw the triangle strip!
            gl.drawElements(gl.TRIANGLE_FAN,  webGLData.indices.length - 4, gl.UNSIGNED_SHORT, 0 );
           
            if(!this.reverse)
            {
                gl.stencilFunc(gl.EQUAL,0xFF-(level), 0xFF);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level, 0xFF);
            }

        }
        else
        {
          //  console.log("<<>>")
            if(!this.reverse)
            {
                gl.stencilFunc(gl.EQUAL, 0xFF - (level+1), 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
            }

            gl.drawElements(gl.TRIANGLE_STRIP,  webGLData.indices.length, gl.UNSIGNED_SHORT, 0 );

            if(!this.reverse)
            {
                gl.stencilFunc(gl.EQUAL,0xFF-(level), 0xFF);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level, 0xFF);
            }
        }

        gl.colorMask(true, true, true, true);
        gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);


    }

    //renderSession.shaderManager.deactivatePrimitiveShader();
};

/**
* Destroys the mask stack
* @method destroy
*/
PIXI.WebGLStencilManager.prototype.destroy = function()
{
    this.maskStack = null;
    this.gl = null;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLShaderManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLShaderManager = function(gl)
{

    this.maxAttibs = 10;
    this.attribState = [];
    this.tempAttribState = [];
    this.shaderMap = [];

    for (var i = 0; i < this.maxAttibs; i++) {
        this.attribState[i] = false;
    }

    this.setContext(gl);
    // the final one is used for the rendering strips
};


/**
* Initialises the context and the properties
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
* @param transparent {Boolean} Whether or not the drawing context should be transparent
*/
PIXI.WebGLShaderManager.prototype.setContext = function(gl)
{
    this.gl = gl;
    
    // the next one is used for rendering primatives
    this.primitiveShader = new PIXI.PrimitiveShader(gl);

    // the next one is used for rendering triangle strips
    this.complexPrimativeShader = new PIXI.ComplexPrimitiveShader(gl);

    // this shader is used for the default sprite rendering
    this.defaultShader = new PIXI.PixiShader(gl);

    // this shader is used for the fast sprite rendering
    this.fastShader = new PIXI.PixiFastShader(gl);

    // the next one is used for rendering triangle strips
    this.stripShader = new PIXI.StripShader(gl);
    this.setShader(this.defaultShader);
};


/**
* Takes the attributes given in parameters 
* @method setAttribs
* @param attribs {Array} attribs 
*/
PIXI.WebGLShaderManager.prototype.setAttribs = function(attribs)
{
    // reset temp state

    var i;

    for (i = 0; i < this.tempAttribState.length; i++)
    {
        this.tempAttribState[i] = false;
    }

    // set the new attribs
    for (i = 0; i < attribs.length; i++)
    {
        var attribId = attribs[i];
        this.tempAttribState[attribId] = true;
    }

    var gl = this.gl;

    for (i = 0; i < this.attribState.length; i++)
    {
        if(this.attribState[i] !== this.tempAttribState[i])
        {
            this.attribState[i] = this.tempAttribState[i];

            if(this.tempAttribState[i])
            {
                gl.enableVertexAttribArray(i);
            }
            else
            {
                gl.disableVertexAttribArray(i);
            }
        }
    }
};

PIXI.WebGLShaderManager.prototype.setShader = function(shader)
{
    if(this._currentId === shader._UID)return false;
    
    this._currentId = shader._UID;

    this.currentShader = shader;

    this.gl.useProgram(shader.program);
    this.setAttribs(shader.attributes);

    return true;
};

/**
* Destroys
* @method destroy
*/
PIXI.WebGLShaderManager.prototype.destroy = function()
{
    this.attribState = null;

    this.tempAttribState = null;

    this.primitiveShader.destroy();

    this.defaultShader.destroy();

    this.fastShader.destroy();

    this.stripShader.destroy();

    this.gl = null;
};


/**
 * @author Mat Groves
 * 
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 *
 * Heavily inspired by LibGDX's WebGLSpriteBatch:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/WebGLSpriteBatch.java
 */

 /**
 *
 * @class WebGLSpriteBatch
 * @private
 * @constructor
 * @param gl {WebGLContext} the current WebGL drawing context
 *
 */
PIXI.WebGLSpriteBatch = function(gl)
{

    /**
     * 
     *
     * @property vertSize
     * @type Number
     */
    this.vertSize = 6;

    /**
     * The number of images in the SpriteBatch before it flushes
     * @property size
     * @type Number
     */
    this.size = 2000;//Math.pow(2, 16) /  this.vertSize;

    //the total number of floats in our batch
    var numVerts = this.size * 4 *  this.vertSize;
    //the total number of indices in our batch
    var numIndices = this.size * 6;

    //vertex data

    /**
    * Holds the vertices
    *
    * @property vertices
    * @type Float32Array
    */
    this.vertices = new Float32Array(numVerts);

    //index data
    /**
     * Holds the indices
     *
     * @property indices
     * @type Uint16Array
     */
    this.indices = new Uint16Array(numIndices);
    
    this.lastIndexCount = 0;

    for (var i=0, j=0; i < numIndices; i += 6, j += 4)
    {
        this.indices[i + 0] = j + 0;
        this.indices[i + 1] = j + 1;
        this.indices[i + 2] = j + 2;
        this.indices[i + 3] = j + 0;
        this.indices[i + 4] = j + 2;
        this.indices[i + 5] = j + 3;
    }


    this.drawing = false;
    this.currentBatchSize = 0;
    this.currentBaseTexture = null;
    
    this.setContext(gl);

    this.dirty = true;

    this.textures = [];
    this.blendModes = [];
};

/**
* 
* @method setContext
*
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLSpriteBatch.prototype.setContext = function(gl)
{
    this.gl = gl;

    // create a couple of buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    // 65535 is max index, so 65535 / 6 = 10922.


    //upload the index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    this.currentBlendMode = 99999;
};

/**
* 
* @method begin
*
* @param renderSession {RenderSession} the RenderSession
*/
PIXI.WebGLSpriteBatch.prototype.begin = function(renderSession)
{
    this.renderSession = renderSession;
    this.shader = this.renderSession.shaderManager.defaultShader;

    this.start();
};

/**
* 
* @method end
*
*/
PIXI.WebGLSpriteBatch.prototype.end = function()
{
    this.flush();
};

/**
* 
* @method render
* 
* @param sprite {Sprite} the sprite to render when using this spritebatch
*/
PIXI.WebGLSpriteBatch.prototype.render = function(sprite)
{
    var texture = sprite.texture;
    
   //TODO set blend modes.. 
    // check texture..
    if(this.currentBatchSize >= this.size)
    {
        //return;
        this.flush();
        this.currentBaseTexture = texture.baseTexture;
    }

    // get the uvs for the texture
    var uvs = texture._uvs;
    // if the uvs have not updated then no point rendering just yet!
    if(!uvs)return;

    // get the sprites current alpha
    var alpha = sprite.worldAlpha;
    var tint = sprite.tint;

    var verticies = this.vertices;


    // TODO trim??
    var aX = sprite.anchor.x;
    var aY = sprite.anchor.y;

    var w0, w1, h0, h1;
        
    if (texture.trim)
    {
        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
        var trim = texture.trim;

        w1 = trim.x - aX * trim.width;
        w0 = w1 + texture.crop.width;

        h1 = trim.y - aY * trim.height;
        h0 = h1 + texture.crop.height;

    }
    else
    {
        w0 = (texture.frame.width ) * (1-aX);
        w1 = (texture.frame.width ) * -aX;

        h0 = texture.frame.height * (1-aY);
        h1 = texture.frame.height * -aY;
    }

    var index = this.currentBatchSize * 4 * this.vertSize;

    var worldTransform = sprite.worldTransform;

    var a = worldTransform.a;//[0];
    var b = worldTransform.c;//[3];
    var c = worldTransform.b;//[1];
    var d = worldTransform.d;//[4];
    var tx = worldTransform.tx;//[2];
    var ty = worldTransform.ty;///[5];

    // xy
    verticies[index++] = a * w1 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y0;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w0 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w0 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w1 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;
    
    // increment the batchsize
    this.textures[this.currentBatchSize] = sprite.texture.baseTexture;
    this.blendModes[this.currentBatchSize] = sprite.blendMode;

    this.currentBatchSize++;

};

/**
* Renders a tilingSprite using the spriteBatch
* @method renderTilingSprite
* 
* @param sprite {TilingSprite} the tilingSprite to render
*/
PIXI.WebGLSpriteBatch.prototype.renderTilingSprite = function(tilingSprite)
{
    var texture = tilingSprite.tilingTexture;

    
    // check texture..
    if(this.currentBatchSize >= this.size)
    {
        //return;
        this.flush();
        this.currentBaseTexture = texture.baseTexture;
    }

     // set the textures uvs temporarily
    // TODO create a separate texture so that we can tile part of a texture

    if(!tilingSprite._uvs)tilingSprite._uvs = new PIXI.TextureUvs();

    var uvs = tilingSprite._uvs;

    tilingSprite.tilePosition.x %= texture.baseTexture.width * tilingSprite.tileScaleOffset.x;
    tilingSprite.tilePosition.y %= texture.baseTexture.height * tilingSprite.tileScaleOffset.y;

    var offsetX =  tilingSprite.tilePosition.x/(texture.baseTexture.width*tilingSprite.tileScaleOffset.x);
    var offsetY =  tilingSprite.tilePosition.y/(texture.baseTexture.height*tilingSprite.tileScaleOffset.y);

    var scaleX =  (tilingSprite.width / texture.baseTexture.width)  / (tilingSprite.tileScale.x * tilingSprite.tileScaleOffset.x);
    var scaleY =  (tilingSprite.height / texture.baseTexture.height) / (tilingSprite.tileScale.y * tilingSprite.tileScaleOffset.y);

    uvs.x0 = 0 - offsetX;
    uvs.y0 = 0 - offsetY;

    uvs.x1 = (1 * scaleX) - offsetX;
    uvs.y1 = 0 - offsetY;

    uvs.x2 = (1 * scaleX) - offsetX;
    uvs.y2 = (1 * scaleY) - offsetY;

    uvs.x3 = 0 - offsetX;
    uvs.y3 = (1 *scaleY) - offsetY;

    // get the tilingSprites current alpha
    var alpha = tilingSprite.worldAlpha;
    var tint = tilingSprite.tint;

    var  verticies = this.vertices;

    var width = tilingSprite.width;
    var height = tilingSprite.height;

    // TODO trim??
    var aX = tilingSprite.anchor.x;
    var aY = tilingSprite.anchor.y;
    var w0 = width * (1-aX);
    var w1 = width * -aX;

    var h0 = height * (1-aY);
    var h1 = height * -aY;

    var index = this.currentBatchSize * 4 * this.vertSize;

    var worldTransform = tilingSprite.worldTransform;

    var a = worldTransform.a;//[0];
    var b = worldTransform.c;//[3];
    var c = worldTransform.b;//[1];
    var d = worldTransform.d;//[4];
    var tx = worldTransform.tx;//[2];
    var ty = worldTransform.ty;///[5];

    // xy
    verticies[index++] = a * w1 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y0;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = (a * w0 + c * h1 + tx);
    verticies[index++] = d * h1 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;
    
    // xy
    verticies[index++] = a * w0 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w1 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // increment the batchs
    this.textures[this.currentBatchSize] = texture.baseTexture;
    this.blendModes[this.currentBatchSize] = tilingSprite.blendMode;
    this.currentBatchSize++;
};


/**
* Renders the content and empties the current batch
*
* @method flush
* 
*/
PIXI.WebGLSpriteBatch.prototype.flush = function()
{
    // If the batch is length 0 then return as there is nothing to draw
    if (this.currentBatchSize===0)return;

    var gl = this.gl;

    this.renderSession.shaderManager.setShader(this.renderSession.shaderManager.defaultShader);

    if(this.dirty)
    {
        this.dirty = false;
        // bind the main texture
        gl.activeTexture(gl.TEXTURE0);

        // bind the buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // set the projection
        var projection = this.renderSession.projection;
        gl.uniform2f(this.shader.projectionVector, projection.x, projection.y);

        // set the pointers
        var stride =  this.vertSize * 4;
        gl.vertexAttribPointer(this.shader.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(this.shader.aTextureCoord, 2, gl.FLOAT, false, stride, 2 * 4);
        gl.vertexAttribPointer(this.shader.colorAttribute, 2, gl.FLOAT, false, stride, 4 * 4);

    }

    // upload the verts to the buffer  
    if(this.currentBatchSize > ( this.size * 0.5 ) )
    {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    }
    else
    {
        var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    }

    var nextTexture, nextBlendMode;
    var batchSize = 0;
    var start = 0;

    var currentBaseTexture = null;
    var currentBlendMode = this.renderSession.blendModeManager.currentBlendMode;

    for (var i = 0, j = this.currentBatchSize; i < j; i++) {
        
        nextTexture = this.textures[i];
        nextBlendMode = this.blendModes[i];

        if(currentBaseTexture !== nextTexture || currentBlendMode !== nextBlendMode)
        {
            this.renderBatch(currentBaseTexture, batchSize, start);

            start = i;
            batchSize = 0;
            currentBaseTexture = nextTexture;
            currentBlendMode = nextBlendMode;
            
            this.renderSession.blendModeManager.setBlendMode( currentBlendMode );
        }

        batchSize++;
    }

    this.renderBatch(currentBaseTexture, batchSize, start);

    // then reset the batch!
    this.currentBatchSize = 0;
};

PIXI.WebGLSpriteBatch.prototype.renderBatch = function(texture, size, startIndex)
{
    if(size === 0)return;

    var gl = this.gl;
    // bind the current texture
    gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id] || PIXI.createWebGLTexture(texture, gl));

    // check if a texture is dirty..
    if(texture._dirty[gl.id])
    {
        PIXI.updateWebGLTexture(this.currentBaseTexture, gl);
    }

    // now draw those suckas!
    gl.drawElements(gl.TRIANGLES, size * 6, gl.UNSIGNED_SHORT, startIndex * 6 * 2);
    
    // increment the draw count
    this.renderSession.drawCount++;
};

/**
* 
* @method stop
*
*/
PIXI.WebGLSpriteBatch.prototype.stop = function()
{
    this.flush();
};

/**
* 
* @method start
*
*/
PIXI.WebGLSpriteBatch.prototype.start = function()
{
    this.dirty = true;
};

/**
* Destroys the SpriteBatch
* @method destroy
*/
PIXI.WebGLSpriteBatch.prototype.destroy = function()
{

    this.vertices = null;
    this.indices = null;
    
    this.gl.deleteBuffer( this.vertexBuffer );
    this.gl.deleteBuffer( this.indexBuffer );
    
    this.currentBaseTexture = null;
    
    this.gl = null;
};


/**
 * @author Mat Groves
 * 
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 *
 * Heavily inspired by LibGDX's WebGLSpriteBatch:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/WebGLSpriteBatch.java
 */

PIXI.WebGLFastSpriteBatch = function(gl)
{
   

    this.vertSize = 10;
    this.maxSize = 6000;//Math.pow(2, 16) /  this.vertSize;
    this.size = this.maxSize;

    //the total number of floats in our batch
    var numVerts = this.size * 4 *  this.vertSize;
    //the total number of indices in our batch
    var numIndices = this.maxSize * 6;

     //vertex data
    this.vertices = new Float32Array(numVerts);
    //index data
    this.indices = new Uint16Array(numIndices);
    
    this.vertexBuffer = null;
    this.indexBuffer = null;

    this.lastIndexCount = 0;

    for (var i=0, j=0; i < numIndices; i += 6, j += 4)
    {
        this.indices[i + 0] = j + 0;
        this.indices[i + 1] = j + 1;
        this.indices[i + 2] = j + 2;
        this.indices[i + 3] = j + 0;
        this.indices[i + 4] = j + 2;
        this.indices[i + 5] = j + 3;
    }

    this.drawing = false;
    this.currentBatchSize = 0;
    this.currentBaseTexture = null;
   
    this.currentBlendMode = 0;
    this.renderSession = null;
    

    this.shader = null;

    this.matrix = null;

    this.setContext(gl);
};

PIXI.WebGLFastSpriteBatch.prototype.setContext = function(gl)
{
    this.gl = gl;

    // create a couple of buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    // 65535 is max index, so 65535 / 6 = 10922.


    //upload the index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
};

PIXI.WebGLFastSpriteBatch.prototype.begin = function(spriteBatch, renderSession)
{
    this.renderSession = renderSession;
    this.shader = this.renderSession.shaderManager.fastShader;

    this.matrix = spriteBatch.worldTransform.toArray(true);

    this.start();
};

PIXI.WebGLFastSpriteBatch.prototype.end = function()
{
    this.flush();
};


PIXI.WebGLFastSpriteBatch.prototype.render = function(spriteBatch)
{

    var children = spriteBatch.children;
    var sprite = children[0];

    // if the uvs have not updated then no point rendering just yet!
    
    // check texture.
    if(!sprite.texture._uvs)return;
   
    this.currentBaseTexture = sprite.texture.baseTexture;
    
    // check blend mode
    if(sprite.blendMode !== this.renderSession.blendModeManager.currentBlendMode)
    {
        this.flush();
        this.renderSession.blendModeManager.setBlendMode(sprite.blendMode);
    }
    
    for(var i=0,j= children.length; i<j; i++)
    {
        this.renderSprite(children[i]);
    }

    this.flush();
};

PIXI.WebGLFastSpriteBatch.prototype.renderSprite = function(sprite)
{
    //sprite = children[i];
    if(!sprite.visible)return;
    
    // TODO trim??
    if(sprite.texture.baseTexture !== this.currentBaseTexture)
    {
        this.flush();
        this.currentBaseTexture = sprite.texture.baseTexture;
        
        if(!sprite.texture._uvs)return;
    }

    var uvs, verticies = this.vertices, width, height, w0, w1, h0, h1, index;

    uvs = sprite.texture._uvs;


    width = sprite.texture.frame.width;
    height = sprite.texture.frame.height;

    if (sprite.texture.trim)
    {
        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
        var trim = sprite.texture.trim;

        w1 = trim.x - sprite.anchor.x * trim.width;
        w0 = w1 + sprite.texture.crop.width;

        h1 = trim.y - sprite.anchor.y * trim.height;
        h0 = h1 + sprite.texture.crop.height;
    }
    else
    {
        w0 = (sprite.texture.frame.width ) * (1-sprite.anchor.x);
        w1 = (sprite.texture.frame.width ) * -sprite.anchor.x;

        h0 = sprite.texture.frame.height * (1-sprite.anchor.y);
        h1 = sprite.texture.frame.height * -sprite.anchor.y;
    }

    index = this.currentBatchSize * 4 * this.vertSize;

    // xy
    verticies[index++] = w1;
    verticies[index++] = h1;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

    //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = sprite.alpha;
 

    // xy
    verticies[index++] = w0;
    verticies[index++] = h1;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = sprite.alpha;
  

    // xy
    verticies[index++] = w0;
    verticies[index++] = h0;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = sprite.alpha;
 



    // xy
    verticies[index++] = w1;
    verticies[index++] = h0;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = sprite.alpha;

    // increment the batchs
    this.currentBatchSize++;

    if(this.currentBatchSize >= this.size)
    {
        this.flush();
    }
};

PIXI.WebGLFastSpriteBatch.prototype.flush = function()
{

    // If the batch is length 0 then return as there is nothing to draw
    if (this.currentBatchSize===0)return;

    var gl = this.gl;
    
    // bind the current texture

    if(!this.currentBaseTexture._glTextures[gl.id])PIXI.createWebGLTexture(this.currentBaseTexture, gl);

    gl.bindTexture(gl.TEXTURE_2D, this.currentBaseTexture._glTextures[gl.id]);

    // upload the verts to the buffer

   
    if(this.currentBatchSize > ( this.size * 0.5 ) )
    {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    }
    else
    {
        var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    }
    
    
    // now draw those suckas!
    gl.drawElements(gl.TRIANGLES, this.currentBatchSize * 6, gl.UNSIGNED_SHORT, 0);
   
    // then reset the batch!
    this.currentBatchSize = 0;

    // increment the draw count
    this.renderSession.drawCount++;
};


PIXI.WebGLFastSpriteBatch.prototype.stop = function()
{
    this.flush();
};

PIXI.WebGLFastSpriteBatch.prototype.start = function()
{
    var gl = this.gl;

    // bind the main texture
    gl.activeTexture(gl.TEXTURE0);

    // bind the buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // set the projection
    var projection = this.renderSession.projection;
    gl.uniform2f(this.shader.projectionVector, projection.x, projection.y);

    // set the matrix
    gl.uniformMatrix3fv(this.shader.uMatrix, false, this.matrix);

    // set the pointers
    var stride =  this.vertSize * 4;

    gl.vertexAttribPointer(this.shader.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.shader.aPositionCoord, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribPointer(this.shader.aScale, 2, gl.FLOAT, false, stride, 4 * 4);
    gl.vertexAttribPointer(this.shader.aRotation, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.vertexAttribPointer(this.shader.aTextureCoord, 2, gl.FLOAT, false, stride, 7 * 4);
    gl.vertexAttribPointer(this.shader.colorAttribute, 1, gl.FLOAT, false, stride, 9 * 4);

    
};



/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLFilterManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @param transparent {Boolean} Whether or not the drawing context should be transparent
* @private
*/
PIXI.WebGLFilterManager = function(gl, transparent)
{
    this.transparent = transparent;

    this.filterStack = [];
    
    this.offsetX = 0;
    this.offsetY = 0;

    this.setContext(gl);
};

// API
/**
* Initialises the context and the properties
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLFilterManager.prototype.setContext = function(gl)
{
    this.gl = gl;
    this.texturePool = [];

    this.initShaderBuffers();
};

/**
* 
* @method begin
* @param renderSession {RenderSession} 
* @param buffer {ArrayBuffer} 
*/
PIXI.WebGLFilterManager.prototype.begin = function(renderSession, buffer)
{
    this.renderSession = renderSession;
    this.defaultShader = renderSession.shaderManager.defaultShader;

    var projection = this.renderSession.projection;
   // console.log(this.width)
    this.width = projection.x * 2;
    this.height = -projection.y * 2;
    this.buffer = buffer;
};

/**
* Applies the filter and adds it to the current filter stack
* @method pushFilter
* @param filterBlock {Object} the filter that will be pushed to the current filter stack
*/
PIXI.WebGLFilterManager.prototype.pushFilter = function(filterBlock)
{
    var gl = this.gl;

    var projection = this.renderSession.projection;
    var offset = this.renderSession.offset;

    filterBlock._filterArea = filterBlock.target.filterArea || filterBlock.target.getBounds();


    // filter program
    // OPTIMISATION - the first filter is free if its a simple color change?
    this.filterStack.push(filterBlock);

    var filter = filterBlock.filterPasses[0];

    this.offsetX += filterBlock._filterArea.x;
    this.offsetY += filterBlock._filterArea.y;

    var texture = this.texturePool.pop();
    if(!texture)
    {
        texture = new PIXI.FilterTexture(this.gl, this.width, this.height);
    }
    else
    {
        texture.resize(this.width, this.height);
    }

    gl.bindTexture(gl.TEXTURE_2D,  texture.texture);

    var filterArea = filterBlock._filterArea;// filterBlock.target.getBounds();///filterBlock.target.filterArea;

    var padding = filter.padding;
    filterArea.x -= padding;
    filterArea.y -= padding;
    filterArea.width += padding * 2;
    filterArea.height += padding * 2;

    // cap filter to screen size..
    if(filterArea.x < 0)filterArea.x = 0;
    if(filterArea.width > this.width)filterArea.width = this.width;
    if(filterArea.y < 0)filterArea.y = 0;
    if(filterArea.height > this.height)filterArea.height = this.height;

    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  filterArea.width, filterArea.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, texture.frameBuffer);

    // set view port
    gl.viewport(0, 0, filterArea.width, filterArea.height);

    projection.x = filterArea.width/2;
    projection.y = -filterArea.height/2;

    offset.x = -filterArea.x;
    offset.y = -filterArea.y;

    // update projection
    // now restore the regular shader..
    this.renderSession.shaderManager.setShader(this.defaultShader);
    gl.uniform2f(this.defaultShader.projectionVector, filterArea.width/2, -filterArea.height/2);
    gl.uniform2f(this.defaultShader.offsetVector, -filterArea.x, -filterArea.y);

    gl.colorMask(true, true, true, true);
    gl.clearColor(0,0,0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    filterBlock._glFilterTexture = texture;

};


/**
* Removes the last filter from the filter stack and doesn't return it
* @method popFilter
*/
PIXI.WebGLFilterManager.prototype.popFilter = function()
{
    var gl = this.gl;
    var filterBlock = this.filterStack.pop();
    var filterArea = filterBlock._filterArea;
    var texture = filterBlock._glFilterTexture;
    var projection = this.renderSession.projection;
    var offset = this.renderSession.offset;

    if(filterBlock.filterPasses.length > 1)
    {
        gl.viewport(0, 0, filterArea.width, filterArea.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        this.vertexArray[0] = 0;
        this.vertexArray[1] = filterArea.height;

        this.vertexArray[2] = filterArea.width;
        this.vertexArray[3] = filterArea.height;

        this.vertexArray[4] = 0;
        this.vertexArray[5] = 0;

        this.vertexArray[6] = filterArea.width;
        this.vertexArray[7] = 0;

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexArray);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        // now set the uvs..
        this.uvArray[2] = filterArea.width/this.width;
        this.uvArray[5] = filterArea.height/this.height;
        this.uvArray[6] = filterArea.width/this.width;
        this.uvArray[7] = filterArea.height/this.height;

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvArray);

        var inputTexture = texture;
        var outputTexture = this.texturePool.pop();
        if(!outputTexture)outputTexture = new PIXI.FilterTexture(this.gl, this.width, this.height);
        outputTexture.resize(this.width, this.height);

        // need to clear this FBO as it may have some left over elements from a previous filter.
        gl.bindFramebuffer(gl.FRAMEBUFFER, outputTexture.frameBuffer );
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.disable(gl.BLEND);

        for (var i = 0; i < filterBlock.filterPasses.length-1; i++)
        {
            var filterPass = filterBlock.filterPasses[i];

            gl.bindFramebuffer(gl.FRAMEBUFFER, outputTexture.frameBuffer );

            // set texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

            // draw texture..
            //filterPass.applyFilterPass(filterArea.width, filterArea.height);
            this.applyFilterPass(filterPass, filterArea, filterArea.width, filterArea.height);

            // swap the textures..
            var temp = inputTexture;
            inputTexture = outputTexture;
            outputTexture = temp;
        }

        gl.enable(gl.BLEND);

        texture = inputTexture;
        this.texturePool.push(outputTexture);
    }

    var filter = filterBlock.filterPasses[filterBlock.filterPasses.length-1];

    this.offsetX -= filterArea.x;
    this.offsetY -= filterArea.y;


    var sizeX = this.width;
    var sizeY = this.height;

    var offsetX = 0;
    var offsetY = 0;

    var buffer = this.buffer;

    // time to render the filters texture to the previous scene
    if(this.filterStack.length === 0)
    {
        gl.colorMask(true, true, true, true);//this.transparent);
    }
    else
    {
        var currentFilter = this.filterStack[this.filterStack.length-1];
        filterArea = currentFilter._filterArea;

        sizeX = filterArea.width;
        sizeY = filterArea.height;

        offsetX = filterArea.x;
        offsetY = filterArea.y;

        buffer =  currentFilter._glFilterTexture.frameBuffer;
    }



    // TODO need toremove thease global elements..
    projection.x = sizeX/2;
    projection.y = -sizeY/2;

    offset.x = offsetX;
    offset.y = offsetY;

    filterArea = filterBlock._filterArea;

    var x = filterArea.x-offsetX;
    var y = filterArea.y-offsetY;

    // update the buffers..
    // make sure to flip the y!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    this.vertexArray[0] = x;
    this.vertexArray[1] = y + filterArea.height;

    this.vertexArray[2] = x + filterArea.width;
    this.vertexArray[3] = y + filterArea.height;

    this.vertexArray[4] = x;
    this.vertexArray[5] = y;

    this.vertexArray[6] = x + filterArea.width;
    this.vertexArray[7] = y;

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);

    this.uvArray[2] = filterArea.width/this.width;
    this.uvArray[5] = filterArea.height/this.height;
    this.uvArray[6] = filterArea.width/this.width;
    this.uvArray[7] = filterArea.height/this.height;

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvArray);

   //console.log(this.vertexArray)
   //console.log(this.uvArray)
    //console.log(sizeX + " : " + sizeY)

    gl.viewport(0, 0, sizeX, sizeY);

    // bind the buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer );

    // set the blend mode! 
    //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // set texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);

    // apply!
    this.applyFilterPass(filter, filterArea, sizeX, sizeY);

    // now restore the regular shader..
    this.renderSession.shaderManager.setShader(this.defaultShader);
    gl.uniform2f(this.defaultShader.projectionVector, sizeX/2, -sizeY/2);
    gl.uniform2f(this.defaultShader.offsetVector, -offsetX, -offsetY);

    // return the texture to the pool
    this.texturePool.push(texture);
    filterBlock._glFilterTexture = null;
};


/**
* Applies the filter to the specified area
* @method applyFilterPass
* @param filter {AbstractFilter} the filter that needs to be applied
* @param filterArea {texture} TODO - might need an update
* @param width {Number} the horizontal range of the filter
* @param height {Number} the vertical range of the filter
*/
PIXI.WebGLFilterManager.prototype.applyFilterPass = function(filter, filterArea, width, height)
{
    // use program
    var gl = this.gl;
    var shader = filter.shaders[gl.id];

    if(!shader)
    {
        shader = new PIXI.PixiShader(gl);

        shader.fragmentSrc = filter.fragmentSrc;
        shader.uniforms = filter.uniforms;
        shader.init();

        filter.shaders[gl.id] = shader;
    }

    // set the shader
    this.renderSession.shaderManager.setShader(shader);

//    gl.useProgram(shader.program);

    gl.uniform2f(shader.projectionVector, width/2, -height/2);
    gl.uniform2f(shader.offsetVector, 0,0);

    if(filter.uniforms.dimensions)
    {
        filter.uniforms.dimensions.value[0] = this.width;//width;
        filter.uniforms.dimensions.value[1] = this.height;//height;
        filter.uniforms.dimensions.value[2] = this.vertexArray[0];
        filter.uniforms.dimensions.value[3] = this.vertexArray[5];//filterArea.height;
    }

  //  console.log(this.uvArray )
    shader.syncUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(shader.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.vertexAttribPointer(shader.colorAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // draw the filter...
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    this.renderSession.drawCount++;
};

/**
* Initialises the shader buffers
* @method initShaderBuffers
*/
PIXI.WebGLFilterManager.prototype.initShaderBuffers = function()
{
    var gl = this.gl;

    // create some buffers
    this.vertexBuffer = gl.createBuffer();
    this.uvBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();


    // bind and upload the vertexs..
    // keep a reference to the vertexFloatData..
    this.vertexArray = new Float32Array([0.0, 0.0,
                                         1.0, 0.0,
                                         0.0, 1.0,
                                         1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.vertexArray,
    gl.STATIC_DRAW);


    // bind and upload the uv buffer
    this.uvArray = new Float32Array([0.0, 0.0,
                                     1.0, 0.0,
                                     0.0, 1.0,
                                     1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.uvArray,
    gl.STATIC_DRAW);

    this.colorArray = new Float32Array([1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.colorArray,
    gl.STATIC_DRAW);

    // bind and upload the index
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 1, 3, 2]),
    gl.STATIC_DRAW);
};

/**
* Destroys the filter and removes it from the filter stack
* @method destroy
*/
PIXI.WebGLFilterManager.prototype.destroy = function()
{
    var gl = this.gl;

    this.filterStack = null;
    
    this.offsetX = 0;
    this.offsetY = 0;

    // destroy textures
    for (var i = 0; i < this.texturePool.length; i++) {
        this.texturePool[i].destroy();
    }
    
    this.texturePool = null;

    //destroy buffers..
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.uvBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteBuffer(this.indexBuffer);
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class FilterTexture
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @param width {Number} the horizontal range of the filter
* @param height {Number} the vertical range of the filter
* @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
* @private
*/
PIXI.FilterTexture = function(gl, width, height, scaleMode)
{
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    // next time to create a frame buffer and texture
    this.frameBuffer = gl.createFramebuffer();
    this.texture = gl.createTexture();

    scaleMode = scaleMode || PIXI.scaleModes.DEFAULT;

    gl.bindTexture(gl.TEXTURE_2D,  this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer );
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

    // required for masking a mask??
    this.renderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);
  
    this.resize(width, height);
};


/**
* Clears the filter texture
* @method clear
*/
PIXI.FilterTexture.prototype.clear = function()
{
    var gl = this.gl;
    
    gl.clearColor(0,0,0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

/**
 * Resizes the texture to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the texture
 * @param height {Number} the new height of the texture
 */
PIXI.FilterTexture.prototype.resize = function(width, height)
{
    if(this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;

    var gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D,  this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // update the stencil buffer width and height
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
};

/**
* Destroys the filter texture
* @method destroy
*/
PIXI.FilterTexture.prototype.destroy = function()
{
    var gl = this.gl;
    gl.deleteFramebuffer( this.frameBuffer );
    gl.deleteTexture( this.texture );

    this.frameBuffer = null;
    this.texture = null;
};

/**
 * @author Mat Groves
 * 
 * 
 */
/**
 * A set of functions used to handle masking
 *
 * @class CanvasMaskManager
 */
PIXI.CanvasMaskManager = function()
{
    
};

/**
 * This method adds it to the current stack of masks
 *
 * @method pushMask
 * @param maskData the maskData that will be pushed
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasMaskManager.prototype.pushMask = function(maskData, context)
{
    context.save();
    
    var cacheAlpha = maskData.alpha;
    var transform = maskData.worldTransform;

    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);

    PIXI.CanvasGraphics.renderGraphicsMask(maskData, context);

    context.clip();

    maskData.worldAlpha = cacheAlpha;
};

/**
 * Restores the current drawing context to the state it was before the mask was applied
 *
 * @method popMask
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasMaskManager.prototype.popMask = function(context)
{
    context.restore();
};

/**
 * @author Mat Groves
 * 
 * 
 */

/**
 * @class CanvasTinter
 * @constructor
 * @static
 */
PIXI.CanvasTinter = function()
{
    /// this.textureCach
};

//PIXI.CanvasTinter.cachTint = true;
    

/**
 * Basically this method just needs a sprite and a color and tints the sprite 
 * with the given color
 * 
 * @method getTintedTexture 
 * @param sprite {Sprite} the sprite to tint
 * @param color {Number} the color to use to tint the sprite with
 */
PIXI.CanvasTinter.getTintedTexture = function(sprite, color)
{

    var texture = sprite.texture;

    color = PIXI.CanvasTinter.roundColor(color);

    var stringColor = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
   
    texture.tintCache = texture.tintCache || {};

    if(texture.tintCache[stringColor]) return texture.tintCache[stringColor];

     // clone texture..
    var canvas = PIXI.CanvasTinter.canvas || document.createElement("canvas");
    
    //PIXI.CanvasTinter.tintWithPerPixel(texture, stringColor, canvas);

    
    PIXI.CanvasTinter.tintMethod(texture, color, canvas);

    if(PIXI.CanvasTinter.convertTintToImage)
    {
        // is this better?
        var tintImage = new Image();
        tintImage.src = canvas.toDataURL();

        texture.tintCache[stringColor] = tintImage;
    }
    else
    {
      
        texture.tintCache[stringColor] = canvas;
        // if we are not converting the texture to an image then we need to lose the reference to the canvas
        PIXI.CanvasTinter.canvas = null;

    }

    return canvas;
};

/**
 * Tint a texture using the "multiply" operation
 * @method tintWithMultiply
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithMultiply = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;

    context.fillStyle = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
    
    context.fillRect(0, 0, frame.width, frame.height);
    
    context.globalCompositeOperation = "multiply";

    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    context.globalCompositeOperation = "destination-atop";
    
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);
};

/**
 * Tint a texture using the "overlay" operation
 * @method tintWithOverlay
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithOverlay = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;

    
    
    context.globalCompositeOperation = "copy";
    context.fillStyle = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
    context.fillRect(0, 0, frame.width, frame.height);

    context.globalCompositeOperation = "destination-atop";
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    
    //context.globalCompositeOperation = "copy";

};

/**
 * Tint a texture pixel per pixel
 * @method tintPerPixel
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithPerPixel = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;
  
    context.globalCompositeOperation = "copy";
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    var rgbValues = PIXI.hex2rgb(color);
    var r = rgbValues[0], g = rgbValues[1], b = rgbValues[2];

    var pixelData = context.getImageData(0, 0, frame.width, frame.height);

    var pixels = pixelData.data;

    for (var i = 0; i < pixels.length; i += 4)
    {
        pixels[i+0] *= r;
        pixels[i+1] *= g;
        pixels[i+2] *= b;
    }

    context.putImageData(pixelData, 0, 0);
};

/**
 * Rounds the specified color according to the PIXI.CanvasTinter.cacheStepsPerColorChannel
 * @method roundColor
 * @param color {number} the color to round, should be a hex color
 */
PIXI.CanvasTinter.roundColor = function(color)
{
    var step = PIXI.CanvasTinter.cacheStepsPerColorChannel;

    var rgbValues = PIXI.hex2rgb(color);

    rgbValues[0] = Math.min(255, (rgbValues[0] / step) * step);
    rgbValues[1] = Math.min(255, (rgbValues[1] / step) * step);
    rgbValues[2] = Math.min(255, (rgbValues[2] / step) * step);

    return PIXI.rgb2hex(rgbValues);
};

/**
 * 
 * Number of steps which will be used as a cap when rounding colors
 *
 * @property cacheStepsPerColorChannel
 * @type Number
 */
PIXI.CanvasTinter.cacheStepsPerColorChannel = 8;
/**
 * 
 * Number of steps which will be used as a cap when rounding colors
 *
 * @property convertTintToImage
 * @type Boolean
 */
PIXI.CanvasTinter.convertTintToImage = false;

/**
 * Whether or not the Canvas BlendModes are supported, consequently the ability to tint using the multiply method
 *
 * @property canUseMultiply
 * @type Boolean
 */
PIXI.CanvasTinter.canUseMultiply = PIXI.canUseNewCanvasBlendModes();

PIXI.CanvasTinter.tintMethod = PIXI.CanvasTinter.canUseMultiply ? PIXI.CanvasTinter.tintWithMultiply :  PIXI.CanvasTinter.tintWithPerPixel;


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * the CanvasRenderer draws the stage and all its content onto a 2d canvas. This renderer should be used for browsers that do not support webGL.
 * Dont forget to add the view to your DOM or you will not see anything :)
 *
 * @class CanvasRenderer
 * @constructor
 * @param width=800 {Number} the width of the canvas view
 * @param height=600 {Number} the height of the canvas view
 * @param [view] {HTMLCanvasElement} the canvas to use as a view, optional
 * @param [transparent=false] {Boolean} the transparency of the render view, default false
 */
PIXI.CanvasRenderer = function(width, height, view, transparent)
{
    if(!PIXI.defaultRenderer)
    {
        PIXI.sayHello("Canvas");
        PIXI.defaultRenderer = this;
    }

    this.type = PIXI.CANVAS_RENDERER;

    /**
     * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
     * If the Stage is NOT transparent Pixi will use a canvas sized fillRect operation every frame to set the canvas background color.
     * If the Stage is transparent Pixi will use clearRect to clear the canvas every frame.
     * Disable this by setting this to false. For example if your game has a canvas filling background image you often don't need this set.
     *
     * @property clearBeforeRender
     * @type Boolean
     * @default
     */
    this.clearBeforeRender = true;

    /**
     * Whether the render view is transparent
     *
     * @property transparent
     * @type Boolean
     */
    this.transparent = !!transparent;

    if(!PIXI.blendModesCanvas)
    {
        PIXI.blendModesCanvas = [];

        if(PIXI.canUseNewCanvasBlendModes())
        {
            PIXI.blendModesCanvas[PIXI.blendModes.NORMAL]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.ADD]      = "lighter"; //IS THIS OK???
            PIXI.blendModesCanvas[PIXI.blendModes.MULTIPLY] = "multiply";
            PIXI.blendModesCanvas[PIXI.blendModes.SCREEN]   = "screen";
            PIXI.blendModesCanvas[PIXI.blendModes.OVERLAY]  = "overlay";
            PIXI.blendModesCanvas[PIXI.blendModes.DARKEN]   = "darken";
            PIXI.blendModesCanvas[PIXI.blendModes.LIGHTEN]  = "lighten";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_DODGE] = "color-dodge";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_BURN] = "color-burn";
            PIXI.blendModesCanvas[PIXI.blendModes.HARD_LIGHT] = "hard-light";
            PIXI.blendModesCanvas[PIXI.blendModes.SOFT_LIGHT] = "soft-light";
            PIXI.blendModesCanvas[PIXI.blendModes.DIFFERENCE] = "difference";
            PIXI.blendModesCanvas[PIXI.blendModes.EXCLUSION] = "exclusion";
            PIXI.blendModesCanvas[PIXI.blendModes.HUE]       = "hue";
            PIXI.blendModesCanvas[PIXI.blendModes.SATURATION] = "saturation";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR]      = "color";
            PIXI.blendModesCanvas[PIXI.blendModes.LUMINOSITY] = "luminosity";
        }
        else
        {
            // this means that the browser does not support the cool new blend modes in canvas "cough" ie "cough"
            PIXI.blendModesCanvas[PIXI.blendModes.NORMAL]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.ADD]      = "lighter"; //IS THIS OK???
            PIXI.blendModesCanvas[PIXI.blendModes.MULTIPLY] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SCREEN]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.OVERLAY]  = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.DARKEN]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.LIGHTEN]  = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_DODGE] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_BURN] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.HARD_LIGHT] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SOFT_LIGHT] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.DIFFERENCE] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.EXCLUSION] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.HUE]       = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SATURATION] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR]      = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.LUMINOSITY] = "source-over";
        }
    }

    /**
     * The width of the canvas view
     *
     * @property width
     * @type Number
     * @default 800
     */
    this.width = width || 800;

    /**
     * The height of the canvas view
     *
     * @property height
     * @type Number
     * @default 600
     */
    this.height = height || 600;

    /**
     * The canvas element that everything is drawn to
     *
     * @property view
     * @type HTMLCanvasElement
     */
    this.view = view || document.createElement( "canvas" );

    /**
     * The canvas 2d context that everything is drawn with
     * @property context
     * @type HTMLCanvasElement 2d Context
     */
    this.context = this.view.getContext( "2d", { alpha: this.transparent } );

    this.refresh = true;
    // hack to enable some hardware acceleration!
    //this.view.style["transform"] = "translatez(0)";

    this.view.width = this.width;
    this.view.height = this.height;
    this.count = 0;

    /**
     * Instance of a PIXI.CanvasMaskManager, handles masking when using the canvas renderer
     * @property CanvasMaskManager
     * @type CanvasMaskManager
     */
    this.maskManager = new PIXI.CanvasMaskManager();

    /**
     * The render session is just a bunch of parameter used for rendering
     * @property renderSession
     * @type Object
     */
    this.renderSession = {
        context: this.context,
        maskManager: this.maskManager,
        scaleMode: null,
        smoothProperty: null,

        /**
         * If true Pixi will Math.floor() x/y values when rendering, stopping pixel interpolation.
         * Handy for crisp pixel art and speed on legacy devices.
         *
         */
        roundPixels: false
    };

    if("imageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "imageSmoothingEnabled";
    else if("webkitImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "webkitImageSmoothingEnabled";
    else if("mozImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "mozImageSmoothingEnabled";
    else if("oImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "oImageSmoothingEnabled";
};

// constructor
PIXI.CanvasRenderer.prototype.constructor = PIXI.CanvasRenderer;

/**
 * Renders the stage to its canvas view
 *
 * @method render
 * @param stage {Stage} the Stage element to be rendered
 */
PIXI.CanvasRenderer.prototype.render = function(stage)
{
    // update textures if need be
    PIXI.texturesToUpdate.length = 0;
    PIXI.texturesToDestroy.length = 0;

    stage.updateTransform();

    this.context.setTransform(1,0,0,1,0,0);
    this.context.globalAlpha = 1;

    if (navigator.isCocoonJS && this.view.screencanvas) {
        this.context.fillStyle = "black";
        this.context.clear();
    }

    if (!this.transparent && this.clearBeforeRender)
    {
        this.context.fillStyle = stage.backgroundColorString;
        this.context.fillRect(0, 0, this.width, this.height);
    }
    else if (this.transparent && this.clearBeforeRender)
    {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    this.renderDisplayObject(stage);

    // run interaction!
    if(stage.interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }

    // remove frame updates..
    if(PIXI.Texture.frameUpdates.length > 0)
    {
        PIXI.Texture.frameUpdates.length = 0;
    }
};

/**
 * Resizes the canvas view to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the canvas view
 * @param height {Number} the new height of the canvas view
 */
PIXI.CanvasRenderer.prototype.resize = function(width, height)
{
    this.width = width;
    this.height = height;

    this.view.width = width;
    this.view.height = height;
};

/**
 * Renders a display object
 *
 * @method renderDisplayObject
 * @param displayObject {DisplayObject} The displayObject to render
 * @param context {Context2D} the context 2d method of the canvas
 * @private
 */
PIXI.CanvasRenderer.prototype.renderDisplayObject = function(displayObject, context)
{
    // no longer recursive!
    //var transform;
    //var context = this.context;

    this.renderSession.context = context || this.context;
    displayObject._renderCanvas(this.renderSession);
};

/**
 * Renders a flat strip
 *
 * @method renderStripFlat
 * @param strip {Strip} The Strip to render
 * @private
 */
PIXI.CanvasRenderer.prototype.renderStripFlat = function(strip)
{
    var context = this.context;
    var verticies = strip.verticies;

    var length = verticies.length/2;
    this.count++;

    context.beginPath();
    for (var i=1; i < length-2; i++)
    {
        // draw some triangles!
        var index = i*2;

        var x0 = verticies[index],   x1 = verticies[index+2], x2 = verticies[index+4];
        var y0 = verticies[index+1], y1 = verticies[index+3], y2 = verticies[index+5];

        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);
    }

    context.fillStyle = "#FF0000";
    context.fill();
    context.closePath();
};

/**
 * Renders a strip
 *
 * @method renderStrip
 * @param strip {Strip} The Strip to render
 * @private
 */
PIXI.CanvasRenderer.prototype.renderStrip = function(strip)
{
    var context = this.context;

    // draw triangles!!
    var verticies = strip.verticies;
    var uvs = strip.uvs;

    var length = verticies.length/2;
    this.count++;

    for (var i = 1; i < length-2; i++)
    {
        // draw some triangles!
        var index = i*2;

        var x0 = verticies[index],   x1 = verticies[index+2], x2 = verticies[index+4];
        var y0 = verticies[index+1], y1 = verticies[index+3], y2 = verticies[index+5];

        var u0 = uvs[index] * strip.texture.width,   u1 = uvs[index+2] * strip.texture.width, u2 = uvs[index+4]* strip.texture.width;
        var v0 = uvs[index+1]* strip.texture.height, v1 = uvs[index+3] * strip.texture.height, v2 = uvs[index+5]* strip.texture.height;

        context.save();
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);
        context.closePath();

        context.clip();

        // Compute matrix transform
        var delta = u0*v1 + v0*u2 + u1*v2 - v1*u2 - v0*u1 - u0*v2;
        var deltaA = x0*v1 + v0*x2 + x1*v2 - v1*x2 - v0*x1 - x0*v2;
        var deltaB = u0*x1 + x0*u2 + u1*x2 - x1*u2 - x0*u1 - u0*x2;
        var deltaC = u0*v1*x2 + v0*x1*u2 + x0*u1*v2 - x0*v1*u2 - v0*u1*x2 - u0*x1*v2;
        var deltaD = y0*v1 + v0*y2 + y1*v2 - v1*y2 - v0*y1 - y0*v2;
        var deltaE = u0*y1 + y0*u2 + u1*y2 - y1*u2 - y0*u1 - u0*y2;
        var deltaF = u0*v1*y2 + v0*y1*u2 + y0*u1*v2 - y0*v1*u2 - v0*u1*y2 - u0*y1*v2;

        context.transform(deltaA / delta, deltaD / delta,
                            deltaB / delta, deltaE / delta,
                            deltaC / delta, deltaF / delta);

        context.drawImage(strip.texture.baseTexture.source, 0, 0);
        context.restore();
    }
};

/**
 * Creates a Canvas element of the given size
 *
 * @method CanvasBuffer
 * @param width {Number} the width for the newly created canvas
 * @param height {Number} the height for the newly created canvas
 * @static
 * @private
 */
PIXI.CanvasBuffer = function(width, height)
{
    this.width = width;
    this.height = height;

    this.canvas = document.createElement( "canvas" );
    this.context = this.canvas.getContext( "2d" );

    this.canvas.width = width;
    this.canvas.height = height;
};

/**
 * Clears the canvas that was created by the CanvasBuffer class
 *
 * @method clear
 * @private
 */
PIXI.CanvasBuffer.prototype.clear = function()
{
    this.context.clearRect(0,0, this.width, this.height);
};

/**
 * Resizes the canvas that was created by the CanvasBuffer class to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the canvas
 * @param height {Number} the new height of the canvas
 * @private
 */

PIXI.CanvasBuffer.prototype.resize = function(width, height)
{
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * A set of functions used by the canvas renderer to draw the primitive graphics data
 *
 * @class CanvasGraphics
 */
PIXI.CanvasGraphics = function()
{

};


/*
 * Renders the graphics object
 *
 * @static
 * @private
 * @method renderGraphics
 * @param graphics {Graphics} the actual graphics object to render
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasGraphics.renderGraphics = function(graphics, context)
{
    var worldAlpha = graphics.worldAlpha;
    var color = '';

    for (var i = 0; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];
        var points = data.points;

        context.strokeStyle = color = '#' + ('00000' + ( data.lineColor | 0).toString(16)).substr(-6);

        context.lineWidth = data.lineWidth;

        if(data.type === PIXI.Graphics.POLY)
        {
            context.beginPath();

            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if(points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
        else if(data.type === PIXI.Graphics.RECT)
        {

            if(data.fillColor || data.fillColor === 0)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fillRect(points[0], points[1], points[2], points[3]);

            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeRect(points[0], points[1], points[2], points[3]);
            }

        }
        else if(data.type === PIXI.Graphics.CIRC)
        {
            // TODO - need to be Undefined!
            context.beginPath();
            context.arc(points[0], points[1], points[2],0,2*Math.PI);
            context.closePath();

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
        else if(data.type === PIXI.Graphics.ELIP)
        {

            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas

            var ellipseData =  data.points;

            var w = ellipseData[2] * 2;
            var h = ellipseData[3] * 2;

            var x = ellipseData[0] - w/2;
            var y = ellipseData[1] - h/2;

            context.beginPath();

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

            context.closePath();

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
        else if (data.type === PIXI.Graphics.RREC)
        {
            var rx = points[0];
            var ry = points[1];
            var width = points[2];
            var height = points[3];
            var radius = points[4];

            var maxRadius = Math.min(width, height) / 2 | 0;
            radius = radius > maxRadius ? maxRadius : radius;

            context.beginPath();
            context.moveTo(rx, ry + radius);
            context.lineTo(rx, ry + height - radius);
            context.quadraticCurveTo(rx, ry + height, rx + radius, ry + height);
            context.lineTo(rx + width - radius, ry + height);
            context.quadraticCurveTo(rx + width, ry + height, rx + width, ry + height - radius);
            context.lineTo(rx + width, ry + radius);
            context.quadraticCurveTo(rx + width, ry, rx + width - radius, ry);
            context.lineTo(rx + radius, ry);
            context.quadraticCurveTo(rx, ry, rx, ry + radius);
            context.closePath();

            if(data.fillColor || data.fillColor === 0)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();

            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
    }
};

/*
 * Renders a graphics mask
 *
 * @static
 * @private
 * @method renderGraphicsMask
 * @param graphics {Graphics} the graphics which will be used as a mask
 * @param context {Context2D} the context 2d method of the canvas
 */
PIXI.CanvasGraphics.renderGraphicsMask = function(graphics, context)
{
    var len = graphics.graphicsData.length;

    if(len === 0) return;

    if(len > 1)
    {
        len = 1;
        window.console.log('Pixi.js warning: masks in canvas can only mask using the first path in the graphics object');
    }

    for (var i = 0; i < 1; i++)
    {
        var data = graphics.graphicsData[i];
        var points = data.points;

        if(data.type === PIXI.Graphics.POLY)
        {
            context.beginPath();
            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if(points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

        }
        else if(data.type === PIXI.Graphics.RECT)
        {
            context.beginPath();
            context.rect(points[0], points[1], points[2], points[3]);
            context.closePath();
        }
        else if(data.type === PIXI.Graphics.CIRC)
        {
            // TODO - need to be Undefined!
            context.beginPath();
            context.arc(points[0], points[1], points[2],0,2*Math.PI);
            context.closePath();
        }
        else if(data.type === PIXI.Graphics.ELIP)
        {

            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
            var ellipseData =  data.points;

            var w = ellipseData[2] * 2;
            var h = ellipseData[3] * 2;

            var x = ellipseData[0] - w/2;
            var y = ellipseData[1] - h/2;

            context.beginPath();

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
            context.closePath();
        }
        else if (data.type === PIXI.Graphics.RREC)
        {
            var rx = points[0];
            var ry = points[1];
            var width = points[2];
            var height = points[3];
            var radius = points[4];

            var maxRadius = Math.min(width, height) / 2 | 0;
            radius = radius > maxRadius ? maxRadius : radius;

            context.beginPath();
            context.moveTo(rx, ry + radius);
            context.lineTo(rx, ry + height - radius);
            context.quadraticCurveTo(rx, ry + height, rx + radius, ry + height);
            context.lineTo(rx + width - radius, ry + height);
            context.quadraticCurveTo(rx + width, ry + height, rx + width, ry + height - radius);
            context.lineTo(rx + width, ry + radius);
            context.quadraticCurveTo(rx + width, ry, rx + width - radius, ry);
            context.lineTo(rx + radius, ry);
            context.quadraticCurveTo(rx, ry, rx, ry + radius);
            context.closePath();
        }
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * The Graphics class contains a set of methods that you can use to create primitive shapes and lines.
 * It is important to know that with the webGL renderer only simple polygons can be filled at this stage
 * Complex polygons will not be filled. Heres an example of a complex polygon: http://www.goodboydigital.com/wp-content/uploads/2013/06/complexPolygon.png
 *
 * @class Graphics
 * @extends DisplayObjectContainer
 * @constructor
 */
PIXI.Graphics = function()
{
    PIXI.DisplayObjectContainer.call( this );

    this.renderable = true;

    /**
     * The alpha of the fill of this graphics object
     *
     * @property fillAlpha
     * @type Number
     */
    this.fillAlpha = 1;

    /**
     * The width of any lines drawn
     *
     * @property lineWidth
     * @type Number
     */
    this.lineWidth = 0;

    /**
     * The color of any lines drawn
     *
     * @property lineColor
     * @type String
     */
    this.lineColor = "black";

    /**
     * Graphics data
     *
     * @property graphicsData
     * @type Array
     * @private
     */
    this.graphicsData = [];


    /**
     * The tint applied to the graphic shape. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;// * Math.random();
    
    /**
     * The blend mode to be applied to the graphic shape
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;
    
    /**
     * Current path
     *
     * @property currentPath
     * @type Object
     * @private
     */
    this.currentPath = {points:[]};

    /**
     * Array containing some WebGL-related properties used by the WebGL renderer
     *
     * @property _webGL
     * @type Array
     * @private
     */
    this._webGL = [];

    /**
     * Whether this shape is being used as a mask
     *
     * @property isMask
     * @type isMask
     */
    this.isMask = false;

    /**
     * The bounds of the graphic shape as rectangle object
     *
     * @property bounds
     * @type Rectangle
     */
    this.bounds = null;

    /**
     * the bounds' padding used for bounds calculation
     *
     * @property boundsPadding
     * @type Number
     */
    this.boundsPadding = 10;

    /**
     * Used to detect if the graphics object has changed if this is set to true then the graphics object will be recalculated
     * 
     * @type {Boolean}
     */
    this.dirty = true;
};

// constructor
PIXI.Graphics.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Graphics.prototype.constructor = PIXI.Graphics;

/**
 * If cacheAsBitmap is true the graphics object will then be rendered as if it was a sprite.
 * This is useful if your graphics element does not change often as it will speed up the rendering of the object
 * It is also usful as the graphics object will always be antialiased because it will be rendered using canvas
 * Not recommended if you are constanly redrawing the graphics element.
 *
 * @property cacheAsBitmap
 * @default false
 * @type Boolean
 * @private
 */
Object.defineProperty(PIXI.Graphics.prototype, "cacheAsBitmap", {
    get: function() {
        return  this._cacheAsBitmap;
    },
    set: function(value) {
        this._cacheAsBitmap = value;

        if(this._cacheAsBitmap)
        {
            this._generateCachedSprite();
        }
        else
        {
            this.destroyCachedSprite();
            this.dirty = true;
        }

    }
});


/**
 * Specifies the line style used for subsequent calls to Graphics methods such as the lineTo() method or the drawCircle() method.
 *
 * @method lineStyle
 * @param lineWidth {Number} width of the line to draw, will update the object's stored style
 * @param color {Number} color of the line to draw, will update the object's stored style
 * @param alpha {Number} alpha of the line to draw, will update the object's stored style
 */
PIXI.Graphics.prototype.lineStyle = function(lineWidth, color, alpha)
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.lineWidth = lineWidth || 0;
    this.lineColor = color || 0;
    this.lineAlpha = (arguments.length < 3) ? 1 : alpha;

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling, points:[], type:PIXI.Graphics.POLY};

    this.graphicsData.push(this.currentPath);

    return this;
};

/**
 * Moves the current drawing position to (x, y).
 *
 * @method moveTo
 * @param x {Number} the X coordinate to move to
 * @param y {Number} the Y coordinate to move to
 */
PIXI.Graphics.prototype.moveTo = function(x, y)
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling, points:[], type:PIXI.Graphics.POLY};

    this.currentPath.points.push(x, y);

    this.graphicsData.push(this.currentPath);

    return this;
};

/**
 * Draws a line using the current line style from the current drawing position to (x, y);
 * the current drawing position is then set to (x, y).
 *
 * @method lineTo
 * @param x {Number} the X coordinate to draw to
 * @param y {Number} the Y coordinate to draw to
 */
PIXI.Graphics.prototype.lineTo = function(x, y)
{
    this.currentPath.points.push(x, y);
    this.dirty = true;

    return this;
};

/**
 * Calculate the points for a quadratic bezier curve.
 * Based on : https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
 *
 * @method quadraticCurveTo
 * @param  {number}   cpX   Control point x
 * @param  {number}   cpY   Control point y
 * @param  {number}   toX   Destination point x
 * @param  {number}   toY   Destination point y
 * @return {PIXI.Graphics}
 */
PIXI.Graphics.prototype.quadraticCurveTo = function(cpX, cpY, toX, toY)
{
    if( this.currentPath.points.length === 0)this.moveTo(0,0);

    var xa,
    ya,
    n = 20,
    points = this.currentPath.points;
    if(points.length === 0)this.moveTo(0, 0);
    

    var fromX = points[points.length-2];
    var fromY = points[points.length-1];

    var j = 0;
    for (var i = 1; i <= n; i++ )
    {
        j = i / n;

        xa = fromX + ( (cpX - fromX) * j );
        ya = fromY + ( (cpY - fromY) * j );

        points.push( xa + ( ((cpX + ( (toX - cpX) * j )) - xa) * j ),
                     ya + ( ((cpY + ( (toY - cpY) * j )) - ya) * j ) );
    }


    this.dirty = true;

    return this;
};

/**
 * Calculate the points for a bezier curve.
 *
 * @method bezierCurveTo
 * @param  {number}   cpX    Control point x
 * @param  {number}   cpY    Control point y
 * @param  {number}   cpX2   Second Control point x
 * @param  {number}   cpY2   Second Control point y
 * @param  {number}   toX    Destination point x
 * @param  {number}   toY    Destination point y
 * @return {PIXI.Graphics}
 */
PIXI.Graphics.prototype.bezierCurveTo = function(cpX, cpY, cpX2, cpY2, toX, toY)
{
    if( this.currentPath.points.length === 0)this.moveTo(0,0);

    var n = 20,
    dt,
    dt2,
    dt3,
    t2,
    t3,
    points = this.currentPath.points;

    var fromX = points[points.length-2];
    var fromY = points[points.length-1];
    
    var j = 0;

    for (var i=1; i<n; i++)
    {
        j = i / n;

        dt = (1 - j);
        dt2 = dt * dt;
        dt3 = dt2 * dt;

        t2 = j * j;
        t3 = t2 * j;
        
        points.push( dt3 * fromX + 3 * dt2 * j * cpX + 3 * dt * t2 * cpX2 + t3 * toX,
                     dt3 * fromY + 3 * dt2 * j * cpY + 3 * dt * t2 * cpY2 + t3 * toY);
        
    }
    
    this.dirty = true;

    return this;
};

/*
 * the arcTo() method creates an arc/curve between two tangents on the canvas.
 * 
 * "borrowed" from https://code.google.com/p/fxcanvas/ - thanks google!
 *
 * @method arcTo
 * @param  {number}   x1        The x-coordinate of the beginning of the arc
 * @param  {number}   y1        The y-coordinate of the beginning of the arc
 * @param  {number}   x2        The x-coordinate of the end of the arc
 * @param  {number}   y2        The y-coordinate of the end of the arc
 * @param  {number}   radius    The radius of the arc
 * @return {PIXI.Graphics}
 */
PIXI.Graphics.prototype.arcTo = function(x1, y1, x2, y2, radius)
{
    // check that path contains subpaths
    if( this.currentPath.points.length === 0)this.moveTo(x1, y1);
    
    var points = this.currentPath.points;
    var fromX = points[points.length-2];
    var fromY = points[points.length-1];

//    points.push( x1,  y1);

    var a1 = fromY - y1;
    var b1 = fromX - x1;
    var a2 = y2   - y1;
    var b2 = x2   - x1;
    var mm = Math.abs(a1 * b2 - b1 * a2);

    if (mm < 1.0e-8 || radius === 0)
    {
        points.push(x1, y1);
    }
    else
    {
        var dd = a1 * a1 + b1 * b1;
        var cc = a2 * a2 + b2 * b2;
        var tt = a1 * a2 + b1 * b2;
        var k1 = radius * Math.sqrt(dd) / mm;
        var k2 = radius * Math.sqrt(cc) / mm;
        var j1 = k1 * tt / dd;
        var j2 = k2 * tt / cc;
        var cx = k1 * b2 + k2 * b1;
        var cy = k1 * a2 + k2 * a1;
        var px = b1 * (k2 + j1);
        var py = a1 * (k2 + j1);
        var qx = b2 * (k1 + j2);
        var qy = a2 * (k1 + j2);
        var startAngle = Math.atan2(py - cy, px - cx);
        var endAngle   = Math.atan2(qy - cy, qx - cx);
        // not required?
     //   points.push(px + x1 , py + y1);
        this.arc(cx + x1, cy + y1, radius, startAngle, endAngle, b1 * a2 > b2 * a1);
    }

    this.dirty = true;

    return this;
};

/**
 * The arc() method creates an arc/curve (used to create circles, or parts of circles).
 *
 * @method arc
 * @param  {number}   cx                The x-coordinate of the center of the circle
 * @param  {number}   cy                The y-coordinate of the center of the circle
 * @param  {number}   radius            The radius of the circle
 * @param  {number}   startAngle        The starting angle, in radians (0 is at the 3 o'clock position of the arc's circle)
 * @param  {number}   endAngle          The ending angle, in radians
 * @param  {number}   anticlockwise     Optional. Specifies whether the drawing should be counterclockwise or clockwise. False is default, and indicates clockwise, while true indicates counter-clockwise.
 * @return {PIXI.Graphics}
 */
PIXI.Graphics.prototype.arc = function(cx, cy, radius, startAngle, endAngle, anticlockwise)
{
    var startX = cx + Math.cos(startAngle) * radius;
    var startY = cy + Math.sin(startAngle) * radius;
    
    var points = this.currentPath.points;

    if(points.length !== 0 && points[points.length-2] !== startX || points[points.length-1] !== startY)
    {
        this.moveTo(startX, startY);
        points = this.currentPath.points;
    }

    if (startAngle === endAngle)return this;

    if( !anticlockwise && endAngle <= startAngle )
    {
        endAngle += Math.PI * 2;
    }
    else if( anticlockwise && startAngle <= endAngle )
    {
        startAngle += Math.PI * 2;
    }

    var sweep = anticlockwise ? (startAngle - endAngle) *-1 : (endAngle - startAngle);
    var segs =  ( Math.abs(sweep)/ (Math.PI * 2) ) * 40;

    if( sweep === 0 ) return this;

    var theta = sweep/(segs*2);
    var theta2 = theta*2;

    var cTheta = Math.cos(theta);
    var sTheta = Math.sin(theta);
    
    var segMinus = segs - 1;

    var remainder = ( segMinus % 1 ) / segMinus;

    for(var i=0; i<=segMinus; i++)
    {
        var real =  i + remainder * i;

    
        var angle = ((theta) + startAngle + (theta2 * real));

        var c = Math.cos(angle);
        var s = -Math.sin(angle);

        points.push(( (cTheta *  c) + (sTheta * s) ) * radius + cx,
                    ( (cTheta * -s) + (sTheta * c) ) * radius + cy);
    }

    this.dirty = true;

    return this;
};

/**
 * Draws a line using the current line style from the current drawing position to (x, y);
 * the current drawing position is then set to (x, y).
 *
 * @method lineTo
 * @param x {Number} the X coordinate to draw to
 * @param y {Number} the Y coordinate to draw to
 */
PIXI.Graphics.prototype.drawPath = function(path)
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling, points:[], type:PIXI.Graphics.POLY};

    this.graphicsData.push(this.currentPath);

    this.currentPath.points = this.currentPath.points.concat(path);
    this.dirty = true;

    return this;
};

/**
 * Specifies a simple one-color fill that subsequent calls to other Graphics methods
 * (such as lineTo() or drawCircle()) use when drawing.
 *
 * @method beginFill
 * @param color {Number} the color of the fill
 * @param alpha {Number} the alpha of the fill
 */
PIXI.Graphics.prototype.beginFill = function(color, alpha)
{

    this.filling = true;
    this.fillColor = color || 0;
    this.fillAlpha = (arguments.length < 2) ? 1 : alpha;

    return this;
};

/**
 * Applies a fill to the lines and shapes that were added since the last call to the beginFill() method.
 *
 * @method endFill
 */
PIXI.Graphics.prototype.endFill = function()
{
    this.filling = false;
    this.fillColor = null;
    this.fillAlpha = 1;

    return this;
};

/**
 * @method drawRect
 *
 * @param x {Number} The X coord of the top-left of the rectangle
 * @param y {Number} The Y coord of the top-left of the rectangle
 * @param width {Number} The width of the rectangle
 * @param height {Number} The height of the rectangle
 */
PIXI.Graphics.prototype.drawRect = function( x, y, width, height )
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, width, height], type:PIXI.Graphics.RECT};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * @method drawRoundedRect
 *
 * @param x {Number} The X coord of the top-left of the rectangle
 * @param y {Number} The Y coord of the top-left of the rectangle
 * @param width {Number} The width of the rectangle
 * @param height {Number} The height of the rectangle
 * @param radius {Number} Radius of the rectangle corners
 */
PIXI.Graphics.prototype.drawRoundedRect = function( x, y, width, height, radius )
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, width, height, radius], type:PIXI.Graphics.RREC};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Draws a circle.
 *
 * @method drawCircle
 * @param x {Number} The X coordinate of the center of the circle
 * @param y {Number} The Y coordinate of the center of the circle
 * @param radius {Number} The radius of the circle
 */
PIXI.Graphics.prototype.drawCircle = function(x, y, radius)
{

    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, radius, radius], type:PIXI.Graphics.CIRC};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Draws an ellipse.
 *
 * @method drawEllipse
 * @param x {Number} The X coordinate of the center of the ellipse
 * @param y {Number} The Y coordinate of the center of the ellipse
 * @param width {Number} The half width of the ellipse
 * @param height {Number} The half height of the ellipse
 */
PIXI.Graphics.prototype.drawEllipse = function(x, y, width, height)
{

    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, width, height], type:PIXI.Graphics.ELIP};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Clears the graphics that were drawn to this Graphics object, and resets fill and line style settings.
 *
 * @method clear
 */
PIXI.Graphics.prototype.clear = function()
{
    this.lineWidth = 0;
    this.filling = false;

    this.dirty = true;
    this.clearDirty = true;
    this.graphicsData = [];

    this.bounds = null; //new PIXI.Rectangle();

    return this;
};

/**
 * Useful function that returns a texture of the graphics object that can then be used to create sprites
 * This can be quite useful if your geometry is complicated and needs to be reused multiple times.
 *
 * @method generateTexture
 * @return {Texture} a texture of the graphics object
 */
PIXI.Graphics.prototype.generateTexture = function()
{
    var bounds = this.getBounds();

    var canvasBuffer = new PIXI.CanvasBuffer(bounds.width, bounds.height);
    var texture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);

    canvasBuffer.context.translate(-bounds.x,-bounds.y);
    
    PIXI.CanvasGraphics.renderGraphics(this, canvasBuffer.context);

    return texture;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Graphics.prototype._renderWebGL = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(this.visible === false || this.alpha === 0 || this.isMask === true)return;
    

    if(this._cacheAsBitmap)
    {
       
        if(this.dirty)
        {
            this._generateCachedSprite();
            // we will also need to update the texture on the gpu too!
            PIXI.updateWebGLTexture(this._cachedSprite.texture.baseTexture, renderSession.gl);
            
            this.dirty =  false;
        }

        this._cachedSprite.alpha = this.alpha;
        PIXI.Sprite.prototype._renderWebGL.call(this._cachedSprite, renderSession);

        return;
    }
    else
    {
        renderSession.spriteBatch.stop();
        renderSession.blendModeManager.setBlendMode(this.blendMode);

        if(this._mask)renderSession.maskManager.pushMask(this._mask, renderSession);
        if(this._filters)renderSession.filterManager.pushFilter(this._filterBlock);
      
        // check blend mode
        if(this.blendMode !== renderSession.spriteBatch.currentBlendMode)
        {
            renderSession.spriteBatch.currentBlendMode = this.blendMode;
            var blendModeWebGL = PIXI.blendModesWebGL[renderSession.spriteBatch.currentBlendMode];
            renderSession.spriteBatch.gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
        }
        
      //  for (var i = this.graphicsData.length - 1; i >= 0; i--) {
        //    this.graphicsData[i]
            
//        };

        PIXI.WebGLGraphics.renderGraphics(this, renderSession);
        
        // only render if it has children!
        if(this.children.length)
        {
            renderSession.spriteBatch.start();

             // simple render children!
            for(var i=0, j=this.children.length; i<j; i++)
            {
                this.children[i]._renderWebGL(renderSession);
            }

            renderSession.spriteBatch.stop();
        }

        if(this._filters)renderSession.filterManager.popFilter();
        if(this._mask)renderSession.maskManager.popMask(this.mask, renderSession);
          
        renderSession.drawCount++;

        renderSession.spriteBatch.start();
    }
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Graphics.prototype._renderCanvas = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(this.visible === false || this.alpha === 0 || this.isMask === true)return;
    
    var context = renderSession.context;
    var transform = this.worldTransform;
    
    if(this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    if(this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, renderSession.context);
    }

    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
    PIXI.CanvasGraphics.renderGraphics(this, context);

     // simple render children!
    for(var i=0, j=this.children.length; i<j; i++)
    {
        this.children[i]._renderCanvas(renderSession);
    }

    if(this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};

/**
 * Retrieves the bounds of the graphic shape as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.Graphics.prototype.getBounds = function( matrix )
{
    if(!this.bounds)this.updateBounds();

    var w0 = this.bounds.x;
    var w1 = this.bounds.width + this.bounds.x;

    var h0 = this.bounds.y;
    var h1 = this.bounds.height + this.bounds.y;

    var worldTransform = matrix || this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = x1;
    var maxY = y1;

    var minX = x1;
    var minY = y1;

    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    return bounds;
};

/**
 * Update the bounds of the object
 *
 * @method updateBounds
 */
PIXI.Graphics.prototype.updateBounds = function()
{
    
    var minX = Infinity;
    var maxX = -Infinity;

    var minY = Infinity;
    var maxY = -Infinity;

    var points, x, y, w, h;

    for (var i = 0; i < this.graphicsData.length; i++) {
        var data = this.graphicsData[i];
        var type = data.type;
        var lineWidth = data.lineWidth;

        points = data.points;

        if(type === PIXI.Graphics.RECT)
        {
            x = points[0] - lineWidth/2;
            y = points[1] - lineWidth/2;
            w = points[2] + lineWidth;
            h = points[3] + lineWidth;

            minX = x < minX ? x : minX;
            maxX = x + w > maxX ? x + w : maxX;

            minY = y < minY ? x : minY;
            maxY = y + h > maxY ? y + h : maxY;
        }
        else if(type === PIXI.Graphics.CIRC || type === PIXI.Graphics.ELIP)
        {
            x = points[0];
            y = points[1];
            w = points[2] + lineWidth/2;
            h = points[3] + lineWidth/2;

            minX = x - w < minX ? x - w : minX;
            maxX = x + w > maxX ? x + w : maxX;

            minY = y - h < minY ? y - h : minY;
            maxY = y + h > maxY ? y + h : maxY;
        }
        else
        {
            // POLY
            for (var j = 0; j < points.length; j+=2)
            {

                x = points[j];
                y = points[j+1];
                minX = x-lineWidth < minX ? x-lineWidth : minX;
                maxX = x+lineWidth > maxX ? x+lineWidth : maxX;

                minY = y-lineWidth < minY ? y-lineWidth : minY;
                maxY = y+lineWidth > maxY ? y+lineWidth : maxY;
            }
        }
    }

    var padding = this.boundsPadding;
    this.bounds = new PIXI.Rectangle(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
};


/**
 * Generates the cached sprite when the sprite has cacheAsBitmap = true
 *
 * @method _generateCachedSprite
 * @private
 */
PIXI.Graphics.prototype._generateCachedSprite = function()
{
    var bounds = this.getLocalBounds();

    if(!this._cachedSprite)
    {
        var canvasBuffer = new PIXI.CanvasBuffer(bounds.width, bounds.height);
        var texture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);
        
        this._cachedSprite = new PIXI.Sprite(texture);
        this._cachedSprite.buffer = canvasBuffer;

        this._cachedSprite.worldTransform = this.worldTransform;
    }
    else
    {
        this._cachedSprite.buffer.resize(bounds.width, bounds.height);
    }

    // leverage the anchor to account for the offset of the element
    this._cachedSprite.anchor.x = -( bounds.x / bounds.width );
    this._cachedSprite.anchor.y = -( bounds.y / bounds.height );

   // this._cachedSprite.buffer.context.save();
    this._cachedSprite.buffer.context.translate(-bounds.x,-bounds.y);
    
    PIXI.CanvasGraphics.renderGraphics(this, this._cachedSprite.buffer.context);
    this._cachedSprite.alpha = this.alpha;

   // this._cachedSprite.buffer.context.restore();
};

PIXI.Graphics.prototype.destroyCachedSprite = function()
{
    this._cachedSprite.texture.destroy(true);

    // let the gc collect the unused sprite
    // TODO could be object pooled!
    this._cachedSprite = null;
};


// SOME TYPES:
PIXI.Graphics.POLY = 0;
PIXI.Graphics.RECT = 1;
PIXI.Graphics.CIRC = 2;
PIXI.Graphics.ELIP = 3;
PIXI.Graphics.RREC = 4;


/**
 * @author Mat Groves http://matgroves.com/
 */

 /**
 * 
 * @class Strip
 * @extends DisplayObjectContainer
 * @constructor
 * @param texture {Texture} The texture to use
 * @param width {Number} the width 
 * @param height {Number} the height
 * 
 */
PIXI.Strip = function(texture)
{
    PIXI.DisplayObjectContainer.call( this );
    
    this.texture = texture;

    // set up the main bits..
    this.uvs = new PIXI.Float32Array([0, 1,
                                    1, 1,
                                    1, 0,
                                    0,1]);

    this.verticies = new PIXI.Float32Array([0, 0,
                      100,0,
                      100,100,
                      0, 100]);

    this.colors = new PIXI.Float32Array([1, 1, 1, 1]);

    this.indices = new PIXI.Uint16Array([0, 1, 2, 3]);
    

    this.dirty = true;
};

// constructor
PIXI.Strip.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.Strip.prototype.constructor = PIXI.Strip;

PIXI.Strip.prototype._renderWebGL = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(!this.visible || this.alpha <= 0)return;
    // render triangle strip..

    renderSession.spriteBatch.stop();

    // init! init!
    if(!this._vertexBuffer)this._initWebGL(renderSession);
    
    renderSession.shaderManager.setShader(renderSession.shaderManager.stripShader);

    this._renderStrip(renderSession);

    ///renderSession.shaderManager.activateDefaultShader();

    renderSession.spriteBatch.start();

    //TODO check culling  
};

PIXI.Strip.prototype._initWebGL = function(renderSession)
{
    // build the strip!
    var gl = renderSession.gl;
    
    this._vertexBuffer = gl.createBuffer();
    this._indexBuffer = gl.createBuffer();
    this._uvBuffer = gl.createBuffer();
    this._colorBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.verticies, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,  this.uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
 
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
};

PIXI.Strip.prototype._renderStrip = function(renderSession)
{
    var gl = renderSession.gl;
    var projection = renderSession.projection,
        offset = renderSession.offset,
        shader = renderSession.shaderManager.stripShader;


    // gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mat4Real);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // set uniforms
    gl.uniformMatrix3fv(shader.translationMatrix, false, this.worldTransform.toArray(true));
    gl.uniform2f(shader.projectionVector, projection.x, -projection.y);
    gl.uniform2f(shader.offsetVector, -offset.x, -offset.y);
    gl.uniform1f(shader.alpha, 1);

    if(!this.dirty)
    {
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.verticies);
        gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
        
        // update the uvs
        gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuffer);
        gl.vertexAttribPointer(shader.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            
        gl.activeTexture(gl.TEXTURE0);
         // bind the current texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture.baseTexture._glTextures[gl.id] || PIXI.createWebGLTexture(this.texture.baseTexture, gl));
    
        // dont need to upload!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    
    
    }
    else
    {

        this.dirty = false;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.verticies, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
        
        // update the uvs
        gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.aTextureCoord, 2, gl.FLOAT, false, 0, 0);
            
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.baseTexture._glTextures[gl.id] || PIXI.createWebGLTexture(this.texture.baseTexture, gl));
    
        // dont need to upload!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        
    }
    //console.log(gl.TRIANGLE_STRIP)
    //
    //
    gl.drawElements(gl.TRIANGLE_STRIP, this.indices.length, gl.UNSIGNED_SHORT, 0);
    
  
};

PIXI.Strip.prototype._renderCanvas = function(renderSession)
{
    var context = renderSession.context;
    
    var transform = this.worldTransform;

    if (renderSession.roundPixels)
    {
        context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx | 0, transform.ty | 0);
    }
    else
    {
        context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
    }
        
    var strip = this;
    // draw triangles!!
    var verticies = strip.verticies;
    var uvs = strip.uvs;

    var length = verticies.length/2;
    this.count++;

    for (var i = 0; i < length-2; i++)
    {
        // draw some triangles!
        var index = i*2;

        var x0 = verticies[index],   x1 = verticies[index+2], x2 = verticies[index+4];
        var y0 = verticies[index+1], y1 = verticies[index+3], y2 = verticies[index+5];

        if(true)
        {

            //expand();
            var centerX = (x0 + x1 + x2)/3;
            var centerY = (y0 + y1 + y2)/3;

            var normX = x0 - centerX;
            var normY = y0 - centerY;

            var dist = Math.sqrt( normX * normX + normY * normY );
            x0 = centerX + (normX / dist) * (dist + 3);
            y0 = centerY + (normY / dist) * (dist + 3);

            // 
            
            normX = x1 - centerX;
            normY = y1 - centerY;

            dist = Math.sqrt( normX * normX + normY * normY );
            x1 = centerX + (normX / dist) * (dist + 3);
            y1 = centerY + (normY / dist) * (dist + 3);

            normX = x2 - centerX;
            normY = y2 - centerY;

            dist = Math.sqrt( normX * normX + normY * normY );
            x2 = centerX + (normX / dist) * (dist + 3);
            y2 = centerY + (normY / dist) * (dist + 3);

        }

        var u0 = uvs[index] * strip.texture.width,   u1 = uvs[index+2] * strip.texture.width, u2 = uvs[index+4]* strip.texture.width;
        var v0 = uvs[index+1]* strip.texture.height, v1 = uvs[index+3] * strip.texture.height, v2 = uvs[index+5]* strip.texture.height;

        context.save();
        context.beginPath();


        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);

        context.closePath();

        context.clip();

        // Compute matrix transform
        var delta = u0*v1 + v0*u2 + u1*v2 - v1*u2 - v0*u1 - u0*v2;
        var deltaA = x0*v1 + v0*x2 + x1*v2 - v1*x2 - v0*x1 - x0*v2;
        var deltaB = u0*x1 + x0*u2 + u1*x2 - x1*u2 - x0*u1 - u0*x2;
        var deltaC = u0*v1*x2 + v0*x1*u2 + x0*u1*v2 - x0*v1*u2 - v0*u1*x2 - u0*x1*v2;
        var deltaD = y0*v1 + v0*y2 + y1*v2 - v1*y2 - v0*y1 - y0*v2;
        var deltaE = u0*y1 + y0*u2 + u1*y2 - y1*u2 - y0*u1 - u0*y2;
        var deltaF = u0*v1*y2 + v0*y1*u2 + y0*u1*v2 - y0*v1*u2 - v0*u1*y2 - u0*y1*v2;

        context.transform(deltaA / delta, deltaD / delta,
                            deltaB / delta, deltaE / delta,
                            deltaC / delta, deltaF / delta);

        context.drawImage(strip.texture.baseTexture.source, 0, 0);
        context.restore();
    }
};

/*
 * Sets the texture that the Strip will use 
 *
 * @method setTexture
 * @param texture {Texture} the texture that will be used
 * @private
 */

/*
PIXI.Strip.prototype.setTexture = function(texture)
{
    //TODO SET THE TEXTURES
    //TODO VISIBILITY

    // stop current texture
    this.texture = texture;
    this.width   = texture.frame.width;
    this.height  = texture.frame.height;
    this.updateFrame = true;
};
*/

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */

PIXI.Strip.prototype.onTextureUpdate = function()
{
    this.updateFrame = true;
};
/* @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * 
 * @class Rope
 * @constructor
 * @param texture {Texture} The texture to use
 * @param points {Array}
 * 
 */
PIXI.Rope = function(texture, points)
{
    PIXI.Strip.call( this, texture );
    this.points = points;

    this.verticies = new PIXI.Float32Array(points.length * 4);
    this.uvs = new PIXI.Float32Array(points.length * 4);
    this.colors = new PIXI.Float32Array(points.length * 2);
    this.indices = new PIXI.Uint16Array(points.length * 2);
   

    this.refresh();
};


// constructor
PIXI.Rope.prototype = Object.create( PIXI.Strip.prototype );
PIXI.Rope.prototype.constructor = PIXI.Rope;

/*
 * Refreshes 
 *
 * @method refresh
 */
PIXI.Rope.prototype.refresh = function()
{
    var points = this.points;
    if(points.length < 1) return;

    var uvs = this.uvs;

    var lastPoint = points[0];
    var indices = this.indices;
    var colors = this.colors;

    this.count-=0.2;

    uvs[0] = 0;
    uvs[1] = 0;
    uvs[2] = 0;
    uvs[3] = 1;

    colors[0] = 1;
    colors[1] = 1;

    indices[0] = 0;
    indices[1] = 1;

    var total = points.length,
        point, index, amount;

    for (var i = 1; i < total; i++)
    {
        point = points[i];
        index = i * 4;
        // time to do some smart drawing!
        amount = i / (total-1);

        if(i%2)
        {
            uvs[index] = amount;
            uvs[index+1] = 0;

            uvs[index+2] = amount;
            uvs[index+3] = 1;
        }
        else
        {
            uvs[index] = amount;
            uvs[index+1] = 0;

            uvs[index+2] = amount;
            uvs[index+3] = 1;
        }

        index = i * 2;
        colors[index] = 1;
        colors[index+1] = 1;

        index = i * 2;
        indices[index] = index;
        indices[index + 1] = index + 1;

        lastPoint = point;
    }
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Rope.prototype.updateTransform = function()
{

    var points = this.points;
    if(points.length < 1)return;

    var lastPoint = points[0];
    var nextPoint;
    var perp = {x:0, y:0};

    this.count-=0.2;

    var verticies = this.verticies;
    var total = points.length,
        point, index, ratio, perpLength, num;

    for (var i = 0; i < total; i++)
    {
        point = points[i];
        index = i * 4;

        if(i < points.length-1)
        {
            nextPoint = points[i+1];
        }
        else
        {
            nextPoint = point;
        }

        perp.y = -(nextPoint.x - lastPoint.x);
        perp.x = nextPoint.y - lastPoint.y;

        ratio = (1 - (i / (total-1))) * 10;

        if(ratio > 1) ratio = 1;

        perpLength = Math.sqrt(perp.x * perp.x + perp.y * perp.y);
        num = this.texture.height / 2; //(20 + Math.abs(Math.sin((i + this.count) * 0.3) * 50) )* ratio;
        perp.x /= perpLength;
        perp.y /= perpLength;

        perp.x *= num;
        perp.y *= num;

        verticies[index] = point.x + perp.x;
        verticies[index+1] = point.y + perp.y;
        verticies[index+2] = point.x - perp.x;
        verticies[index+3] = point.y - perp.y;

        lastPoint = point;
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call( this );
};
/*
 * Sets the texture that the Rope will use 
 *
 * @method setTexture
 * @param texture {Texture} the texture that will be used
 */
PIXI.Rope.prototype.setTexture = function(texture)
{
    // stop current texture
    this.texture = texture;
    //this.updateFrame = true;
};

/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * A tiling sprite is a fast way of rendering a tiling image
 *
 * @class TilingSprite
 * @extends Sprite
 * @constructor
 * @param texture {Texture} the texture of the tiling sprite
 * @param width {Number}  the width of the tiling sprite
 * @param height {Number} the height of the tiling sprite
 */
PIXI.TilingSprite = function(texture, width, height)
{
    PIXI.Sprite.call( this, texture);

    /**
     * The with of the tiling sprite
     *
     * @property width
     * @type Number
     */
    this._width = width || 100;

    /**
     * The height of the tiling sprite
     *
     * @property height
     * @type Number
     */
    this._height = height || 100;

    /**
     * The scaling of the image that is being tiled
     *
     * @property tileScale
     * @type Point
     */
    this.tileScale = new PIXI.Point(1,1);

    /**
     * A point that represents the scale of the texture object
     *
     * @property tileScaleOffset
     * @type Point
     */
    this.tileScaleOffset = new PIXI.Point(1,1);
    
    /**
     * The offset position of the image that is being tiled
     *
     * @property tilePosition
     * @type Point
     */
    this.tilePosition = new PIXI.Point(0,0);

    /**
     * Whether this sprite is renderable or not
     *
     * @property renderable
     * @type Boolean
     * @default true
     */
    this.renderable = true;

    /**
     * The tint applied to the sprite. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;
    
    /**
     * The blend mode to be applied to the sprite
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;

    

};

// constructor
PIXI.TilingSprite.prototype = Object.create(PIXI.Sprite.prototype);
PIXI.TilingSprite.prototype.constructor = PIXI.TilingSprite;


/**
 * The width of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */
Object.defineProperty(PIXI.TilingSprite.prototype, 'width', {
    get: function() {
        return this._width;
    },
    set: function(value) {
        
        this._width = value;
    }
});

/**
 * The height of the TilingSprite, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */
Object.defineProperty(PIXI.TilingSprite.prototype, 'height', {
    get: function() {
        return  this._height;
    },
    set: function(value) {
        this._height = value;
    }
});

PIXI.TilingSprite.prototype.setTexture = function(texture)
{
    if (this.texture === texture) return;

    this.texture = texture;

    this.refreshTexture = true;

    this.cachedTint = 0xFFFFFF;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.TilingSprite.prototype._renderWebGL = function(renderSession)
{
    if (this.visible === false || this.alpha === 0) return;
    var i,j;

    if (this._mask)
    {
        renderSession.spriteBatch.stop();
        renderSession.maskManager.pushMask(this.mask, renderSession);
        renderSession.spriteBatch.start();
    }

    if (this._filters)
    {
        renderSession.spriteBatch.flush();
        renderSession.filterManager.pushFilter(this._filterBlock);
    }

   

    if (!this.tilingTexture || this.refreshTexture)
    {
        this.generateTilingTexture(true);

        if (this.tilingTexture && this.tilingTexture.needsUpdate)
        {
            //TODO - tweaking
            PIXI.updateWebGLTexture(this.tilingTexture.baseTexture, renderSession.gl);
            this.tilingTexture.needsUpdate = false;
           // this.tilingTexture._uvs = null;
        }
    }
    else
    {
        renderSession.spriteBatch.renderTilingSprite(this);
    }
    // simple render children!
    for (i=0,j=this.children.length; i<j; i++)
    {
        this.children[i]._renderWebGL(renderSession);
    }

    renderSession.spriteBatch.stop();

    if (this._filters) renderSession.filterManager.popFilter();
    if (this._mask) renderSession.maskManager.popMask(renderSession);
    
    renderSession.spriteBatch.start();
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.TilingSprite.prototype._renderCanvas = function(renderSession)
{
    if (this.visible === false || this.alpha === 0)return;
    
    var context = renderSession.context;

    if (this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, context);
    }

    context.globalAlpha = this.worldAlpha;
    
    var transform = this.worldTransform;

    var i,j;

    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx , transform.ty);

    if (!this.__tilePattern ||  this.refreshTexture)
    {
        this.generateTilingTexture(false);
    
        if (this.tilingTexture)
        {
            this.__tilePattern = context.createPattern(this.tilingTexture.baseTexture.source, 'repeat');
        }
        else
        {
            return;
        }
    }

    // check blend mode
    if (this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    var tilePosition = this.tilePosition;
    var tileScale = this.tileScale;

    tilePosition.x %= this.tilingTexture.baseTexture.width;
    tilePosition.y %= this.tilingTexture.baseTexture.height;

    // offset
    context.scale(tileScale.x,tileScale.y);
    context.translate(tilePosition.x, tilePosition.y);

    context.fillStyle = this.__tilePattern;

    // make sure to account for the anchor point..
    context.fillRect(-tilePosition.x + (this.anchor.x * -this._width),
                    -tilePosition.y + (this.anchor.y * -this._height),
                    this._width / tileScale.x,
                    this._height / tileScale.y);

    context.scale(1 / tileScale.x, 1 / tileScale.y);
    context.translate(-tilePosition.x, -tilePosition.y);

    if (this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }

    for (i=0,j=this.children.length; i<j; i++)
    {
        this.children[i]._renderCanvas(renderSession);
    }
};


/**
* Returns the framing rectangle of the sprite as a PIXI.Rectangle object
*
* @method getBounds
* @return {Rectangle} the framing rectangle
*/
PIXI.TilingSprite.prototype.getBounds = function()
{
    var width = this._width;
    var height = this._height;

    var w0 = width * (1-this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1-this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;
    
    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    minX = x1 < minX ? x1 : minX;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1 < minY ? y1 : minY;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1 > maxX ? x1 : maxX;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1 > maxY ? y1 : maxY;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
};



/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */
PIXI.TilingSprite.prototype.onTextureUpdate = function()
{
   // overriding the sprite version of this!
};


/**
* 
* @method generateTilingTexture
* 
* @param forcePowerOfTwo {Boolean} Whether we want to force the texture to be a power of two
*/
PIXI.TilingSprite.prototype.generateTilingTexture = function(forcePowerOfTwo)
{
    if (!this.texture.baseTexture.hasLoaded) return;

    var texture = this.texture;
    var frame = texture.frame;
    var targetWidth, targetHeight;

    //  Check that the frame is the same size as the base texture.
    var isFrame = frame.width !== texture.baseTexture.width || frame.height !== texture.baseTexture.height;

    var newTextureRequired = false;

    if (!forcePowerOfTwo)
    {
        if (isFrame)
        {
            targetWidth = frame.width;
            targetHeight = frame.height;
           
            newTextureRequired = true;
        }
    }
    else
    {
        targetWidth = PIXI.getNextPowerOfTwo(frame.width);
        targetHeight = PIXI.getNextPowerOfTwo(frame.height);

        if (frame.width !== targetWidth || frame.height !== targetHeight) newTextureRequired = true;
    }

    if (newTextureRequired)
    {
        var canvasBuffer;

        if (this.tilingTexture && this.tilingTexture.isTiling)
        {
            canvasBuffer = this.tilingTexture.canvasBuffer;
            canvasBuffer.resize(targetWidth, targetHeight);
            this.tilingTexture.baseTexture.width = targetWidth;
            this.tilingTexture.baseTexture.height = targetHeight;
            this.tilingTexture.needsUpdate = true;
        }
        else
        {
            canvasBuffer = new PIXI.CanvasBuffer(targetWidth, targetHeight);

            this.tilingTexture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);
            this.tilingTexture.canvasBuffer = canvasBuffer;
            this.tilingTexture.isTiling = true;
        }

        canvasBuffer.context.drawImage(texture.baseTexture.source,
                               texture.crop.x,
                               texture.crop.y,
                               texture.crop.width,
                               texture.crop.height,
                               0,
                               0,
                               targetWidth,
                               targetHeight);

        this.tileScaleOffset.x = frame.width / targetWidth;
        this.tileScaleOffset.y = frame.height / targetHeight;
    }
    else
    {
        //  TODO - switching?
        if (this.tilingTexture && this.tilingTexture.isTiling)
        {
            // destroy the tiling texture!
            // TODO could store this somewhere?
            this.tilingTexture.destroy(true);
        }

        this.tileScaleOffset.x = 1;
        this.tileScaleOffset.y = 1;
        this.tilingTexture = texture;
    }

    this.refreshTexture = false;
    this.tilingTexture.baseTexture._powerOf2 = true;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * based on pixi impact spine implementation made by Eemeli Kelokorpi (@ekelokorpi) https://github.com/ekelokorpi
 *
 * Awesome JS run time provided by EsotericSoftware
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */

/*
 * Awesome JS run time provided by EsotericSoftware
 *
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */



var spine = {};

spine.BoneData = function (name, parent) {
    this.name = name;
    this.parent = parent;
};
spine.BoneData.prototype = {
    length: 0,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1
};

spine.SlotData = function (name, boneData) {
    this.name = name;
    this.boneData = boneData;
};
spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null
};

spine.Bone = function (boneData, parent) {
    this.data = boneData;
    this.parent = parent;
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    m00: 0, m01: 0, worldX: 0, // a b x
    m10: 0, m11: 0, worldY: 0, // c d y
    worldRotation: 0,
    worldScaleX: 1, worldScaleY: 1,
    updateWorldTransform: function (flipX, flipY) {
        var parent = this.parent;
        if (parent != null) {
            this.worldX = this.x * parent.m00 + this.y * parent.m01 + parent.worldX;
            this.worldY = this.x * parent.m10 + this.y * parent.m11 + parent.worldY;
            this.worldScaleX = parent.worldScaleX * this.scaleX;
            this.worldScaleY = parent.worldScaleY * this.scaleY;
            this.worldRotation = parent.worldRotation + this.rotation;
        } else {
            this.worldX = this.x;
            this.worldY = this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotation;
        }
        var radians = this.worldRotation * Math.PI / 180;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        this.m00 = cos * this.worldScaleX;
        this.m10 = sin * this.worldScaleX;
        this.m01 = -sin * this.worldScaleY;
        this.m11 = cos * this.worldScaleY;
        if (flipX) {
            this.m00 = -this.m00;
            this.m01 = -this.m01;
        }
        if (flipY) {
            this.m10 = -this.m10;
            this.m11 = -this.m11;
        }
        if (spine.Bone.yDown) {
            this.m10 = -this.m10;
            this.m11 = -this.m11;
        }
    },
    setToSetupPose: function () {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
    }
};

spine.Slot = function (slotData, skeleton, bone) {
    this.data = slotData;
    this.skeleton = skeleton;
    this.bone = bone;
    this.setToSetupPose();
};
spine.Slot.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    _attachmentTime: 0,
    attachment: null,
    setAttachment: function (attachment) {
        this.attachment = attachment;
        this._attachmentTime = this.skeleton.time;
    },
    setAttachmentTime: function (time) {
        this._attachmentTime = this.skeleton.time - time;
    },
    getAttachmentTime: function () {
        return this.skeleton.time - this._attachmentTime;
    },
    setToSetupPose: function () {
        var data = this.data;
        this.r = data.r;
        this.g = data.g;
        this.b = data.b;
        this.a = data.a;

        var slotDatas = this.skeleton.data.slots;
        for (var i = 0, n = slotDatas.length; i < n; i++) {
            if (slotDatas[i] == data) {
                this.setAttachment(!data.attachmentName ? null : this.skeleton.getAttachmentBySlotIndex(i, data.attachmentName));
                break;
            }
        }
    }
};

spine.Skin = function (name) {
    this.name = name;
    this.attachments = {};
};
spine.Skin.prototype = {
    addAttachment: function (slotIndex, name, attachment) {
        this.attachments[slotIndex + ":" + name] = attachment;
    },
    getAttachment: function (slotIndex, name) {
        return this.attachments[slotIndex + ":" + name];
    },
    _attachAll: function (skeleton, oldSkin) {
        for (var key in oldSkin.attachments) {
            var colon = key.indexOf(":");
            var slotIndex = parseInt(key.substring(0, colon), 10);
            var name = key.substring(colon + 1);
            var slot = skeleton.slots[slotIndex];
            if (slot.attachment && slot.attachment.name == name) {
                var attachment = this.getAttachment(slotIndex, name);
                if (attachment) slot.setAttachment(attachment);
            }
        }
    }
};

spine.Animation = function (name, timelines, duration) {
    this.name = name;
    this.timelines = timelines;
    this.duration = duration;
};
spine.Animation.prototype = {
    apply: function (skeleton, time, loop) {
        if (loop && this.duration) time %= this.duration;
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, time, 1);
    },
    mix: function (skeleton, time, loop, alpha) {
        if (loop && this.duration) time %= this.duration;
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, time, alpha);
    }
};

spine.binarySearch = function (values, target, step) {
    var low = 0;
    var high = Math.floor(values.length / step) - 2;
    if (!high) return step;
    var current = high >>> 1;
    while (true) {
        if (values[(current + 1) * step] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return (low + 1) * step;
        current = (low + high) >>> 1;
    }
};
spine.linearSearch = function (values, target, step) {
    for (var i = 0, last = values.length - step; i <= last; i += step)
        if (values[i] > target) return i;
    return -1;
};

spine.Curves = function (frameCount) {
    this.curves = []; // dfx, dfy, ddfx, ddfy, dddfx, dddfy, ...
    this.curves.length = (frameCount - 1) * 6;
};
spine.Curves.prototype = {
    setLinear: function (frameIndex) {
        this.curves[frameIndex * 6] = 0/*LINEAR*/;
    },
    setStepped: function (frameIndex) {
        this.curves[frameIndex * 6] = -1/*STEPPED*/;
    },
    /** Sets the control handle positions for an interpolation bezier curve used to transition from this keyframe to the next.
     * cx1 and cx2 are from 0 to 1, representing the percent of time between the two keyframes. cy1 and cy2 are the percent of
     * the difference between the keyframe's values. */
    setCurve: function (frameIndex, cx1, cy1, cx2, cy2) {
        var subdiv_step = 1 / 10/*BEZIER_SEGMENTS*/;
        var subdiv_step2 = subdiv_step * subdiv_step;
        var subdiv_step3 = subdiv_step2 * subdiv_step;
        var pre1 = 3 * subdiv_step;
        var pre2 = 3 * subdiv_step2;
        var pre4 = 6 * subdiv_step2;
        var pre5 = 6 * subdiv_step3;
        var tmp1x = -cx1 * 2 + cx2;
        var tmp1y = -cy1 * 2 + cy2;
        var tmp2x = (cx1 - cx2) * 3 + 1;
        var tmp2y = (cy1 - cy2) * 3 + 1;
        var i = frameIndex * 6;
        var curves = this.curves;
        curves[i] = cx1 * pre1 + tmp1x * pre2 + tmp2x * subdiv_step3;
        curves[i + 1] = cy1 * pre1 + tmp1y * pre2 + tmp2y * subdiv_step3;
        curves[i + 2] = tmp1x * pre4 + tmp2x * pre5;
        curves[i + 3] = tmp1y * pre4 + tmp2y * pre5;
        curves[i + 4] = tmp2x * pre5;
        curves[i + 5] = tmp2y * pre5;
    },
    getCurvePercent: function (frameIndex, percent) {
        percent = percent < 0 ? 0 : (percent > 1 ? 1 : percent);
        var curveIndex = frameIndex * 6;
        var curves = this.curves;
        var dfx = curves[curveIndex];
        if (!dfx/*LINEAR*/) return percent;
        if (dfx == -1/*STEPPED*/) return 0;
        var dfy = curves[curveIndex + 1];
        var ddfx = curves[curveIndex + 2];
        var ddfy = curves[curveIndex + 3];
        var dddfx = curves[curveIndex + 4];
        var dddfy = curves[curveIndex + 5];
        var x = dfx, y = dfy;
        var i = 10/*BEZIER_SEGMENTS*/ - 2;
        while (true) {
            if (x >= percent) {
                var lastX = x - dfx;
                var lastY = y - dfy;
                return lastY + (y - lastY) * (percent - lastX) / (x - lastX);
            }
            if (!i) break;
            i--;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }
        return y + (1 - y) * (percent - x) / (1 - x); // Last point is 1,1.
    }
};

spine.RotateTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, angle, ...
    this.frames.length = frameCount * 2;
};
spine.RotateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, angle) {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = angle;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames,
            amount;

        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 2]) { // Time is after last frame.
            amount = bone.data.rotation + frames[frames.length - 1] - bone.rotation;
            while (amount > 180)
                amount -= 360;
            while (amount < -180)
                amount += 360;
            bone.rotation += amount * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 2);
        var lastFrameValue = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 2/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 2 - 1, percent);

        amount = frames[frameIndex + 1/*FRAME_VALUE*/] - lastFrameValue;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        amount = bone.data.rotation + (lastFrameValue + amount * percent) - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
    }
};

spine.TranslateTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.TranslateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y) {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3]) { // Time is after last frame.
            bone.x += (bone.data.x + frames[frames.length - 2] - bone.x) * alpha;
            bone.y += (bone.data.y + frames[frames.length - 1] - bone.y) * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 3);
        var lastFrameX = frames[frameIndex - 2];
        var lastFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.x += (bone.data.x + lastFrameX + (frames[frameIndex + 1/*FRAME_X*/] - lastFrameX) * percent - bone.x) * alpha;
        bone.y += (bone.data.y + lastFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - lastFrameY) * percent - bone.y) * alpha;
    }
};

spine.ScaleTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.ScaleTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y) {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3]) { // Time is after last frame.
            bone.scaleX += (bone.data.scaleX - 1 + frames[frames.length - 2] - bone.scaleX) * alpha;
            bone.scaleY += (bone.data.scaleY - 1 + frames[frames.length - 1] - bone.scaleY) * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 3);
        var lastFrameX = frames[frameIndex - 2];
        var lastFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.scaleX += (bone.data.scaleX - 1 + lastFrameX + (frames[frameIndex + 1/*FRAME_X*/] - lastFrameX) * percent - bone.scaleX) * alpha;
        bone.scaleY += (bone.data.scaleY - 1 + lastFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - lastFrameY) * percent - bone.scaleY) * alpha;
    }
};

spine.ColorTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, r, g, b, a, ...
    this.frames.length = frameCount * 5;
};
spine.ColorTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 5;
    },
    setFrame: function (frameIndex, time, r, g, b, a) {
        frameIndex *= 5;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = r;
        this.frames[frameIndex + 2] = g;
        this.frames[frameIndex + 3] = b;
        this.frames[frameIndex + 4] = a;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var slot = skeleton.slots[this.slotIndex];

        if (time >= frames[frames.length - 5]) { // Time is after last frame.
            var i = frames.length - 1;
            slot.r = frames[i - 3];
            slot.g = frames[i - 2];
            slot.b = frames[i - 1];
            slot.a = frames[i];
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 5);
        var lastFrameR = frames[frameIndex - 4];
        var lastFrameG = frames[frameIndex - 3];
        var lastFrameB = frames[frameIndex - 2];
        var lastFrameA = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 5/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 5 - 1, percent);

        var r = lastFrameR + (frames[frameIndex + 1/*FRAME_R*/] - lastFrameR) * percent;
        var g = lastFrameG + (frames[frameIndex + 2/*FRAME_G*/] - lastFrameG) * percent;
        var b = lastFrameB + (frames[frameIndex + 3/*FRAME_B*/] - lastFrameB) * percent;
        var a = lastFrameA + (frames[frameIndex + 4/*FRAME_A*/] - lastFrameA) * percent;
        if (alpha < 1) {
            slot.r += (r - slot.r) * alpha;
            slot.g += (g - slot.g) * alpha;
            slot.b += (b - slot.b) * alpha;
            slot.a += (a - slot.a) * alpha;
        } else {
            slot.r = r;
            slot.g = g;
            slot.b = b;
            slot.a = a;
        }
    }
};

spine.AttachmentTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.attachmentNames = []; // time, ...
    this.attachmentNames.length = frameCount;
};
spine.AttachmentTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function () {
            return this.frames.length;
    },
    setFrame: function (frameIndex, time, attachmentName) {
        this.frames[frameIndex] = time;
        this.attachmentNames[frameIndex] = attachmentName;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (time >= frames[frames.length - 1]) // Time is after last frame.
            frameIndex = frames.length - 1;
        else
            frameIndex = spine.binarySearch(frames, time, 1) - 1;

        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex].setAttachment(!attachmentName ? null : skeleton.getAttachmentBySlotIndex(this.slotIndex, attachmentName));
    }
};

spine.SkeletonData = function () {
    this.bones = [];
    this.slots = [];
    this.skins = [];
    this.animations = [];
};
spine.SkeletonData.prototype = {
    defaultSkin: null,
    /** @return May be null. */
    findBone: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++) {
            if (slots[i].name == slotName) return slot[i];
        }
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].name == slotName) return i;
        return -1;
    },
    /** @return May be null. */
    findSkin: function (skinName) {
        var skins = this.skins;
        for (var i = 0, n = skins.length; i < n; i++)
            if (skins[i].name == skinName) return skins[i];
        return null;
    },
    /** @return May be null. */
    findAnimation: function (animationName) {
        var animations = this.animations;
        for (var i = 0, n = animations.length; i < n; i++)
            if (animations[i].name == animationName) return animations[i];
        return null;
    }
};

spine.Skeleton = function (skeletonData) {
    this.data = skeletonData;

    this.bones = [];
    for (var i = 0, n = skeletonData.bones.length; i < n; i++) {
        var boneData = skeletonData.bones[i];
        var parent = !boneData.parent ? null : this.bones[skeletonData.bones.indexOf(boneData.parent)];
        this.bones.push(new spine.Bone(boneData, parent));
    }

    this.slots = [];
    this.drawOrder = [];
    for (i = 0, n = skeletonData.slots.length; i < n; i++) {
        var slotData = skeletonData.slots[i];
        var bone = this.bones[skeletonData.bones.indexOf(slotData.boneData)];
        var slot = new spine.Slot(slotData, this, bone);
        this.slots.push(slot);
        this.drawOrder.push(slot);
    }
};
spine.Skeleton.prototype = {
    x: 0, y: 0,
    skin: null,
    r: 1, g: 1, b: 1, a: 1,
    time: 0,
    flipX: false, flipY: false,
    /** Updates the world transform for each bone. */
    updateWorldTransform: function () {
        var flipX = this.flipX;
        var flipY = this.flipY;
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].updateWorldTransform(flipX, flipY);
    },
    /** Sets the bones and slots to their setup pose values. */
    setToSetupPose: function () {
        this.setBonesToSetupPose();
        this.setSlotsToSetupPose();
    },
    setBonesToSetupPose: function () {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].setToSetupPose();
    },
    setSlotsToSetupPose: function () {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            slots[i].setToSetupPose(i);
    },
    /** @return May return null. */
    getRootBone: function () {
        return this.bones.length ? this.bones[0] : null;
    },
    /** @return May be null. */
    findBone: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return slots[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return i;
        return -1;
    },
    setSkinByName: function (skinName) {
        var skin = this.data.findSkin(skinName);
        if (!skin) throw "Skin not found: " + skinName;
        this.setSkin(skin);
    },
    /** Sets the skin used to look up attachments not found in the {@link SkeletonData#getDefaultSkin() default skin}. Attachments
     * from the new skin are attached if the corresponding attachment from the old skin was attached.
     * @param newSkin May be null. */
    setSkin: function (newSkin) {
        if (this.skin && newSkin) newSkin._attachAll(this, this.skin);
        this.skin = newSkin;
    },
    /** @return May be null. */
    getAttachmentBySlotName: function (slotName, attachmentName) {
        return this.getAttachmentBySlotIndex(this.data.findSlotIndex(slotName), attachmentName);
    },
    /** @return May be null. */
    getAttachmentBySlotIndex: function (slotIndex, attachmentName) {
        if (this.skin) {
            var attachment = this.skin.getAttachment(slotIndex, attachmentName);
            if (attachment) return attachment;
        }
        if (this.data.defaultSkin) return this.data.defaultSkin.getAttachment(slotIndex, attachmentName);
        return null;
    },
    /** @param attachmentName May be null. */
    setAttachment: function (slotName, attachmentName) {
        var slots = this.slots;
        for (var i = 0, n = slots.size; i < n; i++) {
            var slot = slots[i];
            if (slot.data.name == slotName) {
                var attachment = null;
                if (attachmentName) {
                    attachment = this.getAttachment(i, attachmentName);
                    if (attachment == null) throw "Attachment not found: " + attachmentName + ", for slot: " + slotName;
                }
                slot.setAttachment(attachment);
                return;
            }
        }
        throw "Slot not found: " + slotName;
    },
    update: function (delta) {
        time += delta;
    }
};

spine.AttachmentType = {
    region: 0
};

spine.RegionAttachment = function () {
    this.offset = [];
    this.offset.length = 8;
    this.uvs = [];
    this.uvs.length = 8;
};
spine.RegionAttachment.prototype = {
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    width: 0, height: 0,
    rendererObject: null,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    setUVs: function (u, v, u2, v2, rotate) {
        var uvs = this.uvs;
        if (rotate) {
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v2;
            uvs[4/*X3*/] = u;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v;
            uvs[0/*X1*/] = u2;
            uvs[1/*Y1*/] = v2;
        } else {
            uvs[0/*X1*/] = u;
            uvs[1/*Y1*/] = v2;
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v;
            uvs[4/*X3*/] = u2;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v2;
        }
    },
    updateOffset: function () {
        var regionScaleX = this.width / this.regionOriginalWidth * this.scaleX;
        var regionScaleY = this.height / this.regionOriginalHeight * this.scaleY;
        var localX = -this.width / 2 * this.scaleX + this.regionOffsetX * regionScaleX;
        var localY = -this.height / 2 * this.scaleY + this.regionOffsetY * regionScaleY;
        var localX2 = localX + this.regionWidth * regionScaleX;
        var localY2 = localY + this.regionHeight * regionScaleY;
        var radians = this.rotation * Math.PI / 180;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var localXCos = localX * cos + this.x;
        var localXSin = localX * sin;
        var localYCos = localY * cos + this.y;
        var localYSin = localY * sin;
        var localX2Cos = localX2 * cos + this.x;
        var localX2Sin = localX2 * sin;
        var localY2Cos = localY2 * cos + this.y;
        var localY2Sin = localY2 * sin;
        var offset = this.offset;
        offset[0/*X1*/] = localXCos - localYSin;
        offset[1/*Y1*/] = localYCos + localXSin;
        offset[2/*X2*/] = localXCos - localY2Sin;
        offset[3/*Y2*/] = localY2Cos + localXSin;
        offset[4/*X3*/] = localX2Cos - localY2Sin;
        offset[5/*Y3*/] = localY2Cos + localX2Sin;
        offset[6/*X4*/] = localX2Cos - localYSin;
        offset[7/*Y4*/] = localYCos + localX2Sin;
    },
    computeVertices: function (x, y, bone, vertices) {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00;
        var m01 = bone.m01;
        var m10 = bone.m10;
        var m11 = bone.m11;
        var offset = this.offset;
        vertices[0/*X1*/] = offset[0/*X1*/] * m00 + offset[1/*Y1*/] * m01 + x;
        vertices[1/*Y1*/] = offset[0/*X1*/] * m10 + offset[1/*Y1*/] * m11 + y;
        vertices[2/*X2*/] = offset[2/*X2*/] * m00 + offset[3/*Y2*/] * m01 + x;
        vertices[3/*Y2*/] = offset[2/*X2*/] * m10 + offset[3/*Y2*/] * m11 + y;
        vertices[4/*X3*/] = offset[4/*X3*/] * m00 + offset[5/*X3*/] * m01 + x;
        vertices[5/*X3*/] = offset[4/*X3*/] * m10 + offset[5/*X3*/] * m11 + y;
        vertices[6/*X4*/] = offset[6/*X4*/] * m00 + offset[7/*Y4*/] * m01 + x;
        vertices[7/*Y4*/] = offset[6/*X4*/] * m10 + offset[7/*Y4*/] * m11 + y;
    }
}

spine.AnimationStateData = function (skeletonData) {
    this.skeletonData = skeletonData;
    this.animationToMixTime = {};
};
spine.AnimationStateData.prototype = {
        defaultMix: 0,
    setMixByName: function (fromName, toName, duration) {
        var from = this.skeletonData.findAnimation(fromName);
        if (!from) throw "Animation not found: " + fromName;
        var to = this.skeletonData.findAnimation(toName);
        if (!to) throw "Animation not found: " + toName;
        this.setMix(from, to, duration);
    },
    setMix: function (from, to, duration) {
        this.animationToMixTime[from.name + ":" + to.name] = duration;
    },
    getMix: function (from, to) {
        var time = this.animationToMixTime[from.name + ":" + to.name];
            return time ? time : this.defaultMix;
    }
};

spine.AnimationState = function (stateData) {
    this.data = stateData;
    this.queue = [];
};
spine.AnimationState.prototype = {
    animationSpeed: 1,
    current: null,
    previous: null,
    currentTime: 0,
    previousTime: 0,
    currentLoop: false,
    previousLoop: false,
    mixTime: 0,
    mixDuration: 0,
    update: function (delta) {
        this.currentTime += (delta * this.animationSpeed); //timeScale: Multiply delta by the speed of animation required.
        this.previousTime += delta;
        this.mixTime += delta;

        if (this.queue.length > 0) {
            var entry = this.queue[0];
            if (this.currentTime >= entry.delay) {
                this._setAnimation(entry.animation, entry.loop);
                this.queue.shift();
            }
        }
    },
    apply: function (skeleton) {
        if (!this.current) return;
        if (this.previous) {
            this.previous.apply(skeleton, this.previousTime, this.previousLoop);
            var alpha = this.mixTime / this.mixDuration;
            if (alpha >= 1) {
                alpha = 1;
                this.previous = null;
            }
            this.current.mix(skeleton, this.currentTime, this.currentLoop, alpha);
        } else
            this.current.apply(skeleton, this.currentTime, this.currentLoop);
    },
    clearAnimation: function () {
        this.previous = null;
        this.current = null;
        this.queue.length = 0;
    },
    _setAnimation: function (animation, loop) {
        this.previous = null;
        if (animation && this.current) {
            this.mixDuration = this.data.getMix(this.current, animation);
            if (this.mixDuration > 0) {
                this.mixTime = 0;
                this.previous = this.current;
                this.previousTime = this.currentTime;
                this.previousLoop = this.currentLoop;
            }
        }
        this.current = animation;
        this.currentLoop = loop;
        this.currentTime = 0;
    },
    /** @see #setAnimation(Animation, Boolean) */
    setAnimationByName: function (animationName, loop) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        this.setAnimation(animation, loop);
    },
    /** Set the current animation. Any queued animations are cleared and the current animation time is set to 0.
     * @param animation May be null. */
    setAnimation: function (animation, loop) {
        this.queue.length = 0;
        this._setAnimation(animation, loop);
    },
    /** @see #addAnimation(Animation, Boolean, Number) */
    addAnimationByName: function (animationName, loop, delay) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        this.addAnimation(animation, loop, delay);
    },
    /** Adds an animation to be played delay seconds after the current or last queued animation.
     * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
    addAnimation: function (animation, loop, delay) {
        var entry = {};
        entry.animation = animation;
        entry.loop = loop;

        if (!delay || delay <= 0) {
            var previousAnimation = this.queue.length ? this.queue[this.queue.length - 1].animation : this.current;
            if (previousAnimation != null)
                delay = previousAnimation.duration - this.data.getMix(previousAnimation, animation) + (delay || 0);
            else
                delay = 0;
        }
        entry.delay = delay;

        this.queue.push(entry);
    },
    /** Returns true if no animation is set or if the current time is greater than the animation duration, regardless of looping. */
    isComplete: function () {
        return !this.current || this.currentTime >= this.current.duration;
    }
};

spine.SkeletonJson = function (attachmentLoader) {
    this.attachmentLoader = attachmentLoader;
};
spine.SkeletonJson.prototype = {
    scale: 1,
    readSkeletonData: function (root) {
        /*jshint -W069*/
        var skeletonData = new spine.SkeletonData(),
            boneData;

        // Bones.
        var bones = root["bones"];
        for (var i = 0, n = bones.length; i < n; i++) {
            var boneMap = bones[i];
            var parent = null;
            if (boneMap["parent"]) {
                parent = skeletonData.findBone(boneMap["parent"]);
                if (!parent) throw "Parent bone not found: " + boneMap["parent"];
            }
            boneData = new spine.BoneData(boneMap["name"], parent);
            boneData.length = (boneMap["length"] || 0) * this.scale;
            boneData.x = (boneMap["x"] || 0) * this.scale;
            boneData.y = (boneMap["y"] || 0) * this.scale;
            boneData.rotation = (boneMap["rotation"] || 0);
            boneData.scaleX = boneMap["scaleX"] || 1;
            boneData.scaleY = boneMap["scaleY"] || 1;
            skeletonData.bones.push(boneData);
        }

        // Slots.
        var slots = root["slots"];
        for (i = 0, n = slots.length; i < n; i++) {
            var slotMap = slots[i];
            boneData = skeletonData.findBone(slotMap["bone"]);
            if (!boneData) throw "Slot bone not found: " + slotMap["bone"];
            var slotData = new spine.SlotData(slotMap["name"], boneData);

            var color = slotMap["color"];
            if (color) {
                slotData.r = spine.SkeletonJson.toColor(color, 0);
                slotData.g = spine.SkeletonJson.toColor(color, 1);
                slotData.b = spine.SkeletonJson.toColor(color, 2);
                slotData.a = spine.SkeletonJson.toColor(color, 3);
            }

            slotData.attachmentName = slotMap["attachment"];

            skeletonData.slots.push(slotData);
        }

        // Skins.
        var skins = root["skins"];
        for (var skinName in skins) {
            if (!skins.hasOwnProperty(skinName)) continue;
            var skinMap = skins[skinName];
            var skin = new spine.Skin(skinName);
            for (var slotName in skinMap) {
                if (!skinMap.hasOwnProperty(slotName)) continue;
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var slotEntry = skinMap[slotName];
                for (var attachmentName in slotEntry) {
                    if (!slotEntry.hasOwnProperty(attachmentName)) continue;
                    var attachment = this.readAttachment(skin, attachmentName, slotEntry[attachmentName]);
                    if (attachment != null) skin.addAttachment(slotIndex, attachmentName, attachment);
                }
            }
            skeletonData.skins.push(skin);
            if (skin.name == "default") skeletonData.defaultSkin = skin;
        }

        // Animations.
        var animations = root["animations"];
        for (var animationName in animations) {
            if (!animations.hasOwnProperty(animationName)) continue;
            this.readAnimation(animationName, animations[animationName], skeletonData);
        }

        return skeletonData;
    },
    readAttachment: function (skin, name, map) {
        /*jshint -W069*/
        name = map["name"] || name;

        var type = spine.AttachmentType[map["type"] || "region"];

        if (type == spine.AttachmentType.region) {
            var attachment = new spine.RegionAttachment();
            attachment.x = (map["x"] || 0) * this.scale;
            attachment.y = (map["y"] || 0) * this.scale;
            attachment.scaleX = map["scaleX"] || 1;
            attachment.scaleY = map["scaleY"] || 1;
            attachment.rotation = map["rotation"] || 0;
            attachment.width = (map["width"] || 32) * this.scale;
            attachment.height = (map["height"] || 32) * this.scale;
            attachment.updateOffset();

            attachment.rendererObject = {};
            attachment.rendererObject.name = name;
            attachment.rendererObject.scale = {};
            attachment.rendererObject.scale.x = attachment.scaleX;
            attachment.rendererObject.scale.y = attachment.scaleY;
            attachment.rendererObject.rotation = -attachment.rotation * Math.PI / 180;
            return attachment;
        }

            throw "Unknown attachment type: " + type;
    },

    readAnimation: function (name, map, skeletonData) {
        /*jshint -W069*/
        var timelines = [];
        var duration = 0;
        var frameIndex, timeline, timelineName, valueMap, values,
            i, n;

        var bones = map["bones"];
        for (var boneName in bones) {
            if (!bones.hasOwnProperty(boneName)) continue;
            var boneIndex = skeletonData.findBoneIndex(boneName);
            if (boneIndex == -1) throw "Bone not found: " + boneName;
            var boneMap = bones[boneName];

            for (timelineName in boneMap) {
                if (!boneMap.hasOwnProperty(timelineName)) continue;
                values = boneMap[timelineName];
                if (timelineName == "rotate") {
                    timeline = new spine.RotateTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap["angle"]);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);

                } else if (timelineName == "translate" || timelineName == "scale") {
                    var timelineScale = 1;
                    if (timelineName == "scale")
                        timeline = new spine.ScaleTimeline(values.length);
                    else {
                        timeline = new spine.TranslateTimeline(values.length);
                        timelineScale = this.scale;
                    }
                    timeline.boneIndex = boneIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        var x = (valueMap["x"] || 0) * timelineScale;
                        var y = (valueMap["y"] || 0) * timelineScale;
                        timeline.setFrame(frameIndex, valueMap["time"], x, y);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 3 - 3]);

                } else
                    throw "Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")";
            }
        }
        var slots = map["slots"];
        for (var slotName in slots) {
            if (!slots.hasOwnProperty(slotName)) continue;
            var slotMap = slots[slotName];
            var slotIndex = skeletonData.findSlotIndex(slotName);

            for (timelineName in slotMap) {
                if (!slotMap.hasOwnProperty(timelineName)) continue;
                values = slotMap[timelineName];
                if (timelineName == "color") {
                    timeline = new spine.ColorTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        var color = valueMap["color"];
                        var r = spine.SkeletonJson.toColor(color, 0);
                        var g = spine.SkeletonJson.toColor(color, 1);
                        var b = spine.SkeletonJson.toColor(color, 2);
                        var a = spine.SkeletonJson.toColor(color, 3);
                        timeline.setFrame(frameIndex, valueMap["time"], r, g, b, a);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 5 - 5]);

                } else if (timelineName == "attachment") {
                    timeline = new spine.AttachmentTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        timeline.setFrame(frameIndex++, valueMap["time"], valueMap["name"]);
                    }
                    timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);

                } else
                    throw "Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")";
            }
        }
        skeletonData.animations.push(new spine.Animation(name, timelines, duration));
    }
};
spine.SkeletonJson.readCurve = function (timeline, frameIndex, valueMap) {
    /*jshint -W069*/
    var curve = valueMap["curve"];
    if (!curve) return;
    if (curve == "stepped")
        timeline.curves.setStepped(frameIndex);
    else if (curve instanceof Array)
        timeline.curves.setCurve(frameIndex, curve[0], curve[1], curve[2], curve[3]);
};
spine.SkeletonJson.toColor = function (hexString, colorIndex) {
    if (hexString.length != 8) throw "Color hexidecimal length must be 8, recieved: " + hexString;
    return parseInt(hexString.substr(colorIndex * 2, 2), 16) / 255;
};

spine.Atlas = function (atlasText, textureLoader) {
    this.textureLoader = textureLoader;
    this.pages = [];
    this.regions = [];

    var reader = new spine.AtlasReader(atlasText);
    var tuple = [];
    tuple.length = 4;
    var page = null;
    while (true) {
        var line = reader.readLine();
        if (line == null) break;
        line = reader.trim(line);
        if (!line.length)
            page = null;
        else if (!page) {
            page = new spine.AtlasPage();
            page.name = line;

            page.format = spine.Atlas.Format[reader.readValue()];

            reader.readTuple(tuple);
            page.minFilter = spine.Atlas.TextureFilter[tuple[0]];
            page.magFilter = spine.Atlas.TextureFilter[tuple[1]];

            var direction = reader.readValue();
            page.uWrap = spine.Atlas.TextureWrap.clampToEdge;
            page.vWrap = spine.Atlas.TextureWrap.clampToEdge;
            if (direction == "x")
                page.uWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "y")
                page.vWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "xy")
                page.uWrap = page.vWrap = spine.Atlas.TextureWrap.repeat;

            textureLoader.load(page, line);

            this.pages.push(page);

        } else {
            var region = new spine.AtlasRegion();
            region.name = line;
            region.page = page;

            region.rotate = reader.readValue() == "true";

            reader.readTuple(tuple);
            var x = parseInt(tuple[0], 10);
            var y = parseInt(tuple[1], 10);

            reader.readTuple(tuple);
            var width = parseInt(tuple[0], 10);
            var height = parseInt(tuple[1], 10);

            region.u = x / page.width;
            region.v = y / page.height;
            if (region.rotate) {
                region.u2 = (x + height) / page.width;
                region.v2 = (y + width) / page.height;
            } else {
                region.u2 = (x + width) / page.width;
                region.v2 = (y + height) / page.height;
            }
            region.x = x;
            region.y = y;
            region.width = Math.abs(width);
            region.height = Math.abs(height);

            if (reader.readTuple(tuple) == 4) { // split is optional
                region.splits = [parseInt(tuple[0], 10), parseInt(tuple[1], 10), parseInt(tuple[2], 10), parseInt(tuple[3], 10)];

                if (reader.readTuple(tuple) == 4) { // pad is optional, but only present with splits
                    region.pads = [parseInt(tuple[0], 10), parseInt(tuple[1], 10), parseInt(tuple[2], 10), parseInt(tuple[3], 10)];

                    reader.readTuple(tuple);
                }
            }

            region.originalWidth = parseInt(tuple[0], 10);
            region.originalHeight = parseInt(tuple[1], 10);

            reader.readTuple(tuple);
            region.offsetX = parseInt(tuple[0], 10);
            region.offsetY = parseInt(tuple[1], 10);

            region.index = parseInt(reader.readValue(), 10);

            this.regions.push(region);
        }
    }
};
spine.Atlas.prototype = {
    findRegion: function (name) {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
            if (regions[i].name == name) return regions[i];
        return null;
    },
    dispose: function () {
        var pages = this.pages;
        for (var i = 0, n = pages.length; i < n; i++)
            this.textureLoader.unload(pages[i].rendererObject);
    },
    updateUVs: function (page) {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++) {
            var region = regions[i];
            if (region.page != page) continue;
            region.u = region.x / page.width;
            region.v = region.y / page.height;
            if (region.rotate) {
                region.u2 = (region.x + region.height) / page.width;
                region.v2 = (region.y + region.width) / page.height;
            } else {
                region.u2 = (region.x + region.width) / page.width;
                region.v2 = (region.y + region.height) / page.height;
            }
        }
    }
};

spine.Atlas.Format = {
    alpha: 0,
    intensity: 1,
    luminanceAlpha: 2,
    rgb565: 3,
    rgba4444: 4,
    rgb888: 5,
    rgba8888: 6
};

spine.Atlas.TextureFilter = {
    nearest: 0,
    linear: 1,
    mipMap: 2,
    mipMapNearestNearest: 3,
    mipMapLinearNearest: 4,
    mipMapNearestLinear: 5,
    mipMapLinearLinear: 6
};

spine.Atlas.TextureWrap = {
    mirroredRepeat: 0,
    clampToEdge: 1,
    repeat: 2
};

spine.AtlasPage = function () {};
spine.AtlasPage.prototype = {
    name: null,
    format: null,
    minFilter: null,
    magFilter: null,
    uWrap: null,
    vWrap: null,
    rendererObject: null,
    width: 0,
    height: 0
};

spine.AtlasRegion = function () {};
spine.AtlasRegion.prototype = {
    page: null,
    name: null,
    x: 0, y: 0,
    width: 0, height: 0,
    u: 0, v: 0, u2: 0, v2: 0,
    offsetX: 0, offsetY: 0,
    originalWidth: 0, originalHeight: 0,
    index: 0,
    rotate: false,
    splits: null,
    pads: null
};

spine.AtlasReader = function (text) {
    this.lines = text.split(/\r\n|\r|\n/);
};
spine.AtlasReader.prototype = {
    index: 0,
    trim: function (value) {
        return value.replace(/^\s+|\s+$/g, "");
    },
    readLine: function () {
        if (this.index >= this.lines.length) return null;
        return this.lines[this.index++];
    },
    readValue: function () {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        return this.trim(line.substring(colon + 1));
    },
    /** Returns the number of tuple values read (2 or 4). */
    readTuple: function (tuple) {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        var i = 0, lastMatch= colon + 1;
        for (; i < 3; i++) {
            var comma = line.indexOf(",", lastMatch);
            if (comma == -1) {
                if (!i) throw "Invalid line: " + line;
                break;
            }
            tuple[i] = this.trim(line.substr(lastMatch, comma - lastMatch));
            lastMatch = comma + 1;
        }
        tuple[i] = this.trim(line.substring(lastMatch));
        return i + 1;
    }
}

spine.AtlasAttachmentLoader = function (atlas) {
    this.atlas = atlas;
}
spine.AtlasAttachmentLoader.prototype = {
    newAttachment: function (skin, type, name) {
        switch (type) {
        case spine.AttachmentType.region:
            var region = this.atlas.findRegion(name);
            if (!region) throw "Region not found in atlas: " + name + " (" + type + ")";
            var attachment = new spine.RegionAttachment(name);
            attachment.rendererObject = region;
            attachment.setUVs(region.u, region.v, region.u2, region.v2, region.rotate);
            attachment.regionOffsetX = region.offsetX;
            attachment.regionOffsetY = region.offsetY;
            attachment.regionWidth = region.width;
            attachment.regionHeight = region.height;
            attachment.regionOriginalWidth = region.originalWidth;
            attachment.regionOriginalHeight = region.originalHeight;
            return attachment;
        }
        throw "Unknown attachment type: " + type;
    }
}

spine.Bone.yDown = true;
PIXI.AnimCache = {};

/**
 * A class that enables the you to import and run your spine animations in pixi.
 * Spine animation data needs to be loaded using the PIXI.AssetLoader or PIXI.SpineLoader before it can be used by this class
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 *
 * @class Spine
 * @extends DisplayObjectContainer
 * @constructor
 * @param url {String} The url of the spine anim file to be used
 */
PIXI.Spine = function (url) {
    PIXI.DisplayObjectContainer.call(this);

    this.spineData = PIXI.AnimCache[url];

    if (!this.spineData) {
        throw new Error("Spine data must be preloaded using PIXI.SpineLoader or PIXI.AssetLoader: " + url);
    }

    this.skeleton = new spine.Skeleton(this.spineData);
    this.skeleton.updateWorldTransform();

    this.stateData = new spine.AnimationStateData(this.spineData);
    this.state = new spine.AnimationState(this.stateData);

    this.slotContainers = [];

    for (var i = 0, n = this.skeleton.drawOrder.length; i < n; i++) {
        var slot = this.skeleton.drawOrder[i];
        var attachment = slot.attachment;
        var slotContainer = new PIXI.DisplayObjectContainer();
        this.slotContainers.push(slotContainer);
        this.addChild(slotContainer);
        if (!(attachment instanceof spine.RegionAttachment)) {
            continue;
        }
        var spriteName = attachment.rendererObject.name;
        var sprite = this.createSprite(slot, attachment.rendererObject);
        slot.currentSprite = sprite;
        slot.currentSpriteName = spriteName;
        slotContainer.addChild(sprite);
    }
};

PIXI.Spine.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.Spine.prototype.constructor = PIXI.Spine;

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Spine.prototype.updateTransform = function () {
    this.lastTime = this.lastTime || Date.now();
    var timeDelta = (Date.now() - this.lastTime) * 0.001;
    this.lastTime = Date.now();
    this.state.update(timeDelta);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    var drawOrder = this.skeleton.drawOrder;
    for (var i = 0, n = drawOrder.length; i < n; i++) {
        var slot = drawOrder[i];
        var attachment = slot.attachment;
        var slotContainer = this.slotContainers[i];
        if (!(attachment instanceof spine.RegionAttachment)) {
            slotContainer.visible = false;
            continue;
        }

        if (attachment.rendererObject) {
            if (!slot.currentSpriteName || slot.currentSpriteName != attachment.name) {
                var spriteName = attachment.rendererObject.name;
                if (slot.currentSprite !== undefined) {
                    slot.currentSprite.visible = false;
                }
                slot.sprites = slot.sprites || {};
                if (slot.sprites[spriteName] !== undefined) {
                    slot.sprites[spriteName].visible = true;
                } else {
                    var sprite = this.createSprite(slot, attachment.rendererObject);
                    slotContainer.addChild(sprite);
                }
                slot.currentSprite = slot.sprites[spriteName];
                slot.currentSpriteName = spriteName;
            }
        }
        slotContainer.visible = true;

        var bone = slot.bone;

        slotContainer.position.x = bone.worldX + attachment.x * bone.m00 + attachment.y * bone.m01;
        slotContainer.position.y = bone.worldY + attachment.x * bone.m10 + attachment.y * bone.m11;
        slotContainer.scale.x = bone.worldScaleX;
        slotContainer.scale.y = bone.worldScaleY;

        slotContainer.rotation = -(slot.bone.worldRotation * Math.PI / 180);

        slotContainer.alpha = slot.a;
        slot.currentSprite.tint = PIXI.rgb2hex([slot.r,slot.g,slot.b]);
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call(this);
};


PIXI.Spine.prototype.createSprite = function (slot, descriptor) {
    var name = PIXI.TextureCache[descriptor.name] ? descriptor.name : descriptor.name + ".png";
    var sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(name));
    sprite.scale = descriptor.scale;
    sprite.rotation = descriptor.rotation;
    sprite.anchor.x = sprite.anchor.y = 0.5;

    slot.sprites = slot.sprites || {};
    slot.sprites[descriptor.name] = sprite;
    return sprite;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BaseTextureCache = {};
PIXI.texturesToUpdate = [];
PIXI.texturesToDestroy = [];

PIXI.BaseTextureCacheIdGenerator = 0;

/**
 * A texture stores the information that represents an image. All textures have a base texture
 *
 * @class BaseTexture
 * @uses EventTarget
 * @constructor
 * @param source {String} the source object (image or canvas)
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 */
PIXI.BaseTexture = function(source, scaleMode)
{
    PIXI.EventTarget.call( this );

    /**
     * [read-only] The width of the base texture set when the image has loaded
     *
     * @property width
     * @type Number
     * @readOnly
     */
    this.width = 100;

    /**
     * [read-only] The height of the base texture set when the image has loaded
     *
     * @property height
     * @type Number
     * @readOnly
     */
    this.height = 100;

    /**
     * The scale mode to apply when scaling this texture
     * @property scaleMode
     * @type PIXI.scaleModes
     * @default PIXI.scaleModes.LINEAR
     */
    this.scaleMode = scaleMode || PIXI.scaleModes.DEFAULT;

    /**
     * [read-only] Describes if the base texture has loaded or not
     *
     * @property hasLoaded
     * @type Boolean
     * @readOnly
     */
    this.hasLoaded = false;

    /**
     * The source that is loaded to create the texture
     *
     * @property source
     * @type Image
     */
    this.source = source;

    //TODO will be used for futer pixi 1.5...
    this.id = PIXI.BaseTextureCacheIdGenerator++;

    /**
     * Controls if RGB channels should be premultiplied by Alpha  (WebGL only)
     *
     * @property
     * @type Boolean
     * @default TRUE
    */
    this.premultipliedAlpha = true;

    // used for webGL
    this._glTextures = [];
    
    // used for webGL teture updateing...
    this._dirty = [];
    
    if(!source)return;

    if((this.source.complete || this.source.getContext) && this.source.width && this.source.height)
    {
        this.hasLoaded = true;
        this.width = this.source.width;
        this.height = this.source.height;

        PIXI.texturesToUpdate.push(this);
    }
    else
    {

        var scope = this;
        this.source.onload = function() {

            scope.hasLoaded = true;
            scope.width = scope.source.width;
            scope.height = scope.source.height;

            for (var i = 0; i < scope._glTextures.length; i++)
            {
                scope._dirty[i] = true;
            }

            // add it to somewhere...
            scope.dispatchEvent( { type: 'loaded', content: scope } );
        };
        this.source.onerror = function() {
            scope.dispatchEvent( { type: 'error', content: scope } );
        };
    }

    this.imageUrl = null;
    this._powerOf2 = false;

    

};

PIXI.BaseTexture.prototype.constructor = PIXI.BaseTexture;

/**
 * Destroys this base texture
 *
 * @method destroy
 */
PIXI.BaseTexture.prototype.destroy = function()
{
    if(this.imageUrl)
    {
        delete PIXI.BaseTextureCache[this.imageUrl];
        delete PIXI.TextureCache[this.imageUrl];
        this.imageUrl = null;
        this.source.src = null;
    }
    else if (this.source && this.source._pixiId)
    {
        delete PIXI.BaseTextureCache[this.source._pixiId];
    }
    this.source = null;
    PIXI.texturesToDestroy.push(this);
};

/**
 * Changes the source image of the texture
 *
 * @method updateSourceImage
 * @param newSrc {String} the path of the image
 */
PIXI.BaseTexture.prototype.updateSourceImage = function(newSrc)
{
    this.hasLoaded = false;
    this.source.src = null;
    this.source.src = newSrc;
};

/**
 * Helper function that returns a base texture based on an image url
 * If the image is not in the base texture cache it will be created and loaded
 *
 * @static
 * @method fromImage
 * @param imageUrl {String} The image url of the texture
 * @param crossorigin {Boolean} 
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return BaseTexture
 */
PIXI.BaseTexture.fromImage = function(imageUrl, crossorigin, scaleMode)
{
    var baseTexture = PIXI.BaseTextureCache[imageUrl];
    
    if(crossorigin === undefined && imageUrl.indexOf('data:') === -1) crossorigin = true;

    if(!baseTexture)
    {
        // new Image() breaks tex loading in some versions of Chrome.
        // See https://code.google.com/p/chromium/issues/detail?id=238071
        var image = new Image();//document.createElement('img');
        if (crossorigin)
        {
            image.crossOrigin = '';
        }
        image.src = imageUrl;
        baseTexture = new PIXI.BaseTexture(image, scaleMode);
        baseTexture.imageUrl = imageUrl;
        PIXI.BaseTextureCache[imageUrl] = baseTexture;
    }

    return baseTexture;
};

/**
 * Helper function that returns a base texture based on a canvas element
 * If the image is not in the base texture cache it will be created and loaded
 *
 * @static
 * @method fromCanvas
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return BaseTexture
 */
PIXI.BaseTexture.fromCanvas = function(canvas, scaleMode)
{
    if(!canvas._pixiId)
    {
        canvas._pixiId = 'canvas_' + PIXI.TextureCacheIdGenerator++;
    }

    var baseTexture = PIXI.BaseTextureCache[canvas._pixiId];

    if(!baseTexture)
    {
        baseTexture = new PIXI.BaseTexture(canvas, scaleMode);
        PIXI.BaseTextureCache[canvas._pixiId] = baseTexture;
    }

    return baseTexture;
};



/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.TextureCache = {};
PIXI.FrameCache = {};

PIXI.TextureCacheIdGenerator = 0;

/**
 * A texture stores the information that represents an image or part of an image. It cannot be added
 * to the display list directly. To do this use PIXI.Sprite. If no frame is provided then the whole image is used
 *
 * @class Texture
 * @uses EventTarget
 * @constructor
 * @param baseTexture {BaseTexture} The base texture source to create the texture from
 * @param frame {Rectangle} The rectangle frame of the texture to show
 */
PIXI.Texture = function(baseTexture, frame)
{
    PIXI.EventTarget.call( this );

    /**
     * Does this Texture have any frame data assigned to it?
     *
     * @property noFrame
     * @type Boolean
     */
    this.noFrame = false;

    if (!frame)
    {
        this.noFrame = true;
        frame = new PIXI.Rectangle(0,0,1,1);
    }

    if (baseTexture instanceof PIXI.Texture)
    {
        baseTexture = baseTexture.baseTexture;
    }

    /**
     * The base texture that this texture uses.
     *
     * @property baseTexture
     * @type BaseTexture
     */
    this.baseTexture = baseTexture;

    /**
     * The frame specifies the region of the base texture that this texture uses
     *
     * @property frame
     * @type Rectangle
     */
    this.frame = frame;

    /**
     * The trim point
     *
     * @property trim
     * @type Rectangle
     */
    this.trim = null;
    
    /**
     * This will let the renderer know if the texture is valid. If its not then it cannot be rendered.
     *
     * @property valid
     * @type Boolean
     */
    this.valid = false;

    /**
     * The context scope under which events are run.
     *
     * @property scope
     * @type Object
     */
    this.scope = this;

    /**
     * The WebGL UV data cache.
     *
     * @private
     * @property _uvs
     * @type Object
     */
    this._uvs = null;
    
    /**
     * The width of the Texture in pixels.
     *
     * @property width
     * @type Number
     */
    this.width = 0;

    /**
     * The height of the Texture in pixels.
     *
     * @property height
     * @type Number
     */
    this.height = 0;

    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     *
     * @property crop
     * @type Rectangle
     */
    this.crop = new PIXI.Rectangle(0, 0, 1, 1);

    if (baseTexture.hasLoaded)
    {
        if (this.noFrame) frame = new PIXI.Rectangle(0, 0, baseTexture.width, baseTexture.height);
        this.setFrame(frame);
    }
    else
    {
        var scope = this;
        baseTexture.addEventListener('loaded', function(){ scope.onBaseTextureLoaded(); });
    }
};

PIXI.Texture.prototype.constructor = PIXI.Texture;

/**
 * Called when the base texture is loaded
 *
 * @method onBaseTextureLoaded
 * @param event
 * @private
 */
PIXI.Texture.prototype.onBaseTextureLoaded = function()
{
    var baseTexture = this.baseTexture;
    baseTexture.removeEventListener('loaded', this.onLoaded);

    if (this.noFrame) this.frame = new PIXI.Rectangle(0, 0, baseTexture.width, baseTexture.height);
    
    this.setFrame(this.frame);

    this.scope.dispatchEvent( { type: 'update', content: this } );
};

/**
 * Destroys this texture
 *
 * @method destroy
 * @param destroyBase {Boolean} Whether to destroy the base texture as well
 */
PIXI.Texture.prototype.destroy = function(destroyBase)
{
    if (destroyBase) this.baseTexture.destroy();

    this.valid = false;
};

/**
 * Specifies the region of the baseTexture that this texture will use.
 *
 * @method setFrame
 * @param frame {Rectangle} The frame of the texture to set it to
 */
PIXI.Texture.prototype.setFrame = function(frame)
{
    this.noFrame = false;

    this.frame = frame;
    this.width = frame.width;
    this.height = frame.height;

    this.crop.x = frame.x;
    this.crop.y = frame.y;
    this.crop.width = frame.width;
    this.crop.height = frame.height;

    if (!this.trim && (frame.x + frame.width > this.baseTexture.width || frame.y + frame.height > this.baseTexture.height))
    {
        throw new Error('Texture Error: frame does not fit inside the base Texture dimensions ' + this);
    }

    this.valid = frame && frame.width && frame.height && this.baseTexture.source && this.baseTexture.hasLoaded;

    if (this.trim)
    {
        this.width = this.trim.width;
        this.height = this.trim.height;
        this.frame.width = this.trim.width;
        this.frame.height = this.trim.height;
    }

    if (this.valid) PIXI.Texture.frameUpdates.push(this);

};

/**
 * Updates the internal WebGL UV cache.
 *
 * @method _updateWebGLuvs
 * @private
 */
PIXI.Texture.prototype._updateWebGLuvs = function()
{
    if(!this._uvs)this._uvs = new PIXI.TextureUvs();

    var frame = this.crop;
    var tw = this.baseTexture.width;
    var th = this.baseTexture.height;

    this._uvs.x0 = frame.x / tw;
    this._uvs.y0 = frame.y / th;

    this._uvs.x1 = (frame.x + frame.width) / tw;
    this._uvs.y1 = frame.y / th;

    this._uvs.x2 = (frame.x + frame.width) / tw;
    this._uvs.y2 = (frame.y + frame.height) / th;

    this._uvs.x3 = frame.x / tw;
    this._uvs.y3 = (frame.y + frame.height) / th;

};

/**
 * Helper function that returns a texture based on an image url
 * If the image is not in the texture cache it will be  created and loaded
 *
 * @static
 * @method fromImage
 * @param imageUrl {String} The image url of the texture
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return Texture
 */
PIXI.Texture.fromImage = function(imageUrl, crossorigin, scaleMode)
{
    var texture = PIXI.TextureCache[imageUrl];

    if(!texture)
    {
        texture = new PIXI.Texture(PIXI.BaseTexture.fromImage(imageUrl, crossorigin, scaleMode));
        PIXI.TextureCache[imageUrl] = texture;
    }

    return texture;
};

/**
 * Helper function that returns a texture based on a frame id
 * If the frame id is not in the texture cache an error will be thrown
 *
 * @static
 * @method fromFrame
 * @param frameId {String} The frame id of the texture
 * @return Texture
 */
PIXI.Texture.fromFrame = function(frameId)
{
    var texture = PIXI.TextureCache[frameId];
    if(!texture) throw new Error('The frameId "' + frameId + '" does not exist in the texture cache ');
    return texture;
};

/**
 * Helper function that returns a texture based on a canvas element
 * If the canvas is not in the texture cache it will be  created and loaded
 *
 * @static
 * @method fromCanvas
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return Texture
 */
PIXI.Texture.fromCanvas = function(canvas, scaleMode)
{
    var baseTexture = PIXI.BaseTexture.fromCanvas(canvas, scaleMode);

    return new PIXI.Texture( baseTexture );

};


/**
 * Adds a texture to the textureCache.
 *
 * @static
 * @method addTextureToCache
 * @param texture {Texture}
 * @param id {String} the id that the texture will be stored against.
 */
PIXI.Texture.addTextureToCache = function(texture, id)
{
    PIXI.TextureCache[id] = texture;
};

/**
 * Remove a texture from the textureCache.
 *
 * @static
 * @method removeTextureFromCache
 * @param id {String} the id of the texture to be removed
 * @return {Texture} the texture that was removed
 */
PIXI.Texture.removeTextureFromCache = function(id)
{
    var texture = PIXI.TextureCache[id];
    delete PIXI.TextureCache[id];
    delete PIXI.BaseTextureCache[id];
    return texture;
};

// this is more for webGL.. it contains updated frames..
PIXI.Texture.frameUpdates = [];

PIXI.TextureUvs = function()
{
    this.x0 = 0;
    this.y0 = 0;

    this.x1 = 0;
    this.y1 = 0;

    this.x2 = 0;
    this.y2 = 0;

    this.x3 = 0;
    this.y3 = 0;


};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 A RenderTexture is a special texture that allows any pixi displayObject to be rendered to it.

 __Hint__: All DisplayObjects (exmpl. Sprites) that render on RenderTexture should be preloaded.
 Otherwise black rectangles will be drawn instead.

 RenderTexture takes snapshot of DisplayObject passed to render method. If DisplayObject is passed to render method, position and rotation of it will be ignored. For example:

    var renderTexture = new PIXI.RenderTexture(800, 600);
    var sprite = PIXI.Sprite.fromImage("spinObj_01.png");
    sprite.position.x = 800/2;
    sprite.position.y = 600/2;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    renderTexture.render(sprite);

 Sprite in this case will be rendered to 0,0 position. To render this sprite at center DisplayObjectContainer should be used:

    var doc = new PIXI.DisplayObjectContainer();
    doc.addChild(sprite);
    renderTexture.render(doc);  // Renders to center of renderTexture

 * @class RenderTexture
 * @extends Texture
 * @constructor
 * @param width {Number} The width of the render texture
 * @param height {Number} The height of the render texture
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 */
PIXI.RenderTexture = function(width, height, renderer, scaleMode)
{
    PIXI.EventTarget.call( this );

    /**
     * The with of the render texture
     *
     * @property width
     * @type Number
     */
    this.width = width || 100;
    /**
     * The height of the render texture
     *
     * @property height
     * @type Number
     */
    this.height = height || 100;

    /**
     * The framing rectangle of the render texture
     *
     * @property frame
     * @type Rectangle
     */
    this.frame = new PIXI.Rectangle(0, 0, this.width, this.height);

    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     *
     * @property crop
     * @type Rectangle
     */
    this.crop = new PIXI.Rectangle(0, 0, this.width, this.height);
    
    /**
     * The base texture object that this texture uses
     *
     * @property baseTexture
     * @type BaseTexture
     */
    this.baseTexture = new PIXI.BaseTexture();
    this.baseTexture.width = this.width;
    this.baseTexture.height = this.height;
    this.baseTexture._glTextures = [];

    this.baseTexture.scaleMode = scaleMode || PIXI.scaleModes.DEFAULT;

    this.baseTexture.hasLoaded = true;

    // each render texture can only belong to one renderer at the moment if its webGL
    this.renderer = renderer || PIXI.defaultRenderer;

    if(this.renderer.type === PIXI.WEBGL_RENDERER)
    {
        var gl = this.renderer.gl;

        this.textureBuffer = new PIXI.FilterTexture(gl, this.width, this.height, this.baseTexture.scaleMode);
        this.baseTexture._glTextures[gl.id] =  this.textureBuffer.texture;

        this.render = this.renderWebGL;
        this.projection = new PIXI.Point(this.width/2 , -this.height/2);
    }
    else
    {
        this.render = this.renderCanvas;
        this.textureBuffer = new PIXI.CanvasBuffer(this.width, this.height);
        this.baseTexture.source = this.textureBuffer.canvas;
    }

    this.valid = true;
    PIXI.Texture.frameUpdates.push(this);


};

PIXI.RenderTexture.prototype = Object.create(PIXI.Texture.prototype);
PIXI.RenderTexture.prototype.constructor = PIXI.RenderTexture;

/**
 * Resize the RenderTexture.
 *
 * @method resize
 * @param width {Number} The width to resize to.
 * @param height {Number} The height to resize to.
 * @param updateBase {Boolean} Should the baseTexture.width and height values be resized as well?
 */
PIXI.RenderTexture.prototype.resize = function(width, height, updateBase)
{
    if (width === this.width && height === this.height)
    {
        return;
    }

    this.width = this.frame.width = this.crop.width = width;
    this.height =  this.frame.height = this.crop.height = height;

    if (updateBase)
    {
        this.baseTexture.width = this.width;
        this.baseTexture.height = this.height;
    }

    if (this.renderer.type === PIXI.WEBGL_RENDERER)
    {
        this.projection.x = this.width / 2;
        this.projection.y = -this.height / 2;
    }
    
    this.textureBuffer.resize(this.width, this.height);
};

/**
 * Clears the RenderTexture.
 *
 * @method clear
 */
PIXI.RenderTexture.prototype.clear = function()
{
    if (this.renderer.type === PIXI.WEBGL_RENDERER)
    {
        this.renderer.gl.bindFramebuffer(this.renderer.gl.FRAMEBUFFER, this.textureBuffer.frameBuffer);
    }
    
    this.textureBuffer.clear();
};

/**
 * This function will draw the display object to the texture.
 *
 * @method renderWebGL
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param clear {Boolean} If true the texture will be cleared before the displayObject is drawn
 * @private
 */
PIXI.RenderTexture.prototype.renderWebGL = function(displayObject, position, clear)
{
    //TOOD replace position with matrix..
    var gl = this.renderer.gl;

    gl.colorMask(true, true, true, true);

    gl.viewport(0, 0, this.width, this.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureBuffer.frameBuffer );

    if(clear)this.textureBuffer.clear();


    // THIS WILL MESS WITH HIT TESTING!
    var children = displayObject.children;

    //TODO -? create a new one??? dont think so!
    var originalWorldTransform = displayObject.worldTransform;
    displayObject.worldTransform = PIXI.RenderTexture.tempMatrix;
    // modify to flip...
    displayObject.worldTransform.d = -1;
    displayObject.worldTransform.ty = this.projection.y * -2;

    if(position)
    {
        displayObject.worldTransform.tx = position.x;
        displayObject.worldTransform.ty -= position.y;
    }

    for(var i=0,j=children.length; i<j; i++)
    {
        children[i].updateTransform();
    }

    // update the textures!
    PIXI.WebGLRenderer.updateTextures();

    this.renderer.spriteBatch.dirty = true;
    
    this.renderer.renderDisplayObject(displayObject, this.projection, this.textureBuffer.frameBuffer);

    displayObject.worldTransform = originalWorldTransform;

    this.renderer.spriteBatch.dirty = true;
};


/**
 * This function will draw the display object to the texture.
 *
 * @method renderCanvas
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param clear {Boolean} If true the texture will be cleared before the displayObject is drawn
 * @private
 */
PIXI.RenderTexture.prototype.renderCanvas = function(displayObject, position, clear)
{
    var children = displayObject.children;

    var originalWorldTransform = displayObject.worldTransform;

    displayObject.worldTransform = PIXI.RenderTexture.tempMatrix;
    
    if(position)
    {
        displayObject.worldTransform.tx = position.x;
        displayObject.worldTransform.ty = position.y;
    }
    else
    {
        displayObject.worldTransform.tx = 0;
        displayObject.worldTransform.ty = 0;
    }

    for(var i = 0, j = children.length; i < j; i++)
    {
        children[i].updateTransform();
    }

    if(clear)this.textureBuffer.clear();

    var context = this.textureBuffer.context;

    this.renderer.renderDisplayObject(displayObject, context);

    context.setTransform(1,0,0,1,0,0);

    displayObject.worldTransform = originalWorldTransform;
};

PIXI.RenderTexture.tempMatrix = new PIXI.Matrix();


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Class that loads a bunch of images / sprite sheet / bitmap font files. Once the
 * assets have been loaded they are added to the PIXI Texture cache and can be accessed
 * easily through PIXI.Texture.fromImage() and PIXI.Sprite.fromImage()
 * When all items have been loaded this class will dispatch a 'onLoaded' event
 * As each individual item is loaded this class will dispatch a 'onProgress' event
 *
 * @class AssetLoader
 * @constructor
 * @uses EventTarget
 * @param {Array<String>} assetURLs an array of image/sprite sheet urls that you would like loaded
 *      supported. Supported image formats include 'jpeg', 'jpg', 'png', 'gif'. Supported
 *      sprite sheet data formats only include 'JSON' at this time. Supported bitmap font
 *      data formats include 'xml' and 'fnt'.
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.AssetLoader = function(assetURLs, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The array of asset URLs that are going to be loaded
     *
     * @property assetURLs
     * @type Array<String>
     */
    this.assetURLs = assetURLs;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * Maps file extension to loader types
     *
     * @property loadersByType
     * @type Object
     */
    this.loadersByType = {
        'jpg':  PIXI.ImageLoader,
        'jpeg': PIXI.ImageLoader,
        'png':  PIXI.ImageLoader,
        'gif':  PIXI.ImageLoader,
        'webp': PIXI.ImageLoader,
        'json': PIXI.JsonLoader,
        'atlas': PIXI.AtlasLoader,
        'anim': PIXI.SpineLoader,
        'xml':  PIXI.BitmapFontLoader,
        'fnt':  PIXI.BitmapFontLoader
    };
};

/**
 * Fired when an item has loaded
 * @event onProgress
 */

/**
 * Fired when all the assets have loaded
 * @event onComplete
 */

// constructor
PIXI.AssetLoader.prototype.constructor = PIXI.AssetLoader;

/**
 * Given a filename, returns its extension, wil
 *
 * @method _getDataType
 * @param str {String} the name of the asset
 */
PIXI.AssetLoader.prototype._getDataType = function(str)
{
    var test = 'data:';
    //starts with 'data:'
    var start = str.slice(0, test.length).toLowerCase();
    if (start === test) {
        var data = str.slice(test.length);

        var sepIdx = data.indexOf(',');
        if (sepIdx === -1) //malformed data URI scheme
            return null;

        //e.g. 'image/gif;base64' => 'image/gif'
        var info = data.slice(0, sepIdx).split(';')[0];

        //We might need to handle some special cases here...
        //standardize text/plain to 'txt' file extension
        if (!info || info.toLowerCase() === 'text/plain')
            return 'txt';

        //User specified mime type, try splitting it by '/'
        return info.split('/').pop().toLowerCase();
    }

    return null;
};

/**
 * Starts loading the assets sequentially
 *
 * @method load
 */
PIXI.AssetLoader.prototype.load = function()
{
    var scope = this;

    function onLoad(evt) {
        scope.onAssetLoaded(evt.content);
    }

    this.loadCount = this.assetURLs.length;

    for (var i=0; i < this.assetURLs.length; i++)
    {
        var fileName = this.assetURLs[i];
        //first see if we have a data URI scheme..
        var fileType = this._getDataType(fileName);

        //if not, assume it's a file URI
        if (!fileType)
            fileType = fileName.split('?').shift().split('.').pop().toLowerCase();

        var Constructor = this.loadersByType[fileType];
        if(!Constructor)
            throw new Error(fileType + ' is an unsupported file type');

        var loader = new Constructor(fileName, this.crossorigin);

        loader.addEventListener('loaded', onLoad);
        loader.load();
    }
};

/**
 * Invoked after each file is loaded
 *
 * @method onAssetLoaded
 * @private
 */
PIXI.AssetLoader.prototype.onAssetLoaded = function(loader)
{
    this.loadCount--;
    this.dispatchEvent({ type: 'onProgress', content: this, loader: loader });
    if (this.onProgress) this.onProgress(loader);

    if (!this.loadCount)
    {
        this.dispatchEvent({type: 'onComplete', content: this});
        if(this.onComplete) this.onComplete();
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The json file loader is used to load in JSON data and parse it
 * When loaded this class will dispatch a 'loaded' event
 * If loading fails this class will dispatch an 'error' event
 *
 * @class JsonLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.JsonLoader = function (url, crossorigin) {
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * [read-only] Whether the data has loaded yet
     *
     * @property loaded
     * @type Boolean
     * @readOnly
     */
    this.loaded = false;

};

// constructor
PIXI.JsonLoader.prototype.constructor = PIXI.JsonLoader;

/**
 * Loads the JSON data
 *
 * @method load
 */
PIXI.JsonLoader.prototype.load = function () {

    var scope = this;

    if(window.XDomainRequest && scope.crossorigin)
    {
        this.ajaxRequest = new window.XDomainRequest();

        // XDomainRequest has a few querks. Occasionally it will abort requests
        // A way to avoid this is to make sure ALL callbacks are set even if not used
        // More info here: http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
        this.ajaxRequest.timeout = 3000;

        this.ajaxRequest.onerror = function () {
            scope.onError();
        };
           
        this.ajaxRequest.ontimeout = function () {
            scope.onError();
        };

        this.ajaxRequest.onprogress = function() {};

    }
    else if (window.XMLHttpRequest)
    {
        this.ajaxRequest = new window.XMLHttpRequest();
    }
    else
    {
        this.ajaxRequest = new window.ActiveXObject('Microsoft.XMLHTTP');
    }

    

    this.ajaxRequest.onload = function(){

        scope.onJSONLoaded();
    };

    this.ajaxRequest.open('GET',this.url,true);

    this.ajaxRequest.send();
};

/**
 * Invoke when JSON file is loaded
 *
 * @method onJSONLoaded
 * @private
 */
PIXI.JsonLoader.prototype.onJSONLoaded = function () {
    
    if(!this.ajaxRequest.responseText )
    {
        this.onError();
        return;
    }
   
    this.json = JSON.parse(this.ajaxRequest.responseText);

    if(this.json.frames)
    {
        // sprite sheet
        var scope = this;
        var textureUrl = this.baseUrl + this.json.meta.image;
        var image = new PIXI.ImageLoader(textureUrl, this.crossorigin);
        var frameData = this.json.frames;

        this.texture = image.texture.baseTexture;
        image.addEventListener('loaded', function() {
            scope.onLoaded();
        });

        for (var i in frameData)
        {
            var rect = frameData[i].frame;

            if (rect)
            {
                PIXI.TextureCache[i] = new PIXI.Texture(this.texture, {
                    x: rect.x,
                    y: rect.y,
                    width: rect.w,
                    height: rect.h
                });

                PIXI.TextureCache[i].crop = new PIXI.Rectangle(rect.x, rect.y, rect.w, rect.h);

                //  Check to see if the sprite is trimmed
                if (frameData[i].trimmed)
                {
                    var actualSize = frameData[i].sourceSize;
                    var realSize = frameData[i].spriteSourceSize;
                    PIXI.TextureCache[i].trim = new PIXI.Rectangle(realSize.x, realSize.y, actualSize.w, actualSize.h);
                }
            }
        }

        image.load();

    }
    else if(this.json.bones)
    {
        // spine animation
        var spineJsonParser = new spine.SkeletonJson();
        var skeletonData = spineJsonParser.readSkeletonData(this.json);
        PIXI.AnimCache[this.url] = skeletonData;
        this.onLoaded();
    }
    else
    {
        this.onLoaded();
    }
};

/**
 * Invoke when json file loaded
 *
 * @method onLoaded
 * @private
 */
PIXI.JsonLoader.prototype.onLoaded = function () {
    this.loaded = true;
    this.dispatchEvent({
        type: 'loaded',
        content: this
    });
};

/**
 * Invoke when error occured
 *
 * @method onError
 * @private
 */
PIXI.JsonLoader.prototype.onError = function () {

    this.dispatchEvent({
        type: 'error',
        content: this
    });
};

/**
 * @author Martin Kelm http://mkelm.github.com
 */

/**
 * The atlas file loader is used to load in Atlas data and parse it
 * When loaded this class will dispatch a 'loaded' event
 * If loading fails this class will dispatch an 'error' event
 * @class AtlasLoader
 * @extends EventTarget
 * @constructor
 * @param {String} url the url of the JSON file
 * @param {Boolean} crossorigin
 */

PIXI.AtlasLoader = function (url, crossorigin) {
    PIXI.EventTarget.call(this);
    this.url = url;
    this.baseUrl = url.replace(/[^\/]*$/, '');
    this.crossorigin = crossorigin;
    this.loaded = false;

};

// constructor
PIXI.AtlasLoader.constructor = PIXI.AtlasLoader;


 /**
 * Starts loading the JSON file
 *
 * @method load
 */
PIXI.AtlasLoader.prototype.load = function () {
    this.ajaxRequest = new PIXI.AjaxRequest();
    this.ajaxRequest.onreadystatechange = this.onAtlasLoaded.bind(this);

    this.ajaxRequest.open('GET', this.url, true);
    if (this.ajaxRequest.overrideMimeType) this.ajaxRequest.overrideMimeType('application/json');
    this.ajaxRequest.send(null);
};

/**
 * Invoke when JSON file is loaded
 * @method onAtlasLoaded
 * @private
 */
PIXI.AtlasLoader.prototype.onAtlasLoaded = function () {
    if (this.ajaxRequest.readyState === 4) {
        if (this.ajaxRequest.status === 200 || window.location.href.indexOf('http') === -1) {
            this.atlas = {
                meta : {
                    image : []
                },
                frames : []
            };
            var result = this.ajaxRequest.responseText.split(/\r?\n/);
            var lineCount = -3;

            var currentImageId = 0;
            var currentFrame = null;
            var nameInNextLine = false;

            var i = 0,
                j = 0,
                selfOnLoaded = this.onLoaded.bind(this);

            // parser without rotation support yet!
            for (i = 0; i < result.length; i++) {
                result[i] = result[i].replace(/^\s+|\s+$/g, '');
                if (result[i] === '') {
                    nameInNextLine = i+1;
                }
                if (result[i].length > 0) {
                    if (nameInNextLine === i) {
                        this.atlas.meta.image.push(result[i]);
                        currentImageId = this.atlas.meta.image.length - 1;
                        this.atlas.frames.push({});
                        lineCount = -3;
                    } else if (lineCount > 0) {
                        if (lineCount % 7 === 1) { // frame name
                            if (currentFrame != null) { //jshint ignore:line
                                this.atlas.frames[currentImageId][currentFrame.name] = currentFrame;
                            }
                            currentFrame = { name: result[i], frame : {} };
                        } else {
                            var text = result[i].split(' ');
                            if (lineCount % 7 === 3) { // position
                                currentFrame.frame.x = Number(text[1].replace(',', ''));
                                currentFrame.frame.y = Number(text[2]);
                            } else if (lineCount % 7 === 4) { // size
                                currentFrame.frame.w = Number(text[1].replace(',', ''));
                                currentFrame.frame.h = Number(text[2]);
                            } else if (lineCount % 7 === 5) { // real size
                                var realSize = {
                                    x : 0,
                                    y : 0,
                                    w : Number(text[1].replace(',', '')),
                                    h : Number(text[2])
                                };

                                if (realSize.w > currentFrame.frame.w || realSize.h > currentFrame.frame.h) {
                                    currentFrame.trimmed = true;
                                    currentFrame.realSize = realSize;
                                } else {
                                    currentFrame.trimmed = false;
                                }
                            }
                        }
                    }
                    lineCount++;
                }
            }

            if (currentFrame != null) { //jshint ignore:line
                this.atlas.frames[currentImageId][currentFrame.name] = currentFrame;
            }

            if (this.atlas.meta.image.length > 0) {
                this.images = [];
                for (j = 0; j < this.atlas.meta.image.length; j++) {
                    // sprite sheet
                    var textureUrl = this.baseUrl + this.atlas.meta.image[j];
                    var frameData = this.atlas.frames[j];
                    this.images.push(new PIXI.ImageLoader(textureUrl, this.crossorigin));

                    for (i in frameData) {
                        var rect = frameData[i].frame;
                        if (rect) {
                            PIXI.TextureCache[i] = new PIXI.Texture(this.images[j].texture.baseTexture, {
                                x: rect.x,
                                y: rect.y,
                                width: rect.w,
                                height: rect.h
                            });
                            if (frameData[i].trimmed) {
                                PIXI.TextureCache[i].realSize = frameData[i].realSize;
                                // trim in pixi not supported yet, todo update trim properties if it is done ...
                                PIXI.TextureCache[i].trim.x = 0;
                                PIXI.TextureCache[i].trim.y = 0;
                            }
                        }
                    }
                }

                this.currentImageId = 0;
                for (j = 0; j < this.images.length; j++) {
                    this.images[j].addEventListener('loaded', selfOnLoaded);
                }
                this.images[this.currentImageId].load();

            } else {
                this.onLoaded();
            }

        } else {
            this.onError();
        }
    }
};

/**
 * Invoke when json file has loaded
 * @method onLoaded
 * @private
 */
PIXI.AtlasLoader.prototype.onLoaded = function () {
    if (this.images.length - 1 > this.currentImageId) {
        this.currentImageId++;
        this.images[this.currentImageId].load();
    } else {
        this.loaded = true;
        this.dispatchEvent({
            type: 'loaded',
            content: this
        });
    }
};

/**
 * Invoke when error occured
 * @method onError
 * @private
 */
PIXI.AtlasLoader.prototype.onError = function () {
    this.dispatchEvent({
        type: 'error',
        content: this
    });
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The sprite sheet loader is used to load in JSON sprite sheet data
 * To generate the data you can use http://www.codeandweb.com/texturepacker and publish in the 'JSON' format
 * There is a free version so thats nice, although the paid version is great value for money.
 * It is highly recommended to use Sprite sheets (also know as a 'texture atlas') as it means sprites can be batched and drawn together for highly increased rendering speed.
 * Once the data has been loaded the frames are stored in the PIXI texture cache and can be accessed though PIXI.Texture.fromFrameId() and PIXI.Sprite.fromFrameId()
 * This loader will load the image file that the Spritesheet points to as well as the data.
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class SpriteSheetLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the sprite sheet JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.SpriteSheetLoader = function (url, crossorigin) {
    /*
     * i use texture packer to load the assets..
     * http://www.codeandweb.com/texturepacker
     * make sure to set the format as 'JSON'
     */
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * The texture being loaded
     *
     * @property texture
     * @type Texture
     */
    this.texture = null;

    /**
     * The frames of the sprite sheet
     *
     * @property frames
     * @type Object
     */
    this.frames = {};
};

// constructor
PIXI.SpriteSheetLoader.prototype.constructor = PIXI.SpriteSheetLoader;

/**
 * This will begin loading the JSON file
 *
 * @method load
 */
PIXI.SpriteSheetLoader.prototype.load = function () {
    var scope = this;
    var jsonLoader = new PIXI.JsonLoader(this.url, this.crossorigin);
    jsonLoader.addEventListener('loaded', function (event) {
        scope.json = event.content.json;
        scope.onLoaded();
    });
    jsonLoader.load();
};

/**
 * Invoke when all files are loaded (json and texture)
 *
 * @method onLoaded
 * @private
 */
PIXI.SpriteSheetLoader.prototype.onLoaded = function () {
    this.dispatchEvent({
        type: 'loaded',
        content: this
    });
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The image loader class is responsible for loading images file formats ('jpeg', 'jpg', 'png' and 'gif')
 * Once the image has been loaded it is stored in the PIXI texture cache and can be accessed though PIXI.Texture.fromFrameId() and PIXI.Sprite.fromFrameId()
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class ImageLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the image
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.ImageLoader = function(url, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The texture being loaded
     *
     * @property texture
     * @type Texture
     */
    this.texture = PIXI.Texture.fromImage(url, crossorigin);

    /**
     * if the image is loaded with loadFramedSpriteSheet
     * frames will contain the sprite sheet frames
     *
     */
    this.frames = [];
};

// constructor
PIXI.ImageLoader.prototype.constructor = PIXI.ImageLoader;

/**
 * Loads image or takes it from cache
 *
 * @method load
 */
PIXI.ImageLoader.prototype.load = function()
{
    if(!this.texture.baseTexture.hasLoaded)
    {
        var scope = this;
        this.texture.baseTexture.addEventListener('loaded', function()
        {
            scope.onLoaded();
        });
    }
    else
    {
        this.onLoaded();
    }
};

/**
 * Invoked when image file is loaded or it is already cached and ready to use
 *
 * @method onLoaded
 * @private
 */
PIXI.ImageLoader.prototype.onLoaded = function()
{
    this.dispatchEvent({type: 'loaded', content: this});
};

/**
 * Loads image and split it to uniform sized frames
 *
 *
 * @method loadFramedSpriteSheet
 * @param frameWidth {Number} width of each frame
 * @param frameHeight {Number} height of each frame
 * @param textureName {String} if given, the frames will be cached in <textureName>-<ord> format
 */
PIXI.ImageLoader.prototype.loadFramedSpriteSheet = function(frameWidth, frameHeight, textureName)
{
    this.frames = [];
    var cols = Math.floor(this.texture.width / frameWidth);
    var rows = Math.floor(this.texture.height / frameHeight);

    var i=0;
    for (var y=0; y<rows; y++)
    {
        for (var x=0; x<cols; x++,i++)
        {
            var texture = new PIXI.Texture(this.texture, {
                x: x*frameWidth,
                y: y*frameHeight,
                width: frameWidth,
                height: frameHeight
            });

            this.frames.push(texture);
            if (textureName) PIXI.TextureCache[textureName + '-' + i] = texture;
        }
    }

    if(!this.texture.baseTexture.hasLoaded)
    {
        var scope = this;
        this.texture.baseTexture.addEventListener('loaded', function() {
            scope.onLoaded();
        });
    }
    else
    {
        this.onLoaded();
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The xml loader is used to load in XML bitmap font data ('xml' or 'fnt')
 * To generate the data you can use http://www.angelcode.com/products/bmfont/
 * This loader will also load the image file as the data.
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class BitmapFontLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the sprite sheet JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.BitmapFontLoader = function(url, crossorigin)
{
    /*
     * I use texture packer to load the assets..
     * http://www.codeandweb.com/texturepacker
     * make sure to set the format as 'JSON'
     */
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * [read-only] The texture of the bitmap font
     *
     * @property baseUrl
     * @type String
     */
    this.texture = null;
};

// constructor
PIXI.BitmapFontLoader.prototype.constructor = PIXI.BitmapFontLoader;

/**
 * Loads the XML font data
 *
 * @method load
 */
PIXI.BitmapFontLoader.prototype.load = function()
{
    this.ajaxRequest = new PIXI.AjaxRequest();
    var scope = this;
    this.ajaxRequest.onreadystatechange = function()
    {
        scope.onXMLLoaded();
    };

    this.ajaxRequest.open('GET', this.url, true);
    if (this.ajaxRequest.overrideMimeType) this.ajaxRequest.overrideMimeType('application/xml');
    this.ajaxRequest.send(null);
};

/**
 * Invoked when the XML file is loaded, parses the data
 *
 * @method onXMLLoaded
 * @private
 */
PIXI.BitmapFontLoader.prototype.onXMLLoaded = function()
{
    if (this.ajaxRequest.readyState === 4)
    {
        if (this.ajaxRequest.status === 200 || window.location.protocol.indexOf('http') === -1)
        {
            var responseXML = this.ajaxRequest.responseXML;
            if(!responseXML || /MSIE 9/i.test(navigator.userAgent) || navigator.isCocoonJS) {
                if(typeof(window.DOMParser) === 'function') {
                    var domparser = new DOMParser();
                    responseXML = domparser.parseFromString(this.ajaxRequest.responseText, 'text/xml');
                } else {
                    var div = document.createElement('div');
                    div.innerHTML = this.ajaxRequest.responseText;
                    responseXML = div;
                }
            }

            var textureUrl = this.baseUrl + responseXML.getElementsByTagName('page')[0].getAttribute('file');
            var image = new PIXI.ImageLoader(textureUrl, this.crossorigin);
            this.texture = image.texture.baseTexture;

            var data = {};
            var info = responseXML.getElementsByTagName('info')[0];
            var common = responseXML.getElementsByTagName('common')[0];
            data.font = info.getAttribute('face');
            data.size = parseInt(info.getAttribute('size'), 10);
            data.lineHeight = parseInt(common.getAttribute('lineHeight'), 10);
            data.chars = {};

            //parse letters
            var letters = responseXML.getElementsByTagName('char');

            for (var i = 0; i < letters.length; i++)
            {
                var charCode = parseInt(letters[i].getAttribute('id'), 10);

                var textureRect = new PIXI.Rectangle(
                    parseInt(letters[i].getAttribute('x'), 10),
                    parseInt(letters[i].getAttribute('y'), 10),
                    parseInt(letters[i].getAttribute('width'), 10),
                    parseInt(letters[i].getAttribute('height'), 10)
                );

                data.chars[charCode] = {
                    xOffset: parseInt(letters[i].getAttribute('xoffset'), 10),
                    yOffset: parseInt(letters[i].getAttribute('yoffset'), 10),
                    xAdvance: parseInt(letters[i].getAttribute('xadvance'), 10),
                    kerning: {},
                    texture: PIXI.TextureCache[charCode] = new PIXI.Texture(this.texture, textureRect)

                };
            }

            //parse kernings
            var kernings = responseXML.getElementsByTagName('kerning');
            for (i = 0; i < kernings.length; i++)
            {
                var first = parseInt(kernings[i].getAttribute('first'), 10);
                var second = parseInt(kernings[i].getAttribute('second'), 10);
                var amount = parseInt(kernings[i].getAttribute('amount'), 10);

                data.chars[second].kerning[first] = amount;

            }

            PIXI.BitmapText.fonts[data.font] = data;

            var scope = this;
            image.addEventListener('loaded', function() {
                scope.onLoaded();
            });
            image.load();
        }
    }
};

/**
 * Invoked when all files are loaded (xml/fnt and texture)
 *
 * @method onLoaded
 * @private
 */
PIXI.BitmapFontLoader.prototype.onLoaded = function()
{
    this.dispatchEvent({type: 'loaded', content: this});
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * based on pixi impact spine implementation made by Eemeli Kelokorpi (@ekelokorpi) https://github.com/ekelokorpi
 *
 * Awesome JS run time provided by EsotericSoftware
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */

/**
 * The Spine loader is used to load in JSON spine data
 * To generate the data you need to use http://esotericsoftware.com/ and export in the "JSON" format
 * Due to a clash of names  You will need to change the extension of the spine file from *.json to *.anim for it to load
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 * You will need to generate a sprite sheet to accompany the spine data
 * When loaded this class will dispatch a "loaded" event
 *
 * @class Spine
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.SpineLoader = function(url, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] Whether the data has loaded yet
     *
     * @property loaded
     * @type Boolean
     * @readOnly
     */
    this.loaded = false;
};

PIXI.SpineLoader.prototype.constructor = PIXI.SpineLoader;

/**
 * Loads the JSON data
 *
 * @method load
 */
PIXI.SpineLoader.prototype.load = function () {

    var scope = this;
    var jsonLoader = new PIXI.JsonLoader(this.url, this.crossorigin);
    jsonLoader.addEventListener("loaded", function (event) {
        scope.json = event.content.json;
        scope.onLoaded();
    });
    jsonLoader.load();
};

/**
 * Invoke when JSON file is loaded
 *
 * @method onLoaded
 * @private
 */
PIXI.SpineLoader.prototype.onLoaded = function () {
    this.loaded = true;
    this.dispatchEvent({type: "loaded", content: this});
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * This is the base class for creating a pixi.js filter. Currently only webGL supports filters.
 * If you want to make a custom filter this should be your base class.
 * @class AbstractFilter
 * @constructor
 * @param fragmentSrc
 * @param uniforms
 */
PIXI.AbstractFilter = function(fragmentSrc, uniforms)
{
    /**
    * An array of passes - some filters contain a few steps this array simply stores the steps in a liniear fashion.
    * For example the blur filter has two passes blurX and blurY.
    * @property passes
    * @type Array an array of filter objects
    * @private
    */
    this.passes = [this];

    /**
    * @property shaders
    * @type Array an array of shaders
    * @private
    */
    this.shaders = [];
    
    this.dirty = true;
    this.padding = 0;

    /**
    * @property uniforms
    * @type object
    * @private
    */
    this.uniforms = uniforms || {};
    /**
    * @property fragmentSrc
    * @type Array
    * @private
    */
    this.fragmentSrc = fragmentSrc || [];
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The AlphaMaskFilter class uses the pixel values from the specified texture (called the displacement map) to perform a displacement of an object.
 * You can use this filter to apply all manor of crazy warping effects
 * Currently the r property of the texture is used to offset the x and the g propery of the texture is used to offset the y.
 * @class AlphaMaskFilter
 * @contructor
 * @param texture {Texture} The texture used for the displacemtent map * must be power of 2 texture at the moment
 */
PIXI.AlphaMaskFilter = function(texture)
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];
    texture.baseTexture._powerOf2 = true;

    // set the uniforms
    this.uniforms = {
        mask: {type: 'sampler2D', value:texture},
        mapDimensions:   {type: '2f', value:{x:1, y:5112}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    if(texture.baseTexture.hasLoaded)
    {
        this.uniforms.mask.value.x = texture.width;
        this.uniforms.mask.value.y = texture.height;
    }
    else
    {
        this.boundLoadedFunction = this.onTextureLoaded.bind(this);

        texture.baseTexture.on('loaded', this.boundLoadedFunction);
    }

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D mask;',
        'uniform sampler2D uSampler;',
        'uniform vec2 offset;',
        'uniform vec4 dimensions;',
        'uniform vec2 mapDimensions;',

        'void main(void) {',
        '   vec2 mapCords = vTextureCoord.xy;',
        '   mapCords += (dimensions.zw + offset)/ dimensions.xy ;',
        '   mapCords.y *= -1.0;',
        '   mapCords.y += 1.0;',
        '   mapCords *= dimensions.xy / mapDimensions;',

        '   vec4 original =  texture2D(uSampler, vTextureCoord);',
        '   float maskAlpha =  texture2D(mask, mapCords).r;',
        '   original *= maskAlpha;',
        //'   original.rgb *= maskAlpha;',
        '   gl_FragColor =  original;',
        //'   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.AlphaMaskFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.AlphaMaskFilter.prototype.constructor = PIXI.AlphaMaskFilter;

PIXI.AlphaMaskFilter.prototype.onTextureLoaded = function()
{
    this.uniforms.mapDimensions.value.x = this.uniforms.mask.value.width;
    this.uniforms.mapDimensions.value.y = this.uniforms.mask.value.height;

    this.uniforms.mask.value.baseTexture.off('loaded', this.boundLoadedFunction);
};

/**
 * The texture used for the displacemtent map * must be power of 2 texture at the moment
 *
 * @property map
 * @type Texture
 */
Object.defineProperty(PIXI.AlphaMaskFilter.prototype, 'map', {
    get: function() {
        return this.uniforms.mask.value;
    },
    set: function(value) {
        this.uniforms.mask.value = value;
    }
});


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The ColorMatrixFilter class lets you apply a 4x4 matrix transformation on the RGBA
 * color and alpha values of every pixel on your displayObject to produce a result
 * with a new set of RGBA color and alpha values. Its pretty powerful!
 * @class ColorMatrixFilter
 * @contructor
 */
PIXI.ColorMatrixFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        matrix: {type: 'mat4', value: [1,0,0,0,
                                       0,1,0,0,
                                       0,0,1,0,
                                       0,0,0,1]}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float invert;',
        'uniform mat4 matrix;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix;',
      //  '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.ColorMatrixFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ColorMatrixFilter.prototype.constructor = PIXI.ColorMatrixFilter;

/**
 * Sets the matrix of the color matrix filter
 *
 * @property matrix
 * @type Array and array of 26 numbers
 * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 */
Object.defineProperty(PIXI.ColorMatrixFilter.prototype, 'matrix', {
    get: function() {
        return this.uniforms.matrix.value;
    },
    set: function(value) {
        this.uniforms.matrix.value = value;
    }
});
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This turns your displayObjects to black and white.
 * @class GrayFilter
 * @contructor
 */
PIXI.GrayFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        gray: {type: '1f', value: 1}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float gray;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.2126*gl_FragColor.r + 0.7152*gl_FragColor.g + 0.0722*gl_FragColor.b), gray);',
     //   '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.GrayFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.GrayFilter.prototype.constructor = PIXI.GrayFilter;

/**
The strength of the gray. 1 will make the object black and white, 0 will make the object its normal color
@property gray
*/
Object.defineProperty(PIXI.GrayFilter.prototype, 'gray', {
    get: function() {
        return this.uniforms.gray.value;
    },
    set: function(value) {
        this.uniforms.gray.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The DisplacementFilter class uses the pixel values from the specified texture (called the displacement map) to perform a displacement of an object.
 * You can use this filter to apply all manor of crazy warping effects
 * Currently the r property of the texture is used offset the x and the g propery of the texture is used to offset the y.
 * @class DisplacementFilter
 * @contructor
 * @param texture {Texture} The texture used for the displacemtent map * must be power of 2 texture at the moment
 */
PIXI.DisplacementFilter = function(texture)
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];
    texture.baseTexture._powerOf2 = true;

    // set the uniforms
    this.uniforms = {
        displacementMap: {type: 'sampler2D', value:texture},
        scale:           {type: '2f', value:{x:30, y:30}},
        offset:          {type: '2f', value:{x:0, y:0}},
        mapDimensions:   {type: '2f', value:{x:1, y:5112}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    if(texture.baseTexture.hasLoaded)
    {
        this.uniforms.mapDimensions.value.x = texture.width;
        this.uniforms.mapDimensions.value.y = texture.height;
    }
    else
    {
        this.boundLoadedFunction = this.onTextureLoaded.bind(this);

        texture.baseTexture.on('loaded', this.boundLoadedFunction);
    }

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D displacementMap;',
        'uniform sampler2D uSampler;',
        'uniform vec2 scale;',
        'uniform vec2 offset;',
        'uniform vec4 dimensions;',
        'uniform vec2 mapDimensions;',// = vec2(256.0, 256.0);',
        // 'const vec2 textureDimensions = vec2(750.0, 750.0);',

        'void main(void) {',
        '   vec2 mapCords = vTextureCoord.xy;',
        //'   mapCords -= ;',
        '   mapCords += (dimensions.zw + offset)/ dimensions.xy ;',
        '   mapCords.y *= -1.0;',
        '   mapCords.y += 1.0;',
        '   vec2 matSample = texture2D(displacementMap, mapCords).xy;',
        '   matSample -= 0.5;',
        '   matSample *= scale;',
        '   matSample /= mapDimensions;',
        '   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + matSample.x, vTextureCoord.y + matSample.y));',
        '   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);',
        '   vec2 cord = vTextureCoord;',

        //'   gl_FragColor =  texture2D(displacementMap, cord);',
     //   '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.DisplacementFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.DisplacementFilter.prototype.constructor = PIXI.DisplacementFilter;

PIXI.DisplacementFilter.prototype.onTextureLoaded = function()
{
    this.uniforms.mapDimensions.value.x = this.uniforms.displacementMap.value.width;
    this.uniforms.mapDimensions.value.y = this.uniforms.displacementMap.value.height;

    this.uniforms.displacementMap.value.baseTexture.off('loaded', this.boundLoadedFunction);
};

/**
 * The texture used for the displacemtent map * must be power of 2 texture at the moment
 *
 * @property map
 * @type Texture
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'map', {
    get: function() {
        return this.uniforms.displacementMap.value;
    },
    set: function(value) {
        this.uniforms.displacementMap.value = value;
    }
});

/**
 * The multiplier used to scale the displacement result from the map calculation.
 *
 * @property scale
 * @type Point
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'scale', {
    get: function() {
        return this.uniforms.scale.value;
    },
    set: function(value) {
        this.uniforms.scale.value = value;
    }
});

/**
 * The offset used to move the displacement map.
 *
 * @property offset
 * @type Point
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'offset', {
    get: function() {
        return this.uniforms.offset.value;
    },
    set: function(value) {
        this.uniforms.offset.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This filter applies a pixelate effect making display objects appear 'blocky'
 * @class PixelateFilter
 * @contructor
 */
PIXI.PixelateFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        invert: {type: '1f', value: 0},
        dimensions: {type: '4fv', value:new Float32Array([10000, 100, 10, 10])},
        pixelSize: {type: '2f', value:{x:10, y:10}}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec2 testDim;',
        'uniform vec4 dimensions;',
        'uniform vec2 pixelSize;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec2 coord = vTextureCoord;',

        '   vec2 size = dimensions.xy/pixelSize;',

        '   vec2 color = floor( ( vTextureCoord * size ) ) / size + pixelSize/dimensions.xy * 0.5;',
        '   gl_FragColor = texture2D(uSampler, color);',
        '}'
    ];
};

PIXI.PixelateFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.PixelateFilter.prototype.constructor = PIXI.PixelateFilter;

/**
 *
 * This a point that describes the size of the blocs. x is the width of the block and y is the the height
 * @property size
 * @type Point
 */
Object.defineProperty(PIXI.PixelateFilter.prototype, 'size', {
    get: function() {
        return this.uniforms.pixelSize.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.pixelSize.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BlurXFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1/512}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec4 sum = vec4(0.0);',

        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 4.0*blur, vTextureCoord.y)) * 0.05;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 3.0*blur, vTextureCoord.y)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 2.0*blur, vTextureCoord.y)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - blur, vTextureCoord.y)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + blur, vTextureCoord.y)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 2.0*blur, vTextureCoord.y)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 3.0*blur, vTextureCoord.y)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 4.0*blur, vTextureCoord.y)) * 0.05;',

        '   gl_FragColor = sum;',
        '}'
    ];
};

PIXI.BlurXFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.BlurXFilter.prototype.constructor = PIXI.BlurXFilter;

Object.defineProperty(PIXI.BlurXFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {

        this.dirty = true;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BlurYFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1/512}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec4 sum = vec4(0.0);',

        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 4.0*blur)) * 0.05;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 3.0*blur)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 2.0*blur)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - blur)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + blur)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 2.0*blur)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 3.0*blur)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 4.0*blur)) * 0.05;',

        '   gl_FragColor = sum;',
        '}'
    ];
};

PIXI.BlurYFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.BlurYFilter.prototype.constructor = PIXI.BlurYFilter;

Object.defineProperty(PIXI.BlurYFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The BlurFilter applies a Gaussian blur to an object.
 * The strength of the blur can be set for x- and y-axis separately (always relative to the stage).
 *
 * @class BlurFilter
 * @contructor
 */
PIXI.BlurFilter = function()
{
    this.blurXFilter = new PIXI.BlurXFilter();
    this.blurYFilter = new PIXI.BlurYFilter();

    this.passes =[this.blurXFilter, this.blurYFilter];
};

/**
 * Sets the strength of both the blurX and blurY properties simultaneously
 *
 * @property blur
 * @type Number the strength of the blur
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blur', {
    get: function() {
        return this.blurXFilter.blur;
    },
    set: function(value) {
        this.blurXFilter.blur = this.blurYFilter.blur = value;
    }
});

/**
 * Sets the strength of the blurX property
 *
 * @property blurX
 * @type Number the strength of the blurX
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blurX', {
    get: function() {
        return this.blurXFilter.blur;
    },
    set: function(value) {
        this.blurXFilter.blur = value;
    }
});

/**
 * Sets the strength of the blurX property
 *
 * @property blurY
 * @type Number the strength of the blurY
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blurY', {
    get: function() {
        return this.blurYFilter.blur;
    },
    set: function(value) {
        this.blurYFilter.blur = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This inverts your displayObjects colors.
 * @class InvertFilter
 * @contructor
 */
PIXI.InvertFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        invert: {type: '1f', value: 1}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float invert;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix( (vec3(1)-gl_FragColor.rgb) * gl_FragColor.a, gl_FragColor.rgb, 1.0 - invert);',
        //'   gl_FragColor.rgb = gl_FragColor.rgb  * gl_FragColor.a;',
      //  '   gl_FragColor = gl_FragColor * vColor;',
        '}'
    ];
};

PIXI.InvertFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.InvertFilter.prototype.constructor = PIXI.InvertFilter;

/**
The strength of the invert. 1 will fully invert the colors, 0 will make the object its normal color
@property invert
*/
Object.defineProperty(PIXI.InvertFilter.prototype, 'invert', {
    get: function() {
        return this.uniforms.invert.value;
    },
    set: function(value) {
        this.uniforms.invert.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This applies a sepia effect to your displayObjects.
 * @class SepiaFilter
 * @contructor
 */
PIXI.SepiaFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        sepia: {type: '1f', value: 1}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float sepia;',
        'uniform sampler2D uSampler;',

        'const mat3 sepiaMatrix = mat3(0.3588, 0.7044, 0.1368, 0.2990, 0.5870, 0.1140, 0.2392, 0.4696, 0.0912);',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * sepiaMatrix, sepia);',
       // '   gl_FragColor = gl_FragColor * vColor;',
        '}'
    ];
};

PIXI.SepiaFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.SepiaFilter.prototype.constructor = PIXI.SepiaFilter;

/**
The strength of the sepia. 1 will apply the full sepia effect, 0 will make the object its normal color
@property sepia
*/
Object.defineProperty(PIXI.SepiaFilter.prototype, 'sepia', {
    get: function() {
        return this.uniforms.sepia.value;
    },
    set: function(value) {
        this.uniforms.sepia.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This filter applies a twist effect making display objects appear twisted in the given direction
 * @class TwistFilter
 * @contructor
 */
PIXI.TwistFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        radius: {type: '1f', value:0.5},
        angle: {type: '1f', value:5},
        offset: {type: '2f', value:{x:0.5, y:0.5}}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'uniform float radius;',
        'uniform float angle;',
        'uniform vec2 offset;',

        'void main(void) {',
        '   vec2 coord = vTextureCoord - offset;',
        '   float distance = length(coord);',

        '   if (distance < radius) {',
        '       float ratio = (radius - distance) / radius;',
        '       float angleMod = ratio * ratio * angle;',
        '       float s = sin(angleMod);',
        '       float c = cos(angleMod);',
        '       coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);',
        '   }',

        '   gl_FragColor = texture2D(uSampler, coord+offset);',
        '}'
    ];
};

PIXI.TwistFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.TwistFilter.prototype.constructor = PIXI.TwistFilter;

/**
 *
 * This point describes the the offset of the twist
 * @property size
 * @type Point
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'offset', {
    get: function() {
        return this.uniforms.offset.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.offset.value = value;
    }
});

/**
 *
 * This radius describes size of the twist
 * @property size
 * @type Number
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'radius', {
    get: function() {
        return this.uniforms.radius.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.radius.value = value;
    }
});

/**
 *
 * This radius describes angle of the twist
 * @property angle
 * @type Number
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.angle.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.angle.value = value;
    }
});
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This lowers the color depth of your image by the given amount, producing an image with a smaller palette.
 * @class ColorStepFilter
 * @contructor
 */
PIXI.ColorStepFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        step: {type: '1f', value: 5}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float step;',

        'void main(void) {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   color = floor(color * step) / step;',
        '   gl_FragColor = color;',
        '}'
    ];
};

PIXI.ColorStepFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ColorStepFilter.prototype.constructor = PIXI.ColorStepFilter;

/**
The number of steps.
@property step
*/
Object.defineProperty(PIXI.ColorStepFilter.prototype, 'step', {
    get: function() {
        return this.uniforms.step.value;
    },
    set: function(value) {
        this.uniforms.step.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * original filter: https://github.com/evanw/glfx.js/blob/master/src/filters/fun/dotscreen.js
 */

/**
 *
 * This filter applies a dotscreen effect making display objects appear to be made out of black and white halftone dots like an old printer
 * @class DotScreenFilter
 * @contructor
 */
PIXI.DotScreenFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        scale: {type: '1f', value:1},
        angle: {type: '1f', value:5},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'uniform float angle;',
        'uniform float scale;',

        'float pattern() {',
        '   float s = sin(angle), c = cos(angle);',
        '   vec2 tex = vTextureCoord * dimensions.xy;',
        '   vec2 point = vec2(',
        '       c * tex.x - s * tex.y,',
        '       s * tex.x + c * tex.y',
        '   ) * scale;',
        '   return (sin(point.x) * sin(point.y)) * 4.0;',
        '}',

        'void main() {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   float average = (color.r + color.g + color.b) / 3.0;',
        '   gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);',
        '}'
    ];
};

PIXI.DotScreenFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.DotScreenFilter.prototype.constructor = PIXI.DotScreenFilter;

/**
 *
 * This describes the the scale
 * @property scale
 * @type Number
 */
Object.defineProperty(PIXI.DotScreenFilter.prototype, 'scale', {
    get: function() {
        return this.uniforms.scale.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.scale.value = value;
    }
});

/**
 *
 * This radius describes angle
 * @property angle
 * @type Number
 */
Object.defineProperty(PIXI.DotScreenFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.angle.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.angle.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.CrossHatchFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1 / 512}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '    float lum = length(texture2D(uSampler, vTextureCoord.xy).rgb);',

        '    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',

        '    if (lum < 1.00) {',
        '        if (mod(gl_FragCoord.x + gl_FragCoord.y, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.75) {',
        '        if (mod(gl_FragCoord.x - gl_FragCoord.y, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.50) {',
        '        if (mod(gl_FragCoord.x + gl_FragCoord.y - 5.0, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.3) {',
        '        if (mod(gl_FragCoord.x - gl_FragCoord.y - 5.0, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',
        '}'
    ];
};

PIXI.CrossHatchFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.CrossHatchFilter.prototype.constructor = PIXI.BlurYFilter;

Object.defineProperty(PIXI.CrossHatchFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.RGBSplitFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        red: {type: '2f', value: {x:20, y:20}},
        green: {type: '2f', value: {x:-20, y:20}},
        blue: {type: '2f', value: {x:20, y:-20}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec2 red;',
        'uniform vec2 green;',
        'uniform vec2 blue;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor.r = texture2D(uSampler, vTextureCoord + red/dimensions.xy).r;',
        '   gl_FragColor.g = texture2D(uSampler, vTextureCoord + green/dimensions.xy).g;',
        '   gl_FragColor.b = texture2D(uSampler, vTextureCoord + blue/dimensions.xy).b;',
        '   gl_FragColor.a = texture2D(uSampler, vTextureCoord).a;',
        '}'
    ];
};

PIXI.RGBSplitFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.RGBSplitFilter.prototype.constructor = PIXI.RGBSplitFilter;

Object.defineProperty(PIXI.RGBSplitFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = PIXI;
        }
        exports.PIXI = PIXI;
    } else if (typeof define !== 'undefined' && define.amd) {
        define(PIXI);
    } else {
        root.PIXI = PIXI;
    }
}).call(this);
},{}],9:[function(require,module,exports){
(function() {

var PIXI;

if (typeof module !== 'undefined') {
	PIXI = require("pixi.js");
} else {
	PIXI = window.PIXI;
}
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
 * @internal
 */
function EventDispatcher() {
	this.listenerMap = {};
}

/**
 * Add event listener.
 * @method addEventListener
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
EventDispatcher.prototype.dispatchEvent = function(event /* ... */ ) {
	if (!this.listenerMap)
		this.listenerMap = {};

	var eventType;
	var listenerParams;

	if (typeof event == "string") {
		eventType = event;
		listenerParams = Array.prototype.slice.call(arguments, 1);
	} else {
		eventType = event.type;
		event.target = this;
		listenerParams = [event];
	}

	if (!this.listenerMap.hasOwnProperty(eventType))
		return;

	for (var i in this.listenerMap[eventType]) {
		var listenerObj = this.listenerMap[eventType][i];
		listenerObj.listener.apply(listenerObj.scope, listenerParams);
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

if (typeof module !== 'undefined') {
	module.exports = EventDispatcher;
}

/**
 * Keep content with a logic size inside boundaries.
 * @class ContentScaler
 * @internal
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

	this.verticalAlign = ContentScaler.MIDDLE;
	this.horizontalAlign = ContentScaler.CENTER;
	this.scaleMode = ContentScaler.SHOW_ALL;

	this.minScale = -1;
	this.maxScale = -1;

	this.maskContentEnabled = false;
	this.maskColor = 0x000000;
}

ContentScaler.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
ContentScaler.prototype.constructor = ContentScaler;

ContentScaler.TOP = "top";
ContentScaler.MIDDLE = "middle";
ContentScaler.BOTTOM = "bottom";

ContentScaler.LEFT = "left";
ContentScaler.CENTER = "center";
ContentScaler.RIGHT = "right";

ContentScaler.NO_BORDER = "noBorder";
ContentScaler.NO_SCALE = "noScale";
ContentScaler.SHOW_ALL = "showAll";

/**
 * Should the content be masked?
 * @method setMaskContentEnabled
 */
ContentScaler.prototype.setMaskContentEnabled = function(value) {
	this.maskContentEnabled = value;
	this.updateScale();
}

/**
 * Set color of the mask.
 * @method setMaskColor
 */
ContentScaler.prototype.setMaskColor = function(value) {
	this.maskColor = value;
	this.updateScale();
}

/**
 * Set minimum value for scale.
 * @method setMinScale
 */
ContentScaler.prototype.setMinScale = function(minScale) {
	this.minScale = minScale;
	this.updateScale();
}

/**
 * Set maximum value for scale.
 * @method setMaxScale
 */
ContentScaler.prototype.setMaxScale = function(maxScale) {
	this.maxScale = maxScale;
	this.updateScale();
}

/**
 * Set content to use.
 * @method setContent
 */
ContentScaler.prototype.setContent = function(content) {
	if (this.content)
		throw new Error("Content already set.");

	this.content = content;
	this.addChild(this.content);

	if (this.theMask) {
		this.removeChild(this.theMask);
		this.theMask = null;
	}

	this.theMask = new PIXI.Graphics();
	this.addChild(this.theMask);

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
 * @method setVerticalAlign
 */
ContentScaler.prototype.setVerticalAlign = function(align) {
	this.verticalAlign = align;
	this.updateScale();
}

/**
 * Set how the content should be aligned on the screen.
 * @method setHorizontalAlign
 */
ContentScaler.prototype.setHorizontalAlign = function(align) {
	this.horizontalAlign = align;
	this.updateScale();
}

/**
 * Set scale mode.
 * @method setScaleMode
 */
ContentScaler.prototype.setScaleMode = function(scaleMode) {
	this.scaleMode = scaleMode;
	this.updateScale();
}

/**
 * Update the scaling.
 * @method updateScale
 * @private
 */
ContentScaler.prototype.updateScale = function() {
	var scale;

	if (this.scaleMode == ContentScaler.NO_SCALE) {
		scale = 1;
	} else if (this.scaleMode == ContentScaler.NO_BORDER) {
		if (this.screenWidth / this.contentWidth > this.screenHeight / this.contentHeight)
			scale = this.screenWidth / this.contentWidth;

		else
			scale = this.screenHeight / this.contentHeight;
	} else {
		if (this.screenWidth / this.contentWidth < this.screenHeight / this.contentHeight)
			scale = this.screenWidth / this.contentWidth;

		else
			scale = this.screenHeight / this.contentHeight;
	}

	if (this.minScale > 0 && scale < this.minScale)
		scale = this.minScale;

	if (this.maxScale > 0 && scale > this.maxScale)
		scale = this.maxScale;

	this.content.scale.x = scale;
	this.content.scale.y = scale;

	var scaledWidth = this.contentWidth * scale;
	var scaledHeight = this.contentHeight * scale;

	this.content.position.x = (this.screenWidth - scaledWidth) / 2;

	if (this.verticalAlign == ContentScaler.TOP)
		this.content.position.y = 0;

	else if (this.verticalAlign == ContentScaler.BOTTOM)
		this.content.position.y = this.screenHeight - scaledHeight;

	else
		this.content.position.y = (this.screenHeight - scaledHeight) / 2;

	if (this.horizontalAlign == ContentScaler.LEFT)
		this.content.position.x = 0;

	else if (this.horizontalAlign == ContentScaler.RIGHT)
		this.content.position.x = this.screenWidth - scaledWidth;

	else
		this.content.position.x = (this.screenWidth - scaledWidth) / 2;

	var r = new PIXI.Rectangle(this.content.position.x, this.content.position.y, scaledWidth, scaledHeight);
	var right = r.x + r.width;
	var bottom = r.y + r.height;

	this.theMask.clear();

	if (this.maskContentEnabled) {
		this.theMask.beginFill(this.maskColor, 1);
		this.theMask.drawRect(0, 0, this.screenWidth, r.y);
		this.theMask.drawRect(0, 0, r.x, this.screenHeight);
		this.theMask.drawRect(right, 0, this.screenWidth - right, this.screenHeight);
		this.theMask.drawRect(0, bottom, this.screenWidth, this.screenHeight - bottom);
		this.theMask.endFill();
	}
}

/**
 * Get visible rectangle.
 * @method getVisibleRect
 */
ContentScaler.prototype.getVisibleRect = function() {
	var x = -this.content.position.x / this.content.scale.x;
	var y = -this.content.position.y / this.content.scale.y;

	var width = this.screenWidth / this.content.scale.x;
	var height = this.screenHeight / this.content.scale.y;
	// this.content.position, this.content.position, this.screenWidth, this.screenHeight

	return new PIXI.Rectangle(x, y, width, height);
}
/**
 * Manages the main loop and scaling of a PIXI application.
 * The intended way of using this class is to extend it, for example:
 *
 *     var PIXI = require("pixi.js");
 *     var PixiApp = require("PixiApp");
 *     var inherits = require("inherits");
 *
 *     function MyApp() {
 *         PixiApp.call(this);
 *
 *         var t = new PIXI.Text("Hello PIXI.js!");
 *         this.addChild(t);
 *     }
 *
 *     inherits(MyApp, PixiApp);
 *
 *     new MyApp();
 * @class PixiApp
 */
function PixiApp(width, height) {
	PIXI.DisplayObjectContainer.call(this);

	this._applicationWidth = width;
	this._applicationHeight = height;
	this._backgroundColor = 0xffffff;

	setTimeout(this.onCheckReadyTimeout.bind(this), 0);

	this.contentScaler = new ContentScaler(this);
}

PixiApp.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PixiApp.prototype.constructor = PixiApp;

EventDispatcher.init(PixiApp);

/**
 * Dispatched if the app is resized.
 * @event resize
 */

/**
 * Dispatched every frame before rendering.
 * The time is send to the listening function as parameter.
 * @event frame
 */

PixiApp.TOP = ContentScaler.TOP;
PixiApp.MIDDLE = ContentScaler.MIDDLE;
PixiApp.BOTTOM = ContentScaler.BOTTOM;

PixiApp.LEFT = ContentScaler.LEFT;
PixiApp.CENTER = ContentScaler.CENTER;
PixiApp.RIGHT = ContentScaler.RIGHT;

PixiApp.NO_BORDER = ContentScaler.NO_BORDER;
PixiApp.NO_SCALE = ContentScaler.NO_SCALE;
PixiApp.SHOW_ALL = ContentScaler.SHOW_ALL;

/**
 * Check if it's time to attach ourselves.
 * @method onCheckReadyTimeout
 * @private
 */
PixiApp.prototype.onCheckReadyTimeout = function() {
	if (this.attachedToElement)
		return;

	if (!document.body) {
		setTimeout(this.onCheckReadyTimeout.bind(this), 0);
		return;
	}

	this.attachToElement(document.body);
}

/**
 * Attach to an element in the document.
 * If this function is not called, the app will be attached
 * to entire browser window.
 * @method attachToElement
 * @param element {DOMElement} The element to attach to.
 */
PixiApp.prototype.attachToElement = function(element) {
	if (this.attachedToElement)
		throw new Error("Already attached!");

	if (typeof element == "string")
		element = document.getElementById(element);

	if (!element)
		throw new Error("That's not an element!");

	//console.log("** attaching to element, w=" + element.clientWidth + " h=" + element.clientHeight);

	this.containerElement = element;
	this.attachedToElement = true;

	var view;

	if (navigator.isCocoonJS)
		view = document.createElement('screencanvas');

	else
		view = document.createElement('canvas');

	view.style.margin = 0;
	view.style.padding = 0;

	if (this.containerElement == document.body) {
		//console.log("style: " + document.documentElement.style.height);

		view.style.position = "fixed";

		document.body.style.margin = 0;
		document.body.style.padding = 0;
		document.body.style.overflow = "hidden";

		document.body.onresize = this.onWindowResize.bind(this);
		window.onresize = this.onWindowResize.bind(this);
	}

	this.renderer = new PIXI.autoDetectRenderer(this.getElementWidth(), this.getElementHeight(), view);
	this.containerElement.appendChild(this.renderer.view);

	this.stage = new PIXI.Stage(this._backgroundColor);

	this.updateContentScaler();
	this.stage.addChild(this.contentScaler);

	this.renderer.render(this.stage);
	this.sizeDirty = false;

	window.requestAnimationFrame(this.onAnimationFrame.bind(this));
	this.trigger("resize");

	//console.log("attached...");
}

/**
 * Update the content scaler.
 * @method updateContentScaler
 * @private
 */
PixiApp.prototype.updateContentScaler = function() {
	this.contentScaler.setContentSize(this._applicationWidth, this._applicationHeight);
	this.contentScaler.setScreenSize(this.getElementWidth(), this.getElementHeight());
}

/**
 * Animation frame. Render ourselfs.
 * @method onAnimationFrame
 * @private
 */
PixiApp.prototype.onAnimationFrame = function(time) {
	//console.log("render");

	if (this.sizeDirty) {
		this.updateContentScaler();
		this.renderer.resize(this.getElementWidth(), this.getElementHeight());
		this.sizeDirty = false;
	}

	this.trigger("frame", time);

	this.renderer.render(this.stage);
	//TWEEN.update(time);

	window.requestAnimationFrame(this.onAnimationFrame.bind(this));
}

/**
 * Handle window resize.
 * @method onWindowResize
 * @private
 */
PixiApp.prototype.onWindowResize = function() {
	this.sizeDirty = true;
	this.trigger("resize");
}

/**
 * Get height of the element that we are attached to.
 * @method getElementHeight
 * @private
 */
PixiApp.prototype.getElementHeight = function() {
	if (this.containerElement == document.body)
		return window.innerHeight;

	return this.containerElement.clientHeight;
}

/**
 * Get height of the element that we are attached to.
 * @method getElementWidth
 * @private
 */
PixiApp.prototype.getElementWidth = function() {
	if (this.containerElement == document.body)
		return window.innerWidth;

	return this.containerElement.clientWidth;
}

/**
 * The logic width of the application.
 * @property applicationWidth
 */
Object.defineProperty(PixiApp.prototype, 'applicationWidth', {
	get: function() {
		return this._applicationWidth;
	},
	set: function(value) {
		this._applicationWidth = value;
		this.sizeDirty = true;
	}
});

/**
 * The logic height of the application.
 * @property applicationHeight
 */
Object.defineProperty(PixiApp.prototype, 'applicationHeight', {
	get: function() {
		return this._applicationHeight;
	},
	set: function(value) {
		this._applicationHeight = value;
		this.sizeDirty = true;
	}
});

/**
 * How the application should be vertically aligned in the window.
 * @property verticalAlign
 */
Object.defineProperty(PixiApp.prototype, "verticalAlign", {
	get: function() {
		return this.contentScaler.verticalAlign;
	},
	set: function(value) {
		this.contentScaler.setVerticalAlign(value)
	}
});

/**
 * How the application should be horizontally aligned in the window.
 * @property horizontalAlign
 */
Object.defineProperty(PixiApp.prototype, "horizontalAlign", {
	get: function() {
		return this.contentScaler.horizontalAlign;
	},
	set: function(value) {
		this.contentScaler.setHorizontalAlign(value)
	}
});

/**
 * How should the application be scaled to fit the window?
 * Available vaues are:
 * <ul>
 *   <li>
 *     `PixiApp.SHOW_ALL` - Ensure that the whole application as defined by
 *     `applicationWidth` and `applicationHeight` is visible on the screen.
 *   </li>
 *   <li>
 *     `PixiApp.NO_BORDER` - Show as much as possible of the application,
 *     but scale it so that there will be no border.
 *   </li>
 *   <li>
 *     `PixiApp.NO_SCALE` - Don't scale the application at all.
 *   </li>
 * </ul>
 * @property scaleMode
 */
Object.defineProperty(PixiApp.prototype, "scaleMode", {
	get: function() {
		return this.contentScaler.scaleMode;
	},
	set: function(value) {
		this.contentScaler.setScaleMode(value)
	}
});

/**
 * Get or set the minimum allowed scale value.
 * @property minScale
 */
Object.defineProperty(PixiApp.prototype, "minScale", {
	get: function() {
		return this.contentScaler.minScale;
	},
	set: function(value) {
		this.contentScaler.setMinScale(value)
	}
});

/**
 * Get or set the maximum allowed scale value.
 * @property minScale
 */
Object.defineProperty(PixiApp.prototype, "maxScale", {
	get: function() {
		return this.contentScaler.maxScale;
	},
	set: function(value) {
		this.contentScaler.setMaxScale(value)
	}
});

/**
 * Should there be a letterbox matte around the content? I.e.
 * should the content outside the application area be masked
 * away?
 * @property matte
 */
Object.defineProperty(PixiApp.prototype, "matte", {
	get: function() {
		return this.contentScaler.maskContentEnabled
	},
	set: function(value) {
		this.contentScaler.setMaskContentEnabled(value);
	}
});

/**
 * The color of the letterbox matte. This has effect only if the 
 * letter box matte is enabled using the matte property.
 * @property matteColor
 */
Object.defineProperty(PixiApp.prototype, "matteColor", {
	get: function() {
		return this.contentScaler.maskColor;
	},
	set: function(value) {
		this.contentScaler.setMaskColor(value);
	}
});

/**
 * Gets the rectangle on the screen that is currently visible.
 * The rectangle is represented in application coordinates.
 * @property visibleRect
 */
Object.defineProperty(PixiApp.prototype, "visibleRect", {
	get: function() {
		if (this.sizeDirty) {
			this.updateContentScaler();
			this.renderer.resize(this.getElementWidth(), this.getElementHeight());
			this.sizeDirty = false;
		}

		return this.contentScaler.getVisibleRect();
	},
});

/**
 * The background color for the application.
 * Default is 0xffffff, i.e. white.
 * @property backgroundColor
 */
Object.defineProperty(PixiApp.prototype, "backgroundColor", {
	get: function() {
		return this._backgroundColor;
	},
	set: function(value) {
		this._backgroundColor = value;
		if (this.stage)
			this.stage.setBackgroundColor(this._backgroundColor);
	}
});
if (typeof module !== 'undefined') {
	module.exports = PixiApp;
} else {
	window.PixiApp = PixiApp;
}

}).call(this);
},{"pixi.js":8}],10:[function(require,module,exports){
var PixiTextInput = require("./src/PixiTextInput");

module.exports = PixiTextInput;
},{"./src/PixiTextInput":11}],11:[function(require,module,exports){
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
},{"pixi.js":8}],12:[function(require,module,exports){
(function (process){
/**
 * A subset of Promises/A+.
 * @class Thenable
 */
function Thenable() {
	if (!(this instanceof Thenable))
		return new Thenable();

	this.decided = false;
	this.handlersUsed = false;
}

/**
 * Then.
 * @method resolve
 */
Thenable.prototype.then = function(resolutionHandler, rejectionHandler) {
	if (this.handlersUsed)
		throw new Error("Handlers already registered or called.");

	this.handlersUsed = true;
	this.resolutionHandler = resolutionHandler;
	this.rejectionHandler = rejectionHandler;
}

/**
 * Resolve.
 * @method resolve
 */
Thenable.prototype.resolve = function(result) {
	if (this.decided)
		throw new Error("Already decided.");

	this.decided = true;
	process.nextTick(this.callHandler.bind(this, true, result));
}

/**
 * Reject.
 * @method resolve
 */
Thenable.prototype.reject = function(reason) {
	if (this.decided)
		throw new Error("Already decided.");

	this.decided = true;
	process.nextTick(this.callHandler.bind(this, false, reason));
}

/**
 * Call handler.
 * @method callHandler
 * @private
 */
Thenable.prototype.callHandler = function(resolved, parameter) {
	this.handlersUsed = true;

	var handler;

	if (resolved)
		handler = this.resolutionHandler;

	else
		handler = this.rejectionHandler;

	//console.log("in callHandler, handler=" + handler);

	if (handler) {
		try {
			handler(parameter);
		} catch (e) {
			console.error("Unhandled: " + e);
			console.log(e.stack);
			throw e;
		}
	}
}

/**
 * Return a resolved thenable.
 * @method resolved
 */
Thenable.resolved = function(parameter) {
	var t = new Thenable();
	t.resolve(parameter);
	return t;
}

/**
 * Return a rejected thenable.
 * @method rejected
 */
Thenable.rejected = function(parameter) {
	var t = new Thenable();
	t.reject(parameter);
	return t;
}

/**
 * Wait for all to resolve or any to reject.
 * @method all
 */
Thenable.all = function( /* ... */ ) {
	var thenable = new Thenable();
	var i;
	var thenables = [];
	var decided = false;
	var resolvedCount = 0;

	for (i = 0; i < arguments.length; i++)
		thenables = thenables.concat(arguments[i]);

	function onResolved() {
		resolvedCount++;

		if (!decided && resolvedCount >= thenables.length) {
			decided = true;
			thenable.resolve();
		}
	}

	function onRejected(e) {
		if (!decided) {
			decided = true;
			thenable.reject(e);
		}
	}

	for (i = 0; i < thenables.length; i++) {
		thenables[i].then(onResolved, onRejected);
	}

	return thenable;
}

/**
 * Wait for any to resolve or all to reject.
 * @method all
 */
Thenable.race = function( /* ... */ ) {
	var thenable = new Thenable();
	var i;
	var thenables = [];
	var decided = false;
	var resolvedCount = 0;

	for (i = 0; i < arguments.length; i++)
		thenables = thenables.concat(arguments[i]);

	function onRejected() {
		resolvedCount++;

		if (!decided && resolvedCount >= thenables.length) {
			decided = true;
			thenable.reject();
		}
	}

	function onResolved(r) {
		if (!decided) {
			decided = true;
			thenable.resolve(r);
		}
	}

	for (i = 0; i < thenables.length; i++) {
		thenables[i].then(onResolved, onRejected);
	}

	return thenable;
}

/**
 * Create a resolved Thenable.
 * @method resolved
 */
Thenable.resolved = function(result) {
	var t = new Thenable;
	t.resolve(result);

	return t;
}

/**
 * Create a rejected Thenable.
 * @method rejected
 */
Thenable.rejected = function(reason) {
	var t = new Thenable;
	t.reject(reason);

	return t;
}

module.exports = Thenable;
}).call(this,require('_process'))
},{"_process":1}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
EventDispatcher.prototype.dispatchEvent = function(event /* ... */ ) {
	if (!this.listenerMap)
		this.listenerMap = {};

	var eventType;
	var listenerParams;

	if (typeof event == "string") {
		eventType = event;

		if (arguments.length > 1)
			listenerParams = Array.prototype.slice.call(arguments, 1);

		else listenerParams = [{
			type: eventType,
			target: this
		}];
	} else {
		eventType = event.type;
		event.target = this;
		listenerParams = [event];
	}

	if (!this.listenerMap.hasOwnProperty(eventType))
		return;

	var map = [];
	for (var i = 0; i < this.listenerMap[eventType].length; i++)
		map.push(this.listenerMap[eventType][i])

	for (var i = 0; i < map.length; i++) {
		var listenerObj = map[i];
		listenerObj.listener.apply(listenerObj.scope, listenerParams);
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

if (typeof module !== 'undefined') {
	module.exports = EventDispatcher;
}
},{}],15:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var PixiApp = require("pixiapp");
var NetPokerClientView = require("../view/NetPokerClientView");
var NetPokerClientController = require("../controller/NetPokerClientController");
var MessageWebSocketConnection = require("../../utils/MessageWebSocketConnection");
var MessageRequestConnection = require("../../utils/MessageRequestConnection");
var ProtoConnection = require("../../proto/ProtoConnection");
var LoadingScreen = require("../view/LoadingScreen");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");
var InitMessage = require("../../proto/messages/InitMessage");
var Resources = require("../resources/Resources");
var ViewConfig = require("../resources/ViewConfig");
var url = require("url");
var TWEEN = require("tween.js");
var inherits = require("inherits");
var UrlUtil = require("../../utils/UrlUtil");
var DefaultSkin = require("../resources/DefaultSkin");

/**
 * Main entry point for client.
 * @class NetPokerClient
 */
function NetPokerClient() {
	PixiApp.call(this, 960, 720);

	this.verticalAlign = PixiApp.TOP;

	this.resources = new Resources();
	this.resources.addSkinSource(DefaultSkin);
	this.resources.addSpriteSheet("netpokerclient.spritesheet.json");

	this.loadingScreen = new LoadingScreen();
	this.addChild(this.loadingScreen);
	this.enterAppState("LOADING", 0);
	this.loadingScreen.show("LOADING");

	this.url = null;
	this.tableId = null;
	this.tournamentId = null;
	this.viewConfig = new ViewConfig(this.resources);

	this.on("frame", TWEEN.update);
}

inherits(NetPokerClient, PixiApp);

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
 * Set tournament id.
 * @method setTournamentId
 */
NetPokerClient.prototype.setTournamentId = function(tournamentId) {
	this.tournamentId = tournamentId;
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
 * Add skin source.
 * @method addSkinSource
 */
NetPokerClient.prototype.addSkinSource = function(skin) {
	this.resources.addSkinSource(skin);
}

/**
 * Add sprite sheet.
 * @method addSpriteSheet
 */
NetPokerClient.prototype.addSpriteSheet = function(spriteSheet) {
	this.resources.addSpriteSheet(spriteSheet);
}

/**
 * Set sprite sheet.
 * @method setSpriteSheet
 */
NetPokerClient.prototype.setSpriteSheet = function(spriteSheet) {
	this.resources.setSpriteSheet(spriteSheet);
}

/**
 * Run.
 * @method run
 */
NetPokerClient.prototype.run = function() {
	//console.log("loading resources.....");
	this.enterAppState("LOADING RESOURCES", 50);

	this.resources.load().then(
		this.onResourcesLoaded.bind(this),
		this.onResourcesError.bind(this)
	);
}

/**
 * Error while loading resources.
 * @method onResourcesError
 */
NetPokerClient.prototype.onResourcesError = function() {
	console.log("resource error");

	this.enterAppState("ERROR LOADING RESOURCES");
}

/**
 * Assets loaded, connect.
 * @method onAssetLoaderComplete
 * @private
 */
NetPokerClient.prototype.onResourcesLoaded = function() {
	//console.log("resources loaded complete...");

	this.netPokerClientView = new NetPokerClientView(this.viewConfig, this.resources);
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
		this.enterAppState("NEED URL");
		return;
	}

	var parsedUrl = url.parse(this.url);

	//console.log(parsedUrl);

	if (!parsedUrl.protocol || parsedUrl.protocol == "http:" || parsedUrl.protocol == "https:") {
		this.url = UrlUtil.makeAbsolute(this.url);
		this.connection = new MessageRequestConnection();
	} else {
		this.connection = new MessageWebSocketConnection();
	}

	this.connection.on(MessageWebSocketConnection.CONNECT, this.onConnectionConnect, this);
	this.connection.on(MessageWebSocketConnection.CLOSE, this.onConnectionClose, this);

	console.log("Connecting to: " + this.url);

	this.enterAppState("CONNECTING", 65);
	this.connection.connect(this.url);
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
	this.enterAppState("INITIALIZING", 80);

	var initMessage = new InitMessage(this.token);

	if (this.tableId)
		initMessage.setTableId(this.tableId);

	if (this.tournamentId)
		initMessage.setTournamentId(this.tournamentId);

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
	this.enterAppState(null);
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
	this.enterAppState("CONNECTION ERROR");
	setTimeout(this.connect.bind(this), 3000);
}

/**
 * Enter app state.
 * @method enterAppState
 * @private
 */
NetPokerClient.prototype.enterAppState = function(message, progress) {
	if (message)
		this.loadingScreen.show(message);

	else
		this.loadingScreen.hide();

	this.trigger({
		type: "appStateChange",
		message: message,
		progress: progress
	});
}

/**
 * Utility function to get all query string params.
 * @method getQueryStringParams
 * @static
 */
NetPokerClient.getQueryStringParams = function() {
	var params = {};
	(function() {

		var match,
			pl = /\+/g, // Regex for replacing addition symbol with a space
			search = /([^&=]+)=?([^&]*)/g,
			decode = function(s) {
				return decodeURIComponent(s.replace(pl, " "));
			},
			query = window.location.search.substring(1).replace(/amp;/g, "");

		while (match = search.exec(query))
			params[decode(match[1])] = decode(match[2]);
	})();

	return params;
}

module.exports = NetPokerClient;
},{"../../proto/ProtoConnection":46,"../../proto/messages/InitMessage":63,"../../proto/messages/StateCompleteMessage":74,"../../utils/MessageRequestConnection":85,"../../utils/MessageWebSocketConnection":86,"../../utils/UrlUtil":93,"../controller/NetPokerClientController":19,"../resources/DefaultSkin":21,"../resources/Resources":22,"../resources/ViewConfig":23,"../view/LoadingScreen":33,"../view/NetPokerClientView":34,"inherits":7,"pixi.js":8,"pixiapp":9,"tween.js":13,"url":6}],16:[function(require,module,exports){
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
var PreTournamentInfoMessage = require("../../proto/messages/PreTournamentInfoMessage");
var TableButtonsMessage = require("../../proto/messages/TableButtonsMessage");
var TournamentResultMessage = require("../../proto/messages/TournamentResultMessage");

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
	this.messageSequencer.addMessageHandler(PreTournamentInfoMessage.TYPE, this.onPreTournamentInfoMessage, this);
	this.messageSequencer.addMessageHandler(TableButtonsMessage.TYPE, this.onTableButtonsMessage, this);
	this.messageSequencer.addMessageHandler(TournamentResultMessage.TYPE, this.onTournamentResultMessage, this);

	this.messageSequencer.addMessageHandler(PresetButtonsMessage.TYPE, this.onPresetButtons, this);
}

/**
 * Table buttons message.
 * @method onTableButtonsMessage
 */
InterfaceController.prototype.onTableButtonsMessage = function(m) {
	console.log("table buttons...");
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
	tableInfoView.setJoinButtonVisible(m.getShowJoinButton());
	tableInfoView.setLeaveButtonVisible(m.getShowLeaveButton());
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

/**
 * Handle pre torunament info message.
 * @method onPreTournamentInfoMessage
 */
InterfaceController.prototype.onPreTournamentInfoMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setPreTournamentInfoText(m.getText());
}

/**
 * Handle tournament result message.
 * @method onTournamentResultMessage
 */
InterfaceController.prototype.onTournamentResultMessage = function(m) {
	var tableInfoView = this.view.getTableInfoView();

	tableInfoView.setTournamentResultText(m.getText(), m.getRightColumnText());
}

/**
 * Table buttons message.
 * @method onTableButtonsMessage
 */
InterfaceController.prototype.onTableButtonsMessage = function(m) {
	var tableButtonsView = this.view.getTableButtonsView();

	tableButtonsView.showButtons(m.getEnabled(), m.getCurrentIndex());
}

module.exports = InterfaceController;
},{"../../proto/messages/ButtonsMessage":53,"../../proto/messages/ChatMessage":54,"../../proto/messages/CheckboxMessage":55,"../../proto/messages/HandInfoMessage":62,"../../proto/messages/InterfaceStateMessage":64,"../../proto/messages/PreTournamentInfoMessage":68,"../../proto/messages/PresetButtonsMessage":70,"../../proto/messages/ShowDialogMessage":73,"../../proto/messages/TableButtonsMessage":76,"../../proto/messages/TableInfoMessage":77,"../../proto/messages/TournamentResultMessage":80}],17:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var EventDispatcher = require("yaed");
var Sequencer = require("../../utils/Sequencer");
var inherits=require("inherits");

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

inherits(MessageSequenceItem, EventDispatcher);

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
	//console.log("target is complete: "+this.waitEvent);
	this.waitTarget.removeEventListener(this.waitEvent, this.waitClosure);
	this.notifyComplete();
}

module.exports = MessageSequenceItem;
},{"../../utils/Sequencer":91,"inherits":7,"yaed":14}],18:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var Sequencer = require("../../utils/Sequencer");
var EventDispatcher = require("yaed");
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
},{"../../utils/Sequencer":91,"./MessageSequenceItem":17,"yaed":14}],19:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var MessageSequencer = require("./MessageSequencer");
var ProtoConnection = require("../../proto/ProtoConnection");
var ButtonsView = require("../view/ButtonsView");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var SeatClickMessage = require("../../proto/messages/SeatClickMessage");
var PresetButtonClickMessage = require("../../proto/messages/PresetButtonClickMessage");
var NetPokerClientView = require("../view/NetPokerClientView");
var DialogView = require("../view/DialogView");
var TableInfoView = require("../view/TableInfoView");
var SettingsView = require("../view/SettingsView");
var TableController = require("./TableController");
var InterfaceController = require("./InterfaceController");
var ChatMessage = require("../../proto/messages/ChatMessage");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var TableButtonClickMessage = require("../../proto/messages/TableButtonClickMessage");
var ButtonData = require("../../proto/data/ButtonData");
var PresetButtonsView = require("../view/PresetButtonsView");
var TableButtonsView = require("../view/TableButtonsView");

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

	this.netPokerClientView.getButtonsView().on(ButtonsView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.getTableInfoView().on(TableInfoView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.getDialogView().on(DialogView.BUTTON_CLICK, this.onButtonClick, this);
	this.netPokerClientView.on(NetPokerClientView.SEAT_CLICK, this.onSeatClick, this);

	this.netPokerClientView.chatView.addEventListener("chat", this.onViewChat, this);
	this.netPokerClientView.settingsView.addEventListener(SettingsView.BUY_CHIPS_CLICK, this.onBuyChipsButtonClick, this);
	this.netPokerClientView.settingsView.addEventListener(SettingsView.CHECKBOX_CHANGE, this.onCheckboxChange, this);

	this.netPokerClientView.getPresetButtonsView().addEventListener(PresetButtonsView.CHANGE, this.onPresetButtonsChange, this);
	this.netPokerClientView.getTableButtonsView().on(TableButtonsView.TABLE_CLICK, this.onTableButtonClick, this);
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

/**
 * Table button click.
 * @method onTableButtonClick
 */
NetPokerClientController.prototype.onTableButtonClick = function(index) {
	this.protoConnection.send(new TableButtonClickMessage(index));
}

module.exports = NetPokerClientController;
},{"../../proto/ProtoConnection":46,"../../proto/data/ButtonData":47,"../../proto/messages/ButtonClickMessage":52,"../../proto/messages/ChatMessage":54,"../../proto/messages/CheckboxMessage":55,"../../proto/messages/PresetButtonClickMessage":69,"../../proto/messages/SeatClickMessage":71,"../../proto/messages/TableButtonClickMessage":75,"../view/ButtonsView":25,"../view/DialogView":32,"../view/NetPokerClientView":34,"../view/PresetButtonsView":37,"../view/SettingsView":42,"../view/TableButtonsView":43,"../view/TableInfoView":44,"./InterfaceController":16,"./MessageSequencer":18,"./TableController":20}],20:[function(require,module,exports){
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
var EventDispatcher = require("yaed");
var ClearMessage = require("../../proto/messages/ClearMessage");
var PayOutMessage = require("../../proto/messages/PayOutMessage");
var FadeTableMessage = require("../../proto/messages/FadeTableMessage");

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
	this.messageSequencer.addMessageHandler(FadeTableMessage.TYPE, this.onFadeTableMessage, this);
}
EventDispatcher.init(TableController);

/**
 * Fade table.
 * @method onFadeTableMessage
 */
TableController.prototype.onFadeTableMessage = function(m) {
	this.view.fadeTable(m.getVisible(), m.getDirection());
	this.messageSequencer.waitFor(this.view, "fadeTableComplete");
}

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
	//console.log(m);

	for (i = 0; i < m.getCards().length; i++) {
		var cardData = m.getCards()[i];
		var cardView = this.view.getCommunityCards()[m.getFirstIndex() + i];

		cardView.setCardData(cardData);
		cardView.show(m.animate, i * 500);
	}
	if (m.getCards().length > 0) {
		var cardData = m.getCards()[m.getCards().length - 1];
		var cardView = this.view.getCommunityCards()[m.getFirstIndex() + m.getCards().length - 1];
		if (m.animate)
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

		if (m.animate)
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

	for (var i = 0; i < components.length; i++) {
		switch (components[i]) {
			case ClearMessage.POT:
				{
					this.view.potView.setValues([]);
					break;
				}
			case ClearMessage.BETS:
				{
					for (var s = 0; s < this.view.seatViews.length; s++) {
						this.view.seatViews[s].betChips.setValue(0);
					}
					break;
				}
			case ClearMessage.CARDS:
				{
					for (var s = 0; s < this.view.seatViews.length; s++) {
						for (var c = 0; c < this.view.seatViews[s].pocketCards.length; c++) {
							this.view.seatViews[s].pocketCards[c].hide();
						}
					}

					for (var c = 0; c < this.view.communityCards.length; c++) {
						this.view.communityCards[c].hide();
					}
					break;
				}
			case ClearMessage.CHAT:
				{
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
},{"../../proto/messages/ActionMessage":49,"../../proto/messages/BetMessage":50,"../../proto/messages/BetsToPotMessage":51,"../../proto/messages/ClearMessage":56,"../../proto/messages/CommunityCardsMessage":57,"../../proto/messages/DealerButtonMessage":58,"../../proto/messages/DelayMessage":59,"../../proto/messages/FadeTableMessage":60,"../../proto/messages/FoldCardsMessage":61,"../../proto/messages/PayOutMessage":65,"../../proto/messages/PocketCardsMessage":66,"../../proto/messages/PotMessage":67,"../../proto/messages/SeatInfoMessage":72,"../../proto/messages/TimerMessage":79,"yaed":14}],21:[function(require,module,exports){
module.exports = {
	"tableBackground": "__table.png",
	"seatPlate": "__seatPlate.png",
	"timerBackground": "__timerBackground.png",
	"dealerButton": "__dealerButton.png",
	"cardFrame": "__cardFrame.png",
	"cardBack": "__cardBack.png",
	"suitSymbol0": "__suitSymbol0.png",
	"suitSymbol1": "__suitSymbol1.png",
	"suitSymbol2": "__suitSymbol2.png",
	"suitSymbol3": "__suitSymbol3.png",
	"chip0": "__chip0.png",
	"chip1": "__chip1.png",
	"chip2": "__chip2.png",
	"chip3": "__chip3.png",
	"chip4": "__chip4.png",
	"dividerLine": "__dividerLine.png",
	"framePlate": "__framePlate.png",
	"bigButton": "__bigButton.png",
	"dialogButton": "__dialogButton.png",
	"textScrollbarTrack": "__textScrollbarTrack.png",
	"textScrollbarThumb": "__textScrollbarThumb.png",
	"wrenchIcon": "__wrenchIcon.png",
	"chatBackground": "__chatBackground.png",
	"checkboxBackground": "__checkboxBackground.png",
	"checkboxTick": "__checkboxTick.png",
	"buttonBackground": "__buttonBackground.png",
	"sliderBackground": "__sliderBackground.png",
	"sliderKnob": "__sliderKnob.png",
	"upArrow": "__upArrow.png",
	"selectTableButton": "__selectTableButton.png",
	"selectedTableButton": "__selectedTableButton.png",
	"eleminatedTableIcon": "__eleminatedTableIcon.png",

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
};
},{}],22:[function(require,module,exports){
var Thenable = require("tinp");
var PIXI = require("pixi.js");
var UrlUtil = require("../../utils/UrlUtil");
var HttpRequest = require("../../utils/HttpRequest");

/**
 * Resources
 * @class Resources
 */
function Resources() {
	this.spriteSheets = [];
	this.skinSources = [];
	this.data = [];
	this.loadThenable = null;
	this.skinSourceIndex = 0;
}

/**
 * Set sprite sheet.
 * @method setSpriteSheet
 */
Resources.prototype.setSpriteSheet = function(spriteSheet) {
	this.spriteSheets = [spriteSheet];
}

/**
 * Add a sprite sheet.
 * @method addSpriteSheet
 */
Resources.prototype.addSpriteSheet = function(spriteSheet) {
	this.spriteSheets.push(spriteSheet);
}

/**
 * Add a cascading skin source.
 * Object or url.
 * @method source
 */
Resources.prototype.addSkinSource = function(source) {
	this.skinSources.push(source);
}

/**
 * Get a Point resource.
 * @method getPoint
 */
Resources.prototype.getPoint = function(id) {
	this.assertKeyExists(id);

	return new PIXI.Point(this.data[id][0], this.data[id][1]);
}

/**
 * Get a string resource.
 * @method getString
 */
Resources.prototype.getString = function(id) {
	this.assertKeyExists(id);

	return this.data[id].toString();
}

/**
 * Get value.
 * @method getValue
 */
Resources.prototype.getValue = Resources.prototype.getString;

/**
 * Get color.
 * @method getValue
 */
Resources.prototype.getColor = Resources.prototype.getString;

/**
 * Get Texture.
 * @method getTexture
 */
Resources.prototype.getTexture = function(id) {
	var texture = PIXI.Texture.fromFrame(this.getString(id));

	return texture;
}

/**
 * Assert that the key exists.
 * @method assertKeyExists
 * @private
 */
Resources.prototype.assertKeyExists = function(id) {
	if (!this.data.hasOwnProperty(id))
		throw new Error("No such resource: " + id);
}

/**
 * Does this key exist?
 * @method keyExists
 */
Resources.prototype.keyExists = function(id) {
	return this.data.hasOwnProperty(id);
}

/**
 * Load resources.
 * @method load
 */
Resources.prototype.load = function() {
	if (this.loadThenable)
		throw new Error("Already loading");

	this.loadThenable = new Thenable();
	this.skinSourceIndex = 0;

	if (this.spriteSheets.length) {
		this.assetLoader = new PIXI.AssetLoader(this.spriteSheets);
		this.assetLoader.on("onComplete", this.onAssetLoaderComplete.bind(this));
		this.assetLoader.on("onProgress", this.onAssetLoaderProgress.bind(this));
		//console.log("loading assets: "+this.spriteSheets);
		this.assetLoader.load();
	} else {
		this.loadNextSkinSource();
	}

	return this.loadThenable;
}

/**
 * Asset loader progress.
 * @method onAssetLoaderProgress
 */
Resources.prototype.onAssetLoaderProgress = function(ev) {
	console.log("asset loader progress");
	/*	console.log(ev);

		ev.loader.ajaxRequest.onprogress = function() {
			console.log("request progres...");
		};

		ev.loader.ajaxRequest.addEventListener("progress", function() {
			console.log("progress...");
		});*/
}

/**
 * Asset loader complete.
 * @method onAssetLoaderComplete
 */
Resources.prototype.onAssetLoaderComplete = function() {
	//console.log("asset loader complete, loading skin");
	this.loadNextSkinSource();
}

/**
 * Process next skin source in sequence.
 * @method loadNextSkinSource
 * @private
 */
Resources.prototype.loadNextSkinSource = function() {
	if (this.skinSourceIndex >= this.skinSources.length) {
		//console.log("resolving thenable...");
		this.loadThenable.resolve();
		return;
	}

	var o = this.skinSources[this.skinSourceIndex];

	if (typeof o == "object") {
		this.processSkinData(o);
		return;
	}

	var request = new HttpRequest(UrlUtil.makeAbsolute(o));
	request.setResultType("json");

	request.send().then(
		this.onSkinSourceLoaded.bind(this),
		this.onSkinSourceLoadError.bind(this)
	);
}

/**
 * Skin source loaded.
 * @method onSkinSourceLoaded
 */
Resources.prototype.onSkinSourceLoaded = function(data) {
	this.processSkinData(data);
}

/**
 * Skin source load error.
 * @method onSkinSourceLoadError
 */
Resources.prototype.onSkinSourceLoadError = function(error) {
	this.loadThenable.reject(error);
}

/**
 * Process skin data.
 * @method processSkinData
 */
Resources.prototype.processSkinData = function(data) {
	for (i in data)
		this.data[i] = data[i];

	this.skinSourceIndex++;
	this.loadNextSkinSource();
}

module.exports = Resources;
},{"../../utils/HttpRequest":84,"../../utils/UrlUtil":93,"pixi.js":8,"tinp":12}],23:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

/**
 * View configuration.
 * @class ViewConfig
 */
function ViewConfig(resources) {
	this.playAnimations = true;
	this.resources = resources;
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

/**
 * Get resources.
 * @method getResources
 */
ViewConfig.prototype.getResources = function() {
	return this.resources;
}

module.exports = ViewConfig;
},{}],24:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var Button = require("../../utils/Button");
var inherits = require("inherits");

/**
 * Big button.
 * @class BigButton
 */
function BigButton(resources) {
	Button.call(this);

	this.resources = resources;

	this.bigButtonTexture = this.resources.getTexture("bigButton");

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

inherits(BigButton, Button);

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
},{"../../utils/Button":81,"inherits":7,"pixi.js":8}],25:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var Button = require("../../utils/Button");
var Slider = require("../../utils/Slider");
var NineSlice = require("../../utils/NineSlice");
var BigButton = require("./BigButton");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var inherits = require("inherits");

/**
 * Buttons
 * @class ButtonsView
 */
function ButtonsView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;

	this.buttonHolder = new PIXI.DisplayObjectContainer();
	this.addChild(this.buttonHolder);

	var sliderBackground = new NineSlice(this.resources.getTexture("sliderBackground"), 20, 0, 20, 0);
	sliderBackground.setLocalSize(300,sliderBackground.height);
	//sliderBackground.width = 300;

	var knob = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));

	this.slider = new Slider(sliderBackground, knob);
	var pos = this.resources.getPoint("bigButtonPosition");
	this.slider.position.x = pos.x;
	this.slider.position.y = pos.y - 35;
	this.slider.addEventListener("change", this.onSliderChange, this);
	this.addChild(this.slider);


	this.buttonHolder.position.x = 366;
	this.buttonHolder.position.y = 575;

	this.buttons = [];

	for (var i = 0; i < 3; i++) {
		var button = new BigButton(this.resources);
		button.on(Button.CLICK, this.onButtonClick, this);
		button.position.x = i * 105;
		this.buttonHolder.addChild(button);
		this.buttons.push(button);
	}

	var raiseSprite = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));
	var arrowSprite = new PIXI.Sprite(this.resources.getTexture("upArrow"));
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

inherits(ButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(ButtonsView);

ButtonsView.BUTTON_CLICK = "buttonClick";


/**
 * Create raise amount menu.
 * @method createRaiseAmountMenu
 */
ButtonsView.prototype.createRaiseAmountMenu = function() {
	this.raiseAmountMenu = new PIXI.DisplayObjectContainer();

	this.raiseMenuBackground = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
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
		var b = new RaiseShortcutButton(this.resources);
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
},{"../../utils/Button":81,"../../utils/NineSlice":88,"../../utils/Slider":92,"./BigButton":24,"./RaiseShortcutButton":38,"inherits":7,"pixi.js":8,"yaed":14}],26:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");

/**
 * The front view of a card.
 * @class CardFrontView
 */
function CardFrontView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;
};
inherits(CardFrontView, PIXI.DisplayObjectContainer);


CardFrontView.prototype.setCardData = function(cardData) {
	this.cardData = cardData;

	// cardDiamonds2 cardDiamonds3 cardDiamonds4 cardDiamonds5 ...  cardDiamondsQ  cardDiamondsK  cardDiamondsA
	var cardTexture;
	var customName = "card" + this.cardData.getLongSuitString() + this.cardData.getCardValueString();

	if (this.resources.keyExists(customName))
		cardTexture = this.resources.getTexture(customName);

	if (cardTexture) {
		this.frame = new PIXI.Sprite(cardTexture);
		this.addChild(this.frame);
	} else {
		this.frame = new PIXI.Sprite(this.resources.getTexture("cardFrame"));
		this.addChild(this.frame);


		this.suit = new PIXI.Sprite(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
		this.suit.position.x = 8;
		this.suit.position.y = 25;
		this.addChild(this.suit);

		var style = {
			font: "bold 16px Arial"
		};

		this.valueField = new PIXI.Text("[val]", style);
		this.addChild(this.valueField);
		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;
		this.valueField.position.y = 5;

		this.suit.setTexture(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
	}
};



module.exports = CardFrontView;
},{"inherits":7,"pixi.js":8}],27:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var CardFrontView = require("./CardFrontView");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * A card view.
 * @class CardView
 */
function CardView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.viewConfig = viewConfig;
	this.resources = resources;


	this.front = new CardFrontView(this.viewConfig, this.resources);//PIXI.Sprite(this.resources.getTexture("cardFrame"));
	this.addChild(this.front);
/*
	this.suit = new PIXI.Sprite(this.resources.getTexture("suitSymbol" + 0));
	this.suit.position.x = 8;
	this.suit.position.y = 25;
	this.addChild(this.suit);
*/
/*	var style = {
		font: "bold 16px Arial"
	};

	this.valueField = new PIXI.Text("[val]", style);
	this.valueField.position.x = 6;
	this.valueField.position.y = 5;
	this.addChild(this.valueField);
*/
	this.back = new PIXI.Sprite(this.resources.getTexture("cardBack"));
	this.addChild(this.back);


	this.maskGraphics = new PIXI.Graphics();
	this.maskGraphics.beginFill(0x000000);
	this.maskGraphics.drawRect(0, 0, this.back.width, this.back.height);
	this.maskGraphics.endFill();
	this.addChild(this.maskGraphics);

	this.mask = this.maskGraphics;
}

inherits(CardView, PIXI.DisplayObjectContainer);
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
/*
		this.valueField.style.fill = this.cardData.getColor();

		this.valueField.setText(this.cardData.getCardValueString());
		this.valueField.updateTransform();
		this.valueField.position.x = 17 - this.valueField.canvas.width / 2;

		this.suit.setTexture(this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex()));
		*/
		this.front.setCardData(this.cardData);

		this.maskGraphics.beginFill(0x000000);
		this.maskGraphics.drawRect(0, 0, this.front.width, this.front.height);
		this.maskGraphics.endFill();
	}
	this.back.visible = true;
	this.front.visible = false;
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
		this.front.visible = true;
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
},{"./CardFrontView":26,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],28:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var NineSlice = require("../../utils/NineSlice");
var Slider = require("../../utils/Slider");
var PixiTextInput = require("pixitextinput");
var MouseOverGroup = require("../../utils/MouseOverGroup");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Chat view.
 * @class ChatView
 */
function ChatView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;
	this.margin = 5;

	
	var chatPlate = new NineSlice(this.resources.getTexture("framePlate"), 10);
	chatPlate.position.x = 10;
	chatPlate.position.y = 540;
	chatPlate.setLocalSize(330, 130);
	this.addChild(chatPlate);

	var s = new NineSlice(this.resources.getTexture("framePlate"), 10);
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



	var slideBack = new NineSlice(this.resources.getTexture("textScrollbarTrack"), 10, 0, 10, 0);
	slideBack.width = 107;
	var slideKnob = new NineSlice(this.resources.getTexture("textScrollbarThumb"), 10, 0, 10, 0);
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

inherits(ChatView, PIXI.DisplayObjectContainer);
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

},{"../../utils/MouseOverGroup":87,"../../utils/NineSlice":88,"../../utils/Slider":92,"inherits":7,"pixi.js":8,"pixitextinput":10,"yaed":14}],29:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * A chips view.
 * @class ChipsView
 */
function ChipsView(viewConfig, resources, showToolTip) {
	PIXI.DisplayObjectContainer.call(this);
	this.targetPosition = null;

	this.viewConfig = viewConfig;
	this.resources = resources;

	this.align = "left";

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

inherits(ChipsView, PIXI.DisplayObjectContainer);
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
	//console.log("setting target position: " + JSON.stringify(position));

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
			var texture = this.resources.getTexture("chip" + (i % 5));
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
					fill: this.resources.getColor("chipsColor" + (i % 5))
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
		case "left":
		case "L":
			this.holder.x = 0;
			break;

		case "center":
		case "C":
			this.holder.x = -this.holder.width / 2;
			break;

		case "right":
		case "R":
			this.holder.x = -this.holder.width;
			break;

		default:
			throw new Error("unknown align: " + this.align);
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
		y: this.resources.getPoint("potPosition").y
	};

	switch (this.align) {
		case "left":
		case "L":
			o.x = this.resources.getPoint("potPosition").x - this.width / 2;
			break;

		case "center":
		case "C":
			o.x = this.resources.getPoint("potPosition").x;
			break;

		case "right":
		case "R":
			o.x = this.resources.getPoint("potPosition").x + this.width / 2;
			break;

		default:
			throw new Error("unknown align: " + this.align);
			break;
	}

	var time = this.viewConfig.scaleAnimationTime(500);
	var tween = new TWEEN.Tween(this)
		.to({
			y: this.resources.getPoint("potPosition").y,
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
	this.position.y = this.resources.getPoint("potPosition").y;

	switch (this.align) {
		case "left":
		case "L":
			this.position.x = this.resources.getPoint("potPosition").x - this.width / 2;
			break;

		case "center":
		case "C":
			this.position.x = this.resources.getPoint("potPosition").x;
			break;

		case "right":
		case "R":
			this.position.x = this.resources.getPoint("potPosition").x + this.width / 2;
			break;

		default:
			throw new Error("unknown align: " + this.align);
			break;
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
},{"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],30:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Dialog view.
 * @class DealerButtonView
 */
function DealerButtonView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

	var dealerButtonTexture = this.resources.getTexture("dealerButton");
	this.sprite = new PIXI.Sprite(dealerButtonTexture);
	this.addChild(this.sprite);
	this.hide();
}

inherits(DealerButtonView, PIXI.DisplayObjectContainer);
EventDispatcher.init(DealerButtonView);

/**
 * Set seat index
 * @method setSeatIndex
 */
DealerButtonView.prototype.setSeatIndex = function(seatIndex) {
	this.position.x = this.resources.getPoint("dealerButtonPosition"+seatIndex).x;
	this.position.y = this.resources.getPoint("dealerButtonPosition"+seatIndex).y;
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
	var destination = this.resources.getPoint("dealerButtonPosition"+seatIndex);
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
},{"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],31:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var Button = require("../../utils/Button");
var inherits = require("inherits");

/**
 * Dialog button.
 * @class DialogButton
 */
function DialogButton(resources) {
	Button.call(this);

	this.buttonTexture = resources.getTexture("dialogButton");
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

inherits(DialogButton, Button);

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
},{"../../utils/Button":81,"inherits":7,"pixi.js":8}],32:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var NineSlice = require("../../utils/NineSlice");
var DialogButton = require("./DialogButton");
var ButtonData = require("../../proto/data/ButtonData");
var PixiTextInput = require("pixitextinput");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * Dialog view.
 * @class DialogView
 */
function DialogView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;

	var cover = new PIXI.Graphics();
	cover.beginFill(0x000000, .5);
	cover.drawRect(-1000, -1000, 960 + 2000, 720 + 2000);
	cover.endFill();
	cover.interactive = true;
	//cover.buttonMode = true;
	cover.hitArea = new PIXI.Rectangle(0, 0, 960, 720);
	this.addChild(cover);

	var b = new NineSlice(this.resources.getTexture("framePlate"), 10);
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
		var b = new DialogButton(this.resources);

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

inherits(DialogView, PIXI.DisplayObjectContainer);
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
},{"../../proto/data/ButtonData":47,"../../utils/NineSlice":88,"./DialogButton":31,"inherits":7,"pixi.js":8,"pixitextinput":10,"yaed":14}],33:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var Gradient = require("../../utils/Gradient");
var inherits = require("inherits");

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

inherits(LoadingScreen, PIXI.DisplayObjectContainer);

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
},{"../../utils/Gradient":83,"inherits":7,"pixi.js":8}],34:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
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
var TableButtonsView = require("./TableButtonsView");
var inherits = require("inherits");
var TWEEN = require("tween.js");
var FadeTableMessage = require("../../proto/messages/FadeTableMessage");

/**
 * Net poker client view.
 * @class NetPokerClientView
 */
function NetPokerClientView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;
	this.setupBackground();

	this.tableContainer = new PIXI.DisplayObjectContainer();
	this.addChild(this.tableContainer);

	this.tableBackground = new PIXI.Sprite(this.resources.getTexture("tableBackground"));
	this.tableContainer.addChild(this.tableBackground);
	this.tableBackground.position.x = this.resources.getPoint("tablePosition").x;
	this.tableBackground.position.y = this.resources.getPoint("tablePosition").y;

	this.setupSeats();
	this.setupCommunityCards();

	this.timerView = new TimerView(this.viewConfig, this.resources);
	this.tableContainer.addChild(this.timerView);

	this.chatView = new ChatView(this.viewConfig, this.resources);
	this.addChild(this.chatView);

	this.buttonsView = new ButtonsView(this.viewConfig, this.resources);
	this.addChild(this.buttonsView);

	this.dealerButtonView = new DealerButtonView(this.viewConfig, this.resources);
	this.tableContainer.addChild(this.dealerButtonView);

	this.tableInfoView = new TableInfoView(this.viewConfig, this.resources);
	this.addChild(this.tableInfoView);

	this.potView = new PotView(this.viewConfig, this.resources);
	this.tableContainer.addChild(this.potView);
	this.potView.position.x = this.resources.getPoint("potPosition").x;
	this.potView.position.y = this.resources.getPoint("potPosition").y;

	this.settingsView = new SettingsView(this.viewConfig, this.resources);
	this.addChild(this.settingsView);

	this.dialogView = new DialogView(this.viewConfig, this.resources);
	this.addChild(this.dialogView);

	this.presetButtonsView = new PresetButtonsView(this.viewConfig, this.resources);
	this.addChild(this.presetButtonsView);

	this.tableButtonsView = new TableButtonsView(this.viewConfig);
	this.addChild(this.tableButtonsView);

	this.setupChips();

	this.fadeTableTween = null;
}

inherits(NetPokerClientView, PIXI.DisplayObjectContainer);
EventDispatcher.init(NetPokerClientView);

NetPokerClientView.SEAT_CLICK = "seatClick";
NetPokerClientView.FADE_TABLE_COMPLETE = "fadeTableComplete";

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

	var s = new PIXI.Sprite(this.resources.getTexture("dividerLine"));
	s.x = 345;
	s.y = 540;
	this.addChild(s);

	var s = new PIXI.Sprite(this.resources.getTexture("dividerLine"));
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

	for (i = 0; i < 10; i++) {
		var seatView = new SeatView(this.resources, i);
		var p = seatView.position;

		for (j = 0; j < 2; j++) {
			var c = new CardView(this.viewConfig, this.resources);
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
	for (i = 0; i < 10; i++) {
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
 * Get table buttons view.
 * @method getTableButtonsView
 */
NetPokerClientView.prototype.getTableButtonsView = function() {
	return this.tableButtonsView;
}

/**
 * Fade table.
 * @method fadeTable
 */
NetPokerClientView.prototype.fadeTable = function(visible, direction) {
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
NetPokerClientView.prototype.onFadeOutComplete = function() {
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
NetPokerClientView.prototype.onFadeInComplete = function() {
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
NetPokerClientView.prototype.clearTableContents = function() {
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
NetPokerClientView.prototype.clear = function() {
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

module.exports = NetPokerClientView;
},{"../../proto/messages/FadeTableMessage":60,"../../utils/Gradient":83,"../../utils/Point":90,"../view/PresetButtonsView":37,"../view/SettingsView":42,"../view/TableInfoView":44,"./ButtonsView":25,"./CardView":27,"./ChatView":28,"./ChipsView":29,"./DealerButtonView":30,"./DialogView":32,"./PotView":35,"./SeatView":39,"./TableButtonsView":43,"./TimerView":45,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],35:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var ChipsView = require("./ChipsView");
var inherits = require("inherits");

/**
 * A pot view
 * @class PotView
 */
function PotView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);
	
	this.viewConfig = viewConfig
	this.resources = resources;
	this.value = 0;

	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.stacks = new Array();
}

inherits(PotView, PIXI.DisplayObjectContainer);
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
		var chips = new ChipsView(this.viewConfig, this.resources, false);
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
},{"./ChipsView":29,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],36:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var ButtonData = require("../../proto/data/ButtonData");
var inherits = require("inherits");

/**
 * A pot view
 * @class PresetButton
 */
function PresetButton(resources) {
	PIXI.DisplayObjectContainer.call(this);
	
	this.resources = resources;

	this.id = null;
	this.visible = false;
	this.value = 0;

	var b = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
	var t = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
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

inherits(PresetButton, PIXI.DisplayObjectContainer);
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
},{"../../proto/data/ButtonData":47,"../../utils/Checkbox":82,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],37:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var PresetButton = require("./PresetButton");
var inherits = require("inherits");

/**
 * A pot view
 * @class PresetButtonsView
 */
function PresetButtonsView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources;

	this.buttons = new Array();
	var origin = this.resources.getPoint("bigButtonPosition");

	for (var i = 0; i < 6; i++) {
		var p = new PresetButton(this.resources);
		p.addEventListener(PresetButton.CHANGE, this.onPresetButtonChange, this);
		p.x = origin.x + 30 + 140 * (i % 2);
		p.y = origin.y + 35 * Math.floor(i / 2);
		this.addChild(p);
		this.buttons.push(p);
	}

	this.hide();
}

inherits(PresetButtonsView, PIXI.DisplayObjectContainer);
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
},{"./PresetButton":36,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],38:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var inherits = require("inherits");

/**
 * Raise shortcut button
 * @class RaiseShortcutButton
 */
function RaiseShortcutButton(resources) {
	var background = new NineSlice(resources.getTexture("buttonBackground"), 10, 5, 10, 5);
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

inherits(RaiseShortcutButton, Button);
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
},{"../../utils/Button":81,"../../utils/Checkbox":82,"../../utils/NineSlice":88,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],39:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var inherits = require("inherits");

/**
 * A seat view.
 * @class SeatView
 */
function SeatView(resources, seatIndex) {
	Button.call(this);

	this.pocketCards = [];
	this.resources = resources;
	this.seatIndex = seatIndex;

	var seatTexture = this.resources.getTexture("seatPlate");
	var seatSprite = new PIXI.Sprite(seatTexture);

	seatSprite.position.x = -seatTexture.width / 2;
	seatSprite.position.y = -seatTexture.height / 2;

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

inherits(SeatView, Button);

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
	if (!name)
		name = "";

	this.nameField.setText(name);
	this.nameField.x = -this.nameField.width / 2;
}

/**
 * Set name.
 * @method setChips
 */
SeatView.prototype.setChips = function(chips) {
	if (chips === undefined || chips === null)
		chips = "";

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
},{"../../utils/Button":81,"inherits":7,"pixi.js":8,"tween.js":13}],40:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");
var inherits = require("inherits");
var PIXI = require("pixi.js");

/**
 * Select table button.
 * @class SelectTableButton
 */
function SelectTableButton(viewConfig) {
	this.resources = viewConfig.getResources();

	Button.call(this);

	this.background = new PIXI.Sprite(this.resources.getTexture("selectTableButton"));
	this.addChild(this.background);

	this.selectedBackground = new PIXI.Sprite(this.resources.getTexture("selectedTableButton"));
	this.addChild(this.selectedBackground);


	var style = {
		font: "bold 12px Times New Roman",
		fill: "#ffffff",
	};

	this.indexField = new PIXI.Text("1", style);
	this.indexField.y = 4;
	this.addChild(this.indexField);
	this.setTableIndex(0);

	this.eleminatedIcon = new PIXI.Sprite(this.resources.getTexture("eleminatedTableIcon"));
	this.eleminatedIcon.x = this.width / 2 - this.eleminatedIcon.width / 2;
	this.eleminatedIcon.y = this.height / 2 - this.eleminatedIcon.height / 2;
	this.addChild(this.eleminatedIcon);

	this.setCurrent(false);

}

inherits(SelectTableButton, Button);

/**
 * Set table index.
 * @method setTableIndex
 */
SelectTableButton.prototype.setTableIndex = function(index) {
	this.indexField.setText(index + 1);
	this.indexField.x = 20 - this.indexField.width / 2;
}

/**
 * Set enabled.
 * @method setEnabled
 */
SelectTableButton.prototype.setEnabled = function(enabled) {
	Button.prototype.setEnabled.call(this, enabled);

	this.eleminatedIcon.visible = !enabled;

	this.alpha = enabled ? 1 : .5;
}

/**
 * Set current.
 * @method setEnabled
 */
SelectTableButton.prototype.setCurrent = function(current) {
	this.selectedBackground.visible = current;
}

module.exports = SelectTableButton;
},{"../../utils/Button":81,"inherits":7,"pixi.js":8}],41:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var EventDispatcher = require("yaed");
var Checkbox = require("../../utils/Checkbox");
var inherits = require("inherits");

/**
 * Checkboxes view
 * @class SettingsCheckbox
 */
function SettingsCheckbox(resources, id, string) {
 	PIXI.DisplayObjectContainer.call(this);

 	this.resources = resources;
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

 	var background = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
 	var tick = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
 	tick.x = 1;

 	this.checkbox = new Checkbox(background, tick);
 	this.checkbox.position.y = y;
 	this.addChild(this.checkbox);

 	this.checkbox.addEventListener("change", this.onCheckboxChange, this);
}

inherits(SettingsCheckbox, PIXI.DisplayObjectContainer);
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
},{"../../utils/Button":81,"../../utils/Checkbox":82,"../../utils/NineSlice":88,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],42:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var Button = require("../../utils/Button");
var NineSlice = require("../../utils/NineSlice");
var EventDispatcher = require("yaed");
var SettingsCheckbox = require("./SettingsCheckbox");
var RaiseShortcutButton = require("./RaiseShortcutButton");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ButtonData = require("../../proto/data/ButtonData");
var inherits = require("inherits");

/**
 * A settings view
 * @class SettingsView
 */
function SettingsView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

	var object = new PIXI.DisplayObjectContainer();
	var bg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
	bg.setLocalSize(30, 30);
	object.addChild(bg);

	var sprite = new PIXI.Sprite(this.resources.getTexture("wrenchIcon"));
	sprite.x = 5;
	sprite.y = 5;
	object.addChild(sprite);

	this.settingsButton = new Button(object);
	this.settingsButton.position.x = 960 - 10 - this.settingsButton.width;
	this.settingsButton.position.y = 543;
	this.settingsButton.addEventListener(Button.CLICK, this.onSettingsButtonClick, this);
	this.addChild(this.settingsButton);

	this.settingsMenu = new PIXI.DisplayObjectContainer();

	var mbg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
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

	//console.log("setting up settings, viewconfig=" + this.viewConfig);

	this.createMenuSetting("playAnimations", "Play animations", 40, this.viewConfig.getPlayAnimations());
	this.createMenuSetting(CheckboxMessage.AUTO_MUCK_LOSING, "Muck losing hands", 65);

	this.createSetting(CheckboxMessage.AUTO_POST_BLINDS, "Post blinds", 0);
	this.createSetting(CheckboxMessage.SITOUT_NEXT, "Sit out", 25);

	this.settingsMenu.visible = false;

	this.buyChipsButton = new RaiseShortcutButton(this.resources);
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

inherits(SettingsView, PIXI.DisplayObjectContainer);
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
	var setting = new SettingsCheckbox(this.resources, id, string);

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
	var setting = new SettingsCheckbox(this.resources, id, string);

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
	//console.log("setting checkbox state for: " + id);

	this.settings[id].setChecked(checked);
}

module.exports = SettingsView;
},{"../../proto/data/ButtonData":47,"../../proto/messages/CheckboxMessage":55,"../../utils/Button":81,"../../utils/NineSlice":88,"./RaiseShortcutButton":38,"./SettingsCheckbox":41,"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],43:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");
var EventDispatcher = require("yaed");
var SelectTableButton = require("./SelectTableButton");
var Button = require("../../utils/Button");

/**
 * Select table during tournament.
 * @class TableButtonsView
 */
function TableButtonsView(viewConfig) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;

	this.holder = new PIXI.DisplayObjectContainer();
	this.addChild(this.holder);

	this.buttons = [];
	this.holder.y = 10;
}

inherits(TableButtonsView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableButtonsView);

TableButtonsView.TABLE_CLICK = "tableClick";

/**
 * Show buttons.
 * @method showButtons
 */
TableButtonsView.prototype.showButtons = function(enabled, currentIndex) {
	for (var b = 0; b < this.buttons.length; b++)
		this.holder.removeChild(this.buttons[b]);

	this.buttons = [];

	for (var i = 0; i < enabled.length; i++) {
		var button = new SelectTableButton(this.viewConfig);
		button.on(Button.CLICK, this.onButtonClick, this);
		button.x = (i % 4) * 40;
		button.y = Math.floor(i / 4) * 24;
		button.setEnabled(enabled[i]);
		button.setTableIndex(i);

		if (i == currentIndex)
			button.setCurrent(true);

		this.buttons.push(button);
		this.holder.addChild(button);
	}

	this.holder.x = 960 - 10 - this.holder.width;
}

/**
 * Clear.
 * @method clear
 */
TableButtonsView.prototype.clear = function() {
	for (var b = 0; b < this.buttons.length; b++)
		this.holder.removeChild(this.buttons[b]);

	this.buttons = [];
}

/**
 * Button click.
 * @method onButtonClick
 */
TableButtonsView.prototype.onButtonClick = function(ev) {
	var index = this.buttons.indexOf(ev.target);

	this.trigger(TableButtonsView.TABLE_CLICK, index);
}

module.exports = TableButtonsView;
},{"../../utils/Button":81,"./SelectTableButton":40,"inherits":7,"pixi.js":8,"yaed":14}],44:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var DialogButton = require("./DialogButton");
var inherits = require("inherits");
var ButtonData = require("../../proto/data/ButtonData");
var ObjectUtil = require("../../utils/ObjectUtil");

/**
 * Show table info.
 * @class TableInfoView
 */
function TableInfoView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.viewConfig = viewConfig;
	this.resources = resources;

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

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		align: "center"
	};

	this.preTournamentInfoText = new PIXI.Text("<PreTournamentInfoText>", style);
	this.preTournamentInfoText.position.y = 360;
	//this.preTournamentInfoText.position.y = 280;
	this.preTournamentInfoText.position.x = Math.round(960 - 300) / 2;
	this.preTournamentInfoText.alpha = .25;
	this.addChild(this.preTournamentInfoText);

	var style = {
		font: "bold 12px Arial",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 1,
		stroke: "#000000",
		strokeThickness: 1,
	};

	this.handInfoText = new PIXI.Text("<HandInfoText>", style);
	this.handInfoText.position.y = 10;
	this.handInfoText.position.x = 10; //960 - this.handInfoText.width;
	this.addChild(this.handInfoText);

	this.joinButton = new DialogButton(this.resources);
	this.joinButton.position.x = 355;
	this.joinButton.setText("JOIN");
	this.joinButton.visible = false;
	this.joinButton.on("click", this.onButtonClick, this);
	this.addChild(this.joinButton);

	this.leaveButton = new DialogButton(this.resources);
	this.leaveButton.position.x = 355;
	this.leaveButton.setText("LEAVE");
	this.leaveButton.visible = false;
	this.leaveButton.on("click", this.onButtonClick, this);
	this.addChild(this.leaveButton);

	var style = {
		font: "bold 24px Times New Roman",
		fill: "#ffffff",
		dropShadow: true,
		dropShadowColor: "#000000",
		dropShadowDistance: 2,
		stroke: "#000000",
		strokeThickness: 2
	};

	this.tournamentResultLeftField = new PIXI.Text("<left>", style);
	this.addChild(this.tournamentResultLeftField);

	var style2 = ObjectUtil.copy(style);
	style2.align = 'right';

	this.tournamentResultRightField = new PIXI.Text("<right>", style2);
	this.addChild(this.tournamentResultRightField);

	this.tournamentResultLeftField.y = 260;
	this.tournamentResultRightField.y = 260;
}

inherits(TableInfoView, PIXI.DisplayObjectContainer);
EventDispatcher.init(TableInfoView);

TableInfoView.BUTTON_CLICK = "buttonClick";

/**
 * Set left and right column.
 * @method setTournamentResultText
 */
TableInfoView.prototype.setTournamentResultText = function(left, right) {
	this.tournamentResultLeftField.setText(left);
	this.tournamentResultRightField.setText(right);

	this.tournamentResultLeftField.x = 480 - 180;
	this.tournamentResultRightField.x = 480 + 180 - this.tournamentResultRightField.width;

	var h = this.tournamentResultLeftField.height;

	this.tournamentResultLeftField.y = 300 - h / 2;
	this.tournamentResultRightField.y = 300 - h / 2;
}

/**
 * Set table info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setTableInfoText = function(s) {
	if (!s)
		s = "";

	this.tableInfoText.setText(s);
	this.joinButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
	this.leaveButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
}

/**
 * Set pre tournament info text.
 * @method setPreTournamentInfoText
 */
TableInfoView.prototype.setPreTournamentInfoText = function(s) {
	if (!s)
		s = "";

	this.preTournamentInfoText.setText(s);
	this.preTournamentInfoText.position.x = 960 / 2 - this.preTournamentInfoText.width / 2;
}

/**
 * Join button.
 * @method setJoinButtonVisible
 */
TableInfoView.prototype.setJoinButtonVisible = function(value) {
	this.joinButton.visible = value;
}

/**
 * Join button
 * @method setLeaveButtonVisible
 */
TableInfoView.prototype.setLeaveButtonVisible = function(value) {
	this.leaveButton.visible = value;
}

/**
 * Set hand info text.
 * @method setTableInfoText
 */
TableInfoView.prototype.setHandInfoText = function(s) {
	if (!s)
		s = "";

	this.handInfoText.setText(s);
	this.handInfoText.updateTransform();
}

/**
 * Clear.
 * @method clear
 */
TableInfoView.prototype.clear = function() {
	this.tableInfoText.setText("");
	this.handInfoText.setText("");
	this.preTournamentInfoText.setText("");
	this.tournamentResultLeftField.setText("");
	this.tournamentResultRightField.setText("");
	this.joinButton.visible = false;
	this.leaveButton.visible = false;
}

/**
 * Button click
 * @method onButtonClick
 * @private
 */
TableInfoView.prototype.onButtonClick = function(e) {
	this.joinButton.visible = false;
	this.leaveButton.visible = false;

	var ev = {
		type: TableInfoView.BUTTON_CLICK
	};

	if (e.target == this.joinButton)
		ev.button = ButtonData.JOIN_TOURNAMENT;

	if (e.target == this.leaveButton)
		ev.button = ButtonData.LEAVE_TOURNAMENT;

	console.log("button click");
	this.trigger(ev);
}

module.exports = TableInfoView;
},{"../../proto/data/ButtonData":47,"../../utils/ObjectUtil":89,"./DialogButton":31,"inherits":7,"pixi.js":8,"yaed":14}],45:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * A timer view
 * @class TimerView
 */
function TimerView(viewConfig, resources) {
	PIXI.DisplayObjectContainer.call(this);

	this.resources = resources

	this.timerClip = new PIXI.Sprite(this.resources.getTexture("timerBackground"));
	this.addChild(this.timerClip);


	this.canvas = new PIXI.Graphics();
	this.canvas.x = this.timerClip.width * 0.5;
	this.canvas.y = this.timerClip.height * 0.5;
	this.timerClip.addChild(this.canvas);

	this.timerClip.visible = false;

	this.tween = null;

	//this.showPercent(30);
}

inherits(TimerView, PIXI.DisplayObjectContainer);
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

	var seatPosition = this.resources.getPoint("seatPosition" + seatIndex);
	var timerOffset = this.resources.getPoint("timerOffset");

	this.timerClip.x = seatPosition.x + timerOffset.x;
	this.timerClip.y = seatPosition.y + timerOffset.y;

	this.stop();

}

/**
 * Stop.
 * @method stop
 */
TimerView.prototype.stop = function(seatIndex) {
	if (this.tween != null)
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

	this.tween = new TWEEN.Tween({
			time: time
		})
		.to({
			time: this.stopAt
		}, timeLeft)
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
	var percent = 100 * (time - this.startAt) / (this.stopAt - this.startAt);

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
	this.canvas.drawCircle(0, 0, 10);
	this.canvas.endFill();

	this.canvas.beginFill(0xffffff);
	this.canvas.moveTo(0, 0);
	for (var i = 0; i < 33; i++) {
		this.canvas.lineTo(
			10 * Math.cos(i * value * 2 * Math.PI / (32 * 100) - Math.PI / 2),
			10 * Math.sin(i * value * 2 * Math.PI / (32 * 100) - Math.PI / 2)
		);
	}

	this.canvas.lineTo(0, 0);
	this.canvas.endFill();

}

module.exports = TimerView;
},{"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],46:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

var EventDispatcher = require("yaed");
var inherits = require("inherits");

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

inherits(ProtoConnection, EventDispatcher);

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

	this.close();

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
 * Close the underlying connection. Only close it if the readyState is undefined,
 * i.e. we are in a node.js environment, or if it says that it is actually open.
 * @method close
 */
ProtoConnection.prototype.close = function() {
	if (!this.connection)
		return;

	if (this.connection.readyState === undefined ||
		this.connection.readyState == 1)
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
},{"./messages/ActionMessage":49,"./messages/BetMessage":50,"./messages/BetsToPotMessage":51,"./messages/ButtonClickMessage":52,"./messages/ButtonsMessage":53,"./messages/ChatMessage":54,"./messages/CheckboxMessage":55,"./messages/ClearMessage":56,"./messages/CommunityCardsMessage":57,"./messages/DealerButtonMessage":58,"./messages/DelayMessage":59,"./messages/FadeTableMessage":60,"./messages/FoldCardsMessage":61,"./messages/HandInfoMessage":62,"./messages/InitMessage":63,"./messages/InterfaceStateMessage":64,"./messages/PayOutMessage":65,"./messages/PocketCardsMessage":66,"./messages/PotMessage":67,"./messages/PreTournamentInfoMessage":68,"./messages/PresetButtonClickMessage":69,"./messages/PresetButtonsMessage":70,"./messages/SeatClickMessage":71,"./messages/SeatInfoMessage":72,"./messages/ShowDialogMessage":73,"./messages/StateCompleteMessage":74,"./messages/TableButtonClickMessage":75,"./messages/TableButtonsMessage":76,"./messages/TableInfoMessage":77,"./messages/TestCaseRequestMessage":78,"./messages/TimerMessage":79,"./messages/TournamentResultMessage":80,"inherits":7,"yaed":14}],47:[function(require,module,exports){
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
},{}],48:[function(require,module,exports){
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
CardData.LONG_SUIT_STRINGS =
	["Diamonds", "Clubs", "Hearts", "Spades"];

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
 * Get long suit string.
 * @method getLongSuitString
 */
CardData.prototype.getLongSuitString = function() {
	return CardData.LONG_SUIT_STRINGS[this.getSuitIndex()];
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
},{}],49:[function(require,module,exports){
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
},{}],50:[function(require,module,exports){
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
},{}],51:[function(require,module,exports){
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
},{}],52:[function(require,module,exports){
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
},{}],53:[function(require,module,exports){
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
},{"../data/ButtonData":47}],54:[function(require,module,exports){
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
},{}],55:[function(require,module,exports){
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
},{}],56:[function(require,module,exports){
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
},{}],57:[function(require,module,exports){
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
},{"../data/CardData":48}],58:[function(require,module,exports){
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
},{}],59:[function(require,module,exports){
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
},{}],60:[function(require,module,exports){
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

FadeTableMessage.LEFT = "left";
FadeTableMessage.RIGHT = "right";

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
},{}],61:[function(require,module,exports){
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
},{}],62:[function(require,module,exports){
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
},{}],63:[function(require,module,exports){
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
	this.tournamentId = null;
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
 * Set table id.
 * @method setTournamentId
 */
InitMessage.prototype.setTournamentId = function(id) {
	this.tournamentId = id;
}

/**
 * Get table id.
 * @method getTournamentId
 */
InitMessage.prototype.getTournamentId = function() {
	return this.tournamentId;
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
	this.tournamentId = data.tournamentId;
}

/**
 * Serialize message.
 * @method serialize
 */
InitMessage.prototype.serialize = function() {
	return {
		token: this.token,
		tableId: this.tableId,
		viewCase: this.viewCase,
		tournamentId: this.tournamentId
	};
}

module.exports = InitMessage;
},{}],64:[function(require,module,exports){
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
},{}],65:[function(require,module,exports){
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
},{}],66:[function(require,module,exports){
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
},{"../data/CardData":48}],67:[function(require,module,exports){
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
},{}],68:[function(require,module,exports){
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
	if (this.countdown < 0)
		this.countdown = 0;

	return {
		text: this.text,
		countdown: this.countdown
	};
}

module.exports = PreTournamentInfoMessage;
},{}],69:[function(require,module,exports){
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
},{}],70:[function(require,module,exports){
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
},{"../data/ButtonData":47}],71:[function(require,module,exports){
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
},{}],72:[function(require,module,exports){
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
},{}],73:[function(require,module,exports){
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
},{}],74:[function(require,module,exports){
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
},{}],75:[function(require,module,exports){
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
},{}],76:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Received when ?.
 * @class TableButtonsMessage
 */
function TableButtonsMessage() {
	this.enabled = [];
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
 * Setter.
 * @method getEnabled
 */
TableButtonsMessage.prototype.setEnabled = function(enabled) {
	this.enabled = enabled;
}

/**
 * Setter.
 * @method setCurrentIndex
 */
TableButtonsMessage.prototype.setCurrentIndex = function(currentIndex) {
	this.currentIndex = currentIndex;
}

/**
 * Getter.
 * @method getPlayerIndex
 */
/*TableButtonsMessage.prototype.getPlayerIndex = function() {
	return this.playerIndex;
}*/

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
	for (var i = 0; i < data.enabled.length; i++)
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

	for (var i = 0; i < this.enabled.length; i++)
		object.enabled.push(this.enabled[i]);

	return object;
}

module.exports = TableButtonsMessage;
},{}],77:[function(require,module,exports){
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
 * Setter.
 * @method getShowJoinButton
 */
TableInfoMessage.prototype.setShowJoinButton = function(value) {
	this.showJoinButton = value;
}

/**
 * Setter.
 * @method getShowLeaveButton
 */
TableInfoMessage.prototype.setShowLeaveButton = function(value) {
	this.showLeaveButton = value;
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
	if (data.text != null)
		this.text = data.text;

	if (data.countdown != null)
		this.countdown = data.countdown;

	if (data.showJoinButton != null)
		this.showJoinButton = data.showJoinButton;

	if (data.showLeaveButton != null)
		this.showLeaveButton = data.showLeaveButton;

	if (data.infoLink != null)
		this.infoLink = data.infoLink;

	if (data.infoLinkText != null)
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
},{}],78:[function(require,module,exports){
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
},{}],79:[function(require,module,exports){
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
},{}],80:[function(require,module,exports){
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
},{}],81:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

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

inherits(Button, PIXI.DisplayObjectContainer);
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

/**
 * Enabled.
 * @method setEnabled
 */
Button.prototype.setEnabled = function(value) {
	if (value) {
		this.interactive = true;
		this.buttonMode = true;
	} else {
		this.interactive = false;
		this.buttonMode = false;
	}
}

module.exports = Button;
},{"inherits":7,"pixi.js":8,"yaed":14}],82:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var Button = require("./Button");
var inherits = require("inherits");

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

inherits(Checkbox, PIXI.DisplayObjectContainer);
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
},{"./Button":81,"inherits":7,"pixi.js":8,"yaed":14}],83:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");

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

module.exports = Gradient;
},{"pixi.js":8}],84:[function(require,module,exports){
var Thenable = require("tinp");

/**
 * Wraps XMLHttpRequest.
 * @class HttpRequest
 */
function HttpRequest(url) {
	this.url = url;
	this.thenable = null;
	this.resultType = null;
}

/**
 * Set result type.
 * @method setResultType
 */
HttpRequest.prototype.setResultType = function(type) {
	this.resultType = type;
}

/**
 * Set url.
 * @method setUrl
 */
HttpRequest.prototype.setUrl = function(url) {
	this.url = url;
}

/**
 * Send.
 * @method send
 */
HttpRequest.prototype.send = function(url) {
	if (this.thenable)
		throw new Error("Request already sent");

	if (url)
		this.url = url;

	this.thenable = new Thenable();

	this.request = new XMLHttpRequest();
	this.request.open("GET", this.url, true);

	this.request.onload = this.onRequestLoad.bind(this);
	this.request.onerror = this.onRequestError.bind(this);

	this.request.send();

	return this.thenable;
}

/**
 * @method onRequestLoad
 * @private
 */
HttpRequest.prototype.onRequestLoad = function() {
	if (this.request.status != 200) {
		this.thenable.reject(this.request.status);
		this.thenable = null;
		return;
	}

	var result = this.request.responseText;

	switch (this.resultType) {
		case "json":
			try {
				result = JSON.parse(this.request.responseText);
			} catch (e) {
				this.thenable.reject("JSON.parse: "+e);
				return;
			}
			break;
	}

	this.thenable.resolve(result);
}

/**
 * @method onRequestError
 * @private
 */
HttpRequest.prototype.onRequestError = function(e) {
	this.request = null;

	this.thenable.reject(e);
}

module.exports = HttpRequest;
},{"tinp":12}],85:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var Thenable = require("tinp");
var inherits = require("inherits");
var EventDispatcher = require("yaed");
var HttpRequest = require("../utils/HttpRequest");

/**
 * A "connection" that loads its messages from a json file rather than
 * actually connecting.
 * @class MessageRequestConnection
 */
function MessageRequestConnection() {
	EventDispatcher.call(this);
	this.test = 1;
}

inherits(MessageRequestConnection, EventDispatcher);

MessageRequestConnection.CONNECT = "connect";
MessageRequestConnection.MESSAGE = "message";
MessageRequestConnection.CLOSE = "close";

/**
 * Connect.
 * @method connect
 */
MessageRequestConnection.prototype.connect = function(url) {
	var request = new HttpRequest(url);

	request.send().then(
		this.onRequestComplete.bind(this),
		this.onRequestError.bind(this)
	);
}

/**
 * @method onRequestComplete
 * @private
 */
MessageRequestConnection.prototype.onRequestComplete = function(body) {
	this.trigger(MessageRequestConnection.CONNECT);

	var lines = body.toString().split("\n");

	//console.log("MessageRequestConnection: lines="+lines.length);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		//console.log("line: "+line);

		if (line.length && line[0] != "/") {
			console.log("trigger message: " + line);
			this.trigger({
				type: MessageRequestConnection.MESSAGE,
				message: JSON.parse(line)
			});
		}
	}
}

/**
 * @method onRequestComplete
 * @private
 */
MessageRequestConnection.prototype.onRequestError = function(e) {
	console.log("error in request connection");
	console.log(e);
	this.trigger(MessageRequestConnection.CLOSE);
}

/**
 * Send.
 * @method send
 */
MessageRequestConnection.prototype.send = function(m) {
	console.log('ignoring "send" for MessageRequestConnection');
}

module.exports = MessageRequestConnection;
},{"../utils/HttpRequest":84,"inherits":7,"tinp":12,"yaed":14}],86:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var EventDispatcher = require("yaed");
var Thenable = require("tinp");
var inherits = require("inherits");

/**
 * Message connection in a browser.
 * @class MessageWebSocketConnection
 */
function MessageWebSocketConnection() {
	EventDispatcher.call(this);
	this.test = 1;
}

inherits(MessageWebSocketConnection, EventDispatcher);

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
	//console.log(e.data);

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
},{"inherits":7,"tinp":12,"yaed":14}],87:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

/**
 * MouseOverGroup. This is the class for the MouseOverGroup.
 * @class MouseOverGroup
 */
function MouseOverGroup() {
	this.objects = new Array();
	this.currentlyOver = false;
	this.mouseDown = false;

}
inherits(MouseOverGroup, PIXI.DisplayObjectContainer);
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


},{"inherits":7,"pixi.js":8,"yaed":14}],88:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var inherits = require("inherits");

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

inherits(NineSlice, PIXI.DisplayObjectContainer);

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
},{"inherits":7,"pixi.js":8}],89:[function(require,module,exports){
/**
 * Object utilities.
 * @class ObjectUtil
 */
function ObjectUtil() {}

/**
 * Check object equality.
 * Not perfect but will do.
 * @method equals
 * @static
 */
ObjectUtil.equals = function(a, b) {
	if (typeof a != "object" || typeof b != "object")
		return a === b;

	if (!a && !b)
		return true;

	if (!a)
		return false;

	if (!b)
		return false;

	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);

	if (aProps.length != bProps.length)
		return false;

	for (var i = 0; i < aProps.length; i++) {
		var propName = aProps[i];

		if (!ObjectUtil.equals(a[propName], b[propName]))
			return false;
	}

	return true;
}

/**
 * Shallow copy objects.
 * @method copy
 */
ObjectUtil.copy = function(o) {
	var r = {};

	var props = Object.getOwnPropertyNames(o);

	for (var i = 0; i < props.length; i++)
		r[props[i]] = o[props[i]];

	return r;
}

module.exports = ObjectUtil;
},{}],90:[function(require,module,exports){
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
},{}],91:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var EventDispatcher = require("yaed");
var inherits = require("inherits");

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

inherits(Sequencer, EventDispatcher);

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
},{"inherits":7,"yaed":14}],92:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var PIXI = require("pixi.js");
var TWEEN = require("tween.js");
var EventDispatcher = require("yaed");
var inherits = require("inherits");

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

inherits(Slider, PIXI.DisplayObjectContainer);
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

},{"inherits":7,"pixi.js":8,"tween.js":13,"yaed":14}],93:[function(require,module,exports){
var url = require("url");

/**
 * URL utility.
 * @class UrlUtil
 */
function UrlUtil() {
	throw new Error("static");
}

/**
 * Make absolute url.
 * @method makeAbsolute
 */
UrlUtil.makeAbsolute = function(target) {
	var parsedUrl = url.parse(target);

	if (parsedUrl.protocol)
		return target;

	if (target.charAt(0) == "/") {
		var u = url.parse(window.location.href);

		u.pathname = target;

		return url.format(u);
	} else {
		var path;
		path = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
		return path + target;
	}
}

module.exports = UrlUtil;
},{"url":6}]},{},[15])(15)
});