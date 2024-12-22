const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
  orderItems: [
    {
      price: {
        type: Number,
        required: true,
      },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Product",
      },
    },
  ],
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
  },
});

incomeSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

incomeSchema.set("toJSON", {
  virtuals: true,
});

module.exports.Income = mongoose.model("Income", incomeSchema);
