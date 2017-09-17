import './Polyfill'
import * as Util from './Util'
import { Kernel, Relate } from './Kernel'

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
    if (!_this.defaults) {
        _this.defaults = DefaultConf;
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
                        Util.addEvent($el, p.substr(2), v, false);
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
        if ($el.nodeType === Node.ELEMENT_NODE && !$el[_this.defaults.domBoundFlag]) {
            $el[_this.defaults.domBoundFlag] = true; /* Set a binding flag. */
            Util.each($el.attributes, function (value, name) {
                if (!name.startsWith(_this.defaults.attrPrefix)) return;
                name = name.substr(_this.defaults.attrPrefix.length);
                switch (name) {
                    case 'value':
                        Util.addEvent($el, 'input', function (e) {
                            Util.refData(ref, value, this.value);
                        }, false);
                        new Kernel($el, name, relationFromExprToRef(value, ref));
                        break;
                    case 'innerText':
                    case 'innerHTML':
                        new Kernel($el, name, relationFromExprToRef(value, ref));
                        break;
                    case 'class':
                        new Kernel($el, 'className', relationFromExprToRef(value, ref, function () {
                            var re = evaluateRawTextWithTmpl(value, ref);
                            // TODO
                        }));
                        break;
                    case 'style':
                        new Kernel($el, 'style.cssText', relationFromExprToRef(value, ref, function () {
                            var re = evaluateRawTextWithTmpl(value, ref);
                            // TODO
                        }));
                        break;
                    default:
                        var eventName = Util.isEventName(name);
                        if (eventName) { /* Event */
                            Util.addEvent($el, eventName, function (e) {
                                new Function(['e'].concat(Object.keys(ref)).join(','), value).apply($el, Object.values(ref));
                            }, false);
                        } else { /* Attribute */
                            var resultIn = function (v) {
                                $el.setAttribute(name, new Function(Object.keys(ref).join(','), 'return ' + value).apply($el, Object.values(ref)));
                            };
                            var rels = {};
                            Util.each(parseRefsInExpr(value), function (r) {
                                rels[r] = {
                                    resultIn: resultIn
                                };
                            });
                            Relate(ref, rels);
                        }
                }
            });
            Util.each($el, function (node) {
                Bind(node, ref);
            });
        } else if ($el.nodeType === Node.TEXT_NODE) {
            var expr = parseExprsInRawText($el.nodeValue).join(';');
            new Kernel($el, 'nodeValue', relationFromExprToRef(expr, ref, function () {
                return evaluateRawTextWithTmpl($el.nodeValue, ref);
            }));
        }
    }
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Object} ref 
 * @return {*}
 */
function evaluateExpression(expr, ref) {
    expr = replaceTmplInStrLiteral(expr);
    var params = Object.keys(ref);
    var args = Object.values(ref);
    Util.each(args, function (v, i) {
        if (Util.isFunction(v))
            args[i] = v.bind(ref);
    });
    var result = null;
    try {
        result = (new Function(params.join(','), 'return ' + expr)).apply(ref, args);
    } catch (e) {}
    return result;
}

/**
 * Fix template strings in a string literal to JavaScript string-concat expressions.
 * @param {String} str 
 * @return {String}
 * @example "'My name is {{name}}.'" => "'My name is ' + (name) + '.'"
 */
function replaceTmplInStrLiteral(str) {
    var reg = /{{([^{}]*)}}/g;
    return str.replace(reg, function (match, p1) {
        return '\' + (' + p1 + ') + \'';
    });
}

/**
 * Evaluate a raw text with template expressions.
 * @param {String} text 
 * @param {Object} ref 
 * @return {String}
 * @example ('My name is {{name}}.', { name: 'Tom' }) => 'My name is Tom.'
 */
function evaluateRawTextWithTmpl(text, ref) {
    var reg = /{{([^{}]*)}}/g;
    var result = text.replace(reg, function (match, p1) {
        return evaluateExpression(p1, ref);
    });
    return result;
}

/**
 * Parse reference paths from an expression string.
 * @param {String} expr 
 * @return {Array<String>}
 */
function parseRefsInExpr(expr) {
    expr = ';' + expr + ';';
    var reg = /([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
    return expr.match(reg);
}

/**
 * Parse template expression strings from a raw text such as a text node value.
 * @param {String} text     [description]
 * @return {Array<String>}  [description]
 * @example 'My name is {{name}}. I\'m {{age}} years old.' => ['name', 'age']
 */
function parseExprsInRawText(text) {
    var reg = /{{([^{}]*)}}/g;
    var exprs = [];
    text.replace(reg, function (match, p1) {
        exprs.push(p1);
        return '';
    });
    return exprs;
}

/**
 * Get relations from an expression string to the data.
 * @param {String}      expr 
 * @param {Object}      ref 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, ref, resultFrom) {
    function getAllRefs(expr, ref) {
        var subData = {};
        Util.each(parseRefsInExpr(expr), function (r) {
            subData[r] = Util.refData(ref, r);
        });
        return Util.allRefs(subData);
    }
    return {
        upstream: getAllRefs(expr, ref).map(function (alias) {
            return {
                root: ref,
                alias: alias
            };
        }),
        resultFrom: resultFrom || function () {
            return evaluateExpression(expr, ref);
        }
    };
}

/**
 * Unbind data from DOM.
 * @param       {[type]} $el      [description]
 * @param       {[type]} ref      [description]
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
    domBoundFlag: '__dmd_bound'
};

DMD_Constructor: {
    var DMD = function ($el, option) {
        this.$el = $el || window.document.body;

        this.defaults = {};
        Util.extend(this.defaults, DefaultConf, option);
    };

    DMD.prototype.bind = function (ref, relation) {
        return Bind.call(this, this.$el, ref, relation);
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
