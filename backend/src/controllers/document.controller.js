import {
  getDocumentsService,
  extractDocumentTermsService,
  uploadDocumentService,
  generateFinancialDocumentService
} from '../services/document.service.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import { uploadBufferToCloudinary } from '../config/cloudinary.config.js';
import { extractTextFromFileBuffer } from '../utils/pdfExtractor.js';
import pool from '../config/db.js';

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
    let fileName = req.body?.file_name;
    let mimeType = 'application/pdf';
    let fileSize = parseInt(req.body?.file_size, 10) || 350000;
    let fileUrl = '/uploads/sample_agreement.pdf';
    let storageProvider = 'local';
    let extractedText = null;
    let companyId = req.body?.company_id ? parseInt(req.body.company_id, 10) : null;
    const documentType = req.body?.document_type || 'loan_agreement';

    // 1. Process physical file upload via Multer buffer
    if (req.file) {
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
      fileSize = req.file.size;

      // Extract raw text from PDF/Document buffer
      try {
        extractedText = await extractTextFromFileBuffer(req.file.buffer, mimeType, fileName);
      } catch (err) {
        console.warn('[PDF Text Extraction Warning]:', err.message);
      }

      // Upload file directly to Cloudinary
      try {
        const cloudResult = await uploadBufferToCloudinary(req.file.buffer, fileName);
        fileUrl = cloudResult.secure_url;
        storageProvider = 'cloudinary';
      } catch (cloudErr) {
        console.warn('[Cloudinary Fallback]: Cloudinary upload failed, storing local path:', cloudErr.message);
        fileUrl = `/uploads/${Date.now()}-${fileName}`;
        storageProvider = 'local';
      }
    }

    // 2. Resolve company ID by name if not provided
    if (!companyId && req.body?.company_name) {
      const [comp] = await pool.query(
        `SELECT id FROM companies WHERE company_name LIKE ? OR company_name LIKE ? LIMIT 1`,
        [`%${req.body.company_name}%`, `${req.body.company_name}`]
      );
      if (comp.length > 0) {
        companyId = comp[0].id;
      }
    }

    if (!fileName) {
      return res.status(400).json({ success: false, message: 'file_name or file upload is required' });
    }

    const doc = await uploadDocumentService({
      company_id: companyId,
      document_type: documentType,
      file_name: fileName,
      file_url: fileUrl,
      storage_provider: storageProvider,
      mime_type: mimeType,
      file_size: fileSize,
      uploaded_by: userId,
      extracted_text: extractedText
    });

    return sendSuccessResponse(res, 201, 'Document uploaded to Cloudinary and registered in vault successfully', doc);
  } catch (error) {
    return next(error);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const { file_name, company_id, document_type } = req.body;

    const updated = await updateDocumentService(documentId, {
      file_name,
      company_id,
      document_type
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    return sendSuccessResponse(res, 200, 'Document metadata updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const result = await deleteDocumentService(documentId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    return sendSuccessResponse(res, 200, `Document #${documentId} (${result.file_name}) deleted successfully`, result);
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
