const { mongoose } = require("mongoose");

module.exports = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mytest");
    console.log("connected to db");
  } catch (error) {
    console.log(error);
  }
};
