export function getDisplayProgress(course = {}, progress = null) {
  // Prefer server-provided overallProgress when available, otherwise use course.displayProgress or course.progress
  const rawOverall = progress?.overallProgress ?? course.displayProgress ?? course.progress ?? 0;
  let display = Math.round(rawOverall || 0);

  // If we have detailed progress and the quiz was auto-submitted or scored 0, recompute using lecture/assignment weights
  const quiz = progress?.quiz ?? course.quiz ?? null;
  const lectures = progress?.lectures ?? course.lectures ?? null;
  const assignments = progress?.assignments ?? course.assignments ?? null;

  const quizScored0orAuto = Boolean(
    (quiz && (quiz.autoSubmitted || (quiz.completed && Number(quiz.percentage) === 0)))
  );

  if (quizScored0orAuto && (quiz?.hasQuiz ?? !!course.quiz)) {
    const lecturePct = Number(lectures?.percentage ?? 0) || 0;
    const assignmentPct = Number(assignments?.submissionPercentage ?? 0) || 0;
    // Define weights (must sum to 1)
    const L_WEIGHT = 0.4; // lectures 40%
    const A_WEIGHT = 0.3; // assignments 30%
    const Q_WEIGHT = 0.3; // quiz 30% (quiz contributes 0 in this case)

    // quiz is auto-submitted or scored 0, so its contribution is 0
    const quizContribution = 0;

    const lectureContribution = lecturePct * L_WEIGHT;
    const assignmentContribution = assignmentPct * A_WEIGHT;

    display = Math.round(lectureContribution + assignmentContribution + quizContribution);
  }

  // If course is marked completed, force 100
  if (course?.status === "Completed") display = 100;

  return display;
}

export default getDisplayProgress;
