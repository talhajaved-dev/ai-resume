import { randomUUID } from "node:crypto";
import { LIVE_MODEL, LIVE_SKILLS } from "./model";

export type CandidateStatus = "Strong Match" | "Potential Match" | "Low Match" | "Review" | "Shortlisted" | "Rejected";

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: string;
  experience: number;
  jobTitles: string[];
  certifications: string[];
  semanticScore: number;
  mlScore: number;
  overallScore: number;
  status: CandidateStatus;
  matchedSkills: string[];
  missingSkills: string[];
  relatedSkills: string[];
  explanation: string;
  fairness: { demographicsAvailable: boolean; message: string };
  notes: string;
  sourceFile: string;
  modelContributions?: number[];
  modelVersion?: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  requiredSkills: string[];
  preferredSkills: string[];
  education: string;
  minimumExperience: number;
  certifications: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeInput = { filename: string; text: string; fileType?: string };

const now = () => new Date().toISOString();
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();

const skillDictionary = [...LIVE_SKILLS];

// Keep these feature detectors aligned with python-model/train_model.py.
// The live API must use the same education/certification signals as the
// trained model artifact.
const EDUCATION_PATTERN = /(bachelor|master|phd|doctorate|degree)/i;
const CERTIFICATION_PATTERN = /(certified|certification|fundamentals)/i;

function extractSkills(text: string) {
  const source = normalise(text);
  return skillDictionary.filter((skill) => source.includes(normalise(skill)));
}

function extractName(text: string, filename: string) {
  const firstUseful = text.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length > 2 && line.length < 80);
  if (firstUseful && !firstUseful.includes("@") && !/\d{3,}/.test(firstUseful)) return firstUseful.replace(/[|•].*$/, "").trim();
  return filename.replace(/\.(pdf|docx?|txt)$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractExperience(text: string) {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/gi)].map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches) : 0;
}

function extractEducation(text: string) {
  const match = text.match(/(master(?:'s)?|bachelor(?:'s)?|ph\.?d\.?|doctorate|degree)[^\n,;.]*/i);
  return match?.[0]?.trim() || "Not detected";
}

function extractCertifications(text: string) {
  const known = ["AWS Certified", "Azure Fundamentals", "Google Cloud", "Scrum Master", "CFA", "PMP", "TensorFlow Developer"];
  return known.filter((certification) => normalise(text).includes(normalise(certification)));
}

function tokenizeModel(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function fnv1a32(value: string): number {
  let result = 2166136261 >>> 0;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619) >>> 0;
  }
  return result >>> 0;
}
function embedModel(text: string): number[] {
  const words = tokenizeModel(text);
  const grams = [...words, ...words.slice(0, -1).map((word, i) => `${word}_${words[i + 1]}`)];
  const counts = new Map<string, number>();
  for (const gram of grams) counts.set(gram, (counts.get(gram) || 0) + 1);
  const vector = new Array<number>(LIVE_MODEL.embedding.dimensions).fill(0);
  for (const [gram, count] of counts) {
    const sign = (fnv1a32(`sign:${gram}`) & 1) ? 1 : -1;
    vector[fnv1a32(gram) % LIVE_MODEL.embedding.dimensions] += sign * (1 + Math.log(count));
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => value / norm);
}
function cosineModel(left: number[], right: number[]): number {
  return left.reduce((sum, value, i) => sum + value * right[i], 0);
}
function extractModelFeatures(job: string, resume: string): number[] {
  const lowerJob = job.toLowerCase();
  const lowerResume = resume.toLowerCase();
  const jobSkills = skillDictionary.filter(skill => lowerJob.includes(skill.toLowerCase()));
  const resumeSkills = skillDictionary.filter(skill => lowerResume.includes(skill.toLowerCase()));
  const requiredYears = extractExperience(job);
  const resumeYears = extractExperience(resume);
  const skillCoverage = jobSkills.length
    ? jobSkills.filter(skill => resumeSkills.includes(skill)).length / jobSkills.length
    : 0;
  const experienceAlignment = requiredYears
    ? Math.min(1, resumeYears / requiredYears)
    : Math.min(1, resumeYears / 3);
  return [
    Math.max(0, cosineModel(embedModel(job), embedModel(resume))),
    skillCoverage,
    experienceAlignment,
    EDUCATION_PATTERN.test(resume) ? 1 : 0,
    CERTIFICATION_PATTERN.test(resume) ? 1 : 0,
  ];
}
function sigmoidModel(value: number): number {
  const clipped = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-clipped));
}
function liveModelInference(job: string, resume: string) {
  const raw = extractModelFeatures(job, resume);
  const standardized = raw.map((value, i) => (value - LIVE_MODEL.means[i]) / LIVE_MODEL.scales[i]);
  const logit = LIVE_MODEL.bias + standardized.reduce((sum, value, i) => sum + value * LIVE_MODEL.weights[i], 0);
  const probability = sigmoidModel(logit);
  const contributions = standardized.map((value, i) => value * LIVE_MODEL.weights[i]);
  return { raw, standardized, probability, predicted: probability >= LIVE_MODEL.threshold ? 1 : 0, contributions };
}
function candidateFromResume(resume: ResumeInput, jobDescription: string, index: number): Candidate {
  const candidateSkills = extractSkills(resume.text);
  const jobSkills = extractSkills(jobDescription);
  const matchedSkills = jobSkills.filter(skill => candidateSkills.some(candidateSkill => normalise(candidateSkill) === normalise(skill)));
  const missingSkills = jobSkills.filter(skill => !matchedSkills.includes(skill)).slice(0, 5);
  const relatedSkills = candidateSkills.filter(skill => !matchedSkills.includes(skill)).slice(0, 4);
  const inference = liveModelInference(jobDescription, resume.text);
  const semanticScore = clamp(inference.raw[0] * 100);
  const mlScore = clamp(inference.probability * 100);
  const overallScore = mlScore;
  const status: CandidateStatus = mlScore >= 80 ? "Strong Match" : mlScore >= 50 ? "Potential Match" : "Low Match";
  const firstEmail = resume.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const firstPhone = resume.text.match(/(?:\+?\d[\d ()-]{7,}\d)/)?.[0];
  const experience = extractExperience(resume.text);
  return {
    id: `candidate-${index + 1}-${randomUUID().slice(0, 8)}`,
    name: extractName(resume.text, resume.filename), email: firstEmail || "Not detected", phone: firstPhone || "Not detected",
    skills: candidateSkills, education: extractEducation(resume.text), experience,
    jobTitles: (resume.text.match(/(?:engineer|analyst|developer|scientist|manager|designer)[^\n,;.]*/gi) || []).slice(0, 3),
    certifications: extractCertifications(resume.text), semanticScore, mlScore, overallScore, status,
    matchedSkills, missingSkills, relatedSkills,
    explanation: matchedSkills.length
      ? `Live ${LIVE_MODEL.modelVersion} prediction is ${(inference.probability * 100).toFixed(1)}%. Evidence includes ${matchedSkills.slice(0, 3).join(", ")} alignment, semantic similarity, experience, education and certification signals.`
      : `Live ${LIVE_MODEL.modelVersion} prediction is ${(inference.probability * 100).toFixed(1)}%. Limited direct skill alignment was detected; review the source resume before making a decision.`,
    fairness: { demographicsAvailable: false, message: "Fairness analysis cannot be fully performed because demographic attributes are not available in the selected dataset." },
    notes: "", sourceFile: resume.filename, modelContributions: inference.contributions, modelVersion: LIVE_MODEL.modelVersion,
  };
}

export const demoJobs: Job[] = [
  {
    id: "job-ml-engineer",
    title: "Machine Learning Engineer",
    department: "Applied Research",
    requiredSkills: ["Python", "Machine Learning", "SQL", "scikit-learn"],
    preferredSkills: ["AWS", "Docker", "NLP"],
    education: "Computer Science or related field",
    minimumExperience: 3,
    certifications: [],
    description: "We are seeking a Machine Learning Engineer to build responsible NLP and ranking systems. Strong Python, SQL, scikit-learn, and applied machine learning experience required. AWS, Docker, and NLP are preferred.",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-18T09:00:00.000Z",
  },
];

export const demoCandidates: Candidate[] = [
  candidateFromResume({ filename: "alex-morgan.txt", text: "Alex Morgan\nalex.morgan@example.com\n+971 50 123 4567\nMachine Learning Engineer with 5 years experience building Python, SQL and scikit-learn ranking systems. Machine Learning, NLP, AWS and Docker. Master of Computer Science.\nAWS Certified" }, demoJobs[0].description, 0),
  candidateFromResume({ filename: "samira-khan.txt", text: "Samira Khan\nsamira.khan@example.com\nData Scientist and Python developer with 4 years experience. Python, Machine Learning, SQL, Pandas, NumPy, TensorFlow. Bachelor of Computer Science. Google Cloud certification." }, demoJobs[0].description, 1),
  candidateFromResume({ filename: "jamie-lee.txt", text: "Jamie Lee\njamie.lee@example.com\nFrontend developer with 2 years experience using React, TypeScript, JavaScript and SQL. Bachelor of Information Technology." }, demoJobs[0].description, 2),
];

export const jobs = [...demoJobs];
export const candidates = [...demoCandidates];
export const screenings = [{
  id: "screening-demo",
  jobTitle: demoJobs[0].title,
  screenedAt: "2026-08-27T11:20:00.000Z",
  resumeCount: 124,
  shortlistedCount: 18,
  averageScore: 76,
}];

export function createJob(input: Omit<Job, "id" | "createdAt" | "updatedAt">) {
  const created = { ...input, id: `job-${randomUUID().slice(0, 8)}`, createdAt: now(), updatedAt: now() };
  jobs.unshift(created);
  return created;
}

export function updateJob(id: string, input: Partial<Omit<Job, "id" | "createdAt" | "updatedAt">>) {
  const job = jobs.find((item) => item.id === id);
  if (!job) return undefined;
  Object.assign(job, input, { updatedAt: now() });
  return job;
}

export function runScreening(jobDescription: string, resumes: ResumeInput[]) {
  const results = resumes.map((resume, index) => candidateFromResume(resume, jobDescription, index)).sort((a, b) => b.overallScore - a.overallScore);
  candidates.unshift(...results);
  const screening = {
    id: `screening-${randomUUID().slice(0, 8)}`,
    jobTitle: jobDescription.split(/\r?\n/)[0]?.slice(0, 80) || "Untitled screening",
    screenedAt: now(),
    results,
    mode: "LIVE_MODEL",
    pipeline: ["Text extraction", "NLP preprocessing", "Feature engineering", "Hashed n-gram semantic representation", "Cosine similarity", "Trained logistic classifier", "Feature contribution view", "Fairness review"],
  };
  screenings.unshift({
    id: screening.id,
    jobTitle: screening.jobTitle,
    screenedAt: screening.screenedAt,
    resumeCount: results.length,
    shortlistedCount: results.filter((candidate) => candidate.status === "Strong Match").length,
    averageScore: results.length
      ? Number((results.reduce((sum, candidate) => sum + candidate.overallScore, 0) / results.length).toFixed(1))
      : 0,
  });
  return screening;
}

export function explanationFor(candidate: Candidate) {
  const featureNames = ["Skill Match", "Semantic Similarity", "Experience", "Education Match", "Certification"];
  const contributions = candidate.modelContributions || [0, 0, 0, 0, 0];
  const maxAbs = Math.max(...contributions.map(value => Math.abs(value)), 1);
  return {
    candidateId: candidate.id,
    features: featureNames.map((feature, i) => ({ feature, impact: Number((contributions[i] / maxAbs * 0.35).toFixed(2)), direction: contributions[i] >= 0 ? "positive" : "negative" })),
    interpretation: candidate.explanation,
    mode: "LIVE_MODEL",
    modelVersion: LIVE_MODEL.modelVersion,
    disclaimer: "Feature contributions are scaled logistic-model evidence, not SHAP values or causal explanations.",
  };
}
