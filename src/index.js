import * as Util from './Util'
import { Kernel, Relate, Data } from './Kernel'
import * as Parser from './Parser'

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

var domValueToBind = {
    'input': true,
    'select': true
};

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @param  {Array} ext                  [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref, ext) {
    if (!Util.isNode($el) || !Util.isObject(ref)) return null;
    ext = ext ? (Util.isArray(ext) ? ext : [ext]) : []; /* Ensure `ext` is an array */
    var scopes = ext.concat(ref);

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */

        /* Bind a list */
        if ($el.hasAttribute(Parser.conf.attrPrefix + 'each')) {
            var eachAttrName = Parser.conf.attrPrefix + 'each';
            var eachExprText = $el.getAttribute(eachAttrName);
            var eachExpr = Parser.parseEachExpr(eachExprText, ref);
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
                    set: function (oval, nval, i, arr) {
                        if (i == k) {
                            _ext[eachExpr.iterator.val] = nval;
                        }
                    }
                });
            });
            $targetList.on({
                push: function (v) {},
                unshift: function (v) {},
                pop: function () {},
                shift: function () {},
                splice: function (startIndex, howManyDeleted, itemInserted) {},
                set: function (oval, nval, i, arr) {}
            });
        }
        
        /* Bind child nodes recursively */
        Util.each($el, function (node) {
            Bind(node, ref, ext);
        });

        var attrList = [];
        Util.each($el.attributes, function (value, name) {
            if (!name.startsWith(Parser.conf.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(Parser.conf.attrPrefix.length).toLowerCase();

            var eventName = Util.isEventName(name);
            if (eventName) { /* Event */
                Util.addEvent($el, eventName, function (e) {
                    Parser.executeFunctionWithScope(value, [{
                        e: e
                    }].concat(scopes));
                }, true);
                return;
            }

            if (domValueToBind[$el.nodeName.toLowerCase()] && name === 'value') { /* Two-way binding */
                var valueProp = Parser.conf.refBeginsWithDollar ? value.substr(1) : value;
                var valueTarget = Util.seekTarget(valueProp, ext, ref);
                Util.addEvent($el, 'input', function (e) {
                    Data(valueTarget, valueProp, this.value);
                }, false);
            }

            if (Parser.domProp[name]) name = Parser.domProp[name];
            else name = Parser.conf.attrsFlag + name; /* Attribute */

            /* Binding */
            var allrel = Parser.relationFromExprToRef(value, scopes, $el, name);
            allrel.forEach(function (a) {
                Relate(a.target, a.relations);
            });
        });

        /* Clean attributes */
        Util.each(attrList, function (name) {
            $el.removeAttribute(name);
        });
    } else if ($el.nodeType === Node.TEXT_NODE) {
        var tmpl = $el.nodeValue;
        var expr = Parser.parseExprsInRawText(tmpl).join(';');
        if (expr === '') return null;

        /* Binding */
        var allrel;
        var $targetEl = $el;
        var targetRef = 'nodeValue';
        if ($el.parentNode.nodeName.toLowerCase() === 'textarea') {
            $targetEl = $el.parentNode;
            targetRef = 'value';
        }
        allrel = Parser.relationFromExprToRef(expr, scopes, $targetEl, targetRef, function () {
            return Parser.evaluateRawTextWithTmpl(tmpl, scopes);
        });
        allrel.forEach(function (a) {
            Relate(a.target, a.relations);
        });
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
