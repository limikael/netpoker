var Thenable = require("../../../src/utils/Thenable");

thenable = new Thenable();

thenable.then(function() {
	console.log("thenable resolved");
});

thenable.resolve();