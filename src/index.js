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
    'input': 'input',
    'select': 'change'
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

    var nodeName = $el.nodeName.toLowerCase();

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */

        /* Bind a list */
        if ($el.hasAttribute(Parser.conf.attrPrefix + 'each')) {
            var eachAttrName = Parser.conf.attrPrefix + 'each';
            var eachExprText = $el.getAttribute(eachAttrName);
            var eachExpr = Parser.parseEachExpr(eachExprText, ref);
            $el.removeAttribute(eachAttrName);
            var $parent = $el.parentNode;
            // $parent.removeChild($el);
            $parent.innerHTML = '';

            var $targetList = eachExpr.target;

            function bindItem(v, k) {
                var $copy = $el.cloneNode(true);
                var _ext = {};
                _ext[eachExpr.iterator.val] = v;
                _ext[eachExpr.iterator.key] = k;
                Bind($copy, ref, [_ext].concat(ext));

                $targetList.on({
                    set: function (oval, nval, i, arr) {
                        if (i == k) {
                            console.log('set', i, nval);
                            _ext[eachExpr.iterator.val] = nval;
                        }
                    },
                    // push: function (v) {},
                    unshift: function (v) {
                        k++;
                        _ext[eachExpr.iterator.key] = k;
                    },
                    // pop: function () {},
                    shift: function () {
                        if (k > 0) {
                            k--;
                            _ext[eachExpr.iterator.key] = k;
                        }
                    },
                    splice: function (startIndex, howManyToDelete, itemToInsert) {
                        if (howManyToDelete) {
                            if (k >= startIndex + howManyToDelete) {
                                k -= howManyToDelete;
                                _ext[eachExpr.iterator.key] = k;
                            }
                        } else {
                            var howManyItemsToInsert = Array.prototype.slice.call(arguments, 2).length;
                            if (k >= startIndex) {
                                k += howManyItemsToInsert;
                                _ext[eachExpr.iterator.key] = k;
                            }
                        }
                    }
                });

                return $copy;
            }

            Util.each($targetList, function (v, i) {
                $parent.appendChild(bindItem(v, i));
            });

            $targetList.on({
                // set: function (oval, nval, i, arr) {},
                resize: function () {
                    if ($parent.nodeName.toLowerCase() === 'select') {
                        $parent.dispatchEvent(new Event('change'));
                    }
                },
                push: function (v) {
                    $parent.appendChild(bindItem(v, $targetList.length - 1));
                },
                unshift: function (v) {
                    $parent.insertBefore(bindItem(v, 0), $parent.childNodes[0]);
                },
                pop: function () {
                    $parent.removeChild($parent.lastChild);
                },
                shift: function () {
                    $parent.removeChild($parent.firstChild);
                },
                splice: function (startIndex, howManyToDelete, itemToInsert) {
                    if (howManyToDelete) {
                        for (; howManyToDelete > 0; howManyToDelete--) {
                            $parent.removeChild($parent.childNodes[startIndex]);
                        }
                    } else {
                        var itemsToInsert = Array.prototype.slice.call(arguments, 2);
                        Util.each(itemsToInsert, function (v, i) {
                            $parent.insertBefore(bindItem(v, startIndex + i), $parent.childNodes[startIndex + i]);
                        });
                    }
                }
            });

            return;
        }

        /* Bind child nodes recursively */
        Util.each($el, function (node) {
            Bind(node, ref, ext);
        });

        /* Bind attributes */
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

            if (domValueToBind[nodeName] && name === 'value') { /* Two-way binding */
                var valueProp = Parser.conf.refBeginsWithDollar ? value.substr(1) : value;
                var valueTarget = Util.seekTarget(valueProp, ext, ref);
                Util.addEvent($el, domValueToBind[nodeName], function (e) {
                    console.log('input change');
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
