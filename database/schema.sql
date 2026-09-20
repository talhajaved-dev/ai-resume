CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  required_skills JSON NOT NULL,
  preferred_skills JSON NOT NULL,
  education VARCHAR(255),
  minimum_experience DECIMAL(5,2) DEFAULT 0,
  certifications JSON NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE resumes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  storage_path VARCHAR(1024),
  extracted_text LONGTEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE candidates (
  id VARCHAR(36) PRIMARY KEY,
  resume_id VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(80),
  education TEXT,
  years_experience DECIMAL(5,2),
  job_titles JSON,
  certifications JSON,
  recruiter_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidates_resume FOREIGN KEY (resume_id) REFERENCES resumes(id)
);

CREATE TABLE candidate_skills (
  candidate_id VARCHAR(36) NOT NULL,
  skill VARCHAR(255) NOT NULL,
  PRIMARY KEY (candidate_id, skill),
  CONSTRAINT fk_candidate_skills_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE screening_results (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  semantic_score DECIMAL(6,3),
  ml_score DECIMAL(6,3),
  overall_score DECIMAL(6,3),
  status VARCHAR(40) NOT NULL,
  matched_skills JSON,
  missing_skills JSON,
  related_skills JSON,
  model_mode VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  CONSTRAINT fk_results_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE model_explanations (
  id VARCHAR(36) PRIMARY KEY,
  screening_result_id VARCHAR(36) NOT NULL,
  feature_impacts JSON NOT NULL,
  interpretation TEXT NOT NULL,
  model_mode VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_explanations_result FOREIGN KEY (screening_result_id) REFERENCES screening_results(id)
);

CREATE TABLE fairness_results (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  demographic_attributes_available BOOLEAN NOT NULL DEFAULT FALSE,
  metrics JSON NOT NULL,
  message TEXT NOT NULL,
  model_mode VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fairness_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE recruiter_notes (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id)
);