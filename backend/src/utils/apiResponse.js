/**
 * DFEMS Standardized API Response Envelope
 */

export const apiResponse = {
  success: (res, data, meta = {}, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    });
  },

  error: (res, message, code = 'INTERNAL_ERROR', details = null, statusCode = 500) => {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  },
};
