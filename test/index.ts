import { expect } from 'vitest'
import { fc, test } from '@fast-check/vitest'
import { all, any, filter, map, pipe, rangeTo, reduce, toMap, toSet } from 'lfi'
import { SortedRangeMap, SortedRangeSet } from '../src/index.ts'
import type { Range, RangeEntry } from '../src/index.ts'

const indexArb = fc.integer({ min: -250, max: 250 })
const keyArb = fc.integer({ min: -100, max: 100 })
const rangeArb = fc
  .tuple(keyArb, keyArb)
  .map(([start, end]): Range => (start > end ? [end, start] : [start, end]))

test.each([
  [0.5, 1],
  [0, 1.5],
  [1, 0],
])(`SortedRangeSet throws a TypeError for bad input`, (...range) => {
  expect(() => new SortedRangeSet([range])).toThrow(TypeError)

  const set = new SortedRangeSet()
  expect(() => set.add(range)).toThrow(TypeError)
  expect(() => set.delete(range)).toThrow(TypeError)
  expect(() => set.slice(range)).toThrow(TypeError)
  expect(() => set.hasAll(range)).toThrow(TypeError)
  expect(() => set.hasAny(range)).toThrow(TypeError)
})

test.prop(
  [
    fc.oneof(fc.constantFrom(null, undefined), fc.array(rangeArb)),
    fc.commands(
      [
        // SortedRangeSet#add(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            for (const key of rangeTo(range[0], range[1])) {
              model.value.add(key)
            }

            expect(real.value.add(range)).toBe(real.value)
            expectDisjointSortedMinimalSet(real.value)
          },
          toString: () => `add(${fc.stringify(range)})`,
        })),

        // SortedRangeSet#delete(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            let deletionExpected = false
            for (const key of rangeTo(range[0], range[1])) {
              const deleted = model.value.delete(key)
              deletionExpected ||= deleted
            }

            expect(real.value.delete(range)).toBe(deletionExpected)
            expectDisjointSortedMinimalSet(real.value)
          },
          toString: () => `delete(${fc.stringify(range)})`,
        })),

        // SortedRangeSet#clear()
        fc.constant({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            model.value.clear()

            real.value.clear()
            expectDisjointSortedMinimalSet(real.value)
          },
          toString: () => `clear()`,
        }),

        // SortedRangeSet#slice(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            model.value = pipe(
              rangeTo(range[0], range[1]),
              filter(key => model.value.has(key)),
              reduce(toSet()),
            )

            real.value = real.value.slice(range)
            expectDisjointSortedMinimalSet(real.value)
          },
          toString: () => `slice(${fc.stringify(range)})`,
        })),

        // SortedRangeSet#has(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.has(key)).toBe(model.value.has(key))
          },
          toString: () => `has(${fc.stringify(key)})`,
        })),

        // SortedRangeSet#hasAll(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.hasAll(range)).toBe(
              pipe(
                rangeTo(range[0], range[1]),
                all(key => model.value.has(key)),
              ),
            )
          },
          toString: () => `hasAll(${fc.stringify(range)})`,
        })),

        // SortedRangeSet#hasAny(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.hasAny(range)).toBe(
              pipe(
                rangeTo(range[0], range[1]),
                any(key => model.value.has(key)),
              ),
            )
          },
          toString: () => `hasAny(${fc.stringify(range)})`,
        })),

        // SortedRangeSet#at(index)
        indexArb.map(index => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.at(index)).toStrictEqual(
              getRanges(model.value).at(index),
            )
          },
          toString: () => `at(${fc.stringify(index)})`,
        })),

        // SortedRangeSet#get(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.get(key)).toStrictEqual(
              getRanges(model.value).find(
                ([start, end]) => key >= start && key <= end,
              ),
            )
          },
          toString: () => `get(${fc.stringify(key)})`,
        })),

        // SortedRangeSet#indexOf(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            const ranges = getRanges(model.value)
            let index
            for (index = 0; index < ranges.length; index++) {
              const [start, end] = ranges[index]!
              if (key < start) {
                index = ~index
                break
              }
              if (key >= start && key <= end) {
                break
              }
            }
            if (index === ranges.length) {
              index = ~index
            }

            expect(real.value.indexOf(key)).toBe(index)
          },
          toString: () => `indexOf(${fc.stringify(key)})`,
        })),

        // SortedRangeSet#size
        fc.constant({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect(real.value.size).toBe(getRanges(model.value).length)
          },
          toString: () => `size`,
        }),

        // SortedRangeSet#[Symbol.iterator]()
        fc.constant({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect([...real.value]).toStrictEqual(getRanges(model.value))
          },
          toString: () => `[Symbol.iterator]()`,
        }),

        // SortedRangeSet#keys()
        fc.constant({
          check: () => true,
          run: (model: ModelSet, real: RealSet) => {
            expect([...real.value.keys()]).toStrictEqual(
              [...model.value.keys()].sort((key1, key2) => key1 - key2),
            )
          },
          toString: () => `keys()`,
        }),
      ],
      { size: `+2` },
    ),
  ],
  { numRuns: 1000 },
)(`SortedRangeSet works`, (entries, commands) => {
  fc.modelRun(() => {
    const model = new Set<number>()
    for (const [start, end] of entries ?? []) {
      for (let key = start; key <= end; key++) {
        model.add(key)
      }
    }

    return {
      model: { value: model },
      real: { value: new SortedRangeSet(entries) },
    }
  }, commands)
})

const expectDisjointSortedMinimalSet = (map: SortedRangeSet) => {
  const entries = [...map]
  for (const [start, end] of entries) {
    expect(start).toBeLessThanOrEqual(end)
  }

  for (let index = 1; index < entries.length; index++) {
    const [, previousEnd] = entries[index - 1]!
    const [currentStart] = entries[index]!
    expect(previousEnd).toBeLessThan(currentStart - 1)
  }
}

const getRanges = (set: Set<number>): Range[] => {
  const ranges: Range[] = []

  let currentRange: Range | undefined
  for (const key of [...set].sort((key1, key2) => key1 - key2)) {
    if (!currentRange) {
      currentRange = [key, key]
      continue
    }

    if (currentRange[1] + 1 === key) {
      currentRange[1]++
      continue
    }

    ranges.push(currentRange)
    currentRange = [key, key]
  }
  if (currentRange) {
    ranges.push(currentRange)
  }

  return ranges
}

type ModelSet = Ref<Set<number>>
type RealSet = Ref<SortedRangeSet>

test.each([
  [0.5, 1],
  [0, 1.5],
  [1, 0],
])(`SortedRangeMap throws a TypeError for bad input`, (...range) => {
  expect(() => new SortedRangeMap([[range, 42]])).toThrow(TypeError)

  const set = new SortedRangeMap()
  expect(() => set.set(range, 42)).toThrow(TypeError)
  expect(() => set.delete(range)).toThrow(TypeError)
  expect(() => set.slice(range)).toThrow(TypeError)
  expect(() => set.hasAll(range)).toThrow(TypeError)
  expect(() => set.hasAny(range)).toThrow(TypeError)
})

test.prop(
  [
    fc.oneof(
      fc.constantFrom(null, undefined),
      fc.array(fc.tuple(rangeArb, fc.anything())),
    ),
    fc.commands(
      [
        // SortedRangeMap#set(range, value)
        fc.tuple(rangeArb, fc.anything()).map(([range, value]) => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            for (const key of rangeTo(range[0], range[1])) {
              model.value.set(key, value)
            }

            expect(real.value.set(range, value)).toBe(real.value)
            expectDisjointSortedMinimalMap(real.value)
          },
          toString: () => `set(${fc.stringify(range)}, ${fc.stringify(value)})`,
        })),

        // SortedRangeMap#delete(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            let deletionExpected = false
            for (const key of rangeTo(range[0], range[1])) {
              const deleted = model.value.delete(key)
              deletionExpected ||= deleted
            }

            expect(real.value.delete(range)).toBe(deletionExpected)
            expectDisjointSortedMinimalMap(real.value)
          },
          toString: () => `delete(${fc.stringify(range)})`,
        })),

        // SortedRangeMap#clear()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            model.value.clear()

            real.value.clear()
            expectDisjointSortedMinimalMap(real.value)
          },
          toString: () => `clear()`,
        }),

        // SortedRangeMap#slice(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            model.value = pipe(
              rangeTo(range[0], range[1]),
              filter(key => model.value.has(key)),
              map((key): [number, unknown] => [key, model.value.get(key)]),
              reduce(toMap()),
            )

            real.value = real.value.slice(range)
            expectDisjointSortedMinimalMap(real.value)
          },
          toString: () => `slice(${fc.stringify(range)})`,
        })),

        // SortedRangeMap#has(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.has(key)).toBe(model.value.has(key))
          },
          toString: () => `has(${fc.stringify(key)})`,
        })),

        // SortedRangeMap#hasAll(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.hasAll(range)).toBe(
              pipe(
                rangeTo(range[0], range[1]),
                all(key => model.value.has(key)),
              ),
            )
          },
          toString: () => `hasAll(${fc.stringify(range)})`,
        })),

        // SortedRangeMap#hasAny(range)
        rangeArb.map(range => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.hasAny(range)).toBe(
              pipe(
                rangeTo(range[0], range[1]),
                any(key => model.value.has(key)),
              ),
            )
          },
          toString: () => `hasAny(${fc.stringify(range)})`,
        })),

        // SortedRangeMap#at(index)
        indexArb.map(index => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.at(index)).toStrictEqual(
              getRangeEntries(model.value).at(index),
            )
          },
          toString: () => `at(${fc.stringify(index)})`,
        })),

        // SortedRangeMap#get(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.get(key)?.[1]).toBe(model.value.get(key))
          },
          toString: () => `get(${fc.stringify(key)})`,
        })),

        // SortedRangeMap#indexOf(key)
        keyArb.map(key => ({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            const entries = getRangeEntries(model.value)
            let index
            for (index = 0; index < entries.length; index++) {
              const [[start, end]] = entries[index]!
              if (key < start) {
                index = ~index
                break
              }
              if (key >= start && key <= end) {
                break
              }
            }
            if (index === entries.length) {
              index = ~index
            }

            expect(real.value.indexOf(key)).toBe(index)
          },
          toString: () => `indexOf(${fc.stringify(key)})`,
        })),

        // SortedRangeMap#size
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect(real.value.size).toBe(getRangeEntries(model.value).length)
          },
          toString: () => `size`,
        }),

        // SortedRangeMap#[Symbol.iterator]()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect([...real.value]).toStrictEqual(getRangeEntries(model.value))
          },
          toString: () => `[Symbol.iterator]()`,
        }),

        // SortedRangeMap#entries()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect([...real.value.entries()]).toStrictEqual(
              getRangeEntries(model.value),
            )
          },
          toString: () => `entries()`,
        }),

        // SortedRangeMap#keys()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect([...real.value.keys()]).toStrictEqual(
              [...model.value.keys()].sort((key1, key2) => key1 - key2),
            )
          },
          toString: () => `keys()`,
        }),

        // SortedRangeMap#ranges()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect([...real.value.ranges()]).toStrictEqual(
              getRangeEntries(model.value).map(([range]) => range),
            )
          },
          toString: () => `ranges()`,
        }),

        // SortedRangeMap#values()
        fc.constant({
          check: () => true,
          run: (model: ModelMap, real: RealMap) => {
            expect([...real.value.values()]).toStrictEqual(
              getRangeEntries(model.value).map(([, value]) => value),
            )
          },
          toString: () => `values()`,
        }),
      ],
      { size: `+2` },
    ),
  ],
  { numRuns: 1000 },
)(`SortedRangeMap works`, (entries, commands) => {
  fc.modelRun(() => {
    const model = new Map()
    for (const [[start, end], value] of entries ?? []) {
      for (let key = start; key <= end; key++) {
        model.set(key, value)
      }
    }

    return {
      model: { value: model },
      real: { value: new SortedRangeMap(entries) },
    }
  }, commands)
})

const expectDisjointSortedMinimalMap = (map: SortedRangeMap<unknown>) => {
  const entries = [...map]
  for (const [[start, end]] of entries) {
    expect(start).toBeLessThanOrEqual(end)
  }

  for (let index = 1; index < entries.length; index++) {
    const [[, previousEnd], previousValue] = entries[index - 1]!
    const [[currentStart], currentValue] = entries[index]!

    if (previousValue === currentValue) {
      expect(previousEnd).toBeLessThan(currentStart - 1)
    }
  }
}

const getRangeEntries = (map: Map<number, unknown>): RangeEntry<unknown>[] => {
  const entries: RangeEntry<unknown>[] = []

  let currentEntry: RangeEntry<unknown> | undefined
  for (const [key, value] of [...map].sort(([key1], [key2]) => key1 - key2)) {
    if (!currentEntry) {
      currentEntry = [[key, key], value]
      continue
    }

    if (currentEntry[0][1] + 1 === key && currentEntry[1] === value) {
      currentEntry[0][1]++
      continue
    }

    entries.push(currentEntry)
    currentEntry = [[key, key], value]
  }
  if (currentEntry) {
    entries.push(currentEntry)
  }

  return entries
}

type ModelMap = Ref<Map<number, unknown>>
type RealMap = Ref<SortedRangeMap<unknown>>

type Ref<Value> = { value: Value }
