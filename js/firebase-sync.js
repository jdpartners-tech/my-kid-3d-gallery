import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js'

const firebaseConfig = {
  apiKey:            'AIzaSyDDmR6nrPhbXEXsb-BJNpR6WTfiqBWSqCE',
  authDomain:        'jdpartners-gallery.firebaseapp.com',
  databaseURL:       'https://jdpartners-gallery-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'jdpartners-gallery',
  storageBucket:     'jdpartners-gallery.firebasestorage.app',
  messagingSenderId: '350388355053',
  appId:             '1:350388355053:web:aa7aee8f34a6d76524f1e4'
}

const app = initializeApp(firebaseConfig)
const db  = getDatabase(app)
const OVERRIDES_REF = ref(db, 'artwork-overrides')

export async function loadOverridesFromCloud() {
  try {
    const snap = await get(OVERRIDES_REF)
    return snap.exists() ? snap.val() : {}
  } catch (e) {
    console.warn('[firebase] load failed, falling back to localStorage:', e)
    return null
  }
}

export async function saveOverridesToCloud(overrides) {
  try {
    await set(OVERRIDES_REF, Object.keys(overrides).length ? overrides : null)
  } catch (e) {
    console.warn('[firebase] save failed:', e)
  }
}
