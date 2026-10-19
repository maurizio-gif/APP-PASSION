-- I doppioni di PerfectGym spariscono dal CRM prima ancora di essere cancellati
--
-- Le API di PerfectGym non permettono di scrivere isDeleted (Edge Function
-- perfectgym-doppioni: PATCH rifiutata, POST ignorata), quindi i 301 doppioni
-- approvati il 19/10/2026 si cancellano a mano su PerfectGym. Nel frattempo il
-- CRM li tratta gia' come cancellati: `crm.member_esclusi` e' l'elenco, e
-- `crm.cancellata()` (migrazione 20261019a) vale true anche per loro. Non si
-- tocca il mirror: `perfectgym.members` resta la copia di PerfectGym.
--
-- Effetto: `crm.collega_soci()` riaggancia le persone collegate a un doppione
-- (6 il 19/10) all'anagrafica che resta; il desk non usa piu' un doppione per
-- «Nuovo lead». Quando su PerfectGym il member risulta cancellato, la riga
-- qui non serve piu' ma non da' fastidio.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create table if not exists crm.member_esclusi (
  member_id bigint primary key,
  motivo text not null,
  creato_il timestamptz not null default now()
);
alter table crm.member_esclusi enable row level security;
revoke all on crm.member_esclusi from public, anon, authenticated;

create or replace function crm.cancellata(p_member bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select m.is_deleted from perfectgym.members m where m.id = p_member), false)
      or exists (select 1 from crm.member_esclusi e where e.member_id = p_member);
$$;

create or replace function crm.collega_soci()
returns integer
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  with scelti as (
    select distinct on (u.id) u.id as utente, m.id as member
      from public.utenti u
      join perfectgym.members m on not m.is_deleted and public.normalizza_email(m.email) = u.email_norm
     where (u.member_id is null or crm.cancellata(u.member_id)) and u.email_norm is not null
       and not exists (select 1 from crm.member_esclusi e where e.member_id = m.id)
     order by u.id, (m.member_type = 'Member') desc, m.id
  ),
  unici as (
    select distinct on (s.member) s.utente, s.member
      from scelti s
     where not exists (select 1 from public.utenti o where o.member_id = s.member)
     order by s.member, s.utente
  )
  update public.utenti u set member_id = x.member, aggiornato_il = now()
    from unici x
   where x.utente = u.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$
declare
  def text := pg_get_functiondef('public.crm_lead_perfectgym(uuid)'::regprocedure);
  vecchio text := 'where not m.is_deleted and u.email_norm is not null';
begin
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead_perfectgym: filtro sui member non trovato una volta sola';
  end if;
  execute replace(def, vecchio,
    'where not m.is_deleted and not crm.cancellata(m.id) and u.email_norm is not null');
end;
$$;

insert into crm.member_esclusi (member_id, motivo)
select id, 'doppione approvato il 19/10/2026'
  from unnest('{263,282,324,681,731,3618,3673,3704,3855,3991,4000,4056,4127,4228,4275,4404,4570,4683,4687,4919,5085,5113,5116,5226,5375,5494,5521,5557,5563,5719,5848,5978,6345,6384,6520,6600,6663,6710,6903,6951,6979,7032,7071,7178,7261,7359,7735,7828,7878,8024,8027,8039,8053,8077,8364,8468,8481,8535,8610,8767,8867,9063,9252,9384,9463,9609,9777,9819,10195,10481,10505,10515,10604,10958,11053,11164,11176,11194,11284,11449,11630,11703,11813,11889,11908,11934,12045,12094,12284,12286,12304,12460,12674,12720,12897,13145,13220,13267,13287,13293,13296,13334,13439,13486,13602,13629,13664,13769,13787,13835,13969,14111,14141,14161,14279,14285,14331,14350,14657,14878,14922,14945,14951,14977,15013,15094,15201,15351,15356,15387,15488,15843,15864,15907,16026,16053,16097,16230,16271,16376,16463,16526,16653,16680,16848,16957,17058,17341,17405,17545,17547,17610,17751,17782,18022,18374,18478,18599,18759,18811,18816,18885,18982,19039,19096,19144,19279,19588,19688,19706,19893,20128,20763,20868,23128,23571,23670,23671,23714,23875,35207,57664,67895,68294,68295,68443,68532,68606,68638,68641,68651,68668,68670,68677,68680,68683,68685,68690,68694,68700,68704,68706,68715,68716,68718,68720,68729,68731,68736,68737,68740,68746,68752,68767,68771,68778,68787,68793,68794,68806,68810,68815,68818,68821,68824,68826,68830,68832,68836,68839,68855,68857,68858,68860,68868,68873,68875,68879,68884,68890,68893,68895,68899,68902,68917,68918,68921,68938,68940,68943,68945,68947,68954,68955,68965,68969,68972,68976,68980,68991,68997,69009,69014,69028,69031,69036,69039,69048,69049,69051,69054,69055,69056,69074,69091,69092,69097,69099,69101,69111,69117,69121,69140,69146,69151,69158,69170,69173,69174,69177,69191,69194,69218,69219,69221,69223,69249,69271,69300,69327,69398}'::bigint[]) as id
on conflict do nothing;

select crm.collega_soci();
