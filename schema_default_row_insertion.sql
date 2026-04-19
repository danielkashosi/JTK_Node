-- ============================================================
-- Default row insertions for JTK database
-- ============================================================

-- ------------------------------------------------------------
-- moduleFeatureTaskStatus
-- Shared status lookup used by: module, feature, taskFeature
-- ------------------------------------------------------------
INSERT INTO `moduleFeatureTaskStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active status',   'ACTV'),
  (2, 'INACTIVE', 'Inactive status', 'INAC');

-- ------------------------------------------------------------
-- userStatus
-- Status lookup used by the user table (userStatus_ID)
-- ------------------------------------------------------------
INSERT INTO `userStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active user account',        'ACTV'),
  (2, 'INACTIVE', 'Inactive user account',      'INAC'),
  (3, 'PENDING',  'Pending email verification', 'PEND');

-- ------------------------------------------------------------
-- groupStatus
-- Status lookup used by the group table (groupStatus_ID)
-- ------------------------------------------------------------
INSERT INTO `groupStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active group',   'ACTV'),
  (2, 'INACTIVE', 'Inactive group', 'INAC');

-- ------------------------------------------------------------
-- module
-- Top-level grouping for features and taskFeatures
-- moduleFeatureTaskStatusID 1 = ACTIVE
-- ------------------------------------------------------------
INSERT INTO `module` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`) VALUES
  (1, 'System Administration', 'Core system administration module', 1);

-- ------------------------------------------------------------
-- feature
-- Belongs to a module; groups related taskFeatures
-- moduleID 1 = System Administration, statusID 1 = ACTIVE
-- ------------------------------------------------------------
INSERT INTO `feature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `moduleID`) VALUES
  (1, 'User Management',  'User CRUD operations',   1, 1),
  (5, 'Group Management', 'Group CRUD and permissions', 1, 1);

-- ------------------------------------------------------------
-- taskFeature
-- Permission gates checked by checkTaskFeature() middleware
-- featureID 1 = User Management, statusID 1 = ACTIVE
-- ------------------------------------------------------------
INSERT INTO `taskFeature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `featureID`) VALUES
  (1,  'LISTUSERS',   'List all users',            1, 1),
  (2,  'READUSER',    'Read single user details',  1, 1),
  (3,  'CREATEUSER',  'Create a new user',         1, 1),
  (4,  'UPDATEUSER',  'Update an existing user',   1, 1),
  (5,  'DELETEUSER',  'Delete a user',             1, 1),
  (16, 'LISTGROUPS',  'List all groups',           1, 5),
  (17, 'READGROUP',   'Read single group details', 1, 5),
  (18, 'CREATEGROUP', 'Create a new group',        1, 5),
  (19, 'UPDATEGROUP', 'Update an existing group',  1, 5),
  (20, 'DELETEGROUP', 'Delete a group',            1, 5);

-- ------------------------------------------------------------
-- taskFeature_has_user
-- Grants all taskFeature permissions to the first admin user.
-- Replace <user_ID> with the actual user ID after signup.
-- ------------------------------------------------------------
INSERT INTO `taskFeature_has_user` (`taskFeature_ID`, `user_ID`)
SELECT ID, <user_ID> FROM `taskFeature`;

-- ============================================================
-- MODULE 1: Hospital Visit Workflow — Default Data
-- ============================================================

-- ------------------------------------------------------------
-- department
-- Core hospital departments
-- ------------------------------------------------------------
INSERT INTO `department` (`ID`, `name`, `code`, `description`, `isActive`) VALUES
  (1, 'Reception',        'RECEPT', 'Front desk and patient intake',           1),
  (2, 'Triage / Nursing', 'TRIAGE', 'Nursing and initial patient assessment',  1),
  (3, 'General Medicine', 'GENMED', 'General medicine and outpatient care',    1),
  (4, 'Laboratory',       'LAB',    'Lab tests and specimen processing',       1),
  (5, 'Radiology',        'XRAY',   'X-ray and imaging',                       1),
  (6, 'Pharmacy',         'PHARM',  'Medication dispensing',                   1),
  (7, 'Billing',          'BILL',   'Billing and cash payments',               1);

-- ------------------------------------------------------------
-- visitReason
-- Pre-defined reasons for visit (combo box — user can also type free text)
-- ------------------------------------------------------------
INSERT INTO `visitReason` (`ID`, `name`, `isActive`) VALUES
  (1, 'General Consultation',       1),
  (2, 'Follow-up Visit',            1),
  (3, 'Emergency',                   1),
  (4, 'Lab Test Only',              1),
  (5, 'Vaccination',                1),
  (6, 'Prenatal Care',              1),
  (7, 'Chronic Disease Management', 1),
  (8, 'Other',                      1);

-- ------------------------------------------------------------
-- module — add Receptionist module (ID 2)
-- ------------------------------------------------------------
INSERT INTO `module` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`) VALUES
  (2, 'Receptionist', 'Patient intake and visit management', 1);

-- ------------------------------------------------------------
-- feature — add Patient Management and Visit Management features
-- ------------------------------------------------------------
INSERT INTO `feature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `moduleID`) VALUES
  (2, 'Patient Management', 'Patient CRUD operations',       1, 2),
  (3, 'Visit Management',   'Visit lifecycle and workflow',  1, 2),
  (4, 'Department Management', 'Department configuration',   1, 1);

-- ------------------------------------------------------------
-- taskFeature — permissions for patient/visit/department
-- ------------------------------------------------------------
INSERT INTO `taskFeature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `featureID`) VALUES
  -- Patient permissions (featureID 2)
  (6,  'LISTPATIENTS',   'List and search patients',        1, 2),
  (7,  'READPATIENT',    'View a single patient record',    1, 2),
  (8,  'CREATEPATIENT',  'Add a new patient',               1, 2),
  (9,  'UPDATEPATIENT',  'Update patient information',      1, 2),
  -- Visit permissions (featureID 3)
  (10, 'LISTVISITS',     'View the visit queue',            1, 3),
  (11, 'CREATEVISIT',    'Check in / start a new visit',    1, 3),
  (12, 'UPDATEVISIT',    'Transition a visit (next step)',  1, 3),
  (13, 'CLOSEVISIT',     'Check out / close a visit',       1, 3),
  -- Department permissions (featureID 4)
  (14, 'LISTDEPTS',      'List departments and staff',      1, 4),
  (15, 'MANAGEDEPTS',    'Create and update departments',   1, 4);
