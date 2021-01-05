/**
 * Server.
 * @module server
 */

/**
 * Table seat settings.
 * @class TableSeatSettings
 */
class TableSeatSettings {
	static AVAILABLE_SETTINGS=[
		"autoPostBlinds",
		"autoMuckLosing",
		"sitOutNext"
	];

	constructor() {
		this.settings = {};

		this.settings["autoPostBlinds"] = false;
		this.settings["autoMuckLosing"] = true;
		this.settings["sitOutNext"] = false;

		this.alwaysPayBlinds = false;
	}

	/**
	 * Set always pay blinds mode.
	 * @method setAlwaysPayBlinds
	 */
	setAlwaysPayBlinds(value) {
		this.alwaysPayBlinds = value;
	}

	/**
	 * Get setting.
	 * @method get
	 */
	get(id) {
		if (!id)
			throw new Error("setting not available");

		if (!TableSeatSettings.isSettingIdValid(id))
			throw new Error("setting not available");

		if (id == "autoPostBlinds" && this.alwaysPayBlinds)
			return true;

		return this.settings[id];
	}

	/**
	 * Set setting.
	 * @method set
	 */
	set(id, value) {
		if (!id)
			throw new Error("setting not available");

		if (!TableSeatSettings.isSettingIdValid(id))
			throw new Error("setting not available");

		if (id == "autoPostBlinds" && this.alwaysPayBlinds)
			throw new Error("Can't change that setting...");

		this.settings[id] = value;
	}

	/**
	 * Is this a valid setting id?
	 * @method isSettingIdValid
	 */
	static isSettingIdValid(id) {
		if (TableSeatSettings.AVAILABLE_SETTINGS.indexOf(id) < 0)
			return false;

		return true;
	}
}

module.exports = TableSeatSettings;