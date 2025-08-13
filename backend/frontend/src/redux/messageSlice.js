import {createSlice} from "@reduxjs/toolkit";

const messageSlice = createSlice({
    name:"message",
    initialState:{
        messages:[],
        editing: null, // { messageId, originalText }
        replyContext: null, // { messageId, senderName, snippet, attachmentType, attachmentUrl, thumbnail }
    },
    reducers:{
        setMessages:(state,action)=>{
            state.messages = action.payload;
        },
        setReplyContext:(state, action) => {
            state.replyContext = action.payload;
        },
        startEditing:(state, action) => {
            state.editing = action.payload; // { messageId, originalText }
        },
        cancelEditing:(state) => {
            state.editing = null;
        },
        applyEditedMessage:(state, action) => {
            const updated = action.payload; // full message
            state.messages = (state.messages || []).map(m => m._id === updated._id ? updated : m);
            state.editing = null;
        }
    }
});
export const {setMessages, setReplyContext, startEditing, cancelEditing, applyEditedMessage} = messageSlice.actions;
export default messageSlice.reducer;