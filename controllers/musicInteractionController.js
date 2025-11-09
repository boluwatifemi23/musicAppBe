const Music = require("../models/Music");
const asyncHandler = require("express-async-handler");


exports.toggleLike = asyncHandler(async (req, res) => {
  const song = await Music.findById(req.params.id);
  if (!song) return res.status(404).json({ message: "Song not found" });

  const userId = req.user.id;
  const isLiked = song.likes.includes(userId);

  if (isLiked) {
    song.likes.pull(userId);
  } else {
    song.likes.push(userId);
  }

  await song.save();
  res.json({
    success: true,
    liked: !isLiked,
    totalLikes: song.likes.length
  });
});


exports.toggleFavorite = asyncHandler(async (req, res) => {
  const song = await Music.findById(req.params.id);
  if (!song) return res.status(404).json({ message: "Song not found" });

  const userId = req.user.id;
  const isFavorite = song.favorites.includes(userId);

  if (isFavorite) {
    song.favorites.pull(userId);
  } else {
    song.favorites.push(userId);
  }

  await song.save();
  res.json({
    success: true,
    favorited: !isFavorite,
    totalFavorites: song.favorites.length
  });
});

exports.incrementStream = asyncHandler(async (req, res) => {
  const song = await Music.findById(req.params.id);
  if (!song) return res.status(404).json({ message: "Song not found" });

  song.streams += 1;
  await song.save();

  res.json({
    success: true,
    message: "Stream count updated",
    streams: song.streams
  });
});
