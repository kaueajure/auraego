CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  email VARCHAR(254) NOT NULL,
  event_type ENUM('LOGIN','MATCH_START') NOT NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY activity_logs_created_idx (created_at DESC),
  KEY activity_logs_event_created_idx (event_type, created_at DESC),
  KEY activity_logs_user_created_idx (user_id, created_at DESC),
  CONSTRAINT activity_logs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
