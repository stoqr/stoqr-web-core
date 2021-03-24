const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const middleware = require('../../../middleware/middleware');
const User = require('../../../models/User');
const jwtSecret = config.get('jwtSecret');
const USER_STATUS_ACTIVE = 'Aktif';
const USER_STATUS_DEACTIVE = 'Deaktif';

// @route GET api/v1/auth
router.get('/', middleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/v1/auth
// @desc    auth user & get token
router.post(
  '/',
  [
    check('email', 'Lütfen E-Posta alanını doldurunuz').not().isEmpty(),
    check('email', 'Lütfen geçerli bir E-Posta adresi giriniz').isEmail(),
    check('password', 'Lütfen Şifre alanını doldurunuz').not().isEmpty(),
    check(
      'password',
      'Lütfen şifreyi en az 6 karakter uzunluğunda giriniz'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      //user exists?
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Geçersiz e-posta veya şifre girdiniz. Lütfen tekrar deneyiniz',
            },
          ],
        });
      } else {
        //user exists, check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({
            errors: [
              {
                msg:
                  'Geçersiz e-posta veya şifre girdiniz. Lütfen tekrar deneyiniz',
              },
            ],
          });
        } else {
          if (user.status == USER_STATUS_DEACTIVE) {
            return res.status(400).json({
              errors: [
                {
                  msg:
                    'Kullanıcınız aktif değildir. Lütfen stoqr yöneticileri ile iletişime geçiniz',
                },
              ],
            });
          }
        }
      }
      //create jwt
      const payload = {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
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

module.exports = router;
