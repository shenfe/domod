var gid = (function () {
    var n = 0;
    return function () {
        return n++;
    };
})();

var isBoolean = function (v) {
    return typeof v === 'boolean';
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
    return v != null && Object.prototype.toString.call(v) === '[object Object]';
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

var isInstance = function (v, creator) {
    return typeof creator === 'function' && v instanceof creator;
};

var isDirectInstance = function (v, creator) {
    return v.constructor === creator;
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

var isCSSSelector = function (v) {
    return v.indexOf(' ') > 0 || v.indexOf('.') >= 0
        || v.indexOf('[') >= 0 || v.indexOf('#') >= 0;
};

var each = function (v, func, arrayReverse) {
    var i;
    var len;
    if (isObject(v)) {
        for (var p in v) {
            if (!v.hasOwnProperty(p)) continue;
            if (func(v[p], p) === false) break;
        }
    } else if (isArray(v)) {
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
    } else if (v && isFunction(v.forEach)) {
        v.forEach(func);
    }
};

var eachIndexOf = function (str, pat) {
    var p0 = 0;
    var p1;
    var len = str.length;
    var r = [];
    while (p0 < len) {
        p1 = str.indexOf(pat, p0);
        if (p1 < len) {
            r.push(p1);
            p0 = p1 + pat.length;
        }
    }
    return r;
};

var eachUnique = function (arr, func) {
    if (!isArray(arr)) return;
    var map = {};
    for (var i = 0, len = arr.length; i < len; i++) {
        if (!isNumber(arr[i]) || !isString(arr[i]) || map[arr[i]]) continue;
        map[arr[i]] = true;
        var r = func(arr[i]);
        if (r === false) break;
    }
};

var unique = function (arr) {
    var r = [];
    eachUnique(arr, function (v) {
        r.push(v);
    });
    return r;
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

var touchLeaves = function (obj) {
    each(obj, function (v, p) {
        if (isBasic(v)) {
            obj[p] = v;
        } else {
            touchLeaves(v);
        }
    });
};

var extend = function (dest, srcs, clean) {
    if (!isObject(dest)) return null;
    var args = Array.prototype.slice.call(arguments, 1,
        arguments[arguments.length - 1] === true ? (arguments.length - 1) : arguments.length);
    clean = arguments[arguments.length - 1] === true;

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

var allRefs = function (obj) {
    var refs = [];
    each(obj, function (v, p) {
        if (isObject(v)) {
            var f = allRefs(v);
            each(f, function (pp) {
                refs.push(p + '.' + pp);
            });
        } else {
            refs.push(p);
        }
    })
    return refs;
};

var refData = function (root, refPath, value) {
    var toSet = arguments.length >= 3;
    var v = root;
    var paths = [];
    if (refPath) paths = refPath.split('.');

    if (!toSet) {
        while (paths.length) {
            if (isBasic(v)) return undefined;
            v = v[paths.shift()];
        }
        return v;
    } else {
        while (paths.length) {
            if (isBasic(v)) return undefined;
            if (paths.length === 1) {
                v[paths.shift()] = value;
            } else {
                v = v[paths.shift()];
            }
        }
        return value;
    }
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
    })
    return ext;
}

export {
    gid,
    isBoolean,
    isNumber,
    isNumeric,
    isString,
    isFunction,
    isObject,
    isArray,
    isBasic,
    isInstance,
    isDirectInstance,
    isNode,
    isNamedNodeMap,
    isEventName,
    isCSSSelector,
    each,
    eachIndexOf,
    eachUnique,
    unique,
    clone,
    hasProperty,
    clear,
    shrinkArray,
    touchLeaves,
    extend,
    allRefs,
    refData,
    addEvent,
    flatten
}
