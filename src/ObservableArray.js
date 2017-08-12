import * as Util from './Util'

var canUseProxy = typeof Proxy === 'function';

var OArray = function (arr, option) {
    if (!Util.isArray(arr)) arr = [];
    if (!Util.isObject(option)) option = {};

    var _this = this;

    var afterInsertElement = option.afterInsertElement || function () {};
    var beforeDeleteElement = option.beforeDeleteElement || function () {};
    var elementEquality = option.elementEquality || function (v1, v2) {
        return v1 === v2;
    };

    Util.each(arr, function (v, i) {
        _this.assignElement(i, v);
    });

    var len = arr.length;
    Object.defineProperty(this, '__offset', {
        value: 0,
        enumerable: false
    });
    Object.defineProperty(this, '__length', {
        get: function () {
            return len;
        },
        set: function (v) {
            len = v;
            return len;
        }
    });
    Object.defineProperty(this, 'length', {
        get: function () {
            return len;
        },
        set: function (v) {
            if (!Util.isNumber(v)) return false;
            var n = parseInt(v);
            if (isNaN(n) || n < 0) return false;
            if (n > len) {
                for (var i = len; i < n; i++) {
                    _this.assignElement(i, undefined);
                }
            } else if (n < len) {
                for (var i = len - 1; i >= n; i--) {
                    _this.deleteElement(i);
                }
            }
            len = n;
            return len;
        },
        enumerable: false
    });
};

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.assignElement = function (i, v) {
    if (this.hasOwnProperty(i + this.__offset)) {
        this[i + this.__offset] = v;
    } else {
        Object.defineProperty(this, i + this.__offset, {
            get: function () {
                return v;
            },
            set: function (_v) {},
            configurable: true,
            enumerable: true
        });
    }
};

OArray.prototype.deleteElement = function (i) {
    if (!this.hasOwnProperty(i + this.__offset)) return false;
    delete this[i + this.__offset];
};

OArray.prototype.push = function (v) {
    this.assignElement(this.__length, v);
    this.__length++;
    return this.__length;
};

OArray.prototype.pop = function (v) {
    this.deleteElement(this.__length - 1);
    this.__length--;
    return this.__length;
};

OArray.prototype.unshift = function (v) {
    this.__offset--;
    this.assignElement(0, v);
    this.__length++;
    return this.__length;
};

OArray.prototype.shift = function (v) {
    this.deleteElement(0);
    this.__offset++;
    this.__length--;
    return this.__length;
};

OArray.prototype.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!Util.isNumber(startIndex) || !Util.isNumber(howManyToDelete)) return [];
    if (startIndex < 0 || startIndex >= this.__length) return [];
    if (howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.__length) howManyToDelete = this.__length - startIndex;
    var r = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        r.push(Util.clone(this[i + this.__offset]));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    // TODO: delete and insert

    return r;
};

OArray.prototype.slice = function (startIndex, endIndex) {
    if (!Util.isNumber(startIndex)) return [];
    if (!Util.isNumber(endIndex)) endIndex = this.__length;
    if (startIndex < 0 || endIndex > this.__length || startIndex >= endIndex) return [];
    var r = [];
    for (var i = startIndex; i < endIndex; i++) {
        r.push(this[i + this.__offset]);
    }
    return r;
};

OArray.prototype.concat = function (arr) {};
OArray.prototype.reverse = function () {};
OArray.prototype.sort = function (sortBy) {};
OArray.prototype.forEach = function (fn) {};
OArray.prototype.filter = function (fn) {};
OArray.prototype.map = function (fn) {};
OArray.prototype.reduce = function (fn, re) {};
OArray.prototype.indexOf = function (v) {};
OArray.prototype.find = function (v) {};
OArray.prototype.findIndex = function (v) {};
OArray.prototype.fill = function (v) {};
OArray.prototype.join = function (v) {};

export default OArray
