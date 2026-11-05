import { useEffect, useState } from 'react'
import { seed } from './logic.js'

const KEY = 'albhitai-fs-v1'
const listeners = new Set()
let memory = null

function readRaw() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return memory
  }
}

function writeRaw(value) {
  memory = value
  try {
    localStorage.setItem(KEY, value)
  } catch {
    /* Keep the working copy in memory when storage is blocked. */
  }
}

export function load() {
  try {
    const raw = readRaw()
    if (raw) {
      const db = JSON.parse(raw)
      if (db?.products && db?.sales && db?.tanks && db?.purchases && db?.customers) return db
    }
  } catch {
    /* Replace unreadable data with the sample station. */
  }
  const db = seed()
  writeRaw(JSON.stringify(db))
  return db
}

export function commit(db) {
  writeRaw(JSON.stringify(db))
  listeners.forEach((fn) => fn())
}

export function update(mutator) {
  const db = load()
  mutator(db)
  commit(db)
}

export function resetData() {
  commit(seed())
}

export function useDB() {
  const [db, setDb] = useState(() => load())
  useEffect(() => {
    const fn = () => setDb(load())
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return db
}
