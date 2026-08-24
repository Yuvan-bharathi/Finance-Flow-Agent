# Agent 4: Financial Document Extraction & OCR Parsing Agent

---

## 1. Executive Summary
The **Financial Document Extraction & OCR Parsing Agent** (`agent_4_document`) is the automated ingestion, optical character recognition (OCR), and tabular transaction parsing engine of FinanceFlow AI. It transforms unstructured bank statement PDFs, scanned deposit slips, remittance advice letters, and GST invoices into structured JSON schema transaction rows ready for immediate reconciliation by Agent 1.

* **System ID**: `agent_4_document`
* **Agent Role**: Multimodal Bank Statement & Financial Document Parser
* **Execution Model**: Multimodal Vision Ingestion / Text Stream Parsing + Structured Schema Enforcement

```
   ┌──────────────────────────────────────────────┐
   │ Uploaded Bank Statement / Invoice (PDF / PNG)│
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │ Vision OCR & Token Extraction Layer          │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │ Structured JSON Parsing Engine:              │
   │  - Transaction Date (YYYY-MM-DD)             │
   │  - Value Date                                │
   │  - Sender / Beneficiary Account Number       │
   │  - UTR / Bank Reference Number               │
   │  - Narration & Transaction Type (CR / DR)    │
   │  - Deposit Amount (INR Decimal)              │
   │  - Running Account Balance                   │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │ Mathematical Balance & Checksum Validation   │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │ Staged directly into `payments` Table        │
   │ (Status: 'unmatched' -> Handed to Agent 1)   │
   └──────────────────────────────────────────────┘
```

---

## 2. Problem Solved & Business Use Case
Corporate borrowers remit loan repayments across 20+ banking platforms (SBI, HDFC, ICICI, Axis, Kotak) and submit monthly statements in diverse formats:
1. **Unstandardized Layouts**: Statements vary from multi-column tables to scanned photocopied slips.
2. **Manual Transcription Errors**: Keystroke errors when entering 16-digit UTR numbers or amounts cause false reconciliation failures.
3. **Turnaround Delays**: Processing a 50-page monthly statement manually takes several hours.
* **Agent 4 Solution**: Automates table segmentation, OCR extraction, and balance checksum verification in under 3 seconds per page, instantly staging validated payment records for Agent 1 reconciliation.

---

## 3. Technical Configuration & Parameters
* **LLM / Vision Model**: Groq Multimodal API (`llama-3.2-11b-vision-preview` / `qwen-2.5-32b`)
* **Temperature**: `0.0` (Zero randomness for 100% exact numerical extraction)
* **Output Format**: Strict JSON Schema Validation
* **System Prompt**: `DOCUMENT_AGENT_SYSTEM_PROMPT` in `backend/src/prompts/document.prompt.js`

### Target Extraction JSON Schema
```json
{
  "statement_metadata": {
    "bank_name": "string",
    "account_number": "string",
    "statement_period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
    "opening_balance": 0.00,
    "closing_balance": 0.00
  },
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD",
      "bank_reference": "UTR / Ref String",
      "sender_name": "Extracted Corporate Entity",
      "sender_account_number": "String",
      "type": "CR | DR",
      "amount": 0.00,
      "narration": "Full raw transaction description"
    }
  ]
}
```

---

## 4. Database Schema & Data Dependencies

```
  ┌───────────────────────┐          ┌───────────────────────┐
  │   document_uploads    ├─────────►│       payments        │
  └───────────────────────┘          └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │ reconciliation_cases  │
                                     └───────────────────────┘
```

### Table Schema Mappings
* **`document_uploads`**: `id`, `filename`, `file_type`, `file_size`, `uploaded_by`, `status` (`'pending'`, `'processing'`, `'extracted'`, `'failed'`), `extracted_count`, `created_at`.
* **`payments`**: `id`, `amount`, `payment_date`, `sender_name`, `sender_account_number`, `bank_reference`, `status` (`'unmatched'`).

---

## 5. Checksum & Integrity Validation Engine
Before staging rows into the `payments` table, Agent 4 performs double-entry mathematical validation:
1. **Transaction Sum Integrity**:
   $$\text{Calculated Closing Balance} = \text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits}$$
   If $|\text{Calculated} - \text{Extracted Closing Balance}| > 0.01$, the document is flagged for manual review with warning `"Balance Checksum Mismatch"`.
2. **Duplicate UTR Detection**:
   Queries `payments` table for existing `bank_reference`. Duplicate rows are skipped to prevent double-crediting.

---

## 6. Comprehensive Test Cases & Scenarios

| Test ID | Scenario | Input Document | Expected Extraction Output | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **TC-4.1** | Standard Digital Bank Statement | 5-line HDFC Bank e-statement PDF | 5 normalized credit rows extracted with exact dates, UTRs, amounts, and sender names. | Check staged rows in `/payment-ingestion`. |
| **TC-4.2** | Truncated Narration Parsing | Narration: `"NEFT-N987654321-APEX-LOGISTICS-MUMBAI"` | Extracts `sender_name = "APEX LOGISTICS"`, `bank_reference = "N987654321"`. | Inspect staged payment fields. |
| **TC-4.3** | Duplicate Payment Prevention | Upload statement with already ingested UTR | Identifies duplicate UTR, flags transaction, prevents duplicate insert in `payments`. | Verify database unique constraint logs. |
| **TC-4.4** | Checksum Balance Failure Handling | Statement where extracted rows don't sum to closing balance | Stages transactions with status `'flagged_checksum'` and adds warning tag in ingestion UI. | Check validation alert badge. |
| **TC-4.5** | Multi-Page Batch Parsing | 10-page consolidated statement with 50+ lines | Successfully extracts all pages without token overflow using streaming chunk parsing. | Inspect total staged count. |
