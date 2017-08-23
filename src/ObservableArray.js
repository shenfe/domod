import * as Util from './Util'

var canUseProxy = typeof Proxy === 'function';

var OArray = function (arr, option) {
    if (!Util.isArray(arr)) arr = [];

    var _this = this;

    Object.defineProperty(this, '__data', {
        value: arr
    });

    ['set', 'push', 'pop', 'unshift', 'shift', 'splice'].forEach(function (e) {
        Object.defineProperty(_this, 'on' + e, { value: [] });
    });

    Object.defineProperty(this, 'length', {
        get: function () {
            return arr.length;
        },
        set: function (v) {
            arr.length = v;
        }
    });

    Util.each(arr, function (v, i) {
        _this.assignElement(i, v);
    });
};

OArray.prototype = [];
OArray.prototype.constructor = OArray;

OArray.prototype.addEventListener = function (eventName, handler) {
    if (!this['on' + eventName] || !Util.isFunction(handler)) return;
    this['on' + eventName].push(handler);
};
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
OArray.prototype.dispatchEvent = function (eventName, args) {
    args = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    Util.each(this['on' + eventName], function (handler) {
        handler.apply(_this, args);
    });
};

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
    if (this.hasOwnProperty(this.length - 1))
        delete this[this.length - 1];
};

OArray.prototype.push = function (v) {
    this.__data.push(v);
    this.assignElement(this.length - 1);
    this.dispatchEvent('push', v);
};

OArray.prototype.pop = function (v) {
    this.deleteElement();
    this.__data.pop();
    this.dispatchEvent('pop');
};

OArray.prototype.unshift = function (v) {
    this.__data.unshift(v);
    this.assignElement(this.length - 1);
    this.dispatchEvent('unshift', v);
};

OArray.prototype.shift = function (v) {
    this.deleteElement();
    this.__data.shift();
    this.dispatchEvent('shift');
};

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
    for (var i = startIndex; i < startIndex + howManyToSet; i++) {
        this[i] = itemsToInsert[i - startIndex];
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
