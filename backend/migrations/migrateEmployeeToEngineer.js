require("dotenv").config();

const mongoose = require("mongoose");
const userSchema = require("../DB/schema/users");

async function migrate() {
    await mongoose.connect(process.env.DATABASE_URL);

    const User = mongoose.models.users || mongoose.model("users", userSchema);
    const result = await User.updateMany(
        { role: "Employee" },
        { $set: { role: "Engineer" } }
    );

    console.log(`Updated ${result.modifiedCount} user(s) from Employee to Engineer.`);
    await mongoose.disconnect();
}

migrate().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
