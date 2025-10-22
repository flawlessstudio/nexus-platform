# 📚 NEXUS API Reference

This document provides a reference for the NEXUS backend API endpoints.

**Base URL**: \`/api\`

---
## **Authentication**

### \`POST /auth/register\`
Registers a new user.
- **Body**: \`{ "email", "password", "firstName", "lastName" }\`
- **Success Response**: `201 Created`
  ```json
  {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user"
    },
    "token": "your.jwt.token"
  }
  ```
- **Error Response**: `422 Unprocessable Entity` (e.g., invalid email)
  ```json
  {
    "errors": [
      { "msg": "Invalid value", "param": "email", ... }
    ]
  }
  ```

### \`POST /auth/login\`
Logs in an existing user.
- **Body**: \`{ "email", "password" }\`
- **Success Response**: `200 OK`
  ```json
  {
    "user": {
      "id": 1,
      "email": "test@example.com",
      ...
    },
    "token": "your.jwt.token"
  }
  ```

---
## **Admin**

**Authentication**: All admin endpoints require an `Authorization: Bearer <token>` header.
The token is obtained from the `/auth/login` endpoint.

**Authorization**: Requires user role to be `admin`.

### \`GET /admin/users\`
Retrieves a list of all users.
- **Query Parameters**:
  - `page` (optional, number): The page number to retrieve. Defaults to `1`.
  - `limit` (optional, number): The number of users per page. Defaults to `20`.
- **Success Response**: `200 OK`
  ```json
  { "users": 
    [
        {
            "id": 1,
            "email": "user1@example.com",
            "first_name": "Jane",
            "last_name": "Doe",
            "role": "user",
            "is_active": true
        }
    ],
    "pagination": { "currentPage": 1, "totalPages": 5, "totalUsers": 98, "limit": 20 }
  }
  ```
