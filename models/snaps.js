const mongoose = require("mongoose");

const snapSchema = new mongoose.Schema({
  snapDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  influencerUsername: { type: String, required: true },
  urls: [
    {
      type: { type: String },
      src: { type: String },
    },
  ],
});

const Snap = mongoose.model("Snap", snapSchema);

module.exports = Snap;
