const { ROLES } = require('../../constants/roles.constants');

const canAssign = (user) => user.role === ROLES.SECRETARIAT || user.role === ROLES.ADMIN;

const canUpdateStatus = (user, assignment) => {
  return user.role === ROLES.CASE_MANAGER && assignment && assignment.managerId === user.id && assignment.isActive;
};

const canViewCase = (user, caseRecord) => {
  if (user.role === ROLES.SECRETARIAT || user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.CASE_MANAGER) {
    return caseRecord.assignments?.some((a) => a.managerId === user.id && a.isActive);
  }
  if (user.role === ROLES.STAFF) {
    return !caseRecord.isAnonymous && caseRecord.submitterId === user.id;
  }
  return false;
};

const canDownloadAttachment = (user, caseRecord) => {
  return (
    user.role === ROLES.SECRETARIAT ||
    user.role === ROLES.ADMIN ||
    (user.role === ROLES.CASE_MANAGER &&
      caseRecord.assignments?.some((a) => a.managerId === user.id && a.isActive))
  );
};

module.exports = { canAssign, canUpdateStatus, canViewCase, canDownloadAttachment };
