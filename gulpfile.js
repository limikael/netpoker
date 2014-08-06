var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var run = require("gulp-run");
var browserify=require("gulp-browserify");

gulp.task("js-unit-test", function() {
	run("./node_modules/.bin/jasmine-node --captureExceptions --forceexit --verbose test/js.unit")
		.exec().pipe(gulp.dest("output"));
});

gulp.task("browserify", function() {
	run("./node_modules/.bin/browserify -d -o test/view/netpokerclient.bundle.js src/js/client/netpokerclient.js")
		.exec().pipe(gulp.dest("output"));

	run("cp gfx/components.png test/view").exec().pipe(gulp.dest("output"));
	run("cp gfx/table.png test/view").exec().pipe(gulp.dest("output"));
})