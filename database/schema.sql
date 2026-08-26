-- ============================================================================
-- FIX_MASTER: Relational Database Schema Specification
-- Course: BCSE307L - Database Systems (SCOPE, VIT Vellore)
-- Database Engine: PostgreSQL 15+
-- Normalized to 3NF / BCNF
-- ============================================================================

-- Enable UUID extension for globally unique primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS complaint_logs CASCADE;
DROP TABLE IF EXISTS complaint_feedback CASCADE;
DROP TABLE IF EXISTS complaint_assignments CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS complaint_subcategories CASCADE;
DROP TABLE IF EXISTS complaint_categories CASCADE;
DROP TABLE IF EXISTS student_room_allotments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS common_areas CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS hostel_blocks CASCADE;

-- ============================================================================
-- 1. INFRASTRUCTURE & SPATIAL HIERARCHY
-- ============================================================================

-- 1. Hostel Blocks Master Table
CREATE TABLE hostel_blocks (
    block_id VARCHAR(10) PRIMARY KEY,
    block_name VARCHAR(50) NOT NULL,
    total_floors INT NOT NULL CHECK (total_floors > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Hostel Rooms Table
CREATE TABLE rooms (
    room_id VARCHAR(20) PRIMARY KEY, -- e.g. 'L-843'
    block_id VARCHAR(10) NOT NULL REFERENCES hostel_blocks(block_id) ON DELETE CASCADE,
    room_number VARCHAR(10) NOT NULL,
    floor_number INT NOT NULL CHECK (floor_number >= 0),
    room_type VARCHAR(20) DEFAULT 'NON_AC' CHECK (room_type IN ('AC', 'NON_AC', 'DELUXE_AC')),
    bed_capacity INT DEFAULT 3 CHECK (bed_capacity BETWEEN 1 AND 6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_block_room UNIQUE (block_id, room_number)
);

-- 3. Common Areas & Public Facilities Table
CREATE TABLE common_areas (
    area_id VARCHAR(30) PRIMARY KEY, -- e.g. 'L-F08-COOLER-01'
    block_id VARCHAR(10) NOT NULL REFERENCES hostel_blocks(block_id) ON DELETE CASCADE,
    floor_number INT NOT NULL,
    area_type VARCHAR(50) NOT NULL CHECK (
        area_type IN ('WATER_COOLER', 'COMMON_WASHROOM', 'SHOWER_ROOM', 'ELEVATOR', 'CORRIDOR', 'STUDY_HALL')
    ),
    description VARCHAR(150) NOT NULL,
    is_operational BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 2. USER MANAGEMENT & RBAC (SINGLE USERS TABLE)
-- ============================================================================

-- 4. Unified Users Table
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    reg_or_emp_id VARCHAR(30) UNIQUE NOT NULL, -- Student RegNo or Staff Employee ID
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'SUPERVISOR', 'ADMIN')),
    specialization VARCHAR(30) CHECK (
        specialization IS NULL OR 
        specialization IN ('CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER')
    ),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Student Room Allotment Table
CREATE TABLE student_room_allotments (
    allotment_id SERIAL PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id VARCHAR(20) NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    academic_year VARCHAR(10) NOT NULL, -- e.g. '2026-2027'
    is_current BOOLEAN DEFAULT TRUE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT uq_student_active_allotment UNIQUE (student_id, is_current)
);

-- ============================================================================
-- 3. CATEGORIES & TAXONOMY
-- ============================================================================

-- 6. Complaint Categories Master
CREATE TABLE complaint_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(30) UNIQUE NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    is_quick_action BOOLEAN DEFAULT FALSE,
    default_sla_hours INT NOT NULL DEFAULT 24 CHECK (default_sla_hours > 0)
);

-- 7. Granular Complaint Subcategories & Fault Types
CREATE TABLE complaint_subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES complaint_categories(category_id) ON DELETE CASCADE,
    subcategory_code VARCHAR(30) UNIQUE NOT NULL,
    issue_name VARCHAR(100) NOT NULL,
    estimated_resolution_mins INT DEFAULT 30 CHECK (estimated_resolution_mins > 0),
    priority_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    required_specialization VARCHAR(30) NOT NULL CHECK (
        required_specialization IN ('CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER')
    )
);

-- ============================================================================
-- 4. COMPLAINTS, DISPATCH & FEEDBACK
-- ============================================================================

-- 8. Core Complaints Registry
CREATE TABLE complaints (
    complaint_id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ticket_scope VARCHAR(15) NOT NULL CHECK (ticket_scope IN ('ROOM', 'COMMON_AREA')),
    room_id VARCHAR(20) REFERENCES rooms(room_id) ON DELETE SET NULL,
    common_area_id VARCHAR(30) REFERENCES common_areas(area_id) ON DELETE SET NULL,
    block_id VARCHAR(10) NOT NULL REFERENCES hostel_blocks(block_id) ON DELETE RESTRICT,
    raised_by_user_id VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    subcategory_id INT NOT NULL REFERENCES complaint_subcategories(subcategory_id) ON DELETE RESTRICT,
    description TEXT,
    photo_evidence_url VARCHAR(255),
    status VARCHAR(25) NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'ESCALATED', 'REJECTED')
    ),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    preferred_timeslot VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_complaint_location CHECK (
        (ticket_scope = 'ROOM' AND room_id IS NOT NULL AND common_area_id IS NULL) OR
        (ticket_scope = 'COMMON_AREA' AND common_area_id IS NOT NULL)
    )
);

-- 9. Staff Task Dispatch Queue
CREATE TABLE complaint_assignments (
    assignment_id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    staff_user_id VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_by_user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    work_completed_at TIMESTAMP WITH TIME ZONE,
    current_state VARCHAR(20) DEFAULT 'ASSIGNED' CHECK (
        current_state IN ('ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'DONE', 'DECLINED')
    )
);

-- 10. Student Closed-Loop Verification & Feedback
CREATE TABLE complaint_feedback (
    feedback_id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(36) UNIQUE NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    is_satisfactorily_resolved BOOLEAN NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    student_comments TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Immutable Complaint Audit Trail
CREATE TABLE complaint_logs (
    log_id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    changed_by_user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL,
    previous_status VARCHAR(25),
    new_status VARCHAR(25) NOT NULL,
    action_note TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_complaints_block_status ON complaints(block_id, status);
CREATE INDEX idx_complaints_raised_by ON complaints(raised_by_user_id, status);
CREATE INDEX idx_complaints_room ON complaints(room_id);
CREATE INDEX idx_assignments_staff_state ON complaint_assignments(staff_user_id, current_state);
CREATE INDEX idx_users_staff_dispatch ON users(role, specialization, is_available) WHERE role = 'STAFF';
