const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const User = require('../../../models/User');
const middleware = require('../../../middleware/middleware');
const jwtSecret = config.get('jwtSecret');

// @route   POST api/v1/users
// @desc    Registering a single user
router.post(
  '/',
  [
    [
      check('name', 'Lütfen Ad Soyad alanını doldurunuz').not().isEmpty(),
      check('email', 'Lütfen E-Posta alanını doldurunuz').not().isEmpty(),
      check('email', 'Lütfen geçerli bir E-Posta adresi giriniz').isEmail(),
      check('password', 'Lütfen Şifre alanını doldurunuz').not().isEmpty(),
      check(
        'password',
        'Şifre en az 6 karakter uzunluğunda olmalıdır'
      ).isLength({
        min: 6,
      }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      //user exists?
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu e-posta adresi ile kayıtlı bir kullanıcı mevcut, lütfen farklı bir e-posta adresi deneyiniz',
            },
          ],
        });
      }

      const newUser = {};
      newUser.name = name;
      newUser.email = email;
      newUser.password = password;
      newUser.role = role;
      //user does not exist, create user object
      user = new User(newUser);

      //encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      //save user to db
      await user.save();

      //create jwt
      const payload = {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      };
      jwt.sign(payload, jwtSecret, { expiresIn: 360000 }, (err, token) => {
        if (err) {
          throw err;
        } else {
          res.json({ token });
        }
      });
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/v1/users
// @desc    Updating a single user
router.put(
  '/:user_id',
  [
    [
      check('name', 'Lütfen Ad Soyad alanını doldurunuz').not().isEmpty(),
      check('email', 'Lütfen E-Posta alanını doldurunuz').not().isEmpty(),
      check('email', 'Lütfen geçerli bir E-Posta adresi giriniz').isEmail(),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, status } = req.body;

    try {
      //user exists?
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.id != req.params.user_id) {
        return res.status(400).json({
          errors: [
            {
              msg: 'Bu e-posta adresi ile kayıtlı bir kullanıcı mevcut',
            },
          ],
        });
      }

      const updatedUser = {};
      updatedUser.name = name;
      updatedUser.email = email;
      if (role && role !== '') updatedUser.role = role;
      if (status && status !== '') updatedUser.status = status;

      //save user to db
      user = await User.findOneAndUpdate(
        { _id: req.params.user_id },
        {
          $set: updatedUser,
        },
        { new: true }
      );
      res.json(user);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/v1/users
// @desc    Updating a single user
router.put(
  '/:user_id/:p',
  [
    [
      check('password', 'Lütfen Şifre alanını doldurunuz').not().isEmpty(),
      check(
        'password',
        'Şifre en az 6 karakter uzunluğunda olmalıdır'
      ).isLength({
        min: 6,
      }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { password } = req.body;

    //encrypt password
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);

    try {
      //user exists?
      const existingUser = await User.findOne({ _id: req.params.user_id });
      if (existingUser && existingUser.id != req.params.user_id) {
        return res.status(400).json({
          errors: [
            {
              msg: 'Bu e-posta adresi ile kayıtlı bir kullanıcı mevcut',
            },
          ],
        });
      }

      const updatedUser = {};
      updatedUser.password = password;

      //save user to db
      user = await User.findOneAndUpdate(
        { _id: req.params.user_id },
        {
          $set: updatedUser,
        },
        { new: true }
      );
      res.json(user);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

router.get('/self', middleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(400).json({ msg: 'Kullanıcı bulunamadı!' });
    }

    res.json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

router.get('/:user_id', middleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id).select('-password');
    if (!user) {
      return res.status(400).json({ msg: 'Kullanıcı bulunamadı!' });
    }

    res.json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

router.get('/', middleware, async (req, res) => {
  try {
    const user = await User.find().select('-password');
    res.json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
