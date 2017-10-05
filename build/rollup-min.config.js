var uglify = require('rollup-plugin-uglify');

module.exports = {
    entry: 'src/index.js',
    format: 'umd',
    moduleName: 'domod',
    sourceMap: true,
    dest: 'dist/domod.min.js',
    plugins: [
        uglify({
            // ie8: true
        })
    ]
};
