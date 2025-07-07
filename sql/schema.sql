-- Database Schema for Property Stewards Inspector Interface

-- Create database
CREATE DATABASE IF NOT EXISTS property_stewards_db;
USE property_stewards_db;

-- Inspectors table
CREATE TABLE IF NOT EXISTS inspectors (
  inspector_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL UNIQUE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_whatsapp (whatsapp_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  client_id INT AUTO_INCREMENT PRIMARY KEY,
  client_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  contract_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  contract_type VARCHAR(50) NOT NULL,
  description TEXT,
  status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  cancellation_reason TEXT,
  report_sent TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Work orders table
CREATE TABLE IF NOT EXISTS work_orders (
  work_order_id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  inspector_id INT NOT NULL,
  scheduled_date DATETIME NOT NULL,
  status ENUM('scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE,
  FOREIGN KEY (inspector_id) REFERENCES inspectors(inspector_id) ON DELETE CASCADE,
  INDEX idx_inspector_date (inspector_id, scheduled_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contract checklists table
CREATE TABLE IF NOT EXISTS contract_checklists (
  checklist_id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  room_name VARCHAR(50) NOT NULL,
  task_name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
  completed_at DATETIME NULL,
  completed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES inspectors(inspector_id) ON DELETE SET NULL,
  INDEX idx_contract_room (contract_id, room_name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  inspector_id INT NOT NULL,
  contract_id INT NOT NULL,
  task_name VARCHAR(100),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inspector_id) REFERENCES inspectors(inspector_id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE,
  INDEX idx_contract_task (contract_id, task_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media table (stores images/videos as BLOB)
CREATE TABLE IF NOT EXISTS media (
  media_id INT AUTO_INCREMENT PRIMARY KEY,
  inspector_id INT NOT NULL,
  contract_id INT NULL,
  task_name VARCHAR(100) NULL,
  media_type ENUM('image', 'video') NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  file_data LONGBLOB NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspector_id) REFERENCES inspectors(inspector_id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,
  INDEX idx_contract_task (contract_id, task_name),
  INDEX idx_inspector (inspector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  inspector_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (inspector_id) REFERENCES inspectors(inspector_id) ON DELETE CASCADE,
  INDEX idx_inspector_active (inspector_id, is_active),
  INDEX idx_last_interaction (last_interaction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  sender ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  media_id INT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE SET NULL,
  INDEX idx_session_timestamp (session_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample inspector
INSERT INTO inspectors (name, email, whatsapp_number, status)
VALUES 
  ('John Smith', 'john.smith@propertystewards.com', '+1234567890', 'active'),
  ('Alice Johnson', 'alice.johnson@propertystewards.com', '+1987654321', 'active');

-- Insert sample client
INSERT INTO clients (client_name, phone, email, address)
VALUES 
  ('Mr. Tan', '+1122334455', 'tan@example.com', '123 Main St, Singapore'),
  ('Ms. Wong', '+1566778899', 'wong@example.com', '456 High St, Singapore');

-- Insert sample contract
INSERT INTO contracts (client_id, contract_type, description, status)
VALUES 
  (1, 'Inspection', 'Full property inspection for rental handover', 'active'),
  (2, 'Maintenance', 'Quarterly maintenance check', 'pending');

-- Insert sample work orders
INSERT INTO work_orders (contract_id, inspector_id, scheduled_date, status, notes)
VALUES 
  (1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'scheduled', 'Entry code: 1234'),
  (2, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'scheduled', 'Contact client before arrival');

-- Insert sample checklist items
INSERT INTO contract_checklists (contract_id, room_name, task_name, description, status)
VALUES 
  (1, 'Bedroom 1', 'Check windows', 'Inspect windows for damages and proper operation', 'pending'),
  (1, 'Bedroom 1', 'Check lights', 'Ensure all lights are working properly', 'pending'),
  (1, 'Bedroom 2', 'Check windows', 'Inspect windows for damages and proper operation', 'pending'),
  (1, 'Bedroom 2', 'Check lights', 'Ensure all lights are working properly', 'pending'),
  (1, 'Kitchen', 'Check appliances', 'Test all kitchen appliances', 'pending'),
  (1, 'Kitchen', 'Check plumbing', 'Inspect sink, faucet for leaks', 'pending');
