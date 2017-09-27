# ObservableArray

“更改可监听”的数组数据。

## Construct

可使用以下几种方式构造：

```js
var oarr = new OArray();
var oarr = new OArray(arr);
var oarr = new OArray({
    /* event handlers */
});
var oarr = new OArray(arr, {
    /* event handlers */
});
```

实例的使用方式和普通数组实例相同。

## Observe (Event Handlers)

可通过构造函数传入事件处理钩子函数，也可以通过对实例调用addEventListener/removeEventListener方法或on/off方法添加/删除事件监听。

### push, unshift, pop, shift

这四个事件处理函数都接收一个参数。push和unshift处理已被添加的元素值；pop和shift处理将被删除的元素值。

### splice

splice事件处理函数接收的参数与数组的splice方法接收的参数类似，但更为简单，分两种情况：

1. 起始索引位置，被删除元素个数
2. 起始索引位置，0，被插入元素

### set

set事件发生在某个索引位置元素被重新赋值时。set事件处理函数接收的参数有4个：

1. 元素旧值
2. 元素新值
3. 元素索引
4. 数组引用

## get / set

考虑`Object.defineProperty`特性支持问题，在高级浏览器中，可以直接使用与原生数组相同的`[]`索引方式赋值，并同时根据情况触发`set`事件；而在低级浏览器中要达到此目的需通过`set`方法赋值。

```js
oarr.set(i, 'foo');
```
