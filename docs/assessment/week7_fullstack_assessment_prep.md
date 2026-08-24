# Week 7 — Full Stack Technical Assessment Preparation
## Complete Study Guide for Mentor Evaluation

> **How to Use This Document**: Read each section → understand the concept → say the answer out loud → check the code → practice the follow-up questions. Don't memorize. Understand.

---

# TABLE OF CONTENTS

1. [Module 1 — Full Stack Architecture](#module-1)
2. [Module 2 — Project Structure](#module-2)
3. [Module 3 — Frontend-Backend Integration](#module-3)
4. [Module 4 — State Management](#module-4)
5. [Module 5 — Authentication & Authorization](#module-5)
6. [Module 6 — CRUD Operations](#module-6)
7. [Module 7 — Database Integration](#module-7)
8. [Module 8 — File Uploads](#module-8)
9. [Module 9 — Error Handling](#module-9)
10. [Module 10 — Logging](#module-10)
11. [Module 11 — Swagger / OpenAPI](#module-11)
12. [Module 12 — Environment Configuration](#module-12)
13. [Module 13 — Testing](#module-13)
14. [Module 14 — WebSocket & Real-Time Chat](#module-14)
15. [Module 15 — Deployment](#module-15)
16. [Module 16 — Responsive UI](#module-16)
17. [Module 17 — Code Quality](#module-17)
18. [Module 18 — Project Review](#module-18)
19. [Debugging Round — 30 Real Bugs](#debugging-round)
20. [Live Coding Tasks — 25 Tasks](#live-coding-tasks)
21. [Why? Question Bank — 50 Questions](#why-question-bank)
22. [Rapid-Fire Round — 75 Questions](#rapid-fire-round)
23. [Scenario-Based Assessment](#scenario-based-assessment)
24. [Architecture Design Questions](#architecture-design-questions)
25. [Project Presentation Preparation](#project-presentation-preparation)
26. [Cheat Sheets](#cheat-sheets)

---

# MODULE 1 — FULL STACK ARCHITECTURE

## What is a Full-Stack Application?

A full-stack application has THREE main parts working together:

1. **Frontend** — What the user sees (React, HTML, CSS)
2. **Backend** — Business logic and API (Node.js + Express)
3. **Database** — Where data is stored (MySQL, MongoDB)

> **Say this to your mentor**: "A full-stack application means I've built everything — from the user interface the user interacts with, to the server that processes requests, to the database that stores the data. All three layers work together."

---

## The Request-Response Lifecycle

```
USER CLICKS BUTTON
       |
       v
React Component (handles click event)
       |
       v
API Service (axios.post('/api/login', data))
       |
       v
HTTP Request travels over internet
       |
       v
Express Server receives request
       |
       v
Route matches (/api/login => router.post)
       |
       v
Middleware runs (validateInput, verifyToken)
       |
       v
Controller executes (loginController)
       |
       v
Service called (authService.login)
       |
       v
Repository queries database (findUserByEmail)
       |
       v
MySQL returns data
       |
       v
Service processes data (compare password, generate JWT)
       |
       v
Controller sends response (res.json({token}))
       |
       v
HTTP Response travels back
       |
       v
React receives response
       |
       v
State updates (setUser, setToken)
       |
       v
UI re-renders (shows user dashboard)
```

> **Remember**: Every single user action follows this path. Understanding this flow separates junior from mid-level developers.

---

## The Layered Architecture Explained

### 1. Routes Layer
**What it does**: Defines which URL maps to which controller function.
```javascript
// backend/src/routes/employee.routes.js
router.post('/employees', authMiddleware, employeeController.create);
router.get('/employees', authMiddleware, employeeController.getAll);
```
**Rule**: Routes should ONLY define paths and attach middleware. No logic here.

### 2. Middleware Layer
**What it does**: Runs BEFORE the controller. Used for authentication, validation, logging.
```javascript
// backend/src/middleware/auth.middleware.js
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next(); // passes to controller
};
```
**Rule**: Middleware runs in sequence. Call `next()` to continue, or send a response to stop.

### 3. Controller Layer
**What it does**: Receives the HTTP request, calls the service, sends the response.
```javascript
// backend/src/controllers/employee.controller.js
const create = async (req, res, next) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error); // pass to global error handler
  }
};
```
**Rule**: Controller should NOT contain business logic. It just orchestrates.

### 4. Service Layer
**What it does**: Contains ALL business logic (calculations, validations, rules).
```javascript
// backend/src/services/employee.service.js
const create = async (data) => {
  if (!data.email || !data.name) throw new Error('Name and email required');
  const exists = await employeeRepository.findByEmail(data.email);
  if (exists) throw new Error('Employee already exists');
  return await employeeRepository.create(data);
};
```
**Rule**: Service should NOT know about HTTP (no req, res here). It only works with data.

### 5. Repository Layer
**What it does**: All database queries live here. Nothing else.
```javascript
// backend/src/repositories/employee.repository.js
const create = async (data) => {
  const [result] = await db.query(
    'INSERT INTO employees (name, email, department) VALUES (?, ?, ?)',
    [data.name, data.email, data.department]
  );
  return result;
};
```
**Rule**: Repository should ONLY speak to the database. No business logic.

---

## Architecture Interview Q&A

### Q: Why separate Controller and Service?

> "If I write business logic inside the controller, it becomes impossible to reuse and test. For example, if two different routes need the same logic to check if an employee exists, I'd have to copy-paste it. With a service layer, both routes call the same service function. The controller just handles HTTP, and the service handles the rules."

**Common Mistake**: Writing `db.query()` directly inside the controller.

**Follow-up 1**: What happens if you put everything in one file?
> "It becomes spaghetti code. Impossible to find bugs, add features, or for another developer to understand it."

**Follow-up 2**: Where should validation happen?
> "Both places. Frontend for instant user feedback. Backend ALWAYS again — never trust frontend. A user can bypass frontend using Postman."

**Follow-up 3**: Where should business logic live?
> "In the Service layer. Not in the controller (which handles HTTP), not in the repository (which handles DB), not in the route."

---

# MODULE 2 — PROJECT STRUCTURE

## Professional Project Structure

```
project-root/
|-- frontend/
|   |-- src/
|   |   |-- components/       <- Reusable UI pieces (Button, Modal, Table)
|   |   |-- pages/            <- Full page views (Dashboard, Login, Employees)
|   |   |-- services/         <- All API calls (api.js, auth.service.js)
|   |   |-- hooks/            <- Custom React hooks (useAuth, useFetch)
|   |   |-- context/          <- Global state (AuthContext, ThemeContext)
|   |   |-- utils/            <- Helper functions (formatDate, formatCurrency)
|   |   |-- assets/           <- Images, icons, fonts
|   |   |-- routes/           <- Route definitions and ProtectedRoute
|   |   `-- App.jsx           <- Root component, routing setup
|   |-- .env                  <- VITE_API_URL=http://localhost:5000
|   |-- .env.example          <- Template for others (safe to commit)
|   `-- vite.config.js
|
|-- backend/
|   |-- src/
|   |   |-- controllers/      <- Handle HTTP req/res
|   |   |-- services/         <- Business logic
|   |   |-- repositories/     <- Database queries (SQL)
|   |   |-- routes/           <- URL -> controller mapping
|   |   |-- middleware/       <- auth, validation, logging
|   |   |-- models/           <- Data shapes / schema definitions
|   |   |-- config/           <- db.js, swagger config
|   |   |-- utils/            <- Helper functions
|   |   `-- app.js            <- Express app setup
|   |-- uploads/              <- Local uploaded files
|   |-- .env                  <- DB credentials, JWT_SECRET (NEVER commit)
|   `-- .env.example          <- Safe template
|
|-- database/
|   |-- schema.sql            <- Table creation scripts
|   `-- seed.sql              <- Initial data
|
`-- docs/                     <- Documentation files
```

---

## Folder Responsibility Q&A

| Question | Answer |
| :--- | :--- |
| Where does JWT verification go? | `backend/src/middleware/auth.middleware.js` |
| Where do React API calls go? | `frontend/src/services/api.js` |
| Where do SQL queries go? | `backend/src/repositories/` |
| Where does global auth state go? | `frontend/src/context/AuthContext.jsx` |
| Where does password hashing logic go? | `backend/src/services/auth.service.js` |
| Where does file upload config go? | `backend/src/config/multer.js` |

### Q: Why shouldn't components contain database logic?
> "React components run in the browser. The browser has no direct access to the database. Putting database queries in components would also expose your database credentials to anyone who views the page source. The component's job is to display data, not query databases."

---

# MODULE 3 — FRONTEND-BACKEND INTEGRATION

## HTTP Methods

| Method | When to Use | Example |
| :--- | :--- | :--- |
| **GET** | Retrieve data | `GET /employees` |
| **POST** | Create new resource | `POST /employees` |
| **PUT** | Replace entire resource | `PUT /employees/1` |
| **PATCH** | Update specific fields only | `PATCH /employees/1` |
| **DELETE** | Remove a resource | `DELETE /employees/1` |

## HTTP Status Codes

| Code | Meaning | When to Use |
| :--- | :--- | :--- |
| **200** | OK | Successful GET, PUT |
| **201** | Created | Successful POST |
| **204** | No Content | Successful DELETE |
| **400** | Bad Request | Missing/invalid input |
| **401** | Unauthorized | No token / invalid token |
| **403** | Forbidden | Valid token, but no permission |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate record |
| **500** | Internal Server Error | Server/DB crash |

---

## Complete API Integration Flow

### Step 1: Backend API (Express)
```javascript
// backend/src/routes/employee.routes.js
router.post('/employees', authMiddleware, employeeController.create);

// backend/src/controllers/employee.controller.js
const create = async (req, res, next) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};
```

### Step 2: Frontend API Service
```javascript
// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Automatically handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const createEmployee = (data) => api.post('/employees', data);
export const getEmployees = (params) => api.get('/employees', { params });
```

### Step 3: React Component with Loading & Error States
```javascript
// frontend/src/pages/Employees.jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (formData) => {
  setLoading(true);
  setError(null);
  try {
    const response = await createEmployee(formData);
    // Update UI with response.data
  } catch (err) {
    setError(err.response?.data?.message || 'Something went wrong');
  } finally {
    setLoading(false); // Always runs — success or failure
  }
};

return (
  <div>
    {error && <div className="error">{error}</div>}
    {loading ? <Spinner /> : <EmployeeTable />}
  </div>
);
```

---

## CORS Explained Simply

> **What is CORS?** A browser security rule. When your React app at `http://localhost:5173` calls backend at `http://localhost:5000`, the browser blocks it because they're on different origins (different ports count).

```javascript
// backend/src/app.js
import cors from 'cors';

app.use(cors({
  origin: process.env.CLIENT_URL, // 'http://localhost:5173' in dev
  credentials: true,
}));
```

**Common Mistake**: `origin: '*'` in production allows ANY website to call your API.

**Follow-ups**:
- Where is CORS enforced? → In the BROWSER, not the server.
- Can Postman cause CORS errors? → No. Postman is not a browser.
- How to debug? → DevTools Console shows exact missing header.

---

# MODULE 4 — STATE MANAGEMENT

## Types of State

| Type | What it Holds | Tool |
| :--- | :--- | :--- |
| **Local State** | Form input, toggle, modal open/close | `useState` |
| **Global State** | Logged-in user, theme | Context API |
| **Server State** | Data fetched from API | useState + useEffect |
| **UI State** | Loading spinner, error message | useState |

## Context API — Global State
```javascript
// frontend/src/context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) // Persist on refresh
  );
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## useEffect Common Mistakes
```javascript
// RUNS ONCE on mount — CORRECT
useEffect(() => { fetchEmployees(); }, []);

// RUNS when id changes — CORRECT
useEffect(() => { fetchEmployee(id); }, [id]);

// INFINITE LOOP — WRONG
useEffect(() => {
  setData(something); // setting state
}, [data]); // depending on state being set -> infinite loop
```

## Scenario: Username in Header, Sidebar, Dashboard
> "I store the user in AuthContext. All three components call `useAuth()` to access the same user object. When login() is called, it updates the context which triggers a re-render in every component using it — Header, Sidebar, Dashboard all update automatically."

**Why NOT props?** → Props drilling. You'd pass user through 4+ levels of components.

---

# MODULE 5 — AUTHENTICATION & AUTHORIZATION

## Authentication vs Authorization
> **Authentication**: Proving who you are ("I am Yuvan") — Login, JWT.
> **Authorization**: What you're allowed to do ("Yuvan can access admin routes") — Role check.

## Complete Login Flow
```
1. User enters email + password
2. POST /api/auth/login { email, password }
3. Backend: findUserByEmail(email) from DB
4. If not found -> 401 Unauthorized
5. bcrypt.compare(password, user.password_hash)
6. If no match -> 401 Unauthorized  
7. jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1d' })
8. Return { token, user }
9. Frontend: localStorage.setItem('token', token)
10. AuthContext: login(user, token)
11. Redirect to dashboard
```

## bcrypt — Password Hashing
```javascript
// Registration — hash before saving
const hashedPassword = await bcrypt.hash(plainPassword, 10);
// Store hashedPassword in DB, NEVER the plain password

// Login — compare
const isMatch = await bcrypt.compare(plainPassword, storedHash);
if (!isMatch) throw new Error('Invalid credentials');
```

**Follow-ups**:
- What are salt rounds? → How many times bcrypt scrambles. 10 is the standard.
- Can you unhash a bcrypt hash? → No. bcrypt is one-way. You can only compare.

## JWT Middleware
```javascript
// backend/src/middleware/auth.middleware.js
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role } available in controller
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

## Protected Frontend Route
```javascript
// frontend/src/routes/ProtectedRoute.jsx
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Usage
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>
} />
```

## Role-Based Middleware
```javascript
// backend/src/middleware/role.middleware.js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access forbidden' });
  }
  next();
};

// Usage
router.delete('/employees/:id',
  authMiddleware,
  requireRole('admin'),
  employeeController.remove
);
```

### Key Q&A

| Question | Answer |
| :--- | :--- |
| What is 401 vs 403? | 401 = "Who are you?" (no token). 403 = "I know you, you can't do this." |
| What if someone manually types /admin? | ProtectedRoute redirects immediately. Even if bypassed, backend API returns 403. |
| Why hash passwords? | If DB is hacked, plain text exposes every user. Hashes cannot be reversed. |
| Where is JWT stored? | localStorage (accessible to JS) or httpOnly cookie (more secure, JS cannot read) |

---

# MODULE 6 — CRUD OPERATIONS

## Complete CRUD Example — Employee

### SQL Schema
```sql
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  department VARCHAR(100),
  salary DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Repository
```javascript
const findAll = async ({ page = 1, limit = 10, search = '' }) => {
  const offset = (page - 1) * limit;
  const [rows] = await db.query(
    'SELECT * FROM employees WHERE name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [`%${search}%`, limit, offset]
  );
  return rows;
};
const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
  return rows[0] || null;
};
const create = async ({ name, email, department, salary }) => {
  const [result] = await db.query(
    'INSERT INTO employees (name, email, department, salary) VALUES (?, ?, ?, ?)',
    [name, email, department, salary]
  );
  return { id: result.insertId, name, email, department, salary };
};
const update = async (id, data) => {
  const [result] = await db.query(
    'UPDATE employees SET name=?, email=?, department=?, salary=? WHERE id=?',
    [data.name, data.email, data.department, data.salary, id]
  );
  return result.affectedRows > 0;
};
const remove = async (id) => {
  const [result] = await db.query('DELETE FROM employees WHERE id=?', [id]);
  return result.affectedRows > 0;
};
```

### CRUD Q&A

| Question | Answer |
| :--- | :--- |
| PUT vs PATCH? | PUT replaces entire record. PATCH updates only sent fields. |
| What status for DELETE? | 204 No Content (success, no body) |
| What if ID doesn't exist? | Service throws 404 error, controller catches and returns 404 |
| How to prevent SQL injection? | Parameterized queries with ? placeholders — never concatenate user input |
| How to handle duplicates? | Check existence before INSERT, return 409 Conflict |
| How to validate request? | express-validator middleware before controller |

---

# MODULE 7 — DATABASE INTEGRATION

## MySQL Connection Pool
```javascript
// backend/src/config/db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false } // for cloud DBs like TiDB
});

export default pool;
```

**Q: Why connection pool?**
> "Creating a new DB connection per request takes 50-200ms. A pool reuses existing connections. When a request comes in, it borrows one and returns it when done. This is dramatically faster."

## Joins
```sql
-- INNER JOIN: Only matching rows in BOTH tables
SELECT e.name, d.name as dept
FROM employees e
INNER JOIN departments d ON e.department_id = d.id;

-- LEFT JOIN: ALL employees, even without a department
SELECT e.name, d.name as dept
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;
```

**Q: INNER vs LEFT JOIN?**
> "INNER JOIN only shows rows with a match in both tables. LEFT JOIN shows all rows from the left table and fills NULL for missing right-table data. Use LEFT JOIN when you want to see all employees, including those not yet assigned to a department."

## Transactions
```javascript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
  await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
  await connection.commit();
} catch (error) {
  await connection.rollback(); // Undo everything
  throw error;
} finally {
  connection.release(); // Return to pool
}
```

**Q: When to use a transaction?**
> "When multiple DB operations must all succeed or all fail. Transfer money: debit account A AND credit account B must both succeed. If credit fails, rollback the debit."

## Pagination
```javascript
// GET /employees?page=2&limit=10
const offset = (page - 1) * limit; // page 2 -> offset 10
const [rows] = await db.query('SELECT * FROM employees LIMIT ? OFFSET ?', [limit, offset]);
const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM employees');
return { data: rows, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), total } };
```

---

# MODULE 8 — FILE UPLOADS

## Why Normal JSON Can't Upload Files
> "JSON is text format. Files are binary data (raw bytes). You can't represent binary in JSON. We use `multipart/form-data` which sends multiple parts — text fields AND binary files — in one request."

## Complete Upload Setup
```javascript
// backend/src/config/multer.js
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG and WEBP allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

```javascript
// React frontend
const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file); // 'avatar' MUST match upload.single('avatar')
  
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

**Q: What if upload succeeds but DB fails?**
> "File is saved to disk but DB has no record. It's an orphaned file. Fix: in catch block, delete the file: `fs.unlinkSync(req.file.path)` then throw the DB error."

---

# MODULE 9 — ERROR HANDLING

## Global Error Middleware (Backend)
```javascript
// backend/src/middleware/error.middleware.js
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Register LAST in app.js
app.use(errorHandler);
```

## Frontend Error Pattern
```javascript
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  try {
    await someApiCall();
  } catch (err) {
    setError(err.response?.data?.message || err.message || 'Something went wrong');
  } finally {
    setLoading(false);
  }
};
```

## Debugging Common Errors

### 500 Internal Server Error
```
Causes:  Unhandled exception, DB syntax error, undefined property access
Debug:   Check backend console for stack trace with line number
Fix:     Handle the specific exception; add try-catch; check DB query
```

### 401 Unauthorized
```
Causes:  No token sent, token expired, wrong JWT_SECRET
Debug:   DevTools Network -> check Authorization header on request
         Decode token at jwt.io -> is it expired?
Fix:     Ensure interceptor attaches token; handle expiry redirect
```

### CORS Error
```
Causes:  CLIENT_URL wrong in backend, no credentials: true
Debug:   Browser console shows exact "Access-Control-Allow-Origin" error
Fix:     cors({ origin: 'https://exact-frontend-url.com', credentials: true })
```

---

# MODULE 10 — LOGGING

## Structured Logging
```javascript
// Good log
console.log(JSON.stringify({
  level: 'info',
  event: 'user_login',
  userId: user.id,
  timestamp: new Date().toISOString(),
}));

// NEVER LOG
console.log(password);              // Sensitive
console.log(process.env.JWT_SECRET); // Secret key
console.log(req.body);              // May contain passwords
```

**Log Levels**:
- **debug**: Detailed dev info (disable in production)
- **info**: Normal events (user logged in, record created)
- **warn**: Unexpected but not breaking
- **error**: Something broke, needs attention

---

# MODULE 11 — SWAGGER / OPENAPI

## What is Swagger?
> "Swagger automatically generates interactive API documentation from code annotations. Developers can see all endpoints, required inputs, expected responses, and even test them directly in the browser."

```javascript
// backend/src/config/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);

// In app.js
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Access at: http://localhost:5000/api-docs
```

```javascript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Returns JWT token
 *       401:
 *         description: Invalid credentials
 */
```

---

# MODULE 12 — ENVIRONMENT CONFIGURATION

## .env Files
```bash
# backend/.env  (NEVER commit to Git)
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=myapp_db
JWT_SECRET=your-super-secret-key-at-least-32-chars
CLIENT_URL=http://localhost:5173
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# frontend/.env
VITE_API_URL=http://localhost:5000/api
```

```bash
# backend/.env.example  (Safe to commit — no real values)
PORT=5000
NODE_ENV=development
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
CLIENT_URL=
```

### Key Q&A

| Question | Answer |
| :--- | :--- |
| Why never commit .env? | Contains DB passwords, JWT secrets. Anyone with access can steal your data and forge tokens. |
| Why .env.example? | Shows teammates what variables are needed without exposing real values. |
| How does frontend use env vars? | `import.meta.env.VITE_API_URL` — only vars with VITE_ prefix are exposed. |
| Why no secrets in React code? | React compiles to browser JavaScript. Anyone can read it in DevTools. |
| What changes between dev and prod? | DB host, CLIENT_URL, API URL, NODE_ENV. |

---

# MODULE 13 — TESTING

## Types of Tests

| Type | Tests | Tools |
| :--- | :--- | :--- |
| **Unit** | Single function in isolation | Jest, Vitest |
| **Integration** | Multiple layers together | Jest + Supertest |
| **API** | Full HTTP request/response | Supertest, Postman |
| **E2E** | Full user journey in browser | Cypress |

## API Test Example
```javascript
// backend/src/tests/employee.test.js
import request from 'supertest';
import app from '../app.js';

let authToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password' });
  authToken = res.body.token;
});

describe('Employee API', () => {
  test('GET /api/employees returns 200', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST without token returns 401', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(401);
  });
});
```

---

# MODULE 14 — WEBSOCKET & REAL-TIME CHAT

## HTTP vs WebSocket

| | HTTP | WebSocket |
| :--- | :--- | :--- |
| **Connection** | New per request | One persistent connection |
| **Direction** | Client -> Server only | Both directions simultaneously |
| **Use Case** | CRUD APIs | Chat, notifications, live data |
| **Latency** | Higher (new connection overhead) | Lower (persistent pipe) |

## Backend Socket.IO
```javascript
// backend/src/server.js
import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

// Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send_message', async ({ roomId, content }) => {
    const message = await saveMessage({ userId: socket.user.id, roomId, content });
    io.to(roomId).emit('new_message', {
      id: message.id,
      userId: socket.user.id,
      content,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    io.emit('user_offline', { userId: socket.user.id });
  });
});
```

## Frontend Socket.IO
```javascript
// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      auth: { token }, // JWT for socket auth
    });
    return () => socketRef.current?.disconnect();
  }, [token]);

  return socketRef.current;
};

// In Chat component
const socket = useSocket();

useEffect(() => {
  socket?.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
  return () => socket?.off('new_message');
}, [socket]);

const sendMessage = (content) => {
  socket?.emit('send_message', { roomId, content });
};
```

### Key Q&A

| Question | Answer |
| :--- | :--- |
| Why WebSocket over polling? | Polling wastes bandwidth asking "any new messages?" every second. WebSocket server pushes instantly. |
| How to persist messages? | Save to DB inside `socket.on('send_message')` BEFORE broadcasting. |
| How to authenticate sockets? | Send JWT in `socket.handshake.auth.token`, verify in `io.use()` middleware. |
| What happens on disconnect? | `socket.on('disconnect')` fires. Clean up rooms, update online status. |
| What are rooms? | Named groups. `socket.join('room-1')` adds a client. `io.to('room-1').emit()` sends to all members. |

---

# MODULE 15 — DEPLOYMENT

## Local vs Production Architecture

```
LOCAL:                           PRODUCTION:
Frontend -> localhost:5173        Frontend -> Vercel (CDN)
Backend  -> localhost:5000        Backend  -> Render / Railway
Database -> localhost:3306        Database -> Cloud MySQL (TiDB / PlanetScale)
```

## Deployment Checklists

### Frontend (Vercel)
```
[ ] npm run build succeeds without errors
[ ] VITE_API_URL = production backend URL (not localhost)
[ ] Environment variables added in Vercel dashboard
[ ] vercel.json added for SPA routing:
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Backend (Render)
```
[ ] PORT = process.env.PORT (Render assigns its own)
[ ] All .env values in Render Environment dashboard
[ ] DB_HOST = cloud database URL (NOT localhost)
[ ] Start command: node src/server.js
[ ] Health endpoint: GET /health -> { status: 'ok' }
```

## Common Deployment Problems

| Problem | Cause | Fix |
| :--- | :--- | :--- |
| Frontend broken in production | API URL hardcoded as localhost | Use `import.meta.env.VITE_API_URL` |
| CORS works locally, fails in prod | CLIENT_URL still points to localhost | Set to Vercel URL in Render env vars |
| DB fails in production | DB_HOST = localhost | Use cloud DB host in production |
| React page refresh -> 404 | Vercel looks for /dashboard.html | Add vercel.json with SPA rewrites |
| Backend env vars undefined | .env not deployed | Add vars manually in Render dashboard |

---

# MODULE 16 — RESPONSIVE UI

## CSS Media Queries
```css
/* Mobile first — start with mobile styles */
.container { padding: 1rem; font-size: 14px; }

/* Tablet and up */
@media (min-width: 768px) {
  .container { padding: 2rem; }
  .sidebar { display: block; } /* Show sidebar on tablet */
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 1200px; margin: 0 auto; }
}
```

**Q: How to make a table responsive on mobile?**
> "Add `overflow-x: auto` to the table wrapper. The table scrolls horizontally on small screens. For a better experience, I might hide non-essential columns on mobile using CSS, or switch to a card-based layout per row."

---

# MODULE 17 — CODE QUALITY

## DRY — Don't Repeat Yourself
```javascript
// BAD — repeated in 5 components
const formatCurrency = (n) => `₹${n}`;

// GOOD — in utils/format.js, imported everywhere
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
```

## Single Responsibility
- `AuthContext` — manages authentication state only
- `api.js` — all HTTP calls only
- `employeeService.js` — all employee business logic only
- `EmployeeCard.jsx` — displays one employee only

## Clean Code Rules
1. Names describe what they do: `getUserByEmail` not `getUser`
2. Functions do ONE thing
3. No magic numbers: `const MAX_FILE_SIZE = 5 * 1024 * 1024` not `5242880`
4. Comments explain WHY, code explains WHAT

---

# MODULE 18 — PROJECT REVIEW

## 2-Minute Project Explanation

> "FinanceFlow AI is an enterprise financial management platform I built for my Week 7 assessment. It's a full-stack application with React on the frontend, Node.js/Express on the backend, and TiDB Cloud as the database.

> The core problem it solves is automating manual financial workflows for lending companies. Specifically: bank statement reconciliation, credit risk assessment, and borrower communications.

> I implemented 6 AI agents powered by Groq's LLM API. Agent 1 matches incoming bank deposits to loan repayment schedules using fuzzy matching and FIFO allocation. Agent 2 calculates credit risk scores and Probability of Default. Agent 3 generates multi-tier collection notices based on how overdue an account is. Agents 4, 5, and 6 handle document OCR, portfolio analytics, and escalation governance.

> The architecture uses a Controller-Service-Repository pattern. Authentication is JWT-based with role-based access control. Real-time features use Socket.IO. The platform is deployed on Vercel and Render."

---

# DEBUGGING ROUND — 30 REAL BUGS

## Bug #1 — CORS Error in Production

```
Problem:   "Access-Control-Allow-Origin header missing"
Symptoms:  Works in Postman/locally, fails in production browser
Causes:    CLIENT_URL still set to localhost in Render env vars
           Missing credentials: true in CORS config
           Trailing slash mismatch
Debug:     DevTools -> Network -> failing request -> Response headers
Fix:       cors({ origin: 'https://your-app.vercel.app', credentials: true })
Follow-up: Can Postman trigger CORS? No — CORS is browser-only
```

## Bug #2 — 401 on Every Request After Login

```
Problem:   Login works, but every subsequent request returns 401
Symptoms:  Token in localStorage, API calls fail
Causes:    Axios interceptor not set up, token key name mismatch
Debug:     DevTools -> Network -> any failing request -> Headers tab
           Is Authorization: Bearer <token> present?
Fix:       api.interceptors.request.use(config => {
             const token = localStorage.getItem('token');
             if (token) config.headers.Authorization = `Bearer ${token}`;
             return config;
           });
```

## Bug #3 — Infinite useEffect Loop

```
Problem:   Page keeps re-fetching, browser slows to a crawl
Symptoms:  API called hundreds of times per second
Cause:     useEffect(() => { setData(x); }, [data]);
           Setting data inside, depending on data -> triggers itself
Fix:       useEffect(() => { fetchData(); }, []); // empty array = once
```

## Bug #4 — MySQL ECONNREFUSED

```
Problem:   "Error: connect ECONNREFUSED 127.0.0.1:3306"
Causes:    MySQL not running locally
           DB_HOST = localhost in production .env (wrong!)
           Wrong credentials
Debug:     Local: Is MySQL service running?
           Production: Is DB_HOST the cloud URL?
Fix:       Start MySQL locally OR use correct cloud DB host in production
```

## Bug #5 — req.file is undefined

```
Problem:   "Cannot read property 'filename' of undefined"
Causes:    Frontend not using FormData (using JSON instead)
           Field name mismatch: append('image') vs upload.single('avatar')
           Multer middleware not on route
Debug:     Check frontend - using FormData.append('avatar', file)?
           Check route - upload.single('avatar') present?
Fix:       const formData = new FormData();
           formData.append('avatar', file); // must match upload.single('avatar')
```

## Bug #6 — JWT TokenExpiredError Crashes App

```
Problem:   User gets auto-logged-out after token expires
Cause:     Token expiry handled as unhandled error
Fix:       In authMiddleware, catch TokenExpiredError specifically:
           if (error.name === 'TokenExpiredError') return res.status(401)...
           In frontend interceptor, catch 401 and redirect to login
```

## Bug #7 — State Not Updating Immediately

```
Problem:   setState called but old value used on next line
Cause:     setState is asynchronous — updates on next render
Symptom:   setCount(count + 1); console.log(count); // shows old value
Fix:       Use useEffect to react to state changes
           Or use callback: setCount(prev => prev + 1);
```

## Bug #8 — Socket Events Not Received

```
Problem:   emit() fires on server, on() never triggers on client
Causes:    Event name mismatch ('new_message' vs 'newMessage')
           Client not joined to room
           Socket connection failed
Debug:     socket.on('connect', () => console.log('connected')) — fires?
           Are event names EXACTLY identical on both sides?
Fix:       Double-check event names; verify client joins room before listening
```

## Bug #9 — Vercel Page Refresh Returns 404

```
Problem:   /dashboard works by navigation, 404 on direct URL or refresh
Cause:     Vercel looks for /dashboard.html — doesn't exist (SPA)
Fix:       Create vercel.json:
           { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## Bug #10 — Environment Variable Undefined in Production

```
Problem:   process.env.JWT_SECRET is undefined
Causes:    .env file gitignored (correct), but not added to Render dashboard
           Typo: JWT_SECRET vs JWT_SECRETS
Debug:     console.log(Object.keys(process.env)) — is JWT_SECRET listed?
Fix:       Add ALL variables manually in Render -> Environment tab
```

## Bug #11 — SQL Duplicate Entry Error Returns 500

```
Problem:   Inserting duplicate email causes MySQL error -> unhandled -> 500
Fix:       In service, check existence before insert:
           const existing = await repo.findByEmail(email);
           if (existing) throw Object.assign(new Error('Email in use'), { status: 409 });
           Result: Clean 409 Conflict instead of raw 500
```

## Bug #12 — Slow API (5+ seconds)

```
Problem:   GET /employees takes 5 seconds
Causes:    No INDEX on searched column
           No LIMIT clause — fetching 100,000 rows
           N+1 queries (1 query per employee)
Fix:       CREATE INDEX idx_email ON employees(email);
           Add LIMIT + OFFSET for pagination
           Use JOIN instead of multiple queries
```

## Bug #13 — bcrypt Password Always Invalid

```
Problem:   Login fails even with correct password
Causes:    Storing plain password instead of hash
           Re-hashing on login before compare
Debug:     Check registration: is bcrypt.hash() called before insert?
Fix:       Registration: const hash = await bcrypt.hash(plain, 10); store hash
           Login: await bcrypt.compare(plain, storedHash); — never hash again
```

## Bug #14 — Session Lost on Page Refresh

```
Problem:   User logs in, refreshes -> logged out
Cause:     User state in useState is in-memory, cleared on refresh
Fix:       Initialize from localStorage:
           const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
           On login: localStorage.setItem('user', JSON.stringify(userData));
```

## Bug #15 — Frontend White Screen After Deployment

```
Problem:   Blank white screen after Vercel deploy
Debug:
  1. DevTools Console — any JS errors?
  2. Common: "Cannot read property of undefined" — API returning different shape
  3. Common: File path capitalization (Windows OK, Linux fails)
  4. Common: Build error not caught — run npm run build locally first!
Fix:       Always run npm run build before deploying and fix all errors first
```

---
*(Bugs #16-#30 in Mock Assessment Answer Key)*
---

# LIVE CODING TASKS

## Task 1 🟢 — Create Employee CRUD API
```javascript
// backend/src/routes/employee.routes.js
import express from 'express';
import * as ctrl from '../controllers/employee.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get('/', authMiddleware, ctrl.getAll);
router.get('/:id', authMiddleware, ctrl.getById);
router.post('/', authMiddleware, ctrl.create);
router.put('/:id', authMiddleware, ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);
export default router;
```

## Task 2 🟢 — Login API
*(See Module 5 — login controller code above)*

## Task 3 🟡 — JWT Auth Middleware
*(See Module 5 — authMiddleware code above)*

## Task 4 🟡 — Protected React Route
*(See Module 5 — ProtectedRoute code above)*

## Task 5 🟡 — Role-Based Middleware
*(See Module 5 — requireRole code above)*

## Task 6 🟡 — File Upload API
*(See Module 8 — Multer setup code above)*

## Task 7 🟡 — Pagination API
*(See Module 7 — pagination code above)*

## Task 8 🔴 — Global Error Middleware
*(See Module 9 — errorHandler code above)*

## Task 9 🟡 — Axios Service with Interceptors
*(See Module 3 — api.js code above)*

## Task 10 🟡 — Auth Context
*(See Module 4 — AuthContext code above)*

## Task 11 🔴 — Socket.IO Chat
*(See Module 14 — Socket.IO code above)*

## Task 12 🟡 — Input Validation Middleware
```javascript
import { body, validationResult } from 'express-validator';

export const validateEmployee = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('salary').optional().isNumeric().withMessage('Salary must be a number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
  }
];
```

## Task 13 🟡 — Search + Filter + Pagination API
*(See Module 6 — findAll with search code above)*

## Task 14 🔴 — Database Transaction
*(See Module 7 — transaction code above)*

## Task 15 🟡 — Swagger Documentation
*(See Module 11 — swagger annotation code above)*

---

# WHY? QUESTION BANK

| # | Question | Strong Answer |
| :--- | :--- | :--- |
| 1 | Why React? | "Component model and virtual DOM make interactive UIs fast. Huge ecosystem, great DX, widely used in production." |
| 2 | Why Express? | "Minimal and flexible. Doesn't force structure. Most widely used Node.js framework with vast middleware ecosystem." |
| 3 | Why REST? | "Stateless, widely understood, works naturally with HTTP. Every developer knows how to consume a REST API." |
| 4 | Why Axios? | "Supports interceptors — I auto-attach tokens and handle 401 globally. Fetch requires manual implementation." |
| 5 | Why middleware? | "Common logic (auth, logging, validation) runs once for all routes instead of being duplicated in every controller." |
| 6 | Why JWT? | "Stateless — server doesn't query database per request. Token contains user ID and role. Scales well." |
| 7 | Why bcrypt? | "One-way hash designed for passwords. Intentionally slow — prevents brute-force. Adds random salt." |
| 8 | Why protected routes? | "Frontend gives instant UX feedback. Backend provides real security. Both layers needed." |
| 9 | Why environment variables? | "Same code runs in dev (local DB) and prod (cloud DB). Keeps secrets out of code and Git." |
| 10 | Why connection pooling? | "New DB connection per request is slow (50-200ms). Pool reuses connections — dramatically faster." |
| 11 | Why parameterized SQL? | "Prevents SQL injection. User input treated as data, never as executable SQL." |
| 12 | Why service layer? | "Business logic reusable by multiple controllers. Testable without HTTP context." |
| 13 | Why repository layer? | "Isolates DB queries. Switch from MySQL to PostgreSQL by changing only repositories." |
| 14 | Why validation on backend? | "Frontend validation can be bypassed with Postman. Backend validation is the real gate." |
| 15 | Why global error handling? | "Centralizes error response format. Prevents unhandled rejections from crashing the server." |
| 16 | Why Swagger? | "API docs that auto-generate from code stay accurate. Manual docs become stale instantly." |
| 17 | Why WebSocket? | "Polling wastes bandwidth checking for updates. WebSocket server pushes instantly on event." |
| 18 | Why cloud storage? | "Local files lost when server restarts. Cloud is persistent, CDN-distributed, scalable." |
| 19 | Why HTTPS? | "HTTP sends data in plain text. HTTPS encrypts — prevents token/password interception." |
| 20 | Why CORS? | "Protects users from malicious sites silently calling your API using their saved credentials." |
| 21 | Why testing? | "Manual testing misses edge cases. Tests catch regressions when new features break old ones." |
| 22 | Why separate frontend/backend? | "Independent deployment, scaling, tech choices, and teams. Frontend can be rebuilt without touching backend." |
| 23 | Why Git? | "Version control, collaboration without overwriting, ability to revert mistakes, complete history." |
| 24 | Why reusable components? | "Style change in one file propagates everywhere. Enforces visual consistency." |
| 25 | Why .env.example? | "Shows teammates what variables are needed without exposing real secrets." |

---

# RAPID-FIRE ROUND

| Question | Answer |
| :--- | :--- |
| What is REST? | API design using HTTP verbs (GET/POST/PUT/DELETE) for resources |
| What is middleware? | Code between request arriving and controller executing |
| What is JWT? | Signed token with user data for stateless authentication |
| What is CORS? | Browser security blocking cross-origin API requests |
| What is CRUD? | Create, Read, Update, Delete — four basic data operations |
| What is MVC? | Model-View-Controller — separates data, display, and logic |
| What is an API? | Rules for two software systems to communicate |
| HTTP 200? | OK — request succeeded |
| HTTP 201? | Created — resource created successfully |
| HTTP 204? | No Content — success but no body (DELETE) |
| HTTP 400? | Bad Request — invalid or missing input |
| HTTP 401? | Unauthorized — no token or invalid token |
| HTTP 403? | Forbidden — valid token but no permission |
| HTTP 404? | Not Found — resource doesn't exist |
| HTTP 409? | Conflict — duplicate resource |
| HTTP 422? | Unprocessable Entity — validation failed |
| HTTP 500? | Internal Server Error — server crashed |
| What is bcrypt? | Password hashing library — slow, one-way, adds salt |
| What is a salt? | Random data added to password before hashing |
| What is WebSocket? | Persistent bidirectional communication protocol |
| What is Socket.IO? | Library simplifying WebSocket with rooms and fallbacks |
| What is FormData? | Browser object formatting data for multipart/form-data uploads |
| What is Multer? | Express middleware for file upload handling |
| What is Swagger? | Tool generating interactive REST API documentation |
| What is OpenAPI? | Specification standard Swagger implements |
| What is connection pooling? | Reusing DB connections instead of creating new per request |
| What is SQL injection? | Inserting malicious SQL through user input |
| What is RBAC? | Role-Based Access Control — permissions by role |
| What is an env variable? | Config values outside code — like DB passwords and API keys |
| What is CI/CD? | Continuous Integration / Deployment — automated build-test-deploy |
| What is staging? | Production-like environment for testing before going live |
| What is a transaction? | Multiple DB ops that all succeed or all rollback |
| What is normalization? | Organizing DB tables to eliminate data redundancy |
| What is an INDEX? | DB structure speeding up query lookups on a column |
| What is a primary key? | Unique identifier for each row in a table |
| What is a foreign key? | Column linking one table to another table's primary key |
| What is INNER JOIN? | Returns rows matching in BOTH tables |
| What is LEFT JOIN? | Returns ALL rows from left table, matching or not |
| What is pagination? | Splitting data into pages (10 records per page) |
| What is ProtectedRoute? | React component redirecting unauthenticated users to login |
| What is Context API? | React's built-in global state management |
| What is useEffect? | React hook for side effects (API calls, subscriptions) |
| What is useState? | React hook declaring local component state |
| What is virtual DOM? | React's in-memory DOM representation for efficient updates |
| What is a hook? | React function giving functional components state and lifecycle |
| What is Vite? | Fast modern frontend build tool and dev server |
| What does cors() do? | Adds CORS headers to Express responses |
| What is Supertest? | Library for testing HTTP without starting the server |
| What is io.emit()? | Send event to ALL connected socket clients |
| What is io.to(room).emit()? | Send event to all clients in a specific room |
| What does next() do? | Passes control to next middleware or error handler |
| What is .env.example? | Template showing required env variable names without values |
| What is VITE_? | Prefix required for Vite to expose env vars to React |
| What is import.meta.env? | How you read env variables in a Vite/React project |
| What does npm run build do? | Compiles React code into optimized static files for production |
| What is vercel.json? | Vercel config file — sets up SPA routing rewrites |
| What is Render? | Cloud hosting platform for Node.js backends |
| What is a health endpoint? | GET /health returning server status for monitoring |
| What is jwt.sign()? | Creates a JWT with payload and secret |
| What is jwt.verify()? | Decodes and validates a JWT |
| What is TokenExpiredError? | JWT error when token's expiry time has passed |
| What is localStorage? | Browser storage persisting across page refreshes |
| What is bcrypt.hash()? | Creates hashed version of a password |
| What is bcrypt.compare()? | Checks plain password against stored hash |
| What is affectedRows? | MySQL count of rows changed by UPDATE/DELETE |
| What is insertId? | MySQL auto-generated ID of newly inserted row |
| What is axios.create()? | Creates Axios instance with pre-configured settings |
| What is an interceptor? | Function that modifies all requests or responses globally |
| What does res.status(201).json() do? | Sends HTTP 201 response with JSON body |
| What is props drilling? | Passing props through many nested layers unnecessarily |
| What is DRY? | Don't Repeat Yourself — write logic once, reuse everywhere |

---

# SCENARIO-BASED ASSESSMENT

## Scenario 1: Upload Succeeds, Database Fails
> User uploads profile image. File saved, DB update fails.

1. **What happens?** File exists in storage but DB has no record. Old image still shows.
2. **How to handle?** In catch block: `if (req.file) fs.unlinkSync(req.file.path);` then throw DB error.
3. **What does user see?** "Profile update failed. Please try again."
4. **What to log?** File name, user ID, DB error message, timestamp.

## Scenario 2: Login Works Locally, Fails in Production
> POST /auth/login returns 500 in production.

Check in order:
1. Backend logs on Render — what exact error?
2. Is DB_HOST still `localhost`? → Update to cloud DB host.
3. Are all env variables in Render dashboard?
4. Is JWT_SECRET defined? If not, jwt.sign() throws immediately.

## Scenario 3: Admin Page Accessible by Regular User
> Regular user types `/admin` in URL bar.

**Frontend**: ProtectedRoute checks role, redirects.
**Backend**: requireRole('admin') returns 403.
**Key point**: "Frontend protection is UX. Backend protection is real security. I have both."

## Scenario 4: WebSocket Messages Delayed by 5 Seconds
1. Check if `socket.emit()` fires immediately after click.
2. Is the server handler awaiting a slow DB query before broadcasting?
3. Move `io.to(roomId).emit()` before the DB save for optimistic delivery.
4. Check if WebSocket is connected or falling back to polling.

## Scenario 5: React Page Refresh Returns 404
**Cause**: Vercel looks for `/dashboard.html` — doesn't exist.
**Fix**: Add `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`

## Scenario 6: User Session Lost on Refresh
**Cause**: React state is in-memory. Refresh clears it.
**Fix**: Initialize state from localStorage; save user to localStorage on login.

## Scenario 7: API Returns 500 for One Specific Record
1. Check backend logs — specific error for that ID?
2. Is the repository trying to access `.property` on null (not found)?
3. Fix: Check if findById returns null, throw 404 before controller crashes.

## Scenario 8: JWT Works But Role is Wrong
1. Decode token at jwt.io — what does the role field say?
2. Was token created before role was updated?
3. Fix: User must logout and login again for a fresh token with updated role.

## Scenario 9: API Suddenly 10x Slower
1. Was a new feature added that runs extra queries per row? (N+1 problem)
2. Was a search feature added without an INDEX?
3. Check with `EXPLAIN SELECT ...` in MySQL to see query plan.
4. Add INDEX or use JOIN instead of N queries.

## Scenario 10: Frontend Shows Wrong Data After Update
1. After PUT /employees/:id, does the list refresh?
2. Is the list using stale cached data?
3. Fix: After successful update, either refetch the full list or update local state:
   `setEmployees(prev => prev.map(e => e.id === id ? updatedEmployee : e));`

---

# ARCHITECTURE DESIGN QUESTIONS

## Design: Real-Time Chat Application

```
Database:
  users(id, name, email, password_hash, is_online)
  rooms(id, name, created_by, created_at)
  room_members(room_id, user_id, joined_at)
  messages(id, room_id, user_id, content, created_at)

REST APIs:
  POST /auth/login
  GET /rooms
  POST /rooms
  POST /rooms/:id/join
  GET /rooms/:id/messages?page=1 (load history)

Socket Events:
  Client -> Server: join_room, send_message, typing, leave_room
  Server -> Client: new_message, user_joined, user_left, typing_indicator

Authentication:
  JWT in socket.handshake.auth.token
  Verified in io.use() middleware

Scaling Consideration:
  Multiple servers need Redis adapter for Socket.IO
  Redis pub/sub syncs events across instances
```

## Design: Employee Management System

```
Database:
  departments(id, name, manager_id)
  employees(id, name, email, dept_id, role, salary, hire_date)
  audit_logs(id, entity, entity_id, action, changed_by, old_value, new_value, changed_at)

APIs:
  Auth: POST /auth/login, POST /auth/register
  Employees: Full CRUD + search + filter + pagination
  Departments: Full CRUD
  Reports: GET /reports/headcount, /reports/salary-distribution

Security:
  JWT on all routes
  admin: full access
  manager: no delete, can view salary
  employee: read-only, own data only

Deployment:
  Frontend: Vercel
  Backend: Render
  Database: Cloud MySQL
```

---

# PROJECT PRESENTATION PREPARATION

## 30-Second Introduction
> "I built FinanceFlow AI — an enterprise financial platform that automates manual lending workflows. It uses React, Node.js, and MySQL with 6 AI agents powered by Groq's LLM. The platform handles bank reconciliation, credit risk, and borrower notifications."

## 1-Minute Introduction
> "FinanceFlow AI is a full-stack enterprise platform I built for Week 7. Lending companies manually reconcile hundreds of bank deposits daily — matching payments to loan installments. This takes hours.

> My platform automates this with 6 AI agents. Agent 1 matches deposits to schedules using fuzzy matching. Agent 2 assesses credit risk. Agent 3 generates collection notices. The other agents handle documents, portfolio analytics, and escalation governance.

> It's built with React, Express, TiDB Cloud, and Groq's LLM API. JWT authentication, role-based access, Socket.IO for real-time updates, deployed on Vercel and Render."

## 5-Minute Architecture Explanation

1. "The frontend is React with Vite, organized by components, pages, services, hooks, and context."
2. "API calls go through a central service file that auto-attaches JWT tokens via Axios interceptors."
3. "The backend follows Controller-Service-Repository pattern. Controllers handle HTTP. Services have business logic. Repositories have SQL queries."
4. "Authentication is JWT-based. Login returns a token stored in localStorage. Auth middleware verifies on every protected route. Role middleware restricts admin operations."
5. "The AI agents use Groq's API with function calling. Each agent has registered tools like findBorrowingCompanyByAccount or getRepaymentHistory."
6. "Database is TiDB Cloud with connection pooling. SSL required. Parameterized queries everywhere to prevent SQL injection."
7. "Error handling: global error middleware on backend, try-catch with loading/error states on frontend."
8. "Deployment: Vercel serves the React SPA with a vercel.json rewrite rule. Render hosts the Express backend. All secrets in platform environment variable dashboards."

## Questions to Prepare Answers For

| Mentor Question | Your Answer |
| :--- | :--- |
| What problem does your app solve? | Automates manual bank reconciliation and credit monitoring for lending companies |
| Why this tech stack? | React for interactive UI, Express for flexible API, MySQL for relational financial data |
| What was the hardest feature? | Agent reconciliation with bidirectional ledger rollback maintaining data consistency |
| What bug took the most time? | CORS in production — CLIENT_URL mismatch between localhost and Vercel domain |
| What would you improve? | Add refresh tokens, WebSocket for real-time reconciliation status, mobile app |
| How secure is it? | JWT auth, bcrypt hashing, RBAC, parameterized SQL, HTTPS, no secrets in frontend |
| How would you scale it? | Horizontal backend scaling + Redis for Socket.IO, read replicas for DB, CDN for assets |
| What did you personally implement? | All 6 AI agents, authentication flow, reconciliation engine, real-time alerts |

---

# CHEAT SHEETS

## 1. Full Stack Architecture Cheat Sheet

```
LAYER          LOCATION                    RESPONSIBILITY
Browser        User's device               Render HTML/CSS/JS
React          frontend/src/pages/         User Interface
API Service    frontend/src/services/      HTTP calls to backend
Express Routes backend/src/routes/         URL => Controller mapping
Middleware     backend/src/middleware/      Auth, validation, logging
Controller     backend/src/controllers/    HTTP in, response out
Service        backend/src/services/       Business logic
Repository     backend/src/repositories/   SQL queries
MySQL          Cloud / Local               Data storage
```

## 2. HTTP Status Code Cheat Sheet

```
2xx Success:
  200 OK          -> GET/PUT/PATCH success
  201 Created     -> POST success (new resource)
  204 No Content  -> DELETE success (no body)

4xx Client Errors:
  400 Bad Request      -> Invalid/missing input
  401 Unauthorized     -> No/invalid token
  403 Forbidden        -> Valid token, no permission
  404 Not Found        -> Resource missing
  409 Conflict         -> Duplicate record
  422 Unprocessable    -> Validation failed

5xx Server Errors:
  500 Internal Error -> Server/DB crash
```

## 3. JWT Authentication Cheat Sheet

```
1. POST /login with email + password
2. Backend: bcrypt.compare(plain, hash)
3. Backend: jwt.sign({id, role}, JWT_SECRET, {expiresIn:'1d'})
4. Frontend: localStorage.setItem('token', token)
5. Every request: Authorization: Bearer <token>
6. Backend middleware: jwt.verify(token, JWT_SECRET)
7. req.user = decoded payload {id, role, email}
8. Token expires -> 401 -> redirect to login
```

## 4. SQL Cheat Sheet

```sql
SELECT * FROM employees;
SELECT name FROM employees WHERE department = 'IT';
SELECT * FROM employees ORDER BY salary DESC LIMIT 10 OFFSET 20;
INSERT INTO employees (name, email) VALUES (?, ?);
UPDATE employees SET salary = ? WHERE id = ?;
DELETE FROM employees WHERE id = ?;
SELECT e.name, d.name FROM employees e LEFT JOIN departments d ON e.dept_id = d.id;
SELECT COUNT(*) as total FROM employees;
SELECT department, AVG(salary) FROM employees GROUP BY department;
```

## 5. React State Cheat Sheet

```javascript
// Local state
const [value, setValue] = useState(initialValue);

// Side effect — fetch on mount
useEffect(() => { fetchData(); }, []);

// Side effect — rerun when id changes
useEffect(() => { fetchById(id); }, [id]);

// Context
const MyCtx = createContext();
const value = useContext(MyCtx);

// Custom hook
export const useAuth = () => useContext(AuthContext);
```

## 6. Error Handling Cheat Sheet

```
Backend:
  controller -> try { service() } catch(err) { next(err) }
  Global middleware: (err, req, res, next) -> res.status(code).json(...)
  Custom error: throw Object.assign(new Error('msg'), { status: 404 })

Frontend:
  try { await apiCall() }
  catch (err) { setError(err.response?.data?.message || err.message) }
  finally { setLoading(false) }
```

## 7. Deployment Cheat Sheet

```
Frontend (Vercel):
  npm run build -> no errors
  VITE_API_URL = production backend URL
  vercel.json: { rewrites: [{ source:"/(.*)", destination:"/index.html" }] }
  Add env vars in Vercel dashboard

Backend (Render):
  PORT = process.env.PORT (Render assigns)
  DB_HOST = cloud DB URL (NOT localhost)
  CLIENT_URL = Vercel production URL
  Add all .env values in Render environment tab
  GET /health returns { status: 'ok' }
```

## 8. Debugging Checklist

```
[ ] Browser Console: any JavaScript errors?
[ ] Browser Network tab: check failing request
    -> Headers: is Authorization: Bearer token attached?
    -> Response: what does server return?
[ ] Backend terminal: error stack trace?
[ ] .env: all variables defined?
[ ] CORS: does origin match exactly (no trailing slash)?
[ ] Database: is MySQL running? Is cloud DB accessible?
[ ] JWT: decode at jwt.io — expired? role field exists?
[ ] Postman: test API without browser CORS restrictions
[ ] npm run build: builds without errors?
[ ] Production env vars: all added in Render/Vercel dashboard?
```

---

*Document Version: 1.0*
*For: Week 7 Full Stack Technical Assessment*
*Focus: Understand → Explain → Code → Debug → Design → Defend*
