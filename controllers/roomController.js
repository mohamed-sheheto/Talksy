const Room = require("../models/roomModel");

exports.createRoom = async function (req, res, next) {
  try {
    const { name, description, isPrivate } = req.body;

    const roomData = {
      name: name.trim(),
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
    console.error("createRoom error:", err);
    next(err);
  }
};

exports.getRooms = async function (req, res, next) {
  try {
    const query = req.user
      ? {
          $or: [
            { isPrivate: false },
            {
              isPrivate: true,
              members: req.user._id,
            },
          ],
        }
      : { isPrivate: false };

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

exports.getRoom = async function (req, res, next) {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        status: "error",
        message: "Room not found",
      });
    }

    if (room.isPrivate) {
      const isMember = room.members.some((member) =>
        member._id.equals(req.user._id)
      );

      if (!isMember) {
        return res.status(403).json({
          status: "error",
          message: "You do not have access to this private room",
        });
      }
    }

    res.status(200).json({
      status: "success",
      room,
    });
  } catch (err) {
    console.error("getRoom error:", err);
    next(err);
  }
};

exports.deleteRoom = async function (req, res, next) {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        status: "error",
        message: "Room not found",
      });
    }

    if (!room.creator._id.equals(req.user._id)) {
      return res.status(403).json({
        status: "error",
        message: "You can't delete this room",
      });
    }

    await Room.deleteOne({ _id: room._id });
    res.status(204).send();
  } catch (err) {
    console.error("deleteRoom error:", err);
    next(err);
  }
};

exports.joinRoom = async function (req, res, next) {
  try {
    const roomToJoin = await Room.findById(req.params.id);

    if (!roomToJoin) {
      return res.status(404).json({
        status: "error",
        message: "Room not found",
      });
    }

    if (roomToJoin.isPrivate) {
      return res.status(403).json({
        status: "error",
        message: "Cannot join a private room directly.",
      });
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    );

    if (!room) {
      return res
        .status(404)
        .json({ status: "error", message: "Room not found during update." });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully joined the room.",
      room,
    });
  } catch (err) {
    console.error("joinRoom error:", err);
    next(err);
  }
};
exports.leaveRoom = async function (req, res, next) {
  try {
    const roomToLeave = await Room.findById(req.params.id);
    if (!roomToLeave) {
      return res.status(404).json({
        status: "error",
        message: "Room not found",
      });
    }

    if (roomToLeave.creator._id.equals(req.user._id)) {
      return res.status(400).json({
        status: "error",
        message:
          "The creator of the room cannot leave. Please delete the room instead.",
      });
    }

    await Room.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { members: req.user._id },
      },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Successfully left the room.",
    });
  } catch (err) {
    console.error("leaveRoom error:", err);
    next(err);
  }
};
