import * as Util from './Util'

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
    if ((!Util.isObject(root) && !Util.isNode(root)) || !Util.isString(ref)) return null;
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
        if (!Util.isObject(node) && !Util.isNode(node)) return null;
    }
    return null;
}

function set(ref, val, root) {
    var obj = get(ref, root);
    if (obj) obj.target[obj.property] = val;
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
    if (!Util.isObject(root) && !Util.isNode(root)) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + Util.gid();
        if (!Util.isNode(root)) {
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
        if (Util.hasProperty(obj.target, obj.property))
            delete obj.target[obj.property];
    }
    PropKernelTable[proppath].push(1);

    var dnstream = formatStream(relations.dnstream);
    var resultIn = relations.resultIn;
    var upstream = formatStream(relations.upstream);
    var resultFrom = relations.resultFrom;
    var lazy = !!relations.lazy;
    if (Util.hasProperty(relations, 'value')) {
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
    ResultsIn[proppath].push(Util.isFunction(resultIn) ? resultIn : null);
    if (!Upstreams[proppath]) Upstreams[proppath] = {};
    upstream.forEach(function (p) {
        if (!Upstreams[proppath][p]) Upstreams[proppath][p] = {};
        Upstreams[proppath][p][__kid] = 1;
        if (!Dnstreams[p]) Dnstreams[p] = {};
        if (!Dnstreams[p][proppath]) Dnstreams[p][proppath] = {};
        Dnstreams[p][proppath][__kid] = 1;
    });
    if (Util.isFunction(resultFrom)) ResultsFrom[proppath] = {
        f: resultFrom,
        k: this.__kid,
        deps: upstream
    };
    if (lazy) Laziness[proppath] = true;

    if (PropKernelTable[proppath].length === 1) {
        if (!Util.isNode(obj.target)) {
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
                        Util.each(Dnstreams[proppath], function (kmap, ds) {
                            var toUpdateDnstream = false;
                            Util.each(kmap, function (v, k) {
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
            obj.target[obj.property];
            // obj.target[obj.property] = obj.target[obj.property];
        } else {
            if (Util.isFunction(resultFrom))
                obj.target[obj.property] = resultFrom();
        }
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

export { Kernel, Relate }
