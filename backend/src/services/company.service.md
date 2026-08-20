# Company Service Documentation

## Purpose
Contains core business rules for borrowing companies, data validations, and database orchestration.

## Functions

### `createCompanyService(companyData)`
- **Called by**: `company.controller.js`
- **Validates**: `company_name` must be provided.
- **Returns**: Newly created company details object.

### `updateCompanyService(companyId, companyData)`
- **Called by**: `company.controller.js`
- **Validates**: Company existence check before performing update.

## Mentor Questions

### Q1. What happens if a non-existent company ID is queried?
**Answer**: `getCompanyByIdService()` throws a custom Error with `statusCode = 404`, which is caught by Express error middleware and returned as a clean 404 Not Found JSON response.
