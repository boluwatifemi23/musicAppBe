

const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
  
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});


const imageFilter = (req, file, cb) => {

  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};


const audioFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|ogg|m4a|flac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /audio/.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, flac)'));
  }
};


const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

const uploadAudio = multer({
  storage: storage,
  fileFilter: audioFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE) || 50 * 1024 * 1024 // 50MB default
  }
});


const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 
  }
});


const uploadSingleImage = uploadImage.single('image');


const uploadMultipleImages = uploadImage.array('images', 10); 


const uploadSingleAudio = uploadAudio.single('audio');


const uploadProfilePicture = uploadImage.single('profilePicture');


const uploadCoverImage = uploadImage.single('coverImage');


const uploadSong = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);


const uploadAlbum = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'songs', maxCount: 20 }
]);


const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for audio and 5MB for images.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }

 
  next(err);
};

module.exports = {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleAudio,
  uploadProfilePicture,
  uploadCoverImage,
  uploadSong,
  uploadAlbum,
  handleMulterError
};