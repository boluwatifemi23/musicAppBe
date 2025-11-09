const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');


const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return ApiResponse.validationError(res, errors.array());
  }
  
  next();
};


const authValidation = {

  signup: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    
    validate
  ],


  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required'),
    
    validate
  ],


  verifyEmail: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('otp')
      .trim()
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must contain only numbers'),
    
    validate
  ],


  forgotPassword: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    validate
  ],


  resetPassword: [
    body('token')
      .notEmpty().withMessage('Reset token is required'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    
    validate
  ]
};


const userValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
    
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
    
    validate
  ]
};


const songValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Song title is required')
      .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1-100 characters'),
    
    body('artistId')
      .notEmpty().withMessage('Artist ID is required')
      .isMongoId().withMessage('Invalid artist ID'),
    
    body('albumId')
      .optional()
      .isMongoId().withMessage('Invalid album ID'),
    
    body('genre')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Genre must not exceed 50 characters'),
    
    body('duration')
      .optional()
      .isNumeric().withMessage('Duration must be a number'),
    
    validate
  ]
};


const albumValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Album title is required')
      .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1-100 characters'),
    
    body('artistId')
      .notEmpty().withMessage('Artist ID is required')
      .isMongoId().withMessage('Invalid artist ID'),
    
    body('genre')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Genre must not exceed 50 characters'),
    
    validate
  ]
};


const playlistValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Playlist name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    
    body('isPublic')
      .optional()
      .isBoolean().withMessage('isPublic must be a boolean'),
    
    validate
  ],

  update: [
    param('id')
      .isMongoId().withMessage('Invalid playlist ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1-100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    
    validate
  ]
};


const artistValidation = {
  create: [
    body('artistName')
      .trim()
      .notEmpty().withMessage('Artist name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Artist name must be between 2-50 characters'),
    
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
    
    validate
  ]
};


const idValidation = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  
  validate
];


const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  
  validate
];

module.exports = {
  validate,
  authValidation,
  userValidation,
  songValidation,
  albumValidation,
  playlistValidation,
  artistValidation,
  idValidation,
  paginationValidation
};