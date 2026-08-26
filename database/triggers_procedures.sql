-- ============================================================================
-- FIX_MASTER: Database Triggers, Stored Procedures, Functions & Views
-- Course: BCSE307L - Database Systems (SCOPE, VIT Vellore)
-- Database Engine: PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- 1. DATABASE TRIGGERS
-- ============================================================================

-- Trigger 1: Automated Audit Logging for Complaint Status Changes
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
            NULL,
            OLD.status,
            NEW.status,
            CONCAT('Automated transition: ', OLD.status, ' -> ', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_status_audit ON complaints;
CREATE TRIGGER trg_complaint_status_audit
AFTER UPDATE OF status ON complaints
FOR EACH ROW
EXECUTE FUNCTION fn_audit_complaint_status_change();

-- Trigger 2: Auto-Maintain Resolved and Closed Timestamps
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

DROP TRIGGER IF EXISTS trg_update_complaint_timestamps ON complaints;
CREATE TRIGGER trg_update_complaint_timestamps
BEFORE UPDATE OF status ON complaints
FOR EACH ROW
EXECUTE FUNCTION fn_update_complaint_timestamps();

-- ============================================================================
-- 2. STORED PROCEDURES & ACID TRANSACTIONS
-- ============================================================================

-- Procedure 1: 1-Click Auto-Dispatch for Cleaning Staff (Least Loaded)
CREATE OR REPLACE PROCEDURE sp_auto_dispatch_cleaning(
    p_complaint_id VARCHAR(36)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_assigned_staff_id VARCHAR(36);
BEGIN
    -- 1. Identify on-duty cleaning staff with minimum active assignments
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
        UPDATE complaints 
        SET status = 'OPEN' 
        WHERE complaint_id = p_complaint_id;
    ELSE
        INSERT INTO complaint_assignments (complaint_id, staff_user_id, current_state)
        VALUES (p_complaint_id, v_assigned_staff_id, 'ASSIGNED');

        UPDATE complaints 
        SET status = 'ASSIGNED' 
        WHERE complaint_id = p_complaint_id;
    END IF;
END;
$$;

-- Procedure 2: Atomic Closed-Loop Resolution Verification & Rating
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
    -- 1. Security & Ownership check
    SELECT raised_by_user_id, status 
    INTO v_ticket_student_id, v_current_status
    FROM complaints 
    WHERE complaint_id = p_complaint_id;

    IF v_ticket_student_id IS NULL THEN
        RAISE EXCEPTION 'Complaint % not found', p_complaint_id;
    END IF;

    IF v_ticket_student_id != p_student_id THEN
        RAISE EXCEPTION 'Unauthorized: User % did not raise complaint %', p_student_id, p_complaint_id;
    END IF;

    -- 2. Insert feedback
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

    -- 3. Transition complaint status
    IF p_is_satisfied = TRUE THEN
        UPDATE complaints 
        SET status = 'COMPLETED', closed_at = CURRENT_TIMESTAMP 
        WHERE complaint_id = p_complaint_id;

        UPDATE complaint_assignments 
        SET current_state = 'DONE', work_completed_at = CURRENT_TIMESTAMP 
        WHERE complaint_id = p_complaint_id;
    ELSE
        UPDATE complaints 
        SET status = 'ESCALATED' 
        WHERE complaint_id = p_complaint_id;

        UPDATE complaint_assignments 
        SET current_state = 'DECLINED' 
        WHERE complaint_id = p_complaint_id;
    END IF;
END;
$$;

-- Procedure 3: Manual Dispatch Override (Supervisor Action)
CREATE OR REPLACE PROCEDURE sp_supervisor_assign_task(
    p_complaint_id VARCHAR(36),
    p_staff_user_id VARCHAR(36),
    p_supervisor_user_id VARCHAR(36)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new assignment
    INSERT INTO complaint_assignments (complaint_id, staff_user_id, assigned_by_user_id, current_state)
    VALUES (p_complaint_id, p_staff_user_id, p_supervisor_user_id, 'ASSIGNED');

    -- Update complaint status
    UPDATE complaints
    SET status = 'ASSIGNED'
    WHERE complaint_id = p_complaint_id;
END;
$$;

-- ============================================================================
-- 3. ANALYTICAL & OPERATIONAL VIEWS
-- ============================================================================

-- View 1: Floor-Optimized Active Queue for Staff
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

-- View 2: Block Supervisor Real-Time KPI Summary
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
    ROUND(COALESCE(AVG(fb.rating), 0), 2) AS average_student_rating
FROM hostel_blocks b
LEFT JOIN complaints c ON b.block_id = c.block_id
LEFT JOIN complaint_feedback fb ON c.complaint_id = fb.complaint_id
GROUP BY b.block_id, b.block_name;

-- View 3: Recurring Defects & Outage Hotspot Monitor (Last 14 Days)
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
GROUP BY c.block_id, c.ticket_scope, COALESCE(r.room_number, ca_area.description), cat.category_name
HAVING COUNT(c.complaint_id) >= 2
ORDER BY incident_count_14_days DESC;
