# Supabase Security Guide for SOP Maker

This document outlines security best practices for the Supabase database used in the SOP Maker application, including Row Level Security (RLS) policies and function security.

## Overview

The SOP Maker application uses Supabase as its backend database and Firebase for authentication. Security measures have been implemented to ensure data integrity and prevent unauthorized access.

## Row Level Security (RLS)

### What is Row Level Security?

Row Level Security (RLS) is a feature in PostgreSQL that restricts which rows a user can access within a table. RLS ensures that users can only access rows they are authorized to see, regardless of their access to the table.

### Why is RLS Important?

Without RLS, any user with access to a table can access all rows in that table. This is a significant security risk, especially in multi-tenant applications like SOP Maker where different users should only see their own data.

### RLS Implementation in SOP Maker

The following tables are protected by RLS:

1. `users` - Stores user information
2. `sops` - Stores SOP documents
3. `steps` - Stores individual steps in SOPs
4. `media` - Stores media attachments for SOP steps
5. `app_metadata` - Stores application-specific metadata
6. `firebase_user_mapping` - Maps Firebase UIDs to Supabase UUIDs

Each table has specific policies to control access:

#### User Data Policies

```sql
-- Users can read/update their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

#### SOP Policies

```sql
-- SOPs can be viewed by their creators or if published
CREATE POLICY "Users can view own SOPs" ON public.sops
  FOR SELECT USING (auth.uid() = created_by OR is_published = true);

-- Only creators can update their SOPs
CREATE POLICY "Users can update own SOPs" ON public.sops
  FOR UPDATE USING (auth.uid() = created_by);
```

## Function Security

### Function Search Path Security

PostgreSQL functions that don't have an explicit search path set can be vulnerable to SQL injection attacks. In SOP Maker, all functions have their search path explicitly set to the `public` schema to prevent this type of attack.

```sql
ALTER FUNCTION public.exec_sql(query text) 
SET search_path = public;
```

### Functions Protected:

- `exec_sql` - Executes SQL queries
- `function_exists` - Checks if a function exists
- `get_user_id_from_auth` - Gets the user ID from the auth context
- `get_current_user_id` - Gets the current user ID
- `admin_create_storage_bucket` - Creates a storage bucket
- `get_service_role_bucket_policy` - Gets a bucket policy for the service role

## Authentication Integration

The application uses a dual authentication system with Firebase and Supabase. This integration includes:

1. **Token Exchange**: Firebase tokens are exchanged for Supabase sessions
2. **User Mapping**: Firebase users are mapped to Supabase users
3. **Middleware Checks**: Authentication state is verified in the middleware

## Security Management

The application includes an admin interface at `/admin/security` for managing security settings, including:

1. Enabling RLS on tables that don't have it enabled
2. Creating appropriate RLS policies
3. Fixing function search path vulnerabilities

## Best Practices for Development

When developing new features for SOP Maker, follow these security practices:

1. **Always Enable RLS**: New tables should have RLS enabled by default
2. **Create Appropriate Policies**: Each table needs policies for SELECT, INSERT, UPDATE, and DELETE operations
3. **Set Function Search Paths**: All new functions should have their search path explicitly set
4. **Use the Service Role Sparingly**: Only use the service role when necessary
5. **Verify Permissions**: Test that users can only access their own data

## Security Checks

To check if your database is secure:

1. Use the Supabase Security Advisor in the dashboard
2. Run the security admin page at `/admin/security`
3. Verify that all tables have RLS enabled
4. Verify that all functions have their search path set

## Troubleshooting

If you encounter permission errors:

1. Check if the table has RLS enabled
2. Verify that appropriate policies exist for the table
3. Check if the user has the correct role
4. Verify that the user is authenticated

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/managing-user-data)
- [Firebase-Supabase Integration Documentation](./AUTHENTICATION.md) 