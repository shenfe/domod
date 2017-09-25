import * as Util from './Util'

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
var useDefineProperty = true && definePropertyFeature;

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
    if (root === Store || (!Util.isObject(root) && !Util.isNode(root))) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + Util.gid();
        if (!Util.isNode(root)) {
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
    if (Util.isObject(stream) || Util.isString(stream)) stream = [stream];
    if (Util.isArray(stream)) {
        return stream.map(function (a) {
            if (Util.isObject(a)) return register(a.root) + '.' + a.alias;
            if (Util.isString(a)) return register(root) + '.' + a;
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
        if (useDefineProperty && Util.hasProperty(obj.target, obj.property)) {
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
    ResultsIn[proppath].push(Util.isFunction(resultIn) ? resultIn : null);
    if (!Upstreams[proppath]) Upstreams[proppath] = {};
    upstream.forEach(function (p) {
        if (!Upstreams[proppath][p]) Upstreams[proppath][p] = {};
        Upstreams[proppath][p][__kid] = 1;
        if (!Dnstreams[p]) Dnstreams[p] = {};
        if (!Dnstreams[p][proppath]) Dnstreams[p][proppath] = {};
        Dnstreams[p][proppath][__kid] = 1;
    });
    if (Util.isFunction(resultFrom)) {
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
                    Util.each(Dnstreams[proppath], function (kmap, ds) {
                        var toUpdateDnstream = false;
                        Util.each(kmap, function (v, k) {
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

    if (Util.hasProperty(relations, 'value')) {
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
    if (!Util.isObject(obj)) return false;
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
    Util.each(obj, function (v, p) {
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
        if (!Util.isObject(obj)) return null;
        fr = Util.flatten(obj, isRelationDefinition, true);
    } else if (Util.isObject(relations)) {
        fr = Util.flatten(relations, isRelationDefinition, true);
    } else {
        return null;
    }
    Util.each(fr, function (rel, p) {
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
    if ((!Util.isObject(root) && !Util.isNode(root)) || !Util.isString(ref)) return null;
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
        if (Util.isBasic(v)) return undefined;
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

export { Kernel, Relate, Data }
