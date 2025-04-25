# SOP Maker

A web application for creating and managing Standard Operating Procedures (SOPs) with rich media support and AI-powered content generation.

## Features

- 📝 Create step-by-step SOPs with detailed instructions
- 🖼️ Attach photos and videos to each step
- 🤖 Generate instructions using OpenAI GPT-4
- 🔒 Secure authentication with Firebase
- 📱 Responsive design with Tailwind CSS
- 🔄 Real-time updates with Supabase
- 📤 Export SOPs as printable documents

## Tech Stack

- **Frontend**: React.js + Next.js 15.x (App Router)
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication
- **Database**: PostgreSQL (hosted on Supabase)
- **Media Storage**: Supabase Storage (with AWS S3 as optional alternative)
- **AI Integration**: OpenAI GPT-4 API
- **Deployment**: Vercel
- **Testing**: Jest (unit/API tests), Cypress (E2E tests)

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Continuous Deployment. The workflow includes:

1. **Testing**: Runs linting and unit tests on every push and pull request
2. **Cypress E2E Testing**: Runs end-to-end tests on pull requests
3. **Deployment**: Automatically deploys to Vercel on merges to main branch

### Setting Up CI/CD

To set up the complete CI/CD pipeline with one command:

1. Install required tools:
   ```bash
   # Install GitHub CLI
   brew install gh  # macOS
   
   # Install Vercel CLI
   npm install -g vercel
   ```

2. Run the combined setup script:
   ```bash
   ./scripts/setup-cicd.sh
   ```

3. The script will:
   - Create a GitHub repository for your project
   - Configure all necessary GitHub secrets for CI/CD
   - Link your project to Vercel
   - Set up environment variables in Vercel
   - Configure deployment from GitHub to Vercel

### Manual Setup Options

You can also run the individual setup scripts separately:

1. For GitHub setup only:
   ```bash
   ./scripts/setup-github.sh
   ```

2. For Vercel setup only:
   ```bash
   ./scripts/setup-vercel.sh
   ```

### Environment Variables

The following environment variables are used in the CI/CD pipeline and should be set as GitHub secrets:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Firebase:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`

**OpenAI:**
- `OPENAI_API_KEY`

**App Configuration:**
- `NEXT_PUBLIC_APP_URL`

**Vercel Deployment:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account for PostgreSQL database and storage
- Firebase project for authentication
- OpenAI API key for AI-powered content generation

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sop_maker.git
   cd sop_maker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env.local` file:
   ```
   # Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # OpenAI API key
   OPENAI_API_KEY=your-openai-api-key

   # Firebase credentials
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Optional - AWS S3 credentials (if not using Supabase Storage)
   # AWS_ACCESS_KEY_ID=your-aws-access-key-id
   # AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   # AWS_REGION=us-west-1
   # AWS_S3_BUCKET=your-s3-bucket-name
   ```

4. Set up the database by running the SQL queries found in `database-schema.sql` in your Supabase SQL editor.

5. Create a 'media' bucket in your Supabase storage:
   - Go to your Supabase dashboard
   - Navigate to Storage > Buckets
   - Click "Create Bucket"
   - Name it "media" and set it to public
   - Set the RLS policies to allow authenticated users to upload and read files

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

You need to set up the following tables in your Supabase project:

- `users`: Store user information
- `sops`: Store SOP metadata
- `steps`: Store individual steps for each SOP
- `media`: Store references to uploaded media files

See the `database-schema.sql` file for the complete schema.

## Testing

### Unit Tests

Run unit tests with Jest:

```bash
npm test
```

### End-to-End Tests

Run Cypress E2E tests:

```bash
npm run test:e2e
```

Run Cypress in headless mode:

```bash
npm run test:e2e:headless
```

## Deployment

This project is designed to be deployed on Vercel. Push to the main branch to trigger a deployment via GitHub Actions.

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── sop/             # SOP creation and viewing pages
│   ├── components/          # Reusable React components
│   ├── contexts/            # React contexts (Auth)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│       ├── api.ts           # API client functions
│       ├── firebase.ts      # Firebase setup
│       ├── openai.ts        # OpenAI integration
│       ├── storage.ts       # Supabase Storage integration
│       ├── s3.ts            # AWS S3 integration (optional)
│       ├── supabase.ts      # Supabase client
├── cypress/                 # Cypress E2E tests
├── public/                  # Static assets
├── .env.local.example       # Example environment variables
├── database-schema.sql      # SQL schema for Supabase
```

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Push to your branch: `git push origin feature/your-feature-name`
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/)
- [Supabase](https://supabase.io/)
- [OpenAI](https://openai.com/)
- [Vercel](https://vercel.com/)

## Troubleshooting

If you encounter issues with authentication or SOP features, try the following steps:

### Authentication Issues

1. **Check Environment Variables**
   - Make sure all Firebase and Supabase environment variables are properly set in your `.env.local` file
   - Required Firebase variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - Required Supabase variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Use the Auth Diagnostic Page**
   - Visit `/diagnostics/auth` to see the current auth state
   - Check for any error messages in the debug events
   - Verify the authentication provider being used (Firebase or Supabase)

3. **Check Browser Console**
   - Open the browser developer tools to check for authentication errors
   - Look for Firebase initialization errors or Supabase client issues

4. **Test API Authentication**
   - Use the "Test API Access" button on the dashboard to verify API authentication
   - Check for errors in the API response

### SOP Creation Issues

1. **Browser Support**
   - Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
   - Make sure JavaScript is enabled

2. **Authentication**
   - Verify you're authenticated before trying to create SOPs
   - Ensure your user has the correct permissions (admin or editor role)

3. **Firebase Admin SDK**
   - If you encounter Firebase Admin errors, check the service account configuration
   - Verify that the Firebase Admin SDK is properly initialized

4. **SOP API Endpoints**
   - Test the `/api/sops` endpoint directly to see if it returns proper responses
   - Check for CORS or network issues in the browser developer tools

### Server Restart

If you're still having issues, try:

1. Stopping your development server
2. Clearing the `.next` directory: `rm -rf .next`
3. Reinstalling dependencies: `npm install`
4. Restarting the server: `npm run dev`

### Known Issues

- The `/sop` route may show a 404 error if the SOP index page is not properly configured
- Firebase Admin initialization errors can occur if the service account credentials are not properly set
- Firebase and Supabase authentication synchronization may have delays

For more detailed diagnostics, visit the `/auth-test` page which provides detailed information about the authentication state.

## Authentication Setup

The application supports two authentication methods:

1. **Primary: Supabase Authentication** - For most users, this is the recommended choice.
2. **Legacy: Firebase Authentication** - For backward compatibility.

### Using Supabase-only Authentication

If you're experiencing issues with Firebase environment variables or prefer to use only Supabase authentication:

1. Import the Supabase-only authentication utility:

```typescript
import { useSupabaseAuth } from '@/utils/supabase-auth';
```

2. Use the hook in your component:

```typescript
const { user, loading, getToken, signInWithSupabase } = useSupabaseAuth();
```

This hook provides the same interface as the regular authentication hooks but doesn't depend on Firebase variables.

### Diagnosing Authentication Issues

To check if your components are trying to access Firebase environment variables, visit:

```
/diagnostics/firebase-check
```

This page shows which parts of the codebase are trying to access Firebase variables and allows you to test components that might have issues.
