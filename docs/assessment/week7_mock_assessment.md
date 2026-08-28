# Week 7 — Full Stack Mock Technical Assessment
## Question Paper + Answer Key

> **Instructions**: Complete the Question Paper section first WITHOUT looking at the Answer Key. Grade yourself honestly. Each section has a time guide.

---

# PART A: QUESTION PAPER

---

## ROUND 1 — BASIC TECHNICAL UNDERSTANDING
### 🟢 20 Questions | Time: 20 minutes

**Q1.** What are the three main layers of a full-stack web application? Explain the role of each.

**Q2.** What does REST stand for and what are the 4 main HTTP methods used in a REST API?

**Q3.** What is the difference between authentication and authorization? Give a real example of each.

**Q4.** What is a JWT? What are its three parts?

**Q5.** Why should passwords never be stored as plain text? What do we use instead?

**Q6.** What does the following HTTP status code mean? Explain WHEN you would use it.
- 201, 401, 403, 404, 500

**Q7.** What is CORS and why does the browser enforce it?

**Q8.** What is the difference between `localStorage` and `sessionStorage`?

**Q9.** What is the purpose of `useEffect` in React? What does the empty dependency array `[]` mean?

**Q10.** What is Context API in React? When would you use it instead of props?

**Q11.** What is the difference between `PUT` and `PATCH` HTTP methods?

**Q12.** What is SQL injection? How do parameterized queries prevent it?

**Q13.** What is a database connection pool? Why is it better than creating a new connection per request?

**Q14.** What is the difference between `INNER JOIN` and `LEFT JOIN` in SQL?

**Q15.** What is `multipart/form-data`? Why is it needed for file uploads?

**Q16.** What is middleware in Express.js? What does calling `next()` do?

**Q17.** What is the difference between the Controller, Service, and Repository layers in a backend application?

**Q18.** What is a WebSocket? How is it different from a regular HTTP request?

**Q19.** What is the purpose of `.env.example` file?

**Q20.** What is HTTPS and why is it important for production applications?

---

## ROUND 2 — INTERMEDIATE TECHNICAL
### 🟡 20 Questions | Time: 30 minutes

**Q1.** Explain the complete request-response lifecycle from a user clicking a button in React to seeing the response on screen. Include every layer.

**Q2.** You have a login form in React. A user submits invalid credentials. Walk through exactly what happens on both the frontend AND backend.

**Q3.** Explain JWT authentication flow. Where is the token generated, stored, sent, and verified?

**Q4.** What is the difference between `401 Unauthorized` and `403 Forbidden`? When does each occur?

**Q5.** Explain bcrypt salt rounds. What is the tradeoff between higher salt rounds and lower salt rounds?

**Q6.** What is props drilling? How does Context API solve it?

**Q7.** How do you implement role-based access control on both the frontend and backend?

**Q8.** What is the N+1 query problem in databases? How do you solve it?

**Q9.** Explain how Socket.IO rooms work. How would you implement a private chat between two users?

**Q10.** What is a database transaction? Describe a real scenario where you MUST use one.

**Q11.** What happens when an `async` function throws an error inside an Express controller? How do you handle it?

**Q12.** How does Axios interceptor work? What two interceptors are most important for an authenticated application?

**Q13.** A React component re-renders infinitely. What are the possible causes? How do you debug it?

**Q14.** Explain the FIFO (First In, First Out) allocation concept. How would you implement it in SQL?

**Q15.** What is pagination? Write the SQL query for page 3 with 10 items per page.

**Q16.** What happens if you store a secret API key in your React frontend code? Why is this dangerous?

**Q17.** How does file MIME type validation work? Why can't you rely only on file extension?

**Q18.** What is Swagger/OpenAPI? Why is it better than manually written API documentation?

**Q19.** What changes between your development `.env` and production `.env`? List at least 5 differences.

**Q20.** Explain CORS in detail. Who enforces it? How do you configure it correctly? What happens if `origin: '*'` is used in production?

---

## ROUND 3 — LIVE CODING
### 🔴 10 Tasks | Time: 45 minutes

**Task 1** 🟢: Write an Express route handler that:
- Accepts a `POST` request to `/api/auth/login`
- Expects `{ email, password }` in the request body
- Returns `401` if either field is missing
- Returns `200` with `{ message: "OK" }` if both are present (simplify — no DB for now)

**Task 2** 🟡: Write the `authMiddleware` function that:
- Reads `Authorization` header
- Splits to get the Bearer token
- Returns `401` if no token
- Verifies token using `jwt.verify()`
- Attaches decoded user to `req.user`
- Calls `next()`
- Handles `TokenExpiredError` with specific message

**Task 3** 🟡: Write a React `AuthContext` that:
- Stores `user` and `token` in state
- Initializes `token` from `localStorage` on load
- Has `login(userData, token)` and `logout()` functions
- Persists token to localStorage on login
- Clears localStorage on logout
- Provides values via `AuthContext.Provider`

**Task 4** 🟡: Write a `ProtectedRoute` React component that:
- Accepts `children` and optional `requiredRole` prop
- Redirects to `/login` if no token in AuthContext
- Redirects to `/unauthorized` if role doesn't match
- Otherwise renders children

**Task 5** 🟡: Write a SQL query to:
- Fetch all employees
- Where department is 'Engineering'
- Order by salary descending
- Paginate: page 2, 10 results per page

**Task 6** 🟡: Write an Axios API service that:
- Creates an Axios instance with `baseURL` from `import.meta.env.VITE_API_URL`
- Has a request interceptor attaching JWT from `localStorage`
- Has a response interceptor redirecting to `/login` on 401
- Exports `getEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee`

**Task 7** 🔴: Write a global Express error middleware that:
- Logs the error
- Sends standardized JSON: `{ success: false, message, statusCode }`
- Uses `err.status || err.statusCode || 500` as the status code
- Only includes stack trace in development

**Task 8** 🟡: Write a `requireRole` middleware factory that:
- Accepts one or more roles as arguments: `requireRole('admin', 'manager')`
- Returns a middleware function
- Returns 403 if `req.user.role` is not in the allowed roles
- Calls `next()` if allowed

**Task 9** 🔴: Write a Socket.IO server that:
- Creates server with Express app
- Adds CORS for `process.env.CLIENT_URL`
- Adds authentication middleware verifying JWT from `socket.handshake.auth.token`
- Handles `join_room`, `send_message` events
- Broadcasts `new_message` to all room members
- Handles `disconnect`

**Task 10** 🔴: Write a Multer configuration that:
- Stores files in `uploads/` directory
- Generates unique filenames with timestamp
- Allows only JPEG, PNG, WEBP files (validates MIME type)
- Limits file size to 5MB
- Exports the `upload` middleware

---

## ROUND 4 — DEBUGGING
### 🔴 10 Scenarios | Time: 30 minutes

For each scenario: identify the problem, list possible causes, and describe how to fix it.

**Bug #1**: Your React app works perfectly in development but after deploying to Vercel, every API call fails. The browser console shows `net::ERR_CONNECTION_REFUSED`. Your backend is deployed on Render.

**Bug #2**: After login, the user is redirected to the dashboard correctly, but when they refresh the page, they are immediately sent back to the login page even though the token is in localStorage.

**Bug #3**: `GET /api/employees` works fine and returns all employees. But `GET /api/employees/5` returns `500 Internal Server Error`. The employee with ID 5 was deleted from the database.

**Bug #4**: You added a file upload feature. When testing with Postman it works. But when testing from the React frontend, `req.file` is always `undefined` on the backend.

**Bug #5**: Your Socket.IO chat works locally but in production, messages are not being received by other users. The socket connection itself appears to be established. Both users are in the same room.

**Bug #6**: A user reports that every day they have to log in again. They say their session expires "randomly". Your JWT is set to expire in `'1d'`.

**Bug #7**: You added a new search feature: `GET /employees?search=john`. When you search, it works. But if the search query contains a special SQL character like `%` it crashes with a 500 error.

**Bug #8**: Your Create Employee API works correctly. But when you create the second employee with the same email, instead of getting a `409 Conflict` response, the frontend shows a generic `500 Internal Server Error`.

**Bug #9**: You deploy the backend on Render. The build succeeds. But the backend immediately crashes on startup with error: `Error: connect ECONNREFUSED 127.0.0.1:3306`.

**Bug #10**: After deploying to Vercel, navigating to `/dashboard` works fine through React Router. But when a user copies the link and opens it directly in a new tab, they get a `404` error from Vercel.

---

## ROUND 5 — ARCHITECTURE & DESIGN
### 🔴 10 Questions | Time: 20 minutes

**Q1.** Draw and explain the complete layered architecture of a full-stack application from browser to database and back.

**Q2.** Design the database schema for a simple employee management system with departments. Include table names, columns, and relationships.

**Q3.** Why should business logic live in the Service layer and not the Controller? What is the benefit for testing?

**Q4.** You need to implement a feature where the same employee creation logic is used by both a public registration endpoint AND an internal admin endpoint. How would you structure this?

**Q5.** Design the architecture for a real-time notification system. When a payment is approved, all admins online should instantly see a notification.

**Q6.** What is the principle of "Separation of Concerns"? Give 3 concrete examples from a full-stack application.

**Q7.** How would you design the authentication flow for a system with two user roles: `admin` and `employee`? Consider both frontend and backend.

**Q8.** A junior developer puts all the code — routes, business logic, SQL queries — in a single `server.js` file. What are the specific problems this causes as the application grows?

**Q9.** You are building an API that hundreds of clients will consume. What would you include in the error response format to make it developer-friendly?

**Q10.** How does proper project structure organization make your application more maintainable and scalable? Give specific examples.

---

## ROUND 6 — PROJECT REVIEW
### 🔴 20 Questions | Time: 40 minutes

Answer as if you are presenting YOUR project to the mentor. Be specific.

**Q1.** Give me a 2-minute overview of your application. What problem does it solve?

**Q2.** Explain your backend architecture. What pattern did you use and why?

**Q3.** How does authentication work in your application? Walk me through from login to accessing a protected page.

**Q4.** How does your frontend communicate with your backend? Show me the API service layer.

**Q5.** How did you structure your database? Show me the main tables and their relationships.

**Q6.** How do you handle errors in your application? Both on frontend and backend.

**Q7.** How do you protect your API endpoints? What happens if someone calls a protected endpoint without a token?

**Q8.** How do you handle file uploads in your application?

**Q9.** How does real-time functionality work in your application?

**Q10.** What environment variables does your application use? How are they different in development vs production?

**Q11.** How is your application deployed? Where is the frontend? Backend? Database?

**Q12.** What would break in your application if someone removed the JWT_SECRET from the production environment?

**Q13.** How do you prevent SQL injection in your application?

**Q14.** If I tried to access an admin page as a regular user, what would happen at each layer?

**Q15.** What is the hardest technical challenge you solved in this project?

**Q16.** What would you improve if you had one more week?

**Q17.** How would you add a new feature — say, a "department" filter on the employee list? Walk me through every file you'd touch.

**Q18.** If your application got 10x more users tomorrow, what would break first? How would you scale?

**Q19.** How did you test your application? What types of tests did you write?

**Q20.** If a production database query is running slowly, what steps would you take to diagnose and fix it?

---

## ROUND 7 — RAPID FIRE
### 🟢 30 Questions | Time: 10 minutes (10-15 seconds per answer)

1. What does REST stand for?
2. What HTTP method creates a resource?
3. What status code means "Unauthorized"?
4. What status code means "Forbidden"?
5. What is bcrypt used for?
6. What is JWT used for?
7. What is CORS?
8. What does `next()` do in Express?
9. What folder holds SQL queries in a layered backend?
10. What folder holds business logic?
11. What React hook manages local state?
12. What React hook runs side effects?
13. What prefix do Vite env variables need?
14. How do you read a Vite env variable in React?
15. What file should NEVER be committed to Git?
16. What HTTP status means a resource was successfully created?
17. What is FormData used for?
18. What npm package handles file uploads in Express?
19. What is Swagger used for?
20. What is a connection pool?
21. What is WebSocket?
22. What is Socket.IO?
23. What npm package is used for JWT in Node.js?
24. What HTTP status does a successful DELETE return?
25. What is SQL injection?
26. What is pagination?
27. What is a database transaction?
28. What is the Vercel equivalent of "all URLs serve index.html"?
29. What does `io.to(roomId).emit()` do?
30. What is the purpose of `process.env.PORT` on Render?

---
---
---

# PART B: ANSWER KEY

> **Grade yourself**: Mark each answer as Correct / Partial / Incorrect. Then study the ones you missed.

---

## ROUND 1 — BASIC TECHNICAL — ANSWERS

**A1.**
- **Frontend**: What the user sees and interacts with. React, HTML, CSS.
- **Backend**: Processes business logic, handles API requests. Node.js + Express.
- **Database**: Stores and retrieves data persistently. MySQL, MongoDB.

**A2.**
- REST = Representational State Transfer.
- GET (read), POST (create), PUT/PATCH (update), DELETE (remove).

**A3.**
- **Authentication**: Verifying WHO you are. Login with email/password → JWT issued.
- **Authorization**: What you're ALLOWED to do. Admin can delete, employee can only view.

**A4.**
- JWT = JSON Web Token. A signed, self-contained token with user data.
- Three parts: `header.payload.signature`
  - Header: algorithm used (HS256)
  - Payload: user data (id, role, expiry)
  - Signature: cryptographic verification

**A5.**
- Plain text passwords: if DB is hacked, all passwords exposed immediately.
- Use bcrypt: one-way hashing. Adds random salt. Cannot be reversed. Intentionally slow.

**A6.**
- 201: Created — when a POST request successfully creates a new resource.
- 401: Unauthorized — no token provided or token invalid.
- 403: Forbidden — token valid, but user lacks permission.
- 404: Not Found — requested resource doesn't exist.
- 500: Internal Server Error — server code crashed or DB failed.

**A7.**
- CORS = Cross-Origin Resource Sharing. A browser security rule.
- When your React app at `localhost:5173` calls backend at `localhost:5000`, different origins (ports count).
- Browser enforces it to prevent malicious websites from making API calls using user's saved credentials.

**A8.**
- `localStorage`: Persists across browser sessions and page refreshes. Cleared only when explicitly removed.
- `sessionStorage`: Cleared when the browser tab/window is closed.

**A9.**
- `useEffect` runs side effects in functional components (API calls, subscriptions, timers).
- Empty array `[]`: effect runs ONCE when component mounts, never again.
- `[id]`: runs whenever `id` changes.

**A10.**
- Context API provides global state accessible by any component without props drilling.
- Use when multiple unrelated components need the same data (e.g. user auth state in Header, Sidebar, Dashboard).

**A11.**
- `PUT`: Replaces the ENTIRE resource. Sending partial data clears missing fields.
- `PATCH`: Updates only the SPECIFIC fields you send. Other fields unchanged.

**A12.**
- SQL injection: Attacker inserts malicious SQL into user input: `1; DROP TABLE users;`.
- Parameterized queries: `WHERE id = ?` with params — user input treated as literal data, never executed as SQL.

**A13.**
- Creating a new DB connection per request takes 50-200ms and can overwhelm the DB server.
- Connection pool maintains a set of reusable connections. Requests borrow one and return it. Much faster.

**A14.**
- `INNER JOIN`: Returns only rows with matching records in BOTH tables.
- `LEFT JOIN`: Returns ALL rows from the left table, with NULLs where right table has no match.

**A15.**
- `multipart/form-data` allows a request body with mixed types — text fields AND binary file data together.
- Regular JSON is text-only. Files are binary (raw bytes). JSON cannot represent binary.

**A16.**
- Middleware: Functions that run between request arriving and controller executing.
- `next()`: Passes control to the next middleware/controller in the chain.
- Not calling `next()` (or sending a response) stops the request processing chain.

**A17.**
- **Controller**: Handles HTTP request/response. Calls service. Sends response. No business logic.
- **Service**: All business logic. Rules, calculations, validations. No HTTP awareness (no req/res).
- **Repository**: All SQL queries. No business logic. Speaks only to the database.

**A18.**
- WebSocket: Protocol for a persistent, bidirectional connection between client and server.
- HTTP: Request-response. Client asks, server responds. Connection closes after each exchange.
- WebSocket: Server can push data anytime without client asking first.

**A19.**
- `.env.example`: A template showing what environment variable names are required, without real values.
- Safe to commit to Git. Helps teammates set up their own `.env` file.
- The actual `.env` file must NEVER be committed.

**A20.**
- HTTPS encrypts all data between browser and server using TLS/SSL.
- Without HTTPS (plain HTTP), anyone on the same network can intercept JWT tokens, passwords, API keys using tools like Wireshark.

---

## ROUND 2 — INTERMEDIATE TECHNICAL — ANSWERS

**A1.** Complete lifecycle:
User clicks → React handler calls service function → Axios sends HTTP request with JWT header → Express receives → Route matches → authMiddleware verifies JWT → Controller executes → Service applies business logic → Repository runs SQL query → MySQL returns data → Service processes result → Controller sends res.json() → HTTP response → Axios returns data → React state updated with setData() → Component re-renders with new UI

**A2.** Invalid login flow:
- Frontend: submit handler calls loginUser(email, password)
- Axios: POST /api/auth/login with body {email, password}
- Backend controller: calls authService.login()
- Service: queries DB for user by email
- If not found: throws Error with status 401
- Global error middleware catches: sends {success: false, message: "Invalid credentials", statusCode: 401}
- Axios: err.response.status === 401, err.response.data.message = "Invalid credentials"
- Frontend catch block: setError("Invalid credentials")
- UI shows error message, loading stops

**A3.** JWT flow:
1. Login: backend creates `jwt.sign({id, role}, JWT_SECRET, {expiresIn:'1d'})`
2. Frontend receives token, stores in `localStorage.setItem('token', token)`
3. Every subsequent request: Axios interceptor reads token, adds `Authorization: Bearer <token>`
4. Backend authMiddleware: extracts token from header, calls `jwt.verify(token, JWT_SECRET)`
5. If valid: attaches decoded {id, role} to `req.user`, calls `next()`
6. If expired: throws TokenExpiredError → 401 response → frontend redirects to login

**A4.**
- 401 Unauthorized: "I don't know who you are." No token, invalid token, expired token.
- 403 Forbidden: "I know who you are, but you can't do this." Valid token, insufficient role/permission.

**A5.** Salt rounds:
- Each round doubles the computation time. 10 rounds ≈ 100ms. 12 rounds ≈ 400ms.
- Higher rounds: slower to hash → harder for attackers to brute-force.
- Lower rounds: faster → easier to compute.
- 10 is the standard balance between security and UX speed.

**A6.** Props drilling: passing data through many component layers just to reach a deeply nested child.
Context API: any component anywhere can access shared state directly via `useContext()` without passing props down.

**A7.** RBAC:
- Frontend: ProtectedRoute checks `user.role`. If wrong role → redirect to /unauthorized.
- Backend: `requireRole('admin')` middleware checks `req.user.role`. If wrong → 403 Forbidden.
- Both layers needed: frontend for UX, backend for real security.

**A8.** N+1: 1 query to get 100 employees, then 1 query PER employee to get their department = 101 queries.
Fix: Use a single JOIN query that fetches employees WITH their department in one SQL call.

**A9.** Rooms: clients `socket.join('room-id')`. `io.to('room-id').emit()` sends to all in that room.
Private chat: join a room named by sorted user IDs: `[userId1, userId2].sort().join('-')`. Only those two join that room.

**A10.** Transaction: multiple DB operations that must ALL succeed or ALL rollback.
Real scenario: Bank transfer — debit account A AND credit account B. If credit fails, debit must reverse.

**A11.** Without handling: Express ignores the error, request hangs indefinitely.
Solution: wrap in try-catch and call `next(error)`. Express detects 4-argument error middleware: `(err, req, res, next)`.

**A12.** Request interceptor: runs before every request → attach token.
Response interceptor: runs on every response → check for 401 → redirect to login.

**A13.** Infinite re-render causes:
- State inside useEffect depending on that state in dependency array
- Parent re-rendering and passing new object/array reference as prop each time
- Context updating on every render
Debug: React DevTools Profiler → find which component re-renders most → check its dependencies

**A14.** FIFO: Oldest unpaid schedule gets paid first.
SQL: `ORDER BY due_date ASC` — allocate to earliest unpaid first.

**A15.** Page 3, 10 items: `SELECT * FROM employees ORDER BY id DESC LIMIT 10 OFFSET 20;`
(offset = (page - 1) * limit = (3-1) * 10 = 20)

**A16.** React compiles to browser JavaScript. Anyone can open DevTools → Sources → read every variable.
API keys in frontend code expose: billing/charges on your accounts, unauthorized access to third-party services.

**A17.** File extension can be faked (rename .exe to .jpg). MIME type is set by the browser from actual file content.
Multer's `fileFilter` checks `file.mimetype` which is harder to fake. Still should validate on backend.

**A18.** Manual docs: immediately go out of date when APIs change. Swagger annotations live next to the code, auto-generate interactive docs that always reflect current implementation.

**A19.** 5+ differences dev vs prod:
1. DB_HOST: localhost vs cloud database URL
2. DB_PASSWORD: local simple password vs strong production password
3. CLIENT_URL: localhost:5173 vs Vercel production URL
4. NODE_ENV: development vs production
5. JWT_SECRET: development secret vs long random production secret
6. GROQ_API_KEY: same key (but stored securely on server)

**A20.** CORS: Browser security standard.
Enforced BY: browser (not server, not Postman).
Configure: `cors({ origin: 'https://exact-frontend.vercel.app', credentials: true })`
`origin: '*'` in production: any website can make API calls with user's credentials → security risk.

---

## ROUND 3 — LIVE CODING — ANSWERS

**Task 1 Answer:**
```javascript
router.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  res.status(200).json({ message: 'OK' });
});
```

**Task 2 Answer:**
```javascript
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1]; // "Bearer TOKEN" -> "TOKEN"
    if (!token) return res.status(401).json({ message: 'Invalid authorization format' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
export default authMiddleware;
```

**Task 3 Answer:**
```javascript
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
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

**Task 4 Answer:**
```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

**Task 5 Answer:**
```sql
SELECT * FROM employees
WHERE department = 'Engineering'
ORDER BY salary DESC
LIMIT 10 OFFSET 20;
-- Page 2 offset: (2-1)*10=10 | Page 3 offset: (3-1)*10=20
```

**Task 6 Answer:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export const getEmployees = (params) => api.get('/employees', { params });
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export default api;
```

**Task 7 Answer:**
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: err.stack,
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
```

**Task 8 Answer:**
```javascript
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access forbidden. Required role: ${roles.join(' or ')}`
    });
  }
  next();
};

export default requireRole;
```

**Task 9 Answer:**
```javascript
import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from './app.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', { userId: socket.user.id });
  });

  socket.on('send_message', async ({ roomId, content }) => {
    // Save to DB here
    io.to(roomId).emit('new_message', {
      userId: socket.user.id,
      content,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.id} disconnected`);
  });
});

export { server, io };
```

**Task 10 Answer:**
```javascript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
```

---

## ROUND 4 — DEBUGGING — ANSWERS

**Bug #1 — API Calls Fail in Production**
- Cause: `VITE_API_URL` is still set to `http://localhost:5000` in the Vercel deployment.
- `localhost` in production means Vercel's own server, not Render where your backend lives.
- Fix: Set `VITE_API_URL=https://your-backend.onrender.com/api` in Vercel's Environment Variables dashboard.

**Bug #2 — Session Lost on Refresh**
- Cause: Auth state is stored in React `useState` which is in-memory. Page refresh clears all memory.
- Token is in localStorage but the Context initializes with `useState(null)`.
- Fix: Initialize from localStorage: `useState(localStorage.getItem('token'))` and `useState(JSON.parse(localStorage.getItem('user')))`.

**Bug #3 — GET /employees/5 Returns 500**
- Cause: Employee 5 doesn't exist. `findById` returns `null`. Code tries to access `null.name` or similar.
- Fix: Check for null in the service: `if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 });`
- Result: Clean 404 instead of unhandled 500.

**Bug #4 — req.file Undefined**
- Most likely cause: Frontend is sending JSON (`application/json`) instead of `multipart/form-data`.
- Or: Field name mismatch between `formData.append('photo', file)` and `upload.single('avatar')`.
- Fix:
  ```javascript
  const formData = new FormData();
  formData.append('avatar', file); // must match upload.single('avatar')
  axios.post('/upload', formData); // axios auto-sets Content-Type: multipart/form-data
  ```

**Bug #5 — Socket Messages Not Received in Production**
- Cause: Multiple server instances on Render. User A is on Server 1, User B on Server 2.
- Socket.IO broadcasts only within the same process.
- Fix: Add Redis adapter: `io.adapter(createAdapter(pubClient, subClient))`.
- Alternative: Ensure single server instance for now.

**Bug #6 — Daily Login Required**
- Cause: Not a bug — JWT is set to `expiresIn: '1d'` which is working correctly.
- The token expires after exactly 24 hours from login.
- If this is unwanted: implement refresh token pattern (short-lived access token + long-lived refresh token).
- Or increase expiry for better UX if security allows: `'7d'` or `'30d'`.

**Bug #7 — Special Characters Crash Search**
- Cause: If NOT using parameterized queries properly, SQL special chars break the query.
- Or: LIKE query with `%` in user input (user types `%` → LIKE `%%john%%` → different behavior).
- Fix: Parameterized queries ALWAYS. `LIKE ?` with `['%' + userInput.replace('%', '\\%') + '%']`. Or just use parameterized with `?` and let mysql2 handle escaping.

**Bug #8 — Duplicate Email Returns 500**
- Cause: MySQL throws `ER_DUP_ENTRY` error on unique constraint violation. This isn't caught and returns 500.
- Fix: In service, check email existence BEFORE inserting:
  ```javascript
  const existing = await repo.findByEmail(email);
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });
  ```
- Result: 409 Conflict instead of 500.

**Bug #9 — Backend Crashes on Render with ECONNREFUSED 127.0.0.1:3306**
- Cause: `DB_HOST` is set to `localhost` or `127.0.0.1` in the Render environment variables.
- In production, localhost means Render's own server — your MySQL is not running there.
- Fix: Set `DB_HOST` in Render's Environment tab to your cloud database host (e.g. `gateway01.ap-northeast-1.prod.aws.tidbcloud.com`).

**Bug #10 — Direct URL Returns 404 on Vercel**
- Cause: React Router handles URLs client-side. Vercel looks for actual files matching the URL path.
- `/dashboard` → Vercel looks for `/dashboard.html` → doesn't exist → 404.
- Fix: Create `vercel.json` in project root:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

---

## ROUND 5 — ARCHITECTURE — ANSWERS

**A1.** Full Stack Architecture (see the diagram in Module 1 of the prep document):
Browser → React → API Service → Express Routes → Middleware → Controller → Service → Repository → MySQL → Response back up

**A2.** Employee Management DB Schema:
```sql
departments(id INT PK, name VARCHAR, manager_id INT FK->employees.id)
employees(id INT PK, name VARCHAR, email VARCHAR UNIQUE, dept_id INT FK->departments.id, role ENUM('admin','manager','employee'), salary DECIMAL, hire_date DATE)
audit_logs(id INT PK, entity VARCHAR, entity_id INT, action VARCHAR, changed_by INT FK->employees.id, old_value JSON, new_value JSON, changed_at TIMESTAMP)
```

**A3.** Business logic in Service:
- Reusability: two controllers can call the same service method without duplication.
- Testability: service can be unit tested WITHOUT HTTP context (no req/res needed). Just call `service.create(data)` directly in tests.

**A4.** Shared service logic:
- Public endpoint: POST /api/register → validation → calls `employeeService.create(data)`
- Admin endpoint: POST /api/admin/employees → auth + admin check → same `employeeService.create(data)`
- The service is reused. No duplication.

**A5.** Real-time notification architecture:
- Agent 6 runs → detects payment approved → calls `notificationService.create(alertData)`
- Service inserts alert to DB → emits Socket.IO event: `io.to('admin-room').emit('new_alert', alertData)`
- All admin users join 'admin-room' on socket connection
- Their dashboards receive the push event and update the UI in real time

**A6.** Separation of Concerns examples:
1. Routes define paths only — no logic (concern: URL mapping)
2. Controllers handle HTTP in/out — no SQL (concern: HTTP layer)
3. Repositories have SQL queries — no business rules (concern: data access)

**A7.** Auth with two roles:
- Single login endpoint for all users
- JWT payload includes `role: 'admin'` or `role: 'employee'`
- Backend: `requireRole('admin')` on admin-only routes
- Frontend: `ProtectedRoute requiredRole="admin"` on admin-only pages
- Regular employees who try admin routes: 403 on API, redirect on frontend

**A8.** Problems with single file server.js:
1. 10,000+ line file — impossible to navigate
2. Duplicate code — same query written in 10 places
3. Impossible to unit test individual functions
4. Two developers can't work on the same file simultaneously without merge conflicts
5. Cannot switch DB without rewriting the entire file

**A9.** Developer-friendly error format:
```json
{
  "success": false,
  "message": "Employee not found",
  "statusCode": 404,
  "timestamp": "2026-08-24T18:00:00Z",
  "path": "/api/employees/999",
  "errors": [{ "field": "id", "message": "No employee with this ID" }]
}
```

**A10.** Proper structure benefits:
- Add new feature → only touch the specific files in each layer
- Switch from MySQL to PostgreSQL → change only repositories
- New developer joins → folder names tell them exactly where things are
- Testing → can mock repositories without needing a real DB

---

## ROUND 6 — PROJECT REVIEW — ANSWERS

*(These are personalized — use the 2-minute project explanation and architecture walkthrough from the prep document. The key is to speak confidently about YOUR implementation.)*

**Key points per question:**

**A1.** FinanceFlow AI — automates bank reconciliation and credit monitoring for lending companies. 6 AI agents, Groq LLM, React + Express + TiDB.

**A2.** Controller-Service-Repository pattern. Controllers handle HTTP. Services have logic. Repositories have SQL.

**A3.** Login → bcrypt compare → jwt.sign() → token in localStorage → Axios interceptor attaches → authMiddleware verifies → req.user available → ProtectedRoute checks on frontend.

**A4.** Central api.js file with Axios instance. Request interceptor attaches JWT. Response interceptor handles 401.

**A5.** companies, loans, repayment_schedules, payments, reconciliation_cases, notification_alerts, risk_assessments, agent_runs.

**A6.** Backend: global errorHandler middleware. Frontend: try-catch with loading/error state.

**A7.** authMiddleware verifies JWT. requireRole checks role. Missing token → 401. Wrong role → 403.

**A8.** Multer middleware. MIME type validation. File size limit 5MB. Unique filename. Path stored in DB.

**A9.** Socket.IO. Agents emit events to frontend. expandedAlertId state manages which card is open.

**A10.** DB_HOST, DB_PASSWORD, JWT_SECRET, GROQ_API_KEY, CLIENT_URL, PORT. Dev: localhost. Prod: cloud URLs.

**A11.** Frontend: Vercel. Backend: Render. Database: TiDB Cloud.

**A12.** All JWTs would immediately fail verification → every protected API call returns 401 → entire application locked out.

**A13.** Parameterized queries with `?` placeholder everywhere. Never string concatenation.

**A14.** Frontend: ProtectedRoute redirects to /unauthorized. Backend: requireRole('admin') returns 403.

**A15.** (Your personal answer — the most complex feature you built. E.g. bidirectional ledger rollback)

**A16.** (Your personal answer — what you'd add: refresh tokens, mobile app, more comprehensive testing, etc.)

**A17.** New filter feature walkthrough:
1. `database/schema.sql`: verify `department` column exists (or add it)
2. `backend/src/repositories/employee.repository.js`: add department condition to WHERE clause
3. `backend/src/services/employee.service.js`: pass department filter to repository
4. `backend/src/controllers/employee.controller.js`: extract department from `req.query`
5. `frontend/src/services/api.js`: ensure getEmployees passes query params
6. `frontend/src/pages/Employees.jsx`: add department filter dropdown, pass to API call

**A18.** What breaks first: single backend server = single point of failure. Database connection limit.
Scale: Horizontal backend scaling + load balancer, read replicas for DB, Redis for Socket.IO sync.

**A19.** Supertest integration tests for all API endpoints. Manual Postman testing. Browser testing.

**A20.** Slow query diagnosis:
1. `EXPLAIN SELECT ...` — see if FULL TABLE SCAN
2. Add INDEX on searched column
3. Check for N+1 queries (JOIN instead)
4. Add pagination to limit row count

---

## ROUND 7 — RAPID FIRE — ANSWERS

| # | Question | Answer |
| :--- | :--- | :--- |
| 1 | What does REST stand for? | Representational State Transfer |
| 2 | HTTP method for create? | POST |
| 3 | Status code Unauthorized? | 401 |
| 4 | Status code Forbidden? | 403 |
| 5 | bcrypt used for? | Password hashing |
| 6 | JWT used for? | Stateless authentication |
| 7 | What is CORS? | Browser security blocking cross-origin requests |
| 8 | What does next() do? | Passes control to next middleware |
| 9 | SQL queries folder? | repositories/ |
| 10 | Business logic folder? | services/ |
| 11 | Local state hook? | useState |
| 12 | Side effects hook? | useEffect |
| 13 | Vite env prefix? | VITE_ |
| 14 | Read Vite env var? | import.meta.env.VITE_VARIABLE_NAME |
| 15 | Never commit this? | .env file |
| 16 | Status for POST success? | 201 Created |
| 17 | FormData used for? | Multipart/form-data file uploads |
| 18 | File upload middleware? | Multer |
| 19 | Swagger used for? | API documentation |
| 20 | Connection pool? | Reusable database connections pool |
| 21 | What is WebSocket? | Persistent bidirectional communication protocol |
| 22 | What is Socket.IO? | WebSocket library with rooms and fallbacks |
| 23 | JWT package for Node? | jsonwebtoken |
| 24 | DELETE status code? | 204 No Content |
| 25 | SQL injection? | Injecting malicious SQL through user input |
| 26 | Pagination? | Splitting data into pages with LIMIT/OFFSET |
| 27 | DB transaction? | Multiple operations that all succeed or all rollback |
| 28 | Vercel SPA routing config? | vercel.json with rewrites rule |
| 29 | io.to(roomId).emit() does? | Sends event to all clients in that room |
| 30 | process.env.PORT on Render? | Render assigns a port — you must use it, not hardcode |

---

## SCORING GUIDE

| Round | Max Points | Your Score |
| :--- | :--- | :--- |
| Round 1 — Basic Technical | 20 | ___/20 |
| Round 2 — Intermediate | 20 | ___/20 |
| Round 3 — Live Coding | 10 | ___/10 |
| Round 4 — Debugging | 10 | ___/10 |
| Round 5 — Architecture | 10 | ___/10 |
| Round 6 — Project Review | 20 | ___/20 |
| Round 7 — Rapid Fire | 30 | ___/30 |
| **TOTAL** | **120** | ___/120 |

| Score Range | Assessment |
| :--- | :--- |
| 100-120 | Excellent — Ready for assessment |
| 80-99 | Good — Review the missed topics |
| 60-79 | Fair — Study Modules 3, 5, 9 deeply |
| Below 60 | Needs more preparation |

---

*Mock Assessment Version: 1.0*
*For: Week 7 Full Stack Technical Assessment*
