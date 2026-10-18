# AI Usage Disclosure

In accordance with the assessment instructions, this document provides a full disclosure of AI tool usage, explanations of where and why AI was utilized, and the engineering details of changes made to the codebase.

---

## 1. AI Tools Utilized
- **AI Assistant**: Antigravity (Powered by DeepMind Advanced Agentic AI)
- **Primary Tasks Assisted**:
  - Project orientation, dependency auditing, and local setup configuration.
  - Implementation of Task 1:
    - Backend tool-calling logic in `update_chat` to persist structured interest forms to the database.
    - REST API design for retrieving form submissions by chat ID with optional status filtering.
    - Frontend UI modernization in `app/[chatId]/page.tsx` to display conversation messages side-by-side with submitted interest forms.
  - End-to-end integration testing and validation.

---

## 2. Environment Setup & Dependency Resolution
- **Python Virtual Environment**:
  - Identified that Python 3.13 environment failed on legacy pinned wheel requirements (`psycopg-binary==3.1.18`).
  - Switched virtual environment to Python 3.10 (`/opt/homebrew/bin/python3.10`), which cleanly resolved all dependencies without breaking pinned versions.
  - Installed all dependencies via `pip install -r requirements.txt`.
- **Database Migrations**:
  - Ran `alembic upgrade head`, generating the SQLite schema (`dev.db`) with `chat` and `form_submission` tables.
- **Frontend Dependencies**:
  - Installed node dependencies with `npm i`.
  - Started backend on `http://127.0.0.1:8000` and Next.js frontend dev server on `http://localhost:3000`.

---

## 3. Task 1: Collect Structured Interest Form

### 3.1 Backend Schema Updates (`backend/schemas.py`)
- Updated `FormSubmission` Pydantic model to include `chat_id: Optional[str] = None`.
- Added `from_attributes = True` alongside `orm_mode = True` in Pydantic configurations to ensure full compatibility with Pydantic v2.

### 3.2 Tool Call Handling & Persistence (`backend/main.py`)
- **System Prompt**:
  - Configured `SYSTEM_TEMPLATE` with explicit instructions:
    - Directs the assistant to collect the user's name, email address, and phone number.
    - Prompts the assistant to execute `submit_interest_form` once all required fields are present.
- **Tool Handling in `update_chat`**:
  - Extracted function call arguments from `resp_message["tool_calls"]` via `json.loads`.
  - On `submit_interest_form`:
    - Constructed `schemas.FormSubmissionCreate` using the parsed `name`, `email`, `phone_number`, and current `chat_id`.
    - Persisted the record to the database via `await crud.form.create(db=db, obj_in=form_in)`.
    - Returned a descriptive response to the assistant tool message: `f"Success. Form submitted with ID {form_submission.id}."`.
  - Handled the follow-up OpenAI model completion turn with tool results to yield natural conversational confirmation to the user.

### 3.3 New REST API Endpoint (`backend/main.py`)
- Added endpoint `GET /chat/{chat_id}/forms` (response model `list[schemas.FormSubmission]`):
  - Validates that the requested chat exists (returns HTTP 404 if not found).
  - Queries `crud.form.get_multi` filtering by `FormSubmission.chat_id == chat_id`.
  - Supports optional query parameter `status: Optional[int] = None` for status-based filtering (anticipating Task 2 requirements).

### 3.4 Frontend UI Redesign (`frontend/app/[chatId]/page.tsx`)
- Updated the chat detail page to a side-by-side two-column responsive layout:
  - **Header Bar**:
    - "Back to all chats" navigation link.
    - Chat ID display.
    - Live count of forms submitted for the current chat.
  - **Left Panel (Chat Window)**:
    - Clean message stream showing User, Assistant, Tool Call, and Tool Result messages.
    - Auto-scroll to latest message via React `useRef`.
    - Input form with Enter-to-submit support, loading state indicator (`Thinking...`), and disabled states to prevent duplicate submissions.
  - **Right Panel (Submitted Interest Forms)**:
    - Dedicated panel fetching forms via `useSWR({ url: 'chat/{chatId}/forms' }, fetcher)`.
    - Automatic optimistic cache revalidation (`mutateForms()`) upon receiving responses from `update_chat`.
    - Cards displaying Name, Email, Phone, Submission ID, Timestamp, and formatted Status badge (`TO DO`, `IN PROGRESS`, `COMPLETED`, or `UNSET`).
    - Clean empty state with helpful instructions when no forms have been submitted yet.

---

## 4. Testing & Verification
- **Automated API / Integration Test**:
  - Created a chat via `POST /chat`.
  - Sent user message: `"I want to submit an interest form. My name is Alice Smith, email is alice@example.com, and phone number is 555-123-4567."` via `PUT /chat/{chat_id}`.
  - Verified that:
    1. OpenAI triggered `submit_interest_form` with arguments `{"name": "Alice Smith", "email": "alice@example.com", "phone_number": "555-123-4567"}`.
    2. Backend executed `crud.form.create` and stored the row in `dev.db`.
    3. Assistant confirmed submission to the user.
    4. `GET /chat/{chat_id}/forms` returned the exact created record with its assigned UUID/token, timestamps, and fields.
- **Frontend Verification**:
  - Confirmed `/[chatId]` page compiled cleanly in Next.js (`200 OK`).
  - Tested navigation and verified layout rendering.

---

## 5. Frontend 3-Column Layout Redesign
- **Architecture**:
  - Modularized the frontend layout into reusable components under `frontend/components/`:
    - `ChatListSidebar.tsx`: Left sidebar displaying previous conversations (`GET /chat`), active chat highlighting with badge and ring indicators, and "+ New Chat" button. Includes a "No previous chats" state.
    - `ChatConversation.tsx`: Middle conversation stream with tool call argument blocks, tool results, auto-scrolling, and welcoming prompt starters.
    - `SubmissionsSidebar.tsx`: Right sidebar displaying interest submissions for the open chat (`GET /chat/{chat_id}/forms`), or an empty state when on the Home page by default.
  - **Home Page (`frontend/app/page.tsx`)**:
    - Left sidebar: lists previous chats.
    - Middle bar: interactive AI chat interface allowing the user to type and start a new conversation immediately with suggestion chips.
    - Right sidebar: clean empty state by default.
    - Styled with thin rounded borders (`rounded-xl border border-gray-200 bg-white shadow-xs`).
  - **Chat Page (`frontend/app/[chatId]/page.tsx`)**:
    - Left sidebar: shows previous chats with the currently open chat highlighted with active state styles.
    - Middle bar: shows the existing conversation and allows continuing the chat.
    - Right sidebar: dynamically displays interest form submissions associated with that chat, updating live on message completion.
    - All 3 bars surrounded with thin rounded borders.
  - **Message Alignment & Visual Hierarchy ([ChatConversation.tsx](file:///Users/rabinkalikote/Documents/Github/assessment-main/frontend/components/ChatConversation.tsx))**:
    - Aligned User messages to the right side (`self-end`) using modern blue bubbles (`bg-blue-600 text-white rounded-2xl rounded-tr-sm`).
    - Aligned Assistant messages, tool calls, and tool responses to the left side (`self-start`) using clean bordered cards (`bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm`).
    - Configured `flex flex-col` on the conversation container to ensure clean positioning.

---

## 6. Mobile Responsive Collapse & Sidebar Toggles
- **Responsive Architecture**:
  - **Desktop (`lg:` breakpoint and wider)**: All three columns remain open side-by-side in their full layouts (`hidden lg:flex`).
  - **Mobile / Tablet (`< lg`)**:
    - Sidebars are collapsed by default to allow the main chat bar to occupy full viewport width.
    - Added dedicated toggle buttons in the main bar header:
      - Left toggle (`💬 Chats`): Opens a slide-over drawer overlay displaying the previous conversation history and "+ New Chat" button.
      - Right toggle (`📋 Forms`): Opens a slide-over drawer overlay displaying the submitted forms for the active chat, with an unread/count badge.
    - Integrated backdrop overlays (`bg-black/40 backdrop-blur-xs`) that dismiss the drawer when tapped.
    - Added explicit close buttons (`✕`) on mobile drawers, and automatically close the drawer upon selecting a chat.
  - **Header Cleanup**:
    - Removed the redundant `<- Home` link and divider from the chat window header in [app/[chatId]/page.tsx](file:///Users/rabinkalikote/Documents/Github/assessment-main/frontend/app/%5BchatId%5D/page.tsx), giving users a cleaner interface while navigating via the sidebar.

---

## 7. Task 2: Advanced Chatbot Capabilities & REST API for FormSubmissions

### 7.1 Schema Validation (`backend/schemas.py`)
- Added `@field_validator("status")` on `FormSubmissionUpdate`, `FormSubmissionCreate`, and `FormSubmission`.
- Enforces that status must be either `None`, `1` ("TO DO"), `2` ("IN PROGRESS"), or `3` ("COMPLETED").
- Invalid inputs reject immediately with HTTP 422 Unprocessable Entity.

### 7.2 Chatbot Augmentation (Update & Delete via Chat) (`backend/main.py`)
- **New Tool Specifications**:
  - `update_interest_form`: Allows the assistant to update name, email, phone number, and/or status by `form_id`.
  - `delete_interest_form`: Allows the assistant to delete an interest form submission by `form_id`.
- **Dynamic Context Injection**:
  - In `update_chat`, dynamically queries `crud.form.get_multi` for existing forms belonging to the current `chat_id`.
  - Injects a summary of existing form IDs and values into the system message prompt, enabling the assistant to identify the target form naturally (e.g. when the user says "Change my email to new@example.com").
- **Execution Handlers in `update_chat`**:
  - Validates that the targeted form exists and belongs to the active `chat_id`.
  - Performs updates via `crud.form.update` and deletions via `crud.form.remove`.
  - Feeds descriptive tool execution confirmations back to OpenAI to inform the user.

### 7.3 REST API Endpoints for FormSubmissions (`backend/main.py`)
- **`PUT /form/{form_id}` & `PATCH /form/{form_id}`** (aliases: `/forms/{form_id}`):
  - Updates name, email, phone number, and status.
  - Returns updated `FormSubmission` object; raises 404 if not found.
- **`GET /chat/{chat_id}/forms`** (alias: `/chat/{chat_id}/form`):
  - Retrieves all form submissions for a specific chat.
  - Supports query parameter filtering: `?status=1`, `?status=2`, `?status=3`.
  - Rejects invalid status query parameters with HTTP 400 Bad Request.
- **`GET /form/{form_id}`** (alias: `/forms/{form_id}`):
  - Fetches an individual form submission by ID.
- **`DELETE /form/{form_id}`** (alias: `/forms/{form_id}`):
  - Deletes the form submission from the database via `crud.form.remove`.
  - Returns `{"message": "Form submission deleted successfully", "id": form_id}`.

### 7.4 UI Management Features (`frontend/components/SubmissionsSidebar.tsx`)
- **Status Filter**: Integrated status dropdown in the sidebar to filter submissions by "All", "TO DO", "IN PROGRESS", or "COMPLETED".
- **Quick Status Changer**: Dropdown on each card to change status with immediate database persistence and SWR cache revalidation.
- **Inline Editor**: Added "Edit" toggle allowing users to modify name, email, phone number, and status directly in the UI.
- **Delete Action**: Added delete button with confirmation dialog, triggering `DELETE /form/{form.id}` and removing the card from the UI.

### 7.5 Automated Verification Results
- Ran comprehensive integration test verifying:
  1. Creation via chat tool call `submit_interest_form`.
  2. REST API update via `PUT /form/{form_id}`.
  3. Status validation rejecting invalid values (e.g. status 5 yields HTTP 422).
  4. Query filtering by status (`?status=2` returned matching form; `?status=1` returned none; invalid status query returned 400).
  5. Chatbot update via conversational prompt (`update_interest_form` invoked).
  6. Chatbot deletion via conversational prompt (`delete_interest_form` invoked).
  7. REST API deletion via `DELETE /form/{form_id}`.
- All tests passed with 100% success rate.

---

## 8. Security & Environment Configuration
- **API Key Sanitization**:
  - Replaced hardcoded OpenAI API key in `backend/main.py` with `os.getenv("OPENAI_API_KEY")`.
  - Configured `python-dotenv` (`load_dotenv()`) to load secrets from `backend/.env`.
  - Added `backend/.env.example` as a template for environment configuration.
  - Verified that `.env`, `.venv`, and `dev.db` are excluded from version control in `.gitignore`.







