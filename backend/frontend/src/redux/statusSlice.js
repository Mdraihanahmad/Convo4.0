import { createSlice } from '@reduxjs/toolkit';

const statusSlice = createSlice({
  name: 'status',
  initialState: {
    my: [], // my statuses
    contacts: {}, // userId -> [statuses]
    unseen: {}, // userId -> count of unseen
  },
  reducers: {
    setStatuses: (state, action) => {
      const list = action.payload || [];
      state.my = list.filter(s => s.isMine);
      const grouped = {};
      list.forEach(s => {
        const uid = s.userId?._id || s.userId;
        if (!grouped[uid]) grouped[uid] = [];
        grouped[uid].push(s);
      });
      state.contacts = grouped;
    },
    markSeenLocal: (state, action) => {
      const { userId, statusId } = action.payload;
      // could compute unseen here if tracked locally
    }
  }
});

export const { setStatuses, markSeenLocal } = statusSlice.actions;
export default statusSlice.reducer;


