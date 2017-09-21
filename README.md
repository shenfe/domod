# domod

![gzipped](http://img.badgesize.io/https://raw.githubusercontent.com/shenfe/domod/master/dist/domod.min.js?compression=gzip)

蝇级的数据绑定, 支持模板声明式和函数命令式.

## API

```html
<script src="path/to/domod.js" charset="utf-8"></script>

<input id="input1" type="text" m-value="$value">
<div id="div1"
    m-class="['some-class', { red: $color === 'red' }]"
    m-style="{ display: !!$value ? 'block' : 'none' }">
    You input: {{$value}}
</div>

<script>
    var store = {
        value: '1',
        color: 'blue'
    };
    domod(document.getElementById('input1'), store);
    domod(document.getElementById('div1'), store);
</script>
```

## License

MIT
