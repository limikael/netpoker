var Q=require("q");

function wait(time) {
	var deferred=Q.defer();

	setTimeout(deferred.resolve, time);

	return deferred.promise;
}

/*wait(1000).then(
	function() {
		console.log("hello");
	}
);*/

wait(1000)

.then(function() {
	console.log("hello");
	return wait(500);
})

.then(function() {
	console.log("hello again")
})

.then(function() {

});

/*Q.fcall(function() {
	console.log("hello");
	return 10;
})

.then(function() {
	console.log("bla");
})

.then(function() {
	console.log("text");
});

*/


/*job("ls").run()

.then(function() {
	var j=job("ls");

	return j.run();
})

.then(function() {

})*/