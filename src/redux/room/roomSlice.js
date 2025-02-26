// src/features/room/roomSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    roomId: ''
};

const roomSlice = createSlice({
    name: 'room',
    initialState,
    reducers: {
        setRoomId: (state, action) => {
            state.roomId = action.payload;
        },
        clearRoomId: (state) => {
            state.roomId = '';
        }
    }
});

export const { setRoomId, clearRoomId } = roomSlice.actions;

export default roomSlice.reducer;
