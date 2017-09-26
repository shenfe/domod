(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.DMD = factory());
}(this, (function () { 'use strict';

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

var hasProperty = function (val, p) {
    if (isObject(val)) {
        return val.hasOwnProperty(p);
    } else if (isArray(val)) {
        var n = parseInt(p);
        return isNumeric(p) && val.length > n && n >= 0;
    }
    return false;
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
    });
    return refs;
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

var Store = {};
var Dnstreams = {};
var ResultsIn = {};
var Upstreams = {};
var ResultsFrom = {};
var Laziness = {};
var PropKernelTable = {};
var KernelStatus = {};
var GetterSetter = {};

var definePropertyFeature = !!Object.defineProperty;
var useDefineProperty = false && definePropertyFeature;

function defineProperty(target, prop, desc, proppath) {
    if (useDefineProperty) {
        Object.defineProperty(target, prop, desc);
    } else {
        if ('value' in desc) {
            target[prop] = desc.value;
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
        if (!isNode(root)) {
            defineProperty(root, '__kernel_root', {
                value: id
            });
        } else {
            root.__kernel_root = id;
        }
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
    if (useDefineProperty) {
        obj = scopeOf(path, root);
        if (obj == null) return;
        value = obj.target[obj.property];
    }

    var proppath = register(root) + '.' + path;
    var __kid = proppath + '#' + propKernelOrder(proppath);
    defineProperty(this, '__kid', {
        value: __kid
    });
    KernelStatus[this.__kid] = 1;
    if (PropKernelTable[proppath] === undefined) {
        PropKernelTable[proppath] = [];
        if (useDefineProperty && hasProperty(obj.target, obj.property)) {
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
            get: function (target, property) {
                if (ResultsFrom[proppath] && KernelStatus[ResultsFrom[proppath].k] !== 0) {
                    var v = ResultsFrom[proppath].f.apply(
                        null,
                        ResultsFrom[proppath].deps.map(function (p) { return Data(null, p); })
                    );
                    Data(null, proppath, v);
                    value = v;
                } else {
                    if (!useDefineProperty) {
                        if (property !== undefined) {
                            value = target[property];
                        } else {
                            obj = scopeOf(proppath);
                            value = obj.target[obj.property];
                        }
                    }
                }
                return value;
            },
            set: function (val, target, property) {
                if (val === value) return;
                value = val;
                if (!useDefineProperty) {
                    if (property !== undefined) {
                        target[property] = val;
                    } else {
                        obj = scopeOf(proppath);
                        obj.target[obj.property] = val;
                    }
                }
                ResultsIn[proppath] && ResultsIn[proppath].forEach(function (f, k) {
                    f && (KernelStatus[proppath + '#' + k] !== 0) && f.apply(root, [val]);
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
Kernel.prototype.destroy = function () {
    // TODO
};

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
    return {
        target: Data(null, fullpath.substring(0, lastDot)),
        property: fullpath.substring(lastDot + 1)
    };
}

/**
 * Get or set data, and trigger getters or setters.
 */
function Data(root, refPath, value) {
    root = root || Store;
    var toSet = arguments.length >= 3;
    var v = root;
    var proppath = fullpathOf(null, root);
    var paths = [];
    if (refPath) paths = refPath.split('.');
    var p;

    while (paths.length) {
        if (isBasic(v)) return undefined;
        p = paths.shift();
        proppath += (proppath === '' ? '' : '.') + p;
        if (toSet && paths.length === 0) { /* set */
            if (!useDefineProperty && GetterSetter[proppath] && GetterSetter[proppath].set) {
                GetterSetter[proppath].set(value, v, p);
            }
            v[p] = value;
        } else { /* get */
            if (!useDefineProperty && GetterSetter[proppath] && GetterSetter[proppath].get) {
                v = GetterSetter[proppath].get(v, p);
            } else {
                v = v[p];
            }
        }
    }
    return toSet ? value : v;
}

/**
 * Default configurations.
 * @type {Object}
 */
var conf$1 = {
    refBeginsWithDollar: true,
    attrsFlag: 'attrs.'
};

/**
 * Execute a function with a data object as the scope.
 * @param {String} expr 
 * @param {Object} ref 
 * @param {*} target 
 */
function executeFunctionWithScope(expr, ref, target) {
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
    return (new Function(params.join(','), 'return (' + expr + ')')).apply(target || ref, args);
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Object} ref 
 * @return {*}
 */
function evaluateExpression(expr, ref) {
    expr = replaceTmplInStrLiteral(expr);
    var result = null;
    try {
        result = executeFunctionWithScope(expr, ref);
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
 * @param {Object} ref 
 * @return {String}
 * @example ('My name is {{name}}.', { name: 'Tom' }) => 'My name is Tom.'
 */
function evaluateRawTextWithTmpl(text, ref) {
    var reg = /{{([^{}]*)}}/g;
    var result = text.replace(reg, function (match, p1) {
        return evaluateExpression(p1, ref);
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
    if (conf$1.refBeginsWithDollar) {
        reg = /\$([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return expr.match(reg).map(function (r) {
            return r.substr(1);
        });
    } else {
        reg = /([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return expr.match(reg);
    }
}

/**
 * Parse template expression strings from a raw text such as a text node value.
 * @param {String} text     [description]
 * @return {Array<String>}  [description]
 * @example 'My name is {{name}}. I\'m {{age}} years old.' => ['name', 'age']
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
 * @param {Object}      ref 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, ref, target, proppath, resultFrom) {
    function getAllRefs(expr, ref) {
        var subData = {};
        each(parseRefsInExpr(expr), function (r) {
            subData[r] = Data(ref, r);
        });
        return allRefs(subData);
    }
    var targetIsNode = isNode(target);
    var resultIn = function () {
        var result = (resultFrom || function () {
            return evaluateExpression(expr, ref);
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
    var r = {};
    var ar = getAllRefs(expr, ref);
    ar.forEach(function (ref) {
        r[ref] = {
            resultIn: resultIn
        };
    });
    resultIn();
    return r;
}

// import './Polyfill'
/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    attrPrefix: 'm-',
    domBoundFlag: '__dmd_bound'
};

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref) {
    if (!isNode($el) || !isObject(ref)) return;

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */
        var attrList = [];
        each($el.attributes, function (value, name) {
            if (!name.startsWith(conf.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(conf.attrPrefix.length).toLowerCase();
            switch (name) {
            case 'value':
                addEvent($el, 'input', function (e) {
                    Data(ref, conf$1.refBeginsWithDollar ? value.substr(1) : value, this.value);
                }, false);
                Relate(ref, relationFromExprToRef(value, ref, $el, name));
                break;
            case 'innertext':
            case 'innerhtml':
                Relate(ref, relationFromExprToRef(value, ref, $el, (name === 'innertext') ? 'innerText' : 'innerHTML'));
                break;
            case 'class':
                Relate(ref, relationFromExprToRef(value, ref, $el, 'className'));
                break;
            case 'style':
                Relate(ref, relationFromExprToRef(value, ref, $el, 'style.cssText'));
                break;
            case 'each':
                // TODO
                break;
            default:
                var eventName = isEventName(name);
                if (eventName) { /* Event */
                    addEvent($el, eventName, function (e) {
                        executeFunctionWithScope(value, ref, $el);
                    }, false);
                } else { /* Attribute */
                    Relate(ref, relationFromExprToRef(value, ref, $el, conf$1.attrsFlag + name));
                }
            }
        });
        each(attrList, function (name) {
            $el.removeAttribute(name);
        });
        each($el, function (node) {
            Bind(node, ref);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var tmpl = $el.nodeValue;
        var expr = parseExprsInRawText(tmpl).join(';');
        if (expr === '') return;
        Relate(ref, relationFromExprToRef(expr, ref, $el, 'nodeValue', function () {
            return evaluateRawTextWithTmpl(tmpl, ref);
        }));
    }
}

/**
 * Constructor.
 * @param {*}  
 * @param {*} ref 
 */
var DMD = function ($el, ref) {
    Bind.call(this, $el, ref);
};

DMD.kernel = Kernel;
DMD.relate = Relate;
DMD.$ = Data;

return DMD;

})));
//# sourceMappingURL=domod.js.map
