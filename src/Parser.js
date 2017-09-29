import * as Util from './Util'
import { Data } from './Kernel'
import OArray from './OArray'

/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    attrPrefix: 'm-',
    refBeginsWithDollar: true,
    attrsFlag: 'attrs.'
};

var domProp = {
    'value': 'value',
    'innertext': 'innerText',
    'innerhtml': 'innerHTML',
    'class': 'className',
    'style': 'style.cssText'
};

/**
 * Execute a function with a data object as the scope.
 * @param {String} expr 
 * @param {Array} refs 
 * @param {*} target 
 */
function executeFunctionWithScope(expr, refs, target) {
    if (Util.isArray(refs)) {
        if (!target) target = refs[refs.length - 1];
    } else {
        refs = [refs];
        if (!target) target = refs[0];
    }
    
    var ref;
    Util.each(refs, function (r) {
        Util.each(r, function (v, p) {
            if (p in ref) return;
            ref[p] = v;
        });
    });

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
    return (new Function(params.join(','), 'return (' + expr + ')')).apply(target, args);
}

/**
 * Evaluate an expression with a data object.
 * @param {String} expr 
 * @param {Array} refs 
 * @return {*}
 */
function evaluateExpression(expr, refs) {
    expr = replaceTmplInStrLiteral(expr);
    var result = null;
    try {
        result = executeFunctionWithScope(expr, refs);
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
 * @param {Array} refs 
 * @return {String}
 * @example ('My name is {{$name}}.', { name: 'Tom' }) => 'My name is Tom.'
 */
function evaluateRawTextWithTmpl(text, refs) {
    var reg = /{{([^{}]*)}}/g;
    var result = text.replace(reg, function (match, p1) {
        return evaluateExpression(p1, refs);
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
 * @param {*} ref
 */
function parseEachExpr(expr, ref) {
    // TODO
    var value = [];
    if (!(value instanceof OArray)) {
        // TODO
    }
    return {
        target: value,
        targetRef: '',
        iterator: {
            val: '',
            key: ''
        }
    };
}

/**
 * Parse template expression strings from a raw text such as a text node value.
 * @param {String} text     [description]
 * @return {Array<String>}  [description]
 * @example 'My name is {{$name}}. I\'m {{$age}} years old.' => ['$name', '$age']
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
 * @param {Array}       refs 
 * @param {Function}    resultFrom 
 * @return {Object}
 */
function relationFromExprToRef(expr, refs, target, proppath, resultFrom) {
    if (!Util.isArray(refs)) refs = [refs];

    function getAllRefs(expr, refs) {
        var refsInExpr = parseRefsInExpr(expr);
        var subData = {};
        Util.each(refsInExpr, function (r) {
            var i = Util.seekTargetIndex(r, refs);
            if (!subData[i]) subData[i] = {};
            subData[i][r] = Data(t, r);
        });
        var re = [];
        Util.each(subData, function (s, i) {
            re.push({
                target: refs[i],
                refs: Util.allRefs(s)
            });
        });
        return re;
    }

    var targetIsNode = Util.isNode(target);
    var resultIn = function () {
        var result = (resultFrom || function () {
            return evaluateExpression(expr, refs);
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

    var r = getAllRefs(expr, refs).map(function (a) {
        return {
            target: a.target,
            relations: (function () {
                var r = {};
                a.refs.forEach(function (refpath) {
                    r[refpath] = {
                        resultIn: resultIn
                    };
                });
                return r;
            })()
        };
    });
    resultIn();
    return r;
}

export {
    conf,
    domProp,
    relationFromExprToRef,
    executeFunctionWithScope,
    parseExprsInRawText,
    evaluateRawTextWithTmpl
}
