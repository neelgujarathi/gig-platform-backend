const express = require("express");
const router = express.Router();
const Bid = require("../models/Bid");
const Gig = require("../models/Gig");
const { protect } = require("../middleware/auth");

// Submit a bid
router.post("/", protect, async (req, res) => {
  const { gigId, message, price } = req.body;
  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found" });
    if (gig.status === "assigned") return res.status(400).json({ message: "Cannot bid on assigned gig" });

    const bid = await Bid.create({ gigId, freelancerId: req.user._id, message, price });
    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bids for a gig 
router.get("/:gigId", protect, async (req, res) => {
  const { gigId } = req.params;
  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found" });
    if (!gig.ownerId.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const bids = await Bid.find({ gigId });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// hire freelancer
router.patch("/:bidId/hire", protect, async (req, res) => {
  const { bidId } = req.params;
  const session = await Bid.startSession();
  session.startTransaction();

  try {
    const bid = await Bid.findById(bidId).session(session);
    if (!bid) throw new Error("Bid not found");

    const gig = await Gig.findById(bid.gigId).session(session);
    if (!gig.ownerId.equals(req.user._id)) throw new Error("Forbidden");
    if (gig.status === "assigned") throw new Error("Gig already assigned");

    bid.status = "hired";
    await bid.save({ session });

    await Bid.updateMany(
      { gigId: gig._id, _id: { $ne: bid._id } },
      { status: "rejected" },
      { session }
    );

    gig.status = "assigned";
    gig.hiredFreelancer = bid.freelancerId;
    await gig.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Socket.io Notification
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const freelancerSocketId = onlineUsers.get(bid.freelancerId.toString());
    if (freelancerSocketId) {
      io.to(freelancerSocketId).emit("hired", {
        gigTitle: gig.title,
        freelancerId: bid.freelancerId.toString(),
        message: `You have been hired for "${gig.title}"!`,
      });
    } else {
      console.log(`Freelancer ${bid.freelancerId} is not online`);
    }

    res.json({ message: "Freelancer hired successfully" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Hire error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
