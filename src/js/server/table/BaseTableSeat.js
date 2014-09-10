var FunctionUtil = require("../../utils/FunctionUtil");
var EventDispatcher = require("../../utils/EventDispatcher");
var ButtonClickMessage = require("../../proto/messages/ButtonClickMessage");
var ProtoConnection = require("../../proto/ProtoConnection");
var SeatInfoMessage = require("../../proto/messages/SeatInfoMessage");

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
 * Get user currently seated as this TableSeat.
 * @method getUser
 */
BaseTableSeat.prototype.getUser = function() {
	throw new Error("abstract");
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
BaseTableSeat.prototype.getTable = function() {
	return this.table;
}

/**
 * Get services.
 * @method getServices
 */
BaseTableSeat.prototype.getServices = function() {
	return this.table.getServices();
}

/**
 * Send.
 * @method send
 */
BaseTableSeat.prototype.send = function(message) {
	if (this.protoConnection)
		this.protoConnection.send(message);
}

/**
 * Get chips.
 * @method getChips
 */
BaseTableSeat.prototype.getChips = function() {
	throw new Error("abstract");
}

/**
 * Is this table seat sitting out?
 * @method isSitout
 */
BaseTableSeat.prototype.isSitout = function() {
	throw new Error("abstract");
}

/**
 * Get SeatInfoMessage representing this seat.
 * @method getSeatInfoMessage
 */
BaseTableSeat.prototype.getSeatInfoMessage = function() {
	var m = new SeatInfoMessage(this.seatIndex);

	m.setActive(this.isActive());

	if (this.getUser()) {
		var user = this.getUser();

		m.setName(user.getName());
		m.setSitout(this.isSitout());

		if (this.getChips() == 0)
			m.chips = "ALL IN";

		else
			m.chips = this.getChips().toString();
	}

	return m;
}

module.exports = BaseTableSeat;