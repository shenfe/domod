(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.OArray = factory());
}(this, (function () { 'use strict';

var isNumber = function (v) {
    return typeof v === 'number';
};

var isNumeric = function (v) {
    var n = parseInt(v);
    if (isNaN(n)) return false;
    return (typeof v === 'number' || typeof v === 'string') && n == v;
};

var isString = function (v) {
    return typeof v === 'string';
};

var isFunction = function (v) {
    return typeof v === 'function';
};

var isObject = function (v) {
    return Object.prototype.toString.call(v) === '[object Object]';
};

var isArray = function (v) {
    return Object.prototype.toString.call(v) === '[object Array]';
};

var isBasic = function (v) {
    return v == null
        || typeof v === 'boolean'
        || typeof v === 'number'
        || typeof v === 'string'
        || typeof v === 'function';
};

var isNode = function (v) {
    return v instanceof Node;
};

var isNamedNodeMap = function (v) {
    return v instanceof NamedNodeMap;
};

var each = function (v, func, arrayReverse) {
    if (isObject(v)) {
        for (var p in v) {
            if (!v.hasOwnProperty(p)) continue;
            var r = func(v[p], p);
            if (r === false) break;
        }
    } else if (isArray(v)) {
        if (!arrayReverse) {
            for (var i = 0, len = v.length; i < len; i++) {
                var r = func(v[i], i);
                if (r === false) break;
            }
        } else {
            for (var i = v.length - 1; i >= 0; i--) {
                var r = func(v[i], i);
                if (r === false) break;
            }
        }
    } else if (isNode(v)) {
        var ret = false;
        switch (v.nodeType) {
            case Node.ELEMENT_NODE:
                break;
            case Node.TEXT_NODE:
            case Node.COMMENT_NODE:
            case Node.PROCESSING_INSTRUCTION_NODE:
            case Node.DOCUMENT_NODE:
            case Node.DOCUMENT_TYPE_NODE:
            case Node.DOCUMENT_FRAGMENT_NODE:
            default:
                ret = true;
        }
        if (ret) return;
        for (var i = 0, childNodes = v.childNodes, len = v.childNodes.length; i < len; i++) {
            func(childNodes[i]);
            each(childNodes[i], func);
        }
    } else if (isNamedNodeMap(v)) {
        for (var i = 0, len = v.length; i < len; i++) {
            var r = func(v[i]['nodeValue'], v[i]['nodeName']);
            if (r === false) break;
        }
    } else if (Util.isFunction(v.forEach)) {
        v.forEach(func);
    }
};

var clone = function (val) {
    var r = val;
    if (isObject(val)) {
        r = {};
        each(val, function (v, p) {
            r[p] = clone(v);
        });
    } else if (isArray(val)) {
        r = [];
        each(val, function (v) {
            r.push(clone(v));
        });
    }
    return r;
};

var hasProperty = function (val, p) {
    if (isObject(val)) {
        return val.hasOwnProperty(p);
    } else if (isArray(val)) {
        var n = parseInt(p);
        return isNumeric(p) && val.length > n && n >= 0;
    }
    return false;
};

var clear = function (val, p, withBasicVal) {
    var inRef = isString(p) || isNumber(p);
    var target = inRef ? val[p] : val;

    if (isObject(target) || isArray(target)) {
        each(target, function (v, p) {
            clear(target, p);
        });
        if (isArray(target)) {
            shrinkArray(target);
        }
    }

    if (inRef) {
        val[p] = withBasicVal;
    }
};

var shrinkArray = function (arr, len) {
    var limited = isNumber(len);
    if (!limited) {
        each(arr, function (v, i) {
            if (v === undefined) arr.length--;
        }, true);
    } else {
        each(arr, function (v, i) {
            if (i >= len) arr.length--;
            else return false;
        }, true);
        while (arr.length < len) {
            arr.push(null);
        }
    }
    return arr;
};

var extend = function (dest, srcs, clean) {
    if (!isObject(dest)) return null;
    var args = Array.prototype.slice.call(arguments, 1,
        arguments[arguments.length - 1] === true ? (arguments.length - 1) : arguments.length);

    function extendObj(obj, src, clean) {
        if (!isObject(src)) return;
        each(src, function (v, p) {
            if (!hasProperty(obj, p) || isBasic(v)) {
                if (obj[p] !== v) {
                    obj[p] = clone(v);
                }
            } else {
                extendObj(obj[p], v, clean);
            }
        });
        if (clean) {
            each(obj, function (v, p) {
                if (!hasProperty(src, p)) {
                    clear(obj, p);
                }
            });
            if (isArray(obj)) {
                shrinkArray(obj);
            }
        }
    }

    each(args, function (src) {
        extendObj(dest, src, clean);
    });
    return dest;
};

var OArray = function (arr, option) {
    if (isObject(arr) && arguments.length === 1) option = arr;
    if (!isArray(arr)) arr = [];

    Object.defineProperty(this, '__data', {
        value: arr
    });

    Object.defineProperty(this, 'length', {
        get: function () {
            return arr.length;
        },
        set: function (v) {
            arr.length = v;
        }
    });

    var _this = this;

    var eventNames = ['set', 'push', 'pop', 'unshift', 'shift', 'splice'];
    eventNames.forEach(function (e) {
        Object.defineProperty(_this, 'on' + e, { value: [] });
    });
    eventNames.forEach(function (e) {
        _this.addEventListener(e, option['on' + e]);
    });

    each(arr, function (v, i) {
        _this.assignElement(i);
    });
};

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.addEventListener = function (eventName, handler) {
    if (!this['on' + eventName] || !isFunction(handler)) return;
    this['on' + eventName].push(handler);
};
OArray.prototype.on = OArray.prototype.addEventListener;

OArray.prototype.removeEventListener = function (eventName, handler) {
    var _this = this;
    if (!this['on' + eventName] || !isFunction(handler)) return;
    var handlers = this['on' + eventName];
    each(handlers, function (h, i) {
        if (h === handler) {
            handlers.splice(i, 1);
            return false;
        }
    });
};
OArray.prototype.off = OArray.prototype.removeEventListener;

OArray.prototype.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};
OArray.prototype.trigger = OArray.prototype.dispatchEvent;

OArray.prototype.assignElement = function (i) {
    Object.defineProperty(this, i, {
        get: function () {
            return this.__data[i];
        },
        set: function (val) {
            var e = this.__data[i];
            if (isBasic(e) || isBasic(val)) {
                this.dispatchEvent('set', e, val, i, this.__data);
                e = val;
                this.__data[i] = e;
            } else {
                extend(e, val, true);
            }
        },
        configurable: true,
        enumerable: true
    });
};
OArray.prototype.deleteElement = function () {
    if (this.hasOwnProperty(this.length - 1)) delete this[this.length - 1];
};

['push', 'unshift'].forEach(function (f) {
    OArray.prototype[f] = function (v) {
        this.__data[f](v);
        this.assignElement(this.length - 1);
        this.dispatchEvent(f, v);
    };
});
['pop', 'shift'].forEach(function (f) {
    OArray.prototype[f] = function () {
        this.dispatchEvent(f, this.__data[f === 'pop' ? (this.length - 1) : 0]);
        this.deleteElement();
        this.__data[f]();
    };
});

OArray.prototype.toArray = function (notClone) {
    return notClone ? this.__data : clone(this.__data);
};

OArray.prototype.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!isNumber(startIndex) || startIndex < 0) startIndex = 0;
    if (startIndex >= this.length) startIndex = this.length;
    if (!isNumber(howManyToDelete) || howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.length) howManyToDelete = this.length - startIndex;

    var itemsToDelete = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        itemsToDelete.push(clone(this[i]));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    var howManyToInsert = itemsToInsert.length;

    var howManyToSet = Math.min(howManyToDelete, howManyToInsert);
    for (var i = startIndex; i < startIndex + howManyToSet; i++) {
        this[i] = itemsToInsert[i - startIndex];
    }

    if (howManyToDelete === howManyToInsert) return;

    var args;
    if (howManyToDelete > howManyToInsert) {
        args = [startIndex + howManyToInsert, howManyToDelete - howManyToInsert];
        Array.prototype.splice.apply(this.__data, args);
    } else {
        args = [startIndex + howManyToDelete, 0].concat(itemsToInsert.slice(howManyToDelete));
        Array.prototype.splice.apply(this.__data, args);
    }
    this.dispatchEvent.apply(this, ['splice'].concat(args));
};

OArray.prototype.forEach = function (fn) {
    for (var i = 0; i < this.length; i++) {
        var r = fn(this[i], i);
        if (r === false) break;
    }
};

['reverse', 'sort'].forEach(function (f) {
    OArray.prototype[f] = function () {
        var r = clone(this.__data);
        Array.prototype[f].apply(r, arguments);
        for (var i = 0; i < this.length; i++) {
            this[i] = r[i];
        }
    };
});

['slice', 'concat', 'filter', 'map', 'reduce',
    'indexOf', 'find', 'findIndex', 'fill', 'join'].forEach(function (f) {
    OArray.prototype[f] = function () {
        return Array.prototype[f].apply(this.toArray(), arguments);
    };
});

return OArray;

})));
//# sourceMappingURL=ObservableArray.js.map
