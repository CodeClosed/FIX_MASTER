# FIX_MASTER — Database Implementation Specification (Section 3: 8 Marks)

> **Course Code**: BCSE307L – Database Systems  
> **Topic**: Relational Database Implementation, DDL, Triggers, Stored Procedures, Views, Aggregate Queries, ACID Transactions & ORM Integration  
> **Database Engine**: PostgreSQL 16 (Relational / ACID-Compliant)  
> **ORM**: Prisma ORM v5+  

---

## 1. Database Creation & Schema Definition (DDL)

The database schema comprises **11 normalized tables** enforcing strict domain constraints, foreign key referential integrity, and cascading behaviors.

```sql
-- Database Initialization (PostgreSQL)
CREATE DATABASE fix_master_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;

\c fix_master_db;

-- Enable UUID extension for globally unique primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 1.1 Infrastructure & Spatial Hierarchy

```sql
-- 1. Hostel Blocks Master
CREATE TABLE hostel_blocks (
    block_id VARCHAR(10) PRIMARY KEY, -- e.g., 'L_BLOCK', 'PRP'
    block_name VARCHAR(50) NOT NULL,
    total_floors INT NOT NULL CHECK (total_floors > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table
CREATE TABLE rooms (
    room_id VARCHAR(20) PRIMARY KEY, -- e.g., 'L-843'
    block_id VARCHAR(10) NOT NULL REFERENCES hostel_blocks(block_id) ON DELETE CASCADE,
    room_number VARCHAR(10) NOT NULL,
    floor_number INT NOT NULL CHECK (floor_number >= 0),
    room_type VARCHAR(20) DEFAULT 'NON_AC' CHECK (room_type IN ('AC', 'NON_AC', 'DELUXE_AC')),
    bed_capacity INT DEFAULT 3 CHECK (bed_capacity BETWEEN 1 AND 6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_block_room UNIQUE (block_id, room_number)
);

-- 3. Common Areas Table (Shared Utilities)
CREATE TABLE common_areas (
    area_id VARCHAR(30) PRIMARY KEY, -- e.g., 'L-F08-COOLER-01'
    block_id VARCHAR(10) NOT NULL REFERENCES hostel_blocks(block_id) ON DELETE CASCADE,
    floor_number INT NOT NULL,
    area_type VARCHAR(50) NOT NULL CHECK (
        area_type IN ('WATER_COOLER', 'COMMON_WASHROOM', 'SHOWER_ROOM', 'ELEVATOR', 'CORRIDOR', 'STUDY_HALL')
    ),
    description VARCHAR(150) NOT NULL,
    is_operational BOOLEAN DEFAULT TRUE
);
```

### 1.2 User Management & Single `users` Table RBAC

```sql
-- 4. Unified Users Table (Adhering strictly to BCSE307L Rubric)
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    reg_or_emp_id VARCHAR(30) UNIQUE NOT NULL, -- '21BCE0843' (Student) / 'EMP_ELEC_04' (Staff)
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'SUPERVISOR', 'ADMIN')),
    specialization VARCHAR(30) CHECK (
        specialization IS NULL OR 
        specialization IN ('CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER')
    ),
    is_available BOOLEAN DEFAULT TRUE, -- Duty availability status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Student Room Allotment Mapping
CREATE TABLE student_room_allotments (
    allotment_id SERIAL PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id VARCHAR(20) NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    academic_year VARCHAR(10) NOT NULL, -- e.g. '2026-2027'
    is_current BOOLEAN DEFAULT TRUE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT uq_student_active_allotment UNIQUE (student_id, is_current)
);
```

### 1.3 Categories & Service Domain Master

```sql
-- 6. High-Level Complaint Categories
CREATE TABLE complaint_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(30) UNIQUE NOT NULL, -- 'CLEANING', 'ELECTRICAL', 'CARPENTER', etc.
    category_name VARCHAR(50) NOT NULL,
    is_quick_action BOOLEAN DEFAULT FALSE,     -- TRUE for 1-Click Room Cleaning
    default_sla_hours INT NOT NULL DEFAULT 24 CHECK (default_sla_hours > 0)
);

-- 7. Granular Subcategories / Issue Catalog
CREATE TABLE complaint_subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES complaint_categories(category_id) ON DELETE CASCADE,
    subcategory_code VARCHAR(30) UNIQUE NOT NULL, -- 'ELEC_SOCKET', 'CLN_ROOM_SWEEP', etc.
    issue_name VARCHAR(100) NOT NULL,
    estimated_resolution_mins INT DEFAULT 30 CHECK (estimated_resolution_mins > 0),
    priority_level VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    required_specialization VARCHAR(30) NOT NULL CHECK (
        required_specialization IN ('CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER')
    )
);
```

### 1.4 Complaints, Task Dispatch, Feedback & Audit Logging

```sql
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
    -- Integrity Constraint: Must have either room_id OR common_area_id
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
    assigned_by_user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL, -- NULL = Auto-Assigned
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
```

---

## 2. Performance Indexes

```sql
-- Optimize queries filtering active tickets by block and status
CREATE INDEX idx_complaints_block_status ON complaints(block_id, status);

-- Optimize student dashboard queries looking up user's active/past tickets
CREATE INDEX idx_complaints_raised_by_status ON complaints(raised_by_user_id, status);

-- Optimize room lookup for floor aggregation
CREATE INDEX idx_complaints_room ON complaints(room_id);

-- Optimize staff queue queries by staff ID and task state
CREATE INDEX idx_assignments_staff_state ON complaint_assignments(staff_user_id, current_state);

-- Optimize staff lookup during auto-dispatch algorithms
CREATE INDEX idx_users_staff_dispatch ON users(role, specialization, is_available) 
WHERE role = 'STAFF';
```

---

## 3. Database Views (Analytical & Operational)

### 3.1 View 1: Floor-Optimized Staff Task Queue
Technicians require a sorted queue ordering rooms ascending by floor to prevent unnecessary elevator trips.

```sql
CREATE OR REPLACE VIEW view_staff_active_queue AS
SELECT 
    ca.assignment_id,
    ca.staff_user_id,
    u_staff.full_name AS staff_name,
    u_staff.specialization,
    c.complaint_id,
    c.ticket_scope,
    COALESCE(r.room_number, ca_area.description) AS location_identifier,
    COALESCE(r.floor_number, ca_area.floor_number) AS floor_number,
    c.priority,
    cat.category_name,
    sub.issue_name,
    c.status,
    ca.current_state AS assignment_state,
    ca.assigned_at,
    u_student.full_name AS student_name,
    u_student.phone_number AS student_phone
FROM complaint_assignments ca
JOIN complaints c ON ca.complaint_id = c.complaint_id
JOIN users u_staff ON ca.staff_user_id = u_staff.user_id
JOIN users u_student ON c.raised_by_user_id = u_student.user_id
JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
JOIN complaint_categories cat ON sub.category_id = cat.category_id
LEFT JOIN rooms r ON c.room_id = r.room_id
LEFT JOIN common_areas ca_area ON c.common_area_id = ca_area.area_id
WHERE c.status IN ('ASSIGNED', 'IN_PROGRESS')
ORDER BY 
    COALESCE(r.floor_number, ca_area.floor_number) ASC,
    CASE c.priority 
        WHEN 'EMERGENCY' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
    END ASC,
    ca.assigned_at ASC;
```

### 3.2 View 2: Block Supervisor Real-Time KPI Dashboard
Provides instantaneous block-wide telemetry on open, pending, completed, and common-area tickets.

```sql
CREATE OR REPLACE VIEW view_block_supervisor_summary AS
SELECT 
    b.block_id,
    b.block_name,
    COUNT(c.complaint_id) AS total_complaints,
    COUNT(CASE WHEN c.status IN ('OPEN', 'ASSIGNED') THEN 1 END) AS pending_complaints,
    COUNT(CASE WHEN c.status = 'IN_PROGRESS' THEN 1 END) AS active_in_progress,
    COUNT(CASE WHEN c.status = 'PENDING_VERIFICATION' THEN 1 END) AS awaiting_student_verification,
    COUNT(CASE WHEN c.status = 'COMPLETED' THEN 1 END) AS resolved_count,
    COUNT(CASE WHEN c.status = 'ESCALATED' THEN 1 END) AS escalated_count,
    COUNT(CASE WHEN c.ticket_scope = 'COMMON_AREA' THEN 1 END) AS common_area_issues,
    ROUND(AVG(fb.rating), 2) AS average_student_rating
FROM hostel_blocks b
LEFT JOIN complaints c ON b.block_id = c.block_id
LEFT JOIN complaint_feedback fb ON c.complaint_id = fb.complaint_id
GROUP BY b.block_id, b.block_name;
```

### 3.3 View 3: Recurring Defect & Hotspot Outage Monitor
Flags common areas or room clusters that have suffered $\ge 3$ complaints within the last 14 days.

```sql
CREATE OR REPLACE VIEW view_recurring_defects_alert AS
SELECT 
    c.block_id,
    c.ticket_scope,
    COALESCE(r.room_number, ca_area.description) AS asset_location,
    cat.category_name,
    COUNT(c.complaint_id) AS incident_count_14_days,
    MAX(c.created_at) AS most_recent_incident
FROM complaints c
JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
JOIN complaint_categories cat ON sub.category_id = cat.category_id
LEFT JOIN rooms r ON c.room_id = r.room_id
LEFT JOIN common_areas ca_area ON c.common_area_id = ca_area.area_id
WHERE c.created_at >= (CURRENT_TIMESTAMP - INTERVAL '14 days')
GROUP BY c.block_id, c.ticket_scope, asset_location, cat.category_name
HAVING COUNT(c.complaint_id) >= 3
ORDER BY incident_count_14_days DESC;
```

---

## 4. Database Triggers (Automated Audit & State Control)

### 4.1 Trigger 1: Automated Audit Logging on Complaint Status Transitions
Whenever `complaints.status` changes, an immutable entry is recorded in `complaint_logs`.

```sql
CREATE OR REPLACE FUNCTION fn_audit_complaint_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO complaint_logs (
            complaint_id,
            changed_by_user_id,
            previous_status,
            new_status,
            action_note
        )
        VALUES (
            NEW.complaint_id,
            NULL, -- Set by app context or trigger
            OLD.status,
            NEW.status,
            CONCAT('Status updated from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_status_audit
AFTER UPDATE OF status ON complaints
FOR EACH ROW
EXECUTE FUNCTION fn_audit_complaint_status_change();
```

### 4.2 Trigger 2: Auto-Update Timestamp Constraints
Ensures `resolved_at` is set when staff finishes work, and `closed_at` is set when student confirms.

```sql
CREATE OR REPLACE FUNCTION fn_update_complaint_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'PENDING_VERIFICATION' AND OLD.status != 'PENDING_VERIFICATION' THEN
        NEW.resolved_at = CURRENT_TIMESTAMP;
    ELSIF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        NEW.closed_at = CURRENT_TIMESTAMP;
        IF NEW.resolved_at IS NULL THEN
            NEW.resolved_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_complaint_timestamps
BEFORE UPDATE OF status ON complaints
FOR EACH ROW
EXECUTE FUNCTION fn_update_complaint_timestamps();
```

---

## 5. Stored Procedures & ACID Transactions

### 5.1 Stored Procedure 1: 1-Click Auto-Dispatch for Cleaning Tasks
Finds the on-duty cleaning staff member with the lowest active workload and automatically creates the assignment transaction.

```sql
CREATE OR REPLACE PROCEDURE sp_auto_dispatch_cleaning(
    p_complaint_id VARCHAR(36)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_assigned_staff_id VARCHAR(36);
BEGIN
    -- 1. Find the available cleaning staff with minimum active assignments
    SELECT u.user_id INTO v_assigned_staff_id
    FROM users u
    LEFT JOIN complaint_assignments ca 
        ON u.user_id = ca.staff_user_id 
        AND ca.current_state IN ('ASSIGNED', 'IN_PROGRESS')
    WHERE u.role = 'STAFF' 
      AND u.specialization = 'CLEANING' 
      AND u.is_available = TRUE
    GROUP BY u.user_id
    ORDER BY COUNT(ca.assignment_id) ASC, u.created_at ASC
    LIMIT 1;

    IF v_assigned_staff_id IS NULL THEN
        -- Leave status as OPEN if no staff is on duty
        UPDATE complaints 
        SET status = 'OPEN' 
        WHERE complaint_id = p_complaint_id;
    ELSE
        -- Atomic assignment transaction
        INSERT INTO complaint_assignments (complaint_id, staff_user_id, current_state)
        VALUES (p_complaint_id, v_assigned_staff_id, 'ASSIGNED');

        UPDATE complaints 
        SET status = 'ASSIGNED' 
        WHERE complaint_id = p_complaint_id;
    END IF;
END;
$$;
```

### 5.2 Stored Procedure 2: Atomic Closed-Loop Resolution Verification
Performs atomic verification ensuring that student ownership is validated, feedback rating is recorded, and the complaint is sealed.

```sql
CREATE OR REPLACE PROCEDURE sp_confirm_resolution(
    p_complaint_id VARCHAR(36),
    p_student_id VARCHAR(36),
    p_is_satisfied BOOLEAN,
    p_rating INT,
    p_comments TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ticket_student_id VARCHAR(36);
    v_current_status VARCHAR(25);
BEGIN
    -- 1. Validate ownership & status
    SELECT raised_by_user_id, status 
    INTO v_ticket_student_id, v_current_status
    FROM complaints 
    WHERE complaint_id = p_complaint_id;

    IF v_ticket_student_id IS NULL THEN
        RAISE EXCEPTION 'Complaint ID % does not exist', p_complaint_id;
    END IF;

    IF v_ticket_student_id != p_student_id THEN
        RAISE EXCEPTION 'Security Violation: User % is not authorized to close complaint %', p_student_id, p_complaint_id;
    END IF;

    IF v_current_status != 'PENDING_VERIFICATION' THEN
        RAISE EXCEPTION 'Cannot verify complaint in % state. Must be PENDING_VERIFICATION', v_current_status;
    END IF;

    -- 2. Insert feedback record
    INSERT INTO complaint_feedback (
        complaint_id,
        student_id,
        is_satisfactorily_resolved,
        rating,
        student_comments
    )
    VALUES (
        p_complaint_id,
        p_student_id,
        p_is_satisfied,
        p_rating,
        p_comments
    );

    -- 3. Transition complaint state
    IF p_is_satisfied = TRUE THEN
        UPDATE complaints 
        SET status = 'COMPLETED', closed_at = CURRENT_TIMESTAMP 
        WHERE complaint_id = p_complaint_id;

        UPDATE complaint_assignments 
        SET current_state = 'DONE', work_completed_at = CURRENT_TIMESTAMP 
        WHERE complaint_id = p_complaint_id;
    ELSE
        -- If student marks unsatisfied, escalate ticket
        UPDATE complaints 
        SET status = 'ESCALATED' 
        WHERE complaint_id = p_complaint_id;

        UPDATE complaint_assignments 
        SET current_state = 'DECLINED' 
        WHERE complaint_id = p_complaint_id;
    END IF;
END;
$$;
```

---

## 6. Complex Joins & Aggregate Reporting Queries

### 6.1 Multi-Table Inner & Outer Joins (Student Active Ticket View)
```sql
SELECT 
    c.complaint_id,
    c.ticket_scope,
    r.room_number,
    r.floor_number,
    cat.category_name,
    sub.issue_name,
    c.status,
    c.priority,
    c.created_at,
    u_staff.full_name AS assigned_technician_name,
    u_staff.phone_number AS technician_contact,
    ca.current_state AS technician_status
FROM complaints c
JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
JOIN complaint_categories cat ON sub.category_id = cat.category_id
LEFT JOIN rooms r ON c.room_id = r.room_id
LEFT JOIN complaint_assignments ca ON c.complaint_id = ca.complaint_id AND ca.current_state != 'DECLINED'
LEFT JOIN users u_staff ON ca.staff_user_id = u_staff.user_id
WHERE c.raised_by_user_id = 'c101a97d-65df-4d51-8d2a-c2bb47500001'
ORDER BY c.created_at DESC;
```

### 6.2 Aggregate SLA Performance & Average Resolution Time
```sql
SELECT 
    cat.category_name,
    COUNT(c.complaint_id) AS total_closed_tickets,
    cat.default_sla_hours,
    ROUND(AVG(EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/3600)::numeric, 2) AS avg_resolution_hours,
    COUNT(CASE 
        WHEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/3600 > cat.default_sla_hours THEN 1 
    END) AS sla_breaches_count,
    ROUND(AVG(fb.rating), 2) AS avg_student_rating
FROM complaints c
JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
JOIN complaint_categories cat ON sub.category_id = cat.category_id
JOIN complaint_feedback fb ON c.complaint_id = fb.complaint_id
WHERE c.status = 'COMPLETED'
GROUP BY cat.category_id, cat.category_name, cat.default_sla_hours
ORDER BY avg_resolution_hours DESC;
```

---

## 7. Prisma ORM Schema Mapping (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  STUDENT
  STAFF
  SUPERVISOR
  ADMIN
}

enum Specialization {
  CLEANING
  ELECTRICIAN
  CARPENTER
  AC_TECH
  PLUMBER
}

enum ComplaintStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  PENDING_VERIFICATION
  COMPLETED
  ESCALATED
  REJECTED
}

enum PriorityLevel {
  LOW
  MEDIUM
  HIGH
  EMERGENCY
}

model User {
  userId         String                  @id @default(uuid()) @map("user_id")
  regOrEmpId     String                  @unique @map("reg_or_emp_id")
  fullName       String                  @map("full_name")
  email          String                  @unique
  phoneNumber    String                  @map("phone_number")
  passwordHash   String                  @map("password_hash")
  role           UserRole
  specialization Specialization?
  isAvailable    Boolean                 @default(true) @map("is_available")
  createdAt      DateTime                @default(now()) @map("created_at")

  allotments     StudentRoomAllotment[]
  complaints     Complaint[]             @relation("RaisedByStudent")
  assignments    ComplaintAssignment[]   @relation("AssignedToStaff")
  dispatchedBy   ComplaintAssignment[]   @relation("DispatchedBySupervisor")
  feedback       ComplaintFeedback[]
  auditLogs      ComplaintLog[]

  @@map("users")
}

model HostelBlock {
  blockId     String       @id @map("block_id")
  blockName   String       @map("block_name")
  totalFloors Int          @map("total_floors")
  createdAt   DateTime     @default(now()) @map("created_at")

  rooms       Room[]
  commonAreas CommonArea[]
  complaints  Complaint[]

  @@map("hostel_blocks")
}

model Room {
  roomId      String       @id @map("room_id")
  blockId     String       @map("block_id")
  roomNumber  String       @map("room_number")
  floorNumber Int          @map("floor_number")
  roomType    String       @default("NON_AC") @map("room_type")
  bedCapacity Int          @default(3) @map("bed_capacity")
  isActive    Boolean      @default(true) @map("is_active")
  createdAt   DateTime     @default(now()) @map("created_at")

  block       HostelBlock  @relation(fields: [blockId], references: [blockId], onDelete: Cascade)
  allotments  StudentRoomAllotment[]
  complaints  Complaint[]

  @@unique([blockId, roomNumber])
  @@map("rooms")
}

model CommonArea {
  areaId        String      @id @map("area_id")
  blockId       String      @map("block_id")
  floorNumber   Int         @map("floor_number")
  areaType      String      @map("area_type")
  description   String
  isOperational Boolean     @default(true) @map("is_operational")

  block         HostelBlock @relation(fields: [blockId], references: [blockId], onDelete: Cascade)
  complaints    Complaint[]

  @@map("common_areas")
}

model StudentRoomAllotment {
  allotmentId  Int      @id @default(autoincrement()) @map("allotment_id")
  studentId    String   @map("student_id")
  roomId       String   @map("room_id")
  academicYear String   @map("academic_year")
  isCurrent    Boolean  @default(true) @map("is_current")

  student      User     @relation(fields: [studentId], references: [userId], onDelete: Cascade)
  room         Room     @relation(fields: [roomId], references: [roomId], onDelete: Restrict)

  @@unique([studentId, isCurrent])
  @@map("student_room_allotments")
}

model ComplaintCategory {
  categoryId     Int                    @id @default(autoincrement()) @map("category_id")
  categoryCode   String                 @unique @map("category_code")
  categoryName   String                 @map("category_name")
  isQuickAction  Boolean                @default(false) @map("is_quick_action")
  defaultSlaHours Int                   @default(24) @map("default_sla_hours")

  subcategories  ComplaintSubcategory[]

  @@map("complaint_categories")
}

model ComplaintSubcategory {
  subcategoryId           Int               @id @default(autoincrement()) @map("subcategory_id")
  categoryId              Int               @map("category_id")
  subcategoryCode         String            @unique @map("subcategory_code")
  issueName               String            @map("issue_name")
  estimatedResolutionMins Int               @default(30) @map("estimated_resolution_mins")
  priorityLevel           PriorityLevel     @default(MEDIUM) @map("priority_level")
  requiredSpecialization  Specialization    @map("required_specialization")

  category                ComplaintCategory @relation(fields: [categoryId], references: [categoryId], onDelete: Cascade)
  complaints              Complaint[]

  @@map("complaint_subcategories")
}

model Complaint {
  complaintId       String               @id @default(uuid()) @map("complaint_id")
  ticketScope       String               @map("ticket_scope")
  roomId            String?              @map("room_id")
  commonAreaId      String?              @map("common_area_id")
  blockId           String               @map("block_id")
  raisedByUserId    String               @map("raised_by_user_id")
  subcategoryId     Int                  @map("subcategory_id")
  description       String?
  photoEvidenceUrl  String?              @map("photo_evidence_url")
  status            ComplaintStatus      @default(OPEN)
  priority          PriorityLevel        @default(MEDIUM)
  preferredTimeslot String?              @map("preferred_timeslot")
  createdAt         DateTime             @default(now()) @map("created_at")
  resolvedAt        DateTime?            @map("resolved_at")
  closedAt          DateTime?            @map("closed_at")

  block             HostelBlock          @relation(fields: [blockId], references: [blockId], onDelete: Restrict)
  room              Room?                @relation(fields: [roomId], references: [roomId])
  commonArea        CommonArea?          @relation(fields: [commonAreaId], references: [areaId])
  raisedBy          User                 @relation("RaisedByStudent", fields: [raisedByUserId], references: [userId], onDelete: Restrict)
  subcategory       ComplaintSubcategory @relation(fields: [subcategoryId], references: [subcategoryId], onDelete: Restrict)

  assignments       ComplaintAssignment[]
  feedback          ComplaintFeedback?
  logs              ComplaintLog[]

  @@map("complaints")
}

model ComplaintAssignment {
  assignmentId       Int       @id @default(autoincrement()) @map("assignment_id")
  complaintId        String    @map("complaint_id")
  staffUserId        String    @map("staff_user_id")
  assignedByUserId   String?   @map("assigned_by_user_id")
  assignedAt         DateTime  @default(now()) @map("assigned_at")
  startedAt          DateTime? @map("started_at")
  workCompletedAt    DateTime? @map("work_completed_at")
  currentState       String    @default("ASSIGNED") @map("current_state")

  complaint          Complaint @relation(fields: [complaintId], references: [complaintId], onDelete: Cascade)
  staff              User      @relation("AssignedToStaff", fields: [staffUserId], references: [userId], onDelete: Restrict)
  assignedBy         User?     @relation("DispatchedBySupervisor", fields: [assignedByUserId], references: [userId])

  @@map("complaint_assignments")
}

model ComplaintFeedback {
  feedbackId               Int       @id @default(autoincrement()) @map("feedback_id")
  complaintId              String    @unique @map("complaint_id")
  studentId                String    @map("student_id")
  isSatisfactorilyResolved Boolean   @map("is_satisfactorily_resolved")
  rating                   Int?
  studentComments          String?   @map("student_comments")
  verifiedAt               DateTime  @default(now()) @map("verified_at")

  complaint                Complaint @relation(fields: [complaintId], references: [complaintId], onDelete: Cascade)
  student                  User      @relation(fields: [studentId], references: [userId], onDelete: Restrict)

  @@map("complaint_feedback")
}

model ComplaintLog {
  logId            Int       @id @default(autoincrement()) @map("log_id")
  complaintId      String    @map("complaint_id")
  changedByUserId  String?   @map("changed_by_user_id")
  previousStatus   String?   @map("previous_status")
  newStatus        String    @map("new_status")
  actionNote       String?   @map("action_note")
  timestamp        DateTime  @default(now())

  complaint        Complaint @relation(fields: [complaintId], references: [complaintId], onDelete: Cascade)
  changedBy        User?     @relation(fields: [changedByUserId], references: [userId])

  @@map("complaint_logs")
}
```
