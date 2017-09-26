var uglify = require('rollup-plugin-uglify');

module.exports = {
    entry: 'src/OArray.js',
    format: 'umd',
    moduleName: 'OArray',
    sourceMap: true,
    dest: 'dist/OArray.js',
    plugins: [
        // uglify()
    ]
};
