/**
 * Array utilities.
 * @class ArrayUtil
 */
function ArrayUtil() {}

/**
 * Remove an element.
 * @method remove
 * @static
 */
ArrayUtil.remove = function(array, element) {
	var index = array.indexOf(element);

	if (index >= 0)
		array.splice(index, 1);
}

/**
 * Shuffles the "arr" Array (in place) according to a randomly chosen permutation
 * This is the classic Fisher-Yates style shuffle.
 * @method
 * @static
 */
ArrayUtil.shuffle = function(arr) {
	var n = arr.length;
	while (n > 0) {
		var k = Math.floor(Math.random() * n);
		n--;
		var temp = arr[n];
		arr[n] = arr[k];
		arr[k] = temp;
	}

	return arr;
}

/**
 * Check if every value in both arrays equal.
 * It doesn't do deep comparision in case the conatined elements are arrays.
 * Not tested since I didn't actually need it.
 * @method equals
 * @static
 */
ArrayUtil.equals = function(a, b) {
	if (a.length != b.length)
		return false;

	for (var i = 0; i < a.length; i++)
		if (a[i] != b[i])
			return false;

	return true;
}

module.exports = ArrayUtil;