// utils/validators.js - validation helper functions

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password
 * @param {string} password 
 * @returns {object} { isValid: boolean, error: string }
 */
const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            error: 'Password is required'
        };
    }

    if (password.length < 6) {
        return {
            isValid: false,
            error: 'Password must be at least 6 characters'
        };
    }

    if (password.length > 50) {
        return {
            isValid: false,
            error: 'Password must be less than 50 characters'
        };
    }

    return {
        isValid: true,
        error: null
    };
};

/**
 * Validate required field
 * @param {any} value 
 * @param {string} fieldName 
 * @returns {object}
 */
const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return {
            isValid: false,
            error: `${fieldName} is required`
        };
    }
    return {
        isValid: true,
        error: null
    };
};

module.exports = {
    validateEmail,
    validatePassword,
    validateRequired
};
