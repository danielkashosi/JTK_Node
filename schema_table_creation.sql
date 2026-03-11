-- MySQL Schema for the Backend Application
-- Generated from Sequelize models with improvements

-- Status tables (no dependencies)
CREATE TABLE userStatus (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE groupStatus (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE moduleFeatureTaskStatus (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Person table (no dependencies)
CREATE TABLE person (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    DOB DATE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Form table (no dependencies)
CREATE TABLE form (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    logs TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User table (depends on person, userStatus)
CREATE TABLE user (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    userName VARCHAR(510) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL,
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
    FOREIGN KEY (person_ID) REFERENCES person(ID) ON DELETE CASCADE,
    FOREIGN KEY (userStatus_ID) REFERENCES userStatus(ID),
    INDEX idx_person_ID (person_ID),
    INDEX idx_userStatus_ID (userStatus_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RefreshToken table (depends on user)
CREATE TABLE refreshToken (
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
    FOREIGN KEY (user_ID) REFERENCES user(ID) ON DELETE CASCADE,
    INDEX idx_user_ID (user_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Group table (depends on groupStatus)
CREATE TABLE `group` (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    groupStatus_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (groupStatus_ID) REFERENCES groupStatus(ID),
    INDEX idx_groupStatus_ID (groupStatus_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Module table (depends on moduleFeatureTaskStatus)
CREATE TABLE module (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES moduleFeatureTaskStatus(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Feature table (depends on module, moduleFeatureTaskStatus)
CREATE TABLE feature (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    moduleID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES moduleFeatureTaskStatus(ID),
    FOREIGN KEY (moduleID) REFERENCES module(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID),
    INDEX idx_moduleID (moduleID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Task table (depends on form)
CREATE TABLE task (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    encounterID INT,
    formID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (formID) REFERENCES form(ID),
    INDEX idx_formID (formID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TaskFeature table (depends on moduleFeatureTaskStatus, feature)
CREATE TABLE taskFeature (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    moduleFeatureTaskStatusID INT NOT NULL,
    featureID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleFeatureTaskStatusID) REFERENCES moduleFeatureTaskStatus(ID),
    FOREIGN KEY (featureID) REFERENCES feature(ID),
    INDEX idx_moduleFeatureTaskStatusID (moduleFeatureTaskStatusID),
    INDEX idx_featureID (featureID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction tables
CREATE TABLE group_has_user (
    group_ID INT NOT NULL,
    user_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (group_ID, user_ID),
    FOREIGN KEY (group_ID) REFERENCES `group`(ID),
    FOREIGN KEY (user_ID) REFERENCES user(ID),
    INDEX idx_group_ID (group_ID),
    INDEX idx_user_ID (user_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE taskFeature_has_group (
    taskFeature_ID INT NOT NULL,
    group_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (taskFeature_ID, group_ID),
    FOREIGN KEY (taskFeature_ID) REFERENCES taskFeature(ID),
    FOREIGN KEY (group_ID) REFERENCES `group`(ID),
    INDEX idx_taskFeature_ID (taskFeature_ID),
    INDEX idx_group_ID (group_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE taskFeature_has_user (
    taskFeature_ID INT NOT NULL,
    user_ID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (taskFeature_ID, user_ID),
    FOREIGN KEY (taskFeature_ID) REFERENCES taskFeature(ID),
    FOREIGN KEY (user_ID) REFERENCES user(ID),
    INDEX idx_taskFeature_ID (taskFeature_ID),
    INDEX idx_user_ID (user_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ApiLog table (no dependencies)
CREATE TABLE apiLog (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    requestBody TEXT,
    endpoint VARCHAR(1000),
    responseBody TEXT,
    createdTime DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;