const prisma = require("./prisma");

/**
 * Logs an action to the AuditLog table.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} action - The action performed (e.g., "CREATED", "UPDATED", "DELETED").
 * @param {string} entity - The entity being affected (e.g., "PRODUCT", "INVOICE").
 * @param {string} entityId - The ID of the affected entity.
 */
const logAction = async (userId, action, entity, entityId) => {
  try {
    if (!userId) {
      console.warn(`AuditLog warning: Missing userId for action ${action} on ${entity} ${entityId}`);
      return;
    }
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity,
        entity_id: entityId
      }
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
};

module.exports = { logAction };
