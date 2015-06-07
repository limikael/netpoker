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

	// next thing to do, add message to user and so...

	if (this.user) {
		this.send(new TableInfoMessage());
	} else {
		var place = playState.getUserFinishPlace(user);


	}

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