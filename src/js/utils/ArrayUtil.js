/**
 * Array utilities.
 * @class ArrayUtil
 */
function ArrayUtil() {}

/**
 * Remove an element.
 * @method remove
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

module.exports = ArrayUtil;