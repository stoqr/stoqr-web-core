const express = require('express');
const middleware = require('../../../middleware/middleware');
const Movement = require('../../../models/Movement');
const dateformat = require('dateformat');
const router = express.Router();

// @route   GET api/v1/movements
// @desc    get all movements
router.get('/', [middleware, []], async (req, res) => {
  try {
    const movements = await Movement.find()
      .populate('stock', [
        'code',
        'name',
        'stockCount',
        'criticalityLevel',
        'criticalityStatus',
        'status',
      ])
      .populate('createdUser', ['name'])
      .limit(+req.query.l)
      .sort({ createdDate: '-1' });
    return res.json(movements);
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

// @route   GET api/v1/movements/stats
// @desc    get movements with stats
router.get('/stats', middleware, async (req, res) => {
  try {
    const movements = await Movement.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdDate' },
            year: { $year: '$createdDate' },
          },
          total_movement: { $sum: '$stockChange' },
        },
      },
      { $sort: { month: 1 } },
      { $sort: { year: 1 } },
    ]);

    var unorderedList = [];
    movements.map((movement) => {
      unorderedList.push({
        date: new Date(movement._id.year, movement._id.month),
        data: movement.total_movement,
      });
    });
    function comp(a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    var orderedList = unorderedList.sort(comp);

    var labels = [];
    var data = [];
    var previous = 0;
    orderedList.map((movement) => {
      if (labels.length == 12) {
        labels.shift();
        data.shift();
      }

      labels.push(movement.date.toISOString().substr(0, 7));
      previous = previous + movement.data;
      data.push(previous);
    });

    return res.json({ data: data, labels: labels });
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

// @route   GET api/v1/movements/:stock_id
// @desc    get movements of given stock with stock_id
router.get('/:stock_id', middleware, async (req, res) => {
  try {
    const movements = await Movement.find({
      stock: req.params.stock_id,
    })
      .populate('stock', [
        'code',
        'name',
        'stockCount',
        'criticalityLevel',
        'criticalityStatus',
      ])
      .populate('createdUser', ['name']);
    return res.json(movements);
  } catch (error) {
    console.log(error);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
