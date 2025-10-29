// utils/streamAudio.js - Audio Streaming Utilities

const axios = require('axios');

/**
 * Stream audio from Cloudinary URL with range support
 * @param {String} audioUrl - Cloudinary audio URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const streamAudio = async (audioUrl, req, res) => {
  try {
    // Get file info first
    const headResponse = await axios.head(audioUrl);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);
    const contentType = headResponse.headers['content-type'] || 'audio/mpeg';

    // Check if range header is present (for seeking in audio)
    const range = req.headers.range;

    if (range) {
      // Parse range header (e.g., "bytes=0-1023")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Set headers for partial content (206)
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      });

      // Stream the specified range
      const audioStream = await axios.get(audioUrl, {
        responseType: 'stream',
        headers: {
          Range: `bytes=${start}-${end}`
        }
      });

      audioStream.data.pipe(res);
    } else {
      // No range requested, stream entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000'
      });

      const audioStream = await axios.get(audioUrl, {
        responseType: 'stream'
      });

      audioStream.data.pipe(res);
    }
  } catch (error) {
    console.error('Audio streaming error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to stream audio'
    });
  }
};

/**
 * Get audio metadata from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Object} Audio metadata
 */
const getAudioMetadata = async (publicId) => {
  const cloudinary = require('../config/cloudinary');
  
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video' // Audio uses 'video' resource type
    });

    return {
      url: result.secure_url,
      duration: result.duration, // Duration in seconds
      format: result.format,
      size: result.bytes,
      bitRate: result.bit_rate,
      createdAt: result.created_at
    };
  } catch (error) {
    throw new Error(`Failed to get audio metadata: ${error.message}`);
  }
};

/**
 * Format duration from seconds to MM:SS
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration (MM:SS)
 */
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

module.exports = {
  streamAudio,
  getAudioMetadata,
  formatDuration
};