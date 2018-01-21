//gulpfile.js
var $ = require('gulp-load-plugins')()
var gulp = require('gulp');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var preprocess = require('gulp-preprocess');
var rename = require('gulp-rename');
var concat = require('gulp-concat');

var packageJson = require('./package.json');

//style paths
var sassFiles = 'css/style.scss',  
    cssDest = 'css/';

gulp.task('default', ['style', 'generate-js', 'generate-html', 'generate-php', 'generate-service-worker']);

gulp.task('style', function(){  
    gulp.src(sassFiles)
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(gulp.dest(cssDest));
});

gulp.task('generate-service-worker', function(callback) {
	var path = require('path');
	var swPrecache = require('sw-precache');

	swPrecache.write('service-worker.js',{
		cacheId: packageJson.name,
		staticFileGlobs: [
		                  'css/**.css',
		                  '**.html',
		                  'img/**.*',
		                  'js/**.js',
		                  'fonts/**.*'
		                  ],
        importScripts: [
                        'js/dexie.min.js',
                        'js/suggestions-sync.js'
                        ],
        verbose: true,
        runtimeCaching: [{
        				urlPattern: 'lookup.php',
    					handler: 'networkFirst'
        				}]
		}, callback);
	});

gulp.task('generate-js', function(){
	return gulp.src(['./inc/globals.js', './inc/db.js', './inc/init.js', './inc/ui.js', './inc/utilities.js' ])
		.pipe(concat('script.js'))
		.pipe(gulp.dest('./js/'));
});

gulp.task('generate-html', function() {
  gulp.src('template.html')
    .pipe(preprocess()) //To set environment variables in-line
    .pipe(rename('index.html'))
    .pipe(gulp.dest('.')); 
});

gulp.task('generate-php', function() {
	  gulp.src('template.html')
	    .pipe(preprocess({context: { PHP: true}})) //To set environment variables in-line
	    .pipe(rename('index.php'))
	    .pipe(gulp.dest('.'));
	});