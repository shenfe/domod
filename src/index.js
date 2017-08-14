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
