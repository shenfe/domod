(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.DMD = factory());
}(this, (function () { 'use strict';

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

var uid = function () {
    return new Date().getTime() * 10000 + Math.floor(Math.random() * 10000);
};

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

var isEventName = function (v) {
    if (!isString(v) || !v.startsWith('on')) return false;
    return v.substr(2); // TODO
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

var allRefs = function (obj) {
    if (isLikeArray(obj)) return [];
    var refs = [];
    each(obj, function (v, p) {
        refs.push(p);
        if (isObject(v)) {
            var f = allRefs(v);
            each(f, function (pp) {
                refs.push(p + '.' + pp);
            });
        }
    });
    return refs;
};

var hasRef = function (root, refPath) {
    var v = root;
    var paths = refPath.split('.');
    while (paths.length) {
        var p = paths.shift();
        if (!hasProperty(v, p)) return false;
        v = v[p];
    }
    return true;
};

var seekTarget = function (refPath, root) {
    var args = Array.prototype.slice.call(arguments, 1);
    var v;
    for (var i = 0, len = args.length; i < len; i++) {
        v = args[i];
        if (isArray(v)) {
            var r = seekTarget.apply(null, [refPath].concat(v));
            if (r) return r;
        } else {
            if (hasRef(v, refPath)) return v;
        }
    }
};

var seekTargetIndex = function (refPath, roots) {
    var index = roots.length - 1;
    each(roots, function (v, i) {
        if (hasRef(v, refPath)) {
            index = i;
            return false;
        }
    });
    return index;
};

function addEvent($el, eventName, handler, useCapture) {
    if ($el.addEventListener) {
        $el.addEventListener(eventName, handler, !!useCapture);
    } else {
        if (eventName === 'input') {
            eventName = 'propertychange';
        }
        $el.attachEvent('on' + eventName, handler);
    }
}

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

var GlobalNamespace = '_DMD_';
if (typeof window$1 !== 'object') var window$1 = {};
window$1[GlobalNamespace] = window$1[GlobalNamespace] || {};
var Store = window$1[GlobalNamespace]['Store'] = window$1[GlobalNamespace]['Store'] || {};
var Dnstreams = window$1[GlobalNamespace]['Dnstreams'] = window$1[GlobalNamespace]['Dnstreams'] || {};
var ResultsIn = window$1[GlobalNamespace]['ResultsIn'] = window$1[GlobalNamespace]['ResultsIn'] || {};
var Upstreams = window$1[GlobalNamespace]['Upstreams'] = window$1[GlobalNamespace]['Upstreams'] || {};
var ResultsFrom = window$1[GlobalNamespace]['ResultsFrom'] = window$1[GlobalNamespace]['ResultsFrom'] || {};
var Laziness = window$1[GlobalNamespace]['Laziness'] = window$1[GlobalNamespace]['Laziness'] || {};
var PropKernelTable = window$1[GlobalNamespace]['PropKernelTable'] = window$1[GlobalNamespace]['PropKernelTable'] || {};
var KernelStatus = window$1[GlobalNamespace]['KernelStatus'] = window$1[GlobalNamespace]['KernelStatus'] || {};
var GetterSetter = window$1[GlobalNamespace]['GetterSetter'] = window$1[GlobalNamespace]['GetterSetter'] || {};
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

    if (proppath === false) return;

    proppath = proppath || fullpathOf(prop, target);
    if (!GetterSetter[proppath] && ('get' in desc || 'set' in desc)) GetterSetter[proppath] = {};
    if ('get' in desc) {
        GetterSetter[proppath].get = desc.get;
    }
    if ('set' in desc) {
        GetterSetter[proppath].set = desc.set;
    }
}

function joinPath(root, path) {
    if (!path || path === '') return root;
    if (!root || root === '') return path;
    return root + '.' + path;
}

function splitPath(path) {
    return path
        .replace(/"([0-9a-zA-Z$_]+)"/mg, function (p0, p1) { return p1; })
        .replace(/'([0-9a-zA-Z$_]+)'/mg, function (p0, p1) { return p1; })
        .replace(/\[([0-9a-zA-Z$_]+)\]/mg, function (p0, p1) { return '.' + p1; })
        .split('.');
}

function fullpathOf(ref, root) {
    if (root === undefined) return ref;
    var pre = register(root);
    if (pre == null) return ref || '';
    return joinPath(pre, ref);
}

function register(root) {
    if (root === Store || (!isObject(root) && !isNode(root))) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + uid();
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
            if (isObject(a)) return joinPath(register(a.root), a.alias);
            if (isString(a)) return joinPath(register(root), a);
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
    if (typeof path === 'string') {
        path = splitPath(path).join('.');
    }
    var obj = {};
    var value;
    obj = scopeOf(path, root);
    if (obj == null) return;
    value = obj.target[obj.property];

    var proppath;
    if (!obj.target['__proppath']) {
        defineProperty(obj.target, '__proppath', {
            value: joinPath(register(root), splitPath(path).slice(0, -1).join('.'))
        });
        proppath = joinPath(register(root), path);
    } else {
        proppath = joinPath(obj.target['__proppath'], obj.property);
    }

    var __kid = proppath + '#' + propKernelOrder(proppath);
    defineProperty(this, '__kid', {
        value: __kid
    }, false);
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
                        root,
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
    // var proppath = fullpathOf(null, root);
    var paths = [];
    if (refPath) paths = splitPath(refPath);
    var parent;
    var prop;

    while (paths.length) {
        if (ensurePathValid && v == null) {
            parent[prop] = {};
        } else if (isBasic(v)) {
            return undefined;
        }
        prop = paths.shift();
        // proppath += (proppath === '' ? '' : '.') + prop;
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

/**
 * Default configurations.
 * @type {Object}
 */
var conf$1 = {
    attrPrefix: 'm-',
    refBeginsWithDollar: true,
    attrsFlag: 'attrs.'
};

/**
 * DOM attribute names to bind.
 */
var domProp = {
    'value': 'value',
    'checked': 'checked',
    'innertext': 'innerText',
    'innerhtml': 'innerHTML',
    'class': 'className',
    'style': 'style.cssText'
};

/**
 * Regular expressions.
 */
var Regs = {
    each11: /^\s*(\$([a-zA-Z$_][0-9a-zA-Z$_]*))\s+in\s+(\$([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*)\s*$/,
    each12: /^\s*\(\s*(\$([a-zA-Z$_][0-9a-zA-Z$_]*))\s*,\s*(\$([a-zA-Z$_][0-9a-zA-Z$_]*))\s*\)\s+in\s+(\$([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*)\s*$/,
    each21: /^\s*(([a-zA-Z$_][0-9a-zA-Z$_]*))\s+in\s+(([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*)\s*$/,
    each22: /^\s*\(\s*(([a-zA-Z$_][0-9a-zA-Z$_]*))\s*,\s*(([a-zA-Z$_][0-9a-zA-Z$_]*))\s*\)\s+in\s+(([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*)\s*$/
};

/**
 * Execute a function with a data object as the scope.
 * @param {String} expr 
 * @param {Array} refs 
 * @param {*} target 
 * @return {*}
 */
function executeFunctionWithScope(expr, refs, target) {
    if (conf$1.refBeginsWithDollar) {
        expr = expr.replace(/(\$[a-zA-Z$_][0-9a-zA-Z$_]*)\s*=[^=]/g, function (match, p1) {
            return match.replace(p1, 'this.' + p1.substr(1));
        });
    }

    if (isArray(refs)) {
        if (!target) target = refs[refs.length - 1];
    } else {
        refs = [refs];
        if (!target) target = refs[0];
    }

    var ref = {};
    each(refs, function (r) {
        each(r, function (v, p) {
            if (p in ref) return;
            if (isFunction(v)) {
                ref[p] = v.bind(target);
            } else {
                ref[p] = v;
            }
        });
    });

    var params = Object.keys(ref);
    if (conf$1.refBeginsWithDollar) {
        params = params.map(function (r) {
            return '$' + r;
        });
    }
    var args = Object.values(ref);
    // Util.each(args, function (v, i) {
    //     if (Util.isFunction(v)) {
    //         args[i] = v.bind(ref);
    //     }
    // });
    return (new Function(params.join(','), 'return (' + expr + ')')).apply(target, args);
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Array} refs 
 * @return {*}
 */
function evaluateExpression(expr, refs) {
    expr = replaceTmplInStrLiteral(expr);
    var result = null;
    try {
        result = executeFunctionWithScope(expr, refs);
    } catch (e) {}
    return result;
}

/**
 * Fix template strings in a string literal to JavaScript string-concat expressions.
 * @param {String} str 
 * @return {String}
 * @example "'My name is {{name}}.'" => "'My name is ' + (name) + '.'"
 */
function replaceTmplInStrLiteral(str) {
    var reg = /{{([^{}]*)}}/g;
    return str.replace(reg, function (match, p1) {
        return '\' + (' + p1 + ') + \'';
    });
}

/**
 * Evaluate a raw text with template expressions.
 * @param {String} text 
 * @param {Array} refs 
 * @return {String}
 * @example ('My name is {{$name}}.', { name: 'Tom' }) => 'My name is Tom.'
 */
function evaluateRawTextWithTmpl(text, refs) {
    var reg = /{{([^{}]*)}}/g;
    var result = text.replace(reg, function (match, p1) {
        var result = null;
        try {
            result = executeFunctionWithScope(p1, refs);
        } catch (e) {}
        return result;
    });
    return result;
}

/**
 * Parse reference paths from an expression string.
 * @param {String} expr 
 * @return {Array<String>}
 */
function parseRefsInExpr(expr) {
    expr = ';' + expr + ';';
    var reg;
    var transformNum = function (r) {
        return r.replace(/\.([0-9]+)([^0-9a-zA-Z$_]?)/g, function (p0, p1, p2) {
            return '[' + p1 + ']' + p2;
        });
    };
    if (conf$1.refBeginsWithDollar) {
        expr = expr.replace(/([^a-zA-Z0-9$_.])this\./mg, function (p0, p1) { return p1 + '$'; });
        reg = /\$([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return (expr.match(reg) || []).map(function (r) {
            return r.substr(1);
        }).map(transformNum);
    } else {
        expr = expr.replace(/([^a-zA-Z0-9$_.])this\./mg, function (p0, p1) { return p1; });
        reg = /([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[0-9a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return (expr.match(reg) || []).map(transformNum);
    }
}

/**
 * Parse `each` template expression from an attribute value string.
 * @param {String} expr 
 * @param {Array} refs
 * @return {Object}
 */
function parseEachExpr(expr, refs) {
    var valStr;
    var keyStr;
    var targetStr;
    var r;
    if (conf$1.refBeginsWithDollar) {
        r = Regs.each12.exec(expr);
        if (r) {
            valStr = r[1].substr(1);
            keyStr = r[3].substr(1);
            targetStr = r[5].substr(1);
        } else {
            r = Regs.each11.exec(expr);
            valStr = r[1].substr(1);
            targetStr = r[3].substr(1);
        }
    } else {
        r = Regs.each22.exec(expr);
        if (r) {
            valStr = r[1];
            keyStr = r[3];
            targetStr = r[5];
        } else {
            r = Regs.each21.exec(expr);
            valStr = r[1];
            targetStr = r[3];
        }
    }
    var root = seekTarget(targetStr, refs);
    var value = Data(root, targetStr);
    if (!(value instanceof OArray)) {
        value = new OArray(value);
        Data(root, targetStr, value);
    }
    return {
        target: value,
        targetRef: targetStr,
        iterator: {
            val: valStr,
            key: keyStr
        }
    };
}

/**
 * Parse template expression strings from a raw text such as a text node value.
 * @param {String} text     [description]
 * @return {Array<String>}  [description]
 * @example 'My name is {{$name}}. I\'m {{$age}} years old.' => ['$name', '$age']
 */
function parseExprsInRawText(text) {
    var reg = /{{([^{}]*)}}/g;
    var exprs = [];
    text.replace(reg, function (match, p1) {
        exprs.push(p1);
        return '';
    });
    return exprs;
}

/**
 * Get relations from an expression string to the data, and apply in time as well.
 * @param {String}      expr 
 * @param {Array}       refs 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, refs, target, proppath, resultFrom) {
    if (!isArray(refs)) refs = [refs];

    function getAllRefs(expr, refs) {
        var refsInExpr = parseRefsInExpr(expr);
        var subData = {};
        each(refsInExpr, function (r) {
            var i = seekTargetIndex(r, refs);
            if (!subData[i]) subData[i] = {};
            subData[i][r] = Data(refs[i], r);
        });
        var re = [];
        each(subData, function (s, i) {
            re.push({
                target: refs[i],
                refs: allRefs(s)
            });
        });
        return re;
    }

    var targetIsNode = isNode(target);
    var resultIn = function () {
        var result = (resultFrom || function () {
            return evaluateExpression(expr, refs);
        })();

        /* Transformation */
        if (targetIsNode && proppath === 'className') {
            var classList = [];
            if (isObject(result)) {
                each(result, function (v, p) {
                    v && classList.push(p);
                });
            } else if (isArray(result)) {
                each(result, function (v) {
                    if (isString(v)) classList.push(v);
                    else if (isObject(v)) {
                        each(v, function (vv, pp) {
                            vv && classList.push(pp);
                        });
                    }
                });
            }
            result = classList.join(' ');
        } else if (targetIsNode && proppath === 'style.cssText') {
            var stylePairs = [];
            if (isObject(result)) {
                each(result, function (v, p) {
                    stylePairs.push(p + ':' + v);
                });
            }
            result = stylePairs.join(';');
        }

        if (targetIsNode && proppath.startsWith(conf$1.attrsFlag)) {
            if (result != null) {
                var attrName = proppath.substr(conf$1.attrsFlag.length);
                target.setAttribute(attrName, result);
            }
        } else {
            Data(target, proppath, result);
        }
    };

    var r = getAllRefs(expr, refs).map(function (a) {
        return {
            target: a.target,
            relations: (function () {
                var r = {};
                a.refs.forEach(function (refpath) {
                    r[refpath] = {
                        resultIn: resultIn
                    };
                });
                return r;
            })()
        };
    });
    resultIn();
    return r;
}

/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    domBoundFlag: '__dmd_bound',
    domListKey: '__dmd_key'
};

var domValueToBind = {
    'input': 'input',
    'select': 'change'
};

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @param  {Array} ext                  [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref, ext) {
    if (!isNode($el) || !isObject(ref)) return null;
    ext = ext ? (isArray(ext) ? ext : [ext]) : []; /* Ensure `ext` is an array */
    var scopes = ext.concat(ref);

    var nodeName = $el.nodeName.toLowerCase();

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */

        /* Bind a list */
        if ($el.hasAttribute(conf$1.attrPrefix + 'each')) {
            var eachAttrName = conf$1.attrPrefix + 'each';
            var eachExprText = $el.getAttribute(eachAttrName);
            var eachExpr = parseEachExpr(eachExprText, ref);
            $el.removeAttribute(eachAttrName);
            var $parent = $el.parentNode;
            // $parent.removeChild($el);
            $parent.innerHTML = '';

            var $targetList = eachExpr.target;

            function bindItem(v, k) {
                var $copy = $el.cloneNode(true);
                var _ext = {};
                _ext[eachExpr.iterator.val] = v;
                if (eachExpr.iterator.key) _ext[eachExpr.iterator.key] = k;
                Bind($copy, ref, [_ext].concat(ext));

                $targetList.on({
                    set: function (oval, nval, i, arr) {
                        if (i == k) {
                            console.log('set', i, nval);
                            _ext[eachExpr.iterator.val] = nval;
                        }
                    },
                    // push: function (v) {},
                    unshift: function (v) {
                        k++;
                        _ext[eachExpr.iterator.key] = k;
                    },
                    // pop: function () {},
                    shift: function () {
                        if (k > 0) {
                            k--;
                            _ext[eachExpr.iterator.key] = k;
                        }
                    },
                    splice: function (startIndex, howManyToDelete, itemToInsert) {
                        if (howManyToDelete) {
                            if (k >= startIndex + howManyToDelete) {
                                k -= howManyToDelete;
                                _ext[eachExpr.iterator.key] = k;
                            }
                        } else {
                            var howManyItemsToInsert = Array.prototype.slice.call(arguments, 2).length;
                            if (k >= startIndex) {
                                k += howManyItemsToInsert;
                                _ext[eachExpr.iterator.key] = k;
                            }
                        }
                    }
                });

                return $copy;
            }

            each($targetList, function (v, i) {
                $parent.appendChild(bindItem(v, i));
            });

            $targetList.on({
                // set: function (oval, nval, i, arr) {},
                resize: function () {
                    if ($parent.nodeName.toLowerCase() === 'select') {
                        $parent.dispatchEvent(new Event('change'));
                    }
                },
                push: function (v) {
                    $parent.appendChild(bindItem(v, $targetList.length - 1));
                },
                unshift: function (v) {
                    $parent.insertBefore(bindItem(v, 0), $parent.childNodes[0]);
                },
                pop: function () {
                    $parent.removeChild($parent.lastChild);
                },
                shift: function () {
                    $parent.removeChild($parent.firstChild);
                },
                splice: function (startIndex, howManyToDelete, itemToInsert) {
                    if (howManyToDelete) {
                        for (; howManyToDelete > 0; howManyToDelete--) {
                            $parent.removeChild($parent.childNodes[startIndex]);
                        }
                    } else {
                        var itemsToInsert = Array.prototype.slice.call(arguments, 2);
                        each(itemsToInsert, function (v, i) {
                            $parent.insertBefore(bindItem(v, startIndex + i), $parent.childNodes[startIndex + i]);
                        });
                    }
                }
            });

            return;
        }

        /* Bind child nodes recursively */
        each($el, function (node) {
            Bind(node, ref, ext);
        });

        /* Bind attributes */
        var attrList = [];
        each($el.attributes, function (value, name) {
            if (!name.startsWith(conf$1.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(conf$1.attrPrefix.length).toLowerCase();

            var eventName = isEventName(name);
            if (eventName) { /* Event */
                addEvent($el, eventName, function (e) {
                    executeFunctionWithScope(value, [{
                        e: e
                    }].concat(scopes));
                }, true);
                return;
            }

            if (domValueToBind[nodeName] && name === 'value') { /* Two-way binding */
                var valueProp = conf$1.refBeginsWithDollar ? value.substr(1) : value;
                var valueTarget = seekTarget(valueProp, ext, ref);
                addEvent($el, domValueToBind[nodeName], function (e) {
                    console.log('input change');
                    Data(valueTarget, valueProp, this.value);
                }, false);
            }

            if (domProp[name]) name = domProp[name];
            else name = conf$1.attrsFlag + name; /* Attribute */

            /* Binding */
            var allrel = relationFromExprToRef(value, scopes, $el, name);
            allrel.forEach(function (a) {
                Relate(a.target, a.relations);
            });
        });

        /* Clean attributes */
        each(attrList, function (name) {
            $el.removeAttribute(name);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var tmpl = $el.nodeValue;
        var expr = parseExprsInRawText(tmpl).join(';');
        if (expr === '') return null;

        /* Binding */
        var allrel;
        var $targetEl = $el;
        var targetRef = 'nodeValue';
        if ($el.parentNode.nodeName.toLowerCase() === 'textarea') {
            $targetEl = $el.parentNode;
            targetRef = 'value';
        }
        allrel = relationFromExprToRef(expr, scopes, $targetEl, targetRef, function () {
            return evaluateRawTextWithTmpl(tmpl, scopes);
        });
        allrel.forEach(function (a) {
            Relate(a.target, a.relations);
        });
    }

    return $el;
}

/**
 * Constructor.
 * @param {*} $el   [description]
 * @param {*} ref   [description]
 */
var DMD = function ($el, ref) {
    if (isString($el)) {
        $el = window.document.querySelector($el);
    }
    if (isString(ref) && arguments.length > 2) {
        var html = ref;
        ref = arguments[2];

        var frag = document.createDocumentFragment();
        var div = document.createElement('div');
        div.innerHTML = html;

        while (div.childNodes.length > 0) {
            Bind.call(this, div.childNodes[0], ref);
            frag.appendChild(div.childNodes[0]);
        }
        $el.appendChild(frag);
    } else {
        Bind.call(this, $el, ref);
    }
};

DMD.kernel = Kernel;
DMD.relate = Relate;
DMD.$ = Data;

return DMD;

})));
//# sourceMappingURL=domod.js.map
