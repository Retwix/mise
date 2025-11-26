# Authentication Setup

This project uses Supabase for authentication with magic link (passwordless) login.

## Architecture

### Files Structure

```
src/
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── hooks/
│   ├── useAuth.ts               # Main authentication hook
│   ├── useMagicLink.ts          # Magic link verification hook
│   └── useLogin.ts              # Login form logic hook
├── pages/
│   └── Login/
│       ├── Login.tsx            # Main login page component
│       ├── LoginForm.tsx        # Login form component
│       ├── VerifyingState.tsx   # Magic link verification UI
│       ├── AuthError.tsx        # Error state UI
│       └── AuthSuccess.tsx      # Success state UI
└── init/
    └── PrivateRoutesWrapper.tsx # Protected routes wrapper
```

### How It Works

1. **Supabase Client** (`src/lib/supabase.ts`)
   - Initializes the Supabase client with environment variables
   - Shared across the application

2. **useAuth Hook** (`src/hooks/useAuth.ts`)
   - Manages authentication state (session, user, loading)
   - Listens for auth state changes
   - Provides `signOut` function
   - Used in protected routes and navbar

3. **useMagicLink Hook** (`src/hooks/useMagicLink.ts`)
   - Handles magic link verification from URL parameters
   - Manages verification states (verifying, error, success)
   - Automatically verifies token when user clicks magic link

4. **useLogin Hook** (`src/hooks/useLogin.ts`)
   - Handles login form state and submission
   - Sends magic link to user's email
   - Manages loading, error, and success states

5. **Login Page** (`src/pages/Login/`)
   - Composed of multiple components for different states
   - Shows appropriate UI based on authentication state
   - Redirects to home if already authenticated

6. **PrivateRoutesWrapper** (`src/init/PrivateRoutesWrapper.tsx`)
   - Protects routes that require authentication
   - Shows loading state while checking auth
   - Redirects to login if not authenticated

## Setup

1. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
   ```

3. Configure Supabase:
   - Enable Email authentication in Supabase dashboard
   - Configure email templates (optional)
   - Set up redirect URLs in Supabase settings

## Usage

### Accessing Current User

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Welcome {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Protecting Routes

Routes are automatically protected by wrapping them in `PrivateRoutesWrapper` in `src/Router.tsx`:

```tsx
{
  element: <PrivateRoutesWrapper />,
  children: [
    { path: '/', element: <HomePage /> },
    // ... other protected routes
  ],
}
```

## Flow

1. User visits protected route → redirected to `/login`
2. User enters email → magic link sent
3. User clicks link in email → redirected back with token
4. Token verified automatically → user logged in
5. User redirected to home page
6. Session persists across page refreshes
7. User can sign out from navbar

## Customization

- **Email templates**: Configure in Supabase dashboard
- **Redirect URL**: Modify in `useLogin.ts` (`emailRedirectTo` option)
- **UI styling**: Update components in `src/pages/Login/`
- **Session persistence**: Handled automatically by Supabase

