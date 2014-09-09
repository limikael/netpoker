var qsub = require("qsub");
var Q = require("q");
var AsyncSequence = require("./src/js/utils/AsyncSequence");

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-ftpush');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		ftpush: {
			doc: {
				auth: {
					host: 'ftp.netpokerdoc.altervista.org',
					authKey: 'altervista',
					port: 21
				},
				src: 'doc',
				dest: '',
				useList: true
			}
		}
	});

	grunt.registerTask("doc", function() {
		//grunt.task.run("ftpush:doc");

		var done = this.async();
		var job=qsub("./node_modules/.bin/yuidoc");
		job.arg("--configfile","res/yuidoc.json");
		job.show().expect(0);
		job.run().then(done,function(e) {
			console.log(e);
		});
	});

	grunt.registerTask("mockserver", function() {
		var done = this.async();
		var job = qsub("node").arg("test/tools/mockserver.js");
		job.show().expect(0);
		job.run().then(done);
	});

	grunt.registerTask("deploy", function() {
		var done = this.async();
		var job = qsub("./node_modules/.bin/jitsu");
		job.arg("deploy", "-c");
		job.show().expect(0);
		job.run().then(done);
	});

	grunt.registerTask("js-unit-test", function() {
		var done = this.async();
		var que = Q();

		que = que.then(function() {
			var job = qsub("./node_modules/.bin/jasmine-node")
				.arg("--captureExceptions")
				.arg("--verbose")
				.arg("test/js.unit")

			if (grunt.option("match"))
				job.arg("--match", grunt.option("match"));

			job.expect(0).show();

			return job.run();
		});

		que = que.then(function() {
			done();
		});

		que.done();
	});

	grunt.registerTask("browserify", function() {
		var done = this.async();
		var que = Q();

		/*que = que.then(function() {
			var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
			job.arg("test/view/gradient/test.bundle.js", "test/view/gradient/test.js");
			job.show().expect(0);
			return job.run();
		});

		que = que.then(function() {
			var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
			job.arg("test/view/nineslice/test.bundle.js", "test/view/nineslice/test.js");
			job.show().expect(0);
			return job.run();
		});

		que = que.then(function() {
			var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
			job.arg("test/view/button/test.bundle.js", "test/view/button/test.js");
			job.show().expect(0);
			return job.run();
		});*/

		que = que.then(function() {
			var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
			job.arg("test/view/netpokerclient.bundle.js", "src/js/client/netpokerclient.js");
			job.show().expect(0);
			return job.run();
		});

		que = que.then(function() {
			var job = qsub("cp").arg("gfx/components.png", "test/view");
			return job.run();
		});

		que = que.then(function() {
			var job = qsub("cp").arg("gfx/table.png", "test/view");
			return job.run();
		});

		que = que.then(function() {
			done();
		});

		que.done();
	});

	grunt.registerTask("default", function() {
		console.log("Available Tasks");
		console.log();
		console.log("  browserify   - Build client bundle.");
		console.log("  mockserver   - Start mock server.");
		console.log("  deploy       - Deploy to nodejitsu.");
		console.log("  js-unit-test - Run server tests.");
		console.log("  doc          - Create project docs and push to http://netpokerdoc.altervista.org/")
		});
}