<p align="center"><img width="80"src="https://raw.githubusercontent.com/shenfe/domod/master/readme_assets/logo.png"></p>

# domod

![gzipped](http://img.badgesize.io/https://raw.githubusercontent.com/shenfe/domod/master/dist/domod.min.js?compression=gzip)

A lightweight data-binding (or so-called mvvm) library, providing both **declarative template** and **imperative call** ways.

## API

```html
<script src="path/to/domod.js" charset="utf-8"></script>

<form id="form1">
    <div>
        <label>gender:</label>
        <input m-onclick="$form.gender = 'male'" 
               type="radio" name="gender" value="male" m-checked="$form.gender === 'male'">Male
        <input m-onclick="$form.gender = 'female'" 
               type="radio" name="gender" value="female" m-checked="$form.gender === 'female'">Female
    </div>
    <div>
        <label>mobile:</label>
        <input type="text" name="mobile" m-value="$form.mobile">
        <span m-style="{ display: !!$form.mobile ? 'inline' : 'none' }">
            You input: {{$parse($form.mobile)}}.
        </span>
        <span m-class="['some-class', { red: !$mobileInputStatus }]" 
              m-style="{ display: !$mobileInputStatus ? 'inline' : 'none' }">
            {{$form.mobile}} is {{$mobileInputStatus}}!
        </span>
    </div>
    <div>
        <label>age:</label>
        <select name="age" m-value="$form.age.value">
            <option m-each="$val in $form.age.options" m-value="$val">{{$val}}</option>
        </select>
    </div>
    <div>
        <label>city:</label>
        <select name="city" m-value="$form.city.value">
            <option m-each="($val, $key) in $form.city.options" m-value="$key">
                {{$val.code}}.{{$val.name}}
            </option>
        </select>
    </div>
</form>

<script>
    var store = {
        parse: function (v) {
            return parseInt(v);
        },
        validateMobile: function () {
            return /^1[3|4|5|8][0-9]\d{8}$/.test(this.form.mobile);
        },
        form: {
            gender: 'female',
            mobile: '15210001000',
            age: {
                value: '37-54',
                options: [
                    '0-18',
                    '19-36',
                    '37-54',
                    '55-200'
                ]
            },
            city: {
                value: '1',
                options: [
                    { code: 1, name: 'beijing' },
                    { code: 2, name: 'newyork' },
                    { code: 3, name: 'tokyo' },
                    { code: 4, name: 'london' },
                    { code: 5, name: 'paris' }
                ]
            }
        }
    };

    /* Watch a property mutation */
    store.mobileInputStatus = store.validateMobile();
    DMD.relate(store, {
        'form.mobile': {
            dnstream: 'mobileInputStatus',
            resultIn: function (v) {
                var newVal = store.validateMobile();
                console.log(`mobile is ${newVal}`);
                DMD.$(store, 'mobileInputStatus', newVal);
            }
        }
    });

    DMD('#form1', store);
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

## Standalone Libraries

### Kernel

See the [code](https://github.com/shenfe/domod/blob/master/src/Kernel.js) and [doc](https://github.com/shenfe/domod/blob/master/doc/Kernel.md) for more.

### ObservableArray

Also called OArray for short. See the [code](https://github.com/shenfe/domod/blob/master/src/OArray.js) and [doc](https://github.com/shenfe/domod/blob/master/doc/ObservableArray.md) for more.

## License

MIT
