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
		return target;

	if (target.charAt(0) == "/") {
		var u = url.parse(window.location.href);

		u.pathname = target;

		return url.format(u);
	} else {
		var path;
		path = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
		return path + target;
	}
}

module.exports = UrlUtil;