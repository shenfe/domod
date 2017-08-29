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
    ageTotal: 0,
    growth: undefined
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

console.log(JSON.stringify(obj3))

const obj4 = Relate({
    'text': {
        resultFrom: () => {
            return `${obj1.name} is ${obj1.age} years old, and ${obj2.name} is ${obj2.age} years old`
        }
    },
    'grow': {
        value: 'init',
        resultIn: n => {
            obj1.age += n
            obj2.age += n
        }
    }
});

// let k1 = new Kernel(obj4, 'grow', {
//     dnstream: [{
//         root: obj3,
//         alias: 'growth'
//     }]
// })
let k2 = new Kernel(obj3, 'growth', {
    resultFrom: v => `grow by ${v}`,
    upstream: [{
        root: obj4,
        alias: 'grow'
    }]
})
k2.disable()
console.log(obj3.growth)

console.log(obj4.text)

console.log(obj4.grow)

obj4.grow = 1
console.log(obj4.text)
console.log(obj3.growth)

k2.enable()
obj4.grow = 2
console.log(obj4.text)
console.log(obj3.growth)
