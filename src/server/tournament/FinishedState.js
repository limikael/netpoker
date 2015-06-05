/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var FinishedSpectator = require("./FinishedSpectator");
var inherits = require("inherits");

/**
 * Finished state.
 * @class FinishedState
 */
function FinishedState() {
	TournamentState.call(this);
	this.canceled = false;
	this.cancelMessage = null;
	this.finishedSpectators = [];
	this.backendCallInProgress = false;
}

inherits(FinishedState, TournamentState);

/**
 * Set canceled.
 * @method setCanceled
 */
FinishedState.prototype.setCanceled = function(message) {
	this.canceled = true;
	this.cancelMessage = message;
}

/**
 * Run.
 * @method run
 */
FinishedState.prototype.run = function() {

}

/**
 * Run.
 * @method run
 */
FinishedState.prototype.notifyNewConnection = function(protoConnection, user) {
	var finishedSpectator = new FinishedSpectator(this, protoConnection, user);
	finishedSpectator.on(FinishedSpectator.DONE, this.onFinishedSpectatorDone, this);
	this.finishedSpectators.push(finishedSpectator);
}

/**
 * Spectator done.
 * @method onFinishedSpectatorDone
 */
FinishedState.prototype.onFinishedSpectatorDone = function(ev) {
	var finishedSpectator = ev.target;

	finishedSpectator.off(FinishedSpectator.DONE, this.onFinishedSpectatorDone, this);
	ArrayUtil.remove(this.finishedSpectators, finishedSpectator);

	if (!this.finishedSpectators.length && !this.backendCallInProgress)
		this.trigger(TournamentState.CAN_UNLOAD);
}

module.exports = FinishedState;