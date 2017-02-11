//gulpfile.js
var $ = require('gulp-load-plugins')()
var gulp = require('gulp');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');

var packageJson = require('./package.json');


//style paths
var sassFiles = 'css/*.scss',  
    cssDest = 'css/';

gulp.task('default', ['style', 'generate-service-worker']);

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
