const { CASE_STATUS } = require('../../constants/caseStatus.constants');

const isResolved = (status) => status === CASE_STATUS.RESOLVED;
const isEscalated = (status) => status === CASE_STATUS.ESCALATED;
const isClosed = (status) => isResolved(status);
const canReceiveStatusUpdate = (status) => !isResolved(status);

module.exports = { isResolved, isEscalated, isClosed, canReceiveStatusUpdate };
