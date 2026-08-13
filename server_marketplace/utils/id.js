function getNextId(entries, prefix) {
  const max = entries.reduce((acc, entry) => {
    const id = String(entry.id || '');
    const value = Number(id.replace(`${prefix}-`, ''));
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

module.exports = {
  getNextId
};
