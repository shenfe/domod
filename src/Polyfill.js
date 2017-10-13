(function () {
    // Array.prototype.forEach
    // Array.prototype.filter
    // Array.prototype.map
    // String.prototype.trim
    // String.prototype.startsWith
    // String.prototype.endsWith
    // Object.keys
    if (!Object.keys) {
        Object.keys = function (o) {
            if (o !== Object(o)) throw new TypeError('Object.keys called on a non-object');
            var k = [];
            for (var p in o) if (Object.prototype.hasOwnProperty.call(o, p)) k.push(p);
            return k;
        };
    }
    // Object.values
    if (!Object.values) {
        Object.values = function (o) {
            if (o !== Object(o)) throw new TypeError('Object.values called on a non-object');
            var v = [];
            for (var p in o) if (Object.prototype.hasOwnProperty.call(o, p)) v.push(o[p]);
            return v;
        };
    }
})();
