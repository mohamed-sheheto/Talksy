const Room = require("../models/roomModel");
const asyncWrapper = require("../utils/asyncWrapper");
const AppError = require("../utils/appError");

exports.createRoom = asyncWrapper(async function (req, res, next) {
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
});

exports.getRooms = asyncWrapper(async function (req, res, next) {
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

  const page = Math.max(1, +req.query.page || 1);
  const limit = Math.max(1, Math.min(100, +req.query.limit || 10));

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
});

exports.getRoom = asyncWrapper(async function (req, res, next) {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return next(new AppError("invalid id, Room not found", 404));
  }

  if (room.isPrivate) {
    const isMember = room.members.some((member) =>
      member._id.equals(req.user._id)
    );

    if (!isMember) {
      return next(
        new AppError("You do not have access to this private room", 403)
      );
    }
  }

  res.status(200).json({
    status: "success",
    room,
  });
});

exports.deleteRoom = asyncWrapper(async function (req, res, next) {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return next(new AppError("invalid id, Room not found", 404));
  }

  if (!room.creator._id.equals(req.user._id)) {
    return next(new AppError("You can't delete this room", 403));
  }

  await Room.deleteOne({ _id: room._id });
  res.status(204).send();
});

exports.joinRoom = asyncWrapper(async function (req, res, next) {
  const roomToJoin = await Room.findById(req.params.id);

  if (!roomToJoin) {
    return next(new AppError("Room not found", 404));
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
    return next(new AppError("Room not found during update.", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Successfully joined the room.",
    room,
  });
});

exports.leaveRoom = asyncWrapper(async function (req, res, next) {
  const roomToLeave = await Room.findById(req.params.id);
  if (!roomToLeave) {
    return next(new AppError("Room not found", 404));
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
});
