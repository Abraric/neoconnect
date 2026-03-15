const isWorkingDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Add N working days to a given date (skips weekends).
 * @param {Date} startDate
 * @param {number} days
 * @returns {Date}
 */
const addWorkingDays = (startDate, days) => {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      added++;
    }
  }
  return result;
};

/**
 * Count working days between two dates.
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
const countWorkingDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkingDay(cur)) count++;
  }
  return count;
};

module.exports = { addWorkingDays, countWorkingDays };
