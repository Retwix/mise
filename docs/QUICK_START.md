# Quick Start Guide - Authentication

## Prerequisites

- Node.js installed
- Supabase account and project created
- Email authentication enabled in Supabase

## Setup Steps

### 1. Install Dependencies

Dependencies are already installed (`@supabase/supabase-js` is in package.json).

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```

**Where to find these values:**
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy "Project URL" → `VITE_SUPABASE_URL`
4. Copy "anon public" key → `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### 3. Configure Supabase Email Settings

1. In Supabase dashboard, go to "Authentication" → "Email Templates"
2. Customize the magic link email template (optional)
3. Go to "Authentication" → "URL Configuration"
4. Add your site URL (e.g., `http://localhost:3000` for development)
5. Add redirect URLs:
   - `http://localhost:3000`
   - `http://localhost:3000/**` (for wildcard matching)

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing the Authentication Flow

### 1. Test Login

1. Navigate to `http://localhost:3000`
2. You should be redirected to `/login`
3. Enter your email address
4. Click "Send magic link"
5. Check your email for the magic link
6. Click the link in the email
7. You should be redirected back and logged in

### 2. Test Protected Routes

1. While logged in, navigate to different pages:
   - `/` - Dashboard
   - `/schedule` - Planning
   - `/employees` - Employees
2. All should be accessible

### 3. Test Sign Out

1. Click the "Sign Out" button in the navbar
2. You should be redirected to `/login`
3. Try accessing a protected route (e.g., `/`)
4. You should be redirected back to `/login`

### 4. Test Session Persistence

1. Log in
2. Refresh the page
3. You should remain logged in
4. Close the browser and reopen
5. Navigate to the app
6. You should still be logged in (session persists)

## Troubleshooting

### Magic Link Not Received

- Check spam folder
- Verify email is correct in Supabase dashboard
- Check Supabase email rate limits
- Verify email authentication is enabled

### Redirect Issues

- Ensure redirect URLs are configured in Supabase
- Check browser console for errors
- Verify `VITE_SUPABASE_URL` is correct

### Environment Variables Not Loading

- Restart the dev server after changing `.env`
- Ensure `.env` is in the project root
- Check that variables start with `VITE_`

### TypeScript Errors

```bash
npm run typecheck
```

### Linting Errors

```bash
npm run lint
```

## Next Steps

- Customize the login page UI in `src/pages/Login/`
- Add user profile management
- Implement role-based access control
- Add social authentication providers
- Customize email templates in Supabase

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Mantine UI Components](https://mantine.dev/)
- [React Router Documentation](https://reactrouter.com/)

