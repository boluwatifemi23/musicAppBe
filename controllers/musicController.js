const asyncHandler = require("express-async-handler");
const Music = require("../models/Music");
const cloudinary = require("cloudinary").v2;


exports.uploadMusic = asyncHandler(async (req, res) => {
  const { title, artist, genre } = req.body;

  if (!title || !artist || !genre || !req.files) {
    res.status(400);
    throw new Error("Please provide all required fields and files");
  }

  const audioFile = req.files.audioFile;
  const coverImage = req.files.coverImage;

  const audioUpload = await cloudinary.uploader.upload(audioFile.tempFilePath, {
    resource_type: "video", 
    folder: "musicapp/audio",
  });

  let imageUpload = null;
  if (coverImage) {
    imageUpload = await cloudinary.uploader.upload(coverImage.tempFilePath, {
      folder: "musicapp/covers",
    });
  }

  const music = await Music.create({
    title,
    artist,
    genre,
    audioFile: audioUpload.secure_url,
    coverImage: imageUpload ? imageUpload.secure_url : "",
    uploadedBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Music uploaded successfully",
    music,
  });
});


exports.getAllMusic = asyncHandler(async (req, res) => {
  const music = await Music.find().populate("uploadedBy", "name email");
  res.json({ success: true, count: music.length, music });
});


exports.toggleLike = asyncHandler(async (req, res) => {
  const song = await Music.findById(req.params.id);

  if (!song) {
    res.status(404);
    throw new Error("Song not found");
  }

  const alreadyLiked = song.likes.includes(req.user._id);

  if (alreadyLiked) {
    song.likes.pull(req.user._id);
  } else {
    song.likes.push(req.user._id);
  }

  await song.save();
  res.json({
    success: true,
    message: alreadyLiked ? "Like removed" : "Song liked",
    likesCount: song.likes.length,
  });
});


exports.deleteMusic = asyncHandler(async (req, res) => {
  const song = await Music.findById(req.params.id);

  if (!song) {
    res.status(404);
    throw new Error("Song not found");
  }

  if (song.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("You do not have permission to delete this song");
  }

  await song.deleteOne();
  res.json({ success: true, message: "Song deleted successfully" });
});
