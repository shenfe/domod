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
 * @param {Object} root                             [description]
 * @param {String} alias                            [description]
 * @param {Object} relations                        [description]
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
        Upstreams[a][alias] = true;
        Dnstreams[alias][a] = true;
    });
    if (Util.isFunction(resultIn)) ResultsIn[alias] = resultIn;
    upstream.forEach(function (a) {
        Upstreams[alias][a] = true;
        Dnstreams[a][alias] = true;
    });
    if (Util.isFunction(resultFrom)) ResultsFrom[alias] = resultFrom;
    var v = obj.target[obj.property];
    if (Util.hasProperty(obj.target, obj.property)) delete obj.target[obj.property];
    Object.defineProperty(obj.target, obj.property, {
        get: function () {
            if (!ResultsFrom[alias]) return v;
            return ResultsFrom[alias].apply(Store, upstream.map(get));
        },
        set: function (_v) {
            if (_v === v) return;
            v = _v;
            ResultsIn[alias] && ResultsIn[alias].apply(root, [_v]);
            dnstream.forEach(function (a) {
                if (ResultsFrom[a]) set(a, get(a));
            });
        },
        enumerable: true
    });
}

Kernel.prototype.disable = function () {};
Kernel.prototype.enable = function () {};
Kernel.prototype.destroy = function () {};

export default Kernel
