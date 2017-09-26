import * as Util from './Util'
import { Data } from './Kernel'

/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    refBeginsWithDollar: true,
    attrsFlag: 'attrs.'
};

/**
 * Execute a function with a data object as the scope.
 * @param {String} expr 
 * @param {Object} ref 
 * @param {*} target 
 */
function executeFunctionWithScope(expr, ref, target) {
    var params = Object.keys(ref);
    if (conf.refBeginsWithDollar) {
        params = params.map(function (r) {
            return '$' + r;
        });
    }
    var args = Object.values(ref);
    // Util.each(args, function (v, i) {
    //     if (Util.isFunction(v)) {
    //         args[i] = v.bind(ref);
    //     }
    // });
    return (new Function(params.join(','), 'return (' + expr + ')')).apply(target || ref, args);
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Object} ref 
 * @return {*}
 */
function evaluateExpression(expr, ref) {
    expr = replaceTmplInStrLiteral(expr);
    var result = null;
    try {
        result = executeFunctionWithScope(expr, ref);
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
    if (conf.refBeginsWithDollar) {
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
 * Parse `each` template expression from an attribute value string.
 * @param {String} expr 
 */
function parseEachExpr(expr) {
    // TODO
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
 * Get relations from an expression string to the data, and apply in time as well.
 * @param {String}      expr 
 * @param {Object}      ref 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, ref, target, proppath, resultFrom) {
    function getAllRefs(expr, ref) {
        var subData = {};
        Util.each(parseRefsInExpr(expr), function (r) {
            subData[r] = Data(ref, r);
        });
        return Util.allRefs(subData);
    }
    var targetIsNode = Util.isNode(target);
    var resultIn = function () {
        var result = (resultFrom || function () {
            return evaluateExpression(expr, ref);
        })();

        /* Transformation */
        if (targetIsNode && proppath === 'className') {
            var classList = [];
            if (Util.isObject(result)) {
                Util.each(result, function (v, p) {
                    v && classList.push(p);
                });
            } else if (Util.isArray(result)) {
                Util.each(result, function (v) {
                    if (Util.isString(v)) classList.push(v);
                    else if (Util.isObject(v)) {
                        Util.each(v, function (vv, pp) {
                            vv && classList.push(pp);
                        });
                    }
                });
            }
            result = classList.join(' ');
        } else if (targetIsNode && proppath === 'style.cssText') {
            var stylePairs = [];
            if (Util.isObject(result)) {
                Util.each(result, function (v, p) {
                    stylePairs.push(p + ':' + v);
                });
            }
            result = stylePairs.join(';');
        }

        if (targetIsNode && proppath.startsWith(conf.attrsFlag)) {
            if (result != null) {
                var attrName = proppath.substr(conf.attrsFlag.length);
                target.setAttribute(attrName, result);
            }
        } else {
            Data(target, proppath, result);
        }
    };
    var r = {};
    var ar = getAllRefs(expr, ref);
    ar.forEach(function (ref) {
        r[ref] = {
            resultIn: resultIn
        };
    });
    resultIn();
    return r;
}

export {
    conf,
    relationFromExprToRef,
    executeFunctionWithScope,
    parseExprsInRawText,
    evaluateRawTextWithTmpl
}
