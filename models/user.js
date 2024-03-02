const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  influencers: { type: [String] },
});
const User = mongoose.model("User", userSchema);
module.exports = User;
