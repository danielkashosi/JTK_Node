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

-- ============================================================
-- MODULE 1: Hospital Visit Workflow Tables
-- ============================================================

-- Department (no dependencies)
CREATE TABLE department (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Department staff assignment (depends on department, user)
CREATE TABLE department_has_user (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    department_ID INT NOT NULL,
    user_ID INT NOT NULL,
    isPrimary TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dept_user (department_ID, user_ID),
    FOREIGN KEY (department_ID) REFERENCES department(ID) ON DELETE CASCADE,
    FOREIGN KEY (user_ID) REFERENCES user(ID) ON DELETE CASCADE,
    INDEX idx_dept_user_dept (department_ID),
    INDEX idx_dept_user_user (user_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Patient (separate from system User — patients are not staff)
CREATE TABLE patient (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    DOB DATE,
    gender VARCHAR(10),
    nationalID VARCHAR(100) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    bloodType VARCHAR(10),
    allergiesNotes TEXT,
    emergencyContactName VARCHAR(255),
    emergencyContactPhone VARCHAR(50),
    createdBy_ID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_patient_lastName (lastName),
    INDEX idx_patient_nationalID (nationalID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Visit reason catalog (no dependencies)
CREATE TABLE visitReason (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Visit (core entity)
-- currentStatus values: SCHEDULED | CHECKED_IN | WAITING_TRIAGE | TRIAGE_IN_PROGRESS
--   | WAITING_DOCTOR | WITH_DOCTOR | WAITING_LAB | LAB_IN_PROGRESS | LAB_COMPLETED
--   | PENDING_CHECKOUT | CHECKED_OUT | ABANDONED | CANCELLED
CREATE TABLE visit (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    patient_ID INT NOT NULL,
    currentStatus VARCHAR(50) NOT NULL DEFAULT 'CHECKED_IN',
    currentDepartment_ID INT,
    currentAssignedUser_ID INT,
    reasonText VARCHAR(500),
    visitReason_ID INT,
    scheduledAt DATETIME,
    checkedInAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    checkedOutAt DATETIME,
    createdBy_ID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_ID) REFERENCES patient(ID) ON DELETE CASCADE,
    FOREIGN KEY (currentDepartment_ID) REFERENCES department(ID) ON DELETE SET NULL,
    FOREIGN KEY (currentAssignedUser_ID) REFERENCES user(ID) ON DELETE SET NULL,
    FOREIGN KEY (visitReason_ID) REFERENCES visitReason(ID) ON DELETE SET NULL,
    FOREIGN KEY (createdBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_visit_patient (patient_ID),
    INDEX idx_visit_status (currentStatus),
    INDEX idx_visit_dept (currentDepartment_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VisitEvent (full timeline / audit log for each visit)
CREATE TABLE visitEvent (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    visit_ID INT NOT NULL,
    fromStatus VARCHAR(50),
    toStatus VARCHAR(50) NOT NULL,
    fromDepartment_ID INT,
    toDepartment_ID INT,
    toAssignedUser_ID INT,
    note TEXT,
    performedBy_ID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_ID) REFERENCES visit(ID) ON DELETE CASCADE,
    FOREIGN KEY (fromDepartment_ID) REFERENCES department(ID) ON DELETE SET NULL,
    FOREIGN KEY (toDepartment_ID) REFERENCES department(ID) ON DELETE SET NULL,
    FOREIGN KEY (toAssignedUser_ID) REFERENCES user(ID) ON DELETE SET NULL,
    FOREIGN KEY (performedBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_visitEvent_visit (visit_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- LabOrder (multiple per visit, concurrent or sequential)
-- status values: ORDERED | IN_PROGRESS | COMPLETED | CANCELLED
CREATE TABLE labOrder (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    visit_ID INT NOT NULL,
    testName VARCHAR(255) NOT NULL,
    orderedBy_ID INT,
    assignedDepartment_ID INT,
    assignedUser_ID INT,
    status VARCHAR(20) NOT NULL DEFAULT 'ORDERED',
    resultText TEXT,
    fileUrl VARCHAR(1000),
    notes TEXT,
    orderedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    completedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_ID) REFERENCES visit(ID) ON DELETE CASCADE,
    FOREIGN KEY (orderedBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    FOREIGN KEY (assignedDepartment_ID) REFERENCES department(ID) ON DELETE SET NULL,
    FOREIGN KEY (assignedUser_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_labOrder_visit (visit_ID),
    INDEX idx_labOrder_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoice (one per visit)
-- status values: PENDING | PAID | WAIVED
CREATE TABLE invoice (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    visit_ID INT NOT NULL UNIQUE,
    totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    createdBy_ID INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_ID) REFERENCES visit(ID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_invoice_visit (visit_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- InvoicePayment (one per payment transaction — cash only for now, extensible)
CREATE TABLE invoicePayment (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    invoice_ID INT NOT NULL,
    method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    amount DECIMAL(10,2) NOT NULL,
    receivedBy_ID INT,
    paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_ID) REFERENCES invoice(ID) ON DELETE CASCADE,
    FOREIGN KEY (receivedBy_ID) REFERENCES user(ID) ON DELETE SET NULL,
    INDEX idx_invoicePayment_invoice (invoice_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;