(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Kernel = {})));
}(this, (function (exports) { 'use strict';

var gid = (function () {
    var n = 0;
    return function () {
        return n++;
    };
})();

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

var isInstance = function (v, creator) {
    return typeof creator === 'function' && v instanceof creator;
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

function flatten(root, objectFilter, clean) {
    objectFilter = objectFilter || function () { return true; };
    var ext = {};
    each(root, function (v, p) {
        if (isObject(v) && !objectFilter(v)) {
            var f = flatten(v, objectFilter, clean);
            each(f, function (vv, pp) {
                ext[p + '.' + pp] = vv;
            });
        } else {
            if (objectFilter(v) || !clean) {
                ext[p] = v;
            }
        }
    });
    return ext;
}

function defineProperty$1(target, prop, desc) {
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

    defineProperty$1(this, '__data', {
        value: arr
    });

    defineProperty$1(this, 'length', {
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
        defineProperty$1(_this, 'on' + e, { value: [] });
    });
    eventNames.forEach(function (e) {
        _this.addEventListener(e, option['on' + e]);
    });

    each(arr, function (v, i) {
        _this.assignElement(i);
    });
}

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.addEventListener = function (eventName, handler) {
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
OArray.prototype.on = OArray.prototype.addEventListener;

OArray.prototype.removeEventListener = function (eventName, handler) {
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
OArray.prototype.off = OArray.prototype.removeEventListener;

OArray.prototype.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};
OArray.prototype.trigger = OArray.prototype.dispatchEvent;

OArray.prototype.get = function (i) {
    return this.__data[i];
};

OArray.prototype.set = function (i, v) {
    var e = this.__data[i];
    if (isBasic(e) || isBasic(v)) {
        this.dispatchEvent('set', e, v, i, this.__data);
        this.__data[i] = v;
    } else {
        extend(e, v, true);
    }
};

OArray.prototype.assignElement = function (i) {
    defineProperty$1(this, i, {
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
OArray.prototype.deleteElement = function () {
    if (this.hasOwnProperty(this.length - 1)) delete this[this.length - 1];
};

['push', 'unshift'].forEach(function (f) {
    OArray.prototype[f] = function (v) {
        this.__data[f](v);
        this.assignElement(this.length - 1);
        this.dispatchEvent(f, v);
        this.dispatchEvent('resize');
    };
});
['pop', 'shift'].forEach(function (f) {
    OArray.prototype[f] = function () {
        this.dispatchEvent(f, this.__data[f === 'pop' ? (this.length - 1) : 0]);
        this.deleteElement();
        this.__data[f]();
        this.dispatchEvent('resize');
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

OArray.prototype.forEach = function (fn) {
    for (var i = 0; i < this.length; i++) {
        var r = fn(this.get(i), i);
        if (r === false) break;
    }
};

['reverse', 'sort'].forEach(function (f) {
    OArray.prototype[f] = function () {
        var r = clone(this.__data);
        Array.prototype[f].apply(r, arguments);
        for (var i = 0; i < this.length; i++) {
            this.set(i, r[i]);
        }
    };
});

['slice', 'concat', 'filter', 'map', 'reduce',
    'indexOf', 'find', 'findIndex', 'fill', 'join'].forEach(function (f) {
    OArray.prototype[f] = function () {
        return Array.prototype[f].apply(this.toArray(), arguments);
    };
});

OArray.prototype.clear = function () {
    while (this.length) {
        this.pop();
    }
    return this;
};

OArray.prototype.cast = function (arr) {
    return this.splice.apply(this, [0, this.length].concat(arr));
};

var Store = {};
var Dnstreams = {};
var ResultsIn = {};
var Upstreams = {};
var ResultsFrom = {};
var Laziness = {};
var PropKernelTable = {};
var KernelStatus = {};
var GetterSetter = {};
var __ = {};

function defineProperty(target, prop, desc, proppath) {
    if (!isNode(target)) {
        if (isInstance(target, OArray)) {
            if (desc.set) {
                target.on('set', function (oval, nval, i, arr) {
                    if (i == prop) {
                        desc.set(nval);
                    }
                });
            }
        } else {
            Object.defineProperty(target, prop, desc);
        }
    } else {
        if ('value' in desc) {
            target[prop] = desc.value;
        }
    }
    proppath = proppath || fullpathOf(prop, target);
    if (!GetterSetter[proppath] && ('get' in desc || 'set' in desc)) GetterSetter[proppath] = {};
    if ('get' in desc) {
        GetterSetter[proppath].get = desc.get;
    }
    if ('set' in desc) {
        GetterSetter[proppath].set = desc.set;
    }
}

function fullpathOf(ref, root) {
    if (root === undefined) return ref;
    var pre = register(root);
    if (pre == null) return ref || '';
    return pre + (ref ? ('.' + ref) : '');
}

function register(root) {
    if (root === Store || (!isObject(root) && !isNode(root))) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + gid();
        defineProperty(root, '__kernel_root', {
            value: id
        });
        Store[id] = root;
    }
    return root.__kernel_root;
}

function formatStream(stream, root) {
    if (isObject(stream) || isString(stream)) stream = [stream];
    if (isArray(stream)) {
        return stream.map(function (a) {
            if (isObject(a)) return register(a.root) + '.' + a.alias;
            if (isString(a)) return register(root) + '.' + a;
            return null;
        });
    }
    return [];
}

function propKernelOrder(proppath) {
    if (PropKernelTable[proppath] === undefined) return 0;
    return PropKernelTable[proppath].length;
}

/**
 * Kernel constructor function.
 * @constructor
 */
function Kernel(root, path, relations) {
    var obj = {};
    var value;
    obj = scopeOf(path, root);
    if (obj == null) return;
    value = obj.target[obj.property];

    var proppath = register(root) + '.' + path;
    var __kid = proppath + '#' + propKernelOrder(proppath);
    defineProperty(this, '__kid', {
        value: __kid
    });
    KernelStatus[this.__kid] = 1;
    if (PropKernelTable[proppath] === undefined) {
        PropKernelTable[proppath] = [];
        if (hasProperty(obj.target, obj.property) && !isInstance(obj.target, OArray)) {
            delete obj.target[obj.property];
        }
    }
    PropKernelTable[proppath].push(1);

    var dnstream = formatStream(relations.dnstream, root);
    var resultIn = relations.resultIn;
    var upstream = formatStream(relations.upstream, root);
    var resultFrom = relations.resultFrom;
    var lazy = !!relations.lazy;
    if (!Dnstreams[proppath]) Dnstreams[proppath] = {};
    dnstream.forEach(function (p) {
        if (!Upstreams[p]) Upstreams[p] = {};
        if (!Upstreams[p][proppath]) Upstreams[p][proppath] = {};
        Upstreams[p][proppath][__kid] = 1;
        if (!Dnstreams[proppath][p]) Dnstreams[proppath][p] = {};
        Dnstreams[proppath][p][__kid] = 1;
    });
    if (!ResultsIn[proppath]) ResultsIn[proppath] = [];
    ResultsIn[proppath].push(isFunction(resultIn) ? resultIn : null);
    if (!Upstreams[proppath]) Upstreams[proppath] = {};
    upstream.forEach(function (p) {
        if (!Upstreams[proppath][p]) Upstreams[proppath][p] = {};
        Upstreams[proppath][p][__kid] = 1;
        if (!Dnstreams[p]) Dnstreams[p] = {};
        if (!Dnstreams[p][proppath]) Dnstreams[p][proppath] = {};
        Dnstreams[p][proppath][__kid] = 1;
    });
    if (isFunction(resultFrom)) {
        ResultsFrom[proppath] = {
            f: resultFrom,
            k: this.__kid,
            deps: upstream
        };
    }
    if (lazy) Laziness[proppath] = true;

    if (PropKernelTable[proppath].length === 1) {
        defineProperty(obj.target, obj.property, {
            get: function () {
                if (ResultsFrom[proppath] && KernelStatus[ResultsFrom[proppath].k] !== 0) {
                    var v = ResultsFrom[proppath].f.apply(
                        null,
                        ResultsFrom[proppath].deps.map(function (p) { return Data(null, p); })
                    );
                    if (value !== v) {
                        GetterSetter[proppath].set(v);
                    }
                }
                return value;
            },
            set: function (val, force) {
                if (!force && val === value) return;
                if (val !== value) {
                    if (isInstance(obj.target, OArray) &&
                        !(isObject(value) && isObject(val))) {
                        obj.target.set(obj.property, val);
                        value = obj.target[obj.property];
                    } else {
                        value = extend(value, val);
                    }
                }

                ResultsIn[proppath] && ResultsIn[proppath].forEach(function (f, k) {
                    f && (KernelStatus[proppath + '#' + k] !== 0) && f.apply(root, [value]);
                });
                if (Dnstreams[proppath]) {
                    each(Dnstreams[proppath], function (kmap, ds) {
                        var toUpdateDnstream = false;
                        each(kmap, function (v, k) {
                            if (KernelStatus[k] !== 0) {
                                toUpdateDnstream = true;
                                return false;
                            }
                        });
                        toUpdateDnstream && ResultsFrom[ds] && !Laziness[ds] && Data(null, ds);
                    });
                }
            },
            // configurable: true,
            enumerable: true
        }, proppath);
    }

    if (hasProperty(relations, 'value')) {
        Data(null, proppath, relations.value);
    }
}

Kernel.prototype.disable = function () {
    KernelStatus[this.__kid] = 0;
};
Kernel.prototype.enable = function () {
    KernelStatus[this.__kid] = 1;
};
Kernel.prototype.destroy = function () {};

/**
 * Whether an object is a relation definition.
 * @param {Object} obj 
 * @return {Boolean}
 */
function isRelationDefinition(obj) {
    if (!isObject(obj)) return false;
    var r = true;
    var specProps = {
        __isRelation: 2, // !
        dnstream: 1, // *
        resultIn: 1, // *
        upstream: 1, // *
        resultFrom: 1, // *
        lazy: true,
        value: true
    };
    var count = 0;
    each(obj, function (v, p) {
        if (specProps[p] === 2) {
            r = true;
            count++;
            return false;
        }
        if (!specProps[p]) {
            r = false;
            return false;
        }
        if (specProps[p] === 1) {
            count++;
        }
    });
    return r && (count > 0);
}

/**
 * Define and bind data with relations in a whole (PropertyPath => Relation) map.
 * @param {Object} obj                  The data object. If `relations` is undefined, it contains relations.
 * @param {Object|Undefined} relations  A map from propertyPath to relation.
 */
function Relate(obj, relations) {
    var fr;
    if (arguments.length === 1) {
        if (!isObject(obj)) return null;
        fr = flatten(obj, isRelationDefinition, true);
    } else if (isObject(relations)) {
        fr = flatten(relations, isRelationDefinition, true);
    } else {
        return null;
    }
    each(fr, function (rel, p) {
        new Kernel(obj, p, rel);
    });

    return obj;
}

/**
 * Get the target and property.
 * @param {String} ref 
 * @param {Object} root 
 */
function scopeOf(ref, root) {
    if (root === undefined) root = Store;
    if ((!isObject(root) && !isNode(root)) || !isString(ref)) return null;
    var fullpath = fullpathOf(ref, root);
    var lastDot = fullpath.lastIndexOf('.');
    var targetPath = fullpath.substring(0, lastDot);
    var propPath = fullpath.substring(lastDot + 1);
    var targetValue = Data(null, targetPath, __, true);
    if (targetValue == null) {
        targetValue = Data(null, targetPath, {}, true);
    }
    return {
        target: targetValue,
        property: propPath
    };
}

/**
 * Get or set data, and trigger getters or setters.
 */
function Data(root, refPath, value, ensurePathValid) {
    root = root || Store;
    var toSet = arguments.length >= 3 && value !== __;
    var v = root;
    var proppath = fullpathOf(null, root);
    var paths = [];
    if (refPath) paths = refPath.split('.');
    var parent;
    var prop;

    while (paths.length) {
        if (ensurePathValid && v == null) {
            parent[prop] = {};
        } else if (isBasic(v)) {
            return undefined;
        }
        prop = paths.shift();
        proppath += (proppath === '' ? '' : '.') + prop;
        if (toSet && paths.length === 0) { /* set */
            if (isInstance(v, OArray) &&
                !(isObject(v[prop]) && isObject(value))) {
                v.set(prop, value);
            } else {
                v[prop] = extend(v[prop], value);
            }
        } else { /* get */
            parent = v;
            v = v[prop];
        }
    }
    return toSet ? v[prop] : v;
}

exports.Kernel = Kernel;
exports.Relate = Relate;
exports.Data = Data;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=Kernel.js.map
