//gulpfile.js
var gulp = require('gulp');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');


//style paths
var sassFiles = 'css/*.scss',  
    cssDest = 'css/';

gulp.task('default', ['style']);

gulp.task('style', function(){  
    gulp.src(sassFiles)
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(gulp.dest(cssDest));
});
