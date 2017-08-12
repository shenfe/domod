import * as Util from './Util'

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

OArray.prototype = new Array;
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
    this.assignElement(this.length, v);
    this.__length++;
    return this.__length;
};

OArray.prototype.pop = function (v) {
    this.length--;
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

OArray.prototype.reverse = function (v) {};

OArray.prototype.sort = function (v) {};

OArray.prototype.concat = function (v) {};

OArray.prototype.slice = function (v) {};

OArray.prototype.splice = function (v) {};

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
