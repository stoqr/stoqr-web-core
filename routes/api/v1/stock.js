const express = require('express');
const qrcode = require('qrcode');
const router = express.Router();
const { check, query, validationResult } = require('express-validator');
const config = require('config');
const host = config.get('host');
const middleware = require('../../../middleware/middleware');
const Stock = require('../../../models/Stock');
const Movement = require('../../../models/Movement');
const STOCK_STATUS_ACTIVE = 'Aktif';
const STOCK_STATUS_DEACTIVE = 'Deaktif';
const MOVEMENT_INCREASE_STOCK = 'Stok Arttır';
const MOVEMENT_DECREASE_STOCK = 'Stok Azalt';
const MOVEMENT_UPDATE_STOCK = 'Stok Güncelle';
const MOVEMENT_CREATE_STOCK = 'Stok Girişi';
const MOVEMENT_DELETE_STOCK = 'Stok Sil';

// @route   GET api/v1/stocks
// @desc    get all stocks
router.get('/', [middleware, []], async (req, res) => {
  try {
    const stocks = await Stock.find({
      status: STOCK_STATUS_ACTIVE,
      $or: [
        {
          code: { $regex: req.query.s },
        },
        {
          name: { $regex: req.query.s },
        },
      ],
    })
      .sort({ code: '1' })
      .limit(+req.query.l)
      .populate({ path: 'category', select: 'name' })
      .populate({
        path: 'location',
        select: 'name',
      });
    return res.json(stocks);
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

// @route   GET api/v1/stocks/categories
// @desc    get all stocks
router.get('/categories', [middleware, []], async (req, res) => {
  try {
    const stocks = await Stock.aggregate([
      {
        $match: {
          status: STOCK_STATUS_ACTIVE,
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
    ]);

    var labels = [];
    var data = [];
    var backgroundColor = [];
    stocks.map((stock) => {
      data.push(stock.count);
      backgroundColor.push(dynamicColors());
      labels.push(stock.category[0].name);
    });
    var data = {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColor,
        },
      ],
    };
    return res.json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

var dynamicColors = function () {
  var r = Math.floor(Math.random() * 255);
  var g = Math.floor(Math.random() * 255);
  var b = Math.floor(Math.random() * 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
};

// @route   GET api/v1/stocks/stats
// @desc    get all stats
router.get('/stats', [middleware, []], async (req, res) => {
  try {
    const stocks = await Stock.find({
      status: STOCK_STATUS_ACTIVE,
      $or: [
        {
          code: { $regex: req.query.s },
        },
        {
          name: { $regex: req.query.s },
        },
      ],
    });

    var stockCount = 0;
    var buyingPrice = 0;
    var sellingPrice = 0;
    var profit = 0;
    stocks.map((stock) => {
      stockCount = stockCount + +stock.stockCount;
      buyingPrice = buyingPrice + +stock.stockCount * +stock.buyingPrice;
      sellingPrice = sellingPrice + +stock.stockCount * +stock.sellingPrice;
    });
    profit = sellingPrice - buyingPrice;
    return res.json({
      stockCount: stockCount,
      buyingPrice: buyingPrice,
      sellingPrice: sellingPrice,
      profit: profit,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

// @route   GET api/v1/stocks/:code
// @desc    get a single stock by stock code
router.get('/:stock_id', middleware, async (req, res) => {
  try {
    var stock = await Stock.findOne({
      _id: req.params.stock_id,
    })
      .populate('category', ['name'])
      .populate('location', ['name'])
      .populate('createdUser', ['name']);
    if (!stock) {
      return res.status(400).json({
        msg:
          'Bu stok kodu ile kayıtlı bir stok mevcut değil, lütfen farklı bir stok kodu ile deneyiniz',
      });
    } else if (stock.status != STOCK_STATUS_ACTIVE) {
      return res.status(400).json({
        msg:
          'Bu stok kodu ile kayıtlı bir stok mevcut değil, lütfen farklı bir stok kodu ile deneyiniz',
      });
    }
    return res.json(stock);
  } catch (error) {
    if (error.kind == 'ObjectId') {
      return res.status(400).json({
        msg:
          'Bu stok kodu ile kayıtlı bir stok mevcut değil, lütfen farklı bir stok kodu ile deneyiniz',
      });
    } else {
      return res.status(500).send('Server error');
    }
  }
});

// @route   POST api/v1/stocks/:code
// @desc    update a single stock by stock code
router.post(
  '/:stock_id',
  [
    middleware,
    [
      check('code', 'Lütfen Stok Kodu alanını doldurunuz').not().isEmpty(),
      check(
        'code',
        'Stok Kodu maksimum 10 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 10 }),
      check(
        'code',
        'Stok Kodu minimum 3 karakter uzunluğunda olmalıdır'
      ).isLength({ min: 3 }),
      check(
        'code',
        'Stok Kodu sadece harf ve/veya rakam içermelidir'
      ).isAlphanumeric(),
      check('name', 'Lütfen Stok Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Stok Adı maksimum 100 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 100 }),
      check('category', 'Lütfen Kategori alanını doldurunuz').not().isEmpty(),
      check('location', 'Lütfen Lokasyon alanını doldurunuz').not().isEmpty(),
      check('criticalityLevel', 'Lütfen Kritiklik Seviyesi alanını doldurunuz')
        .not()
        .isEmpty(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi sadece sayı olabilir'
      ).isNumeric(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({ gt: -1 }),
      check('stockCount', 'Lütfen Stok Adedi alanını doldurunuz')
        .not()
        .isEmpty(),
      check('stockCount', 'Stok Adedi sadece sayı olabilir').isNumeric(),
      check(
        'stockCount',
        'Stok Adedi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({
        gt: -1,
      }),
      check('buyingPrice', 'Lütfen Alış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('buyingPrice', 'Alış Fiyatı  sadece sayı olabilir').isNumeric(),
      check('buyingPrice', 'Alış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
      check('sellingPrice', 'Lütfen Satış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('sellingPrice', 'Satış Fiyatı sadece sayı olabilir').isNumeric(),
      check('sellingPrice', 'Satış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code,
      name,
      category,
      location,
      criticalityLevel,
      stockCount,
      buyingPrice,
      sellingPrice,
    } = req.body;

    try {
      let stock = await Stock.findOne({ _id: req.params.stock_id });
      if (!stock) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu Stok numarası ile kayıtlı bir stok mevcut değil, lütfen farklı bir Stok Kodu deneyiniz',
            },
          ],
        });
      } else {
        const updatedStock = {};
        updatedStock.code = replaceTurkishAndToUpperCase(code);
        updatedStock.name = name;
        updatedStock.category = category;
        updatedStock.location = location;
        updatedStock.criticalityLevel = criticalityLevel;
        updatedStock.stockCount = stockCount;
        updatedStock.buyingPrice = buyingPrice;
        updatedStock.sellingPrice = sellingPrice;
        updatedStock.updatedUser = req.user.id; //coming from mw
        updatedStock.updatedDate = Date.now();
        updatedStock.criticalityStatus = calculateCriticalityStatus(
          updatedStock.stockCount,
          updatedStock.criticalityLevel
        );
        const qrOption = {
          margin: 5,
          width: 250,
          height: 250,
        };
        const qr_string = host + updatedStock.code;
        const bufferImage = await qrcode.toDataURL(qr_string, qrOption);
        updatedStock.qrCode = bufferImage;
        stock = await Stock.findOneAndUpdate(
          { _id: req.params.stock_id },
          {
            $set: updatedStock,
          },
          { new: true }
        );

        const updateMovement = {};
        updateMovement.type = MOVEMENT_UPDATE_STOCK;
        updateMovement.stockChange = stock.stockCount;
        updateMovement.stockCount = stock.stockCount;
        updateMovement.criticalityStatus = stock.criticalityStatus;
        updateMovement.stock = stock.id;
        updateMovement.createdUser = req.user.id;
        const movement = new Movement(updateMovement);
        await movement.save();

        return res.json(stock);
      }
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   POST api/v1/stocks
// @desc    create a new stock
router.post(
  '/',
  [
    middleware,
    [
      check('code', 'Lütfen Stok Kodu alanını doldurunuz').not().isEmpty(),
      check(
        'code',
        'Stok Kodu maksimum 10 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 10 }),
      check(
        'code',
        'Stok Kodu minimum 3 karakter uzunluğunda olmalıdır'
      ).isLength({ min: 3 }),
      check(
        'code',
        'Stok Kodu sadece harf ve/veya rakam içermelidir'
      ).isAlphanumeric(),
      check('name', 'Lütfen Stok Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Stok Adı maksimum 100 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 100 }),
      check('category', 'Lütfen Kategori alanını doldurunuz').not().isEmpty(),
      check('location', 'Lütfen Lokasyon alanını doldurunuz').not().isEmpty(),
      check('criticalityLevel', 'Lütfen Kritiklik Seviyesi alanını doldurunuz')
        .not()
        .isEmpty(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi sadece sayı olabilir'
      ).isNumeric(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({ gt: -1 }),
      check('stockCount', 'Lütfen Stok Adedi alanını doldurunuz')
        .not()
        .isEmpty(),
      check('stockCount', 'Stok Adedi sadece sayı olabilir').isNumeric(),
      check(
        'stockCount',
        'Stok Adedi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({
        gt: -1,
      }),
      check('buyingPrice', 'Lütfen Alış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('buyingPrice', 'Alış Fiyatı  sadece sayı olabilir').isNumeric(),
      check('buyingPrice', 'Alış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
      check('sellingPrice', 'Lütfen Satış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('sellingPrice', 'Satış Fiyatı sadece sayı olabilir').isNumeric(),
      check('sellingPrice', 'Satış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code,
      name,
      category,
      location,
      criticalityLevel,
      stockCount,
      buyingPrice,
      sellingPrice,
    } = req.body;

    try {
      /*
      let stock = await Stock.findOne({ code });
      if (stock) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu Stok Kodu ile kayıtlı bir stok mevcut, lütfen farklı bir Stok Kodu deneyiniz',
            },
          ],
        });
      }
*/
      const newStock = {};
      newStock.code = replaceTurkishAndToUpperCase(code);
      newStock.name = name;
      newStock.category = category;
      newStock.location = location;
      newStock.criticalityLevel = criticalityLevel;
      newStock.stockCount = stockCount;
      newStock.buyingPrice = buyingPrice;
      newStock.sellingPrice = sellingPrice;
      newStock.createdUser = req.user.id; //coming from mw
      newStock.updatedUser = req.user.id; //coming from mw
      newStock.criticalityStatus = calculateCriticalityStatus(
        newStock.stockCount,
        newStock.criticalityLevel
      );
      const qrOption = {
        margin: 5,
        width: 250,
        height: 250,
      };
      const qr_string = host + newStock.code;
      const bufferImage = await qrcode.toDataURL(qr_string, qrOption);
      newStock.qrCode = bufferImage;
      stock = new Stock(newStock);
      await stock.save();

      const createMovement = {};
      createMovement.type = MOVEMENT_CREATE_STOCK;
      createMovement.stockChange = stock.stockCount;
      createMovement.stockCount = stock.stockCount;
      createMovement.criticalityStatus = stock.criticalityStatus;
      createMovement.stock = stock.id;
      createMovement.createdUser = req.user.id;
      const movement = new Movement(createMovement);
      await movement.save();

      return res.json(stock);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/v1/stocks
// @desc    update new stock
router.put(
  '/:stock_id',
  [
    middleware,
    [
      check('code', 'Lütfen Stok Kodu alanını doldurunuz').not().isEmpty(),
      check(
        'code',
        'Stok Kodu maksimum 10 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 10 }),
      check(
        'code',
        'Stok Kodu minimum 3 karakter uzunluğunda olmalıdır'
      ).isLength({ min: 3 }),
      check(
        'code',
        'Stok Kodu sadece harf ve/veya rakam içermelidir'
      ).isAlphanumeric(),
      check('name', 'Lütfen Stok Adı alanını doldurunuz').not().isEmpty(),
      check(
        'name',
        'Stok Adı maksimum 100 karakter uzunluğunda olmalıdır'
      ).isLength({ max: 100 }),
      check('category', 'Lütfen Kategori alanını doldurunuz').not().isEmpty(),
      check('location', 'Lütfen Lokasyon alanını doldurunuz').not().isEmpty(),
      check('criticalityLevel', 'Lütfen Kritiklik Seviyesi alanını doldurunuz')
        .not()
        .isEmpty(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi sadece sayı olabilir'
      ).isNumeric(),
      check(
        'criticalityLevel',
        'Kritiklik Seviyesi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({ gt: -1 }),
      check('stockCount', 'Lütfen Stok Adedi alanını doldurunuz')
        .not()
        .isEmpty(),
      check('stockCount', 'Stok Adedi sadece sayı olabilir').isNumeric(),
      check(
        'stockCount',
        'Stok Adedi 0(Sıfır) veya 0(Sıfır) dan büyük olmalıdır'
      ).isInt({
        gt: -1,
      }),
      check('buyingPrice', 'Lütfen Alış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('buyingPrice', 'Alış Fiyatı  sadece sayı olabilir').isNumeric(),
      check('buyingPrice', 'Alış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
      check('sellingPrice', 'Lütfen Satış Fiyatı alanını doldurunuz')
        .not()
        .isEmpty(),
      check('sellingPrice', 'Satış Fiyatı sadece sayı olabilir').isNumeric(),
      check('sellingPrice', 'Satış Fiyatı 0(Sıfır) dan büyük olmalıdır').isInt({
        gt: 0,
      }),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code,
      name,
      category,
      location,
      criticalityLevel,
      stockCount,
      buyingPrice,
      sellingPrice,
    } = req.body;

    try {
      let stock = await Stock.findOne({ _id: req.params.stock_id });
      if (!stock) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu Stok Kodu ile kayıtlı bir stok mevcut değil, lütfen farklı bir Stok Kodu deneyiniz',
            },
          ],
        });
      }
      const updateMovement = {};

      const updatedStock = {};
      updatedStock.code = replaceTurkishAndToUpperCase(code);
      updatedStock.name = name;
      updatedStock.category = category;
      updatedStock.location = location;
      updatedStock.criticalityLevel = criticalityLevel;
      updatedStock.stockCount = stockCount;
      updatedStock.buyingPrice = buyingPrice;
      updatedStock.sellingPrice = sellingPrice;
      updatedStock.createdUser = stock.createdUser;
      updatedStock.createdDate = stock.createdTime;
      updatedStock.updatedUser = req.user.id; //coming from mw
      updatedStock.updatedDate = Date.now();
      updatedStock.criticalityStatus = calculateCriticalityStatus(
        updatedStock.stockCount,
        updatedStock.criticalityLevel
      );
      const qrOption = {
        margin: 5,
        width: 250,
        height: 250,
      };
      const qr_string = host + updatedStock.code;
      const bufferImage = await qrcode.toDataURL(qr_string, qrOption);
      updatedStock.qrCode = bufferImage;

      updateMovement.stockChange = updatedStock.stockCount - stock.stockCount;
      updateMovement.stockCount = updatedStock.stockCount;

      stock = await Stock.findOneAndUpdate(
        { _id: req.params.stock_id },
        {
          $set: updatedStock,
        },
        { new: true }
      );

      updateMovement.type = MOVEMENT_UPDATE_STOCK;
      updateMovement.criticalityStatus = stock.criticalityStatus;
      updateMovement.stock = stock.id;
      updateMovement.createdUser = req.user.id;
      updateMovement.createdDate = Date.now();
      const movement = new Movement(updateMovement);
      await movement.save();

      return res.json(stock);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   PATCH api/v1/stocks/:code
// @desc    update stock count and stock criticality status
router.patch(
  '/:stock_id',
  [
    middleware,
    [
      check(
        'stockchange',
        'Lütfen stok değişiklik miktarını doldurunuz'
      ).exists(),
      check('stockchange', 'Lütfen stok değişiklik miktarını giriniz')
        .not()
        .isEmpty(),
      check(
        'stockchange',
        'Stok değişiklik miktarı sadece sayı değeri alabilir'
      ).isInt(),
    ],
  ],
  async (req, res) => {
    //form errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      let stock = await Stock.findOne({ _id: req.params.stock_id });
      if (!stock) {
        return res.status(400).json({
          errors: [
            {
              msg:
                'Bu Stok numarası ile kayıtlı bir stok mevcut değil, lütfen farklı bir Stok Kodu deneyiniz',
            },
          ],
        });
      } else {
        const modifiedStock = {};
        let stockChange = Number(req.body.stockchange);
        if (stock.stockCount + stockChange < 0) {
          return res.status(400).json({
            errors: [
              {
                msg:
                  stock.code +
                  ' koduna sahip stoktan en fazla ' +
                  stock.stockCount +
                  ' adet stok azaltılabilir',
              },
            ],
          });
        } else {
          modifiedStock.stockCount = stock.stockCount + stockChange;
        }
        modifiedStock.criticalityStatus = calculateCriticalityStatus(
          modifiedStock.stockCount,
          stock.criticalityLevel
        );
        stock = await Stock.findOneAndUpdate(
          { _id: req.params.stock_id },
          {
            $set: modifiedStock,
          },
          { new: true }
        ).populate('category', ['name']);

        const changeMovement = {};
        if (stockChange < 0) {
          changeMovement.type = MOVEMENT_DECREASE_STOCK;
        } else {
          changeMovement.type = MOVEMENT_INCREASE_STOCK;
        }
        changeMovement.stockChange = stockChange;
        changeMovement.stockCount = stock.stockCount;
        changeMovement.criticalityStatus = stock.criticalityStatus;
        changeMovement.stock = stock.id;
        changeMovement.createdUser = req.user.id;
        const movement = new Movement(changeMovement);
        await movement.save();

        return res.json(stock);
      }
    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/v1/stocks/:code
// @desc    deactivate stock
router.delete('/:stock_id', [middleware, []], async (req, res) => {
  try {
    let stock = await Stock.findOne({ _id: req.params.stock_id });
    if (!stock) {
      return res.status(400).json({
        errors: [
          {
            msg:
              'Bu Stok Kodu ile kayıtlı bir stok mevcut değil, lütfen farklı bir Stok Kodu deneyiniz',
          },
        ],
      });
    } else {
      const modifiedStock = {};
      modifiedStock.status = STOCK_STATUS_DEACTIVE;
      stock = await Stock.findOneAndUpdate(
        { code: req.params.stock_id },
        {
          $set: modifiedStock,
        },
        { new: true }
      );

      const deleteMovement = {};
      deleteMovement.type = MOVEMENT_DELETE_STOCK;
      deleteMovement.stockChange = -+stock.stockCount;
      deleteMovement.stockCount = 0;
      deleteMovement.criticalityStatus = stock.criticalityStatus;
      deleteMovement.stock = stock.id;
      deleteMovement.createdUser = req.user.id;
      deleteMovement.createdDate = Date.now();
      const movement = new Movement(deleteMovement);
      await movement.save();
      return res.json(stock);
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});

function calculateCriticalityStatus(stock_count, criticality_level) {
  if (+stock_count == 0) {
    return 'Stok Yok';
  } else if (+stock_count <= +criticality_level) {
    return 'Acil';
  } else if (
    stock_count <=
    +criticality_level + (+criticality_level * 20) / 100
  ) {
    return 'Kritik';
  } else if (
    +stock_count <=
    +criticality_level + (+criticality_level * 50) / 100
  ) {
    return 'Normal';
  } else {
    return 'İyi';
  }
}

async function generateQRCodeAsBase64String(qr_string) {}

function replaceTurkishAndToUpperCase(code) {
  return code
    .replace(/Ğ/gim, 'G')
    .replace(/Ü/gim, 'U')
    .replace(/Ş/gim, 'S')
    .replace(/İ/gim, 'I')
    .replace(/Ö/gim, 'O')
    .replace(/Ç/gim, 'C')
    .replace(/ğ/gim, 'g')
    .replace(/ü/gim, 'u')
    .replace(/ş/gim, 's')
    .replace(/ı/gim, 'i')
    .replace(/ö/gim, 'o')
    .replace(/ç/gim, 'c')
    .toUpperCase();
}

module.exports = router;
