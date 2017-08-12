import * as Util from './Util'
import OArray from './ObservableArray'

/**
 * Bind an object data into a reference base.
 * @param  {Object} data                [description]
 * @param  {Boolean} force              [description]
 * @param  {String} idPropertyName      [description]
 * @param  {Object} refBase             [description]
 * @return {[type]}                     [description]
 */
var BindData = function (data, force, idPropertyName, refBase) {
    if (!Util.isObject(data)) return false;
    if (data[idPropertyName] !== undefined && !force) return;

    var id = Util.gid();
    Object.defineProperty(data, idPropertyName, {
        value: id,
        enumerable: false
    });
    refBase[id] = {
        data: data,
        props: {}
    };

    function bindProps(node, obj) {
        if (!Util.isObject(obj)) return;
        node.props = {};
        Util.each(obj, function (v, p) {
            node.props[p] = {
                setters: []
            };
            bindProps(node.props[p], v);
        });
    }
    bindProps(refBase[id], data);

    function setSetters(obj, node) {
        Util.each(obj, function (v, p) {
            delete obj[p];
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

                    if (Util.isBasic(v)) {
                        v = _v;
                    } else {
                        if (Util.isBasic(_v)) {
                            Util.clear(obj, p);
                            v = _v;
                        } else {
                            Util.extend(v, _v, true);
                        }
                    }
                },
                enumerable: true
            });
            setSetters(v, node.props[p]);
        });
    }
    setSetters(data, refBase[id]);
};

export default BindData
