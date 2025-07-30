const Joi = require('joi');
const { logger } = require('../middleware/logger');

/**
 * Registration validation schema
 */
const registrationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  mobileNo: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be 10 digits',
      'any.required': 'Mobile number is required'
    }),
  githubUsername: Joi.string()
    .min(1)
    .max(39)
    .pattern(/^[a-zA-Z0-9-]+$/)
    .required()
    .messages({
      'string.min': 'GitHub username must be at least 1 character',
      'string.max': 'GitHub username cannot exceed 39 characters',
      'string.pattern.base': 'GitHub username can only contain letters, numbers, and hyphens',
      'any.required': 'GitHub username is required'
    }),
  rollNo: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Roll number must be at least 1 character',
      'string.max': 'Roll number cannot exceed 50 characters',
      'any.required': 'Roll number is required'
    }),
  accessCode: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Access code must be at least 1 character',
      'string.max': 'Access code cannot exceed 50 characters',
      'any.required': 'Access code is required'
    })
});

/**
 * Authentication validation schema
 */
const authenticationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  rollNo: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Roll number must be at least 1 character',
      'string.max': 'Roll number cannot exceed 50 characters',
      'any.required': 'Roll number is required'
    }),
  accessCode: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Access code must be at least 1 character',
      'string.max': 'Access code cannot exceed 50 characters',
      'any.required': 'Access code is required'
    }),
  clientID: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Client ID must be a valid UUID',
      'any.required': 'Client ID is required'
    }),
  clientSecret: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Client secret must be at least 1 character',
      'string.max': 'Client secret cannot exceed 100 characters',
      'any.required': 'Client secret is required'
    })
});

/**
 * Validate registration request
 */
function validateRegistration(data) {
  try {
    const { error, value } = registrationSchema.validate(data, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Registration validation failed', { data, errors });
      return { isValid: false, errors };
    }
    
    return { isValid: true, data: value };
  } catch (error) {
    logger.error('Registration validation error', { error: error.message });
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation error occurred' }] };
  }
}

/**
 * Validate authentication request
 */
function validateAuthentication(data) {
  try {
    const { error, value } = authenticationSchema.validate(data, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Authentication validation failed', { data, errors });
      return { isValid: false, errors };
    }
    
    return { isValid: true, data: value };
  } catch (error) {
    logger.error('Authentication validation error', { error: error.message });
    return { isValid: false, errors: [{ field: 'unknown', message: 'Validation error occurred' }] };
  }
}

module.exports = {
  validateRegistration,
  validateAuthentication
}; 