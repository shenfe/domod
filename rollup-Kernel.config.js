var uglify = require('rollup-plugin-uglify');

module.exports = {
    entry: 'src/Kernel.js',
    format: 'umd',
    moduleName: 'Kernel',
    sourceMap: true,
    dest: 'dist/Kernel.js',
    plugins: [
        uglify()
    ]
};
