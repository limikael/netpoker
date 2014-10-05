/**
 * Client resources
 * @class Settings
 * @module client
 */
 function Settings() {
 	this.playAnimations = true;
 }


/**
 * Get singleton instance.
 * @method getInstance
 */
Settings.getInstance = function() {
	if (!Settings.instance)
		Settings.instance = new Settings();

	return Settings.instance;
}

module.exports = Settings;