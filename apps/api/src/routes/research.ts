import { Router, type IRouter } from "express";
import { LIVE_MODEL, LIVE_EVALUATION } from "../services/model";
import {
  CreateJobBody,
  ExplainCandidateBody,
  RunScreeningBody,
  UpdateCandidateStatusBody,
  UpdateJobBody,
  UploadResumesBody,
} from "@workspace/api-zod";
import {
  candidates,
  createJob,
  demoJobs,
  explanationFor,
  jobs,
  runScreening,
  screenings,
  updateJob,
  type CandidateStatus,
} from "../services/research-data";

const router: IRouter = Router();
const mode = "DEMO_MODE";

router.get("/dashboard", (_req, res) => {
  const scoreDistribution = [
    { label: "0–39", value: 12 },
    { label: "40–59", value: 24 },
    { label: "60–79", value: 51 },
    { label: "80–100", value: 37 },
  ];
  res.json({
    stats: { totalResumes: 124, screenedCandidates: 124, shortlistedCandidates: 18, averageMatch: 76 },
    scoreDistribution,
    statusBreakdown: [{ label: "Strong Match", value: 18 }, { label: "Potential Match", value: 64 }, { label: "Low Match", value: 42 }],
    topSkills: [{ label: "Python", value: 78 }, { label: "SQL", value: 64 }, { label: "Machine Learning", value: 57 }, { label: "React", value: 43 }, { label: "AWS", value: 36 }],
    recentScreenings: candidates.slice(0, 3),
    mode,
  });
});

router.get("/jobs", (_req, res) => res.json(jobs));
router.get("/jobs/:id", (req, res) => {
  const job = jobs.find((item) => item.id === req.params.id);
  return job ? res.json(job) : res.status(404).json({ error: "Job description not found." });
});
router.post("/jobs", (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please provide all required job description fields." });
  return res.status(201).json(createJob(parsed.data));
});
router.patch("/jobs/:id", (req, res) => {
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid job description." });
  const updated = updateJob(req.params.id, parsed.data);
  return updated ? res.json(updated) : res.status(404).json({ error: "Job description not found." });
});
router.delete("/jobs/:id", (req, res) => {
  const index = jobs.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Job description not found." });
  jobs.splice(index, 1);
  return res.status(204).send();
});

router.post("/resumes/upload", (req, res) => {
  const parsed = UploadResumesBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "No readable resumes were provided." });
  return res.status(201).json(parsed.data.resumes.map((resume) => ({
    id: `resume-${resume.filename}`,
    filename: resume.filename,
    fileType: resume.fileType || resume.filename.split(".").pop() || "unknown",
    status: "Ready for screening",
    uploadedAt: new Date().toISOString(),
  })));
});

router.post("/screen", (req, res) => {
  const parsed = RunScreeningBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Add a job description and at least one readable resume." });
  const result = runScreening(parsed.data.jobDescription, parsed.data.resumes);
  return res.json(result);
});

router.get("/screenings", (_req, res) => res.json(screenings));
router.get("/candidates", (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "");
  const skill = String(req.query.skill || "").toLowerCase();
  const filtered = candidates.filter((candidate) =>
    (!search || [candidate.name, candidate.email, candidate.sourceFile].some((value) => value.toLowerCase().includes(search))) &&
    (!status || candidate.status === status) &&
    (!skill || candidate.skills.some((value) => value.toLowerCase().includes(skill))),
  );
  res.json(filtered);
});
router.get("/candidates/:id", (req, res) => {
  const candidate = candidates.find((item) => item.id === req.params.id);
  return candidate ? res.json(candidate) : res.status(404).json({ error: "Candidate not found." });
});
router.patch("/candidates/:id", (req, res) => {
  const parsed = UpdateCandidateStatusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid candidate update." });
  const candidate = candidates.find((item) => item.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found." });
  if (parsed.data.status) candidate.status = parsed.data.status as CandidateStatus;
  if (parsed.data.notes !== undefined) candidate.notes = parsed.data.notes;
  return res.json(candidate);
});

router.post("/explain", (req, res) => {
  const parsed = ExplainCandidateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Candidate id is required." });
  const candidate = candidates.find((item) => item.id === parsed.data.candidateId);
  return candidate ? res.json(explanationFor(candidate)) : res.status(404).json({ error: "Candidate not found." });
});
router.get("/fairness", (_req, res) => {
  /*
   * Demographic fairness cannot be calculated because the prototype
   * does not contain demographic attributes or demographic labels.
   *
   * However, we can calculate genuine screening diagnostics from
   * the candidate records currently held by the application.
   */

  const totalCandidates = candidates.length;

  // Use the live model score rather than recruiter-edited status.
  // This keeps the diagnostics about model screening behaviour.
  const strongMatches = candidates.filter(
    (candidate) => candidate.overallScore >= 80,
  ).length;

  const potentialMatches = candidates.filter(
    (candidate) =>
      candidate.overallScore >= 50 &&
      candidate.overallScore < 80,
  ).length;

  const lowMatches = candidates.filter(
    (candidate) => candidate.overallScore < 50,
  ).length;

  // Model-selected means candidates scoring at least 50%.
  const modelSelected = candidates.filter(
    (candidate) => candidate.overallScore >= 50,
  ).length;

  const averageScore =
    totalCandidates > 0
      ? candidates.reduce(
          (sum, candidate) => sum + candidate.overallScore,
          0,
        ) / totalCandidates
      : 0;

  const overallSelectionRate =
    totalCandidates > 0
      ? modelSelected / totalCandidates
      : 0;

  const strongMatchRate =
    totalCandidates > 0
      ? strongMatches / totalCandidates
      : 0;

  const potentialMatchRate =
    totalCandidates > 0
      ? potentialMatches / totalCandidates
      : 0;

  const lowMatchRate =
    totalCandidates > 0
      ? lowMatches / totalCandidates
      : 0;

  return res.json({
    demographicsAvailable: false,

    message:
      "Demographic fairness metrics cannot be calculated because demographic attributes are not available in the selected candidate dataset. The screening diagnostics below are calculated directly from the live candidate scores.",

    /*
     * These are genuine model-screening diagnostics.
     */
    screeningDiagnostics: {
      totalCandidates,

      modelSelected,

      overallSelectionRate,

      strongMatches,
      strongMatchRate,

      potentialMatches,
      potentialMatchRate,

      lowMatches,
      lowMatchRate,

      averageScore: Number(averageScore.toFixed(2)),
    },

    /*
     * Keep demographic fairness metrics separate.
     * null means "not calculable", not zero.
     */
    metrics: [
      {
        name: "Demographic Selection Rate",
        value: null,
        interpretation:
          "Not available because demographic attributes are not present.",
      },
      {
        name: "Demographic True Positive Rate",
        value: null,
        interpretation:
          "Not available because demographic groups and labelled outcomes are not present.",
      },
      {
        name: "Demographic Parity Difference",
        value: null,
        interpretation:
          "Not computed because demographic group membership is unavailable.",
      },
    ],

    /*
     * These are score bands, NOT demographic groups.
     * They are calculated from actual candidate model scores.
     */
    groups: [
      {
        label: "Strong Match (80–100)",
        selectionRate: strongMatchRate,
        count: strongMatches,
      },
      {
        label: "Potential Match (50–79)",
        selectionRate: potentialMatchRate,
        count: potentialMatches,
      },
      {
        label: "Low Match (0–49)",
        selectionRate: lowMatchRate,
        count: lowMatches,
      },
    ],

    mode: "LIVE_MODEL",
  });
});
router.get("/model/metrics", (_req, res) => res.json({
  // Keep the existing frontend benchmark values unchanged. These are display/evidence
  // statistics already used by the dissertation-facing UI, not the live inference metrics.
  mode,
  metrics: [
    { name: "Accuracy", value: 0.8548 },
    { name: "Precision", value: 0.818 },
    { name: "Recall", value: 0.783 },
    { name: "F1 Score", value: 0.800 },
  ],
  confusionMatrix: [[70, 8], [10, 36]],
  comparison: [
    { model: "Logistic Regression", f1: 0.73 },
    { model: "SVM", f1: 0.77 },
    { model: "Naive Bayes", f1: 0.68 },
    { model: "Random Forest", f1: 0.80 },
  ],
  // Live model metadata is available to the application without replacing the existing
  // dashboard/model statistics shown to the user.
  liveModel: {
    modelVersion: LIVE_MODEL.modelVersion,
    dataset: LIVE_MODEL.dataset,
    split: LIVE_EVALUATION.split,
    metrics: LIVE_EVALUATION.metrics,
    confusionMatrix: LIVE_EVALUATION.confusionMatrix,
    comparison: LIVE_EVALUATION.comparison,
    inferenceEnabled: true,
  },
}));

export default router;