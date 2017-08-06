var db = function ($el) {};

var Util = {
    isString: function (v) { return typeof v === 'string'; },
    isFunction: function (v) { return typeof v === 'function'; },
    isObject: function (v) { return Object.prototype.toString.call(v) === '[object Object]'; },
    isArray: function (v) { return Object.prototype.toString.call(v) === '[object Array]'; },
    each: function (v, func) {
        if (Util.isObject(v)) {
            for (var p in v) {
                if (!v.hasOwnProperty(p)) continue;
                var r = func(v[p], p);
                if (r === false) break;
            }
        } else if (Util.isArray(v)) {
            for (var i = 0, len = v.length; i < len; i++) {
                var r = func(v[i]);
                if (r === false) break;
            }
        }
    }
};

var Alias = function (map, $el) {
    function alias(map, $root, obj, fullSel) {
        map = map || {};
        if (Util.isString(map)) {
            map = {
                alias: map
            };
        }

        fullSel = fullSel || '';

        if (!map.alias) {
            map.alias = 'a_' + Date.now();
        }

        function querySelector($parent, sel) {
            var $targets = Array.prototype.slice.call($parent.querySelectorAll(sel));
            if ($targets.length < 1) {
                return null;
            } else if ($targets.length === 1) {
                return $targets[0];
            } else {
                return $targets;
            }
        }

        if (map.lazy) {
            Object.defineProperty(obj, map.alias, {
                get: function () {
                    return fullSel ? querySelector(this.__root, fullSel) : this.__root;
                }
            });
        } else {
            obj[map.alias] = fullSel ? querySelector($root, fullSel) : $root;
        }

        Util.each(map, function (v, sel) {
            if (sel === 'alias' || sel === 'lazy') return;
            alias(v, $root, obj, fullSel ? (fullSel + ' ' + sel) : sel);
        });

        return obj;
    }

    inherit_lazy_property: {
        function lazyDown(map) {
            if (!Util.isObject(map)) return;
            if (map.lazy) {
                Util.each(map, function (v, p) {
                    if (p === 'alias' || p === 'lazy') return;
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
    }

    $el = $el || window.document.body;

    var obj = {
        __root: $el
    };

    return alias(map, $el, obj);
};

var bind = function ($el, data) {
    ensure_dom_attributes: {

    }
};

module.exports = {
    alias: Alias,
    bind: bind
};
