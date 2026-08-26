# FIX_MASTER — Entity-Relationship (ER) Models & Diagrammatic Specification

> **Course Code**: BCSE307L – Database Systems  
> **Topic**: Conceptual, Logical, and Physical ER Modeling & Normalization Proofs (Section 2: 6 Marks)  
> **Notation Styles**: Crow's Foot Notation, Chen's ER Model, Relational Schema Dependency Graph  

---

## 1. Complete System Conceptual ER Diagram (Crow's Foot Notation)

This diagram visualizes all 11 core entities, their primary/foreign key attributes, and precise relational cardinalities:

```mermaid
erDiagram
    HOSTEL_BLOCKS ||--|{ ROOMS : "contains (1:N)"
    HOSTEL_BLOCKS ||--o{ COMMON_AREAS : "contains (1:N)"
    HOSTEL_BLOCKS ||--o{ COMPLAINTS : "logged_for (1:N)"

    ROOMS ||--o{ STUDENT_ROOM_ALLOTMENTS : "allotted_in (1:N)"
    ROOMS ||--o{ COMPLAINTS : "target_location (1:N)"

    COMMON_AREAS ||--o{ COMPLAINTS : "target_facility (1:N)"

    USERS ||--o{ STUDENT_ROOM_ALLOTMENTS : "resides_as (1:N)"
    USERS ||--o{ COMPLAINTS : "raises_ticket (1:N)"
    USERS ||--o{ COMPLAINT_ASSIGNMENTS : "assigned_staff (1:N)"
    USERS ||--o{ COMPLAINT_ASSIGNMENTS : "dispatched_by_supervisor (0:N)"
    USERS ||--o{ COMPLAINT_LOGS : "performed_action (0:N)"
    USERS ||--o{ COMPLAINT_FEEDBACK : "submits_rating (1:N)"

    COMPLAINT_CATEGORIES ||--|{ COMPLAINT_SUBCATEGORIES : "classifies_into (1:N)"
    COMPLAINT_SUBCATEGORIES ||--o{ COMPLAINTS : "specifies_fault (1:N)"

    COMPLAINTS ||--o{ COMPLAINT_ASSIGNMENTS : "routed_to (1:N)"
    COMPLAINTS ||--o| COMPLAINT_FEEDBACK : "verified_via (1:1)"
    COMPLAINTS ||--o{ COMPLAINT_LOGS : "audit_history (1:N)"

    HOSTEL_BLOCKS {
        VARCHAR(10) block_id PK "Block code e.g. L_BLOCK"
        VARCHAR(50) block_name "Full name"
        INT total_floors "Floor count"
        TIMESTAMP created_at "Creation timestamp"
    }

    ROOMS {
        VARCHAR(20) room_id PK "Unique room e.g. L-843"
        VARCHAR(10) block_id FK "References HOSTEL_BLOCKS"
        VARCHAR(10) room_number "Room No e.g. 843"
        INT floor_number "Floor index"
        VARCHAR(20) room_type "AC / NON_AC"
        INT bed_capacity "1 to 6 beds"
        BOOLEAN is_active "Operational flag"
    }

    COMMON_AREAS {
        VARCHAR(30) area_id PK "Asset tag e.g. L-F08-COOLER-01"
        VARCHAR(10) block_id FK "References HOSTEL_BLOCKS"
        INT floor_number "Floor index"
        VARCHAR(50) area_type "COOLER / WASHROOM / LIFT"
        VARCHAR(150) description "Location notes"
        BOOLEAN is_operational "Asset status"
    }

    USERS {
        VARCHAR(36) user_id PK "UUID v4"
        VARCHAR(30) reg_or_emp_id UK "VIT Reg / Staff ID"
        VARCHAR(100) full_name "User name"
        VARCHAR(100) email UK "Institutional email"
        VARCHAR(15) phone_number "Contact mobile"
        VARCHAR(255) password_hash "BCrypt hashed password"
        VARCHAR(20) role "STUDENT / STAFF / SUPERVISOR / ADMIN"
        VARCHAR(30) specialization "CLEANING / ELEC / CARP / AC / PLUMB"
        BOOLEAN is_available "On-Duty availability toggle"
    }

    STUDENT_ROOM_ALLOTMENTS {
        INT allotment_id PK "Serial ID"
        VARCHAR(36) student_id FK "References USERS"
        VARCHAR(20) room_id FK "References ROOMS"
        VARCHAR(10) academic_year "e.g. 2026-2027"
        BOOLEAN is_current "Active semester flag"
    }

    COMPLAINT_CATEGORIES {
        INT category_id PK "Serial ID"
        VARCHAR(30) category_code UK "CLEANING / ELECTRICAL"
        VARCHAR(50) category_name "Display label"
        BOOLEAN is_quick_action "1-Click flag"
        INT default_sla_hours "Resolution target in hrs"
    }

    COMPLAINT_SUBCATEGORIES {
        INT subcategory_id PK "Serial ID"
        INT category_id FK "References COMPLAINT_CATEGORIES"
        VARCHAR(30) subcategory_code UK "ELEC_SOCKET / CLN_SWEEP"
        VARCHAR(100) issue_name "Issue description"
        INT estimated_resolution_mins "Expected duration"
        VARCHAR(10) priority_level "LOW / MED / HIGH / EMERGENCY"
        VARCHAR(30) required_specialization "Target staff skill"
    }

    COMPLAINTS {
        VARCHAR(36) complaint_id PK "UUID v4"
        VARCHAR(15) ticket_scope "ROOM / COMMON_AREA"
        VARCHAR(20) room_id FK "Nullable if COMMON_AREA"
        VARCHAR(30) common_area_id FK "Nullable if ROOM"
        VARCHAR(10) block_id FK "References HOSTEL_BLOCKS"
        VARCHAR(36) raised_by_user_id FK "References USERS"
        INT subcategory_id FK "References COMPLAINT_SUBCATEGORIES"
        TEXT description "Detailed problem notes"
        VARCHAR(255) photo_evidence_url "Optional photo proof"
        VARCHAR(25) status "OPEN / ASSIGNED / IN_PROGRESS / PENDING_VERIFICATION / COMPLETED / ESCALATED"
        VARCHAR(10) priority "LOW / MED / HIGH / EMERGENCY"
        VARCHAR(50) preferred_timeslot "Student time preference"
        TIMESTAMP created_at "Submission timestamp"
        TIMESTAMP resolved_at "Staff work done timestamp"
        TIMESTAMP closed_at "Student confirmation timestamp"
    }

    COMPLAINT_ASSIGNMENTS {
        INT assignment_id PK "Serial ID"
        VARCHAR(36) complaint_id FK "References COMPLAINTS"
        VARCHAR(36) staff_user_id FK "References USERS"
        VARCHAR(36) assigned_by_user_id FK "Nullable (System/Supervisor)"
        TIMESTAMP assigned_at "Dispatch timestamp"
        TIMESTAMP started_at "Arrival timestamp"
        TIMESTAMP work_completed_at "Finish timestamp"
        VARCHAR(20) current_state "ASSIGNED / IN_PROGRESS / DONE"
    }

    COMPLAINT_FEEDBACK {
        INT feedback_id PK "Serial ID"
        VARCHAR(36) complaint_id UK,FK "1-to-1 with COMPLAINTS"
        VARCHAR(36) student_id FK "References USERS"
        BOOLEAN is_satisfactorily_resolved "True / False"
        INT rating "1 to 5 Stars"
        TEXT student_comments "Review notes"
        TIMESTAMP verified_at "Verification timestamp"
    }

    COMPLAINT_LOGS {
        INT log_id PK "Serial ID"
        VARCHAR(36) complaint_id FK "References COMPLAINTS"
        VARCHAR(36) changed_by_user_id FK "Actor User ID"
        VARCHAR(25) previous_status "Old state"
        VARCHAR(25) new_status "New state"
        TEXT action_note "Trigger or manual audit message"
        TIMESTAMP timestamp "Timestamp of transition"
    }
```

---

## 2. Modular Sub-System ER Diagrams

To assist presentation in viva voce examinations and lab evaluations, the system is decomposed into three focused sub-models:

### 2.1 Sub-System 1: Infrastructure, Space & Student Resident Allocation
Focuses on spatial hierarchy and room allottees.

```mermaid
graph LR
    HB[(HOSTEL_BLOCKS)] -->|1 : N| R[(ROOMS)]
    HB -->|1 : N| CA[(COMMON_AREAS)]
    R -->|1 : N| SRA[(STUDENT_ROOM_ALLOTMENTS)]
    U[(USERS<br>role='STUDENT')] -->|1 : N| SRA

    style HB fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style R fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style CA fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style U fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style SRA fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

### 2.2 Sub-System 2: Domain Taxonomy & Complaint Classification
Focuses on the categorization engine and SLA policy mapping.

```mermaid
graph LR
    CAT[(COMPLAINT_CATEGORIES)] -->|1 : N| SUBCAT[(COMPLAINT_SUBCATEGORIES)]
    SUBCAT -->|1 : N| C[(COMPLAINTS)]
    U[(USERS<br>Student)] -->|Raises 1 : N| C
    R[(ROOMS)] -.->|Target| C
    CA[(COMMON_AREAS)] -.->|Target| C

    style CAT fill:#ede7f6,stroke:#512da8,stroke-width:2px
    style SUBCAT fill:#ede7f6,stroke:#512da8,stroke-width:2px
    style C fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    style U fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

### 2.3 Sub-System 3: Staff Task Dispatch, Closed-Loop Verification & Audit Trail
Focuses on the operational workflow, staff assignment, student confirmation, and automated trigger logging.

```mermaid
graph TD
    C[(COMPLAINTS)] -->|1 : N| CA[(COMPLAINT_ASSIGNMENTS)]
    C -->|1 : 1| CF[(COMPLAINT_FEEDBACK)]
    C -->|1 : N| CL[(COMPLAINT_LOGS)]

    STAFF[(USERS<br>role='STAFF')] -->|Assigned| CA
    SUP[(USERS<br>role='SUPERVISOR')] -.->|Dispatches| CA
    STU[(USERS<br>role='STUDENT')] -->|Signs off| CF
    TRIG((DB Trigger:<br>trg_complaint_status_audit)) -.->|Auto-writes| CL

    style C fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    style CA fill:#fffde7,stroke:#fbc02d,stroke-width:2px
    style CF fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style CL fill:#eceff1,stroke:#455a64,stroke-width:2px
    style TRIG fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

---

## 3. Entity Relationships, Cardinalities & Deletion Rules Matrix

| Parent Entity ($E_1$) | Child Entity ($E_2$) | Cardinality ($E_1 \rightarrow E_2$) | Foreign Key Attribute in $E_2$ | Referential Integrity (`ON DELETE`) | Business Justification |
|---|---|:---:|---|---|---|
| `hostel_blocks` | `rooms` | $1 : N$ (Mandatory) | `rooms.block_id` | `CASCADE` | If a block is deleted, its room structure ceases to exist. |
| `hostel_blocks` | `common_areas` | $1 : N$ (Optional) | `common_areas.block_id` | `CASCADE` | If a block is removed, its common areas are removed. |
| `rooms` | `student_room_allotments`| $1 : N$ (Optional) | `student_room_allotments.room_id` | `RESTRICT` | Cannot delete a room while a student is actively alloted to it. |
| `users` | `student_room_allotments`| $1 : N$ (Mandatory) | `student_room_allotments.student_id` | `CASCADE` | If a student profile is purged, allotments are cleaned. |
| `complaint_categories` | `complaint_subcategories` | $1 : N$ (Mandatory) | `complaint_subcategories.category_id` | `CASCADE` | Removing a category drops its associated sub-issues. |
| `complaint_subcategories` | `complaints` | $1 : N$ (Mandatory) | `complaints.subcategory_id` | `RESTRICT` | Cannot drop an issue type if historical complaints reference it. |
| `users` (Student) | `complaints` | $1 : N$ (Mandatory) | `complaints.raised_by_user_id` | `RESTRICT` | Preserves audit integrity; cannot delete student with open tickets. |
| `complaints` | `complaint_assignments` | $1 : N$ (Optional) | `complaint_assignments.complaint_id` | `CASCADE` | Dropping a complaint purges its dispatch queue entries. |
| `users` (Staff) | `complaint_assignments` | $1 : N$ (Optional) | `complaint_assignments.staff_user_id` | `RESTRICT` | Cannot purge staff records with active assignments. |
| `complaints` | `complaint_feedback` | $1 : 1$ (Optional) | `complaint_feedback.complaint_id` | `CASCADE` | Deleting a complaint purges its rating record. |
| `complaints` | `complaint_logs` | $1 : N$ (Mandatory) | `complaint_logs.complaint_id` | `CASCADE` | Audit log rows cascade with parent ticket. |

---

## 4. Normalization Proof (Up to 3NF / BCNF)

### 4.1 First Normal Form (1NF)
- **Criterion**: All attribute values are atomic; no repeating groups or arrays.
- **Proof**: 
  - Room locations are decomposed into discrete scalars (`block_id`, `floor_number`, `room_number`).
  - Staff specializations and student ratings are scalar fields.
  - Multi-valued photos or logs are extracted into dedicated child tables (`complaint_logs`).

### 4.2 Second Normal Form (2NF)
- **Criterion**: Table is in 1NF and contains **NO partial functional dependencies** (every non-prime attribute is fully functionally dependent on the entire primary key).
- **Proof**:
  - In `student_room_allotments`, the surrogate key `allotment_id` uniquely determines `{student_id, room_id, academic_year, is_current}`.
  - In `complaint_subcategories`, `subcategory_id` directly determines `{category_id, issue_name, priority_level, required_specialization}`. No partial dependencies exist on composite keys.

### 4.3 Third Normal Form (3NF)
- **Criterion**: Table is in 2NF and contains **NO transitive functional dependencies** ($X \rightarrow Y$ and $Y \rightarrow Z$ where $Z$ depends on non-key $Y$).
- **Proof**:
  - Issue categories were decomposed: `complaints` references only `subcategory_id`. It does not redundantly store `category_id`, `category_name`, or `default_sla_hours`.
  - Room details (`floor_number`, `room_type`) are not duplicated inside `complaints`; they are accessed through foreign key join on `room_id`.
  - Therefore, for every functional dependency $X \rightarrow Y$, $X$ is a superkey.

### 4.4 Boyce-Codd Normal Form (BCNF)
- **Criterion**: For every non-trivial functional dependency $X \rightarrow Y$, $X$ must be a superkey.
- **Proof**:
  - In all 11 tables, every functional determinant (e.g., `user_id`, `reg_or_emp_id`, `room_id`, `complaint_id`) is a candidate key. No non-trivial dependency has a non-superkey determinant.
