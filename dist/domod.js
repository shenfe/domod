(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.domod = {})));
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
    } else if (isFunction(v.forEach)) {
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
            each(f, function (vv, pp) {
                refs.push(p + '.' + pp);
            });
        } else {
            refs.push(p);
        }
    });
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
            v = v[path.shift()];
        }
        return v;
    } else {
        while (paths.length) {
            if (isBasic(v)) return undefined;
            if (paths.length === 1) {
                v[path.shift()] = value;
            } else {
                v = v[path.shift()];
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
            if (objectFilter(v) || !clean)
                ext[p] = v;
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

function get(ref, root) {
    if (root === undefined) root = Store;
    if ((!isObject(root) && !isNode(root)) || !isString(ref)) return null;
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
        if (!isObject(node) && !isNode(node)) return null;
    }
    return null;
}

function update(ref, root) {
    var obj = get(ref, root);
    if (!obj) return null;
    var proppath = fullpathOf(ref, root);
    if (!ResultsFrom[proppath]) return obj.target[obj.property];
    var value = ResultsFrom[proppath].f.apply(Store, ResultsFrom[proppath].deps.map(function (p) { return update(p) }));
    obj.target[obj.property] = value;
    return value;
}

function fullpathOf(ref, root) {
    if (root === undefined) return ref;
    return register(root) + '.' + ref;
}

function register(root) {
    if (!isObject(root) && !isNode(root)) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + gid();
        if (!isNode(root)) {
            Object.defineProperty(root, '__kernel_root', {
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
    var obj = get(path, root);
    if (obj == null) return;
    var proppath = register(root) + '.' + path;
    var __kid = proppath + '#' + propKernelOrder(proppath);
    Object.defineProperty(this, '__kid', {
        value: __kid
    });
    KernelStatus[this.__kid] = 1;
    var value = obj.target[obj.property];
    if (PropKernelTable[proppath] === undefined) {
        PropKernelTable[proppath] = [];
        if (hasProperty(obj.target, obj.property))
            delete obj.target[obj.property];
    }
    PropKernelTable[proppath].push(1);

    var dnstream = formatStream(relations.dnstream);
    var resultIn = relations.resultIn;
    var upstream = formatStream(relations.upstream);
    var resultFrom = relations.resultFrom;
    var lazy = !!relations.lazy;
    if (hasProperty(relations, 'value')) {
        value = relations.value;
    }
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
    if (isFunction(resultFrom)) ResultsFrom[proppath] = {
        f: resultFrom,
        k: this.__kid,
        deps: upstream
    };
    if (lazy) Laziness[proppath] = true;

    if (PropKernelTable[proppath].length === 1 && !isNode(obj.target)) {
        Object.defineProperty(obj.target, obj.property, {
            get: function () {
                if (ResultsFrom[proppath] && KernelStatus[ResultsFrom[proppath].k] !== 0) {
                    return update(proppath);
                }
                return value;
            },
            set: function (val) {
                if (val === value) return;
                value = val;
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
                        if (toUpdateDnstream && ResultsFrom[ds] && !Laziness[ds])
                            update(ds);
                    });
                }
            },
            // configurable: true,
            enumerable: true
        });
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

// import './Polyfill'
/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref) {
    if (!isNode($el) || !isObject(ref)) return;

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[DefaultConf.domBoundFlag]) {
        $el[DefaultConf.domBoundFlag] = true; /* Set a binding flag. */
        each($el.attributes, function (value, name) {
            if (!name.startsWith(DefaultConf.attrPrefix)) return;
            name = name.substr(DefaultConf.attrPrefix.length);
            switch (name) {
                case 'value':
                    addEvent($el, 'input', function (e) {
                        refData(ref, value, this.value);
                    }, false);
                    new Kernel($el, name, relationFromExprToRef(value, ref));
                    break;
                case 'innerText':
                case 'innerHTML':
                    new Kernel($el, name, relationFromExprToRef(value, ref));
                    break;
                case 'class':
                    new Kernel($el, 'className', relationFromExprToRef(value, ref, function () {
                        var re = evaluateRawTextWithTmpl(value, ref);
                        var classList = [];
                        if (isObject(re)) {
                            each(re, function (v, p) {
                                v && classList.push(p);
                            });
                        } else if (isArray(re)) {
                            each(re, function (v) {
                                if (isString(v)) classList.push(v);
                                else if (isObject(v)) {
                                    each(v, function (vv, pp) {
                                        vv && classList.push(pp);
                                    });
                                }
                            });
                        }
                        return classList.join(' ');
                    }));
                    break;
                case 'style':
                    new Kernel($el, 'style.cssText', relationFromExprToRef(value, ref, function () {
                        var re = evaluateRawTextWithTmpl(value, ref);
                        var stylePairs = [];
                        if (isObject(re)) {
                            each(re, function (v, p) {
                                stylePairs.push(p + ':' + v);
                            });
                        }
                        return stylePairs.join(';');
                    }));
                    break;
                default:
                    var eventName = isEventName(name);
                    if (eventName) { /* Event */
                        addEvent($el, eventName, function (e) {
                            new Function(['e'].concat(Object.keys(ref)).join(','), value).apply($el, Object.values(ref));
                        }, false);
                    } else { /* Attribute */
                        var resultIn = function (v) {
                            $el.setAttribute(name, new Function(Object.keys(ref).join(','), 'return ' + value).apply($el, Object.values(ref)));
                        };
                        var rels = {};
                        each(parseRefsInExpr(value), function (r) {
                            rels[r] = {
                                resultIn: resultIn
                            };
                        });
                        Relate(ref, rels);
                    }
            }
        });
        each($el, function (node) {
            Bind(node, ref);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var expr = parseExprsInRawText($el.nodeValue).join(';');
        new Kernel($el, 'nodeValue', relationFromExprToRef(expr, ref, function () {
            return evaluateRawTextWithTmpl($el.nodeValue, ref);
        }));
    }
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Object} ref 
 * @return {*}
 */
function evaluateExpression(expr, ref) {
    expr = replaceTmplInStrLiteral(expr);
    var params = Object.keys(ref);
    var args = Object.values(ref);
    each(args, function (v, i) {
        if (isFunction(v))
            args[i] = v.bind(ref);
    });
    var result = null;
    try {
        result = (new Function(params.join(','), 'return ' + expr)).apply(ref, args);
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
    var reg = /([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
    return expr.match(reg);
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
 * Get relations from an expression string to the data.
 * @param {String}      expr 
 * @param {Object}      ref 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, ref, resultFrom) {
    function getAllRefs(expr, ref) {
        var subData = {};
        each(parseRefsInExpr(expr), function (r) {
            subData[r] = refData(ref, r);
        });
        return allRefs(subData);
    }
    return {
        upstream: getAllRefs(expr, ref).map(function (alias) {
            return {
                root: ref,
                alias: alias
            };
        }),
        resultFrom: resultFrom || function () {
            return evaluateExpression(expr, ref);
        }
    };
}

/**
 * Default configurations.
 * @type {Object}
 */
var DefaultConf = {
    attrPrefix: 'm-',
    domBoundFlag: '__dmd_bound'
};

/**
 * Constructor.
 * @param {*}  
 * @param {*} ref 
 */
var DMD = function ($el, ref) {
    Bind.call(this, $el, ref);
};

exports.Kernel = Kernel;
exports.Relate = Relate;
exports.DMD = DMD;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=domod.js.map
