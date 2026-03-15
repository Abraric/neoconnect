const { CASE_STATUS } = require('../../constants/caseStatus.constants');

const VALID_TRANSITIONS = {
  [CASE_STATUS.NEW]: [CASE_STATUS.ASSIGNED],
  [CASE_STATUS.ASSIGNED]: [CASE_STATUS.IN_PROGRESS, CASE_STATUS.ESCALATED],
  [CASE_STATUS.IN_PROGRESS]: [CASE_STATUS.PENDING, CASE_STATUS.RESOLVED, CASE_STATUS.ESCALATED],
  [CASE_STATUS.PENDING]: [CASE_STATUS.IN_PROGRESS],
  [CASE_STATUS.RESOLVED]: [],
  [CASE_STATUS.ESCALATED]: [CASE_STATUS.IN_PROGRESS],
};

const isValidTransition = (fromStatus, toStatus) => {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

module.exports = { VALID_TRANSITIONS, isValidTransition };
