import { generateCollectionReminderService, sendCollectionReminderService } from '../services/collection.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

export const generateCollectionReminder = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    const result = await generateCollectionReminderService(companyId);
    return sendSuccessResponse(res, 200, 'Collection follow-up reminder generated successfully', result);
  } catch (error) {
    return next(error);
  }
};

export const sendCollectionReminder = async (req, res, next) => {
  try {
    const { companyId, draftPayload } = req.body;
    const result = await sendCollectionReminderService(companyId, draftPayload, req.user?.id);
    return sendSuccessResponse(res, 200, 'Collection follow-up reminder sent successfully', result);
  } catch (error) {
    return next(error);
  }
};
