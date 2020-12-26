/**
 * Server.
 * @module server
 */

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

	this.alwaysPayBlinds = false;
}

TableSeatSettings.AVAILALBE_SETTINGS = [
	CheckboxMessage.AUTO_POST_BLINDS,
	CheckboxMessage.AUTO_MUCK_LOSING,
	CheckboxMessage.SITOUT_NEXT
];

/**
 * Set always pay blinds mode.
 * @method setAlwaysPayBlinds
 */
TableSeatSettings.prototype.setAlwaysPayBlinds = function(value) {
	this.alwaysPayBlinds = value;
}

/**
 * Get setting.
 * @method get
 */
TableSeatSettings.prototype.get = function(id) {
	if (!id)
		throw new Error("setting not available");

	if (!TableSeatSettings.isSettingIdValid(id))
		throw new Error("setting not available");

	if (id == CheckboxMessage.AUTO_POST_BLINDS && this.alwaysPayBlinds)
		return true;

	return this.settings[id];
}

/**
 * Set setting.
 * @method set
 */
TableSeatSettings.prototype.set = function(id, value) {
	if (!id)
		throw new Error("setting not available");

	if (!TableSeatSettings.isSettingIdValid(id))
		throw new Error("setting not available");

	if (id == CheckboxMessage.AUTO_POST_BLINDS && this.alwaysPayBlinds)
		throw new Error("Can't change that setting...");

	this.settings[id] = value;
}

/**
 * Is this a valid setting id?
 * @method isSettingIdValid
 */
TableSeatSettings.isSettingIdValid = function(id) {
	if (TableSeatSettings.AVAILALBE_SETTINGS.indexOf(id) < 0)
		return false;

	return true;
}

module.exports = TableSeatSettings;