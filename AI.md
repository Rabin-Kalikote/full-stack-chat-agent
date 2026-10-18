# AI Usage & Development Notes

Here is the breakdown of how I completed this assessment, the design choices I made along the way, and how I used Google AI (Antigravity) as my pair programmer throughout the process.

## How I Used Google AI

I used Google AI as an interactive pair programming partner:
- **Navigating the codebase**: Quick orientation around the existing models, schemas, CRUD helpers, and Next.js structure.
- **Troubleshooting setup**: Diagnosing Python package dependency mismatches quickly.
- **Writing & iterating code**: Scaffolding endpoints, adding Pydantic validators, wiring up OpenAI function calls, and building responsive React components.
- **Testing**: Writing end-to-end scripts to verify tool calls, database updates, and REST endpoints.

## 1. Setup & Getting Things Running

When I first ran `pip install -r requirements.txt`, the installation failed because Python 3.13 didn't have prebuilt wheels for older pinned packages like `psycopg-binary 3.1.18`. 

With Google AI's help, I checked what other Python versions were on my system and switched the virtual environment to Python 3.10. Everything installed cleanly, migrations ran with `alembic upgrade head`, and I verified both servers were responding on `localhost:8000` and `localhost:3000`.

## 2. Task 1 - Collecting Interest Forms & Initial UI

### Backend
- **System Prompt**: In `backend/main.py`, I wrote a system prompt telling the model to ask the user for their name, email, and phone number if any were missing, and then call `submit_interest_form`.
- **Tool Handling**: Inside `update_chat`, I parsed the tool arguments and used the prebuilt `crud.form.create()` helper to save the new `FormSubmission` to the database, tagged with the current `chat_id`.
- **Forms API**: I added a `GET /chat/{chat_id}/forms` endpoint so the frontend could query all submissions belonging to that chat.

### Frontend
- I updated the chat view to show conversation messages on one side and any submitted interest forms on the other side.
- Used SWR so that when the assistant finishes submitting a form, the list refreshes automatically.

## 3. Frontend 3-Column Redesign & Mobile Toggles

I decided to clean up the interface and give it a modern 3-column layout:
- **Left sidebar**: Lists all previous chats with date and message count. Highlights whichever chat is currently active, and has a "+ New Chat" button.
- **Middle bar**: The main chat window with quick starter buttons on the home page.
- **Right sidebar**: Shows the interest form submissions for the active chat (empty on the home page).
- **Styling**: Enclosed all three panels in thin rounded borders with clean gray backgrounds.
- **Message alignment**: Aligned user messages to the right in blue bubbles and assistant/tool messages to the left in white cards for better visual hierarchy.
- **Mobile responsiveness**: Added collapsible slide-over drawers with toggle buttons in the header (`Chats` and `Forms`) so the app is comfortable to use on small screens.

## 4. Task 2 - Bot Updates, Deletions & REST API

### Chatbot Updates & Deletions
- Added two new function tools to `main.py`: `update_interest_form` and `delete_interest_form`.
- **Smart context injection**: Before sending messages to OpenAI, I query existing forms for that chat and include their details in the prompt. That way, if a user simply says *"change my phone number to 555-0000"*, the assistant already knows which form ID they're talking about and calls the tool directly.

### REST API & Validation
- **Status Validation**: In `backend/schemas.py`, I added a Pydantic `@field_validator` on `status` to guarantee it only accepts `None`, `1` ("TO DO"), `2` ("IN PROGRESS"), or `3` ("COMPLETED"). Any other value gets rejected with HTTP 422.
- **Endpoints**:
  - `PUT /form/{form_id}` (and `PATCH`): Updates name, email, phone, and validated status.
  - `GET /chat/{chat_id}/forms`: Gets all forms for a chat, with optional `?status=` filtering (and returns 400 if an invalid status filter is passed).
  - `GET /form/{form_id}`: Gets a single form.
  - `DELETE /form/{form_id}`: Removes the form from the database.
- **UI Management**: Added a status filter dropdown, direct status picker, inline "Edit" mode, and "Delete" button right on the submission cards.

## 5. Security & GitHub Push

Before pushing to GitHub, I had the OpenAI API key was hardcoded in `backend/main.py`. I refactored it:
- Created a `.env` file for the key and used `python-dotenv` (`load_dotenv()`) in `main.py`.
- Created `.env.example` as a template for others.
- Confirmed that `.env`, `.venv`, and `dev.db` were safely ignored in `.gitignore` before pushing to `https://github.com/Rabin-Kalikote/full-stack-chat-agent.git`.

## 6. Task 3 - Change History Design

In `task3.md`, I designed a generic `revision_history` table that records:
- **What changed**: The keys inside a `changes` JSON column.
- **What changed about them**: Storing `old` and `new` values for every changed field.
- **When they changed**: The `created_at` timestamp.

I chose a single table with JSON diffs because it works out of the box for `FormSubmission` today, and can handle `Chat` or any future entity tomorrow without writing new tables or running migrations.
