## QNAP QTS API Integration (v5+)

### Overview

This module integrates with the QNAP QTS File Station API (v5.x). The implementation deviates from standard REST patterns due to the legacy CGI nature of QNAP's architecture.

### 1. Authentication Strategy (`authLogin.cgi`)

We migrated from the legacy `wfm2Login.cgi` to the system-level `authLogin.cgi` supported in QTS v5.1.

- **Endpoint:** `/cgi-bin/authLogin.cgi`
- **Why XML?** Unlike the File Station API which returns JSON, the Authentication API returns **XML**.
- **Implementation:** We use `fast-xml-parser` to handle the response.
- **Success Criteria:** We check `authPassed === 1`. The actual session token is returned in the `<authSid>` tag.
- **Password Encoding:** Passwords must be encoded using the `ezEncode` method: `encodeURIComponent(Base64(password))`.

### 2. Query Parameter Serialization (Critical)

QNAP's CGI scripts do **not** support standard array serialization (e.g., `key[]=value`). They strictly require **duplicate keys** for array inputs.

- **The Rule:** To pass multiple files (e.g., for `move`, `copy`, or `delete`), keys must be repeated.
    - _Correct:_ `source_file=file1.txt&source_file=file2.txt`
    - _Incorrect:_ `source_file[]=file1.txt&source_file[]=file2.txt`
- **Source Evidence:** The API documentation explicitly shows repeated keys in examples (e.g., `source_file=txt.txt&source_file=1.jpg`).
- **Implementation:** We use a custom `paramsSerializer` in Axios to force this behavior, as standard libraries usually default to bracket notation.

#### Consolidated serializer and `pwd` preservation (v2)

- **Centralized Serializer:** The `QnapService` now centralizes query parameter serialization on the `AxiosInstance` created in the constructor. This ensures a single source of truth for query encoding across all API calls, and ensures spaces are encoded as `%20` (not `+`).
- **Why it changed:** Previously, the service converted parameters into `URLSearchParams` (or relied on axios defaults), which resulted in `+` for spaces. QNAP's CGI expects `%20` for paths containing spaces; receiving `+` resulted in "File or folder not found" errors when folder names include spaces (e.g., `/Production/ALL EXAM`).
- **Implementation detail:** `buildParamsWithSid()` now returns a plain params object (`{...params, sid}`) and the Axios `paramsSerializer` is used to convert it into a query string. This allows arrays to still be serialized as repeated keys (e.g., `file=a&file=b`) while keeping consistent encoding.
- **Password preservation:** The login endpoint requires a pre-encoded `pwd` param (we call `ezEncode` before sending). To avoid double encoding we explicitly **preserve** the `pwd` key in the serializer used for login. The `login()` call still overrides the default `paramsSerializer` to ensure `pwd` is never encoded twice.
- **Safer default behavior:** The centralized serializer will automatically preserve `pwd` if it is present in parameters for any request to avoid accidental double-encoding if `pwd` is passed elsewhere in the future. We recommend _only_ passing pre-encoded `pwd` to the login endpoint.

Example:

- Expected (good): `path=%2FProduction%2FALL%20EXAM`
- Bad: `path=%2FProduction%2FALL+EXAM`

If you need to override serializer specifics for a call, prefer overriding at the call-site only when unavoidable (e.g., login keeps its serializer to preserve `pwd`).

### 3. File Operations Nuances

#### Listing Files (`get_list`)

- **Performance Hack (`v=1`):**
    - We default to sending `v=1` in the query parameters.
    - **Why:** In QTS v5, this flag disables the resolution of UIDs/GIDs to usernames/groupnames. Without this, listing folders with many files is significantly slower due to system lookups.
- **Hidden Files:** The API defaults to hiding system files. We explicitly set `hidden_file=0` (or `1`) to control visibility.

#### Deleting Files (`delete`)

- **Permanent Deletion (`force=1`):**
    - By default, QNAP moves deleted files to the `@Recycle` bin.
    - **Why we use force:** To support a true "delete" operation that skips the recycle bin, we interpret the `force: true` option to send `force=1` to the API.

#### Moving & Copying

- **Overwrite Logic:**
    - We map our `mode` enum to QNAP's integers:
        - `0`: Overwrite
        - `1`: Skip (Default)
        - `2`: Auto-rename (e.g., `file(1).txt`).

### 4. Error Handling

QNAP does not use standard HTTP status codes (e.g., 401, 403, 404) for application errors. The API almost always returns HTTP 200, with an internal `status` field in the body.

**Critical Status Mapping:**

- **Status `1`:** Success.
- **Status `3`:** Session Expired / Auth Failure.
    - _Action:_ The service automatically catches status `3`, clears the session, re-logs in, and retries the original request.
- **Status `4`:** Permission Denied.
- **Status `25`:** File Locked (often occurs if file is open in another process).

### 5. Session Persistence

- **Single Session Enforcement:** The `QnapSessionStore` is designed to maintain a singleton session ID.
- **Reasoning:** QNAP has limits on concurrent logins. Reusing the `authSid` prevents hitting connection limits and reduces the overhead of re-authenticating for every request.
