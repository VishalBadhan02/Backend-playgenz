const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [
    {
      entityId: { type: String, required: true },
      entityType: { type: String, enum: ['user', 'Team', 'Organizer', 'VenueAdmin'], required: true }
    }
  ],
  type: { type: String, enum: ['one-on-one', 'group'], required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
