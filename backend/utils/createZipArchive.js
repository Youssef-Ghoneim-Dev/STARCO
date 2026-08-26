const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    return value >>> 0;
});
const crc32 = (buffer) => {
    let value = 0xffffffff;
    for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
};
const dosDateTime = (date = new Date()) => ({
    time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | Math.floor(date.getSeconds() / 2),
    date: (((Math.max(date.getFullYear(), 1980) - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
});
module.exports = (entries) => {
    const localParts = []; const centralParts = []; let offset = 0;
    entries.forEach(({ name, buffer, date }) => {
        const fileName = Buffer.from(name, "utf8"); const checksum = crc32(buffer); const stamp = dosDateTime(date);
        const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(stamp.time, 10); local.writeUInt16LE(stamp.date, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(buffer.length, 18); local.writeUInt32LE(buffer.length, 22); local.writeUInt16LE(fileName.length, 26); localParts.push(local, fileName, buffer);
        const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(stamp.time, 12); central.writeUInt16LE(stamp.date, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(buffer.length, 20); central.writeUInt32LE(buffer.length, 24); central.writeUInt16LE(fileName.length, 28); central.writeUInt32LE(offset, 42); centralParts.push(central, fileName); offset += local.length + fileName.length + buffer.length;
    });
    const directory = Buffer.concat(centralParts); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, directory, end]);
};
