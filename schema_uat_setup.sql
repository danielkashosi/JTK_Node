-- ====================================================================
-- JTK UAT Setup Script
-- Target: TiDB Cloud Serverless (MySQL-compatible)
-- Generated: 2026-03-11
-- Admin credentials: userName=admin  password=Adm!nJTK2026
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Status tables ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `userStatus` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `groupStatus` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `moduleFeatureTaskStatus` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Person ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `person` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    DOB DATE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Form ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `form` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    logs TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── User ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    userName VARCHAR(510) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created DATETIME,
    updated DATETIME,
    email VARCHAR(500) NOT NULL UNIQUE,
    person_ID INT NOT NULL,
    userStatus_ID INT NOT NULL,
    VerificationToken TEXT,
    Verified DATETIME,
    ResetToken TEXT,
    ResetTokenExpires DATETIME,
    PasswordReset DATETIME,
    FOREIGN KEY (person_ID) REFERENCES `person`(ID) ON DELETE CASCADE,
    FOREIGN KEY (userStatus_ID) REFERENCES `userStatus`(ID),
    INDEX idx_person_ID (person_ID),
    INDEX idx_userStatus_ID (userStatus_ID)
);

-- ── RefreshToken ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refreshToken` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    expires DATETIME,
    Created DATETIME,
    Token TEXT NOT NULL,
    CreatedByIp VARCHAR(100),
    Revoked DATETIME,
    RevokedByIp VARCHAR(100),
    ReplacedByToken TEXT,
    user_ID INT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_ID) REFERENCES `user`(ID) ON DELETE CASCADE,
    INDEX idx_user_ID (user_ID)
);

-- ── Group ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `group` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    groupStatus_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (groupStatus_ID) REFERENCES `groupStatus`(ID),
    INDEX idx_groupStatus_ID (groupStatus_ID)
);

-- ── Module ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `module` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES `moduleFeatureTaskStatus`(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID)
);

-- ── Feature ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `feature` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    moduleID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES `moduleFeatureTaskStatus`(ID),
    FOREIGN KEY (moduleID) REFERENCES `module`(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID),
    INDEX idx_moduleID (moduleID)
);

-- ── Task ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `task` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    encounterID INT,
    formID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (formID) REFERENCES `form`(ID),
    INDEX idx_formID (formID)
);

-- ── TaskFeature ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `taskFeature` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    featureID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES `moduleFeatureTaskStatus`(ID),
    FOREIGN KEY (featureID) REFERENCES `feature`(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID),
    INDEX idx_featureID (featureID)
);

-- ── Junction tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `group_has_user` (
    group_ID INT NOT NULL,
    user_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (group_ID, user_ID),
    FOREIGN KEY (group_ID) REFERENCES `group`(ID),
    FOREIGN KEY (user_ID) REFERENCES `user`(ID),
    INDEX idx_group_ID (group_ID),
    INDEX idx_user_ID (user_ID)
);

CREATE TABLE IF NOT EXISTS `taskFeature_has_group` (
    taskFeature_ID INT NOT NULL,
    group_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (taskFeature_ID, group_ID),
    FOREIGN KEY (taskFeature_ID) REFERENCES `taskFeature`(ID),
    FOREIGN KEY (group_ID) REFERENCES `group`(ID),
    INDEX idx_taskFeature_ID (taskFeature_ID),
    INDEX idx_group_ID (group_ID)
);

CREATE TABLE IF NOT EXISTS `taskFeature_has_user` (
    taskFeature_ID INT NOT NULL,
    user_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (taskFeature_ID, user_ID),
    FOREIGN KEY (taskFeature_ID) REFERENCES `taskFeature`(ID),
    FOREIGN KEY (user_ID) REFERENCES `user`(ID),
    INDEX idx_taskFeature_ID (taskFeature_ID),
    INDEX idx_user_ID (user_ID)
);

-- ── ApiLog ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `apiLog` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    requestBody TEXT,
    endpoint VARCHAR(1000),
    responseBody TEXT,
    createdTime DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- Default seed data
-- ====================================================================

INSERT IGNORE INTO `moduleFeatureTaskStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active status',   'ACTV'),
  (2, 'INACTIVE', 'Inactive status', 'INAC');

INSERT IGNORE INTO `userStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active user account',        'ACTV'),
  (2, 'INACTIVE', 'Inactive user account',      'INAC'),
  (3, 'PENDING',  'Pending email verification', 'PEND');

INSERT IGNORE INTO `groupStatus` (`ID`, `name`, `description`, `code`) VALUES
  (1, 'ACTIVE',   'Active group',   'ACTV'),
  (2, 'INACTIVE', 'Inactive group', 'INAC');

INSERT IGNORE INTO `module` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`) VALUES
  (1, 'System Administration', 'Core system administration module', 1);

INSERT IGNORE INTO `feature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `moduleID`) VALUES
  (1, 'User Management',  'User CRUD operations',  1, 1),
  (2, 'Group Management', 'Group CRUD operations', 1, 1);

INSERT IGNORE INTO `taskFeature` (`ID`, `name`, `description`, `moduleFeatureTaskStatusID`, `featureID`) VALUES
  (1,  'LISTUSERS',   'List all users',             1, 1),
  (2,  'READUSER',    'Read single user details',   1, 1),
  (3,  'CREATEUSER',  'Create a new user',          1, 1),
  (4,  'UPDATEUSER',  'Update an existing user',    1, 1),
  (5,  'DELETEUSER',  'Delete a user',              1, 1),
  (6,  'LISTGROUPS',  'List all groups',            1, 2),
  (7,  'READGROUP',   'Read single group details',  1, 2),
  (8,  'CREATEGROUP', 'Create a new group',         1, 2),
  (9,  'UPDATEGROUP', 'Update an existing group',   1, 2),
  (10, 'DELETEGROUP', 'Delete a group',             1, 2);

-- ====================================================================
-- Admin user seed
-- userName: admin   password: Adm!nJTK2026  (bcrypt hash below)
-- Login with userName or email: admin@jtk.local
-- ====================================================================
INSERT IGNORE INTO `person` (`ID`, `firstName`, `lastName`) VALUES
  (1, 'Admin', 'JTK');

INSERT IGNORE INTO `user`
  (`ID`, `userName`, `password`, `email`, `person_ID`, `userStatus_ID`, `Verified`)
VALUES
  (1, 'admin', '\\\/ILvUdYD4YkCNxfu9f9.vgS0pnpSG916ccz5CmISMbxR1FW',
   'admin@jtk.local', 1, 1, NOW());

-- Grant all taskFeatures to admin
INSERT IGNORE INTO `taskFeature_has_user` (`taskFeature_ID`, `user_ID`)
SELECT ID, 1 FROM `taskFeature`;

-- Admin group
INSERT IGNORE INTO `group` (`ID`, `name`, `description`, `groupStatus_ID`) VALUES
  (1, 'Administrators', 'Full access admin group', 1);

INSERT IGNORE INTO `group_has_user` (`group_ID`, `user_ID`) VALUES (1, 1);

INSERT IGNORE INTO `taskFeature_has_group` (`taskFeature_ID`, `group_ID`)
SELECT ID, 1 FROM `taskFeature`;
