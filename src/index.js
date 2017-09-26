// import './Polyfill'
import * as Util from './Util'
import { Kernel, Relate, Data } from './Kernel'
import * as Parser from './Parser'

/**
 * Default configurations.
 * @type {Object}
 */
var conf = {
    attrPrefix: 'm-',
    domBoundFlag: '__dmd_bound'
};

/**
 * Bind data to DOM.
 * @param  {HTMLElement} $el            [description]
 * @param  {Object} ref                 [description]
 * @return {[type]}                     [description]
 */
function Bind($el, ref) {
    if (!Util.isNode($el) || !Util.isObject(ref)) return;

    if ($el.nodeType === Node.ELEMENT_NODE && !$el[conf.domBoundFlag]) {
        $el[conf.domBoundFlag] = true; /* Set a binding flag. */
        var attrList = [];
        Util.each($el.attributes, function (value, name) {
            if (!name.startsWith(conf.attrPrefix)) return;
            attrList.push(name);
            name = name.substr(conf.attrPrefix.length).toLowerCase();
            switch (name) {
            case 'value':
                Util.addEvent($el, 'input', function (e) {
                    Data(ref, Parser.conf.refBeginsWithDollar ? value.substr(1) : value, this.value);
                }, false);
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, name));
                break;
            case 'innertext':
            case 'innerhtml':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, (name === 'innertext') ? 'innerText' : 'innerHTML'));
                break;
            case 'class':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'className'));
                break;
            case 'style':
                Relate(ref, Parser.relationFromExprToRef(value, ref, $el, 'style.cssText'));
                break;
            case 'each':
                // TODO
                break;
            default:
                var eventName = Util.isEventName(name);
                if (eventName) { /* Event */
                    Util.addEvent($el, eventName, function (e) {
                        Parser.executeFunctionWithScope(value, ref, $el);
                    }, false);
                } else { /* Attribute */
                    Relate(ref, Parser.relationFromExprToRef(value, ref, $el, Parser.conf.attrsFlag + name));
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
        var expr = Parser.parseExprsInRawText(tmpl).join(';');
        if (expr === '') return;
        Relate(ref, Parser.relationFromExprToRef(expr, ref, $el, 'nodeValue', function () {
            return Parser.evaluateRawTextWithTmpl(tmpl, ref);
        }));
    }
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
