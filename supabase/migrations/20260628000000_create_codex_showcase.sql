create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  author text not null,
  maker text not null,
  category text not null default 'Project',
  status text not null default 'new'
    check (status in ('featured', 'popular', 'new', 'review')),
  body text[] not null default '{}',
  stack text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  codex_history jsonb not null default '[]'::jsonb,
  artifact jsonb not null default '{}'::jsonb,
  cover_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  artifact jsonb not null,
  submitter_name text,
  submitter_contact text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists projects_published_idx
  on public.projects (published, published_at desc);

create index if not exists projects_category_idx
  on public.projects (category);

create index if not exists projects_stack_idx
  on public.projects using gin (stack);

create index if not exists projects_links_idx
  on public.projects using gin (links);

create index if not exists projects_codex_history_idx
  on public.projects using gin (codex_history);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_submissions enable row level security;

drop policy if exists "published projects are publicly readable"
  on public.projects;
create policy "published projects are publicly readable"
on public.projects
for select
to anon, authenticated
using (published = true);

drop policy if exists "submissions are service-role only"
  on public.project_submissions;

grant usage on schema public to anon, authenticated;
grant select on table public.projects to anon, authenticated;

revoke all on table public.project_submissions from anon, authenticated;

insert into public.projects (
  slug,
  title,
  description,
  author,
  maker,
  category,
  status,
  body,
  stack,
  links,
  codex_history,
  artifact,
  published,
  published_at
)
values
(
  'realtime-volatility-research-lab',
  'Realtime Volatility Research Lab',
  'A research console that turns market data, Codex-generated Rust experiments, and report snapshots into a repeatable backtesting workflow.',
  'Mira Chen',
  'Mira Chen',
  'Research',
  'featured',
  array[
    'The project started as a messy folder of market notes, simulation snippets, and screenshots from failed backtests.',
    'Codex helped turn that pile into a repeatable lab: a Rust engine, a Next.js interface, a report surface, and a review loop for comparing strategy changes.'
  ],
  array['Rust', 'Next.js', 'Hyperliquid'],
  '[
    {"label":"Live demo","url":"https://demo.codex.show/volatility-lab","kind":"demo"},
    {"label":"Repository","url":"https://github.com/mirachen/volatility-lab","kind":"repo"},
    {"label":"Report video","url":"https://video.codex.show/volatility-lab","kind":"video"}
  ]'::jsonb,
  '[
    {"id":"turn-1","user":"Turn my backtesting notes into a real research app with a dashboard and repeatable runs.","codex":"Created the app shell, wired the strategy runner, added a route for run comparison, and documented the expected research loop.","workedFor":"worked for 18 minutes"},
    {"id":"turn-2","user":"The report page is too hard to compare. Make the winning and losing runs obvious.","codex":"Reworked the visual report with run cards, deltas, drawdown badges, and a compact table for fast comparison.","workedFor":"worked for 11 minutes"}
  ]'::jsonb,
  '{}'::jsonb,
  true,
  now()
),
(
  'recipe-import-recovery',
  'Recipe Import Recovery',
  'A production debugging story where Codex traced failed recipe saves through deployment logs, route handlers, and database writes.',
  'Nadia Vale',
  'Nadia Vale',
  'Debugging',
  'featured',
  array[
    'This project is useful because the build history is the product proof: a visible runtime failure became a traced fix rather than a guess.',
    'The showcase artifact preserves the prompt, the final Codex summaries, and the polished write-up without publishing raw tool-call logs.'
  ],
  array['Next.js', 'Supabase', 'Vercel'],
  '[
    {"label":"Live app","url":"https://orangecard.justus.sh","kind":"demo"},
    {"label":"Repository","url":"https://github.com/nadiavale/orange-card","kind":"repo"}
  ]'::jsonb,
  '[
    {"id":"turn-1","user":"Recipe imports are hallucinating and sometimes failing to save. Trace the real path and fix it.","codex":"Checked live logs, found the save failure path, tightened source-faithful extraction, and added duplicate-safe imported slugs.","workedFor":"worked for 31 minutes"},
    {"id":"turn-2","user":"Commit and push this cleanly without including unrelated package-manager files.","codex":"Verified the build, kept unrelated files out of the commit, configured GitHub auth, pushed to main, and confirmed the branch matched origin.","workedFor":"worked for 9 minutes"}
  ]'::jsonb,
  '{}'::jsonb,
  true,
  now() - interval '1 day'
)
on conflict (slug) do nothing;
