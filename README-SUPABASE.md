# Supabase Integration with Next.js

This project uses Supabase as the backend database and authentication provider, following the latest best practices for Next.js App Router.

## Setup

1. Make sure you have the following environment variables in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

2. Install the required packages:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

## Clients

This project uses separate Supabase clients for different contexts:

### Client-side

For client components, use the browser client:

```jsx
'use client';

import { supabase } from '@/utils/supabase';

// Now use supabase in your component
const { data } = await supabase.from('table').select('*');
```

### Server Components

For server components, use the server client:

```jsx
import { createClient } from '@/utils/supabase/server';

export default async function ServerComponent() {
  const supabase = await createClient();
  const { data } = await supabase.from('table').select('*');
  
  return <div>{/* Render your data */}</div>;
}
```

### API Routes

For API routes, use the admin client when needed:

```jsx
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createAdminClient();
  // This bypasses RLS policies
  const { data } = await supabase.from('table').select('*');
  
  return Response.json({ data });
}
```

## Authentication

Authentication is handled using middleware:

1. The `middleware.ts` file protects routes that require authentication
2. The `updateSession` function in `utils/supabase/middleware.ts` refreshes the session
3. Protected routes redirect to the signin page if the user is not authenticated

## Data Fetching

### Server Components

```jsx
// In a Server Component (RSC)
const { data: sops } = await supabase
  .from('sops')
  .select('id, title, description')
  .order('created_at', { ascending: false });
```

### Client Components

```jsx
// In a Client Component
const [data, setData] = useState(null);

useEffect(() => {
  async function fetchData() {
    const { data } = await supabase
      .from('table')
      .select('*');
    setData(data);
  }
  fetchData();
}, []);
```

## Best Practices

1. **Use Server Components** for initial data loading when possible
2. **Cache properly** with Next.js caching mechanisms
3. **Use middleware** for protected routes
4. **Type your data** using the generated types from Supabase
5. **Keep sensitive operations** on the server side

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app) 