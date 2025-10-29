const mongoose = require("mongoose");

const musicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a song title"],
    },
    artist: {
      type: String,
      required: [true, "Please add an artist name"],
    },
    genre: {
      type: String,
      required: [true, "Please specify the genre"],
    },
    coverImage: {
      type: String, // Cloudinary URL
      default: "",
    },
    audioFile: {
      type: String, // Cloudinary URL
      required: [true, "Please upload an audio file"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    plays: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Music", musicSchema);
