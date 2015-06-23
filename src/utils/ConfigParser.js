var yaml = require("js-yaml");

/**
 * Parse something that is either yml or json.
 * @class ConfigParser
 */
function ConfigParser() {};

/**
 * Parse.
 * @static
 * @method parse
 */
ConfigParser.parse = function(src) {
	try {
		var parsedJson = JSON.parse(src);
		return parsedJson;
	} catch (jsonError) {
		try {
			var parsedYaml = yaml.safeLoad(src);
			return parsedYaml;
		}

		catch (yamlError) {
			throw new Error(
				"Tried both JSON and YAML, nothing could parse.\n"+
				"JSON Error: "+jsonError.message+"\n"+
				"YAML Error: "+yamlError.message
			);
		}
	}
}

module.exports = ConfigParser;