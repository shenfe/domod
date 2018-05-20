import * as Util from './Util'

var canUseProxy = typeof Proxy === 'function';

function defineProperty(target, prop, desc) {
    if (Object.defineProperty) {
        Object.defineProperty(target, prop, desc);
    } else {
        if ('value' in desc) {
            target[prop] = desc.value;
        }
    }
}

function OArray(arr, option) {
    if (Util.isObject(arr) && arguments.length === 1) option = arr;
    if (!Util.isArray(arr)) arr = [];
    if (!option) option = {};

    defineProperty(this, '__data', {
        value: arr
    });

    defineProperty(this, 'length', {
        get: function () {
            return arr.length;
        },
        set: function (v) {
            arr.length = v;
        }
    });

    var _this = this;

    var eventNames = ['set', 'push', 'pop', 'unshift', 'shift', 'splice', 'resize'];
    eventNames.forEach(function (e) {
        defineProperty(_this, 'on' + e, { value: [] });
    });
    eventNames.forEach(function (e) {
        _this.addEventListener(e, option['on' + e]);
    });

    Util.each(arr, function (v, i) {
        _this.assignElement(i);
    });
}

OArray.prototype = [];

var __proto__ = OArray.prototype;

__proto__.constructor = OArray;

__proto__.on = __proto__.addEventListener = function (eventName, handler) {
    var _this = this;
    if (Util.isObject(eventName)) {
        Util.each(eventName, function (hdl, evt) {
            _this.addEventListener(evt, hdl);
        });
        return;
    }
    if (!this['on' + eventName] || !Util.isFunction(handler)) return;
    this['on' + eventName].push(handler);
};

__proto__.off = __proto__.removeEventListener = function (eventName, handler) {
    var _this = this;
    if (Util.isObject(eventName)) {
        Util.each(eventName, function (hdl, evt) {
            _this.removeEventListener(evt, hdl);
        });
        return;
    }
    if (!this['on' + eventName] || !Util.isFunction(handler)) return;
    var handlers = this['on' + eventName];
    Util.each(handlers, function (h, i) {
        if (h === handler) {
            handlers.splice(i, 1);
            return false;
        }
    });
};

__proto__.trigger = __proto__.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    Util.each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};

__proto__.get = function (i) {
    return this.__data[i];
};

__proto__.set = function (i, v) {
    var e = this.__data[i];
    if (Util.isBasic(e) || Util.isBasic(v)) {
        this.dispatchEvent('set', e, v, i, this.__data);
        this.__data[i] = v;
    } else {
        Util.extend(e, v, true);
    }
};

__proto__.assignElement = function (i) {
    defineProperty(this, i, {
        get: function () {
            return this.get(i);
        },
        set: function (val) {
            this.set(i, val);
        },
        configurable: true,
        enumerable: true
    });
};
__proto__.deleteElement = function () {
    if (this.hasOwnProperty(this.length - 1)) delete this[this.length - 1];
};

['push', 'unshift'].forEach(function (f) {
    __proto__[f] = function (v) {
        this.__data[f](v);
        this.assignElement(this.length - 1);
        this.dispatchEvent(f, v);
        this.dispatchEvent('resize');
    };
});
['pop', 'shift'].forEach(function (f) {
    __proto__[f] = function () {
        this.dispatchEvent(f, this.__data[f === 'pop' ? (this.length - 1) : 0]);
        this.deleteElement();
        this.__data[f]();
        this.dispatchEvent('resize');
    };
});

__proto__.toArray = function (notClone) {
    return notClone ? this.__data : Util.clone(this.__data);
};

__proto__.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!Util.isNumber(startIndex) || startIndex < 0) startIndex = 0;
    if (startIndex >= this.length) startIndex = this.length;
    if (!Util.isNumber(howManyToDelete) || howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.length) howManyToDelete = this.length - startIndex;

    var itemsToDelete = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        itemsToDelete.push(Util.clone(this.get(i)));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    var howManyToInsert = itemsToInsert.length;

    var howManyToSet = Math.min(howManyToDelete, howManyToInsert);
    for (var j = startIndex; j < startIndex + howManyToSet; j++) {
        this.set(j, itemsToInsert[j - startIndex]);
    }

    if (howManyToDelete === howManyToInsert) return;

    var args;
    if (howManyToDelete > howManyToInsert) {
        args = [startIndex + howManyToInsert, howManyToDelete - howManyToInsert];
        Array.prototype.splice.apply(this.__data, args);
    } else {
        args = [startIndex + howManyToDelete, 0].concat(itemsToInsert.slice(howManyToDelete));
        Array.prototype.splice.apply(this.__data, args);
    }
    this.dispatchEvent.apply(this, ['splice'].concat(args));
    this.dispatchEvent('resize');
};

__proto__.forEach = function (fn) {
    for (var i = 0; i < this.length; i++) {
        var r = fn(this.get(i), i);
        if (r === false) break;
    }
};

['reverse', 'sort'].forEach(function (f) {
    __proto__[f] = function () {
        var r = Util.clone(this.__data);
        Array.prototype[f].apply(r, arguments);
        for (var i = 0; i < this.length; i++) {
            this.set(i, r[i]);
        }
    };
});

['slice', 'concat', 'filter', 'map', 'reduce',
    'indexOf', 'find', 'findIndex', 'fill', 'join'].forEach(function (f) {
    __proto__[f] = function () {
        return Array.prototype[f].apply(this.toArray(), arguments);
    };
});

__proto__.clear = function () {
    while (this.length) {
        this.pop();
    }
    return this;
};

__proto__.cast = function (arr) {
    return this.splice.apply(this, [0, this.length].concat(arr));
};

export default OArray
