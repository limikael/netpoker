/**
 * Server.
 * @module server
 */

var inherits = require("inherits");
var EventDispatcher = require("yaed");
var ProtoConnection = require("../../proto/ProtoConnection");
var CheckboxMessage = require("../../proto/messages/CheckboxMessage");
var ButtonsMessage = require("../../proto/messages/ButtonsMessage");
var PresetButtonsMessage = require("../../proto/messages/PresetButtonsMessage");
var InterfaceStateMessage = require("../../proto/messages/InterfaceStateMessage");
var TableInfoMessage = require("../../proto/messages/TableInfoMessage");
var FadeTableMessage = require("../../proto/messages/FadeTableMessage");
var TableButtonClickMessage = require("../../proto/messages/TableButtonClickMessage");
var StateCompleteMessage = require("../../proto/messages/StateCompleteMessage");

/**
 * A spectator in the play state.
 * @class PlaySpectator
 */
function PlaySpectator(playState, protoConnection, user, tournamentTable) {
	EventDispatcher.call(this);

	this.playState = playState;
	this.user = user;
	this.setProtoConnection(protoConnection);

	this.send(new CheckboxMessage(CheckboxMessage.AUTO_POST_BLINDS, false));
	this.send(new CheckboxMessage(CheckboxMessage.AUTO_MUCK_LOSING, false));
	this.send(new CheckboxMessage(CheckboxMessage.SITOUT_NEXT, false));

	this.send(new ButtonsMessage());
	this.send(new PresetButtonsMessage());

	this.tournamentTable = tournamentTable;
	if (!this.tournamentTable)
		this.tournamentTable = this.playState.getTableWithMostPlayers();

	this.send(new InterfaceStateMessage());

	this.tournamentTable.sendState(this.protoConnection);

	var s = "";

	if (this.user) {
		var s = "";
		var place = this.playState.getUserFinishPlace(user);

		if (place > 0)
			s = "You finished " + this.ord(place) +
			" out of " + this.playState.getTournament().getNumRegistrations() +
			" players";

		else if (this.playState.getTournament().isUserRegistered(user))
			s = "You are currently logged in from another computer.\n\n" +
			"This connection is passive, or reload the page to make this your active connection.";
	}

	this.send(new TableInfoMessage(s));
	this.send(new StateCompleteMessage());

	this.tournamentTable.addPlaySpectator(this);
}

inherits(PlaySpectator, EventDispatcher);

/**
 * Dispatched when we are done.
 * @event PlaySpectator.DONE
 */
PlaySpectator.DONE = "done";

/**
 * Ord.
 * @method ord
 */
PlaySpectator.prototype.ord = function(n) {
	if (n % 10 == 1 && n != 11)
		return n + "st";

	else if (n % 10 == 2 && n != 12)
		return n + "nd";

	else if (n % 10 == 3 && n != 13)
		return n + "rd";

	else
		return n + "th";
}

/**
 * Set connection
 * @method setProtoConnection
 * @private
 */
PlaySpectator.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}
}

/**
 * Get connection.
 * @method getProtoConnection
 */
PlaySpectator.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Get user.
 * @method getUser
 */
PlaySpectator.prototype.getUser = function() {
	return this.user;
}

/**
 * Connection was closed.
 * @method onProtoConnectionClose
 */
PlaySpectator.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(PlaySpectator.DONE);
}

/**
 * Send
 * @method send
 */
PlaySpectator.prototype.send = function(m) {
	if (this.protoConnection)
		this.protoConnection.send(m);
}

module.exports = PlaySpectator;