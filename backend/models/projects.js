const dbconfig = require("../DB/config");
const schema = require("../DB/schema/projects");
const model = () => dbconfig.openconnection("projects", schema);
const find = (condition) => model().find(condition).sort({ updatedAt: -1 });
const findOne = (condition) => model().findOne(condition);
const create = (payload) => model().create(payload);
const update = (condition, value, options = {}) => {
    if (condition?.id && value === undefined) {
        const { id, ...payload } = condition;
        return model().findByIdAndUpdate(id, payload, { returnDocument: "after", runValidators: true });
    }
    return model().findOneAndUpdate(condition, value, { returnDocument: "after", runValidators: true, ...options });
};
const deleteOne = (condition) => model().findOneAndDelete(condition);
const select_one = findOne;
const selectall = find;
const update_whatsapp_project = (projectId, value) => model().findByIdAndUpdate(projectId, value, { returnDocument: "after", runValidators: true });
module.exports = { model, find, findOne, create, update, deleteOne, select_one, selectall, update_whatsapp_project };
