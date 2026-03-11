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
  (1, 'User Management', 'User CRUD operations', 1, 1);

-- ------------------------------------------------------------
-- taskFeature
-- Permission gates checked by checkTaskFeature() middleware
-- featureID 1 = User Management, statusID 1 = ACTIVE
-- ------------------------------------------------------------
INSERT INTO `taskFeature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `featureID`) VALUES
  (1, 'LISTUSERS',  'List all users',           1, 1),
  (2, 'READUSER',   'Read single user details', 1, 1),
  (3, 'CREATEUSER', 'Create a new user',        1, 1),
  (4, 'UPDATEUSER', 'Update an existing user',  1, 1),
  (5, 'DELETEUSER', 'Delete a user',            1, 1);

-- ------------------------------------------------------------
-- taskFeature_has_user
-- Grants all taskFeature permissions to the first admin user.
-- Replace <user_ID> with the actual user ID after signup.
-- ------------------------------------------------------------
INSERT INTO `taskFeature_has_user` (`taskFeature_ID`, `user_ID`)
SELECT ID, <user_ID> FROM `taskFeature`;
