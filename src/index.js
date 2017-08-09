polyfill: {
    /**
     * Object.assign
     * @refer https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
     */
    if (typeof Object.assign !== 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, 'assign', {
            value: function assign(target, varArgs) { // .length of function is 2
                'use strict';
                if (target == null) { // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) { // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }
}

var rand_803763970 = (function () {
    /**
     * Utilities.
     * @type {Object}
     */
    var Util = {
        isString: function (v) {
            return typeof v === 'string';
        },
        isFunction: function (v) {
            return typeof v === 'function';
        },
        isObject: function (v) {
            return Object.prototype.toString.call(v) === '[object Object]';
        },
        isArray: function (v) {
            return Object.prototype.toString.call(v) === '[object Array]';
        },
        isAlias: function (v) {
            return v instanceof AliasDOM;
        },
        isNode: function (v) {
            return v instanceof Node;
        },
        isNamedNodeMap: function (v) {
            return v instanceof NamedNodeMap;
        },
        isEventName: function (v) {
            if (!Util.isString(v)) return false;
            return v.startsWith('on'); // TODO
        },
        each: function (v, func) {
            if (Util.isObject(v)) {
                for (var p in v) {
                    if (!v.hasOwnProperty(p)) continue;
                    var r = func(v[p], p);
                    if (r === false) break;
                }
            } else if (Util.isArray(v)) {
                for (var i = 0, len = v.length; i < len; i++) {
                    var r = func(v[i], i);
                    if (r === false) break;
                }
            } else if (Util.isNode(v)) {
                switch (v.nodeType) {
                    case Node.ELEMENT_NODE:
                        break;
                    case Node.TEXT_NODE:
                        break;
                    case Node.COMMENT_NODE:
                    case Node.PROCESSING_INSTRUCTION_NODE:
                    case Node.DOCUMENT_NODE:
                    case Node.DOCUMENT_TYPE_NODE:
                    case Node.DOCUMENT_FRAGMENT_NODE:
                        break;
                    default:

                }
                for (var i = 0, childNodes = v.childNodes, len = v.childNodes.length; i < len; i++) {
                    Util.each(childNodes[i], func);
                }
            } else if (Util.isNamedNodeMap(v)) {
                for (var i = 0, len = v.length; i < len; i++) {
                    var r = func(v[i]['nodeValue'], v[i]['nodeName']);
                    if (r === false) break;
                }
            }
        }
    };

    /**
     * Alias DOM constructor function.
     * @param  {Object|String} map              Selector-alias map.
     * @param  {HTMLElement|Undefined} $el      Root element.
     * @return {Object}                         Result table.
     */
    var AliasDOM = function (map, $el) {
        var ifJoinAlias = !!map.join;
        var aliasSeparator = '/';

        function isKeyword(w) {
            return w === 'alias' || w === 'lazy' || w === 'join';
        }

        function alias(map, $root, obj, fullSel, fullAlias) {
            map = Util.isString(map) ? {
                alias: map
            } : (Util.isObject(map) ? map : {});
            $root = $root || window.document.body;
            obj = obj || {};
            if (!obj.__root) {
                Object.defineProperty(obj, '__root', {
                    get: function () {
                        return $root;
                    },
                    enumerable: false
                });
            }
            fullSel = fullSel || [];
            fullAlias = fullAlias || [];

            function querySelector($parent, sel) {
                if (!sel) return $parent;
                var $targets = Array.prototype.slice.call($parent.querySelectorAll(sel));
                if ($targets.length < 1) {
                    return null;
                } else if ($targets.length === 1) {
                    return $targets[0];
                } else {
                    return $targets;
                }
            }

            if (map.alias) {
                fullAlias = fullAlias.concat(map.alias);
                var aliasProperty = ifJoinAlias ? fullAlias.join(aliasSeparator) : map.alias;
                if (map.lazy) {
                    Object.defineProperty(obj, aliasProperty, {
                        get: function () {
                            return querySelector(this.__root, fullSel.join(' '));
                        },
                        enumerable: true
                    });
                } else {
                    obj[aliasProperty] = querySelector($root, fullSel.join(' '));
                }
            }

            Util.each(map, function (v, sel) {
                if (isKeyword(sel)) return;
                alias(v,
                    $root,
                    obj,
                    fullSel.concat(sel),
                    fullAlias
                );
            });

            return obj;
        }

        function lazyDown(map) {
            if (!Util.isObject(map)) return;
            if (map.lazy) {
                Util.each(map, function (v, p) {
                    if (isKeyword(p)) return;
                    if (Util.isString(v)) {
                        map[p] = {
                            alias: v,
                            lazy: true
                        };
                    } else if (Util.isObject(v)) {
                        v.lazy = true;
                    }
                });
            }
            Util.each(map, lazyDown);
        }

        lazyDown(map);

        alias(map, $el, this);
    };

    /**
     * Alias DOM factory function.
     * @param  {Object|String} map              Selector-alias map.
     * @param  {HTMLElement|Undefined} $el      Root element.
     * @return {AliasDOM}                       An AliasDOM instance.
     */
    var Alias = function (map, $el) {
        return new AliasDOM(map, $el);
    };

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
        if (Util.isAlias($el)) {
            Util.each($el, function (dom) {
                Bind(ref, dom);
            });
            return;
        }

        var mode = Util.isObject(relation) ? 'active' : 'passive';

        if (mode === 'active') {
            Util.each(relation, function (v, p) {
                switch (p) {
                    case 'className': /* Class */
                    case 'style': /* Style */
                        break;
                    default:
                        var pNum = parseInt(p);
                        if (!isNaN(pNum)) { /* Node Index */


                        } else if (Util.isEventName(p)) { /* Event */

                        } else { /* Attribute */

                        }
                }
            });
        } else {

        }
    };

    var DMD = function ($el, option) {
        this.$el = $el || window.document.body;

        this.conf = {};
        conf: {
            if (!Util.isObject(option)) option = {};
            var defaultConf = {
                attrPrefix: 'm-',
                tmplEngine: {
                    classParser: function () {},
                    styleParser: function () {},
                    eventParser: function () {},
                    attrValueParser: function () {},
                    textValueParser: function () {}
                }
            };
            Object.assign(this.conf, defaultConf, option);
        }
    };
    DMD.prototype.alias = function (map) {
        return Alias(map, this.$el);
    };
    DMD.prototype.bind = function (ref, relation) {
        return Bind(ref, this.$el, relation);
    };

    var factory = function ($el, option) {
        return new DMD($el, option);
    };
    factory.alias = Alias;
    factory.bind = Bind;
    return factory;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = rand_803763970;
    }
} else {
    window.DMD = rand_803763970;
}
