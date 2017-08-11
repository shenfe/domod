import * as Util from './Util'

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
        get: function () {
            return id;
        },
        enumerable: false
    });
    refBase[id] = {
        data: data,
        props: {},
        paths: {}
    };

    var bindProps = function (node, obj) {
        if (!Util.isObject(obj)) return;
        node.props = {};
        Util.each(obj, function (v, p) {
            node.props[p] = {
                setters: []
            };
            bindProps(node.props[p], v);
        });
    };
    bindProps(refBase[id], data);

    var setSetters = function (obj, node) {
        Util.each(obj, function (v, p) {
            delete obj[p];
            Object.defineProperty(obj, p, {
                get: function () {
                    return v;
                },
                set: function (_v) {
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

                    var execSetters = function (node, v, oldv) {
                        Util.each(node.setters, function (setter) {
                            setter(v, oldv);
                        });
                        // Util.each(node.props, function (pv, pn) {
                        //     execSetters(pv, v[pn], oldv[pn]);
                        // });
                    };
                    execSetters(node.props[p], v, _v);
                },
                enumerable: true
            });
            setSetters(v, node.props[p]);
        });
    };
    setSetters(data, refBase[id]);
};

export default BindData
