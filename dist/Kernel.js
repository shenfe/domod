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

var hasProperty = function (val, p) {
    if (isObject(val)) {
        return val.hasOwnProperty(p);
    } else if (isArray(val)) {
        var n = parseInt(p);
        return isNumeric(p) && val.length > n && n >= 0;
    }
    return false;
};

var Store = {};
var Dnstreams = {};
var ResultsIn = {};
var Upstreams = {};
var ResultsFrom = {};
var Laziness = {};

function get(ref, root) {
    if (root === undefined) root = Store;
    if (!isObject(root) || !isString(ref)) return null;
    var node = root;
    var refs = ref.split('.');
    while (refs.length >= 1) {
        if (refs.length === 1) {
            return {
                target: node,
                property: refs[0]
            };
        }
        node = node[refs.shift()];
        if (!isObject(node)) return null;
    }
    return null;
}

function update(ref, root) {
    var obj = get(ref, root);
    if (!obj) return null;
    return obj.target[obj.property];
}

function register(root) {
    if (!isObject(root)) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + gid();
        Object.defineProperty(root, '__kernel_root', {
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
    } else {
        return [];
    }
}

/**
 * Kernel constructor function.
 * @constructor
 */
function Kernel(root, alias, relations) {
    var obj = get(alias, root);
    if (obj == null) return;
    alias = register(root) + '.' + alias;
    Object.defineProperty(this, '__alias', {
        value: alias
    });
    var dnstream = formatStream(relations.dnstream);
    var resultIn = relations.resultIn;
    var upstream = formatStream(relations.upstream);
    var resultFrom = relations.resultFrom;
    var lazy = !!relations.lazy;
    dnstream.forEach(function (a) {
        if (!Upstreams[a]) Upstreams[a] = {};
        Upstreams[a][alias] = true;
        if (!Dnstreams[alias]) Dnstreams[alias] = {};
        Dnstreams[alias][a] = true;
    });
    if (isFunction(resultIn)) ResultsIn[alias] = resultIn;
    upstream.forEach(function (a) {
        if (!Upstreams[alias]) Upstreams[alias] = {};
        Upstreams[alias][a] = true;
        if (!Dnstreams[a]) Dnstreams[a] = {};
        Dnstreams[a][alias] = true;
    });
    if (isFunction(resultFrom)) ResultsFrom[alias] = resultFrom;
    if (lazy) Laziness[alias] = true;

    var v = obj.target[obj.property];
    if (hasProperty(obj.target, obj.property)) delete obj.target[obj.property];
    Object.defineProperty(obj.target, obj.property, {
        get: function () {
            if (!ResultsFrom[alias]) return v;
            return ResultsFrom[alias].apply(Store, upstream.map(function (v) { return update(v) }));
        },
        set: function (_v) {
            if (_v === v) return;
            v = _v;
            ResultsIn[alias] && ResultsIn[alias].apply(root, [_v]);
            Dnstreams[alias] && Object.keys(Dnstreams[alias]).forEach(function (a) {
                if (ResultsFrom[a] && !Laziness[a]) update(a);
            });
        },
        enumerable: true
    });
}

Kernel.prototype.disable = function () {};
Kernel.prototype.enable = function () {};
Kernel.prototype.destroy = function () {};

function isRelationDefinition(obj) {
    if (!isObject(obj)) return false;
    var r = true;
    var specProps = {
        dnstream: true,
        resultIn: true,
        upstream: true,
        resultFrom: true,
        lazy: true
    };
    each(obj, function (v, p) {
        if (!specProps[p]) {
            r = false;
            return false;
        }
    });
    return r;
}

function flatten(root, onlyWantRelation) {
    var ext = {};
    each(root, function (v, p) {
        if (isObject(v) && !isRelationDefinition(v)) {
            var f = flatten(v, onlyWantRelation);
            each(f, function (vv, pp) {
                ext[p + '.' + pp] = vv;
            });
        } else {
            if (!onlyWantRelation || isRelationDefinition(v))
                ext[p] = v;
        }
    });
    return ext;
}

function Relate(obj, relations) {
    var fr;
    if (arguments.length === 1) {
        if (!isObject(obj)) return null;
        fr = flatten(obj, true);
    } else if (isObject(relations)) {
        fr = flatten(relations, true);
    } else {
        return null;
    }
    each(fr, function (rel, alias) {
        new Kernel(obj, alias, rel);
    });

    return obj;
}

exports.Kernel = Kernel;
exports.Relate = Relate;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=Kernel.js.map
