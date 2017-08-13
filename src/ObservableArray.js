import * as Util from './Util'

var canUseProxy = typeof Proxy === 'function';

var OArray = function (arr, option) {
    if (!Util.isArray(arr)) arr = [];
    if (!Util.isObject(option)) option = {};

    Object.defineProperty(this, 'afterInsertElement', {
        value: option.afterInsertElement || function (target, p) {}
    });
    Object.defineProperty(this, 'beforeDeleteElement', {
        value: option.beforeDeleteElement || function (target, p) {}
    });
    Object.defineProperty(this, 'elementEquality', {
        value: option.elementEquality || function (v1, v2) { return v1 === v2; }
    });

    var len = 0;
    Object.defineProperty(this, '__length', {
        get: function () {
            return len;
        },
        set: function (v) {
            return len = v;
        }
    });
    Object.defineProperty(this, 'length', {
        get: function () {
            return this.__length;
        },
        set: function (v) {
            if (!Util.isNumber(v)) return false;
            var n = parseInt(v);
            if (isNaN(n) || n < 0) return false;
            if (n > this.__length) {
                for (var i = this.__length; i < n; i++)
                    this.push(undefined);
            } else if (n < this.__length) {
                for (var i = this.__length - 1; i >= n; i--)
                    this.pop();
            }
            return this.__length;
        }
    });

    var extendable = false;
    Object.defineProperty(this, '__extendable', {
        get: function () {
            return extendable;
        },
        set: function (v) {
            return extendable = !!v;
        }
    });

    var _this = this;
    this.__extendable = true;
    Util.each(arr, function (v, i) {
        _this.push(v);
    });
    this.__extendable = false;
};

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.assignElement = function (i, val) {
    if (!Util.isNumber(i)) return false;
    if (this.hasOwnProperty(i)) {
        this[i] = val;
    } else if (this.__extendable) {
        var v = val;
        Object.defineProperty(this, i, {
            get: function () {
                return v;
            },
            set: function (_v) {
                return v = _v;
            },
            configurable: true,
            enumerable: true
        });
    } else {
        return false;
    }
};

OArray.prototype.deleteElement = function (i) {
    if (!Util.isNumber(i) || !this.hasOwnProperty(i)) return false;
    delete this[i];
    return true;
};

OArray.prototype.push = function (v) {
    this.__extendable = true;
    this.assignElement(this.__length, v);
    this.__extendable = false;
    this.__length++;
    return this.__length;
};

OArray.prototype.pop = function (v) {
    if (this.deleteElement(this.__length - 1)) this.__length -= 1;
    return this.__length;
};

OArray.prototype.offset = function (startIndex, howManyElements, howManySteps, notClean) {
    if (!Util.isNumber(startIndex) || startIndex < 0 || startIndex >= this.__length) return false;
    if (!Util.isNumber(howManySteps) || howManySteps === 0) return false;
    if (!Util.isNumber(howManyElements) || howManyElements <= 0
        || howManyElements + startIndex > this.__length) howManyElements = this.__length - startIndex;
    this.__extendable = true;
    if (howManySteps > 0) { /* to right */
        for (var i = startIndex + howManyElements - 1 + howManySteps; i >= startIndex + howManySteps; i--) {
            this.assignElement(i, this[i - howManySteps]);
        }
        if (!notClean) {
            for (var i = startIndex; i < startIndex + howManySteps; i++) {
                this.assignElement(i, undefined);
            }
        }
        if (startIndex + howManyElements + howManySteps > this.__length) {
            this.__length = startIndex + howManyElements + howManySteps;
        }
    } else { /* to left */
        for (var i = Math.max(0, startIndex + howManySteps); i < startIndex + howManyElements + howManySteps; i++) {
            this.assignElement(i, this[i - howManySteps]);
        }
        for (var i = Math.max(0, startIndex + howManyElements + howManySteps);
            i < startIndex + howManyElements; i++) {
            this.assignElement(i, undefined);
        }
        if (startIndex + howManyElements >= this.__length) {
            this.length = Math.max(0, startIndex + howManyElements + howManySteps);
        }
    }
    this.__extendable = false;
};

OArray.prototype.unshift = function (v) {
    this.offset(0, null, 1);
    this.__extendable = true;
    this.assignElement(0, v);
    this.__extendable = false;
    return this.__length;
};

OArray.prototype.shift = function (v) {
    this.offset(0, null, -1);
    return this.__length;
};

OArray.prototype.toArray = function (notClone) {
    var r = [];
    this.forEach(function (v, i) {
        r.push(notClone ? v : Util.clone(v));
    });
    return r;
};

OArray.prototype.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!Util.isNumber(startIndex)) return [];
    if (startIndex < 0 || startIndex >= this.__length) return [];
    if (!Util.isNumber(howManyToDelete) || howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.__length) howManyToDelete = this.__length - startIndex;

    var r = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        r.push(Util.clone(this[i]));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    var howManyToInsert = itemsToInsert.length;

    this.__extendable = true;
    if (howManyToDelete >= howManyToInsert) {
        if (startIndex + howManyToDelete === this.__length) {
            for (var i = 0; i < howManyToDelete - howManyToInsert; i++) {
                this.pop();
            }
        } else {
            this.offset(startIndex + howManyToDelete, null, howManyToInsert - howManyToDelete);
        }
        for (var i = startIndex; i < startIndex + howManyToInsert; i++) {
            this.assignElement(i, itemsToInsert[i - startIndex]);
        }
    } else if (howManyToDelete < howManyToInsert) {
        if (startIndex + howManyToDelete === this.__length) {
            this.__length = startIndex + howManyToInsert;
        } else {
            this.offset(startIndex + howManyToDelete, null, howManyToInsert - howManyToDelete, true);
        }
        for (var i = startIndex; i < startIndex + howManyToInsert; i++) {
            this.assignElement(i, itemsToInsert[i - startIndex]);
        }
    }
    this.__extendable = false;

    return r;
};

OArray.prototype.slice = function (startIndex, endIndex, notClone) {
    if (!Util.isNumber(startIndex)) return [];
    if (!Util.isNumber(endIndex)) endIndex = this.__length;
    if (startIndex < 0 || endIndex > this.__length || startIndex >= endIndex) return [];
    var r = [];
    for (var i = startIndex; i < endIndex; i++) {
        r.push(notClone ? this[i] : Util.clone(this[i]));
    }
    return r;
};

OArray.prototype.concat = function () {
    return Array.prototype.concat.apply(this.toArray(), arguments);
};

OArray.prototype.reverse = function () {
    var m = Math.floor((this.__length - 1) / 2);
    for (var i = 0; i <= m; i++) {
        var j = this.__length - 1 - i;
        var vi = Util.clone(this[i]);
        var vj = Util.clone(this[j]);
        this[i] = vj;
        this[j] = vi;
    }
};

OArray.prototype.sort = function (sortBy) {};

OArray.prototype.forEach = function (fn) {
    for (var i = 0; i < this.__length; i++) {
        var r = fn(this[i], i);
        if (r === false) break;
    }
};

OArray.prototype.filter = function () {
    return Array.prototype.filter.apply(this.toArray(), arguments);
};

OArray.prototype.map = function () {
    return Array.prototype.map.apply(this.toArray(), arguments);
};

OArray.prototype.reduce = function () {
    return Array.prototype.reduce.apply(this.toArray(), arguments);
};

OArray.prototype.indexOf = function (v) {
    // TODO: optimization
    return Array.prototype.indexOf.apply(this.toArray(), arguments);
};

OArray.prototype.find = function (v) {
    // TODO: optimization
    return Array.prototype.find.apply(this.toArray(), arguments);
};

OArray.prototype.findIndex = function (v) {
    // TODO: optimization
    return Array.prototype.findIndex.apply(this.toArray(), arguments);
};

OArray.prototype.fill = function (v) {
    this.forEach(function (e, i) {
        this.assignElement(i, v);
    });
};

OArray.prototype.join = function () {
    return Array.prototype.join.apply(this.toArray(), arguments);
};

export default OArray
