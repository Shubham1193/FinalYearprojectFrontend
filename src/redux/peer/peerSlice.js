import { createSlice } from '@reduxjs/toolkit';

const peerSlice = createSlice({
    name: 'peer',
    initialState: {
        peerId: '',
        peerInstance: null,
    },
    reducers: {
        setPeerId: (state, action) => {
            state.peerId = action.payload;
        },
        setPeerInstance: (state, action) => {
            state.peerInstance = action.payload;
        },
        clearPeerState: (state) => {
            state.peerId = '';
            state.peerInstance = null;
        },
    },
});

export const { setPeerId, setPeerInstance, clearPeerState } = peerSlice.actions;
export default peerSlice.reducer;
