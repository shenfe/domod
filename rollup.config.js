var uglify = require('rollup-plugin-uglify');

module.exports = {
    entry: 'src/index.js',
    format: 'umd',
    moduleName: 'domod',
    sourceMap: true,
    dest: 'dist/domod.js',
    plugins: [
        uglify()
    ]
};
