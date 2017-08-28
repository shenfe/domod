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

console.log(JSON.stringify(obj3))

const obj4 = Relate({
    'text': {
        resultFrom: () => {
            return `${obj1.name} is ${obj1.age} years old, and ${obj2.name} is ${obj2.age} years old`
        }
    },
    'grow': {
        resultIn: n => {
            obj1.age += n
            obj2.age += n
        }
    }
});

console.log(obj4.text)

obj4.grow = 1
console.log(obj4.text)
obj4.grow = 2
console.log(obj4.text)
