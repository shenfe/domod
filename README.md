# domod

![gzipped](http://img.badgesize.io/https://raw.githubusercontent.com/shenfe/domod/master/dist/domod.min.js?compression=gzip)

A super lightweight data-binding (or so-called mvvm) library, providing both **declarative template** and **imperative call** ways.

## API

```html
<script src="path/to/domod.js" charset="utf-8"></script>

<input id="input1" type="text" m-value="$value">
<div id="div1"
    m-class="['some-class', { 'red-color': $color === 'red' }]"
    m-style="{ display: !!$value ? 'block' : 'none' }">
    You input: {{$value}}
</div>

<script>
    var store = {
        value: '1',
        color: 'green'
    };
    domod(document.getElementById('input1'), store);
    domod(document.getElementById('div1'), store);
</script>
```

## Advance

### Imperative Calling

Providing a data object:

```js
var store = {
    value: '1'
};
```

Now assign a property `color` which would be computed from the property `value`.

There are two methods available, `kernel` and `relate`.

The `kernel` method, which is actually a constructor function, accepts two parameters besides the data object: the property and its relation object.

```js
new domod.kernel(store, 'color', {
    resultFrom: function () {
        return isNaN(parseInt(store.value)) ? 'red' : 'green';
    }
});
```

The `relate` method, which is somehow a composition of `kernel`, accepts one parameter besides the data object: an object representing a map from property names to relation objects.

```js
domod.relate(store, {
    color: {
        resultFrom: function () {
            return isNaN(parseInt(store.value)) ? 'red' : 'green';
        }
    }
});
```

### Relation Object

A relation object can be declared with these properties:

Property | Effect
:---: | :---
resultFrom | Do when the property is being got, and return the value computed.
resultIn | Do when the property is being set.
upstream | Other properties as the property's dependencies.
dnstream | Other properties as the property's effects.

## License

MIT
