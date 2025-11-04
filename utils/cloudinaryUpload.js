// utils/cloudinaryUpload.js - Cloudinary Upload Utilities

const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Upload image to Cloudinary
 * @param {String} filePath - Local file path
 * @param {String} folder - Cloudinary folder name
 * @returns {Object} Cloudinary upload result
 */
const uploadImage = async (filePath, folder = 'music-app/images') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Max dimensions
        { quality: 'auto' }, // Auto quality
        { fetch_format: 'auto' } // Auto format (WebP if supported)
      ]
    });

    // Delete local file after upload
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    // Delete local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Image upload failed: ${error.message}`);
  }
};


const uploadAudio = async (filePath, folder = 'music-app/audio') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'video', // Audio must be treated as 'video' in Cloudinary
      use_filename: true,     // Keep the original filename
      unique_filename: false  // Optional: avoid random strings
    });

    // Delete local file after upload
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || 0,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error(`Audio upload failed: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Upload profile picture with circular crop
 * @param {String} filePath - Local file path
 * @returns {Object} Cloudinary upload result
 */
const uploadProfilePicture = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'music-app/profiles',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // Focus on face
        { radius: 'max' }, // Make it circular
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    // Delete local file after upload
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    // Delete local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Profile picture upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @param {String} resourceType - 'image' or 'video' (for audio)
 * @returns {Object} Deletion result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array} publicIds - Array of Cloudinary public IDs
 * @param {String} resourceType - 'image' or 'video' (for audio)
 * @returns {Object} Deletion result
 */
const deleteMultipleFiles = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    throw new Error(`Multiple files deletion failed: ${error.message}`);
  }
};

module.exports = {
  uploadImage,
  uploadAudio,
  uploadProfilePicture,
  deleteFile,
  deleteMultipleFiles
};