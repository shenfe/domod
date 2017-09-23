// import './Polyfill'
import * as Util from './Util'
import { Kernel, Relate, Data } from './Kernel'

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref) {
    if (!Util.isNode($el) || !Util.isObject(ref)) return;

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[DefaultConf.domBoundFlag]) {
        $el[DefaultConf.domBoundFlag] = true; /* Set a binding flag. */
        var attrList = [];
        Util.each($el.attributes, function (value, name) {
            if (!name.startsWith(DefaultConf.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(DefaultConf.attrPrefix.length).toLowerCase();
            switch (name) {
            case 'value':
                Util.addEvent($el, 'input', function (e) {
                    Util.refData(ref, DefaultConf.refBeginsWithDollar ? value.substr(1) : value, this.value);
                }, false);
                Relate(ref, relationFromExprToRef(value, ref, $el, name));
                break;
            case 'innertext':
            case 'innerhtml':
                Relate(ref, relationFromExprToRef(value, ref, $el, (name === 'innertext') ? 'innerText' : 'innerHTML'));
                break;
            case 'class':
                Relate(ref, relationFromExprToRef(value, ref, $el, 'className', function () {
                    var re = evaluateExpression(value, ref);
                    var classList = [];
                    if (Util.isObject(re)) {
                        Util.each(re, function (v, p) {
                            v && classList.push(p);
                        });
                    } else if (Util.isArray(re)) {
                        Util.each(re, function (v) {
                            if (Util.isString(v)) classList.push(v);
                            else if (Util.isObject(v)) {
                                Util.each(v, function (vv, pp) {
                                    vv && classList.push(pp);
                                });
                            }
                        });
                    }
                    return classList.join(' ');
                }));
                break;
            case 'style':
                Relate(ref, relationFromExprToRef(value, ref, $el, 'style.cssText', function () {
                    var re = evaluateExpression(value, ref);
                    var stylePairs = [];
                    if (Util.isObject(re)) {
                        Util.each(re, function (v, p) {
                            stylePairs.push(p + ':' + v);
                        });
                    }
                    return stylePairs.join(';');
                }));
                break;
            default:
                var eventName = Util.isEventName(name);
                var params = Object.keys(ref);
                if (DefaultConf.refBeginsWithDollar) {
                    params = params.map(function (r) {
                        return '$' + r;
                    });
                }
                if (eventName) { /* Event */
                    Util.addEvent($el, eventName, function (e) {
                        new Function(['e'].concat(params).join(','), value).apply($el, Object.values(ref));
                    }, false);
                } else { /* Attribute */
                    var resultIn = function (v) {
                        $el.setAttribute(name, new Function(params.join(','), 'return ' + value).apply($el, Object.values(ref)));
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
        Util.each(attrList, function (name) {
            $el.removeAttribute(name);
        });
        Util.each($el, function (node) {
            Bind(node, ref);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var tmpl = $el.nodeValue;
        var expr = parseExprsInRawText(tmpl).join(';');
        if (expr === '') return;
        Relate(ref, relationFromExprToRef(expr, ref, $el, 'nodeValue', function () {
            return evaluateRawTextWithTmpl(tmpl, ref);
        }));
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
    if (DefaultConf.refBeginsWithDollar) {
        params = params.map(function (r) {
            return '$' + r;
        });
    }
    var args = Object.values(ref);
    Util.each(args, function (v, i) {
        if (Util.isFunction(v)) {
            args[i] = v.bind(ref);
        }
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
    var reg;
    if (DefaultConf.refBeginsWithDollar) {
        reg = /\$([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return expr.match(reg).map(function (r) {
            return r.substr(1);
        });
    } else {
        reg = /([a-zA-Z$_][0-9a-zA-Z$_]*)(\.[a-zA-Z$_][0-9a-zA-Z$_]*)*/g;
        return expr.match(reg);
    }
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
function relationFromExprToRef(expr, ref, target, proppath, resultFrom) {
    function getAllRefs(expr, ref) {
        var subData = {};
        Util.each(parseRefsInExpr(expr), function (r) {
            subData[r] = Util.refData(ref, r);
        });
        return Util.allRefs(subData);
    }
    var resultIn = function () {
        Util.refData(target, proppath, (resultFrom || function () {
            return evaluateExpression(expr, ref);
        })());
    };
    var r = {};
    getAllRefs(expr, ref).forEach(function (ref) {
        r[ref] = {
            resultIn: resultIn
        };
    });
    resultIn();
    return r;
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
    domBoundFlag: '__dmd_bound',
    refBeginsWithDollar: true
};

/**
 * Constructor.
 * @param {*}  
 * @param {*} ref 
 */
var DMD = function ($el, ref) {
    Bind.call(this, $el, ref);
};

DMD.kernel = Kernel;
DMD.relate = Relate;
DMD.$ = Data;

export default DMD
