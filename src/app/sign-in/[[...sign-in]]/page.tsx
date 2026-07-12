import { SignIn } from '@clerk/nextjs'

import { Shell } from '../../../components/Shell'

export default function SignInPage() {
  return (
    <Shell>
      <section className="codex-main">
        <div className="main-scroll">
          <div className="main-pad auth-pad">
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <SignIn fallbackRedirectUrl="/ambassador" />
            ) : (
              <div className="auth-empty">
                Clerk is not configured yet. Add Clerk keys to Cloudflare to
                enable sign-in.
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  )
}
