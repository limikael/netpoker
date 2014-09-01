var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var ProtoConnection = require("../../proto/ProtoConnection");

/**
 * Base table seat.
 * @class BaseTableSeat
 */
function BaseTableSeat(table, seatIndex, active) {
	EventDispatcher.call(this);

	this.table = table;
	this.seatIndex = seatIndex;
	this.active = active;

	this.protoConnection = null;
}

FunctionUtil.extend(BaseTableSeat, EventDispatcher);

/**
 * Is tihs seat active?
 * @method isActive
 */
BaseTableSeat.prototype.isActive = function() {
	return this.active;
}

/**
 * Get seat index for this seat?
 * @method getSeatIndex
 */
BaseTableSeat.prototype.getSeatIndex = function() {
	return this.seatIndex;
}

/**
 * Set proto connection.
 * @protected
 */
BaseTableSeat.prototype.setProtoConnection = function(protoConnection) {
	if (this.protoConnection) {
		this.protoConnection.removeMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
		this.protoConnection.off(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}

	this.protoConnection = protoConnection;

	if (this.protoConnection) {
		this.protoConnection.addMessageHandler(ButtonClickMessage.TYPE, this.onButtonClickMessage, this);
		this.protoConnection.on(ProtoConnection.CLOSE, this.onProtoConnectionClose, this);
	}
}

/**
 * Get proto connection.
 */
BaseTableSeat.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Button click message.
 * @private
 */
BaseTableSeat.prototype.onButtonClickMessage = function(message) {
	this.trigger(ButtonClickMessage.TYPE, message);
}

/**
 * Button click message.
 * @private
 */
BaseTableSeat.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(ProtoConnection.CLOSE);
}

/**
 * Get table.
 */
BaseTableSeat.prototype.getTable=function() {
	return this.table;
}

/**
 * Get services.
 */
BaseTableSeat.prototype.getServices=function() {
	return this.table.getServices();
}

/**
 * Send.
 */
BaseTableSeat.prototype.send=function(message) {
	if (this.protoConnection)
		this.protoConnection.send(message);
}

/**
 * Get chips.
 */
BaseTableSeat.prototype.getChips=function() {
	throw "abstract";
}

module.exports = BaseTableSeat;