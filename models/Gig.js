const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema({
  title: String,
  description: String,
  budget: Number,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "open" },
  hiredFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ add this
});

module.exports = mongoose.model("Gig", gigSchema);
