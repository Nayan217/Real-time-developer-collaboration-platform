
# GitHub OAuth Token Flow Fix Plan

## Problem Analysis
The current GitHub OAuth implementation has a critical flaw where the `provider_token` from the OAuth callback disappears before it can be properly saved. This happens because:

1. The current `AuthCallback.tsx` only listens to auth state changes, missing the initial token in the URL hash
2. Token storage logic relies on a separate `github_tokens` table instead of the existing `profiles` table
3. RLS policies may be preventing the upsert operation from succeeding
4. No debugging mechanisms exist to verify token persistence

## Current State Review
After examining the codebase, I found:

- **AuthCallback.tsx**: Uses `onAuthStateChange` listener which may miss the `provider_token`
- **Dashboard.tsx**: Checks `github_tokens` table for token validation  
- **LinkRepoModal.tsx**: Fetches token from `github_tokens` table
- **Edge Functions**: All reference `github_tokens` table for API calls
- **Database**: Has both `profiles` table with `github_access_token` column AND `github_tokens` table

## Implementation Plan

### 1. Fix Token Capture in AuthCallback.tsx
Replace the entire `useEffect` to immediately capture `provider_token` from session:
- Use `supabase.auth.getSession()` first to catch token from URL hash
- Implement fallback `onAuthStateChange` listener
- Create `saveTokenAndRedirect()` function to upsert token to `profiles` table
- Add debug logging to verify token capture

### 2. Consolidate Token Storage Strategy
**Decision**: Use `profiles` table exclusively for GitHub token storage
- Remove dependency on `github_tokens` table
- Store `github_access_token`, `github_username`, `avatar_url` in profiles
- Update all components to reference `profiles` table

### 3. Create Unified Token Retrieval Function
Implement `getGitHubToken()` helper function:
- Fetch from `profiles.github_access_token` 
- Return null if user not authenticated or token missing
- Use throughout codebase for consistency

### 4. Update All Components Using GitHub Tokens
**Components to modify:**
- **LinkRepoModal.tsx**: Replace `github_tokens` query with `getGitHubToken()`
- **Dashboard.tsx**: Update GitHub connection status check
- **Edge Functions**: Update all three functions (`clone-repo`, `commit-and-push`, `switch-branch`) to fetch from `profiles` table

### 5. Add Debug Dashboard Display
Temporarily add token status indicator to Dashboard:
- Show real-time token status
- Display GitHub username if token exists
- Provide clear feedback for troubleshooting

### 6. Database Schema Updates
**Migration needed** to ensure RLS policies support the new flow:
- Verify `profiles` table has proper INSERT/UPDATE/SELECT policies
- Add missing columns if needed (`updated_at` timestamp)
- Keep `github_tokens` table for backward compatibility but mark as deprecated

### 7. Implement Reconnect GitHub Feature
Add "Reconnect GitHub" button that:
- Signs out current user
- Initiates fresh OAuth flow
- Forces new `provider_token` issuance
- Bypasses cached sessions

### 8. Update Edge Functions
All three edge functions need token source updates:
- **clone-repo**: Change from `github_tokens` to `profiles` table lookup
- **commit-and-push**: Same token source update
- **switch-branch**: Same token source update

## Technical Changes Summary

**Files to Modify:**
1. `src/pages/AuthCallback.tsx` - Complete rewrite of token capture logic
2. `src/pages/Dashboard.tsx` - Add debug status + reconnect button + update token checks
3. `src/components/LinkRepoModal.tsx` - Update to use new token retrieval function
4. `supabase/functions/clone-repo/index.ts` - Change token source to profiles table
5. `supabase/functions/commit-and-push/index.ts` - Change token source to profiles table  
6. `supabase/functions/switch-branch/index.ts` - Change token source to profiles table

**Database Changes:**
- Verify/update RLS policies on `profiles` table
- No schema changes needed (columns already exist)

## Risk Mitigation
- Keep existing `github_tokens` table as fallback during transition
- Add comprehensive error logging for debugging
- Implement graceful fallbacks if token retrieval fails
- Test OAuth flow in both popup and redirect scenarios

## Success Criteria
1. OAuth callback successfully captures and saves `provider_token`
2. Token persists across browser sessions
3. All GitHub operations (clone, commit, branch switch) work with saved token
4. Debug display shows clear token status
5. Reconnect functionality forces fresh token acquisition

This plan addresses the root cause of token disappearance while providing robust debugging and recovery mechanisms.
