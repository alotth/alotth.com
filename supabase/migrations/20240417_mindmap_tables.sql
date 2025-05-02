-- Create mindmap tables
create table mindmap_projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null
);

create table mindmap_nodes (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  position jsonb not null,
  style jsonb not null,
  project_id uuid references mindmap_projects(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table mindmap_edges (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references mindmap_nodes(id) on delete cascade not null,
  target_id uuid references mindmap_nodes(id) on delete cascade not null,
  project_id uuid references mindmap_projects(id) on delete cascade not null,
  label text,
  style jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table mindmap_projects enable row level security;
alter table mindmap_nodes enable row level security;
alter table mindmap_edges enable row level security;

-- Create policies - only authenticated users can access their own data
create policy "Users can view their own projects"
  on mindmap_projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on mindmap_projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on mindmap_projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on mindmap_projects for delete
  using (auth.uid() = user_id);

-- Node policies
create policy "Users can view their own nodes"
  on mindmap_nodes for select
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can create their own nodes"
  on mindmap_nodes for insert
  with check (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can update their own nodes"
  on mindmap_nodes for update
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can delete their own nodes"
  on mindmap_nodes for delete
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));

-- Edge policies
create policy "Users can view their own edges"
  on mindmap_edges for select
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can create their own edges"
  on mindmap_edges for insert
  with check (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can update their own edges"
  on mindmap_edges for update
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));

create policy "Users can delete their own edges"
  on mindmap_edges for delete
  using (auth.uid() = (select user_id from mindmap_projects where id = project_id));