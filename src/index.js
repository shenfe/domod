import './Polyfill'
import * as Util from './Util'
import { AliasDOM, Alias } from './AliasDOM'
import { BindData, GetBinding } from './DataBinding'

/* Initialize the reference space. */
var DMDRefSpace = BindData();

/**
 * Bind data to DOM.
 * @param  {Object} ref                 [description]
 * @param  {HTMLElement|AliasDOM} $el   [description]
 * @param  {Object} relation            [description]
 * @return {[type]}                     [description]
 * @note   如果有relation，则认为是active模式，否则是passive模式；active模式会主动去
 *         遍历relation的属性进行绑定；passive模式会遍历$el的DOM属性
 */
function Bind(ref, $el, relation) {
    if (!Util.isObject(ref)) return;
    BindData(ref);

    var _this = this;

    if (Util.isInstance($el, AliasDOM)) {
        Util.each($el, function (dom, a) {
            Bind(ref, dom, relation[a]);
        });
        return;
    }

    if (!Util.isNode($el)) return;

    function applyRelation(rel, loop) {
        var deps;
        if (Util.isString(rel)) {
            deps = GetBinding(ref, rel);
        } else if (Util.isArray(rel)) {
            if (Util.isString(rel[0])) {
                deps = [GetBinding(ref, rel[0])];
            } else if (Util.isArray(rel[0])) {
                deps = rel[0].map(function (r) { return GetBinding(ref, r); });
            }
        }
        if (!loop) {
            return function (relate) {
                // TODO: add `relate` as a setter to the deps in `rel`
                Util.each(deps, function (dep, i) {
                    dep.setters.push(function (v) {
                        var _v;
                        if (rel[1]) _v = rel[1].call(ref);
                        relate(_v);
                    });
                });
            };
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
                    applyRelation(v, true)(function () {
                        // TODO
                    });
                    break;
                case 'show':
                    applyRelation(v)(function (v) {
                        $el.style.display = v ? 'block' : 'none';
                    });
                    break;
                case 'innerText':
                case 'innerHTML':
                case 'className':
                case 'style':
                    applyRelation(v)(function (v) {
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
                        applyRelation(v)(function (v) {
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

    DMD.prototype.alias = function (map) {
        return Alias(map, this.$el);
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
    factory.alias = Alias;
    factory.data = BindData;
    factory.bind = Bind;
}

export default factory
