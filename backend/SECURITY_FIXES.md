# Security Fixes and Updates

The following security patches and logic fixes were applied to the AssessMate backend:

### 1. Security Configuration and Access Control
- Fixed `SecurityConfig.java` to explicitly secure the `/api/coding/{id}` and `/api/proctoring/**` endpoints to `HOST` roles only.
- Restricted the `/api/exams/*/coding/candidate` endpoint to `CANDIDATE` roles.
- Ensured candidate code execution (`/api/coding/run` and `/api/coding/submit`) mandates the `CANDIDATE` role.

### 2. IDOR Protections (Coding Endpoints)
- Addressed insecure direct object references (IDOR) inside `CodingQuestionService.java`.
- Removed fallbacks that allowed candidates to submit code by simply providing arbitrary `candidateId` overrides.
- Validated that `req.getEnrollmentId()` explicitly matches the authenticated user's ID before permitting the submission or run actions.
- Added strict checks to verify the candidate's exam session is `ONGOING` and their `personalEndTime` has not expired before allowing code execution or submission.

### 3. Business Logic and Integrity Checks
- Addressed a bug in `QuestionService.java` where editing an already verified question kept its `isVerified` status as `true`. Editing a question now securely flags it as `isVerified = false`, necessitating re-verification.
- Enforced difficulty quotas (`checkDifficultyCapacity`) in `QuestionService.addFromBank()` to prevent a HOST from bypassing exam constraints via bulk imports.
- Updated `AuthService.java` to strictly disable `HOST` role self-registration.
- Enhanced `ExamScheduler.java` and `ExamService.java` with an `autoEndExams()` routine to automatically transition `LIVE` exams to `ENDED` once all enrollments are submitted/expired or when the maximum possible time limit has been exceeded.

### 4. Exception Handling
- Refactored `CandidateService.java`, `QuestionService.java`, `ExamService.java`, `AuthService.java`, `FileProcessingService.java`, `Judge0Service.java`, and `GeminiService.java` to replace ~88 instances of generic `RuntimeException` with project-standard custom exception types such as `BadRequestException`, `ForbiddenException`, and `ResourceNotFoundException`.
- This ensures clients receive informative 400/403/404 HTTP responses instead of ambiguous 500 Internal Server Errors.

### 5. Secrets Management
- Addressed the lack of a dummy environment file by introducing `.env.example` containing secure, placeholder values for Gemini AI keys, Database Credentials, and JWT Secrets.
- Ensure that the real `.env` file is in `.gitignore` and omitted from the git tree.
