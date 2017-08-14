import * as Util from './Util'
import { AliasDOM, Alias } from './AliasDOM'
import BindDataToRefBase from './DataBinding'

/**
 * Bind data to DOM.
 * @param  {Object} ref                 [description]
 * @param  {HTMLElement|AliasDOM} $el   [description]
 * @param  {Object} relation            [description]
 * @return {[type]}                     [description]
 * @note   如果有relation，则认为是active模式，否则是passive模式；active模式会主动去
 *         遍历relation的属性进行绑定；passive模式会遍历$el的DOM属性
 */
var Bind = function (ref, $el, relation) {
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
};

var DefaultConf = {
    attrPrefix: 'm-',
    tmplEngine: {
        parseDeps: function (tmpl) {

        },
        classParser: function () {},
        styleParser: function () {},
        eventParser: function () {},
        attrValueParser: function () {},
        textValueParser: function () {}
    }
};

var DMD = function ($el, option) {
    this.$el = $el || window.document.body;

    this.defaults = {};
    Util.extend(this.defaults, DefaultConf, option);
};

var DMDDefs = {
    realRefs: 'DMD_REAL_REFs',
    refSeparator: '/'
};

/**
 * Bind an object data.
 * @param  {Object} data                [description]
 * @param  {Boolean} force              [description]
 * @return {[type]}                     [description]
 */
function BindData(data, force) {
    return BindDataToRefBase(data, force);
}
DMD[DMDDefs.realRefs] = BindData();

DMD.prototype.alias = function (map) {
    return Alias(map, this.$el);
};

DMD.prototype.bind = function (ref, relation) {
    BindData(ref);
    return Bind(ref, this.$el, relation);
};

var factory = function ($el, option) {
    return new DMD($el, option);
};
factory.defaults = Util.clone(DefaultConf);
factory.alias = Alias;
factory.bind = Bind;
factory.data = BindData;

export default factory
