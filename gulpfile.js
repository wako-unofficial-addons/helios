const exec = require('child_process').exec;
const { watch, task } = require('gulp');

function build(cb) {
  exec('npm run build:plugin:dev', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

const watchPlugin = () => {
  watch(['./projects/plugin/src/plugin/**/*.*', './projects/plugin/src/i18n/**/*.*'], build);
};

task('build', build);

task('watch', watchPlugin);
