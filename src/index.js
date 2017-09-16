import './Polyfill'
import * as Util from './Util'
import Kernel from './Kernel'

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @param  {Object} relation            [description]
 * @return {[type]}                     [description]
 * @note   如果有relation，则认为是active模式，否则是passive模式.
 */
function Bind($el, ref, relation) {
    if (!Util.isObject(ref) || !Util.isNode($el)) return;

    var _this = this;

    /**
     * 绑定/渲染模式
     * @type {String}
     * @note "active"模式: 指定ref和$el之间的relation，主动进行双向绑定，不依赖于dom标签中的属性和模板；
     *           绑定逻辑可分离为配置对象；可以达到渲染和绑定分离的目的，所以如果是SSR或第三方UI组件则
     *           更推荐这种模式.
     *       "passive"模式: 依赖于dom标签内定义的属性和模板，进行解析；渲染与绑定逻辑耦合，模板即组件.
     */
    var mode = Util.isObject(relation) ? 'active' : 'passive';

    var dnstream = [];
    var upstream = [];
    var relations = {};
    if (mode === 'active') {
        Util.each(relation, function (v, p) {
            switch (p) {
                case 'value':
                    
                    break;
                case 'style':
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
                            Bind(dom, ref, v);
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
                    case 'value':
                        break;
                    case 'innerText':
                    case 'innerHTML':
                        new Kernel($el, name, relationFromTmplToRef(value, ref));
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
                Bind(node, ref);
            });
        } else if ($el.nodeType === Node.TEXT_NODE) {
            var tmpl = tmplInText($el.nodeValue);
            new Kernel($el, 'nodeValue', relationFromTmplToRef(tmpl, ref, function () {
                return DefaultConf.tmplEngine.parseNodeValue($el.nodeValue, ref);
            }));
        }
    }
}

/**
 * Get template expression strings in text.
 * @param {String} text 
 */
function tmplInText(text) {
    var reg = /{{([^{}]*)}}/ig;
    return text.match(reg).map(function (p) {
        return reg.exec(p)[1];
    }).join(';');
}

/**
 * Get relations from a template string to the data.
 * @param {String}      tmpl 
 * @param {Object}      ref 
 * @param {Function}    resultFrom 
 */
function relationFromTmplToRef(tmpl, ref, resultFrom) {
    var subData = {};
    Util.each(DefaultConf.tmplEngine.parseDeps(tmpl, ref), function (r) {
        subData[r] = ref[r];
    });
    var deps = Util.allRefs(subData).map(function (alias) {
        return {
            root: ref,
            alias: alias
        };
    });
    return {
        upstream: deps,
        resultFrom: resultFrom || function () {
            return DefaultConf.tmplEngine.evaluate(tmpl, ref);
        }
    };
}

/**
 * Unbind data from DOM.
 * @param       {[type]} ref      [description]
 * @param       {[type]} $el      [description]
 * @param       {[type]} relation [description]
 * @constructor
 */
function Unbind($el, ref, relation) {
    // TODO
}

/**
 * Default configurations.
 * @type {Object}
 */
var DefaultConf = {
    attrPrefix: 'm-',
    tmplEngine: {
        parseDeps: function (str, ref) {
            var props = Object.keys(ref);
            var deps = [];
            props.forEach(function (p) {
                var ii = Util.eachIndexOf(str, p);
                Util.each(ii, function (i) {
                    if ((str[i - 1] === undefined || /[^0-9a-zA-Z$_.]/.test(str[i - 1]))
                        && (str[i + p.length] === undefined || /[^0-9a-zA-Z$_]/.test(str[i + p.length]))) {
                        deps.push(p);
                        return false;
                    }
                });
            });
            return deps;
        },
        evaluate: function (str, ref) {
            return (new Function(Object.keys(ref).join(','), 'return ' + str)).apply(ref, Object.values(ref));
        },
        parseNodeValue: function (text, ref) {
            return text.replace(/{{([^{}]*)}}/ig, function (match, p1, offset, string) {
                return DefaultConf.tmplEngine.evaluate(p1, ref);
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
        return Bind(this.$el, ref, relation);
    };
}

DMD_Factory: {
    var factory = function ($el, option) {
        return new DMD($el, option);
    };
    factory.defaults = Util.clone(DefaultConf);
    factory.bind = Bind;
}

export default factory
