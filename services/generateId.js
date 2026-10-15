
const Counter = require("../models/Counter");

async function generateId(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true
    }
  );

  return counter.sequence;
}

module.exports = generateId;
