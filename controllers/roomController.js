const Room = require("../models/roomModel");

exports.createRoom = async function (req, res, next) {
  try {
    const { name, description, isPrivate } = req.body;

    const roomData = {
      name,
      creator: req.user._id,
      isPrivate,
      description: description || "",
    };

    const newRoom = await Room.create(roomData);

    await newRoom.populate("creator", "username avatar");

    res.status(201).json({
      status: "success",
      room: newRoom,
    });
  } catch (err) {
    console.error("create Room error", err);
    next(err);
  }
};

exports.getRooms = async function (req, res, next) {
  try {
    let query = { isPrivate: false };

    if (req.user) {
      query = {
        $or: [
          { isPrivate: false },
          {
            isPrivate: true,
            members: req.user._id,
          },
        ],
      };
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const totalRooms = await Room.countDocuments(query);

    const rooms = await Room.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRooms / limit);

    res.status(200).json({
      status: "success",
      results: rooms.length,
      page,
      totalPages,
      rooms,
    });
  } catch (err) {
    console.error("getRooms error:", err);
    next(err);
  }
};

// getRooms - Get list of public rooms (or user's rooms if authenticated)
// getRoom - Get single room details with members
// joinRoom - Add user to room members
// leaveRoom - Remove user from room members
// deleteRoom - Delete room (creator only)
