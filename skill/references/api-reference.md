# FlowCV API Reference

Base URL: `https://app.flowcv.com`
Auth: Cookie-based (`flowcvsidapp` session cookie)

## Endpoints

### Auth & Account
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/init_user` | Get user profile, active plans, AI credits |
| GET | `/api/users/fetch_subscription_infos` | Subscription details and billing |

### Resumes
| Method | Endpoint | Body/Params | Description |
|--------|----------|-------------|-------------|
| GET | `/api/resumes/all` | - | List all resumes |
| GET | `/api/resumes/{id}` | - | Get full resume data |
| POST | `/api/resumes/create` | `{clientResume: {title}}` | Create resume |
| POST | `/api/resumes/duplicate` | `{duplicateId}` | Duplicate resume |
| PATCH | `/api/resumes/rename_resume` | `{resumeId, resumeTitle}` | Rename resume |
| DELETE | `/api/resumes/delete_resume` | `?resumeId=` | Delete resume |
| POST | `/api/resumes/download` | `{resumeId}` | Download PDF |
| POST | `/api/resumes/translate` | `{resumeId, targetLng}` | Translate resume |

### Personal Details
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| PATCH | `/api/resumes/save_personal_details` | `{resumeId, personalDetails}` | Update personal info |

**personalDetails fields:**
- `fullName`, `jobTitle`, `displayEmail`, `phone`, `address`, `website`, `websiteLink`
- `usAddress` (boolean) - US-style address format
- `detailsOrder` - Array of field keys defining display order
- `social` - Object: `{github: {link, display}, linkedIn: {link, display}, twitter: ...}`
- `photo` - Object: `{shape, imageId, xPct, yPct, widthPct, heightPct}` — **Note:** photo `shape` is set here (valid: `"round"`, `"square"`, `"squareRounded"`, `"portrait"`, `"portraitRounded"`), not via customization

### Section Entries
| Method | Endpoint | Body/Params | Description |
|--------|----------|-------------|-------------|
| PATCH | `/api/resumes/save_entry` | `{resumeId, sectionId, ...entry}` | Create/update entry |
| DELETE | `/api/resumes/delete_entry` | `?resumeId=&sectionId=&entryId=` | Delete entry |
| PATCH | `/api/resumes/save_entries_order` | `{resumeId, sectionId, newEntriesIdsOrder}` | Reorder entries |

**Entry fields by section type:**

| Section | Fields |
|---------|--------|
| `profile` | `id, text` |
| `education` | `id, degree, school, schoolLink, location, startDateNew, endDateNew, description` |
| `experience` (custom) | `id, title, titleLink, subTitle, location, startDateNew, endDateNew, description` |
| `skill` | `id, skill, level, infoHtml` |
| `project` | `id, projectTitle, projectTitleLink, subTitle, startDateNew, endDateNew, description` |
| `award` | `id, awardTitle, awardTitleLink, issuer, date:{year,month}, description` |
| `language` | `id, language, level, infoHtml` |
| `interest` | `id, interest, interestLink, infoHtml` |
| `reference` | `id, name, nameLink, jobTitle, organisation, email, phone` |
| `custom/custom2/3/4` | `id, title, titleLink, subTitle, location, startDateNew, endDateNew, description` |
| `customSkill1/2` | `id, skill, level, infoHtml` |
| `certificate` | `id, certificate, certificateLink, infoHtml` |
| `declaration` | `id, fullName, place, date, declarationText, signatureDataUrl` |

**Date format (startDateNew/endDateNew):**
```json
{"year": "2024", "month": "6", "day": "15", "hideDay": true, "hideMonth": false, "present": false}
```

**Description format (HTML):**
```html
<p>Text content</p>
<ul><li>Bullet point</li></ul>
<strong>Bold</strong>, <em>Italic</em>, <a href="url">Link</a>
```

### Section Management
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| PATCH | `/api/resumes/save_section_name` | `{resumeId, sectionId, displayName}` |
| PATCH | `/api/resumes/save_section_icon` | `{resumeId, sectionId, iconKey}` |
| PATCH | `/api/resumes/update_section_type` | `{resumeId, sectionId, sectionType}` |

**Valid section types for `update_section_type`:** `custom`, `experience`, `certificate`, `declaration`, `course`, `organisation`, `publication`
| DELETE | `/api/resumes/delete_section` | `?resumeId=&sectionId=` |

**Icon keys:** award, book, briefcase, code, education, flag, globe, heart, language, mail, map, phone, project, reference, skill, star, user, wrench

### Customization
| Method | Endpoint | Body |
|--------|----------|------|
| PATCH | `/api/resumes/save_customization` | `{resumeId, customizationUpdates: [{path, value}]}` |
| PATCH | `/api/resumes/save_all_customizations` | `{resumeId, allCustomizations: {...}}` |

### Templates
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/api/resume-templates/get-template` | `?templateId=` |
| GET | `/api/resume-templates/get-user-templates` | - |
| PATCH | `/api/resumes/apply_template` | `{resumeId, templateId, customization, content, ...}` |
| POST | `/api/resume-templates/share_template` | `{resumeId, replaceContent}` |
| POST | `/api/resume-templates/unshare_template` | `{resumeId}` |

### Publishing
| Method | Endpoint | Body |
|--------|----------|------|
| PATCH | `/api/resumes/publish_web_resume` | `{resumeId, publish}` |
| PATCH | `/api/resumes/enable_web_resume_download_btn` | `{resumeId, enable}` |

### Language & Tags
| Method | Endpoint | Body |
|--------|----------|------|
| PATCH | `/api/resumes/save_language` | `{resumeId, lng}` |
| PATCH | `/api/resumes/save_tags` | `{resumeId, tags: [{id, name, hexColor}]}` |

### Cover Letters
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/api/letters/all` | - |
| GET | `/api/letters/{id}` | - |
| POST | `/api/letters/create` | `{clientLetter: {title}}` |
| POST | `/api/letters/save_body` | `{letterId, body}` |
| POST | `/api/letters/save_recipient` | `{letterId, recipient: {hrName, company, address}}` |
| POST | `/api/letters/save_date` | `{letterId, date: {mode, custom}}` |
| PATCH | `/api/letters/save_personal_details` | `{letterId, personalDetails}` |
| POST | `/api/letters/save-design` | `{letterId, design}` — also accepts `syncWithResumeId` at top level |
| POST | `/api/letters/duplicate` | `{duplicateId}` |
| DELETE | `/api/letters/delete_letter` | `?letterId=` |
| POST | `/api/letters/download` | `{letterId}` |

### Job Tracker
| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/trackers/all` | - |
| POST | `/api/trackers/save_card` | `{trackerId, card}` |
| POST | `/api/trackers/save_columns` | `{trackerId, columns}` |

### Unsplash
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/api/unsplash/search` | `?query=` |
| PATCH | `/api/resumes/save_unsplash_image` | `{resumeId, unsplashImage}` |

### AI Features
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/resumes/fill-resume-with-ai` | `{prompt, clientResume, resumeId}` |
| POST | `/api/ai/skills/suggest` | `{resumeId}` |
| POST | `/api/ai/tools/grammar` | `{resumeId}` |

## Language Codes

Common: `en`, `en_US`, `de`, `fr`, `es`, `pt`, `it`, `nl`, `pl`, `sv`, `da`, `fi`, `nb`, `ja`, `ko`, `zh`, `ar`, `he`, `tr`, `ru`

## Free Plan Limits

- Max 2 resumes
- Limited templates
- No AI credits
- FlowCV watermark on downloads
