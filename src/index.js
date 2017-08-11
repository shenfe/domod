polyfill: {}

var rand_803763970 = (function () {
    /**
     * Utilities.
     * @type {Object}
     */
    var Util = {
        isNumber: function (v) {
            return typeof v === 'number';
        },
        isNumeric: function (v) {
            var n = parseInt(v);
            if (isNaN(n)) return false;
            return (typeof v === 'number' || typeof v === 'string') && n == v;
        },
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
        isBasic: function (v) {
            return v == null
                || typeof v === 'boolean'
                || typeof v === 'number'
                || typeof v === 'string'
                || typeof v === 'function';
        },
        isAlias: function (v) {
            return typeof AliasDOM === 'function' && v instanceof AliasDOM;
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
        isCSSSelector: function (v) {
            return v.indexOf(' ') > 0 || v.indexOf('.') >= 0
                || v.indexOf('[') >= 0 || v.indexOf('#') >= 0;
        },
        each: function (v, func, arrayReverse) {
            if (Util.isObject(v)) {
                for (var p in v) {
                    if (!v.hasOwnProperty(p)) continue;
                    var r = func(v[p], p);
                    if (r === false) break;
                }
            } else if (Util.isArray(v)) {
                if (!arrayReverse) {
                    for (var i = 0, len = v.length; i < len; i++) {
                        var r = func(v[i], i);
                        if (r === false) break;
                    }
                } else {
                    for (var i = v.length - 1; i >= 0; i--) {
                        var r = func(v[i], i);
                        if (r === false) break;
                    }
                }
            } else if (Util.isNode(v)) {
                var ret = false;
                switch (v.nodeType) {
                    case Node.ELEMENT_NODE:
                        break;
                    case Node.TEXT_NODE:
                    case Node.COMMENT_NODE:
                    case Node.PROCESSING_INSTRUCTION_NODE:
                    case Node.DOCUMENT_NODE:
                    case Node.DOCUMENT_TYPE_NODE:
                    case Node.DOCUMENT_FRAGMENT_NODE:
                    default:
                        ret = true;
                }
                if (ret) return;
                for (var i = 0, childNodes = v.childNodes, len = v.childNodes.length; i < len; i++) {
                    func(childNodes[i]);
                    Util.each(childNodes[i], func);
                }
            } else if (Util.isNamedNodeMap(v)) {
                for (var i = 0, len = v.length; i < len; i++) {
                    var r = func(v[i]['nodeValue'], v[i]['nodeName']);
                    if (r === false) break;
                }
            }
        },
        clone: function (val) {
            var r = val;
            if (Util.isObject(val)) {
                r = {};
                Util.each(val, function (v, p) {
                    r[p] = Util.clone(v);
                });
            } else if (Util.isArray(val)) {
                r = [];
                Util.each(val, function (v) {
                    r.push(Util.clone(v));
                });
            }
            return r;
        },
        hasProperty: function (val, p) {
            if (Util.isObject(val)) {
                return val.hasOwnProperty(p);
            } else if (Util.isArray(val)) {
                var n = parseInt(p);
                return Util.isNumeric(p) && val.length > n && n >= 0;
            }
            return false;
        },
        clear: function (val, p) {
            var inRef = Util.isString(p) || Util.isNumber(p);
            var target = inRef ? val[p] : val;

            if (Util.isObject(target) || Util.isArray(target)) {
                Util.each(target, function (v, p) {
                    Util.clear(target, p);
                });
                if (Util.isArray(target)) {
                    Util.shrinkArray(target);
                }
            }

            if (inRef) {
                val[p] = undefined;
            }
        },
        shrinkArray: function (arr, len) {
            var limited = Util.isNumber(len);
            if (!limited) {
                Util.each(arr, function (v, i) {
                    if (v === undefined) arr.length--;
                }, true);
            } else {
                Util.each(arr, function (v, i) {
                    if (i >= len) arr.length--;
                    else return false;
                }, true);
                while (arr.length < len) {
                    arr.push(null);
                }
            }
            return arr;
        },
        extend: function (dest, srcs, clear) {
            if (!Util.isObject(dest)) return null;
            var args = Array.prototype.slice.call(arguments, 1,
                arguments[arguments.length - 1] === true ? (arguments.length - 1) : arguments.length);

            var extendObj = function (obj, src, clear) {
                if (!Util.isObject(src)) return;
                Util.each(src, function (v, p) {
                    if (!Util.hasProperty(obj, p) || Util.isBasic(v)) {
                        obj[p] = Util.clone(v);
                    } else {
                        extendObj(obj[p], v, clear);
                    }
                });
                if (clear) {
                    Util.each(obj, function (v, p) {
                        if (!Util.hasProperty(src, p)) {
                            Util.clear(obj, p);
                        }
                    });
                    if (Util.isArray(obj)) {
                        Util.shrinkArray(obj);
                    }
                }
            };

            Util.each(args, function (src) {
                extendObj(dest, src, clear);
            });
            return dest;
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
        var _this = this;

        if (Util.isAlias($el)) {
            Util.each($el, function (dom) {
                Bind(ref, dom);
            });
            return;
        }

        if (!Util.isNode($el)) return;

        var mode = Util.isObject(relation) ? 'active' : 'passive';

        if (mode === 'active') {
            Util.each(relation, function (v, p) {
                switch (p) {
                    case 'show':
                    case 'innerText':
                    case 'innerHTML':
                    case 'className':
                    case 'style':
                        break;
                    default:
                        var pNum = parseInt(p);
                        if (!isNaN(pNum)) { /* Node Index */
                        } else if (Util.isEventName(p)) { /* Event */
                        } else if (Util.isCSSSelector(p)) { /* CSS Selector */
                        } else { /* Attribute */
                        }
                }
            });
        } else {
            if ($el.nodeType === Node.ELEMENT_NODE) {
                Util.each($el.attributes, function (value, name) {
                    if (!name.startsWith(_this.attrPrefix)) return;
                    name = name.substr(_this.attrPrefix.length);
                    switch (name) {
                        case 'show':
                            break;
                        case 'text':
                            break;
                        case 'html':
                            break;
                        case 'class':
                            break;
                        case 'style':
                            break;
                        default:
                            if (Util.isEventName(name)) { /* Event */
                            } else { /* Attribute */
                            }
                    }
                });
                Util.each($el, function (node) {
                    Bind(ref, node);
                });
            } else if ($el.nodeType === Node.TEXT_NODE) {
                // TODO
            }
        }
    };

    var allocId = (function () {
        var n = 0;
        return function () {
            return n++;
        };
    })();

    var DefaultConf = {
        attrPrefix: 'm-',
        tmplEngine: {
            parseDeps: function (tmpl) {

            },
            classParser: function () {},
            styleParser: function () {},
            eventParser: function () {},
            attrValueParser: function () {},
            textValueParser: function () {}
        }
    };

    var DMD = function ($el, option) {
        this.$el = $el || window.document.body;

        this.defaults = {};
        Util.extend(this.defaults, DefaultConf, option);
    };

    var DMDDefs = {
        realRefs: 'DMD_REAL_REFs',
        darkRef: '__DMD_DARK_REF',
        refSeparator: '/'
    };
    var DMDRefSpace = {};

    /**
     * Bind an object data.
     * @param  {Object} data                [description]
     * @param  {Boolean} force              [description]
     * @return {[type]}                     [description]
     */
    var BindData = function (data, force) {
        if (!Util.isObject(data)) return false;
        if (data[DMDDefs.darkRef] !== undefined && !force) return;

        var id = allocId();
        Object.defineProperty(data, DMDDefs.darkRef, {
            get: function () {
                return id;
            },
            enumerable: false
        });
        DMDRefSpace[id] = {
            data: data,
            props: {},
            paths: {}
        };

        var bindProps = function (node, obj) {
            if (!Util.isObject(obj)) return;
            node.props = {};
            Util.each(obj, function (v, p) {
                node.props[p] = {
                    setters: []
                };
                bindProps(node.props[p], v);
            });
        };
        bindProps(DMDRefSpace[id], data);

        var setSetters = function (obj, node) {
            Util.each(obj, function (v, p) {
                delete obj[p];
                Object.defineProperty(obj, p, {
                    get: function () {
                        return v;
                    },
                    set: function (_v) {
                        if (Util.isBasic(v)) {
                            v = _v;
                        } else {
                            if (Util.isBasic(_v)) {
                                Util.clear(obj, p);
                                v = _v;
                            } else {
                                Util.extend(v, _v, true);
                            }
                        }

                        var execSetters = function (node, v, oldv) {
                            Util.each(node.setters, function (setter) {
                                setter(v, oldv);
                            });
                            // Util.each(node.props, function (pv, pn) {
                            //     execSetters(pv, v[pn], oldv[pn]);
                            // });
                        };
                        execSetters(node.props[p], v, _v);
                    },
                    enumerable: true
                });
                setSetters(v, node.props[p]);
            });
        };
        setSetters(data, DMDRefSpace[id]);
    };

    DMD[DMDDefs.realRefs] = DMDRefSpace;

    DMD.prototype.alias = function (map) {
        return Alias(map, this.$el);
    };
    DMD.prototype.bind = function (ref, relation) {
        BindData(ref);
        return Bind(ref, this.$el, relation);
    };

    var factory = function ($el, option) {
        return new DMD($el, option);
    };
    factory.defaults = Util.clone(DefaultConf);
    factory.alias = Alias;
    factory.bind = Bind;
    factory.data = BindData;
    return factory;
})();

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = rand_803763970;
    }
} else {
    window.DMD = rand_803763970;
}
