import json
import os
from typing import Any, AsyncGenerator, Optional
import uuid

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from sqlalchemy.ext.asyncio import AsyncSession

import crud
from database import SessionLocal
import models
import schemas

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    # Fallback to check if set without prefix or notify
    print("Warning: OPENAI_API_KEY environment variable is not set.")

openai_client = OpenAI(api_key=openai_api_key)

SYSTEM_TEMPLATE = """You are a helpful assistant assisting users with submitting, updating, and managing their interest forms.
- If a user wants to submit an interest form, collect their name, email address, and phone number. When all three are provided, call submit_interest_form.
- If a user wants to update an existing interest form, verify which form to update and what details to change (name, email, phone number, or status), then call update_interest_form. Note: valid statuses are 1 ("TO DO"), 2 ("IN PROGRESS"), 3 ("COMPLETED"), or null.
- If a user wants to delete an interest form, verify which form to delete and call delete_interest_form."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "submit_interest_form",
            "description": "Submit a new interest form for the user with the given properties",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "the user's name",
                    },
                    "email": {
                        "type": "string",
                        "description": "the user's email address",
                    },
                    "phone_number": {
                        "type": "string",
                        "description": "the user's phone number",
                    },
                },
                "required": ["name", "email", "phone_number"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_interest_form",
            "description": "Update an existing interest form submission for this chat by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "form_id": {
                        "type": "string",
                        "description": "The unique ID of the form submission to update",
                    },
                    "name": {
                        "type": "string",
                        "description": "The updated name",
                    },
                    "email": {
                        "type": "string",
                        "description": "The updated email address",
                    },
                    "phone_number": {
                        "type": "string",
                        "description": "The updated phone number",
                    },
                    "status": {
                        "type": "integer",
                        "description": "Status code: 1 for TO DO, 2 for IN PROGRESS, 3 for COMPLETED, or null",
                    },
                },
                "required": ["form_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_interest_form",
            "description": "Delete an existing interest form submission for this chat by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "form_id": {
                        "type": "string",
                        "description": "The unique ID of the form submission to delete",
                    },
                },
                "required": ["form_id"],
            },
        },
    },
]

# Get a DB Session
async def get_db() -> AsyncGenerator:
    async with SessionLocal() as session:
        yield session


@app.get("/")
async def root():
    return {"message": "Hello World"}

# response_model represents the format of the response that this endpoint will produce. Responses are always in JSON
@app.get("/chat", response_model=list[schemas.Chat])
async def get_chats(db: AsyncSession = Depends(get_db)):
    chats = await crud.chat.get_multi(db, limit=10)
    return chats

# the data parameter represents the body of the request. The request body should always be in JSON format
@app.post("/chat", response_model=schemas.Chat)
async def create_chat(data: schemas.ChatCreate, db: AsyncSession = Depends(get_db)):
    chat = await crud.chat.create(db=db, obj_in=data)
    return chat

# the chat_id parameter maps to the chat id in the URL
@app.put("/chat/{chat_id}", response_model=schemas.Chat)
async def update_chat(
    chat_id: str, data: schemas.ChatUpdate, db: AsyncSession = Depends(get_db)
):
    chat = await crud.chat.get(db, id=chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    existing_forms = await crud.form.get_multi(
        db, filters=[models.FormSubmission.chat_id == chat_id]
    )

    if existing_forms:
        forms_desc = "\n".join(
            [
                f"- ID: {f.id}, Name: {f.name}, Email: {f.email}, Phone: {f.phone_number}, Status: {f.status}"
                for f in existing_forms
            ]
        )
        chat_context = f"\n\nExisting interest forms for this chat:\n{forms_desc}"
    else:
        chat_context = "\n\nThere are currently no interest forms submitted for this chat."

    current_system_prompt = SYSTEM_TEMPLATE + chat_context

    resp = openai_client.chat.completions.create(
        messages=[{"role": "system", "content": current_system_prompt}] + data.messages,
        model="gpt-4o-mini",
        tools=TOOLS,
    )
    resp_message = resp.choices[0].message.model_dump()

    data.messages.append(resp_message)

    if resp_message.get('tool_calls'):
        for t in resp_message["tool_calls"]:
            tool_name = t["function"]["name"]
            tool_args_raw = t["function"].get("arguments", "{}")
            try:
                tool_args = json.loads(tool_args_raw)
            except Exception:
                tool_args = {}

            if tool_name == "submit_interest_form":
                form_in = schemas.FormSubmissionCreate(
                    name=tool_args.get("name", ""),
                    email=tool_args.get("email", ""),
                    phone_number=tool_args.get("phone_number", ""),
                    chat_id=chat_id,
                    status=None,
                )
                form_submission = await crud.form.create(db=db, obj_in=form_in)
                tool_content = f"Success. Form submitted with ID {form_submission.id}."

            elif tool_name == "update_interest_form":
                form_id = tool_args.get("form_id")
                target_form = await crud.form.get(db, id=form_id) if form_id else None

                # Fallback: if only 1 form exists in this chat and form_id was omitted or mismatched
                if not target_form and len(existing_forms) == 1:
                    target_form = existing_forms[0]
                    form_id = target_form.id

                if not target_form or target_form.chat_id != chat_id:
                    tool_content = f"Error: Form submission with ID '{form_id}' not found for this chat."
                else:
                    update_dict = {}
                    for field in ("name", "email", "phone_number", "status"):
                        if field in tool_args:
                            update_dict[field] = tool_args[field]

                    try:
                        form_update_in = schemas.FormSubmissionUpdate(**update_dict)
                        updated = await crud.form.update(db, db_obj=target_form, obj_in=form_update_in)
                        tool_content = (
                            f"Success. Form {updated.id} updated successfully: "
                            f"Name: {updated.name}, Email: {updated.email}, Phone: {updated.phone_number}, Status: {updated.status}."
                        )
                    except Exception as exc:
                        tool_content = f"Error updating form: {str(exc)}"

            elif tool_name == "delete_interest_form":
                form_id = tool_args.get("form_id")
                target_form = await crud.form.get(db, id=form_id) if form_id else None

                if not target_form and len(existing_forms) == 1:
                    target_form = existing_forms[0]
                    form_id = target_form.id

                if not target_form or target_form.chat_id != chat_id:
                    tool_content = f"Error: Form submission with ID '{form_id}' not found for this chat."
                else:
                    await crud.form.remove(db=db, id=form_id)
                    tool_content = f"Success. Form submission with ID {form_id} was deleted."
            else:
                tool_content = "Success"

            data.messages.append(
                {
                    "tool_call_id": t["id"],
                    "role": "tool",
                    "name": tool_name,
                    "content": tool_content,
                }
            )

        resp = openai_client.chat.completions.create(
            messages=[{"role": "system", "content": current_system_prompt}] + data.messages,
            model="gpt-4o-mini",
            tools=TOOLS,
        )
        resp_message = resp.choices[0].message.model_dump()

        data.messages.append(resp_message)

    chat = await crud.chat.update(db, db_obj=chat, obj_in=data)

    return chat


@app.get("/chat/{chat_id}", response_model=schemas.Chat)
async def get_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    chat = await crud.chat.get(db, id=chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return chat


# --- FormSubmissions REST API Endpoints ---

@app.get("/chat/{chat_id}/forms", response_model=list[schemas.FormSubmission])
@app.get("/chat/{chat_id}/form", response_model=list[schemas.FormSubmission], include_in_schema=False)
async def get_chat_forms(
    chat_id: str,
    status: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    chat = await crud.chat.get(db, id=chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if status is not None and status not in (1, 2, 3):
        raise HTTPException(
            status_code=400,
            detail="Invalid status filter. Status must be 1 (TO DO), 2 (IN PROGRESS), or 3 (COMPLETED)",
        )

    filters = [models.FormSubmission.chat_id == chat_id]
    if status is not None:
        filters.append(models.FormSubmission.status == status)

    forms = await crud.form.get_multi(db, filters=filters)
    return forms


@app.get("/form/{form_id}", response_model=schemas.FormSubmission)
@app.get("/forms/{form_id}", response_model=schemas.FormSubmission, include_in_schema=False)
async def get_form(form_id: str, db: AsyncSession = Depends(get_db)):
    form_obj = await crud.form.get(db, id=form_id)
    if not form_obj:
        raise HTTPException(status_code=404, detail="Form submission not found")
    return form_obj


@app.put("/form/{form_id}", response_model=schemas.FormSubmission)
@app.patch("/form/{form_id}", response_model=schemas.FormSubmission)
@app.put("/forms/{form_id}", response_model=schemas.FormSubmission, include_in_schema=False)
@app.patch("/forms/{form_id}", response_model=schemas.FormSubmission, include_in_schema=False)
async def update_form(
    form_id: str,
    data: schemas.FormSubmissionUpdate,
    db: AsyncSession = Depends(get_db),
):
    form_obj = await crud.form.get(db, id=form_id)
    if not form_obj:
        raise HTTPException(status_code=404, detail="Form submission not found")

    updated = await crud.form.update(db, db_obj=form_obj, obj_in=data)
    return updated


@app.delete("/form/{form_id}")
@app.delete("/forms/{form_id}", include_in_schema=False)
async def delete_form(form_id: str, db: AsyncSession = Depends(get_db)):
    form_obj = await crud.form.get(db, id=form_id)
    if not form_obj:
        raise HTTPException(status_code=404, detail="Form submission not found")

    await crud.form.remove(db=db, id=form_id)
    return {"message": "Form submission deleted successfully", "id": form_id}

