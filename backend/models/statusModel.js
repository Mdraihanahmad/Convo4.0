import mongoose from 'mongoose';

const statusViewerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'video'], required: true },
    content: { type: String, required: true }, // text or media URL
    textStyle: {
      bgColor: { type: String, default: '#1f2937' },
      textColor: { type: String, default: '#ffffff' },
    },
    viewers: { type: [statusViewerSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    expiry: { type: Date, required: true }, // 24h expiry
  },
  { timestamps: true }
);

// TTL index to auto remove expired statuses
statusSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 });

export const Status = mongoose.model('Status', statusSchema);


