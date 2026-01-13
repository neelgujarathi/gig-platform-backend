// backend/routes/gigs.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Gig = require("../models/Gig");
const Bid = require("../models/Bid");
const { protect } = require("../middleware/auth");

// ✅ Fetch all bids made by the logged-in freelancer
router.get("/my-bids", protect, async (req, res) => {
  try {
    const bids = await Bid.find({ freelancerId: req.user._id }).populate("gigId");
    const result = bids.map((b) => ({
      ...b._doc,
      gigTitle: b.gigId?.title || "Deleted Gig",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Create a new gig (Client only)
router.post("/", protect, async (req, res) => {
  const { title, description, budget } = req.body;
  try {
    const gig = await Gig.create({
      title,
      description,
      budget,
      ownerId: req.user._id,
    });
    res.status(201).json(gig);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get all "open" gigs with optional search
router.get("/", async (req, res) => {
  try {
    const search = req.query.search || "";
    const gigs = await Gig.find({
      status: "open",
      title: { $regex: search, $options: "i" },
    });
    res.json(gigs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Edit gig (only owner)
router.put("/:id", protect, async (req, res) => {
  const { title, description, budget } = req.body;
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: "Gig not found" });
    if (!gig.ownerId.equals(req.user._id))
      return res.status(403).json({ message: "Forbidden" });

    gig.title = title || gig.title;
    gig.description = description || gig.description;
    gig.budget = budget || gig.budget;

    await gig.save();
    res.json(gig);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Delete gig (only owner)
router.delete("/:id", protect, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ message: "Gig not found" });
    if (!gig.ownerId.equals(req.user._id))
      return res.status(403).json({ message: "Forbidden" });

    await gig.deleteOne();
    res.json({ message: "Gig deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get single gig details (populate hiredFreelancer) — always last
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid gig ID" });
    }

    const gig = await Gig.findById(id).populate("hiredFreelancer", "name email");
    if (!gig) {
      return res.status(404).json({ message: "Gig not found" });
    }

    res.json(gig);
  } catch (err) {
    console.error("Error fetching gig:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
