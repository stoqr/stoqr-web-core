const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const middleware = require('../../../middleware/middleware');
const Category = require('../../../models/Category');

// @route   POST api/v1/categories
// @desc    create a single category
router.post(
  '/',
  [
    middleware,
    [
      check('name', 'Lütfen Kategori Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Kategori Adı en fazla 50 karakter uzunluğunda olmalıdır'
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
      //category exists?
      let category = await Category.findOne({ name });
      if (category) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu kategori adı ile kayıtlı bir kategori mevcut, lütfen farklı bir kategori adı deneyiniz',
            },
          ],
        });
      }

      //category does not exist, create category object
      category = new Category({
        name: name,
        createdUser: req.user.id,
      });
      //save category to db
      await category.save();
      res.json(category);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/v1/categories
// @desc    update a single category
router.put(
  '/:category_id',
  [
    middleware,
    [
      check('name', 'Lütfen Kategori Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Kategori Adı en fazla 50 karakter uzunluğunda olmalıdır'
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
      //category exists?
      let category = await Category.findOne({ name });

      if (category && category._id != req.params.category_id) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu kategori adı ile kayıtlı bir kategori mevcut, lütfen farklı bir kategori adı deneyiniz',
            },
          ],
        });
      }

      const updatedCategory = {};
      updatedCategory.name = name;
      updatedCategory.status = status;

      //save user to db
      category = await Category.findOneAndUpdate(
        { _id: req.params.category_id },
        {
          $set: updatedCategory,
        },
        { new: true }
      );
      res.json(category);
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
    const categories = await Category.find(statusObject)
      .populate({ path: 'createdUser', select: '-password' })
      .sort('name');
    if (!categories) {
      return res.status(400).json({ msg: 'Kategori bulunamadı!' });
    }

    res.json(categories);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
