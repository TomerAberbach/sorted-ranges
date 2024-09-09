/**
 * A data structure that maintains a disjoint, sorted, and minimal list of
 * inclusive integer ranges.
 *
 * "Disjoint" means that ranges in the list do not intersect. For example, the
 * list cannot contain both `[0, 3]` and `[2, 5]`.
 *
 * "Sorted" means that each range's start is greater than the previous range's
 * end. For example, the list cannot be `[[3, 5], [0, 1]]`.
 *
 * "Minimal" means that there cannot be adjacent ranges. For example, the list
 * cannot be `[[0, 1], [2, 3]]` and would be `[[0, 3]]` instead.
 */
export class SortedRangeSet {
  #map: SortedRangeMap<0>

  /**
   * Creates a new set containing the given `ranges`, or an empty set if
   * `ranges` is undefined or null.
   */
  public constructor(ranges?: Iterable<ReadonlyRange> | null) {
    this.#map = new SortedRangeMap()

    if (ranges) {
      for (const range of ranges) {
        this.add(range)
      }
    }
  }

  /** Adds the given `range` to the set, and returns this set. */
  public add(range: ReadonlyRange): this {
    this.#map.set(range, 0)
    return this
  }

  /**
   * Deletes all keys in the given `range` from the set and returns whether any
   * keys were deleted.
   */
  public delete(range: ReadonlyRange): boolean {
    return this.#map.delete(range)
  }

  /** Clears all ranges from the set. */
  public clear(): void {
    this.#map.clear()
  }

  /**
   * Returns a copy of the set containing only keys enclosed by the given
   * `range`.
   */
  public slice(range: ReadonlyRange): SortedRangeSet {
    const copy = new SortedRangeSet()
    copy.#map = this.#map.slice(range)
    return copy
  }

  /** Returns whether any of the set's ranges contains the given `key`. */
  public has(key: number): boolean {
    return this.#map.has(key)
  }

  /**
   * Returns whether every key in the given `range` is contained in some range
   * in the set.
   */
  public hasAll(range: ReadonlyRange): boolean {
    return this.#map.hasAll(range)
  }

  /**
   * Returns whether any of the set's ranges contains a key in the given
   * `range`.
   */
  public hasAny(range: ReadonlyRange): boolean {
    return this.#map.hasAny(range)
  }

  /**
   * Returns the range at the given `index`, with wrap around, in the sorted
   * range order, or undefined if the set is empty.
   */
  public at(index: number): Range | undefined {
    return this.#map.at(index)?.[0]
  }

  /**
   * Returns the range containing the given `key`, or undefined if the key isn't
   * in the set.
   */
  public get(key: number): Range | undefined {
    return this.#map.get(key)?.[0]
  }

  /**
   * Returns the index of the range containing the given key if there is one.
   * Otherwise, returns `~insertIndex`, where `insertIndex` is the index of
   * where the range would be.
   */
  public indexOf(key: number): number {
    return this.#map.indexOf(key)
  }

  /** Returns the number of ranges in the set. */
  public get size(): number {
    return this.#map.size
  }

  /** Returns an iterable/iterator of the ranges in the set in sorted order. */
  public [Symbol.iterator](): IterableIterator<Range> {
    return this.#map.ranges()
  }

  /**
   * Returns an iterable/iterator of the keys contained within the ranges in the
   * set in sorted order.
   */
  public keys(): IterableIterator<number> {
    return this.#map.keys()
  }
}

/**
 * A data structure that maintains a disjoint, sorted, and minimal list of
 * inclusive integer ranges, where each range is associated with a value of type
 * `Value`.
 *
 * "Disjoint" means that ranges in the list do not intersect. For example, the
 * list cannot contain both `[0, 3]` and `[2, 5]`.
 *
 * "Sorted" means that each range's start is greater than the previous range's
 * end. For example, the list cannot be `[[3, 5], [0, 1]]`.
 *
 * "Minimal" means that there cannot be entries with adjacent ranges and the
 * same value. For example, the list cannot be:
 * ```js
 * [
 *   [[0, 1], "value"],
 *   [[2, 3], "value"],
 * ]
 * ```
 * And would be the following instead:
 * ```js
 * [
 *   [[0, 3], "value"],
 * ]
 * ```
 * However, the following is allowed due to the differing values:
 * ```js
 * [
 *   [[0, 1], "value1"],
 *   [[2, 3], "value2"],
 * ]
 * ```
 */
export class SortedRangeMap<Value> {
  #entries: RangeEntry<Value>[]

  /**
   * Creates a new map containing the given `entries`, or an empty map if
   * `entries` is undefined or null.
   */
  public constructor(entries?: Iterable<ReadonlyEntry<Value>> | null) {
    this.#entries = []

    if (entries) {
      for (const [range, value] of entries) {
        this.set(range, value)
      }
    }
  }

  /**
   * Associates the given `range` with the given `value` in the map, and returns
   * this map.
   */
  public set(range: ReadonlyRange, value: Value): this {
    range = assertRange(range)

    // Delete the input range in case there are any existing ranges that it
    // intersects and then insert a new entry for it.
    this.#delete(range)
    // eslint-disable-next-line no-implicit-coercion
    const insertIndex = ~this.indexOf(range[0])
    this.#entries.splice(insertIndex, 0, [range as Range, value])

    // Try to merge the inserted entry with its next and previous entries to
    // keep the entries minimal.
    const nextIndex = insertIndex + 1
    if (nextIndex < this.size) {
      this.#maybeMergeWithPreviousEntry(nextIndex)
    }
    this.#maybeMergeWithPreviousEntry(insertIndex)

    return this
  }

  /**
   * Merges the entry at the given `index` with the one at the previous index if
   * they are adjacent and have the same value.
   */
  #maybeMergeWithPreviousEntry(index: number) {
    if (index === 0) {
      return
    }

    const [[start, end], value] = this.#entries[index]!
    const [previousRange, previousValue] = this.#entries[index - 1]!
    const [, previousEnd] = previousRange
    const isMergeable = previousEnd + 1 === start && previousValue === value
    if (!isMergeable) {
      return
    }

    // Delete the input entry and extend the previous entry to cover the deleted
    // range.
    this.#entries.splice(index, 1)
    previousRange[1] = end
  }

  /**
   * Deletes all keys in the given `range` from the map and returns whether any
   * keys were deleted.
   */
  public delete(range: ReadonlyRange): boolean {
    return this.#delete(assertRange(range))
  }

  #delete(range: ReadonlyRange): boolean {
    const indices = this.#indicesOf(range)
    if (!indices) {
      return false
    }
    const [firstIndex, lastIndex] = indices

    this.#deleteFromSingleRange(lastIndex, range)

    // Delete all ranges between the first and last ranges (exclusive) because
    // they are guaranteed to be contained in the input range.
    const fullyContainedStartIndex = firstIndex + 1
    // Note that splice treats a negative delete count as zero.
    const deleteCount = lastIndex - fullyContainedStartIndex
    this.#entries.splice(fullyContainedStartIndex, deleteCount)

    if (firstIndex !== lastIndex) {
      this.#deleteFromSingleRange(firstIndex, range)
    }

    return true
  }

  /**
   * Deletes the given range from the range at the `targetIndex` in entries,
   * assuming that the given range intersects with the target.
   */
  #deleteFromSingleRange(
    targetIndex: number,
    [deleteStart, deleteEnd]: ReadonlyRange,
  ) {
    const [targetRange, value] = this.#entries[targetIndex]!
    const [targetStart, targetEnd] = targetRange

    if (deleteStart <= targetStart) {
      if (deleteEnd >= targetEnd) {
        // The input range fully contains the target range.
        this.#entries.splice(targetIndex, 1)
      } else {
        // The input range starts before/at the target range and ends inside it.
        targetRange[0] = deleteEnd + 1
      }
    } else if (deleteEnd >= targetEnd) {
      // The input range starts inside the target range and ends after/at it.
      targetRange[1] = deleteStart - 1
    } else {
      // The input range starts and ends inside the target range.
      const rangeAfterDelete: Range = [deleteEnd + 1, targetEnd]
      targetRange[1] = deleteStart - 1
      this.#entries.splice(targetIndex + 1, 0, [rangeAfterDelete, value])
    }
  }

  /** Clears all entries from the map. */
  public clear(): void {
    this.#entries = []
  }

  /**
   * Returns a copy of the map containing only keys enclosed by the given
   * `range`.
   */
  public slice(range: ReadonlyRange): SortedRangeMap<Value> {
    range = assertRange(range)

    const copy = new SortedRangeMap<Value>()
    const indices = this.#indicesOf(range)
    if (!indices) {
      // The input range encloses zero keys.
      return copy
    }

    // Copy the entries that intersect the input range.
    const [firstIndex, lastIndex] = indices
    const entriesCopy = Array.from(
      { length: lastIndex - firstIndex + 1 },
      (_, index) => cloneEntry(this.#entries[firstIndex + index]!),
    )

    // Slice down to the parts of the first and last ranges that intersect the
    // input range.
    const [start, end] = range
    const [firstRange] = entriesCopy[0]!
    firstRange[0] = Math.max(start, firstRange[0])
    const [lastRange] = entriesCopy.at(-1)!
    lastRange[1] = Math.min(end, lastRange[1])

    copy.#entries = entriesCopy
    return copy
  }

  /** Returns whether any of the map's ranges contains the given `key`. */
  public has(key: number): boolean {
    return this.indexOf(key) >= 0
  }

  /**
   * Returns whether every key in the given `range` is contained in some range
   * in the map.
   */
  public hasAll(range: ReadonlyRange): boolean {
    const [start, end] = assertRange(range)

    const firstIndex = this.indexOf(start)
    if (firstIndex < 0) {
      // The input range start isn't in the map.
      return false
    }

    const lastIndex = start === end ? firstIndex : this.indexOf(end)
    if (lastIndex < 0) {
      // The input range end isn't in the map.
      return false
    }

    // Look for any gaps in the ranges between the first and last indices.
    for (let index = firstIndex + 1; index <= lastIndex; index++) {
      const [[, previousEnd]] = this.#entries[index - 1]!
      const [[currentStart]] = this.#entries[index]!
      if (previousEnd + 1 !== currentStart) {
        // The gap between the previous and current ranges is not in the map,
        // but is in the input range.
        return false
      }
    }

    return true
  }

  /**
   * Returns whether any of the map's ranges contains a key in the given
   * `range`.
   */
  public hasAny(range: ReadonlyRange): boolean {
    const [start, end] = assertRange(range)

    const firstIndex = this.indexOf(start)
    if (firstIndex >= 0) {
      // The input range start is in the map.
      return true
    }

    const lastIndex = start === end ? firstIndex : this.indexOf(end)
    if (lastIndex >= 0) {
      // The input range end is in the map.
      return true
    }

    // The input range encloses some ranges.
    return firstIndex !== lastIndex
  }

  /**
   * Returns the entry at the given `index`, with wrap around, in the sorted
   * range order, or undefined if the map is empty.
   */
  public at(index: number): RangeEntry<Value> | undefined {
    const entry = this.#entries.at(index)
    return entry && cloneEntry(entry)
  }

  /**
   * Returns the entry that has a range containing the given `key`, or undefined
   * if the key isn't in the map.
   */
  public get(key: number): RangeEntry<Value> | undefined {
    const index = this.indexOf(key)
    return index >= 0 ? cloneEntry(this.#entries[index]!) : undefined
  }

  /**
   * Returns the range of indices in the entries that the given `range`
   * intersects the entries of, or undefined if it intersects no entries.
   */
  #indicesOf([start, end]: ReadonlyRange): Range | undefined {
    let firstIndex = this.indexOf(start)
    let lastIndex = start === end ? firstIndex : this.indexOf(end)

    if (firstIndex < 0) {
      if (firstIndex === lastIndex) {
        // The input range doesn't intersect any entries.
        return undefined
      }

      // When the input range start is not inside any range, use the index of
      // the range that starts immediately after the input range start.
      firstIndex = ~firstIndex
    }

    if (lastIndex < 0) {
      // When the input range end is not inside any range, use the index of the
      // range that ends immediately before the input range end.
      lastIndex = ~lastIndex - 1
    }

    return [firstIndex, lastIndex]
  }

  /**
   * Returns the index of the entry that has a range containing the given key if
   * there is one. Otherwise, returns `~insertIndex`, where `insertIndex` is the
   * index of where the entry would be.
   */
  public indexOf(key: number): number {
    let low = 0
    let high = this.size - 1
    while (low <= high) {
      // The naive `low + high >>> 1` could fail for array lengths > 2 ** 31
      // because `>>>` converts its operands to int32. This code works for array
      // lengths <= 2 ** 32 - 1, which is also JavaScript's max array length.
      const middle = low + ((high - low) >>> 1)
      const [[start, end]] = this.#entries[middle]!

      if (key > end) {
        low = middle + 1
      } else if (key < start) {
        high = middle - 1
      } else {
        return middle
      }
    }

    return ~low
  }

  /** Returns the number of entries in the map. */
  public get size(): number {
    return this.#entries.length
  }

  /** Returns an iterable/iterator of the entries in the map in sorted order. */
  public [Symbol.iterator](): IterableIterator<RangeEntry<Value>> {
    return this.entries()
  }

  /**
   * Returns an iterable/iterator of the entries in the map in sorted range
   * order.
   */
  public *entries(): IterableIterator<RangeEntry<Value>> {
    for (const entry of this.#entries) {
      yield cloneEntry(entry)
    }
  }

  /**
   * Returns an iterable/iterator of the keys contained within the ranges in the
   * map in sorted order.
   */
  public *keys(): IterableIterator<number> {
    for (const [[start, end]] of this.#entries) {
      for (let key = start; key <= end; key++) {
        yield key
      }
    }
  }

  /** Returns an iterable/iterator of the ranges in the map in sorted order. */
  public *ranges(): IterableIterator<Range> {
    for (const [range] of this.#entries) {
      yield cloneRange(range)
    }
  }

  /**
   * Returns an iterable/iterator of the values in the map in sorted range
   * order.
   */
  public *values(): IterableIterator<Value> {
    for (const [, value] of this.#entries) {
      yield value
    }
  }
}

const assertRange = (range: ReadonlyRange): Range => {
  const [start, end] = range
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end
  ) {
    throw new TypeError(`[${start}, ${end}] is not integers start <= end`)
  }
  return [start, end]
}

const cloneEntry = <Value>([
  range,
  value,
]: ReadonlyEntry<Value>): RangeEntry<Value> => [cloneRange(range), value]

const cloneRange = ([start, end]: ReadonlyRange): Range => [start, end]

/** An inclusive integer range. */
export type Range = [number, number]

/** A readonly inclusive integer range. */
export type ReadonlyRange = Readonly<Range>

/** A mapping from an inclusive integer range to a value of type `Value`. */
export type RangeEntry<Value> = [Range, Value]

/**
 * A readonly mapping from an inclusive integer range to a value of type
 * `Value`.
 *
 * Note that `Value` may or may not be readonly.
 */
export type ReadonlyEntry<Value> = readonly [ReadonlyRange, Value]
