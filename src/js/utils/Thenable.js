var EventDispatcher=require("./EventDispatcher");
var FunctionUtil=require("./FunctionUtil");

/**
 * An implementation of promises as defined here:
 * http://promises-aplus.github.io/promises-spec/
 * @class Thenable
 * @internal
 */
function Thenable() {
	EventDispatcher.call(this)

	this.successHandlers=[];
	this.errorHandlers=[];
	this.notified=false;
	this.handlersCalled=false;
	this.notifyParam=null;
}

FunctionUtil.extend(Thenable,EventDispatcher);

/**
 * Set resolution handlers.
 * @method then
 * @param success The function called to handle success.
 * @param error The function called to handle error.
 * @return This Thenable for chaining.
 */
Thenable.prototype.then=function(success, error) {
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
Thenable.prototype.notifySuccess=function(param) {
	if (this.handlersCalled)
		throw new Error("This thenable is already notified.");

	this.notifyParam=param;
	setTimeout(this.doNotifySuccess.bind(this),0);
}

/**
 * Notify failure of the operation.
 * @method notifyError
 */
Thenable.prototype.notifyError=function(param) {
	if (this.handlersCalled)
		throw new Error("This thenable is already notified.");

	this.notifyParam=param;
	setTimeout(this.doNotifyError.bind(this),0);
}

/**
 * Actually notify success.
 * @method doNotifySuccess
 * @private
 */
Thenable.prototype.doNotifySuccess=function() {
	this.callHandlers(this.successHandlers);
}

/**
 * Actually notify error.
 * @method doNotifyError
 * @private
 */
Thenable.prototype.doNotifyError=function() {
	this.callHandlers(this.errorHandlers);
}

/**
 * Call handlers.
 * @method callHandlers
 * @private
 */
Thenable.prototype.callHandlers=function(handlers) {
	if (this.handlersCalled)
		throw new Error("Should never happen.");

	this.handlersCalled=true;

	for (var i in handlers) {
		if (handlers[i]) {
			try {
				handlers[i].call(null,this.notifyParam);
			}

			catch (e) {
				console.error("Exception in Thenable handler: "+e);
				console.log(e.stack);
				throw e;
			}
		}
	}
}

module.exports=Thenable;