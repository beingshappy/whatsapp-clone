// Mock Firebase for development when SDK is unavailable
export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback: any) => {
    callback(null)
    return () => {}
  },
}

export const db = {
  collection: () => ({}),
}

export const storage = {
  ref: () => ({}),
}

export const initializeApp = () => ({})
export const getAuth = () => auth
export const getFirestore = () => db
export const getStorage = () => storage
export const setPersistence = () => Promise.resolve()
export const enableIndexedDbPersistence = () => Promise.resolve()
