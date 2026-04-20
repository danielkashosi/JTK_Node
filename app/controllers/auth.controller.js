const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const appConfig = require("../config/app.config.js");
const jwtConfig = require("../config/jwt.config.js");
const transporter = require("../config/mailer.js");
const db = require("../models");
const User = db.users;
const Person = db.persons;
const UserStatus = db.userStatus;
const RefreshToken = db.refreshTokens;
const TaskFeature = db.taskFeature;
const TaskFeature_has_user = db.taskFeature_has_user;
const TaskFeature_has_group = db.taskFeature_has_group;
const Group_has_user = db.group_has_user;
const Op = db.Sequelize.Op;

// Promisified jwt.verify to avoid async-in-callback unhandled rejections (H-7)
function jwtVerifyAsync(token, secret) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

// Shared password strength validation (M-5)
function validatePasswordStrength(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

// login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ status: 'failure', data: 'Email or password is incorrect.' });
  }

  try {
    const user = await User.findOne({
      where: { 
        [Op.or]: [
          { email: email },
          { userName: email }
        ]
      },
      include: Person
    })
    
    if (user && await bcrypt.compare(password, user.password)) {
        const payload = { ID: user.ID }
        const accessToken = jwt.sign(
          payload,
          jwtConfig.ACCESS_TOKEN_PRIVATE_KEY,
          { expiresIn: jwtConfig.ACCESS_TOKEN_EXPIRES_IN }
        )

        const refreshToken = jwt.sign(
          payload,
          jwtConfig.REFRESH_TOKEN_PRIVATE_KEY,
          { expiresIn: jwtConfig.REFRESH_TOKEN_EXPIRES_IN }
        )
  
        const oldToken = await user.getRefreshToken();

        if (oldToken) {
          await RefreshToken.destroy({ where: { ID: oldToken.ID }})
        }

        await user.createRefreshToken({
          Token: refreshToken,
          CreatedByIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        })

        res.send({
          status: 'success',
          data: {
            user_ID: user.ID,
            userName: user.userName,
            email: user.email,
            firstName: user.person.firstName,
            lastName: user.person.lastName,
            accessToken,
            refreshToken
          }
        })
    }
    else {
      // Return 401 — do not differentiate between bad email and bad password (H-5)
      return res.status(401).json({
        status: 'failure',
        data: 'Email or password is incorrect.'
      });
    }
  } catch(err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while login the user."
    });
  }
};


exports.signup = async (req, res) => {
  const { userName, password, email, firstName, lastName } = req.body;

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
    // Check both userName and email uniqueness (M-2)
    const existing = await User.findOne({
      where: { [Op.or]: [{ userName }, { email }] }
    });
    if (existing) {
      return res.status(400).send({
        message: existing.userName === userName
          ? 'Username is already taken.'
          : 'Email address is already registered.'
      });
    }

    const newPerson = await Person.create({
      firstName,
      lastName
    })

    const payload = { email }

    const verifyToken = jwt.sign(
      payload,
      jwtConfig.VERIFY_TOKEN_PRIVATE_KEY,
      { expiresIn: jwtConfig.VERIFY_TOKEN_EXPIRES_IN }
    )

    const pendingStatus = await UserStatus.findOne({ where: { name: "PENDING" }})
    
    await newPerson.createUser({
      userName: userName,
      password: await bcrypt.hash(password, 10),
      email: email,
      userStatus_ID: pendingStatus.ID,
      VerificationToken: verifyToken
    })

    await transporter.sendMail({
        from: appConfig.MAIL_DEFAULT_SENDER,
        to: email,
        subject: "Please verify your email",
        text: `${appConfig.BASE_URL}/verify/${verifyToken}`,
    });

    res.status(201).json({
      'message': 'A confirmation email has been sent via email'
    })
  } catch(err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while signup"
    });
  }
}

exports.verify = async (req, res) => {
  const token = req.params.token;

  try {
    const tokenDetails = await jwtVerifyAsync(token, jwtConfig.VERIFY_TOKEN_PRIVATE_KEY);
    const user = await User.findOne({ where: { email: tokenDetails.email } });
    if (!user) {
      return res.status(400).send({ message: 'Invalid verify token' });
    }
    const activeStatus = await UserStatus.findOne({ where: { name: "ACTIVE" } });
    await User.update({
      userStatus_ID: activeStatus.ID,
      VerificationToken: '',
      Verified: new Date()
    }, {
      where: { ID: user.ID }
    });
    res.status(201).json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(400).send({ message: 'Invalid verify token' });
  }
}

exports.logout = async (req, res) => {
  try {
    await RefreshToken.destroy({ where: { user_ID: req.user.ID } });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch(err) {
    res.status(500).send({
      message: err.message || 'Some error occurred while logging out'
    });
  }
}

exports.getMyPermissions = async (req, res) => {
  try {
    const userId = req.user.ID;

    // Collect IDs from direct user-level permissions
    const directLinks = await TaskFeature_has_user.findAll({ where: { user_ID: userId } });
    const directIds = directLinks.map(l => l.taskFeature_ID);

    // Collect IDs from group-based permissions
    const userGroups = await Group_has_user.findAll({ where: { user_ID: userId } });
    let groupFeatureIds = [];
    if (userGroups.length > 0) {
      const groupIds = userGroups.map(g => g.group_ID);
      const groupLinks = await TaskFeature_has_group.findAll({ where: { group_ID: groupIds } });
      groupFeatureIds = groupLinks.map(l => l.taskFeature_ID);
    }

    const allIds = [...new Set([...directIds, ...groupFeatureIds])];

    if (allIds.length === 0) {
      return res.json({ permissions: [] });
    }

    const features = await TaskFeature.findAll({ where: { ID: allIds } });
    const permissions = features.map(f => f.name);

    res.json({ permissions });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error fetching permissions.' });
  }
};

exports.refreshToken = async (req, res) => {
  const token = await RefreshToken.findOne({ where: { Token: req.body.refreshToken } });

  if (!token) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  try {
    const tokenDetails = await jwtVerifyAsync(token.Token, jwtConfig.REFRESH_TOKEN_PRIVATE_KEY);
    const payload = { ID: tokenDetails.ID };
    const accessToken = jwt.sign(
      payload,
      jwtConfig.ACCESS_TOKEN_PRIVATE_KEY,
      { expiresIn: jwtConfig.ACCESS_TOKEN_EXPIRES_IN }
    );
    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

exports.forgetPassword = async (req, res) => {
  const email = req.body.email;

  if (!email) {
    res.status(400).send({
      message: "Email can not be empty!"
    });
    return;
  }

  // Always return the same message to prevent user enumeration (H-6)
  const GENERIC_MSG = { message: 'If an account with that email exists, a password reset link has been sent.' };

  try {
    const user = await User.findOne({ where: { email } });
    if (user) {
      const payload = { ID: user.ID };
      const resetToken = jwt.sign(
        payload,
        jwtConfig.RESET_TOKEN_PRIVATE_KEY,
        { expiresIn: jwtConfig.RESET_TOKEN_EXPIRES_IN }
      );
      
      await User.update({
        ResetToken: resetToken,
        ResetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }, {
        where: { ID: user.ID }
      });

      await transporter.sendMail({
          from: appConfig.MAIL_DEFAULT_SENDER,
          to: user.email,
          subject: "Password reset",
          text: `${appConfig.BASE_URL}/resetPassword/${resetToken}`,
      });
    }

    res.status(200).json(GENERIC_MSG);
  } catch(err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while reset password"
    });
  }
}

exports.resetPassword = async (req, res) => {
  const resetToken = req.body.token;
  const password = req.body.password;
  if (!resetToken || !password) {
    res.status(400).send({
      message: "Content can not be empty!"
    });
    return;
  }

  // Password strength check (M-5)
  const pwError = validatePasswordStrength(password);
  if (pwError) return res.status(400).json({ message: pwError });

  try {
    const tokenDetails = await jwtVerifyAsync(resetToken, jwtConfig.RESET_TOKEN_PRIVATE_KEY);
    const user = await User.findOne({ where: { ID: tokenDetails.ID, ResetToken: resetToken } });
    if (!user) {
      return res.status(400).send({ message: 'Invalid reset token' });
    }
    if (!user.ResetTokenExpires || user.ResetTokenExpires < new Date()) {
      return res.status(400).send({ message: 'Reset token has expired' });
    }

    await User.update({
      password: await bcrypt.hash(password, 10),
      ResetToken: '',
      PasswordReset: new Date()
    }, {
      where: { ID: user.ID }
    });

    // Revoke all existing refresh tokens so stolen sessions are invalidated (H-8)
    await RefreshToken.destroy({ where: { user_ID: user.ID } });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).send({ message: 'Invalid reset token' });
  }
}