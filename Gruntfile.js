var qsub = require("qsub");
var Q = require("q");
var fs = require("fs");
var async = require("async");
var fse = require("fs-extra");

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-compress');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		compress: {
			drupalnetpoker: {
				options: {
					archive: "adapters/drupalnetpoker.zip"
				},
				files: [{
					cwd: 'adapters/drupalnetpoker',
					dest: 'netpoker/',
					expand: true,

					src: [
						"netpoker.info",
						"netpoker.module",
						"netpoker.install",
						"netpoker.menu.php",
						"cashgame.tpl.php",
						"bin/*"
					]
				}]
			}
		}
	});

	grunt.registerTask("publish-doc", function() {
		var done = this.async();

		if (fs.existsSync("doc.zip"))
			fs.unlinkSync("doc.zip");

		async.series([

			function(next) {
				var job = qsub("zip");
				job.arg("-r", "doc.zip", "doc");
				job.expect(0);
				job.run().then(next, grunt.fail.fatal);
			},

			function(next) {
				console.log("running...");

				var job = qsub("curl");
				job.arg("-s", "-X", "POST");
				job.arg("--data-binary", "@doc.zip");
				job.arg("http://limikael.altervista.org/?target=netpokerdoc&key=CTYWtAbc");
				job.expect(0).show();

				job.run().then(
					function() {
						if (job.output.substring(0, 2) != "OK") {
							console.log(job.output);
							grunt.fail.fatal("Unexpected output from curl");
						}

						next();
					},
					function(e) {
						grunt.fail.fatal(e);
					}
				);
			},

			function(next) {
				if (fs.existsSync("doc.zip"))
					fs.unlinkSync("doc.zip");

				next();
			},

			function(next) {
				done();
			}
		]);
	});

	grunt.registerTask("doc", function() {
		var done = this.async();
		var job = qsub("./node_modules/.bin/yuidoc");
		job.arg("--configfile", "res/yuidoc/yuidoc.json");
		job.show().expect(0);
		job.run().then(done, function(e) {
			console.log(e);
			grunt.fail.fatal(e);
		});
	});

	grunt.registerTask("mockserver", function() {
		var done = this.async();
		var job = qsub("node").arg("src/server/netpokerserver.js");
		job.arg("--mock", "--clientPort", "2222", "--apiOnClientPort");
		job.show().expect(0);
		job.run().then(done);
	});

	grunt.registerTask("deploy", function() {
		var done = this.async();
		var job;

		async.series([

			function(next) {
				var job = qsub("./node_modules/.bin/jitsu");
				job.arg("config", "set", "apiTokenName", "netpoker");
				job.show().expect(0).run().then(next, grunt.fail.fatal);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/jitsu");
				job.arg("config", "set", "apiToken", "a54ed51b-a7e4-4571-b929-71f447550c1a");
				job.show().expect(0).run().then(next, grunt.fail.fatal);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/jitsu");
				job.arg("config", "set", "username", "limikael");
				job.show().expect(0).run().then(next, grunt.fail.fatal);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/jitsu");
				job.arg("deploy", "-c");
				job.show().expect(0).run().then(next, grunt.fail.fatal);
			},

			function(next) {
				done();
			}
		]);
	});

	grunt.registerTask("test", function() {
		var done = this.async();
		var que = Q();

		que = que.then(function() {
			var job = qsub("./node_modules/.bin/jasmine-node")
				.arg("--captureExceptions")
				.arg("--verbose")
				.arg("test/unit")

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

	grunt.registerTask("browserify-test", function() {
		done = this.async();

		async.series([

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
				job.arg("test/view/gradient/test.bundle.js", "test/view/gradient/test.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
				job.arg("test/view/nineslice/test.bundle.js", "test/view/nineslice/test.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
				job.arg("test/view/button/test.bundle.js", "test/view/button/test.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
				job.arg("test/view/thenable/test.bundle.js", "test/view/thenable/test.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				done();
			}
		]);
	});

	grunt.registerTask("browserify", function() {
		var done = this.async();

		async.series([

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-d", "-o");
				job.arg("res/mocksite/netpokerclient.bundle.js", "src/client/netpokerclient.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				var job = qsub("./node_modules/.bin/browserify").arg("-o");
				job.arg("bin/netpokerclient.bundle.js", "src/client/netpokerclient.js");
				job.show().expect(0);
				job.run().then(next);
			},

			function(next) {
				fse.mkdirsSync("adapters/drupalnetpoker/bin");
				fse.copySync("bin/netpokerclient.bundle.js", "adapters/drupalnetpoker/bin/netpokerclient.bundle.js");
				fse.copySync("res/skin/textureFiles/custom/texture.json", "adapters/drupalnetpoker/bin/texture.json");
				fse.copySync("res/skin/textureFiles/custom/texture0.png", "adapters/drupalnetpoker/bin/texture0.png");

				fse.copySync("res/mocksite/netpokerclient.bundle.js", "res/skin/netpokerclient.bundle.js");

				fse.copySync("res/skin/textureFiles/custom/texture.json", "res/mocksite/texture.json");
				fse.copySync("res/skin/textureFiles/custom/texture0.png", "res/mocksite/texture0.png");

				fse.copySync("res/skin/textureFiles/custom/texture.json", "bin/texture.json");
				fse.copySync("res/skin/textureFiles/custom/texture0.png", "bin/texture0.png");
				done();
			}
		]);
	});

	grunt.registerTask("adapter", ["browserify", "compress:drupalnetpoker"]);

	grunt.registerTask("default", function() {
		console.log("Available Tasks");
		console.log();
		console.log("  browserify   - Build client bundle.");
		console.log("  mockserver   - Start mock server.");
		console.log("  deploy       - Deploy to nodejitsu.");
		console.log("  test         - Run server tests.");
		console.log("  doc          - Create project docs.")
		console.log("  publish-doc  - Publish doc to http://limikael.altervista.org/netpokerdoc");
		console.log("  adapter      - Build client and create druapl adapter.")
	});
};