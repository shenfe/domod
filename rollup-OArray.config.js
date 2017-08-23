var uglify = require('rollup-plugin-uglify');

module.exports = {
    entry: 'src/ObservableArray.js',
    format: 'umd',
    moduleName: 'OArray',
    sourceMap: true,
    dest: 'dist/ObservableArray.js',
    plugins: [
        uglify()
    ]
};
