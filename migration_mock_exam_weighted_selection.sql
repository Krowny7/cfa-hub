-- Remplace la sélection aléatoire uniforme de publish_mock_exam par un
-- tirage pondéré par topic, aligné sur les poids officiels du curriculum
-- CFA Level I (milieu de chaque fourchette officielle) :
--   Ethics 15-20% (17.5), Quant 6-9% (7.5), Economics 6-9% (7.5),
--   FSA 11-14% (12.5), Corporate Issuers 6-9% (7.5),
--   Equity Investments 11-14% (12.5), Fixed Income 11-14% (12.5),
--   Derivatives 5-8% (6.5), Alternative Investments 7-10% (8.5),
--   Portfolio Management 8-12% (10)
-- Sans ça, un tirage uniforme sur les 2669 questions QCM actuelles
-- sur-représenterait mécaniquement les gros topics (FSA=427, Equity=415,
-- Fixed Income=414 questions) par rapport aux petits (Alt Investments=79,
-- Corporate=77), ce qui ne reflète pas la pondération réelle de l'examen.
--
-- La répartition par question_count utilise la méthode du plus grand
-- reste (largest remainder) pour que la somme des allocations tombe
-- exactement sur question_count, quel que soit le nombre demandé.

create or replace function publish_mock_exam(p_exam_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  if not is_app_admin() then
    raise exception 'Not authorized';
  end if;

  select question_count into v_count from mock_exams where id = p_exam_id;

  delete from mock_exam_questions where exam_id = p_exam_id;

  insert into mock_exam_questions (exam_id, question_id, position)
  with weights(folder_name, weight) as (
    values
      ('Éthique et Standards Professionnels (Système)', 17.5),
      ('Méthodes Quantitatives (Système)', 7.5),
      ('Économie (Système)', 7.5),
      ('Analyse des États Financiers (Système)', 12.5),
      ('Finance d''Entreprise (Système)', 7.5),
      ('Investissements en Actions (Système)', 12.5),
      ('Fixed Income (Système)', 12.5),
      ('Instruments Dérivés (Système)', 6.5),
      ('Investissements Alternatifs (Système)', 8.5),
      ('Gestion de Portefeuille (Système)', 10.0)
  ),
  total_weight as (
    select sum(weight) as tw from weights
  ),
  raw_alloc as (
    select
      w.folder_name,
      floor(w.weight / tw.tw * v_count)::int as base_count,
      (w.weight / tw.tw * v_count) - floor(w.weight / tw.tw * v_count) as remainder
    from weights w, total_weight tw
  ),
  leftover as (
    select greatest(v_count - (select coalesce(sum(base_count), 0) from raw_alloc), 0) as n
  ),
  ranked as (
    select folder_name, base_count, row_number() over (order by remainder desc) as rn
    from raw_alloc
  ),
  final_alloc as (
    select
      folder_name,
      base_count + case when rn <= (select n from leftover) then 1 else 0 end as alloc
    from ranked
  ),
  picked as (
    select
      qq.id as question_id,
      fa.folder_name,
      row_number() over (partition by fa.folder_name order by random()) as rn
    from final_alloc fa
    join library_folders lf on lf.name = fa.folder_name and lf.kind = 'quizzes'
    join quiz_sets qs on qs.folder_id = lf.id and qs.is_official = true and qs.official_published = true
    join quiz_questions qq on qq.set_id = qs.id
  ),
  selected as (
    select p.question_id
    from picked p
    join final_alloc fa on fa.folder_name = p.folder_name
    where p.rn <= fa.alloc
  )
  select p_exam_id, question_id, row_number() over (order by random()) - 1
  from selected;

  update mock_exams set status = 'open' where id = p_exam_id;
end;
$$;
