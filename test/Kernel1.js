const { Kernel, Relate } = require('../dist/Kernel.js')

const obj1 = {
    name: 'Tom',
    age: 12
}

const obj2 = {
    name: 'Jerry',
    age: 10
}

const obj3 = {
    names: [],
    ageTotal: 0
}

Relate(obj3, {
    'names': {
        upstream: [{
            root: obj1,
            alias: 'name'
        }, {
            root: obj2,
            alias: 'name'
        }],
        resultFrom: (name1, name2) => [name1].concat(name2)
    },
    'ageTotal': {
        upstream: [{
            root: obj1,
            alias: 'age'
        }, {
            root: obj2,
            alias: 'age'
        }],
        resultFrom: (age1, age2) => (age1 + age2)
    }
})

console.log(obj3.names)
// console.log(JSON.stringify(obj3))
