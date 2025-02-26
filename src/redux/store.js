// src/app/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import persistStore from "redux-persist/es/persistStore";

import userReducer from './user/userSlice';
import themeReducer from './theme/themeSlice';
import roomReducer from './room/roomSlice';
import peerReducer from './peer/peerSlice';

const rootReducer = combineReducers({
    user: userReducer,
    theme: themeReducer,
    room: roomReducer,
    peer: peerReducer
});

const persistConfig = {
    key: 'root',
    storage,
    version: 1,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
