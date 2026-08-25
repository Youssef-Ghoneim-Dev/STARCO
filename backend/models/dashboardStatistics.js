const dbconfig = require("../DB/config");
const dashboardStatisticsSchema = require("../DB/schema/dashboardStatistics");

const collectionName = "dashboardStatistics";
const model = () => dbconfig.openconnection(collectionName, dashboardStatisticsSchema);

const upsert = async (dateKey, snapshot) => model().findOneAndUpdate(
    { dateKey },
    { ...snapshot, dateKey },
    { upsert: true, returnDocument: "after", runValidators: true }
);

const selectOne = async (dateKey) => model().findOne({ dateKey }).lean();

const selectRange = async (from, to) => model()
    .find({ date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .lean();

module.exports = { upsert, selectOne, selectRange };
