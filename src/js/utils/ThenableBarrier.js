var Thenable=require("./Thenable");
var FunctionUtil=require("../utils/FunctionUtil");

/**
 * Listen to several promises that all must be fulfilled.
 * @class ThenableBarrier
 * @internal
 */
function ThenableBarrier() {
	Thenable.call(this);

	this.thenables=[];
	this.successCount=0;
}

FunctionUtil.extend(ThenableBarrier,Thenable);

/**
 * @method addThenable
 * Add a thenable to listen to.
 */
ThenableBarrier.prototype.addThenable=function(t) {
	if (this.handlersCalled)
		throw new Error("Already fired");

	this.thenables.push(t);

	t.then(
		this.onThenableSuccess.bind(this),
		this.onThenableError.bind(this)
	);
}

/**
 * A thenable notified success.
 * @method onThenableSuccess
 * @private
 */
ThenableBarrier.prototype.onThenableSuccess=function() {
	this.successCount++;

	//console.log("success, count="+this.successCount+" t="+this.thenables.length);

	if (this.successCount==this.thenables.length) {
		//console.log("notifying success");
		this.notifySuccess();
	}
}

/**
 * A thenable notified error.
 * @method onThenableError
 * @private
 */
ThenableBarrier.prototype.onThenableError=function(e) {
	if (!this.handlersCalled)
		this.notifyError(e);
}

/**
 * Create a thenable barrier
 * @method wait
 * @internal
 */
ThenableBarrier.wait=function(/* thenables */) {
	var t=new ThenableBarrier();

	for (var i=0; i<arguments.length; i++)
		t.addThenable(arguments[i]);

	return t;
}

module.exports=ThenableBarrier;