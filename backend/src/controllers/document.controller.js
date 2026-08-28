import {
  getDocumentsService,
  extractDocumentTermsService,
  uploadDocumentService,
  generateFinancialDocumentService
} from '../services/document.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

export const getDocuments = async (req, res, next) => {
  try {
    const docs = await getDocumentsService();
    return sendSuccessResponse(res, 200, 'Documents retrieved successfully', docs);
  } catch (error) {
    return next(error);
  }
};

export const uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { company_id, document_type, file_name, file_size } = req.body;
    
    if (!file_name) {
      return res.status(400).json({ success: false, message: 'file_name is required' });
    }

    const doc = await uploadDocumentService({
      company_id: company_id ? parseInt(company_id, 10) : null,
      document_type: document_type || 'loan_agreement',
      file_name,
      file_size: file_size || 350000,
      uploaded_by: userId
    });

    return sendSuccessResponse(res, 201, 'Document uploaded and registered in vault successfully', doc);
  } catch (error) {
    return next(error);
  }
};

export const extractDocumentTerms = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    const userId = req.user ? req.user.id : null;
    const result = await extractDocumentTermsService(documentId, userId);
    return sendSuccessResponse(res, 200, 'Document intelligence key terms extracted', result);
  } catch (error) {
    return next(error);
  }
};

export const generateDocument = async (req, res, next) => {
  try {
    const { type, caseId } = req.params;
    const result = await generateFinancialDocumentService(type, parseInt(caseId, 10));
    return sendSuccessResponse(res, 200, 'Standardized financial document generated successfully', result);
  } catch (error) {
    return next(error);
  }
};
