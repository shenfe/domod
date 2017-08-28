import * as Util from './Util'

var Store = {};
var Dnstreams = {};
var ResultsIn = {};
var Upstreams = {};
var ResultsFrom = {};

function get(ref, root) {
    if (root === undefined) root = Store;
    if (!Util.isObject(root) || !Util.isString(ref)) return null;
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
        if (!Util.isObject(node)) return null;
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
    return obj.target[obj.property];
}

function register(root) {
    if (!Util.isObject(root)) return null;
    if (!root.__kernel_root) {
        var id = 'kr_' + Util.gid();
        Object.defineProperty(root, '__kernel_root', {
            value: id
        });
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
    dnstream.forEach(function (a) {
        if (!Upstreams[a]) Upstreams[a] = {};
        Upstreams[a][alias] = true;
        if (!Dnstreams[alias]) Dnstreams[alias] = {};
        Dnstreams[alias][a] = true;
    });
    if (Util.isFunction(resultIn)) ResultsIn[alias] = resultIn;
    upstream.forEach(function (a) {
        if (!Upstreams[alias]) Upstreams[alias] = {};
        Upstreams[alias][a] = true;
        if (!Dnstreams[a]) Dnstreams[a] = {};
        Dnstreams[a][alias] = true;
    });
    if (Util.isFunction(resultFrom)) ResultsFrom[alias] = resultFrom;
    var v = obj.target[obj.property];
    if (Util.hasProperty(obj.target, obj.property)) delete obj.target[obj.property];
    Object.defineProperty(obj.target, obj.property, {
        get: function () {
            if (!ResultsFrom[alias]) return v;
            return ResultsFrom[alias].apply(Store, upstream.map(function (v) { return update(v) }));
        },
        set: function (_v) {
            if (_v === v) return;
            v = _v;
            ResultsIn[alias] && ResultsIn[alias].apply(root, [_v]);
            Object.keys(Dnstreams[alias]).forEach(function (a) {
                if (ResultsFrom[a]) update(a);
            });
        },
        enumerable: true
    });
}

Kernel.prototype.disable = function () {};
Kernel.prototype.enable = function () {};
Kernel.prototype.destroy = function () {};

function isRelationDefinition(obj) {
    if (!Util.isObject(obj)) return false;
    var r = true;
    var specProps = {
        dnstream: true,
        resultIn: true,
        upstream: true,
        resultFrom: true
    };
    Util.each(obj, function (v, p) {
        if (!specProps[p]) {
            r = false;
            return false;
        }
    });
    return r;
}

function flatten(root, onlyWantRelation) {
    var ext = {};
    Util.each(root, function (v, p) {
        if (Util.isObject(v) && !isRelationDefinition(v)) {
            var f = flatten(v, onlyWantRelation);
            Util.each(f, function (vv, pp) {
                ext[p + '.' + pp] = vv;
            });
        } else {
            if (!onlyWantRelation || isRelationDefinition(v))
                ext[p] = v;
        }
    })
    return ext;
}

function Relate(obj, relations) {
    var fr;
    if (arguments.length === 1) {
        if (!Util.isObject(obj)) return null;
        fr = flatten(obj, true);
    } else if (Util.isObject(relations)) {
        fr = flatten(relations, true);
    } else {
        return null;
    }
    Util.each(fr, function (rel, alias) {
        new Kernel(obj, alias, rel);
    });
}

export { Kernel, Relate }
