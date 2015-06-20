/**
 * Server.
 * @module server
 */

var TournamentState = require("./TournamentState");
var FinishedSpectator = require("./FinishedSpectator");
var inherits = require("inherits");
var Backend = require("../backend/Backend");
var ArrayUtil = require("../../utils/ArrayUtil");
var TournamentResultMessage = require("../../proto/messages/TournamentResultMessage");

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
	this.finishOrder = [];
	this.tournamentResultMessage = null;
	this.doFinishCall = true;
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
 * Should we do the finish call?
 * @method setDoFinishCall
 */
FinishedState.prototype.setDoFinishCall = function(value) {
	this.doFinishCall = value;
}

/**
 * Run.
 * @method run
 */
FinishedState.prototype.run = function() {
	if (this.canceled) {
		if (this.doFinishCall) {
			backendCallInProgress = true;
			var p = {
				tournamentId: this.tournament.id,
				cancelMessage: this.cancelMessage
			}
			this.tournament.getBackend().call(Backend.TOURNAMENT_CANCEL, p).then(
				this.onFinishCallComplete.bind(this),
				this.onFinishCallError.bind(this)
			);
		}
		return;
	}

	var left = "";
	var right = "";
	var payouts = this.tournament.getPayouts();

	for (var i = 0; i < payouts.length; i++) {
		left += (i + 1) + ". " + this.finishOrder[i].getName() + "\n";
		right += payouts[i] + "\n";
	}

	this.tournamentResultMessage = new TournamentResultMessage(left, right);

	var order = [];

	for (var u = 0; u < this.finishOrder.length; u++)
		order.push(this.finishOrder[u].getId());

	var p = {
		tournamentId: this.tournament.getId(),
		finishorder: JSON.stringify(order),
		payouts: JSON.stringify(this.tournament.getPayouts())
	}

	if (this.doFinishCall) {
		this.backendCallInProgress = true;
		this.tournament.getBackend().call(Backend.TOURNAMENT_FINISH, p).then(
			this.onFinishCallComplete.bind(this),
			this.onFinishCallError.bind(this)
		);
	}
}

/**
 * Finish call response.
 * @method onFinishCallComplete
 */
FinishedState.prototype.onFinishCallComplete = function(res) {
	this.backendCallInProgress = false;

	if (!this.finishedSpectators.length)
		this.trigger(TournamentState.CAN_UNLOAD);

	this.trigger(TournamentState.IDLE);
}

/**
 * Finish call response.
 * @method onFinishCallError
 */
FinishedState.prototype.onFinishCallError = function(err) {
	this.backendCallInProgress = false;

	console.log("WARNING! tournament finish call failed: " + err);

	if (!this.finishedSpectators.length)
		this.trigger(TournamentState.CAN_UNLOAD);

	this.trigger(TournamentState.IDLE);
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

/**
 * Are we idle?
 * @method isIdle
 */
FinishedState.prototype.isIdle = function() {
	if (this.backendCallInProgress)
		return false;

	else
		return true;
}

/**
 * Set finish order.
 * @method setFinishOrder
 */
FinishedState.prototype.setFinishOrder = function(order) {
	this.finishOrder = order;
}

/**
 * Get tournament result message.
 * @method getTournamentResultMessage
 */
FinishedState.prototype.getTournamentResultMessage = function() {
	return this.tournamentResultMessage;
}

/**
 * Canceled?
 * @method isCanceled
 */
FinishedState.prototype.isCanceled = function() {
	return this.canceled;
}

/**
 * Get cancel message.
 * @method getCancelMessage
 */
FinishedState.prototype.getCancelMessage = function() {
	return this.cancelMessage;
}

module.exports = FinishedState;