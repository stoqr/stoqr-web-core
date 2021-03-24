const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const middleware = require('../../../middleware/middleware');
const Location = require('../../../models/Location');

// @route   POST api/v1/locations
// @desc    create a single location
router.post(
  '/',
  [
    middleware,
    [
      check('name', 'Lütfen Lokasyon Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Lokasyon Adı en fazla 50 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 50 }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    try {
      //location exists?
      let location = await Location.findOne({ name });
      if (location) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu lokasyon adı ile kayıtlı bir lokasyon mevcut, lütfen farklı bir lokasyon adı deneyiniz',
            },
          ],
        });
      }

      //location does not exist, create location object
      location = new Location({
        name: name,
        createdUser: req.user.id,
      });
      //save location to db
      await location.save();
      res.json(location);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/v1/locations
// @desc    update a single location
router.put(
  '/:location_id',
  [
    middleware,
    [
      check('name', 'Lütfen Lokasyon Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Lokasyon Adı en fazla 50 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 50 }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, status } = req.body;

    try {
      //location exists?
      let location = await Location.findOne({ name });

      if (location && location._id != req.params.location_id) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu kategori adı ile kayıtlı bir kategori mevcut, lütfen farklı bir kategori adı deneyiniz',
            },
          ],
        });
      }

      const updatedLocation = {};
      updatedLocation.name = name;
      updatedLocation.status = status;

      //save user to db
      location = await Location.findOneAndUpdate(
        { _id: req.params.location_id },
        {
          $set: updatedLocation,
        },
        { new: true }
      );
      res.json(location);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

router.get('/', middleware, async (req, res) => {
  var statusObject = {};
  if (req.query.status && req.query.status != '') {
    statusObject.status = req.query.status;
  }

  try {
    const locations = await Location.find(statusObject)
      .populate({ path: 'createdUser', select: '-password' })
      .sort('name');
    if (!locations) {
      return res.status(400).json({ msg: 'Lokasyon bulunamadı!' });
    }

    res.json(locations);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
