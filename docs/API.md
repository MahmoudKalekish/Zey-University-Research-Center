# REST API

Local base URL: `http://localhost:4000/api`. JSON is used except for PDF multipart uploads and PDF streaming. Protected routes require `Authorization: Bearer <jwt>`. Errors use `{ "message": "...", "errors"?: ... }` with appropriate 400/401/403/404/409/422/500 status codes.

## Authentication

| Method | Endpoint         | Access | Purpose                                                           |
| ------ | ---------------- | ------ | ----------------------------------------------------------------- |
| POST   | `/auth/register` | Public | Create visitor account from `{firstName,lastName,email,password}` |
| POST   | `/auth/login`    | Public | Return `{token,user}` from `{email,password}`                     |
| GET    | `/auth/me`       | JWT    | Return current identity and linked profile                        |

## Public endpoints

| Method | Endpoint              | Parameters/purpose                                             |
| ------ | --------------------- | -------------------------------------------------------------- |
| GET    | `/health`             | Service status                                                 |
| GET    | `/home`               | Database statistics and featured content                       |
| GET    | `/areas`              | Areas and relationship counts                                  |
| GET    | `/researchers`        | `q`, `area`, `page`, `limit`                                   |
| GET    | `/researchers/:slug`  | Full researcher profile                                        |
| GET    | `/projects`           | `q`, `status`, `page`, `limit`                                 |
| GET    | `/projects/:slug`     | Full project and relationships                                 |
| GET    | `/publications`       | `q`, `author`, `area`, `year`, `type`, `sort`, `page`, `limit` |
| GET    | `/publications/:slug` | Full publication                                               |
| GET    | `/content/events`     | Published events                                               |
| GET    | `/content/news`       | Published news                                                 |
| GET    | `/content/resources`  | Published resources                                            |
| GET    | `/search?q=...`       | Grouped cross-entity results                                   |
| POST   | `/contact`            | Store `{name,email,subject,message}`                           |
| POST   | `/ai/ask`             | Answer `{question,sessionId}` with `{answer,sources,mode}`     |

Paginated responses use `{ "items": [], "meta": { "page": 1, "limit": 9, "total": 0, "pages": 0 } }`.

## Validation and errors

Validation failures return HTTP `422` with a readable summary and field-specific messages. The frontend displays the summary as a toast and places the field message beside the affected control.

```json
{
  "message": "Password: At least one uppercase letter is required",
  "errors": {
    "password": ["At least one uppercase letter is required"]
  }
}
```

Other standard responses include `401` for an invalid or expired session, `403` for insufficient permissions, `404` for missing records, and `409` for duplicate or referenced records. Unexpected internal errors never expose stack traces or database details.

## Researcher endpoints

`GET /researcher/me` returns the JWT-linked profile, projects, and publications. `PUT /researcher/me` updates allowed profile fields. `PUT /researcher/publications/:id` updates selected publication fields only after confirming the current researcher is an author.

## Administrator endpoints

Every `/admin` route requires the `ADMIN` role at the backend. `GET /admin/stats` returns dashboard counts. `GET /admin/:entity` lists users, researchers, areas, projects, publications, events, news, resources, or messages. `POST` and `PUT` routes manage users, areas, researchers, projects, publications, events, news, and resources. Relationship payloads use `areaIds`, `researcherIds`, and ordered `authorIds`. `PUT /admin/messages/:id` updates message status. `DELETE /admin/:entity/:id` removes supported records; users are deactivated rather than deleted.

```json
{
  "question": "Who works on cybersecurity?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Publication document endpoints

See [complete document endpoint contracts and examples](PUBLICATION_DOCUMENTS.md#api-contracts) for upload/status/retry, researcher draft creation/edit/submission, administrator review/publish/return/archive, PDF streaming, detail-level summaries, and document questions. Public publication routes return only PUBLISHED records. Authors can manage only their own drafts, and public analysis is unavailable for metadata-only records.
