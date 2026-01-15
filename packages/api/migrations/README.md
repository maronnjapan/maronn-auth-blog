# Database Migrations

## Running migrations

```bash
# Create D1 database (local)
wrangler d1 create maronn-auth-blog-db

# Apply migrations (local)
wrangler d1 migrations apply maronn-auth-blog-db --local

# Apply migrations (production)
wrangler d1 migrations apply maronn-auth-blog-db
```

## Migration files

- `0001_init.sql` - Initial database schema
