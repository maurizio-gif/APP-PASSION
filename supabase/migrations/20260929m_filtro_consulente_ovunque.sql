-- Il filtro per consulente in ogni sezione
--
-- Dopo Lead e Task (20260929g), anche Prove, Disdette, Rinnovi e Debitori si
-- filtrano per operatore: `p_consulente` in fondo, con default (chi chiama
-- senza vede tutto), e il filtro sta prima del limite di righe.
--   - Prove e Disdette: chi le segue (`gestito_da`);
--   - Rinnovi e Debitori: a chi sono assegnati (`assegnato_a`).
-- La firma cambia, per questo le vecchie funzioni si tolgono prima.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  f record;
  def text;
  nuova text;
begin
  for f in
    select * from (values
      ('crm_prove', 'text,integer', '300',
       $a$   where case coalesce(p_vista, 'in_corso')$a$,
       $b$   where (p_consulente is null or p.gestito_da = p_consulente)
     and case coalesce(p_vista, 'in_corso')$b$),
      ('crm_disdette', 'text,integer', '300',
       $a$   where case coalesce(p_vista, 'da_gestire')$a$,
       $b$   where (p_consulente is null or d.gestito_da = p_consulente)
     and case coalesce(p_vista, 'da_gestire')$b$),
      ('crm_rinnovi', 'text,integer', '500',
       $a$   where case coalesce(p_vista, 'da_gestire')$a$,
       $b$   where (p_consulente is null or r.assegnato_a = p_consulente)
     and case coalesce(p_vista, 'da_gestire')$b$),
      ('crm_debitori', 'text,text,integer', '500',
       $a$     and case coalesce(p_chi, 'tutti')$a$,
       $b$     and (p_consulente is null or r.assegnato_a = p_consulente)
     and case coalesce(p_chi, 'tutti')$b$)
    ) as v(nome, argomenti, limite, vecchio, nuovo)
  loop
    def := pg_get_functiondef(format('public.%s(%s)', f.nome, f.argomenti)::regprocedure);
    nuova := replace(def, format('p_limite integer DEFAULT %s)', f.limite),
                          format('p_limite integer DEFAULT %s, p_consulente uuid DEFAULT NULL::uuid)', f.limite));
    if nuova = def then raise exception '%: firma non trovata', f.nome; end if;
    if position(f.vecchio in nuova) = 0 then raise exception '%: filtro da sostituire non trovato', f.nome; end if;
    nuova := replace(nuova, f.vecchio, f.nuovo);
    execute format('drop function public.%s(%s)', f.nome, f.argomenti);
    execute nuova;
    execute format('revoke all on function public.%s(%s,uuid) from public, anon', f.nome, f.argomenti);
    execute format('grant execute on function public.%s(%s,uuid) to authenticated', f.nome, f.argomenti);
  end loop;
end;
$$;
