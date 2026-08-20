# Company Model Documentation

## Purpose
Executes raw SQL queries against the `companies` MySQL table using parameterized prepared statements.

## Functions

### `findAllCompanies(status)`
- Executes `SELECT * FROM companies WHERE status = ?`.

### `findCompanyById(companyId)`
- Executes `SELECT c.*, COUNT(l.id) AS total_loans FROM companies c LEFT JOIN loans l ...`.

### `insertCompany(companyData)`
- Executes `INSERT INTO companies (...) VALUES (...)`.

## Mentor Questions

### Q1. How are SQL injection attacks prevented in model queries?
**Answer**: Every query uses MySQL parameterized placeholder statements (`pool.execute(query, [params])`). User input values are sanitized and transmitted separately from SQL syntax.
