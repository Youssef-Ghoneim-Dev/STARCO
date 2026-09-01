const officialHolidays2026 = [
    "2026-01-07",
    "2026-01-29",
    "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23",
    "2026-04-13",
    "2026-04-25",
    "2026-05-07",
    "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31",
    "2026-06-18",
    "2026-07-02",
    "2026-07-23",
    "2026-08-27",
    "2026-10-06"
];

const configuredHolidays = String(process.env.EGYPT_OFFICIAL_HOLIDAYS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));

const officialHolidays = new Set([...officialHolidays2026, ...configuredHolidays]);

const egyptDateValue = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isEgyptNonWorkingDate = (value) => {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    return date.getDay() === 5 || officialHolidays.has(egyptDateValue(date));
};

const addEgyptWorkingDays = (value, workingDays) => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(12, 0, 0, 0);
    let remaining = Math.max(0, Number(workingDays) || 0);
    while (remaining > 0) {
        date.setDate(date.getDate() + 1);
        if (!isEgyptNonWorkingDate(date)) remaining -= 1;
    }
    return date;
};

const subtractEgyptWorkingDays = (value, workingDays) => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(12, 0, 0, 0);
    let remaining = Math.max(0, Number(workingDays) || 0);
    while (remaining > 0) {
        date.setDate(date.getDate() - 1);
        if (!isEgyptNonWorkingDate(date)) remaining -= 1;
    }
    return date;
};

module.exports = { addEgyptWorkingDays, subtractEgyptWorkingDays, egyptDateValue, isEgyptNonWorkingDate };
