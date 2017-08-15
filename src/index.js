import * from './Polyfill'
import * as Util from './Util'
import { AliasDOM, Alias } from './AliasDOM'
import BindData from './DataBinding'

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
        Util.each($el, function (dom) {
            Bind(ref, dom);
        });
        return;
    }

    if (!Util.isNode($el)) return;

    /**
     * 绑定/渲染模式
     * @type {String}
     * @note "active"模式: 指定ref和$el之间的relation，主动进行双向绑定，不依赖于dom标签中的属性和模板；
     *           绑定逻辑可分离为配置对象；可以达到渲染和绑定分离的目的，所以如果是SSR则更推荐这种模式.
     *       "passive"模式: 依赖于dom标签内定义的属性和模板，进行解析；渲染与绑定逻辑耦合，模板即组件.
     */
    var mode = Util.isObject(relation) ? 'active' : 'passive';

    if (mode === 'active') {
        Util.each(relation, function (v, p) {
            switch (p) {
                case 'show':
                case 'innerText':
                case 'innerHTML':
                case 'className':
                case 'style':
                    break;
                default:
                    var pNum = parseInt(p);
                    if (!isNaN(pNum)) { /* Node Index */
                    } else if (Util.isEventName(p)) { /* Event */
                    } else if (Util.isCSSSelector(p)) { /* CSS Selector */
                    } else { /* Attribute */
                    }
            }
        });
    } else {
        if ($el.nodeType === Node.ELEMENT_NODE) {
            Util.each($el.attributes, function (value, name) {
                if (!name.startsWith(_this.attrPrefix)) return;
                name = name.substr(_this.attrPrefix.length);
                switch (name) {
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
