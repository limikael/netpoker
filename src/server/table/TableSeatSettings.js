var CheckboxMessage = require("../../proto/messages/CheckboxMessage");

/**
 * Table seat settings.
 * @class TableSeatSettings
 */
function TableSeatSettings() {
	this.settings = {};

	this.settings[CheckboxMessage.AUTO_POST_BLINDS] = false;
	this.settings[CheckboxMessage.AUTO_MUCK_LOSING] = true;
	this.settings[CheckboxMessage.SITOUT_NEXT] = false;
}

TableSeatSettings.AVAILALBE_SETTINGS = [
	CheckboxMessage.AUTO_POST_BLINDS,
	CheckboxMessage.AUTO_MUCK_LOSING,
	CheckboxMessage.SITOUT_NEXT
];

/**
 * Get setting.
 * @method get
 */
TableSeatSettings.prototype.get = function(id) {
	if (!id)
		throw new Error("setting not available");

	if (TableSeatSettings.AVAILALBE_SETTINGS.indexOf(id) < 0)
		throw new Error("setting not available");

	return this.settings[id];
}

/**
 * Set setting.
 * @method set
 */
TableSeatSettings.prototype.set = function(id, value) {
	if (!id)
		throw new Error("setting not available");

	if (TableSeatSettings.AVAILALBE_SETTINGS.indexOf(id) < 0)
		throw new Error("setting not available");

	this.settings[id] = value;
}

module.exports = TableSeatSettings;