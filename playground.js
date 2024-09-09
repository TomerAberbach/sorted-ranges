/* eslint-disable unicorn/no-useless-spread */

import { SortedRangeMap, SortedRangeSet } from 'sorted-ranges'

const rangeSet = new SortedRangeSet()

rangeSet.add([5, 6])
console.log([...rangeSet]) //=> [ [ 5, 6 ] ]

console.log(rangeSet.has(4)) //=> false
console.log(rangeSet.has(5)) //=> true
console.log(rangeSet.hasAll([4, 6])) //=> false
console.log(rangeSet.hasAll([5, 6])) //=> true
console.log(rangeSet.hasAny([4, 6])) //=> true
console.log(rangeSet.hasAny([1, 3])) //=> false

rangeSet.add([1, 4])
console.log([...rangeSet]) //=> [ [ 1, 6 ] ]
rangeSet.add([3, 7])
console.log([...rangeSet]) //=> [ [ 1, 7 ] ]
rangeSet.add([-4, -2])
console.log([...rangeSet]) //=> [ [ -4, -2 ], [ 1, 7 ] ]

rangeSet.delete([3, 5])
console.log([...rangeSet]) //=> [ [ -4, -2 ], [ 1, 2 ], [ 6, 7 ] ]
rangeSet.delete([-5, 0])
console.log([...rangeSet]) //=> [ [ 1, 2 ], [ 6, 7 ] ]

console.log(rangeSet.at(0)) //=> [ 1, 2 ]
console.log(rangeSet.at(1)) //=> [ 6, 7 ]
console.log(rangeSet.at(-1)) //=> [ 6, 7 ]

console.log(rangeSet.indexOf(0)) //=> -1 (~insertIndex)
console.log(rangeSet.indexOf(1)) //=> 0
console.log(rangeSet.indexOf(2)) //=> 0
console.log(rangeSet.indexOf(6)) //=> 1
console.log(rangeSet.indexOf(7)) //=> 1
console.log(rangeSet.indexOf(8)) //=> -3 (~insertIndex)

console.log(rangeSet.get(2)) //=> [ 1, 2 ]
console.log(rangeSet.get(6)) //=> [ 6, 7 ]

console.log(rangeSet.size) //=> 2
console.log([...rangeSet.keys()]) //=> [ 1, 2, 6, 7 ]
console.log([...rangeSet.slice([2, 6])]) //=> [ [ 2, 2 ], [ 6, 6 ] ]

rangeSet.clear()
console.log([...rangeSet]) // => []

const rangeMap = new SortedRangeMap()

rangeMap.set([5, 6], 42)
console.log([...rangeMap]) //=> [ [ [ 5, 6 ], 42 ] ]

console.log(rangeMap.has(4)) //=> false
console.log(rangeMap.has(5)) //=> true
console.log(rangeMap.hasAll([4, 6])) //=> false
console.log(rangeMap.hasAll([5, 6])) //=> true
console.log(rangeMap.hasAny([4, 6])) //=> true
console.log(rangeMap.hasAny([1, 3])) //=> false

rangeMap.set([1, 4], 42)
console.log([...rangeMap]) //=> [ [ [ 1, 6 ], 42 ] ]
rangeMap.set([3, 7], 3)
console.log([...rangeMap]) //=> [ [ [ 1, 2 ], 42 ], [ [ 3, 7 ], 3 ] ]
rangeMap.set([-4, -2], 8)
console.log([...rangeMap]) //=> [ [ [ -4, 2 ], 8 ], [ [ 1, 2 ], 42 ], [ [ 3, 7 ], 3 ] ]

rangeMap.delete([3, 5])
console.log([...rangeMap]) //=> [ [ [ -4, 2 ], 8 ], [ [ 1, 2 ], 42 ], [ [ 6, 7 ], 3 ] ]
rangeMap.delete([-5, 0])
console.log([...rangeMap]) //=> [ [ [ 1, 2 ], 42 ], [ [ 6, 7 ], 3 ] ]

console.log(rangeMap.at(0)) //=> [ [ 1, 2 ], 42 ]
console.log(rangeMap.at(1)) //=> [ [ 6, 7 ], 3 ]
console.log(rangeMap.at(-1)) //=> [ [ 6, 7 ], 3 ]

console.log(rangeMap.indexOf(0)) //=> -1 (~insertIndex)
console.log(rangeMap.indexOf(1)) //=> 0
console.log(rangeMap.indexOf(2)) //=> 0
console.log(rangeMap.indexOf(6)) //=> 1
console.log(rangeMap.indexOf(7)) //=> 1
console.log(rangeMap.indexOf(8)) //=> -3 (~insertIndex)

console.log(rangeMap.get(2)) //=> [ [ 1, 2 ], 42 ]
console.log(rangeMap.get(6)) //=> [ [ 6, 7 ], 3 ]

console.log(rangeMap.size) //=> 2
console.log([...rangeMap.ranges()]) //=> [ [ 1, 2 ], [ 6, 7 ] ]
console.log([...rangeMap.keys()]) //=> [ 1, 2, 6, 7 ]
console.log([...rangeMap.values()]) //=> [ 42, 3 ]
console.log([...rangeMap.slice([2, 6])]) //=> [ [ [ 2, 2 ], 42 ], [ [ 6, 6 ], 3 ] ]

rangeMap.clear()
console.log([...rangeMap]) // => []
