import './Polyfill'
import * as Util from './Util'
import { BindData, GetBinding, GetData } from './DataBinding'

/* Initialize the reference space. */
var DMDRefSpace = BindData();

/**
 * Bind data to DOM.
 * @param  {Object} ref                 [description]
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} relation            [description]
 * @return {[type]}                     [description]
 * @note   如果有relation，则认为是active模式，否则是passive模式；active模式会主动去
 *         遍历relation的属性进行绑定；passive模式会遍历$el的DOM属性
 */
function Bind(ref, $el, relation) {
    if (!Util.isObject(ref)) return;
    BindData(ref);

    var _this = this;

    if (!Util.isNode($el)) return;

    /**
     * Get all dependencies and one evaluating function of a relation to the reference data.
     * @param  {Object} ref         [description]
     * @param  {String|Array} rel   [description]
     * @return {Object}             [description]
     */
    function depsAndCalc(ref, rel) {
        var deps = [], calc = function (v) { return v; };
        if (Util.isString(rel)) {
            deps.push(rel);
            calc = function () { return GetData(ref, rel); };
        } else if (Util.isArray(rel)) {
            if (Util.isFunction(rel[rel.length - 1])) {
                calc = rel[rel.length - 1];
                if (Util.isArray(rel[0])) {
                    deps = rel[0].slice(0);
                } else {
                    deps = rel.filter(function (v) { return Util.isString(v); });
                }
            } else {
                var parts = [];
                Util.each(rel, function (v) {
                    if (Util.isString(v)) {
                        parts.push(v);
                    } else if (Util.isObject(v)) {
                        Util.each(v, function (r, p) {
                            var de = depsAndCalc(ref, r);
                            deps = deps.concat(de.deps);
                            var obj = {};
                            obj[p] = de.calc;
                            parts.push(obj);
                        });
                    }
                });
                calc = function () {
                    var re = [];
                    Util.each(parts, function (v) {
                        if (Util.isString(v)) {
                            re.push(v);
                        } else if (Util.isObject(v)) {
                            Util.each(v, function (e, p) {
                                if (e.call(ref)) re.push(p);
                                return false;
                            });
                        }
                    });
                    return re.join('\n');
                };
            }
        }

        return {
            deps: deps,
            calc: calc
        };
    }

    /**
     * Apply a relation upon the reference data.
     * @param  {Object} ref         [description]
     * @param  {String|Array} rel   [description]
     * @param  {Boolean} loop       [description]
     * @return {Function}           [description]
     */
    function applyRelation(ref, rel, loop) {
        var de = depsAndCalc(ref, rel);
        var deps = Util.unique(de.deps).map(function (r) { return GetBinding(ref, r); });
        var calc = de.calc;
        if (!loop) {
            return function (relate) {
                /* Apply the relation now. */
                relate(calc.call(ref));

                /* Add `relate` as a setter to the deps in `rel`. */
                Util.each(deps, function (dep) {
                    dep.setters.push(function (v) {
                        relate(calc.call(ref, v));
                    });
                });
            };
        } else {
            // TODO
        }
    }

    /**
     * 绑定/渲染模式
     * @type {String}
     * @note "active"模式: 指定ref和$el之间的relation，主动进行双向绑定，不依赖于dom标签中的属性和模板；
     *           绑定逻辑可分离为配置对象；可以达到渲染和绑定分离的目的，所以如果是SSR或第三方UI组件则
     *           更推荐这种模式.
     *       "passive"模式: 依赖于dom标签内定义的属性和模板，进行解析；渲染与绑定逻辑耦合，模板即组件.
     */
    var mode = Util.isObject(relation) ? 'active' : 'passive';

    if (mode === 'active') {
        Util.each(relation, function (v, p) {
            switch (p) {
                case 'model':
                    applyRelation(ref, v, true)(function () {
                        // TODO
                    });
                    break;
                case 'show':
                    applyRelation(ref, v)(function (v) {
                        $el.style.display = v ? 'block' : 'none';
                    });
                    break;
                case 'style':
                    applyRelation(ref, v)(function (v) {
                        $el['cssText'] = v;
                    });
                    break;
                case 'innerText':
                case 'innerHTML':
                case 'className':
                    applyRelation(ref, v)(function (v) {
                        $el[p] = v;
                    });
                    break;
                default:
                    var pNum = parseInt(p);
                    if (!isNaN(pNum)) { /* Node Index */
                    } else if (Util.isEventName(p)) { /* Event */
                        $el.addEventListener(p, v, false);
                    } else if (Util.isCSSSelector(p)) { /* CSS Selector */
                        var children = Array.prototype.slice.call($el.querySelectorAll(p), 0);
                        Util.each(children, function (dom) {
                            Bind(ref, dom, v);
                        });
                    } else { /* Attribute */
                        applyRelation(ref, v)(function (v) {
                            $el.setAttribute(p, v);
                        });
                    }
            }
        });
    } else {
        if ($el.nodeType === Node.ELEMENT_NODE) {
            Util.each($el.attributes, function (value, name) {
                if (!name.startsWith(_this.attrPrefix)) return;
                name = name.substr(_this.attrPrefix.length);
                switch (name) {
                    case 'model':
                        break;
                    case 'show':
                        break;
                    case 'text':
                        break;
                    case 'html':
                        break;
                    case 'class':
                        break;
                    case 'style':
                        break;
                    default:
                        if (Util.isEventName(name)) { /* Event */
                        } else { /* Attribute */
                        }
                }
            });
            Util.each($el, function (node) {
                Bind(ref, node);
            });
        } else if ($el.nodeType === Node.TEXT_NODE) {
            // TODO
        }
    }
}

/**
 * Unbind data from DOM.
 * @param       {[type]} ref      [description]
 * @param       {[type]} $el      [description]
 * @param       {[type]} relation [description]
 * @constructor
 */
function Unbind(ref, $el, relation) {
    // TODO
}

/**
 * Default configurations.
 * @type {Object}
 */
var DefaultConf = {
    attrPrefix: 'm-',
    refSeparator: '/',
    tmplGrammer: 'dollarbrace',
    tmplEngine: {
        parseDeps: function (tmpl) {

        },
        classParser: function () {},
        styleParser: function () {},
        eventParser: function () {},
        attrValueParser: function () {},
        textValueParser: function (tmpl, executor) {
            return tmpl.replace(/{([^{}]*)}/ig, function (match, p1, offset, string) {
                return executor(p1);
            });
        }
    }
};

DMD_Constructor: {
    var DMD = function ($el, option) {
        this.$el = $el || window.document.body;

        this.defaults = {};
        Util.extend(this.defaults, DefaultConf, option);
    };

    DMD.prototype.bind = function (ref, relation) {
        return Bind(ref, this.$el, relation);
    };
}

DMD_Factory: {
    var factory = function ($el, option) {
        return new DMD($el, option);
    };
    factory.defaults = Util.clone(DefaultConf);
    factory.data = BindData;
    factory.bind = Bind;
}

export default factory
