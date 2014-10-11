(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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
 * @module utils
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
},{}],3:[function(require,module,exports){
/**
 * Function utils.
 * @class FunctionUtil
 * @module utils
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

},{}],4:[function(require,module,exports){
(function (process){
var EventDispatcher = require("./EventDispatcher");
var FunctionUtil = require("./FunctionUtil");

/**
 * An implementation of promises as defined here:
 * http://promises-aplus.github.io/promises-spec/
 * @class Thenable
 * @module utils
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
},{"./EventDispatcher":2,"./FunctionUtil":3,"_process":1}],5:[function(require,module,exports){
var Thenable = require("../../../src/utils/Thenable");

thenable = new Thenable();

thenable.then(function() {
	console.log("thenable resolved");
});

thenable.resolve();
},{"../../../src/utils/Thenable":4}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL3V0aWxzL0V2ZW50RGlzcGF0Y2hlci5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL3V0aWxzL0Z1bmN0aW9uVXRpbC5qcyIsIi9Vc2Vycy9taWthZWwvRG9jdW1lbnRzL3JlcG8vbmV0cG9rZXIvc3JjL3V0aWxzL1RoZW5hYmxlLmpzIiwiL1VzZXJzL21pa2FlbC9Eb2N1bWVudHMvcmVwby9uZXRwb2tlci90ZXN0L3ZpZXcvdGhlbmFibGUvdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBBUzMvanF1ZXJ5IHN0eWxlIGV2ZW50IGRpc3BhdGNoZXIuIFNsaWdodGx5IG1vZGlmaWVkLiBUaGVcbiAqIGpxdWVyeSBzdHlsZSBvbi9vZmYvdHJpZ2dlciBzdHlsZSBvZiBhZGRpbmcgbGlzdGVuZXJzIGlzXG4gKiBjdXJyZW50bHkgdGhlIHByZWZlcnJlZCBvbmUuXG4gKiBcbiAqIFRoZSBvbiBtZXRob2QgZm9yIGFkZGluZyBsaXN0ZW5lcnMgdGFrZXMgYW4gZXh0cmEgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZVxuICogc2NvcGUgaW4gd2hpY2ggbGlzdGVuZXJzIHNob3VsZCBiZSBjYWxsZWQuIFNvIHRoaXM6XG4gKlxuICogICAgIG9iamVjdC5vbihcImV2ZW50XCIsIGxpc3RlbmVyLCB0aGlzKTtcbiAqXG4gKiBIYXMgdGhlIHNhbWUgZnVuY3Rpb24gd2hlbiBhZGRpbmcgZXZlbnRzIGFzOlxuICpcbiAqICAgICBvYmplY3Qub24oXCJldmVudFwiLCBsaXN0ZW5lci5iaW5kKHRoaXMpKTtcbiAqXG4gKiBIb3dldmVyLCB0aGUgZGlmZmVyZW5jZSBpcyB0aGF0IGlmIHdlIHVzZSB0aGUgc2Vjb25kIG1ldGhvZCBpdFxuICogd2lsbCBub3QgYmUgcG9zc2libGUgdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lcnMgbGF0ZXIsIHVubGVzc1xuICogdGhlIGNsb3N1cmUgY3JlYXRlZCBieSBiaW5kIGlzIHN0b3JlZCBzb21ld2hlcmUuIElmIHRoZSBcbiAqIGZpcnN0IG1ldGhvZCBpcyB1c2VkLCB3ZSBjYW4gcmVtb3ZlIHRoZSBsaXN0ZW5lciB3aXRoOlxuICpcbiAqICAgICBvYmplY3Qub2ZmKFwiZXZlbnRcIiwgbGlzdGVuZXIsIHRoaXMpO1xuICpcbiAqIEBjbGFzcyBFdmVudERpc3BhdGNoZXJcbiAqIEBtb2R1bGUgdXRpbHNcbiAqL1xuZnVuY3Rpb24gRXZlbnREaXNwYXRjaGVyKCkge1xuXHR0aGlzLmxpc3RlbmVyTWFwID0ge307XG59XG5cbi8qKlxuICogQWRkIGV2ZW50IGxpc3RlbmVyLlxuICogQG1ldGhvZCBhZGRFdmVudExpc3RlbmVyXG4gKiBAZGVwcmVjYXRlZFxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudFR5cGUsIGxpc3RlbmVyLCBzY29wZSkge1xuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXApXG5cdFx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuXG5cdGlmICghZXZlbnRUeXBlKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIkV2ZW50IHR5cGUgcmVxdWlyZWQgZm9yIGV2ZW50IGRpc3BhdGNoZXJcIik7XG5cblx0aWYgKCFsaXN0ZW5lcilcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJMaXN0ZW5lciByZXF1aXJlZCBmb3IgZXZlbnQgZGlzcGF0Y2hlclwiKTtcblxuXHR0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBsaXN0ZW5lciwgc2NvcGUpO1xuXG5cdGlmICghdGhpcy5saXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKVxuXHRcdHRoaXMubGlzdGVuZXJNYXBbZXZlbnRUeXBlXSA9IFtdO1xuXG5cdHRoaXMubGlzdGVuZXJNYXBbZXZlbnRUeXBlXS5wdXNoKHtcblx0XHRsaXN0ZW5lcjogbGlzdGVuZXIsXG5cdFx0c2NvcGU6IHNjb3BlXG5cdH0pO1xufVxuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lci5cbiAqIEBtZXRob2QgcmVtb3ZlRXZlbnRMaXN0ZW5lclxuICogQGRlcHJlY2F0ZWRcbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBsaXN0ZW5lciwgc2NvcGUpIHtcblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwKVxuXHRcdHRoaXMubGlzdGVuZXJNYXAgPSB7fTtcblxuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSlcblx0XHRyZXR1cm47XG5cblx0dmFyIGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBsaXN0ZW5lck9iaiA9IGxpc3RlbmVyc1tpXTtcblxuXHRcdGlmIChsaXN0ZW5lciA9PSBsaXN0ZW5lck9iai5saXN0ZW5lciAmJiBzY29wZSA9PSBsaXN0ZW5lck9iai5zY29wZSkge1xuXHRcdFx0bGlzdGVuZXJzLnNwbGljZShpLCAxKTtcblx0XHRcdGktLTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIWxpc3RlbmVycy5sZW5ndGgpXG5cdFx0ZGVsZXRlIHRoaXMubGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBldmVudC5cbiAqIEBtZXRob2QgZGlzcGF0Y2hFdmVudFxuICovXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQgPSBmdW5jdGlvbihldmVudCwgZGF0YSkge1xuXHRpZiAoIXRoaXMubGlzdGVuZXJNYXApXG5cdFx0dGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuXG5cdGlmICh0eXBlb2YgZXZlbnQgPT0gXCJzdHJpbmdcIikge1xuXHRcdGV2ZW50ID0ge1xuXHRcdFx0dHlwZTogZXZlbnRcblx0XHR9O1xuXHR9XG5cblx0aWYgKCF0aGlzLmxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KGV2ZW50LnR5cGUpKVxuXHRcdHJldHVybjtcblxuXHRpZiAoZGF0YSA9PSB1bmRlZmluZWQpXG5cdFx0ZGF0YSA9IGV2ZW50O1xuXG5cdGRhdGEudGFyZ2V0ID0gdGhpcztcblxuXHRmb3IgKHZhciBpIGluIHRoaXMubGlzdGVuZXJNYXBbZXZlbnQudHlwZV0pIHtcblx0XHR2YXIgbGlzdGVuZXJPYmogPSB0aGlzLmxpc3RlbmVyTWFwW2V2ZW50LnR5cGVdW2ldO1xuXG5cdFx0bGlzdGVuZXJPYmoubGlzdGVuZXIuY2FsbChsaXN0ZW5lck9iai5zY29wZSwgZGF0YSk7XG5cdH1cbn1cblxuLyoqXG4gKiBKcXVlcnkgc3R5bGUgYWxpYXMgZm9yIGFkZEV2ZW50TGlzdGVuZXJcbiAqIEBtZXRob2Qgb25cbiAqL1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcjtcblxuLyoqXG4gKiBKcXVlcnkgc3R5bGUgYWxpYXMgZm9yIHJlbW92ZUV2ZW50TGlzdGVuZXJcbiAqIEBtZXRob2Qgb2ZmXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyO1xuXG4vKipcbiAqIEpxdWVyeSBzdHlsZSBhbGlhcyBmb3IgZGlzcGF0Y2hFdmVudFxuICogQG1ldGhvZCB0cmlnZ2VyXG4gKi9cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudDtcblxuLyoqXG4gKiBNYWtlIHNvbWV0aGluZyBhbiBldmVudCBkaXNwYXRjaGVyLiBDYW4gYmUgdXNlZCBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UuXG4gKiBAbWV0aG9kIGluaXRcbiAqIEBzdGF0aWNcbiAqL1xuRXZlbnREaXNwYXRjaGVyLmluaXQgPSBmdW5jdGlvbihjbHMpIHtcblx0Y2xzLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xuXHRjbHMucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG5cdGNscy5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudDtcblx0Y2xzLnByb3RvdHlwZS5vbiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub247XG5cdGNscy5wcm90b3R5cGUub2ZmID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmY7XG5cdGNscy5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7IiwiLyoqXG4gKiBGdW5jdGlvbiB1dGlscy5cbiAqIEBjbGFzcyBGdW5jdGlvblV0aWxcbiAqIEBtb2R1bGUgdXRpbHNcbiAqL1xuZnVuY3Rpb24gRnVuY3Rpb25VdGlsKCkge1xufVxuXG4vKipcbiAqIEV4dGVuZCBhIGNsYXNzLlxuICogRG9uJ3QgZm9yZ2V0IHRvIGNhbGwgc3VwZXIuXG4gKiBAbWV0aG9kIGV4dGVuZFxuICogQHN0YXRpY1xuICovXG5GdW5jdGlvblV0aWwuZXh0ZW5kPWZ1bmN0aW9uKHRhcmdldCwgYmFzZSkge1xuXHR0YXJnZXQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoYmFzZS5wcm90b3R5cGUpO1xuXHR0YXJnZXQucHJvdG90eXBlLmNvbnN0cnVjdG9yPXRhcmdldDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgZGVsZWdhdGUgZnVuY3Rpb24uIERlcHJlY2F0ZWQsIHVzZSBiaW5kKCkgaW5zdGVhZC5cbiAqIEBtZXRob2QgY3JlYXRlRGVsZWdhdGVcbiAqIEBkZXByZWNhdGVkXG4gKiBAc3RhdGljXG4gKi9cbkZ1bmN0aW9uVXRpbC5jcmVhdGVEZWxlZ2F0ZT1mdW5jdGlvbihmdW5jLCBzY29wZSkge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0ZnVuYy5hcHBseShzY29wZSxhcmd1bWVudHMpO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cz1GdW5jdGlvblV0aWw7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoXCIuL0V2ZW50RGlzcGF0Y2hlclwiKTtcbnZhciBGdW5jdGlvblV0aWwgPSByZXF1aXJlKFwiLi9GdW5jdGlvblV0aWxcIik7XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgcHJvbWlzZXMgYXMgZGVmaW5lZCBoZXJlOlxuICogaHR0cDovL3Byb21pc2VzLWFwbHVzLmdpdGh1Yi5pby9wcm9taXNlcy1zcGVjL1xuICogQGNsYXNzIFRoZW5hYmxlXG4gKiBAbW9kdWxlIHV0aWxzXG4gKi9cbmZ1bmN0aW9uIFRoZW5hYmxlKCkge1xuXHRFdmVudERpc3BhdGNoZXIuY2FsbCh0aGlzKVxuXG5cdHRoaXMuc3VjY2Vzc0hhbmRsZXJzID0gW107XG5cdHRoaXMuZXJyb3JIYW5kbGVycyA9IFtdO1xuXHR0aGlzLm5vdGlmaWVkID0gZmFsc2U7XG5cdHRoaXMuaGFuZGxlcnNDYWxsZWQgPSBmYWxzZTtcblx0dGhpcy5ub3RpZnlQYXJhbSA9IG51bGw7XG59XG5cbkZ1bmN0aW9uVXRpbC5leHRlbmQoVGhlbmFibGUsIEV2ZW50RGlzcGF0Y2hlcik7XG5cbi8qKlxuICogU2V0IHJlc29sdXRpb24gaGFuZGxlcnMuXG4gKiBAbWV0aG9kIHRoZW5cbiAqIEBwYXJhbSBzdWNjZXNzIFRoZSBmdW5jdGlvbiBjYWxsZWQgdG8gaGFuZGxlIHN1Y2Nlc3MuXG4gKiBAcGFyYW0gZXJyb3IgVGhlIGZ1bmN0aW9uIGNhbGxlZCB0byBoYW5kbGUgZXJyb3IuXG4gKiBAcmV0dXJuIFRoaXMgVGhlbmFibGUgZm9yIGNoYWluaW5nLlxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKHN1Y2Nlc3MsIGVycm9yKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgdGhlbmFibGUgaXMgYWxyZWFkeSB1c2VkLlwiKTtcblxuXHR0aGlzLnN1Y2Nlc3NIYW5kbGVycy5wdXNoKHN1Y2Nlc3MpO1xuXHR0aGlzLmVycm9ySGFuZGxlcnMucHVzaChlcnJvcik7XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogTm90aWZ5IHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEBtZXRob2Qgbm90aWZ5U3VjY2Vzc1xuICovXG5UaGVuYWJsZS5wcm90b3R5cGUubm90aWZ5U3VjY2VzcyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG5cdGlmICh0aGlzLmhhbmRsZXJzQ2FsbGVkKVxuXHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgdGhlbmFibGUgaXMgYWxyZWFkeSBub3RpZmllZC5cIik7XG5cblx0dGhpcy5ub3RpZnlQYXJhbSA9IHBhcmFtO1xuXHQvL3NldFRpbWVvdXQodGhpcy5kb05vdGlmeVN1Y2Nlc3MuYmluZCh0aGlzKSwgMCk7XG5cdHByb2Nlc3MubmV4dFRpY2sodGhpcy5kb05vdGlmeVN1Y2Nlc3MuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogTm90aWZ5IGZhaWx1cmUgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEBtZXRob2Qgbm90aWZ5RXJyb3JcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLm5vdGlmeUVycm9yID0gZnVuY3Rpb24ocGFyYW0pIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhpcyB0aGVuYWJsZSBpcyBhbHJlYWR5IG5vdGlmaWVkLlwiKTtcblxuXHR0aGlzLm5vdGlmeVBhcmFtID0gcGFyYW07XG5cdC8vc2V0VGltZW91dCh0aGlzLmRvTm90aWZ5RXJyb3IuYmluZCh0aGlzKSwgMCk7XG5cdHByb2Nlc3MubmV4dFRpY2sodGhpcy5kb05vdGlmeUVycm9yLmJpbmQodGhpcykpO1xufVxuXG4vKipcbiAqIEFjdHVhbGx5IG5vdGlmeSBzdWNjZXNzLlxuICogQG1ldGhvZCBkb05vdGlmeVN1Y2Nlc3NcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5kb05vdGlmeVN1Y2Nlc3MgPSBmdW5jdGlvbihwYXJhbSkge1xuXHRpZiAocGFyYW0pXG5cdFx0dGhpcy5ub3RpZnlQYXJhbSA9IHBhcmFtO1xuXG5cdHRoaXMuY2FsbEhhbmRsZXJzKHRoaXMuc3VjY2Vzc0hhbmRsZXJzKTtcbn1cblxuLyoqXG4gKiBBY3R1YWxseSBub3RpZnkgZXJyb3IuXG4gKiBAbWV0aG9kIGRvTm90aWZ5RXJyb3JcbiAqIEBwcml2YXRlXG4gKi9cblRoZW5hYmxlLnByb3RvdHlwZS5kb05vdGlmeUVycm9yID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuY2FsbEhhbmRsZXJzKHRoaXMuZXJyb3JIYW5kbGVycyk7XG59XG5cbi8qKlxuICogQ2FsbCBoYW5kbGVycy5cbiAqIEBtZXRob2QgY2FsbEhhbmRsZXJzXG4gKiBAcHJpdmF0ZVxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUuY2FsbEhhbmRsZXJzID0gZnVuY3Rpb24oaGFuZGxlcnMpIHtcblx0aWYgKHRoaXMuaGFuZGxlcnNDYWxsZWQpXG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIG5ldmVyIGhhcHBlbi5cIik7XG5cblx0dGhpcy5oYW5kbGVyc0NhbGxlZCA9IHRydWU7XG5cblx0Zm9yICh2YXIgaSBpbiBoYW5kbGVycykge1xuXHRcdGlmIChoYW5kbGVyc1tpXSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aGFuZGxlcnNbaV0uY2FsbChudWxsLCB0aGlzLm5vdGlmeVBhcmFtKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkV4Y2VwdGlvbiBpbiBUaGVuYWJsZSBoYW5kbGVyOiBcIiArIGUpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlLnN0YWNrKTtcblx0XHRcdFx0dGhyb3cgZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIHByb21pc2UuXG4gKiBAbWV0aG9kIHJlc29sdmVcbiAqL1xuVGhlbmFibGUucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbihyZXN1bHQpIHtcblx0dGhpcy5ub3RpZnlTdWNjZXNzKHJlc3VsdCk7XG59XG5cbi8qKlxuICogUmVqZWN0IHByb21pc2UuXG4gKiBAbWV0aG9kIHJlamVjdFxuICovXG5UaGVuYWJsZS5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24ocmVhc29uKSB7XG5cdHRoaXMubm90aWZ5RXJyb3IocmVhc29uKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaGVuYWJsZTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsInZhciBUaGVuYWJsZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvdXRpbHMvVGhlbmFibGVcIik7XG5cbnRoZW5hYmxlID0gbmV3IFRoZW5hYmxlKCk7XG5cbnRoZW5hYmxlLnRoZW4oZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKFwidGhlbmFibGUgcmVzb2x2ZWRcIik7XG59KTtcblxudGhlbmFibGUucmVzb2x2ZSgpOyJdfQ==
