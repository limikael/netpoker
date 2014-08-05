var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var run = require("gulp-run");

gulp.task('js-unit-test', function() {
	run("./node_modules/.bin/jasmine-node --captureExceptions --forceexit --verbose test/js.unit").exec()
		.pipe(gulp.dest("output"));
});