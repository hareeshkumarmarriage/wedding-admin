-- RSVP form completion: persist the structured RSVP fields from the admin specification.
alter table public.rsvps
  add column if not exists plus_one boolean not null default false,
  add column if not exists meal_preference text,
  add column if not exists dietary_requirements text;

alter table public.rsvps drop constraint if exists rsvps_meal_preference_length;
alter table public.rsvps add constraint rsvps_meal_preference_length check (meal_preference is null or char_length(meal_preference) <= 120);
alter table public.rsvps drop constraint if exists rsvps_dietary_requirements_length;
alter table public.rsvps add constraint rsvps_dietary_requirements_length check (dietary_requirements is null or char_length(dietary_requirements) <= 500);

create index if not exists rsvps_attending_idx on public.rsvps(attending);
create index if not exists rsvps_plus_one_idx on public.rsvps(plus_one);
