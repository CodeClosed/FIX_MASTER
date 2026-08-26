# FIX_MASTER — User Types & Role-Based Access Control (RBAC) Specification

## 1. Architectural Overview

In strict compliance with relational database normalization standards and the course rubric (*single users table with a ole discriminator*), all users in the system reside in a unified users table.

Role-specific attributes and permissions are enforced via application-level RBAC middleware and relational mapping tables (such as student_room_allotments and complaint_assignments).

`mermaid
classDiagram
    class User {
        +VARCHAR(36) user_id (PK)
        +VARCHAR(30) reg_or_emp_id (UNIQUE)
        +VARCHAR(100) full_name
        +VARCHAR(100) email (UNIQUE)
        +VARCHAR(15) phone_number
        +VARCHAR(255) password_hash
        +VARCHAR(20) role
        +VARCHAR(30) specialization
        +BOOLEAN is_available
        +TIMESTAMP created_at
    }
    User <|-- STUDENT : role='STUDENT'
    User <|-- STAFF : role='STAFF'
    User <|-- SUPERVISOR : role='SUPERVISOR'
    User <|-- ADMIN : role='ADMIN'
`

---

## 2. Detailed User Roles & Profiles

### 2.1. STUDENT (Hostel Resident)

- **Identity**: VIT Student Registration Number (e.g., 21BCE0843).
- **Allotment Context**: Linked via student_room_allotments to a specific Block and Room (e.g., L-843).
- **Capabilities & Permissions**:
  - **1-Click Quick Action**: Instant request for daily housekeeping and room cleaning.
  - **Structured Ticket Raising**: Submit detailed technical maintenance complaints (Electrical, AC, Carpentry, Plumbing) with description, optional photo URL, and preferred arrival time slot.
  - **Common Area Reporting**: Report broken or malfunctioning shared infrastructure (water coolers, common washrooms, lifts, corridor lights).
  - **Live Tracking**: View assigned technician details (Name, Specialization, Contact Number, Current Status).
  - **Verification & Rating**: Confirm completion of the job upon staff completion and provide a 1–5 star rating with optional feedback.
  - **History**: View past complaints history with complete audit timelines.

---

### 2.2. STAFF (Maintenance Personnel & Housekeeping)

- **Identity**: Employee ID (e.g., EMP_ELEC_04), with a defined skill specialization.
- **Specializations**:
  - **CLEANING**: Housekeeping, room sweeping, mopping, dusting, trash clearance.
  - **ELECTRICIAN**: Power sockets, switches, lights, fans, MCB breakers.
  - **CARPENTER**: Desks, chairs, wardrobes, door locks, window latches, beds.
  - **AC_TECH**: Air conditioners, HVAC units, cooling issues, filter cleaning.
  - **PLUMBER**: Water taps, geysers, flush tanks, clogged drainage, shower heads.
- **Capabilities & Permissions**:
  - **Smart Task Queue**: View tasks assigned to them, automatically sorted by **Floor and Room number** to minimize transit time.
  - **Status Transitions**: Transition tasks across lifecycle states (ASSIGNED -> IN_PROGRESS / Arrived -> PENDING_VERIFICATION / Work Done).
  - **Shift Availability**: Toggle status (is_available: On-Duty / Off-Duty / On-Break) for auto-dispatch algorithms.
  - **Decline / Escalate with Reason**: Flag issues that require replacement parts or higher-level intervention.

---

### 2.3. SUPERVISOR (Hostel Block Supervisor / Warden)

- **Identity**: Supervisor ID assigned to manage a specific hostel block (e.g., L_BLOCK).
- **Capabilities & Permissions**:
  - **Hostel Telemetry Dashboard**: Real-time overview of active, in-progress, pending, and escalated complaints across all floors in their block.
  - **Common Area Facility Management**: Monitor and prioritize public amenity issues (e.g., Water coolers down on Floor 8, Elevator maintenance).
  - **Manual Task Dispatch & Reassignment**: Override auto-dispatch when staff is bottlenecked, on leave, or when urgent escalation is required.
  - **SLA & Performance Monitoring**: View average resolution times, recurring defect hotspots, and staff workload distribution.
  - **Resolution Sign-off**: Close unresolved complaints or override student disputes.

---

### 2.4. ADMIN (Chief Warden / Estates & Maintenance Office)

- **Identity**: System Administrator account.
- **Capabilities & Permissions**:
  - **Infrastructure Configuration**: Add/manage hostel blocks, rooms, bed capacities, and common areas.
  - **User & Allotment Management**: Onboard supervisors, staff, and bulk-import student room allotments.
  - **Category & SLA Master Management**: Configure complaint categories, subcategories, target SLA hours, and priority weighting.
  - **System Audit & Maintenance**: Access full audit logs (complaint_logs), perform database backups (pg_dump), and restore data.

---

## 3. Database Schema Implementation (users Table)

`sql
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY, -- UUID v4
    reg_or_emp_id VARCHAR(30) UNIQUE NOT NULL, -- e.g., '21BCE0843' or 'EMP_ELEC_04'
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- BCrypt hashed password
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'SUPERVISOR', 'ADMIN')),
    specialization VARCHAR(30) CHECK (
        specialization IS NULL OR 
        specialization IN ('CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER')
    ),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

---

## 4. Role-Based Permissions Matrix

| Feature / Action | STUDENT | STAFF | SUPERVISOR | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Raise 1-Click Cleaning Request | Yes | No | No | No |
| Raise Technical Complaint (Room) | Yes | No | No | No |
| Raise Common Area Issue | Yes | Yes | Yes | Yes |
| View Personal Assigned Task Queue | No | Yes | No | No |
| Update Task Status (In-Progress / Done) | No | Yes | No | No |
| Confirm Resolution & Rate Service | Yes | No | No | No |
| View Block Analytics & Heatmaps | No | No | Yes | Yes |
| Reassign / Dispatch Tasks Manually | No | No | Yes | Yes |
| Manage Blocks, Rooms & Categories | No | No | No | Yes |
| Manage User Accounts & Staff | No | No | No | Yes |
| Access Database Backup & Recovery | No | No | No | Yes |
