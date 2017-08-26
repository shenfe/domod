import * as Util from './Util'

function get(root, ref) {
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
function set(root, ref, val) {
    var obj = get(root, ref);
    if (obj) obj.target[obj.property] = val;
}

var Dnstreams = {};
var ResultsIn = {};
var Upstreams = {};
var ResultsFrom = {};

/**
 * Kernel constructor function.
 * @param {Object} root                             [description]
 * @param {String} alias                            [description]
 * @param {any} value                               [description]
 * @param {Object} relations                        [description]
 * @constructor
 */
function Kernel(root, alias, value, relations) {
    var obj = get(root, alias);
    if (obj == null) return;
    Object.defineProperty(this, '__alias', {
        value: alias
    });
    var v = value;
    var dnstream = relations.dnstream;
    var resultIn = relations.resultIn;
    var upstream = relations.upstream;
    var resultFrom = relations.resultFrom;
    if (Util.isString(dnstream)) dnstream = [dnstream];
    if (Util.isArray(dnstream)) {
        dnstream.forEach(function (a) {
            Upstreams[a][alias] = true;
            Dnstreams[alias][a] = true;
        });
    } else {
        dnstream = [];
    }
    if (Util.isFunction(resultIn)) {
        ResultsIn[alias] = resultIn;
    }
    if (Util.isString(upstream)) upstream = [upstream];
    if (Util.isArray(upstream)) {
        upstream.forEach(function (a) {
            Upstreams[alias][a] = true;
            Dnstreams[a][alias] = true;
        });
    } else {
        upstream = [];
    }
    if (Util.isFunction(resultFrom)) {
        ResultsFrom[alias] = resultFrom;
    }
    Object.defineProperty(obj.target, obj.property, {
        get: function () {
            if (!ResultsFrom[alias]) return v;
            return ResultsFrom[alias].apply(root, upstream.map(function (a) { return get(root, a) }));
        },
        set: function (_v) {
            if (_v === v) return;
            v = _v;
            ResultsIn[alias] && ResultsIn[alias].apply(root, [_v]);
            dnstream.forEach(function (a) {
                if (ResultsFrom[a]) set(root, a, get(root, a));
            });
        },
        enumerable: true
    });
}

Kernel.prototype.disable = function () {};
Kernel.prototype.enable = function () {};
Kernel.prototype.destroy = function () {};

export default Kernel
