const OArray = require('../dist/OArray.js')

let arr0 = [1, 2, 3, 4, 5]

let arr1 = new OArray(arr0, {
    onpush: item => {
        console.log('push', item)
    },
    onunshift: item => {
        console.log('unshift', item)
    },
    onpop: item => {
        console.log('pop', item)
    },
    onshift: item => {
        console.log('shift', item)
    },
    onsplice: (start, howManyToDelete, ...itemsToInsert) => {
        console.log('splice', start, howManyToDelete, itemsToInsert)
    },
    onset: (e, val, i) => {
        console.log('set', e, val, i)
    }
})

arr1.pop()
console.log(arr1.__data)
arr1.push(6)
console.log(arr1.__data)
arr1[2] = 'this is 2'
console.log(arr1.__data)
arr1.shift()
console.log(arr1.__data)
arr1.unshift(0)
console.log(arr1.__data)
arr1.splice(4, 1, 'foo', 'bar')
console.log(arr1.__data)
