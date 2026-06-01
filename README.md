# Berber Wedding Invitation

Wedding invitation site with RSVP admin dashboard.

## Local development

**Stack:** PHP + PostgreSQL (no XAMPP / MySQL required)

```powershell
# 1. Configure database (see rsvp/POSTGRES_SETUP.md)
copy .env.example .env

# 2. Schema + admin user
php rsvp/apply-schema.php
php rsvp/create-admin.php

# 3. Start server
.\start-dev.ps1
```

Open http://localhost:3000/ — admin at http://localhost:3000/rsvp/admin.php

Full guide: [rsvp/POSTGRES_SETUP.md](rsvp/POSTGRES_SETUP.md)
