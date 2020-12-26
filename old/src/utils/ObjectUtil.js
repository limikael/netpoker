/**
 * Object utilities.
 * @class ObjectUtil
 */
function ObjectUtil() {}

/**
 * Check object equality.
 * Not perfect but will do.
 * @method equals
 * @static
 */
ObjectUtil.equals = function(a, b) {
	if (typeof a != "object" || typeof b != "object")
		return a === b;

	if (!a && !b)
		return true;

	if (!a)
		return false;

	if (!b)
		return false;

	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);

	if (aProps.length != bProps.length)
		return false;

	for (var i = 0; i < aProps.length; i++) {
		var propName = aProps[i];

		if (!ObjectUtil.equals(a[propName], b[propName]))
			return false;
	}

	return true;
}

/**
 * Shallow copy objects.
 * @method copy
 */
ObjectUtil.copy = function(o) {
	var r = {};

	var props = Object.getOwnPropertyNames(o);

	for (var i = 0; i < props.length; i++)
		r[props[i]] = o[props[i]];

	return r;
}

module.exports = ObjectUtil;