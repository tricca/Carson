import { openDB, type IDBPDatabase } from 'idb'
import type { AppData } from '../domain/types'

const DB_NAME = 'housekeeping-cache'
const STORE_NAME = 'appData'
const RECORD_ID = 'singleton'

interface CacheRecord {
  id: string
  data: AppData
  rev: string | null
  dirty: boolean
  savedAt: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function readCache(): Promise<CacheRecord | null> {
  const db = await getDb()
  const record = await db.get(STORE_NAME, RECORD_ID)
  return record ?? null
}

export async function writeCache(data: AppData, rev: string | null, dirty: boolean): Promise<void> {
  const db = await getDb()
  const record: CacheRecord = { id: RECORD_ID, data, rev, dirty, savedAt: new Date().toISOString() }
  await db.put(STORE_NAME, record)
}

export async function markSynced(rev: string): Promise<void> {
  const db = await getDb()
  const record = await db.get(STORE_NAME, RECORD_ID)
  if (!record) return
  await db.put(STORE_NAME, { ...record, rev, dirty: false } satisfies CacheRecord)
}
