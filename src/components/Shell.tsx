import type { ReactNode } from 'react'

export function Shell({ children }: { children: ReactNode }) {
  return <main className="page-shell">{children}</main>
}
