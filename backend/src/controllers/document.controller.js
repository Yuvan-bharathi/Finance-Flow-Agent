import { getDocumentsService, extractDocumentTermsService } from '../services/document.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

export const getDocuments = async (req, res, next) => {
  try {
    const docs = await getDocumentsService();
    return sendSuccessResponse(res, 200, 'Documents retrieved successfully', docs);
  } catch (error) {
    return next(error);
  }
};

export const extractDocumentTerms = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    const result = await extractDocumentTermsService(documentId);
    return sendSuccessResponse(res, 200, 'Document intelligence key terms extracted', result);
  } catch (error) {
    return next(error);
  }
};
