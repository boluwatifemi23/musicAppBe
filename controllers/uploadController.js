

const ApiResponse = require('../utils/apiResponse');
const { uploadImage, uploadAudio, deleteFile } = require('../utils/cloudinaryUpload');

const uploadSingleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an image', 400);
    }

    const result = await uploadImage(req.file.path);

    return ApiResponse.success(
      res,
      {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format
      },
      'Image uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};


const uploadAudioFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please upload an audio file', 400);
    }

    const result = await uploadAudio(req.file.path);

    return ApiResponse.success(
      res,
      {
        url: result.url,
        publicId: result.publicId,
        duration: result.duration,
        format: result.format,
        size: result.bytes
      },
      'Audio uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};


const deleteUploadedFile = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType } = req.query;

    if (!publicId) {
      return ApiResponse.error(res, 'Public ID is required', 400);
    }

    await deleteFile(publicId, resourceType || 'image');

    return ApiResponse.success(res, null, 'File deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingleImage,
  uploadAudioFile,
  deleteUploadedFile
};