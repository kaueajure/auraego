CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(24) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  status ENUM('ACTIVE','LOCKED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  UNIQUE KEY users_username_uq (username),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS verification_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY verification_token_hash_uq (token_hash),
  KEY verification_user_expiry_idx (user_id, expires_at),
  CONSTRAINT verification_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS recovery_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY recovery_token_hash_uq (token_hash),
  KEY recovery_user_expiry_idx (user_id, expires_at),
  CONSTRAINT recovery_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(300) NULL,
  ip_hash CHAR(64) NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY sessions_refresh_hash_uq (refresh_token_hash),
  KEY sessions_user_expiry_idx (user_id, expires_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS player_profiles (
  user_id CHAR(36) PRIMARY KEY,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  experience INT UNSIGNED NOT NULL DEFAULT 0,
  total_aura BIGINT UNSIGNED NOT NULL DEFAULT 0,
  current_rank VARCHAR(40) NOT NULL DEFAULT 'SEM_PRESENCA',
  mmr INT NOT NULL DEFAULT 1000,
  wins INT UNSIGNED NOT NULL DEFAULT 0,
  losses INT UNSIGNED NOT NULL DEFAULT 0,
  win_streak INT UNSIGNED NOT NULL DEFAULT 0,
  tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  selected_cosmetics JSON NULL,
  audio_settings JSON NULL,
  graphics_settings JSON NULL,
  KEY profiles_mmr_idx (mmr DESC),
  CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS matches (
  id CHAR(36) PRIMARY KEY,
  mode ENUM('TRAINING','RANKED') NOT NULL,
  status ENUM('WAITING','LOADING','ACTIVE','FINISHED','CANCELLED') NOT NULL,
  seed INT UNSIGNED NOT NULL,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  winner_id CHAR(36) NULL,
  finish_reason VARCHAR(40) NULL,
  server_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  KEY matches_status_started_idx (status, started_at),
  CONSTRAINT matches_winner_fk FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS match_participants (
  match_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  aura INT NOT NULL DEFAULT 0,
  remaining_ego INT NOT NULL DEFAULT 100,
  highest_combo INT UNSIGNED NOT NULL DEFAULT 0,
  accuracy DOUBLE NOT NULL DEFAULT 0,
  perfect_actions INT UNSIGNED NOT NULL DEFAULT 0,
  mistakes INT UNSIGNED NOT NULL DEFAULT 0,
  spam_violations INT UNSIGNED NOT NULL DEFAULT 0,
  mmr_before INT NOT NULL,
  mmr_after INT NULL,
  disconnected_at DATETIME(3) NULL,
  result ENUM('WIN','LOSS','DRAW') NULL,
  PRIMARY KEY (match_id, user_id),
  KEY participants_user_match_idx (user_id, match_id),
  CONSTRAINT participants_match_fk FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT participants_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS match_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  sequence INT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY events_match_sequence_idx (match_id, sequence),
  CONSTRAINT events_match_fk FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
