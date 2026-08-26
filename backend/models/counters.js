const dbconfig = require("../DB/config");
const schema = require("../DB/schema/counters");
const next = async (key) => {
    const model = dbconfig.openconnection("counters", schema);
    const counter = await model.findByIdAndUpdate(key, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    return counter.value;
};
module.exports = { next };
