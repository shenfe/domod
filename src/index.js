var rand_803763970 = (function () {
    /**
     * Utilities.
     * @type {Object}
     */
    var Util = {
        isString: function (v) { return typeof v === 'string'; },
        isFunction: function (v) { return typeof v === 'function'; },
        isObject: function (v) { return Object.prototype.toString.call(v) === '[object Object]'; },
        isArray: function (v) { return Object.prototype.toString.call(v) === '[object Array]'; },
        isAlias: function (v) { return v instanceof AliasDOM; },
        isNode: function (v) { return v instanceof Node; },
        isNamedNodeMap: function (v) { return v instanceof NamedNodeMap; },
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
                        break;
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
            map         = Util.isString(map) ? { alias: map } : (Util.isObject(map) ? map : {});
            $root       = $root || window.document.body;
            obj         = obj || {};
            if (!obj.__root) obj.__root = $root;
            fullSel     = fullSel || [];
            fullAlias   = fullAlias || [];

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
                        }
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
     */
    var Bind = function (ref, $el, relation) {
        var mode = Util.isObject(relation) ? 'active' : 'passive';

        if (mode === 'active') {
            Util.each(relation, function (v, p) {
                // TODO
            });
        } else {

        }
    };

    return {
        util: Util,
        alias: Alias,
        bind: Bind
    };
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = rand_803763970;
    }
} else {
    window.domod = rand_803763970;
}
