
# Implementation Specification — Self-Hosted Cloudflare Hosting Panel

## 1. Project Overview

Build a self-hosted web hosting control panel that runs on a single Linux server and integrates with Cloudflare through its REST API.

The panel is intended to provide multi-account static website hosting.

The main concept:

```text
                    Internet
                       |
                       v
                +--------------+
                |  Cloudflare  |
                | DNS + Tunnel |
                +------+-------+
                       |
                Cloudflare Tunnel
                       |
                       v
              +-------------------+
              |    Hosting VM     |
              |                   |
              |  +-------------+  |
              |  |    Panel    |  |
              |  | Laravel API |  |
              |  +------+------+  |
              |         |         |
              |         v         |
              |      Nginx        |
              |         |         |
              |    +----+----+    |
              |    |    |    |    |
              |   Web1 Web2 Web3  |
              +-------------------+
```

The system must support:

* Admin accounts
* Multiple normal users
* User isolation
* Static website deployment
* ZIP upload deployment
* Website management
* DNS record management
* Cloudflare Tunnel integration
* Cloudflare DNS integration
* Resource usage tracking
* Storage quotas
* Website quotas
* Audit logging
* Installation through a single `.sh` installer
* Uninstallation
* Upgrade/update mechanism
* Service management through systemd

The application must be designed so that users never receive Cloudflare credentials.

---

# 2. Primary Requirements

## 2.1 Admin

Admin can:

* Create users
* Delete users
* Suspend users
* Activate users
* Set user quotas
* View all websites
* View resource usage
* View server resource usage
* Manage allowed domains
* Configure Cloudflare
* Configure the Cloudflare Tunnel
* View audit logs
* Manage panel settings

## 2.2 Normal User

Normal users can:

* Login
* View dashboard
* Create websites
* Delete websites
* Deploy static websites
* Upload ZIP files
* View deployment status
* View website storage usage
* Add DNS records
* Edit DNS records
* Delete DNS records
* View their own DNS records

Normal users MUST NOT be able to:

* Access Cloudflare API tokens
* Access Cloudflare account credentials
* Access another user's files
* Access another user's websites
* Modify global Nginx configuration
* Modify the server
* Execute arbitrary shell commands
* Access SSH
* Manage the Cloudflare Tunnel directly
* Manage Cloudflare zones outside the domains allowed by admin

---

# 3. Supported Domain Model

The panel uses Cloudflare zones configured by the administrator.

Example Cloudflare account:

```text
example.com
example.net
myschool.id
```

The panel synchronizes the available zones.

Users can only select domains from this list.

Example:

```text
Create Website

Website Name:
my-blog

Domain:
example.com

Subdomain:
blog
```

The resulting hostname:

```text
blog.example.com
```

Users must not be able to register arbitrary external domains.

---

# 4. Cloudflare Architecture

Use one Cloudflare Tunnel for the hosting server.

Do NOT create a separate Tunnel for every website in the initial implementation.

Architecture:

```text
Cloudflare
    |
    v
hosting-tunnel
    |
    v
127.0.0.1:80
    |
    v
Nginx
    |
    +--> website 1
    +--> website 2
    +--> website 3
```

Nginx determines the destination based on the HTTP Host header.

Example:

```text
blog.example.com
        |
        v
Cloudflare
        |
        v
Tunnel
        |
        v
Nginx
        |
        v
/srv/panel/websites/1/1/public
```

---

# 5. Technology Stack

Use the following stack unless there is a strong technical reason to change it.

## Backend

* Laravel 11+
* PHP 8.3+
* REST API
* Laravel Sanctum
* Laravel Queue

## Database

Prefer:

* PostgreSQL

Alternative:

* MariaDB

PostgreSQL is preferred.

## Cache / Queue

* Redis

## Web Server

* Nginx

## Cloudflare

* Cloudflare API
* Cloudflare Tunnel
* cloudflared

## Frontend

Prefer:

* React
* TypeScript
* Vite
* Tailwind CSS

The frontend communicates only with the Laravel API.

## Operating System

Primary target:

* Debian 13

The installer should detect the OS.

If the OS is unsupported, terminate with a clear message.

---

# 6. Directory Structure

Use a dedicated system directory.

Recommended:

```text
/opt/cloudpanel/
```

Structure:

```text
/opt/cloudpanel/
├── app/
├── backend/
├── frontend/
├── storage/
├── scripts/
├── backups/
├── logs/
└── .env
```

Website data must NOT be stored inside the application directory.

Use:

```text
/srv/cloudpanel/websites/
```

Structure:

```text
/srv/cloudpanel/websites/
├── 1/
│   ├── 1/
│   │   └── public/
│   └── 2/
│       └── public/
├── 2/
│   └── 3/
│       └── public/
└── ...
```

Where:

```text
/srv/cloudpanel/websites/{user_id}/{website_id}/public/
```

---

# 7. File Ownership and Isolation

Never run uploaded website files as root.

Recommended ownership:

```text
root:cloudpanel
```

or a dedicated service account.

The panel application itself must run under a non-root service account.

Example:

```text
cloudpanel
```

The installer may run as root, but the application runtime must not.

Uploaded files must not be executable by default.

Do not allow uploaded files to become executable server-side scripts.

For static hosting, Nginx must serve files only.

---

# 8. Website Deployment

Initial implementation supports static websites only.

Supported:

```text
HTML
CSS
JavaScript
Images
Fonts
JSON
Static assets
```

Example ZIP:

```text
website.zip

├── index.html
├── css/
├── js/
└── assets/
```

After deployment:

```text
/srv/cloudpanel/websites/1/5/public/
├── index.html
├── css/
├── js/
└── assets/
```

The system must reject dangerous archive contents.

Prevent:

* Path traversal
* `../`
* Absolute paths
* Symlinks escaping the website directory
* Device files
* Executable files when unnecessary

---

# 9. Deployment Flow

When a user creates a website:

```text
User
 |
 | Create website
 v
Laravel API
 |
 +--> Validate quota
 |
 +--> Validate domain
 |
 +--> Create database record
 |
 +--> Create website directory
 |
 +--> Generate Nginx configuration
 |
 +--> Create Cloudflare DNS record
 |
 +--> Queue deployment
 |
 v
Redis
 |
 v
Laravel Worker
 |
 +--> Extract ZIP
 |
 +--> Validate files
 |
 +--> Calculate storage
 |
 +--> Update Nginx
 |
 +--> Reload Nginx
 |
 +--> Verify website
 |
 v
Deployment complete
```

Deployment should use queues.

Do not perform long-running deployment work directly inside the HTTP request.

---

# 10. Nginx Configuration

Each website should have an isolated Nginx server block.

Example:

```nginx
server {
    listen 127.0.0.1:80;
    server_name blog.example.com;

    root /srv/cloudpanel/websites/1/5/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

The panel must generate these configurations automatically.

Store generated configurations in:

```text
/etc/nginx/sites-available/cloudpanel/
```

Enable them through:

```text
/etc/nginx/sites-enabled/
```

Do not let users edit raw Nginx configurations.

Before every reload:

```bash
nginx -t
```

Only reload Nginx if validation succeeds.

---

# 11. Cloudflare DNS Integration

Use Cloudflare API Tokens.

Do not use the Global API Key unless absolutely required.

Required permissions should follow least privilege.

The administrator provides:

```text
Cloudflare API Token
Cloudflare Account ID
```

The backend should validate the credentials.

The token must be encrypted at rest.

Never expose it through:

* API responses
* frontend
* logs
* error messages
* browser storage

---

# 12. Cloudflare API Service

Create a dedicated Laravel service:

```text
app/Services/Cloudflare/
```

Recommended classes:

```text
CloudflareClient.php
CloudflareZoneService.php
CloudflareDnsService.php
CloudflareTunnelService.php
```

Example abstraction:

```php
$cloudflare->dns()->createRecord(...);
$cloudflare->dns()->updateRecord(...);
$cloudflare->dns()->deleteRecord(...);
```

Do not scatter Cloudflare API calls throughout controllers.

Controllers should call service classes.

---

# 13. Cloudflare DNS Workflow

When creating a website:

```text
blog.example.com
```

The backend should create the required DNS configuration.

The preferred architecture is:

```text
blog.example.com
        |
        v
<tunnel-id>.cfargotunnel.com
```

with:

```text
proxied = true
```

The exact Cloudflare Tunnel routing model should be implemented using the current Cloudflare API.

The implementation must not hard-code undocumented API behavior.

---

# 14. Cloudflare Tunnel

The installer must support configuring one Tunnel.

The Tunnel should be installed as a systemd service.

Example:

```text
cloudflared.service
```

The installer should:

1. Install cloudflared
2. Verify installation
3. Authenticate/configure the tunnel
4. Store credentials securely
5. Generate configuration
6. Enable systemd service
7. Start the service
8. Verify connectivity

The panel should be able to display:

```text
Tunnel Status
Connected
Disconnected
Error
```

The panel must not expose tunnel credentials to normal users.

---

# 15. Tunnel Routing

Initial architecture:

```text
Cloudflare Tunnel
        |
        v
127.0.0.1:80
        |
        v
Nginx
```

Do not dynamically create hundreds of cloudflared ingress rules if Nginx can perform hostname routing.

This keeps the Tunnel configuration simple.

---

# 16. DNS Management

Normal users can manage DNS records only for domains they are authorized to use.

Allowed record types initially:

```text
A
AAAA
CNAME
TXT
```

Optional later:

```text
MX
SRV
CAA
NS
```

Be careful with:

```text
NS
MX
CAA
```

because these can affect the entire domain.

Recommended initial policy:

Users can manage only:

```text
A
AAAA
CNAME
TXT
```

Admin controls whether advanced DNS records are enabled.

---

# 17. DNS Security Rules

Users must not be able to:

* Modify Cloudflare nameservers
* Transfer zones
* Change account settings
* Delete zones
* Change global DNS settings
* Access other users' DNS records unless authorized

Every DNS operation must verify:

```text
authenticated user
        |
        v
website/domain ownership
        |
        v
allowed zone
        |
        v
Cloudflare record
```

Never trust IDs supplied by the frontend.

---

# 18. Database Schema

Create migrations for at least:

```text
users
roles
domains
websites
dns_records
deployments
resource_usages
cloudflare_connections
audit_logs
system_settings
```

## users

```text
id
name
email
password
role
status
created_at
updated_at
```

Roles:

```text
admin
user
```

## domains

```text
id
zone_id
domain
status
created_at
updated_at
```

## websites

```text
id
user_id
domain_id
name
hostname
document_root
status
storage_limit
storage_used
created_at
updated_at
```

## dns_records

```text
id
user_id
domain_id
cloudflare_record_id
type
name
content
ttl
proxied
created_at
updated_at
```

## deployments

```text
id
website_id
user_id
filename
status
error_message
storage_used
started_at
completed_at
created_at
updated_at
```

Statuses:

```text
pending
processing
success
failed
cancelled
```

## resource_usages

```text
id
user_id
storage_used
website_count
bandwidth_used
updated_at
```

## audit_logs

```text
id
user_id
action
resource_type
resource_id
ip_address
user_agent
metadata
created_at
```

Never store passwords or API tokens inside audit metadata.

---

# 19. Quota System

Every user must have configurable quotas.

Example:

```text
max_websites
max_storage
max_dns_records
max_upload_size
```

Example:

```text
User A

Websites:
5

Storage:
2 GB

DNS Records:
50

Upload:
100 MB
```

Before creating resources:

```text
Check quota
   |
   +--> allowed
   |
   +--> reject
```

Quota checks must happen server-side.

---

# 20. Resource Monitoring

Admin dashboard should display:

```text
CPU
RAM
Disk
Load Average
Network
```

Per-user:

```text
Website count
Storage usage
DNS record count
Deployment count
```

Initial version does not need CPU/RAM isolation because websites are static.

However, the architecture should allow future container-based resource limits.

---

# 21. Authentication

Use Laravel Sanctum.

Implement:

* Login
* Logout
* Session/token authentication
* Password hashing
* Password reset
* Rate limiting
* Account suspension

Passwords must use Laravel's supported password hashing mechanism.

Never implement custom password hashing.

---

# 22. Authorization

Use Laravel Policies/Gates.

Every resource must verify ownership.

Example:

```php
$user->can('update', $website);
```

Never rely only on frontend restrictions.

Frontend restrictions are for UX only.

Backend authorization is mandatory.

---

# 23. API Structure

Use:

```text
/api/v1/
```

Example:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/me

GET    /api/v1/websites
POST   /api/v1/websites
GET    /api/v1/websites/{id}
DELETE /api/v1/websites/{id}

POST   /api/v1/websites/{id}/deploy

GET    /api/v1/websites/{id}/deployments

GET    /api/v1/domains

GET    /api/v1/dns-records
POST   /api/v1/dns-records
PUT    /api/v1/dns-records/{id}
DELETE /api/v1/dns-records/{id}
```

Admin:

```text
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/{id}
DELETE /api/v1/admin/users/{id}

GET    /api/v1/admin/resource-usage
GET    /api/v1/admin/audit-logs

GET    /api/v1/admin/cloudflare/status
POST   /api/v1/admin/cloudflare/configure

GET    /api/v1/admin/tunnel/status
```

---

# 24. API Error Format

Use consistent JSON:

```json
{
  "success": false,
  "message": "Website quota exceeded",
  "errors": {
    "website": [
      "Maximum number of websites reached."
    ]
  }
}
```

Successful response:

```json
{
  "success": true,
  "data": {}
}
```

---

# 25. Frontend

Dashboard must have separate layouts.

## Admin

```text
Dashboard
Users
Websites
Domains
DNS
Cloudflare
Server
Audit Logs
Settings
```

## User

```text
Dashboard
Websites
Deployments
DNS
Account
```

Users must never see admin navigation.

---

# 26. User Dashboard

Show:

```text
Websites: 3 / 5
Storage: 1.2 GB / 2 GB
DNS Records: 12 / 50
```

Website list:

```text
Name       Domain              Status
-----------------------------------------
Blog       blog.example.com    Online
Portfolio  me.example.com      Online
Docs       docs.example.com    Deploying
```

---

# 27. Deployment UI

User should be able to:

```text
Create Website

Website Name
Domain
Subdomain

Upload ZIP

[ Deploy ]
```

After deployment:

```text
Deployment #123

Status:
Success

Domain:
blog.example.com

Storage:
34 MB

Created:
2026-08-18
```

---

# 28. File Upload Security

Never trust:

```text
filename
MIME type
extension
ZIP structure
```

Validate all uploaded files.

Set maximum upload size.

Reject:

```text
../../etc/passwd
/etc/passwd
symlink -> /etc
device files
```

Use safe extraction logic.

Recommended:

1. Upload to temporary directory
2. Inspect archive
3. Validate every path
4. Reject dangerous entries
5. Extract
6. Calculate storage
7. Move to final directory atomically

---

# 29. Background Jobs

Use Laravel Queue with Redis.

Jobs:

```text
DeployWebsiteJob
DeleteWebsiteJob
CreateCloudflareDnsRecordJob
DeleteCloudflareDnsRecordJob
SyncCloudflareZonesJob
CalculateStorageUsageJob
```

Workers should run under systemd or Supervisor.

Prefer systemd if practical.

Example:

```text
cloudpanel-worker.service
```

---

# 30. Installer Requirement

The project MUST provide:

```text
install.sh
```

The installation experience should be similar to common hosting panels.

Example:

```bash
curl -fsSL https://example.com/install.sh | sudo bash
```

However, for security, documentation should also recommend:

```bash
wget https://example.com/install.sh
chmod +x install.sh
sudo ./install.sh
```

The installer must be idempotent.

Running it twice should not destroy an existing installation.

---

# 31. Installer Behavior

Installer flow:

```text
./install.sh
       |
       v
Check root
       |
       v
Check OS
       |
       v
Check architecture
       |
       v
Check internet
       |
       v
Install dependencies
       |
       v
Install PHP
       |
       v
Install PostgreSQL
       |
       v
Install Redis
       |
       v
Install Nginx
       |
       v
Install cloudflared
       |
       v
Create cloudpanel user
       |
       v
Create directories
       |
       v
Deploy application
       |
       v
Configure .env
       |
       v
Generate APP_KEY
       |
       v
Run migrations
       |
       v
Create admin account
       |
       v
Configure Nginx
       |
       v
Configure systemd
       |
       v
Start services
       |
       v
Health check
       |
       v
Installation complete
```

---

# 32. Installer Arguments

Support non-interactive installation.

Example:

```bash
sudo ./install.sh \
  --domain panel.example.com \
  --admin-email admin@example.com
```

Also support interactive mode:

```bash
sudo ./install.sh
```

Interactive prompts:

```text
CloudPanel Installer

Panel domain:
>

Admin email:
>

Admin password:
>

Database password:
>

Install directory:
[/opt/cloudpanel]

Website directory:
[/srv/cloudpanel/websites]
```

Passwords must not be displayed.

---

# 33. Installer Validation

The installer must check:

```text
OS
Architecture
Root privileges
Disk space
RAM
Internet connectivity
Required ports
Existing Nginx
Existing PostgreSQL
Existing Redis
```

Do not blindly overwrite existing configurations.

If conflicts exist:

```text
WARNING:
Nginx is already installed.

Options:
1. Use existing Nginx
2. Abort
```

The installer should prefer reusing compatible existing services.

---

# 34. Service Files

Create:

```text
cloudpanel.service
cloudpanel-worker.service
cloudpanel-scheduler.service
```

Example architecture:

```text
nginx
php-fpm
postgresql
redis
cloudflared
cloudpanel-worker
cloudpanel-scheduler
```

Use:

```bash
systemctl enable --now service
```

---

# 35. Health Check

Provide:

```bash
cloudpanel doctor
```

or:

```bash
/opt/cloudpanel/scripts/doctor.sh
```

It should verify:

```text
[OK] Nginx
[OK] PHP
[OK] PostgreSQL
[OK] Redis
[OK] Laravel
[OK] Queue worker
[OK] Cloudflared
[OK] Cloudflare API
[OK] Storage permissions
```

Failed checks should provide remediation hints.

---

# 36. CLI Utility

Create:

```bash
cloudpanel
```

Commands:

```text
cloudpanel install
cloudpanel update
cloudpanel uninstall
cloudpanel status
cloudpanel restart
cloudpanel logs
cloudpanel doctor
cloudpanel user:create
cloudpanel user:delete
cloudpanel cache:clear
cloudpanel migrate
```

Example:

```bash
cloudpanel status
```

Output:

```text
CloudPanel Status

Panel       : running
Nginx       : running
PHP-FPM     : running
PostgreSQL  : running
Redis       : running
Worker      : running
Cloudflared : running
```

---

# 37. Update System

Provide:

```bash
cloudpanel update
```

Update process:

```text
Backup
  |
  v
Download new version
  |
  v
Maintenance mode
  |
  v
Update dependencies
  |
  v
Run migrations
  |
  v
Build frontend
  |
  v
Restart workers
  |
  v
Health check
  |
  v
Disable maintenance mode
```

Never automatically destroy user websites during update.

---

# 38. Backup

Provide backup functionality.

Backup:

```text
Database
Panel configuration
Cloudflare configuration metadata
Application configuration
```

Do NOT backup:

```text
Cloudflare API tokens in plaintext
```

Website files may optionally be included.

Command:

```bash
cloudpanel backup
```

Restore:

```bash
cloudpanel restore backup.tar.gz
```

---

# 39. Logging

Application logs:

```text
/opt/cloudpanel/logs/
```

Laravel logs:

```text
storage/logs/
```

System logs:

```bash
journalctl -u cloudpanel
journalctl -u cloudpanel-worker
journalctl -u cloudflared
```

Never log:

```text
passwords
API tokens
session tokens
authorization headers
```

---

# 40. Audit Logging

Record security-sensitive actions.

Examples:

```text
USER_CREATED
USER_SUSPENDED
USER_DELETED

WEBSITE_CREATED
WEBSITE_DELETED
WEBSITE_DEPLOYED

DNS_RECORD_CREATED
DNS_RECORD_UPDATED
DNS_RECORD_DELETED

CLOUDFLARE_CONFIGURED
TUNNEL_UPDATED

LOGIN_SUCCESS
LOGIN_FAILED
```

Admin can view audit logs.

---

# 41. Security Requirements

Mandatory:

* HTTPS for panel
* Secure cookies
* CSRF protection where applicable
* Rate limiting
* Password hashing
* RBAC
* Authorization policies
* Input validation
* Output escaping
* SQL injection protection
* Path traversal protection
* ZIP bomb protection
* Upload size limits
* API token encryption
* Audit logs
* Secure headers
* No secrets in frontend
* No shell command execution from user input

Never use:

```php
shell_exec($request->input('command'));
```

or equivalent behavior.

If system commands are required internally, use predefined commands and strict argument validation.

---

# 42. Cloudflare Token Security

Cloudflare API credentials belong exclusively to the server.

Recommended:

```text
Cloudflare API Token
        |
        v
Encrypted storage
        |
        v
Laravel Cloudflare Service
        |
        v
Cloudflare API
```

Never:

```text
Browser
   |
   v
Cloudflare API Token
```

Use least-privilege Cloudflare API token permissions.

---

# 43. Multi-Tenant Security

Every database query involving user-owned resources must enforce ownership.

Bad:

```php
Website::find($id);
```

Preferred:

```php
auth()->user()
    ->websites()
    ->findOrFail($id);
```

Admin endpoints can explicitly use unrestricted queries.

Do not rely on frontend filtering.

---

# 44. Website Lifecycle

Website states:

```text
creating
deploying
active
suspended
failed
deleting
deleted
```

Example:

```text
Create
  ↓
creating
  ↓
deploying
  ↓
active
```

If deployment fails:

```text
deploying
   ↓
failed
```

---

# 45. Website Deletion

Deletion flow:

```text
User requests deletion
        |
        v
Authorization
        |
        v
Delete DNS record
        |
        v
Disable Nginx config
        |
        v
Remove website files
        |
        v
Delete database record
        |
        v
Audit log
```

Deletion should be queued.

Provide optional soft-delete support.

---

# 46. Cloudflare Synchronization

Admin should be able to synchronize zones:

```text
Sync Cloudflare
```

The panel retrieves available zones and updates:

```text
domains
```

Never assume the local database is always correct.

Provide:

```text
POST /api/v1/admin/cloudflare/sync
```

---

# 47. Cloudflare Failure Handling

Cloudflare API failures must not corrupt local state.

Example:

```text
Create Website
      |
      v
Create local record
      |
      v
Cloudflare API fails
      |
      v
Mark operation failed
```

Use transaction boundaries carefully.

For operations spanning local DB + Cloudflare API, use retryable jobs and explicit state machines.

Do not assume distributed transactions.

---

# 48. Retry Policy

Cloudflare API calls should support retry for transient failures.

Example:

```text
Attempt 1
   ↓
Attempt 2
   ↓
Attempt 3
   ↓
Failed
```

Use exponential backoff.

Do not retry permanent authorization errors indefinitely.

---

# 49. API Rate Limiting

Protect:

```text
login
upload
deployment
DNS creation
DNS deletion
Cloudflare operations
```

from abuse.

Use Laravel rate limiting.

---

# 50. Testing

Implement:

## Unit Tests

Test:

```text
QuotaService
CloudflareService
DnsService
DeploymentService
StorageService
```

## Feature Tests

Test:

```text
Authentication
Authorization
Website creation
Website deployment
DNS management
Admin management
Quota enforcement
```

## Security Tests

Test:

```text
IDOR
Path traversal
ZIP traversal
Unauthorized DNS modification
Unauthorized website access
Privilege escalation
```

## Integration Tests

Cloudflare API integration should be mockable.

Do not require a real Cloudflare account for normal CI tests.

---

# 51. Development Environment

Provide:

```text
docker-compose.yml
```

for local development.

Development services:

```text
Laravel
React/Vite
PostgreSQL
Redis
Nginx
```

Cloudflare API should be configurable through environment variables or mocked during development.

---

# 52. Production Environment

Production should NOT depend on Docker unless explicitly configured.

The primary installer should install native services:

```text
PHP-FPM
PostgreSQL
Redis
Nginx
cloudflared
```

This is intended to behave like a traditional Linux hosting panel.

---

# 53. Configuration

Use `.env`.

Example:

```env
APP_NAME=CloudPanel
APP_ENV=production
APP_DEBUG=false
APP_URL=https://panel.example.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=cloudpanel
DB_USERNAME=cloudpanel
DB_PASSWORD=

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

WEBSITE_ROOT=/srv/cloudpanel/websites
```

Never commit production secrets.

Provide:

```text
.env.example
```

---

# 54. Initial Admin Setup

After installation:

```text
CloudPanel installed successfully.

Panel:
https://panel.example.com

Admin:
admin@example.com
```

Do not print the admin password.

If generated automatically, require password change on first login.

---

# 55. Installer Security

Do not recommend blindly executing remote scripts in production.

Documentation should explain:

```bash
wget https://example.com/install.sh
less install.sh
chmod +x install.sh
sudo ./install.sh
```

The installer should support checksum/version verification for future releases.

---

# 56. Uninstaller

Provide:

```bash
cloudpanel uninstall
```

The uninstaller must ask for confirmation.

Example:

```text
WARNING!

This will remove CloudPanel.

What should happen to hosted websites?

1. Keep website files
2. Delete website files
3. Cancel
```

Never silently delete user data.

---

# 57. Disaster Recovery

The panel must remain recoverable if:

* Laravel crashes
* Nginx crashes
* PostgreSQL crashes
* Redis crashes
* Cloudflare API temporarily fails
* Cloudflared disconnects

Website files should remain independent from application files.

Therefore:

```text
Panel failure
     |
     v
Website files remain
```

---

# 58. Recommended Project Structure

```text
cloudpanel/
├── backend/
│   ├── app/
│   │   ├── Actions/
│   │   ├── Http/
│   │   ├── Jobs/
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Services/
│   │   │   ├── Cloudflare/
│   │   │   ├── Deployment/
│   │   │   ├── Website/
│   │   │   └── Resource/
│   │   └── Console/
│   ├── database/
│   ├── routes/
│   └── tests/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── installer/
│   ├── install.sh
│   ├── uninstall.sh
│   ├── update.sh
│   ├── doctor.sh
│   └── common.sh
│
├── systemd/
│   ├── cloudpanel.service
│   ├── cloudpanel-worker.service
│   └── cloudpanel-scheduler.service
│
├── nginx/
│   └── cloudpanel.conf
│
├── scripts/
│   ├── backup.sh
│   └── restore.sh
│
├── .env.example
├── README.md
└── implementation.md
```

---

# 59. Development Order

Implement in this order.

## Phase 1 — Core

```text
1. Laravel project
2. React frontend
3. PostgreSQL
4. Redis
5. Authentication
6. RBAC
7. User management
```

## Phase 2 — Website

```text
1. Website model
2. Website creation
3. Website storage
4. ZIP upload
5. Secure extraction
6. Nginx configuration generation
7. Deployment jobs
```

## Phase 3 — Cloudflare

```text
1. Cloudflare client
2. API token validation
3. Zone synchronization
4. DNS CRUD
5. Tunnel status
6. Website DNS automation
```

## Phase 4 — Resource Management

```text
1. Storage calculation
2. User quotas
3. Website limits
4. Dashboard statistics
5. Server monitoring
```

## Phase 5 — Production Installer

```text
1. install.sh
2. systemd services
3. Nginx configuration
4. cloudflared installation
5. PostgreSQL setup
6. Redis setup
7. Admin creation
8. Health checks
```

## Phase 6 — Operations

```text
1. cloudpanel CLI
2. backup
3. restore
4. update
5. uninstall
6. doctor
7. audit logs
```

---

# 60. Definition of Done

The implementation is considered complete only when:

* [ ] Admin can login
* [ ] Admin can create users
* [ ] Admin can suspend users
* [ ] Admin can configure quotas
* [ ] User can login
* [ ] User can create website
* [ ] User can upload ZIP
* [ ] Website deploys successfully
* [ ] Website is isolated from other users
* [ ] Nginx configuration is generated automatically
* [ ] Cloudflare zones can be synchronized
* [ ] User can only use allowed Cloudflare domains
* [ ] DNS CRUD works
* [ ] Cloudflare API token is never exposed
* [ ] Cloudflare Tunnel works
* [ ] Website becomes publicly accessible through Tunnel
* [ ] Resource usage is displayed
* [ ] Quotas are enforced
* [ ] Audit logs are recorded
* [ ] Unauthorized resource access is blocked
* [ ] ZIP path traversal is blocked
* [ ] Installer works on supported Debian 13 systems
* [ ] Installer is idempotent
* [ ] systemd services start automatically
* [ ] `cloudpanel doctor` works
* [ ] `cloudpanel update` works
* [ ] `cloudpanel backup` works
* [ ] `cloudpanel uninstall` works without silently deleting data
* [ ] Application has automated tests
* [ ] Production documentation exists

---

# 61. Important Implementation Constraints

The agent implementing this project MUST follow these principles:

1. Do not expose Cloudflare credentials to users.
2. Do not trust frontend authorization.
3. Do not execute arbitrary shell commands from user input.
4. Do not run user websites as root.
5. Do not allow uploaded ZIP files to escape their assigned directory.
6. Do not use the host root filesystem as user storage.
7. Do not allow users to modify global Nginx configuration.
8. Do not allow users to access other users' resources.
9. Do not create one Cloudflare Tunnel per website in the initial version.
10. Prefer one Tunnel + Nginx hostname routing.
11. Use queues for long-running operations.
12. Use database transactions where appropriate.
13. Treat Cloudflare API operations as external side effects and implement retry/error handling.
14. Never log secrets.
15. Never silently delete user data.
16. Keep website data independent from application data.
17. Installer must be safe to run more than once.
18. The production installer must support Debian 13.
19. All security-sensitive operations must be auditable.
20. All Cloudflare API operations must go through a dedicated service layer.

---

# 62. Expected Final User Experience

After installation:

```text
https://panel.example.com
```

Admin logs in:

```text
Dashboard
    |
    +-- Users
    +-- Domains
    +-- Websites
    +-- Cloudflare
    +-- Server
    +-- Audit Logs
```

Admin creates:

```text
User:
john@example.com

Websites:
5

Storage:
2 GB

DNS:
50 records
```

John logs in:

```text
Dashboard
    |
    +-- Websites
    +-- DNS
```

John creates:

```text
Website:
portfolio

Domain:
example.com

Subdomain:
john
```

Uploads:

```text
portfolio.zip
```

Panel automatically:

```text
Validate quota
      ↓
Create website directory
      ↓
Extract ZIP safely
      ↓
Generate Nginx config
      ↓
Create Cloudflare DNS record
      ↓
Reload Nginx
      ↓
Verify website
```

Result:

```text
https://john.example.com
```

No Cloudflare account is required for John.

No Cloudflare API token is exposed to John.

---

# 63. Final Architecture

The final architecture should be:

```text
                         INTERNET
                             |
                             v
                    +----------------+
                    |   CLOUDFLARE   |
                    |                |
                    | DNS            |
                    | Proxy          |
                    | Tunnel         |
                    +-------+--------+
                            |
                       CF Tunnel
                            |
                            v
                 +----------------------+
                 |      SERVER          |
                 |                      |
                 |  +----------------+  |
                 |  |    NGINX       |  |
                 |  +-------+--------+  |
                 |          |           |
                 |     Host routing    |
                 |          |           |
                 |   +------+------+   |
                 |   |      |      |   |
                 |   v      v      v   |
                 | Web A  Web B  Web C |
                 |                      |
                 |  +----------------+  |
                 |  | Laravel Panel  |  |
                 |  +-------+--------+  |
                 |          |           |
                 |     +----+----+      |
                 |     |         |      |
                 |     v         v      |
                 | PostgreSQL   Redis   |
                 |                      |
                 |  cloudflared         |
                 +----------------------+
```

The panel is the **control plane**.

Cloudflare is the **public network/DNS layer**.

Nginx is the **web routing layer**.

The filesystem is the **static hosting layer**.

PostgreSQL is the **state/database layer**.

Redis is the **queue/cache layer**.

This separation should be maintained throughout the implementation.
