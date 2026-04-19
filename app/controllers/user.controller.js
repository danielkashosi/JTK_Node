const bcrypt = require("bcrypt");
const db = require("../models");
const User = db.users;
const Person = db.persons;
const UserStatus = db.userStatus;
const TaskFeature_has_user = db.taskFeature_has_user;
const Group_has_user = db.group_has_user;
const Op = db.Sequelize.Op;

// Shared password strength validation (M-5)
function validatePasswordStrength(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

// Create and Save a new User
exports.create = async (req, res) => {
  // Validate request
  const { userName, password, email, firstName, lastName, DOB } = req.body
  if (!userName || !password || !email || !firstName || !lastName) {
    res.status(400).send({
      message: "Content can not be empty!"
    });
    return;
  }

  // Password strength check (M-5)
  const pwError = validatePasswordStrength(password);
  if (pwError) return res.status(400).json({ message: pwError });

  try {
    // Save User in the database
    const newPerson = await Person.create({
      firstName,
      lastName,
      DOB
    })

    const pendingStatus = await UserStatus.findOne({ where: { name: "PENDING" }})

    await newPerson.createUser({
      userName,
      password: await bcrypt.hash(password, 10),
      email,
      userStatus_ID: pendingStatus.ID,
    })

    res.json({
      'message': 'User was created successfully'
    })
  } catch(err) {
    console.error('Some error occurred while creating user:', err);
    res.status(500).send({ message: "An error occurred. Please try again." });
  }
};

// Retrieve all Users from the database.
exports.list = async (req, res) => {
  const userName = req.query.userName || '';
  const email = req.query.email || '';
  const userStatus_ID = req.query.userStatus_ID || '';
  const sortBy = req.query.sortBy || 'ID';
  const sortOrder = (req.query.sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100); // cap at 100 (M-4)
  const offset = (page - 1) * limit;

  var condition = {}
  
  if (userName) condition['userName'] = { [Op.like]: `%${userName}%` }
  if (email) condition['email'] = { [Op.like]: `%${email}%` }
  if (userStatus_ID) condition['userStatus_ID'] = userStatus_ID

  const allowedSortFields = ['ID', 'userName', 'email'];
  const safeSort = allowedSortFields.includes(sortBy) ? sortBy : 'ID';

  try {
    const { count, rows: users } = await User.findAndCountAll({ 
      attributes: { exclude: ['password'] }, 
      where: condition, 
      include: [Person, UserStatus],
      order: [[safeSort, sortOrder]],
      limit,
      offset
    })
    res.send({ total: count, page, limit, data: users })
  } catch (err) {
    console.error('Some error occurred while retrieving users:', err);
    res.status(500).send({ message: "An error occurred. Please try again." });
  }
};

// List all UserStatus options
exports.listStatuses = async (req, res) => {
  try {
    const statuses = await UserStatus.findAll();
    res.send(statuses);
  } catch(err) {
    console.error('Error retrieving user statuses:', err);
    res.status(500).send({ message: "An error occurred. Please try again." });
  }
};

// Find a single user with an id
exports.read = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] }, include: [Person, UserStatus] })
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({
        message: `Cannot find User with id=${id}.`
      });
    }
  } catch(err) {
    res.status(500).send({
      message: "Error retrieving User with id=" + id
    });
  }
};

// Update a User by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  const { userName, email, password, firstName, lastName, DOB } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).send({ message: `Cannot find User with id=${id}.` });
    }

    // Update User table fields
    const userUpdate = {};
    if (userName) userUpdate['userName'] = userName;
    if (email) userUpdate['email'] = email;
    if (password) {
      const pwError = validatePasswordStrength(password);
      if (pwError) return res.status(400).json({ message: pwError });
      userUpdate['password'] = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdate).length) {
      await User.update(userUpdate, { where: { ID: id } });
    }

    // Update Person table fields
    const personUpdate = {};
    if (firstName) personUpdate['firstName'] = firstName;
    if (lastName) personUpdate['lastName'] = lastName;
    if (DOB) personUpdate['DOB'] = DOB;

    if (Object.keys(personUpdate).length) {
      await Person.update(personUpdate, { where: { ID: user.person_ID } });
    }

    res.send({ message: "User was updated successfully." });
  } catch(err) {
    res.status(500).send({ message: "Error updating User with id=" + id });
  }
};

// Change user status (activate / deactivate / suspend)
exports.changeStatus = async (req, res) => {
  const id = req.params.id;
  const { userStatus_ID } = req.body;

  if (!userStatus_ID) {
    return res.status(400).send({ message: "userStatus_ID is required." });
  }

  try {
    const status = await UserStatus.findByPk(userStatus_ID);
    if (!status) return res.status(400).send({ message: "Invalid userStatus_ID." });

    const num = await User.update({ userStatus_ID }, { where: { ID: id } });
    if (num[0] === 1) {
      res.send({ message: "User status updated successfully." });
    } else {
      res.status(404).send({ message: `Cannot find User with id=${id}.` });
    }
  } catch(err) {
    res.status(500).send({ message: "Error updating status for User with id=" + id });
  }
};

// Change own password (authenticated user)
exports.changePassword = async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword } = req.body;

  // Ownership check — only allow a user to change their own password (M-1: IDOR fix)
  if (req.user.ID !== parseInt(id, 10)) {
    return res.status(403).send({ message: 'You can only change your own password.' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).send({ message: "currentPassword and newPassword are required." });
  }

  // Password strength check (M-5)
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return res.status(400).json({ message: pwError });

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).send({ message: `Cannot find User with id=${id}.` });

    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).send({ message: "Current password is incorrect." });
    }

    await User.update({ password: await bcrypt.hash(newPassword, 10) }, { where: { ID: id } });
    res.send({ message: "Password changed successfully." });
  } catch(err) {
    res.status(500).send({ message: "Error changing password for User with id=" + id });
  }
};

// Delete a User with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).send({
      message: `Cannot find User with id=${id}.`
    });
  }

  const person_ID = user.person_ID;
  const t = await db.sequelize.transaction();
  try {
    await TaskFeature_has_user.destroy({
      where: { user_ID: user.ID },
      transaction: t
    });

    await Group_has_user.destroy({
      where: { user_ID: user.ID },
      transaction: t
    });

    await User.destroy({
      where: { ID: id },
      transaction: t
    });

    await Person.destroy({
      where: { ID: person_ID },
      transaction: t
    });

    await t.commit();
    res.send({ message: "User was deleted successfully!" });
  } catch (err) {
    await t.rollback();
    console.error('Delete user error:', err);
    res.status(500).send({ message: "Error deleting user. Please try again." });
  }
};
