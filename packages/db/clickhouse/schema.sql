-- ClickHouse Analytics Schema
-- Run this after starting the ClickHouse container

CREATE DATABASE IF NOT EXISTS resume_analytics;

-- Resume scores history
CREATE TABLE IF NOT EXISTS resume_analytics.resume_scores
(
    id           String,
    resume_id    String,
    job_id       String,
    user_id      String,
    score        Float64,
    match_pct    Float64,
    confidence   Float64,
    created_at   DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, user_id);

-- Skill gap tracking
CREATE TABLE IF NOT EXISTS resume_analytics.skill_gaps
(
    id           String,
    resume_id    String,
    user_id      String,
    skill        String,
    present      UInt8,   -- 1=has skill, 0=missing
    created_at   DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, user_id, skill);

-- User activity events
CREATE TABLE IF NOT EXISTS resume_analytics.user_activity
(
    id         String,
    user_id    String,
    event      String,   -- 'upload', 'analyze', 'view_result'
    metadata   String,   -- JSON string
    created_at DateTime  DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (created_at, user_id);
