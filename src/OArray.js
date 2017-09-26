import * as Util from './Util'

var canUseProxy = typeof Proxy === 'function';

var OArray = function (arr, option) {
    if (Util.isObject(arr) && arguments.length === 1) option = arr;
    if (!Util.isArray(arr)) arr = [];

    Object.defineProperty(this, '__data', {
        value: arr
    });

    Object.defineProperty(this, 'length', {
        get: function () {
            return arr.length;
        },
        set: function (v) {
            arr.length = v;
        }
    });

    var _this = this;

    var eventNames = ['set', 'push', 'pop', 'unshift', 'shift', 'splice'];
    eventNames.forEach(function (e) {
        Object.defineProperty(_this, 'on' + e, { value: [] });
    });
    eventNames.forEach(function (e) {
        _this.addEventListener(e, option['on' + e]);
    });

    Util.each(arr, function (v, i) {
        _this.assignElement(i);
    });
};

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.addEventListener = function (eventName, handler) {
    if (!this['on' + eventName] || !Util.isFunction(handler)) return;
    this['on' + eventName].push(handler);
};
OArray.prototype.on = OArray.prototype.addEventListener;

OArray.prototype.removeEventListener = function (eventName, handler) {
    var _this = this;
    if (!this['on' + eventName] || !Util.isFunction(handler)) return;
    var handlers = this['on' + eventName];
    Util.each(handlers, function (h, i) {
        if (h === handler) {
            handlers.splice(i, 1);
            return false;
        }
    });
};
OArray.prototype.off = OArray.prototype.removeEventListener;

OArray.prototype.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    Util.each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};
OArray.prototype.trigger = OArray.prototype.dispatchEvent;

OArray.prototype.assignElement = function (i) {
    Object.defineProperty(this, i, {
        get: function () {
            return this.__data[i];
        },
        set: function (val) {
            var e = this.__data[i];
            if (Util.isBasic(e) || Util.isBasic(val)) {
                this.dispatchEvent('set', e, val, i, this.__data);
                e = val;
                this.__data[i] = e;
            } else {
                Util.extend(e, val, true);
            }
        },
        configurable: true,
        enumerable: true
    });
};
OArray.prototype.deleteElement = function () {
    if (this.hasOwnProperty(this.length - 1)) delete this[this.length - 1];
};

['push', 'unshift'].forEach(function (f) {
    OArray.prototype[f] = function (v) {
        this.__data[f](v);
        this.assignElement(this.length - 1);
        this.dispatchEvent(f, v);
    };
});
['pop', 'shift'].forEach(function (f) {
    OArray.prototype[f] = function () {
        this.dispatchEvent(f, this.__data[f === 'pop' ? (this.length - 1) : 0]);
        this.deleteElement();
        this.__data[f]();
    };
});

OArray.prototype.toArray = function (notClone) {
    return notClone ? this.__data : Util.clone(this.__data);
};

OArray.prototype.splice = function (startIndex, howManyToDelete, itemToInsert) {
    if (!Util.isNumber(startIndex) || startIndex < 0) startIndex = 0;
    if (startIndex >= this.length) startIndex = this.length;
    if (!Util.isNumber(howManyToDelete) || howManyToDelete < 0) howManyToDelete = 0;
    if (howManyToDelete + startIndex > this.length) howManyToDelete = this.length - startIndex;

    var itemsToDelete = [];
    for (var i = startIndex; i < startIndex + howManyToDelete; i++) {
        itemsToDelete.push(Util.clone(this[i]));
    }

    var itemsToInsert = Array.prototype.slice.call(arguments, 2);
    var howManyToInsert = itemsToInsert.length;

    var howManyToSet = Math.min(howManyToDelete, howManyToInsert);
    for (var j = startIndex; j < startIndex + howManyToSet; j++) {
        this[j] = itemsToInsert[j - startIndex];
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
};

OArray.prototype.forEach = function (fn) {
    for (var i = 0; i < this.length; i++) {
        var r = fn(this[i], i);
        if (r === false) break;
    }
};

['reverse', 'sort'].forEach(function (f) {
    OArray.prototype[f] = function () {
        var r = Util.clone(this.__data);
        Array.prototype[f].apply(r, arguments);
        for (var i = 0; i < this.length; i++) {
            this[i] = r[i];
        }
    };
});

['slice', 'concat', 'filter', 'map', 'reduce',
    'indexOf', 'find', 'findIndex', 'fill', 'join'].forEach(function (f) {
    OArray.prototype[f] = function () {
        return Array.prototype[f].apply(this.toArray(), arguments);
    };
});

export default OArray
