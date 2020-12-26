/**
 * Protocol.
 * @module proto
 */

/**
 * Received when ?.
 * @class TestCaseRequestMessage
 */
function TestCaseRequestMessage(testCase) {
	this.testCase = testCase;
}

TestCaseRequestMessage.TYPE = "testCaseRequest";

/**
 * Getter.
 * @method getTestCase
 */
TestCaseRequestMessage.prototype.getTestCase = function() {
	return this.testCase;
}

/**
 * Un-serialize.
 * @method unserialize
 */
TestCaseRequestMessage.prototype.unserialize = function(data) {
	this.testCase = data.testCase;
}

/**
 * Serialize message.
 * @method serialize
 */
TestCaseRequestMessage.prototype.serialize = function() {
	return {
		testCase: this.testCase
	};
}

module.exports = TestCaseRequestMessage;