var url = require("url");

/**
 * URL utility.
 * @class UrlUtil
 */
function UrlUtil() {
	throw new Error("static");
}

/**
 * Make absolute url.
 * @method makeAbsolute
 */
UrlUtil.makeAbsolute = function(target) {
	var parsedUrl = url.parse(target);

	if (parsedUrl.protocol)
		return url;

	var path = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);

	return path + target;
}

module.exports = UrlUtil;