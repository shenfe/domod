import * as Util from './Util'
import { Kernel, Relate, Data } from './Kernel'
import * as Parser from './Parser'
import OArray from './OArray'

/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    domBoundFlag: '__dmd_bound',
    domListKey: '__dmd_key'
};

function pathContains(path, ref) {
    Util.each(ref, function (p, k) {
        if (path === k || path.startsWith(k + '.')) return k;
    });
    return null;
}

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @param  {Array} ext                  [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref, ext) {
    if (!Util.isNode($el) || !Util.isObject(ref)) return null;
    ext = ext ? (Util.isArray(ext) ? ext : [ext]) : [];

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */

        if ($el.hasAttribute(Parser.conf.attrPrefix + 'each')) {
            var eachAttrName = Parser.conf.attrPrefix + 'each';
            var eachExprText = $el.getAttribute(eachAttrName);
            var eachExpr = parseEachExpr(eachExprText, ref);
            $el.removeAttribute(eachAttrName);
            var $parent = $el.parentNode;
            $parent.removeChild($el);

            var $targetList = eachExpr.target;
            Util.each($targetList, function (v, k) {
                var $copy = $el.cloneNode(true);
                var _ext = {};
                _ext[eachExpr.iterator.val] = v;
                _ext[eachExpr.iterator.key] = k;
                Bind($copy, ref, [_ext].concat(ext));
                $parent.appendChild($copy);

                $targetList.on({
                    push: function (v) {},
                    unshift: function (v) {},
                    pop: function () {},
                    shift: function () {},
                    splice: function (startIndex, howManyDeleted, itemInserted) {},
                    set: function (oval, nval, i, arr) {}
                });
            });
        }

        var attrList = [];
        Util.each($el.attributes, function (value, name) {
            if (!name.startsWith(Parser.conf.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(Parser.conf.attrPrefix.length).toLowerCase();
            switch (name) {
            case 'value':
                Util.addEvent($el, 'input', function (e) {
                    Data(ref, Parser.conf.refBeginsWithDollar ? value.substr(1) : value, this.value);
                }, false);
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'value'));
                break;
            case 'innertext':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'innerText'));
                break;
            case 'innerhtml':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'innerHTML'));
                break;
            case 'class':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'className'));
                break;
            case 'style':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'style.cssText'));
                break;
            default:
                var eventName = Util.isEventName(name);
                if (eventName) { /* Event */
                    Util.addEvent($el, eventName, function (e) {
                        Parser.executeFunctionWithScope(value, ref);
                    }, true);
                } else { /* Attribute */
                    Relate(ref, Parser.relationFromExprToRef(value, ref, $el, Parser.conf.attrsFlag + name));
                }
            }
        });
        Util.each(attrList, function (name) {
            $el.removeAttribute(name);
        });
        Util.each($el, function (node) {
            Bind(node, ref, ext);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var tmpl = $el.nodeValue;
        var expr = Parser.parseExprsInRawText(tmpl).join(';');
        if (expr === '') return null;
        Relate(ref, Parser.relationFromExprToRef(expr, ref, $el, 'nodeValue', function () {
            return Parser.evaluateRawTextWithTmpl(tmpl, ref);
        }));
    }

    return $el;
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
 * Constructor.
 * @param {*} $el 
 * @param {*} ref 
 */
var DMD = function ($el, ref) {
    Bind.call(this, $el, ref);
};

DMD.kernel = Kernel;
DMD.relate = Relate;
DMD.$ = Data;

export default DMD
