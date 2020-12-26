async=require("async");

async.series([
	function(cb) {
		console.log("doing the first thing...");
		cb(null,"hello");
	},

	function(cb) {
		console.log("doing the 2nd thing...");
		cb();
	}
]);
