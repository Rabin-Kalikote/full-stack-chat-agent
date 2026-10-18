# Task 3 - Change History Design

## Overview

We want to track the revision history of `FormSubmission` records whenever they are updated, while keeping the design flexible enough so we can track other models (like `Chat`) in the future without changing the database schema.

The goal is simple. We want to know what fields changed, what changed about them, and when they changed.

## The Model

Similar to how models are defined in `models.py`, we can create a single `RevisionHistory` model:

```python
class RevisionHistory(Base):
    __tablename__ = "revision_history"

    id = Column(String(length=32), primary_key=True, default=secrets.token_urlsafe)
    created_at = Column(DateTime, index=True)
    entity_type = Column(String, index=True)  # e.g. "FormSubmission", "Chat"
    entity_id = Column(String(length=32), index=True)
    changes = Column(JSON)  # stores old and new values for changed fields
```

## How It Works

Every time a record is updated, we insert a new row into `revision_history` with the changes.

1. **What fields changed?** The keys in the `changes` JSON tell us which fields were modified.
2. **What changed about them?** Each field holds both the previous value and the new value.
3. **When did they change?** The `created_at` timestamp tells us the exact time the change was saved.

### Example

If a user updates their phone number from `555-111-2222` to `555-999-8888` and changes status to `2` ("IN PROGRESS"), the row in `revision_history` looks like this:

```json
{
  "id": "rev_k8L2n9Pq1",
  "created_at": "2026-10-18T01:15:00",
  "entity_type": "FormSubmission",
  "entity_id": "form_abc123",
  "changes": {
    "phone_number": {
      "old": "555-111-2222",
      "new": "555-999-8888"
    },
    "status": {
      "old": 1,
      "new": 2
    }
  }
}
```

## Reusing This for Other Models

Because the model uses `entity_type` and `entity_id`:

- We don't need separate tables like `form_history` and `chat_history`.
- If we want to track revisions on `Chat` tomorrow, we simply save rows with `entity_type="Chat"` and `entity_id=chat.id`.
- The `changes` JSON column doesn't care what fields the model has, so no database migrations are needed when models change.

## Thought Process

I considered two main ways to solve this:

1. **Creating separate clone tables (e.g. `form_submission_history`)**: This copies all columns into a second table every time. While straightforward, it means every new model needs its own history table, and any schema changes have to be duplicated. It also wastes space by re-saving fields that didn't change.

2. **A single revision table storing diffs (Chosen)**: By storing only what actually changed inside a `JSON` column, we keep the table lightweight and universal. A single table handles all entities now and in the future, and querying history for any record is just:
   ```sql
   SELECT * FROM revision_history WHERE entity_type = 'FormSubmission' AND entity_id = :id ORDER BY created_at DESC;
   ```