"use strict";

/**
 * AS3 style event dispatcher.
 */
function EventDispatcher() {
	this.listenerMap={};
}

/**
 * Add event listener.
 */
EventDispatcher.prototype.addEventListener=function(eventType, listener, scope) {
	if (!eventType)
		throw new Error("Event type required for event dispatcher");

	if (!listener)
		throw new Error("Listener required for event dispatcher");

	this.removeEventListener(eventType,listener,scope);

	if (!this.listenerMap.hasOwnProperty(eventType))
		this.listenerMap[eventType]=[];

	this.listenerMap[eventType].push({
		listener: listener,
		scope: scope
	});
}

/**
 * Remove event listener.
 */
EventDispatcher.prototype.removeEventListener=function(eventType, listener, scope) {
	if (!this.listenerMap.hasOwnProperty(eventType))
		return;

	var listeners=this.listenerMap[eventType];

	for (var i=0; i<listeners.length; i++) {
		var listenerObj=listeners[i];

		if (listener==listenerObj.listener && scope==listenerObj.scope) {
			listeners.splice(i,1);
			i--;
		}
	}
}

/**
 * Dispatch event.
 */
EventDispatcher.prototype.dispatchEvent=function(event, data) {
	if (typeof event=="string") {
		event={
			type: event
		};
	}

	if (!this.listenerMap.hasOwnProperty(event.type))
		return;

	if (data==undefined)
		data=event;

	for (var i in this.listenerMap[event.type]) {
		var listenerObj=this.listenerMap[event.type][i];

		listenerObj.listener.call(listenerObj.scope,data);
	}
}

/**
 * Jquery style alias.
 */
EventDispatcher.prototype.on=EventDispatcher.prototype.addEventListener;
EventDispatcher.prototype.off=EventDispatcher.prototype.removeEventListener;
EventDispatcher.prototype.trigger=EventDispatcher.prototype.dispatchEvent;

module.exports=EventDispatcher;