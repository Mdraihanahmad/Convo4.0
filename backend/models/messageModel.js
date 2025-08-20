import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, required: true }, // mimetype, e.g., image/png
    name: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const messageModel = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    replyPreview: {
      senderName: { type: String, default: "" },
      textSnippet: { type: String, default: "" },
      attachmentType: { type: String, default: "" },
      attachmentUrl: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageModel);