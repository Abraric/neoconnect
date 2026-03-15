/**
 * Extract pagination params from query and return offset + limit.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build paginated response shape.
 * @param {Array} data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
const buildPaginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

module.exports = { getPagination, buildPaginatedResponse };
