const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
    default: 0.0,
  },
  item: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
  },
});

expenseSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

expenseSchema.set("toJSON", {
  virtuals: true,
});

module.exports.Expense = mongoose.model("Expense", expenseSchema);
