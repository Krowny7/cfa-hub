// Message de statut inline (succès/erreur) — identique dans QuizSetView,
// ExerciseSetView, QuizSetManage et ExerciseSetManage, extrait une fois pour
// éviter que les 4 copies divergent silencieusement.
export function StatusMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>
  );
}
