# FIX_MASTER — Complaint Categories & Issues Specification

## 1. Overview & Hierarchy

Complaints in FIX_MASTER follow a 2-tier relational classification model (complaint_categories -> complaint_subcategories -> complaints). This structure supports:
1. **1-Click Quick Housekeeping**: Instantly dispatched to on-duty floor cleaning staff.
2. **Room Technical Issues**: Structured diagnostic submissions with preferred time slots and photo attachments.
3. **Common Area Infrastructure**: Block-wide utility failures (water coolers, washrooms, elevators).

---

## 2. Category & Issue Master Table

`mermaid
graph TD
    A[Hostel Complaints] --> B[Housekeeping & Cleaning]
    A --> C[Electrical & Power]
    A --> D[AC & HVAC Maintenance]
    A --> E[Carpentry & Furniture]
    A --> F[Plumbing & Sanitary]
    A --> G[Common Area Infrastructure]

    B --> B1[1-Click Room Cleaning]
    B --> B2[Balcony & Dusting]
    B --> B3[Dustbin Clearance]

    C --> C1[Tube Light / Bulb Failure]
    C --> C2[Socket Damaged / Sparking]
    C --> C3[Fan Regulator Failure]
    C --> C4[Room MCB Tripped]

    D --> D1[AC Cooling Failure]
    D --> D2[AC Foul Smell]
    D --> D3[Water Dripping in Room]
    D --> D4[AC Remote / Sensor Error]

    E --> E1[Table / Chair Broken]
    E --> E2[Cupboard / Almirah Hinge]
    E --> E3[Door Lock / Latch Jammed]
    E --> E4[Bed Frame / Ply Cracked]

    F --> F1[Tap Leaking / Broken Nozzle]
    F --> F2[Flush Tank Overflow]
    F --> F3[Drain Clogged]
    F --> F4[Geyser / Hot Water Fault]

    G --> G1[Floor Water Cooler Down]
    G --> G2[Common Washroom Pipe Burst]
    G --> G3[Elevator / Lift Malfunction]
    G --> G4[Corridor Lighting Failure]
`

---

## 3. Detailed Issue Catalog & Service Level Agreements (SLAs)

### 3.1. Category 1: CLEANING (Housekeeping & Sanitation)
- **Responsible Staff Specialization**: CLEANING
- **Default SLA Target**: 2 to 4 Hours

| Subcategory Code | Issue / Action Name | Priority | SLA (Hours) | Quick Action? | Description |
|---|---|---|---|---|---|
| CLN_ROOM_SWEEP | **1-Click Room Cleaning & Mopping** | LOW | 2 hrs | Yes | Complete sweeping and wet mopping of room floor |
| CLN_DUSTING | **Room Dusting & Balcony Sweep** | LOW | 4 hrs | Yes | Dusting surfaces, window ledges, and balcony sweeping |
| CLN_TRASH | **Room Trash / Dustbin Clearance** | LOW | 2 hrs | Yes | Emptying room wastebins and disposal |
| CLN_CORRIDOR | **Corridor Spillage / Deep Clean** | MEDIUM | 3 hrs | No | Urgent corridor cleanup or sanitization |

---

### 3.2. Category 2: ELECTRICAL (Electrical & Power Systems)
- **Responsible Staff Specialization**: ELECTRICIAN
- **Default SLA Target**: 4 to 12 Hours

| Subcategory Code | Issue / Action Name | Priority | SLA (Hours) | Description |
|---|---|---|---|---|
| ELEC_LIGHT | **Tube Light / LED Bulb Failure** | MEDIUM | 12 hrs | Light not turning on, flickering, or starter blown |
| ELEC_SOCKET | **Power Socket Damaged / Sparking** | HIGH | 6 hrs | Loose pins, short circuit smell, or internal sparking |
| ELEC_SWITCH | **Switch Board Loose / Burnt** | HIGH | 6 hrs | Cracked faceplate, broken toggle, or burnt switch |
| ELEC_FAN | **Fan Regulator Broken / Not Rotating** | MEDIUM | 12 hrs | Capacitor dead, fan speed stuck, or regulator knob broken |
| ELEC_MCB | **Room MCB Tripped / Main Power Loss** | HIGH | 4 hrs | Individual room miniature circuit breaker tripping continuously |

---

### 3.3. Category 3: AC_MAINTENANCE (Air Conditioning & HVAC)
- **Responsible Staff Specialization**: AC_TECH
- **Default SLA Target**: 6 to 24 Hours

| Subcategory Code | Issue / Action Name | Priority | SLA (Hours) | Description |
|---|---|---|---|---|
| AC_COOLING | **AC Not Cooling / Weak Airflow** | MEDIUM | 24 hrs | Compressor running but air is warm; filter choked |
| AC_SMELL | **AC Foul / Burning Smell** | HIGH | 6 hrs | Moldy odor or burning insulation aroma from vent |
| AC_LEAKAGE | **Water Dripping / Leakage Inside Room** | HIGH | 12 hrs | Indoor unit drain tray overflow or condensation drip |
| AC_REMOTE | **AC Remote Lost / Display Error Code** | LOW | 24 hrs | Remote malfunction or LED error code displayed (e.g. E1/E4) |
| AC_NOISE | **Abnormal Vibrations / Loud Compressor** | MEDIUM | 24 hrs | Blower wheel imbalance or external unit vibration |

---

### 3.4. Category 4: CARPENTER (Carpentry, Doors & Furniture)
- **Responsible Staff Specialization**: CARPENTER
- **Default SLA Target**: 4 to 24 Hours

| Subcategory Code | Issue / Action Name | Priority | SLA (Hours) | Description |
|---|---|---|---|---|
| CARP_DESK_CHAIR | **Study Table / Chair Leg Broken** | MEDIUM | 24 hrs | Chair backrest damaged, wobbly desk, or loose screws |
| CARP_ALMIRAH | **Almirah / Wardrobe Hinge Broken** | MEDIUM | 24 hrs | Cupboard door unaligned, shelf collapsed, or lock stuck |
| CARP_DOOR_LOCK | **Room Door Lock / Latch Damaged** | HIGH | 4 hrs | Key jammed, door latch misaligned, or deadbolt loose |
| CARP_WINDOW | **Window Glass Pane / Latch Broken** | MEDIUM | 24 hrs | Window stay arm broken or glass pane cracked |
| CARP_BED | **Bed Frame / Plywood Base Cracked** | HIGH | 12 hrs | Plywood sagging or steel cot frame welding cracked |

---

### 3.5. Category 5: PLUMBING (Plumbing & Sanitary Fittings)
- **Responsible Staff Specialization**: PLUMBER
- **Default SLA Target**: 2 to 12 Hours

| Subcategory Code | Issue / Action Name | Priority | SLA (Hours) | Description |
|---|---|---|---|---|
| PLUMB_TAP | **Water Tap Leaking / Broken Nozzle** | LOW | 12 hrs | Continuous dripping or stripped washer on washbasin tap |
| PLUMB_FLUSH | **Flush Tank Overflow / Not Filling** | MEDIUM | 8 hrs | Float ball stuck or syphon siphon leakage |
| PLUMB_DRAIN | **Washbasin / Shower Drain Clogged** | HIGH | 6 hrs | Standing water due to hair/dirt blockage |
| PLUMB_GEYSER | **Geyser / Hot Water Not Working** | MEDIUM | 12 hrs | Heating element dead or thermostat issue |
| PLUMB_SHOWER | **Shower Head Broken / Low Pressure** | LOW | 24 hrs | Calcified nozzles or cracked shower head arm |

---

### 3.6. Category 6: COMMON_AREA_INFRA (Hostel Block Infrastructure)
- **Responsible Staff Specialization**: Multi-specialization (Dispatched per issue)
- **Default SLA Target**: 1 to 8 Hours

| Subcategory Code | Location | Issue Name | Priority | SLA (Hours) | Specialist |
|---|---|---|---|---|---|
| INFRA_COOLER_TEMP | Floor Water Cooler | **No Cold Water / Compressor Trip** | HIGH | 8 hrs | AC_TECH |
| INFRA_COOLER_RO | Floor Water Cooler | **Purifier Filter Choked / Bad Taste** | HIGH | 6 hrs | PLUMBER |
| INFRA_WASHROOM_BURST | Common Washroom | **Main Pipe Burst / Major Leakage** | EMERGENCY | 2 hrs | PLUMBER |
| INFRA_LIFT_FAULT | Elevator Shaft | **Lift Jerking / Sensor Malfunction** | EMERGENCY | 1 hr | ELECTRICIAN |
| INFRA_CORRIDOR_LIGHT | Floor Corridor | **Multiple Tube Lights Blown Out** | MEDIUM | 6 hrs | ELECTRICIAN |
| INFRA_FIRE_EXIT | Emergency Exit | **Fire Exit Jammed / Missing Extinguisher** | EMERGENCY | 2 hrs | CARPENTER |

---

## 4. State Machine & Lifecycle Transitions

`mermaid
stateDiagram-v2
    [*] --> OPEN: Created (Quick-Click or Form)
    OPEN --> ASSIGNED: Auto-allocated to on-duty staff
    ASSIGNED --> IN_PROGRESS: Staff arrives / marks started
    IN_PROGRESS --> PENDING_VERIFICATION: Staff marks Work Done
    PENDING_VERIFICATION --> COMPLETED: Student clicks Confirm Resolution
    PENDING_VERIFICATION --> ESCALATED: Student rejects or SLA breached
    ESCALATED --> ASSIGNED: Supervisor re-routes task
    COMPLETED --> [*]
`
