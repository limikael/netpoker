(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){(function (){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * The Ease class provides a collection of easing functions for use with tween.js.
 */
var Easing = {
    Linear: {
        None: function (amount) {
            return amount;
        },
    },
    Quadratic: {
        In: function (amount) {
            return amount * amount;
        },
        Out: function (amount) {
            return amount * (2 - amount);
        },
        InOut: function (amount) {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount;
            }
            return -0.5 * (--amount * (amount - 2) - 1);
        },
    },
    Cubic: {
        In: function (amount) {
            return amount * amount * amount;
        },
        Out: function (amount) {
            return --amount * amount * amount + 1;
        },
        InOut: function (amount) {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount;
            }
            return 0.5 * ((amount -= 2) * amount * amount + 2);
        },
    },
    Quartic: {
        In: function (amount) {
            return amount * amount * amount * amount;
        },
        Out: function (amount) {
            return 1 - --amount * amount * amount * amount;
        },
        InOut: function (amount) {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount * amount;
            }
            return -0.5 * ((amount -= 2) * amount * amount * amount - 2);
        },
    },
    Quintic: {
        In: function (amount) {
            return amount * amount * amount * amount * amount;
        },
        Out: function (amount) {
            return --amount * amount * amount * amount * amount + 1;
        },
        InOut: function (amount) {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount * amount * amount;
            }
            return 0.5 * ((amount -= 2) * amount * amount * amount * amount + 2);
        },
    },
    Sinusoidal: {
        In: function (amount) {
            return 1 - Math.cos((amount * Math.PI) / 2);
        },
        Out: function (amount) {
            return Math.sin((amount * Math.PI) / 2);
        },
        InOut: function (amount) {
            return 0.5 * (1 - Math.cos(Math.PI * amount));
        },
    },
    Exponential: {
        In: function (amount) {
            return amount === 0 ? 0 : Math.pow(1024, amount - 1);
        },
        Out: function (amount) {
            return amount === 1 ? 1 : 1 - Math.pow(2, -10 * amount);
        },
        InOut: function (amount) {
            if (amount === 0) {
                return 0;
            }
            if (amount === 1) {
                return 1;
            }
            if ((amount *= 2) < 1) {
                return 0.5 * Math.pow(1024, amount - 1);
            }
            return 0.5 * (-Math.pow(2, -10 * (amount - 1)) + 2);
        },
    },
    Circular: {
        In: function (amount) {
            return 1 - Math.sqrt(1 - amount * amount);
        },
        Out: function (amount) {
            return Math.sqrt(1 - --amount * amount);
        },
        InOut: function (amount) {
            if ((amount *= 2) < 1) {
                return -0.5 * (Math.sqrt(1 - amount * amount) - 1);
            }
            return 0.5 * (Math.sqrt(1 - (amount -= 2) * amount) + 1);
        },
    },
    Elastic: {
        In: function (amount) {
            if (amount === 0) {
                return 0;
            }
            if (amount === 1) {
                return 1;
            }
            return -Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI);
        },
        Out: function (amount) {
            if (amount === 0) {
                return 0;
            }
            if (amount === 1) {
                return 1;
            }
            return Math.pow(2, -10 * amount) * Math.sin((amount - 0.1) * 5 * Math.PI) + 1;
        },
        InOut: function (amount) {
            if (amount === 0) {
                return 0;
            }
            if (amount === 1) {
                return 1;
            }
            amount *= 2;
            if (amount < 1) {
                return -0.5 * Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI);
            }
            return 0.5 * Math.pow(2, -10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI) + 1;
        },
    },
    Back: {
        In: function (amount) {
            var s = 1.70158;
            return amount * amount * ((s + 1) * amount - s);
        },
        Out: function (amount) {
            var s = 1.70158;
            return --amount * amount * ((s + 1) * amount + s) + 1;
        },
        InOut: function (amount) {
            var s = 1.70158 * 1.525;
            if ((amount *= 2) < 1) {
                return 0.5 * (amount * amount * ((s + 1) * amount - s));
            }
            return 0.5 * ((amount -= 2) * amount * ((s + 1) * amount + s) + 2);
        },
    },
    Bounce: {
        In: function (amount) {
            return 1 - Easing.Bounce.Out(1 - amount);
        },
        Out: function (amount) {
            if (amount < 1 / 2.75) {
                return 7.5625 * amount * amount;
            }
            else if (amount < 2 / 2.75) {
                return 7.5625 * (amount -= 1.5 / 2.75) * amount + 0.75;
            }
            else if (amount < 2.5 / 2.75) {
                return 7.5625 * (amount -= 2.25 / 2.75) * amount + 0.9375;
            }
            else {
                return 7.5625 * (amount -= 2.625 / 2.75) * amount + 0.984375;
            }
        },
        InOut: function (amount) {
            if (amount < 0.5) {
                return Easing.Bounce.In(amount * 2) * 0.5;
            }
            return Easing.Bounce.Out(amount * 2 - 1) * 0.5 + 0.5;
        },
    },
};

var now;
// Include a performance.now polyfill.
// In node.js, use process.hrtime.
// eslint-disable-next-line
// @ts-ignore
if (typeof self === 'undefined' && typeof process !== 'undefined' && process.hrtime) {
    now = function () {
        // eslint-disable-next-line
        // @ts-ignore
        var time = process.hrtime();
        // Convert [seconds, nanoseconds] to milliseconds.
        return time[0] * 1000 + time[1] / 1000000;
    };
}
// In a browser, use self.performance.now if it is available.
else if (typeof self !== 'undefined' && self.performance !== undefined && self.performance.now !== undefined) {
    // This must be bound, because directly assigning this function
    // leads to an invocation exception in Chrome.
    now = self.performance.now.bind(self.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
    now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
    now = function () {
        return new Date().getTime();
    };
}
var now$1 = now;

/**
 * Controlling groups of tweens
 *
 * Using the TWEEN singleton to manage your tweens can cause issues in large apps with many components.
 * In these cases, you may want to create your own smaller groups of tween
 */
var Group = /** @class */ (function () {
    function Group() {
        this._tweens = {};
        this._tweensAddedDuringUpdate = {};
    }
    Group.prototype.getAll = function () {
        var _this = this;
        return Object.keys(this._tweens).map(function (tweenId) {
            return _this._tweens[tweenId];
        });
    };
    Group.prototype.removeAll = function () {
        this._tweens = {};
    };
    Group.prototype.add = function (tween) {
        this._tweens[tween.getId()] = tween;
        this._tweensAddedDuringUpdate[tween.getId()] = tween;
    };
    Group.prototype.remove = function (tween) {
        delete this._tweens[tween.getId()];
        delete this._tweensAddedDuringUpdate[tween.getId()];
    };
    Group.prototype.update = function (time, preserve) {
        if (time === void 0) { time = now$1(); }
        if (preserve === void 0) { preserve = false; }
        var tweenIds = Object.keys(this._tweens);
        if (tweenIds.length === 0) {
            return false;
        }
        // Tweens are updated in "batches". If you add a new tween during an
        // update, then the new tween will be updated in the next batch.
        // If you remove a tween during an update, it may or may not be updated.
        // However, if the removed tween was added during the current batch,
        // then it will not be updated.
        while (tweenIds.length > 0) {
            this._tweensAddedDuringUpdate = {};
            for (var i = 0; i < tweenIds.length; i++) {
                var tween = this._tweens[tweenIds[i]];
                var autoStart = !preserve;
                if (tween && tween.update(time, autoStart) === false && !preserve) {
                    delete this._tweens[tweenIds[i]];
                }
            }
            tweenIds = Object.keys(this._tweensAddedDuringUpdate);
        }
        return true;
    };
    return Group;
}());

/**
 *
 */
var Interpolation = {
    Linear: function (v, k) {
        var m = v.length - 1;
        var f = m * k;
        var i = Math.floor(f);
        var fn = Interpolation.Utils.Linear;
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
        var bn = Interpolation.Utils.Bernstein;
        for (var i = 0; i <= n; i++) {
            b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
        }
        return b;
    },
    CatmullRom: function (v, k) {
        var m = v.length - 1;
        var f = m * k;
        var i = Math.floor(f);
        var fn = Interpolation.Utils.CatmullRom;
        if (v[0] === v[m]) {
            if (k < 0) {
                i = Math.floor((f = m * (1 + k)));
            }
            return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);
        }
        else {
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
            var fc = Interpolation.Utils.Factorial;
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
            return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
        },
    },
};

/**
 * Utils
 */
var Sequence = /** @class */ (function () {
    function Sequence() {
    }
    Sequence.nextId = function () {
        return Sequence._nextId++;
    };
    Sequence._nextId = 0;
    return Sequence;
}());

var mainGroup = new Group();

/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */
var Tween = /** @class */ (function () {
    function Tween(_object, _group) {
        if (_group === void 0) { _group = mainGroup; }
        this._object = _object;
        this._group = _group;
        this._isPaused = false;
        this._pauseStart = 0;
        this._valuesStart = {};
        this._valuesEnd = {};
        this._valuesStartRepeat = {};
        this._duration = 1000;
        this._initialRepeat = 0;
        this._repeat = 0;
        this._yoyo = false;
        this._isPlaying = false;
        this._reversed = false;
        this._delayTime = 0;
        this._startTime = 0;
        this._easingFunction = Easing.Linear.None;
        this._interpolationFunction = Interpolation.Linear;
        this._chainedTweens = [];
        this._onStartCallbackFired = false;
        this._id = Sequence.nextId();
        this._isChainStopped = false;
        this._goToEnd = false;
    }
    Tween.prototype.getId = function () {
        return this._id;
    };
    Tween.prototype.isPlaying = function () {
        return this._isPlaying;
    };
    Tween.prototype.isPaused = function () {
        return this._isPaused;
    };
    Tween.prototype.to = function (properties, duration) {
        // TODO? restore this, then update the 07_dynamic_to example to set fox
        // tween's to on each update. That way the behavior is opt-in (there's
        // currently no opt-out).
        // for (const prop in properties) this._valuesEnd[prop] = properties[prop]
        this._valuesEnd = Object.create(properties);
        if (duration !== undefined) {
            this._duration = duration;
        }
        return this;
    };
    Tween.prototype.duration = function (d) {
        this._duration = d;
        return this;
    };
    Tween.prototype.start = function (time) {
        if (this._isPlaying) {
            return this;
        }
        // eslint-disable-next-line
        this._group && this._group.add(this);
        this._repeat = this._initialRepeat;
        if (this._reversed) {
            // If we were reversed (f.e. using the yoyo feature) then we need to
            // flip the tween direction back to forward.
            this._reversed = false;
            for (var property in this._valuesStartRepeat) {
                this._swapEndStartRepeatValues(property);
                this._valuesStart[property] = this._valuesStartRepeat[property];
            }
        }
        this._isPlaying = true;
        this._isPaused = false;
        this._onStartCallbackFired = false;
        this._isChainStopped = false;
        this._startTime = time !== undefined ? (typeof time === 'string' ? now$1() + parseFloat(time) : time) : now$1();
        this._startTime += this._delayTime;
        this._setupProperties(this._object, this._valuesStart, this._valuesEnd, this._valuesStartRepeat);
        return this;
    };
    Tween.prototype._setupProperties = function (_object, _valuesStart, _valuesEnd, _valuesStartRepeat) {
        for (var property in _valuesEnd) {
            var startValue = _object[property];
            var startValueIsArray = Array.isArray(startValue);
            var propType = startValueIsArray ? 'array' : typeof startValue;
            var isInterpolationList = !startValueIsArray && Array.isArray(_valuesEnd[property]);
            // If `to()` specifies a property that doesn't exist in the source object,
            // we should not set that property in the object
            if (propType === 'undefined' || propType === 'function') {
                continue;
            }
            // Check if an Array was provided as property value
            if (isInterpolationList) {
                var endValues = _valuesEnd[property];
                if (endValues.length === 0) {
                    continue;
                }
                // handle an array of relative values
                endValues = endValues.map(this._handleRelativeValue.bind(this, startValue));
                // Create a local copy of the Array with the start value at the front
                _valuesEnd[property] = [startValue].concat(endValues);
            }
            // handle the deepness of the values
            if ((propType === 'object' || startValueIsArray) && startValue && !isInterpolationList) {
                _valuesStart[property] = startValueIsArray ? [] : {};
                // eslint-disable-next-line
                for (var prop in startValue) {
                    // eslint-disable-next-line
                    // @ts-ignore FIXME?
                    _valuesStart[property][prop] = startValue[prop];
                }
                _valuesStartRepeat[property] = startValueIsArray ? [] : {}; // TODO? repeat nested values? And yoyo? And array values?
                // eslint-disable-next-line
                // @ts-ignore FIXME?
                this._setupProperties(startValue, _valuesStart[property], _valuesEnd[property], _valuesStartRepeat[property]);
            }
            else {
                // Save the starting value, but only once.
                if (typeof _valuesStart[property] === 'undefined') {
                    _valuesStart[property] = startValue;
                }
                if (!startValueIsArray) {
                    // eslint-disable-next-line
                    // @ts-ignore FIXME?
                    _valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
                }
                if (isInterpolationList) {
                    // eslint-disable-next-line
                    // @ts-ignore FIXME?
                    _valuesStartRepeat[property] = _valuesEnd[property].slice().reverse();
                }
                else {
                    _valuesStartRepeat[property] = _valuesStart[property] || 0;
                }
            }
        }
    };
    Tween.prototype.stop = function () {
        if (!this._isChainStopped) {
            this._isChainStopped = true;
            this.stopChainedTweens();
        }
        if (!this._isPlaying) {
            return this;
        }
        // eslint-disable-next-line
        this._group && this._group.remove(this);
        this._isPlaying = false;
        this._isPaused = false;
        if (this._onStopCallback) {
            this._onStopCallback(this._object);
        }
        return this;
    };
    Tween.prototype.end = function () {
        this._goToEnd = true;
        this.update(Infinity);
        return this;
    };
    Tween.prototype.pause = function (time) {
        if (time === void 0) { time = now$1(); }
        if (this._isPaused || !this._isPlaying) {
            return this;
        }
        this._isPaused = true;
        this._pauseStart = time;
        // eslint-disable-next-line
        this._group && this._group.remove(this);
        return this;
    };
    Tween.prototype.resume = function (time) {
        if (time === void 0) { time = now$1(); }
        if (!this._isPaused || !this._isPlaying) {
            return this;
        }
        this._isPaused = false;
        this._startTime += time - this._pauseStart;
        this._pauseStart = 0;
        // eslint-disable-next-line
        this._group && this._group.add(this);
        return this;
    };
    Tween.prototype.stopChainedTweens = function () {
        for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
            this._chainedTweens[i].stop();
        }
        return this;
    };
    Tween.prototype.group = function (group) {
        this._group = group;
        return this;
    };
    Tween.prototype.delay = function (amount) {
        this._delayTime = amount;
        return this;
    };
    Tween.prototype.repeat = function (times) {
        this._initialRepeat = times;
        this._repeat = times;
        return this;
    };
    Tween.prototype.repeatDelay = function (amount) {
        this._repeatDelayTime = amount;
        return this;
    };
    Tween.prototype.yoyo = function (yoyo) {
        this._yoyo = yoyo;
        return this;
    };
    Tween.prototype.easing = function (easingFunction) {
        this._easingFunction = easingFunction;
        return this;
    };
    Tween.prototype.interpolation = function (interpolationFunction) {
        this._interpolationFunction = interpolationFunction;
        return this;
    };
    Tween.prototype.chain = function () {
        var tweens = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tweens[_i] = arguments[_i];
        }
        this._chainedTweens = tweens;
        return this;
    };
    Tween.prototype.onStart = function (callback) {
        this._onStartCallback = callback;
        return this;
    };
    Tween.prototype.onUpdate = function (callback) {
        this._onUpdateCallback = callback;
        return this;
    };
    Tween.prototype.onRepeat = function (callback) {
        this._onRepeatCallback = callback;
        return this;
    };
    Tween.prototype.onComplete = function (callback) {
        this._onCompleteCallback = callback;
        return this;
    };
    Tween.prototype.onStop = function (callback) {
        this._onStopCallback = callback;
        return this;
    };
    /**
     * @returns true if the tween is still playing after the update, false
     * otherwise (calling update on a paused tween still returns true because
     * it is still playing, just paused).
     */
    Tween.prototype.update = function (time, autoStart) {
        if (time === void 0) { time = now$1(); }
        if (autoStart === void 0) { autoStart = true; }
        if (this._isPaused)
            return true;
        var property;
        var elapsed;
        var endTime = this._startTime + this._duration;
        if (!this._goToEnd && !this._isPlaying) {
            if (time > endTime)
                return false;
            if (autoStart)
                this.start(time);
        }
        this._goToEnd = false;
        if (time < this._startTime) {
            return true;
        }
        if (this._onStartCallbackFired === false) {
            if (this._onStartCallback) {
                this._onStartCallback(this._object);
            }
            this._onStartCallbackFired = true;
        }
        elapsed = (time - this._startTime) / this._duration;
        elapsed = this._duration === 0 || elapsed > 1 ? 1 : elapsed;
        var value = this._easingFunction(elapsed);
        // properties transformations
        this._updateProperties(this._object, this._valuesStart, this._valuesEnd, value);
        if (this._onUpdateCallback) {
            this._onUpdateCallback(this._object, elapsed);
        }
        if (elapsed === 1) {
            if (this._repeat > 0) {
                if (isFinite(this._repeat)) {
                    this._repeat--;
                }
                // Reassign starting values, restart by making startTime = now
                for (property in this._valuesStartRepeat) {
                    if (!this._yoyo && typeof this._valuesEnd[property] === 'string') {
                        this._valuesStartRepeat[property] =
                            // eslint-disable-next-line
                            // @ts-ignore FIXME?
                            this._valuesStartRepeat[property] + parseFloat(this._valuesEnd[property]);
                    }
                    if (this._yoyo) {
                        this._swapEndStartRepeatValues(property);
                    }
                    this._valuesStart[property] = this._valuesStartRepeat[property];
                }
                if (this._yoyo) {
                    this._reversed = !this._reversed;
                }
                if (this._repeatDelayTime !== undefined) {
                    this._startTime = time + this._repeatDelayTime;
                }
                else {
                    this._startTime = time + this._delayTime;
                }
                if (this._onRepeatCallback) {
                    this._onRepeatCallback(this._object);
                }
                return true;
            }
            else {
                if (this._onCompleteCallback) {
                    this._onCompleteCallback(this._object);
                }
                for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
                    // Make the chained tweens start exactly at the time they should,
                    // even if the `update()` method was called way past the duration of the tween
                    this._chainedTweens[i].start(this._startTime + this._duration);
                }
                this._isPlaying = false;
                return false;
            }
        }
        return true;
    };
    Tween.prototype._updateProperties = function (_object, _valuesStart, _valuesEnd, value) {
        for (var property in _valuesEnd) {
            // Don't update properties that do not exist in the source object
            if (_valuesStart[property] === undefined) {
                continue;
            }
            var start = _valuesStart[property] || 0;
            var end = _valuesEnd[property];
            var startIsArray = Array.isArray(_object[property]);
            var endIsArray = Array.isArray(end);
            var isInterpolationList = !startIsArray && endIsArray;
            if (isInterpolationList) {
                _object[property] = this._interpolationFunction(end, value);
            }
            else if (typeof end === 'object' && end) {
                // eslint-disable-next-line
                // @ts-ignore FIXME?
                this._updateProperties(_object[property], start, end, value);
            }
            else {
                // Parses relative end values with start as base (e.g.: +10, -3)
                end = this._handleRelativeValue(start, end);
                // Protect against non numeric properties.
                if (typeof end === 'number') {
                    // eslint-disable-next-line
                    // @ts-ignore FIXME?
                    _object[property] = start + (end - start) * value;
                }
            }
        }
    };
    Tween.prototype._handleRelativeValue = function (start, end) {
        if (typeof end !== 'string') {
            return end;
        }
        if (end.charAt(0) === '+' || end.charAt(0) === '-') {
            return start + parseFloat(end);
        }
        else {
            return parseFloat(end);
        }
    };
    Tween.prototype._swapEndStartRepeatValues = function (property) {
        var tmp = this._valuesStartRepeat[property];
        var endValue = this._valuesEnd[property];
        if (typeof endValue === 'string') {
            this._valuesStartRepeat[property] = this._valuesStartRepeat[property] + parseFloat(endValue);
        }
        else {
            this._valuesStartRepeat[property] = this._valuesEnd[property];
        }
        this._valuesEnd[property] = tmp;
    };
    return Tween;
}());

var VERSION = '18.6.4';

/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */
var nextId = Sequence.nextId;
/**
 * Controlling groups of tweens
 *
 * Using the TWEEN singleton to manage your tweens can cause issues in large apps with many components.
 * In these cases, you may want to create your own smaller groups of tweens.
 */
var TWEEN = mainGroup;
// This is the best way to export things in a way that's compatible with both ES
// Modules and CommonJS, without build hacks, and so as not to break the
// existing API.
// https://github.com/rollup/rollup/issues/1961#issuecomment-423037881
var getAll = TWEEN.getAll.bind(TWEEN);
var removeAll = TWEEN.removeAll.bind(TWEEN);
var add = TWEEN.add.bind(TWEEN);
var remove = TWEEN.remove.bind(TWEEN);
var update = TWEEN.update.bind(TWEEN);
var exports$1 = {
    Easing: Easing,
    Group: Group,
    Interpolation: Interpolation,
    now: now$1,
    Sequence: Sequence,
    nextId: nextId,
    Tween: Tween,
    VERSION: VERSION,
    getAll: getAll,
    removeAll: removeAll,
    add: add,
    remove: remove,
    update: update,
};

exports.Easing = Easing;
exports.Group = Group;
exports.Interpolation = Interpolation;
exports.Sequence = Sequence;
exports.Tween = Tween;
exports.VERSION = VERSION;
exports.add = add;
exports.default = exports$1;
exports.getAll = getAll;
exports.nextId = nextId;
exports.now = now$1;
exports.remove = remove;
exports.removeAll = removeAll;
exports.update = update;

}).call(this)}).call(this,require('_process'))
},{"_process":2}],2:[function(require,module,exports){
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
const NetPokerClientController=require("../controller/NetPokerClientController");
const MessageConnection=require("../../utils/MessageConnection");
const PixiApp=require("../../utils/PixiApp");
const TRANSLATIONS=require("./translations");

class NetPokerClient extends PixiApp {
	constructor(params) {
		super(960,720);
		this.params=params;
	}

	async run() {
		// Attach to element.
		this.attach(this.params.element);

		// Load resources.
		let spriteSheetUrl=
			this.params.resourceBaseUrl+
			"/netpokerclient-spritesheet.json";

		this.resources=new Resources(spriteSheetUrl);
		await this.resources.load();

		// Create view and controller.
		this.clientView=new NetPokerClientView(this);
		this.addChild(this.clientView);
		this.clientController=new NetPokerClientController(this.clientView);

		this.connect();
	}

	async connect() {
		this.connection=await MessageConnection.connect(this.params.serverUrl);
		this.clientController.setConnection(this.connection);
	}

	getResources() {
		return this.resources;
	}

	translate(key) {
		if (!TRANSLATIONS[key])
			throw new Error("Unknown ranslation key: "+key);

		return TRANSLATIONS[key];
	}
}

module.exports=NetPokerClient;

},{"../../utils/MessageConnection":38,"../../utils/PixiApp":41,"../controller/NetPokerClientController":10,"../view/NetPokerClientView":21,"./Resources":6,"./translations":8}],6:[function(require,module,exports){
const THEME=require("./theme.js");

class Resources {
	constructor(spriteSheetUrl) {
		this.spriteSheetUrl=spriteSheetUrl
	}

	getValue(id) {
		return THEME[id];
	}

	getColor(id) {
		return this.getValue(id);
	}

	getTexture(id) {
		let fn=THEME[id];
		return this.sheet.textures[fn];
	}

	createSprite(id) {
		return new PIXI.Sprite(this.getTexture(id));
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
module.exports={
	"raise": "RAISE TO",
	"fold": "FOLD",
	"bet": "BET",
	"sitOut": "SIT OUT",
	"sitIn": "SIT IN",
	"call": "CALL",
	"postBB": "POST BB",
	"postSB": "POST SB",
	"cancel": "CANCEL",
	"check": "CHECK",
	"show": "SHOW",
	"muck": "MUCK",
	"ok": "OK",
	"imBack": "I'M BACK",
	"leave": "LEAVE",
	"checkFold": "CHECK / FOLD",
	"callAny": "CALL ANY",
	"raiseAny": "RAISE ANY",
	"buyIn": "BUY IN",
	"reBuy": "RE-BUY",
	"joinTournament": "JOIN",
	"leaveTournament": "LEAVE"
};
},{}],9:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

/**
 * Control user interface.
 * @class InterfaceController
 */
class InterfaceController {
	constructor(eventQueue, view) {
		this.eventQueue = eventQueue;
		this.view = view;

		this.eventQueue.on("buttons",this.onButtonsMessage);
		this.eventQueue.on("showDialog",this.onShowDialogMessage);
		this.eventQueue.on("chat",this.onChat);
		this.eventQueue.on("tableInfo",this.onTableInfoMessage);
		this.eventQueue.on("handInfo",this.onHandInfoMessage);
		this.eventQueue.on("interfaceState",this.onInterfaceStateMessage);
		this.eventQueue.on("chekbox",this.onCheckboxMessage);
		this.eventQueue.on("preTournamentInfo",this.onPreTournamentInfoMessage);
		this.eventQueue.on("tableButtons",this.onTableButtonsMessage);
		this.eventQueue.on("tournamentResult",this.onTournamentResultMessage);
		this.eventQueue.on("presetButtons",this.onPresetButtonsMessage);
	}

	/**
	 * Buttons message.
	 * @method onButtonsMessage
	 */
	onButtonsMessage=(m)=>{
		var buttonsView = this.view.getButtonsView();

		buttonsView.clear();
		buttonsView.showButtons(m.buttons,m.values);

		if (m.hasOwnProperty("sliderIndex"))
			buttonsView.showSlider(m.sliderIndex,m.sliderMax);
	}

	/**
	 * PresetButtons message.
	 * @method onPresetButtons
	 */
	onPresetButtonsMessage=(m)=> {
		var presetButtonsView = this.view.getPresetButtonsView();
		var buttons = presetButtonsView.getButtons();
		var havePresetButton = false;

		for (var i = 0; i < buttons.length; i++) {
			if (i > m.buttons.length) {
				buttons[i].hide();
			} else {
				if (!m.buttons[i]) {
					buttons[i].hide();
				} else {
					havePresetButton = true;
					buttons[i].show(m.buttons[i], m.values[i]);
				}
			}
		}

		presetButtonsView.setCurrent(m.current);

		if (havePresetButton)
			this.view.getButtonsView().clear();
	}

	/**
	 * Show dialog.
	 * @method onShowDialogMessage
	 */
	onShowDialogMessage=(m)=>{
		var dialogView = this.view.getDialogView();

		dialogView.show(m.text, m.buttons, m.defaultValue);
	}


	/**
	 * On chat message.
	 * @method onChat
	 */
	onChat=(m)=>{
		this.view.chatView.addText(m.user, m.text);
	}

	/**
	 * Handle table info message.
	 * @method onTableInfoMessage
	 */
	onTableInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setTableInfoText(m.text);
		tableInfoView.setJoinButtonVisible(m.showJoinButton);
		tableInfoView.setLeaveButtonVisible(m.showLeaveButton);
	}

	/**
	 * Handle hand info message.
	 * @method onHandInfoMessage
	 */
	onHandInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setHandInfoText(m.text, m.countdown);
	}

	/**
	 * Handle interface state message.
	 * @method onInterfaceStateMessage
	 */
	onInterfaceStateMessage=(m)=>{
		var settingsView = this.view.getSettingsView();

		settingsView.setVisibleButtons(m.getVisibleButtons());
	}

	/**
	 * Handle checkbox message.
	 * @method onCheckboxMessage
	 */
	onCheckboxMessage=(m)=>{
		console.log(m);

		var settingsView = this.view.getSettingsView();

		settingsView.setCheckboxChecked(m.getId(), m.getChecked());
	}

	/**
	 * Handle pre torunament info message.
	 * @method onPreTournamentInfoMessage
	 */
	onPreTournamentInfoMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setPreTournamentInfoText(m.getText(), m.getCountdown());
	}

	/**
	 * Handle tournament result message.
	 * @method onTournamentResultMessage
	 */
	onTournamentResultMessage=(m)=>{
		var tableInfoView = this.view.getTableInfoView();

		tableInfoView.setTournamentResultText(m.getText(), m.getRightColumnText());
	}

	/**
	 * Table buttons message.
	 * @method onTableButtonsMessage
	 */
	onTableButtonsMessage=(m)=>{
		var tableButtonsView = this.view.getTableButtonsView();

		tableButtonsView.showButtons(m.getEnabled(), m.getCurrentIndex());
	}
}

module.exports = InterfaceController;
},{}],10:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TableController = require("./TableController");
const InterfaceController = require("./InterfaceController");
const EventQueue=require("../../utils/EventQueue");

/**
 * Main controller
 * @class NetPokerClientController
 */
class NetPokerClientController {
	constructor(view) {
		this.netPokerClientView = view;
		this.connection = null;
		this.eventQueue = new EventQueue();

		this.tableController = new TableController(this.eventQueue, this.netPokerClientView);
		this.interfaceController = new InterfaceController(this.eventQueue, this.netPokerClientView);

		this.netPokerClientView.getButtonsView().on("buttonClick", this.onButtonClick);
		//this.netPokerClientView.getTableInfoView().on(TableInfoView.BUTTON_CLICK, this.onButtonClick, this);
		this.netPokerClientView.getDialogView().on("buttonClick", this.onButtonClick);
		this.netPokerClientView.on("seatClick", this.onSeatClick);

		this.netPokerClientView.getChatView().on("chat", this.onChat);
		//this.netPokerClientView.settingsView.addEventListener(SettingsView.BUY_CHIPS_CLICK, this.onBuyChipsButtonClick, this);
		this.netPokerClientView.getSettingsView().on("checkboxChange", this.onCheckboxChange);

		this.netPokerClientView.getPresetButtonsView().on("change", this.onPresetButtonsChange);
		//this.netPokerClientView.getTableButtonsView().on(TableButtonsView.TABLE_CLICK, this.onTableButtonClick, this);*/
	}

	/**
	 * Set connection.
	 * @method setProtoConnection
	 */
	setConnection(connection) {
		if (connection==this.connection)
			return;

		if (this.connection)
			this.connection.off("message",this.onConnectionMessage);

		this.netPokerClientView.clear();
		this.eventQueue.clear();
		this.connection=connection;

		if (this.connection)
			this.connection.on("message",this.onConnectionMessage);
	}

	/**
	 * Incoming message.
	 * Enqueue for processing.
	 * @method onProtoConnectionMessage
	 * @private
	 */
	onConnectionMessage=(message)=>{
		this.eventQueue.enqueue(message.type,message);
	}

	/**
	 * Button click.
	 * This function handles clicks from both the dialog and game play buttons.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=(button, value)=>{
		this.connection.send("buttonClick",{
			button: button,
			value: value
		});
	}

	/**
	 * Seat click.
	 * @method onSeatClick
	 * @private
	 */
	onSeatClick=(seatIndex)=>{
		this.connection.send("seatClick",{
			seatIndex: seatIndex
		});
	}

	/**
	 * On send chat message.
	 * @method onViewChat
	 */
	onChat = function(text) {
		this.connection.send("chat",{
			text: text
		});
	}

	/**
	 * On buy chips button click.
	 * @method onBuyChipsButtonClick
	 */
	/*NetPokerClientController.prototype.onBuyChipsButtonClick = function() {
		console.log("buy chips click");

		this.protoConnection.send(new ButtonClickMessage(ButtonData.BUY_CHIPS));
	}*/

	/**
	 * PresetButtons change message.
	 * @method onPresetButtonsChange
	 */
	onPresetButtonsChange=()=> {
		let presetButtonsView = this.netPokerClientView.getPresetButtonsView();
		let params={};
		let c = presetButtonsView.getCurrent();

		if (c != null) {
			params.button = c.id;
			params.value = c.value;
		}

		this.connection.send("presetButtonClick",params);
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange=(id, checked)=> {
		this.connection.send("checkbox",{
			id: id,
			checked: checked
		});
	}

	/**
	 * Table button click.
	 * @method onTableButtonClick
	 */
	/*NetPokerClientController.prototype.onTableButtonClick = function(index) {
		this.protoConnection.send(new TableButtonClickMessage(index));
	}*/
}

module.exports = NetPokerClientController;
},{"../../utils/EventQueue":36,"./InterfaceController":9,"./TableController":11}],11:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const CardData=require("../../data/CardData");
const Timeout=require("../../utils/Timeout");

/**
 * Control the table
 * @class TableController
 */
class TableController {
	constructor(eventQueue, view) {
		this.eventQueue = eventQueue;
		this.view = view;

		this.eventQueue.on("seatInfo", this.onSeatInfoMessage);
		this.eventQueue.on("communityCards", this.onCommunityCardsMessage);
		this.eventQueue.on("pocketCards", this.onPocketCardsMessage);
		this.eventQueue.on("dealerButton", this.onDealerButtonMessage);
		this.eventQueue.on("bet", this.onBetMessage);
		this.eventQueue.on("betsToPot", this.onBetsToPotMessage);
		this.eventQueue.on("pot", this.onPotMessage);
		this.eventQueue.on("timer", this.onTimerMessage);
		this.eventQueue.on("action", this.onActionMessage);
		this.eventQueue.on("foldCards", this.onFoldCardsMessage);
		this.eventQueue.on("delay", this.onDelayMessage);
		this.eventQueue.on("clear", this.onClearMessage);
		this.eventQueue.on("payOut", this.onPayOutMessage);
		this.eventQueue.on("fadeTable", this.onFadeTableMessage);
	}

	/**
	 * Fade table.
	 * @method onFadeTableMessage
	 */
	onFadeTableMessage=(m)=>{
		this.view.fadeTable(m.getVisible(), m.getDirection());
		this.eventQueue.waitFor(this.view, "fadeTableComplete");
	}

	/**
	 * Seat info message.
	 * @method onSeatInfoMessage
	 */
	onSeatInfoMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);

		seatView.setName(m.name);
		seatView.setChips(m.chips);
		seatView.setActive(m.active);
		seatView.setSitout(m.sitout);
	}

	/**
	 * Seat info message.
	 * @method onCommunityCardsMessage
	 */
	onCommunityCardsMessage=(m)=>{
		let cardView;

		for (let i = 0; i < m.cards.length; i++) {
			let cardData = new CardData(m.cards[i]);
			cardView = this.view.getCommunityCards()[m.firstIndex + i];
			cardView.setCardData(cardData);
			cardView.show(m.animate);
		}

		if (m.animate && cardView)
			this.eventQueue.waitFor(cardView, "animationDone");
	}

	/**
	 * Pocket cards message.
	 * @method onPocketCardsMessage
	 */
	onPocketCardsMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);
		var i;

		for (i = 0; i < m.cards.length; i++) {
			var cardData = new CardData(m.cards[i]);
			var cardView = seatView.getPocketCards()[m.firstIndex + i];

			if (m.animate)
				this.eventQueue.waitFor(cardView, "animationDone");

			cardView.setCardData(cardData);
			cardView.show(m.animate, 10);
		}
	}

	/**
	 * Dealer button message.
	 * @method onDealerButtonMessage
	 */
	onDealerButtonMessage=(m)=>{
		var dealerButtonView = this.view.getDealerButtonView();

		if (m.seatIndex < 0) {
			dealerButtonView.hide();
		} else {
			if (m.animate)
				this.eventQueue.waitFor(dealerButtonView, "animationDone");

			dealerButtonView.show(m.seatIndex, m.animate);
		}
	};

	/**
	 * Bet message.
	 * @method onBetMessage
	 */
	onBetMessage=(m)=>{
		var seatView = this.view.getSeatViewByIndex(m.seatIndex);
		seatView.getBetChipsView().setValue(m.value);
	};

	/**
	 * Bets to pot.
	 * @method onBetsToPot
	 */
	onBetsToPotMessage=(m)=>{
		var haveChips = false;

		for (var i = 0; i < this.view.seatViews.length; i++)
			if (this.view.seatViews[i].betChips.value > 0)
				haveChips = true;

		if (!haveChips)
			return;

		for (var i = 0; i < this.view.seatViews.length; i++)
			this.view.seatViews[i].betChips.animateIn();

		this.eventQueue.waitFor(this.view.seatViews[9].betChips, "animationDone");
	}

	/**
	 * Pot message.
	 * @method onPot
	 */
	onPotMessage=(m)=>{
		this.view.potView.setValues(m.values);
	};

	/**
	 * Timer message.
	 * @method onTimer
	 */
	onTimerMessage=(m)=>{
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
	onActionMessage=(m)=>{
		if (m.seatIndex == null)
			m.seatIndex = 0;

		this.view.seatViews[m.seatIndex].action(m.action);
	};

	/**
	 * Fold cards message.
	 * @method onFoldCards
	 */
	onFoldCardsMessage=(m)=>{
		this.view.seatViews[m.seatIndex].foldCards();

		this.eventQueue.waitFor(this.view.seatViews[m.seatIndex], "animationDone");
	};

	/**
	 * Delay message.
	 * @method onDelay
	 */
	onDelayMessage=(m)=>{
		//console.log("delay for  = " + m.delay);

		let t=new Timeout(m.delay);
		this.eventQueue.waitFor(t,"timeout");
	};

	/**
	 * Clear message.
	 * @method onClear
	 */
	onClearMessage=(m)=>{
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
	onPayOutMessage=(m)=>{
		for (var i = 0; i < m.values.length; i++)
			this.view.seatViews[i].betChips.setValue(m.values[i]);

		for (var i = 0; i < this.view.seatViews.length; i++)
			this.view.seatViews[i].betChips.animateOut();

		this.eventQueue.waitFor(this.view.seatViews[0].betChips, "animationDone");
	};
}

module.exports = TableController;
},{"../../data/CardData":30,"../../utils/Timeout":46}],12:[function(require,module,exports){
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

},{"../utils/ArrayUtil":31,"./app/NetPokerClient":5}],13:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const Button = require("../../utils/Button");

/**
 * Big button.
 * @class BigButton
 */
class BigButton extends Button {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();
		this.bigButtonTexture = this.resources.getTexture("bigButton");
		this.addChild(new PIXI.Sprite(this.bigButtonTexture));

		var style = {
			fontFamily: "Arial",
			fontSize: 16,
			fontWeight: "bold"
		};

		this.labelField = new PIXI.Text("[button]", style);
		this.labelField.position.y = 32;
		this.addChild(this.labelField);

		var style = {
			fontFamily: "Arial",
			fontSize: 14,
			fontWeight: "bold"
		};

		this.valueField = new PIXI.Text("[value]", style);
		this.valueField.position.y = 50;
		this.addChild(this.valueField);

		this.setLabel("");
		this.setValue(123);
	}

	/**
	 * Set label for the button.
	 * @method setLabel
	 */
	setLabel(label) {
		this.label=label;

		if (this.label)
			this.labelField.text=this.client.translate(label);

		else
			this.labelField.text="<none>";

		this.labelField.x = this.bigButtonTexture.width / 2 - this.labelField.width / 2;
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValue(value) {
		this.value=value;

		if (!value) {
			this.valueField.visible = false;
			value = "";
		} else {
			this.valueField.visible = true;
		}

		this.valueField.text=value;
		this.valueField.x = this.bigButtonTexture.width / 2 - this.valueField.width / 2;
	}

	getLabel() {
		return this.label;
	}

	getValue() {
		return this.value;
	}
}

module.exports = BigButton;
},{"../../utils/Button":32}],14:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var Button = require("../../utils/Button");
var Slider = require("../../utils/Slider");
var NineSlice = require("../../utils/NineSlice");
var BigButton = require("./BigButton");
//var RaiseShortcutButton = require("./RaiseShortcutButton");

/**
 * Buttons
 * @class ButtonsView
 */
class ButtonsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();

		this.buttonHolder = new PIXI.Container();
		this.addChild(this.buttonHolder);

		var sliderBackground = new NineSlice(this.resources.getTexture("sliderBackground"), 20, 0, 20, 0);
		sliderBackground.setLocalSize(300, sliderBackground.height);

		var knob = new PIXI.Sprite(this.resources.getTexture("sliderKnob"));

		this.slider = new Slider(sliderBackground, knob);
		var pos = this.resources.getPoint("bigButtonPosition");
		this.slider.position.x = pos.x;
		this.slider.position.y = pos.y - 35;
		this.slider.on("change", this.onSliderChange);
		this.addChild(this.slider);

		this.buttonHolder.position.x = 366;
		this.buttonHolder.position.y = 575;

		this.buttons = [];

		for (var i = 0; i < 3; i++) {
			var button = new BigButton(this.client);
			button.on("click", this.onButtonClick);
			button.position.x = i * 105;
			this.buttonHolder.addChild(button);
			this.buttons.push(button);
		}

		this.clear();
	}

	/**
	 * Slider change.
	 * @method onSliderChange
	 */
	onSliderChange=()=>{
		let minv = Math.log(this.sliderMin);
		let maxv = Math.log(this.sliderMax);
		let scale=maxv-minv;
		let newValue = Math.round(Math.exp(minv+scale*this.slider.getValue()));

		this.buttons[this.sliderIndex].setValue(newValue);
	}

	/**
	 * Show slider.
	 * @method showSlider
	 */
	showSlider(sliderIndex, sliderMax) {
		this.sliderIndex = sliderIndex;
		this.sliderMin = this.buttons[sliderIndex].getValue();
		this.sliderMax = sliderMax;

		this.slider.setValue(0);
		this.slider.visible = true;
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear() {
		this.showButtons([]);
		this.slider.visible = false;
	}

	/**
	 * Set button datas.
	 * @method setButtons
	 */
	showButtons(buttons, values) {
		for (var i = 0; i < this.buttons.length; i++) {
			var button = this.buttons[i];
			if (i >= buttons.length) {
				button.visible = false;
				continue;
			}

			button.visible = true;
			button.setLabel(buttons[i]);
			button.setValue(values[i]);
		}

		this.buttonHolder.position.x = 366;
		if (buttons.length < 3)
			this.buttonHolder.position.x += 45;
	}

	/**
	 * Button click.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=(e)=>{
		var buttonIndex = -1;
		let button;

		for (var i = 0; i < this.buttons.length; i++) {
			this.buttons[i].visible = false;
			if (e.target == this.buttons[i])
				button=this.buttons[i];
		}

		this.slider.visible = false;
		this.emit("buttonClick",button.getLabel(),button.getValue());
	}
}

module.exports = ButtonsView;
},{"../../utils/Button":32,"../../utils/NineSlice":40,"../../utils/Slider":43,"./BigButton":13}],15:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

/**
 * The front view of a card.
 * @class CardFrontView
 */
class CardFrontView extends PIXI.Container {
	constructor(client) {
		super();
		this.resources=client.getResources();

		this.frame = this.resources.createSprite("cardFrame");
		this.addChild(this.frame);

		var style = {
			fontFamily: "Arial",
			fontSize: 16,
			fontWeight: "bold"
		};

		this.valueField = new PIXI.Text("[val]",style);
		this.valueField.position.x = 10;
		this.valueField.position.y = 5;
		this.addChild(this.valueField);

		this.suit = new PIXI.Sprite();
		this.suit.position.x = 8;
		this.suit.position.y = 25;
		this.addChild(this.suit);
	}

	setCardData(cardData) {
		this.cardData = cardData;

		this.suit.texture=this.resources.getTexture("suitSymbol" + this.cardData.getSuitIndex());
		this.valueField.style.fill = this.cardData.getColor();
		this.valueField.text=this.cardData.getCardValueString();
		this.valueField.position.x = 17 - this.valueField.width / 2;
	}
}

module.exports = CardFrontView;
},{}],16:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var TWEEN = require('@tweenjs/tween.js');
var CardFrontView = require("./CardFrontView");

/**
 * A card view.
 * @class CardView
 */
class CardView extends PIXI.Container {
	constructor(client) {
		super();
		this.targetPosition = null;
		this.resources = client.getResources();

		this.front = new CardFrontView(client);
		this.addChild(this.front);
		this.back = this.resources.createSprite("cardBack");
		this.addChild(this.back);

		this.maskGraphics = new PIXI.Graphics();
		this.maskGraphics.beginFill(0x000000);
		this.maskGraphics.drawRect(0, 0, this.back.width, this.back.height);
		this.maskGraphics.endFill();
		this.addChild(this.maskGraphics);

		this.mask = this.maskGraphics;
	}

	/**
	 * Set card data.
	 * @method setCardData
	 */
	setCardData=(cardData)=>{
		this.cardData = cardData;

		if (this.cardData.isShown()) {
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
	setTargetPosition(point) {
		this.targetPosition = point;

		this.position.x = point.x;
		this.position.y = point.y;
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(animate) {
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
			.to({
				x: destination.x,
				y: destination.y
			}, 500)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onStart(this.onShowStart.bind(this))
			.onComplete(this.onShowComplete.bind(this))
			.start();
	}

	/**
	 * Show complete.
	 * @method onShowComplete
	 */
	onShowStart() {
		this.visible = true;
	}

	/**
	 * Show complete.
	 * @method onShowComplete
	 */
	onShowComplete() {
		if (this.cardData.isShown()) {
			this.back.visible = false;
			this.front.visible = true;
		}
		this.emit("animationDone");
	}

	/**
	 * Fold.
	 * @method fold
	 */
	fold() {
		var o = {
			x: this.targetPosition.x,
			y: this.targetPosition.y + 80
		};

		this.t0 = new TWEEN.Tween(this.position)
			.to(o, 500)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(this.onFoldUpdate)
			.onComplete(this.onFoldComplete)
			.start();
	}

	/**
	 * Fold animation update.
	 * @method onFoldUpdate
	 */
	onFoldUpdate=(o)=>{
		let diff=o.y-this.targetPosition.y;
		this.maskGraphics.height=80-diff;
	}

	/**
	 * Fold animation complete.
	 * @method onFoldComplete
	 */
	onFoldComplete=()=>{
		this.emit("animationDone");
	}
}

module.exports = CardView;
},{"./CardFrontView":15,"@tweenjs/tween.js":1}],17:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const NineSlice = require("../../utils/NineSlice");
const Slider = require("../../utils/Slider");
const TextInput = require("../../utils/TextInput");
const MouseOverGroup = require("../../utils/MouseOverGroup");

/**
 * Chat view.
 * @class ChatView
 */
class ChatView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources=client.getResources();
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
			fontFamily: "Arial",
			fontSize: 12,
			wordWrapWidth: 310,
			height: 114,
			border: true,
			color: 0xFFFFFF,
			borderColor: 0x404040,
			wordWrap: true,
			multiline: true
		};

		this.container = new PIXI.Container();
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

		this.inputField=new TextInput({
			input: {
				fontFamily: 'Arial',
				fontSize: "14px",
				padding: "4px 4px",
				width: '310px',
				color: 'black'
			},
			box: {
				fill: 0xffffff,
				stroke: {color: 0x000000, width: 1}
			}
		});

		this.inputField.position.x = this.container.position.x;
		this.inputField.position.y = 681;
		this.inputField.on("keydown",this.onKeyDown)
		this.addChild(this.inputField);


		var slideBack = new NineSlice(this.resources.getTexture("textScrollbarTrack"), 10, 0, 10, 0);
		slideBack.width = 107;
		var slideKnob = new NineSlice(this.resources.getTexture("textScrollbarThumb"), 10, 0, 10, 0);
		slideKnob.width = 30;


		this.slider = new Slider(slideBack, slideKnob);
		this.slider.rotation = Math.PI * 0.5;
		this.slider.position.x = 328;
		this.slider.position.y = 552;
		this.slider.setValue(1);
		this.slider.visible = false;
		this.slider.on("change", this.onSliderChange);
		this.addChild(this.slider);


		this.mouseOverGroup = new MouseOverGroup();
		this.mouseOverGroup.addDisplayObject(this.slider);
		this.mouseOverGroup.addDisplayObject(chatPlate);
		this.mouseOverGroup.on("mouseover", this.onChatFieldMouseOver, this);
		this.mouseOverGroup.on("mouseout", this.onChatFieldMouseOut, this);
		this.mouseOverGroup.on("mousedown", this.onChatFieldMouseDown, this);
		this.mouseOverGroup.on("mouseup", this.onChatFieldMouseUp, this);

		chatPlate.touchstart = this.onChatFieldMouseDown.bind(this);


		this.clear();
	}

	/**
	 * Clear messages.
	 * @method clear
	 */
	clear() {
		this.chatText.text="";
		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
		this.slider.setValue(1);
	}

	/**
	 *  Add text.
	 * @method clear
	 */
	addText(user, text) {
		var s="";

		if (user)
			s += user + ": ";

		s += text;

		if (this.chatText.text)
			this.chatText.text+=("\n" + s);
		else
			this.chatText.text=s;

		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
		this.slider.setValue(1);
	}

	/**
	 * On slider value change
	 * @method onSliderChange
	 */
	onSliderChange=()=> {
		this.chatText.y = -Math.round(this.slider.getValue() * (this.chatText.height + this.margin - this.chatMask.height));
	}


	/**
	 * On mouse over
	 * @method onChatFieldMouseOver
	 */
	onChatFieldMouseOver=()=> {
		this.slider.visible=true;//show();
	}

	/**
	 * On mouse out
	 * @method onChatFieldMouseOut
	 */
	onChatFieldMouseOut=()=> {
		this.slider.visible=false; //hide();
	}

	/**
	 * On mouse down
	 * @method onChatFieldMouseDown
	 */
	onChatFieldMouseDown=(interaction_object)=>{
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
	onChatFieldMouseUp=(interaction_object)=> {
		interaction_object.target.touchend = interaction_object.target.touchendoutside = null;
		interaction_object.target.touchmove = null;
		this.slider.hide();
	}

	/**
	 * On mouse up
	 * @method onChatFieldMouseUp
	 */
	onChatFieldMouseMove=(interaction_object)=> {
		var pos = interaction_object.global.y;
		var diff = pos - this.startMousePos;

		this.slider.setValue((-(this.startPos + diff)) / (this.chatText.height + this.margin - this.chatMask.height));
		this.onSliderChange();
	}

	/**
	 * On key down
	 * @method onKeyDown
	 */
	onKeyDown=(keyCode)=>{
		if (keyCode == 13) {
			this.emit("chat",this.inputField.text);
			this.inputField.text="";
		}
	}
}

module.exports = ChatView;
},{"../../utils/MouseOverGroup":39,"../../utils/NineSlice":40,"../../utils/Slider":43,"../../utils/TextInput":45}],18:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * A chips view.
 * @class ChipsView
 */
class ChipsView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources = client.getResources();
		this.targetPosition = null;
		this.align = "left";
		this.value = 0;
		this.denominations = [500000, 100000, 25000, 5000, 1000, 500, 100, 25, 5, 1];
		this.stackClips = new Array();
		this.holder = new PIXI.Container();
		this.addChild(this.holder);

		this.tween = null;
	}

	/**
	 * Set alignment.
	 * @method setAlignment
	 */
	setAlignment(align) {
		if (!align)
			throw new Error("unknown alignment: " + align);

		this.align = align;
	}

	/**
	 * Set target position.
	 * @method setTargetPosition
	 */
	setTargetPosition(position) {
		//console.log("setting target position: " + JSON.stringify(position));

		this.targetPosition = position;
		this.position.x = position.x;
		this.position.y = position.y;
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValue(value) {
		/*if (this.tween) {
			this.tween.onComplete(function() {});
			this.tween.onUpdate(function() {});
			this.tween.stop();
			this.tween = null;
		}*/

		if (this.targetPosition) {
			this.position.x = this.targetPosition.x;
			this.position.y = this.targetPosition.y;
		}

		//console.log("set value, seatIndex=" + this.seatIndex+", value="+value);

		this.value = value;

		var sprite;

		for (var i = 0; i < this.stackClips.length; i++)
			this.holder.removeChild(this.stackClips[i]);

		this.stackClips = new Array();

		/*if (this.toolTip != null)
			this.toolTip.text = "Bet: " + this.value.toString();*/

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
					stackClip = new PIXI.Container();
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
						fontFamily: "Arial",
						fontWeight: "bold",
						fontSize: 12,
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
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
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

		this.tween = new TWEEN.Tween(this.position)
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
	onShowComplete() {

		this.dispatchEvent("animationDone", this);
	}

	/**
	 * Animate in.
	 * @method animateIn
	 */
	animateIn() {
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

		this.tween = new TWEEN.Tween(this)
			.to({
				y: this.resources.getPoint("potPosition").y,
				x: o.x
			}, 500)
			.onComplete(this.onInAnimationComplete.bind(this))
			.start();
	}

	/**
	 * In animation complete.
	 * @method onInAnimationComplete
	 */
	onInAnimationComplete() {
		this.setValue(0);

		this.position.x = this.targetPosition.x;
		this.position.y = this.targetPosition.y;

		this.emit("animationDone", this);
	}

	/**
	 * Animate out.
	 * @method animateOut
	 */
	animateOut() {
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

		this.tween = new TWEEN.Tween(this)
			.to(o, 500)
			.onComplete(this.onOutAnimationComplete.bind(this))
			.start();
	}

	/**
	 * Out animation complete.
	 * @method onOutAnimationComplete
	 */
	onOutAnimationComplete() {

		this.tween = new TWEEN.Tween({
				x: 0
			})
			.to({
				x: 10
			}, 500)
			.onComplete(this.onOutWaitAnimationComplete.bind(this))
			.start();

		this.position.x = this.targetPosition.x;
		this.position.y = this.targetPosition.y;

	}

	/**
	 * Out wait animation complete.
	 * @method onOutWaitAnimationComplete
	 */
	onOutWaitAnimationComplete() {

		this.setValue(0);

		this.emit("animationDone", this);
	}
}

module.exports = ChipsView;
},{"@tweenjs/tween.js":1}],19:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * Dialog view.
 * @class DealerButtonView
 */
class DealerButtonView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources=client.getResources();

		var dealerButtonTexture = this.resources.getTexture("dealerButton");
		this.sprite = new PIXI.Sprite(dealerButtonTexture);
		this.addChild(this.sprite);
		this.hide();
	}

	/**
	 * Set seat index
	 * @method setSeatIndex
	 */
	setSeatIndex = function(seatIndex) {
		this.position = this.resources.getPoint("dealerButtonPosition"+seatIndex);
		this.emit("animationDone");
	};

	/**
	 * Animate to seat index.
	 * @method animateToSeatIndex
	 */
	animateToSeatIndex(seatIndex) {
		if (!this.visible)
			throw new Error("Can't animate when not visible");

		var destination = this.resources.getPoint("dealerButtonPosition"+seatIndex);
		var tween = new TWEEN.Tween(this.position)
			.to({
				x: destination.x,
				y: destination.y
			}, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onComplete(this.onShowComplete.bind(this))
			.start();
	};

	/**
	 * Show Complete.
	 * @method onShowComplete
	 */
	onShowComplete() {
		this.emit("animationDone");
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(seatIndex, animate) {
		if (this.visible && animate) {
			this.animateToSeatIndex(seatIndex);
		} else {
			this.visible = true;
			this.setSeatIndex(seatIndex);
		}
	}
}

module.exports = DealerButtonView;
},{"@tweenjs/tween.js":1}],20:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const NineSlice = require("../../utils/NineSlice");
const TextInput = require("../../utils/TextInput");
const TextButton = require("../../utils/TextButton");

/**
 * Dialog view.
 * @class DialogView
 */
class DialogView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=client.getResources();

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

		let style = {
			fontFamily: "Arial",
			fontWeight: "normal",
			fontSize: 14
		};

		this.textField = new PIXI.Text("[text]", style);
		this.textField.position.x = b.position.x + 20;
		this.textField.position.y = b.position.y + 20;
		this.addChild(this.textField);

		this.buttonsHolder = new PIXI.Container();
		this.buttonsHolder.position.y = 430;
		this.addChild(this.buttonsHolder);
		this.buttons = [];

		for (var i = 0; i < 2; i++) {
			//var b = new DialogButton(client);

			var b=new TextButton({
				hEdge: 25,
				texture: this.resources.getTexture("dialogButton"),
				fontFamily: "Arial",
				fontSize: 14,
				fontWeight: "normal",
				fill: "#ffffff"
			});

			b.position.x = i * 90;
			b.on("click", this.onButtonClick, this);
			this.buttonsHolder.addChild(b);
			this.buttons.push(b);
		}

		this.inputField=new TextInput({
			input: {
				fontFamily: 'Arial',
				fontSize: "18px",
				padding: "4px 4px",
				width: '100px',
				color: 'black'
			},
			box: {
				fill: 0xffffff,
				stroke: {color: 0x000000, width: 2}
			}
		});

		this.inputField.position.x = this.textField.position.x;
		this.addChild(this.inputField);

		this.hide();
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(text, buttonIds, defaultValue) {
		this.visible = true;
		this.buttonIds = buttonIds;

		let pos=0;
		for (let i = 0; i < this.buttons.length; i++) {
			if (i < buttonIds.length) {
				var button = this.buttons[i];
				button.setText(this.client.translate(buttonIds[i]));
				button.visible = true;
				button.position.x=pos;
				pos+=button.width+5;
			} else {
				this.buttons[i].visible = false;
			}
		}

		this.buttonsHolder.x = 480 - this.buttonsHolder.width / 2;
		this.textField.text=text;

		if (defaultValue) {
			this.inputField.position.y = this.textField.position.y + this.textField.height + 20;
			this.inputField.visible = true;

			this.inputField.text = defaultValue;
			this.inputField.focus();
		} else {
			this.inputField.visible = false;
		}
	}

	/**
	 * Handle button click.
	 * @method onButtonClick
	 */
	onButtonClick=(e)=>{
		var buttonIndex = -1;

		for (var i = 0; i < this.buttons.length; i++)
			if (e.target == this.buttons[i])
				buttonIndex = i;

		var value = null;
		if (this.inputField.visible)
			value = Number(this.inputField.text);

		this.emit("buttonClick",this.buttonIds[buttonIndex],value);
		this.hide();
	}
}

module.exports = DialogView;
},{"../../utils/NineSlice":40,"../../utils/TextButton":44,"../../utils/TextInput":45}],21:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

//var TableButtonsView = require("./TableButtonsView");
const SettingsView = require("../view/SettingsView");
const TableInfoView = require("../view/TableInfoView");
const PresetButtonsView = require("../view/PresetButtonsView");
const ChatView = require("./ChatView");
const DealerButtonView = require("./DealerButtonView");
const DialogView = require("./DialogView");
const ButtonsView = require("./ButtonsView");
const TimerView = require("./TimerView");
const PotView = require("./PotView");
const ChipsView = require("./ChipsView");
const CardView = require("./CardView");
const SeatView = require("./SeatView");
const TWEEN = require('@tweenjs/tween.js');
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
		this.setupCommunityCards();

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
		this.potView.position = this.resources.getPoint("potPosition");
		this.tableContainer.addChild(this.potView);

		this.settingsView = new SettingsView(this.client);
		this.addChild(this.settingsView);

		this.dialogView = new DialogView(this.client);
		this.addChild(this.dialogView);

		this.presetButtonsView = new PresetButtonsView(this.client);
		this.addChild(this.presetButtonsView);

		/*this.tableButtonsView = new TableButtonsView(this.client);
		this.addChild(this.tableButtonsView);*/

		this.setupChips();

		this.fadeTableTween = null;
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

			for (j = 0; j < 2; j++) {
				let c = new CardView(this.client);
				c.hide();
				c.setTargetPosition(new PIXI.Point(p.x + j * 30 - 60, p.y - 100));
				this.tableContainer.addChild(c);
				seatView.addPocketCard(c);
			}

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
			let chipsView = new ChipsView(this.client);
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

		this.emit("seatClick",seatIndex);
	}

	/**
	 * Setup community cards.
	 * @method setupCommunityCards
	 * @private
	 */
	setupCommunityCards() {
		this.communityCards = [];

		let p = this.resources.getPoint("communityCardsPosition");
		let margin = parseInt(this.resources.getValue("communityCardMargin"));
		for (let i = 0; i < 5; i++) {
			let cardView = new CardView(this.client);
			cardView.hide();
			cardView.setTargetPosition(new PIXI.Point(p.x + i * (cardView.back.width + margin), p.y));

			this.communityCards.push(cardView);
			this.tableContainer.addChild(cardView);
		}
	}

	/**
	 * Get chat view.
	 */
	getChatView() {
	 	return this.chatView;
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

		for (let i = 0; i < this.communityCards.length; i++)
			this.communityCards[i].hide();

		for (let i = 0; i < this.seatViews.length; i++)
			this.seatViews[i].clear();

		this.timerView.hide();
		this.potView.setValues([]);
	}

	/**
	 * Clear everything to and empty state.
	 * @method clear
	 */
	clear() {
		this.clearTableContents();

		this.presetButtonsView.hide();

		this.chatView.clear();

		this.dialogView.hide();
		this.buttonsView.clear();

		this.tableInfoView.clear();
		//this.settingsView.clear();
		//this.tableButtonsView.clear();

		if (this.fadeTableTween) {
			this.fadeTableTween.stop();
			this.fadeTableTween = null;
		}

		this.tableContainer.alpha = 1;
		this.tableContainer.x = 0;
	}
}

module.exports = NetPokerClientView;

},{"../../utils/Gradient":37,"../view/PresetButtonsView":24,"../view/SettingsView":27,"../view/TableInfoView":28,"./ButtonsView":14,"./CardView":16,"./ChatView":17,"./ChipsView":18,"./DealerButtonView":19,"./DialogView":20,"./PotView":22,"./SeatView":25,"./TimerView":29,"@tweenjs/tween.js":1}],22:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
var ChipsView = require("./ChipsView");

/**
 * A pot view
 * @class PotView
 */
class PotView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();
		this.value = 0;

		this.holder = new PIXI.Container();
		this.addChild(this.holder);

		this.stacks = new Array();
	}

	/**
	 * Set value.
	 * @method setValue
	 */
	setValues(values) {
		for(var i = 0; i < this.stacks.length; i++)
			this.holder.removeChild(this.stacks[i]);

		this.stacks = new Array();

		var pos = 0;

		for(var i = 0; i < values.length; i++) {
			var chips = new ChipsView(this.client);
			this.stacks.push(chips);
			this.holder.addChild(chips);
			chips.setValue(values[i]);
			chips.x = pos;
			pos += Math.floor(chips.width + 20);

			var textField = new PIXI.Text(values[i], {
				fontFamily: "Arial",
				fontWeight: "bold",
				fontSize: 12,
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
	hide() {
		this.visible = false;
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
		this.visible = true;
	}
}

module.exports = PotView;
},{"./ChipsView":18,"@tweenjs/tween.js":1}],23:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Checkbox = require("../../utils/Checkbox");

/**
 * A pot view
 * @class PresetButton
 */
class PresetButton extends PIXI.Container {
	constructor(client,index) {
		super();

		this.client=client;
		this.resources=client.getResources();
		this.index=index;

		this.id = null;
		this.visible = false;
		this.value = 0;

		var b = new PIXI.Sprite(this.resources.getTexture("checkboxBackground"));
		var t = new PIXI.Sprite(this.resources.getTexture("checkboxTick"));
		t.x = 1;

		this.checkbox = new Checkbox(b,t);
		this.checkbox.on("change", this.onCheckboxChange);
		this.addChild(this.checkbox);

		var styleObject = {
			fontFamily: "Arial",
			fontSize: 12,
			fontWeight: "bold", 
			wordWrap: true,
			wordWrapWidth: 250,
			fill: "white"
		};

		this.labelField = new PIXI.Text("", styleObject);
		this.labelField.position.x = 25;

		this.addChild(this.labelField);
	}

	/**
	 * Preset button change.
	 * @method onPresetButtonChange
	 */
	onCheckboxChange=()=>{
		this.emit("change",this.index);
	}

	/**
	 * Set label.
	 * @method setLabel
	 */
	setLabel(label) {
		this.labelField.text=label;
		return label;
	}

	/**
	 * Show.
	 * @method show
	 */
	show(id, value) {
		this.id = id;
		this.value = value;

		if(this.value > 0)
			this.setLabel(this.client.translate(id)+" ("+this.value+")");

		else
			this.setLabel(this.client.translate(id));

		this.visible = true;
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.id = null;
		this.visible = false;
		this.value = 0;
		this.setChecked(false);
	}

	/**
	 * Get checked.
	 * @method getChecked
	 */
	getChecked() {
		return this.checkbox.getChecked();
	}

	/**
	 * Set checked.
	 * @method setChecked
	 */
	setChecked(b) {
		this.checkbox.setChecked(b);

		return this.checkbox.getChecked();
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	getValue() {
		return this.value;
	}
}

module.exports = PresetButton;
},{"../../utils/Checkbox":33,"@tweenjs/tween.js":1}],24:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
var PresetButton = require("./PresetButton");

/**
 * A pot view
 * @class PresetButtonsView
 */
class PresetButtonsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=client.getResources();
		this.buttons = new Array();
		var origin = this.resources.getPoint("bigButtonPosition");

		for (var i = 0; i < 6; i++) {
			var p = new PresetButton(this.client,i);
			p.on("change", this.onPresetButtonChange);
			p.x = origin.x + 30 + 140 * (i % 2);
			p.y = origin.y + 35 * Math.floor(i / 2);
			this.addChild(p);
			this.buttons.push(p);
		}

		this.hide();
	}

	/**
	 * Preset button change.
	 * @method onPresetButtonChange
	 */
	onPresetButtonChange=(index)=>{
		for (let i = 0; i < this.buttons.length; i++)
			if (i!=index)
				this.buttons[i].setChecked(false);

		this.emit("change");
	}

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		for (var i = 0; i < this.buttons.length; i++) {
			this.buttons[i].hide();
		}
	}

	/**
	 * Show.
	 * @method show
	 */
	show() {
		this.visible = true;
	}

	/**
	 * Get buttons.
	 * @method getButtons
	 */
	getButtons() {
		return this.buttons;
	}

	/**
	 * Get current preset button.
	 * @method getCurrent
	 */
	getCurrent() {
		for (var i = 0; i < this.buttons.length; i++) {
			if (this.buttons[i].getChecked() == true) {
				return this.buttons[i];
			}
		}
		return null;
	}

	/**
	 * Set current preset button.
	 * @method setCurrent
	 */
	setCurrent=function(id) {
		for (var i = 0; i < this.buttons.length; i++) {
			var b = this.buttons[i];
			if ((id != null) && (b.id == id)) {
				b.setChecked(true);
			} else {
				b.setChecked(false);
			}
		}
	}
}

module.exports = PresetButtonsView;
},{"./PresetButton":23,"@tweenjs/tween.js":1}],25:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var TWEEN = require('@tweenjs/tween.js');
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
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 20
		};

		this.nameField = new PIXI.Text("[name]", style);
		this.nameField.position.y = -20;
		this.addChild(this.nameField);

		style = {
			fontFamily: "Arial",
			fontWeight: "normal",
			fontSize: 12
		};

		this.chipsField = new PIXI.Text("[name]", style);
		this.chipsField.position.y = 5;
		this.addChild(this.chipsField);

		style = {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 20
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

	getBetChipsView() {
		return this.betChips;
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
		this.chipsField.position.x = -this.chipsField.width / 2;
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
		this.pocketCards[0].on("animationDone", this.onFoldComplete, this);
		for (var i = 0; i < this.pocketCards.length; i++) {
			this.pocketCards[i].fold();
		}
	}

	/**
	 * Fold complete.
	 * @method onFoldComplete
	 */
	onFoldComplete() {
		this.pocketCards[0].on("animationDone", this.onFoldComplete, this);
		this.emit("animationDone");
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

		setTimeout(this.onActionTimer, 1000);
	}

	/**
	 * Show user action.
	 * @method action
	 */
	onActionTimer=()=>{
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
},{"../../utils/Button":32,"@tweenjs/tween.js":1}],26:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Button = require("../../utils/Button");
const NineSlice = require("../../utils/NineSlice");
const Checkbox = require("../../utils/Checkbox");

/**
 * Checkboxes view
 * @class SettingsCheckbox
 */
class SettingsCheckbox extends PIXI.Container {
	constructor(client, id, string) {
		super();

		this.resources = client.getResources();
		this.id = id;

		var y = 0;

		var styleObject = {
			width: 200,
			height: 25,
			fontFamily: "Arial",
			fontSize: 13,
			fontWeight: "bold",
			fill: "white"
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

		this.checkbox.on("change", this.onCheckboxChange, this);
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange=()=>{
		this.emit("change", this);
	}

	/**
	 * Getter.
	 * @method getChecked
	 */
	getChecked() {
		return this.checkbox.getChecked();
	}

	/**
	 * Setter.
	 * @method setChecked
	 */
	setChecked(checked) {
		this.checkbox.setChecked(checked);
		return checked;
	}
}

module.exports = SettingsCheckbox;
},{"../../utils/Button":32,"../../utils/Checkbox":33,"../../utils/NineSlice":40,"@tweenjs/tween.js":1}],27:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');
const Button = require("../../utils/Button");
const NineSlice = require("../../utils/NineSlice");
const SettingsCheckbox = require("./SettingsCheckbox");
const PixiUtil = require("../../utils/PixiUtil");

/**
 * A settings view
 * @class SettingsView
 */
class SettingsView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources = client.getResources();

		var object = new PIXI.Container();
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
		this.settingsButton.on("click", this.onSettingsButtonClick);
		this.addChild(this.settingsButton);

		this.settingsMenu = new PIXI.Container();

		var mbg = new NineSlice(this.resources.getTexture("chatBackground"), 10, 10, 10, 10);
		mbg.setLocalSize(250, 100);
		this.settingsMenu.addChild(mbg);

		var styleObject = {
			fontFamily: "Arial",
			fontWeight: "bold",
			fontSize: 14,
			fill: "#FFFFFF",
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

		this.createMenuSetting("autoMuckLosing", "Muck losing hands", 65);
		this.createSetting("autoPostBlinds", "Auto post blinds", 0);
		this.createSetting("sitoutNext", "Sit out next hand", 25);

		this.settingsMenu.visible = false;

		/*this.buyChipsButton = new RaiseShortcutButton(this.resources);
		this.buyChipsButton.addEventListener("click", this.onBuyChipsClick, this);
		this.buyChipsButton.x = 700;
		this.buyChipsButton.y = 635;
		this.buyChipsButton.setText("Buy chips");
		this.addChild(this.buyChipsButton);
		this.buyChipsButton.visible = false;*/

		this.settingsMenu.interactive=true;
	}

	/**
	 * On buy chips button clicked.
	 * @method onBuyChipsClick
	 */
	onBuyChipsClick=()=>{
		console.log("buy chips click");
		this.emit("buyChipsClick");
	}

	/**
	 * Create checkbox.
	 * @method createMenuSetting
	 */
	createMenuSetting(id, string, y, def) {
		var setting = new SettingsCheckbox(this.client, id, string);

		setting.y = y;
		setting.x = 16;
		this.settingsMenu.addChild(setting);

		setting.on("change", this.onCheckboxChange, this)

		this.settings[id] = setting;
		setting.setChecked(def);
	}

	/**
	 * Create setting.
	 * @method createSetting
	 */
	createSetting(id, string, y) {
		var setting = new SettingsCheckbox(this.client, id, string);

		setting.y = 545 + y;
		setting.x = 700;
		this.addChild(setting);

		setting.on("change", this.onCheckboxChange, this)

		this.settings[id] = setting;
	}

	/**
	 * Checkbox change.
	 * @method onCheckboxChange
	 */
	onCheckboxChange(checkbox) {
		this.emit("checkboxChange",
			checkbox.id,
			checkbox.getChecked()
		);
	}

	/**
	 * Settings button click.
	 * @method onSettingsButtonClick
	 */
	onSettingsButtonClick=()=>{
		this.settingsMenu.visible = !this.settingsMenu.visible;

		PixiUtil.findTopParent(this).interactive=true;

		if (this.settingsMenu.visible)
			PixiUtil.findTopParent(this).on("mousedown",this.onStageMouseDown);

		else
			PixiUtil.findTopParent(this).off("mousedown",this.onStageMouseDown);
	}

	/**
	 * Stage mouse down.
	 * @method onStageMouseDown
	 */
	onStageMouseDown=(e)=>{
		if (PixiUtil.globalHitTest(this.settingsButton,e.data.global) ||
				PixiUtil.globalHitTest(this.settingsMenu,e.data.global))
			return;

		PixiUtil.findTopParent(this).off("mousedown",this.onStageMouseDown);
		this.settingsMenu.visible = false;
	}

	/**
	 * Reset.
	 * @method clear
	 */
	clear() {
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
	setVisibleButtons = function(buttons) {
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
	setCheckboxChecked = function(id, checked) {
		//console.log("setting checkbox state for: " + id);

		this.settings[id].setChecked(checked);
	}
}

module.exports = SettingsView;
},{"../../utils/Button":32,"../../utils/NineSlice":40,"../../utils/PixiUtil":42,"./SettingsCheckbox":26,"@tweenjs/tween.js":1}],28:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var CountDownText = require("../../utils/CountDownText");
var TextButton = require("../../utils/TextButton");

/**
 * Show table info.
 * @class TableInfoView
 */
class TableInfoView extends PIXI.Container {
	constructor(client) {
		super();

		this.client=client;
		this.resources=this.client.getResources();

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
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
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
			fill: "#ffffff",
			align: "center"
		};

		this.preTournamentInfoText = new CountDownText("<PreTournamentInfoText>", style);
		this.preTournamentInfoText.position.y = 360;
		//this.preTournamentInfoText.position.y = 280;
		this.preTournamentInfoText.position.x = Math.round(960 - 300) / 2;
		this.preTournamentInfoText.alpha = .25;
		this.addChild(this.preTournamentInfoText);

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 12,
			fontWeight: "bold",
			fill: "#ffffff",
			dropShadow: true,
			dropShadowColor: "#000000",
			dropShadowDistance: 1,
			stroke: "#000000",
			strokeThickness: 1,
		};

		this.handInfoText = new CountDownText("<HandInfoText>", style);
		this.handInfoText.position.y = 10;
		this.handInfoText.position.x = 10; //960 - this.handInfoText.width;
		this.addChild(this.handInfoText);

		let dialogButtonStyle={
			hEdge: 25,
			texture: this.resources.getTexture("dialogButton"),
			fontFamily: "Arial",
			fontSize: 14,
			fontWeight: "normal",
			fill: "#ffffff"
		}
	
		this.joinButton = new TextButton(dialogButtonStyle);
		this.joinButton.position.x = 355;
		this.joinButton.setText("JOIN");
		this.joinButton.visible = false;
		this.joinButton.on("click", this.onButtonClick, this);
		this.addChild(this.joinButton);

		this.leaveButton = new TextButton(dialogButtonStyle);
		this.leaveButton.position.x = 355;
		this.leaveButton.setText("LEAVE");
		this.leaveButton.visible = false;
		this.leaveButton.on("click", this.onButtonClick, this);
		this.addChild(this.leaveButton);

		var style = {
			fontFamily: "Times New Roman",
			fontSize: 24,
			fontWeight: "bold",
			fill: "#ffffff",
			dropShadow: true,
			dropShadowColor: "#000000",
			dropShadowDistance: 2,
			stroke: "#000000",
			strokeThickness: 2
		};

		this.tournamentResultLeftField = new PIXI.Text("<left>", style);
		this.addChild(this.tournamentResultLeftField);

		var style2 = {...style};
		style2.align = 'right';

		this.tournamentResultRightField = new PIXI.Text("<right>", style2);
		this.addChild(this.tournamentResultRightField);

		this.tournamentResultLeftField.y = 260;
		this.tournamentResultRightField.y = 260;
	}

	/**
	 * Set left and right column.
	 * @method setTournamentResultText
	 */
	setTournamentResultText(left, right) {
		this.tournamentResultLeftField.text=left;
		this.tournamentResultRightField.text=right;

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
	setTableInfoText(s) {
		if (!s)
			s = "";

		this.tableInfoText.text=s;
		this.joinButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
		this.leaveButton.position.y = this.tableInfoText.position.y + this.tableInfoText.height + 5;
	}

	/**
	 * Set pre tournament info text.
	 * @method setPreTournamentInfoText
	 */
	setPreTournamentInfoText(s, countDown) {
		if (!s)
			s = "";

		this.preTournamentInfoText.setText(s);
		this.preTournamentInfoText.setTimeLeft(countDown);
		this.preTournamentInfoText.position.x = 960 / 2 - this.preTournamentInfoText.width / 2;
	}

	/**
	 * Join button.
	 * @method setJoinButtonVisible
	 */
	setJoinButtonVisible(value) {
		this.joinButton.visible = value;
	}

	/**
	 * Join button
	 * @method setLeaveButtonVisible
	 */
	setLeaveButtonVisible(value) {
		this.leaveButton.visible = value;
	}

	/**
	 * Set hand info text.
	 * @method setTableInfoText
	 */
	setHandInfoText(s, countdown) {
		if (!s)
			s = "";

		this.handInfoText.setText(s);
		this.handInfoText.setTimeLeft(countdown);
		this.handInfoText.updateTransform();
	}

	/**
	 * Clear.
	 * @method clear
	 */
	clear() {
		this.handInfoText.setText("");
		this.preTournamentInfoText.setText("");

		this.tableInfoText.text="";
		this.tournamentResultLeftField.text="";
		this.tournamentResultRightField.text="";
		this.joinButton.visible = false;
		this.leaveButton.visible = false;
	}

	/**
	 * Button click
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick(e) {
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
		this.emit(ev);
	}
}

module.exports = TableInfoView;
},{"../../utils/CountDownText":35,"../../utils/TextButton":44}],29:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * A timer view
 * @class TimerView
 */
class TimerView extends PIXI.Container {
	constructor(client) {
		super();

		this.resources = client.getResources();

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

	/**
	 * Hide.
	 * @method hide
	 */
	hide() {
		this.timerClip.visible = false;
		this.stop();
	}

	/**
	 * Show.
	 * @method show
	 */
	show(seatIndex) {

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
	stop() {
		if (this.tween != null)
			this.tween.stop();

	}

	/**
	 * Countdown.
	 * @method countdown
	 */
	countdown(totalTime, timeLeft) {
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
	onUpdate=()=>{
		var time = Date.now();
		var percent = 100 * (time - this.startAt) / (this.stopAt - this.startAt);

		//	console.log("p = " + percent);

		this.showPercent(percent);
	}

	/**
	 * On tween update.
	 * @method onUpdate
	 */
	onComplete=()=>{
		var time = Date.now();
		var percent = 100;
		this.showPercent(percent);
		this.tween = null;
	}

	/**
	 * Show percent.
	 * @method showPercent
	 */
	showPercent(value) {
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
}

module.exports = TimerView;
},{"@tweenjs/tween.js":1}],30:[function(require,module,exports){
/**
 * Protocol.
 * @module proto
 */

/**
 * Card data.
 * @class CardData
 */
class CardData {
	static CARD_VALUE_STRINGS =
		["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

	static SUIT_STRINGS =
		["D", "C", "H", "S"];

	static LONG_SUIT_STRINGS =
		["Diamonds", "Clubs", "Hearts", "Spades"];

	static HIDDEN = -1;

	constructor(value) {
		this.value = value;
	}

	/**
	 * Does this CardData represent a show card?
	 * If not it should be rendered with its backside.
	 * @method isShown
	 */
	isShown() {
		return this.value >= 0;
	}

	/**
	 * Get card value.
	 * This value represents the rank of the card, but starts on 0.
	 * @method getCardValue
	 */
	getCardValue() {
		return this.value % 13;
	}

	/**
	 * Get card value string.
	 * @method getCardValueString
	 */
	getCardValueString() {
		return CardData.CARD_VALUE_STRINGS[this.value % 13];
	}

	/**
	 * Get suit index.
	 * @method getSuitIndex
	 */
	getSuitIndex() {
		return Math.floor(this.value / 13);
	}

	/**
	 * Get suit string.
	 * @method getSuitString
	 */
	getSuitString() {
		return CardData.SUIT_STRINGS[this.getSuitIndex()];
	}

	/**
	 * Get long suit string.
	 * @method getLongSuitString
	 */
	getLongSuitString() {
		return CardData.LONG_SUIT_STRINGS[this.getSuitIndex()];
	}

	/**
	 * Get color.
	 * @method getColor
	 */
	getColor() {
		if (this.getSuitIndex() % 2 != 0)
			return "#000000";

		else
			return "#ff0000";
	}

	/**
	 * To string.
	 * @method toString
	 */
	toString() {
		if (this.value < 0)
			return "XX";

		//	return "<card " + this.getCardValueString() + this.getSuitString() + ">";
		return this.getCardValueString() + this.getSuitString();
	}

	/**
	 * Get value of the card.
	 * @method getValue
	 */
	getValue() {
		return this.value;
	}

	/**
	 * Compare with respect to value. Not really useful except for debugging!
	 * @method compareValue
	 * @static
	 */
	static compareValue(a, b) {
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
	static compareCardValue(a, b) {
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
	static compareSuitIndex(a, b) {
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
	static fromString(s) {
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
}

module.exports = CardData;
},{}],31:[function(require,module,exports){
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
},{}],32:[function(require,module,exports){
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

		/*this.mouseover = this.onMouseover.bind(this);
		this.mouseout = this.touchend = this.touchendoutside = this.onMouseout.bind(this);
		this.mousedown = this.touchstart = this.onMousedown.bind(this);
		this.mouseup = this.onMouseup.bind(this);*/
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
},{}],33:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

var Button = require("./Button");

/**
 * Checkbox.
 * @class Checkbox
 */
class Checkbox extends PIXI.Container {
	constructor(background, tick) {
		super();

		this.button = new Button(background);
		this.addChild(this.button);

		this.check = tick;
		this.addChild(this.check);

		this.button.on("click", this.onButtonClick);

		this.setChecked(false);
	}

	/**
	 * Button click.
	 * @method onButtonClick
	 * @private
	 */
	onButtonClick=()=>{
		this.check.visible = !this.check.visible;

		this.emit("change");
	}

	/**
	 * Setter.
	 * @method setChecked
	 */
	setChecked(value) {
		this.check.visible = value;
		return value;
	}

	/**
	 * Getter.
	 * @method getChecked
	 */
	getChecked() {
		return this.check.visible;
	}
}

module.exports = Checkbox;
},{"./Button":32}],34:[function(require,module,exports){
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
},{}],35:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

/**
 * A text that counts down.
 * @class CountdownText
 */
class CountDownText extends PIXI.Text {
	constructor(text, style) {
		super(text,style)

		this.timeLeft = 0;
		this.timerInterval = null;
		this.setText(text);
	}

	/**
	 * Override the setText function.
	 * @method setText
	 */
	setText(text) {
		this.format = text;

		this.updateFormattedText();
	}

	/**
	 * Update the actual text.
	 * @method updateFormattedText
	 */
	updateFormattedText() {
		var s = (this.timeLeft % 60).toString();
		var m = (Math.floor(this.timeLeft / 60) % 60).toString();
		var h = (Math.floor(this.timeLeft / (60 * 60))).toString();

		if (s.length < 2)
			s = "0" + s;

		if (m.length < 2)
			m = "0" + m;

		if (h == "0")
			h = "";

		else {
			if (h.length < 2)
				h = "0" + h;

			h += ":";
		}

		var text = this.format.toString().replace("%t", h + m + ":" + s);

		//console.log("update text: " + text);

		this.text=text;
	}

	/**
	 * Set time left.
	 * @method setTimeLeft
	 */
	setTimeLeft(timeLeft) {
		if (timeLeft < 0 || isNaN(timeLeft) || timeLeft === null)
			timeLeft = 0;

		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		this.timeLeft = timeLeft;

		if (this.timeLeft > 0) {
			this.timerInterval = setInterval(this.onTimerInterval.bind(this), 1000);
		}

		this.updateFormattedText();
	}

	/**
	 * Timer interval.
	 * @method onTimerInterval
	 */
	onTimerInterval=()=> {
		this.timeLeft--;

		if (this.timeLeft <= 0) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}

		this.updateFormattedText();
	}
}

module.exports = CountDownText;
},{}],36:[function(require,module,exports){
const EventEmitter=require("events");

class EventQueue extends EventEmitter {
	constructor() {
		super();

		this.queue=[];
		this.superEmit=super.emit;
	}

	enqueue(...event) {
		if (this.waitingForObject) {
			this.queue.push(event);
		}

		else {
			this.superEmit.call(this,...event);
		}
	}

	emit() {
		throw new Error("Don't use emit directly");
	}

	waitFor(o, ev) {
		this.waitingForObject=o;
		this.waitingForEvent=ev;
		this.waitingForObject.on(this.waitingForEvent,this.onWaitEvent);
	}

	onWaitEvent=()=>{
		this.waitingForObject.removeListener(this.waitingForEvent,this.onWaitEvent);
		this.waitingForObject=null;
		this.waitingForEvent=null;

		while (this.queue.length && !this.waitingForObject)
			this.superEmit.call(this,...this.queue.shift());
	}

	clear() {
		if (this.waitingForObject) {
			this.waitingForObject.removeListener(this.waitingForEvent,this.onWaitEvent);
			this.waitingForObject=null;
			this.waitingForEvent=null;
		}

		this.queue=[];
	}
}

module.exports=EventQueue;
},{"events":3}],37:[function(require,module,exports){
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
},{}],38:[function(require,module,exports){
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
		message.type=type;
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
},{"events":3,"ws":4}],39:[function(require,module,exports){
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
			//if(this.hitTest(this.objects[i],e.data.global))
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
//				if(this.hitTest(this.objects[i],e.data.global))
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


},{"./PixiUtil.js":42,"events":3}],40:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

/**
 * Nine slice. This is a sprite that is a grid, and only the
 * middle part stretches when scaling.
 * @class NineSlice
 */
class NineSlice extends PIXI.Container {
	constructor(texture, left, top, right, bottom) {
		super();

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

	/**
	 * Build the parts for the slices.
	 * @method buildParts
	 * @private
	 */
	buildParts() {
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
	updateSizes() {
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
	setLocalSize(w, h) {
		this.localWidth = w;
		this.localHeight = h;
		this.updateSizes();
	}

	/**
	 * Create texture part.
	 * @method createTexturePart
	 * @private
	 */
	createTexturePart(x, y, width, height) {
		var frame = {
			x: this.texture.frame.x + x,
			y: this.texture.frame.y + y,
			width: width,
			height: height
		};

		return new PIXI.Texture(this.texture, frame);
	}
}

module.exports = NineSlice;
},{}],41:[function(require,module,exports){
const ContentScaler=require("./ContentScaler");
const TWEEN = require('@tweenjs/tween.js');

class PixiApp extends PIXI.Container {
	constructor(contentWidth, contentHeight) {
		super();

		this.app=new PIXI.Application({
			antialias: true
		});
		this.app.renderer.autoDensity=true;
		this.app.view.style.position="absolute";
		this.app.view.style.top=0;
		this.app.view.style.left=0;

		this.contentScaler=new ContentScaler(this);
		this.contentScaler.setContentSize(contentWidth,contentHeight);
		this.app.stage.addChild(this.contentScaler);

		window.addEventListener("resize",this.onWindowResize);
	}

	attach(element) {
		this.app.ticker.add(this.onAppTicker);

		this.element=element;
		this.element.appendChild(this.app.view);
		this.onWindowResize();
	}

	onAppTicker=(delta)=>{
		TWEEN.update(performance.now());
//		TWEEN.update(Date.now());
	}

	onWindowResize=()=>{
		if (!this.element)
			return;

		this.contentScaler.setScreenSize(
			this.element.clientWidth,
			this.element.clientHeight
		);

		this.app.renderer.resize(
			this.element.clientWidth,
			this.element.clientHeight
		);
	}
}

module.exports=PixiApp;
},{"./ContentScaler":34,"@tweenjs/tween.js":1}],42:[function(require,module,exports){
class PixiUtil {
	static findTopParent(o) {
		while (o.parent)
			o=o.parent;

		return o;
	}

	static globalHitTest(object, globalPoint) {
		if((globalPoint.x >= object.getBounds().x ) && 
				(globalPoint.x <= (object.getBounds().x + object.getBounds().width)) &&
				(globalPoint.y >= object.getBounds().y) && 
				(globalPoint.y <= (object.getBounds().y + object.getBounds().height)))
			return true;

		return false;
	}
}

module.exports=PixiUtil;
},{}],43:[function(require,module,exports){
/**
 * Utilities.
 * @module utils
 */

const PixiUtil=require("./PixiUtil.js");

/*
 * Make it logaritmic:
 * https://stackoverflow.com/questions/846221/logarithmic-slider
 */

const TWEEN = require('@tweenjs/tween.js');

/**
 * Slider. This is the class for the slider.
 * @class Slider
 */
class Slider extends PIXI.Container {
	constructor(background, knob) {
		super();
		this.background = background;
		this.knob = knob;

		this.addChild(this.background);
		this.addChild(this.knob);

		this.knob.buttonMode = true;
		this.knob.interactive = true;
		this.knob.on("mousedown",this.onKnobMouseDown);

		this.background.buttonMode = true;
		this.background.interactive = true;
		this.background.on("mousedown",this.onBackgroundMouseDown);
	}

	/**
	 * Mouse down on knob.
	 * @method onKnobMouseDown
	 */
	onKnobMouseDown=(e)=>{
		this.downPos = this.knob.position.x;
		this.downX = this.toLocal(e.data.global).x;

		this.stage=PixiUtil.findTopParent(this);
		this.stage.interactive=true;
		this.stage.on("mouseup",this.onStageMouseUp);
		this.stage.on("mousemove",this.onStageMouseMove);
	}

	/**
	 * Mouse down on background.
	 * @method onBackgroundMouseDown
	 */
	onBackgroundMouseDown=(e)=>{
		let x=this.toLocal(e.data.global).x;
		this.downX=x;
		this.knob.x=x-this.knob.width/2;

		this.validateValue();

		this.downPos = this.knob.position.x;

		this.stage=PixiUtil.findTopParent(this);
		this.stage.interactive=true;
		this.stage.on("mouseup",this.onStageMouseUp);
		this.stage.on("mousemove",this.onStageMouseMove);

		this.emit("change");
	}

	/**
	 * Mouse up.
	 * @method onStageMouseUp
	 */
	onStageMouseUp=(e)=>{
		this.stage.interactive=false;
		this.stage.off("mouseup",this.onStageMouseUp);
		this.stage.off("mousemove",this.onStageMouseMove);
	}

	/**
	 * Mouse move.
	 * @method onStageMouseMove
	 */
	onStageMouseMove=(e)=>{
		if (!e.data.buttons) {
			this.onStageMouseUp();
			return;
		}

		let x=this.toLocal(e.data.global).x;
		this.knob.x = this.downPos + (x - this.downX);

		this.validateValue();

		this.emit("change");
	}

	/**
	 * Validate position.
	 * @method validateValue
	 */
	validateValue() {
		if(this.knob.x < 0)
			this.knob.x = 0;

		if(this.knob.x > (this.background.width - this.knob.width))
			this.knob.x = this.background.width - this.knob.width;
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	getValue() {
		var fraction = this.knob.position.x/(this.background.width - this.knob.width);

		return fraction;
	}

	/**
	 * Get value.
	 * @method getValue
	 */
	setValue(value) {
		this.knob.x = this.background.position.x + value*(this.background.width - this.knob.width);

		this.validateValue();
		return this.getValue();
	}
}

module.exports = Slider;

},{"./PixiUtil.js":42,"@tweenjs/tween.js":1}],44:[function(require,module,exports){
/**
 * Client.
 * @module client
 */

var Button = require("./Button");
var NineSlice = require("./NineSlice");

/**
 * Dialog button.
 * @class DialogButton
 */
class TextButton extends Button {
	constructor(style) {
		super();

		this.style=style;

		this.buttonTexture=style.texture;
		this.background=new NineSlice(this.buttonTexture,style.hEdge,10);
		this.addChild(this.background);

		this.textField = new PIXI.Text("[test]", style);
		this.textField.position.x=this.style.hEdge;
		this.textField.position.y=Math.floor(this.buttonTexture.height/2-this.style.fontSize/2);
		this.addChild(this.textField);

		this.setText("BTN");
	}


	/**
	 * Set text for the button.
	 * @method setText
	 */
	setText(text) {
		this.textField.text=text;
//		this.textField.x = this.buttonTexture.width / 2 - this.textField.width / 2;

		this.background.setLocalSize(this.textField.width+2*this.style.hEdge,this.buttonTexture.height);
	}
}

module.exports = TextButton;
},{"./Button":32,"./NineSlice":40}],45:[function(require,module,exports){
// From: https://www.npmjs.com/package/pixi-text-input

class TextInput extends PIXI.Container{
  constructor(styles){
    super()
    this._input_style = Object.assign(
      {
        position: 'absolute',
        background: 'none',
        border: 'none',
        outline: 'none',
        transformOrigin: '0 0',
        lineHeight: '1'
      },
      styles.input
    )

    if(styles.box)
      this._box_generator = typeof styles.box === 'function' ? styles.box : new DefaultBoxGenerator(styles.box)
    else
      this._box_generator = null

    if(this._input_style.hasOwnProperty('multiline')){
      this._multiline = !!this._input_style.multiline
      delete this._input_style.multiline
    }else
      this._multiline = false

    this._box_cache = {}
    this._previous = {}
    this._dom_added = false
    this._dom_visible = true
    this._placeholder = ''
    this._placeholderColor = 0xa9a9a9
    this._selection = [0,0]
    this._restrict_value = ''
    this._createDOMInput()
    this.substituteText = true
    this._setState('DEFAULT')
    this._addListeners()
  }


  // GETTERS & SETTERS

  get substituteText(){
    return this._substituted
  }

  set substituteText(substitute){
    if(this._substituted==substitute) 
      return

    this._substituted = substitute

    if(substitute){
      this._createSurrogate()
      this._dom_visible = false
    }else{
      this._destroySurrogate()
      this._dom_visible = true
    }
    this.placeholder = this._placeholder
    this._update()
  }

  get placeholder(){
    return this._placeholder
  }

  set placeholder(text){
    this._placeholder = text
    if(this._substituted){
      this._updateSurrogate()
      this._dom_input.placeholder = ''
    }else{
      this._dom_input.placeholder = text
    }
  }

  get disabled(){
    return this._disabled
  }

  set disabled(disabled){
    this._disabled = disabled
    this._dom_input.disabled = disabled
    this._setState(disabled ? 'DISABLED' : 'DEFAULT')
  }

  get maxLength(){
    return this._max_length
  }

  set maxLength(length){
    this._max_length = length
    this._dom_input.setAttribute('maxlength', length)
  }

  get restrict(){
    return this._restrict_regex
  }

  set restrict(regex){
    if(regex instanceof RegExp){
      regex = regex.toString().slice(1,-1)

      if(regex.charAt(0) !== '^')
        regex = '^'+regex

      if(regex.charAt(regex.length-1) !== '$')
        regex = regex+'$'

      regex = new RegExp(regex)
    }else{
      regex = new RegExp('^['+regex+']*$')
    }

    this._restrict_regex = regex
  }

  get text(){
    return this._dom_input.value
  }

  set text(text){
    this._dom_input.value = text
    if(this._substituted) this._updateSurrogate()
  }

  get htmlInput(){
    return this._dom_input
  }

  focus(){
    if(this._substituted && !this.dom_visible)
      this._setDOMInputVisible(true)

    this._dom_input.focus()
    
  }

  blur(){
    this._dom_input.blur()
  }

  select(){
    this.focus()
    this._dom_input.select()
  }

  setInputStyle(key,value){
    this._input_style[key] = value
    this._dom_input.style[key] = value

    if(this._substituted && (key==='fontFamily' || key==='fontSize'))
      this._updateFontMetrics()

    if(this._last_renderer)
      this._update()
  }

  destroy(options){
    this._destroyBoxCache()
    super.destroy(options)
  }


  // SETUP

  _createDOMInput(){
    if(this._multiline){
      this._dom_input = document.createElement('textarea')
      this._dom_input.style.resize = 'none'
    }else{
      this._dom_input = document.createElement('input')
      this._dom_input.type = 'text'
    }
    
    for(let key in this._input_style){
      this._dom_input.style[key] = this._input_style[key]
    }
  }

  _addListeners(){
    this.on('added',this._onAdded.bind(this))
    this.on('removed',this._onRemoved.bind(this))
    this._dom_input.addEventListener('keydown', this._onInputKeyDown.bind(this))
    this._dom_input.addEventListener('input', this._onInputInput.bind(this))
    this._dom_input.addEventListener('keyup', this._onInputKeyUp.bind(this))
    this._dom_input.addEventListener('focus', this._onFocused.bind(this))
    this._dom_input.addEventListener('blur', this._onBlurred.bind(this))
  }

  _onInputKeyDown(e){
    this._selection = [
      this._dom_input.selectionStart,
      this._dom_input.selectionEnd
    ]

    this.emit('keydown',e.keyCode)
  }

  _onInputInput(e){
    if(this._restrict_regex)
      this._applyRestriction()

    if(this._substituted)
      this._updateSubstitution()

    this.emit('input',this.text)
  }

  _onInputKeyUp(e){
    this.emit('keyup',e.keyCode)
  }

  _onFocused(){
    this._setState('FOCUSED')
    this.emit('focus')
  }

  _onBlurred(){
    this._setState('DEFAULT')
    this.emit('blur')
  }

  _onAdded(){
    document.body.appendChild(this._dom_input)
    this._dom_input.style.display = 'none'
    this._dom_added = true
  }

  _onRemoved(){
    document.body.removeChild(this._dom_input)
    this._dom_added = false
  }

  _setState(state){
    this.state = state
    this._updateBox()
    if(this._substituted)
      this._updateSubstitution()
  }



  // RENDER & UPDATE

  // for pixi v4
  renderWebGL(renderer){
    super.renderWebGL(renderer)
    this._renderInternal(renderer)
  }

  // for pixi v4
  renderCanvas(renderer){
    super.renderCanvas(renderer)
    this._renderInternal(renderer)
  }

  // for pixi v5
  render(renderer){
    super.render(renderer)
    this._renderInternal(renderer)
  }

  _renderInternal(renderer){
    this._resolution = renderer.resolution
    this._last_renderer = renderer
    this._canvas_bounds = this._getCanvasBounds()
    if(this._needsUpdate())
      this._update()
  }

  _update(){
    this._updateDOMInput()
    if(this._substituted) this._updateSurrogate()
    this._updateBox()
  }

  _updateBox(){
    if(!this._box_generator)
      return

    if(this._needsNewBoxCache())
      this._buildBoxCache()

    if(this.state==this._previous.state 
      && this._box==this._box_cache[this.state])
      return

    if(this._box)
      this.removeChild(this._box)

    this._box = this._box_cache[this.state]
    this.addChildAt(this._box,0)
    this._previous.state = this.state
  }

  _updateSubstitution(){
    if(this.state==='FOCUSED'){
      this._dom_visible = true
      this._surrogate.visible = this.text.length===0
    }else{
      this._dom_visible = false
      this._surrogate.visible = true
    }
    this._updateDOMInput()
    this._updateSurrogate()
  }

  _updateDOMInput(){
    if(!this._canvas_bounds)
      return

    this._dom_input.style.top = (this._canvas_bounds.top || 0)+'px'
    this._dom_input.style.left = (this._canvas_bounds.left || 0)+'px'
    this._dom_input.style.transform = this._pixiMatrixToCSS(this._getDOMRelativeWorldTransform())
    this._dom_input.style.opacity = this.worldAlpha
    this._setDOMInputVisible(this.worldVisible && this._dom_visible)

    this._previous.canvas_bounds = this._canvas_bounds
    this._previous.world_transform = this.worldTransform.clone()
    this._previous.world_alpha = this.worldAlpha
    this._previous.world_visible = this.worldVisible
  }

  _applyRestriction(){
    if(this._restrict_regex.test(this.text)){
      this._restrict_value = this.text
    }else{
      this.text = this._restrict_value
      this._dom_input.setSelectionRange(
        this._selection[0],
        this._selection[1]
      )
    }
  }


  // STATE COMPAIRSON (FOR PERFORMANCE BENEFITS)

  _needsUpdate(){
    return (
      !this._comparePixiMatrices(this.worldTransform,this._previous.world_transform)
      || !this._compareClientRects(this._canvas_bounds,this._previous.canvas_bounds)
      || this.worldAlpha != this._previous.world_alpha
      || this.worldVisible != this._previous.world_visible
    )
  }

  _needsNewBoxCache(){
    let input_bounds = this._getDOMInputBounds()
    return (
      !this._previous.input_bounds
      || input_bounds.width != this._previous.input_bounds.width
      || input_bounds.height != this._previous.input_bounds.height
    )
  }


  // INPUT SUBSTITUTION

  _createSurrogate(){
    this._surrogate_hitbox = new PIXI.Graphics()
    this._surrogate_hitbox.alpha = 0
    this._surrogate_hitbox.interactive = true
    this._surrogate_hitbox.cursor = 'text'
    this._surrogate_hitbox.on('pointerdown',this._onSurrogateFocus.bind(this))
    this.addChild(this._surrogate_hitbox)

    this._surrogate_mask = new PIXI.Graphics()
    this.addChild(this._surrogate_mask)

    this._surrogate = new PIXI.Text('',{})
    this.addChild(this._surrogate)

    this._surrogate.mask = this._surrogate_mask

    this._updateFontMetrics()
    this._updateSurrogate()
  }

  _updateSurrogate(){
    let padding = this._deriveSurrogatePadding()
    let input_bounds = this._getDOMInputBounds()

    this._surrogate.style = this._deriveSurrogateStyle()
    this._surrogate.style.padding = Math.max.apply(Math,padding)
    this._surrogate.y = this._multiline ? padding[0] : (input_bounds.height-this._surrogate.height)/2
    this._surrogate.x = padding[3]
    this._surrogate.text = this._deriveSurrogateText()

    switch (this._surrogate.style.align){
      case 'left':
        this._surrogate.x = padding[3]
        break

      case 'center':
        this._surrogate.x = input_bounds.width * 0.5 - this._surrogate.width * 0.5
        break
        
      case 'right':
        this._surrogate.x = input_bounds.width - padding[1] - this._surrogate.width
        break
    }

    this._updateSurrogateHitbox(input_bounds)
    this._updateSurrogateMask(input_bounds,padding)
  }

  _updateSurrogateHitbox(bounds){
    this._surrogate_hitbox.clear()
    this._surrogate_hitbox.beginFill(0)
    this._surrogate_hitbox.drawRect(0,0,bounds.width,bounds.height)
    this._surrogate_hitbox.endFill()
    this._surrogate_hitbox.interactive = !this._disabled
  }

  _updateSurrogateMask(bounds,padding){
    this._surrogate_mask.clear()
    this._surrogate_mask.beginFill(0)
    this._surrogate_mask.drawRect(padding[3],0,bounds.width-padding[3]-padding[1],bounds.height)
    this._surrogate_mask.endFill()
  }

  _destroySurrogate(){
    if(!this._surrogate) return

    this.removeChild(this._surrogate)
    this.removeChild(this._surrogate_hitbox)

    this._surrogate.destroy()
    this._surrogate_hitbox.destroy()

    this._surrogate = null
    this._surrogate_hitbox = null
  }

  _onSurrogateFocus(){
    this._setDOMInputVisible(true)
    //sometimes the input is not being focused by the mouseclick
    setTimeout(this._ensureFocus.bind(this),10)
  }

  _ensureFocus(){
    if(!this._hasFocus())
      this.focus()
  }

  _deriveSurrogateStyle(){
    let style = new PIXI.TextStyle()

    for(var key in this._input_style){
      switch(key){
        case 'color':
          style.fill = this._input_style.color
          break

        case 'fontFamily':
        case 'fontSize':
        case 'fontWeight':
        case 'fontVariant':
        case 'fontStyle':
          style[key] = this._input_style[key]
          break

        case 'letterSpacing':
          style.letterSpacing = parseFloat(this._input_style.letterSpacing)
          break

        case 'textAlign':
          style.align = this._input_style.textAlign
          break
      }
    }

    if(this._multiline){
      style.lineHeight = parseFloat(style.fontSize)
      style.wordWrap = true
      style.wordWrapWidth = this._getDOMInputBounds().width
    }

    if(this._dom_input.value.length === 0)
      style.fill = this._placeholderColor

    return style
  }

  _deriveSurrogatePadding(){
    let indent = this._input_style.textIndent ? parseFloat(this._input_style.textIndent) : 0

    if(this._input_style.padding && this._input_style.padding.length>0){
      let components = this._input_style.padding.trim().split(' ')

      if(components.length==1){
        let padding = parseFloat(components[0])
        return [padding,padding,padding,padding+indent]
      }else if(components.length==2){
        let paddingV = parseFloat(components[0])
        let paddingH = parseFloat(components[1])
        return [paddingV,paddingH,paddingV,paddingH+indent]
      }else if(components.length==4){
        let padding = components.map(component => {
          return parseFloat(component)
        })
        padding[3] += indent
        return padding
      }
    }

    return [0,0,0,indent]
  }

  _deriveSurrogateText(){
    return this._dom_input.value.length === 0 ? this._placeholder : this._dom_input.value
  }

  _updateFontMetrics(){
    const style = this._deriveSurrogateStyle()
    const font = style.toFontString()

    this._font_metrics = PIXI.TextMetrics.measureFont(font)
  }


  // CACHING OF INPUT BOX GRAPHICS

  _buildBoxCache(){
    this._destroyBoxCache()

    let states = ['DEFAULT','FOCUSED','DISABLED']
    let input_bounds = this._getDOMInputBounds()

    for(let i in states){
      this._box_cache[states[i]] = this._box_generator(
        input_bounds.width,
        input_bounds.height,
        states[i]
      )
    }

    this._previous.input_bounds = input_bounds
  }

  _destroyBoxCache(){
    if(this._box){
      this.removeChild(this._box)
      this._box = null
    }

    for(let i in this._box_cache){
      this._box_cache[i].destroy()
      this._box_cache[i] = null
      delete this._box_cache[i]
    }
  }


  // HELPER FUNCTIONS

  _hasFocus(){
    return document.activeElement===this._dom_input
  }

  _setDOMInputVisible(visible){
    this._dom_input.style.display = visible ? 'block' : 'none'
  }

  _getCanvasBounds(){
    let rect = this._last_renderer.view.getBoundingClientRect()
    let bounds = {top: rect.top, left: rect.left, width: rect.width, height: rect.height}
    bounds.left += window.scrollX
    bounds.top += window.scrollY
    return bounds
  }

  _getDOMInputBounds(){
    let remove_after = false

    if(!this._dom_added){
      document.body.appendChild(this._dom_input)
      remove_after = true
    }

    let org_transform = this._dom_input.style.transform
    let org_display = this._dom_input.style.display
    this._dom_input.style.transform = ''
    this._dom_input.style.display = 'block'
    let bounds = this._dom_input.getBoundingClientRect()
    this._dom_input.style.transform = org_transform
    this._dom_input.style.display = org_display

    if(remove_after)
      document.body.removeChild(this._dom_input)

    return bounds
  }

  _getDOMRelativeWorldTransform(){
    let canvas_bounds = this._last_renderer.view.getBoundingClientRect()
    let matrix = this.worldTransform.clone()

    matrix.scale(this._resolution,this._resolution)
    matrix.scale(canvas_bounds.width/this._last_renderer.width,
           canvas_bounds.height/this._last_renderer.height)
    return matrix
  }

  _pixiMatrixToCSS(m){
    return 'matrix('+[m.a,m.b,m.c,m.d,m.tx,m.ty].join(',')+')'
  }

  _comparePixiMatrices(m1,m2){
    if(!m1 || !m2) return false
    return (
      m1.a == m2.a
      && m1.b == m2.b
      && m1.c == m2.c
      && m1.d == m2.d
      && m1.tx == m2.tx
      && m1.ty == m2.ty
    )
  }

  _compareClientRects(r1,r2){
    if(!r1 || !r2) return false
    return (
      r1.left == r2.left
      && r1.top == r2.top
      && r1.width == r2.width
      && r1.height == r2.height
    )
  }
}


function DefaultBoxGenerator(styles){
  styles = styles || {fill: 0xcccccc}

  if(styles.default){
    styles.focused = styles.focused || styles.default
    styles.disabled = styles.disabled || styles.default
  }else{
    let temp_styles = styles
    styles = {}
    styles.default = styles.focused = styles.disabled = temp_styles
  }

  return function(w,h,state){
    let style = styles[state.toLowerCase()]
    let box = new PIXI.Graphics()

    if(style.fill)
      box.beginFill(style.fill)

    if(style.stroke)
      box.lineStyle(
        style.stroke.width || 1,
        style.stroke.color || 0,
        style.stroke.alpha || 1
      )

    if(style.rounded)
      box.drawRoundedRect(0,0,w,h,style.rounded)
    else
      box.drawRect(0,0,w,h)

    box.endFill()
    box.closePath()

    return box
  }
}

module.exports=TextInput;
},{}],46:[function(require,module,exports){
const EventEmitter=require("events");

class Timeout extends EventEmitter {
	constructor(delay) {
		super();
		setTimeout(this.onTimeout,delay);
	}

	onTimeout=()=>{
		this.emit("timeout");
	}
}

module.exports=Timeout;
},{"events":3}]},{},[12]);
