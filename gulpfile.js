'use strict';
// npm install gulp gulp-mocha gulp-util gulp-nodemon

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const gutil = require('gulp-util');
const nodemon = require('gulp-nodemon');
const stubby = require('gulp-stubby-server');
const jshint = require('gulp-jshint');
const stylish = require('jshint-stylish');
const eslint = require('gulp-eslint');
const istanbul = require('gulp-istanbul');
const lintspaces = require('gulp-lintspaces');
const babel = require('gulp-babel');

const fs = require('fs');

gulp.task('pre-mocha', function() {
  return gulp.src(['./index.js'])
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire());
});

gulp.task('tabpreventer', function() {
  return gulp.src(['index.js'])
    .pipe(lintspaces({
      indentation: 'spaces',
      spaces: 2,
      ignores: [
        'js-comments',
        'c-comments'
      ]
    }))
    .pipe(lintspaces.reporter());
});

gulp.task('mocha-watch', function() {
  return gulp.src(['test/**/*.js'])
    .pipe(mocha())
    .on('error', gutil.log);
});

gulp.task('mocha', gulp.series('pre-mocha', function() {
  return gulp.src(['test/**/*.js'])
    .pipe(mocha())
    .on('error', gutil.log);
}));

gulp.task('watch', function() {
  gulp.watch(['*.js','test/**'], ['mocha-watch']);
});

gulp.task('hint', function () {
  return gulp.src(['index.js'])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .on('error', function (error) {
       console.error(String(error));
  });
});

gulp.task('watch-lint', function() {
  gulp.watch(['index.js'], ['lint']);
});

gulp.task('lint', function() {
  return gulp.src(['index.js']).pipe(eslint())
  .pipe(eslint.format())
  // Brick on failure to be super strict
  .pipe(eslint.failOnError());
});

gulp.task('pre-push', gulp.series('tabpreventer', 'lint', 'hint', 'mocha'));

gulp.task('default', gulp.series(function (done) {
  // task code here
  done();
}));
