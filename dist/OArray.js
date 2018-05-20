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
    return v != null && !(v instanceof Array) && Object.prototype.toString.call(v) === '[object Object]';
};

var isArray = function (v) {
    return Object.prototype.toString.call(v) === '[object Array]';
};

var isLikeArray = function (v) {
    return v instanceof Array;
};

var isBasic = function (v) {
    return v == null
        || typeof v === 'boolean'
        || typeof v === 'number'
        || typeof v === 'string'
        || typeof v === 'function';
};

var isNode = function (v) {
    if (typeof Node !== 'function') return false;
    return v instanceof Node;
};

var isNamedNodeMap = function (v) {
    return v instanceof NamedNodeMap;
};

var each = function (v, func, arrayReverse) {
    var i;
    var len;
    if (!isArray(v) && isFunction(v.forEach)) {
        v.forEach(func);
    } else if (isObject(v)) {
        for (var p in v) {
            if (!v.hasOwnProperty(p)) continue;
            if (func(v[p], p) === false) break;
        }
    } else if (isLikeArray(v)) {
        if (!arrayReverse) {
            for (i = 0, len = v.length; i < len; i++) {
                if (func(v[i], i) === false) break;
            }
        } else {
            for (i = v.length - 1; i >= 0; i--) {
                if (func(v[i], i) === false) break;
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
        var childNodes = v.childNodes;
        for (i = 0, len = childNodes.length; i < len; i++) {
            if (!childNodes[i]) break;
            func(childNodes[i]);
            each(childNodes[i], func);
        }
    } else if (isNamedNodeMap(v)) {
        for (i = 0, len = v.length; i < len; i++) {
            if (func(v[i]['nodeValue'], v[i]['nodeName']) === false) break;
        }
    }
};

var clone = function (val) {
    var r = val;
    if (isObject(val)) {
        r = {};
        each(val, function (v, p) {
            r[p] = clone(v);
        });
    } else if (isLikeArray(val)) {
        r = new val.constructor();
        each(val, function (v) {
            r.push(clone(v));
        });
    }
    return r;
};

var hasProperty = function (val, p) {
    if (isObject(val)) {
        return val.hasOwnProperty(p);
    } else if (isLikeArray(val)) {
        var n = parseInt(p);
        return isNumeric(p) && val.length > n && n >= 0;
    }
    return false;
};

var clear = function (val, p, withBasicVal) {
    var inRef = isString(p) || isNumber(p);
    var target = inRef ? val[p] : val;

    if (isObject(target) || isLikeArray(target)) {
        each(target, function (v, p) {
            clear(target, p);
        });
        if (isLikeArray(target)) {
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
            if (v == null) arr.pop();
        }, true);
    } else {
        each(arr, function (v, i) {
            if (i >= len) arr.pop();
            else return false;
        }, true);
        while (arr.length < len) {
            arr.push(null);
        }
    }
    return arr;
};

var extend = function (dest, srcs, clean, handler) {
    if (!isObject(dest)) return srcs;
    var args;
    var argOffset = 0;
    handler = undefined;
    clean = false;
    var lastArg = arguments[arguments.length - 1];
    if (isFunction(lastArg)) {
        argOffset = 2;
        handler = lastArg;
        clean = !!arguments[arguments.length - 2];
    } else if (lastArg === true) {
        argOffset = 1;
        clean = lastArg;
    }
    args = Array.prototype.slice.call(arguments, 1, arguments.length - argOffset);

    function extendObj(obj, src, clean) {
        if (!isObject(src) && !isLikeArray(src)) return src;
        if (isLikeArray(src)) {
            if (!isLikeArray(obj)) return clone(src);
            else {
                obj.splice.apply(obj, [0, obj.length].concat(src));
                return obj;
            }
        }
        each(src, function (v, p) {
            if (!hasProperty(obj, p) || isBasic(v)) {
                if (obj[p] !== v) {
                    obj[p] = clone(v);
                }
            } else {
                obj[p] = extendObj(obj[p], v, clean);
            }
        });
        if (clean) {
            each(obj, function (v, p) {
                if (!hasProperty(src, p)) {
                    clear(obj, p);
                }
            });
        }
        return obj;
    }

    each(args, function (src) {
        dest = extendObj(dest, src, clean);
    });
    return dest;
};

function defineProperty(target, prop, desc) {
    if (Object.defineProperty) {
        Object.defineProperty(target, prop, desc);
    } else {
        if ('value' in desc) {
            target[prop] = desc.value;
        }
    }
}

function OArray(arr, option) {
    if (isObject(arr) && arguments.length === 1) option = arr;
    if (!isArray(arr)) arr = [];
    if (!option) option = {};

    defineProperty(this, '__data', {
        value: arr
    });

    defineProperty(this, 'length', {
        get: function () {
            return arr.length;
        },
        set: function (v) {
            arr.length = v;
        }
    });

    var _this = this;

    var eventNames = ['set', 'push', 'pop', 'unshift', 'shift', 'splice', 'resize'];
    eventNames.forEach(function (e) {
        defineProperty(_this, 'on' + e, { value: [] });
    });
    eventNames.forEach(function (e) {
        _this.addEventListener(e, option['on' + e]);
    });

    each(arr, function (v, i) {
        _this.assignElement(i);
    });
}

OArray.prototype = [];

var __proto__ = OArray.prototype;

__proto__.constructor = OArray;

__proto__.on = __proto__.addEventListener = function (eventName, handler) {
    var _this = this;
    if (isObject(eventName)) {
        each(eventName, function (hdl, evt) {
            _this.addEventListener(evt, hdl);
        });
        return;
    }
    if (!this['on' + eventName] || !isFunction(handler)) return;
    this['on' + eventName].push(handler);
};

__proto__.off = __proto__.removeEventListener = function (eventName, handler) {
    var _this = this;
    if (isObject(eventName)) {
        each(eventName, function (hdl, evt) {
            _this.removeEventListener(evt, hdl);
        });
        return;
    }
    if (!this['on' + eventName] || !isFunction(handler)) return;
    var handlers = this['on' + eventName];
    each(handlers, function (h, i) {
        if (h === handler) {
            handlers.splice(i, 1);
            return false;
        }
    });
};

__proto__.trigger = __proto__.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};

__proto__.get = function (i) {
    return this.__data[i];
};

__proto__.set = function (i, v) {
    var e = this.__data[i];
    if (isBasic(e) || isBasic(v)) {
        this.dispatchEvent('set', e, v, i, this.__data);
        this.__data[i] = v;
    } else {
        extend(e, v, true);
    }
};

__proto__.assignElement = function (i) {
    defineProperty(this, i, {
        get: function () {
            return this.get(i);
        },
        set: function (val) {
            this.set(i, val);
        },
        configurable: true,
        enumerable: true
    });
};
__proto__.deleteElement = function () {
    if (this.hasOwnProperty(this.length - 1)) delete this[this.length - 1];
};

['push', 'unshift'].forEach(function (f) {
    __proto__[f] = function (v) {
        this.__data[f](v);
        this.assignElement(this.length - 1);
        this.dispatchEvent(f, v);
        this.dispatchEvent('resize');
    };
});
['pop', 'shift'].forEach(function (f) {
    __proto__[f] = function () {
        this.dispatchEvent(f, this.__data[f === 'pop' ? (this.length - 1) : 0]);
        this.deleteElement();
        this.__data[f]();
        this.dispatchEvent('resize');
    };
});

__proto__.toArray = function (notClone) {
    return notClone ? this.__data : clone(this.__data);
};

__proto__.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!isNumber(startIndex) || startIndex < 0) startIndex = 0;
    if (startIndex >= this.length) startIndex = this.length;
    if (!isNumber(howManyToDelete) || howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.length) howManyToDelete = this.length - startIndex;

    var itemsToDelete = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        itemsToDelete.push(clone(this.get(i)));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    var howManyToInsert = itemsToInsert.length;

    var howManyToSet = Math.min(howManyToDelete, howManyToInsert);
    for (var j = startIndex; j < startIndex + howManyToSet; j++) {
        this.set(j, itemsToInsert[j - startIndex]);
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
    this.dispatchEvent('resize');
};

__proto__.forEach = function (fn) {
    for (var i = 0; i < this.length; i++) {
        var r = fn(this.get(i), i);
        if (r === false) break;
    }
};

['reverse', 'sort'].forEach(function (f) {
    __proto__[f] = function () {
        var r = clone(this.__data);
        Array.prototype[f].apply(r, arguments);
        for (var i = 0; i < this.length; i++) {
            this.set(i, r[i]);
        }
    };
});

['slice', 'concat', 'filter', 'map', 'reduce',
    'indexOf', 'find', 'findIndex', 'fill', 'join'].forEach(function (f) {
    __proto__[f] = function () {
        return Array.prototype[f].apply(this.toArray(), arguments);
    };
});

__proto__.clear = function () {
    while (this.length) {
        this.pop();
    }
    return this;
};

__proto__.cast = function (arr) {
    return this.splice.apply(this, [0, this.length].concat(arr));
};

return OArray;

})));
//# sourceMappingURL=OArray.js.map
