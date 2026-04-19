const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt.config.js");
const db = require("../models");
const TaskFeature_has_user = db.taskFeature_has_user;
const TaskFeature = db.taskFeature;

exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, jwtConfig.ACCESS_TOKEN_PRIVATE_KEY, (err, user) => {
      if (err) {
        return res.sendStatus(401);
      }

      req.user = user

      next();
    });
  } else {
    res.sendStatus(401);
  }
}

exports.checkTaskFeature = (taskFeatureName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    try {
      const taskFeature = await TaskFeature.findOne({
        where: { name: taskFeatureName }
      });
  
      if (taskFeature) {
        // Check direct user permission
        const directPerm = await TaskFeature_has_user.findOne({
          where: { taskFeature_ID: taskFeature.ID, user_ID: req.user.ID }
        });
        if (directPerm) {
          return next();
        }

        // Check group-based permission
        const db_ref = require('../models');
        const Group_has_user = db_ref.group_has_user;
        const TaskFeature_has_group = db_ref.taskFeature_has_group;

        const userGroups = await Group_has_user.findAll({ where: { user_ID: req.user.ID } });
        if (userGroups.length) {
          const groupIds = userGroups.map(g => g.group_ID);
          const groupPerm = await TaskFeature_has_group.findOne({
            where: { taskFeature_ID: taskFeature.ID, group_ID: groupIds }
          });
          if (groupPerm) {
            return next();
          }
        }

        // Authenticated but lacks permission → 403 Forbidden
        return res.sendStatus(403);
      }
      else {
        return res.sendStatus(403);
      }
    } catch (err) {
      console.error('checkTaskFeature error:', err);
      return res.status(500).json({ message: 'Authorization check failed.' });
    }
  };
}

