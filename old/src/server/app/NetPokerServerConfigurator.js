/**
 * Server.
 * @module server
 */

var Thenable = require("tinp");
var url = require("url");
var request = require("request");
var fs = require("fs");
var ConfigParser = require("../../utils/ConfigParser");

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
	var thenable = new Thenable();

	switch (name) {
		case "version":
			var pkg = JSON.parse(fs.readFileSync(__dirname + "/../../../package.json"));
			console.log(pkg.name + " " + pkg.version);
			process.exit(1);
			break;

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

		case "key":
			this.netPokerServer.setKey(value);
			break;

		case "sslCertFile":
			this.netPokerServer.setSslCertFile(value);
			break;

		case "sslKeyFile":
			this.netPokerServer.setSslKeyFile(value);
			break;

		case "sslCaFiles":
			var a = value.split(",");

			for (var i = 0; i < a.length; i++)
				this.netPokerServer.addSslCaFile(a[i]);
			break;

		case "config":
			return this.loadConfigSource(value);
			break;

		case "ok":
			break;

		case "_":
			if (value.length) {
				thenable.reject("Don't know what to do with those arguments...");
				return thenable;
			}
			break;

		default:
			throw new Error("Unknown option: " + name);
			break;
	}

	thenable.resolve();
	return thenable;
}

/**
 * Apply a dictionary of settings.
 * @method applySettings
 */
NetPokerServerConfigurator.prototype.applySettings = function(settings) {
	var thenables = [];

	for (var setting in settings)
		thenables.push(this.applySetting(setting, settings[setting]));

	return Thenable.all(thenables);
}

/**
 * Load config from file or url.
 * @method loadConfigFile
 * @private
 */
NetPokerServerConfigurator.prototype.loadConfigSource = function(configSource) {
	var parsedConfigSource = url.parse(configSource);

	if (parsedConfigSource.protocol)
		return this.loadConfigUrl(configSource);

	else
		return this.loadConfigFile(configSource);
}

/**
 * Load config from file.
 * @method loadConfigSource
 * @private
 */
NetPokerServerConfigurator.prototype.loadConfigFile = function(configFileName) {
	var thenable = new Thenable();

	var doc = ConfigParser.parse(fs.readFileSync(configFileName));

	this.applySettings(doc).then(
		function() {
			thenable.resolve()
		},
		function() {
			thenable.reject()
		}
	);

	return thenable;
}

/**
 * Load config from url.
 * @method loadConfigSource
 * @private
 */
NetPokerServerConfigurator.prototype.loadConfigUrl = function(configUrl) {
	var thenable = new Thenable();

	var options = {
		url: configUrl
	};

	request(options, function(error, response, body) {
		if (error || response.statusCode != 200) {
			thenable.reject("Error loading config from url: " + response.statusCode);
			return;
		}

		var doc = ConfigParser.parse(body);

		this.applySettings(doc).then(
			function() {
				thenable.resolve()
			},

			function() {
				thenable.reject()
			}
		);
	}.bind(this));

	return thenable;
}

module.exports = NetPokerServerConfigurator;