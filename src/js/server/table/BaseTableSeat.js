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
 * @method setProtoConnection
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
 * @method getProtoConnection
 */
BaseTableSeat.prototype.getProtoConnection = function() {
	return this.protoConnection;
}

/**
 * Button click message.
 * @method onButtonClickMessage
 * @private
 */
BaseTableSeat.prototype.onButtonClickMessage = function(message) {
	this.trigger(ButtonClickMessage.TYPE, message);
}

/**
 * Button click message.
 * @method onProtoConnectionClose
 * @private
 */
BaseTableSeat.prototype.onProtoConnectionClose = function() {
	this.setProtoConnection(null);
	this.trigger(ProtoConnection.CLOSE);
}

/**
 * Get table.
 * @method getTable
 */
BaseTableSeat.prototype.getTable=function() {
	return this.table;
}

/**
 * Get services.
 * @method getServices
 */
BaseTableSeat.prototype.getServices=function() {
	return this.table.getServices();
}

/**
 * Send.
 * @method send
 */
BaseTableSeat.prototype.send=function(message) {
	if (this.protoConnection)
		this.protoConnection.send(message);
}

/**
 * Get chips.
 * @method getChips
 */
BaseTableSeat.prototype.getChips=function() {
	throw "abstract";
}

module.exports = BaseTableSeat;