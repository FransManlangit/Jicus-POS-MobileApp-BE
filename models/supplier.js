const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, "Please enter company name"],
  },
  contactNum: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
});

supplierSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

supplierSchema.set("toJSON", {
  virtuals: true,
});

module.exports.Supplier = mongoose.model("Supplier", supplierSchema);
