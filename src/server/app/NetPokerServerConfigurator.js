/**
 * Server.
 * @module server
 */

var yaml = require("js-yaml");
var fs = require("fs");

/**
 * Configure the server with command line options and/or contents from a config
 * file.
 * @class NetPokerServerConfigurator
 */
function NetPokerServerConfigurator(netPokerServer) {
	this.netPokerServer = netPokerServer;
}

/**
 * Apply a setting.
 * @method applySetting
 */
NetPokerServerConfigurator.prototype.applySetting = function(name, value) {
	switch (name) {
		case "backend":
			this.netPokerServer.setBackend(value);
			break;

		case "backendKey":
			this.netPokerServer.setBackendKey(value);
			break;

		case "mock":
			if (value)
				this.netPokerServer.useMock();
			break;

		case "clientPort":
			this.netPokerServer.setClientPort(value);
			break;

		case "clientBindAddr":
			this.netPokerServer.setClientBindAddr(value);
			break;

		case "apiPort":
			this.netPokerServer.setApiPort(value);
			break;

		case "apiKey":
			this.netPokerServer.setApiKey(value);
			break;

		case "apiOnClientPort":
			this.netPokerServer.setApiOnClientPort(value);
			break;

		case "config":
			this.loadConfigFile(value);
			break;

		case "_":
			if (value.length)
				throw new Error("Error");

			break;

		default:
			throw new Error("Unknown option: " + name);
			break;
	}
}

/**
 * Apply a dictionary of settings.
 * @method applySettings
 */
NetPokerServerConfigurator.prototype.applySettings = function(settings) {
	for (var setting in settings)
		this.applySetting(setting, settings[setting])
}

/**
 * Load config file.
 * @method loadConfigFile
 */
NetPokerServerConfigurator.prototype.loadConfigFile = function(configFileName) {
	var doc = yaml.safeLoad(fs.readFileSync(configFileName));

	this.applySettings(doc);
}

module.exports = NetPokerServerConfigurator;