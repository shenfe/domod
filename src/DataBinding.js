import * as Util from './Util'
import OArray from './ObservableArray'

var idPropertyName = '__DMD_DARK_REF';
var refBase = {};

/**
 * Bind an object data into a reference base.
 * @param  {Object} data                [description]
 * @param  {Boolean} force              [description]
 * @return {[type]}                     [description]
 */
var BindData = function (data, force) {
    if (!Util.isObject(data)) return refBase;
    if (data[idPropertyName] !== undefined && !force) return refBase;

    Object.defineProperty(data, idPropertyName, {
        value: Util.gid()
    });

    refBase[data[idPropertyName]] = {
        data: data,
        props: {}
    };
    var rootNode = refBase[data[idPropertyName]];

    function bindProps(node, obj) {
        if (!Util.isObject(obj)) return;
        if (!node.props) node.props = {};
        Util.each(obj, function (v, p) {
            if (!node.props[p]) {
                node.props[p] = {
                    setters: []
                };
            }
            bindProps(node.props[p], v);
        });
    }
    bindProps(rootNode, data);

    function bindSetters(node, obj) {
        Util.each(obj, function (v, p) {
            if (delete obj[p] === false) return;
            Object.defineProperty(obj, p, {
                get: function () {
                    return v;
                },
                set: function (_v) {
                    function execSetters(node, newV, oldv) {
                        Util.each(node.setters, function (setter) {
                            setter(newV, oldv);
                        });
                    }
                    execSetters(node.props[p], _v, v);

                    if (Util.isBasic(_v)) {
                        Util.clear(obj, p, _v);
                    } else {
                        bindProps(node.props[p], _v);
                        bindSetters(node.props[p], _v);
                        if (Util.isBasic(v)) {
                            v = _v;
                            Util.touchLeaves(v);
                        } else {
                            Util.extend(v, _v, true);
                        }
                    }
                },
                enumerable: true
            });
            bindSetters(node.props[p], v);
        });
    }
    bindSetters(rootNode, data);

    return refBase;
};

export default BindData
