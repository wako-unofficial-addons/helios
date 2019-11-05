const gulp = require('gulp');
const exec = require('child_process').exec;

function build(cb) {
  exec('npm run build:plugin:dev', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

const watchPlugin = () => {
  gulp.watch(['./projects/plugin/src/plugin/**/*.*', './projects/plugin/src/i18n/**/*.*'], build);
};

gulp.task('build', build);

gulp.task('watch', watchPlugin);
